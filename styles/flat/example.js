// «Эволюция телефона» — демо стиля FLAT. Написано по doc.md: только FLAT.* и обычный canvas.
// Мир-метафора: полёт сквозь время. Телефон летит из кремового прошлого через небо в космос и на каждой
// эпохе эволюционирует (сплющивается и раскрывается новым). Счётчик эпох и шкала вверху ведут прогресс.
const P = FLAT.C, E = FLAT.E, PI = Math.PI;
const ERA = [10.9, 14.25, 18.6, 22.85, 26.5, 30.5];           // смены эпохи: фон, счётчик, шкала
const FORM_T = [10.9, 14.25, 20.4, 22.85, 26.5];                // эволюции телефона
const CUTS = [0, 4.8, 7.75, 10.9, 12.2, 14.25, 16.3, 18.6, 20.4, 22.85, 26.5, 30.5, 32.85];
const DIAL = [[12.2, 1.54], [12.75, 1.01], [13.3, 3.1]];      // рывки диска: момент, угол
const DIGITS = ['2', '1', '5'];
const OP = { x: 1000, y: 1200, s: 1.1, lean: 6 };               // телефонистка
const APPC = [P.gold, P.terra, P.sky, P.green, P.peach, P.mist, P.red, P.goldL];

const travel = (t) => ERA.reduce((x, c) => x + 1500 * E.inOut(FLAT.prog(t, c - 0.05, c + 0.9)), t * 36);
const heroAt = (t) => FLAT.track(t, [
  [0, [540, 1010, 1]], [10.9, [540, 1040, 1.12]], [14.25, [540, 960, 1]], [16.0, [370, 900, 1]], [16.3, [370, 976, 1]],
  [18.6, [470, 990, 1]], [20.4, [470, 1020, 0.85]], [22.85, [540, 1075, 1.25]], [26.5, [540, 1050, 1]], [30.5, [540, 990, 0.82]],
], { f: 1.3, z: 0.72 });
function camAt(t) {
  const c = FLAT.track(t, [
    [0, [1, 540, 960, 0, 0]], [2.45, [1.1, 540, 1060, 0, -40]], [4.8, [1.35, 736, 905, -196, 55]], [7.75, [1, 540, 960, -560, 0]],
    [10.25, [1, 540, 960, 0, 0]], [12.2, [1.4, 540, 1065, 0, -65]], [14.25, [1, 540, 960, 0, 0]],
  ], { f: 1.15, z: 0.82 });
  const cu = FLAT.cuts(t, CUTS);
  return { zoom: c[0] * FLAT.settle(cu.lt, 0.04) * (1 + 0.008 * cu.lt), fx: c[1], fy: c[2], dx: c[3], dy: c[4] };
}
function dialRot(t) {
  let a = 0;
  for (const [t0, A] of DIAL) { const lt = t - t0; if (lt > 0) a += lt < 0.3 ? A * E.out(lt / 0.3) : A * (1 - E.inOut((lt - 0.3) / 0.24)); }
  return a;
}
const armF = (t) => FLAT.track(t, [[0, [30, -64]], [8.35, [126, -26]]], { f: 1.8, z: 0.6 });
function handPos(t) {
  const a = armF(t), d = PI / 180, L = OP.lean * d, A = a[0] * d, B = (a[0] + a[1]) * d;
  const sx = OP.x + OP.s * Math.sin(L) * 118 * 0.95, sy = OP.y + OP.s * (-Math.cos(L) * 118 * 0.95 + 14);
  return [sx + OP.s * (Math.sin(A) * 60 + Math.sin(B) * 58), sy + OP.s * (Math.cos(A) * 60 + Math.cos(B) * 58)];
}
function rayRect(a, cx, cy, w, h) {
  const c = Math.cos(a), s = Math.sin(a), k = Math.min(Math.abs(c) > 1e-6 ? w / 2 / Math.abs(c) : 1e9, Math.abs(s) > 1e-6 ? h / 2 / Math.abs(s) : 1e9);
  return [cx + c * k, cy + s * k];
}

