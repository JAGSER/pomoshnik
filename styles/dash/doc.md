# Стиль «Дашборд» (DASH): живой тёмный дашборд

Глобальная `DASH` уже подключена, своё `DASH` не объявляй. Рисуй через `DASH` и обычный canvas.

## Правила
1. **Палитра** `DASH.P`: фон `bg` #070B14, панели `panel`/`panel2`, текст `ink`/`sub`/`mute`. Данные: `blue` (главное), `teal` (плюс, рост), `red` (минус, утечка), `violet`, `amber` (норма), `orange`, `cyan`. До 3 цветов данных в кадре.
2. **Оболочка** всегда: `header` (y 110–216, слот героя) и `tabs` (y 236–306). Контент ниже `DASH.TOP`=306, до y 1690.
3. **Сцена = одна мысль**: заголовок `words` слева (x 60, 96–110 px) + одна главная панель или число + до 2 подписей. Карточки x 60, w 960 или две по 468. Заголовок не центрируй.
4. **Текст**: по словам в такт фразе, ключ `*слово` в цветной плашке. Подписи капсом `label` 21–26 px (декор). Числа `big`/`kpi` 150–220 px. Сообщения ≥44 px. Без длинного тире.
5. **Движение**: карточки встают пружиной, числа набегают, столбики растут каскадом, линии рисуются слева направо, частицы текут всегда. Всё появляется через `t0`, готовым ничего.
6. **Сквозной герой** `ring` (кольцо-индикатор темы) живёт в `SLOT` шапки, на ключевых сценах вылетает в центр (`fly`); сегменты рассказывают прогресс.
7. **Частицы = ресурс темы** (деньги, вода, минуты): `sankey`, `stream`, `spray`, `ring.flow`. Свечение только у данных.
8. **Склейка** на ключевом слове: новая сцена в `SC` или событие внутри (модалка `card` поверх, подсветка `hi`, смена заголовка через `t1`). Наезд, оседание и дрейф делает `run`.
9. **Счётчик и штамп**: `header.title` = счётчик темы (`step`), `period` = штамп времени (`periodAt`), `status` = состояние. Кульминация `seal`, находки `ping`, события `toast`, `tap`.

## Каркас
```js
const { P } = DASH, S = DASH.SLOT;
const RING = [[0, [540, 1190, 290]], [3.4, [S.x, S.y, S.r]]]; // [t, [x, y, r], dur?]
const SC = [
  { t0: 0, draw: (g, lt) => { DASH.words(g, lt, { s: 'Куда@-0.12', y: 560, size: 250 });
      DASH.words(g, lt, { s: 'уходит@1.5 *бюджет?@2.7', y: 700, size: 100 }); } },
  { t0: 3.4, in: 'zoom', draw: (g, lt) => {
      DASH.kpi(g, lt, { x: 60, y: 380, label: 'Доход', v: 120000, from: 0, at: 2.2, dur: 1.2, unit: '₽', size: 190, odo: true });
      DASH.card(g, lt, { x: 60, y: 700, w: 960, h: 800, t0: .3, title: 'По месяцам', icon: 'chart' }, (g, b) =>
        DASH.area(g, lt, { x: b.x, y: b.y + 40, w: b.w, h: 400, data: [3, 5, 4, 7], t0: .6 })); } },
];
function draw(t, k) {
  const g = DASH.begin(t, k);
  DASH.run(g, t, SC);
  DASH.header(g, { crumb: 'Остаток', title: DASH.rub(DASH.step([[0, 0], [5.6, 120000, 1.2]], t)), num: true, period: 'ОКТ 2026', status: 'LIVE' });
  DASH.tabs(g, { items: ['Обзор', 'Доход'], at: [[0, 0], [3.4, 1]] });
  const [x, y, r] = DASH.fly(RING, t);
  DASH.ring(g, t, { x, y, r, w: 8 + r * .17, segs: [{ v: .3, col: P.orange }, { v: .7, col: P.blue }], t0: -.25, flow: r > 120 ? 1 : .45, glow: r > 120 });
  DASH.finish(g);
}
function sound(s) { s.play(0.04, 'pop_high', .14); s.play(3.4, 'marimba_run', .13); }
```
Сцена: `{t0, draw(g, lt, info), in: 'zoom'|'swap'|'scroll'|'fade'|'cut', td: .5, cam: [[lt, x, y, z, dur?]], kick, drift}`. `t0` в секундах ролика, `lt` от начала сцены; `cam` ставит точку x,y в центр (540,1000) с зумом z.

