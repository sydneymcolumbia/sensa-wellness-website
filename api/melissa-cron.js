const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const PRICE_NAMES = {
  'price_1TGmnPKrHFkD3MC35eXx5OM5': '1-Test Kit',
  'price_1TGmoOKrHFkD3MC33tp7m4LU': '3-Test Pack',
  'price_1TGmyGKrHFkD3MC3MlqR1Z2d': '4-Test Pack',
};

module.exports = async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = Math.floor(Date.now() / 1000);
  const sixDaysAgo = now - 6 * 24 * 60 * 60;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60;

  const sessions = await stripe.checkout.sessions.list({
    created: { gte: sevenDaysAgo, lte: sixDaysAgo },
    status: 'complete',
    limit: 100,
  });

  let sent = 0;
  let skipped = 0;

  for (const session of sessions.data) {
    if (session.metadata?.melissa_email_sent === 'true') {
      skipped++;
      continue;
    }

    const email = session.customer_details?.email;
    const fullName = session.customer_details?.name || '';
    const firstName = fullName.split(' ')[0] || 'there';

    if (!email) {
      skipped++;
      continue;
    }

    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 10 });
    const items = lineItems.data.map(item => {
      return PRICE_NAMES[item.price?.id] || item.description || 'Sensa Kit';
    }).join(', ');

    const orderDate = new Date(session.created * 1000).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });

    const token = jwt.sign(
      { name: firstName, email, sessionId: session.id, items, orderDate },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    const chatUrl = `https://sensawellness.org/chat.html?t=${token}`;

    await resend.emails.send({
      from: 'Melissa at Sensa <onboarding@resend.dev>',
      to: email,
      subject: 'A quick hello from Melissa at Sensa',
      html: `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a2e;">
          <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:36px 32px;border-radius:12px 12px 0 0;text-align:center;">
            <p style="color:#c9a84c;font-size:0.8rem;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 10px;">Sensa Wellness</p>
            <h1 style="color:#fff;font-size:1.4rem;margin:0;font-weight:600;">A personal hello from Melissa</h1>
          </div>
          <div style="background:#f9f9f9;padding:36px 32px;border-radius:0 0 12px 12px;">
            <p style="margin:0 0 18px;font-size:1rem;line-height:1.75;color:#222;">Hi ${firstName},</p>
            <p style="margin:0 0 18px;font-size:1rem;line-height:1.75;color:#222;">My name is Melissa, and I'm on the Sensa customer care team. I'm reaching out because your order recently arrived and I wanted to personally check in.</p>
            <p style="margin:0 0 18px;font-size:1rem;line-height:1.75;color:#222;">How is everything going? Did the kit arrive in good shape? Do you have any questions about getting started with your ${items}?</p>
            <p style="margin:0 0 32px;font-size:1rem;line-height:1.75;color:#222;">I'm here and happy to help with anything at all.</p>
            <div style="text-align:center;margin-bottom:32px;">
              <a href="${chatUrl}" style="background:linear-gradient(135deg,#c9a84c,#e8c96d);color:#1a1a2e;padding:15px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:1rem;display:inline-block;">Chat with Melissa</a>
            </div>
            <p style="margin:0;font-size:0.95rem;line-height:1.7;color:#444;">Warmly,<br><strong>Melissa</strong><br><span style="color:#999;font-size:0.85rem;">Sensa Customer Care</span></p>
            <hr style="border:none;border-top:1px solid #eee;margin:28px 0 20px;">
            <p style="font-size:0.72rem;color:#bbb;margin:0;line-height:1.6;">Sensa is a general wellness product not intended to diagnose, treat, or prevent any disease. You are receiving this because you placed an order at sensawellness.org.<br>&copy; 2026 Sensa Wellness. All Rights Reserved.</p>
          </div>
        </div>
      `,
    });

    await stripe.checkout.sessions.update(session.id, {
      metadata: { ...session.metadata, melissa_email_sent: 'true' },
    });

    sent++;
  }

  return res.status(200).json({ sent, skipped });
};
