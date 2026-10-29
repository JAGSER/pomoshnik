// Демо «Путь посылки: от склада до двери»: только через ISO и обычный canvas.
// Сквозной герой: крафтовая посылка с голубым маяком отслеживания. Трекер вверху рассказывает этап, статус и время в пути.
const P = ISO.P;
const CUTS = [0, 3.7, 5.8, 8.2, 11.0, 12.4, 15.0, 17.1, 19.65, 21.6, 25.6, 28.15, 30.8, 32.2]; // фразы + ключевые слова
const CLK = [[0, 0], [0.9, 0], [3.7, 3], [4.15, 12], [5.8, 20], [8.2, 26], [8.65, 48], [11.0, 60], [12.4, 66], [12.9, 220], [17.1, 250], [17.6, 480],
  [19.65, 650], [20.1, 750], [21.6, 790], [22.1, 1160], [25.6, 1172], [26.1, 1400], [28.15, 1405], [28.6, 1407], [30.8, 1410], [31.2, 1417]];
const STAGE = [[0, 0], [3.7, 0], [4.1, 1], [8.2, 1], [8.6, 2], [12.4, 2], [12.8, 3], [17.1, 3], [17.5, 4], [21.6, 4], [22, 5], [30.8, 5], [31.2, 6]];
const STATUS = [[0, 'оформлен', P.cyan], [3.7, 'на складе', P.cyan], [8.2, 'упаковка', P.cyan], [12.4, 'сортировка', P.cyan], [17.1, 'в пути', P.cyan],
  [21.6, 'у курьера', P.cyan], [26.3, 'курьер в пути', P.cyan], [30.8, 'у двери', P.cyan], [33.85, 'доставлен', P.green]];

// 1. «Купить» → посылка падает в мир, от неё уходит маршрут
function sBuy(g, lt) {
  ISO.bg(g);
  const click = .85, press = ISO.pr(lt, click, click + .07) * (1 - ISO.pr(lt, click + .14, click + .32)), gone = ISO.pr(lt, 1.44, 1.58);
  ISO.cam(g, lt, { kick: 0, z: ISO.lerp(1.07, 1, ISO.eo(ISO.pr(lt, 1.55, 2.7))), cy: 1150 }, g => {
    ISO.view(540, 1200, 1);
    ISO.slab(g, -250, -250, -24, 500, 500, 24, { grid: 50, p: ISO.eo(ISO.pr(lt, .05, .9)) });
    const R = ISO.floorPts([[70, 0], [200, 0], [200, -170], [380, -170], [380, -380], [660, -380]]);
    if (lt > 1.9) {
      const p = ISO.eo(ISO.pr(lt, 2.0, 3.4)), h = ISO.trace(g, R, p, P.cyan, 4, { dash: [16, 12], off: -lt * 40 });
      if (h) ISO.glow(g, h[0], h[1], 46, P.cyan, .8);
      [.16, .33, .5, .66, .82].forEach(u => { if (p >= u) { const a = ISO.along(R, u); ISO.node(g, a[0], a[1], 9, { p: ISO.pr(lt, 2.0 + u * 1.4, 2.25 + u * 1.4) }); } });
    }
    if (lt >= 1.58) { const z = ISO.fall(lt, 1.58, 400, .4), c = ISO.pt(0, 0, z + 48); ISO.pop(g, lt, 1.58, c[0], c[1], g => ISO.parcel(g, 0, 0, z, 1.05, { hi: ISO.eo(ISO.pr(lt, 2.0, 2.4)), lt, floor: 0 }), { from: .5 }); }
  });
  if (gone < 1) {
    const bx = 540, by = 770, w = 620, h = 184, dep = 26 * (1 - press * .85);
    ISO.pop(g, lt, 0, bx, by, g => {
      const s = 1 - .7 * ISO.ei(gone); g.translate(bx, by); g.scale(s, s); g.translate(-bx, -by); g.globalAlpha *= 1 - gone;
      ISO.glow(g, bx, by + 30, 430, P.cyan, .22 + press * .35, 170);
      ISO.rr(g, bx - w / 2, by - h / 2 + 26, w, h, h / 2); g.fillStyle = '#0E6A86'; g.fill();
      const fy = by - h / 2 + 26 - dep; ISO.rr(g, bx - w / 2, fy, w, h, h / 2); g.fillStyle = P.cyan; g.fill();
      ISO.text(g, 'Купить', bx, fy + h / 2 + 44, 124, { al: 'center', col: P.ink, w: 800, max: 470 });
    }, { from: .55 });
    const cp = ISO.eo(ISO.pr(lt, .2, .78));
    if (lt > .2) { g.save(); g.globalAlpha = ISO.cl((lt - .2) * 6) * (1 - gone); ISO.cursor(g, ISO.lerp(1010, 790, cp), ISO.lerp(1260, 812, cp), 1.5, { press }); g.restore(); }
    ISO.ripple(g, 790, 812, lt - click, { once: true, n: 3, per: .75, r0: 30, r1: 400, col: P.cyan, lw: 4 });
  }
  ISO.title(g, lt, 'Вы@.1 нажали@.32', 60, 330, { size: 100, out: 1.48 });
  ISO.title(g, lt, 'Что@1.7 происходит@1.92 | *дальше?@2.55', 60, 330, { size: 112 });
}

