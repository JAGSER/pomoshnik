# Стиль «Плоская эволюция» (FLAT)

`FLAT` уже подключена, саму библиотеку заново не объявляй (свои функции для новых предметов писать можно и нужно); рисуй через `FLAT.*` и обычный canvas. Плоская векторная графика: простые формы с тёмным контуром, мягкие цвета, мир едет сквозь время суток или эпохи (кремовая земля, небо, синь, ночь, космос). Сцены собираются из готовых типовых объектов (люди, дома, транспорт, звери) и предметов темы.

## Правила
1. **Палитра** `FLAT.C`: `cream wood woodL woodD terra rust olive oliveD gold goldL goldD peach`, небо `sky blue deep navy night space`, служебные `ink` (контур) `inkN` (текст) `paper mist steel slate red green`. Плоские заливки, контур `ink` 4–6 px (у людей нет), объём одной полосой `shade`. Без текстур, теней, размытия, свечения.
2. **Цвет из текста закон.** Назван цвет (розовое солнце, оранжевые куртки, синий автобус, рыжий пёс), этот предмет именно такого цвета (`'#E8862E'` оранжевый, `'#F29CB0'` розовый, `'#D9822B'` рыжий, близко к палитре), и он крупно в кадре в момент слова.
3. **Люди и предметы рисуются, а не подписываются.** Если в фразе есть люди (жители, рыбаки, продавщица, дети, рабочие, бабушка, танцующие), на экране `human`/`crowd` нужного возраста, одежды и действия; каждый названный предмет и место рисуются (`Типовые объекты` или своя функция из примитивов). Слово, значок или пустая карточка вместо предмета запрещены. Названное число людей/предметов (семь лодок, два велосипедиста) показывай столько, сколько сказано.
4. **Синхрон**: предмет, человек, действие появляются в момент своего слова (± 0,2 с), а не на склейке фразы; число на счётчике доезжает к моменту, когда его произносят. Сцена держится, пока о ней говорят, и уходит, когда речь перешла к следующему.
5. **Эпохи/время суток**: `sky(g, era)`, era 0…6 дробное (крем, рассвет, небо, синь, высота, ночь, космос). Подбирай era по смыслу (утро 1, день 2–3, вечер 4, ночь 5); космос, `planet`, кольцо `dotRing` только если тема про полёт, будущее, космос. На смене сцены слои уезжают (сдвиг `X`), `whoosh` по желанию.
6. **Герой ролика** выбирается из темы: человек, животное, место или предмет из озвучки, и возвращается между сценами. Сквозной «эволюционирующий предмет» (`morph`) только если тема про развитие одной вещи. Никаких талисманов, значков и рамок, не связанных с темой.
7. **Текст**: заголовок `title(…, 72, 262, {size: 96–150})` по словам в такт (`at`), подпись `words(…, 72, 1424, {size: 80–92})`. Плашку `*ключ` ставь только на смысловое слово (существительное, число), никогда на предлог. Все надписи только из темы, по-русски, коротко, до 3 блоков, без длинного тире. Текст не налезает на героя: ставь сцену ниже 420 и выше 1380 или клади текст на `sign`/`tag`. Контраст: тёмный текст на светлом, `tone(era).ink` на небе.
8. **HUD** (`hud`, `counter`, `timeline`) только если в теме есть шкала: время суток, годы, этапы. Детали подписывай `tag`, факт `stamp`.
9. **Движение**: пружина (`pop`, `spring`, `track`) или ease-out, текст без перелёта. Появление 0,3 с, уход 0,2 с (`env`, `t1`). Три слоя: герой/сцена; реакции (волны, счётчики, бирки); фон (облака, звёзды, параллакс). Люди живые: идут, машут, бегут (`pose`, `t`).
10. **Камера** `cam` только на слой мира: `settle` после склейки, медленный наезд, наезд на деталь (1.3–1.5), панорама. Текст и HUD вне камеры. Ничего важного не режется краем кадра.
11. **Финал**: спокойные последние 2 с, итоговая фраза, картинка из самой темы (город гаснет, герой засыпает, предмет готов).

