# Стиль «Швейцарский постер» (библиотека `SWISS`)

`SWISS` уже подключена, не объявляй её заново (свои функции для недостающих предметов писать можно и нужно). Ролик: серия плакатов, сплошные поля, огромный гротеск, курсив, тонкий HUD, упругое движение, плоские фигуры без обводок и теней.

## Правила
1. **Поля**: `red` `blue` `cream` `black` `yellow` на весь кадр, каждая сцена меняет поле, два одинаковых подряд нельзя. В `s.f`: `fg` текст, `acc` `alt` акценты. Палитра `P`: red blue cream black yellow ink white grey + для предметов pink orange ginger green greenD brown sky night. Цвет любого объекта: имя палитры или '#hex'.
2. **Набор**: одно огромное слово `wide` (капс, 130–260 px) + курсив `serif` 76–100 px (`*ключ` цветом) или разрядка `caps` 50–60 px; `mono` 24–30 px для меток. До 3 текстовых блоков, без «-».
3. **Сетка**: поля 96 px, контент в y 220…1600 (HUD сверху и снизу). Слово то сверху (y≈520), то снизу (y≈1580). Линейки `rule` делят блоки.
4. **Движение**: пружины (`sp`, `track`, `pop`) и ease-out, уход быстрее входа. Фон живёт всегда.
5. **Склейки** на ключевом слове: `iris` из позиции героя, `wipe` с `band`, `tiles`, `bands`, `slide`, `cut`.
6. **Последним** в draw: `grain`, затем `hud` (уголки, тема, глава). Таймкод `tc`, доли `beat`, кольца, круговой текст, счётчики, знак в финале, сквозной герой: не обязательны, только если подходят теме. Героя (если нужен) бери из самой темы: человек, животное, предмет из озвучки.

## Смысл кадра (главное)
- **Сцена = картинка того, что звучит**, а не слово со значком. Говорят про людей (рыбаки, продавщица, дети, рабочие, бабушка с внуками, танцующие) → рисуй людей `person`/`crowd` в нужной позе и с предметом. Говорят про место (рынок, кафе, школа, парк, улица, море) → рисуй место объектами ниже. Слово `wide` только подписывает картинку.
- **Названный цвет соблюдай буквально**: «розовое солнце» → `sun(...{col:'pink'})`, «оранжевые куртки» → `top:'orange'`, «синий автобус», «рыжий пёс» → `col:'ginger'`. Нет в палитре → ближайший оттенок или '#hex'. Поле сцены подбирай так, чтобы названный цвет на нём читался (жёлтый кран не на жёлтом поле).
- **Каждое событие появляется в момент своего слова**: `t0 = s.w('слово')` (а не по таймеру). Числа считаются на слове числа. «Один за другим гаснут» → гаснут по одному (`lit` от 1 к 0 по времени). Длинную фразу дели на 2–3 сцены или 2–3 события.
- **Количество как в тексте**: «семь лодок» = 7 лодок, «два велосипедиста» = 2 велосипеда рядом без наложения.
- **Надписи только по теме ролика**: слова и числа из озвучки, вывески с названиями из текста. Ничего из чужих тем (кофе, зерно), никаких английских слов. HUD: `title`, `name` своей темы.
- Люди и предметы не обрезаны краем, не налезают на текст, между людьми зазор; поля пустыми не оставляй: план улицы, море, горизонт.

