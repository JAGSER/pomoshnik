# Стиль «Плоская эволюция» (FLAT)

`FLAT` уже подключена, своё не объявляй; рисуй через `FLAT.*` и обычный canvas. Плоская векторная графика: простые формы с тёмным контуром, мягкие цвета, один предмет в центре **эволюционирует**, а мир летит сквозь эпохи: кремовая земля, небо, синь, ночь, космос.

## Правила
1. **Палитра** `FLAT.C`: прошлое `cream wood woodL woodD terra rust olive`, акцент `gold goldL goldD`, небо `sky blue deep navy night space`, служебные `ink` (контур) `inkN` (текст) `paper mist steel slate lcd red green`. Только плоские заливки, контур `ink` 4–6 px (у человечков нет), объём одной полосой `shade`. Без текстур, теней, размытия, свечения.
2. **Эпохи**: `sky(g, era)`, era 0…6 дробное (крем, рассвет, небо, синь, высота, ночь, космос). Слои: земля-пила + столбы (0–1), облака (1–4), горы-треугольники (2–3), звёзды (4+), край планеты (5–6). На смене эпохи слои уезжают (сдвиг `X`) и вспыхивает `whoosh`.
3. **Герой**: один крупный предмет 300–650 px в центре через весь ролик. Формы сменяются `morph` на ключевых словах (сплющился в щель, раскрылся пружиной) + `pulse` и `burst`. Внутри сцены живёт: вращение, каскад клавиш, `waves`, `kick` на событии.
4. **Текст**: заголовок слева вверху `title(…, 72, 262, {size: 96–150})`, по словам в такт фразе (`at`), одно ключевое `*слово` на золотой плашке. Подпись `words(…, 72, 1424, {size: 80–92})`. Не по центру, до 3 блоков, по-русски, коротко, без длинного тире.
5. **HUD**: слева вверху `hud` + `counter` (одометр), справа `timeline` (узлы = эпохи). Детали подписывай `tag` с выноской, факт ставь `stamp`. Цвет текста `tone(era).ink`.
6. **Движение**: всё пружиной (`pop`, `spring`, `track`) или ease-out, текст без перелёта. Появление 0,3 с, уход 0,2 с (`env`, `t1`). Три слоя: герой; реакции (волны, счётчики, бирки); фон (облака, звёзды, параллакс).
7. **Камера** `cam` только на слой мира: `settle` после склейки, медленный наезд, наезд на деталь (zoom 1.3–1.5), панорама ко второму предмету. Текст и HUD вне камеры.
8. **Склейка** = событие героя на ключевом слове + `whoosh` + звук `*_run`. Финал: космос, `planet`, кольцо `dotRing`, итоговая фраза; последние 2 с спокойные.

## Каркас
```js
const P = FLAT.C, E = FLAT.E, ERA = [10.9, 14.2], FORM_T = [10.9, 14.2], CUTS = [0, 4.8, 10.9, 14.2];
const FORMS = [(g, t) => FLAT.box(g, -150, -200, 300, 400, { r: 30, fill: P.wood, shade: P.woodD }) /* … */];
function draw(t, k) {
  const g = FLAT.begin(t, k), era = FLAT.steps(t, ERA, { dur: 0.9 }), tn = FLAT.tone(era), cu = FLAT.cuts(t, CUTS);
  const X = ERA.reduce((x, c) => x + 1500 * E.inOut(FLAT.prog(t, c, c + 0.9)), t * 36);
  FLAT.sky(g, era); FLAT.clouds(g, t, { off: X * 0.6 }); FLAT.ground(g, { y: 1650 + 460 * E.in(era), off: X });
  ERA.forEach((c) => FLAT.whoosh(g, t, c));
  g.save(); FLAT.cam(g, { zoom: FLAT.settle(cu.lt) * (1 + 0.008 * cu.lt) });
  let i = 0; while (i < FORM_T.length && t >= FORM_T[i]) i++;
  const lt = i ? t - FORM_T[i - 1] : t - 0.1, A = FORMS[i - 1], B = FORMS[i];
  FLAT.morph(g, lt < 1.6 ? lt : 9, 540, 1000, A && ((g) => A(g, t)), (g) => B(g, t), { mode: i ? 'flip' : 'pop' });
  FLAT.pulse(g, lt - 0.16, 540, 1000, { r0: 140, r1: 440, col: tn.line });
  g.restore();
  FLAT.title(g, t, 0.05, '*150 лет назад', 72, 262, { size: 150, col: tn.ink, at: [0.05, 0.3, 0.5], t1: 4.8 });
  FLAT.counter(g, 72, 196, 187, { digits: 3, size: 60, suffix: '0-е', col: tn.ink });
  FLAT.timeline(g, t, { at: [0].concat(ERA), x0: 430, x1: 1000, y: 196, col: tn.ink });
}
```
Холст 1080×1920, время в секундах, углы в радианах (у `person` в градусах), `lt`: секунды от события.

