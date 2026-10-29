// Демо «Кофейня «Зерно»: итоги полугодия (пример отчёта)»: только SLIDES и обычный canvas.
// Мир: живой отчёт-презентация, который листает аналитик (курсор). Сквозной герой: стакан «Зерно» едет по данным.
const S = SLIDES, P = S.P, X0 = 64, X1 = 1016;
const M6 = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН'];

// ---------- 1. Обложка [0-3.6]
function pCover(g, t, lt) {
  S.bg(g, t);
  S.head(g, t, { t0: 0, label: 'ОТЧЁТ · ЯНВАРЬ-ИЮНЬ 2026', title: 'Кофейня@0.02', size: 112, lines: 1 });
  S.words(g, t, '*«Зерно»@0.3', X0 - 8, 396, { size: 236, lines: 1, min: 150, dur: .36 });
  S.words(g, t, 'Итоги@1.16 первого@1.71 *полугодия@2.26', X0, 676, { size: 64, lines: 1, col: P.ink2, kcol: P.ink, hl: 'under', wt: 700 });
  S.appear(g, t, .1, g => { S.card(g, X0, 820, 952, 680, { fill: P.tealP, line: null, r: 28 }); }, { kind: 'up', dist: 90, dur: .45 });
  S.appear(g, t, .3, g => S.cup(g, 540, 1300, 1.02, { steam: t }), { kind: 'pop', x: 540, y: 1300, dur: .5 });
  S.timeline(g, 160, 1395, 760, M6, { p: S.pr(t, .6, 1.25), on: S.kf([[1.15, -1], [2.75, 5]], t), size: 28 });
}

// ---------- 2. Выручка [3.6-8.8]: линия по месяцам, стакан едет по кончику
const REV = [.80, .86, .95, 1.05, 1.18, 1.30];
const RX = i => 205 + i * 148, RY = v => 1290 - (v - .6) / .8 * 600;
const RPTS = REV.map((v, i) => [RX(i), RY(v)]);
function pRevenue(g, t, lt) {
  S.bg(g, t);
  S.head(g, t, { t0: 3.62, label: '01 · ВЫРУЧКА', title: 'Выручка@3.72 *выросла@4.35', size: 108, lines: 1 });
  S.text(g, 'млн ₽ в месяц', X0, 488, 32, { col: P.mute, a: S.eo(S.pr(t, 3.9, 4.2)) });
  S.gridY(g, 150, 690, 860, 600, { min: .6, max: 1.4, step: .2, dec: 1, p: S.pr(t, 3.62, 4.4) });
  S.axisX(g, RPTS.map(q => q[0]), 1336, M6, { a: i => S.eo(S.pr(t, 3.8 + i * .05, 4.1 + i * .05)) });
  const p = S.kf([[4.75, 0], [7.35, 1]], t);
  const tip = S.line(g, RPTS, p, { fill: S.rgba(P.tealL, .35), base: 1290, lw: 8, dots: 12, hi: 5 });
  S.appear(g, t, 5.25, g => S.tip(g, '0,8', RPTS[0][0], RPTS[0][1] + 22, { dir: 'down', light: true, size: 44 }), { kind: 'down', dist: 16 });
  const dp = S.pr(t, 7.55, 8.0);
  if (dp > 0) {
    S.dline(g, RX(0), RY(.8), RX(0) + (RX(5) + 46 - RX(0)) * S.eo(dp), RY(.8), { col: P.mute, lw: 3 });
    S.arrow(g, RX(5) + 46, RY(.8), RX(5) + 46, RY(1.3) + 18, { p: S.eo(S.pr(t, 7.8, 8.2)), lw: 6 });
    S.text(g, '+0,5', RX(5) + 26, (RY(.8) + RY(1.3)) / 2 + 30, 48, { al: 'right', wt: 800, col: P.teal, a: S.eo(S.pr(t, 8.0, 8.3)) });
  }
  S.appear(g, t, 7.38, g => S.tip(g, '1,3 млн ₽', RPTS[5][0], RPTS[5][1] - 140, { size: 46 }), { kind: 'pop', x: RPTS[5][0], y: RPTS[5][1] - 170 });
  if (p > 0) S.cup(g, tip.x, tip.y - 22, .26, { steam: t });
  S.cursor(g, t, [[8.05, 700, 1180], [8.45, RPTS[5][0], RPTS[5][1], 'click'], [8.8, RPTS[5][0], RPTS[5][1]]]);
}

