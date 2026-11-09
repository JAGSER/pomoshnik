# Стиль «Пиксельный офис» (AGOF)

`AGOF` уже подключена, саму библиотеку заново не объявляй (свои функции для новых предметов писать можно и нужно, тем же языком: `A.pix` или `A.sprite`). Тёплый игровой ролик: кремовый фон, чёрный жирный заголовок по центру с жёлтым маркером под ключом, плоские пиксельные спрайты без контура (2 тона на цвет), белые карточки с мягкой тенью.

## Правила
1. Фон и интерфейс из `AGOF.C`: крем `cream` (основной фон), песок `sand`, жёлтый `yellow` (маркер, финальный фон), чернила `ink`, белый `white`, линии `line`, серый `muted`. Предметы и люди красятся любыми цветами из `A.NC` (red pink orange ginger yellow gold green blue navy sky teal violet white gray black brown beige…) или '#rrggbb'.
2. Заголовок только `head`: по центру, y ≈ 300, 80–92 px, 900, `*ключ*` на жёлтом маркере, 2–5 слов. Ниже заголовка (y 480…1700) сцена: крупная картинка-площадка (белая карточка или прямо на креме) с объектами. Низ кадра ниже 1720 занят полосой приложения.
3. **Озвучка = кадр.** Каждый человек, животное, предмет, место из фразы нарисован объектом (типовым или своим через `pix`), а не словом, значком, карточкой-подписью или полосой-графиком. Люди, о которых речь (рыбаки, продавцы, дети, рабочие, бабушка, танцующие), видны целиком `person` с позой по действию (машут `wave`, бегут `run`, танцуют `dance`, кричит `shout`, читает `read`, играет `item:'accordion'`). Число из текста = столько объектов (семь лодок = 7 лодок) или число крупно рядом с ними.
4. **Цвет из текста соблюдай**: «розовое солнце» `sun(…,{col:'pink'})`, «оранжевые куртки» `shirt:'orange'`, «синий автобус» `bus(…,{col:'blue'})`, «жёлтый кран», «рыжий пёс» `dog(…,{col:'ginger'})`. Цвет держится во всех сценах, где предмет виден.
5. **Событие в момент слова** (±0,2 с): момент слова = начало фразы + доля символов до слова × длительность фразы. Маяк гасит огонь на слове «гасит», окна гаснут по одному (`lit` уменьшается), счётчик доходит до числа к моменту, когда оно сказано; промежуточные числа не показывай подписью.
6. **Надписи только по теме**: слова и числа из озвучки, без английских слов, без подписей из примера. Цены, вывески, номера - `tag`, `board`, `shop({sign})`, `bus({num})`.
7. **Всё по теме ролика.** Аватары в жёлтой рамке `ava`, терминал, офис, орбита, карточки умений, кнопка с курсором - образы рекламы цифрового сервиса; в других темах их нет. Сквозного героя (если нужен) выбирай из темы: человек, животное, предмет; финал без кнопки, если в озвучке нет призыва.
8. Ритм: сцена 2–4 с по фразам, склейка на ключевом слове, уход `out` за 0.25 с, камера `cam(g, lt, 540, 1000, 0.5)`. Один размер пикселя `s` на сцену (люди s 8–12, крупный план 14–18). Объекты не режь краем кадра и не ставь под заголовок.
9. Звуки: `pop_high`/`pop_soft` на появление, `key_soft`/`type` на печать, `bubble` на воду, `kalimba_run` на оживление, `ta_da` на итог. Склейки `cutSounds(s, CUTS, 'marimba_run', 0.12)`.

## Каркас
```js
const A = AGOF, C = A.C;
const CUTS = [0, 3, 6, 9];
function draw(t, k) {
  const g = k.g, { i, lt, dur } = A.scene(t, CUTS), last = i === CUTS.length - 1;
  g.fillStyle = C.cream; g.fillRect(0, 0, 1080, 1920);
  g.save(); A.cam(g, lt, 540, 1000, 0.5); g.globalAlpha = A.out(lt, dur, last);
  if (i === 0) { A.head(g, 'Утро *у моря*', t, 0.1); A.sea(g, 1100, t, { h: 400 }); A.sun(g, 540, 900, { col: 'pink', t, rays: true }); A.person(g, 300, 1400, { pose: 'wave', t, shirt: 'orange' }); }
  // ...
  g.restore();
}
function sound(s) { A.cutSounds(s, CUTS, 'marimba_run', 0.12); }
```

