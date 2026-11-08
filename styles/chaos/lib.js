// lib.js
const CHAOS = (() => {
  const W = 1080, H = 1920, X0 = 60, X1 = 1020, TAU = Math.PI * 2;
  const SANS = '"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif';
  const SERIF = '"DejaVu Serif",Georgia,"Noto Serif","Times New Roman",serif';
  const MONO = '"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace';
  const C = { INK: '#15111C', CREAM: '#F6F1E9', WHITE: '#FFFFFF', PINK: '#FF3D8B', YEL: '#FFE14D', BLUE: '#2F6BFF',
    LIME: '#B6FF3B', ORA: '#FF9A1F', RED: '#FF3B30', VIO: '#7B5CFF', GRN: '#2BD96B', SKIN: '#F2B48C', NAIL: '#FFE3D3',
    SHADE: 'rgba(21,17,28,.3)' };
  const PAL = [C.PINK, C.YEL, C.BLUE, C.LIME, C.VIO, C.CREAM];
  // пары [фон сцены, цвет ключевого слова]; последняя - финал
  const PAIRS = [[C.PINK, C.YEL], [C.YEL, C.PINK], [C.BLUE, C.LIME], [C.LIME, C.PINK], [C.ORA, C.BLUE], [C.VIO, C.YEL], [C.INK, C.LIME]];

  // ---------- математика и изинги ----------
  const cl = x => (x < 0 ? 0 : x > 1 ? 1 : x);
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, p) => a + (b - a) * p;
  const prog = (u, a, d) => cl((u - a) / d);
  const eo = x => { x = cl(x); return 1 - (1 - x) ** 3; };
  const eio = x => { x = cl(x); return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
  const back = x => { x = cl(x); const c = 1.7; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
  const spr = (x, k = 6, w = 15) => (x <= 0 ? 0 : 1 - Math.exp(-k * x) * Math.cos(w * x));
  const inOut = (u, a, D, din = 0.27, dout = 0.19) => eo((u - a) / din) * (1 - eo((u - (D - dout)) / dout));
  const rnd = n => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
  const fmt = v => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  // ---------- сцены ----------
  function scenes(k, list) {
    const n = list.length, sb = k.subs || [], D = k.duration;
    return list.map((S, i) => {
      const t0 = i === 0 ? 0 : sb[i] ? sb[i].t0 : D * i / n;
      const t1 = i === n - 1 ? D : sb[i + 1] ? sb[i + 1].t0 : D * (i + 1) / n;
      return Object.assign({ t0, t1 }, S);
    });
  }
  function scene(t, SC) {
    let i = 0; while (i < SC.length - 1 && t >= SC[i + 1].t0) i++;
    const S = SC[i]; return { i, S, u: t - S.t0, D: S.t1 - S.t0, prev: i > 0 ? SC[i - 1] : null };
  }

  // ---------- примитивы ----------
  function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0, r), 0, TAU); g.fill(); }
  function rr(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function card(g, x, y, w, h, r, fill, lw = 8, off = 0) {
    if (off) { g.fillStyle = C.INK; rr(g, x + off, y + off, w, h, r); g.fill(); }
    g.fillStyle = fill; rr(g, x, y, w, h, r); g.fill();
    if (lw) { g.lineWidth = lw; g.strokeStyle = C.INK; g.lineJoin = 'round'; g.stroke(); }
  }
  function star(g, x, y, r1, r2, n = 5, rot = -Math.PI / 2) {
    for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, r = i % 2 ? r2 : r1; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    g.closePath();
  }

  // ---------- фон и фактуры ----------
  let TX = null;
  function tex() {
    if (TX) return TX;
    const d = new OffscreenCanvas(540, 960), c = d.getContext('2d'); c.fillStyle = C.INK;
    for (let y = 0; y < 960; y += 20) for (let x = (y / 20 % 2) * 10; x < 540; x += 20) { c.beginPath(); c.arc(x, y, 0.6 + 3.4 * y / 960, 0, TAU); c.fill(); }
    const n = new OffscreenCanvas(270, 480), m = n.getContext('2d'), id = m.createImageData(270, 480); let s = 12345;
    for (let i = 0; i < id.data.length; i += 4) {
      s = (Math.imul(s, 1103515245) + 12345) >>> 0; const v = s >>> 24;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
    }
    m.putImageData(id, 0, 0); TX = { d, n }; return TX;
  }
  function doodles(g, t, seed = 0, col = C.INK, al = 0.3, n = 10) {
    g.save(); g.globalAlpha = al; g.strokeStyle = col; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 0; i < n; i++) {
      const x = rnd(i + seed) * W + Math.sin(t * 0.8 + i) * 40, P = H + 300;
      const y = ((rnd(i * 3 + 1) * P - t * (60 + rnd(i + 5) * 80)) % P + P) % P - 150, r = 18 + rnd(i + 7) * 22;
      g.save(); g.translate(x, y); g.rotate(t * (i % 2 ? 1 : -1)); g.beginPath();
      if (i % 3 === 0) g.arc(0, 0, r, 0, TAU);
      else if (i % 3 === 1) { g.moveTo(-r, 0); g.lineTo(r, 0); g.moveTo(0, -r); g.lineTo(0, r); }
      else for (let k = 0; k <= 4; k++) g.lineTo(-r * 1.5 + k * r * 0.75, k % 2 ? r * 0.5 : -r * 0.5);
      g.stroke(); g.restore();
    }
    g.restore();
  }
  function bg(g, t, col, seed = 0, o = {}) {
    const T = tex(), dark = o.dark != null ? o.dark : col === C.INK;
    g.fillStyle = col; g.fillRect(0, 0, W, H);
    g.save(); g.translate(W / 2, H / 2); g.rotate(-0.45 + seed * 0.3);
    g.globalAlpha = dark ? 0.06 : 0.13; g.fillStyle = dark ? '#fff' : C.INK;
    const sh = (t * (o.speed || 70)) % 180;
    for (let i = -9; i <= 9; i++) g.fillRect(i * 180 + sh - 90, -1300, 70, 2600);
    g.restore();
    if (!dark) { g.globalAlpha = 0.08; g.drawImage(T.d, 0, 0, W, H); }
    g.globalAlpha = 1;
    if (o.doodles !== false) doodles(g, t, seed, dark ? C.LIME : C.INK, 0.3, o.n || 10);
  }
  function grain(g, t, al = 0.06) {
    const f = Math.floor(t * 30); g.globalAlpha = al; g.drawImage(tex().n, -rnd(f) * 40, -rnd(f + 1) * 40, W + 40, H + 40); g.globalAlpha = 1;
  }

  // ---------- камера и переходы ----------
  function cam(g, u, D, seed = 0, amp = 1) {
    const q = Math.exp(-u * 7) * amp, z = 1 + 0.1 * q + 0.04 * u / D;
    g.translate(W / 2 + Math.sin(u * 63 + seed) * 22 * q + Math.sin(u * 0.9 + seed) * 8, H / 2 + Math.cos(u * 51 + seed) * 18 * q);
    g.rotate(Math.sin(u * 37) * 0.03 * q + Math.sin(u * 0.7 + seed * 2) * 0.006);
    g.scale(z, z); g.translate(-W / 2, -H / 2);
  }
  function punch(g, u, at, x = 540, y = 960, amt = 0.06) {
    if (u < at) return; const s = 1 + amt * Math.exp(-(u - at) * 10);
    g.translate(x, y); g.scale(s, s); g.translate(-x, -y);
  }
  function drift(t, depth = 1, seed = 0) {
    return { x: Math.sin(t * 0.7 + seed) * 14 * depth, y: Math.cos(t * 0.53 + seed * 2) * 10 * depth };
  }
  function wipe(g, u, col, dur = 0.22) {
    if (u < 0 || u >= dur) return; const o = eo(u / dur) * (W + 800);
    g.fillStyle = col; g.beginPath(); g.moveTo(o - 300, 0); g.lineTo(o + W + 500, 0); g.lineTo(o + W + 200, H); g.lineTo(o - 600, H); g.fill();
    g.fillStyle = C.INK; g.beginPath(); g.moveTo(o - 300, 0); g.lineTo(o - 250, 0); g.lineTo(o - 550, H); g.lineTo(o - 600, H); g.fill();
  }
  function glitch(g, u, seed = 0, dur = 0.16) {
    if (u < 0 || u >= dur) return;
    g.save(); g.globalAlpha = 0.85 * (1 - u / dur);
    for (let i = 0; i < 7; i++) { g.fillStyle = PAL[i % 6]; g.fillRect((rnd(i + 3 + seed) - 0.5) * 300, rnd(i + seed * 11) * H, W, 16 + rnd(i * 5 + seed) * 70); }
    const fd = dur * 0.62; if (u < fd) { g.globalAlpha = 0.45 * (1 - u / fd); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); }
    g.restore();
  }

  // ---------- текст ----------
  function font(g, s, w = 900, fam = SANS) { g.font = `${w} ${s}px ${fam}`; }
  function fit(g, text, maxW, size, w = 900, fam = SANS) {
    font(g, size, w, fam); const m = g.measureText(text).width;
    if (m > maxW) { size = size * maxW / m * 0.99; font(g, size, w, fam); }
    return size;
  }
  function safeX(cx, w, pad = 0) { const h = w / 2 + pad; return 2 * h >= X1 - X0 ? (X0 + X1) / 2 : clamp(cx, X0 + h, X1 - h); }
  function norm(w) { return String(w).replace(/[.,:;!?«»"'()]/g, '').toUpperCase(); }
  function split(ws, sp, n) {
    const m = ws.length, mn = n === 1 ? 1 : 2; let best = null;
    const wd = (a, b) => { let s = sp * (b - a - 1); for (let i = a; i < b; i++) s += ws[i]; return s; };
    (function rec(st, left, acc, mx) {
      if (left === 1) { if (m - st < mn) return; const w = Math.max(mx, wd(st, m)); if (!best || w < best.w) best = { w, cuts: acc.concat(m) }; return; }
      for (let e = st + mn; e <= m - mn * (left - 1); e++) rec(e, left - 1, acc.concat(e), Math.max(mx, wd(st, e)));
    })(0, n, [], 0);
    return best;
  }
  const LC = new Map();
  function layout(g, text, o = {}) {
    const size = o.size || 124, maxW = Math.min(o.maxW || 860, 900), maxL = o.lines || 3, fam = o.fam || SANS, wt = o.weight || 900;
    const id = [text, size, maxW, maxL, fam, wt].join('|'); if (LC.has(id)) return LC.get(id);
    const words = String(text || '').split(/\s+/).filter(Boolean);
    if (!words.length) return { s: size, sp: 0, ws: [], words, lines: [], lw: [], w: 0 };
    font(g, size, wt, fam);
    let sp = g.measureText(' ').width, ws = words.map(w => g.measureText(w).width), best = null;
    const nMax = Math.max(1, Math.min(maxL, Math.floor(words.length / 2)));
    for (let n = 1; n <= nMax; n++) { const p = split(ws, sp, n); if (!p) continue; if (!best || p.w < best.w) best = p; if (p.w <= maxW) { best = p; break; } }
    const s = size * Math.min(1, maxW / best.w * 0.98);
    font(g, s, wt, fam); sp = g.measureText(' ').width; ws = words.map(w => g.measureText(w).width);
    const lines = []; let a = 0; best.cuts.forEach(e => { const l = []; for (let i = a; i < e; i++) l.push(i); lines.push(l); a = e; });
    const lw = lines.map(l => l.reduce((q, i) => q + ws[i], 0) + sp * (l.length - 1));
    const L = { s, sp, ws, words, lines, lw, w: Math.max(...lw) }; LC.set(id, L); return L;
  }
  function headline(g, u, o) {
    const L = layout(g, o.text, o); if (!L.lines.length) return null;
    const sz = L.s, lh = sz * (o.lh || 1.06), keys = [].concat(o.key || []).map(norm), seed = o.seed || 0;
    const cx = safeX(o.x || 540, L.w, sz * 0.12), y0 = o.y || 330, ink = o.ink || C.INK;
    const ex = o.D && o.exit !== false ? eo((u - (o.D - 0.19)) / 0.19) : 0, st = o.step || 0.18, d0 = o.at == null ? 0.05 : o.at;
    font(g, sz, o.weight || 900, o.fam || SANS); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    let j = 0;
    L.lines.forEach((l, li) => {
      let x = cx - L.lw[li] / 2; const y = y0 + li * lh;
      l.forEach(wi => {
        const w = L.words[wi], ww = L.ws[wi], wx = x + ww / 2, a = eo((u - d0 - j * st) / 0.27), key = keys.includes(norm(w));
        x += ww + L.sp; j++; if (a <= 0 || ex >= 1) return;
        const s = (1.1 - 0.1 * a) * (1 - 0.15 * ex) * (key ? 1 + 0.04 * Math.sin(u * 9) : 1), al = a * (1 - ex);
        g.save(); g.globalAlpha = al; g.translate(wx, y); g.rotate((rnd(j + seed * 7) - 0.5) * 0.07); g.scale(s, s);
        g.fillStyle = ink; g.fillText(w, 7, 9); g.lineWidth = sz * 0.15; g.strokeStyle = ink; g.strokeText(w, 0, 0);
        if (a < 1) { g.globalAlpha = al * 0.7; g.fillStyle = C.BLUE; g.fillText(w, -8, 0); g.fillStyle = C.PINK; g.fillText(w, 8, 0); g.globalAlpha = al; }
        g.fillStyle = key ? (o.kc || C.YEL) : (o.col || '#fff'); g.fillText(w, 0, 0); g.restore();
      });
    });
    return { y0, bottom: y0 + (L.lines.length - 1) * lh + sz * 0.6, size: sz, end: d0 + (j - 1) * st + 0.27 };
  }
  function caption(g, u, o) {
    const at = o.at || 0, D = o.D || 1e9, fam = o.fam || SANS, wt = o.weight || 900, ex = eo((u - (D - 0.19)) / 0.19);
    if (u < at || ex >= 1) return;
    const sz = fit(g, o.text, o.maxW || 860, o.size || 66, wt, fam), sp = g.measureText(' ').width;
    const ws = o.text.split(/\s+/).filter(Boolean), wl = ws.map(w => g.measureText(w).width), tw = g.measureText(o.text).width;
    const cx = safeX(o.x || 540, tw, o.plate ? 34 : 8), y = o.y || 1460, keys = [].concat(o.key || []).map(norm);
    g.save(); g.textAlign = 'left'; g.textBaseline = 'middle';
    if (o.plate) { g.globalAlpha = eo((u - at) / 0.25) * (1 - ex); card(g, cx - tw / 2 - 30, y - sz * 0.78, tw + 60, sz * 1.56, sz * 0.5, o.plate, 6, 8); }
    let x = cx - tw / 2;
    ws.forEach((w, i) => {
      const a = eo((u - at - 0.1 - i * (o.step || 0.12)) / 0.25) * (1 - ex);
      if (a > 0) { g.globalAlpha = a; g.fillStyle = keys.includes(norm(w)) ? (o.kc || C.YEL) : (o.col || C.CREAM); g.fillText(w, x, y + 24 * (1 - a) + sz * 0.04); }
      x += wl[i] + sp;
    });
    g.restore();
  }
  function plate(g, x, y, text, u, o = {}) {
    if (u <= 0) return 0;
    const sz = fit(g, text, o.maxW || 820, o.size || 44, o.weight || 800, o.fam || SANS), tw = g.measureText(text).width;
    const w = tw + sz * 1.2, h = sz * 1.6, s = spr(u); x = safeX(x, w, 6);
    g.save(); g.translate(x, y); g.rotate(o.rot || 0); g.scale(s, s);
    card(g, -w / 2, -h / 2, w, h, h / 2, o.bg || C.INK, o.line === false ? 0 : 6, o.off || 0);
    g.fillStyle = o.fg || C.CREAM; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 0, sz * 0.05); g.restore();
    return w;
  }
  function label(g, x, y, text, o = {}) {
    const al = o.align || 'left', mw = Math.min(o.maxW || 900, al === 'left' ? X1 - Math.max(x, X0) : 900);
    fit(g, text, mw, o.size || 28, o.weight || 700, o.fam || MONO); const w = g.measureText(text).width;
    x = al === 'left' ? Math.max(x, X0) : safeX(x, w);
    g.textAlign = al === 'left' ? 'left' : 'center'; g.textBaseline = 'middle'; g.fillStyle = o.col || C.INK;
    g.globalAlpha = o.a == null ? 1 : o.a; g.fillText(text, x, y); g.globalAlpha = 1;
  }
  function typeLine(g, x, y, text, p, o = {}) {
    const sz = fit(g, text, o.maxW || 820, o.size || 48, 700, MONO), tw = g.measureText(text).width;
    const n = Math.floor(cl(p) * text.length), x0 = safeX(x, tw + sz * 0.6, 4) - (tw + sz * 0.6) / 2, sub = text.slice(0, n);
    g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = o.col || C.INK; g.fillText(sub, x0, y);
    if (o.cursor !== false && (p < 1 || (o.t || 0) % 1 < 0.5)) g.fillRect(x0 + g.measureText(sub).width + 4, y - sz * 0.45, sz * 0.5, sz * 0.9);
  }
  function stamp(g, x, y, txt, col, u, rot = 0, o = {}) {
    if (u < 0) return;
    const f0 = o.from || 2, s = f0 - (f0 - 1) * eo(u / 0.2);
    const fs = fit(g, txt, o.maxW || 300, o.size || 60), bw = g.measureText(txt).width + 56, bh = fs * 1.66;
    const hw = (bw / 2 * Math.abs(Math.cos(rot)) + bh / 2 * Math.abs(Math.sin(rot))) * s;
    x = 2 * hw >= X1 - X0 ? 540 : clamp(x, X0 + hw, X1 - hw);
    g.save(); g.globalAlpha = Math.min(1, u / 0.1); g.translate(x, y); g.rotate(rot); g.scale(s, s);
    g.fillStyle = o.bg || '#fff'; rr(g, -bw / 2, -bh / 2, bw, bh, 18); g.fill(); g.lineWidth = 10; g.strokeStyle = col; g.stroke();
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 0, fs * 0.06); g.restore();
  }
  function hud(g, t, o = {}) {
    const a = eo((t - (o.at || 0)) / 0.3); if (a <= 0) return 0;
    const t0 = o.t0 || 0, p = Math.pow(prog(t, t0, (o.t1 || 18) - t0), o.pow || 1.35);
    const n = Math.floor(lerp(o.from || 0, o.to == null ? 1000 : o.to, p)), w = o.w || 440, x = clamp(o.x || 70, X0, X1 - w), y = o.y || 128;
    g.save(); g.globalAlpha = a; g.translate(x, y - 60 * (1 - a));
    g.fillStyle = C.INK; rr(g, 0, 0, w, 92, 46); g.fill();
    g.fillStyle = (t * 2) % 1 < 0.5 ? (o.dot || C.RED) : '#5A2020'; circ(g, 40, 46, 11);
    const ns = fmt(n) + (o.suf || ''); g.textBaseline = 'middle';
    fit(g, ns, w * 0.45, 54, 700, MONO); const nw = g.measureText(ns).width;
    g.fillStyle = o.col || C.LIME; g.textAlign = 'right'; g.fillText(ns, w - 28, 49);
    fit(g, o.label || '', w - nw - 110, 28, 700, MONO); g.fillStyle = C.CREAM; g.textAlign = 'left'; g.fillText(o.label || '', 64, 47);
    g.restore(); return n;
  }
  function bigNum(g, x, y, v, o = {}) {
    const txt = (o.pre || '') + fmt(v) + (o.suf || ''), sz = fit(g, txt, o.maxW || 860, o.size || 180), w = g.measureText(txt).width;
    x = safeX(x, w, 20); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.fillStyle = C.INK; g.fillText(txt, x + 8, y + 10); g.lineWidth = sz * 0.12; g.strokeStyle = C.INK; g.strokeText(txt, x, y);
    g.fillStyle = o.col || C.YEL; g.fillText(txt, x, y);
  }

  // ---------- фирменные приёмы ----------
  function rays(g, x, y, t, col, al = 0.3, n = 12) {
    g.save(); g.translate(x, y); g.rotate(t * 0.4); g.fillStyle = col; g.globalAlpha = al; g.beginPath();
    for (let i = 0; i < n; i++) { const a = i * TAU / n; g.moveTo(0, 0); g.lineTo(Math.cos(a - 0.1) * 1500, Math.sin(a - 0.1) * 1500); g.lineTo(Math.cos(a + 0.1) * 1500, Math.sin(a + 0.1) * 1500); g.closePath(); }
    g.fill(); g.restore();
  }
  function corners(g, x0, y0, x1, y1, L = 60, col = C.INK, lw = 12) {
    g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
    g.moveTo(x0, y0 + L); g.lineTo(x0, y0); g.lineTo(x0 + L, y0); g.moveTo(x1 - L, y0); g.lineTo(x1, y0); g.lineTo(x1, y0 + L);
    g.moveTo(x1, y1 - L); g.lineTo(x1, y1); g.lineTo(x1 - L, y1); g.moveTo(x0 + L, y1); g.lineTo(x0, y1); g.lineTo(x0, y1 - L); g.stroke();
  }
  function focus(g, cx, cy, w, h, u, col = C.INK, L = 60) {
    if (u <= 0) return; const o = 90 * (1 - eo(u / 0.3));
    g.save(); g.globalAlpha = cl(u / 0.15); corners(g, cx - w / 2 - o, cy - h / 2 - o, cx + w / 2 + o, cy + h / 2 + o, L, col); g.restore();
  }
  function ripples(g, x, y, u, col = C.INK, o = {}) {
    const n = o.n || 3, a1 = o.a1 == null ? TAU : o.a1;
    g.save(); g.strokeStyle = col; g.lineWidth = o.lw || 10; g.lineCap = 'round';
    for (let i = 0; i < n; i++) { const p = ((u * (o.speed || 1.6) + i / n) % 1 + 1) % 1; g.globalAlpha = 1 - p; g.beginPath(); g.arc(x, y, (o.r0 || 30) + p * (o.dr || 95), o.a0 || 0, a1); g.stroke(); }
    g.restore();
  }
  function burst(g, x, y, p, col = C.PINK, o = {}) {
    if (p <= 0 || p >= 1) return; const n = o.n || 8, r0 = (o.r0 || 70) + eo(p) * (o.dr || 90), L = o.len || 40;
    g.save(); g.strokeStyle = col; g.lineWidth = o.lw || 9; g.lineCap = 'round'; g.globalAlpha = 1 - p; g.beginPath();
    for (let i = 0; i < n; i++) { const a = i * TAU / n + (o.rot || 0); g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); g.lineTo(x + Math.cos(a) * (r0 + L), y + Math.sin(a) * (r0 + L)); }
    g.stroke(); g.restore();
  }
  function steam(g, x, y, u, col = '#fff', spread = 110) {
    g.save(); g.fillStyle = col;
    for (const sd of [-1, 1]) for (let j = 0; j < 3; j++) { const p = ((u * 1.3 + j / 3) % 1 + 1) % 1; g.globalAlpha = (1 - p) * 0.85; circ(g, x + sd * (spread + p * 40), y - p * 60, 14 + p * 16); }
    g.restore();
  }
  function scan(g, x, y, w, h, u, col = C.LIME, speed = 1) {
    g.globalAlpha = 0.85; g.fillStyle = col; g.fillRect(x, y + ((u * speed * h) % h + h) % h, w, 8); g.globalAlpha = 1;
  }
  function marker(g, x, y, w, h, p, col = C.YEL) { const k = eo(p); if (k <= 0) return; g.fillStyle = col; rr(g, x, y, w * k, h, h / 2); g.fill(); }
  function dotsLoad(g, x, y, t, col = C.INK, act = C.PINK, r = 10, gap = 34) {
    for (let d = 0; d < 3; d++) { g.fillStyle = d === Math.floor(t * 6) % 3 ? act : col; circ(g, x + (d - 1) * gap, y, r); }
  }
  function arrow(g, x0, y0, x1, y1, p, col = C.INK, lw = 10, bend = 0.25) {
    p = cl(p); if (p <= 0) return;
    const mx = (x0 + x1) / 2 - (y1 - y0) * bend, my = (y0 + y1) / 2 + (x1 - x0) * bend;
    const pt = q => [(1 - q) * (1 - q) * x0 + 2 * (1 - q) * q * mx + q * q * x1, (1 - q) * (1 - q) * y0 + 2 * (1 - q) * q * my + q * q * y1];
    g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
    for (let i = 0; i <= 24; i++) { const [x, y] = pt(p * i / 24); g.lineTo(x, y); } g.stroke();
    if (p > 0.85) {
      const [ax, ay] = pt(p), [bx, by] = pt(p - 0.05), a = Math.atan2(ay - by, ax - bx), L = lw * 3.2; g.beginPath();
      g.moveTo(ax - Math.cos(a - 0.5) * L, ay - Math.sin(a - 0.5) * L); g.lineTo(ax, ay); g.lineTo(ax - Math.cos(a + 0.5) * L, ay - Math.sin(a + 0.5) * L); g.stroke();
    }
  }
  function spark(g, x, y, r, col = '#fff', rot = 0) { g.fillStyle = col; g.beginPath(); star(g, x, y, r, r * 0.3, 4, rot); g.fill(); }

  // ---------- герои и предметы ----------
  function shadow(g, x, y, w, al = 0.22) { g.fillStyle = `rgba(21,17,28,${al})`; g.beginPath(); g.ellipse(x, y, w, w * 0.17, 0, 0, TAU); g.fill(); }
  function bodyPath(g, kind, t) {
    if (kind === 'box') { rr(g, -160, -125, 320, 250, 44); return; }
    g.beginPath();
    if (kind === 'drop') {
      g.moveTo(0, -180); g.bezierCurveTo(70, -110, 160, -40, 155, 30); g.bezierCurveTo(150, 110, 80, 135, 0, 135);
      g.bezierCurveTo(-80, 135, -150, 110, -155, 30); g.bezierCurveTo(-160, -40, -70, -110, 0, -180); g.closePath();
    } else if (kind === 'blob') {
      for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU, r = 145 + 9 * Math.sin(a * 5 + t * 3); g.lineTo(Math.cos(a) * r * 1.07, Math.sin(a) * r * 0.92); }
      g.closePath();
    } else g.ellipse(0, 0, 158, 135, 0, 0, TAU);
  }
  // o: body egg|blob|drop|box, col, top sprout|antenna|ears|tuft|none, acc, face smile|talk|boil|wink|shock|sleep|happy, look -1..1, arms, wave, glasses, line, tilt
  function mascot(g, x, y, s, t, o = {}) {
    if (s <= 0) return;
    const col = o.col || C.BLUE, f = o.face || 'smile', ln = o.line || C.INK, top = o.top || 'sprout', acc = o.acc || C.YEL, ax = Math.sin(t * 5) * 18;
    g.save(); g.translate(x, y); shadow(g, 0, 178 * s, 130 * s);
    const b = Math.sin(t * 7) * 0.04; g.scale(s * (1 - b), s * (1 + b)); g.rotate(Math.sin(t * 2.3) * 0.05 + (o.tilt || 0));
    g.lineWidth = 12; g.strokeStyle = ln; g.lineJoin = 'round'; g.lineCap = 'round'; g.fillStyle = acc;
    if (top === 'antenna') { g.beginPath(); g.moveTo(0, -120); g.quadraticCurveTo(ax * 0.3, -170, ax, -200); g.stroke(); circ(g, ax, -206, 20); g.stroke(); }
    else if (top === 'sprout') {
      g.beginPath(); g.moveTo(0, -120); g.quadraticCurveTo(ax * 0.3, -165, ax * 0.6, -190); g.stroke();
      for (const sd of [-1, 1]) { g.save(); g.translate(ax * 0.6, -190); g.rotate(sd * 0.5); g.beginPath(); g.ellipse(sd * 30, -8, 32, 15, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); }
    } else if (top === 'ears') for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 50, -110); g.lineTo(sd * (120 + ax * 0.3), -200); g.lineTo(sd * 140, -60); g.closePath(); g.fill(); g.stroke(); }
    else if (top === 'tuft') { g.beginPath(); for (let i = -1; i <= 1; i++) { g.moveTo(i * 30, -125); g.quadraticCurveTo(i * 40 + ax * 0.4, -175, i * 55 + ax * 0.8, -185); } g.stroke(); }
    if (o.arms) for (const sd of [-1, 1]) {
      const w = sd === 1 && o.wave ? Math.sin(t * 12) * 0.5 - 0.7 : 0.35;
      g.save(); g.translate(sd * 148, 30); g.rotate(sd * w); g.beginPath(); g.moveTo(0, 0); g.lineTo(sd * 60, 30); g.stroke();
      g.fillStyle = col; circ(g, sd * 66, 34, 18); g.stroke(); g.restore();
    }
    g.fillStyle = col; bodyPath(g, o.body || 'egg', t); g.fill(); g.lineWidth = 12; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.3)'; rr(g, -110, -98, 110, 30, 15); g.fill();
    g.fillStyle = o.cheek || C.PINK; g.globalAlpha = 0.55; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * 105, 48, 24, 14, 0, 0, TAU); g.fill(); }
    g.globalAlpha = 1; const bl = (t % 3.3) < 0.1;
    for (const sd of [-1, 1]) {
      const ex = sd * 62, ey = -22; g.lineWidth = 10; g.beginPath();
      if (f === 'sleep') { g.moveTo(ex - 28, ey - 4); g.quadraticCurveTo(ex, ey + 18, ex + 28, ey - 4); g.stroke(); continue; }
      if (f === 'happy' || (f === 'wink' && sd === 1) || (bl && f !== 'boil' && f !== 'shock')) { g.moveTo(ex - 30, ey + 6); g.quadraticCurveTo(ex, ey - 26, ex + 30, ey + 6); g.stroke(); continue; }
      g.fillStyle = '#fff'; g.lineWidth = 8; g.ellipse(ex, ey, 40, 46, 0, 0, TAU); g.fill(); g.stroke();
      if (f === 'boil') { g.lineWidth = 6; g.beginPath(); for (let a = 0; a < 14; a += 0.35) { const r = a * 2.4; g.lineTo(ex + Math.cos(a + t * 14 * sd) * r, ey + Math.sin(a + t * 14 * sd) * r); } g.stroke(); }
      else { const px = ex + (o.look != null ? o.look * 14 : Math.sin(t * 1.7) * 12), py = ey + 6, pr = f === 'shock' ? 11 : 19; g.fillStyle = ln; circ(g, px, py, pr); g.fillStyle = '#fff'; circ(g, px + pr * 0.37, py - pr * 0.42, pr * 0.32); }
    }
    if (o.glasses) { g.lineWidth = 8; g.strokeStyle = ln; for (const sd of [-1, 1]) { rr(g, sd * 62 - 52, -78, 104, 110, 30); g.stroke(); } g.beginPath(); g.moveTo(-10, -30); g.lineTo(10, -30); g.stroke(); }
    g.lineWidth = 9; g.fillStyle = ln; g.beginPath();
    if (f === 'talk') { g.ellipse(0, 58, 30, 8 + 16 * Math.abs(Math.sin(t * 17)), 0, 0, TAU); g.fill(); }
    else if (f === 'boil') { for (let i = 0; i <= 8; i++) g.lineTo(-36 + i * 9, 58 + (i % 2 ? 8 : -8)); g.stroke(); }
    else if (f === 'shock') { g.ellipse(0, 62, 20, 26, 0, 0, TAU); g.fill(); }
    else if (f === 'sleep') { g.moveTo(-16, 58); g.lineTo(16, 58); g.stroke(); }
    else if (f === 'happy') { g.arc(0, 32, 40, 0.15, Math.PI - 0.15); g.closePath(); g.fill(); }
    else { g.arc(0, 34, 36, 0.5, 2.64); g.stroke(); }
    g.restore();
  }
  function hand(g, x, y, rot = 0, s = 1, press = 0) {
    const k = s * (1 - 0.08 * press); g.save(); g.translate(x, y); g.rotate(rot); g.scale(k, k);
    g.strokeStyle = C.INK; g.lineWidth = 8; g.lineJoin = 'round'; g.lineCap = 'round';
    card(g, -60, 170, 150, 170, 60, C.SKIN, 8);
    g.beginPath(); for (let i = 0; i < 2; i++) { g.moveTo(45, 225 + i * 45); g.lineTo(88, 225 + i * 45); } g.stroke();
    card(g, -38, 0, 76, 260, 38, C.SKIN, 8);
    g.fillStyle = C.NAIL; rr(g, -22, 10, 44, 44, 16); g.fill(); g.restore();
  }
  function phone(g, x, y, s, t, o = {}) {
    const n = Math.min(o.rows == null ? 4 : o.rows, 4), done = !!o.done;
    g.save(); g.translate(x, y); g.rotate((o.rot || 0) + Math.sin(t * 1.2) * 0.015); g.scale(s, s);
    g.fillStyle = C.INK; rr(g, -250, -430, 500, 860, 64); g.fill();
    g.fillStyle = o.screen || C.CREAM; rr(g, -224, -400, 448, 800, 44); g.fill();
    g.fillStyle = o.acc || C.VIO; rr(g, -190, -360, 380, 60, 30); g.fill();
    for (let i = 0; i < n; i++) {
      const yy = -260 + i * 110; card(g, -190, yy, 380, 84, 22, '#fff', 5);
      g.fillStyle = PAL[(i + (o.seed || 0)) % 5]; circ(g, -145, yy + 42, 22); g.fillStyle = C.SHADE;
      rr(g, -105, yy + 22, 200 - i * 20, 16, 8); g.fill(); rr(g, -105, yy + 48, 120, 14, 7); g.fill();
    }
    card(g, -170, 250, 340, 100, 50, done ? C.GRN : (o.btn || C.BLUE), 7);
    g.save(); g.translate(0, 300); glyph(g, done ? 'check' : 'arrow', 30, '#fff', 12); g.restore();
    if (o.ping != null && !done) ripples(g, 0, 300, o.ping, C.PINK, { r0: 30, dr: 110, lw: 8, speed: 1.2 });
    g.restore(); return { x, y: y + 300 * s };
  }
  function sheet(g, x, y, s, t, o = {}) {
    const n = Math.min(o.rows || 8, 8), rd = o.read || 0;
    g.save(); g.translate(x, y); g.rotate((o.rot == null ? -0.05 : o.rot) + Math.sin(t * 1.5) * 0.012); g.scale(s, s);
    g.fillStyle = C.INK; rr(g, -246, -306, 520, 640, 26); g.fill();
    card(g, -260, -320, 520, 640, 26, o.paper || C.CREAM, 8);
    g.fillStyle = o.acc || C.PINK; rr(g, -210, -275, 260, 44, 22); g.fill();
    g.fillStyle = o.acc2 || C.ORA; g.beginPath(); g.arc(170, -255, 42, 0, Math.PI); g.closePath(); g.fill(); g.stroke();
    for (let i = 0; i < n; i++) {
      const yy = -190 + i * 60, w = 410 - rnd(i + 2 + (o.seed || 0)) * 150;
      if (i < rd) { g.fillStyle = o.hl || C.YEL; rr(g, -216, yy - 8, (i + 1 <= rd ? w : w * (rd - i)) + 12, 38, 19); g.fill(); }
      g.fillStyle = C.SHADE; rr(g, -210, yy, w, 22, 11); g.fill();
    }
    if (o.scan != null) scan(g, -250, -300, 500, 600, o.scan, C.LIME, 0.87);
    g.restore();
  }
  function glyph(g, kind, r, col = C.INK, lw = 8) {
    g.fillStyle = col; g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
    switch (kind) {
      case 'tri': g.moveTo(-r, r * 0.9); g.lineTo(0, -r); g.lineTo(r, r * 0.9); g.closePath(); g.fill(); break;
      case 'zig': for (let k = 0; k <= 5; k++) g.lineTo(-r * 1.4 + k * r * 0.56, k % 2 ? r * 0.6 : -r * 0.6); g.stroke(); break;
      case 'bars': for (let k = 0; k < 3; k++) g.rect(-r * 1.3 + k * r * 1.1, -r, r * 0.55, r * 2); g.fill(); break;
      case 'ring': g.arc(0, 0, r, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, r * 0.3, 0, TAU); g.fill(); break;
      case 'check': g.moveTo(-r * 0.8, 0); g.lineTo(-r * 0.2, r * 0.6); g.lineTo(r * 0.9, -r * 0.6); g.stroke(); break;
      case 'cross': g.moveTo(-r * 0.7, -r * 0.7); g.lineTo(r * 0.7, r * 0.7); g.moveTo(r * 0.7, -r * 0.7); g.lineTo(-r * 0.7, r * 0.7); g.stroke(); break;
      case 'dash': g.moveTo(-r * 0.8, 0); g.lineTo(r * 0.8, 0); g.stroke(); break;
      case 'plus': g.moveTo(-r * 0.8, 0); g.lineTo(r * 0.8, 0); g.moveTo(0, -r * 0.8); g.lineTo(0, r * 0.8); g.stroke(); break;
      case 'arrow': g.moveTo(-r * 0.8, 0); g.lineTo(r * 0.8, 0); g.moveTo(r * 0.2, -r * 0.6); g.lineTo(r * 0.8, 0); g.lineTo(r * 0.2, r * 0.6); g.stroke(); break;
      case 'star': star(g, 0, 0, r, r * 0.45, 5); g.fill(); break;
      case 'wave': for (let k = 0; k <= 16; k++) g.lineTo(-r * 1.3 + k * r * 2.6 / 16, Math.sin(k * 0.8) * r * 0.4); g.stroke(); break;
      default: g.arc(0, 0, r, 0, TAU); g.fill();
    }
  }
  function tile(g, x, y, w, h, o = {}) {
    const fl = o.flip == null ? 1 : o.flip, s = o.s == null ? 1 : o.s; if (s <= 0) return;
    g.save(); g.translate(x, y); g.scale(s * Math.max(0.05, Math.abs(fl)), s);
    g.fillStyle = o.col || C.YEL; g.strokeStyle = C.INK; g.lineWidth = 7; rr(g, -w / 2, -h / 2, w, h, 20); g.fill(); g.stroke();
    if (o.glyph) glyph(g, o.glyph, Math.min(w, h) * 0.24, C.INK, 8);
    if (o.num != null) { g.fillStyle = C.INK; g.font = `700 24px ${MONO}`; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(String(o.num).padStart(2, '0'), -w / 2 + 14, -h / 2 + 11); }
    g.restore();
  }
  function badge(g, x, y, r, kind, col = C.GRN, p = 1) {
    if (p <= 0) return; g.save(); g.translate(x, y); g.scale(p, p);
    g.fillStyle = col; g.strokeStyle = C.INK; g.lineWidth = 9; circ(g, 0, 0, r); g.stroke();
    glyph(g, kind, r * 0.5, '#fff', r * 0.22); g.restore();
  }
  function chat(g, x, y, w, h, t, o = {}) {
    const s = o.s == null ? 1 : o.s; if (s <= 0) return; const tl = o.tail === 'r' ? 1 : -1;
    g.save(); g.translate(x, y); g.scale(s, s); g.rotate(o.rot || 0);
    g.fillStyle = C.INK; rr(g, -w / 2 + 10, -h / 2 + 12, w, h, h * 0.45); g.fill();
    g.fillStyle = o.col || '#fff'; g.strokeStyle = C.INK; g.lineWidth = 7; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(tl * w * 0.2, h / 2 - 4); g.lineTo(tl * w * 0.42, h / 2 + 34); g.lineTo(tl * w * 0.05, h / 2 - 4); g.fill(); g.stroke();
    rr(g, -w / 2, -h / 2, w, h, h * 0.45); g.fill(); g.stroke();
    if (o.lines) { g.fillStyle = C.SHADE; for (let i = 0; i < o.lines; i++) { rr(g, -w * 0.38, -h * 0.25 + i * 30, w * (0.76 - 0.2 * rnd(i + 9)), 16, 8); g.fill(); } }
    else for (let d = 0; d < 3; d++) { g.fillStyle = d === (Math.floor(t * 6) + (o.seed || 0)) % 3 ? C.PINK : C.INK; circ(g, (d - 1) * w * 0.24, 0, h * 0.11); }
    g.restore();
  }
  // kind: carton|jar|pot|bottle|cup|box; (x,y) - низ предмета
  function item(g, x, y, s, kind, col = C.ORA, col2 = C.CREAM) {
    g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = C.INK; g.lineWidth = 8; g.lineJoin = 'round'; g.fillStyle = col;
    if (kind === 'carton') {
      rr(g, -90, -260, 180, 260, 10); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-90, -260); g.lineTo(0, -320); g.lineTo(90, -260); g.closePath(); g.fillStyle = col2; g.fill(); g.stroke();
      g.fillRect(-90, -170, 180, 60); g.strokeRect(-90, -170, 180, 60);
    } else if (kind === 'jar') { rr(g, -80, -240, 160, 240, 28); g.fill(); g.stroke(); g.fillStyle = col2; g.fillRect(-80, -160, 160, 70); g.strokeRect(-80, -160, 160, 70); }
    else if (kind === 'pot') { rr(g, -95, -210, 190, 210, 44); g.fill(); g.stroke(); g.fillStyle = C.INK; rr(g, -70, -250, 140, 44, 10); g.fill(); g.fillStyle = col2; circ(g, 0, -100, 40); g.stroke(); }
    else if (kind === 'bottle') { rr(g, -30, -300, 60, 90, 14); g.fill(); g.stroke(); rr(g, -80, -230, 160, 230, 40); g.fill(); g.stroke(); g.fillStyle = col2; g.fillRect(-80, -150, 160, 60); g.strokeRect(-80, -150, 160, 60); }
    else if (kind === 'cup') {
      g.beginPath(); g.arc(88, -120, 42, -1.3, 1.3); g.stroke();
      g.beginPath(); g.moveTo(-90, -200); g.lineTo(90, -200); g.lineTo(65, 0); g.lineTo(-65, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = col2; circ(g, 0, -100, 34); g.stroke();
    } else { g.fillRect(-100, -190, 200, 190); g.strokeRect(-100, -190, 200, 190); g.fillStyle = col2; g.fillRect(-20, -190, 40, 190); g.strokeRect(-20, -190, 40, 190); }
    g.restore();
  }
  function shelf(g, x0, x1, y, col = C.CREAM) { card(g, Math.max(x0, 0), y, Math.min(x1, W) - Math.max(x0, 0), 36, 10, col, 8); }

  // ---------- звук ----------
  function sfx(s, E, jit = 0.2) {
    E.forEach((e, i) => s.play(Math.max(0, e[0]), e[1], clamp(e[2] || 0.12, 0.05, 0.3),
      { pitch: clamp((e[3] || 1) * (1 - jit / 2 + s.rand(i + 1) * jit), 0.5, 2) }));
  }

  return { W, H, TAU, SANS, SERIF, MONO, C, PAL, PAIRS, cl, clamp, lerp, prog, eo, eio, back, spr, inOut, rnd, fmt,
    scenes, scene, circ, rr, card, star, tex, bg, doodles, grain, cam, punch, drift, wipe, glitch,
    font, fit, safeX, norm, layout, headline, caption, plate, label, typeLine, stamp, hud, bigNum,
    rays, corners, focus, ripples, burst, steam, scan, marker, dotsLoad, arrow, spark,
    shadow, mascot, hand, phone, sheet, glyph, tile, badge, chat, item, shelf, sfx };
})();