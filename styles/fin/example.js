// Пример стиля FINS: канал «Копилка» про подушку безопасности.
const F = FINS, C = F.C;
const CUTS = [0, 1.8, 3.4, 5.4, 7.4, 10, 11.8];
function draw(t, k) {
  const g = k.g, { i, lt } = F.scene(t, CUTS);
  F.bg(g, i === 5);
  g.save(); F.cam(g, lt, 540, 960, 0.5);
  if (i < 2) { F.top(g, 'КОПИЛКА'); const old = i === 1; F.word(g, 'ВСЯ ЗАРПЛАТА', 760, t, 0.1, old ? C.faded : C.yellow, 120); F.word(g, 'УХОДИТ', 900, t, 0.35, old ? C.faded : C.text, 130); if (old) { F.strike(g, 70, 720, 860, t, CUTS[1]); F.strike(g, 70, 860, 560, t, CUTS[1] + 0.1); F.word(g, 'ЕСТЬ', 1110, t, CUTS[1] + 0.3, C.yellow, 130); F.word(g, 'ПОДУШКА', 1250, t, CUTS[1] + 0.45, C.yellow, 130); } }
  if (i === 2) { F.top(g, 'КОПИЛКА', '01'); F.bars(g, [[0.8, 0.7], [0.8, 0.62], [0.82, 0.55], [0.85, 0.5]], ['Доход', 'Траты'], ['ЯНВ', 'ФЕВ', 'МАР', 'АПР'], 80, 320, 920, 900, t, CUTS[i] + 0.1); F.word(g, 'БЮДЖЕТ', 1400, t, CUTS[i] + 0.3); F.note(g, 'Траты ниже каждый месяц', 1470); }
  if (i === 3) { F.top(g, 'КОПИЛКА', '02'); F.metrics(g, [['КОПИМ', '15%', 0.6, C.yellow], ['ПОДУШКА', '3 мес', 0.5, C.red], ['ДОЛГИ', '0 ₽', 0.05, C.red], ['КЭШБЭК', '4 200', 0.7, C.yellow]], 340, t, CUTS[i]); F.word(g, 'ЦИФРЫ', 1400, t, CUTS[i] + 0.3); F.note(g, 'Без воды, только своё', 1470); }
  if (i === 4) { F.top(g, 'КОПИЛКА'); g.fillStyle = C.yellow; g.font = F.font(26, 800, 'mono'); g.textAlign = 'left'; g.fillText('СИЛА ВРЕМЕНИ', 80, 330); F.word(g, 'ДЕНЬГИ', 440, t, CUTS[i] + 0.1); F.word(g, 'РАБОТАЮТ', 560, t, CUTS[i] + 0.25); F.curve(g, t, CUTS[i] + 0.3, { max: 4.3, ticks: ['0', '5', '10', '15 ЛЕТ'] }); }
  if (i === 5) { F.burst(g, t); g.fillStyle = '#FFF4C4'; g.beginPath(); g.arc(540, 860, 300 * F.sp(lt / 0.5), 0, 7); g.fill(); F.flame(g, 540, 820, 1.6 * F.sp((lt - 0.1) / 0.5), t); g.save(); g.globalAlpha *= F.eo((lt - 0.4) / 0.4); g.fillStyle = C.ink; g.font = F.font(80, 900); g.textAlign = 'center'; g.fillText('КОПИЛКА', 540, 1260); g.restore(); }
  if (i === 6) { F.top(g, 'КОПИЛКА'); g.fillStyle = C.muted; g.font = F.font(26, 700, 'mono'); g.textAlign = 'center'; g.fillText('ПОДУШКА ЗА ГОД', 540, 360); g.fillStyle = C.yellow; g.font = F.font(110, 900); g.fillText('НАЧНИ СЕЙЧАС', 540, 480);
    F.profile(g, 'Копилка', 'Бюджет · подушка · рост', [['18 тыс.', 'подписчиков'], ['240', 'разборов'], ['3 года', 'в эфире']], lt > 1.6, t, CUTS[i] + 0.3, { line: 'Спокойно, по шагам, на годы.', btn: ['Подписаться', 'Вы подписаны'], icon: (g, x, y) => F.flame(g, x, y, 0.5, t) });
    F.cursor(g, F.mix(860, 830, F.eio((lt - 0.8) / 0.6)), F.mix(1300, 690, F.eio((lt - 0.8) / 0.6)), lt > 1.45 && lt < 1.7 ? (lt - 1.45) / 0.25 : 0, 0.85); }
  g.restore();
}
function sound(s) { s.play(0.15, 'drop', 0.12); s.play(1.85, 'error_soft', 0.1); s.play(2.15, 'drop', 0.14); s.play(3.5, 'marimba_run', 0.07); s.play(5.5, 'counter', 0.06); s.play(7.6, 'odometer', 0.07); s.play(10.1, 'ta_da', 0.1); s.play(13.3, 'click', 0.12); s.play(13.4, 'success3', 0.1); F.cutSounds(s, CUTS, 'rim', 0.08); }
