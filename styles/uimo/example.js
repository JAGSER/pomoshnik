// example.js: тот же ролик на UIM. 120 BPM, склейки на долях: 3.0, 6.5, 10.0, 13.5, 17.0.
// Бренд образца заменён вымышленным «Демолаб» (чужие названия не рисуем).
const U = UIM, C = U.C;
const CUTS = [0, 3, 6.5, 10, 13.5, 17, 999];
const MODE = ['dark', 'light', 'dark', 'dark', 'light', 'brand'];
const STEPS = [3.5, 4.5, 5.5, 6.0, 7.5, 8.5, 9.5];          // шаги демо для счётчика
const CLK = [2.0, 3.5, 4.5, 5.5, 6.0, 7.5, 8.5, 9.5, 10.5, 14.0, 18.0]; // все клики курсора
const L1 = U.winL(110, 720, 860, 760);
const L2 = U.winL(90, 470, 900, 800);
const LC = U.winL(0, 0, 720, 880);
const LE = U.winL(190, 690, 700, 540);
const T2 = [0, 1, 4, 2];                                    // куда кликает курсор в сцене 2
const HT = [1, 2, 4, 3], C3 = [7.5, 8.5, 9.5];
const TIPS = ['Откройте проект', 'Выберите шаблон', 'Добавьте данные', 'Поделитесь демо'];

// вдавливание кнопки в момент клика (0..1), только после времени a
function press(t, a) { const c = U.clickPh(t, CLK); return t >= (a || 0) && c >= 0 ? 1 - c : 0; }

// 1. Хук: заголовок по словам, окно влетает пружиной, курсор жмёт «Создать»
function s1(g, t, S) {
  U.head(g, 'Покажи продукт,|а не слайды', { y: 380, t0: -0.1, t, t1: S.t1, key: 'Покажи', col: '#fff', kc: C.vl, size: 124 });
  const p = U.spr(t - 0.35, 11), wy = 720 + (1 - p) * 1150;
  g.save(); g.translate(540, wy + 380); g.rotate((1 - p) * 0.12); g.translate(-540, -wy - 380);
  U.win(g, 110, wy, 860, 760, { url: 'ваш-продукт.рф', btn: 'Создать', hi: 0, ha: press(t, 2) });
  g.restore();
  const b = L1.pt[0];
  U.tip(g, b[0] - 110, b[1] + 50, 'Демо готово', U.spr(t - 2.1), 70, 1010);
  const q = U.path(t, [[0.5, 1080, 1800], [1.7, b[0] + 95, b[1] + 14], [3, b[0] + 95, b[1] + 14]]);
  U.cursor(g, q[0], q[1], t, CLK);
}

// 2. Запись: каждый клик рождает мини-кадр, который летит в слот, счётчик растёт
function s2(g, t, S) {
  U.head(g, 'Запись кликов', { y: 310, t0: 3.0, t, t1: S.t1, key: 'кликов', col: C.ink, kc: C.vi, size: 124 });
  U.rec(g, 540, 392, t, U.eo((t - 3.2) / 0.25));
  const n = STEPS.filter(s => s <= t && s < 6.4).length, hi = n ? T2[n - 1] : -1, sc = 0.9 + 0.1 * U.spr(t - 3);
  g.save(); g.translate(540, 870); g.scale(sc, sc); g.translate(-540, -870);
  U.win(g, 90, 470, 900, 800, { url: 'ваш-продукт.рф', hi, ha: press(t) });
  g.restore();
  for (let j = 0; j < 4; j++) {
    const sx = 90 + j * 230, sy = 1330;
    U.slot(g, sx, sy, 210, 150);
    if (t < STEPS[j]) continue;
    const q = U.spr(t - STEPS[j] - 0.05), pt = L2.pt[T2[j]];
    const c = U.fly(pt, [sx + 105, sy + 75], q);
    U.thumb(g, c[0], c[1], 0.3 + 0.7 * Math.min(q, 1.1), j + 1, (pt[0] - 90) / 900, (pt[1] - 470) / 800);
  }
  const P = T2.map(i => L2.pt[i]);
  const q = U.path(t, [[3, 1000, 1700], [3.35, P[0][0], P[0][1]], [3.5, P[0][0], P[0][1]], [4.3, P[1][0], P[1][1]],
    [4.5, P[1][0], P[1][1]], [5.3, P[2][0], P[2][1]], [5.5, P[2][0], P[2][1]], [5.85, P[3][0], P[3][1]], [6.5, P[3][0], P[3][1]]]);
  U.cursor(g, q[0], q[1], t, CLK);
  U.counter(g, 540, 1590, 'шаг', U.countAt(t, STEPS), { p: U.eo((t - 3.1) / 0.25), bump: U.bumpAt(t, STEPS) });
}

// 3. Карусель шагов: окна едут по кликам, хотспоты и подсказки
function s3(g, t, S) {
  U.head(g, 'Интерактивные шаги', { y: 310, t0: 6.5, t, t1: S.t1, key: 'шаги', col: '#fff', kc: C.vl, size: 112 });
  const pos = U.stepPos(t, C3);
  for (let j = 0; j < 4; j++) {
    const d = j - pos; if (Math.abs(d) > 1.6) continue;
    const cx = 540 + d * 900, sc = 1 - 0.14 * Math.min(1, Math.abs(d));
    g.save(); g.translate(cx, 910); g.scale(sc, sc); g.translate(-360, -440);
    U.win(g, 0, 0, 720, 880, { url: 'ваш-продукт.рф', hi: HT[j], ha: 0 });
    const h = LC.pt[HT[j]], ar = j ? C3[j - 1] + 0.3 : 6.8;
    U.hot(g, h[0], h[1], t);
    U.tip(g, h[0], h[1] + 36, TIPS[j], U.spr(t - ar), 20, 700);
    g.restore();
  }
  U.dotsNav(g, 540, 1420, 4, pos, true);
  const G = j => [180 + LC.pt[HT[j]][0], 470 + LC.pt[HT[j]][1]], a = G(0), b = G(1), c = G(2), d = G(3);
  const q = U.path(t, [[6.5, 980, 1700], [7.2, a[0], a[1]], [7.5, a[0], a[1]], [8.2, b[0], b[1]], [8.5, b[0], b[1]],
    [9.2, c[0], c[1]], [9.5, c[0], c[1]], [10, d[0], d[1]]]);
  U.cursor(g, q[0], q[1], t, CLK);
  U.counter(g, 540, 1590, 'шаг', U.countAt(t, STEPS), { dark: true, bump: U.bumpAt(t, STEPS) });
}