// ---------- 3. Утро [8.8-13.4]: рейтинг частей дня пересортировывается по росту
const HOURS = [
  { l: 'Утро · 7:00-11:00', a: 25, b: 40, hi: 1 },
  { l: 'Обед · 11:00-15:00', a: 34, b: 12 },
  { l: 'Вечер · 18:00-22:00', a: 27, b: 8 },
  { l: 'День · 15:00-18:00', a: 14, b: 5 }
];
function pHours(g, t, lt) {
  S.bg(g, t);
  S.head(g, t, { t0: 8.85, label: '02 · ВРЕМЯ СУТОК', title: 'Рост@9.2 дало@9.5 *утро@10.07', size: 108, lines: 1 });
  const sel = S.kf([[10.85, 0], [11.15, 1]], t);
  S.appear(g, t, 8.95, g => S.seg(g, X0, 456, 600, 84, ['ДОЛЯ', 'РОСТ'], sel), { kind: 'up', dist: 24 });
  S.hbars(g, t, X0, 588, 952, 160, HOURS, { t0: 9.05, sw: S.pr(t, 11.0, 11.75), maxA: 34, maxB: 40, barW: 700,
    fa: v => v + ' %', fb: v => '+' + v + ' %', hiK: S.pr(t, 11.05, 11.5) });
  S.appear(g, t, 11.62, g => S.kpi(g, X0, 1250, 952, 250, { dark: true, label: 'УТРО · ЯНВ-ИЮН', v: S.count(t, 11.65, 12.4, 0, 40), pre: '+', unit: '%', size: 150,
    icon: (g, x, y, w, h) => S.cup(g, x + w - 130, y + h - 34, .42, { sleeve: P.white, mark: P.teal, body: '#D9EEF1', shadeC: '#C3E1E6', lid: P.tealD, shadow: false }) }),
    { kind: 'pop', x: 540, y: 1375, dur: .4 });
  S.cursor(g, t, [[10.4, 860, 990], [10.85, X0 + 450, 500, 'click'], [11.4, 780, 640]]);
}

// ---------- 4. Средний чек [13.4-19.0]: ползунок янв→июн пересчитывает чек
function pCheck(g, t, lt) {
  S.bg(g, t);
  S.head(g, t, { t0: 13.45, label: '03 · СРЕДНИЙ ЧЕК', title: 'Средний@13.52 *чек@14.0', size: 108, lines: 1 });
  const f = S.kf([[16.3, 0], [17.3, 1]], t);
  S.appear(g, t, 13.6, g => { const kx = S.slider(g, 150, 566, 780, f, { a: 'ЯНВ', b: 'ИЮН', ticks: 5 }); S.cup(g, kx, 532, .21, { steam: t }); }, { kind: 'up', dist: 24 });
  S.receipt(g, t, 160, 680, 760, { t0: 13.75, head: '«ЗЕРНО»', sub: f > .5 ? 'ИЮНЬ' : 'ЯНВАРЬ', rowH: 92, size: 44, totH: 262,
    rows: [{ l: 'Капучино', r: '210', t: 14.05 }, { l: 'Круассан', r: '110', t: 14.35 }, { l: 'Сырник', r: '70', t: 16.95, hi: true }],
    total: { l: 'ИТОГО', draw: (g, xr, yb) => S.odo(g, 320 + 70 * f, xr, yb, 160, { al: 'right', unit: '₽', col: f > .98 ? P.teal : P.ink }) } });
  S.appear(g, t, 17.35, g => S.chip(g, '+70 ₽', 196, 1318, { size: 36, fill: P.teal, col: P.white, caps: false }), { kind: 'pop', x: 270, y: 1318 });
  S.cursor(g, t, [[15.75, 640, 960], [16.25, 150, 566, 'down'], [17.3, 930, 566, 'up'], [17.75, 990, 700]]);
}

