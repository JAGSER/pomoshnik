// «Риограф» — библиотека стиля «ризография на бумаге» для роликов draw(t, k) на Canvas 2D (1080×1920).
// Одна глобальная константа R. Работает в Web Worker: только OffscreenCanvas, без document и сети.
// Углы rot во всех функциях — в градусах. Кадр рисуется только из t; кэшируются лишь текстуры.
const R = (() => {
  const W = 1080, H = 1920, PI2 = Math.PI * 2, DEG = Math.PI / 180;
  const P = { paper: '#E9E1CF', card: '#F6F1E5', navy: '#37447F', ink: '#28305E', deep: '#1E2452', orange: '#EE7A3C',
    pink: '#EC6BA2', yellow: '#EEB53F', teal: '#34A39B', red: '#DE5A4C', aqua: '#58A9D8', aquaD: '#2F6F9E',
    lyel: '#F3D488', grey: '#A39D92', mute: '#B0AA9F', grid: '#D6CDBC', grid2: '#B4AB9B', date: '#56546A' };
  const F = { D: '"Inter Display","Inter",Roboto,"Arial Black",system-ui,sans-serif',
    I: '"Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif',
    S: '"DejaVu Serif",Georgia,"Noto Serif",serif', M: '"DejaVu Sans Mono",ui-monospace,Menlo,monospace' };
  let K = null, G = null, T = 0, BF = 0, TX = null;

  // ---------- математика и время ----------
  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const pr = (t, a, b) => b === a ? (t >= a ? 1 : 0) : cl((t - a) / (b - a));
  const lerp = (a, b, p) => a + (b - a) * p;
  const eo = p => 1 - Math.pow(1 - p, 3);
  const eio = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  const eb = p => { const c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
  const hash = n => { const s = Math.sin(n * 91.3458 + 47.853) * 43758.5453; return s - Math.floor(s); };
  const rnd = seed => { let s = (seed >>> 0) || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
  const kf = (A, t) => { // ключевые кадры [[t, v], ...] с плавным переходом
    if (t <= A[0][0]) return A[0][1];
    for (let i = 0; i < A.length - 1; i++) { const [t0, v0] = A[i], [t1, v1] = A[i + 1]; if (t < t1) return lerp(v0, v1, eio(pr(t, t0, t1))); }
    return A[A.length - 1][1];
  };
  const twos = (t, fps = 12) => Math.floor(t * fps) / fps;
  const num = (v, d = 0, sep = ',') => v.toFixed(d).replace('.', sep);
  const z2 = n => String(n).padStart(2, '0');
  const hms = ms => { const D = new Date(ms); return z2(D.getUTCHours()) + ':' + z2(D.getUTCMinutes()) + ':' + z2(D.getUTCSeconds()); };
  const ymd = ms => { const D = new Date(ms); return D.getUTCFullYear() + '.' + z2(D.getUTCMonth() + 1) + '.' + z2(D.getUTCDate()); };
  const LS = (g, v) => { if ('letterSpacing' in g) g.letterSpacing = v + 'px'; };

  // ---------- текстуры (один раз, OffscreenCanvas) ----------
  function tex() {
    if (TX) return TX;
    const mk = (w, h) => { const c = new OffscreenCanvas(w, h); return [c, c.getContext('2d')]; };
    const r = rnd(20261024), PW = W + 48, PH = H + 48, [pc, pg] = mk(PW, PH), im = pg.createImageData(PW, PH), d = im.data;
    const GW = 14, GH = 25, gr = new Float32Array((GW + 2) * (GH + 2)).map(() => r());
    for (let y = 0; y < PH; y++) {
      const gy = y / PH * GH, iy = gy | 0, fy = gy - iy, vy = y / PH - .5;
      for (let x = 0; x < PW; x++) {
        const gx = x / PW * GW, ix = gx | 0, fx = gx - ix, o = iy * (GW + 2) + ix, vx = x / PW - .5;
        const lo = lerp(lerp(gr[o], gr[o + 1], fx), lerp(gr[o + GW + 2], gr[o + GW + 3], fx), fy);
        let v = 2 + (lo - .5) * 16 + (r() - .5) * 30 - (vx * vx + vy * vy) * 64; // пятна + зерно + виньетка
        const q = r(); if (q < .0025) v -= 60; else if (q < .006) v += 55;
        const i = (y * PW + x) << 2;
        if (v < 0) { d[i] = 50; d[i + 1] = 42; d[i + 2] = 36; d[i + 3] = Math.min(255, -v * 1.6); }
        else { d[i] = 255; d[i + 1] = 251; d[i + 2] = 240; d[i + 3] = Math.min(255, v * 1.5); }
      }
    }
    pg.putImageData(im, 0, 0);
    for (let i = 0; i < 700; i++) { // волокна
      const x = r() * PW, y = r() * PH, a = r() * PI2, l = 6 + r() * 18;
      pg.strokeStyle = r() < .4 ? 'rgba(70,60,50,.12)' : 'rgba(255,252,242,.3)'; pg.lineWidth = .7 + r() * .8;
      pg.beginPath(); pg.moveTo(x, y);
      pg.quadraticCurveTo(x + Math.cos(a + .8) * l * .5, y + Math.sin(a + .8) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); pg.stroke();
    }
    const [hc, hg] = mk(W, H); hg.fillStyle = '#fff'; hg.beginPath(); // растр: точки крупнее к центру
    for (let y = 0, row = 0; y < H + 20; y += 16, row++) for (let x = (row & 1) * 8; x < W + 20; x += 16) {
      const dx = (x - W / 2) / W, dy = (y - H * .46) / H, rr = .8 + 5 * Math.max(0, 1 - Math.hypot(dx * 1.5, dy * 1.7)) + r() * .9;
      hg.moveTo(x + rr, y); hg.arc(x, y, rr, 0, PI2);
    }
    hg.fill();
    const [dc, dg] = mk(14, 14); dg.fillStyle = 'rgba(255,255,255,.5)';
    dg.beginPath(); dg.arc(3.5, 3.5, 2.2, 0, PI2); dg.arc(10.5, 10.5, 2.2, 0, PI2); dg.fill();
    const [sc, sg] = mk(22, 22); sg.strokeStyle = 'rgba(40,48,94,.4)'; sg.lineWidth = 4; sg.beginPath();
    for (let i = -22; i <= 44; i += 11) { sg.moveTo(i, 22); sg.lineTo(i + 22, 0); } sg.stroke();
    return TX = { paper: pc, half: hc, dots: G.createPattern(dc, 'repeat'), hatch: G.createPattern(sc, 'repeat') };
  }

  // ---------- кадр, склейки, камера ----------
  function begin(t, k) { // первым делом в draw: запоминает t/k, сбрасывает контекст, заливает бумагой
    K = k; G = k.g; T = t; BF = Math.floor(t * 8); tex();
    const g = G; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.shadowColor = 'rgba(0,0,0,0)'; g.shadowBlur = 0; g.setLineDash([]); LS(g, 0);
    g.textBaseline = 'alphabetic'; g.lineJoin = 'round'; g.lineCap = 'round';
    g.fillStyle = P.paper; g.fillRect(0, 0, W, H); return g;
  }
  function cuts(t, list) { // текущая сцена по списку склеек (глобальные секунды); по умолчанию — начала фраз
    list = list || K.subs.map(s => s.t0); let i = 0;
    for (let j = 0; j < list.length; j++) if (t >= list[j]) i = j;
    const t0 = list[i], t1 = i + 1 < list.length ? list[i + 1] : K.duration;
    return { i, t0, t1, lt: t - t0, d: t1 - t0, p: pr(t, t0, t1) };
  }
  function cam(g, since, fn, o = {}) { // после склейки камера оседает с наездом, затем медленный дрейф
    const z = 1 + (o.amp ?? .06) * Math.pow(1 - pr(since, 0, .45), 3) + (o.drift ?? 0) * .025;
    const cx = o.cx ?? W / 2, cy = o.cy ?? H * .45;
    g.save(); g.translate(cx, cy); g.scale(z, z); g.translate(-cx, -cy); fn(g); g.restore();
  }
  function shake(g, lt, t0, dur = .4, amp = 14) { const k = lt > t0 ? 1 - pr(lt, t0, t0 + dur) : 0; if (k > 0) g.translate(Math.sin(lt * 90) * amp * k, Math.cos(lt * 71) * amp * .65 * k); }
  function paper(g, sheet = 0) { // в самом конце draw: зерно, волокна, виньетка; новый «лист» на каждой склейке
    // только сдвиг: зеркальный разворот листа стоит ~6 мс на кадр
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.drawImage(TX.paper, -(hash(sheet + .31) * 48 | 0), -(hash(sheet + 50.7) * 48 | 0)); g.restore();
  }

  // ---------- рисованные примитивы ----------
  function wob(g, v, closed, a = 1.4, sd = 0) { // путь через точки с «кипящим» дрожанием (8 раз/с)
    const n = v.length >> 1, q = new Array(n * 2);
    for (let i = 0; i < n; i++) {
      const x = v[2 * i], y = v[2 * i + 1];
      q[2 * i] = x + a * (Math.sin(x * .029 + y * .017 + BF * 2.3 + sd) + .5 * Math.sin(x * .071 - y * .053 + BF * 3.7 + sd * 1.7));
      q[2 * i + 1] = y + a * (Math.sin(x * .021 - y * .031 + BF * 1.9 + sd * 1.3) + .5 * Math.sin(y * .047 - x * .063 + BF * 2.9 + sd));
    }
    const mx = i => (q[2 * i] + q[2 * ((i + 1) % n)]) / 2, my = i => (q[2 * i + 1] + q[2 * ((i + 1) % n) + 1]) / 2;
    g.beginPath();
    if (n < 2) return;
    if (closed) { g.moveTo(mx(n - 1), my(n - 1)); for (let i = 0; i < n; i++) g.quadraticCurveTo(q[2 * i], q[2 * i + 1], mx(i), my(i)); g.closePath(); }
    else { g.moveTo(q[0], q[1]); for (let i = 1; i < n - 1; i++) g.quadraticCurveTo(q[2 * i], q[2 * i + 1], mx(i), my(i)); g.lineTo(q[2 * n - 2], q[2 * n - 1]); }
  }
  function shape(g, v, o = {}) { // заливка со сдвигом печати + контур от руки
    const a = o.amp ?? 1.4, sd = o.seed ?? 0, st = o.stroke === undefined ? P.ink : o.stroke;
    if (o.fill) { const m = o.mis ?? 5; g.save(); g.translate(m, m * .6); wob(g, v, !o.open, a, sd + 3.1); g.fillStyle = o.fill; g.fill(); g.restore(); }
    if (st) { wob(g, v, !o.open, a, sd); g.strokeStyle = st; g.lineWidth = o.lw ?? 6; g.lineJoin = g.lineCap = 'round'; g.stroke(); }
  }
  const ell = (cx, cy, rx, ry, n = 40, f) => { const v = []; for (let i = 0; i < n; i++) { const a = i / n * PI2, r = f ? f(a) : 1; v.push(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r); } return v; };
  function poly(v, s = 50) { // многоугольник → частые точки, углы почти острые
    const p = [], n = v.length / 2;
    for (let i = 0; i < n; i++) {
      const ax = v[2 * i], ay = v[2 * i + 1], bx = v[(2 * i + 2) % v.length], by = v[(2 * i + 3) % v.length];
      const L = Math.hypot(bx - ax, by - ay) || 1, m = Math.max(1, Math.round(L / s)), c = Math.min(6, L / 4) / L;
      p.push(ax, ay, lerp(ax, bx, c), lerp(ay, by, c));
      for (let j = 1; j < m; j++) p.push(lerp(ax, bx, j / m), lerp(ay, by, j / m));
      p.push(lerp(ax, bx, 1 - c), lerp(ay, by, 1 - c));
    }
    return p;
  }
  const box = (x, y, w, h) => poly([x, y, x + w, y, x + w, y + h, x, y + h]);
  const rbox = (x, y, w, h, r) => {
    r = Math.min(r, w / 2 - .5, h / 2 - .5); const v = [];
    [[x + w - r, y + r, -90], [x + w - r, y + h - r, 0], [x + r, y + h - r, 90], [x + r, y + r, 180]].forEach(([cx, cy, a0]) => {
      for (let i = 0; i <= 4; i++) { const a = (a0 + i * 22.5) * DEG; v.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } });
    return poly(v, 60);
  };
  const line = (x0, y0, x1, y1) => { const v = [], n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 50)); for (let i = 0; i <= n; i++) v.push(lerp(x0, x1, i / n), lerp(y0, y1, i / n)); return v; };
  const star = (cx, cy, r1, r0, n = 5, rot = -90) => { const v = []; for (let i = 0; i < n * 2; i++) { const a = rot * DEG + i * Math.PI / n, r = i % 2 ? r0 : r1; v.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } return poly(v, 40); };
  const blob = (cx, cy, r, seed = 1, k = .12) => ell(cx, cy, r, r, 36, a => 1 + k * (Math.sin(a * 3 + seed) * .6 + Math.sin(a * 5 + seed * 2.3) * .4));
  function trace(g, v, p, col = P.ink, lw = 8, o = {}) { // линия по точкам, прорисованная на долю p длины
    if (p <= 0) return; const L = []; let tot = 0;
    for (let i = 2; i < v.length; i += 2) { const l = Math.hypot(v[i] - v[i - 2], v[i + 1] - v[i - 1]); L.push(l); tot += l; }
    let rem = tot * cl(p); const out = [v[0], v[1]];
    for (let i = 0; i < L.length && rem > 0; i++) { const f = Math.min(1, rem / L[i]); out.push(lerp(v[2 * i], v[2 * i + 2], f), lerp(v[2 * i + 1], v[2 * i + 3], f)); rem -= L[i]; }
    if (out.length > 2) shape(g, out, { stroke: col, lw, open: true, amp: o.amp ?? 1.2, seed: o.seed });
  }
  const check = (g, x, y, s, p = 1, col = P.orange) => trace(g, [x - s * .5, y, x - s * .1, y + s * .45, x + s * .65, y - s * .6], p, col, s * .22);
  function ring(g, cx, cy, R1, R0, a0, a1, fs) { g.fillStyle = fs; g.beginPath(); g.arc(cx, cy, R1, a0, a1); g.arc(cx, cy, R0, a1, a0, true); g.closePath(); g.fill(); }
  function spark(g, x, y, r, c = P.card) {
    g.fillStyle = c; g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r);
    g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill();
  }
  function sparks(g, lt, pts, c = P.card) { pts.forEach(([x, y, r], i) => spark(g, x, y, r * (.6 + .4 * Math.abs(Math.sin(lt * 4 + i * 1.7))), c)); }
  function heart(g, x, y, r, c = P.pink) {
    g.fillStyle = c; g.beginPath(); g.moveTo(x, y + r); g.bezierCurveTo(x - r * 2, y - r * .3, x - r * .9, y - r * 1.9, x, y - r * .6);
    g.bezierCurveTo(x + r * .9, y - r * 1.9, x + r * 2, y - r * .3, x, y + r); g.fill();
  }
  function arrow(g, x0, y0, x1, y1, o = {}) { // толстая стрелка-плашка
    const L = Math.hypot(x1 - x0, y1 - y0), h = o.w || 56, hw = Math.min(L * .45, o.head || 130);
    g.save(); g.translate(x0, y0); g.rotate(Math.atan2(y1 - y0, x1 - x0));
    shape(g, poly([0, -h / 2, L - hw, -h / 2, L - hw, -h * 1.3, L, 0, L - hw, h * 1.3, L - hw, h / 2, 0, h / 2], 50), { fill: o.fill || P.yellow, lw: 9, mis: 6 });
    g.restore();
  }
  const dots = () => TX.dots, hatch = () => TX.hatch;
  function halftone(g, alpha = .2, x = 0, y = 0, w = W, h = H) { g.save(); g.globalAlpha *= alpha; if (!x && !y && w === W && h === H) g.drawImage(TX.half, 0, 0); else g.drawImage(TX.half, x, y, w, h, x, y, w, h); g.restore(); }

  // ---------- фоны (заливают весь кадр с запасом) ----------
  const full = (g, c) => { g.fillStyle = c; g.fillRect(-80, -80, W + 160, H + 160); };
  function bgFlat(g, col = P.paper, ht = 0) { full(g, col); if (ht) halftone(g, ht); }
  function bgRays(g, cx, cy, n = 18, bg = P.paper, col = P.pink, rot = 0) {
    full(g, bg); g.fillStyle = col; g.beginPath();
    for (let i = 0; i < n; i++) { const a = rot + i * PI2 / n, b = a + PI2 / n / 2; g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 2600, cy + Math.sin(a) * 2600); g.lineTo(cx + Math.cos(b) * 2600, cy + Math.sin(b) * 2600); g.closePath(); }
    g.fill();
  }
  function bgGrid(g, o = {}) { // миллиметровка
    full(g, o.bg || P.paper);
    [[o.minor || 45, o.c1 || P.grid, 2], [(o.minor || 45) * 5, o.c2 || P.grid2, 3]].forEach(([s, c, w]) => {
      g.strokeStyle = c; g.lineWidth = w; g.beginPath();
      for (let x = 0; x <= W + 60; x += s) { g.moveTo(x, -80); g.lineTo(x, H + 80); }
      for (let y = 15; y <= H + 80; y += s) { g.moveTo(-80, y); g.lineTo(W + 80, y); } g.stroke();
    });
  }
  function bgRings(g, cx, cy, lt, o = {}) { // кольца-мишень, бегут наружу
    full(g, o.bg || P.paper); const r0 = o.r0 ?? 340, gap = o.gap || 170, span = o.span || 1360;
    g.save(); g.strokeStyle = o.col || P.pink; g.lineWidth = o.w || 44;
    for (let i = 0; i < Math.ceil(span / gap); i++) {
      const r = r0 + (i * gap + lt * (o.speed ?? 110)) % span; g.globalAlpha = (o.alpha ?? .5) * (1 - (r - r0) / span);
      g.beginPath(); g.arc(cx, cy, r, 0, PI2); g.stroke();
    }
    g.restore();
  }
  function bgStripes(g, o = {}) { // полосы (angle в градусах), могут ехать
    full(g, o.bg || P.paper); const w = o.w || 44, gap = o.gap || 90, off = ((o.lt || 0) * (o.speed || 0)) % gap;
    g.save(); g.translate(W / 2, H / 2); g.rotate((o.angle || 0) * DEG); g.fillStyle = o.col || 'rgba(55,68,127,.07)';
    for (let x = -1400 + off; x < 1400; x += gap) g.fillRect(x, -1400, w, 2800); g.restore();
  }
  function speedLines(g, lt, o = {}) {
    const r = rnd(o.seed || 42), sp = o.speed ?? 260; g.strokeStyle = o.col || 'rgba(246,241,229,.2)'; g.lineCap = 'round';
    for (let i = 0; i < (o.n || 24); i++) {
      const y = lerp(o.y0 ?? 650, o.y1 ?? 1450, r()), L = 120 + r() * 400, v = .6 + r() * .9, x = W + 200 - (r() * 2200 + lt * sp * v) % 2200;
      g.lineWidth = 3 + r() * 8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + L, y); g.stroke();
    }
  }
  function galaxy(g, cx, cy, lt, k = 1, cols) { // спираль из точек, k — раскрытие 0…1
    const C = cols || [P.pink, P.orange, P.yellow, P.card, P.navy];
    for (let c = 0; c < 5; c++) {
      g.fillStyle = C[c % C.length]; g.beginPath();
      for (let i = c; i < 220; i += 5) {
        const u = (i / 5 | 0) / 44, a = c * PI2 / 5 + u * 3.4 + lt * .8 + (hash(i) - .5) * .35, r = (60 + u * 760 * (.85 + hash(i + 7) * .3)) * k, s = 4 + hash(i + 3) * 6;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; g.moveTo(x + s, y); g.arc(x, y, s, 0, PI2);
      }
      g.fill();
    }
  }
  function confetti(g, lt, n = 24, seed = 7, o = {}) { // бумажные карточки с бликом и полоски скотча
    const r = rnd(seed), c1 = o.c1 || P.pink, c2 = o.c2 || P.yellow;
    for (let i = 0; i < n; i++) {
      const x0 = o.edge ? (r() < .5 ? r() * 120 : W - r() * 120) : r() * W, y0 = r() * (H + 300), v = 140 + r() * 220, ph = r() * PI2, sp = (r() - .5) * 5, ty = r();
      const x = x0 + Math.sin(lt * 1.7 + ph) * 50, y = (y0 + v * lt) % (H + 300) - 150, pk = ty < .62, w = pk ? 54 : 92, h = pk ? 38 : 20;
      g.save(); g.translate(x, y); g.rotate(ph + sp * lt); g.scale(Math.cos(lt * 2.6 + ph * 2), 1);
      g.fillStyle = 'rgba(20,24,60,.25)'; g.fillRect(-w / 2 + 6, -h / 2 + 8, w, h);
      g.fillStyle = pk ? c1 : c2; g.fillRect(-w / 2, -h / 2, w, h);
      if (pk) { g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-12, 10); g.lineTo(2, -10); g.moveTo(4, 12); g.lineTo(14, -2); g.stroke(); }
      g.restore();
    }
  }

  // ---------- текст ----------
  function font(kind, size, o = {}) {
    size = Math.max(1, Math.round(size));
    if (kind === 'D') return (o.it ? 'italic ' : '') + (o.w || 900) + ' ' + size + 'px ' + F.D;
    if (kind === 'S') return (o.it === false ? '' : 'italic ') + (o.w || 400) + ' ' + size + 'px ' + F.S;
    if (kind === 'M') return (o.w || 700) + ' ' + size + 'px ' + F.M;
    return (o.it ? 'italic ' : '') + (o.w || 700) + ' ' + size + 'px ' + F.I;
  }
  function text(g, s, x, y, size, o = {}) { // kind: I (гротеск) | D (дисплей) | S (курсив-антиква) | M (моно)
    s = String(s); const kind = o.kind || 'I', ls0 = o.ls ?? (kind === 'M' ? size * .08 : 0);
    g.font = font(kind, size, o); LS(g, ls0); let w = g.measureText(s).width, ls = ls0;
    if (o.max && w > o.max) { const k = o.max / w; size *= k; ls *= k; g.font = font(kind, size, o); LS(g, ls); w = o.max; }
    g.textAlign = o.al || 'left'; g.textBaseline = 'alphabetic';
    if (o.stroke) { g.strokeStyle = o.stroke; g.lineWidth = o.lw || size * .14; g.lineJoin = 'round'; g.strokeText(s, x, y); }
    g.fillStyle = o.col || P.ink; g.fillText(s, x, y); LS(g, 0);
    return { w, size };
  }
  const mono = (g, s, x, y, size = 26, o = {}) => text(g, s, x, y, size, Object.assign({ kind: 'M' }, o));
  function big(g, s, x, y, size, o = {}) { // огромное слово: экструзия, обводка, заливка со сдвигом печати
    const fo = { it: o.it }; s = String(s); g.font = font('D', size, fo); LS(g, -size * .02);
    const w = g.measureText(s).width; if (o.max && w > o.max) { size *= o.max / w; g.font = font('D', size, fo); LS(g, -size * .02); }
    g.textAlign = o.al || 'center'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
    x += (hash(BF + size) - .5) * 2; y += (hash(BF * 1.7 + size) - .5) * 2;
    const lw = size * .045;
    if (o.ext) {
      const [ex, ey] = o.extV || [.025, .045]; g.fillStyle = o.ext;
      for (let i = 6; i > 0; i--) g.fillText(s, x + ex * size * i / 6, y + ey * size * i / 6);
      if (o.stroke) { g.strokeStyle = o.stroke; g.lineWidth = lw; g.strokeText(s, x + ex * size, y + ey * size); }
    }
    if (o.stroke) { g.strokeStyle = o.stroke; g.lineWidth = lw * 2; g.strokeText(s, x, y); }
    const m = o.mis ?? .018; g.fillStyle = o.fill || P.navy; g.fillText(s, x + size * m, y + size * m * .6);
    LS(g, 0); return size;
  }
  function pop(g, lt, t0, x, y, fn, o = {}) { // «шлепок» с перелётом вокруг (x,y); o.end — время ухода
    const p = pr(lt, t0, t0 + (o.dur || .3)); if (p <= 0) return false;
    const q = o.end != null ? pr(lt, o.end, o.end + .2) : 0; if (q >= 1) return false;
    const s = lerp(o.from ?? 1.5, 1, eb(p)) * (1 - eo(q) * .9);
    g.save(); g.translate(x, y); g.rotate((1 - eo(p)) * (o.rot ?? -.07)); g.scale(s, s); g.translate(-x, -y);
    g.globalAlpha *= cl(p * 4) * (1 - q); fn(g, p); g.restore(); return true;
  }
  function lyric(g, lt, t0, s, x, y, size = 72, o = {}) { // курсивная лирика, проявляется с подъёмом
    const a = pr(lt, t0, t0 + .25); if (a <= 0) return;
    g.save(); g.globalAlpha *= a;
    text(g, s, x, y + (1 - eo(a)) * 18, size, { kind: 'S', col: o.col || P.ink, al: o.al, max: o.max, stroke: o.halo, lw: size * .22 });
    g.restore();
  }
  const typed = (s, lt, t0, cps = 20) => s.slice(0, Math.max(0, Math.floor((lt - t0) * cps)));
  function banner(g, lt, t0, s, y, o = {}) { // цветная лента во всю ширину, въезжает слева, огромное слово
    g.save(); g.translate(lerp(-1300, 0, eo(pr(lt, t0, t0 + .35))), 0); g.translate(W / 2, y); g.rotate((o.rot ?? -2) * DEG); g.translate(-W / 2, -y);
    const h = o.h || 180; shape(g, box(-60, y - h / 2, W + 120, h), { fill: o.bg || P.teal, mis: 0, stroke: null });
    big(g, s, W / 2, y + h * .34, o.size || 150, { fill: o.col || P.ink, max: 930, mis: 0 }); g.restore();
  }

  // ---------- наклеенные элементы ----------
  function sticker(g, x, y, w, h, o = {}, fn) { // бумажный ярлык с тенью; fn(g, w, h) рисует в его координатах
    // не даём ярлыку уехать за край экрана (обрезанные «GAME F», «GREEN»)
    if (!o.free) { if (w < 900) x = Math.min(Math.max(x, 60), 1020 - w); if (h < 1500) y = Math.min(Math.max(y, 110), 1690 - h); }
    g.save(); g.translate(x + w / 2, y + h / 2); g.rotate((o.rot || 0) * DEG); g.translate(-w / 2, -h / 2);
    [[1, 5, 6, 7, .09], [3, 8, 2, 3, .09], [2, 4, 1, 1, .13]].forEach(([ox, oy, ex, ey, a]) => {
      g.fillStyle = 'rgba(40,30,20,' + a + ')'; g.fillRect(w, oy, ox + ex, h + ey); g.fillRect(ox, h, w - ox, oy + ey); });
    g.fillStyle = o.col || P.card; g.fillRect(0, 0, w, h);
    if (o.bar) { g.fillStyle = o.bar; g.fillRect(0, 0, 12, h); }
    if (o.tape) { g.save(); g.translate(w / 2, 0); g.rotate(-.06); g.fillStyle = 'rgba(246,241,229,.75)'; g.fillRect(-60, -16, 120, 32); g.restore(); }
    if (fn) fn(g, w, h); g.restore();
  }
  function tag(g, x, y, title, sub, o = {}) { // бирка: крупное слово + моно-подпись; o.center — x,y это центр
    const sz = o.size || 58, ss = Math.round(sz * .42);
    g.font = font('D', sz); const tw = g.measureText(title).width; let sw = 0;
    if (sub) { g.font = font('M', ss); LS(g, ss * .08); sw = g.measureText(sub).width; LS(g, 0); }
    const w = Math.min(o.maxW || 960, o.w || Math.max(tw, sw) + 72), h = sz * 1.18 + (sub ? ss * 1.55 : 0) + 22;
    const X = o.center ? x - w / 2 : x, Y = o.center ? y - h / 2 : y;
    sticker(g, X, Y, w, h, { rot: o.rot ?? -2, col: o.col || P.card, bar: o.bar === undefined ? P.ink : o.bar, tape: o.tape }, () => {
      text(g, title, 32, 10 + sz, sz, { kind: 'D', col: o.tcol || P.ink, max: w - 52 });
      if (sub) mono(g, sub, 34, 10 + sz + ss * 1.5, ss, { col: o.scol || P.ink, max: w - 52 });
    });
    return { w, h, x: X, y: Y };
  }
  function rubber(g, s, x, y, o = {}) { // резиновый штамп по центру x,y
    const size = o.size || 80, col = o.col || P.red;
    g.save(); g.translate(x, y); g.rotate((o.rot ?? -10) * DEG); g.font = font('D', size);
    const w = g.measureText(s).width + size * .7, h = size * 1.3;
    shape(g, box(-w / 2, -h / 2, w, h), { stroke: col, lw: size * .12, amp: 2 });
    shape(g, box(-w / 2 + size * .17, -h / 2 + size * .17, w - size * .34, h - size * .34), { stroke: col, lw: size * .045, amp: 2, seed: 2 });
    text(g, s, 0, size * .36, size, { kind: 'D', col, al: 'center' });
    const r = rnd(5); g.fillStyle = o.paper || P.paper; g.globalAlpha *= .75; g.beginPath();
    for (let i = 0; i < 70; i++) { const px = (r() - .5) * w, py = (r() - .5) * h, pr_ = 1 + r() * size * .05; g.moveTo(px + pr_, py); g.arc(px, py, pr_, 0, PI2); }
    g.fill(); g.restore();
  }
  function terminal(g, x, y, w, lines, lt, t0, o = {}) { // окно терминала; строки печатаются по очереди
    const fs = o.size || 30, lh = fs * 1.75, h = 42 + 26 + lines.length * lh, cps = o.cps || 20;
    let n = Math.floor(Math.max(0, lt - t0) * cps), cur = null;
    sticker(g, x, y, w, h, { rot: o.rot ?? -1.5 }, () => {
      g.fillStyle = o.bar || P.navy; g.fillRect(0, 0, w, 42);
      [P.pink, P.yellow, P.teal].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(26 + i * 30, 21, 8, 0, PI2); g.fill(); });
      mono(g, o.title || 'терминал', w - 26, 29, 20, { col: P.card, al: 'right', ls: 2 });
      lines.forEach((l, i) => {
        const k = Math.min(l.length, n); n -= l.length; const yy = 42 + 14 + lh * (i + .72);
        if (k <= 0 && cur) return;
        const r = mono(g, l.slice(0, Math.max(0, k)), 24, yy, fs, { col: l[0] === '>' ? P.ink : (o.okCol || P.teal), ls: 0, max: w - 60 });
        if (!cur && k < l.length) cur = [24 + r.w + 4, yy];
      });
      const done = lt - t0 - lines.reduce((a, l) => a + l.length, 0) / cps;
      if (!cur && done < 1) { const l = lines[lines.length - 1]; g.font = font('M', fs); cur = [24 + g.measureText(l).width + 4, 42 + 14 + lh * (lines.length - .28)]; }
      if (cur && (lt * 2) % 1 < .6 && lt >= t0) { g.fillStyle = P.ink; g.fillRect(cur[0], cur[1] - fs * .8, fs * .5, fs); }
    });
    return h;
  }
  function bubble(g, x, y, s, o = {}) { // пилюля-уведомление
    const a = o.alpha ?? 1; if (a <= 0) return; const size = o.size || 34;
    g.save(); g.globalAlpha *= a; g.font = font('I', size, { w: 800 }); const w = g.measureText(s).width + size * 1.3, h = size * 1.75;
    shape(g, rbox(x - w / 2, y - h / 2, w, h, h / 2), { fill: o.col || P.pink, lw: 6, mis: 3, amp: .8 });
    text(g, s, x, y + size * .36, size, { w: 800, col: o.tcol || P.card, al: 'center' }); g.restore();
  }
  function rise(g, lt, t0, s, x, y, o = {}) { const q = pr(lt, t0, t0 + (o.dur || 1.1)); if (q > 0 && q < 1) bubble(g, x, y - eo(q) * (o.dist || 200), s, Object.assign({}, o, { alpha: 1 - q * q })); }
  function say(g, x, y, s, o = {}) { // пузырь-реплика по центру x,y, хвост к (o.tx, o.ty)
    const size = o.size || 42, L = String(s).split('\n'); g.font = font('I', size, { w: 800 });
    const w = Math.max(...L.map(l => g.measureText(l).width)) + size * 1.3, h = L.length * size * 1.22 + size * .9;
    const x0 = x - w / 2, y0 = y - h / 2, x1 = x + w / 2, y1 = y + h / 2, r = Math.min(34, h / 2 - 2), tx = o.tx ?? x - w * .2, ty = o.ty ?? y1 + 70;
    const bx = cl(tx, x0 + r + 30, x1 - r - 30), v = [x0 + r, y0, x1 - r, y0, x1, y0 + r, x1, y1 - r, x1 - r, y1];
    if (ty > y1) v.push(bx + 26, y1, tx, ty, bx - 26, y1);
    v.push(x0 + r, y1, x0, y1 - r, x0, y0 + r);
    shape(g, poly(v, 50), { fill: o.col || P.card, lw: 6, mis: 4, amp: 1 });
    L.forEach((l, i) => text(g, l, x, y0 + size * .45 + size * (i + .82) * 1.22 - size * .12, size, { w: 800, col: o.tcol || P.ink, al: 'center' }));
  }
  function meter(g, x, y, w, h, f, col = P.orange) { // полоса прогресса со штриховкой
    g.fillStyle = P.card; g.fillRect(x, y, w, h); g.fillStyle = col; g.fillRect(x + 5, y + 5, (w - 10) * cl(f), h - 10);
    g.fillStyle = TX.hatch; g.fillRect(x + 5, y + 5, (w - 10) * cl(f), h - 10); g.strokeStyle = P.ink; g.lineWidth = 5; g.strokeRect(x, y, w, h);
  }
  function axes(g, ox, oy, w, h, p, o = {}) { // оси со стрелками, растут по p
    const a = eo(cl(p)); shape(g, line(ox, oy, ox + w * a, oy), { lw: 7, open: true }); shape(g, line(ox, oy, ox, oy - h * a), { lw: 7, open: true, seed: 1 });
    if (a > .98) { shape(g, [ox + w - 22, oy - 16, ox + w + 2, oy, ox + w - 22, oy + 16], { lw: 7, open: true }); shape(g, [ox - 16, oy - h + 22, ox, oy - h - 2, ox + 16, oy - h + 22], { lw: 7, open: true }); }
    if (o.y) text(g, o.y, ox + 24, oy - h + 40, 34, { kind: 'D' });
    if (o.x) mono(g, o.x, ox + w, oy - 24, 26, { al: 'right' });
    if (o.xt) o.xt.forEach((s, i, A) => mono(g, s, ox + w * (i + .5) / A.length, oy + 46, 26, { al: 'center' }));
  }
  function plot(g, pts, p, o = {}) { // толстая кривая графика + точки-кружки
    trace(g, pts, p, o.col || P.orange, o.lw || 14);
    if (o.dots) for (let i = 0; i < pts.length; i += 2) if (i / (pts.length - 2) <= p + 1e-6) { shape(g, ell(pts[i], pts[i + 1], 14, 14, 12), { fill: P.card, lw: 6, mis: 2, amp: .5, seed: i }); }
  }

  // ---------- постоянный «эфирный» интерфейс ----------
  function hudCounter(g, o = {}) { // слева вверху: подпись, большое значение, статус, полоска
    sticker(g, 60, 112, 284, 134, { rot: -1.3 }, () => {
      const lw = mono(g, o.label || 'СЧЁТ', 22, 36, 21, { col: P.navy, ls: 2, max: 140 }).w, sc = o.statusCol || P.teal;
      if (o.status) { g.fillStyle = sc; g.beginPath(); g.arc(22 + lw + 16, 29, 6, 0, PI2); g.fill();
        mono(g, o.status, 266, 36, 18, { col: sc, al: 'right', ls: 1, max: 266 - (22 + lw + 34) }); }
      g.save(); g.translate(20, 112); const pu = 1 + (o.pulse || 0) * .16; g.scale(pu, pu);
      const r = text(g, o.value ?? '0', 0, 0, 70, { w: 800, col: o.col || P.orange, max: (o.side ? 176 : 240) - (o.unit ? 36 : 0) });
      if (o.unit) text(g, o.unit, r.w + 6, 0, r.size * .48, { w: 800, col: o.col || P.orange });
      g.restore();
      if (o.side) String(o.side).split('\n').forEach((l, i, A) => mono(g, l, 266, 112 - (A.length - 1 - i) * 28, 20, { col: P.grey, al: 'right', ls: 1, max: 80 }));
      if (o.frac != null) { g.fillStyle = o.barCol || P.pink; g.fillRect(0, 128, 284 * cl(o.frac), 6); }
    });
  }
  function hudClock(g, o = {}) { // справа вверху: ● состояние, часы, дата
    // ms можно не задавать; год (1996) или странное число не превращаем в 1970.01.01
    const year = o.year || (o.ms >= 1000 && o.ms < 3000 ? Math.round(o.ms) : 0), ms = o.ms > 1e11 ? o.ms : year ? Date.UTC(year, 0, 1, 12) + T * 1000 : Date.UTC(2026, 9, 24, 12) + T * 1000, col = o.col || P.red;
    sticker(g, W - 376, 112, 316, 118, { rot: 1.2 }, () => {
      if (o.blink === false || T % 1 < .6) { g.fillStyle = o.dotCol || col; g.beginPath(); g.arc(24, 28, 7, 0, PI2); g.fill(); }
      const lw = mono(g, o.label || 'LIVE', 40, 35, 21, { col, ls: 2, max: 150 }).w;
      mono(g, o.time ?? hms(ms), 294, 35, 21, { w: 400, col: P.grey, al: 'right', ls: 0, max: Math.max(40, 294 - 52 - lw) });
      mono(g, o.date ?? ymd(ms), 22, 94, 46, { w: 400, col: P.date, ls: 0, max: 272 });
    });
  }
  const CAPC = new Map();
  function parseCap(str) { // «слово:.2 *ключ:.5 слово» — доли фразы; без доли — по позиции
    if (CAPC.has(str)) return CAPC.get(str);
    const ws = str.trim().split(/\s+/).map(x => { const m = x.match(/^(\*?)(.+?)(?::(0?\.\d+|1|0))?$/); return { w: m[2], k: !!m[1], p: m[3] != null ? +m[3] : null }; });
    const tot = ws.reduce((a, o) => a + o.w.length + 1, 0); let acc = 0;
    ws.forEach(o => { if (o.p == null) o.p = .04 + .8 * acc / tot; acc += o.w.length + 1; });
    CAPC.set(str, ws); return ws;
  }
  function hudCaption(g, caps, s) { // бумажная плашка внизу слева: слова темнеют по ходу фразы, ключевые подчёркнуты
    s = s || K.sub(T); const str = Array.isArray(caps) ? caps[Math.min(s.i, caps.length - 1)] : caps; if (!str) return;
    const ws = parseCap(str), MAXW = 904; let fs = 46, rows = [ws], tw = 0;
    const meas = () => { g.font = font('I', fs, { w: 600 }); ws.forEach(o => { o.wd = g.measureText(o.w).width; }); tw = Math.max(...rows.map(r => r.reduce((a, o) => a + o.wd + fs * .3, 0))); };
    meas();
    if (tw > MAXW) { // длинная — сначала ужимаем, ниже 36px переносим на две строки
      const f1 = fs * MAXW / tw;
      if (f1 >= 36 || ws.length < 2) fs = Math.max(20, Math.floor(f1));
      else { let acc = 0, half = tw / 2, cut = 1; for (let i = 0; i < ws.length; i++) { acc += ws[i].wd + fs * .3; if (acc >= half) { cut = Math.max(1, Math.min(ws.length - 1, acc - half > (ws[i].wd + fs * .3) / 2 ? i : i + 1)); break; } }
        rows = [ws.slice(0, cut), ws.slice(cut)]; meas(); if (tw > MAXW) fs = Math.max(20, Math.floor(fs * MAXW / tw)); }
      meas();
    }
    const lt = s.p * (s.t1 - s.t0), a = pr(lt, -.08, .22), sc = lerp(.8, 1, eb(a)), lh = fs * 1.3, hh = fs * .74 + rows.length * lh, y = 1678 - hh;
    g.save(); g.globalAlpha *= cl(a * 3); g.translate(60, y + hh / 2); g.scale(sc, sc); g.translate(-60, -y - hh / 2);
    sticker(g, 60, y, tw + 46, hh, { rot: s.i % 2 ? .9 : -.9 }, () => {
      rows.forEach((row, ri) => {
        let x = 30; const by = fs * 1.35 + ri * lh;
        row.forEach(o => {
          const on = s.p >= o.p; text(g, o.w, x, by, fs, { w: 600, col: on ? P.ink : P.mute });
          if (o.k && on) trace(g, line(x - 2, by + fs * .3, x + o.wd + 2, by + fs * .26), eo(pr(s.p, o.p, o.p + .1)), P.pink, 6);
          x += o.wd + fs * .3;
        });
      });
    });
    g.restore();
  }

  // ---------- герой-талисман ----------
  const HB = {};
  function heroBody(name) {
    if (HB[name]) return HB[name];
    const E = (rx, ry, f, n = 46) => ell(0, 0, rx, ry, n, f); let v = [], ff = .55;
    if (name === 'bean') v = E(140, 172, a => 1 + .08 * Math.sin(a));
    else if (name === 'round') v = E(160, 155);
    else if (name === 'blob') v = E(165, 150, a => 1 + .045 * Math.sin(a * 9) + .03 * Math.sin(a * 4 + 1));
    else if (name === 'cloud') v = E(185, 140, a => 1 + .09 * Math.abs(Math.sin(a * 3.5)), 56);
    else if (name === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 118 : 225; v.push(Math.cos(a) * r, Math.sin(a) * r + 20); } ff = .5; }
    else if (name === 'square') v = rbox(-150, -150, 300, 300, 70);
    else if (name === 'heart') { for (let i = 0; i < 48; i++) { const t = i / 48 * PI2; v.push(16 * Math.pow(Math.sin(t), 3) * 11, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 11 + 10); } ff = .42; }
    else { for (let i = 0; i < 46; i++) { const a = i / 46 * PI2; v.push(195 * Math.sin(a) * Math.sin(a / 2), -170 * Math.cos(a) - 30); } ff = .665; } // drop
    let top = 1e9, bot = -1e9, hip = -1e9, side = 0;
    for (let i = 0; i < v.length; i += 2) { top = Math.min(top, v[i + 1]); bot = Math.max(bot, v[i + 1]); if (Math.abs(v[i]) > 25 && Math.abs(v[i]) < 75) hip = Math.max(hip, v[i + 1]); }
    const arm = top + (bot - top) * .63;
    for (let i = 0; i < v.length; i += 2) if (Math.abs(v[i + 1] - arm) < (bot - top) * .12) side = Math.max(side, Math.abs(v[i]));
    if (hip < 0) hip = bot;
    return HB[name] = { v, top, bot, hip: hip - 14, arm, side: side - 8, face: top + (bot - top) * ff };
  }
  const dark = c => { const m = /^#([0-9a-f]{6})$/i.exec(c || ''); if (!m) return false; const n = parseInt(m[1], 16);
    return ((n >> 16) * .299 + (n >> 8 & 255) * .587 + (n & 255) * .114) / 255 < .42; };
  const heroFeet =(shape = 'drop') => heroBody(shape).hip + 140;
  function heroFace(g, B, o) {
    const md = o.mood || 'calm', lk = (o.look || 0) * 20, fy = B.face, E = [-36, 36], ink = o.ink || P.ink, tk = cl(o.talk || 0);
    const dot = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, PI2); g.fill(); };
    if (o.blush !== false) { g.fillStyle = o.blushCol || 'rgba(214,72,128,.5)'; const cx = Math.min(80, B.side * .58); [-cx, cx].forEach(ex => { g.beginPath(); g.ellipse(lk + ex, fy + 32, 20, 11, 0, 0, PI2); g.fill(); }); }
    g.fillStyle = ink; g.strokeStyle = ink; g.lineCap = 'round'; g.lineWidth = 7;
    const blink = BF % 23 === 0, mouthO = (y, rx, ry) => { g.beginPath(); g.ellipse(lk, y, rx, ry, 0, 0, PI2); g.fill(); };
    if (md === 'happy') {
      g.lineWidth = 8; E.forEach(ex => { g.beginPath(); g.arc(lk + ex, fy + 8, 15, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); });
      g.beginPath(); g.arc(lk, fy + 26, 28 - tk * 4, 0, Math.PI); g.closePath(); g.fill();
      g.fillStyle = P.pink; g.beginPath(); g.ellipse(lk, fy + 44 - tk * 2, 12, 6, 0, 0, PI2); g.fill();
    } else if (md === 'sad') {
      E.forEach(ex => { dot(lk + ex, fy + 2, 10); g.lineWidth = 6; g.beginPath(); g.moveTo(lk + ex * 1.5, fy - 20); g.lineTo(lk + ex * .55, fy - 32); g.stroke(); });
      g.lineWidth = 7; g.beginPath(); g.arc(lk, fy + 66, 22, 1.18 * Math.PI, 1.82 * Math.PI); g.stroke();
      const q = (T * .8) % 1; g.fillStyle = P.aqua; g.beginPath(); const tx = lk - 44, ty = fy + 18 + q * 60; g.moveTo(tx, ty - 12); g.quadraticCurveTo(tx + 9, ty + 2, tx, ty + 7); g.quadraticCurveTo(tx - 9, ty + 2, tx, ty - 12); g.fill();
    } else if (md === 'tired') {
      E.forEach(ex => { g.beginPath(); g.arc(lk + ex, fy, 12, 0, Math.PI); g.fill(); g.lineWidth = 6; g.beginPath(); g.moveTo(lk + ex - 18, fy - 1); g.lineTo(lk + ex + 18, fy + 1); g.stroke(); });
      g.strokeStyle = 'rgba(40,48,94,.5)'; g.lineWidth = 4; E.forEach(ex => { g.beginPath(); g.arc(lk + ex, fy + 8, 17, .2 * Math.PI, .8 * Math.PI); g.stroke(); });
      g.strokeStyle = ink; g.lineWidth = 6; g.beginPath(); g.moveTo(lk - 24, fy + 50); g.quadraticCurveTo(lk - 12, fy + 40, lk, fy + 50); g.quadraticCurveTo(lk + 12, fy + 60, lk + 24, fy + 48); g.stroke();
    } else if (md === 'wow' || md === 'scared') {
      E.forEach(ex => { g.fillStyle = P.card; g.beginPath(); g.ellipse(lk + ex, fy - 4, 18, 23, 0, 0, PI2); g.fill(); g.lineWidth = 6; g.stroke();
        g.fillStyle = P.ink; dot(lk + ex + lk * .3, fy, md === 'wow' ? 10 : 6); });
      if (md === 'wow') mouthO(fy + 46, 13, 17); else { g.lineWidth = 6; g.beginPath(); for (let i = 0; i <= 6; i++) g[i ? 'lineTo' : 'moveTo'](lk - 24 + i * 8, fy + 48 + (i % 2 ? -6 : 6)); g.stroke();
        const sx = B.side * .7; g.fillStyle = P.aqua; g.beginPath(); g.moveTo(sx, fy - 60); g.quadraticCurveTo(sx + 14, fy - 36, sx, fy - 28); g.quadraticCurveTo(sx - 14, fy - 36, sx, fy - 60); g.fill(); }
    } else if (md === 'sleep') {
      g.lineWidth = 7; E.forEach(ex => { g.beginPath(); g.arc(lk + ex, fy - 6, 14, .15 * Math.PI, .85 * Math.PI); g.stroke(); });
      mouthO(fy + 40, 8, 6 + Math.sin(T * 2.5) * 3);
      for (let i = 0; i < 3; i++) { const q = (T * .6 + i / 3) % 1; g.save(); g.globalAlpha *= 1 - q; mono(g, 'z', B.side * .55 + q * 90 + i * 8, B.top + 30 - q * 150, 36 + q * 30, { col: o.zCol || P.grey, ls: 0 }); g.restore(); }
    } else if (md === 'angry') {
      E.forEach(ex => { dot(lk + ex, fy + 2, 10); g.lineWidth = 8; g.beginPath(); g.moveTo(lk + ex * 1.6, fy - 30); g.lineTo(lk + ex * .5, fy - 14); g.stroke(); });
      g.lineWidth = 7; g.beginPath(); g.arc(lk, fy + 64, 20, 1.2 * Math.PI, 1.8 * Math.PI); g.stroke();
    } else if (md === 'love') {
      E.forEach(ex => heart(g, lk + ex, fy + 2, 13, P.red)); g.fillStyle = ink;
      g.beginPath(); g.arc(lk, fy + 26, 24, 0, Math.PI); g.closePath(); g.fill();
    } else { // calm
      if (blink) { g.lineWidth = 6; E.forEach(ex => { g.beginPath(); g.moveTo(lk + ex - 11, fy); g.lineTo(lk + ex + 11, fy); g.stroke(); }); }
      else E.forEach(ex => dot(lk + ex, fy, 10));
      if (tk > .05) mouthO(fy + 30, 16, 4 + tk * 16);
      else { g.lineWidth = 7; g.beginPath(); g.arc(lk, fy + 20, 22, .25 * Math.PI, .75 * Math.PI); g.stroke(); }
    }
  }
  function heroTop(g, B, kind, col) {
    const y = B.top + 8;
    if (kind === 'leaf') { shape(g, [0, y, 4, y - 30, 0, y - 56], { lw: 7, open: true, amp: .6 });
      shape(g, ell(-30, y - 52, 30, 14, 14), { fill: col || P.teal, lw: 5, mis: 3, amp: .6 }); shape(g, ell(30, y - 62, 30, 14, 14), { fill: col || P.teal, lw: 5, mis: 3, amp: .6, seed: 2 }); }
    else if (kind === 'antenna') { shape(g, [0, y, 8, y - 40, 4, y - 70], { lw: 7, open: true, amp: .6 }); shape(g, ell(4, y - 82, 17, 17, 12), { fill: col || P.yellow, lw: 6, mis: 3, amp: .5 }); }
    else if (kind === 'crown') shape(g, poly([-60, y + 6, -66, y - 60, -30, y - 28, 0, y - 76, 30, y - 28, 66, y - 60, 60, y + 6], 30), { fill: col || P.yellow, lw: 6, mis: 4 });
    else if (kind === 'bow') { [-1, 1].forEach(s => shape(g, poly([0, y - 4, s * 62, y - 40, s * 62, y + 26], 30), { fill: col || P.red, lw: 6, mis: 3, seed: s + 2 }));
      shape(g, ell(0, y - 6, 16, 16, 12), { fill: col || P.red, lw: 6, mis: 2 }); }
  }
  // o: shape drop|bean|round|blob|cloud|star|square|heart; color; fill 0…1 (сосуд с жидкостью color);
  // mood calm|happy|sad|tired|wow|scared|sleep|angry|love; arms rest|up|wave|droop|point|none; run (фаза бега);
  // jump 0…1 (фаза прыжка); legs false; look −1…1; talk 0…1; rot (град); top leaf|antenna|crown|bow; topCol; shoe
  function hero(g, x, y, s = 1, o = {}) {
    const B = heroBody(o.shape || 'drop'), col = o.color || P.pink, ink = o.ink || P.ink, j = o.jump;
    let lift = 0, sq = 0; const air = j != null && j > .12 && j < .88;
    if (j != null && j > 0 && j < 1) { lift = Math.sin(Math.PI * cl((j - .1) / .8)) * (o.jumpH || 170); sq = j < .12 ? Math.sin(j / .12 * Math.PI) * .12 : j > .88 ? Math.sin((j - .88) / .12 * Math.PI) * .12 : -.05; }
    g.save(); g.translate(x, y); g.scale(s, s); g.translate(0, -lift); if (o.rot) g.rotate(o.rot * DEG);
    const r = o.run ?? null, sw = r == null ? 0 : Math.sin(r);
    if (o.legs !== false) [[-50, 1], [50, -1]].forEach(([hx, sg], i) => {
      let a = r == null ? 0 : sg * sw * 1.05, b = r == null ? 0 : Math.max(0, sg * Math.cos(r)) * 1.5;
      if (air) { a = i ? .5 : -.6; b = (i ? -1 : 1) * .7; }
      const hy = B.hip + sq * 20, kx = hx + Math.sin(a) * 62, ky = hy + Math.cos(a) * 62, fx = kx + Math.sin(a - b) * 62, fy = ky + Math.cos(a - b) * 62;
      shape(g, [hx, hy, kx, ky, fx, fy], { stroke: ink, lw: 13, open: true, amp: .8, seed: i });
      shape(g, ell(fx + 14 * (i ? 1 : -1), fy + 6, 30, 15, 14), { fill: o.shoe || P.orange, stroke: ink, lw: 7, mis: 3, amp: .6, seed: i + 4 });
    });
    const am = o.arms || (r != null ? 'run' : 'rest');
    const A = am === 'up' ? [-2.3, -.85] : am === 'wave' ? [2.25, -.8 + Math.sin(T * 9) * .4] : am === 'droop' ? [1.95, 1.2]
      : am === 'point' ? [2.25, -.15] : am === 'run' ? [2.6 + sw * .8, .55 - sw * .8] : am === 'none' ? null : [2.25, .9];
    if (A) A.forEach((an, i) => {
      const sx = i ? B.side : -B.side, sy = B.arm, ex = sx + Math.cos(an) * 92, ey = sy + Math.sin(an) * 92;
      shape(g, [sx, sy, (sx + ex) / 2, (sy + ey) / 2 + 8, ex, ey], { stroke: ink, lw: 12, open: true, amp: .8, seed: i + 8 });
      shape(g, ell(ex, ey, 17, 17, 10), { fill: o.hand || P.card, stroke: ink, lw: 6, mis: 2, amp: .5, seed: i + 9 });
    });
    g.save(); g.translate(0, B.hip); g.scale(1 + sq, 1 - sq); g.translate(0, -B.hip);
    if (o.fill != null) { // сосуд: светлое тело, внутри жидкость цвета color
      const lv = cl(o.fill), wy = B.bot - lv * (B.bot - B.top) + 6, wv = lv > .97 ? 0 : 7;
      g.save(); g.translate(5, 3); wob(g, B.v, true, 1.2, 3.1); g.fillStyle = o.glass || P.card; g.fill(); g.clip();
      const surf = () => { for (let xx = -260; xx <= 260; xx += 26) g.lineTo(xx, wy + Math.sin(xx * .03 + T * 5) * wv); };
      g.beginPath(); g.moveTo(-260, B.bot + 40); surf(); g.lineTo(260, B.bot + 40); g.closePath(); g.fillStyle = col; g.fill(); g.fillStyle = TX.dots; g.fill();
      g.beginPath(); g.moveTo(-260, wy); surf(); g.strokeStyle = o.line || 'rgba(40,48,94,.45)'; g.lineWidth = 5; g.stroke();
      g.fillStyle = 'rgba(246,241,229,.7)';
      for (let i = 0; i < 5; i++) { const q = (T * .5 + i * .23) % 1, by = lerp(B.bot - 10, wy + 12, q); if (by > wy + 8) { g.beginPath(); g.arc(-70 + i * 34 + Math.sin(T * 4 + i) * 6, by, 5 + i % 3 * 2, 0, PI2); g.fill(); } }
      g.restore();
    } else shape(g, B.v, { fill: col, stroke: null, mis: 6 });
    if (o.gloss !== false) {
      const gx = -B.side * .8, gy = B.face; shape(g, [gx + 6, gy - 50, gx - 4, gy, gx + 4, gy + 46], { stroke: 'rgba(255,253,246,.85)', lw: 12, open: true, amp: .6 });
      g.fillStyle = 'rgba(255,253,246,.85)'; g.beginPath(); g.ellipse(-B.side * .42, B.top + (B.bot - B.top) * .24, 8, 18, .45, 0, PI2); g.fill();
    }
    shape(g, B.v, { stroke: ink, lw: 10, amp: 1.2 });
    heroFace(g, B, o.fill == null && dark(col) && !o.faceCol ? Object.assign({}, o, { ink: P.card }) : o.faceCol ? Object.assign({}, o, { ink: o.faceCol }) : o);
    if (o.top) heroTop(g, B, o.top, o.topCol);
    g.restore(); g.restore();
  }

  return { W, H, P, F, SAFE: { x0: 60, x1: 1020, y0: 110, y1: 1690 }, ZONE: { y0: 270, y1: 1560 },
    cl, pr, lerp, eo, eio, eb, hash, rnd, kf, twos, num, hms, ymd, bf: () => BF,
    begin, cuts, cam, shake, paper,
    wob, shape, ell, poly, box, rbox, line, star, blob, trace, check, ring, spark, sparks, heart, arrow, dots, hatch, halftone,
    bgFlat, bgRays, bgGrid, bgRings, bgStripes, speedLines, galaxy, confetti,
    font, text, mono, big, pop, lyric, typed, banner,
    sticker, tag, rubber, terminal, bubble, rise, say, meter, axes, plot,
    hudCounter, hudClock, hudCaption, hero, heroFeet };
})();
