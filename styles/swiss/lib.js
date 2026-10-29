// «Швейцарский постер» — библиотека стиля для роликов draw(t, k) на Canvas 2D 1080×1920.
// Одна глобальная константа SWISS. Работает в Web Worker: только OffscreenCanvas, без document и сети.
// Кадр считается только из t; кэшируются лишь текстуры и точки сферы. Углы rot — в градусах.
const SWISS = (() => {
  const W = 1080, H = 1920, PI = Math.PI, TAU = PI * 2, DEG = PI / 180;
  const SAFE = { x0: 60, x1: 1020, y0: 110, y1: 1690 }, M = 96; // M — поле сетки
  const P = { red: '#FF5937', blue: '#2E3AFE', cream: '#F2EDE7', black: '#0F0F11', yellow: '#FAC63C',
    ink: '#111113', white: '#FBF8F3', grey: '#8D887F', redD: '#D8401E', blueD: '#2330C9', creamD: '#DDD5C8', yellowD: '#E3A91C' };
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
  function hud(g, t, o = {}) { // уголки, название, глава с прокруткой номера, таймкод, BPM
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
    mono(g, tc(t) + '   30 FPS', M, y2, 24, { col });
    mono(g, (o.bpm ?? 120) + ' BPM', SAFE.x1 - 36 - 4 * 18 - 14, y2, 24, { col, al: 'right' }); beat(g, SAFE.x1 - 36, y2, t, o.bpm ?? 120, col);
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
    if (o.inner !== false) bean(g, 0, -r * 1.75, r * .55, { col: o.inner || P.cream, groove: o.col || P.red, rot: -10 }); g.restore();
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
  function lockup(g, x, y, size, word, o = {}) { // знак-зерно + широкое слово; возвращает раскладку
    const lt = o.lt ?? 99, t0 = o.t0 ?? 0; g.font = font('wide', size);
    const br = size * .44, gap = size * .32, ww = (o.measure || 0); const chars = [...word.toUpperCase()];
    const tw = (chars.reduce((a, c) => a + g.measureText(c).width, 0) - .012 * size * (chars.length - 1)) * (o.sx ?? 1.14), total = br * 1.48 + gap + tw;
    let sz = size, k = 1; const max = o.max ?? 920; if (total > max) { k = max / total; sz = Math.floor(size * k); }
    const bx = x - total * k / 2 + br * k * .74, mid = y - sz * .37;
    const e = beanPop(g, lt, t0, bx, mid, br * k, { col: o.mark || P.ink, groove: o.groove || P.red, rot: -18 + (1 - cl(sp(lt - t0, 'soft'))) * 60 });
    const r = wide(g, word, bx + br * k * .74 + gap * k, y, sz, { al: 'left', lt, t0: t0 + .12, col: o.col || P.ink, sx: o.sx ?? 1.14, flex: o.flex });
    return { bx, by: mid, br: br * k, x1: r.x1, size: sz, e };
  }

  return { W, H, SAFE, M, P, FIELD, F, font, cl, pr, lerp, eo, ei, eio, eb, SP, spring, sp, track, kf, life, hash, rnd, wob, step, z2, tc, mix, rgba, roast,
    words, at, phraseAt, cutTimes, begin, fieldOf, field, grain, play, layer, wide, serif, caps, mono, rule, marker, bracket, ringText, odo,
    corners, beat, hud, rings, dotGrid, truchet, globe, dotPlane, morph, star, trail, bean, beanPop, orbit, transformBox, annot, curveIcon, easeRow,
    ruler, specks, cup, cupTop, croissant, steam, clock, gift, plate, pin, tube, mapGrid, lockup };
})();
