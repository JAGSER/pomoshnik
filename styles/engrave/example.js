// «История шоколада» в стиле «Гравюра»: атлас из восьми гравюрных таблиц. Только ENGRAVE и обычный canvas.
// Сквозной предмет: сам шоколад, единственное раскрашенное «от руки» (коричневая акварель) на каждой таблице.
// Счётчик: год в картуше. Метки: красные штампы. Склейки на ключевых словах фраз.
const E = ENGRAVE, P = E.P;
const CUTS = [0, 4.4, 8.8, 12.3, 13.7, 16.9, 20.05, 21.9, 25.45, 27.2, 30.7];
const CAPS = ['шоколад@1.45 был@2.05 *горьким@2.3 напитком@2.95', 'варили@1.1 напиток@1.6 с@3.0 *перцем@3.05', 'бобы@0.8 ценились@1.25 как@2.05 *деньги@2.3',
  'испанцы@1.4 везут@2.05 какао@2.75 в@3.25 *Европу@3.3', 'сладкий@1.45 напиток@2.2 в@3.1 *моде@3.15', 'год@2.35 первой@3.55 *плитки@4.05',
  'Швейцария:@0.05 *молочный@1.45 шоколад@2.15', 'сегодня@0.05 его@0.65 любят@0.9 *миллиарды@2.25'];
const YEARS = [[0, 0, 'до н. э.'], [1, -1000, 'до н. э.', .9], [5.05, 600, 'майя', .9], [8.85, 1450, 'ацтеки', .8], [12.35, 1528, 'Испания', .8],
  [17, 1660, 'королевский двор', .8], [21.95, 1847, 'Англия', .3], [27.25, 1875, 'Швейцария', .7], [30.75, 2026, 'наши дни', .9]];
const CHOC = '#8A5A3C', MILK = '#DDB487';

