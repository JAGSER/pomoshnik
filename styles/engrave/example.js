// «История шоколада» в стиле «Гравюра»: восемь гравюрных таблиц, по одной на фразу. Люди, предметы и цвета из текста нарисованы в момент слова.
// Картуш года уместен: тема про эпохи. Сквозной предмет - шоколад (коричневая акварель).
const E = ENGRAVE, P = E.P, CHOC = '#7A4A2E', MILK = '#DDB487';
const CUTS = [0, 4.4, 8.8, 12.3, 16.9, 21.9, 27.2, 30.7];
const CAPS = ['шоколад@1.45 был@2.05 *горьким@2.3', 'какао@2.3 и@3.0 *перец@3.05', 'бобы@0.8 как@2.05 *деньги@2.3', 'какао@2.75 плывёт@2.9 в@3.25 *Европу@3.3',
  '*сахар@1.45 и@2.2 мода@3.1 при@3.2 дворе@3.3', 'год@2.35 первой@3.55 *плитки@4.05', '*молочный@1.45 шоколад@2.15', 'лакомство@1.2 *миллиардов@2.25'];
const YEARS = [[0, -1000, 'до н. э.'], [4.45, 600, 'майя', .9], [8.85, 1450, 'ацтеки', .8], [12.35, 1528, 'Испания', .8], [16.95, 1660, 'королевский двор', .8], [21.95, 1847, 'Англия', .3], [27.25, 1875, 'Швейцария', .7], [30.75, 2026, 'наши дни', .9]];

// ---------- свои гравюры темы (на верхнем уровне) ----------
const POD = E.engrave({ w: 200, h: 330, layers: [{ pts: E.rotP(E.ell(100, 166, 78, 146, 60), 100, 166, -10), shade: 'sph', hatch: 'mer', d: [.08, .82], per: 5.5, tint: P.ochre, ta: .5 }],
  draw(x) { x.lineWidth = 1.8; [-.5, 0, .5].forEach(f => { x.beginPath(); x.ellipse(100 + f * 60, 166, 10, 140, -10 * E.DEG, 0, E.TAU); x.stroke(); }); } });
const BEAN = E.engrave({ w: 70, h: 48, layers: [{ pts: E.ell(35, 24, 29, 18, 30), shade: 'sph', hatch: 'mer', d: [.15, .85], per: 3.6, tint: CHOC, ta: .65, line: 1.6 }] });
const PEPPER = E.engrave({ w: 120, h: 300, layers: [{ pts: E.spl([60, 20, 92, 60, 84, 180, 58, 290, 40, 180, 30, 60], true, 5), shade: 'cyl', hatch: 'lin', ang: 95, d: [.05, .8], per: 5, tint: P.red, ta: .65 }] });
const BAR = E.engrave({ w: 520, h: 280, layers: [{ pts: E.rect(10, 10, 500, 260), shade: 'lin', light: -130, d: [.25, .8], hatch: 'lin', ang: 0, per: 4, tint: CHOC, ta: .7, line: 2.6 }],
  draw(x) { x.lineWidth = 2; for (let i = 1; i < 5; i++) { x.beginPath(); x.moveTo(10 + i * 100, 14); x.lineTo(10 + i * 100, 266); x.stroke(); } [1, 2].forEach(j => { x.beginPath(); x.moveTo(14, 10 + j * 87); x.lineTo(506, 10 + j * 87); x.stroke(); }); } });
const BAR_N = E.engrave({ w: 520, h: 280, night: true, layers: BAR.o.layers, draw: BAR.o.draw });
const CUP = E.cup({ w: 84, liquid: CHOC }), JUG = E.turn(E.jug({ h: 260, tint: P.white }), -40), SHIP = E.ship(), WAV = E.waves({ h: 200, tint: P.sky }), MNT = E.mountains({ h: 360, seed: 9 });
const PYR = E.pyramid({ w: 760, h: 440 }), BAL = E.balance({ len: 260, chain: 260 }), COIN = E.coin({ r: 36 });
const MAYA = { skin: '#B98058', top: P.ochre, skirt: P.red, hair: P.ink, long: true }, LADY = { skirt: P.purple, top: P.pink, hair: '#C9A24A', bun: true }, LORD = { top: P.navy, legs: P.ink, hair: '#E8E1D3' };
E.pre(g => { E.person(g, 0, 0, 460, Object.assign({ pose: 'hold' }, MAYA)); E.person(g, 0, 0, 440, Object.assign({ pose: 'hold' }, LADY)); E.person(g, 0, 0, 460, Object.assign({ pose: 'hold' }, LORD)); });
const cupIn = (g, x, y) => { E.put(g, CUP, x + 14, y + 10); };

