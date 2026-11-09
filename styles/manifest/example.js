// Пример стиля MANI: манифест «Тишина. Твоё время принадлежит тебе». 20 с, склейки на долях 128 BPM.
const M = MANI, C = M.C, B = M.BEAT;
// склейки: 0 точка и клетка | 8 долей слова | 12 чат и штампы | 16 синяя клетка ломается | 20 деление точки | 23 ТВОИ | 24 слова | 28 красное поле | 32 замок | 36 финал
const CUTS = [0, 8, 12, 16, 20, 23, 24, 28, 32, 36].map((n) => n * B);
const THEME = ['night', 'cream', 'night', 'blue', 'cream', 'cream', 'night', 'red', 'cream', 'cream'];
const CAGE = { x: 540, y: 900, S: 460 };
const SPLIT = [9.45, 9.68, 9.88, 10.08, 10.28, 10.48];
const STAMPS = [
  ['НАПОМИНАНИЕ', 420, 1300, -0.06, 112], ['СРОЧНО', 800, 470, 0.1, 132], ['НЕ ПРОПУСТИ', 300, 990, -0.14, 104],
  ['ЕЩЁ ОДНО', 760, 1470, 0.12, 116], ['ОТВЕТЬ СЕЙЧАС', 600, 720, 0.06, 96], ['СРОЧНО', 250, 1530, -0.05, 112],
  ['НАПОМИНАНИЕ', 380, 380, -0.09, 96], ['НЕ ПРОПУСТИ', 720, 1140, 0.15, 112], ['ЕЩЁ ОДНО', 380, 1440, -0.18, 122],
  ['НЕ ПРОПУСТИ', 640, 870, -0.04, 108],
];
const LOGO = { x: 540, y: 1000 };
function draw(t, k) {
  const g = k.g, { i, lt } = M.scene(t, CUTS), th = THEME[i];
  M.bg(g, t, th);
  g.save();
  M.camera(g, lt, i === 2 ? { drift: 0.03, cy: 760 } : {});
  if (i === 0) {
    const { x, y, S } = CAGE;
    M.crosshair(g, x, y, (t - 0.3) / 0.7, { a: 1 - M.eo((t - 1.6) / 0.25) });
    M.cage(g, x, y, S, t, { sq0: 1.78, bars: [2.34, 2.8, 3.04, 3.28, 3.5], n: 5 });
    M.dot(g, x, y, 32 * M.sp(t / 0.3));
    g.save(); g.globalAlpha = 1 - M.eo((t - 1.6) / 0.2); M.leader(g, x + 30, y - 30, x + 90, y - 80, (t - 0.45) / 0.2, '#9A9C9C'); g.restore();
    // подпись печатается: имя сразу, статус после квадрата
    const tt = t < 1.95 ? Math.min(t, 0.62 + 11 / 28) : t - (1.95 - (0.62 + 11 / 28));
    M.typed(g, [['ВНИМАНИЕ_01', C.cream], [' · СТАТУС: ', C.cream], ['ЗАНЯТО', C.red]], 540, 1225, 32, tt, 0.62);
  }
  if (i === 1) {
    const w = [['КТО', C.ink], ['РЕШАЕТ', C.ink], ['ЗА', C.ink], ['ТЕБЯ?', C.red]];
    w.forEach(([s, col], j) => M.word(g, s, 540, 1010, 330, t, CUTS[1] + j * B, col, { t1: CUTS[1] + (j + 1) * B }));
  }
  if (i === 2) {
    M.bubble(g, 'Хочу побыть в тишине', 1000, 560, 'r', t, 5.7, { size: 58, max: 900 });
    M.typing(g, 80, 780, t, 5.95, 6.3);
    M.bubble(g, 'У вас 37 новых уведомлений', 80, 780, 'l', t, 6.3, { size: 58, max: 920 });
  }
  if (i === 3) {
    const { x, y, S } = CAGE, bend = M.eio((t - 7.62) / 1.3), brk = t >= 9.0;
    const r = brk ? M.mix(95, 34, M.sp((t - 9.0) / 0.35)) : M.mix(32, 95, M.eio((t - 7.6) / 1.35));
    if (!brk) {
      M.cage(g, x, y, S, t, { n: 6, bend, ring: bend, shake: M.cl((t - 8.6) / 0.4), lw: 9 });
      M.mono(g, `НАГРУЗКА ${Math.round(M.mix(71, 99, M.eo((t - 7.55) / 1.3)))}%`, 540, 520, 38, C.cream);
    } else {
      M.shards(g, x, y, S, t, 9.0, { n: 40 });
      M.mono(g, 'ПЕРЕПОЛНЕНИЕ', 540, 520, 38, C.red, { w: 700 });
    }
    M.dot(g, x, y, r);
  }
  if (i === 4) {
    const n = M.split(g, 540, 800, t, SPLIT, { r: 34 });
    M.counter(g, 'СВОБОДНЫХ МИНУТ', n, 540, 1450, 200, C.ink);
  }
  if (i === 5) {
    const p = (t - CUTS[5]) / 0.45;
    M.cloud(g, 540, 880, p, t);
    M.word(g, 'ТВОИ.', 540, 1010, 360, t, CUTS[5], C.ink);
    M.counter(g, 'МИНУТ В ГОДУ', M.mix(64, 525600, M.eo5((t - CUTS[5]) / 0.42)), 540, 1450, 200, C.ink);
  }
  if (i === 6) {
    M.word(g, 'ВНИМАНИЕ', 540, 1010, 330, t, CUTS[6], C.cream, { t1: 26 * B });
    M.word(g, 'ХОЧЕТ БЫТЬ', 540, 1010, 330, t, 26 * B, C.cream, { t1: 27 * B });
    M.word(g, 'СВОБОДНЫМ.', 540, 1010, 330, t, 27 * B, C.red);
  }
  if (i === 7) {
    M.network(g, t, CUTS[7]);
    M.lines(g, [['НИКТО НЕ', C.ink, CUTS[7] + 0.05], ['ВЛАДЕЕТ.', C.ink, CUTS[7] + 0.05], ['ОТКРЫТО', C.ink, 30 * B], ['КАЖДОМУ.', C.ink, 30 * B]], 540, 900, 200, t, { lh: 1.02, max: 860 });
  }
  if (i === 8) {
    const t0 = CUTS[8], tOpen = 33 * B, tFall = 16.05, s = 300, cx = 540, cy = 900;
    const open = M.cl(M.sp((t - tOpen) / 0.4), 0, 1.15), ft = Math.max(0, t - tFall);
    const [kx, ky] = [cx, cy - s * 0.06];
    if (ft < 0.6) M.lock(g, cx, cy + 0.5 * 5200 * ft * ft + 120 * ft, s, open, { dot: false, rot: 0.9 * ft * ft * 3 + (ft > 0 ? 0.05 : 0) });
    // точка остаётся и уплывает к месту знака
    const pm = M.eio((t - 16.3) / 0.55), tx = LOGO.x, ty = LOGO.y - 250;
    M.dot(g, M.mix(kx, tx, pm), M.mix(ky, ty, pm) - Math.sin(pm * Math.PI) * 120, M.mix(s * 0.075, 32, pm));
  }
  if (i === 9) {
    M.logo(g, 'Тишина', ['ТВОЁ ВРЕМЯ', 'ПРИНАДЛЕЖИТ ТЕБЕ'], 'МАНИФЕСТ 01 · 2026', LOGO.x, LOGO.y, t, CUTS[9] + 0.05);
  }
  g.restore();
  if (i === 2) M.pile(g, STAMPS, t, 6.62, 0.085);
  if (i === 3) M.flash(g, t, 9.0, 0.3, 0.6);
  M.hud(g, t, th, { brand: 'ТИШИНА', a: i === 9 ? 1 - M.eo((t - CUTS[9] - 0.1) / 0.5) : 1 });
}
function sound(s) {
  s.play(0.03, 'pop_soft', 0.16); s.play(0.62, 'type', 0.08);
  s.play(1.78, 'click', 0.13);
  [2.34, 2.8, 3.28].forEach((x, j) => s.play(x, 'rim', 0.11, { pitch: 0.9 + j * 0.1 }));
  [0, 1, 2].forEach((j) => s.play(CUTS[1] + j * B, 'drop', 0.17, { pitch: 1 + j * 0.05 })); s.play(CUTS[1] + 3 * B, 'drop', 0.2, { pitch: 0.8 });
  s.play(CUTS[2], 'woodblock', 0.13); s.play(5.7, 'pop_high', 0.12); s.play(6.3, 'bubble', 0.12);
  [6.62, 6.88, 7.13].forEach((x, j) => s.play(x, 'wood', 0.13, { pitch: 0.85 + j * 0.1 }));
  s.play(CUTS[3], 'woodblock', 0.15); s.play(9.0, 'error_soft', 0.18);
  s.play(CUTS[4], 'woodblock', 0.12); [9.45, 9.88, 10.28].forEach((x, j) => s.play(x, 'pop_high', 0.11, { pitch: 1 + j * 0.15 }));
  s.play(CUTS[5], 'drop', 0.19); s.play(CUTS[5] + 0.02, 'odometer', 0.1);
  s.play(CUTS[6], 'drop', 0.17); s.play(26 * B, 'drop', 0.17, { pitch: 1.08 }); s.play(27 * B, 'drop', 0.2, { pitch: 0.8 });
  s.play(CUTS[7], 'kalimba_run', 0.13); s.play(30 * B, 'drop', 0.16);
  s.play(CUTS[8], 'woodblock', 0.13); s.play(33 * B, 'toggle_on', 0.16); s.play(16.05, 'bubble_down', 0.12);
  s.play(CUTS[9] + 0.05, 'marimba', 0.12); s.play(CUTS[9] + 0.35, 'success', 0.15);
}
