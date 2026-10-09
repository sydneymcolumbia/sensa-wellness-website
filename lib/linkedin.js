const crypto = require('crypto');
const admin = require('firebase-admin');

// Shared helpers for the LinkedIn company page auto-poster.
// Used by api/linkedin-auth.js (one-time OAuth connect) and
// api/linkedin-cron.js (daily share of the newest blog post).
//
// Firestore layout (server-side only, written through the Admin SDK):
//   linkedin/auth        access_token, refresh_token, expiry timestamps, scope
//   linkedin/state       knownSlugs (posts already considered), run bookkeeping
//   linkedin_posts/{slug} one record per article shared to the page

const SITE = 'https://www.sensawellness.org';
const LINKEDIN_API = 'https://api.linkedin.com/rest';
const OAUTH_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const OAUTH_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';

// LinkedIn versions its Marketing APIs by month (YYYYMM). Each version stays
// live for about a year, so bump LINKEDIN_API_VERSION in Vercel when LinkedIn
// retires this one.
const API_VERSION = process.env.LINKEDIN_API_VERSION || '202609';

// Scopes granted by the Community Management API product. r_organization_admin
// is only used to confirm the connecting member actually administers the page.
const SCOPES = (process.env.LINKEDIN_SCOPES || 'w_organization_social r_organization_social r_organization_admin').split(/\s+/);

function getDb() {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'sensa-app-7b2b7',
    });
  }
  return admin.firestore();
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function orgUrn() {
  return `urn:li:organization:${requireEnv('LINKEDIN_ORG_ID')}`;
}

function redirectUri() {
  return process.env.LINKEDIN_REDIRECT_URI || `${SITE}/api/linkedin-auth`;
}

// Constant-time string compare that tolerates length mismatches.
function safeEqual(a, b) {
  const ab = Buffer.from(String(a || ''), 'utf8');
  const bb = Buffer.from(String(b || ''), 'utf8');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// ---------------------------------------------------------------------------
// OAuth

// The state value is an HMAC over a timestamp so the callback can reject
// anything we did not start ourselves, with no server-side session needed.
function makeState() {
  const ts = String(Date.now());
  const sig = crypto.createHmac('sha256', requireEnv('LINKEDIN_SETUP_KEY')).update(ts).digest('hex');
  return `${ts}.${sig}`;
}

function verifyState(state, maxAgeMs = 10 * 60 * 1000) {
  const [ts, sig] = String(state || '').split('.');
  if (!ts || !sig) return false;
  const expected = crypto.createHmac('sha256', requireEnv('LINKEDIN_SETUP_KEY')).update(ts).digest('hex');
  if (!safeEqual(sig, expected)) return false;
  const age = Date.now() - Number(ts);
  return Number.isFinite(age) && age >= 0 && age <= maxAgeMs;
}

function authorizationUrl() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: requireEnv('LINKEDIN_CLIENT_ID'),
    redirect_uri: redirectUri(),
    state: makeState(),
    scope: SCOPES.join(' '),
  });
  return `${OAUTH_AUTH_URL}?${params.toString()}`;
}

async function tokenRequest(form) {
  const body = new URLSearchParams({
    ...form,
    client_id: requireEnv('LINKEDIN_CLIENT_ID'),
    client_secret: requireEnv('LINKEDIN_CLIENT_SECRET'),
  });
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`LinkedIn token request failed (${res.status}): ${data.error_description || data.error || 'no access_token'}`);
  }
  const now = Date.now();
  return {
    access_token: data.access_token,
    expires_at: now + (Number(data.expires_in) || 0) * 1000,
    // Refresh tokens are only issued once LinkedIn enables programmatic
    // refresh for the app. Without one, the 60 day token must be renewed by
    // visiting /api/linkedin-auth?key=... again.
    refresh_token: data.refresh_token || null,
    refresh_expires_at: data.refresh_token_expires_in
      ? now + Number(data.refresh_token_expires_in) * 1000
      : null,
    scope: data.scope || SCOPES.join(' '),
    obtained_at: now,
  };
}

function exchangeCode(code) {
  return tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: redirectUri() });
}

function refreshToken(refresh_token) {
  return tokenRequest({ grant_type: 'refresh_token', refresh_token });
}

async function loadAuth(db) {
  const snap = await db.collection('linkedin').doc('auth').get();
  return snap.exists ? snap.data() : null;
}

