// UIM: «Как записать маму к врачу». 120 BPM, склейки на долях: 3.5, 7.5, 11.5, 15.5, 19.5.
const U = UIM, C = U.C;
const CUTS = [0, 3.5, 7.5, 11.5, 15.5, 19.5, 999];
const MODE = ['dark', 'light', 'dark', 'light', 'dark', 'brand'];
const STEPS = [5, 9, 13, 16];                      // профиль, врач, время, подтверждение
const CLK = [2.5, 5, 6, 9, 13, 14, 16, 20.5];
const SANS = '"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif';
const MONO = '"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace';
const GREEN = '#1FAF6A';

function press(t, a) { const c = U.clickPh(t, CLK); return t >= a - 0.05 && t < a + 0.45 && c >= 0 ? 1 - c : 0; }
function F(g, x, y, w, h, r, c) { g.fillStyle = c; U.rr(g, x, y, w, h, r); g.fill(); }
function tx(g, s, x, y, sz, col, o) {
  o = o || {}; const fam = o.m ? MONO : SANS, w = o.w || 700, mx = o.max || 900; let f = sz;
  g.font = w + ' ' + f + 'px ' + fam;
  while (f > 30 && g.measureText(s).width > mx) { f -= 2; g.font = w + ' ' + f + 'px ' + fam; }
  g.fillStyle = col; g.textAlign = o.a || 'left'; g.textBaseline = 'middle'; g.fillText(s, x, y);
}

// Сквозная героиня: мама в очках и сиреневой кофте, дышит и моргает
function mom(g, cx, cy, s, t) {
  const b = 1 + 0.015 * Math.sin(t * 3.1);
  g.save(); g.translate(cx, cy); g.scale(s, s * b);
  F(g, -95, 40, 190, 150, 75, C.vi); F(g, -28, 38, 56, 34, 17, '#fff');
  F(g, -78, -112, 156, 170, 78, '#CFC8DD'); F(g, -30, -152, 60, 60, 30, '#CFC8DD');
  F(g, -60, -92, 120, 134, 60, '#F3CDB0'); F(g, -62, -104, 124, 46, 23, '#CFC8DD');
  const bl = (t % 3.7) < 0.12 ? 0.15 : 1;
  F(g, -36, -22 + 9 * (1 - bl), 14, 18 * bl, 7, C.ink); F(g, 22, -22 + 9 * (1 - bl), 14, 18 * bl, 7, C.ink);
  g.strokeStyle = C.ink; g.lineWidth = 5;
  U.rr(g, -52, -34, 44, 36, 14); g.stroke(); U.rr(g, 8, -34, 44, 36, 14); g.stroke();
  g.beginPath(); g.moveTo(-8, -18); g.lineTo(8, -18); g.stroke();
  F(g, -46, 8, 22, 12, 6, '#F4A3A8'); F(g, 24, 8, 22, 12, 6, '#F4A3A8');
  g.beginPath(); g.arc(0, 8, 16, 0.2, Math.PI - 0.2); g.stroke();
  g.restore();
}
// Врач: белый халат, фонендоскоп
function doc(g, cx, cy, s) {
  g.save(); g.translate(cx, cy); g.scale(s, s);
  F(g, -90, 40, 180, 140, 70, '#fff'); g.strokeStyle = C.vl; g.lineWidth = 5; U.rr(g, -90, 40, 180, 140, 70); g.stroke();
  F(g, -24, 40, 48, 60, 14, C.vi);
  F(g, -58, -90, 116, 130, 58, '#E8B896'); F(g, -62, -104, 124, 50, 25, '#3A2E5C');
  F(g, -32, -24, 14, 18, 7, C.ink); F(g, 18, -24, 14, 18, 7, C.ink);
  g.strokeStyle = C.ink; g.beginPath(); g.arc(0, 6, 14, 0.3, Math.PI - 0.3); g.stroke();
  g.strokeStyle = C.vi; g.lineWidth = 6; g.beginPath(); g.arc(0, 70, 40, 0.2, Math.PI - 0.2); g.stroke();
  g.restore();
}
function cnt(g, t, dark, a0) { U.counter(g, 540, 1590, 'шаг', U.countAt(t, STEPS), { dark, p: U.eo((t - a0) / 0.25), bump: U.bumpAt(t, STEPS) }); }

