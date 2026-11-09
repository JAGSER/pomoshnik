# Стиль «Пиксель-арт 16 бит» (библиотека `PIXEL`)
Библиотека подключена: глобальная `PIXEL`. Пиши `const X = PIXEL`, своё `PIXEL` не объявляй. Рисуй только через `X` и обычный canvas.

## Правила
1. **Сетка**: кадр = 180×320 пикселей мира (1 пиксель = 6×6 px). Координаты и размеры в пикселях мира, целые. SAFE: x 10…170, y 19…281. `X.GY` = 236 - уровень земли по умолчанию.
2. **Палитра** `X.P` + небо полосами с дизерингом (`X.SKY`: night dull dawn day dusk storm magic warm). Полупрозрачности и размытия нет: прозрачность = дизеринг (`dith`, `glow`).
3. **Спрайты** с тёмным контуром 1 px, свет сверху-слева; анимация по кадрам (бег 12 к/с, ожидание 2,5 к/с), всё на сетке.
4. ## Типовые объекты (x - центр, y - земля под ногами; `col`/цвета: '#rrggbb' или имя `X.NC`: red pink orange yellow green blue navy sky violet white gray black brown ginger beige cream…; `dir:-1` - влево; `t` - анимация; `sc` - целый масштаб для крупного плана)
- **Люди** `person(c,x,y,{age:'adult'|'kid'|'old', pose:'stand'|'walk'|'run'|'wave'|'cheer'|'dance'|'shout'|'hold'|'read'|'sit', t, ph, shirt, pants, hair, skin, style:'short'|'long'|'bun'|'curly'|'none', hat:'helmet'|'cap'|'scarf'|'beanie', hatCol, bag (рюкзак), apron, dress, glasses, item:'peach'|'book'…, dir, sc})` → `{hx,hy,top}` (рука, макушка). Взрослый ≈30 px, ребёнок ≈22. `crowd(c,x0,x1,y,t,{n,poses,ages,seed,each:(i)=>({…})})` - разные люди в ряд, не сливаются (держи шаг ≥ 14 px).
- **Здания** `house(c,x,y,{w,h,wall,roof,door,glass,lit,seed})` · `tower(c,x,y,{fl,cols,wall,glass,lit,seed,build:0…1})` многоэтажка, `build` - стройка, вернёт `top` · `shop(c,x,y,{w,h,wall,aw,aw2,glass,sign,tables,lit})` · `cafe(…)` (shop + столик) · `school(c,x,y,{w,fl,wall,roof,sign,lit})` · `stall(c,x,y,{w,aw,aw2,goods:['fish','flat','peach'],mid:(c)=>X.person(…)})` прилавок (продавец в `mid`) · `table(c,x,y,{umbrella,item})` `bench(c,x,y,{w,col})` `shelf(c,x,y,w,h,{seed})` стеллаж книг (x,y - левый верх) · `skyline(c,y,t,{col,n,lit,seed})` город на горизонте. `lit` 0…1 - доля горящих окон (окна гаснут/зажигаются по одному при плавном изменении), `sign` - текст вывески только из темы.
- **Растения** `tree(c,x,y,{kind:'leaf'|'oak'|'pine'|'palm', h, col, trunk, t, seed})` · `bush(c,x,y,{w,col,flowers})` · `grass(c,x,y,w,{col,h,t})` (x - левый край) · `leaves(c,t,x,y,w,h,{n,cols,rest})` падающие листья.
- **Транспорт** `car(c,x,y,{col,dir,t,move})` 32 px · `bus(c,x,y,{col,col2,num:'№3',pax,dir,t,move})` 66 px · `bike(c,x,y,{t,col,shirt,hair,pants,hat,dir})` велосипедист · `boat(c,x,y,t,{col,col2,len,dir,cabin,crew:[{shirt:'orange',hat:'cap'}…],motor,move})` (y - линия воды).
- **Животные** `dog(c,x,y,{col,pose:'stand'|'walk'|'run'|'sit'|'sleep',t,dir,zzz})` · `cat(c,x,y,{col,pose:'sit'|'walk',t,dir})` · `bird(c,x,y,t,{col,dir,fly:false})` чайка/птица (x,y - центр).
- **Небо и природа** `sun(c,x,y,t,{r,col})` · `moon` `stars` `cloud` · `sea(c,y,t,{col,h,glint:[x,col]})` море от y вниз с волнами и дорожкой · `hills`.
- **Улица** `ground(c,y,{kind:'street'|'road'|'grass'|'sand'|'pave'|'floor'|'wall',col,scroll})` · `lamp(c,x,y,t,{on,h,light})` фонарь · `garland(c,x0,y0,x1,y1,t,{on:0…1 слева направо,n,cols,sag})` · `board(c,x,y,w,h,'СТРОКА|СТРОКА',{kind:'chalk'|'wood'|'plate',s,stand:gy,n})` доска (x,y - левый верх; `n` - сколько букв написано) · `crane(c,x,y,t,{h,arm,col,dir,at,hook:0…1,load})` → `{hx,hy}`.
- Своё - из примитивов `rect/disc/line/dith` или спрайтом `grid/grect/gart/bake` с `mat(col)` в том же языке (контур, 3 тона).

