// «Кофейня без кассира» в стиле SLAM. Сквозной предмет: стакан кофе line-art с лаймовой крышкой и курсор.
const CUTS = [3.5, 8.0, 12.5, 17.0, 21.5];
const HITS = [[0.1, 10], [0.45, 22], [3.6, 12], [3.8, 10], [8.1, 10], [8.35, 12], [12.6, 12], [12.85, 18], [13.5, 10],
  [17.1, 8], [17.25, 8], [17.4, 10], [18.8, 16], [21.6, 12], [21.85, 20], [22.5, 24]];
const S = SLAM, C = S.C;
const BG = '#0A0A0B';

// стакан навынос: белый контур, лаймовая крышка, пар
function cup(g, x, y, s, t, a) {
  if (a <= 0) return;
  g.save(); g.globalAlpha *= Math.min(1, a); g.translate(x, y); const sc = 0.85 + 0.15 * Math.min(1, a); g.scale(sc, sc);
  g.strokeStyle = C.wh; g.lineWidth = 6; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(-s * 0.4, -s * 0.3); g.lineTo(s * 0.4, -s * 0.3); g.lineTo(s * 0.3, s * 0.5); g.lineTo(-s * 0.3, s * 0.5); g.closePath(); g.stroke();
  g.beginPath(); g.moveTo(-s * 0.37, -s * 0.05); g.lineTo(s * 0.37, -s * 0.05); g.moveTo(-s * 0.34, s * 0.22); g.lineTo(s * 0.34, s * 0.22); g.stroke();
  S.cross(g, 0, s * 0.085, s * 0.06, 1, 4, 'rgba(255,255,255,0.5)');
  g.fillStyle = C.lime; S.rr(g, -s * 0.46, -s * 0.44, s * 0.92, s * 0.13, 8); g.fill();
  S.rr(g, -s * 0.3, -s * 0.52, s * 0.6, s * 0.09, 6); g.fill();
  g.lineWidth = 4; g.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const ph = t * 2 + i * 2.1, al = 0.35 + 0.35 * Math.sin(ph);
    g.strokeStyle = 'rgba(244,241,234,' + al.toFixed(2) + ')'; g.beginPath();
    for (let j = 0; j <= 12; j++) { const yy = -s * 0.6 - j * s * 0.03, xx = (i - 1) * s * 0.18 + Math.sin(j * 0.6 + ph) * s * 0.04; j ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
    g.stroke();
  }
  g.restore();
}

function phone(g, x, y, w, h, a) {
  g.save(); g.globalAlpha *= a; g.translate(0, (1 - a) * 80);
  S.rr(g, x, y, w, h, 36); g.strokeStyle = C.wh; g.lineWidth = 6; g.stroke();
  g.fillStyle = C.wh; S.rr(g, x + w / 2 - 40, y + 22, 80, 12, 6); g.fill();
  g.restore();
}

function fitText(g, s, max, size) {
  let f = size; g.font = '900 ' + f + 'px "Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif';
  while (g.measureText(s).width > max && f > 20) { f -= 2; g.font = '900 ' + f + 'px "Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif'; }
}

// 1. Хук: БЕЗ КАССИРА + стакан
function S1(g, lt, t) {
  S.typed(g, '> cafe --no-cashier', 540, 560, lt, 0.05, 0.6, { size: 36, align: 'center', col: 'rgba(244,241,234,0.55)' });
  const h = S.title(g, 'БЕЗ КАССИРА', 800, lt, { size: 170, maxW: 800, lines: 1, times: [0.1, 0.45], hi: 'кассира', cx: 500 });
  S.echo(g, 'БЕЗ КАССИРА', 500, 800, h.size, lt, 1.0, { n: 2 });
  if (lt > 0.7) S.cursor(g, Math.min(h.right + h.size * 0.3, 975), 800 - h.size * 0.36, h.size * 0.72, t, lt > 1.2, S.eo((lt - 0.7) / 0.2));
  cup(g, 540, 1390 + Math.sin(t * 1.5) * 8, 280, t, S.eo((lt - 0.9) / 0.3));
}