// ---------- формы телефона: рисуются вокруг (0,0) ----------
function wall(g, t) {
  const crank = PI * 6 * E.inOut(FLAT.prog(t, 5.9, 7.5)) - 0.7;
  const ring = Math.min(1, FLAT.env(t, 6.15, 7.7, 0.12, 0.3) + FLAT.env(t, 8.9, 10.3, 0.12, 0.3)), sw = Math.sin(t * 44) * 0.13 * ring;
  FLAT.box(g, -118, -330, 236, 700, { r: 16, fill: P.woodD, shade: '#683A1F', sw: 0.3 });
  FLAT.cord(g, -214, -64, -150, 38, { sag: 56, lw: 6 });
  FLAT.box(g, -140, 112, 280, 216, { r: 16, fill: P.wood, shade: P.woodD, sw: 0.16 });
  FLAT.box(g, -48, 196, 96, 40, { r: 8, fill: P.goldL, lw: 4 });
  FLAT.poly(g, [[-166, 54], [166, 54], [186, 96], [-186, 96]], { fill: P.woodL, lw: 5 });
  FLAT.box(g, -170, -250, 340, 290, { r: 18, fill: P.wood, shade: P.woodD, sw: 0.14 });
  g.strokeStyle = P.woodD; g.lineWidth = 3;
  for (const [y0, q] of [[-200, 1], [-26, -1]]) { g.beginPath(); g.moveTo(-146, y0); g.bezierCurveTo(-90, y0 - 14 * q, -30, y0 + 12 * q, 40, y0); g.stroke(); }
  for (const sx of [-70, 70]) FLAT.bell(g, sx, -318, 50, { swing: sx < 0 ? sw : -sw, fill: P.gold, shade: P.goldD, clapper: false });
  for (const sx of [-1, 1]) FLAT.waves(g, t, sx * 70, -296, { ang: -PI / 2 + sx * 0.9, spread: 0.9, r0: 66, r1: 150, alpha: ring, lw: 6, col: P.ink, speed: 1.6 });
  FLAT.seg(g, -168, -168, -206, -168, { lw: 9, col: P.ink });
  FLAT.box(g, -236, -222, 46, 168, { r: 20, fill: '#3A332D' });
  FLAT.box(g, -246, -236, 66, 34, { r: 14, fill: '#4A423B' });
  FLAT.box(g, -15, -118, 30, 56, { r: 8, fill: '#3A332D', stroke: null });
  FLAT.disc(g, 0, -56, 46, { fill: '#3B342E' }); FLAT.disc(g, 0, -56, 28, { fill: '#221D19', stroke: null }); FLAT.disc(g, 0, -56, 11, { fill: '#5D544D', stroke: null });
  const hx = 196, hy = -100, ax = hx + Math.cos(crank) * 76, ay = hy + Math.sin(crank) * 76, turn = FLAT.env(t, 5.9, 7.5, 0.15, 0.25);
  if (turn > 0) FLAT.ring(g, hx, hy, 106, { a0: crank - 1.5, a1: crank - 0.3, lw: 8, col: P.ink, alpha: 0.55 * turn });
  FLAT.box(g, 164, -116, 30, 32, { r: 6, fill: P.woodD, lw: 4 });
  FLAT.seg(g, hx, hy, ax, ay, { lw: 16, col: P.ink }); FLAT.seg(g, hx, hy, ax, ay, { lw: 7, col: P.goldD });
  FLAT.disc(g, hx, hy, 15, { fill: P.gold, lw: 4 });
  FLAT.box(g, ax - 13, ay - 28, 26, 56, { r: 12, fill: '#3A332D', lw: 4 });
}
function rotary(g, t) {
  FLAT.cord(g, -214, -118, -262, 120, { coils: 7, amp: 12, sag: 50, lw: 5 });
  FLAT.box(g, -236, 128, 472, 46, { r: 18, fill: P.rust });
  FLAT.poly(g, [[-150, -92], [150, -92], [222, 140], [-222, 140]], { r: 30, fill: P.terra, shade: P.rust, side: 'b', sw: 0.2 });
  FLAT.box(g, -138, -130, 32, 52, { r: 10, fill: P.rust }); FLAT.box(g, 106, -130, 32, 52, { r: 10, fill: P.rust });
  FLAT.box(g, -170, -162, 340, 44, { r: 22, fill: P.terra });
  for (const x of [-252, 140]) FLAT.box(g, x, -182, 112, 78, { r: 30, fill: P.terra, shade: P.rust, side: 'b', sw: 0.3 });
  FLAT.dial(g, 0, 22, 100, dialRot(t), { plate: P.paper, wheel: '#E6DCCB' });
}
function brick(g, t) {
  FLAT.box(g, 36, -372, 34, 140, { r: 14, fill: '#3B4250' }); FLAT.disc(g, 53, -378, 17, { fill: '#3B4250' });
  FLAT.waves(g, t, 53, -392, { spread: 1.4, r0: 36, r1: 130, alpha: FLAT.env(t, 14.7, 18.6, 0.3, 0.3), col: P.inkN, lw: 6, speed: 0.9 });
  FLAT.box(g, -96, -262, 192, 524, { r: 30, fill: '#E6D6BA', shade: '#CDB896', sw: 0.18 });
  FLAT.grill(g, 0, -226, 64, 3, { gap: 10, lw: 4 });
  FLAT.screen(g, -70, -196, 140, 66, { r: 8, col: '#2E3B33', draw: (g, x, y) => { g.fillStyle = '#F2A54A'; for (let i = 0; i < 4; i++) g.fillRect(x + 16 + i * 30, y + 22, 20, 24); } });
  FLAT.keypad(g, 0, 40, 3, 5, 46, 34, 12, { col: '#56606E', mark: '#9AA3AE', p: E.out(FLAT.prog(t, 14.4, 15.1)) });
  FLAT.grill(g, 0, 222, 50, 2, { gap: 10, lw: 4 });
}
function candy(g, t) {
  const sms = t > 21.9 && Math.floor((t - 21.9) * 4) % 2 === 0;
  FLAT.box(g, 34, -238, 28, 50, { r: 10, fill: '#3B4250' });
  FLAT.box(g, -80, -210, 160, 420, { r: 46, fill: P.steel, shade: '#B3C1D2', sw: 0.16 });
  FLAT.grill(g, 0, -186, 40, 1, { lw: 5 });
  FLAT.screen(g, -60, -164, 120, 110, { r: 10, col: P.lcd, draw: (g, x, y) => {
    g.fillStyle = P.lcdD; for (let i = 0; i < 4; i++) g.fillRect(x + 10 + i * 9, y + 30 - i * 5, 6, 8 + i * 5);
    if (sms) { g.strokeStyle = P.lcdD; g.lineWidth = 5; g.strokeRect(x + 36, y + 44, 56, 38); g.beginPath(); g.moveTo(x + 36, y + 44); g.lineTo(x + 64, y + 66); g.lineTo(x + 92, y + 44); g.stroke(); }
  } });
  FLAT.box(g, -36, -38, 72, 30, { r: 15, fill: '#56606E', lw: 3 });
  FLAT.keypad(g, 0, 92, 3, 4, 38, 26, 10, { col: '#56606E', mark: '#9AA3AE', lw: 3, p: E.out(FLAT.prog(t, 20.55, 21.2)) });
}
function wallpaper(g, x, y, w, h, p) {
  if (p <= 0) return;
  g.save(); g.beginPath(); g.rect(x, y + h * (1 - p), w, h); g.clip();
  g.fillStyle = '#7FB6E6'; g.fillRect(x, y, w, h);
  FLAT.disc(g, x + w * 0.68, y + h * 0.34, 22, { fill: P.gold, stroke: null });
  g.fillStyle = P.green; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + h * 0.7); g.quadraticCurveTo(x + w * 0.35, y + h * 0.5, x + w * 0.7, y + h * 0.72); g.lineTo(x + w, y + h * 0.64); g.lineTo(x + w, y + h); g.closePath(); g.fill();
  g.fillStyle = P.terra; g.fillRect(x + w * 0.16, y + h * 0.66, 30, 26); g.fillStyle = P.paper; g.fillRect(x, y, w, 14);
  g.restore();
}
function flip(g, t) {
  const open = Math.min(1.04, FLAT.spring(t - 23.15, 1.5, 0.6)), c = Math.cos(open * PI);
  FLAT.box(g, -88, -8, 176, 252, { r: 38, fill: '#ECE7DE', shade: '#CFC8BB', sw: 0.16 });
  FLAT.box(g, -34, 22, 68, 28, { r: 14, fill: P.gold, lw: 3 });
  FLAT.keypad(g, 0, 148, 3, 4, 34, 22, 10, { col: '#7C8695', mark: '#C9CFD8', lw: 3, p: E.out(FLAT.prog(t, 23.3, 23.9)) });
  g.save(); g.translate(0, -8);
  if (c > 0) { g.scale(1, c); FLAT.box(g, -88, 0, 176, 252, { r: 38, fill: '#DCD5C8', shade: '#C2BAAA', sw: 0.16 }); FLAT.screen(g, -40, 40, 80, 56, { r: 8, col: '#2E3B4E' }); }
  else {
    g.scale(1, -c); FLAT.box(g, -88, -262, 176, 262, { r: 38, fill: '#ECE7DE', shade: '#CFC8BB', sw: 0.16 }); FLAT.grill(g, 0, -238, 40, 1, { lw: 5 });
    FLAT.screen(g, -68, -218, 136, 172, { r: 10, col: '#2E3B4E', draw: (g, x, y, w, h) => wallpaper(g, x, y, w, h, E.out(FLAT.prog(t, 23.75, 24.3))) });
  }
  g.restore();
  FLAT.box(g, -80, -24, 160, 32, { r: 16, fill: '#C9C1B3', lw: 4 });
  const ls = FLAT.pop(t, 25.25, 2.4, 0.45); if (ls > 0.01) FLAT.lens(g, 100, -8, 26 * ls, { ring: P.slate });
}
function smart(g, t, ghost = 0) {
  const ap = FLAT.prog(t, 26.75, 27.45);
  g.save(); g.globalAlpha *= 1 - ghost;
  FLAT.box(g, -150, -300, 300, 600, { r: 54, fill: P.gold, shade: P.goldD, sw: 0.12 });
  FLAT.box(g, 147, -170, 12, 74, { r: 5, fill: P.goldD, lw: 3 });
  FLAT.screen(g, -132, -282, 264, 564, { r: 40, col: '#14233B', draw: (g, x, y, w, h) => {
    for (let j = 0; j < 20; j++) {
      const s = E.back(FLAT.prog(ap, (j / 20) * 0.6, (j / 20) * 0.6 + 0.4)); if (s <= 0) continue;
      g.save(); g.translate(x + 41 + (j % 4) * 61, y + 70 + Math.floor(j / 4) * 68); g.scale(s, s);
      FLAT.box(g, -23, -23, 46, 46, { r: 13, fill: APPC[(j * 3) % APPC.length], lw: 3 }); g.restore();
    }
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); FLAT.rr(g, x + 14, y + h - 92, w - 28, 74, 26); g.fill();
    for (let j = 0; j < 4; j++) { const s = E.back(FLAT.prog(ap, 0.5 + j * 0.1, 0.9 + j * 0.1)); if (s > 0) FLAT.disc(g, x + 50 + j * 55, y + h - 55, 21 * s, { fill: APPC[j + 2], lw: 3 }); }
  } });
  FLAT.disc(g, 0, -262, 8, { fill: P.ink, stroke: null });
  g.restore();
}
const FORMS = [wall, rotary, brick, candy, flip, smart];
function heroDraw(g, t, x, y, s) {
  let i = 0; while (i < FORM_T.length && t >= FORM_T[i]) i++;
  const lt = i ? t - FORM_T[i - 1] : t - 0.12, A = i ? FORMS[i - 1] : null, B = FORMS[i];
  s *= 1 + 0.06 * (FLAT.kick(t - 3.3) + FLAT.kick(t - 17.9) + FLAT.kick(t - 21.9));
  FLAT.morph(g, lt < 1.6 ? lt : 9, x, y, A && ((g) => A(g, t)), (g) => B(g, t), { s, mode: i ? 'flip' : 'pop' });
}

