// Silent bot filter for signup forms (waitlist + newsletter).
// Drops submissions that fill the hidden honeypot field or that fire
// with no human interaction almost immediately after page load, while
// showing the normal success UI so automated tools learn nothing.
(function () {
    var loadedAt = Date.now();
    var interacted = false;
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (evt) {
        document.addEventListener(evt, function () { interacted = true; }, { once: true, passive: true, capture: true });
    });

    var GUARDED = ['waitlistForm', 'newsletterForm', 'postNewsletterForm'];

    function looksAutomated(form) {
        var hp = form.querySelector('input.hp-field');
        if (hp && hp.value !== '') return true;
        if (!interacted && Date.now() - loadedAt < 2500) return true;
        return false;
    }

    document.addEventListener('submit', function (e) {
        var form = e.target;
        if (!form || GUARDED.indexOf(form.id) === -1) return;
        if (!looksAutomated(form)) return;
        e.preventDefault();
        e.stopPropagation();
        var btn = form.querySelector('button[type="submit"]');
        if (btn) {
            var original = btn.textContent;
            btn.textContent = form.id === 'postNewsletterForm' || form.id === 'newsletterForm' ? 'Subscribed!' : "You're on the list!";
            btn.disabled = true;
            setTimeout(function () { btn.textContent = original; btn.disabled = false; }, 3000);
        }
        form.reset();
    }, true);
})();
