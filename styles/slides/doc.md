# Стиль «Деловые слайды»: живой отчёт, который листает аналитик

`SLIDES` уже подключена: `const S = SLIDES, P = S.P;`. Свою не объявляй, `k.text/k.card/k.emoji` не используй.

## Правила стиля
1. **Палитра интерфейса**: белый лист `P.page`, текст `P.ink`/`P.ink2`/`P.mute`, акцент бирюза `P.teal` (ключ, главный столбик, итог), прочие данные `P.tealL`/`P.tealM`, подложки `P.tealP`, тёмная плашка `P.slate`. Без градиентов, свечения, эмодзи. **Иллюстрации** (люди, дома, транспорт, природа) в своих плоских цветах; **цвет, названный в тексте, обязателен**: `col:'розовый'`, `'жёлтый'`, `'синий'`, `'рыжий'`… (`S.col` приглушает под лист).
2. **Сцена = страница отчёта**: метка раздела капсом + заголовок-вывод 100–110 px в 1–2 строки (ключ бирюзой) + ОДИН главный блок + тёмная плашка внизу. Поля 64 px, данные в y 440…1510. Главный блок ставь от `y`, который вернул `head` (+30), иначе двухстрочный заголовок налезет.
3. **Сюжет виден**: если в озвучке люди, животные, предметы, места, их рисуют типовыми объектами в карточке-иллюстрации `pic` (рыбаки, продавщица, дети, рабочие, бабушка с внуками, танцующие), число или факт идёт рядом (`kpi`, `tip`, `chip`). Значок, слово или пустая карточка вместо предмета не годятся.
4. **Событие в момент слова**: моменты из `k.subs` (слова ≈ равномерно по фразе); предмет появляется на своём слове, действие (гаснет, едет, машет) идёт, пока о нём говорят. Пустая заготовка видна не дольше 0,5 с, заголовок из одного служебного слова не висит.
5. **Данные живые**: числа бегут (`odo`), столбики растут, рейтинг пересортировывается. Курсор, переключатели и ползунки только там, где в теме есть выбор или сравнение, не по привычке.
6. **Набор**: гротеск 800 для заголовков и чисел; число крупно, единица мелко. Капс с разрядкой только для меток. Моно только для чека. Без длинного тире.
7. **Движение**: появление 0,3 с (текст вверх, карточки `pop`), уход быстрее; каскад ≤ 0,5 с; линейного хода нет (`eo`, `eio`, `sp`); люди и транспорт двигаются через `t`.
8. **Склейка = листание** на ключевом слове: `push`, `up`, `drill`, `cut`, `fade`, не больше одного `overview` (по желанию). Камера сама оседает.
9. **Надписи только по теме**: бренд, статус-бирка, источник, иконка в HUD и шапке чека задаются тобой из темы или опускаются; не переноси подписи из примера. Сквозной предмет (если нужен) берётся из самой темы, он не обязателен.
10. **≤ 3 текстовых блоков**: заголовок, подписи данных, плашка (2–6 слов в такт речи).

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
  S.hud(g, t, { page: d.i + 1, total: PAGES.length, t0: d.t0, t1: d.t1, brand: 'Тема · отчёт', status: [[0, 'ФАКТ'], [31.7, 'ПЛАН', 1]], a: 1 - d.ov }); // brand/status/src/icon по теме или без них
  S.pill(g, t, PILLS);
}
```

## API
Рисующие функции первым берут `g`; пиксели кадра 1080×1920, секунды.

**Время**: `pr(t,a,b)`→0…1 · `lerp` · `cl` · `eo` `eo5` `eio` `ei` · `eb(p)` перелёт · `sp(p)` пружина · `spring(t,t0,dur)` · `count(t,t0,t1,a,b)` · `kf([[t,v]…],t)` · `kfv([[t,a,b]…],t)`→[a,b] · `stag(t,t0,i,step,dur)` · `cuts(t,[0,3.6…])`→{i,lt,t0,t1,p} · `rnd(seed)`.
**Цвет, числа**: `rgba(c,a)` · `mix(c1,c2,p)` · `fmt(v,dec)`→«1 234,5» · `font(size,wt,fam)` · `fit(g,s,maxW,size)`.
**Текст**: спец-строка `"слово@1.2 *ключ@1.6 1,3_млн | перенос"` (`*` ключ, `@` момент, `_` неразрывный пробел).
`text(g,s,x,y,size,{col,al,wt,max,a,fam})` y середина, →ширина · `spaced(g,s,x,y,size,{col,al,tr,a})` · `words(g,t,spec,x,y,{size,lines,max,al,col,kcol,hl:'under'|'box',out})` y верх, →{w,h,bottom}, сам ужимает · `head(g,t,{t0,label,title,size,lines})`→y низа · `odo(g,v,x,y,size,{dec,step,unit,pre,al,col,a})` бегущие цифры, y базовая линия · `num(g,'36,9',x,y,size,{unit:'%'})`.
**Появление**: `appear(g,t,t0,(g,p)=>{…},{kind,x,y,dist,dur,out})`, kind `up` `down` `left` `right` `pop` `stamp` `grow` `fade` `wipe` (x,y центр для pop/stamp/grow).
**Интерфейс**: `card(g,x,y,w,h,{fill,line,r,shadow})` · `chip(g,s,x,y,{size,fill,col,line,al,caps:false,icon})`→{x,y,w,h} · `badge(g,n,x,y,r)` · `seg(g,x,y,w,h,labels,sel)` sel дробный · `slider(g,x,y,w,f,{a,b,ticks})`→x ручки · `toggle(g,x,y,on)` · `button(g,s,x,y,{al,fill,hover,press})`→[x,y,w,h] · `tip(g,s,x,y,{dir:'down',light,size})` выноска к точке · `check(g,x,y,r,p)` · `kpi(g,x,y,w,h,{label,v,dec,step,unit,pre,size,note,dark,pale,va,icon})` · `popup(g,t,t0,x,y,w,h,(g,e)=>…,{out,from:'bottom'})` панель-обоснование · `dim(g,a)` · `cursor(g,t,[[t,x,y,'click'|'down'|'up']…])`→{x,y,press} · `pill(g,t,[[t0,t1,spec]…])` (до первого слова не видна) · `hud(g,t,{page,total,t0,t1,brand,icon(g,x,y),status,src,a})` · `bg(g,t,{mark,lt})` · `dots` · `hatch(g,x,y,w,h)` прогноз.
**Графики**: `gridY(g,x,y,w,h,{min,max,step,dec,p})` · `axisX(g,xs,y,labels,{a})` · `line(g,pts,p,{fill,base,lw,dots,hi})`→кончик {x,y} · `vbars(g,t,x,y,w,h,vals,{t0,hi,hiK,fmt})` · `hbars(g,t,x,y,w,rowH,[{l,a,b,hi}],{t0,sw,maxA,maxB,fa,fb,hiK,barW})` sw 0→1 пересортировка · `sankey(g,t,{x0,y0,h,x1,items:[{l,v,hi}],p,hiK,size})` · `donut(g,x,y,r,lw,f)` · `stack(g,x,y,w,h,[{v,col,l}],p)` · `timeline(g,x,y,w,labels,{p,on})`→xs · `flow(g,dist,pts,n,(g,x,y,ang,i,a)=>…,{speed:1})` частицы по пути · `dline` · `arrow(g,x0,y0,x1,y1,{p,dash,lw})` · `chev`.
**Предметы примера** (кофейня, только если подходят теме): `cup` стакан · `bean` · `store(…,{mark})` `scooter(…,{t,mark})` `sprout` `ship` (грузовое судно) `depot` `(g,x,y,s)` центр ≈110 px · `receipt(g,t,x,y,w,{t0,head,icon,rows:[{l,r,t,hi}],total:{l,draw(g,xr,yb)|r}})`.
**Скорость**: сложный неподвижный предмет рисуй один раз: `g.drawImage(S.sprite('ключ',w,h,x=>{…}),X,Y)`.
**Листание**: `deck(g,t,PAGES)`→{i,lt,t0,t1,ov}; страница `{t0, draw(g,t,lt), tr, from:[x,y,w,h] экранный прямоугольник нажатого, focus:[[t,z,fx,fy]…], settle, push, ovTitle}` · `thumb(key,w,h,fn)`.

## Типовые объекты (цвет любой: имя или #hex)
(x,y) низ по центру, s масштаб, `t` время для анимации, `dir` 1 вправо / -1 влево. Иллюстрацию клади в `pic(g,x,y,w,h,g=>{…},{fill})` (карточка с обрезкой, `fill` небо/фон).
- **Люди**: `person(g,x,y,s,{age:'adult'|'child'|'old', pose, t, phase, dir, coat, pants, skin:0…3, hair, hairStyle:'short'|'long'|'bun'|'bald', dress, hat:'helmet'|'cap'|'beret'|'scarf', hatCol, bag, item(g,x,y,H), book, chair, seat, glasses, shout})`→{top,hand}. Рост 300·s (ребёнок 190, пожилой 280). `pose`: `stand` `walk` `run` `wave` `sit` `hold` `read` `dance` `cheer`. Группа: `people(g,[{x,y,s,…}],t)` (сортирует по глубине; соседям давай разный `phase` и цвета, белая обводка их разделяет).
- **Транспорт**: `car(g,x,y,s,{col,t,lights})` 230 px · `bus(g,x,y,s,{col,num,t})` 440 px, номер на табло и борту · `bike(g,x,y,s,{col,rider:{…person},t})` с крутящим педали седоком · `boat(g,x,y,s,{col,trim,cab,motor,wake:0…1,crew:[{dx,…person}],t})` лодка с мотором на ватерлинии y.
- **Животные**: `dog`/`cat(g,x,y,s,{col,pose:'stand'|'walk'|'sit'|'sleep',zzz,t,dir})` ≈190 px · `bird(g,x,y,s,{t,col})` · `birds(g,cx,cy,r,t,{n,s,col})` кружат.
- **Здания**: `building(g,x,y,w,h,{col,floors,cols,lit:0…1,off:0…1 гаснут по одному,grow:0…1 растёт по этажам})` · `house(g,x,y,w,h,{col,roof,lit})` · `shop(g,x,y,w,h,{kind:'shop'|'cafe'|'school',sign:'текст',awn,signCol,lit})`.
- **Природа**: `tree(g,x,y,s,{kind:'leaf'|'oak'|'pine'|'bush',col,t})` · `grass(g,x,y,w,{t,col})` · `leaves(g,x,y,w,t,{n,cols,fall,h})` кленовые листья · `sea(g,x,y,w,h,t,{col})` · `hill(g,x,y,w,h,{col})`.
- **Небо**: `sun(g,x,y,r,{col,rays,t})` · `moon(g,x,y,r,{bg})` · `stars(g,x,y,w,h,t,{n,on:0…1})` · `cloud(g,x,y,s,{col})`.
- **Улица**: `lamp(g,x,y,s,{on:0…1})` · `garland(g,x0,y0,x1,y1,t,{n,on,cols})` · `board(g,x,y,w,h,{title,lines:['строка',['Уха','350 ₽']],n:строк написано,dark,legs})` доска мелом (x,y верх-лево).

## Рецепт сильного ролика
1. Хук: в первые 0,3 с крупное название или число (`@0.02`) и картинка темы.
2. Фраза = страница с одним действием в момент ключевого слова: курсор нажал → пересортировка, пересчёт, выноска `tip`, провал `drill`.
3. Чередуй: иллюстрация `pic` с людьми и предметами + число, линия, рейтинг `hbars`, чек/доска, `stack`, цепочка (`card`+`arrow`+`badge`), `sankey`+`kpi`, финальные карточки с `check`.
4. В фразе дольше 4 с второй поворот: фокус-зум, `popup`, пересортировка.
5. Заголовок 2–4 слова (вывод, не повтор озвучки); числа совпадают с речью.
6. Финал 2 с: итог по теме (карточки с галочками или общая картинка), плашка до конца.

## Звук
`click` нажатие · `toggle_on` переключатель, статус · `marimba_run`/`kalimba_run` листание (сильнее всего, на склейках) · `pop_soft`/`pop_high` карточки · `notify` выноска · `counter`/`odometer` бегущие числа · `type` чек · `tally` отметки · `success`/`success3` итог. Громкость 0.1–0.16, 25–35 событий, точно в моменты событий.

Нельзя: `Math.random`, `Date`, `ctx.filter`, `letterSpacing`, `shadowBlur` (тень: `card({shadow})`), эмодзи, пиксельные циклы.
