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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { priceId, hearAboutUs } = req.body;
  const stripePriceId = PRICE_IDS[priceId];

  if (!stripePriceId) {
    return res.status(400).json({ error: 'Invalid price selection' });
  }

  try {
    const params = {
      mode: 'payment',
      line_items: [{ price: stripePriceId, quantity: 1 }],
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
      metadata: {
        hear_about_us: hearAboutUs || 'not_answered',
      },
      success_url: 'https://sensawellness.org/success',
      cancel_url: 'https://sensawellness.org/pay-now',
    };

    if (saleActive()) {
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
