const li = require('./linkedin');
const ig = require('./instagram');
const planoly = require('./planoly');

// Shared social stats builder, used by api/social.js (the admin Social tab)
// and api/linkedin-cron.js (daily snapshot). Planoly is the source when it
// is connected; otherwise the direct LinkedIn and Instagram connections.
// recordSnapshot writes one `social_history/<YYYY-MM-DD>` doc per day with
// the follower and reach numbers, which the admin "Followers over time"
// chart reads back through loadHistory.

async function linkedinBlock(db) {
  const block = { connected: false };
  try {
    const auth = await li.loadAuth(db);
    if (!auth) return { ...block, reason: 'not connected' };
    const { token, auth: live } = await li.ensureFreshToken(db, auth);
    block.connected = true;
    block.tokenExpiresAt = live.expires_at || null;

    const sharedSnap = await db.collection('linkedin_posts').orderBy('postedAt', 'desc').limit(10).get();
    const shared = sharedSnap.docs.map(d => d.data());
    const stats = await li.fetchPageStats(token, shared.map(p => p.postUrn).filter(Boolean));

    block.followers = stats.followers;
    block.lifetime = stats.lifetime;
    block.last30 = stats.last30;
    block.errors = stats.errors;
    block.recent = shared.map(p => ({
      slug: p.slug,
      title: p.title,
      url: p.url,
      postedAt: p.postedAt,
      stats: stats.posts[p.postUrn] || null,
    }));
    return block;
  } catch (err) {
    return { ...block, reason: err.message };
  }
}

async function instagramBlock(db) {
  const block = { connected: false };
  try {
    const auth = await ig.loadAuth(db);
    if (!auth) return { ...block, reason: 'not connected' };
    const { token, auth: live } = await ig.ensureFreshToken(db, auth);
    const stats = await ig.fetchStats(token);
    return { ...block, connected: true, tokenExpiresAt: live.expires_at || null, ...stats };
  } catch (err) {
    return { ...block, reason: err.message };
  }
}

async function buildSocialPayload(db) {
  let payload = null;
  let planolyError = null;
  try {
    payload = await planoly.fetchStats(db);
  } catch (err) {
    console.error('Planoly stats failed:', err.message);
    planolyError = err.message;
  }
  if (!payload) {
    const [linkedin, instagram] = await Promise.all([linkedinBlock(db), instagramBlock(db)]);
    payload = { source: 'direct', linkedin, instagram, planolyError };
  }
  return payload;
}

function snapshotFrom(payload, now) {
  const at = now || new Date();
  const l = payload.linkedin || {}, i = payload.instagram || {}, f = payload.facebook || {};
  const val = (ok, v) => (ok && v !== undefined && v !== null && !Number.isNaN(Number(v))) ? Number(v) : null;
  return {
    date: at.toISOString().slice(0, 10),
    at: at.toISOString(),
    source: payload.source || null,
    linkedinFollowers: val(l.connected, l.followers),
    linkedinImpressions: val(l.connected && l.last30, l.last30 && l.last30.impressions),
    instagramFollowers: val(i.connected, i.followers),
    instagramReach: val(i.connected, i.reach30 !== undefined ? i.reach30 : i.reach28),
    facebookPosts: val(f.connected, f.posts30),
  };
}

async function recordSnapshot(db, payload) {
  const snap = snapshotFrom(payload);
  const metrics = ['linkedinFollowers', 'linkedinImpressions', 'instagramFollowers', 'instagramReach', 'facebookPosts'];
  if (metrics.every(k => snap[k] === null)) return null;
  await db.collection('social_history').doc(snap.date).set(snap, { merge: true });
  return snap;
}

async function loadHistory(db, limit) {
  const q = await db.collection('social_history').orderBy('date', 'desc').limit(limit || 400).get();
  return q.docs.map(d => d.data()).reverse();
}

module.exports = { buildSocialPayload, recordSnapshot, loadHistory, snapshotFrom, linkedinBlock, instagramBlock };
