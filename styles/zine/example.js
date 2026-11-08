// Пример стиля ZINE: «30 дней без ленты».
const Z = ZINE, C = Z.C;
const CUTS = [0, 3, 8, 12.5, 17];
function draw(t, k) {
  const g = k.g, { i, lt } = Z.scene(t, CUTS);
  g.save(); Z.cam(g, lt, 540, 960, 0.6);
  if (i === 0) { Z.half(g, C.pink, C.pinkDot); Z.tape(g, 'ЛЕНТА → ТИШИНА → ЛЕНТА → ТИШИНА →', 150, -0.06, t);
    Z.word(g, 'Я УДАЛИЛ', 540, 560, 130, C.white, { align: 'center', rot: -0.03, p: Z.sp(lt / 0.3) }); Z.word(g, 'ЛЕНТУ', 540, 760, 190, C.yellow, { align: 'center', rot: 0.02, p: Z.sp((lt - 0.2) / 0.3) });
    Z.card(g, 'на 30 дней', 540, 940, 110, Z.sp((lt - 0.5) / 0.4)); Z.word(g, '(и вот что стало)', 540, 1180, 48, C.white, { align: 'center', p: Z.sp((lt - 1) / 0.3) }); Z.tape(g, 'ДЕНЬ 1 • ДЕНЬ 7 • ДЕНЬ 30 •', 1560, 0.05, t, C.lime, C.ink, -1); }
  if (i === 1) { Z.half(g, C.yellow, C.yellowDot); Z.word(g, 'ЧТО', 80, 400, 150, C.white, { p: Z.sp(lt / 0.3) }); Z.word(g, 'ИЗМЕНИЛОСЬ?', 80, 560, 140, C.white, { p: Z.sp((lt - 0.15) / 0.3) });
    [['+2 ЧАСА', 'в день свободно', C.pink], ['СОН', 'засыпаю за 10 минут', C.blue], ['4 КНИГИ', 'за месяц', C.lime], ['ТИШЕ', 'в голове', C.violet]].forEach(([a, b, c], j) => Z.sticker(g, a, b, 80 + (j % 2) * 470, 700 + Math.floor(j / 2) * 300, 440, 260, c, Z.sp((lt - 0.6 - j * 0.6) / 0.35), { rot: (j % 2 ? 1 : -1) * 0.03 })); }
  if (i === 2) { Z.checker(g); Z.sticker(g, 'КАК Я ЭТО СДЕЛАЛ', '', 80, 300, 640, 100, C.yellow, Z.sp(lt / 0.3)); Z.term(g, 80, 470, 920, 560, ['✦ настройки телефона', '+ лента: скрыта', '+ уведомления: выкл', '+ экран: чёрно-белый', '+ телефон: в другой комнате', '', 'экранное время: 38 мин'], t, CUTS[2] + 0.4, { title: 'телефон ~ /настройки' }); Z.word(g, '−80%', 980, 1340, 170, C.lime, { align: 'right', p: Z.sp((lt - 2.6) / 0.3) }); }
  if (i === 3) { Z.half(g, C.lime, C.limeDot); Z.word(g, 'ПОПРОБУЙ', 80, 420, 150, C.white, { p: Z.sp(lt / 0.3) }); Z.word(g, 'на неделю', 560, 520, 66, C.pink, { rot: -0.05, p: Z.sp((lt - 0.2) / 0.3) });
    [['Скрой ленту в настройках', C.pink], ['Выключи уведомления', C.blue], ['Положи телефон подальше', C.violet]].forEach(([s, c], j) => Z.step(g, j + 1, s, 80, 700 + j * 240, c, Z.sp((lt - 0.6 - j * 0.5) / 0.35))); Z.tape(g, 'ТИШИНА → ВРЕМЯ → ЖИЗНЬ →', 1560, -0.04, t, C.pink, C.white); }
  if (i === 4) { Z.half(g, C.violet, C.violetDot); Z.word(g, 'ХОЧЕШЬ', 540, 420, 140, C.white, { align: 'center', rot: -0.03, p: Z.sp(lt / 0.3) }); Z.word(g, 'ЧЕК-ЛИСТ?', 540, 580, 150, C.yellow, { align: 'center', rot: 0.02, p: Z.sp((lt - 0.15) / 0.3) }); Z.sticker(g, 'НАПИШИ', '', 240, 700, 600, 110, C.lime, Z.sp((lt - 0.4) / 0.3), { rot: -0.03 }); Z.word(g, '«ТИШИНА»', 540, 990, 160, C.pink, { align: 'center', rot: 0.03, p: Z.sp((lt - 0.6) / 0.3) }); Z.tape(g, 'ПОДПИШИСЬ • ДЕНЬ 31 СКОРО •', 1560, 0.05, t, C.yellow, C.ink, -1); }
  g.restore();
}
function sound(s) { [0.1, 0.3, 0.6, 1].forEach((x) => s.play(x, 'pop_double', 0.11)); s.play(3.1, 'drop', 0.14); for (let j = 0; j < 4; j++) s.play(3.6 + j * 0.6, 'pop_high', 0.09); s.play(8.2, 'type', 0.07); s.play(10.6, 'success3', 0.1); s.play(12.7, 'drop', 0.14); [13.1, 13.6, 14.1].forEach((x) => s.play(x, 'pop_high', 0.1)); s.play(17.2, 'drop', 0.14); s.play(17.8, 'ta_da', 0.1); Z.cutSounds(s, CUTS, 'rim', 0.1); }