// ---------- гравюры темы (запекаются в первом кадре) ----------
const MAYA = E.engrave({ w: 400, h: 500, ax: .5, ay: 456 / 500, layers: (() => {
  const cx = 196, arc = (y, rx, ry, a0, a1, n = 24) => E.ell(cx, y, rx, ry, n, a0, a1), band = (y0, y1, rx) => arc(y1, rx, 22, Math.PI, 0).concat(arc(y0, rx, 22, 0, Math.PI));
  const body = [cx - 150, 122, cx - 138, 430].concat(arc(430, 138, 24, Math.PI, 0), [cx + 138, 430, cx + 150, 122], arc(122, 150, 24, 0, Math.PI));
  const foam = []; for (let i = 0; i <= 24; i++) { const f = i / 24, x = cx - 156 + 312 * f; foam.push(x, 118 - Math.sin(f * Math.PI) * 52 - Math.abs(Math.sin(f * 21)) * 9); }
  return [
    { pts: E.ell(cx + 22, 448, 178, 24, 40), fill: false, shade: 'flat', d: .5, hatch: 'lin', ang: 0, per: 5, line: 0, cross: false },
    { pts: body, shade: 'cyl', d: [.12, .82], hatch: 'cyl', bend: .25, per: 6, light: -150 },
    { pts: band(212, 300, 146), shade: 'cyl', d: [.03, .5], hatch: 'lin', ang: 90, per: 7, light: -150, cross: false },
    { pts: band(124, 150, 150), shade: 'cyl', d: [.4, .9], hatch: 'lin', ang: 0, per: 4, light: -150 },
    { pts: band(384, 404, 140), shade: 'cyl', d: [.4, .9], hatch: 'lin', ang: 0, per: 4, light: -150 },
    { pts: foam.concat(arc(122, 152, 26, 0, Math.PI)), shade: 'sph', d: [.04, .6], hatch: 'ring', cx, cy: 40, per: 5, tint: CHOC, ta: .55, cross: false, light: -120 }];
})(), draw(x) {
  const cx = 196; x.lineWidth = 2.2; [-56, -18, 20, 58].forEach(a => { const s = Math.sin(a * E.DEG), k = Math.cos(a * E.DEG), gx = cx + 146 * s, gy = 256 + 22 * k;
    x.save(); x.translate(gx, gy); x.scale(k, 1); x.fillStyle = P.sheet; x.fillRect(-26, -30, 52, 60); x.strokeRect(-26, -30, 52, 60);
    x.beginPath(); x.arc(-6, -8, 10, 0, Math.PI * 1.6); x.moveTo(-16, 14); x.lineTo(16, 14); x.moveTo(10, -22); x.lineTo(10, 4); x.stroke(); x.beginPath(); x.arc(-6, -8, 3, 0, E.TAU); x.fill(); x.restore(); });
  x.fillStyle = P.sheet; for (let i = 0; i < 16; i++) { const a = i * 2.39, r = 20 + (i * 37 % 110), bx = cx + Math.cos(a) * r, by = 96 - Math.abs(Math.sin(a)) * 30 + (i % 3) * 6; x.beginPath(); x.arc(bx, by, 3 + i % 4, 0, E.TAU); x.fill(); x.lineWidth = 1.2; x.stroke(); }
} });
const POD = E.engrave({ w: 240, h: 390, layers: (() => {
  const p = E.ell(120, 196, 92, 168, 72); for (let i = 1; i < p.length; i += 2) { const s = (p[i] - 196) / 168; if (s > 0) p[i - 1] = 120 + (p[i - 1] - 120) * (1 - .38 * s * s * s); }
  return [{ pts: E.rotP(p, 120, 196, -10), axis: 80, shade: 'sph', d: [.08, .82], hatch: 'mer', per: 6, light: -140, tint: P.ochre, ta: .45 },
    { pts: E.rotP(E.rr(108, 6, 24, 34, 6), 120, 196, -10), axis: 80, shade: 'cyl', d: [.2, .8], hatch: 'lin', per: 4 }];
})(), draw(x) {
  x.save(); x.translate(120, 196); x.rotate(-10 * E.DEG); x.lineWidth = 2;
  [-.7, -.35, 0, .35, .7].forEach(f => { x.beginPath(); for (let i = 0; i <= 30; i++) { const v = -1 + 2 * i / 30, w = Math.sqrt(Math.max(0, 1 - v * v)) * (v > 0 ? 1 - .38 * v * v * v : 1); x.lineTo(Math.sin(f * 1.3) * 92 * w, v * 168); } x.stroke(); });
  x.globalAlpha = .7; x.lineWidth = 1.4; for (let i = 0; i < 26; i++) { const v = -.8 + (i % 13) / 8, f = i < 13 ? -.5 : .5, w = Math.sqrt(Math.max(0, 1 - v * v)); x.beginPath(); x.arc(Math.sin(f * 1.3) * 92 * w + 6, v * 168, 4, 0, Math.PI); x.stroke(); }
  x.restore();
} });
const BEAN = E.engrave({ w: 80, h: 54, layers: [{ pts: E.ell(40, 27, 33, 21, 40), axis: 0, shade: 'sph', d: [.15, .85], hatch: 'mer', per: 3.6, tint: P.choc, ta: .6, line: 1.8 }],
  draw(x) { x.lineWidth = 1.6; x.beginPath(); x.moveTo(12, 29); x.quadraticCurveTo(40, 21, 68, 27); x.stroke(); } });
const PEPPER = E.engrave({ w: 220, h: 390, layers: (() => {
  const c = t => [118 + 26 * Math.sin(t * 2.2) - 60 * t * t, 64 + 300 * t], Lp = [], Rp = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20, [x, y] = c(t), [x2, y2] = c(Math.min(1, t + .01)), dx = x2 - x, dy = y2 - y, l = Math.hypot(dx, dy) || 1, w = 36 * Math.pow(1 - t, .75) + 1.5;
    Lp.push(x - dy / l * w, y + dx / l * w); Rp.unshift(x + dy / l * w, y - dx / l * w); }
  return [{ pts: Lp.concat(Rp), axis: 100, shade: 'cyl', d: [.05, .8], hatch: 'lin', ang: 100, per: 5, light: -150, tint: P.red, ta: .6 },
    { pts: E.spl([84, 56, 118, 40, 154, 56, 146, 76, 120, 70, 92, 78], true, 4), shade: 'lin', d: [.15, .7], hatch: 'lin', ang: 0, per: 4, tint: P.green, ta: .55 }];
})(), draw(x) { x.lineWidth = 6; x.beginPath(); x.moveTo(120, 44); x.quadraticCurveTo(118, 18, 140, 8); x.stroke();
  x.strokeStyle = P.sheet; x.lineWidth = 4; x.globalAlpha = .9; x.beginPath(); x.moveTo(98, 110); x.quadraticCurveTo(104, 190, 86, 250); x.stroke(); } });
