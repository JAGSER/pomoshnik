// «Гравюра» (ENGRAVE): стиль старинной книги с гравюрами для роликов draw(t, k) на Canvas 2D 1080×1920.
// Одна глобальная константа. Web Worker: только OffscreenCanvas, без DOM. Кадр считается только из t.
// Гравюра запекается один раз (в первом кадре): штрих идёт по форме, толстеет в тени, в глубокой тени перекрёстный.
// Углы во всех функциях в градусах, время lt в секундах от начала сцены.
const ENGRAVE = (() => {
  const W = 1080, H = 1920, PI = Math.PI, TAU = PI * 2, DEG = PI / 180;
  const SAFE = { x0: 60, x1: 1020, y0: 110, y1: 1690 }, ZONE = { x0: 70, x1: 1010, y0: 290, y1: 1500 };
  const P = {
    paper: '#E8DECA', sheet: '#F2EBDC', mat: '#F6F1E6', shade: '#CDBEA0', ink: '#2B231D', sepia: '#5E4D3C', mute: '#8E7F6B',
    red: '#A9302A', redL: '#C04A3F', navy: '#2E3A6E', gold: '#C39A3E', goldD: '#8A6522', goldL: '#E3C274',
    choc: '#6A3B22', milk: '#B57F50', night: '#1C1A19', night2: '#2B2826', bone: '#E8E1D3', blue: '#5D7496',
    green: '#6E7A4D', steel: '#7C8691', ochre: '#A8692F'
  };
  const F = {
    serif: '"DejaVu Serif",Georgia,"Noto Serif","Times New Roman",serif',
    sans: '"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif',
    mono: '"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace'
  };
  let K = null, G = null, T = 0, CAM = { x: 0, y: 0 }, CUR = { i: 0, lt: 0, dark: false };

  // ---------- время, изинги, пружины ----------
  const cl = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
  const pr = (t, a, b) => b === a ? (t >= a ? 1 : 0) : cl((t - a) / (b - a));
  const lerp = (a, b, p) => a + (b - a) * p;
  const eo = p => 1 - Math.pow(1 - cl(p), 3);
  const ei = p => Math.pow(cl(p), 3);
  const eio = p => { p = cl(p); return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  const eb = p => { p = cl(p); const c = 1.7; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
  // затухающая пружина 0→1 (x в секундах): f частота в Гц, z затухание (0.3 живо, 0.7 мягко)
  function spring(x, f = 1.8, z = .5) {
    if (x <= 0) return 0; const w = TAU * f, wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + z * w / wd * Math.sin(wd * x));
  }
  const ap = (lt, t0, d = .28) => eo(pr(lt, t0, t0 + d));            // появление 0→1
  const out = (lt, t1, d = .2) => 1 - ei(pr(lt, t1, t1 + d));          // уход 1→0
  function kf(A, t) { // ключи [[t, v], ...] с плавным переходом
    if (t <= A[0][0]) return A[0][1];
    for (let i = 0; i < A.length - 1; i++) { const [t0, v0] = A[i], [t1, v1] = A[i + 1]; if (t < t1) return lerp(v0, v1, eio(pr(t, t0, t1))); }
    return A[A.length - 1][1];
  }
  // падение с отскоком: {y, hit(с момента удара, с), on}
  function fall(lt, t0, y0, y1, o = {}) {
    const d = o.dur || .42, q = pr(lt, t0, t0 + d), y = y0 + (y1 - y0) * q * q;
    const k = lt - t0 - d; if (k < 0) return { y, hit: -1, on: lt >= t0 };
    return { y: y1 - (o.bounce == null ? 16 : o.bounce) * Math.abs(Math.sin(k * 15)) * Math.exp(-k * 10), hit: k, on: true };
  }
  const hash = n => { const s = Math.sin(n * 91.3458 + 47.853) * 43758.5453; return s - Math.floor(s); };
  const rnd = seed => { let s = (Math.abs(seed | 0) % 2147483646) + 1; return () => (s = s * 16807 % 2147483647) / 2147483647; };
  const shash = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) + 1; };
  function roman(n) { const v = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1], r = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I']; let s = ''; v.forEach((x, i) => { while (n >= x) { s += r[i]; n -= x; } }); return s; }
  const num = v => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  // ---------- холсты, измерение, шрифты ----------
  function mkC(w, h, opaque) { const c = new OffscreenCanvas(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h))); return [c, c.getContext('2d', opaque ? { alpha: false } : undefined)]; }
  const MX = mkC(8, 8)[1];
  const font = (size, o = {}) => (o.it ? 'italic ' : '') + (o.b ? 'bold ' : '') + Math.round(size * 10) / 10 + 'px ' + F[o.kind || 'serif'];
  const meas = (s, f) => { MX.font = f; return MX.measureText(s).width; };
  const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const rgba = (h, a) => { const c = rgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };

  // ---------- геометрия: точки [x0,y0,x1,y1,...] ----------
  function ell(cx, cy, rx, ry, n = 56, a0 = 0, a1 = TAU) { const p = [], full = Math.abs(a1 - a0) >= TAU - 1e-6, m = full ? n : n + 1; for (let i = 0; i < m; i++) { const a = a0 + (a1 - a0) * i / n; p.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry); } return p; }
  const rect = (x, y, w, h) => [x, y, x + w, y, x + w, y + h, x, y + h];
  function rr(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); const p = [], c = [[x + w - r, y + r, -90], [x + w - r, y + h - r, 0], [x + r, y + h - r, 90], [x + r, y + r, 180]]; c.forEach(([cx, cy, a]) => { for (let i = 0; i <= 6; i++) { const b = (a + i * 15) * DEG; p.push(cx + Math.cos(b) * r, cy + Math.sin(b) * r); } }); return p; }
  function spl(pts, closed = true, seg = 6) { // сглаживание Катмулла-Рома
    const n = pts.length / 2, o = [], P2 = i => { i = closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i)); return [pts[i * 2], pts[i * 2 + 1]]; };
    for (let i = 0; i < (closed ? n : n - 1); i++) { const a = P2(i - 1), b = P2(i), c = P2(i + 1), d = P2(i + 2);
      for (let k = 0; k < seg; k++) { const t = k / seg, t2 = t * t, t3 = t2 * t;
        o.push(.5 * (2 * b[0] + (-a[0] + c[0]) * t + (2 * a[0] - 5 * b[0] + 4 * c[0] - d[0]) * t2 + (-a[0] + 3 * b[0] - 3 * c[0] + d[0]) * t3),
          .5 * (2 * b[1] + (-a[1] + c[1]) * t + (2 * a[1] - 5 * b[1] + 4 * c[1] - d[1]) * t2 + (-a[1] + 3 * b[1] - 3 * c[1] + d[1]) * t3)); } }
    if (!closed) o.push(pts[pts.length - 2], pts[pts.length - 1]);
    return o;
  }
  function rotP(pts, cx, cy, deg) { const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG), o = []; for (let i = 0; i < pts.length; i += 2) { const x = pts[i] - cx, y = pts[i + 1] - cy; o.push(cx + x * c - y * s, cy + x * s + y * c); } return o; }
  const movP = (pts, dx, dy) => pts.map((v, i) => v + (i & 1 ? dy : dx));
  const sclP = (pts, cx, cy, sx, sy = sx) => pts.map((v, i) => i & 1 ? cy + (v - cy) * sy : cx + (v - cx) * sx);
  function blob(cx, cy, rx, ry, seed, n = 9, rough = .3) { const R = rnd(seed), p = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 1 - rough / 2 + R() * rough; p.push(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k); } return spl(p, true, 6); }
  function leaf(x, y, ang, len, wid) { const a = ang * DEG, c = Math.cos(a), s = Math.sin(a), L = [], Rr = []; for (let i = 0; i <= 10; i++) { const u = i / 10, w = wid / 2 * Math.pow(Math.sin(PI * u), .85) * (1 - .2 * u), px = x + c * len * u, py = y + s * len * u; L.push(px - s * w, py + c * w); Rr.unshift(px + s * w, py - c * w); } return L.concat(Rr); }
  function pth(pts, closed = true) { const p = new Path2D(); for (let i = 0; i < pts.length; i += 2) i ? p.lineTo(pts[i], pts[i + 1]) : p.moveTo(pts[i], pts[i + 1]); if (closed) p.closePath(); return p; }
  function poly(g, pts, closed = true) { g.beginPath(); for (let i = 0; i < pts.length; i += 2) i ? g.lineTo(pts[i], pts[i + 1]) : g.moveTo(pts[i], pts[i + 1]); if (closed) g.closePath(); }

  // ---------- узоры штриха (плитка, повторяется) ----------
  function pat(g, ang = 0, per = 6, lw = 1.6, col = P.ink) { // ang: 0 | 45 | 90 | 135
    g.__pc = g.__pc || {}; const key = ang + '|' + per + '|' + lw + '|' + col; if (g.__pc[key]) return g.__pc[key];
    const diag = ang % 90 !== 0, s = diag ? Math.round(per * Math.SQRT2) : per, [c, x] = mkC(s, s);
    x.strokeStyle = col; x.lineWidth = lw; x.beginPath();
    if (ang === 0) { x.moveTo(-1, s / 2); x.lineTo(s + 1, s / 2); } else if (ang === 90) { x.moveTo(s / 2, -1); x.lineTo(s / 2, s + 1); }
    else for (let k = -1; k <= 1; k++) { if (ang === 45) { x.moveTo(k * s - 1, s + 1); x.lineTo(k * s + s + 1, -1); } else { x.moveTo(k * s - 1, -1); x.lineTo(k * s + s + 1, s + 1); } }
    x.stroke(); return g.__pc[key] = g.createPattern(c, 'repeat');
  }
  function hatchFill(g, shape, o = {}) { // заливка фигуры (точки или Path2D) штрихом
    g.save(); g.globalAlpha *= o.a == null ? 1 : o.a; g.fillStyle = pat(g, o.ang || 0, o.per || 6, o.lw || 1.6, o.col || P.ink);
    if (shape instanceof Path2D) g.fill(shape); else { poly(g, shape); g.fill(); } g.restore();
  }
  function shadow(g, x, y, rx, ry, o = {}) { // заштрихованная тень на земле
    g.save(); g.globalAlpha *= o.a == null ? .6 : o.a; g.fillStyle = pat(g, 0, o.per || 5, o.lw || 1.5, P.ink); g.beginPath(); g.ellipse(Math.round(x), Math.round(y), rx, ry, 0, 0, TAU); g.fill(); g.restore();
  }

  // ---------- бумага ----------
  let PAPER = null;
  function bakePaper() {
    const [c, x] = mkC(W, H, true), R = rnd(1847);
    x.fillStyle = P.paper; x.fillRect(0, 0, W, H);
    const [qc, q] = mkC(W / 4, H / 4);
    for (let i = 0; i < 54; i++) { const cx = R() * W / 4, cy = R() * H / 4, r = (90 + R() * 360) / 4, dk = R() < .5, gr = q.createRadialGradient(cx, cy, 0, cx, cy, r);
      gr.addColorStop(0, dk ? 'rgba(150,118,76,.075)' : 'rgba(255,250,236,.13)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); q.fillStyle = gr; q.fillRect(cx - r, cy - r, r * 2, r * 2); }
    const gr = q.createRadialGradient(W / 8, H * .11, 40, W / 8, H / 8, H * .2);
    gr.addColorStop(0, 'rgba(252,248,238,.42)'); gr.addColorStop(.5, 'rgba(252,248,238,0)'); gr.addColorStop(1, 'rgba(112,84,50,.42)');
    q.fillStyle = gr; q.fillRect(0, 0, W / 4, H / 4); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'low'; x.drawImage(qc, 0, 0, W, H);
    for (let i = 0; i < 520; i++) { const px = R() * W, py = R() * H, a = R() * TAU, l = 8 + R() * 26; x.strokeStyle = R() < .5 ? 'rgba(96,74,48,.10)' : 'rgba(255,252,242,.28)'; x.lineWidth = .6 + R() * .7;
      x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + .7) * l * .5, py + Math.sin(a + .7) * l * .5, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
    for (let i = 0; i < 34; i++) { const px = R() * W, py = R() * H, r = 2 + R() * 9, g2 = x.createRadialGradient(px, py, 0, px, py, r); g2.addColorStop(0, 'rgba(140,96,52,.22)'); g2.addColorStop(1, 'rgba(140,96,52,0)'); x.fillStyle = g2; x.fillRect(px - r, py - r, r * 2, r * 2); }
    const [nc, nx] = mkC(96, 96), im = nx.createImageData(96, 96), d = im.data; // слабое неподвижное зерно
    for (let i = 0; i < d.length; i += 4) { const v = R(); d[i] = d[i + 1] = d[i + 2] = v < .5 ? 60 : 255; d[i + 3] = Math.abs(v - .5) * 22; }
    nx.putImageData(im, 0, 0); x.fillStyle = x.createPattern(nc, 'repeat'); x.fillRect(0, 0, W, H);
    return c;
  }
  function paper(g) { if (!PAPER) PAPER = bakePaper(); g.drawImage(PAPER, 0, 0); }
  let DARK = null;
  function dark(g) { // тёмная интерлюдия: уголь, виньетка (запекается при первом вызове)
    if (!DARK) { const [c, x] = mkC(W, H, true); x.fillStyle = P.night; x.fillRect(0, 0, W, H);
      const gr = x.createRadialGradient(W / 2, H * .45, 120, W / 2, H * .5, H * .75); gr.addColorStop(0, 'rgba(60,54,48,.35)'); gr.addColorStop(1, 'rgba(0,0,0,.45)');
      x.fillStyle = gr; x.fillRect(0, 0, W, H); DARK = c; }
    g.drawImage(DARK, 0, 0);
  }

  // ---------- движок гравюры ----------
  const SINT = new Float32Array(1024); for (let i = 0; i < 1024; i++) SINT[i] = Math.sin(i / 1024 * TAU);
  const REG = [], SHD = { flat: 0, lin: 1, cyl: 2, sph: 3, cone: 4 }, HTC = { lin: 0, cyl: 1, mer: 2, ring: 3, wave: 4, rad: 5 };
  function engrave(o) { const s = { o, c: null, sx: 0, sy: 0, w: Math.ceil(o.w), h: Math.ceil(o.h), ax: o.ax == null ? .5 : o.ax, ay: o.ay == null ? .5 : o.ay }; REG.push(s); return s; }
  function prepL(l) {
    const pts = l.pts, A = (l.axis == null ? 90 : l.axis) * DEG, ax = Math.cos(A), ay = Math.sin(A), bx = -ay, by = ax;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i < pts.length; i += 2) { x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]); y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]); }
    let cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, vm = 0, qm = 0;
    for (let i = 0; i < pts.length; i += 2) { const dx = pts[i] - cx, dy = pts[i + 1] - cy; vm = Math.max(vm, Math.abs(dx * ax + dy * ay)); qm = Math.max(qm, Math.abs(dx * bx + dy * by)); }
    if (l.frame) { cx = l.frame[0]; cy = l.frame[1]; qm = l.frame[2]; vm = l.frame[3] == null ? l.frame[2] : l.frame[3]; }
    const d = l.d == null ? [.1, .85] : typeof l.d === 'number' ? [l.d, l.d] : l.d;
    const la = (l.light == null ? -135 : l.light) * DEG; let lx = Math.cos(la) * .8, ly = Math.sin(la) * .8, lz = .62; const ln = Math.hypot(lx, ly, lz); lx /= ln; ly /= ln; lz /= ln;
    const th = (l.ang == null ? (l.axis == null ? 90 : l.axis) : l.ang) * DEG, cth = l.cang == null ? th + 55 * DEG : l.cang * DEG;
    const fl = l.fill === false ? null : rgb(l.fill || P.sheet), tn = l.tint ? rgb(l.tint) : null, ik = rgb(l.ink || P.ink), per = l.per || 6;
    return { cx, cy, ax, ay, bx, by, hl: vm || 1, hr: qm || 1, bw: (x1 - x0) / 2 || 1, bh: (y1 - y0) / 2 || 1,
      sh: SHD[l.shade || 'lin'], d0: d[0], dd: d[1] - d[0], gm: l.gamma || 1.15, lx2: Math.cos(la), ly2: Math.sin(la), bl: bx * lx + by * ly, al: ax * lx + ay * ly, lz,
      ht: HTC[l.hatch || 'lin'], hc: Math.cos(th), hs: Math.sin(th), per, bend: l.bend == null ? .3 : l.bend,
      rcx: l.cx == null ? cx : l.cx, rcy: l.cy == null ? cy : l.cy, rk: l.rk || 1, amp: l.amp || 0, wk: TAU / (l.wl || 100), ph: l.ph || 0, rn: (l.n || 48) * per / TAU,
      cr: l.cross !== false, cf: l.cf == null ? .56 : l.cf, cc: Math.cos(cth), cs: Math.sin(cth), cp: per * 1.06, jit: l.jit == null ? .05 : l.jit,
      fl: !!fl, fr: fl ? fl[0] : 0, fg: fl ? fl[1] : 0, fb: fl ? fl[2] : 0, tn: !!tn, tr: tn ? tn[0] : 0, tg: tn ? tn[1] : 0, tb: tn ? tn[2] : 0,
      ta: l.ta == null ? .5 : l.ta, ia: l.ia == null ? 1 : l.ia, ir: ik[0], ig: ik[1], ib: ik[2] };
  }
  function raster(id, d32, w, h, pre, stride = w) { // попиксельная штриховка (отдельная функция: оптимизируется движком JS)
    const n = pre.length; let cli = -1;
      let cx = 0, cy = 0, ax = 0, ay = 0, bx = 0, by = 0, hl = 1, hr = 1, bw = 1, bh = 1, sh = 0, d0 = 0, ddk = 0, lx2 = 0, ly2 = 0, bl = 0, aL = 0, lz = 0, ht = 0, hc = 0, hs = 0, per = 6, bend = 0,
        rcx = 0, rcy = 0, rk = 1, amp = 0, wk = 0, ph = 0, rn = 0, cr = false, cf = 0, cc = 0, cs = 0, cp = 6, jit = 0, fl = false, fr = 0, fg = 0, fb = 0, tn = false, tr = 0, tg = 0, tb = 0, ta = 0, ia = 1, ir = 0, ig = 0, ib = 0;
      for (let y = 0; y < h; y++) {
        let p = y * w * 4, q4 = y * stride;
        for (let X = 0; X < w; X++, p += 4, q4++) {
          const ea = id[p + 3]; if (!ea) continue; let li = id[p] - 1; if (li < 0) continue; if (li >= n) li = n - 1;
          if (li !== cli) { cli = li; const L = pre[li]; cx = L.cx; cy = L.cy; ax = L.ax; ay = L.ay; bx = L.bx; by = L.by; hl = L.hl; hr = L.hr; bw = L.bw; bh = L.bh; sh = L.sh; d0 = L.d0; ddk = L.dd; lx2 = L.lx2; ly2 = L.ly2; bl = L.bl; aL = L.al; lz = L.lz;
            ht = L.ht; hc = L.hc; hs = L.hs; per = L.per; bend = L.bend; rcx = L.rcx; rcy = L.rcy; rk = L.rk; amp = L.amp; wk = L.wk; ph = L.ph; rn = L.rn; cr = L.cr; cf = L.cf; cc = L.cc; cs = L.cs; cp = L.cp; jit = L.jit;
            fl = L.fl; fr = L.fr; fg = L.fg; fb = L.fb; tn = L.tn; tr = L.tr; tg = L.tg; tb = L.tb; ta = L.ta; ia = L.ia; ir = L.ir; ig = L.ig; ib = L.ib; }
          const dx = X - cx, dy = y - cy, v = dx * ax + dy * ay, q = dx * bx + dy * by, nv = v / hl, nq = q / hr;
          let dk;
          if (sh === 0) dk = d0;
          else if (sh === 1) { let s2 = dx / bw * lx2 + dy / bh * ly2; s2 = s2 > 1 ? 1 : s2 < -1 ? -1 : s2; dk = d0 + ddk * (.5 - .5 * s2); }
          else if (sh === 3) { let r2 = nv * nv + nq * nq; if (r2 > 1) r2 = 1; const nd = nq * bl + nv * aL + Math.sqrt(1 - r2) * lz, vv = 1 - (nd > 0 ? nd : -nd * .3); dk = d0 + ddk * vv * (.8 + .2 * vv); }
          else { let qq = nq; if (sh === 4) { const wf = (nv + 1) * .5; qq = nq / (wf > .07 ? wf : .07); } qq = qq > 1 ? 1 : qq < -1 ? -1 : qq; const nd = qq * bl + Math.sqrt(1 - qq * qq) * lz, vv = 1 - (nd > 0 ? nd : -nd * .3); dk = d0 + ddk * vv * (.8 + .2 * vv); }
          let u, al;
          if (ht === 0) { u = y * hc - X * hs; al = X * hc + y * hs; }
          else if (ht === 1) { const qq = nq > 1 ? 1 : nq < -1 ? -1 : nq; u = v - bend * hr * Math.sqrt(1 - qq * qq); al = q; }
          else if (ht === 2) { const sv = 1 - nv * nv, s2 = sv > .0004 ? Math.sqrt(sv) : .02; let xx = nq / s2; xx = xx > 1 ? 1 : xx < -1 ? -1 : xx; u = Math.asin(xx) * hr; al = v; }
          else if (ht === 3) { const ex = X - rcx, ey = (y - rcy) * rk; u = Math.sqrt(ex * ex + ey * ey); al = (ex - ey) * 1.3; }
          else if (ht === 4) { const a0 = X * hc + y * hs; u = y * hc - X * hs + amp * SINT[((a0 * wk + ph) * 162.97 | 0) & 1023]; al = a0; }
          else { const ex = X - rcx, ey = y - rcy; u = (Math.atan2(ey, ex) + PI) * rn; al = ex + ey; }
          let f = u / per; f = f - Math.floor(f) - .5; const tri = (f < 0 ? -f : f) * 2;
          const dd = dk * 1.1 - .07 + jit * SINT[((al * .045 + u * .7) * 162.97 | 0) & 1023];
          let cov = (dd - tri) * per * .5 + .5; cov = cov < 0 ? 0 : cov > 1 ? 1 : cov;
          if (cr && dk > cf) { const u2 = y * cc - X * cs; let f2 = u2 / cp; f2 = f2 - Math.floor(f2) - .5; const t2 = (f2 < 0 ? -f2 : f2) * 2, d2 = (dk - cf) / (1 - cf) * .85;
            let c2 = (d2 - t2) * cp * .5 + .5; c2 = c2 < 0 ? 0 : c2 > 1 ? 1 : c2; cov = 1 - (1 - cov) * (1 - c2); }
          if (cov === 0 && !fl && !tn) continue;
          let r = 0, gg = 0, b = 0, a = 0;
          if (fl) { r = fr; gg = fg; b = fb; a = 1; }
          if (tn) { let t2 = ta * (.75 + .5 * dk); t2 = t2 > 1 ? 1 : t2; r = tr * t2 + r * (1 - t2); gg = tg * t2 + gg * (1 - t2); b = tb * t2 + b * (1 - t2); a = t2 + a * (1 - t2); }
          const ic = cov * ia; r = ir * ic + r * (1 - ic); gg = ig * ic + gg * (1 - ic); b = ib * ic + b * (1 - ic); a = ic + a * (1 - ic);
          if (a <= 0) continue;
          const A = a * ea | 0; d32[q4] = (A << 24 | (b / a | 0) << 16 | (gg / a | 0) << 8 | (r / a | 0)) >>> 0;
        }
      }
  }
  let WARM = false;
  function warm() { // прогрев JIT: все ветви штриховки на синтетической карте, чтобы дальше всё шло быстро
    WARM = true; const w = 240, h = 240, id = new Uint8ClampedArray(w * h * 4), d32 = new Uint32Array(w * h), sh = ['flat', 'lin', 'cyl', 'sph', 'cone'], ht = ['lin', 'cyl', 'mer', 'ring', 'wave', 'rad'], Ls = [];
    for (let i = 0; i < 30; i++) Ls.push({ pts: rect(i, i, w - i, h - i), shade: sh[i % 5], hatch: ht[i % 6], fill: i % 3 ? undefined : false, tint: i % 2 ? P.choc : null, cross: i % 4 !== 0, d: [.05, .9], wl: 50, amp: 4, n: 24, per: 5 + i % 3 * .5 });
    const pre = Ls.map(prepL); for (let p = 0, k = 0; p < id.length; p += 4, k++) { id[p] = 1 + (Math.floor(k / w / 8) % 30); id[p + 3] = k % 7 ? 255 : 128; }
    for (let r = 0; r < 4; r++) raster(id, d32, w, h, pre);
  }
  let OB = null;
  function outBuf(w, h) { // общий буфер вывода (меньше мусора для сборщика)
    if (!OB || OB.sw < w || OB.sh < h) { const sw = Math.max(w, OB ? OB.sw : 0), sh = Math.max(h, OB ? OB.sh : 0), im = new ImageData(sw, sh); OB = { im, sw, sh, d32: new Uint32Array(im.data.buffer) }; }
    OB.d32.fill(0, 0, h * OB.sw); return OB;
  }
  let SCR = null;
  function scratch(w, h) { // общий холст для карты слоёв (читается часто: программный)
    if (!SCR || SCR.canvas.width < w || SCR.canvas.height < h) SCR = new OffscreenCanvas(Math.max(w, SCR ? SCR.canvas.width : 0), Math.max(h, SCR ? SCR.canvas.height : 0)).getContext('2d', { willReadFrequently: true });
    SCR.setTransform(1, 0, 0, 1, 0, 0); SCR.globalCompositeOperation = 'source-over'; SCR.clearRect(0, 0, w, h); return SCR;
  }
  function bake(s) {
    const o = s.o;
    if (o.src) { // повёрнутая / отражённая копия готового спрайта
      const S = o.src; if (!S.c) bake(S); const [c, x] = mkC(s.w, s.h); x.translate(s.w / 2, s.h / 2); if (o.flip) x.scale(-1, 1); if (o.turn) x.rotate(o.turn * DEG);
      x.drawImage(S.c, S.sx, S.sy, S.w, S.h, -S.w / 2, -S.h / 2, S.w, S.h); s.c = c; return;
    }
    const w = s.w, h = s.h, Ls = (o.layers || []).filter(Boolean), [c, x] = mkC(w, h);
    if (Ls.length) {
      const ix = scratch(w, h), paths = Ls.map(l => l.path || pth(l.pts));
      Ls.forEach((l, i) => { ix.fillStyle = 'rgb(' + (i + 1) + ',0,0)'; ix.fill(paths[i]); });
      const id = ix.getImageData(0, 0, w, h).data, ob = outBuf(w, h), pre = Ls.map(prepL);
      raster(id, ob.d32, w, h, pre, ob.sw);
      x.putImageData(ob.im, 0, 0, 0, 0, w, h);
      x.lineJoin = 'round'; x.lineCap = 'round'; x.strokeStyle = P.ink;
      Ls.forEach((l, i) => { const lw = l.line == null ? 2.2 : l.line; if (lw > 0) { x.lineWidth = lw; x.strokeStyle = l.lineCol || P.ink; x.stroke(paths[i]); } });
    }
    if (o.draw) { x.save(); x.strokeStyle = P.ink; x.fillStyle = P.ink; x.lineCap = 'round'; x.lineJoin = 'round'; o.draw(x, w, h); x.restore(); }
    s.c = c;
  }
  function bakeAll() { if (!WARM && REG.some(s => !s.c)) warm(); for (let i = 0; i < REG.length; i++) if (!REG[i].c) bake(REG[i]); }
  function turn(src, deg, o = {}) { const a = Math.abs(deg * DEG), w = Math.ceil(src.w * Math.cos(a) + src.h * Math.sin(a)) + 2, h = Math.ceil(src.w * Math.sin(a) + src.h * Math.cos(a)) + 2;
    return engrave({ src, turn: deg, w, h, ax: o.ax == null ? .5 : o.ax, ay: o.ay == null ? .5 : o.ay }); }
  const flip = (src) => engrave({ src, flip: true, w: src.w, h: src.h, ax: 1 - src.ax, ay: src.ay });
  const crop = (src, sx, sy, w, h, ax = .5, ay = .5) => ({ get c() { if (!src.c) bake(src); return src.c; }, sx: src.sx + sx, sy: src.sy + sy, w, h, ax, ay, o: src.o });
  // нарисовать спрайт: x,y = точка привязки (ax, ay доли размера). o: a, sc, rot, rv (0…1 проявление), dir down|up|right|left
  function put(g, s, x, y, o = {}) {
    const c = s.c || (bake(s), s.c), a = o.a == null ? 1 : o.a; if (a <= 0.004) return;
    const ax = o.ax == null ? s.ax : o.ax, ay = o.ay == null ? s.ay : o.ay, sc = o.sc == null ? 1 : o.sc, rot = o.rot || 0, A0 = g.globalAlpha; g.globalAlpha = A0 * a;
    if (o.rv != null && o.rv < 1) {
      const rv = cl(o.rv), dx = Math.round(x - s.w * ax), dy = Math.round(y - s.h * ay), dir = o.dir || 'down', vert = dir === 'down' || dir === 'up', L = vert ? s.h : s.w, band = Math.min(46, L * .2), k = Math.round(rv * (L + band)) - band;
      const seg = (p0, p1, al) => { p0 = Math.max(0, Math.round(p0)); p1 = Math.min(L, Math.round(p1)); if (p1 <= p0) return; g.globalAlpha = A0 * a * al;
        if (dir === 'down') g.drawImage(c, s.sx, s.sy + p0, s.w, p1 - p0, dx, dy + p0, s.w, p1 - p0);
        else if (dir === 'up') g.drawImage(c, s.sx, s.sy + L - p1, s.w, p1 - p0, dx, dy + L - p1, s.w, p1 - p0);
        else if (dir === 'right') g.drawImage(c, s.sx + p0, s.sy, p1 - p0, s.h, dx + p0, dy, p1 - p0, s.h);
        else g.drawImage(c, s.sx + L - p1, s.sy, p1 - p0, s.h, dx + L - p1, dy, p1 - p0, s.h); };
      seg(0, k, 1); seg(k, k + band * .5, .55); seg(k + band * .5, k + band, .22);
    } else if (sc === 1 && !rot && o.sy == null) g.drawImage(c, s.sx, s.sy, s.w, s.h, Math.round(x - s.w * ax), Math.round(y - s.h * ay), s.w, s.h);
    else { g.save(); g.translate(x, y); if (rot) g.rotate(rot * DEG); if (sc !== 1 || o.sy != null) g.scale(sc, sc * (o.sy == null ? 1 : o.sy)); g.drawImage(c, s.sx, s.sy, s.w, s.h, -s.w * ax, -s.h * ay, s.w, s.h); g.restore(); }
    g.globalAlpha = A0;
  }

  // ---------- текст ----------
  function text(g, s, x, y, size, o = {}) { // одна строка; max ужимает кегль под ширину; halo подкладка цветом бумаги
    let f = font(size, o); const w0 = meas(s, f); let sz = size; if (o.max && w0 > o.max) { sz = size * o.max / w0; f = font(sz, o); }
    g.save(); g.font = f; g.textAlign = o.al || 'left'; g.textBaseline = 'alphabetic'; g.globalAlpha *= o.a == null ? 1 : o.a;
    if (o.halo) { g.lineJoin = 'round'; g.lineWidth = sz * .16; g.strokeStyle = o.halo; g.strokeText(s, x, y); }
    g.fillStyle = o.col || P.ink; g.fillText(s, x, y); g.restore(); return Math.min(w0, o.max || w0);
  }
  function capsW(s, size, o = {}) { const f = font(size, { kind: o.kind || 'serif', b: o.b }), tr = o.tr == null ? size * .18 : o.tr; let w = 0; for (const ch of s) w += meas(ch, f) + tr; return w - tr; }
  function caps(g, s, x, y, size, o = {}) { // капитель с разрядкой (вручную, без letterSpacing)
    s = String(s).toUpperCase(); const f = font(size, { kind: o.kind || 'serif', b: o.b }), tr = o.tr == null ? size * .18 : o.tr, tw = capsW(s, size, o);
    let px = o.al === 'center' ? x - tw / 2 : o.al === 'right' ? x - tw : x;
    g.save(); g.font = f; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = o.col || P.ink; g.globalAlpha *= o.a == null ? 1 : o.a;
    for (const ch of s) { g.fillText(ch, px, y); px += meas(ch, f) + tr; } g.restore(); return tw;
  }
  function parseW(s) { return String(s).trim().split(/\s+/).map(t => { const m = t.match(/^(\*?)(.*?)(?:@([\d.]+))?$/); return { w: m[2], key: !!m[1], at: m[3] != null ? +m[3] : null }; }); }
  // слова появляются по одному (подъём + проявление, без перелёта); *слово выделено keyCol; слово@1.2 = своё время
  function words(g, s, x, y, size, lt, t0, o = {}) {
    const ws = parseW(s), f0 = font(size, o); let sz = size, sp = meas(' ', f0), wd = ws.map(w => meas(w.w, f0));
    const tot = wd.reduce((a, b) => a + b, 0) + sp * (ws.length - 1), max = o.max || 940;
    if (!o.wrap && tot > max) { const k = max / tot; sz *= k; sp *= k; wd = wd.map(v => v * k); }
    const lines = [[]]; let lw = 0;
    ws.forEach((w, i) => { if (o.wrap && lines[lines.length - 1].length && lw + sp + wd[i] > o.wrap) { lines.push([]); lw = 0; } const L = lines[lines.length - 1]; lw += (L.length ? sp : 0) + wd[i]; L.push(i); });
    const lh = sz * (o.lh || 1.15), f = font(sz, o), A0 = g.globalAlpha, step = o.step == null ? .28 : o.step, dur = o.dur || .26;
    const oa = o.out == null ? 1 : out(lt, o.out, .2);
    g.save(); g.font = f; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    if (o.halo) { g.lineJoin = 'round'; g.lineWidth = sz * .16; g.strokeStyle = o.halo; }
    let maxW = 0;
    lines.forEach((L, li) => {
      const W0 = L.reduce((a, i, k) => a + wd[i] + (k ? sp : 0), 0); maxW = Math.max(maxW, W0);
      let px = o.al === 'center' ? x - W0 / 2 : o.al === 'right' ? x - W0 : x;
      L.forEach(i => { const w = ws[i], tw = w.at != null ? w.at : o.at && o.at[i] != null ? o.at[i] : t0 + i * step, a = eo(pr(lt, tw, tw + dur)) * oa;
        if (a > 0) { const yy = y + li * lh + (1 - a) * sz * .14; g.globalAlpha = A0 * a; if (o.halo) g.strokeText(w.w, px, yy); g.fillStyle = w.key ? (o.keyCol || P.red) : (o.col || P.ink); g.fillText(w.w, px, yy); }
        px += wd[i] + sp; });
    });
    g.restore(); return { w: maxW, h: lines.length * lh, size: sz, lines: lines.length };
  }
  const title = (g, s, x, y, size, lt, t0, o = {}) => words(g, s, x, y, size, lt, t0, Object.assign({ it: true, col: P.navy, keyCol: P.red }, o));
  // субтитр-плашка внизу (как в образце): CAPS[i] на фразу i; слова по времени фразы, *ключ красным
  let CAPW = 0;
  function caption(g, t, CAPS, o = {}) {
    const s = K.sub(t), spec = CAPS[s.i]; if (!spec) return;
    const lt = t - s.t0, dur = s.t1 - s.t0, ws = parseW(spec), size0 = o.size || 46, f0 = font(size0, {});
    let sp = meas(' ', f0), wd = ws.map(w => meas(w.w, f0)), tot = wd.reduce((a, b) => a + b, 0) + sp * (ws.length - 1), sz = size0;
    if (tot > 880) { const k = 880 / tot; sz *= k; sp *= k; wd = wd.map(v => v * k); tot = 880; }
    let last = 0; const at = ws.map((w, i) => { const v = w.at != null ? w.at : (i ? last + .3 : .05); last = v; return v; });
    const dk = o.dark == null ? CUR.dark : o.dark, y = o.y || 1592, ph = sz * 1.9, pw = tot + 76, x0 = W / 2 - pw / 2;
    const fin = s.i === K.subs.length - 1, aIn = eo(pr(lt, at[0], at[0] + .2)), aOut = fin ? 1 : 1 - pr(lt, dur - .12, dur), A0 = g.globalAlpha, a = aIn * aOut;
    if (a <= 0) return;
    g.save(); g.globalAlpha = A0 * a; g.fillStyle = dk ? 'rgba(22,20,19,.88)' : 'rgba(248,244,235,.9)'; g.fillRect(Math.round(x0), Math.round(y - ph / 2), Math.round(pw), Math.round(ph));
    g.strokeStyle = dk ? 'rgba(232,225,211,.22)' : 'rgba(43,35,29,.2)'; g.lineWidth = 1; g.strokeRect(Math.round(x0) + .5, Math.round(y - ph / 2) + .5, Math.round(pw) - 1, Math.round(ph) - 1);
    g.font = font(sz, {}); g.textBaseline = 'alphabetic'; let px = W / 2 - tot / 2;
    ws.forEach((w, i) => { const q = eo(pr(lt, at[i], at[i] + .24)); if (q > 0) { g.globalAlpha = A0 * a * q; g.fillStyle = w.key ? (dk ? '#E0675B' : P.red) : (dk ? P.bone : P.ink); g.fillText(w.w, px, y + sz * .34 + (1 - q) * 8); } px += wd[i] + sp; });
    g.restore();
  }
  // машинопись: символы по одному (cps в секунду или at[] времена), курсор мигает
  function typed(g, s, x, y, size, lt, t0, o = {}) {
    const f = font(size, { kind: 'mono', b: o.b }), cw = meas('0', f), cps = o.cps || 14; let n = 0, px = x;
    g.save(); g.font = f; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; const A0 = g.globalAlpha;
    for (let i = 0; i < s.length; i++) { const ti = o.at ? o.at[i] : t0 + i / cps; if (ti == null || lt < ti) break; const q = pr(lt, ti, ti + .07);
      g.globalAlpha = A0 * (.35 + .65 * q); g.fillStyle = o.col || P.ink; g.fillText(s[i], px, y + (1 - q) * 3); px += cw; n++; }
    if (o.cursor !== false && lt >= (o.at ? o.at[0] : t0) - .3 && (o.cursorTill == null || lt < o.cursorTill) && Math.floor(lt * 2.6) % 2 === 0) { g.globalAlpha = A0 * .85; g.fillStyle = o.ccol || o.col || P.ink; g.fillRect(px + cw * .12, y - size * .74, cw * .62, size * .86); }
    g.restore(); return { n, w: px - x, cw };
  }
  // наборная гравированная надпись (спрайт): fill 'hatch' (линии внутри + контур) или 'solid'; shadow штрихованная тень
  const DT = new Map();
  function dtype(s, size, o = {}) {
    const key = [s, size, o.it, o.b, o.kind, o.fill, o.shadow, o.col].join('|'); if (DT.has(key)) return DT.get(key);
    const f = font(size, { it: o.it, b: o.b == null ? true : o.b, kind: o.kind }), tw = meas(s, f), pad = Math.ceil(size * .14), sh = o.shadow === false ? 0 : Math.ceil(size * .055);
    const w = Math.ceil(tw + pad * 2 + sh + (o.it ? size * .2 : 0)), h = Math.ceil(size * 1.22 + pad * 2 + sh), bx = pad, by = Math.round(pad + size * .96), ink = o.col || P.ink;
    const [c, x] = mkC(w, h); x.font = f; x.textBaseline = 'alphabetic';
    if (sh) { const [c2, x2] = mkC(w, h); x2.font = f; x2.fillStyle = '#000'; x2.fillText(s, bx + sh, by + sh); x2.globalCompositeOperation = 'source-in'; x2.fillStyle = pat(x2, 45, 4, 1.5, ink); x2.fillRect(0, 0, w, h); x.drawImage(c2, 0, 0); }
    if (o.fill === 'solid') { x.fillStyle = ink; x.fillText(s, bx, by); }
    else { x.fillStyle = o.bg || P.sheet; x.fillText(s, bx, by); const [c3, x3] = mkC(w, h); x3.font = f; x3.fillStyle = '#000'; x3.fillText(s, bx, by);
      x3.globalCompositeOperation = 'source-in'; x3.fillStyle = pat(x3, 0, Math.max(4, Math.round(size / 42)), Math.max(1.6, size / 70), ink); x3.fillRect(0, 0, w, h); x.drawImage(c3, 0, 0);
      x.lineWidth = Math.max(1.6, size * .012); x.strokeStyle = ink; x.lineJoin = 'round'; x.strokeText(s, bx, by); }
    const sp = { c, sx: 0, sy: 0, w, h, ax: 0, ay: by / h, tw, pad }; DT.set(key, sp); return sp;
  }
  // показать наборную надпись: al left|center|right от x, y = базовая линия; проявление слева направо
  function display(g, s, x, y, size, lt, t0, o = {}) {
    const sp = dtype(s, size, o), q = pr(lt, t0, t0 + (o.dur || .45)); if (q <= 0) return sp;
    const x0 = o.al === 'center' ? x - sp.tw / 2 - sp.pad : o.al === 'right' ? x - sp.tw - sp.pad : x - sp.pad, oa = o.out == null ? 1 : out(lt, o.out, .2);
    put(g, sp, x0, y + (1 - eo(q)) * size * .1, { ax: 0, rv: eio(q), dir: 'right', a: oa * (o.a == null ? 1 : o.a) }); return sp;
  }

  // ---------- пометки: зачёркивание, крест, плюс, корона, линейки, лучи ----------
  function strike(g, x0, x1, y, p, o = {}) { p = eo(cl(p)); if (p <= 0) return; const tl = o.tilt == null ? -9 : o.tilt, n = 14, ex = lerp(x0, x1, p);
    g.save(); g.strokeStyle = o.col || P.red; g.lineCap = 'round'; g.lineWidth = o.lw || 7; g.globalAlpha *= o.a == null ? 1 : o.a; g.beginPath();
    for (let i = 0; i <= n; i++) { const f = i / n, xx = lerp(x0, x1, f); if (xx > ex) { g.lineTo(ex, y + tl * pr(ex, x0, x1) + 1.5); break; } const yy = y + tl * f + Math.sin(i * 1.9 + (o.seed || 0)) * 1.5; i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
    g.stroke(); g.restore(); }
  function dagger(g, x, y, s, p, col = P.red) { p = cl(p); if (p <= 0) return; g.save(); g.strokeStyle = col; g.lineCap = 'round'; g.lineWidth = s * .13;
    const a = eo(pr(p, 0, .6)), b = eo(pr(p, .45, 1)); g.beginPath(); g.moveTo(x, y - s); g.lineTo(x, y - s + 2 * s * a); g.stroke();
    if (b > 0) { g.beginPath(); g.moveTo(x - s * .42 * b, y - s * .42); g.lineTo(x + s * .42 * b, y - s * .42); g.stroke(); } g.restore(); }
  function plus(g, x, y, s, p, col = P.red) { p = cl(p); if (p <= 0) return; g.save(); g.strokeStyle = col; g.lineCap = 'round'; g.lineWidth = s * .2; const a = eo(pr(p, 0, .55)), b = eo(pr(p, .4, 1));
    g.beginPath(); g.moveTo(x - s * a, y); g.lineTo(x + s * a, y); g.stroke(); if (b > 0) { g.beginPath(); g.moveTo(x, y - s * b); g.lineTo(x, y + s * b); g.stroke(); } g.restore(); }
  function crown(g, x, y, s, p, o = {}) { // золотая корона-значок; p 0…1 появление с лёгким перелётом
    if (p <= 0) return; const e = eb(cl(p)); g.save(); g.translate(x, y); g.rotate(((1 - cl(p)) * -22 + (o.rot || 0)) * DEG); g.scale(s * e / 100, s * e / 100);
    g.beginPath(); g.moveTo(-50, 40); g.lineTo(50, 40); g.lineTo(54, -16); g.lineTo(24, 8); g.lineTo(0, -38); g.lineTo(-24, 8); g.lineTo(-54, -16); g.closePath();
    g.fillStyle = P.gold; g.fill(); g.lineWidth = 3.5; g.strokeStyle = P.goldD; g.lineJoin = 'round'; g.stroke();
    g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 6; i++) { g.moveTo(14 + i * 6, 38); g.lineTo(26 + i * 5, 12 - i * 2); } g.moveTo(-48, 24); g.lineTo(48, 24); g.stroke();
    g.fillStyle = P.goldL; [[-54, -16], [0, -38], [54, -16]].forEach(([a, b]) => { g.beginPath(); g.arc(a, b, 8, 0, TAU); g.fill(); g.stroke(); });
    g.fillStyle = P.red; [-26, 0, 26].forEach(a => { g.beginPath(); g.moveTo(a, 25); g.lineTo(a + 6, 32); g.lineTo(a, 39); g.lineTo(a - 6, 32); g.closePath(); g.fill(); });
    g.restore(); }
  function rule(g, x, y, w, p, o = {}) { p = eo(cl(p)); if (p <= 0) return; const hw = w / 2 * p, col = o.col || P.sepia; g.save(); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = o.lw || 1.6; g.globalAlpha *= o.a == null ? 1 : o.a;
    g.beginPath(); g.moveTo(x - hw, y); g.lineTo(x + hw, y); g.stroke(); if (o.orn !== false) { const r = 7 * p; g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 1.6, y); g.lineTo(x, y + r); g.lineTo(x - r * 1.6, y); g.closePath(); g.fill();
      [-1, 1].forEach(sd => { g.beginPath(); g.arc(x + sd * hw, y, 2.6 * p, 0, TAU); g.fill(); }); } g.restore(); }
  function rays(g, cx, cy, r0, r1, n, o = {}) { // гравюрное сияние: тонкие лучи, чередуются длинные/короткие
    g.save(); g.strokeStyle = o.col || P.ink; g.lineWidth = o.lw || 1.5; g.globalAlpha *= o.a == null ? .35 : o.a; g.beginPath(); const rt = (o.rot || 0) * DEG;
    for (let i = 0; i < n; i++) { const a = rt + i / n * TAU, l = i % 2 ? r1 : lerp(r0, r1, .78), c = Math.cos(a), s = Math.sin(a); g.moveTo(cx + c * r0, cy + s * r0); g.lineTo(cx + c * l, cy + s * l); }
    g.stroke(); g.restore(); }
  function burst(g, lt, t0, x, y, o = {}) { const p = pr(lt, t0, t0 + (o.dur || .5)); if (p <= 0 || p >= 1) return; const r = o.r || 70, n = o.n || 10;
    g.save(); g.strokeStyle = o.col || P.gold; g.lineCap = 'round'; g.lineWidth = o.lw || 3.5; g.globalAlpha *= 1 - p; g.beginPath();
    for (let i = 0; i < n; i++) { const a = i / n * TAU + .2, a0 = r * (.35 + .65 * eo(p)), a1 = a0 + r * .35 * (1 - p); g.moveTo(x + Math.cos(a) * a0, y + Math.sin(a) * a0); g.lineTo(x + Math.cos(a) * a1, y + Math.sin(a) * a1); }
    g.stroke(); g.restore(); }

  // ---------- плашки: подпись, тёмная табличка, штамп, паспарту ----------
  function label(g, s, x, y, lt, t0, o = {}) { // белая бирка капителью; to:[x,y] выноска к точке; al left|center|right
    const a = ap(lt, t0, .28) * (o.out == null ? 1 : out(lt, o.out)); if (a <= 0) return; const size = o.size || 36, tw = capsW(s.toUpperCase(), size), pw = tw + size * 1.1, ph = size * 1.75;
    const bx = Math.round(o.al === 'left' ? x : o.al === 'right' ? x - pw : x - pw / 2), by = Math.round(y - ph / 2 + (1 - a) * 12);
    g.save(); g.globalAlpha *= a;
    if (o.to) { const q = eo(pr(lt, t0 + .12, t0 + .55)), sx = cl(o.to[0], bx, bx + pw), sy = o.to[1] < by ? by : o.to[1] > by + ph ? by + ph : by + ph / 2, ex = lerp(sx, o.to[0], q), ey = lerp(sy, o.to[1], q);
      g.strokeStyle = o.lcol || P.ink; g.lineWidth = 1.6; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke(); if (q > .97) { g.fillStyle = o.lcol || P.ink; g.beginPath(); g.arc(ex, ey, 5, 0, TAU); g.fill(); } }
    g.fillStyle = o.dark ? 'rgba(28,26,25,.94)' : 'rgba(249,246,238,.96)'; g.fillRect(bx, by, Math.round(pw), Math.round(ph));
    g.strokeStyle = o.dark ? 'rgba(232,225,211,.4)' : 'rgba(43,35,29,.5)'; g.lineWidth = 1.2; g.strokeRect(bx + .5, by + .5, Math.round(pw) - 1, Math.round(ph) - 1);
    caps(g, s, bx + pw / 2, by + ph / 2 + size * .36, size, { al: 'center', col: o.col || (o.dark ? P.bone : P.ink) }); g.restore();
  }
  function plaque(g, s, x, y, lt, t0, o = {}) { // тёмная табличка с золотой капителью (раскрывается от центра)
    const p = eo(pr(lt, t0, t0 + .4)); if (p <= 0) return; const size = o.size || 40, tr = size * .24, tw = capsW(s.toUpperCase(), size, { tr }), pw = tw + size * 1.8, ph = size * 2.1, cw = pw * p;
    g.save(); g.fillStyle = 'rgba(33,29,26,.95)'; g.fillRect(Math.round(x - cw / 2), Math.round(y - ph / 2), Math.round(cw), Math.round(ph));
    g.strokeStyle = rgba(P.gold, .55); g.lineWidth = 1.2; g.strokeRect(Math.round(x - cw / 2) + 6.5, Math.round(y - ph / 2) + 6.5, Math.max(0, Math.round(cw) - 13), Math.round(ph) - 13);
    g.beginPath(); g.rect(x - cw / 2, y - ph / 2, cw, ph); g.clip(); caps(g, s, x, y + size * .36, size, { al: 'center', col: P.goldL, tr, a: eo(pr(lt, t0 + .12, t0 + .32)) }); g.restore();
  }
  const ST = new Map();
  function stampSprite(s, size, rot, col, sub) {
    const key = [s, size, rot, col, sub].join('|'); if (ST.has(key)) return ST.get(key);
    s = s.toUpperCase(); const f = font(size, { kind: 'mono', b: true }), tr = size * .1; let tw = 0; for (const ch of s) tw += meas(ch, f) + tr; tw -= tr;
    const fs = font(size * .38, { kind: 'mono', b: true }), sw = sub ? meas(sub, fs) : 0, bw = Math.max(tw, sw) + size * 1.1, bh = size * (sub ? 1.95 : 1.5), a = rot * DEG;
    const cw = Math.ceil(Math.abs(bw * Math.cos(a)) + Math.abs(bh * Math.sin(a)) + 16), ch = Math.ceil(Math.abs(bw * Math.sin(a)) + Math.abs(bh * Math.cos(a)) + 16), [c, x] = mkC(cw, ch), R = rnd(shash(s));
    x.translate(cw / 2, ch / 2); x.rotate(a); x.strokeStyle = x.fillStyle = col; x.lineJoin = 'round';
    x.lineWidth = size * .085; x.strokeRect(-bw / 2, -bh / 2, bw, bh); x.lineWidth = size * .03; x.strokeRect(-bw / 2 + size * .15, -bh / 2 + size * .15, bw - size * .3, bh - size * .3);
    x.font = f; x.textBaseline = 'alphabetic'; let px = -tw / 2; const ty = sub ? size * .12 : size * .36; for (const chh of s) { x.fillText(chh, px, ty); px += meas(chh, f) + tr; }
    if (sub) { x.font = fs; x.textAlign = 'center'; x.fillText(sub, 0, size * .66); }
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 170; i++) { x.globalAlpha = .4 + R() * .6; x.beginPath(); x.arc(R() * cw, R() * ch, .5 + R() * 2.2, 0, TAU); x.fill(); }
    for (let i = 0; i < 5; i++) { const gx = R() * cw, gy = R() * ch, r = 20 + R() * 50, gr = x.createRadialGradient(gx, gy, 0, gx, gy, r); gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.globalAlpha = 1; x.fillStyle = gr; x.fillRect(gx - r, gy - r, r * 2, r * 2); }
    x.globalAlpha = .5; x.lineWidth = 1.2; for (let i = 0; i < 4; i++) { x.beginPath(); const y0 = R() * ch; x.moveTo(0, y0); x.lineTo(cw, y0 + (R() - .5) * 30); x.stroke(); }
    const sp = { c, sx: 0, sy: 0, w: cw, h: ch, ax: .5, ay: .5 }; ST.set(key, sp); return sp;
  }
  function stamp(g, s, x, y, lt, t0, o = {}) { // красный штамп: удар за 0,14 с и микро-отскок; удар добавь в hits сцены
    if (lt < t0) return; const sp = stampSprite(s, o.size || 56, o.rot == null ? -8 : o.rot, o.col || P.red, o.sub), d = lt - t0, q = d / .14, A = o.a == null ? .92 : o.a;
    if (q < 1) put(g, sp, x, y, { sc: 1.6 - .6 * q * q, a: A * (.25 + .75 * q * q) });
    else { const k = d - .14; put(g, sp, x, y, k > .4 ? { a: A } : { a: A, sc: 1 - .035 * Math.exp(-k * 14) * Math.cos(k * 38) }); }
  }
  const CS = new Map();
  function cardShadow(w, h) { const key = w + 'x' + h; if (CS.has(key)) return CS.get(key); const [c, x] = mkC(w + 80, h + 80);
    x.shadowColor = 'rgba(70,48,24,.42)'; x.shadowBlur = 26; x.shadowOffsetY = 12; x.fillStyle = 'rgba(70,48,24,.25)'; x.fillRect(40, 34, w, h); const s = { c, sx: 0, sy: 0, w: w + 80, h: h + 80, ax: 0, ay: 0 }; CS.set(key, s); return s; }
  // карточка-паспарту (как портреты в образце): cx,cy центр; въезжает пружиной снизу; inner(g, cx, cy, w, h) рисует картинку
  function card(g, cx, cy, w, h, lt, t0, o = {}, inner) {
    if (lt < t0) return; const sp = spring(lt - t0, o.f || 1.5, .58), a = ap(lt, t0, .2) * (o.out == null ? 1 : out(lt, o.out));
    const x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2 + (1 - sp) * (o.from == null ? 260 : o.from)), capH = o.cap ? (o.sub ? 126 : 96) : 0;
    g.save(); g.globalAlpha *= a; put(g, cardShadow(w, h), x0 - 40, y0 - 40);
    g.fillStyle = P.mat; g.fillRect(x0, y0, w, h); g.strokeStyle = 'rgba(43,35,29,.35)'; g.lineWidth = 1; g.strokeRect(x0 + .5, y0 + .5, w - 1, h - 1);
    g.strokeStyle = P.redL; g.lineWidth = 1.6; g.strokeRect(x0 + 13.5, y0 + 13.5, w - 27, h - 27);
    const ix = x0 + 30, iy = y0 + 30, iw = w - 60, ih = h - 60 - capH;
    if (inner) { g.save(); g.beginPath(); g.rect(ix, iy, iw, ih); g.clip(); inner(g, ix + iw / 2, iy + ih / 2, iw, ih); g.restore(); }
    g.strokeStyle = 'rgba(43,35,29,.45)'; g.lineWidth = 1; g.strokeRect(ix + .5, iy + .5, iw - 1, ih - 1);
    if (o.cap) { caps(g, o.cap, cx, y0 + h - capH + 46, o.capSize || 36, { al: 'center', max: iw }); if (o.sub) { rule(g, cx, y0 + h - capH + 62, 110, 1, { orn: false, lw: 1.2, a: .7 }); text(g, o.sub, cx, y0 + h - 30, 27, { it: true, al: 'center', col: P.sepia, max: iw }); } }
    g.restore();
  }
  function list(g, items, x, y, size, lt, t0, o = {}) { // нумерованный список i. ii. iii. с красными цифрами
    const step = o.step || .45, lh = size * (o.lh || 1.35);
    items.forEach((s, i) => { const a = ap(lt, t0 + i * step, .3); if (a <= 0) return; const yy = y + i * lh + (1 - a) * 10;
      text(g, roman(i + 1).toLowerCase() + '.', x, yy, size * .72, { it: true, col: P.red, a, al: 'right' }); text(g, s, x + size * .35, yy, size, { it: o.it, col: o.col || P.ink, a }); });
  }

  // ---------- счётчики: барабан цифр, год в картуше, колонтитулы ----------
  function odo(g, v, x, y, size, o = {}) { // барабанный счётчик (цифры прокручиваются), y = базовая линия; возвращает ширину
    const f = font(size, { b: o.b, it: o.it, kind: o.kind || 'serif' }), dw = meas('0', f), av = Math.abs(v), n = o.digits || 4, gap = o.group ? dw * .32 : 0, cols = []; let ws = 0;
    for (let k = n - 1; k >= 0; k--) { const p10 = Math.pow(10, k), vis = k === 0 ? 1 : cl(av - (p10 - 1)), gg = o.group && k % 3 === 0 && k > 0 ? gap * vis : 0; cols.push({ k, p10, vis, gg }); ws += dw * vis + gg; }
    let px = o.al === 'left' ? x : o.al === 'right' ? x - ws : x - ws / 2; const lh = size * 1.08, A0 = g.globalAlpha;
    g.save(); g.font = f; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = o.col || P.ink;
    for (const c of cols) { if (c.vis > .001) { const pk = av / c.p10, base = Math.floor(pk + 1e-9), d0 = base % 10; let fr = c.k === 0 ? pk - base : cl(av - base * c.p10 - (c.p10 - 1)); fr = eio(fr); const cx = px + dw * c.vis / 2;
      g.save(); g.beginPath(); g.rect(px - 3, y - size * .95, dw * c.vis + 6, size * 1.22); g.clip(); g.globalAlpha = A0 * c.vis; g.fillText(String(d0), cx, y - fr * lh); if (fr > .001) g.fillText(String((d0 + 1) % 10), cx, y - fr * lh + lh); g.restore(); }
      px += dw * c.vis + c.gg; }
    g.restore(); return ws;
  }
  // год в картуше: KEYS [[t, значение, подпись, длительность прокрутки]]; отрицательный год = до н. э.
  function year(g, t, KEYS, o = {}) {
    let v = KEYS[0][1], lab = KEYS[0][2], pl = lab, q = 1;
    for (let i = 1; i < KEYS.length; i++) { const k = KEYS[i]; if (t < k[0]) break; q = pr(t, k[0], k[0] + (k[3] || .8)); v = lerp(KEYS[i - 1][1], k[1], eio(q)); pl = KEYS[i - 1][2]; lab = k[2]; }
    const a = o.a == null ? 1 : o.a; if (a <= 0) return v; const x = o.x || 540, y = o.y || 236, s = o.size || 66, col = o.dark ? P.bone : P.ink;
    g.save(); g.globalAlpha *= a; const w = odo(g, v, x, y, s, { col, digits: 4 }), hw = Math.max(w / 2 + 30, 90), oy = y - s * .34;
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1.4; g.globalAlpha *= .75;
    [-1, 1].forEach(sd => { const x0 = x + sd * hw, x1 = x0 + sd * 120; g.beginPath(); g.moveTo(x0, oy); g.lineTo(x1, oy); g.moveTo(x0 + sd * 12, oy - 6); g.lineTo(x1 - sd * 26, oy - 6); g.stroke();
      g.beginPath(); g.moveTo(x0, oy - 6); g.lineTo(x0 + sd * 9, oy); g.lineTo(x0, oy + 6); g.lineTo(x0 - sd * 9, oy); g.closePath(); g.fill(); });
    g.globalAlpha /= .75; const la = pl === lab ? lab : q < .5 ? pl : lab, fa = pl === lab ? 1 : Math.abs(q * 2 - 1);
    if (la) caps(g, la, x, y + 38, 21, { al: 'center', col: o.dark ? P.bone : P.sepia, a: fa });
    g.restore(); return v;
  }
  function chrome(g, t, o = {}) { // рамка страницы и колонтитулы: tl, tr, bl, br
    const dk = o.dark == null ? CUR.dark : o.dark, c = dk ? P.bone : P.ink;
    g.save(); g.strokeStyle = rgba(c, dk ? .32 : .42); g.lineWidth = 1.6; g.strokeRect(44.5, 92.5, 991, 1624); g.strokeStyle = rgba(c, .2); g.lineWidth = .9; g.strokeRect(53.5, 101.5, 973, 1606);
    const hc = dk ? P.bone : P.sepia, ha = .8;
    if (o.tl) caps(g, o.tl, 78, 140, 19, { col: hc, a: ha }); if (o.tr) caps(g, o.tr, 1002, 140, 19, { col: hc, a: ha, al: 'right' });
    if (o.bl) caps(g, o.bl, 78, 1686, 19, { col: hc, a: ha }); if (o.br) caps(g, o.br, 1002, 1686, 19, { col: hc, a: ha, al: 'right' });
    g.restore();
  }
  const clock = t => { const s = Math.floor(t); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

  // ---------- живые элементы: пар, струя, маршрут, румбы ----------
  function steam(g, lt, x, y, o = {}) { const n = o.n || 3, hh = o.h || 150, sp = o.sp || 40, A = o.a == null ? .55 : o.a, col = o.col || P.ink;
    g.save(); g.lineWidth = o.lw || 2.6; g.lineCap = 'round';
    for (let i = 0; i < n; i++) { const ph = lt * 1.7 + i * 2.3, x0 = x + (i - (n - 1) / 2) * sp, gr = g.createLinearGradient(0, y, 0, y - hh);
      gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(.25, rgba(col, A)); gr.addColorStop(1, rgba(col, 0)); g.strokeStyle = gr; g.beginPath();
      for (let k = 0; k <= 16; k++) { const f = k / 16, yy = y - f * hh, xx = x0 + Math.sin(f * 5.5 - ph) * 13 * (.3 + f); k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); }
    g.restore(); }
  function pour(g, x0, y0, x1, y1, lt, p, o = {}) { // струя жидкости от (x0,y0) до (x1,y1); p доля пути
    p = cl(p); if (p <= 0) return; const wd = o.w || 22, n = 24, A = [], B = [];
    for (let k = 0; k <= n; k++) { const f = k / n * p, x = x0 + (x1 - x0) * Math.sin(f * PI / 2), y = y0 + (y1 - y0) * f, tx = (x1 - x0) * PI / 2 * Math.cos(f * PI / 2), ty = y1 - y0, tl = Math.hypot(tx, ty) || 1;
      const w = wd * (.8 - .3 * f) / 2 + 1.6 * Math.sin(f * 13 - lt * 15), nx = -ty / tl, ny = tx / tl; A.push(x + nx * w, y + ny * w); B.unshift(x - nx * w, y - ny * w); }
    g.save(); poly(g, A.concat(B)); g.fillStyle = o.col || P.sheet; g.fill(); g.strokeStyle = P.ink; g.lineWidth = 2; g.stroke();
    if (p >= 1) { g.lineWidth = 2; for (let i = 0; i < 3; i++) { const q = ((lt * 2.2 + i / 3) % 1), r = 10 + q * 46; g.globalAlpha = 1 - q; g.beginPath(); g.ellipse(x1, y1 + 4, r, r * .28, 0, PI * 1.05, PI * 1.95); g.stroke(); } }
    g.restore(); }
  function route(g, pts, p, o = {}) { // пунктир по точкам до доли p; возвращает голову [x, y]
    let L = 0; const seg = []; for (let i = 2; i < pts.length; i += 2) { const d = Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]); seg.push(d); L += d; }
    let rem = L * cl(p), hx = pts[0], hy = pts[1]; if (p <= 0) return [hx, hy];
    g.save(); g.strokeStyle = o.col || P.red; g.lineWidth = o.lw || 4; g.setLineDash(o.dash || [14, 11]); g.beginPath(); g.moveTo(pts[0], pts[1]);
    for (let i = 0; i < seg.length && rem > 0; i++) { const f = Math.min(1, rem / seg[i]); hx = lerp(pts[i * 2], pts[i * 2 + 2], f); hy = lerp(pts[i * 2 + 1], pts[i * 2 + 3], f); g.lineTo(hx, hy); rem -= seg[i]; }
    g.stroke(); g.setLineDash([]); g.restore(); return [hx, hy]; }
  function rhumb(g, cx, cy, len, o = {}) { const n = o.n || 16; g.save(); g.strokeStyle = o.col || P.ink; g.lineWidth = o.lw || 1.1; g.globalAlpha *= o.a == null ? .22 : o.a; g.beginPath();
    for (let i = 0; i < n; i++) { const a = i / n * TAU + (o.rot || 0) * DEG; g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len); } g.stroke(); g.restore(); }

  // ---------- готовые гравюры (возвращают спрайт; создавай на верхнем уровне файла) ----------
  function column(o = {}) {
    const sw = o.w || 180, h = o.h || 1200, w = Math.round(sw + 124), cx = w / 2, top = 120, bot = h - 112, L = [];
    const hw = f => sw / 2 * (.86 + .14 * Math.pow(f, .6)), sh = [];
    for (let i = 0; i <= 12; i++) sh.push(cx - hw(i / 12), lerp(top, bot, i / 12)); for (let i = 12; i >= 0; i--) sh.push(cx + hw(i / 12), lerp(top, bot, i / 12));
    L.push({ pts: sh, shade: 'cyl', d: [.05, .8], hatch: 'lin', ang: 90, per: 7, light: o.light || -160, cf: .62, line: 2.4 });
    L.push({ pts: rr(cx - hw(1) - 18, bot - 4, hw(1) * 2 + 36, 30, 15), shade: 'cyl', axis: 0, d: [.05, .8], hatch: 'lin', ang: 0, per: 5, light: -120 });
    L.push({ pts: rect(cx - hw(1) - 12, bot + 26, hw(1) * 2 + 24, 14), shade: 'flat', d: .72, hatch: 'lin', ang: 0, per: 4, cross: false });
    L.push({ pts: rr(cx - hw(1) - 30, bot + 38, hw(1) * 2 + 60, 34, 17), shade: 'cyl', axis: 0, d: [.05, .8], hatch: 'lin', ang: 0, per: 5, light: -120 });
    L.push({ pts: rect(cx - hw(1) - 46, h - 42, hw(1) * 2 + 92, 40), shade: 'lin', d: [.12, .6], hatch: 'lin', ang: 0, per: 6, light: -160 });
    L.push({ pts: rr(cx - hw(0) - 10, top - 20, hw(0) * 2 + 20, 20, 10), shade: 'cyl', axis: 0, d: [.05, .75], hatch: 'lin', ang: 0, per: 4.5 });
    L.push({ pts: rr(cx - sw / 2 - 26, 50, sw + 52, 52, 26), shade: 'cyl', axis: 0, d: [.05, .8], hatch: 'lin', ang: 0, per: 5 });
    L.push({ pts: rect(cx - sw / 2 - 54, 16, sw + 108, 34), shade: 'lin', d: [.08, .5], hatch: 'lin', ang: 0, per: 6, light: -160 });
    [-1, 1].forEach(s => L.push({ pts: ell(cx + s * (sw / 2 + 20), 86, 36, 36, 40), shade: 'sph', d: [.04, .7], hatch: 'ring', per: 5, cross: false }));
    return engrave({ w, h, layers: L, ax: .5, ay: 1, draw(x) {
      x.lineWidth = 1.3; for (let k = -5; k <= 5; k++) { const ph = k / 6 * PI / 2; x.globalAlpha = k > 1 ? .6 : .3; x.beginPath();
        for (let i = 0; i <= 12; i++) { const f = i / 12; x.lineTo(cx + hw(f) * Math.sin(ph), lerp(top + 2, bot - 4, f)); } x.stroke(); }
      x.globalAlpha = 1; x.lineWidth = 2.4; [-1, 1].forEach(s => { const vx = cx + s * (sw / 2 + 20); x.beginPath(); for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU * 2.2, r = 33 * (1 - i / 74); x.lineTo(vx + s * Math.cos(a) * r, 86 + Math.sin(a) * r); } x.stroke(); });
    } });
  }
  function globe(o = {}) {
    const r = o.r || 240, w = 2 * r + 16, c = w / 2, L = [];
    L.push({ pts: ell(c, c, r, r, 120), shade: 'sph', d: [.08, .88], hatch: 'lin', ang: 0, per: 6, light: -140, tint: o.sea || P.blue, ta: .22, line: 2.6 });
    (o.land || [[-.36, -.38, .42, .3], [.34, -.2, .3, .4], [-.16, .4, .38, .22], [.48, .46, .17, .13], [-.62, .12, .15, .22]]).forEach(([u, v, a, b], i) => {
      const pts = blob(c + u * r, c + v * r, a * r, b * r, (o.seed || 7) * 13 + i * 7, 22, .62);
      for (let j = 0; j < pts.length; j += 2) { const dx = pts[j] - c, dy = pts[j + 1] - c, dd = Math.hypot(dx, dy), m = r * .985; if (dd > m) { pts[j] = c + dx / dd * m; pts[j + 1] = c + dy / dd * m; } }
      L.push({ pts, frame: [c, c, r, r], shade: 'sph', d: [.02, .6], hatch: 'mer', per: 4.5, light: -140, tint: o.landTint || P.ochre, ta: .3, line: 1.6, cross: false });
    });
    return engrave({ w, h: w, layers: L, draw(x) {
      x.lineWidth = 1.1; x.globalAlpha = .4;
      for (let k = -2; k <= 2; k++) { const la = k * 30 * DEG, yy = c - Math.sin(la) * r, rx = Math.cos(la) * r; x.beginPath(); x.ellipse(c, yy, rx, rx * .12, 0, 0, PI); x.stroke(); }
      for (let k = -2; k <= 2; k++) { const rx = Math.max(1, Math.abs(Math.sin(k * 32 * DEG)) * r); x.beginPath(); if (k < 0) x.ellipse(c, c, rx, r, 0, PI / 2, PI * 1.5); else x.ellipse(c, c, rx, r, 0, -PI / 2, PI / 2); x.stroke(); }
      x.globalAlpha = 1; x.lineWidth = 2.6; x.beginPath(); x.arc(c, c, r, 0, TAU); x.stroke();
    } });
  }
  function wreath(o = {}) {
    const r = o.r || 300, s = Math.round(2 * r + 170), c = s / 2, n = o.n || 11, L = [], ribs = [];
    [1, -1].forEach(sd => { const band = []; for (let i = 0; i <= 30; i++) { const th = (90 + sd * (14 + i / 30 * 154)) * DEG; band.push(c + Math.cos(th) * (r - 3), c + Math.sin(th) * (r - 3)); }
      for (let i = 30; i >= 0; i--) { const th = (90 + sd * (14 + i / 30 * 154)) * DEG; band.push(c + Math.cos(th) * (r + 3), c + Math.sin(th) * (r + 3)); }
      L.push({ pts: band, shade: 'flat', d: .7, hatch: 'lin', ang: 0, per: 3, line: 1.2, cross: false }); });
    [1, -1].forEach(sd => { for (let i = 0; i < n; i++) { const f = i / (n - 1), th = (90 + sd * (18 + f * 148)) * DEG, bx = c + Math.cos(th) * r, by = c + Math.sin(th) * r, tg = Math.atan2(Math.cos(th) * sd, -Math.sin(th) * sd);
      [-1, 1].forEach(side => { const la = tg / DEG + side * 38, len = (80 - 30 * f) * (o.k || 1), sx = bx + Math.cos(tg) * 4, sy = by + Math.sin(tg) * 4;
        L.push({ pts: leaf(sx, sy, la, len, len * .44), shade: 'lin', d: [.06, .62], hatch: 'lin', ang: la + 62, per: 4.5, light: -120, tint: o.tint || P.gold, ta: .42, line: 1.6, cross: false }); ribs.push([sx, sy, la, len]); }); } });
    const by = c + r; [-1, 1].forEach(sd => L.push({ pts: [c + sd * 8, by - 6, c + sd * 96, by + 54, c + sd * 74, by + 76, c + sd * 2, by + 20], shade: 'lin', d: [.1, .6], hatch: 'lin', ang: 30, per: 5, tint: P.red, ta: .55, line: 1.6 }));
    L.push({ pts: ell(c, by + 4, 19, 15, 24), shade: 'sph', d: [.1, .7], hatch: 'lin', ang: 0, per: 4, tint: P.red, ta: .6 });
    return engrave({ w: s, h: s, layers: L, draw(x) { x.lineWidth = 1.2; ribs.forEach(([sx, sy, la, len]) => { const a = la * DEG; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + Math.cos(a) * len * .86, sy + Math.sin(a) * len * .86); x.stroke(); });
      x.fillStyle = P.ink; ribs.forEach(([sx, sy, la], i) => { if (i % 5 === 2) { const a = (la + 180) * DEG; x.beginPath(); x.arc(sx + Math.cos(a) * 12, sy + Math.sin(a) * 12, 5, 0, TAU); x.fill(); } }); } });
  }
  function ship(o = {}) { // галеон носом вправо; привязка ay = ватерлиния
    const w = 720, h = 720, L = [];
    [[176, 112, 430], [338, 24, 452], [486, 70, 440]].forEach(([mx, t0, b0]) => L.push({ pts: rect(mx - 6, t0, 12, b0 - t0), shade: 'cyl', d: [.1, .8], hatch: 'lin', ang: 90, per: 4, line: 1.4 }));
    L.push({ pts: [176, 124, 176, 404, 66, 384], shade: 'lin', d: [.04, .45], hatch: 'lin', ang: 75, per: 6, light: -160, line: 1.8 });
    [[210, 462, 302, 424, 30], [230, 444, 160, 290, 24], [388, 564, 322, 436, 26], [400, 550, 190, 312, 20]].forEach(([a, b, t, bt, bl]) => { const p = [];
      for (let i = 0; i <= 8; i++) p.push(lerp(a, b, i / 8), t + 2); for (let i = 1; i <= 6; i++) p.push(b + Math.sin(i / 6 * PI) * bl * .45, lerp(t, bt, i / 6));
      for (let i = 1; i <= 8; i++) p.push(lerp(b, a, i / 8), bt + Math.sin(i / 8 * PI) * bl); for (let i = 1; i < 6; i++) p.push(a - Math.sin(i / 6 * PI) * bl * .25, lerp(bt, t, i / 6));
      L.push({ pts: p, shade: 'cyl', axis: 90, d: [.02, .5], hatch: 'cyl', bend: -.1, per: 6, light: -175, cf: .62, line: 2 }); });
    [[200, 472, 300], [222, 452, 158], [380, 572, 320], [392, 558, 188]].forEach(([a, b, y]) => L.push({ pts: rr(a, y - 5, b - a, 10, 5), shade: 'cyl', axis: 0, d: [.1, .7], hatch: 'lin', ang: 0, per: 4, line: 1.4 }));
    [[338, 16], [486, 62], [176, 104]].forEach(([fx, fy]) => L.push({ pts: [fx, fy, fx + 74, fy + 10, fx + 54, fy + 17, fx + 78, fy + 27, fx, fy + 24], shade: 'flat', d: .22, hatch: 'lin', ang: 0, per: 5, tint: P.red, ta: .65, line: 1.4 }));
    const hull = spl([40, 404, 150, 428, 300, 452, 450, 448, 580, 420, 680, 380, 664, 440, 620, 530, 500, 606, 340, 632, 190, 624, 90, 592, 52, 500], true, 6);
    L.push({ pts: hull, shade: 'cyl', axis: 0, d: [.16, .88], hatch: 'lin', ang: 3, per: 6, light: -100, line: 2.6 });
    L.push({ pts: [34, 300, 190, 322, 190, 440, 40, 412], shade: 'lin', d: [.12, .58], hatch: 'lin', ang: 90, per: 6, light: -160, line: 2.2 });
    L.push({ pts: [520, 362, 646, 336, 670, 394, 540, 432], shade: 'lin', d: [.1, .5], hatch: 'lin', ang: 90, per: 6, light: -160, line: 2.2 });
    return engrave({ w, h, layers: L, ax: .5, ay: 600 / 720, draw(x) {
      const sheer = t => [lerp(40, 680, t), 404 + Math.sin(t * PI) * 48 - t * 24];
      x.lineWidth = 5; [30, 58].forEach(off => { x.beginPath(); for (let i = 0; i <= 20; i++) { const [sx, sy] = sheer(.06 + i / 20 * .86); x.lineTo(sx, sy + off); } x.stroke(); });
      for (let i = 0; i < 9; i++) { const [sx, sy] = sheer(.24 + i * .075); x.fillStyle = P.ink; x.fillRect(sx - 7, sy + 38, 14, 12); }
      x.lineWidth = 1.4; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) x.strokeRect(58 + i * 36, 330 + j * 34, 22, 22);
      x.lineWidth = 7; x.beginPath(); x.moveTo(640, 382); x.lineTo(716, 316); x.stroke();
      x.lineWidth = 1.3; x.globalAlpha = .75; x.beginPath();
      [[338, 30, 240, 446], [338, 30, 430, 446], [486, 76, 640, 384], [486, 76, 420, 448], [176, 116, 70, 404], [338, 30, 486, 76], [486, 76, 716, 316], [176, 116, 338, 30]].forEach(([a, b, c2, d2]) => { x.moveTo(a, b); x.lineTo(c2, d2); });
      [[338, 260], [486, 290], [176, 300]].forEach(([mx, my]) => { for (let k = 0; k < 4; k++) { x.moveTo(mx, my - k * 26); x.lineTo(mx - 70 + k * 10, 440 - k * 4); x.moveTo(mx, my - k * 26); x.lineTo(mx + 70 - k * 10, 436 - k * 4); } });
      x.stroke();
    } });
  }
  function waves(o = {}) { // полоса моря, бесшовная по горизонтали (сдвиг кратен tile); рисуй drawWaves
    const T = o.tile || 216, w = (o.w || 1080) + T, h = o.h || 230, rows = o.rows || 5, L = [], cr = [];
    for (let k = 0; k < rows; k++) { const yk = 28 + k * (h - 70) / (rows - 1), A = 8 + k * 4, lam = k % 2 ? T / 2 : T, ph = k * 1.3, f = x => yk - A * Math.pow(1 - Math.abs(Math.sin(PI * x / lam + ph)), 1.4), pts = [];
      for (let x = 0; x <= w; x += 6) pts.push(x, f(x)); pts.push(w, h + 2, 0, h + 2); cr.push([f, lam, ph, yk, A]);
      L.push({ pts, shade: 'lin', light: -90, d: [.1 + k * .04, .74 + k * .04], hatch: 'wave', ang: 0, per: 6, amp: A * .45, wl: lam, ph: PI / 2 + 2 * ph, line: 0, cross: k > 2, cf: .6 }); }
    const s = engrave({ w, h, layers: L, ax: 0, ay: 0, draw(x) { x.lineWidth = 2;
      cr.forEach(([f, lam, ph, yk, A]) => { x.beginPath(); for (let X = 0; X <= w; X += 4) x.lineTo(X, f(X)); x.stroke();
        x.lineWidth = 1.6; for (let m = -1; m <= w / lam + 1; m++) { const px = lam * (m - ph / PI); x.beginPath(); x.arc(px + 7, yk - A + 6, 7, PI * 1.1, PI * 2.1); x.stroke(); } x.lineWidth = 2; }); } });
    s.tile = T; s.vw = w - T; return s;
  }
  function drawWaves(g, s, x, y, scroll) { const c = s.c || (bake(s), s.c), off = ((Math.round(scroll) % s.tile) + s.tile) % s.tile; g.drawImage(c, off, 0, s.vw, s.h, Math.round(x), Math.round(y), s.vw, s.h); }
  function mountains(o = {}) {
    const w = o.w || 1080, h = o.h || 460, R = rnd(o.seed || 5), L = [];
    const range = (n, base, h0, h1, k) => { for (let i = 0; i < n; i++) {
      const px = (i + .5) / n * w + (R() - .5) * w / n * .45, ph = lerp(h0, h1, R()), wl = ph * (.95 + R() * .5), wr = ph * (.95 + R() * .5), sy = base - ph, j = (a) => (R() - .5) * a;
      const left = [], right = [], ridge = []; for (let q = 0; q <= 6; q++) { const f = q / 6, e = q && q < 6; left.push(lerp(px - wl, px, f) + (e ? j(20) : 0), lerp(base, sy, f) + (e ? j(24) : 0)); }
      for (let q = 1; q <= 6; q++) { const f = q / 6, e = q < 6; right.push(lerp(px, px + wr, f) + (e ? j(20) : 0), lerp(sy, base, f) + (e ? j(24) : 0)); }
      const rx = px + wr * .28; for (let q = 0; q <= 5; q++) { const f = q / 5, e = q && q < 5; ridge.push(lerp(px, rx, f) + (e ? j(28) : 0), lerp(sy, base, f)); }
      L.push({ pts: left.concat(ridge.slice(2)), shade: 'lin', light: -150, d: [.05 * k, .4 * k], hatch: 'lin', ang: -Math.atan2(ph, wl) / DEG, per: 6, line: 1.8, cross: false });
      const rv = []; for (let q = ridge.length - 2; q >= 2; q -= 2) rv.push(ridge[q], ridge[q + 1]);
      L.push({ pts: [px, sy].concat(right, rv), shade: 'lin', light: -150, d: [.42 * k, .86 * k], hatch: 'lin', ang: 62, per: 5.5, line: 1.8, cf: .58 });
      const sl = .3, a0 = [lerp(px, px - wl, sl), sy + ph * sl], a1 = [lerp(px, px + wr, sl), sy + ph * sl], snow = [px, sy - 1, a1[0], a1[1]];
      for (let q = 1; q < 6; q++) snow.push(lerp(a1[0], a0[0], q / 6), lerp(a1[1], a0[1], q / 6) + (q % 2 ? 20 : -8) + j(10)); snow.push(a0[0], a0[1]);
      L.push({ pts: snow, shade: 'lin', light: -150, d: [0, .3 * k], hatch: 'lin', ang: -30, per: 6, line: 1.6, cross: false });
    } };
    range(4, h - 70, h * .38, h * .6, .55); range(3, h - 10, h * .52, h * .82, 1);
    const hills = []; for (let x = 0; x <= w; x += 8) hills.push(x, h - 48 + Math.sin(x * .013 + 1) * 14 + Math.sin(x * .041) * 6); hills.push(w, h, 0, h);
    L.push({ pts: hills, shade: 'lin', light: -90, d: [.45, .8], hatch: 'wave', ang: 0, per: 5, amp: 4, wl: 60, line: 1.8 });
    return engrave({ w, h, layers: L, ax: .5, ay: 1 });
  }
  function balance(o = {}) { // весы: {post, beam, pan}; рисуй drawBalance
    const Lb = o.len || 300, ch = o.chain || 300, tint = o.tint || P.gold;
    const post = engrave({ w: 220, h: 800, ax: .5, ay: 40 / 800, layers: [
      { pts: rr(91, 50, 38, 640, 6), shade: 'cyl', d: [.08, .8], hatch: 'lin', ang: 90, per: 5, tint, ta: .25 },
      { pts: rr(70, 660, 80, 40, 10), shade: 'cyl', axis: 0, d: [.08, .75], hatch: 'lin', ang: 0, per: 5, tint, ta: .25 },
      { pts: rr(20, 700, 180, 30, 8), shade: 'lin', d: [.12, .6], hatch: 'lin', ang: 0, per: 5, light: -120 },
      { pts: rr(4, 730, 212, 56, 10), shade: 'lin', d: [.15, .7], hatch: 'lin', ang: 0, per: 6, light: -120 },
      { pts: ell(110, 40, 26, 26, 36), shade: 'sph', d: [.04, .8], hatch: 'ring', per: 4, tint, ta: .35 }] });
    const bw = 2 * Lb + 50, beam = engrave({ w: bw, h: 44, ax: .5, ay: .5, layers: [
      { pts: [25, 17, bw / 2 - 30, 9, bw / 2 + 30, 9, bw - 25, 17, bw - 25, 27, bw / 2 + 30, 35, bw / 2 - 30, 35, 25, 27], shade: 'cyl', axis: 0, d: [.06, .8], hatch: 'lin', ang: 0, per: 4, tint, ta: .3 },
      { pts: ell(25, 22, 13, 13, 24), shade: 'sph', d: [.05, .75], hatch: 'ring', per: 3.5, tint, ta: .35 }, { pts: ell(bw - 25, 22, 13, 13, 24), shade: 'sph', d: [.05, .75], hatch: 'ring', per: 3.5, tint, ta: .35 }] });
    const pan = engrave({ w: 270, h: 96, ax: .5, ay: 22 / 96, layers: [{ pts: ell(135, 22, 124, 66, 48, 0, PI), shade: 'cyl', d: [.08, .8], hatch: 'cyl', bend: .3, per: 5, tint, ta: .35, line: 2.2 }],
      draw(x) { x.lineWidth = 2.2; x.beginPath(); x.ellipse(135, 22, 124, 14, 0, 0, PI); x.stroke(); } });
    return { post, beam, pan, len: Lb, chain: ch };
  }
  function drawBalance(g, B, x, y, tilt, o = {}) { // tilt в градусах (+ правая чаша ниже); o.left/right(g, x, y) содержимое чаш
    put(g, B.post, x, y); const a = tilt * DEG, ex = Math.cos(a) * B.len, ey = Math.sin(a) * B.len, ends = [[x - ex, y - ey], [x + ex, y + ey]], res = [];
    ends.forEach(([px, py], i) => { const qx = Math.round(px), qy = Math.round(py + B.chain); res.push([qx, qy]);
      g.save(); g.strokeStyle = P.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(px, py); g.lineTo(qx - 118, qy + 4); g.moveTo(px, py); g.lineTo(qx + 118, qy + 4); g.moveTo(px, py); g.lineTo(qx, qy - 13); g.stroke();
      g.beginPath(); g.ellipse(qx, qy + 1, 124, 14, 0, PI, TAU); g.stroke(); g.restore();
      const fn = i ? o.right : o.left; if (fn) fn(g, qx, qy); put(g, B.pan, qx, qy); });
    put(g, B.beam, x, y, { rot: tilt }); g.fillStyle = P.goldD; g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill();
    return res;
  }
  function coin(o = {}) { const r = o.r || 42, w = 2 * r + 6, c = w / 2, tint = o.tint || P.gold;
    return engrave({ w, h: w, layers: [{ pts: ell(c, c, r, r, 48), shade: 'sph', d: [.15, .6], hatch: 'ring', per: 3.5, tint, ta: .65, line: 2, cross: false },
      { pts: ell(c, c, r * .74, r * .74, 40), shade: 'lin', d: [.08, .45], hatch: 'lin', ang: 45, per: 4, tint, ta: .5, line: 1.2, cross: false }],
      draw(x) { x.lineWidth = 2; x.beginPath(); x.arc(c, c, r * .24, 0, TAU); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; x.moveTo(c + Math.cos(a) * r * .32, c + Math.sin(a) * r * .32); x.lineTo(c + Math.cos(a) * r * .54, c + Math.sin(a) * r * .54); } x.stroke();
        for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; x.beginPath(); x.arc(c + Math.cos(a) * r * .86, c + Math.sin(a) * r * .86, 1.4, 0, TAU); x.fill(); } } });
  }
  function compass(o = {}) { const r = o.r || 150, w = 2 * r + 12, c = w / 2, L = [];
    [[1, .42, .08], [2, .66, .11], [0, 1, .15]].forEach(([cls, lf, bf]) => { for (let i = 0; i < 16; i++) { const k = i % 4 === 0 ? 0 : i % 2 === 0 ? 2 : 1; if (k !== cls) continue;
      const a = (i * 22.5 - 90) * DEG, ca = Math.cos(a), sa = Math.sin(a), len = r * lf * .94, bw = r * bf, tx = c + ca * len, ty = c + sa * len, bx = c + ca * bw * .9, by = c + sa * bw * .9;
      [-1, 1].forEach(sd => L.push({ pts: [c, c, tx, ty, bx - sa * bw * sd, by + ca * bw * sd], shade: 'flat', d: sd > 0 ? .72 : .05, hatch: 'lin', ang: a / DEG, per: sd > 0 ? 3.6 : 5, cross: false, line: 1.4 })); } });
    return engrave({ w, h: w, layers: L, draw(x) { x.lineWidth = 1.6; [.97, .88, .3].forEach(k => { x.beginPath(); x.arc(c, c, r * k, 0, TAU); x.stroke(); });
      x.lineWidth = 1.2; x.beginPath(); for (let i = 0; i < 72; i++) { const a = i / 72 * TAU, l = i % 6 ? .92 : .9; x.moveTo(c + Math.cos(a) * r * l, c + Math.sin(a) * r * l); x.lineTo(c + Math.cos(a) * r * .97, c + Math.sin(a) * r * .97); } x.stroke();
      x.beginPath(); x.arc(c, c, r * .05, 0, TAU); x.fill(); } });
  }
  function drape(o = {}) { // ламбрекен с фестонами (ay = 0: привязка за верхний край)
    const w = o.w || 1080, h = o.h || 300, n = o.n || 3, sw = w / n, sag = o.sag || h * .55, L = [], tint = o.tint || P.red;
    for (let i = 0; i < n; i++) { const x0 = i * sw - 14, x1 = x0 + sw + 28, mx = (x0 + x1) / 2, p = [x0, 20, x1, 20]; for (let k = 0; k <= 16; k++) { const f = k / 16; p.push(lerp(x1, x0, f), 30 + Math.sin(f * PI) * sag); }
      L.push({ pts: p, shade: 'lin', light: -100, d: [.12, .78], hatch: 'ring', cx: mx, cy: -sag * .5, rk: 1.25, per: 6, tint, ta: .42, line: 2 }); }
    for (let i = 0; i <= n; i++) { const xx = i * sw; L.push({ pts: [xx - 28, 16, xx + 28, 16, xx + 32, h * .78, xx + 12, h * .7, xx - 6, h * .88, xx - 32, h * .76], shade: 'cyl', d: [.1, .8], hatch: 'lin', ang: 90, per: 5, tint, ta: .45, line: 2 }); }
    L.push({ pts: rect(-4, 0, w + 8, 24), shade: 'cyl', axis: 0, d: [.05, .7], hatch: 'lin', ang: 0, per: 4, tint: P.gold, ta: .45, line: 2 });
    return engrave({ w, h: h + 40, layers: L, ax: .5, ay: 0, draw(x) {
      x.lineWidth = 1.3; for (let i = 0; i < n; i++) { const x0 = i * sw - 14, x1 = x0 + sw + 28; [.42, .68, .86].forEach(k => { x.beginPath(); for (let q = 0; q <= 16; q++) { const f = q / 16; x.lineTo(lerp(x1 - 40 * (1 - k), x0 + 40 * (1 - k), f), 26 + Math.sin(f * PI) * sag * k); } x.stroke(); }); }
      for (let i = 0; i <= n; i++) { const xx = i * sw, yy = h * .86; x.lineWidth = 1.6; x.beginPath(); for (let k = -4; k <= 4; k++) { x.moveTo(xx + k * 2.4, yy); x.lineTo(xx + k * 3.8, yy + 34); } x.stroke(); x.fillStyle = P.gold; x.beginPath(); x.arc(xx, yy - 4, 9, 0, TAU); x.fill(); x.stroke(); }
    } });
  }
  function pyramid(o = {}) { // ступенчатая пирамида с храмом (ay = 1: привязка за основание)
    const w = o.w || 820, h = o.h || 500, n = o.steps || 6, L = [], top = 140, lh = (h - top) / n, ins = w * .3 / n, sb = 74, st = 44;
    for (let i = 0; i < n; i++) { const yb = h - i * lh, yt = yb - lh + 3, x0 = 20 + i * ins, x1 = w - 20 - i * ins; L.push({ pts: [x0, yb, x1, yb, x1 - 12, yt, x0 + 12, yt], shade: 'lin', light: -170, d: [.1, .62], hatch: 'lin', ang: 0, per: 6, cf: .5, line: 1.8 }); }
    L.push({ pts: [w / 2 - sb, h, w / 2 + sb, h, w / 2 + st, top + 6, w / 2 - st, top + 6], shade: 'lin', light: -170, d: [.18, .42], hatch: 'lin', ang: 0, per: 4.2, cross: false, line: 1.8 });
    L.push({ pts: rect(w / 2 - 92, top - 80, 184, 86), shade: 'lin', light: -160, d: [.1, .5], hatch: 'lin', ang: 90, per: 5, line: 2 });
    L.push({ pts: rect(w / 2 - 25, top - 58, 50, 64), shade: 'flat', d: .92, hatch: 'lin', ang: 90, per: 4, line: 1.6 });
    L.push({ pts: [w / 2 - 70, top - 80, w / 2 + 70, top - 80, w / 2 + 50, top - 132, w / 2 - 50, top - 132], shade: 'lin', light: -160, d: [.12, .5], hatch: 'lin', ang: 45, per: 5, line: 1.8 });
    return engrave({ w, h: h + 4, layers: L, ax: .5, ay: h / (h + 4), draw(x) {
      x.lineWidth = 3; x.beginPath(); x.moveTo(w / 2 - sb, h); x.lineTo(w / 2 - st, top + 6); x.moveTo(w / 2 + sb, h); x.lineTo(w / 2 + st, top + 6); x.stroke();
      x.lineWidth = 2; x.beginPath(); x.moveTo(0, h); x.lineTo(w, h); x.stroke(); x.fillStyle = P.sheet; for (let i = 0; i < 3; i++) { x.fillRect(w / 2 - 36 + i * 28, top - 122, 16, 22); x.strokeRect(w / 2 - 36 + i * 28, top - 122, 16, 22); }
      x.lineWidth = 2.2; [[46, 1], [w - 46, -1]].forEach(([px, sd]) => { x.beginPath(); x.moveTo(px, h); x.quadraticCurveTo(px + sd * 10, h - 90, px + sd * 26, h - 170); x.stroke();
        for (let k = 0; k < 7; k++) { const a = (-150 + k * 40) * DEG, ex = px + sd * 26 + Math.cos(a) * 70, ey = h - 170 + Math.sin(a) * 40 + 30; x.beginPath(); x.moveTo(px + sd * 26, h - 170); x.quadraticCurveTo((px + sd * 26 + ex) / 2, h - 205, ex, ey); x.stroke(); } });
    } });
  }
  function disc(o = {}) { // каменный диск-календарь (хорош как призрак на фоне)
    const r = o.r || 280, w = 2 * r + 8, c = w / 2, L = [];
    L.push({ pts: ell(c, c, r, r, 120), shade: 'sph', d: [.15, .6], hatch: 'ring', per: 6, cross: false, line: 2.4 });
    L.push({ pts: ell(c, c, r * .84, r * .84, 110), shade: 'flat', d: .35, hatch: 'rad', n: 132, per: 6, cross: false, line: 1.6 });
    L.push({ pts: ell(c, c, r * .64, r * .64, 100), shade: 'sph', d: [.08, .55], hatch: 'ring', per: 5, cross: false, line: 1.6 });
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + PI / 8, b = .2; L.push({ pts: [c + Math.cos(a - b) * r * .4, c + Math.sin(a - b) * r * .4, c + Math.cos(a) * r * .62, c + Math.sin(a) * r * .62, c + Math.cos(a + b) * r * .4, c + Math.sin(a + b) * r * .4], shade: 'flat', d: .55, hatch: 'lin', ang: a / DEG, per: 4, cross: false, line: 1.4 }); }
    L.push({ pts: ell(c, c, r * .36, r * .36, 80), shade: 'flat', d: .25, hatch: 'rad', n: 64, per: 5, cross: false, line: 1.6 });
    L.push({ pts: ell(c, c, r * .2, r * .2, 60), shade: 'sph', d: [.05, .7], hatch: 'ring', per: 4, line: 2 });
    return engrave({ w, h: w, layers: L, draw(x) { x.lineWidth = 1.6; x.fillStyle = P.sheet;
      for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; x.save(); x.translate(c + Math.cos(a) * r * .74, c + Math.sin(a) * r * .74); x.rotate(a + PI / 2); x.fillRect(-14, -10, 28, 20); x.strokeRect(-14, -10, 28, 20); x.beginPath(); x.arc(0, 0, 4, 0, TAU); x.stroke(); x.restore(); }
      x.beginPath(); x.arc(c, c, r * .93, 0, TAU); x.stroke(); } });
  }
  function jug(o = {}) { // кувшин носиком влево; tilt наклоняет (для струи используй turn)
    const h = o.h || 400, w = Math.round(h * 1.02), cx = w * .46, y0 = h * .08, L = [], pf = [[.21, .04], [.19, .12], [.17, .22], [.22, .36], [.31, .55], [.33, .72], [.3, .88], [.24, .97]], body = [];
    pf.forEach(([a, b]) => body.push(cx + a * h, y0 + b * h)); for (let i = pf.length - 1; i >= 0; i--) body.push(cx - pf[i][0] * h, y0 + pf[i][1] * h); const bodyS = spl(body, true, 5);
    const hd = []; for (let i = 0; i <= 12; i++) { const f = i / 12, a = (-70 + f * 150) * DEG; hd.push(cx + .3 * h + Math.cos(a) * .15 * h, y0 + .36 * h + Math.sin(a) * .2 * h); }
    for (let i = 12; i >= 0; i--) { const f = i / 12, a = (-70 + f * 150) * DEG; hd.push(cx + .3 * h + Math.cos(a) * .1 * h, y0 + .36 * h + Math.sin(a) * .14 * h); }
    L.push({ pts: hd, shade: 'lin', d: [.1, .7], hatch: 'lin', ang: 90, per: 4.5, tint: o.tint || P.blue, ta: .25, line: 2 });
    L.push({ pts: [cx - .2 * h, y0 + .03 * h, cx - .38 * h, y0 - .03 * h, cx - .34 * h, y0 + .03 * h, cx - .18 * h, y0 + .15 * h], shade: 'lin', d: [.1, .6], hatch: 'lin', ang: 0, per: 5, tint: o.tint || P.blue, ta: .25, line: 2 });
    L.push({ pts: bodyS, shade: 'cyl', d: [.05, .72], hatch: 'cyl', bend: .22, per: 6, tint: o.tint || P.blue, ta: .25, line: 2.4 });
    L.push({ pts: ell(cx, y0 + .04 * h, .21 * h, .035 * h, 40), shade: 'flat', d: .85, hatch: 'lin', ang: 0, per: 4, line: 1.8, cross: false });
    return engrave({ w, h: Math.round(h * 1.1), layers: L, ax: .5, ay: .5, draw(x) { x.lineWidth = 2; x.globalAlpha = .7; x.beginPath(); x.ellipse(cx, y0 + .56 * h, .3 * h, .04 * h, 0, 0, PI); x.stroke(); } });
  }
  function cup(o = {}) { // чашка с блюдцем; liquid цвет напитка (ay у дна блюдца)
    const w = o.w || 220, h = Math.round(w * .78), cx = w * .46, L = [], rimY = h * .2, rimR = w * .3, botY = h * .8, botR = w * .19;
    L.push({ pts: ell(cx, h * .86, w * .44, h * .1, 48), shade: 'lin', light: -100, d: [.08, .6], hatch: 'ring', cx, cy: h * .86, rk: 4.4, per: 5, cross: false, line: 1.8 });
    L.push({ pts: spl([cx - rimR, rimY, cx + rimR, rimY, cx + rimR * .95, h * .5, cx + botR * 1.2, botY - 6, cx, botY + 2, cx - botR * 1.2, botY - 6, cx - rimR * .95, h * .5], true, 5), shade: 'cyl', d: [.04, .7], hatch: 'cyl', bend: .28, per: 5.5, line: 2 });
    L.push({ pts: ell(cx, rimY, rimR - 4, h * .055, 40), shade: 'flat', d: .45, hatch: 'lin', ang: 0, per: 4, tint: o.liquid || P.choc, ta: .78, line: 1.4, cross: false });
    return engrave({ w, h, layers: L, ax: .46, ay: .94, draw(x) {
      x.lineWidth = 11; x.beginPath(); x.ellipse(cx + rimR * 1.08, h * .42, w * .1, h * .13, 0, -PI * .6, PI * .55); x.stroke(); x.strokeStyle = P.sheet; x.lineWidth = 6; x.stroke();
      x.strokeStyle = P.ink; x.lineWidth = 2; x.beginPath(); x.ellipse(cx, rimY, rimR, h * .06, 0, 0, TAU); x.stroke();
      x.strokeStyle = P.blue; x.lineWidth = 3; x.beginPath(); x.ellipse(cx, h * .34, rimR * .97, h * .05, 0, .15, PI - .15); x.stroke(); } });
  }

  // ---------- кадр, сцены, склейки, камера ----------
  function begin(t, k) { // первым в draw: запоминает t/k, запекает все гравюры (только в первом кадре), сбрасывает контекст
    K = k; G = k.g; T = t; if (!PAPER) PAPER = bakePaper(); bakeAll();
    const g = G; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.setLineDash([]);
    g.shadowColor = 'rgba(0,0,0,0)'; g.shadowBlur = 0; g.lineCap = 'round'; g.lineJoin = 'round'; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    CAM.x = 0; CAM.y = 0; return g;
  }
  function setCam(s, lt) { // оседание после склейки (пружина), дрейф, толчки от ударов hits
    const st = s.settle == null ? 34 : s.settle; CAM.y = st * (1 - spring(lt, 1.6, .5)) + (s.drift == null ? -7 : s.drift) * lt; CAM.x = (s.pan || 0) * lt;
    if (s.hits) for (const hT of s.hits) { const d = lt - hT; if (d >= 0 && d < .4) { const a = (s.shake || 9) * Math.exp(-d * 12); CAM.x += a * Math.sin(d * 92); CAM.y += a * .7 * Math.cos(d * 77); } }
  }
  function layer(g, k, fn) { g.save(); g.translate(Math.round(CAM.x * k), Math.round(CAM.y * k)); fn(g); g.restore(); } // параллакс: k = глубина (0 фон … 1 герой)
  function zoom(g, z, cx, cy, fn) { if (Math.abs(z - 1) < .002) { fn(g); return; } g.save(); g.translate(cx, cy); g.scale(z, z); g.translate(-cx, -cy); fn(g); g.restore(); }
  function runS(g, s, lt) { setCam(s, lt); g.save(); s.draw(g, lt, s); g.restore(); }
  // CUTS: начала сцен (с); SC[i] = {draw(g, lt), dark, tr: 'hatch'|'slide'|'cut', td, settle, drift, pan, hits:[lt удара]}
  function scenes(g, t, CUTS, SC) {
    let i = 0; while (i < CUTS.length - 1 && t >= CUTS[i + 1]) i++;
    const lt = t - CUTS[i], s = SC[i], tr = s.tr || 'hatch', D = s.td || .36; CUR = { i, lt, dark: !!s.dark, s, t0: CUTS[i], t1: CUTS[i + 1] == null ? K.duration : CUTS[i + 1] };
    if (i > 0 && tr !== 'cut' && lt < D) {
      const q = eo(lt / D), ps = SC[i - 1], plt = t - CUTS[i - 1];
      if (tr === 'slide') { const yy = Math.round(H * (1 - q));
        g.save(); g.translate(0, Math.round(-160 * q)); runS(g, ps, plt); g.restore();
        g.save(); g.beginPath(); g.rect(0, yy, W, H); g.clip(); g.translate(0, yy); runS(g, s, lt); g.restore();
        g.save(); g.fillStyle = 'rgba(43,35,29,.35)'; g.fillRect(0, yy - 3, W, 3); g.restore();
      } else {
        const e = Math.round(lerp(0, W + 70, q)); // прямоугольный клип: быстрее косого
        if (e < W) { g.save(); g.beginPath(); g.rect(e, 0, W - e, H); g.clip(); runS(g, ps, plt); g.restore(); }
        if (e > 0) { g.save(); g.beginPath(); g.rect(0, 0, e, H); g.clip(); runS(g, s, lt); g.restore(); }
        g.save(); g.strokeStyle = s.dark ? P.bone : P.ink; g.lineCap = 'butt'; g.beginPath();
        for (let j = 0; j < 15; j++) { const off = 2 + j * 5 + j * j * .9; g.globalAlpha = .8 * Math.pow(1 - j / 15, 1.4); g.lineWidth = j ? 2.2 - j * .1 : 4; g.beginPath(); g.moveTo(e + off, 0); g.lineTo(e + off, H); g.stroke(); }
        g.restore();
      }
      setCam(s, lt);
    } else runS(g, s, lt);
    return CUR;
  }
  const cur = () => CUR;

  return {
    W, H, SAFE, ZONE, P, F, PI, TAU, DEG,
    cl, pr, lerp, eo, ei, eio, eb, spring, ap, out, kf, fall, hash, rnd, roman, num, clock,
    font, meas, rgba, ell, rect, rr, spl, rotP, movP, sclP, blob, leaf, pth, poly, pat, hatchFill, shadow,
    paper, dark, engrave, turn, flip, crop, put,
    text, caps, capsW, words, title, caption, typed, dtype, display,
    strike, dagger, plus, crown, rule, rays, burst, label, plaque, stamp, card, list,
    odo, year, chrome, steam, pour, route, rhumb,
    column, globe, wreath, ship, waves, drawWaves, mountains, balance, drawBalance, coin, compass, drape, pyramid, disc, jug, cup,
    begin, scenes, layer, zoom, cur
  };
})();