// ---------- 5. Лояльность [19.0-23.4]: 6 из 10 стаканов-гостей «проштампованы»
function pLoyal(g, t, lt) {
  S.bg(g, t);
  S.head(g, t, { t0: 18.72, label: '04 · ЛОЯЛЬНОСТЬ', title: 'Программа@18.78 | *лояльности@19.7', size: 108 });
  for (let i = 0; i < 10; i++) {
    const x = 150 + (i % 5) * 195, y = 830 + Math.floor(i / 5) * 280, st = 20.7 + i * .13;
    S.appear(g, t, 18.76 + i * .04, g => S.cup(g, x, y, .52, { ghost: 1 }), { kind: 'up', dist: 40 });
    if (i < 6) { S.appear(g, t, st, g => S.cup(g, x, y, .52), { kind: 'stamp', x, y: y - 100, dur: .26 }); S.ripple(g, t, st + .1, x, y - 100); }
  }
  S.appear(g, t, 21.55, g => {
    S.stack(g, X0, 1196, 952, 128, [{ v: 60, col: P.teal, l: '60 %' }, { v: 40, col: P.grid }], S.pr(t, 21.6, 22.3), { size: 66 });
    S.text(g, 'вернулись', X0, 1370, 40, { col: P.teal, wt: 800, a: S.eo(S.pr(t, 22.2, 22.5)) });
    S.text(g, 'не вернулись', X1, 1370, 40, { col: P.mute, wt: 700, al: 'right', a: S.eo(S.pr(t, 22.3, 22.6)) });
  }, { kind: 'up', dist: 30 });
}

// ---------- 6. Закупка зерна [23.4-27.8]: цепочка поставок, посредники уходят
const NODES = [{ l: 'Ферма', y: 588, r: '800 ₽/кг' }, { l: 'Импортёр', y: 788 }, { l: 'Оптовик', y: 988 }, { l: 'Кофейня «Зерно»', y: 1188 }];
const NH = 124;
function pBeans(g, t, lt) {
  S.bg(g, t);
  S.head(g, t, { t0: 23.4, label: '05 · ЗАКУПКА ЗЕРНА', title: 'Зерно@23.48 *дешевле@24.96', size: 108, lines: 1 });
  const sel = S.kf([[25.95, 0], [26.25, 1]], t), c = S.eio(S.pr(t, 26.2, 26.8));
  S.appear(g, t, 23.42, g => S.seg(g, X0, 452, 952, 84, ['ЧЕРЕЗ ПОСРЕДНИКОВ', 'НАПРЯМУЮ'], sel, { size: 26 }), { kind: 'up', dist: 24 });
  const dist = 90 * Math.min(t, 26.4) + 260 * Math.max(0, t - 26.4);
  const fa = S.eo(S.pr(t, 24.0, 24.4));
  S.flow(g, dist, [[150, 600], [150, 1290]], 9, (g, x, y, a, i, al) => S.bean(g, x, y, 15, 90 + i * 40, { a: al * fa }), { speed: 1, fade: 30 });
  for (let i = 0; i < 3; i++) {
    const y0 = NODES[i].y + NH + 6, y1 = NODES[i + 1].y - 6, mid = i > 0 && i < 3, a = S.eo(S.pr(t, 23.75 + i * .1, 24.05 + i * .1)) * (1 - c);
    if (a <= 0) continue;
    g.save(); g.globalAlpha = a; S.arrow(g, 150, y0, 150, y1, { dash: [9, 8], lw: 4, col: P.faint, head: 14 });
    S.badge(g, i + 1, 150, (y0 + y1) / 2 - 4, 19); S.chip(g, '+200 ₽', 196, (y0 + y1) / 2 - 4, { size: 30, caps: false, fill: P.page, line: P.line, col: P.ink2 }); g.restore();
  }
  const dp = S.pr(t, 26.45, 26.95);
  if (dp > 0) {
    S.arrow(g, 150, NODES[0].y + NH + 6, 150, NODES[3].y - 6, { p: S.eo(dp), lw: 7, head: 20 });
    S.appear(g, t, 26.8, g => S.chip(g, '+100 ₽ · доставка', 196, 948, { size: 34, caps: false, fill: P.teal, col: P.white }), { kind: 'left', dist: 30 });
  }
  NODES.forEach((nd, i) => {
    const last = i === 3, mid = i === 1 || i === 2, ox = mid ? 300 * c : 0, al = mid ? 1 - c : 1;
    if (al <= 0) return;
    S.appear(g, t, 23.45 + i * .08, g => {
      g.globalAlpha *= al; g.translate(ox, 0);
      S.card(g, X0, nd.y, 952, NH, { fill: last ? P.teal : P.page, line: last ? null : P.line, r: 14, shadow: last ? .8 : 0 });
      S.circle(g, 150, nd.y + NH / 2, 50, last ? P.tealD : P.tealP);
      if (i === 0) S.sprout(g, 150, nd.y + NH / 2 - 4, .7); else if (i === 1) S.ship(g, 150, nd.y + NH / 2 - 2, .62);
      else if (i === 2) S.depot(g, 150, nd.y + NH / 2 - 2, .62); else S.cup(g, 150, nd.y + NH / 2 + 34, .17, { sleeve: P.white, mark: P.teal, lid: P.white, body: '#CFE9ED', shadeC: '#BCDDE2', shadow: false });
      S.text(g, nd.l, 232, nd.y + NH / 2 + 2, 44, { wt: 800, col: last ? P.white : P.ink, max: 430 });
      if (nd.r) S.text(g, nd.r, 990, nd.y + NH / 2 + 2, 42, { wt: 800, al: 'right', col: P.ink });
      if (last) S.odo(g, S.kf([[26.65, 1200], [27.3, 900]], t), 990, nd.y + NH / 2 + 17, 46, { al: 'right', unit: '₽/кг', col: P.white, ucol: P.onDark, us: .62 });
    }, { kind: 'left', dist: 40 });
  });
  S.appear(g, t, 27.25, g => S.chip(g, '−25 %', 990, NODES[3].y, { al: 'right', size: 34, caps: false, fill: P.slate, col: P.white }), { kind: 'pop', x: 920, y: NODES[3].y });
  S.cursor(g, t, [[25.5, 700, 760], [25.95, 790, 494, 'click'], [26.5, 900, 700]]);
}

