// Стиль «Манифест» (MANI): видоискатель с моно-HUD, красная точка-герой, огромные узкие заглавные слова по одному на долю, резкие склейки в такт 128 BPM.
const MANI = (() => {
  // палитра снята пипеткой с оригинала
  const C = { night: '#0B0D0D', cream: '#ECE7DB', blue: '#2B28EB', red: '#ED391D', ink: '#0B0D0D', paper: '#ECE7DB',
    gray: '#8C877B', bubble: '#26252A', line: '#3A3D3D', white: '#F4F2EC',
    // тона для цветов, названных в тексте (плоские, без градиентов)
    pink: '#F39BB4', orange: '#F5841F', yellow: '#E8CF2A', green: '#2F9A55', sky: '#8CC3EC', brown: '#7A4B2A', ginger: '#D8692A', navy: '#1B1A6E' };
  const SKIN = ['#F2CBA8', '#DDA57C', '#A8714E', '#6E4630'];
  // HUD всегда «противоположного» цвета к фону
  const HUDC = { night: '#ECEEEE', cream: '#0C0B08', blue: '#D4D23A', red: '#1CB0C8' };
  const SANS = '"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif';
  const MONO = '"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace';
  const SX = 0.7;                       // сжатие для узкого плакатного шрифта
  const BPM = 128, BEAT = 60 / BPM, BAR = BEAT * 4;
  const W = 1080, H = 1920, X0 = 60, X1 = 1020;
  const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const eo = (x) => 1 - Math.pow(1 - cl(x), 3);
  const eo5 = (x) => 1 - Math.pow(1 - cl(x), 5);
  const eio = (x) => { x = cl(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const sp = (x) => (x <= 0 ? 0 : 1 - Math.exp(-7 * x) * Math.cos(10 * x));   // пружина с лёгким перелётом
  const mix = (a, b, x) => a + (b - a) * x;
  const beat = (n) => n * BEAT;
  const rng = (seed) => { let s = (seed | 0) || 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };
  const cf = (size, w = 700) => `${w} ${Math.round(size)}px ${SANS}`;
  const mf = (size, w = 400) => `${w} ${Math.round(size)}px ${MONO}`;
  function rr(g, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  // ---------- сцены, камера ----------
  function scene(t, cuts) { let i = 0; while (i < cuts.length - 1 && t >= cuts[i + 1]) i++; return { i, lt: t - cuts[i], dur: (cuts[i + 1] || 1e9) - cuts[i] }; }
  // оседание после склейки (1.035 → 1) и медленный наезд; push = добавочный наезд за сцену; cx, cy = точка наезда
  function camera(g, lt, o = {}) {
    const s = 1 + 0.035 * (1 - eo(lt / 0.3)) + (o.drift == null ? 0.012 : o.drift) * lt + (o.push || 0);
    const cx = o.cx || 540, cy = o.cy || 900; g.translate(cx, cy); g.scale(s, s); g.translate(-cx, -cy);
  }

  // ---------- фон и зерно ----------
  let GR = null;
  function grainTex() {
    GR = new OffscreenCanvas(360, 640); const c = GR.getContext('2d'); const r = rng(11);
    for (let i = 0; i < 26000; i++) { const v = r(); c.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)'; c.fillRect((r() * 360) | 0, (r() * 640) | 0, 1, 1); }
  }
  // theme: 'night' | 'cream' | 'blue' | 'red'
  let CUR = 'night';
  function bg(g, t, theme = 'night') {
    CUR = theme; g.fillStyle = C[theme] || theme; g.fillRect(0, 0, W, H);
    if (!GR) grainTex();
    const f = Math.floor(t * 30) % 5; g.save(); g.globalAlpha = theme === 'night' ? 0.10 : 0.13;
    g.drawImage(GR, -(f * 7) % 20, -(f * 11) % 20, W * 1.02 + 20, H * 1.02 + 20); g.restore();
  }
  // белая вспышка-удар (ломка, взрыв)
  function flash(g, t, t0, d = 0.3, a = 0.62) { const p = (t - t0) / d; if (p < 0 || p > 1) return; g.save(); g.globalAlpha = a * (1 - eo(p)); g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H); g.restore(); }

  // ---------- HUD видоискателя ----------
  // o: {a, brand, total (тактов), rec}
  function hud(g, t, theme = 'night', o = {}) {
    const col = HUDC[theme] || theme, a = o.a == null ? 1 : o.a; if (a <= 0) return;
    g.save(); g.globalAlpha = a; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 3;
    const L = 40, x0 = 36, x1 = 1044, y0 = 104, y1 = 1694;
    g.beginPath(); g.moveTo(x0, y0 + L); g.lineTo(x0, y0); g.lineTo(x0 + L, y0); g.moveTo(x1 - L, y0); g.lineTo(x1, y0); g.lineTo(x1, y0 + L);
    g.moveTo(x0, y1 - L); g.lineTo(x0, y1); g.lineTo(x0 + L, y1); g.moveTo(x1 - L, y1); g.lineTo(x1, y1); g.lineTo(x1, y1 - L); g.stroke();
    g.font = mf(24); g.textBaseline = 'middle';
    const bt = Math.floor(t / BEAT), bar = Math.floor(t / BAR) + 1, total = o.total || 11;
    // REC мигает по долям
    g.save(); g.globalAlpha = a * (bt % 2 ? 0.35 : 1); g.beginPath(); g.arc(92, 146, 8, 0, 7); g.fill(); g.restore();
    g.textAlign = 'left'; g.fillText(o.rec || 'ЗАП', 110, 147); if (o.brand) g.fillText(o.brand, 186, 147);
    // такт и 4 квадрата долей
    const sq = 18, gap = 7, sx = 1000 - 4 * sq - 3 * gap;
    for (let j = 0; j < 4; j++) { const x = sx + j * (sq + gap); g.lineWidth = 2; if (j === bt % 4) g.fillRect(x, 137, sq, sq); else g.strokeRect(x + 1, 138, sq - 2, sq - 2); }
    g.textAlign = 'right'; g.fillText(`ТАКТ ${String(bar).padStart(2, '0')}/${String(total).padStart(2, '0')} · ${BPM}`, sx - 16, 147);
    const fr = Math.floor(t * 30), ss = Math.floor(t), ff = fr % 30;
    g.textAlign = 'left'; g.fillText('К' + String(fr).padStart(4, '0'), 92, 1652);
    g.textAlign = 'right'; g.fillText(`00:00:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`, 1000, 1652);
    g.restore();
  }

  // ---------- типографика ----------
  // ширина узкой строки
  function cw(g, txt, size, w = 700) { g.font = cf(size, w); return g.measureText(txt).width * SX; }
  // размер, при котором все строки влезают в maxW
  function fit(g, rows, size, maxW = 940, w = 700) { let s = size; rows.forEach((r) => { const ww = cw(g, r, s, w); if (ww > maxW) s = s * maxW / ww; }); return Math.floor(s); }
  // УДАР СЛОВА: огромное узкое слово. Входит за 3 кадра с размытием (призраки) и лёгким сжатием 1.12 → 1, уходит резко (o.t1).
  // y = базовая линия. o: {t1, align, max, w, a}. Возвращает ширину.
  function word(g, txt, x, y, size, t, t0, col, o = {}) {
    if (t < t0 || (o.t1 != null && t >= o.t1)) return 0;
    const align = o.align || 'center';
    const room = align === 'center' ? 2 * Math.min(x - X0, X1 - x) : (align === 'left' ? X1 - x : x - X0);
    const ww = cw(g, txt, size, o.w || 700), k = Math.min(1, Math.min(o.max || 960, room) / ww);
    const p = cl((t - t0) / 0.1), s = k * (1 + 0.12 * (1 - eo(p)));
    g.save(); g.fillStyle = col; g.textAlign = align; g.textBaseline = 'alphabetic'; const A = (o.a == null ? 1 : o.a);
    const yc = y - size * 0.36;
    const one = (sc, al) => { g.save(); g.globalAlpha = A * al; g.translate(x, yc); g.scale(sc * SX, sc); g.fillText(txt, 0, size * 0.36); g.restore(); };
    if (p < 1) { const b = 0.035 * (1 - p); one(s * (1 + b), 0.35); one(s * (1 - b), 0.35); one(s, 0.3 + 0.7 * p); }
    else one(s, 1);
    g.restore(); return ww * k;
  }
  // несколько строк одним размером (подогнан под ширину), каждая со своим временем: rows [[txt, col, t0], ...]; cy = центр блока
  function lines(g, rows, cx, cy, size, t, o = {}) {
    const s = fit(g, rows.map((r) => r[0]), size, o.max || 940), lh = s * (o.lh || 0.98), h0 = cy - (rows.length - 1) * lh / 2 + s * 0.36;
    rows.forEach(([txt, col, t0], j) => word(g, txt, cx, h0 + j * lh, s, t, t0, col, { t1: o.t1, align: o.align }));
    return s;
  }
  // моно-подпись (HUD-метка); o: {align, a, w}
  function mono(g, txt, x, y, size, col, o = {}) { g.save(); g.globalAlpha *= (o.a == null ? 1 : o.a); g.font = mf(size, o.w || 400); g.fillStyle = col; g.textAlign = o.align || 'center'; g.textBaseline = 'middle'; g.fillText(txt, x, y); g.restore(); }
  // печать моно-текста по буквам с курсором; цветная хвостовая часть: parts [[txt, col], ...]
  function typed(g, parts, x, y, size, t, t0, o = {}) {
    const cps = o.cps || 28; let n = Math.floor((t - t0) * cps); if (n <= 0) return;
    g.save(); g.font = mf(size, o.w || 400); g.textBaseline = 'middle';
    const full = parts.map((p) => p[0]).join(''); const tw = g.measureText(full).width;
    let xx = o.align === 'left' ? x : x - tw / 2;
    for (const [s, col] of parts) { const v = s.slice(0, Math.max(0, n)); n -= s.length; g.fillStyle = col; g.textAlign = 'left'; g.fillText(v, xx, y); xx += g.measureText(v).width; if (n < 0) break; }
    if (n < 0 || (t - t0) * 2 % 1 < 0.5) { g.fillStyle = parts[parts.length - 1][1]; g.fillRect(xx + 3, y - size * 0.4, size * 0.5, size * 0.8); }
    g.restore();
  }
  // текст разрядкой (слоган): track в долях кегля
  function spaced(g, txt, x, y, size, col, o = {}) {
    g.save(); g.font = `${o.w || 700} ${size}px ${o.mono ? MONO : SANS}`; g.fillStyle = col; g.textBaseline = 'middle'; g.textAlign = 'left';
    const tr = size * (o.track == null ? 0.32 : o.track); const ws = [...txt].map((ch) => g.measureText(ch).width);
    let tot = ws.reduce((a, b) => a + b, 0) + tr * (ws.length - 1); const k = Math.min(1, (o.max || 940) / tot);
    g.translate(x, y); g.scale(k, k); let xx = o.align === 'left' ? 0 : -tot / 2;
    [...txt].forEach((ch, j) => { g.fillText(ch, xx, 0); xx += ws[j] + tr; }); g.restore(); return tot * k;
  }
  // счётчик: моно-подпись над огромной узкой цифрой. Числа с пробелами по разрядам
  const fmt = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  function counter(g, label, value, x, y, size, col, o = {}) {
    mono(g, label, x, y - size * 0.95, Math.max(26, size * 0.2), o.labelCol || col, { a: 0.85 });
    g.save(); g.font = cf(size, 700); g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    const s = typeof value === 'number' ? fmt(value) : value; const ww = g.measureText(s).width * SX, k = Math.min(1, 900 / ww);
    g.translate(x, y); g.scale(SX * k, k); g.fillText(s, 0, 0); g.restore();
  }

  // ---------- герой: красная точка ----------
  function dot(g, x, y, r, col = C.red) { if (r <= 0) return; g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  // перекрестие прицела, растёт от центра (p 0..1); подпись с выноской
  function crosshair(g, cx, cy, p, o = {}) {
    if (p <= 0) return; const L = (o.len || 430) * eo(p); g.save(); g.globalAlpha *= o.a == null ? 1 : o.a;
    g.strokeStyle = o.col || C.line; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - L, cy); g.lineTo(cx + L, cy); g.moveTo(cx, cy - L); g.lineTo(cx, cy + L); g.stroke(); g.restore();
  }
  // тонкая выноска от объекта к подписи
  function leader(g, x0, y0, x1, y1, p, col) { if (p <= 0) return; g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(mix(x0, x1, eo(p)), mix(y0, y1, eo(p))); g.stroke(); }

  // ---------- клетка ----------
  // S = сторона. o: {sq0 (начало обводки квадрата), bars [моменты прутьев], n, bend 0..1, col, lw, ring 0..1, shake}
  function cage(g, cx, cy, S, t, o = {}) {
    const col = o.col || C.cream, lw = o.lw || 9, h = S / 2;
    g.save(); g.translate(cx, cy); g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'miter'; g.lineCap = 'butt';
    if (o.shake) { const k = o.shake; g.translate(Math.sin(t * 91) * 5 * k, Math.cos(t * 77) * 4 * k); }
    // обводка квадрата по часовой от левого верхнего угла
    const sq0 = o.sq0 == null ? -9 : o.sq0, pq = eo((t - sq0) / 0.38);
    if (pq > 0) {
      const P = [[-h, -h], [h, -h], [h, h], [-h, h], [-h, -h]]; let left = pq * 4; g.beginPath(); g.moveTo(-h, -h);
      for (let j = 0; j < 4 && left > 0; j++) { const f = Math.min(1, left); g.lineTo(mix(P[j][0], P[j + 1][0], f), mix(P[j][1], P[j + 1][1], f)); left -= 1; }
      if (pq >= 1) g.closePath(); g.stroke();
    }
    if (o.ring) { g.save(); g.globalAlpha *= 0.35 * o.ring; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, S * 0.43, 0, 7); g.stroke(); g.restore(); }
    const n = o.n || 5, bars = o.bars || [], bend = o.bend || 0;
    for (let j = 0; j < n; j++) {
      const tb = bars[j] == null ? -9 : bars[j], p = (t - tb) / 0.2; if (p <= 0) continue;
      const x = -h + S * (j + 1) / (n + 1), q = eo(p), yb = mix(-h - S * 0.28, h, q), yt = mix(-h - S * 0.42, -h, eo5(p * 0.8));
      const off = bend * S * 0.16 * (x / h);
      g.beginPath(); g.moveTo(x, yt); if (bend && q >= 1) g.quadraticCurveTo(x + off * 2, 0, x, yb); else g.lineTo(x, yb); g.stroke();
    }
    g.restore();
  }
  // осколки прутьев разлетаются из клетки: o {n, col, d, seed}
  function shards(g, cx, cy, S, t, t0, o = {}) {
    const p = (t - t0) / (o.d || 0.55); if (p < 0 || p > 1) return; const r = rng(o.seed || 5), n = o.n || 38;
    g.save(); g.strokeStyle = o.col || C.cream; g.lineWidth = 7; g.lineCap = 'butt'; g.globalAlpha *= 0.75 * (1 - p * p);
    for (let j = 0; j < n; j++) {
      const sx = (r() - 0.5) * S, sy = (r() - 0.5) * S, a = Math.atan2(sy, sx) + (r() - 0.5) * 0.6, dist = S * (0.5 + r() * 1.1), L = S * (0.1 + r() * 0.08);
      const e = eo5(p), x = cx + sx + Math.cos(a) * dist * e, y = cy + sy + Math.sin(a) * dist * e, rot = r() * 6.28 + (r() - 0.5) * 6 * e;
      g.beginPath(); g.moveTo(x - Math.cos(rot) * L / 2, y - Math.sin(rot) * L / 2); g.lineTo(x + Math.cos(rot) * L / 2, y + Math.sin(rot) * L / 2); g.stroke();
    }
    g.restore();
  }

  // ---------- деление точки и облако ----------
  // times: моменты удвоений. Возвращает текущее число точек. o {r, rot, col}
  function split(g, cx, cy, t, times, o = {}) {
    let k = 0; while (k < times.length && t >= times[k]) k++; const n = 1 << k;
    const pp = k ? sp((t - times[k - 1]) / 0.22) : 1, rot = (o.rot == null ? 0.5 : o.rot) * t;
    const dr = (m) => (o.r || 30) * Math.pow(m, -0.17), pos = (i, m) => { const a = i * 2.39996 + rot, rad = dr(m) * 2.7 * Math.sqrt(i + 0.35) * (m > 1 ? 1 : 0); return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]; };
    const r = mix(dr(Math.max(1, n / 2)), dr(n), cl(pp));
    g.fillStyle = o.col || C.red;
    for (let i = 0; i < n; i++) {
      const [x1, y1] = pos(i, n), [x0, y0] = pos(i < n / 2 ? i : i - n / 2, Math.max(1, n / 2));
      g.beginPath(); g.arc(mix(x0, x1, pp), mix(y0, y1, pp), r, 0, 7); g.fill();
    }
    return n;
  }
  let CL = null;
  function cloudTex() {
    CL = new OffscreenCanvas(1500, 1500); const c = CL.getContext('2d');
    for (let i = 30; i < 2500; i++) { const a = i * 2.39996, rad = 15 * Math.sqrt(i); if (rad > 745) break; const x = 750 + Math.cos(a) * rad, y = 750 + Math.sin(a) * rad;
      c.fillStyle = C.gray; c.beginPath(); c.arc(x, y, 5.2, 0, 7); c.fill(); }
  }
  // облако из тысяч точек расходится из центра (p 0..1), в центре гаснут красные
  function cloud(g, cx, cy, p, t, o = {}) {
    if (p <= 0) return; if (!CL) cloudTex(); const s = mix(0.3, o.scale || 1.75, eo(p)), sz = 1500 * s;
    g.save(); g.globalAlpha *= cl(p * 3) * (o.a || 1);
    // рисуем только видимую часть текстуры (без поворота: дешевле на телефоне)
    const dx = cx - sz / 2, dy = cy - sz / 2, k = 1500 / sz, ax = Math.max(0, dx), ay = Math.max(0, dy), bx = Math.min(W, dx + sz), by = Math.min(H, dy + sz);
    if (bx > ax && by > ay) g.drawImage(CL, (ax - dx) * k, (ay - dy) * k, (bx - ax) * k, (by - ay) * k, ax, ay, bx - ax, by - ay); g.restore();
    if (o.red !== false) { g.save(); g.globalAlpha *= 0.55 * (1 - eo(p * 1.4)); for (let i = 0; i < 40; i++) { const a = i * 2.39996, rad = 26 * Math.sqrt(i) * mix(1, 2.2, eo(p)); dot(g, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, 9, C.red); } g.restore(); }
  }

  // ---------- чат ----------
  // пузырь: side 'r' (справа, кремовый) или 'l' (слева, тёмно-серый); x = край пузыря. Входит пружиной. Возвращает высоту.
  function bubble(g, txt, x, y, side, t, t0, o = {}) {
    const p = (t - t0) / 0.28; if (p <= 0) return 0; const size = o.size || 50, mx = o.max || 760;
    g.save(); g.font = `400 ${size}px ${SANS}`;
    const words = txt.split(' '), ls = []; let cur = '';
    words.forEach((w) => { const tt = cur ? cur + ' ' + w : w; if (g.measureText(tt).width > mx - 80 && cur) { ls.push(cur); cur = w; } else cur = tt; }); ls.push(cur);
    const tw = Math.max(...ls.map((l) => g.measureText(l).width)), bw = tw + 84, bh = ls.length * size * 1.25 + 56;
    const bx = side === 'r' ? x - bw : x, s = mix(0.86, 1, sp(p));
    g.globalAlpha *= eo(p * 2); g.translate(bx + (side === 'r' ? bw : 0), y + bh / 2); g.scale(s, s); g.translate(-(bx + (side === 'r' ? bw : 0)), -(y + bh / 2));
    g.fillStyle = side === 'r' ? C.cream : C.bubble; rr(g, bx, y, bw, bh, 34); g.fill();
    g.fillStyle = side === 'r' ? C.night : C.cream; g.textAlign = 'left'; g.textBaseline = 'middle';
    ls.forEach((l, j) => g.fillText(l, bx + 42, y + 28 + size * 0.62 + j * size * 1.25)); g.restore(); return bh;
  }
  // три точки «печатает»
  function typing(g, x, y, t, t0, t1) { if (t < t0 || t >= t1) return; g.fillStyle = C.bubble; rr(g, x, y, 130, 70, 35); g.fill();
    for (let j = 0; j < 3; j++) { const b = Math.max(0, Math.sin((t - t0) * 12 - j * 0.9)); g.fillStyle = '#8A8890'; g.beginPath(); g.arc(x + 37 + j * 28, y + 35 - b * 7, 8, 0, 7); g.fill(); } }

  // ---------- штампы ----------
  // красный штамп в рамке: слово узким жирным, рамка-контур. Падает с 1.6 до 1 за 4 кадра. Сам не выходит за x 40…1040.
  function stamp(g, txt, x, y, ang, size, t, t0, o = {}) {
    const p = (t - t0) / 0.13; if (p <= 0) return; const col = o.col || C.red;
    const tw = cw(g, txt, size, 700), bw = tw + size * 0.8, bh = size * 1.2, lw = Math.max(5, size * 0.085);
    const hw = Math.abs(Math.cos(ang)) * bw / 2 + Math.abs(Math.sin(ang)) * bh / 2; x = cl(x, 40 + hw, 1040 - hw);
    const s = 1 + 0.6 * (1 - eo(p));
    g.save(); g.globalAlpha *= eo(p) * (o.a == null ? 1 : o.a); g.translate(x, y); g.rotate(ang); g.scale(s, s);
    g.strokeStyle = col; g.lineWidth = lw; g.strokeRect(-bw / 2, -bh / 2, bw, bh);
    g.fillStyle = col; g.font = cf(size, 700); g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.scale(SX, 1); g.fillText(txt, 0, size * 0.36); g.restore();
  }
  // куча штампов: list [[txt, x, y, ang, size], ...], каждый следующий через step
  function pile(g, list, t, t0, step = 0.09, o = {}) { list.forEach((s, j) => stamp(g, s[0], s[1], s[2], s[3], s[4], t, t0 + j * step, o)); }

  // ---------- красное поле-созвездие ----------
  let NET = null;
  function netBuild() {
    const r = rng(23), cols = 6, rows = 11, N = [], E = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) N.push({ x: 70 + i * 188 + (r() - 0.5) * 110, y: 150 + j * 150 + (r() - 0.5) * 100, r: 6 + r() * 5, ph: r() * 6.28 });
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = j * cols + i;
      if (i < cols - 1 && r() < 0.72) E.push([a, a + 1]); if (j < rows - 1 && r() < 0.72) E.push([a, a + cols]);
      if (i < cols - 1 && j < rows - 1 && r() < 0.35) E.push(r() < 0.5 ? [a, a + cols + 1] : [a + 1, a + cols]); }
    NET = { N, E };
  }
  // сеть линий и узлов: растёт от центра за ~0.5 с, узлы дышат; col = цвет
  function network(g, t, t0, o = {}) {
    if (!NET) netBuild(); const lt = t - t0; if (lt <= 0) return; const col = o.col || C.night, P = NET.N.map((n) => [n.x + Math.sin(t * 0.9 + n.ph) * 7, n.y + Math.cos(t * 0.7 + n.ph) * 7]);
    const vis = (x, y) => cl((lt - Math.hypot(x - 540, y - 900) / 2400) / 0.25);
    g.save(); g.strokeStyle = col; g.lineWidth = 2.2; g.globalAlpha = 0.6; g.beginPath();
    NET.E.forEach(([a, b]) => { const v = vis(P[a][0], P[a][1]); if (v <= 0) return; g.moveTo(P[a][0], P[a][1]); g.lineTo(mix(P[a][0], P[b][0], v), mix(P[a][1], P[b][1], v)); }); g.stroke();
    g.globalAlpha = 1; g.fillStyle = col; NET.N.forEach((n, j) => { const v = vis(P[j][0], P[j][1]); if (v <= 0) return; g.beginPath(); g.arc(P[j][0], P[j][1], n.r * eo(v * 2), 0, 7); g.fill(); });
    g.restore();
  }

  // ---------- замок ----------
  // s = ширина корпуса; open 0..1 (дужка поднимается и поворачивается); o {dot: рисовать точку-скважину, rot, col}. Возвращает [x, y] скважины.
  function lock(g, cx, cy, s, open, o = {}) {
    const col = o.col || C.night, bh = s * 0.8, lw = s * 0.15, lx = s * 0.29, top = cy - bh / 2;
    g.save(); g.translate(cx, cy); g.rotate(o.rot || 0); g.translate(-cx, -cy);
    g.save(); g.translate(cx + lx, top - open * s * 0.2); g.rotate(-0.42 * open); g.translate(-(cx + lx), -top);
    g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'butt'; g.beginPath(); g.moveTo(cx - lx, top + lw); g.lineTo(cx - lx, top - s * 0.24); g.arc(cx, top - s * 0.24, lx, Math.PI, 0); g.lineTo(cx + lx, top + lw); g.stroke(); g.restore();
    g.fillStyle = col; rr(g, cx - s / 2, top, s, bh, s * 0.1); g.fill();
    g.fillStyle = '#3A3A3A'; rr(g, cx - s * 0.03, cy + s * 0.04, s * 0.06, s * 0.16, s * 0.03); g.fill();
    const kx = cx, ky = cy - s * 0.06; if (o.dot !== false) dot(g, kx, ky, s * 0.075);
    g.restore(); return [kx, ky];
  }

  // ---------- финал: знак, имя, слоган ----------
  // знак: кольцо с разрывом вокруг красной точки (клетка открыта). p 0..1 обводка
  function mark(g, cx, cy, r, p, o = {}) {
    if (p > 0) { g.save(); g.strokeStyle = o.col || C.night; g.lineWidth = r * 0.17; g.lineCap = 'round'; const a0 = -Math.PI / 2 + 0.75; g.beginPath(); g.arc(cx, cy, r, a0, a0 + (Math.PI * 2 - 1.1) * eo(p)); g.stroke(); g.restore(); }
    if (o.dot !== false) dot(g, cx, cy, r * 0.32);
  }
  // логотип целиком: знак, имя (шторка слева), слоган разрядкой, моно-строка. cy = центр имени
  function logo(g, name, slogan, sub, cx, cy, t, t0, o = {}) {
    const col = o.col || C.night; mark(g, cx, cy - 250, 100, (t - t0) / 0.5, { col, dot: o.dot });
    const pw = eo((t - t0 - 0.25) / 0.5); if (pw > 0) { g.save(); g.font = `600 ${o.size || 170}px ${SANS}`; const w = g.measureText(name).width, k = Math.min(1, 900 / w);
      g.beginPath(); g.rect(cx - w * k / 2 - 10, cy - 200, (w * k + 20) * pw, 300); g.clip(); g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.translate(cx, cy + 50); g.scale(k, k); g.fillText(name, 0, 0); g.restore(); }
    const ps = eo((t - t0 - 0.7) / 0.4); if (ps > 0) { g.save(); g.globalAlpha *= ps; (Array.isArray(slogan) ? slogan : [slogan]).forEach((s, j) => spaced(g, s, cx, cy + 165 + j * 70, 46, col, { w: 700, track: 0.3 })); g.restore(); }
    const pm = eo((t - t0 - 1.0) / 0.4); if (pm > 0 && sub) { g.save(); g.globalAlpha *= pm * 0.75; mono(g, sub, cx, cy + 330, 30, col); g.restore(); }
  }

  // ---------- ТИПОВЫЕ ОБЪЕКТЫ: плоские пиктограммы ----------
  // Цвет по умолчанию = «чернила» к текущему фону (bg() запоминает фон): на тёмном и синем кремовый, на кремовом и красном чёрный.
  // cut = цвет фона: окна, вырезы и кромка, по которой соседние фигуры не сливаются. Все объекты стоят на точке земли y.
  const FG = { night: C.cream, cream: C.ink, blue: C.cream, red: C.ink };
  const fg = (th) => FG[th || CUR] || C.ink;
  const bgc = (th) => C[th || CUR] || th || CUR;
  const ang = (x, y, a, l) => [x + Math.sin(a) * l, y + Math.cos(a) * l];
  // колено/локоть по двум длинам (dir 1 вперёд, -1 назад)
  function ik(ax, ay, bx, by, l1, l2, dir) {
    const dx = bx - ax, dy = by - ay, d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01), a = Math.atan2(dy, dx);
    const c = cl((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1), b = a - dir * Math.acos(c); return [ax + Math.cos(b) * l1, ay + Math.sin(b) * l1];
  }
  // список фигур: ['c',x,y,r,col] ['l',[x,y,...],lw,col] ['r',x,y,w,h,rad,col] ['p',[x,y,...],col] ['s',x,y,r,a0,a1,col]; halo = кромка цвета cut
  function prims(g, L, halo, cut) {
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let pass = halo > 0 ? 0 : 1; pass < 2; pass++) {
      const e = pass ? 0 : halo;
      for (const q of L) {
        const col = pass ? q[q.length - 1] : cut; if (!col) continue; g.fillStyle = col; g.strokeStyle = col;
        const k = q[0];
        if (k === 'c') { g.beginPath(); g.arc(q[1], q[2], q[3] + e, 0, 7); g.fill(); }
        else if (k === 'l') { const p = q[1]; g.lineWidth = q[2] + 2 * e; g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.stroke(); }
        else if (k === 'r') { rr(g, q[1] - e, q[2] - e, q[3] + 2 * e, q[4] + 2 * e, q[5] + e); g.fill(); }
        else if (k === 'p' || k === 's') { g.beginPath(); if (k === 's') g.arc(q[1], q[2], q[3], q[4], q[5]); else { const p = q[1]; g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); }
          g.closePath(); g.fill(); if (e) { g.lineWidth = 2 * e; g.stroke(); } }
      }
    }
  }
  // пропорции в долях роста (рост = 100)
  const AGE = { adult: { h: 300, hr: 8.5, hy: -91, sy: -78, py: -46, tw: 22, ll: 8, al: 6.5, arm: 33 },
    child: { h: 190, hr: 12, hy: -86, sy: -71, py: -42, tw: 25, ll: 10, al: 8, arm: 29 },
    old: { h: 285, hr: 8.5, hy: -89, sy: -77, py: -46, tw: 23, ll: 8, al: 6.5, arm: 32 } };
  // ЧЕЛОВЕК. x,y = точка между ступнями (для pose 'ride' = седло). Смотрит вправо, flip влево.
  // o: {h, age:'adult'|'child'|'old', pose:'stand'|'walk'|'run'|'wave'|'hold'|'sit'|'dance'|'ride', t, phase, flip,
  //     body (одежда), legs, skin, hair (цвет), hairStyle:'short'|'long'|'bun'|'none', skirt, hat:'helmet'|'cap'|'kerchief', hatCol,
  //     backpack (цвет), item:'book'|'bag'|'box'|'flag'|'phone'|fn(g,x,y,u), itemCol, cane, seat (false = без скамьи), halo, cut}
  // Возвращает {head:[x,y], hand:[x,y]}.
  function person(g, x, y, o = {}) {
    const age = AGE[o.age] ? o.age : 'adult', A = AGE[age], h = o.h || A.h, u = h / 100, f = o.flip ? -1 : 1, t = o.t || 0;
    const pose = o.pose || 'stand', F = fg(), cut = o.cut || bgc(), body = o.body || o.col || F, legs = o.legs || F, skin = o.skin || F;
    const hairC = o.hair || (age === 'old' ? C.gray : null), hs = o.hairStyle || (hairC ? (age === 'old' ? 'bun' : 'short') : 'none');
    const ph = (o.phase || 0) + t * (pose === 'run' ? 11 : pose === 'dance' ? 6 : 7), sn = Math.sin(ph);
    const L = [], ll = -A.py, half = ll / 2 + 0.5;
    let hip = [0, A.py], sh = [age === 'old' ? 4 : 0, A.sy], aF = 0.16, aB = -0.16, lF = 0.05, lB = -0.05, knees = null;
    if (pose === 'walk') { lF = 0.36 * sn; lB = -lF; aF = -0.42 * sn; aB = -aF; }
    if (pose === 'run') { lF = 0.62 * sn; lB = -lF; aF = -0.9 * sn; aB = -aF; sh[0] += 7; }
    if (pose === 'wave') { aF = Math.PI - 0.45 + 0.32 * Math.sin(t * 9); }
    if (pose === 'hold') aF = 1.2;
    if (pose === 'dance') { const b = Math.abs(Math.sin(ph)) * 3; hip[1] += b; sh[1] += b; sh[0] += 3 * Math.sin(ph); aF = Math.PI - 0.55 + 0.4 * Math.sin(ph); aB = -(Math.PI - 0.55) + 0.4 * Math.sin(ph + 1.3); lF = 0.28 * Math.sin(ph); lB = -0.18 + 0.12 * Math.cos(ph); }
    if (pose === 'sit') { hip = [0, -27]; sh = [age === 'old' ? 3 : 0, -27 + (A.sy - A.py)]; aF = o.item ? 1.25 : 0.95; aB = 0.3; }
    if (pose === 'ride') { hip = [0, -2]; sh = [14, -2 + (A.sy - A.py) + 3]; }
    const hd = [sh[0] + (age === 'old' ? 4 : 0) + (pose === 'ride' ? 4 : 0), sh[1] + (A.hy - A.sy)];
    const toL = (X, Y) => [(X - x) / (f * u), (Y - y) / u];
    // ноги
    let fF, fB;
    if (pose === 'sit') { fF = [21, 0]; fB = [17, 0]; knees = [[22, -27], [18, -27]]; }
    else if (pose === 'ride' && o.ride) { fF = toL(...o.ride.pedals[0]); fB = toL(...o.ride.pedals[1]); knees = [ik(hip[0], hip[1], fF[0], fF[1], half, half, -1), ik(hip[0], hip[1], fB[0], fB[1], half, half, -1)]; }
    else { fF = ang(hip[0] + 3, hip[1], lF, ll); fB = ang(hip[0] - 3, hip[1], lB, ll); }
    // сиденье
    if (pose === 'sit' && o.seat !== false) L.push(['r', -17, -27 + A.ll / 2, 30, 27 - A.ll / 2, 1.5, o.seatCol || F]);
    if (hs === 'long') L.push(['r', hd[0] - A.hr - 1.5, hd[1] - 2, 2 * A.hr + 1, sh[1] + 12 - hd[1], 3, hairC]);
    if (o.backpack) L.push(['r', sh[0] - A.tw / 2 - 9, sh[1] + 2, 13, 26, 3.5, o.backpack]);
    const leg = (ft, kn) => L.push(['l', kn ? [hip[0], hip[1], kn[0], kn[1], ft[0], ft[1]] : [hip[0], hip[1], ft[0], ft[1]], A.ll, legs]);
    leg(fB, knees && knees[1]);
    // рука сзади
    const ax = A.tw * 0.28, armB = ang(sh[0] - ax, sh[1] + 4, aB, A.arm);
    if (pose !== 'ride') L.push(['l', [sh[0] - ax, sh[1] + 4, armB[0], armB[1]], A.al, body]);
    // корпус-капсула, юбка
    const r2 = A.tw / 2;
    L.push(['l', [hip[0], hip[1] - r2 + 3, sh[0], sh[1] + r2 - 2], A.tw, body]);
    if (o.skirt) L.push(['p', [hip[0] - r2 + 1, hip[1] - 10, hip[0] + r2 - 1, hip[1] - 10, hip[0] + r2 + 6, hip[1] + 13, hip[0] - r2 - 6, hip[1] + 13], o.skirt === true ? body : o.skirt]);
    leg(fF, knees && knees[0]);
    // голова, волосы, шапка
    L.push(['c', hd[0], hd[1], A.hr, skin]);
    if (hs === 'short' || hs === 'bun' || hs === 'long') L.push(['s', hd[0], hd[1] - 0.5, A.hr + 1, Math.PI * 1.02, Math.PI * 2.1, hairC]);
    if (hs === 'bun') L.push(['c', hd[0] - A.hr * 0.75, hd[1] - A.hr * 0.75, A.hr * 0.45, hairC]);
    if (o.hat === 'helmet') { L.push(['s', hd[0], hd[1] - 1, A.hr + 2, Math.PI, Math.PI * 2, o.hatCol || C.yellow]); L.push(['l', [hd[0] - A.hr - 3, hd[1] - 1, hd[0] + A.hr + 4, hd[1] - 1], 2.4, o.hatCol || C.yellow]); }
    if (o.hat === 'cap') { L.push(['s', hd[0], hd[1] - 1, A.hr + 1, Math.PI, Math.PI * 2, o.hatCol || C.red]); L.push(['l', [hd[0], hd[1] - 1.5, hd[0] + A.hr + 6, hd[1] - 1.5], 2.6, o.hatCol || C.red]); }
    if (o.hat === 'kerchief') L.push(['p', [hd[0] - A.hr - 1.5, hd[1] + 3, hd[0] - A.hr * 0.6, hd[1] - A.hr - 1, hd[0] + A.hr * 0.5, hd[1] - A.hr - 1.5, hd[0] + A.hr + 1, hd[1] - 1, hd[0] - A.hr * 0.2, hd[1] + A.hr * 0.3], o.hatCol || C.red]);
    // рука спереди
    let hand;
    if (pose === 'ride' && o.ride) { const gp = toL(...o.ride.grip), el = ik(sh[0], sh[1] + 4, gp[0], gp[1], A.arm / 2, A.arm / 2, 1); hand = gp; L.push(['l', [sh[0], sh[1] + 4, el[0], el[1], gp[0], gp[1]], A.al, body]); }
    else { hand = ang(sh[0] + ax, sh[1] + 4, aF, A.arm); L.push(['l', [sh[0] + ax, sh[1] + 4, hand[0], hand[1]], A.al, body]); }
    if (o.cane) L.push(['l', [hand[0], hand[1], hand[0] + 4, 0], 2.2, o.caneCol || F]);
    const ic = o.itemCol || C.red, it = o.item;
    if (it === 'book') { L.push(['p', [hand[0] - 3, hand[1] - 4, hand[0] + 8, hand[1] - 9, hand[0] + 19, hand[1] - 4, hand[0] + 19, hand[1] + 6, hand[0] + 8, hand[1] + 1, hand[0] - 3, hand[1] + 6], ic]); }
    if (it === 'bag') { L.push(['l', [hand[0], hand[1], hand[0], hand[1] + 6], 1.6, ic]); L.push(['r', hand[0] - 7, hand[1] + 5, 14, 14, 2, ic]); }
    if (it === 'box') L.push(['r', hand[0] - 3, hand[1] - 13, 19, 15, 1, ic]);
    if (it === 'phone') L.push(['r', hand[0] - 2, hand[1] - 10, 6, 11, 1.2, ic]);
    if (it === 'flag') { L.push(['l', [hand[0], hand[1] + 4, hand[0], hand[1] - 34], 1.6, F]); L.push(['r', hand[0], hand[1] - 34, 20, 13, 0.5, ic]); }
    g.save(); g.translate(x, y); g.scale(f * u, u); prims(g, L, o.halo === 0 ? 0 : (o.halo || 5) / u, cut); g.restore();
    const abs = (p) => [x + f * u * p[0], y + u * p[1]], H = abs(hand);
    if (typeof it === 'function') it(g, H[0], H[1], u);
    return { head: abs(hd), hand: H };
  }
  // ряд людей, не сливаются: list = [опции person, ...], центр x
  function crowd(g, x, y, list, o = {}) { const gap = o.gap || (o.h || 300) * 0.42; list.forEach((p, j) => person(g, x + (j - (list.length - 1) / 2) * gap, y, Object.assign({ h: o.h, t: o.t, phase: j * 1.7 }, p))); }

  // ЗДАНИЕ. x = центр, y = земля. o: {kind:'house'|'tower'|'shop'|'cafe'|'school', w, floors, cols, fh, col, cut, lit 0..1 (доля горящих окон, гаснут по одному), litCol,
  //   seed, p 0..1 (стройка снизу вверх), sign (текст вывески), signCol, signText, awning (цвет маркизы)}. Возвращает {x0, x1, top}.
  const BD = { house: [300, 2, 3, 82], tower: [300, 9, 4, 50], shop: [360, 1, 1, 180], cafe: [380, 1, 1, 180], school: [480, 3, 5, 78] };
  function building(g, x, y, o = {}) {
    const kind = BD[o.kind] ? o.kind : 'house', D = BD[kind], col = o.col || fg(), cut = o.cut || bgc(), litC = o.litCol || C.yellow;
    const w = o.w || D[0], floors = o.floors || D[1], cols = o.cols || D[2], fh = o.fh || D[3], H = floors * fh + 26, x0 = x - w / 2, top = y - H;
    const roof = kind === 'house' ? w * 0.36 : kind === 'school' ? w * 0.14 : 0, signH = o.sign && (kind === 'shop' || kind === 'cafe') ? 86 : 0, full = H + roof + signH;
    g.save(); const p = o.p == null ? 1 : cl(o.p); if (p < 1) { g.beginPath(); g.rect(x0 - 60, y - full * p, w + 120, full * p + 4); g.clip(); }
    g.fillStyle = col; g.fillRect(x0, top, w, H);
    if (kind === 'house') { g.beginPath(); g.moveTo(x0 - w * 0.07, top + 1); g.lineTo(x, top - roof); g.lineTo(x0 + w * 1.07, top + 1); g.closePath(); g.fill(); }
    if (kind === 'school') { g.fillRect(x0 - 14, top - 12, w + 28, 16); g.beginPath(); g.moveTo(x0 + w * 0.2, top - 10); g.lineTo(x, top - roof - 10); g.lineTo(x0 + w * 0.8, top - 10); g.closePath(); g.fill(); }
    if (kind === 'tower') g.fillRect(x0 - 8, top - 10, w + 16, 14);
    const r = rng(o.seed || 7), win = [];
    if (kind === 'shop' || kind === 'cafe') {
      win.push([x0 + w * 0.08, top + 34, w * 0.52, H - 70]); g.fillStyle = cut; g.fillRect(x0 + w * 0.68, top + 40, w * 0.22, H - 40);
    } else {
      const ww = (w - 30) / cols, mw = ww * 0.52, mh = fh * 0.5;
      for (let fl = 0; fl < floors; fl++) for (let c = 0; c < cols; c++) {
        const wx = x0 + 15 + c * ww + (ww - mw) / 2, wy = top + 18 + fl * fh + (fh - mh) / 2;
        if (fl === floors - 1 && Math.abs(wx + mw / 2 - x) < mw * 0.95) continue;
        win.push([wx, wy, mw, mh]);
      }
      g.fillStyle = cut; g.fillRect(x - mw * 0.42, y - fh * 0.8, mw * 0.84, fh * 0.8);
    }
    const N = win.length, rank = win.map(() => r()), sorted = rank.slice().sort((a, b) => a - b), lim = o.lit == null ? -1 : sorted[Math.floor(cl(o.lit) * N) - 1];
    win.forEach((q, j) => { g.fillStyle = lim != null && o.lit > 0 && rank[j] <= lim ? litC : cut; g.fillRect(q[0], q[1], q[2], q[3]); });
    if (o.awning || kind === 'cafe') { const ac = o.awning || C.red, n = 7, aw = w / n, ay = top + 2; g.fillStyle = ac; g.fillRect(x0 - 6, ay - 4, w + 12, 22); for (let j = 0; j < n; j++) { g.beginPath(); g.arc(x0 + aw * (j + 0.5), ay + 18, aw / 2, 0, Math.PI); g.fill(); } }
    if (o.sign) { if (signH) sign(g, x, top - 46, o.sign, { col: o.signCol || col, textCol: o.signText || cut, size: 60, maxW: w });
      else sign(g, x, top + (kind === 'school' ? 0 : 30), o.sign, { col: o.signCol || cut, textCol: o.signText || col, size: kind === 'school' ? 40 : 36, maxW: w * 0.7 }); }
    g.restore(); return { x0, x1: x0 + w, top: top - roof - signH };
  }
  // вывеска / табличка: прямоугольник, текст узкими заглавными по центру
  function sign(g, cx, cy, txt, o = {}) {
    const size = o.size || 50, tw = Math.min(cw(g, txt, size, 700), (o.maxW || 600) - size * 0.8), k = Math.min(1, ((o.maxW || 600) - size * 0.8) / cw(g, txt, size, 700));
    const bw = tw + size * 0.8, bh = size * 1.25; g.save(); g.fillStyle = o.col || fg(); g.fillRect(cx - bw / 2, cy - bh / 2, bw, bh);
    g.fillStyle = o.textCol || bgc(); g.font = cf(size, 700); g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.translate(cx, cy + size * 0.36 * k); g.scale(SX * k, k); g.fillText(txt, 0, 0); g.restore();
  }
  // ДОСКА с текстом мелом: строки печатаются по буквам с t0, каждая следующая через step. o: {w, h, title, lines:[...], size, t, t0, step, cps, col, textCol, frame, legs}
  function board(g, cx, cy, o = {}) {
    const w = o.w || 640, h = o.h || 440, x0 = cx - w / 2, y0 = cy - h / 2, fr = o.frame || fg(), t = o.t || 0;
    g.save(); g.strokeStyle = fr; g.lineWidth = 7; g.lineCap = 'butt';
    if (o.legs !== false) { g.beginPath(); g.moveTo(x0 + w * 0.15, y0 + h * 0.6); g.lineTo(x0 + w * 0.05, y0 + h + 160); g.moveTo(x0 + w * 0.85, y0 + h * 0.6); g.lineTo(x0 + w * 0.95, y0 + h + 160); g.stroke(); }
    g.fillStyle = o.col || (CUR === 'night' ? C.bubble : C.night); g.fillRect(x0, y0, w, h); g.strokeRect(x0, y0, w, h);
    const rows = o.lines || [], size = o.size || 46, lh = size * 1.5, ty = cy - (rows.length - 1) * lh / 2 + (o.title ? size * 0.4 : 0);
    if (o.title) mono(g, o.title, cx, y0 + 46, 28, o.textCol || C.cream, { a: 0.7 });
    rows.forEach((s, j) => typed(g, [[s, o.textCol || C.cream]], cx, ty + j * lh, size, t, (o.t0 || 0) + j * (o.step || 1), { cps: o.cps || 22 }));
    g.restore();
  }

  // ДЕРЕВО. o: {kind:'leaf'|'pine', h, col, trunk, t (лёгкое качание)}
  function tree(g, x, y, o = {}) {
    const h = o.h || 320, col = o.col || fg(), tr = o.trunk || col, sw = Math.sin((o.t || 0) * 1.6 + x) * h * 0.012;
    g.save(); g.fillStyle = tr;
    if (o.kind === 'pine') { g.fillRect(x - h * 0.04, y - h * 0.16, h * 0.08, h * 0.16); g.fillStyle = col;
      for (let j = 0; j < 3; j++) { const yb = y - h * (0.12 + j * 0.26), wd = h * (0.36 - j * 0.08); g.beginPath(); g.moveTo(x - wd, yb); g.lineTo(x + sw * (j + 1), yb - h * 0.42); g.lineTo(x + wd, yb); g.closePath(); g.fill(); } }
    else { g.fillRect(x - h * 0.045, y - h * 0.5, h * 0.09, h * 0.5); g.fillStyle = col;
      [[0, -0.66, 0.24], [-0.17, -0.56, 0.17], [0.17, -0.56, 0.17], [-0.1, -0.8, 0.17], [0.11, -0.8, 0.16]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(x + dx * h + sw, y + dy * h, r * h, 0, 7); g.fill(); }); }
    g.restore();
  }
  // трава: зубцы вдоль земли
  function grass(g, x0, x1, y, o = {}) { const hh = o.h || 26, st = o.step || 18; g.fillStyle = o.col || C.green; g.beginPath(); g.moveTo(x0, y); for (let x = x0; x < x1; x += st) { g.lineTo(x + st * 0.35, y - hh * (0.6 + 0.4 * ((x * 7) % 3) / 2)); g.lineTo(x + st, y); } g.lineTo(x1, y + 2); g.lineTo(x0, y + 2); g.fill(); }
  // холм
  function hill(g, x0, x1, y, o = {}) { g.fillStyle = o.col || fg(); g.beginPath(); g.ellipse((x0 + x1) / 2, y, (x1 - x0) / 2, o.h || 160, 0, Math.PI, 0); g.fill(); }
  // линия земли
  function ground(g, y, o = {}) { g.strokeStyle = o.col || fg(); g.lineWidth = o.lw || 4; g.beginPath(); g.moveTo(o.x0 == null ? 0 : o.x0, y); g.lineTo(o.x1 == null ? W : o.x1, y); g.stroke(); }
  // кленовые листья падают и кружатся: o {x0, x1, y0, y1, n, cols, s, seed, speed}
  function leaves(g, t, o = {}) {
    const r = rng(o.seed || 31), n = o.n || 16, cols = o.cols || [C.orange, C.yellow, C.red], s = o.s || 1, y0 = o.y0 || 300, y1 = o.y1 || 1600, x0 = o.x0 || 80, x1 = o.x1 || 1000;
    for (let i = 0; i < n; i++) {
      const bx = mix(x0, x1, r()), sp0 = (o.speed || 120) * (0.7 + r() * 0.6), off = r() * (y1 - y0), ph = r() * 6.28, sz = 26 * s * (0.8 + r() * 0.5), c = cols[i % cols.length];
      const yy = y0 + (off + t * sp0) % (y1 - y0), xx = bx + Math.sin(t * 1.7 + ph) * 40, rot = Math.sin(t * 2 + ph) * 0.9;
      g.save(); g.translate(xx, yy); g.rotate(rot); g.fillStyle = c; g.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rad = k % 2 ? sz * 0.45 : sz; g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); } g.closePath(); g.fill();
      g.strokeStyle = c; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, sz * 1.2); g.stroke(); g.restore();
    }
  }

  // колесо с вырезом и вращающейся спицей
  function wheel(g, x, y, r, col, cut, a) { g.fillStyle = cut; g.beginPath(); g.arc(x, y, r * 1.14, 0, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.fillStyle = cut; g.beginPath(); g.arc(x, y, r * 0.38, 0, 7); g.fill(); g.strokeStyle = col; g.lineWidth = r * 0.14; g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.38, y + Math.sin(a) * r * 0.38); g.lineTo(x - Math.cos(a) * r * 0.38, y - Math.sin(a) * r * 0.38); g.stroke(); }
  // МАШИНА. x = центр, y = земля, едет вправо (flip влево). o: {w, col, cut, t}
  function car(g, x, y, o = {}) {
    const w = o.w || 300, col = o.col || fg(), cut = o.cut || bgc(), f = o.flip ? -1 : 1, rw = w * 0.11, bh = w * 0.2, t = o.t || 0;
    g.save(); g.translate(x, y); g.scale(f, 1); g.fillStyle = col; rr(g, -w / 2, -rw - bh, w, bh, w * 0.05); g.fill();
    g.beginPath(); g.moveTo(-w * 0.34, -rw - bh + 2); g.lineTo(-w * 0.2, -rw - bh - w * 0.17); g.lineTo(w * 0.14, -rw - bh - w * 0.17); g.lineTo(w * 0.3, -rw - bh + 2); g.closePath(); g.fill();
    g.fillStyle = cut; g.beginPath(); g.moveTo(-w * 0.26, -rw - bh - 4); g.lineTo(-w * 0.17, -rw - bh - w * 0.13); g.lineTo(-w * 0.04, -rw - bh - w * 0.13); g.lineTo(-w * 0.04, -rw - bh - 4); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(w * 0.0, -rw - bh - 4); g.lineTo(w * 0.0, -rw - bh - w * 0.13); g.lineTo(w * 0.12, -rw - bh - w * 0.13); g.lineTo(w * 0.22, -rw - bh - 4); g.closePath(); g.fill();
    g.fillStyle = C.yellow; g.fillRect(w / 2 - 14, -rw - bh + 10, 10, 14);
    [-w * 0.28, w * 0.28].forEach((wx) => wheel(g, wx, -rw, rw, C.night === col ? C.line : (o.tyre || C.night), cut, t * 9));
    g.restore();
  }
  // АВТОБУС. o: {w, col, cut, num (текст на табличке), heads:[цвета голов пассажиров в окнах | null], t}
  function bus(g, x, y, o = {}) {
    const w = o.w || 540, col = o.col || fg(), cut = o.cut || bgc(), f = o.flip ? -1 : 1, rw = w * 0.07, bh = w * 0.38, t = o.t || 0, top = -rw * 0.9 - bh;
    g.save(); g.translate(x, y); g.scale(f, 1); g.fillStyle = col; rr(g, -w / 2, top, w, bh, w * 0.04); g.fill();
    const n = 4, ww = (w * 0.66) / n;
    for (let j = 0; j < n; j++) { const wx = -w * 0.44 + j * ww; g.fillStyle = cut; g.fillRect(wx, top + bh * 0.14, ww * 0.82, bh * 0.38);
      const hc = o.heads && o.heads[j]; if (hc) { g.fillStyle = hc; g.beginPath(); g.arc(wx + ww * 0.41, top + bh * 0.42, bh * 0.1, 0, 7); g.fill(); g.fillRect(wx + ww * 0.2, top + bh * 0.47, ww * 0.42, bh * 0.05); } }
    g.fillStyle = cut; g.fillRect(w * 0.27, top + bh * 0.14, w * 0.17, bh * 0.66);
    g.fillRect(-w / 2, top + bh * 0.66, w * 0.74, bh * 0.05);
    g.fillStyle = C.yellow; g.fillRect(w / 2 - 12, top + bh * 0.72, 9, bh * 0.1);
    [-w * 0.3, w * 0.3].forEach((wx) => wheel(g, wx, -rw, rw, o.tyre || (col === C.night ? C.line : C.night), cut, t * 7));
    g.restore();
    if (o.num != null) { const bx = x + f * (w / 2 - w * 0.14), by = y + top - 34; sign(g, bx, by, String(o.num), { col, textCol: cut, size: 46, maxW: 220 }); }
  }
  // ВЕЛОСИПЕД с человеком. x = центр, y = земля. o: {r (радиус колеса), col, cut, t, rider: опции person | false, flip}
  function bike(g, x, y, o = {}) {
    const r = o.r || 54, col = o.col || fg(), cut = o.cut || bgc(), f = o.flip ? -1 : 1, t = o.t || 0, P = (dx, dy) => [x + f * dx, y + dy];
    const rw = P(-1.3 * r, -r), fw = P(1.3 * r, -r), cr = P(-0.05 * r, -r), st = P(-0.55 * r, -2.25 * r), hb = P(1.0 * r, -2.5 * r), a = t * 7;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    [rw, fw].forEach((p) => { g.strokeStyle = cut; g.lineWidth = r * 0.26; g.beginPath(); g.arc(p[0], p[1], r, 0, 7); g.stroke(); g.strokeStyle = col; g.lineWidth = r * 0.12; g.stroke();
      g.lineWidth = r * 0.05; g.beginPath(); g.moveTo(p[0] + Math.cos(a) * r, p[1] + Math.sin(a) * r); g.lineTo(p[0] - Math.cos(a) * r, p[1] - Math.sin(a) * r); g.moveTo(p[0] + Math.cos(a + 1.57) * r, p[1] + Math.sin(a + 1.57) * r); g.lineTo(p[0] - Math.cos(a + 1.57) * r, p[1] - Math.sin(a + 1.57) * r); g.stroke(); });
    g.strokeStyle = col; g.lineWidth = r * 0.12; g.beginPath(); g.moveTo(rw[0], rw[1]); g.lineTo(cr[0], cr[1]); g.lineTo(st[0], st[1] + 10); g.lineTo(rw[0], rw[1]);
    g.moveTo(cr[0], cr[1]); g.lineTo(P(0.95 * r, -2.05 * r)[0], P(0.95 * r, -2.05 * r)[1]); g.lineTo(st[0] + f * 0.1 * r, st[1] + 0.2 * r); g.moveTo(fw[0], fw[1]); g.lineTo(hb[0], hb[1]); g.lineTo(hb[0] - f * 0.25 * r, hb[1]); g.stroke();
    g.lineWidth = r * 0.14; g.beginPath(); g.moveTo(st[0] - f * 0.22 * r, st[1]); g.lineTo(st[0] + f * 0.22 * r, st[1]); g.stroke();
    g.restore();
    const pd = [P(-0.05 * r + Math.cos(a) * 0.36 * r * f, -r + Math.sin(a) * 0.36 * r), P(-0.05 * r - Math.cos(a) * 0.36 * r * f, -r - Math.sin(a) * 0.36 * r)];
    if (o.rider !== false) person(g, st[0], st[1] - 4, Object.assign({ h: r * 4.4, flip: o.flip, t }, o.rider || {}, { pose: 'ride', ride: { pedals: pd, grip: [hb[0] - f * 0.2 * r, hb[1]] } }));
  }
  // ЛОДКА. y = линия воды. o: {w, col, cut, kind:'motor'|'sail'|'row', sail (цвет паруса), crew:[опции person], crewH, t, flip, wake}
  function boat(g, x, y, o = {}) {
    const w = o.w || 380, col = o.col || fg(), cut = o.cut || bgc(), f = o.flip ? -1 : 1, t = o.t || 0, kind = o.kind || 'motor', bob = Math.sin(t * 2.3 + x) * w * 0.012, dk = -w * 0.13;
    g.save(); g.translate(x, y + bob); g.rotate(Math.sin(t * 1.9 + x) * 0.025); g.scale(f, 1);
    if (o.wake) { g.strokeStyle = o.wakeCol || fg(); g.lineWidth = 4; g.globalAlpha *= 0.8; for (let j = 0; j < 3; j++) { const L = w * (0.25 + 0.2 * j), ph = (t * 3 + j) % 1; g.beginPath(); g.moveTo(-w / 2 - 20 - j * 34 - ph * 20, 8 + j * 10); g.lineTo(-w / 2 - 20 - j * 34 - L, 8 + j * 10); g.stroke(); } g.globalAlpha = 1; }
    if (kind === 'sail') { g.strokeStyle = col; g.lineWidth = 7; g.beginPath(); g.moveTo(-w * 0.05, dk); g.lineTo(-w * 0.05, dk - w * 0.95); g.stroke(); g.fillStyle = o.sail || col; g.beginPath(); g.moveTo(w * 0.0, dk - w * 0.9); g.lineTo(w * 0.36, dk - 12); g.lineTo(w * 0.0, dk - 12); g.closePath(); g.fill(); }
    if (kind === 'motor') { g.fillStyle = col; g.fillRect(-w * 0.12, dk - w * 0.13, w * 0.3, w * 0.14); g.fillStyle = cut; g.fillRect(w * 0.02, dk - w * 0.1, w * 0.12, w * 0.06);
      g.fillStyle = col; g.fillRect(-w / 2 - w * 0.07, dk - w * 0.05, w * 0.08, w * 0.11); g.fillRect(-w / 2 - w * 0.045, dk + w * 0.05, w * 0.03, w * 0.12); }
    g.restore();
    (o.crew || []).forEach((p, j, a) => person(g, x + f * (a.length > 1 ? mix(-w * 0.28, w * 0.18, j / (a.length - 1)) : -w * 0.2), y + bob + dk + w * 0.07, Object.assign({ h: o.crewH || w * 0.5, t, phase: j * 2, flip: o.flip }, p)));
    g.save(); g.translate(x, y + bob); g.rotate(Math.sin(t * 1.9 + x) * 0.025); g.scale(f, 1); g.fillStyle = col;
    g.beginPath(); g.moveTo(-w / 2, dk); g.lineTo(w / 2 + w * 0.06, dk - w * 0.03); g.lineTo(w * 0.36, w * 0.05); g.lineTo(-w * 0.44, w * 0.05); g.closePath(); g.fill();
    if (kind === 'row') { g.strokeStyle = col; g.lineWidth = 6; const a = Math.sin(t * 3) * 0.4; g.beginPath(); g.moveTo(0, dk); g.lineTo(Math.sin(a) * w * 0.35, w * 0.12); g.stroke(); }
    g.restore();
  }

  // СОБАКА. x = центр, y = земля, смотрит вправо. o: {s (масштаб, 1 = 180 px длина), col, cut, pose:'stand'|'walk'|'sit'|'sleep', t, flip}
  function dog(g, x, y, o = {}) {
    const s = o.s || 1, col = o.col || fg(), cut = o.cut || bgc(), pose = o.pose || 'stand', t = o.t || 0, L = [], sw = pose === 'walk' ? Math.sin(t * 9) * 0.35 : 0, wag = Math.sin(t * 12) * 0.3;
    if (pose === 'sleep') {
      const br = Math.sin(t * 2.4) * 1.5;
      L.push(['l', [-58, -10, -92, -6, -96, -20], 9, col], ['r', -62, -46 - br, 122, 46 + br, 23, col], ['c', 66, -24, 22, col], ['r', 70, -22, 34, 18, 8, col], ['r', 52, -40, 14, 30, 7, col]);
    } else if (pose === 'sit') {
      L.push(['l', [-36, -10, -78, -6], 9, col], ['c', -20, -36, 36, col], ['l', [0, -96, 6, -30], 34, col], ['l', [12, -40, 16, 0], 11, col], ['c', 22, -126, 22, col], ['r', 30, -126, 32, 18, 8, col], ['r', 8, -142, 14, 32, 7, col]);
    } else {
      const lg = (bx, a) => { const e = ang(bx, -52, a, 52); L.push(['l', [bx, -52, e[0], e[1]], 11, col]); };
      lg(-44, -sw); lg(-28, sw); lg(30, sw); lg(46, -sw);
      L.push(['l', [-56, -72, -56 - Math.cos(1 + wag) * 34, -72 - Math.sin(1 + wag) * 34], 9, col], ['r', -60, -84, 122, 40, 20, col], ['c', 70, -100, 23, col], ['r', 78, -100, 34, 19, 8, col], ['r', 56, -116, 14, 32, 7, col]);
    }
    g.save(); g.translate(x, y); g.scale((o.flip ? -1 : 1) * s, s); prims(g, L, (o.halo || 5) / s, cut);
    g.fillStyle = cut; g.strokeStyle = cut; g.lineWidth = 3;
    if (pose === 'sleep') { g.beginPath(); g.arc(72, -30, 5, 0, Math.PI); g.stroke(); } else { const ey = pose === 'sit' ? -132 : -106, ex = pose === 'sit' ? 28 : 76; g.beginPath(); g.arc(ex, ey, 4, 0, 7); g.fill(); }
    g.fillStyle = C.night; const nx = pose === 'sleep' ? 104 : pose === 'sit' ? 62 : 112, ny = pose === 'sleep' ? -18 : pose === 'sit' ? -121 : -95; g.beginPath(); g.arc(nx, ny, 5, 0, 7); if (col !== C.night) g.fill();
    g.restore();
  }
  // КОШКА. o как у dog (s 1 = 130 px), pose:'stand'|'walk'|'sit'|'sleep'
  function cat(g, x, y, o = {}) {
    const s = o.s || 1, col = o.col || fg(), cut = o.cut || bgc(), pose = o.pose || 'stand', t = o.t || 0, L = [], sw = pose === 'walk' ? Math.sin(t * 9) * 0.35 : 0, tl = Math.sin(t * 2) * 6;
    const ears = (hx, hy) => L.push(['p', [hx - 15, hy - 6, hx - 12, hy - 28, hx - 2, hy - 12], col], ['p', [hx + 2, hy - 12, hx + 12, hy - 28, hx + 15, hy - 6], col]);
    if (pose === 'sleep') { L.push(['c', 0, -30, 30, col], ['l', [-28, -6, 10, -2, 40, -8], 9, col], ['c', 30, -22, 17, col]); ears(30, -22); }
    else if (pose === 'sit') { L.push(['l', [-26, -6, -50, -20 + tl, -46, -48], 7, col], ['c', -6, -26, 26, col], ['l', [4, -76, 10, -22], 26, col], ['c', 14, -94, 17, col]); ears(14, -94); }
    else { const lg = (bx, a) => { const e = ang(bx, -36, a, 36); L.push(['l', [bx, -36, e[0], e[1]], 8, col]); };
      lg(-34, -sw); lg(-22, sw); lg(22, sw); lg(34, -sw);
      L.push(['l', [-40, -52, -62, -80 + tl, -54, -104], 7, col], ['r', -44, -60, 88, 28, 14, col], ['c', 46, -72, 17, col]); ears(46, -72); }
    g.save(); g.translate(x, y); g.scale((o.flip ? -1 : 1) * s, s); prims(g, L, (o.halo || 5) / s, cut);
    g.fillStyle = cut; const ex = pose === 'sleep' ? 34 : pose === 'sit' ? 20 : 52, ey = pose === 'sleep' ? -22 : pose === 'sit' ? -96 : -74;
    if (pose === 'sleep') { g.strokeStyle = cut; g.lineWidth = 2.5; g.beginPath(); g.arc(ex, ey, 4, 0, Math.PI); g.stroke(); } else { g.beginPath(); g.arc(ex, ey, 3.2, 0, 7); g.fill(); }
    g.restore();
  }
  // ПТИЦА: чайка-«галочка» машет крыльями. o: {s, col, t, phase}
  function bird(g, x, y, o = {}) {
    const s = o.s || 1, fl = Math.sin((o.t || 0) * 8 + (o.phase || 0)), tip = -12 - 10 * fl;
    g.save(); g.strokeStyle = o.col || fg(); g.lineWidth = 5 * s; g.lineCap = 'round'; g.lineJoin = 'round'; g.translate(x, y); g.scale(s, s);
    g.beginPath(); g.moveTo(-30, tip); g.quadraticCurveTo(-14, -18 - 6 * fl, 0, 2); g.quadraticCurveTo(14, -18 - 6 * fl, 30, tip); g.stroke(); g.restore();
  }
  // стая кружит по эллипсу. o: {n, cx, cy, rx, ry, s, col, seed, speed}
  function birds(g, t, o = {}) { const r = rng(o.seed || 3), n = o.n || 6;
    for (let i = 0; i < n; i++) { const a = t * (o.speed || 0.5) * (0.8 + r() * 0.4) + i * 6.28 / n + r(), k = 0.7 + r() * 0.5;
      bird(g, (o.cx || 540) + Math.cos(a) * (o.rx || 340) * k, (o.cy || 600) + Math.sin(a) * (o.ry || 140) * k, { s: (o.s || 1) * (0.8 + r() * 0.4), col: o.col, t, phase: i * 1.3 }); } }

  // СОЛНЦЕ: диск и лучи. o: {col, rays (0 без лучей), t, horizon (y: ниже не рисуем)}
  function sun(g, x, y, r, o = {}) { const col = o.col || C.yellow; g.save(); if (o.horizon != null) { g.beginPath(); g.rect(0, 0, W, o.horizon); g.clip(); }
    g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); const n = o.rays == null ? 12 : o.rays, a0 = (o.t || 0) * 0.25;
    g.strokeStyle = col; g.lineWidth = Math.max(4, r * 0.07); g.lineCap = 'butt'; g.beginPath(); for (let j = 0; j < n; j++) { const a = a0 + j * 6.283 / n; g.moveTo(x + Math.cos(a) * r * 1.25, y + Math.sin(a) * r * 1.25); g.lineTo(x + Math.cos(a) * r * 1.55, y + Math.sin(a) * r * 1.55); } g.stroke(); g.restore(); }
  // ЛУНА-серп: o {col, cut, phase 0..1 (толщина серпа)}
  function moon(g, x, y, r, o = {}) { g.fillStyle = o.col || C.cream; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = o.cut || bgc(); g.beginPath(); g.arc(x + r * mix(0.25, 0.75, o.phase == null ? 0.5 : o.phase), y - r * 0.2, r * 0.92, 0, 7); g.fill(); }
  // ЗВЁЗДЫ: крестики и точки мерцают. o: {x0, x1, y0, y1, n, col, seed, p 0..1 (сколько уже зажглось)}
  function stars(g, t, o = {}) { const r = rng(o.seed || 9), n = o.n || 50, vis = Math.floor(n * (o.p == null ? 1 : cl(o.p))); g.save(); g.fillStyle = g.strokeStyle = o.col || C.cream; g.lineWidth = 3;
    for (let i = 0; i < n; i++) { const x = mix(o.x0 || 60, o.x1 || 1020, r()), y = mix(o.y0 || 200, o.y1 || 900, r()), big = r() < 0.35, ph = r() * 6.28; if (i >= vis) continue;
      g.globalAlpha = 0.55 + 0.45 * Math.sin(t * 3 + ph); if (big) { g.beginPath(); g.moveTo(x - 10, y); g.lineTo(x + 10, y); g.moveTo(x, y - 10); g.lineTo(x, y + 10); g.stroke(); } else g.fillRect(x - 2.5, y - 2.5, 5, 5); } g.restore(); }
  // ОБЛАКО-пуф (не путать с cloud, облаком точек). o: {s, col}
  function puff(g, x, y, o = {}) { const s = o.s || 1; g.fillStyle = o.col || fg(); g.beginPath(); g.arc(x - 44 * s, y - 20 * s, 30 * s, 0, 7); g.arc(x, y - 36 * s, 44 * s, 0, 7); g.arc(x + 46 * s, y - 22 * s, 32 * s, 0, 7); g.fill(); rr(g, x - 80 * s, y - 30 * s, 160 * s, 30 * s, 15 * s); g.fill(); }
  // МОРЕ: волнистые линии от y0 до y1, fill = заливка под первой линией. o: {y0, y1, n, col, fill, lw, amp}
  function sea(g, t, o = {}) { const y0 = o.y0 || 1150, y1 = o.y1 || 1500, n = o.n || 5, amp = o.amp || 9; g.save();
    if (o.fill) { g.fillStyle = o.fill; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 30) g.lineTo(x, y0 + Math.sin(x * 0.011 + t * 1.5) * amp); g.lineTo(W, H); g.fill(); }
    g.strokeStyle = o.col || fg(); g.lineWidth = o.lw || 4; g.beginPath();
    for (let j = 0; j < n; j++) { const yy = mix(y0, y1, n > 1 ? j / (n - 1) : 0); for (let x = 0; x <= W; x += 30) { const v = yy + Math.sin(x * 0.011 + t * 1.5 + j * 1.3) * amp; x ? g.lineTo(x, v) : g.moveTo(x, v); } } g.stroke(); g.restore(); }

  // ФОНАРЬ. y = земля. o: {h, col, on (0..1), lightCol}
  function lamp(g, x, y, o = {}) { const h = o.h || 380, col = o.col || fg(), on = o.on == null ? 1 : o.on, lc = o.lightCol || C.yellow;
    g.save(); g.fillStyle = col; g.fillRect(x - 6, y - h, 12, h); g.fillRect(x - 22, y - 14, 44, 14); g.beginPath(); g.moveTo(x - 30, y - h); g.lineTo(x + 30, y - h); g.lineTo(x + 18, y - h - 26); g.lineTo(x - 18, y - h - 26); g.closePath(); g.fill();
    g.fillStyle = on > 0 ? lc : bgc(); g.beginPath(); g.arc(x, y - h + 16, 16, 0, 7); g.fill();
    if (on > 0) { g.globalAlpha *= on; g.strokeStyle = lc; g.lineWidth = 4; g.beginPath(); for (let j = 0; j < 5; j++) { const a = Math.PI * (0.15 + j * 0.175); g.moveTo(x + Math.cos(a) * 30, y - h + 16 + Math.sin(a) * 30); g.lineTo(x + Math.cos(a) * 50, y - h + 16 + Math.sin(a) * 50); } g.stroke(); }
    g.restore(); }
  // ГИРЛЯНДА: провод с провисом, лампочки загораются слева направо (on 0..1). o: {n, sag, col, cols, on, r}
  function garland(g, x0, y0, x1, y1, o = {}) { const n = o.n || 10, sag = o.sag || 90, col = o.col || fg(), cols = o.cols || [C.yellow, C.red, C.orange, C.cream], on = o.on == null ? 1 : o.on, r = o.r || 13;
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + sag * 2, P = (s) => [(1 - s) * (1 - s) * x0 + 2 * (1 - s) * s * mx + s * s * x1, (1 - s) * (1 - s) * y0 + 2 * (1 - s) * s * my + s * s * y1];
    g.save(); g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(mx, my, x1, y1); g.stroke();
    for (let i = 0; i < n; i++) { const [x, y] = P((i + 0.5) / n); g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 12); g.stroke(); const lit = (i + 0.5) / n <= on;
      g.fillStyle = lit ? cols[i % cols.length] : bgc(); g.beginPath(); g.arc(x, y + 12 + r, r, 0, 7); g.fill(); if (!lit) { g.lineWidth = 3; g.stroke(); } }
    g.restore(); }

  // ---------- звук ----------
  // удар на каждой склейке; сильные склейки (смена фона) громче
  function cutSounds(s, cuts, name = 'woodblock', v = 0.14) { cuts.slice(1).forEach((c) => s.play(c, name, v)); }
  return { C, HUDC, SANS, MONO, SX, BPM, BEAT, BAR, beat, cl, eo, eo5, eio, sp, mix, rng, cf, mf, rr, fmt,
    scene, camera, bg, flash, hud, cw, fit, word, lines, mono, typed, spaced, counter,
    dot, crosshair, leader, cage, shards, split, cloud, bubble, typing, stamp, pile, network, lock, mark, logo, cutSounds,
    SKIN, fg, bgc, prims, person, crowd, building, sign, board, tree, grass, hill, ground, leaves, wheel, car, bus, bike, boat,
    dog, cat, bird, birds, sun, moon, stars, puff, sea, lamp, garland };
})();