const PEP_H = E.turn(PEPPER, -68);
const SUGAR = E.engrave({ w: 250, h: 470, ax: .5, ay: 452 / 470, layers: (() => {
  const prof = y => 20 + (y - 30) / 410 * 82, side = (s, y0, y1) => { const o = []; for (let i = 0; i <= 10; i++) { const y = y0 + (y1 - y0) * i / 10; o.push(125 + s * prof(y), y); } return o; };
  const cone = [125, 14, 140, 18].concat(side(1, 30, 440), E.ell(125, 440, 102, 16, 20, 0, Math.PI), side(-1, 440, 30).slice(2), [110, 18]);
  const wrap = side(1, 290, 440).concat(E.ell(125, 440, 102, 16, 20, 0, Math.PI), side(-1, 440, 290).slice(2), E.ell(125, 290, prof(290), 12, 16, Math.PI, 0).slice(2));
  return [{ pts: E.ell(150, 452, 140, 16, 32), fill: false, shade: 'flat', d: .5, hatch: 'lin', ang: 0, per: 5, line: 0, cross: false },
    { pts: cone, shade: 'cone', d: [.02, .62], hatch: 'cyl', bend: .18, per: 6, light: -150, cf: .7 },
    { pts: wrap, shade: 'cyl', d: [.12, .85], hatch: 'cyl', bend: .18, per: 5, light: -150, tint: P.blue, ta: .6 }];
})(), draw(x) { x.lineWidth = 3; x.beginPath(); x.ellipse(125, 300, 82, 12, 0, 0, Math.PI); x.stroke(); x.beginPath(); x.moveTo(60, 298); x.quadraticCurveTo(40, 330, 52, 352); x.stroke(); } });
const CUBE = E.engrave({ w: 74, h: 74, layers: [{ pts: [37, 6, 68, 20, 37, 34, 6, 20], shade: 'flat', d: .04, hatch: 'lin', ang: 25, per: 5, line: 1.6 },
  { pts: [6, 20, 37, 34, 37, 68, 6, 54], shade: 'flat', d: .28, hatch: 'lin', ang: 90, per: 4.5, line: 1.6 }, { pts: [37, 34, 68, 20, 68, 54, 37, 68], shade: 'flat', d: .62, hatch: 'lin', ang: 90, per: 4, line: 1.6 }] });
const POT = E.engrave({ w: 440, h: 500, ax: .5, ay: 470 / 500, layers: (() => {
  const cx = 210, pf = [[70, 112], [78, 150], [112, 250], [128, 352], [112, 412], [80, 436]], b = [];
  pf.forEach(([w, y]) => b.push(cx + w, y)); for (let i = pf.length - 1; i >= 0; i--) b.push(cx - pf[i][0], pf[i][1]);
  return [{ pts: E.ell(cx + 30, 470, 190, 22, 40), fill: false, shade: 'flat', d: .5, hatch: 'lin', ang: 0, per: 5, line: 0, cross: false },
    { pts: E.rotP(E.rr(cx + 96, 210, 150, 26, 12), cx + 96, 223, -14), axis: -14, shade: 'cyl', d: [.2, .85], hatch: 'lin', ang: -14, per: 4.5 },
    { pts: E.spl([cx - 96, 214, cx - 150, 150, cx - 196, 112, cx - 186, 100, cx - 140, 128, cx - 80, 176], true, 5), shade: 'cyl', axis: 45, d: [.08, .75], hatch: 'lin', ang: 45, per: 4.5, tint: P.steel, ta: .18 },
    { pts: E.spl(b, true, 6), shade: 'cyl', d: [.04, .8], hatch: 'cyl', bend: .22, per: 6, light: -150, tint: P.steel, ta: .18 },
    { pts: E.ell(cx, 438, 84, 16, 32), shade: 'cyl', axis: 0, d: [.3, .85], hatch: 'lin', ang: 0, per: 4 },
    { pts: E.ell(cx, 104, 74, 30, 40, Math.PI, Math.PI * 2).concat([cx + 74, 112, cx - 74, 112]), shade: 'sph', d: [.05, .7], hatch: 'ring', cx, cy: 112, rk: 2.2, per: 5, tint: P.steel, ta: .18 },
    { pts: E.rotP(E.rect(cx - 30, 4, 12, 90), cx - 24, 50, -10), axis: 80, shade: 'cyl', d: [.25, .85], hatch: 'lin', ang: 80, per: 4 },
    { pts: E.ell(cx - 34, 6, 13, 13, 20), shade: 'sph', d: [.1, .8], hatch: 'ring', per: 3.5 }];
})(), draw(x) { const cx = 210; x.lineWidth = 1.6; [160, 300, 392].forEach(y => { const w = y < 200 ? 84 : y < 350 ? 126 : 118; x.beginPath(); x.ellipse(cx, y, w, 14, 0, .1, Math.PI - .1); x.stroke(); });
  x.lineWidth = 1.2; for (let i = -6; i <= 6; i++) { const a = i / 7 * 1.3, px = cx + Math.sin(a) * 116; x.beginPath(); x.moveTo(px, 398); x.quadraticCurveTo(px + 4, 420, px, 432); x.stroke(); } } });
