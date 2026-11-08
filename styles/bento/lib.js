// Стиль «Бенто-блоки» (BENTO). Одна константа.
const BENTO = (() => {
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
  const C = { blue: '#2E6BFF', coral: '#FF5A4E', yellow: '#FFC02E', white: '#FFFFFF', ink: '#111318', navy: '#141A33', gray: '#F2F3F5', green: '#22C55E', muted: '#7A7E88', line: '#E3E5EA' };
  const { cl, eo, eio, sp, mix, font, rr } = M;
  // фон: новый цвет заезжает снизу за 0.4 с
  function bg(g, prev, col, lt) { g.fillStyle = prev; g.fillRect(0, 0, 1080, 1920); const w = eio(lt / 0.4); g.fillStyle = col; g.fillRect(0, 1920 * (1 - w), 1080, 1920 * w); }
  // уход сцены: 1 → 0 за последние 0.25 с
  function out(lt, dur, last) { return last ? 1 : 1 - eo((lt - (dur - 0.25)) / 0.2); }
  // плавающие кубики на цветном фоне
  function cubes(g, t, n = 10) { for (let j = 0; j < n; j++) { const x = (j * 211) % 1080, y = ((j * 337 + t * 40 * (1 + j % 3)) % 2100) - 100; g.save(); g.translate(x, y); g.rotate(t * 0.6 + j); g.fillStyle = [C.white, C.yellow, C.coral, C.blue][j % 4]; g.globalAlpha *= 0.5; rr(g, -30, -30, 60, 60, 12); g.fill(); g.restore(); } }
  // заголовок слева, *ключ* цветом key
  function head(g, s, t, t0, col = C.ink, o = {}) { return M.words(g, s, o.x || 80, o.y || 300, o.size || 96, t, t0, { color: col, key: o.key || C.blue, weight: 900, w: o.w || 920 }); }
  // слово на цветной плашке с наклоном, возвращает ширину
  function chip(g, s, x, y, size, bgc, fg, p) { g.save(); g.font = font(size, 900); const w = g.measureText(s).width; if (p > 0) { g.translate(x + w / 2 + 18, y); g.rotate(-0.03); g.scale(p, p); g.fillStyle = bgc; rr(g, -w / 2 - 18, -size * 0.85, w + 36, size * 1.12, 16); g.fill(); g.fillStyle = fg; g.textAlign = 'center'; g.fillText(s, 0, 0); } g.restore(); return w + 52; }
  // плитка бенто с подписью; p 0..1 пружина появления
  function tile(g, x, y, w, h, col, label, p, o = {}) { if (p <= 0) return; g.save(); g.translate(x + w / 2, y + h / 2); g.scale(p, p); g.translate(-x - w / 2, -y - h / 2); g.fillStyle = col; rr(g, x, y, w, h, 28); g.fill(); const fg = col === C.yellow || col === C.white || col === C.gray ? C.ink : C.white; g.fillStyle = fg; g.font = font(o.size || 40, 900); g.textAlign = 'left'; g.fillText(label, x + 28, y + h - 30); if (o.big) { g.font = font(o.bigSize || 80, 900); g.fillText(o.big, x + 28, y + 100); } g.restore(); }
  // карточка с тенью
  function card(g, x, y, w, h, r = 22) { g.save(); g.shadowColor = 'rgba(0,0,0,0.12)'; g.shadowBlur = 40; g.shadowOffsetY = 14; g.fillStyle = C.white; rr(g, x, y, w, h, r); g.fill(); g.restore(); }
  // телефон со страницей-бенто: blocks [[цвет, текст]], до 5
  function phone(g, x, y, s, t, title, blocks) { if (s <= 0) return; g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = C.ink; rr(g, -200, -400, 400, 800, 56); g.fill(); g.fillStyle = C.white; rr(g, -184, -384, 368, 768, 44); g.fill(); g.fillStyle = C.yellow; g.beginPath(); g.arc(0, -290, 46, 0, 7); g.fill(); g.fillStyle = C.ink; g.font = font(30, 900); g.textAlign = 'center'; g.fillText(title, 0, -215);
    const L = [[-160, -170, 150, 120], [10, -170, 150, 120], [-160, -30, 320, 110], [-160, 100, 150, 150], [10, 100, 150, 150]]; (blocks || []).slice(0, 5).forEach(([c, tx], j) => { const [bx, by, bw, bh] = L[j]; const q = sp((t - j * 0.12) / 0.4); if (q <= 0) return; g.save(); g.translate(bx + bw / 2, by + bh / 2); g.scale(q, q); g.fillStyle = c; rr(g, -bw / 2, -bh / 2, bw, bh, 18); g.fill(); g.fillStyle = c === C.yellow ? C.ink : C.white; g.font = font(26, 900); g.fillText(tx, 0, 10); g.restore(); }); g.restore(); }
  // цепочка шагов по диагонали: steps [[подпись, текст]], пунктир между ними
  function flow(g, steps, t, t0, o = {}) { const P = steps.map((_, j) => [220 + j * (640 / Math.max(1, steps.length - 1)), (o.y || 900) + j * (o.dy || 260)]); steps.forEach(([a, b], j) => { const [x, y] = P[j], p = sp((t - t0 - j * 0.6) / 0.45); if (p > 0) { g.save(); g.translate(x, y); g.scale(p, p); card(g, -170, -80, 340, 160); g.fillStyle = C.muted; g.font = font(26, 700); g.textAlign = 'center'; g.fillText(a, 0, -22); g.fillStyle = C.ink; g.font = font(40, 900); g.fillText(b, 0, 36); g.restore(); }
    if (j < steps.length - 1) { const q = eo((t - t0 - 0.4 - j * 0.6) / 0.4), [nx, ny] = P[j + 1]; if (q > 0) { g.strokeStyle = o.line || C.white; g.lineWidth = 6; g.setLineDash([14, 12]); g.beginPath(); g.moveTo(x, y + 80); g.lineTo(x + (nx - x) * q, y + 80 + (ny - 160 - y) * q); g.stroke(); g.setLineDash([]); } } }); }
  // чат с агентом: msgs [[текст, моё?]]
  function chat(g, msgs, t, t0, o = {}) { const x = o.x || 80, w = o.w || 920; let y = o.y || 760; msgs.forEach(([s, me], j) => { const p = sp((t - t0 - j * 0.7) / 0.4); g.font = font(38, 700); const L = M.layout(g, s, 38, w - 200, 700); const h = L.lines.length * 46 + 44; if (p > 0) { g.save(); g.globalAlpha *= cl(p * 2); const bw = Math.min(w - 120, Math.max(...L.lines.map((ln) => ln.reduce((a, b) => a + b.w, 0) + L.sw * (ln.length - 1))) + 56); const bx = me ? x + w - bw : x; g.fillStyle = me ? C.blue : (o.dark ? '#26304F' : C.gray); rr(g, bx, y, bw, h, 26); g.fill(); M.words(g, s, bx + 28, y + 22, 38, 99, 0, { color: me || o.dark ? C.white : C.ink, w: bw - 56, weight: 700 }); g.restore(); } y += h + 24; }); }
  // логотип из трёх квадратов
  function logo(g, x, y, s) { if (s <= 0) return; g.save(); g.translate(x, y); g.scale(s, s); g.rotate(-0.25); [[C.blue, -40, -40], [C.coral, 40, -40], [C.yellow, 0, 40]].forEach(([c, dx, dy]) => { g.fillStyle = c; rr(g, dx - 36, dy - 36, 72, 72, 16); g.fill(); }); g.restore(); }
  // кнопка-пилюля растёт из центра
  function cta(g, s, y, t, t0, col = C.blue) { const c = sp((t - t0) / 0.4); if (c <= 0) return; g.fillStyle = col; rr(g, 540 - 270 * c, y, 540 * c, 120, 60); g.fill(); g.save(); g.globalAlpha *= cl(c); g.fillStyle = C.white; g.font = font(46, 800); g.textAlign = 'center'; g.fillText(s, 540, y + 76); g.restore(); }
  // круглая наклейка (скидка, «0%»)
  function sticker(g, s, sub, x, y, t, t0, col = C.white) { const z = sp((t - t0) / 0.4); if (z <= 0) return; g.save(); g.translate(x, y); g.rotate(0.15); g.scale(z, z); g.fillStyle = col; rr(g, -130, -60, 260, 120, 20); g.fill(); g.fillStyle = C.ink; g.font = font(56, 900); g.textAlign = 'center'; g.fillText(s, 0, 4); g.font = font(24, 700); g.fillText(sub || '', 0, 40); g.restore(); }
  return Object.assign({}, M, { C, bg, out, cubes, head, chip, tile, card, phone, flow, chat, logo, cta, sticker });
})();