// 2. Склад: стеллажи растут из пола, робот едет вдоль ряда и светит сканером
function sWare(g, lt) {
  const rx = ISO.lerp(-430, 150, ISO.eio(ISO.pr(lt, 0, 1.95)));
  ISO.bg(g, { px: -rx * .2 });
  ISO.cam(g, lt, { z: ISO.lerp(1, 1.04, lt / 2.1), x: -rx * .1, cy: 1000 }, g => {
    ISO.view(600, 1020, .86);
    ISO.slab(g, -540, -560, -24, 1080, 1000, 24, { grid: 90 });
    [-470, -280, -90].forEach((y, i) => ISO.rack(g, -480, y, 0, 820, 72, 200, { levels: 3, cols: 10, seed: i * 3 + 2, grow: ISO.eb(ISO.pr(lt, -.25 + i * .08, .2 + i * .08)) }));
    const aim = ISO.pt(rx + 70, -18, 150), beam = ISO.pr(lt, .75, 1.0);
    ISO.robot(g, rx, 110, 0, 1.1, { beam, aim, spread: 46, lt });
    const r = ISO.pt(rx, 110, 120); ISO.callout(g, lt, .95, r[0], r[1] - 40, r[0] + 150, r[1] - 150, 'робот R-7', { size: 22 });
  });
  ISO.title(g, lt, 'На@.18 складе@.38 | *робот@.86', 60, 330, { size: 112 });
}

// 3. Камера отъезжает от найденной ячейки: вокруг тысячи полок
const FC = { nc: 34, nr: 20, cw: 64, ch: 54, x0: -1100, hc: 17, hr: 9 };
function sFind(g, lt) {
  ISO.bg(g);
  const hx = FC.x0 + (FC.hc + .5) * FC.cw, hz = (FC.hr + .5) * FC.ch, zoom = ISO.lerp(3.4, 1, ISO.eio(ISO.pr(lt, .3, 1.75)));
  ISO.view(560 - hx * ISO.C30, 1060 - hx * ISO.S30 + hz, 1);
  ISO.cam(g, lt, { kick: 0, z: zoom, cx: 560, cy: 1060 }, g => {
    ISO.cells(g, FC.x0, 0, 0, FC.nc, FC.nr, FC.cw, FC.ch, { seed: 4, cols: ['#5E6379', '#4B5066', '#3F4458'] });
    ISO.parcel(g, hx, 26, FC.hr * FC.ch + 6, .42, { hi: 1, lt, shadow: false, beacon: false });
  });
  const r = 34 * zoom; ISO.reticle(g, 548, 1050, r, lt, { lock: ISO.pr(lt, 0, .3), lw: 4 });
  ISO.scrim(g, 300, 760, .92);
  ISO.callout(g, lt, .12, 548 - r * .9, 1050 - r * .9, 310, 1050 - r * .9 - 120, 'ваш товар', { col: P.green, size: 28 });
  ISO.title(g, lt, 'Среди@.4 *тысяч@.8 | полок@1.2', 60, 330, { size: 112 });
}

