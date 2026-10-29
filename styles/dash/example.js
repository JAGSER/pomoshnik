// Демо «Семейный бюджет: куда уходят деньги» — только DASH и обычный canvas.
// Мир: живой дашборд семьи, деньги = светящиеся частицы. Сквозной герой: кольцо-кошелёк (из центра в слот шапки и обратно).
const { P } = DASH, S = DASH.SLOT, RAD = Math.PI / 180;
const CATS = [['Жильё', .30, P.orange], ['Продукты', .25, P.teal], ['Прочее', .15, P.cyan], ['Транспорт', .12, P.amber], ['Подписки', .10, P.red], ['Кафе', .08, P.violet]];
const RING = [[0, [540, 1190, 290]], [3.4, [S.x, S.y, S.r], .7], [26.2, [540, 1010, 268], .75], [31.0, [S.x, S.y, S.r], .7]];
const REST = [[0, 0], [5.65, 120000, 1.25], [10.85, 84000, .9], [13.71, 54000, .8], [15.5, 44400, .7], [20.13, 32400, .8], [22.76, 38400, .7]];
const STATUS = [[0, 'LIVE', P.blue], [3.4, 'Доход', P.teal], [7.6, 'Расходы', P.amber], [16.8, 'Подписки', P.amber], [20.13, 'Утечка', P.red],
  [21.4, 'Экономия', P.teal], [26.2, 'Правило', P.blue], [30.18, 'Баланс', P.teal], [31, 'Поиск', P.blue], [34.27, '3 утечки', P.red]];
const ROWS = [['play', 'Кино', 'подписка', 399, P.violet], ['music', 'Музыка', 'подписка', 299, P.blue], ['game', 'Игры', 'подписка', 702, P.cyan],
  ['cup', 'Кофе с собой', '22 раза', 5500, P.amber], ['bag', 'Доставка', '8 раз', 5100, P.orange]];
const st = (keys, t, d = .7) => DASH.step(keys, t, d);
const drain = t => 1 - DASH.eio(DASH.pr(t, .55, 3.15));
const catAt = f => { let a = 0; for (const c of CATS) { a += c[1]; if (f <= a) return c[2]; } return P.violet; };