async function saveAuth(db, tokens) {
  await db.collection('linkedin').doc('auth').set({
    ...tokens,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// Returns a usable access token, refreshing it when it is within a week of
// expiry and a refresh token exists. Throws when the connection is gone.
async function ensureFreshToken(db, auth) {
  if (!auth || !auth.access_token) {
    throw new Error('LinkedIn is not connected. Open /api/linkedin-auth?key=... as a page admin.');
  }
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const expiresSoon = auth.expires_at && auth.expires_at - Date.now() < weekMs;
  if (expiresSoon && auth.refresh_token && (!auth.refresh_expires_at || auth.refresh_expires_at > Date.now())) {
    const fresh = await refreshToken(auth.refresh_token);
    // LinkedIn may omit a new refresh token; keep the old one in that case.
    if (!fresh.refresh_token) {
      fresh.refresh_token = auth.refresh_token;
      fresh.refresh_expires_at = auth.refresh_expires_at || null;
    }
    await saveAuth(db, fresh);
    return { token: fresh.access_token, auth: fresh, refreshed: true };
  }
  if (auth.expires_at && auth.expires_at <= Date.now()) {
    throw new Error('LinkedIn access token has expired. Reconnect at /api/linkedin-auth?key=...');
  }
  return { token: auth.access_token, auth, refreshed: false };
}

// ---------------------------------------------------------------------------
// LinkedIn REST calls

async function liFetch(path, token, options = {}) {
  const res = await fetch(`${LINKEDIN_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'LinkedIn-Version': API_VERSION,
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, headers: res.headers, data };
}

// Confirms the connecting member can post on behalf of the configured page.
async function memberAdministersOrg(token) {
  const target = orgUrn();
  const { ok, status, data } = await liFetch('/organizationAcls?q=roleAssignee&state=APPROVED', token);
  if (!ok) throw new Error(`organizationAcls lookup failed (${status}): ${JSON.stringify(data)}`);
  // Docs (202609) show the org under `organization` in some responses and
  // `organizationTarget` in others, so accept either.
  const allowedRoles = new Set(['ADMINISTRATOR', 'CONTENT_ADMINISTRATOR', 'CONTENT_ADMIN']);
  return (data.elements || []).some(el =>
    (el.organization === target || el.organizationTarget === target) && allowedRoles.has(el.role)
  );
}

// LinkedIn's "little text" commentary format treats these characters as
// markup, so literal copy has to escape them. Hashtags are appended
// separately so the # stays live.
function escapeCommentary(text) {
  return String(text).replace(/[\\|{}@\[\]()<>#*_~]/g, ch => `\\${ch}`);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// The Posts API does not scrape Open Graph tags for article cards. The
// thumbnail has to be uploaded through the Images API first and referenced
// by URN. Returns the image URN, or throws; callers fall back to a card with
// no picture rather than skipping the share.
async function uploadThumbnail(token, imageUrl) {
  if (!imageUrl) throw new Error('post has no og:image');
  const src = await fetch(imageUrl, { headers: { 'User-Agent': 'SensaLinkedInBot/1.0' } });
  if (!src.ok) throw new Error(`thumbnail fetch failed (${src.status})`);
  const bytes = Buffer.from(await src.arrayBuffer());
  if (bytes.length === 0) throw new Error('thumbnail is empty');
  if (bytes.length > 8 * 1024 * 1024) throw new Error('thumbnail larger than 8 MB');
  const contentType = src.headers.get('content-type') || 'image/jpeg';

  const init = await liFetch('/images?action=initializeUpload', token, {
    method: 'POST',
    body: JSON.stringify({ initializeUploadRequest: { owner: orgUrn() } }),
  });
  if (!init.ok || !init.data?.value?.uploadUrl) {
    throw new Error(`initializeUpload failed (${init.status}): ${JSON.stringify(init.data)}`);
  }
  const { uploadUrl, image } = init.data.value;

  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType },
    body: bytes,
  });
  if (!put.ok) throw new Error(`thumbnail upload failed (${put.status})`);

  // Processing is asynchronous and usually finishes within a few seconds.
  for (let attempt = 0; attempt < 10; attempt++) {
    const check = await liFetch(`/images/${encodeURIComponent(image)}`, token);
    const status = check.data?.status;
    if (status === 'AVAILABLE') return image;
    if (status === 'PROCESSING_FAILED') throw new Error('LinkedIn could not process the thumbnail');
    await sleep(1500);
  }
  throw new Error('thumbnail still processing after 15 seconds');
}

async function createArticlePost(token, { commentary, url, title, description, thumbnail }) {
  const article = {
    source: url,
    title: String(title).slice(0, 400),
    description: String(description).slice(0, 4086),
  };
  if (thumbnail) article.thumbnail = thumbnail;
  const body = {
    author: orgUrn(),
    commentary,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    content: { article },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };
  const { ok, status, headers, data } = await liFetch('/posts', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!ok) throw new Error(`LinkedIn post failed (${status}): ${JSON.stringify(data)}`);
  return headers.get('x-restli-id') || null;
}

// ---------------------------------------------------------------------------
// Blog discovery

async function fetchSitemapPostSlugs() {
  const res = await fetch(`${SITE}/sitemap.xml`, { headers: { 'User-Agent': 'SensaLinkedInBot/1.0' } });
  if (!res.ok) throw new Error(`sitemap fetch failed (${res.status})`);
  const xml = await res.text();
  const slugs = new Set();
  const re = /<loc>\s*https?:\/\/(?:www\.)?sensawellness\.org\/(post-[a-z0-9-]+)(?:\.html)?\s*<\/loc>/gi;
  let m;
  while ((m = re.exec(xml))) slugs.add(m[1]);
  return [...slugs];
}

function attr(html, pattern) {
  const m = html.match(pattern);
  return m ? decodeEntities(m[1].trim()) : '';
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

async function fetchPostMeta(slug) {
  const url = `${SITE}/${slug}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'SensaLinkedInBot/1.0' } });
  if (!res.ok) throw new Error(`post fetch failed for ${slug} (${res.status})`);
  const html = await res.text();
  const h1 = attr(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, '');
  const ogTitle = attr(html, /<meta\s+property="og:title"\s+content="([^"]*)"/i);
  const description =
    attr(html, /<meta\s+name="description"\s+content="([^"]*)"/i) ||
    attr(html, /<meta\s+property="og:description"\s+content="([^"]*)"/i);
  const image = attr(html, /<meta\s+property="og:image"\s+content="([^"]*)"/i);
  const datePublished = attr(html, /"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/);
  const category = attr(html, /class="post-category"[^>]*>([^<]*)</i);
  return {
    slug,
    url,
    title: h1 || ogTitle.replace(/\s+-\s+Sensa Wellness$/i, ''),
    description,
    image,
    category,
    datePublished: datePublished || null,
  };
}