// 4. Упаковка: посылка падает на весы, табло считает вес, клапаны закрываются, лента
function sPack(g, lt) {
  ISO.bg(g);
  ISO.cam(g, lt, { z: ISO.lerp(1, 1.05, lt / 2.8), cy: 1150 }, g => {
    ISO.view(500, 1190, 1.45);
    ISO.slab(g, -230, -230, -24, 460, 460, 24, { grid: 46 });
    ISO.block(g, -100, -100, 0, 200, 200, 22, { top: '#C9CCD6', left: '#9AA0B2', right: '#6E7487' });
    ISO.tile(g, -86, -86, 22, 172, 172, { stroke: P.cyanD, lw: 1.5 });
    const open = 1 - ISO.eio(ISO.pr(lt, 1.5, 1.95)), tape = ISO.eo(ISO.pr(lt, 2.0, 2.4));
    ISO.parcel(g, 0, 0, 22 + ISO.fall(lt, .05, 380, .32), 1, { open, tape, hi: 1, lt, floor: 22 });
    const a = ISO.pt(100, -100, 11), on = ISO.pr(lt, .45, .8);
    if (on > 0) { ISO.node(g, a[0], a[1], 8, { p: on }); ISO.trace(g, [a, [a[0] + 110, a[1] + 110], [a[0] + 110, 1380]], ISO.eo(on), P.cyan, 2.5); }
    ISO.card(g, 600, 1380, 400, 190, { p: ISO.pr(lt, .6, .95), col: P.cyanD });
    if (lt > .7) ISO.odo(g, 1.24 * ISO.eo(ISO.pr(lt, .7, 1.3)), 640, 1510, 104, { d: 2, unit: 'кг', col: P.white });
  });
  ISO.title(g, lt, 'Вес@.7 и@1.35 | *упаковка@1.5', 60, 330, { size: 112 });
}

// 5. Крупно: ярлык со штрихкодом, красный луч сканера
function sCode(g, lt) {
  ISO.bg(g);
  const w = 112, h = 92, lp = ISO.pr(lt, 0, .18), bp = ISO.pr(lt, .12, .42), lz = ISO.pr(lt, .45, 1.0);
  ISO.cam(g, lt, { z: ISO.lerp(1, 1.035, lt / 1.4), cy: 1050 }, g => {
    ISO.view(860, 1250, 6);
    ISO.parcel(g, 0, 0, 0, 1, { lt, shadow: false });
    ISO.onFace(g, -40.3, 56, 75.4, 'left', q => {
      const sc = ISO.lerp(1.3, 1, ISO.eo(lp)); q.globalAlpha *= ISO.cl(lp * 3); q.translate(w * .3, h * .26); q.scale(sc, sc); q.translate(-w * .3, -h * .26);
      q.fillStyle = '#F3F0E8'; q.fillRect(0, 0, w * .6, h * .52); ISO.barcode(q, w * .06, h * .07, w * .48, h * .26, bp, { seed: 11 });
      q.font = ISO.font(5.4, 700, ISO.F.mono); q.fillStyle = P.ink; q.textAlign = 'left'; q.textBaseline = 'alphabetic'; q.fillText(ISO.typed('4821 7730 15', lt, .5, 26), w * .06, h * .44);
    });
    if (lz > 0 && lz < 1) { const u = w * .06 + w * .48 * ISO.eio(lz), a = ISO.pt(-40.3 + u, 56, 75.4 - h * .05), b = ISO.pt(-40.3 + u, 56, 75.4 - h * .35); ISO.laser(g, a[0], a[1] - 34, b[0], b[1] + 34); }
    if (lt > 1.02) { const c = ISO.pt(-40.3 + w * .6 + 8, 56, 75.4 - h * .2); ISO.check(g, c[0] + 40, c[1], 70, ISO.eo(ISO.pr(lt, 1.02, 1.2)), P.green, 13); }
  });
  ISO.title(g, lt, '*Штрихкод@.06', 60, 330, { size: 124, max: 600 });
  ISO.pop(g, lt, 1.04, 540, 1580, g => ISO.pill(g, '№ 4821-7730', 540, 1580, { al: 'center', col: P.green, size: 30 }));
}