// 2. QR-код на столе, скан, меню
function S2(g, lt, t) {
  S.title(g, 'СКАН QR', 300, lt, { size: 180, lines: 1, times: [0.1, 0.3], hi: 'qr' });
  const pa = S.eo((lt - 0.2) / 0.3); if (pa <= 0) return;
  phone(g, 390, 480, 300, 760, pa);
  g.save(); g.globalAlpha *= pa;
  const qa = 1 - S.eo((lt - 2.3) / 0.25), N = 15, m = 14, q0x = 540 - N * m / 2, q0y = 860 - N * m / 2;
  if (qa > 0) {
    g.save(); g.globalAlpha *= qa; g.fillStyle = C.wh;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const fin = (i < 4 && j < 4) || (i > 10 && j < 4) || (i < 4 && j > 10);
      if (fin) { const fi = i % 11, fj = j % 11; if (!(fi === 0 || fi === 3 || fj === 0 || fj === 3 || (fi > 0 && fi < 3 && fj > 0 && fj < 3))) continue; }
      else if ((i * 73 + j * 151 + i * j * 7) % 7 >= 3) continue;
      g.fillRect(q0x + i * m, q0y + j * m, m - 2, m - 2);
    }
    const sy = q0y + (0.5 - 0.5 * Math.cos(lt * 4)) * N * m;
    g.fillStyle = C.lime; g.fillRect(q0x - 20, sy, N * m + 40, 6); g.restore();
  }
  ['ЛАТТЕ', 'КАПУЧИНО', 'ФИЛЬТР'].forEach((s, i) => {
    const a = S.eo((lt - 2.45 - i * 0.12) / 0.25); if (a <= 0) return;
    g.save(); g.globalAlpha *= a; g.translate((1 - a) * 40, 0);
    S.rr(g, 420, 660 + i * 150, 240, 110, 18); g.strokeStyle = 'rgba(255,255,255,0.2)'; g.lineWidth = 3; g.stroke();
    fitText(g, s, 200, 44); g.fillStyle = C.wh; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, 540, 715 + i * 150);
    g.restore();
  });
  const sa = S.eo((lt - 3.1) / 0.25);
  if (sa > 0) {
    g.save(); g.globalAlpha *= sa; g.strokeStyle = C.lime; g.lineWidth = 5;
    const pu = 4 * (1 - sa); S.rr(g, 420 - pu, 660 - pu, 240 + pu * 2, 110 + pu * 2, 18); g.stroke(); g.restore();
    S.cursor(g, 730, 715, 46, t, lt > 3.6, sa);
  }
  g.restore();
  S.typed(g, lt < 2.3 ? '> scan: стол 07' : '> меню открыто', 540, 1400, lt, lt < 2.3 ? 0.6 : 2.4, 0.4, { size: 44, align: 'center', col: 'rgba(244,241,234,0.75)' });
}

// 3. AI подсказывает добавки
const ROWS = ['ЛАТТЕ 0,4', 'ОВСЯНОЕ МОЛОКО', 'СИРОП КАРАМЕЛЬ', 'К ОПЛАТЕ'];
const NT = [0.8, 1.4, 2.0, 2.6], CY = [600, 840, 1080, 1320];
function S3(g, lt, t) {
  S.title(g, 'AI ПОДСКАЗЫВАЕТ', 330, lt, { size: 110, maxW: 880, lines: 1, times: [0.1, 0.35], hi: 'ai' });
  ROWS.forEach((name, i) => S.plate(g, { x: 200, y: CY[i], w: 790, h: 150, idx: '0' + (i + 1), name, lt, st: 0.45 + i * 0.1, done: NT[i], t }));
  const ry = S.timeline(g, 140, 520, CY, lt, NT);
  if (lt > 0.1) S.cursor(g, 140, ry, 46, t, false);
}

// 4. Оплата в один тап, чек летит бариста
function S4(g, lt, t) {
  S.title(g, 'ОДИН ТАП', 330, lt, { size: 200, lines: 1, times: [0.1, 0.35], hi: 'тап' });
  const pa = S.eo((lt - 0.3) / 0.3); if (pa <= 0) return;
  phone(g, 140, 560, 320, 640, pa);
  g.save(); g.globalAlpha *= pa;
  const press = lt > 1.0 && lt < 1.15 ? 0.94 : 1;
  g.save(); g.translate(300, 1050); g.scale(press, press);
  g.fillStyle = C.lime; S.rr(g, -120, -50, 240, 100, 18); g.fill();
  fitText(g, 'ОПЛАТА', 200, 44); g.fillStyle = BG; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ОПЛАТА', 0, 2);
  g.restore();
  const rp = S.clamp((lt - 1.0) / 0.4);
  if (rp > 0 && rp < 1) { g.strokeStyle = 'rgba(255,255,255,' + (1 - rp).toFixed(2) + ')'; g.lineWidth = 4; g.beginPath(); g.arc(300, 1050, 40 + rp * 120, 0, 6.283); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,0.3)'; [700, 760, 820].forEach((yy, i) => g.fillRect(190, yy, 220 - i * 50, 18));
  g.restore();
  const ta = S.eo((lt - 1.15) / 0.35); if (ta <= 0) return;
  g.save(); g.globalAlpha *= Math.min(1, ta * 1.5); g.translate((1 - ta) * -260, 0);
  S.rr(g, 540, 620, 420, 480, 18); g.strokeStyle = C.wh; g.lineWidth = 5; g.stroke();
  S.label(g, 'заказ 128', 580, 690, { size: 36 });
  g.fillStyle = 'rgba(255,255,255,0.35)'; [780, 850, 920].forEach((yy, i) => g.fillRect(580, yy, 300 - i * 60, 20));
  g.setLineDash([12, 10]); g.strokeStyle = 'rgba(255,255,255,0.2)'; g.lineWidth = 3; g.beginPath(); g.moveTo(560, 990); g.lineTo(940, 990); g.stroke(); g.setLineDash([]);
  S.check(g, 900, 1050, 30, S.clamp((lt - 1.9) / 0.15), 10);
  g.restore();
  S.typed(g, '> бариста: принято', 540, 1360, lt, 1.6, 0.5, { size: 44, align: 'center', col: 'rgba(244,241,234,0.75)' });
}