// 1. Хук: заголовок, карточка мамы влетает, курсор жмёт «Записать к врачу»
function s1(g, t, S) {
  U.head(g, 'Запишите маму|к врачу', { y: 330, t0: -0.1, t, t1: S.t1, key: 'маму', col: '#fff', kc: C.vl, size: 120 });
  const p = U.spr(t - 0.3, 11), wy = 600 + (1 - p) * 1300;
  g.save(); g.translate(540, wy + 400); g.rotate((1 - p) * 0.1); g.translate(-540, -wy - 400);
  U.card(g, 190, wy, 700, 800, 36, '#fff');
  mom(g, 540, wy + 250, 1.3, t);
  tx(g, 'Мама, 67 лет', 540, wy + 560, 56, C.ink, { a: 'center', w: 800, max: 600 });
  U.button(g, 540, wy + 690, 'Записать к врачу', { size: 42, h: 96, press: press(t, 2.5) });
  g.restore();
  U.tip(g, 400, wy + 840, 'Займёт минуту', U.spr(t - 2.65), 70, 1010);
  const q = U.path(t, [[0.4, 1080, 1800], [2.1, 640, 1300], [2.5, 640, 1300], [3.5, 660, 1320]]);
  U.cursor(g, q[0], q[1], t, CLK);
}

// 2. Профиль: выбор «Мама» в семье, карточка с полисом, «Далее»
function s2(g, t, S) {
  U.head(g, 'Профиль мамы', { y: 300, t0: 3.5, t, t1: S.t1, key: 'мамы', col: C.ink, kc: C.vi, size: 116 });
  const y0 = 470 + U.slideY(t, 3.6, 160), NM = ['Я', 'Мама', 'Сын'];
  for (let j = 0; j < 3; j++) {
    const a = U.eo((t - 3.7 - j * 0.1) / 0.25); if (a <= 0) continue;
    const x = 150 + j * 270, on = t >= 5 && j === 1;
    g.globalAlpha = a; F(g, x, y0, 240, 96, 48, on ? C.vi : '#fff');
    if (!on) { g.strokeStyle = C.vl; g.lineWidth = 4; U.rr(g, x, y0, 240, 96, 48); g.stroke(); }
    tx(g, NM[j], x + 120, y0 + 48, 46, on ? '#fff' : C.ink, { a: 'center', w: 800, max: 200 }); g.globalAlpha = 1;
  }
  if (t >= 5.05) {
    const cy = 620 + U.slideY(t, 5.05, 300);
    g.globalAlpha = U.cl((t - 5.05) / 0.2, 0, 1);
    U.card(g, 120, cy, 840, 700, 36, '#fff'); mom(g, 290, cy + 220, 1, t);
    tx(g, 'Ирина Петровна', 420, cy + 170, 52, C.ink, { w: 800, max: 500 });
    tx(g, '67 лет', 420, cy + 245, 46, C.vi);
    tx(g, 'полис 7714 0291', 180, cy + 430, 44, C.ink, { m: 1, max: 720 });
    U.button(g, 540, cy + 580, 'Далее', { size: 42, h: 96, press: press(t, 6) });
    g.globalAlpha = 1;
  } else { g.globalAlpha = U.eo((t - 3.9) / 0.3); U.slot(g, 120, 620, 840, 700); g.globalAlpha = 1; }
  const q = U.path(t, [[3.5, 1000, 1700], [4.6, 560, 530], [5, 560, 530], [5.6, 580, 1210], [6, 580, 1210], [7.5, 720, 1400]]);
  U.cursor(g, q[0], q[1], t, CLK); cnt(g, t, false, 4.85);
}

