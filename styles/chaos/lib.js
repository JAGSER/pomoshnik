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
    // стена кода
    const CODE = ['const подъём = "06:00";', 'если (спит) {', '  громкость += 10;', '  звонок(повтор);', '}', 'пока (лежит) ждать(5);', 'отложено++;', 'вернуть "вставай";',
      'функция утро() {', '  кофе.налить();', '  окно.открыть();', '}', 'журнал("снова 5 минут");', 'проверить(одеяло);', 'сигнал.громче();', 'таймер.сброс();'];
    const cc = new OffscreenCanvas(1080, 1400), c2 = cc.getContext('2d'), r2 = rng(5);
    c2.font = font('mono', 22); c2.textBaseline = 'middle';
    for (let i = 0; i < 40; i++) {
      c2.fillStyle = '#3A3836'; c2.fillText(pad(200 + i * 3, 4), 70, 20 + i * 35);
      c2.fillStyle = '#4A4744'; c2.fillText(CODE[Math.floor(r2() * CODE.length)], 150 + Math.floor(r2() * 3) * 22, 20 + i * 35);
    }
    TX.code = cc;
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
  // kind: ink | coral | paper | blue;  o: { code: прозрачность стены кода, ghost: 'Б' гигантская тень-буква }
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
      g.drawImage(T.code, 0, y + 320); g.restore();
    }
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
  // o: { kind, title, live, p (0..1), left, right }
  function hud(g, t, o = {}) {
    const b = BG[o.kind || 'ink'];
    g.save(); g.font = font('mono', 28); g.textBaseline = 'middle'; g.fillStyle = b.hud;
    g.textAlign = 'left'; g.fillText(o.title || '', 64, 196);
    g.textAlign = 'right'; g.fillText(o.live || 'эфир', 988, 196);
    g.globalAlpha = 0.7 + 0.3 * Math.sin(t * 5); g.fillStyle = o.kind === 'coral' ? '#6E2C1E' : C.CORAL; g.beginPath(); g.arc(1016, 196, 10, 0, TAU); g.fill(); g.globalAlpha = 1;
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
  // карточка-уведомление (сетка карточек чата). o: { a (0..1), dead: перечёркнута }
  function note(g, x, y, w, h, label, sub, o = {}) {
    const a = o.a == null ? 1 : o.a; if (a <= 0) return;
    const s = 0.85 + 0.15 * a;
    g.save(); g.globalAlpha = cl(a * 1.5); g.translate(x + w / 2, y + h / 2); g.scale(s, s); g.translate(-(x + w / 2), -(y + h / 2));
    g.fillStyle = C.CARD; rr(g, x, y, w, h, 16); g.fill(); g.strokeStyle = C.CARD_E; g.lineWidth = 2; g.stroke();
    g.fillStyle = o.dead ? '#4A4744' : C.CORAL; g.beginPath(); g.arc(x + w - 30, y + 30, 9, 0, TAU); g.fill();
    g.font = font('mono', 22); g.fillStyle = '#5E5A55'; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText('будильник', x + 26, y + 32);
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
    wlay, words, poster, type, bigNum, tokens, bars, stamp, slider, win, note, calendar, wave, storm, stormBg, rr, cutSounds, sfx };
})();
