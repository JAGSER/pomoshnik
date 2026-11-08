// video.js: «Я твой будильник» на библиотеке CHAOS.
// Монолог от первого лица, склейки по словам, сквозная строка интерфейса со счётчиком «отложено ×N» и часами.
const L = CHAOS, C = L.C;
const CUTS = [0, 2.6, 4.6, 7.6, 9.4, 11.0, 15.4, 18.2, 20.2, 22.6, 23.4, 24.2, 25.0, 25.8, 26.8];
const KIND = ['ink', 'ink', 'ink', 'storm', 'ink', 'ink', 'ink', 'ink', 'ink', 'coral', 'paper', 'blue', 'ink', 'coral', 'paper'];
const SNOOZE = [5.3, 5.9, 6.5, 7.9, 8.4, 8.9, 9.5];
const snoozed = t => SNOOZE.filter(x => t >= x).length;

const S = [
  // 0. хук: Я ТВОЙ БУДИЛЬНИК
  (g, u, t) => {
    L.type(g, '06:00. ты спишь.', 540, 520, { u, at: 0.05, cps: 30, size: 40, align: 'center', col: '#8A8680' });
    L.poster(g, u, [{ s: 'Я ТВОЙ', c: 'bone', at: 0.3, size: 250 }, { s: 'БУДИЛЬНИК.', c: 'coral', at: 0.85 }], { y: 1000, gap: 0.8 });
    L.type(g, 'звоню уже ' + Math.max(0, u - 1.2).toFixed(2).replace('.', ',') + ' с.', 540, 1400, { u, at: 1.3, cps: 99, size: 40, align: 'center', col: '#8A8680' });
  },
  // 1. ни минутой раньше. ровно 06:00.
  (g, u, t) => {
    L.words(g, 'ни минутой раньше.', 540, 560, { kind: 'serif', size: 84, col: 'bone', u, at: 0.05, step: 0.09 });
    L.words(g, 'ни минутой позже.', 540, 660, { kind: 'serif', size: 84, col: 'bone', u, at: 0.4, step: 0.09 });
    L.type(g, 'ровно', 540, 800, { u, at: 0.85, size: 36, align: 'center' });
    L.poster(g, u, [{ s: '06:00.', c: 'coral', at: 1.05, size: 480 }], { y: 1130 });
  },
  // 2. токены: что я слышу в ответ
  (g, u, t) => {
    L.type(g, 'слышу в ответ:', 540, 560, { u, at: 0.05, size: 38, align: 'center' });
    const b = L.tokens(g, [{ s: 'ещё', c: 'coral', n: '31 дБ' }, { s: 'пять', c: 'blue', n: '12' }, { s: 'минут', c: 'bone', n: '9' },
      { s: 'ну', c: 'green', n: '44' }, { s: 'мам', c: 'yellow', n: '27' }, { s: 'я', c: 'lilac', n: '3' }, { s: 'встаю', c: 'pink', n: '0' }], { y: 660, u, at: 0.3, step: 0.2 });
    L.words(g, '(и ни одного слова правды.)', 540, b + 90, { kind: 'serif', size: 52, col: '#8A8680', u, at: 2.1, step: 0.07 });
  },
  // 3. буквенный шторм: храп
  (g, u, t) => {
    L.storm(g, u, 'Р', { row: 'ХРРРР... ХРРРР...' });
  },
  // 4. 7.
  (g, u, t) => {
    L.bigNum(g, u, '7.', { at: 0.05, y: 960, size: 720 });
    L.words(g, '(я считал. дважды.)', 540, 1340, { kind: 'serif', size: 50, col: '#6E6A64', u, at: 0.8, step: 0.1 });
  },
  // 5. рейтинг отговорок со штампами
  (g, u, t) => {
    L.type(g, 'отговорка дня:', 64, 470, { u, at: 0.05, size: 42, col: C.BONE });
    g.fillStyle = C.CORAL; g.fillRect(450, 492, 180 * L.eo((u - 0.4) / 0.3), 4);
    L.bars(g, [{ s: 'ещё пять минут', p: 41, c: 'coral' }, { s: 'я уже встал', p: 27 }, { s: 'сегодня суббота', p: 18 },
      { s: 'ты сломался', p: 9 }, { s: 'кот лёг сверху', p: 5 }], { y: 610, u, at: 0.4, step: 0.18 });
    L.stamp(g, 790, 852, 'ВРАНЬЁ', u, 2.0, -0.07);
    L.stamp(g, 760, 976, 'СПИСАНО', u, 2.7, 0.05);
    const v = 0.3 + 0.7 * L.eio((u - 3.2) / 0.7);
    L.slider(g, 64, 1290, 952, 'громкость', v, u, 1.2);
  },
  // 6. сетка уведомлений: отложить x7
  (g, u, t) => {
    L.type(g, 'история утра:', 540, 440, { u, at: 0.02, size: 38, align: 'center' });
    const T = ['06:00', '06:05', '06:10', '06:15', '06:20', '06:25'], SUB = ['подъём', 'подъём!', 'точно встаю', 'ну всё', 'последний', 'серьёзно'];
    for (let i = 0; i < 6; i++) {
      const c = i % 2, r = (i / 2) | 0, a = L.eo((u - 0.15 - i * 0.08) / 0.25), dk = u - 0.9 - i * 0.22;
      L.note(g, 64 + c * 486, 530 + r * 270, 466, 244, T[i], SUB[i], { a, dead: dk > 0, strike: dk / 0.18 });
    }
    const n = Math.min(7, 1 + Math.max(0, Math.floor((u - 0.9) / 0.22)));
    L.poster(g, u, [{ s: 'ОТЛОЖИТЬ ×' + (u > 0.9 ? n : 1), c: 'bone', at: 0.5, size: 200 }], { y: 1430, seed: 4 });
  },
  // 7. каждый звонок это крик: волна
  (g, u, t) => {
    L.words(g, 'так что каждый звонок', 540, 600, { kind: 'bold', size: 62, col: 'bone', u, at: 0.05, step: 0.1 });
    L.words(g, 'это *крик,*', 540, 760, { kind: 'serif', size: 120, col: 'bone', key: 'coral', u, at: 0.55, step: 0.15 });
    L.wave(g, 540, 1080, 960, 330, t, { u, at: 0.75, amp: 0.7 + 0.3 * Math.sin(u * 3) });
  },
  // 8. календарь: понедельник
  (g, u, t) => {
    L.type(g, 'что я знаю:', 540, 520, { u, at: 0.02, size: 38, align: 'center' });
    L.calendar(g, 540, 900, 'НОЯ', '09', { u, at: 0.3 });
    L.words(g, 'понедельник.', 540, 1290, { kind: 'bold', size: 76, col: 'bone', u, at: 1.2 });
  },
  // 9-13. пулемёт слов, фоны меняются
  (g, u) => { L.poster(g, u, [{ s: 'ВСТАВАЙ', c: 'ink', at: 0.02 }], { y: 1000, kind: 'coral', jit: 1, seed: 1 }); },
  (g, u) => { L.poster(g, u, [{ s: 'НЕ', c: 'ink', at: 0.02, size: 380 }, { s: 'ЛЕЖИ', c: 'coral', at: 0.25, size: 420 }], { y: 1000, kind: 'paper', seed: 2 }); },
  (g, u) => { L.poster(g, u, [{ s: 'ПОДЪЁМ', c: 'ink', at: 0.02 }], { y: 1000, kind: 'blue', jit: 1, seed: 3 }); },
  (g, u, t) => { L.dashWall(g, t, 0.5); L.poster(g, u, [{ s: 'ЕЩЁ', c: 'bone', at: 0.02, size: 400 }, { s: 'РАЗ?', c: 'blue', at: 0.3, size: 400 }], { y: 1000, seed: 5 }); },
  (g, u) => { L.poster(g, u, [{ s: 'НЕТ.', c: 'bone', at: 0.02, size: 560 }], { y: 1000, kind: 'coral', jit: 1, seed: 6 }); },
  // 14. финал на бумаге
  (g, u, t) => {
    L.words(g, 'я подожду.', 540, 560, { kind: 'serif', size: 96, col: '#8A857B', u, at: 0.1 });
    L.words(g, 'недолго.', 540, 680, { kind: 'serif', size: 96, col: 'coral', u, at: 0.6 });
    L.poster(g, u, [{ s: 'ВСТАЁМ?', c: 'ink', at: 1.05, size: 400 }], { y: 1040, kind: 'paper', seed: 7 });
    L.type(g, '06:35 · отложено ×7', 540, 1340, { u, at: 1.6, size: 36, align: 'center', col: '#7E7A72', cursor: true });
  }
];

