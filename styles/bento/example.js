// Пример стиля BENTO: «Урок» — всё для репетитора на одной странице.
const B = BENTO, C = B.C;
const CUTS = [0, 3, 6.5, 10, 13.5, 17];
const BGS = [C.gray, C.white, C.blue, C.coral, C.navy, C.white];
function draw(t, k) {
  const g = k.g, { i, lt, dur } = B.scene(t, CUTS), last = i === CUTS.length - 1;
  B.bg(g, BGS[Math.max(0, i - 1)], BGS[i], i ? lt : 1);
  if (i === 2 || i === 3) B.cubes(g, t);
  g.save(); B.cam(g, lt, 540, 1000, 0.5); g.globalAlpha = B.out(lt, dur, last);
  if (i === 0) {
    B.head(g, 'Пять приложений *для уроков?*', t, 0.1);
    [['Расписание', C.blue], ['Оплата', C.coral], ['Задания', C.yellow], ['Чат', C.ink], ['Отзывы', C.green]].forEach(([s, c], j) => { const fly = B.eio((lt - 2.2) / 0.6); B.tile(g, 80 + (j % 2) * 480, 620 + Math.floor(j / 2) * 290 - fly * 1500, 440, 250, c, s, B.sp((lt - 0.3 - j * 0.12) / 0.4)); });
  }
  if (i === 1) {
    const y = B.head(g, 'Одна *страница.*', t, CUTS[1] + 0.05);
    B.words(g, 'вместо пяти сервисов', 80, y + 10, 46, t, CUTS[1] + 0.4, { color: C.muted, weight: 700 });
    [[C.blue, 80, 640, 560, 330, 'Запись на урок'], [C.yellow, 660, 640, 340, 160, 'Задания'], [C.coral, 660, 820, 340, 150, 'Оплата'], [C.ink, 80, 990, 300, 260, 'Чат'], [C.green, 400, 990, 300, 260, 'Отзывы'], [C.coral, 720, 990, 280, 260, 'Агент']].forEach(([c, x, y2, w, h, s], j) => B.tile(g, x, y2, w, h, c, s, B.sp((lt - 0.6 - j * 0.1) / 0.45)));
  }
  if (i === 2) {
    let x = 80; x += B.chip(g, 'Ученик', x, 560, 110, C.white, C.blue, B.sp((lt - 0.1) / 0.4));
    B.words(g, 'записался сам', 80, 620, 96, t, CUTS[2] + 0.5, { color: C.white, weight: 900 });
    B.phone(g, 540, 1250, 1.05 * B.sp((lt - 0.4) / 0.6), lt - 0.8, 'Анна, математика', [[C.blue, 'Вт 18:00'], [C.coral, '1 500 ₽'], [C.yellow, 'Записаться'], [C.ink, 'ДЗ №4'], [C.green, '5,0 ★']]);
  }
  if (i === 3) {
    B.head(g, 'Заявка сама становится *уроком.*', t, CUTS[3] + 0.05, C.white, { size: 84, key: C.yellow });
    B.flow(g, [['новая заявка', 'Маша, 9 кл.'], ['в календаре', 'Ср 17:00'], ['оплачено', '+1 500 ₽']], t, CUTS[3] + 0.6, { y: 760 });
  }
  if (i === 4) {
    B.head(g, 'Скажите агенту. *Он сделает.*', t, CUTS[4] + 0.05, C.white, { size: 84, key: C.yellow });
    B.chat(g, [['Напомни всем про контрольную в пятницу', 1], ['Готово: 12 учеников получили напоминание', 0], ['И пришли Маше задание', 1], ['Отправил ✓', 0]], t, CUTS[4] + 0.6, { y: 640, dark: true });
  }
  if (i === 5) {
    B.logo(g, 300, 900, 1.6 * B.sp(lt / 0.5));
    g.save(); g.globalAlpha *= B.eo((lt - 0.2) / 0.4); g.fillStyle = C.ink; g.font = B.font(140, 900); g.textAlign = 'left'; g.fillText('Урок', 440, 950); g.fillStyle = C.blue; g.fillText('.', 440 + g.measureText('Урок').width, 950); g.restore();
    B.words(g, 'Всё для репетитора *в одном месте*', 540, 1060, 50, t, CUTS[5] + 0.5, { align: 'center', color: C.muted, key: C.blue, weight: 700 });
    B.cta(g, 'Начать бесплатно', 1260, t, CUTS[5] + 0.9);
  }
  g.restore();
}
function sound(s) { for (let j = 0; j < 5; j++) s.play(0.3 + j * 0.12, 'pop_soft', 0.08); s.play(2.3, 'bubble_down', 0.12); B.cutSounds(s, CUTS, 'marimba_run', 0.12); s.play(6.6, 'pop_double', 0.12); s.play(7.3, 'pop_high', 0.1); [10.6, 11.2, 11.8].forEach((x) => s.play(x, 'success', 0.1)); [14.1, 14.8, 15.5, 16.2].forEach((x) => s.play(x, 'notify', 0.08)); s.play(17.9, 'ta_da', 0.1); }