## Каркас
```js
const S = SWISS, P = S.P, NAMES = ['ИНТРО', 'РЫНОК' /* по фразам */];
const SC = [
  { at: 0, field: 'yellow', draw: (g, lt, s) => {
    S.sun(g, 540, 900, 160, { col: 'pink', lt }); S.sea(g, 1150, { col: P.blue, lt });
    S.wide(g, 'Рассвет', 540, 520, 200, { lt, t0: .05, col: s.f.fg });
  } },
  { at: [1, 'Рыбаки'], field: 'cream', tr: 'iris', x: 540, y: 1100, draw: (g, lt, s) => {
    S.sea(g, 1250, { lt }); S.pop(g, lt, s.w('Рыбаки'), 540, 1250, () => S.boat(g, 540, 1260, 1.3, { lt, crew: [{ top: 'orange' }, { top: 'orange' }] }));
  } },
];
function draw(t, k) {
  const g = S.begin(t, k), s = S.play(g, t, SC), sub = k.sub(t);
  S.grain(g, .9); S.hud(g, t, { field: s.f, title: 'ТЕМА · ПЛАКАТ', chap: sub.i, chapAt: sub.t0, total: k.subs.length, name: NAMES[sub.i] });
}
function sound(s) { const C = SWISS.cutTimes(SC, s.subs), at = (i, w) => SWISS.at(i, w, s.subs);
  s.play(C[1], 'marimba_run', .17); s.play(at(1, 'Рыбаки'), 'pop_double', .16); }
```
**Сцена** `{at, field, tr, dir, x, y, band, n, dur, cam, draw}`: `at` секунды или `[фраза, 'слово']`; `tr` cut | iris (x, y) | wipe (dir, band) | bands (n) | tiles (x, y) | slide (dir); `cam` `{kick, push, rise, pan, x, y}`. **draw(g, lt, s)**: `lt` секунды от склейки, `s.w('слово', фраза?)` момент слова от склейки.

## API (px, секунды, градусы)
**Время**: `cl` `pr(t,a,b)` `lerp` `eo` `ei` `eio` `eb` · `sp(t,name)` пружина 0→1 (snap soft heavy text pop jelly) · `track(t,[[t,v]…])` · `kf` · `life(lt,t0,out)`→{e,a} · `hash` `rnd(seed)` `wob` `step` `z2` `tc` `mix(a,b,p)` `rgba(c,a)`.
**Фразы**: `words(i)` · `at(i,'слово')` · `phraseAt(t)` · `cutTimes(SC,subs)`.
**Кадр**: `begin` `play` `field` `fieldOf` `grain(g,a)` `layer(g,lt,depth,fn)` · `hud(g,t,{field,title,chap,chapAt,total,name,tc,beat,bpm,foot,tag,progress})` (tc таймкод и beat доли включай только по теме: время, музыка; foot/tag свои подписи по-русски).
**Текст** (все: `lt`, `t0`, `col`, `out`): `wide(g,s,x,y,size,{al,max,mode,stag,dot,mark})`→{x0,x1,w,size,top} · `serif(g,s,x,y,size,{al,max,lines,ts,acc})` · `caps(g,s,x,y,size,{al,max})` · `mono(g,s,x,y,size,{al,bold,type,scramble})` · `rule(g,x0,y,x1,p,{l,r,bl,br,col})` · `marker` `bracket` · `ringText(g,s,x,y,r,size,{p,spin,col,acc,lt})` · `odo(g,v,digits,x,y,size,{al,col,lt,t0})` счётчик.
**Фоны**: `rings(g,x,y,r0,{n,gap,lt,col})` · `dotGrid` · `truchet` · `globe(g,x,y,R,{lon,marks})` · `dotPlane` · `specks(g,x,y,lt)` конфетти.
**Фигуры**: `morph(g,x,y,r,a,b,p,{rot,fill})` (circle bean star tri square hex) · `star` · `trail(g,n,dx,dy,fn)` смаз · `orbit(g,x,y,R,n,{lt,t0,stag,spin},fn)` · `transformBox` · `annot(g,x,y,tx,ty,'строки',{p})` · `easeRow` · `ruler(g,x,y,w,{n,a,b,p})`.
**Прочее**: `clock(g,x,y,r,h,m,{face,sec})` · `gift` · `plate(g,x,y,'15',size,{bg,col})` табличка/вывеска · `pin(g,x,y,r,{col})` · `tube(g,pts,p)` · `mapGrid(g,x0,y0,x1,y1,{p})` · `lockup(g,x,y,size,'СЛОВО',{lt,t0,col,mark,shape})` знак (circle star tri square hex или функция) + слово · `cup` `cupTop` `croissant` `steam` `bean` только для темы кофе.

