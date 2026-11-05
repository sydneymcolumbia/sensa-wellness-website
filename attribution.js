// Sensa attribution helper.
// Loaded (defer) on the pages that start a Stripe Checkout. On arrival it
// stores the campaign parameters from the URL (utm_*, gclid) for the session,
// and at checkout time window.sensaAttribution() returns those plus the GA4
// client and session ids read from the GA cookies. api/checkout.js copies the
// fields into Stripe session metadata so api/webhook.js can send the real
// purchase to GA4 (Measurement Protocol) against the same visitor, and so the
// order can be labelled direct, ad-assisted, or book-assisted later.
(function () {
    var KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid'];
    var STORE = 'sensa_attrib';
    var MEASUREMENT_ID = 'G-X24JYKBTXB';

    function read() { try { return JSON.parse(sessionStorage.getItem(STORE) || '{}') || {}; } catch (e) { return {}; } }
    function write(o) { try { sessionStorage.setItem(STORE, JSON.stringify(o)); } catch (e) { /* storage blocked */ } }

    // First touch within the browser session wins; a later tagged arrival only
    // fills in fields that are still empty.
    (function capture() {
        var qs;
        try { qs = new URLSearchParams(window.location.search); } catch (e) { return; }
        var cur = read();
        if (!cur.landing_page) {
            cur.landing_page = window.location.pathname;
            if (document.referrer) cur.referrer = document.referrer.slice(0, 200);
        }
        KEYS.forEach(function (k) {
            var v = qs.get(k);
            if (v && !cur[k]) cur[k] = String(v).slice(0, 200);
        });
        write(cur);
    })();

    function cookie(name) {
        var m = document.cookie.match('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)');
        return m ? decodeURIComponent(m[1]) : '';
    }
    // _ga = GA1.1.<random>.<timestamp>; the client id is the last two parts.
    function gaClientId() {
        var v = cookie('_ga');
        if (!v) return '';
        var parts = v.split('.');
        return parts.length >= 4 ? parts.slice(-2).join('.') : '';
    }
    // _ga_<stream> = GS1.1.<session>.<n>... or GS2.1.s<session>$o<n>...
    function gaSessionId() {
        var v = cookie('_ga_' + MEASUREMENT_ID.replace(/^G-/, ''));
        var m = v ? v.match(/^GS\d+\.\d+\.s?(\d+)/) : null;
        return m ? m[1] : '';
    }

    window.sensaAttribution = function () {
        var a = read();
        var out = {};
        KEYS.concat(['landing_page', 'referrer']).forEach(function (k) { if (a[k]) out[k] = a[k]; });
        var cid = gaClientId(); if (cid) out.ga_client_id = cid;
        var sid = gaSessionId(); if (sid) out.ga_session_id = sid;
        out.checkout_page = window.location.pathname;
        return out;
    };
})();
