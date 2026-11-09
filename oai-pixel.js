// OpenAI (ChatGPT) Ads measurement pixel for sensawellness.org.
// Loaded async from the <head> of every public page. The SDK comes from
// bzrcdn.openai.com and reports to bzr.openai.com; both origins are allowed in
// the Content-Security-Policy in vercel.json. Admin, app, and account pages do
// not load this file.
//
// Events sent from pages:
//   checkout_started  handleCheckout() on index, kit, pay-now, weight-loss
//   order_created     success.html, event_id = Stripe Checkout session id so a
//                     later Conversions API send from api/webhook.js dedups
// Pixel ID: TyME4afvvPqssCXV57M4to (Ads Manager > Conversions > Data sources).
(function (w, d, s, u) {
    if (w.oaiq) return;
    var q = function () { q.q.push(arguments); };
    q.q = [];
    w.oaiq = q;
    var js = d.createElement(s);
    js.async = true;
    js.src = u;
    var f = d.getElementsByTagName(s)[0];
    f.parentNode.insertBefore(js, f);
})(window, document, 'script', 'https://bzrcdn.openai.com/sdk/oaiq.min.js');

oaiq('init', { pixelId: 'TyME4afvvPqssCXV57M4to' });

// Helpers used by the checkout pages and success.html. Amounts are in cents.
window.sensaOai = {
    checkoutStarted: function (priceId, dollars) {
        var cents = Math.round((Number(dollars) || 0) * 100);
        try {
            sessionStorage.setItem('sensa_pending_order', JSON.stringify({ kit: priceId, amount: cents, currency: 'USD' }));
        } catch (e) { /* storage blocked */ }
        if (typeof oaiq === 'function') {
            oaiq('measure', 'checkout_started', { type: 'contents', amount: cents, currency: 'USD' });
        }
    },
    orderCreated: function (sessionId) {
        var pending = {};
        try { pending = JSON.parse(sessionStorage.getItem('sensa_pending_order') || '{}') || {}; } catch (e) { pending = {}; }
        var key = 'sensa_oai_order_' + (sessionId || 'unknown');
        try { if (sessionStorage.getItem(key)) return; } catch (e) { /* storage blocked */ }
        var data = { type: 'contents', currency: pending.currency || 'USD' };
        if (pending.amount) data.amount = pending.amount;
        var opts = sessionId ? { event_id: sessionId } : undefined;
        if (typeof oaiq === 'function') oaiq('measure', 'order_created', data, opts);
        try {
            sessionStorage.setItem(key, '1');
            sessionStorage.removeItem('sensa_pending_order');
        } catch (e) { /* storage blocked */ }
    }
};