// 6–7. Сортировочный центр: лента, ворота-сканеры, коробки уходят по линиям; герой: на свою
const BR = [-330, -40, 250, 540], BV = 260, BDT = .3, HERO_T = 9.515;
function sortWorld(g, t, lt) {
  ISO.slab(g, -760, -300, -24, 1520, 1000, 24, { grid: 95 });
  ISO.belt(g, -1000, -40, 0, 2000, 80, t, { speed: BV });
  BR.forEach(x => ISO.belt(g, x - 35, 40, 0, 70, 640, t, { axis: 'y', speed: BV }));
  const L = [];
  for (let i = Math.floor((t - 9) / BDT); i <= Math.floor(t / BDT); i++) {
    const age = t - i * BDT; if (age < 0 || Math.abs(i * BDT - HERO_T) < .35) continue;
    const b = Math.floor(ISO.hash(i * 3.31 + .7) * 5); let x = -1000 + age * BV, y = 0;
    if (b < 4 && x > BR[b]) { if (x - BR[b] > 640) continue; y = x - BR[b]; x = BR[b]; } else if (x > 1000) continue;
    const c = ISO.hash(i * 1.7) > .5 ? '#A3A6B1' : '#9095A3';
    L.push([x + y, () => ISO.block(g, x - 27, y - 27, 18, 54, 54, 44, { col: c })]);
  }
  const ha = t - HERO_T, hx0 = -1000 + ha * BV, hx = Math.min(hx0, BR[2]), hy = Math.min(560, Math.max(0, hx0 - BR[2]));
  L.push([hx + hy + 1, () => ISO.parcel(g, hx, hy, 18, .5, { hi: 1, lt, floor: 18, bs: .9 })]);
  BR.forEach(xb => { const gx = xb - 95, act = L.length && Math.abs(((t * BV) % (BDT * BV)) - 40) < 20;
    L.push([gx - 62, () => ISO.block(g, gx, -66, 0, 9, 9, 84, { col: '#3E4A72' })]);
    L.push([gx + 60, () => { ISO.block(g, gx, 54, 0, 9, 9, 84, { col: '#3E4A72' }); ISO.block(g, gx, -66, 84, 9, 129, 9, { col: P.cyanD });
      if (act) { const c = ISO.pt(gx + 4, 0, 84); ISO.glow(g, c[0], c[1], 50 * ISO.V.s, P.cyan, .7); } }]);
  });
  L.sort((a, b) => a[0] - b[0]).forEach(e => e[1]());
  BR.forEach((xb, i) => ISO.faceText(g, '0' + (i + 1), xb, 640, 1, 34, { face: 'top', col: i === 2 ? P.cyan : P.greyD }));
  return [hx, hy];
}
function sSort(g, lt, t) {
  ISO.bg(g, { px: -lt * 40 });
  ISO.cam(g, lt, { z: ISO.lerp(1, 1.05, lt / 2.6), x: -lt * 30, cy: 1050 }, g => { ISO.view(600, 1000, .9); sortWorld(g, t, lt); });
  ISO.title(g, lt, '*Сортировочный@.19 | центр@1.13', 60, 330, { size: 104 });
}
function sCount(g, lt, t) {
  ISO.bg(g);
  let hp;
  ISO.cam(g, lt, { kick: .05, z: ISO.lerp(1, 1.04, lt / 2.1), cy: 1100 }, g => { ISO.view(560, 1060, .62); hp = sortWorld(g, t, lt); });
  ISO.dim(g, .6 * ISO.eo(ISO.pr(lt, 0, .3)));
  ISO.cam(g, lt, { kick: .05, z: ISO.lerp(1, 1.04, lt / 2.1), cy: 1100 }, g => { ISO.view(560, 1060, .62); ISO.parcel(g, hp[0], hp[1], 18, .5, { hi: 1, lt, floor: 18, bs: .9 }); });
  ISO.card(g, 165, 760, 750, 390, { p: ISO.pr(lt, 0, .3), col: P.cyanD });
  if (lt > .05) ISO.odo(g, 100000 * ISO.eo(ISO.pr(lt, .07, .85)), 540, 1010, 168, { al: 'center', col: P.cyan });
  ISO.title(g, lt, 'коробок@.74 *за@.92 *час@1.02', 540, 1050, { size: 60, al: 'center' });
  [[72, 'вход', .95, .15], [950, 'выход', .82, .3]].forEach(([x, s, f, t0]) => { if (lt > t0) ISO.gauge(g, x, 780, 36, 340, f * ISO.eo(ISO.pr(lt, t0, t0 + .8)), { label: s }); });
}

