# Стиль «Крем-минимал» (глобальная `CREAM`)

`CREAM` уже подключена; своё не объявляй. Рисуй только через `CREAM` и обычный canvas.

## Правила стиля
1. **Палитра** `CREAM.P`: фон `cream` #EEE9E3 или `night` #141414, текст `ink` #151413, единственный акцент `orange` #FF5D18, ручки `white`. Серые: `grey` (на креме), `greyD` (на тёмном), `line`/`mute`/`mid` для дорожек. Без градиентов и свечений. Оранжевых пятен в кадре не больше двух.
2. **Фон** плоский: `bg` + `field` (едва заметная дышащая сетка точек). Сцены чередуют крем, чёрный и короткий оранжевый.
3. **Шрифт**: жирный гротеск строчными (вес 800). Заголовок 150–300 px, строка 64–100 px, подпись 44–66 px вес 600 серым. Ключевое слово оранжевое (`*слово`) или в чёрной пилюле (`hlBox`). Фраза может кончаться оранжевой точкой (`dot:true`).
4. **Герой**: оранжевая точка. Она прыгает по дуге, тянется по скорости и сплющивается при приземлении, становится ручкой тумблера, головой таймера, центром кольца, точкой в конце слова.
5. **Движение**: всё на пружинах `CREAM.SP` (у интерфейса лёгкий перелёт, у текста без перелёта). Текст выезжает из-под маски по словам в такт озвучке, уходит вверх быстрее. Одновременно движется не больше трети элементов.
6. **Переходы** (только эти): круг-заливка из точки (`wipe`, матрёшка оранжевый → чёрный/крем), растр от центра (`halftone`), рывок с размытием (`smear`). После склейки камера оседает (`cam`).
7. **Композиция**: один крупный объект плюс заголовок и до 2 строк. Много воздуха, всё в SAFE (x 60…1020, y 110…1690). Сверху строка состояния (`status`), она рассказывает время и состояние.
8. **Нельзя**: эмодзи, `shadowBlur` в кадре, `Math.random`/`Date`, длинное тире, заголовок по центру на градиенте, «всё плавно проявляется», взрыв частиц.

## Каркас
```js
const C = CREAM, P = C.P;
const CUTS = [0, 2.4, 4.9 /* начала фраз + ключевые слова */];
function s0(g, t, sc) {
  C.bg(g, P.cream); C.field(g, t);
  C.cam(g, sc.lt, g => {
    C.words(g, t, 'уведомления', 64, 470, { size: 66, w: 600, fam: 'text', col: P.grey, i: 0 });
    C.words(g, t, '*отвлекают', 60, 650, { size: 170, i: 0, out: 2.2 });
    const D = C.hop(t, [300, 900], [700, 1200], 1.0, .34, 140); C.dot(g, D.x, D.y, 36, D);
  }, { amp: .04, drift: sc.p });
  C.wipe(g, 540, 1150, C.eo(C.pr(t, 2.05, 2.4)), P.orange); // переход в конце сцены
}
const SC = [s0 /* … */];
function draw(t, k) {
  const g = C.begin(t, k), sc = C.cuts(t, CUTS);
  g.save(); SC[sc.i](g, t, sc); g.restore();
  C.status(g, { time: C.clock(540 + t / 3), on: C.switchAt(t, 10).on, dark: 0 });
}
function sound(s) { s.play(2.4, 'bubble', .14, { pitch: .8 }); }
```
Время везде глобальное (`t`, с); `sc.lt` только для камеры. Переход: закрывай в конце старой сцены, открывай в начале новой.

