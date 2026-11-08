// «Росток: теплица, которая растит сама» в стиле SLAM.
// Сквозной герой: росток из лаймовых точек. Растёт, рассыпается в облако, собирается в 95%, в финале становится логотипом.
const S = SLAM, C = S.C;
const CUTS = [2.25, 5.65, 8.6, 9.2, 9.8, 10.4, 11.0, 14.0, 16.0];
const TRS = ['glitch', 'glitch', 'glitch', 'cut', 'cut', 'cut', 'grey', 'glitch', 'flash'];
S.setHud({ tl: 'РОСТОК.ОНЛАЙН', tr: ['ЦЕЛЬ:', '95% АВТО / 5% ВЫ'], bl2: ['ГРЯДКИ:', '2/5 СОЗРЕЛИ'], bm2: ['АПТАЙМ:', '24/7'], clock: 'МСК 06:14' });

const SPX = 540, SPY = 1228, SPC = 15;            // росток в панели сцены 1
const DX = 81, DY = 560, DC = 54;                  // LED-цифры 95% в сцене 2

// 0. Терминал: запуск
function S0(g, lt, sc) {
  S.term(g, 'росток --старт', [
    { name: 'датчики', val: 'онлайн' },
    { name: 'полив', val: 'по расписанию' },
    { name: 'свет', val: 'авто' },
    { name: 'проветривание', val: 'авто' },
    { prompt: 'руки не нужны' }
  ], 70, 760, lt, { big: 84, size: 34, col: 15, step: 0.13 });
}

// 1. Заголовок печатается + росток из точек растёт в панели
function S1(g, lt, sc, t) {
  const out = S.outA(sc);
  S.kicker(g, 'умная теплица для дачи', 60, 250, lt, 0.05, { alpha: out });
  S.typeLines(g, 'Теплица,|которая растит|сама', 60, 290, lt, 0.2, { size: 132, hi: 'сама', cps: 26, alpha: out });
  S.lead(g, 'Датчики, полив и свет работают *без вас.*', 60, 790, lt, 1.35, { size: 40, alpha: out });
  const pa = S.eo(S.prog(lt, 0.05, 0.4));
  S.figPanel(g, 60, 860, 960, 730, { tl: 'РИС.01 - РОСТОК', tr: ['РЕЖИМ:', 'АВТО'], bl: 'ДАТЧИКИ → СИСТЕМА', br: 'АВТО: 95%' }, pa);
  S.dots(g, SPX, SPY, SPC, { grow: S.prog(lt, 0.3, 1.5), scatter: S.ein(S.prog(lt, sc.d - 0.32, sc.d)), t, glow: true });
}

// 2. Облако собирается в огромные LED-цифры 95%
function S2(g, lt, sc, t) {
  const out = S.outA(sc);
  S.section(g, '02', 'СООТНОШЕНИЕ', DX, 470, lt, 0.05);
  if (lt < 0.62) S.morph(g, S.sproutPts(SPX, SPY, SPC), S.pixPoints('95%', DX, DY, DC, { cluster: true }), lt / 0.62, { size: DC / 3 * 0.84, size0: SPC * 0.72, cx: SPX, cy: SPY });
  else S.pixText(g, '95%', DX, DY, DC, { mode: 'cluster', glow: 0.3, p: Math.min(1, out * 1.2), seed: 3 });
  S.typeLines(g, 'работы делает|автоматика.', DX, 1000, lt, 0.55, { size: 92, cps: 30, alpha: out, cursorUntil: 1.6 });
  if (lt > 1.5) { g.globalAlpha = S.clamp((lt - 1.5) / 0.2) * out; g.font = S.F(500, 56); g.fillStyle = C.grey; g.textAlign = 'right'; g.fillText('5% - это вы.', 1000, 1190); g.textAlign = 'left'; g.globalAlpha = 1; }
  g.globalAlpha = out; S.ratioBar(g, DX, 1270, 918, 0.95, S.prog(lt, 0.9, 1.9), { restP: S.prog(lt, 1.9, 2.1) }); g.globalAlpha = 1;
  S.kicker(g, 'урожай без дежурства у грядок.', DX, 1420, lt, 2.0, { alpha: out });
}

