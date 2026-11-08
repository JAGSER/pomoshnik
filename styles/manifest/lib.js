// Стиль «Манифест» (MANI): видоискатель с моно-HUD, красная точка-герой, огромные узкие заглавные слова по одному на долю, резкие склейки в такт 128 BPM.
const MANI = (() => {
  // палитра снята пипеткой с оригинала
  const C = { night: '#0B0D0D', cream: '#ECE7DB', blue: '#2B28EB', red: '#ED391D', ink: '#0B0D0D', paper: '#ECE7DB',
    gray: '#8C877B', bubble: '#26252A', line: '#3A3D3D', white: '#F4F2EC' };
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
  function bg(g, t, theme = 'night') {
    g.fillStyle = C[theme] || theme; g.fillRect(0, 0, W, H);
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
    g.textAlign = 'left'; g.fillText(o.rec || 'ЗАП', 110, 147); g.fillText(o.brand || 'ТИШИНА', 186, 147);
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

  // ---------- звук ----------
  // удар на каждой склейке; сильные склейки (смена фона) громче
  function cutSounds(s, cuts, name = 'woodblock', v = 0.14) { cuts.slice(1).forEach((c) => s.play(c, name, v)); }
  return { C, HUDC, SANS, MONO, SX, BPM, BEAT, BAR, beat, cl, eo, eo5, eio, sp, mix, rng, cf, mf, rr, fmt,
    scene, camera, bg, flash, hud, cw, fit, word, lines, mono, typed, spaced, counter,
    dot, crosshair, leader, cage, shards, split, cloud, bubble, typing, stamp, pile, network, lock, mark, logo, cutSounds };
})();
