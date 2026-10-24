# Стиль «Риограф»: ризография на бумаге

Библиотека уже подключена: глобальная `R` доступна в `draw(t, k)`. Своё `R` не объявляй. Рисуй через `R` и обычный canvas.

## Правила
1. **Палитра** `R.P`: 4–5 плоских красок. Основа: `paper`, `navy`/`ink` (контуры, тёмные фоны), `orange`, `pink`; акценты: `yellow`, `teal`, `red`, `aqua`, `lyel`. Можно добавить одну свою плоскую краску. Без градиентов, soft-light и размытых теней.
2. **Фактура**: последним вызовом `R.paper(g, sc.i)` (зерно, виньетка, на склейке новый лист). На тёмных фонах растр. Заливка съезжает с контура, контур дрожит (это делает `R.shape`).
3. **Шрифты**: ключевые слова набраны `R.big` капсом с обводкой и экструзией, лирика набрана `R.lyric` курсивом, служебное `R.mono`. До 3 текстовых блоков на кадр.
4. **Коллаж**: в центре один крупный герой или предмет, над ним огромное слово, вокруг 1–3 бирки, штамп или терминал, много воздуха.
5. **Движение**: резкая склейка на фразе или ключевом слове, после неё камера оседает (`R.cam`). Всё появляется по словам через `R.pop`. Фон движется непрерывно, герой «на двойках».
6. **Раскладка**: HUD занимает y < 260 и y > 1570. Сцены рисуй в `R.ZONE` (y 270…1560, x 60…1020).

## Каркас
```js
const P = R.P, CUTS = [0, 4.4, 6.6, 8.6 /* фразы + ключевые слова */];
const CAPS = ['обед · болит *голова → мало *воды' /* по фразе */];
const SC = [[(g, lt) => R.bgFlat(g), (g, lt) => { /* сцена */ }] /* … */];
function draw(t, k) {
  const g = R.begin(t, k), sc = R.cuts(t, CUTS), [bg, fg] = SC[sc.i];
  g.save(); bg(g, sc.lt); R.cam(g, sc.lt, g => fg(g, sc.lt), { drift: sc.p }); g.restore();
  R.hudCounter(g, {...}); R.hudClock(g, {...}); R.hudCaption(g, CAPS); R.paper(g, sc.i);
}
```
`rot` везде в градусах, `lt` означает секунды от склейки.

## API
**Кадр**: `begin(t,k)`→g · `cuts(t, list?)`→{i, lt, d, p} · `cam(g, since, fn, {drift})` · `shake(g, lt, t0, dur, amp)` · `paper(g, sheet)`.
**Время**: `pr(t,a,b)` · `lerp` · `cl` · `eo`/`eio`/`eb` (с перелётом) · `kf([[t,v]…], t)` · `twos(t)` · `rnd(seed)` · `hash` · `num(v,d)`→"1,25" · `hms(ms)`, `ymd(ms)`.
**Точки**: `ell(cx,cy,rx,ry,n,f?)` · `box` · `rbox(x,y,w,h,r)` · `poly(pts)` · `line(x0,y0,x1,y1)` · `star(cx,cy,r1,r0,n)` · `blob(cx,cy,r,seed)`.
**Кисти**: `shape(g, pts, {fill, stroke(ink|null), lw, mis, seed, open})` · `trace(g, pts, p, col, lw)` (линия рисуется на долю p) · `check(g,x,y,s,p)` · `sparks(g,lt,[[x,y,r]…],col)` · `spark` · `heart(g,x,y,r,col)` · `ring` · `arrow(g,x0,y0,x1,y1,{fill})` · `halftone(g,a)` · `dots()`, `hatch()` (узоры).
**Фоны**: `bgFlat(g,col,растр)` · `bgRays(g,cx,cy,n,bg,col,rot)` · `bgGrid(g)` · `bgRings(g,cx,cy,lt,{col})` · `bgStripes(g,{bg,col,angle,lt,speed})` · `speedLines(g,lt)` · `galaxy(g,cx,cy,lt,k)` · `confetti(g,lt,n,seed,{edge})`.
**Текст**: `text(g,s,x,y,size,{kind:'I'|'D'|'S'|'M', col, al, max, stroke})` · `big(g,s,x,y,size,{fill,stroke,ext,extV,it,max,al})` · `lyric(g,lt,t0,s,x,y,size,{al,col,halo})` · `mono` · `typed(s,lt,t0,cps)` · `banner(g,lt,t0,s,y,{bg})` (лента въезжает слева).
**Появление**: `pop(g, lt, t0, x, y, g=>{…}, {from, dur, end})` (шлепок вокруг x,y).
**Элементы**: `sticker(g,x,y,w,h,{rot,col,bar,tape}, (g,w,h)=>{…})` (ярлык со своими координатами) · `tag(g,x,y,title,sub,{center,rot,col})` (бирка) · `rubber(g,s,x,y,{rot,col,size})` (штамп) · `terminal(g,x,y,w,lines,lt,t0)` (строки с '>' печатаются) · `say(g,x,y,s,{tx,ty,col})` (реплика) · `bubble` · `rise(g,lt,t0,s,x,y)` (всплывающее уведомление) · `meter(g,x,y,w,h,f,col)` · `axes(g,ox,oy,w,h,p,{x,y,xt})` · `plot(g,pts,p,{dots})`.
**HUD**: `hudCounter(g,{label,value,unit,status,statusCol,frac,side,pulse})` (слева вверху) · `hudClock(g,{label,col,ms,blink})` (штамп справа) · `hudCaption(g, CAPS)` (плашка на каждую фразу: `*ключ` подчёркивается, `слово:.4` темнеет на 40 % фразы).
**Герой**: `hero(g,x,y,s,o)`: (x,y) это центр тела, при s=1 он ≈400×500, ступни на `y + heroFeet(shape)*s`. Параметры o: `shape` drop|bean|round|blob|cloud|star|square|heart · `color` · `fill` 0…1 (тело-сосуд с жидкостью) · `mood` calm|happy|sad|tired|wow|scared|sleep|angry|love · `arms` rest|up|wave|droop|point|none · `run: R.twos(t)*15` · `jump` 0…1 · `look` −1…1 · `talk` 0…1 · `rot` · `top` leaf|antenna|crown|bow · `legs:false`.

## Рецепт сильного ролика
1. **Один сквозной герой** через все сцены, придуманный под тему. Его состояние (mood, fill, прыжок) меняется по сюжету через `kf`.
2. **Счётчик со смыслом**: прогресс темы (литры, шаги, %, дни) набегает в момент события на экране, статус переключается, на итоге `pulse`.
3. **Штамп с сюжетом**: метка и время меняются с историей («● ПОТОМ» → «● СЕЙЧАС», «ДЕНЬ 1» → «ДЕНЬ 7», время мчится).
4. **Склейка на ключевом слове** внутри длинной фразы (добавь момент в CUTS) со сменой фона.
5. **Плашка**: 4–7 слов на фразу, 1–2 ключевых. Это конспект, а не дословный текст.
6. **Свои метафоры**: предмет-образ на каждую фразу из `shape`. Чередуй фоны: бумага, тёмный с растром, миллиметровка, лучи, мишень, полосы. Финал: лучи + `galaxy` + `confetti`.
7. **Ритм**: на каждое слово-событие `pop` или `trace` через 0,3–0,8 с.

Нельзя: `document`, сеть, `Math.random` (используй `R.rnd`), `shadowBlur`, soft-light, зеркальный drawImage на весь кадр, пиксельные циклы. До ~300 фигур на кадр.
