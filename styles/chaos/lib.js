// lib.js
const CHAOS = (() => {
  const W = 1080, H = 1920, X0 = 60, X1 = 1020, TAU = Math.PI * 2;
  const SANS = '"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif';
  const SERIF = '"Liberation Serif",Georgia,"DejaVu Serif","Noto Serif","Times New Roman",serif';
  const MONO = '"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace';
  const SX = 0.62; // сжатие плакатного шрифта (узкий гротеск)
  const C = {
    BLACK: '#060606', INK: '#121212', BONE: '#EEE9DD', DIM: '#8E8A84', MUTE: '#4A4744', TRACK: '#1E1E1E',
    CORAL: '#D9714F', CORAL_L: '#E27F5C', CORAL_D: '#B25B42', BLUE: '#7597EB', BAR_BLUE: '#6F86D6',
    PAPER: '#EFEBE0', RED: '#E5483C', CYAN: '#22D3EE', MAG: '#FF2D55',
    CARD: '#111111', CARD_E: '#2A2A2A', DOT_R: '#E5574B', DOT_Y: '#E0B44A', DOT_G: '#5EC25A',
    T_CORAL: '#C9654A', T_BLUE: '#7597EB', T_BONE: '#E9E4D8', T_GREEN: '#A8D08C', T_YEL: '#E0BC6E', T_LILAC: '#C6A0F1', T_PINK: '#F8A7B9'
  };
  // фоны: base (центр), edge (края), fg (главный текст), alt (второй цвет), hud (строка интерфейса), light (светлый фон?)
  const BG = {
    ink:   { base: '#070707', edge: '#020202', fg: 'bone', alt: 'coral', hud: '#8E8A84', track: '#1E1E1E', fill: '#B9604A', dim: '#4A4744', light: false },
    coral: { base: '#D96D4D', edge: '#A3533C', fg: 'ink', alt: 'bone', hud: 'rgba(30,12,8,.55)', track: 'rgba(0,0,0,.16)', fill: '#7A3626', dim: 'rgba(30,12,8,.45)', light: true },
    paper: { base: '#EFEBE0', edge: '#9C978D', fg: 'ink', alt: 'coral', hud: '#7E7A72', track: '#CFCABE', fill: '#C9654A', dim: '#9E998F', light: true },
    blue:  { base: '#7B9EF6', edge: '#4E6796', fg: 'ink', alt: 'bone', hud: 'rgba(10,16,40,.55)', track: 'rgba(0,0,0,.14)', fill: '#24335E', dim: 'rgba(10,16,40,.45)', light: true }
  };
  const TOK = { coral: C.T_CORAL, blue: C.T_BLUE, bone: C.T_BONE, green: C.T_GREEN, yellow: C.T_YEL, lilac: C.T_LILAC, pink: C.T_PINK };

  // ---------- математика ----------
  const cl = x => (x < 0 ? 0 : x > 1 ? 1 : x);
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, p) => a + (b - a) * p;
  const prog = (u, a, d) => cl((u - a) / d);
  const eo = x => { x = cl(x); return 1 - (1 - x) ** 3; };
  const eio = x => { x = cl(x); return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
  const back = x => { x = cl(x); const c = 1.7; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
  const spr = (x, k = 7, w = 16) => (x <= 0 ? 0 : 1 - Math.exp(-k * x) * Math.cos(w * x));
  const rnd = n => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
  const fmt = v => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const pad = (n, l = 2) => String(Math.floor(n)).padStart(l, '0');

  // ---------- сцены ----------
  // CUTS = [0, 2.6, ...] -> { i, u (секунды от начала сцены), D (длина сцены) }
  function scene(t, CUTS, dur = 1e9) {
    let i = 0; while (i < CUTS.length - 1 && t >= CUTS[i + 1]) i++;
    const t1 = i < CUTS.length - 1 ? CUTS[i + 1] : dur;
    return { i, u: t - CUTS[i], D: t1 - CUTS[i], last: i === CUTS.length - 1 };
  }

  // ---------- шрифты ----------
  // kind: cond (плакатный узкий, рисовать со scale(SX,1)), bold (жирный гротеск), serif (курсивная антиква), mono
  function font(kind, size) {
    if (kind === 'cond') return `900 ${size}px ${SANS}`;
    if (kind === 'bold') return `800 ${size}px ${SANS}`;
    if (kind === 'serif') return `italic 400 ${size}px ${SERIF}`;
    if (kind === 'mono') return `400 ${size}px ${MONO}`;
    if (kind === 'monob') return `700 ${size}px ${MONO}`;
    return `400 ${size}px ${SANS}`;
  }
  // цвет текста: 'bone' | 'ink' | 'coral' (градиент) | 'blue' | любой css
  function paint(g, col, w, align = 'center') {
    if (col === 'coral') {
      const x0 = align === 'left' ? 0 : align === 'right' ? -w : -w / 2;
      const gr = g.createLinearGradient(x0, 0, x0 + w, 0);
      gr.addColorStop(0, '#BF6244'); gr.addColorStop(0.45, '#DB7352'); gr.addColorStop(1, '#B05A41');
      return gr;
    }
    return col === 'bone' ? C.BONE : col === 'ink' ? C.INK : col === 'blue' ? C.BLUE : col;
  }
  const colOf = (kind, which) => BG[kind || 'ink'][which];

  // ---------- текстуры ----------
  let TX = null;
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
  function tex() {
    if (TX) return TX;
    TX = { bgc: {}, stamps: {} };
    // фон каждого цвета: виньетка + зерно запекаются один раз в полный размер (+20 px запаса на дрожание зерна)
    const BW = W + 20, BH = H + 20, nz = new OffscreenCanvas(BW, BH), nc = nz.getContext('2d'), id = nc.createImageData(BW, BH), d = id.data, r = rng(77);
    for (let i = 0; i < d.length; i += 4) { const v = r(); d[i] = d[i + 1] = d[i + 2] = v > 0.5 ? 255 : 0; d[i + 3] = Math.floor(Math.abs(v - 0.5) * 2 * 130); }
    nc.putImageData(id, 0, 0);
    for (const k in BG) {
      const cv = new OffscreenCanvas(BW, BH), c = cv.getContext('2d'), b = BG[k];
      const gr = c.createRadialGradient(BW / 2, BH * 0.48, 40, BW / 2, BH / 2, BH * 0.62);
      gr.addColorStop(0, b.base); gr.addColorStop(0.45, b.base); gr.addColorStop(1, b.edge);
      c.fillStyle = gr; c.fillRect(0, 0, BW, BH);
      c.globalAlpha = k === 'ink' ? 0.1 : 0.14; c.drawImage(nz, 0, 0); TX.bgc[k] = cv;
    }
    // стена тире (как стена токенов)
    const dw = new OffscreenCanvas(1080, 1920), c3 = dw.getContext('2d'), r3 = rng(11);
    for (let y = 70; y < 1900; y += 34) {
      let x = 40 + r3() * 20;
      while (x < 1040) {
        const w = 18 + Math.floor(r3() * 5) * 14, hi = r3() > 0.94;
        c3.fillStyle = hi ? '#D9714F' : r3() > 0.5 ? '#3B3936' : '#2A2826';
        if (x + w < 1040) c3.fillRect(x, y, w, 7);
        x += w + 12 + r3() * 8;
      }
    }
    TX.dash = dw;
    TX.half = new OffscreenCanvas(540, 960); TX.hg = TX.half.getContext('2d'); TX.tint = [new OffscreenCanvas(540, 960), new OffscreenCanvas(540, 960)];
    return TX;
  }

  // ---------- фон ----------
  // kind: ink | coral | paper | blue;  o: { code: прозрачность стены кода, codeLines: ['строки', ...] по теме, ghost: 'Б' гигантская тень-буква }
  function bg(g, kind, t, o = {}) {
    const T = tex(); kind = kind || 'ink';
    const f = Math.floor(t * 15); g.drawImage(T.bgc[kind], -10 + (f * 7) % 9 - 4, -10 + (f * 5) % 9 - 4);
    if (o.ghost) {
      const gc = ghostTex(o.ghost);
      g.save(); g.globalAlpha = kind === 'ink' ? 0.016 : 0.03;
      g.drawImage(gc, 540 + Math.sin(t * 0.3) * 30 - 360, 980 + Math.cos(t * 0.23) * 20 - 640, 720, 1280); g.restore();
    }
    if (o.code) {
      g.save(); g.globalAlpha = o.code; const y = -((t * 46) % 700);
      g.drawImage(codeTex(o.codeLines), 0, y + 320); g.restore();
    }
  }
  // стена кода: строки из параметра lines (по теме ролика); без lines только номера строк и полоски
  function codeTex(lines) {
    const T = tex(), key = 'code|' + (lines ? lines.join('\n') : ''); if (T.stamps[key]) return T.stamps[key];
    const cc = new OffscreenCanvas(1080, 1400), c2 = cc.getContext('2d'), r2 = rng(5);
    c2.font = font('mono', 22); c2.textBaseline = 'middle';
    for (let i = 0; i < 40; i++) {
      const x = 150 + Math.floor(r2() * 3) * 22, k = Math.floor(r2() * 1000);
      c2.fillStyle = '#3A3836'; c2.fillText(pad(200 + i * 3, 4), 70, 20 + i * 35);
      c2.fillStyle = '#4A4744';
      if (lines && lines.length) c2.fillText(lines[k % lines.length], x, 20 + i * 35);
      else { let xx = x; for (let j = 0; j < 1 + k % 4; j++) { const w = 40 + Math.floor(r2() * 6) * 30; c2.fillRect(xx, 20 + i * 35 - 4, w, 8); xx += w + 22; } }
    }
    return (T.stamps[key] = cc);
  }
  // гигантская тень-буква: заранее в текстуру 360x640 (мягкая за счёт растяжения)
  function ghostTex(ch) {
    const T = tex(), key = 'gh' + ch; if (T.stamps[key]) return T.stamps[key];
    const cv = new OffscreenCanvas(180, 320), c = cv.getContext('2d');
    c.fillStyle = '#FFFFFF'; c.font = font('cond', 380); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.translate(90, 175); c.scale(SX, 1); c.fillText(ch, 0, 0);
    return (T.stamps[key] = cv);
  }
  // стена тире на весь кадр (фон-перебивка как «стена токенов»)
  function dashWall(g, t, a = 1) {
    const T = tex(), y0 = 330, y1 = 1600; g.save(); g.globalAlpha = a; g.drawImage(T.dash, 0, 330 + ((t * 30) % 34), W, y1 - y0, 0, y0, W, y1 - y0); g.restore();
  }

  // ---------- строка интерфейса ----------
  // o: { kind, title, live, p (0..1), left, right, dot: false без точки }. Все тексты по теме ролика; необязательна.
  function hud(g, t, o = {}) {
    const b = BG[o.kind || 'ink'];
    g.save(); g.font = font('mono', 28); g.textBaseline = 'middle'; g.fillStyle = b.hud;
    g.textAlign = 'left'; g.fillText(o.title || '', 64, 196);
    g.textAlign = 'right'; g.fillText(o.live || '', 988, 196);
    if (o.dot !== false) { g.globalAlpha = 0.7 + 0.3 * Math.sin(t * 5); g.fillStyle = o.kind === 'coral' ? '#6E2C1E' : C.CORAL; g.beginPath(); g.arc(1016, 196, 10, 0, TAU); g.fill(); g.globalAlpha = 1; }
    g.fillStyle = b.track; g.fillRect(64, 238, 952, 3);
    g.fillStyle = b.fill; g.fillRect(64, 237, Math.max(18, 952 * cl(o.p || 0)), 5);
    g.font = font('mono', 25); g.fillStyle = b.hud;
    g.textAlign = 'left'; g.fillText(o.left || '', 64, 272);
    g.textAlign = 'right'; g.fillText(o.right || '', 1016, 272);
    g.restore();
  }
  // маленький счётчик внизу по центру «07/16»
  function counter(g, text, kind = 'ink', y = 1640) {
    g.save(); g.font = font('mono', 26); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = BG[kind].dim; g.fillText(text, 540, y); g.restore();
  }

  // ---------- камера ----------
  // после склейки кадр оседает с 1.04 до 1, дальше медленный наезд
  function cam(g, u, o = {}) {
    const s = 1 + 0.04 * (1 - eo(u / 0.32)) + (o.push != null ? o.push : 0.006) * u;
    const cx = o.cx || 540, cy = o.cy || 960;
    g.translate(cx, cy); g.scale(s, s); g.translate(-cx, -cy);
  }

  // ---------- глитч ----------
  // спрайт строки: текст рисуется один раз в OffscreenCanvas (кэш до 24 строк), дальше только drawImage
  const SPR = new Map(); let SPX = 0; const SPX_MAX = 9e6; // кэш до ~9 млн пикселей (~36 МБ)
  function sprite(s, fnt, sx, col, size) {
    const key = s + '|' + fnt + '|' + sx + '|' + col;
    let e = SPR.get(key); if (e) { SPR.delete(key); SPR.set(key, e); return e; }
    const m = new OffscreenCanvas(8, 8).getContext('2d'); m.font = fnt;
    const tw0 = m.measureText(s).width, tw = tw0 * sx, pad = Math.ceil(size * 0.08) + 6;
    const w = Math.ceil(tw) + pad * 2, h = Math.ceil(size * 1.3), oy = Math.ceil(size * 1.0);
    const cv = new OffscreenCanvas(w, h), c = cv.getContext('2d');
    c.font = fnt; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    c.translate(pad, oy); c.scale(sx, 1); c.fillStyle = paint(c, col, tw0, 'left'); c.fillText(s, 0, 0);
    e = { cv, w, h, ox: pad, oy, tw }; SPR.set(key, e); SPX += w * h;
    while (SPX > SPX_MAX && SPR.size > 1) { const k0 = SPR.keys().next().value, e0 = SPR.get(k0); SPX -= e0.w * e0.h; SPR.delete(k0); }
    return e;
  }
  // текст с RGB-расслоением и разломом на полосы. a = 0..1 сила глитча. Возвращает ширину.
  // o: { font, sx, col, glitch, light, size, seed, align }
  function gtext(g, s, x, y, o) {
    const sx = o.sx || 1, align = o.align || 'center', light = !!o.light, a = o.glitch || 0, size = o.size || 100;
    const e = sprite(s, o.font, sx, o.col || 'bone', size);
    const x0 = (align === 'center' ? x - e.tw / 2 : align === 'right' ? x - e.tw : x) - e.ox, y0 = y - e.oy;
    if (a > 0.02) {
      const d = 6 + a * 26;
      g.save(); g.globalAlpha *= 0.9; g.globalCompositeOperation = light ? 'multiply' : 'screen';
      g.drawImage(sprite(s, o.font, sx, light ? '#2BB8D6' : C.CYAN, size).cv, x0 - d, y0);
      g.drawImage(sprite(s, o.font, sx, light ? '#E2334F' : C.MAG, size).cv, x0 + d * 0.8, y0);
      g.restore();
      if (a > 0.3) {
        const n = 6, bh = Math.ceil(e.h / n), sd = (o.seed || 1) * 37 + Math.floor(a * 7);
        for (let i = 0; i < n; i++) {
          const off = (rnd(sd + i * 3.1) - 0.5) * a * 140, hh = Math.min(bh, e.h - i * bh);
          if (hh > 0) g.drawImage(e.cv, 0, i * bh, e.w, hh, x0 + off, y0 + i * bh, e.w, hh);
        }
        return e.tw;
      }
    }
    g.drawImage(e.cv, x0, y0);
    return e.tw;
  }
  // всплеск глитча посреди сцены: возвращает силу 0..1 в редкие моменты
  function jitter(t, seed = 1, rate = 0.06) { const f = Math.floor(t * 12); return rnd(f * 7.3 + seed) < rate ? 0.35 + rnd(f + seed * 3) * 0.5 : 0; }

  // глитч всего кадра на склейке: сдвиг полос + цветные двойники. Вызывать после рисования сцены, до hud.
  function cut(g, u, seed = 1, kind = 'ink', dur = 0.2) {
    if (u < 0 || u > dur || !g.canvas) return;
    const a = 1 - u / dur, T = tex(), light = BG[kind].light, f = Math.floor(u * 30), cv = g.canvas;
    T.hg.clearRect(0, 0, 540, 960); T.hg.drawImage(cv, 0, 0, 540, 960);
    ['#00FFFF', '#FF0000'].forEach((tint, j) => {
      const c = T.tint[j].getContext('2d');
      c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, 540, 960); c.drawImage(T.half, 0, 0);
      c.globalCompositeOperation = light ? 'screen' : 'multiply'; c.fillStyle = tint; c.fillRect(0, 0, 540, 960);
    });
    // цветные двойники в 4 широких полосах
    g.save(); g.globalCompositeOperation = light ? 'multiply' : 'screen'; g.globalAlpha = 0.7 * a;
    for (let i = 0; i < 4; i++) {
      const y0 = Math.floor(rnd(seed * 17 + i * 3 + f) * 1500) + 200, h = 120 + Math.floor(rnd(seed + i + f * 7) * 260);
      const dx = (14 + 34 * a) * (rnd(i + f) > 0.5 ? 1 : -1);
      g.drawImage(T.tint[0], 0, y0 / 2, 540, h / 2, -dx, y0, W, h);
      g.drawImage(T.tint[1], 0, y0 / 2, 540, h / 2, dx, y0, W, h);
    }
    g.restore();
    // сдвиг полос из того же снимка (полуразмер, растянут: полосы чуть мягче, как в видео-глитче)
    for (let i = 0; i < 7; i++) {
      const y0 = Math.floor(rnd(seed * 13 + f * 5 + i) * 940) * 2, h = Math.min(H - y0, 16 + Math.floor(rnd(seed + i * 7 + f) * 80) * 2), dx = (rnd(seed * 3 + i + f * 11) - 0.5) * 220 * a;
      if (h > 2) g.drawImage(T.half, 0, y0 / 2, 540, h / 2, dx, y0, W, h);
    }
  }

  // ---------- типографика ----------
  // раскладка слов по строкам в пределах maxW (учитывая сжатие sx). *слово* = ключевое
  function wlay(g, text, maxW, sx = 1) {
    let open = false;
    const ws = text.split(/\s+/).filter(Boolean).map(s => { const st = s.startsWith('*'), en = /\*[,.!?:»)]*$/.test(s); const key = open || st; if (st && !en) open = true; if (en) open = false; return { s: s.replace(/\*/g, ''), key }; });
    const sp = g.measureText(' ').width * sx, lines = []; let cur = [], cw = 0;
    ws.forEach(w => { w.w = g.measureText(w.s).width * sx; if (cur.length && cw + sp + w.w > maxW) { lines.push({ ws: cur, w: cw }); cur = []; cw = 0; } cw += (cur.length ? sp : 0) + w.w; cur.push(w); });
    if (cur.length) lines.push({ ws: cur, w: cw });
    return { lines, sp };
  }
  // слова по одному (подъём 14 px + проявление 0,2 с). o: {kind:'serif'|'bold'|'mono', size, col, key, u, at, step, align, x, maxW, lh, maxLines}
  function words(g, text, x, y, o) {
    let size = o.size || 60; const kind = o.kind || 'serif', maxW = o.maxW || 960, maxL = o.maxLines || 2;
    let L;
    for (let k = 0; k < 14; k++) { g.font = font(kind, size); L = wlay(g, text, maxW); if (L.lines.length <= maxL && L.lines.every(l => l.w <= maxW)) break; size = Math.floor(size * 0.93); }
    const lh = size * (o.lh || 1.18), align = o.align || 'center', step = o.step != null ? o.step : 0.11;
    g.save(); g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    let j = 0;
    L.lines.forEach((ln, li) => {
      let cx = align === 'center' ? x - ln.w / 2 : align === 'right' ? x - ln.w : x;
      const yy = y + li * lh;
      ln.ws.forEach(w => {
        const a = eo(((o.u || 0) - (o.at || 0) - j * step) / 0.22); j++;
        if (a > 0) {
          g.globalAlpha = a; g.fillStyle = paint(g, w.key ? (o.key || 'coral') : (o.col || 'bone'), w.w, 'left');
          g.save(); g.translate(cx, yy + (1 - a) * 14); g.fillText(w.s, 0, 0); g.restore();
        }
        cx += w.w + L.sp;
      });
    });
    g.restore();
    return { bottom: y + (L.lines.length - 1) * lh, size, end: (o.at || 0) + j * step + 0.22 };
  }
  // плакат: огромные узкие заглавные строки стопкой, каждая подгоняется под ширину.
  // lines: [{ s:'Я ТВОЙ', c:'bone'|'coral'|'ink'|'blue', at:0.3, size? }], o: { y (центр), size (макс.), kind, gap (0.84), maxW, seed }
  function poster(g, u, lines, o = {}) {
    const maxW = o.maxW || 960, kind = o.kind || 'ink', gap = o.gap || 0.84, light = BG[kind].light;
    const L = lines.map(l => {
      let sz = l.size || o.size || 330; g.font = font('cond', sz);
      const w = g.measureText(l.s).width * SX; if (w > maxW) sz = Math.floor(sz * maxW / w);
      return Object.assign({ sz }, l);
    });
    const tot = L.reduce((a, l) => a + l.sz * gap, 0);
    let y = (o.y || 960) - tot / 2;
    L.forEach((l, i) => {
      y += l.sz * gap; const p = u - (l.at || 0);
      if (p < 0) return;
      const a = cl(p / 0.1), sc = 1 + 0.07 * (1 - eo(p / 0.3)), gl = Math.max(1 - cl(p / 0.2), o.jit ? jitter(u, i + (o.seed || 0)) : 0);
      g.save(); g.globalAlpha *= a; const by = y - l.sz * 0.02;
      g.translate(540, by - l.sz * 0.36); g.scale(sc, sc); g.translate(-540, -(by - l.sz * 0.36));
      gtext(g, l.s, o.x || 540, by, { font: font('cond', l.sz), sx: SX, col: l.c || BG[kind].fg, glitch: gl, light, size: l.sz, seed: i + (o.seed || 0) * 5, align: 'center' });
      g.restore();
    });
    return { top: (o.y || 960) - tot / 2, bottom: y };
  }
  // строка моно с печатью по буквам и блочным курсором. o: {u, at, cps, col, size, align, cursor, key:[подстрока, цвет]}
  function type(g, text, x, y, o = {}) {
    const size = o.size || 34, cps = o.cps || 28, n = Math.floor(((o.u || 0) - (o.at || 0)) * cps);
    if (n < 0) return 0;
    const s = text.slice(0, Math.min(n, text.length)), done = n >= text.length;
    g.save(); g.font = font(o.bold ? 'monob' : 'mono', size); g.textBaseline = 'middle'; g.textAlign = 'left';
    const fw = g.measureText(text).width, x0 = o.align === 'center' ? x - fw / 2 : o.align === 'right' ? x - fw : x;
    g.fillStyle = o.col || C.DIM; g.fillText(s, x0, y);
    const cw = g.measureText(s).width;
    if (!done || o.cursor) { if (!done || Math.floor((o.u || 0) * 2.4) % 2 === 0) { g.fillStyle = o.cc || C.CORAL; g.fillRect(x0 + cw + 4, y - size * 0.55, size * 0.5, size * 1.08); } }
    g.restore();
    return fw;
  }
  // огромное число-плакат «7.»
  function bigNum(g, u, s, o = {}) { return poster(g, u, [{ s, c: o.c || 'coral', at: o.at || 0, size: o.size || 640 }], { y: o.y || 900, kind: o.kind, seed: 9 }); }

  // ---------- элементы ----------
  // цветные плашки-токены моно со словами и числами под ними
  // items: [{ s:'ещё', c:'coral'|'blue'|'bone'|'green'|'yellow'|'lilac'|'pink', n:'31' }], o: { y, u, at, step, size }
  function tokens(g, items, o = {}) {
    const size = o.size || 62, h = size * 1.9, gap = 18, rowH = h + 92;
    g.save(); g.font = font('mono', size);
    const pos = []; let x = 58, y = o.y || 680;
    items.forEach((it, i) => {
      const label = (i ? '·' : '') + it.s, w = g.measureText(label).width + size * 0.7;
      if (x + w > 1022 && x > 58) { x = 58; y += rowH; }
      pos.push({ x, y, w, label, it }); x += w + gap;
    });
    pos.forEach((p, i) => {
      const k = (o.u || 0) - (o.at || 0) - i * (o.step || 0.14); if (k < 0) return;
      const s = 0.6 + 0.4 * spr(k / 0.9), a = cl(k / 0.08);
      g.save(); g.globalAlpha = a; g.translate(p.x + p.w / 2, p.y + h / 2); g.scale(s, s);
      g.fillStyle = TOK[p.it.c] || p.it.c; rr(g, -p.w / 2, -h / 2, p.w, h, 14); g.fill();
      g.fillStyle = C.INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p.label, 0, 2);
      g.restore();
      if (p.it.n != null) { g.globalAlpha = cl((k - 0.15) / 0.2); g.font = font('mono', 30); g.fillStyle = '#6E6A64'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p.it.n, p.x + p.w / 2, p.y + h + 34); g.font = font('mono', size); g.globalAlpha = 1; }
    });
    g.restore();
    return y + rowH;
  }
  // рейтинг-столбики: rows [{ s, p (0..100), c:'coral'|'blue' }], o: { y, u, at, step, x, w }
  function bars(g, rows, o = {}) {
    const x = o.x || 64, w = o.w || 952, pmax = Math.max(...rows.map(r => r.p)), pitch = o.pitch || 118;
    g.save(); g.textBaseline = 'middle';
    rows.forEach((r, i) => {
      const k = (o.u || 0) - (o.at || 0) - i * (o.step || 0.16); if (k < 0) return;
      const y = (o.y || 640) + i * pitch, a = cl(k / 0.12);
      g.globalAlpha = a; g.font = font('mono', 40); g.textAlign = 'left'; g.fillStyle = C.BONE; g.fillText(r.s, x, y);
      g.font = font('mono', 30); g.textAlign = 'right'; g.fillStyle = C.DIM; g.fillText(Math.round(r.p * eo(k / 0.6)) + '%', x + w, y);
      g.fillStyle = r.c === 'coral' ? '#C9654A' : C.BAR_BLUE; g.fillRect(x, y + 34, Math.max(26, w * 0.96 * (r.p / pmax)) * eo(k / 0.6), 12);
    });
    g.restore();
    return (o.y || 640) + rows.length * pitch;
  }
  // штамп: красная рамка и узкие заглавные, удар с перелётом. Кэшируется.
  function stampTex(text, col) {
    const T = tex(), key = text + col; if (T.stamps[key]) return T.stamps[key];
    const sz = 74, mc = new OffscreenCanvas(10, 10).getContext('2d'); mc.font = font('cond', sz);
    const w = Math.ceil(mc.measureText(text).width * SX) + 56, h = Math.ceil(sz * 1.05);
    const cv = new OffscreenCanvas(w + 12, h + 12), c = cv.getContext('2d');
    c.translate(6, 6); c.strokeStyle = col; c.lineWidth = 6; rr(c, 3, 3, w - 6, h - 6, 10); c.stroke();
    c.fillStyle = col; c.font = font('cond', sz); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.save(); c.translate(w / 2, h / 2 + 4); c.scale(SX, 1); c.fillText(text, 0, 0); c.restore();
    c.globalCompositeOperation = 'destination-out'; const r = rng(text.length * 97 + 3);
    for (let i = 0; i < 260; i++) { c.globalAlpha = 0.3 + r() * 0.7; c.fillRect(r() * w, r() * h, 1 + r() * 4, 1 + r() * 3); }
    return (T.stamps[key] = cv);
  }
  function stamp(g, x, y, text, u, at = 0, rot = -0.08, col = C.RED, sc = 1) {
    const k = u - at; if (k < 0) return;
    const cv = stampTex(text, col), s = sc * (1 + 0.9 * (1 - eo(k / 0.13)) - 0.06 * Math.sin(cl(k / 0.35) * Math.PI));
    g.save(); g.globalAlpha = cl(k / 0.06); g.translate(x + (k < 0.2 ? (rnd(Math.floor(k * 60)) - 0.5) * 10 : 0), y); g.rotate(rot); g.scale(s, s);
    g.drawImage(cv, -cv.width / 2, -cv.height / 2); g.restore();
  }
  // ползунок «громкость»: v 0..1
  function slider(g, x, y, w, label, v, u = 9, at = 0) {
    const a = cl((u - at) / 0.2); if (a <= 0) return;
    g.save(); g.globalAlpha = a; g.font = font('mono', 28); g.textBaseline = 'middle'; g.fillStyle = '#5E5A55';
    g.textAlign = 'left'; g.fillText(label, x, y); const lx = x + g.measureText(label).width + 40, rx = x + w - 90;
    g.fillStyle = '#2A2826'; g.fillRect(lx, y - 1.5, rx - lx, 3);
    g.fillStyle = '#7A3E2F'; g.fillRect(lx, y - 1.5, (rx - lx) * v, 3);
    g.fillStyle = C.CORAL; g.beginPath(); g.arc(lx + (rx - lx) * v, y, 14, 0, TAU); g.fill();
    g.fillStyle = '#7E7A72'; g.textAlign = 'right'; g.fillText(v.toFixed(1).replace('.', ','), x + w, y);
    g.restore();
  }
  // окно-файл с печатью строк «ключ: значение». lines: [['имя','соня'], ...]
  function win(g, x, y, w, h, title, lines, o = {}) {
    const k = (o.u || 0) - (o.at || 0); if (k < 0) return;
    const s = 0.92 + 0.08 * spr(k / 0.8), a = cl(k / 0.1);
    g.save(); g.globalAlpha = a; g.translate(x + w / 2, y + h / 2); g.scale(s, s); g.translate(-(x + w / 2), -(y + h / 2));
    g.fillStyle = C.CARD; rr(g, x, y, w, h, 18); g.fill(); g.strokeStyle = C.CARD_E; g.lineWidth = 3; g.stroke();
    [C.DOT_R, C.DOT_Y, C.DOT_G].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(x + 40 + i * 32, y + 44, 10, 0, TAU); g.fill(); });
    g.font = font('mono', 28); g.fillStyle = '#7E7A72'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(title, x + w / 2, y + 44);
    g.fillStyle = C.CARD_E; g.fillRect(x, y + 88, w, 2);
    let tt = (o.at || 0) + 0.3; const cps = o.cps || 22;
    lines.forEach((ln, i) => {
      const ly = y + 160 + i * 74, kk = ln[0] + ': ', full = kk + ln[1];
      const n = Math.floor(((o.u || 0) - tt) * cps); tt += full.length / cps + 0.12;
      if (n < 0) return;
      g.font = font('mono', 40); g.textAlign = 'left';
      const s1 = full.slice(0, Math.min(n, full.length));
      g.fillStyle = '#6E6A64'; g.fillText(s1.slice(0, kk.length), x + 40, ly);
      const kw = g.measureText(kk).width; g.fillStyle = ln[2] || C.BONE; g.fillText(s1.slice(kk.length), x + 40 + kw, ly);
      const last = i === lines.length - 1 || ((o.u || 0) - tt) * cps < 0;
      if (last && (n < full.length || Math.floor((o.u || 0) * 2.4) % 2 === 0)) { g.fillStyle = C.CORAL; g.fillRect(x + 44 + g.measureText(s1).width, ly - 24, 22, 46); }
    });
    g.restore();
  }
  // карточка-уведомление (сетка карточек чата). o: { a (0..1), dead: перечёркнута, app: подпись сверху }
  function note(g, x, y, w, h, label, sub, o = {}) {
    const a = o.a == null ? 1 : o.a; if (a <= 0) return;
    const s = 0.85 + 0.15 * a;
    g.save(); g.globalAlpha = cl(a * 1.5); g.translate(x + w / 2, y + h / 2); g.scale(s, s); g.translate(-(x + w / 2), -(y + h / 2));
    g.fillStyle = C.CARD; rr(g, x, y, w, h, 16); g.fill(); g.strokeStyle = C.CARD_E; g.lineWidth = 2; g.stroke();
    g.fillStyle = o.dead ? '#4A4744' : C.CORAL; g.beginPath(); g.arc(x + w - 30, y + 30, 9, 0, TAU); g.fill();
    g.font = font('mono', 22); g.fillStyle = '#5E5A55'; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(o.app || '', x + 26, y + 32);
    g.font = font('monob', 52); g.fillStyle = o.dead ? '#5E5A55' : C.BONE; g.fillText(label, x + 26, y + 96);
    g.font = font('mono', 28); g.fillStyle = o.dead ? '#4A4744' : C.DIM; g.fillText(sub, x + 26, y + 150);
    g.fillStyle = '#262422'; g.fillRect(x + 26, y + h - 52, w * 0.62, 8); g.fillRect(x + 26, y + h - 32, w * 0.4, 8);
    if (o.dead) { const p = eo(o.strike == null ? 1 : o.strike); g.fillStyle = C.CORAL; g.fillRect(x + 20, y + 94, (w * 0.62) * p, 6); }
    g.restore();
  }
  // календарь-лист: коралловая шапка с месяцем, кольца, огромное число
  function calendar(g, cx, cy, mon, num, o = {}) {
    const k = (o.u || 0) - (o.at || 0); if (k < 0) return;
    const s = (o.s || 1) * (0.7 + 0.3 * spr(k / 0.8)), w = 600, h = 470, gl = 1 - cl(k / 0.18);
    g.save(); g.globalAlpha = cl(k / 0.08); g.translate(cx + gl * (rnd(Math.floor(k * 30)) - 0.5) * 60, cy); g.scale(s, s);
    g.fillStyle = '#E9E4D8'; rr(g, -w / 2, -h / 2, w, h, 24); g.fill();
    g.save(); rr(g, -w / 2, -h / 2, w, h, 24); g.clip(); g.fillStyle = '#D9714F'; g.fillRect(-w / 2, -h / 2, w, 140); g.restore();
    g.fillStyle = C.INK; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(-w / 2 + 70 + i * 92, -h / 2 + 140, 7, 0, TAU); g.fill(); }
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.save(); g.font = font('cond', 96); g.translate(0, -h / 2 + 108); g.scale(SX, 1); g.fillStyle = C.INK; g.fillText(mon, 0, 0); g.restore();
    g.save(); g.font = font('cond', 290); g.translate(0, h / 2 - 50); g.scale(SX, 1); g.fillStyle = C.INK; g.fillText(num, 0, 0); g.restore();
    g.restore();
  }
  // звуковая волна из вертикальных коралловых штрихов
  function wave(g, cx, cy, w, h, t, o = {}) {
    const k = (o.u || 0) - (o.at || 0); if (k < 0) return;
    const n = 150, grow = eo(k / 0.5), amp = o.amp || 1;
    g.save(); g.fillStyle = o.col || C.CORAL;
    for (let i = 0; i < n; i++) {
      const p = i / (n - 1); if (p > grow) break;
      const env = Math.pow(Math.sin(Math.PI * p), 0.5);
      const v = 0.12 + 0.88 * Math.abs(Math.sin(i * 0.47 + t * 11) * Math.sin(i * 0.13 - t * 3.7) + 0.3 * Math.sin(i * 1.7 + t * 23));
      const hh = h * env * Math.min(1, v) * amp;
      g.fillRect(cx - w / 2 + p * w - 1.5, cy - hh / 2, 3, hh);
    }
    g.restore();
  }
  // буквенный шторм: огромные буквы ch в случайных местах, дрожат каждые 2 кадра. Фон меняй через stormBg(u)
  function storm(g, u, ch, o = {}) {
    const f = Math.floor(u * 15), kind = o.kind || 'paper', n = o.n || 8;
    for (let i = 0; i < n; i++) {
      const a = u - i * 0.06; if (a < 0) continue;
      const r1 = rnd(i * 13.1 + f * 0.0 + 1), r2 = rnd(i * 7.7 + 3), jx = (rnd(f * 3 + i) - 0.5) * 30;
      const sz = 240 + r2 * 340, x = 200 + (i % 3) * 340 + (r1 - 0.5) * 220 + jx, y = 560 + Math.floor(i / 3) * 400 + rnd(i * 5.3 + 9) * 260;
      g.save(); g.font = font('cond', sz);
      const w = g.measureText(ch).width * SX; const xx = clamp(x, 110 + w / 2, 970 - w / 2);
      gtext(g, ch, xx, y, { font: font('cond', sz), sx: SX, col: 'ink', glitch: i % 3 === f % 3 ? 0.4 + 0.5 * rnd(f + i * 11) : 0.12 * rnd(f + i), light: true, size: sz, seed: i + f });
      g.restore();
    }
    if (o.row) {
      const n2 = Math.floor(cl(u / 0.8) * o.row.length), dx = (rnd(f * 5) - 0.5) * 16;
      g.save(); g.font = font('monob', 64); g.textAlign = 'center'; g.textBaseline = 'middle';
      const s2 = o.row.slice(0, n2);
      g.fillStyle = '#2BB8D6'; g.globalAlpha = 0.8; g.fillText(s2, 540 - 8 + dx, 1050);
      g.fillStyle = '#E2334F'; g.fillText(s2, 540 + 6 + dx, 1050);
      g.globalAlpha = 1; g.fillStyle = C.INK; g.fillText(s2, 540 + dx, 1050); g.restore();
    }
  }
  const STORM = ['coral', 'blue', 'paper', 'blue', 'coral', 'paper'];
  const stormBg = u => STORM[Math.floor(u * 8) % STORM.length];

  // ---------- типовые объекты: плоские плакатные силуэты ----------
  // Острые плоские фигуры палитры, без контуров и лиц. x, y: точка на земле (низ, центр); s: масштаб; lt: время для анимации; dir: -1 смотрит влево.
  // Цвет любой детали: имя из PAL ('pink', 'orange', 'ginger', 'blue'...) или css-цвет.
  const PAL = { bone: '#EEE9DD', ink: '#121212', black: '#060606', coral: '#D9714F', orange: '#EE8434', ginger: '#D8742E', red: '#E5483C', pink: '#F59BB2',
    yellow: '#E8C056', gold: '#E0A93A', blue: '#7597EB', navy: '#33508F', sky: '#9DB8F2', cyan: '#5FC8DE', green: '#A8D08C', dgreen: '#5E8F4E', olive: '#7E8F4A',
    lilac: '#C6A0F1', brown: '#8A5A3C', dbrown: '#5A3A28', grey: '#8E8A84', dgrey: '#3A3836', paper: '#EFEBE0', white: '#F6F3EC', sand: '#D8C49A', sea: '#3D5FA8' };
  const SKIN = ['#E8B999', '#C98E6B', '#8E5B3E', '#F1D0B6'];
  let TINT = null; // во время глитча-появления все детали красятся в цвет двойника
  const K = c => TINT || (c == null ? '#EEE9DD' : PAL[c] || c);
  function hex3(c) { c = PAL[c] || c; if (typeof c !== 'string' || c[0] !== '#' || c.length < 7) return null; return [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); }
  function mix(a, b, p) { if (TINT) return TINT; const A = hex3(a), B = hex3(b); if (!A || !B) return K(a); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], p)).toString(16).padStart(2, '0')).join(''); }
  const DR = Math.PI / 180, ang = (x, y, a, l) => [x + Math.sin(a * DR) * l, y + Math.cos(a * DR) * l];
  function ik(ax, ay, bx, by, l1, l2, bend) { const dx = bx - ax, dy = by - ay, d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01), a = Math.atan2(dy, dx), c = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1), b = a + bend * Math.acos(c); return [ax + Math.cos(b) * l1, ay + Math.sin(b) * l1]; }
  function seg(g, pts, w, col, cap = 'butt') { g.strokeStyle = K(col); g.lineWidth = w; g.lineCap = cap; g.lineJoin = 'round'; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); }
  function disc(g, x, y, r, col) { g.fillStyle = K(col); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  function poly(g, pts, col) { g.fillStyle = K(col); g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fill(); }
  function box(g, x, y, w, h, col) { g.fillStyle = K(col); g.fillRect(x, y, w, h); }
  // узкая надпись (вывески, номера): текст только из параметров
  function label(g, s, x, y, w, size, col) { if (!s) return; g.save(); g.font = font('cond', size); const tw = g.measureText(s).width * SX, k = Math.min(1, w / tw); g.translate(x, y); g.scale(SX * k, k); g.fillStyle = K(col); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, 0, size * 0.04); g.restore(); }

  // Появление объекта как у слов: вспышка RGB-двойников и разлом на полосы (0,2 с), масштаб 1,07 -> 1.
  // fig(g, u, at, g => { ...рисование... }, { x, y: центр масштаба, light: светлый фон, dur })
  function fig(g, u, at, fn, o = {}) {
    const k = u - (at || 0); if (k < 0) return;
    const cx = o.x != null ? o.x : 540, cy = o.y != null ? o.y : 960, sc = 1 + 0.07 * (1 - eo(k / 0.3)), gl = 1 - cl(k / (o.dur || 0.2));
    g.save(); g.globalAlpha *= cl(k / 0.07); g.translate(cx, cy); g.scale(sc, sc); g.translate(-cx, -cy);
    if (gl > 0.02) {
      const d = 6 + gl * 26, light = !!o.light;
      g.save(); g.globalCompositeOperation = light ? 'multiply' : 'screen'; g.globalAlpha *= 0.85;
      TINT = light ? '#2BB8D6' : C.CYAN; g.translate(-d, 0); fn(g); g.translate(d * 1.8, 0); TINT = light ? '#E2334F' : C.MAG; fn(g); TINT = null; g.restore();
      if (gl > 0.3) { const sd = Math.floor(k * 30) + (o.seed || 1) * 7;
        for (let i = 0; i < 5; i++) { g.save(); g.beginPath(); g.rect(-200, i * H / 5, W + 400, H / 5 + 1); g.clip(); g.translate((rnd(sd + i * 3.1) - 0.5) * gl * 120, 0); fn(g); g.restore(); }
      } else fn(g);
    } else fn(g);
    g.restore();
  }

  // ЛЮДИ. person(g, x, y, s, o) -> { top, hand }. Взрослый ≈ 290 px при s=1, ребёнок ≈ 190.
  // o: age adult|kid|old, pose stand|walk|run|wave|cheer|hold|sit|read|dance|ride, top, legs, skin (цвет или 0..3), hair, hairStyle short|long|bun|none,
  //    hat helmet|cap, hatCol, skirt (цвет|true), pack (цвет рюкзака), mouth 0..1, item book|bag|box|flower|fish|sign|fn(g,x,y), itemCol, text, ph (фаза), dir, ride {hip, feet, hand}
  const BODY = { adult: { leg: 124, torso: 108, head: 27, sh: 30, lw: 24, aw: 17 }, kid: { leg: 74, torso: 72, head: 25, sh: 21, lw: 18, aw: 13 }, old: { leg: 116, torso: 100, head: 26, sh: 29, lw: 23, aw: 16, stoop: 9 } };
  function person(g, x, y, s = 1, o = {}) {
    const age = o.age || 'adult', B = BODY[age] || BODY.adult, pose = o.pose || 'stand', ph = o.ph != null ? o.ph : 0, dir = o.dir || 1;
    const skin = typeof o.skin === 'number' ? SKIN[o.skin % 4] : o.skin || SKIN[0], top = o.top || 'coral', legC = o.legs || 'dgrey', hair = o.hair || (age === 'old' ? '#D9D4CC' : 'dbrown');
    const side = /walk|run|sit|read|ride/.test(pose), th = B.leg / 2, ar = B.torso * 0.46;
    const w = Math.sin(ph * TAU * (pose === 'run' ? 1.6 : 1)), uu = Math.cos(ph * TAU * (pose === 'run' ? 1.6 : 1));
    let lean = B.stoop || 0, bob = 0, hipY = -B.leg, LG = [[-4, 0], [4, 0]], AR = [[-10, 0], [10, 0]], item = o.item, IK = null;
    if (pose === 'walk') { LG = [[28 * w, -26 * Math.max(0, -uu)], [-28 * w, -26 * Math.max(0, uu)]]; AR = [[-26 * w, 14], [26 * w, 14]]; bob = -Math.abs(uu) * 5; }
    else if (pose === 'run') { LG = [[46 * w, -60 * Math.max(0, -uu) - 10], [-46 * w, -60 * Math.max(0, uu) - 10]]; AR = [[-50 * w, 85], [50 * w, 85]]; lean = 14; bob = -Math.abs(uu) * 12; }
    else if (pose === 'wave') AR = [[-10, 0], [150, 25 + 30 * Math.sin(ph * TAU * 2.2)]];
    else if (pose === 'cheer') AR = [[-155 + 8 * w, -10], [155 - 8 * w, 10]];
    else if (pose === 'hold') AR = [[-25, 95], [25, -95]];
    else if (pose === 'dance') { AR = [[-130 + 35 * w, -50], [130 + 35 * w, 50]]; LG = [[-12 + 10 * w, 16 * Math.max(0, w)], [12 + 10 * w, -16 * Math.max(0, -w)]]; lean = 10 * w; bob = -Math.abs(w) * 14; }
    else if (pose === 'sit' || pose === 'read') { hipY = -th - 4; LG = [[90, -90], [96, -96]]; AR = pose === 'read' ? [[35, 90], [42, 82]] : [[25, 45], [30, 40]]; if (pose === 'read' && !item) item = 'book'; }
    else if (pose === 'ride') IK = o.ride || {};
    g.save(); g.translate(x, y); g.scale(s * dir, s);
    const hip = IK && IK.hip ? IK.hip : [0, hipY + bob], tilt = lean * DR, hx = side ? [0, 0] : [-B.sh * 0.5, B.sh * 0.5];
    const legP = i => { const Hh = [hip[0] + hx[i], hip[1]]; if (IK && IK.feet) { const F = IK.feet[i]; return [Hh, ik(Hh[0], Hh[1], F[0], F[1], th, th, -1), F]; }
      const Kn = ang(Hh[0], Hh[1], LG[i][0], th); return [Hh, Kn, ang(Kn[0], Kn[1], LG[i][0] + LG[i][1], th)]; };
    const shp = i => { const sx = side ? 0 : (i ? B.sh : -B.sh), sy = -B.torso + 10; return [hip[0] + sx * Math.cos(tilt) - sy * Math.sin(tilt), hip[1] + sx * Math.sin(tilt) + sy * Math.cos(tilt)]; };
    const armP = i => { const S0 = shp(i); if (IK && IK.hand) { const Hn = IK.hand; return [S0, ik(S0[0], S0[1], Hn[0], Hn[1], ar, ar, 1), Hn]; }
      const E = ang(S0[0], S0[1], AR[i][0] + lean, ar); return [S0, E, ang(E[0], E[1], AR[i][0] + AR[i][1] + lean, ar)]; };
    const leg = i => { const p = legP(i); seg(g, p, B.lw, side && i === 0 ? mix(legC, '#000000', 0.3) : legC); box(g, p[2][0] - B.lw * (side ? 0.4 : 0.55), p[2][1] - B.lw * 0.35, B.lw * (side ? 1.5 : 1.1), B.lw * 0.5, o.shoe || 'ink'); };
    const arm = i => { const p = armP(i); seg(g, p, B.aw, side && i === 0 ? mix(top, '#000000', 0.3) : top); disc(g, p[2][0], p[2][1], B.aw * 0.55, skin); return p[2]; };
    if (side) { arm(0); leg(0); leg(1); } else { leg(0); leg(1); }
    g.save(); g.translate(hip[0], hip[1]); g.rotate(tilt);
    const tw = side ? B.sh * 1.3 : B.sh * 2 + 6, tt = -B.torso;
    if (o.pack && side) box(g, -tw / 2 - B.sh * 0.75, tt + 12, B.sh * 0.85, B.torso * 0.62, o.pack);
    poly(g, [[-tw / 2, tt], [tw / 2, tt], [tw / 2 + 2, 6], [-tw / 2 - 2, 6]], top);
    if (o.skirt) poly(g, [[-tw / 2, -8], [tw / 2, -8], [tw / 2 + 16, th * 1.05], [-tw / 2 - 16, th * 1.05]], o.skirt === true ? top : o.skirt);
    if (o.pack && !side) { box(g, -tw / 2 + 6, tt + 4, 9, B.torso * 0.7, o.pack); box(g, tw / 2 - 15, tt + 4, 9, B.torso * 0.7, o.pack); }
    const hy = tt - B.head - 4, hs = o.hairStyle || (age === 'old' ? 'bun' : 'short');
    box(g, -B.head * 0.32, tt - 8, B.head * 0.64, 10, skin);
    if (hs === 'long' && !o.hat) box(g, side ? -B.head * 1.05 : -B.head * 1.1, hy - 2, side ? B.head * 1.1 : B.head * 2.2, B.head * 1.65, hair);
    disc(g, 0, hy, B.head, skin);
    if (o.hat === 'helmet') { g.fillStyle = K(o.hatCol || 'yellow'); g.beginPath(); g.arc(0, hy - 3, B.head * 1.14, Math.PI, 0); g.fill(); box(g, -B.head * 1.4, hy - 6, B.head * 2.8, 7, o.hatCol || 'yellow'); }
    else if (o.hat === 'cap') { g.fillStyle = K(o.hatCol || 'blue'); g.beginPath(); g.arc(0, hy - 2, B.head * 1.05, Math.PI, 0); g.fill(); box(g, 0, hy - 6, B.head * 1.6, 7, o.hatCol || 'blue'); }
    else if (hs !== 'none') { g.fillStyle = K(hair); g.beginPath(); g.arc(0, hy, B.head * 1.06, Math.PI * (side ? 0.9 : 0.98), Math.PI * 2.02); g.fill();
      if (hs === 'bun') disc(g, side ? -B.head * 0.75 : 0, hy - B.head * 1.05, B.head * 0.45, hair);
      if (side) box(g, -B.head * 1.06, hy - 2, B.head * 0.7, B.head * 0.85, hair); }
    if (o.mouth) { g.fillStyle = K('ink'); g.beginPath(); g.ellipse(side ? B.head * 0.7 : 0, hy + B.head * 0.45, B.head * 0.2, B.head * 0.24 * o.mouth, 0, 0, TAU); g.fill(); }
    if (o.glasses) { g.strokeStyle = K('ink'); g.lineWidth = 3; g.beginPath(); g.arc(side ? B.head * 0.5 : -B.head * 0.38, hy, B.head * 0.25, 0, TAU); if (!side) { g.moveTo(B.head * 0.63, hy); g.arc(B.head * 0.38, hy, B.head * 0.25, 0, TAU); } g.stroke(); }
    g.restore();
    let hand; if (side) hand = arm(1); else { arm(0); hand = arm(1); }
    if (item) { const a = armP(0)[2], b = armP(1)[2], two = pose === 'hold' || pose === 'read'; held(g, item, two ? (a[0] + b[0]) / 2 : hand[0], two ? (a[1] + b[1]) / 2 : hand[1], o); }
    g.restore();
    return { x, y, top: y - (B.leg + B.torso + B.head * 2 + 6) * s, hand: [x + hand[0] * s * dir, y + hand[1] * s] };
  }
  function held(g, it, x, y, o) {
    const c = o.itemCol;
    if (typeof it === 'function') return it(g, x, y);
    if (it === 'book') { poly(g, [[x - 34, y - 26], [x, y - 20], [x + 34, y - 26], [x + 34, y + 20], [x, y + 26], [x - 34, y + 20]], c || 'red'); box(g, x - 2, y - 20, 4, 46, 'bone'); }
    else if (it === 'bag') { box(g, x - 22, y + 4, 44, 50, c || 'sand'); seg(g, [[x - 12, y + 6], [x - 8, y - 6], [x + 8, y - 6], [x + 12, y + 6]], 4, c || 'sand'); }
    else if (it === 'box') box(g, x - 30, y - 30, 60, 50, c || 'brown');
    else if (it === 'flower') { seg(g, [[x, y + 10], [x, y - 50]], 4, 'dgreen'); disc(g, x, y - 56, 13, c || 'pink'); disc(g, x, y - 56, 5, 'yellow'); }
    else if (it === 'fish') fish(g, x + 30, y, 0.6, { col: c || 'grey' });
    else if (it === 'sign') { seg(g, [[x, y + 20], [x, y - 70]], 6, 'brown'); box(g, x - 80, y - 150, 160, 80, c || 'bone'); label(g, o.text || '', x, y - 110, 140, 46, 'ink'); }
  }
  // n человек в ряд без наложений, разная одежда. o: pose|poses[], ages[], tops[], bg (этот цвет одежде не даётся), lt, t0 (появляются по одному), stag, dir, each(i) -> доп. параметры
  const CLOTH = ['coral', 'blue', 'yellow', 'bone', 'green', 'lilac', 'pink', 'orange'];
  function crowd(g, x0, x1, y, n, s = 1, o = {}) {
    const out = [], tops = (o.tops || CLOTH).filter(c => K(c) !== K(o.bg)), lt = o.lt != null ? o.lt : 99, t0 = o.t0 || 0, stag = o.stag != null ? o.stag : 0.07;
    for (let i = 0; i < n; i++) {
      const px = n === 1 ? (x0 + x1) / 2 : lerp(x0, x1, i / (n - 1)), tt = lt - t0 - i * stag; if (tt < 0) continue;
      const e = 0.6 + 0.4 * spr(tt / 0.6), age = o.ages ? o.ages[i % o.ages.length] : 'adult';
      const op = Object.assign({ age, pose: o.poses ? o.poses[i % o.poses.length] : o.pose || 'stand', top: tops[(i * 3 + (o.seed || 0)) % tops.length],
        legs: i % 2 ? 'dgrey' : 'navy', skin: (i + (o.seed || 0)) % 4, hair: i % 3 === 1 ? 'brown' : i % 4 === 2 ? 'gold' : 'dbrown', hairStyle: i % 2 ? 'long' : 'short',
        ph: lt + i * 0.23, dir: o.dir || 1 }, o.each ? o.each(i) : {});
      g.save(); g.globalAlpha *= cl(tt / 0.08); out.push(person(g, px, y, s * e, op)); g.restore();
    }
    return out;
  }

  // ЗДАНИЯ. x: центр, y: земля. lit 0..1: доля горящих окон (гаснут по одному).
  const winOn = (i, lit, seed) => rnd(i * 7.13 + seed) < lit;
  function house(g, x, y, w = 300, h = 240, o = {}) {
    const col = o.col || 'bone', lit = o.lit || 0;
    box(g, x - w / 2, y - h, w, h, col); poly(g, [[x - w / 2 - 20, y - h], [x, y - h - w * 0.4], [x + w / 2 + 20, y - h]], o.roof || 'coral');
    box(g, x + w * 0.1, y - h * 0.48, w * 0.2, h * 0.48, o.door || 'ink');
    [[-0.3, 0.8], [-0.3, 0.42], [0.3, 0.82]].slice(0, h > 200 ? 3 : 2).forEach(([fx, fy], i) => box(g, x + fx * w - w * 0.1, y - h * fy, w * 0.2, w * 0.17, winOn(i, lit, o.seed || 1) ? (o.on || 'yellow') : (o.win || mix(col, '#121212', 0.45))));
  }
  // многоэтажка: floors x cols окон; p 0..1: растёт снизу вверх по этажу (стройка); slab: цвет плит перекрытия
  function tower(g, x, y, w = 340, h = 620, o = {}) {
    const col = o.col || 'bone', fl = o.floors || Math.max(2, Math.round(h / 110)), nc = o.cols || Math.max(2, Math.round(w / 85)), p = o.p != null ? o.p : 1, lit = o.lit || 0;
    const fh = h / fl, shown = fl * cl(p), win = o.win || mix(col, '#121212', 0.5), on = o.on || 'yellow';
    for (let f = 0; f < Math.ceil(shown); f++) {
      const k = cl(shown - f), yy = y - (f + 1) * fh - (1 - eo(k)) * 140;
      g.save(); g.globalAlpha *= cl(k * 3); box(g, x - w / 2, yy, w, fh + 1, col); if (o.slab) box(g, x - w / 2, yy + fh - 7, w, 7, o.slab);
      for (let c = 0; c < nc; c++) { const ww = w / nc * 0.46; box(g, x - w / 2 + (c + 0.5) * w / nc - ww / 2, yy + fh * 0.24, ww, fh * 0.46, winOn(f * nc + c, lit, o.seed || 3) ? on : win); }
      g.restore();
    }
    if (p >= 1 && o.roof !== false) box(g, x - w / 2 - 8, y - h - 12, w + 16, 12, o.roof || mix(col, '#121212', 0.55));
  }
  function awning(g, x0, x1, y, h, c1, c2, n) { const sw = (x1 - x0) / n; for (let i = 0; i < n; i++) poly(g, [[x0 + i * sw, y], [x0 + (i + 1) * sw, y], [x0 + (i + 1) * sw, y + h], [x0 + (i + 0.5) * sw, y + h + sw * 0.35], [x0 + i * sw, y + h]], i % 2 ? c2 : c1); }
  // магазин: вывеска sign (текст), навес в полоску awn/awn2, витрина, дверь
  function shop(g, x, y, w = 420, h = 360, o = {}) {
    const col = o.col || 'bone';
    box(g, x - w / 2, y - h, w, h, col); box(g, x - w / 2 - 10, y - h - 14, w + 20, 14, mix(col, '#121212', 0.4));
    if (o.sign != null) { box(g, x - w * 0.42, y - h + 16, w * 0.84, h * 0.2, o.signBg || 'ink'); label(g, o.sign, x, y - h + 16 + h * 0.1, w * 0.76, h * 0.16, o.signCol || 'bone'); }
    awning(g, x - w / 2 - 6, x + w / 2 + 6, y - h * 0.68, h * 0.11, o.awn || 'coral', o.awn2 || 'bone', 7);
    box(g, x - w * 0.42, y - h * 0.48, w * 0.5, h * 0.36, o.win || 'sky'); box(g, x + w * 0.16, y - h * 0.5, w * 0.24, h * 0.5, o.door || 'ink');
  }
  // кафе: магазин + столик с чашкой у входа
  function cafe(g, x, y, w = 460, h = 360, o = {}) {
    shop(g, x, y, w, h, o); const tx = x + w / 2 + 70;
    box(g, tx - 50, y - 92, 100, 10, o.table || 'ink'); box(g, tx - 4, y - 84, 8, 84, o.table || 'ink'); box(g, tx - 16, y - 118, 26, 26, o.cup || 'white');
  }
  // школа: два этажа окон, флаг, вывеска sign (текст)
  function school(g, x, y, w = 640, h = 380, o = {}) {
    const col = o.col || 'sand', lit = o.lit || 0;
    box(g, x - w / 2, y - h, w, h, col); box(g, x - w * 0.16, y - h - 70, w * 0.32, 70, col); poly(g, [[x - w * 0.2, y - h - 70], [x, y - h - 140], [x + w * 0.2, y - h - 70]], o.roof || 'coral');
    for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) if (!(r === 1 && (c === 2 || c === 3))) box(g, x - w / 2 + 30 + c * (w - 60) / 6, y - h + 40 + r * h * 0.42, (w - 60) / 6 - 26, h * 0.24, winOn(r * 6 + c, lit, 5) ? 'yellow' : mix(col, '#121212', 0.45));
    box(g, x - w * 0.08, y - h * 0.38, w * 0.16, h * 0.38, o.door || 'ink');
    if (o.sign != null) { box(g, x - w * 0.3, y - h - 52, w * 0.6, 44, o.signBg || 'ink'); label(g, o.sign, x, y - h - 30, w * 0.56, 38, o.signCol || 'bone'); }
    if (o.flag !== false) { seg(g, [[x + w / 2 - 30, y - h], [x + w / 2 - 30, y - h - 160]], 5, 'grey'); poly(g, [[x + w / 2 - 28, y - h - 160], [x + w / 2 + 50, y - h - 140 + Math.sin((o.lt || 0) * 5) * 6], [x + w / 2 - 28, y - h - 112]], o.flag || 'coral'); }
  }

  // ПРИРОДА. tree: kind oak (гранёная крона) | round | pine; s=1 ≈ 380 px; col крона, trunk ствол; lt: качание
  function crownPts(cx, cy, r, n, seed, ry = 1) { const p = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, rr0 = r * (0.78 + 0.3 * rnd(seed + i * 1.7)); p.push([cx + Math.cos(a) * rr0, cy + Math.sin(a) * rr0 * ry]); } return p; }
  function tree(g, x, y, s = 1, o = {}) {
    const kind = o.kind || 'oak', col = o.col || 'green', sw = Math.sin((o.lt || 0) * 1.6 + x * 0.01) * 3;
    g.save(); g.translate(x, y); g.scale(s, s);
    if (kind === 'pine') { box(g, -12, -60, 24, 60, o.trunk || 'brown'); for (let i = 0; i < 3; i++) poly(g, [[-120 + i * 26, -50 - i * 95], [sw * (i + 1), -210 - i * 95], [120 - i * 26, -50 - i * 95]], i % 2 ? mix(col, '#121212', 0.15) : col); }
    else {
      poly(g, [[-20, 0], [20, 0], [12, -170], [-12, -170]], o.trunk || 'brown');
      if (kind === 'oak') { seg(g, [[0, -150], [-60, -220]], 14, o.trunk || 'brown'); seg(g, [[0, -160], [55, -235]], 12, o.trunk || 'brown');
        poly(g, crownPts(-70 + sw, -250, 110, 9, 3, 0.8), mix(col, '#121212', 0.18)); poly(g, crownPts(75 + sw, -255, 105, 9, 7, 0.8), mix(col, '#121212', 0.1)); poly(g, crownPts(sw, -300, 130, 11, 11, 0.75), col); }
      else poly(g, crownPts(sw, -260, 125, 12, 5, 1), col);
    }
    g.restore();
  }
  function grass(g, x0, x1, y, o = {}) { const h = o.h || 34, st = o.step || 22, lt = o.lt || 0; g.fillStyle = K(o.col || 'dgreen'); g.beginPath(); g.moveTo(x0, y);
    for (let x = x0, i = 0; x < x1; x += st, i++) { g.lineTo(x + st * 0.5 + Math.sin(lt * 2 + i) * 3, y - h * (0.6 + 0.4 * rnd(i))); g.lineTo(x + st, y); } g.closePath(); g.fill(); }
  // лист: kind maple (кленовый, острый) | oval
  function leaf(g, x, y, r, o = {}) { g.save(); g.translate(x, y); g.rotate(o.rot || 0);
    if (o.kind === 'oval') { g.fillStyle = K(o.col || 'green'); g.beginPath(); g.ellipse(0, 0, r * 0.5, r, 0, 0, TAU); g.fill(); }
    else { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i / 10 * TAU, rr0 = i % 2 ? r * 0.45 : r * (i === 0 ? 1.1 : 0.9); p.push([Math.cos(a) * rr0, Math.sin(a) * rr0]); } poly(g, p, o.col || 'orange'); seg(g, [[0, 0], [0, r * 0.9]], 3, mix(o.col || 'orange', '#121212', 0.3)); }
    g.restore(); }
  // листопад в области: n листьев, цвета cols
  function leaves(g, lt, o = {}) { const x0 = o.x0 || 0, x1 = o.x1 || W, y0 = o.y0 || 400, y1 = o.y1 || 1600, n = o.n || 14, cols = o.cols || ['orange', 'coral', 'yellow', 'ginger'];
    for (let i = 0; i < n; i++) { const sp = 90 + rnd(i * 3.3) * 80, yy = y0 + ((rnd(i * 1.9) * (y1 - y0) + lt * sp) % (y1 - y0)), xx = x0 + rnd(i * 5.1) * (x1 - x0) + Math.sin(lt * 1.5 + i) * 30;
      leaf(g, xx, yy, 18 + rnd(i * 2.7) * 14, { col: cols[i % cols.length], rot: lt * (rnd(i) - 0.5) * 3 + i }); } }
  function hill(g, x, y, w, h, o = {}) { g.fillStyle = K(o.col || 'olive'); g.beginPath(); g.moveTo(x - w / 2, y); g.quadraticCurveTo(x, y - h * 2, x + w / 2, y); g.closePath(); g.fill(); }

  // НЕБО И ВОДА. sun: col, rays (число лучей, 0 без), lt; горизонт режет круг, если cut: y горизонта
  function sun(g, x, y, r, o = {}) { const col = o.col || 'yellow', n = o.rays != null ? o.rays : 0, a0 = (o.lt || 0) * 0.3;
    g.save(); if (o.cut != null) { g.beginPath(); g.rect(-200, -200, W + 400, o.cut + 200); g.clip(); }
    for (let i = 0; i < n; i++) { const a = a0 + i / n * TAU; poly(g, [ang(x, y, a / DR - 3, r * 1.2), ang(x, y, a / DR, r * 1.55), ang(x, y, a / DR + 3, r * 1.2)].map(p => p), col); }
    disc(g, x, y, r, col); if (o.stripes) for (let i = 0; i < 4; i++) box(g, x - r, y + r * (0.15 + i * 0.2), r * 2, 4 + i * 3, o.stripes);
    g.restore(); }
  function moon(g, x, y, r, o = {}) { disc(g, x, y, r, o.col || 'bone'); if (!o.full) disc(g, x + r * 0.45, y - r * 0.3, r * 0.86, o.bg || '#070707'); }
  // звёзды в области: p 0..1 зажигаются по одной, мерцают
  function stars(g, o = {}) { const n = o.n || 40, x0 = o.x0 || 40, x1 = o.x1 || 1040, y0 = o.y0 || 320, y1 = o.y1 || 900, p = o.p != null ? o.p : 1, lt = o.lt || 0, sd = o.seed || 1;
    for (let i = 0; i < n; i++) { if (rnd(i * 4.1 + sd) > p) continue; const xx = x0 + rnd(i * 1.3 + sd) * (x1 - x0), yy = y0 + rnd(i * 2.9 + sd) * (y1 - y0), r = 3 + rnd(i * 7.7) * 7, tw = 0.6 + 0.4 * Math.sin(lt * 3 + i * 1.9);
      g.save(); g.globalAlpha *= tw; poly(g, [[xx, yy - r * 1.8], [xx + r * 0.4, yy - r * 0.4], [xx + r * 1.8, yy], [xx + r * 0.4, yy + r * 0.4], [xx, yy + r * 1.8], [xx - r * 0.4, yy + r * 0.4], [xx - r * 1.8, yy], [xx - r * 0.4, yy - r * 0.4]], o.col || 'bone'); g.restore(); } }
  // облако: стопка плоских полос; drift px/с
  function cloud(g, x, y, s = 1, o = {}) { const dx = (o.lt || 0) * (o.drift || 0), col = o.col || 'bone';
    g.save(); g.translate(x + dx, y); g.scale(s, s); box(g, -150, -20, 300, 40, col); box(g, -90, -60, 170, 42, col); box(g, -40, -92, 80, 34, col); g.restore(); }
  // море от y вниз до y1: волнистый край, полосы волн col2 бегут
  function sea(g, y, o = {}) { const col = o.col || 'sea', c2 = o.col2 || mix(col, '#FFFFFF', 0.25), lt = o.lt || 0, amp = o.amp != null ? o.amp : 10, y1 = o.y1 || H;
    g.fillStyle = K(col); g.beginPath(); g.moveTo(-10, y1); for (let x = -10; x <= W + 10; x += 30) g.lineTo(x, y + Math.sin(x * 0.02 + lt * 2) * amp); g.lineTo(W + 10, y1); g.closePath(); g.fill();
    const nl = o.lines != null ? o.lines : 6; for (let i = 0; i < nl; i++) { const yy = y + 40 + i * (y1 - y - 40) / Math.max(1, nl), off = (lt * (40 + i * 12) + i * 137) % 260;
      for (let x = -260 + off; x < W; x += 260) box(g, x, yy, 70 + (i % 3) * 30, 6, c2); } }

  // ТРАНСПОРТ (lt крутит колёса). car ≈ 300 px, bus ≈ 540 px.
  function wheel(g, x, y, r, a, tc) { disc(g, x, y, r, tc || 'dgrey'); disc(g, x, y, r * 0.45, 'grey'); seg(g, [[x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42], [x - Math.cos(a) * r * 0.42, y - Math.sin(a) * r * 0.42]], 4, 'ink'); }
  function car(g, x, y, s = 1, o = {}) { const col = o.col || 'coral', a = (o.lt || 0) * 9;
    g.save(); g.translate(x, y); g.scale(s * (o.dir || 1), s);
    poly(g, [[-150, -34], [-150, -92], [-80, -96], [-50, -146], [60, -146], [100, -96], [150, -84], [150, -34]], col);
    box(g, -40, -136, 44, 38, o.win || 'sky'); box(g, 12, -136, 40, 38, o.win || 'sky'); box(g, 136, -82, 14, 12, 'yellow');
    wheel(g, -88, -32, 32, a); wheel(g, 92, -32, 32, a); g.restore(); }
  // автобус: num номер маршрута (текст), faces true: головы пассажиров в окнах
  function bus(g, x, y, s = 1, o = {}) { const col = o.col || 'blue', a = (o.lt || 0) * 9;
    g.save(); g.translate(x, y); g.scale(s * (o.dir || 1), s);
    poly(g, [[-270, -40], [-270, -300], [250, -300], [270, -270], [270, -40]], col); box(g, -270, -96, 540, 10, mix(col, '#121212', 0.3));
    for (let i = 0; i < 5; i++) { box(g, -250 + i * 92, -270, 78, 92, o.win || 'sky'); if (o.faces) disc(g, -211 + i * 92, -205, 18, SKIN[i % 4]); }
    box(g, 196, -270, 58, 220, o.win || 'sky');
    if (o.num != null) { box(g, -250, -330, 110, 70, 'ink'); label(g, String(o.num), -195, -295, 90, 60, 'bone'); }
    box(g, 258, -90, 12, 16, 'yellow'); wheel(g, -170, -40, 40, a); wheel(g, 170, -40, 40, a); g.restore(); }
  // велосипед с ездоком: rider: параметры person | false
  function bike(g, x, y, s = 1, o = {}) { const col = o.col || 'coral', lt = o.lt || 0, a = lt * 10;
    g.save(); g.translate(x, y); g.scale(s * (o.dir || 1), s);
    const r = 46, A = [-80, -r], Bw = [80, -r], P = [0, -r], S = [-20, -150], Hh = [62, -158];
    if (o.rider !== false) { const cr = lt * 8, f1 = [P[0] + Math.cos(cr) * 24, P[1] + Math.sin(cr) * 24], f2 = [P[0] - Math.cos(cr) * 24, P[1] - Math.sin(cr) * 24];
      person(g, 0, 0, 1, Object.assign({ pose: 'ride', ride: { hip: [S[0] - 4, S[1] - 8], feet: [f2, f1], hand: Hh } }, o.rider || {})); }
    [A, Bw].forEach(c => { g.strokeStyle = K(o.wheel || 'grey'); g.lineWidth = 8; g.beginPath(); g.arc(c[0], c[1], r, 0, TAU); g.stroke(); seg(g, [[c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r], [c[0] - Math.cos(a) * r, c[1] - Math.sin(a) * r]], 3, o.wheel || 'grey'); });
    seg(g, [A, P, [S[0], S[1] + 20], A], 9, col); seg(g, [P, [52, -132], Bw], 9, col); seg(g, [[S[0], S[1] + 20], [52, -132]], 9, col); seg(g, [[52, -132], Hh], 7, col);
    box(g, S[0] - 22, S[1] + 6, 44, 10, 'ink'); g.restore(); }
  // лодка: kind motor (мотор, след пены) | sail | row; crew: число или [{top:'orange'}, ...] сидят в лодке; wake: след
  function boat(g, x, y, s = 1, o = {}) { const col = o.col || 'bone', kind = o.kind || 'motor', lt = o.lt || 0, bob = Math.sin(lt * 2.4 + x * 0.01) * 5;
    g.save(); g.translate(x, y + bob); g.scale(s * (o.dir || 1), s); g.rotate(Math.sin(lt * 2 + x) * 0.025);
    const crew = typeof o.crew === 'number' ? Array.from({ length: o.crew }, () => ({})) : o.crew || [];
    crew.forEach((c, i) => person(g, -60 + i * 70, -40, 0.62, Object.assign({ pose: 'stand', top: 'orange', legs: 'dgrey', skin: i % 4, hairStyle: 'short', face: false }, c)));
    if (kind === 'sail') { seg(g, [[0, -40], [0, -300]], 6, 'dbrown'); poly(g, [[6, -290], [130, -60], [6, -60]], o.sail || 'bone'); poly(g, [[-6, -250], [-90, -60], [-6, -60]], o.sail2 || mix(o.sail || 'bone', '#121212', 0.15)); }
    poly(g, [[-150, -50], [160, -50], [120, 10], [-130, 10]], col); box(g, -150, -50, 310, 12, o.stripe || 'coral');
    if (kind === 'motor') { box(g, -178, -70, 36, 48, 'dgrey'); box(g, -168, -24, 12, 44, 'dgrey'); }
    if (kind === 'row') seg(g, [[-30, -40], [-120, 30]], 6, 'brown');
    g.restore();
    if (o.wake !== false && kind === 'motor') { g.save(); g.globalAlpha *= 0.8; for (let i = 0; i < 4; i++) { const k = (lt * 1.5 + i / 4) % 1; box(g, x - (o.dir || 1) * (170 + k * 220) * s - 30 * s, y + 6 * s + i * 6 * s, 60 * s * (1 - k), 5 * s, 'white'); } g.restore(); } }

  // ЖИВОТНЫЕ (s=1 ≈ 240 px). dog: pose stand|walk|sit|sleep; col шерсть
  function dog(g, x, y, s = 1, o = {}) { const col = o.col || 'ginger', pose = o.pose || 'stand', lt = o.lt || 0, w = Math.sin(lt * 9), dk = mix(col, '#121212', 0.3);
    g.save(); g.translate(x, y); g.scale(s * (o.dir || 1), s);
    if (pose === 'sleep') { const br = 1 + Math.sin(lt * 2.2) * 0.03; g.save(); g.scale(1, br); poly(g, [[-110, 0], [-100, -60], [60, -70], [110, -40], [110, 0]], col); g.restore();
      poly(g, [[60, -70], [130, -66], [140, -30], [100, -10]], col); poly(g, [[70, -66], [96, -96], [104, -60]], dk); seg(g, [[108, -46], [124, -46]], 4, 'ink'); seg(g, [[-110, -10], [-150, -14]], 12, col);
      if (o.zz !== false) { g.save(); g.globalAlpha *= 0.5 + 0.5 * Math.sin(lt * 2); const zy = -110 - (lt * 12) % 30; seg(g, [[150, zy - 24], [172, zy - 24], [150, zy], [172, zy]], 5, 'bone'); g.restore(); } g.restore(); return; }
    const sit = pose === 'sit', lg = pose === 'walk' ? 18 * w : 0;
    seg(g, sit ? [[-60, -90], [-110, -110]] : [[-90, -110], [-140, -150 + w * 8]], 12, col);
    if (sit) { poly(g, [[-80, 0], [-90, -80], [40, -150], [70, -110], [40, 0]], col); seg(g, [[30, -100], [40, 0]], 16, col); }
    else { box(g, -100, -150, 190, 70, col); [[-80, lg], [-50, -lg], [50, lg], [80, -lg]].forEach(([lx, a], i) => seg(g, [[lx, -90], ang(lx, -90, a, 90)], 16, i % 2 ? dk : col)); }
    const hx = sit ? 50 : 80, hy = sit ? -200 : -200;
    poly(g, [[hx - 30, hy], [hx + 40, hy - 10], [hx + 90, hy + 20], [hx + 80, hy + 50], [hx - 20, hy + 60]], col); poly(g, [[hx - 28, hy + 4], [hx - 18, hy - 26], [hx + 4, hy + 2], [hx - 10, hy + 40]], dk);
    disc(g, hx + 88, hy + 26, 8, 'ink'); disc(g, hx + 30, hy + 18, 6, 'ink'); g.restore(); }
  function cat(g, x, y, s = 1, o = {}) { const col = o.col || 'dgrey', pose = o.pose || 'sit', lt = o.lt || 0;
    g.save(); g.translate(x, y); g.scale(s * (o.dir || 1), s);
    if (pose === 'sleep') { poly(g, [[-80, 0], [-70, -50], [50, -55], [80, 0]], col); disc(g, 60, -30, 30, col); poly(g, [[44, -50], [50, -78], [66, -54]], col); poly(g, [[70, -50], [84, -74], [88, -44]], col); g.restore(); return; }
    if (pose === 'walk') { box(g, -70, -110, 140, 55, col); [-55, -30, 40, 60].forEach((lx, i) => seg(g, [[lx, -60], ang(lx, -60, (i % 2 ? 1 : -1) * 16 * Math.sin(lt * 9), 60)], 11, col)); seg(g, [[-70, -100], [-110, -150], [-100, -180]], 9, col); disc(g, 90, -130, 34, col); poly(g, [[70, -155], [76, -195], [96, -160]], col); poly(g, [[100, -158], [116, -192], [122, -150]], col); g.restore(); return; }
    poly(g, [[-50, 0], [-40, -110], [0, -150], [40, -110], [50, 0]], col); seg(g, [[40, -10], [90, -10], [100, -50 + Math.sin(lt * 3) * 10]], 10, col);
    disc(g, 0, -170, 42, col); poly(g, [[-38, -190], [-30, -240], [-6, -205]], col); poly(g, [[6, -205], [30, -240], [38, -190]], col);
    disc(g, -14, -172, 5, 'yellow'); disc(g, 14, -172, 5, 'yellow'); g.restore(); }
  // птица: kind gull (летит, машет) | sit; s=1 ≈ 130 px размах
  function bird(g, x, y, s = 1, o = {}) { const col = o.col || 'bone', lt = o.lt || 0;
    g.save(); g.translate(x, y); g.scale(s * (o.dir || 1), s);
    if (o.kind === 'sit') { poly(g, [[-30, 0], [-20, -34], [20, -40], [34, -26], [20, 0]], col); disc(g, 28, -44, 14, col); poly(g, [[40, -46], [56, -42], [40, -38]], 'yellow'); g.restore(); return; }
    const f = Math.sin(lt * 9 + x * 0.05) * 30; poly(g, [[-65, -f], [-20, -6], [0, 4], [20, -6], [65, -f], [20, 4], [0, 12], [-20, 4]], col); poly(g, [[6, 0], [24, 2], [6, 6]], 'yellow'); g.restore(); }
  // рыба (для прилавка/улова): col, s=1 ≈ 160 px
  function fish(g, x, y, s = 1, o = {}) { const col = o.col || 'grey', flat = o.kind === 'flat';
    g.save(); g.translate(x, y); g.scale(s * (o.dir || 1), s);
    poly(g, flat ? [[-70, 0], [-20, -44], [50, -36], [70, 0], [50, 36], [-20, 44]] : [[-60, 0], [-10, -28], [50, -18], [70, 0], [50, 18], [-10, 28]], col);
    poly(g, [[-60, 0], [-95, -28], [-90, 0], [-95, 28]], mix(col, '#121212', 0.25)); disc(g, 44, -6, 5, 'ink');
    if (flat) for (let i = 0; i < 6; i++) disc(g, -20 + (i % 3) * 22, -12 + ((i / 3) | 0) * 22, 4, mix(col, '#121212', 0.35));
    g.restore(); }

  // УЛИЦА. lamp: фонарь высотой h, on 0..1, light цвет света
  function lamp(g, x, y, h = 420, o = {}) { const on = o.on != null ? o.on : 1, lc = o.light || 'yellow';
    box(g, x - 6, y - h, 12, h, o.col || 'dgrey'); box(g, x - 18, y - 14, 36, 14, o.col || 'dgrey'); box(g, x - 4, y - h, 60, 8, o.col || 'dgrey');
    poly(g, [[x + 32, y - h + 8], [x + 70, y - h + 8], [x + 62, y - h + 52], [x + 40, y - h + 52]], on > 0.05 ? lc : 'grey');
    if (on > 0.05) { g.save(); g.globalAlpha *= 0.16 * on; poly(g, [[x + 40, y - h + 52], [x + 62, y - h + 52], [x + 150, y], [x - 50, y]], lc); g.restore(); } }
  // гирлянда: n лампочек по провисающему проводу, on 0..1 загораются слева направо
  function garland(g, x0, y0, x1, y1, n = 9, o = {}) { const sag = o.sag != null ? o.sag : 60, cols = o.cols || ['yellow', 'coral', 'blue', 'green', 'pink'], on = o.on != null ? o.on : 1;
    const pt = p => [lerp(x0, x1, p), lerp(y0, y1, p) + Math.sin(p * Math.PI) * sag];
    g.strokeStyle = K('dgrey'); g.lineWidth = 3; g.beginPath(); for (let i = 0; i <= 20; i++) { const q = pt(i / 20); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } g.stroke();
    for (let i = 0; i < n; i++) { const p = (i + 0.5) / n, q = pt(p), lit = on * n > i; poly(g, [[q[0] - 9, q[1] + 4], [q[0] + 9, q[1] + 4], [q[0] + 6, q[1] + 30], [q[0] - 6, q[1] + 30]], lit ? cols[i % cols.length] : 'dgrey'); } }
  // доска мелом: rows ['строка' | ['слева', 'справа']], title, p 0..1 строки пишутся по очереди, bg, frame, legs
  function board(g, x, y, w, h, rows, o = {}) { const p = o.p != null ? o.p : 1;
    if (o.legs !== false) { seg(g, [[x - w * 0.35, y + h / 2], [x - w * 0.42, y + h / 2 + 140]], 12, o.frame || 'brown'); seg(g, [[x + w * 0.35, y + h / 2], [x + w * 0.42, y + h / 2 + 140]], 12, o.frame || 'brown'); }
    box(g, x - w / 2 - 14, y - h / 2 - 14, w + 28, h + 28, o.frame || 'brown'); box(g, x - w / 2, y - h / 2, w, h, o.bg || '#24302A');
    g.save(); g.fillStyle = K(o.chalk || '#E9E6DC'); g.textBaseline = 'middle'; const n = rows.length + (o.title ? 1 : 0), lh = Math.min(h / (n + 0.6), 110), fs = lh * 0.62;
    let yy = y - h / 2 + lh * 0.8;
    if (o.title) { g.font = font('serif', fs * 1.1); g.textAlign = 'center'; g.fillText(o.title, x, yy); yy += lh; }
    rows.forEach((r, i) => { const k = cl(p * rows.length - i); if (k <= 0) return; g.save(); g.beginPath(); g.rect(x - w / 2, yy - lh / 2, 40 + (w - 40) * k, lh); g.clip(); g.font = font('serif', fs);
      if (Array.isArray(r)) { g.textAlign = 'left'; g.fillText(r[0], x - w / 2 + 40, yy); g.textAlign = 'right'; g.fillText(r[1], x + w / 2 - 40, yy); } else { g.textAlign = 'center'; g.fillText(r, x, yy); }
      g.restore(); yy += lh; });
    g.restore(); }
  function bench(g, x, y, w = 260, o = {}) { box(g, x - w / 2, y - 70, w, 14, o.col || 'brown'); box(g, x - w / 2, y - 120, w, 12, o.col || 'brown'); box(g, x - w / 2 + 20, y - 70, 12, 70, 'dgrey'); box(g, x + w / 2 - 32, y - 70, 12, 70, 'dgrey'); }

  // ---------- примитивы ----------
  function rr(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  // ---------- звук ----------
  // склейки: щелчок-глитч; names чередуются
  function cutSounds(s, cuts, names = ['click', 'tick'], v = 0.13) {
    const N = Array.isArray(names) ? names : [names];
    cuts.slice(1).forEach((c, i) => s.play(c, N[i % N.length], v, { pitch: 0.9 + s.rand(i + 5) * 0.3 }));
  }
  // E: [[t, имя, громкость, pitch?], ...]
  function sfx(s, E, jit = 0.15) {
    E.forEach((e, i) => s.play(Math.max(0, e[0]), e[1], clamp(e[2] || 0.12, 0.05, 0.3),
      { pitch: clamp((e[3] || 1) * (1 - jit / 2 + s.rand(i + 1) * jit), 0.5, 2) }));
  }

  return { W, H, X0, X1, TAU, SANS, SERIF, MONO, SX, C, BG, TOK, cl, clamp, lerp, prog, eo, eio, back, spr, rnd, fmt, pad,
    scene, font, paint, colOf, tex, bg, dashWall, hud, counter, cam, gtext, jitter, cut,
    wlay, words, poster, type, bigNum, tokens, bars, stamp, slider, win, note, calendar, wave, storm, stormBg, rr, cutSounds, sfx,
    PAL, SKIN, K, mix, seg, disc, poly, box, label, fig, person, crowd, house, tower, shop, cafe, school, tree, grass, leaf, leaves, hill,
    sun, moon, stars, cloud, sea, car, bus, bike, boat, dog, cat, bird, fish, lamp, garland, board, bench };
})();
