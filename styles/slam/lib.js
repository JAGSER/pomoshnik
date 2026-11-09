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
  // cmd печатается после '$', затем строки [ ок ] имя ....... значение по одной
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
      const st = r.st || 'ок';
      g.fillStyle = C.lime; g.fillText('[', x, yy); g.fillText(']', x + cw * 5, yy);
      g.fillStyle = (st === 'ок' || st === 'ok') ? C.lime : C.grey; g.fillText(st, x + cw * 2, yy);
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
    ':': '.......11...11.........11...11.....', ' ': '', '₽': '.111..1..1.1..1.111..1...111...1...',
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
    o = o || {}; const S = o.icon || sprout(), grow = o.grow == null ? 1 : o.grow, sc = o.scatter || 0, t = o.t || 0, sz = cell * (o.size || 0.72);
    const paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    for (let i = 0; i < S.pts.length; i++) {
      const p = S.pts[i]; const hr = (S.rows || 34) / 2, thr = (hr - p.y) / (hr * 2); if (thr > grow * 1.08 + hash(i) * 0.06) continue;
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
    o = o || {}; const S = o.icon || sprout(), P = new Path2D();
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
    g.font = F(400, 22, MONO); g.textAlign = 'left'; g.fillStyle = C.grey; g.fillText(o.path || '', x + 88, y + 42);
    g.fillStyle = C.wh; g.fillText(o.file || '', x + 88 + mw(g, o.path || ''), y + 42);
    g.textAlign = 'right'; g.fillStyle = C.dim; g.fillText(o.tag || '', x + w - 24, y + 42); g.textAlign = 'left';
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
      } else { g.fillStyle = on ? C.lime : C.dim; g.fillText(on ? (r.st1 || o.st1 || 'работает') : (r.st0 || o.st0 || 'в очереди'), x + w - 28, yy); }
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
  // шкала соотношения: лайм (доля) + белый остаток, подписи o.a / o.b ("■ АВТО 95" / "■ ВЫ 05")
  function ratioBar(g, x, y, w, share, p, o) {
    o = o || {}; const h = o.h || 16, fill = w * share * eo(p);
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x, y, w, h);
    g.globalAlpha = 0.35; g.drawImage(GLOW, x - 20, y - 30, fill + 40, h + 60); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.fillStyle = C.lime; g.fillRect(x, y, Math.max(6, fill), h);
    if (p >= 1) { const k = eo(o.restP == null ? 1 : o.restP); g.fillStyle = '#E2E3E6'; g.fillRect(x + w * share + 4, y - 3, (w * (1 - share) - 4) * k, h + 6); }
    g.font = F(400, 24, MONO); g.textAlign = 'left';
    const v = Math.max(1, Math.round(share * 100 * eo(p)));
    g.fillStyle = C.lime; g.fillRect(x, y + 44, 9, 9); tracked(g, (o.a || '') + ' ' + String(v).padStart(2, '0'), x + 22, y + 54, 4);
    const bs = (o.b || '') + ' ' + String(Math.round((1 - share) * 100)).padStart(2, '0');
    g.fillStyle = p >= 1 ? '#D9DADD' : C.dim; g.fillRect(x + w - trW(g, bs, 4) - 22, y + 44, 9, 9);
    tracked(g, (o.b || '') + ' ' + String(p >= 1 ? Math.round((1 - share) * 100) : 0).padStart(2, '0'), x + w, y + 54, 4, 'right');
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
  let HUD = { tl: '', tr: null, bl2: null, bm2: null, clock: '', fig: '', rec: null };
  function setHud(o) { HUD = Object.assign({}, HUD, o); }
  function hud(g, t, theme, fig, dur) {
    const th = TH[theme || 'dark']; g.font = F(400, 21, MONO); g.textAlign = 'left';
    g.fillStyle = theme === 'dark' ? 'rgba(4,5,7,0.55)' : 'rgba(0,0,0,0.05)'; g.fillRect(0, 0, W, 106);
    g.fillStyle = th.line; g.fillRect(0, 106, W, 1.5);
    if (HUD.tl) { g.fillStyle = theme === 'dark' ? C.lime : th.fg; g.fillRect(36, 40, 9, 9); g.fillStyle = th.hudV; tracked(g, HUD.tl, 56, 50, 4); }
    if (HUD.tr) { const [l, v] = HUD.tr; const parts = String(v).split(' / '); let xr = 1044;
      if (parts.length > 1) { g.fillStyle = th.hudV; const w2 = tracked(g, parts[1], xr, 50, 4, 'right'); xr -= w2; g.fillStyle = th.hud; const w3 = tracked(g, ' / ', xr, 50, 4, 'right'); xr -= w3; }
      g.fillStyle = theme === 'dark' ? C.lime : th.fg; const w4 = tracked(g, parts[0], xr, 50, 4, 'right'); xr -= w4 + 12;
      g.fillStyle = th.hud; tracked(g, l, xr, 50, 4, 'right'); }
    if (HUD.bl2) { g.fillStyle = th.hud; const a1 = tracked(g, HUD.bl2[0], 36, 86, 4); g.fillStyle = th.hudV; tracked(g, HUD.bl2[1], 36 + a1 + 12, 86, 4); }
    if (HUD.bm2) { g.fillStyle = th.hud; const a2 = tracked(g, HUD.bm2[0], 380, 86, 4); g.fillStyle = th.hudV; tracked(g, HUD.bm2[1], 380 + a2 + 12, 86, 4); }
    if (HUD.clock) { const ss = String(Math.floor(t + 17) % 60).padStart(2, '0'); g.fillStyle = th.hud; tracked(g, HUD.clock + ':', 1044 - trW(g, ss, 4) - 2, 86, 4, 'right'); g.fillStyle = th.hudV; tracked(g, ss, 1044, 86, 4, 'right'); }
    corners(g, 24, 124, 26, 26, 26, th.br, 2); g.fillStyle = th.br; g.fillRect(1030, 124, 26, 2); g.fillRect(1054, 124, 2, 26);
    g.fillRect(24, 1636, 26, 2); g.fillRect(24, 1612, 2, 26); g.fillRect(1030, 1636, 26, 2); g.fillRect(1054, 1612, 2, 26);
    g.fillStyle = theme === 'dark' ? C.lime : th.fg; g.fillRect(36, 1659, 8, 8); g.fillStyle = th.hud; tracked(g, fig || HUD.fig, 56, 1668, 4);
    const tc = '00:' + String(Math.floor(t)).padStart(2, '0') + '.' + String(Math.floor((t % 1) * 100)).padStart(2, '0');
    g.fillStyle = th.hud; const rw = tracked(g, tc, 1044, 1668, 4, 'right');
    if (HUD.rec) { g.fillStyle = th.hudV; const rw2 = tracked(g, HUD.rec[1] + ' · ', 1044 - rw, 1668, 4, 'right'); g.fillStyle = th.hud; tracked(g, HUD.rec[0] + ' ', 1044 - rw - rw2, 1668, 4, 'right'); }
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


  // ---------- ТИПОВЫЕ ОБЪЕКТЫ: точечные спрайты (квадратные клетки с зазором, как иконка из точек) ----------
  // Цвет любого объекта: имя из WC ('blue', 'rust', 'pink'...) или '#hex'. Тень формы делается сама (роль заглавной буквой).
  const WC = { lime: '#C6FA40', white: '#E8E9EC', grey: '#8B8E94', dark: '#34373D', black: '#1A1C20', pink: '#FF8FBE', orange: '#FF8A2E', red: '#FF4B55',
    rust: '#E5792B', yellow: '#FFD43B', blue: '#3E8BFF', sky: '#7FC8FF', navy: '#2C4FA8', green: '#5ED16A', olive: '#7E9E2A', brown: '#8C5B3A', wood: '#A8743F',
    violet: '#A77BFF', beige: '#E8CFA0', sea: '#2F7FD1', warm: '#FFD86B', concrete: '#9A9DA3' };
  const SKIN = ['#F3CDA8', '#E2A97E', '#B97A50', '#7A4B2E'], HAIR = ['#2B2019', '#6B4226', '#D8B26A', '#C9CBD0', '#B8502A'];
  const SHIRTS = ['#3E8BFF', '#FF8A2E', '#5ED16A', '#E8E9EC', '#FF8FBE', '#FFD43B', '#A77BFF', '#FF4B55'];
  const wc = c => c == null ? null : (WC[c] || c);
  const HX = new Map(), MX = new Map();
  function hx(c) { c = wc(c); let v = HX.get(c); if (v) return v; if (c[0] === '#') { let s = c.slice(1); if (s.length === 3) s = s.replace(/./g, m => m + m); v = [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16)); } else { const m = c.match(/[\d.]+/g) || [128, 128, 128]; v = m.slice(0, 3).map(Number); } HX.set(c, v); return v; }
  function mix(a, b, k) { const key = a + '|' + b + '|' + k; let v = MX.get(key); if (v) return v; const p = hx(a), q = hx(b); v = 'rgb(' + p.map((x, i) => Math.round(x + (q[i] - x) * k)).join(',') + ')'; MX.set(key, v); return v; }
  // сетка-раскраска: значения ячеек - буквы ролей
  function grid(w, h) {
    const c = new Array(w * h).fill(0), o = { w, h, c,
      p(x, y, v) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) c[y * w + x] = v; return o; },
      r(x0, y0, x1, y1, v) { for (let y = Math.round(y0); y <= y1; y++) for (let x = Math.round(x0); x <= x1; x++) o.p(x, y, v); return o; },
      e(cx, cy, rx, ry, v, ring) { for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = dx * dx + dy * dy; if (d <= 1 && (!ring || d >= ring)) o.p(x, y, v); } return o; },
      l(x0, y0, x1, y1, v) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) o.p(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, v); return o; },
      get(x, y) { return (x >= 0 && y >= 0 && x < w && y < h) ? c[y * w + x] : 0; } };
    return o;
  }
  // спрайт: build() -> grid, roles {буква: цвет}. Кэш по ключу. Клетка = квадрат 0.84 с зазором, 10% клеток тусклее, 5% светлее (фактура стиля)
  const SPC = new Map();
  function sprite(key, cell, roles, build) {
    const k = key + '|' + cell + '|' + JSON.stringify(roles); let cv = SPC.get(k); if (cv) return cv;
    const gr = build(), pad = 2, s = Math.max(1, cell * 0.84), off = (cell - s) / 2;
    cv = new OffscreenCanvas(Math.ceil(gr.w * cell + pad * 2), Math.ceil(gr.h * cell + pad * 2)); const c = cv.getContext('2d');
    for (let y = 0; y < gr.h; y++) for (let x = 0; x < gr.w; x++) {
      const v = gr.c[y * gr.w + x]; if (!v) continue;
      let cc = roles[v]; if (!cc && roles[v.toLowerCase()]) cc = mix(wc(roles[v.toLowerCase()]), '#000000', 0.32); if (!cc) continue; cc = wc(cc);
      const q = hash(x * 131 + y * 977 + gr.w * 7);
      c.fillStyle = q < 0.1 ? mix(cc, '#08090C', 0.3) : q > 0.95 ? mix(cc, '#FFFFFF', 0.35) : cc;
      c.fillRect(pad + x * cell + off, pad + y * cell + off, s, s);
    }
    cv._pad = pad; cv._g = gr; if (SPC.size > 500) SPC.clear(); SPC.set(k, cv); return cv;
  }
  // вывод спрайта: (x, y) = точка привязки (ax, ay в клетках). o.dir -1 зеркально, o.p 0..1 собирается снизу вверх, o.alpha
  function put(g, cv, x, y, cell, ax, ay, o) {
    o = o || {}; const a = o.alpha == null ? 1 : o.alpha, p = o.p == null ? 1 : clamp(o.p); if (a <= 0 || p <= 0) return;
    const X = Math.round(x - ax * cell - cv._pad), Y = Math.round(y - ay * cell - cv._pad), w = cv.width, h = cv.height, ga = g.globalAlpha;
    g.globalAlpha = ga * a;
    if (o.dir === -1) { g.save(); g.translate(Math.round(x) * 2, 0); g.scale(-1, 1); }
    if (p >= 1) g.drawImage(cv, X, Y); else { const hh = Math.max(1, Math.round(h * p)); g.drawImage(cv, 0, h - hh, w, hh, X, Y + h - hh, w, hh); }
    if (o.dir === -1) g.restore();
    g.globalAlpha = ga;
  }
  const frameOf = (o, n, sp) => o.f != null ? o.f : Math.floor((o.t || 0) * (sp || o.speed || 5)) % (n || 2);
  const glowAt = (g, x, y, r, a) => { g.globalAlpha = a; g.drawImage(GLOW, x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; };
  // свечение любого цвета (кэш)
  const GLC = new Map();
  function glowC(g, x, y, r, c, a) { c = wc(c); let cv = GLC.get(c); if (!cv) { cv = new OffscreenCanvas(64, 64); const x2 = cv.getContext('2d'), p = hx(c), gg = x2.createRadialGradient(32, 32, 0, 32, 32, 32); gg.addColorStop(0, 'rgba(' + p + ',0.6)'); gg.addColorStop(1, 'rgba(' + p + ',0)'); x2.fillStyle = gg; x2.fillRect(0, 0, 64, 64); GLC.set(c, cv); }
    const ga = g.globalAlpha; g.globalAlpha = ga * (a == null ? 1 : a); g.drawImage(cv, x - r, y - r, r * 2, r * 2); g.globalAlpha = ga; }

  // ---- человек ----
  // рисует фигуру в сетку gr: (ox, oy) = левая колонка торса и строка макушки. Возвращает {hand:[x,y], bottom}
  function figure(gr, ox, oy, o, f) {
    const kind = o.kind || 'adult', T = kind === 'child' ? 5 : 8, L = kind === 'child' ? 5 : kind === 'old' ? 7 : 8, pose = o.pose || 'stand';
    const P = (x, y, v) => gr.p(ox + x, oy + y, v), R = (x0, y0, x1, y1, v) => gr.r(ox + x0, oy + y0, ox + x1, oy + y1, v);
    const hb = kind === 'old' && pose !== 'sit' ? 1 : 0, hs = o.hairStyle || 'short', ts = 6, ls = ts + T, le = ls + L - 1;
    // рюкзак за спиной
    if (o.bag) R(-2, ts + 1, -1, ts + (kind === 'child' ? 4 : 5), 'p');
    // голова, волосы, каска
    R(hb, 1, 3 + hb, 4, 's');
    if (hs !== 'bald') { R(hb, 0, 3 + hb, 0, 'h'); P(hb, 1, 'h'); P(3 + hb, 1, 'h'); if (hs === 'long') { R(hb - 1, 1, hb - 1, 6, 'h'); R(4 + hb, 1, 4 + hb, 5, 'h'); } if (hs === 'bun') R(1 + hb, -1, 2 + hb, -1, 'h'); }
    if (o.helmet || o.hat) { R(hb - 1, 0, 4 + hb, 0, 'm'); R(hb, -1, 3 + hb, -1, 'm'); }
    if (pose === 'walk' || pose === 'run' || pose === 'ride') P(3 + hb, 2, 'k'); else if (!o.noEyes) { P(1 + hb, 2, 'k'); P(3 + hb, 2, 'k'); }
    R(1, 5, 2, 5, 's');
    // торс
    R(0, ts, 3, ts + T - 1, 'a'); R(0, ts, 0, ts + T - 1, 'A');
    // ноги
    const shoe = (x0, x1, y) => R(x0, y, x1, y, 'k');
    const lg = o.dress ? 's' : 'b', lgS = o.dress ? 'S' : 'B';
    if (pose === 'sit' || pose === 'ride') {
      if (pose === 'sit') { R(0, ls, 5, ls + 1, 'b'); R(4, ls + 2, 5, ls + 2 + Math.round(L * 0.6), lg); shoe(4, 6, ls + 3 + Math.round(L * 0.6)); }
      else { R(1, ls, 4, ls + 1, 'b'); const k = f ? 0 : 1; R(3 + k, ls + 2, 4 + k, ls + 5, lg); shoe(3 + k, 5 + k, ls + 6); }
    } else if (o.dress) {
      R(-1, ls, 4, ls + 3, 'a'); R(-1, ls, -1, ls + 3, 'A');
      const sh = (pose === 'walk' || pose === 'run') && !f ? 1 : 0;
      R(0 - sh, ls + 4, 0 - sh, le, 's'); R(3 + sh, ls + 4, 3 + sh, le, 'S'); shoe(-sh, 1 - sh, le + 1); shoe(3 + sh, 4 + sh, le + 1);
    } else {
      const sw = (pose === 'walk' && !f) ? 1 : (pose === 'run' && !f) ? 2 : (pose === 'dance' && !f) ? 1 : 0, mid = ls + Math.floor(L / 2);
      R(0, ls, 3, ls + 1, 'b');
      if (pose === 'dance' && f) { R(0, ls + 2, 1, mid, lg); R(-1, mid, 0, mid + 1, lg); shoe(-2, -1, mid + 1); R(2, ls + 2, 3, le, lgS); shoe(2, 4, le + 1); }
      else { R(0, ls + 2, 1, mid, lg); R(0 - sw, mid + 1, 1 - sw, le, lg); R(2, ls + 2, 3, mid, lgS); R(2 + sw, mid + 1, 3 + sw, le, lgS); shoe(-sw, 1 - sw + (sw ? 0 : 0), le + 1); shoe(2 + sw, 4 + sw, le + 1); }
    }
    // руки
    let hand = [4, ts + T - 1];
    const armL = () => { R(-1, ts, -1, ts + T - 2, 'A'); P(-1, ts + T - 1, 's'); };
    const armR = () => { R(4, ts, 4, ts + T - 2, 'a'); P(4, ts + T - 1, 's'); };
    const it = o.item;
    if (it === 'accordion' || it === 'basket') {
      R(-1, ts, -1, ts + 1, 'A'); R(4, ts, 4, ts + 1, 'a'); P(-2, ts + 3, 's'); P(5, ts + 3, 's');
      if (it === 'accordion') { const fw = f ? 0 : 1; R(-1 + fw, ts + 2, 4 - fw, ts + 5, 'i'); for (let x = 0 + fw; x <= 3 - fw; x += 2) R(x, ts + 2, x, ts + 5, 'I'); }
      else { R(-1, ts + 3, 4, ts + 5, 'i'); R(-1, ts + 2, -1, ts + 2, 'I'); R(4, ts + 2, 4, ts + 2, 'I'); }
      hand = [5, ts + 3];
    } else if (pose === 'wave') {
      armL(); if (f) { R(5, ts - 3, 5, ts - 1, 'a'); P(4, ts, 'a'); P(5, ts - 4, 's'); hand = [5, ts - 4]; } else { R(4, ts - 3, 4, ts, 'a'); P(4, ts - 4, 's'); hand = [4, ts - 4]; }
    } else if (pose === 'dance') {
      if (f) { R(-3, ts, -1, ts, 'A'); P(-4, ts, 's'); R(4, ts, 6, ts, 'a'); P(7, ts, 's'); hand = [7, ts]; }
      else { R(-1, ts - 3, -1, ts, 'A'); P(-1, ts - 4, 's'); R(4, ts - 3, 4, ts, 'a'); P(4, ts - 4, 's'); hand = [4, ts - 4]; }
    } else if (pose === 'hold' || pose === 'ride' || (pose === 'sit' && it)) {
      armL(); R(4, ts, 4, ts + 2, 'a'); R(5, ts + 3, 6, ts + 3, 'a'); P(7, ts + 3, 's'); hand = [7, ts + 3];
      if (pose === 'ride') { gr.r(ox + 4, oy + ts + 3, ox + 6, oy + ts + 3, 0); R(5, ts + 1, 6, ts + 1, 'a'); R(4, ts, 4, ts, 'a'); P(7, ts + 2, 's'); hand = [7, ts + 2]; }
    } else if (pose === 'walk' || pose === 'run') {
      if (f) { armL(); armR(); } else { R(-1, ts, -1, ts + T - 3, 'A'); P(-2, ts + T - 2, 's'); R(4, ts, 4, ts + T - 3, 'a'); P(5, ts + T - 2, 's'); hand = [5, ts + T - 2]; }
    } else { armL(); armR(); }
    if (o.cane) { const b = pose === 'sit' ? ls + 3 + Math.round(L * 0.6) : le + 1; R(5, hand[1], 5, b, 'w'); }
    // предмет в руке
    const [hx2, hy2] = hand;
    if (it === 'book') { R(hx2 - 1, hy2 - 2, hx2 + 2, hy2 - 1, 'i'); R(hx2 - 1, hy2 - 1, hx2 + 2, hy2 - 1, 'I'); }
    else if (it === 'box') R(hx2 - 1, hy2 - 3, hx2 + 2, hy2 - 1, 'i');
    else if (it === 'bag') { R(hx2, hy2 + 1, hx2 + 2, hy2 + 3, 'i'); }
    else if (it === 'cup') R(hx2, hy2 - 2, hx2 + 1, hy2 - 1, 'i');
    else if (it === 'phone') R(hx2, hy2 - 2, hx2, hy2 - 1, 'i');
    else if (it === 'fish') { R(hx2 + 1, hy2, hx2 + 4, hy2 + 1, 'i'); P(hx2 + 5, hy2 - 1, 'i'); P(hx2 + 5, hy2 + 2, 'i'); }
    else if (it === 'flag') { R(hx2, hy2 - 9, hx2, hy2 + 1, 'w'); R(hx2 + 1, hy2 - 9, hx2 + 3, hy2 - 7, 'i'); }
    else if (it === 'flower') { R(hx2, hy2 - 3, hx2, hy2, 'G'); R(hx2 - 1, hy2 - 5, hx2 + 1, hy2 - 4, 'i'); }
    const bottom = (pose === 'sit') ? ls + 3 + Math.round(L * 0.6) : pose === 'ride' ? ls + 6 : (pose === 'dance' && f && !o.dress) ? le + 1 : le + 1;
    return { hand: [ox + hand[0], oy + hand[1]], bottom: oy + bottom, seat: oy + ls };
  }
  function figRoles(o, i) {
    i = i || 0; const kind = o.kind || 'adult';
    return { a: o.shirt || o.dress || SHIRTS[i % SHIRTS.length], b: o.pants || (kind === 'child' ? '#2C4FA8' : '#4A4E57'), s: typeof o.skin === 'number' ? SKIN[o.skin] : (o.skin || SKIN[i % 2]),
      h: typeof o.hair === 'number' ? HAIR[o.hair] : (o.hair || (kind === 'old' ? HAIR[3] : HAIR[(i * 3) % 5 === 3 ? 0 : (i * 3) % 5])), k: '#4A4D55',
      m: o.helmet === true ? '#FFD43B' : (o.helmet || o.hat || '#FFD43B'), p: o.bag === true ? '#FF4B55' : (o.bag || '#FF4B55'), i: o.itemCol || (o.item === 'accordion' ? '#FF4B55' : o.item === 'book' ? '#E8E9EC' : o.item === 'fish' ? '#9AB8C8' : '#FFD43B'),
      w: '#A8743F', G: '#5ED16A' };
  }
  // person(g, x, y, o): x,y = середина ступней на земле. Возвращает {top, hand:{x,y}, w, h}
  function person(g, x, y, o) {
    o = o || {}; const cell = o.cell || 8, kind = o.kind || 'adult', pose = o.pose || 'stand';
    const anim = pose === 'walk' || pose === 'run' || pose === 'dance' || pose === 'wave' || pose === 'ride' || o.item === 'accordion';
    const f = anim ? frameOf(o, 2, o.speed || (pose === 'run' ? 8 : pose === 'wave' ? 4 : 5)) : 0;
    const roles = figRoles(o, o.i), T = kind === 'child' ? 5 : 8, L = kind === 'child' ? 5 : kind === 'old' ? 7 : 8, H = 9 + T + L, Wd = 14, ox = 5, oy = 1;
    let info = null;
    const key = 'p:' + [kind, pose, f, o.hairStyle, !!o.dress, !!(o.helmet || o.hat), !!o.bag, o.item || '', !!o.cane, !!o.noEyes].join(',');
    const cv = sprite(key, cell, roles, () => { const gr = grid(Wd, H); info = figure(gr, ox, oy, o, f); gr.info = info; return gr; });
    info = cv._g.info; const ay = info.bottom + 1, ax = ox + 2;
    put(g, cv, x, y, cell, ax, ay, o);
    const d = o.dir === -1 ? -1 : 1;
    return { top: y - (ay - oy) * cell, hand: { x: x + d * (info.hand[0] + 0.5 - ax) * cell, y: y - (ay - info.hand[1] - 0.5) * cell }, h: (ay - oy) * cell, w: 6 * cell, seat: y - (ay - info.seat) * cell };
  }
  // ряд людей: n, gap (px между центрами), kinds:['adult','child'...], shirts:[...], poses:[...], each(i) -> доп. параметры
  function crowd(g, x, y, o) {
    o = o || {}; const n = o.n || 3, cell = o.cell || 8, gap = o.gap || cell * 8;
    for (let i = 0; i < n; i++) {
      const pi = Object.assign({ i: i + (o.seed || 0), cell, t: (o.t || 0) + i * 0.13, dir: o.dir, pose: (o.poses && o.poses[i % o.poses.length]) || o.pose || 'stand',
        kind: (o.kinds && o.kinds[i % o.kinds.length]) || o.kind || 'adult', p: o.p, alpha: o.alpha, helmet: o.helmet, bag: o.bag, item: o.item }, o.shirts ? { shirt: o.shirts[i % o.shirts.length] } : {}, o.each ? o.each(i) : {});
      person(g, x + (i - (n - 1) / 2) * gap, y + (o.stagger ? (i % 2) * o.stagger : 0), pi);
    }
  }

  // ---- животные (вид сбоку, смотрят вправо; dir:-1 влево) ----
  function dog(g, x, y, o) {
    o = o || {}; const cell = o.cell || 8, pose = o.pose || 'stand', f = pose === 'walk' || pose === 'run' ? frameOf(o, 2, 6) : pose === 'sleep' ? frameOf(o, 2, 0.8) : 0;
    const roles = { a: o.col || 'rust', k: '#1A1C20', n: '#2A1E16', c: o.collar || '#3E8BFF', x: '#E8E9EC' };
    const cv = sprite('dog:' + pose + f + (o.collar ? 'c' : ''), cell, roles, () => {
      const gr = grid(17, 11);
      if (pose === 'sleep') { gr.r(2, 6, 12, 9, 'a').r(2, 9, 12, 9, 'A').r(12, 5, 15, 9, 'a').p(15, 9, 'A').r(11, 4, 12, 5, 'A').r(13, 7, 14, 7, 'n').p(16, 8, 'n').r(0, 8, 1, 9, 'a');
        if (f) gr.p(14, 2, 'x'); else gr.p(15, 1, 'x'); if (o.collar) gr.r(12, 6, 12, 9, 'c'); }
      else if (pose === 'sit') { gr.r(4, 3, 9, 8, 'a').r(2, 7, 8, 9, 'a').r(4, 8, 8, 9, 'A').r(9, 0, 13, 4, 'a').p(9, 0, 'A').p(13, 0, 'A').r(14, 2, 15, 3, 'a').p(15, 2, 'n').p(12, 1, 'k').r(8, 5, 9, 9, 'a').r(9, 9, 10, 9, 'A').r(0, 6, 1, 7, 'a'); if (o.collar) gr.r(9, 4, 11, 4, 'c'); }
      else { gr.r(3, 4, 12, 7, 'a').r(3, 7, 12, 7, 'A').r(11, 1, 14, 5, 'a').p(11, 0, 'A').p(12, 0, 'A').r(15, 3, 16, 4, 'a').p(16, 3, 'n').p(13, 2, 'k').r(0, 2, 2, 3, 'a').p(2, 4, 'a');
        const s = f ? 1 : 0; gr.r(4 - s, 8, 4 - s, 10, 'A').r(6 + s, 8, 6 + s, 10, 'a').r(10 - s, 8, 10 - s, 10, 'A').r(12 + s, 8, 12 + s, 10, 'a'); if (o.collar) gr.r(11, 5, 11, 6, 'c'); }
      return gr; });
    put(g, cv, x, y, cell, 8.5, 11, o);
    if (pose === 'sleep' && o.zz !== false) { const t = o.t || 0; g.font = F(500, cell * 2.6, MONO); g.fillStyle = C.wh; for (let i = 0; i < 2; i++) { const ph = (t * 0.5 + i * 0.5) % 1; g.globalAlpha = Math.sin(ph * Math.PI) * (o.alpha == null ? 1 : o.alpha) * 0.8; g.fillText('з', x + (o.dir === -1 ? -1 : 1) * cell * (5 + ph * 4) , y - cell * (11 + ph * 6)); } g.globalAlpha = 1; }
  }
  function cat(g, x, y, o) {
    o = o || {}; const cell = o.cell || 7, pose = o.pose || 'stand', f = pose === 'walk' ? frameOf(o, 2, 6) : 0;
    const roles = { a: o.col || 'grey', k: '#1A1C20', e: '#C6FA40', n: '#FF8FBE' };
    const cv = sprite('cat:' + pose + f, cell, roles, () => {
      const gr = grid(15, 11);
      if (pose === 'sleep') gr.r(2, 7, 11, 10, 'a').r(10, 5, 13, 9, 'a').p(10, 4, 'a').p(13, 4, 'a').r(11, 7, 12, 7, 'k').r(0, 9, 1, 10, 'A').r(2, 10, 11, 10, 'A');
      else if (pose === 'sit') gr.r(5, 4, 9, 10, 'a').r(4, 8, 9, 10, 'A').r(8, 1, 12, 5, 'a').p(8, 0, 'a').p(12, 0, 'a').p(9, 2, 'e').p(11, 2, 'e').p(10, 4, 'n').r(2, 9, 3, 10, 'a').p(1, 8, 'a');
      else { gr.r(2, 5, 10, 7, 'a').r(2, 7, 10, 7, 'A').r(10, 2, 13, 5, 'a').p(10, 1, 'a').p(13, 1, 'a').p(12, 3, 'e').p(13, 4, 'n').r(0, 1, 0, 4, 'a').p(1, 5, 'a');
        const s = f ? 1 : 0; gr.r(3 - s, 8, 3 - s, 10, 'A').r(4 + s, 8, 4 + s, 10, 'a').r(8 - s, 8, 8 - s, 10, 'A').r(10 + s, 8, 10 + s, 10, 'a'); }
      return gr; });
    put(g, cv, x, y, cell, 7.5, 11, o);
  }
  // птица: машет крыльями (кадр по t). col тело, wing крылья
  function bird(g, x, y, o) {
    o = o || {}; const cell = o.cell || 6, f = o.f != null ? o.f : Math.floor(((o.t || 0) * (o.speed || 6) + (o.ph || 0) * 4)) % 3;
    const cv = sprite('bird:' + f, cell, { a: o.col || 'white', b: o.wing || '#B9BCC2', y: '#FFD43B', k: '#1A1C20' }, () => {
      const gr = grid(13, 7); gr.r(4, 3, 8, 4, 'a').r(9, 2, 10, 3, 'a').p(11, 3, 'y').p(10, 2, 'k').p(3, 3, 'b').p(2, 3, 'b');
      if (f === 0) gr.l(5, 2, 2, 0, 'b').l(7, 2, 10, 0, 'b'); else if (f === 1) gr.r(1, 2, 5, 2, 'b').r(7, 2, 11, 1, 'B'); else gr.l(5, 5, 3, 6, 'b').l(7, 5, 9, 6, 'b');
      return gr; });
    put(g, cv, x, y, cell, 6.5, 3.5, o);
  }
  // стая кружит: n птиц по эллипсу вокруг (cx, cy), rx, ry
  function birds(g, t, o) {
    o = o || {}; const n = o.n || 5;
    for (let i = 0; i < n; i++) { const a = t * (o.speed || 0.7) + i * PI2 / n, d = Math.sin(a) > 0 ? 1 : -1;
      bird(g, o.x + Math.cos(a) * (o.rx || 260) * (0.8 + 0.2 * hash(i)), o.y + Math.sin(a) * (o.ry || 70) + hash(i * 3) * 40, { t, ph: i, cell: o.cell || 6, dir: -d, col: o.col, wing: o.wing, alpha: o.alpha }); }
  }

  // ---- транспорт ----
  function car(g, x, y, o) {
    o = o || {}; const cell = o.cell || 8, f = o.move ? frameOf(o, 2, 8) : 0;
    const cv = sprite('car:' + f, cell, { a: o.col || 'red', g: '#9FD3FF', k: '#25272C', x: '#C9CBD0', l: '#FFD86B' }, () => {
      const gr = grid(20, 9); gr.r(5, 0, 13, 0, 'a').r(4, 1, 14, 3, 'a').r(6, 1, 8, 3, 'g').r(10, 1, 12, 3, 'g').r(0, 3, 19, 6, 'a').r(0, 6, 19, 6, 'A').p(19, 4, 'l').p(0, 4, 'A');
      for (const cx of [4, 15]) { gr.e(cx, 7, 2, 2, 'k'); gr.p(cx - 1 + f, 6 + f, 'x'); } return gr; });
    put(g, cv, x, y, cell, 10, 9, o);
  }
  // автобус: num - номер на табло, people - головы в окнах, cell 9 по умолчанию (~300 px)
  function bus(g, x, y, o) {
    o = o || {}; const cell = o.cell || 9, f = o.move ? frameOf(o, 2, 8) : 0, ppl = o.people == null ? 3 : o.people;
    const cv = sprite('bus:' + f + ':' + ppl, cell, { a: o.col || 'blue', g: '#9FD3FF', k: '#25272C', x: '#C9CBD0', l: '#FFD86B', w: '#E8E9EC', s: SKIN[0], h: HAIR[1] }, () => {
      const gr = grid(36, 15); gr.r(0, 0, 35, 12, 'a').r(0, 12, 35, 12, 'A').r(1, 0, 34, 0, 'A');
      for (let i = 0; i < 6; i++) gr.r(2 + i * 5, 2, 5 + i * 5, 6, 'g');
      gr.r(31, 2, 34, 6, 'g').r(32, 8, 34, 11, 'g').r(26, 8, 29, 12, 'g').r(26, 8, 26, 12, 'A').r(0, 8, 24, 8, 'w').p(35, 10, 'l');
      for (let i = 0; i < ppl; i++) { const cx = 3 + ((i * 2 + 1) % 6) * 5; gr.r(cx, 4, cx + 1, 5, 's').r(cx, 3, cx + 1, 3, 'h').r(cx - 1, 6, cx + 2, 6, i % 2 ? 'x' : 'l'); }
      for (const cx of [7, 28]) { gr.e(cx, 13, 2.3, 2.3, 'k'); gr.p(cx - 1 + f, 12 + f, 'x'); } return gr; });
    put(g, cv, x, y, cell, 18, 15, o);
    if (o.num != null) { const d = o.dir === -1 ? -1 : 1, s = String(o.num), cw = cell * 0.55, pw = pixWidth(s, cw) + cell * 1.2, cx = x + d * 15.5 * cell;
      g.globalAlpha = o.alpha == null ? 1 : o.alpha; g.fillStyle = '#16181C'; g.fillRect(cx - pw / 2, y - 14.6 * cell, pw, cell * 5.2);
      pixText(g, s, cx, y - 14.6 * cell + cell * 0.7, cw, { align: 'center', color: '#FFB23B', alpha: o.alpha }); g.globalAlpha = 1; }
  }
  // велосипед с седоком: rider = параметры person (kind, shirt, helmet...); rider:false - без седока
  function bike(g, x, y, o) {
    o = o || {}; const cell = o.cell || 7, f = o.move === false ? 0 : frameOf(o, 2, 6), r = o.rider === false ? null : (o.rider || {});
    const roles = r ? Object.assign(figRoles(r, r.i), { f: o.col || 'red', q: '#3A3D44', x: '#C9CBD0' }) : { f: o.col || 'red', q: '#3A3D44', x: '#C9CBD0' };
    const key = 'bike:' + f + ':' + (r ? [r.kind, r.hairStyle, !!r.helmet, !!r.bag, !!r.dress].join(',') : '-');
    const cv = sprite(key, cell, roles, () => {
      const gr = grid(22, 36), by = 35;
      for (const cx of [4, 16]) { gr.e(cx + 0.5, by - 3.5, 4, 4, 'q', 0.45); gr.p(cx + (f ? 1 : -1) + 0.5, by - 3.5, 'x'); }
      gr.l(4, by - 4, 9, by - 4, 'f').l(9, by - 4, 14, by - 9, 'f').l(4, by - 4, 8, by - 10, 'f').l(8, by - 10, 14, by - 10, 'f').l(14, by - 10, 16, by - 4, 'f').r(7, by - 11, 9, by - 11, 'q');
      let inf = null; if (r) inf = figure(gr, 7, r.kind === 'child' ? 12 : 9, Object.assign({}, r, { pose: 'ride' }), f);
      const hx3 = inf ? inf.hand[0] : 15, hy3 = inf ? inf.hand[1] + 1 : by - 14; gr.l(14, by - 10, hx3, hy3, 'f').r(hx3 - 1, hy3, hx3, hy3, 'q');
      return gr; });
    put(g, cv, x, y, cell, 10.5, 36, o);
  }
  // лодка: kind 'motor'|'row'|'sail', riders: [параметры person], wake - пена за кормой (нужен t)
  function boat(g, x, y, o) {
    o = o || {}; const cell = o.cell || 8, kind = o.kind || 'motor', rd = o.riders || [];
    const roles = Object.assign(rd[0] ? figRoles(rd[0], rd[0].i) : {}, { u: o.col || 'white', z: o.stripe || 'red', c: o.cabin || 'white', g: '#9FD3FF', k: '#34373D', w: '#A8743F', v: o.sail || '#E8E9EC' });
    const key = 'boat:' + kind + ':' + rd.length + ':' + rd.map(r => [r.kind, r.pose, r.hairStyle, !!r.helmet, !!r.hat, !!r.dress].join('.')).join('|');
    const cv = sprite(key, cell, roles, () => {
      const gr = grid(30, 34), hy = 27;
      rd.slice(0, 2).forEach((r, i) => figure(gr, (kind === 'motor' ? 5 : 9) + i * 7, hy - (r.kind === 'child' ? 12 : 18), Object.assign({}, r, { pose: r.pose || 'stand' }), 0));
      if (kind === 'sail') { gr.r(15, 2, 15, hy - 1, 'w'); for (let yy = 3; yy < hy - 2; yy++) gr.r(16, yy, 16 + Math.round((yy - 3) * 0.45), yy, 'v'); }
      if (kind === 'motor') { gr.r(17, hy - 7, 25, hy - 1, 'c').r(17, hy - 7, 25, hy - 7, 'C').r(19, hy - 5, 23, hy - 3, 'g').r(0, hy - 2, 2, hy + 3, 'k'); }
      for (let yy = hy; yy <= hy + 5; yy++) { const ins = yy - hy; gr.r(2 + ins, yy, 29 - ins * 1.4, yy, yy === hy + 2 ? 'z' : yy === hy + 5 ? 'U' : 'u'); }
      return gr; });
    if (o.wake && o.t != null) { const d = o.dir === -1 ? -1 : 1; g.fillStyle = '#E8E9EC'; for (let i = 0; i < 10; i++) { const ph = (o.t * 1.5 + i / 10) % 1; g.globalAlpha = (1 - ph) * 0.8 * (o.alpha == null ? 1 : o.alpha); const s = cell * 0.7; g.fillRect(x - d * (15 + ph * 14) * cell + Math.sin(i * 7) * cell, y + (hash(i) - 0.2) * cell * 2, s, s); } g.globalAlpha = 1; }
    put(g, cv, x, y, cell, 15, 32, o);
  }
  // ---- здания (x = середина низа, y = земля) ----
  // окна: lit 0..1 доля горящих (снизу вверх), out 0..1 доля погасших (по одному в случайном порядке), win - цвет горящих
  function windows(g, list, o) {
    const lit = o.lit == null ? 0 : o.lit, out = o.out || 0, n = list.length, wcol = wc(o.win || 'warm');
    list.forEach((w, i) => { const on = (i + 1) / n <= lit + 1e-6 && hash(i * 17 + (o.seed || 0)) >= out;
      g.fillStyle = on ? wcol : '#1C1F25'; g.fillRect(w[0], w[1], w[2], w[3]); if (on && o.glow !== false) glowC(g, w[0] + w[2] / 2, w[1] + w[3] / 2, w[2] * 1.3, wcol, 0.35); });
  }
  function house(g, x, y, o) {
    o = o || {}; const cell = o.cell || 10, cw = Math.round((o.w || 260) / cell), ch = Math.round((o.h || 220) / cell), rh = Math.ceil(cw / 2.6);
    const cv = sprite('house:' + cw + 'x' + ch, cell, { a: o.col || 'beige', r: o.roof || 'red', d: '#6B4226' }, () => {
      const gr = grid(cw + 2, ch + rh);
      for (let i = 0; i < rh; i++) gr.r(Math.round(i * 1.3), rh - 1 - i, cw + 1 - Math.round(i * 1.3), rh - 1 - i, 'r');
      gr.r(1, rh, cw, rh + ch - 1, 'a').r(1, rh, 1, rh + ch - 1, 'A').r(Math.floor(cw / 2), rh + ch - 6, Math.floor(cw / 2) + 2, rh + ch - 1, 'd'); return gr; });
    put(g, cv, x, y, cell, (cw + 2) / 2, ch + rh, o);
    if ((o.p == null || o.p >= 1) && (o.alpha == null || o.alpha > 0)) { const x0 = x - (cw + 2) / 2 * cell, wy = y - ch * cell + 3 * cell, ws = 3 * cell;
      g.globalAlpha = o.alpha == null ? 1 : o.alpha; windows(g, [[x0 + 3 * cell, wy, ws, ws], [x0 + (cw - 4) * cell, wy, ws, ws]], o); g.globalAlpha = 1; }
    return { top: y - (ch + rh) * cell };
  }
  // многоэтажка: floors, cols окон, built 0..1 стройка (этажи растут снизу, сверху каркас), lit/out окна
  function tower(g, x, y, o) {
    o = o || {}; const cell = o.cell || 10, fl = o.floors || 5, cols = o.cols || 4, fh = 4, cw = cols * 4 + 2, built = o.built == null ? 1 : o.built;
    const shown = Math.min(fl, Math.max(0, built * fl)), full = Math.floor(shown), H = fl * fh + 1;
    const cv = sprite('tower:' + fl + 'x' + cols, cell, { a: o.col || 'concrete', t: o.roof || '#5C5F66' }, () => {
      const gr = grid(cw, H); gr.r(0, 1, cw - 1, H - 1, 'a').r(0, 0, cw - 1, 0, 't').r(0, 1, 0, H - 1, 'A'); for (let f = 1; f < fl; f++) gr.r(0, f * fh + 1, cw - 1, f * fh + 1, 'A'); return gr; });
    const x0 = Math.round(x - cw / 2 * cell), a = o.alpha == null ? 1 : o.alpha;
    if (full > 0) { const hh = full * fh * cell + (full >= fl ? cell : 0); g.globalAlpha = a; g.drawImage(cv, 0, cv.height - hh - cv._pad, cv.width, hh + cv._pad, x0 - cv._pad, y - hh, cv.width, hh + cv._pad); g.globalAlpha = 1; }
    if (shown < fl) { // каркас следующего этажа
      const fy = y - (full + 1) * fh * cell, k = shown - full; g.fillStyle = wc(o.col || 'concrete'); g.globalAlpha = a * 0.75; const s = cell * 0.84;
      for (let yy = 0; yy < fh; yy++) for (let xx = 0; xx < cw; xx++) { if ((xx % 4 === 0 || xx === cw - 1) && (fh - yy) / fh <= k + 0.01) g.fillRect(x0 + xx * cell, fy + yy * cell, s, s); }
      g.globalAlpha = 1; }
    const list = []; for (let f = 0; f < full; f++) for (let c = 0; c < cols; c++) list.push([x0 + (1 + c * 4 + 1) * cell, y - (f + 1) * fh * cell + 1.4 * cell, 2 * cell * 0.92, 2 * cell * 0.92]);
    list.sort((p, q) => q[1] - p[1] || p[0] - q[0]); // снизу вверх
    g.globalAlpha = a; windows(g, list, o); g.globalAlpha = 1;
    return { top: y - shown * fh * cell, left: x0, w: cw * cell, floorH: fh * cell };
  }
  // магазин/кафе: витрина, полосатый навес (col, awning), вывеска sign (текст из темы)
  function shop(g, x, y, o) {
    o = o || {}; const cell = o.cell || 10, cw = Math.round((o.w || 320) / cell), ch = Math.round((o.h || 200) / cell);
    const cv = sprite('shop:' + cw + 'x' + ch + (o.cafe ? 'c' : ''), cell, { a: o.col || 'beige', s: o.awning || 'red', x: '#E8E9EC', g: '#9FD3FF', d: '#6B4226', w: '#A8743F' }, () => {
      const gr = grid(cw, ch + 3); gr.r(0, 3, cw - 1, ch + 2, 'a').r(0, 3, 0, ch + 2, 'A');
      for (let xx = 0; xx < cw; xx++) gr.r(xx, 0, xx, 2, Math.floor(xx / 2) % 2 ? 'x' : 's'); for (let xx = 0; xx < cw; xx += 2) gr.p(xx, 3, 's');
      gr.r(2, 6, cw - 8, ch - 1, 'g').r(cw - 6, 6, cw - 3, ch + 2, 'd');
      if (o.cafe) { gr.r(3, ch, 7, ch, 'w').r(5, ch + 1, 5, ch + 2, 'w'); } return gr; });
    put(g, cv, x, y, cell, cw / 2, ch + 3, o);
    if (o.sign) board(g, x - (cw / 2) * cell + cell, y - (ch + 3) * cell - cell * 7.4, { w: Math.min(cw * cell - cell * 2, 40 + o.sign.length * cell * 3.4), h: cell * 6.4, title: o.sign, size: cell * 4, plate: true, col: o.signCol, alpha: o.alpha, p: o.p });
    return { top: y - (ch + 3) * cell };
  }
  const cafe = (g, x, y, o) => shop(g, x, y, Object.assign({ cafe: true, awning: 'green' }, o));
  function school(g, x, y, o) {
    o = o || {}; const cell = o.cell || 10, cw = Math.round((o.w || 520) / cell), ch = Math.round((o.h || 260) / cell);
    const cv = sprite('school:' + cw + 'x' + ch, cell, { a: o.col || 'orange', r: o.roof || '#5C5F66', d: '#6B4226', w: '#E8E9EC', f: o.flag || 'blue' }, () => {
      const gr = grid(cw, ch + 9); gr.r(0, 9, cw - 1, ch + 8, 'a').r(0, 9, 0, ch + 8, 'A').r(0, 9, cw - 1, 9, 'r');
      const c = Math.floor(cw / 2); gr.r(c - 4, 6, c + 4, 8, 'r').r(c - 3, ch + 3, c + 2, ch + 8, 'd').r(c, 0, c, 6, 'w').r(c + 1, 0, c + 4, 2, 'f'); return gr; });
    put(g, cv, x, y, cell, cw / 2, ch + 9, o);
    const x0 = x - cw / 2 * cell, list = [], c = Math.floor(cw / 2);
    for (let r = 0; r < 2; r++) for (let i = 1; i < cw - 3; i += 5) { if (r === 1 && Math.abs(i + 1.5 - c) < 5) continue; list.push([x0 + i * cell + cell, y - ch * cell + (2 + r * 6) * cell + cell, 3 * cell, 3 * cell]); }
    if (o.p == null || o.p >= 1) { g.globalAlpha = o.alpha == null ? 1 : o.alpha; windows(g, list, Object.assign({ lit: 0, glow: false }, o)); g.globalAlpha = 1;
      if (o.sign) board(g, x - cw * cell * 0.3, y - (ch + 9) * cell + 11 * cell, { w: cw * cell * 0.6, h: cell * 4.4, title: o.sign, size: cell * 2.6, plate: true, center: true, alpha: o.alpha }); }
    return { top: y - (ch + 9) * cell };
  }
  // башенный кран: h высота, jib длина стрелы (px), at 0..1 тележка по стреле, drop 0..1 трос вниз, load {w,h,col} плита. Возвращает {hook:{x,y}}
  function crane(g, x, y, o) {
    o = o || {}; const cell = o.cell || 9, hc = Math.round((o.h || 620) / cell), jc = Math.round((o.jib || 560) / cell);
    const cv = sprite('crane:' + hc + 'x' + jc, cell, { a: o.col || 'yellow', k: '#34373D', g: '#9FD3FF' }, () => {
      const gr = grid(jc + 10, hc + 4); const mx = 7;
      for (let yy = 4; yy < hc + 4; yy++) { gr.p(mx, yy, 'a'); gr.p(mx + 2, yy, 'a'); if (yy % 3 === 0) gr.p(mx + 1, yy, 'A'); }
      gr.r(0, 3, jc + 9, 3, 'a').r(0, 4, mx + 2, 4, 'A'); for (let xx = mx + 3; xx < jc + 9; xx += 3) gr.p(xx, 4, 'A');
      gr.r(mx, 0, mx + 2, 2, 'a').r(0, 5, 3, 7, 'k').r(mx + 3, 5, mx + 5, 7, 'a').p(mx + 4, 6, 'g').r(mx - 2, hc + 3, mx + 4, hc + 3, 'k'); return gr; });
    put(g, cv, x, y, cell, 8, hc + 4, o);
    const trolley = x + (2 + (o.at == null ? 0.7 : o.at) * (jc - 2)) * cell, top = y - (hc + 4) * cell + 4.5 * cell, len = (o.drop == null ? 0.4 : o.drop) * (hc - 8) * cell + 2 * cell;
    g.globalAlpha = (o.alpha == null ? 1 : o.alpha) * (o.p == null ? 1 : clamp(o.p * 2 - 1)); g.fillStyle = '#C9CBD0'; g.fillRect(trolley - 1, top, 2, len); g.fillStyle = '#34373D'; g.fillRect(trolley - cell, top - cell * 0.5, cell * 2, cell);
    const hook = { x: trolley, y: top + len };
    if (o.load) { const lw = o.load.w || 180, lh = o.load.h || 26; g.fillStyle = 'rgba(201,203,208,0.8)'; g.fillRect(trolley - 1, hook.y, 2, 16); g.beginPath(); g.moveTo(trolley, hook.y); g.lineTo(trolley - lw / 2, hook.y + 30); g.moveTo(trolley, hook.y); g.lineTo(trolley + lw / 2, hook.y + 30); g.strokeStyle = 'rgba(201,203,208,0.8)'; g.lineWidth = 2; g.stroke();
      const s = cell * 0.84, lc = wc(o.load.col || 'concrete'); g.fillStyle = lc; for (let yy = 0; yy < lh; yy += cell) for (let xx = 0; xx < lw; xx += cell) g.fillRect(trolley - lw / 2 + xx, hook.y + 30 + yy, Math.min(s, lw - xx), Math.min(s, lh - yy)); }
    g.globalAlpha = 1; return { hook };
  }
  // вывеска / доска с текстом: title, lines ['строка' | ['слева','справа']], p 0..1 надпись пишется, chalk true - школьная доска мелом, stand - ножки
  function board(g, x, y, o) {
    o = o || {}; const w = o.w || 520, h = o.h || 380, a = o.alpha == null ? 1 : o.alpha, p = o.p == null ? 1 : o.p; if (a <= 0) return;
    g.globalAlpha = a; const fr = wc(o.frame || (o.plate ? (o.col || '#16181C') : 'wood')), bg = o.plate ? wc(o.col || '#16181C') : (o.chalk === false ? '#16181C' : '#1F2B24');
    if (o.stand) { g.fillStyle = wc('wood'); g.fillRect(x + w * 0.12, y + h - 6, 10, o.stand); g.fillRect(x + w * 0.88 - 10, y + h - 6, 10, o.stand); }
    g.fillStyle = fr; g.fillRect(x - 8, y - 8, w + 16, h + 16); g.fillStyle = bg; g.fillRect(x, y, w, h);
    if (!o.plate) { g.fillStyle = 'rgba(255,255,255,0.04)'; for (let i = 0; i < 6; i++) g.fillRect(x + hash(i) * w * 0.7, y + hash(i + 9) * h, w * 0.3, 2); }
    const ink = wc(o.ink || (o.plate ? 'white' : '#EDEFE6')), sz = o.size || 44; g.fillStyle = ink; let yy = y + sz * 1.05 + (o.plate ? (h - sz * 1.3) / 2 - sz * 0.05 : 14);
    const all = [o.title].concat(o.lines || []).filter(v => v != null), total = all.reduce((s, l) => s + (Array.isArray(l) ? l.join('').length : String(l).length), 0); let left = Math.floor(total * clamp(p) + 0.001);
    all.forEach((l, i) => { const fs = i === 0 && o.title && !o.plate ? sz * 1.1 : sz; g.font = F(i === 0 && o.title ? 500 : 400, fs);
      if (Array.isArray(l)) { const a1 = l[0].slice(0, Math.max(0, left)); left -= l[0].length; const b1 = l[1].slice(0, Math.max(0, left)); left -= l[1].length; g.textAlign = 'left'; g.fillText(a1, x + 30, yy); g.textAlign = 'right'; g.fillText(b1, x + w - 30, yy); g.textAlign = 'left'; }
      else { const s = String(l).slice(0, Math.max(0, left)); left -= String(l).length; g.textAlign = o.center || o.plate ? 'center' : 'left'; g.fillText(s, o.center || o.plate ? x + w / 2 : x + 30, yy); g.textAlign = 'left'; }
      yy += fs * 1.35; });
    g.globalAlpha = 1;
  }

  // ---- природа ----
  function tree(g, x, y, o) {
    o = o || {}; const cell = o.cell || 9, kind = o.kind || 'leaf', hc = Math.round((o.h || 300) / cell);
    const cv = sprite('tree:' + kind + hc, cell, { a: o.col || (kind === 'pine' ? '#3FA45A' : 'green'), t: o.trunk || 'brown', f: o.fruit || 'red' }, () => {
      const w = Math.round(hc * (kind === 'pine' ? 0.62 : 0.8)) | 1, gr = grid(w, hc), c = (w - 1) / 2;
      if (kind === 'pine') { gr.r(c - 1, hc - 4, c + 1, hc - 1, 't'); const tiers = 3; for (let k = 0; k < tiers; k++) { const t0 = Math.round(k * (hc - 4) / (tiers + 0.6)), t1 = Math.round(t0 + (hc - 4) * 0.48); for (let yy = t0; yy <= Math.min(t1, hc - 4); yy++) { const hw = (yy - t0 + 1) * (w / 2) / (t1 - t0 + 1) * (0.6 + 0.4 * (k + 1) / tiers); gr.r(c - hw, yy, c + hw, yy, yy === t1 ? 'A' : 'a'); } } }
      else if (kind === 'bush') { gr.e(c + 0.5, hc * 0.55, w / 2, hc * 0.45, 'a'); }
      else { gr.r(c - 1, Math.round(hc * 0.5), c + 1, hc - 1, 't').r(c - 1, Math.round(hc * 0.5), c - 1, hc - 1, 'T'); gr.e(c + 0.5, hc * 0.34, w / 2, hc * 0.32, 'a'); gr.e(c * 0.55, hc * 0.45, w * 0.24, hc * 0.17, 'a'); gr.e(c * 1.45 + 1, hc * 0.45, w * 0.24, hc * 0.17, 'a');
        for (let yy = 0; yy < hc; yy++) for (let xx = 0; xx < w; xx++) if (gr.get(xx, yy) === 'a' && (yy > hc * 0.5 || hash(xx * 13 + yy * 71) < 0.18)) gr.p(xx, yy, 'A'); }
      if (o.fruit) for (let i = 0; i < 9; i++) { const xx = Math.floor(hash(i * 5) * w), yy = Math.floor(hash(i * 7) * hc * 0.6); if (gr.get(xx, yy)) gr.p(xx, yy, 'f'); }
      return gr; });
    const w = Math.round(hc * (kind === 'pine' ? 0.62 : 0.8)) | 1; put(g, cv, x, y, cell, w / 2, hc, o);
    return { top: y - hc * cell };
  }
  function grass(g, x, y, w, o) {
    o = o || {}; const cell = o.cell || 7, n = Math.round(w / cell);
    const cv = sprite('grass:' + n, cell, { a: o.col || 'green' }, () => { const gr = grid(n, 4); for (let i = 0; i < n; i++) { const hh = 1 + Math.floor(hash(i * 3) * 3.4); gr.r(i, 4 - hh, i, 3, hash(i) < 0.3 ? 'A' : 'a'); } return gr; });
    put(g, cv, x, y, cell, 0, 4, o);
  }
  // падающие листья: n, область x,y,w,h, cols - цвета (клён: rust/red/yellow)
  function leaves(g, t, o) {
    o = o || {}; const n = o.n || 18, cols = (o.cols || ['rust', 'red', 'yellow', 'orange']).map(wc), s = o.size || 12;
    for (let i = 0; i < n; i++) { const sp = 0.12 + hash(i * 3) * 0.12, ph = (t * sp + hash(i)) % 1, xx = o.x + hash(i * 7) * o.w + Math.sin(t * 2 + i) * 30, yy = o.y + ph * o.h;
      g.globalAlpha = (o.alpha == null ? 1 : o.alpha) * Math.min(1, (1 - ph) * 5); g.fillStyle = cols[i % cols.length]; g.fillRect(xx, yy, s, s); g.fillRect(xx + s, yy - s * 0.6, s * 0.7, s * 0.7); }
    g.globalAlpha = 1;
  }
  // солнце: r радиус, col цвет (розовое: 'pink'), horizon - y линии горизонта (ниже не рисуется), rise 0..1 подъём (сдвиг вниз на 2r при 0)
  function sun(g, x, y, o) {
    o = o || {}; const cell = o.cell || 10, rc = Math.round((o.r || 130) / cell), col = o.col || 'yellow', yy = y + (1 - (o.rise == null ? 1 : o.rise)) * rc * 2 * cell;
    const cv = sprite('sun:' + rc, cell, { a: col }, () => { const gr = grid(rc * 2 + 1, rc * 2 + 1); gr.e(rc + 0.5, rc + 0.5, rc + 0.5, rc + 0.5, 'a'); for (let r = rc + 2; r < rc * 2 + 1; r += 3) gr.r(0, r, rc * 2, r, 0); return gr; });
    g.save(); if (o.horizon != null) { g.beginPath(); g.rect(0, 0, W, o.horizon); g.clip(); }
    glowC(g, x, yy, rc * cell * 2.4, col, (o.alpha == null ? 1 : o.alpha) * 0.55); put(g, cv, x, yy, cell, rc + 0.5, rc + 0.5, o); g.restore();
  }
  function moon(g, x, y, o) {
    o = o || {}; const cell = o.cell || 9, rc = Math.round((o.r || 80) / cell);
    const cv = sprite('moon:' + rc + (o.full ? 'f' : ''), cell, { a: o.col || '#F2EBC8' }, () => { const gr = grid(rc * 2 + 1, rc * 2 + 1); gr.e(rc + 0.5, rc + 0.5, rc + 0.5, rc + 0.5, 'a'); if (!o.full) gr.e(rc * 1.55, rc * 0.8, rc * 0.95, rc * 0.95, 0); return gr; });
    glowC(g, x, y, rc * cell * 2, o.col || '#F2EBC8', 0.3); put(g, cv, x, y, cell, rc + 0.5, rc + 0.5, o);
  }
  // звёзды: крестики из точек мерцают; n, x,y,w,h области, on 0..1 доля зажжённых (по одной), col
  function stars(g, t, o) {
    o = o || {}; const n = o.n || 30, on = o.on == null ? 1 : o.on, c = wc(o.col || '#F4F1D0'), s = o.size || 6;
    for (let i = 0; i < n; i++) { if (hash(i * 11 + 3) > on) continue; const xx = o.x + hash(i * 3) * o.w, yy = o.y + hash(i * 5) * o.h, tw = 0.55 + 0.45 * Math.sin(t * (1.5 + hash(i) * 3) + i);
      g.globalAlpha = tw * (o.alpha == null ? 1 : o.alpha); g.fillStyle = c; const big = hash(i * 7) < 0.3;
      g.fillRect(xx, yy, s, s); if (big) { g.fillRect(xx - s * 1.2, yy, s, s); g.fillRect(xx + s * 1.2, yy, s, s); g.fillRect(xx, yy - s * 1.2, s, s); g.fillRect(xx, yy + s * 1.2, s, s); } }
    g.globalAlpha = 1;
  }
  function cloud(g, x, y, o) {
    o = o || {}; const cell = o.cell || 10, wc2 = Math.round((o.w || 260) / cell);
    const cv = sprite('cloud:' + wc2, cell, { a: o.col || '#C9CBD0' }, () => { const h = Math.round(wc2 * 0.42), gr = grid(wc2, h); gr.e(wc2 * 0.3, h * 0.65, wc2 * 0.26, h * 0.36, 'a').e(wc2 * 0.55, h * 0.45, wc2 * 0.3, h * 0.46, 'a').e(wc2 * 0.78, h * 0.68, wc2 * 0.22, h * 0.32, 'a').r(1, h - 1, wc2 - 2, h - 1, 'A'); return gr; });
    put(g, cv, x, y, cell, wc2 / 2, Math.round(wc2 * 0.42) / 2, o);
  }
  // море: ряды бегущих штрихов-волн от y до y+h; col цвет, glint {x, col} - дорожка от солнца/луны
  function sea(g, x, y, w, h, t, o) {
    o = o || {}; const rows = o.rows || Math.round(h / 26), c = wc(o.col || 'sea'), cell = o.cell || 8, a = o.alpha == null ? 1 : o.alpha;
    g.globalAlpha = a * 0.35; g.fillStyle = mix(c, '#08090C', 0.55); g.fillRect(x, y, w, h);
    for (let r = 0; r < rows; r++) { const yy = y + 8 + r * (h - 10) / rows, k = r / rows, sp = (r % 2 ? 1 : -1) * (14 + r * 5), seg = 30 + k * 50;
      g.fillStyle = r % 3 === 0 ? mix(c, '#FFFFFF', 0.3) : c; g.globalAlpha = a * (0.45 + 0.5 * k);
      for (let xx = ((t * sp) % (seg * 2) + seg * 2) % (seg * 2) - seg * 2; xx < w; xx += seg * 2) { const x0 = Math.max(0, xx + hash(r * 9) * seg), x1 = Math.min(w, xx + hash(r * 9) * seg + seg * 0.9); if (x1 > x0) g.fillRect(x + x0, yy, x1 - x0, cell * (0.5 + k * 0.4)); } }
    if (o.glint) { const gc = wc(o.glint.col || 'yellow'); g.fillStyle = gc; for (let r = 0; r < rows; r++) { const yy = y + 8 + r * (h - 10) / rows, hw = 30 + r * 12 * (0.7 + 0.3 * Math.sin(t * 3 + r)); g.globalAlpha = a * 0.75 * (1 - r / rows * 0.5); g.fillRect(o.glint.x - hw / 2, yy, hw, cell * 0.7); } }
    g.globalAlpha = 1;
  }
  function hill(g, x, y, w, h, o) {
    o = o || {}; const cell = o.cell || 10, cw = Math.round(w / cell), ch = Math.round(h / cell);
    const cv = sprite('hill:' + cw + 'x' + ch, cell, { a: o.col || '#3E7F48' }, () => { const gr = grid(cw, ch); gr.e(cw / 2, ch, cw / 2, ch, 'a'); for (let i = 0; i < cw * ch * 0.06; i++) gr.get(Math.floor(hash(i) * cw), Math.floor(hash(i + 50) * ch)) && gr.p(Math.floor(hash(i) * cw), Math.floor(hash(i + 50) * ch), 'A'); return gr; });
    put(g, cv, x, y, cell, cw / 2, ch, o);
  }
  // маяк: col стены, stripe полосы, on 0..1 огонь (луч крутится при on > 0)
  function lighthouse(g, x, y, o) {
    o = o || {}; const cell = o.cell || 10, hc = Math.round((o.h || 460) / cell), on = o.on == null ? 1 : o.on;
    const cv = sprite('lh:' + hc, cell, { a: o.col || 'white', b: o.stripe || 'red', k: '#34373D', l: '#5C5F66' }, () => {
      const gr = grid(13, hc), c = 6; gr.r(c - 2, 0, c + 2, 1, 'b').r(c - 3, 2, c + 3, 2, 'k').r(c - 2, 3, c + 2, 6, 'l').r(c - 3, 7, c + 3, 7, 'k');
      for (let yy = 8; yy < hc; yy++) { const hw = 2.5 + (yy - 8) / (hc - 8) * 3; gr.r(c - hw, yy, c + hw, yy, Math.floor((yy - 8) / 5) % 2 ? 'b' : 'a'); }
      gr.r(c - 1, hc - 4, c + 1, hc - 1, 'k'); return gr; });
    put(g, cv, x, y, cell, 6.5, hc, o);
    if (on > 0 && (o.alpha == null || o.alpha > 0)) { const ly = y - (hc - 5) * cell, a = on * (o.alpha == null ? 1 : o.alpha), c = wc(o.light || 'warm');
      g.globalAlpha = a; g.fillStyle = c; g.fillRect(x - 2 * cell + 2, ly - 2 * cell + 2, 4 * cell - 4, 4 * cell - 4); glowC(g, x, ly, cell * 9, c, a);
      const ang = (o.t || 0) * 1.2, d = Math.cos(ang); g.globalAlpha = a * 0.22 * Math.abs(d); g.fillStyle = c; g.beginPath(); g.moveTo(x, ly); g.lineTo(x + d * 520, ly - 60); g.lineTo(x + d * 520, ly + 60); g.closePath(); g.fill(); g.globalAlpha = 1; }
    return { top: y - hc * cell, light: { x, y: y - (hc - 5) * cell } };
  }

  // ---- улица ----
  function lamp(g, x, y, o) {
    o = o || {}; const cell = o.cell || 8, hc = Math.round((o.h || 260) / cell), on = o.on == null ? 1 : o.on;
    const cv = sprite('lamp:' + hc, cell, { a: o.col || '#5C5F66' }, () => { const gr = grid(5, hc); gr.r(2, 2, 2, hc - 1, 'a').r(1, hc - 2, 3, hc - 1, 'A').r(0, 0, 4, 1, 'a'); return gr; });
    put(g, cv, x, y, cell, 2.5, hc, o);
    if (on > 0) { const c = wc(o.light || 'warm'), ly = y - (hc - 2.5) * cell; g.globalAlpha = on * (o.alpha == null ? 1 : o.alpha); g.fillStyle = c; g.fillRect(x - 1.5 * cell, ly - cell * 0.5, 3 * cell, cell); glowC(g, x, ly, cell * 7, c, on); g.globalAlpha = 1; }
  }
  // гирлянда/фонарики между двумя точками: n лампочек, sag провис, cols цвета, on 0..1 зажигаются слева направо
  function garland(g, x0, y0, x1, y1, o) {
    o = o || {}; const n = o.n || 12, sag = o.sag == null ? 70 : o.sag, on = o.on == null ? 1 : o.on, cols = (o.cols || ['warm', 'red', 'lime', 'sky', 'pink']).map(wc), s = o.size || 14, a = o.alpha == null ? 1 : o.alpha;
    g.globalAlpha = a * 0.5; g.fillStyle = '#5C5F66'; for (let i = 0; i <= 40; i++) { const p = i / 40; g.fillRect(lerp(x0, x1, p), lerp(y0, y1, p) + sag * 4 * p * (1 - p), 3, 3); }
    for (let i = 0; i < n; i++) { const p = (i + 0.5) / n, xx = lerp(x0, x1, p), yy = lerp(y0, y1, p) + sag * 4 * p * (1 - p) + s * 0.6, lit = (i + 1) / n <= on + 1e-6, c = cols[i % cols.length];
      g.globalAlpha = a; g.fillStyle = lit ? c : '#2A2D33'; g.fillRect(xx - s / 2, yy, s, s * 1.2); if (lit) glowC(g, xx, yy + s * 0.6, s * 2.6, c, a * (0.8 + 0.2 * Math.sin((o.t || 0) * 4 + i))); }
    g.globalAlpha = 1;
  }
  function bench(g, x, y, o) {
    o = o || {}; const cell = o.cell || 8, cw = Math.round((o.w || 200) / cell);
    const cv = sprite('bench:' + cw, cell, { a: o.col || 'wood', k: '#4A4D55' }, () => { const gr = grid(cw, 7); gr.r(0, 0, cw - 1, 1, 'a').r(0, 3, cw - 1, 3, 'a').r(1, 4, 1, 6, 'k').r(cw - 2, 4, cw - 2, 6, 'k'); return gr; });
    put(g, cv, x, y, cell, cw / 2, 7, o); return { seat: y - 4 * cell };
  }
  // прилавок с товаром: goods [{col, n}] - горки круглых плодов/рыб; awning цвет навеса
  function stall(g, x, y, o) {
    o = o || {}; const cell = o.cell || 9, cw = Math.round((o.w || 420) / cell);
    const cv = sprite('stall:' + cw, cell, { a: o.col || 'wood', s: o.awning || 'orange', x: '#E8E9EC', k: '#4A4D55' }, () => { const gr = grid(cw, 26); for (let xx = 0; xx < cw; xx++) gr.r(xx, 0, xx, 2, Math.floor(xx / 3) % 2 ? 'x' : 's'); gr.r(0, 3, 0, 25, 'k').r(cw - 1, 3, cw - 1, 25, 'k').r(0, 16, cw - 1, 17, 'a').r(1, 18, cw - 2, 25, 'A'); return gr; });
    put(g, cv, x, y, cell, cw / 2, 26, o);
    const goods = o.goods || [], gw = (cw - 2) * cell / Math.max(1, goods.length), top = y - 10 * cell;
    goods.forEach((gd, i) => { const c = wc(gd.col || 'orange'), n = gd.n == null ? 6 : gd.n, cx = x - (cw - 2) * cell / 2 + gw * (i + 0.5), s = cell * (gd.fish ? 2.2 : 1.7);
      g.globalAlpha = o.alpha == null ? 1 : o.alpha;
      if (gd.fish) { for (let k = 0; k < Math.min(n, 4); k++) { g.fillStyle = k % 2 ? mix(c, '#000000', 0.2) : c; const fy = top - (k + 1) * cell * 1.1; const q = cell * 0.8, bx = cx - q * 4; g.fillRect(bx + q, fy - q, q * 5, q); g.fillRect(bx, fy, q * 7, q); g.fillRect(bx + q, fy + q, q * 5, q * 0.9); g.fillRect(bx + q * 7, fy - q * 1.2, q, q * 1.2); g.fillRect(bx + q * 7, fy + q, q, q * 1.2); g.fillRect(bx + q * 6.4, fy, q * 1.6, q); g.fillStyle = '#1A1C20'; g.fillRect(bx + q * 1.2, fy - q * 0.7, q * 0.6, q * 0.6); } }
      else { let k = 0; for (let row = 0; k < n; row++) for (let j = 0; j < 4 - row && k < n; j++, k++) { g.fillStyle = (k * 7) % 5 === 0 ? mix(c, '#FFFFFF', 0.3) : c; g.fillRect(cx + (j - (3 - row) / 2) * s * 1.1 - s / 2, top - (row + 1) * s * 1.02, s, s); } }
      if (gd.label) { g.font = F(500, cell * 4); g.textAlign = 'center'; g.fillStyle = '#16181C'; const tw = mw(g, gd.label) + cell * 2; g.fillRect(cx - tw / 2, y - 8.6 * cell, tw, cell * 5); g.fillStyle = C.wh; g.fillText(gd.label, cx, y - 4.8 * cell); g.textAlign = 'left'; }
      g.globalAlpha = 1; });
  }
  // своя точечная иконка для dots/logo/morph: icon(id, cols, rows, (x,y) => 0|1|2) (2 - тусклая точка)
  const ICN = {};
  function icon(id, cols, rows, fn) { if (ICN[id]) return ICN[id]; const pts = [], r = rng(id.length * 7 + 3);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const v = fn(x + 0.5, y + 0.5); if (!v) continue; const q = r(); pts.push({ x: x + 0.5 - cols / 2, y: y + 0.5 - rows / 2, k: v === 2 ? 1 : q < 0.12 ? 1 : q < 0.17 ? 2 : 0 }); }
    return ICN[id] = { pts, frag: [], rows }; }
  function iconPts(ic, cx, cy, cell) { return ic.pts.map(p => ({ x: cx + p.x * cell, y: cy + p.y * cell })); }

  return { SANS, SERIF, MONO, C, TH, W, H, X0, X1,
    clamp, lerp, prog, eo, eio, ein, spring, rng, hash, F, life, count, fmt,
    prep, fit, wrap, tracked, trW, typeLines, lead, kicker, section, term,
    pixText, pixWidth, pixPoints, sprout, dots, sproutPts, scatter, morph, vortex, logo,
    corners, rr, figPanel, logPanel, stats, card, legend, ratioBar, segBar, brk, wordmark, ribbon,
    setHud, hud, scene, outA, bars, frame, cutSounds,
    WC, SKIN, HAIR, SHIRTS, mix, grid, sprite, put, glowC, figure, person, crowd, dog, cat, bird, birds, car, bus, bike, boat,
    windows, house, tower, shop, cafe, school, crane, board, tree, grass, leaves, sun, moon, stars, cloud, sea, hill, lighthouse,
    lamp, garland, bench, stall, icon, iconPts };
})();
