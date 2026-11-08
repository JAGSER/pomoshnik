// Стиль «Поп-журнал» (ZINE). Одна константа.
const ZINE = (() => {
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
  const C = { pink: '#FF3E8A', pinkDot: '#C21E8A', yellow: '#FFD31A', yellowDot: '#F2B400', blue: '#3E6BFF', blue2: '#5A84FF', orange: '#FF6A1A', orange2: '#FF8A3D', lime: '#C8F21E', limeDot: '#A6D10E', violet: '#9B4DFF', violetDot: '#7A2BE0', ink: '#111111', white: '#FFFFFF', term: '#1C1C24', night: '#16121F' };
  const { cl, eo, eio, sp, mix, font, rr } = M;
  // фон с растром точек: half(g, C.pink, C.pinkDot)
  function half(g, c1, c2, step = 26) { g.fillStyle = c1; g.fillRect(0, 0, 1080, 1920); g.fillStyle = c2; for (let y = 0; y < 1920; y += step) for (let x = (y / step) % 2 ? step / 2 : 0; x < 1080; x += step) { g.beginPath(); g.arc(x, y, 3 + 4 * (y / 1920), 0, 7); g.fill(); } }
  // фон в крупную клетку
  function checker(g, c1 = C.blue, c2 = C.blue2, s = 90) { g.fillStyle = c1; g.fillRect(0, 0, 1080, 1920); g.fillStyle = c2; for (let y = 0; y < 1920; y += s) for (let x = (y / s) % 2 ? s : 0; x < 1080; x += s * 2) g.fillRect(x, y, s, s); }
  // вращающиеся лучи на весь кадр
  function rays(g, t, c1 = C.orange, c2 = C.orange2, cy = 1000) { g.save(); g.translate(540, cy); g.rotate(t * 0.3); for (let j = 0; j < 24; j++) { g.rotate(Math.PI / 12); g.fillStyle = j % 2 ? c1 : c2; g.beginPath(); g.moveTo(0, 0); g.lineTo(1500, -200); g.lineTo(1500, 200); g.closePath(); g.fill(); } g.restore(); }
  // наклонная лента с бегущим текстом
  function tape(g, s, y, rot, t, bg = C.yellow, fg = C.ink, dir = 1) { g.save(); g.translate(540, y); g.rotate(rot); g.fillStyle = bg; g.fillRect(-800, -44, 1600, 88); g.fillStyle = fg; g.font = font(46, 900); g.textAlign = 'left'; let x = -1600 + ((t * 200 * dir) % 800 + 800) % 800; for (let q = 0; q < 8; q++) { g.fillText(s, x, 16); x += g.measureText(s).width + 40; } g.restore(); }
  // жирное слово с чёрной обводкой, p пружина появления; сам ужимается до 960
  function word(g, s, x, y, size, fill, o = {}) { const p = o.p == null ? 1 : o.p; if (p <= 0) return; g.save(); g.translate(x, y); g.rotate(o.rot || 0); g.scale(p, p); let sz = size; g.font = font(sz, 900); while (g.measureText(s).width > (o.max || 960) && sz > 30) { sz -= 4; g.font = font(sz, 900); } g.textAlign = o.align || 'left'; g.lineJoin = 'round'; g.strokeStyle = o.stroke || C.ink; g.lineWidth = sz * 0.16; g.strokeText(s, 0, 0); g.fillStyle = fill; g.fillText(s, 0, 0); g.restore(); }
  // белая карточка с курсивной антиквой (как «una IA»)
  function card(g, s, x, y, size, p, rot = -0.06) { if (p <= 0) return; g.save(); g.translate(x, y); g.rotate(rot); g.scale(p, p); g.font = `italic 700 ${size}px ${M.SERIF}`; const w = g.measureText(s).width + 80, h = size * 1.4; g.fillStyle = C.ink; g.fillRect(-w / 2 + 12, -h / 2 + 12, w, h); g.fillStyle = C.white; g.fillRect(-w / 2, -h / 2, w, h); g.strokeStyle = C.ink; g.lineWidth = 6; g.strokeRect(-w / 2, -h / 2, w, h); g.fillStyle = C.ink; g.textAlign = 'center'; g.fillText(s, 0, size * 0.33); g.restore(); }
  // наклейка-плашка: заголовок + подпись, тень-сдвиг, текст сам ужимается
  function sticker(g, s, sub, x, y, w, h, bg, p, o = {}) { if (p <= 0) return; const fg = o.fg || (bg === C.white || bg === C.yellow || bg === C.lime ? C.ink : C.white); g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(o.rot || 0); g.scale(p, p); g.fillStyle = C.ink; g.fillRect(-w / 2 + 10, -h / 2 + 10, w, h); g.fillStyle = bg; g.fillRect(-w / 2, -h / 2, w, h); g.strokeStyle = C.ink; g.lineWidth = 5; g.strokeRect(-w / 2, -h / 2, w, h); g.fillStyle = fg; let fs = Math.min(76, h * 0.42); g.font = font(fs, 900); while (g.measureText(s).width > w - 48 && fs > 20) { fs -= 3; g.font = font(fs, 900); } g.textAlign = 'left'; g.fillText(s, -w / 2 + 24, -h / 2 + (sub ? h * 0.48 : h * 0.62)); if (sub) { g.font = font(24, 700); g.fillText(sub, -w / 2 + 24, -h / 2 + h * 0.78); } g.restore(); }
  // окно терминала с печатью строк: строки с «✦» оранжевые, с «+» лаймовые
  function term(g, x, y, w, h, lines, t, t0, o = {}) { g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(o.rot == null ? -0.03 : o.rot); g.fillStyle = C.ink; g.fillRect(-w / 2 + 12, -h / 2 + 12, w, h); g.fillStyle = C.term; g.fillRect(-w / 2, -h / 2, w, h); g.strokeStyle = C.lime; g.lineWidth = 6; g.strokeRect(-w / 2, -h / 2, w, h); g.fillStyle = '#2A2A36'; g.fillRect(-w / 2, -h / 2, w, 54); ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, j) => { g.fillStyle = c; g.beginPath(); g.arc(-w / 2 + 30 + j * 26, -h / 2 + 27, 9, 0, 7); g.fill(); }); g.fillStyle = '#AAA'; g.font = font(22, 600, 'mono'); g.textAlign = 'center'; g.fillText(o.title || 'терминал', 0, -h / 2 + 35);
    const tot = lines.join('').length, n = Math.floor(cl((t - t0) / (o.d || 2.2)) * tot); let c = 0; g.textAlign = 'left'; lines.forEach((s, j) => { const v = s.slice(0, Math.max(0, Math.min(s.length, n - c))); c += s.length; g.fillStyle = s.startsWith('✦') ? C.orange : s.startsWith('+') ? C.lime : '#E8E8F0'; g.font = font(28, 500, 'mono'); g.fillText(v, -w / 2 + 30, -h / 2 + 110 + j * 46); }); g.restore(); }
  // телефон с градиентным экраном и прыгающими точками
  function phone(g, x, y, s, rot, title, c1, c2, t) { if (s <= 0) return; g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); g.fillStyle = C.ink; rr(g, -150, -300, 300, 600, 40); g.fill(); const gr = g.createLinearGradient(0, -280, 0, 280); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; rr(g, -136, -286, 272, 572, 30); g.fill(); g.fillStyle = C.white; g.font = font(30, 900); g.textAlign = 'center'; g.fillText(title, 0, -150); for (let q = 0; q < 5; q++) { g.fillStyle = [C.yellow, C.lime, C.white, C.orange, C.pink][q]; g.beginPath(); g.arc(-80 + q * 40, 40 + Math.sin(t * 4 + q) * 40, 14, 0, 7); g.fill(); } g.restore(); }
  // нумерованный шаг: кружок с цифрой и белая плашка с текстом
  function step(g, n, s, x, y, col, p) { if (p <= 0) return; g.save(); g.translate(x, y); g.scale(p, p); g.fillStyle = col; g.beginPath(); g.arc(60, 60, 60, 0, 7); g.fill(); g.strokeStyle = C.ink; g.lineWidth = 5; g.stroke(); g.fillStyle = C.white; g.font = font(64, 900); g.textAlign = 'center'; g.fillText(String(n), 60, 84); g.fillStyle = C.white; g.fillRect(150, 10, 760, 100); g.strokeRect(150, 10, 760, 100); g.fillStyle = C.ink; let fs = 38; g.font = font(fs, 800); while (g.measureText(s).width > 720 && fs > 20) { fs -= 2; g.font = font(fs, 800); } g.textAlign = 'left'; g.fillText(s, 180, 75); g.restore(); }
  return Object.assign({}, M, { C, half, checker, rays, tape, word, card, sticker, term, phone, step });
})();
