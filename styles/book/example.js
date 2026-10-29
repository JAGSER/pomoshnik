// Демо «Путешествие капельки: круговорот воды» — только BOOK и обычный canvas (по doc.md).
const P = BOOK.P, B = BOOK;
let WT = null, SC = null;
// доля круга для значка-путешествия: море → пар → облако → дождь → море, потом «снова и снова»
const JF = [[0, 0], [7.7, 0], [8.15, .25], [11.6, .33], [12.4, .5], [17.2, .55], [19.9, .6], [20.25, .75], [22, .77], [25.4, .85], [29.05, .95], [29.51, 1], [31.3, 1]];
const LOOPS = [29.51, 32.66, 34.02];
const jf = t => t < 31.3 ? B.kf(JF, t) : t < 34.02 ? 1 + 2 * B.eio(B.pr(t, 31.3, 34.02)) : 3 + B.eo(B.pr(t, 34.02, 35)) * .1;

function words(k) {
  const S = k.subs, w = (i, s) => B.when(S[i], s) - .1;
  return { kap: w(0, 'капелька'), sin: w(0, 'синем'), more: w(0, 'море'), prig: w(1, 'пригрело'), prev: w(1, 'превратилась'), par: w(1, 'пар'),
    podn: w(2, 'поднялась'), vys: w(2, 'высоко-высоко'), stala: w(2, 'стала'), obl: w(2, 'облаком'), polet: w(3, 'полетело'), gor: w(3, 'горами'), pol: w(3, 'полями'),
    hol: w(4, 'холодно'), kap5: w(4, 'капелька'), upala: w(4, 'упала'), dozh: w(4, 'дождём'), zem: w(4, 'землю'), napo: w(5, 'напоила'), cvet: w(5, 'цветок'),
    pobe: w(5, 'побежала'), ruch: w(5, 'ручейком'), priv: w(6, 'привёл'), ee: w(6, 'её'), vreku: w(6, 'в реку'), reku: w(6, 'реку'), arek: w(6, 'а река'),
    vern: w(6, 'вернула'), vmore: w(6, 'в море'), more7: w(6, 'море'), voda: w(7, 'вода'), put: w(7, 'путешествует'), po: w(7, 'по кругу'), krug: w(7, 'кругу'),
    sno1: w(7, 'снова'), sno2: w(7, 'и снова') + .17 };
}

