# Стиль «Лаборатория»: интерактивная 3D-лаборатория

`LAB` уже подключена, не объявляй её. Рисуй через `LAB` и canvas. Углы в градусах, `lt` - секунды от склейки.

## Правила
1. **Палитра** `LAB.P`: тёмная студия (`void`, `navy`), металлы (латунь `brass`, медь `copper`, хром, чёрный металл), свет-акценты: `cyan` - главный (заголовки, вода, давление), `orange`/`amber` - жар, кофе, огонь, `violet` - время, аромат, `ok` - только «готово», `red` - запрет. Один цвет на один смысл.
2. **Объём и свет**: предметы из материалов `mat(g, вид, …)`, в разрезе (`tank`, `cup`, `scan`), свет только аддитивный: `glow`, `beam`, `flow`, `rays`. Фон всегда `studio` (размыт, как вне фокуса) или своя тёмная заливка.
3. **Текст**: `header` - белая строка 50px + крупный голубой заголовок 110–200px с градиентом и свечением; подписи деталей - `callout` (точка-якорь, линия, тёмная пилюля 44px); числа и служебное - моно. Коротко: ключевые слова и числа, до 3 блоков, без «-».
4. **Сетка 9:16**: заголовок слева y 200–560, статус `chip` справа y 150, главный план в середине y 560–1450 (на стенде, подиуме или в витрине-диораме), низ y 1508–1676 для пульта, если он нужен.
5. **Камера живёт всегда**: `camera` + `layer`: после склейки наезд с оседанием, затем дрейф; фон слоем 0.2–0.3 (параллакс). Для тяжёлых сцен `zoom:false` (оседание сдвигом и панорама).
6. **Движение**: детали входят пружиной (`spring`, `eb`), текст по словам без перелёта (`say`, `header`), уход быстрее появления (`out`). Внутри предметов всегда что-то течёт: `flow`, `bubbles`, `steam`, `stream`, накал `coil`.
7. **Склейки**: на ключевом слове (`LAB.at(i,'слово')`), жёсткие, план меняется каждые 3–5 с. Фирменные ходы (по смыслу, не обязательно): срез `scan` с курсором, если в теме есть что вскрыть; «разобрать» (`apart`) для устройств; перевод фокуса (`blur`, `focus`).
8. **Сквозное - только если подходит теме.** Героя ролика бери из самой озвучки (человек, животное, место, предмет), а не из шаблона. Курсор, приборы (`gauge`), пульт `readouts`, статус `chip`, значок `badge` - лишь когда они что-то значат для этой темы: пульт только с величинами из текста, значок только со словами темы. Нечего показывать - не ставь.
9. **Что сказано, то нарисовано.** Люди, животные, здания, транспорт, деревья из озвучки рисуются типовыми объектами (ниже), а не точкой, колбой, значком или выноской со словом. Если о людях речь (рыбаки, продавец, дети, рабочие, бабушка, танцующие), в кадре люди в названной позе и одежде. Лаборатория - подача (свет, стенд, подиум, срез), а не замена предметов.
10. **Цвета из текста соблюдай буквально**: «розовое солнце», «оранжевые куртки», «синий автобус», «рыжий пёс» - этот цвет на этом предмете (ближайший оттенок `P`); остальная сцена его не перебивает.
11. **Событие в момент слова**: предмет или действие появляется на `L.at(i,'слово')` (±0,3 с), не раньше и не позже; «зажигаются», «гаснут», «растёт» - анимация идёт именно тогда.
12. **Надписи только по теме ролика**: слова и числа из озвучки, по-русски, без выдуманных подписей и английских слов. Цены, вывески, меню - `board`/`o.sign` с текстом из сценария.

## Каркас
```js
const L = LAB, P = L.P, CUTS = [0, 4.1, 7.4 /* фразы + ключевые слова */];
const SC = [
  [(g, lt, sc) => { const cam = L.camera(lt, { d: sc.d, push: .06, pan: [0, -30] });
     L.layer(g, cam, .25, g => L.studio(g, { v: 'a' }));
     L.layer(g, cam, 1, g => { L.bench(g, -80, 1400, 1240); /* предмет */ }); },
   (g, lt, sc) => { L.header(g, lt, { over: 'Почему', title: 'ЭСПРЕССО', t: [.05, .4] });
     L.callout(g, lt, L.at(0, 'турки') - sc.t0, 240, 1200, 70, 1015, 'ТУРКА', { elbow: true, col: P.orange }); }],
];
function frame(g, t) { const sc = L.cuts(t, CUTS), [world, ui] = SC[sc.i]; world(g, sc.lt, sc); ui(g, sc.lt, sc); /* hud */ }
function draw(t, k) { L.prewarm(k, CUTS.map(c => c + 1), tt => frame(k.g, tt)); frame(L.begin(t, k), t); }
```

