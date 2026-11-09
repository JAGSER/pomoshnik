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
  function ava(g, x, y, s, j, t, o = {}) { const [shirt, hair] = AG[((j % 6) + 6) % 6]; const px = s / 8; g.save(); g.translate(x - s / 2, y - s / 2); if (o.frame !== false) { g.fillStyle = C.yellow; rr(g, -px, -px, s + 2 * px, s + 2 * px, px * 2); g.fill(); } const R = (cx, cy, w, h, c) => { g.fillStyle = c; g.fillRect(cx * px, cy * px, w * px, h * px); };
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
  function office(g, x, y, w, h, t, lt, task = '') { card(g, x, y, w, h); g.fillStyle = '#D9E8C8'; g.fillRect(x + 30, y + 30, w - 60, h - 60); const cw = (w - 60) / 3, rh = (h - 60) / 4; for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { const dx = x + 30 + c * cw + cw / 2, dy = y + 30 + r * rh; g.fillStyle = '#B98F5E'; g.fillRect(dx - 90, dy + 70, 180, 40); g.fillStyle = '#2C3E50'; g.fillRect(dx - 30, dy + 30, 60, 40); const j = r * 3 + c; if (j < 6) ava(g, dx, dy + 140 - Math.abs(Math.sin(t * 4 + j)) * 6, 60, j, t); }
    for (let j = 0; j < (task ? 3 : 0); j++) { const p = (lt * 0.4 + j / 3) % 1; g.fillStyle = C.white; rr(g, x + 120 + p * (w - 280), y + 220 + j * rh, 90, 40, 8); g.fill(); g.fillStyle = C.ink; g.font = font(20, 700); g.textAlign = 'center'; g.fillText(task, x + 165 + p * (w - 280), y + 246 + j * rh); } }
  // орбита из карточек-подписей вокруг центра
  function orbit(g, labels, cx, cy, r, lt) { labels.forEach((s, j) => { const a = j / labels.length * 6.283 + lt * 0.4, rr2 = r * eio((lt - j * 0.05) / 0.6); const x = cx + Math.cos(a) * rr2, y = cy + Math.sin(a) * rr2; g.strokeStyle = C.line; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(x, y); g.stroke(); card(g, x - 95, y - 40, 190, 80); g.fillStyle = C.ink; g.font = font(28, 800); g.textAlign = 'center'; g.fillText(s, x, y + 10); }); }
  // кнопка с обводкой растёт из центра
  function cta(g, s, y, t, t0) { const c = sp((t - t0) / 0.4); if (c <= 0) return; g.fillStyle = C.yellow; rr(g, 540 - 240 * c, y, 480 * c, 120, 60); g.fill(); g.strokeStyle = C.ink; g.lineWidth = 4; g.stroke(); g.save(); g.globalAlpha *= cl(c); g.fillStyle = C.ink; g.font = font(46, 900); g.textAlign = 'center'; g.fillText(s, 540, y + 76); g.restore(); }
  // ===== Типовые объекты: пиксельные спрайты (сетка, плоские цвета, 2 тона), кэш =====
  const NC = { red: '#E5484D', pink: C.pink, rose: '#F49AB5', orange: C.orange, ginger: '#D9772B', yellow: C.yellow, gold: '#E8B04B', green: C.green, dkgreen: '#2E7D4F', lime: '#9BD85B', blue: C.blue, navy: '#2B3A67', sky: '#8FCBF2', teal: C.teal, violet: C.violet, white: '#FFFFFF', cream: C.cream, sand: C.sand, beige: '#E6CFA8', gray: '#9AA0A6', grey: '#9AA0A6', silver: '#C9CDD2', black: '#26221E', ink: C.ink, brown: '#8B5A2B', dkbrown: '#5B3A29', skin: '#F2C29C', tan: '#C98E62', dark: '#8A5A3C', wood: '#B98F5E' };
  const col = (c, d) => (c == null || c === '' ? d : NC[c] || c);
  function shade(c, k) { c = col(c); if (typeof c !== 'string' || c[0] !== '#' || c.length < 7) return c; const n = parseInt(c.slice(1, 7), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))); return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join(''); }
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const SPC = new Map();
  function sprite(key, w, h, fn) { let c = SPC.get(key); if (c) return c; if (SPC.size > 700) SPC.clear(); c = new OffscreenCanvas(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h))); const x = c.getContext('2d'); const R = (a, b, ww, hh, cc) => { if (!cc || ww <= 0 || hh <= 0) return; x.fillStyle = cc; x.fillRect(a, b, ww, hh); }; fn(R, x); SPC.set(key, c); return c; }
  // спрайт на кадр: x,y — точка привязки (доли ax, ay), s — размер пикселя, dir −1 зеркально
  function put(g, sp, x, y, s, ax = 0.5, ay = 1, dir = 1) { g.save(); g.imageSmoothingEnabled = false; g.translate(Math.round(x), Math.round(y)); if (dir < 0) g.scale(-1, 1); g.drawImage(sp, -sp.width * s * ax, -sp.height * s * ay, sp.width * s, sp.height * s); g.restore(); }
  const discR = (R, cx, cy, r, c) => { for (let yy = -Math.ceil(r); yy < Math.ceil(r); yy++) { const hw = Math.round(Math.sqrt(Math.max(0, r * r - (yy + 0.5) * (yy + 0.5)))); R(cx - hw, cy + yy, 2 * hw, 1, c); } };
  // свой предмет: rows — строки символов, pal {символ: цвет}; x,y — низ по центру
  function pix(g, x, y, s, rows, pal, o = {}) { const key = 'X' + rows.join('/') + JSON.stringify(pal); const w = Math.max(...rows.map((r) => r.length)); const sp = sprite(key, w, rows.length, (R) => rows.forEach((r, yy) => [...r].forEach((ch, xx) => { if (pal[ch]) R(xx, yy, 1, 1, col(pal[ch])); }))); put(g, sp, x, y, s, o.ax == null ? 0.5 : o.ax, o.ay == null ? 1 : o.ay, o.dir || 1); }

  // ЧЕЛОВЕК. x — центр, y — пол. o: {s, age:'adult'|'kid'|'old', pose:'stand'|'walk'|'run'|'wave'|'cheer'|'dance'|'shout'|'hold'|'read'|'sit', t, ph,
  //   j, shirt, pants, hair, skin, shoes, style:'short'|'long'|'bun'|'curly'|'none', hat:'helmet'|'cap'|'beanie'|'scarf', hatCol, bag, item:'book'|'box'|'peach'|'fish'|'cup'|'flower'|'phone'|'accordion', itemCol, glasses, beard, dress, apron, dir}
  function person(g, x, y, o = {}) {
    const age = o.age || 'adult', kid = age === 'kid', old = age === 'old', s = o.s || 8, t = o.t || 0, pose = o.pose || 'stand', jj = ((o.j || 0) % 6 + 6) % 6;
    const sh = col(o.shirt, AG[jj][0]), hr = col(o.hair, old ? '#DADADA' : AG[jj][1]), sk = col(o.skin, NC.skin), pn = col(o.pants, kid ? '#3F4F86' : '#2B3A67'), shoe = col(o.shoes, '#3A2A20');
    const fps = { walk: 5, run: 9, wave: 3, cheer: 2.5, dance: 3.5, shout: 4, accordion: 2 }[pose] || (o.item === 'accordion' ? 2 : 0);
    const f = fps ? Math.floor((t + (o.ph || 0)) * fps) % 2 : 0;
    const hat = o.hat || '', hc = col(o.hatCol, hat === 'helmet' ? C.yellow : hat === 'scarf' ? '#C8553D' : C.blue), st = o.style || 'short';
    const item = o.item || (pose === 'read' ? 'book' : ''), ic = col(o.itemCol, { book: '#C8553D', box: '#B98F5E', peach: '#F79A5B', fish: '#9FB3C8', cup: '#FFFFFF', flower: C.pink, phone: C.ink, accordion: '#C8553D' }[item] || C.orange);
    const bag = o.bag ? col(o.bag === true ? C.orange : o.bag) : '';
    const T = 3, B = T + 5, bh = kid ? 3 : 5, Lg = B + bh, ll = kid ? 3 : 4, sit = pose === 'sit', H = Lg + ll + (sit ? 0 : 1);
    const key = ['P', age, pose, f, sh, hr, sk, pn, shoe, hat, hc, st, item, ic, bag, o.glasses ? 1 : 0, o.beard ? 1 : 0, o.dress ? 1 : 0, o.apron ? 1 : 0].join('|');
    const sp = sprite(key, 13, H, (R) => {
      const arm = shade(sh, -0.14), ink = C.ink;
      if (bag) { R(2, B, 1, 4, bag); R(10, B, 1, 4, bag); R(3, B - 1, 1, 1, bag); R(9, B - 1, 1, 1, bag); }
      if (st === 'long') { R(3, T + 2, 1, 5, hr); R(9, T + 2, 1, 5, hr); }
      // ноги
      if (sit) { R(4, Lg, 5, 1, pn); R(4, Lg + 1, 2, ll - 2, pn); R(7, Lg + 1, 2, ll - 2, pn); R(4, Lg + ll - 1, 2, 1, shoe); R(7, Lg + ll - 1, 2, 1, shoe); }
      else {
        let lA = 0, rA = 0, lU = 0, rU = 0;
        if (pose === 'walk' || pose === 'dance') { if (f) rA = 1; else lA = -1; }
        if (pose === 'run') { if (f) { rA = 1; lU = 1; } else { lA = -1; rU = 1; } }
        const hu = Math.floor(ll / 2);
        R(4, Lg, 2, hu, pn); R(4 + lA, Lg + hu, 2, ll - hu - lU, pn); R(4 + lA, Lg + ll - lU, 2, 1, shoe);
        R(7, Lg, 2, hu, pn); R(7 + rA, Lg + hu, 2, ll - hu - rU, pn); R(7 + rA, Lg + ll - rU, 2, 1, shoe);
      }
      if (o.dress) R(3, Lg, 7, 2, sh);
      // тело
      R(4, B, 5, bh, sh); R(6, B, 1, 1, shade(sh, 0.35));
      if (o.apron) R(5, B + 1, 3, bh, '#FFFFFF');
      if (bag) { R(4, B, 1, bh - 1, shade(bag, -0.25)); R(8, B, 1, bh - 1, shade(bag, -0.25)); }
      // руки
      const down = (c, n) => { R(c, B, 1, n, arm); R(c, B + n, 1, 1, sk); };
      const up = (c, d) => { R(c, B, 1, 1, arm); R(c + d, B - 3, 1, 3, arm); R(c + d, B - 4, 1, 1, sk); };
      const out = (c, d) => { R(c, B, 1, 1, arm); R(c + d, B, 1, 1, arm); R(c + 2 * d, B, 1, 1, sk); };
      const front = item || pose === 'hold' || pose === 'read';
      if (pose === 'wave') { down(3, bh - 1); if (f) { R(9, B, 1, 1, arm); R(10, B - 2, 1, 2, arm); R(11, B - 3, 1, 1, arm); R(11, B - 4, 1, 1, sk); } else up(9, 1); }
      else if (pose === 'cheer') { up(3, -1); up(9, 1); if (f) { R(2, B - 5, 1, 1, sk); R(10, B - 5, 1, 1, sk); } }
      else if (pose === 'dance') { if (f) { up(9, 1); out(3, -1); } else { up(3, -1); out(9, 1); } }
      else if (front) { R(3, B, 1, bh - 2, arm); R(9, B, 1, bh - 2, arm); R(4, B + bh - 2, 1, 1, sk); R(8, B + bh - 2, 1, 1, sk); }
      else if (pose === 'walk' || pose === 'run') { down(3, f ? bh - 1 : bh - 2); down(9, f ? bh - 2 : bh - 1); }
      else { down(3, bh - 1); down(9, bh - 1); }
      // предмет в руках
      const iy = B + bh - 3;
      if (item === 'book') { const by = pose === 'read' ? B : iy; R(3, by + 1, 7, 3, ic); R(6, by + 1, 1, 3, '#F4EBD0'); R(4, by + 1, 1, 1, shade(ic, 0.3)); }
      else if (item === 'accordion') { const w = f ? 9 : 7, ax = 6.5 - w / 2; R(ax, iy, w, 4, ic); for (let k = 1; k < w - 1; k += 2) R(ax + k, iy, 1, 4, shade(ic, -0.35)); R(ax - 1, iy, 1, 4, '#FFFFFF'); R(ax + w, iy, 1, 4, '#FFFFFF'); }
      else if (item === 'fish') { R(3, iy + 1, 6, 2, ic); R(9, iy, 1, 4, ic); R(4, iy + 1, 1, 1, ink); }
      else if (item === 'peach') { R(5, iy, 3, 3, ic); R(6, iy - 1, 1, 1, NC.green); }
      else if (item === 'flower') { R(6, iy, 1, 4, NC.green); R(5, iy - 2, 3, 2, ic); }
      else if (item === 'phone') { R(5, iy, 2, 3, ic); }
      else if (item === 'cup') { R(5, iy, 3, 3, ic); R(8, iy + 1, 1, 1, ic); }
      else if (item) { R(4, iy, 5, 4, ic); R(4, iy, 5, 1, shade(ic, 0.3)); }
      // голова
      R(4, T + 1, 5, 4, sk);
      if (st === 'none') { R(4, T, 5, 1, sk); R(3, T + 2, 1, 2, hr); R(9, T + 2, 1, 2, hr); }
      else { R(4, T, 5, 1, hr); R(3, T + 1, 7, 1, hr); R(3, T + 2, 1, 2, hr); R(9, T + 2, 1, 2, hr); }
      if (st === 'bun') R(5, T - 2, 3, 2, hr);
      if (st === 'curly') { R(2, T + 1, 1, 3, hr); R(10, T + 1, 1, 3, hr); R(5, T - 1, 3, 1, hr); }
      if (o.glasses) { R(4, T + 2, 2, 1, '#FFFFFF'); R(7, T + 2, 2, 1, '#FFFFFF'); R(5, T + 2, 1, 1, ink); R(7, T + 2, 1, 1, ink); R(6, T + 2, 1, 1, ink); }
      else { R(5, T + 2, 1, 1, ink); R(7, T + 2, 1, 1, ink); }
      if (o.beard) { R(4, T + 3, 1, 2, hr); R(8, T + 3, 1, 2, hr); R(4, T + 4, 5, 1, hr); }
      if (pose === 'shout') R(6, T + 3, 1, f ? 2 : 1, ink); else if (!o.beard) R(6, T + 4, 1, 1, '#B3624B');
      R(4, T + 3, 1, 1, shade(sk, -0.06)); R(8, T + 3, 1, 1, shade(sk, -0.06));
      // головной убор
      if (hat === 'helmet') { R(4, T - 2, 5, 1, hc); R(3, T - 1, 7, 2, hc); R(2, T + 1, 9, 1, shade(hc, -0.15)); R(5, T - 1, 1, 1, shade(hc, 0.4)); }
      else if (hat === 'cap') { R(4, T - 1, 5, 2, hc); R(3, T + 1, 7, 1, shade(hc, -0.25)); }
      else if (hat === 'beanie') { R(4, T - 1, 5, 1, hc); R(3, T, 7, 2, hc); R(6, T - 2, 1, 1, '#FFFFFF'); }
      else if (hat === 'scarf') { R(4, T - 1, 5, 1, hc); R(3, T, 7, 2, hc); R(3, T + 2, 1, 3, hc); R(9, T + 2, 1, 3, hc); R(5, B, 3, 1, shade(hc, -0.2)); }
    });
    const bob = (pose === 'run' || pose === 'dance') && f ? -s : 0;
    put(g, sp, x, y + bob, s, 0.5, 1, o.dir || 1);
    const top = y + bob - (H - T + (hat ? 2 : 0)) * s;
    return { top, w: 13 * s, h: H * s, hx: x + 4.5 * s * (o.dir || 1), hy: y + bob - (H - B + 4) * s, head: y + bob - (H - T - 2) * s };
  }
  // ряд разных людей: o {n, s, poses, ages, seed, each:(i)=>({…})}; держи шаг ≥ 14·s
  function crowd(g, x0, x1, y, t, o = {}) { const n = o.n || 5, seed = o.seed || 1, P = o.poses || ['stand'], A = o.ages || ['adult'], SH = [C.blue, C.pink, C.green, C.violet, C.orange, C.teal, '#E5484D', '#E8B04B'], HR = ['#3A2618', '#8B3A1E', '#141414', '#E8B04B', '#5B3A29', '#2B1B12']; const r = []; for (let i = 0; i < n; i++) { const xi = n > 1 ? mix(x0, x1, i / (n - 1)) : (x0 + x1) / 2, h = hash(i * 7.3 + seed); const age = A[i % A.length]; r.push(person(g, xi, y, Object.assign({ s: o.s, t, ph: h, age, pose: P[i % P.length], shirt: SH[Math.floor(h * 8)], hair: age === 'old' ? undefined : HR[(i + Math.floor(seed)) % 6], style: hash(i + seed * 3) > 0.6 ? 'long' : 'short', dir: o.dir }, o.each ? o.each(i) : {}))); } return r; }

  // ТРАНСПОРТ (вид сбоку, едет вправо; dir −1 влево; x — центр, y — дорога)
  function car(g, x, y, o = {}) { const s = o.s || 8, c = col(o.col, C.blue), sp = sprite('car' + c, 24, 11, (R) => { R(6, 0, 11, 1, c); R(5, 1, 13, 3, c); R(7, 1, 4, 2, '#CDE8F7'); R(12, 1, 4, 2, '#CDE8F7'); R(1, 4, 22, 4, c); R(1, 7, 22, 1, shade(c, -0.25)); R(22, 5, 1, 1, C.yellow); R(1, 5, 1, 1, '#E5484D'); R(3, 7, 5, 4, C.ink); R(17, 7, 5, 4, C.ink); R(4, 8, 3, 2, '#9AA0A6'); R(18, 8, 3, 2, '#9AA0A6'); }); put(g, sp, x, y, s, 0.5, 1, o.dir || 1); }
  // автобус: num — номер на табло ('№3'), pax — сколько голов в окнах
  function bus(g, x, y, o = {}) { const s = o.s || 8, c = col(o.col, C.blue), pax = o.pax || 0, dir = o.dir || 1; const sp = sprite('bus' + c + pax, 40, 20, (R) => { R(0, 1, 40, 15, c); R(0, 1, 40, 1, shade(c, 0.35)); R(0, 12, 40, 1, shade(c, -0.25)); R(0, 15, 40, 1, shade(c, -0.3)); for (let k = 0; k < 5; k++) { const wx = 2 + 6 * k; R(wx, 4, 5, 6, '#CDE8F7'); if (k < pax) { const hc = ['#3A2618', '#E8B04B', '#141414', '#8B3A1E', '#5B3A29'][k]; R(wx + 1, 6, 3, 1, hc); R(wx + 1, 7, 3, 2, NC.skin); R(wx + 1, 9, 3, 1, [C.pink, C.green, C.orange, C.violet, C.teal][k]); } } R(32, 4, 3, 11, '#CDE8F7'); R(33, 4, 1, 11, shade(c, -0.2)); R(36, 5, 3, 6, '#CDE8F7'); R(32, 1, 8, 3, '#FFFFFF'); R(39, 13, 1, 1, C.yellow); R(0, 13, 1, 1, '#E5484D'); R(5, 15, 5, 5, C.ink); R(27, 15, 5, 5, C.ink); R(6, 16, 3, 3, '#9AA0A6'); R(28, 16, 3, 3, '#9AA0A6'); }); put(g, sp, x, y, s, 0.5, 1, dir); if (o.num) { const px = x + dir * (36 - 20) * s, py = y - 20 * s + 2.5 * s; g.save(); g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(3 * s, 900); g.fillText(o.num, px, py + 0.2 * s); g.restore(); } }
  // велосипедист: shirt, pants, hair, col (рама), t — педали
  function bike(g, x, y, o = {}) { const s = o.s || 8, f = Math.floor((o.t || 0) * 6 + (o.ph || 0) * 2) % 2, c = col(o.col, '#E5484D'), sh = col(o.shirt, C.green), pn = col(o.pants, '#2B3A67'), hr = col(o.hair, '#3A2618'), hc = o.hat ? col(o.hatCol, C.orange) : ''; const sp = sprite(['bk', f, c, sh, pn, hr, hc].join('|'), 19, 18, (R) => { const ring = (cx) => { R(cx - 2, 11, 4, 1, C.ink); R(cx - 2, 17, 4, 1, C.ink); R(cx - 3, 12, 1, 5, C.ink); R(cx + 2, 12, 1, 5, C.ink); R(cx - 1, 14, 1, 1, '#9AA0A6'); }; ring(4); ring(15); R(4, 14, 4, 1, c); R(7, 10, 1, 5, c); R(8, 13, 1, 1, c); R(9, 12, 1, 1, c); R(10, 11, 1, 1, c); R(7, 10, 7, 1, c); R(13, 9, 1, 5, c); R(14, 13, 1, 1, c); R(12, 7, 3, 1, C.ink); R(13, 8, 1, 1, C.ink); R(6, 9, 3, 1, C.ink); R(8, 0, 4, 1, hc || hr); R(8, 1, 4, 3, NC.skin); R(8, 1, 1, 2, hr); if (hc) R(7, 0, 6, 1, hc); R(10, 2, 1, 1, C.ink); R(7, 4, 3, 5, sh); R(10, 5, 2, 1, sh); R(12, 6, 1, 1, NC.skin); R(7, 8, 4, 1, pn); if (f) { R(10, 9, 1, 3, pn); R(10, 12, 2, 1, C.ink); } else { R(8, 9, 1, 4, pn); R(7, 13, 2, 1, C.ink); } }); put(g, sp, x, y, s, 0.5, 1, o.dir || 1); }
  // лодка/катер: y — линия воды; len, col, col2 (полоса), cabin, motor, crew:[{shirt, hat:'cap'|'helmet'|'beanie', hatCol, hair}], t, move (пена)
  function boat(g, x, y, o = {}) { const s = o.s || 8, L = o.len || 26, c = col(o.col, '#FFFFFF'), c2 = col(o.col2, '#E5484D'), crew = o.crew || [], mo = o.motor ? 3 : 0, W = L + mo; const key = ['bt', L, c, c2, o.cabin ? 1 : 0, mo, JSON.stringify(crew)].join('|'); const sp = sprite(key, W, 15, (R) => { if (o.cabin) { R(mo + 3, 3, 8, 6, '#FFFFFF'); R(mo + 3, 3, 8, 1, c2); R(mo + 4, 5, 2, 2, '#8FCBF2'); R(mo + 7, 5, 2, 2, '#8FCBF2'); } crew.forEach((m, i) => { const cx = mo + (o.cabin ? 13 : 4) + i * 4, sh = col(m.shirt, C.orange), hc = m.hat ? col(m.hatCol, m.hat === 'helmet' ? C.yellow : C.blue) : col(m.hair, '#3A2618'); R(cx, 2, 3, 1, hc); if (m.hat) R(cx - (m.hat === 'cap' ? 0 : 0), 2, m.hat === 'cap' ? 4 : 3, 1, hc); R(cx, 3, 3, 2, NC.skin); R(cx + 2, 3, 1, 1, C.ink); R(cx, 5, 3, 4, sh); R(cx + 3, 6, 1, 1, sh); }); R(mo, 8, L, 1, c); R(mo + L - 3, 6, 3, 2, c); R(mo + 1, 9, L - 1, 2, c); R(mo + 1, 10, L - 1, 1, c2); R(mo + 2, 11, L - 3, 2, shade(c, -0.3)); R(mo + 4, 13, L - 7, 1, shade(c, -0.4)); if (mo) { R(0, 6, 3, 3, '#3A3A3A'); R(1, 9, 1, 4, '#3A3A3A'); R(0, 6, 3, 1, '#6A6A6A'); } }); const dir = o.dir || 1; put(g, sp, x, y, s, 0.5, 11 / 15, dir); if (o.move) { const t = o.t || 0; g.save(); g.fillStyle = '#FFFFFF'; for (let k = 0; k < 6; k++) { const p = (t * 2 + k / 6) % 1; g.globalAlpha *= 1; g.fillRect(Math.round(x - dir * (W / 2 + 1 + p * 8) * s), Math.round(y + (k % 2 - 0.5) * s * (1 + p)), s, s); } g.restore(); } }

  // ЖИВОТНЫЕ (вид сбоку, морда вправо; x — центр, y — пол)
  function dog(g, x, y, o = {}) { const s = o.s || 8, c = col(o.col, NC.ginger), pose = o.pose || 'stand', t = o.t || 0, f = pose === 'walk' || pose === 'run' ? Math.floor(t * (pose === 'run' ? 9 : 5)) % 2 : Math.floor(t * 3) % 2, d = shade(c, -0.3), l = shade(c, 0.35); const sp = sprite(['dg', c, pose, f].join('|'), 17, 10, (R) => { if (pose === 'sleep') { R(2, 5, 10, 4, c); R(3, 8, 8, 1, d); R(11, 4, 4, 4, c); R(15, 6, 2, 2, c); R(16, 6, 1, 1, C.ink); R(12, 6, 2, 1, C.ink); R(11, 3, 2, 3, d); R(0, 7, 3, 1, c); R(10, 7, 3, 1, l); return; } if (pose === 'sit') { R(4, 5, 7, 5, c); R(8, 3, 3, 4, c); R(11, 1, 4, 4, c); R(15, 3, 2, 2, c); R(16, 3, 1, 1, C.ink); R(13, 2, 1, 1, C.ink); R(11, 0, 2, 3, d); R(9, 6, 1, 4, c); R(10, 6, 1, 4, c); R(1, 9, 3, 1, c); R(9, 4, 2, 2, l); return; } R(3, 3, 9, 4, c); R(3, 6, 9, 1, d); R(11, 1, 4, 4, c); R(15, 3, 2, 2, c); R(16, 3, 1, 1, C.ink); R(13, 2, 1, 1, C.ink); R(11, 0, 2, 3, d); R(10, 4, 2, 2, l); R(1, f ? 1 : 2, 1, 1, c); R(2, 2, 1, 2, c); const a = pose === 'stand' ? 0 : f ? 1 : -1; R(4 + a, 7, 1, 3, c); R(6 - a, 7, 1, 3, d); R(9 + a, 7, 1, 3, c); R(11 - a, 7, 1, 3, d); }); put(g, sp, x, y, s, 0.5, 1, o.dir || 1); if (o.zzz) { g.save(); g.fillStyle = C.ink; g.font = font(3 * s, 900); g.textAlign = 'center'; for (let k = 0; k < 3; k++) { const p = (t * 0.6 + k / 3) % 1; g.globalAlpha *= 1 - p * 0.7; g.fillText('z', x + (o.dir || 1) * (5 + p * 4) * s, y - (10 + p * 8) * s); g.globalAlpha = 1; } g.restore(); } }
  function cat(g, x, y, o = {}) { const s = o.s || 8, c = col(o.col, '#9AA0A6'), pose = o.pose || 'sit', f = Math.floor((o.t || 0) * 5) % 2, d = shade(c, -0.3); const sp = sprite(['ct', c, pose, f].join('|'), 13, 10, (R) => { if (pose === 'walk') { R(2, 4, 7, 3, c); R(9, 2, 3, 3, c); R(9, 1, 1, 1, c); R(11, 1, 1, 1, c); R(11, 3, 1, 1, C.ink); R(0, f ? 1 : 2, 1, 3, c); R(1, 3, 1, 1, c); R(3 + f, 7, 1, 3, d); R(7 - f, 7, 1, 3, d); return; } R(3, 5, 6, 5, c); R(6, 1, 4, 4, c); R(6, 0, 1, 1, c); R(9, 0, 1, 1, c); R(8, 2, 1, 1, C.ink); R(7, 3, 1, 1, C.ink); R(7, 6, 1, 4, d); R(0, 9, 3, 1, c); R(0, 7 + f, 1, 2, c); }); put(g, sp, x, y, s, 0.5, 1, o.dir || 1); }
  // птица/чайка в полёте: x,y — центр
  function bird(g, x, y, t, o = {}) { const s = o.s || 6, c = col(o.col, '#FFFFFF'), f = Math.floor((t + (o.ph || 0)) * 5) % 2, sp = sprite('bd' + c + f, 11, 4, (R) => { if (f) { R(0, 0, 1, 1, C.ink); R(1, 1, 3, 1, c); R(4, 2, 3, 1, c); R(7, 1, 3, 1, c); R(10, 0, 1, 1, C.ink); R(5, 1, 1, 1, c); } else { R(1, 2, 3, 1, c); R(0, 3, 1, 1, C.ink); R(4, 1, 3, 2, c); R(7, 2, 3, 1, c); R(10, 3, 1, 1, C.ink); } R(7, 1, 1, 1, '#F2A93B'); }); put(g, sp, x, y, s, 0.5, 0.5, o.dir || 1); }

  // НЕБО И ПРИРОДА
  function sun(g, x, y, o = {}) { const s = o.s || 10, c = col(o.col, C.yellow), r = o.r || 6, t = o.t || 0; if (o.glow !== false) { g.save(); g.globalAlpha *= 0.25; put(g, sprite('dc' + shade(c, 0.4) + (r + 3), 2 * r + 6, 2 * r + 6, (R) => discR(R, r + 3, r + 3, r + 3, shade(c, 0.4))), x, y, s, 0.5, 0.5); g.restore(); } if (o.rays) { g.save(); g.fillStyle = c; const ph = Math.floor(t * 2) % 2; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, d = (r + 2 + ((k + ph) % 2)) * s; g.fillRect(Math.round(x + Math.cos(a) * d - s), Math.round(y + Math.sin(a) * d - s), 2 * s, 2 * s); } g.restore(); } put(g, sprite('dc' + c + r, 2 * r, 2 * r, (R) => { discR(R, r, r, r, c); R(r - 2, 2, 2, 1, shade(c, 0.5)); }), x, y, s, 0.5, 0.5); }
  function moon(g, x, y, o = {}) { const s = o.s || 10, r = o.r || 5, c = col(o.col, '#F6EFC9'), full = o.full; put(g, sprite('mn' + c + r + (full ? 1 : 0), 2 * r, 2 * r, (R, cx) => { discR(R, r, r, r, c); if (full) { R(r - 2, r - 1, 2, 2, shade(c, -0.15)); R(r + 1, r + 1, 1, 1, shade(c, -0.15)); } else { cx.globalCompositeOperation = 'destination-out'; discR(R, r + Math.round(r * 0.6), r - 1, r, '#000'); } }), x, y, s, 0.5, 0.5); }
  // звёзды в прямоугольнике, мерцают; o {n, seed, col, s}
  function stars(g, t, x, y, w, h, o = {}) { const n = o.n || 40, s = o.s || 5, seed = o.seed || 3; g.save(); g.fillStyle = col(o.col, '#FFF4C2'); for (let i = 0; i < n; i++) { const sx = Math.round(x + hash(i + seed) * w), sy = Math.round(y + hash(i * 3.1 + seed) * h), tw = Math.sin(t * 3 + i * 1.7) > 0.6, big = hash(i * 5.7 + seed) > 0.8; g.fillRect(sx, sy, s, s); if (big || tw) { g.fillRect(sx - s, sy, 3 * s, s); g.fillRect(sx, sy - s, s, 3 * s); } } g.restore(); }
  function cloud(g, x, y, o = {}) { const s = o.s || 8, c = col(o.col, '#FFFFFF'); put(g, sprite('cl' + c, 18, 8, (R) => { discR(R, 5, 5, 3, c); discR(R, 9, 4, 4, c); discR(R, 13, 5, 3, c); R(2, 5, 14, 3, c); R(2, 7, 14, 1, shade(c, -0.08)); }), x, y, s, 0.5, 0.5); }
  // море/вода от y вниз: o {x, w, h, col, s, glint:[x, col]} (дорожка от солнца/луны)
  function sea(g, y, t, o = {}) { const s = o.s || 8, x0 = o.x || 0, w = o.w || 1080, h = o.h || 1920 - y, c = col(o.col, '#2AA6C9'), l = shade(c, 0.35), d = shade(c, -0.15); g.save(); g.fillStyle = c; g.fillRect(x0, y, w, h); g.fillStyle = d; g.fillRect(x0, y + Math.round(h * 0.55), w, h - Math.round(h * 0.55)); const sh = Math.floor(t * 4) % 4; g.fillStyle = c; for (let xx = 0; xx < w; xx += 4 * s) { if (((xx / s / 4) + sh) % 2 < 1) g.fillRect(x0 + xx, y - s, 2 * s, s); } g.fillStyle = l; for (let r = 0; r < 6; r++) { const yy = y + s * 2 + r * Math.max(2 * s, Math.round(h / 7)); if (yy > y + h - s) break; const off = ((t * (20 + r * 6) + r * 37) % (12 * s)); for (let xx = -12 * s + off; xx < w; xx += 12 * s) g.fillRect(Math.round(x0 + xx + (r % 2) * 5 * s), Math.round(yy), 3 * s, s); } if (o.glint) { const gc = col(o.glint[1], '#FFF4C2'); g.fillStyle = gc; for (let r = 0; r < 9; r++) { const yy = y + s + r * 2 * s; if (yy > y + h) break; const ww = (2 + (r % 3)) * s * (1 + r * 0.25); g.fillRect(Math.round(o.glint[0] - ww / 2 + Math.sin(t * 3 + r) * s), yy, Math.round(ww), s); } } g.restore(); }
  // холм-ступеньками: x — центр, y — основание
  function hill(g, x, y, w, h, o = {}) { const s = o.s || 8, c = col(o.col, '#7CC48A'); g.save(); g.fillStyle = c; for (let yy = 0; yy < h; yy += s) { const hw = Math.round((w / 2) * Math.sqrt(1 - Math.pow((h - yy) / h, 2)) / s) * s; g.fillRect(Math.round(x - hw), Math.round(y - h + yy), 2 * hw, s + 1); } g.restore(); }
  function grass(g, x0, x1, y, o = {}) { const s = o.s || 8, c = col(o.col, '#5DBB63'), d = shade(c, -0.2), t = o.t || 0; g.save(); g.fillStyle = c; g.fillRect(x0, y, x1 - x0, 2 * s); g.fillStyle = d; for (let xx = x0, i = 0; xx < x1; xx += 3 * s, i++) { const hh = (1 + (i % 3 === 0 ? 1 : 0)) * s, sw = Math.sin(t * 2 + i) > 0.7 ? s : 0; g.fillRect(xx + sw, y - hh, s, hh); } g.restore(); }
  // ДЕРЕВЬЯ: kind 'leaf'|'oak'|'pine'|'bush'; col — крона, col2 — тень кроны, trunk
  function tree(g, x, y, o = {}) { const s = o.s || 8, k = o.kind || 'leaf', c = col(o.col, k === 'pine' ? '#2E7D4F' : k === 'oak' ? '#3E9A54' : '#5DBB63'), c2 = col(o.col2, shade(c, -0.25)), tr = col(o.trunk, k === 'oak' ? '#6B4A2E' : '#8B5A2B'); const sp = sprite(['tr', k, c, c2, tr].join('|'), 22, 26, (R) => { if (k === 'pine') { R(10, 21, 2, 5, tr); for (let r = 0; r < 4; r++) { const w = 4 + r * 4; R(11 - w / 2, 3 + r * 5, w, 5, c); R(11 - w / 2, 7 + r * 5, w, 1, c2); } R(10, 0, 2, 3, c); return; } if (k === 'bush') { discR(R, 7, 20, 5, c); discR(R, 14, 21, 4, c); R(3, 23, 16, 3, c2); return; } if (k === 'oak') { R(8, 15, 5, 11, tr); R(6, 24, 9, 2, tr); R(5, 16, 3, 1, tr); R(13, 15, 3, 1, tr); discR(R, 6, 9, 6, c); discR(R, 15, 9, 6, c); discR(R, 11, 6, 6, c); R(1, 11, 20, 4, c); R(2, 14, 18, 2, c2); R(9, 3, 3, 2, shade(c, 0.2)); return; } R(9, 14, 3, 12, tr); discR(R, 11, 8, 7, c); R(5, 13, 12, 2, c2); R(8, 3, 3, 2, shade(c, 0.25)); }); put(g, sp, x, y, s, 0.5, 1); }
  // падающие листья в прямоугольнике; o {n, cols, seed, s}
  function leaves(g, t, x, y, w, h, o = {}) { const n = o.n || 14, s = o.s || 6, cols = o.cols || ['#E8752A', '#D94F2B', '#F2B33D']; g.save(); for (let i = 0; i < n; i++) { const sp2 = 0.12 + hash(i + 9) * 0.1, p = (t * sp2 + hash(i)) % 1; const lx = x + hash(i * 2.3) * w + Math.sin(t * 2 + i) * 3 * s, ly = y + p * h; g.fillStyle = cols[i % cols.length]; const fl = Math.floor(t * 4 + i) % 2; g.fillRect(Math.round(lx), Math.round(ly), fl ? 2 * s : s, fl ? s : 2 * s); g.fillRect(Math.round(lx + s / 2), Math.round(ly + s / 2), s, s); } g.restore(); }

  // ЗДАНИЯ (x — центр, y — земля). lit 0..1 — доля горящих окон (гаснут/загораются по одному), без lit — дневное стекло
  const WIN = (lit, i, N, seed) => { if (lit == null) return '#CDE6F5'; let rank = 0; const hv = hash(i * 1.37 + seed); for (let k = 0; k < N; k++) if (hash(k * 1.37 + seed) < hv) rank++; return rank < Math.round(lit * N) ? '#FFD84D' : '#34405A'; };
  function house(g, x, y, o = {}) { const s = o.s || 8, w = o.w || 20, wl = col(o.wall, '#F4E3C3'), rf = col(o.roof, '#C8553D'), dr = col(o.door, '#8B5A2B'), lit = o.lit, seed = o.seed || 1, rh = Math.ceil(w / 4) + 1; const ws = [0, 1].map((i) => WIN(lit, i, 2, seed)); const sp = sprite(['hs', w, wl, rf, dr, ws].join('|'), w + 2, rh + 12, (R) => { for (let r = 0; r < rh; r++) R(1 + Math.max(0, w / 2 - 2 - 2 * r), r, Math.min(w, 4 + 4 * r), 1, rf); R(0, rh - 1, w + 2, 1, shade(rf, -0.2)); R(w - 4, 0, 2, 3, shade(wl, -0.3)); R(1, rh, w, 12, wl); R(1, rh, w, 1, shade(wl, -0.12)); R(3, rh + 3, 4, 4, ws[0]); R(w - 6, rh + 3, 4, 4, ws[1]); R(4.5, rh + 3, 1, 4, wl); R(w - 4.5, rh + 3, 1, 4, wl); R(w / 2 - 1, rh + 5, 4, 7, dr); R(w / 2 + 2, rh + 8, 1, 1, C.yellow); }); put(g, sp, x, y, s, 0.5, 1); }
  // многоэтажка: fl этажей, cols окон в ряд, build 0..1 — стройка (видно часть этажей + каркас); вернёт y верха
  function tower(g, x, y, o = {}) { const s = o.s || 8, fl = o.fl || 5, cs = o.cols || 4, wl = col(o.wall, '#E9D8BC'), lit = o.lit, seed = o.seed || 2, W = 3 + 4 * cs, b = o.build == null ? 1 : cl(o.build), nf = Math.max(0, Math.min(fl, Math.floor(fl * b + 1e-6))), N = fl * cs; const ws = []; for (let i = 0; i < nf * cs; i++) ws.push(WIN(lit, i, N, seed)); const H = fl * 5 + 3; const sp = sprite(['tw', fl, cs, wl, nf, ws.join('')].join('|'), W, H, (R) => { const base = H; for (let f2 = 0; f2 < nf; f2++) { const fy = base - (f2 + 1) * 5; R(0, fy, W, 5, wl); R(0, fy + 4, W, 1, shade(wl, -0.1)); for (let c2 = 0; c2 < cs; c2++) { R(2 + c2 * 4, fy + 1, 3, 3, ws[f2 * cs + c2]); R(3 + c2 * 4, fy + 1, 1, 3, shade(ws[f2 * cs + c2], -0.15)); } } if (nf === fl) { R(-0, 0, W, 3, shade(wl, -0.3)); R(1, 0, W - 2, 1, shade(wl, -0.15)); } else if (nf < fl) { const fy = base - (nf + 1) * 5; for (let c2 = 0; c2 <= cs; c2++) R(c2 * 4 + (c2 === cs ? 2 : 0), fy, 1, 5, '#7A7A7A'); R(0, fy, W, 1, '#7A7A7A'); } if (nf) R(W / 2 - 1.5, base - 4, 3, 4, '#8B5A2B'); }); put(g, sp, x, y, s, 0.5, 1); return y - (nf === fl ? H : nf * 5 + 5) * s; }
  // магазин/кафе: sign — текст вывески (только из темы), aw/aw2 — полоски навеса
  function shop(g, x, y, o = {}) { const s = o.s || 8, w = o.w || 28, wl = col(o.wall, '#FFFFFF'), aw = col(o.aw, '#E5484D'), aw2 = col(o.aw2, '#FFFFFF'), lit = o.lit, gl = lit == null ? '#CDE6F5' : lit > 0.5 ? '#FFD84D' : '#34405A'; const sp = sprite(['sh', w, wl, aw, aw2, gl].join('|'), w, 24, (R) => { R(0, 9, w, 15, wl); R(0, 9, w, 1, shade(wl, -0.1)); for (let k = 0; k < w; k += 2) { R(k, 5, 2, 4, (k / 2) % 2 ? aw2 : aw); if ((k / 2) % 2 === 0) R(k, 9, 2, 1, aw); } R(0, 5, w, 1, shade(aw, -0.2)); R(2, 12, w - 12, 8, gl); R(2, 12, w - 12, 1, shade(gl, -0.2)); R(w - 8, 12, 6, 12, '#8B5A2B'); R(w - 7, 13, 4, 5, gl); R(0, 0, w, 5, shade(wl, -0.05)); R(0, 23, w, 1, shade(wl, -0.25)); }); put(g, sp, x, y, s, 0.5, 1); if (o.sign) { g.save(); g.fillStyle = col(o.signCol, C.ink); g.textAlign = 'center'; g.textBaseline = 'middle'; let fs = 3.6 * s; g.font = font(fs, 900); const mw = (w - 2) * s; const tw = g.measureText(o.sign).width; if (tw > mw) { fs *= mw / tw; g.font = font(fs, 900); } g.fillText(o.sign, x, y - 21.5 * s); g.restore(); } }
  function cafe(g, x, y, o = {}) { shop(g, x, y, Object.assign({ aw: C.teal, aw2: '#FFFFFF' }, o)); const s = o.s || 8, tx = x + ((o.w || 28) / 2 + 6) * s * (o.side || 1); pix(g, tx, y, s, ['  ffffff  ', '  ffffff  ', '    l     ', 'c   l    c', 'cc  l   cc', 'cc  l   cc', 'c c l  c c'], { f: col(o.table, '#FFFFFF'), l: '#5B3A29', c: '#8B5A2B' }); }
  function school(g, x, y, o = {}) { const s = o.s || 8, w = o.w || 44, fl = o.fl || 2, wl = col(o.wall, '#F2C9A0'), rf = col(o.roof, '#8B3A1E'), lit = o.lit, H = fl * 8 + 6, cs = Math.floor((w - 10) / 6); const ws = []; for (let i = 0; i < fl * cs; i++) ws.push(WIN(lit, i, fl * cs, 5)); const sp = sprite(['sc', w, fl, wl, rf, ws.join('')].join('|'), w, H + 7, (R) => { R(w / 2, 0, 1, 7, C.ink); R(w / 2 + 1, 0, 5, 3, col(o.flag, '#E5484D')); R(0, 7, w, 3, rf); R(1, 10, w - 2, H - 3, wl); R(1, 10, w - 2, 1, shade(wl, -0.15)); for (let f2 = 0; f2 < fl; f2++) for (let c2 = 0; c2 < cs; c2++) { let wx = 3 + c2 * 6 + (c2 >= cs / 2 ? 4 : 0); R(wx, 14 + f2 * 8, 4, 4, ws[f2 * cs + c2]); } R(w / 2 - 3, H - 2, 7, 9, '#8B5A2B'); R(w / 2, H - 2, 1, 9, shade('#8B5A2B', -0.3)); R(w / 2 - 5, H + 6, 11, 1, '#B5AFA3'); }); put(g, sp, x, y, s, 0.5, 1); if (o.sign) { const sy = y - (H + 7 - 12) * s; g.save(); g.fillStyle = '#FFFFFF'; const sw = Math.min((w - 6) * s, 16 * s + o.sign.length * 2.2 * s); rr(g, x - sw / 2, sy - 2.2 * s, sw, 4.4 * s, s); g.fill(); g.fillStyle = C.ink; g.font = font(3 * s, 900); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.sign, x, sy + 0.2 * s, sw - 2 * s); g.restore(); } }

  // УЛИЦА
  function lamp(g, x, y, o = {}) { const s = o.s || 8, h = o.h || 18, on = o.on == null ? 1 : o.on; if (on > 0) { g.save(); g.globalAlpha *= 0.28 * on; put(g, sprite('dcFFE58A8', 16, 16, (R) => discR(R, 8, 8, 8, '#FFE58A')), x, y - (h + 1) * s, s, 0.5, 0.5); g.restore(); } put(g, sprite('lp' + h + (on > 0.5 ? 1 : 0), 5, h + 3, (R) => { R(2, 3, 1, h, '#2F3A45'); R(1, h + 1, 3, 2, '#2F3A45'); R(0, 0, 5, 1, '#2F3A45'); R(1, 1, 3, 2, on > 0.5 ? '#FFE58A' : '#9AA0A6'); }), x, y, s, 0.5, 1); }
  // гирлянда между двумя точками: on 0..1 загорается слева направо
  function garland(g, x0, y0, x1, y1, t, o = {}) { const s = o.s || 8, n = o.n || 12, on = o.on == null ? 1 : o.on, sag = o.sag == null ? 80 : o.sag, cols = o.cols || [C.yellow, '#E5484D', C.green, C.blue, C.orange]; const P = (u) => [mix(x0, x1, u), mix(y0, y1, u) + sag * 4 * u * (1 - u)]; g.save(); g.fillStyle = '#2F3A45'; for (let k = 0; k <= 40; k++) { const [px2, py] = P(k / 40); g.fillRect(Math.round(px2), Math.round(py), Math.max(2, s / 3), Math.max(2, s / 3)); } for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, [bx, by] = P(u), lit = u <= on, c = cols[i % cols.length]; if (lit) { g.globalAlpha = 0.3 + 0.1 * Math.sin(t * 4 + i); g.fillStyle = c; g.fillRect(Math.round(bx - 1.5 * s), Math.round(by), 3 * s, 3 * s); g.globalAlpha = 1; } g.fillStyle = lit ? c : '#B5AFA3'; g.fillRect(Math.round(bx - s / 2), Math.round(by + s / 2), s, 1.5 * s); } g.restore(); }
  // доска с текстом: kind 'chalk' (мел) | 'white' | 'wood'; lines — строки темы; n — сколько букв написано; stand — ножки-«домик»
  function board(g, x, y, w, h, lines, o = {}) { const k = o.kind || 'chalk', s = o.s || 8; if (o.stand) { g.fillStyle = '#8B5A2B'; g.fillRect(x + w * 0.15, y + h - s, s * 1.5, h * 0.45 + s); g.fillRect(x + w * 0.85 - s * 1.5, y + h - s, s * 1.5, h * 0.45 + s); } g.fillStyle = k === 'white' ? C.line : '#B98F5E'; g.fillRect(x, y, w, h); g.fillStyle = k === 'chalk' ? '#2E3B33' : k === 'white' ? '#FFFFFF' : '#D8B587'; g.fillRect(x + s, y + s, w - 2 * s, h - 2 * s); const fs = o.size || Math.min(64, (h - 4 * s) / Math.max(1, lines.length) / 1.3); let left = o.n == null ? 1e9 : Math.floor(o.n); g.save(); g.fillStyle = col(o.col, k === 'chalk' ? '#F4F1E6' : C.ink); g.font = font(fs, 800); g.textAlign = o.align || 'center'; g.textBaseline = 'middle'; lines.forEach((ln, i) => { const show = ln.slice(0, Math.max(0, left)); left -= ln.length; const ly = y + h / 2 + (i - (lines.length - 1) / 2) * fs * 1.3; g.fillText(show, o.align === 'left' ? x + 3 * s : x + w / 2, ly, w - 4 * s); }); g.restore(); }
  // ценник/табличка по центру x,y: белая плашка с текстом
  function tag(g, s2, x, y, o = {}) { const fs = o.size || 40; g.save(); g.font = font(fs, 900); const w = g.measureText(s2).width + fs * 0.9; g.fillStyle = col(o.bg, '#FFFFFF'); rr(g, x - w / 2, y - fs * 0.75, w, fs * 1.5, fs * 0.3); g.fill(); g.strokeStyle = C.ink; g.lineWidth = 3; g.stroke(); g.fillStyle = col(o.col, C.ink); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s2, x, y + fs * 0.05); g.restore(); }
  return Object.assign({}, M, { C, NC, col, shade, hash, out, ava, head, card, skill, bars, terminal, type, office, orbit, cta, sprite, put, pix, person, crowd, car, bus, bike, boat, dog, cat, bird, sun, moon, stars, cloud, sea, hill, grass, tree, leaves, house, tower, shop, cafe, school, lamp, garland, board, tag });
})();
