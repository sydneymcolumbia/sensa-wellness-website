// Creates one single-use Stripe promotion code per customer, all backed by a
// shared $49-off coupon (the price of one test kit at full price). Run with:
//
//   STRIPE_SECRET_KEY=sk_... node scripts/create-free-kit-codes.js customers.json
//
// customers.json: [{ "name": "Jane Doe", "email": "jane@example.com" }, ...]
//
// Idempotent: a customer email that already has a code on this coupon gets
// their existing code printed instead of a duplicate.

const fs = require('fs');
const crypto = require('crypto');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const COUPON_ID = 'free_kit_2026';
const REASON = 'shipping_delay_apology_2026_09';

async function getCoupon() {
  try {
    return await stripe.coupons.retrieve(COUPON_ID);
  } catch (err) {
    try {
      return await stripe.coupons.create({
        id: COUPON_ID,
        amount_off: 4900,
        currency: 'usd',
        duration: 'once',
        name: 'Free Sensa Test Kit',
      });
    } catch (createErr) {
      if (createErr && createErr.code === 'resource_already_exists') {
        return await stripe.coupons.retrieve(COUPON_ID);
      }
      throw createErr;
    }
  }
}

// Unambiguous alphabet: no 0/O, 1/I/L
function randomCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  const bytes = crypto.randomBytes(6);
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return 'SENSA-' + out;
}

async function existingCodeFor(email) {
  const codes = await stripe.promotionCodes.list({ coupon: COUPON_ID, limit: 100 });
  return codes.data.find(
    (pc) => pc.metadata && pc.metadata.customer_email === email.toLowerCase()
  );
}

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set.');
    process.exit(1);
  }
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/create-free-kit-codes.js customers.json');
    process.exit(1);
  }
  const customers = JSON.parse(fs.readFileSync(file, 'utf8'));

  await getCoupon();
  const results = [];

  for (const c of customers) {
    const email = c.email.trim().toLowerCase();
    const existing = await existingCodeFor(email);
    if (existing) {
      results.push({ name: c.name, email, code: existing.code, status: 'already existed' });
      continue;
    }
    const pc = await stripe.promotionCodes.create({
      coupon: COUPON_ID,
      code: randomCode(),
      max_redemptions: 1,
      metadata: {
        customer_email: email,
        customer_name: c.name,
        reason: REASON,
      },
    });
    results.push({ name: c.name, email, code: pc.code, status: 'created' });
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
