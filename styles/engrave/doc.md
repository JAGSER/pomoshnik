# Стиль «Гравюра»: старинная книга с гравюрными таблицами

Подключена глобальная `ENGRAVE` (пиши `const E = ENGRAVE, P = E.P;`). Рисуй через `E` и обычный canvas.

## Правила
1. **Страница**: кадр начинается с `E.paper(g)` (пергамент), заканчивается `E.chrome` (рамка, колонтитулы, «Табл. IV»). Сцена = таблица.
2. **Палитра** `P`: `ink` штрих, `red` (штамп, ключ, зачёркивание), `navy` (курсивные заголовки), `gold` (корона, табличка). Акварелью (`tint`) красится только главный предмет темы, остальное сепия.
3. **Гравюра, а не заливка**: предметы через `E.engrave` или готовые `E.column/ship/globe…`. Без градиентов, размытых теней, свечения.
4. **Шрифт** антиква: `title` курсив navy 100–170 px, огромные числа `display` 250–380 px, бирки `caps` капителью, машинопись `typed` в тёмной интерлюдии, внизу всегда `caption` (*ключ* красным).
5. **Композиция**: заголовок y 380–620, один крупный герой y 800–1450, 1–2 бирки или штамп. Заняты: картуш года y 150–280, плашка y 1550–1640.
6. **Движение**: гравюра проявляется (`rv` 0→1 за 0,5–0,8 с), карточки въезжают пружиной, слова встают по одному, штамп бьёт за 0,14 с. Камера оседает после склейки, слои с глубиной (`layer`), удар трясёт (`hits`).
7. **Склейки** на ключевом слове, каждые 3–5 с: `hatch` штриховая шторка (по умолчанию), `cut` резко (тёмная интерлюдия и выход из неё), `slide` перелистывание.
8. **Сквозные приёмы**: год в картуше крутится барабаном, красный штамп со смыслом, зачёркнутое слово с `†` и новое с короной, карточки-паспарту, финальная эмблема (сияние + венок).

## Каркас
```js
const E = ENGRAVE, P = E.P;
const CUTS = [0, 4.4, 6.2];                       // начала фраз + ключевые слова
const CAPS = ['слово@0.2 *ключ@1.1'];             // по фразе, @ = секунды от начала фразы
const YEARS = [[0, 1600, 'подпись'], [4.4, 1700, 'подпись', .8]];
const HERO = E.engrave({ w: 300, h: 400, layers: [/* см. ниже */] }), PYR = E.pyramid(); // спрайты только на верхнем уровне
const SC = [
  { hits: [2.3], draw(g, lt) { E.paper(g);
    E.layer(g, .4, g => E.put(g, PYR, 540, 1470, { a: .2 }));        // призрак-фон
    E.layer(g, .7, g => E.title(g, 'Заголовок', 90, 470, 124, lt, .1));
    E.layer(g, 1, g => { E.put(g, HERO, 540, 1100, { rv: E.eo(E.pr(lt, .3, 1)) }); E.stamp(g, 'итог', 800, 900, lt, 2.3); }); } },
  { tr: 'cut', dark: true, draw(g, lt) { E.dark(g); E.typed(g, '1847', 150, 1000, 250, lt, .1, { col: P.bone }); } }];
function draw(t, k) {
  const g = E.begin(t, k), sc = E.scenes(g, t, CUTS, SC), s = k.sub(t);
  E.year(g, t, YEARS, { a: E.ap(t, .9), dark: sc.dark });
  E.caption(g, t, CAPS);
  E.chrome(g, t, { tl: 'Название', tr: 'Табл. ' + E.roman(s.i + 1), bl: 'Атлас', br: E.clock(t) });
}
```
`lt` секунды от начала сцены, углы в градусах, позиции спрайтов округляются сами.