// 3. Серия «НЕТ ...»: пиксельное слово + гротеск, лента /// внизу
const RIBT = '95% АВТО / 5% ВЫ /// БЕЗ РУК /// НЕТ ПОЛИВА ВРУЧНУЮ /// НЕТ ПОДЪЁМОВ НА РАССВЕТЕ /// НЕТ ЗАБЫТОЙ РАССАДЫ';
function noScene(n, w1, w2, ribStyle, ribAng) {
  return (g, lt, sc, t, theme) => {
    const th = S.TH[theme], ink = theme === 'dark' ? C.wh : C.ink, pc = theme === 'dark' ? C.lime : C.ink;
    S.section(g, '03', 'БЕЗ РУК - 0' + n + '/04', 60, 300, lt, 0, { theme, line: false });
    let size = 160; g.font = S.F(500, size);
    while (size > 80 && (S.pixWidth('НЕТ', size * 0.102) + size * 0.32 + g.measureText(w1).width > 950 || g.measureText(w2).width > 950)) { size -= 4; g.font = S.F(500, size); }
    const cell = size * 0.102, y0 = 780, base = y0 + size * 0.8;
    S.pixText(g, 'НЕТ', 64, base - 7 * cell, cell, { color: pc, p: S.prog(lt, 0, 0.12), seed: n, gap: 0.2 });
    const x1 = 64 + S.pixWidth('НЕТ', cell) + size * 0.32;
    S.typeLines(g, w1, x1, y0, lt, 0.03, { size, cps: 75, color: ink, cursor: false });
    S.typeLines(g, w2, 60, y0 + size * 1.04, lt, 0.03 + w1.length / 75, { size, cps: 75, color: ink, theme, acc: pc });
    S.ribbon(g, 1340, ribAng, RIBT, t, { style: ribStyle, p: S.prog(lt, 0, 0.25), speed: 220 });
  };
}
// 3d. «БЕЗ РУК» огромным LED и две скрещенные ленты
function S3d(g, lt, sc, t) {
  S.ribbon(g, 470, -0.12, RIBT, t, { style: 'lime', p: S.prog(lt, 0, 0.2), speed: 260 });
  const cell = 50, p = S.prog(lt, 0.02, 0.2);
  S.pixText(g, 'БЕЗ', 540, 610, cell, { align: 'center', glow: 0.45, p, seed: 7, gap: 0.24 });
  S.pixText(g, 'РУК', 540, 1040, cell, { align: 'center', glow: 0.45, p: S.prog(lt, 0.1, 0.28), seed: 9, gap: 0.24 });
  S.ribbon(g, 1490, 0.1, RIBT, t, { style: 'white', p: S.prog(lt, 0.08, 0.3), speed: -200, dir: -1 });
}

// 4. Дашборд: заголовок, счётчики, лог агентов
const ROWS = [
  { name: 'агент.полив', at: 0.5 }, { name: 'агент.свет', at: 0.67 }, { name: 'агент.проветривание', at: 0.84 },
  { name: 'агент.датчики', at: 1.01 }, { name: 'агент.подкормка', at: 1.18 }, { name: 'агент.обогрев', at: 1.35 },
  { name: 'человек.урожай', at: 1.75, hum: true, btn: 'собрать ✓' }
];
const LOG = [
  { at: 0.9, time: '06:02:17', who: 'полив', what: 'грядка 3 · 1,2 л' }, { at: 1.2, time: '06:02:19', who: 'свет', what: 'фитолампа 60%' },
  { at: 1.5, time: '06:02:21', who: 'воздух', what: 'форточка открыта' }, { at: 1.8, time: '06:02:23', who: 'датчик', what: 'влажность 68%' },
  { at: 2.1, time: '06:02:25', who: 'урожай', what: 'томаты готовы ✓' }, { at: 2.4, time: '06:02:27', who: 'полив', what: 'грядка 4 · 0,8 л' }
];
function S4(g, lt, sc) {
  const out = S.outA(sc);
  S.section(g, '05', 'РАБОТАЕТ САМА', 60, 205, lt, 0.05);
  S.typeLines(g, 'Теплица|и есть система.', 60, 235, lt, 0.1, { size: 116, hiLine: 1, cps: 30, alpha: out, cursorUntil: 1.4 });
  S.lead(g, 'Автоматика делает работу. *Вам остаётся 5%: собрать урожай.*', 60, 560, lt, 0.75, { size: 38, alpha: out });
  g.globalAlpha = out;
  S.stats(g, 60, 670, 960, [
    { label: 'ЗАДАЧ.ВЫПОЛН', val: S.fmt(S.count(lt, 0.2, 2.6, 12631, 11904)) },
    { label: 'АВТО.ЦЕЛЬ', val: '95%', color: C.lime }, { label: 'ВЫ.ЦЕЛЬ', val: '5%' }
  ], lt - 0.2, { h: 140, cell: 9 });
  S.logPanel(g, 60, 860, 960, 740, ROWS, lt - 0.1, { path: '~/теплица/01-грядки - ', file: 'журнал.log', log: LOG.map(l => ({ ...l, at: l.at })), logN: 4, alpha: S.clamp((lt - 0.1) / 0.25) * out });
}

