// Демо «Режим „Фокус“ в телефоне»: только CREAM и обычный canvas.
// Мир: внимание: одна оранжевая точка в тихом кремовом пространстве. Герой: точка-ручка тумблера «Фокус».
const C = CREAM, P = C.P, RAD = Math.PI / 180;
const CUTS = [0, 2.41, 4.9, 9.1, 11.74, 13.3, 15.59, 17.7, 21.9, 24.39, 26.4, 30.7];

// ---------- общие данные ----------
const PILLS = [[0, 540, 1180, -2, 600], [.4, 300, 880, 4, 460], [.74, 770, 1440, -5, 470], [1.06, 790, 905, 3, 420],
  [1.38, 300, 1480, 6, 450], [1.66, 600, 1290, -4, 440], [1.92, 330, 1150, 5, 400], [2.16, 770, 1170, -6, 420]];
const av = (x, y, rot, w) => { const d = -w / 2 + w * .27 * .5, a = rot * RAD; return [x + Math.cos(a) * d, y + Math.sin(a) * d]; };
const KEYS0 = PILLS.map(([t0, x, y, rot, w], i) => [i ? t0 + .03 : 0, ...av(x, y, rot, w)]);
const DOT0 = tt => C.hops(tt, KEYS0, { dur: .22, h: 90 });
const LAST0 = KEYS0[KEYS0.length - 1];
const SLEEP = [[10.72, 300, 840, -4], [10.84, 790, 850, 5], [10.96, 300, 1480, 3], [11.08, 790, 1500, -6]];
const KX_ON = 540 + 280 - 31.4 - 125.4, KX_OFF = 540 - 280 + 31.4 + 125.4; // ручка большого тумблера (w 560)
const MY = 1080, CW = 380, CH = CW * .27; // мембрана и пилюля-звонок
const QUEUE = [[15.62, 860, 0], [15.84, 540, 0], [16.06, 220, 0], [16.3, 700, 1], [16.54, 380, 1]];
const GX = u => 110 + u * 840, GY = u => 1380 - C.springCurve(u) * 403; // график «снова в поток»
const GP = t => C.eio(C.pr(t, 24.85, 25.75));

function pillIn(g, t, t0, x, y, rot, w, o = {}) { // уведомление влетает пружиной и пингует контуром
  const q = t - t0; if (q <= 0) return;
  const s = C.lerp(.35, 1, C.spring(q, ...C.SP.ui)) * (o.s ?? 1), h = w * .27;
  g.save(); g.translate(x, y); g.rotate((rot + (1 - C.spring(q, 170, 26)) * 10 + (o.wob || 0)) * RAD); g.scale(s, s);
  g.globalAlpha *= C.cl(q * 7); C.notif(g, 0, 0, w, Object.assign({ sh: .14 }, o));
  const pq = C.pr(t, t0 + .06, t0 + .6), off = C.eo(pq) * 46;
  if (pq > 0 && pq < 1) C.pill(g, 0, 0, w + off * 2, h + off * 2, { col: null, line: C.rgba(P.ink, .28 * (1 - pq)), lw: 3 });
  g.restore();
}

// ---------- сцены ----------
function s0(g, t, sc) { // уведомления отвлекают
  C.bg(g, P.cream); C.field(g, t);
  C.cam(g, sc.lt, g => {
    let sh = 0; PILLS.forEach(([t0]) => { const q = t - t0; if (q > 0 && q < .3) sh += Math.sin(q * 70) * 5 * (1 - q / .3); });
    g.translate(sh, 0);
    PILLS.forEach(([t0, x, y, rot, w]) => pillIn(g, t, t0, x, y, rot, w));
    const D = DOT0(t), r = 36 * C.spring(t - .08, ...C.SP.jelly);
    if (D.vx || D.vy) C.trail(g, DOT0, t, r, { n: 4 });
    C.dot(g, D.x, D.y, r, D);
    C.words(g, t, 'уведомления', 64, 470, { size: 66, w: 600, fam: 'text', col: P.grey, i: 0, out: 2.2 });
    C.words(g, t, 'отвлекают', 60, 650, { size: 170, i: 0, out: 2.24 });
  }, { amp: .035, drift: sc.p });
}