// 4. ИИ: кнопка со звёздочкой, печать подсказки, голос, языки
function s4(g, t, S) {
  U.head(g, 'ИИ пишет|и озвучивает', { y: 270, t0: 10.0, t, t1: S.t1, key: 'ИИ', col: '#fff', kc: C.vl, size: 120 });
  const y0 = 500 + U.slideY(t, 10, 140);
  U.card(g, 90, y0, 900, 900, 36, '#fff');
  U.aiBadge(g, 210, y0 + 74, 'ИИ', 1);
  U.button(g, 760, y0 + 74, 'Сгенерировать', { icon: true, size: 36, h: 72, press: press(t, 10.5) });
  g.fillStyle = C.paper; U.rr(g, 130, y0 + 140, 820, 380, 24); g.fill();
  U.typeText(g, 'Нажмите «Создать», чтобы начать новый проект за пару секунд.', 170, y0 + 215, 740, { t, t0: 10.65, size: 48 });
  U.wave(g, 540, y0 + 620, 820, t, 11.4, U.spr(t - 11.3));
  U.chips(g, ['Русский', 'English', 'Deutsch', 'Español'], 540, y0 + 790, 11.9, t, 0);
  const q = U.path(t, [[10, 980, 1700], [10.35, 760, 574], [10.5, 760, 574], [11.3, 860, 1420], [13.5, 840, 1440]]);
  U.cursor(g, q[0], q[1], t, CLK);
}

// 5. Ссылка и аналитика: копирование, график, уведомление
function s5(g, t, S) {
  U.head(g, 'Одна ссылка,|вся аналитика', { y: 270, t0: 13.5, t, t1: S.t1, key: 'аналитика', col: C.ink, kc: C.vi, size: 112 });
  U.linkBar(g, 480, 'ваш-продукт.рф/d/start', 13.5, t, 14.05, press(t, 14));
  const ay = 650 + U.slideY(t, 14.3, 200), a = U.cl((t - 14.3) / 0.2, 0, 1);
  if (a > 0) {
    g.globalAlpha = a;
    U.bars(g, 90, ay, 900, 690, [0.35, 0.5, 0.42, 0.68, 0.6, 0.85, 1], ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], 14.5, t, { title: 'Просмотры демо' });
    g.globalAlpha = 1;
  }
  U.toast(g, 1400, 'А', 'Анна прошла все шаги', 16, t);
  const q = U.path(t, [[13.5, 980, 1700], [13.85, 870, 545], [14, 870, 545], [14.8, 960, 1000], [17, 940, 1020]]);
  U.cursor(g, q[0], q[1], t, CLK);
}

// 6. Финал: имя, строка с ключом, окно-герой, штамп, адрес
function s6(g, t, S) {
  const wy = 690 + U.slideY(t, 17.3, 1300);
  if (t >= 17.3) U.win(g, 190, wy, 700, 540, { url: 'демолаб.рф', hi: 0, ha: press(t, 18) });
  U.endCard(g, t, 17.05, { brand: 'Демолаб', line: 'Демо за минуты', key: 'минуты', stamp: 'ЗАПУСК', st: 1.45, url: 'демолаб.рф', ut: 1.95 });
  const b = LE.pt[0];
  const q = U.path(t, [[17, 1000, 1750], [17.8, b[0] + 85, b[1] + 12], [18, b[0] + 85, b[1] + 12], [18.6, b[0] + 100, b[1] + 130], [20, b[0] + 105, b[1] + 140]]);
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
    [0, 'drop', 0.2], [0.15, 'pop_high', 0.14], [0.45, 'wood', 0.12], [2, 'click', 0.16], [2.1, 'pop_soft', 0.12],
    [3, 'marimba_run', 0.16], [3.2, 'toggle_on', 0.1],
    [3.5, 'click', 0.14, 1.0], [4.5, 'click', 0.14, 1.1], [5.5, 'click', 0.14, 1.2], [6, 'click', 0.14, 1.3],
    [6.5, 'kalimba_run', 0.16], [6.8, 'pop_soft', 0.12],
    [7.5, 'click', 0.14, 1.4], [8.5, 'click', 0.14, 1.5], [9.5, 'click', 0.14, 1.6],
    [10, 'magic', 0.18], [10.5, 'click', 0.15], [10.7, 'type', 0.1], [11.4, 'sparkle', 0.12], [11.9, 'bubble', 0.12],
    [13.5, 'marimba_run', 0.16], [14, 'click', 0.14], [14.08, 'success', 0.14], [14.5, 'pop_soft', 0.1],
    [15.4, 'kalimba', 0.1], [16, 'notify', 0.14],
    [17, 'fanfare_soft', 0.18], [17.35, 'pop_high', 0.12], [18, 'click', 0.14],
    [18.5, 'woodblock', 0.18], [18.55, 'success3', 0.14], [19, 'pop_double', 0.12]
  ]);
}