// 3. ИИ: жалоба печатается, кнопка «Подобрать», появляется врач
function s3(g, t, S) {
  U.head(g, 'Врач от ИИ', { y: 300, t0: 7.5, t, t1: S.t1, key: 'ИИ', col: '#fff', kc: C.vl, size: 116 });
  const y0 = 500 + U.slideY(t, 7.5, 140);
  U.card(g, 90, y0, 900, 800, 36, '#fff');
  U.aiBadge(g, 210, y0 + 74, 'ИИ', 1);
  U.button(g, 760, y0 + 74, 'Подобрать', { icon: true, size: 36, h: 72, press: press(t, 9) });
  g.fillStyle = C.paper; U.rr(g, 130, y0 + 140, 820, 260, 24); g.fill();
  U.typeText(g, 'Колено болит неделю, маме 67 лет', 170, y0 + 215, 740, { t, t0: 7.9, size: 48 });
  if (t >= 9.1) {
    const a = U.spr(t - 9.1), s = 0.6 + 0.4 * a;
    g.save(); g.translate(540, y0 + 590); g.scale(s, s); g.translate(-540, -y0 - 590); g.globalAlpha = U.cl((t - 9.1) / 0.2, 0, 1);
    doc(g, 250, y0 + 570, 0.9);
    tx(g, 'Ортопед', 380, y0 + 540, 60, C.ink, { w: 800, max: 560 });
    tx(g, '900 м от дома', 380, y0 + 620, 44, C.vi, { m: 1, max: 560 });
    g.restore(); g.globalAlpha = 1;
  } else U.slot(g, 130, y0 + 440, 820, 300);
  const q = U.path(t, [[7.5, 980, 1700], [8.6, 780, 585], [9, 780, 585], [9.8, 880, 1420], [11.5, 860, 1440]]);
  U.cursor(g, q[0], q[1], t, CLK); cnt(g, t, true, 7.5);
}

// 4. Время: день и слот приёма, занятые слоты пунктиром
function s4(g, t, S) {
  U.head(g, 'Удобное время', { y: 300, t0: 11.5, t, t1: S.t1, key: 'время', col: C.ink, kc: C.vi, size: 116 });
  const y0 = 470 + U.slideY(t, 11.5, 160);
  U.card(g, 90, y0, 900, 820, 36, '#fff');
  tx(g, 'Май', 150, y0 + 80, 46, C.ink, { w: 800 });
  const DW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'];
  for (let j = 0; j < 5; j++) {
    const x = 129 + j * 168, on = t >= 13 && j === 2, a = U.eo((t - 11.7 - j * 0.06) / 0.25);
    g.globalAlpha = a; F(g, x, y0 + 140, 150, 130, 28, on ? C.vi : C.paper);
    tx(g, DW[j], x + 75, y0 + 180, 36, on ? '#fff' : C.ink, { a: 'center', max: 130 });
    tx(g, String(12 + j), x + 75, y0 + 230, 48, on ? '#fff' : C.ink, { a: 'center', w: 800, max: 130 }); g.globalAlpha = 1;
  }
  const TM = ['09:00', '10:30', '12:00', '14:30', '16:00', '17:30'], BUSY = [0, 3];
  if (t < 13.05) for (let j = 0; j < 6; j++) U.slot(g, 135 + (j % 3) * 280, y0 + 340 + Math.floor(j / 3) * 130, 250, 100);
  if (t < 14.2) U.slot(g, 150, y0 + 650, 780, 100);
  if (t >= 13.05) for (let j = 0; j < 6; j++) {
    const x = 135 + (j % 3) * 280, y = y0 + 340 + Math.floor(j / 3) * 130, a = U.spr(t - 13.05 - j * 0.05);
    g.save(); g.translate(x + 125, y + 50); g.scale(a, a); g.translate(-x - 125, -y - 50);
    if (BUSY.includes(j)) { U.slot(g, x, y, 250, 100); tx(g, TM[j], x + 125, y + 50, 44, '#A9A3BF', { m: 1, a: 'center' }); }
    else { const on = t >= 14 && j === 1; F(g, x, y, 250, 100, 50, on ? C.vi : '#fff'); g.strokeStyle = C.vl; g.lineWidth = 4; U.rr(g, x, y, 250, 100, 50); g.stroke(); tx(g, TM[j], x + 125, y + 50, 44, on ? '#fff' : C.ink, { m: 1, a: 'center' }); }
    g.restore();
  }
  if (t >= 14.2) { g.globalAlpha = U.eo((t - 14.2) / 0.25); tx(g, 'Ортопед, ср 14, 10:30', 540, y0 + 700, 44, C.vi, { m: 1, a: 'center', max: 780 }); g.globalAlpha = 1; }
  const q = U.path(t, [[11.5, 980, 1700], [12.6, 560, 690], [13, 560, 690], [13.6, 560, 880], [14, 560, 880], [15.5, 800, 1150]]);
  U.cursor(g, q[0], q[1], t, CLK); cnt(g, t, false, 11.5);
}

