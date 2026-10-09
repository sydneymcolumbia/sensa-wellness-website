const crypto = require('crypto');
const admin = require('firebase-admin');

// Instagram API with Instagram Login (no Facebook Page required).
// Used by api/instagram-auth.js (one-time connect) and api/social.js
// (dashboard stats). Tokens live in Firestore `instagram/auth`.
//
// Meta app setup: developers.facebook.com, create an app with the
// "Instagram" use case, add the Sensa Instagram account as an Instagram
// Tester under App roles, accept the invite in the Instagram app, then copy
// the Instagram App ID and App Secret from the Instagram API settings.

const GRAPH = 'https://graph.instagram.com';
const GRAPH_VERSION = process.env.INSTAGRAM_GRAPH_VERSION || 'v21.0';
const SCOPES = (process.env.INSTAGRAM_SCOPES || 'instagram_business_basic,instagram_business_manage_insights').split(',');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function setupKey() {
  return process.env.INSTAGRAM_SETUP_KEY || process.env.LINKEDIN_SETUP_KEY || '';
}

function redirectUri() {
  return process.env.INSTAGRAM_REDIRECT_URI || 'https://www.sensawellness.org/api/instagram-auth';
}

function safeEqual(a, b) {
  const ab = Buffer.from(String(a || ''), 'utf8');
  const bb = Buffer.from(String(b || ''), 'utf8');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function makeState() {
  const ts = String(Date.now());
  const sig = crypto.createHmac('sha256', setupKey() || 'unset').update(`ig:${ts}`).digest('hex');
  return `${ts}.${sig}`;
}

function verifyState(state, maxAgeMs = 10 * 60 * 1000) {
  const [ts, sig] = String(state || '').split('.');
  if (!ts || !sig) return false;
  const expected = crypto.createHmac('sha256', setupKey() || 'unset').update(`ig:${ts}`).digest('hex');
  if (!safeEqual(sig, expected)) return false;
  const age = Date.now() - Number(ts);
  return Number.isFinite(age) && age >= 0 && age <= maxAgeMs;
}

function authorizationUrl() {
  const params = new URLSearchParams({
    client_id: requireEnv('INSTAGRAM_APP_ID'),
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPES.join(','),
    state: makeState(),
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

async function getJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error_message || data.error?.message || data.error_description || JSON.stringify(data);
    throw new Error(`Instagram API ${res.status}: ${msg}`);
  }
  return data;
}

// Code -> short-lived token -> long-lived token (60 days, refreshable).
async function exchangeCode(code) {
  const form = new URLSearchParams({
    client_id: requireEnv('INSTAGRAM_APP_ID'),
    client_secret: requireEnv('INSTAGRAM_APP_SECRET'),
    grant_type: 'authorization_code',
    redirect_uri: redirectUri(),
    code,
  });
  const short = await getJson('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const q = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: requireEnv('INSTAGRAM_APP_SECRET'),
    access_token: short.access_token,
  });
  const long = await getJson(`${GRAPH}/access_token?${q.toString()}`);
  return {
    access_token: long.access_token,
    expires_at: Date.now() + (Number(long.expires_in) || 0) * 1000,
    user_id: String(short.user_id || ''),
    obtained_at: Date.now(),
  };
}

// Long-lived tokens refresh only once they are at least a day old.
async function refreshToken(token) {
  const q = new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: token });
  const data = await getJson(`${GRAPH}/refresh_access_token?${q.toString()}`);
  return {
    access_token: data.access_token,
    expires_at: Date.now() + (Number(data.expires_in) || 0) * 1000,
    obtained_at: Date.now(),
  };
}

async function loadAuth(db) {
  const snap = await db.collection('instagram').doc('auth').get();
  return snap.exists ? snap.data() : null;
}

async function saveAuth(db, tokens) {
  await db.collection('instagram').doc('auth').set({
    ...tokens,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function ensureFreshToken(db, auth) {
  if (!auth || !auth.access_token) {
    throw new Error('Instagram is not connected. Open /api/instagram-auth?key=... as the account owner.');
  }
  const dayMs = 24 * 60 * 60 * 1000;
  const expiresSoon = auth.expires_at && auth.expires_at - Date.now() < 10 * dayMs;
  const oldEnough = !auth.obtained_at || Date.now() - auth.obtained_at > dayMs;
  if (expiresSoon && oldEnough && auth.expires_at > Date.now()) {
    const fresh = await refreshToken(auth.access_token);
    await saveAuth(db, fresh);
    return { token: fresh.access_token, auth: { ...auth, ...fresh }, refreshed: true };
  }
  if (auth.expires_at && auth.expires_at <= Date.now()) {
    throw new Error('Instagram token has expired. Reconnect at /api/instagram-auth?key=...');
  }
  return { token: auth.access_token, auth, refreshed: false };
}

async function graph(path, token, params = {}) {
  const q = new URLSearchParams({ ...params, access_token: token });
  return getJson(`${GRAPH}/${GRAPH_VERSION}/${path}?${q.toString()}`);
}

// Account, recent media, and 28 day reach. Insights need a professional
// account; errors there are reported, not fatal.
async function fetchStats(token) {
  const me = await graph('me', token, {
    fields: 'user_id,username,account_type,followers_count,follows_count,media_count',
  });
  const media = await graph('me/media', token, {
    fields: 'id,caption,media_type,permalink,timestamp,like_count,comments_count',
    limit: '8',
  }).catch(err => ({ data: [], error: err.message }));

  const until = Math.floor(Date.now() / 1000);
  const since = until - 28 * 24 * 60 * 60;
  let reach28 = null;
  let views28 = null;
  let insightsError = null;
  try {
    const ins = await graph('me/insights', token, {
      metric: 'reach,views',
      period: 'day',
      metric_type: 'total_value',
      since: String(since),
      until: String(until),
    });
    for (const m of ins.data || []) {
      const v = m.total_value?.value;
      if (m.name === 'reach') reach28 = v ?? null;
      if (m.name === 'views') views28 = v ?? null;
    }
  } catch (err) {
    insightsError = err.message;
  }

  return {
    username: me.username,
    accountType: me.account_type,
    followers: me.followers_count ?? null,
    following: me.follows_count ?? null,
    mediaCount: me.media_count ?? null,
    reach28,
    views28,
    insightsError,
    recent: (media.data || []).map(m => ({
      id: m.id,
      caption: (m.caption || '').slice(0, 140),
      type: m.media_type,
      url: m.permalink,
      postedAt: m.timestamp,
      likes: m.like_count ?? null,
      comments: m.comments_count ?? null,
    })),
    mediaError: media.error || null,
  };
}

module.exports = {
  SCOPES,
  requireEnv,
  setupKey,
  safeEqual,
  authorizationUrl,
  verifyState,
  exchangeCode,
  loadAuth,
  saveAuth,
  ensureFreshToken,
  fetchStats,
};