**Текст** только пиксельным шрифтом библиотеки, капсом: s=1 подписи, s=2 заголовки, s=3 слово-удар. До 3 текстовых блоков в кадре. Без «-». Знаки ₽ и № есть.
5. **Композиция**: земля внизу, герои на ней, текст вверху (y 30…120) или внизу (y 245…280). Солнце, луну и предметы не ставь под текст. Камера: `z` 1 / 1.167 / 1.333 / 1.5 / 1.667 / 2, якорь на земле `fy: GY`.
6. **Склейки** на ключевых словах: `cut`, `slam` (толчок и тряска, под `stamp`), `flash`, `mosaic` (не дольше 0,2 с, не на первом кадре), `iris` (в финал). Каждый кадр должен читаться: никаких секунд мозаики/пустоты.
7. **Движение**: появление 6–12 кадров ease-out, уход быстрее (`out`). Фон живёт: звёзды мерцают, волны, птицы, листья, дым.
8. **Всё по теме ролика.** Мир, герой, интерфейс берутся из озвучки. Рыцарь-огонёк `hero`, HUD игры `hud`, каменная стена `wall`, замок на холмах, сундук, кристаллы - элементы «игровой» темы (привычки, прогресс, сказка, игра); в других темах их нет (`backdrop(…, {castle:false, ground:'street'})` и т.п.). Сквозного героя выбирай из самой темы: человек, животное, предмет из озвучки.
9. **Озвучка = кадр.** Каждый предмет, человек, животное, место из фразы нарисован объектом (типовым или своим из примитивов), а не заменён словом, значком или пустой табличкой. Люди, о которых речь (рыбаки, продавец, дети, рабочие, бабушка, танцующие), видны целиком, с позой по действию (машут - `wave`, танцуют - `dance`, бегут - `run`, читает - `read`). Число из текста = столько объектов (7 лодок - 7 лодок) или число крупно рядом с ними.
10. **Цвет из текста соблюдай**: «розовое солнце» - `sun(…,{col:'pink'})`, «оранжевые куртки» - `shirt:'orange'`, «синий автобус», «жёлтый кран», «рыжий пёс» - параметр `col`. Цвет можно взять оттенком из `X.NC`, но не заменить другим.
11. **Событие в момент слова**: появление/действие начинается на слове (±0,2 с) по таймингу фразы (доля фразы ≈ доля символов), а не в начале фразы и не после неё. «Гасит огонь» - огонь гаснет на этом слове; «гаснут один за другим» - окна гаснут по одному (`lit` уменьшается).
12. **Надписи только по теме**: подписи - слова и числа из озвучки, без английских слов и чужих подписей. Длинные слова не режь печатью: заголовок целиком влезает в 160 px (s=2 ≈ 13 букв).

## Каркас
```js
const X = PIXEL, P = X.P, GY = X.GY;
const CUTS = [0, 2.2, 4.4 /* начала фраз + ключевые слова */], TR = ['', 'flash', 'mosaic'];
const SC = [{
  w(w, lt, t) { X.backdrop(w, t, { sky: 'day', moon: false, castle: false, ground: 'street' }); X.person(w, 84, GY, { pose: 'wave', t, shirt: 'orange' }); },
  u(g, lt, t) { X.title(g, lt, 0.05, 'ЗАГОЛОВОК *ИЗ_ТЕМЫ', 90, 60, { out: 2.0 }); },
  cam: (lt) => ({ z: 2, fx: 84, fy: GY }),
} /* … по сцене на каждый отрезок CUTS */];
function draw(t, k) { X.run(t, k, { cuts: CUTS, tr: TR, scenes: SC, irisAt: [90, 206] }); } // hud: только для игровой темы
function sound(s) { s.play(2.2, 'magic', 0.16); }
```
`w` рисует мир (к нему применяются зум, мозаика, ирис), `u` рисует интерфейс поверх без зума. `lt` - секунды от начала сцены, `t` - от начала ролика. Камера: `{z, fx, fy, dx, dy, shake}`.