// 5. Талон: подтверждение, зелёное «Готово», уведомление маме
function s5(g, t, S) {
  U.head(g, 'Запись готова', { y: 300, t0: 15.5, t, t1: S.t1, key: 'готова', col: '#fff', kc: GREEN, size: 116 });
  const y0 = 480 + U.slideY(t, 15.5, 160);
  U.card(g, 140, y0, 800, 720, 36, '#fff');
  doc(g, 280, y0 + 190, 0.8);
  tx(g, 'Ортопед', 400, y0 + 150, 60, C.ink, { w: 800, max: 500 });
  tx(g, 'для мамы', 400, y0 + 225, 46, C.vi, { max: 500 });
  tx(g, 'ср 14 мая, 10:30', 200, y0 + 390, 44, C.ink, { m: 1, max: 680 });
  tx(g, 'ул. Садовая, 12', 200, y0 + 460, 44, C.ink, { m: 1, max: 680 });
  if (t < 16.05) U.button(g, 540, y0 + 610, 'Подтвердить', { size: 42, h: 96, press: press(t, 16) });
  else {
    const a = U.spr(t - 16.05); g.save(); g.translate(540, y0 + 610); g.scale(a, a);
    F(g, -200, -48, 400, 96, 48, GREEN); tx(g, 'Готово', 0, 0, 46, '#fff', { a: 'center', w: 800 }); g.restore();
  }
  U.toast(g, 1330, 'М', 'Маме придёт напоминание', 16.8, t);
  const q = U.path(t, [[15.5, 980, 1700], [15.9, 560, 1100], [16, 560, 1100], [16.8, 920, 1050], [19.5, 930, 1060]]);
  U.cursor(g, q[0], q[1], t, CLK); cnt(g, t, true, 15.5);
}

// 6. Финал: бренд, строка, карточка мамы с временем, штамп, адрес
function s6(g, t, S) {
  const wy = 690 + (1 - U.eo((t - 19.8) / 0.45)) * 1300;
  if (t >= 19.8) {
    U.card(g, 190, wy, 700, 540, 36, '#fff'); mom(g, 360, wy + 280, 1, t);
    tx(g, 'Ср 14 мая', 500, wy + 230, 56, C.ink, { w: 800, max: 360 });
    tx(g, '10:30', 500, wy + 310, 52, C.vi, { m: 1, max: 360 });
  }
  U.endCard(g, t, 19.55, { brand: 'Помощник AI', line: 'Мама записана', key: 'записана', stamp: 'ЗАПИСАНО', st: 1.45 });
  const q = U.path(t, [[19.5, 1000, 1750], [20.3, 620, 1000], [20.5, 620, 1000], [21.2, 720, 1160], [26, 730, 1170]]);
  U.cursor(g, q[0], q[1], t, CLK);
}

const SC = [s1, s2, s3, s4, s5, s6];

function draw(t, k) {
  const g = k.g; U.tex();
  const S = U.scene(t, CUTS);
  U.bg(g, t, MODE[S.i]);
  g.save(); U.cam(g, S.u, t); SC[S.i](g, t, S); g.restore();
  if (S.i > 0) U.flash(g, S.u);
}

function sound(s) {
  U.sfx(s, [
    [0, 'drop', 0.2], [0.3, 'pop_high', 0.14], [0.6, 'wood', 0.1], [2.5, 'click', 0.16, 1.0], [2.65, 'pop_soft', 0.12],
    [3.5, 'marimba_run', 0.16], [3.8, 'bubble', 0.1], [5, 'click', 0.14, 1.1], [5.1, 'pop_soft', 0.12], [6, 'click', 0.14, 1.2],
    [7.5, 'kalimba_run', 0.16], [7.9, 'type', 0.1], [9, 'click', 0.15, 1.3], [9.1, 'magic', 0.16], [9.4, 'sparkle', 0.12],
    [11.5, 'marimba_run', 0.16], [11.8, 'pop_soft', 0.1], [13, 'click', 0.14, 1.4], [13.1, 'bubble', 0.1], [14, 'click', 0.14, 1.5], [14.25, 'kalimba', 0.1],
    [15.5, 'kalimba_run', 0.16], [16, 'click', 0.15, 1.6], [16.08, 'success', 0.15], [16.8, 'notify', 0.13],
    [19.5, 'fanfare_soft', 0.18], [19.8, 'pop_high', 0.12], [20.5, 'click', 0.14],
    [21, 'woodblock', 0.18], [21.05, 'success3', 0.14], [21.5, 'pop_double', 0.12]
  ]);
}