// ---------- предметы сцен ----------
function board(g, t) {
  const bx = 1250, by = 1020, lit = t > 8.85;
  FLAT.box(g, bx - 200, by - 300, 400, 560, { r: 18, fill: P.wood, shade: P.woodD, sw: 0.12 });
  FLAT.box(g, bx - 165, by - 260, 330, 330, { r: 12, fill: '#5A3420' });
  for (let i = 0; i < 5; i++) FLAT.disc(g, bx - 120 + i * 60, by - 225, 13, { fill: lit && i === 0 ? P.goldL : '#7A5236', lw: 3 });
  if (lit) FLAT.pulse(g, t - 8.85, bx - 120, by - 225, { r0: 14, r1: 70, col: P.goldL, lw: 6 });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) { const jx = bx - 120 + c * 60, jy = by - 160 + r * 62; FLAT.disc(g, jx, jy, 14, { fill: P.goldL, lw: 3 }); FLAT.disc(g, jx, jy, 6, { fill: P.ink, stroke: null }); }
  FLAT.box(g, bx - 190, by + 130, 420, 44, { r: 12, fill: P.woodL });
  for (let i = 0; i < 3; i++) { const px = bx - 40 + i * 70; FLAT.cord(g, px, by + 150, px + 26, by + 152, { sag: 70, lw: 5 }); FLAT.box(g, px - 9, by + 96, 18, 40, { r: 8, fill: P.ink, stroke: null }); }
  const [hx, hy] = handPos(t);
  FLAT.cord(g, bx - 150, by + 150, hx, hy + 18, { sag: 60, lw: 5 });
  FLAT.box(g, hx - 10, hy - 6, 20, 44, { r: 8, fill: P.ink, stroke: null });
  FLAT.person(g, OP.x, OP.y, OP.s, { col: P.terra, lean: OP.lean, legF: [82, -82], legB: [76, -76], armB: [40, -30], armF: armF(t), headset: true, bun: true, chair: true });
  if (lit) FLAT.burst(g, t - 8.85, hx, hy, { r0: 30, r1: 90, n: 8, col: P.goldL, lw: 6 });
}
function scaleProp(g, x, y, v) {
  FLAT.poly(g, [[x - 130, y + 24], [x + 130, y + 24], [x + 160, y + 190], [x - 160, y + 190]], { r: 18, fill: P.paper, shade: '#E2D3BC', side: 'b', sw: 0.2 });
  FLAT.box(g, x - 150, y, 300, 26, { r: 10, fill: P.mist });
  FLAT.gauge(g, x, y + 172, 92, v, { col: P.gold });
}
function future(g, t, hx, hy, hs) {
  const bob = Math.sin(t * 1.7) * 10, orb = E.inOut(FLAT.prog(t, 31.5, 32.6)), orbOut = 1 - FLAT.prog(t, 33.4, 33.9);
  if (orb > 0 && orbOut > 0) FLAT.ring(g, 540, 990, 330, { a0: -PI / 2, a1: -PI / 2 + PI * 2 * orb, lw: 3, col: P.mist, dash: [6, 12], alpha: 0.7 * orbOut });
  {
    const gh = E.inOut(FLAT.prog(t, 32.85, 33.3)), fade = 1 - 0.72 * E.in(FLAT.prog(t, 33.35, 33.9));
    g.save(); g.translate(hx, hy + bob); g.rotate(Math.sin(t * 1.1) * 0.05); g.scale(hs, hs);
    if (gh < 1) smart(g, t, gh);
    if (gh > 0) { g.globalAlpha *= fade * Math.min(1, gh * 2); g.setLineDash([22, 16]); g.lineDashOffset = -t * 60; FLAT.box(g, -150, -300, 300, 600, { r: 54, fill: null, stroke: P.paper, lw: 6 }); g.setLineDash([]); }
    g.restore();
  }
  FLAT.dotRing(g, t, 540, 990, 330, { p: FLAT.prog(t, 32.95, 34.0), inner: 0.84, src: (i, n) => rayRect((i / n) * PI * 2 + 0.12 * t, hx, hy + bob, 300 * hs, 600 * hs) });
  const be = FLAT.env(t, 33.7, Infinity, 0.4);
  if (be > 0) { FLAT.waves(g, t, 540, 990, { ang: 0, spread: PI * 2, r0: 16, r1: 230, n: 3, col: P.paper, lw: 4, alpha: be * 0.8, speed: 0.6 }); FLAT.disc(g, 540, 990, 11 * be, { fill: P.paper, stroke: null }); }
}
const ICONS = [['monitor', 28.0, 190, 990], ['camera', 28.65, 890, 990], ['globe', 29.7, 540, 1490]];