function s1(g, t, sc) { // десятки раз в день
  C.bg(g, P.cream); C.field(g, t);
  C.cam(g, sc.lt, g => {
    PILLS.forEach(([, x, y, rot, w], i) => { const q = C.eo(C.pr(t, 2.41 + i * .015, 2.7 + i * .015)); if (q >= 1) return;
      g.save(); g.translate(x, y); g.rotate(rot * RAD); g.scale(1 - q, 1 - q); C.notif(g, 0, 0, w); g.restore(); });
    C.grid(g, 540, 1150, 7, 7, 110, { r: 21, skip: [24], at: n => 2.47 + C.hash(n * 3.7 + 1) * 1.25,
      k: n => 1 - C.eo(C.pr(t, 4.36 + C.hash(n) * .1, 4.58 + C.hash(n) * .1)) });
    C.words(g, t, '*десятки', 60, 640, { size: 220, i: 0, out: 4.42 });
    C.words(g, t, 'раз в день', 64, 770, { size: 84, w: 700, i: 0, out: 4.46 });
    const D = C.hop(t, [LAST0[1], LAST0[2]], [540, 1150], 2.41, .36, 170);
    C.dot(g, D.x, D.y, 36 - 6 * D.p + 34 * C.eo(C.pr(t, 4.36, 4.55)), D);
    C.wipe(g, 540, 1150, C.eo(C.pr(t, 4.52, 4.88)), P.orange);
  }, { amp: .04, drift: sc.p });
}

function s2(g, t, sc) { // встречайте режим «Фокус»
  C.bg(g, P.orange);
  C.cam(g, sc.lt, g => {
    const R = (Math.hypot(540, 1060) + 40) * C.eo(C.pr(t, 5.0, 5.62)), clipC = () => { g.beginPath(); g.arc(540, 1060, R, 0, C.TAU); g.clip(); };
    C.circle(g, 540, 1060, R, P.night);
    g.save(); clipC(); C.field(g, t, { dark: true }); g.restore();
    const o = { size: 90, w: 700, al: 'center', i: 1, out: 6.25 };
    C.words(g, t, 'встречайте', 540, 560, Object.assign({ col: P.ink }, o));
    g.save(); clipC(); C.words(g, t, 'встречайте', 540, 560, Object.assign({ col: P.cream }, o)); g.restore();
    // точка → пилюля с обводкой → обратно в точку
    const pw = C.track(t, [[5.66, 0], [5.68, 150], [5.95, 640], [6.95, 58]], ...C.SP.ui);
    const ph = C.track(t, [[5.66, 0], [5.68, 150], [6.95, 58]], ...C.SP.ui) * (1 - Math.min(.22, Math.abs(C.sv(t - 5.95, ...C.SP.ui)) * .024));
    if (t > 5.66 && t < 7.33) C.pill(g, 540, 1060, Math.max(1, pw), Math.max(1, ph), { col: P.orange, ring: C.pr(t, 6.15, 6.35) * (1 - C.pr(t, 6.82, 6.92)), ringOff: 20, ringW: 3 });
    C.words(g, t, 'режим', 80, 900, { size: 84, w: 600, fam: 'text', col: P.greyD, i: 1 });
    const E = C.words(g, t, 'фокус', 70, 1180, { size: 300, fx: 'whip', dark: true, i: 1, maxW: 860 }).end;
    let D = { x: 540, y: 1060 };
    if (t >= 8.6) D = C.hop(t, [E.x, E.y], [540, 1150], 8.6, .3, 140);
    else if (t >= 7.32) D = C.hop(t, [540, 1060], [E.x, E.y], 7.32, .36, 240);
    C.wipe(g, 540, 1150, C.eo(C.pr(t, 8.78, 9.08)), P.cream);
    if (t >= 7.32) C.dot(g, D.x, D.y, E.r * (1 + .14 * C.eo(C.pr(t, 8.8, 9.1))), D);
  }, { amp: .05, drift: sc.p });
}

function bigToggle(g, t) { // тумблер «Фокус»: вырастает из точки, ручка уезжает влево, касание включает
  const ks = C.lerp(.24, 1, C.spring(t - 9.06, ...C.SP.ui)), h = 313.6 * ks, st = C.spring(t - 9.2, ...C.SP.ui);
  const w = C.lerp(h, 560, st), sw = C.switchAt(t, 10.02), on = .5 * (1 - st) + sw.on, v = sw.v - .5 * C.sv(t - 9.2, ...C.SP.ui);
  const ring = C.pr(t, 10.02, 10.14) * (1 - C.pr(t, 10.55, 10.75));
  return C.toggle(g, 540, 1150, w, on, { h, v, sh: .12, ring });
}

