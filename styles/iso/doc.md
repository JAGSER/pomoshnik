# Стиль «Изометрия»: инфографика на тёмно-синем

Библиотека подключена: глобальная `ISO` и `person`, заново не объявляй (свои функции для редких предметов писать можно, из `block`/`prism`/`cyl`). Мир: x вправо-вниз, y влево-вниз, z вверх; 1 ед. мира = 1 px при масштабе вида 1. `lt` = секунды от склейки.

## Правила
1. **Палитра `ISO.P`**: фон `bg` (`night`, `deep`), панели `panel`, рамки `edge`, линии `line`, акцент `cyan`, `red`/`redD` только для проблемы, `orange`, `amber`, `green` готово, текст `white`, подписи `grey`; предметы `steel`, `kraft`. Без градиентов под текстом, shadowBlur нельзя (свечение только `glow`).
2. **Слои кадра**: `bg` → сцена в `cam` → `finish` → `hud`. Рисуй от дальних к ближним (меньше x+y раньше). Голубой контур только у платформ и героя.
3. **Текст**: `title` жирный белый, одно `*ключевое` цветом, 100–120 px, x=60, y≈330. Подписи `label` капсом 22–28 px, числа `odo`. До 2–3 текстовых блоков, без длинного тире. Заголовок это осмысленная фраза из 2–5 слов (никаких «На», «Мелом на», «Городу лет» без числа).
4. **Синхрон**: предмет, человек или действие появляется в момент своего слова (`слово@сек`, склейка на ключевом слове в `CUTS`), не раньше и не позже 0,3 с. Цифра считается `odo`, когда её произносят.
5. **Движение**: после склейки сцена уже видна, детали достраиваются за 0,2–0,5 с (`fall`, `pop`, `trace`, `stag`, `grow`), уход быстрее появления. Камера дрейфует, вторичный слой живёт (`ripple`, `pulses`, волны, птицы).
6. **Разнообразие каждые 2–4 с**: диорама, крупный план (`view` s=2–5), карта `dotMap`+`arcPts`, сканер `radial`+`dial`, панель `card`+`odo`, `steps`. Финал по смыслу темы (итоговая строка этапов, `stamp` только если тема про результат).
7. **Шаблонные элементы только по смыслу темы**: трекер `hud`, `stamp`, пинги `beacon`/`hi`, посылка `parcel` из примера не обязательны. `hud` ставь, только если в теме есть процесс со статусом и временем (доставка, день, заказ), и все его тексты из темы. Сквозного героя бери из самой озвучки (человек, животное, предмет, место) или обходись без него.

## Правила содержания (обязательно)
- **Всё названное в озвучке рисуется предметом**, а не словом, значком или пустой карточкой: автобус `bus`, лодки `boat`, пёс `dog`, рыба на прилавке `stall`, дерево `tree`, солнце `sun`… Если готового нет, собери из `block`/`prism`/`cyl` в той же манере.
- **Цвет, названный в тексте, обязателен** (розовое солнце, оранжевые куртки, синий автобус, жёлтый кран, рыжий пёс): параметр `col`/`look`. Если цвета нет в `P`, бери насыщенный близкий оттенок.
- **Если в тексте люди, они в кадре** и делают названное: идут/бегут `walk`/`run`, машут `wave`, сидят `sit`, читают `sit`+`hold`, танцуют `dance`, едут `bike`. Дети `age:'child'` ниже взрослых, бабушка/дедушка `age:'old'`. Люди одной группы разного цвета (`ISO.LOOKS`) и стоят не ближе 0,35 роста друг к другу.
- **Число в тексте = число на экране** (семь лодок = 7 `boat`, пятиэтажка = `floors: 5`, два велосипедиста = 2 `bike`).
- **Надписи только из озвучки и по теме ролика**: без выдуманных заголовков («меню дня»), без чужих слов и английского. Вывески `shop({sign})`, доски `board`, номера `bus({num})` берут текст из параметров.
- Текст в кадре внутри x 60…1020, ничего не обрезано краем; подпись не кладётся на предмет (или тёмная плашка `rr`).

## Каркас
```js
const P = ISO.P, CUTS = [0, 3.7, 5.8 /* фразы + ключевые слова */];
function s1(g, lt, t) {
  ISO.bg(g);
  ISO.cam(g, lt, { z: ISO.lerp(1, 1.04, lt / 2), cy: 1100 }, g => {
    ISO.view(540, 1150, 1);
    ISO.slab(g, -250, -250, -24, 500, 500, 24, { grid: 50, p: ISO.eo(ISO.pr(lt, 0, .6)) });
    ISO.bus(g, 0, 0, 0, 1, { col: '#2F6FD6', num: '3', lt });
  });
  ISO.title(g, lt, 'Синий@.15 *автобус@.4', 60, 330, { size: 112 });
}
const SC = [s1 /* … */];
function draw(t, k) {
  const g = ISO.begin(t, k), sc = ISO.cuts(t, CUTS);
  SC[sc.i](g, sc.lt, t); ISO.finish(g);
  // ISO.hud(g, {...}) только если в теме есть процесс со статусом и временем
}
```

