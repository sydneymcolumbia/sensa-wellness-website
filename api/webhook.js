const crypto = require('crypto');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');
const admin = require('firebase-admin');
const gaMp = require('../lib/ga-mp');

// Stripe webhook.
//   checkout.session.completed  -> order alert email, Firestore kit_orders
//                                  record, GA4 `purchase` + `kit_purchase`
//                                  with the real amount (Measurement Protocol)
//   charge.refunded             -> kit_orders refund fields, GA4 `refund` +
//                                  `kit_refund`
// The Stripe dashboard webhook endpoint must be subscribed to both events.
// GA attribution uses metadata.ga_client_id / ga_session_id that
// api/checkout.js copied from attribution.js; without them the event is sent
// against a random client id (counted, not attributed). A later kit order is
// marked book-assisted when the buyer's hashed email matches a doc in
// `book_requests` (lib/handlers/book-request.js). Nothing here may fail the
// webhook: every step is wrapped and the handler always returns 200 after
// signature verification.

// Where new-order alerts go. Override with ORDER_ALERT_EMAIL in Vercel env.
const ORDER_ALERT_EMAIL = process.env.ORDER_ALERT_EMAIL || 'info@sensawellness.org';
// Resend only delivers from a verified domain. Override once one is verified
// under a different address.
const ORDER_ALERT_FROM = process.env.ORDER_ALERT_FROM || 'Sensa Orders <orders@sensawellness.org>';

const KIT_LABELS = { price_1test: '1 Test Kit', price_3pack: '3-Pack Bundle', price_4pack: '4-Pack Bundle' };
const ATTRIBUTION_KEYS = ['ga_client_id', 'ga_session_id', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'oppref', 'oai_click', 'oai_campaign', 'landing_page', 'referrer', 'checkout_page', 'hear_about_us', 'price_key'];

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
  if (!email) return null;
  return crypto.createHash('sha256').update(String(email).trim().toLowerCase()).digest('hex');
}

function attributionFrom(metadata) {
  const out = {};
  for (const k of ATTRIBUTION_KEYS) if (metadata && metadata[k]) out[k] = metadata[k];
  return out;
}

// Precedence so an order is credited once: book (email match or book email
// campaign) > ad (gclid or paid medium) > direct.
function journeyFor(bookMatch, a) {
  if (bookMatch || a.utm_campaign === 'book_sequence' || a.utm_source === 'book_email') return 'book';
  if (a.gclid || a.oppref || a.oai_click || a.utm_medium === 'cpc' || a.utm_medium === 'paid') return 'ad';
  return 'direct';
}

async function lineItemsFor(session) {
  try {
    const li = await stripe.checkout.sessions.listLineItems(session.id, { limit: 10 });
    return li.data.map((x) => ({ item_name: x.description, item_id: x.price?.id || undefined, price: x.amount_total != null && x.quantity ? x.amount_total / 100 / x.quantity : undefined, quantity: x.quantity || 1 }));
  } catch (err) {
    const key = session.metadata?.price_key;
    return [{ item_name: KIT_LABELS[key] || 'Sensa kit', item_id: key || undefined, price: (session.amount_total || 0) / 100, quantity: 1 }];
  }
}

async function findBookRequest(db, hash) {
  if (!db || !hash) return null;
  const snap = await db.collection('book_requests').where('emailHash', '==', hash).limit(5).get();
  if (snap.empty) return null;
  // Earliest request wins (no composite index needed for a single where).
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  docs.sort((x, y) => (x.createdAt?.toMillis?.() || 0) - (y.createdAt?.toMillis?.() || 0));
  return docs[0];
}

async function sendOrderAlert(session, items) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const itemText = items.map((li) => `${li.quantity} x ${li.item_name}`).join(', ') || '(no line items)';
  const total = `$${(session.amount_total / 100).toFixed(2)} ${(session.currency || 'usd').toUpperCase()}`;
  const name = session.customer_details?.name || 'Unknown name';
  const email = session.customer_details?.email || 'no email';
  const addr = session.shipping_details?.address || session.customer_details?.address;
  const where = addr ? [addr.city, addr.state, addr.country].filter(Boolean).join(', ') : 'no address';

  const result = await resend.emails.send({
    from: ORDER_ALERT_FROM,
    to: ORDER_ALERT_EMAIL,
    subject: `${session.metadata?.preorder === 'true' ? 'New Sensa PRE-ORDER' : 'New Sensa order'}: ${itemText} (${total})`,
    text: [
      session.metadata?.preorder === 'true' ? 'New PAID PRE-ORDER on sensawellness.org (ships with the next batch)' : 'New order on sensawellness.org',
      '',
      `Items: ${itemText}`,
      `Total: ${total}`,
      `Customer: ${name} <${email}>`,
      `Ships to: ${where}`,
      '',
      `Stripe: https://dashboard.stripe.com/payments/${session.payment_intent || ''}`,
    ].join('\n'),
  });
  if (result?.error) throw new Error(result.error.message);
}