const CUPS = E.cup({ w: 230 });
const BAR = E.engrave({ w: 640, h: 400, layers: (() => {
  const L = [{ pts: E.rect(20, 20, 600, 300), shade: 'flat', d: .88, hatch: 'lin', ang: 0, per: 3, cross: false, line: 2.6 },
    { pts: [20, 320, 620, 320, 620, 360, 20, 360], shade: 'lin', light: -90, d: [.45, .85], hatch: 'lin', ang: 0, per: 4, line: 2.6 }];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) { const x0 = 26 + c * 100, y0 = 26 + r * 100, s = 88, b = 13;
    L.push({ pts: [x0, y0, x0 + s, y0, x0 + s - b, y0 + b, x0 + b, y0 + b], shade: 'flat', d: .1, hatch: 'lin', ang: 0, per: 4.5, line: 1.2, cross: false });
    L.push({ pts: [x0, y0, x0 + b, y0 + b, x0 + b, y0 + s - b, x0, y0 + s], shade: 'flat', d: .26, hatch: 'lin', ang: 90, per: 4.5, line: 1.2, cross: false });
    L.push({ pts: [x0, y0 + s, x0 + b, y0 + s - b, x0 + s - b, y0 + s - b, x0 + s, y0 + s], shade: 'flat', d: .72, hatch: 'lin', ang: 0, per: 4, line: 1.2, cross: false });
    L.push({ pts: [x0 + s, y0, x0 + s, y0 + s, x0 + s - b, y0 + s - b, x0 + s - b, y0 + b], shade: 'flat', d: .6, hatch: 'lin', ang: 90, per: 4, line: 1.2, cross: false });
    L.push({ pts: E.rect(x0 + b, y0 + b, s - 2 * b, s - 2 * b), shade: 'lin', d: [.18, .42], hatch: 'lin', ang: 0, per: 5, line: 1, cross: false }); }
  return L;
})(), draw(x) { x.lineWidth = 1.6; for (let i = 0; i < 12; i++) { x.beginPath(); x.moveTo(40 + i * 50, 324); x.lineTo(40 + i * 50, 356); x.globalAlpha = .35; x.stroke(); } } });
const PYR = E.pyramid({ w: 780, h: 450 }), DISC = E.disc({ r: 196 }), BAL = E.balance({ len: 300, chain: 300 }), COIN = E.coin({ r: 40 });
const CMP = E.compass({ r: 150 }), CMP_S = E.compass({ r: 62 }), SHIP = E.ship(), WAV = E.waves({ h: 206 });
const COL = E.column({ w: 170, h: 1190 }), DRAPE = E.drape({ h: 260, sag: 140 }), MNT = E.mountains({ h: 370, seed: 9 }), JUG = E.jug({ h: 300 }), JUGT = E.turn(JUG, -40);
const GLOBE = E.globe({ r: 214 }), WREATH = E.wreath({ r: 300, n: 11 });
E.dtype('3000', 300, {}); E.dtype('XVI', 360, {});