// 8. Карта из точек: дуга от склада к вашему городу, по ней едет грузовик
const HUB = [250, 1220], DST = [820, 820], CITIES = [[140, 860], [470, 700], [935, 1170], [660, 1360], [400, 1440]];
function sMap(g, lt) {
  ISO.bg(g);
  ISO.cam(g, lt, { z: ISO.lerp(1, 1.06, lt / 2.55), cy: 1020 }, g => {
    ISO.dotMap(g, 40, 560, 1000, 920, { seed: 4, col: '#34406A', a: ISO.eo(ISO.pr(lt, -.2, .4)) });
    CITIES.forEach((c, i) => { ISO.trace(g, ISO.arcPts(HUB[0], HUB[1], c[0], c[1], .25), ISO.eo(ISO.pr(lt, .1 + i * .06, .6 + i * .06)), ISO.rgba(P.cyan, .5), 2.5);
      ISO.node(g, c[0], c[1], 7, { p: ISO.pr(lt, .5 + i * .06, .7 + i * .06), col: P.cyanD }); });
    const M = ISO.arcPts(HUB[0], HUB[1], DST[0], DST[1], .3); ISO.trace(g, M, ISO.eo(ISO.pr(lt, .05, .6)), P.cyan, 4);
    ISO.node(g, HUB[0], HUB[1], 11, { fill: P.cyan }); ISO.label(g, 'склад', HUB[0] - 20, HUB[1] + 56, 24, { col: P.grey, al: 'center' });
    if (lt > 2.1) { ISO.ripple(g, DST[0], DST[1], lt - 2.1, { once: true, n: 2, per: .8, r0: 14, r1: 90 }); ISO.node(g, DST[0], DST[1], 12, { fill: P.cyan, p: ISO.pr(lt, 2.1, 2.3) });
      ISO.label(g, 'ваш город', DST[0], DST[1] - 40, 26, { col: P.cyan, al: 'center', w: 700, n: Math.ceil(ISO.pr(lt, 2.15, 2.45) * 9) }); }
    const a = ISO.along(M, ISO.eio(ISO.pr(lt, .3, 2.25))); ISO.glow(g, a[0], a[1], 70, P.cyan, .55);
    ISO.view(a[0], a[1], .36); ISO.truck(g, 0, 0, 0, 1, { lt, mark: true });
  });
  ISO.title(g, lt, 'Грузовик@.18 | в@1.74 ваш@1.88 *город@2.15', 60, 330, { size: 112 });
}

// 9. Ночная трасса: камера едет с грузовиком, фонари и разметка уходят назад
function sNight(g, lt, t) {
  ISO.bg(g, { tone: 'night' }); ISO.moon(g, 910, 470, 44);
  ISO.cam(g, lt, { z: ISO.lerp(1, 1.05, lt / 2), cy: 1150 }, g => {
    ISO.view(560, 1170, 1.1); const off = t * 520;
    ISO.block(g, -2400, -120, -14, 4800, 240, 14, { top: '#1A1E34', left: '#10132A', right: '#0E1022' });
    g.beginPath(); for (let k = -18; k < 18; k++) ISO.qTop(g, k * 140 - (off % 140), -5, 0, 70, 10); g.fillStyle = 'rgba(220,226,240,.5)'; g.fill();
    g.beginPath(); ISO.qTop(g, -2400, -114, 0, 4800, 5); ISO.qTop(g, -2400, 109, 0, 4800, 5); g.fillStyle = 'rgba(120,140,190,.35)'; g.fill();
    for (let k = -5; k < 6; k++) ISO.lamp(g, k * 560 - (off % 560), -200, 0, 240, { py: 170 });
    ISO.truck(g, -60, 52, Math.abs(Math.sin(t * 9)) * 1.6, 1, { lights: 1, lt: t, mark: true });
    g.beginPath(); for (let k = -6; k < 8; k++) { const x = k * 300 - (off % 300); ISO.qL(g, x, 150, 0, 8, 16); } g.fillStyle = P.cyanD; g.fill();
  });
  ISO.title(g, lt, 'По@.02 *ночной@.21 | трассе@.68', 60, 330, { size: 112 });
}

