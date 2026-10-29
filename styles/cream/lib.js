// «Крем-минимал» (CREAM): библиотека стиля для роликов draw(t, k) на Canvas 2D 1080×1920.
// Web Worker: только OffscreenCanvas, без document, сети и таймеров. Кадр считается только из t.
// Единицы: px и секунды; углы в радианах, если не сказано иное. Цвета в API передавай HEX ('#RRGGBB').
const CREAM = (() => {
  const W = 1080, H = 1920, TAU = Math.PI * 2, D2R = Math.PI / 180;
  const SAFE = { x0: 60, x1: 1020, y0: 110, y1: 1690 };
  const P = {
    cream: '#EEE9E3', paper: '#F8F5F0', ink: '#151413', night: '#141414', orange: '#FF5D18', deep: '#C2410C',
    white: '#FFFFFF', grey: '#77736D', greyD: '#8E8A85', mute: '#B9B3AA', line: '#D9D3CA', soft: '#E3DDD4',
    mid: '#3A3835', pillD: '#2C2A28', lineD: '#2A2826'
  };
  const F = {
    sans: '"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif',
    text: '"Inter","Inter Display",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif',
    mono: '"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace',
    serif: '"DejaVu Serif",Georgia,"Noto Serif","Times New Roman",serif'
  };
  let K = null, G = null, T = 0, SPR = null, IDX = null;

  // ---------- время, изинги, пружины ----------
  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const pr = (t, a, b) => b === a ? (t >= a ? 1 : 0) : cl((t - a) / (b - a));
  const lerp = (a, b, p) => a + (b - a) * p;
  const eo = p => 1 - Math.pow(1 - cl(p), 3);
  const eo5 = p => 1 - Math.pow(1 - cl(p), 5);
  const ei = p => Math.pow(cl(p), 3);
  const eio = p => { p = cl(p); return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  const eback = (p, s = 1.7) => { p = cl(p); return 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2); };
  function spring(t, k = 170, d = 26) { // затухающая пружина 0→1, t: секунды от старта
    if (t <= 0) return 0;
    const w0 = Math.sqrt(k), z = d / (2 * w0);
    if (z < 1) { const wd = w0 * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t)); }
    return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  }
  const sv = (t, k, d) => (spring(t + .004, k, d) - spring(t - .004, k, d)) / .008; // скорость пружины (1/с)
  const SP = { snappy: [320, 28], ui: [260, 19], soft: [170, 26], heavy: [90, 19], bouncy: [220, 12], jelly: [300, 9] };
  function track(t, keys, k = 170, d = 26) { // значение, которое пружиной переезжает к новым целям: [[t, v], ...]
    let v = keys[0][1];
    for (let i = 1; i < keys.length; i++) v += (keys[i][1] - keys[i - 1][1]) * spring(t - keys[i][0], k, d);
    return v;
  }
  function kf(keys, t, e = eio) { // ключи [[t, v], ...] с изингом между ними
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) { const [a, va] = keys[i], [b, vb] = keys[i + 1]; if (t < b) return lerp(va, vb, e(pr(t, a, b))); }
    return keys[keys.length - 1][1];
  }
  const bump = (lt, t0, dur = .45) => { const x = (lt - t0) / dur; return x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * Math.pow(x, .55)) * (1 - x * .3); };
  const hash = n => { const s = Math.sin(n * 91.3458 + 47.853) * 43758.5453; return s - Math.floor(s); };
  const rnd = seed => { let s = (seed >>> 0) || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };

  // ---------- цвет ----------
  const CC = {};
  const rgb = h => { if (CC[h]) return CC[h]; const n = parseInt(String(h).slice(1, 7), 16); return CC[h] = [n >> 16, (n >> 8) & 255, n & 255]; };
  const rgba = (h, a) => { const c = rgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + cl(a) + ')'; };
  const mix = (a, b, p) => { const x = rgb(a), y = rgb(b); p = cl(p); return 'rgb(' + Math.round(lerp(x[0], y[0], p)) + ',' + Math.round(lerp(x[1], y[1], p)) + ',' + Math.round(lerp(x[2], y[2], p)) + ')'; };
  const isDark = h => { const c = rgb(h); return c[0] * .299 + c[1] * .587 + c[2] * .114 < 110; };

  // ---------- слова озвучки ----------
  const norm = s => String(s).toLowerCase().replace(/[«»"'.,!?:;()…]/g, '').replace(/ё/g, 'е');
  function index() {
    if (IDX) return IDX; IDX = [];
    K.subs.forEach((s, i) => {
      const ws = s.text.split(/\s+/).filter(Boolean), tot = ws.reduce((a, w) => a + w.length + 1, 0); let acc = 0;
      ws.forEach(w => { IDX.push({ i, w: norm(w), t: s.t0 + (s.t1 - s.t0) * (.04 + .8 * acc / tot) }); acc += w.length + 1; });
    });
    return IDX;
  }
  function at(word, i) { // ожидаемый момент слова в озвучке (с); i: номер фразы, если слово повторяется
    const w = norm(word); if (!w) return null;
    const L = index().filter(e => e.w === w || (w.length > 3 && e.w.indexOf(w) === 0)); if (!L.length) return null;
    const m = i == null ? L : L.filter(e => e.i === i); return (m[0] || L[0]).t;
  }

  // ---------- кадр, склейки, камера ----------
  function sprites() {
    const c = new OffscreenCanvas(160, 160), x = c.getContext('2d'), gr = x.createRadialGradient(80, 80, 0, 80, 80, 80);
    gr.addColorStop(0, 'rgba(20,18,16,.55)'); gr.addColorStop(.45, 'rgba(20,18,16,.26)'); gr.addColorStop(1, 'rgba(20,18,16,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 160, 160); SPR = { sh: c };
  }
  function begin(t, k, bgc) { // первым делом в draw: сброс контекста и заливка фона
    K = k; G = k.g; T = t; if (!SPR) sprites();
    const g = G; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.shadowColor = 'rgba(0,0,0,0)'; g.shadowBlur = 0; g.setLineDash([]); g.lineCap = 'round'; g.lineJoin = 'round';
    g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.fillStyle = bgc || P.cream; g.fillRect(0, 0, W, H); return g;
  }
  function cuts(t, list) { // текущая сцена: {i, t0, t1, lt, d, p}
    list = list || K.subs.map(s => s.t0); let i = 0;
    for (let j = 0; j < list.length; j++) if (t >= list[j]) i = j;
    const t0 = list[i], t1 = i + 1 < list.length ? list[i + 1] : K.duration;
    return { i, t0, t1, lt: t - t0, d: t1 - t0, p: pr(t, t0, t1) };
  }
  function cam(g, lt, fn, o = {}) { // после склейки кадр оседает из лёгкого наезда; drift 0…1: медленный наезд по сцене
    const s = 1 + (o.amp ?? .05) * (1 - spring(lt, 120, 22)) + (o.drift ?? 0) * (o.zoom ?? .03) + (o.push || 0);
    const cx = o.cx ?? W / 2, cy = o.cy ?? H * .52;
    g.save(); g.translate(cx + (o.dx || 0), cy + (o.dy || 0)); g.scale(s, s); if (o.rot) g.rotate(o.rot * D2R); g.translate(-cx, -cy);
    fn(g); g.restore();
  }
  function shake(g, lt, t0, dur = .3, amp = 6) { const q = lt > t0 ? 1 - pr(lt, t0, t0 + dur) : 0; if (q > 0) g.translate(Math.sin((lt - t0) * 70) * amp * q * q, Math.cos((lt - t0) * 53) * amp * .5 * q * q); }

  // ---------- фоны и переходы ----------
  function bg(g, col) { g.fillStyle = col || P.cream; g.fillRect(-300, -300, W + 600, H + 600); }
  function field(g, lt, o = {}) { // едва заметная сетка точек: дышит волной от центра и медленно плывёт (фоновый слой)
    const gap = o.gap || 64, r0 = o.r || 2.6, cx = o.cx ?? W / 2, cy = o.cy ?? H / 2;
    g.fillStyle = o.col || (o.dark ? 'rgba(238,233,227,.09)' : 'rgba(21,20,19,.085)');
    const oy = ((lt * (o.speed ?? 10)) % gap + gap) % gap, ox = ((lt * (o.vx ?? 0)) % gap + gap) % gap;
    g.beginPath();
    for (let y = -gap + oy; y < H + gap; y += gap) for (let x = -gap + ox; x < W + gap; x += gap) {
      const r = r0 * (1 + .45 * Math.sin(lt * 1.7 - Math.hypot(x - cx, y - cy) * .006));
      g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU);
    }
    g.fill();
  }
  const reach = (cx, cy) => Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy)) + 40;
  function wipe(g, cx, cy, p, col) { // круг цвета col растёт из (cx,cy) и закрывает кадр при p=1
    if (p <= 0) return; g.fillStyle = col || P.orange;
    if (p >= 1) { g.fillRect(-300, -300, W + 600, H + 600); return; }
    g.beginPath(); g.arc(cx, cy, p * reach(cx, cy), 0, TAU); g.fill();
  }
  function hole(g, cx, cy, r, col) { // всё кроме круга радиуса r залито col (раскрытие «диафрагмой»)
    g.fillStyle = col; g.beginPath(); g.rect(-300, -300, W + 600, H + 600); if (r > 0) g.arc(cx, cy, r, 0, TAU, true); g.fill('evenodd');
  }
  function halftone(g, p, o = {}) { // растровый переход: точки col растут от центра и сливаются в сплошной цвет; p 0→1 закрывает кадр
    if (p <= 0) return; const cx = o.cx ?? W / 2, cy = o.cy ?? H / 2, gap = o.gap || 40, band = o.band || 440;
    g.fillStyle = o.col || P.night; if (p >= 1) { g.fillRect(-300, -300, W + 600, H + 600); return; }
    const D = reach(cx, cy), Fr = p * (D + band), rin = Fr - band, rm = gap * .74;
    g.beginPath(); if (rin > 0) { g.moveTo(cx + rin + gap * .5, cy); g.arc(cx, cy, rin + gap * .5, 0, TAU); }
    const x0 = cx - Math.ceil(cx / gap) * gap, y0 = cy - Math.ceil(cy / gap) * gap;
    for (let y = y0; y <= H + gap; y += gap) {
      const dy = y - cy; if (Math.abs(dy) > Fr) continue;
      for (let x = x0; x <= W + gap; x += gap) {
        const d = Math.hypot(x - cx, dy); if (d >= Fr || d < rin) continue;
        const r = rm * Math.pow((Fr - d) / band, .85); if (r < .7) continue; g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU);
      }
    }
    g.fill();
  }
  function smear(g, dx, dy, n, fn) { // размытие движения: n полупрозрачных копий по хвосту (dx,dy), затем сам объект
    if (n > 0 && Math.abs(dx) + Math.abs(dy) > 2) for (let i = n; i >= 1; i--) {
      g.save(); g.globalAlpha *= .34 * Math.pow(1 - i / (n + 1), 1.3); g.translate(-dx * i / n, -dy * i / n); fn(g); g.restore();
    }
    fn(g);
  }

  // ---------- текст ----------
  const font = (size, w = 800, fam = 'sans') => w + ' ' + Math.max(1, Math.round(size * 10) / 10) + 'px ' + (F[fam] || fam);
  function measure(g, s, size, w = 800, fam = 'sans') { g.font = font(size, w, fam); return g.measureText(String(s)).width; }
  function fit(g, s, size, maxW, w = 800, fam = 'sans') { const m = measure(g, s, size, w, fam); return m > maxW ? size * maxW / m : size; }
  function text(g, s, x, y, size, o = {}) { // строка; o: w (вес), col, al, max (ширина, иначе уменьшит), a, fam
    s = String(s); const w = o.w || 800, fam = o.fam || 'sans'; if (o.max) size = fit(g, s, size, o.max, w, fam);
    const a = o.a ?? 1; g.font = font(size, w, fam); const tw = g.measureText(s).width; if (a <= 0) return { w: tw, size };
    g.save(); g.globalAlpha *= a; g.textAlign = o.al || 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = o.col || P.ink; g.fillText(s, x, y); g.restore();
    return { w: tw, size };
  }
  const label = (g, s, x, y, o = {}) => text(g, s, x, y, o.size || 46, Object.assign({ w: 600, fam: 'text', col: o.dark ? P.greyD : P.grey }, o));
  const PC = new Map();
  function parse(spec, o) { // 'одно *касание / 25@18.75 мин@+.3': *: ключевое слово, /: перенос, @t или @+dt: время
    const key = spec + '|' + o.i + '|' + (o.t0 ?? '') + '|' + (o.step ?? '');
    if (PC.has(key)) return PC.get(key);
    const out = []; let prev = o.t0 ?? null;
    String(spec).trim().split(/\s+/).forEach(tok => {
      if (tok === '/') { out.push({ br: true }); return; }
      let k = false; if (tok[0] === '*') { k = true; tok = tok.slice(1); }
      let tm = null; const m = tok.match(/^(.*?)@(\+?)(-?[\d.]+)$/);
      if (m) { tok = m[1]; tm = m[2] ? (prev ?? 0) + +m[3] : +m[3]; }
      if (tm == null && o.t0 == null) tm = at(tok, o.i);
      if (tm == null) tm = prev == null ? (o.t0 ?? 0) : prev + (o.step ?? .22);
      prev = tm; out.push({ w: tok, key: k, t: tm });
    });
    PC.set(key, out); return out;
  }
  // Блок слов, появляющихся по озвучке. fx: 'rise' (из-под маски, по умолчанию) | 'whip' (въезд слева с размытием) | 'pop'.
  // o: size, w, al, maxW, col, hl (цвет ключевого), hlBox (плашка-пилюля под ключевым), dark, i (номер фразы), t0/step,
  //    shift (сдвиг всех времён), dur, out (время ухода), lh, dot (оранжевая точка-период), dotCol.
  function words(g, t, spec, x, y, o = {}) {
    const it = parse(spec, o), wt = o.w || 800, fam = o.fam || 'sans', al = o.al || 'left', sh = o.shift || 0;
    const maxW = o.maxW || (al === 'center' ? 2 * Math.min(x - SAFE.x0, SAFE.x1 - x) : al === 'right' ? x - SAFE.x0 : SAFE.x1 - x);
    let size = o.size || 120; g.font = font(size, wt, fam);
    const ws = it.filter(e => !e.br), pad = o.hlBox ? size * .5 : 0;
    const longest = Math.max(...ws.map(e => g.measureText(e.w).width + (e.key ? pad : 0)));
    if (longest > maxW) { size *= maxW / longest; g.font = font(size, wt, fam); }
    const sp = size * (o.space ?? .27), lines = [[]], lw = [0], bx = o.hlBox ? size * .25 : 0;
    it.forEach(e => {
      if (e.br) { lines.push([]); lw.push(0); return; }
      e.wd = g.measureText(e.w).width + (e.key ? bx * 2 : 0); const L = lines.length - 1, nw = lw[L] + (lines[L].length ? sp : 0) + e.wd;
      if (lines[L].length && nw > maxW) { lines.push([e]); lw.push(e.wd); } else { lines[L].push(e); lw[L] = nw; }
    });
    const lh = size * (o.lh ?? 1.08), dur = o.dur ?? .3, qo = o.out != null ? pr(t, o.out, o.out + (o.outDur ?? .2)) : 0;
    const base = o.col || (o.dark ? P.cream : P.ink), fx = o.fx || 'rise';
    let ex = x, ey = y;
    lines.forEach((ln, li) => {
      const by = y + li * lh, w0 = lw[li], sx = al === 'center' ? x - w0 / 2 : al === 'right' ? x - w0 : x; let cx = sx;
      ln.forEach(e => {
        const p = pr(t, e.t + sh, e.t + sh + dur);
        if (p > 0 && qo < 1) {
          g.save(); g.font = font(size, wt, fam); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
          const tx = cx + (e.key ? bx : 0), col = e.key ? (o.hl || P.orange) : base;
          const draw = gg => {
            if (e.key && o.hlBox) { gg.fillStyle = o.hlBox; rr(gg, cx, by - size * .82, e.wd, size * 1.1, size * .55); gg.fill(); }
            gg.fillStyle = col; gg.fillText(e.w, tx, by);
          };
          if (fx === 'whip') {
            const dist = o.dist ?? 560, xo = -(1 - eo5(p)) * dist, v = dist * 5 * Math.pow(1 - p, 4) / dur / 30;
            g.globalAlpha *= cl(p * 3) * (1 - qo); g.translate(xo, -eo(qo) * size * .5);
            smear(g, v * 1.6, 0, v > 3 ? 5 : 0, draw);
          } else if (fx === 'pop') {
            const s = lerp(.55, 1, eback(p)) * (1 - qo * .4); g.globalAlpha *= cl(p * 3) * (1 - qo);
            g.translate(cx + e.wd / 2, by - size * .35); g.scale(s, s); g.translate(-cx - e.wd / 2, -by + size * .35); draw(g);
          } else {
            g.beginPath(); g.rect(cx - size * .3, by - size * 1.02, e.wd + size * .6, size * 1.36); g.clip();
            g.globalAlpha *= cl(p * 2.2) * (1 - qo); g.translate(0, (1 - eo(p)) * size * .95 - eo(qo) * size * 1.05); draw(g);
          }
          g.restore();
        }
        cx += e.wd + sp;
      });
      if (li === lines.length - 1) { ex = sx + w0; ey = by; }
    });
    const last = ws[ws.length - 1], r = size * (o.dotR ?? .1), dx = ex + size * .045 + r, dy = ey - r;
    if (o.dot && last) {
      const q = t - (last.t + sh + dur * .7);
      if (q > 0 && qo < 1) dot(g, dx, dy, r * spring(q, ...SP.jelly) * (1 - qo), { col: o.dotCol || P.orange });
    }
    return { x, y, size, lh, w: Math.max(...lw), n: lines.length, top: y - size * .78, bottom: y + (lines.length - 1) * lh + size * .25, end: { x: dx, y: dy, r } };
  }
  function digits(g, s, x, y, size, o = {}) { // цифры фиксированной ширины: часы и счётчики не дёргаются
    s = String(s); g.font = font(size, o.w || 800, o.fam || 'sans');
    const cw = g.measureText('0').width * (o.cw ?? 1), ws = [...s].map(c => /\d/.test(c) ? cw : g.measureText(c).width);
    const tot = ws.reduce((a, b) => a + b, 0); let cx = o.al === 'center' ? x - tot / 2 : o.al === 'right' ? x - tot : x;
    g.save(); g.globalAlpha *= o.a ?? 1; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = o.col || P.ink;
    [...s].forEach((c, i) => { g.fillText(c, cx + ws[i] / 2, y); cx += ws[i]; }); g.restore();
    return { w: tot, cw };
  }
  function odo(g, v, n, x, y, size, o = {}) { // механический счётчик: дробное v катится по n разрядам
    g.font = font(size, o.w || 800, o.fam || 'sans'); const cw = g.measureText('0').width * (o.cw ?? 1.02), tot = cw * n, lh = size * 1.04;
    const x0 = o.al === 'center' ? x - tot / 2 : o.al === 'right' ? x - tot : x; v = Math.max(0, v);
    g.save(); g.globalAlpha *= o.a ?? 1; g.beginPath(); g.rect(x0 - size * .2, y - size * .86, tot + size * .4, size * 1.06); g.clip();
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = o.col || P.ink;
    for (let i = 0; i < n; i++) {
      const pw = Math.pow(10, n - 1 - i), d = Math.floor(v / pw) % 10, rem = v % pw;
      if (o.lead === false && i < n - 1 && v < pw && d === 0) continue;
      const f = pw === 1 ? v - Math.floor(v) : (rem > pw - 1 ? rem - (pw - 1) : 0), cx = x0 + cw * (i + .5), off = eio(f) * lh;
      g.fillText(String(d), cx, y - off); if (off > .5) g.fillText(String((d + 1) % 10), cx, y - off + lh);
    }
    g.restore(); return { w: tot, x0 };
  }
  const clock = min => { const m = Math.floor(min), h = Math.floor(m / 60) % 24, mm = m % 60; return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm; };

  // ---------- формы интерфейса ----------
  function rr(g, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function shadow(g, x, y, w, h, a = .22) { if (a <= 0) return; g.save(); g.globalAlpha *= a; g.drawImage(SPR.sh, x - w / 2, y - h / 2, w, h); g.restore(); }
  function circle(g, x, y, r, col) { if (r <= 0) return; g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  function pill(g, cx, cy, w, h, o = {}) { // пилюля; o.col, o.ring (обводка с отступом, как у кнопки в фокусе), o.sh (тень), o.line (контур)
    w = Math.max(w, h); if (o.sh) shadow(g, cx, cy + h * .22, w * 1.12, h * 1.7, o.sh);
    if (o.col !== null) { g.fillStyle = o.col || P.orange; rr(g, cx - w / 2, cy - h / 2, w, h, h / 2); g.fill(); }
    if (o.line) { g.strokeStyle = o.line; g.lineWidth = o.lw || 4; rr(g, cx - w / 2, cy - h / 2, w, h, h / 2); g.stroke(); }
    if (o.ring) { const off = o.ringOff ?? h * .12; g.save(); g.globalAlpha *= o.ring; g.strokeStyle = o.ringCol || o.col || P.orange; g.lineWidth = o.ringW || 3; rr(g, cx - w / 2 - off, cy - h / 2 - off, w + off * 2, h + off * 2, h / 2 + off); g.stroke(); g.restore(); }
  }
  function chip(g, s, cx, cy, o = {}) { // плашка-метка с текстом
    const size = o.size || 40; g.font = font(size, o.w || 700, o.fam || 'text'); const tw = g.measureText(s).width, h = size * 1.7, dr = o.dot ? size * .22 : 0;
    const w = tw + size * 1.3 + (dr ? dr * 2 + size * .35 : 0), x = cx - w / 2;
    pill(g, cx, cy, w, h, { col: o.bg === undefined ? P.ink : o.bg, line: o.line, lw: o.lw });
    if (dr) circle(g, x + size * .65 + dr, cy, dr, o.dotCol || P.orange);
    g.fillStyle = o.col || P.cream; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(s, x + size * .65 + (dr ? dr * 2 + size * .35 : 0), cy + size * .36);
    return { w, h };
  }
  function dot(g, x, y, r, o = {}) { // точка-герой: растягивается по скорости (vx, vy в px/с), сплющивается после приземления (land, с)
    if (r <= 0) return; const sp = Math.hypot(o.vx || 0, o.vy || 0), st = Math.min(.6, sp * (o.k ?? .00042));
    g.save(); g.translate(x, y);
    if (st > .015) { g.rotate(Math.atan2(o.vy || 0, o.vx || 0)); g.scale(1 + st, 1 / Math.sqrt(1 + st * 2)); }
    else if (o.land != null && o.land >= 0 && o.land < .8) { const s = .26 * Math.exp(-o.land * 8) * Math.cos(o.land * 24); g.scale(1 + s, 1 - s); }
    g.fillStyle = o.col || P.orange; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.restore();
  }
  function trail(g, fn, t, r, o = {}) { // шлейф-призраки: fn(t) → {x, y}; n копий с шагом step секунд
    const n = o.n || 5, step = o.step || .022;
    for (let i = n; i >= 1; i--) { const p = fn(t - i * step); g.save(); g.globalAlpha *= (o.a ?? .18) * (1 - i / (n + 1)); circle(g, p.x, p.y, r * (1 - .3 * i / n), o.col || P.orange); g.restore(); }
  }
  function hop(t, a, b, t0, dur = .34, h = 140) { // прыжок по дуге из a=[x,y] в b=[x,y]: {x, y, vx, vy, land, p}
    const f = tt => { const u = eio(pr(tt, t0, t0 + dur)); return [lerp(a[0], b[0], u), lerp(a[1], b[1], u) - h * 4 * u * (1 - u)]; };
    const p = f(t), e = 1 / 120, p1 = f(t + e), p0 = f(t - e);
    return { x: p[0], y: p[1], vx: (p1[0] - p0[0]) / (2 * e), vy: (p1[1] - p0[1]) / (2 * e), land: t - (t0 + dur), p: pr(t, t0, t0 + dur) };
  }
  function hops(t, keys, o = {}) { // цепочка прыжков: keys [[tStart, x, y], ...], первая точка: исходная
    let i = 0; for (let j = 1; j < keys.length; j++) if (t >= keys[j][0]) i = j;
    if (i === 0) return { x: keys[0][1], y: keys[0][2], vx: 0, vy: 0, land: 9, p: 1, i: 0 };
    const a = keys[i - 1], b = keys[i], r = hop(t, [a[1], a[2]], [b[1], b[2]], b[0], o.dur ?? .34, o.h ?? 140); r.i = i; return r;
  }
  function knob(g, x, y, r, o = {}) { // круглая ручка с мягкой тенью; sx, sy: сжатие/растяжение
    if (o.sh !== false) shadow(g, x, y + r * .22, r * 2.7 * (o.sx || 1), r * 2.5, o.sh ?? .2);
    g.save(); g.translate(x, y); g.scale(o.sx || 1, o.sy || 1); g.fillStyle = o.col || P.orange; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.restore();
  }
  function switchAt(lt, tOn, tOff) { // состояние тумблера по времени: {on 0…1 (с перелётом), v: скорость}
    let on = spring(lt - tOn, ...SP.ui), v = sv(lt - tOn, ...SP.ui);
    if (tOff != null && lt > tOff) { on -= spring(lt - tOff, ...SP.ui); v -= sv(lt - tOff, ...SP.ui); }
    return { on, v };
  }
  // Тумблер «Фокус»: ручка: оранжевая точка-герой. on 0…1, v: скорость (из switchAt) для растяжения ручки.
  // o: off/onCol (цвет дорожки), knob (цвет ручки), dark, ring (0…1 обводка), sh, a. Возвращает {kx, ky, r, h}.
  function toggle(g, cx, cy, w, on, o = {}) {
    const h = o.h || w * .56, pad = h * .1, r = h / 2 - pad, x0 = cx - w / 2 + pad + r, x1 = cx + w / 2 - pad - r, c = cl(on);
    g.save(); g.globalAlpha *= o.a ?? 1;
    if (o.sh) shadow(g, cx, cy + h * .2, w * 1.1, h * 1.6, o.sh);
    g.fillStyle = mix(o.off || (o.dark ? P.mid : P.line), o.onCol || (o.dark ? P.cream : P.ink), c); rr(g, cx - w / 2, cy - h / 2, w, h, h / 2); g.fill();
    if (o.ring) pill(g, cx, cy, w, h, { col: null, ring: o.ring, ringCol: o.ringCol || P.orange, ringOff: h * .13, ringW: Math.max(2, w * .008) });
    const kx = lerp(x0, x1, on), st = Math.min(.45, Math.abs(o.v || 0) * (x1 - x0) * .00016);
    knob(g, kx, cy, r * (o.kr ?? 1), { sx: 1 + st, sy: 1 - st * .3, col: o.knob || P.orange, sh: o.dark ? 0 : .16 });
    g.restore(); return { kx, ky: cy, r: r * (o.kr ?? 1), h };
  }
  // Уведомление-пилюля: аватар + строки-скелеты (или o.text). sleep 0…1: глаз закрывается, пилюля гаснет.
  function notif(g, cx, cy, w, o = {}) {
    const h = w * (o.hr ?? .27), x = cx - w / 2, sl = cl(o.sleep || 0), fg = o.fg || P.cream;
    const col = sl > 0 ? mix(o.col || P.ink, o.sleepCol || P.mute, sl) : (o.col || P.ink);
    g.save(); g.globalAlpha *= o.a ?? 1;
    if (o.sh) shadow(g, cx, cy + h * .3, w * 1.08, h * 1.8, o.sh);
    g.fillStyle = col; rr(g, x, cy - h / 2, w, h, h / 2); g.fill();
    const ar = h * .27, ax = x + h * .5;
    if (o.avatar !== false) {
      if (sl < 1) { g.save(); g.translate(ax, cy); g.scale(1, 1 - sl * .92); circle(g, 0, 0, ar, o.avCol || fg); g.restore(); }
      if (sl > .3) { g.save(); g.globalAlpha *= pr(sl, .3, .8); g.strokeStyle = fg; g.lineWidth = h * .075; g.beginPath(); g.arc(ax, cy - ar * .45, ar * .85, .22 * Math.PI, .78 * Math.PI); g.stroke(); g.restore(); }
    }
    if (o.text) { text(g, o.text, x + h * .98, cy + h * .14, h * .4, { w: 700, fam: 'text', col: o.tcol || fg, max: w - h * 1.4 }); }
    else {
      const bx = x + h * .98, bw = w - h * 1.42;
      g.fillStyle = rgba(fg, .86 - sl * .4); rr(g, bx, cy - h * .2, bw * (o.l1 ?? .8), h * .14, h * .07); g.fill();
      g.fillStyle = rgba(fg, .42 - sl * .2); rr(g, bx, cy + h * .07, bw * (o.l2 ?? .5), h * .14, h * .07); g.fill();
    }
    g.restore(); return { h, ax, ay: cy, ar };
  }
  function pulse(g, cx, cy, w, h, lt, o = {}) { // расходящиеся контуры вокруг пилюли (звонок, пинг); период o.per
    const per = o.per || .7, n = o.n || 2;
    for (let i = 0; i < n; i++) {
      const q = ((lt / per + i / n) % 1 + 1) % 1, off = q * (o.dist || 70);
      g.save(); g.globalAlpha *= (o.a ?? .55) * (1 - q); g.strokeStyle = o.col || P.orange; g.lineWidth = o.lw || 4;
      rr(g, cx - w / 2 - off, cy - h / 2 - off, w + off * 2, h + off * 2, h / 2 + off); g.stroke(); g.restore();
    }
  }
  function ping(g, x, y, r, q, o = {}) { // одиночное кольцо-отклик (касание, приземление), q 0→1
    if (q <= 0 || q >= 1) return; g.save(); g.globalAlpha *= (o.a ?? .5) * (1 - q); g.strokeStyle = o.col || P.ink; g.lineWidth = (o.lw || 6) * (1 - q) + 1;
    g.beginPath(); g.arc(x, y, r + eo(q) * (o.dist || 110), 0, TAU); g.stroke(); g.restore();
  }
  function touch(g, x, y, lt, tTap, o = {}) { // касание пальцем: подлетает, нажимает в tTap, кольцо, уходит
    const a0 = tTap - (o.lead ?? .42), col = o.col || P.ink, r0 = o.r || 54;
    ping(g, x, y, r0, pr(lt, tTap, tTap + .55), { col, a: .45 });
    if (lt < a0) return; const pin = spring(lt - a0, ...SP.soft), lv = lt - tTap - (o.hold ?? .3), pout = lv > 0 ? eo(pr(lv, 0, .32)) : 0;
    if (pout >= 1) return;
    const dx = o.dx ?? 140, dy = o.dy ?? 240, fx = x + dx * (1 - pin) + dx * .7 * pout, fy = y + dy * (1 - pin) + dy * .7 * pout;
    const press = Math.sin(pr(lt, tTap - .06, tTap + .2) * Math.PI);
    const al = cl(pin * 1.5) * (1 - pout), rf = r0 * (1 - press * .16);
    circle(g, fx, fy, rf, rgba(col, (o.a ?? .16) * al));
    g.strokeStyle = rgba(o.line || P.white, .7 * al); g.lineWidth = 3; g.beginPath(); g.arc(fx, fy, rf, 0, TAU); g.stroke();
  }
  function cursor(g, x, y, s = 1, press = 0, o = {}) { // стрелка-курсор (остриё в x,y)
    g.save(); g.translate(x, y); g.scale(s * (1 - press * .12), s * (1 - press * .12));
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 46); g.lineTo(12, 35); g.lineTo(20, 54); g.lineTo(28, 50); g.lineTo(20, 32); g.lineTo(36, 32); g.closePath();
    g.lineWidth = 5; g.strokeStyle = o.line || P.white; g.stroke(); g.fillStyle = o.col || P.ink; g.fill(); g.restore();
  }
  function check(g, x, y, s, p, col, lw) { // галочка, прорисованная на долю p
    if (p <= 0) return; const A = [-.5, 0], B = [-.12, .38], C = [.55, -.42], L1 = Math.hypot(.38, .38), L2 = Math.hypot(.67, .8);
    let rem = cl(p) * (L1 + L2); g.strokeStyle = col || P.ink; g.lineWidth = lw || s * .17; g.lineCap = g.lineJoin = 'round';
    g.beginPath(); g.moveTo(x + A[0] * s, y + A[1] * s); const f1 = Math.min(1, rem / L1);
    g.lineTo(x + lerp(A[0], B[0], f1) * s, y + lerp(A[1], B[1], f1) * s); rem -= L1;
    if (rem > 0) { const f2 = Math.min(1, rem / L2); g.lineTo(x + lerp(B[0], C[0], f2) * s, y + lerp(B[1], C[1], f2) * s); }
    g.stroke();
  }
  function phone(g, cx, cy, h, o = {}, fn) { // телефон-силуэт: fn(g, x, y, w, h) рисует экран в его координатах
    const w = h * .49, x = cx - w / 2, y = cy - h / 2, b = h * .028;
    if (o.sh) shadow(g, cx, cy + h * .04, w * 1.25, h * 1.1, o.sh);
    g.fillStyle = o.body || P.ink; rr(g, x, y, w, h, h * .085); g.fill();
    g.save(); rr(g, x + b, y + b, w - b * 2, h - b * 2, h * .07); g.clip(); g.fillStyle = o.screen || P.paper; g.fillRect(x, y, w, h);
    if (fn) fn(g, x + b, y + b, w - b * 2, h - b * 2); g.restore();
    pill(g, cx, y + b + h * .03, w * .26, h * .028, { col: o.body || P.ink });
  }

  // ---------- диаграммы и кинетика ----------
  function ring(g, cx, cy, r, p, o = {}) { // кольцо-таймер: дорожка (draw 0…1 прорисовка), дуга прогресса p от 12 часов, голова-точка
    const lw = o.lw || 22, a0 = -Math.PI / 2, dr = o.draw ?? 1; g.lineCap = 'round'; g.lineWidth = lw;
    if (dr > 0) { g.strokeStyle = o.track || (o.dark ? P.mid : P.line); g.beginPath(); g.arc(cx, cy, r, a0, a0 + TAU * cl(dr)); g.stroke(); }
    if (o.ticks) { g.strokeStyle = o.tickCol || (o.dark ? P.mid : P.mute); g.lineWidth = 4; g.beginPath(); for (let i = 0; i < o.ticks; i++) { const a = a0 + i / o.ticks * TAU, r1 = r + lw * .9, r2 = r1 + (i % 5 ? 12 : 28) * dr; g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); } g.stroke(); }
    const a1 = a0 + TAU * cl(p, 0, 1.2); g.lineWidth = lw;
    if (p > .002) { g.strokeStyle = o.col || P.orange; g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke(); }
    const hx = cx + Math.cos(a1) * r, hy = cy + Math.sin(a1) * r; if (o.head) dot(g, hx, hy, o.head, { col: o.headCol || o.col || P.orange });
    return { x: hx, y: hy, a: a1 };
  }
  const springCurve = u => 1 - Math.exp(-5 * u) * (Math.cos(9.5 * u) + .526 * Math.sin(9.5 * u));
  // График пружины: оси, пунктир цели, кривая с перелётом рисуется до p, маркер-точка на конце. Возвращает {x, y, ty}.
  function graph(g, x, y, w, h, p, o = {}) {
    const ink = o.ink || (o.dark ? P.cream : P.ink), ax = o.axes ?? 1, X = u => x + u * w, Y = u => y + h - springCurve(u) * h * .72, ty = y + h - h * .72;
    g.strokeStyle = ink; g.lineWidth = o.lw || 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y + h - h * eo(ax)); g.lineTo(x, y + h); g.lineTo(x + w * eo(ax), y + h); g.stroke();
    if (ax > .5) { g.save(); g.globalAlpha *= pr(ax, .5, 1); g.setLineDash([14, 12]); g.strokeStyle = o.dash || (o.dark ? P.greyD : P.grey); g.lineWidth = 3; g.beginPath(); g.moveTo(x, ty); g.lineTo(x + w, ty); g.stroke(); g.restore(); }
    if (o.label && ax > .6) label(g, o.label, o.labelAl === 'left' ? x + 24 : x + w, ty - 22, { al: o.labelAl || 'right', size: o.labelSize || 44, dark: o.dark, a: pr(ax, .6, 1) });
    const n = 60, m = Math.round(n * cl(p)); if (m < 1) return { x: X(0), y: Y(0), ty };
    g.strokeStyle = ink; g.lineWidth = o.cw || 6; g.beginPath(); g.moveTo(X(0), Y(0));
    for (let i = 1; i <= m; i++) g.lineTo(X(i / n), Y(i / n));
    const u = cl(p); g.lineTo(X(u), Y(u)); g.stroke();
    g.fillStyle = ink; g.beginPath(); for (let i = 0; i <= m; i += 4) { const xx = X(i / n), yy = Y(i / n); g.moveTo(xx + 5, yy); g.arc(xx, yy, 5, 0, TAU); } g.fill();
    return { x: X(u), y: Y(u), ty };
  }
  // Струна-мембрана: прогиб push {x, d, w} и затухающая вибрация vib {lt, amp, f, decay}. Возвращает yAt(x).
  function string(g, x0, x1, y, o = {}) {
    const L = x1 - x0, push = o.push, vib = o.vib, n = o.n || 64;
    const yAt = x => {
      const u = cl((x - x0) / L), pin = Math.sin(Math.PI * u); let d = 0;
      if (push && push.d) { const z = (x - push.x) / (push.w || 170); d += push.d * Math.exp(-z * z) * Math.sqrt(pin); }
      if (vib && vib.lt > 0) { const e = Math.exp(-vib.lt * (vib.decay ?? 3)), f = vib.f ?? 3.2; d += vib.amp * e * (pin * Math.cos(TAU * f * vib.lt) + .35 * Math.sin(3 * Math.PI * u) * Math.sin(TAU * f * 2.7 * vib.lt)); }
      return y + d;
    };
    g.strokeStyle = o.col || P.ink; g.lineWidth = o.lw || 5; g.lineCap = 'round'; g.beginPath();
    for (let i = 0; i <= n; i++) { const x = x0 + L * i / n; i ? g.lineTo(x, yAt(x)) : g.moveTo(x, yAt(x)); } g.stroke();
    if (o.ends) { circle(g, x0, y, o.ends, o.col || P.ink); circle(g, x1, y, o.ends, o.col || P.ink); }
    return yAt;
  }
  function wave(g, x0, x1, y, lt, o = {}) { // бегущая волна-поток; amp, len, speed; o.env(x): огибающая. Возвращает yAt(x)
    const A = o.amp ?? 40, k = TAU / (o.len || 420), sp = o.speed ?? 3, n = o.n || 80;
    const yAt = x => y + A * Math.sin((x - x0) * k - lt * sp) * (o.env ? o.env(x) : 1);
    g.strokeStyle = o.col || P.ink; g.lineWidth = o.lw || 6; g.lineCap = 'round'; g.beginPath();
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n; i ? g.lineTo(x, yAt(x)) : g.moveTo(x, yAt(x)); } g.stroke();
    return yAt;
  }
  // Кольцо текста в 3D вокруг центра: передние буквы светлые, задние зеркальные и тусклые; o.mid(g) рисуется между слоями.
  // o: text, ang (поворот), tilt (наклон, 0.2…0.45), size (иначе по длине окружности), maxSize, front, back, p (сборка 0…1), w.
  function ring3d(g, cx, cy, R, o = {}) {
    let txt = o.text || 'ФОКУС · ', size = o.size; const wt = o.w || 800, tilt = o.tilt ?? .32, fov = o.fov || 2000;
    g.font = font(100, wt);
    if (!size) { let tot = g.measureText(txt).width; while (100 * TAU * R / tot > (o.maxSize || 92)) { txt += o.text || 'ФОКУС · '; tot = g.measureText(txt).width; } size = 100 * TAU * R / tot; }
    g.font = font(size, wt); const cs = [...txt], adv = cs.map(c => g.measureText(c).width), tot = adv.reduce((a, b) => a + b, 0) || 1;
    const items = []; let acc = 0, ang = o.ang || 0, ap = o.p ?? 1;
    cs.forEach((c, i) => {
      const a = ang + (acc + adv[i] / 2) / tot * TAU; acc += adv[i]; if (c === ' ') return;
      const sn = Math.sin(a), co = Math.cos(a), z = R * co, s = fov / (fov - z), q = cl(ap * 1.7 - (i / cs.length) * .7);
      if (q <= 0) return;
      const dX = R * co * s, dY = -R * sn * tilt * s, sg = co >= 0 ? 1 : -1;
      items.push({ c, z, co, x: cx + R * sn * s, y: cy + z * tilt * s, rot: Math.atan2(dY * sg, dX * sg), s: s * lerp(.4, 1, eback(q)), a: cl(q * 2) });
    });
    items.sort((A, B) => A.z - B.z);
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; let mid = false;
    items.forEach(e => {
      if (!mid && e.z >= 0) { mid = true; if (o.mid) o.mid(g); g.font = font(size, wt); g.textAlign = 'center'; g.textBaseline = 'alphabetic'; }
      const sx = Math.abs(e.co) < .07 ? .07 * Math.sign(e.co || 1) : e.co;
      g.save(); g.translate(e.x, e.y); g.rotate(e.rot); g.scale(sx * e.s, e.s);
      g.globalAlpha *= e.a * (e.z >= 0 ? 1 : lerp(.85, .55, -e.co)); g.fillStyle = e.z >= 0 ? (o.front || P.cream) : (o.back || P.greyD);
      g.fillText(e.c, 0, 0); g.restore();
    });
    if (!mid && o.mid) o.mid(g);
    return { size };
  }
  function grid(g, cx, cy, cols, rows, gap, o = {}) { // сетка точек-событий: точка n вырастает пружиной в o.at(n) секунд
    const r = o.r || gap * .2, t = o.t ?? T, pts = []; g.fillStyle = o.col || P.ink; g.beginPath();
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const n = j * cols + i, x = cx + (i - (cols - 1) / 2) * gap, y = cy + (j - (rows - 1) / 2) * gap; pts.push([x, y]);
      if (o.skip && o.skip.indexOf(n) >= 0) continue;
      const q = spring(t - (o.at ? o.at(n) : (o.t0 || 0) + n * (o.step ?? .03)), ...SP.bouncy) * (o.k ? o.k(n, x, y) : 1);
      if (q <= .02) continue; g.moveTo(x + r * q, y); g.arc(x, y, r * q, 0, TAU);
    }
    g.fill(); return pts;
  }

  // ---------- HUD: строка состояния телефона ----------
  // o: time ('09:41'), on 0…1 (мини-тумблер «фокус»), v, dark 0…1 (светлый текст), label, a.
  function status(g, o = {}) {
    const a = o.a ?? 1; if (a <= 0) return; const dk = cl(o.dark || 0), y = o.y || 168, ink = mix(P.ink, P.cream, dk);
    g.save(); g.globalAlpha *= a;
    digits(g, o.time || '09:00', 72, y, 40, { w: 700, col: ink });
    const tw = 82, tx = 1016 - tw / 2;
    toggle(g, tx, y - 14, tw, o.on || 0, { v: o.v, dark: dk > .5, off: dk > .5 ? P.mid : P.line, onCol: dk > .5 ? P.cream : P.ink });
    text(g, o.label || 'фокус', tx - tw / 2 - 16, y, 36, { w: 600, fam: 'text', al: 'right', col: (o.on || 0) > .5 ? ink : mix(P.grey, P.greyD, dk) });
    g.restore();
  }

  return {
    W, H, SAFE, P, F, TAU, SP,
    cl, pr, lerp, eo, eo5, ei, eio, eback, spring, sv, track, kf, bump, hash, rnd, rgba, mix, isDark, at,
    begin, cuts, cam, shake, bg, field, wipe, hole, halftone, smear,
    font, measure, fit, text, label, words, digits, odo, clock,
    rr, shadow, circle, pill, chip, dot, trail, hop, hops, knob, switchAt, toggle, notif, pulse, ping, touch, cursor, check, phone,
    ring, springCurve, graph, string, wave, ring3d, grid, status, t: () => T
  };
})();
