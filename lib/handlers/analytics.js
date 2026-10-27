const ga = require('../ga');

// GET /api/analytics?days=28[&refresh=1]  (admin only)
// Served through api/social.js (?action=analytics) because of the
// 12-function cap. Results are cached in Firestore analytics/cache_<days>
// for CACHE_MINUTES. When GA is not reachable the response is still 200
// with connected:false and a message the dashboard shows as setup help.

const CACHE_MINUTES = Number(process.env.ANALYTICS_CACHE_MINUTES || 15);
const ALLOWED_DAYS = [7, 28, 90];

module.exports = async function handler(req, res, requireAdmin) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  const days = ALLOWED_DAYS.includes(Number(req.query?.days)) ? Number(req.query.days) : 28;
  const force = req.query?.refresh === '1';
  const db = ga.getDb();
  const cacheRef = db.collection('analytics').doc(`cache_${days}`);
  if (!force) {
    const snap = await cacheRef.get();
    if (snap.exists) {
      const c = snap.data();
      if (c.generatedAt && Date.now() - Date.parse(c.generatedAt) < CACHE_MINUTES * 60 * 1000) {
        return res.status(200).json({ ...c.payload, generatedAt: c.generatedAt, cached: true });
      }
    }
  }
  if (force) await db.collection('analytics').doc('config').delete().catch(() => {});

  let payload;
  try {
    payload = await ga.buildReport(db, days);
  } catch (err) {
    console.error('Analytics report failed:', err.message);
    return res.status(200).json({
      connected: false,
      days,
      error: err.message,
      serviceAccount: ga.serviceEmail(),
      measurementId: ga.MEASUREMENT_ID,
      generatedAt: new Date().toISOString(),
      cached: false,
    });
  }
  const generatedAt = new Date().toISOString();
  await cacheRef.set({ payload, generatedAt }).catch(err => console.error('analytics cache write failed', err.message));
  return res.status(200).json({ ...payload, generatedAt, cached: false });
};
