// «Окошко»: онлайн-запись к мастеру. Кинетика «одно слово на сцену», склейки на долях, 22 с.
const U = UIM, C = U.C, TH = U.TH;
const CUTS = [0, 1.5, 2.5, 3.5, 4.6, 5.6, 7.2, 9.6, 10.6, 11.8, 15.0, 16.2, 17.4, 22];
const THEMES = ['light', 'ink', 'blue', 'light', 'blue', null, 'light', 'ink', 'blue', 'paper', 'blue', 'ink', 'light'];
const CAPS = [
  ['ОНЛАЙН-ЗАПИСЬ · КЛИК', 'cursor'], ['НАПОМИНАНИЯ · ЗА 2 ЧАСА', 'bell'], ['ПЕРЕНОС · БЕЗ ЗВОНКОВ', 'swap'],
  ['ОПЛАТА · ПО ССЫЛКЕ', 'card'], ['ОТЗЫВЫ · ПОСЛЕ ВИЗИТА', 'star'], ['ВСЁ В ОДНОМ · ТЕМЫ', 'brush'],
  ['КАБИНЕТ МАСТЕРА', 'chart'], null, ['ПОМОЩНИК · ЧАТ', 'chat'], ['ПОМОЩНИК · ОНЛАЙН', 'chat'],
  ['ПОМОЩНИК · ОТВЕТЫ', 'chat'], ['ПОМОЩНИК · ЗАПИСЬ', 'cal'], ['ОКОШКО · 24/7', 'clock']
];
const CYC = ['blue', 'teal', 'orange', 'lime'];           // смена фона в «и всё в одном»
const WY = 840, UY = 1160;                                 // центр слова и строки интерфейса

function themeAt(S) { return S.i === 5 ? CYC[U.cycle(S.u, 0.4, 4)] : THEMES[S.i]; }