function world(g, t, tn) {
  const [hx, hy, hs] = heroAt(t);
  const wa = 1 - FLAT.prog(t, 10.7, 10.95), wp = E.out(FLAT.prog(t, 0.45, 1.2)), ba = 1 - FLAT.prog(t, 10.55, 10.9);
  if (wa > 0 && wp > 0) { g.save(); g.globalAlpha *= wa; FLAT.cord(g, hx + 100 * hs, hy - 322 * hs, 1070, 730, { sag: 90, lw: 5, p: wp }); g.restore(); }
  if (t > 6.8 && ba > 0) { g.save(); g.globalAlpha *= ba; board(g, t); g.restore(); }
  // весы и счётчик массы
  if (t > 15.8 && t < 19.0) scaleProp(g, 370, 1238 + (1 - FLAT.spring(t - 15.85, 1.6, 0.7)) * 700 + E.in(FLAT.prog(t, 18.5, 18.95)) * 700, 0.8 * FLAT.spring(t - 16.3, 2, 0.35));
  // линейка и пунктир прежнего размера
  if (t > 18.7 && t < 22.85) {
    const a = FLAT.spring(t - 18.75, 1.8, 0.6) * (1 - E.in(FLAT.prog(t, 22.6, 22.85))), my = FLAT.track(t, [[18.6, 728], [20.4, 841]], { f: 1.6, z: 0.6 });
    g.save(); g.translate(0, 1350); g.scale(1, Math.max(0.001, a)); g.translate(0, -1350); FLAT.ruler(g, 205, 640, 1350, { w: 70, mark: my }); g.restore();
    if (a > 0.6) FLAT.seg(g, 280, my, 380, my, { lw: 4, col: tn.line, dash: [10, 10] });
    const ga = FLAT.env(t, 20.5, 22.85, 0.3, 0.25);
    if (ga > 0) { g.save(); g.globalAlpha *= ga * 0.85; g.setLineDash([16, 12]); FLAT.box(g, 374, 728, 192, 524, { r: 30, fill: null, stroke: tn.line, lw: 5 }); g.setLineDash([]); g.restore(); }
  }
  // линии к иконкам — под телефоном
  for (const [, t0, tx, ty] of ICONS) { const q = E.out(FLAT.prog(t, t0 + 0.2, t0 + 0.6)) * (1 - FLAT.prog(t, 30.25, 30.5)); if (q > 0 && t < 30.5) FLAT.seg(g, hx, hy, FLAT.lerp(hx, tx, q), FLAT.lerp(hy, ty, q), { lw: 4, col: P.mist, dash: [8, 12] }); }
  if (t < 30.5) heroDraw(g, t, hx, hy, hs); else future(g, t, hx, hy, hs);
  for (const ft of FORM_T.concat([30.5])) {
    FLAT.pulse(g, t - ft - 0.16, hx, hy, { r0: 140, r1: 440, col: tn.line, lw: 10, dur: 0.55 });
    if (ft < 30) FLAT.burst(g, t - ft - 0.16, hx, hy, { r0: 230, r1: 360, n: 12, col: tn.line, lw: 7, dur: 0.4 });
  }
  // штамп «1-й» и масса 800 г
  FLAT.stamp(g, t, 14.5, 805, 760, '1-й', { r: 100, size: 58, t1: 16.2 });
  if (t > 16.3 && t < 18.6) {
    const s = FLAT.pop(t, 16.3) * (1 - E.in(FLAT.prog(t, 18.38, 18.6)));
    g.save(); g.translate(760, 1000); g.scale(s, s); FLAT.counter(g, -200, 0, 800 * E.out(FLAT.prog(t, 16.35, 17.9)), { digits: 3, size: 150, col: tn.ink, suffix: ' г', lead: false }); g.restore();
    FLAT.words(g, t, 16.75, 'почти', 566, 836, { size: 56, col: tn.ink, t1: 18.6 });
    FLAT.burst(g, t - 17.9, 760, 1000, { r0: 230, r1: 310, n: 14, col: tn.line, lw: 6 });
  }
  // СМС
  if (t > 21.9 && t < 22.85) {
    const s = FLAT.pop(t, 21.9) * (1 - E.in(FLAT.prog(t, 22.62, 22.85)));
    g.save(); g.translate(600, 800); g.scale(s, s); FLAT.bubble(g, 0, -156, 330, 156, { fill: P.paper }); FLAT.label(g, 'СМС', 165, -76, { size: 88, weight: 900, col: P.inkN }); g.restore();
  }
  // вспышка камеры и первое фото
  if (t > 25.55 && t < 26.5) {
    const lx = hx + 100 * hs, ly = hy - 8 * hs, fl = FLAT.prog(t, 25.6, 25.9);
    if (fl < 1 && t > 25.6) { g.save(); g.globalAlpha *= 1 - fl; FLAT.disc(g, lx, ly, 30 + 150 * E.out(fl), { fill: '#FFFFFF', stroke: null }); g.restore(); }
    FLAT.burst(g, t - 25.6, lx, ly, { r0: 50, r1: 150, col: '#FFFFFF', n: 10 });
    const q = FLAT.spring(t - 25.7, 1.8, 0.55), out = E.in(FLAT.prog(t, 26.28, 26.5)), m = Math.min(1, q);
    if (q > 0.01) { g.save(); g.translate(FLAT.lerp(lx, 850, m), FLAT.lerp(ly, 700, m)); g.rotate(-0.4 + 0.5 * m); FLAT.icon(g, 'photo', 0, 0, (0.3 + 1.2 * q) * (1 - out)); g.restore(); }
  }
  // иконки смартфона
  for (const [nm, t0, tx, ty] of ICONS) {
    if (t < t0 || t > 30.5) continue;
    const q = E.out(FLAT.prog(t, t0, t0 + 0.5)), s = 1.55 * FLAT.pop(t, t0, 2.2, 0.45) * (1 - E.in(FLAT.prog(t, 30.25, 30.5)));
    FLAT.icon(g, nm, FLAT.lerp(hx, tx, q), FLAT.lerp(hy, ty, q), s);
  }
}

