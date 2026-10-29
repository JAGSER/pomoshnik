// Демо «Как сохранить мотивацию: привычка как игра» — только PIXEL и обычный canvas.
// Мир: ночное королевство привычек. Герой: рыцарь-огонёк, пламя на шлеме = мотивация (растёт по сюжету).
const X = PIXEL, P = X.P, GY = X.GY;
const CUTS = [0, 2.2, 4.4, 6.3, 8.8, 11.0, 13.2, 14.9, 17.1, 18.6, 19.6, 22.0, 24.7, 26.3, 28.8, 30.7, 32.7];
const TR = ['', 'flash', 'mosaic', 'slam', 'mosaic', 'slam', 'mosaic', 'flash', 'mosaic', 'cut', 'cut', 'mosaic', 'slam', 'mosaic', 'flash', 'iris', 'flash'];
// сюжет HUD: уровень, опыт, жизни, день
const LV = [[0, 1], [15.3, 2], [29.0, 5]];
const XP = [[0, 0], [9.4, 0], [9.6, .1], [9.9, .1], [10.1, .2], [10.4, .2], [10.6, .3], [12.7, .3], [13.0, .5], [13.3, .5], [14.65, .92], [15.3, .95], [15.45, .1], [25.0, .1], [25.4, .35], [26.6, .35], [28.6, .96], [29.0, 1], [29.15, .3]];
const DAY = [[0, 0], [8.15, 0], [8.4, 1], [9.4, 1], [9.6, 2], [9.9, 2], [10.1, 3], [10.4, 3], [10.6, 4], [14.0, 4], [14.15, 5], [14.25, 5], [14.4, 6], [14.5, 6], [14.65, 7], [17.8, 7], [18.0, 8], [22.5, 8], [23.6, 14], [26.7, 14], [28.5, 30]];
const HP = [[0, 3], [17.95, 2], [23.3, 3]];
const hudAt = (t) => ({ t, lv: X.hold(LV, t), xp: X.kf(XP, t), day: X.kf(DAY, t), hp: X.hold(HP, t), hpT: X.since([17.95], t), lvT: X.since([15.3, 29.0], t),
  xpT: X.since([9.6, 10.1, 10.6, 12.9, 25.4], t), danger: t > 19.8 && t < 22, dayCol: t > 17.95 && t < 18.6 ? 'r' : 'w',
  show: X.eo(X.pr(t, 2.45, 2.8)) * (1 - X.pr(t, 30.7, 30.9)) });
const shk = (lt, t0, a = 2, d = 0.35) => (lt > t0 && lt < t0 + d ? a * (1 - (lt - t0) / d) : 0);
// луна в нужной точке экрана при камере (z, fx)
const moonAt = (sx, sy, z, fx) => ({ mx: Math.round(fx + (sx - fx) / z), my: Math.round(GY + (sy - GY) / z) });
const ITEMS = ['cake', 'mug', 'gift'], DAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'], ON7 = [0.05, 0.11, 0.17, 0.23, 0.8, 1.05, 1.3];
const PALS = ['night', 'dawn', 'day', 'dusk'];

