// «Дашборд» (DASH) — библиотека стиля «живой финансовый дашборд» для роликов draw(t, k) на Canvas 2D 1080×1920.
// Одна глобальная константа DASH. Работает в Web Worker: только OffscreenCanvas, без DOM, сети, Math.random и Date.
// Кадр считается только из t. lt — секунды от начала сцены; t0/t1/at у элементов — секунды сцены. Углы — в градусах.
const DASH = (() => {
  const W = 1080, H = 1920, TAU = Math.PI * 2, DEG = Math.PI / 180;
  const P = { bg: '#070B14', panel: '#0D1322', panel2: '#131B2E', line: '#1D2840', ink: '#EEF2FA', sub: '#A3AEC4', mute: '#6B7791',
    faint: '#3A4560', blue: '#4D8DFF', sky: '#86B6FF', violet: '#9C86F7', lav: '#C2BCFF', teal: '#34D8A6', mint: '#8CEBCB',
    red: '#FF5C7A', coral: '#FF8EA0', amber: '#F6C350', orange: '#FF8A4C', cyan: '#45C6F0', navy: '#020A24', paper: '#F4F7FC', dark: '#0A1222' };
  const SER = [P.blue, P.violet, P.teal, P.orange, P.red, P.amber, P.cyan];
  const F = { D: '"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif',
    I: '"Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif',
    M: '"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace' };
  const SAFE = { x0: 60, x1: 1020, y0: 110, y1: 1690 }, TOP = 306, SLOT = { x: 116, y: 168, r: 44 };
  let K = null, T = 0, TX = null, CUR = null;

  // ---------- математика и время ----------
  const cl = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
  const pr = (t, a, b) => b === a ? (t >= a ? 1 : 0) : cl((t - a) / (b - a));
  const lerp = (a, b, p) => a + (b - a) * p;
  const eo = p => 1 - Math.pow(1 - cl(p), 3);
  const eo5 = p => 1 - Math.pow(1 - cl(p), 5);
  const ei = p => Math.pow(cl(p), 3);
  const eio = p => { p = cl(p); return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  function spring(p, z = .62) { // затухающая пружина 0→1; z=.62 — лёгкий перелёт ~7 %, z=.8 — почти без перелёта
    if (p <= 0) return 0; if (p >= 1) return 1;
    const w = 4.6 / z, wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * p) * (Math.cos(wd * p) + z * w / wd * Math.sin(wd * p));
  }
  const sp = (lt, t0, d = .5, z) => spring(pr(lt, t0, t0 + d), z);
  const ap = (lt, t0, d = .28) => eo(pr(lt, t0, t0 + d));
  const vis = (lt, t0, t1, din = .28, dout = .2) => ap(lt, t0, din) * (t1 == null ? 1 : 1 - eo(pr(lt, t1, t1 + dout)));
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const rnd = seed => { let s = (seed >>> 0) || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
  const stag = (i, n, span = .5) => n > 1 ? i * span / (n - 1) : 0;
  const mix = (a, b, p) => Array.isArray(a) ? a.map((v, i) => lerp(v, b[i], p)) : lerp(a, b, p);
  function kf(keys, t, e = eio) { // плавно между ключами [[t, v], …]; v — число или массив
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) { const [t0, v0] = keys[i], [t1, v1] = keys[i + 1]; if (t < t1) return mix(v0, v1, e(pr(t, t0, t1))); }
    return keys[keys.length - 1][1];
  }
  function step(keys, t, d = .5, e) { // держит значение, после ключа [t, v, dur?] переходит к v за dur
    let v = keys[0][1];
    for (let i = 1; i < keys.length; i++) { const k = keys[i]; if (t < k[0]) break; v = mix(v, k[1], (e || eo)(pr(t, k[0], k[0] + (k[2] ?? d)))); }
    return v;
  }
  const fly = (keys, t, d = .7) => step(keys, t, d, p => spring(p, .74));
  const count = (lt, t0, d, a, b) => lerp(a, b, eo5(pr(lt, t0, t0 + d)));
  function fmt(v, d = 0, o = {}) { // 120000 → "120 000"; 2.5 → "2,5"
    const neg = v < 0; let s = Math.abs(v).toFixed(d); const parts = s.split('.');
    s = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (parts[1] ? ',' + parts[1] : '');
    return (neg ? '−' : o.plus && v > 0 ? '+' : '') + s + (o.unit ? ' ' + o.unit : '');
  }
  const rub = (v, o = {}) => fmt(v, 0, Object.assign({ unit: '₽' }, o));

  // ---------- цвет ----------
  const col = c => (c && P[c]) || c || P.ink;
  const RGB = {};
  function rgb(c) {
    c = col(c); if (RGB[c]) return RGB[c]; let v = [255, 255, 255], m;
    if ((m = /^#([0-9a-f]{6})$/i.exec(c))) { const n = parseInt(m[1], 16); v = [n >> 16, (n >> 8) & 255, n & 255]; }
    else if ((m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c))) v = [+m[1], +m[2], +m[3]];
    return RGB[c] = v;
  }
  const rgba = (c, a) => { const v = rgb(c); return 'rgba(' + v[0] + ',' + v[1] + ',' + v[2] + ',' + cl(a).toFixed(3) + ')'; };
  const mixc = (a, b, p) => { const x = rgb(a), y = rgb(b); p = cl(p); return 'rgb(' + Math.round(lerp(x[0], y[0], p)) + ',' + Math.round(lerp(x[1], y[1], p)) + ',' + Math.round(lerp(x[2], y[2], p)) + ')'; };

  // ---------- текстуры и спрайты (один раз, OffscreenCanvas) ----------
  const mk = (w, h) => { const c = new OffscreenCanvas(w, h); return [c, c.getContext('2d')]; };
  function tex() {
    if (TX) return TX;
    const [bc, b] = mk(W, H); b.fillStyle = P.bg; b.fillRect(0, 0, W, H);
    const rg = (x, y, r, c, a) => { const gr = b.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(c, a)); gr.addColorStop(1, rgba(c, 0)); b.fillStyle = gr; b.fillRect(0, 0, W, H); };
    rg(540, -180, 1250, '#3D6BFF', .17); rg(1080, 950, 900, '#7A5CFF', .06); rg(0, 1680, 950, '#1FB58A', .05);
    b.fillStyle = 'rgba(150,170,225,.075)'; for (let y = 20; y < H; y += 40) for (let x = 20; x < W; x += 40) b.fillRect(x - 1.2, y - 1.2, 2.4, 2.4);
    const vg = b.createRadialGradient(540, 900, 380, 540, 960, 1300); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); b.fillStyle = vg; b.fillRect(0, 0, W, H);
    const [vc, v] = mk(270, 480), v2 = v.createRadialGradient(135, 230, 95, 135, 240, 330);
    v2.addColorStop(0, 'rgba(2,4,10,0)'); v2.addColorStop(1, 'rgba(2,4,10,.42)'); v.fillStyle = v2; v.fillRect(0, 0, 270, 480);
    return TX = { bg: bc, vig: vc };
  }
  const GL = {}, DT = {};
  function glowSpr(c) {
    const k = col(c); if (GL[k]) return GL[k]; const [cv, x] = mk(128, 128), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, rgba(k, 1)); gr.addColorStop(.22, rgba(k, .5)); gr.addColorStop(.55, rgba(k, .14)); gr.addColorStop(1, rgba(k, 0));
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return GL[k] = cv;
  }
  function dotSpr(c) {
    const k = col(c); if (DT[k]) return DT[k]; const [cv, x] = mk(48, 48), gr = x.createRadialGradient(24, 24, 0, 24, 24, 24);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.17, rgba(k, .95)); gr.addColorStop(.42, rgba(k, .28)); gr.addColorStop(1, rgba(k, 0));
    x.fillStyle = gr; x.fillRect(0, 0, 48, 48); return DT[k] = cv;
  }
  function glow(g, x, y, r, c = P.blue, a = .5) { // мягкий свет (спрайт, режим lighter) — только у данных, не у кнопок
    if (a <= .003 || r <= 0) return; g.save(); g.globalAlpha *= a; g.globalCompositeOperation = 'lighter'; g.drawImage(glowSpr(c), x - r, y - r, r * 2, r * 2); g.restore();
  }
  function spark(g, x, y, s, c, a = 1) { // одна частица-«деньга»: белое ядро и цветной ореол
    if (a <= .01) return; const A = g.globalAlpha; g.globalAlpha = A * Math.min(1, a); g.drawImage(dotSpr(c), x - s * 2, y - s * 2, s * 4, s * 4); g.globalAlpha = A;
  }
  function rr(g, x, y, w, h, r) { w = Math.max(0, w); h = Math.max(0, h); g.beginPath(); g.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); }
  function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0, r), 0, TAU); }
  const bez = (a, b, c, d, u) => { const v = 1 - u; return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c + u * u * u * d; };

  // ---------- кадр, сцены, камера ----------
  function begin(t, k) { // первым в draw: сброс контекста, фон с дыханием света и пылинками
    K = k; T = t; const g = k.g; tex();
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.shadowBlur = 0; g.shadowColor = 'rgba(0,0,0,0)';
    g.setLineDash([]); g.lineCap = 'round'; g.lineJoin = 'round'; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    g.drawImage(TX.bg, 0, 0);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const x = hash(i * 3.7) * W + Math.sin(t * .3 + i) * 30, L = H + 200, y = (((hash(i * 9.1) * L - t * (14 + 24 * hash(i))) % L) + L) % L - 100;
      spark(g, x, y, 1.6 + 2.2 * hash(i * 5.3), i % 3 ? P.sky : P.violet, .1 + .1 * Math.sin(t * 1.3 + i));
    }
    g.restore(); return g;
  }
  function finish(g) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; } // виньетка уже в фоне: поверх кадра ничего не кладём (скорость)
  function camOf(s, lt) { return s.cam ? step(s.cam.map(c => [c[0], [c[1], c[2], c[3]], c[4]]), lt, .8, p => spring(p, .8)) : [540, 1000, 1]; }
  function camApply(g, s, lt, p) { // наезд после склейки оседает пружиной + медленный дрейф + ключи s.cam
    const c = camOf(s, lt), z = c[2] * (1 + (s.kick ?? .035) * (1 - spring(pr(lt, 0, .75), .75)) + (s.drift ?? .012) * p);
    g.translate(540, 1000); g.scale(z, z); g.translate(-c[0], -c[1]);
  }
  function fx(g, kind, q, out) {
    if (out) {
      if (kind === 'scroll') { g.translate(0, -H * .4 * eo(q)); g.globalAlpha *= 1 - eo(q * 2); }
      else if (kind === 'swap') { g.translate(-150 * eo(q), 0); g.globalAlpha *= 1 - eo(q * 2); }
      else if (kind === 'fade') g.globalAlpha *= 1 - q;
      else { const z = 1 + .16 * eo(q); g.translate(540, 1000); g.scale(z, z); g.translate(-540, -1000); g.globalAlpha *= 1 - eo(q * 2); }
    } else {
      if (kind === 'scroll') { g.translate(0, H * .3 * (1 - spring(q, .8))); g.globalAlpha *= eo((q - .12) * 1.6); }
      else if (kind === 'swap') { g.translate(170 * (1 - spring(q, .75)), 0); g.globalAlpha *= eo((q - .12) * 1.6); }
      else if (kind === 'fade') g.globalAlpha *= q;
      else { const z = .9 + .1 * spring(q, .72); g.translate(540, 1000); g.scale(z, z); g.translate(-540, -1000); g.globalAlpha *= eo((q - .1) * 1.6); }
    }
  }
  function run(g, t, SC, o = {}) { // SC: [{t0, draw(g, lt, info), in:'zoom'|'scroll'|'swap'|'fade'|'cut', td, cam, kick, drift}]
    let i = 0; for (let j = 0; j < SC.length; j++) if (t >= SC[j].t0) i = j;
    const s = SC[i], lt = t - s.t0, t1 = i + 1 < SC.length ? SC[i + 1].t0 : K.duration;
    const info = { i, lt, t0: s.t0, t1, d: t1 - s.t0, p: pr(t, s.t0, t1) }; CUR = info;
    const kind = s.in || 'zoom', d = s.td || .5, top = o.top ?? TOP;
    g.save(); g.beginPath(); g.rect(0, top, W, H - top); g.clip();
    if (i > 0 && kind !== 'cut' && lt < d) {
      const A = SC[i - 1], alt = t - A.t0, q = lt / d;
      g.save(); fx(g, kind, q, true); camApply(g, A, alt, 1); A.draw(g, alt, { i: i - 1, lt: alt, t0: A.t0, t1: s.t0, d: s.t0 - A.t0, p: 1, out: q }); g.restore();
      g.save(); fx(g, kind, q, false); camApply(g, s, lt, info.p); s.draw(g, lt, info); g.restore();
    } else { g.save(); camApply(g, s, lt, info.p); s.draw(g, lt, info); g.restore(); }
    g.restore(); return info;
  }

  // ---------- текст ----------
  const font = (size, w = 600, kind = 'I') => w + ' ' + Math.max(1, Math.round(size)) + 'px ' + (F[kind] || F.I);
  const MW = new Map();
  function mw(g, f, s) { const k = f + '|' + s; let w = MW.get(k); if (w == null) { g.font = f; w = g.measureText(s).width; if (MW.size > 5000) MW.clear(); MW.set(k, w); } return w; }
  function labelW(g, s, size = 26, track = .14, w = 600) { s = String(s).toUpperCase(); const f = font(size, w); let x = 0; for (const ch of s) x += mw(g, f, ch) + size * track; return Math.max(0, x - size * track); }
  function label(g, s, x, y, o = {}) { // подпись капсом с разрядкой (буквы по одной, без letterSpacing)
    s = String(s).toUpperCase(); const size0 = o.size || 26, tr = o.track ?? .14, wt = o.w || 600;
    let size = size0, tw = labelW(g, s, size, tr, wt); if (o.max && tw > o.max) { size = size0 * o.max / tw; tw = labelW(g, s, size, tr, wt); }
    const f = font(size, wt); let x0 = o.al === 'center' ? x - tw / 2 : o.al === 'right' ? x - tw : x;
    g.font = f; g.fillStyle = col(o.col || P.mute); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    for (const ch of s) { g.font = f; g.fillText(ch, x0, y); x0 += mw(g, f, ch) + size * tr; }
    return tw;
  }
  function text(g, s, x, y, o = {}) { // строка с подгонкой под o.max
    s = String(s); let size = o.size || 44; const wt = o.w || 600, kind = o.kind || 'I';
    let f = font(size, wt, kind), tw = mw(g, f, s);
    if (o.max && tw > o.max) { size *= o.max / tw; f = font(size, wt, kind); tw = mw(g, f, s); }
    g.font = f; g.fillStyle = col(o.col || P.ink); g.textAlign = o.al || 'left'; g.textBaseline = 'alphabetic'; g.fillText(s, x, y);
    return { w: tw, size };
  }
  const isD = ch => ch >= '0' && ch <= '9';
  function dw(g, f) { let m = 0; for (let i = 0; i < 10; i++) m = Math.max(m, mw(g, f, String(i))); return m; }
  function numW(g, s, size, wt = 700) { const f = font(size, wt, 'D'), d = dw(g, f); let x = 0; for (const ch of String(s)) x += isD(ch) ? d : ch === ' ' ? size * .26 : mw(g, f, ch); return x; }
  function num(g, s, x, y, size, o = {}) { // число с цифрами одинаковой ширины (не дрожит при счёте)
    s = String(s); const wt = o.w || 700, f = font(size, wt, 'D'), d = dw(g, f), tw = numW(g, s, size, wt);
    let x0 = o.al === 'center' ? x - tw / 2 : o.al === 'right' ? x - tw : x;
    g.font = f; g.fillStyle = col(o.col || P.ink); g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    for (const ch of s) { const cw = isD(ch) ? d : ch === ' ' ? size * .26 : mw(g, f, ch); if (ch !== ' ') g.fillText(ch, x0 + cw / 2, y); x0 += cw; }
    g.textAlign = 'left'; return tw;
  }
  function odoW(g, to, size, pre = '', wt = 700) { const f = font(size, wt, 'D'), n = Math.max(1, String(Math.round(Math.abs(to))).length); return (pre ? mw(g, f, pre) + size * .04 : 0) + n * dw(g, f) + Math.floor((n - 1) / 3) * size * .26; }
  function odo(g, v, x, y, size, o = {}) { // одометр: цифры прокручиваются, старшие нули тусклые; o.to — конечное значение (число разрядов)
    const wt = o.w || 700, f = font(size, wt, 'D'), d = dw(g, f), to = Math.round(Math.abs(o.to ?? v)), n = Math.max(1, String(to).length), spc = size * .26;
    const pre = o.pre || '', pw = pre ? mw(g, f, pre) + size * .04 : 0, tw = odoW(g, to, size, pre, wt);
    let x0 = o.al === 'center' ? x - tw / 2 : o.al === 'right' ? x - tw : x;
    const av = Math.abs(v), lh = size * 1.05, A = g.globalAlpha;
    g.font = f; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = col(o.col || P.ink);
    if (pre) { g.fillText(pre, x0 + pw / 2, y); x0 += pw; }
    for (let i = n - 1; i >= 0; i--) {
      const p10 = Math.pow(10, i), q = av / p10, dig = Math.floor(q) % 10, lead = q < 1;
      let roll = i === 0 ? q - Math.floor(q) : Math.max(0, (av % p10) - (p10 - 1));
      g.save(); g.beginPath(); g.rect(x0 - 2, y - size * .95, d + 4, size * 1.2); g.clip();
      g.globalAlpha = A * (lead ? .2 : 1); g.fillText(String(dig), x0 + d / 2, y - roll * lh);
      if (roll > 0) { const nx = (dig + 1) % 10; g.globalAlpha = A * (lead && nx === 0 ? .2 : 1); g.fillText(String(nx), x0 + d / 2, y - roll * lh + lh); }
      g.restore(); x0 += d; if (i > 0 && i % 3 === 0) x0 += spc;
    }
    g.globalAlpha = A; g.textAlign = 'left'; return tw;
  }
  const WC = new Map();
  function parseW(s) { // «слово@1.2 *ключ@2 ~тихое | перенос 50#teal@.8 сто_двадцать»
    if (WC.has(s)) return WC.get(s); const out = []; let line = 0;
    for (const raw of String(s).split(/\s+/)) {
      let r = raw; while (r[0] === '|') { line++; r = r.slice(1); } if (!r) continue;
      const m = r.match(/^([*~]?)(.+?)(?:#([a-zA-Z]+))?(?:@(-?\d*\.?\d+))?$/);
      out.push({ k: m[1] === '*', m: m[1] === '~', w: m[2].replace(/_/g, ' '), c: m[3] || null, at: m[4] != null ? +m[4] : null, line });
    }
    WC.set(s, out); return out;
  }
  function words(g, lt, o) { // заголовок по словам в такт фразе, ключевое слово в цветной плашке; подгонка под ширину
    const toks = parseW(o.s), x = o.x ?? 60, y = o.y, al = o.al || 'left', wt = o.w || 700, kind = o.kind || 'D';
    const maxW = o.max ?? (al === 'center' ? 2 * Math.min(x - 60, 1020 - x) : al === 'right' ? x - 60 : 1020 - x);
    let size = o.size || 104, lines = [], f = '';
    for (let it = 0; it < 14; it++) {
      f = font(size, wt, kind); const spw = mw(g, f, ' '); lines = []; let cur = null, ln = -1, bad = false;
      for (const tk of toks) {
        const ww = mw(g, f, tk.w); if (ww > maxW) bad = true;
        if (!cur || tk.line !== ln || cur.w + spw + ww > maxW) { cur = { items: [], w: 0 }; lines.push(cur); ln = tk.line; }
        const xx = cur.items.length ? cur.w + spw : 0; cur.items.push({ tk, ww, x: xx }); cur.w = xx + ww;
      }
      if (!bad && lines.length <= (o.lines || 4)) break; size *= .92;
    }
    const lh = size * (o.lh || 1.1); let wi = 0;
    lines.forEach((L, li) => {
      const ly = y + li * lh, lx = al === 'center' ? x - L.w / 2 : al === 'right' ? x - L.w : x;
      L.items.forEach(it => {
        const tk = it.tk, ta = tk.at ?? ((o.t0 ?? 0) + wi * (o.stagger ?? .1)); wi++;
        const a = pr(lt, ta, ta + .26); if (a <= 0) return;
        const e = eo(a), ex = o.t1 != null ? eo(pr(lt, o.t1, o.t1 + .2)) : 0; if (ex >= 1) return;
        const wx = lx + it.x, wy = ly + (1 - e) * size * .3 - ex * size * .25;
        const c = tk.c ? col(tk.c) : tk.k ? col(o.keyCol || P.blue) : tk.m ? P.mute : col(o.col || P.ink);
        g.save(); g.globalAlpha *= e * (1 - ex);
        if (tk.k && o.pill !== false) { const hp = eo(pr(lt, ta + .06, ta + .42)); rr(g, wx - size * .1, wy - size * .84, (it.ww + size * .2) * hp, size * 1.08, size * .16); g.fillStyle = rgba(c, .17); g.fill(); }
        g.font = f; g.fillStyle = c; g.textAlign = 'left'; g.fillText(tk.w, wx, wy); g.restore();
      });
    });
    return { size, lines: lines.length, h: lines.length * lh, bottom: y + (lines.length - 1) * lh + size * .28, w: Math.max(0, ...lines.map(L => L.w)) };
  }

  // ---------- иконки (линейные, сетка 24, рисуются кодом) ----------
  const C = (x, y, r) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  const IC = {
    home: 'M3 10.5 12 3l9 7.5V21H3z M9.5 21v-6.5h5V21', cart: 'M2.5 4h2.7l2.4 11.2h10.7L20.6 7.5H6.2 ' + C(9.5, 20, 1.4) + ' ' + C(17, 20, 1.4),
    cup: 'M5 9h11v5.5a4.5 4.5 0 0 1-4.5 4.5h-2A4.5 4.5 0 0 1 5 14.5z M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16 M8.5 3.5c-.8 1 .8 2 0 3 M12 3.5c-.8 1 .8 2 0 3 M4 21.5h13',
    card: 'M2.5 6h19v12.5h-19z M2.5 10h19 M6 15h4', repeat: 'M17 3l3.5 3.5L17 10 M4 11.5V10a3.5 3.5 0 0 1 3.5-3.5h13 M7 21l-3.5-3.5L7 14 M20 12.5V14a3.5 3.5 0 0 1-3.5 3.5h-13',
    car: 'M4 16.5v-5l2.2-5.5h11.6l2.2 5.5v5z M4 11.5h16 M7.5 14h.01 M16.5 14h.01 M6 16.5v2.5 M18 16.5v2.5', bag: 'M5 8h14l-1.2 13H6.2z M9 10V6.5a3 3 0 0 1 6 0V10',
    coin: C(12, 12, 9.5) + ' M9.5 7h3.7a2.6 2.6 0 0 1 0 5.2H9.5 M9.5 7v10 M8 14.8h5.5', ruble: 'M8 4h5.5a4 4 0 0 1 0 8H8 M8 4v16 M5.5 16H14 M5.5 12H8',
    piggy: 'M4 12a7.5 6 0 1 0 15 0a7.5 6 0 1 0 -15 0 M19 10.2h2v3.6h-2 M8.5 7.2 7.6 3.8 11 6.2 M7.5 16.8V20 M15.5 16.8V20 M10 9h3.5 M15.5 10.8h.01 M4.2 11.2c-1.2 0-2-.8-2-2',
    wallet: 'M3 7.5h16.5A1.5 1.5 0 0 1 21 9v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19z M3 7.5 15.5 3.5v4 M16 14h2',
    calendar: 'M4 5.5h16V21H4z M4 10h16 M8.5 3v5 M15.5 3v5 M8 14h2 M12 14h2 M8 17.5h2', play: 'M3 5h18v14H3z M10 9.2v5.6l4.8-2.8z',
    music: 'M9 18V6l11-2.5v12 ' + C(6.5, 18, 2.5) + ' ' + C(17.5, 15.5, 2.5), cloud: 'M7 18.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 6.9 11.2 3.65 3.65 0 0 0 7 18.5z',
    game: 'M7 8h10a4.5 4.5 0 0 1 4.4 3.6l.9 4.7a2 2 0 0 1-3.5 1.6L16.5 15h-9l-2.3 2.9a2 2 0 0 1-3.5-1.6l.9-4.7A4.5 4.5 0 0 1 7 8z M8 10.5v3 M6.5 12h3 M15.5 11.2h.01 M17.5 13h.01',
    gift: 'M3.5 8.5h17v4h-17z M5 12.5h14V21H5z M12 8.5V21 M12 8.5C10 4 6.5 5 7.5 7.2c.6 1.2 4.5 1.3 4.5 1.3s3.9-.1 4.5-1.3C17.5 5 14 4 12 8.5',
    bolt: 'M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z', heart: 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z',
    user: C(12, 8, 4) + ' M4 21a8 8 0 0 1 16 0', family: C(7.5, 6.5, 2.6) + ' ' + C(16.5, 6.5, 2.6) + ' ' + C(12, 13.3, 1.9) + ' M2.5 20v-3.5a5 5 0 0 1 7.2-4.5 M21.5 20v-3.5a5 5 0 0 0-7.2-4.5 M8.5 21a3.5 3.5 0 0 1 7 0',
    chart: 'M4 20V4 M4 20h16.5 M8 16.5v-5 M12 16.5V8 M16 16.5v-3.5 M20 16.5V10', trend: 'M3 17l6-6 4 4 8-8 M15 7h6v6', fall: 'M3 7l6 6 4-4 8 8 M15 17h6v-6',
    clock: C(12, 12, 9) + ' M12 7v5l3.2 2', alert: 'M12 3.5 21.5 20h-19z M12 10v4.5 M12 17.3h.01', check: 'M5 12.5l4.5 4.5L19.5 7',
    ok: C(12, 12, 9.5) + ' M7.8 12.3l3 3 5.4-6', up: 'M12 19.5v-15 M5.5 11 12 4.5 18.5 11', down: 'M12 4.5v15 M5.5 13l6.5 6.5 6.5-6.5',
    drop: 'M12 3s6.5 7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10 12 3 12 3z', leak: 'M10 3s5 5.4 5 8.9a5 5 0 0 1-10 0C5 8.4 10 3 10 3z M18.5 14s2.5 2.7 2.5 4.4a2.5 2.5 0 0 1-5 0c0-1.7 2.5-4.4 2.5-4.4z',
    receipt: 'M6 3h12v18l-2.4-1.6-2.4 1.6-2.4-1.6L8.4 21 6 19.4z M9 8h6 M9 11.5h6 M9 15h3.5', phone: 'M7 2.5h10a1.5 1.5 0 0 1 1.5 1.5v16a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V4A1.5 1.5 0 0 1 7 2.5z M11 18h2',
    scale: 'M12 3.5v17 M7 20.5h10 M4.5 7h15 M4.5 7 1.8 13a2.8 2.8 0 0 0 5.4 0z M19.5 7l-2.7 6a2.8 2.8 0 0 0 5.4 0z', search: C(10.5, 10.5, 6.5) + ' M15.5 15.5 21 21',
    pencil: 'M4 20h4.2L19.5 8.7a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8z M13.5 6.5l4 4', target: C(12, 12, 9) + ' ' + C(12, 12, 5.2) + ' ' + C(12, 12, 1.4),
    percent: 'M19 5 5 19 ' + C(7, 7, 2.2) + ' ' + C(17, 17, 2.2), bulb: 'M9 18h6 M10 21h4 M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z',
    leaf: 'M5 19C5 10 11 5 20 4c-1 9-6 15-15 15z M5 19 13 11', plus: 'M12 5v14 M5 12h14', minus: 'M5 12h14',
  };
  const ICP = {};
  function icon(g, name, x, y, s, c = P.ink, lw = 2) { // линейная иконка по центру x,y, размер s px
    const d = IC[name]; if (!d) return; const p = ICP[name] || (ICP[name] = new Path2D(d));
    g.save(); g.translate(x - s / 2, y - s / 2); g.scale(s / 24, s / 24); g.strokeStyle = col(c); g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(p); g.restore();
  }
  function tile(g, name, x, y, s, c = P.blue) { // иконка в тонированной плитке (левый верх x,y)
    c = col(c); rr(g, x, y, s, s, s * .28); g.fillStyle = rgba(c, .14); g.fill(); g.lineWidth = 1.5; g.strokeStyle = rgba(c, .34); g.stroke();
    icon(g, name, x + s / 2, y + s / 2, s * .56, c, 2.1);
  }
  function avatar(g, x, y, r, s, c = P.violet) { // круглая аватарка с инициалами
    c = col(c); circ(g, x, y, r); g.fillStyle = rgba(c, .2); g.fill(); g.lineWidth = 2; g.strokeStyle = rgba(c, .6); g.stroke();
    text(g, s, x, y + r * .36, { size: r * .95, w: 700, kind: 'D', col: c, al: 'center' });
  }

  // ---------- панели, плашки, подписи ----------
  function panel(g, x, y, w, h, o = {}) { // карточка дашборда: градиент, тонкая рамка, светлая кромка сверху; o.acc — цветная кромка
    const r = o.r ?? 28, gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, o.fill2 || P.panel2); gr.addColorStop(1, o.fill || P.panel);
    rr(g, x, y, w, h, r); g.fillStyle = gr; g.fill(); g.lineWidth = 2; g.strokeStyle = o.stroke || 'rgba(120,145,205,.17)'; g.stroke();
    const ac = o.acc ? col(o.acc) : null, hl = g.createLinearGradient(x, 0, x + w, 0);
    hl.addColorStop(0, 'rgba(255,255,255,0)'); hl.addColorStop(.5, ac ? rgba(ac, .95) : 'rgba(255,255,255,.18)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hl; g.fillRect(x + r, y, w - 2 * r, ac ? 3 : 2);
    if (ac) { g.save(); g.globalAlpha *= .5; g.globalCompositeOperation = 'lighter'; g.drawImage(glowSpr(ac), x + w * .2, y - 40, w * .6, 80); g.restore(); }
  }
  function card(g, lt, o, fn) { // появляется пружиной снизу; fn(g, inner) рисует содержимое; o: x,y,w,h,t0,t1,title,icon,acc,meta
    const t0 = o.t0 ?? 0, a = vis(lt, t0, o.t1, .3, .2); if (a <= 0) return null;
    const s = sp(lt, t0, .55), { x, y, w, h } = o, cx = x + w / 2, cy = y + h / 2, sc = .965 + .035 * s;
    g.save(); g.globalAlpha *= a; g.translate(0, (1 - s) * 48); g.translate(cx, cy); g.scale(sc, sc); g.translate(-cx, -cy);
    panel(g, x, y, w, h, o); let iy = y + 34;
    if (o.title) {
      let tx = x + 34; if (o.icon) { tile(g, o.icon, x + 30, y + 28, 56, o.acc || P.blue); tx = x + 104; }
      label(g, o.title, tx, y + 66, { size: o.ts || 25, col: P.sub, max: x + w - tx - 34 - (o.meta ? labelW(g, o.meta, 21) + 24 : 0) });
      if (o.meta) label(g, o.meta, x + w - 34, y + 66, { size: 21, col: P.mute, al: 'right' });
      iy = y + 116;
    }
    const inner = { x: x + 34, y: iy, w: w - 68, h: y + h - iy - 30, r: x + w - 34, b: y + h - 30 };
    if (fn) fn(g, inner); g.restore(); return inner;
  }
  function chip(g, lt, o) { // пилюля-бейдж: o: x, y (центр по высоте), s, col, t0, t1, dot, icon, size, al, solid
    const a = vis(lt, o.t0 ?? 0, o.t1, .25, .18); if (a <= 0) return 0;
    const c = col(o.col || P.blue), size = o.size || 26, f = font(size, 600), s = String(o.s), tw = mw(g, f, s);
    const pad = size * .72, dot = o.dot ? size * .5 : 0, ic = o.icon ? size * 1.05 : 0;
    const w = tw + pad * 2 + (dot ? dot + size * .42 : 0) + (ic ? ic + size * .3 : 0), h = size * 1.9;
    const x0 = o.al === 'right' ? o.x - w : o.al === 'center' ? o.x - w / 2 : o.x, sc = .82 + .18 * sp(lt, o.t0 ?? 0, .42);
    g.save(); g.globalAlpha *= a; g.translate(x0 + w / 2, o.y); g.scale(sc, sc); g.translate(-(x0 + w / 2), -o.y);
    rr(g, x0, o.y - h / 2, w, h, h / 2); g.fillStyle = o.solid ? c : rgba(c, .15); g.fill();
    if (!o.solid) { g.lineWidth = 1.5; g.strokeStyle = rgba(c, .42); g.stroke(); }
    let cx = x0 + pad, fc = o.solid ? P.dark : c;
    if (dot) { glow(g, cx + dot / 2, o.y, dot * 1.6, c, .35 + .25 * Math.sin(T * 5)); g.fillStyle = fc; circ(g, cx + dot / 2, o.y, dot / 2); g.fill(); cx += dot + size * .42; }
    if (ic) { icon(g, o.icon, cx + ic / 2, o.y, ic, fc, 2.4); cx += ic + size * .3; }
    g.font = f; g.fillStyle = fc; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(s, cx, o.y + size * .36);
    g.restore(); return w;
  }
  function tip(g, lt, o) { // белая подсказка с «носиком» к точке x,y; o: s, sub, col, t0, t1, size, below
    const t0 = o.t0 ?? 0, a = vis(lt, t0, o.t1, .2, .15); if (a <= 0) return;
    const s = sp(lt, t0, .45, .55), size = o.size || 34, f = font(size, 700, 'D'), c = col(o.col || P.blue);
    const sw = o.sub ? labelW(g, o.sub, size * .56) : 0, tw = Math.max(mw(g, f, o.s) + size * .9, sw), w = tw + size * 1.1, h = size * (o.sub ? 2.35 : 1.6);
    const by = o.below ? o.y + 20 : o.y - 20 - h, bx = cl(o.x - w / 2, 64, 1016 - w);
    g.save(); g.globalAlpha *= a; g.translate(o.x, o.y); g.scale(.6 + .4 * s, .6 + .4 * s); g.translate(-o.x, -o.y);
    rr(g, bx, by, w, h, 16); g.fillStyle = P.paper; g.fill();
    g.beginPath(); if (o.below) { g.moveTo(o.x - 12, by + 1); g.lineTo(o.x, o.y + 6); g.lineTo(o.x + 12, by + 1); } else { g.moveTo(o.x - 12, by + h - 1); g.lineTo(o.x, o.y - 6); g.lineTo(o.x + 12, by + h - 1); } g.fill();
    let ty = by + size * 1.12; if (o.sub) { label(g, o.sub, bx + size * .55, by + size * .86, { size: size * .56, col: '#5B6478' }); ty = by + size * 1.95; }
    g.fillStyle = c; circ(g, bx + size * .55 + size * .2, ty - size * .34, size * .2); g.fill();
    g.font = f; g.fillStyle = P.dark; g.textAlign = 'left'; g.fillText(o.s, bx + size * 1.15, ty); g.restore();
  }
  function callout(g, lt, o) { // выноска: точка (x,y) → линия → подпись у (tx,ty); o: s, sub, col, t0, al
    const t0 = o.t0 ?? 0, a = vis(lt, t0, o.t1); if (a <= 0) return; const c = col(o.col || P.ink), p = eo(pr(lt, t0, t0 + .35));
    g.save(); g.globalAlpha *= a; g.strokeStyle = rgba(c, .7); g.lineWidth = 2; g.setLineDash([5, 7]); g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(lerp(o.x, o.tx, p), lerp(o.y, o.ty, p)); g.stroke(); g.setLineDash([]);
    g.fillStyle = c; circ(g, o.x, o.y, 6); g.fill();
    if (p > .6) { g.globalAlpha *= pr(p, .6, 1); text(g, o.s, o.tx, o.ty - 6, { size: o.size || 34, w: 700, kind: 'D', col: P.ink, al: o.al }); if (o.sub) label(g, o.sub, o.tx, o.ty + 30, { size: 20, col: c, al: o.al }); }
    g.restore();
  }
  function row(g, lt, o) { // строка таблицы/ленты: o: x, y, w, h, icon, col, s, sub, v (строка), vcol, t0, t1, size, f (доля для мини-полосы)
    const t0 = o.t0 ?? 0, a = vis(lt, t0, o.t1, .26, .18); if (a <= 0) return;
    const s = sp(lt, t0, .5, .7), h = o.h || 104, cy = o.y + h / 2, size = o.size || 44;
    g.save(); g.globalAlpha *= a; g.translate((1 - s) * 80, 0);
    let tx = o.x; if (o.icon) { tile(g, o.icon, o.x, cy - 32, 64, o.col || P.blue); tx += 88; }
    const vw = o.v ? numW(g, o.v, size, 700) : 0;
    text(g, o.s, tx, cy + (o.sub ? -2 : size * .36), { size, w: 600, max: o.x + o.w - tx - vw - 40 });
    if (o.sub) label(g, o.sub, tx, cy + 36, { size: 21, col: P.mute });
    if (o.v) num(g, o.v, o.x + o.w, cy + size * .36, size, { col: o.vcol || P.ink, al: 'right' });
    if (o.f != null) hbar(g, lt, { x: tx, y: cy + 46, w: (o.x + o.w - tx) * .6, h: 8, f: o.f, col: o.vcol || o.col, t0: t0 + .15 });
    g.fillStyle = 'rgba(150,170,220,.08)'; g.fillRect(o.x, o.y + h - 1, o.w, 2); g.restore();
  }
  function legend(g, lt, o) { // строки легенды: o: x, y, w, items [{s, v, sub, col, t0}], size, gap
    const size = o.size || 44, gap = o.gap || size * 2.05;
    o.items.forEach((it, i) => {
      const t0 = it.t0 ?? (o.t0 ?? 0) + i * .12, a = vis(lt, t0, it.t1); if (a <= 0) return;
      const e = sp(lt, t0, .5, .75), yy = o.y + i * gap, c = col(it.col || SER[i % SER.length]);
      g.save(); g.globalAlpha *= a; g.translate((1 - e) * -50, 0);
      rr(g, o.x, yy - size * .52, 14, size * .7, 5); g.fillStyle = c; g.fill(); glow(g, o.x + 7, yy - size * .17, size * .7, c, .35);
      const vw = it.v ? numW(g, it.v, size, 700) : 0;
      text(g, it.s, o.x + 38, yy, { size, w: 600, max: o.w - 38 - vw - (it.sub ? 140 : 0) - 30 });
      if (it.v) num(g, it.v, o.x + o.w, yy, size, { col: it.vcol || P.ink, al: 'right' });
      if (it.sub) label(g, it.sub, o.x + o.w - vw - 26, yy - size * .1, { size: 22, col: c, al: 'right' });
      g.restore();
    });
  }

  // ---------- числа ----------
  function big(g, lt, o) { // крупное число: o: x, y (базовая линия), v, from, at, dur, dec, unit, size, col, ucol, al, odo, plus, max, t0, t1, s
    const t0 = o.t0 ?? 0, a = vis(lt, t0, o.t1, .3, .2); if (a <= 0) return { w: 0, size: 0, x: o.x };
    let v = o.v ?? 0; if (o.from != null) v = count(lt, o.at ?? t0, o.dur ?? 1, o.from, o.v ?? 0);
    let size = o.size || 180; const wt = o.w || 700, unit = o.unit || '', us = o.us || .5;
    const pre = o.plus && (o.v ?? 0) > 0 ? '+' : (o.v ?? 0) < 0 ? '−' : '', s = o.s ?? (pre + fmt(Math.abs(v), o.dec || 0));
    const meas = sz => (o.odo ? odoW(g, o.v ?? v, sz, pre, wt) : numW(g, s, sz, wt)) + (unit ? sz * .14 + mw(g, font(sz * us, wt, 'D'), unit) : 0);
    let tw = meas(size); const max = o.max || 960; if (tw > max) { size *= max / tw; tw = meas(size); }
    const x0 = o.al === 'center' ? o.x - tw / 2 : o.al === 'right' ? o.x - tw : o.x, e = eo(pr(lt, t0, t0 + .32));
    g.save(); g.globalAlpha *= a; g.translate(0, (1 - e) * size * .14);
    const nw = o.odo ? odo(g, v, x0, o.y, size, { to: o.v, pre, col: o.col, w: wt }) : num(g, s, x0, o.y, size, { col: o.col, w: wt });
    if (unit) { g.font = font(size * us, wt, 'D'); g.fillStyle = col(o.ucol || o.col || P.ink); g.globalAlpha *= .8; g.textAlign = 'left'; g.fillText(unit, x0 + nw + size * .14, o.y); }
    g.restore(); return { w: tw, size, x: x0, v };
  }
  function kpi(g, lt, o) { // KPI: подпись капсом + крупное число + бейдж изменения; o как у big + label, ls, delta, dcol, dt
    const t0 = o.t0 ?? 0; if (vis(lt, t0, o.t1) <= 0) return null; const size = o.size || 150;
    if (o.label) { g.save(); g.globalAlpha *= vis(lt, t0, o.t1); label(g, o.label, o.al === 'center' ? o.x : o.al === 'right' ? o.x : o.x, o.y, { size: o.ls || 25, col: P.sub, al: o.al }); g.restore(); }
    const by = o.y + size * .96 + 12, r = big(g, lt, Object.assign({}, o, { y: by, size }));
    if (o.delta) chip(g, lt, { x: o.al === 'center' ? o.x : o.al === 'right' ? o.x : o.x, y: by + 62, s: o.delta, col: o.dcol || P.teal, t0: o.dt ?? t0 + .35, t1: o.t1, al: o.al, size: 25, icon: o.dicon });
    return { bottom: by + (o.delta ? 100 : 24), w: r.w, size: r.size };
  }

  // ---------- графики ----------
  function hbar(g, lt, o) { // горизонтальная полоса: o: x, y (верх), w, h, f 0…1, col, t0, dur, track
    const h = o.h || 14, c = col(o.col || P.blue), p = o.t0 == null ? 1 : spring(pr(lt, o.t0, o.t0 + (o.dur || .7)), .78);
    if (o.track !== false) { rr(g, o.x, o.y, o.w, h, h / 2); g.fillStyle = 'rgba(255,255,255,.06)'; g.fill(); }
    const fw = o.w * cl(o.f, 0, 1.05) * p; if (fw <= 1) return;
    const gr = g.createLinearGradient(o.x, 0, o.x + fw, 0); gr.addColorStop(0, rgba(c, .5)); gr.addColorStop(1, c);
    rr(g, o.x, o.y, fw, h, h / 2); g.fillStyle = gr; g.fill(); if (o.glow !== false) glow(g, o.x + fw - h / 2, o.y + h / 2, h * 2.4, c, .4);
  }
  function stack(g, lt, o) { // составная полоса: o: x, y, w, h, segs [{v, col, t0}], gap, t0
    let acc = 0; const h = o.h || 44, gap = o.gap ?? 6;
    rr(g, o.x, o.y, o.w, h, h * .3); g.fillStyle = 'rgba(255,255,255,.05)'; g.fill();
    o.segs.forEach((s, i) => {
      const t0 = s.t0 ?? (o.t0 ?? 0) + i * .15, p = spring(pr(lt, t0, t0 + .6), .8), sw = o.w * s.v * p - gap, c = col(s.col || SER[i % SER.length]);
      if (sw > 1) { const gr = g.createLinearGradient(0, o.y, 0, o.y + h); gr.addColorStop(0, c); gr.addColorStop(1, rgba(c, .7)); rr(g, o.x + o.w * acc, o.y, sw, h, h * .3); g.fillStyle = gr; g.fill(); }
      acc += s.v;
    });
  }
  function bars(g, lt, o) { // столбики растут пружиной каскадом: o: x, y (верх), w, h, data, max, t0, span, dur, col, cols[], hi, labels, ls, gap, r
    const d = o.data, n = d.length, gk = o.gap ?? .38, bw = o.w / (n + (n - 1) * gk), st = bw * (1 + gk);
    const mx = o.max ?? Math.max(...d) * 1.08, base = o.y + o.h, c0 = col(o.col || P.blue), r = o.r ?? Math.min(14, bw * .3), tops = [];
    for (let i = 0; i < n; i++) {
      const ti = (o.t0 ?? 0) + stag(i, n, o.span ?? .6), p = o.t0 == null ? 1 : spring(pr(lt, ti, ti + (o.dur || .55)), .6);
      const bx = o.x + i * st, full = o.h * d[i] / mx, bh = Math.max(0, full * p), c = o.cols ? col(o.cols[i]) : c0;
      const hi = o.hi === i || (Array.isArray(o.hi) && o.hi.includes(i)); tops.push([bx + bw / 2, base - full]);
      if (bh > 1) {
        const gr = g.createLinearGradient(0, base - bh, 0, base); gr.addColorStop(0, c); gr.addColorStop(1, rgba(c, .2));
        g.beginPath(); g.roundRect(bx, base - bh, bw, bh, [r, r, 3, 3]); g.fillStyle = gr; g.fill();
        g.fillStyle = 'rgba(255,255,255,.38)'; g.fillRect(bx + r * .7, base - bh, Math.max(0, bw - r * 1.4), 2);
        if (hi) glow(g, bx + bw / 2, base - bh, bw * 1.4, c, .5);
      }
      if (o.labels) label(g, o.labels[i], bx + bw / 2, base + 46, { size: o.ls || 22, al: 'center', col: hi ? P.ink : P.mute, track: .08 });
    }
    return { bw, st, tops, base, x: i => o.x + i * st + bw / 2 };
  }
  function area(g, lt, o) { // плавная линия с заливкой, рисуется слева направо: o: x, y, w, h, data, min, max, t0, dur, col, lw, fill, dot, dash
    const d = o.data, n = d.length, c = col(o.col || P.blue), mn = o.min ?? 0, mx = o.max ?? Math.max(...d) * 1.1;
    const p = o.t0 == null ? 1 : eio(pr(lt, o.t0, o.t0 + (o.dur || 1.4))); if (p <= 0) return null;
    const pts = d.map((v, i) => [o.x + o.w * i / (n - 1), o.y + o.h * (1 - (v - mn) / (mx - mn))]);
    const path = () => { g.moveTo(pts[0][0], pts[0][1]); for (let i = 0; i < n - 1; i++) { const a = pts[Math.max(0, i - 1)], b = pts[i], cc = pts[i + 1], e = pts[Math.min(n - 1, i + 2)];
      g.bezierCurveTo(b[0] + (cc[0] - a[0]) / 6, b[1] + (cc[1] - a[1]) / 6, cc[0] - (e[0] - b[0]) / 6, cc[1] - (e[1] - b[1]) / 6, cc[0], cc[1]); } };
    g.save(); g.beginPath(); g.rect(o.x - 12, o.y - 400, o.w * p + 12, o.h + 800); g.clip();
    if (o.fill !== false) { g.beginPath(); path(); g.lineTo(o.x + o.w, o.y + o.h); g.lineTo(o.x, o.y + o.h); g.closePath();
      const gr = g.createLinearGradient(0, o.y, 0, o.y + o.h); gr.addColorStop(0, rgba(c, .34)); gr.addColorStop(1, rgba(c, 0)); g.fillStyle = gr; g.fill(); }
    g.beginPath(); path(); g.strokeStyle = c; g.lineWidth = o.lw || 6; if (o.dash) g.setLineDash(o.dash); g.stroke(); g.setLineDash([]); g.restore();
    const fi = p * (n - 1), i = Math.min(n - 2, Math.floor(fi)), u = fi - i, a = pts[Math.max(0, i - 1)], b = pts[i], cc = pts[i + 1], e = pts[Math.min(n - 1, i + 2)];
    const cr = (q0, q1, q2, q3) => .5 * (2 * q1 + (-q0 + q2) * u + (2 * q0 - 5 * q1 + 4 * q2 - q3) * u * u + (-q0 + 3 * q1 - 3 * q2 + q3) * u * u * u);
    const ex = cr(a[0], b[0], cc[0], e[0]), ey = cr(a[1], b[1], cc[1], e[1]);
    if (o.dot !== false) { glow(g, ex, ey, 50, c, .6); g.fillStyle = P.paper; circ(g, ex, ey, 9); g.fill(); g.lineWidth = 5; g.strokeStyle = c; g.stroke(); }
    return { x: ex, y: ey, pts };
  }
  function grid(g, lt, o) { // пунктирная сетка: o: x, y, w, h, n, labels (сверху вниз), t0
    const a = o.t0 == null ? 1 : ap(lt, o.t0, .4); if (a <= 0) return; const p = o.t0 == null ? 1 : eo(pr(lt, o.t0, o.t0 + .6));
    g.save(); g.globalAlpha *= a; g.setLineDash([4, 10]); g.lineWidth = 1.5; g.strokeStyle = 'rgba(150,170,220,.15)';
    for (let i = 0; i <= o.n; i++) { const yy = o.y + o.h * i / o.n; g.beginPath(); g.moveTo(o.x, yy); g.lineTo(o.x + o.w * p, yy); g.stroke();
      if (o.labels && o.labels[i] != null) label(g, o.labels[i], o.lal === 'left' ? o.x : o.x + o.w, yy - 10, { size: 19, col: P.mute, al: o.lal || 'right', track: .06 }); }
    g.setLineDash([]); g.restore();
  }
  function hline(g, lt, o) { // линия нормы/цели: o: x, y, w, col, s (подпись), t0
    const p = o.t0 == null ? 1 : eo(pr(lt, o.t0, o.t0 + .5)); if (p <= 0) return; const c = col(o.col || P.amber);
    g.save(); g.strokeStyle = c; g.lineWidth = 3; g.setLineDash([12, 10]); g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(o.x + o.w * p, o.y); g.stroke(); g.setLineDash([]);
    if (o.s && p > .5) { g.globalAlpha *= pr(p, .5, 1); label(g, o.s, o.al === 'left' ? o.x : o.x + o.w, o.y - 14, { size: 20, col: c, al: o.al || 'right' }); } g.restore();
  }
  function ring(g, lt, o) { // кольцо-«кошелёк»: o: x, y, r, w, segs [{v, col}], sweep 0…1, gap px, rot, flow, glow, t0, t1, time
    const a = o.t0 == null ? (o.t1 == null ? 1 : vis(lt, -1, o.t1)) : vis(lt, o.t0, o.t1); if (a <= 0) return;
    const sc = o.t0 == null ? 1 : .7 + .3 * sp(lt, o.t0, .6), x = o.x, y = o.y, r = o.r * sc, w = (o.w || r * .2) * sc, tm = o.time ?? T;
    g.save(); g.globalAlpha *= a; if (o.glow !== false) glow(g, x, y, r * 1.45, o.glowCol || P.blue, o.glowA ?? .16);
    g.lineCap = 'butt'; g.lineWidth = w; g.strokeStyle = 'rgba(255,255,255,.06)'; circ(g, x, y, r); g.stroke();
    const a0 = (o.rot ?? -90) * DEG, sw = o.sweep ?? 1, gA = (o.gap ?? 6) / r; let acc = 0;
    o.segs.forEach((s, si) => {
      const v = Math.max(0, s.v), s0 = acc, s1 = acc + v; acc = s1;
      const e0 = Math.min(s0, sw), e1 = Math.min(s1, sw); if (e1 - e0 <= 1e-4) return;
      const A0 = a0 + e0 * TAU + gA / 2, A1 = a0 + e1 * TAU - gA / 2; if (A1 <= A0) return; const c = col(s.col || SER[si % SER.length]);
      g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.arc(x, y, r, A0, A1); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = Math.max(1.5, w * .05); g.beginPath(); g.arc(x, y, r - w / 2 + w * .08, A0, A1); g.stroke();
      if (o.flow) {
        const np = Math.round((A1 - A0) / TAU * 70 * o.flow); g.save(); g.globalCompositeOperation = 'lighter';
        for (let j = 0; j < np; j++) { const h1 = hash(j * 7.31 + si * 31.7), u = (h1 + tm * (.04 + .05 * hash(j + si * 3))) % 1, an = A0 + u * (A1 - A0), rad = r + (hash(j * 2.3 + si) - .5) * w * .66;
          spark(g, x + Math.cos(an) * rad, y + Math.sin(an) * rad, (1.5 + 2.8 * hash(j * 1.7 + si)) * Math.max(.45, w / 60), c, .5 + .5 * Math.abs(Math.sin(tm * 3 + j))); }
        g.restore();
      }
    });
    g.lineCap = 'round'; g.restore();
  }
  function sankey(g, lt, o) { // поток денег с частицами: o: x0, y0, h0 (источник), x1, y1, h1 (цели), nodes [{v, col, s, sub}], nw, gap, t0, dur, hi, hiP, flow, ls, labels
    const N = o.nodes, n = N.length, nw = o.nw || 16, gap = o.gap ?? 22, t0 = o.t0 ?? 0, dur = o.dur || 1, tot = N.reduce((s, d) => s + d.v, 0);
    const y1 = o.y1 ?? o.y0, h1 = o.h1 ?? o.h0, av = h1 - gap * (n - 1), xa = o.x0 + nw, xb = o.x1, mx = (xa + xb) / 2, geo = [];
    let sy = o.y0, ty = y1; N.forEach(d => { const sh = o.h0 * d.v / tot, th = av * d.v / tot; geo.push({ sy, sh, ty, th, d, c: col(d.col) }); sy += sh; ty += th + gap; });
    const out = geo.map(G => ({ x: xb, y: G.ty, h: G.th, cy: G.ty + G.th / 2, c: G.c, sx: o.x0, sy: G.sy, sh: G.sh }));
    const sa = ap(lt, t0, .35); if (sa <= 0) return out;
    const hp = o.hi == null ? 0 : (o.hiP ?? 1);
    g.save(); g.globalAlpha *= sa; const sgr = g.createLinearGradient(0, o.y0, 0, o.y0 + o.h0); sgr.addColorStop(0, P.sky); sgr.addColorStop(1, P.blue);
    const shh = o.h0 * eo(sa); rr(g, o.x0, o.y0 + (o.h0 - shh) / 2, nw, shh, 5); g.fillStyle = sgr; g.fill(); glow(g, o.x0 + nw / 2, o.y0 + o.h0 / 2, Math.min(170, o.h0 * .2), P.blue, .3); g.restore();
    geo.forEach((G, i) => {
      const bt = t0 + .15 + i * .09, bp = eo(pr(lt, bt, bt + dur)); if (bp <= 0) return;
      const isH = i === o.hi, on = o.hi == null ? 1 : isH ? 1 : 1 - .8 * hp;
      g.save(); g.beginPath(); g.rect(xa - 2, 0, (xb - xa + 4) * bp, H); g.clip();
      g.beginPath(); g.moveTo(xa, G.sy); g.bezierCurveTo(mx, G.sy, mx, G.ty, xb, G.ty); g.lineTo(xb, G.ty + G.th); g.bezierCurveTo(mx, G.ty + G.th, mx, G.sy + G.sh, xa, G.sy + G.sh); g.closePath();
      const gr = g.createLinearGradient(xa, 0, xb, 0); gr.addColorStop(0, rgba(isH ? G.c : P.blue, (.2 + (isH ? .22 * hp : 0)) * on)); gr.addColorStop(1, rgba(G.c, (.42 + (isH ? .22 * hp : 0)) * on));
      g.fillStyle = gr; g.fill();
      const np = Math.round((o.flow ?? 1) * (6 + 74 * G.d.v / tot) * (isH ? 1 + .6 * hp : on)); g.globalCompositeOperation = 'lighter';
      for (let j = 0; j < np; j++) {
        const h1 = hash(i * 97.3 + j * 13.17), h2 = hash(i * 31.1 + j * 7.73 + 5), u = (h1 + T * (.08 + .1 * h2) * (isH ? 1 + .9 * hp : 1)) % 1; if (u > bp) continue;
        const v = .12 + .76 * hash(j * 3.31 + i * 1.7), yt = bez(G.sy, G.sy, G.ty, G.ty, u), yb = bez(G.sy + G.sh, G.sy + G.sh, G.ty + G.th, G.ty + G.th, u);
        spark(g, bez(xa, mx, mx, xb, u), lerp(yt, yb, v), 1.8 + 3.4 * hash(j * 1.9 + i), G.c, (.45 + .55 * Math.abs(Math.sin(T * 3 + j * 1.3))) * on);
      }
      g.restore();
      const na = ap(lt, bt + dur * .6, .3); if (na <= 0) return;
      g.save(); g.globalAlpha *= na * (.35 + .65 * on); rr(g, xb, G.ty, nw, G.th, 4); g.fillStyle = G.c; g.fill();
      if (isH) glow(g, xb + nw / 2, G.ty + G.th / 2, Math.min(150, Math.max(60, G.th * .6)), G.c, .55 * hp);
      if (o.labels !== false && G.d.s) { const ls = o.ls || 40, lx = xb + nw + 22, ly = G.ty + G.th / 2 + ls * .36, vw = G.d.sub ? numW(g, G.d.sub, ls * .92) + 16 : 0;
        text(g, G.d.s, lx, ly, { size: ls, w: 600, col: P.ink, max: 1020 - lx - vw }); if (G.d.sub) num(g, G.d.sub, 1020, ly, ls * .92, { col: G.c, al: 'right' }); }
      g.restore();
    });
    return out;
  }
  function waffle(g, lt, o) { // сетка 10×10 «из чего состоит 100 %»: o: x, y, cols, rows, cell, gap, r, groups [{n, col, t0, dur, a}]
    const cols = o.cols || 10, rows = o.rows || 10, cell = o.cell || 72, gap = o.gap ?? 10, r = o.r ?? cell * .2, own = []; let idx = 0;
    (o.groups || []).forEach(G => { for (let j = 0; j < G.n; j++) own[idx++] = [G, j]; });
    const at = i => [o.x + (i % cols) * (cell + gap) + cell / 2, o.y + Math.floor(i / cols) * (cell + gap) + cell / 2];
    const ea = o.t0 == null ? 1 : ap(lt, o.t0, .4); g.save(); g.globalAlpha *= ea; g.fillStyle = 'rgba(255,255,255,.035)'; g.strokeStyle = 'rgba(160,180,230,.08)'; g.lineWidth = 1.5;
    for (let i = 0; i < cols * rows; i++) { const [cx, cy] = at(i); rr(g, cx - cell / 2, cy - cell / 2, cell, cell, r); g.fill(); g.stroke(); }
    g.restore();
    for (let i = 0; i < cols * rows; i++) {
      const ow = own[i]; if (!ow) continue; const [G, j] = ow, ti = (G.t0 ?? 0) + stag(j, G.n, G.dur ?? .5), s = spring(pr(lt, ti, ti + .42), .55); if (s <= 0) continue;
      const [cx, cy] = at(i), c = col(G.col), ss = cell * s;
      g.save(); g.globalAlpha *= cl(pr(lt, ti, ti + .14)) * (G.a ?? 1); rr(g, cx - ss / 2, cy - ss / 2, ss, ss, r * s); g.fillStyle = c; g.fill();
      g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(cx - ss / 2 + r * s, cy - ss / 2, Math.max(0, ss - 2 * r * s), 2.5);
      g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(cx - ss / 2 + r * s, cy + ss / 2 - 5 * s, Math.max(0, ss - 2 * r * s), 5 * s); g.restore();
    }
    return { at, w: cols * (cell + gap) - gap, h: rows * (cell + gap) - gap };
  }
  function heat(g, lt, o) { // тепловая карта: o: x, y, cols, rows, cell, gap, vals (0…1 построчно), col, t0, span
    const cols = o.cols, cell = o.cell || 60, gap = o.gap ?? 6, c = col(o.col || P.teal);
    o.vals.forEach((v, i) => { const ti = (o.t0 ?? 0) + stag(i, o.vals.length, o.span ?? .6), a = ap(lt, ti, .3); if (a <= 0) return;
      const x = o.x + (i % cols) * (cell + gap), y = o.y + Math.floor(i / cols) * (cell + gap); rr(g, x, y, cell, cell, 8); g.fillStyle = rgba(c, (.06 + .8 * v) * a); g.fill(); });
  }
  function slider(g, lt, o) { // ползунок «что если»: o: x, y (центр), w, f или from→to с at/dur, col, t0, t1 → {f, kx}
    let f = o.f ?? 1; if (o.to != null) f = lerp(o.from ?? 1, o.to, eio(pr(lt, o.at ?? 0, (o.at ?? 0) + (o.dur ?? .7))));
    const a = vis(lt, o.t0 ?? 0, o.t1), kx = o.x + o.w * f; if (a <= 0) return { f, kx }; const c = col(o.col || P.blue);
    g.save(); g.globalAlpha *= a; rr(g, o.x, o.y - 8, o.w, 16, 8); g.fillStyle = 'rgba(255,255,255,.08)'; g.fill();
    for (let i = 0; i <= 4; i++) { g.fillStyle = 'rgba(160,180,230,.28)'; g.fillRect(o.x + o.w * i / 4 - 1, o.y + 22, 2, 12); }
    const gr = g.createLinearGradient(o.x, 0, kx, 0); gr.addColorStop(0, rgba(c, .45)); gr.addColorStop(1, c); rr(g, o.x, o.y - 8, kx - o.x, 16, 8); g.fillStyle = gr; g.fill();
    glow(g, kx, o.y, 70, c, .45); g.fillStyle = P.paper; circ(g, kx, o.y, 26); g.fill(); g.lineWidth = 6; g.strokeStyle = c; g.stroke(); g.restore();
    return { f, kx };
  }

  // ---------- частицы-деньги ----------
  function spray(g, lt, o) { // разлёт частиц: o.from — [x,y,угол] или функция(время рождения) → [x,y,угол]; n, t0, t1, life, speed, spread, col/cols, size, grav, seed
    const n = o.n || 60, life = o.life || 1.1, spd = o.speed || 520, t0 = o.t0 ?? 0, t1 = o.t1 ?? t0 + 2, sd = o.seed || 0;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const tb = t0 + (t1 - t0) * (i + hash(i * 1.37 + sd)) / n, age = lt - tb; if (age < 0 || age > life) continue;
      const q = age / life, fr = typeof o.from === 'function' ? o.from(tb) : o.from; if (!fr) continue;
      const ang = (fr[2] + (hash(i * 3.1 + sd) - .5) * 2 * (o.spread ?? 30)) * DEG + (hash(i * 5.7 + sd) - .5) * 1.4 * q;
      const dd = spd * life * eo(q) * (.55 + .7 * hash(i * 9.2 + sd)), c = o.cols ? o.cols[i % o.cols.length] : (fr[3] || o.col || P.lav);
      spark(g, fr[0] + Math.cos(ang) * dd, fr[1] + Math.sin(ang) * dd + (o.grav || 0) * age * age, (o.size || 4) * (1 - q * .45) * (.6 + .8 * hash(i * 2.9 + sd)), c, Math.pow(1 - q, 1.3));
    }
    g.restore();
  }
  function stream(g, lt, o) { // поток частиц из точки в точку по дуге: o: from [x,y], to [x,y], bend, n, t0, t1, travel, col, size, spread
    const n = o.n || 40, tr = o.travel || .9, t0 = o.t0 ?? 0, t1 = o.t1 ?? t0 + 1, [ax, ay] = o.from, [bx, by] = o.to;
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const tb = t0 + (t1 - t0) * (i + hash(i * 2.11)) / n, u = (lt - tb) / tr; if (u < 0 || u > 1) continue;
      const e = eio(u), b = (o.bend ?? 120) * (.6 + .8 * hash(i * 4.3)), cx = (ax + bx) / 2 + nx * b, cy = (ay + by) / 2 + ny * b;
      const v = 1 - e, x = v * v * ax + 2 * v * e * cx + e * e * bx, y = v * v * ay + 2 * v * e * cy + e * e * by, sp_ = (hash(i * 6.1) - .5) * (o.spread ?? 26) * Math.sin(Math.PI * e);
      spark(g, x + nx * sp_, y + ny * sp_, (o.size || 4) * (.6 + .8 * hash(i * 3.7)), o.col || P.sky, Math.sin(Math.PI * u) * 1.1);
    }
    g.restore();
  }
  function scan(g, lt, o) { // вертикальный луч-сканер проходит область: o: x, y, w, h, t0, dur, col
    const q = pr(lt, o.t0 ?? 0, (o.t0 ?? 0) + (o.dur || 1)); if (q <= 0 || q >= 1) return; const c = col(o.col || P.sky), sx = o.x + o.w * eio(q);
    g.save(); const gr = g.createLinearGradient(sx - 140, 0, sx, 0); gr.addColorStop(0, rgba(c, 0)); gr.addColorStop(1, rgba(c, .16 * Math.sin(Math.PI * q)));
    g.fillStyle = gr; g.fillRect(Math.max(o.x, sx - 140), o.y, Math.min(140, sx - o.x), o.h); g.fillStyle = rgba(c, .85 * Math.sin(Math.PI * q)); g.fillRect(sx - 1.5, o.y, 3, o.h); g.restore();
  }

  // ---------- события: штамп, уведомление, метка, касание ----------
  function seal(g, lt, o) { // штамп статуса: пилюля с иконкой «впечатывается» пружиной, расходится кольцо; o: x, y, s, col, icon, t0, size, rot
    const t0 = o.t0 ?? 0; if (lt < t0) return; const size = o.size || 44, c = col(o.col || P.teal), s = String(o.s).toUpperCase();
    const tw = labelW(g, s, size, .1, 800), h = size * 2, w = tw + h + size * 1.1, k = lerp(1.65, 1, spring(pr(lt, t0, t0 + .45), .5)), a = ap(lt, t0, .12) * (o.t1 != null ? 1 - eo(pr(lt, o.t1, o.t1 + .2)) : 1);
    if (a <= 0) return; const q = pr(lt, t0 + .06, t0 + .8);
    g.save(); g.globalAlpha *= a; g.translate(o.x, o.y); if (o.rot) g.rotate(o.rot * DEG);
    if (q > 0 && q < 1) { const e = 1 + .45 * eo(q); rr(g, -w / 2 * e, -h / 2 * e, w * e, h * e, h / 2 * e); g.lineWidth = 3; g.strokeStyle = rgba(c, .6 * (1 - q)); g.stroke(); }
    g.scale(k, k); glow(g, 0, 0, w * .6, c, .22);
    rr(g, -w / 2, -h / 2, w, h, h / 2); g.fillStyle = rgba(c, .16); g.fill(); g.lineWidth = 3; g.strokeStyle = c; g.stroke();
    rr(g, -w / 2 + 7, -h / 2 + 7, w - 14, h - 14, h / 2 - 7); g.lineWidth = 1.5; g.strokeStyle = rgba(c, .35); g.stroke();
    const ix = -w / 2 + h / 2 + 6; g.fillStyle = c; circ(g, ix, 0, h * .3); g.fill(); icon(g, o.icon || 'check', ix, 0, h * .36, P.dark, 3.2);
    label(g, s, ix + h * .3 + size * .45, size * .36, { size, col: c, w: 800, track: .1 }); g.restore();
  }
  function toast(g, lt, o) { // уведомление выезжает сверху: o: x, y, w, s, sub, col, icon, t0, t1
    const t0 = o.t0 ?? 0, a = vis(lt, t0, o.t1, .25, .18); if (a <= 0) return;
    const s = sp(lt, t0, .55), x = o.x ?? 60, w = o.w ?? 960, h = o.sub ? 136 : 108, y = o.y, c = col(o.col || P.red);
    g.save(); g.globalAlpha *= a; g.translate(0, (1 - s) * -90);
    rr(g, x, y, w, h, 26); g.fillStyle = '#161C2E'; g.fill(); g.lineWidth = 2; g.strokeStyle = rgba(c, .55); g.stroke();
    rr(g, x, y + 18, 6, h - 36, 3); g.fillStyle = c; g.fill(); tile(g, o.icon || 'alert', x + 30, y + h / 2 - 32, 64, c);
    text(g, o.s, x + 118, y + (o.sub ? 60 : h / 2 + 15), { size: 40, w: 700, kind: 'D', max: w - 150 });
    if (o.sub) text(g, o.sub, x + 118, y + 106, { size: 28, w: 500, col: P.sub, max: w - 150 }); g.restore();
  }
  function ping(g, lt, o) { // метка-аномалия: точка с бегущими кольцами; o: x, y, col, t0, r
    const t0 = o.t0 ?? 0; if (lt < t0) return; const c = col(o.col || P.red), r = o.r || 12, s = spring(pr(lt, t0, t0 + .4), .45);
    for (let k = 0; k < 2; k++) { const q = (((lt - t0) * .9 + k * .5) % 1); g.lineWidth = 3; g.strokeStyle = rgba(c, .55 * (1 - q)); circ(g, o.x, o.y, r * (1 + q * 2.6)); g.stroke(); }
    glow(g, o.x, o.y, r * 5, c, .4); g.fillStyle = c; circ(g, o.x, o.y, r * s); g.fill(); g.fillStyle = P.paper; circ(g, o.x, o.y, r * .4 * s); g.fill();
  }
  function tap(g, lt, o) { // касание пальцем: нажатие и круг-волна; o: x, y, t0
    const q = pr(lt, o.t0 ?? 0, (o.t0 ?? 0) + .6); if (q <= 0 || q >= 1) return; const pp = q < .3 ? eo(q / .3) : 1 - eo((q - .3) / .7);
    g.save(); g.fillStyle = 'rgba(255,255,255,' + (.2 * pp).toFixed(3) + ')'; circ(g, o.x, o.y, 36); g.fill();
    g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,' + (.6 * pp).toFixed(3) + ')'; circ(g, o.x, o.y, 30 + 6 * pp); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,' + (.45 * (1 - q)).toFixed(3) + ')'; circ(g, o.x, o.y, 34 + 76 * eo(q)); g.stroke(); g.restore();
  }

  // ---------- оболочка приложения: шапка и вкладки ----------
  function header(g, o = {}) { // слот героя (SLOT), подпись + заголовок/значение, справа период и статус
    if (o.slot !== false) { g.save(); g.setLineDash([5, 9]); g.lineWidth = 2; g.strokeStyle = 'rgba(150,175,230,.25)'; circ(g, SLOT.x, SLOT.y, SLOT.r); g.stroke(); g.restore(); }
    const tx = o.x ?? 188; label(g, o.crumb || '', tx, 148, { size: 23, col: P.mute, max: 460 });
    if (o.title != null) { if (o.num) num(g, o.title, tx, 207, 52, { col: o.titleCol || P.ink }); else text(g, o.title, tx, 207, { size: 52, w: 700, kind: 'D', max: 460, col: o.titleCol }); }
    if (o.period) {
      const tw = labelW(g, o.period, 23), w = tw + 88, x0 = 1020 - w, y0 = 120, fl = o.periodAt != null ? pr(T, o.periodAt, o.periodAt + .4) : 1, sc = .55 + .45 * spring(fl, .55);
      g.save(); g.translate(0, y0 + 26); g.scale(1, sc); g.translate(0, -(y0 + 26)); g.globalAlpha *= eo(fl * 1.6);
      rr(g, x0, y0, w, 52, 14); g.fillStyle = 'rgba(255,255,255,.045)'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = 'rgba(150,170,220,.22)'; g.stroke();
      icon(g, 'calendar', x0 + 32, y0 + 26, 26, P.sub, 2); label(g, o.period, x0 + 58, y0 + 34, { size: 23, col: P.ink }); g.restore();
    }
    if (o.status) {
      const c = col(o.statusCol || P.teal), w = labelW(g, o.status, 22), st = o.statusAt != null ? pr(T, o.statusAt, o.statusAt + .3) : 1;
      g.save(); g.globalAlpha *= eo(st); label(g, o.status, 1020, 211, { size: 22, col: c, al: 'right' });
      const dx = 1020 - w - 20; glow(g, dx, 203, 24, c, .35 + .3 * Math.sin(T * 5)); g.fillStyle = c; circ(g, dx, 203, 6); g.fill(); g.restore();
    }
  }
  function tabs(g, o) { // вкладки-пилюли; активная ездит пружиной; o: items, at [[t, индекс], …] (секунды ролика), y
    const items = o.items, y = o.y ?? 264, size = o.size || 26, f = font(size, 600), pad = 24, gp = 8;
    const ws = items.map(s => mw(g, f, s) + pad * 2), xs = []; let acc = 0; ws.forEach(w => { xs.push(acc); acc += w + gp; }); const tot = acc - gp;
    const at = o.at || [[0, 0]], fi = step(at, T, .5, p => spring(p, .72)), i0 = cl(Math.floor(fi), 0, items.length - 1), i1 = Math.min(items.length - 1, i0 + 1), fr = cl(fi - i0);
    const ix = lerp(xs[i0], xs[i1], fr), iw = lerp(ws[i0], ws[i1], fr), off = cl(ix + iw / 2 - 480, 0, Math.max(0, tot - 960));
    g.save(); g.beginPath(); g.rect(60, y - 36, 960, 72); g.clip(); g.translate(60 - off, 0);
    rr(g, ix, y - 28, iw, 56, 28); g.fillStyle = 'rgba(77,141,255,.16)'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = 'rgba(77,141,255,.55)'; g.stroke();
    g.font = f; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    items.forEach((s, i) => { g.fillStyle = mixc(P.mute, P.ink, 1 - cl(Math.abs(fi - i))); g.fillText(s, xs[i] + ws[i] / 2, y + size * .36); });
    g.restore(); g.textAlign = 'left';
    const fade = (x0, dir) => { const gr = g.createLinearGradient(x0, 0, x0 + 90 * dir, 0); gr.addColorStop(0, rgba('#0A0F1D', 1)); gr.addColorStop(1, rgba('#0A0F1D', 0)); g.fillStyle = gr; g.fillRect(Math.min(x0, x0 + 90 * dir), y - 36, 90, 72); };
    if (off > 1) fade(60, 1); if (off < tot - 961) fade(1020, -1); // края полосы вкладок гаснут, а не режутся
    g.fillStyle = 'rgba(140,160,215,.13)'; g.fillRect(0, y + 41, W, 2);
    for (let j = 1; j < at.length; j++) { const [tt, ii] = at[j]; if (T >= tt && T < tt + .6) tap(g, T - tt, { x: 60 - off + xs[ii] + ws[ii] / 2, y, t0: 0 }); }
  }

  return { W, H, P, F, SER, SAFE, TOP, SLOT, get cur() { return CUR; }, get t() { return T; },
    cl, pr, lerp, eo, eo5, ei, eio, spring, sp, ap, vis, hash, rnd, stag, mix, kf, step, fly, count, fmt, rub,
    col, rgba, mixc, glow, spark, rr, circ, bez,
    begin, finish, run,
    font, mw, label, labelW, text, num, numW, odo, words,
    icon, tile, avatar, panel, card, chip, tip, callout, row, legend,
    big, kpi, hbar, stack, bars, area, grid, hline, ring, sankey, waffle, heat, slider,
    spray, stream, scan, seal, toast, ping, tap, header, tabs, ICONS: Object.keys(IC) };
})();
