// Стиль «Финансовый канал» (FINS). Одна константа.
const FINS = (() => {
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
  const C = { dark: '#0B110E', panel: '#141C18', line: '#24302A', yellow: '#F7D23E', red: '#F04E37', green: '#3CCB7F', text: '#F2F0E6', muted: '#7E8A82', orange: '#FF9A3C', ink: '#1A1A1A', faded: '#5A5040' };
  const { cl, eo, eio, sp, mix, font, rr } = M;
  // тёмный фон с горизонтальными линиями (yellow = true: жёлтый фон)
  function bg(g, yellow) { g.fillStyle = yellow ? C.yellow : C.dark; g.fillRect(0, 0, 1080, 1920); if (!yellow) { g.strokeStyle = 'rgba(255,255,255,0.03)'; g.lineWidth = 2; for (let y = 400; y < 1700; y += 100) { g.beginPath(); g.moveTo(0, y); g.lineTo(1080, y); g.stroke(); } } }
  // шапка канала: точка + имя; n '01'..'04' добавляет «рубрика n / total» и полосу
  function top(g, name, n, total = 4, label = 'НА КАНАЛЕ') { g.fillStyle = C.red; g.beginPath(); g.arc(80, 160, 8, 0, 7); g.fill(); g.fillStyle = C.muted; g.font = font(24, 700, 'mono'); g.textAlign = 'left'; g.fillText(name, 100, 168); if (n) { g.fillStyle = C.yellow; g.fillText(label, 80, 250); g.fillStyle = C.muted; g.textAlign = 'right'; g.fillText(n + ' / ' + String(total).padStart(2, '0'), 1000, 250); g.fillStyle = C.line; g.fillRect(80, 270, 920, 4); g.fillStyle = C.yellow; g.fillRect(80, 270, 920 / total * +n, 4); } }
  // крупное слово капсом слева, сам ужимается до 920
  function word(g, s, y, t, t0, col = C.text, size = 110) { const p = eo((t - t0) / 0.35); if (p <= 0) return; g.save(); g.globalAlpha *= p; g.fillStyle = col; let sz = size; g.font = font(sz, 900); while (g.measureText(s).width > 920 && sz > 40) { sz -= 4; g.font = font(sz, 900); } g.textAlign = 'left'; g.fillText(s, 80, y + (1 - p) * 40); g.restore(); }
  // подпись мелким серым под словом
  function note(g, s, y, col = C.muted) { g.fillStyle = col; g.font = font(34, 500); g.textAlign = 'left'; g.fillText(s, 80, y); }
  // красное зачёркивание
  function strike(g, x, y, w, t, t0) { const p = eo((t - t0) / 0.3); if (p <= 0) return; g.fillStyle = C.red; g.fillRect(x, y, w * p, 16); }
  // тёмная панель с обводкой
  function panel(g, x, y, w, h) { g.fillStyle = C.panel; g.strokeStyle = C.line; g.lineWidth = 2; rr(g, x, y, w, h, 24); g.fill(); g.stroke(); }
  // свечной график с жёлтой линией тренда в панели
  function candles(g, x, y, w, h, t, t0, o = {}) { panel(g, x, y, w, h); g.fillStyle = C.muted; g.font = font(22, 700, 'mono'); g.textAlign = 'left'; g.fillText(o.label || 'ИНДЕКС · ДЕНЬ', x + 40, y + 60); if (o.badge) { g.fillStyle = 'rgba(60,203,127,0.15)'; rr(g, x + w - 190, y + 32, 150, 40, 20); g.fill(); g.fillStyle = C.green; g.fillText(o.badge, x + w - 170, y + 60); }
    const N = 30, gp = eio((t - t0) / 1.2), base = y + h - 70, k = (h - 160); let v = 0.2; for (let j = 0; j < N * gp; j++) { const op = v, c = v + (Math.sin(j * 2.3) * 0.06 + 0.025); v = c; const cx = x + 50 + j * (w - 100) / N, y0 = base - op * k, y1 = base - c * k; g.strokeStyle = c > op ? C.green : C.red; g.lineWidth = 2; g.beginPath(); g.moveTo(cx + 8, Math.min(y0, y1) - 14); g.lineTo(cx + 8, Math.max(y0, y1) + 14); g.stroke(); g.fillStyle = c > op ? C.green : C.red; g.fillRect(cx, Math.min(y0, y1), 16, Math.max(4, Math.abs(y1 - y0))); }
    g.strokeStyle = C.yellow; g.lineWidth = 4; g.beginPath(); for (let j = 0; j < N * gp; j++) { const yy = base - (0.2 + j * 0.022) * k + 20, cx = x + 58 + j * (w - 100) / N; j ? g.lineTo(cx, yy) : g.moveTo(cx, yy); } g.stroke(); }
  // плитки-показатели 2×2: items [[подпись, значение, 0..1, цвет]]
  function metrics(g, items, y, t, t0) { items.slice(0, 4).forEach(([a, b, f, c], j) => { const x = 80 + (j % 2) * 470, yy = y + Math.floor(j / 2) * 440, p = sp((t - t0 - j * 0.1) / 0.5); if (p <= 0) return; g.save(); g.globalAlpha *= cl(p * 2); panel(g, x, yy, 450, 410); g.fillStyle = C.muted; g.font = font(28, 700, 'mono'); g.textAlign = 'left'; g.fillText(a, x + 40, yy + 70); g.fillStyle = c === C.yellow ? C.yellow : C.text; let sz = 130; g.font = font(sz, 900); while (g.measureText(b).width > 380 && sz > 50) { sz -= 6; g.font = font(sz, 900); } g.fillText(b, x + 36, yy + 240); g.fillStyle = C.line; rr(g, x + 40, yy + 320, 370, 12, 6); g.fill(); g.fillStyle = c; rr(g, x + 40, yy + 320, 370 * f * eo((t - t0 - 0.3) / 0.6), 12, 6); g.fill(); g.restore(); }); }
  // парные столбики в панели: pairs [[a 0..1, b 0..1]], legend [имяA, имяB], labels под столбиками
  function bars(g, pairs, legend, labels, x, y, w, h, t, t0) { panel(g, x, y, w, h); (legend || []).forEach((s, j) => { g.fillStyle = j ? C.red : C.yellow; g.fillRect(x + 50 + j * 240, y + 50, 24, 24); g.fillStyle = C.text; g.font = font(28, 600); g.textAlign = 'left'; g.fillText(s, x + 90 + j * 240, y + 72); }); const base = y + h - 110, k = h - 240, step = (w - 100) / pairs.length;
    pairs.forEach(([a, b], j) => { const p = eo((t - t0 - j * 0.12) / 0.5), bx = x + 60 + j * step; g.fillStyle = C.yellow; rr(g, bx, base - k * a * p, step * 0.35, k * a * p, 8); g.fill(); g.fillStyle = C.red; rr(g, bx + step * 0.4, base - k * b * p, step * 0.35, k * b * p, 8); g.fill(); g.fillStyle = C.muted; g.font = font(26, 700, 'mono'); g.textAlign = 'center'; g.fillText((labels || [])[j] || '', bx + step * 0.37, base + 60); }); }
  // кривая роста со свечением и множителем: от ×1 до ×max
  function curve(g, t, t0, o = {}) { const x0 = o.x || 120, w = o.w || 840, y0 = o.y || 1450, h = o.h || 700, mx = o.max || 10.8, gp = eio((t - t0) / (o.d || 1.8)); const b = Math.pow(mx, 0.1), X = (u) => x0 + u * w, Y = (u) => y0 - (Math.pow(b, u * 10) - 1) / (mx - 1) * h;
    g.strokeStyle = C.line; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + w, y0); g.stroke(); const gr = g.createLinearGradient(0, y0 - h, 0, y0); gr.addColorStop(0, 'rgba(247,210,62,0.35)'); gr.addColorStop(1, 'rgba(247,210,62,0)'); g.beginPath(); g.moveTo(X(0), y0); for (let q = 0; q <= 60 * gp; q++) g.lineTo(X(q / 60), Y(q / 60)); g.lineTo(X(gp), y0); g.closePath(); g.fillStyle = gr; g.fill();
    g.save(); g.strokeStyle = C.yellow; g.lineWidth = 7; g.shadowColor = C.yellow; g.shadowBlur = 20; g.beginPath(); for (let q = 0; q <= 60 * gp; q++) q ? g.lineTo(X(q / 60), Y(q / 60)) : g.moveTo(X(0), Y(0)); g.stroke(); g.restore(); g.fillStyle = C.yellow; g.beginPath(); g.arc(X(gp), Y(gp), 16, 0, 7); g.fill();
    const m = Math.pow(b, gp * 10); g.font = `italic 700 90px ${M.SERIF}`; g.textAlign = 'right'; g.fillText('×' + m.toFixed(1).replace('.', ','), x0 + w - 40, y0 - h - 30); g.fillStyle = C.muted; g.font = font(24, 700, 'mono'); g.textAlign = 'center'; (o.ticks || ['0', '10', '20', '30 ЛЕТ']).forEach((s, j, A) => g.fillText(s, x0 + j * w / (A.length - 1), y0 + 50)); }
  // огонёк (символ канала), колышется
  function flame(g, x, y, s, t) { if (s <= 0) return; g.save(); g.translate(x, y); g.scale(s, s); const f = (c, k, o) => { g.fillStyle = c; g.beginPath(); g.moveTo(0, 120 * k); g.bezierCurveTo(-110 * k, 110 * k, -120 * k, -10 * k, -40 * k, -80 * k + o); g.bezierCurveTo(-40 * k, -30 * k, -10 * k, -20 * k, 0, -40 * k); g.bezierCurveTo(10 * k, -110 * k, 60 * k, -150 * k, 50 * k, -160 * k + o); g.bezierCurveTo(130 * k, -80 * k, 120 * k, 100 * k, 0, 120 * k); g.fill(); }; f(C.ink, 1.15, 0); f(C.red, 1, 6 * Math.sin(t * 8)); f(C.orange, 0.7, 5 * Math.sin(t * 9 + 1)); f(C.yellow, 0.42, 4 * Math.sin(t * 10 + 2)); g.restore(); }
  // жёлтые лучи-взрыв на весь кадр
  function burst(g, t, cx = 540, cy = 900) { g.save(); g.translate(cx, cy); g.rotate(t * 0.4); for (let j = 0; j < 24; j++) { g.rotate(Math.PI / 12); g.fillStyle = j % 2 ? '#F5C421' : '#FBE06A'; g.beginPath(); g.moveTo(0, 0); g.lineTo(1400, -180); g.lineTo(1400, 180); g.closePath(); g.fill(); } g.restore(); }
  // антиквенные буквы по одной, по центру
  function letters(g, s, y, size, t, t0, col = C.yellow) { g.font = `700 ${size}px ${M.SERIF}`; g.textAlign = 'left'; let lx = 540 - g.measureText(s).width / 2; [...s].forEach((c, j) => { const p = sp((t - t0 - j * 0.12) / 0.5), cw = g.measureText(c).width; if (p > 0) { g.save(); g.globalAlpha *= cl(p * 2); g.fillStyle = col; g.fillText(c, lx, y + (1 - cl(p)) * 120); g.restore(); } lx += cw; }); }
  // карточка канала: имя, подзаголовок, кнопка подписки (on), три цифры stats [[число, подпись]]
  function profile(g, name, sub, stats, on, t, t0, o = {}) { const p = sp((t - t0) / 0.5); if (p <= 0) return; g.save(); g.translate(540, o.y || 900); g.scale(p, p); panel(g, -440, -280, 880, 560); g.fillStyle = C.yellow; g.beginPath(); g.arc(-300, -130, 90, 0, 7); g.fill(); flame(g, -300, -130, 0.5, t); g.fillStyle = C.text; g.font = font(50, 900); g.textAlign = 'left'; g.fillText(name, -180, -140); g.fillStyle = C.muted; g.font = font(28, 500); g.fillText(sub, -180, -90);
    g.fillStyle = on ? '#2A3A33' : C.yellow; rr(g, 160, -230, 240, 70, 35); g.fill(); g.fillStyle = on ? C.text : C.ink; g.font = font(30, 800); g.textAlign = 'center'; g.fillText(on ? 'Вы подписаны' : 'Подписаться', 280, -185); (stats || []).forEach(([a, b], j) => { g.fillStyle = C.text; g.font = font(48, 900); g.fillText(a, -300 + j * 300, 80); g.fillStyle = C.muted; g.font = font(24, 600); g.fillText(b, -300 + j * 300, 120); }); if (o.line) { g.fillStyle = C.muted; g.font = font(28, 500); g.fillText(o.line, 0, 220); } g.restore(); }
  return Object.assign({}, M, { C, bg, top, word, note, strike, panel, candles, metrics, bars, curve, flame, burst, letters, profile });
})();