// ---------- помощники сцен ----------
function bar(g, x, y, o = {}) { // плитка: гравюра + акварель через multiply; o.milk = {x, y, r} круг молочного цвета
  E.put(g, BAR, x, y); const x0 = Math.round(x - BAR.w / 2) + 20, y0 = Math.round(y - BAR.h / 2) + 20, A = o.a == null ? 1 : o.a;
  g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha *= A;
  if (o.milk && o.milk.r > 0) { const m = o.milk; g.beginPath(); g.rect(x0, y0, 600, 340); g.clip();
    g.beginPath(); g.rect(x0, y0, 600, 340); g.moveTo(m.x + m.r, m.y); g.arc(m.x, m.y, m.r, 0, E.TAU, true); g.fillStyle = o.col || CHOC; g.fill('evenodd');
    g.beginPath(); g.arc(m.x, m.y, m.r, 0, E.TAU); g.fillStyle = MILK; g.fill(); }
  else { g.fillStyle = o.col || CHOC; g.fillRect(x0, y0, 600, 340); }
  g.restore();
}
const PILE = [[-80, -6, 20], [-40, -4, -15], [0, -6, 10], [40, -4, -25], [80, -6, 15], [-56, -30, -10], [-14, -32, 30], [30, -30, -5], [-30, -54, 20]];
const BEAN_T = PILE.map((_, i) => .84 + i * .085), COIN_T = [2.3, 2.42, 2.54];
const tilt = lt => { let a = 0; BEAN_T.forEach(t0 => a -= 2.6 * E.spring(lt - t0 - .36, 1.5, .32)); COIN_T.forEach(t0 => a += 7.8 * E.spring(lt - t0 - .36, 1.3, .28)); return a; };

