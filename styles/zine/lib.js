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
  const C = { pink: '#FF3E8A', pinkDot: '#C21E8A', yellow: '#FFD31A', yellowDot: '#F2B400', blue: '#3E6BFF', blue2: '#5A84FF', orange: '#FF6A1A', orange2: '#FF8A3D', lime: '#C8F21E', limeDot: '#A6D10E', violet: '#9B4DFF', violetDot: '#7A2BE0', ink: '#111111', white: '#FFFFFF', term: '#1C1C24', night: '#16121F',
    // для предметов (цвета, названные в тексте): кожа, волосы, природа
    red: '#FF2E3E', green: '#22C25A', green2: '#14964A', brown: '#9A5530', grey: '#B9B4C7', grey2: '#6E6A7C', sky: '#7FD4FF', sand: '#FFE3A3', skin: '#F7C6A0', skin2: '#D9925F', skin3: '#8C5A3A', hair: '#2A1E1A', blond: '#FFD86B', ginger: '#E8611A', silver: '#E4E1EA', chalk: '#F4F1E8', board: '#1F3A30', wood: '#A8642E' };
  const { cl, eo, eio, sp, mix, font, rr } = M;
  // фон с растром точек: half(g, C.pink, C.pinkDot)
  const BG = {};
  function cached(key, fn) { let c = BG[key]; if (!c) { c = new OffscreenCanvas(1080, 1920); fn(c.getContext('2d')); BG[key] = c; } return c; }
  function half(g, c1, c2, step = 26) { g.drawImage(cached('h' + c1 + c2 + step, (q) => { q.fillStyle = c1; q.fillRect(0, 0, 1080, 1920); q.fillStyle = c2; for (let y = 0; y < 1920; y += step) for (let x = (y / step) % 2 ? step / 2 : 0; x < 1080; x += step) { q.beginPath(); q.arc(x, y, 3 + 4 * (y / 1920), 0, 7); q.fill(); } }), 0, 0); }
  // фон в крупную клетку
  function checker(g, c1 = C.blue, c2 = C.blue2, s = 90) { g.drawImage(cached('c' + c1 + c2 + s, (q) => { q.fillStyle = c1; q.fillRect(0, 0, 1080, 1920); q.fillStyle = c2; for (let y = 0; y < 1920; y += s) for (let x = (y / s) % 2 ? s : 0; x < 1080; x += s * 2) q.fillRect(x, y, s, s); }), 0, 0); }
  // вращающиеся лучи на весь кадр
  function rays(g, t, c1 = C.orange, c2 = C.orange2, cy = 1000) { g.save(); g.translate(540, cy); g.rotate(t * 0.3); for (let j = 0; j < 24; j++) { g.rotate(Math.PI / 12); g.fillStyle = j % 2 ? c1 : c2; g.beginPath(); g.moveTo(0, 0); g.lineTo(1500, -200); g.lineTo(1500, 200); g.closePath(); g.fill(); } g.restore(); }
  // наклонная лента с бегущим текстом
  function tape(g, s, y, rot, t, bg = C.yellow, fg = C.ink, dir = 1) { g.save(); g.translate(540, y); g.rotate(rot); g.fillStyle = bg; g.fillRect(-800, -44, 1600, 88); g.fillStyle = fg; g.font = font(46, 900); g.textAlign = 'left'; let x = -1600 + ((t * 200 * dir) % 800 + 800) % 800; for (let q = 0; q < 8; q++) { g.fillText(s, x, 16); x += g.measureText(s).width + 40; } g.restore(); }
  // жирное слово с чёрной обводкой, p пружина появления; сам ужимается до 960
  function word(g, s, x, y, size, fill, o = {}) { const p = o.p == null ? 1 : o.p; if (p <= 0) return; g.save(); g.translate(x, y); g.rotate(o.rot || 0); g.scale(p, p); let sz = size; g.font = font(sz, 900); while (g.measureText(s).width > (o.max || 960) && sz > 30) { sz -= 4; g.font = font(sz, 900); } g.textAlign = o.align || 'left'; g.lineJoin = 'round'; g.strokeStyle = o.stroke || C.ink; g.lineWidth = sz * 0.16; g.strokeText(s, 0, 0); g.fillStyle = fill; g.fillText(s, 0, 0); g.restore(); }
  // белая карточка с курсивной антиквой (как «una IA»)
  function card(g, s, x, y, size, p, rot = -0.06) { if (p <= 0) return; g.save(); g.translate(x, y); g.rotate(rot); g.scale(p, p); g.font = `italic 700 ${size}px ${M.SERIF}`; const w = g.measureText(s).width + 80, h = size * 1.4; g.fillStyle = C.ink; g.fillRect(-w / 2 + 12, -h / 2 + 12, w, h); g.fillStyle = C.white; g.fillRect(-w / 2, -h / 2, w, h); g.strokeStyle = C.ink; g.lineWidth = 6; g.strokeRect(-w / 2, -h / 2, w, h); g.fillStyle = C.ink; g.textAlign = 'center'; g.fillText(s, 0, size * 0.33); g.restore(); }
  // наклейка-плашка: заголовок + подпись, тень-сдвиг, текст сам ужимается
  function sticker(g, s, sub, x, y, w, h, bg, p, o = {}) { if (p <= 0) return; const fg = o.fg || (bg === C.white || bg === C.yellow || bg === C.lime ? C.ink : C.white); g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(o.rot || 0); g.scale(p, p); g.fillStyle = C.ink; g.fillRect(-w / 2 + 10, -h / 2 + 10, w, h); g.fillStyle = bg; g.fillRect(-w / 2, -h / 2, w, h); g.strokeStyle = C.ink; g.lineWidth = 5; g.strokeRect(-w / 2, -h / 2, w, h); g.fillStyle = fg; let fs = Math.min(76, h * 0.42); g.font = font(fs, 900); while (g.measureText(s).width > w - 48 && fs > 20) { fs -= 3; g.font = font(fs, 900); } g.textAlign = 'left'; g.fillText(s, -w / 2 + 24, -h / 2 + (sub ? h * 0.48 : h * 0.62)); if (sub) { let ss = Math.max(30, Math.min(40, h * 0.15)); g.font = font(ss, 700); while (g.measureText(sub).width > w - 48 && ss > 20) { ss -= 2; g.font = font(ss, 700); } g.fillText(sub, -w / 2 + 24, -h / 2 + h * 0.8); } g.restore(); }
  // окно терминала с печатью строк: строки с «✦» оранжевые, с «+» лаймовые
  function term(g, x, y, w, h, lines, t, t0, o = {}) { g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(o.rot == null ? -0.03 : o.rot); g.fillStyle = C.ink; g.fillRect(-w / 2 + 12, -h / 2 + 12, w, h); g.fillStyle = C.term; g.fillRect(-w / 2, -h / 2, w, h); g.strokeStyle = C.lime; g.lineWidth = 6; g.strokeRect(-w / 2, -h / 2, w, h); g.fillStyle = '#2A2A36'; g.fillRect(-w / 2, -h / 2, w, 54); ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, j) => { g.fillStyle = c; g.beginPath(); g.arc(-w / 2 + 30 + j * 26, -h / 2 + 27, 9, 0, 7); g.fill(); }); g.fillStyle = '#AAA'; g.font = font(22, 600, 'mono'); g.textAlign = 'center'; g.fillText(o.title || '', 0, -h / 2 + 35);
    const tot = lines.join('').length, n = Math.floor(cl((t - t0) / (o.d || 2.2)) * tot); let c = 0; g.textAlign = 'left'; lines.forEach((s, j) => { const v = s.slice(0, Math.max(0, Math.min(s.length, n - c))); c += s.length; g.fillStyle = s.startsWith('✦') ? C.orange : s.startsWith('+') ? C.lime : '#E8E8F0'; g.font = font(28, 500, 'mono'); g.fillText(v, -w / 2 + 30, -h / 2 + 110 + j * 46); }); g.restore(); }
  // телефон с градиентным экраном и прыгающими точками
  function phone(g, x, y, s, rot, title, c1, c2, t) { if (s <= 0) return; g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); g.fillStyle = C.ink; rr(g, -150, -300, 300, 600, 40); g.fill(); const gr = g.createLinearGradient(0, -280, 0, 280); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; rr(g, -136, -286, 272, 572, 30); g.fill(); g.fillStyle = C.white; g.font = font(30, 900); g.textAlign = 'center'; g.fillText(title, 0, -150); for (let q = 0; q < 5; q++) { g.fillStyle = [C.yellow, C.lime, C.white, C.orange, C.pink][q]; g.beginPath(); g.arc(-80 + q * 40, 40 + Math.sin(t * 4 + q) * 40, 14, 0, 7); g.fill(); } g.restore(); }
  // нумерованный шаг: кружок с цифрой и белая плашка с текстом
  function step(g, n, s, x, y, col, p) { if (p <= 0) return; g.save(); g.translate(x, y); g.scale(p, p); g.fillStyle = col; g.beginPath(); g.arc(60, 60, 60, 0, 7); g.fill(); g.strokeStyle = C.ink; g.lineWidth = 5; g.stroke(); g.fillStyle = C.white; g.font = font(64, 900); g.textAlign = 'center'; g.fillText(String(n), 60, 84); g.fillStyle = C.white; g.fillRect(150, 10, 760, 100); g.strokeRect(150, 10, 760, 100); g.fillStyle = C.ink; let fs = 38; g.font = font(fs, 800); while (g.measureText(s).width > 720 && fs > 20) { fs -= 2; g.font = font(fs, 800); } g.textAlign = 'left'; g.fillText(s, 180, 75); g.restore(); }
  // ===== Типовые объекты: плоская заливка, чёрный контур 5–6 px, тень-сдвиг. x, y = низ по центру (точка на земле), s = масштаб =====
  const hsh = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  function ink(g, fill, lw = 5) { if (fill) { g.fillStyle = fill; g.fill(); } g.lineWidth = lw; g.strokeStyle = C.ink; g.stroke(); }
  function limb(g, pts, w, col) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let q = 1; q < pts.length; q++) g.lineTo(pts[q][0], pts[q][1]); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = C.ink; g.lineWidth = w + 10; g.stroke(); g.strokeStyle = col; g.lineWidth = w; g.stroke(); }
  function box(g, x, y, w, h, fill, sh = 10, lw = 5) { if (sh) { g.fillStyle = C.ink; g.fillRect(x + sh, y + sh, w, h); } g.beginPath(); g.rect(x, y, w, h); ink(g, fill, lw); }
  function circ(g, x, y, r, fill, lw = 5) { g.beginPath(); g.arc(x, y, r, 0, 7); ink(g, fill, lw); }
  function fitText(g, s, w, size, wt = 900, kind) { let fs = size; g.font = font(fs, wt, kind); while (g.measureText(s).width > w && fs > 14) { fs -= 2; g.font = font(fs, wt, kind); } return fs; }
  // земля: полоса от y до низа кадра
  function ground(g, y, c = C.lime, line = true) { g.fillStyle = c; g.fillRect(-20, y, 1120, 1960 - y); if (line) { g.fillStyle = C.ink; g.fillRect(-20, y - 3, 1120, 6); } }

  // человек: o = {age:'adult'|'kid'|'old', pose:'stand'|'walk'|'run'|'wave'|'hold'|'sit'|'dance'|'ride', t, phase, dir:1|-1,
  //   skin, shirt, pants, hair, hairStyle:'short'|'long'|'bun'|'bald', dress:bool, apron:цвет, hat:'helmet'|'cap'|'scarf', hatColor,
  //   backpack:цвет, glasses:bool, mouth:'smile'|'open'|'sleep', item:'book'|'bag'|function(g) (в руках при 'hold'), arm:'left'|'right' (машет)}
  // рост взрослого 330·s, ребёнка 220·s; люди рядом: ставь через 150·s и давай разные цвета одежды
  function person(g, x, y, s = 1, o = {}) {
    const kid = o.age === 'kid', old = o.age === 'old', k = s * (kid ? 0.68 : 1), t = o.t || 0, ph = o.phase || 0, pose = o.pose || 'stand';
    const skin = o.skin || C.skin, shirt = o.shirt || C.blue, pants = o.pants || '#2B2B3A', hair = o.hair || (old ? C.silver : C.hair);
    const hs = o.hairStyle || (old ? 'bun' : 'short'), HB = kid ? 1.3 : 1;
    g.save(); g.translate(x, y); g.scale(k * (o.dir || 1), k);
    let sw = 0, bob = 0;
    if (pose === 'walk') { sw = Math.sin(t * 8 + ph) * 0.5; bob = Math.abs(Math.cos(t * 8 + ph)) * 6; }
    if (pose === 'run') { sw = Math.sin(t * 12 + ph) * 0.8; bob = Math.abs(Math.cos(t * 12 + ph)) * 12; }
    if (pose === 'dance') { sw = Math.sin(t * 6 + ph) * 0.35; bob = Math.abs(Math.sin(t * 6 + ph)) * 14; }
    const sit = pose === 'sit', ride = pose === 'ride';
    const hipY = ride ? 0 : sit ? -100 : -125 - bob, shY = hipY - 110 + (old ? 8 : 0), lean = ride ? 26 : old ? 8 : pose === 'dance' ? Math.sin(t * 6 + ph) * 10 : 0;
    // ноги
    const legCol = o.dress ? skin : pants;
    if (ride) { const P = o.pedal || [[20, 95], [-10, 120]]; P.forEach((f) => limb(g, [[0, hipY], [(f[0] + 30) / 2 + 22, (hipY + f[1]) / 2 - 8], f], 24, legCol)); }
    else if (sit) { [-16, 16].forEach((d) => limb(g, [[d, hipY], [d + 70, hipY + 4], [d + 72, 0]], 24, legCol)); }
    else [[-17, sw], [17, -sw]].forEach(([d, a]) => { const fx = d + Math.sin(a) * 120, fy = Math.min(0, hipY + Math.cos(a) * 125); limb(g, [[d, hipY], [d + Math.sin(a) * 60 + (a > 0 ? 6 : -6) * 0, hipY + 62], [fx, fy]], 24, legCol); g.beginPath(); g.ellipse(fx + 8, fy - 2, 18, 10, 0, 0, 7); ink(g, C.ink, 3); });
    // рюкзак за спиной
    if (o.backpack) { g.beginPath(); rr(g, -54 + lean, shY + 6, 108, 104, 18); ink(g, o.backpack); }
    // руки: позиции кистей
    const shL = [-36 + lean, shY + 16], shR = [36 + lean, shY + 16];
    let hL, hR, eL, eR;
    if (pose === 'wave') { const up = [o.arm === 'left' ? -1 : 1]; const wv = Math.sin(t * 10 + ph) * 22; hR = [72 + wv, shY - 92]; eR = [70, shY - 22]; hL = [-48, hipY + 4]; eL = [-50, shY + 62]; if (up[0] < 0) { hL = [-72 - wv, shY - 92]; eL = [-70, shY - 22]; hR = [48, hipY + 4]; eR = [50, shY + 62]; } }
    else if (pose === 'hold' || ride || (sit && o.item)) { hL = ride ? [86, shY + 70] : [-20 + lean, shY + 88]; hR = ride ? [92, shY + 74] : [20 + lean, shY + 88]; eL = [-46 + lean * 0.5, shY + 70]; eR = [46 + lean * 0.5, shY + 70]; if (ride) { eL = [50, shY + 50]; eR = [56, shY + 54]; } }
    else if (pose === 'dance') { const a1 = Math.sin(t * 6 + ph) * 26; hL = [-80, shY - 70 + a1]; eL = [-74, shY - 4]; hR = [80, shY - 70 - a1]; eR = [74, shY - 4]; }
    else if (sit) { hL = [44, hipY - 6]; hR = [60, hipY - 4]; eL = [-30, shY + 70]; eR = [40, shY + 66]; }
    else { const a = (pose === 'walk' || pose === 'run') ? sw * 50 : 0; hL = [-46 + a, hipY + 6]; hR = [46 - a, hipY + 6]; eL = [-52 + a * 0.5, shY + 62]; eR = [52 - a * 0.5, shY + 62]; }
    // туловище
    g.beginPath(); rr(g, -40 + lean, shY, 80, hipY - shY + 12, 22); ink(g, shirt);
    if (o.dress) { g.beginPath(); g.moveTo(-40 + lean, hipY - 30); g.lineTo(40 + lean, hipY - 30); g.lineTo(56 + lean * 0.5, hipY + 62); g.lineTo(-56 + lean * 0.5, hipY + 62); g.closePath(); ink(g, o.dressColor || shirt); }
    if (o.apron) { g.beginPath(); rr(g, -28 + lean, shY + 40, 56, hipY - shY + (o.dress ? 40 : 0), 8); ink(g, o.apron, 4); }
    // руки поверх
    [[shL, eL, hL], [shR, eR, hR]].forEach(([a, b, c]) => { limb(g, [a, b, c], 20, shirt); circ(g, c[0], c[1], 12, skin, 4); });
    if ((pose === 'hold' || sit) && o.item) { g.save(); g.translate(lean, shY + 84); if (typeof o.item === 'function') o.item(g); else if (o.item === 'book') { g.beginPath(); g.moveTo(-50, -26); g.lineTo(0, -16); g.lineTo(50, -26); g.lineTo(50, 22); g.lineTo(0, 30); g.lineTo(-50, 22); g.closePath(); ink(g, o.itemColor || C.white, 4); g.beginPath(); g.moveTo(0, -16); g.lineTo(0, 30); g.stroke(); } else { g.beginPath(); rr(g, -30, -10, 60, 56, 8); ink(g, o.itemColor || C.orange, 4); } g.restore(); }
    // голова
    const hx = lean * 1.2, hr = 34 * HB, hy = shY - hr - 4;
    if (hs === 'long') { g.beginPath(); rr(g, hx - hr - 6, hy - hr - 4, hr * 2 + 12, hr * 2.3, hr * 0.8); ink(g, hair); }
    if (hs === 'bun' && o.hat !== 'scarf') circ(g, hx, hy - hr - 6, hr * 0.42, hair);
    circ(g, hx, hy, hr, skin);
    if (o.hat === 'scarf') { g.beginPath(); g.arc(hx, hy + 2, hr + 6, Math.PI * 1.02, Math.PI * 1.98); g.lineTo(hx + hr + 4, hy + hr * 0.4); g.lineTo(hx + hr * 0.7, hy - hr * 0.2); g.arc(hx, hy, hr * 0.8, -0.2, Math.PI + 0.2, true); g.lineTo(hx - hr - 4, hy + hr * 0.4); g.closePath(); ink(g, o.hatColor || C.red, 4); }
    else if (hs !== 'bald') { g.beginPath(); g.arc(hx, hy, hr + 1, Math.PI * 1.05, Math.PI * 1.95); g.quadraticCurveTo(hx + hr * 0.2, hy - hr * 0.35, hx - hr - 1, hy - 4); g.closePath(); ink(g, hair, 4); }
    if (o.hat === 'helmet') { g.beginPath(); g.arc(hx, hy - 6, hr + 6, Math.PI, 0); g.closePath(); ink(g, o.hatColor || C.yellow); g.beginPath(); g.rect(hx - hr - 14, hy - 10, hr * 2 + 28, 10); ink(g, o.hatColor || C.yellow, 4); }
    if (o.hat === 'cap') { g.beginPath(); g.arc(hx, hy - 4, hr + 3, Math.PI, 0); g.closePath(); ink(g, o.hatColor || C.red); g.beginPath(); g.rect(hx, hy - 10, hr + 22, 9); ink(g, o.hatColor || C.red, 4); }
    // лицо
    g.fillStyle = C.ink; const ey = hy + 2;
    if (o.mouth === 'sleep') { g.lineWidth = 4; g.strokeStyle = C.ink; g.beginPath(); g.arc(hx - 12, ey, 6, 0, Math.PI); g.stroke(); g.beginPath(); g.arc(hx + 12, ey, 6, 0, Math.PI); g.stroke(); }
    else { g.beginPath(); g.arc(hx - 12, ey, 4.5, 0, 7); g.arc(hx + 12, ey, 4.5, 0, 7); g.fill(); }
    if (o.glasses || (old && o.glasses !== false)) { g.lineWidth = 3; g.strokeStyle = C.ink; g.beginPath(); g.arc(hx - 12, ey, 10, 0, 7); g.moveTo(hx + 22, ey); g.arc(hx + 12, ey, 10, 0, 7); g.stroke(); }
    g.fillStyle = C.pink; g.globalAlpha = 0.55; g.beginPath(); g.arc(hx - 20, ey + 13, 6, 0, 7); g.arc(hx + 20, ey + 13, 6, 0, 7); g.fill(); g.globalAlpha = 1;
    if (o.mouth === 'open') { g.beginPath(); g.ellipse(hx, ey + 18, 8, 10, 0, 0, 7); ink(g, C.red, 3); }
    else { g.lineWidth = 4; g.strokeStyle = C.ink; g.beginPath(); g.arc(hx, ey + 10, 9, 0.3, Math.PI - 0.3); g.stroke(); }
    g.restore();
  }

  // окна: lit = число 0…1 (доля горящих, гаснут по одному) или функция(номер) → true/false; без lit дневные голубые
  function winCol(o, n) { if (o.lit == null) return C.sky; const on = typeof o.lit === 'function' ? o.lit(n) : hsh(n + (o.seed || 0)) < o.lit; return on ? C.yellow : '#2B2440'; }
  function windows(g, x0, y0, w, h, cols, rows, o, ww = 0.5, wh = 0.55) {
    const cw = w / cols, ch = h / rows; let n = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const W = cw * ww, H = ch * wh; const x = x0 + c * cw + (cw - W) / 2, y = y0 + r * ch + (ch - H) / 2; g.beginPath(); g.rect(x, y, W, H); ink(g, winCol(o, n++), 4); if (o.lit == null) { g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(x + 6, y + 6, W * 0.25, H * 0.4); } }
  }
  // дом с двускатной крышей: o = {wall, roof, door, lit, rows, cols, seed}
  function house(g, x, y, w = 260, h = 240, o = {}) {
    const x0 = x - w / 2; g.fillStyle = C.ink; g.fillRect(x0 + 10, y - h + 10, w, h); box(g, x0, y - h, w, h, o.wall || C.yellow, 0);
    g.beginPath(); g.moveTo(x0 - 24, y - h); g.lineTo(x, y - h - w * 0.45); g.lineTo(x0 + w + 24, y - h); g.closePath(); ink(g, o.roof || C.red);
    windows(g, x0 + 10, y - h + 14, w - 20, h * 0.55, o.cols || 2, o.rows || 1, o);
    g.beginPath(); g.rect(x - w * 0.12, y - h * 0.38, w * 0.24, h * 0.38); ink(g, o.door || C.blue);
  }
  // многоэтажка с сеткой окон: o = {wall, floors, cols, lit, built 0…1 (стройка снизу вверх), roof}
  function tower(g, x, y, w = 340, h = 620, o = {}) {
    const fl = o.floors || 5, fh = h / fl, b = o.built == null ? 1 : cl(o.built), x0 = x - w / 2;
    const vis = b * fl, full = Math.floor(vis), part = vis - full, hh = (full + part) * fh; if (hh <= 0) return;
    g.fillStyle = C.ink; g.fillRect(x0 + 12, y - hh + 12, w, hh); box(g, x0, y - hh, w, hh, o.wall || C.white, 0);
    const cols = o.cols || 4; let n = 0;
    for (let f = 0; f < Math.ceil(vis); f++) { const fy = y - (f + 1) * fh; for (let c = 0; c < cols; c++) { const W = w / cols * 0.55, H = fh * 0.5, wx = x0 + c * w / cols + (w / cols - W) / 2, wy = fy + fh * 0.25; if (wy < y - hh) { n++; continue; } g.beginPath(); g.rect(wx, wy, W, H); ink(g, winCol(o, n++), 4); } g.fillStyle = C.ink; g.fillRect(x0, fy + fh - 2, w, 4); }
    if (b >= 1) { g.beginPath(); g.rect(x0 - 12, y - h - 18, w + 24, 22); ink(g, o.roof || C.ink, 4); }
  }
  // магазин или кафе: навес в полоску и вывеска с текстом из параметра. o = {wall, awning, sign, signBg, signFg, door}
  function shop(g, x, y, w = 420, h = 320, o = {}) {
    const x0 = x - w / 2; box(g, x0, y - h, w, h, o.wall || C.white);
    if (o.sign) sign(g, x, y - h - 40, w * 0.9, 90, o.sign, { bg: o.signBg || C.yellow, fg: o.signFg });
    const ay = y - h + 30, aw = w + 30, n = 7; for (let q = 0; q < n; q++) { g.beginPath(); g.moveTo(x0 - 15 + q * aw / n, ay); g.lineTo(x0 - 15 + (q + 1) * aw / n, ay); g.lineTo(x0 - 15 + (q + 1) * aw / n, ay + 60); g.arc(x0 - 15 + (q + 0.5) * aw / n, ay + 60, aw / n / 2, 0, Math.PI); g.closePath(); ink(g, q % 2 ? C.white : (o.awning || C.red), 4); }
    g.beginPath(); g.rect(x0 + 24, ay + 110, w * 0.5, h - 150); ink(g, o.lit ? C.yellow : C.sky, 4);
    g.beginPath(); g.rect(x0 + w * 0.66, ay + 110, w * 0.22, h - 140); ink(g, o.door || C.blue, 4);
  }
  // школа или библиотека: колонны, фронтон, вывеска из параметра, флаг по желанию. o = {wall, roof, sign, flag:цвет}
  function school(g, x, y, w = 600, h = 380, o = {}) {
    const x0 = x - w / 2; box(g, x0, y - h, w, h, o.wall || C.orange);
    g.beginPath(); g.moveTo(x0 - 20, y - h); g.lineTo(x, y - h - 120); g.lineTo(x0 + w + 20, y - h); g.closePath(); ink(g, o.roof || C.white);
    if (o.flag) { g.fillStyle = C.ink; g.fillRect(x - 3, y - h - 230, 6, 120); g.beginPath(); g.rect(x + 3, y - h - 230, 70, 44); ink(g, o.flag, 4); }
    windows(g, x0 + 20, y - h + 90, w - 40, h - 200, 4, 2, o);
    for (let q = 0; q < 4; q++) { g.beginPath(); g.rect(x - 90 + q * 52, y - 110, 24, 110); ink(g, C.white, 4); }
    if (o.sign) sign(g, x, y - h + 46, w * 0.7, 66, o.sign, { bg: C.white });
  }
  // дерево: o = {kind:'leaf'|'pine'|'oak', c (крона), c2 (тень кроны), trunk, t (качание), fall: число листьев, leaf: цвет листьев}
  function tree(g, x, y, s = 1, o = {}) {
    const t = o.t || 0, kind = o.kind || 'leaf', c = o.c || (kind === 'pine' ? C.green2 : C.green), sway = Math.sin(t * 1.5 + x) * 0.03;
    g.save(); g.translate(x, y); g.scale(s, s);
    const tw = kind === 'oak' ? 56 : 34; g.beginPath(); g.moveTo(-tw / 2, 0); g.lineTo(-tw / 2 + 6, -200); g.lineTo(tw / 2 - 6, -200); g.lineTo(tw / 2, 0); g.closePath(); ink(g, o.trunk || C.brown);
    g.rotate(sway);
    if (kind === 'pine') { for (let q = 0; q < 3; q++) { const yy = -150 - q * 90, ww = 150 - q * 32; g.beginPath(); g.moveTo(-ww, yy); g.lineTo(0, yy - 150); g.lineTo(ww, yy); g.closePath(); ink(g, c); } }
    else { const B = kind === 'oak' ? [[-110, -250, 90], [110, -250, 90], [0, -320, 110], [-60, -200, 80], [60, -200, 80]] : [[-60, -260, 70], [60, -260, 70], [0, -330, 85]];
      g.lineWidth = 12; g.strokeStyle = C.ink; B.forEach(([a, b, r]) => { g.beginPath(); g.arc(a, b, r, 0, 7); g.stroke(); }); g.fillStyle = c; B.forEach(([a, b, r]) => { g.beginPath(); g.arc(a, b, r, 0, 7); g.fill(); });
      g.fillStyle = o.c2 || 'rgba(0,0,0,.12)'; B.forEach(([a, b, r]) => { g.beginPath(); g.arc(a + r * 0.25, b + r * 0.3, r * 0.45, 0, 7); g.fill(); }); }
    g.restore();
    if (o.fall) for (let q = 0; q < o.fall; q++) { const ph = (t * 0.35 + hsh(q + x)) % 1, lx = x + (hsh(q * 3 + 1) - 0.5) * 360 * s + Math.sin(t * 2 + q) * 30, ly = y - 380 * s + ph * 420 * s; leaf(g, lx, ly, s, o.leaf || C.orange, t * 2 + q); }
  }
  // кленовый лист
  function leaf(g, x, y, s, c, rot) { g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); g.beginPath(); for (let q = 0; q < 10; q++) { const a = q / 10 * Math.PI * 2 - Math.PI / 2, r = q % 2 ? 9 : 22; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); ink(g, c, 3); g.restore(); }
  // трава пучками вдоль линии
  function grass(g, x, y, w, o = {}) { const c = o.c || C.green, t = o.t || 0; g.lineWidth = 4; g.strokeStyle = C.ink; g.fillStyle = c; for (let q = 0; q < w / 46; q++) { const bx = x + q * 46 + hsh(q) * 10, h = 30 + hsh(q + 9) * 26, sw = Math.sin(t * 2 + q) * 5; g.beginPath(); g.moveTo(bx - 14, y); g.lineTo(bx - 8 + sw, y - h * 0.7); g.lineTo(bx - 2, y - 8); g.lineTo(bx + 4 + sw, y - h); g.lineTo(bx + 8, y - 8); g.lineTo(bx + 16 + sw, y - h * 0.6); g.lineTo(bx + 18, y); g.closePath(); g.fill(); g.stroke(); } }
  function wheel(g, x, y, r, t) { circ(g, x, y, r, C.ink, 4); circ(g, x, y, r * 0.45, C.grey, 4); g.save(); g.translate(x, y); g.rotate(t * 8); g.fillStyle = C.ink; g.fillRect(-2, -r * 0.45, 4, r * 0.9); g.restore(); }
  // легковая машина: o = {c, dir, t (крутит колёса)}; длина 300·s
  function car(g, x, y, s = 1, o = {}) { g.save(); g.translate(x, y); g.scale(s * (o.dir || 1), s); const t = o.t || 0;
    g.beginPath(); g.moveTo(-90, -100); g.lineTo(-60, -150); g.lineTo(50, -150); g.lineTo(90, -100); g.closePath(); ink(g, o.c || C.red);
    g.beginPath(); g.moveTo(-70, -104); g.lineTo(-52, -136); g.lineTo(-6, -136); g.lineTo(-6, -104); g.closePath(); g.moveTo(6, -104); g.lineTo(6, -136); g.lineTo(44, -136); g.lineTo(70, -104); g.closePath(); ink(g, C.sky, 4);
    g.beginPath(); rr(g, -150, -104, 300, 74, 22); ink(g, o.c || C.red); circ(g, 140, -84, 9, C.yellow, 3); wheel(g, -88, -30, 30, t); wheel(g, 88, -30, 30, t); g.restore(); }
  // автобус: o = {c, num (номер маршрута, текст), dir, t, people:true (головы в окнах)}; длина 560·s
  function bus(g, x, y, s = 1, o = {}) { g.save(); g.translate(x, y); g.scale(s * (o.dir || 1), s); const t = o.t || 0;
    g.fillStyle = C.ink; rr(g, -270, -262, 560, 222, 30); g.fill(); g.beginPath(); rr(g, -280, -272, 560, 222, 30); ink(g, o.c || C.blue);
    for (let q = 0; q < 4; q++) { g.beginPath(); g.rect(-250 + q * 100, -246, 84, 80); ink(g, C.sky, 4); if (o.people) { const sk = [C.skin, C.skin2, C.skin, C.skin3][q]; g.save(); g.beginPath(); g.rect(-250 + q * 100, -246, 84, 80); g.clip(); circ(g, -208 + q * 100, -170, 22, sk, 4); g.restore(); } }
    g.beginPath(); g.rect(160, -246, 100, 80); ink(g, C.sky, 4); g.beginPath(); g.rect(170, -150, 44, 96); ink(g, C.sky, 4);
    g.fillStyle = C.white; g.fillRect(-280, -140, 560, 16); g.strokeStyle = C.ink; g.lineWidth = 4; g.strokeRect(-280, -140, 560, 16);
    if (o.num != null) { g.beginPath(); g.rect(170, -300, 96, 56); ink(g, C.white, 4); g.save(); g.scale(o.dir || 1, 1); g.fillStyle = C.ink; const fs = fitText(g, String(o.num), 84, 44); g.textAlign = 'center'; g.fillText(String(o.num), 218 * (o.dir || 1), -256); g.restore(); }
    circ(g, 270, -80, 11, C.yellow, 3); wheel(g, -170, -50, 40, t); wheel(g, 170, -50, 40, t); g.restore(); }
  // велосипед с седоком: o = {c (рама), t, dir, rider: опции person или false}; длина 280·s
  function bike(g, x, y, s = 1, o = {}) { g.save(); g.translate(x, y); g.scale(s * (o.dir || 1), s); const t = o.t || 0, a = t * 7;
    const W1 = [-90, -55], W2 = [90, -55], P = [0, -55], S = [-30, -160], H = [70, -180];
    [W1, W2].forEach((w) => { g.lineWidth = 10; g.strokeStyle = C.ink; g.beginPath(); g.arc(w[0], w[1], 52, 0, 7); g.stroke(); g.lineWidth = 3; g.beginPath(); g.moveTo(w[0] + Math.cos(a) * 50, w[1] + Math.sin(a) * 50); g.lineTo(w[0] - Math.cos(a) * 50, w[1] - Math.sin(a) * 50); g.moveTo(w[0] + Math.cos(a + 1.6) * 50, w[1] + Math.sin(a + 1.6) * 50); g.lineTo(w[0] - Math.cos(a + 1.6) * 50, w[1] - Math.sin(a + 1.6) * 50); g.stroke(); });
    limb(g, [W1, P, S, W1], 8, o.c || C.orange); limb(g, [S, [55, -150], P], 8, o.c || C.orange); limb(g, [W2, H], 8, o.c || C.orange); g.fillStyle = C.ink; g.fillRect(S[0] - 26, S[1] - 12, 50, 12); g.fillRect(H[0] - 6, H[1] - 6, 30, 10);
    if (o.rider !== false) { const r = Object.assign({ shirt: C.yellow }, o.rider || {}); const p1 = [P[0] + Math.cos(a) * 30, P[1] + Math.sin(a) * 30], p2 = [P[0] - Math.cos(a) * 30, P[1] - Math.sin(a) * 30];
      g.save(); g.translate(S[0], S[1] - 8); person(g, 0, 0, 0.8, Object.assign({}, r, { pose: 'ride', dir: 1, pedal: [[(p1[0] - S[0]) / 0.8, (p1[1] - S[1] + 8) / 0.8], [(p2[0] - S[0]) / 0.8, (p2[1] - S[1] + 8) / 0.8]] })); g.restore(); }
    g.restore(); }
  // лодка, катер: y = линия воды. o = {c (корпус), cabin, t (качка, бурун), motor:bool, people:[опции person,…], dir}; длина 360·s
  function boat(g, x, y, s = 1, o = {}) { const t = o.t || 0; g.save(); g.translate(x, y + Math.sin(t * 2.4 + x) * 6 * s); g.scale(s * (o.dir || 1), s); g.rotate(Math.sin(t * 2 + x) * 0.03);
    if (o.cabin !== false) { g.beginPath(); g.rect(-60, -150, 120, 100); ink(g, o.cabin || C.white); g.beginPath(); g.rect(-40, -130, 80, 40); ink(g, C.sky, 4); }
    (o.people || []).forEach((p, j) => person(g, -120 + j * 70, -40, 0.42, Object.assign({ t }, p)));
    g.beginPath(); g.moveTo(-180, -60); g.lineTo(190, -60); g.lineTo(140, 20); g.lineTo(-150, 20); g.closePath(); ink(g, o.c || C.red); g.fillStyle = C.white; g.fillRect(-170, -42, 345, 12);
    if (o.motor) { g.beginPath(); g.rect(-215, -80, 40, 70); ink(g, C.ink, 4); for (let q = 0; q < 4; q++) { const ph = (t * 2 + q / 4) % 1; g.globalAlpha = 1 - ph; circ(g, -230 - ph * 150, 14 - ph * 10, 10 + ph * 18, C.white, 3); } g.globalAlpha = 1; }
    g.restore(); }
  // собака (вид сбоку): o = {c (шерсть), ear, pose:'stand'|'sit'|'sleep'|'run', t, dir, zzz:bool}; длина 220·s
  function dog(g, x, y, s = 1, o = {}) { const t = o.t || 0, c = o.c || C.ginger, pose = o.pose || 'stand'; g.save(); g.translate(x, y); g.scale(s * (o.dir || 1), s);
    if (pose === 'sleep') { g.beginPath(); g.ellipse(0, -48, 110, 50, 0, 0, 7); ink(g, c); g.beginPath(); g.ellipse(-110, -40, 50, 20, 0.2, 0, 7); ink(g, c, 4); circ(g, 70, -50, 42, c); g.beginPath(); g.ellipse(52, -66, 18, 34, 0.5, 0, 7); ink(g, o.ear || C.brown, 4);
      g.lineWidth = 4; g.beginPath(); g.arc(86, -54, 8, 0, Math.PI); g.stroke(); circ(g, 112, -40, 7, C.ink, 2);
      if (o.zzz !== false) { g.fillStyle = C.white; g.strokeStyle = C.ink; g.lineWidth = 6; g.lineJoin = 'round'; for (let q = 0; q < 3; q++) { const ph = (t * 0.6 + q / 3) % 1; g.globalAlpha = Math.sin(ph * Math.PI); g.font = font(30 + q * 6 + ph * 14, 900); g.strokeText('z', 110 + ph * 70, -100 - ph * 110); g.fillText('z', 110 + ph * 70, -100 - ph * 110); } g.globalAlpha = 1; } g.restore(); return; }
    const run = pose === 'run', sw = run ? Math.sin(t * 14) * 0.6 : 0;
    const wag = Math.sin(t * (run ? 14 : 8)) * 0.4; g.save(); g.translate(-90, -120); g.rotate(-0.8 + wag); g.beginPath(); rr(g, -8, -60, 16, 64, 8); ink(g, c, 4); g.restore();
    if (pose === 'sit') { limb(g, [[-50, -90], [-40, -10]], 22, c); limb(g, [[50, -90], [55, 0]], 18, c); g.beginPath(); g.ellipse(-20, -100, 80, 46, -0.5, 0, 7); ink(g, c); }
    else { [[-70, sw], [-50, -sw], [60, -sw], [80, sw]].forEach(([lx, a]) => limb(g, [[lx, -100], [lx + Math.sin(a) * 40, -6]], 18, c)); g.beginPath(); g.ellipse(0, -112, 110, 44, 0, 0, 7); ink(g, c); }
    const hx = pose === 'sit' ? 60 : 110, hy = pose === 'sit' ? -170 : -160; circ(g, hx, hy, 44, c); g.beginPath(); g.ellipse(hx + 40, hy + 14, 30, 20, 0, 0, 7); ink(g, c, 4); circ(g, hx + 68, hy + 8, 9, C.ink, 2);
    g.beginPath(); g.ellipse(hx - 22, hy - 4, 16, 34, 0.4, 0, 7); ink(g, o.ear || C.brown, 4); g.fillStyle = C.ink; g.beginPath(); g.arc(hx + 14, hy - 10, 5, 0, 7); g.fill(); g.restore(); }
  // кошка (вид сбоку): o = {c, pose:'sit'|'sleep', t, dir}
  function cat(g, x, y, s = 1, o = {}) { const t = o.t || 0, c = o.c || C.grey; g.save(); g.translate(x, y); g.scale(s * (o.dir || 1), s);
    if (o.pose === 'sleep') { g.beginPath(); g.ellipse(0, -36, 80, 36, 0, 0, 7); ink(g, c); circ(g, 56, -40, 30, c); g.lineWidth = 4; g.beginPath(); g.arc(66, -40, 6, 0, Math.PI); g.stroke(); g.restore(); return; }
    g.save(); g.translate(-40, -20); g.rotate(-1.2 + Math.sin(t * 3) * 0.25); g.beginPath(); rr(g, -7, -90, 14, 94, 7); ink(g, c, 4); g.restore();
    g.beginPath(); g.ellipse(0, -60, 50, 64, 0, 0, 7); ink(g, c); const hy = -140; [[-24, 1], [24, -1]].forEach(([ex, d]) => { g.beginPath(); g.moveTo(ex - 14 * d, hy - 20); g.lineTo(ex + 4 * d, hy - 66); g.lineTo(ex + 18 * d, hy - 24); g.closePath(); ink(g, c, 4); });
    circ(g, 0, hy, 40, c); g.fillStyle = C.ink; g.beginPath(); g.ellipse(-14, hy - 2, 5, 8, 0, 0, 7); g.ellipse(14, hy - 2, 5, 8, 0, 0, 7); g.fill(); g.fillStyle = C.pink; g.beginPath(); g.moveTo(-6, hy + 10); g.lineTo(6, hy + 10); g.lineTo(0, hy + 17); g.fill(); g.restore(); }
  // птица, чайка: x, y центр. o = {c, tip (концы крыльев), t, phase}; размах 140·s
  function bird(g, x, y, s = 1, o = {}) { const t = o.t || 0, f = Math.sin(t * 10 + (o.phase || 0)) * 0.6; g.save(); g.translate(x, y); g.scale(s * (o.dir || 1), s);
    [-1, 1].forEach((d) => { g.save(); g.scale(d, 1); g.rotate(-f); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(30, -30, 72, -10); g.quadraticCurveTo(40, -6, 0, 10); g.closePath(); ink(g, o.c || C.white, 4); g.fillStyle = o.tip || C.ink; g.beginPath(); g.arc(68, -11, 7, 0, 7); g.fill(); g.restore(); });
    g.beginPath(); g.ellipse(0, 4, 26, 14, 0, 0, 7); ink(g, o.c || C.white, 4); g.beginPath(); g.moveTo(24, 0); g.lineTo(40, 4); g.lineTo(24, 9); g.closePath(); ink(g, C.yellow, 3); g.restore(); }
  // солнце: o = {c, rays:bool, t, glow:bool}
  function sun(g, x, y, r = 120, o = {}) { const c = o.c || C.yellow, t = o.t || 0; if (o.glow !== false) { g.fillStyle = c; g.globalAlpha = 0.25; g.beginPath(); g.arc(x, y, r * 1.5, 0, 7); g.fill(); g.globalAlpha = 0.15; g.beginPath(); g.arc(x, y, r * 2, 0, 7); g.fill(); g.globalAlpha = 1; }
    if (o.rays) { g.save(); g.translate(x, y); g.rotate(t * 0.4); for (let q = 0; q < 12; q++) { g.rotate(Math.PI / 6); g.beginPath(); g.moveTo(r + 14, -14); g.lineTo(r + 60, 0); g.lineTo(r + 14, 14); g.closePath(); ink(g, c, 4); } g.restore(); } circ(g, x, y, r, c, 6); }
  // луна-серп: o = {c}
  function moon(g, x, y, r = 90, o = {}) { g.beginPath(); g.arc(x, y, r, -Math.PI * 0.62, Math.PI * 0.62, true); g.arc(x - r * 0.42, y, r * 0.78, Math.PI * 0.5, -Math.PI * 0.5, false); g.closePath(); ink(g, o.c || C.yellow, 5); }
  // звёзды-искры в области: o = {n, x0, y0, x1, y1, c, p (доля зажжённых 0…1), seed}
  function stars(g, t, o = {}) { const n = o.n || 40, x0 = o.x0 == null ? 40 : o.x0, x1 = o.x1 || 1040, y0 = o.y0 == null ? 120 : o.y0, y1 = o.y1 || 900, p = o.p == null ? 1 : o.p, sd = o.seed || 0;
    g.fillStyle = o.c || C.yellow; for (let q = 0; q < n; q++) { if (hsh(q * 7 + sd) > p) continue; const sx = x0 + hsh(q + sd) * (x1 - x0), sy = y0 + hsh(q * 3 + 5 + sd) * (y1 - y0), r = (6 + hsh(q * 5) * 12) * (0.7 + 0.3 * Math.sin(t * 3 + q)); g.beginPath(); g.moveTo(sx, sy - r * 2); g.quadraticCurveTo(sx, sy, sx + r * 2, sy); g.quadraticCurveTo(sx, sy, sx, sy + r * 2); g.quadraticCurveTo(sx, sy, sx - r * 2, sy); g.quadraticCurveTo(sx, sy, sx, sy - r * 2); g.fill(); } }
  // облако: x, y низ по центру
  function cloud(g, x, y, s = 1, c = C.white) { const B = [[-80, -40, 50], [-20, -70, 66], [50, -50, 54], [100, -30, 38]]; g.save(); g.translate(x, y); g.scale(s, s); g.lineWidth = 12; g.strokeStyle = C.ink; B.forEach(([a, b, r]) => { g.beginPath(); g.arc(a, b, r, 0, 7); g.stroke(); }); g.beginPath(); g.rect(-120, -40, 250, 40); g.stroke(); g.fillStyle = c; B.forEach(([a, b, r]) => { g.beginPath(); g.arc(a, b, r, 0, 7); g.fill(); }); g.fillRect(-120, -40, 250, 40); g.restore(); }
  // море от y до низа кадра, волны движутся: o = {c, c2, t}
  function sea(g, y, t = 0, o = {}) { const c = o.c || C.blue, c2 = o.c2 || C.blue2; g.beginPath(); g.moveTo(-20, 1960); for (let x = -20; x <= 1100; x += 30) g.lineTo(x, y + Math.sin(x * 0.018 + t * 2) * 12); g.lineTo(1100, 1960); g.closePath(); ink(g, c, 6);
    g.strokeStyle = c2; g.lineWidth = 8; g.lineCap = 'round'; for (let r = 0; r < 5; r++) { const yy = y + 60 + r * 90; if (yy > 1960) break; for (let q = 0; q < 4; q++) { const xx = ((q * 300 + r * 140 + t * (30 + r * 8)) % 1300) - 110; g.beginPath(); g.arc(xx, yy, 34, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); } } }
  // холм: x центр, y основание
  function hill(g, x, y, w, h, c = C.green) { g.beginPath(); g.moveTo(x - w / 2, y); g.quadraticCurveTo(x, y - h * 2, x + w / 2, y); g.closePath(); ink(g, c); }
  // фонарь: o = {on 0…1, c (свет), pole}; высота 300·s
  function lamp(g, x, y, s = 1, o = {}) { const on = o.on || 0; g.save(); g.translate(x, y); g.scale(s, s); if (on > 0) { g.fillStyle = o.c || C.yellow; g.globalAlpha = 0.35 * on; g.beginPath(); g.arc(0, -290, 90, 0, 7); g.fill(); g.globalAlpha = 1; }
    g.beginPath(); g.rect(-9, -270, 18, 270); ink(g, o.pole || C.ink, 4); g.beginPath(); g.moveTo(-34, -270); g.lineTo(34, -270); g.lineTo(22, -320); g.lineTo(-22, -320); g.closePath(); ink(g, on > 0.5 ? (o.c || C.yellow) : C.grey, 4); g.beginPath(); g.rect(-30, -334, 60, 14); ink(g, C.ink, 3); g.restore(); }
  // гирлянда между двумя точками: o = {n, on 0…1 (лампочки загораются по очереди), colors, sag, t}
  function garland(g, x1, y1, x2, y2, o = {}) { const n = o.n || 12, sag = o.sag || 80, on = o.on == null ? 1 : o.on, cols = o.colors || [C.yellow, C.pink, C.lime, C.orange, C.white], t = o.t || 0;
    const P = (u) => [mix(x1, x2, u), mix(y1, y2, u) + sag * 4 * u * (1 - u)]; g.strokeStyle = C.ink; g.lineWidth = 5; g.beginPath(); for (let q = 0; q <= 20; q++) { const p = P(q / 20); q ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.stroke();
    for (let q = 0; q < n; q++) { const p = P((q + 0.5) / n), lit = on * n > q, c = cols[q % cols.length]; if (lit) { g.fillStyle = c; g.globalAlpha = 0.3 + 0.15 * Math.sin(t * 5 + q); g.beginPath(); g.arc(p[0], p[1] + 20, 34, 0, 7); g.fill(); g.globalAlpha = 1; } g.beginPath(); g.ellipse(p[0], p[1] + 20, 13, 17, 0, 0, 7); ink(g, lit ? c : '#3A3448', 4); } }
  // доска для мела на ножках-«домике»: lines из параметра, o = {p 0…1 (сколько текста написано), title, bg, chalk}; x, y низ по центру
  function board(g, x, y, w, h, lines, o = {}) { const p = o.p == null ? 1 : o.p; g.save(); g.translate(x, y);
    limb(g, [[-w * 0.38, 0], [-w * 0.3, -h - 40]], 14, C.wood); limb(g, [[w * 0.38, 0], [w * 0.3, -h - 40]], 14, C.wood);
    g.fillStyle = C.ink; g.fillRect(-w / 2 + 10, -h - 30, w, h); g.beginPath(); g.rect(-w / 2, -h - 40, w, h); ink(g, C.wood, 5); g.beginPath(); g.rect(-w / 2 + 18, -h - 22, w - 36, h - 36); ink(g, o.bg || C.board, 4);
    const all = (o.title ? [o.title] : []).concat(lines), tot = all.join('').length; let cnt = Math.floor(p * tot); const lh = Math.min(90, (h - 70) / all.length);
    g.fillStyle = o.chalk || C.chalk; g.textAlign = 'center'; all.forEach((s, j) => { const v = s.slice(0, Math.max(0, Math.min(s.length, cnt))); cnt -= s.length; const fs = fitText(g, s, w - 80, lh * 0.72, 700); g.font = `italic 700 ${fs}px ${M.SERIF}`; g.fillText(v, 0, -h - 22 + 40 + lh * (j + 0.7)); }); g.restore(); }
  // вывеска-табличка с текстом по центру x, y: o = {bg, fg, rot, size}
  function sign(g, x, y, w, h, text, o = {}) { g.save(); g.translate(x, y); g.rotate(o.rot || 0); g.fillStyle = C.ink; g.fillRect(-w / 2 + 8, -h / 2 + 8, w, h); g.beginPath(); g.rect(-w / 2, -h / 2, w, h); ink(g, o.bg || C.white, 5);
    const bg = o.bg || C.white; g.fillStyle = o.fg || (bg === C.white || bg === C.yellow || bg === C.lime ? C.ink : C.white); fitText(g, text, w - 30, o.size || h * 0.6); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 0, 4); g.restore(); }
  // башенный кран: o = {c, h (высота мачты), jib (длина стрелы), hx (0…1 положение тележки), hook (0…1 длина троса), load: цвет плиты или null, op: опции person для крановщика или null}
  function crane(g, x, y, s = 1, o = {}) { const c = o.c || C.yellow, H = o.h || 900, J = o.jib || 600; g.save(); g.translate(x, y); g.scale(s, s);
    g.beginPath(); g.rect(-24, -H, 48, H); ink(g, c); g.strokeStyle = C.ink; g.lineWidth = 4; g.beginPath(); for (let yy = 0; yy < H; yy += 48) { g.moveTo(-24, -yy); g.lineTo(24, -yy - 48); } g.stroke();
    g.beginPath(); g.rect(-160, -H - 40, J + 160, 40); ink(g, c); g.beginPath(); g.rect(-180, -H - 20, 70, 70); ink(g, C.grey2, 4);
    g.beginPath(); g.rect(24, -H + 2, 80, 70); ink(g, c); g.beginPath(); g.rect(40, -H + 14, 50, 34); ink(g, C.sky, 4);
    if (o.op) { g.save(); g.beginPath(); g.rect(40, -H + 14, 50, 34); g.clip(); person(g, 65, -H + 120, 0.35, o.op); g.restore(); }
    const hx = 120 + (J - 160) * (o.hx == null ? 0.7 : o.hx), hl = 40 + (H - 140) * (o.hook == null ? 0.5 : o.hook); g.fillStyle = C.ink; g.fillRect(hx - 22, -H, 44, 16); g.fillRect(hx - 2, -H + 16, 4, hl);
    if (o.load) { g.lineWidth = 3; g.beginPath(); g.moveTo(hx, -H + 16 + hl); g.lineTo(hx - 80, -H + 16 + hl + 40); g.moveTo(hx, -H + 16 + hl); g.lineTo(hx + 80, -H + 16 + hl + 40); g.stroke(); box(g, hx - 110, -H + 16 + hl + 40, 220, 44, o.load, 8); }
    g.restore(); }
  return Object.assign({}, M, { C, half, checker, rays, tape, word, card, sticker, term, phone, step,
    ink, box, person, house, tower, shop, school, tree, leaf, grass, ground, car, bus, bike, boat, dog, cat, bird, sun, moon, stars, cloud, sea, hill, lamp, garland, board, sign, crane });
})();
