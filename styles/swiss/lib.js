// «Швейцарский постер» — библиотека стиля для роликов draw(t, k) на Canvas 2D 1080×1920.
// Одна глобальная константа SWISS. Работает в Web Worker: только OffscreenCanvas, без document и сети.
// Кадр считается только из t; кэшируются лишь текстуры и точки сферы. Углы rot — в градусах.
const SWISS = (() => {
  const W = 1080, H = 1920, PI = Math.PI, TAU = PI * 2, DEG = PI / 180;
  const SAFE = { x0: 60, x1: 1020, y0: 110, y1: 1690 }, M = 96; // M — поле сетки
  const P = { red: '#FF5937', blue: '#2E3AFE', cream: '#F2EDE7', black: '#0F0F11', yellow: '#FAC63C',
    ink: '#111113', white: '#FBF8F3', grey: '#8D887F', redD: '#D8401E', blueD: '#2330C9', creamD: '#DDD5C8', yellowD: '#E3A91C',
    pink: '#FF8FB4', orange: '#FF8A1F', ginger: '#E0712A', green: '#2F9E5A', greenD: '#1F7A43', brown: '#7A4526', sky: '#9CC8FF', night: '#151B4D' };
  const C = c => c == null ? c : (P[c] || c); // цвет: имя палитры или '#hex'
  const FIELD = {
    red: { bg: P.red, fg: P.ink, acc: P.cream, alt: P.ink, hud: P.ink, dim: P.redD },
    blue: { bg: P.blue, fg: P.cream, acc: P.yellow, alt: P.red, hud: P.cream, dim: P.blueD },
    cream: { bg: P.cream, fg: P.ink, acc: P.red, alt: P.blue, hud: P.ink, dim: P.creamD },
    black: { bg: P.black, fg: P.cream, acc: P.red, alt: P.yellow, hud: P.cream, dim: '#26262A' },
    yellow: { bg: P.yellow, fg: P.ink, acc: P.red, alt: P.blue, hud: P.ink, dim: P.yellowD },
  };
  const F = { G: '"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif',
    S: '"DejaVu Serif",Georgia,"Noto Serif","Times New Roman",serif',
    M: '"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace' };
  const font = (kind, s) => kind === 'serif' ? `italic 400 ${s}px ${F.S}` : kind === 'mono' ? `400 ${s}px ${F.M}` : kind === 'monoB' ? `700 ${s}px ${F.M}`
    : kind === 'bold' ? `700 ${s}px ${F.G}` : kind === 'reg' ? `500 ${s}px ${F.G}` : `900 ${s}px ${F.G}`;
  let K = null, G = null, T = 0, TX = null, SPH = null; const WCACHE = {};

  // ---------- время, изинги, пружины ----------
  const cl = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
  const pr = (t, a, b) => b === a ? (t >= a ? 1 : 0) : cl((t - a) / (b - a));
  const lerp = (a, b, p) => a + (b - a) * p;
  const eo = p => 1 - Math.pow(1 - cl(p), 3);
  const ei = p => Math.pow(cl(p), 3);
  const eio = p => { p = cl(p); return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  const eb = (p, c = 1.7) => { p = cl(p); return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
  const SP = { snap: [320, 28], soft: [170, 26], heavy: [90, 19], text: [300, 35], pop: [220, 16], jelly: [260, 11] };
  function spring(t, k = 170, d = 26) { // затухающая пружина 0→1, t — секунды от старта
    if (t <= 0) return 0;
    const w0 = Math.sqrt(k), z = d / (2 * w0);
    if (z < 1) { const wd = w0 * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + z * w0 / wd * Math.sin(wd * t)); }
    return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  }
  const sp = (t, name = 'soft') => spring(t, ...(SP[name] || SP.soft));
  function track(t, keys, name = 'soft') { // значение, которое пружиной переходит между целями [[t, v], …]
    let v = keys[0][1];
    for (let i = 1; i < keys.length; i++) v += (keys[i][1] - keys[i - 1][1]) * sp(t - keys[i][0], name);
    return v;
  }
  function kf(A, t, ease = eio) {
    if (t <= A[0][0]) return A[0][1];
    for (let i = 0; i < A.length - 1; i++) { const [t0, v0] = A[i], [t1, v1] = A[i + 1]; if (t < t1) return lerp(v0, v1, ease(pr(t, t0, t1))); }
    return A[A.length - 1][1];
  }
  function life(lt, t0, out, din = .32, dout = .22) { // {e: вход 0→1 пружиной, a: видимость} — уход быстрее входа
    const e = sp(lt - t0, 'snap'), a = cl((lt - t0) / .2) * (out == null ? 1 : 1 - eo(pr(lt, out, out + dout)));
    return { e, a, on: lt > t0 && a > 0 };
  }
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const rnd = seed => { let s = (seed >>> 0) || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
  const wob = (t, f = 1, seed = 0) => Math.sin(t * f * 2.1 + seed) * .6 + Math.sin(t * f * 3.7 + seed * 1.7) * .4;
  const step = (t, fps = 12) => Math.floor(t * fps) / fps;
  const z2 = n => String(n).padStart(2, '0');
  const tc = (t, fps = 30) => { const f = Math.floor(t * fps + 1e-6); return '00:' + z2(Math.floor(f / fps / 60)) + ':' + z2(Math.floor(f / fps) % 60) + ':' + z2(f % fps); };
  const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  function mix(a, b, p) { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], cl(p))).toString(16).padStart(2, '0')).join(''); }
  const rgba = (c, a) => { const A = hex(c); return `rgba(${A[0]},${A[1]},${A[2]},${a})`; };
  const ROAST = ['#E6DCC4', P.yellow, '#F08A2E', P.red, '#7A2A14', P.black];
  const roast = p => { p = cl(p) * (ROAST.length - 1); const i = Math.min(ROAST.length - 2, Math.floor(p)); return mix(ROAST[i], ROAST[i + 1], p - i); };

  // ---------- слова фраз: оценка момента каждого слова ----------
  function words(i, subs) {
    subs = subs || K.subs; const key = i + ':' + subs[i].t0; if (WCACHE[key]) return WCACHE[key];
    const s = subs[i], ws = s.text.split(/\s+/).filter(Boolean);
    const wt = ws.map(w => [w, w.replace(/[^0-9A-Za-zА-Яа-яЁё-]/g, '').length + 1.5, /,$/.test(w) ? 2.5 : /[.!?…]$/.test(w) ? 4 : 0]);
    const tot = wt.reduce((a, x, j) => a + x[1] + (j < wt.length - 1 ? x[2] : 0), 0), T0 = s.t0 + .12, L = s.t1 - s.t0 - .47;
    let c = 0; const out = wt.map(([w, l, p]) => { const r = { w, t: T0 + L * c / tot }; c += l + p; return r; });
    return WCACHE[key] = out;
  }
  const norm = s => String(s).toLowerCase().replace(/[^0-9a-zа-яё-]/g, '');
  function at(i, frag, subs) { // абсолютное время слова (или нескольких слов подряд) фразы i: точное совпадение → начало слова → часть слова
    const ws = words(i, subs), parts = String(frag).split(/\s+/).map(norm).filter(Boolean);
    for (let mode = 0; mode < 3; mode++) for (let j = 0; j + parts.length <= ws.length; j++) {
      let ok = true; for (let k = 0; k < parts.length && ok; k++) { const w = norm(ws[j + k].w), f = parts[k]; ok = mode === 0 ? w === f : mode === 1 ? w.startsWith(f) : w.includes(f); }
      if (ok) return ws[j].t; }
    return (subs || K.subs)[i].t0;
  }
  const phraseAt = (t, subs) => { subs = subs || K.subs; let i = 0; while (i < subs.length - 1 && t >= subs[i].t1 - 1e-6) i++; return i; };

  // ---------- текстуры (один раз) ----------
  function tex() {
    if (TX) return TX;
    // зерно крупинками 2×2 px и мягче: так видео не раздувается при сжатии (мелкий шум съедает битрейт)
    const s0 = new OffscreenCanvas(128, 128), x0 = s0.getContext('2d'), im = x0.createImageData(128, 128), d = im.data, r = rnd(91);
    for (let i = 0; i < d.length; i += 4) { const v = r(), a = r(); if (v < .5) { d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = a * 20 | 0; } else { d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = a * 15 | 0; } }
    x0.putImageData(im, 0, 0);
    const c = new OffscreenCanvas(256, 256), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(s0, 0, 0, 256, 256);
    return TX = { grain: G.createPattern(c, 'repeat') };
  }

  // ---------- кадр, поля, сцены, склейки, камера ----------
  function begin(t, k) {
    K = k; G = k.g; T = t; tex(); const g = G;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.setLineDash([]);
    g.shadowBlur = 0; g.shadowColor = 'rgba(0,0,0,0)'; g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.lineJoin = 'round'; g.lineCap = 'butt';
    return g;
  }
  const fieldOf = f => typeof f === 'object' ? f : FIELD[f] || { bg: f, fg: P.ink, acc: P.red, alt: P.blue, hud: P.ink, dim: f };
  function field(g, f) { f = fieldOf(f); g.fillStyle = f.bg; g.fillRect(-60, -60, W + 120, H + 120); return f; }
  function grain(g, a = 1) { // «кипящее» зерно печати, 8 раз в секунду
    const n = Math.floor(T * 8); g.save(); g.setTransform(1, 0, 0, 1, -(hash(n) * 256 | 0), -(hash(n + 7.7) * 256 | 0));
    g.globalAlpha = a; g.fillStyle = TX.grain; g.fillRect(0, 0, W + 256, H + 256); g.restore();
  }
  const resolve = (SC) => SC.forEach(s => { if (Array.isArray(s.at)) s.at = at(s.at[0], s.at[1]); });
  function cutTimes(SC, subs) { return SC.map(s => Array.isArray(s.at) ? at(s.at[0], s.at[1], subs) : s.at); }
  function info(sc, t, i, SC) {
    const nx = SC[i + 1], lt = t - sc.at, d = (nx ? nx.at : K.duration) - sc.at, f = fieldOf(sc.field), ph = phraseAt(sc.at + .02);
    return { i, lt, d, p: cl(lt / d), f, t, ph, w: (frag, pi) => at(pi == null ? ph : pi, frag) - sc.at };
  }
  function scene(g, sc, t, i, SC) {
    const s = info(sc, t, i, SC), c = sc.cam || {}; field(g, s.f);
    const kick = c.kick ?? (!sc.tr || sc.tr === 'cut' ? .06 : .035);
    const z = 1 + kick * (1 - sp(s.lt, 'heavy')) + (c.push ?? .035) * eio(s.p);
    const cx = c.x ?? W / 2, cy = c.y ?? H * .5, dy = (c.rise ?? 26) * (1 - sp(s.lt, 'soft')) + (c.pan ?? 0) * eio(s.p);
    g.save(); g.translate(cx, cy + dy); g.scale(z, z); g.translate(-cx, -cy); sc.draw(g, s.lt, s); g.restore();
    return s;
  }
  function clipTr(g, sc, p) { // форма, в которой видна новая сцена при склейке
    const tr = sc.tr, e = eo(p); g.beginPath();
    if (tr === 'iris') { const x = sc.x ?? W / 2, y = sc.y ?? H / 2, R = Math.hypot(Math.max(x, W - x), Math.max(y, H - y)) * eo(pr(p, 0, 1)); g.arc(x, y, Math.max(.5, R), 0, TAU); }
    else if (tr === 'wipe') { const dir = sc.dir || 'up', e2 = eo(pr(p, .18, 1));
      if (dir === 'up') g.rect(0, H * (1 - e2), W, H); else if (dir === 'down') g.rect(0, 0, W, H * e2);
      else if (dir === 'left') g.rect(W * (1 - e2), 0, W, H); else g.rect(0, 0, W * e2, H); }
    else if (tr === 'bands') { const n = sc.n || 5, bw = W / n;
      for (let k = 0; k < n; k++) { const q = eo(pr(p, k * .09, k * .09 + .6)); if (sc.dir === 'side') g.rect(0, k * H / n, W * q, H / n + 1); else g.rect(k * bw, 0, bw + 1, H * q); } }
    else if (tr === 'tiles') { const s = sc.tile || 180, cols = Math.ceil(W / s), rows = Math.ceil(H / s), ox = sc.x ?? W / 2, oy = sc.y ?? H / 2, md = Math.hypot(W, H);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const x = c * s + s / 2, y = r * s + s / 2, dd = Math.hypot(x - ox, y - oy) / md;
        const q = eo(pr(p, dd * .55, dd * .55 + .45)) * s / 2 + .5; g.rect(x - q, y - q, q * 2, q * 2); } }
    else g.rect(0, 0, W, H);
    g.clip();
  }
  function bandTr(g, sc, p) { // цветной блок-предвестник у шторки
    if (sc.tr !== 'wipe' || !sc.band) return; const dir = sc.dir || 'up', e1 = eo(pr(p, 0, .82)), e2 = eo(pr(p, .18, 1));
    g.fillStyle = sc.band;
    if (dir === 'up') g.fillRect(0, H * (1 - e1), W, H * (e1 - e2)); else if (dir === 'down') g.fillRect(0, H * e2, W, H * (e1 - e2));
    else if (dir === 'left') g.fillRect(W * (1 - e1), 0, W * (e1 - e2), H); else g.fillRect(W * e2, 0, W * (e1 - e2), H);
  }
  function play(g, t, SC) { // SC: [{at, field, tr, dur, dir, x, y, band, cam, draw(g, lt, s)}] → рисует сцену и склейку
    resolve(SC); let i = 0; for (let j = 0; j < SC.length; j++) if (t >= SC[j].at) i = j;
    const cur = SC[i], tr = cur.tr || 'cut', dur = cur.dur || (tr === 'iris' ? .42 : tr === 'tiles' ? .5 : .36), lt = t - cur.at;
    const p = i > 0 && tr !== 'cut' ? cl(lt / dur) : 1;
    if (p >= 1) return scene(g, cur, t, i, SC);
    if (tr === 'slide') { const e = sp(lt, 'snap'), dx = (cur.dir === 'right' ? -1 : 1) * W;
      g.save(); g.translate(-dx * e, 0); scene(g, SC[i - 1], t, i - 1, SC); g.restore();
      g.save(); g.translate(dx * (1 - e), 0); const s = scene(g, cur, t, i, SC); g.restore(); return s; }
    scene(g, SC[i - 1], t, i - 1, SC); bandTr(g, cur, p);
    g.save(); clipTr(g, cur, p); const s = scene(g, cur, t, i, SC); g.restore(); return s;
  }
  function layer(g, lt, depth, fn) { // параллакс: фон плывёт медленнее переднего плана
    g.save(); g.translate(wob(lt, .35, depth) * 14 * depth, -lt * 10 * depth); fn(g); g.restore();
  }

  // ---------- текст ----------
  function measureChars(g, chars) { return chars.map(ch => g.measureText(ch).width); }
  function wide(g, s, x, y, size, o = {}) { // огромный широкий гротеск капсом, буквы «надуваются» по ширине
    const chars = [...String(s).toUpperCase()], lt = o.lt ?? 99, t0 = o.t0 ?? 0, sx = o.sx ?? 1.14, tr = o.track ?? -.012, stag = o.stag ?? .035;
    let sz = size; g.font = font('wide', sz); let adv = measureChars(g, chars);
    const widthOf = () => (adv.reduce((a, b) => a + b, 0) + tr * sz * (chars.length - 1)) * sx;
    let tw = widthOf(); const max = o.max ?? (SAFE.x1 - SAFE.x0 - 20);
    if (tw > max) { sz = Math.floor(sz * max / tw); g.font = font('wide', sz); adv = measureChars(g, chars); tw = widthOf(); }
    const flex = o.flex ?? .035, fl = chars.map((c, i) => 1 + flex * Math.sin(T * 2.3 + i * 1.7)), fw = chars.map((c, i) => adv[i] * sx * fl[i]);
    const twa = fw.reduce((a, b) => a + b, 0) + tr * sz * sx * (chars.length - 1), al = o.al || 'center';
    const x0 = al === 'left' ? x : al === 'right' ? x - twa : x - twa / 2, mode = o.mode || 'stretch';
    const out = o.out == null ? 0 : eo(pr(lt, o.out, o.out + .2)), col = o.col || P.ink;
    if (o.mark && lt > t0) { const q = eo(pr(lt, t0, t0 + .3)) * (1 - out), pad = sz * .1; g.fillStyle = o.mark; g.fillRect(x0 - pad, y - sz * .86, (twa + pad * 2) * q, sz * 1.02); }
    let cx = x0, sl = 0;
    if (mode === 'slide') { const e = sp(lt - t0, 'text'); sl = (1 - e) * (o.from ?? 700); }
    for (let i = 0; i < chars.length; i++) {
      const w = fw[i], tt = lt - t0 - (mode === 'slide' ? 0 : i * stag);
      if (tt > 0 && chars[i] !== ' ') {
        const e = mode === 'slide' ? 1 : sp(tt, 'text'), a = cl(tt / .16) * (1 - out);
        g.save(); g.globalAlpha *= a; g.fillStyle = o.cols ? o.cols[i] || col : col;
        if (mode === 'rise') { g.beginPath(); g.rect(cx - 6, y - sz * 1.05, w + 12, sz * 1.3); g.clip(); g.translate(cx, y + (1 - e) * sz * 1.02 + out * sz); g.scale(sx * fl[i], 1); g.fillText(chars[i], 0, 0); }
        else if (mode === 'slide') { const gx = cx + sl; if (sl > 20) { g.globalAlpha *= .22; for (let k = 3; k >= 1; k--) { g.save(); g.translate(gx + sl * .18 * k, y); g.scale(sx * fl[i], 1); g.fillText(chars[i], 0, 0); g.restore(); } g.globalAlpha /= .22; }
          g.translate(gx, y); g.scale(sx * fl[i], 1); g.fillText(chars[i], 0, 0); }
        else { const kx = lerp(.12, 1, e) * (1 - out * .9), ky = lerp(1.32, 1, e); g.translate(cx + w / 2, y); g.scale(sx * fl[i] * kx, ky); g.fillText(chars[i], -adv[i] / 2, 0); }
        g.restore();
      }
      cx += w + tr * sz * sx;
    }
    const res = { x0, x1: x0 + twa, w: twa, size: sz, y, top: y - sz * .73, mid: y - sz * .365 };
    if (o.dot) { const tt = lt - t0 - chars.length * stag - (o.dotDelay ?? .05), e = sp(tt, 'pop'), r = sz * .095;
      res.dx = x0 + twa + r * 1.6; res.dy = y - r; if (tt > 0) { g.fillStyle = o.dot; g.beginPath(); g.arc(res.dx, res.dy, r * Math.max(0, e) * (1 - out), 0, TAU); g.fill(); } }
    return res;
  }
  function tokens(s) { return String(s).split(/\s+/).filter(Boolean).map(w => ({ w: w.replace(/^\*/, ''), key: w[0] === '*' })); }
  function serif(g, s, x, y, size, o = {}) { // курсивная антиква по словам; *слово — ключевое (цвет + подчёркивание)
    const lt = o.lt ?? 99, t0 = o.t0 ?? 0, per = o.per ?? .16, col = o.col || P.ink, acc = o.acc || P.red, max = o.max ?? 940, al = o.al || 'left', lh = o.lh ?? 1.14;
    const tk = tokens(s); let sz = size, lines;
    const lay = () => { g.font = font('serif', sz); const sw = g.measureText(' ').width; const L = []; let cur = [], w = 0;
      tk.forEach(t => { t.wd = g.measureText(t.w).width; if (cur.length && w + sw + t.wd > max) { L.push({ t: cur, w }); cur = []; w = 0; } w += (cur.length ? sw : 0) + t.wd; cur.push(t); });
      L.push({ t: cur, w }); L.sw = sw; return L; };
    lines = lay(); while (sz > 40 && (Math.max(...lines.map(l => l.w)) > max || (o.lines && lines.length > o.lines))) { sz = Math.floor(sz * .93); lines = lay(); }
    const out = o.out == null ? 0 : eo(pr(lt, o.out, o.out + .18)); let k = 0;
    lines.forEach((L, li) => { let cx = al === 'left' ? x : al === 'right' ? x - L.w : x - L.w / 2; const yy = y + li * sz * lh;
      L.t.forEach(t => { const ti = o.ts ? o.ts[Math.min(k, o.ts.length - 1)] : t0 + k * per, tt = lt - ti; k++;
        if (tt > 0) { const e = sp(tt, 'text'); g.save(); g.globalAlpha *= cl(tt / .2) * (1 - out); g.fillStyle = t.key ? acc : col;
          g.fillText(t.w, cx, yy + (1 - e) * sz * .4 + out * sz * .3);
          if (t.key && o.under !== false) g.fillRect(cx, yy + sz * .16, t.wd * eo(pr(tt, .15, .45)), Math.max(3, sz * .05));
          g.restore(); }
        cx += t.wd + lines.sw; }); });
    return { w: Math.max(...lines.map(l => l.w)), h: lines.length * sz * lh, size: sz, lines: lines.length };
  }
  function caps(g, s, x, y, size, o = {}) { // разрядка капсом (гротеск 700, трекинг 0.28 em), буквы каскадом
    const chars = [...String(s).toUpperCase()], lt = o.lt ?? 99, t0 = o.t0 ?? 0, cps = o.cps ?? 40, trk = o.track ?? .28;
    let sz = size; g.font = font(o.kind || 'bold', sz); let adv = measureChars(g, chars);
    let tw = adv.reduce((a, b) => a + b, 0) + trk * sz * (chars.length - 1); const max = o.max ?? 940;
    if (tw > max) { sz = Math.floor(sz * max / tw); g.font = font(o.kind || 'bold', sz); adv = measureChars(g, chars); tw = adv.reduce((a, b) => a + b, 0) + trk * sz * (chars.length - 1); }
    const al = o.al || 'center', x0 = al === 'left' ? x : al === 'right' ? x - tw : x - tw / 2, out = o.out == null ? 0 : eo(pr(lt, o.out, o.out + .18));
    let cx = x0; g.fillStyle = o.col || P.ink;
    chars.forEach((ch, i) => { const tt = lt - t0 - i / cps; if (tt > 0) { const e = sp(tt, 'text'); g.globalAlpha = cl(tt / .14) * (1 - out); g.fillText(ch, cx, y + (1 - e) * sz * .5); } cx += adv[i] + trk * sz; });
    g.globalAlpha = 1; return { x0, x1: x0 + tw, w: tw, size: sz };
  }
  const GLY = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ0123456789#%/+';
  function mono(g, s, x, y, size, o = {}) { // моно-подпись; type — печать по буквам, scramble — перебор знаков до фиксации
    s = String(s); const lt = o.lt ?? 99, t0 = o.t0 ?? 0, cps = o.cps ?? 28; g.font = font(o.bold ? 'monoB' : 'mono', size);
    let str = s;
    if (o.type || o.scramble) { const n = Math.floor(cl((lt - t0) * cps, 0, s.length)); if (lt <= t0) return 0;
      str = s.slice(0, n); if (o.scramble && n < s.length) { const f = Math.floor(T * 24); for (let j = n; j < Math.min(s.length, n + 4); j++) str += s[j] === ' ' ? ' ' : GLY[Math.floor(hash(j * 13 + f) * GLY.length)]; } }
    else if (o.t0 != null && lt < t0) return 0;
    const a = o.t0 == null ? 1 : cl((lt - t0) / .15) * (o.out == null ? 1 : 1 - eo(pr(lt, o.out, o.out + .15)));
    g.save(); g.globalAlpha *= a * (o.alpha ?? 1); g.fillStyle = o.col || P.ink; g.textAlign = o.al || 'left'; g.fillText(str, x, y); g.restore();
    return g.measureText(s).width;
  }
  function rule(g, x0, y, x1, p, o = {}) { // волосяная линейка с засечками и моно-метками по краям
    if (p <= 0) return; const e = eo(p), col = o.col || P.ink, lw = o.lw ?? 3;
    g.fillStyle = col; g.fillRect(x0, y - lw / 2, (x1 - x0) * e, lw);
    if (o.ticks !== false) { g.fillRect(x0, y - 10, lw, 20); if (e > .98) g.fillRect(x1 - lw, y - 10, lw, 20); }
    const ls = o.size ?? 24;
    if (o.l) mono(g, o.l, x0, y - 18, ls, { col, alpha: e }); if (o.r) mono(g, o.r, x1, y - 18, ls, { col, al: 'right', alpha: cl(e * 2 - 1) });
    if (o.bl) mono(g, o.bl, x0, y + 38, ls, { col, alpha: e }); if (o.br) mono(g, o.br, x1, y + 38, ls, { col, al: 'right', alpha: cl(e * 2 - 1) });
  }
  function marker(g, x, y, w, h, p, col) { if (p > 0) { g.fillStyle = col; g.fillRect(x, y, w * eo(p), h); } } // плашка-маркер слева направо
  function bracket(g, x, y, w, h, p, o = {}) { // уголки выделения вокруг области, сходятся к ней
    if (p <= 0) return; const e = sp(p, 'snap'), pad = lerp(60, o.pad ?? 18, cl(e)), L = o.len ?? 34, lw = o.lw ?? 5;
    g.save(); g.globalAlpha *= cl(p * 5); g.strokeStyle = o.col || P.ink; g.lineWidth = lw; g.lineCap = 'square'; g.beginPath();
    const X0 = x - pad, Y0 = y - pad, X1 = x + w + pad, Y1 = y + h + pad;
    [[X0, Y0, 1, 1], [X1, Y0, -1, 1], [X0, Y1, 1, -1], [X1, Y1, -1, -1]].forEach(([a, b, sx, sy]) => { g.moveTo(a + sx * L, b); g.lineTo(a, b); g.lineTo(a, b + sy * L); });
    g.stroke(); g.restore();
  }
  function ringText(g, s, x, y, r, size, o = {}) { // текст по кругу, вращается; «·» рисуется точкой-акцентом
    const chars = [...String(s)], n = chars.length, rot = (o.rot ?? 0) * DEG + (o.spin ?? 20) * DEG * (o.lt ?? T), vis = o.p ?? 1;
    g.save(); g.translate(x, y); g.font = font(o.kind || 'monoB', size); g.textAlign = 'center'; g.fillStyle = o.col || P.ink;
    for (let i = 0; i < n * vis; i++) { const a = rot + i / n * TAU; g.save(); g.rotate(a); g.translate(0, -r);
      if (chars[i] === '·') { g.fillStyle = o.acc || o.col || P.red; g.beginPath(); g.arc(0, -size * .34, size * .16, 0, TAU); g.fill(); g.fillStyle = o.col || P.ink; }
      else g.fillText(chars[i], 0, 0); g.restore(); }
    g.restore();
  }
  function odo(g, v, digits, x, y, size, o = {}) { // счётчик-одометр: цифры катятся барабаном; v — число (дробное = в процессе)
    const kind = o.kind || 'wide', sx = o.sx ?? (kind === 'wide' ? 1.1 : 1); g.font = font(kind, size);
    const dw = Math.max(...'0123456789'.split('').map(c => g.measureText(c).width)) * sx, lh = size * 1.0, tw = dw * digits;
    const al = o.al || 'center', x0 = al === 'left' ? x : al === 'right' ? x - tw : x - tw / 2, lt = o.lt ?? 99, t0 = o.t0;
    if (t0 != null && lt <= t0) return { x0, x1: x0 + tw, w: tw };
    g.save(); g.beginPath(); g.rect(x0 - 10, y - size * .86, tw + 20, size * 1.0); g.clip(); g.fillStyle = o.col || P.ink; g.textAlign = 'center';
    for (let k = 0; k < digits; k++) { const pw = Math.pow(10, digits - 1 - k), base = Math.floor(v / pw), rem = v - base * pw;
      const pos = (pw === 1 ? v : base + cl(rem - (pw - 1))) % 10, d0 = Math.floor(pos), f = eio(pos - d0), cx = x0 + dw * (k + .5);
      const rise = t0 == null ? 0 : (1 - sp(lt - t0 - k * .06, 'text')) * lh; // появление: цифры поднимаются из-под маски
      for (let j = 0; j < 2; j++) { g.save(); g.translate(cx, y - f * lh + j * lh + rise); g.scale(sx, 1); g.fillText(String((d0 + j) % 10), 0, 0); g.restore(); } }
    g.restore(); return { x0, x1: x0 + tw, w: tw };
  }

  // ---------- HUD ----------
  function corners(g, x0, y0, x1, y1, L = 34, col = P.ink, lw = 3) {
    g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'square'; g.beginPath();
    [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].forEach(([a, b, sx, sy]) => { g.moveTo(a + sx * L, b); g.lineTo(a, b); g.lineTo(a, b + sy * L); });
    g.stroke();
  }
  function beat(g, x, y, t, bpm = 120, col = P.ink) { // индикатор долей ■■■□, правый край в x
    const b = t * bpm / 60, n = Math.floor(b) % 4, f = b - Math.floor(b);
    for (let i = 0; i < 4; i++) { const xx = x - (4 - i) * 18; g.fillStyle = col; if (i === n) { const s = 12 + 4 * (1 - eo(f * 3)); g.fillRect(xx + 6 - s / 2, y - 6 - s / 2, s, s); } else { g.globalAlpha *= .45; g.fillRect(xx + 1, y - 11, 10, 10); g.globalAlpha /= .45; } }
  }
  function hud(g, t, o = {}) { // уголки, название, глава; по желанию: tc — таймкод, beat — доли, foot/tag — свои подписи внизу
    const f = fieldOf(o.field || 'black'), col = o.col || f.hud, a = o.alpha ?? .8;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a; corners(g, SAFE.x0, SAFE.y0, SAFE.x1, SAFE.y1, 34, col, 3);
    const y1 = SAFE.y0 + 42, y2 = SAFE.y1 - 22; g.font = font('mono', 24); g.fillStyle = col;
    if (o.title) { g.fillRect(M, y1 - 16, 14, 14); mono(g, o.title, M + 26, y1, 24, { col }); }
    const n = o.chap ?? 0, tot = o.total ?? 8, lt = t - (o.chapAt ?? -9), e = sp(lt, 'snap'), name = o.name || '';
    g.font = font('mono', 24); const nw = g.measureText(name ? '  ' + name : '').width;
    if (name) mono(g, '  ' + name, SAFE.x1 - 36, y1, 24, { col, al: 'right', type: lt < .6, lt, t0: 0, cps: 40 });
    const xn = SAFE.x1 - 36 - nw; mono(g, '/' + z2(tot), xn, y1, 24, { col, al: 'right', bold: true }); g.font = font('monoB', 24);
    const sw = g.measureText('/' + z2(tot)).width, cw = g.measureText('00').width;
    g.save(); g.beginPath(); g.rect(xn - sw - cw - 4, y1 - 26, cw + 8, 34); g.clip();
    mono(g, z2(n + 1), xn - sw, y1 + 30 * (1 - e), 24, { col, al: 'right', bold: true }); if (e < 1 && n > 0) mono(g, z2(n), xn - sw, y1 - 30 * e, 24, { col, al: 'right', bold: true, alpha: 1 - e });
    g.restore();
    const foot = [o.tc ? tc(t) : '', o.foot || ''].filter(Boolean).join('   '); if (foot) mono(g, foot, M, y2, 24, { col });
    if (o.tag) mono(g, o.tag, SAFE.x1 - 36 - (o.beat ? 4 * 18 + 14 : 0), y2, 24, { col, al: 'right' }); if (o.beat) beat(g, SAFE.x1 - 36, y2, t, o.bpm ?? 120, col);
    if (o.progress != null) { g.globalAlpha = a * .35; g.fillRect(M, y2 + 14, (SAFE.x1 - 36 - M), 2); g.globalAlpha = a; g.fillRect(M, y2 + 14, (SAFE.x1 - 36 - M) * cl(o.progress), 2); }
    g.restore();
  }

  // ---------- паттерны и фоны ----------
  function rings(g, x, y, r0, o = {}) { // концентрические волосяные кольца + расходящиеся импульсы
    const n = o.n ?? 6, gap = o.gap ?? 26, col = o.col || P.cream, lt = o.lt ?? T, per = o.period ?? 1.2;
    g.save(); g.strokeStyle = col; g.lineWidth = o.lw ?? 2;
    for (let i = 0; i < n; i++) { g.globalAlpha = (o.alpha ?? .35) * (1 - i / n); g.beginPath(); g.arc(x, y, r0 + i * gap, 0, TAU); g.stroke(); }
    if (per > 0 && lt > 0) for (let k = 0; k < 2; k++) { const q = ((lt / per) + k * .5) % 1, R = r0 + q * (o.spread ?? 360); g.globalAlpha = (o.alpha ?? .35) * (1 - q) * 1.4; g.beginPath(); g.arc(x, y, R, 0, TAU); g.stroke(); }
    g.restore();
  }
  function dotGrid(g, o = {}) { // точечная сетка; waves: [{x, y, t0}] — радиальная волна укрупняет и красит точки
    const st = o.step ?? 54, r = o.r ?? 4.2, lt = o.lt ?? 0, sp0 = o.speed ?? 760, wd = o.width ?? 150, waves = o.waves || [];
    const x0 = o.x0 ?? (W % st) / 2 + st / 2, y0 = o.y0 ?? 30, base = new Path2D(), hot = new Path2D();
    for (let y = y0; y < (o.y1 ?? H); y += st) for (let x = x0; x < W; x += st) {
      let w = 0; for (const v of waves) { const d = Math.hypot(x - v.x, y - v.y), fr = (lt - v.t0) * sp0; if (fr > 0) w += Math.exp(-Math.pow((d - fr) / wd, 2)) * Math.max(0, 1 - fr / 1600) + (v.hold && d < (v.hold * Math.min(1, (lt - v.t0) * 2)) ? .6 : 0); }
      const rr = r * (1 + 1.5 * Math.min(1.2, w)); (w > .3 ? hot : base).moveTo(x + rr, y); (w > .3 ? hot : base).arc(x, y, rr, 0, TAU);
    }
    g.save(); g.globalAlpha *= o.alpha ?? 1; g.fillStyle = o.col || P.ink; g.fill(base); g.fillStyle = o.acc || P.red; g.fill(hot); g.restore();
  }
  function truchet(g, o = {}) { // трюше: четверти колец по плиткам, плитки переворачиваются волной от центра
    const s = o.size ?? 120, lw = o.lw ?? s * .17, lt = o.lt ?? T, cx = o.x ?? W / 2, cy = o.y ?? H / 2, wv = o.wave ?? 1.1, sd = o.seed ?? 3;
    const paths = [new Path2D(), new Path2D()], cols = [o.col || P.cream, o.col2 || o.col || P.red];
    for (let r = -1; r < H / s + 1; r++) for (let c = -1; c < W / s + 1; c++) {
      const x = c * s, y = r * s, d = Math.hypot(x + s / 2 - cx, y + s / 2 - cy), base = hash(r * 31.7 + c * 7.3 + sd) > .5 ? 1 : 0;
      let flips = 0; if (o.beats) o.beats.forEach(b => { flips += sp(lt - b - d / 1400 * wv, 'snap'); });
      const ang = (base + flips) * PI / 2, P0 = paths[d < (o.split ?? 420) ? 0 : 1], mx = x + s / 2, my = y + s / 2;
      for (const [ox, oy, a0] of [[-1, -1, 0], [1, 1, PI]]) { const ca = Math.cos(ang), sa = Math.sin(ang), qx = mx + (ox * ca - oy * sa) * s / 2, qy = my + (ox * sa + oy * ca) * s / 2, st = a0 + ang;
        P0.moveTo(qx + Math.cos(st) * s / 2, qy + Math.sin(st) * s / 2); P0.arc(qx, qy, s / 2, st, st + PI / 2); }
    }
    g.save(); g.globalAlpha *= o.alpha ?? 1; g.lineWidth = lw; g.lineCap = 'round';
    paths.forEach((p, i) => { g.strokeStyle = cols[i]; g.stroke(p); }); g.restore();
  }
  function sphere() { if (SPH) return SPH; const N = 560, ga = PI * (3 - Math.sqrt(5)), a = [];
    for (let i = 0; i < N; i++) { const y = 1 - 2 * (i + .5) / N, r = Math.sqrt(1 - y * y), th = i * ga; a.push([Math.cos(th) * r, y, Math.sin(th) * r]); } return SPH = a; }
  function globe(g, x, y, R, o = {}) { // точечная сфера; lon — поворот (градусы, к зрителю), marks: [{lat, lon, col}] → экранные точки
    const pts = sphere(), a = -(o.lon ?? 0) * DEG, tilt = (o.tilt ?? -14) * DEG, ca = Math.cos(a), sa = Math.sin(a), ct = Math.cos(tilt), st = Math.sin(tilt);
    const proj = (vx, vy, vz) => { const X = vx * ca + vz * sa, Z = -vx * sa + vz * ca, Y = vy * ct - Z * st, Z2 = vy * st + Z * ct; return [x + X * R, y + Y * R, Z2]; };
    const L = [new Path2D(), new Path2D(), new Path2D()], sc = o.scale ?? 1;
    pts.forEach(([vx, vy, vz]) => { const [px, py, z] = proj(vx, vy, vz), b = z < -.2 ? 0 : z < .45 ? 1 : 2, r = (o.r ?? 4.4) * sc * (b === 0 ? .6 : b === 1 ? .85 : 1.1);
      L[b].moveTo(px + r, py); L[b].arc(px, py, r, 0, TAU); });
    g.save(); g.fillStyle = o.col || P.cream; [.18, .5, .95].forEach((al, i) => { g.globalAlpha = al * (o.alpha ?? 1); g.fill(L[i]); }); g.restore();
    return (o.marks || []).map(m => { const la = m.lat * DEG, lo = m.lon * DEG, p = proj(Math.cos(la) * Math.sin(lo), -Math.sin(la), Math.cos(la) * Math.cos(lo)); return { x: p[0], y: p[1], z: p[2], front: p[2] > 0 }; });
  }
  function dotPlane(g, o = {}) { // перспективная точечная плоскость с волной (фон тёмных сцен)
    const lt = o.lt ?? T, hy = o.horizon ?? 760, n = o.cols ?? 26, rows = o.rows ?? 16, base = new Path2D(), hot = new Path2D();
    for (let r = 1; r <= rows; r++) { const z = r / rows, yy = hy + Math.pow(z, 1.7) * (H - hy + 200), sp2 = lerp(18, 110, Math.pow(z, 1.7));
      for (let c = -n; c <= n; c++) { const xx = W / 2 + c * sp2, h = Math.sin(c * .5 + lt * 2.4 + r * .45) * 14 * z, rr = lerp(1.2, 5, z);
        const tgt = Math.sin(c * .5 + lt * 2.4 + r * .45) > .8 ? hot : base; tgt.moveTo(xx + rr, yy - h); tgt.arc(xx, yy - h, rr, 0, TAU); } }
    g.save(); g.globalAlpha *= o.alpha ?? .7; g.fillStyle = o.col || P.cream; g.fill(base); g.fillStyle = o.acc || P.red; g.fill(hot); g.restore();
  }

  // ---------- фигуры, морфинг ----------
  function polyR(vs, th) { // расстояние до контура многоугольника (вершины в полярных) по лучу th
    const u = [Math.cos(th), Math.sin(th)];
    for (let i = 0; i < vs.length; i++) { const A = vs[i], B = vs[(i + 1) % vs.length], ax = Math.cos(A[1]) * A[0], ay = Math.sin(A[1]) * A[0], bx = Math.cos(B[1]) * B[0], by = Math.sin(B[1]) * B[0];
      const dx = bx - ax, dy = by - ay, den = u[0] * dy - u[1] * dx; if (Math.abs(den) < 1e-9) continue;
      const tt = (ax * dy - ay * dx) / den, s = (ax * u[1] - ay * u[0]) / den; if (tt > 0 && s >= -1e-6 && s <= 1 + 1e-6) return tt; }
    return 1;
  }
  const regular = (n, inner) => { const v = []; for (let i = 0; i < n * (inner ? 2 : 1); i++) v.push([inner && i % 2 ? inner : 1, -PI / 2 + i * TAU / (n * (inner ? 2 : 1))]); return v; };
  const SHAPES = { circle: () => 1, bean: th => .74 / Math.sqrt(Math.pow(Math.cos(th), 2) + Math.pow(.74 * Math.sin(th), 2)),
    star: (th, V = regular(5, .46)) => polyR(V, th), tri: (th, V = regular(3)) => polyR(V, th) * 1.08, square: (th, V = regular(4)) => polyR(V, th + PI / 4) * 1.05,
    hex: (th, V = regular(6)) => polyR(V, th) };
  function morph(g, x, y, r, a, b, p, o = {}) { // плавный переход фигуры a → b (circle|bean|star|tri|square|hex)
    const fa = SHAPES[a] || SHAPES.circle, fb = SHAPES[b] || SHAPES.circle, n = o.n ?? 90, rot = (o.rot ?? 0) * DEG;
    g.save(); g.translate(x, y); g.rotate(rot); g.beginPath();
    for (let i = 0; i <= n; i++) { const th = i / n * TAU, rr = r * lerp(fa(th), fb(th), p); i ? g.lineTo(Math.cos(th) * rr, Math.sin(th) * rr) : g.moveTo(Math.cos(th) * rr, Math.sin(th) * rr); }
    g.closePath(); if (o.fill !== null) { g.fillStyle = o.fill || P.cream; g.fill(); } if (o.line) { g.strokeStyle = o.line; g.lineWidth = o.lw ?? 3; g.stroke(); } g.restore();
  }
  function star(g, x, y, r, o = {}) { morph(g, x, y, r, 'star', 'star', 0, o); }
  function trail(g, n, dx, dy, fn, a = .5) { // смаз движения: n призраков позади объекта (dx, dy — смещение между ними)
    for (let k = n; k >= 1; k--) { g.save(); g.globalAlpha *= a * (1 - k / (n + 1)) * .6; g.translate(dx * k, dy * k); fn(g, k); g.restore(); }
    fn(g, 0);
  }

  // ---------- герой: кофейное зерно ----------
  function bean(g, x, y, r, o = {}) { // r — половина высоты; roast 0…1 (сырое → чёрное) или col; flip −1…1 — поворот вокруг оси
    const rx = r * .74, ry = r, flip = o.flip ?? 1, col = o.col || roast(o.roast ?? .65), gc = o.groove === undefined ? P.black : o.groove;
    g.save(); g.translate(x, y); g.rotate((o.rot ?? -16) * DEG); g.scale((o.sx ?? 1) * (Math.abs(flip) < .04 ? .04 : flip), o.sy ?? 1);
    g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
    if (o.line) { g.strokeStyle = o.line; g.lineWidth = o.lw ?? 4; g.stroke(); }
    if (gc && flip > 0) { g.strokeStyle = gc; g.lineWidth = r * .12; g.lineCap = 'round'; g.beginPath(); g.moveTo(rx * .05, -ry * .8);
      g.bezierCurveTo(rx * .62, -ry * .32, -rx * .62, ry * .32, -rx * .05, ry * .8); g.stroke(); }
    g.restore();
  }
  function beanPop(g, lt, t0, x, y, r, o = {}) { const e = sp(lt - t0, 'pop'); if (lt <= t0) return 0; bean(g, x, y, r * Math.max(0, e), o); return e; }

  // ---------- предметы ----------
  function orbit(g, x, y, R, n, o, fn) { // кольцо из n предметов; появляются по одному с t0 через stag; fn(g, px, py, i, e)
    const lt = o.lt ?? 99, t0 = o.t0 ?? 0, stag = o.stag ?? .06, rot = (o.rot ?? -90) * DEG + (o.spin ?? 0) * DEG * lt;
    for (let i = 0; i < n; i++) { const tt = lt - t0 - i * stag; if (tt <= 0) continue; const a = rot + i / n * TAU, e = sp(tt, o.spring || 'pop'), rr = R * lerp(.6, 1, cl(e));
      fn(g, x + Math.cos(a) * rr, y + Math.sin(a) * rr, i, e, a); }
  }
  function transformBox(g, x, y, w, h, o = {}) { // рамка трансформации с ручками и моно-подписью (ROT, SHAPE)
    const a = o.a ?? 1; if (a <= 0) return; const col = o.col || P.cream;
    g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate((o.rot ?? 0) * DEG); g.strokeStyle = col; g.lineWidth = o.lw ?? 2.5; g.strokeRect(-w / 2, -h / 2, w, h);
    g.fillStyle = o.fill || 'rgba(0,0,0,0)';
    [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]].forEach(([i, j]) => { g.beginPath(); g.arc(i * w / 2, j * h / 2, 8, 0, TAU); g.fillStyle = o.knob || col; g.fill(); });
    g.beginPath(); g.moveTo(-10, 0); g.lineTo(10, 0); g.moveTo(0, -10); g.lineTo(0, 10); g.stroke();
    if (o.label) { const L = String(o.label).split('\n'); L.forEach((s, i) => mono(g, s, w / 2 + 22, -h / 2 + 8 + i * 30, 24, { col, bold: i === 0 })); }
    g.restore();
  }
  function annot(g, x, y, tx, ty, lines, o = {}) { // выноска: точка, ломаная линия, моно-строки
    const p = o.p ?? 1; if (p <= 0) return; const col = o.col || P.ink, e = eo(p), mx = lerp(x, tx, e), my = lerp(y, ty, e);
    g.save(); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(x, y); g.lineTo(mx, my); g.stroke();
    if (e > .95) { const al = tx < x ? 'right' : 'left'; String(lines).split('\n').forEach((s, i) => mono(g, s, tx + (al === 'left' ? 10 : -10), ty + (i + .5) * (o.size ?? 26) * 1.25 - 4, o.size ?? 26, { col, al, bold: i === 0, type: true, lt: p * (o.dur ?? 1), t0: .3 })); }
    g.restore();
  }
  function curveIcon(g, x, y, s, fn, col = P.ink) { g.save(); g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); for (let i = 0; i <= 20; i++) { const u = i / 20; i ? g.lineTo(x + u * s, y - fn(u) * s) : g.moveTo(x, y); } g.stroke(); g.restore(); }
  function easeRow(g, x, y, w, label, p, o = {}) { // строка «из A в B»: подпись, иконка кривой, линия, предмет едет со смазом
    const col = o.col || P.ink, fn = o.ease || eo, tx = x + (o.lw ?? 330), tw = x + w - tx, q = fn(cl(p)), prev = fn(cl(p - .045));
    mono(g, label, x, y + 12, o.size ?? 40, { col, bold: true }); curveIcon(g, tx - 96, y + 26, 54, fn, col);
    g.save(); g.globalAlpha *= .35; g.fillStyle = col; g.fillRect(tx, y - 1, tw, 2); g.restore(); g.fillStyle = col; g.fillRect(tx, y - 12, 3, 24); g.fillRect(tx + tw - 3, y - 12, 3, 24);
    const px = tx + 40 + (tw - 80) * q, v = (q - prev) * (tw - 80);
    if (o.item) trail(g, Math.abs(v) > 3 ? 4 : 0, -v * .55, 0, gg => o.item(gg, px, y, q)); else { g.fillStyle = o.dot || P.red; g.beginPath(); g.arc(px, y, 22, 0, TAU); g.fill(); }
    if (o.end && p >= 1) mono(g, o.end, x + w, y + 84, o.size ?? 40, { col, al: 'right', bold: true, t0: o.endT ?? 0, lt: o.lt ?? 99 });
  }
  function ruler(g, x, y, w, o = {}) { // шкала 0…n с засечками; диапазон [a, b] заливается до доли p
    const n = o.n ?? 24, col = o.col || P.ink, p = o.p ?? 1, a = o.a ?? 0, b = o.b ?? n, h = o.h ?? 44, d = eo(o.d ?? 1); // d — прорисовка шкалы 0…1
    g.save(); g.fillStyle = col; g.globalAlpha *= .5; g.fillRect(x, y, w * d, 2);
    for (let i = 0; i <= n && i / n <= d; i++) { const xx = x + w * i / n, big = i % (o.every ?? 6) === 0; g.fillRect(xx - 1, y - (big ? 22 : 10), 2, big ? 22 : 10); }
    g.globalAlpha /= .5; for (let i = 0; i <= n && i / n <= d; i += (o.every ?? 6)) mono(g, z2(i), x + w * i / n, y + 46, 26, { col, al: 'center' });
    const xa = x + w * a / n, xb = x + w * b / n; g.fillStyle = o.fill || P.red; g.fillRect(xa, y - h - 30, (xb - xa) * eo(p), h); g.restore();
    return { xa, xb };
  }
  function specks(g, x, y, lt, o = {}) { // конфетти из точки события (только на смысловой удар)
    if (lt <= 0 || lt > 1.6) return; const n = o.n ?? 26, cols = o.cols || [P.red, P.cream, P.yellow, P.ink], sd = o.seed ?? 1;
    for (let i = 0; i < n; i++) { const a = hash(i * 3.1 + sd) * TAU, v = 380 + hash(i * 7.3 + sd) * 760, d = v * (1 - Math.exp(-3 * lt)) / 3;
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d + 420 * lt * lt, al = 1 - pr(lt, .7, 1.5), s = 8 + hash(i * 1.9 + sd) * 12;
      g.save(); g.globalAlpha *= al; g.translate(px, py); g.rotate(lt * 9 * (hash(i + sd) - .5)); g.fillStyle = cols[i % cols.length];
      if (i % 3 === 0) { g.beginPath(); g.arc(0, 0, s / 2, 0, TAU); g.fill(); } else if (i % 3 === 1) g.fillRect(-s / 2, -s / 2, s, s); else g.fillRect(-s, -2.5, s * 2, 5);
      g.restore(); }
  }
  function cup(g, x, y, s, o = {}) { // чашка сбоку (x, y — центр дна), s=1 ≈ 300×260
    const col = o.col || P.cream, ink = o.ink || P.ink, lt = o.lt ?? T;
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = o.saucer || col; g.fillRect(-210, -10, 420, 22); g.fillRect(-120, 12, 240, 14);
    g.strokeStyle = col; g.lineWidth = 30; g.beginPath(); g.arc(150, -150, 52, -PI * .55, PI * .55); g.stroke();
    g.fillStyle = col; g.beginPath(); g.moveTo(-150, -260); g.lineTo(150, -260); g.lineTo(130, -60); g.quadraticCurveTo(120, -14, 70, -14); g.lineTo(-70, -14); g.quadraticCurveTo(-120, -14, -130, -60); g.closePath(); g.fill();
    if (o.band) { g.fillStyle = o.band; g.fillRect(-146, -200, 292, 56); }
    g.fillStyle = o.coffee || ink; g.beginPath(); g.ellipse(0, -260, 150, 22, 0, 0, TAU); g.fill();
    if (o.steam !== false) { g.strokeStyle = o.steamCol || col; g.lineWidth = 9; g.lineCap = 'round';
      for (let k = -1; k <= 1; k++) { const ph = (lt * .8 + k * .33 + 3) % 1; g.globalAlpha = Math.sin(ph * PI) * .9; g.beginPath();
        for (let j = 0; j <= 10; j++) { const u = j / 10, yy = -300 - u * 150 - ph * 60, xx = k * 60 + Math.sin(u * 5 + lt * 4 + k) * 14; j ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); }
      g.globalAlpha = 1; }
    g.restore();
  }
  function cupTop(g, x, y, r, o = {}) { // чашка сверху: блюдце, чашка, кофе, пенка, сердце латте (art 0…1 прорисовка)
    const rot = (o.rot ?? 0) * DEG, col = o.col || P.cream, ink = o.ink || P.ink;
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = o.saucer || mix(col, ink, .08); g.beginPath(); g.arc(0, 0, r * 1.45, 0, TAU); g.fill();
    g.strokeStyle = ink; g.lineWidth = 2; g.globalAlpha = .35; g.beginPath(); g.arc(0, 0, r * 1.2, 0, TAU); g.stroke(); g.globalAlpha = 1;
    g.fillStyle = col; g.fillRect(r * .9, -r * .17, r * .62, r * .34); g.beginPath(); g.arc(r * 1.52, 0, r * .17, -PI / 2, PI / 2); g.fill();
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.strokeStyle = ink; g.lineWidth = 3; g.stroke();
    g.fillStyle = o.coffee || '#5A2A12'; g.beginPath(); g.arc(0, 0, r * .84, 0, TAU); g.fill();
    g.strokeStyle = o.crema || P.yellow; g.lineWidth = r * .05; g.beginPath(); g.arc(0, 0, r * .78, 0, TAU); g.stroke();
    const p = o.art ?? 1; if (p > 0) { g.fillStyle = o.milk || P.cream; const s = r * .5 * eb(cl(p * 1.4), 1.2); // сердце латте
      g.beginPath(); g.moveTo(0, s * .95); g.bezierCurveTo(-s * 1.25, s * .1, -s * .95, -s * .95, 0, -s * .38); g.bezierCurveTo(s * .95, -s * .95, s * 1.25, s * .1, 0, s * .95); g.fill();
      g.strokeStyle = o.coffee || '#5A2A12'; g.lineWidth = r * .035; g.beginPath(); g.moveTo(0, -s * .5); g.lineTo(0, s * .8 * cl(p * 2 - .6)); g.stroke(); }
    g.restore();
  }
  function croissant(g, x, y, s, o = {}) { // круассан-полумесяц из 7 долек (x, y — центр), дольки выпрыгивают от середины к концам
    const n = 7, lt = o.lt ?? 99, t0 = o.t0 ?? 0, stag = o.stag ?? .05, cols = o.cols || [P.cream, '#F08A2E'], ink = o.ink || P.ink, R = 270;
    const pt = (u, k) => { const a = lerp(-PI * .97, -PI * .03, u), th = 26 + 150 * Math.pow(Math.sin(u * PI), .75), r = R - th * k; return [Math.cos(a) * r, Math.sin(a) * r * .74 + 120]; };
    g.save(); g.translate(x, y); g.rotate((o.rot ?? 0) * DEG); g.scale(s, s); g.lineJoin = 'round';
    [3, 2, 4, 1, 5, 0, 6].forEach((i, j) => { const tt = lt - t0 - j * stag; if (tt <= 0) return; const e = Math.max(0, sp(tt, 'pop')), u0 = i / n, u1 = (i + 1) / n;
      const P0 = []; for (let q = 0; q <= 6; q++) P0.push(pt(lerp(u0, u1, q / 6), 0)); for (let q = 6; q >= 0; q--) P0.push(pt(lerp(u0, u1, q / 6), 1));
      const c = pt((u0 + u1) / 2, .5); g.save(); g.translate(c[0], c[1]); g.scale(e, e); g.translate(-c[0], -c[1]);
      g.beginPath(); P0.forEach(([px, py], q) => q ? g.lineTo(px, py) : g.moveTo(px, py)); g.closePath();
      g.fillStyle = cols[i % 2]; g.fill(); g.strokeStyle = ink; g.lineWidth = 8; g.stroke(); g.restore(); });
    g.restore();
  }
  function steam(g, x, y, h, lt, o = {}) { g.save(); g.strokeStyle = o.col || P.ink; g.lineWidth = o.lw ?? 8; g.lineCap = 'round';
    for (let k = 0; k < (o.n ?? 3); k++) { const ph = (lt * .7 + k / 3) % 1; g.globalAlpha = Math.sin(ph * PI); g.beginPath();
      for (let j = 0; j <= 10; j++) { const u = j / 10, yy = y - u * h - ph * 50, xx = x + (k - 1) * 46 + Math.sin(u * 5 + lt * 4 + k) * 12; j ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); }
    g.restore(); }
  function clock(g, x, y, r, hh, mm, o = {}) { // циферблат: штрихи часов, стрелки, красная секундная с диском
    const col = o.col || P.ink, acc = o.acc || P.red;
    g.save(); g.translate(x, y); if (o.face) { g.fillStyle = o.face; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); }
    g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); g.fillStyle = col;
    for (let i = 0; i < 60; i++) { const big = i % 5 === 0; g.save(); g.rotate(i / 60 * TAU); g.fillRect(-(big ? 7 : 2), -r * .94, big ? 14 : 4, big ? r * .2 : r * .06); g.restore(); }
    const hand = (ang, len, w, c) => { g.save(); g.rotate(ang); g.fillStyle = c; g.fillRect(-w / 2, -len, w, len * 1.22); g.restore(); };
    hand(((hh % 12) + mm / 60) / 12 * TAU, r * .55, r * .075, col); hand(mm / 60 * TAU, r * .82, r * .055, col);
    if (o.sec != null) { g.save(); g.rotate(o.sec / 60 * TAU); g.fillStyle = acc; g.fillRect(-3, -r * .62, 6, r * .9); g.beginPath(); g.arc(0, -r * .62, r * .08, 0, TAU); g.fill(); g.restore(); }
    g.restore();
  }
  function gift(g, x, y, w, h, o = {}) { // коробка с лентой и бантом (x, y — центр дна); p — сборка 0…1
    const p = o.p ?? 1, col = o.col || P.red, rib = o.rib || P.yellow, e = sp(p * 1.2, 'pop');
    g.save(); g.translate(x, y); g.fillStyle = col; g.fillRect(-w / 2, -h, w, h); const lid = 1 - cl(e);
    g.fillRect(-w * .54, -h - 50 - lid * 120, w * 1.08, 50); g.fillStyle = rib; g.fillRect(-w * .07, -h, w * .14, h); g.fillRect(-w * .07, -h - 50 - lid * 120, w * .14, 50);
    if (p > .3) { const b = sp((p - .3) * 1.5, 'pop'); g.save(); g.translate(0, -h - 50 - lid * 120); g.scale(b, b); g.strokeStyle = rib; g.lineWidth = 18;
      g.beginPath(); g.ellipse(-46, -30, 46, 28, -.5, 0, TAU); g.stroke(); g.beginPath(); g.ellipse(46, -30, 46, 28, .5, 0, TAU); g.stroke(); g.restore(); }
    g.restore();
  }
  function plate(g, x, y, s, size, o = {}) { // табличка дома: прямоугольник с широким номером
    g.font = font('wide', size); const tw = g.measureText(s).width * 1.1, w = tw + size * .7, h = size * 1.05, e = o.e ?? 1;
    g.save(); g.translate(x, y); g.scale(e, e); g.fillStyle = o.bg || P.red; g.fillRect(-w / 2, -h / 2, w, h); g.strokeStyle = o.col || P.cream; g.lineWidth = 5; g.strokeRect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24);
    g.fillStyle = o.col || P.cream; g.scale(1.1, 1); g.textAlign = 'center'; g.fillText(s, 0, size * .36); g.restore(); return { w, h };
  }
  function pin(g, x, y, r, o = {}) { // булавка карты, острие в (x, y)
    g.save(); g.translate(x, y); g.fillStyle = o.col || P.red; g.beginPath(); g.moveTo(0, 0); g.lineTo(-r * .62, -r * 1.35); g.arc(0, -r * 1.75, r, PI * .78, PI * .22); g.closePath(); g.fill();
    if (o.inner !== false) { g.fillStyle = o.inner || P.cream; g.beginPath(); g.arc(0, -r * 1.75, r * .42, 0, TAU); g.fill(); } g.restore();
  }
  function tube(g, pts, p, o = {}) { // полосатая трубка вдоль ломаной (контур + полосы), прорисовка до доли p
    if (p <= 0) return; const L = [0]; for (let i = 2; i < pts.length; i += 2) L.push(L[L.length - 1] + Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]));
    const tot = L[L.length - 1] * cl(p), path = new Path2D(); path.moveTo(pts[0], pts[1]);
    for (let i = 1; i < L.length; i++) { if (L[i] <= tot) path.lineTo(pts[2 * i], pts[2 * i + 1]); else { const f = (tot - L[i - 1]) / (L[i] - L[i - 1]); path.lineTo(lerp(pts[2 * i - 2], pts[2 * i], f), lerp(pts[2 * i - 1], pts[2 * i + 1], f)); break; } }
    const w = o.w ?? 40, cols = o.cols || [P.ink, P.red, P.cream, P.blue]; g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    cols.forEach((c, i) => { g.strokeStyle = c; g.lineWidth = w * (1 - i / cols.length); g.stroke(path); }); g.restore();
  }
  function mapGrid(g, x0, y0, x1, y1, o = {}) { // городская сетка: кварталы-улицы, прорисовка p
    const p = o.p ?? 1, col = o.col || P.ink, st = o.step ?? 170, lw = o.lw ?? 14; g.save(); g.fillStyle = col; g.globalAlpha *= o.alpha ?? 1;
    let k = 0; for (let x = x0; x <= x1; x += st) { const q = eo(pr(p, k * .05, k * .05 + .5)); g.fillRect(x - lw / 2, y0, lw, (y1 - y0) * q); k++; }
    k = 0; for (let y = y0; y <= y1; y += st) { const q = eo(pr(p, .1 + k * .05, .1 + k * .05 + .5)); g.fillRect(x0, y - lw / 2, (x1 - x0) * q, lw); k++; }
    g.restore();
  }
  // ---------- типовые объекты: плоские фигуры палитры, без обводок; цвет любой детали — параметр (имя P или '#hex') ----------
  function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  const disc = (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, Math.max(0, r), 0, TAU); g.fill(); };
  function pop(g, lt, t0, x, y, fn, name = 'pop') { // появление пружиной из точки (x, y): fn(g, e)
    if (lt <= t0) return 0; const e = Math.max(0, sp(lt - t0, name)); g.save(); g.translate(x, y); g.scale(e, e); g.translate(-x, -y); fn(g, e); g.restore(); return e; }
  // ЧЕЛОВЕК. x, y — точка между ступнями; s=1: взрослый ≈ 290 px. pose: stand wave hold cheer dance walk run sit read ride
  const SKIN = ['#F3C9A8', '#E2A47C', '#B9744E', '#7B4A2E'];
  const BODY = { adult: { leg: 124, torso: 104, head: 27, sh: 30, hip: 22, lw: 21, aw: 17 },
    kid: { leg: 76, torso: 64, head: 25, sh: 20, hip: 15, lw: 16, aw: 13 },
    old: { leg: 114, torso: 98, head: 26, sh: 30, hip: 24, lw: 20, aw: 16, stoop: 9 } };
  const ang = (x, y, a, l) => [x + Math.sin(a * DEG) * l, y + Math.cos(a * DEG) * l]; // 0° вниз, + к лицу
  function ik(ax, ay, bx, by, l1, l2, f = 1) { const dx = bx - ax, dy = by - ay, d = cl(Math.hypot(dx, dy), 1, l1 + l2 - .01), a0 = Math.atan2(dy, dx);
    const c = cl((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1), a = a0 - f * Math.acos(c); return [ax + Math.cos(a) * l1, ay + Math.sin(a) * l1]; }
  function stroke2(g, pts, w, c) { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); }
  function heldItem(g, kind, x, y, o) { const c = C(o.itemCol);
    if (typeof kind === 'function') return kind(g, x, y);
    if (kind === 'book') { g.fillStyle = c || P.cream; g.fillRect(x - 34, y - 26, 32, 40); g.fillRect(x + 2, y - 26, 32, 40); g.fillStyle = C(o.itemCol2) || P.red; g.fillRect(x - 36, y + 12, 72, 6); }
    else if (kind === 'bag') { g.fillStyle = c || P.yellow; g.fillRect(x - 22, y + 8, 44, 40); g.strokeStyle = c || P.yellow; g.lineWidth = 5; g.beginPath(); g.arc(x, y + 8, 14, PI, 0); g.stroke(); }
    else if (kind === 'box') { g.fillStyle = c || P.yellow; g.fillRect(x - 32, y - 30, 64, 52); g.fillStyle = rgba(P.ink, .25); g.fillRect(x - 32, y - 10, 64, 6); }
    else if (kind === 'flower') { stroke2(g, [[x, y + 10], [x + 6, y - 40]], 4, P.green); [0, 72, 144, 216, 288].forEach(a => disc(g, x + 6 + Math.cos(a * DEG) * 11, y - 46 + Math.sin(a * DEG) * 11, 9, c || P.pink)); disc(g, x + 6, y - 46, 7, P.yellow); }
    else if (kind === 'sign') { g.fillStyle = c || P.cream; g.fillRect(x - 70, y - 60, 140, 60); if (o.text) mono(g, o.text, x, y - 22, 24, { col: P.ink, al: 'center', bold: true }); }
    else if (kind === 'ball') disc(g, x, y - 18, 24, c || P.red);
  }
  function person(g, x, y, s = 1, o = {}) {
    const age = o.age || 'adult', B = BODY[age] || BODY.adult, pose = o.pose || 'stand', ph = (o.ph ?? T) * (o.speed ?? 1), dir = o.dir ?? 1;
    const skin = C(o.skin) || SKIN[0], top = C(o.top) || P.red, legC = C(o.legs) || P.ink, hair = C(o.hair) || (age === 'old' ? '#D9D4CC' : P.ink), shoe = C(o.shoe) || P.ink;
    const side = /walk|run|sit|read|ride/.test(pose), shade = c => mix(c, P.ink, .28);
    const w = Math.sin(ph * TAU * (pose === 'run' ? 1.5 : pose === 'dance' ? 1 : .9)), u = Math.cos(ph * TAU * (pose === 'run' ? 1.5 : .9));
    let lean = B.stoop || 0, bob = 0, hipY = -B.leg, L = [[-4, 0], [4, 0]], A = [[-12, 8], [12, -8]], hx = [-B.hip * .55, B.hip * .55], sx = [-B.sh, B.sh];
    const th = B.leg * .5, ar = B.torso * .47; let item = o.item, IK = null;
    if (side) { hx = [0, 0]; sx = [0, 0]; }
    if (pose === 'wave') A[1] = [150, 20 + 28 * Math.sin(ph * TAU * 2.2)];
    else if (pose === 'hold') A = [[-18, 112], [18, -112]];
    else if (pose === 'cheer') A = [[-158 + 8 * w, -10], [158 - 8 * w, 10]];
    else if (pose === 'dance') { A = [[-140 + 30 * w, -40], [140 + 30 * w, 40]]; L = [[-10 + 8 * w, 12 * Math.max(0, w)], [10 + 8 * w, -12 * Math.max(0, -w)]]; lean = 9 * w; bob = -Math.abs(w) * 14; }
    else if (pose === 'walk') { L = [[24 * w, -40 * Math.max(0, -u)], [-24 * w, -40 * Math.max(0, u)]]; A = [[-22 * w, 18], [22 * w, 18]]; bob = -Math.abs(u) * 5; }
    else if (pose === 'run') { L = [[42 * w, -80 * Math.max(0, -u) - 15], [-42 * w, -80 * Math.max(0, u) - 15]]; A = [[-48 * w, 90], [48 * w, 90]]; lean = 13; bob = -Math.abs(u) * 12; }
    else if (pose === 'sit' || pose === 'read') { hipY = -th - 6; L = [[86, -86], [92, -92]]; A = pose === 'read' ? [[30, 100], [38, 92]] : [[28, 40], [34, 36]]; if (pose === 'read' && !item) item = 'book'; }
    else if (pose === 'ride') IK = o.ride || {}; // {hip:[x,y], feet:[[x,y],[x,y]], hand:[x,y]} в своих координатах
    g.save(); g.translate(x, y); g.scale(s * dir, s); if (o.e != null) g.scale(o.e, o.e);
    const hip = IK && IK.hip ? IK.hip : [0, hipY + bob], tilt = lean * DEG;
    const legPts = i => { const H = [hip[0] + hx[i], hip[1]]; if (IK && IK.feet) { const F = IK.feet[i]; return [H, ik(H[0], H[1], F[0], F[1], th, th, -1), F]; }
      const K = ang(H[0], H[1], L[i][0], th); return [H, K, ang(K[0], K[1], L[i][0] + L[i][1], th)]; };
    const shoulder = i => { const sxx = sx[i], sy = -B.torso + 10; return [hip[0] + sxx * Math.cos(tilt) - sy * Math.sin(tilt), hip[1] + sxx * Math.sin(tilt) + sy * Math.cos(tilt)]; };
    const armPts = i => { const S0 = shoulder(i); if (IK && IK.hand) { const Hn = IK.hand; return [S0, ik(S0[0], S0[1], Hn[0], Hn[1], ar, ar, 1), Hn]; }
      const E = ang(S0[0], S0[1], A[i][0] + lean, ar); return [S0, E, ang(E[0], E[1], A[i][0] + A[i][1] + lean, ar)]; };
    const leg = i => { const p = legPts(i), c = side && i === 0 ? shade(legC) : legC; stroke2(g, p, B.lw, c);
      g.fillStyle = shoe; g.beginPath(); g.ellipse(p[2][0] + (side ? 7 : (i ? 4 : -4)), p[2][1] + 2, B.lw * .62, B.lw * .36, 0, 0, TAU); g.fill(); };
    const arm = i => { const p = armPts(i); stroke2(g, [p[0], p[1], p[2]], B.aw, side && i === 0 ? shade(top) : top); disc(g, p[2][0], p[2][1], B.aw * .55, skin); return p[2]; };
    if (side) { arm(0); leg(0); } else { leg(0); leg(1); }
    if (side) leg(1);
    if (o.cane) { const hx0 = hip[0] + 34, hy0 = hip[1] + 6; stroke2(g, [[hx0, hy0], [hx0 + 6, 0]], 7, C(o.caneCol) || P.brown); }
    g.save(); g.translate(hip[0], hip[1]); g.rotate(tilt);
    const tw = side ? B.sh * 1.35 : B.sh * 2 + 6, tt = -B.torso;
    if (o.pack) { g.fillStyle = C(o.pack); if (side) { rr(g, -tw / 2 - B.sh * .7, tt + 14, B.sh * .9, B.torso * .62, 8); g.fill(); } }
    g.fillStyle = top; rr(g, -tw / 2, tt, tw, B.torso + 8, side ? 14 : 18); g.fill();
    if (o.skirt) { g.fillStyle = o.skirt === true ? top : C(o.skirt); g.beginPath(); g.moveTo(-tw / 2, -6); g.lineTo(tw / 2, -6); g.lineTo(tw / 2 + 16, th * 1.05); g.lineTo(-tw / 2 - 16, th * 1.05); g.closePath(); g.fill(); }
    if (o.pack && !side) { g.fillStyle = C(o.pack); g.fillRect(-tw / 2 + 8, tt + 4, 9, B.torso * .7); g.fillRect(tw / 2 - 17, tt + 4, 9, B.torso * .7); }
    if (o.apron) { g.fillStyle = C(o.apron); g.fillRect(-tw / 2 + 8, tt + 34, tw - 16, B.torso - 20); }
    const hy = tt - B.head - 4, hs = o.hairStyle || (age === 'old' ? 'bun' : 'short');
    if (hs === 'long') { g.fillStyle = hair; g.fillRect(side ? -B.head * 1.06 : -B.head * 1.1, hy - 2, side ? B.head * 1.1 : B.head * 2.2, B.head * 1.7); }
    disc(g, 0, hy, B.head, skin);
    if (o.hat === 'helmet') { g.fillStyle = C(o.hatCol) || P.yellow; g.beginPath(); g.arc(0, hy - 4, B.head * 1.12, PI, 0); g.fill(); g.fillRect(-B.head * 1.35, hy - 6, B.head * 2.7, 7); }
    else if (o.hat === 'cap') { g.fillStyle = C(o.hatCol) || P.blue; g.beginPath(); g.arc(0, hy - 2, B.head * 1.04, PI, 0); g.fill(); g.fillRect(0, hy - 6, B.head * 1.6, 7); }
    else if (hs !== 'none') { g.fillStyle = hair; g.beginPath(); g.arc(0, hy, B.head * 1.06, PI * (side ? .92 : .98), PI * 2.02); g.fill();
      if (hs === 'bun') disc(g, side ? -B.head * .7 : 0, hy - B.head * 1.05, B.head * .48, hair);
      if (side) g.fillRect(-B.head * 1.06, hy - 2, B.head * .7, B.head * .9); }
    if (o.face !== false && !side) { disc(g, -B.head * .36, hy + 3, B.head * .1, P.ink); disc(g, B.head * .36, hy + 3, B.head * .1, P.ink); }
    if (o.glasses) { g.strokeStyle = P.ink; g.lineWidth = 3; g.beginPath(); g.arc(-B.head * .36, hy + 3, B.head * .26, 0, TAU); g.moveTo(B.head * .62, hy + 3); g.arc(B.head * .36, hy + 3, B.head * .26, 0, TAU); g.stroke(); }
    if (o.mouth && !side) { g.fillStyle = P.ink; g.beginPath(); g.ellipse(0, hy + B.head * .5, B.head * .2, B.head * .22 * o.mouth, 0, 0, TAU); g.fill(); }
    g.restore();
    let hand;
    if (side) { hand = arm(1); } else { arm(0); hand = arm(1); }
    if (item) { const a = armPts(0)[2], b = armPts(1)[2], two = pose === 'hold' || pose === 'read'; heldItem(g, item, two ? (a[0] + b[0]) / 2 : hand[0], two ? (a[1] + b[1]) / 2 : hand[1], o); }
    g.restore();
    return { x, y, top: y - (B.leg + B.torso + B.head * 2 + 6) * s, hand: [x + hand[0] * s * dir, y + hand[1] * s] };
  }
  const CLOTH = ['red', 'blue', 'yellow', 'cream', 'orange', 'green', 'pink', 'ink'];
  function crowd(g, x0, x1, y, n, s = 1, o = {}) { // n человек в ряд без наложений; o: pose|poses[], ages[], tops[], bg (этот цвет одежде не даётся), lt, t0, stag
    const out = [], bg = C(o.bg), tops = (o.tops || CLOTH).map(C).filter(c => c !== bg), lt = o.lt ?? 99, t0 = o.t0 ?? 0, stag = o.stag ?? .07;
    for (let i = 0; i < n; i++) { const px = n === 1 ? (x0 + x1) / 2 : lerp(x0, x1, i / (n - 1)), tt = lt - t0 - i * stag; if (tt <= 0) continue;
      const e = Math.max(0, sp(tt, 'pop')), age = o.ages ? o.ages[i % o.ages.length] : 'adult', sc = s * (o.scales ? o.scales[i % o.scales.length] : 1);
      const op = Object.assign({ age, pose: o.poses ? o.poses[i % o.poses.length] : o.pose || 'stand', top: tops[(i * 3 + (o.seed || 0)) % tops.length],
        legs: o.legs || (i % 2 ? P.ink : P.blueD), skin: SKIN[(i + (o.seed || 0)) % 3], hair: i % 3 === 1 ? P.brown : i % 4 === 2 ? P.yellowD : P.ink,
        hairStyle: i % 2 ? 'long' : 'short', ph: (o.ph ?? lt) + i * .23, dir: o.dir ?? (o.face ? Math.sign(o.face - px) || 1 : 1), e }, o.each ? o.each(i) : {});
      out.push(person(g, px, y, sc, op)); }
    return out;
  }
  // ЗДАНИЯ. x — центр, y — земля
  const winOn = (i, lit, seed) => hash(i * 7.13 + seed) < lit; // lit 0…1: доля горящих окон, гаснут по одному
  function house(g, x, y, w = 300, h = 240, o = {}) { const col = C(o.col) || P.cream, roof = C(o.roof) || P.red, lit = o.lit ?? 0;
    g.fillStyle = col; g.fillRect(x - w / 2, y - h, w, h); g.fillStyle = roof; g.beginPath(); g.moveTo(x - w / 2 - 22, y - h); g.lineTo(x, y - h - w * .42); g.lineTo(x + w / 2 + 22, y - h); g.closePath(); g.fill();
    g.fillStyle = C(o.door) || P.ink; g.fillRect(x + w * .12, y - h * .5, w * .2, h * .5);
    [[-.32, .45], [-.32, .8], [.3, .82]].slice(0, h > 200 ? 3 : 2).forEach(([fx, fy], i) => { g.fillStyle = winOn(i, lit, o.seed ?? 1) ? C(o.on) || P.yellow : C(o.win) || mix(col, P.ink, .3); g.fillRect(x + fx * w - w * .1, y - h * fy, w * .2, w * .18); }); }
  function tower(g, x, y, w = 320, h = 620, o = {}) { // многоэтажка: floors × cols окон; lit — доля горящих окон; p — стройка снизу вверх
    const col = C(o.col) || P.blue, fl = o.floors ?? Math.max(2, Math.round(h / 110)), nc = o.cols ?? Math.max(2, Math.round(w / 85)), p = o.p ?? 1, lit = o.lit ?? 0;
    const fh = h / fl, shown = fl * cl(p), win = C(o.win) || mix(col, P.ink, .35), on = C(o.on) || P.yellow;
    for (let f = 0; f < Math.ceil(shown); f++) { const k = cl(shown - f), yy = y - (f + 1) * fh - (1 - eo(k)) * 160; g.save(); g.globalAlpha *= cl(k * 3);
      g.fillStyle = col; g.fillRect(x - w / 2, yy, w, fh + 1); if (o.slab) { g.fillStyle = C(o.slab); g.fillRect(x - w / 2, yy + fh - 6, w, 6); }
      for (let c = 0; c < nc; c++) { const i = f * nc + c, ww = w / nc * .46; g.fillStyle = winOn(i, lit, o.seed ?? 3) ? on : win; g.fillRect(x - w / 2 + (c + .5) * w / nc - ww / 2, yy + fh * .26, ww, fh * .44); }
      g.restore(); }
    if (p >= 1 && o.roof !== false) { g.fillStyle = C(o.roof) || mix(col, P.ink, .5); g.fillRect(x - w / 2 - 8, y - h - 12, w + 16, 12); } }
  function awning(g, x0, x1, y, h, cols, n) { const sw = (x1 - x0) / n; for (let i = 0; i < n; i++) { g.fillStyle = cols[i % 2]; g.fillRect(x0 + i * sw, y, sw + .5, h); g.beginPath(); g.arc(x0 + (i + .5) * sw, y + h, sw / 2, 0, PI); g.fill(); } }
  function signText(g, s, x, y, w, size, col) { g.font = font('wide', size); const tw = g.measureText(s).width * 1.08, k = Math.min(1, w / tw); g.save(); g.translate(x, y); g.scale(1.08 * k, k); g.fillStyle = col; g.textAlign = 'center'; g.fillText(s, 0, size * .36); g.restore(); }
  function shop(g, x, y, w = 420, h = 360, o = {}) { // витрина: вывеска o.sign (текст), полосатый навес, окно, дверь
    const col = C(o.col) || P.cream, a = C(o.awn) || P.red, a2 = C(o.awn2) || P.cream, x0 = x - w / 2;
    g.fillStyle = col; g.fillRect(x0, y - h, w, h); g.fillStyle = C(o.glass) || P.sky; g.fillRect(x0 + w * .08, y - h * .52, w * .5, h * .38);
    g.fillStyle = C(o.door) || P.ink; g.fillRect(x0 + w * .66, y - h * .58, w * .22, h * .58);
    awning(g, x0 - 14, x0 + w + 14, y - h * .74, h * .1, [a, a2], o.stripes ?? 7);
    if (o.sign) { g.fillStyle = C(o.signBg) || P.ink; g.fillRect(x0 + w * .06, y - h * .97, w * .88, h * .18); signText(g, o.sign, x, y - h * .88, w * .8, h * .12, C(o.signCol) || P.cream); } }
  function cafe(g, x, y, w = 460, h = 360, o = {}) { shop(g, x, y, w, h, o); const tx = x + w * .5 + 40, tc = C(o.table) || P.ink; // столик с чашкой у входа
    if (o.table === false) return; g.fillStyle = tc; g.fillRect(tx - 50, y - 92, 100, 12); g.fillRect(tx - 5, y - 82, 10, 82); g.fillRect(tx - 34, y - 6, 68, 6);
    g.fillStyle = C(o.cup) || P.red; g.fillRect(tx - 14, y - 118, 28, 26); }
  function school(g, x, y, w = 640, h = 380, o = {}) { // школа: два этажа окон, портик, ступени, флаг, вывеска o.sign
    const col = C(o.col) || P.cream, x0 = x - w / 2, win = C(o.win) || P.blue, lit = o.lit;
    g.fillStyle = col; g.fillRect(x0, y - h, w, h); g.fillStyle = C(o.roof) || P.red; g.fillRect(x0 - 14, y - h - 16, w + 28, 16);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) { if (c === 2 || c === 3) continue; g.fillStyle = lit != null && winOn(r * 6 + c, lit, 5) ? P.yellow : win; g.fillRect(x0 + (c + .5) * w / 6 - w * .035, y - h * (r ? .86 : .5), w * .07, h * .2); }
    g.fillStyle = C(o.portico) || P.red; g.beginPath(); g.moveTo(x - w * .2, y - h * .72); g.lineTo(x, y - h * 1.02); g.lineTo(x + w * .2, y - h * .72); g.closePath(); g.fill();
    g.fillStyle = col; g.fillRect(x - w * .17, y - h * .72, w * .34, h * .72); g.fillStyle = C(o.door) || P.ink; g.fillRect(x - w * .07, y - h * .4, w * .14, h * .4);
    g.fillStyle = mix(col, P.ink, .15); g.fillRect(x - w * .2, y - 14, w * .4, 14);
    if (o.sign) { g.fillStyle = C(o.signBg) || P.blue; g.fillRect(x - w * .16, y - h * .66, w * .32, h * .14); signText(g, o.sign, x, y - h * .59, w * .28, h * .085, C(o.signCol) || P.cream); }
    if (o.flag !== false) { const fx = x0 + w - 30; g.fillStyle = P.ink; g.fillRect(fx, y - h - 150, 6, 150); g.fillStyle = C(o.flag) || P.red; const fw = Math.sin((o.lt ?? T) * 5) * 6;
      g.beginPath(); g.moveTo(fx + 6, y - h - 150); g.lineTo(fx + 86, y - h - 140 + fw); g.lineTo(fx + 6, y - h - 106); g.closePath(); g.fill(); } }
  function stall(g, x, y, w = 420, o = {}) { // прилавок рынка: навес на стойках, товар кружками goods: [цвет…], вывеска o.sign
    const x0 = x - w / 2, h = 330; g.fillStyle = C(o.post) || P.ink; g.fillRect(x0 + 6, y - h, 10, h); g.fillRect(x0 + w - 16, y - h, 10, h);
    awning(g, x0 - 10, x0 + w + 10, y - h, 46, [C(o.awn) || P.red, C(o.awn2) || P.cream], o.stripes ?? 6);
    g.fillStyle = C(o.col) || P.blue; g.fillRect(x0, y - 130, w, 130); const gs = (o.goods || ['orange', 'orange', 'red', 'yellow']).map(C), n = o.n ?? 9;
    for (let i = 0; i < n; i++) disc(g, x0 + 34 + i * (w - 68) / (n - 1), y - 150 - (i % 2) * 22, 24, gs[i % gs.length]);
    if (o.sign) { g.fillStyle = C(o.signBg) || P.cream; g.fillRect(x0 + w * .15, y - 100, w * .7, 64); signText(g, o.sign, x, y - 68, w * .62, 42, C(o.signCol) || P.ink); } }
  // ПРИРОДА
  function tree(g, x, y, s = 1, o = {}) { // kind: oak (ветвистая крона) | round | pine; s=1 ≈ 380 px; col крона, trunk ствол
    const kind = o.kind || 'oak', col = C(o.col) || P.green, tr = C(o.trunk) || P.brown, sw = Math.sin((o.lt ?? T) * 1.3 + x * .01) * (o.sway ?? 2.5);
    g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = tr;
    if (kind === 'pine') { g.fillRect(-14, -60, 28, 60); g.rotate(sw * DEG * .5); g.fillStyle = col; [[0, 170], [-80, 130], [-150, 95]].forEach(([dy, hw], i) => { g.beginPath(); g.moveTo(-hw, -60 + dy - 60 * i); g.lineTo(hw, -60 + dy - 60 * i); g.lineTo(0, -60 + dy - 60 * i - 170); g.closePath(); g.fill(); }); }
    else { g.fillRect(-18, -170, 36, 170); if (kind === 'oak') { g.save(); g.translate(0, -150); g.rotate(-.5); g.fillRect(-8, -70, 16, 70); g.restore(); }
      g.rotate(sw * DEG); g.fillStyle = col;
      const blobs = kind === 'oak' ? [[0, -280, 110], [-95, -230, 82], [95, -232, 86], [-50, -330, 78], [60, -330, 80], [0, -200, 80]] : [[0, -270, 128]];
      blobs.forEach(([bx, by, r]) => disc(g, bx, by, r, col)); if (o.col2) { g.fillStyle = C(o.col2); blobs.slice(0, 3).forEach(([bx, by, r], i) => disc(g, bx - r * .3, by - r * .3, r * .32, C(o.col2))); } }
    g.restore(); }
  function grass(g, x0, x1, y, o = {}) { const col = C(o.col) || P.green, h = o.h ?? 34, st = o.step ?? 22, lt = o.lt ?? T; g.fillStyle = col; g.beginPath();
    for (let x = x0, i = 0; x < x1; x += st, i++) { const hh = h * (.6 + hash(i * 3.3) * .6), b = Math.sin(lt * 2 + i * .7) * 5; g.moveTo(x, y); g.lineTo(x + st * .5 + b, y - hh); g.lineTo(x + st, y); } g.fill(); }
  const MH = [[0, -1], [.16, -.6], [.42, -.74], [.36, -.32], [.88, -.42], [.64, -.08], [.76, .12], [.34, .1], [.36, .34], [.06, .3]], MAPLE = [...MH, ...MH.slice(1).reverse().map(([a, b]) => [-a, b])];
  function leaf(g, x, y, r, o = {}) { // kind: maple (кленовый, 5 лопастей) | oval
    g.save(); g.translate(x, y); g.rotate((o.rot ?? 0) * DEG); g.fillStyle = C(o.col) || P.orange; g.beginPath();
    if ((o.kind || 'maple') === 'maple') { MAPLE.forEach(([px, py], i) => i ? g.lineTo(px * r, py * r) : g.moveTo(px * r, py * r)); g.closePath(); g.fill(); g.fillRect(-r * .05, r * .3, r * .1, r * .6); }
    else { g.ellipse(0, 0, r * .45, r, 0, 0, TAU); g.fill(); } g.restore(); }
  function leaves(g, lt, o = {}) { // листопад в области {x0,x1,y0,y1}; n, cols, kind
    const n = o.n ?? 14, cols = (o.cols || ['orange', 'red', 'yellow']).map(C), x0 = o.x0 ?? 80, x1 = o.x1 ?? 1000, y0 = o.y0 ?? 300, y1 = o.y1 ?? 1500, sd = o.seed ?? 2;
    for (let i = 0; i < n; i++) { const sp0 = .12 + hash(i * 1.7 + sd) * .1, q = (hash(i * 5.1 + sd) + lt * sp0) % 1, px = lerp(x0, x1, hash(i * 2.9 + sd)) + Math.sin(lt * 1.6 + i) * 40;
      leaf(g, px, lerp(y0, y1, q), o.r ?? 30, { col: cols[i % cols.length], rot: lt * 70 * (hash(i + sd) - .5) + i * 40, kind: o.kind }); } }
  // ТРАНСПОРТ. x — центр, y — дорога; dir −1 — едет влево; lt крутит колёса
  function wheel(g, x, y, r, a, c = P.ink) { disc(g, x, y, r, c); disc(g, x, y, r * .45, P.cream); g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = c; g.fillRect(-r * .45, -2.5, r * .9, 5); g.restore(); }
  function car(g, x, y, s = 1, o = {}) { const col = C(o.col) || P.red, a = (o.lt ?? T) * (o.spin ?? 8);
    g.save(); g.translate(x, y); g.scale(s * (o.dir ?? 1), s); g.fillStyle = col; rr(g, -150, -110, 300, 72, 22); g.fill();
    g.beginPath(); g.moveTo(-90, -108); g.lineTo(-60, -170); g.lineTo(55, -170); g.lineTo(95, -108); g.closePath(); g.fill();
    g.fillStyle = C(o.glass) || P.sky; g.beginPath(); g.moveTo(-72, -114); g.lineTo(-52, -156); g.lineTo(-6, -156); g.lineTo(-6, -114); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(6, -114); g.lineTo(6, -156); g.lineTo(48, -156); g.lineTo(76, -114); g.closePath(); g.fill();
    disc(g, 140, -88, 9, P.yellow); wheel(g, -88, -36, 36, a); wheel(g, 88, -36, 36, a); g.restore(); }
  function bus(g, x, y, s = 1, o = {}) { // num — номер маршрута (текст); faces — головы пассажиров в окнах
    const col = C(o.col) || P.blue, a = (o.lt ?? T) * (o.spin ?? 7); g.save(); g.translate(x, y); g.scale(s * (o.dir ?? 1), s);
    g.fillStyle = col; rr(g, -270, -250, 540, 200, 22); g.fill(); g.fillStyle = mix(col, P.ink, .3); g.fillRect(-270, -78, 540, 14);
    for (let i = 0; i < 5; i++) { g.fillStyle = C(o.glass) || P.sky; g.fillRect(-246 + i * 84, -226, 68, 70); if (o.faces && i % 2 === 0) disc(g, -212 + i * 84, -176, 18, SKIN[i % 3]); }
    g.fillStyle = C(o.glass) || P.sky; g.fillRect(186, -226, 64, 128); g.fillStyle = mix(col, P.ink, .45); g.fillRect(196, -226, 4, 128);
    if (o.num != null) { g.fillStyle = C(o.plate) || P.cream; g.fillRect(-250, -296, 110, 52); g.font = font('wide', 42); g.fillStyle = C(o.numCol) || P.ink; g.textAlign = 'center'; g.save(); g.translate(-195, -254); g.scale(o.dir ?? 1, 1); g.fillText(String(o.num), 0, 0); g.restore(); }
    disc(g, 258, -80, 11, P.yellow); wheel(g, -170, -50, 44, a); wheel(g, 170, -50, 44, a); g.restore(); }
  function bike(g, x, y, s = 1, o = {}) { // велосипед с ездоком: rider — параметры person (false — без ездока)
    const col = C(o.col) || P.red, lt = o.lt ?? T, a = lt * (o.spin ?? 6); g.save(); g.translate(x, y); g.scale(s * (o.dir ?? 1), s);
    const R = 50, wb = 78, cr = [0, -R], seat = [-26, -R - 72], bar = [52, -R - 86];
    const ped = i => [cr[0] + Math.cos(a + i * PI) * 22, cr[1] + Math.sin(a + i * PI) * 22];
    if (o.rider !== false) person(g, 0, 0, 1, Object.assign({ pose: 'ride', top: P.yellow, ride: { hip: [seat[0] - 4, seat[1] - 6], feet: [ped(1), ped(0)], hand: bar } }, o.rider || {}, { dir: 1 }));
    [-wb, wb].forEach(wx => { g.strokeStyle = P.ink; g.lineWidth = 9; g.beginPath(); g.arc(wx, -R, R - 4, 0, TAU); g.stroke(); g.save(); g.translate(wx, -R); g.rotate(a); g.lineWidth = 3; g.beginPath(); g.moveTo(-R, 0); g.lineTo(R, 0); g.moveTo(0, -R); g.lineTo(0, R); g.stroke(); g.restore(); });
    stroke2(g, [[-wb, -R], cr, seat, [-wb, -R]], 9, col); stroke2(g, [cr, [wb - 14, -R - 70], [wb, -R]], 9, col); stroke2(g, [seat, [wb - 14, -R - 70]], 9, col);
    stroke2(g, [[wb - 14, -R - 70], bar], 8, P.ink); g.fillStyle = P.ink; g.fillRect(seat[0] - 18, seat[1] - 6, 36, 10);
    if (o.rider !== false) { const r2 = Object.assign({ top: P.yellow, ride: { hip: [seat[0] - 4, seat[1] - 6], feet: [ped(1), ped(0)], hand: bar } }, o.rider || {});
      const F = ped(0); stroke2(g, [[seat[0] - 4, seat[1] - 6], ik(seat[0] - 4, seat[1] - 6, F[0], F[1], (BODY[r2.age || 'adult'] || BODY.adult).leg * .5, (BODY[r2.age || 'adult'] || BODY.adult).leg * .5, -1), F], (BODY[r2.age || 'adult'] || BODY.adult).lw, C(r2.legs) || P.ink); }
    g.restore(); }
  function boat(g, x, y, s = 1, o = {}) { // kind: motor (мотор, след пены) | sail | row; crew — число или массив параметров person (сидят в лодке)
    const col = C(o.col) || P.cream, lt = o.lt ?? T, kind = o.kind || 'motor', bobY = Math.sin(lt * 2.4 + x * .01) * 5;
    g.save(); g.translate(x, y + bobY); g.scale(s * (o.dir ?? 1), s); g.rotate(Math.sin(lt * 2 + x) * .02);
    if (kind === 'sail') { g.fillStyle = P.ink; g.fillRect(-4, -330, 8, 300); g.fillStyle = C(o.sail) || P.cream; g.beginPath(); g.moveTo(10, -320); g.lineTo(150, -60); g.lineTo(10, -60); g.closePath(); g.fill(); }
    if (kind === 'motor' && o.cabin !== false) { g.fillStyle = C(o.cabinCol) || mix(col, P.ink, .12); g.fillRect(20, -150, 110, 90); g.fillStyle = P.sky; g.fillRect(36, -136, 34, 30); g.fillRect(80, -136, 34, 30); }
    const crew = typeof o.crew === 'number' ? Array.from({ length: o.crew }, () => ({})) : (o.crew || []);
    crew.forEach((c, i) => person(g, -110 + i * 72, -12, .62, Object.assign({ pose: 'stand', top: P.orange, legs: P.ink, ph: lt + i * .3, dir: 1 }, c)));
    g.fillStyle = col; g.beginPath(); g.moveTo(-190, -70); g.lineTo(190, -70); g.lineTo(150, 0); g.lineTo(-170, 0); g.closePath(); g.fill();
    g.fillStyle = C(o.stripe) || P.red; g.fillRect(-182, -56, 362, 12);
    if (kind === 'motor') { g.fillStyle = C(o.motorCol) || P.ink; rr(g, -232, -112, 48, 64, 10); g.fill(); g.fillRect(-214, -50, 12, 56);
      if (o.wake !== false) { g.fillStyle = P.white; for (let i = 0; i < 5; i++) { const q = (lt * 1.8 + i / 5) % 1; g.globalAlpha = 1 - q; g.beginPath(); g.ellipse(-240 - q * 260, -4 + Math.sin(i * 2) * 6, 30 + q * 30, 8, 0, 0, TAU); g.fill(); } g.globalAlpha = 1; } }
    if (kind === 'row') { stroke2(g, [[-30, -80], [-130, 30]], 8, P.brown); }
    g.restore(); }
  // ЖИВОТНЫЕ. x — центр, y — земля; s=1 ≈ 240 px в длину
  function dog(g, x, y, s = 1, o = {}) { // pose: stand | walk | sit | sleep
    const col = C(o.col) || P.ginger, d2 = mix(col, P.ink, .3), pose = o.pose || 'stand', lt = o.lt ?? T, w = Math.sin(lt * 9);
    g.save(); g.translate(x, y); g.scale(s * (o.dir ?? 1), s); g.fillStyle = col;
    if (pose === 'sleep') { const br = 1 + Math.sin(lt * 2.2) * .03; g.save(); g.scale(1, br); rr(g, -120, -82, 220, 82, 40); g.fill(); g.restore();
      disc(g, 92, -44, 44, col); g.fillStyle = d2; g.beginPath(); g.ellipse(70, -60, 16, 34, .5, 0, TAU); g.fill(); rr(g, 110, -36, 46, 30, 12); g.fillStyle = col; g.fill();
      g.strokeStyle = P.ink; g.lineWidth = 4; g.beginPath(); g.arc(100, -50, 9, .2, PI - .2); g.stroke(); disc(g, 156, -28, 7, P.ink);
      g.fillStyle = col; g.beginPath(); g.ellipse(-126, -20, 50, 12, -.2, 0, TAU); g.fill(); if (o.zz !== false) for (let i = 0; i < 3; i++) { const q = (lt * .5 + i / 3) % 1; mono(g, 'z', 120 + q * 50, -120 - q * 110, 26 + q * 16, { col: C(o.zCol) || P.ink, bold: true, alpha: Math.sin(q * PI) }); } g.restore(); return; }
    const legs = pose === 'sit' ? [] : [-80, -50, 50, 80];
    legs.forEach((lx, i) => { const a = pose === 'walk' ? (i % 2 ? w : -w) * 18 : 0; g.save(); g.translate(lx, -70); g.rotate(a * DEG); g.fillStyle = i % 2 ? col : d2; g.fillRect(-11, 0, 22, 70); g.restore(); });
    const sit = pose === 'sit', hx = sit ? 34 : 104, hy = sit ? -232 : -150;
    if (sit) { stroke2(g, [[-70, -14], [-120, -4 - Math.sin(lt * 7) * 6]], 14, col); g.fillStyle = col; g.save(); g.translate(-10, -100); g.rotate(-.42); g.beginPath(); g.ellipse(0, 0, 52, 96, 0, 0, TAU); g.fill(); g.restore();
      disc(g, -42, -46, 52, col); g.fillStyle = d2; g.fillRect(10, -110, 22, 110); g.fillStyle = col; g.fillRect(36, -110, 22, 110); g.fillStyle = d2; rr(g, -70, -16, 70, 16, 8); g.fill(); }
    else { rr(g, -100, -130, 200, 70, 34); g.fill(); stroke2(g, [[-96, -110], [-130, -150 - (pose === 'walk' ? w * 10 : Math.sin(lt * 7) * 8)]], 14, col); }
    g.fillStyle = col; disc(g, hx, hy, 42, col); rr(g, hx + 16, hy, 58, 34, 14); g.fill(); disc(g, hx + 72, hy + 8, 8, P.ink); disc(g, hx + 8, hy - 12, 6, P.ink);
    g.fillStyle = d2; g.beginPath(); g.ellipse(hx - 20, hy - 10, 15, 34, .45, 0, TAU); g.fill(); g.restore(); }
  function cat(g, x, y, s = 1, o = {}) { // pose: sit | walk | sleep
    const col = C(o.col) || P.ink, pose = o.pose || 'sit', lt = o.lt ?? T, eye = C(o.eye) || P.yellow; g.save(); g.translate(x, y); g.scale(s * (o.dir ?? 1), s); g.fillStyle = col;
    const ears = (hx, hy) => { g.beginPath(); g.moveTo(hx - 30, hy - 14); g.lineTo(hx - 22, hy - 54); g.lineTo(hx - 4, hy - 30); g.moveTo(hx + 30, hy - 14); g.lineTo(hx + 22, hy - 54); g.lineTo(hx + 4, hy - 30); g.fill(); };
    if (pose === 'sleep') { g.beginPath(); g.ellipse(0, -40, 100, 42, 0, 0, TAU); g.fill(); disc(g, 76, -48, 36, col); ears(76, -56); stroke2(g, [[-90, -20], [-40, -4], [40, -6]], 14, col); }
    else if (pose === 'walk') { const w = Math.sin(lt * 9); [-60, -36, 50, 74].forEach((lx, i) => { g.save(); g.translate(lx, -70); g.rotate((i % 2 ? w : -w) * .3); g.fillRect(-8, 0, 16, 70); g.restore(); });
      rr(g, -80, -120, 175, 60, 30); g.fill(); disc(g, 100, -128, 36, col); ears(100, -136); g.strokeStyle = col; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(-74, -104); g.quadraticCurveTo(-130, -120, -118, -190 + w * 6); g.stroke();
      disc(g, 88, -134, 6, eye); disc(g, 112, -134, 6, eye); }
    else { g.beginPath(); g.ellipse(0, -70, 64, 76, 0, 0, TAU); g.fill(); disc(g, 0, -170, 46, col); ears(0, -178); g.strokeStyle = col; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(50, -10); g.quadraticCurveTo(120, -6, 110, -70 + Math.sin(lt * 3) * 8); g.stroke();
      disc(g, -16, -174, 7, eye); disc(g, 16, -174, 7, eye); }
    g.restore(); }
  function bird(g, x, y, s = 1, o = {}) { // kind: gull (летит, машет) | sit (сидит); s=1 ≈ 120 px размах
    const col = C(o.col) || P.white, lt = o.lt ?? T; g.save(); g.translate(x, y); g.scale(s * (o.dir ?? 1), s);
    if ((o.kind || 'gull') === 'gull') { const f = Math.sin(lt * (o.flap ?? 8) + x * .03) * 26; g.strokeStyle = col; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(-60, -f); g.quadraticCurveTo(-26, -24 - f * .3, 0, 0); g.quadraticCurveTo(26, -24 - f * .3, 60, -f); g.stroke(); disc(g, 0, 2, 9, col); }
    else { disc(g, 0, -26, 26, col); disc(g, 20, -50, 16, col); g.fillStyle = C(o.beak) || P.orange; g.beginPath(); g.moveTo(34, -54); g.lineTo(54, -48); g.lineTo(34, -42); g.fill(); disc(g, 24, -54, 3.5, P.ink); g.fillStyle = col; g.beginPath(); g.moveTo(-22, -30); g.lineTo(-52, -18); g.lineTo(-20, -14); g.fill(); }
    g.restore(); }
  // НЕБО И ВОДА
  function sun(g, x, y, r, o = {}) { const col = C(o.col) || P.yellow, n = o.rays ?? 12, a = (o.lt ?? T) * (o.spin ?? 6) * DEG;
    if (n) { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = C(o.rayCol) || col; for (let i = 0; i < n; i++) { g.rotate(TAU / n); g.fillRect(-5, -r * 1.55, 10, r * .32); } g.restore(); } disc(g, x, y, r, col); }
  function moon(g, x, y, r, o = {}) { disc(g, x, y, r, C(o.col) || P.cream); if (!o.full) disc(g, x + r * .45, y - r * .3, r * .86, C(o.bg) || P.black); } // bg — цвет неба
  function stars(g, o = {}) { // звёзды в области; p 0…1 — зажигаются по одной; мерцают
    const n = o.n ?? 40, x0 = o.x0 ?? 70, x1 = o.x1 ?? 1010, y0 = o.y0 ?? 200, y1 = o.y1 ?? 900, col = C(o.col) || P.cream, lt = o.lt ?? T, p = o.p ?? 1, sd = o.seed ?? 4;
    for (let i = 0; i < n; i++) { const q = cl((p * n - i * .9) / 2); if (q <= 0) continue; const px = lerp(x0, x1, hash(i * 1.37 + sd)), py = lerp(y0, y1, hash(i * 3.71 + sd)), tw = .65 + .35 * Math.sin(lt * 3 + i * 2.1), big = i % 5 === 0;
      g.save(); g.globalAlpha *= tw; g.translate(px, py); g.scale(q, q); if (big) morph(g, 0, 0, o.r ?? 15, 'star', 'star', 0, { fill: col, rot: i * 13, n: 40 }); else disc(g, 0, 0, (o.r ?? 15) * .3, col); g.restore(); } }
  function cloud(g, x, y, s = 1, o = {}) { const col = C(o.col) || P.white, dx = (o.lt ?? 0) * (o.drift ?? 0); g.save(); g.translate(x + dx, y); g.scale(s, s);
    disc(g, -70, -40, 52, col); disc(g, 0, -70, 72, col); disc(g, 70, -36, 50, col); g.fillStyle = col; rr(g, -122, -46, 244, 46, 23); g.fill(); g.restore(); }
  function sea(g, y, o = {}) { // море от y до низа (y1): волнистый край, линии волн col2
    const col = C(o.col) || P.blue, lt = o.lt ?? T, x0 = o.x0 ?? -60, x1 = o.x1 ?? W + 60, y1 = o.y1 ?? H + 60, amp = o.amp ?? 12, wl = o.wl ?? 180;
    g.fillStyle = col; g.beginPath(); g.moveTo(x0, y1); for (let x = x0; x <= x1; x += 20) g.lineTo(x, y + Math.sin(x / wl * TAU + lt * 2) * amp); g.lineTo(x1, y1); g.closePath(); g.fill();
    const n = o.lines ?? 4; if (n) { g.strokeStyle = C(o.col2) || P.cream; g.lineWidth = o.lw ?? 5; g.lineCap = 'round'; for (let k = 1; k <= n; k++) { const yy = y + k * (o.gap ?? 70); if (yy > y1 - 10) break; g.globalAlpha = .9 - k * .12; g.beginPath();
      for (let x = x0 + 40 + (k % 2) * 60; x <= x1 - 40; x += 16) { const yv = yy + Math.sin(x / (wl * .7) * TAU - lt * 2.6 + k) * amp * .7; x === x0 + 40 + (k % 2) * 60 ? g.moveTo(x, yv) : g.lineTo(x, yv); } g.stroke(); } g.globalAlpha = 1; } }
  function hill(g, x, y, w, h, o = {}) { g.fillStyle = C(o.col) || P.green; g.beginPath(); g.ellipse(x, y, w / 2, h, 0, PI, 0); g.fill(); }
  function road(g, y, o = {}) { // дорога с бегущей разметкой (speed px/с, знак — направление)
    const h = o.h ?? 70; g.fillStyle = C(o.col) || P.ink; g.fillRect(-60, y, W + 120, h); g.fillStyle = C(o.line) || P.cream; const off = ((o.lt ?? T) * (o.speed ?? -260)) % 160;
    for (let x = -160 + off; x < W + 160; x += 160) g.fillRect(x, y + h / 2 - 4, 80, 8); }
  // УЛИЦА
  function lamp(g, x, y, h = 420, o = {}) { const col = C(o.col) || P.ink, on = o.on ?? 1, lc = C(o.light) || P.yellow;
    g.fillStyle = col; g.fillRect(x - 6, y - h, 12, h); g.fillRect(x - 24, y - 14, 48, 14); g.fillRect(x - 6, y - h, 60, 10);
    if (on > 0) { g.fillStyle = rgba(lc, .22 * on); g.beginPath(); g.moveTo(x + 40, y - h + 30); g.lineTo(x + 140, y); g.lineTo(x - 60, y); g.closePath(); g.fill(); }
    g.fillStyle = col; g.fillRect(x + 22, y - h + 8, 40, 14); disc(g, x + 42, y - h + 30, 16, on > .5 ? lc : mix(lc, P.ink, .55)); }
  function garland(g, x0, y0, x1, y1, n = 9, o = {}) { // гирлянда: on 0…1 — лампочки загораются слева направо
    const sag = o.sag ?? 90, on = o.on ?? 1, cols = (o.cols || ['yellow', 'red', 'cream', 'blue']).map(C), pt = u => [lerp(x0, x1, u), lerp(y0, y1, u) + Math.sin(u * PI) * sag];
    g.strokeStyle = C(o.wire) || P.ink; g.lineWidth = 3; g.beginPath(); for (let i = 0; i <= 24; i++) { const [px, py] = pt(i / 24); i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke();
    for (let i = 0; i < n; i++) { const [px, py] = pt((i + .5) / n), lit = on * n > i + .5, c = cols[i % cols.length], r = o.r ?? 16;
      g.fillStyle = C(o.wire) || P.ink; g.fillRect(px - 5, py, 10, 10); if (lit) { g.fillStyle = rgba(c, .25); g.beginPath(); g.arc(px, py + 14 + r, r * 1.9, 0, TAU); g.fill(); }
      disc(g, px, py + 14 + r, r, lit ? c : mix(c, P.ink, .6)); } }
  function board(g, x, y, w, h, rows, o = {}) { // доска с мелом на ножках: rows — ['строка' | ['слева', 'справа']]; p 0…1 — строки пишутся по очереди
    const bg = C(o.bg) || '#22302A', frame = C(o.frame) || P.brown, col = C(o.col) || P.cream, x0 = x - w / 2, y0 = y - h - (o.legs === false ? 0 : 120), p = o.p ?? 1, size = o.size ?? 64;
    if (o.legs !== false) { g.fillStyle = frame; g.save(); g.translate(x0 + 40, y0 + h); g.rotate(.12); g.fillRect(-8, 0, 16, 140); g.restore(); g.save(); g.translate(x0 + w - 40, y0 + h); g.rotate(-.12); g.fillRect(-8, 0, 16, 140); g.restore(); }
    g.fillStyle = frame; g.fillRect(x0 - 16, y0 - 16, w + 32, h + 32); g.fillStyle = bg; g.fillRect(x0, y0, w, h);
    if (o.title) caps(g, o.title, x, y0 + 64, 34, { col: C(o.titleCol) || P.yellow });
    const top = y0 + (o.title ? 140 : 90), gap = (h - (top - y0) - 40) / Math.max(1, rows.length);
    rows.forEach((r, i) => { const q = cl(p * rows.length - i); if (q <= 0) return; g.save(); g.globalAlpha *= q; const yy = top + i * gap + size * .5;
      if (Array.isArray(r)) { serif(g, r[0], x0 + 40, yy, size, { col, max: w * .55 }); g.font = font('wide', size * .9); g.fillStyle = col; g.textAlign = 'right'; g.save(); g.translate(x0 + w - 40, yy); g.scale(1.06, 1); g.fillText(r[1], 0, 0); g.restore(); g.textAlign = 'left'; }
      else serif(g, r, x, yy, size, { col, al: 'center', max: w - 60 }); g.restore(); });
    return { x0, y0, w, h }; }
  function bench(g, x, y, w = 260, o = {}) { const c = C(o.col) || P.brown; g.fillStyle = c; g.fillRect(x - w / 2, y - 62, w, 14); g.fillRect(x - w / 2, y - 120, w, 12); g.fillStyle = C(o.leg) || P.ink; g.fillRect(x - w / 2 + 16, y - 50, 10, 50); g.fillRect(x + w / 2 - 26, y - 50, 10, 50); }
  function lockup(g, x, y, size, word, o = {}) { // знак (shape: circle|star|tri|square|hex|bean или draw(g,x,y,r,e)) + широкое слово
    const lt = o.lt ?? 99, t0 = o.t0 ?? 0; g.font = font('wide', size);
    const br = size * .44, gap = size * .32, ww = (o.measure || 0); const chars = [...word.toUpperCase()];
    const tw = (chars.reduce((a, c) => a + g.measureText(c).width, 0) - .012 * size * (chars.length - 1)) * (o.sx ?? 1.14), total = br * 1.48 + gap + tw;
    let sz = size, k = 1; const max = o.max ?? 920; if (total > max) { k = max / total; sz = Math.floor(size * k); }
    const bx = x - total * k / 2 + br * k * .74, mid = y - sz * .37;
    const e = lt <= t0 ? 0 : sp(lt - t0, 'pop'), rot = -18 + (1 - cl(sp(lt - t0, 'soft'))) * 60, sh = o.shape || 'circle';
    if (e > 0) { if (typeof sh === 'function') sh(g, bx, mid, br * k, e); else if (sh === 'bean') bean(g, bx, mid, br * k * e, { col: o.mark || P.ink, groove: o.groove || P.red, rot });
      else morph(g, bx, mid, br * k * .8 * Math.max(0, e), sh, sh, 0, { rot, fill: o.mark || P.ink }); }
    const r = wide(g, word, bx + br * k * .74 + gap * k, y, sz, { al: 'left', lt, t0: t0 + .12, col: o.col || P.ink, sx: o.sx ?? 1.14, flex: o.flex });
    return { bx, by: mid, br: br * k, x1: r.x1, size: sz, e };
  }

  return { W, H, SAFE, M, P, FIELD, F, font, cl, pr, lerp, eo, ei, eio, eb, SP, spring, sp, track, kf, life, hash, rnd, wob, step, z2, tc, mix, rgba, roast,
    words, at, phraseAt, cutTimes, begin, fieldOf, field, grain, play, layer, wide, serif, caps, mono, rule, marker, bracket, ringText, odo,
    corners, beat, hud, rings, dotGrid, truchet, globe, dotPlane, morph, star, trail, bean, beanPop, orbit, transformBox, annot, curveIcon, easeRow,
    ruler, specks, cup, cupTop, croissant, steam, clock, gift, plate, pin, tube, mapGrid, lockup,
    C, SKIN, rr, pop, person, crowd, house, tower, shop, cafe, school, stall, tree, grass, leaf, leaves, car, bus, bike, boat, dog, cat, bird,
    sun, moon, stars, cloud, sea, hill, road, lamp, garland, board, bench };
})();
