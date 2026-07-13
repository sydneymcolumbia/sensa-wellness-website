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
  if (!ADMIN_EMAILS.includes(decoded.email)) {
    res.status(403).json({ error: 'Access denied' });
    return null;
  }
  return decoded;
}

module.exports = async function handler(req, res) {
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
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      return res.status(200).json({ pending });
    }

    // Approve or delete a review.
    if (req.method === 'POST') {
      const { id, action } = req.body || {};
      if (!id || !['approve', 'delete'].includes(action)) {
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
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Reviews admin API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
