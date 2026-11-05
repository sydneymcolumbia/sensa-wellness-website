const crypto = require('crypto');
const admin = require('firebase-admin');
const gaMp = require('../ga-mp');

// Free book request intake (Payhip -> Zapier "New Sale" -> here).
//   POST /api/book-request   header x-book-secret: <BOOK_REQUEST_SECRET>
//                            (or ?key=... if the sender cannot set headers)
//        body: JSON from Zapier. Field names vary, so several spellings are
//        accepted: email, order_id/id, product_id, product_name, price,
//        consent/marketing_consent/newsletter, utm_*, gclid, ga_client_id.
//   GET  /api/book-request   (admin, verified Firebase token) last 100 requests.
// Served through api/social.js (?action=book-request) because of the
// 12-function cap; vercel.json rewrites /api/book-request to it.
//
// Stores one Firestore doc per Payhip order in `book_requests`, keyed by the
// Payhip order id so retries are idempotent. Only a sha256 hash of the email
// is stored (api/webhook.js hashes the Stripe buyer email the same way to
// mark a later kit order as book-assisted). The email itself stays in Payhip.
// A free checkout sends GA4 `book_request_complete`; it is never a purchase.

const COLLECTION = 'book_requests';

function getDb() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return null;
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
      projectId: 'sensa-app-7b2b7',
    });
  }
  return admin.firestore();
}

function emailHash(email) {
  return crypto.createHash('sha256').update(String(email).trim().toLowerCase()).digest('hex');
}

function pick(body, keys) {
  for (const k of keys) {
    const v = body[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function toBool(v) {
  if (v === '') return null;
  const s = String(v).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on', 'subscribed', 'opted_in', 'opted in'].includes(s)) return true;
  if (['0', 'false', 'no', 'n', 'off', 'unsubscribed'].includes(s)) return false;
  return null;
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a)); const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'ga_client_id', 'ga_session_id', 'referrer', 'landing_page'];

function normalize(body) {
  const email = pick(body, ['email', 'customer_email', 'buyer_email', 'Email', 'Customer Email']);
  const orderId = pick(body, ['order_id', 'orderId', 'sale_id', 'transaction_id', 'id', 'Order ID']);
  const priceRaw = pick(body, ['price', 'amount', 'total', 'amount_paid', 'Price']);
  const price = priceRaw ? Number(String(priceRaw).replace(/[^0-9.]/g, '')) || 0 : 0;
  const attribution = {};
  for (const k of ATTRIBUTION_KEYS) { const v = pick(body, [k]); if (v) attribution[k] = v.slice(0, 200); }
  return {
    email,
    orderId,
    productId: pick(body, ['product_id', 'productId', 'item_id', 'product_key', 'Product ID']),
    productName: pick(body, ['product_name', 'productName', 'item_name', 'product', 'Product']),
    price,
    currency: (pick(body, ['currency', 'Currency']) || 'USD').toUpperCase(),
    consent: toBool(pick(body, ['consent', 'marketing_consent', 'newsletter', 'email_opt_in', 'opt_in', 'subscribed', 'Marketing Consent'])),
    country: pick(body, ['country', 'Country']),
    attribution,
    source: pick(body, ['source']) || 'zapier',
  };
}

async function listRequests(db, res) {
  const snap = await db.collection(COLLECTION).orderBy('createdAt', 'desc').limit(100).get();
  const requests = snap.docs.map((d) => {
    const x = d.data();
    return { id: d.id, ...x, createdAt: x.createdAt?.toDate ? x.createdAt.toDate().toISOString() : x.createdAt || null, kitOrderAt: x.kitOrderAt?.toDate ? x.kitOrderAt.toDate().toISOString() : x.kitOrderAt || null };
  });
  const converted = requests.filter((r) => r.kitOrderSessionId).length;
  return res.status(200).json({ requests, total: requests.length, converted });
}

module.exports = async function handler(req, res, requireAdmin) {
  res.setHeader('Cache-Control', 'no-store');
  const db = getDb();
  if (!db) return res.status(503).json({ error: 'Firestore is not configured' });

  if (req.method === 'GET') {
    const adminUser = await requireAdmin(req, res);
    if (!adminUser) return;
    return listRequests(db, res);
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.BOOK_REQUEST_SECRET;
  if (!secret) return res.status(503).json({ error: 'Book request intake is not configured (BOOK_REQUEST_SECRET missing)' });
  const given = req.headers['x-book-secret'] || req.query?.key || '';
  if (!given || !safeEqual(given, secret)) return res.status(401).json({ error: 'Unauthorized' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'JSON body required' });

  const r = normalize(body);
  if (!r.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) return res.status(400).json({ error: 'A valid email is required' });

  const hash = emailHash(r.email);
  const docId = r.orderId ? `payhip_${r.orderId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120)}` : `h_${hash.slice(0, 20)}_${Date.now()}`;
  const ref = db.collection(COLLECTION).doc(docId);
  const existing = await ref.get();
  const duplicate = existing.exists;
  const isFree = r.price === 0;

  const doc = {
    payhipOrderId: r.orderId || null,
    productId: r.productId || null,
    productName: r.productName || null,
    price: r.price,
    currency: r.currency,
    isFree,
    emailHash: hash,
    consent: r.consent,
    country: r.country || null,
    attribution: r.attribution,
    source: r.source,
    receivedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (duplicate) {
    // A retried notification must not blank out fields the first delivery
    // carried (consent, attribution). Only fill gaps and bump the counters.
    const cur = existing.data() || {};
    const fill = { receivedAt: doc.receivedAt, deliveries: admin.firestore.FieldValue.increment(1) };
    for (const [k, v] of Object.entries(doc)) {
      if (k === 'receivedAt') continue;
      const empty = cur[k] === undefined || cur[k] === null || (typeof cur[k] === 'object' && !Array.isArray(cur[k]) && Object.keys(cur[k]).length === 0);
      const hasValue = v !== null && v !== undefined && !(typeof v === 'object' && Object.keys(v).length === 0);
      if (empty && hasValue) fill[k] = v;
    }
    await ref.set(fill, { merge: true });
  } else {
    doc.createdAt = admin.firestore.FieldValue.serverTimestamp();
    doc.deliveries = 1;
    await ref.set(doc, { merge: true });
  }

  let ga = { sent: false, reason: duplicate ? 'duplicate' : 'not_free' };
  if (!duplicate && isFree) {
    ga = await gaMp.send({
      clientId: r.attribution.ga_client_id,
      sessionId: r.attribution.ga_session_id,
      events: [{
        name: 'book_request_complete',
        params: {
          payhip_order_id: r.orderId || 'none',
          product_id: r.productId || 'book',
          price: 0,
          currency: r.currency,
          consent: r.consent === null ? 'unknown' : r.consent,
          source: r.source,
          ...(r.attribution.utm_campaign ? { campaign: r.attribution.utm_campaign } : {}),
        },
      }],
    });
  }

  return res.status(200).json({ ok: true, id: docId, duplicate, free: isFree, ga });
};

module.exports.emailHash = emailHash;
module.exports.normalize = normalize;
module.exports.COLLECTION = COLLECTION;
