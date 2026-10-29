// Демо «Как кофемашина варит эспрессо» - только LAB и обычный canvas.
// Мир: испытательная лаборатория, кофемашина в разрезе на стенде. Сквозной предмет: машина и её чашка;
// сквозной счётчик: пульт с тремя показаниями (температура, давление, время) и статус-метка справа вверху.
const L = LAB, P = L.P;
const CUTS = [0, 4.1, 7.4, 11.9, 14.7, 16.8, 21.1, 25.2, 30.2];
const at = (i, w, n) => L.at(i, w, n);
const TEMP = t => L.lerp(20, 92, L.eo(L.pr(t, 7.75, 9.6)));
const BAR = t => { const u = t - 13.35; return u < 0 ? 9 * L.eo(L.pr(t, 12.35, 13.35)) : 9 + .7 * Math.sin(u * 15) * Math.exp(-u * 5); };
const TIME = t => 25 * L.eio(L.pr(t, 21.45, 24.9));
const CUP = t => L.lerp(.04, .74, L.eio(L.pr(t, 21.4, 25)));
const STATUS = [['КОРПУС', P.mute], ['ПАРАМЕТРЫ', P.cyan], ['НАГРЕВ', P.orange], ['ДАВЛЕНИЕ', P.cyan], ['ДАВЛЕНИЕ', P.cyan], ['ПРОЛИВ', P.amber], ['ЭКСТРАКЦИЯ', P.violet], ['КРЕМА', P.amber], ['ГОТОВО', P.ok]];
const ON = [[0, 0, 0], [0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 1, 0], [.7, .7, 0], [0, 0, 1], [0, 0, 0], [1, 1, 1]];
const LAYERS = [[.58, '#1C0D05'], [.42, '#4E260E']];