// ---------- сцены ----------
const SC = [
  { settle: 0, drift: -6, hits: [2.35], draw(g, lt) { // 3000 лет назад: горький напиток
    E.paper(g);
    E.layer(g, .35, g => E.put(g, PYR, 540, 1474, { a: .2 * E.ap(lt, .3, .8) }));
    E.layer(g, .6, g => { E.display(g, '3000', 540, 640, 300, lt, .02, { al: 'center', dur: .3 }); E.title(g, 'лет назад', 540, 790, 100, lt, .35, { al: 'center', step: .25 }); E.rule(g, 540, 852, 380, E.pr(lt, .6, 1.1)); });
    E.layer(g, 1, g => { E.put(g, BEAN, 330, 1440, { rot: 14, a: E.ap(lt, 1.2, .3) }); E.put(g, BEAN, 760, 1446, { rot: -20, a: E.ap(lt, 1.35, .3) });
      E.put(g, MAYA, 540, 1446, { rv: E.eo(E.pr(lt, .5, 1.3)), dir: 'down' }); if (lt > 1.1) E.steam(g, lt, 540, 960, { h: 100, a: .5 * E.ap(lt, 1.1, .6) });
      E.stamp(g, 'горько', 806, 1100, lt, 2.35, { rot: -10, size: 64 }); });
  } },
  { draw(g, lt) { // ольмеки и майя: какао + перец
    E.paper(g); const gh = 1 - .74 * E.eo(E.pr(lt, 1.75, 2.3));
    E.layer(g, .4, g => E.put(g, PYR, 540, 1474, { rv: E.eo(E.pr(lt, .1, .8)), dir: 'up', a: gh }));
    E.layer(g, .7, g => { E.title(g, 'Ольмеки', 90, 470, 124, lt, .08); E.title(g, 'и майя', 990, 610, 124, lt, .6, { al: 'right' }); });
    E.layer(g, 1, g => {
      E.card(g, 290, 1110, 400, 600, lt, 1.95, { cap: 'какао', sub: 'пища богов' }, (g, x, y) => { E.put(g, POD, x - 22, y - 16); E.put(g, BEAN, x + 104, y + 150, { rot: -24 }); E.put(g, BEAN, x - 116, y + 160, { rot: 28 }); });
      E.plus(g, 540, 1090, 34, E.pr(lt, 2.8, 3.1));
      E.card(g, 790, 1110, 400, 600, lt, 3.05, { cap: 'перец', sub: 'жгучий чили' }, (g, x, y) => E.put(g, PEPPER, x, y + 4)); });
  } },
  { hits: [2.7], draw(g, lt) { // ацтеки: бобы как деньги
    E.paper(g);
    E.layer(g, .3, g => E.put(g, DISC, 540, 940, { a: .17 * E.ap(lt, 0, .6) }));
    E.layer(g, .7, g => E.title(g, 'Ацтеки', 90, 470, 124, lt, .1));
    E.layer(g, 1, g => {
      E.drawBalance(g, BAL, 540, 690, tilt(lt), {
        left: (g, px, py) => PILE.forEach(([dx, dy, r], i) => { const f = E.fall(lt, BEAN_T[i], -400, 0, { dur: .32, bounce: 10 }); if (f.on) E.put(g, BEAN, px + dx, py + dy + f.y, { rot: r, a: E.ap(lt, BEAN_T[i], .08) }); }),
        right: (g, px, py) => COIN_T.forEach((t0, i) => { const f = E.fall(lt, t0, -420, 0, { dur: .34, bounce: 8 }); if (!f.on) return; const sy = f.hit < 0 ? .3 + .7 * Math.abs(Math.cos(lt * 13 + i)) : .42;
          E.put(g, COIN, px + [-44, 40, -2][i], py + [-6, -6, -18][i] + f.y, { sy, a: E.ap(lt, t0, .08) }); }) });
      E.stamp(g, 'валюта', 806, 520, lt, 2.7, { rot: 8, size: 60 }); });
  } },
  { draw(g, lt) { // XVI век
    E.paper(g);
    E.layer(g, .5, g => { E.display(g, 'XVI', 540, 780, 360, lt, .05, { al: 'center' }); E.title(g, 'век', 540, 960, 130, lt, .9, { al: 'center' }); });
    E.layer(g, 1, g => E.put(g, CMP, 540, 1270, { rot: -70 * (1 - E.spring(lt - .15, 1.1, .45)), a: E.ap(lt, .15, .3) }));
  } },
  { hits: [2.25], draw(g, lt) { // испанцы везут какао в Европу
    E.paper(g);
    E.layer(g, .15, g => { E.rhumb(g, 880, 470, 1400, { a: .14 }); E.put(g, CMP_S, 880, 470); });
    E.layer(g, .5, g => { E.route(g, E.spl([150, 610, 540, 480, 930, 610], false, 12), E.pr(lt, .25, 1.95));
      E.label(g, 'Новый Свет', 76, 690, lt, .25, { al: 'left' }); E.label(g, 'Европа', 1004, 690, lt, 1.9, { al: 'right' }); });
    E.layer(g, .8, g => E.drawWaves(g, WAV, 0, 1170, -20 - lt * 26));
    E.layer(g, 1, g => { E.put(g, SHIP, E.lerp(330, 610, E.eo(lt / 3.2)), 1330 + Math.sin(lt * 2.2) * 6); E.drawWaves(g, WAV, 0, 1292, lt * 38); });
    E.stamp(g, 'груз: какао', 318, 890, lt, 2.25, { rot: -7, size: 46 });
  } },
  { hits: [1.45], draw(g, lt) { // перец → сахар
    E.paper(g);
    E.layer(g, .6, g => { const w = E.words(g, 'перец', 104, 560, 150, lt, .1, { col: P.ink }).w; E.strike(g, 92, 104 + w + 16, 518, E.pr(lt, .78, 1.08)); E.dagger(g, 104 + w + 60, 520, 46, E.pr(lt, 1.05, 1.35));
      const sw = E.title(g, 'сахар', 104, 812, 170, lt, 1.5).w; E.crown(g, 104 + sw + 66, 690, 92, E.pr(lt, 1.8, 2.25)); E.burst(g, lt, 1.9, 104 + sw + 66, 690, { r: 90 }); });
    E.layer(g, 1, g => { E.put(g, PEP_H, 820, 500, { a: 1 - .6 * E.eo(E.pr(lt, .85, 1.3)) });
      E.put(g, SUGAR, E.lerp(1320, 790, E.spring(lt - .85, 1.2, .55)), 1452);
      E.put(g, CUPS, 330, 1440, { rv: E.eo(E.pr(lt, .15, .6)), dir: 'up' }); if (lt > .5) E.steam(g, lt, 322, 1300, { h: 120, a: .45 * E.ap(lt, .5, .5) });
      const f = E.fall(lt, 2.05, 880, 1308, { dur: .4, bounce: 0 }); if (f.on && f.hit < 0) E.put(g, CUBE, 322, f.y, { rot: lt * 300 });
      if (f.hit >= 0 && f.hit < .8) { g.save(); g.strokeStyle = P.ink; g.lineWidth = 2; g.globalAlpha = 1 - f.hit / .8; g.beginPath(); g.ellipse(322, 1306, 20 + f.hit * 70, 5 + f.hit * 12, 0, 0, E.TAU); g.stroke(); g.restore(); } });
  } },
  { hits: [.3], draw(g, lt) { // мода при дворе
    E.paper(g);
    E.layer(g, .25, g => { E.put(g, COL, 150, 1500); E.put(g, COL, 930, 1500); });
    E.layer(g, .5, g => E.put(g, DRAPE, 540, 290 - 380 * (1 - E.spring(lt, 1.3, .55))));
    E.layer(g, 1, g => { E.put(g, POT, 540, 1430, { rv: E.eo(E.pr(lt, .05, .55)), dir: 'up' }); E.put(g, CUPS, 250, 1440, { a: E.ap(lt, .45, .25) }); E.put(g, CUPS, 830, 1440, { a: E.ap(lt, .6, .25) });
      if (lt > .5) { E.steam(g, lt, 360, 1010, { n: 2, h: 110, a: .45 }); E.steam(g, lt + 1, 242, 1300, { n: 2, h: 90, a: .4 }); E.steam(g, lt + 2, 822, 1300, { n: 2, h: 90, a: .4 }); } });
    E.layer(g, .8, g => E.plaque(g, 'при дворе', 540, 770, lt, .7));
    E.stamp(g, 'в моде', 800, 930, lt, .3, { rot: 9, size: 60 });
  } },
  { dark: true, tr: 'cut', settle: 18, hits: [2.85], draw(g, lt) { // 1847, машинопись
    E.dark(g);
    E.typed(g, 'ГОД', 150, 700, 44, lt, 0, { col: P.bone, cps: 24, cursor: false });
    E.typed(g, '1847', 150, 995, 250, lt, 0, { col: P.bone, at: [.1, .65, 1.35, 1.8], cursorTill: 2.4 });
    E.rule(g, 450, 1058, 620, E.pr(lt, 2.3, 2.7), { col: P.bone, orn: false, a: .7 });
    E.typed(g, 'АНГЛИЯ, БРИСТОЛЬ', 150, 1156, 46, lt, 2.4, { col: P.bone, cps: 18 });
    E.stamp(g, 'впервые', 800, 730, lt, 2.85, { rot: -7, size: 60 });
  } },
  { tr: 'cut', settle: 0, hits: [0], draw(g, lt) { // первая плитка
    E.paper(g);
    E.layer(g, .3, g => E.rays(g, 540, 1010, 270, 560, 72, { rot: lt * 3, a: .26 * E.ap(lt, 0, .5) }));
    E.layer(g, .7, g => E.title(g, 'первая *плитка', 540, 480, 124, lt, 0, { al: 'center', at: [0, .5], keyCol: P.navy }));
    E.layer(g, 1, g => { const y = 1010 - 90 * (1 - E.spring(lt, 1.6, .45)); E.shadow(g, 560, 1215, 330, 24, { a: .5 }); bar(g, 540, y); });
    E.label(g, 'плитка № 1', 800, 1330, lt, .55, { to: [770, 1190] });
  } },
  { draw(g, lt) { // молочный шоколад
    E.paper(g);
    E.layer(g, .3, g => E.put(g, MNT, 540, 900, { rv: E.eo(E.pr(lt, 0, .7)), dir: 'up' }));
    E.layer(g, .7, g => E.title(g, '*молочный', 540, 440, 150, lt, 1.45, { al: 'center', keyCol: P.navy }));
    E.layer(g, 1, g => { const jx = E.lerp(1300, 800, E.spring(lt - .15, 1.1, .6)), jy = 880, sx = jx - 178, sy = jy + 92, p = E.pr(lt, .85, 1.25), m = E.eo(E.pr(lt, 1.25, 2.7)) * 700;
      E.shadow(g, 470, 1462, 320, 22, { a: .5 }); bar(g, 450, 1260, { milk: { x: 470, y: 1170, r: m } });
      E.pour(g, sx, sy, 470, 1150, lt, p, { w: 36 }); E.put(g, JUGT, jx, jy); });
  } },
  { draw(g, lt) { // сегодня: миллиарды
    E.paper(g);
    E.layer(g, .25, g => E.rays(g, 540, 940, 290, 520, 96, { rot: lt * 4, a: .3 * E.ap(lt, .1, .6) }));
    E.layer(g, .6, g => { E.put(g, GLOBE, 540, 930, { rv: E.eo(E.pr(lt, .1, .8)), dir: 'down' }); E.put(g, WREATH, 540, 950, { rv: E.eo(E.pr(lt, .85, 1.6)), dir: 'up' }); });
    E.layer(g, .8, g => E.title(g, 'сегодня', 540, 440, 130, lt, .05, { al: 'center', halo: P.paper }));
    E.layer(g, 1, g => { const pc = E.ap(lt, 1.2, .5); if (pc > 0) { const bob = Math.sin(lt * 2.4) * 6;
        E.put(g, PIECE, 540, 1200 + (1 - pc) * 60, { a: pc }); tint(g, 540, 1200 + (1 - pc) * 60, PIECE, pc);
        g.save(); g.translate(760, 1150 + bob); g.rotate(14 * E.DEG); E.put(g, CHIP, 0, 0, { a: pc }); tint(g, 0, 0, CHIP, pc); g.restore(); }
      if (lt > 2.2) { const v = 1e9 * E.eio(E.pr(lt, 2.25, 3.05)); const w = E.odo(g, v, 520, 1452, 100, { digits: 10, group: true, col: P.ink });
        E.text(g, '+', 520 + w / 2 + 14, 1452, 100, { col: P.red, a: E.ap(lt, 3.05, .25) }); E.burst(g, lt, 3.1, 520 + w / 2 + 44, 1420, { r: 80, col: P.red }); } });
  } }
];
const PIECE = E.crop(BAR, 20, 20, 400, 200), CHIP = E.crop(BAR, 420, 120, 100, 100);
function tint(g, x, y, s, a) { g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha *= a; g.fillStyle = MILK; g.fillRect(Math.round(x - s.w / 2), Math.round(y - s.h / 2), s.w, s.h); g.restore(); }

