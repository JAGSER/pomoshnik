// lib.js - SLAM: терминальный HUD (графит, лайм, точки-пиксели, печать с курсором, LED-цифры, ленты ///, глитч)
const SLAM = (() => {
  const SANS = '"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif';
  const SERIF = '"DejaVu Serif",Georgia,"Noto Serif","Times New Roman",serif';
  const MONO = '"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace';
  const W = 1080, H = 1920, X0 = 60, X1 = 1020, PI2 = Math.PI * 2;
  const C = {
    bg: '#08090C', bg2: '#131417', wh: '#E8E9EC', lime: '#C6FA40', limeHi: '#DDFF7A', olive: '#6E8A1E', oliveD: '#34421A',
    ink: '#0A0B0D', grey: '#8B8E94', dim: '#5C5F66', hud: '#6B6E73', light: '#E4E5E8', card: '#0E1013',
    line: 'rgba(255,255,255,0.10)', faint: 'rgba(255,255,255,0.05)', red: '#FF3B4E', cyan: '#38E8FF'
  };
  // темы фона: dark (основная), lime (полноэкранный лайм), light (светло-серая)
  const TH = {
    dark: { fg: C.wh, dim: C.grey, acc: C.lime, hud: C.hud, hudV: '#D9DADD', br: 'rgba(255,255,255,0.28)', line: 'rgba(255,255,255,0.10)' },
    lime: { fg: C.ink, dim: 'rgba(10,11,13,0.6)', acc: C.ink, hud: 'rgba(10,11,13,0.55)', hudV: C.ink, br: 'rgba(10,11,13,0.45)', line: 'rgba(10,11,13,0.18)' },
    light: { fg: C.ink, dim: 'rgba(10,11,13,0.55)', acc: C.ink, hud: 'rgba(10,11,13,0.5)', hudV: C.ink, br: 'rgba(10,11,13,0.4)', line: 'rgba(10,11,13,0.15)' }
  };

  // ---------- математика ----------
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, p) => a + (b - a) * p;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const eo = p => { p = clamp(p); return 1 - Math.pow(1 - p, 3); };
  const eio = p => { p = clamp(p); return p * p * (3 - 2 * p); };
  const ein = p => { p = clamp(p); return p * p * p; };
  const spring = x => x <= 0 ? 0 : x > 1.6 ? 1 : 1 - Math.exp(-6 * x) * Math.cos(10 * x);
  function rng(s) { s = (s >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const hash = i => { let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
  const F = (w, s, f) => w + ' ' + Math.round(s) + 'px ' + (f || SANS);
  function life(lt, t0, t1, din, dout) {
    din = din || 0.25; dout = dout || din / 1.4; if (lt < t0 || lt > t1) return 0;
    return Math.min(eo((lt - t0) / din), eo((t1 - lt) / dout));
  }
  const count = (lt, t0, dur, to, from) => Math.round(lerp(from || 0, to, eo((lt - t0) / (dur || 1))));
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  // ---------- текстуры (один раз) ----------
  let BG = null, OVER = null, GLOW = null;
  const RIB = new Map(), MW = new Map();
  function mkBg(c0, c1, grid) {
    const cv = new OffscreenCanvas(W, H), b = cv.getContext('2d');
    const gr = b.createRadialGradient(W / 2, H * 0.45, 80, W / 2, H * 0.45, H * 0.72);
    gr.addColorStop(0, c0); gr.addColorStop(1, c1); b.fillStyle = gr; b.fillRect(0, 0, W, H);
    b.fillStyle = grid; for (let x = 0; x <= W; x += 90) b.fillRect(x, 0, 1, H); for (let y = 30; y <= H; y += 90) b.fillRect(0, y, W, 1);
    return cv;
  }
  function prep() {
    if (BG) return;
    BG = { dark: mkBg('#141518', '#050608', 'rgba(255,255,255,0.035)'), lime: mkBg('#CEFF4C', '#A6D82E', 'rgba(0,0,0,0.045)'),
      light: mkBg('#EDEEF0', '#C6C7CB', 'rgba(0,0,0,0.04)'), grey: mkBg('#66676B', '#4A4B4F', 'rgba(255,255,255,0.06)') };
    OVER = new OffscreenCanvas(W + 8, H + 8); const o = OVER.getContext('2d');
    o.fillStyle = 'rgba(0,0,0,0.16)'; for (let y = 0; y < H + 8; y += 4) o.fillRect(0, y, W + 8, 1.4);
    const r = rng(11);
    for (let i = 0; i < 26000; i++) { o.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)'; o.fillRect(r() * (W + 8), r() * (H + 8), 1.5, 1.5); }
    GLOW = new OffscreenCanvas(64, 64); const gl = GLOW.getContext('2d');
    const gg = gl.createRadialGradient(32, 32, 0, 32, 32, 32); gg.addColorStop(0, 'rgba(198,250,64,0.55)'); gg.addColorStop(1, 'rgba(198,250,64,0)');
    gl.fillStyle = gg; gl.fillRect(0, 0, 64, 64);
  }

  // ---------- текст ----------
  function mw(g, s) { const k = g.font + '|' + s; let v = MW.get(k); if (v == null) { v = g.measureText(s).width; if (MW.size > 4000) MW.clear(); MW.set(k, v); } return v; }
  function fit(g, s, weight, size, font, maxW, min) {
    let f = size; g.font = F(weight, f, font);
    while (mw(g, s) > maxW && f > (min || 18)) { f -= 2; g.font = F(weight, f, font); }
    return f;
  }
  function wrap(g, s, maxW) {
    const out = []; let cur = '';
    for (const w of String(s).split(' ')) { const tr = cur ? cur + ' ' + w : w; if (cur && mw(g, tr) > maxW) { out.push(cur); cur = w; } else cur = tr; }
    if (cur) out.push(cur); return out;
  }
  // моно с разрядкой (letterSpacing нельзя): посимвольно
  function tracked(g, s, x, y, tr, align) {
    s = String(s); const cw = mw(g, 'M'), step = cw + tr, w = s.length * step - tr;
    let xx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    for (let i = 0; i < s.length; i++) { if (s[i] !== ' ') g.fillText(s[i], xx, y); xx += step; }
    return w;
  }
  const trW = (g, s, tr) => String(s).length * (mw(g, 'M') + tr) - tr;

  // печать заголовка: 'строка|строка', o.hi = слово (или номер строки o.hiLine) лаймом,
  // буквы по одной, последняя буква на миг глитч-символ и падает на базу, блок-курсор в конце
  const SCR = '+#%/<_*?=';
  function typeLines(g, text, x, y, lt, t0, o) {
    o = o || {}; const lines = String(text).split('|'), wt = o.weight || 500, maxW = o.maxW || (X1 - x);
    let size = o.size || 130; g.font = F(wt, size);
    while (size > 40 && Math.max(...lines.map(l => mw(g, l))) > maxW) { size -= 3; g.font = F(wt, size); }
    const lh = size * (o.lh || 1.04), cps = o.cps || 26, el = lt - t0, a = o.alpha == null ? 1 : o.alpha;
    const th = TH[o.theme || 'dark'], fg = o.color || th.fg, acc = o.acc || (o.theme && o.theme !== 'dark' ? th.fg : C.lime);
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    let idx = 0, cx = x, cy = y + size * 0.8, done = true, endX = x, endY = cy;
    for (let li = 0; li < lines.length; li++) {
      const L = lines[li], by = y + size * 0.8 + li * lh;
      let hs = -1, he = -1; if (o.hi) { hs = L.indexOf(o.hi); if (hs >= 0) he = hs + o.hi.length; }
      const lineHi = o.hiLine === li, lineGrey = o.greyLine === li, lx = o.align === 'center' ? x - mw(g, L) / 2 : x;
      for (let i = 0; i < L.length; i++, idx++) {
        const age = el - idx / cps; if (age < 0) { done = false; break; }
        const ch = L[i]; if (ch === ' ') continue;
        const px = lx + mw(g, L.slice(0, i));
        const scr = age < 0.05 && SCR.indexOf(ch) < 0;
        g.globalAlpha = a * clamp(age / 0.05 + 0.4);
        g.fillStyle = (lineHi || (i >= hs && i < he)) ? acc : lineGrey ? C.grey : fg;
        g.fillText(scr ? SCR[(idx * 7) % SCR.length] : ch, px, by + (1 - eo(age / 0.12)) * size * 0.16);
        endX = px + mw(g, ch); endY = by;
      }
      if (!done) break;
    }
    g.globalAlpha = a;
    if (o.cursor !== false && el > 0 && (o.cursorUntil == null || lt < o.cursorUntil)) {
      const on = !done || (Math.floor((lt - t0) * 2.2) % 2 === 0);
      if (on) { g.fillStyle = acc; g.fillRect(endX + size * 0.06, endY - size * 0.74, size * 0.36, size * 0.82); }
    }
    g.globalAlpha = 1;
    return { size, bottom: y + lines.length * lh, done };
  }
  // серое предложение, часть слов белые (*слово), появление по словам
  function lead(g, text, x, y, lt, t0, o) {
    o = o || {}; const size = o.size || 42, maxW = o.maxW || (X1 - x), th = TH[o.theme || 'dark'];
    g.font = F(o.weight || 400, size); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    const words = String(text).split(' '), plain = [], hiW = []; let on = false;
    for (const w of words) { if (w[0] === '*') on = true; plain.push(w.replace(/\*/g, '')); hiW.push(on); if (w.length > 1 && w[w.length - 1] === '*') on = false; }
    const lines = []; let cur = [];
    for (let i = 0; i < words.length; i++) { const tryS = cur.map(j => plain[j]).concat(plain[i]).join(' '); if (cur.length && mw(g, tryS) > maxW) { lines.push(cur); cur = []; } cur.push(i); }
    if (cur.length) lines.push(cur);
    let n = 0; const lh = size * 1.32, sp = mw(g, ' ');
    lines.forEach((ln, li) => {
      let xx = x;
      ln.forEach(i => {
        const age = lt - t0 - n * (o.step || 0.06); n++;
        const w = mw(g, plain[i]);
        if (age > 0) { g.globalAlpha = clamp(age / 0.15) * (o.alpha == null ? 1 : o.alpha); g.fillStyle = hiW[i] ? th.fg : (o.dim || th.dim);
          g.fillText(plain[i], xx, y + li * lh + (1 - eo(age / 0.2)) * 10); }
        xx += w + sp;
      });
    });
    g.globalAlpha = 1; return y + lines.length * lh;
  }
  // // комментарий моно: слэши лаймом, текст печатается
  function kicker(g, s, x, y, lt, t0, o) {
    o = o || {}; const size = o.size || 30, th = TH[o.theme || 'dark']; g.font = F(400, size, MONO); g.textAlign = 'left';
    const n = Math.floor(clamp((lt - t0) * (o.cps || 40), 0, s.length)); if (lt < t0) return;
    g.globalAlpha = o.alpha == null ? 1 : o.alpha;
    g.fillStyle = o.theme && o.theme !== 'dark' ? th.fg : C.lime; g.fillText('//', x, y);
    g.fillStyle = o.color || th.dim; g.fillText(s.slice(0, n), x + mw(g, '// '), y);
    if (n < s.length) { g.fillStyle = C.lime; g.fillRect(x + mw(g, '// ' + s.slice(0, n)) + 2, y - size * 0.75, size * 0.5, size * 0.9); }
    g.globalAlpha = 1;
  }
  // [02] РАЗДЕЛ ---- (номер лаймом, тонкая линия вправо)
  function section(g, num, label, x, y, lt, t0, o) {
    o = o || {}; const th = TH[o.theme || 'dark'], size = o.size || 26; if (lt < t0) return;
    g.font = F(500, size, MONO); g.textAlign = 'left';
    const a = clamp((lt - t0) / 0.15); g.globalAlpha = a;
    g.fillStyle = o.theme && o.theme !== 'dark' ? th.fg : C.lime; const w1 = tracked(g, '[' + num + ']', x, y, size * 0.12);
    const n = Math.floor(clamp((lt - t0) * 40, 0, label.length));
    g.fillStyle = th.fg; const w2 = tracked(g, label.slice(0, n) + (n < label.length ? SCR[n % 9] : ''), x + w1 + size * 0.8, y, size * 0.2);
    if (o.line !== false) { const lx = x + w1 + size * 0.8 + trW(g, label, size * 0.2) + 24, p = eo((lt - t0 - 0.1) / 0.5); g.fillStyle = th.line; g.fillRect(lx, y - size * 0.33, (X1 - lx) * p, 1.5); }
    g.globalAlpha = 1;
  }

  // ---------- терминал ----------
  // cmd печатается после '$', затем строки [ ok ] имя ....... значение по одной
  function term(g, cmd, rows, x, y, lt, o) {
    o = o || {}; const big = o.big || 58, size = o.size || 36, cps = o.cps || 20, t0 = o.t0 || 0.15;
    g.textAlign = 'left'; g.font = F(500, big, MONO);
    g.fillStyle = C.lime; g.fillText('$', x, y);
    const n = Math.floor(clamp((lt - t0) * cps, 0, cmd.length)), dx = x + mw(g, '$ ');
    g.fillStyle = C.wh; g.fillText(cmd.slice(0, n), dx, y);
    const tDone = t0 + cmd.length / cps + 0.1;
    if (lt < tDone + 0.1 || o.cursorAll) { if (Math.floor(lt * 4) % 2 === 0 || n < cmd.length) { g.fillStyle = C.lime; g.fillRect(dx + mw(g, cmd.slice(0, n)) + 4, y - big * 0.78, big * 0.52, big * 0.95); } }
    g.font = F(400, size, MONO); const cw = mw(g, 'M'), col = o.col || 26;
    rows.forEach((r, i) => {
      const ta = tDone + 0.08 + i * (o.step || 0.13); if (lt < ta) return;
      const yy = y + big * 0.9 + 26 + i * size * 1.55, a = clamp((lt - ta) / 0.06); g.globalAlpha = a;
      if (r.prompt) { g.fillStyle = C.lime; g.fillText('> ', x, yy); g.fillStyle = C.lime; g.fillText(r.prompt, x + cw * 2, yy); g.globalAlpha = 1; return; }
      const st = r.st || 'ok';
      g.fillStyle = C.lime; g.fillText('[', x, yy); g.fillText(']', x + cw * 5, yy);
      g.fillStyle = st === 'ok' ? C.lime : C.grey; g.fillText(st, x + cw * 2, yy);
      g.fillStyle = C.wh; g.fillText(r.name, x + cw * 7, yy);
      const nd = Math.max(2, col - r.name.length - 1); g.fillStyle = C.dim;
      g.fillText('.'.repeat(Math.max(0, Math.floor(nd * eo((lt - ta) / 0.12)))), x + cw * (8 + r.name.length), yy);
      g.fillStyle = r.hi ? C.lime : C.wh; g.fillText(r.val || '', x + cw * (8 + col), yy);
      g.globalAlpha = 1;
    });
  }

  // ---------- пиксельный шрифт 5x7 (LED) ----------
  const PF = {};
  const defs = {
    '0': '.111.1...11..111.1.111..11...1.111.', '1': '..1...11....1....1....1....1...111.', '2': '.111.1...1....1...1...1...1...11111',
    '3': '11111...1...1.....1....11...1.111.', '4': '...1...11..1.1.1..1.11111...1....1.', '5': '111111....1111.....1....11...1.111.',
    '6': '..11..1...1....1111.1...11...1.111.', '7': '11111....1...1...1...1....1....1...', '8': '.111.1...11...1.111.1...11...1.111.',
    '9': '.111.1...11...1.1111....1...1..11..', '%': '11..111..1...1...1...1...1..111..11', '-': '...............11111...............',
    '.': '.........................11...11...', ',': '....................11....1...1....', '!': '..1....1....1....1....1.........1..',
    '?': '.111.1...1....1...1...1.........1..', '/': '....1....1...1...1...1...1....1....', '+': '.......1....1..11111..1....1.......',
    ':': '.......11...11.........11...11.....', ' ': '',
    'А': '.111.1...11...1111111...11...11...1', 'Б': '111111....1....1111.1...11...11111.', 'В': '1111.1...11...11111.1...11...11111.',
    'Г': '111111....1....1....1....1....1....', 'Д': '..11..1.1..1.1..1.1..1.1.111111...1', 'Е': '111111....1....1111.1....1....11111',
    'Ж': '1.1.11.1.11.1.1.111.1.1.11.1.11.1.1', 'З': '.111.1...1....1..11.....11...1.111.', 'И': '1...11...11..111.1.111..11...11...1',
    'Й': '.1.1...1..1...11..111.1.111..11...1', 'К': '1...11..1.1.1..11...1.1..1..1.1...1', 'Л': '..111.1..1.1..1.1..1.1..1.1..11...1',
    'М': '1...111.111.1.11.1.11...11...11...1', 'Н': '1...11...11...1111111...11...11...1', 'О': '.111.1...11...11...11...11...1.111.',
    'П': '111111...11...11...11...11...11...1', 'Р': '1111.1...11...11111.1....1....1....', 'С': '.111.1...11....1....1....1...1.111.',
    'Т': '11111..1....1....1....1....1....1..', 'У': '1...11...11...1.1111....11...1.111.', 'Ф': '..1...111.1.1.11.1.1.111...1....1..',
    'Х': '1...11...1.1.1...1...1.1.1...11...1', 'Ц': '1..1.1..1.1..1.1..1.1..1.11111....1', 'Ч': '1...11...11...1.1111....1....1....1',
    'Ш': '1.1.11.1.11.1.11.1.11.1.11.1.111111', 'Щ': '1.1.11.1.11.1.11.1.11.1.111111....1', 'Ъ': '11....1....1....111..1..1.1..1.111.',
    'Ы': '1...11...11...1111.11..111..11111.1', 'Ь': '1....1....1....1111.1...11...11111.', 'Э': '.111.1...1....1.1111....11...1.111.',
    'Ю': '1..1.1.1.11.1.1111.11.1.11.1.11..1.', 'Я': '.11111...11...1.1111..1.1.1..11...1'
  };
  const LAT = { A: 'А', B: 'В', E: 'Е', K: 'К', M: 'М', H: 'Н', O: 'О', P: 'Р', C: 'С', T: 'Т', X: 'Х', Y: 'У', Ё: 'Е' };
  for (const k in defs) { const s = defs[k], pts = []; for (let i = 0; i < s.length; i++) if (s[i] === '1') pts.push([i % 5, (i / 5) | 0]); PF[k] = pts; }
  const glyph = ch => { ch = ch.toUpperCase(); ch = LAT[ch] || ch; return PF[ch] || PF['?']; };
  const adv = ch => ch === ' ' ? 3 : (ch === '.' || ch === ',' || ch === ':' || ch === '!') ? 4 : 6;
  function pixWidth(s, cell) { let w = 0; for (const ch of String(s)) w += adv(ch); return (w - 1) * cell; }
  // точки (центры пикселей) текста, для морфинга частиц
  function pixPoints(s, x, y, cell, o) {
    o = o || {}; const out = []; let cx = o.align === 'center' ? x - pixWidth(s, cell) / 2 : x;
    for (const ch of String(s)) {
      const off = (ch === '.' || ch === ',' || ch === ':' || ch === '!') ? -1 : 0;
      if (ch !== ' ') for (const [px, py] of glyph(ch)) {
        if (o.cluster) { for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (!((a === 0 || a === 2) && (b === 0 || b === 2))) out.push({ x: cx + (px + off) * cell + (a + 0.5) * cell / 3, y: y + py * cell + (b + 0.5) * cell / 3 }); }
        else out.push({ x: cx + (px + off) * cell + cell / 2, y: y + py * cell + cell / 2 });
      }
      cx += adv(ch) * cell;
    }
    return out;
  }
  // LED-текст. o.mode 'solid' (квадраты) | 'cluster' (каждый пиксель = крестик 3x3, как табло); o.p - включение 0..1 (пиксели загораются вразброс)
  const PXC = new Map();
  function pixText(g, s, x, y, cell, o) {
    o = o || {};
    if ((o.p == null || o.p >= 1) && !o.nocache) {
      const key = s + '|' + cell + '|' + (o.mode || 'solid') + '|' + (o.color || '') + '|' + (o.gap == null ? '' : o.gap) + '|' + (o.glow || 0) + '|' + (o.seed || 1);
      let cv = PXC.get(key); const pad = Math.ceil(cell * 1.6), pw = pixWidth(s, cell);
      if (!cv) { cv = new OffscreenCanvas(Math.ceil(pw + cell + pad * 2), Math.ceil(cell * 7 + pad * 2)); const c = cv.getContext('2d');
        pixText(c, s, pad, pad, cell, Object.assign({}, o, { nocache: true, alpha: 1, align: 'left', p: 1 })); if (PXC.size > 60) PXC.clear(); PXC.set(key, cv); }
      const X = o.align === 'center' ? x - pw / 2 : o.align === 'right' ? x - pw : x;
      g.globalAlpha = o.alpha == null ? 1 : o.alpha; g.drawImage(cv, X - pad, y - pad); g.globalAlpha = 1; return pw;
    }
    const mode = o.mode || 'solid', col = o.color || C.lime, p = o.p == null ? 1 : o.p, seed = o.seed || 1;
    let cx = o.align === 'center' ? x - pixWidth(s, cell) / 2 : o.align === 'right' ? x - pixWidth(s, cell) : x;
    const full = new Path2D(), corn = new Path2D(), glows = [];
    let n = 0;
    for (const ch of String(s)) {
      const off = (ch === '.' || ch === ',' || ch === ':' || ch === '!') ? -1 : 0;
      if (ch !== ' ') for (const [px, py] of glyph(ch)) {
        n++; if (hash(n * 31 + seed) > p * 1.15 - 0.05) continue;
        const X = cx + (px + off) * cell, Y = y + py * cell;
        if (mode === 'cluster') {
          const q = cell / 3, s2 = q * 0.84;
          for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { const isC = (a === 0 || a === 2) && (b === 0 || b === 2); (isC ? corn : full).rect(X + a * q, Y + b * q, s2, s2); }
        } else { const g2 = cell * (o.gap == null ? 0.14 : o.gap); full.rect(X, Y, cell - g2, cell - g2); }
        if (o.glow) glows.push(X + cell / 2, Y + cell / 2);
      }
      cx += adv(ch) * cell;
    }
    if (glows.length) { g.globalAlpha = (o.alpha == null ? 1 : o.alpha) * o.glow; const gs = cell * 2.6;
      for (let i = 0; i < glows.length; i += 2) g.drawImage(GLOW, glows[i] - gs / 2, glows[i + 1] - gs / 2, gs, gs); }
    g.globalAlpha = o.alpha == null ? 1 : o.alpha; g.fillStyle = col; g.fill(full);
    if (mode === 'cluster') { g.globalAlpha *= 0.22; g.fill(corn); }
    g.globalAlpha = 1;
    return pixWidth(s, cell);
  }

  // ---------- точечные иконки и частицы ----------
  // росток из точек на сетке 28x34 (центр 0,0, единицы = клетки); k: 0 лайм, 1 тусклый, 2 светлый; frag = отлетающие блоки
  let SPR = null;
  function sprout() {
    if (SPR) return SPR;
    const pts = [], r = rng(5);
    const inE = (c, rr, ex, ey, ax, ay, rot) => { const dx = c - ex, dy = rr - ey, cs = Math.cos(rot), sn = Math.sin(rot); const u = dx * cs + dy * sn, v = -dx * sn + dy * cs; return (u * u) / (ax * ax) + (v * v) / (ay * ay) <= 1; };
    for (let rr = 0; rr < 34; rr++) for (let c = 0; c < 28; c++) {
      let on = false;
      if (rr >= 25 && rr <= 26 && c >= 6 && c <= 21) on = true;                 // бортик горшка
      if (rr >= 27 && rr <= 33) { const hw = 6.5 - (rr - 27) * 0.33; if (Math.abs(c + 0.5 - 14) <= hw) on = true; }
      if (rr >= 9 && rr <= 24 && (c === 13 || c === 14)) on = true;               // стебель
      if (inE(c, rr, 8, 15, 6.2, 2.9, -0.55)) on = true;                          // левый лист
      if (inE(c, rr, 19.5, 10, 6.8, 3.1, 0.5)) on = true;                         // правый лист
      if (inE(c, rr, 13.5, 5.5, 2.1, 3.6, 0.15)) on = true;                       // верхний бутон
      if (!on) continue;
      // правый лист рассыпается: дальняя часть уходит во фрагменты
      if (c >= 24 && rr <= 9) continue;
      const q = r(); pts.push({ x: c - 14, y: rr - 17, k: q < 0.12 ? 1 : q < 0.17 ? 2 : 0 });
    }
    const frag = [[23, 3], [26, 6], [20, 0], [26.5, 1.5], [23.5, -2]].map(([c, rr]) => ({ x: c - 14, y: rr - 17 }));
    SPR = { pts, frag }; return SPR;
  }
  const dotCol = (k, i) => k === 1 ? '#7E9E2A' : k === 2 ? '#EAF7C8' : (hash(i) < 0.5 ? '#C6FA40' : '#B4E838');
  // рассыпание: смещение точки i при s 0..1 (облако с завихрением)
  function scatter(x, y, i, s, cx, cy, R) {
    if (s <= 0) return [x, y];
    const a = hash(i * 3 + 1) * PI2, rr = (0.3 + hash(i * 3 + 2) * 0.9) * (R || 420), sw = s * 1.6;
    const bx = x + Math.cos(a) * rr * s, by = y + Math.sin(a) * rr * s * 0.75;
    const dx = bx - cx, dy = by - cy, cs = Math.cos(sw * 0.6), sn = Math.sin(sw * 0.6);
    return [cx + dx * cs - dy * sn, cy + dx * sn + dy * cs];
  }
  // точечная иконка: o.grow 0..1 (точки появляются снизу вверх), o.scatter 0..1, o.t для мерцания и дрейфа фрагментов
  function dots(g, cx, cy, cell, o) {
    o = o || {}; const S = sprout(), grow = o.grow == null ? 1 : o.grow, sc = o.scatter || 0, t = o.t || 0, sz = cell * (o.size || 0.72);
    const paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    for (let i = 0; i < S.pts.length; i++) {
      const p = S.pts[i]; const thr = (17 - p.y) / 34; if (thr > grow * 1.08 + hash(i) * 0.06) continue;
      let x = cx + p.x * cell, y = cy + p.y * cell; [x, y] = scatter(x, y, i, sc, cx, cy, o.R);
      const k = (hash(i + Math.floor(t * 6) * 977) < 0.03) ? 2 : p.k;
      paths[k === 0 ? (hash(i) < 0.5 ? 0 : 3) : k].rect(x - sz / 2, y - sz / 2, sz, sz);
    }
    const a = o.alpha == null ? 1 : o.alpha;
    if (o.glow) { g.globalAlpha = 0.18 * a; g.drawImage(GLOW, cx - cell * 16, cy - cell * 19, cell * 32, cell * 38); g.globalCompositeOperation = 'source-over'; }
    g.globalAlpha = a; g.fillStyle = '#C6FA40'; g.fill(paths[0]); g.fillStyle = '#B4E838'; g.fill(paths[3]);
    g.fillStyle = '#7E9E2A'; g.fill(paths[1]); g.fillStyle = '#EAF7C8'; g.fill(paths[2]);
    // фрагменты: блоки 3x3 точек, дрейфуют вверх-вправо
    if (grow >= 1) S.frag.forEach((f, j) => {
      const ph = (t * 0.5 + j * 0.23) % 1, fx = cx + (f.x + ph * 2.5) * cell, fy = cy + (f.y - ph * 3) * cell, fa = a * Math.sin(ph * Math.PI) * (1 - sc);
      g.globalAlpha = fa; g.fillStyle = C.lime; const q = cell * 0.62;
      for (let u = 0; u < 3; u++) for (let v = 0; v < 3; v++) g.fillRect(fx + (u - 1) * q * 1.15, fy + (v - 1) * q * 1.15, q * 0.82, q * 0.82);
    });
    g.globalAlpha = 1;
  }
  // точки иконки в абсолютных координатах (для морфинга)
  function sproutPts(cx, cy, cell) { return sprout().pts.map(p => ({ x: cx + p.x * cell, y: cy + p.y * cell })); }
  // морфинг облака: из A (уже рассыпанных при s=1 вокруг acx,acy) в B. p 0..1
  function morph(g, A, B, p, o) {
    o = o || {}; const N = Math.max(A.length, B.length), sz = o.size || 10, e = eio(p), acx = o.cx || W / 2, acy = o.cy || H / 2;
    const P = [new Path2D(), new Path2D(), new Path2D()];
    for (let i = 0; i < N; i++) {
      const a = A[i % A.length], b = B[i % B.length];
      const [sx, sy] = scatter(a.x, a.y, i % A.length, 1, acx, acy, o.R);
      const d = clamp(e * 1.25 - hash(i * 7) * 0.25);
      const x = lerp(sx, b.x, eo(d)) + Math.sin(i + p * 9) * 14 * (1 - d), y = lerp(sy, b.y, eo(d));
      if (i >= B.length && d > 0.6) continue;
      const k = hash(i * 5) < 0.1 ? 1 : hash(i * 5) < 0.14 ? 2 : 0;
      const s2 = lerp(o.size0 || sz, sz, d); P[k].rect(x - s2 / 2, y - s2 / 2, s2, s2);
    }
    g.globalAlpha = o.alpha == null ? 1 : o.alpha;
    g.fillStyle = '#C6FA40'; g.fill(P[0]); g.fillStyle = '#7E9E2A'; g.fill(P[1]); g.fillStyle = '#EAF7C8'; g.fill(P[2]); g.globalAlpha = 1;
  }
  // кольцо частиц, крутится и стягивается к центру (перед финальным логотипом). p 0..1
  function vortex(g, cx, cy, p, t, o) {
    o = o || {}; const n = o.n || 420, R = (o.R || 520) * (1 - eio(p) * 0.92), P = [new Path2D(), new Path2D()];
    for (let i = 0; i < n; i++) {
      const a = hash(i) * PI2 + t * (0.8 + hash(i + 9) * 0.6) + p * 3, rr = R * (0.55 + hash(i * 3) * 0.75);
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.62, s = (o.size || 8) * (0.6 + hash(i * 11) * 0.7);
      P[hash(i * 13) < 0.08 ? 1 : 0].rect(x - s / 2, y - s / 2, s, s);
    }
    g.globalAlpha = o.alpha == null ? 1 : o.alpha; g.fillStyle = C.lime; g.fill(P[0]); g.fillStyle = '#EAF7C8'; g.fill(P[1]); g.globalAlpha = 1;
  }
  // логотип: росток сплошными белыми пикселями + лаймовые фрагменты
  function logo(g, cx, cy, cell, p, o) {
    o = o || {}; const S = sprout(), P = new Path2D();
    for (let i = 0; i < S.pts.length; i++) { const q = S.pts[i]; if (hash(i * 3) > p * 1.1) continue; P.rect(cx + q.x * cell - cell / 2, cy + q.y * cell - cell / 2, cell + 0.6, cell + 0.6); }
    g.fillStyle = o.color || C.wh; g.fill(P);
    g.fillStyle = C.lime; S.frag.forEach((f, j) => { const a = clamp(p * 3 - 1.5 - j * 0.15); if (a <= 0) return; const s = cell * 2.4 * a; g.fillRect(cx + (f.x + 0.6) * cell - s / 2, cy + (f.y + 0.4) * cell - s / 2, s, s); });
  }

  // ---------- рамки, панели ----------
  function corners(g, x, y, w, h, len, col, lw) {
    g.fillStyle = col; lw = lw || 2;
    g.fillRect(x, y, len, lw); g.fillRect(x, y, lw, len); g.fillRect(x + w - len, y + h - lw, len, lw); g.fillRect(x + w - lw, y + h - len, lw, len);
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  // панель-фигура: уголки, шапка "РИС.01 - ..." слева, "РЕЖИМ: АВТО" справа, подвал
  function figPanel(g, x, y, w, h, o, a) {
    o = o || {}; if (a <= 0) return; g.globalAlpha = a;
    g.fillStyle = 'rgba(255,255,255,0.025)'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 1.5; g.strokeRect(x, y, w, h);
    corners(g, x - 8, y - 8, w + 16, h + 16, 22, 'rgba(255,255,255,0.45)', 2);
    g.font = F(400, 20, MONO); g.textAlign = 'left';
    if (o.tl) { g.fillStyle = C.hud; tracked(g, o.tl, x + 24, y + 42, 4); }
    if (o.tr) { const [l, v] = o.tr; g.fillStyle = C.lime; const vw = tracked(g, v, x + w - 24, y + 42, 4, 'right'); g.fillStyle = C.hud; tracked(g, l, x + w - 24 - vw - 12, y + 42, 4, 'right'); }
    if (o.bl) { g.fillStyle = C.lime; g.fillRect(x + 24, y + h - 36, 9, 9); g.fillStyle = C.hud; tracked(g, o.bl, x + 44, y + h - 27, 4); }
    if (o.br) { g.fillStyle = C.hud; tracked(g, o.br, x + w - 24, y + h - 27, 4, 'right'); }
    g.globalAlpha = 1;
  }
  // окно лога: шапка с тремя точками, строки агентов (в очереди -> работает), строка человека с белой кнопкой, лента событий
  function logPanel(g, x, y, w, h, rows, lt, o) {
    o = o || {}; const a = o.alpha == null ? clamp(lt / 0.25) : o.alpha; if (a <= 0) return;
    g.save(); g.globalAlpha = a; g.translate(0, (1 - eo(lt / 0.35)) * 40);
    g.fillStyle = 'rgba(16,18,21,0.92)'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = 1.5; g.strokeRect(x, y, w, h);
    g.fillStyle = C.red; g.fillRect(x + 24, y + 30, 11, 11); g.fillStyle = '#3A3C40'; g.fillRect(x + 42, y + 30, 11, 11); g.fillRect(x + 60, y + 30, 11, 11);
    g.font = F(400, 22, MONO); g.textAlign = 'left'; g.fillStyle = C.grey; g.fillText(o.path || '~/теплица/', x + 88, y + 42);
    g.fillStyle = C.wh; g.fillText(o.file || 'журнал.log', x + 88 + mw(g, o.path || '~/теплица/'), y + 42);
    g.textAlign = 'right'; g.fillStyle = C.dim; g.fillText(o.tag || '[демо]', x + w - 24, y + 42); g.textAlign = 'left';
    const rh = o.rh || 64, fs = o.fs || 34; let yy = y + 100;
    rows.forEach((r, i) => {
      const on = lt >= r.at, ra = clamp((lt - (o.in || 0.15) - i * 0.05) / 0.15); g.globalAlpha = a * ra;
      if (r.hum && on) { const k = eo((lt - r.at) / 0.2); g.fillStyle = 'rgba(255,255,255,' + (0.08 * k).toFixed(3) + ')'; g.fillRect(x + 12, yy - rh * 0.68, w - 24, rh * 0.92); }
      g.font = F(400, fs, MONO);
      if (on) { g.fillStyle = r.hum ? C.wh : C.lime; g.fillRect(x + 28, yy - fs * 0.5, 15, 15); }
      else { g.strokeStyle = C.dim; g.lineWidth = 2; g.strokeRect(x + 29, yy - fs * 0.49, 13, 13); }
      g.fillStyle = r.hum ? C.wh : (on ? '#C9CBCF' : C.grey); g.fillText(r.name, x + 62, yy);
      g.textAlign = 'right';
      if (r.hum && on) {
        g.font = F(500, fs * 0.85, MONO); const bw = mw(g, r.btn) + 30, k = spring((lt - r.at) * 1.6);
        g.save(); g.translate(x + w - 26 - bw / 2, yy - fs * 0.28); g.scale(0.85 + 0.15 * k, 0.85 + 0.15 * k);
        g.fillStyle = C.wh; g.fillRect(-bw / 2, -fs * 0.62, bw, fs * 1.18); g.fillStyle = C.ink; g.textAlign = 'center'; g.fillText(r.btn, 0, fs * 0.28); g.restore();
      } else { g.fillStyle = on ? C.lime : C.dim; g.fillText(on ? (r.st1 || 'работает') : (r.st0 || 'в очереди'), x + w - 28, yy); }
      g.textAlign = 'left'; yy += rh;
    });
    g.globalAlpha = a;
    // лента событий
    if (o.log) {
      const lf = o.lfs || 24, lh = lf * 1.6, ly = y + h - 28 - (o.logN || 4) * lh; g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x + 20, ly - lh * 0.6, w - 40, 1.5);
      const shown = o.log.filter(l => lt >= l.at); const vis = shown.slice(-(o.logN || 4));
      g.font = F(400, lf, MONO);
      vis.forEach((l, i) => {
        const yy2 = ly + lh * (i + 0.6) + (1 - eo((lt - l.at) / 0.2)) * lh * (i === vis.length - 1 ? 1 : 0);
        g.globalAlpha = a * clamp((lt - l.at) / 0.12);
        g.fillStyle = C.dim; g.fillText(l.time, x + 28, yy2); let xx = x + 28 + mw(g, l.time + '  ');
        g.fillStyle = C.lime; g.fillText(l.who, xx, yy2); xx += mw(g, l.who) + mw(g, ' ').valueOf() * 2;
        g.fillStyle = C.grey; g.fillText('→ ' + l.what, Math.max(xx, x + 28 + mw(g, l.time + '  ') + mw(g, 'M') * 8), yy2);
      });
    }
    g.restore(); g.globalAlpha = 1;
  }
  // ячейки статистики: подпись моно + значение LED-пикселями
  function stats(g, x, y, w, cells, lt, o) {
    o = o || {}; const n = cells.length, cw = w / n, h = o.h || 150, cell = o.cell || 9;
    cells.forEach((c, i) => {
      const a = clamp((lt - i * 0.08) / 0.2); if (a <= 0) return; const cx = x + i * cw;
      g.globalAlpha = a; g.fillStyle = 'rgba(255,255,255,0.03)'; g.fillRect(cx, y, cw - 6, h);
      g.font = F(400, 20, MONO); g.fillStyle = C.hud; g.textAlign = 'left'; tracked(g, c.label, cx + 20, y + 38, 4);
      pixText(g, c.val, cx + 20, y + 60, Math.min(cell, (cw - 40) / Math.max(1, pixWidth(c.val, 1))), { color: c.color || C.wh, alpha: a, gap: 0.2 });
    });
    g.globalAlpha = 1;
  }
  // карточка: тег сверху слева, номер-пиксели справа, название, подзаголовок, чипы, подвал
  function card(g, x, y, w, h, o, a) {
    if (a <= 0) return; o = o || {}; g.globalAlpha = a;
    g.fillStyle = 'rgba(17,19,23,0.95)'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 1.5; g.strokeRect(x, y, w, h);
    if (o.live) { g.fillStyle = C.lime; g.fillRect(x, y - 3, w, 3); g.globalAlpha = a * 0.25; g.drawImage(GLOW, x, y - 40, w, 80); g.globalCompositeOperation = 'source-over'; g.globalAlpha = a; }
    g.font = F(500, 22, MONO); const tw = trW(g, o.tag || '', 4) + 52;
    g.strokeStyle = o.live ? 'rgba(198,250,64,0.45)' : 'rgba(255,255,255,0.12)'; g.strokeRect(x + 28, y + 30, tw, 42);
    g.fillStyle = o.live ? C.lime : C.grey; g.fillRect(x + 42, y + 47, 9, 9); g.fillStyle = o.live ? C.lime : C.wh; g.textAlign = 'left'; tracked(g, o.tag || '', x + 62, y + 59, 4);
    pixText(g, o.num || '01', x + w - 28, y + 32, 13, { align: 'right', color: o.live ? '#4E6420' : '#2A2C31', mode: 'cluster', alpha: a });
    const divY = y + h - 76, hasChips = (o.chips || []).length && h >= 600, chipY = divY - 24 - 38;
    g.font = F(400, 36); const sl = wrap(g, o.sub || '', w - 56).slice(0, h >= 500 ? 2 : 1);
    const subLast = hasChips ? chipY - 26 : divY - 30, subFirst = subLast - (sl.length - 1) * 44, ny = subFirst - 58;
    fit(g, o.name || '', 500, h >= 500 ? 58 : 50, SANS, w - 56, 30); g.fillStyle = C.wh; g.fillText(o.name || '', x + 28, ny);
    g.font = F(400, 36); g.fillStyle = o.live ? C.lime : C.grey; sl.forEach((s, i) => g.fillText(s, x + 28, subFirst + i * 44));
    let cx = x + 28; g.font = F(400, 20, MONO);
    if (hasChips) (o.chips || []).forEach(c => { const cw2 = trW(g, c, 3) + 24; if (cx + cw2 > x + w - 20) return; g.strokeStyle = 'rgba(255,255,255,0.10)'; g.strokeRect(cx, chipY, cw2, 38); g.fillStyle = C.grey; tracked(g, c, cx + 12, chipY + 26, 3); cx += cw2 + 10; });
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x + 28, y + h - 76, w - 56, 1.5);
    g.font = F(400, 24, MONO); g.fillStyle = C.dim; g.fillText(o.foot || '', x + 28, y + h - 34);
    g.textAlign = 'right'; g.fillStyle = C.wh; g.fillText(o.link || '', x + w - 28, y + h - 34); g.textAlign = 'left';
    g.globalAlpha = 1;
  }
  // ряд статусов: ■ ГОТОВО 02  □ РАСТЁТ 02 ...
  function legend(g, items, x, y, lt, o) {
    o = o || {}; g.font = F(400, o.size || 22, MONO); g.textAlign = 'left'; let xx = x;
    items.forEach((it, i) => {
      const a = clamp((lt - i * 0.06) / 0.15); g.globalAlpha = a; const s = (o.size || 22) * 0.45;
      if (it.fill) { g.fillStyle = it.lime ? C.lime : C.grey; g.fillRect(xx, y - s * 1.6, s, s); } else { g.strokeStyle = C.grey; g.lineWidth = 2; g.strokeRect(xx, y - s * 1.6, s, s); }
      g.fillStyle = C.hud; const w1 = tracked(g, it.label, xx + s + 14, y, 4); g.fillStyle = C.wh; const w2 = tracked(g, it.val, xx + s + 14 + w1 + 14, y, 4);
      xx += s + 14 + w1 + 14 + w2 + 34;
    });
    g.globalAlpha = 1;
  }
  // шкала соотношения: лайм (доля) + белый остаток, подписи "■ АВТО 95" / "■ ВЫ 05"
  function ratioBar(g, x, y, w, share, p, o) {
    o = o || {}; const h = o.h || 16, fill = w * share * eo(p);
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x, y, w, h);
    g.globalAlpha = 0.35; g.drawImage(GLOW, x - 20, y - 30, fill + 40, h + 60); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.fillStyle = C.lime; g.fillRect(x, y, Math.max(6, fill), h);
    if (p >= 1) { const k = eo(o.restP == null ? 1 : o.restP); g.fillStyle = '#E2E3E6'; g.fillRect(x + w * share + 4, y - 3, (w * (1 - share) - 4) * k, h + 6); }
    g.font = F(400, 24, MONO); g.textAlign = 'left';
    const v = Math.max(1, Math.round(share * 100 * eo(p)));
    g.fillStyle = C.lime; g.fillRect(x, y + 44, 9, 9); tracked(g, (o.a || 'АВТО') + ' ' + String(v).padStart(2, '0'), x + 22, y + 54, 4);
    g.fillStyle = p >= 1 ? '#D9DADD' : C.dim; g.fillRect(x + w - trW(g, (o.b || 'ВЫ') + ' 05', 4) - 22, y + 44, 9, 9);
    tracked(g, (o.b || 'ВЫ') + ' ' + String(p >= 1 ? Math.round((1 - share) * 100) : 0).padStart(2, '0'), x + w, y + 54, 4, 'right');
  }
  // сегментная шкала n сегментов, k залиты
  function segBar(g, x, y, w, n, k, lt, o) {
    o = o || {}; const gap = 10, sw = (w - gap * (n - 1)) / n, h = o.h || 14;
    for (let i = 0; i < n; i++) { const on = i < k && lt > (o.t0 || 0) + i * 0.12; g.fillStyle = on ? C.lime : 'rgba(255,255,255,0.08)'; g.fillRect(x + i * (sw + gap), y, sw, h); }
  }
  // кнопка-скобки "[ подключить ]"
  function brk(g, s, cx, cy, p, o) {
    o = o || {}; if (p <= 0) return; const size = o.size || 36; g.font = F(500, size, MONO); const w = mw(g, '[ ' + s + ' ]') + 56, h = size * 1.9;
    g.globalAlpha = clamp(p * 2); const k = 0.9 + 0.1 * spring(p * 1.5);
    g.save(); g.translate(cx, cy); g.scale(k, k);
    g.globalAlpha *= 0.3; g.drawImage(GLOW, -w / 2 - 20, -h, w + 40, h * 2); g.globalCompositeOperation = 'source-over'; g.globalAlpha = clamp(p * 2);
    g.fillStyle = 'rgba(198,250,64,0.06)'; g.fillRect(-w / 2, -h / 2, w, h); g.strokeStyle = C.lime; g.lineWidth = 2.5; g.strokeRect(-w / 2, -h / 2, w, h);
    g.fillStyle = C.lime; g.textAlign = 'center'; g.fillText('[ ' + s + ' ]', 0, size * 0.33); g.restore(); g.textAlign = 'left'; g.globalAlpha = 1;
  }
  // словесный знак: строчный гротеск + лаймовая точка
  function wordmark(g, s, cx, y, size, p) {
    g.font = F(500, size); g.textAlign = 'left'; const w = mw(g, s), x = cx - w / 2 - size * 0.08;
    const n = Math.ceil(clamp(p) * s.length);
    for (let i = 0; i < n; i++) { const age = clamp(p * s.length - i); g.globalAlpha = clamp(age * 2); g.fillStyle = C.wh; g.fillText(age < 0.4 ? SCR[i % 9] : s[i], x + mw(g, s.slice(0, i)), y + (1 - eo(age)) * size * 0.12); }
    g.globalAlpha = 1; if (p >= 1) { g.fillStyle = C.lime; g.beginPath(); g.arc(x + w + size * 0.13, y - size * 0.12, size * 0.06, 0, PI2); g.fill();
      g.globalAlpha = 0.5; g.drawImage(GLOW, x + w + size * 0.13 - size * 0.2, y - size * 0.12 - size * 0.2, size * 0.4, size * 0.4); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; }
  }

  // ---------- ленты-предупреждения "/// ..." ----------
  function ribbonStrip(text, style) {
    const key = style + '|' + text; let cv = RIB.get(key); if (cv) return cv;
    const fs = 28, h = 64, unit = '/// ' + text + ' ';
    const tmp = new OffscreenCanvas(8, 8).getContext('2d'); tmp.font = F(700, fs, MONO); const cw = tmp.measureText('M').width + 5;
    const uw = Math.ceil(unit.length * cw), reps = Math.ceil(1500 / uw) + 1;
    cv = new OffscreenCanvas(uw * reps, h); const c = cv.getContext('2d');
    c.fillStyle = style === 'lime' ? C.lime : style === 'white' ? '#E6E7EA' : C.ink; c.fillRect(0, 0, cv.width, h);
    const u = new OffscreenCanvas(uw, h), uc = u.getContext('2d');
    uc.font = F(700, fs, MONO); uc.textBaseline = 'middle'; uc.fillStyle = style === 'ink' ? C.lime : C.ink;
    for (let i = 0; i < unit.length; i++) if (unit[i] !== ' ') uc.fillText(unit[i], i * cw, h / 2 + 2);
    for (let k = 0; k < reps; k++) c.drawImage(u, k * uw, 0);
    cv._uw = uw; RIB.set(key, cv); return cv;
  }
  // лента через весь кадр под углом ang (рад), едет со скоростью speed px/с; p 0..1 - выезд
  function ribbon(g, cy, ang, text, t, o) {
    o = o || {}; const cv = ribbonStrip(text, o.style || 'lime'), sp = o.speed || 160, p = o.p == null ? 1 : o.p; if (p <= 0) return;
    const off = ((t * sp) % cv._uw + cv._uw) % cv._uw, h = cv.height * (o.scale || 1);
    g.save(); g.translate(W / 2, cy); g.rotate(ang); g.translate((1 - eo(p)) * (o.dir || 1) * -1400, 0);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(-760, -h / 2 + 10, 1520, h + 12);
    g.drawImage(cv, off, 0, 1500, cv.height, -750, -h / 2, 1500, h);
    g.restore();
  }

  // ---------- HUD ----------
  let HUD = { tl: 'СИСТЕМА.ОНЛАЙН', tr: ['ЦЕЛЬ:', '95% АВТО / 5% ВЫ'], bl2: ['ГРЯДКИ:', '2/5'], bm2: ['АПТАЙМ:', '24/7'], clock: 'МСК 06:14', fig: 'РИС.00' };
  function setHud(o) { HUD = Object.assign({}, HUD, o); }
  function hud(g, t, theme, fig, dur) {
    const th = TH[theme || 'dark']; g.font = F(400, 21, MONO); g.textAlign = 'left';
    g.fillStyle = theme === 'dark' ? 'rgba(4,5,7,0.55)' : 'rgba(0,0,0,0.05)'; g.fillRect(0, 0, W, 106);
    g.fillStyle = th.line; g.fillRect(0, 106, W, 1.5);
    g.fillStyle = theme === 'dark' ? C.lime : th.fg; g.fillRect(36, 40, 9, 9); g.fillStyle = th.hudV; tracked(g, HUD.tl, 56, 50, 4);
    const [l, v] = HUD.tr; const parts = v.split(' / '); let xr = 1044;
    g.fillStyle = th.hudV; const w2 = tracked(g, parts[1] || '', xr, 50, 4, 'right'); xr -= w2;
    g.fillStyle = th.hud; const w3 = tracked(g, ' / ', xr, 50, 4, 'right'); xr -= w3;
    g.fillStyle = theme === 'dark' ? C.lime : th.fg; const w4 = tracked(g, parts[0], xr, 50, 4, 'right'); xr -= w4 + 12;
    g.fillStyle = th.hud; tracked(g, l, xr, 50, 4, 'right');
    g.fillStyle = th.hud; const a1 = tracked(g, HUD.bl2[0], 36, 86, 4); g.fillStyle = th.hudV; tracked(g, HUD.bl2[1], 36 + a1 + 12, 86, 4);
    g.fillStyle = th.hud; const a2 = tracked(g, HUD.bm2[0], 380, 86, 4); g.fillStyle = th.hudV; tracked(g, HUD.bm2[1], 380 + a2 + 12, 86, 4);
    const ss = String(Math.floor(t + 17) % 60).padStart(2, '0'); g.fillStyle = th.hud; const cw = tracked(g, HUD.clock + ':', 1044 - trW(g, ss, 4) - 2, 86, 4, 'right'); g.fillStyle = th.hudV; tracked(g, ss, 1044, 86, 4, 'right');
    corners(g, 24, 124, 26, 26, 26, th.br, 2); g.fillStyle = th.br; g.fillRect(1030, 124, 26, 2); g.fillRect(1054, 124, 2, 26);
    g.fillRect(24, 1636, 26, 2); g.fillRect(24, 1612, 2, 26); g.fillRect(1030, 1636, 26, 2); g.fillRect(1054, 1612, 2, 26);
    g.fillStyle = theme === 'dark' ? C.lime : th.fg; g.fillRect(36, 1659, 8, 8); g.fillStyle = th.hud; tracked(g, fig || HUD.fig, 56, 1668, 4);
    const tc = '00:' + String(Math.floor(t)).padStart(2, '0') + '.' + String(Math.floor((t % 1) * 100)).padStart(2, '0');
    g.fillStyle = th.hud; const rw = tracked(g, tc, 1044, 1668, 4, 'right'); g.fillStyle = th.hudV; const rw2 = tracked(g, 'LIVE · ', 1044 - rw, 1668, 4, 'right'); g.fillStyle = th.hud; tracked(g, 'РЕНДЕР: ', 1044 - rw - rw2, 1668, 4, 'right');
    g.fillStyle = th.line; g.fillRect(0, 1686, W, 1.5); g.fillStyle = theme === 'dark' ? C.lime : th.fg; g.fillRect(0, 1685, W * clamp(t / (dur || 18)), 3);
  }

  // ---------- сцены, камера, переходы ----------
  function scene(t, CUTS, dur) {
    let i = 0; while (i < CUTS.length && t >= CUTS[i]) i++;
    const t0 = i ? CUTS[i - 1] : 0, t1 = i < CUTS.length ? CUTS[i] : (dur || t0 + 4);
    return { i, t0, t1, lt: t - t0, d: t1 - t0, left: t1 - t, p: clamp((t - t0) / (t1 - t0)) };
  }
  // уход элемента в конце сцены (за 0.18 с до склейки)
  const outA = sc => clamp(sc.left / 0.18);
  // глитч без буфера: полосы кадра сдвигаются (копия холста сам в себя), две полосы тонируются красным/голубым, подъём чёрного
  // глитч: тонированные полосы (multiply красный/голубой), подъём чёрного, серо-оливковые полосы, лайм-линия; кадр сдвинут камерой в frame
  function glitchFx(g, a, seed) {
    const r = rng(seed);
    for (let i = 0; i < 3; i++) { const y = 120 + r() * 1560, h = 20 + r() * 110; g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.7 * a; g.fillStyle = i % 2 ? '#40F0FF' : '#FF4A6A'; g.fillRect(0, y, W, h); }
    g.globalCompositeOperation = 'screen'; g.globalAlpha = 1; g.fillStyle = 'rgba(60,62,66,' + (0.55 * a).toFixed(3) + ')'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
    bars(g, a, seed);
  }
  function bars(g, a, seed) {
    const r = rng(seed * 7 + 3);
    for (let i = 0; i < 4; i++) { const y = 150 + r() * 1500, h = 6 + r() * 26; g.fillStyle = r() < 0.5 ? 'rgba(128,130,134,' + (0.75 * a).toFixed(3) + ')' : 'rgba(110,138,30,' + (0.85 * a).toFixed(3) + ')'; g.fillRect(0, y, W, h); }
    if (a > 0.5) { const y = 300 + r() * 1300, w = 700 * a; g.fillStyle = C.cyan; g.fillRect(W / 2 - w / 2 - 6, y, 6, 4); g.fillStyle = C.red; g.fillRect(W / 2 + w / 2, y, 6, 4);
      g.globalAlpha = 0.5; g.drawImage(GLOW, W / 2 - w / 2, y - 22, w, 48); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = C.lime; g.fillRect(W / 2 - w / 2, y, w, 4); }
  }
  // главный кадр. SC[i] = {bg:'dark'|'lime'|'light', fig:'РИС.01 - ...', draw(g, lt, sc, t)}; o.tr[j] = тип склейки j: glitch | grey | flash | cut
  function frame(k, t, CUTS, SC, o) {
    prep(); o = o || {}; const g = k.g, dur = k.duration, sc = scene(t, CUTS, dur), S = SC[Math.min(sc.i, SC.length - 1)], theme = S.bg || 'dark';
    let tr = null;
    for (let j = 0; j < CUTS.length; j++) {
      const ty = (o.tr && o.tr[j]) || 'glitch', w = ty === 'cut' ? 0.07 : ty === 'glitch' ? 0.13 : 0.16, dd = t - CUTS[j];
      if (dd > -w && dd < w * 1.3) { tr = { ty, a: clamp(1 - Math.abs(dd) / (dd < 0 ? w : w * 1.3)), j, dd }; break; }
    }
    const useBuf = tr && tr.ty === 'glitch' && tr.a > 0.04, c = g;
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.drawImage(BG[theme], 0, 0);
    const cam = 1 + 0.04 * (1 - eo(sc.lt / 0.55)) + 0.014 * eio(sc.p) + (tr && tr.dd < 0 ? 0.03 * tr.a : 0);
    const gj = useBuf ? (rng(Math.floor(t * 30) + 7)() - 0.5) * 60 * tr.a : 0;
    c.save(); c.translate(W / 2 + gj, H * 0.46); c.scale(cam, cam); c.translate(-W / 2, -H * 0.46);
    S.draw(c, sc.lt, sc, t, theme); c.restore(); c.globalAlpha = 1; c.textAlign = 'left';
    if (useBuf) glitchFx(g, tr.a, Math.floor(t * 30 / 2) + tr.j * 31);
    else if (tr && tr.a > 0) {
      if (tr.ty === 'grey') { g.globalAlpha = 0.92 * tr.a; g.drawImage(BG.grey, 0, 0); g.globalAlpha = 1; if (tr.a > 0.4) bars(g, tr.a * 0.6, tr.j + 5); }
      else if (tr.ty === 'flash') { g.fillStyle = 'rgba(232,233,236,' + (0.95 * tr.a).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
      else bars(g, tr.a, Math.floor(t * 30) + tr.j);
    }
    hud(g, t, theme, S.fig, dur);
    const f = Math.floor(t * 30); g.globalAlpha = theme === 'dark' ? 1 : 0.6; g.drawImage(OVER, -(f % 3) * 2, -((f * 7) % 5)); g.globalAlpha = 1;
  }
  // звуки склеек: glitch -> click низкий + tick, grey -> toggle_off, flash -> pop_high, cut -> click
  function cutSounds(s, CUTS, types) {
    CUTS.forEach((c, j) => {
      const ty = (types && types[j]) || 'glitch';
      if (ty === 'glitch') { s.play(c - 0.04, 'click', 0.16, { pitch: 0.6 }); s.play(c + 0.03, 'tick', 0.1, { pitch: 1.6 }); }
      else if (ty === 'grey') s.play(c, 'toggle_off', 0.14, { pitch: 0.8 });
      else if (ty === 'flash') s.play(c, 'pop_high', 0.14, { pitch: 0.7 });
      else s.play(c, 'click', 0.14, { pitch: 0.9 });
    });
  }

  return { SANS, SERIF, MONO, C, TH, W, H, X0, X1,
    clamp, lerp, prog, eo, eio, ein, spring, rng, hash, F, life, count, fmt,
    prep, fit, wrap, tracked, trW, typeLines, lead, kicker, section, term,
    pixText, pixWidth, pixPoints, sprout, dots, sproutPts, scatter, morph, vortex, logo,
    corners, rr, figPanel, logPanel, stats, card, legend, ratioBar, segBar, brk, wordmark, ribbon,
    setHud, hud, scene, outA, bars, frame, cutSounds };
})();