// ---------- предметы ----------
function machine(g, x, y, s, lt, o = {}) { // кофемашина в разрезе: x,y - низ по центру; o.open 0…1 - срез корпуса, o.hot - накал ТЭНа
  const open = o.open ?? 1, hot = o.hot ?? .6, a = o.flow ?? 1, gx = 70;
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.ellipse(0, 6, 345, 26, 0, 0, Math.PI * 2); g.fill();
  const cav = g.createLinearGradient(0, -790, 0, 0); cav.addColorStop(0, '#07090E'); cav.addColorStop(1, '#161B26');
  L.rrect(g, -300, -790, 600, 790, 34); g.fillStyle = cav; g.fill();
  L.scan(g, open, -300, 300, g => { // корпус закрыт
    const gr = g.createLinearGradient(-300, -790, 300, 0); gr.addColorStop(0, '#DCE2EA'); gr.addColorStop(.45, '#9AA3B2'); gr.addColorStop(.55, '#BAC2CE'); gr.addColorStop(1, '#5A6271');
    g.beginPath(); L.rr(g, -300, -790, 600, 790, 34); g.rect(-70, -585, 270, 527); g.fillStyle = gr; g.fill('evenodd');
    g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-300, -620); g.lineTo(-70, -620); g.moveTo(200, -620); g.lineTo(300, -620); g.moveTo(-185, -620); g.lineTo(-185, 0); g.stroke();
    L.led(g, -250, -700, 7, P.cyan, 1); L.led(g, -218, -700, 7, P.amber, .5);
  }, g => { // внутренности
    g.save(); L.rrect(g, -285, -740, 100, 430, 16); g.fillStyle = 'rgba(150,210,255,.08)'; g.fill(); g.clip(); L.liquid(g, -285, -740, 100, 430, .72, lt, { col: '#5CC8FF', col2: '#0B3D7A' }); g.restore();
    L.rrect(g, -285, -740, 100, 430, 16); g.strokeStyle = 'rgba(200,235,255,.6)'; g.lineWidth = 3; g.stroke(); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(-276, -722, 7, 390);
    L.pipe(g, [-235, -312, -235, -232], { r: 9, kind: 'copper', flow: { lt, col: P.cyan, a: a * .9 } });
    L.cylH(g, -295, -190, 160, 40, 'black', { cap: 'flat' }); L.cylH(g, -268, -190, 84, 46, 'brass', { knurl: [-266, -186] });
    L.pipe(g, [-135, -190, -110, -190, -110, -612], { r: 9, kind: 'copper', flow: { lt, col: P.cyan, a: a * .9 } });
    L.tank(g, -170, -760, 400, 150, lt, { kind: 'copper', r: 75, wall: 14, level: .74, liquid: [L.mix('#5CC8FF', '#FFA45C', hot), L.mix('#0B3D7A', '#7A2A10', hot)], amp: 3,
      inside: (g, ix, iy, iw, ih) => { L.coil(g, ix + 34, iy + ih - 24, ix + iw - 34, iy + ih - 24, 15, 9, { heat: hot, lw: 6 }); L.bubbles(g, ix, iy + 30, iw, ih - 40, lt, { n: 8, r: 5, a: hot * .7 }); } });
    L.pipe(g, [gx, -612, gx, -583], { r: 10, kind: 'chrome', flow: { lt, col: P.orange, a } });
  }, { y0: -790, y1: 0 });
  L.cylH(g, -305, -802, 610, 12, 'chrome', { k: .25 });
  L.rrect(g, -300, -790, 600, 790, 34); g.strokeStyle = 'rgba(220,235,255,.3)'; g.lineWidth = 3; g.stroke();
  g.beginPath(); g.moveTo(gx - 78, -585); g.lineTo(gx + 78, -585); g.lineTo(gx + 66, -540); g.quadraticCurveTo(gx + 60, -525, gx + 45, -525); g.lineTo(gx - 45, -525); g.quadraticCurveTo(gx - 60, -525, gx - 66, -540); g.closePath(); g.fillStyle = L.mat(g, 'chrome', gx - 78, 0, gx + 78, 0); g.fill();
  g.beginPath(); g.moveTo(gx - 62, -525); g.lineTo(gx + 62, -525); g.lineTo(gx + 50, -482); g.lineTo(gx - 50, -482); g.closePath(); g.fillStyle = L.mat(g, 'steel', gx - 62, 0, gx + 62, 0); g.fill();
  g.save(); g.lineCap = 'round'; g.strokeStyle = '#08090C'; g.lineWidth = 24; g.beginPath(); g.moveTo(gx + 55, -505); g.lineTo(gx + 250, -478); g.stroke(); g.strokeStyle = 'rgba(170,180,200,.35)'; g.lineWidth = 4; g.beginPath(); g.moveTo(gx + 70, -512); g.lineTo(gx + 244, -487); g.stroke(); g.restore();
  [gx - 22, gx + 22].forEach(sx => { g.fillStyle = L.mat(g, 'chrome', sx - 8, 0, sx + 8, 0); g.fillRect(sx - 8, -482, 16, 26); });
  if (o.pour) [gx - 22, gx + 22].forEach((sx, i) => L.stream(g, sx, -456, -170, 7, lt, { seed: i * 2.1 }));
  L.cup(g, gx, -90, 124, 108, lt, { fill: o.fill ?? .55, layers: LAYERS, foam: 8, handle: true });
  L.rrect(g, -55, -90, 250, 30, 8); g.fillStyle = L.mat(g, 'chrome', 0, -90, 0, -60); g.fill(); g.fillStyle = 'rgba(0,0,0,.45)'; for (let i = 0; i < 10; i++) g.fillRect(-40 + i * 24, -84, 10, 18);
  L.gauge(g, 252, -300, 40, o.bar ?? 9, { max: 12, every: 3, zone: [8, 10, P.ok] });
  L.knob(g, 252, -170, 30, { v: .62, col: P.amber });
  g.restore();
}
function turka(g, x, y, s, lt) { // турка на газовой горелке: x - центр, y - столешница
  g.save(); g.translate(x, y); g.scale(s, s);
  L.cylV(g, 0, -46, 40, 78, 'black', { k: .22 }); L.jet(g, 0, -50, 46, 40, lt, { rot: -90, cols: ['#FFFFFF', '#7FD0FF', '#2F6BFF'], a: .9 });
  g.beginPath(); g.moveTo(-78, -78); g.bezierCurveTo(-84, -150, -46, -170, -50, -210); g.lineTo(-62, -232); g.lineTo(62, -232); g.lineTo(50, -210); g.bezierCurveTo(46, -170, 84, -150, 78, -78); g.quadraticCurveTo(0, -60, -78, -78); g.closePath();
  g.fillStyle = L.mat(g, 'copper', -84, 0, 84, 0); g.fill(); g.strokeStyle = 'rgba(255,210,180,.35)'; g.lineWidth = 2; g.stroke();
  g.beginPath(); g.ellipse(0, -232, 62, 12, 0, 0, Math.PI * 2); g.fillStyle = '#2A1407'; g.fill(); g.strokeStyle = '#FFC7A3'; g.lineWidth = 3; g.stroke();
  for (let i = 0; i < 6; i++) { const q = (lt * 1.6 + i / 6) % 1; g.fillStyle = 'rgba(214,160,100,' + (1 - q) * .8 + ')'; g.beginPath(); g.arc(-40 + i * 16, -236 - q * 14, 4 + i % 3 * 2, 0, Math.PI * 2); g.fill(); }
  g.save(); g.lineCap = 'round'; g.strokeStyle = '#B57E2C'; g.lineWidth = 12; g.beginPath(); g.moveTo(-56, -190); g.lineTo(-120, -228); g.stroke(); g.strokeStyle = '#1A0F08'; g.lineWidth = 20; g.beginPath(); g.moveTo(-118, -227); g.lineTo(-176, -262); g.stroke(); g.restore();
  g.restore();
}
function thermo(g, x, y, h, v, col) { // термометр-пробирка: x - центр, y - верх, v 0…1
  L.rrect(g, x - 18, y, 36, h, 18); g.fillStyle = 'rgba(160,215,255,.1)'; g.fill(); g.strokeStyle = 'rgba(210,235,255,.6)'; g.lineWidth = 3; g.stroke();
  g.beginPath(); g.arc(x, y + h + 18, 30, 0, Math.PI * 2); g.fillStyle = col; g.fill(); L.glow(g, x, y + h + 18, 70, col, .6);
  const fh = (h - 14) * L.cl(v); g.fillStyle = col; g.fillRect(x - 9, y + h - fh, 18, fh + 8); L.glow(g, x, y + h - fh, 40, col, .8);
  g.fillStyle = 'rgba(220,232,250,.6)'; for (let i = 1; i < 6; i++) g.fillRect(x + 24, y + i * h / 6, 16, 3);
}