// ---------- 7. Прибыль [27.8-31.6]: обзор всех страниц, потом Санки и итоговое число
function pProfit(g, t, lt) {
  S.bg(g, t);
  S.head(g, t, { t0: 28.3, label: '06 · ПРИБЫЛЬ', title: 'Прибыль@28.4 | за@28.6 *полгода@28.75', size: 108 });
  S.appear(g, t, 28.62, g => S.kpi(g, X0, 556, 952, 262, { pale: true, label: 'ПРИБЫЛЬ · ЯНВ-ИЮН', v: S.count(t, 29.45, 30.55, 0, 900000), va: S.eo(S.pr(t, 29.4, 29.6)), step: 1000, unit: '₽', size: 150,
    icon: (g, x, y, w, h) => S.cup(g, x + w - 112, y + h - 30, .5, { steam: t, shadow: false }) }), { kind: 'up', dist: 30 });
  S.text(g, 'Выручка 6,1 млн ₽ →', X0, 890, 34, { wt: 800, col: P.ink, a: S.eo(S.pr(t, 28.4, 28.7)) });
  S.sankey(g, t, { x0: X0, y0: 930, h: 500, nw: 36, x1: 540, gap: 16, size: 44, p: S.pr(t, 28.45, 29.45), hiK: S.pr(t, 29.5, 30.0),
    items: [{ l: 'Прибыль', v: .9, hi: 1 }, { l: 'Персонал', v: 2.0 }, { l: 'Продукты', v: 1.6 }, { l: 'Аренда', v: 1.2 }, { l: 'Прочее', v: .4 }] });
  const cur = S.cursor(g, t, [[30.75, 960, 1230], [31.25, 905, 1478, 'click'], [31.6, 905, 1478]]);
  S.appear(g, t, 30.85, g => S.button(g, 'План на осень', X1, 1478, { al: 'right', hover: S.pr(t, 31.05, 31.2), press: cur ? cur.press : 0 }), { kind: 'up', dist: 20 });
}

// ---------- 8. План [31.6-35.0]: две карточки и осенняя шкала
function pPlan(g, t, lt) {
  S.bg(g, t);
  S.head(g, t, { t0: 31.6, label: '07 · СЕНТЯБРЬ-НОЯБРЬ', title: 'План@31.66 на@31.93 *осень@32.14', size: 108, lines: 1 });
  const CARDS = [{ y: 450, t0: 32.6, ck: 33.1, l: 'Вторая точка', m: 'СЕНТЯБРЬ', ic: 'store' }, { y: 826, t0: 33.7, ck: 34.15, l: 'Доставка', m: 'ОКТЯБРЬ', ic: 'scooter' }];
  CARDS.forEach(c => S.appear(g, t, 31.75, g => { g.save(); g.strokeStyle = P.line; g.lineWidth = 3; g.setLineDash([14, 10]); S.rr(g, X0, c.y, 952, 344, 18); g.stroke(); g.restore(); }, { kind: 'fade', out: c.t0 + .15 }));
  CARDS.forEach(c => S.appear(g, t, c.t0, g => {
    S.card(g, X0, c.y, 952, 344, { r: 18, shadow: .7 });
    g.fillStyle = P.tealP; S.rr(g, X0 + 24, c.y + 24, 310, 296, 12); g.fill();
    if (c.ic === 'store') S.store(g, X0 + 179, c.y + 176, 2.3); else S.scooter(g, X0 + 189, c.y + 176, 1.95, { t });
    S.text(g, c.l, 382, c.y + 128, 64, { wt: 800, max: 520 });
    S.chip(g, c.m, 382, c.y + 226, { size: 30, fill: P.page, line: P.teal });
    S.check(g, X1 - 70, c.y + 70, 34, S.pr(t, c.ck, c.ck + .45));
  }, { kind: 'up', dist: 50, dur: .38 }));
  S.timeline(g, 180, 1380, 720, ['СЕН', 'ОКТ', 'НОЯ'], { p: S.pr(t, 31.8, 32.4), on: S.kf([[33.1, -1], [33.4, 0], [34.15, 0], [34.45, 1]], t), r: 16, size: 28 });
  const cx = S.kf([[34.1, 180], [34.5, 540]], t);
  S.appear(g, t, 33.1, g => S.cup(g, cx, 1352, .3, { steam: t }), { kind: 'pop', x: 180, y: 1300 });
}

