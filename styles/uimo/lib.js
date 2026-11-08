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
  // синяя подсказка-шаг «1 из 4» с кнопкой «Далее» (приём продуктового тура)
  function tip(g, x, y, w, title, step, u, o) {
    o = o || {}; const p = spr(u, 10); if (p <= 0) return;
    const sz = o.size || 40;
    g.font = font(sz, 600); const lines = wrapLines(title, w - 64, sz, 600), h = 40 + lines.length * sz * 1.3 + 86;
    g.save(); g.globalAlpha *= cl(u / 0.12, 0, 1); g.translate(x, y); g.scale(0.9 + 0.1 * p, 0.9 + 0.1 * p);
    card(g, 0, 0, w, h, 22, o.fill || C.blue, { sa: 0.7 });
    lines.forEach((l, i) => txt(g, l, 32, 32 + sz * 0.62 + i * sz * 1.3, sz, '#FFFFFF', { w: 600 }));
    const by = h - 52;
    txt(g, step, 32, by, 28, 'rgba(255,255,255,0.75)', { w: 500 });
    const bl = o.btn || 'Далее', bw = tw(bl, 28, 600) + 40;
    g.fillStyle = 'rgba(255,255,255,0.22)'; rr(g, w - 32 - bw, by - 26, bw, 52, 12); g.fill();
    txt(g, bl, w - 32 - bw / 2, by + 1, 28, '#FFFFFF', { w: 600, a: 'center' });
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
    g.strokeStyle = C.teal; g.lineWidth = 6; g.beginPath(); g.arc(R.x + 44, R.y + 58, 15, 0, 7); g.stroke();
    txt(g, o.brand || 'Окошко', R.x + 72, R.y + 58, 32, '#FFFFFF', { w: 700, max: sbw - 84 });
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
    icon(g, 'play', R.x + 50, by, 30, '#FFFFFF'); txt(g, o.time || '0:00 / 0:42', R.x + 84, by, 28, '#FFFFFF', { w: 600 });
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
    btn, tip, chips, field, stars, miniCards, status, windowFrame, dash, player, chat, qa, burst, cam, zoomInto, bg, cutSounds, sfx
  };
})();
