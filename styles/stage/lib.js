// «Демо интерфейса» (STAGE): ролик-инструкция в стиле stageshow — правдоподобный интерфейс телефона или окна,
// Идеология и правила по скиллу Stageshow (Benji Taylor, MIT): правдоподобный интерфейс, одно действие, бюджет слов, движение по причине.
// в котором происходит одно действие: палец/курсор нажимает, текст печатается, числа набегают, результат держится.
// Canvas 2D 1080×1920, Web Worker. Одна глобальная константа STAGE. Кадр считается только из t, состояние не храним.
const STAGE = (() => {
  const W = 1080, H = 1920, PI = Math.PI, PI2 = PI * 2;
  const THEMES = {
    light: { ground: '#EEF0F3', ground2: '#E3E7EC', surface: '#FFFFFF', sunk: '#F5F6F8', line: '#E2E5EA', bar: '#E6E9EE', bar2: '#D9DDE3',
      ink: '#14171C', ink2: '#3C434D', mute: '#7A828C', faint: '#A8AFB8', accent: '#2563EB', accentP: '#E6EEFD', ok: '#16A34A', okP: '#E3F5E9',
      warn: '#D97706', bad: '#DC2626', chrome: '#F3F4F6', dark: '#0E1116', onAccent: '#FFFFFF', shadow: 'rgba(17,24,39,' },
    dark: { ground: '#0B0D10', ground2: '#121519', surface: '#16191E', sunk: '#1D2127', line: '#2A2F37', bar: '#262B33', bar2: '#323843',
      ink: '#F2F4F7', ink2: '#C5CAD2', mute: '#8A929C', faint: '#5D6570', accent: '#4F8BFF', accentP: '#1A2740', ok: '#22C55E', okP: '#13261B',
      warn: '#F59E0B', bad: '#F05252', chrome: '#1B1F25', dark: '#000000', onAccent: '#FFFFFF', shadow: 'rgba(0,0,0,' },
  };
  let P = Object.assign({}, THEMES.light);
  const F = '"Inter","SF Pro Display","Segoe UI",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif';
  const MONO = '"JetBrains Mono","SF Mono",Menlo,Consolas,monospace';
  let K = null;

  // ---------- время ----------
  const cl = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const pr = (t, a, b) => (b === a ? (t >= a ? 1 : 0) : cl((t - a) / (b - a)));
  const lerp = (a, b, p) => a + (b - a) * p;
  const eo = p => 1 - Math.pow(1 - cl(p), 3);
  const eo5 = p => 1 - Math.pow(1 - cl(p), 5);
  const eio = p => { p = cl(p); return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  const sp = p => (p <= 0 ? 0 : p >= 1 ? 1 : 1 - Math.exp(-7 * p) * Math.cos(7.5 * p));
  const spring = (t, t0, dur = .6) => sp(pr(t, t0, t0 + dur));
  const ap = (t, t0, dur = .35) => eo(pr(t, t0, t0 + dur));
  const vis = (t, t0, t1, fin = .3, fout = .25) => (t1 == null ? ap(t, t0, fin) : Math.min(ap(t, t0, fin), 1 - eo(pr(t, t1, t1 + fout))));
  const stag = (t, t0, i, step = .07, dur = .35) => eo(pr(t, t0 + i * step, t0 + i * step + dur));
  const kf = (A, t, e = eio) => {
    if (t <= A[0][0]) return A[0][1];
    for (let i = 0; i < A.length - 1; i++) { const a = A[i], b = A[i + 1]; if (t < b[0]) return lerp(a[1], b[1], e(pr(t, a[0], b[0]))); }
    return A[A.length - 1][1];
  };
  // ключи [t, [значения…], dur?] — держит значение и переходит за dur к следующему
  const step = (A, t, d = .6, e = eio) => {
    let cur = A[0][1];
    for (let i = 1; i < A.length; i++) {
      const [t0, v, dd] = A[i]; if (t < t0) break;
      const p = e(pr(t, t0, t0 + (dd == null ? d : dd)));
      cur = Array.isArray(v) ? v.map((x, j) => lerp(cur[j], x, p)) : lerp(cur, v, p);
    }
    return cur;
  };
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const fmt = (v, dec = 0) => { const s = Math.abs(v).toFixed(dec).split('.'); s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' '); return (v < 0 ? '−' : '') + s.join(','); };
  const count = (t, t0, dur, a, b) => lerp(a, b, eo5(pr(t, t0, t0 + dur)));
  // печать: сколько символов строки s видно к моменту t (cps — символов в секунду)
  const typed = (s, t, t0, cps = 14) => s.slice(0, Math.max(0, Math.floor((t - t0) * cps)));

  // ---------- примитивы ----------
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); };
  function fill(g, x, y, w, h, r, col) { g.fillStyle = col; rr(g, x, y, w, h, r); g.fill(); }
  function stroke(g, x, y, w, h, r, col, lw = 2) { g.strokeStyle = col; g.lineWidth = lw; rr(g, x + lw / 2, y + lw / 2, w - lw, h - lw, r); g.stroke(); }
  // мягкая тень без shadowBlur: несколько полупрозрачных подложек
  function shadow(g, x, y, w, h, r, k = 1) {
    for (let i = 4; i >= 1; i--) { g.fillStyle = P.shadow + (0.028 * k).toFixed(3) + ')'; rr(g, x - i * 3, y + i * 5, w + i * 6, h + i * 4, r + i * 3); g.fill(); }
  }
  function font(size, weight = 600, mono) { return `${weight} ${size}px ${mono ? MONO : F}`; }
  // текст одной строкой, подгон по ширине max (уменьшает кегль), возвращает ширину
  function text(g, s, x, y, o = {}) {
    s = String(s); let size = o.size || 32; const w8 = o.weight || 600;
    g.font = font(size, w8, o.mono);
    if (o.max) while (size > 14 && g.measureText(s).width > o.max) { size -= 2; g.font = font(size, w8, o.mono); }
    g.fillStyle = o.col || P.ink; g.textAlign = o.al || 'left'; g.textBaseline = o.base || 'middle';
    const a = g.globalAlpha; if (o.a != null) g.globalAlpha = a * o.a;
    g.fillText(s, x, y); g.globalAlpha = a;
    return g.measureText(s).width;
  }
  // заглушка строки текста: всё, о чём ролик не рассказывает
  function bar(g, x, y, w, h = 18, col) { fill(g, x, y - h / 2, w, h, h / 2, col || P.bar); }
  function lines(g, x, y, w, n, o = {}) { const gap = o.gap || 34, h = o.h || 16; for (let i = 0; i < n; i++) bar(g, x, y + i * gap, w * (i === n - 1 ? (o.last || .62) : (.82 + .18 * hash(i + (o.seed || 1)))), h, o.col); }

  // ---------- иконки (линейные, 24-сетка) ----------
  const ICONS = {
    home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10', search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM16 16l5 5', bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4 4-6 8-6s7 2 8 6', card: 'M3 6h18v12H3zM3 10h18M7 15h4', wallet: 'M3 7h16v12H3zM3 7l12-3v3M15 13h4',
    house: 'M4 11l8-7 8 7v9H4zM10 20v-6h4v6', bolt: 'M13 2L4 14h7l-1 8 9-12h-7z', drop: 'M12 3s7 7 7 12a7 7 0 0 1-14 0c0-5 7-12 7-12z', flame: 'M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3-1-5 1-8z',
    phone: 'M7 3h10v18H7zM11 18h2', wifi: 'M2 9a15 15 0 0 1 20 0M5 13a10 10 0 0 1 14 0M9 17a4 4 0 0 1 6 0', check: 'M5 12l5 5 9-10',
    plus: 'M12 5v14M5 12h14', chev: 'M9 6l6 6-6 6', back: 'M15 6l-6 6 6 6', send: 'M4 12l16-8-6 16-3-7z', clock: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 7v5l3 2',
    gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
    chat: 'M4 5h16v11H9l-5 4z', mic: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3', cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
    doc: 'M6 3h9l4 4v14H6zM14 3v5h5', lock: 'M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3', heart: 'M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z',
    cart: 'M3 4h2l3 11h11l2-8H6M9 20a1 1 0 1 0 0-.1M18 20a1 1 0 1 0 0-.1', star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
    bus: 'M5 4h14v13H5zM5 11h14M8 20v-3M16 20v-3', pill: 'M10 4l10 10a4 4 0 0 1-6 6L4 10a4 4 0 0 1 6-6zM8 12l4-4', camera: 'M4 7h4l2-3h4l2 3h4v12H4zM12 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    arrow: 'M5 12h14M13 6l6 6-6 6', x: 'M6 6l12 12M18 6L6 18', more: 'M5 12h.01M12 12h.01M19 12h.01', list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  };
  const PCACHE = {};
  function icon(g, name, cx, cy, s = 40, col, lw = 2) {
    const d = ICONS[name]; if (!d) return; const p = PCACHE[name] || (PCACHE[name] = new Path2D(d));
    g.save(); g.translate(cx - s / 2, cy - s / 2); g.scale(s / 24, s / 24);
    g.strokeStyle = col || P.ink2; g.lineWidth = lw * 24 / s; g.lineCap = 'round'; g.lineJoin = 'round';
    g.stroke(p); g.restore();
  }
  // плитка с иконкой: квадрат со скруглением (не «буква в цветном квадрате»)
  function tile(g, name, cx, cy, s = 72, col, bg) { fill(g, cx - s / 2, cy - s / 2, s, s, s * .28, bg || P.accentP); icon(g, name, cx, cy, s * .52, col || P.accent, 2.6 * s / 72); }
  function avatar(g, cx, cy, r, initials, col) {
    g.fillStyle = col || P.accent; g.beginPath(); g.arc(cx, cy, r, 0, PI2); g.fill();
    if (initials) text(g, initials, cx, cy + 1, { size: r * .78, weight: 700, col: '#fff', al: 'center' });
  }

  // ---------- рамки ----------
  // телефон: настоящая геометрия, статус-бар и полоска «домой» рисует сам. Возвращает экран {x,y,w,h,r,top,bot}
  function phone(g, o = {}) {
    const w = o.w || 820, h = o.h || 1700, x = o.x == null ? (W - w) / 2 : o.x, y = o.y == null ? 560 : o.y;
    const bz = w * .034, R = w * .14, sx = x + bz, sy = y + bz, sw = w - 2 * bz, sh = h - 2 * bz, sr = R - bz;
    shadow(g, x, y, w, h, R, 1.3);
    fill(g, x, y, w, h, R, '#0B0C0E'); fill(g, x + 3, y + 3, w - 6, h - 6, R - 3, '#1C1E22'); fill(g, x + 6, y + 6, w - 12, h - 12, R - 6, '#08090A');
    g.save(); rr(g, sx, sy, sw, sh, sr); g.clip();
    fill(g, sx, sy, sw, sh, 0, o.screen || P.sunk);
    const scr = { x: sx, y: sy, w: sw, h: sh, r: sr, top: sy + w * .13, bot: sy + sh - w * .06 };
    if (o.content) o.content(g, scr);
    // статус-бар
    const dark = !!o.darkStatus, sc = dark ? '#FFFFFF' : '#0B0C0E', fs = w * .036;
    text(g, o.time || '9:41', sx + sw * .16, sy + w * .062, { size: fs, weight: 650, col: sc, al: 'center' });
    g.fillStyle = sc; for (let i = 0; i < 4; i++) g.fillRect(sx + sw * .76 + i * fs * .32, sy + w * .07 - fs * (.25 + i * .12), fs * .2, fs * (.25 + i * .12));
    rr(g, sx + sw * .865, sy + w * .052, fs * 1.05, fs * .5, fs * .14); g.strokeStyle = sc; g.lineWidth = 2; g.stroke(); g.fillRect(sx + sw * .865 + 3, sy + w * .052 + 3, fs * .75, fs * .5 - 6);
    // островок
    fill(g, sx + sw / 2 - w * .145, sy + w * .028, w * .29, w * .085, w * .0425, '#000');
    // домой
    fill(g, sx + sw / 2 - sw * .18, sy + sh - w * .028, sw * .36, w * .012, w * .006, dark ? 'rgba(255,255,255,.85)' : 'rgba(10,12,14,.85)');
    g.restore();
    return scr;
  }
  // окно приложения/браузера: светофор, заголовок или адресная строка, опц. боковая панель. Возвращает тело {x,y,w,h,side}
  function win(g, o = {}) {
    const x = o.x == null ? 60 : o.x, y = o.y == null ? 600 : o.y, w = o.w || 1100, h = o.h || 1300, r = o.r || 26, ch = o.ch || 76;
    shadow(g, x, y, w, h, r, 1.1);
    fill(g, x, y, w, h, r, P.surface); stroke(g, x, y, w, h, r, P.line, 2);
    g.save(); rr(g, x, y, w, h, r); g.clip();
    fill(g, x, y, w, ch, 0, P.chrome); g.fillStyle = P.line; g.fillRect(x, y + ch - 2, w, 2);
    ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(x + 40 + i * 34, y + ch / 2, 11, 0, PI2); g.fill(); });
    if (o.url != null) { fill(g, x + 170, y + 16, Math.min(w - 260, 620), ch - 32, (ch - 32) / 2, P.surface); icon(g, 'lock', x + 200, y + ch / 2, 22, P.mute, 2); text(g, o.url, x + 222, y + ch / 2 + 1, { size: 24, weight: 500, col: P.ink2, max: Math.min(w - 330, 540) }); }
    else if (o.title) text(g, o.title, x + w / 2, y + ch / 2 + 1, { size: 26, weight: 650, col: P.ink2, al: 'center' });
    const sw = o.side ? (o.sideW || 250) : 0;
    if (sw) { fill(g, x, y + ch, sw, h - ch, 0, P.sunk); g.fillStyle = P.line; g.fillRect(x + sw, y + ch, 2, h - ch); }
    const body = { x: x + sw, y: y + ch, w: w - sw, h: h - ch, side: sw ? { x, y: y + ch, w: sw, h: h - ch } : null };
    if (o.content) o.content(g, body);
    g.restore();
    return body;
  }
  // карточка/поверхность внутри экрана
  function card(g, x, y, w, h, o = {}) { if (o.lift) shadow(g, x, y, w, h, o.r || 28, o.lift); fill(g, x, y, w, h, o.r == null ? 28 : o.r, o.col || P.surface); if (o.border !== false && !o.col) stroke(g, x, y, w, h, o.r == null ? 28 : o.r, P.line, 2); }
  // шапка экрана телефона: «назад», заголовок по центру
  function navbar(g, scr, title, o = {}) {
    const y = scr.top + 40; if (o.back) icon(g, 'back', scr.x + 64, y, 44, P.accent, 3);
    text(g, title, scr.x + scr.w / 2, y, { size: o.size || 40, weight: 700, al: 'center', max: scr.w - 200 }); return y + 70;
  }
  // строка списка: всё в списках состоит из неё. real — настоящие слова, иначе заглушки
  function row(g, o) {
    const { x, y, w } = o, h = o.h || 128, a = o.a == null ? 1 : o.a; if (a <= 0) return;
    g.save(); g.globalAlpha *= a; if (o.dy) g.translate(0, o.dy);
    if (o.sel) fill(g, x + 10, y + 6, w - 20, h - 12, 22, P.accentP);
    let tx = x + 36;
    if (o.icon) { tile(g, o.icon, x + 36 + 40, y + h / 2, 80, o.iconCol, o.iconBg); tx = x + 36 + 80 + 28; }
    else if (o.avatar) { avatar(g, x + 36 + 40, y + h / 2, 40, o.avatar, o.avCol); tx = x + 36 + 80 + 28; }
    const right = x + w - 36;
    if (o.title) text(g, o.title, tx, y + h / 2 - (o.sub || o.subBar ? 20 : 0), { size: o.size || 36, weight: 650, max: right - tx - (o.val ? 220 : 40) });
    else bar(g, tx, y + h / 2 - (o.subBar ? 18 : 0), o.bw || 260, 20, P.bar2);
    if (o.sub) text(g, o.sub, tx, y + h / 2 + 24, { size: 27, weight: 500, col: P.mute, max: right - tx - 200 });
    else if (o.subBar) bar(g, tx, y + h / 2 + 22, (o.bw || 260) * .6, 14);
    if (o.val != null) text(g, o.val, right - (o.chev ? 44 : 0), y + h / 2, { size: o.vsize || 34, weight: 700, al: 'right', col: o.vcol || P.ink });
    if (o.chev) icon(g, 'chev', right - 12, y + h / 2, 30, P.faint, 3);
    if (o.toggle != null) toggle(g, right - 92, y + h / 2 - 30, o.toggle);
    if (o.div !== false) { g.fillStyle = P.line; g.fillRect(tx, y + h - 1, x + w - tx, 2); }
    g.restore();
  }
  // кнопка: p — нажатие 0…1 (сжатие и потемнение), done — смена на «готово» той же кнопкой
  function button(g, o) {
    const { x, y, w } = o, h = o.h || 112, press = o.press || 0, prim = o.primary !== false;
    const s = 1 - .04 * Math.sin(PI * cl(press)); g.save(); g.translate(x + w / 2, y + h / 2); g.scale(s, s); g.translate(-(x + w / 2), -(y + h / 2));
    const bg = o.done ? lerp01col(prim ? P.accent : P.sunk, P.ok, o.done) : prim ? P.accent : P.sunk;
    fill(g, x, y, w, h, h / 2.4, bg);
    if (press > 0) fill(g, x, y, w, h, h / 2.4, `rgba(0,0,0,${(.12 * Math.sin(PI * cl(press))).toFixed(3)})`);
    const lab = o.done && o.doneLabel && o.done > .5 ? o.doneLabel : o.label, col = prim || o.done ? P.onAccent : P.ink;
    const ta = o.done && o.doneLabel ? Math.abs(o.done - .5) * 2 : 1;
    let lx = x + w / 2; if (o.icon || (o.done > .5 && o.doneLabel)) { const tw = (g.font = font(o.size || 38, 700), g.measureText(lab).width); lx += 26; icon(g, o.done > .5 ? 'check' : o.icon, x + w / 2 - tw / 2 - 12, y + h / 2, 38, col, 3.2); }
    text(g, lab, lx, y + h / 2 + 1, { size: o.size || 38, weight: 700, col, al: 'center', a: ta, max: w - 80 });
    g.restore();
  }
  function lerp01col(a, b, p) { const pa = hex(a), pb = hex(b); return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], cl(p)))).join(',')})`; }
  function hex(c) { c = c.replace('#', ''); return [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16)); }
  function toggle(g, x, y, on) { const p = cl(on), w = 104, h = 60; fill(g, x, y, w, h, 30, lerp01col(P.bar2, P.ok, p)); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 30 + p * 44, y + 30, 25, 0, PI2); g.fill(); }
  // поле ввода: печатает value к моменту t; caret мигает, пока поле в фокусе
  function field(g, o, t) {
    const { x, y, w } = o, h = o.h || 116; card(g, x, y, w, h, { r: 26, col: P.surface }); stroke(g, x, y, w, h, 26, o.focus ? P.accent : P.line, o.focus ? 3 : 2);
    if (o.label) text(g, o.label, x + 34, y - 30, { size: 28, weight: 600, col: P.mute });
    const v = o.value || '', s = o.t0 == null ? v : typed(v, t, o.t0, o.cps || 12), size = o.size || 42;
    const tw = s ? text(g, s + (o.unit && s ? ' ' + o.unit : ''), x + 34, y + h / 2, { size, weight: 650 }) : (o.ph ? text(g, o.ph, x + 34, y + h / 2, { size, weight: 500, col: P.faint }) * 0 : 0);
    if (o.focus && (Math.floor(t * 2.2) % 2 === 0 || (o.t0 != null && t < o.t0 + v.length / (o.cps || 12) + .2))) { g.fillStyle = P.accent; g.fillRect(x + 36 + (s ? tw : 0), y + h / 2 - size * .6, 4, size * 1.2); }
  }
  function chip(g, x, y, s, o = {}) { g.font = font(o.size || 28, 650); const w = g.measureText(s).width + (o.icon ? 96 : 56), h = (o.size || 28) * 2; const xx = o.al === 'center' ? x - w / 2 : o.al === 'right' ? x - w : x; fill(g, xx, y - h / 2, w, h, h / 2, o.bg || P.accentP); if (o.icon) icon(g, o.icon, xx + 40, y, 30, o.col || P.accent, 2.6); text(g, s, xx + (o.icon ? 66 : 28), y + 1, { size: o.size || 28, weight: 650, col: o.col || P.accent }); return w; }
  function badge(g, cx, cy, n, col) { const s = String(n), r = 22; g.font = font(26, 700); const w = Math.max(r * 2, g.measureText(s).width + 22); fill(g, cx - w / 2, cy - r, w, r * 2, r, col || P.bad); text(g, s, cx, cy + 1, { size: 26, weight: 700, col: '#fff', al: 'center' }); }
  // число, которое набегает (единица мелко и рядом, не на своей строке)
  function amount(g, t, o) {
    const v = o.at == null ? o.v : count(t, o.at, o.dur || .9, o.from || 0, o.v), s = fmt(v, o.dec || 0);
    g.font = font(o.size || 96, 750); const nw = g.measureText(s).width; g.font = font((o.size || 96) * .5, 650); const uw = o.unit ? g.measureText(o.unit).width + 14 : 0;
    const total = nw + uw, x0 = o.al === 'center' ? o.x - total / 2 : o.al === 'right' ? o.x - total : o.x;
    text(g, s, x0, o.y, { size: o.size || 96, weight: 750, col: o.col || P.ink, base: 'alphabetic' });
    if (o.unit) text(g, o.unit, x0 + nw + 14, o.y, { size: (o.size || 96) * .5, weight: 650, col: o.ucol || P.mute, base: 'alphabetic' });
  }
  // тост/уведомление, выезжает сверху экрана
  function toast(g, t, o) {
    const p = vis(t, o.t0, o.t1, .45, .3); if (p <= 0) return; const w = o.w || 760, h = o.h || 140, x = o.x - w / 2, y = o.y - (1 - sp(pr(t, o.t0, o.t0 + .6))) * 60;
    g.save(); g.globalAlpha *= p; shadow(g, x, y, w, h, 34, 1.2); fill(g, x, y, w, h, 34, P.surface); stroke(g, x, y, w, h, 34, P.line, 2);
    tile(g, o.icon || 'check', x + 72, y + h / 2, 76, o.col || P.ok, o.bg || P.okP);
    text(g, o.s, x + 134, y + h / 2 - (o.sub ? 20 : 0), { size: 34, weight: 700, max: w - 170 });
    if (o.sub) text(g, o.sub, x + 134, y + h / 2 + 24, { size: 27, weight: 500, col: P.mute, max: w - 170 });
    g.restore();
  }
  // пузырь чата: me — справа акцентом; text печатается от t0
  function bubble(g, t, o) {
    const p = spring(t, o.t0, .5); if (p <= 0) return 0; const size = o.size || 34, maxW = o.maxW || 560;
    g.font = font(size, 500); const words = String(o.s).split(' '), ls = []; let cur = '';
    for (const wd of words) { const tt = cur ? cur + ' ' + wd : wd; if (g.measureText(tt).width > maxW - 60 && cur) { ls.push(cur); cur = wd; } else cur = tt; } ls.push(cur);
    const w = Math.min(maxW, Math.max(...ls.map(l => g.measureText(l).width)) + 60), h = ls.length * size * 1.3 + 44, x = o.me ? o.x - w : o.x, y = o.y;
    g.save(); g.globalAlpha *= cl(p * 1.4); g.translate(o.me ? x + w : x, y + h); g.scale(lerp(.85, 1, p), lerp(.85, 1, p)); g.translate(-(o.me ? x + w : x), -(y + h));
    fill(g, x, y, w, h, 34, o.me ? P.accent : P.surface); if (!o.me) stroke(g, x, y, w, h, 34, P.line, 2);
    ls.forEach((l, i) => text(g, l, x + 30, y + 22 + size * .65 + i * size * 1.3, { size, weight: 500, col: o.me ? '#fff' : P.ink }));
    g.restore(); return h;
  }
  // аннотация: тонкая выноска от точки к подписи
  function note(g, t, o) {
    const p = ap(t, o.t0, .5), q = ap(t, o.t0 + .25, .35); if (p <= 0) return;
    g.save(); g.strokeStyle = o.col || P.accent; g.lineWidth = 3; g.setLineDash([]);
    g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(lerp(o.x, o.tx, p), lerp(o.y, o.ty, p)); g.stroke();
    g.fillStyle = o.col || P.accent; g.beginPath(); g.arc(o.x, o.y, 9, 0, PI2); g.fill();
    if (q > 0) { g.globalAlpha *= q; chip(g, o.tx, o.ty, o.s, { al: o.al || 'center', bg: o.col || P.accent, col: '#fff', size: o.size || 30 }); }
    g.restore();
  }
  // ---------- палец и курсор ----------
  // path: [[t, x, y], …] (движение с пружинной доводкой между ключами), taps: [t, …] — нажатия
  function pointer(g, t, o) {
    const pth = o.path; if (!pth || !pth.length) return; const a0 = o.t0 == null ? pth[0][0] - .3 : o.t0;
    let x = pth[0][1], y = pth[0][2];
    for (let i = 1; i < pth.length; i++) { const [tt, nx, ny, d] = pth[i]; const dd = d || .6; if (t < tt - dd) break; const p = eio(pr(t, tt - dd, tt)); x = lerp(x, nx, p); y = lerp(y, ny, p); }
    const vin = vis(t, a0, o.t1, .3, .3); if (vin <= 0) return;
    let press = 0; for (const tp of o.taps || []) { const d = t - tp; if (d > -.12 && d < .3) press = Math.max(press, Math.sin(PI * cl((d + .12) / .42))); }
    g.save(); g.globalAlpha *= vin;
    // круги от нажатия
    for (const tp of o.taps || []) { const d = t - tp; if (d >= 0 && d < .6) { const p = d / .6; g.strokeStyle = (o.kind === 'cursor' ? P.ink : '#FFFFFF'); g.globalAlpha = vin * (1 - p) * .9; g.lineWidth = 6; g.beginPath(); g.arc(x, y, 30 + p * 70, 0, PI2); g.stroke(); g.globalAlpha = vin; } }
    if (o.kind === 'cursor') {
      const s = (o.size || 1.6) * (1 - .12 * press); g.translate(x, y); g.scale(s, s);
      const c = new Path2D('M0 0L0 34L9 26L15 40L21 37L15 24L27 24Z');
      g.lineJoin = 'round'; g.strokeStyle = '#fff'; g.lineWidth = 5; g.stroke(c); g.fillStyle = '#111'; g.fill(c);
    } else { // палец: полупрозрачное пятно касания
      const r = (o.size || 46) * (1 - .18 * press);
      g.fillStyle = 'rgba(20,23,28,.18)'; g.beginPath(); g.arc(x + 4, y + 8, r + 8, 0, PI2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.arc(x, y, r, 0, PI2); g.fill();
      g.strokeStyle = 'rgba(20,23,28,.28)'; g.lineWidth = 3; g.stroke();
    }
    g.restore();
    return { x, y, press };
  }
  // ---------- камера и сцена ----------
  // cam: [[t, cx, cy, zoom, dur?], …] — точка (cx,cy) в центре кадра (540, 1150) с зумом
  function camera(g, t, keys, o = {}) {
    if (!keys || !keys.length) return; const fx = o.fx || 540, fy = o.fy || 1150;
    let [cx, cy, z] = [keys[0][1], keys[0][2], keys[0][3]];
    for (let i = 1; i < keys.length; i++) { const [tt, nx, ny, nz, d] = keys[i]; const dd = d || .9; if (t < tt) break; const p = eio(pr(t, tt, tt + dd)); cx = lerp(cx, nx, p); cy = lerp(cy, ny, p); z = lerp(z, nz, p); }
    g.translate(fx, fy); g.scale(z, z); g.translate(-cx, -cy);
  }
  // подложка кадра: тихое поле с едва заметной сеткой точек (сцена, а не плашка под окном)
  function ground(g, o = {}) {
    g.fillStyle = o.col || P.ground; g.fillRect(0, 0, W, H);
    if (o.dots !== false) { g.fillStyle = P.ground2; for (let y = 30; y < H; y += 60) for (let x = 30; x < W; x += 60) g.fillRect(x - 2, y - 2, 4, 4); }
  }
  // заголовок ролика сверху (зона 120…520): слова появляются в такт, *ключ — акцентом; '|' — перенос
  function head(g, t, o) {
    let size = o.size || 92; const y0 = o.y || 250, al = o.al || 'left', x = al === 'center' ? 540 : 64, maxW = o.max || 952;
    const rows = String(o.s).split('|'); let k = 0;
    const clean = r => r.trim().split(/\s+/).map(wd => wd.replace(/^\*/, '').replace(/@[\d.]+$/, '')).join(' ');
    for (;;) { g.font = font(size, 780); if (size <= 40 || Math.max(...rows.map(r => g.measureText(clean(r)).width)) <= maxW) break; size -= 4; }
    const lh = size * 1.12;
    g.font = font(size, 780);
    rows.forEach((r, ri) => {
      const ws = r.trim().split(/\s+/); let widths = ws.map(wd => (g.font = font(size, 780), g.measureText(wd.replace(/^\*/, '').replace(/@[\d.]+$/, '')).width));
      const full = widths.reduce((a, b) => a + b, 0) + (ws.length - 1) * size * .26; let cx = al === 'center' ? x - full / 2 : x;
      ws.forEach((wd, wi) => {
        const m = wd.match(/^(\*?)(.*?)(?:@([\d.]+))?$/), key = !!m[1], word = m[2], at = (o.t0 || 0) + (m[3] != null ? +m[3] : k * .12);
        const p = ap(t, at, .4), out = o.t1 != null ? 1 - eo(pr(t, o.t1, o.t1 + .25)) : 1;
        if (p > 0 && out > 0) text(g, word, cx, y0 + ri * lh + (1 - p) * 26, { size, weight: 780, col: key ? (o.keyCol || P.accent) : P.ink, a: p * out, base: 'alphabetic' });
        cx += widths[wi] + size * .26; k++;
      });
    });
    return y0 + (rows.length - 1) * lh;
  }
  // мягкое затухание к краю (вместо обрезки окна по прямой)
  function fade(g, x, y, w, h, side = 'bottom', col) {
    const c = col || P.ground, gr = side === 'bottom' ? g.createLinearGradient(0, y, 0, y + h) : g.createLinearGradient(x, 0, x + w, 0);
    gr.addColorStop(0, hexA(c, 0)); gr.addColorStop(1, hexA(c, 1)); g.fillStyle = gr; g.fillRect(x, y, w, h);
  }
  function hexA(c, a) { const [r, gg, b] = hex(c); return `rgba(${r},${gg},${b},${a})`; }
  // сцены: [{t0, draw(g, t, lt)}] — рисует текущую и уходящую (перекрытие td) со сдвигом
  function run(g, t, SC, o = {}) {
    let i = 0; while (i < SC.length - 1 && t >= SC[i + 1].t0) i++;
    const td = o.td || .45, cur = SC[i], lt = t - cur.t0, prev = SC[i - 1];
    if (prev && lt < td && cur.in === 'push') { const p = eio(lt / td), dw = o.pushW || W; g.save(); g.translate(-p * dw * .3, 0); prev.draw(g, t, t - prev.t0); g.fillStyle = `rgba(0,0,0,${(.12 * p).toFixed(3)})`; g.fillRect(-W, -H, 3 * W, 3 * H); g.restore(); g.save(); g.translate((1 - p) * dw, 0); cur.draw(g, t, lt); g.restore(); }
    else if (prev && lt < td && cur.in !== 'cut') { const p = eio(lt / td); g.save(); g.globalAlpha *= 1 - p; g.translate(cur.in === 'push' ? -p * 160 : 0, cur.in === 'push' ? 0 : -p * 40); prev.draw(g, t, t - prev.t0); g.restore(); g.save(); g.globalAlpha *= p; g.translate(cur.in === 'push' ? (1 - p) * 160 : 0, cur.in === 'push' ? 0 : (1 - p) * 40); cur.draw(g, t, lt); g.restore(); }
    else cur.draw(g, t, lt);
    return { i, lt };
  }
  function begin(t, k, o = {}) { K = k; P = Object.assign({}, THEMES[o.theme || 'light'], o.accent ? { accent: o.accent, accentP: o.accentP || hexA(o.accent, .12) } : {}); const g = k.g; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash([]); return g; }
  function finish(g) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; }

  return {
    W, H, get P() { return P; }, THEMES, F,
    cl, pr, lerp, eo, eo5, eio, sp, spring, ap, vis, stag, kf, step, hash, fmt, count, typed,
    rr, fill, stroke, shadow, font, text, bar, lines, icon, tile, avatar, ICONS,
    phone, win, card, navbar, row, button, toggle, field, chip, badge, amount, toast, bubble, note,
    pointer, camera, ground, head, fade, run, begin, finish, mix: lerp01col,
  };
})();