function s3(g, t, sc) { // одно касание
  C.bg(g, P.cream); C.field(g, t);
  C.cam(g, sc.lt, g => {
    SLEEP.forEach(([t0, x, y, rot], i) => pillIn(g, t, t0, x, y, rot, 400, { wob: Math.sin(t * 17 + i * 2) * 1.6 }));
    bigToggle(g, t);
    C.touch(g, KX_OFF, 1150, t, 10.0, { r: 62 });
    C.words(g, t, 'одно *касание', 540, 600, { size: 150, al: 'center', i: 2, out: 10.42 });
    C.words(g, t, 'уведомления', 540, 520, { size: 72, w: 600, fam: 'text', col: P.grey, al: 'center', i: 2 });
  }, { amp: .04, drift: sc.p, push: .02 * C.bump(t, 10.02, .5) });
}

function s4(g, t, sc) { // уведомления засыпают
  C.bg(g, P.cream); C.field(g, t);
  C.cam(g, sc.lt, g => {
    SLEEP.forEach(([, x, y, rot], i) => {
      const sl = C.eo(C.pr(t, 11.8 + i * .1, 12.2 + i * .1)), q = C.eo(C.pr(t, 12.3 + i * .06, 12.62 + i * .06));
      const zq = C.pr(t, 11.95 + i * .1, 12.8 + i * .1);
      if (i > 1 && zq > 0 && zq < 1) C.text(g, 'z', x + 150 + zq * 30, y - 50 - zq * 120, 44 + zq * 16, { w: 700, col: P.grey, a: Math.sin(zq * Math.PI) });
      if (q >= 1) return;
      g.save(); g.translate(x, y + q * 40); g.rotate(rot * (1 - sl) * RAD); g.scale(1 - q, 1 - q);
      C.notif(g, 0, 0, 400, { sleep: sl, sh: .1 * (1 - sl) }); g.restore();
    });
    const sw = C.switchAt(t, 10.02); C.toggle(g, 540, 1150, 560, sw.on, { v: sw.v, sh: .12 });
    C.words(g, t, 'уведомления', 540, 520, { size: 72, w: 600, fam: 'text', col: P.grey, al: 'center', i: 2 });
    C.words(g, t, '*засыпают.', 540, 700, { size: 160, al: 'center', i: 2 });
  }, { amp: .04 });
  C.halftone(g, C.eio(C.pr(t, 12.5, 13.3)), { cx: KX_ON, cy: 1150, col: P.night });
  if (t > 12.5) C.dot(g, KX_ON, 1150, C.lerp(125.4, 34, C.eo(C.pr(t, 12.9, 13.3))));
}

function gate(g, t) { // мембрана-фильтр: звонок проходит, остальное ждёт
  const m = C.eo(C.pr(t, 13.35, 13.8)) * (1 - C.eo(C.pr(t, 17.36, 17.62))), ex = C.eo(C.pr(t, 17.34, 17.6));
  let cy;
  if (t < 14.25) cy = C.track(t, [[13.5, -140], [13.52, MY - CH / 2 - 3]], ...C.SP.soft);
  else if (t < 14.7) cy = MY - CH / 2 - 3 + C.eio(C.pr(t, 14.25, 14.7)) * 95;
  else cy = C.track(t, [[14.7, MY - CH / 2 + 92], [14.71, 1300]], ...C.SP.ui);
  let vib = t >= 14.7 ? { lt: t - 14.7, amp: 95, f: 3.2 } : null;
  QUEUE.forEach(([t0]) => { if (t > t0 + .2) vib = { lt: t - t0 - .2, amp: 16, f: 3.6, decay: 4 }; });
  const push = t >= 14.25 && t < 14.7 ? { x: 540, d: cy + CH / 2 - MY + 3, w: 190 } : null;
  if (m > .01) C.string(g, 540 - 480 * m, 540 + 480 * m, MY, { col: P.cream, lw: 5, push, vib });
  QUEUE.forEach(([t0, x, row]) => {
    if (t <= t0) return; const xx = C.track(t, [[t0 - .01, -220], [t0, x]], 240, 17), y = MY - 38 - row * 74;
    g.save(); g.translate(xx, y); g.scale(1 - ex, 1 - ex); C.notif(g, 0, 0, 250, { col: P.mid, fg: P.greyD }); g.restore();
  });
  if (t > 13.5) {
    if (t < 14.95) C.pulse(g, 540, cy, CW, CH, t, { col: P.orange, a: .5 * (1 - C.pr(t, 14.6, 14.95)) });
    g.save(); g.translate(540, cy); g.scale(1 - ex, 1 - ex); C.notif(g, 0, 0, CW, { col: P.orange, fg: P.ink, text: 'мама' }); g.restore();
    C.check(g, 812, 1300, 64, C.eo(C.pr(t, 14.82, 15.12)) * (1 - ex), P.cream, 10);
  }
  let D = C.hop(t, [KX_ON, 1150], [540, 1460], 13.3, .4, 100);
  if (t >= 17.4) D = C.hop(t, [540, 1460], [540, 1060], 17.4, .3, 90);
  C.dot(g, D.x, D.y, 34 * (1 + .05 * Math.sin(t * 3)), D);
}

