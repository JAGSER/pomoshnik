// Пример стиля INFO: годовой отчёт пекарни «Колосок».
const I = INFO, C = I.C;
const CUTS = [0, 1.8, 4.4, 7.2, 7.8, 10.2, 12.6, 14.8];
function draw(t, k) {
  const g = k.g, { i, lt } = I.scene(t, CUTS);
  I.bg(g, 'КОЛОСОК · ОТЧЁТ 2026', 'ХЛЕБ РЯДОМ С ДОМОМ'); if (i === 3) I.wipe(g, I.eio(lt / 0.5)); if (i === 4) I.wipe(g, 1);
  g.save(); I.cam(g, lt, 540, 960, 0.3);
  if (i === 0) { I.orb(g, 300, 900, 70 * I.sp(lt / 0.5), t); g.globalAlpha = I.eo((lt - 0.3) / 0.4); g.fillStyle = C.text; g.font = I.font(110, 800); g.textAlign = 'left'; g.fillText('КОЛОСОК', 420, 930); g.fillStyle = C.amber; g.font = I.font(30, 600); g.fillText('пекарни у дома', 425, 990); g.globalAlpha = 1; }
  if (i === 1) { I.label(g, 'ИСТОРИЯ', 360, t, CUTS[1]); I.timeline(g, [['2018', 'одна печь, два пекаря'], ['2020', 'вторая пекарня'], ['2023', 'своя мельница'], ['2026', '12 пекарен в городе']], t, CUTS[1] + 0.1); }
  if (i === 2) { I.label(g, 'КАК МЫ ПЕЧЁМ', 360, t, CUTS[2]); I.title(g, 'От зерна до полки *за ночь.*', 420, t, CUTS[2] + 0.1, { size: 58 }); I.chain(g, [['✶', 'своё зерно'], ['◍', 'живая закваска'], ['▲', 'каменная печь'], ['➜', 'к открытию в 7:00']], t, CUTS[2] + 0.5); }
  if (i === 4) { I.label(g, 'ИТОГИ ГОДА', 400, t, CUTS[4], true); g.fillStyle = C.ink; g.font = I.font(64, 900); g.textAlign = 'left'; g.fillText('Что мы испекли', 80, 490); I.stats(g, [['Пекарен', 12, ''], ['Буханок', 1.4, 'млн', 1], ['Оценка гостей', 4.9, 'из 5', 1]], t, CUTS[4] + 0.2); }
  if (i === 5) { I.label(g, 'ВЫРУЧКА, МЛН ₽', 360, t, CUTS[5]); I.title(g, 'Растём *каждый год*', 470, t, CUTS[5] + 0.1); I.bars(g, [[2023, 38], [2024, 57], [2025, 81], [2026, 110]], t, CUTS[5] + 0.2, { k: 7 }); }
  if (i === 6) { I.label(g, 'ПЛАН', 360, t, CUTS[6]); g.fillStyle = C.text; g.font = I.font(44, 600); g.textAlign = 'left'; g.fillText('К 2030 году', 80, 470); g.fillStyle = C.amber; g.font = I.font(150, 900); g.fillText(String(Math.round(50 * I.eio((lt - 0.2) / 1))), 80, 640); g.fillStyle = C.text; g.font = I.font(60, 800); g.fillText('пекарен', 340, 620); I.dots(g, 50, Math.floor(I.cl((lt - 0.2) / 1.4) * 50), { y: 820, dy: 100 }); }
  if (i === 7) I.finale(g, 'КОЛОСОК', 'Тёплый хлеб в каждом дворе', t, lt);
  g.restore();
}
function sound(s) { s.play(0.2, 'sparkle', 0.09); [2, 2.6, 3.2, 3.8].forEach((x) => s.play(x, 'tick', 0.09)); [5, 5.4, 5.8, 6.2].forEach((x) => s.play(x, 'pop_soft', 0.09)); s.play(7.3, 'bubble_down', 0.1); s.play(8, 'counter', 0.07); [10.4, 10.65, 10.9, 11.15].forEach((x) => s.play(x, 'marimba', 0.08)); s.play(12.8, 'tally', 0.07); s.play(15, 'success3', 0.1); I.cutSounds(s, CUTS, 'wood', 0.07); }