// 10. Город: кварталы вырастают, маршрут прокладывается по улицам, камера отъезжает
const CITY = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) CITY.push({ x: (i - 1) * 230, y: (j - 1) * 230, h: 46 + Math.round(ISO.hash(i * 5.7 + j * 2.9 + 3) * 84), dst: !i && !j, s: i * 3 + j });
CITY.sort((a, b) => a.x + a.y - b.x - b.y);
const ROUTE = [[345, 345], [345, 115], [115, 115], [115, -115], [-230, -115]];
function sCity(g, lt) {
  ISO.bg(g);
  const q = ISO.eio(ISO.pr(lt, 1.3, 3.0));
  ISO.cam(g, lt, { z: ISO.lerp(1.25, 1, q), cx: 471, cy: 1340, x: 69 * (1 - q), y: -150 * (1 - q) }, g => {
    ISO.view(540, 1060, .8);
    ISO.slab(g, -460, -460, -20, 920, 920, 20, { grid: 115 });
    CITY.forEach(c => { const gr = ISO.eb(ISO.pr(lt, -.2 + (345 - c.x - c.y) * .0006, .25 + (345 - c.x - c.y) * .0006));
      ISO.building(g, c.x - 80, c.y - 80, 0, 160, 160, c.h * gr, { seed: c.s + 2, lit: .32, edge: c.dst && lt > 2.6 ? P.green : null }); });
    const R = ISO.floorPts(ROUTE, 2), p = ISO.eo(ISO.pr(lt, 1.25, 2.7));
    if (p > 0) { const h = ISO.trace(g, R, p, P.cyan, 6); ISO.glow(g, h[0], h[1], 50, P.cyan, .8);
      R.slice(1, -1).forEach((a, i) => { if (p > (i + 1) / 4.3) ISO.node(g, a[0], a[1], 8, { p: ISO.pr(lt, 1.25 + (i + 1) * .33, 1.45 + (i + 1) * .33) }); });
      if (p >= 1) ISO.pulses(g, R, lt, { n: 4, speed: 300, len: 22, lw: 5, col: P.ice }); }
    ISO.truck(g, 345, 425, 0, .55, { van: true, lt });
    const v = ISO.pt(345, 425, 60); ISO.ripple(g, v[0], v[1], lt - .64, { once: true, n: 3, per: .8, r0: 20, r1: 150 });
    ISO.beacon(g, 345, 425, 60, lt, { s: .9 });
    ISO.callout(g, lt, .35, v[0] - 30, v[1] + 40, v[0] - 200, v[1] + 120, 'старт', { size: 24 });
    const d = ISO.pt(-230, -230, CITY.find(c => c.dst).h + 6);
    if (lt > 2.6) { ISO.pin(g, d[0], d[1] - ISO.fall(lt, 2.62, 160, .28), 1.25, { col: P.green }); ISO.ripple(g, d[0], d[1], lt - 2.9, { once: true, flat: true, n: 2, per: .9, r0: 10, r1: 110, col: P.green }); }
    ISO.callout(g, lt, 2.95, d[0] + 34, d[1] - 40, d[0] + 230, d[1] - 120, 'ваш дом', { col: P.green, size: 24 });
  });
  ISO.title(g, lt, 'Курьер@.16 получает@.64 | *маршрут@1.25', 60, 330, { size: 108 });
}

// 11. Статус обновляется: лента этапов в карточке
function sStatus(g, lt) {
  ISO.bg(g);
  ISO.cam(g, lt, { kick: .05, cy: 1000 }, g => {
    ISO.card(g, 100, 620, 880, 740, { p: ISO.pr(lt, -.1, .3) });
    ISO.view(205, 752, .5); ISO.parcel(g, 0, 0, 0, 1, { lt, shadow: false });
    ISO.label(g, 'посылка 4821-7730', 290, 742, 24, { col: P.grey }); ISO.label(g, 'отслеживание', 290, 782, 24, { col: P.cyan, w: 700 });
    g.fillStyle = P.edge; g.fillRect(140, 830, 800, 2);
    const now = lt > .67;
    ISO.steps(g, lt, [{ s: 'Склад', sub: '14:20', st: 'done', t: .05 }, { s: 'Сортировка', sub: '18:10', st: 'done', t: .12 },
      { s: 'Трасса', sub: '02:35', st: now ? 'done' : 'now', t: .19 }, { s: 'Курьер в пути', sub: 'сейчас', st: 'now', t: 1.53 }], 170, 920, { gap: 118, size: 50, w: 760 });
  });
  ISO.title(g, lt, 'Статус@.21 | *обновляется@.67', 60, 330, { size: 112 });
}