function draw(t, k) {
  const g = E.begin(t, k), sc = E.scenes(g, t, CUTS, SC), s = k.sub(t);
  const ya = t < 21.9 ? E.ap(t, .9, .3) : t < 25.45 ? 1 - E.ap(t, 21.9, .12) : E.ap(t, 25.5, .3);
  E.year(g, t, YEARS, { a: ya, dark: sc.dark });
  E.caption(g, t, CAPS);
  E.chrome(g, t, { tl: 'История шоколада', tr: 'Табл. ' + E.roman(s.i + 1), bl: 'Атлас какао', br: E.clock(t) });
}

function sound(s) {
  const P = (t, n, v, p) => s.play(t, n, v, p ? { pitch: p } : undefined);
  P(.03, 'marimba', .16, .8); P(1.0, 'odometer', .1); P(2.35, 'woodblock', .2);
  P(4.4, 'marimba_run', .13); P(5.05, 'pop_soft', .1); P(6.35, 'wood', .14); P(7.45, 'wood', .14);
  P(8.8, 'marimba_run', .13); P(9.7, 'drop', .1); P(10.3, 'drop', .1, 1.25); P(11.1, 'kalimba', .14, 1.6); P(11.5, 'woodblock', .2);
  P(12.3, 'marimba_run', .13); P(13.7, 'kalimba_run', .13); P(15.95, 'woodblock', .19);
  P(16.9, 'marimba_run', .13); P(17.7, 'rim', .14); P(18.35, 'wood', .14); P(18.75, 'sparkle', .13); P(19.32, 'drop', .12, .9);
  P(20.05, 'kalimba_run', .13); P(20.35, 'woodblock', .19); P(20.8, 'pop_soft', .1);
  P(22.0, 'type', .16); P(22.55, 'type', .16); P(23.25, 'type', .16); P(23.7, 'type', .16); P(24.75, 'woodblock', .2);
  P(25.45, 'success', .17); P(27.2, 'kalimba_run', .13); P(28.6, 'magic', .13);
  P(30.7, 'marimba_run', .13); P(31.55, 'sparkle', .12); P(32.95, 'odometer', .12); P(33.8, 'fanfare_soft', .17);
}
