// FLAT · «Плоская эволюция». Плоская векторная анимация: простые формы с тёмным контуром, мягкие плоские
// цвета без текстур, один крупный предмет в центре непрерывно эволюционирует, а мир едет сквозь эпохи:
// кремовая земля → небо → синь → ночь → космос с сиянием планеты и кольцом из точек.
const FLAT = (() => {
  const W = 1080, H = 1920, PI = Math.PI, TAU = PI * 2;
  const SAFE = { x0: 60, x1: 1020, y0: 110, y1: 1690 };
  const C = {
    cream: '#F4E3C8', sand: '#EBD3AE', paper: '#FFF8EC', white: '#FBF7EF',
    ink: '#2A2018', inkN: '#1A2436', slate: '#56606E', steel: '#D3DDE8', mist: '#9FB3CF',
    terra: '#B85C3C', rust: '#8E4429', peach: '#ECC2A2',
    wood: '#B06D3E', woodL: '#C98A57', woodD: '#7E4A28',
    olive: '#8E9B5C', oliveD: '#6E7A44',
    gold: '#E3A94B', goldL: '#F3CB7A', goldD: '#B8812F',
    sky: '#9EC2E2', blue: '#5D8BBE', deep: '#2F5888', navy: '#1C3354', night: '#101F38', space: '#070D19',
    glow: '#7DBDF5', flameY: '#FFE9A0', flameO: '#FFA347', flameR: '#F0652E',
    red: '#D9573B', green: '#7FAE6A', lcd: '#A9BF94', lcdD: '#3F4C35',
  };
  // Небо по эпохам: [верх, низ]. era — дробное число 0…6, цвета смешиваются.
  const SKY = [
    ['#F4E3C8', '#EED5B1'], ['#CFE1EC', '#F2E3CA'], ['#94BCE0', '#CFE1EE'], ['#4F7FB4', '#94B9DC'],
    ['#244873', '#5B89BC'], ['#101F38', '#284B78'], ['#060B17', '#122442'],
  ];
  const F = {
    sans: '"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif',
    serif: '"DejaVu Serif",Georgia,"Noto Serif","Times New Roman",serif',
    mono: '"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace',
  };
  const font = (px, w = 800, fam = 'sans') => `${w} ${Math.max(1, Math.round(px))}px ${F[fam] || fam}`;

  // ---------- время, изинги, пружины ----------
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, p) => a + (b - a) * p;
  const prog = (t, a, b) => clamp((t - a) / (b - a || 1e-6));
  const E = {
    lin: (x) => clamp(x),
    out: (x) => 1 - Math.pow(1 - clamp(x), 3),
    out5: (x) => 1 - Math.pow(1 - clamp(x), 5),
    in: (x) => Math.pow(clamp(x), 3),
    in2: (x) => Math.pow(clamp(x), 2),
    inOut: (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
    sine: (x) => 0.5 - 0.5 * Math.cos(PI * clamp(x)),
    back: (x) => { x = clamp(x); const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  };
  // затухающая пружина 0→1 (lt — секунды от старта, f — частота Гц, z — затухание 0…1)
  function spring(lt, f = 2.2, z = 0.45) {
    if (lt <= 0) return 0;
    const w = TAU * f, wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * lt) * (Math.cos(wd * lt) + ((z * w) / wd) * Math.sin(wd * lt));
  }
  const pop = (t, t0, f = 2.6, z = 0.42) => spring(t - t0, f, z);
  // огибающая: появление за din после t0, уход к моменту t1 (уход быстрее появления)
  function env(t, t0, t1 = Infinity, din = 0.3, dout = 0.2) {
    const a = E.out(prog(t, t0, t0 + din));
    const b = t1 === Infinity ? 1 : 1 - E.in(prog(t, t1 - dout, t1));
    return Math.min(a, b);
  }
  const wob = (t, f = 0.5, a = 1, ph = 0) => Math.sin((t * f + ph) * TAU) * a;
  // толчок-реакция: 0 → всплеск → затухающие колебания → 0 (для вторичного движения на событии)
  const kick = (lt, f = 3, d = 5) => (lt <= 0 ? 0 : Math.exp(-d * lt) * Math.sin(TAU * f * lt));
  const seq = (t, t0, i, gap = 0.08, dur = 0.3) => prog(t, t0 + i * gap, t0 + i * gap + dur);
  function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function rnd(seed) {
    let a = (Math.floor(seed * 7919) ^ 0x9e3779b9) >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  }

  // ---------- цвет ----------
  const _cc = new Map();
  function rgb(c) {
    let v = _cc.get(c); if (v) return v;
    let h = String(c).replace('#', ''); if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    _cc.set(c, v); return v;
  }
  const hex2 = (n) => (n < 16 ? '0' : '') + n.toString(16);
  function mix(a, b, p) {
    p = clamp(p); if (p <= 0) return a; if (p >= 1) return b;
    const A = rgb(a), B = rgb(b);
    return '#' + hex2(Math.round(A[0] + (B[0] - A[0]) * p)) + hex2(Math.round(A[1] + (B[1] - A[1]) * p)) + hex2(Math.round(A[2] + (B[2] - A[2]) * p));
  }
  function rgba(c, a) { const A = rgb(c); return `rgba(${A[0]},${A[1]},${A[2]},${clamp(a)})`; }
  function lum(c) { const A = rgb(c); return (0.2126 * A[0] + 0.7152 * A[1] + 0.0722 * A[2]) / 255; }

  // ---------- дорожки значений ----------
  function wfn(o) {
    if (o.dur) { const e = E[o.ease || 'inOut']; return (lt) => e(lt / o.dur); }
    const f = o.f || 2.2, z = o.z == null ? 0.5 : o.z;
    return (lt) => spring(lt, f, z);
  }
  function acc(v, a, b, p) {
    if (typeof v === 'number') return v + (b - a) * p;
    if (typeof v === 'string') return p <= 0 ? v : mix(v, b, p);
    if (Array.isArray(v)) return v.map((x, i) => acc(x, a[i], b[i], p));
    if (v && typeof v === 'object') { const r = {}; for (const key in v) r[key] = b && key in b ? acc(v[key], a[key], b[key], p) : v[key]; return r; }
    return p >= 0.5 ? b : v;
  }
  // track(t, [[t0, v0], [t1, v1], …], {f, z} | {dur, ease}) — значение (число, '#цвет', массив, объект),
  // которое в моменты ti переезжает к vi пружиной (по умолчанию) или изингом за dur.
  function track(t, list, o = {}) {
    const w = wfn(o); let v = list[0][1];
    for (let i = 1; i < list.length; i++) { const lt = t - list[i][0]; if (lt <= 0) break; v = acc(v, list[i - 1][1], list[i][1], w(lt)); }
    return v;
  }
  // steps(t, [t1, t2, …]) — плавный номер ступени: 0 до t1, 1 после t1 и т.д. (для эпох, фона)
  function steps(t, times, o = {}) { const w = wfn(o.dur || o.f ? o : { dur: 0.8 }); let s = 0; for (const ti of times) if (t > ti) s += w(t - ti); return s; }
  function cuts(t, list) {
    let i = 0; while (i + 1 < list.length && t >= list[i + 1]) i++;
    const t0 = list[i], t1 = i + 1 < list.length ? list[i + 1] : Infinity;
    return { i, t0, t1, lt: t - t0, d: t1 - t0, p: t1 === Infinity ? 0 : clamp((t - t0) / (t1 - t0)) };
  }

  // ---------- кадр и камера ----------
  function begin(t, k) { const g = k.g; g.lineJoin = 'round'; g.lineCap = 'round'; g.textBaseline = 'alphabetic'; g.textAlign = 'left'; return g; }
  // cam: точка (fx,fy) мира попадает в (fx+dx, fy+dy) экрана, вокруг неё zoom и rot
  function cam(g, o = {}) {
    const fx = o.fx == null ? W / 2 : o.fx, fy = o.fy == null ? H / 2 : o.fy, z = o.zoom || 1;
    g.translate(fx + (o.dx || 0), fy + (o.dy || 0)); if (o.rot) g.rotate(o.rot); g.scale(z, z); g.translate(-fx, -fy);
  }
  const settle = (lt, amt = 0.05, f = 1.4, z = 0.62) => 1 + amt * (1 - spring(lt, f, z));
  function shake(lt, amp = 10, dur = 0.35, seed = 1) {
    if (lt < 0 || lt > dur) return [0, 0];
    const q = 1 - lt / dur, a = amp * q * q;
    return [Math.sin(lt * 71 + seed) * a, Math.cos(lt * 53 + seed * 2) * a];
  }

  // ---------- фон: небо, земля, горы, облака, столбы, звёзды, планета ----------
  function skyCols(era) {
    const i = clamp(Math.floor(era), 0, SKY.length - 1), j = Math.min(i + 1, SKY.length - 1), p = clamp(era - i);
    return [mix(SKY[i][0], SKY[j][0], p), mix(SKY[i][1], SKY[j][1], p)];
  }
  function sky(g, era, o = {}) {
    // плоские полосы вместо градиента: глазу не видно ступеней, а заливка в разы быстрее
    const [a, b] = o.cols || skyCols(era), n = o.bands || 48, h = Math.ceil(H / n);
    for (let i = 0; i < n; i++) { g.fillStyle = mix(a, b, (i + 0.5) / n); g.fillRect(0, i * h, W, h); }
    return { top: a, bot: b };
  }
  // цвет текста под эпоху: тёмные чернила на светлом небе, кремовый на тёмном
  function tone(era) { const d = clamp((era - 2.45) / 0.5); return { ink: mix(C.inkN, C.paper, d), line: mix(C.ink, '#FFFFFF', d), d, dark: d > 0.5 }; }
  // пилообразная земля из образца: зубцы высотой h, вершины на y, сдвиг off (px) уводит зубцы влево
  function ground(g, o = {}) {
    const y = o.y == null ? 1640 : o.y, th = o.h || 70, tw = o.tooth || 78, off = o.off || 0;
    if (y > H + 5) return;
    let x = -(((off % tw) + tw) % tw) - tw;
    g.beginPath(); g.moveTo(x, H + 20); g.lineTo(x, y + th);
    while (x < W + tw) { g.lineTo(x + tw / 2, y); g.lineTo(x + tw, y + th); x += tw; }
    g.lineTo(x, H + 20); g.closePath(); g.fillStyle = o.col || C.olive; g.fill();
    if (o.band !== false) { g.fillStyle = o.col2 || C.oliveD; g.fillRect(0, y + th, W, Math.max(0, H - y - th)); }
  }
  const _hills = new Map();
  function hillPeaks(seed, per, h) {
    const key = seed + ':' + per + ':' + h; let v = _hills.get(key); if (v) return v;
    const r = rnd(seed); v = []; let x = 0;
    while (x < per) { const w = 300 + r() * 360; v.push([x, w, h * (0.5 + r() * 0.6)]); x += w * (0.45 + r() * 0.35); }
    _hills.set(key, v); return v;
  }
  // плоские треугольные горы (тёмно-синие, как в образце); y — линия подножия
  function hills(g, o = {}) {
    const y = o.y == null ? 1660 : o.y, per = o.per || 1800, pk = hillPeaks(o.seed || 3, per, o.h || 300);
    if (y > H + 5) return;
    const off = (((o.off || 0) % per) + per) % per;
    g.beginPath();
    for (let rep = -1; rep <= Math.ceil(W / per) + 1; rep++) {
      const bx = rep * per - off;
      for (const [px, w, h] of pk) { const cx = bx + px; if (cx + w < -60 || cx - w > W + 60) continue; g.moveTo(cx - w / 2, y + 3); g.lineTo(cx, y - h); g.lineTo(cx + w / 2, y + 3); g.closePath(); }
    }
    g.fillStyle = o.col || C.navy; g.fill(); g.fillRect(0, y, W, H - y + 10);
  }
  function cloud(g, x, y, s = 1, o = {}) {
    g.beginPath(); rr(g, x - 120 * s, y - 34 * s, 240 * s, 68 * s, 34 * s);
    g.moveTo(x + 8 * s, y - 30 * s); g.arc(x - 40 * s, y - 30 * s, 48 * s, 0, TAU);
    g.moveTo(x + 92 * s, y - 40 * s); g.arc(x + 34 * s, y - 40 * s, 58 * s, 0, TAU);
    g.fillStyle = o.col || C.white; g.fill();
  }
  function clouds(g, t, o = {}) {
    const n = o.n || 5, r = rnd(o.seed || 5), y0 = o.y0 == null ? 260 : o.y0, y1 = o.y1 == null ? 1300 : o.y1, span = W + 700, a0 = o.alpha == null ? 0.9 : o.alpha;
    if (a0 <= 0) return;
    g.save(); g.globalAlpha *= a0;
    for (let i = 0; i < n; i++) {
      const bx = r() * span, y = y0 + r() * (y1 - y0), s = (o.s || 1) * (0.6 + r() * 0.7), dep = 0.4 + s * 0.6;
      const x = ((((bx - ((o.off || 0) + t * (o.speed || 30)) * dep) % span) + span) % span) - 350;
      cloud(g, x, y, s, o);
    }
    g.restore();
  }
  // телеграфные столбы с провисшими проводами; y — земля под столбами
  function poles(g, o = {}) {
    const y = o.y == null ? 1660 : o.y, h = o.h || 330, gap = o.gap || 460, off = (((o.off || 0) % gap) + gap) % gap, col = o.col || C.woodD;
    if (y - h > H) return;
    const xs = []; for (let x = -off - gap; x < W + gap * 2; x += gap) xs.push(x);
    g.save(); g.strokeStyle = o.wire || C.ink; g.globalAlpha *= 0.55; g.lineWidth = 3;
    for (let i = 0; i + 1 < xs.length; i++) for (const d of [-46, 46]) {
      const ax = xs[i] + d, bx = xs[i + 1] + d, wy = y - h + 24;
      g.beginPath(); g.moveTo(ax, wy); g.quadraticCurveTo((ax + bx) / 2, wy + 64, bx, wy); g.stroke();
    }
    g.restore();
    for (const x of xs) {
      seg(g, x, y + 10, x, y - h, { lw: 12, col }); seg(g, x - 58, y - h + 30, x + 58, y - h + 30, { lw: 9, col });
      disc(g, x - 46, y - h + 22, 7, { fill: C.paper, lw: 3 }); disc(g, x + 46, y - h + 22, 7, { fill: C.paper, lw: 3 });
    }
  }
  function stars(g, t, o = {}) {
    const n = o.n || 90, r = rnd(o.seed || 7), y1 = o.y1 || H, a0 = o.alpha == null ? 1 : o.alpha, off = o.off || 0;
    if (a0 <= 0) return;
    const ga = g.globalAlpha; g.fillStyle = o.col || '#F4F1EA';
    for (let i = 0; i < n; i++) {
      const x0 = r() * W, y = r() * y1, s = 2 + Math.floor(r() * 3), ph = r() * TAU, sp = 0.6 + r() * 1.6;
      const x = ((((x0 - off * s * 0.3) % W) + W) % W);
      const a = a0 * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * sp * 2 + ph)));
      g.globalAlpha = ga * a; g.fillRect(Math.round(x), Math.round(y), s, s);
    }
    g.globalAlpha = ga;
  }
  let _planet = null;
  function planetSprite() {
    if (_planet) return _planet;
    const SH = 760, cv = new OffscreenCanvas(W, SH), c = cv.getContext('2d');
    const R = 1700, cx = W / 2, cy = 470 + R;
    for (let i = 26; i >= 1; i--) { c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.lineWidth = i * 16; c.strokeStyle = rgba(C.glow, 0.035); c.stroke(); }
    const gr = c.createRadialGradient(cx, cy, R * 0.9, cx, cy, R);
    gr.addColorStop(0, '#07101F'); gr.addColorStop(0.82, '#0F2A4F'); gr.addColorStop(1, '#2C6BB0');
    c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fillStyle = gr; c.fill();
    c.lineWidth = 5; c.strokeStyle = '#A9DBFF'; c.stroke();
    _planet = cv; return cv;
  }
  // край планеты с сиянием внизу кадра; rise 0…1 поднимает его из-за края
  function planet(g, o = {}) {
    const a = o.alpha == null ? 1 : o.alpha, rise = o.rise == null ? 1 : o.rise; if (a <= 0 || rise <= 0) return;
    const sp = planetSprite(); g.save(); g.globalAlpha *= a; g.drawImage(sp, 0, Math.round(H - 760 + (1 - rise) * 560 + (o.dy || 0))); g.restore();
  }
  // линии скорости: тонкие штрихи летят влево (dir:'down' — вниз, будто предмет летит вверх)
  function speed(g, t, o = {}) {
    const n = o.n || 14, y0 = o.y0 == null ? 200 : o.y0, y1 = o.y1 == null ? 1600 : o.y1, r = rnd(o.seed || 11), sp = o.speed || 2400, a0 = o.alpha == null ? 0.6 : o.alpha;
    if (a0 <= 0) return;
    const ga = g.globalAlpha, down = o.dir === 'down'; g.strokeStyle = o.col || '#FFFFFF'; g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const q = y0 + r() * (y1 - y0), L = (o.len || 260) * (0.5 + r()), v = sp * (0.6 + r() * 0.8), ph = r(), lw = 2 + r() * (o.lw || 3), al = 0.4 + 0.6 * r();
      const span = (down ? H : W) + L * 2, p = (((t * v) / span + ph) % 1) * span;
      g.globalAlpha = ga * a0 * al; g.lineWidth = lw; g.beginPath();
      if (down) { const y = -L + p; g.moveTo(q, y); g.lineTo(q, y + L); } else { const x = W + L - p; g.moveTo(x, q); g.lineTo(x + L, q); }
      g.stroke();
    }
    g.globalAlpha = ga;
  }
  // всплеск линий скорости вокруг склейки tc
  function whoosh(g, t, tc, o = {}) {
    const a = E.out(prog(t, tc - 0.12, tc)) * (1 - E.in(prog(t, tc + 0.12, tc + 0.6)));
    if (a <= 0) return;
    speed(g, t, Object.assign({ n: 18, len: 420, speed: 3800, lw: 4, seed: Math.floor(tc * 10) }, o, { alpha: a * (o.alpha == null ? 0.8 : o.alpha) }));
  }
  // медленные пылинки/искорки — фоновый слой
  function motes(g, t, o = {}) {
    const n = o.n || 22, r = rnd(o.seed || 19), a0 = o.alpha == null ? 0.5 : o.alpha; if (a0 <= 0) return;
    const ga = g.globalAlpha; g.fillStyle = o.col || C.white;
    for (let i = 0; i < n; i++) {
      const x0 = r() * W, y0 = r() * H, vx = (r() - 0.5) * 30, vy = 10 + r() * 30, s = 3 + r() * 6, ph = r() * TAU;
      const x = (((x0 + t * vx - (o.off || 0) * 0.2) % W) + W) % W, y = (((y0 - t * vy) % H) + H) % H;
      g.globalAlpha = ga * a0 * (0.5 + 0.5 * Math.sin(t * 1.3 + ph)); g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
    }
    g.globalAlpha = ga;
  }

  // ---------- примитивы: заливка + тёмный контур ----------
  function rr(g, x, y, w, h, r) {
    if (w < 0) { x += w; w = -w; } if (h < 0) { y += h; h = -h; }
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function rpoly(g, pts, r) {
    const n = pts.length, m = (i) => pts[(i + n) % n];
    g.moveTo((m(0)[0] + m(-1)[0]) / 2, (m(0)[1] + m(-1)[1]) / 2);
    for (let i = 0; i < n; i++) { const a = m(i), b = m(i + 1); g.arcTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, r); }
    g.closePath();
  }
  // плоская тень-полоса внутри текущего пути: side 'r'|'l'|'b'|'t', frac — доля ширины/высоты, bb=[x,y,w,h]
  function shadeIn(g, col, side, frac, bb) {
    const [x, y, w, h] = bb; g.save(); g.clip(); g.fillStyle = col;
    if (side === 'l') g.fillRect(x - 4, y - 4, w * frac + 4, h + 8);
    else if (side === 'b') g.fillRect(x - 4, y + h * (1 - frac), w + 8, h * frac + 4);
    else if (side === 't') g.fillRect(x - 4, y - 4, w + 8, h * frac + 4);
    else g.fillRect(x + w * (1 - frac), y - 4, w * frac + 4, h + 8);
    g.restore();
  }
  // залить и обвести текущий путь: o.stroke (null — без контура), o.lw
  function fs(g, fill, o = {}) {
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (o.stroke !== null && o.lw !== 0) { g.lineWidth = o.lw || 5; g.strokeStyle = o.stroke || C.ink; g.lineJoin = 'round'; g.stroke(); }
  }
  function box(g, x, y, w, h, o = {}) {
    g.beginPath(); rr(g, x, y, w, h, o.r == null ? 14 : o.r);
    if (o.fill !== null) { g.fillStyle = o.fill || C.paper; g.fill(); }
    if (o.shade) shadeIn(g, o.shade, o.side || 'r', o.sw || 0.2, [x, y, w, h]);
    fs(g, null, o);
  }
  function disc(g, x, y, r, o = {}) { g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, TAU); if (o.shade) { g.fillStyle = o.fill || C.paper; g.fill(); shadeIn(g, o.shade, o.side || 'r', o.sw || 0.3, [x - r, y - r, 2 * r, 2 * r]); fs(g, null, o); } else fs(g, o.fill === undefined ? C.paper : o.fill, o); }
  function ring(g, x, y, r, o = {}) {
    g.save(); g.beginPath(); g.arc(x, y, Math.max(0.1, r), o.a0 || 0, o.a1 == null ? TAU : o.a1);
    if (o.dash) g.setLineDash(o.dash); g.lineWidth = o.lw || 4; g.strokeStyle = o.col || C.ink; g.globalAlpha *= o.alpha == null ? 1 : o.alpha; g.stroke(); g.restore();
  }
  function seg(g, x0, y0, x1, y1, o = {}) {
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineWidth = o.lw || 5; g.strokeStyle = o.col || C.ink; g.lineCap = o.cap || 'round';
    if (o.dash) { g.setLineDash(o.dash); g.stroke(); g.setLineDash([]); } else g.stroke();
  }
  function poly(g, pts, o = {}) {
    g.beginPath();
    if (o.r) rpoly(g, pts, o.r); else { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); if (o.open !== true) g.closePath(); }
    if (o.shade) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      g.fillStyle = o.fill || C.paper; g.fill(); shadeIn(g, o.shade, o.side || 'r', o.sw || 0.2, [x0, y0, x1 - x0, y1 - y0]); fs(g, null, o);
    } else fs(g, o.fill === undefined ? C.paper : o.fill, o);
  }
  // гладкая линия через точки, p — доля прорисовки 0…1
  function curve(g, pts, o = {}) {
    const n = pts.length; if (n < 2) return; const p = o.p == null ? 1 : clamp(o.p); if (p <= 0) return;
    const last = Math.max(1, Math.floor((n - 1) * p));
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < last; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; g.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
    g.lineTo(pts[last][0], pts[last][1]);
    g.lineWidth = o.lw || 5; g.strokeStyle = o.col || C.ink; if (o.dash) g.setLineDash(o.dash); g.stroke(); if (o.dash) g.setLineDash([]);
  }

  // ---------- фирменные предметы образца ----------
  // плоское пламя из трёх слоёв, сопло в (x,y), язык смотрит по углу ang (по умолчанию влево)
  function flame(g, t, x, y, len, w, o = {}) {
    const fl = 1 + 0.08 * Math.sin(t * 37) + 0.05 * Math.sin(t * 21.7 + 1);
    g.save(); g.translate(x, y); g.rotate(o.ang == null ? PI : o.ang);
    const layer = (L, Wd, col) => { g.beginPath(); g.moveTo(0, -Wd / 2); g.bezierCurveTo(L * 0.35, -Wd / 2, L * 0.7, -Wd * 0.18, L, 0); g.bezierCurveTo(L * 0.7, Wd * 0.18, L * 0.35, Wd / 2, 0, Wd / 2); g.closePath(); g.fillStyle = col; g.fill(); };
    layer(len * fl, w, o.c1 || C.flameR); layer(len * 0.72 * fl, w * 0.72, o.c2 || C.flameO); layer(len * 0.42 * fl, w * 0.45, o.c3 || C.flameY);
    g.restore();
  }
  // снаряд/ракета боком, нос вправо; fins 0…1 растит стабилизаторы, flame 0…1 — пламя
  function rocket(g, t, x, y, s = 1, o = {}) {
    const L = o.len || 420, R = o.r || 46, col = o.col || C.gold, sh = o.shade || C.goldD, ink = o.stroke || C.ink, fins = o.fins == null ? 1 : o.fins;
    g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); g.scale(s, s);
    if (o.flame) flame(g, t, -L / 2 + 4, 0, 220 * o.flame, R * 1.4);
    if (fins > 0) for (const sg of [-1, 1]) poly(g, [[-L / 2 + 6, sg * (R - 4)], [-L / 2 + 96, sg * (R - 4)], [-L / 2 + 6 - 26 * fins, sg * (R + 80 * fins)]], { fill: col, lw: 4, stroke: ink });
    g.beginPath(); g.moveTo(-L / 2, -R); g.lineTo(L / 2 - R * 2.2, -R); g.quadraticCurveTo(L / 2 - R * 0.4, -R * 0.9, L / 2, 0); g.quadraticCurveTo(L / 2 - R * 0.4, R * 0.9, L / 2 - R * 2.2, R); g.lineTo(-L / 2, R); g.closePath();
    g.fillStyle = col; g.fill(); shadeIn(g, sh, 'b', 0.32, [-L / 2, -R, L, 2 * R]); fs(g, null, { stroke: ink });
    seg(g, L / 2 - R * 2.2, -R + 4, L / 2 - R * 2.2, R - 4, { lw: 7, col: ink });
    g.restore();
  }
  // кольцо из скруглённых точек (финал образца). p — сборка 0…1 (точки по кругу), src(i,n) → [x,y] откуда летит точка
  function dotRing(g, t, x, y, r, o = {}) {
    const n = o.n || 36, p = o.p == null ? 1 : o.p, spin = (o.spin == null ? 0.12 : o.spin) * t, dw = o.dw || 24, dh = o.dh || 12;
    if (p <= 0) return;
    if (o.inner) ring(g, x, y, r * o.inner, { lw: 3, col: o.innerCol || C.mist, alpha: 0.55 * clamp(p * 1.5) });
    g.fillStyle = o.col || C.white;
    for (let i = 0; i < n; i++) {
      const st = (i / n) * 0.55, q = E.out(prog(p, st, st + 0.45)); if (q <= 0) continue;
      const a = (i / n) * TAU + spin; let px = x + Math.cos(a) * r, py = y + Math.sin(a) * r, sc = E.back(q);
      if (o.src) { const s0 = o.src(i, n); px = lerp(s0[0], px, q); py = lerp(s0[1], py, q); sc = 0.6 + 0.4 * q; }
      g.save(); g.translate(px, py); g.rotate(a + PI / 2); g.scale(sc, sc); g.beginPath(); rr(g, -dw / 2, -dh / 2, dw, dh, dh / 2.2); g.fill(); g.restore();
    }
  }
  // радиальные штрихи-удар на событии (lt — секунды от события)
  function burst(g, lt, x, y, o = {}) {
    const dur = o.dur || 0.4; if (lt < 0 || lt > dur) return;
    const p = lt / dur, n = o.n || 10, r0 = o.r0 || 60, r1 = o.r1 || 150, e = E.out(p);
    g.save(); g.strokeStyle = o.col || C.ink; g.lineWidth = (o.lw || 6) * (1 - p * 0.6); g.lineCap = 'round'; g.globalAlpha *= 1 - E.in(p);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + (o.rot || 0), ra = r0 + (r1 - r0) * e * 0.55, rb = r0 + (r1 - r0) * e;
      g.beginPath(); g.moveTo(x + Math.cos(a) * ra, y + Math.sin(a) * ra); g.lineTo(x + Math.cos(a) * rb, y + Math.sin(a) * rb); g.stroke();
    }
    g.restore();
  }
  // расходящееся кольцо-волна
  function pulse(g, lt, x, y, o = {}) {
    const dur = o.dur || 0.6; if (lt < 0 || lt > dur) return; const p = lt / dur;
    ring(g, x, y, lerp(o.r0 || 40, o.r1 || 220, E.out(p)), { lw: (o.lw || 8) * (1 - p) + 1, col: o.col || C.white, alpha: 1 - E.in2(p) });
  }
  function sparkle(g, x, y, r, o = {}) {
    g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r);
    g.fillStyle = o.col || C.white; g.fill();
  }
  // плоские клубы (пыль, пар): растут, разлетаются и тают
  function puffs(g, lt, x, y, o = {}) {
    const dur = o.dur || 0.8; if (lt < 0 || lt > dur) return;
    const n = o.n || 6, r = rnd(o.seed || 23), p = lt / dur, e = E.out(p);
    g.save(); g.fillStyle = o.col || C.paper; g.globalAlpha *= 1 - E.in2(p);
    for (let i = 0; i < n; i++) {
      const a = (o.ang == null ? 0 : o.ang) + (r() - 0.5) * (o.spread || TAU), d = (o.dist || 120) * (0.5 + r() * 0.6) * e, rad = (o.r || 26) * (0.6 + r() * 0.6) * (0.5 + e * 0.8);
      g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rad, 0, TAU); g.fill();
    }
    g.restore();
  }
  // кусочки с гравитацией (квадратики/точки)
  function bits(g, lt, x, y, o = {}) {
    const dur = o.dur || 1; if (lt < 0 || lt > dur) return;
    const n = o.n || 12, r = rnd(o.seed || 29), gr = o.grav == null ? 900 : o.grav;
    g.save(); g.globalAlpha *= 1 - E.in(lt / dur);
    for (let i = 0; i < n; i++) {
      const a = (o.ang == null ? -PI / 2 : o.ang) + (r() - 0.5) * (o.spread || 2.4), v = (o.speed || 600) * (0.5 + r() * 0.7), s = (o.size || 12) * (0.6 + r() * 0.6);
      const px = x + Math.cos(a) * v * lt, py = y + Math.sin(a) * v * lt + 0.5 * gr * lt * lt;
      g.save(); g.translate(px, py); g.rotate(lt * (r() - 0.5) * 12); g.fillStyle = (o.cols || [C.gold, C.white, C.terra])[i % (o.cols || [0, 0, 0]).length]; g.fillRect(-s / 2, -s / 2, s, s); g.restore();
    }
    g.restore();
  }
  // дуги сигнала: расходятся из (x,y) по углу ang в секторе spread
  function waves(g, t, x, y, o = {}) {
    const n = o.n || 3, r0 = o.r0 || 30, r1 = o.r1 || 140, ang = o.ang == null ? -PI / 2 : o.ang, sp = o.spread || 0.9, speedV = o.speed || 0.8, a0 = o.alpha == null ? 1 : o.alpha;
    if (a0 <= 0) return;
    const ga = g.globalAlpha; g.lineCap = 'round'; g.strokeStyle = o.col || C.ink; g.lineWidth = o.lw || 6;
    for (let i = 0; i < n; i++) {
      const f = (((t * speedV + i / n) % 1) + 1) % 1, r = r0 + (r1 - r0) * f;
      g.globalAlpha = ga * a0 * Math.sin(PI * f); g.beginPath(); g.arc(x, y, r, ang - sp / 2, ang + sp / 2); g.stroke();
    }
    g.globalAlpha = ga;
  }
  // провод/шнур с провисом sag; coils>0 — витой шнур; p — доля прорисовки
  function cord(g, x0, y0, x1, y1, o = {}) {
    const sag = o.sag == null ? 80 : o.sag, coils = o.coils || 0, amp = o.amp || 10, n = o.n || (coils ? Math.max(40, coils * 10) : 24), p = o.p == null ? 1 : o.p;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 + sag;
    g.beginPath();
    for (let i = 0; i <= n * p; i++) {
      const u = i / n, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
      let px = a * x0 + b * cx + c * x1, py = a * y0 + b * cy + c * y1;
      if (coils) {
        const tx = 2 * (1 - u) * (cx - x0) + 2 * u * (x1 - cx), ty = 2 * (1 - u) * (cy - y0) + 2 * u * (y1 - cy), L = Math.hypot(tx, ty) || 1, ph = u * coils * TAU;
        px += (-ty / L) * Math.sin(ph) * amp + (tx / L) * Math.cos(ph) * amp * 0.7; py += (tx / L) * Math.sin(ph) * amp + (ty / L) * Math.cos(ph) * amp * 0.7;
      }
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.lineWidth = o.lw || 6; g.strokeStyle = o.col || C.ink; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke();
  }

  // ---------- детали устройств (для любых гаджетов) ----------
  // экран: x,y — левый верх; draw(g,x,y,w,h) рисует содержимое внутри; блик-полоса
  function screen(g, x, y, w, h, o = {}) {
    const r = o.r == null ? 10 : o.r;
    g.beginPath(); rr(g, x, y, w, h, r); g.fillStyle = o.col || C.lcd; g.fill();
    if (o.draw || o.gloss !== false) {
      g.save(); g.clip();
      if (o.draw) o.draw(g, x, y, w, h);
      if (o.gloss !== false) { g.fillStyle = 'rgba(255,255,255,0.10)'; g.beginPath(); g.moveTo(x + w * 0.55, y); g.lineTo(x + w * 0.85, y); g.lineTo(x + w * 0.35, y + h); g.lineTo(x + w * 0.05, y + h); g.closePath(); g.fill(); }
      g.restore();
    }
    if (o.stroke !== null) { g.beginPath(); rr(g, x, y, w, h, r); g.lineWidth = o.lw || 4; g.strokeStyle = o.stroke || C.ink; g.stroke(); }
  }
  // клавиатура cols×rows с центром (x,y); p 0…1 — каскад появления клавиш
  function keypad(g, x, y, cols, rows, kw, kh, gap, o = {}) {
    const n = cols * rows, W0 = cols * kw + (cols - 1) * gap, H0 = rows * kh + (rows - 1) * gap, p = o.p == null ? 1 : o.p;
    for (let j = 0; j < n; j++) {
      const st = (j / n) * 0.55, s = p >= 1 ? 1 : E.back(prog(p, st, st + 0.45)); if (s <= 0.01) continue;
      const kx = x - W0 / 2 + (j % cols) * (kw + gap) + kw / 2, ky = y - H0 / 2 + Math.floor(j / cols) * (kh + gap) + kh / 2;
      g.save(); g.translate(kx, ky); g.scale(s, s);
      box(g, -kw / 2, -kh / 2, kw, kh, { r: o.r == null ? Math.min(kw, kh) * 0.32 : o.r, fill: o.col || C.slate, lw: o.lw || 3, stroke: o.stroke });
      if (o.mark) seg(g, -kw * 0.16, 0, kw * 0.16, 0, { lw: 3, col: o.mark });
      g.restore();
    }
  }
  function grill(g, x, y, w, n = 3, o = {}) { const gap = o.gap || 10; for (let i = 0; i < n; i++) { const yy = y + (i - (n - 1) / 2) * gap; seg(g, x - w / 2, yy, x + w / 2, yy, { lw: o.lw || 4, col: o.col || C.ink }); } }
  function lens(g, x, y, r, o = {}) {
    disc(g, x, y, r, { fill: o.ring || C.slate, lw: o.lw || 4, stroke: o.stroke });
    disc(g, x, y, r * 0.66, { fill: '#1B2233', stroke: null }); disc(g, x, y, r * 0.38, { fill: o.iris || '#3E6CA8', stroke: null });
    disc(g, x - r * 0.22, y - r * 0.22, r * 0.14, { fill: '#FFFFFF', stroke: null });
  }
  // дисковый номеронабиратель: rot — поворот колеса (рад, по часовой)
  function dial(g, x, y, r, rot = 0, o = {}) {
    const ink = o.stroke || C.ink;
    disc(g, x, y, r, { fill: o.plate || C.paper, lw: o.lw || 5, stroke: ink });
    g.beginPath(); g.arc(x, y, r * 0.93, 0, TAU); g.arc(x, y, r * 0.44, 0, TAU, true); g.fillStyle = o.wheel || '#DCD3C4'; g.fill();
    g.font = font(r * 0.17, 800); g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let k = 0; k < 10; k++) {
      const a = ((-30 - 30 * k) * PI) / 180 + rot, hx = x + Math.cos(a) * r * 0.69, hy = y + Math.sin(a) * r * 0.69;
      disc(g, hx, hy, r * 0.15, { fill: o.plate || C.paper, lw: 3, stroke: ink }); g.fillStyle = ink; g.fillText(String((k + 1) % 10), hx, hy + r * 0.01);
    }
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    disc(g, x, y, r * 0.3, { fill: o.cap || C.gold, lw: 4, stroke: ink });
    const fa = (28 * PI) / 180; seg(g, x + Math.cos(fa) * r * 0.8, y + Math.sin(fa) * r * 0.8, x + Math.cos(fa) * r * 1.06, y + Math.sin(fa) * r * 1.06, { lw: 9, col: ink });
  }
  // колокол: (x,y) — верхняя шишка, r — радиус купола; swing — качание (рад), clapper — язычок
  function bell(g, x, y, r, o = {}) {
    const ink = o.stroke || C.ink;
    g.save(); g.translate(x, y); if (o.swing) g.rotate(o.swing);
    if (o.clapper !== false) disc(g, (o.swing ? -o.swing * r * 0.8 : 0), r * 1.42, r * 0.17, { fill: ink, stroke: null });
    disc(g, 0, 0, r * 0.16, { fill: o.fill || C.gold, lw: 4, stroke: ink });
    g.beginPath(); g.moveTo(-r, r * 1.2); g.bezierCurveTo(-r * 0.86, r * 0.32, -r * 0.55, r * 0.12, 0, r * 0.12); g.bezierCurveTo(r * 0.55, r * 0.12, r * 0.86, r * 0.32, r, r * 1.2); g.closePath();
    g.fillStyle = o.fill || C.gold; g.fill(); if (o.shade) shadeIn(g, o.shade, 'r', 0.3, [-r, 0, 2 * r, 1.2 * r]); fs(g, null, { stroke: ink, lw: o.lw || 5 });
    box(g, -r * 1.12, r * 1.12, r * 2.24, r * 0.22, { r: r * 0.1, fill: o.fill || C.gold, lw: o.lw || 5, stroke: ink });
    g.restore();
  }
  // стрелочный индикатор-полукруг: v 0…1 (перелёт пружины допустим)
  function gauge(g, x, y, r, v, o = {}) {
    const ink = o.stroke || C.ink;
    g.beginPath(); g.arc(x, y, r, PI, TAU); g.closePath(); fs(g, o.face || C.paper, { stroke: ink, lw: o.lw || 5 });
    g.beginPath(); g.arc(x, y, r * 0.78, PI, PI + PI * clamp(v)); g.lineWidth = r * 0.12; g.strokeStyle = o.col || C.gold; g.lineCap = 'butt'; g.stroke(); g.lineCap = 'round';
    const n = o.ticks || 8;
    for (let i = 0; i <= n; i++) { const a = PI + (PI * i) / n, big = i % 2 === 0, r0 = r * (big ? 0.6 : 0.68); seg(g, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, { lw: big ? 4 : 3, col: ink }); }
    const a = PI + PI * v; seg(g, x, y, x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82, { lw: 7, col: o.needle || C.red });
    disc(g, x, y, r * 0.1, { fill: ink, stroke: null });
  }
  // вертикальная линейка; mark — y метки-треугольника
  function ruler(g, x, y0, y1, o = {}) {
    const w = o.w || 64, ink = o.stroke || C.ink, st = o.step || 24;
    box(g, x - w / 2, y0, w, y1 - y0, { r: 10, fill: o.fill || C.goldL, lw: 4, stroke: ink });
    for (let i = 0, y = y1 - 14; y > y0 + 10; i++, y -= st) seg(g, x - w / 2 + 6, y, x - w / 2 + (i % 5 === 0 ? w * 0.62 : w * 0.34), y, { lw: 3, col: ink });
    if (o.mark != null) poly(g, [[x + w / 2 + 4, o.mark], [x + w / 2 + 34, o.mark - 18], [x + w / 2 + 34, o.mark + 18]], { fill: o.markCol || C.red, lw: 4, stroke: ink });
  }
  // облачко реплики: x,y — левый верх; tail 'bl' | 'br'
  function bubble(g, x, y, w, h, o = {}) {
    const r = o.r == null ? Math.min(h / 2, 34) : o.r, br = o.tail === 'br';
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    if (br) { g.lineTo(x + w - r - 6, y + h + 34); g.lineTo(x + w - r - 40, y + h); }
    else { g.lineTo(x + r + 46, y + h); g.lineTo(x + r - 2, y + h + 34); g.lineTo(x + r + 12, y + h); }
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    fs(g, o.fill || C.paper, { stroke: o.stroke, lw: o.lw || 5 });
  }
  // плоские иконки ~100×100 при s=1: monitor camera globe chat mail bell clock bolt star heart pin photo
  function icon(g, name, x, y, s = 1, o = {}) {
    const col = o.col || C.gold, ink = o.stroke || C.ink, lw = o.lw || 5;
    const B = (bx, by, w, h, r, f, ex) => box(g, bx, by, w, h, Object.assign({ r, fill: f, lw, stroke: ink }, ex || {}));
    g.save(); g.translate(x, y); g.scale(s, s);
    switch (name) {
      case 'monitor': B(-52, -44, 104, 72, 10, col); B(-41, -34, 82, 52, 5, o.col2 || C.sky, { lw: 3 }); poly(g, [[-10, 28], [10, 28], [16, 44], [-16, 44]], { fill: col, lw: 4, stroke: ink }); seg(g, -30, 46, 30, 46, { lw: 6, col: ink }); break;
      case 'camera': B(-50, -26, 100, 66, 14, col); B(-22, -40, 40, 18, 6, col); lens(g, 0, 7, 25, { stroke: ink }); disc(g, 33, -12, 5, { fill: C.paper, stroke: null }); break;
      case 'globe':
        disc(g, 0, 0, 47, { fill: o.col2 || C.sky, stroke: null });
        g.save(); g.beginPath(); g.arc(0, 0, 47, 0, TAU); g.clip(); g.fillStyle = C.green;
        g.beginPath(); g.ellipse(-16, -15, 22, 13, 0.4, 0, TAU); g.fill(); g.beginPath(); g.ellipse(19, 17, 16, 21, -0.3, 0, TAU); g.fill(); g.restore();
        g.lineWidth = 3; g.strokeStyle = ink; g.beginPath(); g.ellipse(0, 0, 20, 47, 0, 0, TAU); g.stroke();
        seg(g, -47, 0, 47, 0, { lw: 3, col: ink }); seg(g, -40, -24, 40, -24, { lw: 3, col: ink }); seg(g, -40, 24, 40, 24, { lw: 3, col: ink });
        disc(g, 0, 0, 47, { fill: null, lw, stroke: ink }); break;
      case 'chat': bubble(g, -50, -38, 100, 64, { r: 22, fill: col, lw, stroke: ink }); for (let i = -1; i <= 1; i++) disc(g, i * 22, -6, 6, { fill: ink, stroke: null }); break;
      case 'mail': B(-50, -34, 100, 68, 8, col); g.beginPath(); g.moveTo(-46, -30); g.lineTo(0, 6); g.lineTo(46, -30); g.lineWidth = 4; g.strokeStyle = ink; g.stroke(); break;
      case 'bell': bell(g, 0, -46, 38, { fill: col, stroke: ink }); break;
      case 'clock': disc(g, 0, 0, 47, { fill: col, lw, stroke: ink }); disc(g, 0, 0, 36, { fill: C.paper, lw: 3, stroke: ink }); seg(g, 0, 0, 0, -24, { lw: 5, col: ink }); seg(g, 0, 0, 16, 8, { lw: 5, col: ink }); break;
      case 'bolt': poly(g, [[8, -50], [-28, 6], [-2, 6], [-10, 50], [28, -8], [2, -8]], { fill: col, lw, stroke: ink }); break;
      case 'star': { const p = []; for (let i = 0; i < 10; i++) { const a = -PI / 2 + (i * PI) / 5, q = i % 2 ? 22 : 50; p.push([Math.cos(a) * q, Math.sin(a) * q]); } poly(g, p, { fill: col, lw, stroke: ink }); break; }
      case 'heart': g.beginPath(); g.moveTo(0, 40); g.bezierCurveTo(-60, 0, -40, -50, 0, -22); g.bezierCurveTo(40, -50, 60, 0, 0, 40); fs(g, col, { lw, stroke: ink }); break;
      case 'pin': g.beginPath(); g.moveTo(0, 50); g.bezierCurveTo(-30, 10, -40, -6, -40, -18); g.arc(0, -18, 40, PI, 0); g.bezierCurveTo(40, -6, 30, 10, 0, 50); fs(g, col, { lw, stroke: ink }); disc(g, 0, -18, 14, { fill: C.paper, lw: 3, stroke: ink }); break;
      case 'photo':
        B(-58, -46, 116, 92, 6, C.paper); g.save(); g.beginPath(); rr(g, -48, -36, 96, 62, 3); g.clip(); g.fillStyle = o.col2 || C.sky; g.fillRect(-48, -36, 96, 62);
        disc(g, 22, -16, 10, { fill: C.gold, stroke: null }); poly(g, [[-52, 30], [-14, -8], [10, 16], [26, 4], [54, 30]], { fill: C.olive, stroke: null }); g.restore();
        g.beginPath(); rr(g, -48, -36, 96, 62, 3); g.lineWidth = 3; g.strokeStyle = ink; g.stroke(); break;
    }
    g.restore();
  }
  // человечек-пиктограмма без контура (как фигурка в образце). (x,y) — таз; углы в градусах, 0 — вниз, 90 — вперёд.
  // o: col, dir ±1, lean, legB/legF/armB/armF = [угол, сгиб], headset, bun, chair
  function person(g, x, y, s = 1, o = {}) {
    const col = o.col || C.terra, back = mix(col, '#000000', 0.2), d2r = PI / 180, lean = (o.lean || 0) * d2r;
    g.save(); g.translate(x, y); g.scale(s * (o.dir || 1), s); g.lineCap = 'round'; g.lineJoin = 'round';
    if (o.chair) { box(g, -54, 14, 100, 20, { r: 8, fill: C.woodD, stroke: null }); seg(g, -40, 30, -46, 120, { lw: 10, col: C.woodD }); seg(g, 34, 30, 40, 120, { lw: 10, col: C.woodD }); }
    const limb = (x0, y0, v, l1, l2, lw) => { const A = v[0] * d2r, B = (v[0] + v[1]) * d2r, x1 = x0 + Math.sin(A) * l1, y1 = y0 + Math.cos(A) * l1; g.lineWidth = lw; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x1 + Math.sin(B) * l2, y1 + Math.cos(B) * l2); g.stroke(); };
    const sx = Math.sin(lean) * 118, sy = -Math.cos(lean) * 118;
    g.strokeStyle = back; limb(0, -4, o.legB || [-8, 4], 80, 82, 26); limb(sx * 0.95, sy * 0.95 + 14, o.armB || [-14, 10], 60, 58, 20);
    g.strokeStyle = col; limb(0, -4, o.legF || [10, -6], 80, 82, 26);
    g.lineWidth = 58; g.beginPath(); g.moveTo(0, -18); g.lineTo(sx * 0.86, sy * 0.86); g.stroke();
    const hx = sx + Math.sin(lean) * 64, hy = sy - Math.cos(lean) * 64;
    if (o.bun) disc(g, hx - 30, hy - 8, 17, { fill: back, stroke: null });
    disc(g, hx, hy, 35, { fill: col, stroke: null });
    if (o.headset) { ring(g, hx, hy, 42, { a0: PI * 1.05, a1: PI * 1.95, lw: 7, col: C.ink }); disc(g, hx + 2, hy + 4, 11, { fill: C.ink, stroke: null }); seg(g, hx + 6, hy + 10, hx + 34, hy + 30, { lw: 5, col: C.ink }); }
    g.strokeStyle = col; limb(sx * 0.95, sy * 0.95 + 14, o.armF || [14, -10], 60, 58, 20);
    g.restore();
  }

  // ---------- типовые объекты: люди, дома, деревья, транспорт, животные, небо, улица ----------
  // Всё рисуется от точки на земле (x — центр, y — низ), цвет каждой части — параметром.
  const dk = (c, a = 0.2) => mix(c, '#000000', a), lite = (c, a = 0.3) => mix(c, '#FFFFFF', a);
  const SKIN = ['#F1C7A4', '#DFA67D', '#B97A52', '#8A5636'], HAIR = ['#3A2A20', '#6B4226', '#C9873E', '#1E1A18', '#A3542F'];
  const CLOTH = ['#B85C3C', '#E3A94B', '#5D8BBE', '#7FAE6A', '#D9573B', '#8E9B5C', '#2F5888', '#ECC2A2', '#9FB3CF', '#C98A57'];
  const D2R = PI / 180;
  // позы: [legB, legF, armB, armF, lean]; ph — фаза шага/танца (секунды × частота)
  function poseOf(pose, ph, t) {
    const s = Math.sin(ph * TAU), c = Math.cos(ph * TAU), up = Math.max(0, s), dn = Math.max(0, -s);
    switch (pose) {
      case 'walk': return [[-26 * s, -8 - 26 * up], [26 * s, -8 - 26 * dn], [24 * s, 14], [-24 * s, 14], 3];
      case 'run': return [[-48 * s, -20 - 60 * up], [48 * s, -20 - 60 * dn], [44 * s, 80], [-44 * s, 80], 13];
      case 'wave': return [[-5, 0], [5, 0], [-10, 8], [150 + 14 * Math.sin(t * 9), 22], 0];
      case 'cheer': return [[-6, 0], [6, 0], [-158 + 10 * Math.sin(t * 7), -10], [158 + 10 * Math.sin(t * 7 + 1), 10], 0];
      case 'point': return [[-5, 0], [5, 0], [-10, 8], [92, 0], 2];
      case 'hold': return [[-5, 0], [5, 0], [22, 72], [32, 70], 0];
      case 'shout': return [[-6, 0], [6, 0], [-10, 8], [120 + 10 * Math.sin(t * 6), 30], 6];
      case 'dance': return [[-14 - 16 * s, -14], [20 + 22 * s, -26 * up], [-140 + 30 * c, -30], [140 + 30 * s, 30], 9 * s];
      case 'sit': return [[86, -84], [92, -92], [20, 40], [36, 46], 0];
      case 'read': return [[86, -84], [92, -92], [30, 74], [44, 70], 4];
      case 'ride': return [[58 - 26 * s, -64 + 22 * s], [58 + 26 * s, -64 - 22 * s], [62, 18], [68, 14], 14];
      default: return [[-5, 0], [5, 0], [-8, 6], [8, -6], 0];
    }
  }
  // человек: (x,y) — точка между стоп на земле. o: h (рост px, ребёнок ~0.65 взрослого), age 'adult'|'kid'|'old', dir ±1,
  // pose stand|walk|run|wave|cheer|point|hold|shout|dance|sit|read|ride, t, ph (фаза шага, по умолчанию t*1.6),
  // skin hair shirt pants shoes, hs (причёска short|long|bun|bald|scarf), scarf (цвет платка), helmet (цвет каски), cap (цвет кепки),
  // dress (юбка до колен), apron, bag (цвет рюкзака), glasses, mouth 'open', limbs {legB,legF,armB,armF,lean} поверх позы.
  // Возвращает мировые точки {hand, hand2, head, top} — чтобы вложить предмет в руку.
  function human(g, x, y, o = {}) {
    const age = o.age || 'adult', kid = age === 'kid', old = age === 'old', t = o.t || 0;
    const L1 = kid ? 48 : 62, L2 = kid ? 48 : 62, TO = kid ? 70 : old ? 86 : 92, HR = kid ? 34 : 29, A1 = kid ? 38 : 50, A2 = kid ? 36 : 46;
    const LW = kid ? 21 : 24, AW = kid ? 15 : 17, BW = kid ? 46 : 52, T = L1 + L2 + TO + 8 + 2 * HR + 6;
    const Hh = o.h || (kid ? 200 : old ? 285 : 300), k = Hh / T, dir = o.dir || 1, pose = o.pose || 'stand';
    const ps = poseOf(pose, o.ph == null ? t * 1.6 : o.ph, t), lm = o.limbs || {};
    const legB = lm.legB || ps[0], legF = lm.legF || ps[1], armB = lm.armB || ps[2], armF = lm.armF || ps[3];
    const lean = ((lm.lean == null ? ps[4] : lm.lean) + (old ? 9 : 0)) * D2R;
    const skin = o.skin || SKIN[0], hair = o.hair || (old ? '#D8D4CC' : HAIR[0]), shirt = o.shirt || C.terra, pants = o.pants || (kid ? C.deep : C.slate), shoes = o.shoes || C.ink;
    const sit = pose === 'sit' || pose === 'read' || pose === 'ride', hipY = sit ? -L2 - 4 : -(L1 + L2) + (pose === 'run' ? 10 : pose === 'walk' ? 3 : 0);
    const X = (lx) => x + lx * k * dir, Y = (ly) => y + ly * k;
    g.save(); g.translate(x, y); g.scale(k * dir, k); g.lineCap = 'round'; g.lineJoin = 'round';
    const limb = (x0, y0, v, l1, l2, lw, col, end, er) => {
      const A = v[0] * D2R, B = (v[0] + v[1]) * D2R, x1 = x0 + Math.sin(A) * l1, y1 = y0 + Math.cos(A) * l1, x2 = x1 + Math.sin(B) * l2, y2 = y1 + Math.cos(B) * l2;
      g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x2, y2); g.stroke();
      if (end) { g.fillStyle = end; g.beginPath(); g.arc(x2, y2, er, 0, TAU); g.fill(); }
      return [x2, y2];
    };
    const sx = Math.sin(lean) * TO, sy = hipY - Math.cos(lean) * TO, shX = sx * 0.94, shY = sy + 10;
    const hx = sx + Math.sin(lean) * (8 + HR), hy = sy - Math.cos(lean) * (8 + HR);
    if (o.bag) { g.save(); g.translate(sx * 0.5 - BW * 0.62, (hipY + sy) / 2); g.rotate(lean); box(g, -18, -TO * 0.36, 36, TO * 0.66, { r: 10, fill: o.bag, lw: 4 }); g.restore(); }
    limb(0, hipY, legB, L1, L2, LW, dk(pants, 0.22), shoes, LW * 0.55);
    const h2 = limb(shX, shY, armB, A1, A2, AW, dk(shirt, 0.22), skin, AW * 0.62);
    limb(0, hipY, legF, L1, L2, LW, pants, shoes, LW * 0.55);
    g.strokeStyle = shirt; g.lineWidth = BW; g.beginPath(); g.moveTo(0, hipY - 6); g.lineTo(sx * 0.9, sy + BW * 0.3); g.stroke();
    if (o.dress) { const dc = o.dress === true ? shirt : o.dress; g.fillStyle = dc; g.beginPath(); g.moveTo(-BW * 0.5, hipY - 30); g.lineTo(BW * 0.5, hipY - 30); g.lineTo(BW * 0.95, hipY + L1 * 0.85); g.lineTo(-BW * 0.95, hipY + L1 * 0.85); g.closePath(); g.fill(); }
    if (o.apron) { g.save(); g.translate(0, hipY); g.rotate(lean); g.fillStyle = o.apron; g.beginPath(); rr(g, -BW * 0.42, -TO * 0.58, BW * 0.84, TO * 0.58 + L1 * 0.62, 10); g.fill(); g.restore(); }
    disc(g, sx + Math.sin(lean) * 5, sy - Math.cos(lean) * 5, BW * 0.2, { fill: skin, stroke: null });
    // голова и причёска
    const hs = o.hs || (o.scarf ? 'scarf' : old ? 'bun' : 'short');
    if (hs === 'long') { g.fillStyle = hair; g.beginPath(); rr(g, hx - HR * 1.08, hy - HR * 0.2, HR * 1.25, HR * 1.75, HR * 0.4); g.fill(); }
    if (hs === 'bun') disc(g, hx - HR * 0.85, hy - HR * 0.75, HR * 0.42, { fill: hair, stroke: null });
    disc(g, hx, hy, HR, { fill: skin, stroke: null });
    if (hs !== 'bald') {
      g.fillStyle = hs === 'scarf' ? o.scarf || C.red : hair; g.beginPath();
      if (hs === 'scarf') { g.arc(hx, hy, HR * 1.1, PI * 0.92, PI * 2.08); g.lineTo(hx - HR * 1.05, hy + HR * 0.75); g.closePath(); }
      else { g.arc(hx, hy, HR * 1.04, PI * 0.95, PI * 2.02); g.quadraticCurveTo(hx, hy - HR * 0.35, hx - HR * 0.85, hy + HR * 0.2); g.closePath(); }
      g.fill();
    }
    if (o.helmet) { g.fillStyle = o.helmet; g.beginPath(); g.arc(hx, hy - HR * 0.15, HR * 1.12, PI, TAU); g.closePath(); g.fill(); g.fillRect(hx - HR * 1.3, hy - HR * 0.22, HR * 2.6, HR * 0.28); g.fillStyle = dk(o.helmet, 0.15); g.fillRect(hx - HR * 0.12, hy - HR * 1.25, HR * 0.24, HR * 1.05); }
    if (o.cap) { g.fillStyle = o.cap; g.beginPath(); g.arc(hx, hy - HR * 0.1, HR * 1.05, PI, TAU); g.closePath(); g.fill(); g.fillRect(hx, hy - HR * 0.3, HR * 1.5, HR * 0.24); }
    g.fillStyle = C.ink; g.beginPath(); g.arc(hx + HR * 0.48, hy - HR * 0.02, HR * 0.12, 0, TAU); g.fill();
    if (o.glasses) ring(g, hx + HR * 0.48, hy - HR * 0.02, HR * 0.3, { lw: 3, col: C.ink });
    if (o.mouth === 'open' || pose === 'shout') { g.fillStyle = C.rust; g.beginPath(); g.ellipse(hx + HR * 0.52, hy + HR * 0.42, HR * 0.15, HR * 0.2, 0, 0, TAU); g.fill(); }
    else { g.strokeStyle = dk(skin, 0.45); g.lineWidth = 3; g.beginPath(); g.arc(hx + HR * 0.5, hy + HR * 0.28, HR * 0.22, 0.2, 1.4); g.stroke(); }
    const h1 = limb(shX, shY, armF, A1, A2, AW, shirt, skin, AW * 0.62);
    g.restore();
    return { hand: [X(h1[0]), Y(h1[1])], hand2: [X(h2[0]), Y(h2[1])], head: [X(hx), Y(hy)], top: Y(hy - HR * 1.1), k };
  }
  // группа людей, не сливаются: разные одежда, кожа, волосы, рост, шаг; n человек между x0 и x1 на земле y.
  // o: h, pose, t, kids (доля детей 0…1), shirts [цвета], seed, dir, opts(i) — свои параметры i-му
  function crowd(g, x0, x1, y, n, o = {}) {
    const r = rnd(o.seed || 41), sh = o.shirts || CLOTH, out = [];
    const ppl = []; for (let i = 0; i < n; i++) {
      const kid = r() < (o.kids || 0), age = kid ? 'kid' : r() < (o.old || 0) ? 'old' : 'adult', h = (o.h || 280) * (kid ? 0.66 : 0.9 + r() * 0.18);
      const x = n === 1 ? (x0 + x1) / 2 : lerp(x0, x1, i / (n - 1)) + (r() - 0.5) * (x1 - x0) / n * 0.3;
      ppl.push({ x, y: y + (i % 2) * 10, age, h, dir: o.dir || (r() < 0.5 ? -1 : 1), shirt: sh[(i + Math.floor(r() * 3)) % sh.length], pants: [C.slate, C.deep, C.woodD, C.navy][Math.floor(r() * 4)], skin: SKIN[Math.floor(r() * 3)], hair: HAIR[Math.floor(r() * HAIR.length)], hs: r() < 0.45 ? 'long' : 'short', ph: r() });
    }
    ppl.sort((a, b) => a.y - b.y).forEach((p, i) => out.push(human(g, p.x, p.y, Object.assign({ age: p.age, h: p.h, dir: p.dir, shirt: p.shirt, pants: p.pants, skin: p.skin, hair: p.hair, hs: p.hs, pose: o.pose, t: o.t, ph: (o.t || 0) * (o.f || 1.6) + p.ph }, o.opts ? o.opts(i) : {}))));
    return out;
  }

  // ---------- здания: (x,y) — низ по центру ----------
  // окно: lit 0…1 (горит), day — дневное стекло
  function win(g, x, y, w, h, lit, o = {}) {
    box(g, x, y, w, h, { r: 4, fill: lit > 0 ? mix(o.off || C.sky, o.on || C.goldL, lit) : o.off || C.sky, lw: 4 });
    if (o.frame !== false) seg(g, x + w / 2, y + 4, x + w / 2, y + h - 4, { lw: 3, col: C.ink });
  }
  // жилой дом со скатной крышей. o: wall roof door win (цвет стекла) lit (0…1 или массив по окнам) chimney
  function house(g, x, y, w = 260, h = 220, o = {}) {
    const wall = o.wall || C.cream, roof = o.roof || C.terra;
    if (o.chimney !== false) box(g, x + w * 0.2, y - h - h * 0.48, w * 0.12, h * 0.36, { r: 4, fill: dk(roof, 0.15), lw: 4 });
    box(g, x - w / 2, y - h, w, h, { r: 6, fill: wall, shade: dk(wall, 0.1), sw: 0.18, lw: 5 });
    poly(g, [[x - w / 2 - w * 0.1, y - h + 4], [x, y - h - h * 0.62], [x + w / 2 + w * 0.1, y - h + 4]], { r: 8, fill: roof, shade: dk(roof, 0.18), lw: 5 });
    const ww = w * 0.24, wh = h * 0.3, lit = o.lit || 0, L = (i) => (Array.isArray(lit) ? lit[i] || 0 : lit);
    win(g, x - w * 0.38, y - h * 0.78, ww, wh, L(0), { off: o.win, on: o.light }); win(g, x + w * 0.14, y - h * 0.78, ww, wh, L(1), { off: o.win, on: o.light });
    box(g, x - w * 0.11, y - h * 0.42, w * 0.22, h * 0.42, { r: 6, fill: o.door || C.woodD, lw: 4 });
  }
  // многоэтажка cols×rows окон. o: wall roof win (стекло днём) light lit (0…1 доля горящих, гаснут по одному;
  // или функция (i,j)→0…1), grow 0…1 — стройка (видна часть этажей), cw ch — размер окна, gap, door
  function block(g, x, y, cols = 4, rows = 5, o = {}) {
    const cw = o.cw || 58, ch = o.ch || 66, gx = o.gap || 30, gy = o.gapY || 34, w = cols * cw + (cols + 1) * gx, fh = ch + gy;
    const shown = o.grow == null ? rows : Math.max(0, Math.min(rows, o.grow * rows)), full = Math.floor(shown), part = shown - full, h = gy + fh * shown + 30;
    const wall = o.wall || C.paper; if (shown <= 0) return { w, h: 0, top: y };
    box(g, x - w / 2, y - h, w, h, { r: 6, fill: wall, shade: dk(wall, 0.1), sw: 0.14, lw: 5 });
    const n = cols * rows;
    for (let j = 0; j < Math.ceil(shown); j++) for (let i = 0; i < cols; i++) {
      const idx = j * cols + i, wy = y - 30 - fh * (j + 1) + gy * 0.5 + 6;
      let l = 0; if (typeof o.lit === 'function') l = o.lit(i, j); else if (o.lit) { const rank = hash(idx * 7.3 + 1.1); l = clamp((o.lit - rank) * n * 0.6 + 0.5); }
      if (j === full && part < 0.9) continue;
      win(g, x - w / 2 + gx + i * (cw + gx), wy, cw, ch, l, { off: o.win, on: o.light, frame: false });
    }
    if (shown >= rows) box(g, x - w / 2 - 10, y - h - 18, w + 20, 22, { r: 6, fill: o.roof || C.slate, lw: 5 });
    if (o.door !== false) box(g, x - 34, y - 30 - Math.min(fh, 96) + 30, 68, Math.min(fh, 96), { r: 6, fill: o.door || C.woodD, lw: 4 });
    return { w, h, top: y - h };
  }
  // вывеска-доска: lines — строка ('\n' перенос) или массив; o: kind 'chalk'|'wood'|'paper', fill ink size legs frame
  function sign(g, x, y, w, h, lines, o = {}) {
    const kind = o.kind || 'wood', fill = o.fill || (kind === 'chalk' ? '#2E3B36' : kind === 'paper' ? C.paper : C.woodL), ink = o.ink || (kind === 'chalk' ? '#F4F1EA' : C.inkN);
    if (o.legs) { seg(g, x - w * 0.38, y + h / 2, x - w * 0.46, y + h / 2 + o.legs, { lw: 12, col: C.woodD }); seg(g, x + w * 0.38, y + h / 2, x + w * 0.46, y + h / 2 + o.legs, { lw: 12, col: C.woodD }); }
    box(g, x - w / 2, y - h / 2, w, h, { r: 10, fill: o.frame || (kind === 'chalk' ? C.woodD : dk(fill, 0.15)), lw: 5 });
    box(g, x - w / 2 + 12, y - h / 2 + 12, w - 24, h - 24, { r: 6, fill, stroke: null });
    const ls = Array.isArray(lines) ? lines : String(lines || '').split('\n'), n = ls.length; if (!n || !ls[0]) return;
    let sz = o.size || Math.min(h * 0.62 / n, 64); g.save(); for (const l of ls) sz = Math.min(sz, fit(g, l, sz, w - 48, 800));
    g.font = font(sz, 800, o.fam || 'sans'); g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    ls.forEach((l, i) => g.fillText(l, x, y + (i - (n - 1) / 2) * sz * 1.18 + sz * 0.05)); g.restore();
  }
  // магазин или кафе: навес в полоску и вывеска над дверью (текст только из o.sign). o: kind 'shop'|'cafe', wall awning awning2 signFill win lit
  function shop(g, x, y, w = 360, h = 300, o = {}) {
    const wall = o.wall || C.cream, aw = o.awning || C.red, aw2 = o.awning2 || C.paper, cafe = o.kind === 'cafe';
    box(g, x - w / 2, y - h, w, h, { r: 6, fill: wall, shade: dk(wall, 0.1), sw: 0.14, lw: 5 });
    box(g, x - w / 2 - 8, y - h - 14, w + 16, 22, { r: 6, fill: o.roof || C.slate, lw: 5 });
    if (o.sign) sign(g, x, y - h + 46, w * 0.78, 66, o.sign, { fill: o.signFill || C.paper, ink: o.signInk, size: o.signSize });
    const ay = y - h + 92, n = Math.max(4, Math.round(w / 56)), sw = (w + 24) / n;
    g.beginPath(); g.moveTo(x - w / 2 - 12, ay); g.lineTo(x + w / 2 + 12, ay); for (let i = n - 1; i >= 0; i--) g.arc(x - w / 2 - 12 + sw * (i + 0.5), ay + 40, sw / 2, 0, PI); g.closePath(); g.fillStyle = aw2; g.fill();
    g.save(); g.clip(); g.fillStyle = aw; for (let i = 0; i < n; i += 2) g.fillRect(x - w / 2 - 12 + sw * i, ay - 4, sw, 80); g.restore(); fs(g, null, { lw: 5 });
    win(g, x - w * 0.42, y - h * 0.5, w * 0.36, h * 0.3, o.lit || 0, { off: o.win, on: o.light });
    box(g, x + w * 0.08, y - h * 0.52, w * 0.3, h * 0.52, { r: 6, fill: o.door || C.woodD, lw: 4 });
    if (cafe) { const tx = x - w * 0.24; seg(g, tx, y - 70, tx, y, { lw: 7, col: C.ink }); box(g, tx - 50, y - 78, 100, 14, { r: 6, fill: C.woodL, lw: 4 }); box(g, tx - 18, y - 106, 28, 28, { r: 6, fill: C.paper, lw: 4 }); }
  }
  // школа или любое общественное здание (библиотека, ратуша): фронтон, часы, колонны, вывеска o.sign
  function school(g, x, y, w = 560, h = 340, o = {}) {
    const wall = o.wall || C.peach, roof = o.roof || C.rust;
    box(g, x - w / 2, y - h, w, h, { r: 6, fill: wall, shade: dk(wall, 0.1), sw: 0.12, lw: 5 });
    poly(g, [[x - w * 0.24, y - h + 4], [x, y - h - h * 0.34], [x + w * 0.24, y - h + 4]], { r: 6, fill: roof, lw: 5 });
    if (o.clock !== false) { disc(g, x, y - h - h * 0.1, 26, { fill: C.paper, lw: 4 }); seg(g, x, y - h - h * 0.1, x, y - h - h * 0.1 - 16, { lw: 4, col: C.ink }); seg(g, x, y - h - h * 0.1, x + 11, y - h - h * 0.1, { lw: 4, col: C.ink }); }
    if (o.flag) { seg(g, x + w * 0.42, y - h, x + w * 0.42, y - h - 120, { lw: 6, col: C.ink }); poly(g, [[x + w * 0.42, y - h - 120], [x + w * 0.42 + 70, y - h - 100], [x + w * 0.42, y - h - 80]], { fill: o.flag, lw: 4 }); }
    if (o.sign) sign(g, x, y - h + 50, w * 0.6, 62, o.sign, { fill: C.paper, size: o.signSize });
    const cw = w * 0.11, row = (yy) => [-0.4, -0.26, 0.15, 0.29].forEach((f) => win(g, x + w * f, yy, cw, h * 0.2, o.lit || 0, { off: o.win, on: o.light }));
    row(y - h * 0.7); row(y - h * 0.38);
    box(g, x - w * 0.09, y - h * 0.44, w * 0.18, h * 0.44, { r: 6, fill: o.door || C.woodD, lw: 4 });
    box(g, x - w * 0.16, y - 16, w * 0.32, 16, { r: 4, fill: C.steel, lw: 4 });
  }

  // ---------- растения ----------
  // дерево. kind 'leaf' (лиственное) | 'oak' (раскидистый дуб) | 'pine' (ель) | 'round'; o: col (крона) trunk sway (рад) seed
  function tree(g, x, y, s = 1, o = {}) {
    const kind = o.kind || 'leaf', col = o.col || (kind === 'pine' ? C.oliveD : C.green), tr = o.trunk || C.woodD, d = dk(col, 0.16);
    g.save(); g.translate(x, y); g.scale(s, s); if (o.sway) g.rotate(o.sway);
    if (kind === 'pine') {
      box(g, -16, -60, 32, 62, { r: 4, fill: tr, lw: 4 });
      [[-60, 150, 110], [-140, 120, 100], [-212, 88, 90]].forEach(([yy, hw, hh]) => poly(g, [[-hw, yy], [0, yy - hh * 1.3], [hw, yy]], { r: 8, fill: col, shade: d, sw: 0.35, lw: 5 }));
    } else {
      const oak = kind === 'oak', tw = oak ? 52 : 34, th = oak ? 150 : 170;
      poly(g, [[-tw / 2, 0], [-tw * 0.36, -th], [tw * 0.36, -th], [tw / 2, 0]], { r: 4, fill: tr, shade: dk(tr, 0.2), sw: 0.3, lw: 5 });
      if (oak) { seg(g, 0, -th + 20, -70, -th - 30, { lw: 18, col: tr }); seg(g, 0, -th + 30, 76, -th - 20, { lw: 16, col: tr }); }
      const B = oak ? [[-110, -th - 40, 92], [100, -th - 30, 88], [0, -th - 110, 112], [-60, -th - 150, 80], [70, -th - 140, 84]] : kind === 'round' ? [[0, -th - 90, 125]] : [[-62, -th - 40, 74], [62, -th - 40, 74], [0, -th - 110, 96]];
      g.beginPath(); B.forEach(([bx, by, br]) => { g.moveTo(bx + br, by); g.arc(bx, by, br, 0, TAU); }); g.fillStyle = col; g.fill();
      g.save(); g.clip(); g.fillStyle = d; B.forEach(([bx, by, br]) => { g.beginPath(); g.arc(bx + br * 0.35, by + br * 0.3, br * 0.85, 0, TAU); g.fill(); }); g.fillStyle = col; B.forEach(([bx, by, br]) => { g.beginPath(); g.arc(bx - br * 0.12, by - br * 0.12, br * 0.82, 0, TAU); g.fill(); }); g.restore();
      g.strokeStyle = C.ink; g.lineWidth = 5; B.forEach(([bx, by, br]) => { g.beginPath(); g.arc(bx, by, br, 0, TAU); g.stroke(); });
      g.fillStyle = col; B.forEach(([bx, by, br]) => { g.beginPath(); g.arc(bx, by, br - 2.5, 0, TAU); g.fill(); });
      g.fillStyle = d; B.forEach(([bx, by, br]) => { g.beginPath(); g.arc(bx + br * 0.42, by + br * 0.36, br * 0.36, 0, TAU); g.fill(); });
    }
    g.restore();
  }
  // куст
  function bush(g, x, y, s = 1, o = {}) { const col = o.col || C.green; g.beginPath(); [[-50, -30, 44], [0, -50, 54], [52, -28, 42]].forEach(([a, b, r]) => { g.moveTo(x + (a + r) * s, y + b * s); g.arc(x + a * s, y + b * s, r * s, 0, TAU); }); g.fillStyle = col; g.fill(); g.strokeStyle = C.ink; g.lineWidth = 5; g.stroke(); g.fill(); box(g, x - 96 * s, y - 6, 192 * s, 8, { r: 4, fill: dk(col, 0.2), stroke: null }); }
  // трава: пучки по линии y от x0 до x1. o: col h step t (колышется)
  function grass(g, x0, x1, y, o = {}) {
    const col = o.col || C.green, h = o.h || 34, st = o.step || 46, t = o.t || 0; g.fillStyle = col;
    for (let x = x0, i = 0; x < x1; x += st, i++) { const sw = Math.sin(t * 1.8 + i * 0.7) * h * 0.15, hh = h * (0.7 + hash(i) * 0.5); g.beginPath(); g.moveTo(x - 12, y); g.lineTo(x - 8 + sw, y - hh); g.lineTo(x, y - 4); g.lineTo(x + 6 + sw, y - hh * 0.8); g.lineTo(x + 12, y); g.closePath(); g.fill(); }
  }
  // лист: kind 'maple' (кленовый) | 'oval'; (x,y) центр, rot рад
  function leaf(g, x, y, s = 1, o = {}) {
    g.save(); g.translate(x, y); g.rotate(o.rot || 0); g.scale(s, s); g.beginPath();
    if (o.kind === 'oval') { g.ellipse(0, 0, 14, 28, 0, 0, TAU); }
    else { const P2 = [[0, -34], [8, -14], [26, -22], [20, -4], [34, 4], [14, 10], [16, 26], [0, 16], [-16, 26], [-14, 10], [-34, 4], [-20, -4], [-26, -22], [-8, -14]]; g.moveTo(P2[0][0], P2[0][1]); for (const p of P2) g.lineTo(p[0], p[1]); g.closePath(); }
    g.fillStyle = o.col || C.gold; g.fill(); g.lineWidth = 3; g.strokeStyle = C.ink; g.stroke(); seg(g, 0, 30, 0, -8, { lw: 3, col: C.ink }); g.restore();
  }
  // падающие листья в прямоугольнике; o: n cols seed speed s
  function leaves(g, t, x0, x1, y0, y1, o = {}) {
    const n = o.n || 14, r = rnd(o.seed || 31), cols = o.cols || [C.gold, C.red, C.terra, C.goldL];
    for (let i = 0; i < n; i++) { const bx = x0 + r() * (x1 - x0), ph = r(), sp = (o.speed || 120) * (0.6 + r() * 0.6), H0 = y1 - y0, yy = y0 + (((t * sp) / H0 + ph) % 1) * H0; leaf(g, bx + Math.sin(t * 1.6 + i) * 40, yy, (o.s || 1) * (0.7 + r() * 0.5), { col: cols[i % cols.length], rot: t * 1.4 + i }); }
  }

  // ---------- транспорт: (x,y) — земля под центром, dir ±1 — куда едет, t — для колёс ----------
  function wheel(g, x, y, r, rot) { disc(g, x, y, r, { fill: C.ink, stroke: null }); disc(g, x, y, r * 0.5, { fill: C.steel, lw: 3 }); seg(g, x, y, x + Math.cos(rot) * r * 0.48, y + Math.sin(rot) * r * 0.48, { lw: 4, col: C.ink }); }
  function car(g, x, y, s = 1, o = {}) {
    const col = o.col || C.red, dir = o.dir || 1, rot = (o.t || 0) * 9 * dir;
    g.save(); g.translate(x, y); g.scale(s * dir, s);
    poly(g, [[-120, -96], [-62, -96], [-34, -150], [52, -150], [86, -96], [138, -90], [146, -34], [-146, -34], [-146, -86]], { r: 14, fill: col, shade: dk(col, 0.18), side: 'b', sw: 0.3, lw: 5 });
    poly(g, [[-26, -140], [10, -140], [10, -100], [-50, -100]], { r: 4, fill: o.glass || C.sky, lw: 4 }); poly(g, [[22, -140], [46, -140], [70, -100], [22, -100]], { r: 4, fill: o.glass || C.sky, lw: 4 });
    disc(g, 136, -72, 9, { fill: C.goldL, lw: 3 }); g.restore();
    wheel(g, x - 84 * s * dir, y - 30 * s, 30 * s, rot); wheel(g, x + 84 * s * dir, y - 30 * s, 30 * s, rot);
  }
  // автобус. o: col num (текст номера, напр. '3') len (длина, 1 = 520 px) dir t people (силуэты в окнах: true)
  function bus(g, x, y, s = 1, o = {}) {
    const col = o.col || C.blue, dir = o.dir || 1, L = 520 * (o.len || 1), rot = (o.t || 0) * 8 * dir;
    g.save(); g.translate(x, y); g.scale(s * dir, s);
    box(g, -L / 2, -250, L, 210, { r: 26, fill: col, shade: dk(col, 0.18), side: 'b', sw: 0.22, lw: 5 });
    box(g, -L / 2 + 6, -116, L - 12, 14, { r: 6, fill: lite(col, 0.55), stroke: null });
    const nw = Math.max(3, Math.floor((L - 140) / 92)), ww = (L - 150) / nw;
    for (let i = 0; i < nw; i++) { const wx = -L / 2 + 24 + i * ww; box(g, wx, -228, ww - 16, 78, { r: 8, fill: o.glass || C.sky, lw: 4 }); if (o.people) disc(g, wx + ww / 2 - 8, -176, 16, { fill: dk(o.glass || C.sky, 0.3), stroke: null }); }
    box(g, L / 2 - 104, -228, 70, 176, { r: 8, fill: o.glass || C.sky, lw: 4 }); seg(g, L / 2 - 69, -224, L / 2 - 69, -56, { lw: 4, col: C.ink });
    box(g, L / 2 - 24, -246, 18, 176, { r: 6, fill: lite(col, 0.35), lw: 3 });
    disc(g, L / 2 - 6, -66, 10, { fill: C.goldL, lw: 3 });
    if (o.num != null) { g.save(); g.scale(dir, 1); const nx = dir * (L / 2 - 120); box(g, nx - 50, -300, 100, 54, { r: 10, fill: C.goldL, lw: 4 }); g.font = font(36, 900); g.fillStyle = C.inkN; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(o.num), nx, -272); g.restore(); }
    g.restore();
    wheel(g, x - (L / 2 - 110) * s * dir, y - 38 * s, 38 * s, rot); wheel(g, x + (L / 2 - 120) * s * dir, y - 38 * s, 38 * s, rot);
  }
  // велосипед с седоком. o: col (рама) dir t + параметры человека в o.rider {shirt pants skin hair helmet …}
  function bike(g, x, y, s = 1, o = {}) {
    const col = o.col || C.red, dir = o.dir || 1, rot = (o.t || 0) * 10, R = 50;
    const P = (lx, ly) => [x + lx * s * dir, y + ly * s];
    const [bx, by] = P(-80, -R), [fx, fy] = P(80, -R), [sx2, sy2] = P(-24, -120), [hx, hy] = P(56, -140), [cx, cy] = P(0, -R);
    for (const [wx, wy] of [[bx, by], [fx, fy]]) { ring(g, wx, wy, R * s - 5 * s, { lw: 10 * s, col: C.ink }); for (let i = 0; i < 3; i++) { const a = rot + (i * PI) / 3; seg(g, wx - Math.cos(a) * R * s * 0.8, wy - Math.sin(a) * R * s * 0.8, wx + Math.cos(a) * R * s * 0.8, wy + Math.sin(a) * R * s * 0.8, { lw: 3, col: C.slate }); } disc(g, wx, wy, 7 * s, { fill: C.steel, lw: 3 }); }
    const fr = { lw: 9 * s, col }; seg(g, bx, by, cx, cy, fr); seg(g, cx, cy, sx2, sy2, fr); seg(g, bx, by, sx2, sy2, fr); seg(g, sx2, sy2, hx, hy, fr); seg(g, cx, cy, hx, hy, fr); seg(g, hx, hy, fx, fy, fr);
    seg(g, sx2 - 18 * s * dir, sy2 - 6 * s, sx2 + 14 * s * dir, sy2 - 6 * s, { lw: 10 * s, col: C.ink }); seg(g, hx, hy, hx + 14 * s * dir, hy - 26 * s, { lw: 8 * s, col: C.ink });
    if (o.rider !== false) { const r0 = o.rider || {}; return human(g, sx2 - 6 * s * dir, sy2 + 74 * s, Object.assign({ h: 270 * s, dir, pose: 'ride', ph: (o.t || 0) * 1.4 }, r0)); }
  }
  // лодка/катер на воде: (x,y) — ватерлиния по центру. o: col (корпус) stripe cabin (цвет рубки, false — без) motor (подвесной мотор) run 0…1 (бурун) dir t mast flag
  function boat(g, x, y, s = 1, o = {}) {
    const col = o.col || C.blue, dir = o.dir || 1, t = o.t || 0, bob = Math.sin(t * 2.2 + x * 0.01) * 5, run = o.run || 0;
    g.save(); g.translate(x, y + bob); g.scale(s * dir, s); g.rotate(Math.sin(t * 1.7 + x) * 0.025 - run * 0.03);
    if (run > 0) { g.globalAlpha *= run; for (let i = 0; i < 3; i++) { const q = ((t * 1.6 + i / 3) % 1); seg(g, -200 - q * 160, 10 + i * 6, -260 - q * 200, 10 + i * 6, { lw: 6 * (1 - q), col: C.white }); } puffs(g, (t * 1.2) % 0.8, -210, -10, { n: 4, r: 14, dist: 60, ang: PI, spread: 1.2, col: C.white }); g.globalAlpha /= run; }
    if (o.motor !== false && o.motor) { box(g, -230, -64, 44, 70, { r: 10, fill: C.slate, lw: 4 }); seg(g, -208, 6, -208, 40, { lw: 8, col: C.ink }); }
    if (o.mast) { seg(g, 20, -40, 20, -260, { lw: 7, col: C.ink }); if (o.flag) poly(g, [[20, -260], [80, -240], [20, -220]], { fill: o.flag, lw: 4 }); }
    if (o.cabin !== false) { box(g, -90, -130, 130, 92, { r: 10, fill: o.cabin || C.paper, lw: 5 }); box(g, -74, -112, 40, 34, { r: 5, fill: C.sky, lw: 3 }); box(g, -22, -112, 40, 34, { r: 5, fill: C.sky, lw: 3 }); box(g, -100, -146, 150, 20, { r: 6, fill: o.roof || C.red, lw: 4 }); }
    poly(g, [[-200, -50], [210, -54], [160, 28], [-180, 28]], { r: 10, fill: col, shade: dk(col, 0.2), side: 'b', sw: 0.35, lw: 5 });
    seg(g, -180, -26, 180, -28, { lw: 8, col: o.stripe || C.paper });
    g.restore(); return [x, y + bob];
  }

  // ---------- животные ----------
  // собака. o: col (шерсть) pose 'stand'|'run'|'sit'|'sleep' dir t ear (цвет ушей) collar
  function dog(g, x, y, s = 1, o = {}) {
    const col = o.col || C.woodL, d = dk(col, 0.22), dir = o.dir || 1, t = o.t || 0, pose = o.pose || 'stand';
    g.save(); g.translate(x, y); g.scale(s * dir, s); g.lineCap = 'round';
    if (pose === 'sleep') {
      const br = 1 + 0.03 * Math.sin(t * 2.2);
      g.save(); g.scale(1, br); g.beginPath(); g.ellipse(0, -46, 110, 50, 0, 0, TAU); fs(g, col, { lw: 5 }); g.restore();
      g.beginPath(); g.ellipse(-30, -70, 60, 26, 0.05, PI, TAU); g.fillStyle = d; g.fill();
      seg(g, -100, -30, -150, -14, { lw: 18, col }); disc(g, 90, -48, 40, { fill: col, lw: 5 }); g.beginPath(); g.ellipse(124, -40, 26, 18, 0, 0, TAU); fs(g, col, { lw: 4 });
      g.beginPath(); g.ellipse(76, -78, 18, 34, -0.6, 0, TAU); fs(g, o.ear || d, { lw: 4 }); disc(g, 146, -44, 8, { fill: C.ink, stroke: null });
      g.strokeStyle = C.ink; g.lineWidth = 4; g.beginPath(); g.arc(100, -54, 9, 0.2, PI - 0.2); g.stroke();
      for (let i = 0; i < 3; i++) { const q = ((t * 0.6 + i / 3) % 1), zx = 150 + q * 60, zy = -110 - q * 110, zs = 10 + q * 10; g.globalAlpha = 1 - q; seg(g, zx - zs, zy - zs, zx + zs, zy - zs, { lw: 4, col: C.inkN }); seg(g, zx + zs, zy - zs, zx - zs, zy + zs, { lw: 4, col: C.inkN }); seg(g, zx - zs, zy + zs, zx + zs, zy + zs, { lw: 4, col: C.inkN }); g.globalAlpha = 1; }
      g.restore(); return;
    }
    const run = pose === 'run', sit = pose === 'sit', ph = Math.sin(t * (run ? 14 : 3)), wag = Math.sin(t * 12) * 0.5;
    const leg = (lx, a) => { seg(g, lx, -60, lx + Math.sin(a) * 50, -60 + Math.cos(a) * 58, { lw: 16, col: d }); };
    g.save(); g.translate(-90, sit ? -40 : -84); g.rotate(-0.9 + wag); seg(g, 0, 0, -50, -40, { lw: 14, col: d }); g.restore();
    if (sit) { g.beginPath(); g.ellipse(-30, -50, 80, 52, -0.5, 0, TAU); fs(g, col, { lw: 5 }); leg(50, 0); }
    else { leg(-70, run ? ph * 0.7 : 0.1); leg(60, run ? -ph * 0.7 : -0.1); g.beginPath(); g.ellipse(0, -96, 110, 44, 0, 0, TAU); fs(g, col, { lw: 5 }); leg(-46, run ? -ph * 0.7 : -0.1); leg(84, run ? ph * 0.7 : 0.1); }
    const hy = sit ? -150 : -146, hx = sit ? 50 : 104;
    disc(g, hx, hy, 46, { fill: col, lw: 5 }); g.beginPath(); g.ellipse(hx + 40, hy + 14, 32, 22, 0, 0, TAU); fs(g, col, { lw: 4 });
    g.beginPath(); g.ellipse(hx - 16, hy - 6, 18, 38, 0.4, 0, TAU); fs(g, o.ear || d, { lw: 4 });
    disc(g, hx + 72, hy + 8, 9, { fill: C.ink, stroke: null }); disc(g, hx + 18, hy - 10, 6.5, { fill: C.ink, stroke: null });
    if (o.collar) seg(g, hx - 30, hy + 32, hx + 4, hy + 46, { lw: 9, col: o.collar });
    g.restore();
  }
  // кошка. o: col pose 'sit'|'walk'|'sleep' dir t
  function cat(g, x, y, s = 1, o = {}) {
    const col = o.col || C.slate, d = dk(col, 0.22), dir = o.dir || 1, t = o.t || 0, pose = o.pose || 'sit';
    g.save(); g.translate(x, y); g.scale(s * dir, s); g.lineCap = 'round';
    if (pose === 'sleep') { g.beginPath(); g.ellipse(0, -34, 80, 36, 0, 0, TAU); fs(g, col, { lw: 5 }); seg(g, -70, -14, 60, -6, { lw: 12, col: d }); disc(g, 56, -48, 30, { fill: col, lw: 5 }); poly(g, [[40, -70], [46, -96], [62, -74]], { fill: col, lw: 4 }); g.strokeStyle = C.ink; g.lineWidth = 4; g.beginPath(); g.arc(66, -50, 7, 0.2, PI - 0.2); g.stroke(); g.restore(); return; }
    const sw = Math.sin(t * 2.5) * 0.25;
    g.save(); g.translate(-46, -20); g.rotate(sw); g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-60, -10, -70, -90, -30, -120); g.lineWidth = 13; g.strokeStyle = d; g.stroke(); g.restore();
    if (pose === 'walk') { const ph = Math.sin(t * 8); [[-40, ph], [40, -ph]].forEach(([lx, a]) => seg(g, lx, -40, lx + a * 18, 0, { lw: 13, col: d })); g.beginPath(); g.ellipse(0, -60, 70, 30, 0, 0, TAU); fs(g, col, { lw: 5 }); [[-28, -ph], [56, ph]].forEach(([lx, a]) => seg(g, lx, -40, lx + a * 18, 0, { lw: 13, col })); }
    else { g.beginPath(); g.ellipse(0, -56, 50, 60, 0, 0, TAU); fs(g, col, { lw: 5 }); seg(g, 20, -30, 24, -2, { lw: 13, col: d }); }
    const hx = pose === 'walk' ? 72 : 14, hy = pose === 'walk' ? -96 : -130;
    poly(g, [[hx - 32, hy - 14], [hx - 26, hy - 56], [hx - 4, hy - 30]], { fill: col, lw: 4 }); poly(g, [[hx + 6, hy - 30], [hx + 26, hy - 56], [hx + 32, hy - 14]], { fill: col, lw: 4 });
    disc(g, hx, hy, 36, { fill: col, lw: 5 }); disc(g, hx - 12, hy - 4, 5.5, { fill: C.ink, stroke: null }); disc(g, hx + 14, hy - 4, 5.5, { fill: C.ink, stroke: null });
    poly(g, [[hx - 4, hy + 8], [hx + 6, hy + 8], [hx + 1, hy + 14]], { fill: C.rust, stroke: null });
    g.restore();
  }
  // птица: fly — летит (машет крыльями), иначе сидит. o: col (тело) wing (крыло) tip (кончики) beak dir t
  function bird(g, x, y, s = 1, o = {}) {
    const col = o.col || C.white, wing = o.wing || C.steel, dir = o.dir || 1, t = o.t || 0;
    g.save(); g.translate(x, y); g.scale(s * dir, s);
    if (o.fly !== false) {
      const f = Math.sin(t * (o.flap || 9) + x * 0.05), wy = -f * 34;
      g.beginPath(); g.moveTo(-6, -4); g.quadraticCurveTo(-34, wy - 12, -70, wy + 6); g.quadraticCurveTo(-34, wy + 6, -4, 6); fs(g, wing, { lw: 4 });
      g.beginPath(); g.ellipse(0, 0, 34, 13, 0, 0, TAU); fs(g, col, { lw: 4 }); poly(g, [[-30, -4], [-50, -12], [-46, 6]], { fill: col, lw: 3 });
      disc(g, 34, -8, 12, { fill: col, lw: 4 }); poly(g, [[44, -10], [60, -6], [44, -2]], { fill: o.beak || C.gold, lw: 3 }); disc(g, 37, -11, 2.6, { fill: C.ink, stroke: null });
      g.beginPath(); g.moveTo(6, -4); g.quadraticCurveTo(-18, wy - 20, -46, wy - 6); g.quadraticCurveTo(-16, wy - 2, 10, 6); fs(g, wing, { lw: 4 }); seg(g, -46, wy - 6, -36, wy - 9, { lw: 7, col: o.tip || C.ink });
    } else {
      seg(g, -4, 14, -4, 34, { lw: 4, col: o.beak || C.gold }); seg(g, 8, 14, 8, 34, { lw: 4, col: o.beak || C.gold });
      g.beginPath(); g.ellipse(0, 0, 30, 20, -0.2, 0, TAU); fs(g, col, { lw: 4 }); g.beginPath(); g.ellipse(-8, -2, 22, 11, -0.2, 0, TAU); fs(g, wing, { lw: 3 });
      disc(g, 24, -20, 13, { fill: col, lw: 4 }); poly(g, [[34, -22], [50, -18], [34, -14]], { fill: o.beak || C.gold, lw: 3 }); disc(g, 27, -23, 2.6, { fill: C.ink, stroke: null });
    }
    g.restore();
  }
  // стая: n птиц вокруг (x,y) в разбросе w×h, кружат. o: как bird + seed r (радиус круга)
  function flock(g, t, x, y, n = 5, o = {}) {
    const r = rnd(o.seed || 17); for (let i = 0; i < n; i++) { const a = t * (0.5 + r() * 0.4) + r() * TAU, rx = (o.r || 200) * (0.5 + r() * 0.6), ry = rx * 0.32; const dir = -Math.sin(a) >= 0 ? 1 : -1; bird(g, x + Math.cos(a) * rx, y + Math.sin(a) * ry, (o.s || 0.9) * (0.75 + r() * 0.4), Object.assign({}, o, { dir, t: t + i })); }
  }

  // ---------- небо и природа ----------
  // солнце: col (любой цвет: розовое, оранжевое…) rays (число лучей, 0 — без) t
  function sun(g, x, y, r = 90, o = {}) {
    const col = o.col || C.gold, n = o.rays == null ? 10 : o.rays;
    if (n) { g.save(); g.translate(x, y); g.rotate((o.t || 0) * 0.15); for (let i = 0; i < n; i++) { const a = (i / n) * TAU; seg(g, Math.cos(a) * r * 1.22, Math.sin(a) * r * 1.22, Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.5, { lw: 9, col: o.ray || col }); } g.restore(); }
    disc(g, x, y, r, { fill: col, shade: dk(col, 0.1), sw: 0.25, lw: o.lw || 5, stroke: o.stroke });
  }
  // луна-серп (phase 0 — полная, 0.6 — тонкий серп) o: col
  function moon(g, x, y, r = 60, o = {}) {
    const ph = o.phase == null ? 0.45 : o.phase, col = o.col || '#F4EBC8';
    g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip(); g.beginPath(); g.arc(x, y, r, 0, TAU);
    if (ph > 0) { const ix = x + r * (0.25 + ph * 1.2), iy = y - r * 0.3; g.moveTo(ix + r, iy); g.arc(ix, iy, r, 0, TAU); }
    g.fillStyle = col; g.fill('evenodd'); g.restore();
    if (ph <= 0) { disc(g, x - r * 0.3, y - r * 0.2, r * 0.16, { fill: dk(col, 0.1), stroke: null }); disc(g, x + r * 0.25, y + r * 0.3, r * 0.12, { fill: dk(col, 0.1), stroke: null }); }
  }
  // море: полоса воды от y вниз на h, волнистый верх, светлые гребни. o: col col2 (полоса глубже) amp t alpha
  function sea(g, t, y, o = {}) {
    const h = o.h || H - y, col = o.col || C.blue, amp = o.amp || 12, wl = o.wl || 160, ph = (t || 0) * (o.speed || 60);
    g.save(); g.globalAlpha *= o.alpha == null ? 1 : o.alpha; g.beginPath(); g.moveTo(-10, y + h);
    for (let x = -10; x <= W + 20; x += 20) g.lineTo(x, y + Math.sin((x + ph) / wl * TAU) * amp);
    g.lineTo(W + 20, y + h); g.closePath(); g.fillStyle = col; g.fill(); if (o.line !== false) { g.lineWidth = 5; g.strokeStyle = C.ink; g.stroke(); }
    g.fillStyle = o.col2 || dk(col, 0.14); g.fillRect(-10, y + h * 0.5, W + 30, h * 0.5);
    g.strokeStyle = lite(col, 0.5); g.lineWidth = 6; g.lineCap = 'round';
    for (let i = 0; i < 9; i++) { const yy = y + 40 + (i % 3) * h * 0.18 + Math.floor(i / 3) * 18, xx = ((hash(i) * W + ph * (0.6 + (i % 3) * 0.3)) % (W + 200)) - 100; g.beginPath(); g.moveTo(xx, yy); g.quadraticCurveTo(xx + 30, yy - 10, xx + 60, yy); g.stroke(); }
    g.restore();
  }

  // ---------- улица ----------
  // фонарь: (x,y) — низ столба, h — высота, on 0…1, col (столб), light (цвет огня)
  function lamp(g, x, y, h = 360, o = {}) {
    const on = o.on || 0, col = o.col || C.slate, light = o.light || C.goldL;
    if (on > 0) { g.save(); g.globalAlpha *= on * 0.28; disc(g, x, y - h + 20, 110, { fill: light, stroke: null }); g.globalAlpha /= 0.28 * on; g.restore(); }
    box(g, x - 22, y - 26, 44, 26, { r: 6, fill: col, lw: 4 }); seg(g, x, y - 20, x, y - h + 60, { lw: 14, col: C.ink }); seg(g, x, y - 20, x, y - h + 60, { lw: 6, col });
    poly(g, [[x - 32, y - h + 60], [x + 32, y - h + 60], [x + 24, y - h - 10], [x - 24, y - h - 10]], { r: 4, fill: on > 0 ? mix(C.steel, light, on) : C.steel, lw: 5 });
    poly(g, [[x - 40, y - h - 8], [x, y - h - 44], [x + 40, y - h - 8]], { r: 4, fill: col, lw: 5 });
  }
  // гирлянда между точками; on 0…1 — лампочки загораются по очереди слева направо. o: sag n cols t
  function garland(g, x0, y0, x1, y1, o = {}) {
    const n = o.n || 12, sag = o.sag == null ? 80 : o.sag, on = o.on == null ? 1 : o.on, cols = o.cols || [C.goldL, C.red, C.green, C.sky, C.gold];
    const P = (u) => [lerp(x0, x1, u), lerp(y0, y1, u) + sag * 4 * u * (1 - u)];
    g.beginPath(); for (let i = 0; i <= 24; i++) { const [px, py] = P(i / 24); i ? g.lineTo(px, py) : g.moveTo(px, py); } g.lineWidth = 4; g.strokeStyle = C.ink; g.stroke();
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, [px, py] = P(u), q = clamp((on * (n + 2) - i) / 2), c = cols[i % cols.length]; seg(g, px, py, px, py + 10, { lw: 4, col: C.ink }); if (q > 0) { g.save(); g.globalAlpha *= 0.3 * q; disc(g, px, py + 26, 26, { fill: c, stroke: null }); g.restore(); } g.beginPath(); g.ellipse(px, py + 24, 11, 15, 0, 0, TAU); fs(g, q > 0 ? mix(C.slate, c, q) : C.slate, { lw: 3 }); }
  }

  // ---------- текст ----------
  // раскладка: '*слово' — ключевое, '~' — неразрывный пробел, '|' — перенос; ужимает кегль под maxW/maxLines
  function lay(g, text, size, o = {}) {
    const maxW = o.maxW || 940, maxL = o.maxLines || 3, minS = o.min || 40, wt = o.weight || 800, lh = o.lh || 1.1;
    const toks = String(text).replace(/\|/g, ' | ').split(/\s+/).filter(Boolean).map((s) => (s === '|' ? { br: true } : { key: s[0] === '*', s: s.replace(/^\*/, '').replace(/~/g, ' ') }));
    let sz = size, lines;
    for (let it = 0; it < 14; it++) {
      g.font = font(sz, wt, o.fam || 'sans'); const sp = g.measureText(' ').width, kp = sz * 0.16; lines = []; let cur = null, widest = 0;
      for (const tk of toks) {
        if (tk.br) { cur = null; continue; }
        const w = g.measureText(tk.s).width, pad = tk.key ? kp : 0, bw = w + 2 * pad; widest = Math.max(widest, bw);
        if (cur && cur.w + sp + bw <= maxW) { cur.words.push({ s: tk.s, key: tk.key, w, pad, x: cur.w + sp }); cur.w += sp + bw; }
        else { cur = { words: [{ s: tk.s, key: tk.key, w, pad, x: 0 }], w: bw }; lines.push(cur); }
      }
      if ((lines.length <= maxL && widest <= maxW) || sz <= minS) break;
      sz = Math.max(minS, Math.floor(sz * 0.92));
    }
    return { size: sz, lines, lh, w: Math.max(...lines.map((l) => l.w)), h: lines.length * sz * lh, weight: wt };
  }
  // текст по словам: каждое слово выезжает снизу из-под маски (без перелёта), ключевое получает золотую плашку,
  // которая едет слева направо и перекрашивает слово. (x,y) — левый верх блока (или центр/правый край по align).
  // o: size weight col keyCol keyInk align maxW maxLines lh at[] stagger din t1 dout hollow dash plate
  function words(g, t, t0, text, x, y, o = {}) {
    const L = lay(g, text, o.size || 96, o), sz = L.size, lh = L.lh, al = o.align || 'left';
    const col = o.col || C.inkN, keyCol = o.keyCol || C.gold, keyInk = o.keyInk || C.inkN, din = o.din || 0.34, st = o.stagger == null ? 0.11 : o.stagger;
    const bx = al === 'center' ? x - L.w / 2 : al === 'right' ? x - L.w : x, res = { x: bx, y, w: L.w, h: L.h, size: sz, lines: L.lines.length };
    const out = o.t1 == null ? 0 : E.in(prog(t, o.t1 - (o.dout || 0.24), o.t1)); if (out >= 1 || t < (o.at ? o.at[0] : t0)) return res;
    g.save(); g.globalAlpha *= 1 - out; if (out > 0) g.translate(0, -out * sz * 0.35);
    g.font = font(sz, L.weight, o.fam || 'sans'); g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    let wi = 0; const padY = sz * 0.1;
    for (let li = 0; li < L.lines.length; li++) {
      const ln = L.lines[li], lx = al === 'center' ? x - ln.w / 2 : al === 'right' ? x - ln.w : x, top = y + li * sz * lh, base = top + sz * 0.8;
      for (const wd of ln.words) {
        const tw = o.at ? (wi < o.at.length ? o.at[wi] : o.at[o.at.length - 1] + (wi - o.at.length + 1) * st) : t0 + wi * st; wi++;
        const a = prog(t, tw, tw + din); if (a <= 0) continue;
        const dy = (1 - E.out5(a)) * sz * 0.66, bx0 = lx + wd.x, wx = bx0 + wd.pad, bw = wd.w + 2 * wd.pad;
        g.save(); g.beginPath(); g.rect(bx0 - 6, top - padY - 6, bw + 12, sz * 1.1 + padY * 2 + 8); g.clip();
        g.globalAlpha *= clamp(a * 3);
        if (wd.key && o.hollow) {
          g.lineWidth = o.hollowW || Math.max(3, sz * 0.04); g.strokeStyle = o.hollowCol || keyCol; g.setLineDash(o.dash || [sz * 0.13, sz * 0.08]); g.strokeText(wd.s, wx, base + dy); g.setLineDash([]);
        } else {
          g.fillStyle = col; g.fillText(wd.s, wx, base + dy);
          if (wd.key && o.plate !== false) {
            const pk = E.out(prog(t, tw + 0.08, tw + 0.4));
            if (pk > 0) {
              const px = bx0, py = top - padY + sz * 0.06, pw = bw * pk, ph = sz * 0.88 + padY * 2;
              g.beginPath(); rr(g, px, py, pw, ph, sz * 0.12); g.save(); g.clip(); g.fillStyle = keyCol; g.fillRect(px, py, pw, ph); g.fillStyle = keyInk; g.fillText(wd.s, wx, base + dy); g.restore();
              g.lineWidth = Math.max(3, sz * 0.04); g.strokeStyle = o.plateStroke || C.ink; g.stroke();
            }
          }
        }
        g.restore();
      }
    }
    g.restore();
    return res;
  }
  const title = (g, t, t0, text, x, y, o = {}) => words(g, t, t0, text, x, y, Object.assign({ size: 118, weight: 900, lh: 1.02 }, o));
  function fit(g, text, size, maxW, weight = 800) { g.font = font(size, weight); const w = g.measureText(text).width; return w > maxW ? Math.floor((size * maxW) / w) : size; }
  // статичная строка (по центру по вертикали), ужимается под maxW
  function label(g, text, x, y, o = {}) {
    const wt = o.weight || 800, sz = o.maxW ? fit(g, text, o.size || 48, o.maxW, wt) : o.size || 48;
    g.save(); g.font = font(sz, wt, o.fam || 'sans'); g.textAlign = o.align || 'center'; g.textBaseline = 'middle'; g.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    if (o.stroke) { g.lineWidth = o.lw || 4; g.strokeStyle = o.stroke; if (o.dash) g.setLineDash(o.dash); g.strokeText(text, x, y); g.setLineDash([]); }
    if (o.col !== null) { g.fillStyle = o.col || C.inkN; g.fillText(text, x, y); }
    const w = g.measureText(text).width; g.restore(); return { w, size: sz };
  }
  // служебная надпись капсом с разрядкой (как метка в углу образца)
  function hud(g, text, x, y, o = {}) {
    const s = String(text).toUpperCase(), sz = o.size || 26, sp = (o.sp == null ? 0.16 : o.sp) * sz;
    g.save(); g.font = font(sz, o.weight || 700); g.fillStyle = o.col || C.inkN; g.globalAlpha *= o.alpha == null ? 0.75 : o.alpha; g.textBaseline = 'middle'; g.textAlign = 'left';
    let tw = 0; for (const ch of s) tw += g.measureText(ch).width + sp; tw -= sp;
    let cx = o.align === 'right' ? x - tw : o.align === 'center' ? x - tw / 2 : x;
    for (const ch of s) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + sp; }
    g.restore(); return tw;
  }
  // одометр: число v (дробное — колёса крутятся), digits разрядов, suffix после цифр; строка выводится как есть
  function counter(g, x, y, v, o = {}) {
    const sz = o.size || 72, n = o.digits || 4, wt = o.weight || 800;
    g.save(); g.font = font(sz, wt); g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillStyle = o.col || C.inkN;
    let dw = 0; for (let d = 0; d < 10; d++) dw = Math.max(dw, g.measureText(String(d)).width); dw *= 1.02;
    let cx = x;
    if (typeof v === 'string') { for (const ch of v) { const cw = /[0-9?]/.test(ch) ? dw : g.measureText(ch).width; g.fillText(ch, cx + cw / 2, y); cx += cw; } }
    else {
      g.save(); g.beginPath(); g.rect(x - 4, y - sz * 0.5, dw * n + 8, sz); g.clip();
      for (let i = n - 1; i >= 0; i--) {
        const base = Math.pow(10, i), q = v / base, d = ((Math.floor(q) % 10) + 10) % 10;
        const r = E.inOut(((i === 0 ? q - Math.floor(q) : clamp((v % base) - (base - 1))) - 0.5) / 0.5); // колесо щёлкает быстро и стоит
        const blank = o.lead === false && i > 0 && Math.floor(q) === 0; // ведущий ноль не рисуем
        if (!blank) g.fillText(String(d), cx + dw / 2, y - r * sz); if (r > 0.001) g.fillText(String((d + 1) % 10), cx + dw / 2, y + (1 - r) * sz);
        cx += dw;
      }
      g.restore();
    }
    if (o.suffix) { g.textAlign = 'left'; g.font = font(o.sufSize || sz, wt); g.fillText(o.suffix, cx + (o.gap || 0), y); cx += (o.gap || 0) + g.measureText(o.suffix).width; }
    g.restore(); return cx - x;
  }
  // круглый штамп-значок с кольцом точек: прыгает пружиной и поворачивается; text — строки через '\n'
  function stamp(g, t, t0, x, y, text, o = {}) {
    const lt = t - t0; if (lt <= 0) return; const out = o.t1 == null ? 0 : E.in(prog(t, o.t1 - 0.2, o.t1)); if (out >= 1) return;
    const r = o.r || 110, ink = o.stroke || C.ink, s = spring(lt, 2.6, 0.4) * (1 - out), rot = lerp(-0.6, o.rot == null ? -0.12 : o.rot, spring(lt, 2, 0.5));
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
    disc(g, 0, 0, r, { fill: o.fill || C.gold, lw: 5, stroke: ink });
    g.fillStyle = o.dots || ink; const n = o.n || 24;
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU + t * 0.4; g.beginPath(); g.arc(Math.cos(a) * r * 1.17, Math.sin(a) * r * 1.17, r * 0.045, 0, TAU); g.fill(); }
    ring(g, 0, 0, r * 0.84, { lw: 3, col: ink, dash: [8, 7] });
    const ls = String(text).split('\n'); let sz = o.size || r * 0.46; g.font = font(sz, 900); for (const l of ls) sz = Math.min(sz, fit(g, l, sz, r * 1.4, 900));
    g.font = font(sz, 900); g.fillStyle = o.ink || ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    ls.forEach((l, i) => g.fillText(l, 0, (i - (ls.length - 1) / 2) * sz * 1.05 + sz * 0.04));
    g.restore();
  }
  // бирка-таблетка с выноской к точке to:[x,y]; (x,y) — левый край по центру высоты (center/right — иначе)
  function tag(g, t, t0, x, y, text, o = {}) {
    const lt = t - t0; if (lt <= 0) return null; const out = o.t1 == null ? 0 : E.in(prog(t, o.t1 - 0.18, o.t1)); if (out >= 1) return null;
    const sz = o.size || 46, ink = o.stroke || C.ink; g.save(); g.font = font(sz, o.weight || 800);
    const tw = g.measureText(text).width, pad = sz * 0.5, h = sz * 1.5, w = tw + pad * 2, ax = o.center ? x - w / 2 : o.align === 'right' ? x - w : x;
    g.globalAlpha *= 1 - out;
    if (o.to) {
      const [tx, ty] = o.to, lp = E.out(prog(lt, 0.05, 0.4)); let sx, sy;
      if (Math.abs(ty - y) > h * 0.9) { sx = clamp(tx, ax + h / 2, ax + w - h / 2); sy = ty > y ? y + h / 2 : y - h / 2; } else { sx = tx < ax ? ax : ax + w; sy = y; }
      seg(g, sx, sy, lerp(sx, tx, lp), lerp(sy, ty, lp), { lw: 4, col: o.lineCol || ink });
      if (lp > 0.85) disc(g, tx, ty, 10 * E.back(prog(lp, 0.85, 1)), { fill: o.dot || C.gold, lw: 4, stroke: ink });
    }
    const s = spring(lt, 3, 0.5);
    g.translate(ax + w / 2, y); g.scale(s, s);
    box(g, -w / 2, -h / 2, w, h, { r: h / 2, fill: o.fill || C.paper, lw: 4, stroke: ink });
    g.fillStyle = o.ink || C.inkN; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 0, sz * 0.04);
    g.restore(); return { x: ax, y: y - h / 2, w, h };
  }
  // шкала прогресса по эпохам: узлы в моменты at[], бегунок едет пружиной, на прибытии — волна
  function timeline(g, t, o = {}) {
    const at = o.at, n = at.length, x0 = o.x0 || 110, x1 = o.x1 || 970, y = o.y || 1612, col = o.col || C.inkN, fill = o.fill || C.gold, stp = (x1 - x0) / (n - 1);
    let c = 0, last = 0; for (let i = 1; i < n; i++) { c += spring(t - at[i], 1.5, 0.62); if (t >= at[i]) last = i; }
    c = clamp(c, 0, n - 1); const mx = x0 + stp * c;
    seg(g, x0, y, x1, y, { lw: 4, col: rgba(col, 0.32) }); seg(g, x0, y, mx, y, { lw: 6, col: fill });
    for (let i = 0; i < n; i++) { const nx = x0 + stp * i; if (i <= c + 0.02) disc(g, nx, y, 9, { fill, lw: 3, stroke: o.stroke || C.ink }); else disc(g, nx, y, 8, { fill: null, lw: 3, stroke: rgba(col, 0.5) }); }
    if (o.labels) { g.save(); g.font = font(24, 700); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; o.labels.forEach((l, i) => { if (!l) return; g.globalAlpha = i === last ? 0.9 : 0.45; g.fillText(l, x0 + stp * i, y + 36); }); g.restore(); }
    pulse(g, t - at[last], mx, y, { r0: 16, r1: 54, col: fill, lw: 6, dur: 0.7 });
    disc(g, mx, y, 17, { fill, lw: 4, stroke: o.stroke || C.ink });
    if (o.mark) o.mark(g, mx, y);
  }

  // ---------- переходы ----------
  // эволюция предмета: старый сплющивается в щель (dur), новый раскрывается пружиной с перелётом.
  // drawA/drawB рисуют предмет вокруг (0,0); mode 'flip' (по ширине) | 'pop' (масштаб). Возвращает фазу 0…1 нового.
  function morph(g, lt, x, y, drawA, drawB, o = {}) {
    const dur = o.dur || 0.16, s0 = o.s || 1;
    g.save(); g.translate(x, y); g.scale(s0, s0);
    if (lt < 0 || !drawB) { if (drawA) drawA(g); g.restore(); return 0; }
    if (lt < dur) {
      const p = E.in(lt / dur);
      if (o.mode === 'pop') { const s = 1 - p * 0.8; g.scale(s, s); } else g.scale(1 - p * 0.94, 1 + 0.16 * p);
      if (drawA) drawA(g); g.restore(); return 0;
    }
    const q = spring(lt - dur, o.f || 2.3, o.z || 0.42);
    if (o.mode === 'pop') { const s = 0.2 + 0.8 * q; g.scale(s, s); } else g.scale(0.06 + 0.94 * q, 1 + 0.16 * (1 - q));
    drawB(g); g.restore(); return q;
  }
  // плоская шторка из полос (cols) по диагонали; p 0…1, закрывает кадр к p=0.5
  function wipe(g, p, o = {}) {
    if (p <= 0 || p >= 1) return; const cols = o.cols || [C.gold, C.navy], sk = 360;
    cols.forEach((c, i) => {
      const a = E.inOut(clamp(p * 1.2 - i * 0.1)), xa = lerp(-sk, W + sk, Math.min(1, a * 2)), xb = lerp(-sk, W + sk, Math.max(0, a * 2 - 1));
      if (xa <= xb) return; g.fillStyle = c; g.beginPath(); g.moveTo(xb, 0); g.lineTo(xa + sk, 0); g.lineTo(xa, H); g.lineTo(xb - sk, H); g.closePath(); g.fill();
    });
  }

  return {
    W, H, SAFE, C, SKY, F, font, clamp, lerp, prog, E, spring, pop, env, wob, kick, seq, hash, rnd, rgb, mix, rgba, lum,
    track, steps, cuts, begin, cam, settle, shake,
    sky, skyCols, tone, ground, hills, cloud, clouds, poles, stars, planet, speed, whoosh, motes,
    rr, rpoly, shadeIn, fs, box, disc, ring, seg, poly, curve,
    flame, rocket, dotRing, burst, pulse, sparkle, puffs, bits, waves, cord,
    screen, keypad, grill, lens, dial, bell, gauge, ruler, bubble, icon, person,
    human, crowd, win, house, block, sign, shop, school, tree, bush, grass, leaf, leaves, wheel, car, bus, bike, boat, dog, cat, bird, flock, sun, moon, sea, lamp, garland,
    lay, words, title, fit, label, hud, counter, stamp, tag, timeline, morph, wipe,
  };
})();