const SC = [
  { // 0. Хук: серый мир, рыцарь без огня, вопрос
    w(w, lt, t) {
      X.backdrop(w, t, Object.assign({ sky: 'dull', halo: false }, moonAt(148, 140, 2, 84)));
      X.hero(w, 84, GY, { pose: 'idle', t, fire: 0, eyes: lt > 1.15 ? 'o' : '' });
      if (lt > 1.1) { const a = X.eo((lt - 1.1) / 0.2), h = Math.round(4 + 8 * a); X.bubble(w, 62, 196 - h, 14, h, { think: true, tx: 76, ty: 201 }); if (a >= 1) X.text(w, '?', 67, 186, { col: 'k' }); }
    },
    u(g, lt) { X.title(g, lt, 0.05, 'НОВАЯ', 90, 62, { out: 2.0 }); X.title(g, lt, 0.6, '*ПРИВЫЧКА?', 90, 88, { out: 2.0 }); },
    cam: (lt) => ({ z: 2, fx: 84, fy: GY, dx: -lt * 0.4 }),
  },
  { // 1. Превратите в игру: мир окрашивается, загорается огонь, появляется HUD
    w(w, lt, t) {
      X.backdrop(w, t, moonAt(148, 140, 2, 84)); const ig = lt - 1.1;
      if (ig > 0) { X.glow(w, 84, GY - 38, 24, P.f2, 0.5 * (1 - X.pr(ig, 0.2, 1))); X.shock(w, ig, 84, GY - 36, { r: 30, col: P.f1, col2: P.f2 }); }
      X.hero(w, 84, GY, { pose: ig > 0.05 && ig < 0.9 ? 'cheer' : 'idle', t, fire: ig < 0 ? 0 : 1 + 1.2 * (1 - X.eo(ig / 0.6)), white: ig > 0 && ig < 0.1 });
      X.burst(w, ig, 84, GY - 40, { n: 20, seed: 4, sp: 60 });
      X.twinkles(w, t, 60, 150, 80, 40, { n: 3 });
    },
    u(g, lt) { X.title(g, lt, 0.05, 'ПРЕВРАТИТЕ', 90, 60, { out: 2.05 }); X.stamp(g, lt, 1.1, 'В ИГРУ!', 90, 102, { s: 3, out: 2.12 }); },
    cam: (lt) => ({ z: 2, fx: 84, fy: GY, dx: -0.8 - lt * 0.3, shake: shk(lt, 1.1, 2.2) }),
  },
  { // 2. Уровень 1: старт пути, баннер посреди неба
    w(w, lt, t) {
      X.backdrop(w, t, Object.assign({ cx: 128 }, moonAt(148, 72, 1.333, 70)));
      X.flag(w, 30, GY, t, { h: 40, col: P.green, dk: P.green2, mark: 'star' });
      X.torch(w, 104, GY - 2, t); X.torch(w, 136, GY - 2, t + 0.3);
      const run = X.pr(lt, 1.2, 1.9), x = 58 + X.eo(run) * 20;
      X.hero(w, x, GY, { pose: run > 0 ? 'run' : 'idle', t, fire: 1 });
    },
    u(g, lt) { X.banner(g, lt, 0.1, 'УРОВЕНЬ 1', 110, { out: 1.7 }); X.words(g, lt, 1.4, 'НАЧНИТЕ С...', 90, 150, { al: 'c', out: 1.75 }); },
    cam: (lt) => ({ z: 1.333, fx: 70, fy: GY, dx: lt * 0.5 }),
  },
  { // 3. Пять минут в день: песочные часы и разминка
    w(w, lt, t) {
      X.backdrop(w, t, moonAt(34, 150, 1.667, 104)); const p = X.pr(lt, 0.25, 1.85), done = lt > 1.9;
      X.glow(w, 130, GY - 16, 20, P.f1, 0.3); X.hourglass(w, 130, GY, p, t);
      const hop = done ? 0 : Math.abs(Math.sin(lt * 7.5)) * 7;
      X.hero(w, 80, GY - Math.round(hop), { pose: done ? 'cheer' : hop > 2 ? 'jump' : 'idle', t, fire: 1, shadow: hop < 2 });
      if (done) { X.burst(w, lt - 1.9, 130, GY - 36, { n: 16, seed: 9, cols: [P.white, P.green, P.green2] }); X.icon(w, 'check', 130, GY - 40 - Math.round(X.eo((lt - 1.9) / 0.2) * 4), { sc: 2 }); }
    },
    u(g, lt) { X.stamp(g, lt, 0.0, '5 МИНУТ', 90, 72, { s: 3, out: 2.3 }); X.title(g, lt, 0.9, 'В ДЕНЬ', 90, 96, { out: 2.3 }); },
    cam: (lt) => ({ z: 1.667, fx: 104, fy: GY }),
  },
  { // 4. Каждый день без пропуска: бег и блоки-дни
    w(w, lt, t) {
      const sc = lt * 46, H = [0.55, 1.05, 1.55]; X.backdrop(w, t, Object.assign({ scroll: sc }, moonAt(150, 132, 1.167, 64)));
      let jy = 0, air = false;
      H.forEach((h, i) => {
        const bx = 64 + 46 * h - sc + 2, hit = lt - h, gold = hit > 0;
        X.block(w, bx, 180, { label: i + 2, gold, bump: hit > 0 && hit < 0.25 ? hit / 0.25 : 0, t });
        if (hit > 0 && hit < 0.5) { X.orb(w, bx, 164 - Math.round(X.eo(hit / 0.5) * 12), t, { glow: 0 }); X.burst(w, hit, bx, 170, { n: 8, seed: i + 2, sp: 50, cols: [P.white, P.ice, P.cyan] }); }
        const jt = lt - (h - 0.2); if (jt >= 0 && jt < 0.4) { jy = Math.sin((Math.PI * jt) / 0.4) * 21; air = true; }
      });
      X.hero(w, 64, GY - Math.round(jy), { pose: air ? 'jump' : 'run', t, fire: 1.2, shadow: !air });
    },
    u(g, lt) { X.title(g, lt, 0.05, 'КАЖДЫЙ ДЕНЬ', 90, 60, { at: [0, 0.45], out: 2.0 }); X.words(g, lt, 0.8, 'БЕЗ *ПРОПУСКА', 90, 92, { al: 'c', gap: 0.2, out: 2.0 }); },
    cam: (lt) => ({ z: 1.167, fx: 64, fy: GY }),
  },
  { // 5. +1 опыт: кристалл улетает в шкалу
    w(w, lt, t) {
      X.backdrop(w, t, moonAt(30, 124, 2, 90)); const fly = X.pr(lt, 1.5, 1.75), oy = 182 - X.ei(fly) * 200;
      X.rays(w, 90, 182, t, { r: 54, n: 10, col: P.cyan, lvl: 0.3 * (1 - fly) });
      if (fly < 1) { X.magic(w, t, 90, oy, 22, { n: 24 }); X.orb(w, 90, oy, t, { sc: 2 }); }
      X.hero(w, 90, GY, { pose: lt < 1.55 ? 'cheer' : 'idle', t, fire: 1.3 });
      if (fly >= 1) X.twinkles(w, t, 40, 150, 100, 40, { n: 4 });
    },
    u(g, lt) { X.stamp(g, lt, 0.0, '+1 ОПЫТ', 90, 74, { s: 3, out: 2.05 }); X.popup(g, lt, 1.75, '+1', 78, 52, { col: 'c', life: 0.6, rise: 8 }); },
    cam: (lt) => ({ z: 2, fx: 90, fy: GY }),
  },
  { // 6. Семь дней подряд: клетки недели загораются
    w(w, lt, t) { X.backdrop(w, t, Object.assign({ scroll: 260 + lt * 44 }, moonAt(36, 172, 1.333, 90))); X.hero(w, 90, GY, { pose: 'run', t, fire: 1.3 + X.pr(lt, 0.8, 1.4) * 0.5 }); },
    u(g, lt) {
      X.title(g, lt, 0.0, '*7 ДНЕЙ', 90, 56, { s: 3, out: 1.55 }); X.title(g, lt, 0.4, 'ПОДРЯД', 90, 90, { out: 1.55 });
      if (lt < 1.62) for (let i = 0; i < 7; i++) X.cell(g, 13 + i * 22, 122, 20, 26, { label: DAYS[i], state: lt >= ON7[i] ? 1 : 0, a: lt - ON7[i], t: lt });
    },
    cam: (lt) => ({ z: 1.333, fx: 90, fy: GY }),
  },
  { // 7. Новый уровень: луч, вспышка, огонь растёт
    w(w, lt, t) {
      X.backdrop(w, t, moonAt(150, 160, 1.5, 90)); const L = lt - 0.4;
      X.rays(w, 90, 204, t, { r: 92, col: P.f1, lvl: L > 0 ? 0.5 : 0.25 });
      if (L > -0.12 && L < 1.3) X.beam(w, 90, 0, GY, t, { w: 9 + Math.round(3 * (1 - X.pr(L, 0, 1.3))) });
      const lift = L > 0 && L < 0.7 ? Math.sin((Math.PI * L) / 0.7) * 8 : 0;
      X.hero(w, 90, GY - Math.round(lift), { pose: L > 0 ? 'cheer' : 'idle', t, fire: L < 0 ? 1.3 : 1.3 + 0.9 * X.eo(L / 0.5), white: L > 0 && L < 0.12, shadow: lift < 2 });
      X.burst(w, L, 90, 200, { n: 24, seed: 7, sp: 80 }); X.shock(w, L, 90, 204, { r: 40 });
      X.twinkles(w, t, 40, 150, 100, 60, { n: 4 });
    },
    u(g, lt) { X.title(g, lt, 0.0, 'НОВЫЙ', 90, 58, { out: 2.0 }); X.title(g, lt, 0.4, '*УРОВЕНЬ!', 90, 82, { out: 2.0 }); X.words(g, lt, 0.95, 'УР 1 → *УР_2', 90, 114, { al: 'c', out: 2.0 }); },
    cam: (lt) => ({ z: lt < 0.4 ? 1.5 : 1.667, fx: 90, fy: GY, shake: shk(lt, 0.4, 1.6) }),
  },
  { // 8. Пропустили день? Дождь, провал, минус жизнь
    w(w, lt, t) {
      X.backdrop(w, t, { sky: 'storm', gaps: [[88, 28]], moon: false });
      X.cloud(w, 50, 96, { w: 46, seed: 3, col: '#2c2c48', col2: '#1e1e35' }); X.cloud(w, 140, 120, { w: 40, seed: 5, col: '#2c2c48', col2: '#1e1e35' });
      X.rain(w, t, { n: 70 });
      const fall = lt - 0.75, x = fall < 0 ? 40 + (lt / 0.75) * 62 : 102, y = fall < 0 ? GY : GY + fall * fall * 420 + fall * 20;
      if (fall < 0) X.hero(w, x, y, { pose: 'run', t, fire: 1.2 });
      else {
        X.clip(w, [[0, 0, 180, GY], [88, GY, 28, 90]], () => X.hero(w, x, y, { pose: 'fall', t, fire: 0.6, shadow: false, white: fall < 0.15 && X.blink(t, 8) }));
        if (fall > 0.2) { const a = fall - 0.2; X.glow(w, 102, GY - 22, 16, P.red, 0.35); X.icon(w, 'cross', 102, GY - 22 - Math.round(X.eo(a / 0.2) * 6), { sc: 2 }); }
      }
    },
    u(g, lt) { X.title(g, lt, 0.05, 'ПРОПУСТИЛИ', 90, 58); X.title(g, lt, 0.7, '*ДЕНЬ?', 90, 82, { kc: 'r' }); },
    cam: (lt) => ({ z: 1.333, fx: 96, fy: GY, shake: shk(lt, 0.8, 1.5) }),
  },
  { // 9. Не страшно: возрождение из провала
    w(w, lt, t) {
      X.backdrop(w, t, Object.assign({ gaps: [[88, 28]] }, moonAt(48, 112, 2, 116))); const q = X.pr(lt, 0, 0.45);
      const x = X.lerp(102, 130, q), y = GY + 34 * (1 - q) - Math.sin(Math.PI * q) * 24;
      X.clip(w, [[0, 0, 180, GY], [88, GY, 28, 90]], () => X.hero(w, x, y, { pose: q < 1 ? 'jump' : 'idle', t, fire: 1.2, shadow: q >= 1, white: lt < 0.7 && X.blink(t, 6) }));
      X.dust(w, lt - 0.45, 130, GY);
    },
    u(g, lt) { X.title(g, lt, 0.05, 'НЕ *СТРАШНО', 90, 250, { kc: 'c', out: 0.88 }); },
    cam: (lt) => ({ z: 2, fx: 116, fy: GY }),
  },
  { // 10. Главное: не два подряд. Широкий провал и знак
    w(w, lt, t) {
      X.backdrop(w, t, Object.assign({ gaps: [[100, 44]] }, moonAt(30, 150, 1.333, 96)));
      X.rect(w, 89, GY - 16, 2, 16, P.ink); X.icon(w, 'warn', 90, GY - 22); if (X.blink(t, 2)) X.glow(w, 90, GY - 22, 13, P.red, 0.35);
      [0.6, 0.85].forEach((a, i) => { if (lt > a) { const bx = 111 + i * 22, by = GY - 8 - Math.round(X.eo((lt - a) / 0.2) * 6); X.rect(w, bx - 9, by - 9, 18, 18, P.red2); X.rect(w, bx - 8, by - 8, 16, 16, P.pit); X.icon(w, 'cross', bx, by); } });
      X.hero(w, lt > 0.6 ? 66 : 52 + lt * 23, GY, { pose: lt > 0.6 ? 'idle' : 'walk', t, fire: 1.2, eyes: lt > 0.6 ? 'o' : '' });
    },
    u(g, lt) { X.words(g, lt, 0.0, 'ГЛАВНОЕ:', 90, 52, { al: 'c', out: 2.2 }); X.title(g, lt, 0.6, 'НЕ *ДВА', 90, 68, { s: 3, kc: 'r', out: 2.2 }); X.title(g, lt, 1.1, 'ПОДРЯД!', 90, 104, { out: 2.2 }); },
    cam: (lt) => ({ z: 1.333, fx: 96, fy: GY, dx: lt * 0.5 }),
  },
  { // 11. Награждайте себя: сундук и подарки
    w(w, lt, t) {
      const op = lt - 0.35;
      X.backdrop(w, t, { sky: 'warm', moon: false, mid: (c) => { if (op > 0) X.rays(c, 108, GY - 14, t, { r: 84, col: P.f1, lvl: X.lerp(0.15, 0.45, X.eo(op / 0.4)) }); } });
      X.chest(w, 108, GY, X.pr(lt, 0.3, 0.46)); if (op > 0) X.glow(w, 108, GY - 14, 16, P.f0, 0.5);
      ITEMS.forEach((n, i) => { const a = lt - (0.5 + i * 0.25); if (a < 0) return; const q = X.eo(a / 0.35), tx = 86 + i * 22, x = X.lerp(108, tx, q), y = X.lerp(GY - 14, 184, q) - Math.sin(Math.PI * Math.min(1, a / 0.35)) * 12 + (a > 0.35 ? Math.round(Math.sin(t * 3 + i) * 1.2) : 0); X.icon(w, n, x, y, { sc: 2 }); if (a < 0.3) X.sparkle(w, x + 11, y - 10, a / 0.3); });
      X.hero(w, 66, GY, { pose: op > 0.1 ? 'cheer' : 'idle', t, fire: 1.6 });
    },
    u(g, lt) { X.title(g, lt, 0.05, 'НАГРАЖДАЙТЕ', 90, 56, { out: 2.45 }); X.title(g, lt, 0.75, '*СЕБЯ!', 90, 82, { s: 3, out: 2.45 }); },
    cam: (lt) => ({ z: 1.667, fx: 92, fy: GY }),
  },
  { // 12. Этап пройден: флаг-чекпойнт
    w(w, lt, t) {
      X.backdrop(w, t, Object.assign({ scroll: 40 }, moonAt(30, 140, 1.667, 100))); const up = X.eo(X.pr(lt, 0.1, 0.55));
      X.flag(w, 116, GY, t, { h: 50, up, col: P.green, dk: P.green2, mark: 'star' });
      X.shock(w, lt - 0.55, 126, GY - 44, { r: 24, col: P.f1, col2: P.green }); X.burst(w, lt - 0.55, 126, GY - 44, { n: 14, seed: 12, sp: 55 });
      X.hero(w, 82, GY, { pose: lt > 0.55 ? 'cheer' : 'idle', t, fire: 1.8 });
    },
    u(g, lt) { X.stamp(g, lt, 0.0, 'ЭТАП', 90, 68, { s: 3, box: true, out: 1.45 }); X.title(g, lt, 0.35, '*ПРОЙДЕН', 90, 94, { kc: 'g', out: 1.45 }); },
    cam: (lt) => ({ z: 1.667, fx: 100, fy: GY }),
  },
  { // 13. Через месяц: смена дней и ночей, календарь наполняется
    w(w, lt, t) {
      const pal = PALS[Math.floor(lt * 2.6) % 4], ph = (lt * 2.6) % 1;
      X.backdrop(w, t, { sky: pal, scroll: lt * 120, moon: pal === 'night', mx: 150, my: 196, sun: pal === 'day' ? [Math.round(30 + ph * 120), 196] : null, castle: false });
      X.speed(w, t, { y: 200, h: 26, sp: 320, col: pal === 'day' ? '#ffffff' : P.star3 });
      X.hero(w, 90, GY, { pose: 'run', t, fire: 1.9 });
    },
    u(g, lt) {
      X.words(g, lt, 0.0, 'ЧЕРЕЗ', 90, 50, { al: 'c', out: 2.3 }); X.title(g, lt, 0.4, '*МЕСЯЦ', 90, 62, { s: 3, out: 2.3 });
      if (lt > 0.15 && lt < 2.45) { X.panel(g, 14, 98, 152, 78); for (let j = 0; j < 30; j++) { const x = 21 + (j % 6) * 23, y = 105 + Math.floor(j / 6) * 13, a = lt - (0.35 + j * 0.055); X.rect(g, x, y, 21, 11, P.ink); X.rect(g, x + 1, y + 1, 19, 9, a < 0 ? P.uiD : a < 0.07 ? P.white : P.gold2); if (a >= 0.07) { X.rect(g, x + 1, y + 1, 19, 4, P.gold); X.px(g, x + 2, y + 2, P.white); } } }
    },
    cam: (lt) => ({ z: 1, fx: 90, fy: GY }),
  },
  { // 14. Суперсила: аура, вихрь, молнии
    w(w, lt, t) {
      X.backdrop(w, t, { sky: 'magic', moon: false, castle: false }); X.rays(w, 90, 212, t, { r: 96, col: P.violet, lvl: 0.45 });
      X.glow(w, 90, GY, 30, P.cyan, 0.4); X.magic(w, t, 90, 212, 36, { n: 34 });
      const k = X.fr(t, 9, 4); if (k < 2) { X.bolt(w, 58, 182, 74, 214, 3 + Math.floor(t * 9), { col: P.violet }); X.bolt(w, 122, 180, 106, 212, 7 + Math.floor(t * 9), { col: P.cyan }); }
      X.hero(w, 90, GY, { pose: 'power', t, fire: 3, aura: 1 });
      X.burst(w, lt - 0.2, 90, 204, { n: 26, seed: 21, sp: 80, cols: [P.white, P.ice, P.cyan, P.violet] });
    },
    u(g, lt) { X.words(g, lt, 0.0, 'ВАША', 90, 50, { al: 'c', out: 1.5 }); X.title(g, lt, 0.1, '*СУПЕРСИЛА', 90, 62, { out: 1.5 }); },
    cam: (lt) => ({ z: 2, fx: 90, fy: GY, shake: shk(lt, 0.15, 1.6, 0.4) }),
  },
  { // 15. Игра началась: титульный экран, кнопка «Старт»
    w(w, lt, t) { X.backdrop(w, t, { mx: 90, my: 196, mr: 15 }); X.hero(w, 90, GY, { pose: 'idle', t, fire: 3 }); X.twinkles(w, t, 20, 150, 140, 40, { n: 4 }); X.fireflies(w, t, { y: 196, h: 30 }); },
    u(g, lt) {
      X.title(g, lt, 0.15, '*ИГРА', 90, 52, { s: 3 }); X.title(g, lt, 0.55, 'НАЧАЛАСЬ', 90, 88);
      if (lt > 1.35) { const a = lt - 1.35, by = 118 + Math.round((1 - X.eb(a / 0.3)) * 24); X.button(g, 45, by, 90, 26, '▶ СТАРТ'); }
      if (lt > 1.6) { const q = X.eo(X.pr(lt, 1.6, 1.95)); X.icon(g, 'hand', Math.round(X.lerp(156, 112, q)), Math.round(X.lerp(196, 144, q))); }
    },
    cam: (lt) => ({ z: 1.5, fx: 90, fy: GY }),
  },
  { // 16. Нажмите «Старт» уже сегодня: финальный кадр
    w(w, lt, t) {
      X.backdrop(w, t, { mx: 90, my: 196, mr: 15 }); const j = lt > 0.2 && lt < 1.4 ? Math.abs(Math.sin((lt - 0.2) * 7.85)) * 9 : 0;
      X.hero(w, 90, GY - Math.round(j), { pose: lt > 0.2 ? (j > 2 ? 'jump' : 'cheer') : 'idle', t, fire: 3, shadow: j < 2 });
      X.twinkles(w, t, 20, 150, 140, 40, { n: 6 }); X.fireflies(w, t, { y: 190, h: 36, n: 12 });
    },
    u(g, lt, t) {
      X.title(g, 9, 0, '*ИГРА', 90, 52, { s: 3 }); X.title(g, 9, 0, 'НАЧАЛАСЬ', 90, 88);
      const down = lt > 0.03 && lt < 0.22; if (lt > 0.22) X.glow(g, 90, 131, 50, P.f1, 0.28 + 0.1 * Math.sin(t * 5));
      X.button(g, 45, 118, 90, 26, '▶ СТАРТ', { down });
      X.burst(g, lt - 0.05, 90, 131, { n: 22, seed: 31, sp: 95, g: 60 }); X.shock(g, lt - 0.05, 90, 131, { r: 58, col: P.f1, col2: P.white });
      if (lt < 0.5) X.icon(g, 'hand', 112, 144 + (down ? 2 : 0) + Math.round(X.ei(X.pr(lt, 0.25, 0.5)) * 70));
      X.title(g, lt, 0.45, 'УЖЕ *СЕГОДНЯ', 90, 250);
    },
    cam: (lt) => ({ z: 1.5, fx: 90, fy: GY }),
  },
];