// ---------- 1. Жила-была капелька ----------
function sIntro(g, lt, s) {
  const t = s.t, gy = 1330, t1 = Math.sqrt(2 * 760 / 5000), t2 = t1 * 1.84, b = B.bounce(t, 760, { e: .42, n: 3 }), h = B.hop(t, WT.sin - .2, WT.sin + .25, 300);
  B.paper(g);
  B.screen(g, g => { B.write(g, t, .05, 'Жила-была', 540, 440, 165, { al: 'center' });
    B.write(g, t, WT.kap, 'капелька', 540, 680, 205, { al: 'center', col: P.waterD, swash: B.rgba(P.waterL, .9) }); });
  let y = gy - b.y, sq = b.sq; if (t > WT.sin - .4) { y = gy - h.y; sq = h.sq; }
  B.dashes(g, 540, gy, (t - t1) / .5, { w: 150 }); B.dashes(g, 540, gy, (t - t2) / .4, { w: 120, lw: 4 });
  if (t < t1) B.speed(g, 540, y - 330, 90, { n: 3, len: 110, spread: 120, col: P.waterD, gap: 20 });
  const md = t < t1 ? 'wow' : t < t1 + .5 ? 'joy' : t < WT.sin - .45 ? 'happy' : 'wow';
  B.hero(g, 540, y, 1.35, { mood: md, sq, lookY: t > 1.3 && t < 2.1 ? -1 : 0, arms: t > 1.5 && t < 2.15 ? 'wave' : null, shadow: gy });
}
// ---------- в большом синем море ----------
function sSea(g, lt, s) {
  const t = s.t, sy = 1160, wy = B.waveY(540, sy, 16), q = B.pr(lt, 0, .22), hy = lt < .22 ? B.lerp(wy - 300, wy + 36, q * q) : wy + 36 + Math.sin(lt * 4) * 5;
  B.paper(g, { y1: 1240 }); B.band(g, 1000, 1120, B.rgba(P.waterL, .5), { amp: 5, rim: 0 });
  [[150, 880, .8, 1], [250, 836, .6, 2]].forEach(([x, y, k, sd]) => B.bird(g, x + lt * 60, y + Math.sin(lt * 2 + sd) * 8, k, { seed: sd }));
  B.hero(g, 540, hy, 1.25, { mood: lt < .55 ? 'wow' : 'joy', sq: lt < .22 ? -.2 : .2 * Math.exp(-(lt - .22) * 8) * Math.cos((lt - .22) * 20), shadow: false, arms: lt > .7 ? 'up' : null });
  B.sea(g, sy, { amp: 16 });
  B.splash(g, 540, wy, lt - .22, { s: 1.2, n: 11 });
  B.screen(g, g => { B.story(g, t, 'в большом *синем', 540, 420, 62, { at: [s.t - lt, s.t - lt + .12, WT.sin + .05] });
    B.write(g, t, WT.more, 'море', 540, 730, 260, { al: 'center', col: P.waterD, bob: .5 }); });
}
// ---------- 2. Солнышко пригрело ----------
function sSun(g, lt, s) {
  const t = s.t, sy = 1300, hx = 470, wy = B.waveY(hx, sy, 12), hot = t > WT.prig;
  B.paper(g, { y1: 1350 }); B.band(g, -300, 930, B.rgba('#FAD7A2', .85), { amp: 34, seed: 5 });
  B.sun(g, 790, B.lerp(1440, 770, B.spring(lt - .1, 1.2, 4.5)), 150, { face: lt < 1 ? 'sleep' : 'happy' });
  B.hero(g, hx, wy + 36, 1.05, { mood: hot ? 'hot' : 'happy', look: .6, lookY: -.5, shadow: false });
  if (hot) B.steam(g, hx, wy - 250, { n: 3, h: 220, col: B.rgba(P.orange, .55), w: 6, gap: 52, sp: 1.3 });
  B.sea(g, sy, { amp: 12 });
  B.thermo(g, 150, 640, 470, B.lerp(.3, .86, B.eo(B.pr(t, WT.prig + .1, WT.prig + 1))));
  B.screen(g, g => { B.write(g, t, WT.prig + .55, '+30°', 212, 800, 96, { col: P.coral });
    B.write(g, t, s.t - lt + .05, 'Солнышко', 70, 400, 150, {});
    B.story(g, t, '*пригрело', 82, 512, 62, { al: 'left', at: [WT.prig] }); });
}
// ---------- превратилась в пар → поднялась высоко-высоко ----------
const SKY3 = [P.night, '#25235F', P.dusk, P.magenta, '#EE9686', '#F6BE8A', '#F9DCB2'];
const CL3 = [[170, 760, 1.15, .7, 1], [930, 260, 1.2, .85, 2], [140, -480, 1.25, .8, 3], [900, -1050, 1.2, .7, 0], [300, -1650, 1.1, .6, 1]];
function sRise(g, lt, s) {
  const t = s.t, R0 = WT.podn - .45 - (s.t - lt), seaY = 1500, cam = B.cam(), m = B.eio(B.pr(lt, .25, 1.25));
  const hy = B.kf([[0, seaY + 42], [.5, seaY + 42], [R0, 1390], [s.dur, -1390]], lt), hx = 540 + Math.sin(lt * 2.2) * 14;
  B.sky(g, SKY3, { y0: -3300, y1: 1750 });
  B.stars(g, { n: 60, x0: -100, x1: 1180, y0: -3200, y1: -1100, seed: 7 });
  B.moon(g, 790, -2240, 64);
  CL3.forEach(([x, y, f, k, sd]) => B.layer(g, f, g => B.cloud(g, x, y, k, { seed: sd, tint: y < -700 ? 'night' : 'warm' })));
  B.bird(g, 280 + lt * 60, 690, .9, { seed: 3 }); B.bird(g, 370 + lt * 60, 650, .7, { seed: 4 });
  if (lt < R0 + .6) B.steam(g, 540, hy - 140, { n: 4, h: 360, gap: 95, col: 'rgba(255,255,255,.8)' });
  if (lt > R0) for (let i = 1; i <= 4; i++) { const a = (1 - i / 5) * B.pr(lt, R0, R0 + .4); g.fillStyle = B.rgba('#FFFFFF', .55 * a); g.beginPath(); g.arc(hx + Math.sin(lt * 3 + i) * 18, hy + i * 62, 34 - i * 5, 0, 6.3); g.fill(); }
  B.hero(g, hx, hy, B.lerp(1.55, 1.15, B.eio(B.pr(lt, R0, R0 + 1))), { shape: 'drop', to: 'puff', m, mood: lt < 1 ? 'wow' : 'joy', shadow: false, lookY: lt > R0 ? -.8 : 0, arms: lt > R0 + .3 ? 'up' : null });
  if (cam.y + 1000 > seaY) B.sea(g, seaY, { amp: 12 });
  B.story(g, t, '*превратилась в', 540, 560, 62, { at: [WT.prev, WT.par - .18] });
  B.write(g, t, WT.par, 'пар', 540, 900, 300, { al: 'center' });
  if (lt > R0 - .3) B.screen(g, g => {
    const a = B.eo(B.pr(lt, R0 - .3, R0 + .2)); g.save(); g.globalAlpha = a;
    B.tape(g, 110, 520, 1440, Math.max(0, seaY - hy) * 1.1, { px: .91, step: 100, every: 5, w: 104, unit: 'км', fmt: v => String(v / 1000).replace('.', ',') });
    g.restore();
    B.pop(g, t, WT.podn - .1, 330, 300, g => B.scrap(g, 330, 300, 430, 104, { rot: -2 }), { from: .8 });
    B.story(g, t, '*поднялась', 330, 322, 58, { at: [WT.podn] });
    const sw = B.rgba('#FFF3E6', .6);
    B.write(g, t, WT.vys, 'высоко-', 620, 830, 150, { al: 'center', swash: sw });
    B.write(g, t, WT.vys + .5, 'высоко', 640, 630, 172, { al: 'center', swash: sw });
  });
}
// ---------- и стала облаком ----------
function sCloud(g, lt, s) {
  const t = s.t, m = B.eo(B.pr(t, WT.obl - .1, WT.obl + .45));
  B.sky(g, 'night'); B.stars(g, { n: 48, y1: 1550, seed: 4 }); B.moon(g, 220, 420, 70);
  [[-140, 700], [1220, 820], [-120, 1300], [1200, 1380]].forEach(([x, y], i) => { const q = B.eo(B.pr(lt, i * .06, .62 + i * .06));
    if (m < 1) B.cloud(g, B.lerp(x, 540 + (i % 2 ? 90 : -90), q), B.lerp(y, 1150, q), .42, { tint: 'night', seed: i, a: 1 - m }); });
  if (t > WT.obl) for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + .4, e = B.eo(B.pr(t, WT.obl, WT.obl + .6)); B.sparkle(g, 540 + Math.cos(a) * (240 + e * 150), 1040 + Math.sin(a) * (150 + e * 90), 22 * Math.sin(Math.PI * B.pr(t, WT.obl, WT.obl + 1.2)), '#FFF3C4'); }
  B.hero(g, 540, 1210, 1.42, { shape: 'puff', to: 'cloud', m, tint: 'night', mood: m > .5 ? 'joy' : 'wow', sq: .12 * Math.sin(B.pr(t, WT.obl, WT.obl + .5) * Math.PI) });
  B.screen(g, g => { B.story(g, t, 'и *стала', 540, 520, 62, { at: [WT.stala - .2, WT.stala], col: '#F8F3EA', kcol: P.sunL, kbg: B.rgba(P.dusk, .7) });
    B.write(g, t, WT.obl, 'облаком', 540, 760, 200, { al: 'center', col: '#FFF6E2' }); });
}
// ---------- 4. Облако полетело над горами и полями ----------
const fy5 = x => 1370 + Math.sin(x * .003) * 50 + Math.sin(x * .011) * 14;
const TR5 = [[300, 'round', P.teal, 1], [760, 'pine', null, .9], [1320, 'lolly', P.sun, .9], [2000, 'round', P.teal, 1.05], [2700, 'pine', null, 1]];
function sFly(g, lt, s) {
  const t = s.t, cam = B.cam(), hx = cam.x - 260 + B.eio(B.pr(lt, 0, s.dur)) * 430 + Math.sin(lt * 1.7) * 12, hyy = 650 - B.eio(B.pr(lt, 1.5, s.dur)) * 60 + Math.sin(lt * 2.3) * 10;
  B.paper(g, { y1: 1180 });
  B.screen(g, g => { B.band(g, -200, 760, B.rgba('#C3DFEF', .8), { amp: 30, seed: 2, x0: 0, x1: 1080 }); B.sun(g, 870, 480, 82, {}); });
  B.layer(g, .2, g => B.cloud(g, 1250, 330, .5, { seed: 3, flip: true }));
  B.layer(g, .35, g => { B.mountains(g, -300, 2500, 1110, { h: 440, seed: 5 });
    const a = B.pr(t, WT.gor, WT.gor + .5); if (a > 0) { B.write(g, t, WT.gor, 'горы', 1100, 930, 130, { al: 'center', swash: B.rgba(P.paperL, .8) }); B.arrow(g, [1150, 960, 1210, 990, 1250, 1040], B.pr(t, WT.gor + .3, WT.gor + .7), { w: 4 }); } });
  B.layer(g, .6, g => B.hill(g, x => 1130 + Math.sin(x * .004) * 40, P.mint, { y1: 1460 }));
  B.layer(g, .8, g => { B.fields(g, 1200, 2900, 1190, 1330, {}); if (t > WT.pol) { B.write(g, t, WT.pol, 'поля', 1980, 1130, 130, { al: 'center', swash: B.rgba(P.paperL, .8) }); } });
  B.ground(g, fy5, {});
  TR5.forEach(([x, kind, col, k]) => B.tree(g, x, fy5(x) + 6, k, { kind, col }));
  [560, 1500, 2250].forEach((x, i) => B.flower(g, x, fy5(x) + 4, .55, { kind: i % 2 ? 'tulip' : 'daisy' }));
  for (let x = 120; x < 3000; x += 230) B.tuft(g, x, fy5(x) + 3, .8);
  B.shadow(g, hx, fy5(hx) + 30, 360, 50, .5);
  B.speed(g, hx - 150, hyy - 120, 0, { n: 4, len: 110, spread: 130, col: B.rgba(P.ink, .5) });
  B.hero(g, hx, hyy, 1, { shape: 'cloud', mood: 'joy', look: .7 });
  B.layer(g, 1.15, g => { B.bird(g, 900 + lt * 140, 860, .9, { seed: 5 }); B.bird(g, 990 + lt * 140, 820, .7, { seed: 6 }); });
  B.screen(g, g => B.story(g, t, '*полетело', 80, 330, 62, { al: 'left', at: [WT.polet] }));
}
// ---------- 5. Стало холодно ----------
function sCold(g, lt, s) {
  const t = s.t, sh = B.noise(t * 26, 3) * 7 * B.pr(t, WT.hol, WT.hol + .3), fall = t - WT.upala;
  B.sky(g, 'cold'); B.mountains(g, -250, 1350, 1760, { h: 560, col: '#8E9BCB', seed: 9 });
  B.screen(g, g => B.snow(g, { n: 46 }));
  [[440, .0], [560, .25], [670, .12]].forEach(([x, d], i) => { const q = B.pr(t, WT.kap5 + d, WT.kap5 + d + .35); if (q <= 0) return;
    const y = 1160 + (fall > 0 ? 1600 * fall * fall : 0); B.droplet(g, x + sh * .5, y + 22 * B.eb(q), 15 * B.eb(q), 90, P.water); });
  B.hero(g, 540 + sh, 1180, 1.3, { shape: 'cloud', tint: 'cold', mood: 'cold', rot: sh * .4, sq: fall > 0 ? .14 * Math.exp(-fall * 6) * Math.cos(fall * 18) : 0 });
  B.thermo(g, 960, 760, 440, B.lerp(.86, .3, B.eo(B.pr(t, WT.hol + .1, WT.hol + 1.1))));
  B.screen(g, g => { B.write(g, t, WT.hol + .8, '+5°', 1012, 700, 82, { al: 'right', col: '#FFF6E2' });
    B.story(g, t, '*стало', 80, 330, 62, { al: 'left', at: [s.t - lt + .05], col: '#F8F3EA', kcol: P.sunL, kbg: B.rgba(P.night, .35) }); });
  B.write(g, t, WT.hol, 'холодно', 70, 560, 190, { col: '#FFF6E2', shiver: .45 });
}
// ---------- упала дождём на землю ----------
const fy7 = x => 1520 + Math.sin(x * .004 + 1) * 30;
function sRain(g, lt, s) {
  const t = s.t, tl = WT.zem - (s.t - lt), hx = 800, q = B.pr(lt, 0, tl), land = lt - tl, gy = fy7(hx);
  B.sky(g, 'rain');
  B.screen(g, g => { B.rain(g, { n: 56, w: 2.4, col: 'rgba(255,255,255,.5)' }); B.rain(g, { n: 16, w: 4, sp: 2600, len: 250, col: 'rgba(255,255,255,.7)' }); });
  for (let i = 0; i < 9; i++) { const x = 60 + i * 120 + (i % 2) * 40, y = ((i * 260 + lt * 1500) % 1500) + 300; if (Math.abs(x - hx) > 90) B.droplet(g, x, y, 9, 100, B.rgba('#DDEEFF', .85)); }
  for (let i = 0; i < 4; i++) B.cloud(g, 40 + i * 330, 230 + (i % 2) * 50, 1.05, { tint: 'dark', seed: i, flip: i % 2 === 1 });
  B.ground(g, fy7, {}); [140, 360, 600, 980].forEach(x => B.tuft(g, x, fy7(x) + 3, .9));
  const y = land < 0 ? B.lerp(640, gy, q * q) : gy, sq = land < 0 ? -.28 * q : .34 * Math.exp(-land * 9) * Math.cos(land * 22);
  if (land < 0) B.speed(g, hx, y - 300, 90, { n: 4, len: 140, spread: 110, col: 'rgba(255,255,255,.8)', gap: 10 });
  B.dashes(g, hx, gy, land / .55, { w: 130 }); B.splash(g, hx, gy, land, { s: 1, n: 9 });
  B.hero(g, hx, y, 1.05, { mood: land < 0 ? 'wow' : 'joy', sq, shadow: gy });
  B.screen(g, g => { B.write(g, t, WT.dozh, 'дождём', 70, 640, 205, { col: '#FFF6E2' });
    B.story(g, t, 'на *землю', 76, 790, 62, { al: 'left', at: [WT.zem - .27, WT.zem], col: '#F8F3EA', kcol: P.sunL, kbg: B.rgba(P.night, .3) }); });
}
// ---------- 6. напоила цветок ----------
const fy8 = x => 1420 + Math.sin(x * .004) * 26;
function sFlower(g, lt, s) {
  const t = s.t, fx = 650, h = B.hop(t, WT.napo + .05, WT.napo + .5, 140), hx = B.lerp(330, 520, h.p), bl = t < WT.cvet ? .55 : .55 + .45 * B.eo(B.pr(t, WT.cvet, WT.cvet + .6));
  B.paper(g, { y1: 1500 }); B.band(g, -200, 980, B.rgba('#CFE6EE', .75), { amp: 30, seed: 8 });
  const ra = .5 * B.eo(B.pr(t, WT.cvet - .1, WT.cvet + .6)); if (ra > 0) ['#E98A8A', '#F2C46B', '#9FCB7B', '#7CB8E0', '#A99AD8'].forEach((c, i) => { g.save(); g.globalAlpha = ra; B.ink(g, B.arcPts(540, 1300, 640 - i * 26, 200, 340, 40), { w: 24, col: c, taper: .1, jit: .1 }); g.restore(); });
  B.ground(g, fy8, {}); [180, 860, 960].forEach(x => B.tuft(g, x, fy8(x) + 3, 1));
  B.flower(g, fx, fy8(fx) + 4, 1.6, { droop: 1 - B.cl(B.spring(t - WT.cvet + .05, 1.3, 5), 0, 1.15), bloom: bl, fill: B.pr(t, WT.napo + .5, WT.cvet) });
  if (t > WT.cvet) for (let i = 0; i < 4; i++) { const a = i * 1.7 + .5, d = B.pr(t, WT.cvet + .2, WT.cvet + 1.2); B.sparkle(g, fx + 40 + Math.cos(a) * 170, 990 + Math.sin(a) * 120, 20 * Math.sin(Math.PI * d), P.sun); }
  if (!s.out) B.hero(g, hx, fy8(hx) - h.y, .95, { mood: t > WT.cvet ? 'joy' : 'calm', look: .7, lookY: t > WT.cvet ? -.6 : 0, sq: h.sq, shadow: fy8(hx), arms: t > WT.cvet + .3 ? 'up' : null });
  B.screen(g, g => { B.story(g, t, '*напоила', 540, 380, 62, { at: [WT.napo] });
    B.write(g, t, WT.cvet, 'цветок', 540, 610, 200, { al: 'center', swash: B.rgba(P.rose, .9) }); });
}
// ---------- и побежала ручейком ----------
const fy9 = x => 860 + x * .42 + Math.sin(x * .006) * 30;
const ST9 = B.spline([-80, 1060, 240, 1150, 470, 1190, 690, 1350, 900, 1420, 1180, 1580], 10);
function sStream(g, lt, s) {
  const t = s.t, f = B.lerp(.1, .8, B.eio(B.pr(lt, .1, s.dur))), p = B.follow(ST9, f);
  B.paper(g, { y1: 1000 }); B.band(g, -200, 700, B.rgba('#CFE6EE', .7), { amp: 26, seed: 6 });
  B.hill(g, x => 760 + Math.sin(x * .005) * 40, P.mint, { y1: 1400 });
  B.ground(g, fy9, {});
  B.river(g, ST9, q => 64 + q * 70, { n: 14, sp: 260 });
  [[300, 1235, 1], [560, 1300, .8], [820, 1480, 1.1], [1000, 1540, .9]].forEach(([x, y, k], i) => B.pebble(g, x, y, k, { seed: i + 2 }));
  [[150, 990], [620, 1180], [960, 1340]].forEach(([x, y]) => B.tuft(g, x, y, 1));
  B.flower(g, 1000, fy9(1000) + 140, .5, { kind: 'tulip' });
  B.speed(g, p.x - 30, p.y - 110, p.a * 57.3, { n: 4, len: 90, spread: 100, col: B.rgba(P.waterD, .6), gap: 70 });
  B.hero(g, p.x, p.y + 14, .95, { mood: 'joy', run: lt * 3.2, rot: p.a * 20, look: .6, shadow: false });
  B.screen(g, g => { B.story(g, t, '*побежала', 80, 330, 62, { al: 'left', at: [WT.pobe + .05] });
    B.title(g, t, WT.ruch, 'ручейком', 540, 570, 185, { al: 'center', col: P.waterD }); });
}
// ---------- 7. Ручеёк привёл её в реку ----------
const FD10 = [[100, 1010, 230, 150, '#E8D78C', 4], [850, 620, 240, 160, '#BFD99A', 5], [880, 1480, 220, 150, '#E5D08A', 6], [130, 1880, 240, 160, '#C3DB9E', 7], [880, 2060, 220, 150, '#D9E3A5', 8], [120, 640, 200, 130, '#D9E3A5', 9]];
const TR10 = [[240, 860], [300, 930], [200, 950], [860, 960], [930, 1040], [870, 1080], [200, 1460], [270, 1520], [900, 1760], [960, 1700], [260, 2200], [850, 2300]];
const RV = B.spline([620, -300, 640, 160, 500, 520, 560, 860, 720, 1160, 640, 1480, 470, 1760, 520, 2080, 620, 2400], 10);
const BR = B.spline([-80, 560, 160, 610, 360, 660, 520, 610], 8);
function sRiver(g, lt, s) {
  const t = s.t, f = B.lerp(.25, .64, B.eio(B.pr(lt, .15, s.dur + .2))), p = B.follow(RV, f), da = p.a * 57.3 - 90;
  B.paper(g); B.river(g, RV, q => 440 + Math.sin(q * 7) * 80, { col: '#D3E6BA', banks: false, n: 0, rim: 0, light: 0 });
  FD10.forEach(([x, y, w, hh, c, sd]) => { const q = B.rough([x - w / 2, y - hh / 2 + 10, x + w / 2, y - hh / 2, x + w / 2 - 14, y + hh / 2, x - w / 2 + 8, y + hh / 2 - 6], 6, sd, 30);
    B.wash(g, q, c, { rim: 5, smooth: true, light: .3 }); g.strokeStyle = 'rgba(70,60,40,.18)'; g.lineWidth = 3; g.beginPath(); for (let k = 1; k < 5; k++) { const yy = y - hh / 2 + hh * k / 5; g.moveTo(x - w / 2 + 16, yy); g.lineTo(x + w / 2 - 20, yy - 8); } g.stroke(); });
  g.fillStyle = 'rgba(60,70,40,.18)'; g.beginPath(); TR10.forEach(([x, y]) => { g.moveTo(x + 48, y + 14); g.ellipse(x + 10, y + 14, 38, 16, 0, 0, 6.3); }); g.fill();
  TR10.forEach(([x, y], i) => B.wash(g, B.blob(x, y, 30, 30, i, .1, 14), i % 3 ? P.teal : P.moss, { rim: 4 }));
  [[230, 1240], [880, 1300], [190, 1640]].forEach(([x, y]) => B.icon(g, 'house', x, y, 60));
  B.river(g, BR, 46, { n: 6, sp: 120, bw: 3 });
  B.river(g, RV, q => 170 + Math.sin(q * 9) * 30, { n: 15, sp: 160 });
  for (let i = 1; i <= 3; i++) { const b = B.follow(RV, f - i * .012); g.save(); g.globalAlpha = .7 - i * .18; B.ink(g, B.arcPts(b.x, b.y, 40 + i * 12, da + 60, da + 120, 8), { w: 3, col: '#FFFFFF', taper: .4 }); g.restore(); }
  B.leaf(g, p.x - Math.cos(p.a) * 80, p.y - Math.sin(p.a) * 80, 1.6, { rot: p.a * 57.3, outline: true });
  B.hero(g, p.x, p.y + 8, .7, { mood: 'joy', look: .4, shadow: false, arms: t > WT.reku ? 'up' : null });
  B.screen(g, g => { B.pop(g, t, s.t - lt + .05, 400, 312, g => B.scrap(g, 400, 312, 660, 104, { rot: -1.5 }), { from: .85 });
    B.story(g, t, 'ручеёк привёл её в', 400, 334, 56, { at: [s.t - lt + .1, WT.priv, WT.ee, WT.vreku] });
    B.write(g, t, WT.reku, 'реку', 540, 640, 230, { al: 'center', col: P.waterD, swash: B.rgba(P.paperL, .85) }); });
}
// ---------- а река вернула в море ----------
const fy11 = x => 960 + x * .5;
const RV11 = B.spline([-90, 900, 150, 1010, 330, 1100, 520, 1300], 10);
function sSea2(g, lt, s) {
  const t = s.t, sy = 1250, fb = B.lerp(.45, 1, B.eo(B.pr(lt, 0, .55))), b = B.follow(RV11, fb), h = B.hop(t, WT.more7 - .38, WT.more7, 170), land = t - WT.more7;
  const hx = t < WT.more7 - .38 ? b.x : B.lerp(b.x, 700, h.p), wy = B.waveY(700, sy, 14), hy = land < 0 ? (t < WT.more7 - .38 ? b.y + 4 : B.lerp(b.y + 4, wy + 36, h.p) - h.y) : wy + 36 + Math.sin(land * 4) * 5;
  B.paper(g, { y1: 1320 }); B.band(g, -200, 760, B.rgba('#C3DFEF', .75), { amp: 26, seed: 9 });
  B.ground(g, fy11, { x0: -60, x1: 760 }); B.tree(g, 160, fy11(160) + 6, .8, { kind: 'pine' }); B.tuft(g, 330, fy11(330), 1);
  B.river(g, RV11, q => 70 + q * 90, { n: 10, sp: 200 });
  B.leaf(g, b.x - 60 + Math.max(0, land) * 60, b.y + 6, 1.15, { rot: 30 - Math.max(0, land) * 30, outline: true });
  B.hero(g, hx, hy, land < 0 ? .62 : .8, { mood: land < 0 ? 'wow' : 'joy', sq: land < 0 ? h.sq : .2 * Math.exp(-land * 8) * Math.cos(land * 20), shadow: false, arms: land > .3 ? 'up' : null });
  B.sea(g, sy, { amp: 14 });
  B.splash(g, 700, wy, land, { s: 1.4, n: 12 });
  B.screen(g, g => { B.story(g, t, 'а река *вернула', 80, 330, 60, { al: 'left', at: [WT.arek, WT.arek + .17, WT.vern + .05] });
    B.write(g, t, WT.vmore, 'в море', 560, 620, 230, { al: 'center', col: P.waterD, bob: .5 }); });
}
// ---------- 8. Так вода путешествует по кругу, снова и снова ----------
const ST12 = [['wave', 90], ['sun', 0], ['cloud', -90], ['rain', 180]];
function sFinal(g, lt, s) {
  const t = s.t, cx = 540, cy = 1060, r = 330, f = jf(t) - 1, run = t > 31.3 && t < 34.3;
  B.paper(g);
  B.splat(g, 190, 560, 90, { p: B.pr(t, WT.krug, WT.krug + .5), seed: 3 }); B.splat(g, 905, 1440, 80, { p: B.pr(t, WT.sno1, WT.sno1 + .5), seed: 8, cols: [P.water, P.navy] });
  B.ring(g, cx, cy, r, B.eo(B.pr(lt, .1, 1.1)), { n: 4, w: 6 });
  ST12.forEach(([nm, a], i) => { const df = Math.abs(((f - i / 4) % 1 + 1.5) % 1 - .5), k = 1 + (t > 31.3 ? .3 * Math.max(0, 1 - df * 9) : 0), x = cx + Math.cos(a * Math.PI / 180) * r, y = cy + Math.sin(a * Math.PI / 180) * r;
    B.pop(g, lt, .25 + i * .2, x, y, g => { g.fillStyle = P.paperL; g.beginPath(); g.arc(x, y, 62 * k, 0, 6.3); g.fill(); B.ink(g, B.arcPts(x, y, 62 * k, 0, 360, 30), { w: 3, col: B.rgba(P.ink, .5), taper: 0 }); B.icon(g, nm, x, y, 92 * k); }); });
  const am = (90 - 360 * f) * Math.PI / 180, rx = cx + Math.cos(am) * r, ry = cy + Math.sin(am) * r;
  if (run) B.speed(g, rx + Math.sin(am) * 60, ry - 70 - Math.cos(am) * 60, (am * 180 / Math.PI) - 90, { n: 3, len: 70, spread: 60, col: B.rgba(P.waterD, .6), gap: 20 });
  B.hero(g, rx, ry + 8, .55, { mood: t > 34.35 ? 'wink' : 'joy', run: run ? lt * 3.4 : null, arms: run ? null : 'wave', shadow: false });
  B.story(g, t, 'так вода *путешествует', 80, 330, 60, { al: 'left', max: 720, at: [s.t - lt + .05, WT.voda, WT.put] });
  B.title(g, t, WT.po, 'по кругу', cx, cy + 40, 108, { al: 'center' });
  B.caps(g, 'снова и снова', cx, 1580, 54, { p: B.eo(B.pr(t, WT.sno1, WT.sno2 + .35)) });
  if (t > WT.sno1 - .2) B.screen(g, g => B.confetti(g, t - WT.sno1 + .2, { n: 44, spread: 1.4 }));
}

