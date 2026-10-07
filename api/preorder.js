const crypto = require('crypto');
const admin = require('firebase-admin');
const { Resend } = require('resend');

// Preorder reservations while kits cannot ship.
//   POST (public)  { name, email, kit, quantity, note, website, page }
//                  Stores a preorder in Firestore `preorders` and emails an
//                  alert to the team. No payment is involved.
//   GET  (admin)   Lists preorders for the admin dashboard. Requires a
//                  verified Firebase ID token from an allowlisted admin.

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'sensa-app-7b2b7',
  });
}
const db = admin.firestore();

// Must match the lists in api/admin.js, api/reviews-admin.js,
// api/password-reset.js and admin.html.
const ADMIN_EMAILS = [
  'info@sensawellness.org',
  'sydney@sensawellness.org',
  'ryan@sensawellness.org',
];
const REQUIRE_MFA = process.env.ADMIN_REQUIRE_MFA === 'true';

const KITS = {
  price_1test: '1 Test Kit',
  price_3pack: '3-Pack Bundle',
  price_4pack: '4-Pack Bundle',
};

// Where the "new preorder" alert goes. Same env conventions as api/webhook.js.
// Temporary (Oct 2026): alerts go to Sydney's personal inbox until the team
// mailbox is set up for this. Set PREORDER_ALERT_EMAIL in Vercel to override.
const ALERT_EMAIL = process.env.PREORDER_ALERT_EMAIL || 'sydneylizmurphy@gmail.com';
const ALERT_FROM = process.env.ORDER_ALERT_FROM || 'Sensa Orders <orders@sensawellness.org>';

const LIMITS = {
  nameMax: 80,
  emailMax: 254,
  noteMax: 500,
  pageMax: 200,
  quantityMax: 5,
  minSecondsBetweenSubmits: 60, // per IP
  listMax: 500,
};
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,189}\.[^\s@]{2,63}$/;

function clean(value, max) {
  if (value == null) return '';
  return String(value)
    .replace(/<[^>]*>/g, '')
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

const IP_HASH_KEY =
  process.env.IP_HASH_SECRET ||
  crypto.createHash('sha256').update(`sensa-ip-hash:${process.env.JWT_SECRET || ''}`).digest();

function hashIp(req) {
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  return crypto.createHmac('sha256', IP_HASH_KEY).update(ip).digest('hex');
}

async function sendAlert(p) {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: ALERT_FROM,
    to: ALERT_EMAIL,
    subject: `New Sensa preorder: ${p.quantity} x ${p.kitLabel} (${p.name})`,
    text: [
      'New preorder on sensawellness.org',
      '',
      `Name: ${p.name}`,
      `Email: ${p.email}`,
      `Kit: ${p.quantity} x ${p.kitLabel}`,
      p.note ? `Note: ${p.note}` : 'Note: (none)',
      `Page: ${p.page || '/'}`,
      '',
      'Review all preorders in the admin dashboard: https://www.sensawellness.org/admin',
    ].join('\n'),
  });
  if (result?.error) throw new Error(result.error.message);
}

async function createPreorder(req, res) {
  const body = req.body || {};

  // Honeypot: bots fill the hidden "website" field. Pretend success.
  if (body.website) return res.status(200).json({ ok: true });

  const name = clean(body.name, LIMITS.nameMax);
  const email = clean(body.email, LIMITS.emailMax).toLowerCase();
  const kit = typeof body.kit === 'string' && KITS[body.kit] ? body.kit : null;
  const quantityRaw = Number(body.quantity);
  const quantity = Number.isInteger(quantityRaw) ? Math.min(LIMITS.quantityMax, Math.max(1, quantityRaw)) : 1;
  const note = clean(body.note, LIMITS.noteMax);
  const page = clean(body.page, LIMITS.pageMax);

  if (!name) return res.status(400).json({ error: 'Please add your name.' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (!kit) return res.status(400).json({ error: 'Please choose a kit.' });

  const ipHash = hashIp(req);
  const cutoff = Date.now() - LIMITS.minSecondsBetweenSubmits * 1000;
  try {
    const recent = await db.collection('preorders').where('ipHash', '==', ipHash).limit(10).get();
    const tooSoon = recent.docs.some((doc) => (doc.data().createdAt?.toMillis?.() || 0) > cutoff);
    if (tooSoon) {
      return res.status(429).json({ error: 'You just sent a preorder. Please wait a minute before sending another.' });
    }
  } catch (e) {
    console.warn('Preorder rate-limit check skipped:', e.message);
  }

  // Same person reserving the same kit again just updates the existing entry.
  try {
    const dupes = await db.collection('preorders').where('email', '==', email).limit(5).get();
    const existing = dupes.docs.find((doc) => doc.data().kit === kit);
    if (existing) {
      await existing.ref.update({
        name,
        quantity,
        note: note || existing.data().note || '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return res.status(200).json({ ok: true, updated: true });
    }
  } catch (e) {
    console.warn('Preorder duplicate check skipped:', e.message);
  }

  const entry = {
    name,
    email,
    kit,
    kitLabel: KITS[kit],
    quantity,
    note,
    page,
    status: 'open',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ipHash,
    alertSent: false,
  };
  const ref = await db.collection('preorders').add(entry);

  try {
    await sendAlert(entry);
    await ref.update({ alertSent: true });
  } catch (err) {
    // The preorder is saved either way; the admin dashboard lists it.
    console.error('Preorder alert email failed:', err.message);
  }

  return res.status(201).json({ ok: true });
}

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

async function listPreorders(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  const snap = await db.collection('preorders').limit(LIMITS.listMax).get();
  const preorders = snap.docs
    .map((doc) => {
      const d = doc.data() || {};
      return {
        id: doc.id,
        name: clean(d.name, LIMITS.nameMax),
        email: clean(d.email, LIMITS.emailMax),
        kitLabel: clean(d.kitLabel, 40),
        quantity: Number(d.quantity) || 1,
        note: clean(d.note, LIMITS.noteMax),
        page: clean(d.page, LIMITS.pageMax),
        status: clean(d.status, 20) || 'open',
        alertSent: d.alertSent === true,
        createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
      };
    })
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const totalKits = preorders.reduce((s, p) => s + p.quantity, 0);
  return res.status(200).json({ preorders, count: preorders.length, totalKits });
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'POST') return await createPreorder(req, res);
    if (req.method === 'GET') return await listPreorders(req, res);
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Preorder API error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
