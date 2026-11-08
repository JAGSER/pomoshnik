// Стиль «Отчёт-инфографика» (INFO). Одна константа.
const INFO = (() => {
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
  const C = { bg: '#0D1424', amber: '#FFB21E', amber2: '#FFD15C', deep: '#FF8A00', text: '#EEF1F6', muted: '#7F8AA3', line: '#26304A', panel: '#1A2238', yellow: '#FFC61A', ink: '#1A1408' };
  const { cl, eo, eio, sp, mix, font, rr } = M;
  // тёмный фон с мягким свечением и строкой подвала (left, right)
  function bg(g, left = '', right = '') { g.fillStyle = C.bg; g.fillRect(0, 0, 1080, 1920); const gr = g.createRadialGradient(540, 960, 50, 540, 960, 900); gr.addColorStop(0, 'rgba(255,178,30,0.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 1080, 1920); g.fillStyle = C.muted; g.font = font(18, 600, 'mono'); g.textAlign = 'left'; g.fillText(left, 60, 1690); g.textAlign = 'right'; g.fillText(right, 1020, 1690); }
  // жёлтая шторка снизу вверх с косыми полосами (p 0..1)
  function wipe(g, p) { g.fillStyle = C.yellow; g.fillRect(0, 1920 * (1 - p), 1080, 1920 * p); g.save(); g.beginPath(); g.rect(0, 1920 * (1 - p), 1080, 1920 * p); g.clip(); g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 30; for (let x = -1920; x < 1080; x += 120) { g.beginPath(); g.moveTo(x, 1920); g.lineTo(x + 1920, 0); g.stroke(); } g.restore(); }
  // светящийся шар-символ с дугой
  function orb(g, x, y, r, t) { if (r <= 0) return; g.save(); g.shadowColor = C.amber; g.shadowBlur = 50; const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r); gr.addColorStop(0, C.amber2); gr.addColorStop(1, C.deep); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.restore(); g.strokeStyle = C.amber; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r * 1.5, -1.2 + t, 1.6 + t); g.stroke(); }
  // ярлык раздела: янтарная черта + моно-текст (y базовая линия, dark для жёлтого фона)
  function label(g, s, y, t, t0, dark) { g.save(); g.globalAlpha *= eo((t - t0) / 0.3); g.fillStyle = dark ? C.ink : C.amber; g.fillRect(80, y - 8, 40, 3); g.font = font(22, 700, 'mono'); g.textAlign = 'left'; g.fillText(s, 135, y); g.restore(); }
  // заголовок слева, *ключ* янтарём
  function title(g, s, y, t, t0, o = {}) { return M.words(g, s, 80, y, o.size || 64, t, t0, { color: o.dark ? C.ink : C.text, key: o.dark ? C.ink : C.amber, weight: 800, w: 920 }); }
  // вертикальный таймлайн: items [[год, подпись]], линия заполняется за d секунд, последний год янтарный
  function timeline(g, items, t, t0, o = {}) { const y0 = o.y || 520, gap = o.gap || 280, pr = eio((t - t0) / (o.d || 2)), n = items.length; g.strokeStyle = C.line; g.lineWidth = 4; g.beginPath(); g.moveTo(200, y0); g.lineTo(200, y0 + gap * (n - 1) + 80); g.stroke(); g.strokeStyle = C.amber; g.beginPath(); g.moveTo(200, y0); g.lineTo(200, y0 + (gap * (n - 1) + 80) * pr); g.stroke();
    items.forEach(([a, b], j) => { const yy = y0 + 40 + j * gap, on = pr * (n - 0.8) >= j; g.save(); g.globalAlpha *= on ? 1 : 0.3; g.fillStyle = j === n - 1 ? C.amber : C.text; g.font = font(84, 800); g.textAlign = 'left'; g.fillText(a, 260, yy + 20); g.fillStyle = C.muted; g.font = font(30, 500); g.fillText(b, 262, yy + 70); g.fillStyle = on ? C.amber : C.line; g.beginPath(); g.arc(200, yy, 14, 0, 7); g.fill(); g.restore(); }); }
  // цепочка шагов-кружков сверху вниз: items [[символ, подпись]]
  function chain(g, items, t, t0, o = {}) { const y0 = o.y || 760, gap = o.gap || 220; items.forEach(([e, s], j) => { const y = y0 + j * gap, p = sp((t - t0 - j * 0.4) / 0.4); if (j && p > 0) { g.strokeStyle = C.amber; g.lineWidth = 3; g.setLineDash([8, 8]); g.beginPath(); g.moveTo(200, y - gap + 80); g.lineTo(200, y - 80); g.stroke(); g.setLineDash([]); } if (p <= 0) return; g.save(); g.translate(200, y); g.scale(p, p); g.strokeStyle = C.amber; g.lineWidth = 4; g.fillStyle = C.panel; g.beginPath(); g.arc(0, 0, 66, 0, 7); g.fill(); g.stroke(); g.fillStyle = C.amber2; g.font = font(56, 900); g.textAlign = 'center'; g.fillText(e, 0, 20); g.restore(); g.save(); g.globalAlpha *= cl(p); g.fillStyle = C.text; g.font = font(40, 700); g.textAlign = 'left'; g.fillText(s, 310, y + 14); g.restore(); }); }
  // крупные цифры на жёлтом: items [[подпись, число, единица, дробных знаков]]
  function stats(g, items, t, t0, o = {}) { const y0 = o.y || 720, gap = o.gap || 280; items.forEach(([a, v, u, dec], j) => { const y = y0 + j * gap, p = eo((t - t0 - j * 0.2) / 0.5); g.save(); g.globalAlpha *= p; g.fillStyle = C.ink; g.font = font(30, 700); g.textAlign = 'left'; g.fillText(a, 80, y); const k = eio((t - t0 - j * 0.2) / 1); const s = (v * k).toFixed(dec || 0).replace('.', ','); g.font = font(150, 900); g.fillText(s, 80, y + 150); const sw = g.measureText(s).width; g.font = font(44, 800); g.fillText(u || '', 110 + sw, y + 150); g.fillRect(80, y + 190, 920, 4); g.restore(); }); }
  // столбики с подписями, последний янтарный, пунктир тренда: items [[подпись, число]]
  function bars(g, items, t, t0, o = {}) { const base = o.base || 1450, k = o.k || 8, gap = o.gap || 220, x0 = o.x || 130; items.forEach(([l, v], j) => { const p = eio((t - t0 - j * 0.25) / 0.6), h = v * k * p, x = x0 + j * gap, last = j === items.length - 1; const gr = g.createLinearGradient(0, base - h, 0, base); gr.addColorStop(0, last ? C.amber2 : '#B07A18'); gr.addColorStop(1, last ? C.deep : '#5A3E10'); g.fillStyle = gr; g.fillRect(x, base - h, 150, h); g.fillStyle = last ? C.amber2 : C.text; g.font = font(last ? 72 : 56, 900); g.textAlign = 'center'; if (p > 0.1) g.fillText(String(Math.round(v * p)), x + 75, base - h - 24); g.fillStyle = C.muted; g.font = font(24, 600, 'mono'); g.fillText(String(l), x + 75, base + 50); });
    const lp = eio((t - t0 - 0.25 * items.length - 0.3) / 0.8); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3; g.setLineDash([10, 8]); g.beginPath(); items.forEach(([l, v], j) => { const x = x0 + 75 + j * gap, yy = base - v * k - 110; if (j / (items.length - 1) <= lp) j ? g.lineTo(x, yy) : g.moveTo(x, yy); }); g.stroke(); g.setLineDash([]); }
  // сетка точек-целей: n из total зажигаются по очереди
  function dots(g, total, n, o = {}) { const cols = o.cols || 10, x0 = o.x || 160, y0 = o.y || 900, dx = o.dx || 84, dy = o.dy || 72; for (let j = 0; j < total; j++) { const on = j < n; g.fillStyle = on ? C.amber : '#2A3350'; g.beginPath(); g.arc(x0 + (j % cols) * dx, y0 + Math.floor(j / cols) * dy, on ? 14 : 8, 0, 7); g.fill(); } }
  // финал: искры собираются, шар, кольцо, название и подпись
  function finale(g, name, sub, t, lt) { for (let j = 0; j < 30; j++) { const p = eio(lt / 0.8), a = j * 0.5, r = (1 - p) * (200 + (j * 37) % 400); g.fillStyle = C.amber2; g.beginPath(); g.arc(540 + Math.cos(a) * r, 800 + Math.sin(a) * r, 6, 0, 7); g.fill(); } orb(g, 540, 800, 80 * sp((lt - 0.3) / 0.5), t); g.strokeStyle = C.amber; g.lineWidth = 4; g.beginPath(); g.arc(540, 800, 130, 0, 6.28 * eo((lt - 0.4) / 0.8)); g.stroke(); g.save(); g.globalAlpha *= eo((lt - 0.8) / 0.5); g.fillStyle = C.text; let fs = 90; g.font = font(fs, 800); while (g.measureText(name).width > 940 && fs > 40) { fs -= 4; g.font = font(fs, 800); } g.textAlign = 'center'; g.fillText(name, 540, 1080); g.fillStyle = C.amber; g.font = font(36, 600); g.fillText(sub, 540, 1150); g.restore(); }
  return Object.assign({}, M, { C, bg, wipe, orb, label, title, timeline, chain, stats, bars, dots, finale });
})();
