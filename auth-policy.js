// Shared front-end password policy for the Sensa admin sign-in (admin.html)
// and the password reset landing page (reset-password.html). Loaded as a
// classic script on both pages so the rules can never drift apart. Exposes
// window.SensaPasswordPolicy.
(function () {
  'use strict';

  var RULES = [
    { id: 'length', label: 'At least 12 characters', test: function (p) { return p.length >= 12; } },
    { id: 'max', label: 'No more than 128 characters', test: function (p) { return p.length <= 128; } },
    { id: 'upper', label: 'An uppercase letter (A-Z)', test: function (p) { return /[A-Z]/.test(p); } },
    { id: 'lower', label: 'A lowercase letter (a-z)', test: function (p) { return /[a-z]/.test(p); } },
    { id: 'digit', label: 'A number (0-9)', test: function (p) { return /[0-9]/.test(p); } },
    { id: 'symbol', label: 'A symbol such as ! ? # or %', test: function (p) { return /[^A-Za-z0-9]/.test(p); } },
    { id: 'repeat', label: 'No character repeated 4 or more times in a row', test: function (p) { return !/(.)\1{3,}/.test(p); } },
    {
      id: 'identity',
      label: 'Does not contain your email name',
      test: function (p, email) {
        var lower = p.toLowerCase();
        var local = String(email || '').split('@')[0].toLowerCase();
        if (local.length >= 4 && lower.indexOf(local) !== -1) return false;
        return true;
      },
    },
  ];

  // Returns the rules the password does not satisfy (empty array = OK).
  function failedRules(password, email) {
    var p = String(password || '');
    return RULES.filter(function (r) { return !r.test(p, email); });
  }

  // Renders a live checklist into a <ul>, marking satisfied rules with
  // class "met". Uses textContent only; no markup from user input.
  function renderRules(listEl, password, email) {
    var p = String(password || '');
    listEl.textContent = '';
    RULES.forEach(function (r) {
      var li = document.createElement('li');
      li.textContent = r.label;
      if (r.test(p, email)) li.className = 'met';
      listEl.appendChild(li);
    });
  }

  // Breach check against the Have I Been Pwned Pwned Passwords range API
  // (k-anonymity model). The password is hashed with SHA-1 in the browser and
  // only the first 5 hex characters of the hash are sent; the full hash and
  // the password itself never leave the device. Resolves true when the
  // password appears in a known breach. Rejects when the check cannot run,
  // so callers decide whether to fail open or closed.
  async function isLeaked(password) {
    var bytes = new TextEncoder().encode(String(password || ''));
    var digest = await crypto.subtle.digest('SHA-1', bytes);
    var hex = Array.from(new Uint8Array(digest))
      .map(function (b) { return b.toString(16).padStart(2, '0'); })
      .join('')
      .toUpperCase();
    var prefix = hex.slice(0, 5);
    var suffix = hex.slice(5);
    var res = await fetch('https://api.pwnedpasswords.com/range/' + prefix, {
      headers: { 'Add-Padding': 'true' },
    });
    if (!res.ok) throw new Error('Pwned Passwords API responded ' + res.status);
    var text = await res.text();
    var lines = text.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var parts = lines[i].trim().split(':');
      // Padding entries carry a count of 0 and must be ignored.
      if (parts[0] === suffix && Number(parts[1]) > 0) return true;
    }
    return false;
  }

  window.SensaPasswordPolicy = {
    RULES: RULES,
    failedRules: failedRules,
    renderRules: renderRules,
    isLeaked: isLeaked,
  };
})();
