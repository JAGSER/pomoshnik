// Демо «Запись к врачу онлайн за тридцать секунд» — только MORPH и обычный canvas.
// Герой — одна форма-капсула: таблетка → таймер → кнопка → приложение → список → календарь → время → запись → уведомление → отмена → звонок → кнопка.
const M = MORPH, P = M.P;
let TT = 0;

// клики курсора (секунды)
const CL = { btn: 5.75, row: 12.62, day: 16.4, ok: 23.62, c1: 28.25, c2: 29.15, fin: 33.62 };
const SLOT = t => M.track(t, [[0, 2], [19.75, 3], [20.0, 4], [20.25, 5]], 320, 22); // слоты по 30 мин от 8:00
const KX = s => 150 + 780 * s / 20, KY = 1280;                                      // ручка ползунка в кадре
// курсор: [время старта движения, x, y] — подъезжает за ~0,5 с
const PK = [[0, 1180, 1780], [4.85, 730, 1190], [6.15, 960, 1590], [9.85, 880, 1010], [10.68, 880, 1216], [11.48, 880, 1422],
  [12.95, 960, 1620], [15.75, 560, 1222], [16.8, 960, 1610], [18.9, KX(2), KY], [20.25, KX(5), KY], [20.9, 820, 1560],
  [22.75, 640, 1405], [24.05, 940, 1610], [27.7, 790, 1170], [28.62, 885, 1170], [29.55, 950, 1560], [32.85, 640, 1180]];
function cursorAt(t) { return t > 19.6 && t < 20.85 ? { x: KX(SLOT(t)), y: KY } : M.pointer(t, PK); }

// подписи: [вход, уход, надзаголовок, заголовок (*ключ, _ неразрывно), {at: моменты слов}]
const CAPS = [
  [0.1, 2.3, 'онлайн', 'Запись к *врачу', { at: [0.15, 0.45, 0.8] }],
  [2.42, 4.62, 'теперь всего', 'за *30_секунд', { at: [2.5, 2.75] }],
  [4.75, 5.95, 'одна кнопка', 'Нажмите *«Записаться»', { at: [4.8, 5.25] }],
  [6.05, 8.62, 'всё онлайн', 'Приложение *клиники', { at: [6.1, 6.75] }],
  [8.75, 13.6, 'шаг 1 · врач', 'Выберите *специалиста', { at: [8.8, 9.3] }],
  [13.72, 17.28, 'шаг 2 · день', 'Календарь: *свободные_дни', { at: [13.8, 14.95] }],
  [17.4, 21.75, 'шаг 3 · время', 'Удобное *время', { at: [17.9, 18.15] }],
  [21.85, 25.36, 'шаг 4 · запись', 'Подтвердите *одним_касанием', { at: [21.9, 23.3] }],
  [25.48, 27.52, 'накануне приёма', '*Напоминание', { at: [26.35] }],
  [27.62, 30.55, 'передумали?', 'Отмена в *2_клика', { at: [27.7, 27.95, 28.6] }],
  [30.66, 32.34, 'больше никаких', '*звонков и_очередей', { at: [30.9, 31.5] }],
  [32.42, 35.2, 'моя клиника', 'Здоровье в *одно_касание', { at: [32.5, 32.95, 33.45] }],
];