// ---------- сцены: [мир, интерфейс] ----------
const SC = [
  [(g, lt, sc) => { // 0. Хук: лаборатория, машина на стенде, клик → разрез
    const cam = L.camera(lt, { d: sc.d, push: .05, drift: .06, pan: [0, -24] });
    L.layer(g, cam, .25, g => L.studio(g, { v: 'a', y: -30 }));
    L.layer(g, cam, .6, g => L.bokeh(g, lt, { n: 6, y0: 500, y1: 1300, a: .25, r: 50 }));
    L.layer(g, cam, 1, g => { L.bench(g, -80, 1400, 1240, { leds: true }); turka(g, 225, 1372, .95, lt); machine(g, 655, 1372, .98, lt, { open: L.pr(lt, 1.3, 2.05), hot: .55 }); });
  }, (g, lt, sc) => {
    L.header(g, lt, { over: 'Почему', title: 'ЭСПРЕССО', sub: '*вкуснее?', t: [.08, .4, at(0, 'вкуснее') - .05], key: P.amber });
    L.callout(g, lt, at(0, 'кофемашины') + .05, 470, 700, 545, 520, 'КОФЕМАШИНА', { elbow: true, col: P.cyan });
    L.callout(g, lt, at(0, 'турки') - .05, 240, 1205, 70, 1015, 'ТУРКА', { elbow: true, col: P.orange });
    const c = L.cpath(lt, [[.25, 960, 1560], [1.05, 610, 985], [1.25, 610, 985, 1], [1.7, 650, 1010], [2.3, 1000, 1640]]);
    const ca = L.pr(lt, .25, .4) * (1 - L.pr(lt, 2.15, 2.3)); if (ca > 0) { g.save(); g.globalAlpha *= ca; L.cursor(g, c.x, c.y, { press: c.press }); g.restore(); }
    L.click(g, lt, 1.25, 610, 985);
  }],
  [(g, lt, sc) => { // 1. Три параметра: на фоне машина вне фокуса
    const cam = L.camera(lt, { d: sc.d, push: .06, drift: .05, pan: [-30, -20] });
    const bg = L.cache('bg1', 1080, 1920, b => { L.studio(b, { v: 'a' }); L.bench(b, -80, 1500, 1240, { ruler: false }); machine(b, 560, 1480, 1.25, 0, { hot: .6 }); b.fillStyle = 'rgba(4,6,12,.42)'; b.fillRect(0, 0, 1080, 1920); }, { blur: 6 });
    g.drawImage(bg, Math.round(cam.x * .5), Math.round(cam.y * .5));
  }, (g, lt, sc) => {
    L.header(g, lt, { over: 'Всё решают', t: [.06] });
    [['ДАВЛЕНИЕ', 'давление', P.cyan], ['ТЕМПЕРАТУРА', 'температура', P.orange], ['ВРЕМЯ', 'время', P.violet]].forEach(([word, key, col], i) => {
      const t0 = at(1, key) - sc.t0 - .1, q = lt - t0; if (q <= 0) return;
      const y = 440 + i * 300, dx = 140 * (1 - L.spring(q, { damp: 8, freq: 11 }));
      g.save(); g.translate(dx, 0); g.globalAlpha *= L.cl(q / .2);
      L.panel(g, 60, y, 960, 250, { glow: col, ga: L.cl(1 - (q - .3)) * .8 + .2 });
      if (i === 0) L.gauge(g, 190, y + 125, 86, 9 * L.eo(L.pr(q, .1, .7)), { max: 12, every: 3, zone: [8, 10, P.ok], col });
      if (i === 1) thermo(g, 190, y + 28, 150, L.eo(L.pr(q, .1, .8)) * .9, col);
      if (i === 2) { L.ring(g, 190, y + 125, 78, L.eio(L.pr(q, .1, 1.1)), { col, w: 14, ticks: 12 }); L.text(g, '25', 190, y + 142, 46, { kind: 'mono', al: 'center', col: P.text }); }
      g.restore();
      L.say(g, lt, t0 + .05, word, 330 + dx, y + 160, 104, { w: 800, col, max: 660, glow: L.rgba(col, .45) });
    });
  }],
  [(g, lt, sc) => { // 2. Котёл: нагрев до 92, не до кипения
    const t = sc.t0 + lt, h = L.pr(TEMP(t), 20, 92), sh = at(2, 'не') - sc.t0;
    const cam = L.camera(lt, { d: sc.d, push: .08, zoom: false, pan: [0, -60] });
    L.layer(g, cam, .2, g => L.studio(g, { v: 'c' }));
    L.layer(g, cam, 1, g => {
      L.tank(g, 70, 640, 940, 440, lt, { kind: 'copper', r: 200, wall: 30, level: .76, liquid: [L.mix('#5CC8FF', '#FFA45C', h), L.mix('#0B3D7A', '#7A2A10', h)], amp: 6,
        inside: (g, ix, iy, iw, ih) => { L.coil(g, ix + 70, iy + ih - 70, ix + iw - 70, iy + ih - 70, 44, 10, { heat: .15 + h * .75, lw: 13, cache: true }); L.bubbles(g, ix + 40, iy + 90, iw - 80, ih - 120, lt, { n: 8 + Math.round(h * 18), r: 10, speed: 120 + h * 160, a: .25 + h * .6 }); } });
      g.fillStyle = L.mat(g, 'brass', 840, 0, 876, 0); g.fillRect(840, 600, 36, 200); L.led(g, 858, 806, 9, L.heat(.3 + h * .7), 1);
      L.tracer(g, 470 + Math.sin(lt * 1.7) * 30, 860 + Math.sin(lt * 2.3) * 14, 22, { col: L.mix(P.cyan, P.orange, h) });
      const q = L.pr(lt, sh - .1, sh + .35); if (q > 0) { g.save(); g.globalAlpha *= L.eo(q);
        L.bar(g, 110, 1190, 860, 34, L.eo(q) * .9, { col: P.orange, col0: P.cyan });
        L.scale(g, 124, 1250, 832, { min: 20, max: 100, step: 10, every: 2, size: 28 });
        L.beam(g, [966, 1150, 966, 1265], { col: P.red, w: 4 }); L.pill(g, 1010, 1100, 'КИПЕНИЕ', { size: 42, dot: P.red, al: 'r', glow: P.red });
        g.restore(); }
    });
  }, (g, lt, sc) => {
    const t = sc.t0 + lt; L.header(g, lt, { over: 'Вода нагревается до', t: [.05] });
    const q = L.pr(lt, .25, .5); if (q > 0) { g.save(); g.globalAlpha *= L.eo(q); g.translate(0, (1 - L.eo(q)) * 30); L.odo(g, 64, 436, TEMP(t), { size: 200, digits: 2, unit: '°C', unitK: .5, glowCol: P.orange, grad: ['#FFE7C2', '#FF9A45'] }); g.restore(); }
    L.say(g, lt, at(2, 'не') - sc.t0, 'не до *кипения', 64, 548, 64, { key: P.red });
  }],
  [(g, lt, sc) => { // 3. Насос и манометр: 9 бар
    const t = sc.t0 + lt, run = L.pr(lt, at(3, 'давит') - sc.t0 - .1, at(3, 'давит') - sc.t0 + .2), hit = 13.35 - sc.t0;
    const cam = L.camera(lt, { d: sc.d, push: .07, drift: .05, shake: [hit, 10, .35] });
    L.layer(g, cam, .2, g => L.studio(g, { v: 'b', y: 60 }));
    L.layer(g, cam, 1, g => {
      L.bench(g, -80, 1440, 1240, { blocks: [150, 820] });
      L.pipe(g, [800, 1340, 930, 1340, 930, 905, 815, 905], { r: 14, kind: 'copper', flow: { lt, col: P.cyan, a: run, speed: 420 } });
      const vib = Math.sin(lt * 120) * 2.2 * run; g.save(); g.translate(0, vib);
      L.cylH(g, 220, 1340, 600, 72, 'black', { cap: 'flat', knurl: [600, 760] }); L.cylH(g, 300, 1340, 240, 80, 'brass', { knurl: [302, 536] }); L.glow(g, 420, 1340, 200, P.cyan, run * (.25 + .15 * Math.sin(lt * 25)), { sy: .4 });
      g.restore();
      L.gauge(g, 540, 905, 280, BAR(t), { max: 12, every: 3, zone: [8, 10, P.ok], unit: 'БАР' });
    });
  }, (g, lt, sc) => {
    L.header(g, lt, { over: 'Насос давит', title: '9 БАР', t: [.05, 13.3 - sc.t0], size: 170 });
    L.callout(g, lt, at(3, 'насос') - sc.t0 + .35, 300, 1300, 70, 1245, 'НАСОС', { col: P.cyan, elbow: true });
  }],
  [(g, lt, sc) => { // 4. Как на глубине 90 метров
    const py = 760 * L.eio(L.pr(lt, .15, 1.35)), d = 90 * L.eio(L.pr(lt, .1, 1.3)), M = 15;
    g.drawImage(L.cache('water', 1080, 2700, b => { b.fillStyle = '#070C18'; b.fillRect(0, 0, 1080, 470); const gr = b.createLinearGradient(0, 470, 0, 2700); gr.addColorStop(0, '#1C6FB2'); gr.addColorStop(.4, '#0A3566'); gr.addColorStop(1, '#010409'); b.fillStyle = gr; b.fillRect(0, 470, 1080, 2230); }), 0, -Math.round(py));
    const sy = 470 - py; if (sy > -1300) { L.shafts(g, 60, 1020, sy, 1400, lt, { n: 6, a: .16 }); L.beam(g, [-20, sy, 1100, sy], { w: 4, col: '#CFF0FF', a: .8 }); }
    L.scale(g, 100, 560 - py, 90 * M, { vertical: true, min: 0, max: 90, step: 5, every: 2, fmt: v => v + ' м', size: 30 });
    L.bubbles(g, 200, 300, 800, 1500, lt, { n: 26, r: 9, speed: 260, a: .45, seed: 9 }); L.motes(g, lt, { n: 40, a: .5 });
    const y = 560 + d * M - py; L.beam(g, [560, 560 - py, 560, y - 40], { w: 2, col: P.cyanHi, a: .5 });
    L.tracer(g, 560, y, 30, { col: P.cyan }); L.pill(g, 625, y, L.num(d) + ' м', { size: 40, dot: P.cyan });
  }, (g, lt, sc) => {
    L.header(g, lt, { over: 'как на глубине', title: '90 М', sub: 'это *9 бар', t: [.02, at(3, 'девяноста') - sc.t0, at(3, 'метров') - sc.t0 + .1], size: 170 });
  }],
  [(g, lt, sc) => { // 5. Вода сквозь спрессованный кофе
    const t = sc.t0 + lt, tp = at(4, 'спрессованный') - sc.t0, wv = at(4, 'вода') - sc.t0, sq = 26 * L.eb(L.pr(lt, tp, tp + .3), 1.2), top = 800 + sq, front = L.eio(L.pr(lt, wv, wv + 2.1));
    const cam = L.camera(lt, { d: sc.d, push: .07, zoom: false, pan: [0, 60], shake: [tp + .28, 6, .3] });
    L.layer(g, cam, .2, g => L.studio(g, { v: 'c', y: 200 }));
    L.layer(g, cam, 1, g => {
      g.save(); g.lineCap = 'round'; g.strokeStyle = '#07080B'; g.lineWidth = 70; g.beginPath(); g.moveTo(880, 930); g.lineTo(1200, 990); g.stroke(); g.strokeStyle = 'rgba(170,180,200,.3)'; g.lineWidth = 6; g.beginPath(); g.moveTo(890, 905); g.lineTo(1200, 962); g.stroke(); g.restore();
      L.tank(g, 110, 520, 860, 200, lt, { kind: 'chrome', r: 34, wall: 28, level: .82, liquid: ['#FFAE66', '#B4400F'], amp: 3, inside: (g, ix, iy, iw, ih) => L.bubbles(g, ix, iy, iw, ih, lt, { n: 12, r: 6, a: .5 }) });
      g.fillStyle = L.mat(g, 'steel', 0, 720, 0, 744); g.fillRect(150, 720, 780, 24); g.fillStyle = '#05070A'; for (let i = 0; i < 18; i++) g.fillRect(178 + i * 42, 727, 12, 12);
      for (let i = 0; i < 9; i++) { const x = 240 + i * 75; L.flow(g, [x, 744, x, top], lt, { col: P.orange, w: 6, a: L.pr(lt, wv - .2, wv + .2), speed: 300 }); }
      const inner = g => { g.beginPath(); g.moveTo(200, 772); g.lineTo(880, 772); g.lineTo(862, 1052); g.lineTo(218, 1052); g.closePath(); };
      g.drawImage(L.cache('basket', 760, 340, b => { b.translate(-160, -755);
        b.beginPath(); b.moveTo(170, 760); b.lineTo(910, 760); b.lineTo(888, 1085); b.lineTo(192, 1085); b.closePath(); b.fillStyle = L.mat(b, 'steel', 170, 0, 910, 0); b.fill();
        inner(b); b.fillStyle = '#0B0806'; b.fill(); L.grains(b, 150, 800, 780, 260, { path: inner, col: '#3A1D0C', s: 1.4 });
        b.save(); inner(b); b.clip(); const gs = b.createLinearGradient(0, 800, 0, 1052); gs.addColorStop(0, 'rgba(255,190,120,.25)'); gs.addColorStop(.2, 'rgba(0,0,0,0)'); gs.addColorStop(1, 'rgba(0,0,0,.45)'); b.fillStyle = gs; b.fillRect(150, 800, 780, 260); b.restore();
        b.fillStyle = '#05070A'; for (let i = 0; i < 14; i++) b.fillRect(250 + i * 44, 1060, 10, 14); }), 160, 755);
      g.fillStyle = '#0B0806'; g.fillRect(201, 773, 678, top - 772);
      g.save(); g.beginPath(); g.rect(200, top, 680, 1052 - top); g.clip();
      for (let i = 0; i < 9; i++) { const x0 = 240 + i * 75, v = []; for (let j = 0; j <= 8; j++) { const u = j / 8; v.push(L.lerp(x0, L.lerp(x0, 540, .25), u) + Math.sin(u * 9 + i * 1.9) * 16 * Math.sin(u * Math.PI), L.lerp(top, 1050, u)); }
        L.beam(g, v, { col: L.mix(P.orange, P.amber, i / 8), w: 3.5, a: .85, p: front }); }
      g.restore();
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(200, top - 2, 680, 3);
      g.beginPath(); g.moveTo(300, 1085); g.lineTo(780, 1085); g.lineTo(650, 1165); g.lineTo(430, 1165); g.closePath(); g.fillStyle = L.mat(g, 'chrome', 300, 0, 780, 0); g.fill();
      [470, 610].forEach((sx, i) => { g.fillStyle = L.mat(g, 'chrome', sx - 14, 0, sx + 14, 0); g.fillRect(sx - 14, 1160, 28, 60); const dq = L.pr(lt, wv + 2, wv + 2.3); if (dq > 0) L.stream(g, sx, 1220, 1220 + 300 * L.eo(dq), 12, lt, { seed: i * 3 }); });
      const q = L.pr(lt, tp - .15, tp + .45); if (q > 0 && q < 1) for (let i = 0; i < 3; i++) { const x = 330 + i * 210, y = 640 + L.eo(q) * 120; g.save(); g.globalAlpha *= Math.sin(q * Math.PI); g.strokeStyle = P.cyanHi; g.lineWidth = 10; g.beginPath(); g.moveTo(x - 46, y - 30); g.lineTo(x, y + 10); g.lineTo(x + 46, y - 30); g.stroke(); g.restore(); L.glow(g, x, y, 90, P.cyan, .5 * Math.sin(q * Math.PI)); }
      const tq = L.pr(lt, wv + .1, wv + 2.2); if (tq > 0 && tq < 1) L.tracer(g, L.lerp(615, 600, tq), L.lerp(744, 1050, tq), 18, { col: L.mix(P.orange, '#8A4A1C', tq) });
    });
  }, (g, lt, sc) => {
    L.header(g, lt, { over: 'Горячая вода проходит через', overSize: 46, title: '*СПРЕССОВАННЫЙ\nМОЛОТЫЙ КОФЕ', titleKey: P.amber, size: 112,
      t: [.05], titleTimes: [at(4, 'спрессованный') - sc.t0, at(4, 'молотый') - sc.t0, at(4, 'кофе') - sc.t0] });
  }],
  [(g, lt, sc) => { // 6. 25 секунд: струи, масла и аромат
    const t = sc.t0 + lt, f = CUP(t), ar = at(5, 'аромат') - sc.t0, ml = at(5, 'масла') - sc.t0;
    const cam = L.camera(lt, { d: sc.d, push: .06, drift: .05 });
    L.layer(g, cam, .2, g => L.studio(g, { v: 'c', x: 60, y: 40, dark: .2 }));
    L.layer(g, cam, 1, g => {
      g.beginPath(); g.moveTo(290, 470); g.lineTo(790, 470); g.lineTo(690, 565); g.lineTo(390, 565); g.closePath(); g.fillStyle = L.mat(g, 'steel', 290, 0, 790, 0); g.fill();
      g.save(); g.lineCap = 'round'; g.strokeStyle = '#07080B'; g.lineWidth = 60; g.beginPath(); g.moveTo(780, 500); g.lineTo(1150, 455); g.stroke(); g.restore();
      [470, 610].forEach(sx => { L.rrect(g, sx - 16, 555, 32, 90, 10); g.fillStyle = L.mat(g, 'chrome', sx - 16, 0, sx + 16, 0); g.fill(); });
      const surf = 1364 - 322 * f, sp = L.eo(L.pr(lt, .2, .45));
      [470, 610].forEach((sx, i) => L.stream(g, sx, 645, L.lerp(645, surf, sp), 17, lt, { seed: i * 2.3 }));
      const oq = L.pr(lt, ml - .2, ml + .2); for (let k = 0; k < 8; k++) { const q = (lt * .9 + k / 8) % 1, sx = k % 2 ? 610 : 470; L.glow(g, sx + Math.sin(k * 7 + lt * 9) * 4, L.lerp(660, surf, q), 26, P.amber, oq * .9); }
      L.cup(g, 540, 1400, 400, 360, lt, { fill: f, layers: LAYERS, foam: 8 + 26 * f, handle: true });
      L.steam(g, 540, surf - 30, lt, { col: '#B48CFF', a: L.pr(lt, ar - .4, ar + .2) * 1.2, n: 3, h: 420, spread: 80, amp: 50 });
    });
  }, (g, lt, sc) => {
    const t = sc.t0 + lt;
    L.header(g, lt, { title: '25 СЕКУНД', t: [0, at(5, 'двадцать') - sc.t0], y: 290, size: 140 });
    const q = L.pr(lt, .15, .45); if (q > 0) { g.save(); g.globalAlpha *= L.eo(q); L.ring(g, 180, 1190, 96, TIME(t) / 25, { col: P.violet, w: 14, ticks: 25 }); L.text(g, String(Math.floor(TIME(t))), 180, 1210, 58, { kind: 'mono', al: 'center', col: P.text }); g.restore(); }
    L.callout(g, lt, at(5, 'масла') - sc.t0, 470, 800, 395, 720, 'МАСЛА', { side: 'l', col: P.amber });
    L.callout(g, lt, at(5, 'аромат') - sc.t0, 640, 900, 715, 860, 'АРОМАТ', { col: P.violet });
  }],
  [(g, lt, sc) => { // 7. Крема - признак правильной экстракции
    const cr = L.eo(L.pr(lt, .15, 1.9)), cam = L.camera(lt, { d: sc.d, push: .07, zoom: false, pan: [0, -110] });
    L.layer(g, cam, .3, g => L.studio(g, { v: 'c', y: -100 }));
    L.layer(g, cam, 1, g => {
      const c = L.cup(g, 540, 1430, 660, 570, lt, { fill: .8, layers: LAYERS, foam: 6 + cr * 80, handle: true, k: .17 });
      const ly = c.iby - c.ih * .8; L.bubbles(g, 310, ly + 6, 460, cr * 66, lt, { n: 14, r: 5, col: '#FFE2B0', a: .55, speed: 30, seed: 3 });
      L.beam(g, [848, ly, 848, ly + 6 + cr * 80], { col: P.amber, w: 3, a: cr }); L.beam(g, [832, ly, 864, ly], { col: P.amber, w: 3, a: cr }); L.beam(g, [832, ly + 6 + cr * 80, 864, ly + 6 + cr * 80], { col: P.amber, w: 3, a: cr });
      L.steam(g, 540, ly - 20, lt, { n: 2, h: 400, spread: 140, a: .85 });
      L.glow(g, 540, ly, 280, P.amber, .14 + cr * .14, { sy: .25 });
    });
  }, (g, lt, sc) => {
    L.header(g, lt, { over: 'Сверху появляется *пенка', title: 'КРЕМА', t: [.05, at(6, 'крема') - sc.t0], size: 170, col: ['#FFF0D2', '#E0954A'], glow: 'rgba(255,170,80,.5)', key: P.amber });
    L.badge(g, lt, at(6, 'правильной') - sc.t0, 540, 680, 'ПРАВИЛЬНАЯ ЭКСТРАКЦИЯ', { size: 44, col: P.ok });
  }],
  [(g, lt, sc) => { // 8. Финал: чашка на подиуме
    const cam = L.camera(lt, { d: sc.d, push: .08, zoom: false, pan: [0, -70] });
    L.layer(g, cam, .2, g => L.studio(g, { v: 'b', y: 140 }));
    L.layer(g, cam, .5, g => L.bokeh(g, lt, { n: 5, y0: 300, y1: 1400, a: .3, r: 55, seed: 5 }));
    L.layer(g, cam, 1, g => {
      L.pedestal(g, 540, 1330, 330, lt, { h: 120 });
      L.cup(g, 540, 1338, 420, 370, lt, { fill: .8, layers: LAYERS, foam: 44, handle: true });
      L.steam(g, 540, 1000, lt, { n: 2, h: 440, spread: 120, a: .9 });
      L.flare(g, 330 + 420 * L.eio(L.pr(lt, 3.2, 4.2)), 968, 260, { a: Math.sin(L.pr(lt, 3.2, 4.2) * Math.PI) * .8 });
    });
  }, (g, lt, sc) => {
    L.header(g, lt, { over: '25 секунд *науки', title: 'ИДЕАЛЬНЫЙ\nЭСПРЕССО', t: [.05], titleTimes: [at(7, 'идеального') - sc.t0, at(7, 'эспрессо') - sc.t0], size: 130 });
    L.badge(g, lt, at(7, 'готова') - sc.t0, 540, 790, 'ГОТОВО', { size: 60, col: P.ok, rot: -4 });
  }]
];