## API (`c` - контекст `w` или `g`, единицы одинаковые)
**Время**: `pr(t,a,b)` `lerp` `cl` `eo` `ei` `eio` `eb`(с перелётом) `spring(lt,f,d)` 0→1 с колебанием `decay` · `kf([[t,v]…],t)` плавно · `hold(keys,t)` ступенькой · `since([t…],t)` секунды после последнего события · `fr(t,fps,n)` номер кадра · `blink(t,hz)` · `hash(n)` `rnd(seed)`.
**Кадр**: `run(t,k,{cuts,tr,scenes,hud,irisAt})`; вручную: `begin(t,k)`→w, `show({z,fx,fy,dx,dy,shake,mosaic,iris,flash})`→g, `cuts(t,list)`→{i,lt,t0,t1,p}.
**Примитивы**: `rect(c,x,y,w,h,col)` `px` `line` `disc(c,cx,cy,r,col)` `ring` `dith(c,x,y,w,h,col,0…16)` `ddisc` `glow(c,x,y,r,col,0…1)` `clip(c,[[x,y,w,h]…],fn)`.
**Фон**: `backdrop(c,t,{sky,mx,my,mr,moon:false,sun:[x,y],sunCol,scroll,castle:false,hills:false,ground:'street'|…,wall:false,gaps,mid:fn})` - небо, звёзды, луна, холмы (с замком, если не `castle:false`), земля (по умолчанию стена замка). По частям: `sky(c,pal)` `stars(c,t,{n,y1})` `moon(c,x,y,{r})` `sun(c,x,y,t,{r,col,rays})` `cloud(c,x,y,{w,col,col2})` `hills(c,t,{y,h,col,trees,scroll})` `castle` `wall(c,y,{scroll,gaps})`.
**Игровой герой** (только игровые темы) `hero(c,x,y,{pose,t,dir,fire,eyes,white,aura,shadow})`: рыцарь-огонёк ≈28×34, x - центр, y - земля под ногами. pose: idle run walk jump fall hurt cheer power press sad · fire 0…3 - пламя-мотивация на шлеме (0 - дымок) · eyes: h радость, o удивление, x боль, s грусть, g сияние · dir −1 - влево · white - вспышка · aura - огненная аура.
**Предметы**: `chest(c,x,y,open)` · `orb(c,x,y,t,{sc})` кристалл опыта · `block(c,x,y,{label,gold,bump,t})` блок-день 16×16 · `flag(c,x,y,t,{h,up,col,dk,mark})` · `hourglass(c,x,y,p,t)` · `torch(c,x,y,t)` · `bubble(c,x,y,w,h,{tx,ty,think})` · `icon(c,name,x,y,{sc,flip})` по центру: heart heart0 star cup cake mug gift gem coin check cross warn hand bolt book fish flat(камбала) peach apple bread note.
**Эффекты**: `flame(c,x,y,h,t,{lean})` `smoke` `burst(c,lt,x,y,{n,sp,g,cols,seed})` `sparkle(c,x,y,ph)` `twinkles(c,t,x,y,w,h,{n})` `magic(c,t,x,y,r,{n})` вихрь `shock(c,lt,x,y,{r,col})` волна `beam(c,x,y0,y1,t)` луч `rays(c,x,y,t,{r,n,col,lvl})` `aura` `bolt(c,x0,y0,x1,y1,seed,{col})` `rain(c,t,{n})` `fireflies` `dust(c,lt,x,y)` `speed(c,t,{y,h})`.
**Текст** (`*слово` - ключевое с бликом, `_` - неразрывный пробел, `|` - перенос; y - верх строки): `text(c,s,x,y,{s,col,al:'c'|'r',n})`→ширина · `tw(s,scale)` · `words(c,lt,t0,str,x,y,{s,al,col,kc,gap,at,out,max})` по словам с печатью · `title(…)` = words s=2, буквы падают, по центру · `stamp(c,lt,t0,str,x,cy,{s,box,col,out})` впечатывание · `banner(c,lt,t0,str,y,{out})` лента · `popup(c,lt,t0,str,x,y)` «+1» · `dialog(c,lt,t0,str,x,y,w)` окно RPG · `num(c,v,x,y,{pad,roll,s,al})` одометр (дробное v крутит цифры). Цвета: w y c r g o v k d.
**Интерфейс**: `panel(c,x,y,w,h,{bg})` · `bar(c,x,y,w,h,f,{seg,col,flash})` · `button(c,x,y,w,h,label,{down})` · `cell(c,x,y,w,h,{label,state:1|-1|0,a,t})` клетка серии · `hud(g,{t,lv,xp,hp,max,day,show,lvT,xpT,hpT,danger,dayCol,lvL,xpL,dayL})` y 18…48, подписи только из параметров (`lvL:'УР'`…).

## Рецепт сильного ролика
1. Хук в первую секунду: `title` s=2 и главный образ темы крупно (z=2), без мозаики на старте.
2. Сквозной герой из темы (город, человек, животное), его поза по смыслу; для игровой темы рыцарь `hero` с `fire` и HUD.
3. На фразу 1–3 сцены по 1,5–3 с, склейка на ключевом слове, план меняется: общий (z 1–1.167), средний (1.333–1.667), крупный (2).
4. Удар = `stamp` + `slam`/`shake` + `burst`/`shock` + звук в тот же момент.
5. Время суток небом: dawn → day → dusk → night; смена неба = прошло время.
6. Финал 2 с: главный образ темы, итоговая фраза, `iris` в конце.

## Звук
Игровые короткие звуки: pop_high/pop_soft (слова, предметы), wood/woodblock/kalimba с pitch 1→1.26 (серия ударов), marimba_run/kalimba_run (мозаика), magic (вспышка, сила), success/success3/fanfare_soft/ta_da (успех, уровень), error_soft/bubble_down (провал), counter/odometer (счётчики), click/toggle_on (кнопки, HUD). Громкость 0.1–0.2, 25–32 события.

Нельзя: `Math.random`, `ctx.filter`, системные шрифты, размытие и полупрозрачность (только дизеринг), эмодзи, дробный зум надолго.
