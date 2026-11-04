// Демо «Как оплатить квартиру через телефон» — только STAGE и обычный canvas.
// Одна вещь происходит: палец находит «Платежи» → «Квартира» → сумма → «Оплатить» → кнопка сама становится «Оплачено», тост держится.
// Настоящие слова только там, где идёт история (5 строк), остальное — заглушки. Телефон занимает 2/3 кадра и уходит за нижний край.
const S = STAGE;
const PX = 110, PY = 640, PW = 860, PH = 1600;                     // телефон: уходит за низ кадра
const HEADS = [[0, 'Оплатить *квартиру|за минуту'], [6.6, 'Откройте|*Платежи'], [10.4, 'Сумма|подставится *сама'], [15.2, 'Нажмите|*Оплатить'], [19.0, '*Готово.|Чек в истории']];
const TAPS = [5.6, 9.4, 15.9];
const PATH = [[2.6, 820, 1560], [5.4, 300, 1240, .9], [9.2, 540, 1020, .9], [12.2, 700, 1450, .8], [15.7, 540, 1612, .8], [17.2, 760, 1740, .7]];
const CAM = [[0, 540, 1150, 1], [10.8, 540, 1240, 1.12, 1.1], [15.0, 540, 1300, 1.06, .9], [18.4, 540, 1150, 1, 1]];

function screenHome(g, t, scr) {          // главный экран банка: баланс, плитки, лента
  const x = scr.x, w = scr.w; let y = scr.top + 40;
  S.text(g, 'Счёт', x + 60, y, { size: 32, weight: 600, col: S.P.mute });
  S.amount(g, t, { v: 52400, x: x + 60, y: y + 110, size: 92, unit: '₽' });
  y += 200;
  const tiles = [['card', 'Карты'], ['house', 'Платежи'], ['send', 'Перевод'], ['more', 'Ещё']];
  tiles.forEach(([ic, s], i) => {
    const cx = x + 60 + 60 + i * ((w - 120 - 120) / 3), sel = s === 'Платежи' ? S.ap(t, 5.6, .25) : 0;
    S.tile(g, ic, cx, y + 70, 120, sel ? '#fff' : S.P.accent, sel ? S.P.accent : S.P.accentP);
    if (s === 'Платежи') S.text(g, s, cx, y + 170, { size: 30, weight: 650, al: 'center' }); else S.bar(g, cx - 50, y + 170, 100, 16);
  });
  y += 250;
  S.card(g, x + 40, y, w - 80, 520, { r: 36 });
  for (let i = 0; i < 4; i++) S.row(g, { x: x + 40, y: y + 10 + i * 125, w: w - 80, h: 125, avatar: ' ', avCol: S.P.bar2, subBar: true, bw: 240 + 60 * S.hash(i), val: null, div: i < 3 });
}
function screenPay(g, t, scr) {           // платежи: одна строка с настоящими словами
  const x = scr.x, w = scr.w; let y = S.navbar(g, scr, 'Платежи', { back: true });
  S.card(g, x + 40, y + 20, w - 80, 640, { r: 36 });
  const items = [['house', 'Квартира', 'ЖКХ · лицевой счёт'], ['bolt', null], ['drop', null], ['phone', null], ['wifi', null]];
  items.forEach(([ic, title, sub], i) => S.row(g, { x: x + 40, y: y + 30 + i * 124, w: w - 80, h: 124, icon: ic, title, sub, subBar: !sub, bw: 220 + 70 * S.hash(i + 3), chev: true, sel: title && S.ap(t, 9.4, .2) > 0, a: S.stag(t, 6.7, i, .06), div: i < 4 }));
}
function screenSum(g, t, scr) {           // квитанция: поле печатается, сумма набегает, кнопка меняется на «Оплачено»
  const x = scr.x, w = scr.w; let y = S.navbar(g, scr, 'Квартира', { back: true });
  S.field(g, { x: x + 50, y: y + 80, w: w - 100, label: 'Лицевой счёт', value: '7004 1298 56', t0: 11.0, cps: 11, focus: t < 12.4 }, t);
  y += 260;
  S.card(g, x + 50, y, w - 100, 300, { r: 32 });
  S.text(g, 'К оплате за октябрь', x + 90, y + 60, { size: 30, weight: 600, col: S.P.mute });
  S.amount(g, t, { v: 4860, at: 12.5, dur: 1.1, x: x + 90, y: y + 185, size: 104, unit: '₽' });
  S.bar(g, x + 90, y + 250, 300, 16);
  const done = S.ap(t, 16.2, .45);
  S.button(g, { x: x + 50, y: y + 360, w: w - 100, label: 'Оплатить', press: S.pr(t, 15.75, 16.15), done, doneLabel: 'Оплачено' });
  S.note(g, t, { x: x + 470, y: y + 120, tx: x + w - 200, ty: y - 40, s: 'по квитанции', t0: 13.2 });
}
const SC = [{ t0: 0, draw: (g, t, lt, scr) => screenHome(g, t, scr) }, { t0: 6.6, in: 'push', draw: (g, t, lt, scr) => screenPay(g, t, scr) }, { t0: 10.4, in: 'push', draw: (g, t, lt, scr) => screenSum(g, t, scr) }];

function draw(t, k) {
  const g = S.begin(t, k);
  S.ground(g);
  // заголовок: смена фразы — старая уходит, новая встаёт словами
  let hi = 0; while (hi < HEADS.length - 1 && t >= HEADS[hi + 1][0]) hi++;
  S.head(g, t, { s: HEADS[hi][1], t0: HEADS[hi][0] + (hi ? .05 : .2), t1: HEADS[hi + 1] ? HEADS[hi + 1][0] - .25 : null, y: 260, size: 104 });
  g.save();
  S.camera(g, t, CAM);
  const rise = S.spring(t, .1, .9);
  g.translate(0, (1 - rise) * 500);
  S.phone(g, { x: PX, y: PY, w: PW, h: PH, content: (g, scr) => { g.save(); S.run(g, t, SC.map(s => ({ t0: s.t0, in: s.in, draw: (g, tt, lt) => { S.fill(g, scr.x, scr.y, scr.w, scr.h, 0, S.P.sunk); s.draw(g, tt, lt, scr); } })), { pushW: scr.w }); g.restore(); } });
  S.toast(g, t, { x: 540, y: 760, s: 'Платёж прошёл', sub: '4 860 ₽ · ЖКХ', t0: 16.6 });
  S.pointer(g, t, { path: PATH, taps: TAPS, t1: 18.2 });
  g.restore();
  S.finish(g);
}
function sound(s) {
  s.play(0.3, 'pop_soft', .1); [5.6, 9.4].forEach(x => s.play(x, 'click', .14)); s.play(6.6, 'marimba_run', .1); s.play(10.4, 'marimba_run', .1);
  s.play(11.0, 'type', .08); s.play(12.5, 'counter', .1); s.play(13.2, 'pop_high', .08); s.play(15.9, 'click', .16); s.play(16.3, 'success3', .14); s.play(16.6, 'notify', .1);
}