// 0. запись: время-пилюли, курсор кликает 11:30, подсказка «1 из 4»
function s0(g, u, th) {
  U.word(g, 'запись', 540, WY, { u, color: th.ink, dot: th.dot });
  const sel = u >= 0.8 ? 1 : -1;
  U.chips(g, 540, UY, ['10:00', '11:30', '14:00'], sel, u - 0.15);
  U.tip(g, 300, UY + 90, 520, 'Вы записаны на 11:30', '1 из 4', u - 0.92, { btn: 'Далее' });
  const q = U.path(u, [[0.25, 960, 1560], [0.7, 560, 1110], [1.5, 575, 1125]]);
  U.ring(g, 552, 1100, U.prog(u, 0.8, 1.25), 'rgba(66,74,229,0.8)');
  if (u > 0.25) U.cursor(g, q[0], q[1], U.press(u, 0.8));
}
// 1. напомнит: синяя карточка-напоминание въезжает справа
function s1(g, u, th) {
  U.word(g, 'напомнит', 540, WY, { u, color: th.ink, dot: th.dot, from: 1 });
  const p = U.spr(u - 0.2, 10);
  if (p > 0) {
    g.save(); g.translate((1 - p) * 300, 0);
    U.tip(g, 150, UY - 60, 780, 'Завтра в 11:30, маникюр у Анны', '2 из 4', u - 0.2, { btn: 'Приду' });
    g.restore();
  }
}
// 2. перенесёт: кнопка с датой, клик, время меняется через размытие
function s2(g, u, th) {
  U.word(g, 'перенесёт', 540, WY, { u, color: th.ink, dot: th.dot });
  const p = U.prog(u, 0.45, 0.7), pin = U.spr(u - 0.12, 11);
  if (pin > 0) {
    const sz = 44, cx = 540, cy = UY;
    const wA = U.tw('пт, 14:00', sz, 600), wB = U.tw('сб, 12:00', sz, 600), w = U.lerp(wA, wB, U.eo(p)) + 170;
    g.save(); g.globalAlpha = U.cl((u - 0.12) / 0.12, 0, 1); g.translate(0, (1 - pin) * 50);
    U.card(g, cx - w / 2, cy - 52, w, 104, 18, '#FFFFFF', { sa: 0.7 });
    U.icon(g, 'cal', cx - w / 2 + 58, cy, 40, C.blue, 4);
    const bx = cx - w / 2 + 100;
    [['пт, 14:00', 1 - p], ['сб, 12:00', p]].forEach(([s, a], k) => {
      if (a <= 0.01) return; const b = (1 - a) * 14;
      for (let j = 0; j < (b > 1 ? 5 : 1); j++) { g.globalAlpha = a * (b > 1 ? 0.3 : 1); U.txt(g, s, bx + (j - 2) * b * 0.6, cy + 2, sz, k ? C.blue : C.ink, { w: 700 }); }
    });
    g.restore();
  }
  const q = U.path(u, [[0.1, 980, 1500], [0.4, 600, 1110], [1, 610, 1120]]);
  U.ring(g, 585, 1095, U.prog(u, 0.42, 0.85), 'rgba(255,255,255,0.85)');
  if (u > 0.1) U.cursor(g, q[0], q[1], U.press(u, 0.42));
}
// 3. оплата: поле с суммой, клик «Оплатить» -> «Оплачено», затем наезд в точку
function s3(g, u, th, S) {
  const L = U.layout('оплата', 540, WY, { dot: 1 });
  g.save();
  U.zoomInto(g, U.prog(u, 0.74, S.len - 0.07), L.dot.x, L.dot.y);
  U.word(g, 'оплата', 540, WY, { u, color: th.ink, dot: th.dot, from: 1 });
  const done = u >= 0.5;
  const f = U.field(g, 540, UY, 940, 'Маникюр · 2 500 ₽', done ? 'Оплачено' : 'Оплатить', u - 0.12, { icon: 'card', done });
  if (f) U.ring(g, f.bx, f.by, U.prog(u, 0.5, 0.9), 'rgba(255,255,255,0.9)');
  const q = U.path(u, [[0.15, 1000, 1500], [0.45, 900, UY + 15], [1.2, 905, UY + 20]]);
  if (u > 0.15) U.cursor(g, q[0], q[1], U.press(u, 0.5));
  g.restore();
}
// 4. отзыв: звёзды заполняются, слово «садится» в белую карточку
function s4(g, u, th) {
  const lift = U.spr(u - 0.55, 10), L = U.layout('отзыв', 540, WY, { dot: 1 });
  if (lift > 0) {
    const pad = 60, x = L.l - pad, y = L.top - pad * 0.6, w = L.r - L.l + pad * 2, h = L.bot - L.top + pad * 1.2;
    g.save(); g.translate(540, WY); g.scale(0.9 + 0.1 * lift, 0.9 + 0.1 * lift); g.translate(-540, -WY);
    g.globalAlpha = U.cl((u - 0.55) / 0.1, 0, 1); U.card(g, x, y, w, h, 26, '#FFFFFF', { sa: 1 }); g.restore();
  }
  const on = u > 0.6;
  U.word(g, 'отзыв', 540, WY, { u, color: on ? C.ink : th.ink, dot: on ? C.blue : th.dot });
  const p = U.spr(u - 0.15, 11);
  if (p > 0) {
    g.save(); g.globalAlpha = U.cl((u - 0.15) / 0.12, 0, 1); g.translate(0, (1 - p) * 50);
    U.card(g, 230, UY + 60, 620, 110, 55, '#FFFFFF', { sa: 0.6 });
    U.stars(g, 445, UY + 115, 30, (u - 0.25) * 9);
    U.txt(g, '5,0', 680, UY + 116, 48, C.ink, { w: 700 });
    g.restore();
  }
}
// 5. и всё в одном: фон и шрифт меняются на каждой доле (гротеск, антиква, гротеск, узкий)
function s5(g, u, th) {
  const k = U.cycle(u, 0.4, 4), name = CYC[k];
  U.word(g, 'и всё\nв одном', 540, WY - 40, { u, enter: k === 0 ? 'smear' : 'none', kind: th.font, color: th.ink, dot: th.dot, size: th.font === 'cond' ? 300 : 230, lh: th.font === 'cond' ? 0.9 : 0.98 });
  const p = U.spr(u - 0.15, 11);
  if (p > 0) U.btn(g, 540, UY + 70, 'Попробовать', { fill: th.btn, color: '#FFFFFF', s: 0.9 + 0.1 * p, a: U.cl((u - 0.15) / 0.12, 0, 1), shadow: false, size: 38, h: 100 });
}
// 6. выручка: окно кабинета, цифры считают, линия растёт, курсор на точке графика
function s6(g, u, th) {
  U.word(g, 'выручка', 540, 300, { u, color: th.ink, dot: th.dot, size: 175 });
  const p = U.spr(u - 0.1, 9); if (p <= 0) return;
  g.save(); g.globalAlpha = U.cl((u - 0.1) / 0.15, 0, 1);
  g.translate(540, 1000); const s = 0.93 + 0.07 * p; g.scale(s, s); g.translate(-540, -1000 - (1 - p) * 140);
  const R = U.windowFrame(g, 70, 440, 940, 1070, 'Окошко · кабинет мастера');
  const v = U.countUp(u - 0.3, 0, 286400, 0.9), n = U.countUp(u - 0.4, 0, 412, 0.9);
  const D = U.dash(g, R, {
    u: u - 0.15, brand: 'Окошко', nav: ['Главная', 'Записи', 'Клиенты', 'Оплаты', 'Отзывы'], active: u > 1.25 ? 3 : 0,
    title: 'Выручка, ноябрь', btn: '+ Запись', chartTitle: 'Выручка по дням',
    stats: [{ l: 'Выручка за месяц', v: U.rub(v), d: '+12%' }, { l: 'Записи', v: String(Math.round(n)), d: '+31' }, { l: 'Рейтинг', v: '4,9' }],
    series: [0.18, 0.3, 0.24, 0.42, 0.38, 0.55, 0.5, 0.68, 0.62, 0.8, 0.92], hover: 9, hoverU: u - 1.7, hoverLabel: 'сб: 18 400 ₽'
  });
  g.restore();
  const ta = 1 - U.eo((u - 1.6) / 0.18);
  if (ta > 0) { g.save(); g.globalAlpha = ta; U.tip(g, 330, 1010, 520, 'Вся выручка на одном экране', '1 из 3', u - 1.0, { btn: 'Далее' }); g.restore(); }
  const q = U.path(u, [[0.6, 1000, 1600], [1.2, 175, 920], [1.3, 180, 925], [1.7, 860, 1240], [2.4, 870, 1250]]);
  U.ring(g, 160, 905, U.prog(u, 1.25, 1.65), 'rgba(66,74,229,0.8)');
  if (u > 0.6) U.cursor(g, q[0], q[1], U.press(u, 1.25));
}
// 7. знакомьтесь: печать с кареткой на чёрном
function s7(g, u, th) { U.typeWord(g, 'знакомьтесь,', 540, 880, { u: u - 0.05, cps: 17, size: 150, color: '#FFFFFF' }); }
// 8. помощник: слово с разлётом штрихов
function s8(g, u, th) {
  U.burst(g, 540, WY - 30, u, 'rgba(255,255,255,0.75)', { r: 420 });
  U.word(g, 'помощник', 540, WY, { u, enter: 'pop', color: th.ink, dot: th.dot });
  const p = U.spr(u - 0.3, 11);
  if (p > 0) U.btn(g, 540, UY, 'Отвечает за 3 секунды', { icon: 'chat', color: C.ink, s: 0.9 + 0.1 * p, a: U.cl((u - 0.3) / 0.12, 0, 1), size: 38 });
}
// 9. чат-помощник крупно: камера отъезжает и следит за новым сообщением
const MSG = [
  { who: 'bot', at: 0.1, text: 'Здравствуйте! Я помощник студии. Подберу удобное время.' },
  { who: 'me', at: 0.75, text: 'Можно завтра после 18?' },
  { who: 'bot', at: 1.25, text: 'Да, свободно 18:30 и 19:15.', card: 'Записать на 18:30', cardAt: 1.6 },
  { who: 'me', at: 2.35, text: '18:30, спасибо!' },
  { who: 'bot', at: 2.7, segs: [{ t: 'Готово. ' }, { t: 'Напомню за 2 часа.', b: 1 }] }
];
function s9(g, u, th) {
  const k = U.io(u / 3.2), s = U.lerp(1.16, 1.0, k);
  g.save(); g.translate(540, 900); g.scale(s, s); g.translate(-540, U.lerp(-760, -900, k));
  U.card(g, 40, 220, 1000, 1240, 32, '#FFFFFF', { border: '#E6E8EE', sa: 0.25 });
  U.txt(g, 'Окошко', 90, 300, 44, C.ink, { w: 700 });
  g.fillStyle = C.ok; g.beginPath(); g.arc(98, 360, 9, 0, 7); g.fill();
  U.txt(g, 'помощник онлайн', 118, 361, 30, C.mut, { w: 500 });
  g.fillStyle = '#ECEEF3'; g.fillRect(70, 410, 940, 2);
  MSG[2].cardOn = u > 2.05;
  U.chat(g, 90, 460, 900, MSG, u);
  g.restore();
  const c = MSG[2]._card, q = U.path(u, [[1.6, 1000, 1640], [2.0, 560, 1215], [3.2, 580, 1240]]);
  if (u > 1.6) U.cursor(g, q[0], q[1], U.press(u, 2.05));
  U.ring(g, 545, 1195, U.prog(u, 2.05, 2.45), 'rgba(66,74,229,0.8)');
}
// 10. отвечает: карточка «вопрос + ответ»
function s10(g, u, th) {
  U.word(g, 'отвечает', 540, WY - 60, { u, color: th.ink, dot: th.dot, from: 1 });
  U.qa(g, 90, UY - 120, 900, 'Сколько стоит гель-лак?', [{ t: 'Гель-лак 2 500 ₽, ' }, { t: 'снятие бесплатно.', b: 1 }], u - 0.12, { at: 0.35, cps: 60 });
}
// 11. записывает: сетка 2×2 с полями записи
function s11(g, u, th) {
  U.word(g, 'записывает', 540, WY - 60, { u, color: th.ink, dot: th.dot });
  U.miniCards(g, 90, UY - 120, 900, [
    { l: 'Услуга', v: 'Маникюр' }, { l: 'Мастер', v: 'Анна' },
    { l: 'Время', v: 'завтра, 18:30' }, { l: 'Статус', v: 'готово', ok: 1 }
  ], u - 0.15, { cols: 2, h: 160, vs: 46 });
}
// 12. финал: всегда на связи + плашка «онлайн», время бежит и встаёт на 23:40
function s12(g, u, th, S, t) {
  U.word(g, 'всегда\nна связи', 540, WY - 30, { u, color: th.ink, dot: th.dot, size: 220 });
  const tm = u < 0.8 ? '09:41' : u < 1.25 ? '18:05' : '23:40';
  U.status(g, 540, UY + 50, 'Помощник онлайн · ' + tm, u - 0.3, t);
  const a = U.eo((u - 1.9) / 0.3);
  if (a > 0) { g.globalAlpha = a; U.txt(g, 'Окошко, онлайн-запись к мастеру', 540, UY + 190 - 16 * a, 42, C.mut, { w: 500, a: 'center', max: 900 }); g.globalAlpha = 1; }
}
const SC = [s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12];

