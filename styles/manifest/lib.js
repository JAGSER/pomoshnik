// Стиль «Манифест» (MANI): кинетическая типографика. Бумага, тушь, один красный. Слова падают с ударом и строят мысль.
const MANI = (() => {
  const C = { paper: '#F1ECE2', ink: '#151311', red: '#D7261E', gray: '#8C857A', night: '#151311' };
  const SANS = '"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif';
  const SERIF = '"DejaVu Serif",Georgia,"Noto Serif","Times New Roman",serif';
  const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const eo = (x) => 1 - Math.pow(1 - cl(x), 3);
  const eio = (x) => { x = cl(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const sp = (x) => (x <= 0 ? 0 : 1 - Math.exp(-6 * x) * Math.cos(9 * x));
  const mix = (a, b, x) => a + (b - a) * x;
  const font = (size, w = 900, serif) => `${w} ${Math.round(size)}px ${serif ? SERIF : SANS}`;
  function rr(g, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  // сцена по списку склеек: {i, lt, dur}
  function scene(t, cuts) { let i = 0; while (i < cuts.length - 1 && t >= cuts[i + 1]) i++; return { i, lt: t - cuts[i], dur: (cuts[i + 1] || 1e9) - cuts[i] }; }
  // уход сцены: 1 → 0 за последние 0.2 с
  function fade(lt, dur, last) { return last ? 1 : 1 - eo((lt - (dur - 0.22)) / 0.18); }
  // фон: бумага или ночь + зерно
  let GR = null;
  function bg(g, t, dark) {
    g.fillStyle = dark ? C.night : C.paper; g.fillRect(0, 0, 1080, 1920);
    if (!GR) { GR = new OffscreenCanvas(270, 480); const c = GR.getContext('2d'); let s = 7; for (let i = 0; i < 9000; i++) { s = (s * 16807) % 2147483647; const x = s % 270; s = (s * 16807) % 2147483647; const y = s % 480; c.fillStyle = i % 2 ? '#000' : '#fff'; c.fillRect(x, y, 1, 1); } }
    g.save(); g.globalAlpha = dark ? 0.08 : 0.05; g.imageSmoothingEnabled = false; const o = (Math.floor(t * 12) % 4) * 3; g.drawImage(GR, -o, -o, 1092, 1932); g.restore();
  }
  // камера: удар-наезд после склейки и медленный дрейф
  function camera(g, lt, cy = 960) { const s = 1 + 0.05 * (1 - eo(lt / 0.5)) + 0.008 * lt; g.translate(540, cy); g.scale(s, s); g.translate(-540, -cy); }
  // слово с ударом: падает крупнее и оседает. o {align, serif, w, max, a}. Ширина подгоняется под max (по умолчанию 960)
  function slam(g, txt, x, y, size, t, t0, col, o = {}) {
    const p = cl((t - t0) / 0.18); if (p <= 0) return 0;
    const s = 1 + 0.6 * (1 - eo(p));
    g.save(); g.font = font(size, o.w || 900, o.serif); const w = g.measureText(txt).width;
    const room = (o.align || 'center') === 'center' ? 2 * Math.min(x - 60, 1020 - x) : (o.align === 'left' ? 1020 - x : x - 60);
    const k = Math.min(1, Math.min(o.max || 960, room) / w);
    g.translate(x, y); g.scale(s * k, s * k); g.globalAlpha *= eo(p) * (o.a == null ? 1 : o.a);
    g.fillStyle = col; g.textAlign = o.align || 'center'; g.textBaseline = 'alphabetic'; g.fillText(txt, 0, 0); g.restore(); return w * k;
  }
  // две-три строки подряд ударами: lines [[текст, цвет, размер, serif?]], шаг между ударами step
  function stack(g, lines, y, t, t0, o = {}) { let yy = y; lines.forEach(([txt, col, size, serif], j) => { slam(g, txt, o.x || 540, yy, size, t, t0 + j * (o.step || 0.35), col, { serif, align: o.align, w: serif ? 700 : 900 }); yy += size * (o.lh || 1.05); }); return yy; }
  // красная линия-подчёркивание, растёт слева направо
  function rule(g, x, y, w, t, t0, o = {}) { const p = eo((t - t0) / (o.d || 0.5)); if (p <= 0) return; g.fillStyle = o.col || C.red; g.fillRect(x, y, w * p, o.h || 14); }
  // зачёркивание текста красной линией
  function strike(g, x, y, w, t, t0) { const p = eo((t - t0) / 0.3); if (p <= 0) return; g.strokeStyle = C.red; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w * p, y); g.stroke(); }
  // сетка точек-людей, растёт от центра; каждая n-я красная
  function crowd(g, t, t0, o = {}) { const cols = o.cols || 11, rows = o.rows || 12, gap = o.gap || 80, x0 = 540 - (cols - 1) * gap / 2, y0 = o.y || 600;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const d = Math.hypot(c - (cols - 1) / 2, r - (rows - 1) / 2); const p = sp((t - t0 - d * 0.08) / 0.4); if (p <= 0) continue;
      g.fillStyle = (r * cols + c) % (o.every || 17) === 0 ? C.red : (o.col || C.ink); g.beginPath(); g.arc(x0 + c * gap, y0 + r * gap * 0.88, (o.r || 14) * Math.min(1.2, p), 0, 7); g.fill(); } }
  // точки сжимаются в одну (k 0..1)
  function gather(g, n, k, cx, cy, o = {}) { for (let j = 0; j < n; j++) { const x = 140 + (j % 3) * 400, y = (o.y || 640) + Math.floor(j / 3) * 260; g.globalAlpha = 1 - k; g.fillStyle = o.col || 'rgba(241,236,226,0.55)'; g.beginPath(); g.arc(mix(x, cx, k), mix(y, cy, k), 70, 0, 7); g.fill(); } g.globalAlpha = 1; g.fillStyle = C.red; g.beginPath(); g.arc(cx, cy, 30 + 90 * k, 0, 7); g.fill(); }
  // кирпичи-слова падают в основание: words [..], y низ ряда
  function bricks(g, words, y, t, t0, o = {}) { const n = words.length, w = o.w || 190, gap = o.gap || 10, x0 = 540 - (n * w + (n - 1) * gap) / 2;
    words.forEach((b, j) => { const p = sp((t - t0 - j * 0.25) / 0.4); if (p <= 0) return; g.save(); g.translate(x0 + j * (w + gap) + w / 2, mix(y - 800, y, cl(p))); g.fillStyle = j % 2 ? C.ink : C.red; rr(g, -w / 2, -50, w, 100, 8); g.fill();
      g.fillStyle = C.paper; g.font = font(Math.min(48, (w - 20) / Math.max(3, b.length) * 1.6), 800); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(b, 0, 2); g.restore(); }); }
  // подпись мелким серым
  function note(g, txt, y, t, t0, o = {}) { slam(g, txt, 540, y, o.size || 64, t, t0, o.col || C.gray, { w: 600, align: 'center' }); }
  // круг-печать: красное кольцо и слово
  function seal(g, txt, x, y, r, t, t0) { const p = sp((t - t0) / 0.4); if (p <= 0) return; g.save(); g.translate(x, y); g.rotate(-0.15); g.scale(p, p); g.strokeStyle = C.red; g.lineWidth = 10; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, r - 18, 0, 7); g.stroke();
    g.fillStyle = C.red; g.font = font(r * 0.42, 900); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 0, 4); g.restore(); }
  // склейки -> звук удара
  function cutSounds(s, cuts, name = 'woodblock', v = 0.15) { cuts.slice(1).forEach((c) => s.play(c, name, v)); }
  return { C, SANS, SERIF, cl, eo, eio, sp, mix, font, rr, scene, fade, bg, camera, slam, stack, rule, strike, crowd, gather, bricks, note, seal, cutSounds };
})();