// ---------------------------------------------------------------------------
// Caption

// Em dashes never appear in Sensa copy. This is a last line of defence in
// case a model or a page sneaks one in.
function stripEmDashes(text) {
  return String(text).replace(/\s*[—–]\s*/g, ', ').replace(/\s*--\s*/g, ', ');
}

function trackedUrl(url) {
  return `${url}?utm_source=linkedin&utm_medium=social&utm_campaign=blog`;
}

function plainCaption(meta) {
  const hashtags = (process.env.LINKEDIN_HASHTAGS || '').trim();
  const lines = [
    escapeCommentary(stripEmDashes(meta.title)),
    '',
    escapeCommentary(stripEmDashes(meta.description)),
    '',
    `Read the full article: ${trackedUrl(meta.url)}`,
  ];
  if (hashtags) lines.push('', hashtags);
  return lines.join('\n');
}

// Optional: a short, varied intro written by Claude from the approved title
// and summary only. Enabled with LINKEDIN_CAPTION_MODE=claude. Falls back to
// the plain caption on any error so a model outage never blocks a share.
async function claudeCaption(meta) {
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY') });
  const model = process.env.LINKEDIN_CAPTION_MODEL || 'claude-sonnet-5';
  const response = await anthropic.messages.create({
    model,
    max_tokens: 400,
    system: [
      'You write LinkedIn posts for the Sensa Wellness company page. Sensa makes an at-home CRP test that helps people track inflammation as part of their wellness routine.',
      'Rules: 60 to 120 words. Plain, direct language. No em dashes. No emojis. No hashtags. No exclamation points.',
      'Use only facts in the provided title and summary. Do not add statistics, names, or claims that are not in them.',
      'Never say or imply Sensa diagnoses, treats, cures, or prevents any disease. Do not give medical advice.',
      'Do not include a link; it is added after your text. Do not include a title line. Output only the post text.',
    ].join(' '),
    messages: [{
      role: 'user',
      content: `Title: ${meta.title}\n\nSummary: ${meta.description}`,
    }],
  });
  const text = (response.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  if (!text || text.length < 40) throw new Error('Claude returned an empty caption');
  const hashtags = (process.env.LINKEDIN_HASHTAGS || '').trim();
  const lines = [
    escapeCommentary(stripEmDashes(text)),
    '',
    `Read the full article: ${trackedUrl(meta.url)}`,
  ];
  if (hashtags) lines.push('', hashtags);
  return lines.join('\n');
}

async function buildCaption(meta) {
  let caption;
  let mode = 'plain';
  if (process.env.LINKEDIN_CAPTION_MODE === 'claude') {
    try {
      caption = await claudeCaption(meta);
      mode = 'claude';
    } catch (err) {
      console.error('LinkedIn caption: Claude failed, using plain caption', err.message);
    }
  }
  if (!caption) caption = plainCaption(meta);
  // LinkedIn's hard limit is 3000 characters.
  return { caption: caption.slice(0, 2900), mode };
}

module.exports = {
  SITE,
  API_VERSION,
  SCOPES,
  getDb,
  requireEnv,
  orgUrn,
  safeEqual,
  authorizationUrl,
  verifyState,
  exchangeCode,
  loadAuth,
  saveAuth,
  ensureFreshToken,
  memberAdministersOrg,
  uploadThumbnail,
  createArticlePost,
  fetchSitemapPostSlugs,
  fetchPostMeta,
  buildCaption,
};