let READY = false;
function warm() {
  const L = TH.light.ink, D = '#FFFFFF';
  U.prep([['запись', { color: L, dot: 1 }], ['напомнит', { color: D, dot: 1 }], ['перенесёт', { color: D, dot: 1 }], ['оплата', { color: L, dot: 1 }],
    ['отзыв', { color: D, dot: 1 }], ['отзыв', { color: C.ink, dot: 1 }], ['выручка', { color: L, dot: 1, size: 175 }], ['помощник', { color: D, dot: 1 }],
    ['отвечает', { color: D, dot: 1 }], ['записывает', { color: D, dot: 1 }], ['всегда\nна связи', { color: L, dot: 1, size: 220 }]]);
  CYC.forEach(n => { const th = TH[n]; U.prep([['и всё\nв одном', { kind: th.font, color: th.ink, dot: 1, size: th.font === 'cond' ? 300 : 230, lh: th.font === 'cond' ? 0.9 : 0.98 }]]); });
  READY = true;
}
function draw(t, k) {
  const g = k.g; U.tex(); if (!READY) warm();
  const S = U.scene(t, CUTS), th = TH[themeAt(S)];
  U.bg(g, th);
  g.save(); if (S.i !== 9 && S.i !== 3) U.cam(g, S.u); SC[S.i](g, S.u, th, S, t); g.restore();
  const cap = CAPS[S.i];
  const zoomed = S.i === 3 && S.u > 0.84;
  if (cap && !zoomed) U.caption(g, cap[0], th, 9, cap[1]);
  if (S.i !== 7 && S.i !== 9 && !zoomed) U.badge(g, th, t);
}

