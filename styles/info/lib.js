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
  // тёмный фон с мягким свечением; строка подвала (left, right) по желанию
  let BG = null, WP = null;
  function bg(g, left = '', right = '') { if (!BG) { BG = new OffscreenCanvas(540, 960); const q = BG.getContext('2d'); q.fillStyle = C.bg; q.fillRect(0, 0, 540, 960); const gr = q.createRadialGradient(270, 480, 25, 270, 480, 450); gr.addColorStop(0, 'rgba(255,178,30,0.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); q.fillStyle = gr; q.fillRect(0, 0, 540, 960); } g.drawImage(BG, 0, 0, 1080, 1920); g.fillStyle = C.muted; g.font = font(18, 600, 'mono'); g.textAlign = 'left'; g.fillText(left, 60, 1690); g.textAlign = 'right'; g.fillText(right, 1020, 1690); }
  // жёлтая шторка снизу вверх с косыми полосами (p 0..1)
  function wipe(g, p) { if (p <= 0) return; if (!WP) { WP = new OffscreenCanvas(1080, 1920); const q = WP.getContext('2d'); q.fillStyle = C.yellow; q.fillRect(0, 0, 1080, 1920); q.strokeStyle = 'rgba(255,255,255,0.18)'; q.lineWidth = 30; for (let x = -1920; x < 1080; x += 120) { q.beginPath(); q.moveTo(x, 1920); q.lineTo(x + 1920, 0); q.stroke(); } } const h = Math.round(1920 * Math.min(1, p)); g.drawImage(WP, 0, 1920 - h, 1080, h, 0, 1920 - h, 1080, h); }
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
  // столбики с подписями, последний янтарный, пунктир тренда: items [[подпись, число]], o.dec знаков после запятой
  function bars(g, items, t, t0, o = {}) { const base = o.base || 1450, k = o.k || 8, gap = o.gap || 220, x0 = o.x || 130; items.forEach(([l, v], j) => { const p = eio((t - t0 - j * 0.25) / 0.6), h = v * k * p, x = x0 + j * gap, last = j === items.length - 1; const gr = g.createLinearGradient(0, base - h, 0, base); gr.addColorStop(0, last ? C.amber2 : '#B07A18'); gr.addColorStop(1, last ? C.deep : '#5A3E10'); g.fillStyle = gr; g.fillRect(x, base - h, 150, h); g.fillStyle = last ? C.amber2 : C.text; g.font = font(last ? 72 : 56, 900); g.textAlign = 'center'; if (p > 0.1) g.fillText((v * p).toFixed(o.dec || 0).replace('.', ','), x + 75, base - h - 24); g.fillStyle = C.muted; g.font = font(24, 600, 'mono'); g.fillText(String(l), x + 75, base + 50); });
    const lp = eio((t - t0 - 0.25 * items.length - 0.3) / 0.8); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3; g.setLineDash([10, 8]); g.beginPath(); items.forEach(([l, v], j) => { const x = x0 + 75 + j * gap, yy = base - v * k - 110; if (j / (items.length - 1) <= lp) j ? g.lineTo(x, yy) : g.moveTo(x, yy); }); g.stroke(); g.setLineDash([]); }
  // сетка точек-целей: n из total зажигаются по очереди
  function dots(g, total, n, o = {}) { const cols = o.cols || 10, x0 = o.x || 160, y0 = o.y || 900, dx = o.dx || 84, dy = o.dy || 72; for (let j = 0; j < total; j++) { const on = j < n; g.fillStyle = on ? C.amber : '#2A3350'; g.beginPath(); g.arc(x0 + (j % cols) * dx, y0 + Math.floor(j / cols) * dy, on ? 14 : 8, 0, 7); g.fill(); } }
  // финал: название и подпись (y o.y); шар с искрами и кольцом только если o.orb !== false
  function finale(g, name, sub, t, lt, o = {}) { if (o.orb !== false) { for (let j = 0; j < 30; j++) { const p = eio(lt / 0.8), a = j * 0.5, r = (1 - p) * (200 + (j * 37) % 400); g.fillStyle = C.amber2; g.beginPath(); g.arc(540 + Math.cos(a) * r, 800 + Math.sin(a) * r, 6, 0, 7); g.fill(); } orb(g, 540, 800, 80 * sp((lt - 0.3) / 0.5), t); g.strokeStyle = C.amber; g.lineWidth = 4; g.beginPath(); g.arc(540, 800, 130, 0, 6.28 * eo((lt - 0.4) / 0.8)); g.stroke(); } const ty = o.y || 1080; g.save(); g.globalAlpha *= eo((lt - 0.8) / 0.5); g.fillStyle = C.text; let fs = 90; g.font = font(fs, 800); while (g.measureText(name).width > 940 && fs > 40) { fs -= 4; g.font = font(fs, 800); } g.textAlign = 'center'; g.fillText(name, 540, ty); g.fillStyle = C.amber; g.font = font(36, 600); g.fillText(sub || '', 540, ty + 70); g.restore(); }
  // ---------- типовые объекты: плоские пиктограммы инфографики на тёмном фоне (заливка цветом-параметром, здания - тёмные панели с янтарной обводкой, свет - мягкое янтарное свечение).
  // x - центр, y - земля под объектом (у лодки ватерлиния). Цвет каждой части - параметр (#RRGGBB). t оживляет.
  const OFF = '#2A3555', SANS = M.SANS, clamp = cl, lerp = (a, b, u) => a + (b - a) * u;
  function rgba(hex, a) { const n = parseInt(String(hex).slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function rng(seed) { let s = Math.imul(seed | 0, -1640531535) >>> 0 || 123456789; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function cv(w, h) { const c = new OffscreenCanvas(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h))); return [c, c.getContext('2d')]; }
  const SPR = {};
  // цвет: смесь двух #RRGGBB, темнее, светлее
  function cmix(a, b, u) { const h = (s) => { s = String(s); if (s.length === 4) s = '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]; return parseInt(s.slice(1, 7), 16) || 0; }; const p = h(a), q = h(b); const ch = (k) => Math.round(lerp(p >> k & 255, q >> k & 255, clamp(u))); return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1); }
  const dark = (c, u = 0.25) => cmix(c, '#111318', u), light = (c, u = 0.3) => cmix(c, '#FFFFFF', u);
  // мягкое свечение радиуса r (спрайт кэшируется по цвету)
  const GL = {};
  function glow(g, x, y, r, col, a = 1) { if (a <= 0 || r <= 0) return; let s = GL[col]; if (!s) { const [c, q] = cv(128, 128); const gr = q.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, rgba(col, 0.6)); gr.addColorStop(0.45, rgba(col, 0.22)); gr.addColorStop(1, rgba(col, 0)); q.fillStyle = gr; q.fillRect(0, 0, 128, 128); s = GL[col] = c; } g.save(); g.globalAlpha *= Math.min(1, a); g.drawImage(s, x - r, y - r, 2 * r, 2 * r); g.restore(); }
  // текст в точке (по центру строки), ужимается до maxW
  function Tr(g, s, x, y, sz, col, w = 800, al = 'left', fam = SANS, maxW = 1e9) { s = String(s); g.font = `${w} ${Math.round(sz)}px ${fam}`; const m = g.measureText(s).width; if (m > maxW) { sz *= maxW / m; g.font = `${w} ${Math.round(sz)}px ${fam}`; } g.save(); g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); g.restore(); }
  // x - центр, y - земля под объектом (у лодки ватерлиния). Цвет каждой части - параметр (hex #RRGGBB).
  function gsh(g,x,y,w,a=0.35){g.fillStyle=rgba('#05080F',a);g.beginPath();g.ellipse(x,y,w/2,Math.max(2,w*0.08),0,0,7);g.fill();}
  function seg(g,pts,w,col){g.strokeStyle=col;g.lineWidth=w;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.stroke();}
  function disc(g,x,y,r,col){g.fillStyle=col;g.beginPath();g.arc(x,y,Math.max(0.5,r),0,7);g.fill();}
  function ell(g,x,y,rx,ry,col,rot=0){g.fillStyle=col;g.beginPath();g.ellipse(x,y,Math.max(0.5,rx),Math.max(0.5,ry),rot,0,7);g.fill();}
  function poly(g,pts,col){g.fillStyle=col;g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.closePath();g.fill();}
  function ik(ax,ay,bx,by,l1,l2,bend){let dx=bx-ax,dy=by-ay,d=Math.hypot(dx,dy)||1;const L=(l1+l2)*0.999;if(d>L){bx=ax+dx*L/d;by=ay+dy*L/d;d=L;}
  const a=Math.atan2(by-ay,bx-ax),c=Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1)),an=a+bend*c;return [ax+Math.cos(an)*l1,ay+Math.sin(an)*l1,bx,by];}
  const SKIN=['#F6D3BA','#E9B590','#C98D66','#8D5A3B','#F2C6A2'],HAIR=['#2B1B12','#6A4326','#B0602E','#E3B45E','#111318'],
  SHIRTS=['#FFB21E','#3B82F6','#EEF1F6','#22C55E','#FF6B6B','#FF7EB6','#7EA3FF','#14B8A6'];

  // person: человек. o: h 300 (рост взрослого), age 'adult'|'kid'|'old', pose 'stand'|'walk'|'run'|'wave'|'hold'|'point'|'shout'|'sit'|'read'|'dance'|'ride',
  // t, ph (сдвиг фазы), dir 1|-1, skin, hair, hs 'short'|'long'|'bun'|'bald', shirt, pants, shoe, dress (цвет платья), apron, scarf (платок), helmet, cap,
  // bag (рюкзак), glasses, book (цвет книги в руках), seat (цвет сиденья под sit/read), sleep (глаза закрыты), hands [[x,y],[x,y]], lean. Возвращает {hand,hand2,head,top}.
  function person(g,x,y,o={}){const age=o.age||'adult',kid=age==='kid',old=age==='old',H=(o.h||300)*(kid?0.64:old?0.95:1),t=o.t||0,dir=o.dir||1,pose=o.pose||'stand';
  const hr=H*(kid?0.1:0.082),leg=H*(kid?0.39:0.44),tor=H*(kid?0.27:0.3),arm=H*(kid?0.31:0.34),tw=H*(kid?0.19:0.2),lw=H*0.07,aw=H*0.058;
  const skin=o.skin||SKIN[0],hair=o.hair||(old?'#E3E5EA':HAIR[0]),shirt=o.shirt||C.amber,pants=o.pants||'#3A4566',shoe=o.shoe||'#55607D';
  const sp=pose==='run'?10:6,ph=t*sp+(o.ph||0),sit=pose==='sit'||pose==='read',ride=pose==='ride';
  let bob=pose==='walk'?Math.abs(Math.sin(ph))*H*0.012:pose==='run'?Math.abs(Math.sin(ph))*H*0.035:pose==='dance'?Math.abs(Math.sin(t*6+(o.ph||0)))*H*0.03:0;
  let hipY=(sit?y-leg*0.52:ride&&o.hip?o.hip[1]:y-leg)-bob;const hx=ride&&o.hip?o.hip[0]:x;
  const lean=o.lean!=null?o.lean:pose==='run'?0.16:pose==='walk'?0.04:ride?0.28:old?0.08:pose==='shout'?0.06:0;
  g.save();if(dir<0){g.translate(x,0);g.scale(-1,1);g.translate(-x,0);}
  if(!sit&&!ride&&o.shadow!==false)gsh(g,x,y,H*0.34);if(sit&&o.seat){gsh(g,x+leg*0.2,y,leg*0.9);g.fillStyle=o.seat;rr(g,x-tw*0.5,hipY+lw*0.4,tw+leg*0.35,y-hipY-lw*0.4,lw*0.4);g.fill();}
  // ноги (дальняя темнее)
  const feet=[];for(let i=0;i<2;i++){let fx,fy;
   if(sit){fx=hx+leg*0.52+i*lw*0.5;fy=y;}else if(ride){const P=o.pedal||[[hx+leg*0.3,y],[hx-leg*0.05,y]];fx=P[i][0];fy=P[i][1];}
   else{const s=i?1:-1;let sw=0;if(pose==='walk')sw=Math.sin(ph+i*Math.PI)*0.36;else if(pose==='run')sw=Math.sin(ph+i*Math.PI)*0.7;else if(pose==='dance')sw=Math.sin(t*6+(o.ph||0)+i*Math.PI)*0.22;
    fx=hx+s*tw*0.14+Math.sin(sw)*leg;fy=Math.min(y,hipY+Math.cos(sw)*leg*1.02);if(pose==='walk'||pose==='run')fy-=Math.max(0,Math.cos(ph+i*Math.PI))*H*(pose==='run'?0.06:0.025);}
   feet.push([fx,fy]);}
  const legC=[dark(pants,0.18),pants];for(let i=0;i<2;i++){const hpx=hx+(i?1:-1)*tw*0.18,[fx,fy]=feet[i];let kx,ky;
   if(sit){kx=hx+leg*0.5+i*lw*0.5;ky=hipY;}else{const k=ik(hpx,hipY,fx,fy,leg*0.5,leg*0.5,-1);kx=k[0];ky=k[1];}
   if(!o.dress||sit||ride)seg(g,[[hpx,hipY],[kx,ky],[fx,fy-lw*0.3]],lw,legC[i]);else seg(g,[[kx,ky],[fx,fy-lw*0.3]],lw*0.8,skin);
   ell(g,fx+lw*0.35,fy-lw*0.28,lw*0.68,lw*0.36,shoe);}
  // плечи, руки
  const ax=hx+Math.sin(lean)*tor,ay=hipY-Math.cos(lean)*tor+aw*0.7;
  const hand=(i)=>{const s=i?1:-1,bx=ax+s*tw*0.36;if(o.hands)return o.hands[i];
   if(pose==='walk'||pose==='run'){const a=-Math.sin(ph+i*Math.PI)*(pose==='run'?0.9:0.45);return [bx+Math.sin(a)*arm*0.95,ay+Math.cos(a)*arm*(pose==='run'?0.7:0.95)];}
   if(pose==='wave')return i?[bx+arm*0.3+Math.sin(t*9+(o.ph||0))*arm*0.16,ay-arm*0.85]:[bx-tw*0.1,ay+arm*0.95];
   if(pose==='hold'||sit)return [ax+arm*(sit?0.6:0.45)+s*tw*0.12,ay+arm*(sit?0.5:0.42)];
   if(pose==='point'||pose==='shout')return i?[bx+arm*0.95,ay-(pose==='shout'?arm*0.35:arm*0.05)]:[bx-tw*0.08,ay+arm*0.95];
   if(pose==='dance'){const w=Math.sin(t*6+(o.ph||0)+i*2)*arm*0.25;return [bx+s*arm*0.35+w,ay-arm*0.75];}
   if(ride)return [hx+leg*0.75,ay+arm*0.25];return [bx+s*tw*0.12,ay+arm*0.95];};
  const arms=[0,1].map(i=>{const s=i?1:-1,bx=ax+s*tw*0.36,[px,py]=hand(i),k=ik(bx,ay,px,py,arm*0.5,arm*0.5,(pose==='hold'||sit||ride)?-1:1);return [[bx,ay],[k[0],k[1]],[px,py]];});
  const drawArm=(a,c)=>{seg(g,a,aw,c);disc(g,a[2][0],a[2][1],aw*0.62,skin);};
  if(o.bag){g.save();g.translate(hx,hipY);g.rotate(lean);g.fillStyle=o.bag;rr(g,-tw*0.5-tw*0.42,-tor*0.92,tw*0.55,tor*0.62,tw*0.16);g.fill();g.restore();}
  drawArm(arms[0],dark(shirt,0.15));
  // корпус
  g.save();g.translate(hx,hipY);g.rotate(lean);
  if(o.dress&&!sit&&!ride){g.fillStyle=o.dress;g.beginPath();g.moveTo(-tw*0.42,-tor*0.4);g.lineTo(tw*0.42,-tor*0.4);g.lineTo(tw*0.72,leg*0.55);g.lineTo(-tw*0.72,leg*0.55);g.closePath();g.fill();}
  g.fillStyle=o.dress&&!sit&&!ride?o.dress:shirt;rr(g,-tw/2,-tor,tw,tor+lw*0.5,tw*0.36);g.fill();
  g.fillStyle='rgba(255,255,255,0.13)';rr(g,-tw/2,-tor,tw,tor*0.45,tw*0.36);g.fill();
  if(o.apron){g.fillStyle=o.apron;rr(g,-tw*0.32,-tor*0.62,tw*0.64,tor*0.62+lw*0.9,tw*0.12);g.fill();}
  g.restore();
  // голова
  const hX=hx+Math.sin(lean)*(tor+hr*1.05),hY=hipY-Math.cos(lean)*(tor+hr*1.05)-H*0.012;
  seg(g,[[ax,ay-aw*0.6],[hX,hY+hr*0.5]],hr*0.55,dark(skin,0.12));
  if(o.scarf)disc(g,hX,hY,hr*1.22,o.scarf);
  else if(o.hs==='long'||(!o.hs&&o.dress&&!old)){g.fillStyle=hair;rr(g,hX-hr*1.12,hY-hr*0.9,hr*1.5,hr*2.2,hr*0.7);g.fill();}
  disc(g,hX,hY,hr,skin);
  const hs=o.hs||(old?'bun':'short');
  if(o.scarf){g.fillStyle=o.scarf;g.beginPath();g.arc(hX,hY-hr*0.2,hr*1.14,Math.PI,0);g.closePath();g.fill();poly(g,[[hX-hr*0.3,hY+hr*0.95],[hX-hr*0.75,hY+hr*1.55],[hX+hr*0.05,hY+hr*1.3]],o.scarf);}
  else if(hs!=='bald'){g.fillStyle=hair;g.beginPath();g.arc(hX,hY-hr*0.06,hr*1.06,Math.PI*1.02,Math.PI*1.98);g.quadraticCurveTo(hX+hr*0.5,hY-hr*0.45,hX-hr*0.2,hY-hr*0.38);g.lineTo(hX-hr*1.04,hY+hr*0.15);g.closePath();g.fill();
   if(hs==='bun')disc(g,hX-hr*0.55,hY-hr*0.9,hr*0.45,hair);}
  if(o.helmet){g.fillStyle=o.helmet;g.beginPath();g.arc(hX,hY-hr*0.12,hr*1.14,Math.PI,0);g.closePath();g.fill();rr(g,hX-hr*1.3,hY-hr*0.2,hr*2.6,hr*0.28,hr*0.14);g.fill();
   g.fillStyle='rgba(255,255,255,0.3)';rr(g,hX-hr*0.15,hY-hr*1.2,hr*0.3,hr*0.9,hr*0.15);g.fill();}
  else if(o.cap){g.fillStyle=o.cap;g.beginPath();g.arc(hX,hY-hr*0.12,hr*1.06,Math.PI,0);g.closePath();g.fill();rr(g,hX,hY-hr*0.32,hr*1.5,hr*0.26,hr*0.13);g.fill();}
  const ec='#111318';if(o.sleep){g.strokeStyle=ec;g.lineWidth=hr*0.1;g.lineCap='round';g.beginPath();g.moveTo(hX+hr*0.12,hY+hr*0.08);g.lineTo(hX+hr*0.36,hY+hr*0.08);g.moveTo(hX+hr*0.52,hY+hr*0.08);g.lineTo(hX+hr*0.76,hY+hr*0.08);g.stroke();}
  else{disc(g,hX+hr*0.25,hY+hr*0.05,hr*0.1,ec);disc(g,hX+hr*0.65,hY+hr*0.05,hr*0.1,ec);}
  if(o.glasses){g.strokeStyle=o.glasses===true?'#22283F':o.glasses;g.lineWidth=hr*0.08;g.beginPath();g.arc(hX+hr*0.25,hY+hr*0.05,hr*0.22,0,7);g.moveTo(hX+hr*0.87,hY+hr*0.05);g.arc(hX+hr*0.65,hY+hr*0.05,hr*0.22,0,7);g.stroke();}
  if(pose==='shout'||o.mouth==='open')ell(g,hX+hr*0.5,hY+hr*0.48,hr*0.16,hr*0.2,'#7A1F3A');
  else{g.strokeStyle=dark(skin,0.45);g.lineWidth=hr*0.08;g.lineCap='round';g.beginPath();g.arc(hX+hr*0.48,hY+hr*0.32,hr*0.2,0.35,Math.PI-0.35);g.stroke();}
  drawArm(arms[1],shirt);
  if(o.book||pose==='read'){const [bx,by]=arms[1][2],bc=o.book||C.amber;g.save();g.translate(bx,by);g.rotate(-0.15);
   g.fillStyle=bc;rr(g,-hr*1.2,-hr*0.9,hr*2.4,hr*1.25,hr*0.12);g.fill();g.fillStyle='#FFFFFF';rr(g,-hr*1.05,-hr*0.82,hr*1.0,hr*1.05,hr*0.08);g.fill();rr(g,hr*0.05,-hr*0.82,hr*1.0,hr*1.05,hr*0.08);g.fill();g.restore();}
  g.restore();const fl=p=>dir<0?[2*x-p[0],p[1]]:p;
  return {hand:fl(arms[1][2]),hand2:fl(arms[0][2]),head:fl([hX,hY]),top:hY-hr*1.1,h:H};}
  // crowd: n разных людей в ряд от x0 до x1 (разные кожа, волосы, одежда, фаза). o: h, pose, t, kids 0..1, old 0..1, shirts[], seed, dir, opts(i)
  function crowd(g,x0,x1,y,n,o={}){const R=rng(o.seed||7),dx=n>1?(x1-x0)/(n-1):0,sh=o.shirts||SHIRTS,out=[];
  for(let i=0;i<n;i++){const r1=R(),r2=R(),r3=R(),r4=R(),r5=R(),kid=o.kids&&r1<o.kids,old=!kid&&o.old&&r2<o.old;
  const p=Object.assign({h:(o.h||260)*(0.92+r3*0.14),age:kid?'kid':old?'old':'adult',pose:o.pose||'stand',t:o.t,ph:i*1.9,dir:o.dir||(i%2?-1:1),
  skin:SKIN[Math.floor(r4*SKIN.length)],hair:HAIR[Math.floor(r5*HAIR.length)],hs:['short','long','bun','short'][i%4],shirt:sh[i%sh.length],
  pants:['#3A4566','#55607D','#6A5A4A','#2A3350'][i%4],dress:i%4===1?sh[(i+3)%sh.length]:null},o.opts?o.opts(i):{});
  if(o.opts){const q=o.opts(i);if(q.shirt&&!('dress' in q))p.dress=null;}out.push(person(g,x0+dx*i,y+(i%2)*6,p));}return out;}

  // ---------- здания (o.night: стены в тени, погасшие окна тёмные)
  const nw=(c,n)=>n?cmix(c,'#0A0F1C',0.5*(n===true?1:clamp(n))):c;
  // обводка панели здания (o.edge цвет или false)
  function edge(g,o){if(o.edge===false)return;g.strokeStyle=o.edge||C.amber;g.lineWidth=o.ew||3;g.stroke();}
  function winR(g,x,y,w,h,lit,o={}){const l=typeof lit==='number'?clamp(lit):lit?1:0;g.fillStyle=l>0?cmix(o.off||OFF,o.lit||'#FFC02E',l):(o.off||OFF);
  rr(g,x,y,w,h,Math.min(w,h)*0.16);g.fill();if(l>0&&o.glow!==false)glow(g,x+w/2,y+h/2,Math.max(w,h)*1.05,'#FFC02E',0.32*l);}
  // house: дом с треугольной крышей. o: wall, roof, door, win, lit 0..1, night (тёмные окна)
  function house(g,x,y,w,h,o={}){const wall=nw(o.wall||C.panel,o.night),roof=o.roof||C.amber,x0=x-w/2,bh=h*0.58,off=o.night?'#26304F':o.win||OFF;gsh(g,x,y,w*1.2);
  g.fillStyle=roof;g.strokeStyle=roof;g.lineWidth=w*0.05;g.lineJoin='round';g.beginPath();g.moveTo(x0-w*0.07,y-bh+w*0.02);g.lineTo(x,y-h);g.lineTo(x0+w*1.07,y-bh+w*0.02);g.closePath();g.fill();g.stroke();
  g.fillStyle=wall;rr(g,x0,y-bh,w,bh,w*0.04);g.fill();edge(g,o);g.fillStyle='rgba(17,19,24,0.06)';g.fillRect(x0+w*0.7,y-bh,w*0.3,bh);
  g.fillStyle=o.door||dark(roof,0.3);rr(g,x0+w*0.6,y-bh*0.62,w*0.22,bh*0.62,w*0.05);g.fill();
  winR(g,x0+w*0.14,y-bh*0.75,w*0.3,bh*0.36,o.lit||0,{off,glow:o.glow});}
  // tower: многоэтажка cols×rows окон. o: wall, roof, win, lit 0..1 (доля горящих, гаснут по одному в случайном порядке), grow 0..1 (стройка по этажам), night, cw, ch, seed
  function tower(g,x,y,cols,rows,o={}){const cw=o.cw||46,ch=o.ch||56,gx=cw*0.45,gy=ch*0.42,w=cols*cw+(cols+1)*gx,fh=ch+gy,h=rows*fh+gy+ch*0.35;
  const wall=nw(o.wall||C.panel,o.night),x0=x-w/2,gr=o.grow==null?1:clamp(o.grow),fl=gr*rows,nf=Math.ceil(fl-1e-6),off=o.night?'#26304F':o.win||OFF;
  if(nf<=0)return {x0,top:y,w,h:0};const hh=nf*fh+gy+(nf>=rows?ch*0.35:0),top=y-hh;gsh(g,x,y,w*1.15);
  g.fillStyle=wall;rr(g,x0,top,w,hh,10);g.fill();edge(g,o);g.fillStyle='rgba(17,19,24,0.06)';g.fillRect(x0+w*0.78,top,w*0.22,hh);
  if(nf>=rows){g.fillStyle=o.roof||C.amber;rr(g,x0-6,top-12,w+12,20,8);g.fill();}
  const N=cols*rows,R=rng(o.seed||11),ord=[...Array(N).keys()].map(i=>[R(),i]).sort((a,b)=>a[0]-b[0]).map(a=>a[1]),rank=new Array(N);ord.forEach((v,k)=>rank[v]=k);
  const L=(o.lit||0)*N;for(let r=0;r<nf;r++){const fy=y-(r+1)*fh,fa=r===nf-1?clamp((fl-r)*1.5):1;if(fa<=0)continue;g.save();g.globalAlpha*=fa;
  for(let c=0;c<cols;c++){const i=r*cols+c;winR(g,x0+gx+c*(cw+gx),fy,cw,ch,clamp(L-rank[i]),{off,glow:o.glow});}g.restore();}
  return {x0,top,w,h:hh};}
  // shop: магазин или кафе. o: kind 'shop'|'cafe', sign (текст вывески), awning, awning2 (полосы навеса), wall, lit
  function shop(g,x,y,w,h,o={}){const x0=x-w/2,wall=nw(o.wall||C.panel,o.night),a1=o.awning||C.amber,a2=o.awning2||C.text,sh=h*0.2,ah=h*0.16;gsh(g,x,y,w*1.15);
  g.fillStyle=wall;rr(g,x0,y-h,w,h,w*0.03);g.fill();edge(g,o);g.fillStyle='rgba(17,19,24,0.06)';g.fillRect(x0+w*0.8,y-h,w*0.2,h);
  g.fillStyle=o.signBg||dark(a1,0.35);rr(g,x0+w*0.08,y-h+h*0.04,w*0.84,sh,sh*0.25);g.fill();if(o.sign)Tr(g,o.sign,x,y-h+h*0.04+sh/2,sh*0.55,'#FFFFFF',800,'center',SANS,w*0.76);
  const ay=y-h+sh+h*0.08,n=Math.max(4,Math.round(w/50));for(let i=0;i<n;i++){g.fillStyle=i%2?a2:a1;const sx=x0-w*0.03+i*(w*1.06/n),sw=w*1.06/n;g.fillRect(sx,ay,sw+0.5,ah);g.beginPath();g.arc(sx+sw/2,ay+ah,sw/2,0,Math.PI);g.fill();}
  const wy=ay+ah+h*0.08;winR(g,x0+w*0.08,wy,w*0.5,y-wy-h*0.08,o.lit||0,{off:o.win||OFF,glow:o.glow});
  g.fillStyle=o.door||dark(a1,0.3);rr(g,x0+w*0.66,wy,w*0.24,y-wy,w*0.03);g.fill();disc(g,x0+w*0.7,wy+(y-wy)*0.55,w*0.012,'#FFFFFF');
  if(o.kind==='cafe'){const tx=x0+w*0.33,ty=y;g.fillStyle=dark(a1,0.3);rr(g,tx-w*0.12,ty-h*0.2,w*0.24,h*0.03,4);g.fill();g.fillRect(tx-2,ty-h*0.2,4,h*0.2);
   g.fillStyle='#FFFFFF';rr(g,tx-w*0.04,ty-h*0.27,w*0.06,h*0.07,3);g.fill();}}
  // school: школа, библиотека, ратуша (центр с фронтоном). o: sign (текст), wall, roof, flag (цвет флага), clock:false, hm:[часы,минуты], lit, night
  function school(g,x,y,w,h,o={}){const x0=x-w/2,wall=nw(o.wall||C.panel,o.night),roof=o.roof||C.amber,off=o.night?'#26304F':o.win||OFF,bh=h*0.72,cw=w*0.34;gsh(g,x,y,w*1.1);
  g.fillStyle=wall;rr(g,x0,y-bh,w,bh,8);g.fill();edge(g,o);g.fillStyle=roof;rr(g,x0-6,y-bh-10,w+12,16,6);g.fill();
  g.fillStyle=wall;rr(g,x-cw/2,y-h*0.92,cw,h*0.92,6);g.fill();edge(g,o);g.fillStyle='rgba(17,19,24,0.06)';g.fillRect(x+cw*0.25,y-h*0.92,cw*0.25,h*0.92);
  poly(g,[[x-cw/2-10,y-h*0.92+2],[x,y-h],[x+cw/2+10,y-h*0.92+2]],roof);
  if(o.clock!==false){disc(g,x,y-h*0.78,cw*0.13,'#FFFFFF');g.strokeStyle=roof;g.lineWidth=3;g.beginPath();g.arc(x,y-h*0.78,cw*0.13,0,7);const hm=o.hm||[3,0],ah=(hm[0]%12+hm[1]/60)/12*Math.PI*2,am=hm[1]/60*Math.PI*2;g.moveTo(x,y-h*0.78);g.lineTo(x+Math.sin(ah)*cw*0.07,y-h*0.78-Math.cos(ah)*cw*0.07);g.moveTo(x,y-h*0.78);g.lineTo(x+Math.sin(am)*cw*0.1,y-h*0.78-Math.cos(am)*cw*0.1);g.stroke();}
  if(o.sign){g.fillStyle=roof;rr(g,x-cw*0.62,y-h*0.6,cw*1.24,h*0.11,h*0.03);g.fill();Tr(g,o.sign,x,y-h*0.6+h*0.055,h*0.065,o.signCol||C.ink,800,'center',SANS,cw*1.14);}
  g.fillStyle=o.door||dark(roof,0.3);rr(g,x-cw*0.24,y-h*0.3,cw*0.48,h*0.3,cw*0.06);g.fill();
  const ww=(w-cw)/2,nc=Math.max(2,Math.round(ww/70));for(const s of [-1,1])for(let r=0;r<2;r++)for(let c=0;c<nc;c++){const wx=s<0?x0+18+c*((ww-24)/nc):x+cw/2+8+c*((ww-24)/nc);
  winR(g,wx,y-bh+bh*0.14+r*bh*0.44,(ww-24)/nc-14,bh*0.3,o.lit||0,{off,glow:o.glow});}
  if(o.flag){const fx=x+cw*0.36,fy=y-h*1.12;g.fillStyle='#7A7E88';g.fillRect(fx,fy,4,h*0.12);const wv=Math.sin((o.t||0)*4)*4;
  g.fillStyle=o.flag;g.beginPath();g.moveTo(fx+4,fy);g.quadraticCurveTo(fx+24,fy-4+wv,fx+44,fy+wv);g.lineTo(fx+44,fy+22+wv);g.quadraticCurveTo(fx+24,fy+18+wv,fx+4,fy+22);g.closePath();g.fill();}}

  // ---------- растения
  // tree: дерево высотой s. o: kind 'leaf'|'oak'|'pine', col (крона), trunk, t (покачивание)
  function tree(g,x,y,s,o={}){const k=o.kind||'leaf',col=o.col||(k==='pine'?'#2A8A55':'#3FAE6A'),tr=o.trunk||'#8A5A3C',sw=Math.sin((o.t||0)*1.3+x*0.013)*0.02;
  gsh(g,x,y,s*(k==='oak'?0.7:0.45));g.save();g.translate(x,y);g.rotate(sw);
  if(k==='pine'){g.fillStyle=tr;rr(g,-s*0.04,-s*0.2,s*0.08,s*0.2,3);g.fill();for(let i=0;i<3;i++){const b=-s*0.14-i*s*0.24,w=s*(0.36-i*0.08);
   g.fillStyle=i%2?light(col,0.08):col;g.strokeStyle=g.fillStyle;g.lineWidth=s*0.03;g.lineJoin='round';g.beginPath();g.moveTo(-w,b);g.lineTo(0,b-s*0.34);g.lineTo(w,b);g.closePath();g.fill();g.stroke();}}
  else{const oak=k==='oak',th=s*(oak?0.4:0.45),tw=s*(oak?0.11:0.07);g.fillStyle=tr;rr(g,-tw/2,-th-s*0.05,tw,th+s*0.05,tw*0.3);g.fill();
   if(oak){seg(g,[[0,-th*0.8],[-s*0.16,-th*1.15]],tw*0.45,tr);seg(g,[[0,-th*0.85],[s*0.15,-th*1.2]],tw*0.45,tr);}
   const C2=oak?[[0,-0.7,0.25],[-0.24,-0.6,0.2],[0.25,-0.6,0.21],[-0.12,-0.85,0.2],[0.14,-0.84,0.2]]:[[0,-0.68,0.27],[-0.17,-0.55,0.2],[0.18,-0.56,0.21]];
   C2.forEach(c=>disc(g,c[0]*s,c[1]*s,c[2]*s,col));g.globalAlpha*=0.5;disc(g,-s*0.07,-s*(oak?0.82:0.76),s*0.11,light(col,0.25));}
  g.restore();}
  // grass: полоса травы от x0 до x1 по земле y. o: col, h (высота травинок), t
  function grass(g,x0,x1,y,o={}){const h=o.h||22,col=o.col||'#3FAE6A',R=rng(o.seed||5),t=o.t||0;g.fillStyle=col;g.beginPath();
  for(let x=x0;x<x1;x+=h*0.55){const hh=h*(0.6+R()*0.6),sw=Math.sin(t*2+x*0.05)*h*0.12;g.moveTo(x-h*0.18,y);g.lineTo(x+sw,y-hh);g.lineTo(x+h*0.18,y);}g.fill();
  g.fillStyle=dark(col,0.12);g.fillRect(x0,y-1,x1-x0,4);}
  // leaf: кленовый лист (5 лопастей); leaves: листья падают в прямоугольнике (x0..x1, y0..y1). o: n, cols[], seed
  function leaf(g,x,y,s,o={}){g.save();g.translate(x,y);g.rotate(o.rot||0);g.fillStyle=o.col||'#F2A324';g.beginPath();
  const LR=[1,0.38,0.72,0.55,0.95,0.32,0.62,0.3,0.12,0.3,0.62,0.32,0.95,0.55,0.72,0.38];for(let i=0;i<16;i++){const a=-Math.PI/2+i*Math.PI/8,r=s*LR[i];g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath();g.fill();
  g.strokeStyle=dark(o.col||'#F2A324',0.25);g.lineWidth=Math.max(1,s*0.08);g.beginPath();g.moveTo(0,0);g.lineTo(0,s*0.9);g.stroke();g.restore();}
  function leaves(g,t,x0,x1,y0,y1,o={}){const R=rng(o.seed||9),n=o.n||14,cols=o.cols||['#F2A324','#FF5A4E','#E07A2E','#E3B45E'];
  for(let i=0;i<n;i++){const ox=R(),sp=0.12+R()*0.1,ph=R(),u=(t*sp+ph)%1,s=(o.s||16)*(0.8+R()*0.5);
  leaf(g,lerp(x0,x1,ox)+Math.sin(t*1.5+i)*30,lerp(y0,y1,u),s,{col:cols[i%cols.length],rot:t*1.2+i});}}

  // ---------- транспорт (dir 1 вправо / -1 влево, t крутит колёса, v скорость вращения)
  function wheel(g,x,y,r,a){disc(g,x,y,r,'#0A0F1C');g.strokeStyle='#55607D';g.lineWidth=r*0.14;g.beginPath();g.arc(x,y,r*0.92,0,7);g.stroke();disc(g,x,y,r*0.48,'#E3E5EA');g.strokeStyle='#7A7E88';g.lineWidth=r*0.12;g.beginPath();
  g.moveTo(x+Math.cos(a)*r*0.42,y+Math.sin(a)*r*0.42);g.lineTo(x-Math.cos(a)*r*0.42,y-Math.sin(a)*r*0.42);g.stroke();}
  function flipX(g,x,dir){if(dir<0){g.translate(x,0);g.scale(-1,1);g.translate(-x,0);}}
  // car: легковушка длиной s. o: col, win
  function car(g,x,y,s=240,o={}){const col=o.col||'#FF5A4E',r=s*0.09,x0=x-s/2,a=(o.t||0)*(o.v==null?8:o.v);g.save();flipX(g,x,o.dir||1);gsh(g,x,y,s*1.05);
  g.fillStyle=col;g.beginPath();g.moveTo(x0+s*0.2,y-s*0.3);g.lineTo(x0+s*0.32,y-s*0.47);g.lineTo(x0+s*0.66,y-s*0.47);g.lineTo(x0+s*0.8,y-s*0.3);g.closePath();g.fill();
  g.lineJoin='round';g.strokeStyle=col;g.lineWidth=s*0.06;g.stroke();rr(g,x0,y-s*0.33,s,s*0.2,s*0.07);g.fill();
  g.fillStyle=o.win||OFF;poly(g,[[x0+s*0.27,y-s*0.32],[x0+s*0.35,y-s*0.43],[x0+s*0.48,y-s*0.43],[x0+s*0.48,y-s*0.32]],o.win||OFF);
  poly(g,[[x0+s*0.52,y-s*0.32],[x0+s*0.52,y-s*0.43],[x0+s*0.64,y-s*0.43],[x0+s*0.73,y-s*0.32]],o.win||OFF);
  g.fillStyle='rgba(255,255,255,0.18)';rr(g,x0,y-s*0.33,s,s*0.07,s*0.04);g.fill();disc(g,x0+s*0.96,y-s*0.25,s*0.025,'#FFE9A8');
  wheel(g,x0+s*0.22,y-r,r,a);wheel(g,x0+s*0.78,y-r,r,a);g.restore();}
  // bus: автобус длиной s. o: col, num (текст номера), people (головы в окнах), win
  function bus(g,x,y,s=440,o={}){const col=o.col||'#3B82F6',h=s*0.36,x0=x-s/2,r=s*0.06,a=(o.t||0)*(o.v==null?6:o.v);g.save();flipX(g,x,o.dir||1);gsh(g,x,y,s*1.02);
  g.fillStyle=col;rr(g,x0,y-h-r*0.6,s,h,s*0.05);g.fill();g.fillStyle='rgba(255,255,255,0.16)';rr(g,x0,y-h-r*0.6,s,h*0.12,s*0.05);g.fill();
  const wy=y-h-r*0.6+h*0.16,wh=h*0.36,n=4,ww=(s*0.68)/n;for(let i=0;i<n;i++){const wx=x0+s*0.04+i*ww;g.fillStyle=o.win||OFF;rr(g,wx,wy,ww-10,wh,8);g.fill();
   if(o.people){const R=rng(i+3);disc(g,wx+ww*0.45,wy+wh*0.62,wh*0.22,SKIN[i%SKIN.length]);g.fillStyle=HAIR[Math.floor(R()*5)];g.beginPath();g.arc(wx+ww*0.45,wy+wh*0.58,wh*0.23,Math.PI,0);g.fill();}}
  g.fillStyle=o.win||OFF;rr(g,x0+s*0.78,wy,s*0.2,h*0.62,10);g.fill();g.fillStyle=dark(col,0.3);rr(g,x0+s*0.73,wy+wh+8,s*0.06,y-r*0.6-(wy+wh+8)-4,4);g.fill();
  g.fillStyle=light(col,0.25);g.fillRect(x0,wy+wh+h*0.14,s*0.72,h*0.06);
  if(o.num){const bw=s*0.15,bh=h*0.17;g.fillStyle='#111318';rr(g,x0+s*0.82,y-h-r*0.6-bh*0.2,bw,bh,6);g.fill();g.save();if((o.dir||1)<0){g.translate(x0+s*0.82+bw/2,0);g.scale(-1,1);g.translate(-(x0+s*0.82+bw/2),0);}
   Tr(g,o.num,x0+s*0.82+bw/2,y-h-r*0.6-bh*0.2+bh/2,bh*0.72,'#FFC02E',800,'center',SANS,bw*0.9);g.restore();}
  disc(g,x0+s*0.985,y-r*1.6,s*0.016,'#FFE9A8');wheel(g,x0+s*0.18,y-r,r,a);wheel(g,x0+s*0.8,y-r,r,a);g.restore();}
  // bike: велосипед с седоком длиной s. o: col (рама), rider (параметры person) или false
  function bike(g,x,y,s=200,o={}){const col=o.col||C.amber,r=s*0.25,a=(o.t||0)*(o.v==null?8:o.v),bx=x-s*0.33,fx=x+s*0.33,wy=y-r,cx=x-s*0.02,cy=wy+r*0.05;
  g.save();flipX(g,x,o.dir||1);gsh(g,x,y,s*1.1);for(const wx of [bx,fx]){g.strokeStyle='#C9D1E0';g.lineWidth=s*0.035;g.beginPath();g.arc(wx,wy,r,0,7);g.stroke();
   g.strokeStyle='#C9CDD6';g.lineWidth=1.5;g.beginPath();for(let k=0;k<3;k++){const q=a+k*Math.PI/3;g.moveTo(wx+Math.cos(q)*r,wy+Math.sin(q)*r);g.lineTo(wx-Math.cos(q)*r,wy-Math.sin(q)*r);}g.stroke();}
  const sx=x-s*0.1,sy=wy-s*0.36,hx=fx-s*0.06,hy=wy-s*0.42;seg(g,[[bx,wy],[sx,sy+s*0.04],[cx,cy],[bx,wy]],s*0.04,col);seg(g,[[sx+s*0.02,sy+s*0.08],[hx,hy+s*0.06],[cx,cy]],s*0.04,col);seg(g,[[hx,hy],[fx,wy]],s*0.04,col);
  seg(g,[[hx-s*0.05,hy-s*0.02],[hx+s*0.03,hy]],s*0.035,'#C9D1E0');g.fillStyle='#C9D1E0';rr(g,sx-s*0.08,sy-s*0.02,s*0.14,s*0.04,s*0.02);g.fill();
  const pa=a*0.6,P=[[cx+Math.cos(pa)*s*0.1,cy+Math.sin(pa)*s*0.1],[cx-Math.cos(pa)*s*0.1,cy-Math.sin(pa)*s*0.1]];
  let res=null;if(o.rider!==false){res=person(g,x,y,Object.assign({h:s*1.25,shirt:'#F2A324'},o.rider||{},{pose:'ride',hip:[sx,sy-s*0.02],pedal:[P[1],P[0]],hands:[[hx-s*0.03,hy],[hx,hy]],shadow:false,dir:1,t:o.t}));}
  g.restore();return res;}
  // boat: лодка/катер длиной s, y - ватерлиния. o: col (корпус), stripe, cabin (цвет рубки или false), motor, run 0..1 (бурун и ход), t, dir. Возвращает {deck:[x,y],x0,x1}
  function boat(g,x,y,s=300,o={}){const col=o.col||C.text,t=o.t||0,b=Math.sin(t*2.2+x*0.01)*s*0.012,x0=x-s/2,x1=x+s/2,dy=y+b,hh=s*0.17;g.save();flipX(g,x,o.dir||1);
  g.translate(x,dy);g.rotate(Math.sin(t*1.7+x*0.02)*0.025);g.translate(-x,-dy);
  const run=o.run||0;if(run>0){g.fillStyle=rgba('#FFFFFF',0.75*run);for(let i=0;i<3;i++){const wx=x0-s*0.05-i*s*0.16-((t*60)%(s*0.16));g.beginPath();g.ellipse(wx,dy+2,s*0.07*(1-i*0.2),s*0.018,0,0,7);g.fill();}}
  if(o.cabin!==false){const cc=o.cabin||'#C9D1E0';g.fillStyle=cc;rr(g,x-s*0.2,dy-hh-s*0.16,s*0.3,s*0.18,s*0.03);g.fill();g.fillStyle='#9CC2FF';rr(g,x-s*0.03,dy-hh-s*0.13,s*0.1,s*0.07,s*0.015);g.fill();
   g.fillStyle=dark(cc,0.2);rr(g,x-s*0.23,dy-hh-s*0.18,s*0.36,s*0.035,s*0.015);g.fill();}
  if(o.motor){g.fillStyle=o.motorCol||'#55607D';rr(g,x0-s*0.06,dy-hh-s*0.06,s*0.09,s*0.12,s*0.02);g.fill();g.fillRect(x0-s*0.03,dy-hh+s*0.04,s*0.025,hh+s*0.02);}
  g.fillStyle=col;g.beginPath();g.moveTo(x0,dy-hh);g.lineTo(x1+s*0.04,dy-hh-s*0.04);g.quadraticCurveTo(x1-s*0.04,dy+s*0.02,x1-s*0.2,dy+s*0.05);g.lineTo(x0+s*0.05,dy+s*0.05);g.closePath();g.fill();
  g.strokeStyle=rgba('#111318',0.12);g.lineWidth=2;g.stroke();g.fillStyle=o.stripe||C.amber;g.beginPath();g.moveTo(x0+s*0.01,dy-hh*0.45);g.lineTo(x1-s*0.02,dy-hh*0.6);g.lineTo(x1-s*0.06,dy-hh*0.3);g.lineTo(x0+s*0.02,dy-hh*0.18);g.closePath();g.fill();
  g.restore();const d=(o.dir||1)<0?-1:1;return {deck:[x,dy-hh],x0:x-d*s/2,x1:x+d*s/2};}

  // ---------- животные
  // dog: собака длиной s. o: col, pose 'stand'|'run'|'sit'|'sleep', t, dir, collar (цвет ошейника), ear
  function dog(g,x,y,s=170,o={}){const col=o.col||'#C98A4B',ear=o.ear||dark(col,0.3),belly=light(col,0.35),t=o.t||0,p=o.pose||'stand';g.save();flipX(g,x,o.dir||1);gsh(g,x,y,s*1.0);
  const eye='#111318';if(p==='sleep'){const br=1+Math.sin(t*2.2)*0.03;g.strokeStyle=col;g.lineWidth=s*0.08;g.lineCap='round';g.beginPath();g.moveTo(x-s*0.38,y-s*0.1);g.quadraticCurveTo(x-s*0.55,y-s*0.02,x-s*0.35,y-s*0.02);g.stroke();
   ell(g,x-s*0.02,y-s*0.15*br,s*0.42,s*0.15*br,col);ell(g,x,y-s*0.06,s*0.3,s*0.06,belly);ell(g,x+s*0.38,y-s*0.04,s*0.12,s*0.04,col);
   disc(g,x+s*0.4,y-s*0.15,s*0.15,col);ell(g,x+s*0.55,y-s*0.1,s*0.09,s*0.06,belly);disc(g,x+s*0.63,y-s*0.12,s*0.025,eye);ell(g,x+s*0.33,y-s*0.16,s*0.06,s*0.11,ear,0.5);
   g.strokeStyle=eye;g.lineWidth=s*0.018;g.beginPath();g.arc(x+s*0.46,y-s*0.17,s*0.035,0.2,Math.PI-0.2);g.stroke();if(o.collar)seg(g,[[x+s*0.28,y-s*0.24],[x+s*0.3,y-s*0.08]],s*0.035,o.collar);g.restore();return;}
  const run=p==='run',sit=p==='sit',ph=t*(run?14:0),lift=sit?0:0;const by=y-s*(sit?0.38:0.42),bx=x;
  const legs=sit?[[bx+s*0.18,by+s*0.05],[bx+s*0.26,by+s*0.05]]:[[bx-s*0.26,0],[bx-s*0.18,1],[bx+s*0.2,0],[bx+s*0.28,1]];
  if(!sit)legs.forEach(([lx,i],k)=>{const sw=run?Math.sin(ph+i*Math.PI+(k>1?1.2:0))*s*0.14:0;seg(g,[[lx,by],[lx+sw,y-s*0.03]],s*0.075,k%2?col:dark(col,0.12));});
  else{ell(g,bx-s*0.12,y-s*0.08,s*0.2,s*0.08,dark(col,0.08));legs.forEach(([lx,ly],k)=>seg(g,[[lx,ly],[lx,y-s*0.03]],s*0.07,k?col:dark(col,0.12)));}
  const wag=Math.sin(t*(run?14:7))*0.4;g.strokeStyle=col;g.lineWidth=s*0.06;g.lineCap='round';g.beginPath();g.moveTo(bx-s*0.32,by-s*0.04);
  g.quadraticCurveTo(bx-s*0.48,by-s*0.12,bx-s*0.46+Math.sin(wag)*s*0.08,by-s*0.28);g.stroke();
  if(sit){ell(g,bx-s*0.02,by-s*0.04,s*0.22,s*0.24,col,0.5);}else{ell(g,bx,by,s*0.36,s*0.16,col);ell(g,bx+s*0.02,by+s*0.06,s*0.24,s*0.07,belly);}
  const hx=bx+s*(sit?0.18:0.36),hy=by-s*(sit?0.32:0.2)+(run?Math.sin(ph)*s*0.02:0);seg(g,[[bx+s*(sit?0.06:0.24),by-s*0.05],[hx-s*0.04,hy+s*0.06]],s*0.14,col);
  if(o.collar)seg(g,[[hx-s*0.12,hy+s*0.02],[hx-s*0.06,hy+s*0.14]],s*0.04,o.collar);
  disc(g,hx,hy,s*0.15,col);ell(g,hx+s*0.15,hy+s*0.05,s*0.1,s*0.065,belly);disc(g,hx+s*0.24,hy+s*0.02,s*0.03,eye);disc(g,hx+s*0.05,hy-s*0.04,s*0.025,eye);
  ell(g,hx-s*0.08,hy+s*0.02,s*0.055,s*0.12,ear,0.35);if(o.tongue||run)ell(g,hx+s*0.16,hy+s*0.12,s*0.03,s*0.045,'#FF7EB6');g.restore();}
  // cat: кошка размером s. o: col, pose 'sit'|'walk'|'sleep', t, dir
  function cat(g,x,y,s=120,o={}){const col=o.col||'#7A7E88',t=o.t||0,p=o.pose||'sit',eye='#111318';g.save();flipX(g,x,o.dir||1);gsh(g,x,y,s*0.8);
  if(p==='sleep'){ell(g,x,y-s*0.16,s*0.36,s*0.17*(1+Math.sin(t*2)*0.03),col);disc(g,x+s*0.26,y-s*0.16,s*0.15,col);poly(g,[[x+s*0.18,y-s*0.26],[x+s*0.2,y-s*0.4],[x+s*0.3,y-s*0.29]],col);
   g.strokeStyle=col;g.lineWidth=s*0.07;g.lineCap='round';g.beginPath();g.moveTo(x-s*0.3,y-s*0.06);g.quadraticCurveTo(x,y+s*0.02,x+s*0.2,y-s*0.04);g.stroke();
   g.strokeStyle=eye;g.lineWidth=s*0.02;g.beginPath();g.arc(x+s*0.31,y-s*0.16,s*0.035,0.2,Math.PI-0.2);g.stroke();g.restore();return;}
  const tl=Math.sin(t*3)*0.2;g.strokeStyle=col;g.lineWidth=s*0.07;g.lineCap='round';g.beginPath();
  if(p==='walk'){const ph=t*9;[[-0.2,0],[-0.12,1],[0.14,0],[0.22,1]].forEach(([lx,i])=>seg(g,[[x+lx*s,y-s*0.3],[x+lx*s+Math.sin(ph+i*Math.PI)*s*0.08,y-s*0.02]],s*0.06,col));
   g.strokeStyle=col;g.lineWidth=s*0.07;g.beginPath();g.moveTo(x-s*0.26,y-s*0.36);g.quadraticCurveTo(x-s*0.42,y-s*0.5,x-s*0.36+tl*s*0.2,y-s*0.7);g.stroke();
   ell(g,x,y-s*0.36,s*0.3,s*0.12,col);var hx=x+s*0.3,hy=y-s*0.52;}
  else{g.moveTo(x-s*0.12,y-s*0.04);g.quadraticCurveTo(x-s*0.42,y,x-s*0.4+tl*s*0.15,y-s*0.3);g.stroke();ell(g,x,y-s*0.27,s*0.21,s*0.27,col);ell(g,x+s*0.04,y-s*0.2,s*0.1,s*0.16,light(col,0.25));var hx=x+s*0.04,hy=y-s*0.62;}
  disc(g,hx,hy,s*0.17,col);poly(g,[[hx-s*0.16,hy-s*0.04],[hx-s*0.13,hy-s*0.26],[hx-s*0.02,hy-s*0.14]],col);poly(g,[[hx+s*0.16,hy-s*0.04],[hx+s*0.13,hy-s*0.26],[hx+s*0.02,hy-s*0.14]],col);
  disc(g,hx-s*0.06,hy,s*0.028,'#FFD84D');disc(g,hx+s*0.07,hy,s*0.028,'#FFD84D');disc(g,hx-s*0.06,hy,s*0.013,eye);disc(g,hx+s*0.07,hy,s*0.013,eye);disc(g,hx+s*0.005,hy+s*0.06,s*0.018,'#FF7EB6');g.restore();}
  // bird: птица (чайка) размах s. o: col, tip (кончики крыльев), fly (машет), t, ph, dir
  function bird(g,x,y,s=70,o={}){const col=o.col||'#FFFFFF',tip=o.tip||'#5A5E68',t=o.t||0,fl=o.fly!==false,a=fl?Math.sin(t*9+(o.ph||0))*0.55:0;g.save();flipX(g,x,o.dir||1);
  const wing=(sd)=>{g.fillStyle=col;g.strokeStyle=tip;g.lineWidth=Math.max(1.5,s*0.04);g.lineJoin='round';g.beginPath();g.moveTo(x,y);const ex=x+sd*s*0.5,ey=y-s*0.18-a*s*0.35;
   g.quadraticCurveTo(x+sd*s*0.2,y-s*0.28-a*s*0.2,ex,ey);g.quadraticCurveTo(x+sd*s*0.25,y-s*0.05-a*s*0.1,x,y+s*0.04);g.closePath();g.fill();g.stroke();disc(g,ex-sd*s*0.03,ey+s*0.02,s*0.04,tip);};
  wing(-1);ell(g,x,y,s*0.2,s*0.08,col);g.strokeStyle=tip;g.lineWidth=Math.max(1,s*0.02);g.beginPath();g.ellipse(x,y,s*0.2,s*0.08,0,0,7);g.stroke();
  disc(g,x+s*0.2,y-s*0.04,s*0.07,col);poly(g,[[x+s*0.26,y-s*0.05],[x+s*0.36,y-s*0.02],[x+s*0.26,y-s*0.01]],'#F5A524');disc(g,x+s*0.22,y-s*0.06,s*0.015,'#111318');wing(1);g.restore();}
  // flock: стая n птиц кружит вокруг (cx,cy). o: r, s, col, seed
  function flock(g,t,cx,cy,n,o={}){const R=rng(o.seed||3),r=o.r||220;for(let i=0;i<n;i++){const a=t*0.7*(i%2?1:-1)*(0.7+R()*0.5)+i*2.4,rr_=r*(0.6+R()*0.4);
  const x=cx+Math.cos(a)*rr_,y=cy+Math.sin(a)*rr_*0.38;bird(g,x,y,(o.s||60)*(0.8+R()*0.4),{t,ph:i*1.3,col:o.col,dir:Math.sin(a)*(i%2?1:-1)>0?-1:1});}}

  // ---------- небо и природа
  // ---------- небо и природа (плоские цвета, без градиентов)
  const SKY={dawn:'#3A2A4E',morning:'#1F3058',day:'#24406E',evening:'#3B2A45',night:'#0D1424'};
  // sky: плоское небо в прямоугольнике. o: tone 'dawn'|'morning'|'day'|'evening'|'night' или col
  function sky(g,x,y,w,h,o={}){g.fillStyle=o.col||SKY[o.tone||'day']||SKY.day;g.fillRect(x,y,w,h);}
  // sun: солнце. o: col, glow (0..1), rays, t
  function sun(g,x,y,r,o={}){const col=o.col||C.amber;glow(g,x,y,r*2.8,col,o.glow==null?0.55:o.glow);
  if(o.rays){g.strokeStyle=col;g.lineWidth=r*0.12;g.lineCap='round';g.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5+(o.t||0)*0.3;g.moveTo(x+Math.cos(a)*r*1.3,y+Math.sin(a)*r*1.3);g.lineTo(x+Math.cos(a)*r*1.6,y+Math.sin(a)*r*1.6);}g.stroke();}
  disc(g,x,y,r,col);g.save();g.globalAlpha*=0.35;disc(g,x-r*0.3,y-r*0.3,r*0.35,'#FFFFFF');g.restore();}
  // moon: месяц. o: col
  function moon(g,x,y,r,o={}){const col=o.col||'#FFF1C2',k='moon'+Math.round(r)+col;let s=SPR[k];if(!s){const R=Math.round(r),[cc,xx]=cv(R*2+4,R*2+4);xx.fillStyle=col;xx.beginPath();xx.arc(R+2,R+2,R,0,7);xx.fill();
  xx.globalCompositeOperation='destination-out';xx.beginPath();xx.arc(R+2+R*0.55,R+2-R*0.3,R*0.85,0,7);xx.fill();s=SPR[k]=cc;}glow(g,x,y,r*2.2,col,0.25);g.drawImage(s,x-r-2,y-r-2);}
  // stars: звёзды в прямоугольнике, мерцают. o: n, seed, alpha, col
  function stars(g,t,x,y,w,h,o={}){const R=rng(o.seed||21),n=o.n||40,a0=o.alpha==null?1:o.alpha;g.save();g.fillStyle=o.col||'#FFFFFF';
  for(let i=0;i<n;i++){const sx=x+R()*w,sy=y+R()*h,big=R()<0.15,tw=0.55+0.45*Math.sin(t*2.5+i*1.7);g.globalAlpha=a0*tw;
  if(big){const r=3+R()*2;g.beginPath();g.moveTo(sx,sy-r*2.4);g.quadraticCurveTo(sx,sy,sx+r*2.4,sy);g.quadraticCurveTo(sx,sy,sx,sy+r*2.4);g.quadraticCurveTo(sx,sy,sx-r*2.4,sy);g.quadraticCurveTo(sx,sy,sx,sy-r*2.4);g.fill();}
  else{g.beginPath();g.arc(sx,sy,1.2+R()*1.6,0,7);g.fill();}}g.restore();}
  // cloud: облако шириной s. o: col, alpha
  function cloud(g,x,y,s=200,o={}){g.save();g.globalAlpha*=o.alpha==null?0.95:o.alpha;const c=o.col||'#C9D1E0';rr(g,x-s/2,y-s*0.16,s,s*0.22,s*0.11);g.fillStyle=c;g.fill();
  disc(g,x-s*0.18,y-s*0.14,s*0.17,c);disc(g,x+s*0.08,y-s*0.2,s*0.22,c);g.restore();}
  // sea: вода от линии y до y1 в пределах x0..x1, бегущие волны. o: col, col2 (гребни), amp
  function sea(g,t,x0,y,x1,y1,o={}){const col=o.col||'#1E3A6E',c2=o.col2||light(col,0.35),A=o.amp||8;g.fillStyle=col;g.beginPath();g.moveTo(x0,y1);
  for(let x=x0;x<=x1+20;x+=20)g.lineTo(x,y+Math.sin(x*0.03+t*2)*A*0.5);g.lineTo(x1,y1);g.closePath();g.fill();g.strokeStyle=c2;g.lineWidth=4;g.lineCap='round';
  for(let k=0;k<3;k++){const yy=y+(y1-y)*(0.2+k*0.25);g.globalAlpha=0.6-k*0.15;g.beginPath();for(let x=x0+((k*70+t*30)%140)-140;x<x1;x+=140){g.moveTo(x,yy);g.quadraticCurveTo(x+20,yy-A*0.8,x+40,yy);}g.stroke();}g.globalAlpha=1;}
  // hill: холм (полуэллипс) шириной w, высотой h. o: col
  function hill(g,x,y,w,h,o={}){g.fillStyle=o.col||'#22324F';g.beginPath();g.ellipse(x,y,w/2,h,0,Math.PI,0);g.closePath();g.fill();}

  // ---------- улица
  // lamp: фонарь высотой h. o: on 0..1, col (столб), light (цвет света)
  function lamp(g,x,y,h=300,o={}){const on=clamp(o.on||0),pc=o.col||'#55607D',lc=o.light||C.amber;gsh(g,x,y,h*0.15);g.fillStyle=pc;rr(g,x-h*0.018,y-h,h*0.036,h,h*0.018);g.fill();
  rr(g,x-h*0.05,y-h*0.06,h*0.1,h*0.06,h*0.02);g.fill();seg(g,[[x,y-h*0.98],[x+h*0.12,y-h*1.02]],h*0.025,pc);
  if(on>0)glow(g,x+h*0.14,y-h*0.94,h*0.38,lc,0.7*on);g.fillStyle=pc;rr(g,x+h*0.07,y-h*1.04,h*0.14,h*0.05,h*0.02);g.fill();
  ell(g,x+h*0.14,y-h*0.965,h*0.05,h*0.035,cmix('#7A7E88',lc,on));}
  // garland: гирлянда от (x0,y0) до (x1,y1). o: n, on 0..1 (зажигаются по очереди), sag, cols[]
  function garland(g,x0,y0,x1,y1,o={}){const n=o.n||12,on=o.on==null?1:o.on,sag=o.sag||60,cols=o.cols||[C.amber,C.deep,C.amber2,'#FF6B6B'],P=u=>[lerp(x0,x1,u),lerp(y0,y1,u)+sag*4*u*(1-u)];
  g.strokeStyle='#55607D';g.lineWidth=2.5;g.beginPath();for(let i=0;i<=20;i++){const p=P(i/20);i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]);}g.stroke();
  for(let i=0;i<n;i++){const p=P((i+0.5)/n),l=clamp(on*n-i),c=cols[i%cols.length];if(l>0)glow(g,p[0],p[1]+8,30,c,0.6*l);disc(g,p[0],p[1]+8,8,cmix('#5A5E68',c,l));}}
  // board: доска/вывеска с текстом, (x,y) центр. lines: массив строк или 'строка\nстрока'. o: kind 'chalk'|'white'|'wood', size, legs (высота ножек), n (сколько строк показать, дробное)
  function board(g,x,y,w,h,lines,o={}){const k=o.kind||'chalk',L=Array.isArray(lines)?lines:String(lines).split('\n'),bg=k==='chalk'?'#23303A':k==='wood'?'#B07A4A':'#FFFFFF',fg=o.fg||(k==='white'?C.ink:'#F6F3FF');
  if(o.legs){seg(g,[[x-w*0.3,y],[x-w*0.36,y+h/2+o.legs]],8,'#7A5236');seg(g,[[x+w*0.3,y],[x+w*0.36,y+h/2+o.legs]],8,'#7A5236');}
  g.fillStyle=k==='chalk'?'#8A5A3C':bg;rr(g,x-w/2-8,y-h/2-8,w+16,h+16,18);g.fill();g.fillStyle=bg;rr(g,x-w/2,y-h/2,w,h,12);g.fill();
  const sz=o.size||Math.min(h/(L.length*1.5),56),n=o.n==null?L.length:o.n;L.forEach((s,i)=>{const q=clamp(n-i);if(q<=0)return;g.save();g.globalAlpha*=q;
  Tr(g,s,x,y-h/2+h*(i+0.5)/L.length,sz,fg,k==='white'?700:600,'center',SANS,w*0.88);g.restore();});}


  // frame: картинка в панели-рамке инфографики. draw(g, b) рисует внутри (клип), b = {x,y,w,h}. o: sky (тон) или bg, edge (цвет рамки), p (пружина появления), r
  function frame(g, x, y, w, h, draw, o = {}) { const p = o.p == null ? 1 : o.p, b = { x, y, w, h }; if (p <= 0) return b; const r = o.r == null ? 24 : o.r; g.save(); if (p !== 1) { g.translate(x + w / 2, y + h / 2); g.scale(p, p); g.translate(-x - w / 2, -y - h / 2); }
    g.save(); rr(g, x, y, w, h, r); g.clip(); g.fillStyle = o.bg || SKY[o.sky || 'night'] || o.sky; g.fillRect(x, y, w, h); draw(g, b); g.restore(); g.strokeStyle = o.edge || C.line; g.lineWidth = 3; rr(g, x, y, w, h, r); g.stroke(); g.restore(); return b; }
  // tag: выноска-подпись к предмету: точка (x,y), линия на (dx,dy), моно-текст. o: p 0..1, col, size, dark
  function tag(g, x, y, s, o = {}) { const p = o.p == null ? 1 : cl(o.p); if (p <= 0) return; const dx = o.dx == null ? 80 : o.dx, dy = o.dy == null ? -80 : o.dy, col = o.col || (o.dark ? C.ink : C.amber); g.save(); g.globalAlpha *= p; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx * p, y + dy * p); g.lineTo(x + dx * p + (dx >= 0 ? 30 : -30), y + dy * p); g.stroke(); g.font = font(o.size || 30, 700, 'mono'); g.textAlign = dx >= 0 ? 'left' : 'right'; g.textBaseline = 'middle'; g.fillText(s, x + dx + (dx >= 0 ? 42 : -42), y + dy); g.restore(); }
  return Object.assign({}, M, { C, bg, wipe, orb, label, title, timeline, chain, stats, bars, dots, finale,
    cmix, dark, light, rgba, rng, glow, Tr, gsh, seg, disc, ell, poly, SKIN, HAIR, SHIRTS, person, crowd, winR, house, tower, shop, school, tree, grass, leaf, leaves, wheel, car, bus, bike, boat, dog, cat, bird, flock, SKY, sky, sun, moon, stars, cloud, sea, hill, lamp, garland, board, frame, tag });
})();