## Типовые объекты
Пиксельные спрайты (кэш). x - центр, y - земля/пол под объектом, `s` - размер пикселя (по умолчанию 8), `t` - для анимации, `dir:-1` - смотрит влево, цвета параметрами (имя из `NC` или '#rrggbb').
- **Человек** `person(g,x,y,{s,age:'adult'|'kid'|'old',pose:'stand'|'walk'|'run'|'wave'|'cheer'|'dance'|'shout'|'hold'|'read'|'sit',t,ph,shirt,pants,hair,skin,style:'short'|'long'|'bun'|'curly'|'none',hat:'helmet'|'cap'|'beanie'|'scarf',hatCol,bag(рюкзак: true или цвет),item:'book'|'box'|'peach'|'fish'|'cup'|'flower'|'phone'|'accordion',itemCol,glasses,beard,dress,apron,dir})` → `{top,hx,hy,head,w,h}`. Взрослый 17·s в высоту, ребёнок 13·s. Бабушка: `age:'old', hat:'scarf', glasses:true, dress:true`.
- `crowd(g,x0,x1,y,t,{n,s,poses,ages,seed,each:(i)=>({…})})` разные люди в ряд, шаг ≥ 14·s.
- **Здания** `house(g,x,y,{s,w,wall,roof,door,lit})` · `tower(g,x,y,{s,fl,cols,wall,lit,build:0…1,seed})` многоэтажка, `build` растёт по этажам, вернёт y верха · `shop(g,x,y,{s,w,wall,aw,aw2,sign,lit})` · `cafe(…,{sign,table,side})` · `school(g,x,y,{s,w,fl,wall,roof,sign,flag})`. `lit` 0…1 - доля горящих окон (гаснут по одному), без `lit` - дневные стёкла.
- **Растения** `tree(g,x,y,{s,kind:'leaf'|'oak'|'pine'|'bush',col,col2,trunk})` · `grass(g,x0,x1,y,{s,col,t})` · `leaves(g,t,x,y,w,h,{n,cols,s})` падающие листья.
- **Транспорт** `car(g,x,y,{s,col,dir})` · `bus(g,x,y,{s,col,num:'№3',pax,dir})` · `bike(g,x,y,{s,t,ph,col,shirt,pants,hair,hat,dir})` велосипедист · `boat(g,x,y,{s,len,col,col2,cabin,motor,move,t,crew:[{shirt,hat,hatCol,hair}],dir})` (y - линия воды).
- **Животные** `dog(g,x,y,{s,col,pose:'stand'|'walk'|'run'|'sit'|'sleep',zzz,t,dir})` · `cat(g,x,y,{s,col,pose:'sit'|'walk',t,dir})` · `bird(g,x,y,t,{s,col,ph,dir})` чайка в полёте.
- **Небо и природа** `sun(g,x,y,{s,r,col,rays,t,glow})` · `moon(g,x,y,{s,r,col,full})` · `stars(g,t,x,y,w,h,{n,seed,s})` · `cloud(g,x,y,{s,col})` · `sea(g,y,t,{x,w,h,col,s,glint:[x,col]})` · `hill(g,x,y,w,h,{s,col})`.
- **Улица** `lamp(g,x,y,{s,h,on:0…1})` · `garland(g,x0,y0,x1,y1,t,{s,n,on:0…1 слева направо,cols,sag})` · `board(g,x,y,w,h,['строка',…],{kind:'chalk'|'white'|'wood',n(букв написано),stand,size})` (x,y - левый верх) · `tag(g,'180 ₽',x,y,{size,bg,col})` ценник.
- **Своё** `pix(g,x,y,s,['..aa..','.abba.'],{a:'#..',b:'red'},{ax,ay,dir})` - спрайт из строк (маяк, кран, рыба, баян); `sprite(key,w,h,(R)=>R(x,y,w,h,col))` + `put(g,sp,x,y,s,ax,ay,dir)`; `shade(col,±k)` тон темнее/светлее.

## API интерфейса
- `scene(t, cuts)` → `{i, lt, dur}`; `out(lt, dur, last)`; `cam(g, lt, cx, cy, k)`.
- `head(g, s, t, t0, {y, size})` → y под заголовком. `words(g, s, x, y, size, t, t0, {align, color, key, keyBg, weight, w})` подзаголовки.
- `card(g, x, y, w, h, r)` белая карточка; `type(g, s, x, y, size, t, t0, d, {color, align})` печать по буквам; `count(v)` число с пробелами.
- Для темы цифрового сервиса: `ava(g, x, y, s, j, t, {frame})`, `skill`, `bars`, `terminal`, `office(…, 'подпись')`, `orbit`, `cta`, `cursor`.
- Утилиты: `cl, eo, eio, sp, pr, mix, font, rr, layout, hash`.

## Типовые ошибки
- Человек головой-аватаром вместо `person`; предмет словом в карточке вместо рисунка.
- Маленькие объекты в пустом кадре: сцена занимает y 500…1650, s ≥ 8.
- Маркер под всей фразой: в `*…*` только 1–3 слова.
