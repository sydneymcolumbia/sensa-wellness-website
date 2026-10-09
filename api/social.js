const admin = require('firebase-admin');
const li = require('../lib/linkedin');
const ig = require('../lib/instagram');
const linkedinAuth = require('../lib/handlers/linkedin-auth');
const instagramAuth = require('../lib/handlers/instagram-auth');

// Social media numbers for the admin dashboard.
//   GET (admin)  { linkedin: {...}, instagram: {...}, generatedAt, cached }
//                Requires a verified Firebase ID token from an allowlisted
//                admin, same rules as api/preorder.js. Results are cached in
//                Firestore `social/cache` for CACHE_MINUTES so repeated page
//                opens do not hammer the platform APIs. ?refresh=1 bypasses.

const db = li.getDb();

// Must match the lists in api/admin.js, api/reviews-admin.js,
// api/password-reset.js, api/preorder.js and admin.html.
const ADMIN_EMAILS = [
  'info@sensawellness.org',
  'sydney@sensawellness.org',
  'ryan@sensawellness.org',
];
const REQUIRE_MFA = process.env.ADMIN_REQUIRE_MFA === 'true';
const CACHE_MINUTES = Number(process.env.SOCIAL_CACHE_MINUTES || 15);

async function requireAdmin(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization token' });
    return null;
  }
  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(authHeader.slice(7));
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }
  if (!decoded.email_verified || !ADMIN_EMAILS.includes(decoded.email)) {
    res.status(403).json({ error: 'Access denied' });
    return null;
  }
  if (REQUIRE_MFA && !(decoded.firebase && decoded.firebase.sign_in_second_factor)) {
    res.status(403).json({ error: 'Multi-factor authentication required' });
    return null;
  }
  return decoded;
}

async function linkedinBlock() {
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

async function instagramBlock() {
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

module.exports = async function handler(req, res) {
  // The Hobby plan allows 12 serverless functions per deployment, so the
  // two OAuth connect handlers live inside this function. vercel.json
  // rewrites /api/linkedin-auth and /api/instagram-auth here with ?action=.
  const action = req.query?.action;
  if (action === 'linkedin-auth') return linkedinAuth(req, res);
  if (action === 'instagram-auth') return instagramAuth(req, res);

  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  const cacheRef = db.collection('social').doc('cache');
  const force = req.query?.refresh === '1';
  if (!force) {
    const snap = await cacheRef.get();
    if (snap.exists) {
      const c = snap.data();
      if (c.generatedAt && Date.now() - Date.parse(c.generatedAt) < CACHE_MINUTES * 60 * 1000) {
        return res.status(200).json({ ...c.payload, generatedAt: c.generatedAt, cached: true });
      }
    }
  }

  const [linkedin, instagram] = await Promise.all([linkedinBlock(), instagramBlock()]);
  const generatedAt = new Date().toISOString();
  const payload = { linkedin, instagram };
  await cacheRef.set({ payload, generatedAt }).catch(err => console.error('social cache write failed', err.message));
  return res.status(200).json({ ...payload, generatedAt, cached: false });
};