function draw(t, k) {
  const g = k.g, { i, u } = L.scene(t, CUTS, k.duration);
  let kind = KIND[i];
  if (kind === 'storm') kind = L.stormBg(u);
  L.bg(g, kind, t, { code: i === 5 ? 0.3 : i === 2 ? 0.22 : 0, ghost: kind === 'ink' && i < 9 ? 'Б' : null });
  g.save(); L.cam(g, u);
  S[i](g, u, t);
  g.restore();
  if (i >= 9 && i < 14) L.counter(g, L.pad(i - 8) + '/05', kind);
  if (i > 0) L.cut(g, u, i + 1, kind, i >= 9 ? 0.14 : 0.2);
  const n = snoozed(t), sec = 6 * 3600 + n * 300 + t * 2;
  L.hud(g, t, { kind, title: 'будильник · спальня', live: 'звоню', p: t / k.duration, left: 'отложено ×' + n,
    right: L.pad(sec / 3600) + ':' + L.pad((sec / 60) % 60) + ':' + L.pad(sec % 60) });
}

function sound(s) {
  L.cutSounds(s, CUTS.slice(0, 9), ['click', 'tick'], 0.14);
  L.sfx(s, [
    [0.05, 'notify', 0.18], [0.3, 'pop_high', 0.12], [0.85, 'rim', 0.16], [1.3, 'counter', 0.08],
    [2.65, 'key_soft', 0.08], [3.65, 'counter', 0.1], [3.65, 'rim', 0.15],
    [4.9, 'pop_soft', 0.1], [5.3, 'toggle_on', 0.08], [5.9, 'toggle_on', 0.08], [6.5, 'toggle_on', 0.08], [6.75, 'type', 0.08],
    [7.6, 'error_soft', 0.12], [8.2, 'bamboo', 0.1], [8.8, 'bamboo', 0.1],
    [9.45, 'woodblock', 0.18], [10.2, 'type', 0.08],
    [11.45, 'tally', 0.1], [13.0, 'woodblock', 0.2], [13.7, 'rim', 0.18], [14.2, 'toggle_on', 0.1],
    [16.3, 'counter', 0.12], [17.2, 'tally', 0.1],
    [18.75, 'magic', 0.1], [19.1, 'sparkle', 0.08],
    [20.5, 'pop_double', 0.13], [21.4, 'pop_soft', 0.1],
    [22.6, 'click', 0.16], [23.4, 'click', 0.16, 1.2], [24.2, 'click', 0.16, 0.9], [25.0, 'tick', 0.16], [25.8, 'error_soft', 0.16],
    [26.8, 'kalimba_run', 0.14], [27.85, 'pop_high', 0.13], [28.4, 'success3', 0.16]
  ]);
}
