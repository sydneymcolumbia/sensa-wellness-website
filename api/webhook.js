const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');

// Where new-order alerts go. Override with ORDER_ALERT_EMAIL in Vercel env.
const ORDER_ALERT_EMAIL = process.env.ORDER_ALERT_EMAIL || 'info@sensawellness.org';
// Resend only delivers from a verified domain. Override once one is verified
// under a different address.
const ORDER_ALERT_FROM = process.env.ORDER_ALERT_FROM || 'Sensa Orders <orders@sensawellness.org>';

async function sendOrderAlert(session) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  let items = '';
  try {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 10 });
    items = lineItems.data.map((li) => `${li.quantity} x ${li.description}`).join(', ');
  } catch (err) {
    items = '(could not load line items)';
  }
  const total = `$${(session.amount_total / 100).toFixed(2)} ${(session.currency || 'usd').toUpperCase()}`;
  const name = session.customer_details?.name || 'Unknown name';
  const email = session.customer_details?.email || 'no email';
  const addr = session.shipping_details?.address || session.customer_details?.address;
  const where = addr ? [addr.city, addr.state, addr.country].filter(Boolean).join(', ') : 'no address';

  const result = await resend.emails.send({
    from: ORDER_ALERT_FROM,
    to: ORDER_ALERT_EMAIL,
    subject: `New Sensa order: ${items} (${total})`,
    text: [
      'New order on sensawellness.org',
      '',
      `Items: ${items}`,
      `Total: ${total}`,
      `Customer: ${name} <${email}>`,
      `Ships to: ${where}`,
      '',
      `Stripe: https://dashboard.stripe.com/payments/${session.payment_intent || ''}`,
    ].join('\n'),
  });
  if (result?.error) throw new Error(result.error.message);
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

module.exports = async function handler(req, res) {
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

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('Order completed:', {
      sessionId: session.id,
      customerEmail: session.customer_details?.email,
      amountTotal: session.amount_total,
      currency: session.currency,
      paymentStatus: session.payment_status,
    });
    // Alert failures must never make Stripe retry the webhook.
    try {
      await sendOrderAlert(session);
    } catch (err) {
      console.error('Order alert email failed:', err.message);
    }
  }

  return res.status(200).json({ received: true });
};
