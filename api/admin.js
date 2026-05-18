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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Verify Firebase ID token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const idToken = authHeader.slice(7);
  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (!ADMIN_EMAILS.includes(decodedToken.email)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    // Fetch all users and scans in parallel
    const [usersSnap, scansSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('scans').get(),
    ]);

    const users = usersSnap.docs.map(doc => {
      const d = doc.data();
      return {
        uid: doc.id,
        displayName: d.displayName || '',
        email: d.email || '',
        createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
        reminderInterval: d.reminderInterval || 'none',
        healthIntakeComplete: d.healthIntakeComplete || false,
        ageRange: d.ageRange || null,
        biologicalSex: d.biologicalSex || null,
        activityLevel: d.activityLevel || null,
        dietType: d.dietType || null,
        sleepHours: d.sleepHours || null,
        stressLevel: d.stressLevel || null,
        smokingStatus: d.smokingStatus || null,
        primaryGoal: d.primaryGoal || null,
        healthConditions: d.healthConditions || null,
      };
    });

    const scans = scansSnap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        userId: d.userId || '',
        score: d.score || 0,
        label: d.label || '',
        opticalScore: d.opticalScore || d.crpMgDl || 0,
        avgBlue: d.avgBlue || 0,
        timestamp: d.timestamp?.toDate?.()?.toISOString() || null,
      };
    });

    // Attach scan counts and last scan to each user
    const scansByUser = {};
    for (const scan of scans) {
      if (!scansByUser[scan.userId]) scansByUser[scan.userId] = [];
      scansByUser[scan.userId].push(scan);
    }

    const usersWithStats = users.map(u => ({
      ...u,
      scanCount: scansByUser[u.uid]?.length || 0,
      lastScan: scansByUser[u.uid]
        ? scansByUser[u.uid].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
        : null,
    }));

    // Overview stats
    const totalUsers = users.length;
    const totalScans = scans.length;
    const avgScore = scans.length
      ? Math.round(scans.reduce((sum, s) => sum + s.score, 0) / scans.length)
      : 0;
    const intakeComplete = users.filter(u => u.healthIntakeComplete).length;

    const labelCounts = { Low: 0, Moderate: 0, Elevated: 0, High: 0 };
    for (const s of scans) {
      if (labelCounts[s.label] !== undefined) labelCounts[s.label]++;
      else labelCounts['Low']++;
    }

    const now = new Date();
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const newUsersThisWeek = users.filter(
      u => u.createdAt && new Date(u.createdAt) > oneWeekAgo
    ).length;

    const recentScans = scans
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 50);

    return res.status(200).json({
      stats: {
        totalUsers,
        totalScans,
        avgScore,
        intakeComplete,
        intakeCompletePct: totalUsers ? Math.round((intakeComplete / totalUsers) * 100) : 0,
        newUsersThisWeek,
        labelCounts,
      },
      users: usersWithStats.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      recentScans,
    });
  } catch (err) {
    console.error('Admin API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
