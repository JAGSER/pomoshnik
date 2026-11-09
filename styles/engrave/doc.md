# Стиль «Гравюра»: старинная книга с гравюрными таблицами

Подключена глобальная `ENGRAVE` (пиши `const E = ENGRAVE, P = E.P;`). Рисуй через `E` и обычный canvas. Страница - пергамент (`E.paper(g)`), каждая сцена - таблица-гравюра: штрих по форме, акварель поверх, антиква.

## Правила
1. **Палитра** `P`: `ink` штрих, `red` (штамп, ключ), `navy` (курсивные заголовки), `gold`; бумага `paper sheet mat`, ночь `night bone`. Цвета из текста: `orange yellow pink ginger`(рыжий) `sky`(голубой) `blueV`(синий) `greenV purple white grey brown red`. **Цвет, названный в тексте, обязателен**: розовое солнце `col: P.pink`, оранжевые куртки `top: P.orange`, синий автобус `col: P.blueV`, рыжий пёс `col: P.ginger`. Остальное сепия и мягкая акварель.
2. **Люди рисуются, если о них речь** (рыбаки, продавщица, дети, рабочие, бабушка с внуками, танцующие): `E.person`/`E.crowd`/`E.bike`, крупно (рост 260–420 px), с жестом из текста (машут, бегут, читают, танцуют). Не заменяй людей биркой, словом или значком.
3. **Каждый предмет из текста нарисован** типовым объектом или своей гравюрой (`E.engrave`); подпись-бирка только дополняет рисунок.
4. **Событие в момент слова**: предмет появляется, загорается, гаснет, взлетает на своём слове (время слова = доля фразы по длине текста), не раньше и не позже 0,3 с. Склейка на ключевом слове фразы, сцена 2,5–5 с.
5. **Надписи только по теме**: числа и слова из озвучки; ничего не выдумывай («24 часа», «2 этажей»). Без английского, без длинного тире.
6. **Шаблон по смыслу**: картуш года `year` - только если в теме есть годы/эпохи; колонтитулы `chrome` (название, номер таблицы) - по желанию, текст свой; штамп `stamp` - только на итог или оценку из текста; тёмная интерлюдия `dark` - для ночи, тайны, машинописного факта; финальная эмблема (`rays`+`wreath`) - для торжественного итога. Ламбрекен `drape`, колонны, корона - только если в теме театр, дворец, царь. Сквозной герой - из самой темы (человек, животное, место).
7. **Плашка внизу** `caption` - конспект фразы 3–6 слов, без обрывков и висящих запятых; на каждую фразу своя, слова к своим моментам.
8. **Гравюра, а не заливка**: без градиентов, размытых теней, свечения; свет - лучами `rays`. На тёмном фоне всё с `night: true` (белая гравюра).
9. **Композиция**: заголовок y 380–620 (курсив `title` 100–170 px или огромное число `display` 250–380 px), сцена y 700–1500, плашка y 1550–1640. Сцена заполнена: место + люди + 1–2 детали, а не один мелкий предмет посреди листа.

## Каркас
```js
const E = ENGRAVE, P = E.P;
const CUTS = [0, 4.4, 6.2];                        // начала сцен (с)
const CAPS = ['слово@0.2 *ключ@1.1'];              // плашка по фразам, @ = секунды от начала фразы
E.pre(g => { E.person(g, 0, 0, 340, { top: P.orange, hat: 'cap' }); });  // запечь объекты заранее (те же параметры)
const SC = [
  { hits: [2.3], draw(g, lt) { E.paper(g);
    E.layer(g, .4, g => E.sea(g, 1180, lt, { col: P.sky }));
    E.layer(g, .7, g => E.title(g, 'Утро в *порту', 90, 470, 124, lt, .1));
    E.layer(g, 1, g => { E.boat(g, 540, 1230, 460, { crew: [{ top: P.orange, hat: 'cap', pose: 'wave' }], motor: true, v: 1, lt }); }); } },
  { tr: 'cut', dark: true, draw(g, lt) { E.dark(g); E.stars(g, lt, { on: E.pr(lt, .2, 2) }); E.building(g, 540, 1450, 420, 620, { kind: 'tower', night: true, lit: 1 - E.pr(lt, .5, 3) }); } }];
function draw(t, k) {
  const g = E.begin(t, k), sc = E.scenes(g, t, CUTS, SC);
  E.caption(g, t, CAPS);
  E.chrome(g, t, { tl: 'Тема ролика' });          // по желанию
}
```
`lt` секунды от начала сцены, углы в градусах, позиции округляются сами. Сцена: `draw(g,lt)`, `dark`, `tr: 'hatch'|'cut'|'slide'`, `td`, `settle`, `drift`, `hits:[lt]` (удар трясёт). `E.layer(g, глубина 0…1, fn)` - параллакс.