// ---------- содержимое состояний формы (B — текущая коробка формы в координатах кадра) ----------
function timerUI(g, B, lt) {
  const v = M.count(lt, .2, 1.2, 0, 30), r = 50, gx = B.cx - 215, cy = B.cy;
  g.lineWidth = 12; g.strokeStyle = P.trackInk; g.beginPath(); g.arc(gx + r, cy, r, 0, M.PI2); g.stroke();
  g.strokeStyle = P.white; g.beginPath(); g.arc(gx + r, cy, r, -Math.PI / 2, -Math.PI / 2 + M.PI2 * v / 30); g.stroke();
  M.roll(g, gx + 2 * r + 46, cy, 138, v, M.mmss, { col: P.white, w: 600 });
}
const btnUI = s => (g, B) => M.text(g, s, B.cx, B.cy, 66, { w: 600, col: P.white, al: 'center', max: B.w - 90 });
function appUI(g, B, lt) {
  M.tile(g, B.x + 52, B.y + 52, 112, 30, 0, 'capsule');
  M.text(g, 'Моя клиника', B.x + 194, B.y + 90, 56, { w: 600, col: P.white, max: B.w - 260 });
  M.text(g, 'онлайн-запись', B.x + 194, B.y + 146, 40, { col: P.onInk2 });
  g.fillStyle = P.trackInk; g.fillRect(B.x + 52, B.y + 214, B.w - 104, 3);
  [['Врач', 'специалист'], ['День', 'календарь'], ['Время', 'свободное окно']].forEach(([a, b], i) => {
    const q = M.eo(M.pr(lt, .4 + i * .1, .7 + i * .1)); if (q <= 0) return;
    const y = B.y + 300 + i * 136 + (1 - q) * 26; g.save(); g.globalAlpha *= q;
    g.fillStyle = P.ink2; g.beginPath(); g.arc(B.x + 92, y, 38, 0, M.PI2); g.fill();
    M.text(g, String(i + 1), B.x + 92, y, 40, { w: 600, col: P.white, al: 'center' });
    M.text(g, a, B.x + 160, y, 54, { w: 600, col: P.white });
    M.text(g, b, B.x + B.w - 108, y, 38, { col: P.onInk2, al: 'right' });
    M.icon(g, 'chev', B.x + B.w - 66, y, 30, P.onInk2); g.restore();
  });
}
const SPEC = [['Терапевт', 'сегодня · 4 окна', 'steth'], ['Педиатр', 'завтра · 2 окна', 'child'], ['Стоматолог', 'сегодня · 6 окон', 'tooth']];
function listUI(g, B, lt) {
  const t = TT, hv = M.track(t, [[0, 0], [11.15, 1], [11.95, 2]], 260, 26), ha = M.eo(M.pr(t, 10.3, 10.5)), sel = M.eo(M.pr(t, CL.row, CL.row + .28));
  M.text(g, 'Специалисты', B.x + 56, B.y + 70, 40, { col: P.mute });
  M.text(g, 'рядом с домом', B.x + B.w - 56, B.y + 70, 36, { col: P.mute2, al: 'right' });
  if (ha > 0) { g.fillStyle = M.rgba(P.soft, ha); M.rr(g, B.x + 22, B.y + 118 + hv * 206, B.w - 44, 190, 40); g.fill(); }
  SPEC.forEach(([a, b, gl], i) => {
    const q = M.eo(M.pr(lt, .35 + i * .09, .65 + i * .09)); if (q <= 0) return;
    g.save(); g.globalAlpha *= q;
    M.row(g, B.x + 22, B.y + 118 + i * 206 + (1 - q) * 24, B.w - 44, 190, { tile: [i, gl], title: a, sub: b, sel: i === 2 ? sel : 0 });
    g.restore();
  });
}
function chipUI(g, B) { const tw = M.tw(g, 'Стоматолог', M.font(52, 600)), x0 = B.cx - (tw + 84) / 2; M.icon(g, 'tooth', x0 + 28, B.cy, 52, P.white); M.text(g, 'Стоматолог', x0 + 84, B.cy, 52, { w: 600, col: P.white }); }
const FREE = [3, 6, 10, 12, 17, 19, 25];
function calUI(g, B) {
  const t = TT;
  M.calendar(g, B.x, B.y, B.w, { title: 'Ноябрь', start: 6, days: 30, free: FREE, freeP: j => M.spring(t - (14.98 + j * .07), 240, 17), sel: 12, selP: M.spring(t - CL.day, 240, 17), rh: 92 });
  const n = FREE.filter((_, j) => t >= 15.03 + j * .07).length, q = M.eo(M.pr(t, 15.0, 15.25));
  if (q > 0) { g.save(); g.globalAlpha *= q; M.badge(g, B.x + B.w - 52, B.y + 86, 'свободно: ' + n, { al: 'right', size: 36, dark: true, elev: 0 }); g.restore(); }
}
function timeUI(g, B) {
  const t = TT, s = SLOT(t), x0 = B.x + 60, w = B.w - 120, sy = B.y + 440, ch = M.eo(M.pr(t, 20.55, 20.85));
  M.text(g, 'Чт, 12 ноября', B.x + 60, B.y + 86, 42, { col: P.onInk2 });
  M.badge(g, B.x + B.w - 56, B.y + 86, ch > 0 ? 'выбрано' : 'свободно', { al: 'right', size: 34, bg: ch > 0 ? P.white : P.ink2, col: ch > 0 ? P.ink : P.onInk2, icon: ch > 0 ? 'check' : null, p: ch, elev: 0 });
  M.roll(g, B.x + 54, B.y + 250, 180, Math.min(s, 5) - 2, i => M.hm(480 + (2 + i) * 30), { col: P.white, w: 600 });
  g.fillStyle = P.trackInk; for (let i = 0; i <= 10; i++) { g.beginPath(); g.arc(x0 + w * i / 10, sy + 40, 4, 0, M.PI2); g.fill(); }
  M.slider(g, x0, sy, w, s / 20, { dark: true });
  [['8:00', 0, 'left'], ['13:00', .5, 'center'], ['18:00', 1, 'right']].forEach(([s2, f, al]) => M.text(g, s2, x0 + w * f, sy + 84, 32, { kind: 'mono', col: P.onInk2, al }));
}
function sumUI(g, B, lt) {
  M.tile(g, B.x + 52, B.y + 52, 120, 32, 2, 'tooth');
  M.text(g, 'Стоматолог', B.x + 200, B.y + 90, 56, { w: 600, max: B.w - 250 });
  M.text(g, 'Орлова А. В. · каб. 12', B.x + 200, B.y + 146, 40, { col: P.mute, max: B.w - 250 });
  g.fillStyle = P.line; g.fillRect(B.x + 52, B.y + 222, B.w - 104, 3);
  [['cal', 'Чт, 12 ноября'], ['clock', '10:30']].forEach(([ic, s], i) => {
    const y = B.y + 300 + i * 100, q = M.eo(M.pr(lt, .4 + i * .1, .7 + i * .1)); if (q <= 0) return; g.save(); g.globalAlpha *= q;
    g.fillStyle = P.soft; g.beginPath(); g.arc(B.x + 90, y, 36, 0, M.PI2); g.fill(); M.icon(g, ic, B.x + 90, y, 36, P.ink, { lw: .16 });
    M.text(g, s, B.x + 150, y, 48, { w: 600 }); g.restore();
  });
  const pz = M.press(TT, [CL.ok]), bw = B.w - 104, bh = 150, bx = B.x + 52, by = B.y + B.h - 52 - bh, k = 1 - .05 * pz;
  g.fillStyle = P.ink; M.rr(g, bx + bw * (1 - k) / 2, by + bh * (1 - k) / 2, bw * k, bh * k, bh * k / 2); g.fill();
  M.text(g, 'Подтвердить', B.cx, by + bh / 2, 58, { w: 600, col: P.white, al: 'center' });
}
const okUI = (g, B, lt) => M.checkmark(g, B.cx, B.cy, 124, M.eo(M.pr(lt, .1, .42)), P.white, 20);
const islandUI = (g, B, lt) => M.icon(g, 'bell', B.cx, B.cy, 40, P.white, { rot: Math.sin(lt * 18) * 16 * Math.exp(-lt * 3) });
const notifUI = (g, B, lt) => M.notice(g, B, { app: 'МОЯ КЛИНИКА', when: 'сейчас', title: 'Завтра в 10:30', body: 'Стоматолог · каб. 12', glyph: 'bell', grot: Math.sin(lt * 16) * 14 * Math.exp(-lt * 2.5) });
function actUI(g, B) {
  const on = M.eo(M.pr(TT, CL.c1, CL.c1 + .2));
  g.fillStyle = M.rgba(P.line, 1 - on); g.fillRect(B.cx - 1, B.y + 34, 2, B.h - 68);
  M.seg(g, B.x, B.y, B.w, B.h, ['Перенести', 'Отменить'], { sel: 1, on, col: P.ink, size: 50, pad: 12 });
}
function askUI(g, B) {
  M.text(g, 'Отменить запись?', B.x + 64, B.cy, 50, { w: 600, col: P.white, max: B.w - 330 });
  const pz = M.press(TT, [CL.c2]), k = 1 - .06 * pz, bw = 190 * k, bh = 104 * k, bx = B.x + B.w - 24 - 95;
  g.fillStyle = P.white; M.rr(g, bx - bw / 2, B.cy - bh / 2, bw, bh, bh / 2); g.fill();
  M.text(g, 'Да', bx, B.cy, 48, { w: 600, al: 'center' });
}
function toastUI(g, B, lt) {
  const w = M.tw(g, 'Запись отменена', M.font(46, 600)) + 70, x0 = B.cx - w / 2;
  M.checkmark(g, x0 + 22, B.cy, 44, M.eo(M.pr(lt, .15, .4)), P.white, 7); M.text(g, 'Запись отменена', x0 + 70, B.cy, 46, { w: 600, col: P.white });
}
function callUI(g, B) {
  const t = TT, dec = M.eo(M.pr(t, 31.2, 31.42)), ix = B.x + 112, cy = B.cy;
  g.fillStyle = M.mix(P.ink2, P.red, dec); g.beginPath(); g.arc(ix, cy, 64, 0, M.PI2); g.fill();
  M.icon(g, 'phone', ix, cy, 66, P.white);
  if (dec > 0) { g.strokeStyle = P.white; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(ix - 40, cy - 40); g.lineTo(ix - 40 + 80 * dec, cy - 40 + 80 * dec); g.stroke(); }
  M.text(g, 'Регистратура', B.x + 210, cy - 32, 50, { w: 600, col: P.white });
  const tx = B.x + 210 + M.text(g, 'в очереди: ', B.x + 210, cy + 38, 40, { col: P.onInk2 });
  M.roll(g, tx, cy + 38, 40, M.count(t, 31.45, 31.95, 14, 0, M.eio), n => String(n).padStart(2, ' '), { col: M.mix(P.onInk2, P.white, dec), w: 600, kind: 'mono' });
  M.bars(g, B.x + B.w - 230, cy, 160, 76, t, { n: 9, amp: 1 - dec * .85, col: M.mix(P.white, P.onInk2, dec) });
}
function finUI(g, B) {
  const f = M.font(64, 600), tw = M.tw(g, 'Записаться', f), x0 = B.cx - (102 + tw) / 2;
  M.icon(g, 'capsule', x0 + 38, B.cy, 76, P.white, { two: .45 });
  M.text(g, 'Записаться', x0 + 102, B.cy, 64, { w: 600, col: P.white });
}