// 5. Счётчик заказов
function S5(g, lt, t) {
  S.title(g, 'ЗАКАЗОВ ЗА УТРО', 440, lt, { size: 110, maxW: 900, lines: 1, times: [0.1, 0.25, 0.4], hi: 'утро' });
  const n = S.count(lt, 0.4, 1.8, 140);
  S.bigNum(g, String(n), 540, 1000, lt, 0.3, { size: 380, wide: '140' });
  const tip = S.segBar(g, 90, 1120, 900, n / 140, { h: 100, seg: 20, flash: 1.85, lt });
  S.cursor(g, Math.min(tip + 10, 940), 1170, 140, t, lt > 2);
  S.label(g, 'очередь: 0', 90, 1300, { size: 32 });
  S.label(g, '07:00-11:00', 990, 1300, { size: 32, align: 'right' });
}

// 6. Финал: стакан, КОФЕ ГОТОВ, штамп
function S6(g, lt, t) {
  cup(g, 540, 640 + Math.sin(t * 1.5) * 6, 320, t, S.eo(lt / 0.3));
  S.title(g, 'КОФЕ ГОТОВ', 1060, lt, { size: 170, maxW: 900, lines: 1, times: [0.1, 0.35], hi: 'готов' });
  S.stamp(g, 'БЕЗ КАССИРА', 540, 1330, lt, 1.0, { size: 80, rot: -0.12, maxW: 520 });
  S.typed(g, '> заказ готов', 540, 1560, lt, 1.5, 0.4, { size: 40, align: 'center' });
}

function draw(t, k) {
  S.hits(HITS);
  S.frame(k.g, t, k, CUTS, [S1, S2, S3, S4, S5, S6]);
}

function sound(s) {
  const P = (t, n, v, p) => s.play(t, n, v, { pitch: p || 1 });
  P(0.1, 'rim', 0.18, 0.8); P(0.45, 'woodblock', 0.22, 0.6); P(0.7, 'tick', 0.1); P(1.0, 'pop_soft', 0.12);
  P(3.5, 'marimba_run', 0.16); P(3.6, 'rim', 0.16, 0.8); P(3.8, 'rim', 0.16, 0.95); P(4.6, 'type', 0.08); P(5.8, 'bubble', 0.12); P(6.0, 'toggle_on', 0.12, 1.1); P(6.6, 'click', 0.12, 1.1);
  P(8.0, 'kalimba_run', 0.16); P(8.1, 'rim', 0.16, 0.8); P(8.35, 'woodblock', 0.18, 0.7);
  P(8.8, 'toggle_on', 0.12, 0.9); P(9.4, 'toggle_on', 0.12, 1.0); P(10.0, 'toggle_on', 0.12, 1.1); P(10.6, 'toggle_on', 0.12, 1.25);
  P(12.5, 'marimba_run', 0.16, 0.8); P(12.85, 'woodblock', 0.2, 0.6); P(13.5, 'click', 0.16); P(13.8, 'pop_high', 0.12); P(14.1, 'type', 0.08); P(14.4, 'success', 0.14);
  P(17.0, 'kalimba_run', 0.16); P(17.25, 'rim', 0.14, 0.9); P(17.4, 'counter', 0.14); P(18.85, 'sparkle', 0.14);
  P(21.5, 'marimba_run', 0.16); P(21.85, 'woodblock', 0.22, 0.55); P(22.5, 'drop', 0.14); P(22.6, 'ta_da', 0.14); P(23.0, 'type', 0.08);
}