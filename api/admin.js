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

// Firestore document ids as the app writes them (Firebase Auth uids).
const DOC_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

// Defensive output sanitization. The dashboard escapes on render, but these
// values are user controlled (set from the app), so strip markup and control
// characters (Unicode category Cc) here as well and cap lengths.
function cleanString(value, max) {
  if (value == null) return '';
  let s;
  if (Array.isArray(value)) s = value.map(v => (v == null ? '' : String(v))).join(', ');
  else if (typeof value === 'object') s = '';
  else s = String(value);
  return s
    .replace(/[<>]/g, '')
    .replace(/\p{Cc}/gu, '')
    .trim()
    .slice(0, max);
}

function cleanNumber(value) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
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
      route: 'admin',
      method: req.method,
      ipHash: hashIp(req),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('Admin audit log write failed:', err);
  }
}

function getQuery(req) {
  if (req.query && typeof req.query === 'object') return req.query;
  try {
    return Object.fromEntries(new URL(req.url || '/', 'http://localhost').searchParams);
  } catch (e) {
    return {};
  }
}

module.exports = async function handler(req, res) {
  // admin.html is served from this same origin; do not open the endpoint to
  // every site on the web.
  res.setHeader('Access-Control-Allow-Origin', 'https://www.sensawellness.org');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');
  // Responses carry personal data; never let a browser or proxy cache them.
  res.setHeader('Cache-Control', 'no-store');

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

  // Email/password sign-up does not verify the address, so an allowlisted
  // email alone is not proof of identity. Require a verified email claim.
  if (!decodedToken.email_verified || !ADMIN_EMAILS.includes(decodedToken.email)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (REQUIRE_MFA && !(decodedToken.firebase && decodedToken.firebase.sign_in_second_factor)) {
    return res.status(403).json({ error: 'Multi-factor authentication required' });
  }

  // Optional ?uid=<uid> narrows the export to a single user so the dashboard
  // can open one profile without pulling every record.
  const rawUid = getQuery(req).uid;
  let uid = null;
  if (rawUid !== undefined) {
    if (typeof rawUid !== 'string' || !DOC_ID_RE.test(rawUid)) {
      return res.status(400).json({ error: 'Invalid uid' });
    }
    uid = rawUid;
  }

  const audit = {
    adminEmail: decodedToken.email,
    action: uid ? 'user' : 'list',
    uid: uid,
    userCount: 0,
    scanCount: 0,
  };

  try {
    let userDocs;
    let scanDocs;
    if (uid) {
      const [userSnap, scansSnap] = await Promise.all([
        db.collection('users').doc(uid).get(),
        db.collection('scans').where('userId', '==', uid).get(),
      ]);
      if (!userSnap.exists) {
        await writeAuditLog(req, { ...audit, result: 'not_found' });
        return res.status(404).json({ error: 'User not found' });
      }
      userDocs = [userSnap];
      scanDocs = scansSnap.docs;
    } else {
      // Fetch all users and scans in parallel
      const [usersSnap, scansSnap] = await Promise.all([
        db.collection('users').get(),
        db.collection('scans').get(),
      ]);
      userDocs = usersSnap.docs;
      scanDocs = scansSnap.docs;
    }

    const users = userDocs.map(doc => {
      const d = doc.data() || {};
      return {
        uid: doc.id,
        displayName: cleanString(d.displayName, 80),
        email: cleanString(d.email, 254),
        createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
        reminderInterval: cleanString(d.reminderInterval, 40) || 'none',
        healthIntakeComplete: d.healthIntakeComplete === true,
        ageRange: cleanString(d.ageRange, 60) || null,
        biologicalSex: cleanString(d.biologicalSex, 60) || null,
        activityLevel: cleanString(d.activityLevel, 60) || null,
        dietType: cleanString(d.dietType, 120) || null,
        sleepHours: cleanString(d.sleepHours, 60) || null,
        stressLevel: cleanString(d.stressLevel, 60) || null,
        smokingStatus: cleanString(d.smokingStatus, 60) || null,
        primaryGoal: cleanString(d.primaryGoal, 200) || null,
        healthConditions: cleanString(d.healthConditions, 500) || null,
      };
    });

    const scans = scanDocs.map(doc => {
      const d = doc.data() || {};
      return {
        id: doc.id,
        userId: cleanString(d.userId, 128),
        score: cleanNumber(d.score),
        label: cleanString(d.label, 20),
        opticalScore: cleanNumber(d.opticalScore) || cleanNumber(d.crpMgDl),
        avgBlue: cleanNumber(d.avgBlue),
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
      .slice(0, uid ? 500 : 50);

    audit.userCount = totalUsers;
    audit.scanCount = totalScans;
    await writeAuditLog(req, audit);

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
    await writeAuditLog(req, { ...audit, result: 'error' });
    return res.status(500).json({ error: 'Internal server error' });
  }
};
