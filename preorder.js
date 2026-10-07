// Preorder mode for sensawellness.org.
//
// While kits cannot ship, every "Buy" action on the site becomes a preorder
// reservation: the visitor leaves name, email and kit choice, nothing is
// charged, and the team is emailed. Loaded with `defer` on index.html and
// pay-now.html AFTER the inline checkout code so it can wrap handleCheckout().
//
// To go back to normal selling, set PREORDER_MODE to false here AND in
// api/checkout.js (the server refuses Stripe checkouts while preorder mode
// is on, so the two flags must flip together).
(function () {
  'use strict';

  var PREORDER_MODE = true;
  window.PREORDER_MODE = PREORDER_MODE;
  if (!PREORDER_MODE) return;

  var KITS = {
    price_1test: '1 Test Kit',
    price_3pack: '3-Pack Bundle',
    price_4pack: '4-Pack Bundle',
  };

  var css = '' +
    '.po-overlay{position:fixed;inset:0;z-index:5000;display:flex;align-items:center;justify-content:center;padding:1.2rem;background:rgba(16,10,60,.55);backdrop-filter:blur(6px);opacity:0;visibility:hidden;transition:opacity .25s ease,visibility .25s ease}' +
    '.po-overlay.is-open{opacity:1;visibility:visible}' +
    '.po-modal{position:relative;width:100%;max-width:480px;background:#fff;border-radius:22px;box-shadow:0 30px 80px rgba(16,10,60,.4);padding:2.2rem 1.8rem 1.8rem;max-height:92vh;overflow-y:auto;font-family:"Nunito",sans-serif;color:#1a1a2e;text-align:left}' +
    '.po-close{position:absolute;top:.8rem;right:.9rem;background:none;border:none;font-size:1.7rem;line-height:1;color:#6b6b7b;cursor:pointer;padding:.2rem}' +
    '.po-close:hover{color:#1a1a2e}' +
    '.po-badge{display:inline-block;background:linear-gradient(90deg,#f59d06,#fac234);color:#1a1a2e;font-weight:700;font-size:.66rem;letter-spacing:1px;text-transform:uppercase;padding:.32rem .95rem;border-radius:20px;margin-bottom:.8rem}' +
    '.po-modal h2{font-family:"Nunito",sans-serif;font-size:1.6rem;font-weight:800;letter-spacing:-.03em;color:#1800ad;margin:0 0 .4rem}' +
    '.po-sub{color:#4a4a5a;font-size:.95rem;line-height:1.5;margin:0 0 .6rem}' +
    '.po-label{display:block;font-size:.76rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#4a4a5a;margin:.85rem 0 .3rem}' +
    '.po-input{width:100%;padding:.7rem .9rem;border:1.5px solid #e8e5ff;border-radius:10px;font-family:"Quicksand",sans-serif;font-size:.95rem;font-weight:600;color:#1a1a2e;background:#fff;box-sizing:border-box}' +
    '.po-input:focus{outline:none;border-color:#7267f2}' +
    '.po-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}' +
    '.po-submit{width:100%;margin-top:1.1rem;padding:.9rem;background:#1800ad;color:#fff;border:none;border-radius:10px;font-family:"Nunito",sans-serif;font-weight:800;font-size:1rem;cursor:pointer;transition:background .2s}' +
    '.po-submit:hover{background:#2a10c0}.po-submit:disabled{opacity:.6;cursor:wait}' +
    '.po-error{display:none;color:#c2401f;font-size:.9rem;margin:.7rem 0 0;text-align:center}' +
    '.po-done h3{font-family:"Nunito",sans-serif;color:#1800ad;margin:.4rem 0 .5rem;font-size:1.3rem}' +
    '.po-done p{color:#4a4a5a;line-height:1.5;margin:0 0 .4rem}' +
    '.preorder-notice{margin:1rem auto 0;max-width:640px;padding:.8rem 1rem;border-radius:12px;background:rgba(250,194,52,.18);border:1px solid rgba(245,157,6,.5);font-size:.95rem;line-height:1.5}';

  function kitOptions(selected) {
    return Object.keys(KITS).map(function (id) {
      return '<option value="' + id + '"' + (id === selected ? ' selected' : '') + '>' + KITS[id] + '</option>';
    }).join('');
  }

  function buildModal() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="po-overlay" id="poOverlay" role="dialog" aria-modal="true" aria-labelledby="poTitle">' +
        '<div class="po-modal">' +
          '<button type="button" class="po-close" id="poClose" aria-label="Close">&times;</button>' +
          '<span class="po-badge">Preorder</span>' +
          '<h2 id="poTitle">Reserve your Sensa kit</h2>' +
          '<p class="po-sub">Kits are temporarily out of stock. Leave your details and we will email you as soon as yours is ready to ship. No payment today.</p>' +
          '<form id="poForm" novalidate>' +
            '<label class="po-label" for="poName">Full name</label>' +
            '<input class="po-input" id="poName" type="text" autocomplete="name" maxlength="80" required>' +
            '<label class="po-label" for="poEmail">Email</label>' +
            '<input class="po-input" id="poEmail" type="email" autocomplete="email" maxlength="254" required>' +
            '<label class="po-label" for="poKit">Kit</label>' +
            '<select class="po-input" id="poKit">' + kitOptions('price_3pack') + '</select>' +
            '<label class="po-label" for="poQty">Quantity</label>' +
            '<select class="po-input" id="poQty"><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select>' +
            '<label class="po-label" for="poNote">Anything we should know? (optional)</label>' +
            '<textarea class="po-input" id="poNote" rows="2" maxlength="500"></textarea>' +
            '<input type="text" name="website" class="po-hp" id="poWebsite" tabindex="-1" autocomplete="off" aria-hidden="true">' +
            '<button type="submit" class="po-submit" id="poSubmit">Reserve my kit</button>' +
            '<p class="po-error" id="poError" role="alert"></p>' +
          '</form>' +
          '<div class="po-done" id="poDone" hidden>' +
            '<h3>You are on the list.</h3>' +
            '<p>Thank you. We will email you the moment your kit is ready to ship. Nothing has been charged.</p>' +
            '<button type="button" class="po-submit" id="poDoneClose">Done</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap.firstChild);
  }

  var $ = function (id) { return document.getElementById(id); };
  var lastFocus = null;

  function openPreorder(priceId) {
    if (!$('poOverlay')) buildModal();
    lastFocus = document.activeElement;
    if (KITS[priceId]) $('poKit').value = priceId;
    $('poForm').hidden = false;
    $('poDone').hidden = true;
    $('poError').style.display = 'none';
    $('poOverlay').classList.add('is-open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { $('poName').focus(); }, 60);
    if (typeof gtag === 'function') gtag('event', 'preorder_open', { kit: priceId || 'unspecified' });
  }

  function closePreorder() {
    var o = $('poOverlay');
    if (!o) return;
    o.classList.remove('is-open');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function showError(text) {
    var el = $('poError');
    el.textContent = text;
    el.style.display = 'block';
  }

  function submitPreorder(e) {
    e.preventDefault();
    var name = $('poName').value.trim();
    var email = $('poEmail').value.trim();
    var kit = $('poKit').value;
    $('poError').style.display = 'none';
    if (!name) return showError('Please add your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('Please enter a valid email address.');
    var btn = $('poSubmit');
    btn.disabled = true;
    btn.textContent = 'Reserving...';
    fetch('/api/preorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        email: email,
        kit: kit,
        quantity: Number($('poQty').value) || 1,
        note: $('poNote').value.trim(),
        website: $('poWebsite').value,
        page: location.pathname,
      }),
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok) throw new Error(data.error || 'Could not save your preorder. Please try again.');
          return data;
        });
      })
      .then(function () {
        $('poForm').hidden = true;
        $('poDone').hidden = false;
        $('poDoneClose').focus();
        if (typeof gtag === 'function') gtag('event', 'preorder', { kit: kit });
      })
      .catch(function (err) {
        showError(err.message);
      })
      .then(function () {
        btn.disabled = false;
        btn.textContent = 'Reserve my kit';
      });
  }

  // Turn every purchase control into a preorder control.
  function relabel() {
    document.querySelectorAll('button[onclick*="handleCheckout"]').forEach(function (b) {
      var t = b.textContent.trim();
      if (/^Buy Now/i.test(t)) b.textContent = t.replace(/^Buy Now/i, 'Preorder');
      else if (/^Buy\b/i.test(t)) b.textContent = t.replace(/^Buy\b/i, 'Preorder');
      else b.textContent = 'Preorder ' + t;
    });
    document.querySelectorAll('a[href="#pricing"], a[href="/pay-now"], a[href="/pay-now#waitlist"]').forEach(function (a) {
      if (/^Buy Now$/i.test(a.textContent.trim())) a.textContent = 'Preorder';
    });
  }

  function addNotices() {
    document.querySelectorAll('#pricing .section-header, section.waitlist .section-header, section#waitlist .section-header').forEach(function (h) {
      if (h.querySelector('.preorder-notice')) return;
      var p = document.createElement('p');
      p.className = 'preorder-notice';
      p.innerHTML = '<strong>Preorders open.</strong> Kits are temporarily out of stock. Reserve yours now, pay nothing today, and we will email you the moment your kit is ready to ship.';
      h.appendChild(p);
    });
  }

  function wire() {
    document.addEventListener('click', function (e) {
      if (e.target.id === 'poClose' || e.target.id === 'poDoneClose' || e.target.id === 'poOverlay') closePreorder();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePreorder();
    });
    document.addEventListener('submit', function (e) {
      if (e.target && e.target.id === 'poForm') submitPreorder(e);
    });
  }

  // Replace the Stripe handler. The original stays reachable for debugging.
  window._stripeCheckout = window.handleCheckout;
  window.handleCheckout = function (priceId) { openPreorder(priceId); };
  window.openPreorder = openPreorder;

  function init() {
    relabel();
    addNotices();
    wire();
    if (location.hash === '#preorder') openPreorder('price_3pack');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