// ---------- фон ----------
function backdrop(g, t, era, X, pan) {
  FLAT.sky(g, era);
  FLAT.stars(g, t, { alpha: FLAT.clamp((era - 3.7) / 1.3), off: X * 0.02, y1: 1500, n: 110 });
  FLAT.planet(g, { rise: E.out(FLAT.clamp(era - 4)) });
  const ca = Math.min(FLAT.clamp((era - 0.4) / 0.6), 1 - FLAT.clamp((era - 3.4) / 0.8));
  FLAT.clouds(g, t, { alpha: 0.85 * ca, off: X * 0.6 + pan * 0.5, n: 6, y0: 300, y1: 1350 });
  const hy = 1700 + 520 * (1 - E.out(FLAT.clamp((era - 1.25) / 0.75))) + 560 * E.in(FLAT.clamp((era - 3.2) / 0.9));
  FLAT.hills(g, { y: hy, off: X * 0.35 + 200, h: 360, col: '#3A5F8F', seed: 4 });
  FLAT.hills(g, { y: hy + 70, off: X * 0.55 + pan * 0.3, h: 250, col: P.navy, seed: 9 });
  const gy = 1650 + 460 * E.in(FLAT.clamp(era / 0.9));
  FLAT.poles(g, { y: gy + 40, off: X * 0.8 + pan * 0.6, h: 170, gap: 520 });
  FLAT.ground(g, { y: gy, off: X + pan });
  FLAT.motes(g, t, { alpha: 0.4 * (1 - FLAT.clamp(era * 1.5)), col: '#FFFFFF' });
  FLAT.speed(g, t, { alpha: 0.2 * FLAT.clamp(era - 1.5) * (1 - FLAT.clamp(era - 5.2)), n: 8, speed: 1400, len: 300 });
  for (const c of ERA) FLAT.whoosh(g, t, c, { col: era < 1.5 ? P.ink : '#FFFFFF', alpha: era < 1.5 ? 0.35 : 0.8 });
}

