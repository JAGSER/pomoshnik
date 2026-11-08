// Пример стиля MANI: манифест «Начни сегодня».
const M = MANI, C = M.C;
const CUTS = [0, 3, 6.5, 10, 13.5];
function draw(t, k) {
  const g = k.g, { i, lt, dur } = M.scene(t, CUTS), last = i === CUTS.length - 1;
  M.bg(g, t, i === 2);
  g.save(); M.camera(g, lt); g.globalAlpha = M.fade(lt, dur, last);
  if (i === 0) {
    M.slam(g, 'ЗАВТРА', 540, 900, 260, t, 0.15, C.ink); M.strike(g, 150, 815, 780, t, 1.2);
    M.slam(g, 'не наступает', 540, 1160, 120, t, 1.7, C.red, { serif: true, w: 700 });
  }
  if (i === 1) {
    M.slam(g, 'не «потом»', 540, 780, 140, t, 3.15, C.gray, { serif: true, w: 700 }); M.strike(g, 250, 735, 580, t, 3.9);
    M.slam(g, 'а «сейчас»', 540, 1120, 200, t, 4.5, C.ink, { serif: true }); M.rule(g, 200, 1180, 680, t, 5.0);
  }
  if (i === 2) {
    M.gather(g, 9, M.eio((lt - 1.2) / 1.6), 540, 900);
    M.slam(g, 'сто дел', 540, 420, 130, t, 6.6, C.paper, { serif: true, w: 700 });
    M.slam(g, 'одна цель', 540, 1420, 150, t, 8.6, C.paper);
  }
  if (i === 3) {
    M.stack(g, [['ШАГ', C.ink, 230], ['за шагом', C.gray, 120, true]], 620, t, 10.1, { step: 0.4 });
    M.bricks(g, ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ'], 1440, t, 11.0, { w: 170 });
  }
  if (i === 4) {
    M.stack(g, [['НАЧНИ', C.ink, 250], ['СЕГОДНЯ', C.red, 220]], 860, t, 13.6, { step: 0.45 });
    M.rule(g, 160, 1200, 760, t, 14.6); M.seal(g, 'ДА', 800, 1420, 130, t, 15.1);
  }
  g.restore();
}
function sound(s) {
  s.play(0.15, 'drop', 0.18); s.play(1.2, 'error_soft', 0.13); s.play(1.7, 'rim', 0.14); M.cutSounds(s, CUTS);
  s.play(3.9, 'error_soft', 0.12); s.play(4.5, 'drop', 0.18, { pitch: 0.85 }); s.play(7.8, 'bubble_down', 0.14); s.play(8.6, 'drop', 0.16);
  [11.0, 11.25, 11.5, 11.75, 12.0].forEach((x, j) => s.play(x, 'woodblock', 0.12, { pitch: 0.9 + j * 0.08 })); s.play(13.6, 'drop', 0.18); s.play(14.05, 'drop', 0.18, { pitch: 1.2 }); s.play(15.1, 'fanfare_soft', 0.16);
}
