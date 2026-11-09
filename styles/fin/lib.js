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
  function top(g, name, n, total = 4, label = '') { g.fillStyle = C.red; g.beginPath(); g.arc(80, 160, 8, 0, 7); g.fill(); g.fillStyle = C.muted; g.font = font(24, 700, 'mono'); g.textAlign = 'left'; g.fillText(name, 100, 168); if (n) { g.fillStyle = C.yellow; g.fillText(label, 80, 250); g.fillStyle = C.muted; g.textAlign = 'right'; g.fillText(n + ' / ' + String(total).padStart(2, '0'), 1000, 250); g.fillStyle = C.line; g.fillRect(80, 270, 920, 4); g.fillStyle = C.yellow; g.fillRect(80, 270, 920 / total * +n, 4); } }
  // крупное слово капсом слева, сам ужимается до 920
  function word(g, s, y, t, t0, col = C.text, size = 110) { const p = eo((t - t0) / 0.35); if (p <= 0) return; g.save(); g.globalAlpha *= p; g.fillStyle = col; let sz = size; g.font = font(sz, 900); while (g.measureText(s).width > 920 && sz > 40) { sz -= 4; g.font = font(sz, 900); } g.textAlign = 'left'; g.fillText(s, 80, y + (1 - p) * 40); g.restore(); }
  // подпись мелким серым под словом
  function note(g, s, y, col = C.muted) { g.fillStyle = col; g.font = font(34, 500); g.textAlign = 'left'; g.fillText(s, 80, y); }
  // красное зачёркивание
  function strike(g, x, y, w, t, t0) { const p = eo((t - t0) / 0.3); if (p <= 0) return; g.fillStyle = C.red; g.fillRect(x, y, w * p, 16); }
  // тёмная панель с обводкой
  function panel(g, x, y, w, h) { g.fillStyle = C.panel; g.strokeStyle = C.line; g.lineWidth = 2; rr(g, x, y, w, h, 24); g.fill(); g.stroke(); }
  // свечной график с жёлтой линией тренда в панели
  function candles(g, x, y, w, h, t, t0, o = {}) { panel(g, x, y, w, h); g.fillStyle = C.muted; g.font = font(22, 700, 'mono'); g.textAlign = 'left'; if (o.label) g.fillText(o.label, x + 40, y + 60); if (o.badge) { g.fillStyle = 'rgba(60,203,127,0.15)'; rr(g, x + w - 190, y + 32, 150, 40, 20); g.fill(); g.fillStyle = C.green; g.fillText(o.badge, x + w - 170, y + 60); }
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
    const m = Math.pow(b, gp * 10); g.font = `italic 700 90px ${M.SERIF}`; g.textAlign = 'right'; g.fillText('×' + m.toFixed(1).replace('.', ','), x0 + w - 40, y0 - h - 30); g.fillStyle = C.muted; g.font = font(24, 700, 'mono'); g.textAlign = 'center'; (o.ticks || []).forEach((s, j, A) => g.fillText(s, x0 + j * w / (A.length - 1), y0 + 50)); }
  // огонёк (символ канала), колышется
  function flame(g, x, y, s, t) { if (s <= 0) return; g.save(); g.translate(x, y); g.scale(s, s); const f = (c, k, o) => { g.fillStyle = c; g.beginPath(); g.moveTo(0, 120 * k); g.bezierCurveTo(-110 * k, 110 * k, -120 * k, -10 * k, -40 * k, -80 * k + o); g.bezierCurveTo(-40 * k, -30 * k, -10 * k, -20 * k, 0, -40 * k); g.bezierCurveTo(10 * k, -110 * k, 60 * k, -150 * k, 50 * k, -160 * k + o); g.bezierCurveTo(130 * k, -80 * k, 120 * k, 100 * k, 0, 120 * k); g.fill(); }; f(C.ink, 1.15, 0); f(C.red, 1, 6 * Math.sin(t * 8)); f(C.orange, 0.7, 5 * Math.sin(t * 9 + 1)); f(C.yellow, 0.42, 4 * Math.sin(t * 10 + 2)); g.restore(); }
  // жёлтые лучи-взрыв на весь кадр
  function burst(g, t, cx = 540, cy = 900) { g.save(); g.translate(cx, cy); g.rotate(t * 0.4); for (let j = 0; j < 24; j++) { g.rotate(Math.PI / 12); g.fillStyle = j % 2 ? '#F5C421' : '#FBE06A'; g.beginPath(); g.moveTo(0, 0); g.lineTo(1400, -180); g.lineTo(1400, 180); g.closePath(); g.fill(); } g.restore(); }
  // антиквенные буквы по одной, по центру
  function letters(g, s, y, size, t, t0, col = C.yellow) { g.font = `700 ${size}px ${M.SERIF}`; g.textAlign = 'left'; let lx = 540 - g.measureText(s).width / 2; [...s].forEach((c, j) => { const p = sp((t - t0 - j * 0.12) / 0.5), cw = g.measureText(c).width; if (p > 0) { g.save(); g.globalAlpha *= cl(p * 2); g.fillStyle = col; g.fillText(c, lx, y + (1 - cl(p)) * 120); g.restore(); } lx += cw; }); }
  // карточка канала: имя, подзаголовок, кнопка подписки (on), три цифры stats [[число, подпись]]
  function profile(g, name, sub, stats, on, t, t0, o = {}) { const p = sp((t - t0) / 0.5); if (p <= 0) return; g.save(); g.translate(540, o.y || 900); g.scale(p, p); panel(g, -440, -280, 880, 560); g.fillStyle = C.yellow; g.beginPath(); g.arc(-300, -130, 90, 0, 7); g.fill(); if (o.icon) o.icon(g, -300, -130); else { g.fillStyle = C.ink; g.font = font(90, 900); g.textAlign = 'center'; g.fillText([...name][0] || '', -300, -98); } g.fillStyle = C.text; g.font = font(50, 900); g.textAlign = 'left'; g.fillText(name, -180, -140); g.fillStyle = C.muted; g.font = font(28, 500); g.fillText(sub, -180, -90);
    g.fillStyle = on ? '#2A3A33' : C.yellow; rr(g, 160, -230, 240, 70, 35); g.fill(); g.fillStyle = on ? C.text : C.ink; g.font = font(30, 800); g.textAlign = 'center'; const bt = o.btn || ['', '']; g.fillText(on ? bt[1] : bt[0], 280, -185); (stats || []).forEach(([a, b], j) => { g.fillStyle = C.text; g.font = font(48, 900); g.fillText(a, -300 + j * 300, 80); g.fillStyle = C.muted; g.font = font(24, 600); g.fillText(b, -300 + j * 300, 120); }); if (o.line) { g.fillStyle = C.muted; g.font = font(28, 500); g.fillText(o.line, 0, 220); } g.restore(); }
  // ===== Типовые объекты: плоская заливка цветами канала, тёмный контур C.dark отделяет фигуры друг от друга =====
  Object.assign(C, { blue: '#3D8BFF', pink: '#FF8FB1', purple: '#9B7BFF', brown: '#7A5136', ginger: '#E3792B', grey: '#9AA39E', white: '#F2F0E6', skin: '#E9B58C', skin2: '#B07A52', wood: '#6B4A2E', sea: '#12384A', night: '#0E1A24', pine: '#1F8A55', chalk: '#1E2B24' });
  const R = Math.PI / 180;
  function shade(c, k) { const n = parseInt(c.slice(1), 16), f = (v) => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k); return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join(''); }
  function hash(i, s = 1) { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); }
  // фигура с контуром: path(g) строит путь, col заливка
  function blob(g, path, col, e = C.dark, lw = 6) { g.beginPath(); path(g); if (e) { g.strokeStyle = e; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke(); } g.fillStyle = col; g.fill(); }
  function ell(g, x, y, rx, ry, col, e) { blob(g, (q) => q.ellipse(x, y, rx, ry, 0, 0, 7), col, e); }
  function line(g, pts, w, col) { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach((p, j) => j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); }
  function ik(a, b, L, side) { const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; if (d >= 2 * L) return m; const h = Math.sqrt(L * L - d * d / 4) * side; return [m[0] - dy / d * h, m[1] + dx / d * h]; }
  function fit(g, s, w, size, wt = 900, kind) { let z = size; g.font = font(z, wt, kind); while (g.measureText(s).width > w && z > 12) { z -= 2; g.font = font(z, wt, kind); } return z; }

  // человек; (x, y) точка между ступнями, s масштаб (взрослый ≈ 200 px при s = 1)
  // o: age 'adult'|'child'|'old', pose 'stand'|'walk'|'run'|'wave'|'sit'|'hold'|'ride', t, phase, dir 1|-1,
  //    shirt, pants, skin, hair, shoe, hat (каска/шапка), bag (рюкзак), long (длинные волосы), glasses, shout, cane, item(g, hx, hy) предмет в правой руке
  function person(g, x, y, s = 1, o = {}) {
    const age = o.age || 'adult', ch = age === 'child', old = age === 'old', k = ch ? 0.66 : 1;
    const skin = o.skin || C.skin, hair = o.hair || (old ? '#D9D9D0' : '#3A2A20'), shirt = o.shirt || C.yellow, pants = o.pants || '#3A4A56', shoe = o.shoe || '#202528';
    const pose = o.pose || 'stand', t = o.t || 0, ph = o.phase || 0, sw = Math.sin(t * 9 + ph);
    const legL = 84 * k, torL = 64 * k, hr = ch ? 19 : 19, tw = (ch ? 30 : 38) * (o.wide || 1), aw = 12 * k, lw = 15 * k;
    let hip = [0, -legL], lean = old ? 0.12 : 0, feet = [[-10 * k, 0], [10 * k, 0]];
    if (pose === 'walk' || pose === 'run') { const a = pose === 'run' ? 30 : 20; feet = [[-sw * a * k, 0], [sw * a * k, -Math.max(0, sw) * 8]]; hip = [0, -legL + 3 + Math.abs(sw) * 3]; lean += pose === 'run' ? 0.2 : 0.05; }
    else if (pose === 'sit') { hip = [0, -48 * k]; feet = [[30 * k, 0], [38 * k, 0]]; }
    else if (pose === 'ride') { hip = [0, -90]; const a = t * 7 + ph; feet = [[14 + 14 * Math.cos(a), -34 + 14 * Math.sin(a)], [14 - 14 * Math.cos(a), -34 - 14 * Math.sin(a)]]; lean = 0.35; }
    const sh = [hip[0] + Math.sin(lean) * torL, hip[1] - Math.cos(lean) * torL], hd = [sh[0] + Math.sin(lean) * (hr + 8), sh[1] - Math.cos(lean) * (hr + 8)];
    const sa = [sh[0], sh[1] + 6 * k], AL = 31 * k; let hands;
    if (pose === 'wave') hands = [[sa[0] - 12 * k, sa[1] + 58 * k], [sa[0] + 34 * k + 12 * k * Math.sin(t * 11 + ph), sa[1] - 50 * k]];
    else if (pose === 'walk' || pose === 'run') hands = [[sa[0] + sw * 24 * k, sa[1] + 52 * k], [sa[0] - sw * 24 * k, sa[1] + 52 * k]];
    else if (pose === 'sit') hands = [[sa[0] + 22 * k, hip[1] - 6 * k], [sa[0] + 30 * k, hip[1] - 10 * k]];
    else if (pose === 'hold') hands = [[sa[0] - 12 * k, sa[1] + 58 * k], [sa[0] + 40 * k, sa[1] + 30 * k]];
    else if (pose === 'ride') hands = [[46, -114], [48, -112]];
    else hands = [[sa[0] - 14 * k, sa[1] + 58 * k], [sa[0] + 14 * k, sa[1] + 58 * k]];
    if (o.cane) hands[1] = [sa[0] + 30 * k, sa[1] + 46 * k];
    const legs = feet.map((f) => [hip, ik(hip, f, legL / 2 + 1, -1), f]), arms = hands.map((h) => [sa, ik(sa, h, AL, 1), h]);
    g.save(); g.translate(x, y); g.scale(s * (o.dir === -1 ? -1 : 1), s);
    const E = o.edge || C.dark, sl = shade(shirt, -0.28);
    for (let pass = 0; pass < 2; pass++) {
      const P = (w, c) => pass ? [w, c] : [w + 7, E];
      if (o.bag) { g.save(); g.translate(sh[0] - tw * 0.55, sh[1] + 30 * k); g.rotate(lean); g.beginPath(); rr(g, -14 * k, -22 * k, 24 * k, 46 * k, 8 * k); if (pass) { g.fillStyle = o.bag; g.fill(); } else { g.strokeStyle = E; g.lineWidth = 7; g.stroke(); } g.restore(); }
      if (o.long) { const [w, c] = P(hr * 2.1, hair); line(g, [[hd[0] - 4, hd[1]], [hd[0] - 6, hd[1] + 26 * k]], w, c); }
      line(g, legs[0], ...P(lw, shade(pants, -0.15))); line(g, arms[0], ...P(aw, sl));
      line(g, [hip, sh], ...P(tw, shirt));
      line(g, legs[1], ...P(lw, pants));
      if (pass) { feet.forEach((f) => { g.fillStyle = shoe; g.beginPath(); g.ellipse(f[0] + 5 * k, f[1] - 3 * k, 10 * k, 6 * k, 0, 0, 7); g.fill(); }); }
      g.beginPath(); g.arc(hd[0], hd[1], hr + (pass ? 0 : 3.5), 0, 7); g.fillStyle = pass ? skin : E; g.fill();
      line(g, arms[1], ...P(aw, sl));
      if (pass) { [hands[0], hands[1]].forEach((h) => { g.fillStyle = skin; g.beginPath(); g.arc(h[0], h[1], aw * 0.62, 0, 7); g.fill(); }); }
    }
    // волосы, лицо, головной убор
    g.fillStyle = hair; g.beginPath(); g.arc(hd[0], hd[1], hr + 1, Math.PI * 0.95, Math.PI * 2.05); g.fill(); g.beginPath(); g.ellipse(hd[0] - hr * 0.55, hd[1] - 2, hr * 0.45, hr * 0.7, 0, 0, 7); g.fill();
    if (old && !o.hat) { g.beginPath(); g.arc(hd[0] - hr * 0.7, hd[1] - hr * 0.75, hr * 0.42, 0, 7); g.fill(); }
    g.fillStyle = '#1A1A1A'; g.beginPath(); g.arc(hd[0] + hr * 0.42, hd[1] + 1, 2.6, 0, 7); g.fill();
    if (o.shout) { g.beginPath(); g.ellipse(hd[0] + hr * 0.62, hd[1] + hr * 0.45, 4, 6 + 2 * Math.abs(Math.sin(t * 14)), 0, 0, 7); g.fill(); }
    if (o.glasses) { g.strokeStyle = '#1A1A1A'; g.lineWidth = 2.5; g.beginPath(); g.arc(hd[0] + hr * 0.42, hd[1] + 1, 6, 0, 7); g.stroke(); line(g, [[hd[0] + hr * 0.1, hd[1]], [hd[0] - hr * 0.4, hd[1] - 2]], 2.5, '#1A1A1A'); }
    if (o.hat) { g.fillStyle = o.hat; g.beginPath(); g.arc(hd[0], hd[1] - 3, hr + 3, Math.PI, 0); g.fill(); g.fillRect(hd[0] - hr - 6, hd[1] - 5, hr * 2 + 14, 6); }
    if (o.cane) line(g, [hands[1], [hands[1][0] + 4, 0]], 5, C.wood);
    if (o.item) o.item(g, hands[1][0], hands[1][1]);
    g.restore();
  }
  // группа людей в ряд без слияния: list [{...o}], шаг gap
  function crowd(g, x, y, s, list, gap = 70, t = 0) { list.forEach((o, j) => person(g, x + (j - (list.length - 1) / 2) * gap * s, y, s, Object.assign({ t, phase: j * 1.7 }, o))); }

  // ----- здания; (x, y) середина низа -----
  function wins(g, x0, y0, cols, rows, ww, wh, gx, gy, lit, wall, s = 1) { for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const j = r * cols + c, on = typeof lit === 'function' ? lit(j, r, c) : hash(j, s) < lit; g.fillStyle = on ? C.yellow : shade(wall, -0.45); g.fillRect(x0 + c * gx, y0 + r * gy, ww, wh); } }
  // дом с крышей: o {wall, roof, lit 0..1, door}
  function house(g, x, y, w = 220, h = 170, o = {}) { const wall = o.wall || '#C9C2B0', roof = o.roof || C.red; blob(g, (q) => q.rect(x - w / 2, y - h, w, h), wall); blob(g, (q) => { q.moveTo(x - w / 2 - 18, y - h); q.lineTo(x, y - h - w * 0.42); q.lineTo(x + w / 2 + 18, y - h); q.closePath(); }, roof); const ww = w * 0.2; wins(g, x - w * 0.36, y - h * 0.72, 2, 1, ww, ww, w * 0.52, 0, o.lit == null ? 0 : o.lit, wall, 3); g.fillStyle = o.door || C.wood; g.fillRect(x - w * 0.08, y - h * 0.48, w * 0.16, h * 0.48); }
  // многоэтажка: o {wall, floors, cols, lit 0..1 или fn(j,этаж,колонка), grow 0..1 (стройка снизу вверх), roof}
  function tower(g, x, y, w = 260, h = 520, o = {}) { const wall = o.wall || '#8C9A96', F = o.floors || 9, cols = o.cols || 4, fh = h / F, gr = o.grow == null ? 1 : cl(o.grow), vis = F * gr, nf = Math.ceil(vis); if (nf <= 0) return; const top = y - vis * fh; blob(g, (q) => q.rect(x - w / 2, top, w, y - top), wall); for (let f = 0; f < nf; f++) { const fy = y - (f + 1) * fh; if (fy + fh * 0.2 < top) continue; wins(g, x - w / 2 + w * 0.1, fy + fh * 0.22, cols, 1, w * 0.8 / cols - 12, fh * 0.5, w * 0.8 / cols, 0, typeof o.lit === 'function' ? (j) => o.lit(f * cols + j, f, j) : (j) => hash(f * cols + j, 7) < (o.lit == null ? 0 : o.lit), wall); g.fillStyle = shade(wall, -0.2); g.fillRect(x - w / 2, fy + fh - 4, w, 4); } if (gr >= 1) { g.fillStyle = o.roof || shade(wall, -0.3); g.fillRect(x - w / 2 - 8, top - 14, w + 16, 14); } }
  // магазин/кафе: o {wall, awning, sign (текст вывески), signBg, signCol, lit, kind 'shop'|'cafe'}
  function shop(g, x, y, w = 320, h = 230, o = {}) { const wall = o.wall || '#D8CDB4', aw = o.awning || C.red; blob(g, (q) => q.rect(x - w / 2, y - h, w, h), wall); g.fillStyle = o.lit ? '#FFE9A0' : '#24352E'; g.fillRect(x - w * 0.42, y - h * 0.5, w * 0.5, h * 0.38); g.fillStyle = C.wood; g.fillRect(x + w * 0.16, y - h * 0.55, w * 0.22, h * 0.55); const n = 7, sw = (w + 30) / n; for (let j = 0; j < n; j++) { g.fillStyle = j % 2 ? C.white : aw; g.beginPath(); g.moveTo(x - w / 2 - 15 + j * sw, y - h * 0.68); g.lineTo(x - w / 2 - 15 + (j + 1) * sw, y - h * 0.68); g.lineTo(x - w / 2 - 15 + (j + 1) * sw, y - h * 0.58); g.arc(x - w / 2 - 15 + (j + 0.5) * sw, y - h * 0.58, sw / 2, 0, Math.PI); g.closePath(); g.fill(); }
    if (o.sign) { g.fillStyle = o.signBg || C.dark; rr(g, x - w * 0.44, y - h * 0.96, w * 0.88, h * 0.22, 10); g.fill(); g.fillStyle = o.signCol || C.yellow; fit(g, o.sign, w * 0.8, h * 0.15); g.textAlign = 'center'; g.fillText(o.sign, x, y - h * 0.8); }
    if (o.kind === 'cafe') { g.fillStyle = C.wood; g.fillRect(x - w * 0.62, y - 52, 70, 8); g.fillRect(x - w * 0.62 + 31, y - 52, 8, 52); g.fillStyle = C.white; g.fillRect(x - w * 0.62 + 20, y - 66, 16, 14); } }
  // школа: o {wall, roof, sign, flag, lit}
  function school(g, x, y, w = 420, h = 260, o = {}) { const wall = o.wall || '#D9B88A', roof = o.roof || '#3F5A66'; blob(g, (q) => q.rect(x - w / 2, y - h, w, h), wall); blob(g, (q) => { q.moveTo(x - w * 0.2, y - h); q.lineTo(x, y - h - 70); q.lineTo(x + w * 0.2, y - h); q.closePath(); }, roof); wins(g, x - w * 0.42, y - h * 0.82, 6, 2, w * 0.1, h * 0.2, w * 0.142, h * 0.34, o.lit || 0, wall, 5); g.fillStyle = C.wood; g.fillRect(x - w * 0.07, y - h * 0.3, w * 0.14, h * 0.3); if (o.sign) { g.fillStyle = C.dark; rr(g, x - w * 0.3, y - h - 6 - 50, w * 0.6, 44, 8); g.fill(); g.fillStyle = C.yellow; fit(g, o.sign, w * 0.55, 30); g.textAlign = 'center'; g.fillText(o.sign, x, y - h - 22); } if (o.flag) { line(g, [[x + w / 2 - 20, y - h], [x + w / 2 - 20, y - h - 90]], 4, C.grey); g.fillStyle = o.flag; g.fillRect(x + w / 2 - 18, y - h - 90, 46, 28); } }

  // ----- растения -----
  // дерево: o {kind 'oak'|'pine', leaf, trunk, t}; (x, y) низ ствола, высота ≈ 300·s
  function tree(g, x, y, s = 1, o = {}) { const t = o.t || 0, a = Math.sin(t * 1.5 + x) * 0.03; g.save(); g.translate(x, y); g.scale(s, s); g.rotate(a); const tr = o.trunk || C.wood;
    if (o.kind === 'pine') { blob(g, (q) => q.rect(-12, -60, 24, 60), tr); const lf = o.leaf || C.pine; [0, 1, 2].forEach((i) => { const yb = -50 - i * 70, w = 200 - i * 50; blob(g, (q) => { q.moveTo(-w / 2, yb); q.lineTo(0, yb - 130); q.lineTo(w / 2, yb); q.closePath(); }, i % 2 ? shade(lf, 0.1) : lf); }); }
    else { const lf = o.leaf || C.green; blob(g, (q) => { q.moveTo(-18, 0); q.lineTo(-12, -150); q.lineTo(12, -150); q.lineTo(18, 0); q.closePath(); }, tr); [[-60, -170, 70], [60, -175, 72], [0, -230, 85], [-20, -150, 60], [35, -140, 55]].forEach(([cx, cy, r], j) => { g.beginPath(); g.arc(cx, cy, r + 3, 0, 7); g.fillStyle = C.dark; g.fill(); }); [[-60, -170, 70], [60, -175, 72], [0, -230, 85], [-20, -150, 60], [35, -140, 55]].forEach(([cx, cy, r], j) => { g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fillStyle = j % 2 ? shade(lf, -0.18) : lf; g.fill(); }); }
    g.restore(); }
  // трава полосой: o {col, h, t}
  function grass(g, x, y, w, o = {}) { const c = o.col || C.green, h = o.h || 26, t = o.t || 0; g.fillStyle = shade(c, -0.3); g.fillRect(x, y - 6, w, 6); g.fillStyle = c; g.beginPath(); for (let j = 0; j < w / 14; j++) { const bx = x + j * 14, bh = h * (0.6 + 0.4 * hash(j, 2)), sw = Math.sin(t * 2 + j) * 4; g.moveTo(bx, y); g.lineTo(bx + 5 + sw, y - bh); g.lineTo(bx + 10, y); } g.fill(); }
  // кленовый лист: a поворот
  function leaf(g, x, y, s = 1, a = 0, col = C.orange) { g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s); g.fillStyle = col; g.beginPath(); for (let j = 0; j < 10; j++) { const r = j % 2 ? 9 : 22, an = -Math.PI / 2 + j * Math.PI / 5; g.lineTo(Math.cos(an) * r, Math.sin(an) * r); } g.closePath(); g.fill(); line(g, [[0, 6], [0, 26]], 3, shade(col, -0.3)); g.restore(); }
  // листопад в прямоугольнике: o {n, cols, seed}
  function leaves(g, x, y, w, h, t, o = {}) { const cols = o.cols || [C.orange, C.red, C.yellow]; for (let j = 0; j < (o.n || 14); j++) { const f = (hash(j, o.seed || 4) + t * 0.12 * (0.6 + hash(j, 9))) % 1; leaf(g, x + hash(j, 3) * w + Math.sin(t * 2 + j) * 30, y + f * h, 0.8 + hash(j, 5) * 0.6, t * (1 + hash(j, 6)) + j, cols[j % cols.length]); } }

  // ----- транспорт; (x, y) земля под серединой, dir 1 вправо, -1 влево -----
  function wheel(g, x, y, r) { g.fillStyle = C.dark; g.beginPath(); g.arc(x, y, r + 3, 0, 7); g.fill(); g.fillStyle = '#2A3330'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = C.grey; g.beginPath(); g.arc(x, y, r * 0.42, 0, 7); g.fill(); }
  // машина: o {body, dir}
  function car(g, x, y, s = 1, o = {}) { const b = o.body || C.red; g.save(); g.translate(x, y); g.scale(s * (o.dir === -1 ? -1 : 1), s); blob(g, (q) => rr(q, -75, -95, 110, 50, 16), b); blob(g, (q) => rr(q, -110, -62, 220, 44, 14), b); g.fillStyle = '#BFD8E6'; rr(g, -65, -88, 42, 30, 6); g.fill(); rr(g, -16, -88, 42, 30, 6); g.fill(); g.fillStyle = C.yellow; g.fillRect(100, -52, 10, 10); wheel(g, -62, -16, 20); wheel(g, 62, -16, 20); g.restore(); }
  // автобус: o {body, num (номер на табличке), dir}
  function bus(g, x, y, s = 1, o = {}) { const b = o.body || C.blue, d = o.dir === -1 ? -1 : 1; g.save(); g.translate(x, y); g.scale(s * d, s); blob(g, (q) => rr(q, -170, -150, 340, 130, 20), b); g.fillStyle = shade(b, -0.3); g.fillRect(-170, -48, 340, 10); g.fillStyle = '#BFD8E6'; for (let j = 0; j < 5; j++) { rr(g, -150 + j * 56, -132, 44, 50, 6); g.fill(); } rr(g, 132, -132, 28, 70, 6); g.fill(); g.fillStyle = shade(b, -0.25); g.fillRect(100, -78, 26, 58); g.fillStyle = C.yellow; g.fillRect(162, -46, 8, 12);
    if (o.num != null) { g.fillStyle = C.dark; rr(g, 96, -144, 60, 40, 6); g.fill(); g.save(); g.scale(d, 1); g.fillStyle = C.yellow; g.font = font(32, 900); g.textAlign = 'center'; g.fillText(String(o.num), 126 * d, -112); g.restore(); }
    wheel(g, -105, -20, 24); wheel(g, 105, -20, 24); g.restore(); }
  // велосипед: o {frame, rider (опции person, без pose) или null, t, dir}
  function bike(g, x, y, s = 1, o = {}) { const f = o.frame || C.yellow, t = o.t || 0; g.save(); g.translate(x, y); g.scale(s * (o.dir === -1 ? -1 : 1), s); const ring = (cx) => { g.strokeStyle = C.dark; g.lineWidth = 11; g.beginPath(); g.arc(cx, -34, 32, 0, 7); g.stroke(); g.strokeStyle = C.grey; g.lineWidth = 6; g.beginPath(); g.arc(cx, -34, 32, 0, 7); g.stroke(); }; ring(-46); ring(50);
    line(g, [[-46, -34], [0, -34], [-14, -86], [-46, -34]], 7, f); line(g, [[0, -34], [40, -88], [-14, -86]], 7, f); line(g, [[50, -34], [40, -88], [36, -108], [48, -112]], 7, f); line(g, [[-24, -88], [-2, -88]], 8, '#202528');
    if (o.rider) person(g, -14, 0, 1, Object.assign({}, o.rider, { pose: 'ride', t })); g.restore(); }
  // лодка/катер: o {hull, cabin (цвет или null), stripe, crew [опции person], t, wake (идёт), motor}
  function boat(g, x, y, s = 1, o = {}) { const t = o.t || 0, hb = o.hull || C.white, bob = Math.sin(t * 2.2 + x * 0.01) * 4; g.save(); g.translate(x, y + bob); g.scale(s * (o.dir === -1 ? -1 : 1), s); g.rotate(Math.sin(t * 1.7 + x) * 0.03);
    if (o.wake) { g.strokeStyle = 'rgba(242,240,230,0.45)'; g.lineWidth = 4; for (let j = 0; j < 3; j++) { const ph = (t * 1.5 + j / 3) % 1; g.globalAlpha = 1 - ph; g.beginPath(); g.moveTo(-130 - ph * 120, 4 + j * 2); g.lineTo(-170 - ph * 160, 4 + j * 2); g.stroke(); } g.globalAlpha = 1; }
    if (o.cabin) blob(g, (q) => rr(q, -10, -110, 80, 70, 8), o.cabin);
    (o.crew || []).forEach((p, j) => person(g, -60 + j * 52, -22, 0.62, Object.assign({ t, phase: j }, p)));
    blob(g, (q) => { q.moveTo(-130, -46); q.lineTo(150, -46); q.lineTo(118, 8); q.lineTo(-112, 8); q.closePath(); }, hb); g.fillStyle = o.stripe || C.red; g.fillRect(-124, -30, 266, 9);
    if (o.motor !== false) { blob(g, (q) => rr(q, -152, -62, 26, 50, 6), '#2A3330'); }
    g.restore(); }

  // ----- животные -----
  // собака: o {fur, sleep, t, dir}
  function dog(g, x, y, s = 1, o = {}) { const f = o.fur || C.ginger, dk = shade(f, -0.28), t = o.t || 0; g.save(); g.translate(x, y); g.scale(s * (o.dir === -1 ? -1 : 1), s);
    if (o.sleep) { const br = 1 + 0.04 * Math.sin(t * 2.5); line(g, [[-66, -16], [-92, -8], [-82, 0]], 12, f); g.save(); g.scale(1, br); ell(g, 0, -26, 72, 27, f); g.restore(); ell(g, 64, -20, 26, 22, f); ell(g, 88, -12, 15, 10, f); blob(g, (q) => q.ellipse(54, -24, 9, 18, -0.5, 0, 7), dk, null); g.fillStyle = '#1A1A1A'; g.beginPath(); g.arc(102, -14, 4, 0, 7); g.fill(); line(g, [[64, -22], [74, -20]], 3, '#1A1A1A'); }
    else { [-46, -30, 36, 50].forEach((lx, j) => line(g, [[lx, -50], [lx + (j % 2 ? 4 : -2) * Math.sin(t * 9), 0]], 12, j % 2 ? f : dk)); line(g, [[-62, -64], [-88, -96 + 8 * Math.sin(t * 14)]], 10, f); ell(g, 0, -62, 66, 26, f); ell(g, 66, -94, 26, 24, f); ell(g, 90, -86, 16, 11, f); blob(g, (q) => q.ellipse(56, -104, 9, 20, -0.4, 0, 7), dk, null); g.fillStyle = '#1A1A1A'; g.beginPath(); g.arc(104, -88, 4, 0, 7); g.arc(76, -98, 3.4, 0, 7); g.fill(); }
    g.restore(); }
  // кошка: o {fur, t, dir} сидит
  function cat(g, x, y, s = 1, o = {}) { const f = o.fur || C.grey, t = o.t || 0; g.save(); g.translate(x, y); g.scale(s * (o.dir === -1 ? -1 : 1), s); line(g, [[-30, -8], [-62, -10], [-70, -40 + 6 * Math.sin(t * 3)]], 9, f); ell(g, 0, -40, 34, 40, f); ell(g, 6, -96, 26, 23, f); [[-14, 1], [24, -1]].forEach(([ex]) => blob(g, (q) => { q.moveTo(ex - 10, -110); q.lineTo(ex, -134); q.lineTo(ex + 10, -110); q.closePath(); }, f)); g.fillStyle = '#1A1A1A'; g.beginPath(); g.arc(0, -98, 3.5, 0, 7); g.arc(16, -98, 3.5, 0, 7); g.fill(); g.restore(); }
  // птица (чайка): o {col, t, phase, dir}
  function bird(g, x, y, s = 1, o = {}) { const c = o.col || C.white, fl = Math.sin((o.t || 0) * 9 + (o.phase || 0)) * 16; g.save(); g.translate(x, y); g.scale(s * (o.dir === -1 ? -1 : 1), s); line(g, [[-40, -6 - fl], [-16, -14 + fl * 0.3], [0, 0], [16, -14 + fl * 0.3], [40, -6 - fl]], 7, c); ell(g, 2, 2, 12, 6, c, null); g.fillStyle = C.orange; g.fillRect(12, 0, 8, 3); g.restore(); }

  // ----- небо и природа -----
  // солнце: o {col, glow 0..1}
  function sun(g, x, y, r = 90, o = {}) { const c = o.col || C.yellow, gl = o.glow == null ? 1 : o.glow; if (gl > 0) { const gr = g.createRadialGradient(x, y, r * 0.8, x, y, r * 2.6); gr.addColorStop(0, c + '66'); gr.addColorStop(1, c + '00'); g.save(); g.globalAlpha *= gl; g.fillStyle = gr; g.fillRect(x - r * 2.6, y - r * 2.6, r * 5.2, r * 5.2); g.restore(); } g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = shade(c, 0.35); g.beginPath(); g.arc(x - r * 0.25, y - r * 0.25, r * 0.55, 0, 7); g.fill(); }
  // луна-серп: o {col, bg (цвет неба)}
  function moon(g, x, y, r = 60, o = {}) { g.fillStyle = o.col || '#F4EBC4'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = o.bg || C.night; g.beginPath(); g.arc(x + r * 0.45, y - r * 0.25, r * 0.85, 0, 7); g.fill(); }
  // звёзды в прямоугольнике: o {n, show 0..1 (зажигаются по одной), seed, col}
  function stars(g, x, y, w, h, t = 0, o = {}) { const n = o.n || 40, sh = o.show == null ? 1 : o.show; g.fillStyle = o.col || C.white; for (let j = 0; j < n; j++) { const a = cl((sh * n - j * 0.9) / 2); if (a <= 0) continue; const tw = 0.6 + 0.4 * Math.sin(t * 3 + j * 1.3); g.globalAlpha = a * tw; const r = 2 + hash(j, 8) * 3.5, sx = x + hash(j, o.seed || 1) * w, sy = y + hash(j, (o.seed || 1) + 10) * h; g.beginPath(); g.moveTo(sx, sy - r * 2); g.lineTo(sx + r * 0.6, sy); g.lineTo(sx, sy + r * 2); g.lineTo(sx - r * 0.6, sy); g.closePath(); g.fill(); g.fillRect(sx - r * 2, sy - 1, r * 4, 2); } g.globalAlpha = 1; }
  // облако: o {col}
  function cloud(g, x, y, s = 1, o = {}) { g.fillStyle = o.col || '#3A4A44'; g.beginPath(); g.arc(x - 50 * s, y, 40 * s, 0, 7); g.arc(x, y - 22 * s, 55 * s, 0, 7); g.arc(x + 55 * s, y, 38 * s, 0, 7); g.fill(); g.fillRect(x - 50 * s, y, 105 * s, 40 * s); }
  // море: верх воды y, o {col, crest (цвет гребней), glint (цвет дорожки солнца), gx}
  function sea(g, x, y, w, h, t = 0, o = {}) { const c = o.col || C.sea; g.fillStyle = c; g.fillRect(x, y, w, h); if (o.glint) { g.fillStyle = o.glint; for (let j = 0; j < 8; j++) { const ww = (60 - j * 5) * (1 + 0.2 * Math.sin(t * 3 + j)); g.globalAlpha = 0.7 - j * 0.07; g.fillRect((o.gx || x + w / 2) - ww / 2, y + 10 + j * 22, ww, 6); } g.globalAlpha = 1; } g.strokeStyle = o.crest || shade(c, 0.25); g.lineWidth = 4; g.lineCap = 'round'; for (let r = 0; r < h / 40; r++) { const off = ((t * 30 * (r % 2 ? 1 : -0.7)) % 160 + 160) % 160; for (let q = -1; q < w / 160 + 1; q++) { const sx = x + q * 160 + off + (r % 2) * 80; if (sx < x || sx + 50 > x + w) continue; g.beginPath(); g.moveTo(sx, y + 24 + r * 40); g.quadraticCurveTo(sx + 25, y + 14 + r * 40, sx + 50, y + 24 + r * 40); g.stroke(); } } }
  // холм: o {col}
  function hill(g, x, y, w, h, o = {}) { g.fillStyle = o.col || '#1D4A35'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - h * 2, x + w, y); g.closePath(); g.fill(); }

  // ----- улица -----
  // фонарь: o {on 0..1, col (свет), pole}
  function lamp(g, x, y, s = 1, o = {}) { const on = o.on || 0, lc = o.col || C.yellow; g.save(); g.translate(x, y); g.scale(s, s); line(g, [[0, 0], [0, -240]], 10, o.pole || '#3B4A44'); line(g, [[0, -240], [26, -258]], 8, o.pole || '#3B4A44'); if (on > 0) { const gr = g.createRadialGradient(30, -240, 4, 30, -240, 110); gr.addColorStop(0, lc + 'AA'); gr.addColorStop(1, lc + '00'); g.globalAlpha = on; g.fillStyle = gr; g.fillRect(-80, -350, 220, 220); g.globalAlpha = 1; } blob(g, (q) => rr(q, 12, -262, 36, 30, 8), on > 0.5 ? lc : '#55605A'); g.restore(); }
  // скамейка: (x, y) середина у земли, сиденье на высоте 48·s; o {col}
  function bench(g, x, y, w = 160, o = {}) { const c = o.col || C.wood; g.fillStyle = shade(c, -0.3); g.fillRect(x - w / 2 + 10, y - 48, 10, 48); g.fillRect(x + w / 2 - 20, y - 48, 10, 48); blob(g, (q) => q.rect(x - w / 2, y - 54, w, 12), c); blob(g, (q) => q.rect(x - w / 2, y - 100, w, 12), c); g.fillStyle = shade(c, -0.3); g.fillRect(x - w / 2 + 10, y - 100, 8, 50); g.fillRect(x + w / 2 - 18, y - 100, 8, 50); }
  // гирлянда между точками: o {n, on 0..1 (зажигается слева направо), cols, sag, t}
  function garland(g, x0, y0, x1, y1, o = {}) { const n = o.n || 12, on = o.on == null ? 1 : o.on, cols = o.cols || [C.yellow, C.red, C.orange, C.green], sag = o.sag || 80, t = o.t || 0, P = (u) => [mix(x0, x1, u), mix(y0, y1, u) + sag * 4 * u * (1 - u)]; g.strokeStyle = '#3B4A44'; g.lineWidth = 3; g.beginPath(); for (let q = 0; q <= 20; q++) { const p = P(q / 20); q ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.stroke();
    for (let j = 0; j < n; j++) { const u = (j + 0.5) / n, p = P(u), lit = u < on, c = cols[j % cols.length]; if (lit) { g.globalAlpha = 0.35 + 0.15 * Math.sin(t * 6 + j); g.fillStyle = c; g.beginPath(); g.arc(p[0], p[1] + 14, 24, 0, 7); g.fill(); g.globalAlpha = 1; } g.fillStyle = lit ? c : '#3A4540'; rr(g, p[0] - 8, p[1] + 4, 16, 22, 7); g.fill(); } }
  // меловая доска: lines ['Уха 350 ₽', ...] пишутся по одной с t0; o {title, size, frame, t, t0}
  function board(g, x, y, w, h, lines, o = {}) { blob(g, (q) => rr(q, x, y, w, h, 12), o.frame || C.wood); g.fillStyle = C.chalk; g.fillRect(x + 18, y + 18, w - 36, h - 36); const t = o.t || 0, t0 = o.t0 || 0, sz = o.size || 56; let yy = y + 40; if (o.title) { g.fillStyle = C.yellow; fit(g, o.title, w - 80, sz * 0.7, 800); g.textAlign = 'center'; g.fillText(o.title, x + w / 2, yy + sz * 0.7); yy += sz * 1.2; }
    lines.forEach((s, j) => { const p = cl((t - (o.at ? o.at[j] : t0 + j * 0.6)) / 0.5); if (p <= 0) return; g.save(); g.beginPath(); g.rect(x + 30, yy + j * sz * 1.35, (w - 60) * p, sz * 1.3); g.clip(); g.fillStyle = 'rgba(242,240,230,0.92)'; fit(g, s, w - 80, sz, 700); g.textAlign = 'left'; g.fillText(s, x + 40, yy + j * sz * 1.35 + sz); g.restore(); }); }
  // вывеска-табличка: o {bg, col, size}
  function sign(g, x, y, text, o = {}) { const sz = o.size || 40; g.font = font(sz, 900); const w = g.measureText(text).width + sz; blob(g, (q) => rr(q, x - w / 2, y - sz * 0.9, w, sz * 1.5, 10), o.bg || C.yellow); g.fillStyle = o.col || C.ink; g.textAlign = 'center'; g.fillText(text, x, y + sz * 0.22); }
  // окно-сцена: тёмная панель с картинкой внутри (обрезка по краю); o {sky: [верх, низ]}; fn() рисует сцену
  function stage(g, x, y, w, h, o, fn) { panel(g, x, y, w, h); g.save(); rr(g, x, y, w, h, 24); g.clip(); if (o && o.sky) { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, o.sky[0]); gr.addColorStop(1, o.sky[1] || o.sky[0]); g.fillStyle = gr; g.fillRect(x, y, w, h); } fn(); g.restore(); g.strokeStyle = C.line; g.lineWidth = 2; rr(g, x, y, w, h, 24); g.stroke(); }

  return Object.assign({}, M, { C, bg, top, word, note, strike, panel, candles, metrics, bars, curve, flame, burst, letters, profile,
    shade, hash, blob, line, fit, person, crowd, house, tower, shop, school, bench, tree, grass, leaf, leaves, car, bus, bike, boat, dog, cat, bird, sun, moon, stars, cloud, sea, hill, lamp, garland, board, sign, stage });
})();