## API
**Время**: `pr(t,a,b)` · `lerp` · `cl` · `eo` `ei` `eio` `eb`(перелёт) · `spring(сек,f=1.8,z=.5)` 0→1 · `ap(lt,t0,d)` появление · `out(lt,t1,d)` уход · `kf([[t,v]…],t)` · `fall(lt,t0,y0,y1,{dur,bounce})`→`{y,hit,on}` · `rnd(seed)` · `roman` · `num` «1 000» · `clock(t)`.
**Кадр**: `begin(t,k)` · `scenes(g,t,CUTS,SC)`→`{i,lt,dark}`; сцена: `draw(g,lt)`, `dark`, `tr`, `td`, `settle` (34 px), `drift` (−7 px/с), `hits:[lt]` · `layer(g,глубина,fn)` · `zoom(g,z,cx,cy,fn)` · `paper` · `dark` · `chrome(g,t,{tl,tr,bl,br})`.
**Текст**: `title(g,s,x,y,size,lt,t0,{al,step,at,keyCol,halo,max,wrap,out})` слова по одному, `*ключ` · `words` (то же прямым) · `display(g,s,x,y,size,lt,t0,{al,fill:'hatch'|'solid',shadow,it})` гравированная надпись · `text(g,s,x,y,size,{it,col,al,max,halo,a})` · `caps(g,s,x,y,size,{al,col,a})`→ширина · `typed(g,s,x,y,size,lt,t0,{cps,at,col,cursorTill})` · `caption(g,t,CAPS)` · `odo(g,v,x,y,size,{digits,group})` барабан · `year(g,t,KEYS,{a,dark})` (до н. э. = отрицательный год, подпись свою).
**Пометки**: `stamp(g,s,x,y,lt,t0,{rot,size,sub})` · `strike(g,x0,x1,y,p)` · `dagger(g,x,y,s,p)` · `crown(g,x,y,s,p)` · `plus` · `rule(g,x,y,w,p)` · `label(g,s,x,y,lt,t0,{al,to:[x,y]})` · `plaque(g,s,x,y,lt,t0)` золото на тёмном · `card(g,cx,cy,w,h,lt,t0,{cap,sub},(g,cx,cy,w,h)=>…)` паспарту · `list(g,[…],x,y,size,lt,t0)` · `rays(g,cx,cy,r0,r1,n,{rot,a})` · `burst(g,lt,t0,x,y)` · `steam(g,lt,x,y)` · `pour(g,x0,y0,x1,y1,lt,p,{w})` · `route(g,pts,p)` пунктир · `rhumb(g,cx,cy,len)` · `shadow(g,x,y,rx,ry)` · `hatchFill(g,pts,{ang,per})`.
**Готовые гравюры** (на верхнем уровне): `column({w,h})` · `globe({r})` · `wreath({r})` · `ship()` (y = ватерлиния) · `waves({h})` + `drawWaves(g,s,x,y,сдвиг)` · `mountains({h,seed})` · `balance()` + `drawBalance(g,B,x,y,наклон,{left,right})` · `coin` · `compass` · `drape` (y = верх) · `pyramid` (y = основание) · `disc` · `jug` · `cup({liquid})`.
**Спрайты**: `put(g,s,x,y,{a,sc,sy,rot,rv,dir,ax,ay})` · `turn(s,угол)` · `flip(s)` · `crop(s,sx,sy,w,h)`. **Точки**: `ell(cx,cy,rx,ry,n,a0,a1)` · `rect` · `rr` · `spl(pts)` · `rotP` · `movP` · `sclP` · `blob` · `leaf`.

## Своя гравюра: `E.engrave({w, h, ax, ay, layers, draw})`
Слои по порядку (позже = ближе). Слой: `pts` контур · `shade` объём `flat|lin|cyl|sph|cone` · `d:[светлое,тёмное]` 0…1 · `light` откуда свет (−135) · `axis` ось формы (90) · `hatch` `lin` (угол `ang`) | `cyl` дуги вокруг оси | `mer` меридианы | `ring` вокруг `cx,cy` | `wave` (`amp`,`wl`) | `rad` (`n`) · `per` шаг 4–7 px · `cross:false` · `tint`+`ta` акварель · `fill:false` прозрачный (тени) · `line` контур. `draw(x,w,h)` дорисовывает детали тушью. Пример: `E.engrave({ w: 260, h: 420, layers: [{ pts: E.ell(130, 210, 100, 190), shade: 'sph', hatch: 'mer', tint: P.choc, ta: .5 }] })`. Спрайт до 700×700, лента до 1300×400.

## Рецепт сильного ролика
1. Мир-метафора: атлас из таблиц, у каждой фразы год, место или номер.
2. Хук за 0,5 с: огромное число `display` + курсивная строка.
3. Один сквозной предмет темы, только он в акварели; меняет форму по сюжету.
4. На каждое ключевое слово событие: штамп, зачёркивание с `dagger` и корона у нового слова, карточка, падение `fall`, счётчик, струя.
5. В середине тёмная интерлюдия (`dark`, `tr:'cut'`): цифры печатаются в такт словам + штамп; выход тоже `cut` с `hits:[0]`.
6. Финал 2 с: эмблема (`rays` + `wreath` + герой) и итоговое число `odo`; всё живёт.
7. Плашка 3–6 слов, конспект фразы; без длинного тире.

## Звук
`woodblock` штамп · `marimba_run`/`kalimba_run` новая таблица · `type` машинопись · `odometer` год и счётчик · `drop`/`wood` падение, карточка · `rim` зачёркивание · `sparkle` корона · `pop_soft` бирка · `success`/`fanfare_soft` финал. Громкость 0,1–0,2, раз в 1–1,5 с.

## Нельзя
`document`, сеть, `Math.random`, `Date`, `ctx.filter`, эмодзи, длинное тире. Гравюры не создавай внутри `draw` (запекаются один раз в первом кадре). Масштаб и поворот больших спрайтов дороги: двигай сдвигом.
