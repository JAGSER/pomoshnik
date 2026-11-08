// example.js - ролик «Компании без рук» в стиле SLAM, только через библиотеку.
const CUTS = [3.2, 6.6, 9.8, 12.6];
const HITS = [[0.1, 8], [0.55, 10], [1.0, 10], [1.25, 24], [8.4, 18], [13.6, 26]];
const S = SLAM, C = S.C;

// 1. Хук: «КОМПАНИИ СТРОЯТ / СЕБЯ САМИ», курсор, контурное эхо
function S1(g, lt, t) {
  S.typed(g, '> nohandslabs --boot', 540, 640, lt, 0.05, 0.6, { size: 36, align: 'center', col: 'rgba(244,241,234,0.55)' });
  S.title(g, 'КОМПАНИИ СТРОЯТ', 820, lt, { size: 190, lines: 1, times: [0.1, 0.55] });
  const s2 = S.wrap(g, 'СЕБЯ САМИ', { size: 250, maxW: 800, lines: 1 }).size;
  const y2 = 820 + s2 * 1.02;
  const h = S.title(g, 'СЕБЯ САМИ', y2, lt, { size: 250, maxW: 800, lines: 1, times: [1.0, 1.25], hi: 'сами', cx: 520 });
  S.echo(g, 'СЕБЯ САМИ', 520, y2, h.size, lt, 1.7, { n: 3 });
  if (lt > 1.4) S.cursor(g, h.right + h.size * 0.3, y2 - h.size * 0.36, h.size * 0.72, t, lt > 2.0, S.eo((lt - 1.4) / 0.2));
}

// 2. Агенты: рельс слева, плашки отделов включаются по очереди
const ROWS = ['ЗАЯВКИ', 'ПРОИЗВОДСТВО', 'ДОСТАВКА', 'ПОДДЕРЖКА'];
const NT = [0.8, 1.35, 1.9, 2.45], CY = [640, 880, 1120, 1360];
function S2(g, lt, t) {
  S.title(g, 'АГЕНТЫ В РАБОТЕ', 330, lt, { size: 120, lines: 1, times: [0.05, 0.2, 0.32], hi: 'агенты' });
  ROWS.forEach((name, i) => S.plate(g, { x: 200, y: CY[i], w: 790, h: 150, idx: '0' + (i + 1), name, lt, st: 0.45 + i * 0.1, done: NT[i], t }));
  const ry = S.timeline(g, 140, 560, CY, lt, NT);
  if (lt > 0.1) S.cursor(g, 140, ry, 46, t, false);
}

// 3. Счётчик 0-95 и сегментная шкала
function S3(g, lt, t) {
  S.title(g, 'РАБОТЫ ДЕЛАЕТ ИИ', 440, lt, { size: 110, lines: 1, times: [0.05, 0.2, 0.35], hi: 'ии' });
  const n = S.count(lt, 0.3, 1.5, 95);
  S.bigNum(g, n + '%', 540, 1000, lt, 0.25, { size: 400, wide: '95%' });
  const tip = S.segBar(g, 90, 1120, 900, n / 100, { h: 100, seg: 20, flash: 1.8, lt });
  S.cursor(g, Math.min(tip + 10, 975), 1170, 140, t, lt > 2);
  S.label(g, 'ии 95 / люди 05', 90, 1300, { size: 32 });
  S.label(g, 'цель', 990, 1300, { size: 32, align: 'right' });
}