// 5. Карточки грядок 01-05, ряд едет влево
const CARDS = [
  { tag: 'СОЗРЕЛО', live: true, num: '01', name: 'Томаты', sub: 'Созрели. Собирайте.', chips: ['ТЕПЛИЦА 1', '2,4 КГ'], foot: 'грядка.01', link: 'собрать ↗' },
  { tag: 'СОЗРЕЛО', live: true, num: '02', name: 'Огурцы', sub: 'Созрели сегодня.', chips: ['ТЕПЛИЦА 1', '1,8 КГ'], foot: 'грядка.02', link: 'собрать ↗' },
  { tag: 'РАСТЁТ', num: '03', name: 'Перец', sub: 'Ещё 9 дней.', chips: ['ТЕПЛИЦА 2'], foot: 'грядка.03', link: 'график ↗' },
  { tag: 'РАСТЁТ', num: '04', name: 'Зелень', sub: 'Ещё 4 дня.', chips: ['ТЕПЛИЦА 2'], foot: 'грядка.04', link: 'график ↗' },
  { tag: 'В ПЛАНАХ', num: '05', name: 'Клубника', sub: 'Посадка весной.', chips: ['ИДЕЯ'], foot: 'грядка.05', link: 'план ↗' }
];
function S5(g, lt, sc) {
  const out = S.outA(sc);
  S.section(g, '06', 'УРОЖАЙ', 60, 205, lt, 0.03);
  S.typeLines(g, 'Две грядки созрели.|Ещё на подходе.', 60, 235, lt, 0.08, { size: 90, greyLine: 1, cps: 34, alpha: out, cursorUntil: 1.2 });
  g.globalAlpha = out;
  S.legend(g, [{ label: 'ГОТОВО', val: '02', fill: true, lime: true }, { label: 'РАСТЁТ', val: '02' }, { label: 'В ПЛАНАХ', val: '01', fill: true }], 60, 500, lt - 0.3);
  // вертикальная перекомпоновка ряда 01-05: сетка 2 колонки, шестая ячейка - итог «созрело 2/5»
  const cw = 472, ch = 300, gap = 16;
  CARDS.forEach((c, i) => {
    const x = 60 + (i % 2) * (cw + gap), y = 560 + Math.floor(i / 2) * (ch + gap), k = S.spring((lt - 0.2 - i * 0.07) * 1.4);
    g.save(); g.translate((1 - k) * 160, 0); S.card(g, x, y, cw, ch, c, S.clamp(k * 1.5) * out); g.restore();
  });
  const sx = 60 + cw + gap, sy = 560 + 2 * (ch + gap), sa = S.clamp((lt - 0.55) / 0.2) * out;
  if (sa > 0) {
    g.globalAlpha = sa; g.strokeStyle = 'rgba(198,250,64,0.35)'; g.lineWidth = 1.5; g.strokeRect(sx, sy, cw, ch); S.corners(g, sx - 6, sy - 6, cw + 12, ch + 12, 18, 'rgba(255,255,255,0.4)');
    g.font = S.F(400, 22, S.MONO); g.fillStyle = C.hud; S.tracked(g, 'СОЗРЕЛО', sx + 28, sy + 52, 4);
    S.pixText(g, S.prog(lt, 0.7, 1.0) < 1 ? '1/5' : '2/5', sx + 28, sy + 84, 15, { color: C.lime, glow: 0.35, alpha: sa });
    g.globalAlpha = sa; S.segBar(g, sx + 28, sy + ch - 60, cw - 56, 5, 2, lt, { t0: 0.6 });
  }
  g.globalAlpha = 1;
}

