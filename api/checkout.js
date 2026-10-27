const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRICE_IDS = {
  price_1test:  'price_1TGmnPKrHFkD3MC35eXx5OM5',
  price_3pack:  'price_1TGmoOKrHFkD3MC33tp7m4LU',
  price_4pack:  'price_1TGmyGKrHFkD3MC3MlqR1Z2d',
};

// ── Fall Reset Sale ────────────────────────────────────────────────
// 20% off, applied server-side so the discount is real (the checkout
// total reflects it). Evergreen on purpose: the front end (sale.js)
// runs a self-resetting weekly countdown with no end date, so the
// discount must never expire on its own or the site would advertise
// sale prices while checkout charges full price. To end the promo,
// set enabled to false AND revert the on-page sale copy together.
const SALE = {
  enabled: true,
  couponId: 'fall_reset_2026',     // fixed id so coupon creation is idempotent
  percentOff: 20,
  name: 'Fall Reset Sale',
};

function saleActive() {
  return SALE.enabled;
}

// Retrieve the promo coupon, creating it once if it does not exist yet.
// Uses a fixed coupon id so concurrent cold starts converge on the same
// coupon; a create race (resource_already_exists) falls back to retrieve.
async function getSaleCoupon() {
  try {
    return await stripe.coupons.retrieve(SALE.couponId);
  } catch (retrieveErr) {
    try {
      return await stripe.coupons.create({
        id: SALE.couponId,
        percent_off: SALE.percentOff,
        duration: 'once',
        name: SALE.name,
      });
    } catch (createErr) {
      if (createErr && createErr.code === 'resource_already_exists') {
        return await stripe.coupons.retrieve(SALE.couponId);
      }
      throw createErr;
    }
  }
}

// ── Pre-order mode ─────────────────────────────────────────────────
// enabled: kits ship later than a normal order (copy and alerts say so).
// paid:    true  = Stripe Checkout runs and the order is a PAID pre-order
//                  (charged today, ships when the next batch is ready);
//          false = no checkout; the site collects free reservations
//                  instead (preorder.js + api/preorder.js).
// Flip `enabled` to false here AND PREORDER_MODE in preorder.js to go back
// to normal selling. preorder.js has a matching PAID_PREORDERS flag.
const PREORDER = {
  enabled: true,
  paid: true,
  note: 'This is a pre-order. You are charged today and your kit ships when the next batch is ready; we will email you the shipping date. Cancel for a full refund any time before it ships.',
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (PREORDER.enabled && !PREORDER.paid) {
    return res.status(409).json({
      preorder: true,
      error: 'Sensa kits are on preorder right now. Reserve yours on the order page; nothing is charged until kits ship.',
    });
  }

  const { priceId, hearAboutUs, promoCode } = req.body;
  const stripePriceId = PRICE_IDS[priceId];

  if (!stripePriceId) {
    return res.status(400).json({ error: 'Invalid price selection' });
  }

  try {
    // A Checkout session only allows one discount, so a customer promo code
    // replaces the sale coupon. Every code we issue ($49 off) is worth more
    // than the 20% sale on any bundle, so the customer always comes out ahead.
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
      },
      success_url: PREORDER.enabled ? 'https://www.sensawellness.org/success?preorder=1' : 'https://www.sensawellness.org/success',
      cancel_url: 'https://www.sensawellness.org/pay-now',
    };

    if (PREORDER.enabled) {
      params.metadata.preorder = 'true';
      params.custom_text = { submit: { message: PREORDER.note } };
      params.payment_intent_data = { description: 'Sensa at-home inflammation test kit (pre-order)' };
    }

    if (promo) {
      params.discounts = [{ promotion_code: promo.id }];
      params.metadata.promo = promo.code;
    } else if (saleActive()) {
      const coupon = await getSaleCoupon();
      params.discounts = [{ coupon: coupon.id }];
      params.metadata.promo = SALE.couponId;
    }

    const session = await stripe.checkout.sessions.create(params);

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
};
