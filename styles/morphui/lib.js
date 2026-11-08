// lib.js
const MORF = (() => {
  const C = { bg: '#E7E3DC', paper: '#F6F1E9', ink: '#121212', white: '#FFFFFF', acc: '#FF5B1F', gray: '#8A857D',
    dim: '#55504A', faint: '#9A958D', track: '#DCD8D1', line: '#E6E2DB', stroke: '#CFCAC2', soft: 'rgba(0,0,0,0.06)' };
  const SANS = '"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif';
  const SERIF = '"DejaVu Serif",Georgia,"Noto Serif","Times New Roman",serif';
  const MONOS = '"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace';
  const SAFE = { x0: 60, x1: 1020, y0: 110, y1: 1690 };
  const TAU = Math.PI * 2;
  let g = null, BPM = 120;
  function begin(k, bpm) { g = k.g; if (bpm) BPM = bpm; return g; }
  const font = (s, w) => (w || 600) + ' ' + Math.max(1, Math.round(s)) + 'px ' + SANS;
  const mono = (s, w) => (w || 500) + ' ' + Math.max(1, Math.round(s)) + 'px ' + MONOS;
  const FAM = { sans: font, mono, serif: (s, w) => (w || 400) + ' ' + Math.max(1, Math.round(s)) + 'px ' + SERIF };
  // ---------- математика и движение ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const prog = (t, a, b) => clamp((t - a) / ((b - a) || 1e-6), 0, 1);
  const eo = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
  const eio = x => { x = clamp(x, 0, 1); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  function sp(x, w, z) { // переходная функция пружины, z<1 даёт крошечный перелёт
    if (x <= 0) return 0; w = w || 18; z = Math.min(z || 0.78, 0.999);
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + z * w / wd * Math.sin(wd * x));
  }
  function trk(keys, t, w, z) { // много целей подряд = сумма пружин, чистая функция от t
    let v = keys[0][1];
    for (let i = 1; i < keys.length; i++) v += (keys[i][1] - keys[i - 1][1]) * sp(t - keys[i][0], w, z);
    return v;
  }
  const pulse = (t, t0, hold, w) => sp(t - t0, w || 40, .9) - sp(t - t0 - (hold || .12), w || 40, .9);
  const press = (t, clicks) => clamp(clicks.reduce((a, c) => a + pulse(t, c[0], c[1]), 0), 0, 1);
  function beat(t, t0) { const B = 60 / BPM, x = (t - (t0 || 0)) / B, i = Math.floor(x); return { i, f: x - i, B }; }
  function beatPulse(t, t0) { const b = beat(t, t0); return Math.exp(-b.f * b.B * 9); }
  function hold(t, a, b, inD, outD) { inD = inD || .3; outD = outD || inD / 1.4; return eo(prog(t, a, a + inD)) * (1 - eo(prog(t, b - outD, b))); }
  const stretch = (over, max, soft) => (max || 110) * (1 - Math.exp(-Math.max(0, over) / (soft || 150)));
  const relax = (t, tR) => t < tR ? 1 : 1 - sp(t - tR, 15, .72);
  const push = (t, a, b, amt) => 1 + (amt || .04) * eio(prog(t, a, b));
  const drift = t => ({ x: Math.sin(t * Math.PI / 8) * 8, y: Math.cos(t * Math.PI / 4) * 6 });
  function shade(c, acc) {
    const v = 18 + clamp(c, 0, 1) * 237, a = clamp(acc || 0, 0, 1);
    return 'rgb(' + Math.round(v + (255 - v) * a) + ',' + Math.round(v + (91 - v) * a) + ',' + Math.round(v + (31 - v) * a) + ')';
  }
  // ---------- примитивы ----------
  function rr(x, y, w, h, r) {
    w = Math.max(w, .01); h = Math.max(h, .01); r = Math.max(0, Math.min(r, w / 2, h / 2));
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function circ(x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0, r), 0, TAU); }
  function line(x1, y1, x2, y2, col, lw) {
    g.strokeStyle = col || C.ink; g.lineWidth = lw || 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  }
  function poly(pts, p, col, lw) { // ломаная, нарисованная на долю p
    if (col) g.strokeStyle = col; if (lw) g.lineWidth = lw; g.lineCap = g.lineJoin = 'round';
    const L = []; let tot = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(d); tot += d; }
    let left = tot * clamp(p, 0, 1); if (left <= 0) return;
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length && left > 0; i++) {
      const f = L[i - 1] ? Math.min(1, left / L[i - 1]) : 1;
      g.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)); left -= L[i - 1];
    }
    g.stroke();
  }
  // ---------- текст ----------
  function fitSize(s, size, max, wt, fam) {
    g.font = FAM[fam || 'sans'](size, wt); const w = g.measureText(s).width;
    return max && w > max ? size * max / w : size;
  }
  function guard(x, w, al) { // держит текст в x 60…1020 экрана с учётом текущей матрицы
    let m = null; try { m = g.getTransform && g.getTransform(); } catch (e) { m = null; }
    if (!m || !m.a) return { x, k: 1 };
    const sc = Math.abs(m.a), room = SAFE.x1 - SAFE.x0, k = w * sc > room ? room / (w * sc) : 1, w2 = w * k;
    const L = al === 'center' ? x - w2 / 2 : al === 'right' ? x - w2 : x, sl = m.e + m.a * L, sr = sl + w2 * m.a;
    const d = sl < SAFE.x0 ? SAFE.x0 - sl : sr > SAFE.x1 ? SAFE.x1 - sr : 0;
    return { x: x + d / m.a, k };
  }
  function txt(s, x, y, o) { // o: size, weight, color, align, max, fam
    o = o || {}; s = String(s); const fam = FAM[o.fam || 'sans'];
    let sz = fitSize(s, o.size || 44, o.max, o.weight, o.fam); g.font = fam(sz, o.weight);
    let w = g.measureText(s).width; const q = guard(x, w, o.align);
    if (q.k < 1) { sz *= q.k; g.font = fam(sz, o.weight); w = g.measureText(s).width; }
    g.fillStyle = o.color || C.ink; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'middle';
    g.fillText(s, q.x, y); return w;
  }
  const lineW = (L, l) => l.reduce((a, i) => a + L.ws[i], 0) + L.sw * (l.length - 1);
  function wrap(words, size, wt, max, fam) { // переносы + без одиночного слова в последней строке
    g.font = FAM[fam || 'sans'](size, wt);
    const R = { sw: g.measureText(' ').width, ws: words.map(w => g.measureText(w).width), lines: [] };
    let cur = [], cw = 0;
    words.forEach((w, i) => {
      const add = (cur.length ? R.sw : 0) + R.ws[i];
      if (cur.length && cw + add > max) { R.lines.push(cur); cur = [i]; cw = R.ws[i]; } else { cur.push(i); cw += add; }
    });
    if (cur.length) R.lines.push(cur);
    for (let li = R.lines.length - 1; li > 0; li--) {
      const L = R.lines[li], P = R.lines[li - 1];
      if (L.length === 1 && P.length > 2) { L.unshift(P.pop()); if (lineW(R, L) > max) P.push(L.shift()); }
    }
    return R;
  }
  function words(t, t0, text, x, y, o) { // по словам, *слово* = акцент
    o = o || {}; const fam = o.fam || 'sans', wt = o.weight || 700;
    const raw = String(text).split(/\s+/).filter(Boolean); if (!raw.length) return null;
    const key = raw.map(w => w.indexOf('*') >= 0), ws = raw.map(w => w.replace(/\*/g, ''));
    const al = o.align || 'center';
    const room = al === 'center' ? 2 * Math.min(x - SAFE.x0, SAFE.x1 - x) : al === 'right' ? x - SAFE.x0 : SAFE.x1 - x;
    const max = Math.max(100, Math.min(o.max || 940, room)), ml = o.maxLines || 3, lh = o.lh || 1.12;
    let sz = o.size || 64, L;
    for (let k = 0; k < 10; k++) {
      L = wrap(ws, sz, wt, max, fam);
      const wide = L.lines.some(l => lineW(L, l) > max + .5), orphan = L.lines.length > 1 && L.lines.some(l => l.length < 2);
      if (!wide && !orphan && L.lines.length <= ml) break; sz *= .92;
    }
    const n = L.lines.length, step = sz * lh, st = o.stagger || .14, du = o.dur || .26;
    const t1 = o.t1 == null ? 1e9 : o.t1, ao = 1 - eo(prog(t, t1 - (o.out || .15), t1)), rise = o.rise == null ? 30 : o.rise;
    const y0 = clamp(y - (n - 1) * step / 2, SAFE.y0 + sz / 2, SAFE.y1 - (n - 1) * step - sz / 2);
    let idx = 0; g.textAlign = 'left'; g.textBaseline = 'middle';
    L.lines.forEach((l, li) => {
      const w = lineW(L, l); let cx = al === 'center' ? x - w / 2 : al === 'right' ? x - w : x;
      l.forEach(i => {
        const a = o.instant && idx === 0 ? 1 : eo(prog(t, t0 + .06 + idx * st, t0 + .06 + idx * st + du));
        if (a * ao > .003) {
          g.save(); g.globalAlpha *= a * ao; g.font = FAM[fam](sz, wt);
          g.fillStyle = key[i] ? (o.acc || C.acc) : (o.color || C.ink); g.fillText(ws[i], cx, y0 + li * step + (1 - a) * rise); g.restore();
        }
        cx += L.ws[i] + L.sw; idx++;
      });
    });
    return { size: sz, lines: n, h: n * step };
  }
  function caption(t, list, o) { // list: [[t0, t1, 'Одна *кнопка*'], ...]
    o = o || {}; const i = list.findIndex(c => t >= c[0] && t < c[1]); if (i < 0) return null;
    const c = list[i], last = i === list.length - 1;
    return words(t, c[0], c[2], o.x || 540, o.y || 540, Object.assign({ size: 112, weight: 750, t1: last ? 1e9 : c[1], instant: c[0] <= 0 }, o));
  }
  function plate(x, y, text, o) { // чёрная пилюля; o.outline = контурный тег
    o = o || {}; const p = o.p == null ? 1 : o.p; if (p <= .01) return;
    const fam = o.outline ? 'mono' : 'sans', wt = o.outline ? 500 : 650, pad = o.pad || 28;
    const s2 = fitSize(text, o.size || 36, Math.min(o.max || 900, 960) - 2 * pad, wt, fam);
    g.font = FAM[fam](s2, wt); const w = g.measureText(text).width + 2 * pad, h = s2 * 1.9, q = guard(x, w, o.align || 'center');
    const cx = o.align === 'left' ? q.x + w / 2 : o.align === 'right' ? q.x - w / 2 : q.x;
    g.save(); g.globalAlpha *= clamp(p, 0, 1); g.translate(cx, y + (1 - p) * 16); rr(-w / 2, -h / 2, w, h, h / 2);
    if (o.outline) { g.strokeStyle = C.stroke; g.lineWidth = 3; g.stroke(); } else { g.fillStyle = o.bg || C.ink; g.fill(); }
    txt(text, 0, 2, { size: s2, weight: wt, fam, color: o.color || (o.outline ? C.gray : '#fff'), align: 'center' }); g.restore();
  }
  const note = (x, y, text, o) => txt(text, x, y, Object.assign({ size: 26, fam: 'mono', color: C.gray }, o));
  const clock = sec => { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); };
  function counter(t, t0, t1, from, to, x, y, o) {
    o = o || {}; const v = Math.round(lerp(from, to, eo(prog(t, t0, t1))));
    const s = (o.pre || '') + String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') + (o.suf || '');
    txt(s, x, y, Object.assign({ size: 96, weight: 750 }, o)); return v;
  }
  function badge(t, t0, x, y, text, o) { // штамп-метка: пилюля с галочкой, пружинит
    o = o || {}; const s = sp(t - t0, 22, .75) * (o.t1 ? 1 - eo(prog(t, o.t1 - .15, o.t1)) : 1); if (s <= .01) return;
    const s2 = fitSize(text, o.size || 40, 700, 650); g.font = font(s2, 650);
    const w = g.measureText(text).width + s2 * 3, h = s2 * 1.9, q = guard(x, w, 'center');
    g.save(); g.translate(q.x, y); g.scale(s, s); g.globalAlpha *= clamp(s, 0, 1);
    rr(-w / 2, -h / 2, w, h, h / 2); g.fillStyle = o.bg || C.ink; g.fill();
    const cx = -w / 2 + h / 2 + 4; g.fillStyle = '#fff'; circ(cx, 0, h * .3); g.fill();
    poly([[cx - h * .13, 0], [cx - h * .04, h * .1], [cx + h * .14, -h * .1]], eo(prog(t, t0 + .1, t0 + .35)), o.bg || C.ink, 4);
    txt(text, cx + h * .45, 2, { size: s2, weight: 650, color: '#fff' }); g.restore();
  }
  function beatBar(t, o) { // ряд долей: текущая подпрыгивает
    o = o || {}; const n = o.n || 32, B = 60 / BPM, w = Math.min(o.w || 640, 900), stp = w / n;
    const bw = Math.max(3, Math.min(8, stp * .45)), x0 = 540 - w / 2 + (stp - bw) / 2, y = o.y || 1600;
    const raw = Math.floor((t - (o.t0 || 0)) / B), cb = ((raw % n) + n) % n;
    for (let i = 0; i < n; i++) {
      const hh = i === cb ? 12 + 18 * sp(t - (o.t0 || 0) - raw * B, 30, .8) : 12;
      rr(x0 + i * stp, y - hh / 2, bw, hh, bw / 2); g.fillStyle = i <= cb ? C.ink : 'rgba(0,0,0,.16)'; g.fill();
    }
  }
  // ---------- фон ----------
  let DOTS = null;
  function dots() {
    if (DOTS) return DOTS; DOTS = new OffscreenCanvas(1240, 2080); const c = DOTS.getContext('2d'); c.fillStyle = 'rgba(0,0,0,0.07)';
    for (let y = 0; y < 2080; y += 44) for (let x = 0; x < 1240; x += 44) { c.beginPath(); c.arc(x + 22, y + 22, 2.2, 0, TAU); c.fill(); }
    return DOTS;
  }
  function bg(t, cam) {
    g.fillStyle = C.bg; g.fillRect(0, 0, 1080, 1920);
    const d = drift(t), s = 1 + ((cam || 1) - 1) * 0.1;
    g.save(); g.translate(540 + d.x * .4, 1000 + d.y * .4); g.scale(s, s); g.drawImage(dots(), -620, -1040); g.restore();
  }
  // ---------- герой: одна фигура ----------
  function states(list) { // [t, вид, w, h, r, c 0..1, cam]
    const L = list.map(s => Array.isArray(s) ? s : [s.t, s.k, s.w, s.h, s.r, s.c, s.cam]), tk = j => L.map(s => [s[0], s[j]]), segs = [];
    L.forEach((s, i) => {
      const e = i + 1 < L.length ? L[i + 1][0] : 1e9, P = segs[segs.length - 1];
      if (P && P.k === s[1]) P.e = e; else segs.push({ k: s[1], s: s[0], e, c: s[5] });
    });
    return { L, w: tk(2), h: tk(3), r: tk(4), c: tk(5), cam: tk(6), segs };
  }
  const stateAt = (S, t) => ({ w: trk(S.w, t), h: trk(S.h, t), r: trk(S.r, t), c: clamp(trk(S.c, t, 14, .9), 0, 1), cam: trk(S.cam, t, 10, .86) });
  function segDraw(s, t, fn, info) { // смена содержимого с коротким «блюром»
    const a = (s.s <= 0 ? 1 : eo(prog(t, s.s + .08, s.s + .3))) * (1 - prog(t, s.e - .14, s.e - .02));
    if (a <= .003) return; const k = 1 - a;
    g.save(); g.globalAlpha *= a; g.translate(0, k * 14); g.scale(1 - k * .06, 1 - k * .06); fn(t, info);
    if (k > .05) { g.globalAlpha = a * .35; g.translate(0, -k * 12); fn(t, info); }
    g.restore();
  }
  function hero(S, t, content, o) {
    o = o || {}; const st = stateAt(S, t), d = drift(t), ext = o.ext || 0, w = st.w + ext;
    const sc = Math.min(st.cam * (o.zoom || 1), 940 / Math.max(w, 1), 900 / Math.max(st.h, 1)) * (1 - .02 * clamp(o.press || 0, 0, 1));
    const cx = (o.cx || 540) + d.x, cy = (o.cy || 1060) + d.y;
    g.save(); g.translate(cx, cy); g.scale(sc, sc);
    if (o.shadow !== false) { g.shadowColor = 'rgba(0,0,0,0.13)'; g.shadowBlur = 50; g.shadowOffsetY = 18; }
    rr(ext / 2 - w / 2, -st.h / 2, w, st.h, st.r); g.fillStyle = shade(st.c, o.acc); g.fill();
    g.shadowColor = 'rgba(0,0,0,0)'; g.shadowBlur = 0; g.shadowOffsetY = 0; g.clip();
    S.segs.forEach(s => {
      if (t >= s.s - .01 && t < s.e && content[s.k]) {
        const dk = s.c < .5;
        segDraw(s, t, content[s.k], { w: st.w, h: st.h, c: st.c, dark: dk, fg: dk ? '#fff' : C.ink, t0: s.s, t1: s.e, p: prog(t, s.s, s.e) });
      }
    });
    g.restore(); return { cx, cy, sc, st };
  }
  // ---------- курсор ----------
  const ARROW = [[0, 0], [0, 40], [10, 31], [17, 46], [24, 43], [17, 29], [30, 29]];
  const curPos = (keys, t) => ({ x: trk(keys.map(k => [k[0], k[1]]), t, 13, .85), y: trk(keys.map(k => [k[0], k[2]]), t, 13, .85) });
  function cursor(t, H, keys, pr) {
    const c = curPos(keys, t), s = 1.3 * (1 - .12 * clamp(pr || 0, 0, 1));
    const x = clamp(H.cx + c.x * H.sc, SAFE.x0, SAFE.x1 - 40), y = clamp(H.cy + c.y * H.sc, SAFE.y0, SAFE.y1 - 60);
    g.save(); g.translate(x, y); g.scale(s, s); g.beginPath(); ARROW.forEach(p => g.lineTo(p[0], p[1])); g.closePath();
    g.lineJoin = 'round'; g.strokeStyle = '#fff'; g.lineWidth = 4; g.stroke(); g.fillStyle = C.ink; g.fill(); g.restore();
    return c;
  }
  function liquid(keys, t, step, L0, R0) { // жидкий индикатор: передний край быстрый, задний догоняет
    let L = L0 + keys[0][1] * step, R = R0 + keys[0][1] * step;
    for (let i = 1; i < keys.length; i++) {
      const d = (keys[i][1] - keys[i - 1][1]) * step, f = sp(t - keys[i][0], 24, .8), s = sp(t - keys[i][0], 12, .88);
      if (d > 0) { R += d * f; L += d * s; } else { L += d * f; R += d * s; }
    }
    return [L, R];
  }
  // ---------- иконки (штрих 4-6, круглые концы) ----------
  function icArrow(x, y, s, col, lw) {
    s = s || 1; g.strokeStyle = col || C.ink; g.lineWidth = lw || 5; g.lineCap = g.lineJoin = 'round';
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30 * s, y); g.moveTo(x + 18 * s, y - 12 * s); g.lineTo(x + 30 * s, y); g.lineTo(x + 18 * s, y + 12 * s); g.stroke();
  }
  function icSearch(x, y, s, col, lw) { s = s || 1; g.strokeStyle = col || C.ink; g.lineWidth = lw || 4; circ(x, y, 14 * s); g.stroke(); line(x + 10 * s, y + 10 * s, x + 22 * s, y + 22 * s, col, lw || 4); }
  function icSpeaker(x, y, s, col) {
    s = s || 1; g.fillStyle = col || C.ink; g.beginPath();
    [[-14, -12], [-2, -12], [14, -26], [14, 26], [-2, 12], [-14, 12]].forEach(p => g.lineTo(x + p[0] * s, y + p[1] * s)); g.closePath(); g.fill();
    g.strokeStyle = col || C.ink; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.arc(x + 14 * s, y, 20 * s, -.8, .8); g.stroke();
  }
  function icSkip(x, y, d, col) {
    g.fillStyle = col || C.ink; g.beginPath(); g.moveTo(x - 12 * d, y - 16); g.lineTo(x + 10 * d, y); g.lineTo(x - 12 * d, y + 16); g.closePath(); g.fill();
    g.fillRect(d > 0 ? x + 10 : x - 16, y - 16, 6, 32);
  }
  function icCmd(x, y, key) {
    g.strokeStyle = C.stroke; g.lineWidth = 3; rr(x - 43, y - 26, 86, 52, 14); g.stroke();
    const qx = x - 21, qy = y - 6; g.strokeStyle = C.ink; g.lineWidth = 2.5; g.strokeRect(qx, qy, 10, 10);
    [[0, 0], [10, 0], [0, 10], [10, 10]].forEach(c => { circ(qx + c[0] + (c[0] ? 4 : -4), qy + c[1] + (c[1] ? 4 : -4), 4.5); g.stroke(); });
    txt(key || 'K', x + 15, y + 1, { size: 28, fam: 'mono', align: 'center' });
  }
  const PL = [[[-17, -20], [0, -10], [0, 10], [-17, 20]], [[0, -10], [17, 0], [17, 0], [0, 10]]];
  const PA = [[[-15, -19], [-4, -19], [-4, 19], [-15, 19]], [[4, -19], [15, -19], [15, 19], [4, 19]]];
  function playPause(q, x, y, s, col) { // q 0 = play, 1 = pause
    s = s || 1; g.fillStyle = col || C.ink;
    for (let k = 0; k < 2; k++) {
      g.beginPath();
      for (let i = 0; i < 4; i++) { const a = PL[k][i], b = PA[k][i]; g.lineTo(x + (lerp(a[0], b[0], q) + 2 * (1 - q)) * s, y + lerp(a[1], b[1], q) * s); }
      g.closePath(); g.fill();
    }
  }
  // ---------- содержимое состояний: fn(t, info), координаты от центра фигуры ----------
  function uiButton(t, info, o) {
    o = o || {}; const fg = o.color || info.fg, lab = o.label || '', sz = fitSize(lab, o.size || 48, info.w - 130, 650);
    g.font = font(sz, 650); const tw = g.measureText(lab).width, x0 = -(tw + (o.icon === false ? 0 : 52)) / 2;
    txt(lab, x0, 2, { size: sz, weight: 650, color: fg }); if (o.icon !== false) icArrow(x0 + tw + 20, 2, 1, fg, 5);
  }
  function uiLoader(t, info) {
    const r = Math.max(10, Math.min(info.w, info.h) / 2 - 34); g.lineCap = 'round'; g.lineWidth = r / 4;
    g.strokeStyle = info.dark ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.12)'; circ(0, 0, r); g.stroke();
    const a = t * 8, sw = 1.3 + .8 * Math.sin(t * 6); g.strokeStyle = info.fg; g.beginPath(); g.arc(0, 0, r, a, a + sw); g.stroke();
  }
  function uiCheck(t, info, o) {
    o = o || {}; const k = Math.min(info.w, info.h) / 150, t0 = o.t0 == null ? info.t0 + .05 : o.t0;
    poly([[-28 * k, 2 * k], [-9 * k, 20 * k], [28 * k, -20 * k]], eo(prog(t, t0, t0 + .25)), info.fg, 10 * k);
  }
  function uiWave(t, x, y, n, o) {
    o = o || {}; g.strokeStyle = o.col || C.ink; g.lineWidth = o.lw || 8; g.lineCap = 'round';
    for (let i = 0; i < n; i++) { const h = 8 + (o.amp || 26) * Math.abs(Math.sin(t * 9 + i * 1.3)); line(x + i * (o.gap || 20), y - h / 2, x + i * (o.gap || 20), y + h / 2, o.col, o.lw || 8); }
  }
  function uiIsland(t, info, o) {
    o = o || {}; const fg = info.fg, x = -info.w / 2 + 60;
    g.fillStyle = fg; circ(x, 0, 28); g.fill(); g.fillStyle = info.dark ? C.ink : '#fff'; circ(x, 0, 10 + 3 * Math.sin(t * 9)); g.fill();
    txt(o.label || '', x + 45, 2, { size: 40, color: fg, max: info.w - 285 }); uiWave(t, info.w / 2 - 150, 0, 7, { col: fg });
  }
  function playerGeo(info) { const half = info.w / 2 - 60, top = -info.h / 2; return { x0: -half, len: 2 * half, y: top + 275, top, half }; }
  function uiPlayer(t, info, o) { // o: title, sub, p 0..1, total (с), q (play→pause), knob 0..1, cover(t,x,y)
    o = o || {}; const G = playerGeo(info), top = G.top, hf = G.half, cx = -hf + 55, cy = top + 115;
    rr(-hf - 20, top + 40, 150, 150, 26); g.fillStyle = C.ink; g.fill();
    if (o.cover) o.cover(t, cx, cy); else { g.strokeStyle = '#fff'; g.lineWidth = 5; circ(cx, cy, 40); g.stroke(); g.fillStyle = '#fff'; circ(cx, cy, 14 + 3 * Math.sin(t * 8)); g.fill(); }
    txt(o.title || '', -hf + 160, top + 90, { size: 48, weight: 700, max: 2 * hf - 160 });
    txt(o.sub || '', -hf + 160, top + 148, { size: 32, weight: 500, color: C.gray, max: 2 * hf - 160 });
    const p = clamp(o.p || 0, 0, 1), x = G.x0 + G.len * p, y = G.y, tot = o.total || 190;
    rr(G.x0, y - 5, G.len, 10, 5); g.fillStyle = C.track; g.fill(); rr(G.x0, y - 5, x - G.x0, 10, 5); g.fillStyle = C.ink; g.fill();
    circ(x, y, 12 + 9 * (o.knob || 0)); g.fill();
    note(G.x0, y + 43, clock(p * tot)); note(hf, y + 43, clock(tot), { align: 'right' });
    g.fillStyle = C.ink; circ(0, top + 390, 52); g.fill(); icSkip(-150, top + 390, -1); icSkip(150, top + 390, 1);
    playPause(o.q || 0, 0, top + 390, 1.2, '#fff');
  }
  function sliderGeo(info) { const x0 = -info.w / 2 + 130; return { x0, len: info.w - 320 }; }
  function sliderVal(cx, info) { const G = sliderGeo(info); return { v: clamp((cx - G.x0) / G.len, 0, 1), over: Math.max(0, cx - G.x0 - G.len) }; }
  function uiSlider(t, info, o) { // o: v, ext (растяжение за максимум), knob, label, icon
    o = o || {}; const G = sliderGeo(info), ext = o.ext || 0, v = clamp(o.v || 0, 0, 1), end = G.x0 + G.len + ext, kx = G.x0 + v * G.len + (v >= 1 ? ext : 0);
    if (o.icon !== false) icSpeaker(G.x0 - 76, 0, 1, C.ink);
    rr(G.x0, -5, end - G.x0, 10, 5); g.fillStyle = C.track; g.fill(); rr(G.x0, -5, kx - G.x0, 10, 5); g.fillStyle = C.ink; g.fill();
    circ(kx, 0, 22 + 6 * (o.knob || 0)); g.fillStyle = '#fff'; g.fill(); g.strokeStyle = C.ink; g.lineWidth = 5; g.stroke();
    txt(o.label != null ? o.label : Math.round(v * 100) + '%', end + 66, 2, { size: 38, fam: 'mono', max: 150 });
  }
  function uiToggle(t, info, keys, o) { // keys: [[t, 0|1], ...]
    o = o || {}; const kr = info.h / 2 - 20, L0 = -info.w / 2 + 20, e = liquid(keys, t, info.w - 40 - 2 * kr, L0, L0 + 2 * kr);
    rr(e[0], -kr, e[1] - e[0], 2 * kr, kr); g.fillStyle = o.knob || '#fff'; g.fill();
  }
  function uiTabs(t, info, names, keys) { // keys: [[t, индекс], ...]
    const n = names.length, x0 = -info.w / 2 + 12, st = (info.w - 24) / n, hh = info.h / 2 - 12, e = liquid(keys, t, st, x0, x0 + st);
    const f = c => ({ size: 40, weight: 600, align: 'center', max: st - 36, color: c });
    rr(e[0], -hh, e[1] - e[0], 2 * hh, hh); g.fillStyle = C.ink; g.fill();
    names.forEach((s, i) => txt(s, x0 + st * (i + .5), 2, f(C.ink)));
    g.save(); rr(e[0], -hh, e[1] - e[0], 2 * hh, hh); g.clip(); names.forEach((s, i) => txt(s, x0 + st * (i + .5), 2, f('#fff'))); g.restore();
  }
  function tooltip(x, y, text, s, o) {
    if (s <= .01) return; o = o || {}; const sz = o.size || 34; g.font = font(sz, 650);
    const w = Math.min(g.measureText(text).width + 56, 520);
    g.save(); g.globalAlpha *= clamp(s, 0, 1); g.translate(x, y); g.scale(s, s); rr(-w / 2, -80, w, 66, 18); g.fillStyle = o.bg || C.ink; g.fill();
    txt(text, 0, -46, { size: sz, weight: 650, color: o.color || '#fff', align: 'center', max: w - 40 }); g.restore();
  }
  function uiChart(t, info, o) { // o: title, label, values, days, t0, dur, tip {i, t0, t1, text}
    o = o || {}; const v = o.values || [1, 2, 3], n = v.length, top = -info.h / 2, hf = info.w / 2 - 80, base = top + info.h - 150, H = Math.max(80, info.h - 340);
    let lo = Math.floor(Math.min(...v)), hi = Math.ceil(Math.max(...v)); if (hi === lo) hi = lo + 1;
    const P = v.map((x, i) => [-hf + i * 2 * hf / Math.max(1, n - 1), base - (x - lo) / (hi - lo) * H]);
    if (o.title) txt(o.title, -hf - 30, top + 65, { size: 46, weight: 700, max: info.w - 260 });
    if (o.label) note(hf + 30, top + 65, o.label, { align: 'right', max: 160 });
    g.fillStyle = C.line; [0, .5, 1].forEach(k => g.fillRect(-hf - 30, base - 1 - k * H, 2 * hf + 60, 2));
    (o.days || []).forEach((d, i) => P[i] && note(P[i][0], base + 58, d, { size: 24, align: 'center' }));
    const t0 = o.t0 == null ? info.t0 + .1 : o.t0, d = eo(prog(t, t0, t0 + (o.dur || .9))) * (n - 1), k = Math.floor(d), pts = P.slice(0, k + 1);
    if (k < n - 1) { const a = P[k], b = P[k + 1]; pts.push([lerp(a[0], b[0], d - k), lerp(a[1], b[1], d - k)]); }
    g.beginPath(); g.moveTo(pts[0][0], base); pts.forEach(p => g.lineTo(p[0], p[1])); g.lineTo(pts[pts.length - 1][0], base); g.closePath();
    g.fillStyle = 'rgba(0,0,0,.05)'; g.fill();
    g.strokeStyle = C.ink; g.lineWidth = 6; g.lineJoin = g.lineCap = 'round'; g.beginPath(); pts.forEach(p => g.lineTo(p[0], p[1])); g.stroke();
    const tp = o.tip, ts = tp ? sp(t - tp.t0, 20, .8) * (1 - prog(t, tp.t1 - .15, tp.t1)) : 0;
    P.forEach((p, i) => {
      const s = eo(clamp((d - i) * 3, 0, 1)); if (s <= 0) return;
      circ(p[0], p[1], (9 + (tp && i === tp.i ? 5 * ts : 0)) * s); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 4; g.stroke();
    });
    if (ts > .01 && P[tp.i]) {
      const p = P[tp.i]; g.save(); g.globalAlpha *= clamp(ts, 0, 1); g.setLineDash([6, 8]); line(p[0], p[1] + 16, p[0], base, C.ink, 2); g.setLineDash([]); g.restore();
      tooltip(p[0], p[1] - 40, tp.text, ts);
    }
  }
  function uiBars(t, info, o) { // o: values, labels, t0, hi, title
    o = o || {}; const v = o.values || [], n = v.length || 1, hf = info.w / 2 - 60, base = info.h / 2 - 80, H = info.h - (o.title ? 220 : 140);
    const mx = Math.max(...v, 1e-6), st = 2 * hf / n, bw = st * .56, t0 = o.t0 == null ? info.t0 + .1 : o.t0, sub = info.dark ? 'rgba(255,255,255,.6)' : C.gray;
    if (o.title) txt(o.title, -hf, -info.h / 2 + 60, { size: 42, weight: 700, color: info.fg, max: 2 * hf });
    v.forEach((x, i) => {
      const h = Math.max(0, H * x / mx * sp(t - t0 - i * .06, 16, .8)), bx = -hf + st * i + (st - bw) / 2;
      rr(bx, base - h, bw, h, Math.min(14, bw / 2)); g.fillStyle = i === o.hi ? info.fg : (info.dark ? 'rgba(255,255,255,.3)' : C.track); g.fill();
      if (o.labels && o.labels[i]) note(bx + bw / 2, base + 40, o.labels[i], { size: 24, align: 'center', color: sub, max: st - 6 });
    });
  }
  function uiPalette(t, info, o) { // ⌘K: o.items, o.query, o.at (старт набора), o.step, o.enter (время или false), o.placeholder
    o = o || {}; const top = -info.h / 2, hw = info.w / 2 - 20, it = o.items || [], q = o.query || '';
    const at = o.at == null ? info.t0 + .25 : o.at, stp = o.step || .25, ty = q.split('').map((c, i) => at + i * stp);
    const tE = o.enter === false ? 1e9 : (o.enter == null ? at + q.length * stp : o.enter), on = t >= tE;
    const qs = q.slice(0, ty.filter(x => t >= x).length), sy = top + 70;
    icSearch(-hw + 34, sy - 4, 1, C.ink, 4);
    txt(qs || o.placeholder || 'Найти команду', -hw + 80, sy, { size: 42, weight: qs ? 600 : 500, color: qs ? C.ink : C.faint, max: info.w - 300 });
    g.font = font(42, 600); const cw = qs ? g.measureText(qs).width : 0;
    if (Math.floor(t * 2.5) % 2 === 0) { g.fillStyle = C.ink; g.fillRect(-hw + 84 + cw, sy - 22, 3, 44); }
    icCmd(hw - 73, sy + 1); g.fillStyle = C.line; g.fillRect(-hw, top + 128, 2 * hw, 2);
    const ql = q.toLowerCase(), hi = Math.max(0, it.findIndex(s => s.toLowerCase().includes(ql)));
    let y = top + 140;
    it.forEach((s, i) => {
      const keys = [[info.t0, 1]]; ty.forEach((x, j) => keys.push([x, s.toLowerCase().includes(ql.slice(0, j + 1)) ? 1 : 0]));
      const hf = clamp(trk(keys, t, 20, .9), 0, 1.05), hh = 88 * hf, cy = y + hh / 2;
      if (hf > .02) {
        g.save(); g.globalAlpha *= clamp(hf, 0, 1);
        if (i === hi) { rr(-hw - 4, cy - 40, 2 * hw + 8, 80, 22); g.fillStyle = on ? C.ink : C.soft; g.fill(); }
        const c = i === hi && on ? '#fff' : C.ink; g.strokeStyle = c; g.lineWidth = 4; circ(-hw + 36, cy, 16); g.stroke();
        txt(s, -hw + 74, cy + 1, { size: 38, weight: 500, color: c, max: 2 * hw - 110 }); g.restore();
      }
      y += hh;
    });
  }
  function uiToast(t, info, o) {
    o = o || {}; const x = -info.w / 2 + 50, t0 = o.t0 == null ? info.t0 + .15 : o.t0;
    g.fillStyle = info.dark ? '#fff' : C.ink; circ(x, 0, 32); g.fill();
    poly([[x - 14, 0], [x - 4, 11], [x + 14, -10]], eo(prog(t, t0, t0 + .3)), info.dark ? C.ink : '#fff', 6);
    txt(o.text || '', x + 50, 2, { size: 38, weight: 600, color: info.fg, max: info.w / 2 - x - 80 });
  }
  function uiStat(t, info, o) { // o: label, from, to, t0, dur, pre, suf, size
    o = o || {}; const t0 = o.t0 == null ? info.t0 + .15 : o.t0;
    if (o.label) txt(o.label, 0, -info.h / 2 + 60, { size: 32, weight: 500, color: info.dark ? 'rgba(255,255,255,.6)' : C.gray, align: 'center', max: info.w - 80 });
    return counter(t, t0, t0 + (o.dur || 1), o.from || 0, o.to || 0, 0, o.label ? 24 : 0,
      { size: o.size || 120, weight: 750, color: info.fg, align: 'center', max: info.w - 80, pre: o.pre, suf: o.suf });
  }
  function uiChecklist(t, info, o) { // o: items, times (абс. время галочки)
    o = o || {}; const it = o.items || [], tm = o.times || [], hf = info.w / 2 - 50, rh = Math.min(96, (info.h - 60) / Math.max(1, it.length)), y0 = -(it.length - 1) * rh / 2;
    it.forEach((s, i) => {
      const y = y0 + i * rh, p = tm[i] == null ? 0 : eo(prog(t, tm[i], tm[i] + .3)), x = -hf + 24;
      g.lineWidth = 4; g.strokeStyle = info.fg; circ(x, y, 22); g.stroke();
      if (p > 0) { g.fillStyle = info.fg; circ(x, y, 22 * p); g.fill(); poly([[x - 10, y], [x - 3, y + 8], [x + 10, y - 8]], p, info.dark ? C.ink : '#fff', 5); }
      txt(s, -hf + 70, y + 2, { size: clamp(rh * .42, 30, 40), weight: p > .5 ? 600 : 500, color: info.fg, max: 2 * hf - 70 });
    });
  }
  return { C, SANS, SERIF, MONOS, SAFE, begin, font, mono, clamp, lerp, prog, eo, eio, sp, trk, pulse, press, beat, beatPulse, hold,
    stretch, relax, push, drift, shade, rr, circ, line, poly, fitSize, guard, txt, wrap, words, caption, plate, note, clock, counter,
    badge, beatBar, bg, states, stateAt, hero, curPos, cursor, liquid, icArrow, icSearch, icSpeaker, icSkip, icCmd, playPause,
    uiButton, uiLoader, uiCheck, uiWave, uiIsland, playerGeo, uiPlayer, sliderGeo, sliderVal, uiSlider, uiToggle, uiTabs,
    tooltip, uiChart, uiBars, uiPalette, uiToast, uiStat, uiChecklist };
})();