const SC = [
  { t0: 0, draw: (g, lt) => { // КУДА? кольцо-бюджет раскручивается, деньги разлетаются
    DASH.words(g, lt, { s: 'Куда@-0.12', y: 560, size: 250 });
    DASH.words(g, lt, { s: 'уходит@1.55 *бюджет?@2.7', y: 700, size: 100 });
  } },
  { t0: 3.4, in: 'zoom', draw: (g, lt) => { // ДОХОД 120 000 ₽
    DASH.words(g, lt, { s: 'Доход@0.08 *семьи@1.0 |за_месяц@1.5', y: 430, size: 100, keyCol: P.teal });
    DASH.big(g, lt, { v: 120000, from: 0, at: 2.25, dur: 1.25, x: 60, y: 810, size: 190, unit: '₽', odo: true, t0: .9 });
    DASH.chip(g, lt, { x: 60, y: 878, s: '+4% к сентябрю', col: P.teal, icon: 'trend', t0: 3.5 });
    DASH.card(g, lt, { x: 60, y: 950, w: 960, h: 670, t0: .3, title: 'Доход по месяцам', icon: 'chart', meta: '2026' }, (g, b) => {
      const y0 = b.y + 40, M = ['Н', 'Д', 'Я', 'Ф', 'М', 'А', 'М', 'И', 'И', 'А', 'С', 'О'];
      DASH.grid(g, lt, { x: b.x, y: y0, w: b.w, h: 380, n: 3, t0: .5 });
      const e = DASH.area(g, lt, { x: b.x, y: y0, w: b.w, h: 380, data: [104, 108, 106, 110, 109, 113, 112, 115, 114, 117, 116, 120], min: 90, max: 124, t0: .6, dur: 1.8 });
      M.forEach((m, i) => { if (lt > .6 + i * .14) DASH.label(g, m, b.x + b.w * i / 11, y0 + 440, { size: 22, al: 'center', col: i === 11 ? P.ink : P.mute }); });
      if (e) DASH.tip(g, lt, { x: e.x, y: e.y - 14, s: '120 000 ₽', sub: 'октябрь', t0: 3.45 });
    });
  } },
  { t0: 7.6, in: 'swap', draw: (g, lt) => { // САМАЯ БОЛЬШАЯ СТАТЬЯ → ЖИЛЬЁ 30 %
    DASH.words(g, lt, { s: 'Самая@0.08 большая@0.69 |*статья@1.31', y: 430, size: 100, keyCol: P.orange });
    g.save(); g.globalAlpha *= DASH.ap(lt, .2); DASH.label(g, 'Доход 120 000 ₽', 64, 616, { size: 22, col: P.sub }); g.restore();
    const geo = DASH.sankey(g, lt, { x0: 64, y0: 640, h0: 960, x1: 560, t0: .15, dur: 1, hi: lt >= 1.75 ? 0 : null, hiP: DASH.ap(lt, 1.75, .45), ls: 44,
      nodes: CATS.map((c, i) => ({ v: c[1], col: c[2], s: i && lt > 2.3 ? '' : c[0], sub: Math.round(c[1] * 100) + '%' })) });
    DASH.tap(g, lt, { x: geo[0].x + 8, y: geo[0].cy, t0: 1.75 });
    DASH.card(g, lt, { x: 60, y: 1010, w: 960, h: 650, t0: 2.0, title: 'Жильё и коммуналка', icon: 'home', acc: P.orange, meta: 'октябрь' }, (g, b) => {
      DASH.big(g, lt, { v: 30, from: 0, at: 3.25, dur: .7, x: b.x, y: b.y + 196, size: 210, unit: '%', col: P.orange, t0: 2.2 });
      DASH.words(g, lt, { s: '36_000_₽@3.4 ~в_месяц@3.55', x: b.x, y: b.y + 296, size: 52, w: 600 });
      DASH.stack(g, lt, { x: b.x, y: b.y + 350, w: b.w, h: 40, segs: [{ v: .3, col: P.orange, t0: 3.3 }] });
      if (lt > 3.3) { g.save(); g.globalAlpha *= DASH.ap(lt, 3.3); DASH.label(g, 'из 100% дохода', b.r, b.y + 436, { size: 21, al: 'right' }); g.restore(); }
    });
  } },
  { t0: 12.2, in: 'scroll', draw: (g, lt) => { // ПРОДУКТЫ ¼ → КАФЕ +8 %
    DASH.words(g, lt, { s: 'Продукты@0.3 |*четверть@1.5', y: 430, size: 100, keyCol: P.teal, t1: 2.36 });
    DASH.words(g, lt, { s: 'Кафе@2.46 |*ещё_8%@3.25', y: 430, size: 100, keyCol: P.violet });
    g.save(); g.globalAlpha *= DASH.ap(lt, .2); DASH.label(g, '100 клеток = 120 000 ₽', 125, 616, { size: 22, col: P.sub }); g.restore();
    DASH.waffle(g, lt, { x: 125, y: 640, cell: 74, gap: 10, t0: 0, groups: [{ n: 30, col: P.orange, t0: .05, dur: .45, a: .55 }, { n: 25, col: P.teal, t0: 1.45, dur: .6 }, { n: 8, col: P.violet, t0: 2.6, dur: .35 }] });
    [['Продукты', 25, '30 000 ₽', P.teal, 1.55, 1.55, 60], ['Кафе', 8, '9 600 ₽', P.violet, 2.5, 3.25, 552]].forEach(([s, v, m, c, t0, at, x]) =>
      DASH.card(g, lt, { x, y: 1500, w: 468, h: 172, t0 }, (g, b) => {
        DASH.label(g, s, b.x, b.y + 4, { size: 22, col: P.sub });
        const r = DASH.big(g, lt, { v, from: 0, at, dur: .7, x: b.x, y: b.y + 104, size: 96, unit: '%', col: c, t0 });
        DASH.text(g, m, b.r, b.y + 102, { size: 44, w: 700, kind: 'D', al: 'right', col: P.sub, max: b.w - r.w - 30 });
      }));
  } },
  { t0: 16.8, in: 'swap', draw: (g, lt) => { // ПОДПИСКИ И МЕЛОЧИ → −12 000 ₽
    DASH.words(g, lt, { s: 'Подписки@0.08 |и@0.65 *мелочи@0.9', y: 430, size: 100, keyCol: P.red });
    DASH.card(g, lt, { x: 60, y: 610, w: 960, h: 700, t0: .25, title: 'Списания · октябрь', icon: 'repeat', acc: P.red, meta: '5 из 41' }, (g, b) =>
      ROWS.forEach((r, i) => DASH.row(g, lt, { x: b.x, y: b.y - 6 + i * 108, w: b.w, h: 108, icon: r[0], col: r[4], s: r[1], sub: r[2], v: '−' + DASH.rub(r[3]), vcol: P.coral, t0: .55 + i * .3 })));
    DASH.stream(g, lt, { from: [760, 1290], to: [330, 1480], bend: 70, n: 44, t0: 2.0, t1: 3.4, travel: .7, col: P.red, size: 4.5 });
    g.save(); g.globalAlpha *= DASH.ap(lt, 2.0); DASH.label(g, 'Уходит незаметно', 60, 1398, { size: 24, col: P.sub }); g.restore();
    DASH.big(g, lt, { v: -12000, from: 0, at: 3.33, dur: .9, x: 60, y: 1590, size: 170, unit: '₽', col: P.red, t0: 3.15 });
    DASH.seal(g, lt, { x: 850, y: 1390, s: 'Утечка', col: P.red, icon: 'alert', t0: 3.4, size: 34 });
  } },
  { t0: 21.4, in: 'zoom', draw: (g, lt) => { // СОКРАТИТЬ ВДВОЕ
    DASH.words(g, lt, { s: 'Сократить@0.45 *вдвое@1.3', y: 430, size: 100, keyCol: P.teal, lines: 1 });
    DASH.card(g, lt, { x: 60, y: 560, w: 960, h: 520, t0: .1, title: 'Что если · подписки', icon: 'repeat', acc: P.blue, meta: 'в месяц' }, (g, b) => {
      const sl = { x: b.x + 10, y: b.y + 270, w: b.w - 20, from: 1, to: .5, at: .9, dur: .75, t0: .2 }, r = DASH.slider(g, lt, sl);
      DASH.big(g, lt, { s: DASH.fmt(12000 * r.f), unit: '₽', x: b.x, y: b.y + 140, size: 120, t0: .2, col: r.f < .99 ? P.teal : P.ink });
      DASH.chip(g, lt, { x: b.r, y: b.y + 92, s: '−50%', col: P.teal, al: 'right', t0: 1.5, size: 30 });
      if (lt > .85 && lt < 1.75) { g.fillStyle = 'rgba(255,255,255,.16)'; DASH.circ(g, r.kx, sl.y, 46); g.fill(); }
      DASH.tap(g, lt, { x: r.kx, y: sl.y, t0: .8 });
      if (lt > .3) { g.save(); g.globalAlpha *= DASH.ap(lt, .3); DASH.label(g, '0 ₽', b.x + 10, sl.y + 76, { size: 21 }); DASH.label(g, '12 000 ₽', b.r - 10, sl.y + 76, { size: 21, al: 'right' }); g.restore(); }
    });
    DASH.kpi(g, lt, { x: 60, y: 1190, label: 'Экономия в месяц', v: 6000, from: 0, at: 1.25, dur: .45, plus: true, unit: '₽', size: 170, col: P.teal, t0: 1.2 });
  } },
  { t0: 23.18, in: 'scroll', draw: (g, lt) => { // ЗА ГОД +72 000 ₽
    DASH.kpi(g, lt, { x: 60, y: 380, label: 'Накопится за год', v: 72000, from: 0, at: 1.28, dur: 1.2, plus: true, unit: '₽', size: 190, col: P.teal, odo: true, t0: 0 });
    DASH.card(g, lt, { x: 60, y: 700, w: 960, h: 900, t0: .1, title: 'Копилка · 12 месяцев', icon: 'piggy', acc: P.teal, meta: '+6 000 / мес' }, (g, b) => {
      DASH.grid(g, lt, { x: b.x, y: b.y + 90, w: b.w, h: 540, n: 3, t0: .2, lal: 'left', labels: ['72 000', '48 000', '24 000', ''] });
      const r = DASH.bars(g, lt, { x: b.x, y: b.y + 30, w: b.w, h: 600, max: 80, data: Array.from({ length: 12 }, (_, i) => (i + 1) * 6), t0: .25, span: 1.0, col: P.teal, hi: 11,
        labels: ['Я', 'Ф', 'М', 'А', 'М', 'И', 'И', 'А', 'С', 'О', 'Н', 'Д'] });
      DASH.tip(g, lt, { x: r.tops[11][0], y: r.tops[11][1] - 12, s: '72 000 ₽', sub: 'декабрь', t0: 2.45, col: P.teal });
    });
  } },
  { t0: 26.2, in: 'swap', drift: .01, draw: (g, lt) => { // 50 / 30 / 20 → БАЛАНС
    g.save(); g.globalAlpha *= DASH.ap(lt, .15); DASH.label(g, 'Правило бюджета', 60, 360, { size: 24, col: P.sub }); g.restore();
    DASH.words(g, lt, { s: '50#blue@0.8 ~/@1.1 30#violet@1.51 ~/@1.85 20#teal@2.03', y: 520, size: 160, lines: 1 });
    DASH.legend(g, lt, { x: 60, y: 1430, w: 960, size: 44, gap: 92, items: [{ s: 'Нужды', v: '60 000 ₽', sub: '50%', col: P.blue, t0: .8 },
      { s: 'Желания', v: '36 000 ₽', sub: '30%', col: P.violet, t0: 1.51 }, { s: 'Накопления', v: '24 000 ₽', sub: '20%', col: P.teal, t0: 2.03 }] });
  } },
  { t0: 31.0, in: 'zoom', draw: (g, lt) => { // ЗАПИСЫВАЙТЕ НЕДЕЛЮ → 3 УТЕЧКИ
    DASH.words(g, lt, { s: 'Записывайте@0.08 |*неделю@1.34', y: 430, size: 100, keyCol: P.blue });
    DASH.card(g, lt, { x: 60, y: 610, w: 960, h: 860, t0: .2, title: 'Расходы · 7 дней', icon: 'calendar', acc: P.blue, meta: 'тыс ₽' }, (g, b) => {
      const D = [2.9, 2.4, 5.6, 2.2, 6.3, 7.4, 3.1], LK = [2, 4, 5], on = DASH.pr(lt, 3.27, 3.6);
      const r = DASH.bars(g, lt, { x: b.x, y: b.y + 30, w: b.w, h: 560, data: D, max: 8.4, t0: .5, span: 1.5, ls: 24, hi: lt > 3.27 ? LK : null,
        cols: D.map((v, i) => LK.includes(i) ? DASH.mixc(P.blue, P.red, on) : P.blue), labels: ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'] });
      DASH.hline(g, lt, { x: b.x, y: r.base - 560 * 3.5 / 8.4, w: b.w, col: P.amber, s: 'норма 3 500 ₽', al: 'left', t0: 1.1 });
      DASH.scan(g, lt, { x: b.x, y: b.y + 30, w: b.w, h: 560, t0: 2.3, dur: .95 });
      LK.forEach((i, j) => DASH.ping(g, lt, { x: r.tops[i][0], y: r.tops[i][1] - 36, col: P.red, t0: 3.27 + j * .1 }));
    });
    DASH.seal(g, lt, { x: 540, y: 1572, s: '3 утечки', col: P.red, icon: 'alert', t0: 3.3, size: 40 });
  } },
];

function hero(g, t) { // кольцо-кошелёк: в центре в начале и на правиле 50/30/20, остальное время в слоте шапки
  const [x, y, r] = DASH.fly(RING, t), w = 8 + r * .17, big = r > 120; let segs, sweep = 1;
  if (t < 3.4) { segs = CATS.map(c => ({ v: c[1], col: c[2] })); sweep = drain(t); }
  else if (t < 26.75) {
    const fill = st([[0, 0], [5.65, 1, 1.25]], t), home = st([[0, 0], [10.85, .3, .8]], t), food = st([[0, 0], [13.71, .25, .8]], t),
      cafe = st([[0, 0], [15.5, .08, .6]], t), subs = st([[0, 0], [20.13, .1, .6], [22.76, .05, .6]], t);
    segs = [{ v: home, col: P.orange }, { v: food, col: P.teal }, { v: cafe, col: P.violet }, { v: subs, col: P.red }, { v: Math.max(0, fill - home - food - cafe - subs), col: P.blue }];
    if (t >= 26.2) sweep = 1 - DASH.eo(DASH.pr(t, 26.2, 26.7));
  } else segs = [{ v: st([[0, 0], [27.0, .5, .55]], t), col: P.blue }, { v: st([[0, 0], [27.71, .3, .5]], t), col: P.violet }, { v: st([[0, 0], [28.23, .2, .5]], t), col: P.teal }];
  DASH.ring(g, t, { x, y, r, w, segs, sweep, t0: -.25, flow: big ? 1 : .45, glow: big, gap: big ? 8 : 4 });
  if (t < 3.6) { // сколько осталось в кошельке
    const v = 120000 * drain(t); g.save(); g.globalAlpha *= 1 - DASH.eo(DASH.pr(t, 3.3, 3.55));
    DASH.label(g, 'в месяц', x, y - 62, { size: 24, col: P.sub, al: 'center' });
    DASH.big(g, 0, { s: DASH.fmt(v), unit: '₽', x, y: y + 36, size: 88, al: 'center', col: v < 1 ? P.red : P.ink, t0: -1, max: 2 * r - w - 70 });
    g.restore();
    DASH.spray(g, t, { n: 130, t0: .55, t1: 3.15, life: 1.1, speed: 640, spread: 40, size: 6.5, from: tb => { const f = drain(tb); if (f <= .003 || f >= .997) return null;
      const a = -90 + 360 * f; return [540 + Math.cos(a * RAD) * 290, 1190 + Math.sin(a * RAD) * 290, a, catAt(f)]; } });
  }
  if (t > 26.6 && t < 31.2) { // центр кольца на правиле: доход → штамп «Баланс»
    const a = DASH.vis(t - 26.2, .55, 3.85);
    if (a > 0) { g.save(); g.globalAlpha *= a; DASH.label(g, 'доход', x, y - 46, { size: 24, col: P.sub, al: 'center' }); DASH.num(g, '120 000 ₽', x, y + 34, 62, { al: 'center' }); g.restore(); }
    DASH.seal(g, t, { x, y, s: 'Баланс', col: P.teal, t0: 30.18, t1: 30.85, size: 40 });
  }
  DASH.stream(g, t, { from: [430, 690], to: [S.x, S.y], bend: -170, n: 46, t0: 5.6, t1: 6.8, travel: .8, col: P.sky, size: 5 }); // доход течёт в кошелёк
}

function draw(t, k) {
  const g = DASH.begin(t, k);
  DASH.run(g, t, SC);
  const s = STATUS.filter(x => t >= x[0]).pop(), per = t < 23.18 ? ['ОКТ 2026', 0] : t < 26.2 ? ['12 месяцев', 23.18] : t < 31 ? ['ОКТ 2026', 26.2] : ['7 дней', 31];
  DASH.header(g, { crumb: t < 3.4 ? 'Семейный бюджет' : 'Остаток · октябрь', title: t < 3.4 ? 'Обзор' : DASH.rub(st(REST, t, .8)), num: t >= 3.4,
    period: per[0], periodAt: per[1] || null, status: s[1], statusCol: s[2], statusAt: s[0] || null });
  DASH.tabs(g, { items: ['Обзор', 'Доход', 'Статьи', 'Подписки', 'Прогноз', 'Правило', 'Неделя'], at: [[0, 0], [3.4, 1], [7.6, 2], [16.8, 3], [21.4, 4], [26.2, 5], [31, 6]] });
  hero(g, t);
  DASH.finish(g);
}

function sound(s) {
  [[.04, 'pop_high', .14], [.6, 'odometer', .1], [1.55, 'tick', .08], [2.7, 'pop_double', .12], [3.15, 'bubble_down', .1],
    [3.4, 'marimba_run', .13], [5.65, 'counter', .13], [6.9, 'drop', .1], [7.6, 'click', .12], [9.35, 'toggle_on', .12], [9.6, 'pop_soft', .1], [10.85, 'counter', .11],
    [12.2, 'kalimba_run', .12], [13.65, 'marimba', .11], [14.66, 'pop_double', .12], [16.8, 'click', .12], [17.35, 'tally', .09], [20.13, 'error_soft', .16],
    [21.4, 'marimba_run', .12], [22.76, 'pop_high', .11], [23.18, 'kalimba_run', .11], [24.46, 'odometer', .13], [25.7, 'success', .13],
    [26.2, 'click', .1], [27.0, 'kalimba', .12, 1], [27.71, 'kalimba', .12, 1.12], [28.23, 'kalimba', .12, 1.26], [30.18, 'success3', .16],
    [31.0, 'marimba_run', .11], [32.34, 'tally', .09], [34.27, 'notify', .16]].forEach(([t, n, v, p]) => s.play(t, n, v, { pitch: p || 1 }));
}
