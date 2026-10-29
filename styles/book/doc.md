# Стиль «Детская книжка» (BOOK)

Книжка с картинками: тёплая бумага, акварель с рваным краем, тонкая тушь, буквы пишутся пером. `BOOK` уже подключена; рисуй через неё и обычный canvas.

## Правила
1. **Палитра** `BOOK.P`: бумага `paper`, тушь `ink`/`navy`, вода `water` `waterD` `waterL`, трава `grass` `leaf`, солнце `sun` `orange`, акценты `coral` `pink` `teal` `lav`. Чередуй бумажные страницы и цветные миры `sky(g,'day'|'warm'|'dawn'|'dusk'|'night'|'cold'|'storm'|'rain')`.
2. **Фактура**: `paper(g)` — страница с зерном и виньеткой; цветные небеса гладкие. Заливки — `wash`/`band` (пятно света, тёмная кайма), линии — `ink` (сужение на концах). Последний вызов кадра `end(g)`.
3. **Текст**: ключевое слово пишется пером `write`/`title` (кегль ≥120), конспект фразы — книжный курсив `story` (52–64 px, слова по очереди, `*ключ` цветом и мазком), финал — разрядка `caps`. До 3 текстовых блоков, без «—».
4. **Композиция**: один герой и 1–2 предмета, много воздуха, холмы диагональю. Угол x>840, y<300 — значок `journey`, низ y≈1650 — номер страницы.
5. **Движение** физичное: пружины, сжатие-растяжение, отскоки (`bounce`, `hop`), линии прорисовываются (`p`), новое — через `pop`/`write`. Фон дышит: волны, облака, звёзды, птицы.
6. **Склейки** на ключевых словах: новая фраза — `turn` (перелистывание), внутри фразы `cut` (камера оседает), `bloom` (акварельное пятно), `pan`. Камера живёт: `cam`, `layer`.
7. **Герой** `hero` один на весь ролик: меняет форму (`to`,`m`) и настроение по сюжету; у ног `dashes` и тень.
8. **Счётчик и метка**: `journey` (этапы и число кругов), `pageNo`; по смыслу `thermo`, `tape`.

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
  BOOK.journey(g, 928, 210, 62, f, { loops, lt });    // HUD
  const sb = k.sub(t); BOOK.pageNo(g, sb.i + 1, t - sb.t0);
  BOOK.end(g);
}
```
Сцена получает `lt` (сек от начала) и `s` = {i, lt, dur, p, t, in, out}; слова сверяй с абсолютным `s.t`. Мир сцены — в координатах камеры, `paper`/`sky` на весь кадр. В переходе уходящая страница застывает (`s.out`; при `pan` не рисуй в ней героя). Углы в градусах.

## API
**Время**: `pr(t,a,b)` · `lerp` · `cl` · `eo` `ei` `eio` `eb`(перелёт) · `spring(сек,f,d)` · `kf([[t,v|[..]],…],t)` · `hash` · `noise(x,seed)` · `rnd(seed)`→fn · `when(sub,'слово')`→сек. **Цвет**: `mix(a,b,p)` · `rgba(c,a)` · `shade(c,±k)`.
**Кадр**: `begin(t,k)`→g · `end(g)` · `play(g,t,SC)` · сцена {at, draw, tr:'turn'|'bloom'|'pan'|'rise'|'cut', d, x, y, cam:[[lt,[x,y,z]],…], push, bump} · `screen(g,fn)` (экранные координаты) · `layer(g,f,fn)` (параллакс 0…1) · `view()`→{x0,x1,y0,y1} · `cam()` · `shake(g,lt,t0,amp,dur)`.
**Фон**: `paper(g,{y1})` (y1 — только верх, если низ закрыт) · `sky(g,kind|[цвета],{y0,y1})` (с y0/y1 небо в мире при подъёме камеры) · `band(g,y0,y1,col)` (полоса акварели: небо, долина).
**Кисти**: `ink(g,pts,{w,col,p,taper})` · `outline` · `wash(g,pts,col,{rim,light,a})` · `swash(g,x,yc,w,h,col,p)` · `underline(g,x0,x1,y,p)` · `hatch(g,x,y,r)` · `arrow(g,pts,p)` · `ring(g,x,y,r,p,{n,w,col})` (круг со стрелками).
**Точки** (плоский массив x,y,…): `blob(cx,cy,rx,ry,seed,amp)` · `rough(pts,amp)` · `spline(pts,n)` · `arcPts(cx,cy,r,a0,a1,n)` · `follow(pts,f)`→{x,y,a рад} · `cut` · `plen` · `path(g,pts,closed,smooth)`.
**Пейзаж** (мир): `sea(g,y0,{amp,cols})` + `waveY(x,y0,amp)` · `ground(g,x=>y,{col,p})` (холм с тушью и травинками) · `hill(g,x=>y,col,{y1})` · `mountains(g,x0,x1,yBase,{h,col})` · `fields(g,x0,x1,y0,y1)` · `river(g,pts,w|f=>w,{col,n,banks})` · `tree(g,x,y,s,{kind:'round'|'pine'|'lolly',col})` · `flower(g,x,y,s,{kind:'daisy'|'tulip',bloom,droop,fill})` · `leaf(g,x,y,s,{rot})` · `tuft` · `pebble` · `bird(g,x,y,s,{seed})`.
**Небо**: `sun(g,x,y,r,{face})` · `moon` · `stars(g,{n,x0,x1,y0,y1})` · `sparkle(g,x,y,r,col)` · `cloud(g,x,y,s,{tint:white|grey|warm|night|cold|dark,seed})` (x,y — низ) · `rain(g,{n,ang,col,w})`, `snow(g)` (в `screen`) · `droplet(g,x,y,r,угол,col)` · `steam(g,x,y,{n,h})`.
**Эффекты**: `pop(g,lt,t0,x,y,fn,{from,out})` · `speed(g,x,y,угол)` · `dashes(g,x,y,q)` (q 0…1 после касания) · `splash(g,x,y,сек)` · `confetti(g,lt)` · `splat(g,x,y,r,{p})` · `shadow(g,x,y,w,h,a)`.
**Герой** `hero(g,x,y,s,o)`: (x,y) — низ тела, s=1 ≈ 190×270. o: `shape` drop|ball|puff|cloud · `to`+`m` 0…1 · `mood` happy|calm|joy|wow|hot|cold|sad|sleep|wink · `look`/`lookY` −1…1 · `sq` (+ сплющить, − вытянуть) · `rot` · `arms` up|wave|side|rest · `run` (фаза → ножки) · `tint` · `col` · `a` · `shadow` (y земли|false). `bounce(сек,h)`→{y,sq,hit} · `hop(lt,t0,t1,h)`→{p,y,sq} · `face(g,x,y,R,{mood})` — лицо солнцу, облаку.
**Текст**: `write(g,lt,t0,'слово',x,y,size,{al,col,swash,max,bob,shiver,out})` — пишется пером за 0,25–0,45 с, y — базовая линия · `title(…)` (+ росчерк) · `hand(g,s,x,y,size,{p})`→{x0,x1,tip} · `handW` · `story(g,lt,'конспект *ключ',x,y,size,{at:[моменты слов], al, max, col, kcol, kbg, out})` · `caps(g,s,x,y,size,{p})` · `note` · `scrap(g,x,y,w,h)` (клочок бумаги под подпись на цветном фоне).
**HUD**: `journey(g,x,y,r,f,{icons,loops,lt})` (f — доля круга, >1 — новые круги) · `pageNo(g,n,lt,{col})` · `thermo(g,x,y,h,f)` · `tape(g,x,y0,y1,v,{px,step,every,fmt,unit})` · `icon(g,name,x,y,s)`: wave vapor cloud rain sun drop flower leaf river star heart tree mountain snow house.

## Рецепт сильного ролика
1. **Хук**: в первом кадре крупный герой в движении, к 1 с дописано главное слово.
2. **Один мир-метафора** и путь героя через сцены; герой меняет форму, а не исчезает.
3. **На фразу**: 1 слово пером + 2–4 курсивом в момент `when(sub,'слово') - .1`.
4. **Склейка на ключевом слове**, на новой фразе `turn`. Каждые 3–5 с новая композиция: крупно → общий план → другой мир.
5. **Счётчик со смыслом** заполняется по сюжету, число кругов растёт на итоге; страница листается.
6. **Ритм**: каждые 0,4–0,8 с событие: дописалось слово, отскок, распустился цветок, вспыхнула звезда.
7. **Финал** (2 с): `title` + `caps` + герой `wink` + `confetti`/`splat`; кадр стоит, но живёт.

**Звуки**: появление `pop_soft` `bubble` `marimba` `kalimba`; касание героя `drop`; перелистывание `kalimba_run`; волшебство `magic` `sparkle`; итог `success` `ta_da`. Громкость 0.08–0.18, ~1 звук в 1–1,5 с: `BOOK.sfx(s,[[t,'имя',громк,pitch],…])`.

**Скорость**: готовые надписи в `screen` кэшируются; `at` у turn/bloom/pan ставь кратным 0,5 с (страница запомнится без перерисовки); большие градиенты, обводки внутри `clip`, лишние слои на весь кадр дороги. Нельзя: `document`, `Math.random`, `Date`, `ctx.filter`, `shadowBlur`, эмодзи.