// ---------- одна форма через весь ролик ----------
const TL = M.timeline([
  [0, { x: 540, y: 1130, w: 640, h: 228, r: 'pill', fill: P.ink, split: .5, rot: -16, elev: 1.2, float: 12 }],
  [2.42, { y: 1130, w: 720, h: 236, split: 0, rot: 0, draw: timerUI, delay: .12 }],
  [4.75, { w: 620, h: 176, draw: btnUI('Записаться'), delay: .14 }],
  [6.02, { y: 1160, w: 900, h: 680, r: 64, elev: 1, draw: appUI }],
  [8.75, { y: 1170, w: 900, h: 770, r: 64, fill: P.white, draw: listUI }],
  [13.72, { y: 1130, w: 560, h: 150, r: 'pill', fill: P.ink, draw: chipUI, delay: .06, din: .16 }],
  [14.12, { y: 1175, w: 900, h: 770, r: 64, fill: P.white, draw: calUI }],
  [17.38, { y: 1140, w: 900, h: 600, r: 64, fill: P.ink, draw: timeUI }],
  [21.85, { y: 1150, w: 900, h: 740, r: 64, fill: P.white, draw: sumUI }],
  [23.86, { y: 1110, w: 260, h: 260, r: 'pill', fill: P.ink, elev: 1.2, draw: okUI, delay: .06 }],
  [25.48, { y: 840, w: 250, h: 78, draw: islandUI, delay: .06, din: .18 }],
  [26.0, { y: 1100, w: 940, h: 290, r: 56, fill: P.white, elev: 1, draw: notifUI }],
  [27.62, { y: 1150, w: 900, h: 150, r: 'pill', draw: actUI, delay: .14 }],
  [28.42, { fill: P.ink, draw: askUI, delay: .1, din: .22 }],
  [29.3, { w: 780, h: 140, fill: P.toast, draw: toastUI, delay: .1, din: .22 }],
  [30.66, { w: 900, h: 210, fill: P.ink, draw: callUI, delay: .14 }],
  [32.42, { y: 1150, w: 640, h: 184, draw: finUI, delay: .14 }],
]);
const HITS = TL.times.filter(x => x > 0);