function build() {
  return [
    { at: 0, draw: sIntro },
    { at: 2.5, tr: 'bloom', x: 540, y: 1000, draw: sSea },
    { at: 4, tr: 'turn', draw: sSun },
    { at: WT.prev, tr: 'cut', cam: [[0, [540, 960, 1]], [WT.podn - .45 - WT.prev, [540, 960, 1.05]], [WT.stala - WT.prev, [540, -1650, 1]]], draw: sRise },
    { at: WT.stala, tr: 'cut', draw: sCloud },
    { at: 13, tr: 'turn', cam: [[0, [540, 960, 1]], [3.9, [2240, 960, 1]]], push: 0, draw: sFly },
    { at: 17, tr: 'bloom', x: 540, y: -200, rim: P.cold, draw: sCold },
    { at: WT.dozh, tr: 'cut', draw: sRain },
    { at: 21.9, tr: 'cut', draw: sFlower },
    { at: 23.5, tr: 'pan', cam: [[0, [540, 960, 1]], [2.1, [600, 1010, 1.04]]], draw: sStream },
    { at: 26, tr: 'turn', cam: [[0, [540, 560, 1]], [3, [540, 1180, 1]]], push: 0, draw: sRiver },
    { at: 28.5, tr: 'bloom', x: 470, y: 1060, draw: sSea2 },
    { at: 30.5, tr: 'turn', draw: sFinal },
  ];
}