function hud(g, t, sc) { // статус-метка и пульт-показания (с 7,4 с)
  const st = sc.i === 0 && t < 1.3 ? STATUS[0] : sc.i === 0 ? ['РАЗРЕЗ', P.cyan] : STATUS[sc.i];
  L.chip(g, 1016, 150, st[0], { col: st[1] });
  const a = L.pr(t, 7.4, 7.75); if (a <= 0) return;
  const prev = ON[Math.max(0, sc.i - 1)], cur = ON[sc.i], e = L.eo(L.pr(sc.lt, 0, .3)), on = j => L.lerp(prev[j], cur[j], e);
  g.save(); g.globalAlpha *= L.eo(a); g.translate(0, (1 - L.eo(a)) * 90);
  L.readouts(g, 60, 1508, 960, [
    { label: 'ТЕМПЕРАТУРА', value: String(Math.round(TEMP(t))), unit: '°C', col: P.orange, on: on(0), frac: L.pr(TEMP(t), 20, 92) },
    { label: 'ДАВЛЕНИЕ', value: String(Math.max(0, Math.round(BAR(t)))), unit: 'бар', col: P.cyan, on: on(1), frac: L.cl(BAR(t) / 9) },
    { label: 'ВРЕМЯ', value: String(Math.floor(TIME(t))), unit: 'с', col: P.violet, on: on(2), frac: TIME(t) / 25 }], { h: 168 });
  g.restore();
}

