const admin = require('firebase-admin');
const crypto = require('crypto');

// Initialize Firebase Admin SDK (once across hot reloads)
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'sensa-app-7b2b7',
  });
}

const db = admin.firestore();

// ── Limits ──────────────────────────────────────────────────────────
const LIMITS = {
  firstNameMax: 30,
  titleMax: 80,
  bodyMin: 10,
  bodyMax: 1000,
  listMax: 200,
  minSecondsBetweenSubmits: 45, // per IP
};

// Strip HTML/control characters and collapse whitespace. Reviews are
// stored and rendered as plain text, so no markup ever survives.
function clean(str, max) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')            // drop any tags
    .replace(/[\x00-\x1F\x7F]/g, ' ')   // strip control characters
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function hashIp(req) {
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  return crypto.createHash('sha256').update(ip).digest('hex');
}

async function listApproved(res) {
  // Equality-only query (single-field index, no composite index needed);
  // newest-first ordering is done in memory.
  const snap = await db
    .collection('reviews')
    .where('approved', '==', true)
    .limit(500)
    .get();

  const reviews = snap.docs
    .map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        firstName: d.firstName || '',
        rating: d.rating || 0,
        title: d.title || '',
        body: d.body || '',
        createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
      };
    })
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, LIMITS.listMax);

  const count = reviews.length;
  const average = count
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
    : 0;

  return res.status(200).json({ reviews, count, average });
}

async function createReview(req, res) {
  const body = req.body || {};

  // Honeypot: real users never fill the hidden "website" field. Bots do.
  // Pretend success so the bot does not learn it was filtered.
  if (body.website) {
    return res.status(200).json({ ok: true, pending: true });
  }

  const firstName = clean(body.firstName, LIMITS.firstNameMax);
  const title = clean(body.title, LIMITS.titleMax);
  const text = clean(body.body, LIMITS.bodyMax);
  const rating = Number(body.rating);

  if (!firstName) {
    return res.status(400).json({ error: 'Please add your first name.' });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Please choose a star rating from 1 to 5.' });
  }
  if (text.length < LIMITS.bodyMin) {
    return res.status(400).json({ error: 'Please write a little more in your review.' });
  }

  // Best-effort per-IP rate limit. Equality-only query (no composite
  // index); the time-window check is done in memory.
  const ipHash = hashIp(req);
  const cutoff = Date.now() - LIMITS.minSecondsBetweenSubmits * 1000;
  try {
    const recent = await db
      .collection('reviews')
      .where('ipHash', '==', ipHash)
      .limit(10)
      .get();
    const tooSoon = recent.docs.some((doc) => {
      const t = doc.data().createdAt?.toMillis?.() || 0;
      return t > cutoff;
    });
    if (tooSoon) {
      return res
        .status(429)
        .json({ error: 'You just submitted a review. Please wait a moment before sending another.' });
    }
  } catch (e) {
    // Never block a genuine submission on the rate-limit lookup.
    console.warn('Rate-limit check skipped:', e.message);
  }

  await db.collection('reviews').add({
    firstName,
    rating,
    title,
    body: text,
    approved: false, // hidden until an admin approves it
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ipHash,
  });

  return res.status(201).json({ ok: true, pending: true });
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') return await listApproved(res);
    if (req.method === 'POST') return await createReview(req, res);
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Reviews API error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
