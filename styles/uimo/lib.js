// lib.js
const UIM = (() => {
  // ===== Палитра (пипеткой по оригиналу), темы, шрифты =====
  const W = 1080, H = 1920, X0 = 60, X1 = 1020;
  const C = {
    light: '#F4F3F6', ink: '#090911', blue: '#424AE5', blueL: '#6C72FE', teal: '#0E9183', tealD: '#093E38',
    yel: '#F8D877', orange: '#FD591F', lime: '#D8F99C', olive: '#3E6111', soot: '#131313', paper: '#F8F9FC',
    white: '#FFFFFF', navy: '#0F172B', navy2: '#1E293B', gray: '#748395', mut: '#5B6472', line: '#E1E3EA',
    okBg: '#EAFBF1', okLn: '#BFEFD4', ok: '#12A150', okD: '#0B7A3B', halo: '#D8DAF3', chart: '#12957F'
  };
  // тема сцены: фон, цвет слова, цвет точки, подпись, значок, кнопка, шрифт слова
  const TH = {
    light:  { bg: C.light, ink: C.ink, dot: C.blue, cap: '#748395', ico: '#5B6472', badge: 'blue', btn: C.ink, font: 'sans' },
    ink:    { bg: C.ink, ink: '#FFFFFF', dot: C.blueL, cap: '#8A91A0', ico: '#9AA0AE', badge: 'blue', btn: C.blue, font: 'sans' },
    blue:   { bg: C.blue, ink: '#FFFFFF', dot: C.ink, cap: 'rgba(255,255,255,0.74)', ico: 'rgba(255,255,255,0.82)', badge: 'white', btn: C.soot, font: 'sans' },
    teal:   { bg: C.teal, ink: '#FFFFFF', dot: C.yel, cap: 'rgba(255,255,255,0.74)', ico: 'rgba(255,255,255,0.82)', badge: 'white', btn: C.tealD, font: 'serif' },
    orange: { bg: C.orange, ink: C.soot, dot: C.soot, cap: 'rgba(19,19,19,0.62)', ico: 'rgba(19,19,19,0.7)', badge: 'ink', btn: C.soot, font: 'sans' },
    lime:   { bg: C.lime, ink: C.soot, dot: C.soot, cap: 'rgba(19,19,19,0.6)', ico: 'rgba(19,19,19,0.7)', badge: 'ink', btn: C.olive, font: 'cond' },
    paper:  { bg: C.paper, ink: C.ink, dot: C.blue, cap: '#748395', ico: '#5B6472', badge: 'blue', btn: C.blue, font: 'sans' }
  };
  const F = {
    sans: '"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif',
    serif: '"DejaVu Serif",Georgia,"Noto Serif","Times New Roman",serif',
    mono: '"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace'
  };

  // ===== Математика =====
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const prog = (t, a, b) => cl((t - a) / (b - a), 0, 1);
  const eo = x => { x = cl(x, 0, 1); return 1 - Math.pow(1 - x, 3); };
  const ei = x => { x = cl(x, 0, 1); return x * x * x; };
  const io = x => { x = cl(x, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  // пружина 0 -> 1 с лёгким перелётом (для интерфейса), x в секундах
  const spr = (x, d) => x <= 0 ? 0 : 1 - Math.exp(-(d || 9) * x) * Math.cos(12 * x);
  // появление 0.25 с, уход 0.18 с
  const life = (t, t0, t1) => eo((t - t0) / 0.25) * (t1 == null ? 1 : 1 - eo((t - (t1 - 0.18)) / 0.18));
  function scene(t, cuts) { let i = 0; while (i < cuts.length - 2 && t >= cuts[i + 1]) i++; return { i, u: t - cuts[i], t0: cuts[i], t1: cuts[i + 1], len: cuts[i + 1] - cuts[i] }; }
  // смена фона внутри сцены (приём «brand.»): индекс фазы
  const cycle = (u, step, n) => cl(Math.floor(u / step), 0, n - 1);
  const countUp = (u, a, b, d) => lerp(a, b, eo(u / (d || 0.8)));
  const rub = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽';
  // путь курсора: [[t,x,y],...] с inOut между ключами
  function path(t, keys) {
    if (t <= keys[0][0]) return [keys[0][1], keys[0][2]];
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (t <= b[0]) { const q = io((t - a[0]) / (b[0] - a[0])); return [lerp(a[1], b[1], q), lerp(a[2], b[2], q)]; }
    }
    const l = keys[keys.length - 1]; return [l[1], l[2]];
  }

  // ===== Холсты, тени, кэш =====
  const MC = new OffscreenCanvas(8, 8).getContext('2d');
  function mk(w, h, f) { const c = new OffscreenCanvas(w, h); f(c.getContext('2d')); return c; }
  function rr(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  let SH = null;
  function tex() {
    if (SH) return;
    SH = mk(400, 300, c => { c.shadowColor = 'rgba(14,16,40,0.30)'; c.shadowBlur = 38; c.shadowOffsetX = 1000; c.shadowOffsetY = 14; c.fillStyle = '#000'; rr(c, 80 - 1000, 80, 240, 140, 18); c.fill(); });
  }
  // мягкая тень под карточкой: 9 частей заранее отрисованного спрайта (середина не рисуется, она под карточкой)
  function shadow(g, x, y, w, h, a) {
    tex(); const ga = g.globalAlpha; g.globalAlpha = ga * (a == null ? 1 : a);
    const m = Math.min(20, w / 2, h / 2), sx = [0, 100, 300, 400], sy = [0, 100, 200, 300];
    const dx = [x - 80, x + m, x + w - m, x + w + 80], dy = [y - 80, y + m, y + h - m, y + h + 80];
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
      if (i === 1 && j === 1) continue;
      const dw = dx[i + 1] - dx[i], dh = dy[j + 1] - dy[j]; if (dw <= 0 || dh <= 0) continue;
      g.drawImage(SH, sx[i], sy[j], sx[i + 1] - sx[i], sy[j + 1] - sy[j], dx[i], dy[j], dw, dh);
    }
    g.globalAlpha = ga;
  }
  function card(g, x, y, w, h, r, fill, o) {
    o = o || {};
    if (o.shadow !== false) shadow(g, x, y, w, h, o.sa == null ? 0.8 : o.sa);
    g.fillStyle = fill || '#FFFFFF'; rr(g, x, y, w, h, r); g.fill();
    if (o.border) { g.strokeStyle = o.border; g.lineWidth = o.bw || 2; rr(g, x, y, w, h, r); g.stroke(); }
  }

  // ===== Мелкий текст интерфейса =====
  function font(sz, w, fam) { return (w || 500) + ' ' + sz + 'px ' + (fam === 'mono' ? F.mono : fam === 'serif' ? F.serif : F.sans); }
  // текст по середине строки; o: {w, a, max, f}; если не влезает в max, уменьшается
  function txt(g, s, x, y, sz, col, o) {
    o = o || {}; let f = sz; g.font = font(f, o.w, o.f);
    if (o.max) { while (f > 18 && tw(s, f, o.w, o.f) > o.max) f -= 1; g.font = font(f, o.w, o.f); }
    g.fillStyle = col; g.textAlign = o.a || 'left'; g.textBaseline = 'middle'; g.fillText(s, x, y);
    return tw(s, f, o.w, o.f);
  }
  const TW = new Map();
  function tw(s, sz, w, fam) { const k = sz + '|' + (w || 500) + '|' + (fam || '') + '|' + s; let v = TW.get(k); if (v == null) { MC.font = font(sz, w, fam); v = MC.measureText(s).width; TW.set(k, v); } return v; }
  // перенос по словам; segs: строка или [{t, b}] (b = жирный). n = сколько символов показать (печать)
  function rich(g, segs, x, y, maxW, sz, col, o) {
    o = o || {}; if (typeof segs === 'string') segs = [{ t: segs }];
    const lh = sz * (o.lh || 1.36), toks = [];
    segs.forEach(sg => sg.t.split(/(\s+)/).forEach(p => { if (p) toks.push({ s: p, b: !!sg.b }); }));
    let cx = 0, cy = 0, shown = 0; const n = o.n == null ? 1e9 : o.n, items = [];
    toks.forEach(tk => {
      const ww = tw(tk.s, sz, tk.b ? 700 : (o.w || 450));
      if (/^\s+$/.test(tk.s)) { if (cx > 0) { items.push({ s: tk.s, x: cx, y: cy, b: tk.b }); cx += ww; } return; }
      if (cx > 0 && cx + ww > maxW) { cx = 0; cy += lh; }
      items.push({ s: tk.s, x: cx, y: cy, b: tk.b }); cx += ww;
    });
    g.textAlign = 'left'; g.textBaseline = 'middle';
    let lastX = 0, lastY = 0, curF = '';
    for (const it of items) {
      if (shown >= n) break;
      const s = it.s.slice(0, Math.max(0, n - shown)); shown += it.s.length;
      const fnt = font(sz, it.b ? 700 : (o.w || 450)); if (fnt !== curF) { g.font = fnt; curF = fnt; } g.fillStyle = it.b && o.bc ? o.bc : col;
      g.fillText(s, x + it.x, y + it.y + sz * 0.5); lastX = x + it.x + tw(s, sz, it.b ? 700 : (o.w || 450)); lastY = y + it.y;
    }
    const total = segs.reduce((a, s) => a + s.t.length, 0);
    return { h: cy + lh, len: total, lastX, lastY };
  }
  // разрядка (верхний регистр, широкая): подпись в левом верхнем углу
  function spaced(g, s, x, y, sz, col, sp, a) {
    g.font = font(sz, 600); g.fillStyle = col; g.textBaseline = 'middle'; g.textAlign = 'left';
    let wsum = 0; for (const ch of s) wsum += tw(ch, sz, 600) + sz * sp; wsum -= sz * sp;
    let px = a === 'center' ? x - wsum / 2 : x;
    for (const ch of s) { if (ch !== ' ') g.fillText(ch, px, y); px += tw(ch, sz, 600) + sz * sp; }
    return wsum;
  }

  // ===== БОЛЬШОЕ СЛОВО: жирный гротеск, плотный трекинг, цветная точка =====
  // kind: 'sans' (основной), 'serif' (антиква для смены шрифта), 'cond' (узкий плакатный через scale 0.72)
  const WC = new Map();
  function wfont(kind, size) { return kind === 'serif' ? '400 ' + size + 'px ' + F.serif : '800 ' + size + 'px ' + F.sans; }
  const WM = new Map();
  function wmeas(text, size, kind) {
    const key = text + '|' + size + '|' + kind; if (WM.has(key)) return WM.get(key);
    MC.font = wfont(kind, size);
    const chars = Array.from(text), ws = chars.map(ch => MC.measureText(ch).width);
    const track = kind === "serif" ? -0.03 * size : kind === "cond" ? -0.015 * size : -0.04 * size;
    const sx = kind === 'cond' ? 0.72 : 1;
    let w = 0; ws.forEach((v, i) => { w += v + (i < ws.length - 1 ? track : 0); });
    const r = { chars, ws, track, sx, w: w * sx }; WM.set(key, r); return r;
  }
  function wsp(text, size, kind, color) {
    const key = text + '|' + size + '|' + kind + '|' + color;
    let s = WC.get(key); if (s) return s;
    const m = wmeas(text, size, kind), lw = kind === "serif" ? size * 0.006 : size * 0.016;
    const pad = Math.ceil(lw + 8), cw = Math.max(4, Math.ceil(m.w + pad * 2)), ch = Math.ceil(size * 1.4 + pad * 2), by = pad + size * 1.04;
    const c = new OffscreenCanvas(cw, ch), x = c.getContext('2d');
    x.font = wfont(kind, size); x.textBaseline = 'alphabetic'; x.textAlign = 'left';
    x.fillStyle = color; x.strokeStyle = color; x.lineWidth = lw; x.lineJoin = 'round';
    x.translate(pad, 0); x.scale(m.sx, 1);
    let px = 0; m.chars.forEach((chh, i) => { x.fillText(chh, px, by); if (lw > 0.8) x.strokeText(chh, px, by); px += m.ws[i] + m.track; });
    s = { c, w: m.w, pad, by }; WC.set(key, s); return s;
  }
  // раскладка без рисования: размер подгоняется под ширину max (по умолчанию 940, x 70…1010)
  function layout(text, cx, cy, o) {
    o = o || {}; const kind = o.kind || 'sans', lines = String(text).split('\n'), max = o.max || 940;
    let size = o.size || 230; const ext = s => o.dot ? 0.215 * s : 0;
    const widest = s => Math.max(...lines.map((l, i) => wmeas(l, s, kind).w + (i === lines.length - 1 ? ext(s) : 0)));
    const w0 = widest(size); if (w0 > max) size = size * max / w0;
    size = Math.floor(size * 2) / 2;
    while (widest(size) > max && size > 40) size -= 2;
    const lh = o.lh || 0.98, n = lines.length, L = { size, kind, lines: [], dot: null };
    lines.forEach((l, i) => {
      const w = wmeas(l, size, kind).w, last = i === n - 1, e = last ? ext(size) : 0;
      const y = cy + (i - (n - 1) / 2) * size * lh + size * 0.27;
      L.lines.push({ s: l, x: cx - (w + e) / 2, y, w });
    });
    const ll = L.lines[n - 1];
    if (o.dot) { const r = size * 0.085; L.dot = { x: ll.x + ll.w + size * 0.045 + r, y: ll.y - r, r }; }
    L.top = L.lines[0].y - size * 0.8; L.bot = ll.y + size * 0.24;
    L.l = Math.min(...L.lines.map(q => q.x)); L.r = Math.max(...L.lines.map(q => q.x + q.w)) + (o.dot ? ext(size) : 0);
    return L;
  }
  // рисует слово. o: {size, max, kind, color, dot (цвет или null), u (с момента появления),
  //   enter: 'smear' (вылет из размытия движения, по умолчанию) | 'pop' | 'none', from: -1 слева / 1 справа, blur (px), alpha}
  function word(g, text, cx, cy, o) {
    o = o || {}; const L = layout(text, cx, cy, o), col = o.color || C.ink, u = o.u == null ? 9 : o.u;
    const en = o.enter || 'smear', from = o.from || -1, a0 = o.alpha == null ? 1 : o.alpha;
    g.save();
    if (en === 'pop') { const s = 0.88 + 0.12 * eo(u / 0.3); g.translate(cx, cy); g.scale(s, s); g.translate(-cx, -cy); }
    L.lines.forEach((ln, i) => {
      const sp = wsp(ln.s, L.size, L.kind, col), x = ln.x - sp.pad, y = ln.y - sp.by, ui = u - i * 0.07;
      if (en === 'smear') {
        const p = eo(ui / 0.22);
        if (p <= 0) return;
        if (p < 1) {
          const off = from * (1 - p) * 240, len = (1 - p) * 520, N = 7;
          g.globalAlpha = a0 * cl(0.2 + 0.55 * p, 0, 1);
          for (let k = 0; k < N; k++) g.drawImage(sp.c, x + off - from * len * k / (N - 1), y);
          g.globalAlpha = 1; return;
        }
      }
      const b = o.blur || 0;
      g.globalAlpha = a0 * (en === 'pop' ? eo(u / 0.12) : 1);
      if (b > 0.5) {
        const ga = g.globalAlpha; g.globalAlpha = ga * 0.2;
        for (let k = 0; k < 8; k++) { const an = k * Math.PI / 4; g.drawImage(sp.c, x + Math.cos(an) * b, y + Math.sin(an) * b * 0.4); }
        g.globalAlpha = ga * 0.25; g.drawImage(sp.c, x, y);
      } else g.drawImage(sp.c, x, y);
      g.globalAlpha = 1;
    });
    if (L.dot && o.dot) {
      const ds = en === 'none' ? 1 : spr(u - 0.14, 10);
      if (ds > 0) { g.fillStyle = o.dot; g.globalAlpha = a0; g.beginPath(); g.arc(L.dot.x, L.dot.y, L.dot.r * ds, 0, 7); g.fill(); g.globalAlpha = 1; }
    }
    g.restore();
    return L;
  }
  // печать слова по буквам с кареткой (приём «meet your |»); строка центрируется по мере набора
  // заранее собрать спрайты слов (первый кадр дольше, дальше без рывков): list [[text, size, kind, color], ...] или [[text, opts]]
  function prep(list) { list.forEach(([text, o]) => { const L = layout(text, 540, 900, o); L.lines.forEach(l => wsp(l.s, L.size, L.kind, o.color || C.ink)); }); }
  function typeWord(g, text, cx, cy, o) {
    o = o || {}; const u = o.u || 0, cps = o.cps || 16, chars = Array.from(text);
    const n = cl(Math.floor(u * cps), 0, chars.length), full = layout(text, cx, cy, { size: o.size || 160, max: o.max || 900 });
    const s = chars.slice(0, n).join(''), size = full.size, col = o.color || '#fff';
    const w = s ? wmeas(s, size, 'sans').w : 0, x = cx - w / 2 - size * 0.06, y = full.lines[0].y;
    if (s) { const sp = wsp(s, size, 'sans', col); g.drawImage(sp.c, x - sp.pad, y - sp.by); }
    const typing = n < chars.length;
    if (typing || (u * 1.8) % 1 < 0.55) { g.fillStyle = o.caret || col; g.fillRect(x + w + size * 0.08, y - size * 0.74, Math.max(4, size * 0.04), size * 0.92); }
    return { n, done: !typing };
  }

  // ===== Хром кадра: моно-подпись слева сверху, значок справа, круглый знак слева снизу =====
  function caption(g, text, th, u, ic) {
    const a = eo((u == null ? 9 : u) / 0.2);
    g.globalAlpha = a; spaced(g, text, 64, 150, 26, th.cap, 0.3);
    if (ic) icon(g, ic, 1000, 150, 40, th.ico, 3);
    g.globalAlpha = 1;
  }
  // свой круглый знак «окошко»: круг с ореолом, внутри окно с переплётом
  function badge(g, th, t, o) {
    o = o || {}; const x = o.x || 118, y = o.y || 1612, r = o.r || 40, b = 1 + 0.025 * Math.sin((t || 0) * 3.2);
    const k = th.badge;
    const halo = k === 'blue' ? (th.bg === C.ink ? 'rgba(66,74,229,0.32)' : C.halo) : k === 'white' ? 'rgba(255,255,255,0.32)' : 'rgba(19,19,19,0.12)';
    const fill = k === 'blue' ? C.blue : k === 'white' ? '#FFFFFF' : C.soot;
    const gl = k === 'blue' ? '#FFFFFF' : k === 'white' ? th.bg : th.bg;
    g.fillStyle = halo; g.beginPath(); g.arc(x, y, r * 1.32 * b, 0, 7); g.fill();
    g.fillStyle = fill; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    glyph(g, x, y, r * 0.5, gl);
  }
  function glyph(g, x, y, s, col) {
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = s * 0.2; g.lineJoin = 'round';
    rr(g, x - s, y - s * 0.95, s * 2, s * 1.75, s * 0.42); g.stroke();
    g.beginPath(); g.moveTo(x, y - s * 0.95); g.lineTo(x, y + s * 0.8); g.moveTo(x - s, y - s * 0.12); g.lineTo(x + s, y - s * 0.12); g.stroke();
    rr(g, x - s * 1.25, y + s * 0.82, s * 2.5, s * 0.3, s * 0.15); g.fill();
  }

  // ===== Тонкие иконки (обводка), центр x,y, размер s =====
  function icon(g, name, x, y, s, col, lw) {
    const h = s / 2; g.save(); g.translate(x, y); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = lw || s * 0.08; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    if (name === 'bell') { g.moveTo(-h * 0.7, h * 0.45); g.quadraticCurveTo(-h * 0.7, -h * 0.75, 0, -h * 0.75); g.quadraticCurveTo(h * 0.7, -h * 0.75, h * 0.7, h * 0.45); g.lineTo(h * 0.85, h * 0.55); g.lineTo(-h * 0.85, h * 0.55); g.closePath(); g.moveTo(-h * 0.2, h * 0.78); g.lineTo(h * 0.2, h * 0.78); }
    else if (name === 'cal') { rr(g, -h * 0.85, -h * 0.65, h * 1.7, h * 1.5, h * 0.25); g.moveTo(-h * 0.85, -h * 0.2); g.lineTo(h * 0.85, -h * 0.2); g.moveTo(-h * 0.4, -h * 0.9); g.lineTo(-h * 0.4, -h * 0.45); g.moveTo(h * 0.4, -h * 0.9); g.lineTo(h * 0.4, -h * 0.45); }
    else if (name === 'swap') { g.moveTo(-h * 0.8, -h * 0.35); g.lineTo(h * 0.8, -h * 0.35); g.lineTo(h * 0.45, -h * 0.7); g.moveTo(h * 0.8, h * 0.35); g.lineTo(-h * 0.8, h * 0.35); g.lineTo(-h * 0.45, h * 0.7); }
    else if (name === 'card') { rr(g, -h * 0.9, -h * 0.6, h * 1.8, h * 1.2, h * 0.2); g.moveTo(-h * 0.9, -h * 0.2); g.lineTo(h * 0.9, -h * 0.2); g.moveTo(-h * 0.55, h * 0.3); g.lineTo(-h * 0.15, h * 0.3); }
    else if (name === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? h * 0.42 : h * 0.9; i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); }
    else if (name === 'brush') { g.moveTo(h * 0.8, -h * 0.8); g.lineTo(-h * 0.1, h * 0.1); g.moveTo(-h * 0.1, h * 0.1); g.quadraticCurveTo(-h * 0.3, h * 0.2, -h * 0.35, h * 0.45); g.quadraticCurveTo(-h * 0.5, h * 0.85, -h * 0.85, h * 0.85); g.quadraticCurveTo(-h * 0.7, h * 0.5, -h * 0.5, h * 0.3); g.quadraticCurveTo(-h * 0.35, h * 0.1, -h * 0.1, h * 0.1); }
    else if (name === 'chart') { g.moveTo(-h * 0.85, -h * 0.85); g.lineTo(-h * 0.85, h * 0.85); g.lineTo(h * 0.85, h * 0.85); g.moveTo(-h * 0.5, h * 0.4); g.lineTo(-h * 0.1, -h * 0.05); g.lineTo(h * 0.2, h * 0.2); g.lineTo(h * 0.75, -h * 0.5); }
    else if (name === 'chat') { rr(g, -h * 0.9, -h * 0.75, h * 1.4, h * 1.0, h * 0.25); g.moveTo(-h * 0.55, h * 0.25); g.lineTo(-h * 0.65, h * 0.6); g.lineTo(-h * 0.25, h * 0.25); g.moveTo(h * 0.65, -h * 0.4); g.lineTo(h * 0.9, -h * 0.4); g.lineTo(h * 0.9, h * 0.5); g.lineTo(h * 0.6, h * 0.5); g.lineTo(h * 0.6, h * 0.8); g.lineTo(h * 0.25, h * 0.5); g.lineTo(-h * 0.1, h * 0.5); }
    else if (name === 'clock') { g.arc(0, 0, h * 0.85, 0, 7); g.moveTo(0, -h * 0.5); g.lineTo(0, 0); g.lineTo(h * 0.35, h * 0.25); }
    else if (name === 'cursor') { g.moveTo(-h * 0.5, -h * 0.8); g.lineTo(h * 0.55, h * 0.1); g.lineTo(h * 0.05, h * 0.2); g.lineTo(h * 0.3, h * 0.75); g.lineTo(h * 0.1, h * 0.85); g.lineTo(-h * 0.15, h * 0.3); g.lineTo(-h * 0.5, h * 0.6); g.closePath(); }
    else if (name === 'check') { g.moveTo(-h * 0.7, 0); g.lineTo(-h * 0.2, h * 0.5); g.lineTo(h * 0.75, -h * 0.55); }
    else if (name === 'play') { g.moveTo(-h * 0.45, -h * 0.65); g.lineTo(h * 0.7, 0); g.lineTo(-h * 0.45, h * 0.65); g.closePath(); g.fill(); }
    else if (name === 'link') { g.arc(-h * 0.3, h * 0.3, h * 0.38, Math.PI * 0.25, Math.PI * 1.75, false); g.moveTo(h * 0.3 + h * 0.27, -h * 0.03); g.arc(h * 0.3, -h * 0.3, h * 0.38, Math.PI * 0.25 + Math.PI, Math.PI * 0.75 + Math.PI * 2, false); g.moveTo(-h * 0.2, h * 0.2); g.lineTo(h * 0.2, -h * 0.2); }
    g.stroke(); g.restore();
  }

  // ===== Курсор и клик =====
  function cursor(g, x, y, press, o) {
    o = o || {}; const s = (o.s || 1.7) * (1 - 0.12 * (press || 0));
    g.save(); g.translate(x, y); g.scale(s, s);
    const P = () => { g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 30); g.lineTo(7.5, 23); g.lineTo(12.5, 34); g.lineTo(17.5, 32); g.lineTo(12.5, 21.5); g.lineTo(22, 21.5); g.closePath(); };
    g.translate(1.5, 2.5); g.fillStyle = 'rgba(0,0,0,0.2)'; P(); g.fill(); g.translate(-1.5, -2.5);
    g.lineJoin = 'round'; g.strokeStyle = '#FFFFFF'; g.lineWidth = 3; P(); g.stroke(); g.fillStyle = C.ink; P(); g.fill();
    g.restore();
  }
  // кольцо клика: p 0…1
  function ring(g, x, y, p, col) {
    if (p <= 0 || p >= 1) return; g.strokeStyle = col || 'rgba(255,255,255,0.85)';
    for (let k = 0; k < 2; k++) { const q = cl(p - k * 0.18, 0, 1); if (q <= 0) continue; g.globalAlpha = 1 - q; g.lineWidth = 6 * (1 - q) + 1; g.beginPath(); g.arc(x, y, 14 + 70 * eo(q), 0, 7); g.stroke(); }
    g.globalAlpha = 1;
  }
  // нажатие: 1 в момент клика, спадает за 0.25 с
  const press = (u, at) => (u >= at - 0.06 && u < at + 0.25) ? 1 - prog(u, at, at + 0.25) : 0;

  // ===== Элементы интерфейса =====
  // кнопка по центру cx,cy. o: {fill, color, size, h, padX, icon, border, shadow, s (масштаб), a, r}
  function btn(g, cx, cy, label, o) {
    o = o || {}; const sz = o.size || 38, h = o.h || 96, pad = o.padX || 44, icw = o.icon ? sz * 1.1 : 0;
    const w = o.w || (tw(label, sz, 600) + pad * 2 + icw), x = cx - w / 2, y = cy - h / 2, s = o.s == null ? 1 : o.s;
    g.save(); g.globalAlpha *= (o.a == null ? 1 : o.a); g.translate(cx, cy); g.scale(s, s); g.translate(-cx, -cy);
    card(g, x, y, w, h, o.r || 18, o.fill || '#FFFFFF', { shadow: o.shadow !== false, border: o.border, sa: 0.6 });
    const col = o.color || C.ink;
    if (o.icon) icon(g, o.icon, x + pad + sz * 0.35, cy, sz * 0.8, col, 3.5);
    txt(g, label, x + pad + icw, cy + 1, sz, col, { w: 600 });
    g.restore(); return { x, y, w, h };
  }
  // синяя подсказка: title, step (мелкая подпись или ''), o.btn - текст кнопки (без него кнопки нет)
  function tip(g, x, y, w, title, step, u, o) {
    o = o || {}; const p = spr(u, 10); if (p <= 0) return;
    const sz = o.size || 40;
    g.font = font(sz, 600); const lines = wrapLines(title, w - 64, sz, 600), h = 40 + lines.length * sz * 1.3 + (step || o.btn ? 86 : 30);
    g.save(); g.globalAlpha *= cl(u / 0.12, 0, 1); g.translate(x, y); g.scale(0.9 + 0.1 * p, 0.9 + 0.1 * p);
    card(g, 0, 0, w, h, 22, o.fill || C.blue, { sa: 0.7 });
    lines.forEach((l, i) => txt(g, l, 32, 32 + sz * 0.62 + i * sz * 1.3, sz, '#FFFFFF', { w: 600 }));
    const by = h - 52;
    if (step) txt(g, step, 32, by, 28, 'rgba(255,255,255,0.75)', { w: 500 });
    if (o.btn) { const bl = o.btn, bw = tw(bl, 28, 600) + 40;
      g.fillStyle = 'rgba(255,255,255,0.22)'; rr(g, w - 32 - bw, by - 26, bw, 52, 12); g.fill();
      txt(g, bl, w - 32 - bw / 2, by + 1, 28, '#FFFFFF', { w: 600, a: 'center' }); }
    g.restore(); return { h };
  }
  function wrapLines(s, maxW, sz, w) {
    const words = s.split(' '), out = []; let cur = '';
    words.forEach(wd => { const t = cur ? cur + ' ' + wd : wd; if (cur && tw(t, sz, w) > maxW) { out.push(cur); cur = wd; } else cur = t; });
    if (cur) out.push(cur); return out;
  }
  // ряд пилюль (время, теги): sel = индекс выбранной; появление каскадом
  function chips(g, cx, cy, items, sel, u, o) {
    o = o || {}; const w = o.w || 260, gap = o.gap || 30, h = o.h || 100, n = items.length, x0 = cx - (n * w + (n - 1) * gap) / 2;
    items.forEach((s, i) => {
      const p = spr(u - i * 0.06, 11); if (p <= 0) return;
      const x = x0 + i * (w + gap), on = i === sel;
      g.save(); g.globalAlpha = cl((u - i * 0.06) / 0.12, 0, 1); g.translate(0, (1 - p) * 60);
      card(g, x, cy - h / 2, w, h, 20, on ? C.blue : '#FFFFFF', { border: on ? null : C.line, sa: on ? 0.8 : 0.35 });
      txt(g, s, x + w / 2, cy + 1, 44, on ? '#FFFFFF' : C.ink, { w: 700, a: 'center' });
      g.restore();
    });
    return { x0, w, gap };
  }
  // поле со ссылкой/суммой и кнопкой справа (приём «share.»)
  function field(g, cx, cy, w, label, bl, u, o) {
    o = o || {}; const h = 140, x = cx - w / 2, y = cy - h / 2, p = spr(u, 11); if (p <= 0) return null;
    g.save(); g.globalAlpha = cl(u / 0.12, 0, 1); g.translate(0, (1 - p) * 50);
    card(g, x, y, w, h, 20, '#FFFFFF', { sa: 0.5 });
    const bw = o.bw || 290;
    g.strokeStyle = '#D9DBE2'; g.lineWidth = 2; rr(g, x + 18, y + 18, w - bw - 54, h - 36, 16); g.stroke();
    icon(g, o.icon || 'link', x + 66, cy, 40, '#9AA0AE', 3);
    txt(g, label, x + 102, cy + 1, 40, C.ink, { w: 500, max: w - bw - 150 });
    const bx = x + w - bw - 18, done = !!o.done;
    g.fillStyle = done ? '#3A41D0' : C.blue; rr(g, bx, y + 20, bw, h - 40, 16); g.fill();
    if (done) icon(g, 'check', bx + 50, cy, 34, '#FFFFFF', 4);
    txt(g, bl, bx + bw / 2 + (done ? 20 : 0), cy + 1, 38, '#FFFFFF', { w: 600, a: 'center', max: bw - 70 });
    g.restore(); return { x, y, w, h, bx: bx + bw / 2, by: cy };
  }
  // звёзды рейтинга: fill 0…5 (дробное число заливает по очереди)
  function stars(g, cx, cy, r, fill, on, off) {
    for (let i = 0; i < 5; i++) {
      const x = cx + (i - 2) * r * 2.5, q = cl(fill - i, 0, 1), s = q > 0 ? 0.7 + 0.3 * spr(q * 0.6, 9) : 1;
      g.save(); g.translate(x, cy); g.scale(s, s); g.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr2 = k % 2 ? r * 0.45 : r; k ? g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2) : g.moveTo(Math.cos(a) * rr2, Math.sin(a) * rr2); }
      g.closePath(); g.fillStyle = q > 0.5 ? (on || C.blue) : (off || '#DADCE4'); g.fill(); g.restore();
    }
  }
  // мини-карточки с цифрами (приём «measure.»): items [{l, v, d}] в строку или сеткой cols
  function miniCards(g, x, y, w, items, u, o) {
    o = o || {}; const cols = o.cols || items.length, gap = 20, cw = (w - gap * (cols - 1)) / cols, ch = o.h || 170;
    items.forEach((it, i) => {
      const p = spr(u - i * 0.08, 11); if (p <= 0) return;
      const cx = x + (i % cols) * (cw + gap), cy = y + Math.floor(i / cols) * (ch + gap);
      g.save(); g.globalAlpha = cl((u - i * 0.08) / 0.12, 0, 1); g.translate(0, (1 - p) * 50);
      card(g, cx, cy, cw, ch, 18, '#FFFFFF', { sa: 0.45 });
      txt(g, it.l, cx + 28, cy + 44, 28, C.gray, { w: 500, max: cw - 56 });
      if (it.ok) { icon(g, 'check', cx + 48, cy + ch - 56, 40, C.ok, 6); txt(g, it.v, cx + 82, cy + ch - 56, 46, C.okD, { w: 700, max: cw - 110 }); }
      else txt(g, it.v, cx + 28, cy + ch - 56, o.vs || 50, C.ink, { w: 700, max: cw - (it.d ? 150 : 56) });
      if (it.d) { const dw = tw(it.d, 26, 600) + 22; g.fillStyle = C.okBg; rr(g, cx + cw - 24 - dw, cy + ch - 78, dw, 44, 10); g.fill(); txt(g, it.d, cx + cw - 24 - dw / 2, cy + ch - 56, 26, C.okD, { w: 600, a: 'center' }); }
      g.restore();
    });
  }
  // плашка статуса «… онлайн · 23:40»: зелёная пилюля с пульсирующей точкой
  function status(g, cx, cy, text, u, t) {
    const p = spr(u, 11); if (p <= 0) return; const sz = 42, w = tw(text, sz, 500) + 120, h = 96, x = cx - w / 2;
    g.save(); g.globalAlpha = cl(u / 0.12, 0, 1); g.translate(cx, cy); g.scale(0.9 + 0.1 * p, 0.9 + 0.1 * p); g.translate(-cx, -cy);
    g.fillStyle = C.okBg; rr(g, x, cy - h / 2, w, h, h / 2); g.fill(); g.strokeStyle = C.okLn; g.lineWidth = 3; rr(g, x, cy - h / 2, w, h, h / 2); g.stroke();
    const pl = ((t || 0) * 0.9) % 1; g.fillStyle = 'rgba(18,161,80,' + (0.35 * (1 - pl)) + ')'; g.beginPath(); g.arc(x + 52, cy, 10 + 14 * pl, 0, 7); g.fill();
    g.fillStyle = C.ok; g.beginPath(); g.arc(x + 52, cy, 10, 0, 7); g.fill();
    txt(g, text, x + 84, cy + 1, sz, C.okD, { w: 500 });
    g.restore(); return w;
  }
  // окно браузера: светлая шапка с тремя точками и заголовком; возвращает внутреннюю область
  function windowFrame(g, x, y, w, h, title) {
    card(g, x, y, w, h, 14, '#FFFFFF', { sa: 1 });
    g.save(); rr(g, x, y, w, h, 14); g.clip();
    g.fillStyle = '#F1F2F5'; g.fillRect(x, y, w, 58);
    ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(x + 30 + i * 24, y + 29, 8, 0, 7); g.fill(); });
    g.fillStyle = '#E3E4E9'; rr(g, x + w * 0.28, y + 13, w * 0.44, 32, 16); g.fill();
    txt(g, title || '', x + w / 2, y + 30, 22, C.mut, { w: 500, a: 'center', max: w * 0.4 });
    g.restore(); return { x, y: y + 58, w, h: h - 58 };
  }
  // кабинет: тёмный сайдбар, заголовок, карточки с цифрами, график-область. o: {nav, active, title, btn, stats, series, u, hover}
  function dash(g, R, o) {
    const u = o.u, sbw = o.sbw || 220;
    g.save(); g.beginPath(); g.rect(R.x, R.y, R.w, R.h); g.clip();
    g.fillStyle = C.paper; g.fillRect(R.x, R.y, R.w, R.h);
    g.fillStyle = C.navy; g.fillRect(R.x, R.y, sbw, R.h);
    if (o.brand) { g.strokeStyle = C.teal; g.lineWidth = 6; g.beginPath(); g.arc(R.x + 44, R.y + 58, 15, 0, 7); g.stroke(); }
    if (o.brand) txt(g, o.brand, R.x + 72, R.y + 58, 32, '#FFFFFF', { w: 700, max: sbw - 84 });
    (o.nav || []).forEach((s, i) => {
      const yy = R.y + 150 + i * 72;
      if (i === o.active) { g.fillStyle = C.navy2; rr(g, R.x + 14, yy - 30, sbw - 28, 60, 12); g.fill(); }
      txt(g, s, R.x + 34, yy, 28, i === o.active ? '#FFFFFF' : '#9AA3B5', { w: i === o.active ? 600 : 500, max: sbw - 56 });
    });
    const mx = R.x + sbw + 30, mw = R.w - sbw - 60;
    txt(g, o.title || '', mx, R.y + 64, 40, C.ink, { w: 700, max: mw - 220 });
    if (o.btn) { const bw = tw(o.btn, 28, 600) + 44; g.fillStyle = C.chart; rr(g, mx + mw - bw, R.y + 36, bw, 58, 12); g.fill(); txt(g, o.btn, mx + mw - bw / 2, R.y + 65, 28, '#FFFFFF', { w: 600, a: 'center' }); }
    const st = o.stats || [];
    if (st[0]) miniCards(g, mx, R.y + 130, mw, [st[0]], u - 0.1, { h: 180, vs: 66 });
    if (st.length > 1) miniCards(g, mx, R.y + 330, mw, st.slice(1), u - 0.2, { h: 160 });
    const cy = R.y + 510, ch = R.h - 540;
    const cp = spr(u - 0.3, 11);
    if (cp > 0) {
      g.save(); g.globalAlpha = cl((u - 0.3) / 0.12, 0, 1); g.translate(0, (1 - cp) * 40);
      card(g, mx, cy, mw, ch, 18, '#FFFFFF', { sa: 0.35 });
      txt(g, o.chartTitle || '', mx + 28, cy + 46, 28, C.gray, { w: 500 });
      g.strokeStyle = '#E6E8EE'; g.lineWidth = 2; g.setLineDash([8, 10]);
      for (let k = 0; k < 4; k++) { const yy = cy + 110 + k * (ch - 160) / 3; g.beginPath(); g.moveTo(mx + 24, yy); g.lineTo(mx + mw - 24, yy); g.stroke(); }
      g.setLineDash([]);
      const S = o.series || [], n = S.length, px = i => mx + 30 + i * (mw - 60) / (n - 1), py = v => cy + ch - 40 - v * (ch - 170);
      const lp = eo(prog(u, 0.45, 1.5)) * (n - 1), last = Math.floor(lp), fr = lp - last;
      const pts = []; for (let i = 0; i <= last && i < n; i++) pts.push([px(i), py(S[i])]);
      if (last < n - 1) pts.push([lerp(px(last), px(last + 1), fr), py(lerp(S[last], S[last + 1], fr))]);
      if (pts.length > 1) {
        const gr = g.createLinearGradient(0, cy + 100, 0, cy + ch - 30); gr.addColorStop(0, 'rgba(18,149,127,0.28)'); gr.addColorStop(1, 'rgba(18,149,127,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(pts[0][0], cy + ch - 30); pts.forEach(p => g.lineTo(p[0], p[1])); g.lineTo(pts[pts.length - 1][0], cy + ch - 30); g.closePath(); g.fill();
        g.strokeStyle = C.chart; g.lineWidth = 6; g.lineJoin = 'round'; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
      }
      if (o.hover != null && o.hoverU > 0) {
        const i = o.hover, hx = px(i), hy = py(S[i]), hp = spr(o.hoverU, 11);
        g.fillStyle = '#FFFFFF'; g.strokeStyle = C.chart; g.lineWidth = 6; g.beginPath(); g.arc(hx, hy, 12 * hp, 0, 7); g.fill(); g.stroke();
        if (o.hoverLabel) { const lw = tw(o.hoverLabel, 30, 700) + 40, lx = cl(hx - lw / 2, mx + 10, mx + mw - lw - 10); g.globalAlpha *= cl(o.hoverU / 0.12, 0, 1); g.fillStyle = C.ink; rr(g, lx, hy - 96, lw, 62, 14); g.fill(); txt(g, o.hoverLabel, lx + lw / 2, hy - 64, 30, '#FFFFFF', { w: 700, a: 'center' }); }
      }
      g.restore();
    }
    g.restore();
    return { mx, mw, chartY: cy, chartH: ch };
  }
  // поверх окна: режим видеоплеера (приём «or a video.»): серая вуаль, кнопка play, шкала
  function player(g, R, u, o) {
    o = o || {}; const p = eo(u / 0.25); if (p <= 0) return;
    g.save(); g.beginPath(); g.rect(R.x, R.y, R.w, R.h); g.clip();
    g.fillStyle = 'rgba(120,122,134,' + (0.5 * p) + ')'; g.fillRect(R.x, R.y, R.w, R.h);
    const gr = g.createLinearGradient(0, R.y + R.h - 160, 0, R.y + R.h); gr.addColorStop(0, 'rgba(10,10,20,0)'); gr.addColorStop(1, 'rgba(10,10,20,' + 0.75 * p + ')'); g.fillStyle = gr; g.fillRect(R.x, R.y + R.h - 160, R.w, 160);
    const s = spr(u - 0.08, 10), cx = R.x + R.w / 2, cy = R.y + R.h / 2;
    g.translate(cx, cy); g.scale(s, s); card(g, -75, -75, 150, 150, 34, '#FFFFFF', { sa: 0.8 }); icon(g, 'play', 6, 0, 70, C.blue); g.setTransform(1, 0, 0, 1, 0, 0);
    g.restore(); g.save(); g.globalAlpha = p;
    const by = R.y + R.h - 50; g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(R.x + 30, by - 34, R.w - 60, 5); g.fillStyle = '#FFFFFF'; g.fillRect(R.x + 30, by - 34, (R.w - 60) * (o.pos || 0.02), 5);
    icon(g, 'play', R.x + 50, by, 30, '#FFFFFF'); if (o.time) txt(g, o.time, R.x + 84, by, 28, '#FFFFFF', { w: 600 });
    g.restore();
  }
  // переписка (приём «чат-агент»): msgs [{who:'bot'|'me', at, text | segs, card, cardOn}]; печать ботом 45 зн/с
  function chat(g, x, y, w, msgs, u, o) {
    o = o || {}; let yy = y; const sz = o.size || 44, gap = o.gap || 40;
    msgs.forEach(m => {
      const mu = u - m.at; if (mu < -0.55) return;
      if (m.who === 'me') {
        if (mu < 0) return;
        const p = spr(mu, 12), mw = Math.min(w * 0.8, tw(m.text, sz, 450) + 72), bh = sz * 1.36 + 52, bx = x + w - mw;
        g.save(); g.globalAlpha = cl(mu / 0.1, 0, 1); g.translate(0, (1 - p) * 30);
        card(g, bx, yy, mw, bh, 26, '#FFFFFF', { border: '#E3E5EB', sa: 0.25 });
        rich(g, m.text, bx + 36, yy + 26, mw - 60, sz, C.ink);
        g.restore(); yy += bh + gap; return;
      }
      if (mu < 0) { // «печатает»
        for (let k = 0; k < 3; k++) { const b = 0.5 + 0.5 * Math.sin(u * 14 - k * 0.9); g.fillStyle = 'rgba(116,131,149,' + (0.4 + 0.5 * b) + ')'; g.beginPath(); g.arc(x + 14 + k * 28, yy + sz * 0.6, 8, 0, 7); g.fill(); }
        yy += sz * 1.36 + gap; return;
      }
      const segs = m.segs || [{ t: m.text }], n = Math.floor(mu * (m.cps || 45));
      const r = rich(g, segs, x, yy, w - 40, sz, C.ink, { n, bc: C.ink });
      yy += r.h;
      if (m.card) {
        const cu = u - (m.cardAt || m.at + 0.6);
        if (cu > 0) {
          const p = spr(cu, 12), ch = 110;
          g.save(); g.globalAlpha = cl(cu / 0.12, 0, 1); g.translate(0, (1 - p) * 30);
          card(g, x, yy + 10, w * 0.86, ch, 22, m.cardOn ? '#EEF0FF' : '#FFFFFF', { border: C.blue, bw: 3, sa: 0.2 });
          g.fillStyle = C.blue; rr(g, x + 22, yy + 32, 66, 66, 14); g.fill(); icon(g, m.icon || 'cal', x + 55, yy + 65, 38, '#FFFFFF', 4);
          txt(g, m.card, x + 112, yy + 65, 42, C.ink, { w: 600, max: w * 0.86 - 140 });
          g.restore(); m._card = { x, y: yy + 10, w: w * 0.86, h: ch };
        }
        yy += 130;
      }
      yy += gap;
    });
    return yy;
  }
  // белая карточка «вопрос клиента + ответ» (приём «answers.»)
  function qa(g, x, y, w, q, segs, u, o) {
    o = o || {}; const p = spr(u, 11); if (p <= 0) return; const sz = o.size || 42;
    const qw = Math.min(w - 120, tw(q, sz, 450) + 64), qh = sz * 1.36 + 44;
    g.font = font(sz, 450);
    const total = segs.reduce((a, s) => a + s.t.length, 0);
    const lines = Math.ceil((tw(segs.map(s => s.t).join(''), sz, 520) + 40) / (w - 80));
    const h = 40 + qh + 34 + lines * sz * 1.36 + 40;
    g.save(); g.globalAlpha = cl(u / 0.12, 0, 1); g.translate(0, (1 - p) * 50);
    card(g, x, y, w, h, 20, '#FFFFFF', { sa: 0.6 });
    const qu = u - 0.12; if (qu > 0) { g.globalAlpha *= cl(qu / 0.1, 0, 1); card(g, x + w - 40 - qw, y + 40, qw, qh, 22, '#FFFFFF', { border: '#E3E5EB', sa: 0.2 }); txt(g, q, x + w - 40 - qw + 32, y + 40 + qh / 2, sz, C.ink, { w: 450 }); }
    const n = Math.floor((u - (o.at || 0.4)) * (o.cps || 55));
    if (n > 0) rich(g, segs, x + 40, y + 40 + qh + 34, w - 80, sz, C.ink, { n, bc: C.ink });
    g.restore(); return { h, done: n >= total };
  }
  // разлёт штрихов вокруг слова (приём появления «demo agent.»)
  function burst(g, cx, cy, u, col, o) {
    o = o || {}; if (u < 0 || u > 0.7) return; const n = o.n || 26, p = eo(u / 0.7);
    g.strokeStyle = col || 'rgba(255,255,255,0.8)'; g.lineCap = 'round'; g.lineWidth = 4; g.globalAlpha = 1 - p;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + 0.2, k = 0.8 + 0.4 * ((i * 37) % 7) / 7, r0 = (o.r || 380) * k + 260 * p, r1 = r0 + 40 + 30 * (1 - p);
      g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.9); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.9); g.stroke();
    }
    g.globalAlpha = 1;
  }

  // ===== ТИПОВЫЕ ОБЪЕКТЫ: плоские иллюстрации в языке стиля (сплошная заливка, скругления, без обводки и градиентов) =====
  // x - центр, y - земля (у лодки - ватерлиния). Каждый цвет - параметр (#RRGGBB). t - время для жизни (шаг, волны, колёса).
  const SKIN = ['#F3C9A8', '#E2AD86', '#C58B66', '#8E5C3E'], HAIR = ['#24180F', '#5B3A22', '#B4602E', '#E4BC6A', '#C9CDD6'];
  const SHIRTS = [C.blue, C.orange, C.teal, '#F8D877', '#E8577A', '#7FB843', C.ink, '#FFFFFF'];
  const hsh = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  function hx2(c) { if (c[0] === 'r') return c.match(/[\d.]+/g).slice(0, 3).map(Number); c = c.replace('#', ''); if (c.length === 3) c = c.replace(/./g, m => m + m); const n = parseInt(c, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  const MX = new Map();
  function mix(a, b, p) { const k = a + b + p; let v = MX.get(k); if (v) return v; const A = hx2(a), B = hx2(b); v = 'rgb(' + A.map((q, i) => Math.round(q + (B[i] - q) * p)).join(',') + ')'; MX.set(k, v); return v; }
  const dark = (c, p) => mix(c, '#0F172B', p == null ? 0.25 : p), light = (c, p) => mix(c, '#FFFFFF', p == null ? 0.3 : p);
  function disc(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, 7); g.fill(); }
  function ell(g, x, y, rx, ry, col, rot) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot || 0, 0, 7); g.fill(); }
  function poly(g, pts, col) { g.fillStyle = col; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill(); }
  function seg(g, pts, w, col) { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); }
  function box(g, x, y, w, h, r, col) { g.fillStyle = col; rr(g, x, y, w, h, r); g.fill(); }
  // колено/локоть между a и b при длине половинок L; side ±1 - в какую сторону сгиб
  function ik(a, b, L, side) { const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, h = Math.sqrt(Math.max(0, L * L - d * d / 4)); return [(a[0] + b[0]) / 2 - dy / d * h * side, (a[1] + b[1]) / 2 + dx / d * h * side]; }

  // картинка-карточка: белая карточка с тенью, внутри небо и рисунок fn(g, b), b = {x, y, w, h}
  function pic(g, x, y, w, h, fn, o) {
    o = o || {}; const r = o.r == null ? 28 : o.r;
    if (o.shadow !== false) shadow(g, x, y, w, h, 0.9);
    g.save(); rr(g, x, y, w, h, r); g.clip();
    sky(g, x, y, w, h, { tone: o.sky || 'day' }); fn(g, { x, y, w, h }); g.restore();
    if (o.border) { g.strokeStyle = o.border; g.lineWidth = 3; rr(g, x, y, w, h, r); g.stroke(); }
  }
  // небо плоскими полосами. tone: dawn (розовый рассвет), morning, day, evening, night или {top, bot}
  const SKY = { dawn: ['#F6C9D8', '#FCE3D6'], morning: ['#CFE0FF', '#EAF1FF'], day: ['#BFD6FF', '#E3EDFF'], evening: ['#B9B4F2', '#F7C6B4'], night: ['#0F1530', '#1B2350'] };
  function sky(g, x, y, w, h, o) {
    const s = typeof o.tone === 'object' ? [o.tone.top, o.tone.bot] : SKY[o.tone] || SKY.day;
    g.fillStyle = s[0]; g.fillRect(x, y, w, h); g.fillStyle = mix(s[0], s[1], 0.5); g.fillRect(x, y + h * 0.42, w, h * 0.58); g.fillStyle = s[1]; g.fillRect(x, y + h * 0.62, w, h * 0.38);
  }
  function sun(g, x, y, r, o) {
    o = o || {}; const col = o.col || '#F8D877', p = 1 + 0.04 * Math.sin((o.t || 0) * 2);
    g.globalAlpha *= 0.25; disc(g, x, y, r * 1.55 * p, col); g.globalAlpha /= 0.25;
    g.globalAlpha *= 0.4; disc(g, x, y, r * 1.25, col); g.globalAlpha /= 0.4; disc(g, x, y, r, col);
    if (o.rays) for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + (o.t || 0) * 0.2; seg(g, [[x + Math.cos(a) * r * 1.75, y + Math.sin(a) * r * 1.75], [x + Math.cos(a) * r * 2.1, y + Math.sin(a) * r * 2.1]], r * 0.1, col); }
  }
  // луна-серп: bg - цвет неба за ней
  function moon(g, x, y, r, o) { o = o || {}; const c = o.col || '#FFF4C9'; g.globalAlpha *= 0.14; disc(g, x, y, r * 1.6, c); g.globalAlpha /= 0.14; g.save(); g.beginPath(); g.arc(x, y, r, 0, 7); g.clip(); disc(g, x, y, r, c); g.globalAlpha *= 0.86; disc(g, x + r * 0.45, y - r * 0.3, r * 0.82, o.bg || SKY.night[0]); g.restore(); }
  function starsky(g, t, x, y, w, h, o) {
    o = o || {}; const n = o.n || 40, a0 = g.globalAlpha, al = o.alpha == null ? 1 : o.alpha; if (al <= 0) return;
    for (let i = 0; i < n; i++) {
      const sx = x + hsh(i + 3) * w, sy = y + hsh(i + 71) * h, tw2 = 0.55 + 0.45 * Math.sin(t * (1.5 + hsh(i) * 2) + i), r = 2 + hsh(i + 9) * 3.5;
      g.globalAlpha = a0 * al * Math.min(1, tw2 * cl((al * n - i) , 0, 1)); g.fillStyle = o.col || '#FFF4C9';
      g.beginPath(); g.moveTo(sx, sy - r * 1.8); g.lineTo(sx + r * 0.45, sy - r * 0.45); g.lineTo(sx + r * 1.8, sy); g.lineTo(sx + r * 0.45, sy + r * 0.45); g.lineTo(sx, sy + r * 1.8); g.lineTo(sx - r * 0.45, sy + r * 0.45); g.lineTo(sx - r * 1.8, sy); g.lineTo(sx - r * 0.45, sy - r * 0.45); g.closePath(); g.fill();
    }
    g.globalAlpha = a0;
  }
  function cloud(g, x, y, s, o) { o = o || {}; const c = o.col || '#FFFFFF'; box(g, x - s * 0.5, y - s * 0.16, s, s * 0.22, s * 0.11, c); disc(g, x - s * 0.18, y - s * 0.18, s * 0.17, c); disc(g, x + s * 0.1, y - s * 0.24, s * 0.23, c); }
  function sea(g, t, x0, y, x1, y1, o) {
    o = o || {}; const col = o.col || C.blue, c2 = o.col2 || light(col, 0.35), amp = o.amp || 8;
    g.fillStyle = col; g.fillRect(x0, y, x1 - x0, y1 - y);
    for (let k = 0; k < 3; k++) {
      const yy = y + 18 + k * (y1 - y) * 0.3, ph = t * (1.6 - k * 0.3) + k * 2;
      g.strokeStyle = c2; g.lineWidth = 5 - k; g.lineCap = 'round'; g.beginPath();
      for (let xx = x0 - 40; xx <= x1 + 40; xx += 24) { const v = yy + Math.sin(xx * 0.02 + ph) * amp * (1 - k * 0.25); xx === x0 - 40 ? g.moveTo(xx, v) : g.lineTo(xx, v); }
      g.stroke();
    }
    g.fillStyle = light(col, 0.2); g.fillRect(x0, y, x1 - x0, 6);
  }
  function hill(g, x, y, w, h, o) { o = o || {}; g.fillStyle = o.col || '#7FB843'; g.beginPath(); g.ellipse(x, y, w / 2, h, 0, Math.PI, 0); g.closePath(); g.fill(); }

  // ----- человек -----
  // o: {h, age:'adult'|'kid'|'old', pose, t, ph, dir, skin, hair, hs:'short'|'long'|'bun'|'bald', shirt, pants, dress, shoes,
  //     helmet, cap, bag, glasses, book, cane, ride:{seat,pedals:[[x,y],[x,y]],bar}}
  // pose: stand walk run wave hold read point shout dance sit ride. Возвращает {hand, hand2, head, top}
  function person(g, x, y, o) {
    o = o || {}; const age = o.age || 'adult', kid = age === 'kid', old = age === 'old', h = o.h || (kid ? 170 : 260), dir = o.dir || 1;
    const pose = o.pose || 'stand', t = (o.t || 0) + (o.ph || 0), hr = h * (kid ? 0.11 : 0.085), legL = h * (kid ? 0.4 : 0.46);
    const skin = o.skin || SKIN[0], hair = o.hair || (old ? HAIR[4] : HAIR[0]), shirt = o.shirt || C.blue, pants = o.pants || C.navy, shoe = o.shoes || '#20232E';
    const lw = h * (kid ? 0.075 : 0.062), tw2 = h * (kid ? 0.19 : 0.2);
    let bob = 0, hipX = x, hipY = y - legL, legs, fA, bA;
    const sw = Math.sin(t * (pose === 'run' ? 11 : 7));
    const foot = (a, k) => [hipX + Math.sin(a) * dir * legL * k, hipY + Math.cos(a) * legL * k];
    if (pose === 'walk' || pose === 'run') {
      const A = pose === 'run' ? 0.7 : 0.42; bob = -Math.abs(Math.cos(t * (pose === 'run' ? 11 : 7))) * h * (pose === 'run' ? 0.03 : 0.012);
      hipY += bob; legs = [foot(sw * A, sw > 0 ? 1 : (pose === 'run' ? 0.82 : 0.97)), foot(-sw * A, sw < 0 ? 1 : (pose === 'run' ? 0.82 : 0.97))];
      const B = pose === 'run' ? 0.9 : 0.45; fA = [-sw * B, -sw * B + (pose === 'run' ? 1.5 : 0.35)]; bA = [sw * B, sw * B + (pose === 'run' ? 1.5 : 0.35)];
    } else if (pose === 'sit') {
      hipY = y - legL * 0.52; hipX = x - dir * legL * 0.12; const kn = [hipX + dir * legL * 0.5, hipY - 2];
      legs = [[kn[0], y], [kn[0] - dir * 8, y]]; legs.knee = kn; fA = [0.45, 1.45]; bA = [0.35, 1.35];
    } else if (pose === 'ride' && o.ride) {
      hipX = o.ride.seat[0]; hipY = o.ride.seat[1]; legs = o.ride.pedals; legs.ride = 1;
    } else {
      if (pose === 'dance') { bob = -Math.abs(Math.sin(t * 6)) * h * 0.03; hipY += bob; legs = [foot(0.12 + 0.25 * Math.max(0, Math.sin(t * 6)), 1), foot(-0.12 - 0.25 * Math.max(0, -Math.sin(t * 6)), 1)]; }
      else legs = [foot(0.07, 1), foot(-0.07, 1)];
      const P = {
        stand: [[0.12, 0.08], [-0.12, -0.08]], wave: [[2.5, 2.85 + 0.35 * Math.sin(t * 9)], [-0.1, 0]], hold: [[0.55, 1.5], [0.4, 1.4]],
        read: [[0.65, 1.75], [0.5, 1.65]], point: [[1.5, 1.55], [-0.1, 0]], shout: [[0.6, 2.55], [2.2 + 0.15 * Math.sin(t * 8), 2.5]],
        dance: [[2.4 + 0.35 * Math.sin(t * 6), 2.9], [2.2 + 0.35 * Math.sin(t * 6 + 1.6), 2.75]]
      }[pose] || [[0.12, 0.08], [-0.12, -0.08]];
      fA = P[0]; bA = P[1];
    }
    const lean = old ? dir * h * 0.035 : 0;
    const shY = y - legL - h * (kid ? 0.3 : 0.33) + bob + (pose === 'sit' ? legL * 0.48 : 0) + (pose === 'ride' ? hipY - (y - legL) : 0);
    const shX = hipX + lean, neckY = shY - h * 0.02, headX = shX + lean * 0.6 + (pose === 'ride' ? dir * h * 0.04 : 0), headY = neckY - hr * 0.95;
    const ua = h * (kid ? 0.17 : 0.18), fa = h * (kid ? 0.16 : 0.17);
    const arm = (sx, sy, A) => { const e = [sx + Math.sin(A[0]) * dir * ua, sy + Math.cos(A[0]) * ua]; return [[sx, sy], e, [e[0] + Math.sin(A[1]) * dir * fa, e[1] + Math.cos(A[1]) * fa]]; };
    let fArm, bArm;
    if (legs.ride) { const b = o.ride.bar; fArm = [[shX + dir * 4, shY + lw * 0.4], ik([shX, shY], b, (ua + fa) / 2, dir), b]; bArm = [[shX - dir * 4, shY + lw * 0.4], ik([shX, shY], [b[0] - dir * 6, b[1]], (ua + fa) / 2, dir), [b[0] - dir * 6, b[1]]]; }
    else { fArm = arm(shX + dir * tw2 * 0.12, shY + lw * 0.45, fA); bArm = arm(shX - dir * tw2 * 0.12, shY + lw * 0.45, bA); }
    const sleeve = o.sleeve || shirt, legCol = o.dress ? skin : pants;
    const legPts = (f, i) => { if (legs.knee) return [[hipX, hipY], [legs.knee[0] - i * dir * 10, legs.knee[1]], [f[0] - i * dir * 10, f[1] - lw * 0.4]]; return [[hipX, hipY], ik([hipX, hipY], f, legL * 0.5 + 0.5, -dir), f]; };
    const drawLeg = (f, i) => { const P = legPts(f, i); seg(g, P, lw * 1.05, legCol); const e = P[2]; ell(g, e[0] + dir * lw * 0.35, e[1] + lw * 0.1, lw * 0.75, lw * 0.42, shoe); };
    const drawArm = A => { seg(g, [A[0], A[1]], lw * 1.02, sleeve); seg(g, [A[1], A[2]], lw * 0.92, o.longSleeve === false ? skin : sleeve); disc(g, A[2][0], A[2][1], lw * 0.5, skin); };
    // рюкзак за спиной
    if (o.bag) box(g, shX - dir * tw2 * 0.5 - (dir > 0 ? tw2 * 0.42 : -tw2 * 0.02), shY + h * 0.02, tw2 * 0.42, h * 0.22, 8, o.bag);
    drawArm(bArm); drawLeg(legs[1], 1);
    // корпус
    if (o.dress) poly(g, [[shX - tw2 * 0.5, shY], [shX + tw2 * 0.5, shY], [hipX + tw2 * 0.78, hipY + legL * 0.42], [hipX - tw2 * 0.78, hipY + legL * 0.42]], o.dress);
    drawLeg(legs[0], 0);
    if (o.dress) poly(g, [[shX - tw2 * 0.5, shY + 4], [shX + tw2 * 0.5, shY + 4], [hipX + tw2 * 0.78, hipY + legL * 0.42], [hipX - tw2 * 0.78, hipY + legL * 0.42]], o.dress);
    else { g.fillStyle = shirt; g.beginPath(); g.moveTo(shX - tw2 * 0.5, shY + lw * 0.3); g.lineTo(shX + tw2 * 0.5, shY + lw * 0.3); g.lineTo(hipX + tw2 * 0.46, hipY + lw * 0.3); g.lineTo(hipX - tw2 * 0.46, hipY + lw * 0.3); g.closePath(); g.fill(); rr(g, shX - tw2 * 0.5, shY - 2, tw2, lw * 1.2, lw * 0.6); g.fill(); }
    if (o.vest) { g.fillStyle = o.vest; g.fillRect(shX - tw2 * 0.12, shY + lw * 0.6, tw2 * 0.24, hipY - shY - lw * 0.6); }
    // голова
    box(g, headX - hr * 0.3, neckY - hr * 0.3, hr * 0.6, hr * 0.6, 3, skin);
    if (o.hs === 'long' || (!o.hs && o.dress && !old)) box(g, headX - hr * 1.05 - dir * hr * 0.15, headY - hr * 0.6, hr * 2.1, hr * 2.0, hr * 0.7, hair);
    disc(g, headX, headY, hr, skin);
    const hs = o.hs || (o.dress && !old ? 'long' : old && o.dress ? 'bun' : 'short');
    if (o.helmet || o.cap) {
      const hc = o.helmet || o.cap; g.fillStyle = hc; g.beginPath(); g.arc(headX, headY - hr * 0.1, hr * 1.1, Math.PI, 0); g.closePath(); g.fill();
      if (o.helmet) box(g, headX - hr * 1.3, headY - hr * 0.2, hr * 2.6, hr * 0.28, hr * 0.14, dark(hc, 0.12)); else box(g, headX + (dir > 0 ? hr * 0.4 : -hr * 1.5), headY - hr * 0.22, hr * 1.1, hr * 0.26, hr * 0.13, dark(hc, 0.15));
    } else if (hs !== 'bald') {
      g.fillStyle = hair; g.beginPath(); g.arc(headX, headY - hr * 0.08, hr * 1.06, Math.PI, 0); g.closePath(); g.fill();
      disc(g, headX - dir * hr * 0.55, headY + hr * 0.02, hr * 0.62, hair);
      if (hs === 'bun') disc(g, headX - dir * hr * 0.55, headY - hr * 1.0, hr * 0.45, hair);
    } else disc(g, headX - dir * hr * 0.7, headY + hr * 0.15, hr * 0.38, hair);
    const ex = headX + dir * hr * 0.42, ey = headY + hr * 0.12;
    if (o.sleep) seg(g, [[ex - hr * 0.16, ey], [ex + hr * 0.16, ey]], hr * 0.1, C.ink); else disc(g, ex, ey, hr * 0.1, C.ink);
    if (pose === 'shout') ell(g, headX + dir * hr * 0.6, headY + hr * 0.5, hr * 0.16, hr * 0.2, '#8C2F2F');
    else if (o.smile !== false) { g.strokeStyle = C.ink; g.lineWidth = hr * 0.08; g.beginPath(); g.arc(headX + dir * hr * 0.5, headY + hr * 0.35, hr * 0.18, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke(); }
    if (o.glasses) { g.strokeStyle = C.ink; g.lineWidth = hr * 0.08; g.beginPath(); g.arc(ex, ey, hr * 0.24, 0, 7); g.stroke(); }
    if (o.cane) seg(g, [[fArm[2][0], fArm[2][1]], [fArm[2][0] + dir * 6, y]], lw * 0.35, '#6B4A33');
    drawArm(fArm);
    if (o.book || pose === 'read') { const b = o.book || '#E8577A', mx2 = (fArm[2][0] + bArm[2][0]) / 2 + dir * hr * 0.3, my = (fArm[2][1] + bArm[2][1]) / 2 - hr * 0.3; box(g, mx2 - hr * 0.9, my - hr * 0.6, hr * 1.8, hr * 1.2, 4, b); seg(g, [[mx2, my - hr * 0.55], [mx2, my + hr * 0.55]], 2, '#FFFFFF'); }
    return { hand: fArm[2], hand2: bArm[2], head: [headX, headY], top: headY - hr };
  }
  // несколько разных людей рядом: соседи всегда разного цвета одежды; opts(i) переопределяет параметры
  function crowd(g, x0, x1, y, n, o) {
    o = o || {}; const sh = o.shirts || SHIRTS, sd = o.seed || 0, out = [];
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? (x0 + x1) / 2 : lerp(x0, x1, i / (n - 1)), k = i + sd;
      const age = o.kids === true ? 'kid' : o.old && i % 3 === 2 ? 'old' : o.kids && i % 2 ? 'kid' : 'adult';
      const p = Object.assign({ h: (o.h || 240) * (age === 'kid' ? 0.68 : 1) * (0.94 + 0.12 * hsh(k)), age, pose: o.pose, t: o.t, ph: i * 1.3, dir: o.dir || (i % 2 ? -1 : 1),
        skin: SKIN[Math.floor(hsh(k + 5) * 4)], hair: HAIR[Math.floor(hsh(k + 8) * 4)], shirt: sh[k % sh.length], pants: i % 2 ? C.navy : '#3D4A63',
        dress: o.dresses && i % 2 ? sh[(k + 3) % sh.length] : null }, o.opts ? o.opts(i) : {});
      out.push(person(g, x, y, p));
    }
    return out;
  }

  // ----- здания -----
  const GLASS = '#CFD8F7', LIT = '#F8D877', DARKW = '#2A3152';
  function winR(g, x, y, w, h, lit, night) { box(g, x, y, w, h, Math.min(6, w * 0.12), lit ? LIT : night ? DARKW : GLASS); if (!lit && !night) box(g, x + w * 0.15, y + h * 0.12, w * 0.18, h * 0.5, 3, 'rgba(255,255,255,0.7)'); }
  // дом со скатной крышей
  function house(g, x, y, w, h, o) {
    o = o || {}; const nt = o.night, wall = nt ? dark(o.wall || '#FFFFFF', 0.6) : o.wall || '#FFFFFF', roof = nt ? dark(o.roof || C.blue, 0.4) : o.roof || C.blue, bh = h * 0.64, x0 = x - w / 2;
    box(g, x0, y - bh, w, bh, 6, wall); g.fillStyle = dark(wall, 0.06); g.fillRect(x0 + w * 0.82, y - bh, w * 0.18, bh);
    poly(g, [[x0 - w * 0.08, y - bh + 4], [x, y - h], [x0 + w * 1.08, y - bh + 4]], roof);
    box(g, x - w * 0.11, y - bh * 0.5, w * 0.22, bh * 0.5, 6, o.door || C.orange);
    const lit = o.lit == null ? (nt ? 1 : 0) : o.lit, ww = w * 0.2, wh = bh * 0.3;
    winR(g, x0 + w * 0.12, y - bh * 0.75, ww, wh, lit > 0.3, nt); winR(g, x0 + w * 0.68, y - bh * 0.75, ww, wh, lit > 0.7, nt);
  }
  // многоэтажка: cols × rows окон; lit 0..1 - доля горящих (гаснут по одному), grow 0..1 - стройка по этажам; возвращает {x0, top, w, h}
  function tower(g, x, y, cols, rows, o) {
    o = o || {}; const cw = o.cw || 62, ch = o.ch || 74, pad = 20, w = cols * cw + pad * 2, nt = o.night;
    const fl = Math.floor(rows * (o.grow == null ? 1 : o.grow) + 1e-6), hh = fl * ch + pad, x0 = x - w / 2, top = y - hh;
    const wall = nt ? dark(o.wall || '#E8E6F7', 0.62) : o.wall || '#E8E6F7';
    if (fl > 0) {
      box(g, x0, top, w, hh, 6, wall); g.fillStyle = dark(wall, 0.07); g.fillRect(x0 + w - pad, top, pad, hh);
      if (fl === rows && o.roof !== false) box(g, x0 - 8, top - 14, w + 16, 18, 4, nt ? dark(o.roof || C.ink, 0.2) : o.roof || C.ink);
      const lit = o.lit == null ? (nt ? 1 : 0) : o.lit;
      for (let r = 0; r < fl; r++) for (let c = 0; c < cols; c++) {
        const k = r * cols + c, on = hsh(k * 7 + 3 + (o.seed || 0)) < lit;
        winR(g, x0 + pad + c * cw + cw * 0.16, y - (r + 1) * ch + ch * 0.2, cw * 0.68, ch * 0.56, on, nt);
      }
    }
    return { x0, top, w, h: hh, floors: fl, ch };
  }
  // магазин или кафе: навес полосками, вывеска с текстом sign (только из параметра), витрина, дверь
  function shop(g, x, y, w, h, o) {
    o = o || {}; const nt = o.night, wall = nt ? dark(o.wall || '#FFFFFF', 0.6) : o.wall || '#FFFFFF', x0 = x - w / 2;
    box(g, x0, y - h, w, h, 6, wall);
    const ay = y - h * 0.62, n = 6, aw = w + 20;
    for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? (o.awning2 || light(o.awning || C.orange, 0.7)) : (o.awning || C.orange); g.beginPath(); const ax = x0 - 10 + i * aw / n; g.moveTo(ax, ay); g.lineTo(ax + aw / n, ay); g.lineTo(ax + aw / n, ay + 46); g.arc(ax + aw / n / 2, ay + 46, aw / n / 2, 0, Math.PI); g.closePath(); g.fill(); }
    if (o.sign) { const sz = Math.min(46, h * 0.13); box(g, x0 + w * 0.1, y - h + 16, w * 0.8, sz * 1.6, 10, o.signBg || C.ink); txt(g, o.sign, x, y - h + 16 + sz * 0.82, sz, o.signCol || '#FFFFFF', { w: 700, a: 'center', max: w * 0.74 }); }
    const lit = o.lit == null ? (nt ? 1 : 0) : o.lit;
    winR(g, x0 + w * 0.08, ay + 70, w * 0.5, y - ay - 90, lit > 0.5, nt);
    box(g, x0 + w * 0.66, ay + 70, w * 0.24, y - ay - 70, 6, o.door || C.teal);
    if (o.kind === 'cafe') { const tx = x0 - w * 0.08; box(g, tx - 40, y - 62, 80, 10, 4, C.ink); seg(g, [[tx, y - 56], [tx, y]], 6, C.ink); box(g, tx - 70, y - 40, 22, 40, 4, o.awning || C.orange); box(g, tx + 48, y - 40, 22, 40, 4, o.awning || C.orange); }
  }
  // школа / библиотека: фронтон, часы, ступени, вывеска sign из параметра
  function school(g, x, y, w, h, o) {
    o = o || {}; const nt = o.night, wall = nt ? dark(o.wall || '#F1E3C8', 0.6) : o.wall || '#F1E3C8', roof = nt ? dark(o.roof || C.orange, 0.4) : o.roof || C.orange, x0 = x - w / 2, bh = h * 0.72;
    box(g, x0, y - bh, w, bh, 6, wall); poly(g, [[x - w * 0.3, y - bh + 2], [x, y - h], [x + w * 0.3, y - bh + 2]], roof);
    disc(g, x, y - bh - (h - bh) * 0.38, (h - bh) * 0.24, '#FFFFFF'); const tt = (o.t || 0) * 0.3, cx = x, cy = y - bh - (h - bh) * 0.38, R = (h - bh) * 0.2;
    seg(g, [[cx, cy], [cx + Math.sin(tt) * R, cy - Math.cos(tt) * R]], 4, C.ink); seg(g, [[cx, cy], [cx + R * 0.6, cy]], 4, C.ink);
    const lit = o.lit == null ? (nt ? 1 : 0) : o.lit;
    for (let i = 0; i < 4; i++) { const wx = x0 + w * (0.07 + i * 0.25); if (i === 1 || i === 2) { winR(g, wx, y - bh * 0.88, w * 0.13, bh * 0.28, lit > 0.4, nt); continue; } winR(g, wx, y - bh * 0.88, w * 0.13, bh * 0.28, lit > 0.2, nt); winR(g, wx, y - bh * 0.48, w * 0.13, bh * 0.28, lit > 0.6, nt); }
    box(g, x - w * 0.1, y - bh * 0.45, w * 0.2, bh * 0.45, 8, o.door || C.blue); box(g, x - w * 0.18, y - 12, w * 0.36, 12, 3, dark(wall, 0.15));
    if (o.sign) { const sz = Math.min(40, bh * 0.11); box(g, x - w * 0.3, y - bh * 0.66, w * 0.6, sz * 1.5, 8, o.signBg || C.ink); txt(g, o.sign, x, y - bh * 0.66 + sz * 0.78, sz, '#FFFFFF', { w: 700, a: 'center', max: w * 0.55 }); }
    if (o.flag) { seg(g, [[x0 + 20, y - bh], [x0 + 20, y - h - 30]], 5, C.ink); poly(g, [[x0 + 22, y - h - 30], [x0 + 80, y - h - 18 + Math.sin((o.t || 0) * 4) * 4], [x0 + 22, y - h - 6]], o.flag); }
  }

  // ----- растения -----
  // kind: 'leaf' (лиственное), 'oak' (раскидистый дуб), 'pine' (ёлка); s - высота
  function tree(g, x, y, s, o) {
    o = o || {}; const k = o.kind || 'leaf', sw = Math.sin((o.t || 0) * 1.3 + x * 0.01) * s * 0.012, trunk = o.trunk || '#8A5A3C';
    if (k === 'pine') { const c = o.col || '#0E6B5E'; box(g, x - s * 0.04, y - s * 0.2, s * 0.08, s * 0.2, 3, trunk); for (let i = 0; i < 3; i++) { const yy = y - s * 0.15 - i * s * 0.25, ww = s * (0.42 - i * 0.09); poly(g, [[x - ww + sw * i, yy], [x + sw * (i + 1), yy - s * 0.38], [x + ww + sw * i, yy]], i % 2 ? light(c, 0.12) : c); } return; }
    const c = o.col || '#2E9E6E', c2 = light(c, 0.18), oak = k === 'oak';
    poly(g, [[x - s * (oak ? 0.07 : 0.045), y], [x - s * 0.03, y - s * 0.55], [x + s * 0.03, y - s * 0.55], [x + s * (oak ? 0.07 : 0.045), y]], trunk);
    if (oak) seg(g, [[x, y - s * 0.4], [x + s * 0.2, y - s * 0.6]], s * 0.04, trunk);
    const B = oak ? [[-0.3, -0.62, 0.24], [0.3, -0.64, 0.25], [0, -0.82, 0.3], [-0.12, -0.6, 0.22], [0.15, -0.58, 0.22]] : [[-0.16, -0.6, 0.2], [0.17, -0.62, 0.2], [0, -0.8, 0.24]];
    B.forEach(b => disc(g, x + b[0] * s + sw, y + b[1] * s, b[2] * s, c)); disc(g, x - s * 0.08 + sw, y - s * (oak ? 0.9 : 0.86), s * (oak ? 0.12 : 0.1), c2);
  }
  function grass(g, x0, x1, y, o) {
    o = o || {}; const c = o.col || '#7FB843', h = o.h || 26; g.fillStyle = c; g.fillRect(x0, y, x1 - x0, o.depth || 400);
    g.fillStyle = dark(c, 0.15); g.beginPath(); for (let x = x0 + 8, i = 0; x < x1; x += 22, i++) { const hh = h * (0.6 + 0.4 * hsh(i)); g.moveTo(x - 5, y + 2); g.lineTo(x + Math.sin((o.t || 0) * 2 + i) * 3, y - hh); g.lineTo(x + 5, y + 2); } g.fill();
  }
  // кленовый лист; leaves - падающие листья (детерминированно по t)
  function leaf(g, x, y, s, o) {
    o = o || {}; g.save(); g.translate(x, y); g.rotate(o.rot || 0); g.fillStyle = o.col || C.orange; g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.4 : s; i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fill(); seg(g, [[0, 0], [0, s * 1.2]], s * 0.12, dark(o.col || C.orange, 0.2)); g.restore();
  }
  function leaves(g, t, x0, x1, y0, y1, o) {
    o = o || {}; const n = o.n || 10, cols = o.cols || [C.orange, '#F8D877', '#E0662B'];
    for (let i = 0; i < n; i++) { const sp = 0.12 + hsh(i) * 0.12, p = (t * sp + hsh(i + 9)) % 1, x = lerp(x0, x1, hsh(i + 4)) + Math.sin(t * 1.5 + i) * 30, y = lerp(y0, y1, p); leaf(g, x, y, o.s || 18, { col: cols[i % cols.length], rot: t * (1 + hsh(i)) + i }); }
  }

  // ----- транспорт: dir ±1 (куда едет), t крутит колёса -----
  function wheel(g, x, y, r, a) { disc(g, x, y, r, '#20232E'); disc(g, x, y, r * 0.45, '#C9CDD6'); seg(g, [[x - Math.cos(a) * r * 0.4, y - Math.sin(a) * r * 0.4], [x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.4]], r * 0.12, '#20232E'); }
  function car(g, x, y, s, o) {
    o = o || {}; const d = o.dir || 1, col = o.col || C.orange, r = s * 0.1, a = (o.t || 0) * 9 * d;
    g.save(); g.translate(x, y); g.scale(d, 1);
    poly(g, [[-s * 0.26, -s * 0.28], [-s * 0.18, -s * 0.44], [s * 0.14, -s * 0.44], [s * 0.26, -s * 0.28]], dark(col, 0.08));
    poly(g, [[-s * 0.2, -s * 0.29], [-s * 0.15, -s * 0.4], [-s * 0.02, -s * 0.4], [-s * 0.02, -s * 0.29]], GLASS); poly(g, [[s * 0.02, -s * 0.29], [s * 0.02, -s * 0.4], [s * 0.12, -s * 0.4], [s * 0.2, -s * 0.29]], GLASS);
    box(g, -s * 0.5, -s * 0.3, s, s * 0.2, s * 0.06, col); box(g, s * 0.42, -s * 0.25, s * 0.07, s * 0.05, 3, LIT);
    g.restore(); wheel(g, x - d * s * 0.3, y - r, r, a); wheel(g, x + d * s * 0.3, y - r, r, a);
  }
  // автобус: num - номер на табличке (текст из параметра), people - головы пассажиров в окнах
  function bus(g, x, y, s, o) {
    o = o || {}; const d = o.dir || 1, col = o.col || C.blue, r = s * 0.065, bh = s * 0.34, x0 = x - s / 2, a = (o.t || 0) * 9 * d;
    box(g, x0, y - bh - r * 0.8, s, bh, s * 0.05, col); g.fillStyle = dark(col, 0.12); g.fillRect(x0 + 8, y - r * 0.8 - bh * 0.22, s - 16, bh * 0.08);
    const n = 5, ww = s * 0.13, fx = d > 0 ? x0 + s * 0.84 : x0 + s * 0.02;
    for (let i = 0; i < n; i++) { const wx = (d > 0 ? x0 + s * 0.04 : x0 + s * 0.2) + i * s * 0.15; winR(g, wx, y - bh - r * 0.8 + bh * 0.14, ww, bh * 0.38, false, false); if (o.people && hsh(i + 2) > 0.3) { disc(g, wx + ww / 2, y - bh - r * 0.8 + bh * 0.42, ww * 0.22, SKIN[i % 4]); g.fillStyle = HAIR[i % 4]; g.beginPath(); g.arc(wx + ww / 2, y - bh - r * 0.8 + bh * 0.4, ww * 0.23, Math.PI, 0); g.fill(); } }
    box(g, fx, y - bh - r * 0.8 + bh * 0.14, s * 0.14, bh * 0.78, 6, GLASS);
    if (o.num) { const sz = bh * 0.2; box(g, fx - (d > 0 ? s * 0.1 : -s * 0.02), y - bh - r * 0.8 - sz * 1.4, s * 0.22, sz * 1.3, 6, C.ink); txt(g, o.num, fx - (d > 0 ? s * 0.1 : -s * 0.02) + s * 0.11, y - bh - r * 0.8 - sz * 0.75, sz, LIT, { w: 700, a: 'center', max: s * 0.2 }); }
    box(g, d > 0 ? x0 + s - 10 : x0 + 2, y - r * 0.8 - bh * 0.3, 8, bh * 0.12, 3, LIT);
    wheel(g, x - d * s * 0.3, y - r, r, a); wheel(g, x + d * s * 0.32, y - r, r, a);
  }
  // велосипед с человеком: rider - параметры person (shirt, helmet...) или false
  function bike(g, x, y, s, o) {
    o = o || {}; const d = o.dir || 1, col = o.col || C.teal, r = s * 0.27, a = (o.t || 0) * 8 * d, bx = x - d * s * 0.42, fx = x + d * s * 0.42, cy = y - r;
    const crank = [x - d * s * 0.04, cy], seat = [x - d * s * 0.12, y - s * 0.78], bar = [x + d * s * 0.3, y - s * 0.86];
    const ca = (o.t || 0) * 6, pd = [[crank[0] + Math.cos(ca) * s * 0.1, crank[1] + Math.sin(ca) * s * 0.1], [crank[0] - Math.cos(ca) * s * 0.1, crank[1] - Math.sin(ca) * s * 0.1]];
    const P = o.rider !== false ? Object.assign({ h: s * 1.35, pose: 'ride', dir: d, ride: { seat: [seat[0], seat[1] - 4], pedals: pd, bar } }, o.rider || {}) : null;
    [bx, fx].forEach(wx => { g.strokeStyle = '#20232E'; g.lineWidth = s * 0.05; g.beginPath(); g.arc(wx, cy, r, 0, 7); g.stroke(); seg(g, [[wx - Math.cos(a) * r, cy - Math.sin(a) * r], [wx + Math.cos(a) * r, cy + Math.sin(a) * r]], 2, '#9AA0AE'); });
    seg(g, [[bx, cy], crank, [seat[0], seat[1] + 8], [bx, cy]], s * 0.04, col); seg(g, [crank, [bar[0] - d * 8, bar[1] + s * 0.12], [seat[0], seat[1] + 8]], s * 0.04, col);
    seg(g, [[fx, cy], [bar[0] - d * 4, bar[1] + 6]], s * 0.04, col); seg(g, [[bar[0] - d * 10, bar[1]], [bar[0] + d * 6, bar[1] - 2]], s * 0.035, '#20232E'); box(g, seat[0] - s * 0.07, seat[1] - 3, s * 0.14, 9, 4, '#20232E');
    return P ? person(g, seat[0], y, P) : null;
  }
  // лодка/катер: y - ватерлиния; motor - мотор за кормой, run 0..1 - бурун за кормой; возвращает {deck:[x,y]} для людей на борту
  function boat(g, x, y, s, o) {
    o = o || {}; const d = o.dir || 1, col = o.col || '#FFFFFF', t = o.t || 0, bob = Math.sin(t * 2.2 + x * 0.01) * s * 0.012, yy = y + bob, dk = yy - s * 0.12;
    if (o.run > 0) { g.globalAlpha *= o.run; for (let k = 0; k < 3; k++) seg(g, [[x - d * s * (0.55 + k * 0.12), yy + 4 - k * 2], [x - d * s * (0.95 + k * 0.25), yy + 10 - k * 8]], 6 - k, 'rgba(255,255,255,0.85)'); g.globalAlpha /= o.run; }
    if (o.cabin !== false) { box(g, x - d * s * 0.22 - s * 0.14, dk - s * 0.22, s * 0.28, s * 0.23, 8, o.cabin || '#FFFFFF'); box(g, x - d * s * 0.22 - s * 0.09, dk - s * 0.17, s * 0.18, s * 0.08, 4, GLASS); }
    poly(g, [[x - d * s * 0.5, dk], [x + d * s * 0.5, dk - s * 0.04], [x + d * s * 0.36, yy + s * 0.08], [x - d * s * 0.44, yy + s * 0.08]], col);
    g.fillStyle = o.stripe || C.blue; g.beginPath(); g.moveTo(x - d * s * 0.49, dk + s * 0.05); g.lineTo(x + d * s * 0.47, dk + s * 0.01); g.lineTo(x + d * s * 0.45, dk + s * 0.05); g.lineTo(x - d * s * 0.48, dk + s * 0.09); g.closePath(); g.fill();
    if (o.motor) { box(g, x - d * s * 0.5 - s * 0.05, dk - s * 0.1, s * 0.09, s * 0.14, 5, o.motorCol || C.ink); seg(g, [[x - d * s * 0.505, dk + s * 0.03], [x - d * s * 0.5, yy + s * 0.12]], s * 0.025, o.motorCol || C.ink); }
    return { deck: [x, dk] };
  }

  // ----- животные -----
  // собака: pose 'stand'|'run'|'sit'|'sleep'; s - длина тела
  function dog(g, x, y, s, o) {
    o = o || {}; const d = o.dir || 1, col = o.col || '#D9822B', dk = dark(col, 0.25), t = o.t || 0, pose = o.pose || 'stand';
    g.save(); g.translate(x, y); g.scale(d, 1);
    if (pose === 'sleep') {
      const br = 1 + 0.03 * Math.sin(t * 2.2);
      ell(g, s * 0.42, -s * 0.06, s * 0.2, s * 0.06, col); ell(g, 0, -s * 0.18 * br, s * 0.42, s * 0.18 * br, col); ell(g, -s * 0.36, -s * 0.12, s * 0.16, s * 0.07, dk, -0.3);
      disc(g, s * 0.36, -s * 0.15, s * 0.15, col); ell(g, s * 0.5, -s * 0.11, s * 0.08, s * 0.06, col); ell(g, s * 0.3, -s * 0.21, s * 0.07, s * 0.11, dk, 0.5);
      seg(g, [[s * 0.37, -s * 0.15], [s * 0.44, -s * 0.15]], s * 0.02, C.ink); disc(g, s * 0.58, -s * 0.12, s * 0.025, C.ink);
      if (o.collar) seg(g, [[s * 0.22, -s * 0.24], [s * 0.24, -s * 0.06]], s * 0.04, o.collar);
      g.restore(); return;
    }
    const sw = pose === 'run' ? Math.sin(t * 12) * 0.5 : 0, by = pose === 'run' ? -Math.abs(Math.sin(t * 12)) * s * 0.04 : 0;
    if (pose === 'sit') { ell(g, -s * 0.05, -s * 0.3, s * 0.24, s * 0.28, col, -0.5); box(g, s * 0.1, -s * 0.24, s * 0.08, s * 0.24, 4, col); ell(g, -s * 0.2, -s * 0.06, s * 0.18, s * 0.07, dk); }
    else {
      [[-0.28, 1], [-0.18, -1], [0.22, 1], [0.32, -1]].forEach(([lx, k]) => seg(g, [[s * lx, -s * 0.32 + by], [s * lx + Math.sin(sw * k) * s * 0.14, -s * 0.03]], s * 0.08, k > 0 ? dk : col));
      ell(g, 0, -s * 0.38 + by, s * 0.4, s * 0.16, col);
    }
    const hx = pose === 'sit' ? s * 0.12 : s * 0.38, hy = (pose === 'sit' ? -s * 0.62 : -s * 0.55) + by;
    const tw3 = Math.sin(t * (pose === 'run' ? 14 : 8)) * 0.4; if (pose === 'sit') seg(g, [[-s * 0.22, -s * 0.06], [-s * 0.42, -s * 0.04 + tw3 * s * 0.04]], s * 0.07, col); else seg(g, [[-s * 0.36, -s * 0.42 + by], [-s * 0.52, -s * 0.62 + tw3 * s * 0.1 + by]], s * 0.07, col);
    disc(g, hx, hy, s * 0.17, col); ell(g, hx + s * 0.15, hy + s * 0.05, s * 0.1, s * 0.07, col); disc(g, hx + s * 0.25, hy + s * 0.03, s * 0.035, C.ink);
    ell(g, hx - s * 0.06, hy + s * 0.02, s * 0.06, s * 0.13, dk, 0.3); disc(g, hx + s * 0.06, hy - s * 0.04, s * 0.025, C.ink);
    if (o.collar) seg(g, [[hx - s * 0.08, hy + s * 0.16], [hx + s * 0.06, hy + s * 0.18]], s * 0.045, o.collar);
    g.restore();
  }
  function cat(g, x, y, s, o) {
    o = o || {}; const d = o.dir || 1, col = o.col || '#5B6472', t = o.t || 0, pose = o.pose || 'sit';
    g.save(); g.translate(x, y); g.scale(d, 1);
    if (pose === 'sleep') { ell(g, 0, -s * 0.14, s * 0.32, s * 0.14, col); disc(g, s * 0.24, -s * 0.13, s * 0.12, col); poly(g, [[s * 0.18, -s * 0.22], [s * 0.2, -s * 0.33], [s * 0.27, -s * 0.24]], col); seg(g, [[-s * 0.3, -s * 0.06], [s * 0.05, -s * 0.02]], s * 0.06, col); seg(g, [[s * 0.25, -s * 0.13], [s * 0.31, -s * 0.13]], s * 0.02, C.ink); g.restore(); return; }
    const walk = pose === 'walk', sw = walk ? Math.sin(t * 9) * 0.4 : 0;
    if (walk) { [[-0.22, 1], [-0.14, -1], [0.16, 1], [0.24, -1]].forEach(([lx, k]) => seg(g, [[s * lx, -s * 0.25], [s * lx + Math.sin(sw * k) * s * 0.1, -s * 0.02]], s * 0.06, col)); ell(g, 0, -s * 0.3, s * 0.3, s * 0.11, col); }
    else ell(g, 0, -s * 0.24, s * 0.18, s * 0.24, col);
    const hx = walk ? s * 0.32 : s * 0.05, hy = walk ? -s * 0.42 : -s * 0.52;
    seg(g, [[walk ? -s * 0.28 : -s * 0.12, -s * (walk ? 0.32 : 0.05)], [-s * 0.42, -s * (walk ? 0.55 : 0.12) + Math.sin(t * 3) * s * 0.05]], s * 0.05, col);
    disc(g, hx, hy, s * 0.13, col); poly(g, [[hx - s * 0.12, hy - s * 0.05], [hx - s * 0.08, hy - s * 0.22], [hx - s * 0.01, hy - s * 0.1]], col); poly(g, [[hx + s * 0.02, hy - s * 0.1], [hx + s * 0.09, hy - s * 0.22], [hx + s * 0.12, hy - s * 0.04]], col);
    disc(g, hx + s * 0.06, hy - s * 0.01, s * 0.022, LIT); g.restore();
  }
  // птица: fly - в полёте (машет крыльями), иначе сидит; чайка по умолчанию белая
  function bird(g, x, y, s, o) {
    o = o || {}; const col = o.col || '#FFFFFF', d = o.dir || 1, t = o.t || 0;
    if (o.fly !== false) { const f = Math.sin(t * 9 + x * 0.05) * 0.5; seg(g, [[x - s * 0.5, y - s * 0.12 - f * s * 0.3], [x - s * 0.18, y - s * 0.12 * 0 - f * s * 0.1], [x, y + s * 0.04], [x + s * 0.18, y - f * s * 0.1], [x + s * 0.5, y - s * 0.12 - f * s * 0.3]], s * 0.08, col); ell(g, x, y + s * 0.03, s * 0.12, s * 0.06, col); poly(g, [[x + d * s * 0.1, y + s * 0.02], [x + d * s * 0.2, y + s * 0.05], [x + d * s * 0.1, y + s * 0.07]], LIT); return; }
    ell(g, x, y - s * 0.22, s * 0.26, s * 0.16, col); disc(g, x + d * s * 0.22, y - s * 0.36, s * 0.1, col); ell(g, x - d * s * 0.05, y - s * 0.24, s * 0.16, s * 0.08, '#9AA0AE'); poly(g, [[x + d * s * 0.3, y - s * 0.37], [x + d * s * 0.42, y - s * 0.34], [x + d * s * 0.3, y - s * 0.31]], LIT); disc(g, x + d * s * 0.25, y - s * 0.38, s * 0.02, C.ink); seg(g, [[x, y - s * 0.08], [x, y]], s * 0.03, LIT);
  }
  // стая кружит вокруг (cx, cy)
  function flock(g, t, cx, cy, n, o) { o = o || {}; const R = o.r || 220; for (let i = 0; i < n; i++) { const a = t * (0.5 + hsh(i) * 0.3) + i * 2.4, rr2 = R * (0.6 + 0.4 * hsh(i + 4)); bird(g, cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2 * 0.35, (o.s || 60) * (0.8 + 0.4 * hsh(i + 7)), { t: t + i, col: o.col, dir: Math.sin(a) < 0 ? 1 : -1 }); } }

  // ----- улица -----
  function lamp(g, x, y, h, o) {
    o = o || {}; const on = o.on == null ? 0 : o.on, col = o.col || C.ink, lc = o.light || LIT;
    seg(g, [[x, y], [x, y - h]], 8, col); box(g, x - 14, y - 10, 28, 10, 3, col);
    if (on > 0) { g.globalAlpha *= 0.22 * on; disc(g, x, y - h + 8, 70, lc); g.globalAlpha /= 0.22 * on; g.globalAlpha *= 0.35 * on; disc(g, x, y - h + 8, 40, lc); g.globalAlpha /= 0.35 * on; }
    box(g, x - 16, y - h - 8, 32, 34, 8, on > 0.5 ? lc : '#D7DAE3'); box(g, x - 22, y - h - 16, 44, 10, 4, col);
  }
  // гирлянда: on 0..1 - лампочки загораются по очереди
  function garland(g, x0, y0, x1, y1, o) {
    o = o || {}; const n = o.n || 10, on = o.on == null ? 1 : o.on, sag = o.sag == null ? 60 : o.sag, cols = o.cols || [LIT, C.orange, '#E8577A', C.blueL, C.lime];
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + sag * 2, pt = q => [(1 - q) * (1 - q) * x0 + 2 * (1 - q) * q * mx + q * q * x1, (1 - q) * (1 - q) * y0 + 2 * (1 - q) * q * my + q * q * y1];
    g.strokeStyle = o.wire || C.ink; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(mx, my, x1, y1); g.stroke();
    for (let i = 0; i < n; i++) { const p = pt((i + 0.5) / n), lit = on * n > i + 0.5, c = cols[i % cols.length]; if (lit) { g.globalAlpha *= 0.3; disc(g, p[0], p[1] + 14, 22, c); g.globalAlpha /= 0.3; } ell(g, p[0], p[1] + 14, 8, 12, lit ? c : '#8A91A0'); }
  }
  // доска с текстом: lines - строки (только из параметра); kind 'chalk' (школьная доска мелом) | 'white' | 'wood'; n - сколько символов уже написано
  function board(g, x, y, w, h, lines, o) {
    o = o || {}; const k = o.kind || 'chalk', bgc = k === 'chalk' ? '#24433A' : k === 'wood' ? '#C98F5A' : '#FFFFFF', tc = k === 'chalk' ? '#F4F3EE' : C.ink, x0 = x - w / 2, y0 = y - h / 2;
    if (o.legs) { seg(g, [[x0 + w * 0.15, y0 + h * 0.6], [x0 + w * 0.05, y0 + h + (o.legs === true ? 120 : o.legs)]], 10, '#8A5A3C'); seg(g, [[x0 + w * 0.85, y0 + h * 0.6], [x0 + w * 0.95, y0 + h + (o.legs === true ? 120 : o.legs)]], 10, '#8A5A3C'); }
    if (k === 'white') card(g, x0, y0, w, h, 18, bgc, { sa: 0.6 }); else { box(g, x0 - 12, y0 - 12, w + 24, h + 24, 14, '#8A5A3C'); box(g, x0, y0, w, h, 6, bgc); }
    const sz = o.size || Math.min(64, h / (lines.length + 0.8) / 1.25), lh = sz * 1.3, ty = y - (lines.length - 1) * lh / 2; let left = o.n == null ? 1e9 : o.n;
    const fw = k === 'chalk' ? 500 : 600; lines.forEach((s, i) => { if (left <= 0) return; const part = s.slice(0, Math.max(0, left)); left -= s.length; let f = sz; while (f > 18 && tw(s, f, fw) > w - 60) f -= 1; const ax = o.align === 'left' ? x0 + 40 : x - (o.align === 'left' ? 0 : tw(s, f, fw) / 2); txt(g, part, ax, ty + i * lh, f, tc, { w: fw }); });
  }

  // ===== Камера и переходы =====
  // оседание после склейки: 1.035 -> 1 за 0.45 с + медленный наезд
  function cam(g, u, o) {
    o = o || {}; const s = 1 + 0.035 * (1 - eo(u / 0.45)) + (o.push || 0.006) * u, cx = o.cx || 540, cy = o.cy || 900;
    g.translate(cx, cy); g.scale(s, s); g.translate(-cx, -cy);
  }
  // наезд в точку (приём «zoom.»): камера влетает в точку слова, её цвет заливает кадр -> следующая сцена того же цвета
  function zoomInto(g, p, x, y) {
    if (p <= 0) return 1; const q = ei(p), s = Math.exp(Math.log(160) * q);
    g.translate(lerp(x, 540, eo(p)), lerp(y, 960, eo(p))); g.scale(s, s); g.translate(-x, -y); return s;
  }
  function bg(g, th) { g.fillStyle = (typeof th === 'string' ? TH[th] : th).bg; g.fillRect(0, 0, W, H); }

  // ===== Звук =====
  // мягкий удар на каждой склейке (сильная доля), высота чередуется; skip: индексы склеек без звука
  function cutSounds(s, cuts, o) {
    o = o || {}; const pit = [1, 1.12, 0.94, 1.06];
    for (let i = 1; i < cuts.length - 1; i++) { if ((o.skip || []).includes(i)) continue; s.play(cuts[i], o.name || 'wood', o.vol || 0.11, { pitch: pit[i % 4] }); }
  }
  function sfx(s, list) { list.forEach(e => s.play(e[0], e[1], e[2], e[3] ? { pitch: e[3] } : undefined)); }

  return {
    W, H, X0, X1, C, TH, F, cl, lerp, prog, eo, ei, io, spr, life, scene, cycle, countUp, rub, path, mk, rr, tex, shadow, card,
    font, txt, tw, rich, spaced, wrapLines, layout, word, prep, typeWord, caption, badge, glyph, icon, cursor, ring, press,
    btn, tip, chips, field, stars, miniCards, status, windowFrame, dash, player, chat, qa, burst, cam, zoomInto, bg, cutSounds, sfx,
    SKIN, HAIR, SHIRTS, hsh, mix, dark, light, disc, ell, poly, seg, box, ik, pic, sky, sun, moon, starsky, cloud, sea, hill,
    person, crowd, winR, house, tower, shop, school, tree, grass, leaf, leaves, wheel, car, bus, bike, boat, dog, cat, bird, flock, lamp, garland, board
  };
})();
