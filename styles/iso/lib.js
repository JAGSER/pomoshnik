// «Изометрия»: библиотека стиля для роликов draw(t, k) на Canvas 2D 1080×1920 (приложение «Помощник AI»).
// Тёмно-синий фон, изометрические сцены из призм, тонкие голубые линии с полыми узлами, белые утверждения
// с цветным ключевым словом, красный акцент «проблемы», зелёный «готово». Одна глобальная константа ISO.
// Web Worker: только OffscreenCanvas, без document и сети. Кадр считается только из t; кэшируются лишь текстуры.
// Мир: x уходит вправо-вниз, y влево-вниз, z вверх; 1 единица мира = 1 px при масштабе вида 1.
const ISO = (() => {
  const W = 1080, H = 1920, PI = Math.PI, PI2 = PI * 2, DEG = PI / 180, C30 = Math.cos(PI / 6), S30 = .5;
  const P = {
    bg: '#171928', night: '#0D1020', deep: '#0B1226', panel: '#1C1F33', panel2: '#252A42', edge: '#34406A', grid: '#242A45',
    line: '#39607A', cyanD: '#2A7D99', cyan: '#22C3EE', ice: '#A6ECFB', red: '#F0262B', redD: '#B5192E', redBg: '#26101C',
    orange: '#F0704A', amber: '#F6B65A', green: '#2FD08C', greenD: '#1E8F66', white: '#F2F4FA', grey: '#8E909D',
    greyD: '#5D6178', mute: '#3A4062', steel: '#A3A6B1', lav: '#565876', kraft: '#C9874F', tape: '#E9C894', ink: '#0F1322'
  };
  const F = { sans: '"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif',
    serif: '"DejaVu Serif",Georgia,"Noto Serif","Times New Roman",serif',
    mono: '"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace' };
  let K = null, T = 0, TX = null;
  const V = { ox: 540, oy: 960, s: 1 };
  const RC = {};

  // ---------- время, изинги, пружины ----------
  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const pr = (t, a, b) => b === a ? (t >= a ? 1 : 0) : cl((t - a) / (b - a));
  const lerp = (a, b, p) => a + (b - a) * p;
  const eo = p => 1 - Math.pow(1 - cl(p), 3);
  const ei = p => Math.pow(cl(p), 3);
  const eio = p => { p = cl(p); return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  const eb = p => { p = cl(p); const c = 1.4; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
  const spring = (t, f = 1.6, z = 7) => t <= 0 ? 0 : 1 - Math.exp(-z * t) * Math.cos(PI2 * f * t); // t: секунды от старта
  const hash = n => { const s = Math.sin(n * 91.3458 + 47.853) * 43758.5453; return s - Math.floor(s); };
  const rnd = seed => { let s = (seed >>> 0) || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
  function kf(A, t, e) { // ключевые кадры [[t, v], …]: короткие отрезки (<0,7 с): плавно, длинные: равномерно
    if (t <= A[0][0]) return A[0][1];
    for (let i = 0; i < A.length - 1; i++) { const [t0, v0] = A[i], [t1, v1] = A[i + 1];
      if (t < t1) return lerp(v0, v1, (e || (t1 - t0 < .7 ? eio : (x => x)))(pr(t, t0, t1))); }
    return A[A.length - 1][1];
  }
  const step = (A, t) => { let v = A[0][1]; for (const a of A) if (t >= a[0]) v = a.length > 2 ? a.slice(1) : a[1]; return v; };
  const num = (v, d = 0) => { const s = Math.abs(v).toFixed(d).split('.'); s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' '); return (v < 0 ? '-' : '') + s.join(','); };
  const typed = (s, lt, t0, cps = 24) => String(s).slice(0, Math.max(0, Math.floor((lt - t0) * cps)));
  const stag = (lt, t0, i, gap = .06, d = .3) => pr(lt, t0 + i * gap, t0 + i * gap + d);
  function fall(lt, t0, h = 360, dur = .34) { // высота падающего предмета: z от h до 0 и затухающий отскок
    if (lt <= t0) return h; const p = (lt - t0) / dur; if (p < 1) return h * (1 - p * p);
    const q = lt - t0 - dur; return h * .06 * Math.abs(Math.sin(q * 12)) * Math.exp(-q * 7);
  }

  // ---------- цвет ----------
  const SH = new Map();
  function shade(c, k) { // k > 0: к белому, k < 0: к чёрному
    const key = c + k; let v = SH.get(key); if (v) return v;
    const n = parseInt(c.slice(1), 16); let r = n >> 16, gg = n >> 8 & 255, b = n & 255;
    if (k >= 0) { r += (255 - r) * k; gg += (255 - gg) * k; b += (255 - b) * k; } else { r *= 1 + k; gg *= 1 + k; b *= 1 + k; }
    v = '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(gg) << 8) | Math.round(b)).toString(16).slice(1); SH.set(key, v); return v;
  }
  const rgba = (c, a) => { const n = parseInt(c.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + cl(a) + ')'; };
  const mix = (a, b, p) => { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), f = (s) => Math.round(lerp(x >> s & 255, y >> s & 255, cl(p)));
    return '#' + ((1 << 24) | (f(16) << 16) | (f(8) << 8) | f(0)).toString(16).slice(1); };

  // ---------- текстуры (один раз, OffscreenCanvas) ----------
  function mk(w, h) { const c = new OffscreenCanvas(w, h); return [c, c.getContext('2d')]; }
  function tex() {
    if (TX) return TX;
    const r = rnd(20261026), stars = [];
    for (let i = 0; i < 90; i++) stars.push({ x: r() * (W + 40), y: r() * (H + 40), r: r() < .8 ? 2 : 3, a: .16 + r() * .42, f: .5 + r() * 1.6, ph: r() * PI2, v: 2 + r() * 7 });
    const [vc, vg] = mk(W, H), gr = vg.createRadialGradient(540, 920, 240, 540, 960, 1280);
    gr.addColorStop(0, 'rgba(3,4,10,0)'); gr.addColorStop(.62, 'rgba(3,4,10,.1)'); gr.addColorStop(1, 'rgba(3,4,10,.55)');
    vg.fillStyle = gr; vg.fillRect(0, 0, W, H);
    return TX = { stars, vig: vc, bgs: {} };
  }
  function bgSprite(tone) {
    if (TX.bgs[tone]) return TX.bgs[tone];
    const base = tone === 'night' ? P.night : tone === 'deep' ? P.deep : tone === 'red' ? '#1E1120' : P.bg, [c, x] = mk(W, H);
    x.fillStyle = base; x.fillRect(0, 0, W, H);
    const gr = x.createRadialGradient(540, 700, 40, 540, 880, 1320);
    gr.addColorStop(0, rgba(shade(base, .075), .95)); gr.addColorStop(.5, rgba(base, 0)); gr.addColorStop(1, rgba(shade(base, -.55), .75));
    x.fillStyle = gr; x.fillRect(0, 0, W, H); return TX.bgs[tone] = c;
  }
  const GL = {};
  function glowSprite(col) {
    if (GL[col]) return GL[col]; const [c, x] = mk(96, 96), gr = x.createRadialGradient(48, 48, 0, 48, 48, 48);
    gr.addColorStop(0, rgba(col, 1)); gr.addColorStop(.18, rgba(col, .55)); gr.addColorStop(.5, rgba(col, .15)); gr.addColorStop(1, rgba(col, 0));
    x.fillStyle = gr; x.fillRect(0, 0, 96, 96); return GL[col] = c;
  }
  function glow(g, x, y, r, col = P.cyan, a = .7, ry) { // мягкое свечение спрайтом (без shadowBlur), режим lighter
    if (a <= 0 || r <= 0) return; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha *= cl(a);
    g.drawImage(glowSprite(col), x - r, y - (ry ?? r), r * 2, (ry ?? r) * 2); g.restore();
  }

  // ---------- кадр, склейки, камера ----------
  function begin(t, k) { // первым делом в draw: запоминает t/k, сбрасывает контекст и вид
    K = k; T = t; tex(); const g = k.g;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.shadowBlur = 0;
    g.shadowColor = 'rgba(0,0,0,0)'; g.setLineDash([]); g.lineJoin = 'round'; g.lineCap = 'round'; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    V.ox = 540; V.oy = 960; V.s = 1; return g;
  }
  function cuts(t, list) { // сцена по списку склеек (глобальные секунды) → {i, t0, t1, lt, d, p, left}
    list = list || K.subs.map(s => s.t0); let i = 0;
    for (let j = 0; j < list.length; j++) if (t >= list[j]) i = j;
    const t0 = list[i], t1 = i + 1 < list.length ? list[i + 1] : K.duration;
    return { i, t0, t1, lt: t - t0, d: t1 - t0, p: pr(t, t0, t1), left: t1 - t };
  }
  function cam(g, lt, o, fn) { // камера: после склейки наезд kick оседает пружиной; z: зум, x/y: сдвиг, cx/cy: центр
    o = o || {}; const kick = o.kick ?? .07, z = (o.z ?? 1) * (1 + kick * (1 - spring(lt, 1.1, 5.5)));
    const cx = o.cx ?? W / 2, cy = o.cy ?? H * .5;
    g.save(); g.translate(cx + (o.x || 0), cy + (o.y || 0)); g.scale(z, z); if (o.rot) g.rotate(o.rot * DEG); g.translate(-cx, -cy);
    fn(g); g.restore();
  }
  function shake(g, lt, t0, dur = .35, amp = 10) { const k = lt > t0 ? 1 - pr(lt, t0, t0 + dur) : 0; if (k > 0) g.translate(Math.sin(lt * 83) * amp * k, Math.cos(lt * 67) * amp * .6 * k); }

  // ---------- фон и общий слой ----------
  function bg(g, o = {}) { // фон: тон main|night|deep|red, лёгкий свет сверху, пыль-звёзды с параллаксом px/py и мерцанием
    const tone = o.tone || 'main';
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.drawImage(bgSprite(tone), 0, 0);
    const a0 = o.stars ?? (tone === 'night' ? 1.6 : 1), px = (o.px || 0) * .3, py = (o.py || 0) * .3, WW = W + 40, HH = H + 40;
    if (a0 > 0) {
      g.fillStyle = tone === 'night' ? '#D2DCF5' : '#8394BA';
      for (const s of TX.stars) {
        const x = ((s.x + px) % WW + WW) % WW - 20, y = ((s.y + py - T * s.v) % HH + HH) % HH - 20;
        g.globalAlpha = cl(a0 * s.a * (.55 + .45 * Math.sin(T * s.f + s.ph))); g.fillRect(x, y, s.r, s.r);
      }
    }
    g.restore();
  }
  function finish(g, a = 1) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a; g.globalCompositeOperation = 'source-over'; g.drawImage(TX.vig, 0, 0); g.restore(); }
  function dim(g, a, col = P.bg) { if (a <= 0) return; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = cl(a); g.fillStyle = col; g.fillRect(0, 0, W, H); g.restore(); }
  function scrim(g, y0, y1, a = .85, col = P.bg) { // затемнение-подложка под текстом: плотно до y0, тает к y1
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); const gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = rgba(col, a); g.fillRect(0, 0, W, y0); g.fillStyle = gr; g.fillRect(0, y0, W, y1 - y0); g.restore();
  }
  function stripes(g, o = {}) { // тёмно-красные вертикальные полосы на весь кадр: фон «проблемы»
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = o.a ?? 1; g.fillStyle = o.col || P.redBg;
    for (let x = o.x0 ?? 330; x < W; x += o.gap || 380) g.fillRect(x, 0, o.w || 170, H); g.restore();
  }
  function scanline(g, lt, o = {}) { // переход-сканер: голубая линия проходит кадр сверху вниз
    const t0 = o.t0 || 0, p = pr(lt, t0, t0 + (o.dur || .4)); if (p <= 0 || p >= 1) return; const y = lerp(-40, H + 40, eo(p)), col = o.col || P.cyan;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); glow(g, W / 2, y, W * .75, col, .3 * (1 - p), 46); g.fillStyle = rgba(col, .75 * (1 - p)); g.fillRect(0, y - 1.5, W, 3); g.restore();
  }

  // ---------- изометрия ----------
  function view(ox, oy, s = 1) { V.ox = ox; V.oy = oy; V.s = s; return V; }
  const sx = (x, y) => V.ox + (x - y) * C30 * V.s, sy = (x, y, z) => V.oy + ((x + y) * S30 - z) * V.s;
  const pt = (x, y, z = 0) => [sx(x, y), sy(x, y, z)];
  const floorPts = (A, z = 0) => A.map(a => pt(a[0], a[1], a[2] ?? z));
  function qTop(g, x, y, z, w, d) { g.moveTo(sx(x, y), sy(x, y, z)); g.lineTo(sx(x + w, y), sy(x + w, y, z)); g.lineTo(sx(x + w, y + d), sy(x + w, y + d, z)); g.lineTo(sx(x, y + d), sy(x, y + d, z)); g.closePath(); }
  function qL(g, x, y, z, w, h) { g.moveTo(sx(x, y), sy(x, y, z)); g.lineTo(sx(x + w, y), sy(x + w, y, z)); g.lineTo(sx(x + w, y), sy(x + w, y, z + h)); g.lineTo(sx(x, y), sy(x, y, z + h)); g.closePath(); }
  function qR(g, x, y, z, d, h) { g.moveTo(sx(x, y), sy(x, y, z)); g.lineTo(sx(x, y + d), sy(x, y + d, z)); g.lineTo(sx(x, y + d), sy(x, y + d, z + h)); g.lineTo(sx(x, y), sy(x, y, z + h)); g.closePath(); }
  function block(g, x, y, z, w, d, h, o = {}) { // призма: (x,y,z): дальний нижний угол; грани: верх светлее, левая (+y): col, правая (+x): темнее
    const c = o.col || P.steel;
    if (h > 0) { g.beginPath(); qL(g, x, y + d, z, w, h); g.fillStyle = o.left || c; g.fill(); g.beginPath(); qR(g, x + w, y, z, d, h); g.fillStyle = o.right || shade(c, -.3); g.fill(); }
    g.beginPath(); qTop(g, x, y, z + h, w, d); g.fillStyle = o.top || shade(c, .24); g.fill();
    if (o.edge) {
      g.beginPath(); g.moveTo(sx(x, y + d), sy(x, y + d, z + h)); g.lineTo(sx(x + w, y + d), sy(x + w, y + d, z + h)); g.lineTo(sx(x + w, y), sy(x + w, y, z + h));
      if (h > 0) { g.moveTo(sx(x + w, y + d), sy(x + w, y + d, z + h)); g.lineTo(sx(x + w, y + d), sy(x + w, y + d, z)); }
      g.strokeStyle = o.edge; g.lineWidth = (o.lw || 2) * V.s; g.stroke();
    }
  }
  function tile(g, x, y, z, w, d, o = {}) { // плоский прямоугольник на полу (заливка/контур)
    g.beginPath(); qTop(g, x, y, z, w, d);
    if (o.fill) { g.fillStyle = o.fill; g.fill(); } if (o.stroke) { g.strokeStyle = o.stroke; g.lineWidth = (o.lw || 2) * V.s; g.stroke(); }
  }
  function grid(g, x, y, z, w, d, st = 60, col = P.grid, lw = 1.5) { // сетка на полу
    g.beginPath();
    for (let u = st; u < w - 1; u += st) { g.moveTo(sx(x + u, y), sy(x + u, y, z)); g.lineTo(sx(x + u, y + d), sy(x + u, y + d, z)); }
    for (let v = st; v < d - 1; v += st) { g.moveTo(sx(x, y + v), sy(x, y + v, z)); g.lineTo(sx(x + w, y + v), sy(x + w, y + v, z)); }
    g.strokeStyle = col; g.lineWidth = lw * V.s; g.stroke();
  }
  function slab(g, x, y, z, w, d, h, o = {}) { // платформа образца: тёмная плита, голубой контур верха, сетка; o.p: контур прорисовывается
    block(g, x, y, z, w, d, h, { top: o.top || P.panel, left: o.left || '#141626', right: o.right || '#0F111D' });
    if (o.grid) grid(g, x, y, z + h, w, d, o.grid, o.gridCol || P.grid);
    const q = floorPts([[x, y], [x + w, y], [x + w, y + d], [x, y + d], [x, y]], z + h);
    trace(g, q, o.p ?? 1, o.edge || P.line, (o.lw || 2.5) * V.s);
  }
  function isoEll(g, x, y, z, r) { const c = pt(x, y, z); g.moveTo(c[0] + r * 1.2247 * V.s, c[1]); g.ellipse(c[0], c[1], r * 1.2247 * V.s, r * .7071 * V.s, 0, 0, PI2); }
  function ring(g, x, y, z, r, o = {}) { // окружность на полу (эллипс)
    g.beginPath(); isoEll(g, x, y, z, r); if (o.fill) { g.fillStyle = o.fill; g.fill(); }
    if (o.col !== null) { g.strokeStyle = o.col || P.cyan; g.lineWidth = (o.lw || 2.5) * V.s; g.stroke(); }
  }
  function pad(g, x, y, z, r, lt, o = {}) { // голографическая площадка: кольца и волна-пинг наружу
    const col = o.col || P.cyan, a = o.a ?? 1; if (a <= 0) return; g.save(); g.globalAlpha *= a;
    ring(g, x, y, z, r, { fill: rgba(col, .07), col: rgba(col, .85), lw: 3 }); ring(g, x, y, z, r * .74, { col: rgba(col, .45), lw: 2 }); ring(g, x, y, z, r * 1.22, { col: rgba(col, .3), lw: 2 });
    const q = ((lt + 10) / (o.per || 1.5)) % 1; ring(g, x, y, z, r * lerp(.8, 1.7, eo(q)), { col: rgba(col, .55 * (1 - q)), lw: 2.5 });
    g.restore();
  }
  function cyl(g, x, y, z, r, h, o = {}) { // цилиндр: бока с переходом света, светлый верх
    const c = o.col || P.steel, b = pt(x, y, z), tp = pt(x, y, z + h), rx = r * 1.2247 * V.s, ry = r * .7071 * V.s;
    const gr = g.createLinearGradient(b[0] - rx, 0, b[0] + rx, 0); gr.addColorStop(0, shade(c, .08)); gr.addColorStop(1, shade(c, -.38));
    g.beginPath(); g.moveTo(b[0] - rx, tp[1]); g.lineTo(b[0] - rx, b[1]); g.ellipse(b[0], b[1], rx, ry, 0, PI, 0, true); g.lineTo(b[0] + rx, tp[1]); g.closePath(); g.fillStyle = gr; g.fill();
    g.beginPath(); g.ellipse(tp[0], tp[1], rx, ry, 0, 0, PI2); g.fillStyle = o.top || shade(c, .25); g.fill();
    if (o.edge) { g.strokeStyle = o.edge; g.lineWidth = 2 * V.s; g.stroke(); }
  }
  function onFace(g, x, y, z, face, fn) { // рисовать в плоскости грани: face 'top' (u=+x, v=+y) | 'left' (+y-грань: u=+x, v=вниз) | 'right' (+x-грань: u=−y, v=вниз)
    const c = pt(x, y, z), k = V.s; g.save();
    if (face === 'top') g.transform(C30 * k, S30 * k, -C30 * k, S30 * k, c[0], c[1]);
    else if (face === 'right') g.transform(C30 * k, -S30 * k, 0, k, c[0], c[1]);
    else g.transform(C30 * k, S30 * k, 0, k, c[0], c[1]);
    fn(g); g.restore();
  }
  function faceText(g, s, x, y, z, size, o = {}) { // надпись на грани (единицы мира)
    onFace(g, x, y, z, o.face || 'left', g => { g.font = font(size, o.w || 700); g.textAlign = o.al || 'center'; g.textBaseline = 'middle'; g.fillStyle = o.col || P.white; g.fillText(s, 0, 0); });
  }

  // ---------- линии, узлы, движение по пути ----------
  function trace(g, pts, p = 1, col = P.cyan, lw = 3, o = {}) { // ломаная [[x,y],…] на долю p; → точка головы
    if (p <= 0 || pts.length < 2) return null; const L = []; let tot = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(l); tot += l; }
    let rem = tot * cl(p), hx = pts[0][0], hy = pts[0][1]; g.beginPath(); g.moveTo(hx, hy);
    for (let i = 0; i < L.length && rem > 0; i++) { const f = Math.min(1, rem / (L[i] || 1)); hx = lerp(pts[i][0], pts[i + 1][0], f); hy = lerp(pts[i][1], pts[i + 1][1], f); g.lineTo(hx, hy); rem -= L[i]; }
    g.strokeStyle = col; g.lineWidth = lw; if (o.dash) { g.setLineDash(o.dash); g.lineDashOffset = o.off || 0; }
    g.stroke(); if (o.dash) g.setLineDash([]); return [hx, hy];
  }
  function along(pts, u) { // точка на ломаной на доле длины u → [x, y, угол]
    let tot = 0; const L = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(l); tot += l; }
    let rem = tot * cl(u);
    for (let i = 0; i < L.length; i++) { if (rem <= L[i] || i === L.length - 1) { const f = L[i] ? cl(rem / L[i]) : 0, a = pts[i], b = pts[i + 1]; return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), Math.atan2(b[1] - a[1], b[0] - a[0])]; } rem -= L[i]; }
    return [pts[0][0], pts[0][1], 0];
  }
  function pulses(g, pts, lt, o = {}) { // бегущие штрихи вдоль ломаной (поток данных, движение)
    const n = o.n || 3, sp = o.speed || 240, len = o.len || 26, col = o.col || P.cyan; let tot = 0;
    for (let i = 1; i < pts.length; i++) tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (!tot) return; g.save(); g.strokeStyle = col; g.lineWidth = o.lw || 5; g.lineCap = 'round'; g.globalAlpha *= o.a ?? 1; g.beginPath();
    for (let i = 0; i < n; i++) { let u = ((lt * sp / tot + i / n + (o.off || 0)) % 1 + 1) % 1; if (o.rev) u = 1 - u;
      const a = along(pts, u), h = len / 2; g.moveTo(a[0] - Math.cos(a[2]) * h, a[1] - Math.sin(a[2]) * h); g.lineTo(a[0] + Math.cos(a[2]) * h, a[1] + Math.sin(a[2]) * h); }
    g.stroke(); g.restore();
  }
  function arcPts(x0, y0, x1, y1, bend = .28, n = 36) { // дуга (Безье), выгнута вверх → точки
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
    let nx = -dy / L, ny = dx / L; if (ny > 0) { nx = -nx; ny = -ny; } const cx = mx + nx * L * bend, cy = my + ny * L * bend, out = [];
    for (let i = 0; i <= n; i++) { const u = i / n, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u; out.push([a * x0 + b * cx + c * x1, a * y0 + b * cy + c * y1]); }
    return out;
  }
  function node(g, x, y, r = 8, o = {}) { // полый узел образца; o.fill: сплошной; o.p: появление
    const p = o.p ?? 1; if (p <= 0) return; const rr_ = r * eb(p);
    g.beginPath(); g.arc(x, y, Math.max(.1, rr_), 0, PI2);
    if (o.fill) { g.fillStyle = o.fill; g.fill(); } else { g.fillStyle = o.bg || P.bg; g.fill(); g.strokeStyle = o.col || P.cyan; g.lineWidth = o.lw || 2.5; g.stroke(); }
  }
  function ripple(g, x, y, lt, o = {}) { // расходящиеся кольца: пинг, звонок, тревога; o.flat: изометрический эллипс; o.once: один раз
    if (lt < 0) return; const n = o.n || 3, per = o.per || 1.2, r0 = o.r0 ?? 16, r1 = o.r1 || 150, col = o.col || P.cyan, k = o.flat ? .577 : 1;
    g.save(); g.strokeStyle = col;
    for (let i = 0; i < n; i++) {
      const q = o.once ? (lt - i * (o.gap || .16)) / per : ((lt / per) + i / n) % 1; if (q <= 0 || q >= 1) continue;
      const r = lerp(r0, r1, eo(q)); g.globalAlpha = (o.a ?? 1) * (1 - q) * .9; g.lineWidth = (o.lw || 3) * (1 - q * .5);
      g.beginPath(); g.ellipse(x, y, r, r * k, 0, 0, PI2); g.stroke();
    }
    g.restore();
  }
  function reticle(g, x, y, r, lt, o = {}) { // прицел: уголки (o.lock 0…1 стягивает), перекрестье, вращающийся пунктир
    const col = o.col || P.cyan, lk = o.lock ?? 1, rr_ = r * (1 + (1 - eo(lk)) * .7), L = r * .34;
    g.save(); g.globalAlpha *= o.a ?? 1; g.strokeStyle = col; g.lineWidth = o.lw || 4; g.beginPath();
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { g.moveTo(x + a * rr_, y + b * (rr_ - L)); g.lineTo(x + a * rr_, y + b * rr_); g.lineTo(x + a * (rr_ - L), y + b * rr_); });
    g.moveTo(x - r * .18, y); g.lineTo(x + r * .18, y); g.moveTo(x, y - r * .18); g.lineTo(x, y + r * .18); g.stroke();
    g.setLineDash([10, 12]); g.lineDashOffset = -lt * 50; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r * .78, 0, PI2); g.stroke(); g.restore();
  }
  function check(g, x, y, s, p = 1, col = P.green, lw) { return trace(g, [[x - s * .5, y], [x - s * .12, y + s * .38], [x + s * .55, y - s * .42]], p, col, lw || s * .17); }

  const SP = {};
  function spokes(n, sd) { const key = n + ':' + sd; if (SP[key]) return SP[key]; const R = rnd(sd), out = [];
    for (let i = 0; i < n; i++) out.push({ a: (i + (R() - .5) * .55) / n * PI2, e1: .2 + R() * .3, e2: 0, da: (R() - .5) * .22, warm: R() < .28, sp: .75 + R() * .5, ph: R() });
    out.forEach(s => { s.e2 = s.e1 + .1 + hash(s.a * 9) * .14; }); return SP[key] = out; }
  function radial(g, cx, cy, lt, o = {}) { // радиальная сеть образца: лучи с изломом, полые узлы, к центру бегут голубые и оранжевые штрихи
    const n = o.n || 22, r0 = o.r0 || 300, r1 = o.r1 || 1150, p = o.p ?? 1, S = spokes(n, o.seed || 5); if (p <= 0) return;
    g.save(); const paths = S.map(s => { const A = [cx + Math.cos(s.a + s.da) * r1, cy + Math.sin(s.a + s.da) * r1], e2 = lerp(r0, r1, s.e2), e1 = lerp(r0, r1, s.e1);
      return [A, [cx + Math.cos(s.a + s.da) * e2, cy + Math.sin(s.a + s.da) * e2], [cx + Math.cos(s.a) * e1, cy + Math.sin(s.a) * e1], [cx + Math.cos(s.a) * r0, cy + Math.sin(s.a) * r0]]; });
    g.lineWidth = 2; g.strokeStyle = o.col || P.line; g.beginPath();
    paths.forEach(q => { const h = along(q, eo(p)); g.moveTo(q[0][0], q[0][1]); let rem = eo(p);
      const lens = [Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]), Math.hypot(q[2][0] - q[1][0], q[2][1] - q[1][1]), Math.hypot(q[3][0] - q[2][0], q[3][1] - q[2][1])], tot = lens[0] + lens[1] + lens[2];
      let acc = 0; for (let i = 0; i < 3; i++) { if (acc + lens[i] <= tot * rem) g.lineTo(q[i + 1][0], q[i + 1][1]); else { g.lineTo(h[0], h[1]); break; } acc += lens[i]; } });
    g.stroke();
    if (p > .6) paths.forEach((q, i) => { const a = eo(pr(p, .6 + (i % 5) * .05, 1)); node(g, q[1][0], q[1][1], 7, { p: a, col: o.col || P.line }); node(g, q[3][0], q[3][1], 7, { p: a, col: P.cyanD }); });
    if (p >= 1 && o.flow !== false) paths.forEach((q, i) => { const s = S[i]; pulses(g, q, lt * s.sp + s.ph * 3, { n: 1, speed: o.speed || 260, len: 30, lw: 5, col: s.warm ? P.orange : P.cyan, a: .9 }); });
    g.restore();
  }
  function dial(g, cx, cy, r, lt, o = {}) { // круглая схема-«сканер»: диск, кольцо, дуга прогресса frac, зубцы, скобы, точки
    const p = eo(o.p ?? 1), col = o.col || P.cyan; if (p <= 0) return; g.save();
    g.fillStyle = P.white; g.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * PI2 + PI / 12, R = r + 112; g.moveTo(cx + Math.cos(a) * R + 4 * p, cy + Math.sin(a) * R); g.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 4.5 * p, 0, PI2); } g.fill();
    g.lineWidth = 16; g.strokeStyle = '#8B93A6'; g.lineCap = 'butt'; const rot = (o.rot || 0) + lt * .12;
    for (let q = 0; q < 4; q++) { g.beginPath(); g.arc(cx, cy, r + 76, rot + q * PI / 2 + .16, rot + q * PI / 2 + .16 + (PI / 2 - .32) * p); g.stroke(); }
    g.lineWidth = 3; g.strokeStyle = rgba(o.teeth || '#B86A5C', .85); g.beginPath();
    for (let i = 0; i < 90 * p; i++) { const a = i / 90 * PI2; g.moveTo(cx + Math.cos(a) * (r + 34), cy + Math.sin(a) * (r + 34)); g.lineTo(cx + Math.cos(a) * (r + 46), cy + Math.sin(a) * (r + 46)); } g.stroke();
    g.beginPath(); g.arc(cx, cy, r * p, 0, PI2); g.fillStyle = o.fill || P.lav; g.fill(); g.lineWidth = 5; g.strokeStyle = col; g.stroke();
    if (o.frac != null) { g.lineCap = 'round'; g.lineWidth = 10; g.strokeStyle = col; g.beginPath(); g.arc(cx, cy, r + 17, -PI / 2, -PI / 2 + PI2 * cl(o.frac) * p); g.stroke(); }
    g.restore();
  }
  function gauge(g, x, y, w, h, f, o = {}) { // вертикальная шкала образца: рамка, заливка снизу на f, риски, подпись под ней
    const col = o.col || P.cyan; rr(g, x, y, w, h, 6); g.fillStyle = rgba(col, .08); g.fill(); g.strokeStyle = rgba(col, .7); g.lineWidth = 2.5; g.stroke();
    const ih = (h - 10) * cl(f); g.fillStyle = col; g.fillRect(x + 5, y + h - 5 - ih, w - 10, ih); glow(g, x + w / 2, y + h - 5 - ih, w * 1.4, col, .35 * cl(f * 3));
    g.strokeStyle = rgba(col, .6); g.lineWidth = 2; g.beginPath(); for (let i = 1; i < 5; i++) { const yy = y + h * i / 5; g.moveTo(x + w + 6, yy); g.lineTo(x + w + 16, yy); } g.stroke();
    if (o.label) label(g, o.label, x + w / 2, y + h + 38, 22, { col: P.grey, al: 'center' });
  }
  function cursor(g, x, y, s = 1, o = {}) { // стрелка-курсор, остриё в (x,y); o.press 0…1: нажатие
    const k = s * (1 - (o.press || 0) * .14); g.save(); g.translate(x, y); g.scale(k, k);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 64); g.lineTo(16, 50); g.lineTo(27, 74); g.lineTo(39, 69); g.lineTo(28, 45); g.lineTo(49, 45); g.closePath();
    g.fillStyle = P.white; g.fill(); g.lineWidth = 4; g.strokeStyle = P.ink; g.lineJoin = 'round'; g.stroke(); g.restore();
  }
  function pin(g, x, y, s = 1, o = {}) { // метка на карте, остриё в (x,y)
    const col = o.col || P.cyan; g.save(); g.translate(x, y); g.scale(s, s);
    g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-6, -16, -26, -30, -26, -52); g.arc(0, -52, 26, PI, 0); g.bezierCurveTo(26, -30, 6, -16, 0, 0); g.closePath();
    g.fillStyle = col; g.fill(); g.beginPath(); g.arc(0, -52, 10, 0, PI2); g.fillStyle = o.hole || P.bg; g.fill(); g.restore();
  }
  function barcode(g, x, y, w, h, p = 1, o = {}) { // штрихкод слева направо на долю p
    const key = 'bc' + (o.seed || 7); let bars = RC[key];
    if (!bars) { const R = rnd(o.seed || 7); bars = []; let u = 0; while (u < 1) { const bw = (1 + Math.floor(R() * 3)) * .013, gp = (1 + Math.floor(R() * 2)) * .012; if (u + bw > 1) break; bars.push([u, bw]); u += bw + gp; } RC[key] = bars; }
    g.fillStyle = o.col || P.ink; for (const b of bars) { if (b[0] > p) break; g.fillRect(x + b[0] * w, y, b[1] * w, h); }
  }
  function laser(g, x0, y0, x1, y1, o = {}) { // луч сканера с ореолом
    const col = o.col || P.red, a = o.a ?? 1; if (a <= 0) return; g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    [[26, .08], [12, .22], [5, .7]].forEach(([w, al]) => { g.strokeStyle = rgba(col, al * a); g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); });
    g.strokeStyle = rgba('#FFD9D9', .9 * a); g.lineWidth = 1.8; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.restore();
    glow(g, x0, y0, 30, col, .6 * a); glow(g, x1, y1, 30, col, .6 * a);
  }
  function moon(g, x, y, r) { // серп луны со свечением
    if (!RC.moon) { const [c, m] = mk(128, 128); m.fillStyle = '#E9EEF8'; m.beginPath(); m.arc(64, 64, 56, 0, PI2); m.fill(); m.globalCompositeOperation = 'destination-out'; m.beginPath(); m.arc(90, 46, 50, 0, PI2); m.fill(); RC.moon = c; }
    glow(g, x, y, r * 3, '#8FA6D8', .22); g.drawImage(RC.moon, x - r * 1.14, y - r * 1.14, r * 2.28, r * 2.28);
  }
  function dotMap(g, x, y, w, h, o = {}) { // карта из точек: своя «суша» по зерну (кэш), o.a: прозрачность
    const st = o.step || 20, sd = o.seed || 3, key = 'map' + sd + ':' + w + 'x' + h + ':' + st;
    if (!RC[key]) { const [c, m] = mk(w, h); m.fillStyle = o.col || '#2D3758'; m.beginPath();
      for (let j = 0; j * st * .866 < h; j++) for (let i = 0; i * st < w; i++) { const px = i * st + (j & 1) * st / 2 + st / 2, py = j * st * .866 + st / 2, u = px / w, v = py / h;
        const f = .62 - Math.hypot((u - .5) * 1.25, (v - .5) * 1.05) * 1.25 + .17 * Math.sin(u * 7.3 + sd) * Math.cos(v * 5.1 + sd * 1.7) + .1 * Math.sin(u * 15.7 - v * 11.3 + sd * 2.1) + .05 * Math.sin(v * 23 + u * 4 + sd);
        if (f > 0) { m.moveTo(px + st * .24, py); m.arc(px, py, st * .24, 0, PI2); } }
      m.fill(); RC[key] = c; }
    g.save(); g.globalAlpha *= o.a ?? 1; g.drawImage(RC[key], x, y); g.restore();
  }

  // ---------- текст ----------
  const font = (size, w = 700, fam = F.sans) => w + ' ' + Math.max(1, Math.round(size)) + 'px ' + fam;
  const CW = new Map();
  const cw = (g, ch) => { const key = g.font + '|' + ch; let v = CW.get(key); if (v == null) { v = g.measureText(ch).width; CW.set(key, v); } return v; };
  function text(g, s, x, y, size, o = {}) { // строка; o.max: ужать кегль под ширину; → {w, size}
    s = String(s); g.font = font(size, o.w || 700, o.fam); let w = g.measureText(s).width;
    if (o.max && w > o.max) { size *= o.max / w; g.font = font(size, o.w || 700, o.fam); w = g.measureText(s).width; }
    g.textAlign = o.al || 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = o.col || P.white; g.fillText(s, x, y); return { w, size };
  }
  function labelW(g, s, size, w = 600, tr) { g.font = font(size, w); const t = tr ?? size * .14; let tw = 0; for (const ch of s) tw += cw(g, ch) + t; return tw - t; }
  function label(g, s, x, y, size = 22, o = {}) { // подпись капсом с разрядкой (буквы по одной: letterSpacing запрещён); o.n: сколько букв видно
    s = String(s).toUpperCase(); let tr = o.track ?? size * .14, tw = labelW(g, s, size, o.w || 600, tr);
    if (o.max && tw > o.max) { const k = o.max / tw; size *= k; tr *= k; tw = labelW(g, s, size, o.w || 600, tr); }
    let cx = o.al === 'center' ? x - tw / 2 : o.al === 'right' ? x - tw : x; const n = o.n ?? s.length;
    g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = o.col || P.grey; let i = 0;
    for (const ch of s) { if (i++ >= n) break; g.fillText(ch, cx, y); cx += cw(g, ch) + tr; }
    return tw;
  }
  const TC = new Map();
  function parseSpec(spec) {
    let r = TC.get(spec); if (r) return r; r = []; let br = 0;
    spec.trim().split(/\s+/).forEach(tok => { if (tok === '|') { br++; return; } const m = tok.match(/^(\*?)(.*?)(?:@(-?\d*\.?\d+))?$/); r.push({ s: m[2], key: !!m[1], t: m[3] != null ? +m[3] : null, br, w: 0 }); });
    let last = 0; r.forEach((w, i) => { if (w.t == null) w.t = i ? last + .14 : 0; last = w.t; }); TC.set(spec, r); return r;
  }
  function title(g, lt, spec, x, y, o = {}) { // утверждение образца: жирный гротеск, белый, *ключ цветом (заливка проходит слева направо)
    // spec: «Что@.05 происходит@.25 | *дальше?@.9»: @ секунды от склейки, |: перенос строки, *: ключевое слово. y: верх блока
    const ws = parseSpec(spec), max = o.max || 960, al = o.al || 'left', lh = o.lh || 1.1, wt = o.w || 700; let size = o.size || 104, lines, sp;
    for (let it = 0; it < 14; it++) {
      g.font = font(size, wt); sp = g.measureText(' ').width; lines = []; let cur = null, cb = -1;
      for (const w of ws) { w.w = g.measureText(w.s).width; if (!cur || w.br !== cb || cur.w + sp + w.w > max) { cur = { ws: [w], w: w.w }; cb = w.br; lines.push(cur); } else { cur.ws.push(w); cur.w += sp + w.w; } }
      if (Math.max(...lines.map(l => l.w)) <= max && lines.length <= (o.lines || 3)) break; size *= .94;
    }
    g.textBaseline = 'alphabetic'; g.textAlign = 'left'; const stp = size * lh, out = o.out != null ? pr(lt, o.out, o.out + (o.outDur || .2)) : 0, du = o.dur || .32;
    if (out < 1) lines.forEach((L, li) => {
      let cx = al === 'center' ? x - L.w / 2 : al === 'right' ? x - L.w : x; const by = y + size * .8 + li * stp;
      for (const w of L.ws) { const a = pr(lt, w.t, w.t + du);
        if (a > 0) { const e = eo(a), q = ei(out), dy = (1 - e) * size * .3 - q * size * .45;
          g.save(); g.globalAlpha *= cl(a * 2.4) * (1 - q); g.fillStyle = w.key && o.kfill ? (o.kcol || P.cyan) : (o.col || P.white); g.fillText(w.s, cx, by + dy);
          if (w.key && !o.kfill) { const kp = eo(pr(lt, w.t + .05, w.t + .38)); if (kp > 0) { g.beginPath(); g.rect(cx - 6, by + dy - size * 1.05, (w.w + 12) * kp, size * 1.45); g.clip(); g.fillStyle = o.kcol || P.cyan; g.fillText(w.s, cx, by + dy); } }
          g.restore(); }
        cx += w.w + sp; }
    });
    return { size, h: lines.length * stp, n: lines.length, w: Math.max(...lines.map(l => l.w)) };
  }
  function digits(g, cells, x, y, size, o = {}) { // барабан цифр: cells [{d, n, r}] | {ch, k, col}; r: доля прокрутки к n
    g.font = font(size, o.w || 800); const dw = cw(g, '0') * 1.02, lh = size * 1.12; let tot = 0;
    for (const c of cells) tot += c.ch != null ? (g.font = font(size * (c.k || 1), o.w || 800), cw(g, c.ch) + (c.k ? size * .12 : 0)) : dw;
    const x0 = o.al === 'center' ? x - tot / 2 : o.al === 'right' ? x - tot : x;
    g.save(); g.beginPath(); g.rect(x0 - 8, y - size * .95, tot + 16, size * 1.2); g.clip(); g.textBaseline = 'alphabetic'; g.textAlign = 'left'; let cx = x0;
    for (const c of cells) {
      if (c.ch != null) { g.font = font(size * (c.k || 1), o.w || 800); g.fillStyle = c.col || o.col || P.white; g.fillText(c.ch, cx + (c.k ? size * .06 : 0), y); cx += cw(g, c.ch) + (c.k ? size * .12 : 0); continue; }
      g.font = font(size, o.w || 800); g.fillStyle = o.col || P.white; const r = cl(c.r || 0), w0 = cw(g, String(c.d));
      g.fillText(String(c.d), cx + (dw - w0) / 2, y - r * lh); if (r > 0) g.fillText(String(c.n), cx + (dw - cw(g, String(c.n))) / 2, y - r * lh + lh); cx += dw;
    }
    g.restore(); return tot;
  }
  function odo(g, v, x, y, size, o = {}) { // число-барабан (группы по 3, запятая): o.d знаков после запятой, o.pad, o.al, o.col
    const dec = o.d || 0, m = Math.pow(10, dec), iv = Math.max(0, v) * m + 1e-7, n = Math.floor(iv), f = iv - n; let s = String(n);
    while (s.length < (o.pad || 1) + dec) s = '0' + s; const L = s.length, il = L - dec, cells = [];
    for (let i = 0; i < L; i++) { const pw = Math.pow(10, L - 1 - i); if (i > 0 && i < il && (il - i) % 3 === 0) cells.push({ ch: ' ', k: .5 }); if (i === il) cells.push({ ch: ',' });
      const d = +s[i]; cells.push({ d, n: (d + 1) % 10, r: (n % pw) === pw - 1 ? f : 0 }); }
    if (o.unit) cells.push({ ch: ' ' + o.unit, k: o.uk || .42, col: o.ucol || P.grey });
    return digits(g, cells, x, y, size, o);
  }
  function odoTime(g, min, x, y, size, o = {}) { // таймер «ЧЧ ч ММ мин» барабаном из минут
    const mi = Math.floor(Math.max(0, min) + 1e-7), f = Math.max(0, min) - mi, mm = mi % 60, hh = Math.floor(mi / 60) % 100;
    const hT = Math.floor(hh / 10), hU = hh % 10, mT = Math.floor(mm / 10), mU = mm % 10, u = o.ucol || P.grey;
    return digits(g, [{ d: hT, n: (hT + 1) % 10, r: mm === 59 && hU === 9 ? f : 0 }, { d: hU, n: (hU + 1) % 10, r: mm === 59 ? f : 0 }, { ch: 'ч', k: .44, col: u },
      { d: mT, n: (mT + 1) % 6, r: mU === 9 ? f : 0 }, { d: mU, n: (mU + 1) % 10, r: f }, { ch: 'мин', k: .44, col: u }], x, y, size, o);
  }
  function rr(g, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function pill(g, s, x, y, o = {}) { // капсула образца: контур, точка, капс; (x,y): левый край (или o.al) и центр по высоте; → ширина
    const size = o.size || 24, col = o.col || P.cyan, dot = o.dot !== false, tw = labelW(g, String(s).toUpperCase(), size, 700), h = size * 1.95, w = tw + size * (dot ? 2.5 : 1.7);
    const x0 = o.al === 'center' ? x - w / 2 : o.al === 'right' ? x - w : x;
    rr(g, x0, y - h / 2, w, h, h / 2); g.fillStyle = o.fill || rgba(col, .1); g.fill(); g.strokeStyle = col; g.lineWidth = o.lw || 2.5; g.stroke();
    if (o.glow) glow(g, x0 + w / 2, y, w * .7, col, .35 * o.glow, h * 1.2);
    if (dot) { g.beginPath(); g.arc(x0 + size * .95, y, size * .22, 0, PI2); g.fillStyle = col; g.fill(); }
    label(g, s, x0 + size * (dot ? 1.6 : .85), y + size * .36, size, { col: o.tcol || col, w: 700 }); return w;
  }
  function card(g, x, y, w, h, o = {}) { // панель образца: тёмная заливка, тонкая рамка (o.col), o.p: сборка (рамка обегает)
    const p = o.p ?? 1; if (p <= 0) return; const r = o.r ?? 18, per = 2 * (w + h);
    g.save(); g.globalAlpha *= cl(p * 2.5); rr(g, x, y, w, h, r); g.fillStyle = o.fill || rgba(P.panel, .94); g.fill();
    g.setLineDash([per * eo(p), per]); g.lineDashOffset = 0; g.strokeStyle = o.col || P.edge; g.lineWidth = o.lw || 2.5; g.stroke(); g.setLineDash([]); g.restore();
  }
  function stamp(g, lt, t0, s, x, y, o = {}) { // штамп-метка: двойная рамка и капс, «впечатывается» пружиной
    if (lt < t0) return; const t = lt - t0, sc = lerp(1.7, 1, spring(t, 1.4, 8)), size = o.size || 40, col = o.col || P.green, tw = labelW(g, s.toUpperCase(), size, 800), w = tw + size * 1.5, h = size * 2;
    g.save(); g.translate(x, y); g.rotate((o.rot ?? -6) * DEG); g.scale(sc, sc); g.globalAlpha *= cl(t / .1);
    rr(g, -w / 2, -h / 2, w, h, 12); g.fillStyle = rgba(col, .1); g.fill(); g.lineWidth = 5; g.strokeStyle = col; g.stroke();
    rr(g, -w / 2 + 9, -h / 2 + 9, w - 18, h - 18, 7); g.lineWidth = 2; g.stroke(); label(g, s, 0, size * .36, size, { col, al: 'center', w: 800 }); g.restore();
  }
  function callout(g, lt, t0, ax, ay, bx, by, s, o = {}) { // выноска: узел у предмета, линия с изломом, подпись капсом печатается
    const col = o.col || P.cyan, dir = bx >= ax ? 1 : -1; if (lt < t0) return; const end = o.out != null ? 1 - pr(lt, o.out, o.out + .15) : 1; if (end <= 0) return;
    g.save(); g.globalAlpha *= end; const ex = ax + Math.min(Math.abs(by - ay), Math.abs(bx - ax) * .8) * dir;
    node(g, ax, ay, 7, { col, p: pr(lt, t0, t0 + .18), bg: o.bg });
    trace(g, [[ax, ay], [ex, by], [bx, by]], eo(pr(lt, t0 + .05, t0 + .38)), col, 2.5);
    const sz = o.size || 24, q = pr(lt, t0 + .28, t0 + .7), str = String(s).toUpperCase();
    if (q > 0) label(g, str, bx + dir * 12, by + sz * .36, sz, { col: o.tcol || col, al: dir > 0 ? 'left' : 'right', w: 700, n: Math.ceil(q * str.length) });
    g.restore();
  }
  function steps(g, lt, rows, x, y, o = {}) { // лента статусов: rows [{s, sub, st:'done'|'now'|'next', t}]; узлы на вертикальной линии
    const gap = o.gap || 112, size = o.size || 46, w = o.w || 820;
    rows.forEach((r, i) => {
      const t0 = r.t ?? i * .07, a = pr(lt, t0, t0 + .32); if (a <= 0) return; const e = eo(a), yy = y + i * gap + (1 - e) * 28, col = r.st === 'done' ? P.green : r.st === 'now' ? P.cyan : P.greyD;
      g.save(); g.globalAlpha *= cl(a * 2.2);
      if (i > 0) { g.strokeStyle = r.st === 'next' ? P.mute : rgba(P.green, .7); g.lineWidth = 3; g.beginPath(); g.moveTo(x, yy - gap + 20); g.lineTo(x, lerp(yy - gap + 20, yy - 20, e)); g.stroke(); }
      if (r.st === 'now') { ripple(g, x, yy, lt - t0, { r0: 14, r1: 46, per: 1.3, col, n: 2, lw: 2.5 }); glow(g, x, yy, 50, col, .45); }
      g.beginPath(); g.arc(x, yy, 15, 0, PI2); if (r.st === 'next') { g.fillStyle = P.bg; g.fill(); g.strokeStyle = col; g.lineWidth = 3; g.stroke(); } else { g.fillStyle = col; g.fill(); }
      if (r.st === 'done') check(g, x, yy + 1, 15, 1, P.ink, 3.5);
      text(g, r.s, x + 46, yy + size * .36, size, { col: r.st === 'next' ? P.greyD : r.st === 'now' ? P.white : '#BFC3D1', w: r.st === 'now' ? 700 : 600, max: w - 46 - (r.sub ? 150 : 0) });
      if (r.sub) label(g, r.sub, x + w, yy + 9, 24, { col: r.st === 'now' ? P.cyan : P.grey, al: 'right' });
      g.restore();
    });
  }

  // ---------- появление ----------
  function pop(g, lt, t0, x, y, fn, o = {}) { // появление пружиной вокруг (x,y) с лёгким перелётом; o.out: уход (в 1,4 раза быстрее)
    if (lt < t0) return false; const t = lt - t0; let sc = lerp(o.from ?? .4, 1, spring(t, o.f || 1.6, o.z || 7)), al = cl(t / .12);
    if (o.out != null && lt > o.out) { const q = pr(lt, o.out, o.out + (o.outDur || .2)); if (q >= 1) return false; sc *= 1 - .35 * ei(q); al *= 1 - q; }
    g.save(); g.translate(x, y); g.scale(sc, sc); g.translate(-x, -y); g.globalAlpha *= al; fn(g); g.restore(); return true;
  }
  function rise(g, lt, t0, fn, o = {}) { // текстовый блок: подъём и проявление без перелёта; o.out: уход
    const p = pr(lt, t0, t0 + (o.dur || .32)); if (p <= 0) return false; let q = 0; if (o.out != null) { q = pr(lt, o.out, o.out + .2); if (q >= 1) return false; }
    g.save(); g.translate(0, (1 - eo(p)) * (o.dy ?? 36) - ei(q) * 40); g.globalAlpha *= cl(p * 2.2) * (1 - q); fn(g); g.restore(); return true;
  }

  // ---------- предметы-конструкторы (единицы мира) ----------
  function shadow(g, x, y, z, r, a = .34) { g.beginPath(); isoEll(g, x, y, z, r); g.fillStyle = 'rgba(2,3,10,' + a + ')'; g.fill(); }
  function beacon(g, x, y, z, lt, o = {}) { // маяк отслеживания над предметом: пунктир вверх, ромб-узел, пинг
    const k = (o.s || 1) * V.s, col = o.col || P.cyan, a = o.a ?? 1; if (a <= 0) return; const b = pt(x, y, z), bob = Math.sin(lt * 3.1) * 4 * k, ty = b[1] - 74 * k + bob;
    g.save(); g.globalAlpha *= a; g.strokeStyle = rgba(col, .75); g.lineWidth = 2 * k; g.setLineDash([5 * k, 6 * k]); g.beginPath(); g.moveTo(b[0], b[1] - 4 * k); g.lineTo(b[0], ty + 12 * k); g.stroke(); g.setLineDash([]);
    glow(g, b[0], ty, 38 * k, col, .5); const r = 11 * k; g.beginPath(); g.moveTo(b[0], ty - r); g.lineTo(b[0] + r * .8, ty); g.lineTo(b[0], ty + r); g.lineTo(b[0] - r * .8, ty); g.closePath(); g.fillStyle = col; g.fill();
    const q = ((lt + 5) * .75) % 1; g.strokeStyle = rgba(col, (1 - q) * .8); g.lineWidth = 2 * k; g.beginPath(); g.arc(b[0], ty, r + q * 28 * k, 0, PI2); g.stroke(); g.restore();
  }
  function parcel(g, x, y, z, s = 1, o = {}) { // посылка: (x,y,z): центр дна; o.open 0…1 клапаны, o.tape 0…1, o.label 0…1 ярлык, o.hi 0…1 маяк, o.lt, o.floor: z пола для тени
    const w = 112 * s, d = 112 * s, h = 92 * s, x0 = x - w / 2, y0 = y - d / 2, col = o.col || P.kraft, lt = o.lt ?? T, op = cl(o.open || 0), hi = o.hi || 0;
    const cT = shade(col, .2), cR = shade(col, -.3), fz = o.floor ?? z;
    if (o.shadow !== false) shadow(g, x + 6 * s, y + 6 * s, fz, 66 * s * (1 - cl((z - fz) / 500) * .5), .36);
    if (hi > 0) pad(g, x, y, fz, 84 * s, lt, { a: hi });
    block(g, x0, y0, z, w, d, h, { top: op > 0 ? shade(col, -.6) : cT, left: col, right: cR });
    const zt = z + h, th = op * 2.15, hd = d / 2, hw = w / 2, cs = Math.cos(th), sn = Math.sin(th);
    const flap = (pts, c) => { g.beginPath(); g.moveTo(...pt(...pts[0])); for (let i = 1; i < 4; i++) g.lineTo(...pt(...pts[i])); g.closePath(); g.fillStyle = c; g.fill(); };
    if (op > 0) { // задние клапаны
      flap([[x0, y0, zt], [x0 + w, y0, zt], [x0 + w, y0 + hd * cs, zt + hd * sn], [x0, y0 + hd * cs, zt + hd * sn]], shade(col, .12 - op * .2));
      flap([[x0, y0, zt], [x0, y0 + d, zt], [x0 + hw * .8 * cs, y0 + d, zt + hw * .8 * sn], [x0 + hw * .8 * cs, y0, zt + hw * .8 * sn]], shade(col, .05 - op * .25));
    } else { g.beginPath(); g.moveTo(...pt(x0, y, zt)); g.lineTo(...pt(x0 + w, y, zt)); g.strokeStyle = shade(col, -.25); g.lineWidth = 2 * V.s * s; g.stroke(); }
    const tp = op > 0 ? 0 : cl(o.tape ?? 1);
    if (tp > 0) { const tw = d * .17; g.beginPath(); qTop(g, x0, y - tw / 2, zt, w * tp, tw); g.fillStyle = P.tape; g.fill();
      if (tp > .97) { g.beginPath(); qR(g, x0 + w, y - tw / 2, zt - h * .42, tw, h * .42); g.fillStyle = shade(P.tape, -.3); g.fill(); } }
    if ((o.label || 0) > 0) onFace(g, x0 + w * .14, y0 + d, z + h * .82, 'left', q => {
      const lp = cl(o.label), sc = lerp(1.35, 1, eo(lp)); q.globalAlpha *= cl(lp * 3); q.translate(w * .3, h * .26); q.scale(sc, sc); q.translate(-w * .3, -h * .26);
      q.fillStyle = '#F3F0E8'; q.fillRect(0, 0, w * .6, h * .52); barcode(q, w * .06, h * .07, w * .48, h * .26, 1, { seed: 11 }); q.fillStyle = '#9A958C'; q.fillRect(w * .06, h * .39, w * .3, h * .05); });
    if (op > 0) { // передние клапаны
      flap([[x0 + w, y0, zt], [x0 + w, y0 + d, zt], [x0 + w - hw * .8 * cs, y0 + d, zt + hw * .8 * sn], [x0 + w - hw * .8 * cs, y0, zt + hw * .8 * sn]], shade(col, -.12 - op * .1));
      flap([[x0, y0 + d, zt], [x0 + w, y0 + d, zt], [x0 + w, y0 + d - hd * cs, zt + hd * sn], [x0, y0 + d - hd * cs, zt + hd * sn]], shade(col, .02 - op * .08));
    }
    if (hi > 0) { g.save(); g.globalAlpha *= hi; g.beginPath(); g.moveTo(...pt(x0, y0 + d, z)); g.lineTo(...pt(x0 + w, y0 + d, z)); g.lineTo(...pt(x0 + w, y0, z)); g.lineTo(...pt(x0 + w, y0, zt)); g.lineTo(...pt(x0, y0, zt)); g.lineTo(...pt(x0, y0 + d, zt)); g.closePath();
      g.strokeStyle = P.cyan; g.lineWidth = 2.5 * V.s; g.stroke(); g.restore(); if (o.beacon !== false) beacon(g, x, y, zt + (op > 0 ? hd * .9 : 0), lt, { a: hi, s: o.bs || Math.max(.7, s) }); }
  }
  function robot(g, x, y, z, s = 1, o = {}) { // робот-тележка склада: (x,y,z): центр дна; o.lift 0…1, o.beam 0…1 и o.aim [x,y] экрана: луч сканера
    const w = 116 * s, d = 86 * s, h = 30 * s, x0 = x - w / 2, y0 = y - d / 2, zb = z + 8 * s;
    shadow(g, x + 6 * s, y + 6 * s, z, 70 * s, .32);
    block(g, x0 + 8 * s, y0 + 8 * s, z, w - 16 * s, d - 16 * s, 8 * s, { col: '#2B3048' });
    block(g, x0, y0, zb, w, d, h, { top: '#E4E7EE', left: '#AEB3C2', right: '#7E8496' });
    g.beginPath(); qL(g, x0 + 10 * s, y0 + d, zb + h * .4, w - 20 * s, 5 * s); qR(g, x0 + w, y0 + 10 * s, zb + h * .4, d - 20 * s, 5 * s); g.fillStyle = P.cyan; g.fill();
    const lz = zb + h + (o.lift || 0) * 28 * s;
    if (o.lift > 0) block(g, x - 9 * s, y - 9 * s, zb + h, 18 * s, 18 * s, lz - zb - h, { col: '#5A6078' });
    block(g, x0 + 16 * s, y0 + 14 * s, lz, w - 32 * s, d - 28 * s, 6 * s, { top: '#CDD1DB', left: '#9095A6', right: '#6C7184' });
    block(g, x0 + w - 24 * s, y0 + 8 * s, zb + h, 13 * s, 13 * s, 50 * s, { col: '#9AA0B2' });
    const hd = pt(x0 + w - 17.5 * s, y0 + 14.5 * s, zb + h + 56 * s);
    if ((o.beam || 0) > 0 && o.aim) { g.save(); g.globalCompositeOperation = 'lighter'; const [ax, ay] = o.aim, sp = (o.spread || 70) * V.s;
      const gr = g.createLinearGradient(hd[0], hd[1], ax, ay); gr.addColorStop(0, rgba(P.cyan, .32 * o.beam)); gr.addColorStop(1, rgba(P.cyan, .04 * o.beam));
      g.fillStyle = gr; g.beginPath(); g.moveTo(hd[0], hd[1]); g.lineTo(ax - sp * .5, ay - sp); g.lineTo(ax + sp * .5, ay + sp); g.closePath(); g.fill();
      g.strokeStyle = rgba(P.cyan, .8 * o.beam); g.lineWidth = 2; g.beginPath(); g.moveTo(ax - sp * .5, ay - sp); g.lineTo(ax + sp * .5, ay + sp); g.stroke(); g.restore(); }
    glow(g, hd[0], hd[1], 30 * s * V.s, P.cyan, .8); g.beginPath(); g.arc(hd[0], hd[1], 5 * s * V.s, 0, PI2); g.fillStyle = P.ice; g.fill();
  }
  function rack(g, x, y, z, len, dep, hgt, o = {}) { // стеллаж вдоль x: (x,y,z): дальний нижний угол; o.levels, o.cols, o.seed, o.grow 0…1 (растёт из пола)
    const gr = o.grow ?? 1; if (gr <= 0) return; const lv = o.levels || 3, nc = o.cols || Math.max(1, Math.round(len / 75)), cw_ = len / nc, H_ = hgt * gr, lh = H_ / lv, th = 5, sd = o.seed || 1;
    const fr = o.frame || '#3B4570', shades = [['#C9CBD3', '#A3A6B1', '#7D808C'], ['#B9BCC6', '#9295A2', '#6E717E'], [shade(P.kraft, .2), P.kraft, shade(P.kraft, -.3)]];
    g.beginPath(); qL(g, x, y, z, len, H_); g.fillStyle = '#131628'; g.fill();
    for (let i = 0; i < lv; i++) { const zz = z + i * lh;
      block(g, x, y, zz, len, dep, th, { top: '#2C3352', left: fr, right: '#2A3150' });
      for (let j = 0; j < nc; j++) { const hsh = hash(sd * 31.7 + i * 7.13 + j * 3.71); if (hsh < (o.gap ?? .2)) continue;
        const c = shades[hsh > .9 ? 2 : hsh > .55 ? 1 : 0], bw = cw_ * (.6 + hash(hsh * 9) * .2), bd = dep * .72, bh = Math.min(lh - th - 6, lh * (.5 + hash(hsh * 13) * .3));
        block(g, x + j * cw_ + (cw_ - bw) / 2, y + (dep - bd) * .5, zz + th, bw, bd, bh, { top: c[0], left: c[1], right: c[2] }); }
    }
    block(g, x, y, z + H_, len, dep, th, { top: '#343C5E', left: fr, right: '#2A3150' });
    g.beginPath(); for (let j = 0; j <= nc; j++) qL(g, x + Math.min(len - 6, Math.max(0, j * cw_ - 3)), y + dep, z, 6, H_ + th); g.fillStyle = fr; g.fill();
    g.beginPath(); qR(g, x + len, y, z, dep, H_ + th); g.fillStyle = '#20253D'; g.fill(); g.strokeStyle = fr; g.lineWidth = 2 * V.s; g.stroke();
  }
  function cells(g, x, y, z, nc, nr, cw_, ch_, o = {}) { // стена ячеек на плоскости +y («тысячи полок»): видимые ячейки через fillRect в плоскости грани
    const m = g.getTransform(), s = V.s, X0 = sx(x, y), Y0 = sy(x, y, z), au = (m.a * C30 + m.c * S30) * s, bz = -m.c * s, cu = (m.b * C30 + m.d * S30) * s, dz = -m.d * s;
    const det = au * dz - bz * cu, ex = m.a * X0 + m.c * Y0 + m.e, fy = m.b * X0 + m.d * Y0 + m.f; let u0 = 1e9, u1 = -1e9, z0 = 1e9, z1 = -1e9;
    [[-120, -120], [W + 120, -120], [-120, H + 120], [W + 120, H + 120]].forEach(([X, Y]) => { const dx = X - ex, dy = Y - fy, u = (dz * dx - bz * dy) / det, zz = (-cu * dx + au * dy) / det;
      u0 = Math.min(u0, u); u1 = Math.max(u1, u); z0 = Math.min(z0, zz); z1 = Math.max(z1, zz); });
    const c0 = Math.max(0, Math.floor(u0 / cw_)), c1 = Math.min(nc - 1, Math.ceil(u1 / cw_)), r0 = Math.max(0, Math.floor(z0 / ch_)), r1 = Math.min(nr - 1, Math.ceil(z1 / ch_)), HH = nr * ch_;
    if (c1 < c0 || r1 < r0) return;
    const cols = o.cols || ['#5E6379', '#4B5066', '#8A5E3E'], sd = o.seed || 0, it = (c, r) => { const hs = hash(c * 12.9 + r * 78.2 + sd); return [hs, cw_ * (.56 + hash(hs * 7) * .22), ch_ * (.42 + hash(hs * 5) * .26)]; };
    onFace(g, x, y, z + HH, 'left', q => {
      q.fillStyle = o.back || '#111426'; q.fillRect(c0 * cw_, HH - (r1 + 1) * ch_, (c1 - c0 + 1) * cw_, (r1 - r0 + 1) * ch_);
      for (let pass = 0; pass < 3; pass++) { q.fillStyle = cols[pass];
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const [hs, bw, bh] = it(c, r); if (hs < .1 || (hs > .86 ? 2 : hs > .48 ? 1 : 0) !== pass) continue; q.fillRect(c * cw_ + (cw_ - bw) / 2, HH - r * ch_ - 5 - bh, bw, bh); } }
      q.fillStyle = o.line || '#2C3456'; for (let r = r0; r <= r1 + 1; r++) q.fillRect(c0 * cw_, HH - r * ch_ - 2, (c1 - c0 + 1) * cw_, 4);
      for (let c = c0; c <= c1 + 1; c++) q.fillRect(c * cw_ - 2, HH - (r1 + 1) * ch_, 4, (r1 - r0 + 1) * ch_);
    });
    onFace(g, x, y, z, 'top', q => { q.fillStyle = o.lid || '#767C95';
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const [hs, bw, bh] = it(c, r); if (hs < .1) continue; const zt = r * ch_ + 5 + bh; q.fillRect(c * cw_ + (cw_ - bw) / 2 - zt, -14 - zt, bw, 14); } });
  }
  function belt(g, x, y, z, len, wid, lt, o = {}) { // конвейер вдоль x (o.axis 'y': вдоль y): тёмная лента, бегущие планки, голубые борта, розовые метки
    const ay = o.axis === 'y', sp = o.speed ?? 170, h = o.h ?? 18, gp = 36, off = ((lt * sp) % gp + gp) % gp, zt = z + h;
    if (!ay) block(g, x, y, z, len, wid, h, { top: '#262B49', left: '#1B1F37', right: '#15182B' }); else block(g, x, y, z, wid, len, h, { top: '#262B49', left: '#1B1F37', right: '#15182B' });
    g.beginPath();
    for (let u = off; u < len; u += gp) { if (!ay) { g.moveTo(sx(x + u, y + 5), sy(x + u, y + 5, zt)); g.lineTo(sx(x + u, y + wid - 5), sy(x + u, y + wid - 5, zt)); } else { g.moveTo(sx(x + 5, y + u), sy(x + 5, y + u, zt)); g.lineTo(sx(x + wid - 5, y + u), sy(x + wid - 5, y + u, zt)); } }
    g.strokeStyle = '#363D63'; g.lineWidth = 2.5 * V.s; g.stroke();
    g.beginPath(); if (!ay) { g.moveTo(sx(x, y), sy(x, y, zt)); g.lineTo(sx(x + len, y), sy(x + len, y, zt)); g.moveTo(sx(x, y + wid), sy(x, y + wid, zt)); g.lineTo(sx(x + len, y + wid), sy(x + len, y + wid, zt)); }
    else { g.moveTo(sx(x, y), sy(x, y, zt)); g.lineTo(sx(x, y + len), sy(x, y + len, zt)); g.moveTo(sx(x + wid, y), sy(x + wid, y, zt)); g.lineTo(sx(x + wid, y + len), sy(x + wid, y + len, zt)); }
    g.strokeStyle = P.cyanD; g.lineWidth = 2 * V.s; g.stroke();
    g.beginPath(); for (let u = (off * 2) % 72; u < len - 14; u += 72) { if (!ay) qL(g, x + u, y + wid, z + h * .35, 14, h * .3); else qR(g, x + wid, y + u, z + h * .35, 14, h * .3); }
    g.fillStyle = 'rgba(214,96,140,.75)'; g.fill();
  }
  function truck(g, x, y, z, s = 1, o = {}) { // грузовик (o.van: фургон) вдоль +x: (x,y,z): центр дна; o.lights 0…1 фары и конус света, o.lt, o.mark: посылка на борту
    const van = !!o.van, L = (van ? 220 : 300) * s, D = (van ? 92 : 100) * s, x0 = x - L / 2, y0 = y - D / 2, lt = o.lt ?? T, zc = z + 24 * s;
    const cl_ = van ? 150 * s : 205 * s, ch = van ? 96 * s : 120 * s, cabL = van ? 64 * s : 84 * s, cabH = van ? 66 * s : 90 * s, cx0 = x0 + cl_ + 6 * s, body = o.col || '#C3C7D3';
    shadow(g, x + 8 * s, y + 8 * s, z, L * .56, .36);
    if ((o.lights || 0) > 0) { const a = o.lights, f0 = pt(cx0 + cabL, y0 + D * .5, z), f1 = pt(cx0 + cabL + 520 * s, y0 + D * .5, z);
      const gr = g.createLinearGradient(f0[0], f0[1], f1[0], f1[1]); gr.addColorStop(0, rgba('#FFE2A6', .3 * a)); gr.addColorStop(1, rgba('#FFE2A6', 0));
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.beginPath(); g.moveTo(...pt(cx0 + cabL, y0 + 8 * s, z)); g.lineTo(...pt(cx0 + cabL + 520 * s, y0 - 110 * s, z)); g.lineTo(...pt(cx0 + cabL + 520 * s, y0 + D + 110 * s, z)); g.lineTo(...pt(cx0 + cabL, y0 + D - 8 * s, z)); g.closePath(); g.fill(); g.restore(); }
    block(g, x0 + 18 * s, y0 + 12 * s, z + 14 * s, L - 36 * s, D - 24 * s, 12 * s, { col: '#2A2E44' });
    block(g, x0, y0, zc, cl_, D, ch, { top: shade(body, .25), left: body, right: shade(body, -.3) });
    g.beginPath(); qL(g, x0 + 10 * s, y0 + D, zc + ch * .2, cl_ - 20 * s, 9 * s); g.fillStyle = P.cyan; g.fill();
    if (o.mark) onFace(g, x0 + cl_ * .5, y0 + D, zc + ch * .82, 'left', q => { const m = 46 * s; q.fillStyle = P.kraft; q.fillRect(-m / 2, 0, m, m * .8); q.fillStyle = P.tape; q.fillRect(-m / 2, m * .3, m, m * .16); });
    block(g, cx0, y0 + 4 * s, zc, cabL, D - 8 * s, cabH, { top: shade(body, .3), left: shade(body, -.06), right: shade(body, -.34) });
    g.beginPath(); qR(g, cx0 + cabL, y0 + 12 * s, zc + cabH * .5, D - 24 * s, cabH * .4); g.fillStyle = '#163049'; g.fill();
    g.beginPath(); qL(g, cx0 + cabL * .45, y0 + D - 4 * s, zc + cabH * .52, cabL * .45, cabH * .36); g.fillStyle = '#1C3A57'; g.fill();
    g.strokeStyle = rgba(P.ice, .55); g.lineWidth = 2 * V.s; g.beginPath(); g.moveTo(...pt(cx0 + cabL, y0 + D * .62, zc + cabH * .56)); g.lineTo(...pt(cx0 + cabL, y0 + D * .42, zc + cabH * .82)); g.stroke();
    const hl = [[y0 + 12 * s], [y0 + D - 30 * s]]; g.beginPath(); hl.forEach(([yy]) => qR(g, cx0 + cabL, yy, zc + 10 * s, 14 * s, 10 * s)); g.fillStyle = '#FFF1CF'; g.fill();
    if ((o.lights || 0) > 0) hl.forEach(([yy]) => { const c = pt(cx0 + cabL, yy + 7 * s, zc + 15 * s); glow(g, c[0], c[1], 42 * s * V.s, P.amber, .9 * o.lights); });
    const spin = lt * 9; (van ? [x0 + 40 * s, x0 + 170 * s] : [x0 + 44 * s, x0 + 100 * s, x0 + 252 * s]).forEach(wx => onFace(g, wx, y0 + D + 1, z + 22 * s, 'left', q => {
      q.beginPath(); q.arc(0, 0, 21 * s, 0, PI2); q.fillStyle = '#151827'; q.fill(); q.beginPath(); q.arc(0, 0, 9 * s, 0, PI2); q.fillStyle = '#6C7286'; q.fill();
      q.strokeStyle = '#2E3350'; q.lineWidth = 3 * s; q.beginPath(); q.moveTo(Math.cos(spin) * 9 * s, Math.sin(spin) * 9 * s); q.lineTo(-Math.cos(spin) * 9 * s, -Math.sin(spin) * 9 * s); q.stroke(); }));
  }
  function building(g, x, y, z, w, d, h, o = {}) { // дом квартала: тёмные грани, сетка окон (часть горит), кромка крыши
    if (h <= 1) return; block(g, x, y, z, w, d, h, { top: o.top || '#2C3252', left: o.left || '#20253F', right: o.right || '#181B31' });
    const sd = o.seed || 1, lit = o.lit ?? .3, gx = 24, gz = 26, ww = 11, wh = 13, nx = Math.floor((w - 10) / gx), ny = Math.floor((d - 10) / gx), nz = Math.floor((h - 16) / gz);
    for (let pass = 0; pass < 2; pass++) { g.beginPath(); let any = false;
      for (let k = 0; k < nz; k++) { const zz = z + 10 + k * gz;
        for (let i = 0; i < nx; i++) if ((hash(sd * 13.1 + i * 7.3 + k * 3.7) < lit) === !!pass) { qL(g, x + 5 + i * gx + (gx - ww) / 2, y + d, zz, ww, wh); any = true; }
        for (let j = 0; j < ny; j++) if ((hash(sd * 17.9 + j * 5.1 + k * 2.3 + 40) < lit) === !!pass) { qR(g, x + w, y + 5 + j * gx + (gx - ww) / 2, zz, ww, wh); any = true; } }
      if (any) { g.fillStyle = pass ? (o.win || 'rgba(246,182,90,.85)') : '#2A3052'; g.fill(); } }
    if (o.edge) { g.beginPath(); qTop(g, x, y, z + h, w, d); g.strokeStyle = o.edge; g.lineWidth = 2 * V.s; g.stroke(); }
  }
  function door(g, x, y, z, o = {}) { // дверь на фасаде-плоскости +y: (x,y,z): низ середины двери; коврик, наличник, номер, звонок (o.ring 0…1)
    const dw = 120, dh = 230, lt = o.lt ?? T;
    g.beginPath(); qTop(g, x - 78, y, z, 156, 78); g.fillStyle = '#2B3154'; g.fill(); g.beginPath(); for (let i = 1; i < 6; i++) { const yy = y + i * 13; g.moveTo(...pt(x - 70, yy, z)); g.lineTo(...pt(x + 70, yy, z)); } g.strokeStyle = '#363E66'; g.lineWidth = 2 * V.s; g.stroke();
    g.beginPath(); qL(g, x - dw / 2 - 14, y, z, dw + 28, dh + 14); g.fillStyle = '#3A4370'; g.fill();
    g.beginPath(); qL(g, x - dw / 2, y + .5, z, dw, dh); g.fillStyle = o.col || '#1F2A52'; g.fill();
    g.beginPath(); qL(g, x - dw / 2 + 14, y + 1, z + 24, dw - 28, 80); qL(g, x - dw / 2 + 14, y + 1, z + 120, dw - 28, 92); g.strokeStyle = '#33407A'; g.lineWidth = 3 * V.s; g.stroke();
    g.beginPath(); qL(g, x + dw / 2 - 22, y + 1.5, z + 104, 8, 26); g.fillStyle = P.ice; g.fill();
    onFace(g, x - 28, y + 1, z + dh + 62, 'left', q => { q.fillStyle = '#E7EAF2'; q.fillRect(0, -12, 56, 40); q.font = font(30, 800); q.fillStyle = P.ink; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(o.num || '17', 28, 8); });
    const b = pt(x + dw / 2 + 52, y + 1, z + 128), rg = o.ring || 0;
    onFace(g, x + dw / 2 + 52, y + 1, z + 128, 'left', q => { q.fillStyle = '#2F3760'; q.fillRect(-14, -20, 28, 40); q.beginPath(); q.arc(0, 0, 8, 0, PI2); q.fillStyle = rg > 0 ? mix(P.greyD, P.cyan, rg) : P.greyD; q.fill(); });
    if (rg > 0) glow(g, b[0], b[1], 60 * V.s, P.cyan, .8 * rg);
  }
  function lamp(g, x, y, z, h, o = {}) { // уличный фонарь: столб, плафон, пятно света на полу
    const col = o.col || P.amber, a = o.a ?? 1, b = pt(x, y, z), tp = pt(x, y, z + h), hd = pt(x, y + 46, z + h - 8);
    if (o.pool !== false) { const c = pt(x, y + (o.py ?? 90), z); glow(g, c[0], c[1], 170 * V.s, col, .2 * a, 98 * V.s); }
    g.strokeStyle = '#3A4166'; g.lineWidth = 5 * V.s; g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(tp[0], tp[1]); g.lineTo(hd[0], hd[1]); g.stroke();
    glow(g, hd[0], hd[1], 46 * V.s, col, .85 * a); g.beginPath(); g.arc(hd[0], hd[1], 5 * V.s, 0, PI2); g.fillStyle = '#FFF0CC'; g.fill();
  }

  // ---------- трекер-HUD ----------
  function hud(g, o = {}) { // вверху кадра (y 118…262): № слева, статус-капсула, таймер «ч мин» справа, линия этапов
    const a = o.a ?? 1; if (a <= 0) return; g.save(); g.globalAlpha *= cl(a * 1.6); g.translate(0, -(1 - eo(a)) * 26);
    label(g, o.id || '', 60, 142, 22, { col: P.grey, w: 600 }); label(g, o.tl || 'в пути', 1020, 142, 22, { col: P.grey, al: 'right' });
    if (o.status) pill(g, o.status, 60, 192, { col: o.col || P.cyan, size: 24, glow: o.flash || 0 });
    odoTime(g, o.min || 0, 1020, 212, 52, { al: 'right', col: o.tcol || P.white, ucol: P.grey });
    const n = o.n || 7, x0 = 72, x1 = 1008, y = 254, st = cl(o.stage ?? 0, 0, n - 1), X = i => lerp(x0, x1, i / (n - 1));
    g.lineCap = 'round'; g.lineWidth = 3; g.strokeStyle = P.mute; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
    g.strokeStyle = P.green; g.beginPath(); g.moveTo(x0, y); g.lineTo(X(st), y); g.stroke();
    for (let i = 0; i < n; i++) { const xi = X(i);
      if (i <= st - .02 || (o.done && i <= st + .02)) { g.beginPath(); g.arc(xi, y, 8, 0, PI2); g.fillStyle = P.green; g.fill(); }
      else if (i < st + .98) { ripple(g, xi, y, T, { r0: 8, r1: 26, per: 1.2, n: 2, lw: 2, col: P.cyan }); g.beginPath(); g.arc(xi, y, 9, 0, PI2); g.fillStyle = P.cyan; g.fill(); }
      else { g.beginPath(); g.arc(xi, y, 6.5, 0, PI2); g.fillStyle = P.bg; g.fill(); g.strokeStyle = P.greyD; g.lineWidth = 2.5; g.stroke(); } }
    g.restore();
  }

  return { W, H, P, F, SAFE: { x0: 60, x1: 1020, y0: 110, y1: 1690 }, C30, S30, V,
    cl, pr, lerp, eo, ei, eio, eb, spring, hash, rnd, kf, step, num, typed, stag, fall, shade, rgba, mix,
    begin, cuts, cam, shake, bg, finish, dim, scrim, stripes, scanline, glow,
    view, pt, floorPts, qTop, qL, qR, block, tile, grid, slab, isoEll, ring, pad, cyl, onFace, faceText,
    trace, along, pulses, arcPts, node, ripple, reticle, check, radial, dial, gauge, cursor, pin, barcode, laser, moon, dotMap,
    font, text, label, labelW, title, digits, odo, odoTime, rr, pill, card, stamp, callout, steps, pop, rise,
    shadow, beacon, parcel, robot, rack, cells, belt, truck, building, door, lamp, hud };
})();