// Firestore record + GA4 events for a paid Checkout session. Exported for tests.
async function recordKitOrder(session, { db = getDb() } = {}) {
  if (session.payment_status !== 'paid') return { skipped: 'not_paid' };
  const a = attributionFrom(session.metadata);
  const hash = emailHash(session.customer_details?.email);
  const items = await lineItemsFor(session);
  const value = (session.amount_total || 0) / 100;
  const currency = (session.currency || 'usd').toUpperCase();
  const preorder = session.metadata?.preorder === 'true';

  let book = null;
  try { book = await findBookRequest(db, hash); } catch (err) { console.error('book_requests lookup failed:', err.message); }
  const journey = journeyFor(Boolean(book), a);
  const createdMs = (session.created || Math.floor(Date.now() / 1000)) * 1000;
  const daysSinceRequest = book?.createdAt?.toMillis ? Math.round((createdMs - book.createdAt.toMillis()) / 86400000) : null;

  if (db) {
    try {
      await db.collection('kit_orders').doc(session.id).set({
        sessionId: session.id,
        paymentIntent: session.payment_intent || null,
        amountTotal: session.amount_total || 0,
        amountSubtotal: session.amount_subtotal || null,
        currency,
        items,
        preorder,
        promo: session.metadata?.promo || null,
        emailHash: hash,
        attribution: a,
        journey,
        bookAssisted: Boolean(book),
        bookRequestId: book ? book.id : null,
        daysSinceRequest,
        createdAt: admin.firestore.Timestamp.fromMillis(createdMs),
        recordedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      if (book) {
        await db.collection('book_requests').doc(book.id).set({
          kitOrderSessionId: session.id,
          kitOrderAt: admin.firestore.Timestamp.fromMillis(createdMs),
          daysToOrder: daysSinceRequest,
        }, { merge: true });
      }
    } catch (err) {
      console.error('kit_orders write failed:', err.message);
    }
  }

  const shared = { transaction_id: session.id, value, currency, journey, book_assisted: Boolean(book), preorder, coupon: session.metadata?.promo || undefined };
  const ga = await gaMp.send({
    clientId: a.ga_client_id,
    sessionId: a.ga_session_id,
    events: [
      { name: 'purchase', params: { ...shared, items } },
      { name: 'kit_purchase', params: shared },
    ],
  });
  return { journey, bookAssisted: Boolean(book), value, ga, items };
}

// Refund handling. Exported for tests.
async function recordRefund(charge, { db = getDb() } = {}) {
  if (!charge.payment_intent) return { skipped: 'no_payment_intent' };
  let session = null;
  try {
    const list = await stripe.checkout.sessions.list({ payment_intent: charge.payment_intent, limit: 1 });
    session = list.data[0] || null;
  } catch (err) {
    console.error('session lookup for refund failed:', err.message);
  }
  const a = attributionFrom(session?.metadata);
  const refunded = (charge.amount_refunded || 0) / 100;
  const currency = (charge.currency || 'usd').toUpperCase();
  const full = charge.amount_refunded >= charge.amount;
  const transactionId = session ? session.id : charge.payment_intent;

  if (db && session) {
    try {
      await db.collection('kit_orders').doc(session.id).set({
        refundedAmount: charge.amount_refunded || 0,
        refunded: full,
        refundedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error('kit_orders refund write failed:', err.message);
    }
  }
  const shared = { transaction_id: transactionId, value: refunded, currency, full_refund: full };
  const ga = await gaMp.send({
    clientId: a.ga_client_id,
    sessionId: a.ga_session_id,
    events: [
      { name: 'refund', params: shared },
      { name: 'kit_refund', params: shared },
    ],
  });
  return { refunded, full, ga };
}

// Disable body parsing so we can access the raw body for signature verification
module.exports.config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('Order completed:', {
      sessionId: session.id,
      amountTotal: session.amount_total,
      currency: session.currency,
      paymentStatus: session.payment_status,
    });
    let items = [];
    try {
      const result = await recordKitOrder(session);
      items = result.items || [];
      console.log('Order recorded:', { journey: result.journey, bookAssisted: result.bookAssisted, ga: result.ga });
    } catch (err) {
      console.error('Order record failed:', err.message);
    }
    // Alert failures must never make Stripe retry the webhook.
    try {
      await sendOrderAlert(session, items.length ? items : await lineItemsFor(session));
    } catch (err) {
      console.error('Order alert email failed:', err.message);
    }
  } else if (event.type === 'charge.refunded') {
    try {
      const result = await recordRefund(event.data.object);
      console.log('Refund recorded:', result);
    } catch (err) {
      console.error('Refund record failed:', err.message);
    }
  }

  return res.status(200).json({ received: true });
}

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
module.exports.recordKitOrder = recordKitOrder;
module.exports.recordRefund = recordRefund;
module.exports.journeyFor = journeyFor;
module.exports.emailHash = emailHash;
