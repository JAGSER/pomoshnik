# Стиль «Пиксель-арт 16 бит» (библиотека `PIXEL`)
Библиотека подключена: глобальная `PIXEL`. Пиши `const X = PIXEL`, своё `PIXEL` не объявляй. Рисуй только через `X` и обычный canvas.

## Правила
1. **Сетка**: кадр = 180×320 пикселей мира (1 пиксель = 6×6 px). Все координаты и размеры в пикселях мира, целые. SAFE: x 10…170, y 19…281. Земля-стена `X.GY` = 236.
2. **Палитра** `X.P`: ночь полосами с дизерингом (`X.SKY`: night dull dawn day dusk storm magic warm), луна, камень `st0…st4`, огонь `f0…f3`, магия `cyan ice violet`, `gold red green`, контур `ink`. Полупрозрачности и размытия нет: прозрачность = дизеринг (`dith`, `glow`).
3. **Спрайты** с тёмным контуром 1 px, свет сверху-слева; анимация по кадрам (бег 12 к/с, ожидание 2,5 к/с), всё стоит на сетке.
4. **Текст** только пиксельным шрифтом библиотеки, капсом: s=1 подписи (48 px), s=2 заголовки (96 px), s=3 слово-удар. До 3 текстовых блоков вместе с HUD. Без «—».
5. **Композиция**: стена внизу (y 236), герой на ней, текст вверху (y 50…120) или по стене внизу (y 245…280). Луну и предметы не ставь под текст. Камера: `z` 1 / 1.167 / 1.333 / 1.5 / 1.667 / 2, якорь на земле `fy: GY`.
6. **HUD игры** `X.hud` — сквозной счётчик: уровень, опыт, сердца, день. Значения ведёт сюжет (`kf`, `hold`, `since`).
7. **Склейки** на ключевых словах: `mosaic` (мозаика SNES), `slam` (толчок и тряска, под `stamp`), `flash`, `cut`, `iris` (в финал). После склейки камера оседает сама.
8. **Движение**: появление 6–12 кадров ease-out, интерфейс с перелётом (`banner`, `button`), уход быстрее (`out`). Фон живёт: звёзды мерцают, холмы в параллаксе (`scroll`), искры.

## Каркас
```js
const X = PIXEL, P = X.P, GY = X.GY;
const CUTS = [0, 2.2, 4.4 /* начала фраз + ключевые слова */], TR = ['', 'flash', 'mosaic'];
const SC = [{
  w(w, lt, t) { X.backdrop(w, t, { sky: 'night', mx: 140, my: 150 }); X.hero(w, 84, GY, { pose: 'idle', t, fire: 1 }); },
  u(g, lt, t) { X.title(g, lt, 0.05, 'НОВАЯ *ПРИВЫЧКА?', 90, 60, { out: 2.0 }); },
  cam: (lt) => ({ z: 2, fx: 84, fy: GY }),
} /* … по сцене на каждый отрезок CUTS */];
function draw(t, k) { X.run(t, k, { cuts: CUTS, tr: TR, scenes: SC, irisAt: [90, 206], hud: (g, t) => X.hud(g, { t, lv: 1, xp: 0.3, hp: 3, day: 4, show: 1 }) }); }
function sound(s) { s.play(2.2, 'magic', 0.16); }
```
`w` рисует мир (к нему применяются зум, мозаика, ирис), `u` рисует интерфейс поверх без зума. `lt` — секунды от начала сцены, `t` — от начала ролика. Камера: `{z, fx, fy, dx, dy, shake}`.

