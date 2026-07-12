/* ============================================================
   Summer Reset Sale — self-resetting weekly countdown.

   The sale runs in rolling 7-day cycles. When a cycle's clock
   hits zero it automatically rolls forward to the next week,
   with no manual edits and no page reload required. Every
   countdown on the site (homepage promo bar, pay-now popup,
   weight-loss pricing) reads from this one file.

   To change the cadence, edit SALE_ANCHOR (when the cycles are
   measured from) or SALE_PERIOD_DAYS (how long each cycle lasts).
   A single countdown can still be pinned to a fixed end date by
   putting data-sale-end="YYYY-MM-DDTHH:MM:SS" on its element.

   Markup contract for each countdown:
     <span data-sale-countdown>
       <... data-unit="days">00</...>
       <... data-unit="hours">00</...>
       <... data-unit="mins">00</...>
       <... data-unit="secs">00</...>
     </span>
   ============================================================ */
(function () {
    // Cycles are measured from this anchor. Keeping it fixed means
    // every visitor sees the same countdown, and the math below rolls
    // the deadline forward one week at a time forever.
    var SALE_ANCHOR = new Date('2026-07-12T00:00:00').getTime();
    var SALE_PERIOD_DAYS = 7;
    var PERIOD_MS = SALE_PERIOD_DAYS * 24 * 60 * 60 * 1000;

    // The end of the current cycle: the next anchor + n*period that is
    // still in the future. Recomputed continuously so it self-resets.
    function currentSaleEnd() {
        var elapsed = Date.now() - SALE_ANCHOR;
        var cycles = Math.floor(elapsed / PERIOD_MS) + 1;
        return SALE_ANCHOR + cycles * PERIOD_MS;
    }

    // Kept for compatibility; reflects the live cycle end as an ISO string.
    Object.defineProperty(window, 'SENSA_SALE_END', {
        get: function () { return new Date(currentSaleEnd()).toISOString(); },
        configurable: true,
    });

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    function initCountdown(root) {
        // A per-element data-sale-end still pins that clock to a fixed date;
        // otherwise the clock follows the rolling weekly cycle.
        var fixedAttr = root.getAttribute('data-sale-end');
        var fixedEnd = fixedAttr ? new Date(fixedAttr).getTime() : null;

        var days = root.querySelector('[data-unit="days"]');
        var hours = root.querySelector('[data-unit="hours"]');
        var mins = root.querySelector('[data-unit="mins"]');
        var secs = root.querySelector('[data-unit="secs"]');

        function tick() {
            var endTime = fixedEnd !== null ? fixedEnd : currentSaleEnd();
            var diff = endTime - Date.now();
            if (diff < 0) diff = 0;
            var s = Math.floor(diff / 1000);
            if (days) days.textContent = pad(Math.floor(s / 86400));
            if (hours) hours.textContent = pad(Math.floor((s % 86400) / 3600));
            if (mins) mins.textContent = pad(Math.floor((s % 3600) / 60));
            if (secs) secs.textContent = pad(s % 60);
        }

        tick();
        setInterval(tick, 1000);
    }

    function initAll() {
        var nodes = document.querySelectorAll('[data-sale-countdown]');
        for (var i = 0; i < nodes.length; i++) initCountdown(nodes[i]);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }
})();
