// lib.js
const UIM = (() => {
  // ===== Палитра, шрифты, константы =====
  const W = 1080, H = 1920, X0 = 60, X1 = 1020;
  const C = {
    vi: '#6C47FF', vl: '#A48FFF', ink: '#120E2A', lav: '#F3F0FF', yel: '#FFE27A',
    ok: '#1FAF6A', red: '#FF4D5E', mut: '#8A84A3', soft: '#F1EEF9', line: '#E4DFF5',
    chip: '#EEE9FF', deep: '#2A2350', bar: '#D9D0FF', paper: '#F7F5FD', white: '#FFFFFF',
    tiles: ['#C9BDFF', '#FFD3A8', '#B8EBCF', '#FFC1C7']
  };
  const F = {
    sans: '"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif',
    serif: '"DejaVu Serif",Georgia,"Noto Serif","Times New Roman",serif',
    mono: '"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace'
  };

  // ===== Математика, изинги, пружины =====
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const prog = (t, a, b) => cl((t - a) / (b - a), 0, 1);
  const eo = x => { x = cl(x, 0, 1); return 1 - Math.pow(1 - x, 3); };
  const io = x => { x = cl(x, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const back = x => { x = cl(x, 0, 1); const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  // пружина: 0 -> 1 с лёгким перелётом, x в секундах от старта, d - затухание (7 мягко, 11 жёстко)
  const spr = (x, d) => x <= 0 ? 0 : 1 - Math.exp(-(d || 7) * x) * Math.cos(11 * x);
  // альфа жизни элемента: появление 0.25 с, уход 0.18 с (в 1.4 раза быстрее)
  const life = (t, t0, t1) => eo((t - t0) / 0.25) * (t1 == null ? 1 : 1 - eo((t - (t1 - 0.18)) / 0.18));
  const fx = (x, w) => cl(x, X0, X1 - w);            // левый край блока ширины w внутри SAFE
  const slideY = (t, t0, dist, d) => (1 - spr(t - t0, d || 11)) * dist;
  const fly = (a, b, q) => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];

  // ===== Ритм и сцены =====
  function scene(t, cuts) { let i = 0; while (i < cuts.length - 2 && t >= cuts[i + 1]) i++; return { i, u: t - cuts[i], t0: cuts[i], t1: cuts[i + 1] }; }
  function cuts(subs, dur) { const c = (subs || []).map(s => s.t0); if (!c.length || c[0] > 0) c.unshift(0); c.push(dur || 35); return c; }
  const beat = (n, bpm, off) => (off || 0) + n * 60 / (bpm || 120);
  const snap = (t, bpm, off) => { const b = 60 / (bpm || 120), o = off || 0; return o + Math.round((t - o) / b) * b; };
  const countAt = (t, times) => times.filter(s => s <= t).length;
  function bumpAt(t, times) { let l = -1; for (const s of times) if (s <= t) l = s; return l < 0 ? 0 : Math.exp(-(t - l) * 9); }
  function countUp(t, t0, dur, a, b) { return Math.floor(lerp(a, b, eo((t - t0) / dur)) + 1e-6); }
  // позиция карусели: каждая метка времени сдвигает на 1 пружиной
  function stepPos(t, times) { let p = 0; times.forEach(c => p += spr(t - c - 0.08)); return p; }

  // ===== Холсты и фактуры (кэш) =====
  let TX = null;
  function mk(w, h, f) { const c = new OffscreenCanvas(w, h); f(c.getContext('2d')); return c; }
  function rr(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function tex() {
    if (TX) return TX; TX = {};
    const dots = c => g => { g.fillStyle = c; for (let y = 0; y < 2080; y += 40) for (let x = 0; x < 1240; x += 40) g.fillRect(x, y, 3, 3); };
    TX.dD = mk(1240, 2080, dots('rgba(170,150,255,0.18)'));
    TX.dL = mk(1240, 2080, dots('rgba(108,71,255,0.13)'));
    const gl = (c, z) => g => { const r = g.createRadialGradient(256, 256, 0, 256, 256, 256); r.addColorStop(0, c); r.addColorStop(1, z); g.fillStyle = r; g.fillRect(0, 0, 512, 512); };
    TX.glow = mk(512, 512, gl('rgba(124,92,255,0.5)', 'rgba(124,92,255,0)'));
    TX.gw = mk(512, 512, gl('rgba(255,255,255,0.22)', 'rgba(255,255,255,0)'));
    TX.sh = mk(600, 400, g => { g.shadowColor = 'rgba(25,10,70,0.35)'; g.shadowBlur = 50; g.shadowOffsetX = 3000; g.fillStyle = '#000'; rr(g, 100 - 3000, 100, 400, 200, 30); g.fill(); });
    return TX;
  }
  // карточка с готовой мягкой тенью (без shadowBlur в кадре)
  function card(g, x, y, w, h, r, c, noShadow) {
    if (!noShadow) g.drawImage(tex().sh, x - w * 0.25, y - h * 0.5 + h * 0.05, w * 1.5, h * 2);
    g.fillStyle = c || '#fff'; rr(g, x, y, w, h, r == null ? 28 : r); g.fill();
  }
  function glow(g, x, y, r, white) { g.drawImage(white ? tex().gw : tex().glow, x - r, y - r, r * 2, r * 2); }

  // ===== Фон, камера, переходы =====
  // mode: 'light' лаванда, 'dark' чернила, 'brand' фиолет. Сетка точек дрейфует, пятно света гуляет
  function bg(g, t, mode) {
    const T = tex(), m = mode || 'dark';
    g.fillStyle = m === 'light' ? C.lav : m === 'brand' ? C.vi : C.ink; g.fillRect(0, 0, W, H);
    g.globalAlpha = m === 'brand' ? 0.6 : 1; g.drawImage(m === 'light' ? T.dL : T.dD, -((t * 14) % 40) - 40, -((t * 22) % 40) - 40); g.globalAlpha = 1;
    g.drawImage(m === 'brand' ? T.gw : T.glow, 540 + 320 * Math.sin(t * 0.7) - 480, 900 + 300 * Math.cos(t * 0.5) - 480, 960, 960);
  }
  // оседание после склейки + медленный наезд + микропокачивание. u - секунды от склейки
  function cam(g, u, t, amp) {
    const s = 1 + Math.exp(-u * 7) * Math.cos(u * 13) * (amp || 0.04) + u * 0.008;
    g.translate(540, 900); g.scale(s, s); g.rotate(0.003 * Math.sin(t * 1.4)); g.translate(-540, -900);
  }
  function flash(g, u, dur) { const d = dur || 0.14; if (u >= 0 && u < d) { g.fillStyle = `rgba(255,255,255,${0.3 * (1 - u / d)})`; g.fillRect(0, 0, W, H); } }
  // шторка цвета col уезжает вверх за dur секунд после склейки
  function wipe(g, u, dur, col) { const p = eo(u / (dur || 0.3)); if (p >= 1) return; g.fillStyle = col || C.vi; g.fillRect(0, -H * p, W, H); }

  // ===== Текст =====
  const norm = w => String(w).toLowerCase().replace(/[.,:;!?«»"()]/g, '');
  const setF = (g, wt, size, fam) => { g.font = `${wt} ${size}px ${fam || F.sans}`; return size; };
  function fit(g, s, wt, size, max, fam) {
    max = Math.min(max, X1 - X0); setF(g, wt, size, fam); const w = g.measureText(s).width;
    if (w > max) size = Math.max(14, Math.floor(size * max / w)); return setF(g, wt, size, fam);
  }
  // перенос по словам без одиночного слова в последней строке
  function wrap(g, s, w) {
    const ws = String(s).split(/\s+/).filter(Boolean), o = []; let c = '';
    ws.forEach(q => { const tr = c ? c + ' ' + q : q; if (c && g.measureText(tr).width > w) { o.push(c); c = q; } else c = tr; });
    if (c) o.push(c);
    if (o.length > 1 && o[o.length - 1].indexOf(' ') < 0) {
      const p = o[o.length - 2].split(' ');
      if (p.length >= 3) { o[o.length - 1] = p.pop() + ' ' + o[o.length - 1]; o[o.length - 2] = p.join(' '); }
    }
    return o;
  }
  // раскладка: '|' - принудительный перенос; кегль уменьшается, пока не влезет в maxLines и maxW
  function lay(g, text, maxW, size, wt, fam, maxLines) {
    let s = size, ls = [];
    for (let k = 0; k < 14; k++) {
      setF(g, wt, s, fam); ls = [];
      String(text).split('|').forEach(p => ls.push(...wrap(g, p.trim(), maxW)));
      const wm = Math.max(...ls.map(l => g.measureText(l).width));
      if (ls.length <= maxLines && wm <= maxW) break; s = Math.max(24, Math.floor(s * 0.92));
    }
    setF(g, wt, s, fam); return { lines: ls, size: s };
  }
  // ядро: текст по словам снизу вверх, ключевое слово в цвете + полупрозрачная плашка-маркер
  function words(g, text, o) {
    text = String(text).replace(/—/g, '-');
    const t = o.t, t0 = o.t0 || 0, fam = o.fam || F.sans, wt = o.wt || 800, maxW = Math.min(o.maxW || 920, X1 - X0);
    const L = lay(g, text, maxW, o.size || 110, wt, fam, o.lines || 2), s = L.size, lh = s * (o.lh || 1.1);
    const ex = o.t1 != null ? eo((t - (o.t1 - 0.18)) / 0.18) : 0;
    const res = { bottom: o.y + (L.lines.length - 1) * lh, size: s, lines: L.lines.length };
    if (ex >= 1 || t < t0) return res;
    const keys = (Array.isArray(o.key) ? o.key : String(o.key || '').split(' ')).map(norm).filter(Boolean);
    const n = L.lines.join(' ').split(' ').length, st = Math.min(o.stagger || 0.1, 0.45 / Math.max(1, n));
    const cx = o.x == null ? 540 : o.x, col = o.col || C.ink, kc = o.kc || C.vi;
    g.textAlign = 'left'; g.textBaseline = 'alphabetic'; let i = 0;
    L.lines.forEach((ln, li) => {
      const ws = ln.split(' '), sw = g.measureText(' ').width, wd = ws.map(w => g.measureText(w).width);
      const tw = wd.reduce((a, b) => a + b, 0) + sw * (ws.length - 1), yy = o.y + li * lh;
      let x = fx(o.align === 'left' ? cx : cx - tw / 2, tw);
      ws.forEach((w, j) => {
        const p = eo((t - t0 - i * st) / 0.26);
        if (p > 0) {
          const isK = keys.indexOf(norm(w)) >= 0, a = p * (1 - ex);
          if (isK && o.mark !== false) { const q = eo((t - t0 - i * st - 0.12) / 0.3); g.globalAlpha = 0.35 * a; g.fillStyle = kc; g.fillRect(x, yy + s * 0.12, wd[j] * q, s * 0.13); }
          g.globalAlpha = a; g.fillStyle = isK ? kc : col; g.fillText(w, x, yy + (1 - p) * s * 0.3 - ex * 50);
        }
        x += wd[j] + sw; i++;
      });
    });
    g.globalAlpha = 1; return res;
  }
  const head = (g, text, o) => words(g, text, Object.assign({ size: 120, wt: 800, lines: 2 }, o));
  const body = (g, text, o) => words(g, text, Object.assign({ size: 52, wt: 600, lines: 3, lh: 1.25, stagger: 0.06, mark: false }, o));
  // мелкая моно-надпись над заголовком (декор, можно < 44 px)
  function kicker(g, x, y, text, p, col) {
    if (p <= 0) return; fit(g, text, 700, 30, 900, F.mono); const w = g.measureText(text).width;
    g.globalAlpha = cl(p, 0, 1); g.fillStyle = col || C.vl; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillText(text, fx(x - w / 2, w), y + (1 - p) * 20); g.globalAlpha = 1;
  }

  // ===== Плашки, кнопки, значки =====
  function star(g, x, y, r, c) {
    g.fillStyle = c || C.vi; g.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, q = i % 2 ? r * 0.32 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    g.closePath(); g.fill();
  }
  function check(g, x, y, s, col) {
    g.strokeStyle = col || '#fff'; g.lineWidth = Math.max(3, s * 0.22); g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(x - s * 0.5, y); g.lineTo(x - s * 0.15, y + s * 0.35); g.lineTo(x + s * 0.5, y - s * 0.35); g.stroke(); g.lineCap = 'butt';
  }
  // пилюля, масштаб p (пружина). o: {bg, fg, size, h, wt, icon:'star'|'check', maxW}. Возвращает ширину
  function pill(g, cx, cy, text, o) {
    o = o || {}; const p = o.p == null ? 1 : o.p; if (p <= 0) return 0;
    const h = o.h || 68, ic = o.icon ? h * 0.6 : 0;
    fit(g, text, o.wt || 700, o.size || 34, (o.maxW || 900) - 56 - ic, o.fam);
    const w = g.measureText(text).width + 56 + ic, x = fx(cx - w / 2, w);
    g.save(); g.translate(x + w / 2, cy); g.scale(p, p); g.fillStyle = o.bg || C.chip; rr(g, -w / 2, -h / 2, w, h, h / 2); g.fill();
    if (o.icon === 'check') check(g, -w / 2 + 28 + ic / 2, 0, h * 0.3, o.fg || C.vi); else if (o.icon) star(g, -w / 2 + 28 + ic / 2, 0, h * 0.22, o.fg || C.vi);
    g.fillStyle = o.fg || C.vi; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, ic / 2, 2); g.restore(); return w;
  }
  const aiBadge = (g, cx, cy, text, p) => pill(g, cx, cy, text || 'ИИ', { p, icon: 'star', bg: C.chip, fg: C.vi, wt: 800, size: 36 });
  // подсказка-облачко со стрелкой вверх к точке (x,y)
  function tip(g, x, y, text, p, lo, hi) {
    if (p <= 0) return; lo = Math.max(lo == null ? X0 : lo, X0); hi = Math.min(hi == null ? X1 : hi, X1);
    fit(g, text, 700, 44, Math.min(560, hi - lo - 64), F.sans);
    const w = g.measureText(text).width + 64, h = 96, bx = cl(x - w / 2, lo, hi - w);
    g.save(); g.translate(x, y); g.scale(p, p); g.translate(-x, -y); g.fillStyle = C.vi;
    g.beginPath(); g.moveTo(x - 16, y + 20); g.lineTo(x, y); g.lineTo(x + 16, y + 20); g.fill();
    rr(g, bx, y + 18, w, h, 22); g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, bx + w / 2, y + 18 + h / 2 + 2); g.restore();
  }
  // кнопка: o.press 0..1 вдавливание, o.ok - зелёная с галочкой и o.okLabel
  function button(g, cx, cy, label, o) {
    o = o || {}; const h = o.h || 76, txt = o.ok ? (o.okLabel || label) : label;
    fit(g, txt, 700, o.size || 34, 600, F.sans); const w = o.w || g.measureText(txt).width + (o.ok || o.icon ? 110 : 72);
    cx = cl(cx, X0 + w / 2, X1 - w / 2); const s = 1 - 0.08 * (o.press || 0);
    g.save(); g.translate(cx, cy); g.scale(s, s); g.fillStyle = o.ok ? C.ok : (o.col || C.vi); rr(g, -w / 2, -h / 2, w, h, h / 2); g.fill();
    let tx = 0; if (o.ok) { check(g, -w / 2 + 44, 0, 26); tx = 20; } else if (o.icon) { star(g, -w / 2 + 40, 0, 14, '#fff'); tx = 20; }
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, tx, 2); g.restore(); return w;
  }
  // мигающая метка записи / статуса
  function rec(g, cx, cy, t, p, label) {
    if (p <= 0) return; label = label || 'ЗАПИСЬ'; fit(g, label, 700, 30, 400, F.mono);
    const w = g.measureText(label).width + 90, x = fx(cx - w / 2, w);
    g.globalAlpha = p; g.fillStyle = '#fff'; rr(g, x, cy - 32, w, 64, 32); g.fill();
    g.globalAlpha = p * (0.5 + 0.5 * Math.abs(Math.cos(t * 4))); g.fillStyle = C.red; g.beginPath(); g.arc(x + 38, cy, 12, 0, 7); g.fill();
    g.globalAlpha = p; g.fillStyle = C.ink; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(label, x + 64, cy + 1); g.globalAlpha = 1;
  }
  // счётчик-плашка: подпись + целое число моно, bump 0..1 - подскок при изменении
  function counter(g, cx, cy, label, n, o) {
    o = o || {}; const p = o.p == null ? 1 : o.p; if (p <= 0) return; const d = o.dark, v = String(Math.floor(n));
    setF(g, 700, 60, F.mono); const vw = g.measureText(v).width; setF(g, 600, 28); const lw = g.measureText(label).width;
    const w = Math.min(lw + vw + 90, 900); cx = cl(cx, X0 + w / 2, X1 - w / 2); const b = 1 + 0.22 * (o.bump || 0);
    g.save(); g.globalAlpha = cl(p, 0, 1); g.translate(cx, cy); g.scale(b, b); card(g, -w / 2, -45, w, 90, 45, d ? C.deep : '#fff');
    g.fillStyle = d ? '#B9AEE0' : C.mut; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(label, -w / 2 + 30, 2);
    g.fillStyle = d ? '#fff' : C.vi; setF(g, 700, 60, F.mono); g.textAlign = 'right'; g.fillText(v, w / 2 - 30, 4); g.restore();
  }
  // штамп: влетает с увеличения, наклон, рамка
  function stamp(g, cx, cy, text, t0, t, o) {
    o = o || {}; const a = eo((t - t0) / 0.12); if (a <= 0) return; const col = o.col || C.yel;
    fit(g, text, 900, o.size || 92, 560, F.sans); const w = g.measureText(text).width + 80, sz = parseInt(g.font.match(/(\d+)px/)[1]), h = sz * 1.5;
    cx = cl(cx, X0 + w / 2 + 20, X1 - w / 2 - 20); const s = 1 + (1 - Math.min(spr(t - t0), 1)) * 0.6;
    g.save(); g.translate(cx, cy); g.rotate(o.rot == null ? -0.08 : o.rot); g.scale(s, s); g.globalAlpha = a;
    g.strokeStyle = col; g.lineWidth = 8; rr(g, -w / 2, -h / 2, w, h, 22); g.stroke();
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 0, 4); g.restore();
  }
  function avatar(g, x, y, r, letter, bg) {
    g.fillStyle = bg || C.vl; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.fillStyle = '#fff'; setF(g, 800, Math.round(r * 1.1)); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(letter, x, y + 2);
  }

  // ===== Герой: окно продукта и курсор =====
  function winL(x, y, w, h) {
    const sw = w * 0.22, mx = x + sw + 40, mw = w - sw - 60, sy = y + 84, bh = Math.max(48, h * 0.08), bw = mw * 0.42, bx = mx + mw - bw, by = sy + 12;
    const ty = by + bh + 40, th = (y + h - 24 - ty - 20) / 2, tw = (mw - 20) / 2, tiles = [];
    for (let i = 0; i < 4; i++) tiles.push([mx + (i % 2) * (tw + 20), ty + Math.floor(i / 2) * (th + 20), tw, th]);
    return { sw, mx, mw, sy, b: [bx, by, bw, bh], tiles, area: [mx, ty, mw, y + h - 24 - ty],
      pt: [[bx + bw / 2, by + bh / 2]].concat(tiles.map(q => [q[0] + q[2] / 2, q[1] + q[3] / 2])) };
  }
  // окно-приложение: o {url, btn, hi: 0 кнопка / 1..4 плитка, ha 0..1, content(g, area)}. Возвращает раскладку
  function win(g, x, y, w, h, o) {
    o = o || {}; const l = winL(x, y, w, h), hi = o.hi == null ? -1 : o.hi, ha = o.ha || 0;
    card(g, x, y, w, h, 28, '#fff'); g.fillStyle = C.soft; rr(g, x, y, w, 64, 28); g.fill(); g.fillRect(x, y + 34, w, 30);
    ['#FF6B6B', '#FFC54D', '#4BD37B'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(x + 34 + i * 26, y + 32, 8, 0, 7); g.fill(); });
    g.fillStyle = C.line; rr(g, x + 130, y + 14, w - 160, 36, 18); g.fill();
    const url = o.url || 'мой-сервис.рф'; g.fillStyle = C.mut; fit(g, url, 500, 22, w - 200, F.mono); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(url, x + 150, y + 33);
    g.fillStyle = '#F6F4FC'; rr(g, x + 20, l.sy, l.sw, y + h - l.sy - 20, 18); g.fill();
    for (let i = 0; i < 5; i++) { g.fillStyle = i == 1 ? '#DCD3FF' : '#E9E5F4'; rr(g, x + 36, l.sy + 20 + i * 48, l.sw - 32, 28, 10); g.fill(); }
    g.fillStyle = '#2A2540'; rr(g, l.mx, l.sy + 16, l.mw * 0.34, 24, 8); g.fill(); g.fillStyle = '#E6E2F2'; rr(g, l.mx, l.sy + 50, l.mw * 0.24, 16, 6); g.fill();
    if (o.content) { g.save(); o.content(g, l.area); g.restore(); }
    else l.tiles.forEach((q, i) => {
      g.fillStyle = C.lav; rr(g, q[0], q[1], q[2], q[3], 18); g.fill();
      if (hi === i + 1 && ha > 0) { g.strokeStyle = C.vi; g.lineWidth = 5; g.globalAlpha = ha; rr(g, q[0], q[1], q[2], q[3], 18); g.stroke(); g.globalAlpha = 1; }
      g.fillStyle = C.tiles[i]; g.beginPath(); g.arc(q[0] + q[3] * 0.28, q[1] + q[3] * 0.32, q[3] * 0.16, 0, 7); g.fill();
      g.fillStyle = '#DDD7EE'; rr(g, q[0] + 16, q[1] + q[3] * 0.62, q[2] * 0.7, q[3] * 0.1, 6); g.fill(); rr(g, q[0] + 16, q[1] + q[3] * 0.78, q[2] * 0.45, q[3] * 0.1, 6); g.fill();
    });
    const b = l.b, s = hi === 0 ? 1 - 0.08 * ha : 1, lb = o.btn || 'Создать';
    g.save(); g.translate(b[0] + b[2] / 2, b[1] + b[3] / 2); g.scale(s, s); g.fillStyle = C.vi; rr(g, -b[2] / 2, -b[3] / 2, b[2], b[3], b[3] / 2); g.fill();
    g.fillStyle = '#fff'; fit(g, lb, 700, Math.round(b[3] * 0.44), b[2] - 24, F.sans); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(lb, 0, 2); g.restore();
    return l;
  }
  function clickPh(t, clicks) { if (clicks) for (const c of clicks) if (c <= t && t - c < 0.4) return (t - c) / 0.4; return -1; }
  // курсор-стрелка с кольцом клика. clicks - массив времён нажатий
  function cursor(g, x, y, t, clicks, sc) {
    const c = clickPh(t, clicks); g.save(); g.translate(x, y);
    if (c >= 0) { g.strokeStyle = C.vi; g.globalAlpha = 1 - c; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 16 + 60 * eo(c), 0, 7); g.stroke(); g.globalAlpha = 1; }
    const s = (sc || 1.15) * (c >= 0 && c < 0.3 ? 1 - 0.15 * Math.sin(c / 0.3 * Math.PI) : 1); g.scale(s, s);
    const P = () => { g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 60); g.lineTo(15, 47); g.lineTo(26, 72); g.lineTo(38, 66); g.lineTo(27, 42); g.lineTo(46, 42); g.closePath(); };
    g.translate(4, 8); g.fillStyle = 'rgba(20,10,60,0.25)'; P(); g.fill(); g.translate(-4, -8);
    P(); g.fillStyle = C.ink; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 4; g.lineJoin = 'round'; g.stroke(); g.restore();
  }
  // траектория по ключам [[t,x,y],...] с inOut между ними (пауза = два ключа в одной точке)
  function path(t, kf) {
    if (t <= kf[0][0]) return [kf[0][1], kf[0][2]];
    for (let i = 1; i < kf.length; i++) if (t < kf[i][0]) { const a = kf[i - 1], b = kf[i], p = io((t - a[0]) / (b[0] - a[0])); return [lerp(a[1], b[1], p), lerp(a[2], b[2], p)]; }
    const z = kf[kf.length - 1]; return [z[1], z[2]];
  }
  // пульсирующая точка-хотспот
  function hot(g, x, y, t) {
    for (let r = 0; r < 2; r++) { const ph = (t * 1.1 + r * 0.5) % 1; g.strokeStyle = C.vi; g.globalAlpha = 1 - ph; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 16 + 46 * ph, 0, 7); g.stroke(); }
    g.globalAlpha = 1; g.fillStyle = C.vi; g.beginPath(); g.arc(x, y, 13, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 4; g.stroke();
  }

  // ===== Блоки продукта =====
  function slot(g, x, y, w, h, col) { g.strokeStyle = col || 'rgba(108,71,255,0.35)'; g.lineWidth = 3; g.setLineDash([10, 8]); rr(g, x, y, w, h, 18); g.stroke(); g.setLineDash([]); }
  // мини-кадр 210x150 в масштабе s, номер n, точка-клик в долях (u,v)
  function thumb(g, cx, cy, s, n, u, v) {
    g.save(); g.translate(cx, cy); g.scale(s, s); card(g, -105, -75, 210, 150, 18, '#fff');
    g.fillStyle = C.soft; rr(g, -105, -75, 210, 30, 18); g.fill();
    g.fillStyle = C.vi; g.beginPath(); g.arc(-105 + (u == null ? 0.6 : u) * 210, -75 + (v == null ? 0.6 : v) * 150, 10, 0, 7); g.fill();
    if (n != null) { g.fillStyle = C.ink; setF(g, 700, 26, F.mono); g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(String(n), -92, -40); }
    g.restore();
  }
  // печать текста с кареткой; o {t, t0, size, cps, col}. Возвращает {x,y,done}
  function typeText(g, s, x, y, w, o) {
    x = Math.max(x, X0); w = Math.min(w, X1 - x); const sz = o.size || 48, lh = sz * 1.33, n = cl(Math.floor((o.t - o.t0) * (o.cps || 30)), 0, s.length);
    setF(g, o.wt || 600, sz, o.fam); g.fillStyle = o.col || C.ink; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    const ls = wrap(g, s, w); let c = 0, lx = x, ly = y;
    ls.forEach((ln, i) => { const part = ln.slice(0, cl(n - c, 0, ln.length)); if (part) g.fillText(part, x, y + i * lh); if (n >= c && n <= c + ln.length) { lx = x + g.measureText(part).width; ly = y + i * lh; } c += ln.length + 1; });
    if (o.t >= o.t0 && (n < s.length || Math.floor(o.t * 3) % 2 === 0)) { g.fillStyle = o.caret || C.vi; g.fillRect(lx + 4, ly - sz * 0.82, 4, sz * 1.04); }
    return { x: lx, y: ly, done: n >= s.length, lines: ls.length };
  }
  // тёмная плашка плеера с эквалайзером (голос, звук, сигнал)
  function wave(g, cx, cy, w, t, t0, p) {
    if (p <= 0) return; w = Math.min(w, 900); cx = cl(cx, X0 + w / 2, X1 - w / 2);
    g.save(); g.translate(cx, cy); g.scale(1, Math.min(p, 1.15)); g.fillStyle = C.ink; rr(g, -w / 2, -75, w, 150, 30); g.fill();
    g.fillStyle = C.vi; g.beginPath(); g.arc(-w / 2 + 75, 0, 46, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-w / 2 + 60, -20); g.lineTo(-w / 2 + 92, 0); g.lineTo(-w / 2 + 60, 20); g.fill();
    const x0 = -w / 2 + 150, n = Math.max(8, Math.floor((w - 190) / 27)), en = eo((t - t0) / 0.4);
    for (let i = 0; i < n; i++) { const h = 10 + 86 * en * Math.abs(Math.sin(i * 1.9 + t * 8)) * (0.45 + 0.55 * Math.abs(Math.sin(i * 0.6))); g.fillStyle = i / n < (t - t0) / 1.6 ? C.vl : '#5A5280'; rr(g, x0 + i * 27, -h / 2, 14, h, 7); g.fill(); }
    g.restore();
  }
  // ряд чипов по центру, каскад от t0, active - индекс залитого
  function chips(g, items, cx, y, t0, t, active) {
    let sz = 34, ws, tot;
    for (let k = 0; k < 8; k++) { setF(g, 700, sz); ws = items.map(q => g.measureText(q).width + 56); tot = ws.reduce((a, b) => a + b, 0) + 16 * (items.length - 1); if (tot <= 900) break; sz -= 3; }
    let x = fx(cx - tot / 2, tot); const st = Math.min(0.08, 0.45 / items.length);
    items.forEach((q, i) => { const p = spr(t - t0 - i * st); if (p > 0) { g.save(); g.translate(x + ws[i] / 2, y); g.scale(p, p); g.fillStyle = i === active ? C.vi : C.chip; rr(g, -ws[i] / 2, -34, ws[i], 68, 34); g.fill(); setF(g, 700, sz); g.fillStyle = i === active ? '#fff' : C.vi; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(q, 0, 2); g.restore(); } x += ws[i] + 16; });
  }
  function dotsNav(g, cx, y, n, pos, dark) {
    let dx = cx - (n * 16 + 24 + (n - 1) * 14) / 2;
    for (let j = 0; j < n; j++) { const a = Math.max(0, 1 - Math.abs(j - pos)), w = 16 + 24 * a; g.fillStyle = a > 0.5 ? (dark ? C.vl : C.vi) : (dark ? '#4A4270' : C.bar); rr(g, dx, y, w, 16, 8); g.fill(); dx += w + 14; }
  }
  // карточка-график: столбики пружиной каскадом + линия-рисование. vals 0..1, o {title, hi, line:false}
  function bars(g, x, y, w, h, vals, labels, t0, t, o) {
    o = o || {}; x = Math.max(x, X0); w = Math.min(w, X1 - x); card(g, x, y, w, h, 36, '#fff'); let top = y + 40;
    if (o.title) { g.fillStyle = C.ink; fit(g, o.title, 800, 44, w - 100, F.sans); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(o.title, x + 50, y + 80); top = y + 130; }
    const n = vals.length, base = y + h - 90, mh = base - top - 30, step = (w - 100) / n, bw = step * 0.68, pts = [], hi = o.hi == null ? n - 1 : o.hi;
    vals.forEach((v, i) => {
      const bp = spr(t - t0 - i * 0.07), bx = x + 50 + i * step + (step - bw) / 2, hh = Math.max(0, v * mh * bp);
      g.fillStyle = i === hi ? C.vi : C.bar; rr(g, bx, base - hh, bw, hh, Math.min(14, bw / 3)); g.fill(); pts.push([bx + bw / 2, base - v * mh - 24]);
      if (labels && labels[i]) { g.fillStyle = C.mut; fit(g, labels[i], 600, 28, step - 6, F.sans); g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(labels[i], bx + bw / 2, base + 44); }
    });
    const lp = o.line === false ? 0 : eo((t - t0 - 0.9) / 0.6);
    if (lp > 0) { g.save(); g.beginPath(); g.rect(x, y, lp * w, h); g.clip(); g.strokeStyle = C.ink; g.lineWidth = 5; g.lineJoin = 'round'; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke(); pts.forEach(q => { g.fillStyle = '#fff'; g.beginPath(); g.arc(q[0], q[1], 9, 0, 7); g.fill(); g.stroke(); }); g.restore(); }
  }
  // уведомление выезжает справа (ease-out)
  function toast(g, y, letter, text, t0, t, o) {
    if (t < t0) return; o = o || {}; const p = eo((t - t0) / 0.35), w = 900, x = 90 + (1 - p) * 1000;
    card(g, x, y, w, 120, 30, o.bg || C.ink); avatar(g, x + 64, y + 60, 36, letter, o.ac || C.vl);
    fit(g, text, 700, 44, w - 160, F.sans); g.fillStyle = o.fg || '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(text, x + 124, y + 62);
  }
  // строка-ссылка с кнопкой «Копировать» -> «Готово» в момент okAt
  function linkBar(g, y, url, t0, t, okAt, press) {
    y += slideY(t, t0, 80); card(g, 90, y, 900, 110, 55, '#fff');
    g.strokeStyle = C.vi; g.lineWidth = 6; rr(g, 128, y + 40, 40, 28, 14); g.stroke(); rr(g, 152, y + 40, 40, 28, 14); g.stroke();
    g.fillStyle = C.ink; fit(g, url, 600, 34, 480, F.mono); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(url, 214, y + 57);
    button(g, 860, y + 55, 'Копировать', { ok: t >= okAt, okLabel: 'Готово', w: 230, size: 32, press: press || 0 });
  }
  // орбита звёздочек вокруг ИИ-объекта, детерминированно
  function sparkles(g, cx, cy, r, t, n, col) {
    for (let i = 0; i < (n || 5); i++) { const a = t * 0.9 + i * 6.283 / (n || 5), s = 8 + 6 * Math.abs(Math.sin(t * 3 + i * 1.7)); star(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.6, s, col || C.vl); }
  }
  // итоговый кадр: имя крупно, строка с ключом, штамп, адрес. Героя ставь между ними (y 700..1250)
  function endCard(g, t, t0, o) {
    o = o || {}; const y = o.y || 440, p = spr(t - t0), s = 0.6 + 0.4 * p;
    g.save(); g.translate(540, y); g.scale(s, s); g.globalAlpha = eo((t - t0) / 0.2); g.fillStyle = o.col || '#fff';
    fit(g, o.brand || '', 900, 170, 900, F.sans); g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(o.brand || '', 0, 0); g.restore();
    if (o.line) head(g, o.line, { y: y + 150, size: 100, t0: t0 + 0.35, t, key: o.key, col: o.col || '#fff', kc: o.kc || C.yel, lines: 1 });
    if (o.stamp) stamp(g, 540, o.sy || 1350, o.stamp, t0 + (o.st || 1.5), t, { col: o.kc || C.yel });
    if (o.url) { const cp = spr(t - t0 - (o.ut || 2)); if (cp > 0) pill(g, 540, o.uy || 1530, o.url, { p: cp, bg: '#fff', fg: C.vi, size: 44, h: 96, wt: 800 }); }
  }
  // звук: список [t, имя, громкость, pitch?], громкость и pitch зажимаются в допустимые пределы
  function sfx(s, list) {
    list.forEach(e => { if (e[0] < 0 || e[0] > s.duration) return; const v = cl(e[2] || 0.12, 0.05, 0.3);
      if (e[3]) s.play(e[0], e[1], v, { pitch: cl(e[3], 0.5, 2) }); else s.play(e[0], e[1], v); });
  }

  return {
    W, H, X0, X1, C, F, cl, lerp, prog, eo, io, back, spr, life, fx, slideY, fly,
    scene, cuts, beat, snap, countAt, bumpAt, countUp, stepPos,
    mk, rr, tex, card, glow, bg, cam, flash, wipe,
    setF, fit, wrap, lay, words, head, body, kicker,
    star, check, pill, aiBadge, tip, button, rec, counter, stamp, avatar,
    winL, win, clickPh, cursor, path, hot,
    slot, thumb, typeText, wave, chips, dotsNav, bars, toast, linkBar, sparkles, endCard, sfx
  };
})();