## API
**Время**: `cl` `pr(t,a,b)` `lerp` `eo` `ei` `eio` `eb` · `spring(t,f,z)` · `kf([[t,v]…],t)` · `step([[t,v,…]],t)` · `stag(lt,t0,i,gap,d)` · `fall(lt,t0,h,dur)` · `typed(s,lt,t0,cps)` · `num(v,d)` · `hash` `rnd(seed)` · `shade(hex,k)` `rgba(hex,a)` `mix(a,b,p)`.
**Кадр**: `begin(t,k)` · `cuts(t,list)`→{i,t0,t1,lt,d,p,left} · `cam(g,lt,{z,kick,cx,cy,x,y,rot},fn)` · `shake` · `bg(g,{tone,px,py,stars})` · `finish` · `dim(g,a)` · `scrim(g,y0,y1,a)` · `stripes` · `scanline(g,lt)` · `glow(g,x,y,r,col,a,ry)`.
**Изометрия**: `view(ox,oy,s)` · `pt(x,y,z)`→[sx,sy] · `floorPts` · `block(g,x,y,z,w,d,h,{col|top,left,right,edge})` ((x,y,z) дальний нижний угол) · `prism(g,[[x,y]…],z,h,{col,top})` выпуклый многоугольник · `frustum(g,x,y,z,w,d,h,ins,{col})` · `tile` `grid` `slab(g,x,y,z,w,d,h,{grid,p})` · `ring` `pad` `cyl(g,x,y,z,r,h,{col})` · `onFace(g,x,y,z,'top'|'left'|'right',q=>…)` · `faceText` · `qTop` `qL` `qR`.
**Схемы** (px): `trace(g,pts,p,col,lw,{dash,off})` · `along` · `pulses` · `arcPts` · `node` · `ripple(g,x,y,lt,{once,flat,n,per,r0,r1,col})` · `reticle` · `check` · `radial` · `dial` · `gauge` · `dotMap` · `pin` · `cursor` · `barcode` · `laser` · `moon(g,x,y,r)`.
**Текст и UI**: `title(g,lt,spec,x,y,{size,al,max,kcol,out})` spec «Слово@.2 *ключ@.6 | вторая@1.1» · `text(g,s,x,y,size,{al,col,max})` · `label(g,s,x,y,size,{col,al,n,max})` · `odo(g,v,x,y,size,{d,unit,al,col})` · `odoTime` · `pill` · `card(g,x,y,w,h,{p,col})` · `stamp(g,lt,t0,s,x,y,{col,rot})` · `callout(g,lt,t0,ax,ay,bx,by,s)` · `steps(g,lt,[{s,sub,st,t}],x,y)` · `pop(g,lt,t0,x,y,fn,{from,out})` · `rise` · `rr` · `font`.
**Трекер**: `hud(g,{a,id,status,col,min,stage,n:7,flash,done,tcol,tl})` занимает y 118…262; `tl` подпись справа (по умолчанию нет).
**Прежние предметы**: `parcel(g,x,y,z,s,{open,tape,label,hi,lt})` · `beacon` · `robot` · `rack` · `cells` · `belt` · `truck(g,x,y,z,s,{van,lights,col,lt})` (грузовик, не автобус) · `door(g,x,y,z,{ring,num})` · `shadow(g,x,y,z,r)`.