// 12. Схема-«сканер»: курьер в пути, барабан докручивается до 10 минут
function sEta(g, lt) {
  ISO.bg(g);
  ISO.cam(g, lt, { kick: .06, cy: 1040 }, g => {
    ISO.radial(g, 540, 1050, lt, { n: 22, r0: 420, r1: 1250, p: ISO.pr(lt, -.1, .7), seed: 5 });
    const fr = ISO.lerp(1, .8, ISO.pr(lt, .3, 2.6));
    ISO.dial(g, 540, 1050, 250, lt, { p: ISO.pr(lt, -.05, .45), frac: fr });
    const a = -Math.PI / 2 + Math.PI * 2 * fr, cx = 540 + Math.cos(a) * 267, cy = 1050 + Math.sin(a) * 267;
    if (lt > .4) { ISO.glow(g, cx, cy, 44, P.cyan, .9); ISO.node(g, cx, cy, 11, { fill: P.ice }); }
    if (lt > .3) ISO.odo(g, ISO.lerp(14, 10, ISO.eo(ISO.pr(lt, .4, .85))), 540, 1120, 230, { al: 'center' });
    ISO.title(g, lt, '*минут@1.29', 540, 1160, { size: 64, al: 'center', kcol: P.ice });
  });
  ISO.title(g, lt, 'Будет@.04 через@.43', 540, 330, { size: 112, al: 'center' });
}

// 13. Дверь: посылка на коврике, звонок «дин-дон»
function sDoor(g, lt) {
  ISO.bg(g);
  const bell = Math.max(1 - ISO.pr(lt, .15, .5), 1 - ISO.pr(lt, .6, 1.0)) * (lt > .12 ? 1 : 0);
  ISO.cam(g, lt, { z: ISO.lerp(1, 1.04, lt / 1.4), cy: 1150 }, g => {
    ISO.view(600, 1290, 1.5);
    ISO.tile(g, -800, 0, 0, 1600, 700, { fill: '#191C30' });
    ISO.block(g, -800, -500, 0, 1600, 500, 1100, { top: '#2A3052', left: '#232846', right: '#1A1E36' });
    const lg = ISO.pt(-140, 0, 250); ISO.glow(g, lg[0], lg[1], 120, P.amber, .5); g.fillStyle = '#FFE6B8'; g.fillRect(lg[0] - 6, lg[1] - 10, 12, 20);
    ISO.door(g, 0, 0, 0, { lt, ring: bell, num: '17' });
    ISO.parcel(g, -6, 104, 0, 1, { hi: 1, lt, label: 1, bs: .9 });
    const b = ISO.pt(112, 1, 128); ISO.ripple(g, b[0], b[1], lt - .15, { once: true, n: 2, per: .7, r0: 16, r1: 150 }); ISO.ripple(g, b[0], b[1], lt - .6, { once: true, n: 2, per: .7, r0: 16, r1: 150 });
  });
  ISO.title(g, lt, 'Звонок@.17 | в@.65 *дверь@.79', 60, 330, { size: 112 });
}

