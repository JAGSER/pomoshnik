// Демо «Открытие кофейни «Зерно»»: только SWISS и обычный canvas. Герой: кофейное зерно.
const S = SWISS, P = S.P;
const NAMES = ['СУББОТА', 'ОБЖАРКА', 'СОРТА', 'БАРИСТА', 'ВЫПЕЧКА', 'ПОДАРОК', 'АДРЕС', 'ЗЕРНО'];
const ORIG = [['Эфиопии', 'Эфиопия', 9, 39, '09°N 39°E'], ['Колумбии', 'Колумбия', 4, -74, '04°N 74°W'], ['Бразилии', 'Бразилия', -12, -52, '12°S 52°W']];
let LAST = { x: 540, y: 1130 }; // точка, из которой растёт следующий iris (считается в кадре заново)

const SC = [
  { at: 0, field: 'black', draw: (g, lt, s) => { // СУББОТА: зерно падает, кольца, текст по кругу
    S.rings(g, 540, 1130, 200, { lt, col: P.cream, n: 5, gap: 30, alpha: .32 });
    S.ringText(g, 'СКОРО ОТКРЫТИЕ · СУББОТА · САДОВАЯ · ', 540, 1130, 340, 30, { col: P.cream, acc: P.red, p: S.eo(S.pr(lt, .15, 1.2)), spin: 16, lt });
    S.beanPop(g, lt, 0, 540, 1130, 150, { col: P.red, groove: P.black, rot: -16 + Math.sin(lt * 2) * 5 });
    S.wide(g, 'Суббота', 540, 560, 175, { lt, t0: .06, col: P.cream });
    S.serif(g, 'на *Садовой', 540, 690, 86, { lt, ts: [s.w('на'), s.w('Садовой')], col: P.cream, acc: P.red, al: 'center' });
  } },
  { at: [0, 'открывается'], field: 'red', tr: 'iris', x: 540, y: 1130, draw: (g, lt, s) => { // ЗЕРНО.
    const tz = s.w('Зерно') - .06;
    S.serif(g, 'открывается', 96, 500, 92, { lt, t0: 0, col: P.cream });
    S.rule(g, 96, 590, 984, S.pr(lt, .05, .5), { col: P.ink, bl: 'КОФЕЙНЯ · ОТКРЫТИЕ', br: 'СБ · САДОВАЯ' });
    S.caps(g, 'кофейня', 540, 830, 62, { lt, t0: s.w('кофейня'), col: P.ink });
    const r = S.wide(g, 'Зерно', 490, 1130, 260, { lt, t0: tz, col: P.ink, max: 800 });
    const q = S.sp(lt - tz - .3, 'snap'), rot = -16 + lt * 40 * (1 - S.cl(q));
    const by0 = S.track(lt, [[0, 1130], [.12, 1410]], 'snap'), br0 = S.track(lt, [[0, 150], [.12, 112]], 'snap');
    const br = S.lerp(br0, r.size * .13, q), bx = S.lerp(540, r.x1 + r.size * .2, q), by = S.lerp(by0, 1130 - br * .95, q) - Math.sin(Math.PI * S.cl(q)) * 170;
    S.transformBox(g, bx, by, br * 1.7 + 50, br * 2 + 50, { a: S.pr(lt, .25, .45) * (1 - S.pr(lt, tz + .2, tz + .35)), rot, col: P.cream, label: 'ЗЕРНО 01\nROT ' + String(Math.round((rot % 360 + 360) % 360)).padStart(3, '0') + '°' });
    S.bean(g, bx, by, br, { col: P.cream, groove: P.red, rot });
    S.rule(g, 96, 1290, 984, S.pr(lt, tz + .2, tz + .6), { col: P.ink });
  } },
  { at: 4.6, field: 'cream', tr: 'wipe', dir: 'up', band: P.red, draw: (g, lt, s) => { // ОБЖАРКА: три строки из A в B
    S.serif(g, 'Обжариваем зерно *сами', 96, 400, 82, { lt, ts: [s.w('Обжариваем'), s.w('зерно'), s.w('сами')], col: P.ink, acc: P.red, max: 888, lines: 1 });
    S.mono(g, 'ОБЖАРКА · ИЗ A В B', 96, 520, 26, { lt, t0: .3, type: true, col: P.ink });
    [['СВЕТЛАЯ', .35, S.eo, .3, '180°'], ['СРЕДНЯЯ', .6, S.eio, .62, '205°'], ['ТЁМНАЯ', .85, p => S.eb(p, 1.4), .98, '230°']].forEach(([lab, t0, ease, end, deg], i) => {
      const y = 800 + i * 290, p = S.pr(lt, t0, t0 + 1.05); if (lt < t0 - .25) return;
      g.save(); g.globalAlpha = S.cl((lt - t0 + .25) / .2);
      S.easeRow(g, 96, y, 888, lab, p, { ease, size: 46, col: P.ink, end: deg, endT: t0 + 1.05, lt, item: (gg, x, yy, q) => S.bean(gg, x, yy, 48, { roast: .12 + q * end, rot: 74, line: P.ink, lw: 3, groove: q * end > .7 ? P.cream : P.ink }) });
      g.restore();
    });
  } },
  { at: [1, 'каждую'], field: 'blue', draw: (g, lt, s) => { // КАЖДУЮ НЕДЕЛЮ: трюше, барабан, 7 дней
    S.truchet(g, { lt, size: 135, col: P.blueD, col2: P.blueD, beats: [0, s.w('неделю')], x: 540, y: 1150 });
    const e = S.sp(lt + .06, 'pop'); g.fillStyle = P.cream; g.beginPath(); g.arc(540, 1150, 250 * e, 0, Math.PI * 2); g.fill();
    S.rings(g, 540, 1150, 270, { lt, col: P.cream, n: 3, gap: 22, alpha: .5, period: 0 });
    const hi = Math.floor(lt * 5) % 7;
    S.orbit(g, 540, 1150, 380, 7, { lt, t0: .05, stag: .05, spin: 12, rot: -90 }, (g, x, y, i, e2) => {
      g.fillStyle = i === hi ? P.yellow : P.cream; g.beginPath(); g.arc(x, y, (i === hi ? 22 : 15) * Math.max(0, e2), 0, Math.PI * 2); g.fill();
      S.mono(g, ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'][i], x, y + 56, 28, { col: P.cream, al: 'center', bold: true, alpha: S.cl(e2) }); });
    S.bean(g, 540, 1150, 120 * e, { col: P.black, groove: P.cream, rot: lt * 220, flip: .55 + .45 * Math.cos(lt * 9) });
    S.wide(g, 'Каждую', 540, 520, 170, { lt, t0: 0, col: P.cream });
    S.serif(g, '*неделю', 540, 660, 92, { lt, t0: s.w('неделю'), col: P.cream, acc: P.yellow, al: 'center' });
  } },
  { at: 8.3, field: 'black', tr: 'tiles', draw: (g, lt, s) => { // 12 СОРТОВ: счётчик и кольцо из 12 зёрен
    S.dotPlane(g, { lt, horizon: 1300, alpha: .35, col: P.cream });
    const t0 = s.w('Двенадцать') - .02, v = 12 * S.eo(S.pr(lt, t0, t0 + .95));
    S.serif(g, 'двенадцать', 540, 400, 86, { lt, t0, col: P.cream, al: 'center' });
    S.odo(g, v, 2, 540, 1150, 400, { col: P.cream });
    S.orbit(g, 540, 1000, 410, 12, { lt, t0: t0 + .05, stag: .075, spin: 10, rot: -90 }, (g, x, y, i, e, a) =>
      S.bean(g, x, y, 36 * Math.max(0, e), { col: [P.cream, P.yellow, P.red][i % 3], groove: P.black, rot: a * 180 / Math.PI + 90 }));
    S.wide(g, 'сортов', 540, 1590, 150, { lt, t0: s.w('сортов'), col: P.red });
  } },
  { at: [2, 'Эфиопии'], field: 'blue', tr: 'slide', draw: (g, lt, s) => { // СТРАНЫ: точечная сфера поворачивается
    const T = ORIG.map(o => s.w(o[0]));
    const lon = S.track(lt, [[-.5, 110], [0, ORIG[0][3]], [T[1], ORIG[1][3]], [T[2], ORIG[2][3]]], 'soft');
    const lat = S.track(lt, [[-.5, 0], [0, 6], [T[1], 2], [T[2], -8]], 'soft');
    const M = S.globe(g, 540, 1200, 360, { lon, tilt: -lat, col: P.cream, marks: ORIG.map(o => ({ lat: o[2], lon: o[3] })) });
    let act = -1; T.forEach((t0, i) => { if (lt >= t0 - .05) act = i; });
    ORIG.forEach((o, i) => { if (lt < T[i] - .05) return; const m = M[i]; if (!m.front) return;
      const e = S.sp(lt - T[i], 'pop'); g.fillStyle = P.red; g.beginPath(); g.arc(m.x, m.y, 22 * e, 0, Math.PI * 2); g.fill();
      const q = ((lt - T[i]) * 1.2) % 1; g.strokeStyle = P.red; g.lineWidth = 5; g.globalAlpha = 1 - q; g.beginPath(); g.arc(m.x, m.y, 22 + q * 80, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; });
    ORIG.forEach((o, i) => { if (lt < T[i] - .05) return; const y = 360 + i * 150;
      const r = S.wide(g, o[1], 96, y, 124, { lt, t0: T[i] - .05, mode: 'slide', al: 'left', col: i === act ? P.cream : S.rgba(P.cream, .38), max: 780 });
      if (i === act && M[i].front) S.annot(g, M[i].x, M[i].y, 640, 790, o[4], { p: S.pr(lt, T[i] + .1, T[i] + .45), col: P.yellow, size: 26 }); });
  } },
  { at: 13.0, field: 'black', draw: (g, lt, s) => { // ЧЕМПИОН: зерно морфится в звезду со шлейфом
    const p = S.sp(lt - .3, 'pop'), rot = -16 + 106 * S.eo(S.pr(lt, .3, 1.1)) + lt * 5, cy = 1110, r0 = 270 * S.sp(lt + .04, 'pop');
    for (let k = 4; k >= 1; k--) S.morph(g, 540, cy, r0, 'bean', 'star', S.cl(p), { rot: rot - k * 9 * (1 - S.pr(lt, .9, 1.4)), fill: S.rgba(P.red, .16 * (5 - k)) });
    S.morph(g, 540, cy, r0, 'bean', 'star', p, { rot, fill: P.cream });
    S.orbit(g, 540, cy, 450, 12, { lt, t0: .55, stag: .04, spin: 9 }, (g, x, y, i, e) => S.star(g, x, y, 24 * Math.max(0, e), { fill: P.yellow, rot: lt * 40 }));
    S.serif(g, 'бариста', 540, 330, 84, { lt, t0: s.w('Бариста'), col: P.cream, al: 'center' });
    S.wide(g, 'Чемпион', 540, 520, 170, { lt, t0: s.w('Бариста') + .35, col: P.cream });
    const tg = s.w('города'); if (lt > tg) { g.save(); g.translate(540, cy + 10); const e = S.sp(lt - tg, 'pop'); g.scale(e, e); S.wide(g, '№1', 0, 40, 110, { lt, t0: tg, col: P.black, max: 230 }); g.restore(); }
  } },
  { at: [3, 'идеальный'], field: 'red', tr: 'iris', x: 540, y: 1110, draw: (g, lt, s) => { // КАПУЧИНО: чашка сверху в рамке
    const e = S.sp(lt, 'pop'), rot = -24 + lt * 14, cy = 860;
    g.save(); g.translate(520, cy); g.scale(S.lerp(.6, 1, e), S.lerp(.6, 1, e)); S.cupTop(g, 0, 0, 205, { rot, art: S.pr(lt, .35, 1.3), coffee: P.ink, crema: P.yellow, milk: P.cream }); g.restore();
    S.transformBox(g, 520, cy, 640, 640, { a: S.pr(lt, .15, .4), rot: rot * .35, col: P.cream, label: 'КАПУЧИНО\nROT ' + String(Math.round((rot * .35 + 360) % 360)).padStart(3, '0') + '°' });
    S.serif(g, '*идеальный', 96, 1390, 92, { lt, t0: 0, col: P.cream, acc: P.cream });
    S.wide(g, 'Капучино', 540, 1580, 150, { lt, t0: s.w('капучино') - .05, col: P.ink });
  } },
  { at: 17.9, field: 'yellow', tr: 'wipe', dir: 'left', band: P.blue, draw: (g, lt, s) => { // ВЫПЕЧКА: круассан из долек
    S.croissant(g, 540, 1090, 1.2, { lt, t0: .15, stag: .06, rot: Math.sin(lt * 2) * 3, cols: [P.cream, '#F08A2E'] });
    if (lt > .6) S.steam(g, 540, 870, 150, lt, { col: P.ink, lw: 8 });
    S.serif(g, 'свежая', 96, 360, 88, { lt, t0: s.w('Свежая'), col: P.ink });
    S.wide(g, 'Выпечка', 540, 540, 170, { lt, t0: s.w('выпечка'), col: P.ink });
    S.rule(g, 96, 1440, 984, S.pr(lt, s.w('каждое') - .1, s.w('каждое') + .4), { col: P.ink, ticks: true });
    S.caps(g, 'каждое утро', 540, 1540, 56, { lt, t0: s.w('каждое'), col: P.ink });
  } },
  { at: [4, 'с семи'], field: 'cream', draw: (g, lt, s) => { // 07:00: стрелки докручиваются
    const hv = S.lerp(4.4, 7, S.sp(lt - .05, 'pop'));
    const ce = S.sp(lt + .05, 'pop'); g.save(); g.translate(540, 760); g.scale(ce, ce);
    S.clock(g, 0, 0, 320, hv, (hv * 60) % 60, { col: P.ink, face: P.white, acc: P.red, sec: 10 + lt * 6 });
    S.bean(g, 0, 0, 30, { col: P.black, groove: P.red, rot: 0 }); g.restore();
    S.wide(g, '07:00', 540, 1420, 230, { lt, t0: 0, col: P.ink });
    S.serif(g, 'с *семи часов', 540, 1570, 84, { lt, ts: [s.w('с'), s.w('семи'), s.w('часов')], col: P.ink, acc: P.red, al: 'center' });
  } },
  { at: 21.8, field: 'blue', tr: 'bands', n: 5, draw: (g, lt, s) => { // ПОДАРОК: вторая чашка в подарок
    const t2 = s.w('второй'), tg = s.w('подарок');
    S.caps(g, 'день открытия', 540, 330, 52, { lt, t0: s.w('день'), col: P.cream, out: tg });
    S.wide(g, 'Второй кофе', 540, 520, 130, { lt, t0: t2, col: P.cream });
    const e1 = S.sp(lt - .12, 'pop'), cx1 = S.track(lt, [[0, 540], [t2, 270]], 'snap'), k1 = S.track(lt, [[0, 1.1], [t2, .8]], 'snap');
    if (lt > .12) { g.save(); g.translate(cx1, 1300); g.scale(e1 * k1, e1 * k1); S.cup(g, 0, 0, 1, { col: P.cream, band: P.red, coffee: P.ink, lt }); g.restore(); }
    if (lt > t2) { const e = S.sp(lt - t2, 'pop'); S.wide(g, '+', 505, 1150, 150, { lt, t0: t2 + .1, col: P.yellow, max: 120 });
      const drop = S.sp(lt - tg, 'pop'), gy = S.lerp(-700, 0, S.cl(drop));
      if (lt < tg + .25) { g.save(); g.translate(760, 1300); g.scale(e * .8, e * .8); S.cup(g, 0, 0, 1, { col: P.cream, band: P.yellow, coffee: P.ink, lt }); g.restore(); }
      if (lt > tg) { S.gift(g, 760, 1310 + gy, 280, 260, { p: S.pr(lt, tg + .1, tg + .7), col: P.red, rib: P.yellow });
        S.ringText(g, 'ПОДАРОК · 1+1 · ПОДАРОК · 1+1 · ', 760, 1165, 212, 28, { col: P.cream, acc: P.yellow, p: S.eo(S.pr(lt, tg + .2, tg + .8)), spin: -20, lt });
        S.specks(g, 760, 1150, lt - tg - .18, { seed: 4, cols: [P.yellow, P.cream, P.red] }); } }
    S.serif(g, 'в *подарок', 540, 1560, 96, { lt, t0: tg, col: P.cream, acc: P.yellow, al: 'center' });
  } },
  { at: 25.5, field: 'cream', tr: 'wipe', dir: 'down', band: P.blue, draw: (g, lt, s) => { // САДОВАЯ, 15: карта и булавка
    const t15 = s.w('пятнадцать'), path = [96, 1440, 420, 1250, 700, 1090, 984, 920];
    S.mapGrid(g, 96, 760, 984, 1500, { p: S.pr(lt, 0, 1.1), step: 176, lw: 12, alpha: .8 });
    S.tube(g, path, S.eo(S.pr(lt, .15, 1.0)), { w: 46, cols: [P.ink, P.red, P.cream, P.red] });
    if (lt > .9) { g.save(); g.translate(330, 1290); g.rotate(Math.atan2(-190, 324)); S.mono(g, 'УЛ. САДОВАЯ', 0, -40, 28, { col: P.ink, bold: true, lt, t0: .9, type: true }); g.restore(); }
    const pe = S.sp(lt - t15, 'pop'); if (lt > t15) S.pin(g, 640, 1120 - (1 - S.cl(pe)) * 500, 58, { col: P.red, inner: P.cream });
    if (lt > t15 + .15) S.plate(g, 820, 930, '15', 120, { e: S.sp(lt - t15 - .15, 'pop'), bg: P.blue, col: P.cream });
    S.wide(g, 'Садовая', 540, 560, 170, { lt, t0: s.w('Садовая'), col: P.ink });
  } },
  { at: [6, 'Ждём'], field: 'black', draw: (g, lt, s) => { // 08-22: цифры катятся, шкала суток заполняется
    const t8 = s.w('восьми'), td = s.w('до'), t22 = s.w('двадцати');
    S.dotGrid(g, { lt, step: 60, r: 3, col: P.cream, acc: P.red, alpha: .3, waves: [{ x: 360, y: 800, t0: t8 - .1 }, { x: 760, y: 800, t0: t22 - .1 }] });
    S.serif(g, 'ждём', 540, 420, 100, { lt, t0: -.08, col: P.cream, al: 'center' });
    const a = S.odo(g, 8 * S.eo(S.pr(lt, t8 - .1, t8 + .5)), 2, 455, 880, 220, { col: P.cream, al: 'right', lt, t0: t8 - .3 });
    if (lt > td - .1) { g.fillStyle = P.red; const q = S.eo(S.pr(lt, td - .1, td + .2)); g.fillRect(540 - 44 * q, 880 - 104, 88 * q, 30); }
    const b = S.odo(g, 22 * S.eo(S.pr(lt, t22 - .1, t22 + .6)), 2, 625, 880, 220, { col: P.cream, al: 'left', lt, t0: td - .1 });
    if (lt > t22 + .5) S.beanPop(g, lt, t22 + .5, b.x1 + 40, 880 - 32, 32, { col: P.red, groove: P.black, rot: -20 });
    S.mono(g, 'ЧАСЫ РАБОТЫ', 120, 1250, 28, { col: P.cream, bold: true, lt, t0: .3, type: true });
    const pr = S.pr(lt, t8, t22 + .6), rr = S.ruler(g, 120, 1440, 840, { n: 24, a: 8, b: 22, p: pr, d: S.pr(lt, .1, .7), col: P.cream, fill: P.red });
    if (pr > 0) S.bean(g, rr.xa + (rr.xb - rr.xa) * S.eo(pr), 1440 - 120, 30, { col: P.cream, groove: P.black, rot: lt * 160 });
  } },
  { at: 30.3, field: 'red', tr: 'iris', x: 960, y: 850, draw: (g, lt, s) => { // ФИНАЛ: знак + ЗЕРНО, плашка «ЛУЧШИЙ КОФЕ»
    const tc = s.w('Приходите'), up = -200 * S.sp(lt - tc, 'soft');
    g.save(); g.translate(0, up);
    S.serif(g, 'кофейня', 96, 640, 88, { lt, t0: s.w('Кофейня'), col: P.cream, out: tc });
    S.lockup(g, 540, 860, 210, 'Зерно', { lt, t0: s.w('Зерно') - .1, col: P.ink, mark: P.ink, groove: P.red, max: 900 });
    S.rule(g, 96, 950, 984, S.pr(lt, s.w('Зерно') + .3, s.w('Зерно') + .8), { col: P.ink, bl: 'САДОВАЯ 15', br: '08:00-22:00' });
    g.restore();
    if (lt > tc) { const py = S.lerp(1960, 1080, S.sp(lt - tc, 'snap')); g.fillStyle = P.cream; g.fillRect(96, py, 888, 520);
      g.save(); g.beginPath(); g.rect(96, py, 888, 520); g.clip();
      S.serif(g, 'приходите за', 540, py + 130, 78, { lt, ts: [tc + .1, s.w('за')], col: P.ink, al: 'center' });
      S.wide(g, 'Лучший кофе', 540, py + 315, 130, { lt, t0: s.w('лучшим'), col: P.ink, max: 800 });
      S.serif(g, 'в *городе', 540, py + 450, 88, { lt, t0: s.w('городе'), col: P.ink, acc: P.red, al: 'center' });
      g.restore();
      const se = S.sp(lt - tc - .5, 'pop'); if (lt > tc + .5) { g.save(); g.translate(905, py - 62); g.rotate((1 - S.cl(se)) * -1.2); g.scale(se * .85, se * .85);
        g.fillStyle = P.ink; g.beginPath(); g.arc(0, 0, 118, 0, Math.PI * 2); g.fill(); S.ringText(g, 'ОТКРЫТО · ОТКРЫТО · ОТКРЫТО · ', 0, 0, 88, 24, { col: P.cream, acc: P.red, spin: 30, lt });
        S.bean(g, 0, 0, 38, { col: P.red, groove: P.ink, rot: -16 }); g.restore(); } }
  } },
];

function draw(t, k) {
  const g = S.begin(t, k), s = S.play(g, t, SC), sub = k.sub(t);
  S.grain(g, .9);
  S.hud(g, t, { field: s.f, title: 'КОФЕЙНЯ ЗЕРНО · ПЛАКАТ', chap: sub.i, chapAt: sub.t0, total: 8, name: NAMES[sub.i] });
}

function sound(s) {
  const at = (i, w) => SWISS.at(i, w, s.subs), C = SWISS.cutTimes(SC, s.subs), E = [
    [0.02, 'drop', .16], [at(0, 'Садовой'), 'kalimba', .1],                                   // зерно падает, «Садовой»
    [C[1], 'marimba_run', .18], [at(0, 'Зерно') - .06, 'pop_double', .17],                    // iris → ЗЕРНО.
    [C[2], 'bamboo', .15], [C[2] + .35, 'tick', .1], [C[2] + .85, 'tick', .1, 1.3],           // шторка, строки обжарки
    [C[3], 'rim', .16], [at(1, 'неделю'), 'kalimba', .1, 1.2],                                // синее поле, трюше переворачивается
    [C[4], 'marimba_run', .17], [at(2, 'Двенадцать'), 'counter', .12],                        // плитки, счётчик 1→12
    [C[5], 'toggle_on', .14], [at(2, 'Колумбии'), 'pop_high', .11], [at(2, 'Бразилии'), 'pop_high', .11, 1.2],
    [C[6], 'rim', .16], [C[6] + .3, 'magic', .13], [at(3, 'города'), 'woodblock', .12],     // морф в звезду, №1
    [C[7], 'marimba_run', .17], [C[8], 'kalimba_run', .16], [C[8] + .2, 'pop_soft', .12],   // капучино, выпечка
    [C[9], 'tick', .14, .9], [C[10], 'marimba_run', .16],                                    // 07:00, подарок
    [at(5, 'второй'), 'pop_high', .14], [at(5, 'подарок'), 'pop_double', .16], [at(5, 'подарок') + .2, 'ta_da', .14],
    [C[11], 'key_soft', .14], [at(6, 'пятнадцать'), 'drop', .15],                           // карта, булавка
    [C[12], 'rim', .15], [at(6, 'восьми') - .1, 'odometer', .12], [at(6, 'двадцати') - .1, 'odometer', .12, 1.15],
    [C[13], 'marimba_run', .17], [at(7, 'Зерно') - .1, 'pop_double', .16], [at(7, 'Приходите'), 'success', .15], [at(7, 'Приходите') + .5, 'sparkle', .12],
  ];
  E.forEach(([t, n, v, pitch]) => s.play(t, n, v, pitch ? { pitch } : {}));
}