function extras(g, t) {
  M.burst(g, 540, 1110, t - 24.14, { r0: 175, r1: 270, n: 12 });                     // успех записи
  const sp = M.pres(t, 24.15, 25.45, { din: .3, rise: 30, blur: 10 });                   // штамп «Записано за 0:18»
  if (sp.a > 0) { g.save(); g.globalAlpha *= sp.a; g.translate(540, 1345 + sp.dy); g.scale(sp.s, sp.s);
    M.badge(g, 0, 0, 'Записано за ' + M.mmss(23.86 - CL.btn), { icon: 'check', p: M.pr(t, 24.3, 24.6), size: 46 }); g.restore(); }
  [[CL.c1, '1'], [CL.c2, '2']].forEach(([c, s]) => {                                    // счёт кликов при отмене
    const p = cursorAt(c), q = M.spring(t - c, 240, 16), out = M.eo(M.pr(t, 30.5, 30.66)); if (t < c || out >= 1) return;
    g.save(); g.globalAlpha *= 1 - out; g.translate(p.x + 52, p.y - 132); g.scale(q, q);
    g.fillStyle = P.ink; g.beginPath(); g.arc(0, 0, 34, 0, M.PI2); g.fill(); M.text(g, s, 0, 0, 40, { w: 700, col: P.white, al: 'center' }); g.restore();
  });
  M.burst(g, cursorAt(CL.fin).x, cursorAt(CL.fin).y, t - CL.fin - .04, { r0: 50, r1: 120, n: 8, len: 22, wid: 9 });
}