const PAGES = [
  { t0: 0, draw: pCover },
  { t0: 3.6, draw: pRevenue, tr: 'push' },
  { t0: 8.8, draw: pHours, tr: 'drill', from: [872, 681, 160, 160] },
  { t0: 13.4, draw: pCheck, tr: 'push' },
  { t0: 19.0, draw: pLoyal, tr: 'cut', settle: .06 },
  { t0: 23.4, draw: pBeans, tr: 'up' },
  { t0: 27.8, draw: pProfit, tr: 'overview', ovTitle: 'ЯНВАРЬ-ИЮНЬ · 6 СТРАНИЦ' },
  { t0: 31.6, draw: pPlan, tr: 'drill', from: [672, 1450, 350, 69] }
];
const PILLS = [
  [4.9, 8.55, 'с@4.99 *800_тыс.@5.2 до@6.26 *1,3_млн_₽@6.6'],
  [9.98, 13.2, 'утренние_часы:@10.07 *+40_%@11.6'],
  [15.1, 18.8, 'чек:@15.18 *320_₽@15.2 →@16.4 *390_₽@16.64'],
  [20.6, 23.2, 'вернула@20.7 *6_из_10@21.38 гостей@22.51'],
  [25.58, 27.6, 'за_счёт@25.68 *прямых_поставок@26.16'],
  [28.86, 31.05, 'за_полгода:@28.95 *900_тыс._₽@29.5'],
  [32.6, 35.2, '*вторая_точка@32.69 и@33.73 *доставка@33.94']
];
const STATUS = [[0, 'ФАКТ · ЯНВ-ИЮН'], [31.75, 'ПЛАН · ОСЕНЬ', 1]];

function draw(t, k) {
  const g = S.begin(t, k);
  const d = S.deck(g, t, PAGES);
  S.hud(g, t, { page: d.i + 1, total: PAGES.length, t0: d.t0, t1: d.t1, brand: 'Кофейня «Зерно» · отчёт', status: STATUS, src: 'Пример отчёта · данные условные', a: 1 - d.ov });
  S.pill(g, t, PILLS);
}

function sound(s) {
  const E = [
    [0.05, 'pop_high', .12], [0.32, 'marimba', .14], [1.2, 'kalimba_run', .1], [2.3, 'pop_soft', .1],
    [3.6, 'marimba_run', .14], [5.25, 'pop_soft', .1], [7.4, 'notify', .14], [8.45, 'click', .15], [8.8, 'kalimba_run', .12],
    [10.85, 'toggle_on', .14], [11.62, 'pop_double', .14],
    [13.4, 'marimba_run', .14], [13.8, 'type', .12], [16.25, 'click', .12], [16.45, 'odometer', .12], [16.95, 'pop_soft', .1], [17.35, 'pop_high', .12],
    [19.0, 'woodblock', .16], [20.7, 'tally', .13], [21.6, 'pop_double', .12],
    [23.4, 'marimba_run', .14], [25.95, 'toggle_on', .14], [26.25, 'bubble_down', .12], [26.7, 'odometer', .11], [27.25, 'pop_high', .12],
    [27.8, 'kalimba_run', .14], [28.45, 'drop', .12], [29.45, 'counter', .14], [30.6, 'success', .14],
    [31.25, 'click', .14], [31.6, 'marimba_run', .13], [32.6, 'pop_soft', .12], [33.1, 'key_soft', .1], [33.7, 'pop_soft', .12], [34.15, 'success3', .15]
  ];
  E.forEach(([t, n, v]) => s.play(t, n, v));
}
