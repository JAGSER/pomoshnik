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
      g.font = font(size, o.w || 800); g.fillStyle = o.col || P.white; let r = cl(c.r || 0), dd = c.d;
      if (r >= .97) { dd = c.n; r = 0; } if (r < .03) r = 0; // без сшивки двух цифр: в покое одна цифра, у конца прокрутки уже следующая
      const w0 = cw(g, String(dd)); g.fillText(String(dd), cx + (dw - w0) / 2, y - r * lh); if (r > 0) g.fillText(String(c.n), cx + (dw - cw(g, String(c.n))) / 2, y - r * lh + lh); cx += dw;
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
  function building(g, x, y, z, w, d, h, o = {}) { // многоэтажка: сетка окон; o.col стены, o.lit доля горящих, o.off 0…1 доля погасших (гаснут по одному), o.floors этажей, o.grow 0…1 (растёт по этажам), o.win, o.edge, o.seed
    const nz0 = o.floors || Math.floor((h - 16) / 26), gz = o.floors ? (h - 16) / o.floors : 26, gr = o.grow ?? 1, nz = Math.floor(nz0 * cl(gr) + 1e-6), hh = gr >= 1 ? h : nz * gz + (nz ? 8 : 0);
    if (hh <= 1) return; const c = o.col;
    block(g, x, y, z, w, d, hh, c ? { col: c } : { top: o.top || '#2C3252', left: o.left || '#20253F', right: o.right || '#181B31' });
    winGrid(g, x, y, z, w, d, hh, o, 24, gz, 11, Math.min(gz * .5, 16), nz);
    if (o.edge) { g.beginPath(); qTop(g, x, y, z + hh, w, d); g.strokeStyle = o.edge; g.lineWidth = 2 * V.s; g.stroke(); }
  }
  function door(g, x, y, z, o = {}) { // дверь на фасаде-плоскости +y: (x,y,z): низ середины двери; коврик, наличник, номер, звонок (o.ring 0…1)
    const dw = 120, dh = 230, lt = o.lt ?? T;
    g.beginPath(); qTop(g, x - 78, y, z, 156, 78); g.fillStyle = '#2B3154'; g.fill(); g.beginPath(); for (let i = 1; i < 6; i++) { const yy = y + i * 13; g.moveTo(...pt(x - 70, yy, z)); g.lineTo(...pt(x + 70, yy, z)); } g.strokeStyle = '#363E66'; g.lineWidth = 2 * V.s; g.stroke();
    g.beginPath(); qL(g, x - dw / 2 - 14, y, z, dw + 28, dh + 14); g.fillStyle = '#3A4370'; g.fill();
    g.beginPath(); qL(g, x - dw / 2, y + .5, z, dw, dh); g.fillStyle = o.col || '#1F2A52'; g.fill();
    g.beginPath(); qL(g, x - dw / 2 + 14, y + 1, z + 24, dw - 28, 80); qL(g, x - dw / 2 + 14, y + 1, z + 120, dw - 28, 92); g.strokeStyle = '#33407A'; g.lineWidth = 3 * V.s; g.stroke();
    g.beginPath(); qL(g, x + dw / 2 - 22, y + 1.5, z + 104, 8, 26); g.fillStyle = P.ice; g.fill();
    if (o.num) onFace(g, x - 28, y + 1, z + dh + 62, 'left', q => { q.fillStyle = '#E7EAF2'; q.fillRect(0, -12, 56, 40); q.font = font(30, 800); q.fillStyle = P.ink; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(o.num || '', 28, 8); });
    const b = pt(x + dw / 2 + 52, y + 1, z + 128), rg = o.ring || 0;
    onFace(g, x + dw / 2 + 52, y + 1, z + 128, 'left', q => { q.fillStyle = '#2F3760'; q.fillRect(-14, -20, 28, 40); q.beginPath(); q.arc(0, 0, 8, 0, PI2); q.fillStyle = rg > 0 ? mix(P.greyD, P.cyan, rg) : P.greyD; q.fill(); });
    if (rg > 0) glow(g, b[0], b[1], 60 * V.s, P.cyan, .8 * rg);
  }
  function lamp(g, x, y, z, h, o = {}) { // уличный фонарь: столб, плафон, пятно света на полу
    const col = o.col || P.amber, a = o.on ?? o.a ?? 1, b = pt(x, y, z), tp = pt(x, y, z + h), hd = pt(x, y + 46, z + h - 8);
    if (o.pool !== false) { const c = pt(x, y + (o.py ?? 90), z); glow(g, c[0], c[1], 170 * V.s, col, .2 * a, 98 * V.s); }
    g.strokeStyle = '#3A4166'; g.lineWidth = 5 * V.s; g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(tp[0], tp[1]); g.lineTo(hd[0], hd[1]); g.stroke();
    glow(g, hd[0], hd[1], 46 * V.s, col, .85 * a); g.beginPath(); g.arc(hd[0], hd[1], 5 * V.s, 0, PI2); g.fillStyle = a > 0 ? mix('#5D6178', '#FFF0CC', cl(a)) : '#5D6178'; g.fill();
  }

  // ---------- типовые объекты (цвет каждого задаётся параметром) ----------
  // Ориентированные предметы (транспорт, животные): o.axis 'x' (смотрит/едет к +x, вправо-вниз) | 'y' (к +y, влево-вниз). u: вперёд, v: поперёк.
  function orient(g, x, y, ax) {
    const Y = ax === 'y', w = (u, v) => Y ? [x + v, y + u] : [x + u, y + v];
    return { Y, w, face: Y ? 'right' : 'left', front: Y ? 'left' : 'right', dir: Y ? -1 : 1,
      p: (u, v, z) => { const q = w(u, v); return pt(q[0], q[1], z); },
      box: (u, v, z, du, dv, h, o) => Y ? block(g, x + v, y + u, z, dv, du, h, o) : block(g, x + u, y + v, z, du, dv, h, o),
      side: (u, v, z, du, h) => Y ? qR(g, x + v, y + u, z, du, h) : qL(g, x + u, y + v, z, du, h), // путь на боковой плоскости v=const
      fr: (u, v, z, dv, h) => Y ? qL(g, x + v, y + u, z, dv, h) : qR(g, x + u, y + v, z, dv, h), // путь на передней плоскости u=const
      on: (u, v, z, fn, face) => { const q = w(u, v); onFace(g, q[0], q[1], z, face, fn); } };
  }
  function prism(g, pts, z, h, o = {}) { // призма из выпуклого многоугольника пола [[x,y],…] (ед. мира): видимые бока с освещением и верх
    const c = o.col || P.steel, n = pts.length; let A = 0;
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; A += a[0] * b[1] - b[0] * a[1]; }
    const sg = A > 0 ? 1 : -1;
    if (h > 0) for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], nx = (b[1] - a[1]) * sg, ny = -(b[0] - a[0]) * sg;
      if (nx + ny <= 1e-6) continue; const k = cl((ny - nx) / (Math.abs(nx) + Math.abs(ny)) * .5 + .5);
      g.beginPath(); g.moveTo(...pt(a[0], a[1], z)); g.lineTo(...pt(b[0], b[1], z)); g.lineTo(...pt(b[0], b[1], z + h)); g.lineTo(...pt(a[0], a[1], z + h)); g.closePath();
      g.fillStyle = mix(shade(c, -.3), c, k); g.fill(); }
    g.beginPath(); pts.forEach((p, i) => { const s = pt(p[0], p[1], z + h); i ? g.lineTo(s[0], s[1]) : g.moveTo(s[0], s[1]); }); g.closePath();
    g.fillStyle = o.top || shade(c, .24); g.fill();
    if (o.edge) { g.strokeStyle = o.edge; g.lineWidth = 2 * V.s; g.stroke(); }
  }
  const oct = (x, y, r, ry = r) => { const A = []; for (let i = 0; i < 8; i++) { const a = (i + .5) * PI / 4; A.push([x + Math.cos(a) * r, y + Math.sin(a) * ry]); } return A; };
  function frustum(g, x, y, z, w, d, h, ins, o = {}) { // усечённая пирамида (ins: отступ верха; ins ≥ половины стороны: пирамида)
    const c = o.col || P.steel, iw = Math.min(ins, w / 2), id = Math.min(ins, d / 2), zt = z + h;
    const B = [[x, y], [x + w, y], [x + w, y + d], [x, y + d]], T_ = [[x + iw, y + id], [x + w - iw, y + id], [x + w - iw, y + d - id], [x + iw, y + d - id]];
    const F = [[0, 1, shade(c, .12)], [3, 0, shade(c, .04)], [1, 2, shade(c, -.3)], [2, 3, c]]; // −y, −x, +x, +y
    for (const [i, j, col] of F) { g.beginPath(); g.moveTo(...pt(B[i][0], B[i][1], z)); g.lineTo(...pt(B[j][0], B[j][1], z)); g.lineTo(...pt(T_[j][0], T_[j][1], zt)); g.lineTo(...pt(T_[i][0], T_[i][1], zt)); g.closePath(); g.fillStyle = col; g.fill(); }
    if (iw < w / 2 && id < d / 2) { g.beginPath(); qTop(g, x + iw, y + id, zt, w - 2 * iw, d - 2 * id); g.fillStyle = o.top || shade(c, .24); g.fill(); }
  }
  function wheel(q, r, lt, s) { q.beginPath(); q.arc(0, 0, r, 0, PI2); q.fillStyle = '#151827'; q.fill(); q.beginPath(); q.arc(0, 0, r * .45, 0, PI2); q.fillStyle = '#8A90A6'; q.fill();
    const a = lt * 9; q.strokeStyle = '#2E3350'; q.lineWidth = 3 * s; q.beginPath(); q.moveTo(Math.cos(a) * r * .45, Math.sin(a) * r * .45); q.lineTo(-Math.cos(a) * r * .45, -Math.sin(a) * r * .45); q.stroke(); }
  const GLASS = '#1B3552';
  function car(g, x, y, z, s = 1, o = {}) { // легковая машина: (x,y,z) центр дна; o.col кузов, o.axis, o.lt (колёса), o.lights 0…1 фары
    const O = orient(g, x, y, o.axis), c = o.col || '#D8DCE6', L = 150 * s, D = 72 * s, lt = o.lt ?? T;
    shadow(g, x, y, z, L * .52, .34);
    O.box(-L / 2, -D / 2, z + 12 * s, L, D, 30 * s, { col: c });
    O.box(-L * .3, -D * .42, z + 42 * s, L * .52, D * .84, 25 * s, { col: shade(c, -.04) });
    g.beginPath(); O.side(-L * .26, D * .42, z + 46 * s, L * .2, 17 * s); O.side(-L * .02, D * .42, z + 46 * s, L * .2, 17 * s); O.fr(L * .22, -D * .36, z + 45 * s, D * .72, 19 * s); g.fillStyle = GLASS; g.fill();
    g.beginPath(); O.fr(L / 2, -D * .42, z + 26 * s, D * .2, 8 * s); O.fr(L / 2, D * .22, z + 26 * s, D * .2, 8 * s); g.fillStyle = '#FFF1CF'; g.fill();
    if ((o.lights || 0) > 0) [-.32, .32].forEach(v => { const p = O.p(L / 2, v * D, z + 30 * s); glow(g, p[0], p[1], 40 * s * V.s, P.amber, .9 * o.lights); });
    [-.3, .3].forEach(u => O.on(u * L, D / 2 + .5, z + 16 * s, q => wheel(q, 16 * s, lt, s), O.face));
  }
  function bus(g, x, y, z, s = 1, o = {}) { // автобус: (x,y,z) центр дна; o.col кузов (синий, жёлтый…), o.num номер маршрута на табло (только из текста), o.axis, o.lt, o.lights
    const O = orient(g, x, y, o.axis), c = o.col || '#2F6FD6', L = 300 * s, D = 96 * s, Hh = 116 * s, lt = o.lt ?? T, zb = z + 16 * s;
    shadow(g, x, y, z, L * .5, .36);
    O.box(-L / 2, -D / 2, zb, L, D, Hh, { col: c, top: shade(c, .38) });
    g.beginPath(); O.side(-L / 2 + 6 * s, D / 2, zb + 22 * s, L - 12 * s, 7 * s); g.fillStyle = shade(c, .45); g.fill();
    g.beginPath(); for (let i = 0; i < 5; i++) O.side(-L / 2 + 14 * s + i * 46 * s, D / 2, zb + 50 * s, 38 * s, 40 * s); O.fr(L / 2, -D * .42, zb + 44 * s, D * .84, 52 * s); g.fillStyle = GLASS; g.fill();
    g.beginPath(); O.side(L / 2 - 56 * s, D / 2, zb + 4 * s, 34 * s, 88 * s); g.fillStyle = '#16243A'; g.fill();
    g.strokeStyle = rgba(P.ice, .35); g.lineWidth = 2 * V.s; g.beginPath(); for (let i = 0; i < 5; i++) { const a = O.p(-L / 2 + 20 * s + i * 46 * s, D / 2, zb + 58 * s), b = O.p(-L / 2 + 34 * s + i * 46 * s, D / 2, zb + 84 * s); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke();
    g.beginPath(); O.fr(L / 2, -D * .44, zb + 12 * s, D * .2, 9 * s); O.fr(L / 2, D * .24, zb + 12 * s, D * .2, 9 * s); g.fillStyle = '#FFF1CF'; g.fill();
    if ((o.lights || 0) > 0) [-.34, .34].forEach(v => { const p = O.p(L / 2, v * D, zb + 16 * s); glow(g, p[0], p[1], 44 * s * V.s, P.amber, .9 * o.lights); });
    if (o.num != null && o.num !== '') O.on(L / 2, 0, zb + Hh - 18 * s, q => { const w = D * .66; q.fillStyle = '#0F1322'; q.fillRect(-w / 2, -11 * s, w, 22 * s);
      q.font = font(17 * s, 800); q.fillStyle = P.amber; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(String(o.num), 0, 1 * s); }, O.front);
    [-.33, .3].forEach(u => O.on(u * L, D / 2 + .5, z + 22 * s, q => wheel(q, 21 * s, lt, s), O.face));
  }
  function boat(g, x, y, z, s = 1, o = {}) { // лодка/катер на воде: (x,y,z) центр по ватерлинии; o.col корпус, o.cab рубка (false: без), o.deck, o.motor, o.wake 0…1 след, o.axis, o.lt (качается)
    const O = orient(g, x, y, o.axis), c = o.col || '#E8EBF2', L = 130 * s, D = 52 * s, lt = o.lt ?? T, zb = z + Math.sin(lt * 2.2 + (x + y) * .013) * 2 * s;
    if ((o.wake || 0) > 0) { g.save(); g.globalAlpha *= cl(o.wake); g.strokeStyle = rgba(P.white, .75); g.lineWidth = 3 * V.s; g.setLineDash([14 * V.s, 10 * V.s]); g.lineDashOffset = lt * 60;
      g.beginPath(); for (const sd of [-1, 1]) { const a = O.p(-L / 2, sd * D * .32, z), b = O.p(-L / 2 - 110 * s, sd * D * 1.1, z); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke(); g.restore(); }
    if (o.motor !== false) O.box(-L / 2 - 14 * s, -8 * s, zb - 4 * s, 14 * s, 16 * s, 34 * s, { col: '#2A2E44' });
    const hull = [[-L / 2, -D / 2], [L * .2, -D / 2], [L / 2, 0], [L * .2, D / 2], [-L / 2, D / 2]].map(p => O.w(p[0], p[1]));
    prism(g, hull, zb - 6 * s, 24 * s, { col: c, top: o.deck || '#B98A5E' });
    g.beginPath(); O.side(-L / 2 + 2 * s, D / 2, zb + 10 * s, L * .7 - 4 * s, 5 * s); g.fillStyle = o.trim || P.cyan; g.fill();
    if (o.cab !== false) { const cc = o.cab || P.white; O.box(-L * .22, -D * .3, zb + 18 * s, L * .26, D * .6, 24 * s, { col: cc }); g.beginPath(); O.fr(L * .04, -D * .26, zb + 28 * s, D * .52, 11 * s); g.fillStyle = GLASS; g.fill(); }
  }
  function bike(g, x, y, z, s = 1, o = {}) { // велосипед с человеком: (x,y,z) точка под седлом; o.col рама, o.look одежда (как у person), o.age, o.H рост (170), o.rider false: пустой, o.axis, o.lt, o.phase
    const O = orient(g, x, y, o.axis), lt = o.lt ?? T, H = (o.H || 170) * s, k = H / 170, col = o.col || P.cyan, ph = (lt * (o.speed ?? 1.3) + (o.phase || 0)) * PI2;
    const Q = (u, zz) => O.p(u * k, 0, z + zz * k), R = 29;
    for (const u of [-34, 72]) O.on(u * k, 0, z + R * k, q => { q.beginPath(); q.arc(0, 0, R * k, 0, PI2); q.strokeStyle = '#151827'; q.lineWidth = 6 * k; q.stroke();
      q.strokeStyle = '#4A5070'; q.lineWidth = 1.5 * k; q.beginPath(); for (let i = 0; i < 4; i++) { const a = ph * .5 + i * PI / 4; q.moveTo(Math.cos(a) * R * k, Math.sin(a) * R * k); q.lineTo(-Math.cos(a) * R * k, -Math.sin(a) * R * k); } q.stroke(); }, O.face);
    const rh = Q(-34, R), cr = Q(27, 34), st = Q(0, 85), hd = Q(55, 80), fh = Q(72, R), bar = Q(58, 112);
    g.strokeStyle = col; g.lineWidth = 4.5 * k * V.s; g.lineJoin = 'round'; g.beginPath(); g.moveTo(...rh); g.lineTo(...cr); g.lineTo(...st); g.lineTo(...rh); g.moveTo(...cr); g.lineTo(...hd); g.lineTo(...st); g.moveTo(...fh); g.lineTo(...hd); g.lineTo(...bar); g.stroke();
    g.strokeStyle = '#151827'; g.lineWidth = 5 * k * V.s; g.beginPath(); const s1 = Q(-8, 88), s2 = Q(10, 88); g.moveTo(...s1); g.lineTo(...s2); g.stroke();
    if (o.rider !== false) person(g, 'all', x, y, z, o.axis === 'y' ? PI / 2 : 0, H, lt, { pose: 'ride', look: o.look, age: o.age, phase: o.phase, speed: o.speed ?? 1.3 });
  }
  function animal(g, x, y, z, s, o, cat) {
    const O = orient(g, x, y, o.axis), lt = o.lt ?? T, c = o.col || (cat ? '#8E909D' : '#C77A3A'), pose = o.pose || 'stand', dk = shade(c, -.18);
    const L = (cat ? 48 : 64) * s, D = (cat ? 18 : 24) * s, lie = pose === 'sleep', sit = pose === 'sit', bh = (cat ? 18 : 24) * s * (lie ? .8 : 1), leg = lie ? 0 : (cat ? 18 : 24) * s;
    const ph = lt * (cat ? 6 : 7), wg = pose === 'walk' ? Math.sin(ph) * 6 * s : 0, zb = z + (sit ? 0 : leg);
    shadow(g, x, y, z, L * .55, .3);
    // хвост (сзади = дальше от зрителя)
    const tb = O.p(-L / 2 + 2 * s, 0, zb + bh * .75), wag = Math.sin(lt * (cat ? 2 : 10)) * (lie ? 0 : 8 * s);
    const te = lie ? O.p(-L * .2, D * .9, z + 3 * s) : cat ? O.p(-L / 2 - 10 * s, wag * .5, zb + bh + 30 * s) : O.p(-L / 2 - 16 * s, wag, zb + bh + 12 * s);
    const tc = lie ? O.p(-L / 2 - 14 * s, D * .6, z + 3 * s) : O.p(-L / 2 - 16 * s, 0, zb + bh * (cat ? .6 : 1));
    g.beginPath(); g.moveTo(...tb); g.quadraticCurveTo(tc[0], tc[1], te[0], te[1]); g.strokeStyle = dk; g.lineWidth = (cat ? 5 : 7) * s * V.s; g.lineCap = 'round'; g.stroke();
    if (leg && !sit) for (const [u, v] of [[-L / 2 + 3 * s, -D / 2], [L / 2 - 12 * s, -D / 2], [-L / 2 + 3 * s, D / 2 - 8 * s], [L / 2 - 12 * s, D / 2 - 8 * s]]) {
      const sw = (u > 0 ? 1 : -1) * (v > 0 ? 1 : -1) * wg; O.box(u + sw, v, z, 8 * s, 8 * s, leg, { col: dk }); }
    if (sit) { O.box(-L / 2, -D / 2, z, L * .55, D, bh * 1.1, { col: c }); for (const v of [-D / 2, D / 2 - 8 * s]) O.box(L * .1, v, z, 8 * s, 8 * s, leg, { col: dk });
      O.box(L * .02, -D / 2 + 2 * s, z + leg * .7, L * .3, D - 4 * s, bh * 1.2, { col: c }); }
    else O.box(-L / 2, -D / 2, zb, L, D, bh, { col: c });
    const hl = (cat ? 18 : 24) * s, hd = (cat ? 20 : 22) * s, hh = (cat ? 17 : 21) * s;
    const hu = sit ? L * .22 : L / 2 - 6 * s, hz = lie ? z : sit ? z + leg * .7 + bh * 1.2 - 4 * s : zb + bh * .55;
    O.box(hu, -hd / 2, hz, hl, hd, hh, { col: c });
    if (!cat) { O.box(hu + hl, -6 * s, hz + 2 * s, 10 * s, 12 * s, 10 * s, { col: shade(c, .18) }); g.beginPath(); O.fr(hu + hl + 10 * s, -3 * s, hz + 8 * s, 6 * s, 4 * s); g.fillStyle = '#151827'; g.fill();
      for (const v of [-hd / 2 - 3 * s, hd / 2]) O.box(hu + 7 * s, v, hz + hh - 14 * s, 9 * s, 3 * s, 14 * s, { col: dk }); }
    else for (const v of [-hd / 2 + 1 * s, hd / 2 - 8 * s]) { const q = O.w(hu + 5 * s, v); frustum(g, q[0], q[1], hz + hh, 7 * s, 7 * s, 9 * s, 9 * s, { col: dk }); }
    g.strokeStyle = '#151827'; g.fillStyle = '#151827'; g.lineWidth = 2 * s * V.s;
    for (const v of [-hd * .28, hd * .28]) { const e = O.p(hu + hl, v, hz + hh * .68); g.beginPath(); if (lie) { g.moveTo(e[0] - 3 * s * V.s, e[1]); g.lineTo(e[0] + 3 * s * V.s, e[1]); g.stroke(); } else { g.arc(e[0], e[1], 2.4 * s * V.s, 0, PI2); g.fill(); } }
    if (o.zzz) { const h0 = O.p(hu + hl / 2, 0, hz + hh + 10 * s); for (let i = 0; i < 3; i++) { const q = ((lt * .6 + i / 3) % 1); g.globalAlpha = Math.sin(q * PI);
      g.font = font((12 + q * 14) * s * V.s, 800); g.fillStyle = P.white; g.textAlign = 'center'; g.fillText('z', h0[0] + q * 26 * s * V.s, h0[1] - q * 60 * s * V.s); } g.globalAlpha = 1; }
  }
  function dog(g, x, y, z, s = 1, o = {}) { animal(g, x, y, z, s, o, false); } // собака: (x,y,z) центр дна; o.col (рыжий…), o.pose 'stand'|'walk'|'sit'|'sleep', o.zzz (спит), o.axis, o.lt
  function cat(g, x, y, z, s = 1, o = {}) { animal(g, x, y, z, s, o, true); } // кошка: те же параметры
  function bird(g, x, y, s = 1, o = {}) { // летящая птица (чайка, голубь) в px: машет крыльями; o.col, o.lt, o.ph фаза
    const lt = o.lt ?? T, f = Math.sin((lt * (o.rate || 2.6) + (o.ph || 0)) * PI2), w = 26 * s, up = f * 12 * s, c = o.col || P.white;
    g.beginPath(); g.moveTo(x - w, y - up); g.quadraticCurveTo(x - w * .45, y - 10 * s - up * .4, x, y); g.quadraticCurveTo(x + w * .45, y - 10 * s - up * .4, x + w, y - up);
    g.strokeStyle = c; g.lineWidth = 4.5 * s; g.lineCap = 'round'; g.stroke(); g.beginPath(); g.ellipse(x, y + s, 6 * s, 3.5 * s, 0, 0, PI2); g.fillStyle = c; g.fill();
  }
  function birds(g, cx, cy, r, lt, o = {}) { // стая кружит вокруг (cx,cy) по эллипсу r × 0.4r; o.n, o.s размер, o.col, o.speed
    const n = o.n || 5; for (let i = 0; i < n; i++) { const a = lt * (o.speed || .6) + i * PI2 / n + hash(i) * .7, rr_ = r * (.75 + .4 * hash(i + 3));
      bird(g, cx + Math.cos(a) * rr_, cy + Math.sin(a) * rr_ * .4 + (hash(i + 7) - .5) * r * .25, (o.s || 1) * (.85 + .25 * Math.sin(a)), { col: o.col, lt, ph: hash(i) }); }
  }
  function tree(g, x, y, z, s = 1, o = {}) { // дерево: (x,y,z) низ ствола; o.kind 'leaf' (лиственное, дуб, клён) | 'pine' (ель) | 'bush' (куст); o.col листва, o.trunk ствол, o.lt (крона колышется)
    const k = o.kind || 'leaf', c = o.col || (k === 'pine' ? '#2E8C6A' : '#3FA772'), tr = o.trunk || '#7A5236', lt = o.lt ?? T, sw = Math.sin(lt * 1.3 + x * .013 + y * .007) * 2 * s;
    shadow(g, x, y, z, (k === 'bush' ? 30 : 46) * s, .3);
    if (k === 'bush') { prism(g, oct(x, y, 30 * s), z, 24 * s, { col: c }); prism(g, oct(x + sw * .3, y, 19 * s), z + 24 * s, 12 * s, { col: shade(c, .08) }); return; }
    block(g, x - 7 * s, y - 7 * s, z, 14 * s, 14 * s, (k === 'pine' ? 26 : 48) * s, { col: tr });
    if (k === 'pine') { for (let i = 0; i < 3; i++) { const r = (42 - i * 11) * s; frustum(g, x - r + sw * i * .5, y - r, z + (20 + i * 30) * s, 2 * r, 2 * r, 46 * s, r * .93, { col: shade(c, i * .05) }); } return; }
    prism(g, oct(x, y, 46 * s), z + 40 * s, 44 * s, { col: c }); prism(g, oct(x + sw, y - 6 * s, 31 * s), z + 84 * s, 26 * s, { col: shade(c, .07) });
  }
  function grass(g, x, y, z, w, d, o = {}) { // трава на прямоугольнике пола: пучки штрихов; o.n, o.col, o.fill (подложка газона), o.seed, o.lt
    if (o.fill) tile(g, x, y, z, w, d, { fill: o.fill });
    const n = o.n || Math.round(w * d / 2600), R = rnd(o.seed || 7), lt = o.lt ?? T, k = V.s;
    g.beginPath(); for (let i = 0; i < n; i++) { const p = pt(x + R() * w, y + R() * d, z), hh = (8 + R() * 8) * k, sw = Math.sin(lt * 2 + i) * 2 * k;
      g.moveTo(p[0] - 4 * k, p[1]); g.lineTo(p[0] - 6 * k + sw, p[1] - hh * .8); g.moveTo(p[0], p[1]); g.lineTo(p[0] + sw, p[1] - hh); g.moveTo(p[0] + 4 * k, p[1]); g.lineTo(p[0] + 6 * k + sw, p[1] - hh * .75); }
    g.strokeStyle = o.col || '#4FBF7E'; g.lineWidth = 2.5 * k; g.stroke();
  }
  function leaves(g, x, y, z, w, d, lt, o = {}) { // листья на земле (шуршат) и падающие: o.n, o.cols, o.fall доля падающих, o.seed
    const n = o.n || 24, R = rnd(o.seed || 5), cols = o.cols || [P.orange, P.amber, '#D94A3A'];
    for (let i = 0; i < n; i++) { const fx = R(), fy = R(), fz = R(), sp = .3 + R() * .5, ci = cols[i % cols.length], fall = i < n * (o.fall ?? .3);
      const q = fall ? ((lt * sp + fz) % 1) : 0, zz = fall ? z + (1 - q) * 220 : z, p = pt(x + fx * w + (fall ? Math.sin(lt * 2 + i) * 16 : 0), y + fy * d, zz);
      const r = 7 * V.s, a = fall ? lt * 3 + i : i + Math.sin(lt * 4 + i) * .25;
      g.save(); g.translate(p[0], p[1]); g.rotate(a); g.scale(1, fall ? 1 : .55); g.beginPath();
      for (let j = 0; j < 10; j++) { const rr_ = j % 2 ? r * .45 : r, b = j * PI / 5 - PI / 2; j ? g.lineTo(Math.cos(b) * rr_, Math.sin(b) * rr_) : g.moveTo(Math.cos(b) * rr_, Math.sin(b) * rr_); }
      g.closePath(); g.fillStyle = ci; g.fill(); g.restore(); }
  }
  function winGrid(g, x, y, z, w, d, h, o, gx, gz, ww, wh, nz) { // окна на фасадах +y и +x (горят по o.lit, гаснут по o.off)
    const sd = o.seed || 1, lit = o.lit ?? .3, off = o.off || 0, nx = Math.floor((w - 10) / gx), ny = Math.floor((d - 10) / gx);
    const on = (a, b) => hash(a) < lit && !(hash(b) < off);
    for (let pass = 0; pass < 2; pass++) { g.beginPath(); let any = false;
      for (let k = 0; k < nz; k++) { const zz = z + 10 + k * gz;
        for (let i = 0; i < nx; i++) if (on(sd * 13.1 + i * 7.3 + k * 3.7, sd * 5.3 + i * 1.7 + k * 9.1) === !!pass) { qL(g, x + 5 + i * gx + (gx - ww) / 2, y + d, zz, ww, wh); any = true; }
        for (let j = 0; j < ny; j++) if (on(sd * 17.9 + j * 5.1 + k * 2.3 + 40, sd * 3.9 + j * 2.9 + k * 7.7 + 11) === !!pass) { qR(g, x + w, y + 5 + j * gx + (gx - ww) / 2, zz, ww, wh); any = true; } }
      if (any) { g.fillStyle = pass ? (o.win || 'rgba(246,182,90,.85)') : (o.dark || '#2A3052'); g.fill(); } }
  }
  function house(g, x, y, z, w, d, h, o = {}) { // жилой дом с двускатной крышей (конёк вдоль x): o.col стены, o.roof крыша, o.lit доля горящих окон, o.off гаснут, o.door цвет двери
    const c = o.col || '#D9CDB8', rc = o.roof || '#B5523B', rh = o.rh ?? d * .5, e = 8, zt = z + h + rh;
    block(g, x, y, z, w, d, h, { col: c });
    winGrid(g, x, y, z + h * .3 - 10, w, d, h, Object.assign({ dark: '#3B4A6A' }, o), 52, 1, 20, 24, 1);
    g.beginPath(); qL(g, x + w * .62, y + d, z, 24, 44); g.fillStyle = o.door || shade(c, -.5); g.fill();
    g.beginPath(); g.moveTo(...pt(x - e, y - e, z + h)); g.lineTo(...pt(x + w + e, y - e, z + h)); g.lineTo(...pt(x + w + e, y + d / 2, zt)); g.lineTo(...pt(x - e, y + d / 2, zt)); g.closePath(); g.fillStyle = shade(rc, .12); g.fill();
    g.beginPath(); g.moveTo(...pt(x + w, y, z + h)); g.lineTo(...pt(x + w, y + d, z + h)); g.lineTo(...pt(x + w, y + d / 2, zt)); g.closePath(); g.fillStyle = shade(c, -.3); g.fill();
    g.beginPath(); g.moveTo(...pt(x - e, y + d + e, z + h)); g.lineTo(...pt(x + w + e, y + d + e, z + h)); g.lineTo(...pt(x + w + e, y + d / 2, zt)); g.lineTo(...pt(x - e, y + d / 2, zt)); g.closePath(); g.fillStyle = rc; g.fill();
  }
  function shop(g, x, y, z, w, d, h, o = {}) { // магазин | кафе | школа: витрина, вход и вывеска на фасаде +y; o.kind 'shop'|'cafe'|'school', o.sign текст вывески (только из озвучки), o.col стены, o.awn маркиза, o.signCol, o.ink, o.lit
    const kind = o.kind || 'shop', c = o.col || (kind === 'school' ? '#C9874F' : '#3A4572'), awn = o.awn || (kind === 'cafe' ? P.orange : P.cyan), lt = o.lt ?? T;
    block(g, x, y, z, w, d, h, { col: c });
    if (kind === 'school') { winGrid(g, x, y, z + 6, w, d, h, Object.assign({ lit: o.lit ?? .15, dark: '#2E4466', seed: 3 }, o), 40, (h - 30) / 2, 22, 26, 2);
      g.beginPath(); qL(g, x + w / 2 - 22, y + d + .5, z, 44, 52); g.fillStyle = shade(c, -.5); g.fill();
      const f0 = pt(x + w * .85, y + d * .5, z + h), f1 = pt(x + w * .85, y + d * .5, z + h + 70); g.strokeStyle = '#8A90A6'; g.lineWidth = 3 * V.s; g.beginPath(); g.moveTo(...f0); g.lineTo(...f1); g.stroke();
      onFace(g, x + w * .85, y + d * .5, z + h + 70, 'left', q => { const wv = Math.sin(lt * 4) * 3; q.fillStyle = o.flag || P.red; q.beginPath(); q.moveTo(0, 0); q.lineTo(34, wv); q.lineTo(34, 20 + wv); q.lineTo(0, 20); q.fill(); }); }
    else { g.beginPath(); qL(g, x + 14, y + d + .5, z + 10, w * .55, h * .48); g.fillStyle = (o.lit ?? 0) > .5 ? 'rgba(246,182,90,.85)' : GLASS; g.fill();
      g.beginPath(); qL(g, x + w * .68, y + d + .5, z, 38, h * .58); g.fillStyle = shade(c, -.5); g.fill();
      g.beginPath(); qR(g, x + w, y + 14, z + 10, d * .5, h * .4); g.fillStyle = GLASS; g.fill();
      const n = Math.max(4, Math.round(w / 26)), z0 = z + h * .7, z1 = z + h * .56, dy = 30;
      for (let i = 0; i < n; i++) { const xa = x + 6 + (w - 12) * i / n, xb = x + 6 + (w - 12) * (i + 1) / n; g.beginPath(); g.moveTo(...pt(xa, y + d, z0)); g.lineTo(...pt(xb, y + d, z0)); g.lineTo(...pt(xb, y + d + dy, z1)); g.lineTo(...pt(xa, y + d + dy, z1)); g.closePath(); g.fillStyle = i % 2 ? P.white : awn; g.fill(); }
      if (kind === 'cafe' && o.tables !== false) for (const tx of [x + w * .25, x + w * .6]) { shadow(g, tx, y + d + 70, z, 18, .3); cyl(g, tx, y + d + 70, z + 26, 18, 4, { col: P.white }); block(g, tx - 2, y + d + 68, z, 4, 4, 26, { col: '#8A90A6' }); } }
    if (o.sign) { const sw = w * .74, sh = Math.min(h * .2, 44), zs = kind === 'school' ? z + 58 + sh : z + h - 6;
      g.beginPath(); qL(g, x + (w - sw) / 2, y + d + 1, zs - sh, sw, sh); g.fillStyle = o.signCol || '#0F1322'; g.fill();
      onFace(g, x + w / 2, y + d + 1.5, zs - sh / 2, 'left', q => { let fs = sh * .62; q.font = font(fs, 800); const tw = q.measureText(o.sign).width; if (tw > sw * .88) { fs *= sw * .88 / tw; q.font = font(fs, 800); }
        q.fillStyle = o.ink || P.white; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(o.sign, 0, 1); }); }
  }
  function stall(g, x, y, z, w, o = {}) { // прилавок рынка вдоль x: (x,y,z) дальний нижний угол, глубина 70; o.goods [{col, kind:'fruit'|'fish'|'box', n}], o.awn навес, o.col прилавок, o.tag текст ценника (из озвучки)
    const d = 70, c = o.col || P.kraft, awn = o.awn || P.orange, ph = 150, R = rnd(o.seed || 3);
    block(g, x, y, z, 6, 6, ph, { col: '#4A5070' }); block(g, x + w - 6, y, z, 6, 6, ph, { col: '#4A5070' });
    block(g, x + 4, y + 12, z, w - 8, d - 12, 58, { col: c });
    const goods = o.goods || [{ col: P.orange }]; goods.forEach((it, gi) => { const gx0 = x + 10 + (w - 20) * gi / goods.length, gw = (w - 20) / goods.length, n = it.n || 7;
      for (let i = 0; i < n; i++) { const px = gx0 + 8 + R() * (gw - 16), py = y + 20 + R() * (d - 30), pz = z + 58 + (i > 4 ? 8 : 0), p = pt(px, py, pz);
        if (it.kind === 'fish') { g.save(); g.translate(p[0], p[1] - 3); g.rotate(-.5 + R() * .3); g.beginPath(); g.ellipse(0, 0, 15 * V.s, 5.5 * V.s, 0, 0, PI2); g.moveTo(13 * V.s, 0); g.lineTo(22 * V.s, -6 * V.s); g.lineTo(22 * V.s, 6 * V.s); g.closePath(); g.fillStyle = it.col; g.fill(); g.beginPath(); g.arc(-9 * V.s, -1.5 * V.s, 1.6 * V.s, 0, PI2); g.fillStyle = '#151827'; g.fill(); g.restore(); }
        else if (it.kind === 'box') block(g, px - 9, py - 7, pz, 18, 14, 12, { col: it.col });
        else { g.beginPath(); g.arc(p[0], p[1] - 6 * V.s, 7.5 * V.s, 0, PI2); g.fillStyle = it.col; g.fill(); g.beginPath(); g.arc(p[0] - 2.5 * V.s, p[1] - 8.5 * V.s, 2.4 * V.s, 0, PI2); g.fillStyle = rgba(P.white, .35); g.fill(); } } });
    if (o.tag) onFace(g, x + w / 2, y + d + 1, z + 40, 'left', q => { q.font = font(17, 800); const tw = Math.max(60, q.measureText(o.tag).width + 20); q.fillStyle = '#F2F4FA'; q.fillRect(-tw / 2, -14, tw, 28); q.fillStyle = P.ink; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(o.tag, 0, 1); });
    block(g, x, y + d - 6, z, 6, 6, ph, { col: '#4A5070' }); block(g, x + w - 6, y + d - 6, z, 6, 6, ph, { col: '#4A5070' });
    const n = Math.max(3, Math.round(w / 28)); for (let i = 0; i < n; i++) { const xa = x - 8 + (w + 16) * i / n, xb = x - 8 + (w + 16) * (i + 1) / n;
      g.beginPath(); g.moveTo(...pt(xa, y - 8, z + ph + 14)); g.lineTo(...pt(xb, y - 8, z + ph + 14)); g.lineTo(...pt(xb, y + d + 14, z + ph - 4)); g.lineTo(...pt(xa, y + d + 14, z + ph - 4)); g.closePath(); g.fillStyle = i % 2 ? P.white : awn; g.fill(); }
  }
  function sun(g, x, y, r, o = {}) { // солнце в px: o.col (розовое, жёлтое, оранжевое…), o.a, o.rays 0…1 лучи
    const c = o.col || P.amber, a = o.a ?? 1, lt = o.lt ?? T; if (a <= 0) return; g.save(); g.globalAlpha *= a;
    glow(g, x, y, r * 3.4, c, .6);
    if (o.rays) { g.globalAlpha *= cl(o.rays) * .35; g.fillStyle = c; g.beginPath(); for (let i = 0; i < 12; i++) { const b = i * PI / 6 + lt * .12; g.moveTo(x + Math.cos(b - .05) * r * 1.2, y + Math.sin(b - .05) * r * 1.2); g.lineTo(x + Math.cos(b) * r * 2.1, y + Math.sin(b) * r * 2.1); g.lineTo(x + Math.cos(b + .05) * r * 1.2, y + Math.sin(b + .05) * r * 1.2); } g.fill(); g.globalAlpha /= cl(o.rays) * .35; }
    g.beginPath(); g.arc(x, y, r, 0, PI2); g.fillStyle = c; g.fill(); g.beginPath(); g.arc(x - r * .28, y - r * .28, r * .5, 0, PI2); g.fillStyle = 'rgba(255,255,255,.16)'; g.fill(); g.restore();
  }
  function stars(g, lt, o = {}) { // яркие звёзды в px: область o.x0 o.y0 o.x1 o.y1, o.n, o.on 0…1 (зажигаются по одной), o.col, o.seed
    const n = o.n || 36, R = rnd(o.seed || 11), on = o.on ?? 1, x0 = o.x0 ?? 40, x1 = o.x1 ?? W - 40, y0 = o.y0 ?? 300, y1 = o.y1 ?? 900, c = o.col || '#F4F1DA';
    for (let i = 0; i < n; i++) { const x = lerp(x0, x1, R()), y = lerp(y0, y1, R()), r = 2 + R() * 3.4, f = 1 + R() * 2, th = (i + .5) / n; if (th > on) continue;
      const a = cl(pr(on, th, th + 1.5 / n)) * (.6 + .4 * Math.sin(lt * f + i * 2.1)); g.globalAlpha = a; g.fillStyle = c;
      g.beginPath(); g.arc(x, y, r * .6, 0, PI2); g.fill(); if (r > 3.6) { g.beginPath(); g.moveTo(x - r * 2.2, y); g.lineTo(x, y - r * .3); g.lineTo(x + r * 2.2, y); g.lineTo(x, y + r * .3); g.moveTo(x, y - r * 2.2); g.lineTo(x + r * .3, y); g.lineTo(x, y + r * 2.2); g.lineTo(x - r * .3, y); g.fill(); } }
    g.globalAlpha = 1;
  }
  function cloud(g, x, y, s = 1, o = {}) { // облако в px: (x,y) середина низа; o.col, o.a
    const c = o.col || '#C9D3EC', key = 'cl' + c; if (!RC[key]) { const [cv, m] = mk(260, 120); const blob = (dy, col) => { m.fillStyle = col; m.beginPath(); m.arc(80, 78 + dy, 36, 0, PI2); m.arc(130, 60 + dy, 48, 0, PI2); m.arc(182, 80 + dy, 32, 0, PI2); m.rect(60, 80 + dy, 140, 30); m.fill(); };
      blob(6, shade(c, -.3)); blob(0, c); m.fillStyle = 'rgba(255,255,255,.25)'; m.beginPath(); m.arc(118, 46, 26, 0, PI2); m.fill(); RC[key] = cv; }
    g.save(); g.globalAlpha *= o.a ?? 1; g.drawImage(RC[key], x - 130 * s, y - 116 * s, 260 * s, 120 * s); g.restore();
  }
  function sea(g, x, y, z, w, d, lt, o = {}) { // вода, море, река: плоскость с бегущими штрихами волн; o.col, o.wave цвет штрихов, o.n, o.edge кромка, o.seed
    tile(g, x, y, z, w, d, { fill: o.col || '#1D3F78', stroke: o.edge });
    const n = o.n || Math.round(w * d / 7000), R = rnd(o.seed || 9), L = 34;
    g.beginPath(); for (let i = 0; i < n; i++) { const fx = R(), fy = R(), sp = 8 + R() * 10, u = x + ((fx * (w - L) + lt * sp) % (w - L)), v = y + fy * d;
      const a = pt(u, v, z), b = pt(u + L, v, z); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
    g.strokeStyle = o.wave || 'rgba(166,236,251,.32)'; g.lineWidth = 3 * V.s; g.stroke();
  }
  function hill(g, x, y, z, w, d, h, o = {}) { frustum(g, x, y, z, w, d, h, Math.min(w, d) * (o.ins ?? .4), { col: o.col || '#2F7F5E' }); } // холм: усечённая пирамида, o.col
  function garland(g, a, b, lt, o = {}) { // гирлянда-провис между точками экрана a=[x,y] и b: o.n лампочек, o.on 0…1 (загораются по очереди от a), o.cols, o.sag
    const n = o.n || 12, sag = o.sag ?? 60, on = o.on ?? 1, cols = o.cols || [P.amber, '#FF8FA3', P.cyan, '#9BE38B'], cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2 + sag * 2;
    g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(cx, cy, b[0], b[1]); g.strokeStyle = '#4A5070'; g.lineWidth = 2; g.stroke();
    for (let i = 0; i < n; i++) { const t = (i + .5) / n, m = 1 - t, px = m * m * a[0] + 2 * m * t * cx + t * t * b[0], py = m * m * a[1] + 2 * m * t * cy + t * t * b[1] + 5, c = cols[i % cols.length], k = cl(on * n - i);
      if (k > 0) glow(g, px, py, 22, c, .75 * k * (.85 + .15 * Math.sin(lt * 5 + i))); g.beginPath(); g.arc(px, py, 5, 0, PI2); g.fillStyle = k > 0 ? mix('#3A4062', c, k) : '#3A4062'; g.fill(); }
  }
  function board(g, x, y, z, w, h, lines, o = {}) { // доска/табличка с текстом на стойке, лицом к зрителю: (x,y,z) низ середины; lines ['строка' | ['слева','справа']] только из озвучки; o.face 'left'(+y)|'right'(+x), o.legs высота ножек, o.bg, o.ink, o.frame, o.size, o.n видно строк, o.title заголовок
    const face = o.face || 'left', lg = o.legs ?? 60, bg = o.bg || '#24433A', fr = o.frame || P.kraft, ink = o.ink || '#EEF2F0', rows = (o.title ? 1 : 0) + lines.length, lh = (h - 28) / Math.max(1, rows), sz = o.size || lh * .56, nv = o.n ?? lines.length;
    const R_ = face === 'right';
    for (const f of [-.36, .36]) R_ ? block(g, x - 4, y + f * w - 4, z, 8, 8, lg + 10, { col: shade(fr, -.2) }) : block(g, x + f * w - 4, y - 4, z, 8, 8, lg + 10, { col: shade(fr, -.2) });
    R_ ? block(g, x - 5, y - w / 2, z + lg, 5, w, h, { col: fr }) : block(g, x - w / 2, y - 5, z + lg, w, 5, h, { col: fr });
    onFace(g, R_ ? x + .5 : x - w / 2, R_ ? y + w / 2 : y + .5, z + lg + h, face, q => { q.fillStyle = bg; q.fillRect(8, 8, w - 16, h - 16); q.textBaseline = 'middle'; q.fillStyle = ink; let r = 0;
      const fit = (s, mw, fs) => { q.font = font(fs, 700); const tw = q.measureText(s).width; if (tw > mw) q.font = font(fs * mw / tw, 700); };
      if (o.title) { fit(o.title, w - 40, sz * .8); q.textAlign = 'center'; q.fillText(o.title, w / 2, 14 + lh * .5); r++; }
      lines.forEach((ln, i) => { if (i >= nv) return; const yy = 14 + lh * (r + i + .5);
        if (Array.isArray(ln)) { fit(ln[0], w * .55, sz); q.textAlign = 'left'; q.fillText(ln[0], 22, yy); fit(ln[1], w * .4, sz); q.textAlign = 'right'; q.fillText(ln[1], w - 22, yy); }
        else { fit(ln, w - 40, sz); q.textAlign = 'center'; q.fillText(ln, w / 2, yy); } }); });
  }
  const LOOKS = [{ coat: '#E8644A', pants: '#2E3550', hair: '#2B1E18' }, { coat: '#3D8BD9', pants: '#3A3F5C', hair: '#5A3A22' }, { coat: '#F2C14E', pants: '#4A4F6E', hair: '#1E1A18' },
    { coat: '#2FB58C', pants: '#30364F', hair: '#8A5A30' }, { coat: '#B05AC8', pants: '#2A2F45', hair: '#3A2A22' }, { coat: '#F0F2F7', pants: '#5A6080', hair: '#C9A06A' },
    { coat: '#E7487A', pants: '#30364F', hair: '#2B1E18' }, { coat: '#7FD0E8', pants: '#454B6B', hair: '#6B4A2E' }];
  function people(g, list, lt) { // несколько людей с сортировкой по глубине: [{x,y,z,ang,H,pose,age,look (объект или № из ISO.LOOKS),…}]
    const A = list.slice().sort((a, b) => (a.x + a.y) - (b.x + b.y));
    for (const p of A) person(g, 'all', p.x, p.y, p.z || 0, p.ang ?? PI / 4, p.H || (p.age === 'child' ? 115 : 175), lt, Object.assign({}, p, { look: typeof p.look === 'number' ? LOOKS[p.look % LOOKS.length] : p.look }));
  }

  // ---------- трекер-HUD ----------
  function hud(g, o = {}) { // вверху кадра (y 118…262): № слева, статус-капсула, таймер «ч мин» справа, линия этапов
    const a = o.a ?? 1; if (a <= 0) return; g.save(); g.globalAlpha *= cl(a * 1.6); g.translate(0, -(1 - eo(a)) * 26);
    label(g, o.id || '', 60, 142, 22, { col: P.grey, w: 600 }); if (o.tl) label(g, o.tl, 1020, 142, 22, { col: P.grey, al: 'right' });
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
    shadow, beacon, parcel, robot, rack, cells, belt, truck, building, door, lamp, hud,
    orient, prism, frustum, car, bus, boat, bike, dog, cat, bird, birds, tree, grass, leaves, house, shop, stall, sun, stars, cloud, sea, hill, garland, board, LOOKS, people };
})();

// ===== Модуль человека (person): внутренние имена закрыты, наружу только person =====
const person = (() => {
// ===== ЧЕЛОВЕК С СУСТАВАМИ: person(g, pass, x, y, z, ang, H, lt, o) =====
// Пропорции в долях роста H, руки по IK к цели. Если рука не достаёт до цели больше чем на 0.02 H, бросает ошибку (проверка).
const CL = { head: .13, hat: .07, shW: .27, torso: .31, pelvis: .07, upper: .17, fore: .15, hand: .07, thigh: .23, shin: .22 };
const CC = { coat: '#E8EBF2', pants: '#353B5C', skin: '#D99A72', shoe: '#1C2034', hat: '#F6F8FC', apron: '#C3CCDD', hair: '#3A2A22' };
const vA = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], vS = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vM = (a, k) => [a[0] * k, a[1] * k, a[2] * k], vD = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vL = a => Math.hypot(a[0], a[1], a[2]), vN = a => vM(a, 1 / (vL(a) || 1));
const vX = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const HIPZ = CL.shin + CL.thigh + .03, WAISTZ = HIPZ + CL.pelvis;

// поза в локальных координатах (x вперёд, y вбок, z вверх, всё в долях H)
// o.pose: 'idle' | 'walk' | 'run' | 'wave' | 'dance' | 'sit' (o.sz высота сиденья) | 'ride' (велосипед) | 'hold' | 'reach' | 'rest' | 'knead'; o.age 'child' | 'old'; o.speed, o.phase
function ik2(A, Tg, l1, l2, pole) { // двузвенник: → [сустав, конец, недолёт]
  const D = vS(Tg, A), u = vN(D), d = Math.min(vL(D), l1 + l2 - 1e-3);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)), p = vN(vS(pole, vM(u, vD(pole, u))));
  return [vA(vA(A, vM(u, a)), vM(p, h)), vA(A, vM(u, d)), vL(D) - d];
}
function chefPose(lt, o) {
  const PI = Math.PI, pose = o.pose || 'idle', old = o.age === 'old', hk = o.age === 'child' ? 1.3 : 1;
  const sp = o.speed ?? (pose === 'run' ? 1.6 : old ? .8 : 1.05), ph = (lt * sp + (o.phase || 0)) * PI * 2;
  const s = pose === 'knead' ? Math.sin(PI * 2 * 1.2 * lt) : 0;
  let leanDeg = pose === 'knead' ? 12 + 3 * s : pose === 'rest' ? 7 : pose === 'reach' ? (o.lean ?? 0) : pose === 'run' ? 13 : pose === 'walk' ? 4 : pose === 'ride' ? 20 : pose === 'sit' ? 3 : pose === 'dance' ? 3 : 2 + .6 * Math.sin(lt * 1.7);
  if (old && pose !== 'reach' && pose !== 'knead' && pose !== 'rest') leanDeg += 9;
  const ln = leanDeg * PI / 180, ax = [Math.sin(ln), 0, Math.cos(ln)];
  const sway = pose === 'idle' ? .008 * Math.sin(lt * 1.7) : pose === 'dance' ? .03 * Math.sin(ph) : 0;
  const LG = {}; let hipz = HIPZ + sway * .5;
  if (pose === 'walk' || pose === 'run' || pose === 'dance') { let mn = 1;
    for (const sd of [-1, 1]) { const q = ph + (sd > 0 ? 0 : PI); let th, be;
      if (pose === 'dance') { const up = Math.max(0, Math.sin(q)); th = .55 * up; be = 1.15 * up; }
      else { th = (pose === 'run' ? .62 : .38) * Math.sin(q); be = (pose === 'run' ? 1.3 : .55) * Math.max(0, Math.cos(q)); }
      const kn = [Math.sin(th) * CL.thigh, 0, -Math.cos(th) * CL.thigh], an = vA(kn, [Math.sin(th - be) * CL.shin, 0, -Math.cos(th - be) * CL.shin]);
      LG[sd] = [kn, an]; mn = Math.min(mn, an[2]); }
    hipz = .03 - mn;
    for (const sd of [-1, 1]) { const hip = [0, sd * .065, hipz]; LG[sd] = { hip, knee: vA(hip, LG[sd][0]), ank: vA(hip, LG[sd][1]) }; } }
  else if (pose === 'sit') { hipz = o.sz ?? .26;
    for (const sd of [-1, 1]) { const hip = [0, sd * .065, hipz], knee = [CL.thigh, sd * .075, hipz], dz = hipz - .03, dx = dz >= CL.shin ? 0 : Math.sqrt(CL.shin * CL.shin - dz * dz);
      LG[sd] = { hip, knee, ank: [CL.thigh + dx, sd * .075, dz >= CL.shin ? hipz - CL.shin : .03] }; } }
  else if (pose === 'ride') { hipz = o.sz ?? .5;
    for (const sd of [-1, 1]) { const hip = [0, sd * .065, hipz], f = ph + (sd > 0 ? 0 : PI), pd = [.16 + .06 * Math.cos(f), sd * .09, .2 + .06 * Math.sin(f)], r = ik2(hip, pd, CL.thigh, CL.shin, [1, 0, .4]);
      LG[sd] = { hip, knee: r[0], ank: r[1] }; } }
  else for (const sd of [-1, 1]) { const hip = [0, sd * .065, hipz], knee = vA(hip, vM(vN([.05, 0, -1]), CL.thigh)); LG[sd] = { hip, knee, ank: vA(knee, vM(vN([-.05, 0, -1]), CL.shin)) }; }
  const waist = [0, sway, hipz + CL.pelvis], drop = WAISTZ - waist[2], neck = vA(waist, vM(ax, CL.torso)), crown = vA(neck, vM(ax, CL.head * hk)), top = vA(crown, vM(ax, CL.hat));
  const J = { waist, neck, crown, top, arms: {}, legs: LG, ax, hipz, hk };
  for (const sd of [-1, 1]) {
    const sh = vA(vA(waist, vM(ax, CL.torso - .025)), [0, sd * CL.shW / 2, 0]);
    let tg, pole, hd = null;
    if (pose === 'knead') { tg = [o.tx + .035 * s, sd * .065, o.tz + .01 - .01 * (.5 + .5 * s)]; pole = [-.5, sd * .9, .25]; }
    else if (pose === 'rest') { tg = [o.tx, sd * .12, o.tz + .01]; pole = [-.4, sd * 1, .1]; }
    else if (pose === 'reach' && (!o.hand || o.hand === sd)) { tg = [o.t[0], o.t[1] + (o.hand ? 0 : sd * .08), o.t[2]]; pole = [-.3, sd * 1, -.4]; hd = 'dir'; }
    else if (pose === 'hold' || (o.hold && pose !== 'ride')) { tg = [.2, sd * .07, .62 - drop]; pole = [-.3, sd * 1, -.5]; }
    else if (pose === 'wave' && (o.hand || 1) === sd) { tg = [sh[0] + .05, sd * (.16 + .06 * Math.sin(lt * 9)), sh[2] + .26]; pole = [.3, sd, -.5]; hd = 'dir'; }
    else if (pose === 'dance') { const q = ph + (sd > 0 ? 0 : PI); tg = [sh[0] + .08, sd * .2, sh[2] + .1 + .1 * Math.sin(q)]; pole = [.2, sd, -.6]; hd = 'dir'; }
    else if (pose === 'walk' || pose === 'run') { const q = ph + (sd > 0 ? PI : 0), A = pose === 'run' ? .8 : .45, L = pose === 'run' ? .22 : .29, a = A * Math.sin(q);
      tg = [sh[0] + Math.sin(a) * L + (pose === 'run' ? .08 : 0), sd * (CL.shW / 2 + .03), sh[2] - Math.cos(a) * L]; pole = [-1, sd * .3, 0]; hd = 'dir'; }
    else if (pose === 'sit') { tg = [.1, sd * .1, hipz + .08]; pole = [.3, sd, 0]; }
    else if (pose === 'ride') { tg = [.34, sd * .13, .7]; pole = [-.3, sd, -.3]; }
    else { tg = [sh[0] + .02, sd * (CL.shW / 2 + .035), sh[2] - CL.upper - CL.fore + .015]; pole = [.6, sd * .25, 0]; hd = 'down'; }
    const [el, wr, miss] = ik2(sh, tg, CL.upper, CL.fore, pole);
    const dir = hd === 'down' || (pose === 'reach' && o.hand && o.hand !== sd) || (pose === 'wave' && (o.hand || 1) !== sd) ? [0, 0, -1] : hd === 'dir' ? vN(vS(tg, sh)) : vN([1, 0, -1.1]);
    J.arms[sd] = { sh, el, wr, tip: vA(wr, vM(dir, CL.hand)), miss };
    if (miss > .02) throw new Error('person: рука не достаёт до цели на ' + miss.toFixed(3) + ' H (поза ' + pose + '). Подвинь человека ближе или цель ниже.');
  }
  return J;
}
// призма вдоль A→B (мировые единицы), сечение w×d, три тона по нормали к взгляду (1,1,1)
function ch_box(g, A, B, w, d, col, ext, ref, caps = true) {
  const a = vN(vS(B, A)), e1 = vN(vS(ref, vM(a, vD(ref, a)))), e2 = vX(a, e1);
  const A2 = vS(A, vM(a, ext)), B2 = vA(B, vM(a, ext));
  const c = (i, j, k) => ISO.pt(...vA(vA(k ? B2 : A2, vM(e1, i * w / 2)), vM(e2, j * d / 2)));
  const F = [];
  for (const s of [-1, 1]) { const k = s > 0 ? 1 : 0;
    F.push([vM(e1, s), [[s, -1, 0], [s, 1, 0], [s, 1, 1], [s, -1, 1]]], [vM(e2, s), [[-1, s, 0], [1, s, 0], [1, s, 1], [-1, s, 1]]],
      ...(caps ? [[vM(a, s), [[-1, -1, k], [1, -1, k], [1, 1, k], [-1, 1, k]]]] : [])); }
  for (const [n, f] of F) { if (n[0] + n[1] + n[2] <= 1e-3) continue;
    g.beginPath(); f.forEach((v, i) => { const p = c(...v); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.closePath();
    g.fillStyle = n[2] > .55 ? ISO.shade(col, .22) : n[1] >= n[0] ? col : ISO.shade(col, -.28); g.fill();
    g.strokeStyle = 'rgba(8,10,20,.3)'; g.lineWidth = 1; g.stroke(); }
}
// pass: 'low' (тень, ноги, таз), 'up' (корпус, голова, руки), 'all'. ang: куда смотрит (0 = +x, PI/4 = к зрителю)
// o.look: { coat, pants, skin, hair, shoe, hat: 'none'|'cap'|'chef'|'helmet'|'scarf', hatCol, apron, apronCol, bag (цвет рюкзака), dress (юбка цвета coat) }
function person(g, pass, x, y, z, ang, H, lt, o = {}) {
  const L0 = o.look || {}, hat = L0.hat || 'none', apron = !!L0.apron;
  const C = Object.assign({}, CC); if (o.age === 'old') C.hair = '#D5D9E2'; for (const k of ['coat', 'pants', 'skin', 'hair', 'shoe']) if (typeof L0[k] === 'string') C[k] = L0[k];
  if (typeof L0.hatCol === 'string') C.hat = L0.hatCol; else if (hat === 'helmet') C.hat = '#F2C14E'; else if (hat === 'scarf') C.hat = '#C84B6B';
  if (typeof L0.apronCol === 'string') C.apron = L0.apronCol;
  const J = chefPose(lt, o), ca = Math.cos(ang), sa = Math.sin(ang), hk = J.hk;
  const W = v => [x + (v[0] * ca - v[1] * sa) * H, y + (v[0] * sa + v[1] * ca) * H, z + v[2] * H];
  const side = W([0, 1, 0]), ref = vN(vS(side, W([0, 0, 0])));
  const near = v => { const p = W(v); return p[0] + p[1]; };
  const ord = near([0, -1, 0]) < near([0, 1, 0]) ? [-1, 1] : [1, -1]; // дальняя сторона первой
  const backFar = near([-1, 0, 0]) < near([1, 0, 0]);
  const A = (p, k) => vA(J.crown, vM(J.ax, k)), sitting = o.pose === 'sit' || o.pose === 'ride';
  if (pass !== 'up') {
    ISO.shadow(g, x, y, z, .17 * H, .42);
    for (const sd of ord) { const L = J.legs[sd];
      ch_box(g, W(L.hip), W(L.knee), .09 * H, .095 * H, C.pants, .01 * H, ref, false);
      ch_box(g, W(L.knee), W(L.ank), .075 * H, .08 * H, C.pants, .01 * H, ref, false);
      ch_box(g, W(vA(L.ank, [-.03, 0, -.01])), W(vA(L.ank, [.1, 0, -.01])), .07 * H, .04 * H, C.shoe, 0, ref); }
    ch_box(g, W([0, J.waist[1], J.hipz - .01]), W(J.waist), .2 * H, .14 * H, C.pants, 0, ref);
    if (L0.dress) { if (sitting) ch_box(g, W([-.04, J.waist[1], J.hipz + .02]), W([.2, J.waist[1], J.hipz + .02]), .25 * H, .07 * H, C.coat, 0, ref);
      else ch_box(g, W([0, J.waist[1], J.hipz - .17]), W(J.waist), .26 * H, .2 * H, C.coat, 0, ref); }
  }
  if (pass !== 'low') {
    const arm = A_ => { ch_box(g, W(A_.sh), W(A_.el), .072 * H, .072 * H, C.coat, .02 * H, ref, false);
      ch_box(g, W(A_.el), W(A_.wr), .058 * H, .058 * H, C.skin, .012 * H, ref, false);
      ch_box(g, W(A_.wr), W(A_.tip), .052 * H, .026 * H, ISO.shade(C.skin, -.06), .006 * H, ref); };
    const bag = () => { if (typeof L0.bag === 'string') ch_box(g, W(vA(vA(J.waist, vM(J.ax, .07)), [-.11, 0, 0])), W(vA(vA(J.waist, vM(J.ax, .27)), [-.11, 0, 0])), .2 * H, .08 * H, L0.bag, 0, ref); };
    if (backFar) bag();
    arm(J.arms[ord[0]]);
    ch_box(g, W(J.waist), W(J.neck), CL.shW * H, .15 * H, C.coat, 0, ref);
    if (!backFar) bag();
    if (apron) ch_box(g, W(vA(J.waist, [.076, 0, 0])), W(vA(J.waist, vA(vM(J.ax, CL.torso * .62), [.076, 0, 0]))), .17 * H, .006 * H, C.apron, 0, ref);
    ch_box(g, W(J.neck), W(J.crown), .11 * H * hk, .12 * H * hk, C.skin, 0, ref);
    if (hat === 'chef') ch_box(g, W(J.crown), W(J.top), .13 * H, .13 * H, C.hat, .004 * H, ref);
    else if (hat === 'cap') ch_box(g, W(J.crown), W(A(0, .03)), .125 * H * hk, .13 * H * hk, C.hat, .004 * H, ref);
    else if (hat === 'helmet') { ch_box(g, W(A(0, -.03)), W(A(0, -.018)), .17 * H * hk, .17 * H * hk, C.hat, 0, ref); ch_box(g, W(A(0, -.02)), W(A(0, .035)), .135 * H * hk, .145 * H * hk, C.hat, 0, ref); }
    else if (hat === 'scarf') ch_box(g, W(A(0, -.065 * hk)), W(A(0, .02)), .124 * H * hk, .135 * H * hk, C.hat, 0, ref);
    else ch_box(g, W(A(0, -.03 * hk)), W(A(0, .015)), .118 * H * hk, .128 * H * hk, C.hair, .002 * H, ref);
    arm(J.arms[ord[1]]);
  }
  return J;
}

return person;
})();