## Типовые объекты
Рисуют сразу в `g`; `x` центр, `y` земля (ступни, колёса, низ стены, ватерлиния). Цвет любого - параметр. Гравюра каждого набора параметров запекается один раз; `night: true` - белая гравюра для тёмного фона.
- **Человек** `person(g,x,y,h,{age:'adult'|'child'|'old', pose:'stand'|'walk'|'run'|'wave'|'hold'|'point'|'shout'|'dance'|'sit'|'read', lt, ph, dir:±1, top, legs, skirt, skin, hair, shoes, hat:'helmet'|'cap'|'scarf', hatCol, bag (цвет рюкзака), glasses, long, bun, a, night, item:(g,x,y,h)=>{} })`→`{hand,hand2,head,top,hip}`. Ребёнок h≈0,65 взрослого. `item` - предмет в руке (книга, корзина, баян), рисуется в точке руки. `sit` - y = ступни, сиденье ставь `bench(g,x,y,w,{col})` под таз (`hip`).
- **Группа** `crowd(g,x0,x1,y,h,n,{pose,lt,rows:1|2,ages:['adult','child'],tops:[…],hat,hatCol,skirts,seed,night,each:i=>({…})})`: разные цвета, не сливаются.
- **Здания** `building(g,x,y,w,h,{kind:'house'|'tower'|'shop'|'cafe'|'school', col, roof, floors, cols, awning, sign:'текст', signCol, lit:0…1|(i,n)=>0…1, litCol, build:0…1, flagCol, lt, night, a})`. `lit` - горящие окна: уменьшай во времени, гаснут по одному; `build` - дом растёт снизу; `sign` - вывеска текстом из сценария.
- **Природа** `tree(g,x,y,h,{kind:'oak'|'leaf'|'pine'|'bush', col, trunk, night})` · `grass(g,x0,x1,y,{h,col,lt})` · `leaves(g,lt,{n,x0,x1,y0,y1,cols,kind:'maple'|'oval',s})` (падают) · `hill(g,cx,y,w,h,{col})` · `sea(g,y,lt,{h,col,speed,night})` море от y вниз.
- **Небо** `sun(g,x,y,r,{col,rays:0…1,lt})` (восход: двигай y снизу из-за моря) · `moon(g,x,y,r,{col,full})` · `stars(g,lt,{n,x0,x1,y0,y1,on:0…1|(i,n)=>…,col,s})` · `cloud(g,x,y,w,{col})` · `bird(g,x,y,s,{lt,dir,ph,col})` чайка.
- **Транспорт** (`roll` пройденный путь px крутит колёса, `dir` ±1): `car(g,x,y,w,{col})` · `bus(g,x,y,w,{col,num,people})` · `bike(g,x,y,h,{col рамы, lt, ...параметры person})` велосипедист · `boat(g,x,y,w,{col,stripe,cabin:цвет|false,motor,sail:цвет,crew:n|[{…person}],crewH,v:0…1,lt,dir})`.
- **Животные** `dog(g,x,y,s,{col,pose:'stand'|'walk'|'sit'|'sleep',dir,lt})` · `cat(g,x,y,s,{col,pose})`; s длина тела.
- **Улица** `lamp(g,x,y,h,{on:0…1,col})` фонарь · `garland(g,x0,y0,x1,y1,{n,sag,on:0…1|(i,n)=>…,cols,lt})` лампочки зажигаются слева направо · `board(g,cx,yВерх,w,h,{kind:'chalk'|'sign', lines:['строка',['Уха','350 ₽']], title, p:0…1|times:[сек на строку], lt, legs})` весь текст из параметров.
Чего нет (маяк, кран, рыба, баян): своя гравюра `E.engrave` тем же языком.

