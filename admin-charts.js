// Sensa admin charts. Plain SVG, no library (the /admin CSP allows only
// same-origin scripts). Two forms: line (trend over time, up to two series,
// optional area for a single series) and bars (one value per slot). Every
// chart ships a crosshair or per-bar tooltip, a legend when there are two
// series, and a table view toggle. Colors validated with the dataviz palette
// checker against a white card: violet #4a3aa7 and orange #eb6834.
(function () {
  const C = { s: ['#4a3aa7', '#eb6834'], grid: '#ecebf5', axis: '#d9d6ee', text: '#4a4a5a', muted: '#8a8a99', surface: '#ffffff' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtNum = v => (v == null || isNaN(v)) ? '–' : Number(v).toLocaleString();
  function toDate(label) {
    if (label instanceof Date) return label;
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(label) ? label + 'T00:00:00Z' : label);
    return isNaN(d) ? null : d;
  }
  function fmtDate(label, opts) {
    const d = toDate(label);
    return d ? d.toLocaleDateString('en-US', Object.assign({ timeZone: 'UTC' }, opts || { month: 'short', day: 'numeric' })) : String(label);
  }
  const fmtMonth = label => fmtDate(label, { month: 'short', year: '2-digit' });
  function niceTicks(max, n) {
    n = n || 4;
    if (!(max > 0)) return [0, 1];
    const raw = max / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), norm = raw / mag;
    const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
    const ticks = [];
    for (let v = 0; v < max + step - 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
    if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
    return ticks;
  }
  function pickXTicks(n, want) {
    if (n <= want) return Array.from({ length: n }, (_, i) => i);
    const out = [0];
    for (let k = 1; k < want - 1; k++) out.push(Math.round(k * (n - 1) / (want - 1)));
    out.push(n - 1);
    return Array.from(new Set(out));
  }
  function width(container) { return Math.max(320, container.clientWidth || container.parentElement?.clientWidth || 800); }

  const registry = new Set();
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => registry.forEach(el => { if (el.isConnected && el.offsetParent !== null && el.__render) el.__render(); }), 150);
  });

  function frame(container, opts, series, svg, tableHtml) {
    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'chart';
    const top = document.createElement('div');
    top.className = 'chart-top';
    if (series.length > 1) {
      const lg = document.createElement('div');
      lg.className = 'chart-legend';
      series.forEach((s, i) => { const span = document.createElement('span'); const key = document.createElement('i'); key.style.background = C.s[i]; span.appendChild(key); span.appendChild(document.createTextNode(s.name)); lg.appendChild(span); });
      top.appendChild(lg);
    } else {
      top.appendChild(document.createElement('div'));
    }
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'chart-table-btn'; btn.textContent = 'Table'; btn.setAttribute('aria-expanded', 'false');
    top.appendChild(btn);
    const plot = document.createElement('div');
    plot.className = 'chart-plot';
    plot.innerHTML = svg;
    const tip = document.createElement('div');
    tip.className = 'chart-tooltip'; tip.hidden = true;
    plot.appendChild(tip);
    const table = document.createElement('div');
    table.className = 'chart-table'; table.hidden = true; table.innerHTML = tableHtml;
    btn.addEventListener('click', () => { table.hidden = !table.hidden; btn.setAttribute('aria-expanded', String(!table.hidden)); btn.textContent = table.hidden ? 'Table' : 'Hide table'; });
    wrap.appendChild(top); wrap.appendChild(plot); wrap.appendChild(table);
    if (opts.note) { const n = document.createElement('div'); n.className = 'chart-note'; n.textContent = opts.note; wrap.appendChild(n); }
    container.appendChild(wrap);
    registry.add(container);
    return { plot, tip };
  }

  function tableFor(labels, series, labelHead, labelFmt) {
    return '<div style="overflow-x:auto"><table><thead><tr><th scope="col">' + esc(labelHead || 'Date') + '</th>' +
      series.map(s => '<th scope="col" style="text-align:right">' + esc(s.name) + '</th>').join('') + '</tr></thead><tbody>' +
      labels.map((l, i) => '<tr><td>' + esc(labelFmt(l)) + '</td>' + series.map(s => '<td style="text-align:right">' + fmtNum(s.values[i]) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table></div>';
  }

  function showTip(tip, plot, px, html) {
    tip.innerHTML = html;
    tip.hidden = false;
    const rect = plot.getBoundingClientRect();
    const tw = tip.offsetWidth;
    let left = px + 14;
    if (left + tw > rect.width - 8) left = px - tw - 14;
    tip.style.left = Math.max(0, left) + 'px';
    tip.style.top = '8px';
  }

  function line(container, opts) {
    container.__render = () => line(container, opts);
    const labels = opts.labels || [];
    const series = (opts.series || []).slice(0, 2);
    const hasData = labels.length && series.some(s => (s.values || []).some(v => v != null));
    if (!hasData) { container.innerHTML = '<div class="chart-empty">' + esc(opts.empty || 'No data yet.') + '</div>'; return; }
    const W = width(container), H = opts.height || 240, padL = 52, padR = 28, padT = 18, padB = 34;
    const iw = W - padL - padR, ih = H - padT - padB, n = labels.length;
    const max = Math.max(1, ...series.flatMap(s => s.values.filter(v => v != null)));
    const ticks = niceTicks(max), yMax = ticks[ticks.length - 1];
    const x = i => padL + (n === 1 ? iw / 2 : i * iw / (n - 1));
    const y = v => padT + ih - (v / yMax) * ih;
    const xf = opts.xFormat || fmtDate;
    const grid = ticks.map(t => '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y(t).toFixed(1) + '" y2="' + y(t).toFixed(1) + '" stroke="' + C.grid + '"/><text x="' + (padL - 8) + '" y="' + (y(t) + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="' + C.muted + '">' + fmtNum(t) + '</text>').join('');
    const xl = pickXTicks(n, W < 600 ? 3 : 6).map(i => '<text x="' + x(i).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="' + (i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle') + '" font-size="11" fill="' + C.muted + '">' + esc(xf(labels[i])) + '</text>').join('');
    const paths = series.map((s, si) => {
      const pts = s.values.map((v, i) => v == null ? null : [x(i), y(v)]);
      let d = '', on = false;
      pts.forEach(p => { if (!p) { on = false; return; } d += (on ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); on = true; });
      let area = '';
      const first = pts.find(Boolean), last = pts.slice().reverse().find(Boolean);
      if (opts.area && si === 0 && first && last && n > 1) area = '<path d="' + d + 'L' + last[0].toFixed(1) + ' ' + (padT + ih).toFixed(1) + 'L' + first[0].toFixed(1) + ' ' + (padT + ih).toFixed(1) + 'Z" fill="' + C.s[si] + '" opacity="0.08"/>';
      const dots = n <= 2 ? pts.map(p => p ? '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="5" fill="' + C.s[si] + '" stroke="' + C.surface + '" stroke-width="2"/>' : '').join('') : (last ? '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="5" fill="' + C.s[si] + '" stroke="' + C.surface + '" stroke-width="2"/>' : '');
      return area + '<path d="' + d + '" fill="none" stroke="' + C.s[si] + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' + dots;
    }).join('');
    const hover = '<line class="xhair" x1="0" x2="0" y1="' + padT + '" y2="' + (padT + ih) + '" stroke="' + C.text + '" opacity="0"/>' + series.map((s, si) => '<circle class="hdot" r="5" fill="' + C.s[si] + '" stroke="' + C.surface + '" stroke-width="2" opacity="0"/>').join('');
    const svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" style="display:block;max-width:100%" role="img" aria-label="' + esc(opts.ariaLabel || series.map(s => s.name).join(' and ')) + '">' + grid + '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + (padT + ih).toFixed(1) + '" y2="' + (padT + ih).toFixed(1) + '" stroke="' + C.axis + '"/>' + paths + xl + hover + '</svg>';
    const { plot, tip } = frame(container, opts, series, svg, tableFor(labels, series, opts.labelHead, opts.tableFormat || xf));
    const svgEl = plot.querySelector('svg'), xhair = svgEl.querySelector('.xhair'), hdots = svgEl.querySelectorAll('.hdot');
    let active = -1;
    const move = (clientX) => {
      const rect = svgEl.getBoundingClientRect();
      const px = (clientX - rect.left) / rect.width * W;
      let best = 0, bd = Infinity;
      for (let i = 0; i < n; i++) { const d = Math.abs(x(i) - px); if (d < bd) { bd = d; best = i; } }
      if (best === active) return;
      active = best;
      xhair.setAttribute('x1', x(best).toFixed(1)); xhair.setAttribute('x2', x(best).toFixed(1)); xhair.setAttribute('opacity', '0.35');
      series.forEach((s, si) => { const v = s.values[best]; const c = hdots[si]; if (v == null) { c.setAttribute('opacity', '0'); return; } c.setAttribute('cx', x(best).toFixed(1)); c.setAttribute('cy', y(v).toFixed(1)); c.setAttribute('opacity', '1'); });
      const rows = series.map((s, si) => '<div class="tt-row"><i style="background:' + C.s[si] + '"></i><strong>' + fmtNum(s.values[best]) + '</strong> ' + esc(s.name) + '</div>').join('');
      showTip(tip, plot, x(best) / W * rect.width, '<div class="tt-head">' + esc((opts.tooltipFormat || opts.tableFormat || xf)(labels[best])) + '</div>' + rows);
    };
    const leave = () => { active = -1; xhair.setAttribute('opacity', '0'); hdots.forEach(c => c.setAttribute('opacity', '0')); tip.hidden = true; };
    plot.addEventListener('mousemove', e => move(e.clientX));
    plot.addEventListener('touchstart', e => { if (e.touches[0]) move(e.touches[0].clientX); }, { passive: true });
    plot.addEventListener('touchmove', e => { if (e.touches[0]) move(e.touches[0].clientX); }, { passive: true });
    plot.addEventListener('mouseleave', leave);
  }

  function bars(container, opts) {
    container.__render = () => bars(container, opts);
    const labels = opts.labels || [], values = opts.values || [];
    const n = labels.length;
    if (!n || !values.some(v => v != null)) { container.innerHTML = '<div class="chart-empty">' + esc(opts.empty || 'No data yet.') + '</div>'; return; }
    const W = width(container), H = opts.height || 240, padL = 52, padR = 20, padT = 18, padB = 34;
    const iw = W - padL - padR, ih = H - padT - padB;
    const max = Math.max(1, ...values.filter(v => v != null));
    const ticks = niceTicks(max), yMax = ticks[ticks.length - 1];
    const slot = iw / n, bw = Math.min(24, Math.max(2, slot - 2));
    const y = v => padT + ih - (v / yMax) * ih, base = padT + ih;
    const xf = opts.xFormat || fmtDate;
    const grid = ticks.map(t => '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y(t).toFixed(1) + '" y2="' + y(t).toFixed(1) + '" stroke="' + C.grid + '"/><text x="' + (padL - 8) + '" y="' + (y(t) + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="' + C.muted + '">' + fmtNum(t) + '</text>').join('');
    const rects = values.map((v, i) => {
      if (v == null) return '';
      const x0 = padL + i * slot + (slot - bw) / 2, top = y(v), r = Math.min(4, bw / 2, Math.max(0, base - top));
      const d = 'M' + x0.toFixed(1) + ' ' + base.toFixed(1) + 'V' + (top + r).toFixed(1) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' -' + r + 'h' + (bw - 2 * r).toFixed(1) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + r + 'V' + base.toFixed(1) + 'Z';
      return '<path class="bar" data-i="' + i + '" d="' + d + '" fill="' + C.s[0] + '"/>';
    }).join('');
    const hits = labels.map((_, i) => '<rect class="hit" data-i="' + i + '" x="' + (padL + i * slot).toFixed(1) + '" y="' + padT + '" width="' + slot.toFixed(1) + '" height="' + ih + '" fill="transparent"/>').join('');
    const xl = pickXTicks(n, W < 600 ? 3 : Math.min(n, 8)).map(i => '<text x="' + (padL + i * slot + slot / 2).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="11" fill="' + C.muted + '">' + esc(xf(labels[i])) + '</text>').join('');
    const svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" style="display:block;max-width:100%" role="img" aria-label="' + esc(opts.ariaLabel || opts.name || 'Bar chart') + '">' + grid + '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + base.toFixed(1) + '" y2="' + base.toFixed(1) + '" stroke="' + C.axis + '"/>' + rects + xl + hits + '</svg>';
    const series = [{ name: opts.name || 'Value', values }];
    const { plot, tip } = frame(container, opts, series, svg, tableFor(labels, series, opts.labelHead, opts.tableFormat || xf));
    const svgEl = plot.querySelector('svg');
    let active = null;
    const setActive = (i) => {
      svgEl.querySelectorAll('.bar').forEach(b => b.setAttribute('opacity', i === null || Number(b.dataset.i) === i ? '1' : '0.45'));
      if (i === null) { tip.hidden = true; return; }
      const rect = svgEl.getBoundingClientRect();
      const title = (opts.tooltipTitle ? opts.tooltipTitle(i) : (opts.tooltipFormat || opts.tableFormat || xf)(labels[i]));
      showTip(tip, plot, (padL + i * slot + slot / 2) / W * rect.width, '<div class="tt-head">' + esc(title) + '</div><div class="tt-row"><i style="background:' + C.s[0] + '"></i><strong>' + fmtNum(values[i]) + '</strong> ' + esc(opts.name || '') + '</div>');
    };
    svgEl.querySelectorAll('.hit').forEach(h => {
      const i = Number(h.dataset.i);
      h.addEventListener('mouseenter', () => { active = i; setActive(i); });
      h.addEventListener('touchstart', () => { active = i; setActive(i); }, { passive: true });
    });
    plot.addEventListener('mouseleave', () => { active = null; setActive(null); });
  }

  // Bucket daily rows into ISO weeks (Monday start) or calendar months.
  // mode 'sum' adds values, 'last' keeps the final value in the bucket.
  function aggregate(labels, seriesValues, unit, mode) {
    const keyOf = label => {
      const d = toDate(label); if (!d) return String(label);
      if (unit === 'month') return d.toISOString().slice(0, 7) + '-01';
      const day = (d.getUTCDay() + 6) % 7; const m = new Date(d); m.setUTCDate(d.getUTCDate() - day); return m.toISOString().slice(0, 10);
    };
    const order = [], buckets = {};
    labels.forEach((l, i) => {
      const k = keyOf(l);
      if (!buckets[k]) { buckets[k] = seriesValues.map(() => (mode === 'last' ? null : 0)); order.push(k); }
      seriesValues.forEach((vals, si) => { const v = vals[i]; if (v == null) return; buckets[k][si] = mode === 'last' ? v : (buckets[k][si] || 0) + v; });
    });
    return { labels: order, series: seriesValues.map((_, si) => order.map(k => buckets[k][si])) };
  }
  function cumulative(values) { let t = 0; return values.map(v => { t += (v || 0); return t; }); }
  // Every month from the first label's month through the current month, so
  // quiet months show as zero instead of disappearing.
  function monthRange(fromLabel) {
    const start = toDate(fromLabel) || new Date();
    const out = []; const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)); const now = new Date();
    while (cur <= now) { out.push(cur.toISOString().slice(0, 10)); cur.setUTCMonth(cur.getUTCMonth() + 1); }
    return out;
  }

  window.SensaCharts = { line, bars, aggregate, cumulative, monthRange, fmtDate, fmtMonth };
})();