// 6. Финал: кольцо частиц стягивается в логотип, название, слоган, кнопка
function S6(g, lt, sc, t) {
  if (lt < 0.5) S.vortex(g, 540, 690, lt / 0.5, t, { R: 600, alpha: S.clamp((0.5 - lt) / 0.12) });
  S.logo(g, 540, 690, 11, S.prog(lt, 0.42, 0.8));
  S.wordmark(g, 'росток', 540, 1110, 190, S.prog(lt, 0.55, 0.95));
  g.font = S.F(500, 58); const w = g.measureText('Теплица, которая растит сама').width;
  S.typeLines(g, 'Теплица, которая растит сама', 540 - w / 2, 1165, lt, 0.85, { size: 58, hi: 'сама', cps: 75 });
  S.brk(g, 'подключить', 540, 1355, S.prog(lt, 1.15, 1.4));
  if (lt > 1.25) { g.globalAlpha = S.clamp((lt - 1.25) / 0.2); g.font = S.F(400, 26, S.MONO); g.fillStyle = C.grey; g.textAlign = 'center';
    g.fillText('датчики · полив · свет · урожай', 540, 1470);
    g.fillStyle = C.dim; g.fillText('// 95% делает автоматика, собираете вы.', 540, 1530); g.textAlign = 'left'; g.globalAlpha = 1; }
}

const SCENES = [
  { bg: 'dark', fig: 'РИС.00 - ЗАГРУЗКА', draw: S0 },
  { bg: 'dark', fig: 'РИС.01 - РОСТОК РАСТЁТ', draw: S1 },
  { bg: 'dark', fig: 'РИС.02 - СООТНОШЕНИЕ', draw: S2 },
  { bg: 'lime', fig: 'РИС.03 - БЕЗ РУК', draw: noScene(1, 'полива', 'вручную.', 'ink', -0.05) },
  { bg: 'dark', fig: 'РИС.03 - БЕЗ РУК', draw: noScene(2, 'подъёмов', 'на рассвете.', 'lime', -0.07) },
  { bg: 'light', fig: 'РИС.03 - БЕЗ РУК', draw: noScene(3, 'забытой', 'рассады.', 'ink', -0.04) },
  { bg: 'dark', fig: 'РИС.03 - БЕЗ РУК', draw: S3d },
  { bg: 'dark', fig: 'РИС.04 - ЖУРНАЛ', draw: S4 },
  { bg: 'dark', fig: 'РИС.05 - УРОЖАЙ', draw: S5 },
  { bg: 'dark', fig: 'РИС.06 - РОСТОК', draw: S6 }
];

function draw(t, k) { S.frame(k, t, CUTS, SCENES, { tr: TRS }); }

function sound(s) {
  const P = (t, n, v, p) => s.play(t, n, v, { pitch: p || 1 });
  P(0.2, 'type', 0.09); P(0.55, 'type', 0.08, 1.1);
  P(1.03, 'tick', 0.1, 1.0); P(1.29, 'tick', 0.1, 1.15); P(1.55, 'key_soft', 0.12, 1.2);
  S.cutSounds(s, CUTS, TRS);
  P(2.45, 'type', 0.09); P(2.6, 'bubble', 0.1, 0.9); P(3.1, 'type', 0.08, 1.1); P(3.7, 'pop_soft', 0.1);
  P(5.7, 'sparkle', 0.12); P(6.27, 'pop_high', 0.12, 0.8); P(6.55, 'counter', 0.12); P(7.6, 'toggle_on', 0.11, 1.1);
  P(8.62, 'woodblock', 0.16, 0.7); P(9.22, 'woodblock', 0.15, 0.8); P(9.82, 'woodblock', 0.15, 0.9); P(10.42, 'rim', 0.18, 0.7);
  P(11.25, 'counter', 0.1); P(11.6, 'toggle_on', 0.1, 0.95); P(11.95, 'toggle_on', 0.1, 1.1); P(12.3, 'toggle_on', 0.1, 1.25);
  P(12.85, 'click', 0.14, 1.1); P(12.9, 'notify', 0.12);
  P(14.3, 'pop_soft', 0.1); P(14.62, 'tick', 0.1, 1.2); P(15.0, 'odometer', 0.1);
  P(16.05, 'magic', 0.12); P(16.65, 'success', 0.14); P(16.88, 'type', 0.08); P(17.2, 'toggle_on', 0.12);
}