## Типовые объекты (ед. мира, цвет параметром)
Транспорт и животные смотрят по `axis: 'x'` (вправо-вниз, по умолчанию) или `'y'` (влево-вниз); (x,y,z) центр дна; `s` масштаб; `lt` для колёс и анимации.
- **Транспорт**: `car(g,x,y,z,s,{col,axis,lt,lights})` 150×72 · `bus(g,x,y,z,s,{col,num,axis,lt,lights})` 300×96, номер на табло · `bike(g,x,y,z,s,{col,look,age,H,axis,lt,phase})` велосипед с ездоком (крутит педали) · `boat(g,x,y,z,s,{col,cab,deck,trim,motor,wake,axis,lt})` 130×52 на воде, `wake` 0…1 след.
- **Животные**: `dog`/`cat(g,x,y,z,s,{col,pose:'stand'|'walk'|'sit'|'sleep',zzz,axis,lt})` (s 1.2–1.6 рядом с людьми) · `bird(g,sx,sy,s,{col,lt,ph})` летящая птица в px · `birds(g,cx,cy,r,lt,{n,s,col,speed})` стая кружит.
- **Здания**: `building(g,x,y,z,w,d,h,{col,floors,lit,off,grow,seed,edge})` многоэтажка: `lit` доля горящих окон, `off` 0…1 гаснут по одному, `grow` 0…1 растёт по этажам · `house(g,x,y,z,w,d,h,{col,roof,lit,off,door})` дом с двускатной крышей · `shop(g,x,y,z,w,d,h,{kind:'shop'|'cafe'|'school',sign,col,awn,signCol,ink,lit,tables})` витрина, маркиза, вывеска · `stall(g,x,y,z,w,{goods:[{col,kind:'fruit'|'fish'|'box',n}],awn,col,tag})` прилавок рынка.
- **Природа**: `tree(g,x,y,z,s,{kind:'leaf'|'pine'|'bush',col,trunk,lt})` · `grass(g,x,y,z,w,d,{col,fill,n,lt})` · `leaves(g,x,y,z,w,d,lt,{n,cols,fall})` листья лежат и падают · `sea(g,x,y,z,w,d,lt,{col,wave,n,edge})` вода с волнами · `hill(g,x,y,z,w,d,h,{col})`.
- **Небо** (px): `sun(g,x,y,r,{col,rays,a,lt})` · `moon(g,x,y,r)` · `stars(g,lt,{on,n,x0,y0,x1,y1,col})` `on` 0…1 зажигаются по одной · `cloud(g,x,y,s,{col,a})`.
- **Улица**: `lamp(g,x,y,z,h,{on,col,pool})` `on` 0…1 · `garland(g,[x,y],[x,y],lt,{n,on,cols,sag})` фонарики загораются по очереди · `board(g,x,y,z,w,h,lines,{title,face,legs,bg,ink,frame,size,n})` доска/табличка: lines `['строка', ['Уха','350 ₽']]`, `n` сколько строк уже написано.
- **Люди**: `person(g,pass,x,y,z,ang,H,lt,o)` или `ISO.people(g,[{x,y,ang,H,pose,age,look,…}],lt)` (сам сортирует по глубине; `look` число → `ISO.LOOKS[i]`).
  - `pass` `'all'`; за столом: `'low'` до стола, `'up'` после. `ang` 0 = +x, `Math.PI/4` = к зрителю, `Math.PI/2` = +y. `H` взрослый 170–190, ребёнок 105–125, пожилой 160–170.
  - `o.pose`: `'idle'` · `'walk'`/`'run'` (`speed`, `phase`: разная у соседей) · `'wave'` машет (`hand` 1|-1) · `'dance'` · `'sit'` (`sz` высота сиденья в долях H, 0.26; стул/скамью рисуй сам) · `'hold'` или `o.hold:1` держит предмет у груди (предмет рисуй сам: вперёд 0.2H, высота 0.62H стоя) · `'reach'` (`t:[вперёд,вбок,вверх]` в долях H, `hand`) · `'rest'`/`'knead'` (`tx`,`tz`).
  - `o.age`: `'child'` (крупнее голова) | `'old'` (сутулится, седой). `o.look`: `{coat, pants, skin, hair, shoe, hat:'none'|'cap'|'helmet'|'scarf'|'chef', hatCol, bag (цвет рюкзака), dress, apron}`.
  - Плечо 0.84H, кисть достаёт на 0.32H от плеча; иначе функция бросит ошибку.

## Рецепт сильного ролика
1. Хук до 1 с: крупный предмет и действие.
2. Сквозной герой из самой темы (если он там есть); трекер `hud` только если в теме есть ход процесса.
3. На каждую фразу своя форма и свой предмет из текста; склейка на ключевом слове, камера оседает.
4. Финал 2 с: итог по теме (например строка мини-диорам из этого ролика) и крупная фраза.
Скорость: до ~300 фигур и ~12 людей на кадр; не рисуй сотни окон вручную (`building` сам).

## Звук
`s.play(t,'имя',0.08…0.2,{pitch})`. Склейки `marimba_run`, `kalimba_run` (pitch 0.9–1.12); кнопка `click`; падение `drop`; статус `toggle_on`; счётчики `counter`, `odometer`; печать `type`; пинг `pop_high`, `bubble`, `notify`; ящики `woodblock`, `rim`; звонок два `marimba` (1.26 и 1); итог `success`, `success3`. 25–35 событий, звук точно в кадр события.