function draw(t, k) {
  const g = B.begin(t, k);
  if (!WT) { WT = words(k); SC = build(); }
  const s = B.play(g, t, SC), sb = k.sub(t), dark = [3, 4, 6, 7].includes(s.i);
  const f = jf(t), lp = f >= 1 ? Math.floor(f + 1e-6) : 0, li = LOOPS.filter(x => t >= x).length - 1;
  B.journey(g, 928, 210, 62, f, { loops: lp, lt: li >= 0 ? t - LOOPS[li] : 1 });
  B.pageNo(g, sb.i + 1, t - sb.t0, { col: dark ? '#E9E3F2' : P.grey });
  B.end(g);
}

function sound(s) {
  const S = s.subs, w = (i, x) => B.when(S[i], x) - .1, t1 = Math.sqrt(2 * 760 / 5000);
  B.sfx(s, [
    [t1, 'drop', .18], [t1 * 1.84, 'pop_high', .1, 1.1], [w(0, 'капелька'), 'marimba', .1], [2.72, 'bubble', .16], [w(0, 'море'), 'kalimba', .1],
    [4, 'kalimba_run', .14], [4.6, 'sparkle', .12], [w(1, 'пригрело') + .1, 'counter', .08],
    [w(1, 'превратилась'), 'pop_soft', .12], [w(1, 'превратилась') + .3, 'magic', .13], [w(1, 'пар'), 'pop_double', .12],
    [w(2, 'поднялась') - .4, 'marimba_run', .12], [w(2, 'высоко-высоко'), 'bubble', .1, 1.2], [w(2, 'стала'), 'wood', .12], [w(2, 'облаком'), 'magic', .15],
    [13, 'kalimba_run', .14], [w(3, 'горами'), 'pop_soft', .1], [w(3, 'полями'), 'pop_soft', .1, 1.25],
    [17, 'bubble_down', .12], [w(4, 'холодно'), 'woodblock', .1], [w(4, 'упала'), 'drop', .12, 1.3], [w(4, 'дождём'), 'drop', .16], [w(4, 'землю'), 'drop', .18, .8],
    [21.9, 'pop_soft', .1], [w(5, 'цветок'), 'sparkle', .16], [23.5, 'kalimba_run', .12],
    [26, 'kalimba_run', .14], [w(6, 'реку'), 'marimba', .12], [28.5, 'bubble_down', .12], [w(6, 'море'), 'success', .16],
    [30.5, 'kalimba_run', .14], [32.66, 'notify', .12], [w(7, 'снова'), 'sparkle', .14], [34.02, 'ta_da', .18],
  ]);
}