// ---------- текст ----------
function overlay(g, t, tn) {
  const c = tn.ink, T = (t0, s, o) => FLAT.title(g, t, t0, s, 72, 262, Object.assign({ col: c, size: 104 }, o));
  const S = (t0, s, o) => FLAT.words(g, t, t0, s, 72, 1424, Object.assign({ col: c, size: 84 }, o));
  if (t < 4.8) { T(0.05, '*150 лет назад', { size: 150, at: [0.05, 0.28, 0.5], t1: 4.8 }); S(2.45, 'Деревянный *ящик', { at: [2.45, 3.3], t1: 4.8 }); }
  else if (t < 7.75) T(4.9, 'Чтобы позвонить, крутили *ручку', { size: 96, at: [4.9, 5.2, 5.95, 6.55], t1: 7.75 });
  else if (t < 10.9) {
    T(7.2, 'Просили *телефонистку', { size: 96, at: [7.2, 7.8], t1: 10.9 });
    const [px, py] = handPos(t); FLAT.tag(g, t, 8.85, 560, 640, 'соединить', { center: true, to: [px - 560, py], t1: 10.9 });
  } else if (t < 14.25) {
    T(10.95, '*Дисковый телефон', { at: [10.95, 11.5], t1: 14.25 });
    S(12.2, 'Номер набирали *сами', { at: [12.2, 12.6, 13.35], t1: 14.25 });
    const out = E.in(FLAT.prog(t, 14.05, 14.25));
    DIAL.forEach(([t0], i) => {
      const s = FLAT.pop(t, t0 + 0.5) * (1 - out); if (s <= 0.01) return;
      g.save(); g.translate(440 + i * 100, 1310); g.scale(s, s); FLAT.box(g, -38, -46, 76, 92, { r: 14, fill: P.paper, lw: 5 }); FLAT.label(g, DIGITS[i], 0, 3, { size: 64, weight: 900, col: P.inkN }); g.restore();
    });
  } else if (t < 18.6) T(13.85, 'Первый *мобильный', { at: [13.85, 14.3], t1: 18.6 });
  else if (t < 22.85) T(18.65, 'В 90-е *уменьшились', { at: [18.65, 18.9, 20.4], t1: 22.85 });
  else if (t < 26.5) {
    T(22.9, '*Раскладушки', { size: 110, t1: 26.5 });
    FLAT.tag(g, t, 24.0, 72, 640, 'цветные экраны', { to: [472, 860], t1: 26.5 });
    FLAT.tag(g, t, 25.35, 1008, 1460, 'первые камеры', { align: 'right', to: [665, 1065], t1: 26.5 });
  } else if (t < 30.5) {
    T(26.55, '*Сегодня в кармане', { at: [26.55, 27.15, 27.4], t1: 30.5 });
    FLAT.words(g, t, 28.0, 'компьютер, камера, *интернет', 72, 500, { col: c, size: 60, at: [28.0, 28.65, 29.7], t1: 30.5 });
  } else {
    T(30.55, 'Что *дальше?', { size: 128, at: [30.55, 30.8] });
    S(32.9, 'станет *невидимым', { size: 92, at: [32.9, 33.75], hollow: true, hollowCol: P.goldL, dash: [], hollowW: 4 });
  }
}
function hudLayer(g, t, tn) {
  const c = tn.ink, dec = FLAT.track(t, [[0, 187], [10.9, 193], [15.15, 198], [18.85, 199], [22.85, 200], [26.6, 202]], { dur: 0.9 });
  const hin = E.out(FLAT.prog(t, 0.12, 0.5)); g.save(); g.globalAlpha *= hin; g.translate(0, -24 * (1 - hin));
  FLAT.hud(g, 'эпоха', 74, 140, { col: c, size: 22 });
  if (t < 30.5) FLAT.counter(g, 72, 196, dec, { digits: 3, size: 60, col: c, suffix: '0-е' });
  else {
    const old = t < 30.66, q = old ? 1 - E.in(FLAT.prog(t, 30.5, 30.66)) : FLAT.pop(t, 30.66, 3, 0.45);
    g.save(); g.translate(72, 196); g.scale(1, Math.max(0.02, q)); FLAT.counter(g, 0, 0, old ? '2020-е' : '20??', { size: 60, col: c }); g.restore();
  }
  FLAT.timeline(g, t, { at: [0].concat(ERA), x0: 430, x1: 1000, y: 196, col: c });
  g.restore();
}

