// «Крем-минимал» (CREAM): библиотека стиля для роликов draw(t, k) на Canvas 2D 1080×1920.
// Web Worker: только OffscreenCanvas, без document, сети и таймеров. Кадр считается только из t.
// Единицы: px и секунды; углы в радианах, если не сказано иное. Цвета в API передавай HEX ('#RRGGBB').
const CREAM = (() => {
  const W = 1080, H = 1920, TAU = Math.PI * 2, D2R = Math.PI / 180;
  const SAFE = { x0: 60, x1: 1020, y0: 110, y1: 1690 };
  const P = {
    cream: '#EEE9E3', paper: '#F8F5F0', ink: '#151413', night: '#141414', orange: '#FF5D18', deep: '#C2410C',
    white: '#FFFFFF', grey: '#77736D', greyD: '#8E8A85', mute: '#B9B3AA', line: '#D9D3CA', soft: '#E3DDD4',
    mid: '#3A3835', pillD: '#2C2A28', lineD: '#2A2826',
    // цвета, названные в тексте (только для предметов, о цвете которых говорят): плоские, приглушённые
    yellow: '#FFC21A', blue: '#2F5BEA', pink: '#F59AB0', green: '#4E8F5A', red: '#E23B2E', ginger: '#E8772E',
    brown: '#8A5A3B', sky: '#9CC3E6', sea: '#2E6E8E', skin: '#E9B48C', skin2: '#B9825C', hairG: '#D6D0C7', lit: '#FFD36B'
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
    if (!o.text) return { size: 0 }; // текст кольца только из параметров
    let txt = o.text, size = o.size; const wt = o.w || 800, tilt = o.tilt ?? .32, fov = o.fov || 2000;
    g.font = font(100, wt);
    if (!size) { let tot = g.measureText(txt).width; while (100 * TAU * R / tot > (o.maxSize || 92)) { txt += o.text; tot = g.measureText(txt).width; } size = 100 * TAU * R / tot; }
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
  // o: time ('09:41'), label (подпись тумблера, только по теме), on 0…1 (мини-тумблер; без on и label его нет), v, dark 0…1, a.
  function status(g, o = {}) {
    const a = o.a ?? 1; if (a <= 0) return; const dk = cl(o.dark || 0), y = o.y || 168, ink = mix(P.ink, P.cream, dk);
    g.save(); g.globalAlpha *= a;
    digits(g, o.time || '09:00', 72, y, 40, { w: 700, col: ink });
    const tw = 82, tx = 1016 - tw / 2;
    if (o.on != null || o.label) toggle(g, tx, y - 14, tw, o.on || 0, { v: o.v, dark: dk > .5, off: dk > .5 ? P.mid : P.line, onCol: dk > .5 ? P.cream : P.ink });
    if (o.label) text(g, o.label, tx - tw / 2 - 16, y, 36, { w: 600, fam: 'text', al: 'right', col: (o.on || 0) > .5 ? ink : mix(P.grey, P.greyD, dk) });
    g.restore();
  }

  // ---------- типовые объекты: люди, город, природа, транспорт ----------
  // Язык стиля: плоские заливки без контуров, скруглённые концы линий, ink/крем + один цвет предмета. Опорная точка: низ по центру (x, y = земля).
  const seg = (g, x0, y0, x1, y1, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  const limb = (x, y, len, a) => [x + Math.sin(a) * len, y + Math.cos(a) * len]; // a: от вертикали вниз, + вперёд
  // Человек. h: рост в px (ребёнок: передай меньший h). o: age 'adult'|'kid'|'old', pose 'stand'|'walk'|'run'|'wave'|'sit'|'hold'|'dance'|'ride',
  //   ph (фаза шага/танца, по умолчанию от t), dir 1|-1 (взгляд вправо/влево), skin, hair, hairStyle 'short'|'long'|'bun'|'none',
  //   top (куртка), legs (брюки), skirt (цвет юбки вместо брюк), hat 'helmet'|'cap'|'scarf', hatCol, bag (цвет рюкзака), cane, glasses,
  //   face (глаза; по умолчанию при h ≥ 240), edge (обводка цветом фона, чтобы соседние люди не сливались), item(g, hx, hy, s) в руке.
  // Возвращает {hx, hy (рука спереди), head:[x,y], top}.
  function person(g, x, y, h, o = {}) {
    const age = o.age || 'adult', kid = age === 'kid', old = age === 'old', pose = o.pose || 'stand', dir = o.dir || 1;
    const ph = o.ph ?? T * (pose === 'run' ? 11 : pose === 'dance' ? 5 : 7);
    const hr = h * (kid ? .118 : .088), lw = h * (kid ? .095 : .082), aw = h * (kid ? .072 : .064), tw = h * (kid ? .21 : .23);
    let hip = y - h * (kid ? .41 : .47), leg = y - hip - lw * .4, tl = h * (kid ? .29 : .32), lean = old ? .16 : pose === 'run' ? .2 : 0;
    let la = 0, lb = 0, kneeF = null, kneeB = null, bob = 0;
    if (pose === 'walk') { la = Math.sin(ph) * .42; lb = -la; bob = Math.abs(Math.cos(ph)) * h * .012; }
    else if (pose === 'run') { la = Math.sin(ph) * .75; lb = -la; bob = Math.abs(Math.cos(ph)) * h * .03; }
    else if (pose === 'dance') { la = .25 + Math.sin(ph) * .2; lb = -.25 + Math.sin(ph) * .2; bob = Math.abs(Math.sin(ph)) * h * .035; }
    else if (pose === 'sit' || pose === 'ride') { hip = y - h * (pose === 'ride' ? .47 : .3); }
    hip -= bob;
    const shX = x + Math.sin(lean) * tl * dir, shY = hip - Math.cos(lean) * tl, hx0 = shX + dir * hr * .25, hy0 = shY - hr * 1.18;
    const skin = o.skin || P.skin, top = o.top || P.ink, legs = o.legs || (o.skirt ? skin : P.mid);
    const hair = o.hair || (old ? P.hairG : P.ink), face = o.face ?? h >= 240;
    let aF, aB, foreF = 0, foreB = 0;
    if (pose === 'walk' || pose === 'run') { aF = -la * 1.1; aB = la * 1.1; foreF = foreB = pose === 'run' ? -1.3 : -.25; }
    else if (pose === 'wave') { aB = .12; aF = -2.7 + Math.sin(T * 9 + x) * .35; foreF = -.4; }
    else if (pose === 'hold' || pose === 'sit' && o.item) { aF = -1.05; aB = -.95; foreF = -.5; foreB = -.5; }
    else if (pose === 'ride') { aF = -1.15; aB = -1.1; }
    else if (pose === 'dance') { aF = -2.5 + Math.sin(ph) * .5; aB = 2.5 + Math.sin(ph) * .5; foreF = -.5; foreB = .5; }
    else { aF = -.1; aB = .1; }
    if (old && o.cane) aF = -.45;
    const ua = (kid ? .2 : .19) * h, fa = (kid ? .17 : .17) * h;
    const arm = (a, fo, side) => { const s0 = [shX + side * tw * .1, shY + aw * .55], e = limb(s0[0], s0[1], ua, a * dir), w2 = limb(e[0], e[1], fa, (a + fo) * dir); return [s0, e, w2]; };
    const AF = arm(aF, foreF, 1), AB = arm(aB, foreB, -1);
    const legPts = (a, side) => {
      const h0 = [x + side * tw * .12, hip];
      if (pose === 'sit') { const k = [h0[0] + dir * leg * .5, hip], f = [k[0] + dir * leg * .05, y]; return [h0, k, f]; }
      if (pose === 'ride') { const q = Math.sin(ph + (side > 0 ? 0 : Math.PI)), k = [h0[0] + dir * leg * (.38 + q * .08), hip + leg * .3 - q * leg * .12], f = [k[0] - dir * leg * .08, k[1] + leg * .48]; return [h0, k, f]; }
      const f = limb(h0[0], h0[1], leg, a * dir), k = [lerp(h0[0], f[0], .5) + dir * Math.max(0, -a) * leg * .12, lerp(h0[1], f[1], .5)]; return [h0, k, f];
    };
    const LF = legPts(la, 1), LB = legPts(lb, -1);
    const fig = (wd, mono) => {
      const C2 = c => mono || c;
      const poly = (pts, w, c) => { g.strokeStyle = C2(c); g.lineWidth = w + wd; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); };
      poly(AB, aw, mono ? top : mix(top, P.ink, .25)); if (!mono) circle(g, AB[2][0], AB[2][1], aw * .62, skin);
      if (!o.skirt) poly(LB, lw, mix(legs, P.ink, .2)); else poly(LB, lw * .8, skin);
      if (o.bag) { g.fillStyle = C2(o.bag); rr(g, shX - dir * (tw * .5 + h * .07) - wd / 2, shY + h * .02 - wd / 2, h * .13 + wd, h * .2 + wd, h * .04); g.fill(); }
      if (!o.skirt) poly(LF, lw, legs); else poly(LF, lw * .8, skin);
      g.save(); g.translate(x, hip + lw * .2); g.rotate(lean * dir); g.fillStyle = C2(top);
      rr(g, -tw / 2 - wd / 2, -tl - lw * .3 - wd / 2, tw + wd, tl + lw * .5 + wd, tw * .42); g.fill();
      if (o.skirt) { g.fillStyle = C2(o.skirt); g.beginPath(); g.moveTo(-tw * .52 - wd / 2, -lw * .5); g.lineTo(tw * .52 + wd / 2, -lw * .5); g.lineTo(tw * .85 + wd / 2, h * .2 + wd / 2); g.lineTo(-tw * .85 - wd / 2, h * .2 + wd / 2); g.closePath(); g.fill(); }
      g.restore();
      if (o.bag && !mono) { g.fillStyle = mix(o.bag, P.ink, .25); rr(g, shX - dir * tw * .25 - aw * .3, shY + aw * .2, aw * .6, tl * .55, aw * .3); g.fill(); }
      poly(AF, aw, top); if (!mono) circle(g, AF[2][0], AF[2][1], aw * .62, skin);
      if (o.hairStyle === 'long' || (!o.hairStyle && o.skirt && !old && o.hat !== 'scarf')) { g.fillStyle = C2(hair); rr(g, (dir > 0 ? hx0 - hr * 1.08 : hx0 - hr * .1) - wd / 2, hy0 - hr * .4, hr * 1.18 + wd, hr * 2 + wd / 2, hr * .5); g.fill(); }
      circle(g, hx0, hy0, hr + wd / 2, C2(skin));
    };
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    if (o.edge) fig(h * .035, o.edge);
    fig(0, null);
    // волосы и головной убор
    const hs = o.hat === 'scarf' ? 'none' : (o.hairStyle || (old && !o.skirt ? 'short' : o.skirt && !old ? 'long' : old ? 'bun' : 'short'));
    if (hs !== 'none') { g.fillStyle = hair; g.beginPath(); g.arc(hx0, hy0, hr * 1.04, Math.PI * 1.02, Math.PI * 1.98); g.quadraticCurveTo(hx0 - dir * hr * .2, hy0 - hr * .45, hx0 - hr * 1.04, hy0 - hr * .05); g.fill(); if (hs === 'bun') circle(g, hx0 - dir * hr * .55, hy0 - hr * .95, hr * .42, hair); }
    if (o.hat === 'helmet' || o.hat === 'cap') { const hc = o.hatCol || (o.hat === 'helmet' ? P.yellow : P.ink); g.fillStyle = hc; g.beginPath(); g.arc(hx0, hy0 - hr * .12, hr * 1.1, Math.PI, TAU); g.fill(); rr(g, hx0 - hr * (o.hat === 'cap' ? .4 - dir * .5 : 1.35) - (o.hat === 'cap' ? hr * .6 : 0), hy0 - hr * .22, o.hat === 'cap' ? hr * 1.6 : hr * 2.7, hr * .26, hr * .13); g.fill(); }
    if (o.hat === 'scarf') { const hc = o.hatCol || P.orange; g.fillStyle = hc; g.beginPath(); g.arc(hx0, hy0, hr * 1.14, Math.PI * .92, Math.PI * 2.08); g.lineTo(hx0 + hr * .6, hy0 + hr * 1.05); g.lineTo(hx0 - hr * .6, hy0 + hr * 1.05); g.closePath(); g.fill(); circle(g, hx0, hy0 + hr * .2, hr * .78, skin); }
    if (face) { const ex = hx0 + dir * hr * .3; circle(g, ex - hr * .2, hy0 + hr * .05, hr * .1, P.ink); circle(g, ex + hr * .22, hy0 + hr * .05, hr * .1, P.ink); g.strokeStyle = P.ink; g.lineWidth = hr * .08; g.beginPath(); g.arc(ex, hy0 + hr * .28, hr * .22, .2 * Math.PI, .8 * Math.PI); g.stroke(); }
    if (o.glasses) { g.strokeStyle = P.ink; g.lineWidth = hr * .09; const ex = hx0 + dir * hr * .3; g.beginPath(); g.arc(ex - hr * .2, hy0 + hr * .05, hr * .2, 0, TAU); g.moveTo(ex + hr * .42, hy0 + hr * .05); g.arc(ex + hr * .22, hy0 + hr * .05, hr * .2, 0, TAU); g.stroke(); }
    if (old && o.cane) seg(g, AF[2][0], AF[2][1], AF[2][0] + dir * h * .04, y, aw * .45, P.brown);
    if (o.item) o.item(g, AF[2][0], AF[2][1], h);
    g.restore();
    return { hx: AF[2][0], hy: AF[2][1], hx2: AB[2][0], hy2: AB[2][1], head: [hx0, hy0], top: hy0 - hr };
  }
  // Группа людей в ряд без слияния: list [{dx, h, ...o}] относительно x; gap: мин. зазор. Рисует от дальних (меньших) к ближним.
  function crowd(g, x, y, list, o = {}) { list.slice().sort((a, b) => (a.h || 300) - (b.h || 300)).forEach(p => person(g, x + (p.dx || 0), y + (p.dy || 0), p.h || 300, Object.assign({ edge: o.edge }, p))); }

  // Здания. x: центр, y: земля. o.col стены, o.roof, o.win (окна), o.winOn (горящие), o.lit(n) → 0…1 (n: номер окна, снизу вверх), o.build 0…1 (дом растёт по этажам).
  function windows(g, x0, y0, cols, rows, cw, ch, gx, gy, o, n0 = 0) {
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const n = n0 + j * cols + i, l = o.lit ? cl(o.lit(n)) : (o.on ?? 0);
      g.fillStyle = l > 0 ? mix(o.win || P.cream, o.winOn || P.lit, l) : (o.win || P.cream);
      rr(g, x0 + i * (cw + gx), y0 - (j + 1) * (ch + gy) + gy, cw, ch, Math.min(cw, ch) * .14); g.fill();
    }
  }
  function tower(g, x, y, w, h, o = {}) { // многоэтажка: floors, cols окон, подъезд
    const fl = o.floors || Math.max(2, Math.round(h / (w * .3))), cols = o.cols || Math.max(2, Math.round(w / 110)), fh = h / fl, b = cl(o.build ?? 1);
    const vis = Math.floor(fl * b + 1e-6), part = fl * b - vis, hh = fh * (vis + part);
    g.fillStyle = o.col || P.ink; rr(g, x - w / 2, y - hh, w, hh, w * .02); g.fill();
    if (o.roof !== null && b >= 1) { g.fillStyle = o.roof || mix(o.col || P.ink, P.ink, .35); g.fillRect(x - w / 2 - w * .025, y - h - fh * .12, w * 1.05, fh * .16); }
    const cw = w / cols * .48, gx = w / cols - cw, ch = fh * .48;
    for (let f = 0; f < vis; f++) windows(g, x - w / 2 + gx / 2, y - f * fh - fh * .26, cols, 1, cw, ch, gx, 0, o, f * cols);
    if (o.door !== false) { g.fillStyle = o.col || P.ink; g.fillRect(x - fh * .42, y - fh * .86, fh * .84, fh * .86); g.fillStyle = o.doorCol || P.orange; rr(g, x - fh * .27, y - fh * .7, fh * .54, fh * .7, fh * .08); g.fill(); }
    return { top: y - hh, fh };
  }
  function house(g, x, y, w, h, o = {}) { // жилой дом с двускатной крышей, 1–2 этажа (o.floors), окна, дверь
    const fl = o.floors || 1, rh = h * .34, bh = h - rh, col = o.col || P.paper;
    g.fillStyle = col; g.fillRect(x - w / 2, y - bh, w, bh);
    g.fillStyle = o.roof || P.ink; g.beginPath(); g.moveTo(x - w * .58, y - bh); g.lineTo(x, y - h); g.lineTo(x + w * .58, y - bh); g.closePath(); g.fill();
    const fh = bh / fl, cw = w * .2, ch = fh * .34; o = Object.assign({ win: o.win || P.ink }, o);
    for (let f = 0; f < fl; f++) { if (f === 0) { windows(g, x - w * .36, y - fh * .3, 1, 1, cw, ch, 0, 0, o, 0); windows(g, x + w * .16, y - fh * .3, 1, 1, cw, ch, 0, 0, o, 1); } else windows(g, x - w * .36, y - f * fh - fh * .3, 2, 1, cw, ch, w * .32, 0, o, f * 2); }
    g.fillStyle = o.doorCol || P.orange; rr(g, x - w * .08, y - fh * .58, w * .16, fh * .58, w * .03); g.fill();
    return { top: y - h };
  }
  // Магазин/кафе: витрина, полосатый тент (awning: цвет), вывеска с текстом o.sign (только из параметров), дверь.
  function shop(g, x, y, w, h, o = {}) {
    const col = o.col || P.paper, aw = o.awning || P.orange, sh = h * .2;
    g.fillStyle = col; g.fillRect(x - w / 2, y - h, w, h);
    g.fillStyle = o.signBg || P.ink; g.fillRect(x - w / 2, y - h, w, sh);
    if (o.sign) text(g, o.sign, x, y - h + sh * .72, sh * .55, { al: 'center', col: o.signCol || P.cream, max: w * .88, w: 800 });
    const ay = y - h + sh, n = o.stripes || 6, sw = w * 1.06 / n, ah = h * .14;
    for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? (o.awning2 || P.white) : aw; const ax = x - w * .53 + i * sw; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + sw, ay); g.lineTo(ax + sw, ay + ah); g.arc(ax + sw / 2, ay + ah, sw / 2, 0, Math.PI); g.closePath(); g.fill(); }
    const wy = ay + ah + h * .08, wh = y - wy - h * .02;
    g.fillStyle = o.win || P.sky; rr(g, x - w * .44, wy, w * .5, wh * .72, w * .02); g.fill();
    g.fillStyle = o.doorCol || P.ink; rr(g, x + w * .14, wy, w * .26, wh, w * .02); g.fill(); circle(g, x + w * .18, wy + wh * .55, w * .015, P.cream);
    if (o.lit) { g.save(); g.globalAlpha *= cl(o.lit) * .55; g.fillStyle = P.lit; rr(g, x - w * .44, wy, w * .5, wh * .72, w * .02); g.fill(); g.restore(); }
    return { top: y - h, win: [x - w * .19, wy + wh * .36] };
  }
  // Школа/библиотека: широкое здание, фронтон над входом, флажок, вывеска o.sign, ряды окон.
  function school(g, x, y, w, h, o = {}) {
    const col = o.col || P.paper; g.fillStyle = col; g.fillRect(x - w / 2, y - h, w, h);
    g.fillStyle = o.roof || P.ink; g.fillRect(x - w * .52, y - h - h * .06, w * 1.04, h * .07);
    const pw = w * .32; g.beginPath(); g.moveTo(x - pw / 2 - w * .02, y - h * .98); g.lineTo(x, y - h * 1.3); g.lineTo(x + pw / 2 + w * .02, y - h * .98); g.closePath(); g.fill();
    if (o.flag !== false) { seg(g, x, y - h * 1.3, x, y - h * 1.62, w * .008, P.ink); g.fillStyle = o.flagCol || P.orange; g.beginPath(); const fw = Math.sin(T * 5) * w * .01; g.moveTo(x, y - h * 1.62); g.lineTo(x + w * .1, y - h * 1.57 + fw); g.lineTo(x, y - h * 1.52); g.fill(); }
    if (o.sign) { g.fillStyle = o.signBg || P.ink; rr(g, x - pw * .55, y - h * .9, pw * 1.1, h * .13, h * .03); g.fill(); text(g, o.sign, x, y - h * .9 + h * .095, h * .075, { al: 'center', col: P.cream, max: pw }); }
    const ow = Object.assign({ win: o.win || P.sky }, o), cw = w * .075, ch = h * .2;
    windows(g, x - w * .46, y - h * .14, 3, 2, cw, ch, cw * .55, h * .1, ow, 0); windows(g, x + w * .46 - cw * 3 - cw * 1.1, y - h * .14, 3, 2, cw, ch, cw * .55, h * .1, ow, 6);
    g.fillStyle = o.doorCol || P.orange; rr(g, x - w * .07, y - h * .48, w * .14, h * .48, w * .07); g.fill();
    return { top: y - h * 1.3, door: [x, y] };
  }

  // Природа. tree: kind 'oak' (лиственное, по умолчанию) | 'pine' (хвойное) | 'round'; o.col крона, o.trunk, o.sway 0…1 (качание).
  function tree(g, x, y, h, o = {}) {
    const k = o.kind || 'oak', col = o.col || (k === 'pine' ? P.green : P.ink), tr = o.trunk || P.brown, sw = Math.sin(T * 1.6 + x * .01) * h * .012 * (o.sway ?? 1);
    if (k === 'pine') {
      g.fillStyle = tr; g.fillRect(x - h * .04, y - h * .2, h * .08, h * .2); g.fillStyle = col;
      for (let i = 0; i < 3; i++) { const by = y - h * (.15 + i * .25), hw = h * (.3 - i * .07); g.beginPath(); g.moveTo(x - hw, by); g.lineTo(x + hw, by); g.lineTo(x + sw * (i + 1), by - h * .38); g.closePath(); g.fill(); }
      return { top: y - h };
    }
    g.strokeStyle = tr; g.lineCap = 'round'; g.lineWidth = h * (k === 'oak' ? .09 : .06); g.beginPath(); g.moveTo(x, y); g.lineTo(x + sw, y - h * .55); g.stroke();
    if (k === 'oak') { g.lineWidth = h * .04; g.beginPath(); g.moveTo(x + sw * .5, y - h * .38); g.lineTo(x - h * .16, y - h * .52); g.moveTo(x + sw * .6, y - h * .44); g.lineTo(x + h * .17, y - h * .58); g.stroke(); }
    g.fillStyle = col; g.beginPath();
    const B = k === 'oak' ? [[0, -.72, .27], [-.2, -.6, .2], [.21, -.62, .21], [-.1, -.86, .17], [.12, -.85, .16]] : [[0, -.75, .25]];
    B.forEach(([dx, dy, r]) => { g.moveTo(x + sw + dx * h + r * h, y + dy * h); g.arc(x + sw + dx * h, y + dy * h, r * h, 0, TAU); }); g.fill();
    return { top: y - h };
  }
  function leaf(g, x, y, s, rot, col) { // кленовый лист: пять лопастей
    g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = col || P.orange; g.beginPath();
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * .62, r = s * (i === 2 ? 1 : i % 2 ? .82 : .62); g.moveTo(0, 0); g.lineTo(Math.cos(a - .22) * r * .55, Math.sin(a - .22) * r * .55); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.lineTo(Math.cos(a + .22) * r * .55, Math.sin(a + .22) * r * .55); g.closePath(); }
    g.fill(); g.strokeStyle = col || P.orange; g.lineWidth = s * .12; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, s * .45); g.stroke(); g.restore();
  }
  function leaves(g, t, n, o = {}) { // падающие листья в области {x0,x1,y0,y1}; o.cols, o.s, o.seed, o.speed
    const x0 = o.x0 ?? 60, x1 = o.x1 ?? 1020, y0 = o.y0 ?? 300, y1 = o.y1 ?? 1600, cols = o.cols || [P.orange, P.yellow, P.deep];
    for (let i = 0; i < n; i++) {
      const sd = (o.seed || 0) + i, sp = (o.speed || 120) * (.7 + hash(sd) * .6), L = y1 - y0, yy = y0 + ((hash(sd + 9) * L + t * sp) % L);
      leaf(g, x0 + hash(sd + 3) * (x1 - x0) + Math.sin(t * 1.7 + i) * 40, yy, (o.s || 26) * (.7 + hash(sd + 5) * .6), Math.sin(t * 2 + i) * 1.2, cols[i % cols.length]);
    }
  }
  function grass(g, x0, x1, y, o = {}) { // травинки-дуги на линии земли
    const n = o.n || Math.round((x1 - x0) / 26), hh = o.h || 40; g.strokeStyle = o.col || P.green; g.lineWidth = o.lw || 6; g.lineCap = 'round'; g.beginPath();
    for (let i = 0; i < n; i++) { const x = x0 + (i + .5) * (x1 - x0) / n, b = hh * (.6 + hash(i + 7) * .6), s = Math.sin(T * 2 + i) * 6; g.moveTo(x, y); g.quadraticCurveTo(x + s * .5, y - b * .6, x + s + (i % 2 ? 6 : -6), y - b); }
    g.stroke();
  }
  function sun(g, x, y, r, o = {}) { // солнце; rays 0…1 (лучи-чёрточки), half: true (на горизонте, ниже y срезано)
    const col = o.col || P.orange; g.save();
    if (o.half) { g.beginPath(); g.rect(x - r * 2, y - r * 2, r * 4, r * 2); g.clip(); }
    circle(g, x, y, r, col);
    if (o.rays) { g.strokeStyle = col; g.lineWidth = r * .1; g.lineCap = 'round'; g.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + T * .2, r1 = r * 1.25, r2 = r1 + r * .35 * cl(o.rays); g.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); g.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); } g.stroke(); }
    g.restore();
  }
  function moon(g, x, y, r, o = {}) { // полумесяц (o.full: полная)
    g.save(); g.fillStyle = o.col || P.cream; g.beginPath(); g.arc(x, y, r, 0, TAU);
    if (!o.full) { g.clip(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.moveTo(x + r * .45 + r * .85, y - r * .25); g.arc(x + r * .45, y - r * .25, r * .85, 0, TAU); g.fill('evenodd'); } else g.fill(); g.restore();
  }
  function stars(g, n, o = {}) { // звёзды-крестики и точки в {x0,x1,y0,y1}; o.on(i) → 0…1 (зажигание по очереди), мерцание
    const x0 = o.x0 ?? 60, x1 = o.x1 ?? 1020, y0 = o.y0 ?? 200, y1 = o.y1 ?? 900, col = o.col || P.cream, sd = o.seed || 1;
    g.fillStyle = col; g.strokeStyle = col; g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const q = o.on ? cl(o.on(i)) : 1; if (q <= 0) continue;
      const x = x0 + hash(sd + i * 3.1) * (x1 - x0), y = y0 + hash(sd + i * 7.7) * (y1 - y0), big = hash(sd + i) > .75, tw = .75 + .25 * Math.sin(T * 3 + i * 1.7), s = (o.s || 9) * (big ? 2.2 : 1) * q * tw;
      if (big) { g.lineWidth = s * .32; g.beginPath(); g.moveTo(x - s, y); g.lineTo(x + s, y); g.moveTo(x, y - s); g.lineTo(x, y + s); g.stroke(); } else { g.beginPath(); g.arc(x, y, s * .5, 0, TAU); g.fill(); }
    }
  }
  function cloud(g, x, y, w, o = {}) { // плоское облако: низ ровный
    g.fillStyle = o.col || P.white; g.beginPath(); const h = w * .32;
    g.moveTo(x - w / 2 + h / 2, y); g.arc(x - w / 2 + h / 2, y - h / 2, h / 2, Math.PI / 2, Math.PI * 1.5); g.arc(x - w * .08, y - h * .75, h * .62, Math.PI, 0); g.arc(x + w * .22, y - h * .6, h * .45, Math.PI * 1.1, 0); g.arc(x + w / 2 - h / 2, y - h / 2, h / 2, -Math.PI / 2, Math.PI / 2); g.closePath(); g.fill();
  }
  function sea(g, y, lt, o = {}) { // море от y до низа кадра (o.y1): заливка + бегущие линии волн
    const col = o.col || P.sea, y1 = o.y1 ?? H + 300, amp = o.amp ?? 10, len = o.len || 260, sp = o.speed ?? 1.4;
    g.fillStyle = col; g.beginPath(); g.moveTo(-300, y1);
    for (let x = -300; x <= W + 300; x += 30) g.lineTo(x, y + amp * Math.sin(x / len * TAU - lt * sp)); g.lineTo(W + 300, y1); g.closePath(); g.fill();
    const lc = o.line || rgba(P.white, .5), n = o.lines ?? 3; g.strokeStyle = lc; g.lineWidth = o.lw || 5; g.lineCap = 'round';
    for (let i = 0; i < n; i++) { const yy = y + 70 + i * (o.gap || 90), off = hash(i + 3) * 400; g.beginPath(); for (let x = 60 + (i % 2) * 120; x < W - 60; x += 260) { const xx = ((x + off + lt * 40 * (i % 2 ? -1 : 1)) % (W + 200) + W + 200) % (W + 200) - 100; g.moveTo(xx, yy + Math.sin(lt * 2 + x) * 4); g.lineTo(xx + 90, yy + Math.sin(lt * 2 + x) * 4); } g.stroke(); }
  }
  function hill(g, cx, y, w, h, o = {}) { g.fillStyle = o.col || P.green; g.beginPath(); g.ellipse(cx, y, w / 2, h, 0, Math.PI, TAU); g.closePath(); g.fill(); }

  // Транспорт. dir 1|-1 (едет вправо/влево), roll: пройденный путь px (крутит колёса). Опора: низ колёс.
  function wheel(g, x, y, r, roll, col) { circle(g, x, y, r, col || P.ink); circle(g, x, y, r * .42, P.greyD); g.strokeStyle = P.ink; g.lineWidth = r * .14; const a = roll / r; g.beginPath(); g.moveTo(x + Math.cos(a) * r * .42, y + Math.sin(a) * r * .42); g.lineTo(x - Math.cos(a) * r * .42, y - Math.sin(a) * r * .42); g.stroke(); }
  function car(g, x, y, w, o = {}) {
    const d = o.dir || 1, h = w * .42, r = w * .12, col = o.col || P.orange;
    g.save(); g.translate(x, y); g.scale(d, 1);
    g.fillStyle = col; rr(g, -w / 2, -h * .62 - r * .6, w, h * .62, h * .2); g.fill();
    g.beginPath(); g.moveTo(-w * .3, -h * .62 - r * .5); g.lineTo(-w * .2, -h - r * .5); g.lineTo(w * .16, -h - r * .5); g.lineTo(w * .32, -h * .62 - r * .5); g.closePath(); g.fill();
    g.fillStyle = o.win || P.sky; g.beginPath(); g.moveTo(-w * .22, -h * .66 - r * .5); g.lineTo(-w * .15, -h * .92 - r * .5); g.lineTo(-w * .03, -h * .92 - r * .5); g.lineTo(-w * .03, -h * .66 - r * .5); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(w * .02, -h * .66 - r * .5); g.lineTo(w * .02, -h * .92 - r * .5); g.lineTo(w * .13, -h * .92 - r * .5); g.lineTo(w * .24, -h * .66 - r * .5); g.closePath(); g.fill();
    circle(g, w * .45, -h * .45, w * .03, P.lit);
    wheel(g, -w * .3, -r, r, (o.roll || 0) * d, P.ink); wheel(g, w * .3, -r, r, (o.roll || 0) * d, P.ink); g.restore();
  }
  function bus(g, x, y, w, o = {}) { // автобус: o.col, o.num (номер маршрута, текст из параметров), o.people (силуэты в окнах)
    const d = o.dir || 1, h = w * .4, r = w * .07, col = o.col || P.orange;
    g.save(); g.translate(x, y); g.scale(d, 1);
    g.fillStyle = col; rr(g, -w / 2, -h - r * .5, w, h, h * .16); g.fill();
    g.fillStyle = mix(col, P.ink, .3); g.fillRect(-w / 2, -r * 1.4, w, r * .5);
    const n = 4, ww = w * .13, wy = -h - r * .5 + h * .14;
    for (let i = 0; i < n; i++) { const wx = -w * .44 + i * (ww + w * .03); g.fillStyle = o.win || P.sky; rr(g, wx, wy, ww, h * .36, h * .05); g.fill(); if (o.people) circle(g, wx + ww / 2, wy + h * .3, ww * .2, P.ink); }
    g.fillStyle = o.win || P.sky; rr(g, w * .32, wy, w * .14, h * .36, h * .05); g.fill();
    g.fillStyle = mix(col, P.ink, .45); rr(g, w * .205, wy, w * .085, h * .76, h * .03); g.fill();
    if (o.num != null) { const nr = h * .16; circle(g, w * .38, wy + h * .58, nr, P.white); g.save(); g.scale(d, 1); text(g, String(o.num), d * w * .38, wy + h * .58 + nr * .45, nr * 1.25, { al: 'center', col: P.ink, w: 800 }); g.restore(); }
    wheel(g, -w * .3, -r, r, (o.roll || 0) * d); wheel(g, w * .3, -r, r, (o.roll || 0) * d); g.restore();
  }
  function bike(g, x, y, h, o = {}) { // велосипед с человеком (h: рост; o: col рамы и все опции person; rider:false: пустой)
    const d = o.dir || 1, r = h * .155, roll = o.roll || 0, col = o.col || P.orange;
    const rx = x - d * h * .27, fx = x + d * h * .27, wy = y - r;
    wheel(g, rx, wy, r, roll * d, P.ink); wheel(g, fx, wy, r, roll * d, P.ink);
    g.strokeStyle = col; g.lineWidth = h * .035; g.lineCap = 'round'; g.lineJoin = 'round'; const sx = x - d * h * .08, sy = y - h * .45;
    g.beginPath(); g.moveTo(rx, wy); g.lineTo(x, wy); g.lineTo(sx, sy); g.lineTo(rx, wy); g.moveTo(x, wy); g.lineTo(fx - d * h * .05, sy - h * .02); g.lineTo(fx, wy); g.moveTo(sx, sy); g.lineTo(fx - d * h * .05, sy - h * .02); g.stroke();
    seg(g, sx - d * h * .05, sy - h * .02, sx + d * h * .05, sy - h * .02, h * .04, P.ink);
    if (o.rider !== false) person(g, sx, y + h * .02, h, Object.assign({}, o, { pose: 'ride', ph: roll / r }));
  }
  // Лодка/катер: o.col корпус, cabin (рубка), motor (мотор за кормой, крутится при o.v>0), crew [{...person}], wake (след, при движении).
  function boat(g, x, y, w, o = {}) {
    const d = o.dir || 1, h = w * .22, col = o.col || P.ink, rock = Math.sin(T * 2.2 + x * .01) * .03;
    g.save(); g.translate(x, y); g.rotate(rock); g.scale(d, 1);
    if (o.wake) { g.strokeStyle = rgba(P.white, .6); g.lineWidth = w * .02; g.lineCap = 'round'; for (let i = 0; i < 3; i++) { const q = (T * 1.5 + i / 3) % 1; g.globalAlpha = 1 - q; g.beginPath(); g.moveTo(-w * .55 - q * w * .5, h * .05 + q * h * .3); g.lineTo(-w * .65 - q * w * .5 - w * .15, h * .05 + q * h * .3); g.stroke(); } g.globalAlpha = 1; }
    if (o.crew) o.crew.forEach((p, i) => person(g, (p.dx ?? (-w * .1 + i * w * .22)), -h * .5, p.h || w * .5, Object.assign({ dir: 1 }, p)));
    if (o.cabin !== false) { g.fillStyle = o.cabinCol || P.paper; rr(g, w * .05, -h * 1.9, w * .26, h * 1.5, w * .03); g.fill(); g.fillStyle = P.sky; rr(g, w * .17, -h * 1.7, w * .1, h * .5, w * .015); g.fill(); }
    g.fillStyle = col; g.beginPath(); g.moveTo(-w / 2, -h * .55); g.lineTo(w / 2 + w * .06, -h * .55); g.lineTo(w * .36, h * .45); g.lineTo(-w * .44, h * .45); g.closePath(); g.fill();
    g.fillStyle = o.stripe || P.white; g.fillRect(-w * .47, -h * .2, w * .95, h * .12);
    if (o.motor) { g.fillStyle = P.mid; rr(g, -w * .6, -h * .75, w * .1, h * .7, w * .02); g.fill(); seg(g, -w * .55, 0, -w * .55, h * .6, w * .02, P.mid); if ((o.v || 0) > 0) { const a = T * 40; seg(g, -w * .55 + Math.cos(a) * w * .04, h * .6, -w * .55 - Math.cos(a) * w * .04, h * .6, w * .02, P.cream); } }
    g.restore();
  }

  // Животные. s: длина тела. o.col, o.pose 'stand'|'walk'|'sleep' (собака/кошка), dir. Собака: рыжая через col: P.ginger.
  function dog(g, x, y, s, o = {}) {
    const d = o.dir || 1, col = o.col || P.ginger, dk = mix(col, P.ink, .3), pose = o.pose || 'stand';
    g.save(); g.translate(x, y); g.scale(d, 1); g.lineCap = 'round';
    if (pose === 'sleep') {
      const br = 1 + Math.sin(T * 2.4) * .03; g.fillStyle = col; g.beginPath(); g.ellipse(0, -s * .16 * br, s * .5, s * .17 * br, 0, Math.PI, TAU); g.lineTo(s * .5, 0); g.lineTo(-s * .5, 0); g.fill();
      seg(g, -s * .45, -s * .05, -s * .7, -s * .02, s * .07, col);
      circle(g, s * .45, -s * .1, s * .14, col); g.fillStyle = dk; g.beginPath(); g.ellipse(s * .38, -s * .15, s * .05, s * .1, -.6, 0, TAU); g.fill();
      g.strokeStyle = P.ink; g.lineWidth = s * .02; g.beginPath(); g.arc(s * .5, -s * .13, s * .035, .1, Math.PI - .1); g.stroke(); circle(g, s * .6, -s * .08, s * .025, P.ink);
      g.restore(); return;
    }
    const ph = T * 9, sw = pose === 'walk' ? .4 : 0, legs = [[-s * .3, 1], [-s * .2, -1], [s * .25, -1], [s * .35, 1]];
    legs.forEach(([lx, sd]) => { const a = Math.sin(ph) * sw * sd, f = limb(lx, -s * .3, s * .3, a); seg(g, lx, -s * .3, f[0], f[1], s * .09, sd < 0 ? dk : col); });
    g.fillStyle = col; rr(g, -s * .42, -s * .58, s * .84, s * .32, s * .16); g.fill();
    seg(g, -s * .38, -s * .5, -s * .58, -s * .78 + Math.sin(T * 8) * s * .05, s * .07, col);
    circle(g, s * .48, -s * .7, s * .17, col); rr(g, s * .5, -s * .7, s * .2, s * .12, s * .05); g.fill();
    g.fillStyle = dk; g.beginPath(); g.ellipse(s * .4, -s * .7, s * .06, s * .14, -.4, 0, TAU); g.fill();
    circle(g, s * .7, -s * .66, s * .035, P.ink); circle(g, s * .54, -s * .75, s * .025, P.ink);
    g.restore();
  }
  function cat(g, x, y, s, o = {}) {
    const d = o.dir || 1, col = o.col || P.ink; g.save(); g.translate(x, y); g.scale(d, 1); g.lineCap = 'round';
    if (o.pose === 'sleep') { g.fillStyle = col; g.beginPath(); g.ellipse(0, -s * .16, s * .38, s * .16, 0, Math.PI, TAU); g.lineTo(s * .38, 0); g.lineTo(-s * .38, 0); g.fill(); circle(g, s * .3, -s * .14, s * .13, col); g.restore(); return; }
    seg(g, -s * .2, -s * .3, -s * .2, 0, s * .07, col); seg(g, s * .2, -s * .3, s * .2, 0, s * .07, col);
    g.fillStyle = col; rr(g, -s * .32, -s * .5, s * .64, s * .26, s * .13); g.fill();
    g.strokeStyle = col; g.lineWidth = s * .06; g.beginPath(); g.moveTo(-s * .3, -s * .42); g.quadraticCurveTo(-s * .6, -s * .5, -s * .5, -s * .85 + Math.sin(T * 3) * s * .05); g.stroke();
    circle(g, s * .36, -s * .62, s * .16, col); g.beginPath(); g.moveTo(s * .24, -s * .7); g.lineTo(s * .26, -s * .88); g.lineTo(s * .36, -s * .76); g.moveTo(s * .36, -s * .76); g.lineTo(s * .46, -s * .88); g.lineTo(s * .5, -s * .7); g.fill();
    circle(g, s * .42, -s * .64, s * .028, P.lit); g.restore();
  }
  function bird(g, x, y, s, o = {}) { // чайка/птица в полёте: две дуги-крыла, взмах по времени; o.sit: сидит
    const col = o.col || P.ink, f = Math.sin(T * (o.flap || 8) + x * .05);
    g.save(); g.strokeStyle = col; g.fillStyle = col; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = s * .12;
    if (o.sit) { g.beginPath(); g.ellipse(x, y - s * .25, s * .4, s * .22, 0, 0, TAU); g.fill(); circle(g, x + s * .32, y - s * .48, s * .15, col); g.beginPath(); g.moveTo(x + s * .45, y - s * .5); g.lineTo(x + s * .62, y - s * .45); g.lineTo(x + s * .45, y - s * .42); g.fill(); g.restore(); return; }
    const wy = y - f * s * .35; g.beginPath(); g.moveTo(x - s, wy); g.quadraticCurveTo(x - s * .5, y - s * .45 - f * s * .2, x, y); g.quadraticCurveTo(x + s * .5, y - s * .45 - f * s * .2, x + s, wy); g.stroke();
    circle(g, x, y, s * .13, col); g.restore();
  }

  // Улица. lamp: фонарь (on 0…1: плафон горит + круг света), garland: гирлянда лампочек на провисшем проводе (on(i) → 0…1), board: доска с текстом.
  function lamp(g, x, y, h, o = {}) {
    const on = cl(o.on || 0), col = o.col || P.ink, lc = o.light || P.lit;
    seg(g, x, y, x, y - h * .9, h * .035, col); seg(g, x, y - h * .9, x + h * .12, y - h * .95, h * .03, col);
    if (on > 0) { g.save(); g.globalAlpha *= on * .22; circle(g, x + h * .14, y - h * .86, h * .2, lc); g.restore(); }
    g.fillStyle = col; g.beginPath(); g.moveTo(x + h * .05, y - h * .92); g.lineTo(x + h * .23, y - h * .92); g.lineTo(x + h * .19, y - h * .86); g.lineTo(x + h * .09, y - h * .86); g.fill();
    circle(g, x + h * .14, y - h * .85, h * .04, on > 0 ? mix(P.mid, lc, on) : P.mid);
  }
  function garland(g, x0, y0, x1, y1, o = {}) {
    const n = o.n || 9, sag = o.sag ?? 80, cols = o.cols || [P.orange, P.lit, P.white], r = o.r || 16;
    const pt = u => [lerp(x0, x1, u), lerp(y0, y1, u) + sag * 4 * u * (1 - u)];
    g.strokeStyle = o.wire || P.ink; g.lineWidth = o.lw || 4; g.beginPath(); for (let i = 0; i <= 20; i++) { const p = pt(i / 20); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.stroke();
    for (let i = 0; i < n; i++) { const p = pt((i + .5) / n), q = o.on ? cl(o.on(i)) : 1; circle(g, p[0], p[1] + r * .9, r, q > 0 ? mix(o.off || P.mid, cols[i % cols.length], q) : (o.off || P.mid)); }
  }
  // Доска/вывеска: o.title, o.lines ['строка' | ['слева','справа']] (только из параметров), col доски, chalk цвет мела, legs (ножки-штендер), p 0…1 (сколько строк проявилось).
  function board(g, cx, y, w, h, o = {}) {
    const col = o.col || P.ink, ch = o.chalk || P.cream, x = cx - w / 2, ty = y - h, pad = w * .08;
    if (o.legs !== false) { g.strokeStyle = o.frame || P.brown; g.lineWidth = w * .03; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + w * .12, ty + h * .5); g.lineTo(x + w * .04, y + h * .25); g.moveTo(x + w * .88, ty + h * .5); g.lineTo(x + w * .96, y + h * .25); g.stroke(); }
    g.fillStyle = o.frame || P.brown; rr(g, x - w * .025, ty - w * .025, w * 1.05, h + w * .05, w * .04); g.fill();
    g.fillStyle = col; rr(g, x, ty, w, h, w * .03); g.fill();
    const L = o.lines || [], n = L.length + (o.title ? 1 : 0), size = o.size || Math.min(h / (n + .8) * .62, w * .11), lh = size * 1.45, p = o.p ?? 1; let yy = ty + pad + size;
    if (o.title) { text(g, o.title, cx, yy, size * .85, { al: 'center', col: o.titleCol || P.orange, fam: 'text', w: 700, max: w - pad * 2 }); yy += lh; }
    L.forEach((ln, i) => {
      const a = cl(p * L.length - i); if (a <= 0) { yy += lh; return; }
      if (Array.isArray(ln)) { const r = text(g, ln[1], x + w - pad, yy, size, { al: 'right', col: ch, a, w: 700, fam: 'text' }), l = text(g, ln[0], x + pad, yy, size, { col: ch, a, w: 600, fam: 'text', max: w - pad * 2 - r.w - size }); g.save(); g.globalAlpha *= a * .5; g.fillStyle = ch; for (let dx = x + pad + l.w + size * .3; dx < x + w - pad - r.w - size * .3; dx += size * .32) { g.beginPath(); g.arc(dx, yy - size * .1, size * .05, 0, TAU); g.fill(); } g.restore(); }
      else text(g, ln, x + pad, yy, size, { col: ch, a, w: 600, fam: 'text', max: w - pad * 2 });
      yy += lh;
    });
  }

  return {
    W, H, SAFE, P, F, TAU, SP,
    cl, pr, lerp, eo, eo5, ei, eio, eback, spring, sv, track, kf, bump, hash, rnd, rgba, mix, isDark, at,
    begin, cuts, cam, shake, bg, field, wipe, hole, halftone, smear,
    font, measure, fit, text, label, words, digits, odo, clock,
    rr, shadow, circle, pill, chip, dot, trail, hop, hops, knob, switchAt, toggle, notif, pulse, ping, touch, cursor, check, phone,
    ring, springCurve, graph, string, wave, ring3d, grid, status,
    person, crowd, tower, house, shop, school, windows, tree, leaf, leaves, grass, sun, moon, stars, cloud, sea, hill,
    wheel, car, bus, bike, boat, dog, cat, bird, lamp, garland, board, seg, t: () => T
  };
})();
