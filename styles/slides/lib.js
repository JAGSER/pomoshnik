// «Деловые слайды» (SLIDES): живые деловые слайды для роликов draw(t, k), Canvas 2D 1080×1920, Web Worker.
// Одна глобальная константа SLIDES. Кадр считается только из t (секунды ролика); кэшируются лишь узоры и миниатюры страниц.
// Единицы: пиксели кадра, время в секундах (абсолютное t, если не сказано «lt» = секунды от начала страницы), углы в градусах.
const SLIDES = (() => {
  const W = 1080, H = 1920, PI = Math.PI, PI2 = PI * 2, DEG = PI / 180;
  const SAFE = { x0: 60, x1: 1020, y0: 110, y1: 1690 };
  const L = { x0: 64, x1: 1016, w: 952, cx: 540, head: 252, body: 450, end: 1500, pill: 1585, foot: 1668 };
  const P = {
    page: '#FFFFFF', paper: '#F4F7F8', ink: '#1B2A35', ink2: '#3D4B56', mute: '#76848E', faint: '#A3AFB7',
    line: '#D3DCE1', grid: '#E5EBEE', teal: '#1C7B87', tealD: '#125D68', tealM: '#4FA2AD', tealL: '#A3D2D8',
    tealP: '#E4F1F3', tealPP: '#F0F6F7', slate: '#26313B', night: '#141C23', key: '#8ADBE3', white: '#FFFFFF',
    body: '#E8EFF2', shade: '#D5E1E5', onDark: '#CDEBEF'
  };
  const F = {
    sans: '"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif',
    serif: '"DejaVu Serif",Georgia,"Noto Serif","Times New Roman",serif',
    mono: '"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace'
  };
  let K = null;

  // ---------- время, изинги, пружины ----------
  const cl = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const pr = (t, a, b) => (b === a ? (t >= a ? 1 : 0) : cl((t - a) / (b - a)));
  const lerp = (a, b, p) => a + (b - a) * p;
  const eo = p => 1 - Math.pow(1 - cl(p), 3);
  const eo5 = p => 1 - Math.pow(1 - cl(p), 5);
  const ei = p => Math.pow(cl(p), 3);
  const eio = p => { p = cl(p); return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  const eb = (p, s = 1.7) => { p = cl(p); const c = s + 1; return 1 + c * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2); };
  const sp = p => (p <= 0 ? 0 : p >= 1 ? 1 : 1 - Math.exp(-7 * p) * Math.cos(7.5 * p)); // пружина 0→1, перелёт ≈5 %
  const spring = (t, t0, dur = .6) => sp(pr(t, t0, t0 + dur));
  const count = (t, t0, t1, a, b, e = eo) => lerp(a, b, e(pr(t, t0, t1)));
  const kf = (A, t, e = eio) => {
    if (t <= A[0][0]) return A[0][1];
    for (let i = 0; i < A.length - 1; i++) { const a = A[i], b = A[i + 1]; if (t < b[0]) return lerp(a[1], b[1], e(pr(t, a[0], b[0]))); }
    return A[A.length - 1][1];
  };
  const kfv = (A, t, e = eio) => {
    const n = A[0].length - 1, out = new Array(n), last = A[A.length - 1];
    if (t <= A[0][0]) { for (let j = 0; j < n; j++) out[j] = A[0][j + 1]; return out; }
    for (let i = 0; i < A.length - 1; i++) if (t < A[i + 1][0]) {
      const p = e(pr(t, A[i][0], A[i + 1][0])); for (let j = 0; j < n; j++) out[j] = lerp(A[i][j + 1], A[i + 1][j + 1], p); return out;
    }
    for (let j = 0; j < n; j++) out[j] = last[j + 1]; return out;
  };
  const stag = (t, t0, i, step = .07, dur = .32) => pr(t, t0 + i * step, t0 + i * step + dur);
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const rnd = seed => { let s = (seed >>> 0) || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
  const wave = (t, f = 1, ph = 0) => Math.sin((t * f + ph) * PI2);
  function cuts(t, list, end) {
    let i = 0; while (i < list.length - 1 && t >= list[i + 1]) i++;
    const t0 = list[i], t1 = i < list.length - 1 ? list[i + 1] : (end || (K ? K.duration : t0 + 4));
    return { i, lt: t - t0, t0, t1, p: pr(t, t0, t1) };
  }

  // ---------- цвет, числа ----------
  const HX = new Map();
  const hex = c => { let v = HX.get(c); if (!v) { const n = parseInt(c.slice(1), 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; HX.set(c, v); } return v; };
  const rgba = (c, a) => { const v = hex(c); return 'rgba(' + v[0] + ',' + v[1] + ',' + v[2] + ',' + a + ')'; };
  const mix = (a, b, p) => { const A = hex(a), B = hex(b); p = cl(p); return 'rgb(' + Math.round(lerp(A[0], B[0], p)) + ',' + Math.round(lerp(A[1], B[1], p)) + ',' + Math.round(lerp(A[2], B[2], p)) + ')'; };
  const fmt = (v, dec = 0) => {
    const m = Math.pow(10, dec), r = Math.round(Math.abs(v) * m) / m, s = r.toFixed(dec).split('.');
    const int = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (v < 0 && r > 0 ? '−' : '') + int + (s[1] ? ',' + s[1] : '');
  };

  // ---------- шрифты и замер ----------
  const font = (size, wt = 700, fam = 'sans') => wt + ' ' + Math.max(1, Math.round(size)) + 'px ' + (F[fam] || fam);
  const MW = new Map();
  const mw = (g, s, f) => { const k = f + '|' + s; let v = MW.get(k); if (v === undefined) { g.font = f; v = g.measureText(s).width; MW.set(k, v); } return v; };
  function fit(g, s, maxW, size, wt = 700, fam = 'sans', min = 10) {
    let sz = size; for (let n = 0; n < 20 && sz > min; n++) { if (mw(g, s, font(sz, wt, fam)) <= maxW) break; sz = Math.max(min, Math.floor(sz * .95)); }
    return sz;
  }

  // ---------- базовые фигуры ----------
  function rr(g, x, y, w, h, r = 0) {
    g.beginPath(); if (w <= 0 || h <= 0) return;
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function circle(g, x, y, r, col) { g.beginPath(); g.arc(x, y, Math.max(0, r), 0, PI2); if (col) { g.fillStyle = col; g.fill(); } }
  function shade(g, x, y, w, h, r = 12, k = 1, dy = 10) { // мягкая тень без shadowBlur: 4 полупрозрачных обвода по краю (дёшево)
    if (k <= 0 || w <= 0 || h <= 0) return; const ga = g.globalAlpha; g.strokeStyle = '#10202B';
    for (let i = 0; i < 4; i++) { g.globalAlpha = ga * k * .05; g.lineWidth = 3 + i * 7; rr(g, x, y + dy * (.3 + i * .22), w, h, r); g.stroke(); }
    g.globalAlpha = ga;
  }
  function card(g, x, y, w, h, o = {}) {
    if (o.shadow) shade(g, x, y, w, h, o.r == null ? 12 : o.r, o.shadow === true ? 1 : o.shadow);
    rr(g, x, y, w, h, o.r == null ? 12 : o.r);
    if (o.fill !== null) { g.fillStyle = o.fill || P.page; g.fill(); }
    if (o.line !== null) { g.strokeStyle = o.line || P.line; g.lineWidth = o.lw || 2.5; g.stroke(); }
  }
  function dline(g, x0, y0, x1, y1, o = {}) { // пунктир
    g.save(); g.strokeStyle = o.col || P.faint; g.lineWidth = o.lw || 3; g.setLineDash(o.dash || [12, 10]); g.lineDashOffset = o.off || 0; g.lineCap = 'butt';
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.restore();
  }
  function arrow(g, x0, y0, x1, y1, o = {}) { // линия со стрелкой; o.p: доля прорисовки
    const p = o.p == null ? 1 : cl(o.p); if (p <= 0) return; const x = lerp(x0, x1, p), y = lerp(y0, y1, p), a = Math.atan2(y1 - y0, x1 - x0), hs = o.head || 18;
    g.save(); g.strokeStyle = g.fillStyle = o.col || P.teal; g.lineWidth = o.lw || 5; g.lineCap = 'round';
    if (o.dash) g.setLineDash(o.dash);
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x - Math.cos(a) * hs * .6, y - Math.sin(a) * hs * .6); g.stroke(); g.setLineDash([]);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(a - .45) * hs, y - Math.sin(a - .45) * hs); g.lineTo(x - Math.cos(a + .45) * hs, y - Math.sin(a + .45) * hs); g.closePath(); g.fill();
    g.restore();
  }
  function chev(g, x, y, s = 14, o = {}) { // шеврон › (dir: r|d|l|u)
    const r = { r: 0, d: 90, l: 180, u: -90 }[o.dir || 'r'] * DEG;
    g.save(); g.translate(x, y); g.rotate(r); g.strokeStyle = o.col || P.teal; g.lineWidth = o.lw || s * .28; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(-s * .3, -s * .55); g.lineTo(s * .3, 0); g.lineTo(-s * .3, s * .55); g.stroke(); g.restore();
  }

  // ---------- текст ----------
  function text(g, s, x, y, size, o = {}) { // одна строка; o.max: ужать по ширине; возвращает ширину
    s = String(s); const wt = o.wt || 700, fam = o.fam || 'sans';
    let f = font(size, wt, fam), w = mw(g, s, f);
    if (o.max && w > o.max) { size = fit(g, s, o.max, size, wt, fam, 8); f = font(size, wt, fam); w = mw(g, s, f); }
    const a = o.a == null ? 1 : o.a; if (a <= 0) return w;
    const ga = g.globalAlpha; g.globalAlpha = ga * a;
    g.font = f; g.fillStyle = o.col || P.ink; g.textAlign = o.al || 'left'; g.textBaseline = o.base || 'middle';
    g.fillText(s, x, y); g.globalAlpha = ga; return w;
  }
  function spaced(g, s, x, y, size, o = {}) { // капс с разрядкой (без letterSpacing)
    s = String(s); const f = font(size, o.wt || 800, o.fam), tr = o.tr == null ? size * .12 : o.tr, ch = Array.from(s);
    let w = 0; const ws = ch.map(c => { const cw = mw(g, c, f); w += cw + tr; return cw; }); w -= tr;
    const a = o.a == null ? 1 : o.a; if (a <= 0) return w;
    let cx = o.al === 'center' ? x - w / 2 : o.al === 'right' ? x - w : x;
    const ga = g.globalAlpha; g.globalAlpha = ga * a; g.font = f; g.fillStyle = o.col || P.teal; g.textAlign = 'left'; g.textBaseline = 'middle';
    for (let i = 0; i < ch.length; i++) { if (ch[i] !== ' ') g.fillText(ch[i], cx, y); cx += ws[i] + tr; }
    g.globalAlpha = ga; return w;
  }
  const PS = new Map();
  function parse(spec) { // "слово@1.2 *ключ@1.6 1,3_млн | новая_строка"
    let r = PS.get(spec); if (r) return r; r = [];
    String(spec).split(/\s+/).filter(Boolean).forEach(tok => {
      if (tok === '|') { r.push({ br: true }); return; }
      let key = false, tt = null, m;
      if (tok[0] === '*' && tok.length > 1) { key = true; tok = tok.slice(1); }
      if ((m = tok.match(/^(.*)@(-?\d+(?:\.\d+)?)$/))) { tok = m[1]; tt = +m[2]; }
      r.push({ s: tok.replace(/_/g, ' '), key, t: tt });
    });
    PS.set(spec, r); return r;
  }
  function layoutW(g, toks, f, sw, maxW) {
    const lines = []; let cur = { items: [], w: 0 }; lines.push(cur);
    for (const tk of toks) {
      if (tk.br) { cur = { items: [], w: 0 }; lines.push(cur); continue; }
      const w = mw(g, tk.s, f);
      if (cur.items.length && cur.w + sw + w > maxW) { cur = { items: [], w: 0 }; lines.push(cur); }
      cur.w += (cur.items.length ? sw : 0) + w; cur.items.push({ tk, w });
    }
    let wmax = 0; for (const l of lines) wmax = Math.max(wmax, l.w);
    return { lines, wmax };
  }
  // Текст по словам в такт речи. y: верх блока. Слова без @t идут через o.step после предыдущего.
  function words(g, t, spec, x, y, o = {}) {
    const toks = parse(spec), wt = o.wt || 800, fam = o.fam || 'sans', maxW = o.max || L.w, lh = o.lh || 1.1, maxL = o.lines || 2;
    let size = o.size || 64, f, sw, lay; const min = o.min || Math.round(size * .6);
    for (let n = 0; n < 16; n++) {
      f = font(size, wt, fam); sw = mw(g, ' ', f); lay = layoutW(g, toks, f, sw, maxW);
      if ((lay.lines.length <= maxL && lay.wmax <= maxW + .5) || size <= min) break;
      size = Math.max(min, Math.floor(size * .95));
    }
    const step = o.step || .1, dur = o.dur || .32, lhp = size * lh, ga = g.globalAlpha;
    let prev = o.t0 == null ? -step : o.t0 - step;
    const outK = o.out == null ? 1 : 1 - eo(pr(t, o.out, o.out + (o.outDur || .2)));
    g.font = f; g.textAlign = 'left'; g.textBaseline = 'middle';
    for (let li = 0; li < lay.lines.length; li++) {
      const ln = lay.lines[li], cy = y + lhp * (li + .5);
      let cx = o.al === 'center' ? x - ln.w / 2 : o.al === 'right' ? x - ln.w : x;
      for (const it of ln.items) {
        let tw = it.tk.t != null ? it.tk.t : prev + step; prev = tw; if (o.tmin != null && tw < o.tmin) tw = o.tmin;
        const ap = eo(pr(t, tw, tw + dur)), a = ap * outK;
        if (a > .003) {
          const key = it.tk.key;
          if (key && o.hl) {
            const hp = eo(pr(t, tw + .1, tw + .48));
            if (hp > 0) {
              g.globalAlpha = ga * outK;
              if (o.hl === 'box') { g.fillStyle = o.hcol || P.tealP; rr(g, cx - size * .1, cy - size * .56, (it.w + size * .2) * hp, size * 1.1, size * .12); g.fill(); }
              else { g.fillStyle = o.hcol || P.teal; g.fillRect(cx, cy + size * .5, it.w * hp, Math.max(4, size * .075)); }
            }
          }
          g.globalAlpha = ga * a; g.fillStyle = key ? (o.kcol || P.teal) : (o.col || P.ink);
          g.fillText(it.tk.s, cx, cy + (1 - ap) * size * .3 - (1 - outK) * size * .2);
        }
        cx += it.w + sw;
      }
    }
    g.globalAlpha = ga;
    return { w: lay.wmax, h: lay.lines.length * lhp, size, n: lay.lines.length, bottom: y + lay.lines.length * lhp };
  }
  // Шапка слайда: метка раздела (бирюзовый квадрат + капс) и заголовок-вывод. Возвращает y низа заголовка.
  function head(g, t, o) {
    const x = o.x == null ? L.x0 : o.x, y = o.y == null ? L.head : o.y, t0 = o.t0 || 0;
    if (o.label) {
      const la = eo(pr(t, t0, t0 + .3));
      if (la > 0) {
        const ga = g.globalAlpha; g.globalAlpha = ga * la; g.fillStyle = o.lcol || P.teal; g.fillRect(x, y - 9, 18, 18);
        spaced(g, o.label, x + 34 - (1 - la) * 16, y, 30, { col: o.lcol || P.teal, tr: 3.5 }); g.globalAlpha = ga;
      }
    }
    const r = words(g, t, o.title, x, y + 38, { size: o.size || 104, lines: o.lines || 2, max: o.max || (L.x1 - x), min: o.min || 90,
      col: o.col || P.ink, kcol: o.kcol || P.teal, hl: o.hl, wt: 800, lh: 1.07, t0: t0 + .08, step: .12 });
    return y + 38 + r.h;
  }

  // ---------- числа ----------
  // Число с «бегущими» цифрами (одометр). y: базовая линия. v: текущее значение (считай через count/kf).
  // o: dec (знаков после запятой), step (шаг округления, напр. 1000), unit, us (доля размера единицы), pre ('+'), al, col, ucol, wt
  function odo(g, v, x, y, size, o = {}) {
    const dec = o.dec || 0, wt = o.wt || 800, fam = o.fam || 'sans', f = font(size, wt, fam), cw = mw(g, '0', f);
    const neg = v < 0; v = Math.abs(v);
    const z = o.step ? Math.max(0, Math.round(Math.log10(o.step * Math.pow(10, dec)))) : 0;
    const q = v * Math.pow(10, dec - z);
    const nInt = Math.max(1, String(Math.floor(v + 1e-7)).length), total = nInt + dec;
    const gap = size * .2, comma = dec ? mw(g, ',', f) : 0;
    const pre = o.pre != null ? o.pre : (neg ? '−' : ''), pw = pre ? mw(g, pre, f) + size * .02 : 0;
    const unit = o.unit || '', us = size * (o.us || .46), uf = font(us, o.uwt || 700, fam), uw = unit ? mw(g, unit, uf) + size * .14 : 0;
    const w = pw + total * cw + comma + Math.floor((nInt - 1) / 3) * gap + uw;
    const a = o.a == null ? 1 : o.a; if (a <= 0) return w;
    let cx = o.al === 'right' ? x - w : o.al === 'center' ? x - w / 2 : x;
    const ga = g.globalAlpha; g.globalAlpha = ga * a;
    g.font = f; g.textBaseline = 'alphabetic'; g.fillStyle = o.col || P.ink;
    if (pre) { g.textAlign = 'left'; g.fillText(pre, cx, y); cx += pw; }
    g.textAlign = 'center';
    for (let k = total - 1; k >= 0; k--) {
      let d = 0, r = 0;
      if (k >= z) {
        const kk = k - z, pk = Math.pow(10, kk), u = q / pk; d = Math.floor(u + 1e-7) % 10;
        if (kk === 0) r = q - Math.floor(q + 1e-7); else r = cl(q - Math.floor(u + 1e-7) * pk - (pk - 1));
      }
      if (r > .002 && r < .998) {
        const e = eio(r);
        g.save(); g.beginPath(); g.rect(cx - 3, y - size * .9, cw + 6, size * 1.12); g.clip();
        g.fillText(String(d), cx + cw / 2, y - e * size); g.fillText(String((d + 1) % 10), cx + cw / 2, y + (1 - e) * size); g.restore();
      } else g.fillText(String(r >= .998 ? (d + 1) % 10 : d), cx + cw / 2, y);
      cx += cw;
      const ip = k - dec;
      if (dec && k === dec) { g.textAlign = 'left'; g.fillText(',', cx, y); cx += comma; g.textAlign = 'center'; }
      else if (ip > 0 && ip % 3 === 0) cx += gap;
    }
    if (unit) { g.font = uf; g.textAlign = 'left'; g.fillStyle = o.ucol || o.col || P.ink; g.fillText(unit, cx + size * .14, y); }
    g.globalAlpha = ga; return w;
  }
  // Крупное число с маленькой единицей («36,9 %»), без анимации. Возвращает ширину.
  function num(g, s, x, y, size, o = {}) {
    s = String(s); const f = font(size, o.wt || 800, o.fam), unit = o.unit || '', uf = font(size * (o.us || .46), 700, o.fam);
    const w1 = mw(g, s, f), w2 = unit ? mw(g, unit, uf) + size * .14 : 0, w = w1 + w2;
    let x0 = o.al === 'right' ? x - w : o.al === 'center' ? x - w / 2 : x;
    const ga = g.globalAlpha; if (o.a != null) g.globalAlpha = ga * o.a;
    g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.font = f; g.fillStyle = o.col || P.ink; g.fillText(s, x0, y);
    if (unit) { g.font = uf; g.fillStyle = o.ucol || o.col || P.ink; g.fillText(unit, x0 + w1 + size * .14, y); }
    g.globalAlpha = ga; return w;
  }

  // ---------- появление ----------
  // Обёртка появления/ухода: fn(g, p) рисуется со сдвигом/масштабом. kind: up|down|left|right|pop|stamp|grow|fade|wipe
  function appear(g, t, t0, fn, o = {}) {
    const dur = o.dur || .34, p = pr(t, t0, t0 + dur); if (p <= 0) return 0;
    let q = 1; if (o.out != null) { q = 1 - pr(t, o.out, o.out + (o.outDur || dur / 1.4)); if (q <= 0) return 0; }
    const kind = o.kind || 'up', d = o.dist == null ? 44 : o.dist, x = o.x || 0, y = o.y || 0, e = eo(p), qo = 1 - eo(q);
    g.save(); g.globalAlpha *= Math.min(1, p * 2.4) * (1 - qo);
    if (kind === 'up') g.translate(0, (1 - e) * d - qo * d * .5);
    else if (kind === 'down') g.translate(0, -(1 - e) * d + qo * d * .5);
    else if (kind === 'left') g.translate(-(1 - e) * d, 0);
    else if (kind === 'right') g.translate((1 - e) * d, 0);
    else if (kind === 'pop' || kind === 'stamp') {
      const s = (kind === 'pop' ? lerp(.82, 1, eb(p)) : lerp(1.45, 1, eo5(p))) * lerp(1, .9, qo);
      g.translate(x, y); g.scale(s, s); g.translate(-x, -y);
    } else if (kind === 'grow') { const s = Math.max(.001, sp(p)); g.translate(x, y); g.scale(1, s); g.translate(-x, -y); }
    else if (kind === 'wipe') { g.beginPath(); g.rect(x - 10, -H, (o.w || W) * e + 10, H * 3); g.clip(); }
    fn(g, p, q); g.restore(); return p;
  }

  // ---------- элементы интерфейса ----------
  function chip(g, s, x, y, o = {}) { // плашка-бирка; x,y: левый край/центр по o.al и середина по высоте
    const size = o.size || 30, caps = o.caps !== false, f = font(size, o.wt || 800, o.fam);
    const tw = caps ? spaced(g, s, 0, 0, size, { a: 0, tr: o.tr == null ? size * .1 : o.tr, wt: o.wt || 800 }) : mw(g, s, f);
    const px = o.px == null ? size * .66 : o.px, h = o.h || size * 1.7, w = tw + px * 2 + (o.icon ? h * .7 : 0);
    const x0 = o.al === 'center' ? x - w / 2 : o.al === 'right' ? x - w : x;
    const a = o.a == null ? 1 : o.a; if (a <= 0) return { x: x0, y: y - h / 2, w, h };
    const ga = g.globalAlpha; g.globalAlpha = ga * a;
    rr(g, x0, y - h / 2, w, h, o.r == null ? h / 2 : o.r);
    if (o.fill !== null) { g.fillStyle = o.fill || P.tealP; g.fill(); }
    if (o.line) { g.strokeStyle = o.line; g.lineWidth = o.lw || 2.5; g.stroke(); }
    let tx = x0 + px; if (o.icon) { o.icon(g, x0 + px + h * .25, y, h); tx += h * .7; }
    if (caps) spaced(g, s, tx, y + 1, size, { col: o.col || P.teal, tr: o.tr == null ? size * .1 : o.tr, wt: o.wt || 800 });
    else text(g, s, tx, y + 1, size, { col: o.col || P.teal, wt: o.wt || 800, fam: o.fam });
    g.globalAlpha = ga; return { x: x0, y: y - h / 2, w, h };
  }
  function badge(g, n, x, y, r = 22, o = {}) { // номер в кружке
    circle(g, x, y, r); g.fillStyle = o.fill || P.page; g.fill(); g.strokeStyle = o.col || P.teal; g.lineWidth = o.lw || 3; g.stroke();
    text(g, String(n), x, y + 1, r * 1.15, { col: o.tcol || o.col || P.teal, al: 'center', wt: 800 });
  }
  function seg(g, x, y, w, h, labels, sel, o = {}) { // сегментный переключатель; sel: дробный индекс (плавный ход)
    const n = labels.length, cw = w / n, r = o.r == null ? 12 : o.r, s = cl(sel, 0, n - 1);
    card(g, x, y, w, h, { fill: P.page, line: o.col || P.teal, lw: 2.5, r });
    g.fillStyle = o.col || P.teal; rr(g, x + s * cw + 6, y + 6, cw - 12, h - 12, Math.max(3, r - 5)); g.fill();
    labels.forEach((lb, i) => spaced(g, lb, x + cw * (i + .5), y + h / 2 + 1, o.size || 27, { col: mix(o.col || P.teal, P.white, cl(1 - Math.abs(s - i) * 1.4)), al: 'center', tr: 2.5 }));
  }
  function slider(g, x, y, w, f, o = {}) { // ползунок; возвращает x ручки
    f = cl(f); const kx = x + w * f;
    g.save(); g.lineCap = 'round'; g.lineWidth = o.lw || 12;
    g.strokeStyle = P.grid; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.stroke();
    if (f > 0) { g.strokeStyle = o.col || P.teal; g.beginPath(); g.moveTo(x, y); g.lineTo(kx, y); g.stroke(); }
    if (o.ticks) for (let i = 0; i <= o.ticks; i++) { const tx = x + w * i / o.ticks; circle(g, tx, y, 4, tx <= kx ? P.white : P.faint); }
    if (o.a) spaced(g, o.a, x, y + 52, 26, { col: P.mute, al: 'center', tr: 2.5 });
    if (o.b) spaced(g, o.b, x + w, y + 52, 26, { col: P.mute, al: 'center', tr: 2.5 });
    const kr = o.r || 25; shade(g, kx - kr, y - kr, kr * 2, kr * 2, kr, .9, 6);
    circle(g, kx, y, kr, P.white); g.strokeStyle = o.col || P.teal; g.lineWidth = 6; g.stroke();
    g.restore(); return kx;
  }
  function toggle(g, x, y, on, o = {}) { // переключатель-«таблетка», on 0…1
    const w = o.w || 96, h = o.h || 54; on = cl(on);
    rr(g, x, y - h / 2, w, h, h / 2); g.fillStyle = mix(P.line, o.col || P.teal, on); g.fill();
    const kx = lerp(x + h / 2, x + w - h / 2, eio(on)); circle(g, kx, y, h / 2 - 6, P.white);
  }
  function button(g, s, x, y, o = {}) { // кнопка-ссылка «… ›»; возвращает [x, y, w, h] для курсора/склейки
    const size = o.size || 36, f = font(size, 800), tw = mw(g, s, f), h = size * 1.9, px = size * .7, w = tw + px * 2 + size * .7;
    const x0 = o.al === 'right' ? x - w : o.al === 'center' ? x - w / 2 : x, y0 = y - h / 2, dark = !!o.fill;
    const pr0 = cl(o.press || 0), hv = cl(o.hover || 0);
    g.save(); const s0 = 1 - .05 * pr0; g.translate(x0 + w / 2, y); g.scale(s0, s0); g.translate(-x0 - w / 2, -y);
    card(g, x0, y0, w, h, { fill: dark ? (o.fill === true ? P.teal : o.fill) : mix(P.page, P.tealP, hv), line: dark ? null : P.teal, lw: 3, r: o.r == null ? 12 : o.r });
    text(g, s, x0 + px, y + 1, size, { col: dark ? P.white : P.teal, wt: 800 });
    chev(g, x0 + px + tw + size * .45 + hv * 6, y + 1, size * .5, { col: dark ? P.white : P.teal });
    g.restore(); return [x0, y0, w, h];
  }
  function tip(g, s, x, y, o = {}) { // выноска с хвостиком, хвостик указывает в (x, y); dir up (над точкой) | down
    const size = o.size || 40, f = font(size, 800), tw = mw(g, s, f), pad = size * .55, h = Math.round(size * 1.75), w = tw + pad * 2;
    const down = o.dir === 'down', bx = cl(x - w / 2, o.x0 == null ? L.x0 : o.x0, (o.x1 == null ? L.x1 : o.x1) - w), by = down ? y + 18 : y - 18 - h;
    const light = !!o.light, fill = light ? P.page : (o.fill || P.slate);
    if (!light) shade(g, bx, by, w, h, 12, .7, 6);
    const px = cl(x, bx + 22, bx + w - 22);
    g.beginPath(); rr(g, bx, by, w, h, 12); g.fillStyle = fill; g.fill(); if (light) { g.strokeStyle = P.line; g.lineWidth = 2.5; g.stroke(); }
    g.beginPath(); if (down) { g.moveTo(px - 14, by + 1); g.lineTo(px, y + 4); g.lineTo(px + 14, by + 1); } else { g.moveTo(px - 14, by + h - 1); g.lineTo(px, y - 4); g.lineTo(px + 14, by + h - 1); }
    g.closePath(); g.fill(); if (light) { g.stroke(); g.fillStyle = fill; g.fillRect(px - 12, down ? by + 1 : by + h - 4, 24, 3); }
    text(g, s, bx + w / 2, by + h / 2 + 1, size, { col: light ? (o.col || P.ink) : (o.col || P.white), al: 'center', wt: 800 });
    return { x: bx, y: by, w, h };
  }
  function check(g, x, y, r, p, o = {}) { // галочка в кружке, p 0…1
    if (p <= 0) return; const e = eb(pr(p, 0, .55)), q = pr(p, .3, 1);
    circle(g, x, y, r * e, o.col || P.teal);
    if (q > 0) {
      const pts = [[-.36, .02], [-.1, .28], [.38, -.24]], seg1 = Math.hypot(.26, .26), seg2 = Math.hypot(.48, .52), Lt = (seg1 + seg2) * r;
      g.save(); g.strokeStyle = o.tcol || P.white; g.lineWidth = r * .2; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash([Lt, Lt]); g.lineDashOffset = Lt * (1 - eo(q));
      g.beginPath(); pts.forEach((pt, i) => (i ? g.lineTo : g.moveTo).call(g, x + pt[0] * r, y + pt[1] * r)); g.stroke(); g.restore();
    }
  }
  function dim(g, a, col) { if (a <= 0) return; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = rgba(col || P.slate, a); g.fillRect(0, 0, W, H); g.restore(); }
  // Всплывающая панель «обоснование» справа (или снизу при o.from = 'bottom'); fn(g, e) рисует в локальных координатах панели.
  function popup(g, t, t0, x, y, w, h, fn, o = {}) {
    const p = pr(t, t0, t0 + .42), q = o.out != null ? pr(t, o.out, o.out + .28) : 0; if (p <= 0 || q >= 1) return 0;
    const e = eo5(p) * (1 - eio(q));
    if (o.dim !== false) dim(g, .3 * e);
    g.save();
    if (o.from === 'bottom') g.translate(0, (1 - e) * (H - y + 40)); else g.translate((1 - e) * (W - x + 40), 0);
    card(g, x, y, w, h, { r: 18, line: null, shadow: 1.4 }); g.translate(x, y); fn(g, e); g.restore(); return e;
  }
  function ripple(g, t, t0, x, y, o = {}) {
    const p = pr(t, t0, t0 + .45); if (p <= 0 || p >= 1) return;
    g.save(); g.strokeStyle = o.col || P.teal; g.globalAlpha *= (1 - p) * .85; g.lineWidth = 7 * (1 - p) + 1.5;
    g.beginPath(); g.arc(x, y, 12 + 54 * eo(p), 0, PI2); g.stroke(); g.restore();
  }
  const CUR = [[0, 0], [0, 25], [6, 19.5], [10.5, 29], [14.6, 27.2], [10.2, 17.8], [18, 17.8]];
  function arrowPath(g, dx, dy) { g.beginPath(); CUR.forEach((p, i) => (i ? g.lineTo(p[0] + dx, p[1] + dy) : g.moveTo(p[0] + dx, p[1] + dy))); g.closePath(); }
  // Курсор-«рука аналитика». keys: [[t, x, y, 'click'|'down'|'up'|0], …]: ход между ключами с изингом, нажатия с кругом.
  function cursor(g, t, keys, o = {}) {
    const n = keys.length; if (!n) return null;
    const tA = keys[0][0], tB = keys[n - 1][0];
    if (t < tA - .3 || t > tB + .45) return null;
    let x, y;
    if (t <= tA) { x = keys[0][1]; y = keys[0][2]; } else if (t >= tB) { x = keys[n - 1][1]; y = keys[n - 1][2]; }
    else { let i = 0; while (i < n - 2 && t >= keys[i + 1][0]) i++; const a = keys[i], b = keys[i + 1], p = eio(pr(t, a[0], b[0])); x = lerp(a[1], b[1], p); y = lerp(a[2], b[2], p); }
    const ain = eo(pr(t, tA - .3, tA)), aout = 1 - pr(t, tB + .2, tB + .45);
    x += (1 - ain) * 110; y += (1 - ain) * 150;
    let press = 0;
    for (let i = 0; i < n; i++) {
      const k = keys[i];
      if (k[3] === 'click') { press = Math.max(press, 1 - Math.abs(t - k[0]) / .13); ripple(g, t, k[0], k[1], k[2], o); }
      else if (k[3] === 'down') {
        let te = tB; for (let j = i + 1; j < n; j++) if (keys[j][3] === 'up') { te = keys[j][0]; break; }
        press = Math.max(press, Math.min(pr(t, k[0] - .1, k[0]), 1 - pr(t, te, te + .1))); ripple(g, t, k[0], k[1], k[2], o);
      }
    }
    press = cl(press);
    const s = (o.s || 2.2) * (1 - .14 * press), a = Math.min(ain, aout);
    g.save(); g.globalAlpha *= a; g.translate(x, y); g.scale(s, s);
    g.fillStyle = 'rgba(16,32,43,.2)'; arrowPath(g, 1.6, 2.6); g.fill();
    g.fillStyle = P.white; arrowPath(g, 0, 0); g.fill(); g.strokeStyle = P.ink; g.lineWidth = 1.7; g.lineJoin = 'round'; g.stroke();
    g.restore(); return { x, y, press };
  }
  // Тёмная плашка-подсказка внизу (как субтитр): items [[t0, t1, "слова@t *ключ@t"], …].
  // Плашка «печатается»: растёт вправо от левого края по мере появления слов, в конце стоит по центру.
  function pill(g, t, items, o = {}) {
    let it = null; for (const q of items) if (t >= q[0] && t < q[1]) { it = q; break; } if (!it) return;
    const [t0, t1, spec] = it, y = o.y || L.pill, maxW = o.max || 940, toks = parse(spec).filter(q => !q.br);
    let sz = o.size || 46, f, sw, ws, tw = 0;
    for (let n = 0; n < 12; n++) {
      f = font(sz, 700); sw = mw(g, ' ', f); ws = toks.map(q => mw(g, q.s, f)); tw = ws.reduce((a, b) => a + b, 0) + sw * (toks.length - 1);
      if (tw <= maxW - sz * 1.3 || sz <= 34) break; sz = Math.floor(sz * .95);
    }
    const h = Math.round(sz * 2.05), pad = sz * .65, xl = L.cx - (tw + pad * 2) / 2, pout = pr(t, t1 - .22, t1);
    let prev = t0, ext = 0; const T = toks.map(q => { let tt = q.t != null ? q.t : prev + .1; prev = tt; return Math.max(tt, t0 + .06); });
    toks.forEach((q, i) => { ext += (ws[i] + (i ? sw : 0)) * eo(pr(t, T[i] - .05, T[i] + .2)); });
    const pin = eo5(pr(t, t0, t0 + .16)), wv = Math.max(h * pin, (pad * 2 + ext) * lerp(1, .94, eo(pout))), a = Math.min(1, pin * 2.5) * (1 - eo(pout));
    if (a <= 0) return;
    g.save(); g.globalAlpha *= a;
    const x0 = ext > 0 ? xl : xl + (h - wv) / 2, hh = ext > 0 ? h : h * pin;
    shade(g, x0, y - hh / 2, wv, hh, hh / 2, .9, 8);
    rr(g, x0, y - hh / 2, wv, hh, hh / 2); g.fillStyle = o.fill || P.slate; g.fill(); g.clip();
    g.font = f; g.textAlign = 'left'; g.textBaseline = 'middle'; let cx = xl + pad; const ga = g.globalAlpha;
    toks.forEach((q, i) => {
      const ap = eo(pr(t, T[i], T[i] + .26));
      if (ap > 0) { g.globalAlpha = ga * ap; g.fillStyle = q.key ? (o.kcol || P.key) : P.white; g.fillText(q.s, cx, y + 1 + (1 - ap) * sz * .25); }
      cx += ws[i] + sw;
    });
    g.restore();
  }

  // ---------- фон, HUD ----------
  const PAT = new WeakMap();
  function pat(g, kind) { // узоры (кэш на контекст): dots | hatch
    let m = PAT.get(g); if (!m) { m = {}; PAT.set(g, m); }
    if (!m[kind]) {
      const c = new OffscreenCanvas(kind === 'dots' ? 28 : 18, kind === 'dots' ? 28 : 18), x = c.getContext('2d');
      if (kind === 'dots') { x.fillStyle = '#DCE5E9'; x.beginPath(); x.arc(14, 14, 2, 0, PI2); x.fill(); }
      else { x.strokeStyle = P.teal; x.globalAlpha = .5; x.lineWidth = 3; x.beginPath(); for (let i = -18; i <= 36; i += 9) { x.moveTo(i, 18); x.lineTo(i + 18, 0); } x.stroke(); }
      m[kind] = g.createPattern(c, 'repeat');
    }
    return m[kind];
  }
  function bg(g, t, o = {}) { // лист: белый фон + бледная крупная цифра раздела с медленным дрейфом
    g.fillStyle = o.col || P.page; g.fillRect(-8, -60, W + 16, H + 120);
    if (o.mark) {
      const lt = o.lt || 0, a = eo(pr(lt, .15, .9));
      if (a > 0) text(g, o.mark, 1046 - lt * 7 + (1 - a) * 50, o.my || 1290, o.ms || 470, { col: o.mcol || P.tealPP, al: 'right', wt: 800, a, base: 'alphabetic' });
    }
  }
  function dots(g, x, y, w, h) { g.fillStyle = pat(g, 'dots'); g.fillRect(x, y, w, h); }
  function hatch(g, x, y, w, h, o = {}) { // заштрихованный столбик «прогноз/план»
    if (w <= 0 || h <= 0) return;
    rr(g, x, y, w, h, o.r == null ? 8 : o.r); g.fillStyle = o.fill || P.tealP; g.fill(); g.fillStyle = pat(g, 'hatch'); g.fill();
    g.save(); g.strokeStyle = o.col || P.teal; g.lineWidth = 3; g.setLineDash([10, 7]); g.stroke(); g.restore();
  }
  // Верх: сегменты прогресса отчёта, бренд, статус-бирка (флип при смене); низ: источник и номер страницы.
  function hud(g, t, o) {
    const a = o.a == null ? 1 : o.a; if (a <= 0) return;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a;
    const n = o.total || 1, gap = 10, sw = (L.w - gap * (n - 1)) / n, y = 114;
    for (let j = 0; j < n; j++) {
      const x = L.x0 + j * (sw + gap); rr(g, x, y, sw, 7, 3.5); g.fillStyle = P.grid; g.fill();
      const f = j < o.page - 1 ? 1 : j === o.page - 1 ? pr(t, o.t0, o.t1) : 0;
      if (f > 0) { rr(g, x, y, Math.max(7, sw * f), 7, 3.5); g.fillStyle = P.teal; g.fill(); }
    }
    const by = 168;
    if (o.brand) { cup(g, L.x0 + 15, by + 19, .088, { shadow: false }); text(g, o.brand, L.x0 + 46, by, 28, { col: P.ink2, wt: 700 }); }
    if (o.status) {
      const S = o.status; let i = 0; while (i < S.length - 1 && t >= S[i + 1][0]) i++;
      let k = i, sy = 1; const tc = i < S.length - 1 ? S[i + 1][0] : 1e9, tp = S[i][0];
      const ph1 = pr(t, tc - .16, tc), ph2 = pr(t, tp, tp + .16);
      if (ph1 > 0) sy = 1 - eio(ph1); else if (i > 0 && ph2 < 1) sy = eio(ph2);
      const dark = !!S[k][2];
      g.save(); g.translate(L.x1, by); g.scale(1, Math.max(.02, sy));
      chip(g, S[k][1], 0, 0, { al: 'right', size: 25, fill: dark ? P.teal : P.page, line: dark ? null : P.teal, col: dark ? P.white : P.teal, tr: 3 });
      g.restore();
      if (i > 0 && t - tp < .6 && t >= tp) ripple(g, t, tp + .05, L.x1 - 70, by, { col: P.teal });
    }
    if (o.src) text(g, o.src, L.x0, L.foot, 22, { col: P.faint, wt: 600 });
    if (o.total) text(g, 'стр. ' + o.page + ' / ' + o.total, L.x1, L.foot, 22, { col: P.faint, wt: 700, al: 'right' });
    g.restore();
  }

  // ---------- графики ----------
  function gridY(g, x, y, w, h, o = {}) { // горизонтальная сетка со шкалой слева; o.p: прорисовка, o.la: прозрачность подписей
    const mn = o.min || 0, mx = o.max == null ? 1 : o.max, st = o.step || (mx - mn) / 4, p = o.p == null ? 1 : o.p, dec = o.dec || 0;
    if (p <= 0) return; let i = 0;
    for (let v = mn; v <= mx + 1e-9; v += st, i++) {
      const yy = y + h - (v - mn) / (mx - mn) * h, q = eo(cl(p * 1.6 - i * .12)); if (q <= 0) continue;
      g.strokeStyle = i === 0 ? P.line : P.grid; g.lineWidth = i === 0 ? 3 : 2;
      g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w * q, yy); g.stroke();
      if (o.labels !== false) text(g, o.fmt ? o.fmt(v) : fmt(v, dec), x - 16, yy, o.size || 28, { col: P.mute, al: 'right', wt: 600, a: q * (o.la == null ? 1 : o.la) });
    }
  }
  function axisX(g, xs, y, labels, o = {}) { labels.forEach((s, i) => spaced(g, s, xs[i], y, o.size || 26, { col: o.col || P.mute, al: 'center', tr: 2, a: o.a == null ? 1 : (typeof o.a === 'function' ? o.a(i) : o.a) })); }
  function plen(pts) { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; }
  function along(pts, d) { // точка на ломаной на расстоянии d: [x, y, угол]
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (d <= l || i === pts.length - 1) { const f = l ? cl(d / l) : 0; return [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f), Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0])]; }
      d -= l;
    }
    return [pts[0][0], pts[0][1], 0];
  }
  // Линия графика, рисуется на долю p длины; o.fill + o.base: заливка под линией; o.dots: радиус точек; возвращает кончик {x,y,i}
  function line(g, pts, p, o = {}) {
    p = cl(p); const segs = []; let tot = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); tot += l; }
    let rem = tot * p, tip = { x: pts[0][0], y: pts[0][1], i: 0 }; const path = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      if (rem >= segs[i - 1] - 1e-6) { path.push(pts[i]); rem -= segs[i - 1]; tip = { x: pts[i][0], y: pts[i][1], i }; }
      else { const f = rem / segs[i - 1], q = [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]; if (f > 0) path.push(q); tip = { x: q[0], y: q[1], i: i - 1 + f }; break; }
    }
    if (p <= 0) return tip;
    if (o.fill && path.length > 1) { g.fillStyle = o.fill; g.beginPath(); g.moveTo(path[0][0], o.base); path.forEach(q => g.lineTo(q[0], q[1])); g.lineTo(path[path.length - 1][0], o.base); g.closePath(); g.fill(); }
    g.strokeStyle = o.col || P.teal; g.lineWidth = o.lw || 7; g.lineJoin = 'round'; g.lineCap = 'round';
    if (path.length > 1) { g.beginPath(); path.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.stroke(); }
    if (o.dots) for (let i = 0; i < pts.length; i++) {
      const d = tip.i - i; if (d < -1e-6) break;
      const r = o.dots * (i === o.hi ? 1.45 : 1) * eb(cl(d * 2.5 + (i === pts.length - 1 && p >= 1 ? 1 : 0)));
      circle(g, pts[i][0], pts[i][1], r, P.white); g.strokeStyle = i === o.hi ? (o.hiCol || P.tealD) : (o.col || P.teal); g.lineWidth = o.dots * .55; g.stroke();
      if (i === o.hi) circle(g, pts[i][0], pts[i][1], r * .45, o.hiCol || P.tealD);
    }
    return tip;
  }
  // Вертикальные столбики, растут пружиной по очереди. vals: числа; o: max, t0, step, gap, hi (индекс), hiK 0…1, fmt, size
  function vbars(g, t, x, y, w, h, vals, o = {}) {
    const n = vals.length, gap = o.gap == null ? 22 : o.gap, bw = (w - gap * (n - 1)) / n, mx = o.max || Math.max(...vals), out = [];
    vals.forEach((v, i) => {
      const gp = sp(stag(t, o.t0 || 0, i, o.step || .08, .7)); if (gp <= 0) { out.push(null); return; }
      const bh = h * v / mx * gp, bx = x + i * (bw + gap), hiK = i === o.hi ? cl(o.hiK == null ? 1 : o.hiK) : 0;
      g.fillStyle = mix(o.col || P.tealL, o.hiCol || P.teal, hiK); rr(g, bx, y + h - bh, bw, bh, Math.min(8, bw / 4)); g.fill();
      g.fillRect(bx, y + h - Math.min(bh, 8), bw, Math.min(bh, 8));
      if (o.fmt !== false) text(g, o.fmt ? o.fmt(v, i) : fmt(v, o.dec || 0), bx + bw / 2, y + h - bh - 30, o.size || 36, { al: 'center', wt: 800, col: hiK > .5 ? P.teal : P.ink, a: eo(stag(t, (o.t0 || 0) + .3, i, o.step || .08, .3)) });
      out.push({ x: bx, y: y + h - bh, w: bw, h: bh });
    });
    return out;
  }
  // Горизонтальный рейтинг с пересортировкой: rows [{l, a, b, hi}], o.sw 0…1 переключает срез a→b (строки меняются местами)
  function hbars(g, t, x, y, w, rowH, rows, o = {}) {
    const n = rows.length, es = eio(cl(o.sw || 0)), rank = key => { const idx = rows.map((_, i) => i).sort((p, q) => rows[q][key] - rows[p][key]); const rk = []; idx.forEach((ri, k) => (rk[ri] = k)); return rk; };
    const rA = rank('a'), rB = rank('b'), size = o.size || 44, lsz = o.lsize || 38, bh = o.bh || 52, barW = o.barW || w - 200, out = [];
    const order = rows.map((_, i) => i).sort((p, q) => (rows[p].hi ? 1 : 0) - (rows[q].hi ? 1 : 0));
    for (const i of order) {
      const r = rows[i], yy = y + lerp(rA[i], rB[i], es) * rowH, t0 = (o.t0 || 0) + rA[i] * (o.step || .08);
      const ap = eo(pr(t, t0, t0 + .3)), gp = sp(pr(t, t0 + .08, t0 + .78)); if (ap <= 0) continue;
      const v = lerp(r.a / o.maxA, r.b / o.maxB, es), bw = Math.max(8, barW * v * gp), hiK = r.hi ? cl(o.hiK == null ? 1 : o.hiK) : 0;
      text(g, r.l, x, yy + lsz * .6, lsz, { col: hiK > .5 ? P.ink : P.ink2, wt: hiK > .5 ? 800 : 700, a: ap });
      const by = yy + lsz * 1.25 + 8;
      g.save(); g.globalAlpha *= ap; g.fillStyle = mix(o.col || P.tealL, o.hiCol || P.teal, hiK); rr(g, x, by, bw, bh, 6); g.fill(); g.restore();
      const va = o.fa ? o.fa(r.a) : fmt(r.a), vb = o.fb ? o.fb(r.b) : fmt(r.b), vx = x + bw + 18, vy = by + bh / 2 + 1, vc = hiK > .5 ? P.teal : P.ink;
      if (es < .5) text(g, va, vx, vy, size, { wt: 800, col: vc, a: ap * (1 - es * 2) * eo(pr(gp, .5, 1)) });
      if (es > .5) text(g, vb, vx, vy, size, { wt: 800, col: vc, a: (es - .5) * 2 });
      out[i] = { x, y: yy, by, bw, bh, x1: x + bw };
    }
    return out;
  }
  // Санки: левый узел (итог) расходится на правые узлы. o: x0, y0, h, nw, x1, gap, items [{l, v, hi}], p (прорисовка), hiK, fmt, size, left {l}
  function sankey(g, t, o) {
    const its = o.items, tot = its.reduce((s, it) => s + it.v, 0), gap = o.gap || 16, nw = o.nw || 36, p = cl(o.p == null ? 1 : o.p), hiK = cl(o.hiK || 0);
    const sc = (o.h - gap * (its.length - 1)) / tot, xa = o.x0 + nw, mxx = (xa + o.x1) / 2, size = o.size || 38;
    if (p <= 0) return [];
    g.fillStyle = P.ink; g.fillRect(o.x0, o.y0, nw, o.h * eo(pr(p, 0, .3)));
    g.save(); g.beginPath(); g.rect(xa, o.y0 - 50, (o.x1 + nw - xa) * eo(p) + 2, o.h + 100); g.clip();
    let ly = o.y0, ry = o.y0; const out = [];
    its.forEach((it, i) => {
      const lh = it.v * o.h / tot, hh = it.v * sc;
      g.beginPath(); g.moveTo(xa, ly); g.bezierCurveTo(mxx, ly, mxx, ry, o.x1, ry); g.lineTo(o.x1, ry + hh); g.bezierCurveTo(mxx, ry + hh, mxx, ly + lh, xa, ly + lh); g.closePath();
      g.fillStyle = it.hi ? mix(P.tealL, P.teal, hiK) : rgba(P.tealM, lerp(.32, .2, hiK)); g.fill();
      g.fillStyle = it.hi ? mix(P.tealM, P.tealD, hiK) : mix(P.tealM, P.tealL, hiK * .6); g.fillRect(o.x1, ry, nw, hh);
      out.push({ y: ry, h: hh, yc: ry + hh / 2 }); ly += lh; ry += hh + gap;
    });
    g.restore();
    its.forEach((it, i) => {
      const a = eo(pr(p, .55 + i * .08, .85 + i * .08)); if (a <= 0) return;
      const lx = o.x1 + nw + 22, yc = out[i].yc, hi = it.hi && hiK > .4;
      const w1 = text(g, it.l, lx, yc, size * .88, { col: hi ? P.ink : P.ink2, wt: hi ? 800 : 600, a });
      text(g, o.fmt ? o.fmt(it.v) : fmt(it.v, 1), lx + w1 + 16, yc, size, { col: hi ? P.teal : P.ink, wt: 800, a });
    });
    return out;
  }
  function donut(g, x, y, r, lw, f, o = {}) {
    g.save(); g.lineWidth = lw; g.lineCap = 'butt'; g.strokeStyle = o.bg || P.grid; g.beginPath(); g.arc(x, y, r, 0, PI2); g.stroke();
    if (f > 0) { g.strokeStyle = o.col || P.teal; g.beginPath(); g.arc(x, y, r, -PI / 2, -PI / 2 + PI2 * cl(f)); g.stroke(); }
    g.restore();
  }
  function stack(g, x, y, w, h, parts, p = 1, o = {}) { // 100 %-полоса: parts [{v, col, l}]
    const tot = parts.reduce((s, q) => s + q.v, 0); let cx = x;
    rr(g, x, y, w, h, o.r == null ? 10 : o.r); g.save(); g.clip(); g.fillStyle = P.grid; g.fillRect(x, y, w, h);
    parts.forEach(q => { const qw = w * q.v / tot * eo(p); g.fillStyle = q.col || P.teal; g.fillRect(cx, y, qw, h); if (q.l && qw > 60) text(g, q.l, cx + 24, y + h / 2 + 2, o.size || Math.min(h * .52, 60), { col: q.tcol || P.white, wt: 800, a: eo(pr(p, .6, 1)) }); cx += qw; });
    g.restore();
  }
  function timeline(g, x, y, w, labels, o = {}) { // ось времени с точками; o.p: прорисовка, o.on: сколько точек «пройдено» (дробно)
    const n = labels.length, xs = labels.map((_, i) => x + (n === 1 ? w / 2 : i * w / (n - 1))), p = o.p == null ? 1 : o.p;
    if (p <= 0) return xs;
    g.strokeStyle = P.line; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w * eo(p), y); g.stroke();
    const on = o.on == null ? -1 : o.on;
    if (on > 0) { g.strokeStyle = P.teal; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w * cl(on / Math.max(1, n - 1)), y); g.stroke(); }
    xs.forEach((tx, i) => {
      const a = eo(pr(p * n, i, i + 1)); if (a <= 0) return; const lit = cl(on - i + 1);
      circle(g, tx, y, (o.r || 12) * eb(a), lit > 0 ? mix(P.page, P.teal, lit) : P.page); g.strokeStyle = lit > 0 ? P.teal : P.faint; g.lineWidth = 4; g.stroke();
      spaced(g, labels[i], tx, y + (o.dy || 44), o.size || 26, { col: lit >= 1 ? P.ink2 : P.mute, al: 'center', tr: 2.5, a });
    });
    return xs;
  }
  // Частицы вдоль пути (зёрна по конвейеру и т. п.): fn(g, x, y, ang, i, a)
  function flow(g, t, pts, n, fn, o = {}) {
    const tot = plen(pts), spd = o.speed || 140, fade = o.fade || 40;
    for (let i = 0; i < n; i++) { const d = ((t * spd + i * tot / n) % tot + tot) % tot, q = along(pts, d), a = Math.min(1, d / fade, (tot - d) / fade); fn(g, q[0], q[1], q[2], i, a); }
  }

  // ---------- герои и предметы ----------
  function bean(g, x, y, r, rot = 0, o = {}) { // кофейное зерно, r: полудлина
    g.save(); g.translate(x, y); g.rotate(rot * DEG); if (o.a != null) g.globalAlpha *= o.a;
    g.fillStyle = o.col || P.tealD; g.beginPath(); g.ellipse(0, 0, r, r * .68, 0, 0, PI2); g.fill();
    g.strokeStyle = o.groove || 'rgba(255,255,255,.55)'; g.lineWidth = Math.max(1.5, r * .15); g.lineCap = 'round';
    g.beginPath(); g.moveTo(-r * .78, 0); g.bezierCurveTo(-r * .3, -r * .32, r * .3, r * .32, r * .78, 0); g.stroke(); g.restore();
  }
  // Сквозной герой: стакан навынос «Зерно». (x, y): середина дна; высота ≈ 400·s. o: steam (t для пара), ghost 0…1 (серый «пустой»),
  // sleeve/body/lid/mark: свои цвета, shadow:false, a: прозрачность
  function cup(g, x, y, s = 1, o = {}) {
    const a = o.a == null ? 1 : o.a; if (a <= 0 || s <= 0) return;
    const gh = cl(o.ghost || 0);
    const body = o.body || mix(P.body, '#F1F3F4', gh), sh = o.shadeC || mix(P.shade, '#E4E8EA', gh), sleeve = o.sleeve || mix(P.teal, '#C9D3D8', gh);
    const lid = o.lid || mix(P.ink, '#AEB8BF', gh), mark = o.mark || P.white;
    g.save(); g.globalAlpha *= a; g.translate(x, y); g.scale(s, s);
    if (o.shadow !== false) { g.fillStyle = 'rgba(16,40,52,.1)'; g.beginPath(); g.ellipse(0, 2, 128, 14, 0, 0, PI2); g.fill(); }
    const bw = 102, tw = 132, hb = 318, hw = yy => bw + (tw - bw) * (-yy / hb);
    g.fillStyle = body; g.beginPath(); g.moveTo(-bw, 0); g.lineTo(bw, 0); g.lineTo(tw, -hb); g.lineTo(-tw, -hb); g.closePath(); g.fill();
    g.fillStyle = sh; g.beginPath(); g.moveTo(bw - 30, 0); g.lineTo(bw, 0); g.lineTo(tw, -hb); g.lineTo(tw - 40, -hb); g.closePath(); g.fill();
    const s0 = -84, s1 = -230;
    g.fillStyle = sleeve; g.beginPath(); g.moveTo(-hw(s0) - 4, s0); g.lineTo(hw(s0) + 4, s0); g.lineTo(hw(s1) + 4, s1); g.lineTo(-hw(s1) - 4, s1); g.closePath(); g.fill();
    bean(g, 0, (s0 + s1) / 2, 44, -32, { col: mark, groove: sleeve });
    g.fillStyle = lid; rr(g, -tw - 12, -hb - 36, (tw + 12) * 2, 38, 14); g.fill();
    g.beginPath(); g.moveTo(-tw + 6, -hb - 34); g.lineTo(-tw + 30, -hb - 76); g.lineTo(tw - 30, -hb - 76); g.lineTo(tw - 6, -hb - 34); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.25)'; rr(g, 26, -hb - 68, 56, 13, 6.5); g.fill();
    if (o.steam != null) {
      g.strokeStyle = o.steamCol || P.tealL; g.lineWidth = 13; g.lineCap = 'round'; g.setLineDash([46, 34]); g.lineDashOffset = -o.steam * 90;
      for (let i = 0; i < 3; i++) {
        g.globalAlpha = a * (.75 - Math.abs(i - 1) * .15); g.beginPath();
        for (let k = 0; k <= 10; k++) { const yy = -hb - 100 - k * 15, xx = (i - 1) * 50 + 11 * Math.sin(k * .7 + i * 2.1 + o.steam * 2.6); k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
        g.stroke();
      }
      g.setLineDash([]);
    }
    g.restore();
  }
  function sprout(g, x, y, s = 1, o = {}) { // ферма: росток с ягодами кофе (≈100 px при s=1, центр)
    g.save(); g.translate(x, y); g.scale(s, s); const c = o.col || P.teal;
    g.fillStyle = P.tealL; rr(g, -46, 34, 92, 12, 6); g.fill();
    g.strokeStyle = c; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 36); g.quadraticCurveTo(6, 4, 0, -34); g.stroke();
    const leaf = (lx, ly, len, ang) => { g.save(); g.translate(lx, ly); g.rotate(ang * DEG); g.fillStyle = c; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * .5, -len * .45, len, 0); g.quadraticCurveTo(len * .5, len * .45, 0, 0); g.fill(); g.restore(); };
    leaf(1, -6, 40, -160); leaf(2, -22, 36, -25); leaf(0, -34, 26, -95);
    [[16, 10], [24, 20], [12, 22]].forEach(([bx, by]) => circle(g, bx, by, 7.5, o.berry || P.tealD));
    g.restore();
  }
  function ship(g, x, y, s = 1, o = {}) { // импортёр: судно с контейнерами
    g.save(); g.translate(x, y); g.scale(s, s);
    [[-36, -20, P.teal], [-6, -20, P.tealM], [24, -20, P.tealL], [-21, -42, P.tealM], [9, -42, P.teal]].forEach(([cx, cy, c]) => { g.fillStyle = c; g.fillRect(cx, cy, 28, 20); });
    g.fillStyle = o.col || P.ink; g.beginPath(); g.moveTo(-54, 2); g.lineTo(56, 2); g.lineTo(42, 30); g.lineTo(-44, 30); g.closePath(); g.fill(); g.fillRect(-50, -34, 12, 36);
    g.strokeStyle = P.tealL; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath();
    for (let i = 0; i <= 10; i++) { const xx = -54 + i * 11, yy = 42 + Math.sin(i * 1.4) * 3.5; i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); g.restore();
  }
  function depot(g, x, y, s = 1, o = {}) { // оптовик: склад с рольставнем
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = o.col || P.ink; g.beginPath(); g.moveTo(-54, -10); g.lineTo(0, -46); g.lineTo(54, -10); g.closePath(); g.fill();
    g.fillStyle = P.body; g.fillRect(-46, -10, 92, 52); g.fillStyle = P.tealM; g.fillRect(-26, 4, 52, 38);
    g.strokeStyle = P.tealD; g.lineWidth = 3; for (let yy = 11; yy < 42; yy += 8) { g.beginPath(); g.moveTo(-26, yy); g.lineTo(26, yy); g.stroke(); }
    g.restore();
  }
  function store(g, x, y, s = 1, o = {}) { // кофейня-точка с маркизой (≈110×100 при s=1, центр)
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = P.body; g.fillRect(-46, -22, 92, 66); g.fillStyle = P.shade; g.fillRect(30, -22, 16, 66);
    g.fillStyle = o.sign || P.ink; rr(g, -52, -54, 104, 22, 5); g.fill(); bean(g, 0, -43, 7, -30, { col: P.white, groove: o.sign || P.ink });
    const n = 6, w = 104 / n;
    for (let i = 0; i < n; i++) { const x0 = -52 + i * w; g.fillStyle = i % 2 ? P.tealL : P.teal; g.beginPath(); g.moveTo(x0, -34); g.lineTo(x0 + w, -34); g.lineTo(x0 + w, -18); g.arc(x0 + w / 2, -18, w / 2, 0, PI); g.closePath(); g.fill(); }
    g.fillStyle = P.tealP; g.fillRect(-38, -2, 42, 30); g.strokeStyle = P.tealM; g.lineWidth = 3; g.strokeRect(-38, -2, 42, 30);
    g.fillStyle = P.teal; g.fillRect(12, -2, 24, 46); circle(g, 30, 22, 2.5, P.white);
    g.fillStyle = P.line; g.fillRect(-60, 44, 120, 4); g.restore();
  }
  function scooter(g, x, y, s = 1, o = {}) { // доставка: скутер с кофром (≈130×100 при s=1, центр); o.t: линии скорости
    g.save(); g.translate(x, y); g.scale(s, s);
    if (o.t != null) { g.strokeStyle = P.tealL; g.lineWidth = 5; g.lineCap = 'round'; for (let i = 0; i < 3; i++) { const ph = (o.t * 1.7 + i * .37) % 1, xx = -78 - ph * 34; g.globalAlpha = (1 - ph) * .9; g.beginPath(); g.moveTo(xx, -30 + i * 15); g.lineTo(xx + 26, -30 + i * 15); g.stroke(); } g.globalAlpha = 1; }
    g.fillStyle = P.tealD; rr(g, -56, -50, 50, 44, 7); g.fill(); bean(g, -31, -28, 9, -30, { col: P.white, groove: P.tealD });
    g.fillStyle = P.ink; rr(g, -46, -8, 44, 11, 5); g.fill();
    g.fillStyle = P.teal; rr(g, -50, 4, 84, 15, 7); g.fill();
    g.strokeStyle = P.teal; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.moveTo(28, 12); g.lineTo(42, -36); g.stroke();
    g.strokeStyle = P.ink; g.lineWidth = 7; g.beginPath(); g.moveTo(32, -38); g.lineTo(56, -40); g.stroke();
    [[-36, 28], [44, 28]].forEach(([wx, wy]) => { circle(g, wx, wy, 16, P.ink); circle(g, wx, wy, 6, P.body); });
    g.restore();
  }
  // Чек кофейни: бумага «печатается» вниз. o: t0, rows [{l, r, t, hi}], head, total {l, draw(g, xr, yb) | r}, rowH, size
  function receipt(g, t, x, y, w, o) {
    const rowH = o.rowH || 64, size = o.size || 36, headH = 118, totH = o.totH || 190, rows = o.rows || [];
    let rowsH = 0; const rp = rows.map(r => { const k = sp(pr(t, r.t, r.t + .5)); rowsH += rowH * k; return k; });
    const pp = eo(pr(t, o.t0 || 0, (o.t0 || 0) + .5)), fullH = headH + rowsH + totH + 30, h = fullH * pp; if (h <= 4) return;
    shade(g, x, y, w, h, 4, .9);
    const tooth = 22, nT = Math.round(w / tooth), tw = w / nT;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w, y + h - 10);
    for (let i = nT; i > 0; i--) { g.lineTo(x + (i - .5) * tw, y + h); g.lineTo(x + (i - 1) * tw, y + h - 10); }
    g.closePath(); g.fillStyle = P.page; g.fill(); g.strokeStyle = P.line; g.lineWidth = 2.5; g.stroke();
    g.save(); if (pp < 1) { g.beginPath(); g.rect(x, y, w, h); g.clip(); }
    cup(g, x + 58, y + 84, .13, { shadow: false }); text(g, o.head || 'ЧЕК', x + 92, y + 58, 30, { fam: 'mono', wt: 700, col: P.ink2 });
    if (o.sub) text(g, o.sub, x + w - 34, y + 58, 26, { fam: 'mono', wt: 700, col: P.mute, al: 'right' });
    dline(g, x + 30, y + headH - 14, x + w - 30, y + headH - 14, { col: P.line, dash: [8, 8], lw: 3 });
    let yy = y + headH;
    rows.forEach((r, i) => {
      const k = rp[i]; if (k <= 0) return; const a = eo(pr(t, r.t + .1, r.t + .4)), cy = yy + rowH * k / 2 + 2;
      if (r.hi) { g.globalAlpha = a; g.fillStyle = P.tealP; g.fillRect(x + 16, yy + 4, w - 32, rowH * k - 8); g.globalAlpha = 1; }
      const lw = text(g, r.l, x + 34, cy, size, { fam: 'mono', wt: 700, col: r.hi ? P.tealD : P.ink, a });
      const rw = text(g, r.r, x + w - 34, cy, size, { fam: 'mono', wt: 700, col: r.hi ? P.tealD : P.ink, al: 'right', a });
      if (a > 0) { g.globalAlpha = a * .8; dline(g, x + 48 + lw, cy + size * .3, x + w - 48 - rw, cy + size * .3, { col: P.faint, dash: [3, 9], lw: 3 }); g.globalAlpha = 1; }
      yy += rowH * k;
    });
    dline(g, x + 30, yy + 18, x + w - 30, yy + 18, { col: P.ink2, dash: [8, 8], lw: 3 });
    const tb = yy + 30 + totH * .62;
    text(g, (o.total && o.total.l) || 'ИТОГО', x + 34, tb - size * .9, size, { fam: 'mono', wt: 800, col: P.ink2 });
    if (o.total && o.total.draw) o.total.draw(g, x + w - 34, tb); else if (o.total && o.total.r) text(g, o.total.r, x + w - 34, tb, 90, { wt: 800, al: 'right', base: 'alphabetic' });
    g.restore();
  }

  // ---------- карточка KPI ----------
  // Карточка с крупным числом. o: label, v (число, бежит odo), dec, step, unit, pre, size, note, dark (бирюзовая), pale (бледная), icon(g, x, y)
  function kpi(g, x, y, w, h, o = {}) {
    const dark = !!o.dark, fill = dark ? P.teal : o.pale ? P.tealP : P.page;
    card(g, x, y, w, h, { fill, line: dark || o.pale ? null : P.line, r: o.r == null ? 14 : o.r, shadow: o.shadow });
    if (o.label) spaced(g, o.label, x + 40, y + 50, 27, { col: dark ? P.onDark : P.teal, tr: 3 });
    const size = o.size || 140;
    if (o.v != null) odo(g, o.v, x + 36, y + 50 + 30 + size * .78, size, { dec: o.dec, step: o.step, unit: o.unit, pre: o.pre, a: o.va, col: dark ? P.white : (o.col || P.ink), ucol: dark ? P.onDark : P.ink2 });
    if (o.note) text(g, o.note, x + 40, y + h - 42, 30, { col: dark ? P.onDark : P.mute, wt: 600 });
    if (o.icon) o.icon(g, x, y, w, h);
  }

  // ---------- миниатюры, камера, листание страниц ----------
  const TH = new Map();
  function thumb(key, w, h, fn) { // кэш миниатюры: fn(g) рисует полный кадр 1080×1920, он уменьшается в w×h
    let c = TH.get(key);
    if (!c) { c = new OffscreenCanvas(w, h); const x = c.getContext('2d'); x.scale(w / W, h / H); x.lineJoin = 'round'; fn(x); TH.set(key, c); }
    return c;
  }
  function camera(g, pg, t, lt, ls) { // оседание после склейки + медленный наезд + фокус-зум по ключам pg.focus [[t, z, fx, fy], …]
    const st = pg.settle == null ? .035 : pg.settle, pu = pg.push == null ? .014 : pg.push;
    const z = 1 + (ls > 0 ? st * Math.exp(-6 * ls) * Math.cos(9 * ls) : st) + pu * Math.min(4, Math.max(0, lt)) / 4;
    g.translate(540, 960); g.scale(z, z); g.translate(-540, -960);
    if (pg.focus) { const [fz, fx, fy] = kfv(pg.focus, t); if (fz !== 1) { g.translate(fx, fy); g.scale(fz, fz); g.translate(-fx, -fy); } }
  }
  function live(g, pg, t, lt, ls) { g.save(); camera(g, pg, t, lt, ls); pg.draw(g, t, lt); g.restore(); }
  const TR = { push: .45, up: .45, drill: .5, cut: 0, fade: .3, overview: 1.05 };
  const OV = { cols: 4, tw: 216, th: 384, gx: 24, gy: 70, x0: 72, y0: 520 };
  const slot = j => [OV.x0 + (j % OV.cols) * (OV.tw + OV.gx), OV.y0 + Math.floor(j / OV.cols) * (OV.th + OV.gy), OV.tw, OV.th];
  function pageAt(g, pg, t, lt, r, ls, rad = 0) { // живая страница, вписанная в прямоугольник r (по ширине)
    g.save(); if (rad > .5) shade(g, r[0], r[1], r[2], r[3], rad, 1.2);
    if (rad > 1.5) rr(g, r[0], r[1], r[2], r[3], rad); else { g.beginPath(); g.rect(Math.round(r[0]), Math.round(r[1]), Math.round(r[2]), Math.round(r[3])); } g.clip(); g.translate(r[0], r[1]); const s = r[2] / W; g.scale(s, s); live(g, pg, t, lt, ls); g.restore();
  }
  // Листание отчёта. pages: [{t0, draw(g, t, lt), tr: push|up|drill|cut|fade|overview, from:[x,y,w,h] (для drill, экранные), focus, settle, push, ovTitle}]
  // Возвращает {i, lt, t0, t1, tr, trP, ov}: ov 0…1: насколько открыт тёмный «обзор всех страниц».
  function deck(g, t, pages, o = {}) {
    const n = pages.length; let i = 0; while (i < n - 1 && t >= pages[i + 1].t0) i++;
    const pg = pages[i], lt = t - pg.t0, tr = i > 0 ? (pg.tr || 'push') : 'cut', d = TR[tr] == null ? .45 : TR[tr];
    const end = j => (j < n - 1 ? pages[j + 1].t0 : (o.end || (K ? K.duration : pg.t0 + 5)));
    const info = { i, n, lt, t0: pg.t0, t1: end(i), tr, trP: d ? cl(lt / d) : 1, ov: 0 };
    const tthumb = j => thumb('pg' + j, OV.tw, OV.th, x => { const te = end(j) - .04; pages[j].draw(x, te, te - pages[j].t0); });
    for (let j = 0; j < n; j++) if (pages[j].tr === 'overview') { // миниатюры заранее, по одной за кадр
      for (let q = 0; q < j - 1; q++) if (!TH.has('pg' + q) && t > end(q) + .2 && t < pages[j].t0) { tthumb(q); break; }
    }
    if (i === 0 || tr === 'cut' || lt >= d) { live(g, pg, t, lt, tr === 'cut' || i === 0 ? lt : lt - d * .55); return info; }
    const prev = pages[i - 1], plt = t - prev.t0;
    if (tr === 'push' || tr === 'up') {
      const e = eo(pr(lt, 0, d)), up = tr === 'up';
      g.save(); g.beginPath(); if (up) g.rect(0, -60, W, H * (1 - e) + 62); else g.rect(-10, -60, W * (1 - e) + 12, H + 120); g.clip();
      g.translate(up ? 0 : -W * .3 * e, up ? -H * .22 * e : 0); live(g, prev, t, plt, 9); g.fillStyle = rgba(P.slate, .24 * e); g.fillRect(-10, -60, W + 20, H + 120); g.restore();
      g.save(); g.translate(up ? 0 : W * (1 - e), up ? H * (1 - e) : 0);
      const gr = up ? g.createLinearGradient(0, -60, 0, 0) : g.createLinearGradient(-60, 0, 0, 0);
      gr.addColorStop(0, 'rgba(16,32,43,0)'); gr.addColorStop(1, 'rgba(16,32,43,.16)'); g.fillStyle = gr;
      if (up) g.fillRect(0, -60, W, 60); else g.fillRect(-60, 0, 60, H);
      g.beginPath(); g.rect(0, 0, W, H); g.clip(); live(g, pg, t, lt, lt - d * .55); g.restore();
    } else if (tr === 'fade') {
      live(g, prev, t, plt, 9); g.save(); g.globalAlpha = eo(pr(lt, 0, d)); live(g, pg, t, lt, lt - d * .55); g.restore();
    } else if (tr === 'drill') {
      const e = eo(pr(lt, 0, d)), f = pg.from || [440, 860, 200, 200], cx = f[0] + f[2] / 2, cy = f[1] + f[3] / 2, z = 1 + .3 * e;
      g.save(); g.translate(cx, cy); g.scale(z, z); g.translate(-cx, -cy); live(g, prev, t, plt, 9); g.restore();
      if (e < .9) dim(g, .34 * e);
      pageAt(g, pg, t, lt, [lerp(f[0], 0, e), lerp(f[1], 0, e), lerp(f[2], W, e), lerp(f[3], H, e)], lt - d * .55, 18 * (1 - e));
    } else if (tr === 'overview') {
      const a = eio(pr(lt, 0, .36)), c = eio(pr(lt, .6, d)), so = slot(i - 1), sn = slot(i);
      info.ov = lt < .6 ? a : 1 - c;
      g.fillStyle = P.night; g.fillRect(-10, -60, W + 20, H + 120);
      if (pg.ovTitle) spaced(g, pg.ovTitle, L.cx, OV.y0 - 70, 30, { col: P.onDark, al: 'center', tr: 4, a: eo(pr(lt, .15, .4)) * (1 - c) });
      for (let j = 0; j < n; j++) {
        const r = slot(j), ap = eo(pr(lt, .08 + j * .03, .3 + j * .03)) * (1 - c * (j === i ? 0 : 1));
        if (ap <= 0) continue;
        if (j < i - 1 || (j === i - 1 && lt >= .6)) {
          g.save(); g.globalAlpha = ap; g.drawImage(tthumb(j), r[0], r[1] + Math.round((1 - ap) * 24)); g.restore();
        } else if (j > i) { g.save(); g.globalAlpha = ap * .8; g.strokeStyle = 'rgba(205,235,239,.35)'; g.lineWidth = 3; g.setLineDash([12, 10]); rr(g, r[0], r[1], r[2], r[3], 10); g.stroke(); g.restore(); }
        if (j !== i) spaced(g, 'стр. ' + (j + 1), r[0] + r[2] / 2, r[1] + r[3] + 32, 22, { col: 'rgba(205,235,239,.7)', al: 'center', tr: 2, a: ap });
      }
      const hold = pr(lt, .3, .6);
      if (hold > 0 && lt < .6) { g.save(); g.globalAlpha = eo(hold); card(g, sn[0], sn[1], sn[2], sn[3], { fill: P.page, line: null, r: 10 }); g.strokeStyle = P.key; g.lineWidth = 6; rr(g, sn[0] - 8, sn[1] - 8, sn[2] + 16, sn[3] + 16, 16); g.stroke(); g.restore(); }
      if (lt < .6) pageAt(g, prev, t, plt, [lerp(0, so[0], a), lerp(0, so[1], a), lerp(W, so[2], a), lerp(H, so[3], a)], 9, 10 * a);
      else pageAt(g, pg, t, lt, [lerp(sn[0], 0, c), lerp(sn[1], 0, c), lerp(sn[2], W, c), lerp(sn[3], H, c)], lt - d, 10 * (1 - c));
    }
    return info;
  }
  function begin(t, k) { K = k; const g = k.g; g.lineJoin = 'round'; g.lineCap = 'round'; g.globalAlpha = 1; g.setLineDash([]); return g; }

  return {
    W, H, P, F, L, SAFE, PI, DEG,
    cl, pr, lerp, eo, eo5, ei, eio, eb, sp, spring, count, kf, kfv, stag, hash, rnd, wave, cuts,
    hex, rgba, mix, fmt, font, mw, fit,
    rr, circle, shade, card, dline, arrow, chev,
    text, spaced, parse, words, head, odo, num, appear,
    chip, badge, seg, slider, toggle, button, tip, check, dim, popup, ripple, cursor, pill,
    bg, dots, hatch, hud,
    gridY, axisX, plen, along, line, vbars, hbars, sankey, donut, stack, timeline, flow,
    bean, cup, sprout, ship, depot, store, scooter, receipt, kpi,
    thumb, camera, deck, begin
  };
})();