## API (`c` — контекст `w` или `g`, единицы одинаковые)
**Время**: `pr(t,a,b)` `lerp` `cl` `eo` `ei` `eio` `eb`(с перелётом) `spring(lt,f,d)` 0→1 с колебанием `decay` · `kf([[t,v]…],t)` плавно · `hold(keys,t)` ступенькой · `since([t…],t)` секунды после последнего события · `fr(t,fps,n)` номер кадра · `blink(t,hz)` · `hash(n)` `rnd(seed)`.
**Кадр**: `run(t,k,{cuts,tr,scenes,hud,irisAt})`; вручную: `begin(t,k)`→w, `show({z,fx,fy,dx,dy,shake,mosaic,iris,flash})`→g, `cuts(t,list)`→{i,lt,t0,t1,p}.
**Примитивы**: `rect(c,x,y,w,h,col)` `px` `line` `disc(c,cx,cy,r,col)` `ring` `dith(c,x,y,w,h,col,0…16)` `ddisc` `glow(c,x,y,r,col,0…1)` `clip(c,[[x,y,w,h]…],fn)`.
**Фон**: `backdrop(c,t,{sky,mx,my,mr,moon:false,sun:[x,y],scroll,gaps:[[x,w]],castle:false,hills:false,wall:false,mid:fn})` — небо, звёзды, луна, холмы с замком, стена (gaps — провалы, mid — слой перед стеной). По частям: `sky(c,pal)` `stars(c,t,{n,y1})` `moon(c,x,y,{r})` `sun(c,x,y,t)` `cloud(c,x,y,{w,col,col2})` `hills(c,t,{y,h,col,trees,scroll})` `castle(c,x,y,t)` `wall(c,y,{scroll,gaps})`.
**Герой** `hero(c,x,y,{pose,t,dir,fire,eyes,white,aura,shadow})`: рыцарь-огонёк ≈28×34, x — центр, y — земля под ногами. pose: idle run walk jump fall hurt cheer power press sad · fire 0…3 — пламя-мотивация на шлеме (0 — дымок) · eyes: h радость, o удивление, x боль, s грусть, g сияние · dir −1 — влево · white — вспышка · aura — огненная аура.
**Предметы**: `chest(c,x,y,open)` · `orb(c,x,y,t,{sc})` кристалл опыта · `block(c,x,y,{label,gold,bump,t})` блок-день 16×16 · `flag(c,x,y,t,{h,up,col,dk,mark})` · `hourglass(c,x,y,p,t)` · `torch(c,x,y,t)` · `bubble(c,x,y,w,h,{tx,ty,think})` · `icon(c,name,x,y,{sc,flip})` по центру: heart heart0 star cup cake mug gift gem coin check cross warn hand bolt book.
**Эффекты**: `flame(c,x,y,h,t,{lean})` `smoke` `burst(c,lt,x,y,{n,sp,g,cols,seed})` `sparkle(c,x,y,ph)` `twinkles(c,t,x,y,w,h,{n})` `magic(c,t,x,y,r,{n})` вихрь `shock(c,lt,x,y,{r,col})` волна `beam(c,x,y0,y1,t)` луч `rays(c,x,y,t,{r,n,col,lvl})` `aura` `bolt(c,x0,y0,x1,y1,seed,{col})` `rain(c,t,{n})` `fireflies` `dust(c,lt,x,y)` `speed(c,t,{y,h})`.
**Текст** (`*слово` — ключевое с бликом, `_` — неразрывный пробел, `|` — перенос; y — верх строки): `text(c,s,x,y,{s,col,al:'c'|'r',n})`→ширина · `tw(s,scale)` · `words(c,lt,t0,str,x,y,{s,al,col,kc,gap,at,out,max})` по словам с печатью · `title(…)` = words s=2, буквы падают, по центру · `stamp(c,lt,t0,str,x,cy,{s,box,col,out})` впечатывание · `banner(c,lt,t0,str,y,{out})` лента · `popup(c,lt,t0,str,x,y)` «+1» · `dialog(c,lt,t0,str,x,y,w)` окно RPG · `num(c,v,x,y,{pad,roll,s,al})` одометр (дробное v крутит цифры). Цвета: w y c r g o v k d.
**Интерфейс**: `panel(c,x,y,w,h,{bg})` · `bar(c,x,y,w,h,f,{seg,col,flash})` · `button(c,x,y,w,h,label,{down})` · `cell(c,x,y,w,h,{label,state:1|-1|0,a,t})` клетка серии · `hud(g,{t,lv,xp,hp,max,day,show,lvT,xpT,hpT,danger,dayCol})` занимает y 18…48.

## Рецепт сильного ролика
1. Хук в первую секунду: `title` s=2 и крупный герой (z=2).
2. Один сквозной герой: `fire` растёт с прогрессом, поза по смыслу (cheer — успех, fall/hurt — неудача, power — кульминация).
3. HUD рассказывает историю: опыт копится, день крутится одометром, уровень мигает при росте (`lvT`), сердце разбивается при ошибке (`hpT`).
4. На фразу 1–2 сцены по 1,5–2,5 с, склейка на ключевом слове, план меняется: общий (z 1–1.167, бег со `scroll`), средний (1.333–1.667), крупный (2).
5. Удар = `stamp` + `slam`/`shake` + `burst`/`shock` + звук в тот же момент.
6. Настроение небом: dull → night → storm (неудача) → warm (награда) → magic (сила); смена дня и ночи = прошло время.
7. Финал 2 с: титульный экран — лого s=3, `button('▶ СТАРТ')` с нажатием, герой на фоне луны, итоговая фраза.

## Звук
Игровые короткие звуки: pop_high/pop_soft (слова, предметы), wood/woodblock/kalimba с pitch 1→1.26 (серия ударов), marimba_run/kalimba_run (мозаика), magic (вспышка, сила), success/success3/fanfare_soft/ta_da (успех, уровень), error_soft/bubble_down (провал), counter/odometer (счётчики), click/toggle_on (кнопки, HUD). Громкость 0.1–0.2, 25–32 события.

Нельзя: `Math.random`, `ctx.filter`, системные шрифты, размытие и полупрозрачность (только дизеринг), эмодзи, дробный зум надолго.