function draw(t, k) {
  const g = FLAT.begin(t, k), era = FLAT.steps(t, ERA, { dur: 0.9 }), tn = FLAT.tone(era), cm = camAt(t);
  backdrop(g, t, era, travel(t), -cm.dx);
  g.save(); FLAT.cam(g, cm); world(g, t, tn); g.restore();
  overlay(g, t, tn);
  hudLayer(g, t, tn);
}

function sound(s) {
  const ev = [
    [0.05, 'pop_high', 0.16], [0.3, 'wood', 0.18], [2.45, 'pop_soft', 0.1], [3.4, 'woodblock', 0.14],
    [4.8, 'marimba_run', 0.12], [5.95, 'abacus', 0.12], [6.2, 'kalimba', 0.12, 1.3],
    [7.75, 'kalimba_run', 0.12], [8.85, 'click', 0.16],
    [10.9, 'marimba_run', 0.14], [12.7, 'tick', 0.12], [13.25, 'tick', 0.12], [13.8, 'tick', 0.12],
    [14.25, 'kalimba_run', 0.14], [14.5, 'pop_double', 0.12], [16.3, 'drop', 0.16], [16.55, 'counter', 0.1], [17.9, 'woodblock', 0.15],
    [18.6, 'marimba_run', 0.13], [20.4, 'bubble_down', 0.15], [21.9, 'notify', 0.15],
    [22.85, 'kalimba_run', 0.13], [23.2, 'toggle_on', 0.14], [23.8, 'sparkle', 0.12], [25.6, 'click', 0.16],
    [26.5, 'marimba_run', 0.14], [28.0, 'pop_soft', 0.13], [28.65, 'pop_high', 0.12], [29.7, 'bubble', 0.13],
    [30.5, 'magic', 0.15], [32.9, 'sparkle', 0.12], [33.85, 'success', 0.16],
  ];
  for (const [t, n, v, p] of ev) s.play(t, n, v, p ? { pitch: p } : undefined);
}