## API стиля
**Время**: `pr(t,a,b)` · `lerp` · `cl` · `eo ei eio eb` · `spring(сек,f,z)` · `ap(lt,t0,d)` появление · `out(lt,t1,d)` · `kf([[t,v]…],t)` · `fall(lt,t0,y0,y1)`→`{y,hit,on}` · `rnd(seed)` · `roman` · `num` · `clock(t)`.
**Текст**: `title(g,s,x,y,size,lt,t0,{al,step,at,keyCol,max,wrap,halo})` слова по одному, `*ключ` · `display(g,s,x,y,size,lt,t0,{al})` гравированное число · `text(g,s,x,y,size,{it,col,al,max})` · `caps` · `typed(g,s,x,y,size,lt,t0,{cps,at,col})` машинопись · `caption(g,t,CAPS)` · `odo(g,v,x,y,size,{digits,group})` барабан · `year(g,t,[[t,год,'подпись',дл]],{a,dark})`.
**Пометки**: `label(g,s,x,y,lt,t0,{al,to:[x,y]})` бирка · `stamp(g,s,x,y,lt,t0,{rot,size})` · `plaque` · `card(g,cx,cy,w,h,lt,t0,{cap,sub},inner)` паспарту · `strike` · `rule` · `rays(g,cx,cy,r0,r1,n,{rot,a,col})` · `burst` · `steam` · `pour` · `route` · `shadow` · `hatchFill`.
**Готовые гравюры** (создавай на верхнем уровне, рисуй `put`): `column globe wreath ship waves+drawWaves mountains balance+drawBalance coin compass drape pyramid disc jug cup`.
**Своя гравюра** `E.engrave({w,h,ax,ay,night,layers,draw})`, на верхнем уровне. Слой: `pts` контур (`ell rect rr spl blob leaf rotP movP`), `shade:'flat'|'lin'|'cyl'|'sph'|'cone'`, `d:[светлое,тёмное]`, `hatch:'lin'(ang)|'cyl'|'mer'|'ring'|'wave'|'rad'`, `per` 4–7, `tint`+`ta` акварель, `cross:false`, `fill:false`, `line`. `draw(x,w,h)` детали тушью. Пример маяка: `E.engrave({w:220,h:620,ay:1,layers:[{pts:[70,60,150,60,190,620,30,620],shade:'cyl',hatch:'lin',ang:90,tint:P.red,ta:.5}]})`. `put(g,s,x,y,{a,sc,rot,rv,dir})` (`rv` 0→1 проявление).

## Рецепт
1. Хук за 0,5 с: главное место или герой темы крупно + курсивный заголовок или огромное число из текста.
2. На фразу - живая сцена-таблица: место (море, улица, двор) + люди в действии + названные предметы в названных цветах, всё в свой момент.
3. Числа из текста - `display`/`odo` к моменту слова. Бирки `label` 0–2 на сцену.
4. Ночь и вечер - `dark` + `night: true` + огни (`lit`, `garland`, `lamp`, `stars`).
5. Финал 2 с: итоговый образ темы, всё живёт (волны, огни).

## Звук
`woodblock` штамп, удар · `marimba_run`/`kalimba_run` новая сцена · `type` машинопись · `odometer` счётчик · `drop`/`wood` падение · `pop_soft` бирка, лампочка · `sparkle` огонь, звезда · `success`/`fanfare_soft` финал. Громкость 0,1–0,2, раз в 1–1,5 с.

## Нельзя
`document`, сеть, `Math.random`, `Date`, `ctx.filter`, эмодзи, длинное тире. Свои гравюры не создавай внутри `draw`. Масштаб и поворот больших спрайтов дороги: двигай сдвигом.
