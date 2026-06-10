/* ============================================================
   SENSA FX — interactive visual effects engine
   Pairs with the FX layer in theme.css. Every effect respects
   prefers-reduced-motion and degrades gracefully on touch.
   ============================================================ */

(function () {
    'use strict';

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

    function brandColor(name, fallback) {
        var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return v || fallback;
    }

    function hexToRgb(hex) {
        var m = hex.replace('#', '');
        if (m.length === 3) m = m.replace(/./g, function (c) { return c + c; });
        var n = parseInt(m, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    /* ---------- Aurora glow ---------- */

    function initAurora() {
        ['.hero', '.blog-hero', '.post-header-section'].forEach(function (sel) {
            var host = document.querySelector(sel);
            if (!host || host.querySelector('.fx-aurora')) return;
            var wrap = document.createElement('div');
            wrap.className = 'fx-aurora';
            wrap.setAttribute('aria-hidden', 'true');
            for (var i = 1; i <= 3; i++) {
                var s = document.createElement('span');
                s.className = 'fx-a' + i;
                wrap.appendChild(s);
            }
            host.prepend(wrap);
        });
    }

    /* ---------- Cursor spotlight + border glow ---------- */

    var SPOT_SELECTOR = '.card, .press-card, .blog-card, .pricing-card, ' +
        '.featured-card, .condition-item, .related-card';

    function initSpotlight() {
        document.querySelectorAll(SPOT_SELECTOR).forEach(function (el) {
            el.classList.add('fx-spot');
            el.addEventListener('pointermove', function (e) {
                var r = el.getBoundingClientRect();
                el.style.setProperty('--fx-x', (e.clientX - r.left).toFixed(1) + 'px');
                el.style.setProperty('--fx-y', (e.clientY - r.top).toFixed(1) + 'px');
            });
            el.addEventListener('pointerenter', function () {
                el.style.setProperty('--fx-o', '1');
            });
            el.addEventListener('pointerleave', function () {
                el.style.setProperty('--fx-o', '0');
            });
        });
    }

    /* ---------- 3D tilt (rAF-lerped for spring feel) ---------- */

    function initTilt() {
        var els = document.querySelectorAll(
            '.card, .press-card, .blog-card, .pricing-card:not(.featured)');
        els.forEach(function (el) {
            el.classList.add('fx-tilt');
            var tRX = 0, tRY = 0, tTY = 0, cRX = 0, cRY = 0, cTY = 0, raf = null, over = false;

            function settled() {
                return Math.abs(tRX - cRX) < 0.01 && Math.abs(tRY - cRY) < 0.01 &&
                       Math.abs(tTY - cTY) < 0.05;
            }

            function loop() {
                cRX += (tRX - cRX) * 0.12;
                cRY += (tRY - cRY) * 0.12;
                cTY += (tTY - cTY) * 0.12;
                el.style.setProperty('--fx-rx', cRX.toFixed(3) + 'deg');
                el.style.setProperty('--fx-ry', cRY.toFixed(3) + 'deg');
                el.style.setProperty('--fx-ty', cTY.toFixed(2) + 'px');
                raf = (over || !settled()) ? requestAnimationFrame(loop) : null;
            }

            el.addEventListener('pointerenter', function () {
                over = true;
                tTY = -4;
                if (!raf) raf = requestAnimationFrame(loop);
            });
            el.addEventListener('pointermove', function (e) {
                var r = el.getBoundingClientRect();
                var px = (e.clientX - r.left) / r.width - 0.5;
                var py = (e.clientY - r.top) / r.height - 0.5;
                tRY = px * 6;
                tRX = -py * 5;
            });
            el.addEventListener('pointerleave', function () {
                over = false;
                tRX = tRY = tTY = 0;
                if (!raf) raf = requestAnimationFrame(loop);
            });
        });
    }

    /* ---------- Magnetic buttons ---------- */

    function initMagnetic() {
        document.querySelectorAll('.btn').forEach(function (el) {
            var tx = 0, ty = 0, cx = 0, cy = 0, raf = null, over = false;

            function loop() {
                cx += (tx - cx) * 0.18;
                cy += (ty - cy) * 0.18;
                el.style.transform = 'translate(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px)';
                if (over || Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) {
                    raf = requestAnimationFrame(loop);
                } else {
                    raf = null;
                    if (!over) el.style.transform = '';
                }
            }

            el.addEventListener('pointerenter', function () {
                over = true;
                if (!raf) raf = requestAnimationFrame(loop);
            });
            el.addEventListener('pointermove', function (e) {
                var r = el.getBoundingClientRect();
                tx = clamp((e.clientX - (r.left + r.width / 2)) * 0.22, -7, 7);
                ty = clamp((e.clientY - (r.top + r.height / 2)) * 0.3, -5, 5) - 1;
            });
            el.addEventListener('pointerleave', function () {
                over = false;
                tx = ty = 0;
                if (!raf) raf = requestAnimationFrame(loop);
            });
        });
    }

    /* ---------- Count-up hero stats ---------- */

    function initCounters() {
        var els = document.querySelectorAll('.hero-stat-number');
        if (!els.length || !('IntersectionObserver' in window)) return;
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                io.unobserve(entry.target);
                var el = entry.target;
                var text = el.textContent;
                var m = text.match(/([\d.]+)/);
                if (!m) return;
                var target = parseFloat(m[1]);
                var before = text.slice(0, m.index);
                var after = text.slice(m.index + m[1].length);
                var decimals = (m[1].split('.')[1] || '').length;
                var t0 = performance.now(), duration = 1400;
                (function tick(now) {
                    var p = clamp((now - t0) / duration, 0, 1);
                    var eased = 1 - Math.pow(2, -10 * p); // easeOutExpo
                    el.textContent = before + (target * eased).toFixed(decimals) + after;
                    if (p < 1) requestAnimationFrame(tick);
                    else el.textContent = text;
                })(t0);
            });
        }, { threshold: 0.6 });
        els.forEach(function (el) { io.observe(el); });
    }

    /* ---------- Hero bokeh particle field ---------- */

    function initParticles() {
        var hero = document.querySelector('.hero');
        if (!hero) return;

        var canvas = document.createElement('canvas');
        canvas.className = 'fx-particles';
        canvas.setAttribute('aria-hidden', 'true');
        var aurora = hero.querySelector('.fx-aurora');
        if (aurora) aurora.after(canvas); else hero.prepend(canvas);

        var ctx = canvas.getContext('2d');
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = 0, h = 0, particles = [], running = false, visible = true, raf = null;
        var mouseX = 0, smoothMouseX = 0;

        var palette = [
            brandColor('--accent-purple', '#7267f2'),
            brandColor('--accent-blue', '#41a6f0'),
            brandColor('--accent-gold', '#fac234'),
            brandColor('--accent-coral', '#e85a39')
        ];

        // Pre-render each color as a soft radial sprite — far cheaper
        // than per-frame gradient fills or canvas blur filters.
        var sprites = palette.map(function (hex) {
            var rgb = hexToRgb(hex);
            var off = document.createElement('canvas');
            off.width = off.height = 128;
            var g = off.getContext('2d');
            var grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
            grad.addColorStop(0, 'rgba(' + rgb.join(',') + ',0.16)');
            grad.addColorStop(0.55, 'rgba(' + rgb.join(',') + ',0.07)');
            grad.addColorStop(1, 'rgba(' + rgb.join(',') + ',0)');
            g.fillStyle = grad;
            g.fillRect(0, 0, 128, 128);
            return off;
        });

        function resize() {
            w = hero.clientWidth;
            h = hero.clientHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            seed();
        }

        function seed() {
            var count = clamp(Math.round(w / 70), 12, 26);
            particles = [];
            for (var i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    r: 10 + Math.random() * 26,
                    depth: 0.3 + Math.random() * 0.7,
                    sprite: sprites[i % sprites.length],
                    vy: 0.1 + Math.random() * 0.22,
                    phase: Math.random() * Math.PI * 2,
                    sway: 12 + Math.random() * 22,
                    swaySpeed: 0.0002 + Math.random() * 0.0004
                });
            }
        }

        function frame(t) {
            if (!running) { raf = null; return; }
            ctx.clearRect(0, 0, w, h);
            smoothMouseX += (mouseX - smoothMouseX) * 0.04;
            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                p.y -= p.vy * p.depth;
                if (p.y < -p.r * 2) {
                    p.y = h + p.r * 2;
                    p.x = Math.random() * w;
                }
                var x = p.x +
                    Math.sin(t * p.swaySpeed + p.phase) * p.sway +
                    smoothMouseX * p.depth * 28;
                var size = p.r * 2 * p.depth;
                ctx.drawImage(p.sprite, x - size / 2, p.y - size / 2, size, size);
            }
            raf = requestAnimationFrame(frame);
        }

        function setRunning(on) {
            running = on && visible && !document.hidden;
            if (running && !raf) raf = requestAnimationFrame(frame);
        }

        hero.addEventListener('pointermove', function (e) {
            mouseX = (e.clientX / w - 0.5) * 2;
        });

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                visible = entries[0].isIntersecting;
                setRunning(true);
            }).observe(hero);
        }
        document.addEventListener('visibilitychange', function () { setRunning(true); });

        if ('ResizeObserver' in window) {
            new ResizeObserver(resize).observe(hero);
        } else {
            window.addEventListener('resize', resize);
        }

        resize();
        setRunning(true);
    }

    /* ---------- Boot ---------- */

    function init() {
        if (reduced) return; // honor reduced motion: no decorative animation at all
        initAurora();
        initCounters();
        initParticles();
        if (finePointer) {
            initSpotlight();
            initTilt();
            initMagnetic();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
