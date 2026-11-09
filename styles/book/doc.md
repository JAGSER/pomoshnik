# Стиль «Детская книжка» (BOOK)

Книжка с картинками: тёплая бумага, акварель с рваным краем, тонкая тушь, буквы пишутся пером. `BOOK` уже подключена; рисуй через неё и обычный canvas.

## Правила
1. **Палитра** `BOOK.P`: бумага `paper`, тушь `ink`/`navy`, вода `water` `waterD` `waterL`, трава `grass` `leaf`, солнце `sun` `orange`, акценты `coral` `pink` `teal` `lav`. Чередуй бумажные страницы и цветные миры `sky(g,'day'|'warm'|'dawn'|'dusk'|'night'|'cold'|'storm'|'rain')`.
2. **Фактура**: `paper(g)` - страница с зерном и виньеткой; цветные небеса гладкие. Заливки - `wash`/`band` (пятно света, тёмная кайма), линии - `ink` (сужение на концах). Последний вызов кадра `end(g)`.
3. **Текст**: ключевое слово пишется пером `write`/`title` (кегль ≥120), конспект фразы - книжный курсив `story` (52–64 px, слова по очереди, `*ключ` цветом и мазком), финал - разрядка `caps`. До 3 текстовых блоков, без «-».
4. **Композиция**: герой и 1–3 предмета крупно, много воздуха, холмы диагональю. Значок `journey` и номер страницы `pageNo` - только если подходят теме (путь, цикл, книжка-сказка), не обязательно.
5. **Движение** физичное: пружины, сжатие-растяжение, отскоки (`bounce`, `hop`), линии прорисовываются (`p`), новое - через `pop`/`write`. Фон дышит: волны, облака, звёзды, птицы.
6. **Склейки** на ключевых словах: новая фраза - `turn` (перелистывание), внутри фразы `cut` (камера оседает), `bloom` (акварельное пятно), `pan`. Камера живёт: `cam`, `layer`.
7. **Сквозной герой** - из самой темы (человек, зверь, предмет из озвучки) и только если он уместен. Капелька/облако `hero` - только для тем про воду, погоду, превращения; в других темах её нет.
8. **Счётчики** по смыслу: `journey` (этапы, круги; значки `icons` из темы), `thermo`, `tape`, `pageNo`.
9. **Озвучка = кадр**. Кто и что названо во фразе, то нарисовано в этот момент: люди (рыбаки, продавцы, дети, бабушка…) - `person` нужного возраста и одежды, а не зверь, значок или слово; предмет - рисунком, а не подписью или пустой карточкой; число - столько штук (семь лодок, два велосипедиста), пятиэтажка - 5 этажей. Если видно «люди танцуют» - они двигаются (`pose:'dance'`).
10. **Цвет из текста** соблюдай точно параметром `col`/`top`/`wall`…: розовое солнце, оранжевые куртки, синий автобус, жёлтый кран, рыжий пёс (оттенок палитры, если близко).
11. **Синхрон**: событие начинается в `when(sub,'слово') - .1` и длится, пока о нём речь (автобус въезжает на «проезжает», огни гаснут по одному на «гаснут», доска уже исписана на «написано»); не раньше и не на 3 с позже.
12. **Надписи** только из этой темы и озвучки: цены с ₽, имена, названия. Никаких слов из примера, английских слов, пустых клочков без текста.

## Каркас
```js
const P = BOOK.P; let WT = null, SC = null;
const sA = (g, lt, s) => { BOOK.paper(g); /* мир */ BOOK.screen(g, g => { /* надписи */ }); };
function draw(t, k) {
  const g = BOOK.begin(t, k);
  if (!WT) { WT = { sea: BOOK.when(k.subs[0], 'море') - .1 }; SC = [
    { at: 0, draw: sA },
    { at: WT.sea, tr: 'bloom', x: 540, y: 1200, draw: sB },          // склейка на слове
    { at: 4.1, tr: 'turn', cam: [[0, [540, 960, 1]], [3, [900, 960, 1]]], draw: sC } ]; }
  const s = BOOK.play(g, t, SC);                      // сцены, переходы, камера
  BOOK.end(g);
}
```
Сцена получает `lt` (сек от начала) и `s` = {i, lt, dur, p, t, in, out}; слова сверяй с абсолютным `s.t`. Мир сцены - в координатах камеры, `paper`/`sky` на весь кадр. В переходе уходящая страница застывает (`s.out`; при `pan` не рисуй в ней героя). Углы в градусах.