// 4. 5% людей: контурное число, подпись на бланке, галочка
function S4(g, lt, t) {
  g.fillStyle = C.dim; g.fillRect(90, 240, 849, 36);
  g.save(); g.globalAlpha *= 1 - S.eo(lt / 0.5); g.fillStyle = C.lime; g.fillRect(90, 240, 849, 36); g.restore();
  const pu = 4 + 6 * Math.abs(Math.sin(t * 5));
  g.fillStyle = C.wh; g.fillRect(945, 240, 45, 36);
  g.strokeStyle = C.wh; g.lineWidth = 3; g.strokeRect(945 - pu, 240 - pu, 45 + pu * 2, 36 + pu * 2);

  S.bigNum(g, '5%', 540, 700, lt, 0.15, { size: 340, maxW: 700, outline: true });
  S.title(g, 'ЛЮДИ РЕШАЮТ', 880, lt, { size: 130, lines: 1, times: [0.45, 0.65], hi: 'решают' });
  S.typed(g, 'стратегия, вкус, финал', 540, 975, lt, 0.9, 0.45, { size: 44, align: 'center', col: 'rgba(244,241,234,0.75)' });

  const pa = S.eo((lt - 0.7) / 0.3); if (pa <= 0) return;
  g.save(); g.globalAlpha *= pa; g.translate(0, (1 - pa) * 60);
  S.rr(g, 140, 1100, 800, 360, 20); g.strokeStyle = 'rgba(255,255,255,0.2)'; g.lineWidth = 3; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.moveTo(200, 1400); g.lineTo(880, 1400); g.stroke();
  S.cross(g, 220, 1370, 15, 1, 3, 'rgba(255,255,255,0.3)');
  const sp = S.eio((lt - 0.95) / 0.9);
  const tip = S.scribble(g, 230, 1310, 560, 138, sp, { seed: 0, lw: 7 });
  S.cursor(g, tip[0] + 18, tip[1] - 34, 48, t, sp >= 1);
  S.check(g, 870, 1170, 30, S.clamp((lt - 1.9) / 0.15), 10);
  g.restore();
}

// 5. Финал: имя, слоган, штамп, адрес
function S5(g, lt, t) {
  const h = S.title(g, 'Nohandslabs', 800, lt, { size: 170, maxW: 820, lines: 1, times: [0.08], cx: 510 });
  if (lt > 0.3) S.cursor(g, h.right + h.size * 0.32, 800 - h.size * 0.36, h.size * 0.72, t, true);
  S.title(g, 'БЕЗ РУК. С ГОЛОВОЙ.', 960, lt, { size: 96, lines: 1, times: [0.5, 0.62, 0.76, 0.88], hi: 3 });
  S.stamp(g, '24/7 ОНЛАЙН', 540, 1260, lt, 1.0, { size: 80, rot: -0.12, maxW: 480 });
  S.typed(g, 'nohandslabs.com', 540, 1520, lt, 1.4, 0.4, { size: 40, align: 'center' });
}

function draw(t, k) {
  S.hits(HITS);
  S.frame(k.g, t, k, CUTS, [S1, S2, S3, S4, S5]);
}

function sound(s) {
  const P = (t, n, v, p) => s.play(t, n, v, { pitch: p || 1 });
  // хук: слэмы слов
  P(0.1, 'rim', 0.18, 0.8); P(0.55, 'rim', 0.18, 0.9); P(1.0, 'rim', 0.18, 1.0);
  P(1.4, 'woodblock', 0.22, 0.6); P(1.75, 'tick', 0.1);
  // агенты: склейка и включение плашек
  P(3.2, 'marimba_run', 0.16); P(3.3, 'woodblock', 0.14, 0.8);
  P(4.0, 'toggle_on', 0.12, 0.9); P(4.55, 'toggle_on', 0.12, 1.0); P(5.1, 'toggle_on', 0.12, 1.1); P(5.65, 'toggle_on', 0.12, 1.25);
  // счётчик
  P(6.6, 'kalimba_run', 0.16); P(6.9, 'counter', 0.14); P(8.4, 'success', 0.16);
  // люди решают
  P(9.8, 'marimba_run', 0.16, 0.8); P(9.95, 'pop_high', 0.14); P(10.45, 'rim', 0.12); P(10.9, 'type', 0.08); P(12.05, 'sparkle', 0.14);
  // финал
  P(12.6, 'kalimba_run', 0.16); P(12.7, 'pop_double', 0.16); P(13.1, 'wood', 0.12);
  P(13.6, 'woodblock', 0.22, 0.55); P(13.65, 'drop', 0.12); P(14.1, 'ta_da', 0.14);
}