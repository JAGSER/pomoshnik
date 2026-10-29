// «Лаборатория» - библиотека стиля «интерактивная 3D-лаборатория» для роликов draw(t, k) на Canvas 2D (1080×1920).
// Одна глобальная константа LAB. Работает в Web Worker: только OffscreenCanvas, без document, сети, Math.random и Date.
// Углы rot - в градусах. t - секунды ролика, lt - секунды от склейки. Кэшируются только текстуры и спрайты.
const LAB = (() => {
  const W = 1080, H = 1920, PI = Math.PI, PI2 = PI * 2, DEG = PI / 180;
  const P = {
    void: '#05070C', deep: '#090D16', navy: '#0E1422', wall: '#151B29', edge: '#2B3447',
    cyan: '#4FC8F5', cyanHi: '#A9E9FF', ice: '#E4F8FF', blue: '#2F7DE1', teal: '#3FD0C9',
    orange: '#FF8A3D', amber: '#FFB54D', fire: '#FF5A1F', violet: '#8C5CF6', lilac: '#C7A3FF', pink: '#FF8FC8',
    white: '#F3F6FB', hot: '#FFF2DE', text: '#EEF2F8', mute: '#8E98AC', dim: '#596377',
    brass: '#D29A3A', brassHi: '#FFDC8F', copper: '#C46A3A', black: '#0D0F14', steel: '#8C95A6', chrome: '#DCE2EB',
    water: '#3FA9F5', coffee: '#2A1407', coffee2: '#5A2E12', crema: '#C98A44', cremaHi: '#EDBE7A', ok: '#4BE3A0', red: '#FF5A5F'
  };
  const F = {
    sans: '"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif',
    serif: '"DejaVu Serif",Georgia,"Noto Serif","Times New Roman",serif',
    mono: '"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace'
  };
  let K = null, T = 0, TMP = null;
  const C = {};
  const mk = (w, h) => { const c = new OffscreenCanvas(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h))); return [c, c.getContext('2d')]; };

  // ---------- математика, время, пружины ----------
  const cl = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
  const pr = (t, a, b) => b === a ? (t >= a ? 1 : 0) : cl((t - a) / (b - a));
  const lerp = (a, b, p) => a + (b - a) * p;
  const eo = p => 1 - Math.pow(1 - cl(p), 3);
  const eo5 = p => 1 - Math.pow(1 - cl(p), 5);
  const ei = p => Math.pow(cl(p), 3);
  const eio = p => { p = cl(p); return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  const eb = (p, s = 1.4) => { p = cl(p); return 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2); };
  const sm = p => { p = cl(p); return p * p * (3 - 2 * p); };
  const spring = (x, o = {}) => x <= 0 ? 0 : 1 - Math.exp(-x * (o.damp ?? 7)) * Math.cos(x * (o.freq ?? 12));
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const rnd = seed => { let s = ((Math.floor(Math.abs(seed) * 9973) >>> 0) % 2147483647) || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
  const kf = (A, t, e = eio) => { if (t <= A[0][0]) return A[0][1]; for (let i = 0; i < A.length - 1; i++) { const a = A[i], b = A[i + 1]; if (t < b[0]) return lerp(a[1], b[1], e(pr(t, a[0], b[0]))); } return A[A.length - 1][1]; };
  const num = (v, d = 0) => (+v).toFixed(d).replace('.', ',');
  const apart = (p, i, n, d) => (i - (n - 1) / 2) * d * p; // «разобрать»: смещение детали i из n

  // ---------- цвет ----------
  const RGB = {};
  const rgb = c => { if (RGB[c]) return RGB[c]; const m = /^#?([0-9a-f]{6})$/i.exec(c || ''); const n = m ? parseInt(m[1], 16) : 0xFFFFFF; return RGB[c] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgba = (c, a) => { const v = rgb(c); return 'rgba(' + v[0] + ',' + v[1] + ',' + v[2] + ',' + (+a).toFixed(3) + ')'; };
  const mix = (c1, c2, p) => { const a = rgb(c1), b = rgb(c2); return '#' + a.map((x, i) => Math.round(lerp(x, b[i], cl(p))).toString(16).padStart(2, '0')).join(''); };
  function heat(h) { // цвет накала 0…1: холодный металл → вишнёвый → оранжевый → жёлто-белый (квантуется для кэша свечений)
    const S = [[0, '#3A3D45'], [.3, '#7A1C0C'], [.55, '#E0431A'], [.8, '#FF9A3A'], [1, '#FFE6B0']]; h = Math.round(cl(h) * 24) / 24;
    for (let i = 0; i < S.length - 1; i++) if (h <= S[i + 1][0]) return mix(S[i][1], S[i + 1][1], pr(h, S[i][0], S[i + 1][0]));
    return S[S.length - 1][1];
  }
  const MAT = { // полосы материала поперёк цилиндра: свет сверху-слева, блик, рефлекс снизу
    black: [[0, '#07080B'], [.12, '#262A33'], [.27, '#6A7080'], [.36, '#22252D'], [.62, '#0C0D11'], [.88, '#1E2129'], [1, '#08090C']],
    steel: [[0, '#1C2129'], [.14, '#5F6878'], [.28, '#D5DBE4'], [.4, '#7E8798'], [.7, '#353C48'], [.9, '#5A6272'], [1, '#1A1E25']],
    chrome: [[0, '#2A2F37'], [.12, '#A3ACBA'], [.25, '#FFFFFF'], [.36, '#B9C1CD'], [.55, '#4E5562'], [.8, '#C3CAD5'], [1, '#2E333C']],
    brass: [[0, '#3A2306'], [.13, '#9A6418'], [.26, '#FFE3A1'], [.38, '#D9A040'], [.65, '#74470F'], [.86, '#B57E2C'], [1, '#3A2306']],
    copper: [[0, '#3B1307'], [.13, '#A4512A'], [.26, '#FFC6A0'], [.38, '#CF7546'], [.66, '#6E2810'], [.86, '#A85A33'], [1, '#2C0E05']],
    ceramic: [[0, '#9AA2AE'], [.15, '#E6EAF0'], [.3, '#FFFFFF'], [.55, '#D2D8E0'], [.85, '#A7AFBB'], [1, '#7D8592']],
    rubber: [[0, '#050506'], [.25, '#24262B'], [.4, '#14151A'], [1, '#060607']],
    glass: [[0, 'rgba(190,235,255,.55)'], [.08, 'rgba(160,220,255,.16)'], [.3, 'rgba(160,220,255,.04)'], [.7, 'rgba(160,220,255,.04)'], [.92, 'rgba(160,220,255,.18)'], [1, 'rgba(210,245,255,.6)']]
  };
  function mat(g, kind, x0, y0, x1, y1) { const gr = g.createLinearGradient(x0, y0, x1, y1); (MAT[kind] || MAT.steel).forEach(s => gr.addColorStop(s[0], s[1])); return gr; }

  // ---------- текстуры и спрайты (один раз, OffscreenCanvas) ----------
  function tex(kind, col) {
    const key = kind + (col || ''); if (C[key]) return C[key];
    if (kind === 'glow' || kind === 'bokeh' || kind === 'puff') {
      const S = 128, h = S / 2, [c, x] = mk(S, S), v = rgb(col || '#FFFFFF'), gr = x.createRadialGradient(h, h, 0, h, h, h);
      const st = kind === 'glow' ? [[0, 1], [.1, .8], [.25, .42], [.45, .16], [.7, .05], [1, 0]] : kind === 'bokeh' ? [[0, .2], [.62, .26], [.84, .5], [.92, .32], [1, 0]] : [[0, .55], [.35, .32], [.7, .1], [1, 0]];
      st.forEach(([o, a]) => gr.addColorStop(o, 'rgba(' + v.join(',') + ',' + a + ')')); x.fillStyle = gr; x.fillRect(0, 0, S, S); return C[key] = c;
    }
    if (kind === 'grain' || kind === 'foam') { // плитка зернистого материала / пены (бесшовная)
      const S = 160, [c, x] = mk(S, S), r = rnd(kind === 'grain' ? 77 : 91), base = rgb(col);
      x.fillStyle = col; x.fillRect(0, 0, S, S);
      const dot = (px, py, rr, fill, stroke) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { const X = px + ox, Y = py + oy; if (X < -rr || X > S + rr || Y < -rr || Y > S + rr) continue; x.beginPath(); x.arc(X, Y, rr, 0, PI2); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.strokeStyle = stroke; x.lineWidth = 1; x.stroke(); } } };
      const sh = f => 'rgba(' + base.map(v => Math.min(255, Math.round(v * f))).join(',') + ',';
      if (kind === 'grain') for (let i = 0; i < 1500; i++) { const k = r(); dot(r() * S, r() * S, .8 + r() * 2.6, sh(k < .4 ? .45 : k < .8 ? 1.4 : 2.1) + (.5 + r() * .5) + ')'); }
      else { for (let i = 0; i < 40; i++) dot(r() * S, r() * S, 6 + r() * 14, sh(.62) + '.22)'); for (let i = 0; i < 420; i++) { const rr = .8 + r() * 3.4; dot(r() * S, r() * S, rr, sh(1.3) + '.55)', sh(.55) + '.6)'); } }
      return C[key] = x.createPattern(c, 'repeat');
    }
    if (kind === 'hatch') { const [c, x] = mk(18, 18); x.strokeStyle = 'rgba(255,240,220,.5)'; x.lineWidth = 2; x.beginPath(); for (let i = -18; i <= 36; i += 9) { x.moveTo(i, 18); x.lineTo(i + 18, 0); } x.stroke(); return C[key] = x.createPattern(c, 'repeat'); }
    if (kind === 'vig') { const [c, x] = mk(270, 480), gr = x.createRadialGradient(135, 215, 90, 135, 240, 330); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.55, 'rgba(0,0,0,.12)'); gr.addColorStop(1, 'rgba(0,0,0,.62)'); x.fillStyle = gr; x.fillRect(0, 0, 270, 480); return C[key] = c; }
    return null;
  }
  function studioTex(v) { // фон-студия, нарисованный в 1/4 размера: при растяжении он мягкий, как вне фокуса
    const key = 'studio' + v; if (C[key]) return C[key];
    const S = 4, TW = 1240, TH = 2180, [c, x] = mk(TW / S, TH / S); x.scale(1 / S, 1 / S);
    const lin = (y0, y1, st) => { const gr = x.createLinearGradient(0, y0, 0, y1); st.forEach(s => gr.addColorStop(s[0], s[1])); return gr; };
    const rad = (cx, cy, r, col, a) => { const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(.4, rgba(col, a * .35)); gr.addColorStop(1, rgba(col, 0)); x.fillStyle = gr; x.fillRect(cx - r, cy - r, 2 * r, 2 * r); };
    const r = rnd(v === 'b' ? 21 : 13);
    if (v === 'b') { // синий испытательный бокс со световой колонной
      const FY = 1380;
      x.fillStyle = lin(0, FY, [[0, '#04060D'], [.55, '#0A1226'], [1, '#0E1931']]); x.fillRect(0, 0, TW, FY);
      rad(905, 760, 520, '#8FB8FF', .28);
      x.fillStyle = lin(0, FY, [[0, 'rgba(235,242,255,.95)'], [1, 'rgba(190,212,255,.75)']]); x.fillRect(880, 0, 52, FY);
      x.fillStyle = '#04070D'; x.fillRect(1040, 0, 140, FY); x.fillRect(120, 0, 90, FY);
      x.fillStyle = 'rgba(120,150,210,.3)'; x.fillRect(1040, 0, 8, FY); x.fillRect(202, 0, 6, FY);
      [[1100, 820], [1130, 1060], [160, 900], [700, 980]].forEach(([px, py]) => rad(px, py, 46, '#FF4A4A', .7));
      x.fillStyle = lin(FY, TH, [[0, '#2B3C62'], [.25, '#1B2743'], [1, '#080D18']]); x.fillRect(0, FY, TW, TH - FY);
      x.fillStyle = lin(FY, FY + 640, [[0, 'rgba(220,235,255,.42)'], [1, 'rgba(220,235,255,0)']]); x.fillRect(866, FY, 80, 640);
      rad(905, FY + 40, 340, '#9CC4FF', .22);
    } else if (v === 'c') { // макро: тёмный фон с крупными расфокусными огнями
      x.fillStyle = lin(0, TH, [[0, '#06080E'], [.5, '#0C1019'], [1, '#05070B']]); x.fillRect(0, 0, TW, TH);
      for (let i = 0; i < 26; i++) { const cx = r() * TW, cy = r() * TH, rr = 50 + r() * 130, col = ['#FFB066', '#59CFF8', '#FFFFFF', '#FF8A3D'][i % 4], a = .05 + r() * .12;
        const gr = x.createRadialGradient(cx, cy, 0, cx, cy, rr); gr.addColorStop(0, rgba(col, a * .7)); gr.addColorStop(.82, rgba(col, a)); gr.addColorStop(.93, rgba(col, a * 1.6)); gr.addColorStop(1, rgba(col, 0)); x.fillStyle = gr; x.fillRect(cx - rr, cy - rr, rr * 2, rr * 2); }
    } else { // 'a' - лаборатория: подсвеченные панели, кольцевые лампы, тёплый свет
      const FY = 1360;
      x.fillStyle = lin(0, FY, [[0, '#0A0D14'], [.45, '#151B26'], [1, '#11151E']]); x.fillRect(0, 0, TW, FY);
      rad(620, 0, 760, '#B8D4FF', .1);
      [[110, 'tree'], [470, 'drop'], [830, 'cup']].forEach(([px, kind]) => {
        x.fillStyle = '#0B1828'; x.fillRect(px, 640, 300, 380); rad(px + 150, 830, 220, '#4FC8F5', .16);
        x.fillStyle = 'rgba(214,236,255,.55)'; x.beginPath();
        if (kind === 'tree') { x.moveTo(px + 150, 700); x.lineTo(px + 215, 920); x.lineTo(px + 85, 920); }
        else if (kind === 'drop') { x.moveTo(px + 150, 700); x.quadraticCurveTo(px + 225, 850, px + 150, 920); x.quadraticCurveTo(px + 75, 850, px + 150, 700); }
        else { x.rect(px + 90, 780, 120, 120); x.rect(px + 210, 805, 30, 50); }
        x.fill(); x.strokeStyle = '#5BD2FA'; x.lineWidth = 14; x.strokeRect(px, 640, 300, 380); });
      [[1080, 1000], [1200, 1020]].forEach(([px, py]) => { rad(px, py, 140, '#B5C7DA', .18); x.strokeStyle = 'rgba(190,206,224,.6)'; x.lineWidth = 18; x.beginPath(); x.arc(px, py, 92, 0, PI2); x.stroke(); });
      rad(140, 1040, 300, '#FFB066', .42); x.fillStyle = '#10141C'; x.fillRect(0, 1190, TW, 18);
      rad(70, 1180, 170, '#2F6B3A', .5);
      x.fillStyle = lin(FY, TH, [[0, '#1C2333'], [.3, '#121826'], [1, '#07090E']]); x.fillRect(0, FY, TW, TH - FY);
      [260, 620, 980].forEach(px => { x.fillStyle = lin(FY, FY + 420, [[0, 'rgba(79,200,245,.16)'], [1, 'rgba(79,200,245,0)']]); x.fillRect(px - 70, FY, 140, 420); });
    }
    const [m, mx] = mk(TW / 2, TH / 2); mx.imageSmoothingQuality = 'high'; mx.drawImage(c, 0, 0, TW / 2, TH / 2);
    const [f, fx] = mk(TW, TH); fx.imageSmoothingQuality = 'high'; fx.drawImage(m, 0, 0, TW, TH);
    let gr = fx.createLinearGradient(0, 130, 0, 820); gr.addColorStop(0, 'rgba(3,5,10,.82)'); gr.addColorStop(1, 'rgba(3,5,10,0)'); fx.fillStyle = gr; fx.fillRect(0, 0, TW, 820);
    gr = fx.createRadialGradient(620, 1120, 480, 620, 1090, 1280); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.6)'); fx.fillStyle = gr; fx.fillRect(0, 0, TW, TH);
    return C[key] = { small: c, full: f };
  }
  function cache(key, w, h, fn, o = {}) { // заранее отрисованный спрайт: fn(g) рисует один раз в холст w×h; o.blur - в 1/blur и растянуть (расфокус)
    const k = 'cache:' + key; if (C[k]) return C[k]; const f = o.blur || 1, [s, sx] = mk(w / f, h / f); if (f > 1) sx.scale(1 / f, 1 / f); fn(sx);
    if (f <= 1) return C[k] = s; const [m, mx] = mk(w / 2, h / 2); mx.imageSmoothingQuality = 'high'; mx.drawImage(s, 0, 0, w / 2, h / 2);
    const [c, cx] = mk(w, h); cx.imageSmoothingQuality = 'high'; cx.drawImage(m, 0, 0, w, h); return C[k] = c;
  }
  const TS = new Map();
  function tspr(s, size, wt, kind, col, grad, glowCol) { // спрайт слова (со свечением и градиентом), кэш по строке
    size = Math.round(size * 2) / 2; const key = s + '|' + size + '|' + wt + kind + col + (grad || '') + (glowCol || '');
    let r = TS.get(key); if (r) return r; if (TS.size > 500) TS.clear();
    if (!TMP) TMP = mk(8, 8); const f = font(size, wt, kind); TMP[1].font = f; const tw = Math.ceil(TMP[1].measureText(s).width);
    const blur = size * .2, pad = Math.ceil(glowCol ? blur * 1.7 : 3), asc = Math.ceil(size * .98), dsc = Math.ceil(size * .3);
    const [c, x] = mk(tw + pad * 2, asc + dsc + pad * 2); x.font = f; x.textBaseline = 'alphabetic';
    let fill = col; if (grad) { const gr = x.createLinearGradient(0, pad + asc * .15, 0, pad + asc); gr.addColorStop(0, grad[0]); gr.addColorStop(1, grad[1]); fill = gr; }
    if (glowCol) { x.shadowColor = glowCol; x.shadowBlur = blur; x.fillStyle = fill; x.fillText(s, pad, pad + asc); x.shadowBlur = 0; x.shadowColor = 'rgba(0,0,0,0)'; }
    x.fillStyle = fill; x.fillText(s, pad, pad + asc);
    r = { c, pad, asc, w: tw }; TS.set(key, r); return r;
  }

  // ---------- кадр, склейки, камера, слои ----------
  function begin(t, k) { // первым делом в draw: запоминает t/k, сбрасывает контекст, заливает тёмным
    K = k; T = t; const g = k.g;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.shadowColor = 'rgba(0,0,0,0)'; g.shadowBlur = 0; g.setLineDash([]); g.lineDashOffset = 0;
    g.lineCap = 'round'; g.lineJoin = 'round'; g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.imageSmoothingEnabled = true;
    g.fillStyle = P.void; g.fillRect(0, 0, W, H); return g;
  }
  let WARM = false;
  function prewarm(k, ts, fn) { // один раз, на первом кадре: fn(t) рисует кадры ts, чтобы построить все кэши заранее (без пиков в ролике)
    if (WARM) return; WARM = true; ['a', 'b', 'c'].forEach(studioTex); ts.forEach(t => { begin(t, k); fn(t); });
  }
  function cuts(t, list) { // сцена по списку склеек: {i, t0, t1, lt, d, p, left}
    list = list || K.subs.map(s => s.t0); let i = 0;
    for (let j = 0; j < list.length; j++) if (t >= list[j]) i = j;
    const t0 = list[i], t1 = i + 1 < list.length ? list[i + 1] : K.duration;
    return { i, t0, t1, lt: t - t0, d: t1 - t0, p: pr(t, t0, t1), left: t1 - t };
  }
  const WT = {};
  function words(i, subs) { // оценка моментов слов фразы i (сек ролика) по длине слов и паузам на знаках
    subs = subs || (K && K.subs) || []; if (WT[i]) return WT[i]; const s = subs[i]; if (!s) return [];
    const toks = s.text.split(/\s+/).filter(Boolean), wt = toks.map(w => w.replace(/[^0-9a-zа-яё]/gi, '').length + 1.5 + (/[,;:]$/.test(w) ? 3 : 0) + (/[.?!…]$/.test(w) ? 4 : 0));
    const a = s.t0 + .1, b = s.t1 - .25, tot = wt.reduce((x, y) => x + y, 0); let acc = 0;
    return WT[i] = toks.map((w, j) => { const r = { w: w.toLowerCase().replace(/[^0-9a-zа-яё-]/gi, ''), t: a + (b - a) * acc / tot }; acc += wt[j]; return r; });
  }
  function at(i, key, n = 0, subs) { // момент начала слова (или его начала) key во фразе i
    const ws = words(i, subs); key = String(key).toLowerCase(); let c = 0;
    for (const o of ws) if (o.w.indexOf(key) === 0 && c++ === n) return o.t;
    const s = (subs || K.subs)[i]; return s ? s.t0 : 0;
  }
  function camera(lt, o = {}) { // камера сцены: после склейки наезд и оседание пружиной, затем медленный наезд-дрейф и панорама
    const d = o.d || 4, p = cl(lt / d), push = o.push ?? .08, st = 1 - spring(lt, { damp: 5.5, freq: 7 });
    const z = o.zoom === false ? 1 : (o.z ?? 1) * (1 + push * st + (o.drift ?? .035) * eio(p));
    const pan = o.pan || [0, 0], e = eio(p) - .5; let x = pan[0] * e, y = pan[1] * e - (o.zoom === false ? push * 500 * st : 0);
    if (o.shake) { const [t0, amp, dur] = o.shake; const q = lt > t0 ? 1 - pr(lt, t0, t0 + (dur || .35)) : 0; x += Math.sin(lt * 83) * amp * q; y += Math.cos(lt * 67) * amp * .7 * q; }
    return { z, x, y, cx: o.cx ?? W / 2, cy: o.cy ?? H * .5 };
  }
  function layer(g, c, depth, fn) { // слой с параллаксом: depth 0 - неподвижен, 1 - главный план, >1 - передний план
    const z = 1 + (c.z - 1) * depth; g.save();
    if (z === 1) g.translate(Math.round(c.x * depth), Math.round(c.y * depth)); // без зума - сдвиг по целым пикселям: спрайты копируются без пересчёта
    else { g.translate(c.cx + c.x * depth, c.cy + c.y * depth); g.scale(z, z); g.translate(-c.cx, -c.cy); }
    fn(g); g.restore();
  }
  function view(g, fx, fy, z, fn, o = {}) { // «объектив»: точка мира (fx,fy) в точку экрана (o.sx,o.sy) с увеличением z
    g.save(); g.translate(o.sx ?? W / 2, o.sy ?? H / 2); g.scale(z, z); if (o.rot) g.rotate(o.rot * DEG); g.translate(-fx, -fy); fn(g); g.restore();
  }
  function blur(g, f, fn, o = {}) { // расфокус без ctx.filter: fn рисуется в уменьшенный холст и растягивается (f = 2…12)
    f = [2, 3, 4, 6, 8, 12].reduce((a, b) => Math.abs(b - f) < Math.abs(a - f) ? b : a);
    const w = Math.ceil(W / f), h = Math.ceil(H / f), key = 'blur' + f; if (!C[key]) C[key] = mk(w, h);
    const [c, b] = C[key]; b.setTransform(1, 0, 0, 1, 0, 0); b.globalAlpha = 1; b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, w, h);
    b.setTransform(w / W, 0, 0, h / H, 0, 0); b.lineCap = 'round'; b.lineJoin = 'round'; fn(b);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha *= o.a ?? 1; g.imageSmoothingEnabled = true; g.drawImage(c, 0, 0, w, h, 0, 0, W, H); g.restore();
  }
  function focus(g, f, fn) { // перевод фокуса: f 1 - резко, 0 - размыто; между - смешивание
    if (f >= .995) { fn(g); return; }
    blur(g, 8, fn); if (f > .005) { g.save(); g.globalAlpha *= sm(f); fn(g); g.restore(); }
  }
  function shake(g, lt, t0, dur = .35, amp = 12) { const q = lt > t0 ? 1 - pr(lt, t0, t0 + dur) : 0; if (q > 0) g.translate(Math.sin(lt * 83) * amp * q, Math.cos(lt * 67) * amp * .7 * q); }

  // ---------- пути и геометрия ----------
  function rr(g, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function rrect(g, x, y, w, h, r) { g.beginPath(); rr(g, x, y, w, h, r); }
  function poly(g, v, close) { g.beginPath(); if (v.length < 2) return; g.moveTo(v[0], v[1]); for (let i = 2; i < v.length; i += 2) g.lineTo(v[i], v[i + 1]); if (close) g.closePath(); }
  function plen(v) { let L = 0; for (let i = 2; i < v.length; i += 2) L += Math.hypot(v[i] - v[i - 2], v[i + 1] - v[i - 1]); return L; }
  function part(v, p) { // начальная часть ломаной на долю длины p
    if (p >= 1) return v; if (p <= 0) return v.slice(0, 2);
    let rem = plen(v) * p; const out = [v[0], v[1]];
    for (let i = 2; i < v.length && rem > 0; i += 2) { const l = Math.hypot(v[i] - v[i - 2], v[i + 1] - v[i - 1]), f = Math.min(1, rem / (l || 1)); out.push(lerp(v[i - 2], v[i], f), lerp(v[i - 1], v[i + 1], f)); rem -= l; }
    return out;
  }
  function along(v, p) { // точка на ломаной на доле длины p: [x, y, угол°]
    let rem = plen(v) * cl(p);
    for (let i = 2; i < v.length; i += 2) { const l = Math.hypot(v[i] - v[i - 2], v[i + 1] - v[i - 1]); if (rem <= l || i === v.length - 2) { const f = l ? cl(rem / l) : 0; return [lerp(v[i - 2], v[i], f), lerp(v[i - 1], v[i + 1], f), Math.atan2(v[i + 1] - v[i - 1], v[i] - v[i - 2]) / DEG]; } rem -= l; }
    return [v[0], v[1], 0];
  }

  // ---------- свет: свечения, лучи, потоки ----------
  function glow(g, x, y, r, col = P.cyan, a = 1, o = {}) { // аддитивное свечение (спрайт); o.sx/o.sy - сплющить, o.rot
    if (a <= .003 || r <= 0) return; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha *= cl(a);
    const s = tex('glow', col), sx = o.sx ?? 1, sy = o.sy ?? 1;
    if (o.rot) { g.translate(x, y); g.rotate(o.rot * DEG); g.drawImage(s, -r * sx, -r * sy, 2 * r * sx, 2 * r * sy); } else g.drawImage(s, x - r * sx, y - r * sy, 2 * r * sx, 2 * r * sy);
    g.restore();
  }
  function beam(g, v, o = {}) { // светящаяся линия по ломаной: o.w, o.col, o.a, o.p (прорисована на долю), o.core
    const a = o.a ?? 1; if (a <= .003) return; const q = o.p != null && o.p < 1 ? part(v, o.p) : v; if (q.length < 4) return;
    const A = g.globalAlpha, w = o.w || 4, col = o.col || P.cyan;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round'; poly(g, q); g.strokeStyle = col;
    g.globalAlpha = A * a * .16; g.lineWidth = w * 5; g.stroke(); g.globalAlpha = A * a * .45; g.lineWidth = w * 2; g.stroke();
    g.globalAlpha = A * a; g.strokeStyle = o.core || mix(col, '#FFFFFF', .7); g.lineWidth = w * .7; g.stroke(); g.restore();
  }
  function rays(g, x0, y0, x1, y1, n, spread, o = {}) { // пучок лучей: из полосы источника (по вертикали spread) в точку фокуса
    for (let i = 0; i < n; i++) { const u = n > 1 ? i / (n - 1) - .5 : 0; beam(g, [x0, y0 + u * spread, x1, y1 + u * (o.end || 0)], { w: o.w || 2, col: o.col, a: (o.a ?? .7) * (1 - Math.abs(u) * .8), p: o.p }); }
  }
  function flow(g, v, lt, o = {}) { // светящийся поток по ломаной: бегущие штрихи (o.speed px/с), o.w, o.col, o.p - доля
    const a = o.a ?? 1; if (a <= .003) return; const q = o.p != null && o.p < 1 ? part(v, o.p) : v; if (q.length < 4) return;
    const A = g.globalAlpha * a, w = o.w || 10, col = o.col || P.cyan;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round'; poly(g, q); g.strokeStyle = col;
    g.globalAlpha = A * .2; g.lineWidth = w * 2.6; g.stroke(); g.globalAlpha = A * .5; g.lineWidth = w; g.stroke();
    g.setLineDash([w * 1.6, w * 3.2]); g.lineDashOffset = -lt * (o.speed ?? 240); g.globalAlpha = A * .95; g.strokeStyle = o.core || mix(col, '#FFFFFF', .75); g.lineWidth = w * .45; g.stroke();
    g.restore();
  }
  function jet(g, x, y, len, w, lt, o = {}) { // факел / струя (пламя, плазма, пар): от (x,y) вдоль o.rot; o.cols [ядро, середина, край]; o.diamonds
    const cols = o.cols || [P.hot, P.pink, P.violet], fl = 1 + .05 * Math.sin(lt * 37) + .03 * Math.sin(lt * 23), A = g.globalAlpha * (o.a ?? 1);
    g.save(); g.translate(x, y); g.rotate((o.rot || 0) * DEG); g.globalCompositeOperation = 'lighter';
    for (let i = 3; i >= 0; i--) { const s = 1 + i * .5, L = len * (1 - i * .1) * fl; g.beginPath(); g.moveTo(0, -w * .5); g.quadraticCurveTo(L * .4, -w * .5 * s * 1.5, L, -w * .5 * s * 1.9); g.lineTo(L, w * .5 * s * 1.9); g.quadraticCurveTo(L * .4, w * .5 * s * 1.5, 0, w * .5); g.closePath();
      const gr = g.createLinearGradient(0, 0, L, 0); gr.addColorStop(0, rgba(cols[Math.min(i, 2)], .95)); gr.addColorStop(.5, rgba(cols[Math.min(i + 1, 2)], .4)); gr.addColorStop(1, rgba(cols[2], 0)); g.globalAlpha = A * (.55 - i * .1); g.fillStyle = gr; g.fill(); }
    g.globalAlpha = A; if (o.diamonds) for (let i = 1; i <= o.diamonds; i++) glow(g, len * i / (o.diamonds + 1), 0, w * .8, '#FFFFFF', .55 * (1 - i / (o.diamonds + 2)), { sy: .5 });
    g.restore();
  }
  function bokeh(g, lt, o = {}) { // расфокусные огни (дрейфуют): o.n, o.y0..o.y1, o.cols, o.a
    const r = rnd(o.seed || 11), n = o.n || 10, cols = o.cols || [P.cyan, P.amber, P.white];
    for (let i = 0; i < n; i++) { const x = r() * W + Math.sin(lt * .35 + i) * 26, y = lerp(o.y0 ?? 150, o.y1 ?? 1700, r()) + Math.cos(lt * .3 + i * 2) * 14, rad = (o.r || 60) * (.5 + r() * 1.2), a = (o.a ?? .5) * (.3 + r() * .7);
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha *= a; g.drawImage(tex('bokeh', cols[i % cols.length]), x - rad, y - rad, rad * 2, rad * 2); g.restore(); }
  }
  function motes(g, lt, o = {}) { // пылинки в луче света: o.n, o.x0..o.x1, o.y0..o.y1, o.col
    const r = rnd(o.seed || 4), n = o.n || 30, x0 = o.x0 ?? 0, x1 = o.x1 ?? W, y0 = o.y0 ?? 200, y1 = o.y1 ?? 1600, A = g.globalAlpha;
    g.save(); g.fillStyle = o.col || '#DDEBFF';
    for (let i = 0; i < n; i++) { const x = x0 + ((r() * (x1 - x0) + lt * (8 + r() * 14)) % (x1 - x0)), y = y0 + ((r() * (y1 - y0) - lt * (6 + r() * 18) + (y1 - y0) * 4) % (y1 - y0)), s = .8 + r() * 2.4;
      g.globalAlpha = A * (o.a ?? .6) * (.3 + .7 * Math.abs(Math.sin(lt * 1.3 + i))); g.beginPath(); g.arc(x, y, s, 0, PI2); g.fill(); }
    g.restore();
  }
  function shafts(g, x0, x1, y, len, lt, o = {}) { // лучи света сверху (под водой, в дыму): n трапеций с угасающим градиентом, медленно качаются
    const n = o.n || 6, col = o.col || '#9FD8FF', r = rnd(o.seed || 3), gr = g.createLinearGradient(0, y, 0, y + len); gr.addColorStop(0, rgba(col, o.a ?? .18)); gr.addColorStop(1, rgba(col, 0));
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr;
    for (let i = 0; i < n; i++) { const x = lerp(x0, x1, (i + .5) / n) + Math.sin(lt * .6 + i * 2.1) * 20, w0 = 20 + r() * 50, sk = (o.skew ?? .12) * len, w1 = w0 * 2.4;
      g.beginPath(); g.moveTo(x - w0 / 2, y); g.lineTo(x + w0 / 2, y); g.lineTo(x + sk + w1 / 2, y + len); g.lineTo(x + sk - w1 / 2, y + len); g.closePath(); g.fill(); }
    g.restore();
  }
  function flare(g, x, y, s, o = {}) { const a = o.a ?? 1, col = o.col || P.cyanHi; glow(g, x, y, s * .45, '#FFFFFF', a * .9); glow(g, x, y, s * 1.8, col, a * .5, { sy: .045 }); glow(g, x, y, s, col, a * .28); }
  function sweep(g, p, o = {}) { // переход-блик: световая полоса проходит по кадру; p 0…1
    if (p <= 0 || p >= 1) return; const col = o.col || P.cyanHi, x = lerp(-600, W + 600, eio(p)), a = Math.sin(p * PI) * (o.a ?? .55);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'lighter'; g.translate(x, H / 2); g.rotate((o.rot ?? -16) * DEG);
    const gr = g.createLinearGradient(-280, 0, 280, 0); gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(.5, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(-280, -1500, 560, 3000); g.restore();
  }
  function grade(g, o = {}) { // последний проход: o.vig - виньетка поверх всего (≈2 мс; у studio() она уже вшита), o.dark - затемнение
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); if (o.vig) { g.globalAlpha = o.vig; g.drawImage(tex('vig'), 0, 0, W, H); }
    if (o.dark) { g.globalAlpha = 1; g.fillStyle = 'rgba(3,5,10,' + cl(o.dark) + ')'; g.fillRect(0, 0, W, H); } g.restore();
  }

  // ---------- студия, стенд, подиум ----------
  function studio(g, o = {}) { // размытый фон: o.v 'a' лаборатория | 'b' синий бокс с колонной | 'c' макро-боке; o.x, o.y - сдвиг; o.z; o.dark
    const T2 = studioTex(o.v || 'a'), m = g.getTransform(), cx = W / 2 + (o.x || 0), cy = H / 2 + (o.y || 0);
    if (Math.abs(m.a - 1) > .2 || o.z) { const z = o.z || 1; g.save(); g.translate(cx, cy); g.scale(z, z); g.drawImage(T2.small, 0, 0, T2.small.width, T2.small.height, -620, -1090, 1240, 2180); g.restore(); }
    else { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(T2.full, Math.round(m.a * cx + m.c * cy + m.e - 620), Math.round(m.b * cx + m.d * cy + m.f - 1090)); g.restore(); }
    if (o.dark) { g.fillStyle = 'rgba(3,5,10,' + cl(o.dark) + ')'; g.fillRect(-200, -200, W + 400, H + 400); }
  }
  function bench(g, x, y, w, o = {}) { // испытательный стенд: y - верх столешницы; o.h, o.d (глубина), o.ruler, o.blocks [x,…]
    const d = o.d ?? 40, h = o.h ?? 230;
    let gr = g.createLinearGradient(0, y - d, 0, y); gr.addColorStop(0, '#181F2D'); gr.addColorStop(1, '#2E384C'); g.fillStyle = gr; g.fillRect(x, y - d, w, d);
    gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#171D29'); gr.addColorStop(.3, '#0E121A'); gr.addColorStop(1, '#06080C'); g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(169,233,255,.4)'; g.fillRect(x, y - 1, w, 3);
    if (o.ruler !== false) { const ry = y + 26; g.fillStyle = '#9AA3B2'; g.fillRect(x, ry, w, 32); g.fillStyle = '#2A303C';
      for (let i = 0, X = x + 10; X < x + w; i++, X += 14) { const L = i % 10 === 0 ? 20 : i % 5 === 0 ? 14 : 8; g.fillRect(X, ry, 2, L); }
      g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x, ry, w, 2); }
    (o.blocks || []).forEach(bx => { const gb = g.createLinearGradient(0, y - d - 26, 0, y - d); gb.addColorStop(0, '#FFC768'); gb.addColorStop(1, '#B9771F'); g.fillStyle = gb; g.fillRect(bx, y - d - 24, 110, 26); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(bx, y - d + 1, 110, 4); });
    if (o.leds) for (let X = x + 60; X < x + w; X += 180) { g.fillStyle = '#E8F4FF'; g.beginPath(); g.arc(X, y + 110, 5, 0, PI2); g.fill(); glow(g, X, y + 110, 26, P.cyanHi, .7); }
  }
  function rail(g, x0, x1, y, o = {}) { // направляющая (оптическая скамья) с делениями и каретками o.cars [x,…]
    g.fillStyle = mat(g, 'black', 0, y - 16, 0, y + 16); g.fillRect(x0, y - 16, x1 - x0, 32);
    g.fillStyle = '#05060A'; g.fillRect(x0, y - 3, x1 - x0, 6); g.fillStyle = 'rgba(200,215,235,.5)';
    for (let X = x0 + 8; X < x1; X += 24) g.fillRect(X, y + 8, 2, 6);
    (o.cars || []).forEach(cx => { g.fillStyle = mat(g, 'brass', 0, y - 26, 0, y + 20); g.fillRect(cx - 34, y - 26, 68, 44); });
  }
  function pedestal(g, cx, cy, rx, lt, o = {}) { // круглый подиум с подсветкой кромки; cy - центр верхней грани
    const ry = rx * (o.k ?? .2), h = o.h ?? 110, col = o.col || P.cyan;
    g.beginPath(); g.moveTo(cx - rx, cy); g.lineTo(cx - rx, cy + h); g.ellipse(cx, cy + h, rx, ry, 0, PI, 0, true); g.lineTo(cx + rx, cy); g.closePath(); g.fillStyle = mat(g, 'black', cx - rx, 0, cx + rx, 0); g.fill();
    g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, PI2); const gt = g.createRadialGradient(cx, cy - ry * .4, 0, cx, cy, rx); gt.addColorStop(0, '#3A4762'); gt.addColorStop(1, '#131A28'); g.fillStyle = gt; g.fill();
    g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(col, .25); g.lineWidth = 16; g.stroke(); g.strokeStyle = rgba(col, .9); g.lineWidth = 4; g.stroke(); g.restore();
    const rot = (o.rot ?? lt * 18) * DEG; g.fillStyle = 'rgba(200,232,255,.6)';
    for (let i = 0; i < 32; i++) { const a = rot + i * PI2 / 32, s = Math.sin(a); if (s < .05) continue; g.beginPath(); g.arc(cx + Math.cos(a) * rx * .9, cy + s * ry * .9, 2.5 + s * 2, 0, PI2); g.fill(); }
    glow(g, cx, cy + h + ry * .4, rx * 1.1, col, .18, { sy: .25 });
  }
  function plate(g, x, y, w, h, o = {}) { // чёрная монтажная плита с заклёпками-огоньками (o.leds)
    rrect(g, x, y, w, h, 14); g.fillStyle = mat(g, 'black', x, y, x + w * .4, y + h); g.fill(); g.strokeStyle = 'rgba(160,190,230,.25)'; g.lineWidth = 3; g.stroke();
    const n = Math.max(2, Math.round(h / 90)); for (let i = 0; i < n; i++) { const yy = y + 40 + i * (h - 80) / (n - 1); [x + 30, x + w - 30].forEach(xx => { bolt(g, xx, yy, 9); if (o.leds) glow(g, xx, yy, 30, P.cyanHi, .55); }); }
  }
  function bolt(g, x, y, r, o = {}) { g.beginPath(); g.arc(x, y, r, 0, PI2); const gr = g.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r); gr.addColorStop(0, o.hi || '#EEF2F8'); gr.addColorStop(.5, o.col || '#7D8697'); gr.addColorStop(1, '#161A22'); g.fillStyle = gr; g.fill(); }
  function led(g, x, y, r, col = P.cyan, on = 1) { g.fillStyle = on > .5 ? mix(col, '#FFFFFF', .5) : '#1A1F29'; g.beginPath(); g.arc(x, y, r, 0, PI2); g.fill(); if (on > 0) glow(g, x, y, r * 4, col, on * .8); }

  // ---------- детали: цилиндры, шестерни, спирали, трубы, ёмкости ----------
  function cylH(g, x, y, w, r, kind = 'steel', o = {}) { // горизонтальный цилиндр: x - левый край, y - ось, w - длина, r - радиус
    const rx = r * (o.k ?? .3);
    g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + w, y - r); g.lineTo(x + w, y + r); g.lineTo(x, y + r); g.ellipse(x, y, rx, r, 0, PI / 2, PI * 1.5); g.closePath(); g.fillStyle = mat(g, kind, 0, y - r, 0, y + r); g.fill();
    if (o.knurl) { g.save(); g.beginPath(); g.rect(o.knurl[0], y - r, o.knurl[1] - o.knurl[0], 2 * r); g.clip(); g.fillStyle = 'rgba(0,0,0,.45)'; for (let X = o.knurl[0]; X < o.knurl[1]; X += 9) g.fillRect(X, y - r, 4, 2 * r); g.fillStyle = 'rgba(255,255,255,.08)'; for (let X = o.knurl[0] + 5; X < o.knurl[1]; X += 9) g.fillRect(X, y - r, 2, 2 * r); g.restore(); }
    if (o.cap !== false) { g.beginPath(); g.ellipse(x + w, y, rx, r, 0, 0, PI2);
      if (o.cap === 'open') { g.fillStyle = '#05060A'; g.fill(); g.strokeStyle = mat(g, kind, 0, y - r, 0, y + r); g.lineWidth = r * .14; g.stroke(); }
      else if (o.cap === 'glass') { const gg = g.createRadialGradient(x + w - rx * .3, y - r * .3, 0, x + w, y, r); gg.addColorStop(0, 'rgba(220,245,255,.8)'); gg.addColorStop(.5, 'rgba(79,200,245,.35)'); gg.addColorStop(1, 'rgba(20,60,90,.6)'); g.fillStyle = gg; g.fill(); g.strokeStyle = rgba(P.cyanHi, .9); g.lineWidth = 3; g.stroke(); glow(g, x + w, y, r * 1.4, P.cyan, .35, { sx: .4 }); }
      else { const gc = g.createLinearGradient(x + w - rx, y - r, x + w + rx, y + r); gc.addColorStop(0, mix(MAT[kind] ? MAT[kind][2][1] : '#9AA3B2', '#FFFFFF', .2)); gc.addColorStop(1, MAT[kind] ? MAT[kind][5][1] : '#333'); g.fillStyle = gc; g.fill(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.stroke(); } }
  }
  function cylV(g, cx, y, h, r, kind = 'steel', o = {}) { // вертикальный цилиндр: cx - ось, y - верх, h - высота; верхний торец эллипсом
    const ry = r * (o.k ?? .26);
    g.beginPath(); g.moveTo(cx - r, y); g.lineTo(cx - r, y + h); g.ellipse(cx, y + h, r, ry, 0, PI, 0, true); g.lineTo(cx + r, y); g.closePath(); g.fillStyle = mat(g, kind, cx - r, 0, cx + r, 0); g.fill();
    if (o.top !== false) { g.beginPath(); g.ellipse(cx, y, r, ry, 0, 0, PI2); if (o.top === 'open') { g.fillStyle = '#05060A'; g.fill(); } else { const gt = g.createLinearGradient(cx - r, y - ry, cx + r, y + ry); gt.addColorStop(0, '#F0F3F8'); gt.addColorStop(1, MAT[kind] ? MAT[kind][4][1] : '#555'); g.fillStyle = gt; g.fill(); } g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.stroke(); }
  }
  function gear(g, cx, cy, r, o = {}) { // шестерня-кольцо: o.n зубьев, o.rot (град), o.k сжатие по x (вид сбоку 0.2…1), o.hole доля, o.kind
    const n = o.n || 36, th = o.th ?? r * .09, k = o.k ?? 1, rot = (o.rot || 0) * DEG, s = PI2 / n;
    g.save(); g.translate(cx, cy); g.scale(k, 1); g.beginPath();
    for (let i = 0; i < n; i++) { const a = rot + i * s; [[a, r], [a + s * .2, r + th], [a + s * .5, r + th], [a + s * .7, r]].forEach(([aa, rr_], j) => { const px = Math.cos(aa) * rr_, py = Math.sin(aa) * rr_; if (!i && !j) g.moveTo(px, py); else g.lineTo(px, py); }); }
    g.closePath(); if (o.hole) { g.moveTo(r * o.hole, 0); g.arc(0, 0, r * o.hole, 0, PI2, true); }
    g.fillStyle = mat(g, o.kind || 'brass', 0, -r - th, 0, r + th); g.fill('evenodd'); g.restore();
  }
  function coil(g, x0, y0, x1, y1, r, turns, o = {}) { // спираль (ТЭН, пружина, обмотка) по оси (x0,y0)→(x1,y1); o.heat 0…1 - накал, o.col; o.cache - спрайт по 8 ступеням накала
    const L = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0), lw = o.lw || r * .32;
    if (o.cache) { const lv = Math.round(cl(o.heat || 0) * 8) / 8, pd = Math.ceil(r + lw + 4), Li = Math.round(L);
      const spr = cache('coil' + [Li, r, turns, lw, o.col, lv].join('_'), Li + pd * 2, r * 2 + pd * 2, b => coil(b, pd, r + pd, pd + Li, r + pd, r, turns, Object.assign({}, o, { cache: false, heat: lv, glows: false })));
      g.save(); g.translate(x0, y0); g.rotate(a); g.drawImage(spr, -pd, -r - pd); g.restore(); if (o.glows !== false) coilGlow(g, x0, y0, x1, y1, r, L, o.heat || 0); return; }
    const ht = o.heat || 0, col = o.col || (ht > 0 ? heat(ht) : '#B9C0CC'), N = Math.ceil(turns * 12);
    g.save(); g.translate(x0, y0); g.rotate(a);
    for (const front of [false, true]) { g.beginPath(); let on = false;
      for (let i = 0; i <= N; i++) { const u = i / N, ph = u * turns * PI2, z = Math.cos(ph), px = u * L + z * r * .22, py = Math.sin(ph) * r; if ((z >= 0) === front) { if (on) g.lineTo(px, py); else g.moveTo(px, py); on = true; } else on = false; }
      g.strokeStyle = front ? col : mix(col, '#000000', .55); g.lineWidth = front ? lw : lw * .8; g.stroke();
      if (front) { g.strokeStyle = 'rgba(255,255,255,' + (.25 + ht * .4) + ')'; g.lineWidth = lw * .3; g.translate(0, -lw * .25); g.stroke(); g.translate(0, lw * .25); } }
    g.restore(); if (o.glows !== false) coilGlow(g, x0, y0, x1, y1, r, L, ht);
  }
  function coilGlow(g, x0, y0, x1, y1, r, L, ht) { if (ht <= .25) return; const n = Math.max(2, Math.round(L / (r * 5))); for (let i = 0; i <= n; i++) glow(g, lerp(x0, x1, i / n), lerp(y0, y1, i / n), r * 2.4, heat(ht), (ht - .25) * .7); }
  const PIPE = { copper: ['#4A1D0A', '#C46A3A', '#FFC7A3'], steel: ['#20252D', '#8C95A6', '#EEF2F8'], brass: ['#3E2707', '#C8902E', '#FFE3A1'], black: ['#040507', '#22252D', '#7A8090'], chrome: ['#2A2F37', '#B9C1CD', '#FFFFFF'], glass: ['rgba(170,220,255,.45)', 'rgba(120,190,240,.12)', 'rgba(230,248,255,.7)'] };
  function pipe(g, v, o = {}) { // труба по ломаной: o.r - радиус, o.kind (copper|steel|brass|black|chrome|glass), o.flow {lt, col, speed, p}
    const r = o.r || 14, c = PIPE[o.kind || 'copper'] || PIPE.copper;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; poly(g, v);
    g.strokeStyle = c[0]; g.lineWidth = r * 2 + 4; g.stroke(); g.strokeStyle = c[1]; g.lineWidth = r * 2 - 2; g.stroke();
    if (o.flow) { g.restore(); flow(g, v, o.flow.lt || 0, Object.assign({ w: r * .8 }, o.flow)); g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; poly(g, v); }
    g.translate(-r * .22, -r * .36); g.strokeStyle = c[2]; g.globalAlpha *= .55; g.lineWidth = r * .45; g.stroke(); g.restore();
  }
  function liquid(g, x, y, w, h, level, lt, o = {}) { // жидкость в области (рисуй внутри clip): уровень 0…1, волна o.amp, цвета o.col (верх) / o.col2 (низ)
    const ly = y + h * (1 - cl(level)), amp = o.amp ?? 5, c1 = o.col || '#4DB8FF', c2 = o.col2 || '#0B3A78';
    const wv = xx => ly + Math.sin(xx * .021 + lt * 2.6) * amp + Math.sin(xx * .047 - lt * 3.9) * amp * .45;
    g.beginPath(); g.moveTo(x - 4, y + h + 4); for (let xx = x - 4; xx <= x + w + 24; xx += 24) g.lineTo(xx, wv(xx)); g.lineTo(x + w + 24, y + h + 4); g.closePath();
    const gr = g.createLinearGradient(0, ly - amp, 0, y + h); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.save(); g.globalAlpha *= o.a ?? .92; g.fillStyle = gr; g.fill(); g.restore();
    g.save(); g.globalCompositeOperation = 'lighter'; g.beginPath(); for (let xx = x - 4; xx <= x + w + 24; xx += 24) { if (xx === x - 4) g.moveTo(xx, wv(xx)); else g.lineTo(xx, wv(xx)); } g.strokeStyle = rgba(o.hi || '#BFE9FF', .55); g.lineWidth = 3; g.stroke(); g.restore();
    return ly;
  }
  function tank(g, x, y, w, h, lt, o = {}) { // ёмкость в разрезе (котёл, бак, камера): оболочка, срез стенки со штриховкой, жидкость, o.inside(g, ix, iy, iw, ih)
    const r = o.r ?? h / 2, t = o.wall ?? Math.max(10, h * .06), kind = o.kind || 'copper', ix = x + t, iy = y + t, iw = w - t * 2, ih = h - t * 2, ir = Math.max(0, r - t), pd = 4, key = 'tank' + [w, h, r, t, kind].join('_');
    g.drawImage(cache(key + 'b', w + pd * 2, h + pd * 2, b => { b.translate(pd, pd); rrect(b, 0, 0, w, h, r); b.fillStyle = mat(b, kind, 0, 0, 0, h); b.fill();
      rrect(b, t, t, iw, ih, ir); const gi = b.createLinearGradient(0, t, 0, t + ih); gi.addColorStop(0, '#07080B'); gi.addColorStop(.55, '#15181F'); gi.addColorStop(1, '#272B34'); b.fillStyle = gi; b.fill(); }), Math.round(x - pd), Math.round(y - pd));
    g.save(); rrect(g, ix, iy, iw, ih, ir); g.clip();
    if (o.level) liquid(g, ix, iy, iw, ih, o.level, lt, { col: o.liquid && o.liquid[0], col2: o.liquid && o.liquid[1], amp: o.amp });
    if (o.inside) o.inside(g, ix, iy, iw, ih);
    g.restore();
    g.drawImage(cache(key + 'f', w + pd * 2, h + pd * 2, b => { b.translate(pd, pd);
      b.save(); rrect(b, t, t, iw, ih, ir); b.clip(); const go = b.createLinearGradient(t, 0, t + iw, 0); go.addColorStop(0, 'rgba(0,0,0,.5)'); go.addColorStop(.1, 'rgba(0,0,0,0)'); go.addColorStop(.9, 'rgba(0,0,0,0)'); go.addColorStop(1, 'rgba(0,0,0,.5)'); b.fillStyle = go; b.fillRect(t, t, iw, ih); b.restore();
      b.save(); b.beginPath(); rr(b, 0, 0, w, h, r); rr(b, t, t, iw, ih, ir); b.fillStyle = tex('hatch'); b.globalAlpha = .45; b.fill('evenodd'); b.restore();
      rrect(b, t, t, iw, ih, ir); b.strokeStyle = 'rgba(255,236,210,.5)'; b.lineWidth = 2; b.stroke(); rrect(b, 0, 0, w, h, r); b.strokeStyle = 'rgba(255,255,255,.22)'; b.stroke(); }), Math.round(x - pd), Math.round(y - pd));
    return { ix, iy, iw, ih };
  }
  function grains(g, x, y, w, h, o = {}) { // зернистая масса (молотый кофе, песок, порошок); o.col, o.s - крупность, o.path(g) - своя форма
    g.save(); if (o.path) { o.path(g); g.clip(); } g.translate(x, y); const s = o.s || 1; g.scale(s, s); g.fillStyle = tex(o.foam ? 'foam' : 'grain', o.col || '#3A1D0C'); g.fillRect(0, 0, w / s, h / s); g.restore();
  }
  function bubbles(g, x, y, w, h, lt, o = {}) { // пузырьки поднимаются в области (кипение, газ, пена); o.n, o.r, o.speed, o.col, o.a
    const r0 = rnd(o.seed || 5), n = o.n || 20, sp = o.speed || 140, rad = o.r || 7, A = g.globalAlpha * (o.a ?? 1);
    g.save(); g.strokeStyle = o.col || '#FFFFFF'; g.fillStyle = o.col || '#FFFFFF';
    for (let i = 0; i < n; i++) { const bx = x + r0() * w, ph = r0(), v = .6 + r0() * .8, s = rad * (.45 + r0() * .9), q = (ph + lt * sp * v / h) % 1, by = y + h - q * h, xx = bx + Math.sin(lt * 3 + i * 1.7) * s * .8, a = Math.min(1, q * 6, (1 - q) * 6);
      if (a <= 0) continue; g.lineWidth = Math.max(1.2, s * .22); g.globalAlpha = A * a * .75; g.beginPath(); g.arc(xx, by, s, 0, PI2); g.stroke(); g.globalAlpha = A * a; g.beginPath(); g.arc(xx - s * .35, by - s * .35, s * .22, 0, PI2); g.fill(); }
    g.restore();
  }
  function steam(g, x, y, lt, o = {}) { // пар / аромат: мягкие клубы поднимаются по синусоиде; o.n струй, o.h, o.col, o.a, o.spread, o.amp, o.size
    const n = o.n || 3, hh = o.h || 360, sp = o.speed || .35, A = g.globalAlpha * (o.a ?? 1), spread = o.spread ?? 60, amp = o.amp ?? 40, sz = o.size || 1, s = tex('puff', o.col || '#DCE6F5');
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) for (let j = 0; j < 6; j++) { const q = (lt * sp + j / 6 + i * .31) % 1, py = y - q * hh, px = x + (i - (n - 1) / 2) * spread + Math.sin(q * 5.5 + lt * 1.4 + i * 2.1) * amp * (.3 + q), r = (14 + q * 46) * sz;
      g.globalAlpha = A * Math.sin(q * PI) * .24; g.drawImage(s, px - r, py - r, r * 2, r * 2); }
    g.restore();
  }
  function stream(g, x, y0, y1, w, lt, o = {}) { // струя жидкости сверху вниз («мышиный хвост»): w - ширина у носика; o.col, o.hi, o.seed
    const L = y1 - y0; if (L <= 2) return; const col = o.col || '#6B3414', hi = o.hi || P.amber, n = 16, sd = o.seed || 0, xs = [], ws = [];
    for (let i = 0; i <= n; i++) { const u = i / n, y = y0 + L * u; xs.push(x + Math.sin(y * .018 - lt * 9 + sd) * w * .2 * u + Math.sin(y * .05 - lt * 17 + sd * 2) * w * .07); ws.push(w * (1 - .45 * Math.pow(u, .6)) * (1 + .12 * Math.sin(y * .09 - lt * 23 + sd))); }
    g.beginPath(); for (let i = 0; i <= n; i++) { const y = y0 + L * i / n; if (i) g.lineTo(xs[i] - ws[i] / 2, y); else g.moveTo(xs[i] - ws[i] / 2, y); } for (let i = n; i >= 0; i--) g.lineTo(xs[i] + ws[i] / 2, y0 + L * i / n); g.closePath();
    const gr = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0); gr.addColorStop(0, mix(col, '#000000', .5)); gr.addColorStop(.35, col); gr.addColorStop(.55, hi); gr.addColorStop(.75, col); gr.addColorStop(1, mix(col, '#000000', .55)); g.fillStyle = gr; g.fill();
    g.save(); g.globalCompositeOperation = 'lighter'; g.beginPath(); for (let i = 0; i <= n; i++) { const y = y0 + L * i / n; if (i) g.lineTo(xs[i] - ws[i] * .14, y); else g.moveTo(xs[i] - ws[i] * .14, y); } g.strokeStyle = rgba(hi, .5); g.lineWidth = Math.max(1.5, w * .1); g.stroke(); g.restore();
    glow(g, xs[n], y1, w * 1.6, hi, .35);
  }
  function cupPath(g, cx, top, by, tw, bw, r) { g.beginPath(); g.moveTo(cx - tw / 2, top); g.lineTo(cx - bw / 2, by - r); g.quadraticCurveTo(cx - bw / 2, by, cx - bw / 2 + r, by); g.lineTo(cx + bw / 2 - r, by); g.quadraticCurveTo(cx + bw / 2, by, cx + bw / 2, by - r); g.lineTo(cx + tw / 2, top); g.closePath(); }
  function cup(g, cx, by, w, h, lt, o = {}) { // стеклянная чашка в разрезе: cx - центр, by - низ, w - ширина по верху; o.fill 0…1, o.layers [[доля, цвет]…] снизу вверх, o.foam px, o.handle, o.k
    const top = by - h, bw = w * (o.taper ?? .8), r = w * .16, wall = Math.max(5, w * .03), base = Math.max(12, h * .1), k = o.k ?? .14;
    const itop = top + 2, iby = by - base, itw = w - wall * 2, ibw = bw - wall * 2, ih = iby - itop, wAt = y => lerp(ibw, itw, cl((iby - y) / ih));
    const pd = 8, ox = cx - w * .5 - pd, oy = top - w * .5 * k - pd, SW = w * 1.35 + pd * 2, SH = h + w * .5 * k + pd * 2, key = 'cup' + [w, h, k, bw, !!o.handle].join('_');
    g.drawImage(cache(key + 'b', SW, SH, b => { b.translate(-ox, -oy);
      if (o.handle) { b.lineCap = 'round'; b.beginPath(); b.moveTo(cx + w * .44, top + h * .2); b.bezierCurveTo(cx + w * .8, top + h * .16, cx + w * .8, top + h * .64, cx + w * .37, top + h * .68); b.lineWidth = w * .075; b.strokeStyle = 'rgba(190,225,255,.2)'; b.stroke(); b.lineWidth = 3; b.strokeStyle = 'rgba(230,245,255,.55)'; b.stroke(); }
      cupPath(b, cx, top, by, w, bw, r); b.fillStyle = 'rgba(170,215,255,.07)'; b.fill();
      b.beginPath(); b.ellipse(cx, top, w / 2, w / 2 * k, 0, PI, PI2); b.strokeStyle = 'rgba(225,242,255,.3)'; b.lineWidth = 2.5; b.stroke(); }), Math.round(ox), Math.round(oy));
    const lv = cl(o.fill ?? 0); if (lv > .005) {
      const ly = iby - ih * lv; g.save(); cupPath(g, cx, itop, iby, itw, ibw, r * .8); g.clip(); let y0 = iby;
      (o.layers || [[1, o.col || P.coffee2]]).forEach(([f, col]) => { const hh = ih * lv * f, yt = y0 - hh, gr = g.createLinearGradient(cx - itw / 2, 0, cx + itw / 2, 0); gr.addColorStop(0, mix(col, '#000000', .45)); gr.addColorStop(.45, col); gr.addColorStop(.62, mix(col, '#FFFFFF', .12)); gr.addColorStop(1, mix(col, '#000000', .5)); g.fillStyle = gr; g.fillRect(cx - w * .52, yt - 1, w * 1.04, hh + 2); y0 = yt; });
      if (o.foam) { const fh = Math.min(o.foam, ih * lv); g.save(); g.translate(cx - w * .52, ly); g.fillStyle = tex('foam', o.foamCol || P.crema); g.fillRect(0, 0, w * 1.04, fh); g.restore();
        const gf = g.createLinearGradient(0, ly, 0, ly + fh); gf.addColorStop(0, 'rgba(255,225,170,.35)'); gf.addColorStop(.7, 'rgba(120,60,20,0)'); gf.addColorStop(1, 'rgba(40,18,6,.55)'); g.fillStyle = gf; g.fillRect(cx - w * .52, ly, w * 1.04, fh); }
      g.restore();
      const sw = wAt(ly) / 2, sry = sw * k; g.save(); g.beginPath(); g.ellipse(cx, ly, sw, sry, 0, 0, PI2);
      if (o.foam) { g.clip(); g.translate(cx - sw, ly - sry); g.fillStyle = tex('foam', o.foamTop || P.cremaHi); g.fillRect(0, 0, sw * 2, sry * 2); }
      else { const lc = (o.layers ? o.layers[o.layers.length - 1][1] : o.col) || P.coffee2; g.fillStyle = mix(lc, '#FFFFFF', .08); g.fill(); }
      g.restore(); g.beginPath(); g.ellipse(cx, ly, sw, sry, 0, 0, PI2); g.strokeStyle = 'rgba(255,230,190,.35)'; g.lineWidth = 2; g.stroke();
    }
    g.drawImage(cache(key + 'f', SW, SH, b => { b.translate(-ox, -oy);
      cupPath(b, cx, top, by, w, bw, r); b.strokeStyle = 'rgba(210,235,255,.45)'; b.lineWidth = 3; b.stroke();
      b.fillStyle = 'rgba(200,230,255,.1)'; b.fillRect(cx - bw / 2 + r * .5, iby, bw - r, base - 2); b.fillStyle = 'rgba(230,245,255,.45)'; b.fillRect(cx - bw / 2 + r * .6, iby, bw - r * 1.2, 2);
      const gl = b.createLinearGradient(cx - w * .45, 0, cx - w * .2, 0); gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(.4, 'rgba(255,255,255,.3)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); b.fillStyle = gl;
      b.beginPath(); b.moveTo(cx - w * .43, top + h * .07); b.lineTo(cx - w * .27, top + h * .07); b.lineTo(cx - bw * .3, iby - h * .05); b.lineTo(cx - bw * .41, iby - h * .05); b.closePath(); b.fill();
      b.strokeStyle = 'rgba(255,255,255,.35)'; b.lineWidth = 2; b.beginPath(); b.moveTo(cx + w * .4, top + h * .1); b.lineTo(cx + bw * .45, iby - h * .1); b.stroke();
      b.beginPath(); b.ellipse(cx, top, w / 2, w / 2 * k, 0, 0, PI); b.strokeStyle = 'rgba(235,248,255,.75)'; b.lineWidth = 3; b.stroke(); }), Math.round(ox), Math.round(oy));
    return { top, by, iby, itop, ih };
  }
  function gauge(g, cx, cy, r, v, o = {}) { // манометр: v - значение (0…o.max), o.every - шаг подписей, o.zone [от, до, цвет], o.unit, o.col, o.ncol
    const max = o.max ?? 12, a0 = 135 * DEG, a1 = 405 * DEG, ang = x => a0 + (a1 - a0) * cl(x / max), col = o.col || P.cyan;
    g.beginPath(); g.arc(cx, cy, r * 1.15, 0, PI2); g.fillStyle = mat(g, o.kind || 'chrome', cx - r, cy - r, cx + r * .5, cy + r); g.fill();
    g.beginPath(); g.arc(cx, cy, r * 1.03, 0, PI2); g.fillStyle = '#04060A'; g.fill();
    const gf = g.createRadialGradient(cx - r * .2, cy - r * .35, r * .1, cx, cy, r); gf.addColorStop(0, '#202A3D'); gf.addColorStop(1, '#080B13'); g.beginPath(); g.arc(cx, cy, r, 0, PI2); g.fillStyle = gf; g.fill();
    g.save(); g.lineCap = 'butt';
    if (o.zone) { g.beginPath(); g.arc(cx, cy, r * .83, ang(o.zone[0]), ang(o.zone[1])); g.strokeStyle = rgba(o.zone[2] || P.ok, .55); g.lineWidth = r * .07; g.stroke(); }
    if (v > 0) { g.globalCompositeOperation = 'lighter'; g.beginPath(); g.arc(cx, cy, r * .93, a0, ang(v)); g.strokeStyle = rgba(col, .3); g.lineWidth = r * .1; g.stroke(); g.strokeStyle = col; g.lineWidth = r * .03; g.stroke(); g.globalCompositeOperation = 'source-over'; }
    const every = o.every ?? 3, step = o.step ?? 1; g.strokeStyle = '#C9D2E0'; g.fillStyle = '#DDE5F0'; g.font = font(r * .15, 700, 'mono'); g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0, n = Math.round(max / step); i <= n; i++) { const val = i * step, a = ang(val), maj = Math.abs(val / every - Math.round(val / every)) < 1e-6, ca = Math.cos(a), sa = Math.sin(a);
      g.lineWidth = maj ? r * .025 : r * .012; g.beginPath(); g.moveTo(cx + ca * r * (maj ? .72 : .78), cy + sa * r * (maj ? .72 : .78)); g.lineTo(cx + ca * r * .86, cy + sa * r * .86); g.stroke();
      if (maj) g.fillText(String(val), cx + ca * r * .56, cy + sa * r * .56); }
    if (o.unit) { g.fillStyle = P.mute; g.font = font(r * .13, 700, 'mono'); g.fillText(o.unit, cx, cy + r * .5); }
    g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.restore();
    const na = ang(v); g.save(); g.translate(cx, cy); g.rotate(na); g.beginPath(); g.moveTo(-r * .18, -r * .04); g.lineTo(r * .8, -r * .01); g.lineTo(r * .84, 0); g.lineTo(r * .8, r * .01); g.lineTo(-r * .18, r * .04); g.closePath(); g.fillStyle = o.ncol || P.orange; g.fill(); g.restore();
    glow(g, cx + Math.cos(na) * r * .78, cy + Math.sin(na) * r * .78, r * .22, o.ncol || P.orange, .7);
    g.beginPath(); g.arc(cx, cy, r * .09, 0, PI2); g.fillStyle = mat(g, 'chrome', cx - r * .09, cy - r * .09, cx + r * .09, cy + r * .09); g.fill();
    const gg = g.createLinearGradient(cx - r, cy - r, cx + r * .3, cy + r * .2); gg.addColorStop(0, 'rgba(255,255,255,.14)'); gg.addColorStop(.5, 'rgba(255,255,255,.02)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); g.beginPath(); g.arc(cx, cy, r, PI * .95, PI * 1.85); g.closePath(); g.fillStyle = gg; g.fill();
  }
  function tracer(g, x, y, r, o = {}) { // сквозная «капля»-метка: стеклянная капля со свечением; o.col, o.drop false - шар, o.stretch, o.rot, o.ring, o.a
    const col = o.col || P.cyan, a = o.a ?? 1; if (a <= 0) return; glow(g, x, y, r * 3.4, col, .6 * a);
    g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot * DEG); const st = o.stretch || 1; g.scale(1 / Math.sqrt(st), st); g.globalAlpha *= a; g.beginPath();
    if (o.drop !== false) { g.moveTo(0, -r * 1.75); g.bezierCurveTo(r * .45, -r * .95, r, -r * .55, r, 0); g.arc(0, 0, r, 0, PI); g.bezierCurveTo(-r, -r * .55, -r * .45, -r * .95, 0, -r * 1.75); } else g.arc(0, 0, r, 0, PI2);
    const gr = g.createRadialGradient(-r * .3, -r * .35, r * .1, 0, 0, r * 1.25); gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(.35, mix(col, '#FFFFFF', .35)); gr.addColorStop(1, mix(col, '#000000', .35)); g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = Math.max(1.5, r * .08); g.stroke(); g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(-r * .38, -r * .22, r * .15, r * .3, .5, 0, PI2); g.fill(); g.restore();
    if (o.ring !== false) { const q = (T * .8) % 1; g.save(); g.globalAlpha *= (1 - q) * .7 * a; g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r * (1.5 + q * 2.4), 0, PI2); g.stroke(); g.restore(); }
  }
  function holo(g, q, o = {}) { // голографическая плоскость-сетка по 4 углам [x0,y0,…,x3,y3] (по часовой); o.n, o.col, o.a
    const col = o.col || P.cyan, n = o.n || 8; g.save(); g.globalAlpha *= o.a ?? 1; poly(g, q, true); g.fillStyle = rgba(col, .07); g.fill();
    g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(col, .35); g.lineWidth = 1.5; g.beginPath();
    for (let i = 1; i < n; i++) { const u = i / n; g.moveTo(lerp(q[0], q[2], u), lerp(q[1], q[3], u)); g.lineTo(lerp(q[6], q[4], u), lerp(q[7], q[5], u)); g.moveTo(lerp(q[0], q[6], u), lerp(q[1], q[7], u)); g.lineTo(lerp(q[2], q[4], u), lerp(q[3], q[5], u)); }
    g.stroke(); poly(g, q, true); g.strokeStyle = rgba(col, .9); g.lineWidth = 3; g.stroke(); g.restore();
  }
  function scan(g, p, x0, x1, before, after, o = {}) { // срез-скан: левее светящейся линии - after(g), правее - before(g); p 0…1
    const xs = lerp(x0, x1, eio(p)), y0 = o.y0 ?? 0, y1 = o.y1 ?? H;
    if (p < 1) { g.save(); g.beginPath(); g.rect(xs, y0 - 60, 5000, y1 - y0 + 120); g.clip(); before(g); g.restore(); }
    if (p > 0) { g.save(); g.beginPath(); g.rect(xs - 5000, y0 - 60, 5000, y1 - y0 + 120); g.clip(); after(g); g.restore(); }
    if (p > 0 && p < 1) { beam(g, [xs, y0, xs, y1], { col: o.col || P.cyan, w: 5 }); glow(g, xs, (y0 + y1) / 2, (y1 - y0) * .55, o.col || P.cyan, .3, { sx: .14 }); }
  }

  // ---------- текст ----------
  function font(size, w = 700, kind = 'sans') { return w + ' ' + Math.max(1, Math.round(size * 2) / 2) + 'px ' + (F[kind] || F.sans); }
  function fit(g, s, size, max, w = 700, kind = 'sans') { g.font = font(size, w, kind); const m = g.measureText(s).width; return m > max ? size * max / m : size; }
  function text(g, s, x, y, size, o = {}) { // одна строка: o.w, o.kind (sans|mono|serif), o.col, o.al, o.max (ужать), o.base
    s = String(s); let sz = size; g.font = font(sz, o.w || 700, o.kind); let w = g.measureText(s).width;
    if (o.max && w > o.max) { sz = size * o.max / w; g.font = font(sz, o.w || 700, o.kind); w = g.measureText(s).width; }
    g.textAlign = o.al || 'left'; g.textBaseline = o.base || 'alphabetic'; g.fillStyle = o.col || P.text; g.fillText(s, x, y); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    return { w, size: sz };
  }
  const mono = (g, s, x, y, size = 24, o = {}) => text(g, s, x, y, size, Object.assign({ kind: 'mono', col: P.mute }, o));
  const PC = new Map();
  function parse(s) { if (PC.has(s)) return PC.get(s); const out = []; String(s).split('\n').forEach((ln, li) => ln.split(/\s+/).filter(Boolean).forEach((w, j) => { const k = w[0] === '*' && w.length > 1; out.push({ w: k ? w.slice(1) : w, k, br: li > 0 && j === 0 }); })); PC.set(s, out); return out; }
  function say(g, lt, t0, s, x, y, size, o = {}) { // текст по словам: слово всплывает без перелёта в t0 + i*o.dt (или o.times[i]); *ключ - цвет o.key + подчёркивание
    const toks = parse(s); if (!toks.length) return { w: 0, h: 0, size, lines: 0, last: y };
    const wt = o.w || 700, kind = o.kind || 'sans', al = o.al || 'left', max = o.max || (al === 'center' ? 2 * Math.min(x - 60, 1020 - x) : al === 'right' ? x - 60 : 1020 - x);
    let sz = size, ws, lines;
    for (let it = 0; it < 7; it++) {
      g.font = font(sz, wt, kind); ws = toks.map(t => g.measureText(t.w).width); const widest = Math.max(...ws); if (widest > max) { sz *= max / widest * .995; continue; }
      const spc = sz * .26; lines = []; let cur = [], cw = 0;
      toks.forEach((t, i) => { if (cur.length && (t.br || cw + spc + ws[i] > max)) { lines.push({ it: cur, w: cw }); cur = []; cw = 0; } cw += (cur.length ? spc : 0) + ws[i]; cur.push(i); });
      lines.push({ it: cur, w: cw }); if (!o.lines || lines.length <= o.lines) break; sz *= .9;
    }
    const spc = sz * .26, lh = sz * (o.lh ?? 1.12), sprite = !!(o.glow || o.grad); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    lines.forEach((L, li) => { let lx = al === 'center' ? x - L.w / 2 : al === 'right' ? x - L.w : x; const ly = y + li * lh;
      L.it.forEach(i => { const t = toks[i], tw = o.times ? o.times[Math.min(i, o.times.length - 1)] : t0 + i * (o.dt ?? .12), q = pr(lt, tw, tw + (o.dur ?? .3));
        if (q > 0) { const e = eo(q); let a = e, dy = (1 - e) * (o.rise ?? sz * .3);
          if (o.out != null) { const u = pr(lt, o.out, o.out + .2); a *= 1 - u; dy -= eo(u) * sz * .25; }
          if (a > .003) { g.save(); g.globalAlpha *= a; const col = t.k ? (o.key || P.cyan) : (o.col || P.text);
            if (sprite) { const sp = tspr(t.w, sz, wt, kind, col, t.k ? null : o.grad, o.glow ? (t.k ? rgba(o.key || P.cyan, .55) : o.glow) : null); g.drawImage(sp.c, lx - sp.pad, ly + dy - sp.asc - sp.pad); }
            else { g.fillStyle = col; g.fillText(t.w, lx, ly + dy); }
            if (t.k && o.under !== false) { const u = eo(pr(lt, tw + .12, tw + .45)), uw = ws[i] * u, uh = Math.max(4, sz * .07); if (uw > 1) { g.fillStyle = o.key || P.cyan; g.fillRect(lx, ly + dy + sz * .14, uw, uh); glow(g, lx + uw, ly + dy + sz * .14 + uh / 2, sz * .5, o.key || P.cyan, .6); } }
            g.restore(); } }
        lx += ws[i] + spc; }); });
    return { w: Math.max(...lines.map(l => l.w)), h: lines.length * lh, size: sz, lines: lines.length, last: y + (lines.length - 1) * lh };
  }
  function header(g, lt, o) { // заголовок как в образце: белый надзаголовок + крупный голубой заголовок со свечением (+ строка); возвращает низ
    const x = o.x ?? 64, al = o.al || 'left', size = o.size ?? 150, max = o.max ?? (al === 'center' ? 950 : 1016 - x), ts = o.t || [0, .25, .7], os = o.overSize ?? 50;
    let y = o.y ?? 196, bottom = y;
    if (o.over) { const r = say(g, lt, ts[0], o.over, x, y, os, { w: 700, col: P.text, key: o.key || P.cyan, max, al, out: o.out, dt: o.dt ?? .1, times: o.overTimes, under: false }); y = r.last; bottom = y + os * .25; }
    if (o.title) { y += o.over ? size * 1.02 : size * .2; const r = say(g, lt, ts[1], o.title, x, y, size, { w: 800, grad: o.col || ['#D2F4FF', '#3DB6EE'], glow: o.glow ?? 'rgba(60,180,255,.5)', key: o.titleKey || P.amber, max, al, out: o.out, dt: o.dtTitle ?? .16, times: o.titleTimes, lh: o.lh ?? 1.02, under: false }); y = r.last; bottom = y + r.size * .12; }
    if (o.sub) { const ss = o.subSize ?? 64; y += ss * 1.32; const r = say(g, lt, ts[2], o.sub, x, y, ss, { w: 700, col: o.subCol || P.text, key: o.key || P.cyan, max, al, out: o.out, dt: o.dt ?? .12, times: o.subTimes }); bottom = r.last + ss * .3; }
    return bottom;
  }
  function odo(g, x, y, v, o = {}) { // счётчик с прокруткой цифр (одометр): v - число (дробная часть крутит младший разряд); o.size, o.digits, o.col, o.al, o.unit
    const size = o.size || 120, n = o.digits || Math.max(1, String(Math.floor(Math.abs(v))).length), f = font(size, o.w || 800, o.kind || 'sans');
    g.font = f; const dw = g.measureText('0').width * 1.02, tw = dw * n, x0 = o.al === 'center' ? x - tw / 2 : o.al === 'right' ? x - tw : x;
    g.save(); if (o.glow !== false) glow(g, x0 + tw / 2, y - size * .38, size * 1.1, o.glowCol || P.cyan, .22, { sx: Math.max(1, tw / size) * .8 });
    g.beginPath(); g.rect(x0 - 10, y - size * .86, tw + 20, size * 1.02); g.clip(); g.textAlign = 'center';
    const gr = g.createLinearGradient(0, y - size * .75, 0, y); gr.addColorStop(0, (o.grad || ['#D2F4FF', '#3DB6EE'])[0]); gr.addColorStop(1, (o.grad || ['#D2F4FF', '#3DB6EE'])[1]); g.fillStyle = o.col || gr;
    for (let i = 0; i < n; i++) { const p10 = Math.pow(10, n - 1 - i), base = Math.floor(v / p10), rem = v - base * p10, fr = p10 === 1 ? v - Math.floor(v) : Math.max(0, rem - (p10 - 1)), d = base % 10, cx = x0 + i * dw + dw / 2, lead = base === 0 && i < n - 1;
      if (!lead) g.fillText(String(d), cx, y - fr * size * 1.02); if (fr > 0) g.fillText(String((d + 1) % 10), cx, y + (1 - fr) * size * 1.02); }
    g.restore();
    let uw = 0; if (o.unit) uw = text(g, o.unit, x0 + tw + size * .08, y, size * (o.unitK ?? .5), { w: 800, col: o.unitCol || P.cyanHi }).w;
    return { w: tw + uw + size * .08, x0 };
  }

  // ---------- интерфейс: панели, плашки, выноски, переключатели ----------
  function panel(g, x, y, w, h, o = {}) { // стеклянная тёмная панель: скругление o.r, тонкая рамка, блик сверху; o.glow - цветная рамка
    const r = o.r ?? 26, W2 = Math.round(w), H2 = Math.round(h);
    g.drawImage(cache('panel' + [W2, H2, r, o.bg, o.border].join('_'), W2 + 4, H2 + 4, b => { b.translate(2, 2); rrect(b, 0, 0, W2, H2, r); b.fillStyle = o.bg || 'rgba(11,15,24,.8)'; b.fill();
      const gr = b.createLinearGradient(0, 0, 0, Math.min(H2, 90)); gr.addColorStop(0, 'rgba(255,255,255,.07)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); b.fillStyle = gr; b.fill(); b.strokeStyle = o.border || 'rgba(255,255,255,.13)'; b.lineWidth = 2; b.stroke(); }), x - 2, y - 2, W2 + 4, H2 + 4);
    if (o.glow) { g.save(); g.globalCompositeOperation = 'lighter'; rrect(g, x, y, w, h, r); g.strokeStyle = rgba(o.glow, .55 * (o.ga ?? 1)); g.lineWidth = 3; g.stroke(); g.restore(); }
  }
  function pill(g, x, y, s, o = {}) { // плашка-ярлык (как подписи деталей в образце): x - край (o.al 'l' левый | 'r' правый | 'c' центр), y - середина
    const size = o.size || 40, ss = Math.round(size * .66); g.font = font(size, 700); const tw = g.measureText(s).width; let sw = 0;
    if (o.sub) { g.font = font(ss, 700, 'mono'); sw = g.measureText(o.sub).width; }
    const h = size * 1.62, px = size * .55, dw = o.dot ? size * .6 : 0, w = px * 2 + dw + tw + (o.sub ? size * .45 + sw : 0), x0 = o.al === 'r' ? x - w : o.al === 'c' ? x - w / 2 : x;
    rrect(g, x0, y - h / 2, w, h, h / 2); g.fillStyle = o.bg || 'rgba(9,13,21,.88)'; g.fill(); g.strokeStyle = o.glow ? rgba(o.glow, .8) : 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.stroke();
    let cx = x0 + px; if (o.dot) { g.fillStyle = o.dot; g.beginPath(); g.arc(cx + size * .15, y, size * .15, 0, PI2); g.fill(); glow(g, cx + size * .15, y, size * .55, o.dot, .55); cx += dw; }
    g.textBaseline = 'middle'; g.textAlign = 'left'; g.font = font(size, 700); g.fillStyle = o.col || P.text; g.fillText(s, cx, y + size * .05);
    if (o.sub) { g.font = font(ss, 700, 'mono'); g.fillStyle = o.subCol || P.mute; g.fillText(o.sub, cx + tw + size * .45, y + size * .05); }
    g.textBaseline = 'alphabetic'; return { x0, y0: y - h / 2, w, h };
  }
  function callout(g, lt, t0, ax, ay, lx, ly, title, o = {}) { // выноска: точка-якорь (ax,ay) → линия → плашка у (lx,ly); o.side 'r'|'l', o.sub, o.col, o.size, o.out
    if (lt < t0) return; let A = 1; if (o.out != null) A = 1 - pr(lt, o.out, o.out + .2); if (A <= 0) return;
    const col = o.col || P.cyan, p1 = eo(pr(lt, t0, t0 + .18)), p2 = eo(pr(lt, t0 + .06, t0 + .34)), p3 = pr(lt, t0 + .22, t0 + .5);
    g.save(); g.globalAlpha *= A; glow(g, ax, ay, 40, col, .7 * p1);
    g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(ax, ay, 8 * p1, 0, PI2); g.fill();
    const q = ((lt - t0) * .7) % 1; g.strokeStyle = rgba(col, (1 - q) * .85 * p1); g.lineWidth = 3; g.beginPath(); g.arc(ax, ay, 10 + q * 28, 0, PI2); g.stroke();
    const v = o.elbow ? [ax, ay, ax, ly, lx, ly] : [ax, ay, lx, ly];
    if (p2 > 0) { g.strokeStyle = 'rgba(235,245,255,.85)'; g.lineWidth = 2.5; poly(g, part(v, p2)); g.stroke(); }
    if (p3 > 0) { const e = eb(p3, 1.1), s = lerp(.86, 1, e); g.translate(lx, ly); g.scale(s, s); g.translate(-lx, -ly); g.globalAlpha *= cl(p3 * 2.4);
      pill(g, lx, ly, title, { size: o.size || 44, dot: col, sub: o.sub, al: o.side === 'l' ? 'r' : 'l', glow: o.glow ? col : null }); }
    g.restore();
  }
  function chip(g, x, y, s, o = {}) { // статус «● РЕЖИМ»: x - правый край (o.al 'l' - левый), y - середина; точка мигает
    const size = o.size || 26, col = o.col || P.cyan; g.font = font(size, 700, 'mono'); const tw = g.measureText(s).width, h = size * 1.9, w = tw + size * 2.3, x0 = o.al === 'l' ? x : x - w;
    rrect(g, x0, y - h / 2, w, h, h / 2); g.fillStyle = 'rgba(9,13,21,.85)'; g.fill(); g.strokeStyle = rgba(col, .6); g.lineWidth = 2; g.stroke();
    if (o.blink === false || (T * 1.25) % 1 < .62) { g.fillStyle = col; g.beginPath(); g.arc(x0 + size * .95, y, size * .24, 0, PI2); g.fill(); glow(g, x0 + size * .95, y, size, col, .6); }
    g.fillStyle = o.tcol || P.text; g.textBaseline = 'middle'; g.fillText(s, x0 + size * 1.55, y + 1); g.textBaseline = 'alphabetic'; return { x0, w, h };
  }
  function readouts(g, x, y, w, items, o = {}) { // пульт-показания (HUD-счётчики): items [{label, value, unit, col, on 0…1, frac 0…1}]; o.h, o.vs (размер чисел)
    const h = o.h || 170, n = items.length, cw = w / n, vs = o.vs ?? 60; panel(g, x, y, w, h, { r: 28 });
    items.forEach((it, i) => { const x0 = x + i * cw, on = cl(it.on || 0), col = it.col || P.cyan;
      if (i) { g.fillStyle = 'rgba(255,255,255,.09)'; g.fillRect(x0, y + 22, 2, h - 44); }
      if (on > 0) { g.save(); g.globalAlpha *= on; rrect(g, x0 + 8, y + 8, cw - 16, h - 16, 22); g.fillStyle = rgba(col, .12); g.fill(); g.strokeStyle = rgba(col, .75); g.lineWidth = 2; g.stroke(); g.restore(); }
      mono(g, it.label, x0 + 26, y + 44, o.ls ?? 22, { w: 700, col: on > .5 ? col : P.mute, max: cw - 44 });
      const r = text(g, it.value, x0 + 24, y + 48 + vs * .98, vs, { kind: 'mono', w: 700, col: on > .5 ? '#FFFFFF' : P.text, max: cw - 44 - (it.unit ? vs * 1.1 : 0) });
      if (it.unit) mono(g, it.unit, x0 + 24 + r.w + vs * .1, y + 48 + vs * .98, r.size * .48, { w: 700, col: on > .5 ? col : P.mute });
      const by = y + h - 30, bw = cw - 52; g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(x0 + 26, by, bw, 6);
      if (it.frac > 0) { g.fillStyle = col; g.fillRect(x0 + 26, by, bw * cl(it.frac), 6); glow(g, x0 + 26 + bw * cl(it.frac), by + 3, 24, col, .5 + .5 * on); } });
  }
  function seg(g, x, y, w, items, active, o = {}) { // переключатель режимов; active - индекс (дробный - пилюля едет); возвращает центры кнопок
    const h = o.h || 66, n = items.length, cw = w / n, size = o.size || 26; rrect(g, x, y, w, h, h / 2); g.fillStyle = 'rgba(9,13,21,.85)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2; g.stroke();
    const ax = x + 5 + active * cw; rrect(g, ax, y + 5, cw - 10, h - 10, (h - 10) / 2); g.fillStyle = o.col || '#F2F5FA'; g.fill(); if (o.col) glow(g, ax + cw / 2, y + h / 2, cw * .6, o.col, .35, { sy: .5 });
    g.font = font(size, 700); g.textAlign = 'center'; g.textBaseline = 'middle';
    items.forEach((s, i) => { g.fillStyle = Math.abs(i - active) < .5 ? (o.tcol || '#0B0F18') : P.mute; g.fillText(s, x + i * cw + cw / 2, y + h / 2 + 1); });
    g.textAlign = 'left'; g.textBaseline = 'alphabetic'; return items.map((_, i) => [x + i * cw + cw / 2, y + h / 2]);
  }
  function slider(g, x, y, w, v, o = {}) { // ползунок v 0…1 со светящейся заливкой; возвращает x ручки
    const col = o.col || P.cyan, xv = x + w * cl(v); g.save(); g.lineCap = 'round'; g.lineWidth = o.h || 8; g.strokeStyle = 'rgba(255,255,255,.16)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.stroke();
    g.strokeStyle = col; g.beginPath(); g.moveTo(x, y); g.lineTo(xv, y); g.stroke(); g.restore(); glow(g, xv, y, 44, col, .6);
    g.beginPath(); g.arc(xv, y, o.r || 18, 0, PI2); g.fillStyle = '#FFFFFF'; g.fill(); return xv;
  }
  function toggle(g, x, y, on, o = {}) { // тумблер; on 0…1 (анимируется)
    const w = o.w || 96, h = w * .54, col = o.col || P.cyan, kx = lerp(x + h / 2, x + w - h / 2, eo(on)); rrect(g, x, y, w, h, h / 2); g.fillStyle = on > .5 ? rgba(col, .85) : 'rgba(255,255,255,.14)'; g.fill();
    g.beginPath(); g.arc(kx, y + h / 2, h * .4, 0, PI2); g.fillStyle = '#FFFFFF'; g.fill(); if (on > .5) glow(g, kx, y + h / 2, h, col, .5);
  }
  function knob(g, cx, cy, r, o = {}) { // ручка-регулятор с подсвеченным кольцом (как на пульте образца); o.v 0…1 - поворот метки, o.col
    const col = o.col || P.amber; glow(g, cx, cy, r * 1.7, col, .3); g.beginPath(); g.arc(cx, cy, r, 0, PI2); g.fillStyle = mat(g, 'black', cx - r, cy - r, cx + r, cy + r); g.fill();
    g.save(); g.globalCompositeOperation = 'lighter'; g.beginPath(); g.arc(cx, cy, r * .9, 0, PI2); g.strokeStyle = rgba(col, .85); g.lineWidth = r * .07; g.stroke(); g.restore();
    g.beginPath(); g.arc(cx, cy, r * .62, 0, PI2); g.fillStyle = mat(g, 'steel', cx - r, cy - r, cx + r, cy + r); g.fill();
    const a = (-225 + 270 * cl(o.v ?? .5)) * DEG; g.strokeStyle = '#11141B'; g.lineWidth = r * .08; g.beginPath(); g.moveTo(cx + Math.cos(a) * r * .2, cy + Math.sin(a) * r * .2); g.lineTo(cx + Math.cos(a) * r * .55, cy + Math.sin(a) * r * .55); g.stroke();
  }
  function ring(g, cx, cy, r, v, o = {}) { // кольцо-прогресс со свечением: v 0…1; o.w, o.col, o.ticks
    const w = o.w || r * .12, col = o.col || P.cyan, a0 = -PI / 2; g.save(); g.lineCap = 'butt'; g.beginPath(); g.arc(cx, cy, r, 0, PI2); g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = w; g.stroke();
    if (o.ticks) { g.strokeStyle = 'rgba(220,232,250,.45)'; g.lineWidth = 2; g.beginPath(); for (let i = 0; i < o.ticks; i++) { const a = a0 + i * PI2 / o.ticks; g.moveTo(cx + Math.cos(a) * (r + w * .8), cy + Math.sin(a) * (r + w * .8)); g.lineTo(cx + Math.cos(a) * (r + w * 1.4), cy + Math.sin(a) * (r + w * 1.4)); } g.stroke(); }
    if (v > 0) { const ea = a0 + PI2 * cl(v); g.globalCompositeOperation = 'lighter'; g.beginPath(); g.arc(cx, cy, r, a0, ea); g.strokeStyle = rgba(col, .3); g.lineWidth = w * 2.2; g.stroke(); g.strokeStyle = col; g.lineWidth = w; g.stroke(); g.restore(); glow(g, cx + Math.cos(ea) * r, cy + Math.sin(ea) * r, w * 3, col, .9); return; }
    g.restore();
  }
  function bar(g, x, y, w, h, v, o = {}) { // полоса-прогресс со свечением на конце; o.col, o.col0 (начало градиента)
    const col = o.col || P.cyan; rrect(g, x, y, w, h, h / 2); g.fillStyle = 'rgba(255,255,255,.08)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2; g.stroke();
    const fw = (w - 6) * cl(v); if (fw > 1) { const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, o.col0 || col); gr.addColorStop(1, col); rrect(g, x + 3, y + 3, fw, h - 6, (h - 6) / 2); g.fillStyle = gr; g.fill(); glow(g, x + 3 + fw, y + h / 2, h * 2, col, .8); }
  }
  function scale(g, x, y, len, o = {}) { // шкала с делениями (линейка, глубиномер, термометр): o.vertical, o.min, o.max, o.step, o.every, o.fmt, o.side, o.size, o.col
    const min = o.min ?? 0, max = o.max ?? 100, step = o.step ?? 10, every = o.every ?? 1, n = Math.round((max - min) / step), side = o.side ?? 1, col = o.col || 'rgba(220,232,248,.8)', size = o.size || 26, vert = !!o.vertical;
    g.save(); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); if (vert) g.lineTo(x, y + len); else g.lineTo(x + len, y);
    for (let i = 0; i <= n; i++) { const d = len * i / n, L = (i % every === 0 ? 24 : 12) * side; if (vert) { g.moveTo(x, y + d); g.lineTo(x + L, y + d); } else { g.moveTo(x + d, y); g.lineTo(x + d, y + L); } }
    g.stroke(); g.font = font(size, 700, 'mono');
    for (let i = 0; i <= n; i += every) { const d = len * i / n, v = min + i * step, s = o.fmt ? o.fmt(v) : String(v);
      if (vert) { g.textAlign = side > 0 ? 'left' : 'right'; g.textBaseline = 'middle'; g.fillText(s, x + 34 * side, y + d); } else { g.textAlign = 'center'; g.textBaseline = side > 0 ? 'top' : 'bottom'; g.fillText(s, x + d, y + 34 * side); } }
    g.restore(); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  }
  function cursor(g, x, y, o = {}) { // указатель мыши (стрелка): x,y - кончик; o.press 0…1, o.s
    const s = (o.s || 1.3) * (1 - .14 * (o.press || 0)), v = [0, 0, 0, 34, 9, 26, 15, 39, 21, 36, 15, 24, 26, 24];
    g.save(); g.translate(x, y); g.scale(s, s); g.translate(3, 5); poly(g, v, true); g.fillStyle = 'rgba(0,0,0,.4)'; g.fill(); g.translate(-3, -5);
    poly(g, v, true); g.fillStyle = '#FFFFFF'; g.fill(); g.strokeStyle = '#0E1118'; g.lineWidth = 2.2; g.stroke(); g.restore();
  }
  function cpath(t, keys) { // путь курсора по ключам [[t, x, y, клик 0|1], …] → {x, y, press}
    let x = keys[0][1], y = keys[0][2], press = 0;
    for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (t >= a[0] && t < b[0]) { const e = eio(pr(t, a[0], b[0])); x = lerp(a[1], b[1], e); y = lerp(a[2], b[2], e); } }
    const L = keys[keys.length - 1]; if (t >= L[0]) { x = L[1]; y = L[2]; }
    keys.forEach(k => { if (k[3]) press = Math.max(press, cl(1 - Math.abs(t - k[0]) / .14)); }); return { x, y, press };
  }
  function click(g, lt, t0, x, y, o = {}) { const q = pr(lt, t0, t0 + .5); if (q <= 0 || q >= 1) return; const col = o.col || P.cyan; g.save(); g.strokeStyle = rgba(col, (1 - q) * .9); g.lineWidth = 4 * (1 - q) + 1; g.beginPath(); g.arc(x, y, 10 + eo(q) * 64, 0, PI2); g.stroke(); g.restore(); glow(g, x, y, 64, col, (1 - q) * .6); }
  function check(g, x, y, s, p = 1, o = {}) { if (p <= 0) return; g.save(); g.strokeStyle = o.col || P.ok; g.lineWidth = o.lw || s * .2; g.lineCap = 'round'; g.lineJoin = 'round'; poly(g, part([x - s * .5, y, x - s * .12, y + s * .38, x + s * .55, y - s * .42], p)); g.stroke(); g.restore(); }
  function badge(g, lt, t0, x, y, s, o = {}) { // значок-штамп результата: светящаяся рамка, галочка рисуется, текст; пружина + вспышка
    if (lt < t0) return; const col = o.col || P.ok, size = o.size || 52, q = lt - t0, e = spring(q, { damp: 8, freq: 14 }), A = cl(q / .12);
    g.font = font(size, 800); const tw = g.measureText(s).width, h = size * 1.75, ic = o.icon === false ? 0 : size * 1.05, w = tw + ic + size * 1.2;
    g.save(); g.translate(x, y); g.scale(e, e); g.rotate((o.rot ?? -3) * DEG); g.globalAlpha *= A; glow(g, 0, 0, w * .62, col, .3, { sy: h / w * 1.8 });
    rrect(g, -w / 2, -h / 2, w, h, h * .28); g.fillStyle = 'rgba(6,12,16,.88)'; g.fill(); g.strokeStyle = col; g.lineWidth = 4; g.stroke();
    rrect(g, -w / 2 + 9, -h / 2 + 9, w - 18, h - 18, h * .22); g.strokeStyle = rgba(col, .45); g.lineWidth = 2; g.stroke();
    if (ic) check(g, -w / 2 + size * .6 + ic * .38, size * .02, size * .62, pr(q, .08, .32), { col });
    g.fillStyle = o.tcol || '#FFFFFF'; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(s, -w / 2 + size * .6 + ic, size * .05); g.textBaseline = 'alphabetic'; g.restore();
    const f = pr(q, 0, .5); if (f < 1) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(col, (1 - f) * .8); g.lineWidth = 6 * (1 - f) + .5; g.beginPath(); g.ellipse(x, y, w * .5 + eo(f) * 90, h * .5 + eo(f) * 60, 0, 0, PI2); g.stroke(); g.restore(); }
  }
  function filmstrip(g, x, y, w, h, n, active, fn, o = {}) { // лента миниатюр (пульт образца): fn(g, i, x, y, w, h); active - дробный индекс; снизу светящаяся дорожка со стрелками
    const gap = o.gap ?? 14, tw = (w - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) { const tx = x + i * (tw + gap); g.save(); rrect(g, tx, y, tw, h, 10); g.clip(); fn(g, i, tx, y, tw, h); g.restore(); rrect(g, tx, y, tw, h, 10); g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 2; g.stroke(); }
    const ax = x + active * (tw + gap); rrect(g, ax - 5, y - 5, tw + 10, h + 10, 14); g.strokeStyle = P.cyanHi; g.lineWidth = 4; g.stroke(); glow(g, ax + tw / 2, y + h / 2, tw * .8, P.cyan, .35);
    const ty = y + h + 34; beam(g, [x + 40, ty, x + w - 40, ty], { w: 3, a: .8 }); [[x + 12, 1], [x + w - 12, -1]].forEach(([px, d]) => { g.strokeStyle = P.cyanHi; g.lineWidth = 4; g.beginPath(); g.moveTo(px + 12 * d, ty - 12); g.lineTo(px, ty); g.lineTo(px + 12 * d, ty + 12); g.stroke(); });
  }

  return { W, H, P, F, SAFE: { x0: 60, x1: 1020, y0: 110, y1: 1690 }, DEG,
    cl, pr, lerp, eo, eo5, ei, eio, eb, sm, spring, hash, rnd, kf, num, apart, rgba, mix, heat, mat, tex,
    begin, prewarm, cuts, words, at, camera, layer, view, blur, focus, shake,
    rr, rrect, poly, plen, part, along,
    glow, beam, rays, flow, jet, bokeh, motes, shafts, flare, sweep, grade, cache,
    studio, bench, rail, pedestal, plate, bolt, led,
    cylH, cylV, gear, coil, pipe, liquid, tank, grains, bubbles, steam, stream, cup, gauge, tracer, holo, scan,
    font, fit, text, mono, say, header, odo,
    panel, pill, callout, chip, readouts, seg, slider, toggle, knob, ring, bar, scale, cursor, cpath, click, check, badge, filmstrip,
    t: () => T };
})();
