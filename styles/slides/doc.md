# Стиль «Деловые слайды»: живой отчёт, который листает аналитик

`SLIDES` уже подключена: `const S = SLIDES, P = S.P;`. Свою не объявляй, `k.text/k.card/k.emoji` не используй.

## Правила стиля
1. **Палитра**: белый лист `P.page`, текст `P.ink`/`P.ink2`/`P.mute`, один акцент бирюза `P.teal` (ключ, главный столбик, итог), прочие данные `P.tealL`/`P.tealM`, подложки `P.tealP`, тёмная плашка `P.slate`. Без других цветов, градиентов, свечения, эмодзи.
2. **Сцена = страница отчёта**: метка раздела капсом («02 · ВРЕМЯ СУТОК») + заголовок-вывод 100–110 px в 1–2 строки (ключ бирюзой) + ОДИН главный блок данных + тёмная плашка внизу. Поля 64 px, данные в y 440…1510.
3. **Данные живые**: числа бегут (`odo`), столбики растут пружиной, рейтинг пересортировывается, Санки дорисовывается, ползунок и переключатель пересчитывают результат. Курсор аналитика нажимает, тянет, переключает.
4. **Набор**: гротеск 800 для заголовков и чисел; число крупно, единица мелко. Капс с разрядкой (`spaced`) только для меток. Моно только для чека. Без длинного тире.
5. **Движение**: появление 0,3 с (текст вверх без перелёта, карточки и кнопки `pop` с лёгким перелётом), уход быстрее; каскад ≤ 0,5 с; движется ≤ трети элементов; линейного хода нет (`eo`, `eio`, `sp`).
6. **Склейка = листание** на ключевом слове: `push`, `up`, `drill` (курсор нажал и «провалился» в элемент), `cut`, один `overview` (тёмный обзор всех страниц, 1 с) перед итогом. Камера сама оседает после склейки и медленно наезжает.
7. **Сквозной предмет** на каждой странице «едет» по данным (кончик линии, ручка ползунка, итоговая карточка). HUD: прогресс страниц + статус-бирка, меняется по сюжету («ФАКТ» → «ПЛАН»).
8. **≤ 3 текстовых блоков**: заголовок, подписи данных, плашка (2–6 слов в такт речи).

## Каркас
```js
const S = SLIDES, P = S.P;
function p1(g, t, lt) {           // t абсолютное, lt от начала страницы
  S.bg(g, t);
  const y = S.head(g, t, { t0: 0, label: '01 · ВЫРУЧКА', title: 'Выручка@0.1 *выросла@0.6' });
  S.appear(g, t, .4, g => S.kpi(g, 64, y + 40, 952, 260, { label: 'ИЮНЬ', v: S.count(t, .6, 1.6, 0, 1.3), dec: 1, unit: 'млн ₽' }), { kind: 'up' });
  S.cursor(g, t, [[2.6, 700, 1200], [3.0, 900, 700, 'click']]);
}
const PAGES = [{ t0: 0, draw: p1 }, { t0: 3.6, draw: p2, tr: 'push' }, { t0: 8.8, draw: p3, tr: 'drill', from: [830, 640, 160, 160] }];
const PILLS = [[.5, 3.4, 'с@.6 *800_тыс.@1 до@1.6 *1,3_млн@2']];
function draw(t, k) {
  const g = S.begin(t, k), d = S.deck(g, t, PAGES);
  S.hud(g, t, { page: d.i + 1, total: PAGES.length, t0: d.t0, t1: d.t1, brand: 'Компания · отчёт', status: [[0, 'ФАКТ'], [31.7, 'ПЛАН', 1]], src: 'Источник', a: 1 - d.ov });
  S.pill(g, t, PILLS);
}
```
Моменты бери из `k.subs` (слова ≈ равномерно по фразе). Структура страницы (сетка, заготовки пунктиром) видна сразу на склейке, данные идут в такт словам.

## API
Рисующие функции первым берут `g`; пиксели кадра 1080×1920, секунды.