## API (px, секунды, углы в радианах; цвета HEX)
**Время**: `cl(x,a,b)` · `pr(t,a,b)`→0…1 · `lerp` · `eo` `eo5` `ei` `eio` `eback` · `spring(dt,k,d)`→0→1 с затуханием · `sv(dt,k,d)` скорость · `SP.snappy|ui|soft|heavy|bouncy|jelly` (`[k,d]`, разворачивай `...C.SP.ui`) · `track(t,[[t,v]…],k,d)` пружина к новым целям · `kf([[t,v]…],t)` · `bump(t,t0,dur)`→0…1…0 · `hash(n)` · `rnd(seed)` · `at('слово', i)`→момент слова фразы i.
**Кадр**: `begin(t,k,bg?)`→g · `cuts(t,CUTS)`→{i,t0,t1,lt,d,p} · `cam(g,lt,fn,{amp,drift,zoom,cx,cy,dx,dy,push,rot})` · `shake(g,lt,t0,dur,amp)`.
**Фон и переходы**: `bg(g,col)` · `field(g,t,{dark,gap,r,speed})` · `wipe(g,cx,cy,p,col)` · `hole(g,cx,cy,r,col)` · `halftone(g,p,{cx,cy,col,gap,band})` (p 0→1 закрывает, 1→0 открывает) · `smear(g,dx,dy,n,fn)`.
**Текст**: `words(g,t,spec,x,y,o)`→{top,bottom,w,size,end:{x,y,r}}. spec: `'одно *касание / 25@18.6 мин@+.3'` (`*` ключ, `/` перенос, `@t`/`@+dt` время; без времени слово ищется в фразе `o.i`). o: `size, w, fam('sans'|'text'), al, maxW, col, hl, hlBox, dark, fx('rise'|'whip'|'pop'), dur, out, shift, dot, dotCol, lh`. Длинное слово само ужимается до maxW. · `text(g,s,x,y,size,{w,col,al,max,a,fam})`→{w,size} · `label(g,s,x,y,{size,dark,al})` · `digits(g,s,x,y,size,{al,col,w})` (табличные цифры) · `odo(g,v,n,x,y,size,{al,a})` механический счётчик · `clock(min)`→'09:30' · `font(size,w,fam)` · `measure` · `fit`.
**Формы**: `circle(g,x,y,r,col)` · `rr(g,x,y,w,h,r)` путь · `shadow(g,x,y,w,h,a)` · `pill(g,cx,cy,w,h,{col,line,lw,ring,ringOff,ringW,sh})` · `chip(g,s,cx,cy,{size,bg,col,dot})`.
**Герой и интерфейс**: `dot(g,x,y,r,{vx,vy,land,col})` · `hop(t,[x,y],[x,y],t0,dur,h)`→{x,y,vx,vy,land,p} · `hops(t,[[tStart,x,y]…],{dur,h})` · `trail(g,posFn,t,r,{n,step})` · `switchAt(t,tOn,tOff?)`→{on,v} · `toggle(g,cx,cy,w,on,{v,h,dark,off,onCol,knob,ring,sh})`→{kx,ky,r,h} (h=0.56w, ручка оранжевая) · `knob` · `notif(g,cx,cy,w,{col,fg,text,sleep,sh,a})` (уведомление-пилюля; sleep 0…1 закрывает глаз) · `pulse(g,cx,cy,w,h,t,{col,a})` звонок · `ping(g,x,y,r,q,{col})` · `touch(g,x,y,t,tTap,{r,dx,dy})` · `cursor(g,x,y,s,press)` · `check(g,x,y,s,p,col,lw)` · `phone(g,cx,cy,h,{sh},fn(g,x,y,w,h))`.
**Диаграммы**: `ring(g,cx,cy,r,p,{lw,draw,ticks,dark,col,head})`→{x,y,a} таймер · `graph(g,x,y,w,h,p,{axes,label,labelAl,dark})`→{x,y,ty} пружинный график · `springCurve(u)` · `string(g,x0,x1,y,{push:{x,d,w},vib:{lt,amp,f},col})`→yAt мембрана · `wave(g,x0,x1,y,t,{amp,len,speed})`→yAt · `ring3d(g,cx,cy,R,{text,ang,tilt,p,maxSize,front,back,mid:g=>…})` 3D-кольцо из букв · `grid(g,cx,cy,cols,rows,gap,{r,at:n=>t,k:n=>0…1,skip})` сетка событий.
**HUD**: `status(g,{time,on,v,dark 0…1,label,a})` строка состояния телефона (время слева, мини-тумблер справа).

## Рецепт сильного ролика
1. Мир-метафора из одного предмета интерфейса (тумблер, таймер, кнопка, график). Оранжевая точка ведёт сквозную историю и меняет роль в каждой сцене.
2. Хук до 1 с: крупный объект и точка; крупное слово до 1,5 с.
3. Сцена 2,5–4,5 с, склейка на ключевом слове: `CUTS` = начала фраз + моменты слов (`C.at`). Фон чередуй: крем, чёрный, оранжевый (на оранжевом текст `ink`, ключ в `hlBox: P.ink`).
4. На каждое слово-событие своё микродвижение: прыжок точки, щелчок тумблера, прокрутка счётчика, прогиб мембраны.
5. Счётчик со смыслом (`odo`, `ring`, `clock` в `status`) и метка (`chip`, `pill` с `ring`).
6. Переход: точка разрастается в `wipe` нового цвета; в тёмную сцену веди через `halftone` от точки; для «рывка» используй `smear`.
7. Финал (последние 2 с): название + оранжевая точка + включённый тумблер + призыв в чёрной пилюле, всё неподвижно и читаемо.

## Звук
Сухие короткие щелчки: `toggle_on/off`, `click` (интерфейс), `pop_soft`/`pop_high` (появление пилюль, повышай pitch по очереди), `bubble`/`bubble_down` (круг-заливка, растр), `woodblock` (приход большого слова), `drop` (точка приземлилась), `odometer`/`tick` (счётчики), `kalimba_run`/`marimba_run` (смена сцены), `success`/`success3` (итог). Громкость 0,08–0,2, 25–35 событий, самые сильные на склейках.