## Каркас
```js
const P = FLAT.C, E = FLAT.E, ERA = [14.5, 52.9, 78.5], CUTS = [0, 14.5, 23.7, 52.9];
function draw(t, k) {
  const g = FLAT.begin(t, k), era = 1 + FLAT.steps(t, ERA, { dur: 1.2 }), tn = FLAT.tone(era), cu = FLAT.cuts(t, CUTS);
  const X = CUTS.reduce((x, c) => x + 1100 * E.inOut(FLAT.prog(t, c, c + 0.9)), t * 30);
  FLAT.sky(g, era); FLAT.clouds(g, t, { off: X * 0.5 });
  g.save(); FLAT.cam(g, { zoom: FLAT.settle(cu.lt) * (1 + 0.008 * cu.lt) });
  FLAT.sea(g, t, 1560); FLAT.sun(g, 820, 620 - 200 * E.out(FLAT.prog(t, 15.5, 18)), 90, { col: '#F29CB0' }); // «розовое солнце» на слове
  if (t > 24.2) FLAT.boat(g, 300 + 120 * (t - 26), 1600, 0.8, { t, motor: true, run: FLAT.env(t, 26, 99) });
  FLAT.human(g, 300, 1520, { pose: 'wave', t, shirt: '#E8862E', helmet: P.goldL }); // рабочий в каске машет
  g.restore();
  FLAT.title(g, t, 14.5, '*Рассвет', 72, 262, { size: 140, col: tn.ink, t1: 23.5 });
}
```
Холст 1080×1920, время в секундах, углы в радианах (у `human`/`person` в градусах), `lt`: секунды от события.

