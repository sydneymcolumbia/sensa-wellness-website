/* ============================================================
   Summer Reset Sale — single source of truth for the end date.

   To change when the sale ends, edit SALE_END below. Every
   countdown clock on the site (homepage promo bar, pay-now
   popup, weight-loss pricing) reads from this one value.

   Markup contract for each countdown:
     <span data-sale-countdown>
       <... data-unit="days">00</...>
       <... data-unit="hours">00</...>
       <... data-unit="mins">00</...>
       <... data-unit="secs">00</...>
     </span>
   ============================================================ */
(function () {
    var SALE_END = '2026-07-06T23:59:59';
    window.SENSA_SALE_END = SALE_END;

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    function initCountdown(root) {
        var endTime = new Date(root.getAttribute('data-sale-end') || SALE_END).getTime();
        var days = root.querySelector('[data-unit="days"]');
        var hours = root.querySelector('[data-unit="hours"]');
        var mins = root.querySelector('[data-unit="mins"]');
        var secs = root.querySelector('[data-unit="secs"]');
        function tick() {
            var diff = endTime - Date.now();
            if (diff <= 0) {
                if (days) days.textContent = '00';
                if (hours) hours.textContent = '00';
                if (mins) mins.textContent = '00';
                if (secs) secs.textContent = '00';
                clearInterval(timer);
                return;
            }
            var s = Math.floor(diff / 1000);
            if (days) days.textContent = pad(Math.floor(s / 86400));
            if (hours) hours.textContent = pad(Math.floor((s % 86400) / 3600));
            if (mins) mins.textContent = pad(Math.floor((s % 3600) / 60));
            if (secs) secs.textContent = pad(s % 60);
        }
        tick();
        var timer = setInterval(tick, 1000);
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