## API
**Кадр**: `begin(t,k)`→g · `prewarm(k, [t…], fn)` (первый кадр строит все кэши) · `cuts(t, list)`→{i,t0,t1,lt,d,p} · `at(i,'слово')`→сек (момент слова фразы i) · `camera(lt,{d,push,drift,pan:[dx,dy],zoom:false,shake:[t0,amp,dur]})`→cam · `layer(g,cam,depth,fn)` · `view(g,fx,fy,z,fn,{sx,sy})` · `blur(g,f,fn)` (f 2…12) · `focus(g,f01,fn)` · `shake(g,lt,t0,dur,amp)` · `cache(key,w,h,fn,{blur})`→холст (статичное рисуется один раз).
**Время**: `pr(t,a,b)` · `lerp` · `cl` · `eo`, `eo5`, `ei`, `eio`, `eb(p,s)` (перелёт), `sm` · `spring(сек,{damp,freq})` · `kf([[t,v]…],t)` · `rnd(seed)` · `hash` · `num(v,d)`→"1,5" · `apart(p,i,n,d)`.
**Цвет**: `P` · `rgba(hex,a)` · `mix(a,b,p)` · `heat(0…1)` (накал) · `mat(g,'black|steel|chrome|brass|copper|ceramic|rubber|glass',x0,y0,x1,y1)`.
**Фон и стенд**: `studio(g,{v:'a'|'b'|'c',x,y,dark})` (a - лаборатория с панелями, b - синий бокс с колонной света, c - макро-боке) · `bench(g,x,yTop,w,{h,ruler,blocks,leds})` · `rail(g,x0,x1,y,{cars})` · `pedestal(g,cx,cyTop,rx,lt,{h,col})` · `plate(g,x,y,w,h,{leds})` · `bolt` · `led(g,x,y,r,col,on)`.
**Свет**: `glow(g,x,y,r,col,a,{sx,sy})` · `beam(g,[x,y…],{w,col,a,p})` · `rays(g,x0,y0,x1,y1,n,spread)` · `flow(g,[x,y…],lt,{col,w,speed,p,a})` (бегущий поток) · `jet(g,x,y,len,w,lt,{rot,cols,diamonds})` (факел) · `shafts(g,x0,x1,y,len,lt)` · `bokeh(g,lt,{n,y0,y1,r,a})` · `motes` · `flare(g,x,y,s)` · `sweep(g,p)` (блик-переход) · `grade(g,{vig,dark})`.
**Детали** (x,y в px): `cylH(g,x,yОси,len,r,mat,{knurl:[x0,x1],cap:'flat'|'open'|'glass'})` · `cylV(g,cx,yTop,h,r,mat)` · `gear(g,cx,cy,r,{n,rot,k,hole})` · `coil(g,x0,y0,x1,y1,r,витки,{heat,lw,cache})` · `pipe(g,[x,y…],{r,kind,flow:{lt,col}})` · `tank(g,x,y,w,h,lt,{kind,r,wall,level,liquid:[верх,низ],inside(g,ix,iy,iw,ih)})` (ёмкость в разрезе) · `liquid(g,x,y,w,h,уровень,lt,{col,col2})` · `cup(g,cx,низ,w,h,lt,{fill,layers:[[доля,цвет]…],foam,handle})` · `stream(g,x,y0,y1,w,lt)` (струя) · `bubbles(g,x,y,w,h,lt,{n,r,a})` · `steam(g,x,y,lt,{n,h,col,a})` · `grains(g,x,y,w,h,{path,col,s})` (зерно, порошок) · `gauge(g,cx,cy,r,v,{max,every,zone:[a,b,col],unit})` · `tracer(g,x,y,r,{col})` (капля-метка) · `holo(g,[4 угла])` (сетка-плоскость) · `scan(g,p,x0,x1,до(g),после(g),{y0,y1})` (срез).
**Текст**: `header(g,lt,{over,title,sub,t:[…],titleTimes,size,col:[верх,низ],glow,key,y})`→низ · `say(g,lt,t0,'слово *ключ',x,y,size,{col,key,max,al,dt,times,out,glow,lines})` · `odo(g,x,yБаз,v,{size,digits,unit,grad})` (бегущие цифры) · `text(g,s,x,y,size,{w,kind,col,al,max})` · `mono` · `fit`.
**Интерфейс**: `panel(g,x,y,w,h,{glow})` · `pill(g,x,y,s,{size,dot,sub,al:'l'|'r'|'c'})` · `callout(g,lt,t0,ax,ay,lx,ly,s,{side:'l',elbow,col,sub,out})` · `chip(g,xПрав,y,s,{col})` · `readouts(g,x,y,w,[{label,value,unit,col,on,frac}],{h})` · `seg(g,x,y,w,[…],active)` · `slider` · `toggle` · `knob(g,cx,cy,r,{v,col})` · `ring(g,cx,cy,r,v01,{col,w,ticks})` · `bar(g,x,y,w,h,v01,{col})` · `scale(g,x,y,len,{vertical,min,max,step,every,fmt})` · `cursor(g,x,y,{press})` · `cpath(t,[[t,x,y,клик]…])` · `click(g,lt,t0,x,y)` · `check` · `badge(g,lt,t0,x,y,s,{size,col})` (итог-штамп) · `filmstrip`.

