const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRICE_IDS = {
  price_1test:  'price_1TGmnPKrHFkD3MC35eXx5OM5',
  price_3pack:  'price_1TGmoOKrHFkD3MC33tp7m4LU',
  price_4pack:  'price_1TGmyGKrHFkD3MC3MlqR1Z2d',
};

// ── Fall Reset Sale ────────────────────────────────────────────────
// 20% off, applied server-side so the discount is real (the checkout
// total reflects it). The site shows rounded sale prices ($39 / $79 /
// $103), but a 20% coupon on the $49 / $99 / $129 list prices charged
// $39.20 / $79.20 / $103.20, so every bundle now gets a fixed dollar-off
// coupon and checkout charges exactly the advertised amount. The promo
// has no end date (the on-page countdown was retired 2026-11-04). To end
// it, set enabled to false AND revert the on-page sale copy together.
// Cleaner long-term: create $39 / $79 / $103 prices in the Stripe
// dashboard, swap PRICE_IDS, and set enabled to false.
const SALE = {
  enabled: true,
  name: 'Fall Reset Sale',
  // Fixed coupon ids so creation is idempotent; amountOff is in cents.
  coupons: {
    price_1test: { id: 'fall_reset_2026_1kit',  amountOff: 1000 }, // $49 -> $39
    price_3pack: { id: 'fall_reset_2026_3pack', amountOff: 2000 }, // $99 -> $79
    price_4pack: { id: 'fall_reset_2026_4pack', amountOff: 2600 }, // $129 -> $103
  },
};

function saleActive(priceId) {
  return SALE.enabled && Boolean(SALE.coupons[priceId]);
}

// Retrieve the bundle's promo coupon, creating it once if it does not exist
// yet. Fixed coupon ids mean concurrent cold starts converge on the same
// coupon; a create race (resource_already_exists) falls back to retrieve.
async function getSaleCoupon(priceId) {
  const spec = SALE.coupons[priceId];
  try {
    return await stripe.coupons.retrieve(spec.id);
  } catch (retrieveErr) {
    try {
      return await stripe.coupons.create({
        id: spec.id,
        amount_off: spec.amountOff,
        currency: 'usd',
        duration: 'once',
        name: SALE.name,
      });
    } catch (createErr) {
      if (createErr && createErr.code === 'resource_already_exists') {
        return await stripe.coupons.retrieve(spec.id);
      }
      throw createErr;
    }
  }
}

// ── Fulfillment and pre-order mode ─────────────────────────────────
// Selling live since 2026-11-04: kits are assembled on demand and ship
// within 2 weeks of the order. The team can fill about 100 orders in this
// batch, so once `capOrders` paid orders have come in since `since`, the
// checkout automatically switches to PAID PRE-ORDER wording (charged today,
// ships with the next batch) and preorder.js (which asks GET /api/checkout)
// relabels the site to match. Set capOrders to 0 to disable the cap.
const FULFILLMENT = {
  shipNote: 'Ships within 2 weeks of your order. Free shipping. Full refund any time before it ships.',
  capOrders: 100,
  since: '2026-11-04T00:00:00Z',
};

// enabled: force pre-order mode on regardless of the cap (kits cannot ship).
// paid:    true  = Stripe Checkout runs and the order is a PAID pre-order;
//          false = no checkout; the site collects free reservations instead
//                  (preorder.js + api/preorder.js).
// preorder.js reads the live state from GET /api/checkout, so there is no
// front-end flag to keep in sync any more.
const PREORDER = {
  enabled: false,
  paid: true,
  note: 'You are charged today and your kit ships when the next batch is ready; we will email you the shipping date. Cancel for a full refund any time before it ships.',
};

// Count paid Checkout sessions since the batch started. Cached for a minute
// so a burst of visitors does not hammer the Stripe list endpoint.
let capCache = { at: 0, count: 0 };
async function paidOrdersSinceBatchStart() {
  if (Date.now() - capCache.at < 60 * 1000) return capCache.count;
  const since = Math.floor(new Date(FULFILLMENT.since).getTime() / 1000);
  let count = 0;
  let startingAfter;
  for (let page = 0; page < 10; page++) {
    const params = { created: { gte: since }, limit: 100 };
    if (startingAfter) params.starting_after = startingAfter;
    const res = await stripe.checkout.sessions.list(params);
    for (const sess of res.data) {
      if (sess.payment_status === 'paid' && sess.metadata?.preorder !== 'true') count++;
    }
    if (!res.has_more || count >= FULFILLMENT.capOrders) break;
    startingAfter = res.data[res.data.length - 1].id;
  }
  capCache = { at: Date.now(), count };
  return count;
}

