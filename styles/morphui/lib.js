// lib.js
const MORF = (() => {
  // ---------- палитра (пипеткой по оригиналу) ----------
  const C = {
    bg: '#F4F5F8', bgD: '#0A0A0A', navy: '#1C3460', sky: '#4EA8D2', green: '#0A8459', greenBg: '#E2F7EC', greenBar: '#35B67A',
    red: '#C8324A', redBg: '#FDE9EC', teal: '#147870', salmon: '#D0695C', purple: '#7B3FE4', purpleBg: '#F0E8FE', gold: '#F2A93B',
    black: '#000000', white: '#FFFFFF', blue: '#2F6FD8'
  };
  const LIGHT = { bg: '#F4F5F8', card: '#FFFFFF', ink: '#0E0F12', ink2: '#6B7079', ink3: '#A3A8B1', line: '#EEEFF2', hover: '#F1F2F5',
    off: '#D9DBE0', border: '#E5E7EB', chip: '#F4F5F8' };
  const DARK = { bg: '#0A0A0A', card: '#121212', ink: '#F1F1F2', ink2: '#8C8C92', ink3: '#5C5C62', line: '#1F1F22', hover: '#1E1E21',
    off: '#3A3A3E', border: '#252528', chip: '#1A1A1D' };
  const SANS = '"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif';
  const MONOS = '"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace';
  const SAFE = { x0: 60, x1: 1020, y0: 110, y1: 1690 };
  const W = 1080, H = 1920, TAU = Math.PI * 2, CX = 540, CY = 880;
  let g = null, G = null, P = LIGHT, DK = 0;

  // ---------- математика и движение ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const prog = (t, a, b) => clamp((t - a) / ((b - a) || 1e-6), 0, 1);
  const eo = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
  const eio = x => { x = clamp(x, 0, 1); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  function sp(x, w, z) { // пружина 0→1, z<1 = лёгкий перелёт
    if (x <= 0) return 0; w = w || 20; z = Math.min(z || 0.75, 0.999);
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + z * w / wd * Math.sin(wd * x));
  }
  function trk(keys, t, w, z) { // [[t, v], ...] → пружинно между значениями
    let v = keys[0][1];
    for (let i = 1; i < keys.length; i++) v += (keys[i][1] - keys[i - 1][1]) * sp(t - keys[i][0], w || 26, z || .8);
    return v;
  }
  function step(keys, t) { let v = keys[0][1]; for (const k of keys) if (t >= k[0]) v = k[1]; return v; }
  const on = (t, t0, d) => t0 == null ? 0 : eo(prog(t, t0, t0 + (d || .25)));
  function scene(t, CUTS) { // CUTS: времена начала сцен по возрастанию
    let i = 0; while (i + 1 < CUTS.length && t >= CUTS[i + 1]) i++;
    const t0 = CUTS[i], t1 = i + 1 < CUTS.length ? CUTS[i + 1] : t0 + 3;
    return { i, t0, t1, lt: t - t0, p: prog(t, t0, t1) };
  }

  // ---------- цвет ----------
  const HX = {};
  function rgb(h) {
    if (HX[h]) return HX[h];
    let s = h.replace('#', ''); if (s.length === 3) s = s.split('').map(c => c + c).join('');
    return (HX[h] = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]);
  }
  function mix(a, b, p) {
    p = clamp(p, 0, 1); if (p <= 0) return a; if (p >= 1) return b;
    const A = rgb(a), B = rgb(b);
    return '#' + [0, 1, 2].map(i => Math.round(lerp(A[i], B[i], p)).toString(16).padStart(2, '0')).join('');
  }
  function rgba(h, a) { const c = rgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function pal(dk) { const o = {}; for (const k in LIGHT) o[k] = mix(LIGHT[k], DARK[k], dk); return o; }

  // ---------- начало кадра, фон ----------
  // dkKeys: [[t, 0|1], ...] светлая/тёмная часть ролика; смена 0,35 с
  function begin(k, t, dkKeys) {
    G = g = k.g; DK = 0;
    if (dkKeys) for (let i = 1; i < dkKeys.length; i++) DK += (dkKeys[i][1] - dkKeys[i - 1][1]) * eio(prog(t, dkKeys[i][0], dkKeys[i][0] + .35));
    if (dkKeys) DK += dkKeys[0][1];
    DK = clamp(DK, 0, 1); P = pal(DK);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.fillStyle = P.bg; g.fillRect(0, 0, W, H);
    return g;
  }
  const dark = () => DK;

  // ---------- примитивы ----------
  function rr(x, y, w, h, r) {
    w = Math.max(w, .01); h = Math.max(h, .01); r = Math.max(0, Math.min(r, w / 2, h / 2));
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function circ(x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0, r), 0, TAU); }
  function stroke(col, lw) { g.strokeStyle = col; g.lineWidth = lw || 4; g.lineCap = g.lineJoin = 'round'; g.stroke(); }
  function pl(pts, col, lw) { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); stroke(col, lw); }

  // ---------- текст ----------
  const font = (s, w) => (w || 500) + ' ' + Math.max(1, Math.round(s)) + 'px ' + SANS;
  const mono = (s, w) => (w || 400) + ' ' + Math.max(1, Math.round(s)) + 'px ' + MONOS;
  // txt(s, x, y, {size, w, c, al, max, fam:'mono', a}) → ширина; не шире max (уменьшает кегль)
  function txt(s, x, y, o) {
    o = o || {}; let size = o.size || 40; const F = o.fam === 'mono' ? mono : font;
    g.font = F(size, o.w); let wd = g.measureText(s).width;
    if (o.max && wd > o.max) { size *= o.max / wd; g.font = F(size, o.w); wd = g.measureText(s).width; }
    g.textBaseline = 'middle'; g.textAlign = o.al || 'left'; g.fillStyle = o.c || P.ink;
    const a0 = g.globalAlpha; if (o.a != null) g.globalAlpha = a0 * clamp(o.a, 0, 1);
    g.fillText(s, x, y); g.globalAlpha = a0; return wd;
  }
  function tw(s, size, w, fam) { g.font = (fam === 'mono' ? mono : font)(size, w); return g.measureText(s).width; }
  function wrap(s, size, w, max) { // перенос по словам через measureText
    const out = []; let cur = '';
    for (const wd of s.split(' ')) { const tst = cur ? cur + ' ' + wd : wd; if (cur && tw(tst, size, w) > max) { out.push(cur); cur = wd; } else cur = tst; }
    if (cur) out.push(cur); return out;
  }
  // слова по одному: появление 0,22 с, сдвиг 14 px, без перелёта; *слово* = акцент
  function words(t, t0, s, x, y, o) {
    o = o || {}; const size = o.size || 92, wt = o.w || 650, lh = o.lh || size * 1.12, max = o.max || 900, st = o.stagger || .12;
    const lines = wrap(s, size, wt, max); let i = 0;
    lines.forEach((ln, li) => {
      const ws = ln.split(' '); const full = tw(ln.replace(/\*/g, ''), size, wt);
      let cx = o.al === 'center' ? x - full / 2 : x;
      ws.forEach(wd => {
        const acc = /^\*.*\*[,.:!?]?$/.test(wd), clean = wd.replace(/\*/g, ''), p = eo(prog(t, t0 + i * st, t0 + i * st + .22));
        if (p > 0) txt(clean, cx, y + li * lh + (1 - p) * 14, { size, w: wt, c: acc ? (o.acc || C.teal) : (o.c || P.ink), a: p });
        cx += tw(clean + ' ', size, wt); i++;
      });
    });
    return lines.length * lh;
  }
  // число с разрядами, крутится как счётчик; fmt: пробел между тысячами
  const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  function roll(v, x, y, o) { // o: size, w, c, al, digits(мин. разрядов)
    o = o || {}; const size = o.size || 140, wt = o.w || 700, c = o.c || P.ink;
    const s = fmt(Math.floor(v)); g.font = font(size, wt);
    const dw = g.measureText('0').width, sw = g.measureText(' ').width;
    let total = 0; for (const ch of s) total += ch === ' ' ? sw : dw;
    let cx = o.al === 'left' ? x : o.al === 'right' ? x - total : x - total / 2;
    const n = s.replace(/ /g, '').length; let k = n - 1;
    g.save(); g.beginPath(); g.rect(cx - 10, y - size * .62, total + 20, size * 1.24); g.clip();
    g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = c;
    for (const ch of s) {
      if (ch === ' ') { cx += sw; continue; }
      const pos = v / Math.pow(10, k), d = Math.floor(pos) % 10, fr = k === 0 ? 0 : pos - Math.floor(pos);
      const f = fr > .82 ? (fr - .82) / .18 : 0; // перекат в конце разряда
      const sm = Math.min(1, Math.abs(o.speed || 0) / Math.pow(10, k) / 30); // смаз при быстром счёте
      g.globalAlpha = 1 - .45 * sm;
      g.fillText(String(d), cx, y - f * size * 1.05);
      if (f > 0 || sm > .1) { g.globalAlpha = Math.max(f, .35 * sm); g.fillText(String((d + 1) % 10), cx, y + (1 - f) * size * 1.05); }
      g.globalAlpha = 1; cx += dw; k--;
    }
    g.restore(); return total;
  }

  // ---------- размытие без ctx.filter: уменьшение и растяжение ----------
  let B1 = null, B2 = null, b1 = null, b2 = null;
  function blurDraw(b, fn, box) { // box: {x,y,w,h} в координатах экрана, ограничивает работу
    if (b < .04) { fn(); return; }
    if (!B1) { B1 = new OffscreenCanvas(W, H); b1 = B1.getContext('2d'); B2 = new OffscreenCanvas(W, H); b2 = B2.getContext('2d'); }
    box = box || { x: 0, y: 0, w: W, h: H };
    const bx = clamp(Math.floor(box.x - 90), 0, W), by = clamp(Math.floor(box.y - 90), 0, H);
    const bw = Math.min(W - bx, Math.ceil(box.w + 180)), bh = Math.min(H - by, Math.ceil(box.h + 180));
    if (bw <= 0 || bh <= 0) return;
    const s = lerp(.32, .04, clamp(b, 0, 1)), m = G.getTransform(), sw = Math.ceil(bw * s), sh = Math.ceil(bh * s);
    b1.setTransform(1, 0, 0, 1, 0, 0); b1.clearRect(0, 0, sw + 2, sh + 2);
    b1.setTransform(m.a * s, m.b * s, m.c * s, m.d * s, (m.e - bx) * s, (m.f - by) * s);
    const keep = g; g = b1; const a0 = G.globalAlpha; b1.globalAlpha = 1;
    try { fn(); } finally { g = keep; }
    const s2 = Math.min(1, s * 2.6), w2 = Math.ceil(bw * s2), h2 = Math.ceil(bh * s2);
    b2.setTransform(1, 0, 0, 1, 0, 0); b2.clearRect(0, 0, w2 + 2, h2 + 2); b2.imageSmoothingEnabled = true;
    b2.drawImage(B1, 0, 0, sw, sh, 0, 0, w2, h2);
    G.save(); G.setTransform(1, 0, 0, 1, 0, 0); G.globalAlpha = a0; G.imageSmoothingEnabled = true;
    G.drawImage(B2, 0, 0, w2, h2, bx, by, bw, bh); G.restore();
  }

  // ---------- мягкая тень (только тень, без заливки: фигура вынесена за кадр) ----------
  let SH = null; const SM = 130, SC = 70; // поле размытия и угол спрайта
  function shadowSprite() {
    const n = (SM + SC) * 2 + 4; SH = new OffscreenCanvas(n, n); const c = SH.getContext('2d');
    c.shadowColor = 'rgba(0,0,0,1)'; c.shadowBlur = 70; c.shadowOffsetX = 4000; c.fillStyle = '#000';
    const keep = g; g = c; rr(SM - 4000, SM, n - SM * 2, n - SM * 2, SC); c.fill(); g = keep;
  }
  function shadow(x, y, w, h, r, a) { // 9 кусков спрайта, растянутых по размеру
    if (!SH) shadowSprite();
    const n = SH.width, k = SM + SC, al = DK > .5 ? .6 * a : .15 * a; if (al <= 0) return;
    const X0 = x - SM, Y0 = y - SM + 26, X1 = x + w + SM, Y1 = y + h + SM + 26, cw = Math.min(k, (X1 - X0) / 2), ch = Math.min(k, (Y1 - Y0) / 2);
    const a0 = g.globalAlpha; g.globalAlpha = a0 * al;
    const xs = [[0, X0, cw, cw], [k, X0 + cw, n - 2 * k, X1 - X0 - 2 * cw], [n - k, X1 - cw, k, cw]];
    const ys = [[0, Y0, ch, ch], [k, Y0 + ch, n - 2 * k, Y1 - Y0 - 2 * ch], [n - k, Y1 - ch, k, ch]];
    for (const X of xs) for (const Y of ys) if (X[3] > 0 && Y[3] > 0) g.drawImage(SH, X[0], Y[0], X === xs[1] ? X[2] : k, Y === ys[1] ? Y[2] : k, X[1], Y[1], X[3], Y[3]);
    g.globalAlpha = a0;
  }

  // ---------- герой: один контейнер, который морфится ----------
  // S: [{t, k:'вид', w, h, r, fill:'card'|'navy'|'black'|'phone'|'#hex', z(зум, 1), y(центр, 880), o:{...}}]
  // R: {вид: (t, info) => рисует содержимое от центра}, info = {w, h, t0, o, dark, P}
  const MD = .3; // длительность морфа, с (оригинал: 7-9 кадров при 30 к/с)
  function fillOf(f) { return f === 'navy' ? C.navy : f === 'black' ? '#000000' : f === 'phone' ? '#0C0C0E' : f && f[0] === '#' ? f : P.card; }
  function heroAt(S, t) { let i = 0; while (i + 1 < S.length && t >= S[i + 1].t) i++; return i; }
  function hero(t, S, R) {
    const i = heroAt(S, t), s = S[i], q = S[Math.max(0, i - 1)];
    const m = i === 0 ? 1 : eio(prog(t, s.t, s.t + MD)), k = i === 0 ? 1 : sp(t - s.t, 19, .72);
    const w = lerp(q.w, s.w, k), h = lerp(q.h, s.h, k), r = lerp(q.r, s.r, clamp(k, 0, 1));
    const z = lerp(q.z || 1, s.z || 1, eio(prog(t, s.t, s.t + .45))) * (1 + .018 * eio(prog(t, s.t, s.t + 3.2))) * (1 - .025 * Math.sin(Math.PI * m));
    const cy = lerp(q.y || CY, s.y || CY, eio(prog(t, s.t, s.t + .45)));
    const bl = i === 0 ? 0 : Math.pow(Math.sin(Math.PI * prog(t, s.t, s.t + MD)), .7);
    const intro = s.intro && i === 0 ? 1 - eo(prog(t, s.t, s.t + .4)) : 0; // первый кадр: из размытия
    const fc = mix(mix(fillOf(q.fill), fillOf(s.fill), m), DK > .5 ? '#2A2D33' : '#C3C8D2', .55 * bl);
    g.save(); g.translate(CX, cy); g.scale(z, z);
    shadow(-w / 2, -h / 2, w, h, r, 1 - .6 * bl);
    const body = () => {
      g.fillStyle = fc; rr(-w / 2, -h / 2, w, h, r); g.fill();
      if (s.fill === 'card' || !s.fill) { g.strokeStyle = rgba(DK > .5 ? '#FFFFFF' : '#000000', DK > .5 ? .05 : .035); g.lineWidth = 2; g.stroke(); }
      g.save(); rr(-w / 2, -h / 2, w, h, r); g.clip();
      if (m < 1 && R[q.k]) { const a = g.globalAlpha; g.globalAlpha = a * (1 - m); R[q.k](Math.min(t, s.t), { w: q.w, h: q.h, t0: q.t, o: q.o || {} }); g.globalAlpha = a; }
      if (m > 0 && R[s.k]) { const a = g.globalAlpha; g.globalAlpha = a * m; R[s.k](t, { w: s.w, h: s.h, t0: s.t, o: s.o || {} }); g.globalAlpha = a; }
      g.restore();
    };
    const mw = Math.max(w, q.w, s.w) * z * 1.1, mh = Math.max(h, q.h, s.h) * z * 1.1;
    blurDraw(Math.max(bl, intro), body, { x: CX - mw / 2, y: cy - mh / 2, w: mw, h: mh });
    g.restore();
    return { i, w, h, z, cy, m, k: s.k };
  }

  // ---------- курсор macOS: стрелка с обводкой, клик = сжатие ----------
  // keys: [[t, x, y]] от центра героя (с учётом зума), clicks: [t, ...]
  function curPos(keys, t) {
    if (t <= keys[0][0]) return { x: keys[0][1], y: keys[0][2], v: 0 };
    for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) {
      const a = keys[i - 1], b = keys[i], d = b[0] - a[0], mv = Math.min(d, .55), st = b[0] - mv; // едет в последние 0,55 с сегмента
      const p = eio(prog(t, st, b[0])), dist = Math.hypot(b[1] - a[1], b[2] - a[2]);
      return { x: lerp(a[1], b[1], p), y: lerp(a[2], b[2], p), v: t > st ? dist / mv * Math.sin(Math.PI * prog(t, st, b[0])) : 0 };
    }
    const l = keys[keys.length - 1]; return { x: l[1], y: l[2], v: 0 };
  }
  function arrow(x, y, s, fillC, edge) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 34); g.lineTo(8, 26.5); g.lineTo(13.5, 39); g.lineTo(19.5, 36.5); g.lineTo(14, 24.5); g.lineTo(24.5, 24.5); g.closePath();
    g.lineJoin = 'round'; g.strokeStyle = edge; g.lineWidth = 4; g.stroke(); g.fillStyle = fillC; g.fill(); g.restore();
  }
  function cursor(t, Hr, keys, clicks, o) {
    o = o || {}; if (o.hide && t >= o.hide) return;
    const p = curPos(keys, t), z = Hr ? Hr.z : 1, cy = Hr ? Hr.cy : CY;
    let pr = 0; (clicks || []).forEach(c => { pr = Math.max(pr, Math.sin(Math.PI * prog(t, c - .06, c + .12))); });
    const x = CX + p.x * z, y = cy + p.y * z, s = 1.2 * (1 - .14 * pr);
    const fc = DK > .5 ? '#FFFFFF' : '#000000', ec = DK > .5 ? '#000000' : '#FFFFFF';
    if (p.v > 900) { // смаз при быстром движении
      const pp = curPos(keys, t - .025), a0 = g.globalAlpha;
      g.globalAlpha = a0 * .25; arrow(CX + pp.x * z, cy + pp.y * z, s, fc, ec); g.globalAlpha = a0;
    }
    g.save(); g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 8; g.shadowOffsetY = 3; arrow(x, y, s, fc, ec); g.restore();
  }

  // ---------- иконки (штрих, круглые концы) ----------
  function icPlus(x, y, s, c, lw) { pl([[x - s, y], [x + s, y]], c, lw); pl([[x, y - s], [x, y + s]], c, lw); }
  function icArrowUp(x, y, s, c, lw) { pl([[x, y + s], [x, y - s]], c, lw); pl([[x - s * .7, y - s * .3], [x, y - s], [x + s * .7, y - s * .3]], c, lw); }
  function icCheck(x, y, s, c, lw, p) {
    p = p == null ? 1 : p; const A = [x - s * .45, y + s * .02], B = [x - s * .12, y + s * .34], D = [x + s * .5, y - s * .3];
    if (p <= .4) pl([A, [lerp(A[0], B[0], p / .4), lerp(A[1], B[1], p / .4)]], c, lw);
    else pl([A, B, [lerp(B[0], D[0], (p - .4) / .6), lerp(B[1], D[1], (p - .4) / .6)]], c, lw);
  }
  function icCheckCircle(x, y, r, c, lw, p) { circ(x, y, r); stroke(c, lw); icCheck(x, y, r, c, lw, p); }
  function icChevron(x, y, s, c, lw, dir) { // dir: 'down' | 'right'
    if (dir === 'right') pl([[x - s * .4, y - s], [x + s * .4, y], [x - s * .4, y + s]], c, lw);
    else pl([[x - s, y - s * .45], [x, y + s * .45], [x + s, y - s * .45]], c, lw);
  }
  function icClose(x, y, s, c, lw) { pl([[x - s, y - s], [x + s, y + s]], c, lw); pl([[x + s, y - s], [x - s, y + s]], c, lw); }
  function icSearch(x, y, s, c, lw) { circ(x - s * .15, y - s * .15, s * .62); stroke(c, lw); pl([[x + s * .32, y + s * .32], [x + s * .8, y + s * .8]], c, lw); }
  function icStar(x, y, r, c, filled, lw) {
    g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * .45 : r; g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    g.closePath(); g.lineJoin = 'round'; if (filled) { g.fillStyle = c; g.fill(); } g.strokeStyle = c; g.lineWidth = lw || 3; g.stroke();
  }
  function icBell(x, y, s, c, lw) {
    g.beginPath(); g.moveTo(x - s * .8, y + s * .5); g.quadraticCurveTo(x - s * .6, y + s * .2, x - s * .6, y - s * .2);
    g.arc(x, y - s * .2, s * .6, Math.PI, 0); g.quadraticCurveTo(x + s * .6, y + s * .2, x + s * .8, y + s * .5); g.closePath(); stroke(c, lw);
    pl([[x - s * .2, y + s * .8], [x + s * .2, y + s * .8]], c, lw);
  }
  function icSun(x, y, s, c, lw) { circ(x, y, s * .45); stroke(c, lw); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; pl([[x + Math.cos(a) * s * .75, y + Math.sin(a) * s * .75], [x + Math.cos(a) * s, y + Math.sin(a) * s]], c, lw); } }
  function icMoon(x, y, s, c, lw) { g.beginPath(); g.arc(x, y, s * .8, Math.PI * .35, Math.PI * 1.65); g.arc(x + s * .45, y - s * .1, s * .62, Math.PI * 1.45, Math.PI * .55, true); g.closePath(); stroke(c, lw); }
  function icLock(x, y, s, c, lw) { rr(x - s * .7, y - s * .1, s * 1.4, s, s * .2); stroke(c, lw); g.beginPath(); g.arc(x, y - s * .1, s * .45, Math.PI, 0); stroke(c, lw); }
  function icBolt(x, y, s, c, lw) { pl([[x + s * .2, y - s], [x - s * .5, y + s * .1], [x + s * .1, y + s * .1], [x - s * .2, y + s]], c, lw); }
  function icFolder(x, y, s, c) { g.fillStyle = c; rr(x - s, y - s * .6, s * .9, s * .4, s * .15); g.fill(); rr(x - s, y - s * .4, s * 2, s * 1.2, s * .2); g.fill(); }
  // логотип «стопка»: три скруглённые плашки уменьшающейся ширины
  function logo(x, y, s, c) {
    g.fillStyle = c;
    rr(x - s * .78, y + s * .28, s * 1.56, s * .38, s * .19); g.fill();
    rr(x - s * .62, y - s * .19, s * 1.24, s * .38, s * .19); g.fill();
    rr(x - s * .44, y - s * .66, s * .88, s * .38, s * .19); g.fill();
  }
  // спиннер из штрихов (как «Working»)
  function spinner(x, y, r, c, t, lw) {
    const n = 14; for (let i = 0; i < n; i++) { const a = t * 2.4 + i * TAU / n; g.beginPath(); g.arc(x, y, r, a, a + TAU / n * .55); stroke(c, lw || 4); }
  }

  // ---------- элементы интерфейса (рисуют от центра контейнера) ----------
  // кнопка отправки/добавления: контейнер fill:'navy', круг
  function uiSend(t, i) { const o = i.o, s = i.w * .2; if (o.icon === 'arrow') icArrowUp(0, 0, s, '#FFFFFF', i.w * .03); else icPlus(0, 0, s, '#FFFFFF', i.w * .032); }
  // таблетка статуса: o.label, o.num {from,to,t0,t1,suf}, o.done (время перехода в «готово»), o.doneLabel
  function uiStatus(t, i) {
    const o = i.o, x0 = -i.w / 2 + i.h * .55, sz = i.h * .4, done = o.done != null && t >= o.done;
    const c = done ? C.green : C.sky;
    if (done) icCheckCircle(x0, 0, i.h * .2, c, i.h * .03, eo(prog(t, o.done, o.done + .3)));
    else spinner(x0, 0, i.h * .2, c, t, i.h * .028);
    let s = done ? (o.doneLabel || 'Готово') : o.label || '';
    if (!done && o.num) { const n = o.num, v = Math.round(lerp(n.from, n.to, prog(t, n.t0, n.t1))); s += ' ' + v + (n.suf || ''); }
    txt(s, x0 + i.h * .42, 2, { size: sz, w: 400, c, max: i.w - i.h * 1.2 });
    if (o.badge && done) { // бейдж с номером справа
      const p = on(t, o.done + .35, .3); if (p > 0) {
        const bw = tw(o.badge, sz * .8, 600) + 40, bx = i.w / 2 - bw - i.h * .3;
        g.globalAlpha *= p; g.fillStyle = C.greenBg; rr(bx, -i.h * .22, bw, i.h * .44, 14); g.fill();
        txt(o.badge, bx + 20, 2, { size: sz * .8, w: 600, c: C.green }); g.globalAlpha /= p;
      }
    }
  }
  // карточка плана/диффа: o.title, o.plus, o.minus, o.rows [[время, текст, 'add'|'del'|'', t(подсветки)]], o.foot
  function planGeo(i) { const top = -i.h / 2, hh = 100, rh = (i.h - hh - 92) / i.o.rows.length; return { top, hh, rh }; }
  function uiPlan(t, i) {
    const o = i.o, L = -i.w / 2, R = i.w / 2, G2 = planGeo(i);
    icChevron(L + 40, G2.top + 50, 9, P.ink3, 3.5);
    circ(L + 78, G2.top + 50, 11); stroke(C.blue, 4);
    txt(o.title, L + 104, G2.top + 52, { size: 40, w: 600, max: i.w - 330 });
    let pl2 = 0, mi = 0; o.rows.forEach(r => { if (r[3] != null && t >= r[3]) { if (r[2] === 'add') pl2++; if (r[2] === 'del') mi++; } });
    txt('-' + mi, R - 130, G2.top + 52, { size: 34, w: 600, c: C.red, al: 'right', fam: 'mono' });
    txt('+' + pl2, R - 36, G2.top + 52, { size: 34, w: 600, c: C.green, al: 'right', fam: 'mono' });
    g.fillStyle = P.line; g.fillRect(L, G2.top + G2.hh, i.w, 2);
    o.rows.forEach((r, k) => {
      const y = G2.top + G2.hh + 14 + G2.rh * k, yc = y + G2.rh / 2, p = r[3] == null ? 0 : eo(prog(t, r[3], r[3] + .32));
      if (p > 0 && r[2]) {
        g.fillStyle = r[2] === 'add' ? C.greenBg : C.redBg; g.fillRect(L, y + 3, i.w * p, G2.rh - 6);
        g.fillStyle = r[2] === 'add' ? C.greenBar : C.red; g.fillRect(L, y + 3, 6, (G2.rh - 6) * Math.min(1, p * 2));
      }
      const col = p > .5 && r[2] === 'del' ? P.ink3 : P.ink;
      txt(r[0], L + 36, yc, { size: 32, c: P.ink3, fam: 'mono' });
      const w2 = txt(r[1], L + 170, yc, { size: 44, w: 450, c: col, max: i.w - 210 });
      if (p > .5 && r[2] === 'del') { g.fillStyle = col; g.fillRect(L + 170, yc + 1, w2 * eo(prog(t, r[3] + .1, r[3] + .4)), 3); }
    });
    g.fillStyle = P.line; g.fillRect(L, i.h / 2 - 78, i.w, 2);
    const fx = L + 36 + txt(o.foot || 'Изменено', L + 36, i.h / 2 - 38, { size: 32, c: P.ink2 }) + 16;
    const a = txt('+' + pl2, fx, i.h / 2 - 38, { size: 32, w: 600, c: C.green, fam: 'mono' });
    txt('-' + mi, fx + a + 18, i.h / 2 - 38, { size: 32, w: 600, c: C.red, fam: 'mono' });
  }
  // поле запроса с чипами: o.text, o.typed [t0,t1] (печать), o.chips [[текст, иконка?]], o.hover [[t, индекс|-1]], o.chipText {индекс: [[t, текст]]}
  function composerGeo(i) {
    const xs = []; let x = -i.w / 2 + 34;
    i.o.chips.forEach((c, k) => { const s = (i.o.chipText && i.o.chipText[k]) ? i.o.chipText[k][i.o.chipText[k].length - 1][1] : c[0]; const w = Math.max(tw(c[0], 36, 500), tw(s, 36, 500)) + (c[1] ? 112 : 76); xs.push({ x, w, cx: x + w / 2, y: i.h / 2 - 72 }); x += w + 14; });
    return xs;
  }
  function uiComposer(t, i) {
    const o = i.o, L = -i.w / 2;
    let s = o.text; if (o.typed) s = s.slice(0, Math.round(s.length * prog(t, o.typed[0], o.typed[1])));
    txt(s, L + 40, -i.h / 2 + 70, { size: 44, w: 450, max: i.w - 80 });
    if (o.typed && t < o.typed[1] + .6 && Math.floor(t * 3) % 2 === 0) { g.fillStyle = P.ink; g.fillRect(L + 44 + tw(s, 44, 450), -i.h / 2 + 46, 3, 50); }
    const hv = o.hover ? step(o.hover, t) : -1, geo = composerGeo(i);
    o.chips.forEach((c, k) => {
      const q = geo[k]; let label = c[0]; if (o.chipText && o.chipText[k]) label = step([[-1, c[0]]].concat(o.chipText[k]), t);
      if (k === hv) { g.fillStyle = P.hover; rr(q.x, q.y - 34, q.w, 68, 16); g.fill(); }
      let tx = q.x + 22;
      if (c[1] === 'dot') { circ(tx + 10, q.y, 10); g.fillStyle = C.teal; g.fill(); tx += 36; }
      if (c[1] === 'bell') { icBell(tx + 12, q.y, 15, P.ink2, 3); tx += 36; }
      const lw = txt(label, tx, q.y + 1, { size: 36, w: 500, c: P.ink2 });
      icChevron(tx + lw + 20, q.y + 2, 7, P.ink3, 3);
    });
    circ(i.w / 2 - 70, i.h / 2 - 72, 38); g.fillStyle = C.navy; g.fill(); icArrowUp(i.w / 2 - 70, i.h / 2 - 72, 15, '#FFFFFF', 4);
  }
  // меню со строками (как выбор модели): o.search, o.rows [{title, sub, badge, key, star}], o.hover [[t, i]], o.starAt {i: t}, o.rail (иконки слева), o.more
  function menuGeo(i) { const top = -i.h / 2, sh = 116, n = i.o.rows.length + (i.o.more ? 1 : 0), rh = (i.h - sh - 26) / n, x0 = -i.w / 2 + (i.o.rail ? 110 : 18); return { top, sh, rh, x0, row: k => top + sh + 8 + rh * k + rh / 2 }; }
  function uiMenu(t, i) {
    const o = i.o, R = i.w / 2, Q = menuGeo(i), x0 = Q.x0;
    if (o.rail) {
      g.fillStyle = P.line; g.fillRect(-i.w / 2 + 92, -i.h / 2, 2, i.h);
      const rx = -i.w / 2 + 46; icStar(rx, Q.top + 60, 17, P.ink, true, 2);
      icSun(rx, Q.top + 150, 17, C.gold, 3.5); icMoon(rx, Q.top + 232, 17, P.ink2, 3.5); icBolt(rx, Q.top + 314, 17, P.ink2, 3.5);
      g.fillStyle = C.teal; g.fillRect(-i.w / 2 + 89, Q.top + 126, 6, 48);
    }
    icSearch(x0 + 36, Q.top + 58, 17, P.ink2, 3.5);
    txt(o.search || 'Найти', x0 + 70, Q.top + 58, { size: 36, c: P.ink3, max: R - x0 - 110 });
    g.fillStyle = C.teal; g.fillRect(x0 + 14, Q.top + 100, R - x0 - 38, 3);
    const hv = o.hover ? trk(o.hover, t, 30, .85) : -9;
    if (hv > -1) { g.fillStyle = P.hover; rr(x0 + 4, Q.row(hv) - Q.rh / 2 + 6, R - x0 - 22, Q.rh - 12, 18); g.fill(); }
    o.rows.forEach((r, k) => {
      const y = Q.row(k), tx = x0 + 34;
      const w1 = txt(r.title, tx, y - 20, { size: 42, w: 500, max: R - tx - 230 });
      if (r.badge) { const bw = tw(r.badge, 24, 600) + 24; g.strokeStyle = C.blue; g.lineWidth = 2; rr(tx + w1 + 16, y - 39, bw, 38, 9); g.stroke(); txt(r.badge, tx + w1 + 28, y - 19, { size: 24, w: 600, c: C.blue }); }
      if (r.sub) txt(r.sub, tx, y + 24, { size: 30, c: P.ink2, max: R - tx - 230 });
      if (r.key) { g.fillStyle = P.chip; rr(R - 170, y - 22, 66, 44, 10); g.fill(); txt(r.key, R - 137, y + 1, { size: 26, w: 600, c: P.ink2, al: 'center', fam: 'mono' }); }
      const st = r.star || (o.starAt && o.starAt[k] != null && t >= o.starAt[k]);
      const sp2 = o.starAt && o.starAt[k] != null ? 1 + .35 * Math.sin(Math.PI * prog(t, o.starAt[k], o.starAt[k] + .25)) : 1;
      icStar(R - 60, y, 19 * sp2, st ? C.gold : P.ink, st, 3);
    });
    if (o.more) { const y = Q.row(o.rows.length); txt(o.more[0], x0 + 34, y - 18, { size: 40, w: 550 }); txt(o.more[1], x0 + 34, y + 24, { size: 30, c: P.ink2 }); icChevron(R - 60, y, 12, P.ink, 3.5, 'right'); }
  }
  // тумблер: x,y центр, v 0..1
  function toggle(x, y, v, s) {
    s = s || 1; const w = 96 * s, h = 56 * s; g.fillStyle = mix(P.off, C.teal, v); rr(x - w / 2, y - h / 2, w, h, h / 2); g.fill();
    const kx = lerp(x - w / 2 + h / 2, x + w / 2 - h / 2, v); circ(kx, y, h / 2 - 6 * s); g.fillStyle = '#FFFFFF'; g.fill();
  }
  // настройки с тумблерами: o.rows [{title, sub, on:[[t,0/1]...], key(строка вместо тумблера)}]
  function setGeo(i) { const n = i.o.rows.length, rh = (i.h - 20) / n; return { rh, row: k => -i.h / 2 + 10 + rh * k + rh / 2 }; }
  function uiSettings(t, i) {
    const o = i.o, L = -i.w / 2, R = i.w / 2, Q = setGeo(i);
    o.rows.forEach((r, k) => {
      const y = Q.row(k);
      if (k) { g.fillStyle = P.line; g.fillRect(L + 30, y - Q.rh / 2, i.w - 60, 2); }
      txt(r.title, L + 40, y - 22, { size: 42, w: 500, max: i.w - 230 });
      txt(r.sub, L + 40, y + 24, { size: 30, c: P.ink2, max: i.w - 230 });
      if (r.key) { const kw = tw(r.key, 30, 500, 'mono') + 34; g.strokeStyle = P.border; g.lineWidth = 2; rr(R - 40 - kw, y - 26, kw, 52, 12); g.stroke(); txt(r.key, R - 40 - kw / 2, y + 1, { size: 30, c: P.ink2, al: 'center', fam: 'mono' }); }
      else toggle(R - 90, y, clamp(trk(r.on || [[0, 0]], t, 28, .82), 0, 1));
    });
  }
  // выбор оформления: o.label, o.items ['Системная','Светлая','Тёмная'], o.sel [[t,i]], o.hover [[t,i]]
  function themesGeo(i) { const n = i.o.items.length, gap = 22, tw2 = (i.w - 60 - gap * (n - 1)) / n; return { tw: tw2, x: k => -i.w / 2 + 30 + k * (tw2 + gap), top: -i.h / 2 + 90, th: i.h - 120 }; }
  function miniUI(x, y, w, h, mode, accent) { // превью окна: sidebar + строки + полоса с точкой
    const lt = { bg: '#F7F8FA', side: '#E7EAF0', ln: '#D6D9E0' }, dk = { bg: '#1B1B1E', side: '#141416', ln: '#3A3A3F' };
    const draw1 = (A, cx, cw) => {
      g.save(); g.beginPath(); g.rect(cx, y, cw, h); g.clip();
      g.fillStyle = A.bg; rr(x, y, w, h, 16); g.fill(); g.fillStyle = A.side; g.fillRect(x, y, w * .3, h);
      for (let k = 0; k < 3; k++) { g.fillStyle = A.ln; rr(x + 14, y + 22 + k * 18, w * .3 - 28, 8, 4); g.fill(); }
      g.fillStyle = A.ln; rr(x + w * .36, y + 24, w * .5, 9, 4); g.fill(); rr(x + w * .36, y + 44, w * .34, 9, 4); g.fill();
      g.strokeStyle = A.ln; g.lineWidth = 2; rr(x + w * .3, y + h - 46, w * .64, 28, 14); g.stroke(); g.restore();
    };
    if (mode === 'split') { draw1(lt, x, w / 2); draw1(dk, x + w / 2, w / 2); } else draw1(mode === 'dark' ? dk : lt, x, w);
    circ(x + w * .9, y + h - 32, 9); g.fillStyle = accent; g.fill();
  }
  function uiThemes(t, i) {
    const o = i.o, Q = themesGeo(i), sel = trk(o.sel || [[0, 0]], t, 30, .85), hv = o.hover ? step(o.hover, t) : -1;
    txt(o.label || 'Оформление', -i.w / 2 + 34, -i.h / 2 + 48, { size: 32, c: P.ink2 });
    o.items.forEach((s, k) => {
      const x = Q.x(k), y = Q.top;
      g.strokeStyle = k === hv ? P.ink3 : P.border; g.lineWidth = 2; rr(x, y, Q.tw, Q.th, 22); g.stroke();
      miniUI(x + 16, y + 16, Q.tw - 32, Q.th * .62, k === 0 ? 'split' : k === 2 ? 'dark' : 'light', k === 1 ? C.teal : '#D94FB0');
      txt(s, x + Q.tw / 2, y + Q.th - 52, { size: 36, w: 500, al: 'center', max: Q.tw - 20 });
    });
    const sx = lerp(Q.x(0), Q.x(o.items.length - 1), sel / Math.max(1, o.items.length - 1));
    g.strokeStyle = C.teal; g.lineWidth = 4; rr(sx, Q.top, Q.tw, Q.th, 22); g.stroke();
    const ck = Math.round(sel); circ(Q.x(ck) + Q.tw - 30, Q.top + 30, 15); g.fillStyle = C.teal; g.fill(); icCheck(Q.x(ck) + Q.tw - 30, Q.top + 30, 13, '#FFFFFF', 3);
  }
  // сегменты-вкладки: items, sel (дробный), x, y, h
  function segGeo(items, x, y, size) { const xs = []; let cx = x + 8; items.forEach(s => { const w = tw(s, size, 500) + 44; xs.push({ x: cx, w }); cx += w + 4; }); return { xs, w: cx - x + 4 }; }
  function seg(items, x, y, sel, size, hv) {
    size = size || 30; const Q = segGeo(items, x, y, size), h = size * 2;
    g.fillStyle = P.chip; rr(x, y - h / 2, Q.w, h, 16); g.fill();
    const a = Q.xs[Math.floor(clamp(sel, 0, items.length - 1))], b = Q.xs[Math.ceil(clamp(sel, 0, items.length - 1))], f = sel - Math.floor(sel);
    g.fillStyle = DK > .5 ? '#2C2C30' : '#FFFFFF'; rr(lerp(a.x, b.x, f), y - h / 2 + 6, lerp(a.w, b.w, f), h - 12, 12); g.fill();
    items.forEach((s, k) => txt(s, Q.xs[k].x + Q.xs[k].w / 2, y + 1, { size, w: 500, c: Math.round(sel) === k ? P.ink : P.ink2, al: 'center' }));
    return Q;
  }
  // гладкая кривая через точки
  function curve(pts) {
    g.moveTo(pts[0][0], pts[0][1]);
    for (let k = 0; k < pts.length - 1; k++) {
      const p0 = pts[Math.max(0, k - 1)], p1 = pts[k], p2 = pts[k + 1], p3 = pts[Math.min(pts.length - 1, k + 2)];
      g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
  }
  // график: o.tabs, o.tab [[t,i]], o.periods, o.period, o.label, o.value(число или [[t,v]]), o.suf, o.legend, o.a (ряд 1), o.b (ряд 2), o.draw [t0,t1], o.days, o.tip {i,t0,t1,lines}
  function chartGeo(i) { const L = -i.w / 2 + 40, R = i.w / 2 - 30, top = -i.h / 2 + 330, bot = i.h / 2 - 86; return { L, R, top, bot }; }
  function uiChart(t, i) {
    const o = i.o, L = -i.w / 2, Q = chartGeo(i);
    const tab = o.tab ? trk(o.tab, t, 30, .85) : 0;
    seg(o.tabs || ['Дела', 'Часы'], L + 30, -i.h / 2 + 62, tab, 30);
    if (o.periods) { const pw = segGeo(o.periods, 0, 0, 30).w; seg(o.periods, i.w / 2 - 30 - pw, -i.h / 2 + 62, o.period || 0, 30); }
    const ti = Math.round(tab), lab = Array.isArray(o.label) ? o.label[ti] : o.label;
    txt(lab, L + 40, -i.h / 2 + 140, { size: 30, c: P.ink2 });
    const vk = Array.isArray(o.value) ? o.value : [[0, o.value]], v = trk(vk, t, 14, .95), vs = Math.abs(trk(vk, t + .02, 14, .95) - v) * 50;
    const vw = roll(Math.round(v), L + 40, -i.h / 2 + 206, { size: 84, w: 650, al: 'left', speed: vs });
    const suf = Array.isArray(o.suf) ? o.suf[ti] : o.suf; if (suf) txt(suf, L + 56 + vw, -i.h / 2 + 214, { size: 50, w: 550 });
    if (o.legend) { let lx = L + 40; o.legend.forEach((s, k) => { circ(lx + 8, -i.h / 2 + 270, 8); g.fillStyle = k ? C.salmon : P.ink; g.fill(); lx += 30 + txt(s, lx + 24, -i.h / 2 + 271, { size: 28, c: P.ink2 }) + 30; }); }
    for (let k = 0; k <= 4; k++) { const y = lerp(Q.top, Q.bot, k / 4); g.fillStyle = P.line; g.fillRect(Q.L + 50, y, Q.R - Q.L - 50, 2); txt(String(Math.round((o.max || 12) * (1 - k / 4))), Q.L + 34, y, { size: 24, c: P.ink3, al: 'right', fam: 'mono' }); }
    const days = o.days || ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
    const X = k => lerp(Q.L + 70, Q.R - 10, k / (days.length - 1)), Y = v2 => lerp(Q.bot, Q.top, v2 / (o.max || 12));
    days.forEach((d, k) => txt(d, X(k), Q.bot + 40, { size: 26, c: P.ink3, al: 'center', fam: 'mono' }));
    const sw = o.swap ? eio(prog(t, o.swap[0], o.swap[0] + .5)) : 0;
    const ser = (A, B) => A.map((v2, k) => [X(k), Y(lerp(v2, B ? B[k] : v2, sw))]);
    const pa = ser(o.a, o.a2), pb = o.b ? ser(o.b, o.b2) : null, dp = o.draw ? eio(prog(t, o.draw[0], o.draw[1])) : 1;
    g.save(); g.beginPath(); g.rect(Q.L, Q.top - 40, (Q.R - Q.L + 20) * dp, Q.bot - Q.top + 60); g.clip();
    // заливка под рядом 2 (лосось)
    if (pb) {
      const gr = g.createLinearGradient(0, Q.top, 0, Q.bot); gr.addColorStop(0, rgba(C.salmon, DK > .5 ? .38 : .28)); gr.addColorStop(1, rgba(C.salmon, .03));
      g.beginPath(); curve(pb); g.lineTo(pb[pb.length - 1][0], Q.bot); g.lineTo(pb[0][0], Q.bot); g.closePath(); g.fillStyle = gr; g.fill();
      g.beginPath(); curve(pb); stroke(C.salmon, 5);
    }
    g.beginPath(); curve(pa); stroke(DK > .5 ? '#E9E9EC' : '#2A2D33', 5);
    g.restore();
    if (o.tip) { // подсказка у точки
      const p = Math.min(on(t, o.tip.t0, .2), 1 - on(t, o.tip.t1, .15)); if (p > 0) {
        const x = X(o.tip.i); g.globalAlpha *= p;
        g.fillStyle = P.ink3; g.fillRect(x - 1, Q.top, 2, Q.bot - Q.top);
        const pt = pa[o.tip.i]; circ(pt[0], pt[1], 9); g.fillStyle = P.ink; g.fill();
        if (pb) { const pq = pb[o.tip.i]; circ(pq[0], pq[1], 9); g.fillStyle = C.salmon; g.fill(); }
        const lines = o.tip.lines, bw = Math.max.apply(null, lines.map(s => tw(s, 30, 500))) + 48, bx = clamp(x - bw / 2, Q.L, Q.R - bw), by = Q.top - 30;
        g.fillStyle = DK > .5 ? '#1E1E22' : '#FFFFFF'; g.strokeStyle = P.border; g.lineWidth = 2; rr(bx, by, bw, 42 * lines.length + 22, 14); g.fill(); g.stroke();
        lines.forEach((s, k) => txt(s, bx + 24, by + 32 + k * 42, { size: 30, w: k ? 400 : 600, c: k ? P.ink2 : P.ink }));
        g.globalAlpha /= p;
      }
    }
  }
  // полосы лимитов: o.rows [{label, v (0..1), t0, color}]
  function uiBars(t, i) {
    const o = i.o, L = -i.w / 2 + 40, n = o.rows.length, rh = (i.h - 60) / n;
    o.rows.forEach((r, k) => {
      const y = -i.h / 2 + 30 + rh * k + rh / 2, v = r.v * eo(prog(t, r.t0 || 0, (r.t0 || 0) + .6));
      txt(r.label, L, y - 26, { size: 30, c: P.ink2 });
      roll(Math.round(v * 100), L, y + 22, { size: 48, w: 650, al: 'left' }); txt('%', L + 64, y + 26, { size: 30, c: P.ink2 });
      const bx = L + 150, bw = i.w - 230; g.fillStyle = P.chip; rr(bx, y - 18, bw, 36, 10); g.fill();
      g.fillStyle = r.color || C.salmon; rr(bx, y - 18, Math.max(12, bw * v), 36, 10); g.fill();
    });
  }
  // слайдер: o.label, o.v [[t, 0..1]], o.suf
  function uiSlider(t, i) {
    const o = i.o, v = clamp(trk(o.v, t, 26, .85), 0, 1), L = -i.w / 2 + 40;
    txt(o.label, L, -24, { size: 40, w: 600 }); txt(o.sub || '', L, 24, { size: 28, c: P.ink2, max: i.w * .4 });
    const x0 = i.w * .02, x1 = i.w / 2 - 50; txt(Math.round(lerp(o.from || 0, o.to || 100, v)) + (o.suf || '%'), x0 - 30, 2, { size: 30, w: 600, al: 'right', fam: 'mono' });
    g.fillStyle = P.off; rr(x0, -5, x1 - x0, 10, 5); g.fill(); g.fillStyle = C.teal; rr(x0, -5, (x1 - x0) * v, 10, 5); g.fill();
    circ(lerp(x0, x1, v), 0, 22); g.fillStyle = '#FFFFFF'; g.fill(); g.strokeStyle = P.border; g.lineWidth = 2; g.stroke();
  }
  // чёрная карточка с заголовком (единственный крупный текст в стиле): o.brand, o.text, o.t0, o.size
  function uiHeadline(t, i) {
    const o = i.o, L = -i.w / 2 + 56;
    logo(L + 20, -i.h / 2 + 62, 26, '#FFFFFF'); txt(o.brand || '', L + 64, -i.h / 2 + 64, { size: 32, w: 500, c: 'rgba(255,255,255,.62)' });
    words(t, o.t0 != null ? o.t0 : i.t0 + .25, o.text, L, -i.h / 2 + 190, { size: o.size || 88, w: 650, max: i.w - 112, c: '#FFFFFF', acc: o.acc || '#9FD8C9', stagger: o.stagger || .16 });
  }
  // уведомление: o.title, o.sub, o.done (время), o.badge
  function uiToast(t, i) {
    const o = i.o, L = -i.w / 2, done = o.done != null && t >= o.done, ix = L + 66;
    if (done) icCheckCircle(ix, -2, 26, C.green, 4, eo(prog(t, o.done, o.done + .3))); else spinner(ix, -2, 24, C.sky, t, 4);
    const ty = done ? -28 : 0, ty2 = lerp(0, ty, eo(prog(t, o.done || 99, (o.done || 99) + .25)));
    txt(o.title, L + 122, ty2, { size: 42, w: 550, max: i.w - 230 });
    if (done) {
      const p = on(t, o.done + .05, .25), sw2 = txt(o.sub, L + 122, 30, { size: 32, c: P.ink2, a: p });
      if (o.badge) { const pb = on(t, o.done + .45, .3), bw = tw(o.badge, 30, 550) + 36, bx = L + 122 + sw2 + 20;
        if (pb > 0) { g.globalAlpha *= pb; g.fillStyle = C.purpleBg; rr(bx, 8, bw, 46, 12); g.fill(); txt(o.badge, bx + 18, 32, { size: 30, w: 550, c: C.purple }); g.globalAlpha /= pb; } }
    }
    icClose(i.w / 2 - 60, 0, 12, P.ink2, 3.5);
  }
  // телефон: контейнер fill:'phone'; o.title, o.badge, o.items [[название, подпись, t(галочки)]], o.input
  function uiPhone(t, i) {
    const o = i.o, bz = 18, w = i.w - bz * 2, h = i.h - bz * 2, L = -w / 2, T = -h / 2;
    g.fillStyle = '#FFFFFF'; rr(L, T, w, h, 64); g.fill();
    g.save(); rr(L, T, w, h, 64); g.clip();
    txt('9:41', L + 64, T + 52, { size: 28, w: 600, c: '#0E0F12' });
    g.fillStyle = '#0E0F12'; rr(-70, T + 22, 140, 40, 20); g.fill();
    for (let k = 0; k < 4; k++) { g.fillRect(w / 2 - 150 + k * 10, T + 60 - 8 - k * 4, 6, 8 + k * 4); }
    rr(w / 2 - 88, T + 42, 44, 20, 6); g.strokeStyle = '#0E0F12'; g.lineWidth = 2.5; g.stroke(); g.fillRect(w / 2 - 85, T + 45, 30, 14);
    const lw = txt(o.title, L + 40, T + 140, { size: 56, w: 700, c: '#0E0F12' });
    if (o.badge) { const bw = tw(o.badge, 22, 600) + 22; g.fillStyle = '#EEF0F3'; rr(L + 56 + lw, T + 124, bw, 34, 9); g.fill(); txt(o.badge, L + 67 + lw, T + 142, { size: 22, w: 600, c: '#6B7079' }); }
    o.items.forEach((it, k) => {
      const y = T + 250 + k * 118, p = it[2] == null ? 0 : eo(prog(t, it[2], it[2] + .3)), ap = on(t, i.t0 + .15 + k * .06, .3);
      g.globalAlpha *= ap; const yy = y + (1 - ap) * 20;
      if (k) { g.fillStyle = '#EEEFF2'; g.fillRect(L + 40, yy - 59, w - 80, 2); }
      circ(L + 66, yy, 22); if (p > 0) { g.fillStyle = mix('#FFFFFF', C.green, p); g.fill(); icCheck(L + 66, yy, 18, '#FFFFFF', 3.5, p); } else stroke('#C5C9D0', 3);
      const tw3 = txt(it[0], L + 108, yy - 18, { size: 38, w: 550, c: mix('#0E0F12', '#A3A8B1', p), max: w - 160 });
      if (p > 0) { g.fillStyle = '#A3A8B1'; g.fillRect(L + 108, yy - 17, tw3 * p, 3); }
      txt(it[1], L + 108, yy + 24, { size: 28, c: '#8A8F98', max: w - 160 });
      g.globalAlpha /= ap;
    });
    const by = h / 2 - 90; g.fillStyle = '#F4F5F8'; rr(L + 28, by - 46, w - 56, 92, 46); g.fill();
    icPlus(L + 76, by, 14, '#6B7079', 3.5); txt(o.input || '', L + 112, by + 1, { size: 32, c: '#A3A8B1', max: w - 260 });
    circ(w / 2 - 76, by, 34); g.fillStyle = C.navy; g.fill(); icArrowUp(w / 2 - 76, by, 14, '#FFFFFF', 4);
    g.restore();
  }
  // счётчик: o.from, o.to, o.t0, o.t1, o.label, o.lines [[текст, t]]
  function uiCounter(t, i) {
    const o = i.o, p = eo(prog(t, o.t0, o.t1)), v = lerp(o.from, o.to, p), vp = lerp(o.from, o.to, eo(prog(t - .02, o.t0, o.t1)));
    const y0 = o.lines && o.lines.length ? -i.h / 2 + 150 : -20;
    g.font = font(150, 700); const nw = g.measureText(fmt(o.to)).width;
    logo(-nw / 2 - 54, y0, 34, P.ink);
    roll(v, 26, y0, { size: 150, w: 700, speed: (v - vp) * 50 });
    txt(o.label || '', 0, y0 + 100, { size: 32, c: P.ink2, al: 'center' });
    (o.lines || []).forEach((l, k) => { const a = on(t, l[1], .25); if (a > 0) txt(l[0], 0, y0 + 210 + k * 64 + (1 - a) * 12, { size: 42, w: k ? 600 : 450, al: 'center', a, max: i.w - 80 }); });
  }
  // иконка приложения: контейнер fill:'black', квадрат со скруглением 0,25
  function uiIcon(t, i) { logo(0, 0, i.w * .3, '#FFFFFF'); }
  // поиск по списку с печатью: o.query, o.typed [t0,t1], o.items [[название, подпись, ключ]], o.hover [[t,i]]
  function uiSearch(t, i) {
    const o = i.o, L = -i.w / 2, R = i.w / 2, n = Math.round(o.query.length * prog(t, o.typed[0], o.typed[1])), q = o.query.slice(0, n).toLowerCase();
    icSearch(L + 50, -i.h / 2 + 56, 17, P.ink2, 3.5);
    const qw = q ? txt(o.query.slice(0, n), L + 86, -i.h / 2 + 56, { size: 40 }) : txt(o.placeholder || 'Найти', L + 86, -i.h / 2 + 56, { size: 40, c: P.ink3 });
    if (Math.floor(t * 3) % 2 === 0) { g.fillStyle = P.ink; g.fillRect(L + 90 + (q ? qw : 0), -i.h / 2 + 34, 3, 44); }
    g.fillStyle = P.line; g.fillRect(L, -i.h / 2 + 108, i.w, 2);
    txt(o.section || 'ЗАДАЧИ', L + 40, -i.h / 2 + 146, { size: 24, w: 600, c: P.ink3 });
    const vis = o.items.filter(it => !q || it.some(s => s && s.toLowerCase().includes(q)));
    const hv = o.hover ? step(o.hover, t) : 0;
    vis.forEach((it, k) => {
      const y = -i.h / 2 + 210 + k * 96;
      if (k === hv) { g.fillStyle = P.hover; rr(L + 16, y - 42, i.w - 32, 84, 14); g.fill(); }
      g.fillStyle = mix(C.greenBg, C.purpleBg, (k % 3) / 2); rr(L + 40, y - 18, 36, 36, 9); g.fill();
      txt(it[0], L + 96, y, { size: 38, w: 500, max: i.w * .55 }); if (it[1]) txt(it[1], R - 40, y, { size: 28, c: P.ink3, al: 'right', max: i.w * .3 });
    });
  }

  // ---------- звуки ----------
  // cutSounds(s, list): list [[t, вид]]; вид: 'click' | 'morph' | 'toggle' | 'type' | 'tick' | 'done' | 'dark' | 'roll'
  function cutSounds(s, list) {
    const M = { click: ['click', .15], morph: ['pop_soft', .1], toggle: ['toggle_on', .14], toggleOff: ['toggle_off', .12], type: ['key_soft', .1], tick: ['tick', .1],
      done: ['success', .13], dark: ['bubble_down', .12], roll: ['odometer', .13], notify: ['notify', .13], star: ['pop_high', .11], scene: ['marimba', .1], end: ['ta_da', .13] };
    list.forEach(e => { const m = M[e[1]] || [e[1], .12]; s.play(e[0], m[0], e[2] || m[1], { pitch: e[3] || 1 }); });
  }

  return { C, LIGHT, DARK, SANS, MONOS, SAFE, W, H, CX, CY, MD, begin, dark, pal: () => P, clamp, lerp, prog, eo, eio, sp, trk, step, on, scene,
    mix, rgba, rr, circ, stroke, pl, font, mono, txt, tw, wrap, words, fmt, roll, blurDraw, shadow, hero, heroAt, curPos, cursor, arrow,
    icPlus, icArrowUp, icCheck, icCheckCircle, icChevron, icClose, icSearch, icStar, icBell, icSun, icMoon, icLock, icBolt, icFolder, logo, spinner,
    uiSend, uiStatus, uiPlan, planGeo, uiComposer, composerGeo, uiMenu, menuGeo, toggle, uiSettings, setGeo, uiThemes, themesGeo, miniUI, seg, segGeo,
    curve, uiChart, chartGeo, uiBars, uiSlider, uiHeadline, uiToast, uiPhone, uiCounter, uiIcon, uiSearch, cutSounds };
})();