## API
**Время**: `pr(t,a,b)` · `lerp` · `cl` · `eo` `ei` `eio` `eb`(перелёт) · `spring(сек,f,d)` · `kf([[t,v|[..]],…],t)` · `hash` · `noise(x,seed)` · `rnd(seed)`→fn · `when(sub,'слово')`→сек. **Цвет**: `mix(a,b,p)` · `rgba(c,a)` · `shade(c,±k)`.
**Кадр**: `begin(t,k)`→g · `end(g)` · `play(g,t,SC)` · сцена {at, draw, tr:'turn'|'bloom'|'pan'|'rise'|'cut', d, x, y, cam:[[lt,[x,y,z]],…], push, bump} · `screen(g,fn)` (экранные координаты) · `layer(g,f,fn)` (параллакс 0…1) · `view()`→{x0,x1,y0,y1} · `cam()` · `shake(g,lt,t0,amp,dur)`.
**Фон**: `paper(g,{y1})` (y1 - только верх, если низ закрыт) · `sky(g,kind|[цвета],{y0,y1})` (с y0/y1 небо в мире при подъёме камеры) · `band(g,y0,y1,col)` (полоса акварели: небо, долина).
**Кисти**: `ink(g,pts,{w,col,p,taper})` · `outline` · `wash(g,pts,col,{rim,light,a})` · `swash(g,x,yc,w,h,col,p)` · `underline(g,x0,x1,y,p)` · `hatch(g,x,y,r)` · `arrow(g,pts,p)` · `ring(g,x,y,r,p,{n,w,col})` (круг со стрелками).
**Точки** (плоский массив x,y,…): `blob(cx,cy,rx,ry,seed,amp)` · `rough(pts,amp)` · `spline(pts,n)` · `arcPts(cx,cy,r,a0,a1,n)` · `follow(pts,f)`→{x,y,a рад} · `cut` · `plen` · `path(g,pts,closed,smooth)`.
**Пейзаж** (мир): `sea(g,y0,{amp,cols})` + `waveY(x,y0,amp)` · `ground(g,x=>y,{col,p})` (холм с тушью и травинками) · `hill(g,x=>y,col,{y1})` · `mountains(g,x0,x1,yBase,{h,col})` · `fields(g,x0,x1,y0,y1)` · `river(g,pts,w|f=>w,{col,n,banks})` · `tree(g,x,y,s,{kind:'round'|'pine'|'lolly'|'oak'|'bush',col})` · `flower(g,x,y,s,{kind:'daisy'|'tulip',bloom,droop,fill})` · `leaf(g,x,y,s,{rot,col,kind:'maple'})` · `tuft` · `pebble` · `bird(g,x,y,s,{seed})`.
**Небо**: `sun(g,x,y,r,{col,ray,face})` · `moon` · `stars(g,{n,x0,x1,y0,y1})` · `sparkle(g,x,y,r,col)` · `cloud(g,x,y,s,{tint:white|grey|warm|night|cold|dark,seed})` (x,y - низ) · `rain(g,{n,ang,col,w})`, `snow(g)` (в `screen`) · `droplet(g,x,y,r,угол,col)` · `steam(g,x,y,{n,h})`.
**Эффекты**: `pop(g,lt,t0,x,y,fn,{from,out})` · `speed(g,x,y,угол)` · `dashes(g,x,y,q)` (q 0…1 после касания) · `splash(g,x,y,сек)` · `confetti(g,lt)` · `splat(g,x,y,r,{p})` · `shadow(g,x,y,w,h,a)`.
**Капелька** `hero(g,x,y,s,o)` (только темы про воду/погоду): (x,y) - низ, s=1 ≈ 190×270; `shape` drop|ball|puff|cloud, `to`+`m`, `mood` happy|calm|joy|wow|hot|cold|sad|sleep|wink, `look` `lookY` `sq` `rot` `arms` `run` `col` `a` `shadow`. `bounce(сек,h)`→{y,sq,hit} · `hop(lt,t0,t1,h)`→{p,y,sq} · `face(g,x,y,R,{mood})` - лицо солнцу, облаку.
**Текст**: `write(g,lt,t0,'слово',x,y,size,{al,col,swash,max,bob,shiver,out})` - пишется пером за 0,25–0,45 с, y - базовая линия · `title(…)` (+ росчерк) · `hand(g,s,x,y,size,{p})`→{x0,x1,tip} · `handW` · `story(g,lt,'конспект *ключ',x,y,size,{at:[моменты слов], al, max, col, kcol, kbg, out})` · `caps(g,s,x,y,size,{p})` · `note` · `scrap(g,x,y,w,h)` (клочок бумаги под подпись на цветном фоне).
**HUD**: `journey(g,x,y,r,f,{icons,loops,lt,runner:'drop'})` (f - доля круга, >1 - новые круги; без `icons` - просто круг-прогресс) · `pageNo(g,n,lt,{col})` · `thermo(g,x,y,h,f)` · `tape(g,x,y0,y1,v,{px,step,every,fmt,unit})` · `icon(g,name,x,y,s)`: wave vapor cloud rain sun drop flower leaf river star heart tree mountain snow house.

## Рецепт сильного ролика
1. **Хук**: в первом кадре крупно главное из темы в движении, к 1 с дописано главное слово.
2. **На фразу**: 1 слово пером + 2–4 курсивом в момент слова; склейка на ключевом слове, на новой фразе `turn`; каждые 3–5 с новая композиция (крупно → общий план).
3. **Ритм**: каждые 0,4–0,8 с событие: дописалось слово, кто-то помахал, зажёгся фонарь, проехала машина.
4. **Финал** (2 с): `title` + `caps` + живая деталь (`confetti`, звёзды, взмах); кадр стоит, но живёт.