function draw(t, k) {
  TT = t;
  const b = TL.at(t), g = M.begin(t, k, { dx: (540 - b.cx) * .05, dy: (1150 - b.cy) * .06 + Math.sin(t * .3) * 12 });
  M.floaters(g, t, { n: 3, a: .6, seed: 5 });
  M.cam(g, t, HITS, g => {
    M.hero(g, TL, t, { press: M.press(t, [CL.btn, CL.fin]), scale: M.lerp(.74, 1, M.spring(t + .02, 260, 17)) });
    extras(g, t);
    Object.entries(CL).forEach(([n, c]) => { const p = cursorAt(c); M.ripple(g, p.x, p.y, t - c, { col: n === 'btn' || n === 'fin' || n === 'row' ? P.white : P.ink }); });
    if (t > 4.8) { const c = cursorAt(t); M.cursor(g, c.x, c.y, { press: M.press(t, Object.values(CL)) }); }
  }, { cy: 1150 });
  const el = Math.min(t, 23.86) - CL.btn;
  M.hud(g, t, { t0: 6.15, text: M.mmss(el), a: el * 1.2566, steps: 4, done: M.eo(M.pr(t, 23.95, 24.3)),
    step: M.track(t, [[0, 0], [14.12, 1], [17.38, 2], [21.85, 3], [23.86, 4]], 200, 22) });
  M.captions(g, t, CAPS);
}

function sound(s) {
  M.cues(s, [
    [0.02, 'pop_soft', .14], [2.42, 'bubble', .12], [2.65, 'counter', .1], [4.75, 'bubble_down', .1], [5.75, 'click', .22],
    [6.02, 'bubble', .12, .9], [8.75, 'marimba_run', .1], [10.35, 'tick', .1], [11.15, 'tick', .1, 1.1], [11.95, 'tick', .1, 1.2],
    [12.62, 'click', .2], [13.72, 'bubble_down', .1], [14.12, 'bubble', .12], [15.0, 'abacus', .12], [16.4, 'click', .2],
    [17.38, 'bubble_down', .1, .9], [19.75, 'tick', .1], [20.25, 'tick', .12, 1.2], [20.6, 'woodblock', .12],
    [21.85, 'bubble', .12], [23.62, 'click', .22], [24.1, 'success', .18],
    [25.5, 'bubble_down', .09], [26.05, 'notify', .15], [27.62, 'bubble', .1], [28.25, 'click', .2], [29.15, 'click', .2], [29.32, 'toggle_off', .11],
    [30.66, 'bubble', .11, .85], [31.22, 'error_soft', .1], [31.45, 'odometer', .1], [32.42, 'kalimba_run', .13], [33.62, 'click', .22], [33.68, 'success3', .16],
  ]);
}
