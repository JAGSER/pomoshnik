// «Дашборд» (DASH) — библиотека стиля «живой финансовый дашборд» для роликов draw(t, k) на Canvas 2D 1080×1920.
// Одна глобальная константа DASH. Работает в Web Worker: только OffscreenCanvas, без DOM, сети, Math.random и Date.
// Кадр считается только из t. lt — секунды от начала сцены; t0/t1/at у элементов — секунды сцены. Углы — в градусах.
const DASH = (() => {
  const W = 1080, H = 1920, TAU = Math.PI * 2, DEG = Math.PI / 180;
  const P = { bg: '#070B14', panel: '#0D1322', panel2: '#131B2E', line: '#1D2840', ink: '#EEF2FA', sub: '#A3AEC4', mute: '#6B7791',
    faint: '#3A4560', blue: '#4D8DFF', sky: '#86B6FF', violet: '#9C86F7', lav: '#C2BCFF', teal: '#34D8A6', mint: '#8CEBCB',
    red: '#FF5C7A', coral: '#FF8EA0', amber: '#F6C350', orange: '#FF8A4C', cyan: '#45C6F0', navy: '#020A24', paper: '#F4F7FC', dark: '#0A1222',
    // цвета мира (для названных в тексте цветов): розовый, жёлтый, зелёный, коричневый, рыжий, серый, белый, дерево, мел
    pink: '#FF8DC7', yellow: '#FFD23F', green: '#5CD178', brown: '#A06E4A', rust: '#E8793A', gray: '#8E99B0', white: '#F4F7FC', wood: '#7A5236', chalk: '#17352E' };
  const SKIN = ['#F1C7A5', '#D9A07A', '#A86D4A', '#6B442E'], HAIR = ['#5B3A26', '#2A2018', '#C98A4B', '#8A5A3A'];
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

  // ---------- мир: типовые объекты ----------
  // Язык стиля: непрозрачная подложка (фигуры не просвечивают и не сливаются) + тон цвета + контур 3 px того же цвета.
  // Все координаты в px кадра, y — земля/опорная линия. Цвет — параметр (имя из P или '#hex'). t — время для анимации (по умолчанию время ролика).
  function ink(g, c, o = {}) { // залить и обвести текущий путь
    c = col(c); if (o.base !== false) { g.fillStyle = o.base || P.panel; g.fill(); }
    if (o.fa !== 0) { g.fillStyle = o.solid ? c : rgba(c, o.fa ?? .2); g.fill(); }
    if (o.lw !== 0) { g.strokeStyle = o.stroke ? col(o.stroke) : c; g.lineWidth = o.lw || 3; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }
  }
  function seg(g, pts, w, c) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.strokeStyle = col(c); g.lineWidth = Math.max(2, w); g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); }
  const at = (p, a, L) => [p[0] + Math.sin(a * DEG) * L, p[1] + Math.cos(a * DEG) * L]; // a: 0 вниз, 90 вправо, 180 вверх
  function ik(h, f, L1, L2, side) { // колено/локоть между h и f
    const dx = f[0] - h[0], dy = f[1] - h[1], dist = Math.hypot(dx, dy) || 1, D = Math.min(dist, L1 + L2 - .01), a = (L1 * L1 - L2 * L2 + D * D) / (2 * D), q = Math.sqrt(Math.max(0, L1 * L1 - a * a)), ux = dx / dist, uy = dy / dist;
    return [h[0] + ux * a - uy * q * side, h[1] + uy * a + ux * q * side];
  }
  function pop(g, lt, t0, x, y, fn, d = .55) { // появление объекта пружиной из точки x,y (ноги, земля) в момент t0 сцены
    const a = ap(lt, t0, .22); if (a <= 0) return; const s = .45 + .55 * sp(lt, t0, d, .6);
    g.save(); g.globalAlpha *= a; g.translate(x, y); g.scale(s, s); g.translate(-x, -y); fn(g); g.restore();
  }
  // --- человек ---
  function dims(h, kind) { const ch = kind === 'child'; return { Lg: h * (ch ? .4 : .45), Tl: h * (ch ? .29 : .31), hr: h * (ch ? .1 : .074), lw: Math.max(3, h * (ch ? .07 : .062)), aw: Math.max(3, h * .05), tw: h * (ch ? .17 : .18), hw: h * .15 }; }
  function headDraw(g, x, y, r, o, d) {
    const old = o.kind === 'old', skin = col(o.skin || SKIN[0]), hair = col(o.hair || (old ? '#D9DEE8' : HAIR[0])), hs = o.hairStyle || (old ? 'bun' : 'short');
    if (hs === 'long' && !o.helmet) { g.fillStyle = hair; [-1, 1].forEach(e => { rr(g, x + e * r * .78 - r * .32, y - r * .5, r * .64, r * 1.75, r * .3); g.fill(); }); }
    circ(g, x, y, r); g.fillStyle = skin; g.fill(); g.lineWidth = 2; g.strokeStyle = mixc(skin, P.bg, .4); g.stroke();
    if (o.helmet) { g.beginPath(); g.arc(x, y - r * .05, r * 1.16, Math.PI, 0); g.closePath(); g.fillStyle = col(o.helmet); g.fill(); g.fillRect(x - r * 1.45, y - r * .12, r * 2.9, r * .26); }
    else if (hs !== 'bald') {
      const a0 = Math.PI - .28, a1 = .28; g.beginPath(); g.arc(x, y, r * 1.07, a0, Math.PI * 2 + a1); g.quadraticCurveTo(x + d * r * .2, y - r * .45, x + Math.cos(a0) * r * 1.07, y + Math.sin(a0) * r * 1.07); g.fillStyle = hair; g.fill();
      if (hs === 'bun') { circ(g, x - d * r * .2, y - r * 1.15, r * .42); g.fill(); }
    }
    if (o.hat) { g.fillStyle = col(o.hat); g.beginPath(); g.arc(x, y - r * .3, r * 1.02, Math.PI, 0); g.fill(); g.fillRect(x - r * (d > 0 ? .9 : 1.6), y - r * .38, r * 2.5, r * .2); }
    if (r > 6) { g.fillStyle = '#1A2030'; const ey = y + r * .12, ex = d * r * .12, er = Math.max(1.4, r * .11);
      if (o.sleep) { g.strokeStyle = '#1A2030'; g.lineWidth = Math.max(1.5, r * .08); [-1, 1].forEach(k => { g.beginPath(); g.arc(x + ex + k * r * .36, ey, r * .16, .2, Math.PI - .2); g.stroke(); }); }
      else { circ(g, x + ex - r * .36, ey, er); g.fill(); circ(g, x + ex + r * .36, ey, er); g.fill(); }
      if (o.glasses || (old && o.glasses !== false)) { g.strokeStyle = '#2A3248'; g.lineWidth = Math.max(1.5, r * .07); [-1, 1].forEach(k => { circ(g, x + ex + k * r * .36, ey, r * .25); g.stroke(); }); }
      if (o.mouth) { g.strokeStyle = '#5A2A2A'; g.lineWidth = Math.max(1.5, r * .08); circ(g, x + ex, y + r * .52, r * .14); g.stroke(); } }
  }
  function itemDraw(g, it, x, y, s, c) { // предмет в руках: имя или функция (g, x, y, s)
    if (typeof it === 'function') return it(g, x, y, s); c = col(c || P.paper);
    if (it === 'book') { g.beginPath(); g.moveTo(x, y - s * .28); g.lineTo(x - s * .55, y - s * .4); g.lineTo(x - s * .55, y + s * .22); g.lineTo(x, y + s * .32); g.lineTo(x + s * .55, y + s * .22); g.lineTo(x + s * .55, y - s * .4); g.closePath(); ink(g, c, { fa: .45, lw: 2.5 }); seg(g, [[x, y - s * .28], [x, y + s * .32]], 2, c); }
    else if (it === 'bag') { rr(g, x - s * .35, y - s * .2, s * .7, s * .6, 4); ink(g, c, { fa: .45, lw: 2.5 }); g.beginPath(); g.arc(x, y - s * .2, s * .16, Math.PI, 0); g.strokeStyle = c; g.lineWidth = 2.5; g.stroke(); }
    else if (it === 'box') { rr(g, x - s * .4, y - s * .35, s * .8, s * .65, 3); ink(g, c, { fa: .45, lw: 2.5 }); seg(g, [[x, y - s * .35], [x, y + s * .3]], 2, c); }
    else if (it === 'cup') { rr(g, x - s * .2, y - s * .2, s * .4, s * .42, 5); ink(g, c, { fa: .5, lw: 2.5 }); }
    else if (it === 'phone') { rr(g, x - s * .16, y - s * .3, s * .32, s * .56, 5); ink(g, c, { fa: .5, lw: 2.5 }); }
    else if (it === 'flag') { seg(g, [[x, y + s * .3], [x, y - s * .9]], 3, P.sub); g.beginPath(); g.moveTo(x, y - s * .9); g.lineTo(x + s * .6, y - s * .75); g.lineTo(x, y - s * .55); g.closePath(); ink(g, c, { fa: .7, lw: 2 }); }
    else if (it === 'ball') { circ(g, x, y, s * .3); ink(g, c, { fa: .5, lw: 2.5 }); }
  }
  // человек: x, y — точка между ступнями. o: kind 'adult'|'child'|'old', h (рост px), pose 'stand'|'walk'|'run'|'wave'|'sit'|'hold'|'dance',
  // dir 1|-1 (куда смотрит), shirt, pants, skin, hair, hairStyle 'short'|'long'|'bun'|'bald', dress (платье), helmet (каска, цвет), hat, bag (рюкзак, цвет),
  // item (book|bag|box|cup|phone|flag|ball|функция), itemCol, cane (трость), glasses, sleep, mouth, t, ph (сдвиг фазы шага). Возвращает {head, hand, top}.
  function person(g, x, y, o = {}) {
    const kind = o.kind || 'adult', ch = kind === 'child', old = kind === 'old', h = o.h || (ch ? 190 : old ? 280 : 300), d = o.dir || 1, D = dims(h, kind);
    const pose = o.pose || 'stand', tm = o.t ?? T, run = pose === 'run', walk = pose === 'walk' || run, ph = (o.ph || 0) + tm * (run ? 10 : 6.5);
    const shirt = col(o.shirt || o.col || P.blue), pants = col(o.pants || '#4A5B88'), skin = col(o.skin || SKIN[0]), shoe = '#1C2235', bk = c => mixc(c, P.bg, .4);
    const L1 = D.Lg * .52, L2 = D.Lg * .5, A1 = D.Tl * .56, A2 = D.Tl * .54, sit = pose === 'sit', dance = pose === 'dance';
    const bob = walk ? -Math.abs(Math.cos(ph)) * h * .02 : dance ? -Math.abs(Math.sin(tm * 6 + (o.ph || 0))) * h * .045 : 0;
    const hip = [x, sit ? y - D.Lg * .52 : y - D.Lg + bob], lean = (run ? 12 : old ? 10 : pose === 'walk' ? 3 : 0) * d, sh = at(hip, 180 - lean, D.Tl);
    const legs = [], arms = [];
    for (let k = 0; k < 2; k++) { // k=0 дальняя, k=1 ближняя
      const sd = k ? 1 : -1, hp = [hip[0] + sd * D.hw * .22, hip[1]];
      if (walk) { const p = ph + k * Math.PI, amp = run ? 42 : 26, th = d * amp * Math.sin(p), kn = at(hp, th, L1); legs.push([hp, kn, at(kn, th - d * (run ? 75 : 38) * Math.max(0, Math.cos(p)), L2)]); }
      else if (sit) { const kn = [hp[0] + d * L1, hp[1]]; legs.push([hp, kn, [kn[0], kn[1] + L2]]); }
      else if (dance) { const sp_ = sd * (10 + 9 * Math.sin(tm * 6 + (o.ph || 0) + k)), kn = at(hp, sp_ * 1.4, L1); legs.push([hp, kn, at(kn, sp_ * .4, L2)]); }
      else { const f = [x + sd * h * .05, y], kn = ik(hp, f, L1, L2, -sd * .2); legs.push([hp, kn, f]); }
      const so = [sh[0] + sd * D.tw * .42, sh[1] + D.aw * .5];
      let u, f;
      if (walk) { const p = ph + k * Math.PI; u = -d * (run ? 50 : 24) * Math.sin(p); f = u + d * (run ? 85 : 22); }
      else if (dance) { u = sd * (140 + 18 * Math.sin(tm * 6 + k * 2 + (o.ph || 0))); f = u + sd * 18; }
      else if (pose === 'wave' && sd === d) { u = d * 150; f = d * (168 + 26 * Math.sin(tm * 9 + (o.ph || 0))); }
      else if (pose === 'hold' || (sit && o.item)) { u = sd * 6; f = -sd * 72; }
      else if (sit) { u = d * 25; f = d * 75; }
      else if (o.cane && k === 1) { u = d * 22; f = d * 15; }
      else { u = sd * 9; f = sd * 4; }
      const el = at(so, u, A1); arms.push([so, el, at(el, f, A2)]);
    }
    const bot = o.dress ? hip[1] + D.Lg * (old ? .62 : .5) : hip[1] + D.hw * .25;
    const torso = () => { const tw = D.tw / 2, bw = o.dress ? D.hw * (old ? .95 : .85) : D.hw / 2; g.beginPath(); g.moveTo(sh[0] - tw, sh[1]); g.lineTo(sh[0] + tw, sh[1]);
      g.lineTo(hip[0] + bw, bot); g.lineTo(hip[0] - bw, bot); g.closePath(); ink(g, shirt, { fa: .42 }); };
    const leg = (L, c) => { seg(g, L, D.lw, c); seg(g, [L[2], [L[2][0] + d * h * .04, L[2][1]]], D.lw * .9, shoe); };
    const arm = (A, c) => { seg(g, A, D.aw, c); g.fillStyle = skin; circ(g, A[2][0], A[2][1], D.aw * .62); g.fill(); };
    if (o.bag) { rr(g, sh[0] - d * D.tw * .62 - D.tw * .4, sh[1] + D.Tl * .08, D.tw * .62, D.Tl * .66, D.tw * .14); ink(g, o.bag, { fa: .5 }); }
    if (o.seat) { const sc = col(o.seat); rr(g, hip[0] - d * D.hw * .8 - D.hw * .2, hip[1] - 2, D.hw * 1.6 + L1 * .8, D.lw * 1.2, 4); ink(g, sc, { fa: .4 }); seg(g, [[hip[0] - d * D.hw * .6, hip[1]], [hip[0] - d * D.hw * .6, y]], 4, sc); seg(g, [[hip[0] + d * L1 * .7, hip[1]], [hip[0] + d * L1 * .7, y]], 4, sc); }
    arm(arms[0], bk(shirt)); leg(legs[0], bk(pants)); leg(legs[1], pants); torso();
    if (o.dress) leg([[legs[1][1][0], Math.max(legs[1][1][1], bot - 2)], legs[1][1], legs[1][2]], pants);
    seg(g, [[sh[0], sh[1]], [sh[0], sh[1] - D.hr * .5]], D.aw * 1.1, skin);
    const hd = [sh[0] + d * D.hr * .08, sh[1] - D.hr * 1.08]; headDraw(g, hd[0], hd[1], D.hr, o, d);
    if (o.bag) seg(g, [[sh[0] - d * D.tw * .25, sh[1] + 2], [sh[0] - d * D.tw * .1, sh[1] + D.Tl * .6]], 3, o.bag);
    arm(arms[1], shirt);
    const hand = (pose === 'hold' || (sit && o.item)) ? [(arms[0][2][0] + arms[1][2][0]) / 2, (arms[0][2][1] + arms[1][2][1]) / 2] : arms[1][2];
    if (o.cane) seg(g, [arms[1][2], [arms[1][2][0] + d * 4, y]], 4, P.wood);
    if (o.item) itemDraw(g, o.item, hand[0], hand[1] - D.aw * .3, h * (ch ? .26 : .2), o.itemCol);
    return { head: hd, hand, top: hd[1] - D.hr * 1.2, x, y, h };
  }
  // ряд людей: o: n, w (ширина ряда; держи шаг ≥ 0.45 h), h, kinds [...], shirts [...], pose, poses [...], dir, each {…доп. параметры}, seed
  function crowd(g, x, y, o = {}) {
    const n = o.n || 4, h = o.h || 260, w = o.w ?? (n - 1) * h * .5, R = rnd(o.seed || 7), out = [], SH = o.shirts || [P.blue, P.coral, P.teal, P.amber, P.violet, P.orange, P.cyan];
    for (let i = 0; i < n; i++) {
      const k = o.kinds ? o.kinds[i % o.kinds.length] : 'adult', r1 = R(), r2 = R(), r3 = R();
      const hh = h * (k === 'child' ? .64 : k === 'old' ? .93 : .9 + .12 * r1), px = x + (n > 1 ? w * i / (n - 1) : 0);
      out.push(person(g, px, y, Object.assign({ kind: k, h: hh, shirt: SH[i % SH.length], skin: SKIN[Math.floor(r2 * 3)], hair: k === 'old' ? '#D9DEE8' : HAIR[Math.floor(r3 * 4)],
        hairStyle: k === 'old' ? 'bun' : r1 > .5 ? 'long' : 'short', pose: o.poses ? o.poses[i % o.poses.length] : o.pose, ph: i * 1.7, dir: o.dir ?? (i % 2 ? -1 : 1), t: o.t }, o.each || {})));
    }
    return out;
  }
  // --- здания (x — левый край, y — земля) ---
  function win(g, x, y, w, h, L, c) { // окно; L 0…1 — свет
    rr(g, x, y, w, h, 3); g.fillStyle = L > 0 ? mixc(P.panel2, P.amber, .2 + .8 * L) : P.panel2; g.fill(); g.lineWidth = 2.5; g.strokeStyle = col(c); g.stroke();
    if (L > .4) glow(g, x + w / 2, y + h / 2, Math.max(w, h) * .95, P.amber, .3 * L);
    if (w > 26) { g.strokeStyle = rgba(c, .6); g.lineWidth = 2; g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.stroke(); }
  }
  function house(g, x, y, o = {}) { // жилой дом: o: w, h, col, roof, lit 0…1
    const w = o.w || 220, h = o.h || 170, c = col(o.col || P.sky), L = o.lit ?? 0;
    rr(g, x, y - h, w, h, 4); ink(g, c);
    g.beginPath(); g.moveTo(x - w * .08, y - h); g.lineTo(x + w / 2, y - h - w * .42); g.lineTo(x + w * 1.08, y - h); g.closePath(); ink(g, o.roof || P.coral, { fa: .35 });
    rr(g, x + w * .62, y - h * .56, w * .2, h * .56, 4); ink(g, c, { fa: .35 }); win(g, x + w * .13, y - h * .74, w * .32, h * .3, L, c);
    return { x, y, w, h, top: y - h - w * .42, door: [x + w * .72, y] };
  }
  function tower(g, x, y, o = {}) { // многоэтажка: o: w, floors, cols, fh (высота этажа), col, lit 0…1, out 0…1 (доля погасших окон, гаснут вразнобой), built 0…1 (сколько построено), seed
    const fl = o.floors || 5, cols = o.cols || 3, fh = o.fh || 74, w = o.w || 300, c = col(o.col || P.blue), L = o.lit ?? 0, out = o.out ?? 0, sd = o.seed || 1;
    const bf = cl(o.built ?? 1) * fl, done = bf >= fl - 1e-6, hh = bf * fh + (done ? 26 : 0), gx = (w - 30) / cols, ww = gx * .58;
    const res = { x, y, w, h: hh, top: y - hh, win: i => [x + 15 + (i % cols) * gx + gx / 2, y - (Math.floor(i / cols) + 1) * fh + fh * .47] };
    if (hh <= 0) return res;
    rr(g, x, y - hh, w, hh, 4); ink(g, c, { fa: .14 }); if (done) { g.fillStyle = rgba(c, .6); g.fillRect(x - 8, y - hh, w + 16, 7); }
    for (let f = 0; f < Math.floor(bf + .3); f++) for (let k = 0; k < cols; k++) {
      const i = f * cols + k, on = hash(i * 7.31 + sd) < out ? 0 : L; win(g, x + 15 + k * gx + (gx - ww) / 2, y - (f + 1) * fh + fh * .22, ww, fh * .5, on, c);
    }
    if (!done) { g.save(); g.setLineDash([8, 8]); g.strokeStyle = rgba(c, .6); g.lineWidth = 2; g.strokeRect(x, y - Math.ceil(bf) * fh, w, (Math.ceil(bf) - bf) * fh); g.restore(); }
    return res;
  }
  function sign(g, x, y, o = {}) { // вывеска-табличка по центру x, y: o: s (текст), w, h, col, icon, size
    const c = col(o.col || P.cyan), h = o.h || 64, size = o.size || h * .55, f = font(size, 700, 'D'), tw = mw(g, f, String(o.s || '')), ic = o.icon ? size * 1.3 : 0, w = o.w || tw + ic + h * .9;
    rr(g, x - w / 2, y - h / 2, w, h, 12); ink(g, c, { fa: .22 });
    if (o.icon) icon(g, o.icon, x - w / 2 + h * .45 + ic / 2 - size * .15, y, size, c, 2.6);
    text(g, o.s || '', x + ic / 2, y + size * .36, { size, w: 700, kind: 'D', col: P.ink, al: 'center', max: w - ic - h * .5 });
  }
  function shop(g, x, y, o = {}) { // магазин/лавка: o: w, h, col, awning (цвет навеса), sign (текст вывески), signCol, icon, lit
    const w = o.w || 340, h = o.h || 240, c = col(o.col || P.violet), aw = col(o.awning || P.coral);
    rr(g, x, y - h, w, h, 4); ink(g, c); win(g, x + w * .08, y - h * .56, w * .5, h * .4, o.lit ?? .3, c);
    rr(g, x + w * .66, y - h * .62, w * .24, h * .62, 4); ink(g, c, { fa: .32 });
    const ay = y - h * .72, n = Math.max(4, Math.round(w / 52)), sw = (w + 24) / n;
    for (let i = 0; i < n; i++) { const sx = x - 12 + i * sw; g.beginPath(); g.moveTo(sx, ay - 36); g.lineTo(sx + sw, ay - 36); g.lineTo(sx + sw, ay); g.arc(sx + sw / 2, ay, sw / 2, 0, Math.PI); g.closePath(); ink(g, i % 2 ? P.paper : aw, { fa: i % 2 ? .3 : .75, lw: 2.5, stroke: aw }); }
    if (o.sign) sign(g, x + w / 2, y - h - 40, { s: o.sign, w: w * .86, h: 66, col: o.signCol || c, icon: o.icon });
    return { x, y, w, h, top: y - h - (o.sign ? 74 : 0), door: [x + w * .78, y] };
  }
  function cafe(g, x, y, o = {}) { // кафе: магазин с чашкой на вывеске и столиком у витрины; параметры как у shop
    const r = shop(g, x, y, Object.assign({ icon: 'cup', awning: P.teal, col: P.cyan }, o)), w = o.w || 340, tx = x + w * .33;
    seg(g, [[tx - w * .14, y - 62], [tx + w * .14, y - 62]], 5, P.wood); seg(g, [[tx, y - 62], [tx, y]], 4, P.wood); seg(g, [[tx - 30, y], [tx + 30, y]], 4, P.wood);
    rr(g, tx - 14, y - 86, 26, 22, 5); ink(g, P.paper, { fa: .5, lw: 2.5 }); return r;
  }
  function school(g, x, y, o = {}) { // школа: o: w, h, col, sign (текст), flag (цвет), lit
    const w = o.w || 480, h = o.h || 260, c = col(o.col || P.amber), cx = x + w / 2, L = o.lit ?? 0;
    rr(g, x, y - h, w, h, 4); ink(g, c);
    g.beginPath(); g.moveTo(cx - w * .22, y - h); g.lineTo(cx, y - h - w * .15); g.lineTo(cx + w * .22, y - h); g.closePath(); ink(g, c, { fa: .32 });
    circ(g, cx, y - h - w * .055, w * .036); ink(g, P.paper, { fa: .3, lw: 2.5 }); seg(g, [[cx, y - h - w * .055], [cx, y - h - w * .08]], 2.5, P.paper); seg(g, [[cx, y - h - w * .055], [cx + w * .018, y - h - w * .05]], 2.5, P.paper);
    rr(g, cx - w * .08, y - h * .42, w * .16, h * .42, 4); ink(g, c, { fa: .35 });
    for (const sd of [-1, 1]) for (let r = 0; r < 2; r++) for (let k = 0; k < 2; k++) win(g, cx + sd * (w * .14 + k * w * .15) - (sd < 0 ? w * .1 : 0), y - h * (.84 - r * .4), w * .1, h * .24, L, c);
    if (o.sign) sign(g, cx, y - h * .5, { s: o.sign, h: 46, col: c });
    const fx = x + w * .92; seg(g, [[fx, y - h], [fx, y - h - 150]], 3.5, P.sub);
    const fc = col(o.flag || P.blue), wv = Math.sin(T * 4) * 6; g.beginPath(); g.moveTo(fx, y - h - 150); g.quadraticCurveTo(fx + 35, y - h - 160 + wv, fx + 70, y - h - 148); g.lineTo(fx + 70, y - h - 108); g.quadraticCurveTo(fx + 35, y - h - 120 + wv, fx, y - h - 110); g.closePath(); ink(g, fc, { fa: .7, lw: 2 });
    return { x, y, w, h, top: y - h - w * .15, door: [cx, y] };
  }
  function crane(g, x, y, o = {}) { // башенный кран: x — ось мачты, y — земля; o: h, jib (вылет, <0 влево), col, at 0…1 (каретка по стреле), drop (длина троса), load {w, h, col} → {hook}
    const h = o.h || 620, J = o.jib ?? 420, c = col(o.col || P.yellow), m = 30, ty = y - h, d = Math.sign(J) || 1, aj = Math.abs(J);
    g.save(); g.strokeStyle = c; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath();
    g.moveTo(x - m / 2, y); g.lineTo(x - m / 2, ty); g.moveTo(x + m / 2, y); g.lineTo(x + m / 2, ty);
    for (let yy = y; yy > ty + m; yy -= m) { g.moveTo(x - m / 2, yy); g.lineTo(x + m / 2, yy - m); g.moveTo(x - m / 2, yy - m); g.lineTo(x + m / 2, yy - m); }
    const xa = x - d * aj * .3, xb = x + d * aj; g.moveTo(xa, ty); g.lineTo(xb, ty); g.moveTo(xa, ty + 24); g.lineTo(xb, ty + 24);
    for (let k = 0; k < aj * 1.3 / 30; k++) { const u = xa + d * k * 30; g.moveTo(u, ty + 24); g.lineTo(u + d * 15, ty); g.lineTo(u + d * 30, ty + 24); }
    g.moveTo(x, ty - 80); g.lineTo(xb - d * aj * .1, ty); g.moveTo(x, ty - 80); g.lineTo(xa, ty); g.moveTo(x - 10, ty); g.lineTo(x, ty - 80); g.lineTo(x + 10, ty); g.stroke(); g.restore();
    rr(g, xa + d * 6 - (d < 0 ? 64 : 0), ty + 24, 64, 46, 4); ink(g, P.gray, { fa: .5 });
    rr(g, x + d * m / 2 - (d < 0 ? 46 : 0), ty + 26, 46, 42, 6); ink(g, c, { fa: .35 }); rr(g, x + d * m / 2 + (d > 0 ? 8 : -38), ty + 32, 30, 20, 3); g.fillStyle = rgba(P.sky, .5); g.fill();
    const hx = x + d * (m + (aj - m - 30) * cl(o.at ?? .7)), hy = ty + 24 + (o.drop ?? 200);
    rr(g, hx - 16, ty + 22, 32, 12, 3); ink(g, c, { fa: .6 }); seg(g, [[hx - 5, ty + 34], [hx - 5, hy]], 2, P.sub); seg(g, [[hx + 5, ty + 34], [hx + 5, hy]], 2, P.sub);
    g.beginPath(); g.arc(hx, hy + 14, 10, -Math.PI / 2, Math.PI * .9); g.strokeStyle = c; g.lineWidth = 4; g.stroke();
    if (o.load) { const lw_ = o.load.w || 160, lh = o.load.h || 34, lc = col(o.load.col || P.gray); seg(g, [[hx, hy + 24], [hx - lw_ * .4, hy + 60]], 2, P.sub); seg(g, [[hx, hy + 24], [hx + lw_ * .4, hy + 60]], 2, P.sub); rr(g, hx - lw_ / 2, hy + 60, lw_, lh, 4); ink(g, lc, { fa: .45 }); }
    return { hook: [hx, hy + 24], top: ty - 80, loadY: hy + 60 };
  }
  // --- природа ---
  function blob(g, cx, cy, rx, ry, n, sd = 1) { // «облачный» контур из n выпуклостей
    g.beginPath(); g.moveTo(cx + rx, cy);
    for (let i = 0; i < n; i++) { const a1 = (i + 1) / n * TAU, am = (i + .5) / n * TAU, k = 1.34 + .14 * (hash(i * 3.7 + sd) - .5); g.quadraticCurveTo(cx + rx * k * Math.cos(am), cy + ry * k * Math.sin(am), cx + rx * Math.cos(a1), cy + ry * Math.sin(a1)); }
    g.closePath();
  }
  function tree(g, x, y, o = {}) { // дерево: o: kind 'leaf'|'pine'|'bush', h, col (крона), trunk, fruit (цвет ягод), t, sway (градусы)
    const h = o.h || 260, k = o.kind || 'leaf', c = col(o.col || (k === 'pine' ? P.teal : P.green)), tc = col(o.trunk || P.brown), sw = Math.sin((o.t ?? T) * 1.3 + x * .013) * (o.sway ?? 1.2);
    g.save(); g.translate(x, y); g.rotate(sw * DEG);
    if (k === 'pine') {
      rr(g, -h * .04, -h * .18, h * .08, h * .18, 3); ink(g, tc, { fa: .45 });
      const yb = i => -h + (i + 1) * h * .27, wd = i => h * (.16 + i * .08); g.beginPath(); g.moveTo(0, -h);
      for (let i = 0; i < 3; i++) { g.lineTo(wd(i), yb(i)); if (i < 2) g.lineTo(wd(i) * .4, yb(i)); }
      g.lineTo(-wd(2), yb(2)); for (let i = 1; i >= 0; i--) { g.lineTo(-wd(i) * .4, yb(i)); g.lineTo(-wd(i), yb(i)); } g.closePath();
      ink(g, c, { fa: .26 });
    } else if (k === 'bush') { blob(g, 0, -h * .4, h * .55, h * .38, 7, x); ink(g, c, { fa: .26 }); }
    else {
      g.beginPath(); g.moveTo(-h * .05, 0); g.lineTo(-h * .035, -h * .5); g.lineTo(h * .035, -h * .5); g.lineTo(h * .05, 0); g.closePath(); ink(g, tc, { fa: .45 });
      seg(g, [[0, -h * .33], [h * .13, -h * .5]], 4, tc); seg(g, [[0, -h * .4], [-h * .12, -h * .55]], 4, tc);
      blob(g, 0, -h * .67, h * .37, h * .29, 9, x); ink(g, c, { fa: .26 });
      g.strokeStyle = rgba(c, .55); g.lineWidth = 2.5; g.beginPath(); g.arc(-h * .1, -h * .74, h * .09, Math.PI * 1.1, Math.PI * 1.7); g.moveTo(h * .2, -h * .62); g.arc(h * .12, -h * .62, h * .08, 0, Math.PI * .6); g.stroke();
    }
    if (o.fruit) { g.fillStyle = col(o.fruit); for (let i = 0; i < 6; i++) { circ(g, (hash(i * 5.1 + x) - .5) * h * .5, -h * (k === 'bush' ? .4 : .67) + (hash(i * 2.3 + x) - .5) * h * .35, h * .022 + 3); g.fill(); } }
    g.restore();
  }
  function grass(g, x, y, w, o = {}) { // полоса травы: o: h, col, t, step
    const h = o.h || 28, st = o.step || 13, tm = o.t ?? T; g.beginPath();
    for (let gx = x; gx <= x + w; gx += st) { const hh = h * (.55 + .7 * hash(gx * .37)), ln = Math.sin(tm * 2 + gx * .05) * 4 + (hash(gx) - .5) * 8; g.moveTo(gx, y); g.quadraticCurveTo(gx + ln * .3, y - hh * .6, gx + ln, y - hh); }
    g.strokeStyle = col(o.col || P.green); g.lineWidth = 2.5; g.lineCap = 'round'; g.stroke();
  }
  const LEAFP = 'M0 10L0 2L-8 4L-6 -2L-12 -6L-6 -6L-8 -12L-2 -8L0 -14L2 -8L8 -12L6 -6L12 -6L6 -2L8 4L0 2Z'; let LEAF2 = null;
  function leaves(g, lt, o) { // падающие кленовые листья: o: x, y, w, h, n, cols, size, t0, speed
    LEAF2 = LEAF2 || new Path2D(LEAFP); const n = o.n || 14, cs = o.cols || [P.orange, P.amber, P.red], sz = o.size || 26, a0 = ap(lt, o.t0 ?? 0, .4); if (a0 <= 0) return;
    for (let i = 0; i < n; i++) { const u = (hash(i * 4.1) + lt * (o.speed ?? .12) * (.7 + .6 * hash(i * 1.3))) % 1, lx = o.x + o.w * hash(i * 9.7) + Math.sin(lt * 1.6 + i) * 30, ly = o.y + o.h * u;
      g.save(); g.globalAlpha *= a0 * Math.min(1, Math.sin(Math.PI * u) * 3); g.translate(lx, ly); g.rotate(Math.sin(lt * 2 + i) * 1.2); g.scale(sz / 26, sz / 26);
      const c = col(cs[i % cs.length]); g.fillStyle = rgba(c, .75); g.fill(LEAF2); g.strokeStyle = c; g.lineWidth = 2; g.stroke(LEAF2); g.restore(); }
  }
  function sun(g, x, y, o = {}) { // солнце: o: r, col, rays, t, clip (y горизонта: ниже не рисуется)
    const r = o.r || 90, c = col(o.col || P.amber), tm = o.t ?? T; g.save();
    if (o.clip != null) { g.beginPath(); g.rect(x - r * 4, y - r * 4, r * 8, Math.max(0, o.clip - (y - r * 4))); g.clip(); }
    glow(g, x, y, r * 3.2, c, .5);
    if (o.rays !== false) { g.strokeStyle = c; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + tm * .12, l = 1.45 + .1 * Math.sin(tm * 3 + i); g.moveTo(x + Math.cos(a) * r * 1.22, y + Math.sin(a) * r * 1.22); g.lineTo(x + Math.cos(a) * r * l, y + Math.sin(a) * r * l); } g.stroke(); }
    circ(g, x, y, r); g.fillStyle = rgba(c, .92); g.fill(); g.lineWidth = 4; g.strokeStyle = mixc(c, P.paper, .45); g.stroke(); circ(g, x - r * .25, y - r * .25, r * .45); g.fillStyle = 'rgba(255,255,255,.16)'; g.fill(); g.restore();
  }
  function moon(g, x, y, o = {}) { // луна-серп: o: r, col, full
    const r = o.r || 60, c = col(o.col || '#F3E6BE'); glow(g, x, y, r * 2.6, c, .35); g.beginPath();
    if (o.full) circ(g, x, y, r); else { const dx = r * .8, yi = Math.sqrt(r * r - dx * dx / 4), a = Math.atan2(-yi, dx / 2), b = Math.atan2(yi, -dx / 2); g.arc(x, y, r, a, -a, true); g.arc(x + dx, y, r, b, -b, false); g.closePath(); }
    g.fillStyle = rgba(c, .92); g.fill(); g.lineWidth = 3; g.strokeStyle = c; g.stroke();
  }
  function stars(g, lt, o) { // звёзды: o: x, y, w, h, n, col, t0, dur (за сколько загораются все), seed
    const n = o.n || 40, c = o.col || P.paper, sd = o.seed || 3;
    for (let i = 0; i < n; i++) { const ti = (o.t0 ?? 0) + (o.dur ?? 1.5) * hash(i * 6.3 + sd), a = ap(lt, ti, .3); if (a <= 0) continue;
      const sx = o.x + o.w * hash(i * 1.91 + sd), sy = o.y + o.h * hash(i * 7.77 + sd), big_ = hash(i * 3.3 + sd) > .82, tw = .55 + .45 * Math.sin(T * 2.5 + i * 1.7), s = (big_ ? 5 : 2.2 + 1.6 * hash(i)) * (.7 + .3 * tw);
      spark(g, sx, sy, s, c, a * tw); if (big_) { g.strokeStyle = rgba(c, .7 * a * tw); g.lineWidth = 2; g.beginPath(); g.moveTo(sx - s * 3, sy); g.lineTo(sx + s * 3, sy); g.moveTo(sx, sy - s * 3); g.lineTo(sx, sy + s * 3); g.stroke(); } }
  }
  function cloud(g, x, y, o = {}) { blob(g, x, y, (o.w || 220) / 2, (o.w || 220) * .2, 7, x); ink(g, o.col || P.sub, { fa: .14, base: o.base }); } // облако по центру x,y: o: w, col
  function sea(g, x, y, w, h, o = {}) { // море/вода: x, y — левый край горизонта; o: col, rows, t, glint {x, col} — дорожка от солнца/луны
    const c = col(o.col || P.blue), rows = o.rows || 5, tm = o.t ?? T; g.fillStyle = P.panel; g.fillRect(x, y, w, h); g.fillStyle = rgba(c, .16); g.fillRect(x, y, w, h);
    seg(g, [[x, y], [x + w, y]], 3, c);
    for (let j = 0; j < rows; j++) { const yy = y + h * Math.pow((j + .7) / (rows + .2), 1.25), amp = 3 + j * 1.4; g.beginPath();
      for (let i = 0; i <= 30; i++) { const xx = x + w * i / 30, v = yy + Math.sin(i * .95 + tm * 2.2 + j * 1.7) * amp; i ? g.lineTo(xx, v) : g.moveTo(xx, v); }
      g.strokeStyle = rgba(c, .75 - j * .1); g.lineWidth = 3; g.stroke(); }
    if (o.glint) { const gc = col(o.glint.col || P.amber); for (let j = 0; j < 6; j++) { const yy = y + 14 + j * h * .14, ww = (70 - j * 6) * (.7 + .3 * Math.sin(tm * 3 + j)); if (yy > y + h - 6) break; seg(g, [[o.glint.x - ww / 2, yy], [o.glint.x + ww / 2, yy]], 4, rgba(gc, .8 - j * .1)); } }
    return { y };
  }
  function hill(g, x, y, w, h, o = {}) { g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + w * .25, y - h, x + w * .75, y - h, x + w, y); g.closePath(); ink(g, o.col || P.green, { fa: .16 }); } // холм: x, y — левый край основания
  function road(g, x, y, w, o = {}) { // дорога: y — верх полосы; o: h, move (сдвиг разметки, px), col
    const h = o.h || 96; g.fillStyle = '#10172A'; g.fillRect(x, y, w, h); seg(g, [[x, y], [x + w, y]], 3, o.col || P.faint); seg(g, [[x, y + h], [x + w, y + h]], 3, o.col || P.faint);
    g.save(); g.setLineDash([46, 34]); g.lineDashOffset = o.move || 0; seg(g, [[x, y + h / 2], [x + w, y + h / 2]], 5, rgba(P.sub, .55)); g.restore();
  }
  // --- транспорт (x — центр, y — земля; dir 1 — едет вправо; spin — скорость вращения колёс, рад/с) ---
  function wheel(g, x, y, r, a, c = P.sub) {
    circ(g, x, y, r); g.fillStyle = '#151B2B'; g.fill(); g.lineWidth = Math.max(3, r * .16); g.strokeStyle = col(c); g.stroke();
    g.strokeStyle = rgba(c, .6); g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 3; i++) { const q = a + i * TAU / 3; g.moveTo(x, y); g.lineTo(x + Math.cos(q) * r * .7, y + Math.sin(q) * r * .7); } g.stroke();
  }
  function car(g, x, y, o = {}) { // легковушка: o: w, col, dir, spin, t
    const w = o.w || 240, s = w / 240, c = col(o.col || P.red), d = o.dir || 1, a = (o.spin || 0) * (o.t ?? T);
    g.save(); g.translate(x, y); g.scale(d * s, s); const L = 3 / s;
    g.beginPath(); g.moveTo(-118, -26); g.lineTo(-118, -58); g.quadraticCurveTo(-116, -70, -100, -72); g.lineTo(-62, -74); g.lineTo(-38, -112); g.lineTo(42, -112); g.lineTo(76, -74); g.lineTo(104, -70); g.quadraticCurveTo(120, -66, 120, -50); g.lineTo(120, -26); g.closePath(); ink(g, c, { fa: .32, lw: L });
    g.beginPath(); g.moveTo(-32, -104); g.lineTo(-4, -104); g.lineTo(-4, -78); g.lineTo(-52, -78); g.closePath(); ink(g, P.sky, { fa: .3, lw: 2.5 / s });
    g.beginPath(); g.moveTo(4, -104); g.lineTo(38, -104); g.lineTo(62, -78); g.lineTo(4, -78); g.closePath(); ink(g, P.sky, { fa: .3, lw: 2.5 / s });
    g.fillStyle = P.amber; circ(g, 112, -56, 7); g.fill(); g.fillStyle = P.red; circ(g, -113, -56, 6); g.fill();
    g.restore(); wheel(g, x - d * 70 * s, y - 24 * s, 25 * s, a * d); wheel(g, x + d * 72 * s, y - 24 * s, 25 * s, a * d);
  }
  function bus(g, x, y, o = {}) { // автобус: o: w, col, num (текст на табло), dir, spin, people (голов в окнах), t
    const w = o.w || 460, s = w / 460, c = col(o.col || P.blue), d = o.dir || 1, a = (o.spin || 0) * (o.t ?? T), X = v => x + d * v * s, Y = v => y + v * s;
    rr(g, x - 230 * s, Y(-196), 460 * s, 168 * s, 26 * s); ink(g, c, { fa: .36 });
    g.fillStyle = rgba(P.paper, .2); g.fillRect(x - 226 * s, Y(-78), 452 * s, 10 * s);
    const ws = 62 * s, wh = 62 * s;
    for (let i = 0; i < 4; i++) { const cx_ = X(-180 + i * 76); rr(g, cx_ - ws / 2, Y(-172), ws, wh, 8 * s); ink(g, P.sky, { fa: .28, lw: 2.5 });
      if (i < (o.people || 0)) { const hx = cx_ + (hash(i * 3.1) - .5) * 14 * s; g.fillStyle = SKIN[i % 3]; circ(g, hx, Y(-136), 12 * s); g.fill(); rr(g, hx - 16 * s, Y(-122), 32 * s, 12 * s, 6 * s); g.fillStyle = SER[(i + 2) % SER.length]; g.fill(); } }
    rr(g, Math.min(X(132), X(178)), Y(-172), 46 * s, 144 * s, 6 * s); ink(g, c, { fa: .3, lw: 2.5 }); seg(g, [[X(155), Y(-168)], [X(155), Y(-32)]], 2, c);
    rr(g, Math.min(X(192), X(226)), Y(-172), 34 * s, 82 * s, 8 * s); ink(g, P.sky, { fa: .32, lw: 2.5 });
    if (o.num != null) { const bx = X(-110), bw = 150 * s; rr(g, bx - bw / 2, Y(-190), bw, 30 * s, 6 * s); g.fillStyle = '#0B1020'; g.fill(); text(g, String(o.num), bx, Y(-166), { size: 24 * s, w: 700, kind: 'D', col: P.amber, al: 'center', max: bw - 12 }); }
    g.fillStyle = P.amber; circ(g, X(222), Y(-50), 7 * s); g.fill();
    wheel(g, X(-140), Y(-26), 30 * s, a * d); wheel(g, X(140), Y(-26), 30 * s, a * d);
  }
  function bike(g, x, y, o = {}) { // велосипед с ездоком: o: h (рост ездока), col (рама), dir, spin (педали, рад/с), t, rider {параметры person} или false
    const h = o.h || 260, d = o.dir || 1, c = col(o.col || P.teal), R = h * .17, a = (o.spin ?? 6) * (o.t ?? T), ro = o.rider === false ? null : (o.rider || {});
    const rw = [x - d * R * 1.3, y - R], fw = [x + d * R * 1.3, y - R], bb = [x - d * R * .1, y - R * .9], seat = [x - d * R * .5, y - R * 2.45], hb = [x + d * R * .95, y - R * 2.55];
    const cr = R * .38, p1 = [bb[0] + Math.cos(a) * cr * d, bb[1] + Math.sin(a) * cr], p2 = [bb[0] - Math.cos(a) * cr * d, bb[1] - Math.sin(a) * cr];
    const D = dims(h, ro && ro.kind), shirt = col(ro && (ro.shirt || ro.col) || P.coral), pants = col(ro && ro.pants || '#4A5B88'), skin = col(ro && ro.skin || SKIN[0]);
    const hip = [seat[0], seat[1] - 4], L1 = D.Lg * .52, L2 = D.Lg * .5, sh = at(hip, 180 - d * 28, D.Tl);
    if (ro) { seg(g, [hip, ik(hip, p2, L1, L2, -d), p2], D.lw, mixc(pants, P.bg, .4)); }
    wheel(g, rw[0], rw[1], R, a * d * .6, P.sub); wheel(g, fw[0], fw[1], R, a * d * .6, P.sub);
    seg(g, [rw, bb, [seat[0], seat[1] + 6], rw], 4.5, c); seg(g, [[seat[0], seat[1] + 6], [hb[0] - d * R * .12, hb[1] + R * .35], bb], 4.5, c); seg(g, [[hb[0] - d * R * .12, hb[1] + R * .35], fw], 4.5, c);
    seg(g, [[hb[0] - d * R * .12, hb[1] + R * .35], hb, [hb[0] - d * R * .25, hb[1] - 2]], 4, c); seg(g, [[seat[0] - R * .22, seat[1]], [seat[0] + R * .22, seat[1]]], 7, P.sub);
    seg(g, [p1, p2], 3, P.sub);
    if (ro) {
      seg(g, [hip, ik(hip, p1, L1, L2, -d), p1], D.lw, pants);
      g.beginPath(); g.moveTo(sh[0] - D.tw / 2, sh[1]); g.lineTo(sh[0] + D.tw / 2, sh[1]); g.lineTo(hip[0] + D.hw / 2, hip[1] + 4); g.lineTo(hip[0] - D.hw / 2, hip[1] + 4); g.closePath(); ink(g, shirt, { fa: .42 });
      seg(g, [[sh[0], sh[1]], [sh[0] + d * 2, sh[1] - D.hr * .5]], D.aw * 1.1, skin); headDraw(g, sh[0] + d * D.hr * .3, sh[1] - D.hr * 1.05, D.hr, ro, d);
      const so = [sh[0], sh[1] + D.aw * .5]; seg(g, [so, ik(so, hb, D.Tl * .56, D.Tl * .54, d), hb], D.aw, shirt); g.fillStyle = skin; circ(g, hb[0], hb[1], D.aw * .62); g.fill();
    }
    return { top: sh[1] - D.hr * 2.2 };
  }
  function boat(g, x, y, o = {}) { // лодка: x — центр, y — вода; o: w, col (корпус), kind 'motor'|'row'|'sail', sail (цвет паруса), dir, t, riders [параметры person], wake (пена за кормой)
    const w = o.w || 280, c = col(o.col || P.paper), tm = o.t ?? T, d = o.dir || 1, bob = Math.sin(tm * 2.2 + x * .013) * w * .014, rot = Math.sin(tm * 1.7 + x * .021) * 2.2;
    g.save(); g.translate(x, y + bob); g.rotate(rot * DEG);
    if (o.wake) for (let j = 0; j < 3; j++) { const q = (tm * 1.2 + j / 3) % 1; seg(g, [[-d * (w * .52 + q * w * .5), w * .02 - q * 8], [-d * (w * .52 + q * w * .5 + 30), w * .02 + q * 6]], 3, rgba(P.paper, .6 * (1 - q))); }
    if (o.kind === 'sail') { seg(g, [[d * w * .02, -w * .1], [d * w * .02, -w * .9]], 4, P.sub); g.beginPath(); g.moveTo(d * w * .05, -w * .88); g.lineTo(d * w * .38, -w * .16); g.lineTo(d * w * .05, -w * .16); g.closePath(); ink(g, o.sail || P.paper, { fa: .3 }); }
    const rs = o.riders || [], rh = o.rh || w * .55; rs.forEach((r, i) => person(g, (rs.length > 1 ? (i / (rs.length - 1) - .5) * w * .5 : -d * w * .05), -w * .02, Object.assign({ h: rh, dir: d, t: tm }, r)));
    g.beginPath(); g.moveTo(-d * w * .5, -w * .12); g.lineTo(d * w * .54, -w * .15); g.quadraticCurveTo(d * w * .42, w * .06, d * w * .26, w * .08); g.lineTo(-d * w * .42, w * .08); g.closePath(); ink(g, c, { fa: .38 });
    seg(g, [[-d * w * .46, -w * .04], [d * w * .44, -w * .06]], 3, rgba(c, .7));
    if (o.kind !== 'row' && o.kind !== 'sail') { rr(g, -d * w * .56 - w * .05, -w * .2, w * .1, w * .16, 5); ink(g, P.gray, { fa: .5 }); seg(g, [[-d * w * .58, -w * .04], [-d * w * .6, w * .1]], 3, P.gray); }
    if (o.kind === 'row') { seg(g, [[-d * w * .1, -w * .16], [-d * w * .38, w * .14]], 4, P.wood); }
    g.restore();
  }
  // --- животные (x — центр, y — земля; s — длина тела, px) ---
  function dog(g, x, y, o = {}) { // собака: o: s, col, pose 'stand'|'walk'|'sit'|'sleep', dir, t, collar (цвет)
    const s = o.s || 170, c = col(o.col || P.rust), d = o.dir || 1, tm = o.t ?? T, k = s / 170, pose = o.pose || 'stand', L = 3 / k, dk = mixc(c, P.bg, .3);
    g.save(); g.translate(x, y); g.scale(d * k, k);
    if (pose === 'sleep') {
      const br = 1 + .04 * Math.sin(tm * 2.2); seg(g, [[-70, -14], [-86, -6], [-60, 0]], 9, c);
      g.beginPath(); g.ellipse(-4, -30 * br, 74, 30 * br, 0, 0, TAU); ink(g, c, { fa: .42, lw: L });
      g.beginPath(); g.ellipse(70, -20, 30, 22, 0, 0, TAU); ink(g, c, { fa: .42, lw: L }); g.beginPath(); g.ellipse(96, -14, 16, 11, 0, 0, TAU); ink(g, c, { fa: .42, lw: L });
      g.fillStyle = '#1A2030'; circ(g, 110, -16, 5); g.fill(); g.beginPath(); g.ellipse(58, -24, 12, 22, .5, 0, TAU); g.fillStyle = dk; g.fill();
      g.strokeStyle = '#1A2030'; g.lineWidth = 2.5 / k; g.beginPath(); g.arc(80, -26, 7, .2, Math.PI - .2); g.stroke();
      seg(g, [[30, -2], [76, -2]], 9, c);
    } else {
      const wk = pose === 'walk' ? Math.sin(tm * 9) * 16 : 0, sit_ = pose === 'sit';
      if (sit_) { g.translate(-40, -10); g.rotate(-28 * DEG); g.translate(40, 10); }
      [[-48, -wk], [-28, wk], [38, wk], [56, -wk]].forEach(([lx, sw], i) => { if (sit_ && i < 2) return; seg(g, [[lx, -50], [lx + sw * .5, -6]], 11, i % 2 ? c : dk); });
      const wag = Math.sin(tm * (sit_ ? 5 : 10)) * 10; g.beginPath(); g.moveTo(-60, -80); g.quadraticCurveTo(-90, -100, -92 + wag, -128); g.strokeStyle = c; g.lineWidth = 9; g.stroke();
      rr(g, -66, -94, 132, 50, 24); ink(g, c, { fa: .42, lw: L });
      if (o.collar) seg(g, [[56, -96], [60, -66]], 8, o.collar);
      circ(g, 74, -110, 28); ink(g, c, { fa: .42, lw: L }); rr(g, 88, -112, 34, 22, 9); ink(g, c, { fa: .42, lw: L });
      g.fillStyle = '#1A2030'; circ(g, 121, -104, 5); g.fill(); circ(g, 82, -118, 4); g.fill();
      g.beginPath(); g.ellipse(58, -112, 11, 22, .35, 0, TAU); g.fillStyle = dk; g.fill();
    }
    g.restore();
  }
  function cat(g, x, y, o = {}) { // кошка: o: s, col, pose 'stand'|'walk'|'sit'|'sleep', dir, t
    const s = o.s || 120, c = col(o.col || P.gray), d = o.dir || 1, tm = o.t ?? T, k = s / 120, pose = o.pose || 'stand', L = 3 / k;
    g.save(); g.translate(x, y); g.scale(d * k, k);
    const ears = (hx, hy, r) => { [-1, 1].forEach(e => { g.beginPath(); g.moveTo(hx + e * r * .85, hy - r * .4); g.lineTo(hx + e * r * .65, hy - r * 1.35); g.lineTo(hx + e * r * .1, hy - r * .85); g.closePath(); ink(g, c, { fa: .45, lw: L }); }); };
    const face = (hx, hy, r, sl) => { g.fillStyle = '#1A2030'; if (sl) { g.strokeStyle = '#1A2030'; g.lineWidth = 2.5 / k; [-1, 1].forEach(e => { g.beginPath(); g.arc(hx + e * r * .38, hy, r * .18, .2, Math.PI - .2); g.stroke(); }); } else { circ(g, hx - r * .36, hy, 3.5); g.fill(); circ(g, hx + r * .36, hy, 3.5); g.fill(); }
      g.strokeStyle = rgba(P.paper, .7); g.lineWidth = 1.5 / k; g.beginPath(); [-1, 1].forEach(e => { g.moveTo(hx + e * r * .3, hy + r * .35); g.lineTo(hx + e * r * 1.3, hy + r * .25); g.moveTo(hx + e * r * .3, hy + r * .45); g.lineTo(hx + e * r * 1.3, hy + r * .6); }); g.stroke(); };
    if (pose === 'sleep') { const br = 1 + .04 * Math.sin(tm * 2.2); g.beginPath(); g.ellipse(0, -26 * br, 52, 26 * br, 0, 0, TAU); ink(g, c, { fa: .42, lw: L }); seg(g, [[-48, -10], [-10, 2], [36, -4]], 8, c); circ(g, 40, -26, 22); ink(g, c, { fa: .42, lw: L }); ears(40, -26, 22); face(40, -24, 22, true); }
    else if (pose === 'sit') { const tl = Math.sin(tm * 2) * 8; g.beginPath(); g.moveTo(-20, -6); g.quadraticCurveTo(-58, -2, -54 + tl, -40); g.strokeStyle = c; g.lineWidth = 8; g.stroke(); g.beginPath(); g.ellipse(0, -40, 30, 40, 0, 0, TAU); ink(g, c, { fa: .42, lw: L }); circ(g, 6, -94, 24); ink(g, c, { fa: .42, lw: L }); ears(6, -94, 24); face(6, -92, 24); }
    else { const wk = pose === 'walk' ? Math.sin(tm * 9) * 12 : 0; [[-36, -wk], [-22, wk], [26, wk], [40, -wk]].forEach(([lx, sw]) => seg(g, [[lx, -40], [lx + sw * .5, -4]], 8, c));
      g.beginPath(); g.moveTo(-46, -56); g.quadraticCurveTo(-80, -60, -78 + Math.sin(tm * 3) * 8, -100); g.strokeStyle = c; g.lineWidth = 8; g.stroke();
      rr(g, -50, -70, 100, 36, 18); ink(g, c, { fa: .42, lw: L }); circ(g, 58, -82, 22); ink(g, c, { fa: .42, lw: L }); ears(58, -82, 22); face(60, -80, 22); }
    g.restore();
  }
  function bird(g, x, y, o = {}) { // птица/чайка в полёте: o: s (размах), col, t, flap (взмахов, рад/с)
    const s = o.s || 80, c = col(o.col || P.paper), f = Math.sin((o.t ?? T) * (o.flap ?? 7) + x * .05), dy = f * s * .2;
    g.beginPath(); g.moveTo(x - s / 2, y - dy); g.quadraticCurveTo(x - s * .22, y - s * .26 - dy * .3, x, y); g.quadraticCurveTo(x + s * .22, y - s * .26 - dy * .3, x + s / 2, y - dy);
    g.strokeStyle = c; g.lineWidth = Math.max(3, s * .055); g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); g.fillStyle = c; g.beginPath(); g.ellipse(x, y + s * .02, s * .07, s * .045, 0, 0, TAU); g.fill();
  }
  // --- улица ---
  function lamp(g, x, y, o = {}) { // фонарь: o: h, col (столб), on 0…1, light (цвет света)
    const h = o.h || 320, on = o.on ?? 1, lc = col(o.light || P.amber), hy = y - h;
    if (on > 0) { g.save(); g.globalAlpha *= on; const gr = g.createLinearGradient(0, hy, 0, y); gr.addColorStop(0, rgba(lc, .28)); gr.addColorStop(1, rgba(lc, 0)); g.fillStyle = gr; g.beginPath(); g.moveTo(x - 14, hy + 20); g.lineTo(x - h * .34, y); g.lineTo(x + h * .34, y); g.lineTo(x + 14, hy + 20); g.closePath(); g.fill(); g.restore(); glow(g, x, hy + 8, 80, lc, .8 * on); }
    seg(g, [[x, y], [x, hy + 20]], 7, o.col || P.sub); rr(g, x - 15, y - 26, 30, 26, 5); ink(g, o.col || P.sub, { fa: .3 });
    g.beginPath(); g.moveTo(x - 20, hy - 6); g.lineTo(x + 20, hy - 6); g.lineTo(x + 14, hy + 22); g.lineTo(x - 14, hy + 22); g.closePath(); ink(g, lc, { fa: .15 + .75 * on, lw: 2.5 });
    g.beginPath(); g.moveTo(x - 26, hy - 6); g.lineTo(x, hy - 26); g.lineTo(x + 26, hy - 6); g.closePath(); ink(g, o.col || P.sub, { fa: .4 });
  }
  function garland(g, x0, y0, x1, y1, o = {}) { // гирлянда-фонарики: o: n, sag (провис), cols, on 0…1 (загораются слева направо), t
    const n = o.n || 12, sag = o.sag ?? 60, cs = o.cols || [P.amber, P.coral, P.teal, P.sky, P.violet], on = o.on ?? 1, cxp = (x0 + x1) / 2, cyp = (y0 + y1) / 2 + sag * 2, pts = [];
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cxp, cyp, x1, y1); g.strokeStyle = P.mute; g.lineWidth = 2.5; g.stroke();
    for (let i = 0; i < n; i++) { const u = (i + .5) / n, v = 1 - u, px = v * v * x0 + 2 * v * u * cxp + u * u * x1, py = v * v * y0 + 2 * v * u * cyp + u * u * y1, L = cl(on * n - i), c = col(cs[i % cs.length]); pts.push([px, py]);
      g.fillStyle = P.sub; g.fillRect(px - 4, py - 2, 8, 7); if (L > 0) glow(g, px, py + 12, 40, c, .6 * L * (.8 + .2 * Math.sin(T * 4 + i)));
      g.beginPath(); g.ellipse(px, py + 13, 8, 11, 0, 0, TAU); g.fillStyle = L > 0 ? mixc(mixc(c, P.bg, .6), c, L) : mixc(c, P.bg, .6); g.fill(); }
    return pts;
  }
  function board(g, x, y, o = {}) { // доска с текстом (меловая по умолчанию): x, y — левый верх; o: w, h, title, lines ['строка' или ['слева', 'справа']], p 0…1 (сколько написано), size, chalk (false — светлая табличка), stand (ножки)
    const w = o.w || 440, h = o.h || 300, chalk = o.chalk !== false, ink_ = chalk ? '#EEF2E6' : P.dark, ls = o.lines || [], rows = ls.length + (o.title ? 1.2 : 0);
    if (o.stand) { seg(g, [[x + w * .15, y + h], [x + w * .05, y + h + 120]], 6, P.wood); seg(g, [[x + w * .85, y + h], [x + w * .95, y + h + 120]], 6, P.wood); }
    rr(g, x - 12, y - 12, w + 24, h + 24, 12); g.fillStyle = P.wood; g.fill(); g.lineWidth = 3; g.strokeStyle = mixc(P.wood, P.paper, .3); g.stroke();
    rr(g, x, y, w, h, 6); g.fillStyle = chalk ? P.chalk : P.paper; g.fill();
    const size = o.size || Math.min(56, (h - 40) / Math.max(1, rows) / 1.3), lh = size * 1.3, tot = ls.reduce((s, l) => s + (Array.isArray(l) ? l.join('').length : String(l).length), 0) + (o.title ? o.title.length : 0);
    let left = Math.round((o.p ?? 1) * tot), yy = y + 24 + size; const cut = s => { s = String(s); const r = s.slice(0, Math.max(0, left)); left -= s.length; return r; };
    g.save(); g.globalAlpha *= chalk ? .93 : 1;
    if (o.title) { const s = cut(o.title); if (s) { const r = text(g, s, x + w / 2, yy, { size: size * 1.05, w: 700, kind: 'D', col: ink_, al: 'center', max: w - 40 }); if (s.length === o.title.length) seg(g, [[x + w / 2 - r.w / 2, yy + 12], [x + w / 2 + r.w / 2, yy + 12]], 2.5, rgba(ink_, .6)); } yy += lh * 1.2; }
    ls.forEach(l => { if (Array.isArray(l)) { const a = cut(l[0]), b = cut(l[1]); if (a) text(g, a, x + 28, yy, { size, w: 500, col: ink_, max: w * .62 }); if (b) text(g, b, x + w - 28, yy, { size, w: 700, kind: 'D', col: ink_, al: 'right', max: w * .32 }); }
      else { const a = cut(l); if (a) text(g, a, x + 28, yy, { size, w: 500, col: ink_, max: w - 56 }); } yy += lh; });
    g.restore(); return { bottom: y + h };
  }

  return { W, H, P, F, SER, SAFE, TOP, SLOT, SKIN, HAIR, get cur() { return CUR; }, get t() { return T; },
    cl, pr, lerp, eo, eo5, ei, eio, spring, sp, ap, vis, hash, rnd, stag, mix, kf, step, fly, count, fmt, rub,
    col, rgba, mixc, glow, spark, rr, circ, bez,
    begin, finish, run,
    font, mw, label, labelW, text, num, numW, odo, words,
    icon, tile, avatar, panel, card, chip, tip, callout, row, legend,
    big, kpi, hbar, stack, bars, area, grid, hline, ring, sankey, waffle, heat, slider,
    spray, stream, scan, seal, toast, ping, tap, header, tabs, ICONS: Object.keys(IC),
    ink, seg, pop, person, crowd, house, tower, shop, cafe, school, sign, crane, tree, grass, leaves, sun, moon, stars, cloud, sea, hill, road,
    wheel, car, bus, bike, boat, dog, cat, bird, lamp, garland, board };
})();
