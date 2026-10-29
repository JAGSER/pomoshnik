// «Детская книжка» — библиотека стиля BOOK для роликов draw(t, k) на Canvas 2D 1080×1920.
// Тёплая бумага с зерном, акварельные заливки с рваным краем и тёмной каймой пигмента, тонкая «рукописная» тушь,
// мягкие объёмные формы (солнце, облака, холмы), свой перьевой шрифт с кириллицей (буквы пишутся штрихами),
// капелька-герой со сжатием-растяжением, листание страниц и акварельные склейки.
// Web Worker: только OffscreenCanvas; кадр считается из t; кэшируются лишь текстуры и спрайты. Углы — в градусах.
const BOOK = (() => {
  const W = 1080, H = 1920, PI = Math.PI, TAU = PI * 2, DEG = PI / 180;
  const P = {
    paper: '#EFE8DB', paperL: '#F8F3EA', paperD: '#DCD1BE', page: '#E7DDCB',
    ink: '#2C2B3A', navy: '#27305A', grey: '#7E7988', soft: '#B9B2A6',
    coral: '#E5573F', coralL: '#F2957C', sun: '#F5C443', sunL: '#FCE59A', orange: '#EE9A30',
    grass: '#9FCB7B', grassD: '#6EA659', leaf: '#5E9F57', moss: '#86B96B',
    teal: '#4E9F9C', mint: '#AADCC8', lav: '#AFB6E0', lavD: '#8C93C8',
    water: '#58B3E4', waterD: '#2D7DBE', waterL: '#B6E2F6', deep: '#3474B4',
    pink: '#EE8EA6', rose: '#F7C6CF', plum: '#8E6BB0', brown: '#7B5E48',
    cloudS: '#D3DAEC', night: '#171A48', dusk: '#4A3F92', magenta: '#C25E98', peach: '#F6A97A', gold: '#F9D48E',
    cold: '#6F86B8', coldL: '#BCC8E4', snow: '#F5F8FF',
  };
  const F = { sans: '"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif',
    serif: '"DejaVu Serif",Georgia,"Noto Serif","Times New Roman",serif',
    mono: '"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace' };
  let G = null, K = null, T = 0, SCR = [0, 0], CAM = { x: 540, y: 960, z: 1 }, TX = null;

  // ---------- время, изинги, шум ----------
  const cl = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
  const pr = (t, a, b) => b === a ? (t >= a ? 1 : 0) : cl((t - a) / (b - a));
  const lerp = (a, b, p) => a + (b - a) * p;
  const eo = p => 1 - Math.pow(1 - cl(p), 3);
  const ei = p => Math.pow(cl(p), 3);
  const eio = p => { p = cl(p); return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  const eb = (p, c = 1.6) => { p = cl(p); return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
  const spring = (x, f = 1.8, d = 6) => x <= 0 ? 0 : 1 - Math.exp(-d * x) * Math.cos(TAU * f * x);
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const noise = (x, seed = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), o = seed * 71.37; return (hash(i + o) * (1 - u) + hash(i + 1 + o) * u) * 2 - 1; };
  const rnd = seed => { let s = ((Math.floor(seed * 7919) ^ 0x5bd1e995) >>> 0) || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
  const kf = (A, t, e = eio) => {
    const f = (a, b, p) => Array.isArray(a) ? a.map((v, i) => lerp(v, b[i], p)) : lerp(a, b, p);
    if (t <= A[0][0]) return A[0][1];
    for (let i = 0; i < A.length - 1; i++) { const a = A[i], b = A[i + 1]; if (t < b[0]) return f(a[1], b[1], e(pr(t, a[0], b[0]))); }
    return A[A.length - 1][1];
  };
  const when = (s, word) => { const tx = s.text.toLowerCase(), i = tx.indexOf(String(word).toLowerCase()), d = s.t1 - s.t0; return i < 0 ? s.t0 : s.t0 + Math.max(d * .8, d - .45) * i / tx.length; };

  // ---------- цвет ----------
  const CC = new Map();
  const rgb = c => { let v = CC.get(c); if (!v) { if (c[0] === 'r') v = c.slice(c.indexOf('(') + 1).split(',').slice(0, 3).map(Number); else { const h = c[0] === '#' ? c.slice(1) : c; v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; } if (CC.size < 4000) CC.set(c, v); } return v; };
  const h2 = v => { v = Math.round(cl(v, 0, 255)); return (v < 16 ? '0' : '') + v.toString(16); };
  const mix = (a, b, p) => { const A = rgb(a), B = rgb(b); p = cl(p); return '#' + h2(lerp(A[0], B[0], p)) + h2(lerp(A[1], B[1], p)) + h2(lerp(A[2], B[2], p)); };
  const rgba = (c, a) => { const A = rgb(c); return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + cl(+a).toFixed(3) + ')'; };
  const shade = (c, k) => k < 0 ? mix(c, '#1B1A33', -k) : mix(c, '#FFFFFF', k);

  // ---------- текстуры (один раз; маленькие OffscreenCanvas) ----------
  const mk = (w, h, op) => { const c = new OffscreenCanvas(w, h); return [c, c.getContext('2d', op ? { alpha: false } : undefined)]; };
  function tex() {
    if (TX) return TX;
    TX = {};
    const N = 512, [gc, x] = mk(N, N), r = rnd(11);
    const wrap = fn => { for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) fn(ox, oy); };
    for (let i = 0; i < 40; i++) {
      const px = r() * N, py = r() * N, rr = 50 + r() * 150, a = .012 + r() * .03;
      wrap((ox, oy) => { const X = px + ox, Y = py + oy; if (X + rr < 0 || X - rr > N || Y + rr < 0 || Y - rr > N) return;
        const gr = x.createRadialGradient(X, Y, 0, X, Y, rr); gr.addColorStop(0, 'rgba(120,90,55,' + a + ')'); gr.addColorStop(1, 'rgba(120,90,55,0)');
        x.fillStyle = gr; x.fillRect(X - rr, Y - rr, rr * 2, rr * 2); });
    }
    x.lineCap = 'round';
    for (let i = 0; i < 260; i++) {
      const px = r() * N, py = r() * N, a = r() * TAU, l = 5 + r() * 18, bend = (r() - .5) * 8, al = .04 + r() * .08, lw = .5 + r() * .8;
      wrap((ox, oy) => { const X = px + ox, Y = py + oy; if (X + l < 0 || X - l > N || Y + l < 0 || Y - l > N) return;
        x.strokeStyle = 'rgba(105,80,50,' + al + ')'; x.lineWidth = lw; x.beginPath(); x.moveTo(X, Y);
        x.quadraticCurveTo(X + Math.cos(a) * l / 2 - Math.sin(a) * bend, Y + Math.sin(a) * l / 2 + Math.cos(a) * bend, X + Math.cos(a) * l, Y + Math.sin(a) * l); x.stroke(); });
    }
    const im = x.getImageData(0, 0, N, N), d = im.data;
    for (let i = 0; i < d.length; i += 4) { const v = r() * 20 + (r() < .012 ? 30 : 0), al = d[i + 3] / 255, A = cl(al + v / 255), k = A ? (v / 255) / A : 0;
      d[i] = d[i] * (1 - k) + 95 * k; d[i + 1] = d[i + 1] * (1 - k) + 72 * k; d[i + 2] = d[i + 2] * (1 - k) + 45 * k; d[i + 3] = A * 255; }
    x.putImageData(im, 0, 0); TX.grain = gc;

    const [sc, s] = mk(128, 128), g1 = s.createRadialGradient(64, 64, 0, 64, 64, 64);
    g1.addColorStop(0, 'rgba(70,52,45,.42)'); g1.addColorStop(.55, 'rgba(70,52,45,.16)'); g1.addColorStop(1, 'rgba(70,52,45,0)'); s.fillStyle = g1; s.fillRect(0, 0, 128, 128); TX.shadow = sc;
    const [lc, l] = mk(128, 128), g2 = l.createRadialGradient(64, 64, 0, 64, 64, 64);
    g2.addColorStop(0, 'rgba(255,250,232,.95)'); g2.addColorStop(.3, 'rgba(255,246,220,.5)'); g2.addColorStop(1, 'rgba(255,240,210,0)'); l.fillStyle = g2; l.fillRect(0, 0, 128, 128); TX.glow = lc;
    return TX;
  }

  // ---------- кадр, слои, камера ----------
  function begin(t, k) {
    K = k; G = k.g; T = t; SCR = [0, 0]; CAM = { x: 540, y: 960, z: 1 }; tex();
    G.setTransform(1, 0, 0, 1, 0, 0); G.globalAlpha = 1; G.globalCompositeOperation = 'source-over'; G.lineCap = 'round'; G.lineJoin = 'round';
    return G;
  }
  function page() { if (TX.page) return TX.page; const [c, x] = mk(W, H, true); x.fillStyle = P.paper; x.fillRect(0, 0, W, H);
    const lg = x.createRadialGradient(W * .5, H * .42, 0, W * .5, H * .42, H * .6); lg.addColorStop(0, 'rgba(255,253,247,.45)'); lg.addColorStop(1, 'rgba(255,253,247,0)'); x.fillStyle = lg; x.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 512) for (let xx = 0; xx < W; xx += 512) x.drawImage(TX.grain, xx, y);
    const v = x.createRadialGradient(W / 2, H * .45, H * .3, W / 2, H * .5, H * .8); v.addColorStop(0, 'rgba(90,68,45,0)'); v.addColorStop(1, 'rgba(90,68,45,.2)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
    return (TX.page = c); }
  function end(g, o = {}) { // последний вызов кадра: сброс состояния; o.grain — зерно бумаги поверх всего (0…1, дорого)
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over';
    if (o.grain) { g.globalAlpha = o.grain; for (let y = 0; y < H; y += 512) for (let x = 0; x < W; x += 512) g.drawImage(TX.grain, x, y); }
    g.restore();
  }
  const view = () => { const z = CAM.z; return { x0: CAM.x - W / 2 / z, x1: CAM.x + W / 2 / z, y0: CAM.y - H / 2 / z, y1: CAM.y + H / 2 / z }; };
  function screen(g, fn) { const c = CAM; g.save(); g.setTransform(1, 0, 0, 1, SCR[0], SCR[1]); CAM = { x: W / 2, y: H / 2, z: 1 }; fn(g); CAM = c; g.restore(); }
  const off = (x, y, m) => { const v = view(); return x < v.x0 - m || x > v.x1 + m || y < v.y0 - m || y > v.y1 + m; };
  function layer(g, f, fn) { const c = CAM; g.save(); g.translate((c.x - W / 2) * (1 - f), (c.y - H / 2) * (1 - f)); CAM = { x: W / 2 + (c.x - W / 2) * f, y: H / 2 + (c.y - H / 2) * f, z: c.z }; fn(g); CAM = c; g.restore(); }
  function shake(g, lt, t0, amp = 12, dur = .35) { const q = lt - t0; if (q < 0 || q > dur) return; const k = amp * (1 - q / dur); g.translate(noise(q * 30, 3) * k, noise(q * 30, 7) * k); }
  const TRD = { turn: .62, bloom: .55, pan: .5, rise: .7, cut: 0 };
  function drawSc(g, sc, lt, off, info) {
    SCR = off; g.save(); g.setTransform(1, 0, 0, 1, off[0], off[1]);
    let cx = 540, cy = 960, z = 1;
    if (sc.cam) { const v = kf(sc.cam, lt); cx = v[0]; cy = v[1]; z = v[2] ?? 1; }
    if (sc.tr === 'cut' || sc.settle) z *= 1 + (sc.bump ?? .07) * (1 - spring(lt, 1.5, 5.5));
    z *= 1 + (sc.push ?? .012) * lt;
    CAM = { x: cx, y: cy, z };
    g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-cx, -cy);
    sc.draw(g, lt, info);
    g.restore(); SCR = [0, 0]; CAM = { x: 540, y: 960, z: 1 };
  }
  function half(poly, f) { // Сазерленд–Ходжмен: оставить часть многоугольника, где f(x,y) <= 0
    const out = [], n = poly.length >> 1;
    for (let i = 0; i < n; i++) {
      const ax = poly[2 * i], ay = poly[2 * i + 1], j = (i + 1) % n, bx = poly[2 * j], by = poly[2 * j + 1], fa = f(ax, ay), fb = f(bx, by);
      if (fa <= 0) out.push(ax, ay);
      if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) { const s = fa / (fa - fb); out.push(ax + (bx - ax) * s, ay + (by - ay) * s); }
    }
    return out;
  }
  function clipPoly(g, pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.clip(); }
  function frozen(list, i, at) { // уходящая страница, застывшая в момент склейки at (один кэш, детерминированно)
    const F = TX.fz || (TX.fz = { i: -1, at: -1 });
    if (!TX.frz) { TX.frz = new OffscreenCanvas(W, H); TX.frzX = TX.frz.getContext('2d', { alpha: false }); }
    if (F.i === i && F.at === at) return TX.frz;
    const x = TX.frzX, t0 = T, pv = list[i], plt = at - pv.at; x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    x.fillStyle = '#F6F1E9'; x.fillRect(0, 0, W, H); x.lineCap = 'round'; x.lineJoin = 'round';
    T = at; drawSc(x, pv, plt, [0, 0], { i, lt: plt, dur: plt, p: 1, t: at, out: true }); T = t0; F.i = i; F.at = at; return TX.frz;
  }
  function turnFx(g, q, img) { // перелистывание: старая страница загибается от правого нижнего угла и уходит влево
    const e = eio(q), ang = (16 + 12 * e) * DEG, nx = Math.cos(ang), ny = Math.sin(ang), fx = lerp(W + 240, -1000, e), fy = H * .56;
    const f = (x, y) => (x - fx) * nx + (y - fy) * ny, rect = [-2, -2, W + 2, -2, W + 2, H + 2, -2, H + 2], keep = half(rect, f), lift = half(rect, (x, y) => -f(x, y));
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    if (lift.length >= 6) { g.fillStyle = 'rgba(60,42,28,.11)'; for (const d of [45, 90, 140]) { const sb = half(lift, (x, y) => f(x, y) - d); if (sb.length >= 6) { path(g, sb, true); g.fill(); } } }
    if (keep.length >= 6) { g.save(); clipPoly(g, keep); g.drawImage(img, 0, 0); g.restore(); }
    if (lift.length >= 6) {
      const fl = []; for (let i = 0; i < lift.length; i += 2) { const d = f(lift[i], lift[i + 1]); fl.push(lift[i] - 2 * d * nx, lift[i + 1] - 2 * d * ny); }
      path(g, fl, true); g.fillStyle = '#ECE3D3'; g.fill();
      const lb = half(fl, (x, y) => -f(x, y) - 190); if (lb.length >= 6) { g.fillStyle = 'rgba(255,253,247,.55)'; path(g, lb, true); g.fill(); }
      const cb = half(fl, (x, y) => -f(x, y) - 34); if (cb.length >= 6) { g.fillStyle = 'rgba(110,85,55,.22)'; path(g, cb, true); g.fill(); }
    }
    g.restore();
  }
  function play(g, t, list) { // сцены [{at, draw(g, lt, info), tr:'turn'|'bloom'|'pan'|'rise'|'cut', d, x, y, cam, settle, push}]
    let i = 0; while (i < list.length - 1 && t >= list[i + 1].at) i++;
    const sc = list[i], lt = t - sc.at, nx = list[i + 1], end_ = nx ? nx.at : (K ? K.duration : 35);
    const inf = { i, lt, dur: end_ - sc.at, p: cl(lt / (end_ - sc.at)), t };
    const d = sc.d ?? TRD[sc.tr] ?? 0;
    if (i > 0 && d > 0 && lt < d && sc.tr !== 'cut') {
      const pv = list[i - 1], pinf = { i: i - 1, lt: t - pv.at, dur: sc.at - pv.at, p: 1, t, out: true };
      if (lt < 1e-6) { const im = frozen(list, i - 1, sc.at); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(im, 0, 0); g.restore(); return pinf; } // кадр склейки: старая страница целиком
      const q = lt / d, img = frozen(list, i - 1, sc.at); inf.in = true;
      if (sc.tr === 'turn') { drawSc(g, sc, lt, [0, 0], inf); turnFx(g, q, img); }
      else if (sc.tr === 'bloom') {
        drawSc(g, sc, lt, [0, 0], inf);
        const R = lerp(10, 2500, eo(q)), pts = blob(sc.x ?? 540, sc.y ?? 960, R, R, sc.seed || 3, .14, 44), n = pts.length >> 1;
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.beginPath(); g.rect(-4, -4, W + 8, H + 8);
        g.moveTo((pts[2 * n - 2] + pts[0]) / 2, (pts[2 * n - 1] + pts[1]) / 2);
        for (let k = 0; k < n; k++) { const j = (k + 1) % n; g.quadraticCurveTo(pts[2 * k], pts[2 * k + 1], (pts[2 * k] + pts[2 * j]) / 2, (pts[2 * k + 1] + pts[2 * j + 1]) / 2); }
        g.closePath(); g.clip('evenodd'); g.drawImage(img, 0, 0); g.restore();
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0); path(g, pts, true, true); g.lineWidth = 18; g.strokeStyle = rgba(sc.rim || P.waterD, .3 * (1 - q)); g.stroke(); g.restore();
      } else {
        const e = eio(q), v = sc.tr === 'pan', a = v ? [-Math.round(W * e), 0] : [0, Math.round(H * e)], b = v ? [a[0] + W, 0] : [0, a[1] - H];
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(img, a[0], a[1]); g.restore(); drawSc(g, sc, lt, b, inf);
        if (!v && sc.seam !== false) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); const sy = H * e; for (let k = -1; k < 6; k++) cloud(g, k * 230 + 40 + (k % 2) * 60, sy + 120 + (k % 2) * 40, 1.05 - (k % 2) * .2, { seed: k + 7, tint: sc.seamTint || 'white' }); g.restore(); }
      }
    } else drawSc(g, sc, lt, [0, 0], inf);
    return inf;
  }

  // ---------- фоны ----------
  function paper(g, col, o = {}) { if (typeof col === 'object') { o = col; col = null; } const h = Math.round(cl(o.y1 ?? H, 1, H)); g.save(); g.setTransform(1, 0, 0, 1, Math.round(SCR[0]), Math.round(SCR[1]));
    if (h < H) { g.beginPath(); g.rect(-4, -4, W + 8, h + 4); g.clip(); } if (col) { g.fillStyle = col; g.fillRect(-4, -4, W + 8, H + 8); } else g.drawImage(page(), 0, 0); g.restore(); }
  const SKIES = { day: ['#BCDDEF', '#DDEDF0', '#F1EADC'], warm: ['#F6BE8A', '#F9D9AE', '#F6E9D3'], dawn: ['#8FA9E0', '#EDB2B6', '#F9D7A2'],
    dusk: ['#3D3889', '#A8579A', '#EE9686', '#F8CB95'], night: ['#11143D', '#22225E', '#38357F'], cold: ['#4E6098', '#8695C2', '#C6CDE6'],
    storm: ['#5A6186', '#8E94B2', '#C9CBDA'], rain: ['#43478A', '#8A69A8', '#E3929C', '#F6C59A'] };
  function skyStrip(st) { const key = 's' + st.join(''); if (TX[key]) return TX[key]; const [c, x] = mk(1, 512, true), gr = x.createLinearGradient(0, 0, 0, 512);
    st.forEach((cc, i) => gr.addColorStop(i / (st.length - 1), cc)); x.fillStyle = gr; x.fillRect(0, 0, 1, 512); return (TX[key] = c); }
  function sky(g, kind = 'day', o = {}) { // вертикальный градиент на весь кадр; o.y0/o.y1 — в мировых координатах (для подъёма камеры)
    const st = Array.isArray(kind) ? kind : SKIES[kind] || SKIES.day, sp = skyStrip(st); g.save();
    if (o.y0 != null) { const v = view(), x0 = v.x0 - 20, w = v.x1 - v.x0 + 40;
      if (v.y0 < o.y0) { g.fillStyle = st[0]; g.fillRect(x0, v.y0 - 20, w, o.y0 - v.y0 + 22); }
      if (v.y1 > o.y1) { g.fillStyle = st[st.length - 1]; g.fillRect(x0, o.y1 - 2, w, v.y1 - o.y1 + 22); }
      const a = Math.max(o.y0, v.y0 - 20), b = Math.min(o.y1, v.y1 + 20); if (b > a) g.drawImage(sp, 0, (a - o.y0) / (o.y1 - o.y0) * 512, 1, (b - a) / (o.y1 - o.y0) * 512, x0, a, w, b - a); }
    else { g.setTransform(1, 0, 0, 1, SCR[0], SCR[1]); g.drawImage(sp, -4, -4, W + 8, H + 8); }
    g.restore();
  }

  // ---------- геометрия ----------
  function path(g, pts, closed = true, smooth = false) {
    const n = pts.length >> 1; g.beginPath(); if (n < 2) return;
    if (!smooth) { g.moveTo(pts[0], pts[1]); for (let i = 1; i < n; i++) g.lineTo(pts[2 * i], pts[2 * i + 1]); }
    else if (closed) {
      g.moveTo((pts[2 * n - 2] + pts[0]) / 2, (pts[2 * n - 1] + pts[1]) / 2);
      for (let i = 0; i < n; i++) { const j = (i + 1) % n; g.quadraticCurveTo(pts[2 * i], pts[2 * i + 1], (pts[2 * i] + pts[2 * j]) / 2, (pts[2 * i + 1] + pts[2 * j + 1]) / 2); }
    } else {
      g.moveTo(pts[0], pts[1]);
      for (let i = 1; i < n - 1; i++) g.quadraticCurveTo(pts[2 * i], pts[2 * i + 1], (pts[2 * i] + pts[2 * i + 2]) / 2, (pts[2 * i + 1] + pts[2 * i + 3]) / 2);
      g.lineTo(pts[2 * n - 2], pts[2 * n - 1]);
    }
    if (closed) g.closePath();
  }
  const plen = pts => { let L = 0; for (let i = 2; i < pts.length; i += 2) L += Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]); return L; };
  function cut(pts, p) {
    if (p >= 1) return pts; const L = plen(pts) * cl(p), out = [pts[0], pts[1]]; let acc = 0;
    for (let i = 2; i < pts.length; i += 2) {
      const s = Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]);
      if (acc + s >= L) { const f = s ? (L - acc) / s : 0; out.push(pts[i - 2] + (pts[i] - pts[i - 2]) * f, pts[i - 1] + (pts[i + 1] - pts[i - 1]) * f); return out; }
      acc += s; out.push(pts[i], pts[i + 1]);
    }
    return out;
  }
  function resample(pts, step = 12) {
    const out = [pts[0], pts[1]];
    for (let i = 2; i < pts.length; i += 2) { const x0 = pts[i - 2], y0 = pts[i - 1], x1 = pts[i], y1 = pts[i + 1], m = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step)); for (let k = 1; k <= m; k++) out.push(x0 + (x1 - x0) * k / m, y0 + (y1 - y0) * k / m); }
    return out;
  }
  function spline(pts, n = 8, closed = false) { // Катмулл–Ром через точки → плотная ломаная
    const m = pts.length >> 1, out = [], ix = i => closed ? ((i % m) + m) % m : Math.max(0, Math.min(m - 1, i));
    for (let i = 0; i < (closed ? m : m - 1); i++) {
      const a = ix(i - 1), b = ix(i), c = ix(i + 1), d = ix(i + 2);
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        const cr = (A, B, C, D) => .5 * (2 * B + (-A + C) * t + (2 * A - 5 * B + 4 * C - D) * t2 + (-A + 3 * B - 3 * C + D) * t3);
        out.push(cr(pts[2 * a], pts[2 * b], pts[2 * c], pts[2 * d]), cr(pts[2 * a + 1], pts[2 * b + 1], pts[2 * c + 1], pts[2 * d + 1]));
      }
    }
    if (!closed) out.push(pts[2 * m - 2], pts[2 * m - 1]);
    return out;
  }
  function follow(pts, f) { // точка и угол (радианы) на доле f длины ломаной
    const L = plen(pts) * cl(f); let acc = 0;
    for (let i = 2; i < pts.length; i += 2) {
      const dx = pts[i] - pts[i - 2], dy = pts[i + 1] - pts[i - 1], s = Math.hypot(dx, dy);
      if (acc + s >= L || i === pts.length - 2) { const q = s ? cl((L - acc) / s) : 0; return { x: pts[i - 2] + dx * q, y: pts[i - 1] + dy * q, a: Math.atan2(dy, dx) }; }
      acc += s;
    }
    return { x: pts[0], y: pts[1], a: 0 };
  }
  function rough(pts, amp = 6, seed = 1, step = 24, closed = true) { // рваный край: точки по нормали с плавным шумом
    const out = [], n = pts.length >> 1; let acc = 0;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const j = (i + 1) % n, x0 = pts[2 * i], y0 = pts[2 * i + 1], x1 = pts[2 * j], y1 = pts[2 * j + 1], L = Math.hypot(x1 - x0, y1 - y0) || 1, m = Math.max(1, Math.ceil(L / step)), nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
      for (let s = 0; s < m; s++) { const f = s / m, d = (noise(acc * .045, seed) + .45 * noise(acc * .17, seed + 3)) * amp; out.push(x0 + (x1 - x0) * f + nx * d, y0 + (y1 - y0) * f + ny * d); acc += L / m; }
    }
    if (!closed) out.push(pts[2 * n - 2], pts[2 * n - 1]);
    return out;
  }
  function blob(cx, cy, rx, ry, seed = 1, amp = .08, n = 36) {
    const a1 = hash(seed) * TAU, a2 = hash(seed + 1) * TAU, a3 = hash(seed + 2) * TAU, out = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU, r = 1 + amp * (.55 * Math.sin(3 * a + a1) + .3 * Math.sin(5 * a + a2) + .2 * Math.sin(9 * a + a3)); out.push(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r); }
    return out;
  }
  function arcPts(cx, cy, r, a0, a1, n = 24, ry) { const out = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n) * DEG; out.push(cx + Math.cos(a) * r, cy + Math.sin(a) * (ry ?? r)); } return out; }
  function bbox(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i < pts.length; i += 2) { const x = pts[i], y = pts[i + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return { x0, y0, x1, y1 }; }

  // ---------- кисти: тушь и акварель ----------
  let IX = new Float64Array(2048), IY = new Float64Array(2048), IA = new Float64Array(2048);
  function ink(g, pts, o = {}) { // линия туши переменной толщины: o.w, o.col, o.p (доля), o.taper, o.jit, o.seed
    if (o.p != null && o.p <= 0) return;
    const q = o.p != null && o.p < 1 ? cut(pts, o.p) : pts, st = o.step || 12, rs = o.rs !== false; let n = 0;
    for (let i = 0; i < q.length; i += 2) {
      const x1 = q[i], y1 = q[i + 1], m = i && rs ? Math.max(1, Math.ceil(Math.hypot(x1 - q[i - 2], y1 - q[i - 1]) / st)) : 1;
      if (n + m + 2 > IX.length) { const L = (n + m) * 2 + 64, a = new Float64Array(L), b = new Float64Array(L), c = new Float64Array(L); a.set(IX); b.set(IY); c.set(IA); IX = a; IY = b; IA = c; }
      if (!i || m === 1) { IX[n] = x1; IY[n] = y1; n++; } else { const x0 = q[i - 2], y0 = q[i - 1]; for (let k = 1; k <= m; k++) { IX[n] = x0 + (x1 - x0) * k / m; IY[n] = y0 + (y1 - y0) * k / m; n++; } }
    }
    if (n < 2) return;
    const w = (o.w || 4) / 2, ta = o.taper ?? .3, sd = o.seed || 0, jit = o.jit ?? .22; let tot = 0; IA[0] = 0;
    for (let i = 1; i < n; i++) { tot += Math.hypot(IX[i] - IX[i - 1], IY[i] - IY[i - 1]); IA[i] = tot; }
    const side = (i, sg) => { const i0 = i ? i - 1 : 0, i1 = i < n - 1 ? i + 1 : n - 1; let dx = IX[i1] - IX[i0], dy = IY[i1] - IY[i0]; const l = Math.hypot(dx, dy) || 1;
      const f = tot ? IA[i] / tot : 0, pf = ta > 0 ? Math.pow(cl(Math.min(f, 1 - f) / ta), .55) * .8 + .2 : 1, hw = w * pf * (1 + jit * noise(IA[i] * .05, sd)) * sg / l;
      g.lineTo(IX[i] - dy * hw, IY[i] + dx * hw); };
    g.beginPath(); for (let i = 0; i < n; i++) side(i, 1); for (let i = n - 1; i >= 0; i--) side(i, -1); g.closePath();
    g.fillStyle = o.col || P.ink; g.fill();
  }
  function outline(g, pts, o = {}) { const n = pts.length >> 1, k = Math.max(2, Math.round(n * (o.over ?? .07))), q = pts.concat(pts.slice(0, 2 * k)); ink(g, q, Object.assign({ taper: .12 }, o)); }
  function wash(g, pts, col, o = {}) { // акварельная заливка: цвет + светлое пятно внутри + тёмная кайма пигмента по краю
    g.save(); if (o.a != null) g.globalAlpha *= o.a;
    path(g, pts, true, o.smooth ?? true); g.fillStyle = col; g.fill();
    if (o.light) { const b = bbox(pts), w = b.x1 - b.x0, h = b.y1 - b.y0; g.fillStyle = 'rgba(255,255,255,' + (o.light * .55).toFixed(3) + ')';
      path(g, blob(lerp(b.x0, b.x1, o.lx ?? .4), lerp(b.y0, b.y1, o.ly ?? .36), w * (o.lw ?? .24), h * (o.lh ?? .2), (o.seed || 1) + 5, .16, 22), true, true); g.fill();
      path(g, pts, true, o.smooth ?? true); }
    const rim = o.rim ?? 7; if (rim > 0) { g.lineWidth = rim; g.strokeStyle = rgba(shade(col, -.3), o.rimA ?? .4); g.stroke(); }
    g.restore();
  }
  function swash(g, x, yc, w, h, col, p = 1, seed = 1) { // мазок-подсветка за словом (рисуется слева направо)
    if (p <= 0 || w <= 0) return; const x1 = x + w * eo(p), n = Math.max(2, Math.ceil((x1 - x) / 22)), top = [], bot = [];
    for (let i = 0; i <= n; i++) { const xx = lerp(x, x1, i / n), e = Math.min(1, (xx - x) / (h * .6) + .45, (x1 - xx) / (h * .5) + .5), sl = (xx - x) * .025;
      top.push(xx, yc - sl - h / 2 * e * (.86 + .14 * noise(xx * .02, seed))); bot.push(xx, yc - sl + h / 2 * e * (.86 + .14 * noise(xx * .02, seed + 5))); }
    g.save(); g.fillStyle = col; g.beginPath(); g.moveTo(top[0], top[1]);
    for (let i = 2; i < top.length; i += 2) g.lineTo(top[i], top[i + 1]); for (let i = bot.length - 2; i >= 0; i -= 2) g.lineTo(bot[i], bot[i + 1]);
    g.closePath(); g.fill(); g.restore();
  }
  function underline(g, x0, x1, y, p = 1, o = {}) { const pts = []; for (let i = 0; i <= 20; i++) { const f = i / 20; pts.push(lerp(x0, x1, f), y + Math.sin(f * PI) * (o.bow ?? 7) - f * (o.rise ?? 10) + noise(f * 4, o.seed || 2) * 2); } ink(g, pts, { w: o.w || 7, col: o.col || P.navy, p, taper: .45, jit: .15 }); }
  function hatch(g, x, y, r, o = {}) { // короткие дуговые штрихи внутри круглой формы (крона, солнце)
    g.save(); g.strokeStyle = o.col || 'rgba(40,40,60,.35)'; g.lineWidth = o.w || Math.max(2, r * .035); g.beginPath();
    const n = o.n || 6; for (let i = 0; i < n; i++) { const a = (o.a0 ?? 10) * DEG + i * (o.da ?? 16) * DEG, rr = r * (.5 + (i % 3) * .14); g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); g.quadraticCurveTo(x + Math.cos(a + .1) * (rr + r * .06), y + Math.sin(a + .1) * (rr + r * .06), x + Math.cos(a + .2) * (rr + r * .05), y + Math.sin(a + .2) * (rr + r * .05)); }
    g.stroke(); g.restore();
  }

  // ---------- пейзаж ----------
  const waveY = (x, y0, amp = 14, sp = 1) => y0 + Math.sin(x * .011 + T * sp * 1.7) * amp + Math.sin(x * .027 - T * sp * 2.3) * amp * .4;
  function sea(g, y0, o = {}) { // море от линии y0 вниз (мировые координаты): полосы синей акварели, завитки, линия воды
    const v = view(), x0 = (o.x0 ?? v.x0) - 40, x1 = (o.x1 ?? v.x1) + 40, yb = Math.max(v.y1 + 60, y0 + 300), amp = o.amp ?? 14, sp = o.sp ?? 1, cols = o.cols || [P.waterL, P.water, P.deep], bh = o.band || 170;
    const edge = b => { const pts = [], yy = y0 + b * bh, ph = b * 1.7; for (let x = Math.floor(x0 / 30) * 30; x <= x1 + 30; x += 30) pts.push(x, b ? yy + Math.sin(x * .009 + T * sp * (1.1 + b * .3) + ph) * amp * .8 + Math.sin(x * .023 - T * sp * 1.5 + ph) * amp * .35 : waveY(x, y0, amp, sp)); return pts; };
    let top = edge(0);
    for (let b = 0; b < cols.length; b++) {
      const last = b === cols.length - 1, nx = last ? null : edge(b + 1), pts = top.slice();
      if (last) pts.push(top[top.length - 2], yb, top[0], yb); else for (let i = nx.length - 2; i >= 0; i -= 2) pts.push(nx[i], nx[i + 1] + 3);
      wash(g, pts, cols[b], { rim: b ? 0 : 8, smooth: false }); top = nx;
    }
    g.save(); g.strokeStyle = rgba(o.line || P.waterD, .5); g.lineWidth = 3.4; g.beginPath(); const cell = 190;
    for (let i = Math.floor(x0 / cell); i <= Math.ceil(x1 / cell); i++) for (let b = 0; b <= cols.length; b++) {
      const hx = i * cell + hash(i * 3.1 + b) * 90 + Math.sin(T * .8 * sp + i + b) * 16, hy = y0 + 50 + b * bh * .8 + hash(i * 5.7 + b) * bh * .5; if (hy > yb - 20) continue;
      const s = 18 + hash(i + b * 9) * 14; g.moveTo(hx - s, hy); g.quadraticCurveTo(hx - s / 2, hy + s * .5, hx, hy); g.quadraticCurveTo(hx + s / 2, hy + s * .5, hx + s, hy);
    }
    g.stroke(); g.restore();
    const tl = []; for (let x = Math.floor(x0 / 24) * 24; x <= x1 + 24; x += 24) tl.push(x, waveY(x, y0, amp, sp));
    ink(g, tl, { w: o.lw || 4.5, col: o.ink || P.waterD, taper: 0, jit: .3 });
    if (o.glint !== false) { g.save(); g.fillStyle = 'rgba(255,255,255,.85)'; for (let i = Math.floor(x0 / 210); i <= x1 / 210; i++) { const tw = Math.sin(T * 3 + i * 2.1); if (tw < .2) continue; sparkle(g, i * 210 + hash(i) * 120, y0 + 30 + hash(i + 4) * 120, 9 * tw, '#FFFFFF'); } g.restore(); }
  }
  function ground(g, fy, o = {}) { // холм: заливка под кривой fy(x), тушь сверху с травинками; o.p — прорисовка слева направо
    const v = view(), x0 = o.x0 ?? v.x0 - 30, x1 = o.x1 ?? v.x1 + 30, st = o.step || 24, yb = o.y1 ?? v.y1 + 80, pts = [];
    for (let x = Math.floor(x0 / st) * st; x <= x1 + st; x += st) pts.push(x, fy(x));
    const p = o.p ?? 1, xp = lerp(x0, x1, p), poly = pts.concat([pts[pts.length - 2], yb, pts[0], yb]), col = o.col || P.grass;
    g.save(); if (p < 1) { g.beginPath(); g.rect(x0 - 60, -1e5, xp - x0 + 60, 2e5); g.clip(); }
    wash(g, poly, col, { rim: 10, smooth: false });
    if (o.streaks !== false) { g.fillStyle = 'rgba(255,255,240,.14)';
      for (let i = Math.floor(x0 / 150); i <= x1 / 150; i++) { const sx = i * 150 + hash(i * 1.3) * 100, l = 60 + hash(i) * 90, sy = Math.max(fy(sx - l), fy(sx), fy(sx + l)) + 46 + hash(i * 2.9) * 240;
        if (sy < yb - 20) { g.beginPath(); g.ellipse(sx, sy, l, 6 + hash(i * 7) * 7, -.18, 0, TAU); g.fill(); } } }
    g.restore();
    if (o.line !== false) ink(g, pts, { w: o.w || 4.6, col: o.ink || P.ink, p, taper: .02, seed: o.seed || 2 });
    if (o.ticks !== false) { g.save(); g.strokeStyle = o.ink || P.ink; g.lineWidth = 2.6; g.beginPath();
      for (let i = Math.floor(x0 / 44); i <= x1 / 44; i++) { const x = i * 44 + hash(i * 1.7) * 20; if (x > xp) break; const y = fy(x), s = 7 + hash(i * 3.1) * 10; if (hash(i * 5.3) < .3) continue;
        g.moveTo(x, y - 1); g.lineTo(x - s * .35, y - s); g.moveTo(x + 5, y - 1); g.lineTo(x + 6 + s * .2, y - s * 1.15); }
      g.stroke(); g.restore(); }
  }
  function hill(g, fy, col, o = {}) { // дальний холм: плоская заливка с рваным верхом, без туши
    const v = view(), x0 = o.x0 ?? v.x0 - 40, x1 = o.x1 ?? v.x1 + 40, yb = o.y1 ?? v.y1 + 80, pts = [];
    for (let x = Math.floor(x0 / 30) * 30; x <= x1 + 30; x += 30) pts.push(x, fy(x) + noise(x * .03, o.seed || 4) * 4);
    wash(g, pts.concat([pts[pts.length - 2], yb, pts[0], yb]), col, { rim: o.rim ?? 8, smooth: false, light: o.light ?? 0 });
  }
  function mountains(g, x0, x1, yb, o = {}) { // горная гряда со снежными шапками
    const r = rnd(o.seed || 5), h0 = o.h || 520, col = o.col || P.lav; let x = x0, k = 0;
    while (x < x1) {
      const w = lerp(420, 640, r()), h = h0 * lerp(.72, 1.08, r()), cx = x + w / 2, top = yb - h, vv = view();
      if (x > vv.x1 + 20 || x + w < vv.x0 - 20) { x += w * (.55 + r() * .15); k++; continue; }
      wash(g, rough([x, yb, cx - w * .1, top + h * .07, cx, top, cx + w * .12, top + h * .09, x + w, yb], 6, k + 3, 30, true), col, { rim: 0, smooth: false });
      g.fillStyle = rgba(shade(col, -.35), .22); g.beginPath(); g.moveTo(cx, top); g.lineTo(cx + w * .12, top + h * .09); g.lineTo(x + w, yb); g.lineTo(cx + w * .06, yb); g.closePath(); g.fill();
      if (o.snow !== false) { const s = .27, Lx = cx + (x - cx) * s, Rx = cx + (x + w - cx) * s, Y = top + h * s;
        g.fillStyle = '#FBFCFF'; g.beginPath(); g.moveTo(cx, top - 2); g.lineTo(Rx, Y); g.lineTo(lerp(Rx, Lx, .25), Y - 22); g.lineTo(lerp(Rx, Lx, .45), Y + 12); g.lineTo(lerp(Rx, Lx, .7), Y - 18); g.lineTo(Lx, Y + 4); g.closePath(); g.fill(); }
      ink(g, [x + w * .14, yb - h * .3, cx - w * .1, top + h * .07, cx, top], { w: 3.4, taper: .5, col: o.ink || rgba(P.ink, .8) });
      x += w * (.55 + r() * .15); k++;
    }
  }
  function fields(g, x0, x1, y0, y1, o = {}) { // лоскутные поля с бороздами
    const r = rnd(o.seed || 8), cols = o.cols || ['#E9CF6F', P.grass, '#C8D978', P.mint, '#F0DB95', P.moss]; let x = x0, i = 0;
    while (x < x1) {
      const w = lerp(170, 320, r()), sk = (r() - .5) * 130, jt = (r() - .5) * 26, poly = [x, y0 + jt, x + w, y0 - jt, x + w + sk, y1, x + sk, y1], vv = view();
      if (x + Math.min(0, sk) > vv.x1 + 20 || x + w + Math.max(0, sk) < vv.x0 - 20) { x += w; i++; continue; }
      wash(g, poly, cols[i % cols.length], { rim: 5, smooth: false });
      g.strokeStyle = 'rgba(60,50,40,.18)'; g.lineWidth = 2.6; g.beginPath();
      for (let k = 1; k < 6; k++) { const f = k / 6; g.moveTo(x + w * f, y0 + lerp(jt, -jt, f) + 8); g.lineTo(x + sk + w * f, y1 - 4); } g.stroke();
      x += w; i++;
    }
  }
  function tree(g, x, y, s = 1, o = {}) { // дерево: kind 'round' | 'pine' | 'lolly'; (x,y) — основание ствола
    if (off(x, y - 150 * s, 330 * s)) return; const kind = o.kind || 'round', sw = Math.sin(T * 1.3 + x * .01) * (o.sway ?? 1.6) * DEG, c = o.col || (kind === 'pine' ? '#3F7D5A' : P.teal);
    g.save(); g.translate(x, y); g.rotate(sw); g.scale(s, s);
    if (kind === 'pine') {
      ink(g, [0, 0, 0, -60], { w: 8, col: P.brown, taper: 0 });
      for (let i = 0; i < 3; i++) { const yb = -40 - i * 62, w = 92 - i * 20, ht = 110 - i * 8; wash(g, rough([-w, yb, 0, yb - ht, w, yb], 3, i + 2, 20), c, { rim: 6, smooth: false, light: .15 }); ink(g, [-w * .2, yb - ht * .3, 0, yb - ht], { w: 2.6, col: rgba(P.ink, .6), taper: .5 }); }
    } else {
      ink(g, [0, 0, 1, -80, -2, -150], { w: 7, col: P.ink, taper: .1 }); ink(g, [0, -95, 26, -128], { w: 4, col: P.ink, taper: .4 });
      const cy = kind === 'lolly' ? -230 : -215, rr = kind === 'lolly' ? 80 : 98;
      wash(g, blob(0, cy, rr, rr * (kind === 'lolly' ? 1 : .92), o.seed || 4, .07, 30), c, { rim: 10, light: .3, lx: .3, ly: .25 });
      hatch(g, 0, cy, rr, { col: rgba(shade(c, -.4), .45), a0: 5, da: 18, n: 6 });
    }
    g.restore();
  }
  function leaf(g, x, y, s = 1, o = {}) { // лист: основание в (x,y), направлен по o.rot (градусы), длина 100·s
    g.save(); g.translate(x, y); g.rotate((o.rot || 0) * DEG); g.scale(s, s); const c = o.col || P.leaf;
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(38, -36, 100, 0); g.quadraticCurveTo(38, 36, 0, 0); g.fillStyle = c; g.fill();
    g.strokeStyle = rgba(shade(c, -.4), .8); g.lineWidth = 3; g.beginPath(); g.moveTo(4, 0); g.quadraticCurveTo(50, -3, 92, 0); g.stroke();
    if (o.outline) { g.strokeStyle = P.ink; g.lineWidth = 2.6; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(38, -36, 100, 0); g.quadraticCurveTo(38, 36, 0, 0); g.stroke(); }
    g.restore();
  }
  function flower(g, x, y, s = 1, o = {}) { // цветок: kind 'daisy' | 'tulip'; o.bloom 0..1 (лепестки раскрываются), o.droop 0..1 (поник), o.h, o.col
    if (off(x, y - 130 * s, 260 * s)) return; const dr = cl(o.droop || 0), bl = o.bloom ?? 1, h = (o.h || 260) * s, sw = Math.sin(T * 1.6 + x * .02) * 4 * (1 - dr);
    const tx = x + (dr * 80 + sw) * s, ty = y - h * (1 - dr * .32), stem = spline([x, y, x + dr * 34 * s, y - h * .55, tx, ty], 6);
    if (o.fill != null) { ink(g, stem, { w: 8 * s, col: P.leaf, taper: .15 }); ink(g, stem, { w: 6.5 * s, col: P.water, taper: 0, p: o.fill, jit: 0 }); }
    else ink(g, stem, { w: 8 * s, col: mix(P.leaf, '#9A9a6a', dr * .6), taper: .15 });
    leaf(g, x + 2 * s, y - h * .28, .62 * s, { rot: -32 - dr * 30, col: mix(P.leaf, '#A3A06A', dr * .6) }); leaf(g, x, y - h * .18, .55 * s, { rot: 205 + dr * 30, col: mix(P.leaf, '#A3A06A', dr * .6) });
    g.save(); g.translate(tx, ty); g.rotate((dr * 105 + sw * .6) * DEG); g.scale(s, s);
    const pc = mix(o.col || (o.kind === 'tulip' ? P.coral : '#FFFFFF'), '#C9C1B0', dr * .7);
    if (o.kind === 'tulip') {
      const e = eb(cl(bl)); g.scale(e, e);
      wash(g, [-34, -10, -40, -58, -18, -40, 0, -70, 18, -40, 40, -58, 34, -10, 0, 6], pc, { rim: 6, smooth: true, light: .25 });
      outline(g, [-34, -10, -40, -58, -18, -40, 0, -70, 18, -40, 40, -58, 34, -10, 0, 6], { w: 2.8, col: P.ink });
    } else {
      const np = 11; for (let i = 0; i < np; i++) { const e = eb(cl(bl * (np + 3) / 3 - i / 3)); if (e <= 0) continue; const a = i / np * TAU;
        g.save(); g.rotate(a); g.scale(e, e); g.beginPath(); g.ellipse(0, -44, 13, 30, 0, 0, TAU); g.fillStyle = pc; g.fill(); g.lineWidth = 2.4; g.strokeStyle = P.ink; g.stroke(); g.restore(); }
      g.beginPath(); g.arc(0, 0, 21 * eb(cl(bl * 2)), 0, TAU); g.fillStyle = P.sun; g.fill(); g.lineWidth = 2.6; g.strokeStyle = P.ink; g.stroke();
      g.fillStyle = 'rgba(200,120,30,.6)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(Math.cos(i * 1.3) * 9, Math.sin(i * 1.3) * 9, 2.4, 0, TAU); g.fill(); }
    }
    g.restore();
  }
  function tuft(g, x, y, s = 1, o = {}) { if (off(x, y, 60 * s)) return; g.save(); g.strokeStyle = o.col || P.grassD; g.lineWidth = 3.4 * s; g.beginPath();
    for (let i = -2; i <= 2; i++) { const a = i * .32 + Math.sin(T * 2 + x * .05) * .06, l = (34 - Math.abs(i) * 6) * s; g.moveTo(x + i * 4 * s, y); g.quadraticCurveTo(x + i * 6 * s, y - l * .6, x + Math.sin(a) * l + i * 4 * s, y - Math.cos(a) * l); }
    g.stroke(); g.restore(); }
  function river(g, pts, w, o = {}) { // река по осевой ломаной: w — ширина (число или f→ширина), течение — бегущие блики
    const n = pts.length >> 1, L = [], R = [], wf = typeof w === 'function' ? w : () => w;
    for (let i = 0; i < n; i++) { const i0 = i ? i - 1 : 0, i1 = i < n - 1 ? i + 1 : n - 1; let dx = pts[2 * i1] - pts[2 * i0], dy = pts[2 * i1 + 1] - pts[2 * i0 + 1]; const l = Math.hypot(dx, dy) || 1, hw = wf(i / (n - 1)) / 2;
      L.push(pts[2 * i] - dy / l * hw, pts[2 * i + 1] + dx / l * hw); R.push(pts[2 * i] + dy / l * hw, pts[2 * i + 1] - dx / l * hw); }
    const poly = L.slice(); for (let i = n - 1; i >= 0; i--) poly.push(R[2 * i], R[2 * i + 1]);
    wash(g, poly, o.col || P.water, { rim: o.rim ?? 9, smooth: false, light: o.light ?? .18 });
    if (o.banks !== false) { ink(g, L, { w: o.bw || 4, col: o.ink || P.ink, taper: .05 }); ink(g, R, { w: o.bw || 4, col: o.ink || P.ink, taper: .05 }); }
    const m = o.n ?? 16; if (!m) return; const tot = plen(pts), sp = o.sp ?? 140; g.save(); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = o.fw || 4; g.beginPath();
    for (let k = 0; k < m; k++) { const f0 = ((k / m) + hash(k * 3.3) * .05 + T * sp / tot) % 1, f1 = Math.min(1, f0 + (30 + hash(k) * 40) / tot), a = follow(pts, f0), b = follow(pts, f1), lane = (hash(k * 2.3) - .5) * .55 * wf(f0);
      g.moveTo(a.x - Math.sin(a.a) * lane, a.y + Math.cos(a.a) * lane); g.lineTo(b.x - Math.sin(b.a) * lane, b.y + Math.cos(b.a) * lane); }
    g.stroke(); g.restore();
  }

  // ---------- небо ----------
  function sun(g, x, y, r, o = {}) { // солнце: свечение, лучи-штрихи, мягкий диск, штриховка; o.face — настроение лица
    const rot = (o.rot ?? T * 9) * DEG;
    const kg = 'sunG' + Math.round(r), kd = 'sunD' + Math.round(r), R2 = Math.ceil(r * 1.6), R1 = Math.ceil(r + 2);
    if (!TX[kg]) { const [c, x2] = mk(R2 * 2, R2 * 2); x2.drawImage(TX.glow, 0, 0, R2 * 2, R2 * 2); TX[kg] = c;
      const [d, x3] = mk(R1 * 2, R1 * 2), gr = x3.createRadialGradient(R1 - r * .3, R1 - r * .35, r * .1, R1, R1, r * 1.05); gr.addColorStop(0, P.sunL); gr.addColorStop(.6, P.sun); gr.addColorStop(1, '#F0A438');
      x3.fillStyle = gr; x3.beginPath(); x3.arc(R1, R1, r, 0, TAU); x3.fill(); hatch(x3, R1, R1, r, { col: 'rgba(226,128,30,.5)', a0: 15, da: 17 }); TX[kd] = d; }
    if (o.glow !== false) { g.save(); g.globalAlpha *= o.glowA ?? .7; g.drawImage(TX[kg], x - R2, y - R2); g.restore(); }
    const n = o.n || 14; g.save(); g.strokeStyle = o.ray || P.orange; g.lineWidth = Math.max(3, r * .075); g.beginPath();
    for (let i = 0; i < n; i++) { const a = rot + i / n * TAU, l = r * (i % 2 ? .28 : .46) * (1 + .12 * Math.sin(T * 3 + i * 1.7)) * (o.rays ?? 1), r0 = r * 1.2; g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); g.lineTo(x + Math.cos(a) * (r0 + l), y + Math.sin(a) * (r0 + l)); }
    g.stroke(); g.restore();
    g.drawImage(TX[kd], x - R1, y - R1);
    if (o.face) face(g, x, y + r * .05, r * .95, { mood: o.face, ink: o.ink || '#5A3A20', seed: 9 });
  }
  function moonSpr() { if (TX.moon) return TX.moon; const [c, x] = mk(256, 256), gr = x.createRadialGradient(128, 128, 30, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,250,225,.55)'); gr.addColorStop(1, 'rgba(255,250,225,0)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
    const [m, y] = mk(256, 256); y.fillStyle = '#FFF7DA'; y.beginPath(); y.arc(128, 128, 62, 0, TAU); y.fill(); y.globalCompositeOperation = 'destination-out'; y.beginPath(); y.arc(158, 106, 56, 0, TAU); y.fill();
    x.drawImage(m, 0, 0); TX.moon = c; return c; }
  function moon(g, x, y, r = 80, o = {}) { const s = r / 62; g.save(); if (o.a != null) g.globalAlpha *= o.a; g.drawImage(moonSpr(), x - 128 * s, y - 128 * s, 256 * s, 256 * s); g.restore(); }
  function sparkle(g, x, y, r, col) { const k = r * .14; g.fillStyle = col || '#FFF7DC'; g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x + k, y - k, x + r, y); g.quadraticCurveTo(x + k, y + k, x, y + r); g.quadraticCurveTo(x - k, y + k, x - r, y); g.quadraticCurveTo(x - k, y - k, x, y - r); g.fill(); }
  function stars(g, o = {}) { // звёздное поле (мерцает): o.n, o.x0..x1, o.y0..y1, o.big — доля крупных
    const r = rnd(o.seed || 21), n = o.n || 40, a = o.a ?? 1; g.save();
    for (let i = 0; i < n; i++) { const x = lerp(o.x0 ?? 0, o.x1 ?? W, r()), y = lerp(o.y0 ?? 0, o.y1 ?? H * .6, r()), big = r() < (o.big ?? .3), ph = r() * TAU, sz = big ? 9 + r() * 12 : 2 + r() * 3, tw = .6 + .4 * Math.sin(T * (2 + i % 3) + ph);
      g.globalAlpha = a * (big ? 1 : .35 + .65 * tw); if (big) sparkle(g, x, y, sz * (.7 + .3 * tw), o.col); else { g.fillStyle = o.col || '#FFF7DC'; g.beginPath(); g.arc(x, y, sz, 0, TAU); g.fill(); } }
    g.restore(); }
  const CT = { white: ['#FFFFFF', '#CFD7EB'], grey: ['#D6DBE8', '#8F9BBC'], warm: ['#FFF5EE', '#F0B4A8'], night: ['#E4E8F8', '#99A2D3'], cold: ['#E1E8F5', '#97A9D0'], dark: ['#A9B1CA', '#6C7697'] };
  function cloudSpr(seed = 0, tint = 'white') {
    const key = 'c' + (Math.abs(seed) % 4) + tint; if (TX[key]) return TX[key];
    const [c, x] = mk(440, 280), r = rnd(Math.abs(seed) % 4 + 31), [base, sh] = CT[tint] || CT.white;
    const pf = [[95, 188, 70], [172, 140, 92], [262, 128, 86], [340, 176, 68], [215, 196, 76]].map(p => [p[0] + (r() - .5) * 26, p[1] + (r() - .5) * 18, p[2] * (.9 + r() * .2)]);
    x.beginPath(); pf.forEach(p => { x.moveTo(p[0] + p[2], p[1]); x.arc(p[0], p[1], p[2], 0, TAU); }); x.roundRect(64, 160, 312, 82, 40); x.fillStyle = base; x.fill();
    x.globalCompositeOperation = 'source-atop';
    const gr = x.createLinearGradient(0, 140, 0, 248); gr.addColorStop(0, rgba(sh, 0)); gr.addColorStop(1, rgba(sh, .95)); x.fillStyle = gr; x.fillRect(0, 0, 440, 280);
    x.lineCap = 'round'; pf.forEach(p => { x.strokeStyle = rgba(sh, .32); x.lineWidth = p[2] * .14; x.beginPath(); x.arc(p[0], p[1], p[2] * .9, .35, 1.75); x.stroke(); });
    x.fillStyle = 'rgba(255,255,255,.55)'; pf.slice(1, 3).forEach(p => { x.beginPath(); x.ellipse(p[0] - p[2] * .3, p[1] - p[2] * .45, p[2] * .3, p[2] * .16, -.4, 0, TAU); x.fill(); });
    x.globalCompositeOperation = 'source-over'; TX[key] = c; return c;
  }
  function cloud(g, x, y, s = 1, o = {}) { // облако-спрайт; (x,y) — середина нижнего края; o.tint white|grey|warm|night|cold|dark
    if (o.cull !== false && off(x, y - 120 * s, 260 * s)) return; const c = cloudSpr(o.seed || 0, o.tint || 'white'), q = o.sq || 0; g.save(); if (o.a != null) g.globalAlpha *= o.a;
    g.translate(x, y); g.scale(s * (o.flip ? -1 : 1) * (1 + q), s / (1 + q)); g.drawImage(c, -220, -242); g.restore(); }
  function rain(g, o = {}) { // косые штрихи дождя/звездопада в экранных координатах
    const n = o.n || 70, ang = (o.ang ?? 16) * DEG, sp = o.sp ?? 1900, x0 = o.x0 ?? -260, x1 = o.x1 ?? W + 100, y0 = o.y0 ?? -200, y1 = o.y1 ?? H + 200, Hh = y1 - y0, tn = Math.tan(ang);
    g.save(); g.strokeStyle = o.col || 'rgba(255,255,255,.65)'; g.lineWidth = o.w || 3; g.beginPath();
    for (let i = 0; i < n; i++) { const l = (o.len || 170) * (.5 + hash(i * 1.3 + 7) * .9), px = lerp(x0, x1, hash(i * 2.7 + 1)), dy = (hash(i * 4.1 + 3) * Hh + T * sp * (.8 + hash(i) * .4)) % Hh, y = y0 + dy, x = px + dy * tn;
      g.moveTo(x, y); g.lineTo(x - Math.sin(ang) * l, y - Math.cos(ang) * l); }
    g.stroke(); g.restore(); }
  function droplet(g, x, y, r, ang = 90, col) { // простая капля без лица; ang — направление полёта (градусы), хвостик назад
    g.save(); g.translate(x, y); g.rotate((ang - 90) * DEG); g.fillStyle = col || P.water; g.beginPath(); g.moveTo(0, -2.1 * r);
    g.bezierCurveTo(r * .55, -1.2 * r, r, -.45 * r, r, 0); g.arc(0, 0, r, 0, PI); g.bezierCurveTo(-r, -.45 * r, -r * .55, -1.2 * r, 0, -2.1 * r); g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(-r * .38, -r * .2, r * .16, r * .3, .3, 0, TAU); g.fill(); g.restore(); }
  function snow(g, o = {}) { const n = o.n || 50; g.save(); g.globalAlpha *= o.a ?? .9; g.fillStyle = g.strokeStyle = o.col || '#FFFFFF'; g.lineWidth = 2.6;
    for (let i = 0; i < n; i++) { const sp = 60 + hash(i * 3.3) * 90, x = hash(i * 1.7) * (W + 100) - 50 + Math.sin(T * 1.3 + i) * 26, y = ((hash(i * 2.9) * (H + 80) + T * sp) % (H + 80)) - 40, r = 3 + hash(i * 5.1) * 5;
      if (i % 4 === 0) { const rr = r * 2.3; g.beginPath(); for (let k = 0; k < 3; k++) { const a = k * PI / 3 + T * .8 + i; g.moveTo(x - Math.cos(a) * rr, y - Math.sin(a) * rr); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.stroke(); }
      else { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } }
    g.restore(); }
  function steam(g, x, y, o = {}) { // струйки пара, поднимаются от (x,y)
    const n = o.n || 3, h = o.h || 260, col = o.col || 'rgba(255,255,255,.85)', sp = o.sp ?? 1;
    for (let i = 0; i < n; i++) { const ph = (T * .55 * sp + i / n) % 1, bx = x + (i - (n - 1) / 2) * (o.gap || 60), by = y - ph * h * .6, pts = [];
      for (let k = 0; k <= 14; k++) { const f = k / 14; pts.push(bx + Math.sin(f * 7 + T * 3 * sp + i * 2) * (o.amp || 18) * (.4 + f), by - f * h * .5); }
      g.save(); g.globalAlpha *= Math.sin(ph * PI); ink(g, pts, { w: o.w || 9, col, taper: .5, jit: .1 }); g.restore(); }
  }

  // ---------- эффекты ----------
  function speed(g, x, y, ang, o = {}) { // штрихи скорости позади объекта; ang — куда он движется (градусы)
    const n = o.n || 5, len = o.len || 120, a = ang * DEG, c = Math.cos(a), s = Math.sin(a), spr = o.spread || 90, fr = Math.floor(T * 8);
    g.save(); g.strokeStyle = o.col || P.ink; g.lineWidth = o.w || 3.5; g.globalAlpha *= o.a ?? .7; g.beginPath();
    for (let i = 0; i < n; i++) { const off = (n > 1 ? i / (n - 1) - .5 : 0) * spr, l = len * (.45 + .55 * hash(i * 1.7 + fr)), d0 = (o.gap || 60) + hash(i + fr * 3.1) * 40, bx = x - c * d0 - s * off, by = y - s * d0 + c * off;
      g.moveTo(bx, by); g.lineTo(bx - c * l, by - s * l); }
    g.stroke(); g.restore(); }
  function dashes(g, x, y, q, o = {}) { // чёрточки удара по бокам на земле; q — 0..1 после касания
    if (q <= 0 || q >= 1) return; const w = o.w || 120, e = eo(q); g.save(); g.globalAlpha *= 1 - ei(q); g.strokeStyle = o.col || P.coral; g.lineWidth = o.lw || 5; g.beginPath();
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) { const d0 = w * (.55 + i * .3 + e * .4), l = 22 - i * 5, dy = i === 2 ? -12 - e * 10 : 0; g.moveTo(x + sd * d0, y + dy); g.lineTo(x + sd * (d0 + l), y + dy - (i === 2 ? 8 : 0)); }
    g.stroke(); g.restore(); }
  function splash(g, x, y, q, o = {}) { // всплеск: кольца и капли по параболам; q — секунды после удара
    const dur = o.dur || .9; if (q < 0 || q > dur) return; const s = o.s || 1, n = o.n || 9;
    for (let i = 0; i < 2; i++) { const e = eo(cl((q - i * .12) / .8)); if (e <= 0) continue; g.save(); g.globalAlpha *= (1 - e) * .85; g.strokeStyle = o.ring || P.waterD; g.lineWidth = 4 * s; g.beginPath(); g.ellipse(x, y, (40 + e * 180) * s, (10 + e * 36) * s, 0, 0, TAU); g.stroke(); g.restore(); }
    for (let i = 0; i < n; i++) { const a = -PI / 2 + (n > 1 ? i / (n - 1) - .5 : 0) * 2.3, v = (420 + hash(i * 7.7) * 420) * s, vx = Math.cos(a) * v, vy = Math.sin(a) * v, py = y + vy * q + 1700 * s * q * q;
      if (py > y + 6) continue; droplet(g, x + vx * q, py, (7 + hash(i * 3.3) * 7) * s * (1 - q / dur * .5), Math.atan2(vy + 3400 * s * q, vx) / DEG, o.col || P.water); }
  }
  function confetti(g, lt, o = {}) { // обрезки бумаги падают сверху (как в финале образца); lt — секунды от начала
    const n = o.n || 46, cols = o.cols || [P.coral, P.sun, P.teal, P.water, P.grass, P.pink, P.lavD, P.navy];
    for (let i = 0; i < n; i++) { const h1 = hash(i * 1.37 + (o.seed || 0)), h2 = hash(i * 2.11 + 5), h3 = hash(i * 3.7 + 9), q = lt - h3 * (o.spread ?? 1.2); if (q < 0) continue;
      const y = (o.y0 ?? -40) + q * (170 + h2 * 230), x = (o.x0 ?? 0) + h1 * (o.w ?? W) + Math.sin(q * (1.5 + h2 * 2) + i) * 40; if (y > (o.y1 ?? H + 40)) continue;
      g.save(); g.translate(x, y); g.rotate(q * (2 + h3 * 4) + i); g.scale(Math.cos(q * (4 + h1 * 5) + i), 1); g.fillStyle = cols[i % cols.length];
      if (i % 3) g.fillRect(-7, -3.2, 14, 6.4); else { g.beginPath(); g.arc(0, 0, 4.8, 0, TAU); g.fill(); } g.restore(); }
  }
  function splat(g, x, y, r, o = {}) { // брызги краски вокруг точки; o.p — появление 0..1
    const n = o.n || 14, p = o.p ?? 1, cols = o.cols || [P.coral, P.navy];
    for (let i = 0; i < n; i++) { const a = hash(i * 4.3 + (o.seed || 0)) * TAU, d = r * Math.pow(hash(i * 1.9 + 2 + (o.seed || 0)), .7), rr = (2 + hash(i * 7.1) * 9) * (o.s || 1) * (1 - d / r * .6), e = eb(cl(p * 1.6 - i / n * .6)); if (e <= 0) continue;
      g.fillStyle = cols[i % cols.length]; g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rr * e, 0, TAU); g.fill(); }
  }
  function pop(g, lt, t0, x, y, fn, o = {}) { // появление пружиной вокруг (x,y) за ~8 кадров; o.out — момент ухода (быстрее)
    if (lt < t0) return; const q = lt - t0; let s = lerp(o.from ?? .45, 1, spring(q, o.f ?? 2, o.d ?? 7)), a = cl(q / .14);
    if (o.out != null && lt > o.out) { const e = pr(lt, o.out, o.out + (o.outDur || .18)); if (e >= 1) return; s *= 1 - e * .5; a *= 1 - e; }
    g.save(); g.globalAlpha *= a; g.translate(x, y); g.scale(s, s); g.translate(-x, -y); fn(g); g.restore();
  }

  // ---------- герой: капелька ----------
  const HR = 95;
  function rad(sh, a) {
    if (sh === 'ball') return 1;
    if (sh === 'puff') return 1.05 + .075 * Math.sin(6 * a + T * 2.4) + .045 * Math.sin(11 * a - T * 3.3);
    let d = Math.abs(a + PI / 2) % TAU; if (d > PI) d = TAU - d;
    return d < 1 ? 1 / Math.cos(1 - d) - .17 * Math.exp(-d * d / .018) : 1;
  }
  function blinkK(seed) { const p = ((T + seed * 1.37) / 3.4) % 1; return p > .955 ? Math.sin((p - .955) / .045 * PI) : 0; }
  function face(g, cx, cy, R, o = {}) { // лицо: mood happy|calm|joy|wow|hot|cold|sad|sleep|wink; o.look/lookY −1..1
    const md = o.mood || 'happy', lx = cx + (o.look || 0) * R * .16, ly = cy + (o.lookY || 0) * R * .12, ic = o.ink || P.ink, bl = o.blink ?? blinkK(o.seed || 0), ey = ly - R * .05;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = R * .05; g.strokeStyle = ic;
    if (o.cheeks !== false) { g.fillStyle = rgba(P.pink, md === 'cold' ? .25 : .55); for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(lx + sd * R * .52, ly + R * .2, R * .12, R * .075, 0, 0, TAU); g.fill(); } }
    const closed = md === 'joy' || md === 'hot' || md === 'sleep'; g.fillStyle = ic;
    for (const sd of [-1, 1]) { const x = lx + sd * R * .3;
      if (closed || (md === 'wink' && sd > 0)) { g.beginPath(); if (md === 'sleep') g.arc(x, ey - R * .03, R * .09, .15 * PI, .85 * PI); else g.arc(x, ey + R * .06, R * .1, 1.15 * PI, 1.85 * PI); g.stroke(); }
      else { const ry = R * (md === 'wow' ? .16 : .135) * Math.max(.12, 1 - bl); g.beginPath(); g.ellipse(x, ey, R * .088, ry, 0, 0, TAU); g.fill();
        if (bl < .5) { g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(x + R * .03, ey - ry * .42, R * .032, 0, TAU); g.fill(); g.fillStyle = ic; } }
      if (md === 'cold' || md === 'sad') { g.beginPath(); g.moveTo(x - sd * R * .12, ey - R * .2); g.lineTo(x + sd * R * .08, ey - R * .27); g.stroke(); }
    }
    const my = ly + R * .25; g.beginPath();
    if (md === 'wow') { g.ellipse(lx, my + R * .03, R * .07, R * .09, 0, 0, TAU); g.fillStyle = '#7A2C34'; g.fill(); }
    else if (md === 'joy' || md === 'hot') { g.moveTo(lx - R * .15, my - R * .03); g.quadraticCurveTo(lx, my + R * .24, lx + R * .15, my - R * .03); g.closePath(); g.fillStyle = '#7A2C34'; g.fill(); }
    else if (md === 'cold') { g.moveTo(lx - R * .16, my); for (let i = 1; i <= 6; i++) g.lineTo(lx - R * .16 + i * R * .053, my + (i % 2 ? -1 : 1) * R * .035); g.stroke(); }
    else if (md === 'sad') { g.arc(lx, my + R * .13, R * .1, 1.2 * PI, 1.8 * PI); g.stroke(); }
    else if (md === 'sleep') { g.ellipse(lx, my + R * .02, R * .04, R * .05, 0, 0, TAU); g.fillStyle = '#7A2C34'; g.fill(); }
    else { g.arc(lx, my - R * .07, R * (md === 'calm' ? .08 : .12), .2 * PI, .8 * PI); g.stroke(); }
    if (md === 'hot') droplet(g, lx + R * .66, ly - R * .38, R * .07, 90, '#9FD4F2');
    g.restore();
  }
  function bodyDraw(g, sh, to, m, o, k) {
    const pts = []; for (let i = 0; i < 64; i++) { const a = i / 64 * TAU - PI; let r = rad(sh, a); if (to && to !== 'cloud' && m > 0) r = lerp(r, rad(to, a), m); pts.push(Math.cos(a) * r * HR * k, Math.sin(a) * r * HR * k); }
    const pf = sh === 'puff' ? (to && to !== 'cloud' ? 1 - m : 1) : (to === 'puff' ? m : 0), c = o.col || P.water;
    const cL = mix(mix(c, '#FFFFFF', .55), '#FFFFFF', pf * .7), cM = mix(c, '#EEF3FA', pf), cD = mix(shade(c, -.28), '#B4C3E2', pf);
    g.save(); if (pf > 0) g.globalAlpha *= 1 - pf * .1; path(g, pts, true, true);
    const gr = g.createRadialGradient(-HR * .38 * k, -HR * .42 * k, HR * .08, -HR * .1 * k, -HR * .05 * k, HR * 1.6 * k); gr.addColorStop(0, cL); gr.addColorStop(.5, cM); gr.addColorStop(1, cD);
    g.fillStyle = gr; g.fill(); g.lineWidth = HR * .05 * k; g.strokeStyle = rgba(cD, .5); g.stroke(); g.restore();
    const hl = 'rgba(255,255,255,' + (.85 - pf * .45).toFixed(2) + ')';
    ink(g, arcPts(0, 0, HR * .7 * k, 198, 236, 8), { w: HR * .12 * k, col: hl, taper: .5, jit: 0, rs: false });
    g.fillStyle = hl; g.beginPath(); g.arc(Math.cos(250 * DEG) * HR * .7 * k, Math.sin(250 * DEG) * HR * .7 * k, HR * .055 * k, 0, TAU); g.fill();
  }
  function hero(g, x, y, s = 1, o = {}) { // капелька: (x,y) — точка опоры (низ тела), s=1 → ≈190×270 px
    // o: shape drop|ball|puff|cloud, to (во что превращается) + m 0..1, mood, look, lookY, sq (+ сплющить, − вытянуть), rot, arms up|wave|side|rest, run (фаза бега → ножки), col, tint, a, shadow (y земли | false)
    tex(); const sh = o.shape || 'drop', to = o.to, m = cl(o.m || 0), sq = o.sq || 0, sx = 1 + sq, sy = 1 / (1 + sq), legs = o.run != null, lift = legs ? HR * .34 : 0;
    const cloudy = sh === 'cloud' || to === 'cloud', flying = sh === 'puff' || sh === 'cloud' || (to && m > .5);
    if (o.shadow !== false && !flying) { const gy = o.shadow ?? y, k = 1 / (1 + Math.max(0, gy - y) / 260); g.save(); g.globalAlpha *= .9 * k * (o.a ?? 1);
      g.drawImage(TX.shadow, x - HR * 1.2 * s * sx * k, gy - HR * .2 * s, HR * 2.4 * s * sx * k, HR * .4 * s); g.restore(); }
    g.save(); g.translate(x, y); g.scale(s, s); if (o.a != null) g.globalAlpha *= o.a;
    if (legs) legsDraw(g, o.run);
    g.translate(0, -lift - HR * sy); g.rotate((o.rot || 0) * DEG); g.scale(sx, sy);
    if (cloudy) {
      const mc = sh === 'cloud' ? 1 : m;
      if (mc < 1) { g.save(); g.globalAlpha *= 1 - mc; bodyDraw(g, sh, null, 0, o, 1 + mc * .6); g.restore(); }
      if (mc > 0) { g.save(); g.globalAlpha *= cl(mc * 1.6); cloud(g, 0, HR * .95, lerp(.5, 1.05, eb(mc)), { tint: o.tint || 'white', seed: o.seed || 1, cull: false }); g.restore(); }
      face(g, 0, -HR * .02, HR * .9, o);
    } else { bodyDraw(g, sh, to, m, o, 1); face(g, 0, 0, HR, o); if (o.arms) armsDraw(g, o.arms, o); }
    g.restore();
  }
  function legsDraw(g, ph) { g.save(); g.strokeStyle = P.ink; g.fillStyle = P.ink; g.lineWidth = 7; g.lineCap = 'round';
    for (const sd of [-1, 1]) { const a = Math.sin(ph * TAU + (sd > 0 ? PI : 0)) * .75, hx = sd * HR * .3, hy = -HR * .4, fx = hx + Math.sin(a) * HR * .4, fy = hy + Math.cos(a) * HR * .4;
      g.beginPath(); g.moveTo(hx, hy); g.lineTo(fx, fy); g.stroke(); g.beginPath(); g.ellipse(fx + HR * .06, fy, HR * .1, HR * .055, 0, 0, TAU); g.fill(); }
    g.restore(); }
  function armsDraw(g, kind, o) { g.save(); g.strokeStyle = o.ink || P.ink; g.fillStyle = o.ink || P.ink; g.lineWidth = HR * .065; g.lineCap = 'round';
    for (const sd of [-1, 1]) { const up = kind === 'up' || (kind === 'wave' && sd > 0), sw = kind === 'wave' && sd > 0 ? Math.sin(T * 13) * .45 : 0;
      const dx = up ? sd * .55 : kind === 'side' ? sd : sd * .5, dy = up ? -.84 : kind === 'side' ? -.15 : .86, c = Math.cos(sw), s = Math.sin(sw), ux = dx * c - dy * s, uy = dx * s + dy * c;
      const x0 = sd * HR * .9, y0 = HR * .12, x1 = x0 + ux * HR * .46, y1 = y0 + uy * HR * .46;
      g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + ux * HR * .3 + sd * HR * .06, y0 + uy * HR * .1, x1, y1); g.stroke(); g.beginPath(); g.arc(x1, y1, HR * .07, 0, TAU); g.fill(); }
    g.restore(); }
  function bounce(lt, h = 600, o = {}) { // падение с высоты h в lt=0 и затухающие отскоки → {y: высота над землёй, sq, hit}
    const gr = o.g || 5000, e = o.e ?? .4, nb = o.n ?? 3; if (lt <= 0) return { y: h, sq: 0, hit: -1 };
    const t0 = Math.sqrt(2 * h / gr); let v = gr * t0; if (lt < t0) return { y: h - .5 * gr * lt * lt, sq: -Math.min(.2, gr * lt / 12000), hit: -1 };
    let tk = t0;
    for (let k = 0; k <= nb; k++) { const vu = v * e, T2 = k < nb ? 2 * vu / gr : 1e9, dt = lt - tk;
      if (lt < tk + T2) { let sq = Math.min(.38, v / 6000) * Math.exp(-dt * 13) * Math.cos(dt * 26), y = 0;
        if (k < nb) { y = Math.max(0, vu * dt - .5 * gr * dt * dt); sq -= Math.min(.14, Math.abs(vu - gr * dt) / 12000) * cl(dt / .06); }
        return { y, sq, hit: k, tk }; }
      tk += T2; v = vu; }
    return { y: 0, sq: 0, hit: nb };
  }
  function hop(lt, t0, t1, h = 220) { // прыжок: присед до t0, полёт t0..t1, приземление → {p, y, sq}
    if (lt < t0) return { p: 0, y: 0, sq: .2 * Math.sin(pr(lt, t0 - .18, t0) * PI / 2) };
    if (lt < t1) { const q = pr(lt, t0, t1); return { p: lerp(q, eio(q), .3), y: 4 * h * q * (1 - q), sq: -.16 * Math.pow(Math.cos(q * PI), 2) * (q < .5 ? 1 : .6) }; }
    const d = lt - t1; return { p: 1, y: 0, sq: .26 * Math.exp(-d * 10) * Math.cos(d * 24) };
  }

  // ---------- перьевой шрифт (кириллица, цифры) ----------
  // Единицы: базовая линия 0, x-высота −10, прописные −15, нижние выносные +5. «a:cx,cy,rx,ry,a0,a1» — дуга (градусы).
  const GL = {
    'а': '9|a:4.3,-5,3.9,5,-20,-340;8.2,-10 8.2,-1.2 9,0', 'б': '9|8.6,-14.8 5.6,-14 3,-12 1.4,-8.6 a:4.5,-5,3.6,5,200,-160',
    'в': '8.6|1.2,0 1.2,-10 4.6,-10 a:4.6,-7.6,2.5,2.4,-90,90 1.2,-5.2;1.2,-5.2 5.2,-5.2 a:5.2,-2.6,2.8,2.6,-90,90 1.2,0',
    'г': '7.4|7.2,-10 1.2,-10 1.2,0', 'д': '10|0.6,0.2 1.6,-2.6 2.6,-10 8.2,-10 8.2,0;-0.4,2.6 -0.4,0 9.6,0 9.6,2.6',
    'е': '9|1.2,-5 8.5,-5 a:4.7,-5,3.8,5,0,-310', 'ё': '9|1.2,-5 8.5,-5 a:4.7,-5,3.8,5,0,-310;3.4,-12.6;6.2,-12.6',
    'ж': '11|5.5,-10 5.5,0;0.6,-10 2.4,-7.4 4,-5.6 5.4,-5 4,-4.4 2.2,-2.4 0.4,0;10.4,-10 8.6,-7.4 7,-5.6 5.6,-5 7,-4.4 8.8,-2.4 10.6,0',
    'з': '8.6|a:4.3,-7.6,3,2.4,-160,90 a:4.5,-2.6,3.3,2.6,-90,160', 'и': '9|1.2,-10 1.2,0 7.8,-10 7.8,0',
    'й': '9|1.2,-10 1.2,0 7.8,-10 7.8,0;a:4.5,-13.4,2.2,1.4,170,10', 'к': '8.6|1.2,-10 1.2,0;7.6,-10 2.6,-5.4 1.4,-5 2.6,-4.6 8,0',
    'л': '9|0.2,-0.2 1.4,-1.6 2.6,-6.2 3.2,-10 7.8,-10 7.8,0', 'м': '10.4|0.6,0 1.6,-10 5.2,-3 8.8,-10 9.8,0',
    'н': '9|1.2,-10 1.2,0;1.2,-5 7.8,-5;7.8,-10 7.8,0', 'о': '9|a:4.5,-5,4,5,-100,-460', 'п': '9|1.2,0 1.2,-10 7.8,-10 7.8,0',
    'р': '9|1.2,-10 1.2,5;1.2,-9.6 a:4.6,-6.6,3.4,3.4,-145,145 1.2,-4.4', 'с': '8.6|a:4.6,-5,3.9,5,-38,-322', 'т': '9|0.4,-10 8.6,-10;4.5,-10 4.5,0',
    'у': '9|0.8,-10 4.4,-0.6;8.4,-10 5.4,-2.4 3.8,1.8 2.4,4.2 0.6,5', 'ф': '10.6|5.3,-14.5 5.3,5;a:5.3,-5,4.6,4.6,-90,-450',
    'х': '9|0.8,-10 8.2,0;8.2,-10 0.8,0', 'ц': '10|1.2,-10 1.2,0 9,0 9.2,2.8;7.6,-10 7.6,0',
    'ч': '8.6|1.2,-10 1.2,-7 2.4,-5.2 4.6,-4.6 7.6,-5.2;7.6,-10 7.6,0', 'ш': '12|1.2,-10 1.2,0 10.8,0 10.8,-10;6,-10 6,0',
    'щ': '13|1.2,-10 1.2,0 12,0 12.2,2.8;6,-10 6,0;10.6,-10 10.6,0', 'ъ': '9|0,-10 2.2,-10 2.2,0 5.4,0 a:5.4,-2.7,2.9,2.7,90,-90 2.2,-5.4',
    'ы': '11|1.2,-10 1.2,0 4.2,0 a:4.2,-2.7,2.8,2.7,90,-90 1.2,-5.4;10,-10 10,0', 'ь': '8.2|1.2,-10 1.2,0 4.6,0 a:4.6,-2.7,3,2.7,90,-90 1.2,-5.4',
    'э': '8.6|a:4.2,-5,3.9,5,-142,142;3,-5 8,-5', 'ю': '12.4|1.2,-10 1.2,0;1.2,-5 3.9,-5;a:8,-5,3.9,5,-100,-460',
    'я': '8.8|7.6,-10 7.6,0;7.6,-10 4.4,-10 a:4.4,-7.4,3,2.6,-90,-270 7.6,-4.8;4.6,-4.8 2.8,-2.4 0.6,0',
    'А': '10|0.4,0 5,-15 9.6,0;2.4,-5.2 7.6,-5.2', 'Б': '9.4|8.4,-15 1.2,-15 1.2,0 5,0 a:5,-4.3,3.6,4.3,90,-90 1.2,-8.6',
    'Е': '8.8|8.2,-15 1.2,-15 1.2,0 8.4,0;1.2,-7.8 6.6,-7.8', 'Ё': '8.8|8.2,-15 1.2,-15 1.2,0 8.4,0;1.2,-7.8 6.6,-7.8;3.2,-17.6;6.2,-17.6',
    'Р': '9.2|1.2,0 1.2,-15 5,-15 a:5,-11.1,3.4,3.9,-90,90 1.2,-7.2', 'У': '10|0.6,-15 5,-6.4;9.4,-15 5.6,-5.2 4.2,-1.8 2.6,-0.2 0.8,0',
    'Ф': '12|6,-16 6,1;a:6,-7.5,5.2,4.8,-90,-450',
    '0': '9|a:4.5,-7,4,7,-100,-460', '1': '7|1.4,-10.6 4.6,-14 4.6,0', '2': '9.2|a:4.6,-10.2,3.6,3.8,-170,20 0.8,0 8.6,0',
    '3': '9|a:4.5,-10.6,3.3,3.4,-160,90 a:4.6,-3.6,3.8,3.6,-90,155', '4': '9.6|6.6,0 6.6,-14 0.6,-4.2 9.2,-4.2',
    '5': '9|8,-14 2.4,-14 1.6,-7.6 a:4.8,-4.4,3.8,4.4,-118,150', '6': '9|7.6,-13.6 5,-14 2.6,-12.4 1.2,-8.6 a:4.8,-4.4,3.6,4.4,190,-170',
    '7': '9|0.8,-14 8.6,-14 3.6,0', '8': '9|a:4.5,-10.6,3.1,3.4,90,-270 a:4.5,-3.6,3.8,3.6,-90,270', '9': '9|a:4.4,-9.8,3.6,4.2,0,-360 7.8,-6 7,-2.6 4.8,-0.4 1.6,0',
    '.': '2.6|1.2,-0.1', ',': '2.6|1.4,-0.6 1.4,0.6 0.4,2.4', '!': '3|1.4,-15 1.4,-4.4;1.4,-0.1', '?': '8.4|a:4.4,-11,3.4,3.4,-165,75 4.6,-5.8 4.6,-3.8;4.6,-0.1',
    '-': '6.4|1,-5 5.4,-5', '−': '7|1,-5 6,-5', ':': '3|1.4,-8.4;1.4,-0.1', ';': '3|1.4,-8.4;1.4,-0.6 1.4,0.6 0.4,2.4',
    '«': '8|4,-8.6 1,-5.4 4,-2.2;7.4,-8.6 4.4,-5.4 7.4,-2.2', '»': '8|1,-8.6 4,-5.4 1,-2.2;4.4,-8.6 7.4,-5.4 4.4,-2.2',
    '+': '9|4.5,-9 4.5,-1.4;1,-5.2 8,-5.2', '%': '11|a:2.8,-11.4,2.2,2.6,-90,-450;9.4,-14 1.6,0;a:8.2,-2.6,2.2,2.6,-90,-450',
    '°': '5|a:2.5,-12,2,2,-90,-450', '/': '8|7.4,-15 0.6,1.4', '(': '4.6|4,-15 2.2,-12 1.2,-6 2.2,0 4,3', ')': '4.6|0.6,-15 2.4,-12 3.4,-6 2.4,0 0.6,3', '×': '8|1.4,-8.6 6.6,-1.6;6.6,-8.6 1.4,-1.6',
  };
  const GC = {};
  function glyph(ch) {
    if (GC[ch] !== undefined) return GC[ch];
    let src = GL[ch], sx = 1, sy = 1;
    if (!src) { const lo = ch.toLowerCase(); if (lo !== ch && GL[lo]) { src = GL[lo]; sx = 1.1; sy = 1.5; } else return (GC[ch] = null); }
    const bar = src.indexOf('|'), w = +src.slice(0, bar) * sx;
    const s = src.slice(bar + 1).split(';').map(st => { const out = [];
      st.trim().split(/\s+/).forEach(tk => { if (tk.startsWith('a:')) { const [cx, cy, rx, ry, a0, a1] = tk.slice(2).split(',').map(Number), n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 12));
          for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n) * DEG; out.push((cx + Math.cos(a) * rx) * sx, (cy + Math.sin(a) * ry) * sy); } }
        else { const [x, y] = tk.split(',').map(Number); out.push(x * sx, y * sy); } });
      out.len = Math.max(.6, plen(out)); return out; });
    return (GC[ch] = { w, s, len: s.reduce((a, b) => a + b.len, 0) });
  }
  const GAP = 1.5, SPACE = 4.8, LIFT = 2.2;
  function layoutHand(str) { let x = 0, i = 0; const items = [];
    for (const ch of str) { if (ch === ' ') { x += SPACE; i++; continue; } const gl = glyph(ch); items.push({ gl, ch, x, i }); x += (gl ? gl.w : 9) + GAP; i++; }
    return { w: Math.max(0, x - GAP), items }; }
  const handW = (str, size) => Math.max(...String(str).split('\n').map(l => layoutHand(l).w)) * size / 20;
  const HCACHE = new Map();
  function hand(g, str, x, y, size, o = {}) { // надпись пером (готовая и неподвижная берётся из кэша-спрайта)
    const m = g.getTransform();
    if ((o.p ?? 1) >= 1 && !o.bob && !o.shiver && !o.nocache && Math.abs(m.a - 1) < 1e-6 && Math.abs(m.d - 1) < 1e-6 && !m.b && !m.c) {
      const key = [str, size, o.al, o.max, o.col, o.swash, o.nib, o.slant, o.seed, o.jit, o.lh, o.hair, o.ang].join('|'); let e = HCACHE.get(key);
      if (e) { HCACHE.delete(key); HCACHE.set(key, e); }
      else { const lines = String(str).split('\n'), u0 = size / 20, wv = handW(str, size), uu = o.max && wv > o.max ? u0 * o.max / wv : u0, ww = Math.min(wv, o.max || 1e9), lh = (o.lh || 1.2) * 20 * uu;
        const al = o.al || 'left', lx = al === 'center' ? -ww / 2 : al === 'right' ? -ww : 0, x0 = Math.floor(lx - 6 * uu), y0 = Math.floor(-20 * uu), w = Math.ceil(ww + 14 * uu), h = Math.ceil((lines.length - 1) * lh + 28 * uu);
        const [c, cx] = mk(w, h), r = handDraw(cx, str, -x0, -y0, size, Object.assign({}, o, { a: null }));
        e = { c, x0, y0, r: { x0: r.x0 + x0, x1: r.x1 + x0, y0: r.y0 + y0, y1: r.y1 + y0, w: r.w, u: r.u, tip: r.tip && { x: r.tip.x + x0, y: r.tip.y + y0 } } };
        HCACHE.set(key, e); if (HCACHE.size > 10) HCACHE.delete(HCACHE.keys().next().value); }
      const X = Math.round(m.e + x + e.x0) - m.e, Y = Math.round(m.f + y + e.y0) - m.f, dx = X - e.x0, dy = Y - e.y0;
      g.save(); if (o.a != null) g.globalAlpha *= o.a; g.drawImage(e.c, X, Y); g.restore();
      const R = e.r; return { x0: R.x0 + dx, x1: R.x1 + dx, y0: R.y0 + dy, y1: R.y1 + dy, w: R.w, u: R.u, tip: R.tip && { x: R.tip.x + dx, y: R.tip.y + dy }, done: true };
    }
    return handDraw(g, str, x, y, size, o);
  }
  function handDraw(g, str, x, y, size, o = {}) { // y — базовая линия; o.p — доля написанного, o.al, o.max, o.col, o.swash, o.nib, o.slant, o.bob, o.shiver, o.a
    const lines = String(str).split('\n'), L = lines.map(layoutHand); let u = size / 20; const mw = Math.max(...L.map(l => l.w)) * u;
    if (o.max && mw > o.max) u *= o.max / mw;
    const p = o.p ?? 1, al = o.al || 'left', lh = (o.lh || 1.2) * 20 * u, slant = o.slant ?? .2, nib = (o.nib ?? 1.75) * u, ang = (o.ang ?? -38) * DEG, nx = Math.cos(ang) * nib / 2, ny = Math.sin(ang) * nib / 2;
    let tot = 0; L.forEach(l => l.items.forEach(it => tot += (it.gl ? it.gl.len : 8) + LIFT)); let bud = p * tot;
    const res = { x0: 1e9, x1: -1e9, y0: y - 15 * u, y1: y + (lines.length - 1) * lh + 5 * u, u, tip: null };
    g.save(); if (o.a != null) g.globalAlpha *= o.a;
    const col = o.col || P.navy; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = Math.max(1.2, u * .2 * (o.hair ?? 1));
    L.forEach((ln, li) => { const lw = ln.w * u, ox = al === 'center' ? x - lw / 2 : al === 'right' ? x - lw : x, oy = y + li * lh; res.x0 = Math.min(res.x0, ox); res.x1 = Math.max(res.x1, ox + lw);
      if (o.swash) swash(g, ox - 3 * u, oy - 4.6 * u, lw + 6 * u, 9.5 * u, o.swash, o.sp ?? cl(p * 1.3 - li * .3), li + (o.seed || 0) + 2); });
    g.fillStyle = col; g.strokeStyle = col;
    for (let li = 0; li < L.length && bud > 0; li++) {
      const ln = L[li], lw = ln.w * u, ox = al === 'center' ? x - lw / 2 : al === 'right' ? x - lw : x, oy = y + li * lh;
      for (const it of ln.items) { if (bud <= 0) break;
        if (!it.gl) { g.font = 'italic 400 ' + Math.round(15 * u) + 'px ' + F.serif; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(it.ch, ox + it.x * u, oy); bud -= 8 + LIFT; continue; }
        const sd = (o.seed || 0) * 31 + it.i * 7.3 + li * 13, j = o.jit ?? 1, rot = (hash(sd) - .5) * 4.5 * DEG * j, sc = 1 + (hash(sd + 2) - .5) * .09 * j, cr = Math.cos(rot) * sc, sr = Math.sin(rot) * sc, gx0 = it.gl.w / 2;
        let dy = (hash(sd + 1) - .5) * .7 * j, dx = 0; if (o.bob) dy += Math.sin(T * 3.2 + it.i * .7) * o.bob; if (o.shiver) { dx += noise(T * 22 + it.i * 3, 5) * o.shiver; dy += noise(T * 22 + it.i * 3, 9) * o.shiver; }
        const tf = (gx, gy) => { const X = gx0 + (gx - gx0) * cr - (gy + 5) * sr + it.x + dx, Y = -5 + (gx - gx0) * sr + (gy + 5) * cr + dy; return [ox + (X - Y * slant) * u, oy + Y * u]; };
        for (const st of it.gl.s) { if (bud <= 0) break; const n = st.length >> 1;
          if (n === 1) { const [px, py] = tf(st[0], st[1]); g.beginPath(); g.arc(px, py, nib * .55, 0, TAU); g.fill(); bud -= st.len; res.tip = { x: px, y: py }; continue; }
          const pts = []; let used = 0, prev = tf(st[0], st[1]); pts.push(prev[0], prev[1]);
          for (let k = 1; k < n; k++) { const seg = Math.hypot(st[2 * k] - st[2 * k - 2], st[2 * k + 1] - st[2 * k - 1]);
            if (used + seg >= bud) { const f = seg ? (bud - used) / seg : 1, q = tf(st[2 * k - 2] + (st[2 * k] - st[2 * k - 2]) * f, st[2 * k - 1] + (st[2 * k + 1] - st[2 * k - 1]) * f); pts.push(q[0], q[1]); used = bud; break; }
            used += seg; const q = tf(st[2 * k], st[2 * k + 1]); pts.push(q[0], q[1]); }
          bud -= used >= bud ? bud : st.len;
          const m = pts.length >> 1; g.beginPath();
          for (let k = 0; k < m - 1; k++) { const ax = pts[2 * k], ay = pts[2 * k + 1], bx = pts[2 * k + 2], by = pts[2 * k + 3], c = (bx - ax) * ny - (by - ay) * nx >= 0 ? 1 : -1;
            g.moveTo(ax + nx * c, ay + ny * c); g.lineTo(bx + nx * c, by + ny * c); g.lineTo(bx - nx * c, by - ny * c); g.lineTo(ax - nx * c, ay - ny * c); g.closePath(); }
          g.fill();
          g.beginPath(); g.moveTo(pts[0], pts[1]); for (let k = 1; k < m; k++) g.lineTo(pts[2 * k], pts[2 * k + 1]); g.stroke();
          res.tip = { x: pts[2 * m - 2], y: pts[2 * m - 1] }; }
        bud -= LIFT; }
    }
    g.restore(); res.w = res.x1 - res.x0; res.done = p >= 1; return res;
  }
  function write(g, lt, t0, str, x, y, size, o = {}) { // надпись пишется пером с момента t0 (длительность по числу букв или o.dur); o.out — уход
    const n = [...String(str)].filter(c => c !== ' ' && c !== '\n').length, dur = o.dur || cl(.12 + n * .035, .25, .45), q = pr(lt, t0, t0 + dur);
    if (q <= 0) return null; let a = o.a ?? 1; if (o.out != null && lt > o.out) { const e = pr(lt, o.out, o.out + .2); if (e >= 1) return null; a *= 1 - e; }
    return hand(g, str, x, y, size, Object.assign({}, o, { p: 1 - Math.pow(1 - q, 1.4), a }));
  }
  function title(g, lt, t0, str, x, y, size, o = {}) { // крупное слово пером + длинная подводка-росчерк (как финальная надпись образца)
    const r = write(g, lt, t0, str, x, y, size, o); if (!r) return null;
    const n = [...String(str)].filter(c => c !== ' ' && c !== '\n').length, d = o.dur || cl(.12 + n * .035, .25, .45), q = pr(lt, t0 + d * .85, t0 + d + .45);
    if (q > 0 && o.line !== false) underline(g, r.x0 - size * .1, r.x1 + size * .15, y + size * (o.ly ?? .26), eo(q), { col: o.lcol || o.col || P.navy, w: Math.max(4, size * .045), seed: 4 });
    return r;
  }

  // ---------- набор: книжный текст, разрядка, заметки ----------
  const SCACHE = new Map();
  function story(g, lt, str, x, y, size = 56, o = {}) { // книжная строка курсивом, слова появляются по очереди; *слово — ключевое (цвет + мазок)
    const m = g.getTransform(), n = String(str).split(/\s+/).filter(Boolean).length, last = Array.isArray(o.at) ? Math.max(...o.at) : (o.at || 0) + (n - 1) * (o.gap ?? .2);
    if (lt > last + .45 && (o.out == null || lt < o.out) && !o.a && Math.abs(m.a - 1) < 1e-6 && Math.abs(m.d - 1) < 1e-6 && !m.b && !m.c) {
      const key = [str, size, o.max, o.al, o.col, o.kcol, o.kbg, o.mark].join('|'); let e = SCACHE.get(key);
      if (!e) { const L = storyDraw(g, -9, str, 0, 0, size, o), mg = L.fs * .45, al = o.al || 'center', ax = mg + (al === 'center' ? L.w / 2 : al === 'right' ? L.w : 0), ay = L.fs * 1.05;
        const [c, cx] = mk(Math.ceil(L.w + 2 * mg), Math.ceil(ay + L.h - L.fs * .9)), r = storyDraw(cx, 99, str, ax, ay, size, Object.assign({}, o, { at: 0, gap: 0, out: null }));
        e = { c, ax, ay, r }; SCACHE.set(key, e); if (SCACHE.size > 8) SCACHE.delete(SCACHE.keys().next().value); }
      g.drawImage(e.c, Math.round(m.e + x - e.ax) - m.e, Math.round(m.f + y - e.ay) - m.f); return e.r;
    }
    return storyDraw(g, lt, str, x, y, size, o);
  }
  function storyDraw(g, lt, str, x, y, size, o) {
    const ws = String(str).split(/\s+/).filter(Boolean).map(w => ({ k: w[0] === '*', s: w.replace(/^\*/, '') })), max = o.max || 940, font = s => 'italic 400 ' + s + 'px ' + F.serif;
    let fs = size; g.save(); g.font = font(fs); let wid = ws.map(w => g.measureText(w.s).width);
    const big = Math.max(...wid); if (big > max) { fs = Math.floor(fs * max / big); g.font = font(fs); wid = ws.map(w => g.measureText(w.s).width); }
    const sp = g.measureText(' ').width, lines = []; let cur = [], cw = 0;
    ws.forEach((w, i) => { const add = (cur.length ? sp : 0) + wid[i]; if (cur.length && cw + add > max) { lines.push({ idx: cur, w: cw }); cur = [i]; cw = wid[i]; } else { cur.push(i); cw += add; } });
    if (cur.length) lines.push({ idx: cur, w: cw });
    const lh = fs * 1.3, al = o.al || 'center'; let ex = 1; if (o.out != null && lt > o.out) ex = 1 - pr(lt, o.out, o.out + .2);
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    if (ex > 0) lines.forEach((ln, li) => { let px = al === 'center' ? x - ln.w / 2 : al === 'right' ? x - ln.w : x; const py = y + li * lh;
      ln.idx.forEach(i => { const tw = Array.isArray(o.at) ? o.at[i] : (o.at || 0) + i * (o.gap ?? .2), q = pr(lt, tw, tw + .27);
        if (q > 0) { const e = eo(q), w = ws[i];
          if (w.k && o.mark !== false) swash(g, px - fs * .14, py - fs * .26, wid[i] + fs * .28, fs * .52, o.kbg || rgba(P.sun, .5), pr(lt, tw + .05, tw + .4) * ex, i + 3);
          g.globalAlpha = e * ex * (o.a ?? 1); g.fillStyle = w.k ? (o.kcol || P.coral) : (o.col || P.ink); g.fillText(w.s, px, py + (1 - e) * fs * .35 - (1 - ex) * fs * .2); g.globalAlpha = 1; }
        px += wid[i] + sp; }); });
    g.restore(); return { lines: lines.length, h: lines.length * lh, fs, w: Math.max(...lines.map(l => l.w)) };
  }
  function caps(g, str, x, y, size = 40, o = {}) { // разрядка прописными по центру x с коралловыми чёрточками по бокам; o.p — появление
    g.save(); let fs = size; g.font = '600 ' + fs + 'px ' + F.sans; const ch = [...String(str).toUpperCase()]; let ws = ch.map(c => g.measureText(c).width), sp = (o.sp ?? .34) * fs, tot = ws.reduce((a, b) => a + b, 0) + sp * (ch.length - 1);
    if (o.max && tot > o.max) { fs *= o.max / tot; g.font = '600 ' + fs + 'px ' + F.sans; ws = ch.map(c => g.measureText(c).width); sp = (o.sp ?? .34) * fs; tot = ws.reduce((a, b) => a + b, 0) + sp * (ch.length - 1); }
    const p = o.p ?? 1, n = ch.length, x0 = x - tot / 2; let px = x0; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    ch.forEach((c, i) => { const q = cl((p * (n + 2) - i) / 3), e = eo(q); if (q > 0) { g.globalAlpha = e; g.fillStyle = o.col || P.ink; g.fillText(c, px, y + (1 - e) * fs * .3); } px += ws[i] + sp; });
    g.globalAlpha = 1;
    if (o.dash !== false) { const L = fs * 1.4, gp = fs * .8, e = eo(p); ink(g, [x0 - gp - L * e, y - fs * .34, x0 - gp, y - fs * .34], { w: fs * .1, col: o.dcol || P.coral, taper: .2 }); ink(g, [x0 + tot + gp, y - fs * .34, x0 + tot + gp + L * e, y - fs * .34], { w: fs * .1, col: o.dcol || P.coral, taper: .2 }); }
    g.restore(); return { w: tot, fs };
  }
  function note(g, str, x, y, size = 30, o = {}) { g.save(); g.font = 'italic 400 ' + size + 'px ' + F.serif; g.textAlign = o.al || 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = o.col || P.grey; if (o.a != null) g.globalAlpha *= o.a; g.fillText(str, x, y); g.restore(); }

  // ---------- значки, индикаторы, метки ----------
  function icon(g, name, x, y, s = 40, o = {}) { // мини-рисунки: wave vapor cloud rain sun drop flower leaf river star heart tree mountain snow house
    g.save(); g.translate(x, y); g.scale(s / 40, s / 40); g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = o.ink || P.ink;
    const cl3 = (cx, cy, k) => { g.beginPath(); g.arc(cx - 9 * k, cy + 2 * k, 7 * k, PI * .5, PI * 1.5); g.arc(cx, cy - 4 * k, 9 * k, PI, 0); g.arc(cx + 10 * k, cy + 2 * k, 7 * k, PI * 1.5, PI * .5); g.closePath(); };
    switch (name) {
      case 'wave': g.strokeStyle = P.waterD; g.lineWidth = 4.5; for (const d of [-6, 6]) { g.beginPath(); g.moveTo(-17, d); g.quadraticCurveTo(-8.5, d - 9, 0, d); g.quadraticCurveTo(8.5, d + 9, 17, d); g.stroke(); } break;
      case 'vapor': g.strokeStyle = P.waterD; g.lineWidth = 3.6; for (const d of [-9, 0, 9]) { g.beginPath(); g.moveTo(d, 15); g.quadraticCurveTo(d - 6, 7, d, 0); g.quadraticCurveTo(d + 6, -7, d, -15); g.stroke(); } break;
      case 'cloud': cl3(0, 3, 1.25); g.fillStyle = '#FFFFFF'; g.fill(); g.stroke(); break;
      case 'rain': cl3(0, -6, 1); g.fillStyle = '#FFFFFF'; g.fill(); g.stroke(); g.strokeStyle = P.waterD; g.lineWidth = 3.4; g.beginPath(); for (const d of [-9, 0, 9]) { g.moveTo(d, 8); g.lineTo(d - 4, 17); } g.stroke(); break;
      case 'sun': g.strokeStyle = P.orange; g.lineWidth = 3.4; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * PI / 4; g.moveTo(Math.cos(a) * 13, Math.sin(a) * 13); g.lineTo(Math.cos(a) * 18, Math.sin(a) * 18); } g.stroke(); g.fillStyle = P.sun; g.beginPath(); g.arc(0, 0, 9.5, 0, TAU); g.fill(); break;
      case 'drop': droplet(g, 0, 7, 9, 90, P.water); break;
      case 'flower': g.fillStyle = P.pink; for (let i = 0; i < 5; i++) { const a = i * TAU / 5; g.beginPath(); g.arc(Math.cos(a) * 9, Math.sin(a) * 9, 7, 0, TAU); g.fill(); } g.fillStyle = P.sun; g.beginPath(); g.arc(0, 0, 5.5, 0, TAU); g.fill(); break;
      case 'leaf': leaf(g, -15, 8, .3, { rot: -30 }); break;
      case 'river': g.strokeStyle = P.water; g.lineWidth = 9; g.beginPath(); g.moveTo(-16, -14); g.bezierCurveTo(14, -10, -14, 10, 16, 14); g.stroke(); break;
      case 'star': g.fillStyle = P.sun; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, r = i % 2 ? 7 : 17; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); break;
      case 'heart': g.fillStyle = P.coral; g.beginPath(); g.moveTo(0, 14); g.bezierCurveTo(-22, 0, -12, -18, 0, -6); g.bezierCurveTo(12, -18, 22, 0, 0, 14); g.fill(); break;
      case 'tree': g.fillStyle = P.teal; g.beginPath(); g.arc(0, -5, 12, 0, TAU); g.fill(); g.beginPath(); g.moveTo(0, 6); g.lineTo(0, 17); g.stroke(); break;
      case 'mountain': g.fillStyle = P.lav; g.beginPath(); g.moveTo(-18, 14); g.lineTo(0, -14); g.lineTo(18, 14); g.closePath(); g.fill(); g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(-6, -5); g.lineTo(0, -14); g.lineTo(6, -5); g.lineTo(0, -2); g.closePath(); g.fill(); break;
      case 'snow': g.strokeStyle = P.cold; g.beginPath(); for (let i = 0; i < 3; i++) { const a = i * PI / 3; g.moveTo(-Math.cos(a) * 15, -Math.sin(a) * 15); g.lineTo(Math.cos(a) * 15, Math.sin(a) * 15); } g.stroke(); break;
      case 'house': g.fillStyle = P.coralL; g.fillRect(-12, -2, 24, 16); g.fillStyle = P.coral; g.beginPath(); g.moveTo(-16, -1); g.lineTo(0, -16); g.lineTo(16, -1); g.closePath(); g.fill(); break;
    }
    g.restore();
  }
  function journey(g, x, y, r, f, o = {}) { // круг-путешествие: станции-значки по кругу, бегунок-капелька на доле f (может быть >1), o.loops — число кругов в центре
    const ic = o.icons || ['wave', 'vapor', 'cloud', 'rain'], n = ic.length, a0 = o.a0 ?? 90, dir = o.dir ?? -1, key = 'j' + r + ic.join('') + a0 + dir, S = Math.ceil(r * 3.3);
    if (!TX[key]) { const [c, x2] = mk(S, S), cx = S / 2;
      wash(x2, blob(cx, cx, r * 1.48, r * 1.48, 17, .05, 32), P.paperL, { rim: 5, rimA: .2 });
      ink(x2, arcPts(cx, cx, r, 70, 440, 44), { w: 3, col: rgba(P.ink, .85), taper: .2, jit: .3, rs: false });
      x2.fillStyle = P.ink; for (let i = 0; i < n; i++) { const a = (a0 + dir * (i + .5) / n * 360) * DEG, px = cx + Math.cos(a) * r, py = cx + Math.sin(a) * r, tx = -Math.sin(a) * dir, ty = Math.cos(a) * dir;
        x2.beginPath(); x2.moveTo(px + tx * 7, py + ty * 7); x2.lineTo(px - tx * 5 + Math.cos(a) * 6, py - ty * 5 + Math.sin(a) * 6); x2.lineTo(px - tx * 5 - Math.cos(a) * 6, py - ty * 5 - Math.sin(a) * 6); x2.closePath(); x2.fill(); }
      ic.forEach((nm, i) => { const a = (a0 + dir * i / n * 360) * DEG, px = cx + Math.cos(a) * r, py = cx + Math.sin(a) * r; x2.fillStyle = P.paperL; x2.beginPath(); x2.arc(px, py, r * .3, 0, TAU); x2.fill(); icon(x2, nm, px, py, r * .5); });
      TX[key] = c; }
    g.save(); if (o.a != null) g.globalAlpha *= o.a; g.drawImage(TX[key], x - S / 2, y - S / 2);
    const fr = f - Math.floor(f), fa = f > 0 && fr < 1e-4 ? 1 : fr;
    if (fa > 0) ink(g, arcPts(x, y, r, a0, a0 + dir * fa * 360, Math.max(3, Math.ceil(fa * 44))), { w: 7, col: o.col || P.water, taper: .08, jit: 0, rs: false });
    ic.forEach((nm, i) => { const df = Math.abs(((f - i / n) % 1 + 1.5) % 1 - .5), b = Math.max(0, 1 - df * n * 2.2); if (b <= 0) return; const a = (a0 + dir * i / n * 360) * DEG, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r, k = 1 + .35 * b;
      g.fillStyle = P.paperL; g.beginPath(); g.arc(px, py, r * .3 * k, 0, TAU); g.fill(); icon(g, nm, px, py, r * .5 * k); });
    const am = (a0 + dir * f * 360) * DEG, mx = x + Math.cos(am) * r, my = y + Math.sin(am) * r, rr = r * .17; droplet(g, mx, my + rr * .55, rr, 90, P.water); g.fillStyle = P.ink; g.beginPath(); g.arc(mx - rr * .32, my + rr * .45, rr * .13, 0, TAU); g.arc(mx + rr * .32, my + rr * .45, rr * .13, 0, TAU); g.fill();
    if (o.loops) { const e = eb(cl((o.lt ?? 1) / .35)); g.save(); g.translate(x, y); g.scale(e, e); hand(g, String(o.loops), 0, r * .33, r * .95, { al: 'center', col: o.lcol || P.coral, nib: 1.6 }); g.restore(); }
    g.restore();
  }
  function pageNo(g, n, lt = 9, o = {}) { // номер страницы внизу (книжная метка), перекатывается при смене
    const x = o.x ?? 540, y = o.y ?? 1650, fs = o.size || 40, col = o.col || P.grey; g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.font = 'italic 400 ' + fs + 'px ' + F.serif; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; const e = eo(pr(lt, 0, .35));
    g.save(); g.beginPath(); g.rect(x - 60, y - fs * .8, 120, fs * 1.6); g.clip();
    if (e < 1 && n > 1) { g.globalAlpha = 1 - e; g.fillText(String(n - 1), x, y - e * fs); } g.globalAlpha = e; g.fillText(String(n), x, y + (1 - e) * fs); g.restore();
    const key = 'pg' + col; if (!TX[key]) { const [c, x2] = mk(220, 24); for (const sd of [-1, 1]) { const pts = []; for (let i = 0; i <= 10; i++) { const f = i / 10; pts.push(110 + sd * (36 + f * 48), 12 + Math.sin(f * TAU) * 5); } ink(x2, pts, { w: 3, col, taper: .45, jit: 0 }); } TX[key] = c; }
    g.drawImage(TX[key], Math.round(x - 110), Math.round(y - 12)); g.restore();
  }
  function thermo(g, x, y, h, f, o = {}) { // градусник: x — ось, y — верх трубки, h — до центра колбы, f — уровень 0..1
    const w = o.w || 44, br = w * .85, by = y + h, aa = Math.acos(w / 2 / br); g.save();
    g.beginPath(); g.moveTo(x - w / 2, y + w / 2); g.arc(x, y + w / 2, w / 2, PI, 0); g.lineTo(x + w / 2, by - Math.sin(aa) * br); g.arc(x, by, br, -aa, PI + aa); g.closePath();
    g.fillStyle = o.glass || P.paperL; g.fill(); g.lineWidth = 4.5; g.strokeStyle = P.ink; g.stroke();
    const lw = w * .46, top = lerp(by - br * .4, y + w * .55, cl(f)); g.fillStyle = o.col || P.coral; g.beginPath(); g.arc(x, by, br * .66, 0, TAU); g.fill(); g.beginPath(); g.roundRect(x - lw / 2, top, lw, by - top, lw / 2); g.fill();
    g.lineWidth = 3; g.beginPath(); for (let i = 1; i < 8; i++) { const ty = lerp(by - br * 1.3, y + w * .7, i / 8); g.moveTo(x + w / 2 + 6, ty); g.lineTo(x + w / 2 + (i % 2 ? 16 : 26), ty); } g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 5; g.beginPath(); g.moveTo(x - w * .2, y + w * .7); g.lineTo(x - w * .2, by - br * 1.2); g.stroke();
    g.restore();
  }
  function tape(g, x, y0, y1, v, o = {}) { // мерная лента (x — центр): значение v под указателем в центре; o.px пикселей на единицу, o.step, o.every, o.fmt
    const px = o.px || 3, step = o.step || 100, every = o.every || 5, w = o.w || 116, yc = (y0 + y1) / 2, fmt = o.fmt || (n => String(n)), fs = o.fs || 36;
    const strip = rough([x - w / 2, y0, x + w / 2, y0, x + w / 2, y1, x - w / 2, y1], 3, 7, 30); wash(g, strip, o.col || P.sunL, { rim: 4, smooth: false });
    g.save(); path(g, strip, true); g.clip(); g.strokeStyle = P.ink; g.lineWidth = 3; g.beginPath(); const lo = v - (yc - y0) / px, hi = v + (y1 - yc) / px, labs = [];
    for (let k = Math.ceil(lo / step); k * step <= hi; k++) { const ty = yc - (k * step - v) * px, big = k % every === 0; g.moveTo(x - w / 2, ty); g.lineTo(x - w / 2 + w * (big ? .3 : .16), ty); if (big) labs.push([k * step, ty]); }
    g.stroke(); g.fillStyle = o.lcol || P.navy; g.font = '600 ' + fs + 'px ' + F.sans; g.textAlign = 'left'; g.textBaseline = 'middle';
    labs.forEach(([val, ty]) => g.fillText(fmt(val), x - w / 2 + w * .36, ty)); g.restore();
    if (o.unit) { g.save(); g.fillStyle = o.lcol || P.navy; g.font = '600 ' + fs + 'px ' + F.sans; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(o.unit, x, y0 - 16); g.restore(); }
    g.fillStyle = o.ptr || P.coral; g.beginPath(); g.moveTo(x + w / 2 + 4, yc); g.lineTo(x + w / 2 + 36, yc - 20); g.lineTo(x + w / 2 + 36, yc + 20); g.closePath(); g.fill();
  }
  function bird(g, x, y, s = 1, o = {}) { // птичка-галочка, машет крыльями
    const ph = Math.sin(T * (o.f || 7) + (o.seed || 0) * 2.1), w = 26 * s, up = ph * 12 * s;
    g.save(); g.strokeStyle = o.col || P.ink; g.lineWidth = 3.4 * s; g.lineCap = 'round'; g.beginPath();
    g.moveTo(x - w, y - up); g.quadraticCurveTo(x - w * .45, y - 10 * s - up * .3, x, y); g.quadraticCurveTo(x + w * .45, y - 10 * s - up * .3, x + w, y - up); g.stroke(); g.restore(); }
  function scrap(g, x, y, w, h, o = {}) { // клочок бумаги под подпись: центр (x,y), рваные края, лёгкая тень
    g.save(); g.translate(x, y); g.rotate((o.rot ?? -1.5) * DEG); if (o.a != null) g.globalAlpha *= o.a;
    const pts = rough([-w / 2, -h / 2, w / 2, -h / 2, w / 2, h / 2, -w / 2, h / 2], 3.5, o.seed || 5, 22);
    g.fillStyle = 'rgba(40,30,20,.18)'; path(g, pts.map((v, i) => v + (i % 2 ? 8 : 5)), true); g.fill();
    path(g, pts, true); g.fillStyle = o.col || P.paperL; g.fill(); g.lineWidth = 1.5; g.strokeStyle = 'rgba(120,100,80,.35)'; g.stroke(); g.restore(); }
  function band(g, y0, y1, col, o = {}) { // акварельная полоса (небо, вода, дорога) между y0 и y1 с рваными краями, мировые координаты
    const v = view(), x0 = (o.x0 ?? v.x0) - 40, x1 = (o.x1 ?? v.x1) + 40, top = [], bot = [];
    for (let x = Math.floor(x0 / 40) * 40; x <= x1 + 40; x += 40) { top.push(x, y0 + noise(x * .01, o.seed || 3) * (o.amp ?? 16)); bot.push(x, y1 + noise(x * .008, (o.seed || 3) + 7) * (o.amp ?? 26)); }
    const pts = top.slice(); for (let i = bot.length - 2; i >= 0; i -= 2) pts.push(bot[i], bot[i + 1]);
    wash(g, pts, col, { rim: o.rim ?? 6, smooth: false, a: o.a });
  }
  function shadow(g, x, y, w, h, a = 1) { tex(); g.save(); g.globalAlpha *= a; g.drawImage(TX.shadow, x - w / 2, y - h / 2, w, h); g.restore(); }
  function arrow(g, pts, p = 1, o = {}) { // рисованная стрелка через точки (сглаживается), рисуется на долю p, наконечник в конце
    if (p <= 0) return; const q = pts.length > 4 ? spline(pts, 8) : resample(pts, 10), c = cut(q, p), n = c.length >> 1; ink(g, c, { w: o.w || 4.5, col: o.col || P.ink, taper: .12 });
    if (p > .8 && n > 1) { const j = Math.max(0, n - 4), x = c[2 * n - 2], y = c[2 * n - 1], a = Math.atan2(y - c[2 * j + 1], x - c[2 * j]), L = (o.head || 22) * eo(pr(p, .8, 1));
      ink(g, [x - Math.cos(a - .5) * L, y - Math.sin(a - .5) * L, x, y, x - Math.cos(a + .5) * L, y - Math.sin(a + .5) * L], { w: o.w || 4.5, col: o.col || P.ink, taper: .2 }); }
  }
  function ring(g, x, y, r, p = 1, o = {}) { // круг-цикл тушью со стрелками (o.n штук), рисуется на долю p
    const a0 = o.a0 ?? 100, dir = o.dir ?? -1, ry = o.ry ?? r, col = o.col || P.navy, w = o.w || 6;
    ink(g, arcPts(x, y, r, a0, a0 + dir * 350, 70, ry), { w, col, p, taper: .06, jit: .25, rs: false });
    const n = o.n ?? 4; for (let i = 0; i < n; i++) { const f = (i + .62) / n; if (p < f) continue;
      const a = (a0 + dir * 350 * f) * DEG, px = x + Math.cos(a) * r, py = y + Math.sin(a) * ry; let tx = -Math.sin(a) * r * dir, ty = Math.cos(a) * ry * dir; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const L = (o.head || 28) * eo(pr(p, f, f + .06)), c = Math.cos(.5), s = Math.sin(.5);
      ink(g, [px + (-tx * c + ty * s) * L, py + (-tx * s - ty * c) * L, px, py, px + (-tx * c - ty * s) * L, py + (tx * s - ty * c) * L], { w: w * .85, col, taper: .2 }); }
  }
  function pebble(g, x, y, s = 1, o = {}) { if (off(x, y, 40 * s)) return; wash(g, blob(x, y, 26 * s, 16 * s, o.seed || 2, .12, 16), o.col || '#B9B3C6', { rim: 3, light: .35 }); }
  function sfx(s, list) { list.forEach(e => s.play(e[0], e[1], e[2] ?? .14, e[3] ? { pitch: e[3] } : undefined)); }

  return { W, H, P, F, SAFE: { x0: 60, x1: 1020, y0: 110, y1: 1690 },
    cl, pr, lerp, eo, ei, eio, eb, spring, hash, noise, rnd, kf, when, mix, rgba, shade,
    begin, end, play, screen, layer, view, shake, cam: () => CAM,
    paper, sky, path, plen, cut, resample, spline, follow, rough, blob, arcPts, bbox,
    ink, outline, wash, swash, underline, hatch,
    sea, waveY, ground, hill, mountains, fields, tree, leaf, flower, tuft, river,
    sun, moon, sparkle, stars, cloud, rain, droplet, snow, steam,
    speed, dashes, splash, confetti, splat, pop,
    hero, face, bounce, hop, hand, handW, write, title, story, caps, note,
    icon, journey, pageNo, thermo, tape, bird, scrap, band, shadow, arrow, ring, pebble, sfx };
})();