function frame(g, t) { const sc = L.cuts(t, CUTS), [world, ui] = SC[sc.i]; world(g, sc.lt, sc); ui(g, sc.lt, sc); hud(g, t, sc); }
function draw(t, k) {
  L.prewarm(k, CUTS.map(c => c + 1.5).concat([7.7, 8.1, 8.4, 8.7, 9.0, 9.3, 9.7]), tt => frame(k.g, tt));
  frame(L.begin(t, k), t);
}

function sound(s) {
  const w = (i, x, n) => L.at(i, x, n, s.subs), p = (t, n, v, o) => s.play(t, n, v, o);
  p(.08, 'pop_soft', .12); p(.42, 'marimba', .14); p(1.25, 'click', .2); p(1.32, 'toggle_on', .12); p(w(0, 'вкуснее'), 'pop_soft', .1); p(w(0, 'турки') - .05, 'pop_high', .12);
  p(4.1, 'marimba_run', .13); p(w(1, 'давление') - .1, 'woodblock', .14); p(w(1, 'температура') - .1, 'woodblock', .14, { pitch: 1.12 }); p(w(1, 'время') - .1, 'woodblock', .14, { pitch: 1.26 });
  p(7.4, 'kalimba_run', .12); p(7.8, 'counter', .1); p(9.1, 'bubble', .09); p(w(2, 'не'), 'rim', .12);
  p(11.9, 'marimba_run', .12); p(w(3, 'давит') - .1, 'tally', .1); p(13.35, 'wood', .18); p(14.7, 'bubble_down', .14); p(15.2, 'odometer', .08); p(16.0, 'drop', .14);
  p(16.8, 'kalimba_run', .12); p(w(4, 'вода'), 'drop', .1); p(w(4, 'спрессованный') + .25, 'woodblock', .16, { pitch: .8 }); p(w(4, 'кофе'), 'pop_soft', .1);
  p(21.1, 'marimba_run', .12); p(21.5, 'counter', .08); p(w(5, 'масла'), 'bubble', .1); p(w(5, 'аромат'), 'sparkle', .1);
  p(25.2, 'kalimba_run', .12); p(w(6, 'крема'), 'pop_double', .12); p(w(6, 'правильной'), 'success', .16);
  p(30.2, 'marimba_run', .12); p(w(7, 'науки'), 'pop_soft', .1); p(w(7, 'эспрессо'), 'magic', .1); p(w(7, 'готова'), 'ta_da', .16);
}
