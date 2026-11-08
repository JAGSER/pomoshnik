// example.js: «Мозг на тысячу запросов» на библиотеке CHAOS.
// Сквозной герой - капля-помощник с ростком, счётчик запросов в HUD, штампы на итогах сцен.
const L = CHAOS, C = L.C;
const HERO = { body: 'drop', col: C.CREAM, top: 'sprout', acc: C.LIME, cheek: C.PINK };
const hero = (g, x, y, s, t, o) => L.mascot(g, x, y, s, t, Object.assign({}, HERO, o));
let SC = null;

// 1. Сто запросов в минуту: герой в центре, вокруг кружат чаты
function s1(g, u, t) {
  L.rays(g, 540, 1170, t, C.YEL, 0.35);
  const B = [];
  for (let i = 0; i < 7; i++) { const an = t * 1.4 + i * 0.8976; B.push({ i, an, d: Math.sin(an) }); }
  B.forEach(b => {
    const a = L.spr(u - 0.45 - b.i * 0.06); if (a <= 0) return;
    L.chat(g, 540 + Math.cos(b.an) * 390, 1170 + b.d * 130, 140, 90, t,
      { s: (0.75 + 0.2 * b.d) * a, rot: Math.sin(t * 3 + b.i) * 0.1, seed: b.i, tail: b.i % 2 ? 'r' : 'l' });
  });
  hero(g, 540, 1170, 1.5 * L.spr(u - 0.12), t, { face: 'smile', arms: true, wave: u > 0.6 });
}

// 2. Читаю рецепт вслух: лист с подсветкой строк и сканером
function s2(g, u, t) {
  const a = L.spr(u - 0.05);
  L.focus(g, 380, 1000, 580, 700, u - 0.3, C.INK, 70);
  L.sheet(g, 380, 1000 + 700 * (1 - a), 1, t, { read: (u - 0.7) * 2.6, scan: u > 0.3 ? u - 0.3 : null, acc: C.PINK });
  L.ripples(g, 745, 1475, u, C.INK, { a0: 2.5, a1: 3.8, r0: 30, dr: 95 });
  hero(g, 830, 1440, 0.85 * L.spr(u - 0.2), t, { face: 'talk', look: -1 });
}

// 3. Магазин: три товара на полке, над каждым вердикт
function s3(g, u, t) {
  const X = [230, 540, 850], BT = [0.6, 1.3, 2.0], BC = [C.GRN, C.ORA, C.RED], BK = ['check', 'dash', 'cross'];
  const IT = [['carton', C.CREAM, C.YEL], ['jar', C.ORA, C.CREAM], ['pot', C.PINK, C.CREAM]];
  L.shelf(g, 70, 1010, 1250);
  for (let i = 0; i < 3; i++) {
    const a = L.spr(u - 0.05 - i * 0.1); if (a <= 0) continue;
    L.item(g, X[i], 1250, a, IT[i][0], IT[i][1], IT[i][2]);
    L.badge(g, X[i], 820 + Math.sin(t * 4 + i) * 6, 62, BK[i], BC[i], L.spr(u - BT[i]));
  }
  const fx = 230 + 310 * L.eo((u - 1.1) / 0.25) + 310 * L.eo((u - 1.8) / 0.25);
  if (u > 0.3) L.corners(g, fx - 150, 710, fx + 150, 1300, 60, '#fff');
  hero(g, 170, 1520, 0.62 * L.spr(u - 0.4), t, { face: u > 2.1 ? 'shock' : 'smile', look: 1 });
  L.stamp(g, 850, 1120, 'НЕ БРАТЬ', C.RED, u - 2.3, -0.18);
}

// 4. Папа, жми сюда: телефон, палец, нажатие
function s4(g, u, t) {
  const a = L.spr(u - 0.05), done = u > 2.0, s = 0.88;
  g.save(); L.punch(g, u, 2.0, 470, 1364, 0.05);
  const btn = L.phone(g, 470, 1100 + 900 * (1 - a), s, t, { acc: C.VIO, done, ping: u > 0.4 ? u - 0.4 : null });
  if (done) L.burst(g, btn.x, btn.y, (u - 2) / 0.3, C.PINK, { r0: 70, dr: 90 });
  const fi = L.eo((u - 1.4) / 0.5), fa = 1 - L.eo((u - 2.6) / 0.22);
  if (fi > 0 && fa > 0) {
    g.globalAlpha = L.cl((u - 1.4) / 0.2) * fa;
    L.hand(g, btn.x + L.lerp(-180, -10, fi), btn.y + L.lerp(140, 12, fi), 0.5, s, u > 1.95 && u < 2.1 ? 1 : 0);
    g.globalAlpha = 1;
  }
  g.restore();
  hero(g, 860, 1450, 0.55 * L.spr(u - 0.3), t, { face: done ? 'wink' : 'smile', look: -1 });
  L.stamp(g, 850, 820, 'ГОТОВО', C.GRN, u - 2.4, 0.2);
}

