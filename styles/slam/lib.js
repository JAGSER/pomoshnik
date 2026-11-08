// lib.js - SLAM: агрессивная моушн-графика (чёрная сетка, лайм, слэм слов, глитч, полосатые склейки)
const SLAM = (() => {
  const SANS = '"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif';
  const SERIF = '"DejaVu Serif",Georgia,"Noto Serif","Times New Roman",serif';
  const MONO = '"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace';
  const C = { ink: '#0A0A0B', wh: '#F4F1EA', lime: '#C8FF2E', dim: '#5E5E5E', red: '#FF2E4D', cyan: '#2EE6FF',
    line: 'rgba(255,255,255,0.18)', faint: 'rgba(255,255,255,0.08)', panel: 'rgba(255,255,255,0.04)', soft: 'rgba(244,241,234,0.6)' };
  const X0 = 60, X1 = 1020, PI2 = Math.PI * 2;

  // ---------- математика, изинги, пружины ----------
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, p) => a + (b - a) * p;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const eo = p => { p = clamp(p); return 1 - Math.pow(1 - p, 3); };
  const eio = p => { p = clamp(p); return p * p * (3 - 2 * p); };
  const ein = p => { p = clamp(p); return p * p * p; };
  const back = p => { p = clamp(p); const c = 1.6; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
  const spring = x => x <= 0 ? 0 : x > 1.5 ? 1 : 1 - Math.exp(-7 * x) * Math.cos(11 * x);
  const softSpring = x => x <= 0 ? 0 : x > 2 ? 1 : 1 - Math.exp(-5 * x) * Math.cos(7 * x);
  function rng(s) { s = (s >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const F = (w, s, f) => w + ' ' + Math.round(s) + 'px ' + (f || SANS);
  function appear(lt, t0, dur) { const p = clamp((lt - t0) / (dur || 0.25)); return { p, e: eo(p), a: Math.min(1, p * 2.5), on: p > 0 }; }
  function life(lt, t0, t1, din, dout) {
    din = din || 0.3; dout = dout || din / 1.4; if (lt < t0 || lt > t1) return 0;
    return Math.min(eo((lt - t0) / din), eo((t1 - lt) / dout));
  }
  const count = (lt, t0, dur, to, from) => Math.round(lerp(from || 0, to, eo((lt - t0) / (dur || 1))));

  // ---------- текстуры (один раз) ----------
  let BG = null, GLOW = null, STR = null;
  function prep() {
    if (BG) return;
    BG = new OffscreenCanvas(1200, 2040); const b = BG.getContext('2d');
    b.fillStyle = C.ink; b.fillRect(0, 0, 1200, 2040);
    b.strokeStyle = 'rgba(255,255,255,0.05)'; b.lineWidth = 2;
    for (let x = 0; x <= 1200; x += 60) { b.beginPath(); b.moveTo(x, 0); b.lineTo(x, 2040); b.stroke(); }
    for (let y = 0; y <= 2040; y += 60) { b.beginPath(); b.moveTo(0, y); b.lineTo(1200, y); b.stroke(); }
    b.strokeStyle = 'rgba(255,255,255,0.16)';
    for (let x = 0; x <= 1200; x += 240) for (let y = 0; y <= 2040; y += 240) { b.beginPath(); b.moveTo(x - 10, y); b.lineTo(x + 10, y); b.moveTo(x, y - 10); b.lineTo(x, y + 10); b.stroke(); }
    const r = rng(7);
    for (let i = 0; i < 5000; i++) { b.fillStyle = 'rgba(255,255,255,' + (r() * 0.07).toFixed(3) + ')'; b.fillRect(r() * 1200, r() * 2040, 2, 2); }
    b.fillStyle = 'rgba(0,0,0,0.22)'; for (let y = 0; y < 2040; y += 4) b.fillRect(0, y, 1200, 2);
    const vg = b.createRadialGradient(600, 1020, 300, 600, 1020, 1250);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.75)'); b.fillStyle = vg; b.fillRect(0, 0, 1200, 2040);
    GLOW = new OffscreenCanvas(240, 240); const q = GLOW.getContext('2d');
    const rg = q.createRadialGradient(120, 120, 0, 120, 120, 120);
    rg.addColorStop(0, 'rgba(200,255,46,0.55)'); rg.addColorStop(1, 'rgba(200,255,46,0)'); q.fillStyle = rg; q.fillRect(0, 0, 240, 240);
    STR = new OffscreenCanvas(1400, 260); const s = STR.getContext('2d');
    s.fillStyle = C.lime; s.fillRect(0, 0, 1400, 260); s.fillStyle = C.ink;
    for (let x = -300; x < 1500; x += 90) { s.beginPath(); s.moveTo(x, 0); s.lineTo(x + 45, 0); s.lineTo(x + 195, 260); s.lineTo(x + 150, 260); s.closePath(); s.fill(); }
  }

  // ---------- удары, камера, сцены, переходы ----------
  let H = [], CUTS = [], _ch = 0;
  function hits(list) { H = (list || []).slice(); }
  const allHits = () => H.concat(CUTS.map(c => [c, 26]));
  function shake(t) {
    let x = 0, y = 0;
    for (const [h, a] of allHits()) { const d = t - h; if (d >= 0 && d < 0.5) { const e = a * Math.exp(-d * 9); x += e * Math.sin(d * 83); y += e * Math.cos(d * 61); } }
    return [x, y];
  }
  function glitch(t) { let m = 0; for (const [h, a] of allHits()) { const d = t - h; if (d >= 0 && d < 0.3) m = Math.max(m, a * 0.6 * Math.exp(-d * 14)); } return m; }
  function scene(t, cuts, dur) {
    let i = 0; while (i < cuts.length && t >= cuts[i]) i++;
    const t0 = i ? cuts[i - 1] : 0, t1 = i < cuts.length ? cuts[i] : dur;
    return { i, t0, t1, lt: t - t0, len: t1 - t0, ep: i < cuts.length ? clamp((t - (t1 - 0.18)) / 0.18) : 0, last: i === cuts.length };
  }
  function scan(g, t) {
    const by = ((t * 700) % 2600) - 300, lg = g.createLinearGradient(0, by, 0, by + 220);
    lg.addColorStop(0, 'rgba(200,255,46,0)'); lg.addColorStop(0.5, 'rgba(200,255,46,0.05)'); lg.addColorStop(1, 'rgba(200,255,46,0)');
    g.fillStyle = lg; g.fillRect(0, by, 1080, 220);
  }
  function bg(g, t, sx, sy) { prep(); g.drawImage(BG, -60 - ((t * 14) % 60) + (sx || 0) * 0.3, -60 + (sy || 0) * 0.3); scan(g, t); }
  function camBegin(g, sc, t, sx, sy) {
    const lt = sc.lt, ep = sc.ep, z = 1 + 0.04 * Math.exp(-lt * 5) * Math.cos(lt * 9) + lt * 0.008 + 0.35 * ep * ep;
    g.save(); g.globalAlpha = 1 - ep; g.translate(540 + (sx || 0), 960 + (sy || 0)); g.rotate(0.004 * Math.sin(t * 0.9)); g.scale(z, z); g.translate(-540, -960);
    return z;
  }
  function camEnd(g) { g.restore(); g.globalAlpha = 1; }
  function wipes(g, t, cuts) {
    prep();
    for (const c of cuts) {
      const d = t - c + 0.15;
      if (d >= 0 && d <= 0.3) { const y = -260 + 2180 * eio(d / 0.3); g.save(); g.translate(540, y + 130); g.rotate(-0.08); g.drawImage(STR, -700, -130); g.restore(); }
      const f = t - c;
      if (f >= 0 && f < 0.1) { g.fillStyle = 'rgba(244,241,234,' + (0.35 * (1 - f / 0.1)).toFixed(2) + ')'; g.fillRect(0, 0, 1080, 1920); }
    }
  }
  function frame(g, t, k, cuts, scenes) {
    prep(); CUTS = cuts.slice(); const sc = scene(t, cuts, k.duration); sc.k = k;
    const [sx, sy] = shake(t); _ch = glitch(t);
    bg(g, t, sx, sy); camBegin(g, sc, t, sx, sy);
    const f = scenes[Math.min(sc.i, scenes.length - 1)]; if (f) f(g, sc.lt, t, sc);
    camEnd(g); wipes(g, t, cuts); return sc;
  }

  // ---------- текст ----------
  const safeCx = (cx, w) => w > X1 - X0 ? 540 : Math.max(X0, Math.min(X1 - w, cx - w / 2)) + w / 2;
  function fit(g, s, w, size, fam, maxW, min) {
    maxW = Math.min(maxW || 880, X1 - X0); min = min || 24;
    for (; size > min; size -= 2) { g.font = F(w, size, fam); if (g.measureText(s).width <= maxW) break; }
    g.font = F(w, size, fam); return size;
  }
  const WC = new Map();
  function wrap(g, text, o) {
    o = o || {}; const wt = o.weight || 900, fam = o.fam || SANS, maxW = Math.min(o.maxW || 880, X1 - X0), ml = o.lines || 2, min = o.min || 44;
    const key = [text, wt, fam, maxW, ml, min, o.size].join('|'); if (WC.has(key)) { const c = WC.get(key); g.font = F(wt, c.size, fam); return c; }
    const words = String(text).replace(/\u2014/g, '-').split(/\s+/).filter(Boolean);
    let size = o.size || 150, lines = [];
    for (;; size -= 4) {
      g.font = F(wt, size, fam); const sp = size * 0.26;
      const ws = words.map(w => g.measureText(w).width), lw = a => a.reduce((s, i) => s + ws[i], 0) + sp * (a.length - 1);
      lines = []; let cur = [];
      ws.forEach((w, i) => { if (cur.length && lw(cur.concat(i)) > maxW) { lines.push(cur); cur = [i]; } else cur.push(i); });
      if (cur.length) lines.push(cur);
      if (lines.length > 1) { const L = lines[lines.length - 1], P = lines[lines.length - 2]; if (L.length === 1 && P.length > 2 && lw([P[P.length - 1]].concat(L)) <= maxW) L.unshift(P.pop()); }
      const wide = ws.some(w => w > maxW), orphan = lines.length > 1 && words.length >= lines.length * 2 && lines.some(a => a.length === 1);
      if ((lines.length <= ml && !wide && !orphan) || size <= min) break;
    }
    g.font = F(wt, size, fam); let mw = 0; for (const w of words) mw = Math.max(mw, g.measureText(w).width);
    if (mw > maxW) size = Math.floor(size * maxW / mw);
    const res = { lines: lines.map(a => a.map(i => words[i])), size, words };
    WC.set(key, res); g.font = F(wt, size, fam); return res;
  }
  function chrome(g, s, x, y, col, ch) {
    if (ch > 0.5) { g.fillStyle = 'rgba(255,46,77,0.8)'; g.fillText(s, x - ch, y); g.fillStyle = 'rgba(46,230,255,0.8)'; g.fillText(s, x + ch, y); }
    g.fillStyle = col; g.fillText(s, x, y);
  }
  function mkHi(h) {
    if (h == null) return () => false;
    if (typeof h === 'number') return i => i === h;
    const keys = [].concat(h).map(s => String(s).toLowerCase());
    return (i, w) => { const c = w.toLowerCase().replace(/[.,!?:;"«»]/g, ''); return keys.some(k => c === k || (k.length > 2 && c.indexOf(k) === 0)); };
  }
  function slamLine(g, words, cx, y, size, times, lt, hiF, ch, o) {
    o = o || {}; g.font = F(o.weight || 900, size, o.fam || SANS); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    const sp = size * 0.26, ws = words.map(w => g.measureText(w).width), tot = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
    let x = o.align === 'left' ? Math.max(X0, Math.min(X1 - tot, cx)) : safeCx(cx, tot) - tot / 2; const x0 = x;
    words.forEach((wd, i) => {
      const p = clamp((lt - times[i]) / 0.22);
      if (p > 0) {
        const e = eo(p), mx = x + ws[i] / 2, my = y - size * 0.35, hw = ws[i] / 2 || 1;
        const smax = Math.max(1, Math.min(1.35, (mx - 30) / hw, (1050 - mx) / hw)), s = 1 + (smax - 1) * (1 - e);
        g.save(); g.globalAlpha *= Math.min(1, p * 2.5); g.translate(mx, my); g.scale(s, s); g.translate(-mx, -my);
        chrome(g, wd, x, y, hiF(i, wd) ? (o.hiCol || C.lime) : (o.col || C.wh), ch * (1 - e * 0.5)); g.restore();
      }
      x += ws[i] + sp;
    });
    return { x0, x1: x - sp, w: tot };
  }
  function title(g, text, y, lt, o) {
    o = o || {}; const L = wrap(g, text, o), lh = L.size * (o.lh || 1.02), step = o.step || 0.14, t0 = o.t0 || 0;
    const ch = o.ch == null ? _ch : o.ch, hiF = mkHi(o.hi); let n = 0, res = { x1: 540 };
    L.lines.forEach((ln, j) => {
      const base = n, times = ln.map((_, i) => o.times && o.times[base + i] != null ? o.times[base + i] : t0 + (base + i) * step);
      res = slamLine(g, ln, o.cx || 540, y + j * lh, L.size, times, lt, (i, w) => hiF(base + i, w), ch, o); n += ln.length;
    });
    const k = Math.max(0, L.lines.length - 1);
    return { size: L.size, lines: L.lines.length, top: y - L.size * 0.75, lastY: y + k * lh, bottom: y + k * lh + L.size * 0.25, right: res.x1, end: t0 + n * step };
  }
  function echo(g, s, cx, y, size, lt, t0, o) {
    o = o || {}; size = fit(g, s, 900, size, SANS, 780, 40); const w = g.measureText(s).width; cx = safeCx(cx, w + 180);
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.lineWidth = 3; g.strokeStyle = o.col || C.wh;
    for (let j = 1; j <= (o.n || 3); j++) {
      const p = clamp((lt - t0 - 0.16 * (j - 1)) / 0.3); if (p <= 0) continue;
      g.save(); g.globalAlpha *= Math.max(0, 0.6 - 0.15 * j) * p; g.strokeText(s, cx - (1 - eo(p)) * 90, y + j * size * (o.gap || 0.92)); g.restore();
    }
  }
  function typed(g, s, x, y, lt, t0, dur, o) {
    o = o || {}; s = String(s); const size = fit(g, s, o.weight || 500, o.size || 40, MONO, o.maxW || 900, 22);
    const n = Math.floor(clamp((lt - t0) / (dur || 0.5)) * s.length); if (n <= 0) return 0;
    const wf = g.measureText(s).width, al = o.align || 'left';
    let l = al === 'center' ? x - wf / 2 : al === 'right' ? x - wf : x; l = Math.max(X0, Math.min(X1 - wf, l));
    g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = o.col || C.soft; g.fillText(s.slice(0, n), l, y);
    if (o.caret && n < s.length) { const cw = g.measureText(s.slice(0, n)).width; g.fillStyle = C.lime; g.fillRect(l + cw + 4, y - size * 0.8, size * 0.5, size * 0.95); }
    return n;
  }
  function label(g, s, x, y, o) {
    o = o || {}; s = String(s); const size = fit(g, s, o.weight || 500, o.size || 30, o.fam || MONO, o.maxW || 900, 18);
    const w = g.measureText(s).width, al = o.align || 'left';
    let l = al === 'center' ? x - w / 2 : al === 'right' ? x - w : x; l = Math.max(X0, Math.min(X1 - w, l));
    g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = o.col || C.dim; g.fillText(s, l, y); return { x0: l, x1: l + w, size };
  }
  function tag(g, s, x, y, o) {
    o = o || {}; const size = fit(g, s, 600, o.size || 30, MONO, (o.maxW || 600) - 40, 18), w = g.measureText(s).width + 40, h = size * 1.6;
    const l = Math.max(X0, Math.min(X1 - w, o.align === 'center' ? x - w / 2 : x));
    rr(g, l, y - h / 2, w, h, 6); g.fillStyle = o.fill || 'rgba(10,10,11,0.85)'; g.fill(); g.lineWidth = 3; g.strokeStyle = o.col || C.lime; g.stroke();
    g.fillStyle = o.col || C.lime; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(s, l + 20, y + 1); g.textBaseline = 'alphabetic';
    return w;
  }
  function bigNum(g, s, cx, y, lt, t0, o) {
    o = o || {}; s = String(s); const wide = o.wide || s, size = fit(g, wide, 900, o.size || 400, SANS, o.maxW || 860, 60);
    const p = clamp((lt - t0) / 0.22); if (p <= 0) return { size, x0: cx, x1: cx };
    const ww = g.measureText(wide).width, wn = g.measureText(s).width, c = safeCx(cx, ww), xr = c + ww / 2;
    const smax = Math.min(1.3, Math.max(1, 510 / (ww / 2 + 1))), sc = 1 + (smax - 1) * (1 - eo(p)), my = y - size * 0.35;
    g.save(); g.globalAlpha *= Math.min(1, p * 2.5); g.translate(c, my); g.scale(sc, sc); g.translate(-c, -my); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    if (o.outline) { g.fillStyle = 'rgba(244,241,234,0.07)'; g.fillText(s, xr - wn, y); g.lineWidth = 8; g.lineJoin = 'round'; g.strokeStyle = o.col || C.wh; g.strokeText(s, xr - wn + _ch * 0.3, y); }
    else chrome(g, s, xr - wn, y, o.col || C.wh, o.ch == null ? _ch : o.ch);
    g.restore(); return { size, x0: xr - wn, x1: xr };
  }

  // ---------- элементы стиля ----------
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function glowAt(g, x, y, r, a) { prep(); g.save(); g.globalAlpha *= a == null ? 1 : a; g.drawImage(GLOW, x - r, y - r, r * 2, r * 2); g.restore(); }
  function cursor(g, cx, cy, h, t, blink, a) {
    prep(); const w = h * 0.6; g.save(); g.globalAlpha *= a == null ? 1 : a;
    if (blink && Math.floor(t * 2.5) % 2) g.globalAlpha *= 0.25;
    cx = Math.max(X0 + w / 2, Math.min(X1 - w / 2, cx));
    g.drawImage(GLOW, cx - h * 1.4, cy - h * 1.4, h * 2.8, h * 2.8); g.fillStyle = C.lime; g.fillRect(cx - w / 2, cy - h / 2, w, h); g.restore();
  }
  function check(g, x, y, s, p, lw, col) {
    if (p <= 0) return; const a = [x - s, y], b = [x - s * 0.35, y + s * 0.65], c = [x + s, y - s * 0.7];
    g.strokeStyle = col || C.lime; g.lineWidth = lw || 9; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(a[0], a[1]);
    if (p < 0.4) { const u = p / 0.4; g.lineTo(lerp(a[0], b[0], u), lerp(a[1], b[1], u)); }
    else { const u = clamp((p - 0.4) / 0.6); g.lineTo(b[0], b[1]); g.lineTo(lerp(b[0], c[0], u), lerp(b[1], c[1], u)); }
    g.stroke();
  }
  function cross(g, x, y, s, p, lw, col) {
    if (p <= 0) return; g.strokeStyle = col || C.wh; g.lineWidth = lw || 8; g.lineCap = 'round'; g.beginPath();
    const u = clamp(p * 2), v = clamp(p * 2 - 1);
    g.moveTo(x - s, y - s); g.lineTo(x - s + 2 * s * u, y - s + 2 * s * u);
    if (v > 0) { g.moveTo(x + s, y - s); g.lineTo(x + s - 2 * s * v, y - s + 2 * s * v); } g.stroke();
  }
  function dots(g, x, y, t) { for (let d = 0; d < 3; d++) { g.fillStyle = 'rgba(255,255,255,' + (0.2 + 0.5 * Math.max(0, Math.sin(t * 8 - d))).toFixed(2) + ')'; g.fillRect(x + d * 22, y - 5, 10, 10); } }
  function segBar(g, x, y, w, v, o) {
    o = o || {}; x = Math.max(X0, x); w = Math.min(w, X1 - x);
    const h = o.h || 100, seg = o.seg || 20, gap = o.gap == null ? 8 : o.gap, sw = (w - gap * (seg - 1)) / seg, f = clamp(v) * seg;
    for (let i = 0; i < seg; i++) { const sx = x + i * (sw + gap), q = clamp(f - i); g.fillStyle = C.faint; g.fillRect(sx, y, sw, h); if (q > 0) { g.fillStyle = o.col || C.lime; g.fillRect(sx, y, sw * q, h); } }
    if (o.flash != null && o.lt != null && o.lt > o.flash) { const a = Math.exp(-(o.lt - o.flash) * 4); if (a > 0.02) { g.strokeStyle = 'rgba(244,241,234,' + a.toFixed(2) + ')'; g.lineWidth = 6; g.strokeRect(x - 12, y - 12, w + 24, h + 24); } }
    return x + w * clamp(v);
  }
  function ring(g, x, y, r, p, o) {
    o = o || {}; g.lineWidth = o.lw || 14; g.lineCap = 'butt'; g.strokeStyle = C.faint; g.beginPath(); g.arc(x, y, r, 0, PI2); g.stroke();
    if (p > 0) { g.strokeStyle = o.col || C.lime; g.beginPath(); g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + PI2 * clamp(p)); g.stroke(); }
  }
  function plate(g, o) {
    const lt = o.lt, st = o.st || 0; if (lt < st) return;
    const x = Math.max(X0, o.x || 200), w = Math.min(o.w || 790, X1 - 20 - x), y = o.y, h = o.h || 150, done = o.done != null && lt >= o.done;
    g.save(); g.translate(Math.max(-18, (1 - spring(lt - st)) * 320), 0); g.globalAlpha *= clamp((lt - st) / 0.2);
    rr(g, x, y - h / 2, w, h, 18); g.fillStyle = C.panel; g.fill();
    const fl = done ? Math.exp(-(lt - o.done) * 5) : 0;
    g.lineWidth = 3; g.strokeStyle = done ? 'rgba(200,255,46,' + (0.35 + 0.65 * fl).toFixed(2) + ')' : 'rgba(255,255,255,0.22)'; g.stroke();
    if (o.idx != null) { g.font = F(500, 28, MONO); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = C.dim; g.fillText(String(o.idx), x + 36, y - h * 0.2); }
    fit(g, o.name, 800, o.size || 62, SANS, w - 200, 30); g.fillStyle = C.wh; g.textAlign = 'left'; g.fillText(o.name, x + 36, y + h * 0.23);
    if (done) check(g, x + w - 70, y, 26, clamp((lt - o.done) / 0.15), 9); else dots(g, x + w - 100, y, o.t == null ? lt : o.t);
    g.restore();
  }
  function timeline(g, x, y0, ys, lt, times) {
    let j = 0; for (const v of times) if (lt >= v - 0.35) j++;
    const stops = [y0].concat(ys), ry = j === 0 ? y0 : stops[j - 1] + (stops[j] - stops[j - 1]) * spring(lt - (times[j - 1] - 0.35));
    g.lineWidth = 4; g.strokeStyle = C.line; g.beginPath(); g.moveTo(x, y0); g.lineTo(x, ys[ys.length - 1]); g.stroke();
    g.strokeStyle = 'rgba(200,255,46,0.85)'; g.beginPath(); g.moveTo(x, y0); g.lineTo(x, ry); g.stroke();
    ys.forEach((y, i) => { const on = lt >= times[i]; g.beginPath(); g.arc(x, y, 14, 0, PI2); g.fillStyle = on ? C.lime : C.ink; g.fill(); g.lineWidth = 3; g.strokeStyle = on ? C.lime : 'rgba(255,255,255,0.4)'; g.stroke(); });
    return ry;
  }
  function stamp(g, s, cx, cy, lt, t0, o) {
    o = o || {}; const p = clamp((lt - t0) / 0.18); if (p <= 0) return 0;
    const rot = o.rot == null ? -0.12 : o.rot, col = o.col || C.wh, ts = fit(g, s, 900, o.size || 80, SANS, o.maxW || 600, 36), tw = g.measureText(s).width;
    const bw = tw + ts * 1.2, bh = ts * 2, hw = bw / 2 * Math.cos(rot) + bh / 2 * Math.abs(Math.sin(rot)), sc = 1 + 0.8 * (1 - eo(p));
    cx = Math.max(X0 + hw, Math.min(X1 - hw, cx));
    g.save(); g.globalAlpha *= Math.min(1, p * 2); g.translate(cx, cy); g.rotate(rot); g.scale(sc, sc);
    g.strokeStyle = col; g.lineWidth = 8; g.strokeRect(-bw / 2, -bh / 2, bw, bh); g.lineWidth = 3; g.strokeRect(-bw / 2 + 18, -bh / 2 + 18, bw - 36, bh - 36);
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = col; g.fillText(s, 0, ts * 0.36);
    const r = rng(o.seed || 11); g.fillStyle = o.bg || C.ink;
    for (let i = 0; i < 16; i++) { const yy = r() < 0.5 ? -bh / 2 + 4 + r() * 10 : bh / 2 - 14 + r() * 10; g.fillRect(-bw / 2 + 5 + r() * (bw - 10), yy, 3 + r() * 5, 2 + r() * 3); }
    g.restore(); return p;
  }
  function scribble(g, x, y, w, h, p, o) {
    o = o || {}; x = Math.max(X0, x); w = Math.min(w, X1 - x); const s = (o.seed || 1) * 0.37;
    const P = u => [x + w * u + w * 0.05 * Math.sin(u * 38 + s), y - h * 0.4 * Math.sin(u * 23 + 0.5 + s) * (0.5 + 0.5 * Math.sin(u * 6 + 1)) - h * 0.16 * Math.cos(u * 38 + s)];
    const N = 140, m = Math.floor(clamp(p) * N);
    if (m > 0) { g.strokeStyle = o.col || C.wh; g.lineWidth = o.lw || 7; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); for (let i = 0; i <= m; i++) { const q = P(i / N); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } g.stroke(); }
    return P(clamp(p));
  }
  function hazard(g, x, y, w, h, off) {
    prep(); const o = (((off || 0) % 90) + 90) % 90; g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.drawImage(STR, x - 180 + o, y - (260 - h) / 2); g.restore();
  }
  function brackets(g, x, y, w, h, o) {
    o = o || {}; const L = o.len || 40; g.strokeStyle = o.col || C.wh; g.lineWidth = o.lw || 4; g.lineCap = 'square'; g.beginPath();
    [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(([a, b, sx, sy]) => { g.moveTo(a + sx * L, b); g.lineTo(a, b); g.lineTo(a, b + sy * L); });
    g.stroke();
  }
  function arrow(g, x0, y0, x1, y1, p, o) {
    o = o || {}; p = clamp(p); if (p <= 0) return; const e = eo(p), x = lerp(x0, x1, e), y = lerp(y0, y1, e), a = Math.atan2(y1 - y0, x1 - x0), L = o.head || 26;
    g.strokeStyle = o.col || C.lime; g.lineWidth = o.lw || 6; g.lineCap = 'round'; g.lineJoin = 'round'; if (o.dash) g.setLineDash(o.dash);
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x, y); g.stroke(); g.setLineDash([]);
    g.beginPath(); g.moveTo(x - L * Math.cos(a - 0.5), y - L * Math.sin(a - 0.5)); g.lineTo(x, y); g.lineTo(x - L * Math.cos(a + 0.5), y - L * Math.sin(a + 0.5)); g.stroke();
  }

  // ---------- герои и предметы (line-art: белая обводка, чёрная заливка, лаймовая деталь) ----------
  function bot(g, x, y, s, t, o) {
    o = o || {}; const m = o.mood || 'work', lw = Math.max(3, s * 0.035); x = Math.max(X0 + s * 0.62, Math.min(X1 - s * 0.62, x));
    g.save(); g.translate(x, y + Math.sin(t * 2.2) * s * 0.02); g.lineWidth = lw; g.lineJoin = 'round'; g.lineCap = 'round';
    if (o.glow) glowAt(g, 0, 0, s * 1.1, 0.5);
    g.strokeStyle = C.wh;
    if (o.body !== false) {
      g.beginPath(); g.moveTo(0, s * 0.4); g.lineTo(0, s * 0.5); g.moveTo(-s * 0.36, s * 0.6); g.lineTo(-s * 0.58, s * 0.92);
      const ra = 0.9 - (o.wave || 0) * (0.6 + 0.4 * Math.sin(t * 12)) * 2.2;
      g.moveTo(s * 0.36, s * 0.6); g.lineTo(s * 0.36 + Math.cos(ra) * s * 0.38, s * 0.6 + Math.sin(ra) * s * 0.38); g.stroke();
      rr(g, -s * 0.36, s * 0.5, s * 0.72, s * 0.5, s * 0.08); g.fillStyle = C.ink; g.fill(); g.stroke();
      rr(g, -s * 0.2, s * 0.64, s * 0.4, s * 0.1, s * 0.03); g.stroke();
      const chg = clamp(o.charge == null ? 1 : o.charge);
      if (chg > 0) { g.fillStyle = C.lime; g.fillRect(-s * 0.2 + lw, s * 0.64 + lw, (s * 0.4 - lw * 2) * chg, s * 0.1 - lw * 2); }
    }
    g.beginPath(); g.moveTo(0, -s * 0.4); g.lineTo(0, -s * 0.6); g.stroke();
    g.fillStyle = C.lime; g.beginPath(); g.arc(0, -s * 0.66, s * (0.05 + 0.03 * Math.abs(Math.sin(t * 4))), 0, PI2); g.fill();
    rr(g, -s / 2, -s * 0.4, s, s * 0.8, s * 0.12); g.fillStyle = C.ink; g.fill(); g.strokeStyle = C.wh; g.stroke();
    rr(g, -s * 0.38, -s * 0.2, s * 0.76, s * 0.34, s * 0.06); g.fillStyle = m === 'alert' && Math.floor(t * 6) % 2 ? 'rgba(200,255,46,0.35)' : 'rgba(200,255,46,0.12)'; g.fill(); g.strokeStyle = C.lime; g.stroke();
    g.fillStyle = C.lime;
    if (m === 'ok') { g.lineWidth = lw * 1.4; for (const k of [-1, 1]) { g.beginPath(); g.arc(k * s * 0.17, s * 0.02, s * 0.07, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); } }
    else if (m === 'alert') { for (const k of [-1, 1]) g.fillRect(k * s * 0.17 - s * 0.06, -s * 0.11, s * 0.12, s * 0.16); }
    else { const eh = (t * 0.7) % 1 > 0.95 ? s * 0.02 : s * 0.13, lk = clamp(o.look || 0, -1, 1) * s * 0.08; for (const k of [-1, 1]) g.fillRect(k * s * 0.17 - s * 0.05 + lk, -eh / 2 - s * 0.03, s * 0.1, eh); }
    g.fillStyle = 'rgba(244,241,234,0.5)'; for (let i = 0; i < 4; i++) g.fillRect(-s * 0.18 + i * s * 0.1, s * 0.22, s * 0.06, s * 0.05);
    g.restore(); return x;
  }
  function box(g, x, y, s, o) {
    o = o || {}; const d = s * 0.3, h = s / 2, lid = clamp(o.lid || 0);
    g.save(); g.lineWidth = Math.max(3, s * 0.03); g.lineJoin = 'round'; g.strokeStyle = C.wh; g.fillStyle = C.ink;
    g.beginPath(); g.moveTo(x + h, y - h); g.lineTo(x + h + d, y - h - d); g.lineTo(x + h + d, y + h - d); g.lineTo(x + h, y + h); g.closePath(); g.fill(); g.stroke();
    g.fillRect(x - h, y - h, s, s); g.strokeRect(x - h, y - h, s, s);
    g.fillStyle = C.lime; g.fillRect(x - s * 0.08, y - h, s * 0.16, s * 0.4);
    g.save(); g.translate(x - h, y - h); g.rotate(-lid * 0.5); g.translate(0, -lid * s * 0.15);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(d, -d); g.lineTo(s + d, -d); g.lineTo(s, 0); g.closePath(); g.fillStyle = C.ink; g.fill(); g.stroke(); g.restore();
    g.restore();
  }
  function doc(g, x, y, w, p, o) {
    o = o || {}; const h = w * 1.3, f = w * 0.22, l = x - w / 2, tp = y - h / 2;
    g.save(); g.lineWidth = Math.max(3, w * 0.025); g.lineJoin = 'round'; g.strokeStyle = C.wh; g.fillStyle = C.ink;
    g.beginPath(); g.moveTo(l, tp); g.lineTo(l + w - f, tp); g.lineTo(l + w, tp + f); g.lineTo(l + w, tp + h); g.lineTo(l, tp + h); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(l + w - f, tp); g.lineTo(l + w - f, tp + f); g.lineTo(l + w, tp + f); g.stroke();
    for (let i = 0; i < 5; i++) { const q = clamp(clamp(p) * 5 - i); if (q <= 0) break; g.fillStyle = i === 0 ? C.lime : 'rgba(244,241,234,0.45)'; g.fillRect(l + w * 0.14, tp + h * (0.24 + i * 0.13), (i === 0 ? 0.5 : i === 4 ? 0.45 : 0.72) * w * eo(q), Math.max(4, w * 0.04)); }
    if (o.check) check(g, l + w * 0.72, tp + h * 0.86, w * 0.12, clamp(o.check), Math.max(5, w * 0.05));
    g.restore();
  }
  function gear(g, x, y, r, a, o) {
    o = o || {}; const n = o.teeth || 8; g.save(); g.translate(x, y); g.rotate(a || 0); g.beginPath();
    for (let i = 0; i < n * 4; i++) { const an = i / (n * 4) * PI2, R = i % 4 < 2 ? r : r * 0.78; g.lineTo(Math.cos(an) * R, Math.sin(an) * R); }
    g.closePath(); g.fillStyle = C.ink; g.fill(); g.lineWidth = Math.max(3, r * 0.06); g.lineJoin = 'round'; g.strokeStyle = o.col || C.wh; g.stroke();
    g.beginPath(); g.arc(0, 0, r * 0.32, 0, PI2); g.strokeStyle = o.hub || C.lime; g.stroke(); g.restore();
  }
  function chip(g, x, y, s, t, o) {
    o = o || {}; const h = s / 2; g.save(); g.translate(x, y); g.lineWidth = Math.max(3, s * 0.03); g.strokeStyle = C.wh; g.beginPath();
    for (let i = 0; i < 4; i++) { const u = -h + s * (0.2 + i * 0.2), e = s * 0.14; g.moveTo(u, -h); g.lineTo(u, -h - e); g.moveTo(u, h); g.lineTo(u, h + e); g.moveTo(-h, u); g.lineTo(-h - e, u); g.moveTo(h, u); g.lineTo(h + e, u); }
    g.stroke(); rr(g, -h, -h, s, s, s * 0.08); g.fillStyle = C.ink; g.fill(); g.stroke();
    g.globalAlpha *= 0.45 + 0.55 * Math.abs(Math.sin(t * 3)); g.fillStyle = C.lime; g.fillRect(-s * 0.22, -s * 0.22, s * 0.44, s * 0.44); g.globalAlpha = 1;
    if (o.text) { fit(g, o.text, 900, s * 0.2, SANS, s * 0.38, 12); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = C.ink; g.fillText(o.text, 0, 0); g.textBaseline = 'alphabetic'; }
    g.restore();
  }
  function chart(g, x, y, w, h, vals, lt, t0, o) {
    o = o || {}; x = Math.max(X0, x); w = Math.min(w, X1 - x); const n = vals.length, gap = w * 0.06, bw = (w - gap * (n - 1)) / n, mx = o.max || Math.max(...vals, 1e-6);
    g.strokeStyle = C.line; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.stroke();
    vals.forEach((v, i) => { const bh = h * clamp(v / mx) * spring(lt - t0 - i * 0.06); g.fillStyle = i === (o.hi == null ? n - 1 : o.hi) ? C.lime : 'rgba(244,241,234,0.28)'; g.fillRect(x + i * (bw + gap), y - bh, bw, bh); });
  }
  function badge(g, x, y, r, s, p) {
    const k = spring(p); if (k <= 0) return; x = Math.max(X0 + r, Math.min(X1 - r, x));
    g.save(); g.translate(x, y); g.scale(k, k); g.beginPath(); g.arc(0, 0, r, 0, PI2); g.fillStyle = C.lime; g.fill();
    g.lineWidth = 3; g.strokeStyle = C.ink; g.beginPath(); g.arc(0, 0, r * 0.84, 0, PI2); g.stroke();
    fit(g, s, 900, r * 0.7, SANS, r * 1.4, 14); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = C.ink; g.fillText(s, 0, 2); g.textBaseline = 'alphabetic'; g.restore();
  }

  return { SANS, SERIF, MONO, C, X0, X1, W: 1080, H: 1920,
    clamp, lerp, prog, eo, eio, ein, back, spring, softSpring, rng, F, appear, life, count,
    prep, hits, shake, glitch, scene, scan, bg, camBegin, camEnd, wipes, frame, ch: () => _ch,
    safeCx, fit, wrap, chrome, slamLine, title, echo, typed, label, tag, bigNum,
    rr, glowAt, cursor, check, cross, dots, segBar, ring, plate, timeline, stamp, scribble, hazard, brackets, arrow,
    bot, box, doc, gear, chip, chart, badge };
})();