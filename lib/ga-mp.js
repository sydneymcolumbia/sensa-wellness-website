const crypto = require('crypto');

// GA4 Measurement Protocol sender (server-side events).
// Needs GA_API_SECRET: GA4 Admin > Data streams > (web stream) > Measurement
// Protocol API secrets > Create. Without it events are skipped, never thrown.
// Pass the visitor's GA client id (from the _ga cookie, captured by
// attribution.js and stored in Stripe metadata) so the event lands on the
// same user and session as the ad click; otherwise a random client id is used
// and the event counts but is unattributed.

const MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID || 'G-X24JYKBTXB';

function randomClientId() {
  return `${crypto.randomInt(100000000, 2147483647)}.${Math.floor(Date.now() / 1000)}`;
}

// GA4 rejects nested booleans/objects outside `items`; strings max 100 chars.
function cleanParams(params) {
  const out = {};
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null || v === '') continue;
    if (k === 'items' && Array.isArray(v)) { out.items = v; continue; }
    if (typeof v === 'boolean') out[k] = v ? 'true' : 'false';
    else if (typeof v === 'number') out[k] = v;
    else out[k] = String(v).slice(0, 100);
  }
  return out;
}

async function send({ clientId, sessionId, events }) {
  const names = (events || []).map((e) => e.name);
  const secret = process.env.GA_API_SECRET;
  if (!secret) {
    console.warn('GA_API_SECRET not set; skipped GA events:', names.join(', '));
    return { sent: false, reason: 'no_secret', events: names };
  }
  const body = {
    client_id: clientId || randomClientId(),
    non_personalized_ads: true,
    events: (events || []).map((e) => ({
      name: e.name,
      params: cleanParams({
        engagement_time_msec: 1,
        ...(sessionId ? { session_id: sessionId } : {}),
        ...e.params,
      }),
    })),
  };
  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(MEASUREMENT_ID)}&api_secret=${encodeURIComponent(secret)}`;
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { sent: r.status < 300, status: r.status, attributed: Boolean(clientId), events: names };
  } catch (err) {
    console.error('GA Measurement Protocol send failed:', err.message);
    return { sent: false, reason: err.message, events: names };
  }
}

module.exports = { send, randomClientId, MEASUREMENT_ID };
