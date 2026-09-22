const crypto = require('crypto');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK (once across hot reloads)
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'sensa-app-7b2b7',
  });
}

const db = admin.firestore();

const ADMIN_EMAILS = [
  'info@sensawellness.org',
  'sydney@sensawellness.org',
  'ryan@sensawellness.org',
];

// Optional second factor gate. Off by default so nobody is locked out before
// MFA exists in Firebase. To turn it on:
//   1. Firebase console > Authentication > Sign-in method > Multi-factor
//      authentication: enable SMS or TOTP and enroll every admin account.
//   2. Set ADMIN_REQUIRE_MFA=true in the Vercel project environment and
//      redeploy. ID tokens from sessions that did not complete a second
//      factor are then rejected with 403.
const REQUIRE_MFA = process.env.ADMIN_REQUIRE_MFA === 'true';

// Review document ids are Firestore auto ids.
const DOC_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

// Defensive output sanitization. Values are stripped on write in
// api/reviews.js, but the dashboard should not depend on that. Removes
// angle brackets and control characters (Unicode category Cc).
function cleanString(value, max) {
  if (value == null) return '';
  const s = typeof value === 'object' ? '' : String(value);
  return s
    .replace(/[<>]/g, '')
    .replace(/\p{Cc}/gu, '')
    .trim()
    .slice(0, max);
}

function hashIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  const ip = (typeof fwd === 'string' && fwd.split(',')[0].trim())
    || req.headers['x-real-ip']
    || (req.socket && req.socket.remoteAddress)
    || 'unknown';
  return crypto.createHash('sha256').update(String(ip)).digest('hex');
}

// Audit log: one adminAccess document per authorized request. A logging
// failure is reported but never blocks the response.
async function writeAuditLog(req, entry) {
  try {
    await db.collection('adminAccess').add({
      ...entry,
      route: 'reviews-admin',
      method: req.method,
      ipHash: hashIp(req),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('Reviews admin audit log write failed:', err);
  }
}

// Verify the caller is a signed-in admin. Returns the decoded token or
// sends the appropriate error response and returns null.
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
  // Require a verified email claim: email/password sign-up alone does not
  // prove the caller owns an allowlisted address.
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

module.exports = async function handler(req, res) {
  // Responses carry unpublished customer content; never cache them.
  res.setHeader('Cache-Control', 'no-store');

  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  try {
    // List pending (unapproved) reviews.
    if (req.method === 'GET') {
      // Equality-only query (no composite index); ordered in memory.
      const snap = await db
        .collection('reviews')
        .where('approved', '==', false)
        .limit(500)
        .get();

      const pending = snap.docs
        .map((doc) => {
          const d = doc.data() || {};
          const rating = Number(d.rating);
          return {
            id: doc.id,
            firstName: cleanString(d.firstName, 80),
            rating: Number.isFinite(rating) ? Math.min(5, Math.max(0, Math.round(rating))) : 0,
            title: cleanString(d.title, 120),
            body: cleanString(d.body, 2000),
            createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
          };
        })
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      await writeAuditLog(req, {
        adminEmail: adminUser.email,
        action: 'list',
        reviewCount: pending.length,
      });

      return res.status(200).json({ pending });
    }

    // Approve or delete a review.
    if (req.method === 'POST') {
      const { id, action } = req.body || {};
      if (typeof id !== 'string' || !DOC_ID_RE.test(id) || !['approve', 'delete'].includes(action)) {
        return res.status(400).json({ error: 'Provide an id and a valid action.' });
      }
      const ref = db.collection('reviews').doc(id);
      if (action === 'approve') {
        await ref.update({
          approved: true,
          approvedAt: admin.firestore.FieldValue.serverTimestamp(),
          approvedBy: adminUser.email,
        });
      } else {
        await ref.delete();
      }

      await writeAuditLog(req, {
        adminEmail: adminUser.email,
        action: action,
        reviewId: id,
        reviewCount: 1,
      });

      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Reviews admin API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