## API
**Время**: `clamp lerp prog(t,a,b)` · `E.out/out5/in/inOut/sine/back` · `spring(lt,f,z)` 0→1 с перелётом · `pop(t,t0)` · `env(t,t0,t1,din,dout)` · `kick(lt)` толчок → 0 · `wob(t,f,a)` · `seq(t,t0,i,gap,dur)` · `track(t,[[t,v]…],{f,z}|{dur})` число, '#цвет', массив, объект едут к ключам · `steps(t,[t1…])` плавная ступень · `cuts(t,list)`→{i,lt,p} · `rnd(seed)` `hash(n)` `mix(a,b,p)` `rgba(c,a)`.
**Кадр**: `begin(t,k)`→g · `cam(g,{zoom,fx,fy,dx,dy})` точка (fx,fy) уходит в (fx+dx,fy+dy) · `settle(lt)` · `shake(lt,amp)`→[dx,dy].
**Фон**: `sky(g,era)` · `tone(era)`→{ink,line,dark} · `ground(g,{y,off})` · `hills(g,{y,off,h,col,seed})` · `clouds(g,t,{off,alpha})` · `poles(g,{y,off,h})` · `stars(g,t,{alpha})` · `planet(g,{rise})` · `speed(g,t,{alpha,dir})` · `whoosh(g,t,tc)` · `motes(g,t)`.
**Формы** `{fill, stroke(null: без контура), lw, shade, side, sw}`: `box(g,x,y,w,h,{r})` (x,y левый верх) · `disc(g,x,y,r)` · `poly(g,pts,{r})` · `ring(g,x,y,r,{a0,a1,dash,alpha})` · `seg(g,x0,y0,x1,y1,{lw,col,dash})` · `curve(g,pts,{p})` · `rr` путь · `fs(g,fill,o)`.
**Предметы**: `screen(g,x,y,w,h,{col,draw})` · `keypad(g,cx,cy,cols,rows,kw,kh,gap,{col,p})` · `grill` · `lens(g,x,y,r)` · `dial(g,x,y,r,rot)` · `bell(g,x,y,r,{swing})` · `gauge(g,x,y,r,v)` · `ruler(g,x,y0,y1,{mark})` · `bubble(g,x,y,w,h,{tail})` · `cord(g,x0,y0,x1,y1,{sag,coils,p})` · `icon(g,name,x,y,s)`: monitor camera globe chat mail bell clock bolt star heart pin photo · `rocket(g,t,x,y,s,{fins,flame})` · `flame` · `person(g,x,y,s,{col,dir,lean,legF,legB,armF,armB,headset,bun,chair})`: (x,y) таз, конечность [угол, сгиб], 0 вниз, 90 вперёд.
**Акценты**: `pulse(g,lt,x,y,{r0,r1,col})` · `burst(g,lt,x,y,{r0,r1,col})` · `waves(g,t,x,y,{ang,spread,alpha})` · `dotRing(g,t,x,y,r,{p,src(i,n),inner})` · `sparkle` `puffs` `bits`.
**Текст**: `title/words(g,t,t0,'текст *ключ',x,y,{size,col,at,t1,align,maxW,hollow,dash})`: '~' неразрывный пробел, '|' перенос, сам ужимается под maxW 940; вернёт {x,y,w,h,size} · `label(g,s,x,y,{size,maxW})` · `hud(g,s,x,y)` · `counter(g,x,y,v,{digits,size,suffix,lead:false})` (дробное v крутит колёса, строка как есть) · `tag(g,t,t0,x,y,s,{to,align,center,t1})` · `stamp(g,t,t0,x,y,s,{r,t1})` · `timeline(g,t,{at,x0,x1,y,col})`.
**Переходы**: `morph(g,lt,x,y,drawA,drawB,{s,mode})` · `wipe(g,p,{cols})`.

## Рецепт сильного ролика
1. Придумай предмет-героя и 5–7 его форм по этапам темы; форма и эпоха меняются на ключевых словах.
2. Хук: в 0,05 с крупный заголовок с числом на плашке, к 0,4 с герой выпрыгивает (`morph` 'pop').
3. Каждые 3–5 с новая композиция: наезд на деталь, панорама к человечку или прибору, реквизит (`gauge`, `ruler`, `bubble`, иконки вылетают из героя), бирки к деталям.
4. Счётчик со смыслом крутится в момент события; `timeline` шагает на каждой эпохе.
5. До/после: пунктирный контур прежней формы (`setLineDash` + `box` с fill:null).
6. Финал: герой тает в пунктир, точки летят в `dotRing`, в центре `waves`, ключ `hollow`.

## Звук
`sound(s)`: 25–35 событий, громкость 0.1–0.18. Склейка: `marimba_run`, `kalimba_run`. Появление: `wood`, `drop`, `pop_soft`, `pop_high`. Плашка: `woodblock`. Механика: `abacus`, `tick`, `click`, `toggle_on`. Числа: `counter`, `odometer`. Сообщение: `notify`, `bubble`. Сжатие: `bubble_down`. Цвет: `sparkle`, `magic`. Финал: `success`.

Нельзя: `Math.random`, `Date`, `document`, `ctx.filter`, conic-градиенты, `letterSpacing`, `shadowBlur`, эмодзи.
