// «Морфинг» — библиотека стиля «одна форма, без склеек» (UI-моушн уровня Dribbble) для роликов draw(t, k) 1080×1920.
// Одна глобальная константа MORPH. Web Worker: только OffscreenCanvas, без document, сети и таймеров.
// Кадр считается только из t; кэшируются лишь текстуры, замеры текста и раскладки. Углы rot — в градусах.
const MORPH = (() => {
  const W = 1080, H = 1920, PI = Math.PI, PI2 = PI * 2, DEG = PI / 180;
  const P = { bg: '#ECEBE7', light: '#F8F7F4', edge: '#DAD9D3', ink: '#0D0D0E', ink2: '#232325', white: '#FFFFFF',
    mute: '#93938D', mute2: '#BDBCB6', line: '#E8E7E3', soft: '#EFEEEA', track: '#D3D2CC',
    onInk2: '#8E8E93', trackInk: '#3A3A3D', toast: '#7A7A77', red: '#FF4B3E', ok: '#2FBF6A',
    g1: '#FFB259', g2: '#F45D86', g3: '#7B5BFF', g4: '#3FA8FF' };
  const GR = [['#FFB259', '#F45D86', '#7B5BFF'], ['#FF9EC0', '#9A6BFF', '#3FA8FF'], ['#FFD36E', '#FF7A59', '#F45D86'], ['#7CE3C4', '#3FA8FF', '#7B5BFF']];
  const F = { ui: '"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif',
    text: '"Inter","Inter Display",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif',
    mono: '"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace',
    serif: '"DejaVu Serif",Georgia,"Noto Serif","Times New Roman",serif' };
  const font = (s, w = 600, kind = 'ui') => w + ' ' + (Math.round(s * 10) / 10) + 'px ' + (F[kind] || kind);
  let K = null, G = null, T = 0, TX = null, NEST = false;

  // ---------- математика, время, пружины ----------
  const cl = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
  const pr = (t, a, b) => b === a ? (t >= a ? 1 : 0) : cl((t - a) / (b - a));
  const lerp = (a, b, p) => a + (b - a) * p;
  const eo = p => 1 - Math.pow(1 - cl(p), 3);
  const eo5 = p => 1 - Math.pow(1 - cl(p), 5);
  const ei = p => Math.pow(cl(p), 3);
  const eio = p => { p = cl(p); return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  const eb = (p, c = 1.5) => { p = cl(p); return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
  function spring(dt, k = 170, d = 18) { // переходная функция пружины 0→1, dt — секунды от старта
    if (dt <= 0) return 0;
    const w0 = Math.sqrt(k), z = d / (2 * w0);
    if (z < 1) { const wd = w0 * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w0 * dt) * (Math.cos(wd * dt) + (z * w0 / wd) * Math.sin(wd * dt)); }
    return 1 - Math.exp(-w0 * dt) * (1 + w0 * dt);
  }
  const SP = { ui: [190, 19], snappy: [320, 26], soft: [120, 21], heavy: [90, 19], text: [150, 25], pop: [240, 16] };
  function track(t, keys, k = 170, d = 18) { // одно значение, несколько целей [[t, v], …]: каждая смена — своя пружина
    let v = keys[0][1];
    for (let i = 1; i < keys.length; i++) { const ti = keys[i][0]; if (t <= ti) break; v += (keys[i][1] - keys[i - 1][1]) * spring(t - ti, k, d); }
    return v;
  }
  const kf = (A, t, e = eio) => { if (t <= A[0][0]) return A[0][1]; for (let i = 0; i < A.length - 1; i++) { const [t0, v0] = A[i], [t1, v1] = A[i + 1]; if (t < t1) return lerp(v0, v1, e(pr(t, t0, t1))); } return A[A.length - 1][1]; };
  const step = (A, t) => { let v = A[0][1]; for (const q of A) if (t >= q[0]) v = q[1]; return v; };
  const bump = (dt, w = .14) => dt <= 0 ? 0 : (dt / w) * Math.exp(1 - dt / w); // толчок: пик 1 через w секунд
  const hash = n => { const s = Math.sin(n * 91.3458 + 47.853) * 43758.5453; return s - Math.floor(s); };
  const rnd = seed => { let s = (seed >>> 0) || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
  const z2 = n => String(n).padStart(2, '0');
  const mmss = s => { s = Math.max(0, Math.floor(s + 1e-6)); return Math.floor(s / 60) + ':' + z2(s % 60); };
  const hm = m => { m = Math.round(m); return z2(Math.floor(m / 60) % 24) + ':' + z2(((m % 60) + 60) % 60); };
  const num = (v, d = 0) => { const s = Math.abs(v).toFixed(d).split('.'); s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' '); return (v < 0 ? '-' : '') + s.join(','); };

  // ---------- цвет ----------
  const CC = new Map();
  function c3(c) {
    if (Array.isArray(c)) return c; let v = CC.get(c); if (v) return v;
    if (c[0] === '#') { let h = c.slice(1); if (h.length === 3) h = h.replace(/./g, '$&$&'); const n = parseInt(h.slice(0, 6), 16); v = [n >> 16 & 255, n >> 8 & 255, n & 255]; CC.set(c, v); }
    else { const m = c.match(/[\d.]+/g) || [0, 0, 0]; v = [+m[0], +m[1], +m[2]]; }
    return v;
  }
  const css = a => 'rgb(' + Math.round(a[0]) + ',' + Math.round(a[1]) + ',' + Math.round(a[2]) + ')';
  const mix = (a, b, p) => { const A = c3(a), B = c3(b); p = cl(p); return css([A[0] + (B[0] - A[0]) * p, A[1] + (B[1] - A[1]) * p, A[2] + (B[2] - A[2]) * p]); };
  const rgba = (c, a) => { const A = c3(c); return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + cl(a) + ')'; };
  const lum = c => { const A = c3(c); return (A[0] * .299 + A[1] * .587 + A[2] * .114) / 255; };

  // ---------- текстуры и холсты-черновики (один раз) ----------
  const mk = (w, h) => { const c = new OffscreenCanvas(w, h); return [c, c.getContext('2d')]; };
  function tex() {
    if (TX) return TX;
    const bc = new OffscreenCanvas(1200, 2100), bg = bc.getContext('2d', { alpha: false });
    bg.fillStyle = P.bg; bg.fillRect(0, 0, 1200, 2100);
    let gr = bg.createRadialGradient(600, 1000, 30, 600, 1000, 1000);
    gr.addColorStop(0, rgba(P.light, 1)); gr.addColorStop(.5, rgba(P.light, .5)); gr.addColorStop(1, rgba(P.light, 0));
    bg.fillStyle = gr; bg.fillRect(0, 0, 1200, 2100);
    gr = bg.createRadialGradient(600, 1050, 650, 600, 1050, 1450);
    gr.addColorStop(0, rgba(P.edge, 0)); gr.addColorStop(1, rgba(P.edge, .85));
    bg.fillStyle = gr; bg.fillRect(0, 0, 1200, 2100);
    const [lc, lg] = mk(256, 256); gr = lg.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.5, 'rgba(255,255,255,.32)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    lg.fillStyle = gr; lg.fillRect(0, 0, 256, 256);
    const [sc, sg] = mk(420, 420), [xc, xg] = mk(560, 960);
    return TX = { bg: bc, glow: lc, sh: sc, shg: sg, bl: xc, blg: xg };
  }

  // ---------- кадр, фон, камера ----------
  function begin(t, k, o = {}) { // первым в draw: сброс контекста + фон (o.dx/o.dy — параллакс фона)
    K = k; G = k.g; T = t; tex();
    const g = G; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.shadowColor = 'rgba(0,0,0,0)'; g.shadowBlur = 0; g.setLineDash([]); g.lineCap = 'round'; g.lineJoin = 'round';
    g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.imageSmoothingEnabled = true;
    background(g, o); return g;
  }
  function background(g, o = {}) {
    g.drawImage(TX.bg, Math.round(-60 + cl(o.dx || 0, -55, 55)), Math.round(-90 + cl(o.dy || 0, -85, 85)));
    if (o.tint) { g.globalAlpha = o.tintA ?? .5; g.fillStyle = o.tint; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  }
  function light(g, x, y, r = 520, a = .5) { g.save(); g.globalAlpha *= a; g.drawImage(TX.glow, x - r, y - r, r * 2, r * 2); g.restore(); }
  function floaters(g, t, o = {}) { // фоновый слой: крупные мягкие блики медленно плывут вверх
    const n = o.n ?? 5, r = rnd(o.seed ?? 11), A = o.a ?? .5, span = H + 600;
    for (let i = 0; i < n; i++) {
      const bx = 80 + r() * 920, by = r() * span, w = 300 + r() * 420, hh = w * (.32 + r() * .2), sp = 10 + r() * 16, ph = r() * PI2;
      const x = bx + Math.sin(t * .17 + ph) * 70, y = ((by - t * sp) % span + span) % span - 300;
      g.globalAlpha = A * (.55 + .45 * Math.sin(t * .35 + ph)); g.drawImage(TX.glow, x - w / 2, y - hh / 2, w, hh);
    }
    g.globalAlpha = 1;
  }
  function cam(g, t, hits, fn, o = {}) { // толчок и оседание на каждом морфе (hits по возрастанию) + дыхание
    let last = -1e9, next = 1e9; for (const h of hits) { if (h <= t) last = h; else { next = h; break; } }
    const kick = bump(t - last, o.kw ?? .16), p = last > -1e8 && next < 1e8 ? pr(t, last, next) : 0;
    const z = 1 + (o.kick ?? .016) * kick + (o.push ?? .01) * Math.sin(PI * p) + .004 * Math.sin(t * .8);
    const cx = o.cx ?? W / 2, cy = o.cy ?? 1150;
    g.save(); g.translate(cx, cy + Math.sin(t * .9) * (o.bob ?? 5) + kick * (o.drop ?? 6)); g.scale(z, z); g.translate(-cx, -cy); fn(g); g.restore();
    return z;
  }

  // ---------- форма, тени, расфокус ----------
  function rr(g, x, y, w, h, r) {
    w = Math.max(0, w); h = Math.max(0, h); r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath();
    if (g.roundRect) g.roundRect(x, y, w, h, r);
    else { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  }
  function shadow(g, x, y, w, h, r, o = {}) { // мягкая тень скруглённого прямоугольника любого размера (рисуется мелко и растягивается)
    const blur = Math.max(4, o.blur ?? 60), a = o.a ?? .16, dy = o.dy ?? blur * .4, dx = o.dx || 0, rot = (o.rot || 0) * DEG;
    if (a <= .002 || w < 1 || h < 1) return;
    let bx = x, by = y, bw = w, bh = h;
    if (rot) { const c = Math.abs(Math.cos(rot)), s = Math.abs(Math.sin(rot)), nw = w * c + h * s, nh = w * s + h * c; bx = x + w / 2 - nw / 2; by = y + h / 2 - nh / 2; bw = nw; bh = nh; }
    const pad = blur * .9 + 4, S = TX.sh, sg = TX.shg;
    let f = Math.min(.5, 3.2 / blur); f = Math.min(f, (S.width - 4) / (bw + 2 * pad), (S.height - 4) / (bh + 2 * pad));
    const sw = Math.ceil((bw + 2 * pad) * f) + 2, sh = Math.ceil((bh + 2 * pad) * f) + 2;
    sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalAlpha = 1; sg.clearRect(0, 0, sw + 2, sh + 2);
    sg.setTransform(f, 0, 0, f, (pad - bx) * f + 1, (pad - by) * f + 1); sg.fillStyle = o.col || '#000';
    for (let i = 0; i < 5; i++) {
      const e = (o.spread || 0) + (i / 4 - .5) * blur * .8; sg.globalAlpha = .2;
      if (rot) { sg.save(); sg.translate(x + w / 2, y + h / 2); sg.rotate(rot); rr(sg, -w / 2 - e, -h / 2 - e, w + 2 * e, h + 2 * e, r + e); sg.fill(); sg.restore(); }
      else { rr(sg, x - e, y - e, w + 2 * e, h + 2 * e, r + e); sg.fill(); }
    }
    if (o.contact) { // контактная тень в том же проходе: плотнее, ближе к форме
      const c = o.contact, cb = c.blur ?? 14; sg.globalAlpha = cl((c.a ?? .1) / a * .6, 0, 1) / 3; sg.translate(0, (c.dy ?? 5) - dy);
      for (let i = 0; i < 3; i++) { const e = (i - 1) * cb * .4;
        if (rot) { sg.save(); sg.translate(x + w / 2, y + h / 2); sg.rotate(rot); rr(sg, -w / 2 - e, -h / 2 - e, w + 2 * e, h + 2 * e, r + e); sg.fill(); sg.restore(); }
        else { rr(sg, x - e, y - e, w + 2 * e, h + 2 * e, r + e); sg.fill(); } }
    }
    g.save(); g.globalAlpha *= a; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'low';
    const ox = bx - pad - 1 / f + dx, oy = by - pad - 1 / f + dy;
    // под непрозрачной формой тень не видна: рисуем кольцо из 4 полос (границы — по целым пикселям черновика)
    const ri = r * .3 + 2, hx0 = Math.ceil((x + ri - ox) * f), hx1 = Math.floor((x + w - ri - ox) * f), hy0 = Math.ceil((y + ri - oy) * f), hy1 = Math.floor((y + h - ri - oy) * f);
    if (o.hole && !rot && hx1 - hx0 > 2 && hy1 - hy0 > 2) {
      const piece = (sx, sy, pw, ph) => { if (pw > 0 && ph > 0) g.drawImage(S, sx, sy, pw, ph, ox + sx / f, oy + sy / f, pw / f, ph / f); };
      piece(0, 0, sw, hy0); piece(0, hy1, sw, sh - hy1); piece(0, hy0, hx0, hy1 - hy0); piece(hx1, hy0, sw - hx1, hy1 - hy0);
    } else g.drawImage(S, 0, 0, sw, sh, ox, oy, sw / f, sh / f);
    g.restore();
  }
  function blurred(g, b, x, y, w, h, fn) { // рисует fn(g) с расфокусом b px в области (x,y,w,h) текущих координат
    if (b < .7 || w < 2 || h < 2 || NEST) { fn(g); return; }
    const S = TX.bl, sg = TX.blg, pad = b * 2 + 4;
    let f = cl(1.25 / b, .03, .5); f = Math.pow(1.6, Math.round(Math.log(f) / Math.log(1.6))); f = Math.min(f, (S.width - 4) / (w + 2 * pad), (S.height - 4) / (h + 2 * pad));
    const sw = Math.ceil((w + 2 * pad) * f) + 2, sh = Math.ceil((h + 2 * pad) * f) + 2;
    sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalAlpha = 1; sg.globalCompositeOperation = 'source-over'; sg.clearRect(0, 0, sw + 2, sh + 2);
    sg.setTransform(f, 0, 0, f, (pad - x) * f + 1, (pad - y) * f + 1);
    NEST = true; try { fn(sg); } finally { NEST = false; }
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'low';
    g.drawImage(S, 0, 0, sw, sh, x - pad - 1 / f, y - pad - 1 / f, sw / f, sh / f); g.restore();
  }
  function pres(t, tIn, tOut = 1e9, o = {}) { // присутствие блока: вход (расфокус→резкость, подъём) и уход (быстрее, с размытием)
    const di = o.din ?? .28, dq = o.dout ?? .19, i = pr(t, tIn, tIn + di), q = pr(t, tOut, tOut + dq), a = eo(i), b = eio(q);
    return { a: cl(a * 1.25) * (1 - b), b: (1 - a) * (o.blur ?? 16) + b * (o.blurOut ?? 12), s: lerp(o.s0 ?? .965, 1, a) - b * .03,
      dy: (1 - a) * (o.rise ?? 18) - b * (o.lift ?? 10), i, q, on: i > 0 && q < 1 };
  }
  function reveal(g, p, x, y, w, h, fn) { // применяет pres(): прозрачность, масштаб от центра области, сдвиг, расфокус
    if (p.a <= .004) return;
    g.save(); g.globalAlpha *= p.a; const cx = x + w / 2, cy = y + h / 2;
    g.translate(cx, cy + p.dy); g.scale(p.s, p.s); g.translate(-cx, -cy);
    blurred(g, p.b, x, y, w, h, fn); g.restore();
  }

  // ---------- одна форма: таймлайн состояний ----------
  const TRK = ['cx', 'cy', 'w', 'h', 'rf', 'rot', 'split', 'elev', 'float'];
  const TSP = { cx: [150, 24], cy: [150, 24], w: [190, 19], h: [165, 18], rf: [210, 28], rot: [120, 14], split: [170, 24], elev: [140, 24], float: [60, 16] };
  function timeline(list, o = {}) { // list: [[t, {x, y (центр), w, h, r|'pill', fill, split, splitCol, rot, elev, float, draw, delay, din, dout}], …]
    const S = []; let prev = { x: W / 2, y: 1150, w: 600, h: 180, r: 'pill', fill: P.ink, split: 0, splitCol: P.white, rot: 0, elev: 1 };
    list.forEach(([t, st]) => {
      const s = Object.assign({}, prev, { draw: null, delay: .2, din: .28, dout: .19, blur: 16, float: 0 }, st, { t, i: S.length });
      s.cx = s.x; s.cy = s.y; s.rf = s.r === 'pill' ? 1 : cl(s.r / (Math.min(s.w, s.h) / 2)); S.push(s); prev = s;
    });
    const sp = Object.assign({}, TSP, o.springs || {}), keys = {}; TRK.forEach(n => keys[n] = S.map(s => [s.t, s[n]]));
    const idx = t => { let i = 0; while (i + 1 < S.length && t >= S[i + 1].t) i++; return i; };
    const cd = o.colorDur ?? .32;
    function fillAt(i, t) { const c = c3(S[i].fill); if (i === 0) return c; const p = eio(pr(t, S[i].t, S[i].t + cd)); if (p >= 1) return c; const a = fillAt(i - 1, S[i].t); return [lerp(a[0], c[0], p), lerp(a[1], c[1], p), lerp(a[2], c[2], p)]; }
    function at(t) {
      const i = idx(t), s = S[i], v = { i, s, lt: t - s.t };
      TRK.forEach(n => v[n] = track(t, keys[n], sp[n][0], sp[n][1]));
      v.w = Math.max(2, v.w); v.h = Math.max(2, v.h); v.r = cl(v.rf) * Math.min(v.w, v.h) / 2; v.cy += Math.sin(t * 1.6) * v.float;
      const f = fillAt(i, t); v.fill = css(f); v.dark = f[0] * .299 + f[1] * .587 + f[2] * .114 < 128; v.splitCol = s.splitCol;
      v.x = v.cx - v.w / 2; v.y = v.cy - v.h / 2; return v;
    }
    return { S, at, idx, times: S.map(s => s.t) };
  }
  function hero(g, tl, t, o = {}) { // рисует форму: тени, тело, капсульная половина, блик, содержимое (уходящее + текущее)
    const b = tl.at(t), pz = o.press || 0, sc = (o.scale ?? 1) * (1 - .05 * pz);
    const w = b.w * sc, h = b.h * sc, r = b.r * sc, x = b.cx - w / 2, y = b.cy - h / 2, e = b.elev * (1 - .4 * cl(pz));
    const B = { x, y, w, h, r, cx: b.cx, cy: b.cy, rot: b.rot, i: b.i, lt: b.lt, dark: b.dark, fill: b.fill };
    if (e > .01 && o.shadow !== false) {
      shadow(g, x, y, w, h, r, { blur: 56 + 34 * e, a: .14 * Math.min(e, 1.4), dy: 18 + 16 * e, rot: b.rot, hole: true, contact: { a: .12 * Math.min(e, 1), dy: 4 + 2 * e, blur: 14 } });
    }
    g.save();
    if (b.rot) { g.translate(b.cx, b.cy); g.rotate(b.rot * DEG); g.translate(-b.cx, -b.cy); }
    rr(g, x, y, w, h, r); g.fillStyle = b.fill; g.fill(); g.save(); g.clip();
    if (b.split > .003) {
      const sw = w * cl(b.split); g.fillStyle = b.splitCol; g.fillRect(x + w - sw, y - 2, sw + 2, h + 4);
      g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(x + w - sw - 4, y, 4, h);
      g.fillStyle = 'rgba(255,255,255,' + (.16 * cl(b.split * 2)) + ')'; rr(g, x + h * .32, y + h * .17, w * .4, h * .12, h * .06); g.fill();
    }
    if (b.dark && o.sheen !== false) { rr(g, x + 1.5, y + 1.5, w - 3, h - 3, Math.max(0, r - 1.5)); g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 3; g.stroke(); } // тонкая светлая кромка
    const S = tl.S;
    for (let j = Math.max(0, b.i - 1); j <= b.i; j++) {
      const s = S[j]; if (!s.draw) continue; const tOut = j + 1 < S.length ? S[j + 1].t : 1e9;
      if (t >= tOut + s.dout) continue;
      const p = pres(t, s.t + s.delay, tOut, { din: s.din, dout: s.dout, blur: s.blur });
      if (p.a > .004) reveal(g, p, x, y, w, h, gg => s.draw(gg, B, t - s.t, p));
    }
    g.restore(); g.restore(); return B;
  }

  // ---------- курсор ----------
  function cursor(g, x, y, o = {}) { // стрелка-курсор, остриё в (x, y); o.press 0…1 — нажатие, o.s — масштаб
    if ((o.a ?? 1) <= 0) return;
    const s = (o.s ?? 3.2) * (1 - .16 * cl(o.press || 0));
    g.save(); g.globalAlpha *= o.a ?? 1; g.translate(x, y); g.scale(s, s); g.lineJoin = 'round';
    const path = () => { g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 16.4); g.lineTo(3.9, 12.7); g.lineTo(6.5, 18.6); g.lineTo(9.2, 17.4); g.lineTo(6.6, 11.7); g.lineTo(11.8, 11.7); g.closePath(); };
    g.save(); g.fillStyle = '#000'; g.translate(.5, 1.3); g.globalAlpha *= .16; path(); g.fill(); g.translate(.5, .8); g.globalAlpha *= .6; path(); g.fill(); g.restore();
    path(); g.lineWidth = 1.6; g.strokeStyle = '#fff'; g.stroke(); g.fillStyle = o.col || '#0B0B0C'; g.fill();
    g.restore();
  }
  function pointer(t, keys, o = {}) { // keys [[t, x, y], …] — откуда и когда курсор начинает ехать к точке; пружина без перелёта
    const k = o.k ?? 95, d = o.d ?? 18;
    return { x: track(t, keys.map(q => [q[0], q[1]]), k, d), y: track(t, keys.map(q => [q[0], q[2]]), k, d) };
  }
  function press(t, clicks) { // 0…1: нажатие к моменту клика (0,07 с) и отпускание пружиной с лёгким перелётом
    let v = 0;
    for (const c of clicks) { const d = t - c; if (d <= -.07 || d >= .6) continue; const q = d < 0 ? eo((d + .07) / .07) : 1 - spring(d, 260, 15); if (Math.abs(q) > Math.abs(v)) v = q; }
    return Math.max(-.3, v);
  }
  function ripple(g, x, y, lt, o = {}) { // круг от касания
    const dur = o.dur ?? .55; if (lt < 0 || lt > dur) return; const p = lt / dur, e = eo(p);
    g.save(); g.globalAlpha *= (1 - p) * (o.a ?? .55); g.beginPath(); g.arc(x, y, lerp(12, o.r ?? 74, e), 0, PI2);
    g.fillStyle = rgba(o.col || P.ink, .1); g.fill(); g.strokeStyle = rgba(o.col || P.ink, .45); g.lineWidth = 3; g.stroke(); g.restore();
  }

  // ---------- текст ----------
  const MW = new Map();
  function tw(g, s, f) { const key = f + '\u0001' + s; let v = MW.get(key); if (v === undefined) { g.font = f; v = g.measureText(s).width; MW.set(key, v); } return v; }
  function text(g, s, x, y, size, o = {}) { // y — визуальный центр строки; o: {w, kind, col, al, max (ширина — уменьшит кегль), min}; вернёт ширину
    s = String(s); const wt = o.w ?? 500, kind = o.kind || 'ui';
    let f = font(size, wt, kind), wd = tw(g, s, f);
    if (o.max && wd > o.max) { size = Math.max(o.min ?? 16, size * o.max / wd * .99); f = font(size, wt, kind); wd = tw(g, s, f); }
    g.font = f; g.fillStyle = o.col || P.ink; g.textAlign = o.al || 'left'; g.textBaseline = 'alphabetic';
    g.fillText(s, x, y + size * (kind === 'mono' ? .37 : .35)); return wd;
  }
  const typed = (s, lt, t0 = 0, cps = 14) => s.slice(0, Math.max(0, Math.floor((lt - t0) * cps)));
  function caret(g, x, y, h, t, col) { if (Math.floor(t * 2.2) % 2) return; g.fillStyle = col || P.ink; g.fillRect(x, y - h / 2, 4, h); }
  function roll(g, x, y, size, v, fmt = n => String(n), o = {}) { // барабан: v дробное — разряды fmt(n) перекатываются в fmt(n+1)
    const n = Math.floor(v + 1e-6), fr = cl(v - n), s0 = fmt(n), s1 = fmt(n + 1), f = font(size, o.w ?? 600, o.kind || 'ui');
    const isD = ch => (ch >= '0' && ch <= '9') || ch === ' ', cw = Math.max(tw(g, '0', f), tw(g, '8', f)) * (o.cell ?? 1);
    const ws = [...s0].map(ch => isD(ch) ? cw : tw(g, ch, f)), total = ws.reduce((a, b) => a + b, 0);
    let xx = o.al === 'center' ? x - total / 2 : o.al === 'right' ? x - total : x;
    const e = eio(fr), ga = g.globalAlpha, base = y + size * .35, dist = size * .9;
    g.font = f; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = o.col || P.ink;
    for (let i = 0; i < s0.length; i++) {
      const a = s0[i], b = s1.length === s0.length ? s1[i] : a, mx = xx + ws[i] / 2;
      if (a === b || e <= 0) g.fillText(a, mx, base);
      else { g.save(); g.beginPath(); g.rect(xx - 6, y - size * .72, ws[i] + 12, size * 1.44); g.clip();
        g.globalAlpha = ga * (1 - e); g.fillText(a, mx, base - e * dist); g.globalAlpha = ga * e; g.fillText(b, mx, base + (1 - e) * dist); g.restore(); }
      xx += ws[i];
    }
    g.globalAlpha = ga; return total;
  }
  const count = (t, t0, t1, from, to, e = eo) => lerp(from, to, e(pr(t, t0, t1))); // значение счётчика для roll

  // ---------- значки (рисуются кодом, s — размер рамки) ----------
  function checkmark(g, cx, cy, s, p = 1, col = P.ink, lw) { // галочка, прорисованная на долю p
    if (p <= 0) return; const u = s / 2, A = [-.6 * u, .02 * u], B = [-.16 * u, .46 * u], C = [.64 * u, -.44 * u];
    const l1 = Math.hypot(B[0] - A[0], B[1] - A[1]), l2 = Math.hypot(C[0] - B[0], C[1] - B[1]), L = (l1 + l2) * cl(p);
    g.save(); g.strokeStyle = col; g.lineWidth = lw ?? s * .14; g.lineCap = g.lineJoin = 'round'; g.beginPath(); g.moveTo(cx + A[0], cy + A[1]);
    if (L <= l1) g.lineTo(cx + lerp(A[0], B[0], L / l1), cy + lerp(A[1], B[1], L / l1));
    else { g.lineTo(cx + B[0], cy + B[1]); const f = (L - l1) / l2; g.lineTo(cx + lerp(B[0], C[0], f), cy + lerp(B[1], C[1], f)); }
    g.stroke(); g.restore();
  }
  function icon(g, name, cx, cy, s, col = P.ink, o = {}) { // check cross plus minus chev back search clock stopwatch cal bell phone user pin play pause next prev heart tooth steth child capsule
    const u = s / 2; g.save(); g.translate(cx, cy); if (o.rot) g.rotate(o.rot * DEG); g.scale(u, u);
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = o.lw ?? .2; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
    switch (name) {
      case 'check': g.moveTo(-.62, .02); g.lineTo(-.16, .48); g.lineTo(.66, -.46); g.stroke(); break;
      case 'cross': g.moveTo(-.5, -.5); g.lineTo(.5, .5); g.moveTo(.5, -.5); g.lineTo(-.5, .5); g.stroke(); break;
      case 'plus': g.moveTo(-.6, 0); g.lineTo(.6, 0); g.moveTo(0, -.6); g.lineTo(0, .6); g.stroke(); break;
      case 'minus': g.moveTo(-.6, 0); g.lineTo(.6, 0); g.stroke(); break;
      case 'chev': g.moveTo(-.22, -.52); g.lineTo(.3, 0); g.lineTo(-.22, .52); g.stroke(); break;
      case 'back': g.moveTo(.22, -.52); g.lineTo(-.3, 0); g.lineTo(.22, .52); g.stroke(); break;
      case 'search': g.arc(-.14, -.14, .5, 0, PI2); g.moveTo(.23, .23); g.lineTo(.68, .68); g.stroke(); break;
      case 'clock': g.arc(0, 0, .8, 0, PI2); g.moveTo(0, -.45); g.lineTo(0, 0); g.lineTo(.32, .22); g.stroke(); break;
      case 'stopwatch': { g.arc(0, .12, .7, 0, PI2); g.moveTo(0, -.58); g.lineTo(0, -.78); g.moveTo(-.2, -.86); g.lineTo(.2, -.86); g.stroke();
        const a = o.a ?? 0; g.beginPath(); g.moveTo(0, .12); g.lineTo(Math.sin(a) * .42, .12 - Math.cos(a) * .42); g.stroke(); break; }
      case 'cal': rr(g, -.78, -.66, 1.56, 1.46, .26); g.stroke(); g.beginPath(); g.moveTo(-.78, -.18); g.lineTo(.78, -.18); g.moveTo(-.38, -.86); g.lineTo(-.38, -.5); g.moveTo(.38, -.86); g.lineTo(.38, -.5); g.stroke(); break;
      case 'bell': g.moveTo(-.66, .4); g.lineTo(.66, .4); g.quadraticCurveTo(.5, .24, .5, -.06); g.bezierCurveTo(.5, -.56, .26, -.74, 0, -.74); g.bezierCurveTo(-.26, -.74, -.5, -.56, -.5, -.06); g.quadraticCurveTo(-.5, .24, -.66, .4); g.closePath(); g.fill();
        g.beginPath(); g.arc(0, .52, .17, 0, PI); g.fill(); g.beginPath(); g.arc(0, -.8, .1, 0, PI2); g.fill(); break;
      case 'phone': g.rotate(-.3); g.lineWidth = .3; g.arc(0, .62, .78, PI * 1.2, PI * 1.8); g.stroke();
        [-1, 1].forEach(sd => { g.save(); g.translate(sd * .64, .12); g.rotate(sd * .55); rr(g, -.18, -.25, .36, .5, .14); g.fill(); g.restore(); }); break;
      case 'user': g.arc(0, -.32, .34, 0, PI2); g.fill(); g.beginPath(); g.moveTo(-.68, .78); g.bezierCurveTo(-.68, .14, .68, .14, .68, .78); g.closePath(); g.fill(); break;
      case 'pin': g.moveTo(0, .86); g.bezierCurveTo(-.2, .5, -.66, .1, -.66, -.22); g.arc(0, -.22, .66, PI, 0); g.bezierCurveTo(.66, .1, .2, .5, 0, .86); g.closePath(); g.fill();
        g.beginPath(); g.fillStyle = o.bg || '#fff'; g.arc(0, -.22, .24, 0, PI2); g.fill(); break;
      case 'play': g.moveTo(-.38, -.62); g.lineTo(.62, 0); g.lineTo(-.38, .62); g.closePath(); g.fill(); break;
      case 'pause': rr(g, -.5, -.6, .32, 1.2, .1); g.fill(); rr(g, .18, -.6, .32, 1.2, .1); g.fill(); break;
      case 'next': g.moveTo(-.6, -.55); g.lineTo(.2, 0); g.lineTo(-.6, .55); g.closePath(); g.fill(); rr(g, .3, -.55, .2, 1.1, .08); g.fill(); break;
      case 'prev': g.moveTo(.6, -.55); g.lineTo(-.2, 0); g.lineTo(.6, .55); g.closePath(); g.fill(); rr(g, -.5, -.55, .2, 1.1, .08); g.fill(); break;
      case 'heart': g.moveTo(0, .72); g.bezierCurveTo(-.95, .1, -.75, -.85, 0, -.4); g.bezierCurveTo(.75, -.85, .95, .1, 0, .72); g.fill(); break;
      case 'tooth': g.moveTo(-.6, -.66); g.bezierCurveTo(-.98, -.6, -.9, .02, -.64, .22); g.bezierCurveTo(-.52, .52, -.48, .9, -.3, .9); g.bezierCurveTo(-.14, .9, -.12, .36, 0, .36);
        g.bezierCurveTo(.12, .36, .14, .9, .3, .9); g.bezierCurveTo(.48, .9, .52, .52, .64, .22); g.bezierCurveTo(.9, .02, .98, -.6, .6, -.66); g.bezierCurveTo(.36, -.72, .16, -.58, 0, -.52);
        g.bezierCurveTo(-.16, -.58, -.36, -.72, -.6, -.66); g.closePath(); g.fill(); break;
      case 'steth': g.lineWidth = .14; g.moveTo(-.55, -.78); g.lineTo(-.55, -.22); g.quadraticCurveTo(-.55, .2, -.15, .2); g.quadraticCurveTo(.25, .2, .25, -.22); g.lineTo(.25, -.78);
        g.moveTo(-.15, .2); g.lineTo(-.15, .46); g.quadraticCurveTo(-.15, .84, .25, .84); g.quadraticCurveTo(.62, .84, .62, .48); g.lineTo(.62, .38); g.stroke();
        g.beginPath(); g.arc(.62, .22, .18, 0, PI2); g.fill(); g.beginPath(); g.arc(-.55, -.8, .1, 0, PI2); g.moveTo(.35, -.8); g.arc(.25, -.8, .1, 0, PI2); g.fill(); break;
      case 'child': g.lineWidth = .13; g.arc(0, .12, .62, 0, PI2); g.stroke(); g.beginPath(); g.moveTo(-.06, -.5); g.bezierCurveTo(-.12, -.9, .36, -.9, .26, -.62); g.stroke();
        g.beginPath(); g.arc(-.22, .04, .085, 0, PI2); g.moveTo(.305, .04); g.arc(.22, .04, .085, 0, PI2); g.fill(); g.beginPath(); g.arc(0, .2, .26, .2 * PI, .8 * PI); g.stroke(); break;
      case 'capsule': { g.rotate(-.7); rr(g, -.86, -.34, 1.72, .68, .34); g.save(); g.clip(); g.fillStyle = col; g.fillRect(-.9, -.4, .9, .8); g.fillStyle = rgba(col, o.two ?? .45); g.fillRect(0, -.4, .9, .8); g.restore(); break; }
    }
    g.restore();
  }
  function grad(g, x, y, w, h, seed = 0) { const c = GR[((seed % GR.length) + GR.length) % GR.length], gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, c[0]); gr.addColorStop(.55, c[1]); gr.addColorStop(1, c[2]); return gr; }
  function tile(g, x, y, s, r, seed = 0, glyph, o = {}) { // плитка-обложка с единственным цветом стиля (градиент) и белым значком
    r = r ?? s * .26; g.fillStyle = grad(g, x, y, s, s, seed); rr(g, x, y, s, s, r); g.fill();
    const hl = g.createRadialGradient(x + s * .3, y + s * .22, 0, x + s * .3, y + s * .22, s * .75); hl.addColorStop(0, 'rgba(255,255,255,.32)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hl; g.fill(); if (glyph) icon(g, glyph, x + s / 2, y + s / 2, s * (o.gs ?? .56), o.col || P.white, o);
  }
  function avatar(g, cx, cy, r, seed = 0, glyph, o = {}) { g.fillStyle = grad(g, cx - r, cy - r, 2 * r, 2 * r, seed); g.beginPath(); g.arc(cx, cy, r, 0, PI2); g.fill(); if (glyph) icon(g, glyph, cx, cy, r * (o.gs ?? 1.1), o.col || P.white, o); }

  // ---------- элементы интерфейса ----------
  function card(g, x, y, w, h, o = {}) { // вторичная карточка/пилюля с мягкой тенью (r по умолчанию — пилюля)
    const r = o.r ?? h / 2; if (o.elev !== 0) { const e = o.elev ?? 1; shadow(g, x, y, w, h, r, { blur: 34 + 20 * e, a: .12 * e, dy: 10 + 8 * e, hole: !o.fill || o.fill === P.white || o.fill === P.ink }); }
    g.fillStyle = o.fill || P.white; rr(g, x, y, w, h, r); g.fill(); return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
  }
  function badge(g, cx, cy, s, o = {}) { // плашка-пилюля с текстом и значком; o: {size, dark, bg, col, icon, p (прорисовка галочки), al, elev}
    const size = o.size ?? 40, h = o.h ?? size * 1.9, f = font(size, o.w ?? 600, o.kind || 'ui'), t = tw(g, s, f), ic = o.icon ? size * 1.05 : 0, pad = o.pad ?? size * .72;
    const w = pad * 2 + t + (ic ? ic + size * .35 : 0), x = o.al === 'left' ? cx : o.al === 'right' ? cx - w : cx - w / 2, y = cy - h / 2;
    const dark = !!o.dark, bg = o.bg || (dark ? P.ink : P.white), fg = o.col || (dark ? P.white : P.ink);
    if (o.elev !== 0) shadow(g, x, y, w, h, h / 2, { blur: o.blur ?? 30, a: .12 * (o.elev ?? 1), dy: 8, hole: true });
    g.fillStyle = bg; rr(g, x, y, w, h, h / 2); g.fill();
    let xx = x + pad;
    if (ic) { if (o.icon === 'check') checkmark(g, xx + ic / 2, cy, ic * .9, o.p ?? 1, fg, size * .15); else icon(g, o.icon, xx + ic / 2, cy, ic, fg); xx += ic + size * .35; }
    text(g, s, xx, cy, size, { w: o.w ?? 600, col: fg, kind: o.kind }); return { x, y, w, h };
  }
  function row(g, x, y, w, h, o = {}) { // строка списка: плитка, заголовок, подпись, шеврон; o.hover/o.sel 0…1 (выбор = чёрная строка)
    const sel = cl(o.sel || 0), hov = cl(o.hover || 0), r = o.r ?? 40;
    if (hov > .005 && sel < .99) { g.fillStyle = rgba(o.hcol || P.soft, hov); rr(g, x, y, w, h, r); g.fill(); }
    if (sel > .005) { const k = lerp(.94, 1, eo(sel)); g.save(); g.globalAlpha *= cl(sel * 1.6); g.fillStyle = o.scol || P.ink; rr(g, x + w * (1 - k) / 2, y + h * (1 - k) / 2, w * k, h * k, r); g.fill(); g.restore(); }
    const ts = o.ts ?? h * .62, tx = x + (o.pad ?? 26);
    if (o.tile) tile(g, tx, y + (h - ts) / 2, ts, ts * .28, o.tile[0], o.tile[1]);
    const lx = tx + (o.tile ? ts + 32 : 6), maxW = x + w - lx - (o.right ? 170 : o.chev === false ? 20 : 86);
    const c1 = mix(o.col || P.ink, P.white, sel), c2 = mix(P.mute, P.onInk2, sel);
    if (o.sub) { text(g, o.title, lx, y + h * .37, o.size ?? 54, { w: 600, col: c1, max: maxW }); text(g, o.sub, lx, y + h * .7, o.ss ?? 38, { w: 500, col: c2, max: maxW }); }
    else text(g, o.title, lx, y + h / 2, o.size ?? 54, { w: 600, col: c1, max: maxW });
    if (o.right) text(g, o.right, x + w - 36, y + h / 2, o.rs ?? 40, { w: 500, col: c2, al: 'right', kind: o.rkind });
    else if (o.chev !== false) icon(g, 'chev', x + w - 52, y + h / 2, 34, mix(P.mute2, P.white, sel));
  }
  function seg(g, x, y, w, h, items, o = {}) { // сегменты (вкладки): подсветка-пилюля между lead и trail (дробные индексы), o.on 0…1
    const n = items.length, sw = w / n, pad = o.pad ?? 9, lead = o.lead ?? o.sel ?? 0, trail = o.trail ?? lead, on = o.on ?? 1, a = Math.min(lead, trail), b = Math.max(lead, trail);
    if (o.bg) { g.fillStyle = o.bg; rr(g, x, y, w, h, h / 2); g.fill(); }
    if (on > .003) { const hw = (b - a) * sw + sw - 2 * pad, hh = h - 2 * pad, k = lerp(.7, 1, eo(on)); g.save(); g.globalAlpha *= cl(on * 1.5); g.fillStyle = o.hfill || P.ink;
      rr(g, x + a * sw + pad + hw * (1 - k) / 2, y + pad + hh * (1 - k) / 2, hw * k, hh * k, hh * k / 2); g.fill(); g.restore(); }
    items.forEach((s, i) => { const ins = cl(1 - Math.max(0, a - i, i - b)) * cl(on * 1.5); text(g, s, x + (i + .5) * sw, y + h / 2, o.size ?? 44, { w: 600, al: 'center', col: mix(o.col || P.mute, o.hcol || P.white, ins), max: sw - 30 }); });
  }
  function toggle(g, x, y, w, h, on, o = {}) { // переключатель; on 0…1 (подавай пружиной)
    const r = h / 2, kr = h * .42; g.fillStyle = mix(o.off || P.track, o.on || P.ink, on); rr(g, x, y, w, h, r); g.fill();
    const kx = lerp(x + r, x + w - r, on); shadow(g, kx - kr, y + r - kr, 2 * kr, 2 * kr, kr, { blur: 12, a: .3, dy: 3 }); g.fillStyle = P.white; g.beginPath(); g.arc(kx, y + r, kr, 0, PI2); g.fill();
  }
  function slider(g, x, y, w, v, o = {}) { // ползунок: y — центр дорожки, v 0…1; вернёт x ручки
    const h = o.h ?? 14, kr = o.knob ?? 30, dark = !!o.dark, kx = x + w * cl(v);
    g.fillStyle = o.track || (dark ? P.trackInk : P.track); rr(g, x, y - h / 2, w, h, h / 2); g.fill();
    g.fillStyle = o.fill || (dark ? P.white : P.ink); rr(g, x, y - h / 2, Math.max(h, kx - x), h, h / 2); g.fill();
    if (kr > 0) { shadow(g, kx - kr, y - kr, 2 * kr, 2 * kr, kr, { blur: 16, a: dark ? .5 : .25, dy: 4 }); g.fillStyle = P.white; g.beginPath(); g.arc(kx, y, kr * (o.kscale ?? 1), 0, PI2); g.fill(); }
    return kx;
  }
  function progress(g, x, y, w, v, o = {}) { const h = o.h ?? 10; g.fillStyle = o.track || P.track; rr(g, x, y - h / 2, w, h, h / 2); g.fill(); if (v > 0) { g.fillStyle = o.fill || P.ink; rr(g, x, y - h / 2, Math.max(h, w * cl(v)), h, h / 2); g.fill(); } }
  function steps(g, x, cy, n, cur, o = {}) { // шаги-точки: текущий (дробный cur) вытянут в пилюлю, пройденные чёрные; вернёт ширину
    const d = o.d ?? 16, gap = o.gap ?? 10, long = o.long ?? 46; let xx = x;
    for (let i = 0; i < n; i++) { const st = cl(1 - Math.abs(i - cur)), w = d + (long - d) * st, done = cl(cur - i + 1);
      g.fillStyle = mix(o.off || P.track, o.on || P.ink, done); rr(g, xx, cy - d / 2, w, d, d / 2); g.fill(); xx += w + gap; }
    return xx - gap - x;
  }
  function calLayout(x, y, w, o = {}) { // сетка месяца: start — день недели 1-го числа (0 = пн), cell(d) → центр
    const pad = o.pad ?? 36, cw = (w - 2 * pad) / 7, rh = o.rh ?? 92, top = y + (o.top ?? 236), start = o.start ?? 0, n = o.days ?? 30;
    const rows = Math.ceil((start + n) / 7);
    return { cw, rh, rows, pad, top, h: (o.top ?? 236) + rows * rh, cell: d => { const k = start + d - 1; return { x: x + pad + (k % 7 + .5) * cw, y: top + Math.floor(k / 7) * rh }; } };
  }
  function calendar(g, x, y, w, o = {}) { // календарь: title, start, days, free [дни], freeP(j) 0…1, sel (день), selP 0…1, busy (цвет)
    const L = calLayout(x, y, w, o), size = o.size ?? 42;
    if (o.title) text(g, o.title, x + L.pad + 20, y + 86, o.tsize ?? 56, { w: 600 });
    (o.wd || ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']).forEach((s, i) => text(g, s, x + L.pad + (i + .5) * L.cw, L.top - 80, 32, { w: 500, col: P.mute, al: 'center' }));
    for (let d = 1; d <= (o.days ?? 30); d++) {
      const c = L.cell(d), fi = o.free ? o.free.indexOf(d) : -1, fp = fi >= 0 ? cl(o.freeP ? o.freeP(fi) : 1, 0, 1.3) : 0, sp = d === o.sel ? (o.selP ?? 1) : 0, rad = L.rh * .44;
      if (fp > .01) { g.fillStyle = o.fcol || P.soft; g.beginPath(); g.arc(c.x, c.y, rad * fp, 0, PI2); g.fill(); }
      if (sp > .01) { g.fillStyle = P.ink; g.beginPath(); g.arc(c.x, c.y, rad * Math.max(0, sp), 0, PI2); g.fill(); }
      text(g, String(d), c.x, c.y, size, { w: fp > .5 ? 600 : 500, col: sp > .5 ? P.white : mix(o.busy || P.mute2, P.ink, cl(fp)), al: 'center' });
      if (fp > .5 && sp < .5) { g.fillStyle = grad(g, c.x - 7, c.y + size * .55, 14, 14, o.seed ?? 0); g.beginPath(); g.arc(c.x, c.y + size * .62, 6 * cl(fp), 0, PI2); g.fill(); }
    }
    return L;
  }
  function chart(g, x, y, w, h, vals, p = 1, o = {}) { // линия с заливкой, прорисованная на долю p; вернёт pt(i) → [x, y]
    const n = vals.length, mn = o.min ?? Math.min(...vals), mx = o.max ?? Math.max(...vals), col = o.col || P.ink;
    const pt = i => [x + i / (n - 1) * w, y + h - (vals[i] - mn) / (mx - mn || 1) * h];
    const path = () => { g.beginPath(); let [px, py] = pt(0); g.moveTo(px, py); for (let i = 1; i < n; i++) { const [qx, qy] = pt(i), m = (px + qx) / 2; g.bezierCurveTo(m, py, m, qy, qx, qy); px = qx; py = qy; } };
    g.save(); g.beginPath(); g.rect(x - 10, y - 30, (w + 20) * cl(p), h + 60); g.clip();
    path(); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.closePath(); const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, rgba(col, .14)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fill();
    path(); g.strokeStyle = col; g.lineWidth = o.lw ?? 5; g.stroke(); g.restore(); return pt;
  }
  function bars(g, x, cy, w, h, t, o = {}) { // «живой звук»: столбики-пилюли
    const n = o.n ?? 12, cw = w / n, bw = cw * .5; g.fillStyle = o.col || P.white;
    for (let i = 0; i < n; i++) { const a = .22 + .78 * Math.abs(Math.sin(t * (3 + (i % 5) * .7) + i * 1.3)) * (o.amp ?? 1), bh = Math.max(bw, h * a); rr(g, x + i * cw + (cw - bw) / 2, cy - bh / 2, bw, bh, bw / 2); g.fill(); }
  }
  function spinner(g, cx, cy, r, t, o = {}) { g.save(); g.strokeStyle = o.col || P.white; g.lineWidth = o.lw ?? r * .24; g.lineCap = 'round'; const a = t * 7; g.beginPath(); g.arc(cx, cy, r, a, a + PI * 1.3); g.stroke(); g.restore(); }
  function burst(g, cx, cy, lt, o = {}) { // аккуратный салют из пилюль по кругу (не случайный взрыв) — только на успех
    const dur = o.dur ?? .8; if (lt < 0 || lt > dur) return; const n = o.n ?? 10, p = eo(lt / dur);
    for (let i = 0; i < n; i++) { const a = -PI / 2 + i / n * PI2 + (o.rot ?? 0), rad = lerp(o.r0 ?? 150, o.r1 ?? 250, p), len = (o.len ?? 36) * (1 - p) + 8, wd = o.wid ?? 12;
      g.save(); g.translate(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); g.rotate(a); g.globalAlpha *= 1 - eio(pr(lt, dur * .45, dur));
      g.fillStyle = o.cols ? o.cols[i % o.cols.length] : P.ink; rr(g, -len / 2, -wd / 2, len, wd, wd / 2); g.fill(); g.restore(); }
  }
  function field(g, x, y, w, h, s, o = {}) { // поле ввода: лупа, текст (или подсказка), мигающий курсор ввода
    if (o.bg !== null) { g.fillStyle = o.bg || P.soft; rr(g, x, y, w, h, o.r ?? h / 2); g.fill(); }
    icon(g, o.icon || 'search', x + h * .55, y + h / 2, h * .4, o.icol || P.mute);
    const size = o.size ?? h * .4, tx = x + h; let ww = 0;
    if (s) ww = text(g, s, tx, y + h / 2, size, { w: 500, col: o.col || P.ink, max: w - h - 30 }); else if (o.ph) text(g, o.ph, tx, y + h / 2, size, { w: 500, col: P.mute2, max: w - h - 30 });
    if (o.caret !== false) caret(g, tx + ww + 6, y + h / 2, size * 1.1, T, o.col || P.ink);
  }
  function notice(g, B, o = {}) { // раскладка уведомления внутри коробки B: плитка, приложение, время, заголовок, текст
    const pad = o.pad ?? 40, ts = o.ts ?? 104, tx = B.x + pad + ts + 30, mw = B.x + B.w - pad - tx;
    tile(g, B.x + pad, B.y + pad, ts, ts * .27, o.seed ?? 0, o.glyph || 'capsule', { rot: o.grot });
    text(g, o.app || '', tx, B.y + pad + 22, 34, { w: 600, col: P.mute, max: mw - 150 }); if (o.when) text(g, o.when, B.x + B.w - pad, B.y + pad + 22, 34, { w: 500, col: P.mute, al: 'right' });
    text(g, o.title || '', tx, B.y + pad + 92, o.size ?? 56, { w: 600, max: mw });
    if (o.body) text(g, o.body, tx, B.y + pad + 160, o.bs ?? 42, { w: 500, col: P.mute, max: mw });
  }

  // ---------- подписи: по словам, ключевое слово в чёрной пилюле ----------
  const HL = new Map();
  function headLayout(g, head, size, maxW, maxLines = 2, wt = 700) {
    const key = head + '|' + size + '|' + maxW + '|' + maxLines + '|' + wt; let L = HL.get(key); if (L) return L;
    const src = head.split(/\s+/).filter(Boolean).map(s => ({ key: s[0] === '*', s: s.replace(/^\*/, '').replace(/_/g, ' ') }));
    let sz = size, lines, gap;
    for (;;) {
      const f = font(sz, wt), pad = sz * .3; gap = sz * .26;
      const toks = src.map(q => ({ key: q.key, s: q.s, w: tw(g, q.s, f) + (q.key ? 2 * pad : 0) }));
      lines = []; let cur = [], cw = 0;
      for (const q of toks) { const add = (cur.length ? gap : 0) + q.w; if (cur.length && cw + add > maxW) { lines.push({ toks: cur, w: cw }); cur = [q]; cw = q.w; } else { cur.push(q); cw += add; } }
      lines.push({ toks: cur, w: cw });
      if ((lines.length <= maxLines && Math.max(...lines.map(l => l.w)) <= maxW) || sz <= 54) break;
      sz = Math.floor(sz * .94);
    }
    lines.forEach((l, li) => { let xx = 0; l.toks.forEach(q => { q.li = li; q.x = xx; xx += q.w + gap; }); });
    L = { size: sz, lines, toks: lines.flatMap(l => l.toks), f: font(sz, wt) }; HL.set(key, L); return L;
  }
  function caption(g, t, c, o = {}) { // c = [tIn, tOut, kicker, head, {at: [время каждого слова], size, y, x, al, maxW, lines}]
    const tIn = c[0], tOut = c[1], kick = c[2], head = c[3], oc = c[4] || {};
    if (t < tIn - .01 || t > tOut + .6) return null;
    const x = oc.x ?? o.x ?? W / 2, al = oc.al ?? o.al ?? 'center', y = oc.y ?? o.y ?? 300, ks = o.ks ?? 44;
    let yy = y;
    if (kick) {
      const p = pres(t, tIn, tOut, { din: .3, dout: .16, blur: 10, rise: 14, s0: 1, lift: 16 });
      if (p.a > .004) { const f = font(ks, 500), kw = tw(g, kick, f), kx = al === 'center' ? x - kw / 2 : al === 'right' ? x - kw : x;
        g.save(); g.globalAlpha *= p.a; blurred(g, p.b, kx - 12, yy - ks + p.dy, kw + 24, ks * 2, gg => text(gg, kick, kx, yy + p.dy, ks, { w: 500, col: o.kcol || P.mute })); g.restore(); }
      yy += ks * .5 + (o.kgap ?? 30);
    }
    if (!head) return { bottom: yy };
    const L = headLayout(g, head, oc.size ?? o.size ?? 104, oc.maxW ?? o.maxW ?? 940, oc.lines ?? o.lines ?? 2, oc.w ?? o.w ?? 700), sz = L.size, lh = sz * (o.lh ?? 1.27), n = L.toks.length;
    const at = oc.at || [], st = Math.min(.12, .5 / Math.max(1, n)), y0 = yy + sz * .62;
    for (let i = 0; i < n; i++) {
      const q = L.toks[i], ta = at[i] ?? ((at.length ? at[at.length - 1] : tIn) + (i - at.length + 1) * st), to = tOut + i * .03;
      const pi = pr(t, ta, ta + .3), pq = pr(t, to, to + .17); if (pi <= 0 || pq >= 1) continue;
      const sp = spring(t - ta, 150, 25), eq = eio(pq), a = cl(eo(pi) * 1.3) * (1 - eq), bl = (1 - eo(pr(t, ta, ta + .24))) * 9 + eq * 10;
      const line = L.lines[q.li], lx = al === 'center' ? x - line.w / 2 : al === 'right' ? x - line.w : x, cx = lx + q.x + q.w / 2, cy = y0 + q.li * lh + (1 - sp) * sz * .3 - eq * 24;
      g.save(); g.globalAlpha *= a;
      blurred(g, bl, lx + q.x - 14, cy - sz * .75, q.w + 28, sz * 1.5, gg => {
        gg.font = L.f; gg.fillStyle = o.col || P.ink; gg.textAlign = 'center'; gg.textBaseline = 'alphabetic'; gg.fillText(q.s, cx, cy + sz * .35);
        if (q.key) { const kp = spring(t - ta - .1, 230, 18); // пилюля растёт из центра; внутри неё текст белый (обрезка по пилюле)
          if (kp > .001) { const ph = sz * 1.16 * lerp(.4, 1, cl(kp)), pw = q.w * lerp(.3, 1, kp); gg.save(); rr(gg, cx - pw / 2, cy - ph / 2 + sz * .03, pw, ph, ph / 2);
            gg.fillStyle = o.kfill || P.ink; gg.fill(); gg.clip(); gg.font = L.f; gg.fillStyle = o.kcol2 || P.white; gg.fillText(q.s, cx, cy + sz * .35); gg.restore(); } }
      });
      g.restore();
    }
    return { y0, bottom: y0 + (L.lines.length - 1) * lh + sz * .6, size: sz, lines: L.lines.length };
  }
  function captions(g, t, list, o = {}) { list.forEach(c => caption(g, t, c, o)); }

  // ---------- статус-плашка сверху ----------
  function hud(g, t, o = {}) { // o: {t0, t1, y, icon, a (угол стрелки), text (моно), label, steps, step (дробный), done 0…1}
    const p = pres(t, o.t0 ?? 0, o.t1 ?? 1e9, { din: .4, rise: -26, blur: 8, s0: 1 }); if (p.a <= .004) return null;
    const h = o.h ?? 84, cy = o.y ?? 172, ts = o.size ?? 40, fM = font(ts, 500, 'mono'), fl = font(ts, 500);
    const tw1 = o.text ? tw(g, o.text, fM) : 0, tl = o.label ? tw(g, o.label, fl) : 0, sw = o.steps ? (o.steps - 1) * 26 + 46 : 0;
    const w = 32 + 44 + 16 + tw1 + (tl ? 16 + tl : 0) + (sw ? 62 + sw : 0) + 34, x = (o.x ?? W / 2) - w / 2, cx = x + w / 2;
    g.save(); g.globalAlpha *= p.a; g.translate(cx, cy + p.dy); g.scale(p.s, p.s); g.translate(-cx, -cy);
    card(g, x, cy - h / 2, w, h, { elev: .9 });
    let xx = x + 32; const dn = cl(o.done || 0);
    if (dn < 1) icon(g, o.icon || 'stopwatch', xx + 22, cy, 44 * (1 - dn), P.ink, { a: o.a ?? T * 2 });
    if (dn > 0) { g.fillStyle = P.ink; g.beginPath(); g.arc(xx + 22, cy, 23 * eb(dn), 0, PI2); g.fill(); checkmark(g, xx + 22, cy, 26, pr(dn, .3, 1), P.white, 5); }
    xx += 60; if (o.text) { text(g, o.text, xx, cy, ts, { w: 500, kind: 'mono' }); xx += tw1; }
    if (o.label) { xx += 16; text(g, o.label, xx, cy, ts, { w: 500, col: P.mute }); xx += tl; }
    if (sw) { xx += 30; g.fillStyle = P.line; g.fillRect(xx, cy - h * .28, 2, h * .56); xx += 32; steps(g, xx, cy, o.steps, o.step ?? 0); }
    g.restore(); return { x, w, y: cy - h / 2, h };
  }

  // ---------- звук ----------
  function cues(s, list) { list.forEach(([t, n, v = .14, p]) => s.play(t, n, v, p ? { pitch: p } : {})); }

  return { W, H, P, F, GR, PI, PI2, DEG, font, cl, pr, lerp, eo, eo5, ei, eio, eb, spring, SP, track, kf, step, bump, hash, rnd, z2, mmss, hm, num,
    c3, mix, rgba, lum, begin, background, light, floaters, cam, rr, shadow, blurred, pres, reveal, timeline, hero,
    cursor, pointer, press, ripple, tw, text, typed, caret, roll, count, checkmark, icon, grad, tile, avatar,
    card, badge, row, seg, toggle, slider, progress, steps, calLayout, calendar, chart, bars, spinner, burst, field, notice,
    headLayout, caption, captions, hud, cues, get t() { return T; } };
})();