async function preorderActive() {
  if (PREORDER.enabled) return true;
  if (!FULFILLMENT.capOrders) return false;
  try {
    return (await paidOrdersSinceBatchStart()) >= FULFILLMENT.capOrders;
  } catch (err) {
    console.error('Order cap check failed:', err.message);
    return false;
  }
}

// ── Attribution ───────────────────────────────────────────────────
// attribution.js sends the visitor's GA4 client/session ids and campaign
// parameters with the checkout request. They are copied into the session
// metadata (Stripe allows 50 keys, 500 chars each) so api/webhook.js can send
// the real purchase to GA4 against the same visitor and label the order as
// direct, ad-assisted or book-assisted. Unknown keys are dropped.
const ATTRIBUTION_KEYS = ['ga_client_id', 'ga_session_id', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'landing_page', 'referrer', 'checkout_page'];
function cleanAttribution(a) {
  const out = {};
  if (!a || typeof a !== 'object') return out;
  for (const k of ATTRIBUTION_KEYS) {
    const v = a[k];
    if (typeof v === 'string' && v.trim()) out[k] = v.trim().slice(0, 200);
  }
  return out;
}

module.exports = async function handler(req, res) {
  // GET: current selling state for preorder.js (no secrets, cache briefly).
  if (req.method === 'GET') {
    const preorder = await preorderActive();
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).json({ preorder, paid: PREORDER.paid, shipNote: FULFILLMENT.shipNote });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const preorder = await preorderActive();

  if (preorder && !PREORDER.paid) {
    return res.status(409).json({
      preorder: true,
      error: 'Sensa kits are on preorder right now. Reserve yours on the order page; nothing is charged until kits ship.',
    });
  }

  const { priceId, hearAboutUs, promoCode, attribution } = req.body;
  const stripePriceId = PRICE_IDS[priceId];

  if (!stripePriceId) {
    return res.status(400).json({ error: 'Invalid price selection' });
  }

  try {
    // A Checkout session only allows one discount, so a customer promo code
    // replaces the sale coupon. Every code we issue ($49 off) is worth more
    // than the sale discount on any bundle, so the customer always comes out ahead.
    let promo = null;
    if (promoCode && typeof promoCode === 'string' && promoCode.trim()) {
      const found = await stripe.promotionCodes.list({
        code: promoCode.trim().toUpperCase(),
        active: true,
        limit: 1,
      });
      promo = found.data[0] || null;
      if (!promo) {
        return res.status(400).json({ error: 'That code is not valid or has already been used.' });
      }
    }

    const params = {
      mode: 'payment',
      line_items: [{ price: stripePriceId, quantity: 1 }],
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
      metadata: {
        hear_about_us: hearAboutUs || 'not_answered',
        price_key: priceId,
        ...cleanAttribution(attribution),
      },
      success_url: preorder ? 'https://www.sensawellness.org/success?preorder=1' : 'https://www.sensawellness.org/success',
      cancel_url: 'https://www.sensawellness.org/pay-now',
    };

    params.payment_intent_data = { description: 'Sensa at-home inflammation test kit' };
    if (preorder) {
      params.metadata.preorder = 'true';
      params.custom_text = { submit: { message: PREORDER.note } };
    } else {
      params.custom_text = { submit: { message: FULFILLMENT.shipNote } };
    }

    if (promo) {
      params.discounts = [{ promotion_code: promo.id }];
      params.metadata.promo = promo.code;
    } else if (saleActive(priceId)) {
      const coupon = await getSaleCoupon(priceId);
      params.discounts = [{ coupon: coupon.id }];
      params.metadata.promo = coupon.id;
    }

    const session = await stripe.checkout.sessions.create(params);

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
};
