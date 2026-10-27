const crypto = require('crypto');
const admin = require('firebase-admin');
const { getDb, safeEqual } = require('./linkedin');

// Planoly as the source for the admin dashboard's Social page.
//
// Planoly exposes its data through an MCP server (JSON-RPC over HTTPS) that
// is protected by standard OAuth 2.1: dynamic client registration, PKCE,
// refresh tokens. There are no API keys. So the site registers itself as a
// client once, the workspace owner approves it once through
// /api/planoly-auth, and the refresh token lives in Firestore `planoly/auth`
// the same way the LinkedIn and Instagram tokens do.
//
// Firestore docs:
//   planoly/client   the registered OAuth client (client_id, redirect_uri)
//   planoly/pending  the PKCE verifier for the sign-in currently in flight
//   planoly/auth     access_token, refresh_token, expires_at, workspace_id

const SITE = process.env.SITE_URL || 'https://www.sensawellness.org';
const MCP_URL = process.env.PLANOLY_MCP_URL || 'https://mcp.planoly.com/mcp';
const AUTH_ISSUER = process.env.PLANOLY_AUTH_ISSUER || 'https://app.planoly.com/api/auth';
const SCOPE = 'openid profile email offline_access';
const PROTOCOL_VERSION = '2025-06-18';
const WORKSPACE_NAME = process.env.PLANOLY_WORKSPACE_NAME || 'Sensa Wellness';
const DAYS = Number(process.env.PLANOLY_WINDOW_DAYS || 30);

function setupKey() {
  return process.env.PLANOLY_SETUP_KEY || process.env.LINKEDIN_SETUP_KEY || '';
}

function redirectUri() {
  return process.env.PLANOLY_REDIRECT_URI || `${SITE}/api/planoly-auth`;
}

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ---------------------------------------------------------------------------
// OAuth

let metaCache = null;
async function authMetadata() {
  if (metaCache) return metaCache;
  const r = await fetch(`${AUTH_ISSUER}/.well-known/oauth-authorization-server`);
  if (!r.ok) throw new Error(`Planoly auth metadata returned ${r.status}`);
  metaCache = await r.json();
  return metaCache;
}

async function getClient(db) {
  const snap = await db.collection('planoly').doc('client').get();
  if (snap.exists && snap.data().client_id && snap.data().redirect_uri === redirectUri()) return snap.data();
  const meta = await authMetadata();
  const r = await fetch(meta.registration_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Sensa Wellness Admin Dashboard',
      redirect_uris: [redirectUri()],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      scope: SCOPE,
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.client_id) {
    throw new Error(`Planoly client registration failed (${r.status}): ${JSON.stringify(data).slice(0, 200)}`);
  }
  const client = {
    client_id: data.client_id,
    client_secret: data.client_secret || null,
    redirect_uri: redirectUri(),
    registered_at: Date.now(),
  };
  await db.collection('planoly').doc('client').set(client);
  return client;
}

// State is an HMAC over a timestamp, as in lib/linkedin.js, so the callback
// only accepts sign-ins this site started within the last ten minutes.
function makeState() {
  const key = setupKey();
  if (!key) throw new Error('PLANOLY_SETUP_KEY (or LINKEDIN_SETUP_KEY) is not configured');
  const ts = String(Date.now());
  const sig = crypto.createHmac('sha256', key).update(ts).digest('hex');
  return `${ts}.${sig}`;
}

function verifyState(state, maxAgeMs = 10 * 60 * 1000) {
  const key = setupKey();
  const [ts, sig] = String(state || '').split('.');
  if (!key || !ts || !sig) return false;
  const expected = crypto.createHmac('sha256', key).update(ts).digest('hex');
  if (!safeEqual(sig, expected)) return false;
  const age = Date.now() - Number(ts);
  return Number.isFinite(age) && age >= 0 && age <= maxAgeMs;
}

async function startAuth(db) {
  const client = await getClient(db);
  const meta = await authMetadata();
  const verifier = b64url(crypto.randomBytes(48));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  const state = makeState();
  await db.collection('planoly').doc('pending').set({ state, verifier, created_at: Date.now() });
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: client.client_id,
    redirect_uri: redirectUri(),
    scope: SCOPE,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    resource: MCP_URL,
  });
  return `${meta.authorization_endpoint}?${params.toString()}`;
}

async function tokenRequest(db, form) {
  const client = await getClient(db);
  const meta = await authMetadata();
  const body = new URLSearchParams({ ...form, client_id: client.client_id, resource: MCP_URL });
  if (client.client_secret) body.set('client_secret', client.client_secret);
  const r = await fetch(meta.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.access_token) {
    throw new Error(`Planoly token request failed (${r.status}): ${data.error || ''} ${data.error_description || ''}`.trim());
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || null,
    expires_at: Date.now() + (Number(data.expires_in) || 3600) * 1000,
    scope: data.scope || SCOPE,
  };
}

