// Пример стиля AGOF: «Смена» — ИИ-агенты работают в магазине, пока хозяин спит.
const A = AGOF, C = A.C;
const CUTS = [0, 3.2, 6, 9, 12, 15];
const BGS = [C.cream, C.cream, C.cream, C.cream, C.cream, C.yellow];
function draw(t, k) {
  const g = k.g, { i, lt, dur } = A.scene(t, CUTS), last = i === CUTS.length - 1;
  g.fillStyle = BGS[i]; g.fillRect(0, 0, 1080, 1920);
  g.save(); A.cam(g, lt, 540, 1000, 0.5); g.globalAlpha = A.out(lt, dur, last);
  if (i === 0) { A.head(g, 'Заказы приходят *ночью*', t, 0.1); A.terminal(g, ['23:14  новый заказ №118', '23:40  вопрос про доставку', '00:05  новый заказ №119', '01:30  возврат?', '02:12  ...'], 80, 700, 920, 560, t, 0.6); }
  if (i === 1) { A.words(g, 'Знакомьтесь', 540, 640, 60, t, CUTS[1] + 0.1, { align: 'center', color: C.muted, weight: 700 }); const p = A.sp(lt / 0.5); g.save(); g.translate(300, 960); g.scale(p, p); A.ava(g, 0, 0, 180, 4, t); g.restore(); A.type(g, 'Смена', 420, 995, 120, t, CUTS[1] + 0.4); A.words(g, 'ИИ-агенты для *вашего магазина*', 540, 1160, 54, t, CUTS[1] + 1.2, { align: 'center', color: C.ink, key: C.ink, keyBg: C.yellow, weight: 800 }); }
  if (i === 2) { A.head(g, 'У каждого *своё дело*', t, CUTS[2] + 0.05); ['Заказы', 'Доставка', 'Вопросы', 'Возвраты', 'Склад', 'Отзывы'].forEach((s, j) => A.skill(g, s, j % 2 ? 690 : 130, 640 + Math.floor(j / 2) * 230, j, A.sp((lt - 0.2 - j * 0.1) / 0.4))); const q = A.sp((lt - 0.8) / 0.5); g.save(); g.translate(540, 960); g.scale(q, q); A.ava(g, 0, 0, 200, 1, t); g.restore(); }
  if (i === 3) { A.head(g, 'Работают в *своём офисе*', t, CUTS[3] + 0.05); A.office(g, 80, 600, 920, 900, t, lt, 'заказ'); }
  if (i === 4) { A.head(g, 'Подключены к *вашим сервисам*', t, CUTS[4] + 0.05); A.orbit(g, ['Почта', 'Телеграм', 'Таблицы', 'Касса', 'Доставка', 'CRM', 'Склад', 'Отзывы'], 540, 1080, 330, lt); g.save(); g.translate(540, 1080); A.ava(g, 0, 0, 150, 2, t); g.restore(); }
  if (i === 5) { A.ava(g, 540, 800, 200, 4, t); g.save(); g.globalAlpha *= A.eo((lt - 0.2) / 0.4); g.fillStyle = C.ink; g.font = A.font(130, 900); g.textAlign = 'center'; g.fillText('Смена', 540, 1060); g.restore(); A.words(g, 'Утром всё *уже сделано*', 540, 1100, 56, t, CUTS[5] + 0.5, { align: 'center', color: C.ink, key: C.ink, keyBg: C.white, weight: 700 }); A.cta(g, 'Нанять смену', 1260, t, CUTS[5] + 0.9); A.cursor(g, A.mix(900, 640, A.eio((lt - 1.3) / 0.6)), A.mix(1600, 1330, A.eio((lt - 1.3) / 0.6)), lt > 2 && lt < 2.3 ? (lt - 2) / 0.3 : 0, 1.2); }
  g.restore();
}
function sound(s) { [0.8, 1.05, 1.3, 1.55, 1.8].forEach((x) => s.play(x, 'key_soft', 0.07)); A.cutSounds(s, CUTS, 'marimba_run', 0.12); s.play(3.4, 'pop_double', 0.13); [3.7, 3.8, 3.9, 4.0, 4.1].forEach((x) => s.play(x, 'type', 0.07)); for (let j = 0; j < 6; j++) s.play(6.3 + j * 0.1, 'pop_high', 0.06); s.play(9.4, 'kalimba_run', 0.1); s.play(12.3, 'bubble', 0.1); s.play(15.2, 'ta_da', 0.11); s.play(17.1, 'click', 0.12); }
