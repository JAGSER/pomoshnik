# Стиль «Лаборатория»: интерактивная 3D-лаборатория

`LAB` уже подключена, не объявляй её. Рисуй через `LAB` и canvas. Углы в градусах, `lt` - секунды от склейки.

## Правила
1. **Палитра** `LAB.P`: тёмная студия (`void`, `navy`), металлы (латунь `brass`, медь `copper`, хром, чёрный металл), свет-акценты: `cyan` - главный (заголовки, вода, давление), `orange`/`amber` - жар, кофе, огонь, `violet` - время, аромат, `ok` - только «готово», `red` - запрет. Один цвет на один смысл.
2. **Объём и свет**: предметы из материалов `mat(g, вид, …)`, в разрезе (`tank`, `cup`, `scan`), свет только аддитивный: `glow`, `beam`, `flow`, `rays`. Фон всегда `studio` (размыт, как вне фокуса) или своя тёмная заливка.
3. **Текст**: `header` - белая строка 50px + крупный голубой заголовок 110–200px с градиентом и свечением; подписи деталей - `callout` (точка-якорь, линия, тёмная пилюля 44px); числа и служебное - моно. Коротко: ключевые слова и числа, до 3 блоков, без «-».
4. **Сетка 9:16**: заголовок слева y 200–560, статус `chip` справа y 150, один крупный предмет в середине y 560–1450 на стенде или подиуме, пульт `readouts` внизу y 1508–1676.
5. **Камера живёт всегда**: `camera` + `layer`: после склейки наезд с оседанием, затем дрейф; фон слоем 0.2–0.3 (параллакс). Для тяжёлых сцен `zoom:false` (оседание сдвигом и панорама).
6. **Движение**: детали входят пружиной (`spring`, `eb`), текст по словам без перелёта (`say`, `header`), уход быстрее появления (`out`). Внутри предметов всегда что-то течёт: `flow`, `bubbles`, `steam`, `stream`, накал `coil`.
7. **Склейки**: на ключевом слове (`LAB.at(i,'слово')`), жёсткие, план меняется каждые 3–5 с. Фирменные ходы: курсор кликает и предмет раскрывается срезом (`cursor`, `click`, `scan`); «разобрать» (`apart`); перевод фокуса (`blur`, `focus`).
8. **Сквозное**: один предмет-герой через весь ролик, пульт-счётчики набегают по смыслу, статус-метка меняется по сюжету, в конце значок `badge`.

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

## Рецепт сильного ролика
1. Мир - лаборатория, тема разобрана на стенде. Один предмет-герой в разрезе через весь ролик, остальное - его крупные планы.
2. Хук: с первого кадра предмет на стенде, к 0,5 с крупный заголовок; к 1,3 с курсор кликает, корпус раскрывается `scan`.
3. На фразу - один план: общий → крупно деталь → прибор (`gauge`, `scale`, `odo`) → сравнение → итог на `pedestal`.
4. Числа фразы - крупно в заголовке (`odo` бежит к значению к моменту слова) и в пульте `readouts`; статус `chip` меняется по сюжету; финал - `badge`.
5. Выноски `callout` - на слове, 1–2 на план.

## Звук
Стилю подходят «интерфейсные» звуки: click, toggle_on при раскрытии, pop_soft/pop_high на выноски и слова, woodblock на появление карточек, counter/odometer/tally под бегущие числа, bubble/drop/bubble_down для жидкостей, wood/rim на удар (стрелка дошла, отметка), marimba_run/kalimba_run на склейки, success/ta_da/magic на итог. Громкость 0.08…0.18, около 30 событий.

## Скорость
Дорого: градиент на весь кадр и крупные спрайты под зумом. Статичное - в `cache` (`tank`, `cup`, `panel` кэшируются сами), в тяжёлых сценах `camera({zoom:false})`, в `draw` - `prewarm`. Нельзя: `document`, `Math.random`, `ctx.filter`, `shadowBlur` в кадре, пиксельные циклы.