function s5(g, t, sc) {
  C.bg(g, P.night); C.field(g, t, { dark: true });
  C.cam(g, sc.lt, g => { gate(g, t); C.words(g, t, 'важные *звонки', 540, 520, { size: 130, al: 'center', dark: true, i: 3, out: 15.4 }); }, { amp: .04, drift: sc.p });
}
function s6(g, t, sc) {
  C.bg(g, P.night); C.field(g, t, { dark: true });
  C.cam(g, sc.lt, g => { gate(g, t); C.words(g, t, 'остальное / *ждёт.', 540, 470, { size: 130, al: 'center', dark: true, i: 3, out: 17.34 }); }, { amp: .04, drift: sc.p * .6 });
}

function s7(g, t, sc) { // таймер 25 минут
  C.bg(g, P.cream); C.field(g, t);
  const p = C.eio(C.pr(t, 19.0, 21.45)), dp = (C.eio(C.pr(t + .01, 19.0, 21.45)) - C.eio(C.pr(t - .01, 19.0, 21.45))) / .02;
  C.cam(g, sc.lt, g => {
    const R = C.ring(g, 540, 1060, 330, p, { lw: 22, draw: C.eo(C.pr(t, 17.95, 18.6)), ticks: 25 });
    C.odo(g, 25 * C.spring(t - 18.58, ...C.SP.snappy), 2, 540, 1150, 300, { al: 'center', a: C.pr(t, 18.56, 18.64) });
    C.words(g, t, 'таймер', 540, 520, { size: 130, al: 'center', i: 4 });
    C.words(g, t, 'минут *работы', 540, 1262, { size: 58, w: 700, al: 'center', col: P.grey, i: 4 });
    let D = { x: 540, y: 1060 };
    if (t >= 19.0) { const sp = dp * C.TAU * 330; D = { x: R.x, y: R.y, vx: -Math.sin(R.a) * sp, vy: Math.cos(R.a) * sp }; }
    else if (t >= 18.1) D = C.hop(t, [540, 1060], [540, 730], 18.1, .4, 80);
    C.ping(g, 540, 730, 34, C.pr(t, 21.45, 21.9), { col: P.orange });
    C.dot(g, D.x, D.y, 34, D);
    C.wipe(g, 540, 730, C.eo(C.pr(t, 21.55, 21.88)), P.orange);
  }, { amp: .04, drift: sc.p, cy: 1060 });
  C.halftone(g, 1 - C.eio(C.pr(t, 17.7, 18.45)), { cx: 540, cy: 1060, col: P.night });
  if (t < 18.45) C.dot(g, 540, 1060, 34);
}

function s8(g, t, sc) { // пять минут отдыха
  C.bg(g, P.orange);
  const wq = C.pr(t, 24.16, 24.39), wx = -1300 * C.ei(wq), wv = 1300 * 3 * wq * wq / .23 / 30;
  C.cam(g, sc.lt, g => C.smear(g, -wv * 1.4, 0, wq > .05 ? 4 : 0, g => {
    g.translate(wx, 0);
    const size = 380, y = 1130, s0 = C.lerp(.88, 1, C.spring(t - 21.9, ...C.SP.heavy)), a = C.pr(t, 21.9, 22.02);
    g.font = C.font(size, 800); const cw = g.measureText('0').width;
    g.save(); g.globalAlpha *= a; g.translate(540, y - size * .36); g.scale(s0, s0); g.translate(-540, -(y - size * .36));
    const fq = t - 22.59;
    if (fq < .75) { const tilt = fq < 0 ? -.12 * Math.sin(C.pr(t, 22.38, 22.59) * Math.PI) : -fq * 1.7;
      g.save(); g.translate(540 - cw / 2 - Math.max(0, fq) * 420, y - size * .36 + (fq > 0 ? 4200 * fq * fq - 300 * fq : 0)); g.rotate(tilt);
      C.text(g, '2', 0, size * .36, size, { al: 'center' }); g.restore(); }
    C.text(g, '5', C.lerp(540 + cw / 2, 540, C.spring(t - 22.68, ...C.SP.ui)), y, size, { al: 'center' });
    g.restore();
    C.words(g, t, 'минут *отдыха', 540, 1420, { size: 96, al: 'center', i: 5, hl: P.orange, hlBox: P.ink });
    const bs = C.spring(t - 22.95, ...C.SP.ui), pb = C.eio(C.pr(t, 23.1, 24.2));
    if (bs > 0) { g.save(); g.translate(540, 1585); g.scale(bs, bs); g.translate(-540, -1585);
      C.pill(g, 540, 1585, 700, 60, { col: null, line: P.ink, lw: 5 });
      const fw = Math.max(60, 700 * pb); C.pill(g, 190 + fw / 2, 1585, fw, 60, { col: P.ink });
      C.dot(g, 190 + fw - 30, 1585, 44, { col: P.ink }); g.restore(); }
  }), { amp: .04, drift: sc.p });
}