**Время**: `pr(t,a,b)`→0…1 · `lerp` · `cl` · `eo` `eo5` `eio` `ei` · `eb(p)` перелёт · `sp(p)` пружина · `spring(t,t0,dur)` · `count(t,t0,t1,a,b)` · `kf([[t,v]…],t)` · `kfv([[t,a,b]…],t)`→[a,b] · `stag(t,t0,i,step,dur)` · `cuts(t,[0,3.6…])`→{i,lt,t0,t1,p} · `rnd(seed)`.
**Цвет, числа**: `rgba(c,a)` · `mix(c1,c2,p)` · `fmt(v,dec)`→«1 234,5» · `font(size,wt,fam)` · `fit(g,s,maxW,size)`.
**Текст**: спец-строка `"слово@1.2 *ключ@1.6 1,3_млн | перенос"` (`*` ключ, `@` момент, `_` неразрывный пробел).
`text(g,s,x,y,size,{col,al,wt,max,a,fam})` y середина, →ширина · `spaced(g,s,x,y,size,{col,al,tr,a})` · `words(g,t,spec,x,y,{size,lines,max,al,col,kcol,hl:'under'|'box',out})` y верх, →{w,h,bottom}, сам ужимает · `head(g,t,{t0,label,title,size,lines})`→y низа · `odo(g,v,x,y,size,{dec,step,unit,pre,al,col,a})` бегущие цифры, y базовая линия · `num(g,'36,9',x,y,size,{unit:'%'})`.
**Появление**: `appear(g,t,t0,(g,p)=>{…},{kind,x,y,dist,dur,out})`, kind `up` `down` `left` `right` `pop` `stamp` `grow` `fade` `wipe` (x,y центр для pop/stamp/grow).
**Интерфейс**: `card(g,x,y,w,h,{fill,line,r,shadow})` · `chip(g,s,x,y,{size,fill,col,line,al,caps:false,icon})`→{x,y,w,h} · `badge(g,n,x,y,r)` · `seg(g,x,y,w,h,labels,sel)` sel дробный · `slider(g,x,y,w,f,{a,b,ticks})`→x ручки · `toggle(g,x,y,on)` · `button(g,s,x,y,{al,fill,hover,press})`→[x,y,w,h] · `tip(g,s,x,y,{dir:'down',light,size})` выноска к точке · `check(g,x,y,r,p)` · `kpi(g,x,y,w,h,{label,v,dec,step,unit,pre,size,note,dark,pale,va,icon})` · `popup(g,t,t0,x,y,w,h,(g,e)=>…,{out,from:'bottom'})` панель-обоснование · `dim(g,a)` · `cursor(g,t,[[t,x,y,'click'|'down'|'up']…])`→{x,y,press} · `pill(g,t,[[t0,t1,spec]…])` · `hud` · `bg(g,t,{mark,lt})` · `dots` · `hatch(g,x,y,w,h)` прогноз.
**Графики**: `gridY(g,x,y,w,h,{min,max,step,dec,p})` · `axisX(g,xs,y,labels,{a})` · `line(g,pts,p,{fill,base,lw,dots,hi})`→кончик {x,y} · `vbars(g,t,x,y,w,h,vals,{t0,hi,hiK,fmt})` · `hbars(g,t,x,y,w,rowH,[{l,a,b,hi}],{t0,sw,maxA,maxB,fa,fb,hiK,barW})` sw 0→1 пересортировка · `sankey(g,t,{x0,y0,h,x1,items:[{l,v,hi}],p,hiK,size})` · `donut(g,x,y,r,lw,f)` · `stack(g,x,y,w,h,[{v,col,l}],p)` · `timeline(g,x,y,w,labels,{p,on})`→xs · `flow(g,dist,pts,n,(g,x,y,ang,i,a)=>…,{speed:1})` частицы по пути · `dline` · `arrow(g,x0,y0,x1,y1,{p,dash,lw})` · `chev`.
**Предметы**: `cup(g,x,y,s,{steam:t,ghost,sleeve,mark,body,lid,shadow:false})` стакан, (x,y) середина дна, высота 400·s · `bean(g,x,y,r,rot)` · `store` `scooter(…,{t})` `sprout` `ship` `depot` `(g,x,y,s)` центр, ≈110 px при s=1 · `receipt(g,t,x,y,w,{t0,head,rows:[{l,r,t,hi}],total:{l,draw(g,xr,yb)}})`. Свой предмет рисуй плоскими фигурами в палитре.
**Листание**: `deck(g,t,PAGES)`→{i,lt,t0,t1,ov}; страница `{t0, draw(g,t,lt), tr, from:[x,y,w,h] экранный прямоугольник нажатого, focus:[[t,z,fx,fy]…], settle, push, ovTitle}` · `thumb(key,w,h,fn)`.

## Рецепт сильного ролика
1. Хук: в первые 0,3 с крупное название или число (`@0.02`) и сквозной предмет.
2. Фраза = страница с одним действием в момент ключевого слова: курсор нажал → пересортировка, пересчёт, выноска `tip`, провал `drill`.
3. Чередуй: линия, рейтинг `hbars`, чек/карточка, иконки + `stack`, цепочка (`card`+`arrow`+`badge`), `sankey`+`kpi`, финальные карточки с `check`.
4. В фразе дольше 4 с второй поворот: фокус-зум, `popup`, пересортировка.
5. Заголовок 2–4 слова (вывод, не повтор озвучки); числа совпадают с речью.
6. Финал 2 с: итоговые карточки с галочками, статус сменился, плашка до конца.

## Звук
`click` нажатие · `toggle_on` переключатель, статус · `marimba_run`/`kalimba_run` листание (сильнее всего, на склейках) · `pop_soft`/`pop_high` карточки · `notify` выноска · `counter`/`odometer` бегущие числа · `type` чек · `tally` отметки · `success`/`success3` итог. Громкость 0.1–0.16, 25–35 событий, точно в моменты событий.

Нельзя: `Math.random`, `Date`, `ctx.filter`, `letterSpacing`, `shadowBlur` (тень: `card({shadow})`), эмодзи, пиксельные циклы.