**Звуки**: появление `pop_soft` `bubble` `marimba` `kalimba`; касание `drop`; перелистывание `kalimba_run`; волшебство `magic` `sparkle`; итог `success` `ta_da`. Громкость 0.08–0.18, ~1 звук в 1–1,5 с: `BOOK.sfx(s,[[t,'имя',громк,pitch],…])`.

**Скорость**: готовые надписи в `screen` кэшируются; `at` у turn/bloom/pan ставь кратным 0,5 с (страница запомнится без перерисовки); большие градиенты, обводки внутри `clip`, лишние слои на весь кадр дороги. Нельзя: `document`, `Math.random`, `Date`, `ctx.filter`, `shadowBlur`, эмодзи.


## Типовые объекты (цвет каждого - параметром)
Все в мировых координатах, возвращают точки привязки. Не меняй w/h/s зданий покадрово (спрайт кэшируется по размеру), двигай их через x/y или камеру.
- **Человек** `person(g,x,y,s,o)` → `J {head{x,y,r}, hands, hold, top, feet}`. (x,y) - земля между стопами; s=1 → взрослый 300 px (ребёнок 0,66, пожилой 0,95). `o.age` adult|child|old · `pose` stand|walk|run|wave|up|hold|read|point|sit|dance|ride · `lt` время (шаг, танец, взмах) · `run` фаза шага · `dir` ±1 · `top` (куртка/кофта) `bottom` (брюки/юбка) `dress:true` `skin` light|tan|brown|dark|'#hex' `hair` `hairStyle` short|long|bun|curly|bald · `female` · `hat` cap|helmet|kerchief|hat|hood + `hatCol` · `bag:'backpack'`+`bagCol` · `apron` · `stripes` (светоотражающие полосы) · `glasses` · `beard` · `cane` · `mood` (как у `face`) · `handsAt`/`feetAt` [[x,y],[x,y]] - куда тянуть руки/ноги. Идущего двигай по x вместе с `lt`. Рядом стоящих разводи на ≥0,45·300·s и давай разные цвета одежды.
- **Звери** `animal(g,x,y,s,{kind:'dog'|'cat'|'gull'|'bird', pose, col, col2, collar, dir, lt})`: dog/cat - stand|walk|sit|sleep (спит с «z»), s=1 → длина 230 px; gull/bird - fly (x,y центр) | sit. Сказочные звери-человечки - `critter` (ниже).
- **Здания** `building(g,x,y,w,h,o)`: (x,y) - середина низа, w×h - стены. `kind` house|tower (многоэтажка)|shop|cafe|school|library · `floors` `cols` (окна) · `wall` `roof` `awning` `doorCol` · `sign` текст вывески + `signCol` `signTxt` · `lit` 0…1 доля горящих окон (зажигаются/гаснут по одному) или (i,n)=>0…1 · `night` (тёмные стены и окна) · `build` 0…1 (стройка: видна нижняя часть, контур пунктиром). → {top, roof, door, wins, floors, fh}.
- **Транспорт** `vehicle(g,x,y,s,{kind:'car'|'bus'|'truck', col, col2, num (номер маршрута), people:[цвета волос в окнах], dir, roll})` - (x,y) земля под серединой, колёса крутятся от x. `bike(g,x,y,s,{col, rider:{опции person}|false, dir})`. `boat(g,x,y,s,{kind:'boat'|'motor'|'sail', col, col2, motor, wake 0…1, crew:[опции person], dir})` - (x,y) на ватерлинии, команда стоит в лодке. `crane(g,x,y,h,{col, jib, trolley 0…1, rope, load:(g,hx,hy)=>…, dir})` → {hook, cab}.
- **Природа**: `tree` (round, pine, oak - дуб, bush) · `leaf` (maple - кленовый) · `ground`/`hill` (трава) · `sea` · `sun({col})` · `moon` · `stars` · `cloud`.
- **Улица**: `lamp(g,x,y,s,{on 0…1,col})` · `garland(g,x0,y0,x1,y1,{n,sag,cols,on 0…1})` (лампочки зажигаются слева направо) · `board(g,x,y,w,h,'текст\nстрока',{kind:'chalk'|'sign'|'paper', p 0…1 - дописано, col, tcol, size})`.

## Персонажи-звери и проверки кадра
**Звери-человечки** (сказочные герои): `critter(g,x,y,s,o)`, (x,y) - земля, s=1 → 300 px. `kind` hedgehog|bunny|bear|cat|fox|mouse|child · `pose` stand|walk|wave|up|hold|sit · `lt` `mood` `look` `dir` `col` `hair` `sq` `a`. Возвращает `J` как у `person`. Людей (рыбаков, продавцов, бабушку, рабочих) рисуй `person`, а не зверями.
**Кадр**: персонаж целиком в кадре (по x от 0,35·300·s до 1080 − 0,35·300·s, стопы выше 1640), `J.top` ниже текста. Текст внутри x 60…1020, не налезает на людей и не обрезан. `scrap` только под готовой подписью и её ширины. Ничего важного не обрезано краем.