## Типовые объекты
Все в объёме стиля (свет сверху-слева, тёмный контур), цвет любого предмета - параметр (hex, лучше из `P`). `x` - центр, `y` - земля (ступни, колёса, низ стены), `lt` анимирует.
- **Человек** `person(g,x,y,h,{age:'adult'|'child'|'old', pose:'stand'|'walk'|'run'|'wave'|'hold'|'sit'|'dance'|'ride', lt, ph, dir:1|-1, top, bottom, hair, skin, shoes, skirt, hat:'helmet'|'cap'|'scarf', hatCol, bag, item:(g,hx,hy)=>{}})`→{head,hand,top}. h: взрослый 260–340, ребёнок 0,65 от взрослого. `item` рисует предмет в руке (книга, корзина). `sit` - сиденье рисуй сам под тазом (y - ступни).
- **Группа** `crowd(g,x0,x1,y,h,n,{pose,lt,rows:1|2,ages,tops,seed})`: n людей разных цветов, не сливаются.
- **Здания** `building(g,x,y,w,h,{kind:'house'|'tower'|'shop'|'cafe'|'school', col, roof, floors, cols, lit:0…1|fn(i,n), sign, signCol, awning})` (x - левый край). `lit` - доля горящих окон: уменьшай во времени, и они гаснут по одному. `sign` - вывеска текстом из сценария.
- **Природа** `tree(g,x,y,h,{kind:'oak'|'leaf'|'pine'|'bush', col, trunk, lt})` · `grass(g,x0,x1,y,{col,h})` · `leaves(g,lt,{n,x0,x1,y0,y1,cols})` (падающие листья) · `hill(g,x0,x1,y,h,{col})` · `sea(g,x0,x1,yВерх,yНиз,lt,{col,col2,amp,shine:x,shineCol})`.
- **Небо** `sun(g,x,y,r,{col})` · `moon(g,x,y,r,{phase})` · `stars(g,lt,{n,x0,x1,y0,y1,on:0…1})` · `cloud(g,x,y,w,{col,a})` · `bird(g,x,y,s,{col,lt,dir})` (чайка).
- **Транспорт** `car(g,x,y,w,{col,dir,lt,lights})` · `bus(g,x,y,w,{col,num,people,dir,lt})` · `bike(g,x,y,s,{col,dir,lt,rider:{top,hat…}|false})` (велосипедист) · `boat(g,x,yВоды,w,{col,stripe,cabin,crew:n|[опции person],speed:0…1,dir,lt})`.
- **Животные** `dog`/`cat(g,x,y,s,{col,pose:'stand'|'walk'|'sit'|'sleep',dir,lt})`.
- **Улица** `lamp(g,x,y,h,{on:0…1,col})` · `garland(g,x0,y0,x1,y1,lt,{n,sag,on:0…1})` (лампочки зажигаются слева направо по `on`) · `board(g,x,y,w,h,['строка'…],{kind:'chalk'|'sign',col,lt,times:[сек],size})` (x,y - левый верх; строка проявляется в свой момент) · `shade(g,col,x0,y0,x1,y1)` (объёмная заливка для своих предметов).
Сцена «на улице»: `studio` или своя тёмная заливка + `sea`/`hill`/`grass`, объекты на `bench` или прямо на земле; масштаб людей и домов согласуй (дом выше человека в 2–4 раза).

## Рецепт сильного ролика
1. Мир - лаборатория: тема разобрана на стенде или в витрине-диораме, люди и места - фигуры типовыми объектами. Сквозной герой - из темы.
2. Хук: с первого кадра главный предмет или место темы, к 0,5 с крупный заголовок; дальше раскрытие, если тема его даёт (срез `scan`, наезд, свет).
3. На фразу - один план по тому, о чём фраза. Числа из текста - крупно (`odo` к моменту слова), выноски `callout` 1–2 на план, на слове. Финал - итоговый образ темы (`pedestal`, `badge` по желанию).

## Звук
Интерфейсные звуки: click, toggle_on, pop_soft/pop_high на слова и выноски, woodblock на карточки, counter/odometer/tally под числа, bubble/drop для жидкостей, wood/rim на удар, marimba_run/kalimba_run на склейки, success/ta_da/magic на итог. Громкость 0.08…0.18, около 30 событий.

## Скорость
Дорого: градиент на весь кадр и крупные спрайты под зумом. Статичное - в `cache` (`tank`, `cup`, `panel` кэшируются сами), в тяжёлых сценах `camera({zoom:false})`, в `draw` - `prewarm`. Нельзя: `document`, `Math.random`, `ctx.filter`, `shadowBlur` в кадре, пиксельные циклы.