function s9(g, t, sc) { // и снова в поток
  C.bg(g, P.cream); C.field(g, t);
  const q = C.pr(t, 24.39, 24.82), dx = (1 - C.eo5(q)) * 1000, v = 1000 * 5 * Math.pow(1 - q, 4) / .43 / 30;
  const pos = tt => { const u = GP(tt); return { x: GX(u), y: GY(u) }; };
  C.cam(g, sc.lt, g => C.smear(g, -v * 1.4, 0, v > 4 ? 4 : 0, g => {
    g.translate(dx, 0);
    C.graph(g, 110, 820, 840, 560, GP(t), { axes: C.eo(C.pr(t, 24.45, 24.9)), label: 'фокус', labelAl: 'left' });
    C.words(g, t, 'снова в / *поток.', 64, 520, { size: 140, i: 5 });
    const D = pos(t), D1 = pos(t + .01), D0 = pos(t - .01), vx = (D1.x - D0.x) / .02, vy = (D1.y - D0.y) / .02;
    if (GP(t) > 0 && GP(t) < 1) C.trail(g, pos, t, 30, { n: 4 });
    C.dot(g, D.x, D.y, 30, { vx, vy, land: t - 25.75 });
  }), { amp: .03, drift: sc.p });
  C.halftone(g, C.eio(C.pr(t, 25.85, 26.4)), { cx: GX(1), cy: GY(1), col: P.night });
  if (t > 25.85) C.dot(g, GX(1), GY(1), 30);
}

function s10(g, t, sc) { // часы спокойной работы
  C.bg(g, P.night); C.field(g, t, { dark: true });
  C.cam(g, sc.lt, g => {
    const D = C.hop(t, [GX(1), GY(1)], [540, 1180], 26.4, .42, 160), ang = .4 - (t - 26.4) * .55 - C.ei(C.pr(t, 29.8, 30.6)) * 1.6;
    C.ring3d(g, 540, 1180, 400, { text: 'ТИШИНА · ПОТОК · ФОКУС · ', ang, tilt: .3, p: C.eo(C.pr(t, 26.55, 27.5)), maxSize: 84,
      mid: g => C.dot(g, D.x, D.y, 34 * (1 + .06 * Math.sin(t * 3)), D) });
    C.words(g, t, 'вы вернёте себе', 540, 520, { size: 66, w: 600, fam: 'text', col: P.greyD, al: 'center', i: 6, out: 27.72 });
    C.words(g, t, '*часы', 540, 700, { size: 250, al: 'center', i: 6 });
    C.words(g, t, 'спокойной работы', 540, 840, { size: 84, w: 700, al: 'center', dark: true, i: 6 });
    C.wipe(g, 540, 1180, C.eo(C.pr(t, 30.42, 30.68)), P.orange);
  }, { amp: .04, drift: sc.p, cy: 1180, push: .025 * C.bump(t, 27.98, .55) });
}