function sound(s) {
  U.cutSounds(s, CUTS, { skip: [4, 6, 9, 10, 12] });
  U.sfx(s, [
    [0.05, 'pop_high', 0.16], [0.8, 'click', 0.16],     [1.72, 'notify', 0.14], [2.92, 'click', 0.15], [3.05, 'toggle_on', 0.12],
    [4.0, 'click', 0.15], [4.05, 'success', 0.14], [4.4, 'bubble_down', 0.12],
    [4.95, 'sparkle', 0.12], [5.15, 'pop_double', 0.12],
    [6.0, 'pop_soft', 0.1, 1.1], [6.8, 'pop_soft', 0.1, 1.3],
    [7.2, 'marimba_run', 0.15], [7.6, 'counter', 0.1], [8.45, 'click', 0.14], [8.95, 'tick', 0.12],
    [9.65, 'type', 0.12], [10.6, 'magic', 0.16],
    [11.8, 'kalimba_run', 0.14], [12.55, 'bubble', 0.11], [13.85, 'click', 0.15], [14.15, 'bubble', 0.11],     [15.15, 'bubble', 0.11], [16.75, 'success', 0.13],
    [17.4, 'fanfare_soft', 0.15], [18.2, 'tick', 0.1], [19.3, 'success3', 0.13]
  ]);
}