## API
**Время**: `clamp lerp prog(t,a,b)` · `E.out/out5/in/inOut/sine/back` · `spring(lt,f,z)` 0→1 с перелётом · `pop(t,t0)` · `env(t,t0,t1,din,dout)` · `kick(lt)` толчок → 0 · `wob(t,f,a)` · `seq(t,t0,i,gap,dur)` · `track(t,[[t,v]…],{f,z}|{dur})` число, '#цвет', массив, объект едут к ключам · `steps(t,[t1…])` плавная ступень · `cuts(t,list)`→{i,lt,p} · `rnd(seed)` `hash(n)` `mix(a,b,p)` `rgba(c,a)`.
**Кадр**: `begin(t,k)`→g · `cam(g,{zoom,fx,fy,dx,dy})` точка (fx,fy) уходит в (fx+dx,fy+dy) · `settle(lt)` · `shake(lt,amp)`→[dx,dy].
**Фон**: `sky(g,era)` · `tone(era)`→{ink,line,dark} · `ground(g,{y,off})` · `hills(g,{y,off,h,col,seed})` · `clouds(g,t,{off,alpha})` · `poles(g,{y,off,h})` · `stars(g,t,{alpha})` · `planet(g,{rise})` · `speed(g,t,{alpha,dir})` · `whoosh(g,t,tc)` · `motes(g,t)`.
**Формы** `{fill, stroke:null, lw, shade, side, sw}`: `box(g,x,y,w,h,{r})` (x,y левый верх) · `disc(g,x,y,r)` · `poly(g,pts,{r})` · `ring(g,x,y,r,{a0,a1,dash,alpha})` · `seg(g,x0,y0,x1,y1,{lw,col,dash})` · `curve(g,pts,{p})` · `rr` путь · `fs(g,fill,o)`.
**Предметы**: `screen(g,x,y,w,h,{col,draw})` · `keypad(g,cx,cy,cols,rows,kw,kh,gap,{col,p})` · `grill` · `lens(g,x,y,r)` · `dial(g,x,y,r,rot)` · `bell(g,x,y,r,{swing})` · `gauge(g,x,y,r,v)` · `ruler(g,x,y0,y1,{mark})` · `bubble(g,x,y,w,h,{tail})` · `cord(g,x0,y0,x1,y1,{sag,coils,p})` · `icon(g,name,x,y,s)` monitor camera globe chat mail bell clock bolt star heart pin photo · `rocket` · `flame` · `person` (старая фигурка-силуэт; для людей бери `human`).
### Типовые объекты (x: центр, y: земля под объектом; цвет каждой части задаётся параметром)
- `human(g,x,y,{h,age:'adult'|'kid'|'old',pose,t,dir,skin,hair,hs,shirt,pants,dress,apron,scarf,helmet,cap,bag,glasses,mouth})` → `{hand,hand2,head,top}`. `pose`: stand walk run wave cheer point hold shout dance sit read ride; `hs`: short long bun bald scarf; `limbs:{armF:[угол,сгиб],…}` своя поза. Рост `h` 300 взрослый, ребёнок 0.65. Предмет в руку кладётся по `hand`.
- `crowd(g,x0,x1,y,n,{h,pose,t,kids,old,shirts,seed,opts(i)})` разные люди в ряд, не сливаются.
- Здания: `house(g,x,y,w,h,{wall,roof,door,lit})` · `block(g,x,y,cols,rows,{wall,win,lit,grow,cw,ch})` многоэтажка: `lit` 0…1 доля горящих окон (гаснут по одному), `grow` 0…1 стройка по этажам · `shop(g,x,y,w,h,{kind:'shop'|'cafe',sign,awning,awning2,wall})` · `school(g,x,y,w,h,{sign,flag,wall,roof})` (и библиотека, и ратуша) · `win(g,x,y,w,h,lit)`.
- `sign(g,x,y,w,h,'строка\nстрока',{kind:'chalk'|'wood'|'paper',legs,size})` доска, вывеска, ценник (x,y центр).
- Растения: `tree(g,x,y,s,{kind:'leaf'|'oak'|'pine'|'round',col,trunk,sway})` · `bush` · `grass(g,x0,x1,y,{col,h,t})` · `leaf(g,x,y,s,{kind:'maple'|'oval',col,rot})` · `leaves(g,t,x0,x1,y0,y1,{n,cols})` падают.
- Транспорт (`dir` ±1, `t` крутит колёса): `car(g,x,y,s,{col})` · `bus(g,x,y,s,{col,num:'№3',len,people})` · `bike(g,x,y,s,{col,rider:{shirt,helmet,…}|false})` · `boat(g,x,y,s,{col,stripe,cabin|false,roof,motor,run 0…1 бурун,mast,flag})` (y: ватерлиния).
- Животные: `dog(g,x,y,s,{col,pose:'stand'|'run'|'sit'|'sleep',collar})` · `cat(g,x,y,s,{col,pose:'sit'|'walk'|'sleep'})` · `bird(g,x,y,s,{col,wing,fly,t})` · `flock(g,t,x,y,n,{r,s})` стая кружит.
- Небо и природа: `sun(g,x,y,r,{col,rays,t})` · `moon(g,x,y,r,{col,phase})` · `stars` · `clouds` · `sea(g,t,y,{col,col2,amp,h})` вода от y вниз · `hills` · `ground`.
- Улица: `lamp(g,x,y,h,{on 0…1,col,light})` · `garland(g,x0,y0,x1,y1,{on 0…1 по очереди,sag,n,cols})`.
Особого (маяк, кран, прилавок, баян) нет: пиши свою функцию из `box/poly/disc/seg` в этом же языке.
**Акценты**: `pulse(g,lt,x,y,{r0,r1,col})` · `burst(g,lt,x,y,{r0,r1,col})` · `waves(g,t,x,y,{ang,spread,alpha})` · `dotRing(g,t,x,y,r,{p,src(i,n),inner})` · `sparkle` `puffs` `bits`.
**Текст**: `title/words(g,t,t0,'текст *ключ',x,y,{size,col,at,t1,align,maxW,hollow,dash})`: '~' неразрывный пробел, '|' перенос, сам ужимается под maxW 940; вернёт {x,y,w,h,size} · `label(g,s,x,y,{size,maxW})` · `hud(g,s,x,y)` · `counter(g,x,y,v,{digits,size,suffix,lead:false})` (дробное v крутит колёса, строка как есть) · `tag(g,t,t0,x,y,s,{to,align,center,t1})` · `stamp(g,t,t0,x,y,s,{r,t1})` · `timeline(g,t,{at,x0,x1,y,col})`.
**Переходы**: `morph(g,lt,x,y,drawA,drawB,{s,mode})` · `wipe(g,p,{cols})`.

## Рецепт сильного ролика
1. Разбери озвучку по словам: кто, что, какого цвета, сколько, когда. Каждой фразе своя сцена из типовых объектов + предметов темы.
2. Хук: в 0,05 с крупный заголовок, к 0,4 с главная картинка темы выпрыгивает (`pop`).
3. Каждые 3–5 с новая композиция: наезд на деталь, панорама к людям, реквизит, бирки к деталям. Люди двигаются.
4. Счётчик крутится в момент числа и стоит на нём, пока число звучит.
5. Финал по теме, спокойный.

## Звук
`sound(s)`: 25–35 событий, громкость 0.1–0.18, на тех же моментах, что события. Склейка `marimba_run` `kalimba_run`; появление `wood` `drop` `pop_soft` `pop_high`; плашка `woodblock`; механика `tick` `click` `toggle_on`; числа `counter` `odometer`; реплика `notify` `bubble`; цвет `sparkle` `magic`; финал `success`.

Нельзя: `Math.random`, `Date`, `document`, `ctx.filter`, conic-градиенты, `letterSpacing`, `shadowBlur`, эмодзи.
