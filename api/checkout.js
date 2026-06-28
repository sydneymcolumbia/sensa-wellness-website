const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRICE_IDS = {
  price_1test:  'price_1TGmnPKrHFkD3MC35eXx5OM5',
  price_3pack:  'price_1TGmoOKrHFkD3MC33tp7m4LU',
  price_4pack:  'price_1TGmyGKrHFkD3MC3MlqR1Z2d',
};

// ── Summer Reset Sale ──────────────────────────────────────────────
// 20% off, applied server-side so the discount is real (the checkout
// total reflects it) and cannot be claimed after the window closes.
// To change or end the promo, edit these constants. Set SALE_ENABLED
// to false to switch the site back to full price without a code change
// to the front end (the on-page sale copy can then be reverted).
const SALE = {
  enabled: true,
  couponId: 'summer_reset_2026',   // fixed id so coupon creation is idempotent
  percentOff: 20,
  name: 'Summer Reset Sale',
  // Active through Aug 31, 2026 (08:00 UTC ≈ end of Aug 31 in US Pacific).
  startsAt: Date.parse('2026-06-01T00:00:00Z'),
  endsAt:   Date.parse('2026-09-01T08:00:00Z'),
};

function saleActive() {
  if (!SALE.enabled) return false;
  const now = Date.now();
  return now >= SALE.startsAt && now < SALE.endsAt;
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
      success_url: 'https://sensawellness.org/success.html',
      cancel_url: 'https://sensawellness.org/pay-now.html',
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