// 14. Итог: путь от клика до порога, все этапы зелёные, штамп
const XS = [130, 294, 458, 622, 786, 950];
function mini(g, i, x, y, lt) {
  if (i === 0) { ISO.rr(g, x - 64, y - 78, 128, 54, 27); g.fillStyle = P.cyan; g.fill(); ISO.cursor(g, x + 14, y - 48, .65); return; }
  ISO.view(x, y - 6, .46);
  if (i === 1) ISO.rack(g, -100, -40, 0, 200, 60, 150, { levels: 3, cols: 3, seed: 6 });
  if (i === 2) { ISO.block(g, -80, -80, 0, 160, 160, 16, { top: '#C9CCD6', left: '#9AA0B2', right: '#6E7487' }); ISO.parcel(g, 0, 0, 16, .95, { lt, shadow: false }); }
  if (i === 3) { ISO.belt(g, -150, -35, 0, 300, 70, lt); ISO.block(g, -90, -22, 18, 44, 44, 38, {}); ISO.block(g, 40, -22, 18, 44, 44, 38, {}); }
  if (i === 4) ISO.truck(g, 0, 0, 0, .8, { lt, mark: true });
  if (i === 5) { ISO.block(g, -110, -90, 0, 220, 70, 190, { top: '#2C3252', left: '#2A3156', right: '#1A1E36' }); g.beginPath(); ISO.qL(g, -30, -20, 0, 60, 120); g.fillStyle = P.cyanD; g.fill(); }
}
function sFinal(g, lt) {
  ISO.bg(g, { tone: 'deep' });
  const hp = ISO.eio(ISO.pr(lt, .1, 1.4)), hx = ISO.lerp(XS[0], XS[5], hp), Y = 880;
  ISO.cam(g, lt, { kick: .05, cy: 900 }, g => {
    g.strokeStyle = P.mute; g.lineWidth = 4; g.beginPath(); g.moveTo(XS[0], Y); g.lineTo(XS[5], Y); g.stroke();
    g.strokeStyle = P.green; g.beginPath(); g.moveTo(XS[0], Y); g.lineTo(hx, Y); g.stroke();
    XS.forEach((x, i) => { const on = hx >= x - 2, a = ISO.pr(lt, -.1 + i * .05, .2 + i * .05);
      g.save(); g.globalAlpha *= ISO.cl(a * 2); g.translate(0, (1 - ISO.eo(a)) * 30); mini(g, i, x, Y - 50, lt); g.restore();
      ISO.node(g, x, Y, 11, on ? { fill: P.green, p: 1 } : { col: P.greyD, p: a }); if (on && i) ISO.check(g, x, Y + 1, 12, 1, P.ink, 3); });
    if (lt > .1) { ISO.view(hx, Y + 84, .62); ISO.parcel(g, 0, 0, 0, 1, { hi: 1, lt, bs: 1 }); }
    ISO.stamp(g, lt, 1.65, 'доставлено', 740, 1105, { size: 44 });
  });
  ISO.title(g, lt, 'От@.07 клика@.12 | до@.48 порога@.69', 60, 330, { size: 112 });
  ISO.title(g, lt, 'Меньше@1.17 | *суток.@1.65', 60, 1230, { size: 160, kcol: P.green });
}

const SC = [sBuy, sWare, sFind, sPack, sCode, sSort, sCount, sMap, sNight, sCity, sStatus, sEta, sDoor, sFinal];
function draw(t, k) {
  const g = ISO.begin(t, k), sc = ISO.cuts(t, CUTS);
  SC[sc.i](g, sc.lt, t);
  ISO.finish(g);
  const st = ISO.step(STATUS, t), chg = STATUS.filter(s => s[0] <= t).pop()[0], done = t >= 33.85;
  ISO.hud(g, { a: ISO.pr(t, 1.75, 2.25), id: 'посылка 4821-7730', status: st[0], col: st[1], min: ISO.kf(CLK, t), stage: ISO.kf(STAGE, t),
    flash: chg > 0 ? 1 - ISO.pr(t, chg, chg + .7) : 0, done, tcol: done ? P.green : P.white });
}

function sound(s) {
  [[.06, 'pop_soft', .12], [.85, 'click', .2], [1.6, 'kalimba_run', .1], [1.95, 'drop', .14], [3.7, 'marimba_run', .13], [4.56, 'toggle_on', .11],
   [5.8, 'woodblock', .14], [5.95, 'pop_high', .1], [8.2, 'marimba_run', .12, 1.12], [8.52, 'drop', .13], [8.9, 'counter', .1], [9.7, 'woodblock', .1],
   [10.2, 'rim', .1], [11.0, 'pop_double', .15], [11.45, 'type', .09], [12.05, 'success', .12], [12.4, 'kalimba_run', .12], [15.05, 'odometer', .12],
   [17.1, 'marimba_run', .12, .94], [19.25, 'bubble', .12], [19.65, 'kalimba_run', .11, .9], [21.6, 'marimba_run', .12, 1.06], [22.24, 'notify', .12],
   [24.3, 'drop', .12], [25.6, 'kalimba_run', .11], [26.3, 'toggle_on', .14], [28.15, 'marimba_run', .12], [28.6, 'counter', .1],
   [30.95, 'marimba', .15, 1.26], [31.4, 'marimba', .15, 1], [32.2, 'kalimba_run', .12, 1.12], [33.85, 'success3', .15]]
    .forEach(([t, n, v, p]) => s.play(t, n, v, { pitch: p || 1 }));
}