function s11(g, t, sc) { // режим «Фокус». Включите тишину.
  C.bg(g, P.orange);
  C.cam(g, sc.lt, g => {
    const R = (Math.hypot(540, 1240) + 40) * C.eo(C.pr(t, 30.74, 31.22));
    C.circle(g, 540, 1240, R, P.cream); g.save(); g.beginPath(); g.arc(540, 1240, R, 0, C.TAU); g.clip(); C.field(g, t); g.restore();
    C.words(g, t, 'режим', 80, 660, { size: 84, w: 600, fam: 'text', col: P.grey, i: 7, shift: .15 });
    const E = C.words(g, t, 'фокус', 70, 950, { size: 290, fx: 'whip', i: 7, maxW: 860 }).end;
    const ts = C.spring(t - 32.05, ...C.SP.ui);
    if (ts > 0) { const sw = C.switchAt(t, 32.77); g.save(); g.translate(540, 1240); g.scale(ts, ts); g.translate(-540, -1240);
      C.toggle(g, 540, 1240, 420, sw.on, { v: sw.v, sh: .14, ring: C.pr(t, 32.77, 32.9) * (1 - C.pr(t, 33.3, 33.5)) }); g.restore(); }
    C.touch(g, 540 - 210 + 23.5 + 94.1, 1240, t, 32.75, { r: 56 });
    const D = t < 31.62 ? { x: 540, y: 1240 } : C.hop(t, [540, 1240], [E.x, E.y], 31.62, .38, 260);
    C.dot(g, D.x, D.y, t < 31.62 ? 34 * C.spring(t - 30.85, ...C.SP.jelly) : C.lerp(34, E.r, D.p), D);
    C.words(g, t, 'включите *тишину.', 540, 1560, { size: 84, al: 'center', i: 7, hl: P.cream, hlBox: P.ink });
  }, { amp: .05, drift: sc.p, push: .02 * C.bump(t, 32.77, .5) });
}

const SC = [s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11];

// ---------- строка состояния: время и мини-тумблер рассказывают историю ----------
function minutes(t) {
  if (t < 9) return 540 + Math.floor(t / 3);
  if (t < 19) return 544;
  if (t < 21.6) return 545 + 25 * C.eio(C.pr(t, 19.0, 21.45));
  if (t < 23.1) return 570;
  if (t < 24.3) return 570 + 5 * C.eio(C.pr(t, 23.1, 24.2));
  if (t < 28) return 575 + (t - 24.3) / 2.5;
  return 577 + 203 * C.eio(C.pr(t, 28.0, 30.3));
}
function darkAt(t) {
  if (t < 5.6) return C.pr(t, 5.15, 5.45);
  if (t < 9.1) return 1 - C.pr(t, 8.95, 9.06);
  if (t < 13.3) return C.pr(t, 12.95, 13.25);
  if (t < 17.7) return 1;
  if (t < 25.8) return 1 - C.pr(t, 17.75, 17.95);
  if (t < 30.4) return C.pr(t, 26.1, 26.35);
  return 1 - C.pr(t, 30.48, 30.6);
}

function draw(t, k) {
  const g = C.begin(t, k), sc = C.cuts(t, CUTS);
  g.save(); SC[sc.i](g, t, sc); g.restore();
  const sw = C.switchAt(t, 10.02);
  C.status(g, { time: C.clock(minutes(t)), on: sw.on, v: sw.v, dark: darkAt(t), a: C.eo(C.pr(t, .15, .55)) });
}

function sound(s) {
  [[.02, 'notify', .13], [.4, 'pop_soft', .1, 1], [.74, 'pop_soft', .1, 1.12], [1.38, 'pop_soft', .1, 1.25],
   [2.41, 'tally', .13], [4.52, 'bubble', .15, .8], [5.02, 'bubble_down', .1], [5.68, 'pop_soft', .1, .75],
   [7.26, 'woodblock', .12], [7.66, 'drop', .12], [8.78, 'bubble', .12, 1.1], [10.02, 'toggle_on', .2],
   [11.8, 'bubble_down', .12, .85], [12.5, 'marimba_run', .09, .8], [13.55, 'notify', .1], [14.7, 'pop_high', .13],
   [14.85, 'success', .1], [15.9, 'wood', .09], [16.36, 'wood', .08, 1.2], [17.7, 'kalimba_run', .1],
   [18.58, 'odometer', .14], [21.45, 'success', .1, 1.2], [22.59, 'drop', .14, .8], [23.54, 'pop_soft', .1],
   [24.16, 'kalimba_run', .12], [24.85, 'marimba', .1], [26.55, 'magic', .1], [27.98, 'pop_double', .13],
   [30.42, 'bubble', .14, .8], [31.52, 'woodblock', .12], [32.77, 'toggle_on', .2], [33.45, 'success3', .14]
  ].forEach(([t, n, v, p]) => s.play(t, n, v, { pitch: p || 1 }));
}