// 5. Двадцать стилей за вечер: сетка карточек, перевороты, мозг кипит
function s5(g, u, t) {
  const GL = ['dot', 'tri', 'zig', 'bars', 'ring'];
  for (let i = 0; i < 20; i++) {
    const c = i % 4, r = (i / 4) | 0, a = L.spr(u - 0.08 - i * 0.025); if (a <= 0) continue;
    const act = u > 0.8 && Math.floor(u * 5) % 20 === i, fl = act ? Math.cos(((u * 5) % 1) * L.TAU) : 1;
    L.tile(g, 210 + c * 220, 695 + r * 170 + Math.sin(t * 4 + i) * 4, 200, 150,
      { s: a, flip: fl, col: L.PAL[(i + (fl < 0 ? 3 : 0)) % 6], glyph: GL[i % 5], num: i + 1 });
  }
  L.steam(g, 540, 1540, u, '#fff', 110);
  hero(g, 540, 1585, 0.5 * L.spr(u - 0.1), t, { face: 'boil' });
}

// 6. Финал: тёмный фон, лучи, герой крупно
function s6(g, u, t, D) {
  L.rays(g, 540, 1010, t, C.LIME, 0.12);
  hero(g, 540, 1010 + Math.sin(t * 3) * 10, 1.35 * L.spr(u - 0.05), t, { face: 'happy', line: C.CREAM, arms: true, wave: true });
  L.caption(g, u, { text: 'ДЛЯ ВСЕЙ СЕМЬИ', key: 'СЕМЬИ', kc: C.LIME, y: 1460, size: 66, at: 0.9, col: C.CREAM });
  L.stamp(g, 840, 720, 'ЕЩЁ ХОЧУ', C.PINK, u - 1.6, 0.18);
}

function draw(t, k) {
  const g = k.g;
  SC = SC || L.scenes(k, [
    { bg: C.PINK, kc: C.YEL, text: 'СТО ЗАПРОСОВ В МИНУТУ', key: 'МИНУТУ', f: s1 },
    { bg: C.YEL, kc: C.PINK, text: 'МАМЕ РЕЦЕПТ ЧИТАЮ ВСЛУХ', key: 'ВСЛУХ', f: s2 },
    { bg: C.BLUE, kc: C.LIME, text: 'ЗЕЛЁНЫЙ, БЕРИ КРАСНЫЙ, НЕТ', key: 'БЕРИ', f: s3 },
    { bg: C.LIME, kc: C.PINK, text: 'ПАПА, ЖМИ ВОТ СЮДА', key: 'СЮДА', f: s4 },
    { bg: C.ORA, kc: C.BLUE, text: '20 СТИЛЕЙ ЗА ВЕЧЕР', key: 'СТИЛЕЙ', f: s5 },
    { bg: C.INK, kc: C.LIME, text: 'Помощник AI', key: 'AI', size: 140, y: 390, f: s6, last: true }
  ]);
  const { i, S, u, D, prev } = L.scene(t, SC);
  L.bg(g, t, S.bg, i);
  g.save(); L.cam(g, u, D, i);
  S.f(g, u, t, D, S);
  L.headline(g, u, { text: S.text, key: S.key, kc: S.kc, y: S.y || 330, size: S.size || 124, D, seed: i, exit: !S.last });
  g.restore();
  if (prev) L.wipe(g, u, prev.bg);
  L.hud(g, t, { label: 'ЗАПРОСОВ', from: 7, to: 1247, t1: 18.5 });
  if (prev) L.glitch(g, u, i);
  L.grain(g, t);
}

function sound(s) {
  const T = s.subs.map(x => x.t0);
  const at = (i, d) => (T[i] != null ? T[i] : i * 3.4) + d;
  CHAOS.sfx(s, [
    [0, 'pop_double', 0.2], [0.2, 'bubble', 0.14], [0.65, 'pop_high', 0.12], [1.6, 'counter', 0.1], [2.4, 'pop_soft', 0.1],
    [at(1, 0), 'kalimba_run', 0.18], [at(1, 0.3), 'click', 0.12], [at(1, 0.8), 'type', 0.1], [at(1, 2.1), 'type', 0.08],
    [at(2, 0), 'marimba_run', 0.18], [at(2, 0.6), 'pop_high', 0.14], [at(2, 1.3), 'wood', 0.14], [at(2, 2.0), 'error_soft', 0.12], [at(2, 2.3), 'woodblock', 0.2],
    [at(3, 0), 'kalimba_run', 0.18], [at(3, 0.4), 'notify', 0.12], [at(3, 2.0), 'click', 0.16], [at(3, 2.05), 'success', 0.14], [at(3, 2.4), 'rim', 0.16],
    [at(4, 0), 'marimba_run', 0.2], [at(4, 0.1), 'tally', 0.12], [at(4, 1.0), 'pop_soft', 0.1], [at(4, 1.8), 'magic', 0.12], [at(4, 2.6), 'bubble_down', 0.12],
    [at(5, 0), 'fanfare_soft', 0.2], [at(5, 0.2), 'sparkle', 0.12], [at(5, 0.9), 'pop_double', 0.12], [at(5, 1.6), 'woodblock', 0.18], [at(5, 1.7), 'success3', 0.14]
  ]);
}