## Типовые объекты
Плоские, цвет каждой детали параметром. `x, y` - точка на земле (низ, центр); `s=1` - масштаб; `lt` - время для анимации; `dir:-1` - смотрит/едет влево. Появление: `S.pop(g, lt, t0, x, y, fn)` пружиной из точки.
- **Люди**: `person(g,x,y,s,{age:'adult'|'kid'|'old', pose, top, legs, skin, hair, hairStyle:'short'|'long'|'bun'|'none', hat:'helmet'|'cap', hatCol, skirt:цвет|true, apron, pack:цвет рюкзака, cane, glasses, mouth:0…1 (кричит/поёт), item, itemCol, text, ph:lt, dir})`→{top, hand}. Взрослый ≈ 290 px при s=1, ребёнок ≈ 190. `pose`: stand wave hold cheer dance walk run sit read ride. `item`: book bag box flower sign(+text) ball или `fn(g,x,y)` в руках. `SKIN` - 4 тона кожи.
- **Толпа**: `crowd(g,x0,x1,y,n,s,{pose|poses[], ages[], tops[], bg, lt, t0, stag, each:i=>({...})})` n человек в ряд с зазором, разной одеждой (цвет `bg` одежде не даётся), появляются по одному.
- **Здания**: `house(g,x,y,w,h,{col,roof,door,lit})` · `tower(g,x,y,w,h,{col,floors,cols,lit:0…1,on,win,p:стройка 0…1,slab})` многоэтажка, `lit` доля горящих окон (окна гаснут по одному) · `shop(g,x,y,w,h,{col,awn,awn2,sign:'ТЕКСТ',signBg,signCol})` · `cafe(…то же, table, cup)` · `school(g,x,y,w,h,{col,sign,flag,lit})` · `stall(g,x,y,w,{goods:[цвета],awn,col,sign})` прилавок рынка.
- **Природа**: `tree(g,x,y,s,{kind:'oak'|'round'|'pine', col, trunk, lt})` ≈ 380 px · `grass(g,x0,x1,y,{col,h,lt})` · `leaf(g,x,y,r,{kind:'maple'|'oval',col,rot})` · `leaves(g,lt,{x0,x1,y0,y1,n,cols})` листопад · `hill(g,x,y,w,h,{col})`.
- **Небо и вода**: `sun(g,x,y,r,{col,rays,lt})` · `moon(g,x,y,r,{col,bg:цвет неба,full})` · `stars(g,{x0,x1,y0,y1,n,p:зажигаются 0…1,lt})` · `cloud(g,x,y,s,{col,lt,drift})` · `sea(g,y,{col,col2,lines,amp,y1,lt})` море от y вниз · `road(g,y,{lt,speed})` дорога с бегущей разметкой.
- **Транспорт** (`lt` крутит колёса): `car(g,x,y,s,{col,dir})` ≈ 300 px · `bus(g,x,y,s,{col,num:'3',faces,dir})` ≈ 540 px · `bike(g,x,y,s,{col,lt,rider:{параметры person}|false})` · `boat(g,x,y,s,{kind:'motor'|'sail'|'row', col, stripe, crew:n|[{top:'orange'}…], wake, lt})`.
- **Животные** (≈ 240 px): `dog(g,x,y,s,{col,pose:'stand'|'walk'|'sit'|'sleep',lt})` · `cat(g,x,y,s,{col,pose:'sit'|'walk'|'sleep'})` · `bird(g,x,y,s,{kind:'gull'|'sit',col,lt})`.
- **Улица**: `lamp(g,x,y,h,{on:0…1,light})` фонарь · `garland(g,x0,y0,x1,y1,n,{on:0…1,cols,sag})` лампочки загораются слева направо · `board(g,x,y,w,h,[['уха','350 ₽'],…],{title,p:строки по очереди,bg,frame,legs})` доска мелом · `bench(g,x,y,w)` · вывеска: `plate`.
Нет нужного предмета (маяк, кран, баян): нарисуй сам 3–6 плоскими фигурами палитры в той же манере.

## Рецепт
1. Хук с первого кадра: слово `wide` и картинка темы. 2. Склейка на ключевом слове, сцена 2–5 с, у длинной фразы 2–3 события внутри. 3. В каждой сцене 1 крупный план (люди, место) + подпись; числа `odo` на слове числа. 4. Финал 3–4 с: главный образ темы + слово; `lockup`, `rule`, `ringText` по желанию, со знаком и данными этой темы. 5. Одновременно движется не больше трети элементов.

**Звук** (перкуссия, .1–.18, 25–35 событий): склейки marimba_run, kalimba_run, rim, bamboo; главное слово pop_double; метки pop_high, tick, woodblock, click; числа counter, odometer; финал success, ta_da, sparkle.

Нельзя: `Math.random`, `Date`, `document`, `ctx.filter`, `shadowBlur`, эмодзи, длинное тире.