function draw(t, k) {
  X.run(t, k, { cuts: CUTS, tr: TR, scenes: SC, irisAt: [90, 206], hud: (g, t) => X.hud(g, hudAt(t)) });
}

function sound(s) {
  const p = (t, n, v = 0.14, pitch) => s.play(t, n, v, pitch ? { pitch } : undefined);
  p(0.05, 'pop_high', 0.16); p(0.6, 'pop_soft', 0.14);
  p(2.2, 'magic', 0.16); p(2.47, 'toggle_on', 0.11); p(3.3, 'pop_double', 0.2);
  p(4.4, 'marimba_run', 0.14); p(6.3, 'woodblock', 0.18); p(8.2, 'success', 0.15);
  p(8.8, 'kalimba_run', 0.12); p(9.4, 'wood', 0.15); p(9.9, 'wood', 0.15, 1.12); p(10.4, 'wood', 0.15, 1.26);
  p(11.0, 'pop_high', 0.18); p(12.75, 'counter', 0.12);
  p(14.0, 'kalimba', 0.13); p(14.25, 'kalimba', 0.13, 1.12); p(14.5, 'kalimba', 0.14, 1.26); p(15.3, 'fanfare_soft', 0.17);
  p(17.85, 'bubble_down', 0.13); p(17.95, 'error_soft', 0.15); p(18.6, 'bubble', 0.13, 1.2); p(19.6, 'notify', 0.12); p(20.2, 'rim', 0.16);
  p(22.35, 'magic', 0.15); p(24.7, 'success3', 0.16); p(26.65, 'odometer', 0.11);
  p(28.8, 'magic', 0.17); p(29.0, 'ta_da', 0.15);
  p(30.7, 'marimba_run', 0.12); p(32.05, 'pop_soft', 0.11); p(32.75, 'click', 0.2); p(32.85, 'success', 0.16);
}
