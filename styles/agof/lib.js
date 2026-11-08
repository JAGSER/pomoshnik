// Стиль «Пиксельный офис» (AGOF). Одна константа.
const AGOF = (() => {
  const M = (() => {
  const SANS = '"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif';
  const SERIF = '"DejaVu Serif",Georgia,"Noto Serif","Times New Roman",serif';
  const MONO = '"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace';
  const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const eo = (x) => 1 - Math.pow(1 - cl(x), 3);
  const eio = (x) => { x = cl(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  // пружина 0→1 с лёгким перелётом
  const sp = (x, k = 1) => { if (x <= 0) return 0; return 1 - Math.exp(-6 * x) * Math.cos(9 * k * x); };
  const pr = (t, a, b) => cl((t - a) / (b - a));
  const mix = (a, b, x) => a + (b - a) * x;
  const font = (size, w = 800, kind) => `${w} ${Math.round(size)}px ${kind === 'mono' ? MONO : kind === 'serif' ? SERIF : SANS}`;
  function rr(g, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  // сцена по списку склеек
  function scene(t, cuts) { let i = 0; while (i < cuts.length - 1 && t >= cuts[i + 1]) i++; return { i, lt: t - cuts[i], dur: (cuts[i + 1] || 1e9) - cuts[i] }; }
  // раскладка текста: *слово* = ключевое; без одиночного слова в последней строке
  function layout(g, text, size, w, weight, kind) {
    let open = false; const words = text.split(/\s+/).filter(Boolean).map((s) => { const st = s.startsWith('*'), en = /\*[,.!?:»]*$/.test(s); const key = open || st; if (st && !en) open = true; if (en) open = false; return { key, s: s.replace(/\*/g, '') }; });
    let fs = size;
    for (let tries = 0; tries < 12; tries++) {
      g.font = font(fs, weight, kind); const sw = g.measureText(' ').width;
      const lines = [[]]; let lw = 0, ok = true;
      for (const wd of words) {
        wd.w = g.measureText(wd.s).width; if (wd.w > w) ok = false;
        if (lines[lines.length - 1].length && lw + sw + wd.w > w) { lines.push([]); lw = 0; }
        lw += (lw ? sw : 0) + wd.w; lines[lines.length - 1].push(wd);
      }
      for (let li = 0; li < lines.length - 1; li++) { const L2 = lines[li]; if (L2.length > 1 && L2[L2.length - 1].s.replace(/[^\p{L}]/gu, '').length <= 2) lines[li + 1].unshift(L2.pop()); }
      if (lines.length > 1 && lines[lines.length - 1].length === 1 && lines[lines.length - 2].length > 2) lines[lines.length - 1].unshift(lines[lines.length - 2].pop());
      if (ok) return { lines, fs, sw };
      fs *= 0.9;
    }
    g.font = font(fs, weight, kind); return { lines: [words], fs, sw: g.measureText(' ').width };
  }
  // текст по словам: o = {w, align, color, key, keyBg, weight, lh, step, kind, out}
  function words(g, text, x, y, size, t, t0, o = {}) {
    const align = o.align || 'left', w = o.w || (align === 'center' ? 2 * Math.min(x - 60, 1020 - x) : 1020 - x);
    const L = layout(g, text, size, w, o.weight || 800, o.kind); const lh = L.fs * (o.lh || 1.12);
    const out = o.out == null ? 1 : o.out; if (out <= 0) return y;
    g.save(); g.font = font(L.fs, o.weight || 800, o.kind); g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    let n = 0;
    L.lines.forEach((line, li) => {
      const lw = line.reduce((a, b) => a + b.w, 0) + L.sw * (line.length - 1);
      let cx = align === 'center' ? x - lw / 2 : align === 'right' ? x - lw : x; const by = y + li * lh + L.fs * 0.8;
      for (const wd of line) {
        const p = eo((t - t0 - n * (o.step || 0.07)) / 0.3); n++;
        if (p > 0) {
          g.globalAlpha = p * out;
          if (wd.key && o.keyBg) { g.fillStyle = o.keyBg; rr(g, cx - L.fs * 0.12, by - L.fs * 0.86, (wd.w + L.fs * 0.24) * eo((t - t0 - n * 0.07) / 0.35), L.fs * 1.08, L.fs * 0.16); g.fill(); }
          g.fillStyle = wd.key ? (o.key || '#E4572E') : (o.color || '#111');
          g.fillText(wd.s, cx, by + (1 - p) * L.fs * 0.35);
          if (wd.key && o.under) { g.fillRect(cx, by + L.fs * 0.14, wd.w * eo((t - t0 - n * 0.07 - 0.15) / 0.3), Math.max(4, L.fs * 0.07)); }
        }
        cx += wd.w + L.sw;
      }
    });
    g.restore(); return y + L.lines.length * lh;
  }
  function cursor(g, x, y, press, s = 1) {
    g.save(); g.translate(x, y); g.scale(s * (1 - 0.12 * press), s * (1 - 0.12 * press));
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 58); g.lineTo(15, 45); g.lineTo(26, 70); g.lineTo(37, 65); g.lineTo(26, 41); g.lineTo(44, 41); g.closePath();
    g.fillStyle = '#111'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#fff'; g.stroke(); g.restore();
    if (press > 0) { g.save(); g.globalAlpha = (1 - press) * 0.6; g.strokeStyle = '#111'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 20 + 40 * press, 0, 7); g.stroke(); g.restore(); }
  }
  // камера: оседание после склейки + медленный наезд
  function cam(g, lt, cx = 540, cy = 960, k = 1) { const s = 1 + 0.06 * (1 - eo(lt / 0.6)) * k + 0.012 * lt * k; g.translate(cx, cy); g.scale(s, s); g.translate(-cx, -cy); return s; }
  // целый счётчик
  function count(v) { return Math.round(v).toLocaleString('ru-RU').replace(/ /g, ' '); }
  // зерно (кэш)
  let GR = null;
  function grain(g, a = 0.06, seed = 1) {
    if (!GR) { GR = new OffscreenCanvas(270, 480); const c = GR.getContext('2d'); let s = 7; for (let i = 0; i < 9000; i++) { s = (s * 16807) % 2147483647; const x = s % 270; s = (s * 16807) % 2147483647; const y = s % 480; c.fillStyle = i % 2 ? '#000' : '#fff'; c.fillRect(x, y, 1, 1); } }
    g.save(); g.globalAlpha = a; g.imageSmoothingEnabled = false; const o = (Math.floor(seed * 7) % 4) * 3; g.drawImage(GR, -o, -o, 1080 + 12, 1920 + 12); g.restore();
  }
  // склейки -> звуки
  function cutSounds(s, cuts, name = 'kalimba_run', v = 0.14) { cuts.slice(1).forEach((c) => s.play(c, name, v)); }
  return { SANS, SERIF, MONO, cl, eo, eio, sp, pr, mix, font, rr, scene, layout, words, cursor, cam, count, grain, cutSounds };
})();
  const C = { cream: '#FBF3DC', sand: '#EDE6D4', yellow: '#FFD84D', ink: '#141414', orange: '#F28C28', white: '#FFFFFF', line: '#E9DFC4', muted: '#8A8170', blue: '#4A6FDC', pink: '#E2557B', green: '#2BB673', violet: '#9B5CF6', teal: '#2AA6C9', term: '#1C1C1C' };
  const { cl, eo, eio, sp, mix, font, rr } = M;
  const AG = [['#4A6FDC', '#3A2618'], ['#E2557B', '#8B3A1E'], ['#2BB673', '#141414'], ['#9B5CF6', '#E8B04B'], ['#F28C28', '#5B3A29'], ['#2AA6C9', '#2B1B12']];
  function out(lt, dur, last) { return last ? 1 : 1 - eo((lt - (dur - 0.25)) / 0.2); }
  // пиксельный аватар 8×8 в жёлтой рамке; j 0..5 выбирает рубашку и волосы, моргает сам
  function ava(g, x, y, s, j, t) { const [shirt, hair] = AG[((j % 6) + 6) % 6]; const px = s / 8; g.save(); g.translate(x - s / 2, y - s / 2); g.fillStyle = C.yellow; rr(g, -px, -px, s + 2 * px, s + 2 * px, px * 2); g.fill(); const R = (cx, cy, w, h, c) => { g.fillStyle = c; g.fillRect(cx * px, cy * px, w * px, h * px); };
    R(2, 1, 4, 1, hair); R(1, 2, 6, 1, hair); R(2, 2, 4, 3, '#F2C29C'); R(1, 3, 1, 2, hair); R(6, 3, 1, 2, hair); const bl = (t + j) % 3 > 2.85; R(3, 3, 1, bl ? 0.3 : 1, C.ink); R(5, 3, 1, bl ? 0.3 : 1, C.ink); R(3, 4.4, 2, 0.4, '#B3624B'); R(1, 5, 6, 3, shirt); R(3.5, 5, 1, 2, C.white); g.restore(); }
  // жирный заголовок по центру, *ключ* на жёлтом маркере
  function head(g, s, t, t0, o = {}) { return M.words(g, s, 540, o.y || 300, o.size || 92, t, t0, { align: 'center', color: C.ink, key: C.ink, keyBg: C.yellow, weight: 900, w: 940 }); }
  // белая карточка с мягкой тенью и обводкой
  function card(g, x, y, w, h, r = 20) { g.fillStyle = 'rgba(0,0,0,0.06)'; rr(g, x + 4, y + 10, w, h, r); g.fill(); g.fillStyle = C.white; rr(g, x, y, w, h, r); g.fill(); g.strokeStyle = C.line; g.lineWidth = 2; g.stroke(); }
  // карточка-навык: цветной квадрат + подпись, p пружина
  function skill(g, s, x, y, j, p) { if (p <= 0) return; g.save(); g.translate(x + 130, y + 70); g.scale(p, p); card(g, -130, -70, 260, 140); g.fillStyle = [C.orange, C.blue, C.green, C.violet][j % 4]; rr(g, -110, -40, 50, 50, 12); g.fill(); g.fillStyle = C.ink; g.font = font(32, 800); g.textAlign = 'left'; g.fillText(s, -110, 50); g.restore(); }
  // полосы-прогресс в карточке: rows [[подпись, 0..1, цвет]]
  function bars(g, rows, x, y, w, t, t0) { card(g, x, y, w, 120 + rows.length * 140); rows.forEach(([n, v, c], j) => { const p = eio((t - t0 - j * 0.2) / 0.9); g.fillStyle = C.ink; g.font = font(36, 700); g.textAlign = 'left'; g.fillText(n, x + 50, y + 110 + j * 140); g.fillStyle = '#F1ECDD'; rr(g, x + 280, y + 80 + j * 140, w - 330, 44, 22); g.fill(); g.fillStyle = c; rr(g, x + 280, y + 80 + j * 140, (w - 330) * v * p, 44, 22); g.fill(); }); }
  // тёмный терминал, строки появляются по очереди
  function terminal(g, lines, x, y, w, h, t, t0) { g.fillStyle = C.term; rr(g, x, y, w, h, 22); g.fill(); lines.forEach((s, j) => { const q = eo((t - t0 - j * 0.25) / 0.2); g.save(); g.globalAlpha *= q; g.fillStyle = j ? '#8F8F8F' : '#E6E6E6'; g.font = font(34, 500, 'mono'); g.textAlign = 'left'; g.fillText(s, x + 40, y + 90 + j * 76); g.restore(); }); }
  // печать текста по буквам
  function type(g, s, x, y, size, t, t0, d = 0.8, o = {}) { const n = Math.floor(s.length * cl((t - t0) / d)); g.fillStyle = o.color || C.ink; g.font = font(size, 900); g.textAlign = o.align || 'left'; g.fillText(s.slice(0, n), x, y); }
  // пиксельный офис: столы, аватары работают, бегают «задачи»
  function office(g, x, y, w, h, t, lt, task = 'задача') { card(g, x, y, w, h); g.fillStyle = '#D9E8C8'; g.fillRect(x + 30, y + 30, w - 60, h - 60); const cw = (w - 60) / 3, rh = (h - 60) / 4; for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { const dx = x + 30 + c * cw + cw / 2, dy = y + 30 + r * rh; g.fillStyle = '#B98F5E'; g.fillRect(dx - 90, dy + 70, 180, 40); g.fillStyle = '#2C3E50'; g.fillRect(dx - 30, dy + 30, 60, 40); const j = r * 3 + c; if (j < 6) ava(g, dx, dy + 140 - Math.abs(Math.sin(t * 4 + j)) * 6, 60, j, t); }
    for (let j = 0; j < 3; j++) { const p = (lt * 0.4 + j / 3) % 1; g.fillStyle = C.white; rr(g, x + 120 + p * (w - 280), y + 220 + j * rh, 90, 40, 8); g.fill(); g.fillStyle = C.ink; g.font = font(20, 700); g.textAlign = 'center'; g.fillText(task, x + 165 + p * (w - 280), y + 246 + j * rh); } }
  // орбита из карточек-подписей вокруг центра
  function orbit(g, labels, cx, cy, r, lt) { labels.forEach((s, j) => { const a = j / labels.length * 6.283 + lt * 0.4, rr2 = r * eio((lt - j * 0.05) / 0.6); const x = cx + Math.cos(a) * rr2, y = cy + Math.sin(a) * rr2; g.strokeStyle = C.line; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(x, y); g.stroke(); card(g, x - 95, y - 40, 190, 80); g.fillStyle = C.ink; g.font = font(28, 800); g.textAlign = 'center'; g.fillText(s, x, y + 10); }); }
  // кнопка с обводкой растёт из центра
  function cta(g, s, y, t, t0) { const c = sp((t - t0) / 0.4); if (c <= 0) return; g.fillStyle = C.yellow; rr(g, 540 - 240 * c, y, 480 * c, 120, 60); g.fill(); g.strokeStyle = C.ink; g.lineWidth = 4; g.stroke(); g.save(); g.globalAlpha *= cl(c); g.fillStyle = C.ink; g.font = font(46, 900); g.textAlign = 'center'; g.fillText(s, 540, y + 76); g.restore(); }
  return Object.assign({}, M, { C, out, ava, head, card, skill, bars, terminal, type, office, orbit, cta });
})();