const SC = [
  { hits: [2.35], draw(g, lt) { // 3000 лет назад: горький напиток
    E.paper(g);
    E.layer(g, .35, g => E.put(g, PYR, 540, 1470, { a: .18 * E.ap(lt, .3, .8) }));
    E.layer(g, .6, g => { E.display(g, '3000', 540, 640, 300, lt, .02, { al: 'center', dur: .3 }); E.title(g, 'лет назад', 540, 790, 100, lt, .35, { al: 'center' }); });
    E.layer(g, 1, g => { const r = E.person(g, 440, 1480, 460, Object.assign({ pose: 'hold', a: E.ap(lt, .5, .4), item: cupIn }, MAYA));
      if (lt > 1.4) E.steam(g, lt, r.hand[0] + 12, r.hand[1] - 40, { h: 90, n: 2, a: .5 * E.ap(lt, 1.4, .5) }); E.stamp(g, 'горько', 790, 1240, lt, 2.35, { rot: -10, size: 64 }); });
  } },
  { draw(g, lt) { // майя варят какао с перцем
    E.paper(g);
    E.layer(g, .7, g => E.title(g, 'Ольмеки и майя', 90, 470, 110, lt, .08));
    E.layer(g, 1, g => { // какао на слове 2,3 с, перец на 3,05 с: майя держат их в руках
      E.person(g, 270, 1480, 440, Object.assign({ pose: lt > 2.3 ? 'hold' : 'stand', item: lt > 2.3 ? (g, x, y) => E.put(g, POD, x + 20, y - 40, { sc: .5, a: E.ap(lt, 2.3, .2) }) : null }, MAYA));
      E.label(g, 'какао', 300, 860, lt, 2.3); E.plus(g, 540, 1000, 30, E.pr(lt, 2.8, 3.05)); E.label(g, 'перец', 790, 860, lt, 3.05);
      E.person(g, 800, 1480, 420, { pose: lt > 3.05 ? 'hold' : 'stand', dir: -1, skin: '#B98058', top: P.greenV, hair: P.ink, item: lt > 3.05 ? (g, x, y) => E.put(g, PEPPER, x - 20, y - 40, { sc: .6, rot: -30 }) : null }); });
  } },
  { hits: [2.7], draw(g, lt) { // ацтеки: бобы как деньги
    E.paper(g);
    E.layer(g, .7, g => E.title(g, 'Ацтеки', 90, 470, 124, lt, .1));
    E.layer(g, 1, g => { const tilt = -6 * E.spring(lt - 1.2, 1.4, .35) + 10 * E.spring(lt - 2.45, 1.3, .3);
      E.drawBalance(g, BAL, 600, 720, tilt, { left: (g, x, y) => [-60, 0, 60, -30, 30].forEach((dx, i) => { const f = E.fall(lt, .8 + i * .1, -360, 0, { dur: .3, bounce: 8 }); if (f.on) E.put(g, BEAN, x + dx, y - 8 - (i > 2 ? 24 : 0) + f.y); }),
        right: (g, x, y) => [-30, 30].forEach((dx, i) => { const f = E.fall(lt, 2.3 + i * .15, -380, 0, { dur: .3, bounce: 8 }); if (f.on) E.put(g, COIN, x + dx, y - 10 + f.y); }) });
      E.person(g, 200, 1500, 380, { pose: 'point', skin: '#B98058', top: P.greenV, hat: 'cap', hatCol: P.gold, a: E.ap(lt, .2, .3) });
      E.stamp(g, 'валюта', 806, 560, lt, 2.7, { rot: 8, size: 58 }); });
  } },
  { draw(g, lt) { // XVI век: испанцы везут какао
    E.paper(g);
    E.layer(g, .5, g => { E.display(g, 'XVI', 540, 560, 260, lt, .05, { al: 'center' }); E.title(g, 'век', 540, 690, 100, lt, .7, { al: 'center' }); E.label(g, 'в Европу', 840, 1600, lt, 3.3); });
    E.layer(g, .8, g => E.drawWaves(g, WAV, 0, 1290, -lt * 26));
    E.layer(g, 1, g => { E.put(g, SHIP, E.lerp(260, 640, E.eo(lt / 4)), 1440 + Math.sin(lt * 2.2) * 6); E.drawWaves(g, WAV, 0, 1410, lt * 38); });
  } },
  { draw(g, lt) { // сахар и мода при дворе
    E.paper(g);
    E.layer(g, .7, g => { E.title(g, '+ *сахар', 540, 470, 140, lt, 1.45, { al: 'center', keyCol: P.navy }); E.plaque(g, 'при дворе', 540, 640, lt, 3.1); });
    E.layer(g, 1, g => { E.person(g, 320, 1480, 440, Object.assign({ pose: 'hold', item: cupIn, a: E.ap(lt, .1, .3) }, LADY)); E.person(g, 770, 1480, 460, Object.assign({ pose: 'hold', dir: -1, item: (g, x, y) => E.put(g, CUP, x - 14, y + 10), a: E.ap(lt, .3, .3) }, LORD));
      const f = E.fall(lt, 1.5, 700, 1150, { dur: .4, bounce: 0 }); if (f.on && f.hit < 0) { g.fillStyle = P.white; g.fillRect(400, f.y - 260, 30, 30); g.strokeRect(400, f.y - 260, 30, 30); } });
  } },
  { dark: true, tr: 'cut', settle: 18, hits: [3.6], draw(g, lt) { // 1847, машинопись, первая плитка
    E.dark(g);
    E.typed(g, '1847', 150, 760, 230, lt, 0, { col: P.bone, at: [.1, .65, 1.35, 1.8], cursorTill: 2.4 });
    E.typed(g, 'АНГЛИЯ, БРИСТОЛЬ', 150, 900, 46, lt, 2.4, { col: P.bone, cps: 18 });
    E.put(g, BAR_N, 540, 1260 - 80 * (1 - E.spring(lt - 3.4, 1.6, .45)), { a: E.ap(lt, 3.4, .25) });
    E.stamp(g, 'первая плитка', 760, 1460, lt, 3.6, { rot: -7, size: 48 });
  } },
  { tr: 'cut', settle: 0, draw(g, lt) { // Швейцария: молочный шоколад
    E.paper(g);
    E.layer(g, .3, g => E.put(g, MNT, 540, 900, { rv: E.eo(E.pr(lt, 0, .7)), dir: 'up' }));
    E.layer(g, .7, g => E.title(g, '*молочный', 540, 440, 150, lt, 1.45, { al: 'center', keyCol: P.navy }));
    E.layer(g, 1, g => { const jx = E.lerp(1300, 800, E.spring(lt - .15, 1.1, .6)), m = E.eo(E.pr(lt, 1.2, 2.6)); E.put(g, BAR, 470, 1260);
      if (m > 0) { g.save(); g.globalAlpha = .62; g.fillStyle = MILK; g.beginPath(); g.rect(222, 1122, 496, 256); g.clip(); g.beginPath(); g.arc(470, 1250, 300 * m, 0, E.TAU); g.fill(); g.restore(); }
      E.pour(g, jx - 170, 980, 470, 1150, lt, E.pr(lt, .85, 1.2), { w: 34, col: P.white }); E.put(g, JUG, jx, 890); });
  } },
  { draw(g, lt) { // сегодня: миллиарды людей
    E.paper(g);
    E.layer(g, .8, g => E.title(g, 'сегодня', 540, 440, 130, lt, .05, { al: 'center' }));
    E.layer(g, 1, g => { E.crowd(g, 170, 910, 1480, 420, 5, { pose: 'hold', ages: ['adult', 'child', 'adult', 'child', 'old'], seed: 2, each: i => ({ item: (g, x, y) => { g.fillStyle = CHOC; g.fillRect(x - 6, y - 30, 28, 40); g.strokeRect(x - 6, y - 30, 28, 40); } }) });
      if (lt > 2.1) { const v = 1e9 * E.eio(E.pr(lt, 2.2, 3.1)); E.odo(g, v, 540, 700, 92, { digits: 10, group: true }); } });
  } }
];

function draw(t, k) {
  const g = E.begin(t, k), sc = E.scenes(g, t, CUTS, SC);
  E.year(g, t, YEARS, { a: sc.dark ? 0 : E.ap(t, .9, .3), dark: sc.dark });
  E.caption(g, t, CAPS);
}

function sound(s) {
  const P = (t, n, v) => s.play(t, n, v);
  P(.03, 'marimba', .16); P(2.35, 'woodblock', .2); P(4.4, 'marimba_run', .13); P(6.6, 'wood', .14); P(7.45, 'wood', .14);
  P(8.8, 'marimba_run', .13); P(9.7, 'drop', .1); P(11.1, 'drop', .12); P(11.5, 'woodblock', .2); P(12.3, 'kalimba_run', .13); P(15.6, 'pop_soft', .1);
  P(16.9, 'marimba_run', .13); P(18.4, 'drop', .12); P(20.1, 'pop_soft', .1); P(22.0, 'type', .16); P(23.25, 'type', .16); P(25.5, 'woodblock', .2);
  P(27.2, 'kalimba_run', .13); P(28.4, 'magic', .13); P(30.7, 'marimba_run', .13); P(32.95, 'odometer', .12); P(33.8, 'fanfare_soft', .17);
}
