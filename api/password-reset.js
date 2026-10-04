const crypto = require('crypto');
const admin = require('firebase-admin');

// Rate-limited password reset for the admin dashboard (admin.html).
//
// The browser never calls Firebase's reset endpoint directly. It POSTs
// { email } here, this function enforces per-address and per-IP limits
// backed by Firestore (Vercel functions are stateless, so an in-memory
// counter would reset on every cold start), and only then asks Firebase
// to send its password reset email. The response is identical whether or
// not the address is a real admin, so the endpoint cannot be used to probe
// which emails exist.

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'sensa-app-7b2b7',
  });
}

const db = admin.firestore();

// Must match the lists in api/admin.js, api/reviews-admin.js and admin.html.
const ADMIN_EMAILS = [
  'info@sensawellness.org',
  'sydney@sensawellness.org',
  'ryan@sensawellness.org',
];

// Firebase web API key. It is public (the same key ships in admin.html);
// it only identifies the project, it grants no privileges.
const FIREBASE_WEB_API_KEY =
  process.env.FIREBASE_WEB_API_KEY ||
  process.env.FIREBASE_API_KEY ||
  'AIzaSyBgQp_ZTGul5jFwXbTlB0gJKjfR17j1D44';

// Where the reset email's link lands after the password is changed.
const CONTINUE_URL = 'https://www.sensawellness.org/admin';

// Limits per rolling window. Firebase applies its own quota on top.
const WINDOW_MS = 60 * 60 * 1000;
const LIMITS = {
  perEmail: 3,   // reset emails per address per hour
  perIp: 10,     // reset requests per IP per hour (any address)
};

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,189}\.[^\s@]{2,63}$/;

// Same keyed-hash scheme as api/reviews.js so stored fingerprints cannot be
// reversed by brute-forcing the IPv4 space.
const HASH_KEY =
  process.env.IP_HASH_SECRET ||
  crypto
    .createHash('sha256')
    .update(`sensa-ip-hash:${process.env.JWT_SECRET || ''}`)
    .digest();

function fingerprint(value) {
  return crypto.createHmac('sha256', HASH_KEY).update(String(value)).digest('hex');
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (
    (typeof fwd === 'string' && fwd.split(',')[0].trim()) ||
    req.headers['x-real-ip'] ||
    (req.socket && req.socket.remoteAddress) ||
    'unknown'
  );
}

// Atomically count one request against a bucket. Returns true when the
// request is within the limit, false when it must be rejected.
async function consume(bucketId, limit) {
  const ref = db.collection('authRateLimits').doc(bucketId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    const data = snap.exists ? snap.data() : null;
    const fresh = !data || typeof data.windowStart !== 'number' || now - data.windowStart >= WINDOW_MS;
    const count = fresh ? 0 : Number(data.count) || 0;
    if (count >= limit) return false;
    tx.set(ref, {
      count: count + 1,
      windowStart: fresh ? now : data.windowStart,
      // Lets a cleanup job (or Firestore TTL on this field) drop old buckets.
      expiresAt: admin.firestore.Timestamp.fromMillis((fresh ? now : data.windowStart) + WINDOW_MS),
    });
    return true;
  });
}

async function writeAuditLog(req, entry) {
  try {
    await db.collection('adminAccess').add({
      ...entry,
      route: 'password-reset',
      method: req.method,
      ipHash: fingerprint(clientIp(req)),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('Password reset audit log write failed:', err);
  }
}

// Ask Firebase to send its standard password reset email. Firebase renders
// and delivers the message, so no third-party mail provider is involved.
async function sendResetEmail(email) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(FIREBASE_WEB_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email,
        continueUrl: CONTINUE_URL,
      }),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`sendOobCode ${res.status}: ${text.slice(0, 200)}`);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Provide a valid email address.' });
  }

  // Generic reply for every non-limited outcome.
  const generic = { ok: true, message: 'If that address has admin access, a password reset email is on its way.' };

  try {
    const ipOk = await consume(`reset-ip-${fingerprint(clientIp(req))}`, LIMITS.perIp);
    if (!ipOk) {
      res.setHeader('Retry-After', String(Math.ceil(WINDOW_MS / 1000)));
      return res.status(429).json({ error: 'Too many reset requests. Try again later.' });
    }
    const emailOk = await consume(`reset-email-${fingerprint(email)}`, LIMITS.perEmail);
    if (!emailOk) {
      res.setHeader('Retry-After', String(Math.ceil(WINDOW_MS / 1000)));
      return res.status(429).json({ error: 'Too many reset requests. Try again later.' });
    }
  } catch (err) {
    console.error('Password reset rate limit check failed:', err);
    // Fail closed: without a working limiter, do not send anything.
    return res.status(503).json({ error: 'Password reset is temporarily unavailable.' });
  }

  const allowlisted = ADMIN_EMAILS.includes(email);
  if (allowlisted) {
    try {
      await sendResetEmail(email);
      await writeAuditLog(req, { adminEmail: email, action: 'reset_email_sent' });
    } catch (err) {
      // Logged server-side only; the caller still gets the generic reply.
      console.error('Password reset email failed:', err);
      await writeAuditLog(req, { adminEmail: email, action: 'reset_email_failed' });
    }
  } else {
    // Do not store arbitrary submitted strings; just note the attempt.
    await writeAuditLog(req, { action: 'reset_request_denied' });
  }

  return res.status(200).json(generic);
};