async function exchangeCode(db, code, state) {
  if (!verifyState(state)) throw new Error('invalid or expired state');
  const snap = await db.collection('planoly').doc('pending').get();
  const pending = snap.exists ? snap.data() : null;
  if (!pending || pending.state !== state) throw new Error('no pending sign-in matches this callback');
  const tokens = await tokenRequest(db, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(),
    code_verifier: pending.verifier,
  });
  await db.collection('planoly').doc('pending').delete().catch(() => {});
  return tokens;
}

async function loadAuth(db) {
  const snap = await db.collection('planoly').doc('auth').get();
  return snap.exists ? snap.data() : null;
}

async function saveAuth(db, auth) {
  await db.collection('planoly').doc('auth').set({
    ...auth,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function clearAuth(db) {
  await db.collection('planoly').doc('auth').delete().catch(() => {});
}

// Refreshes when the access token is within two minutes of expiry. Planoly
// may rotate the refresh token; keep the old one if none comes back.
async function ensureFreshToken(db, auth) {
  if (!auth || !auth.access_token) {
    throw new Error('Planoly is not connected. Open /api/planoly-auth?key=... as the workspace owner.');
  }
  const soon = 2 * 60 * 1000;
  if (auth.expires_at && auth.expires_at - Date.now() < soon) {
    if (!auth.refresh_token) throw new Error('Planoly access expired and no refresh token was issued. Reconnect at /api/planoly-auth?key=...');
    const fresh = await tokenRequest(db, { grant_type: 'refresh_token', refresh_token: auth.refresh_token });
    const merged = { ...auth, ...fresh, refresh_token: fresh.refresh_token || auth.refresh_token };
    await saveAuth(db, merged);
    return { token: merged.access_token, auth: merged, refreshed: true };
  }
  return { token: auth.access_token, auth, refreshed: false };
}

// ---------------------------------------------------------------------------
// MCP client (Streamable HTTP transport, JSON or SSE responses)

function parseBody(text, contentType) {
  if ((contentType || '').includes('text/event-stream')) {
    const out = [];
    for (const chunk of text.split(/\n\n+/)) {
      const data = chunk.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('\n');
      if (!data) continue;
      try { out.push(JSON.parse(data)); } catch (err) { /* keep-alive or partial line */ }
    }
    return out;
  }
  if (!text.trim()) return [];
  const json = JSON.parse(text);
  return Array.isArray(json) ? json : [json];
}

class McpSession {
  constructor(token) {
    this.token = token;
    this.session = null;
    this.nextId = 1;
  }

  async rpc(method, params, withId = true) {
    const id = withId ? this.nextId++ : undefined;
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${this.token}`,
      'MCP-Protocol-Version': PROTOCOL_VERSION,
    };
    if (this.session) headers['Mcp-Session-Id'] = this.session;
    const body = withId ? { jsonrpc: '2.0', id, method, params } : { jsonrpc: '2.0', method, params };
    const r = await fetch(MCP_URL, { method: 'POST', headers, body: JSON.stringify(body) });
    const text = await r.text();
    const sid = r.headers.get('mcp-session-id');
    if (sid) this.session = sid;
    if (r.status === 401) throw new Error('Planoly rejected the token (401). Reconnect at /api/planoly-auth?key=...');
    if (!r.ok && r.status !== 202) throw new Error(`Planoly MCP ${method} failed (${r.status}): ${text.slice(0, 200)}`);
    if (!withId) return null;
    const reply = parseBody(text, r.headers.get('content-type')).find(m => m && m.id === id);
    if (!reply) throw new Error(`Planoly MCP ${method}: no response in body`);
    if (reply.error) throw new Error(`Planoly MCP ${method}: ${reply.error.message || JSON.stringify(reply.error)}`);
    return reply.result;
  }

  async init() {
    await this.rpc('initialize', {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'sensa-admin-dashboard', version: '1.0.0' },
    });
    await this.rpc('notifications/initialized', {}, false);
    return this;
  }

  async call(name, args = {}) {
    const result = await this.rpc('tools/call', { name, arguments: args });
    const text = (result.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
    if (result.isError) throw new Error(`Planoly ${name}: ${text.slice(0, 300) || 'tool error'}`);
    if (result.structuredContent) return result.structuredContent;
    try { return JSON.parse(text); } catch (err) { return { text }; }
  }
}

async function findWorkspace(session) {
  const data = await session.call('list_workspaces', {});
  const list = data.workspaces || [];
  const match = list.find(w => String(w.name || '').toLowerCase() === WORKSPACE_NAME.toLowerCase()) || list[0];
  if (!match) throw new Error('No Planoly workspace is visible to the connected account');
  return match;
}

// ---------------------------------------------------------------------------
// Dashboard data

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function trim(text, n = 100) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1).trim()}...` : t;
}

function linkedinBlock(data) {
  const t = data.totals || {};
  const p = data.previousTotals || {};
  return {
    connected: true,
    followers: data.profile ? data.profile.followersCount : null,
    name: data.profile ? data.profile.name : null,
    last30: { impressions: t.views, viewers: t.viewers, engagements: t.postEngagements, follows: t.follows, pageViews: t.pageViews },
    previous30: { impressions: p.views, viewers: p.viewers, engagements: p.postEngagements, follows: p.follows, pageViews: p.pageViews },
    recent: (data.posts || []).map(post => ({
      title: trim(post.caption, 90),
      url: post.permalink,
      postedAt: post.publishedAt,
      stats: post.metrics ? { impressions: post.metrics.views, likes: post.metrics.likes, comments: post.metrics.comments, shares: post.metrics.shares } : null,
    })),
  };
}

function instagramBlock(analytics, performance) {
  const t = analytics.totals || {};
  const p = analytics.previousTotals || {};
  return {
    connected: true,
    followers: analytics.profile ? analytics.profile.followersCount : null,
    mediaCount: analytics.profile ? analytics.profile.mediaCount : null,
    reach30: t.reach,
    views30: t.views,
    interactions30: t.totalInteractions,
    previous30: { reach: p.reach, views: p.views, interactions: p.totalInteractions },
    recent: ((performance && performance.posts) || []).map(post => ({
      caption: trim(post.caption, 90),
      url: post.permalink,
      postedAt: post.publishedAt,
      type: post.mediaType,
      reach: post.metrics ? post.metrics.reach : null,
      likes: post.metrics ? post.metrics.likes : null,
      comments: post.metrics ? post.metrics.comments : null,
      saves: post.metrics ? post.metrics.saves : null,
    })),
  };
}

function facebookBlock(groups, since) {
  const posts = ((groups && groups.postGroups) || [])
    .flatMap(g => g.posts || [])
    .filter(post => post.platform === 'facebook' && post.status === 'published')
    .map(post => ({ caption: trim(post.caption, 90), url: post.externalPostUrl || null, postedAt: post.scheduleDate, thumbnailUrl: post.thumbnailUrl || null }))
    .sort((a, b) => String(b.postedAt).localeCompare(String(a.postedAt)));
  return {
    connected: true,
    posts30: posts.filter(p => p.postedAt && Date.parse(p.postedAt) >= since).length,
    recent: posts.slice(0, 10),
    note: 'Planoly reports Facebook posts but not Facebook page metrics.',
  };
}

// Everything the Social page shows, from one Planoly session. Returns null
// when Planoly has never been connected so the caller can fall back.
async function fetchStats(db) {
  const stored = await loadAuth(db);
  if (!stored) return null;
  const { token, auth } = await ensureFreshToken(db, stored);
  const session = await new McpSession(token).init();

  let workspaceId = auth.workspace_id;
  if (!workspaceId) {
    const ws = await findWorkspace(session);
    workspaceId = ws.id;
    await saveAuth(db, { ...auth, workspace_id: ws.id, workspace_name: ws.name || null });
  }

  const now = new Date();
  const endDate = isoDate(now);
  const startDate = isoDate(new Date(now.getTime() - DAYS * 864e5));
  const since = now.getTime() - DAYS * 864e5;
  const range = { workspaceId, startDate, endDate };

  const [li, ig, igPosts, fb] = await Promise.allSettled([
    session.call('get_linkedin_analytics', range),
    session.call('get_instagram_analytics', range),
    session.call('list_post_performance', { ...range, sortBy: 'recent', limit: 10 }),
    session.call('list_post_groups', { workspaceId, platform: 'facebook', status: 'published', limit: 24 }),
  ]);

  const failed = r => ({ connected: false, reason: r.reason ? r.reason.message : 'unknown error' });
  return {
    source: 'planoly',
    workspaceId,
    windowDays: DAYS,
    linkedin: li.status === 'fulfilled' ? linkedinBlock(li.value) : failed(li),
    instagram: ig.status === 'fulfilled' ? instagramBlock(ig.value, igPosts.status === 'fulfilled' ? igPosts.value : null) : failed(ig),
    facebook: fb.status === 'fulfilled' ? facebookBlock(fb.value, since) : failed(fb),
  };
}

module.exports = {
  getDb,
  setupKey,
  safeEqual,
  redirectUri,
  startAuth,
  exchangeCode,
  loadAuth,
  saveAuth,
  clearAuth,
  ensureFreshToken,
  McpSession,
  findWorkspace,
  fetchStats,
};