## API
**Время**: `pr(t,a,b)` · `lerp` · `cl` · `eo`/`eo5`/`eio` · `spring(p,z)` · `sp(lt,t0,d)` · `ap(lt,t0,d)` · `vis(lt,t0,t1)` · `kf(keys,t)` · `step(keys,t,d)` держит и переходит, ключ `[t,v,dur?]`, v число или массив · `fly(keys,t)` пружиной · `count(lt,t0,d,a,b)` · `stag(i,n,span)` · `hash` · `rnd(seed)` · `fmt(v,dec,{plus,unit})`→«120 000» · `rub(v)`→«120 000 ₽».
**Цвет**: `P.*` · `SER` · `col('teal')` · `rgba(c,a)` · `mixc(a,b,p)`.
**Кадр**: `begin(t,k)`→g · `run(g,t,SC)`→{i,lt,p} · `finish(g)` · `TOP` · `SLOT` {x:116,y:168,r:44}.
**Текст**: `words(g,lt,{s,x,y,size,al,max,lines,keyCol,col,w,t0,t1})`→{size,bottom}; в `s`: `слово@1.2` время слова, `*ключ`, `~тихое`, `50#teal` цвет, `сто_двадцать` неразрывно, `|` перенос; размер подгоняется под ширину и `lines`. `label(g,s,x,y,{size,col,al,max})` · `text(g,s,x,y,{size,w,kind:'D'|'I'|'M',col,al,max})` · `num(g,s,x,y,size,{al,col})` · `big(g,lt,{v|s,from,at,dur,x,y,size,unit,col,al,odo,plus,t0,t1,max})` y базовая линия · `kpi(g,lt,{x,y,label,…big,delta,dcol})`→{bottom}.
**Панели**: `card(g,lt,{x,y,w,h,t0,t1,title,icon,acc,meta},(g,b)=>…)` b={x,y,w,h,r,b} · `panel` · `chip(g,lt,{x,y,s,col,t0,dot,icon,size,al})` · `tip(g,lt,{x,y,s,sub,col,t0,below})` · `callout(g,lt,{x,y,tx,ty,s,sub,t0})` · `row(g,lt,{x,y,w,h,icon,col,s,sub,v,vcol,t0})` · `legend(g,lt,{x,y,w,items:[{s,v,sub,col,t0}],gap})` · `tile(g,icon,x,y,s,col)` · `icon(g,name,cx,cy,s,col)` · `avatar(g,x,y,r,'АБ',col)`.
**Графики** `DASH.f(g, lt, {…})`: `area({x,y,w,h,data,min,max,t0,dur,col})`→{x,y} · `bars({x,y,w,h,data,max,t0,span,col,cols,hi,labels})`→{tops,base} · `hbar({x,y,w,h,f,col,t0})` · `stack({x,y,w,h,segs:[{v,col,t0}]})` · `grid({x,y,w,h,n,labels,lal})` · `hline({x,y,w,col,s,al,t0})` · `ring({x,y,r,w,segs,sweep,flow,glow,t0})` · `sankey({x0,y0,h0,x1,nodes:[{v,col,s,sub}],t0,hi,hiP,ls})`→узлы {x,y,h,cy} · `waffle({x,y,cell,gap,groups:[{n,col,t0,dur,a}]})` · `heat({x,y,cols,cell,vals,col,t0})` · `slider({x,y,w,from,to,at,dur,t0})`→{f,kx}.
**Частицы**: `stream(g,lt,{from:[x,y],to:[x,y],bend,n,t0,t1,col})` · `spray(g,lt,{from:[x,y,угол] или tb=>[x,y,угол,цвет],n,t0,t1,speed,spread,size})` · `scan(g,lt,{x,y,w,h,t0,dur})` · `glow(g,x,y,r,col,a)` · `spark`.
**События**: `seal(g,lt,{x,y,s,col,icon,t0,t1,size})` · `toast(g,lt,{y,s,sub,col,icon,t0})` · `ping(g,lt,{x,y,col,t0})` · `tap(g,lt,{x,y,t0})`.
**Оболочка**: `header(g,{crumb,title,num,period,periodAt,status,statusCol,statusAt})` · `tabs(g,{items,at:[[t,i]…]})` (касание при смене сама).
**Иконки**: home cart cup card repeat car bag coin ruble piggy wallet calendar play music cloud game gift bolt heart user family chart trend fall clock alert check ok up down drop leak receipt phone scale search pencil target percent bulb leaf plus minus.

## Рецепт сильного ролика
1. Хук 0–1 с: слово 220–260 px + герой-кольцо, с которым что-то происходит.
2. Каждые 3–5 с новая панель, тип не повторяй подряд: KPI → Санки → `waffle` → лента `row` → `slider` → `bars` → кольцо в центре → итог.
3. Склейки на ключевых словах; внутри длинной фразы модалка, подсветка или смена заголовка.
4. Числа набегают на словах-числах (`from`/`at`), итог фразы подтверждает `seal`.
5. Счётчик, статус и период в шапке меняются на событиях.
6. Финал 2 с: собранная панель + `seal` + `ping` на находках.

## Звук
Тихий интерфейс: `click`/`toggle_on` (касание, вкладка), `pop_soft`/`pop_high` (карточка, слово), `counter`/`odometer` (набег числа), `tally`/`tick` (каскад), `marimba_run`/`kalimba_run` (смена сцены), `kalimba` pitch 1→1.12→1.26 (шаги), `error_soft` (утечка), `notify` (метки), `success`/`success3` (итог). Громкость 0.08–0.16, 25–32 события.

Нельзя: `document`, `Math.random`, `Date`, `ctx.filter`, `letterSpacing`, `shadowBlur`, полупрозрачные заливки во весь кадр.
