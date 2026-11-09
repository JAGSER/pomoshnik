# Стиль «Морфинг»: одна форма, без склеек

Глобальная `MORPH` уже подключена (саму библиотеку заново не объявляй (свои функции для новых предметов писать можно и нужно)): `const M = MORPH, P = M.P;`.

## Правила
1. **Одна форма через весь ролик** (`M.timeline` + `M.hero`): пилюля-кнопка, круг, карточка, плашка. Она не исчезает и не режется: «сцена» = новое состояние той же формы (размер, скругление, цвет, наклон). Морф - на ключевом слове, не чаще раза в 0,8 с, состояние 1,2–4 с; чередуй чёрное/белое и заметно меняй размер (пилюля ↔ карточка ↔ круг).
2. **Палитра** `M.P`: фон светло-серый (рисует `M.begin`), форма `ink`, карточки `white`, вторичный текст `mute`/`mute2` (на чёрном `onInk2`), дорожки `track`/`trackInk`. В интерфейсе цвет - только градиент плиток `M.tile`/`M.avatar`; `red` только для «отклонить». В **сценах-иллюстрациях** внутри формы (люди, город, природа) - плоские цвета `M.C`. Без текстур, рамок, свечений.
3. **Объём только тенью** (`hero`, `card`, `badge` рисуют её сами), без shadowBlur.
4. **Шрифт** `M.F.ui` (500/600/700), числа барабаном `M.roll`, время и мелкие метки `kind:'mono'`. Заголовки ≥ 90 px, текст ≥ 44 px, подписи 32–40 px серым. Всегда `max` у текста в коробке.
5. **Раскладка 9:16**: статус `M.hud` y≈172; подпись y≈300…620 (надзаголовок + до 2 строк); форма в зоне y 680…1640 по центру, карточки шириной 900; ничего ниже 1690.
6. **Движение**: форма - пружиной (делает `timeline`); содержимое появляется после посадки (расфокус → резкость, `delay` 0,1–0,2 с) и уходит быстрее. Внутри каскад 0,1 с на строку; текст без перелёта, интерфейс с лёгким.
7. **Курсор** (`M.pointer`, `M.press`, `M.ripple`) - только если по теме кто-то нажимает (приложение, сайт, выбор) или клик сам является событием из озвучки (включить свет, погасить маяк). Подъезжает за ~0,5 с, на клик сжимается, форма проседает; вне кликов скрыт. В рассказе о месте, людях, природе может не быть вовсе.
8. **Подписи** - конспект 1–4 слова из самой фразы, ключ `*слово` в чёрной пилюле, слова в момент произнесения (`at`). Только по теме ролика: никаких выдуманных подписей («по набережной», «тихий час»), чужих слов из примера и английского.
9. **Камера** - `M.cam` (толчок на морфе, дыхание), фон в противоход (`begin` с dx/dy), блики `M.floaters`. Успех - `M.burst`, без случайных взрывов.
10. **Слово = картинка**. Всё, что названо в озвучке, рисуется предметом (типовые объекты ниже или своя функция в том же плоском языке), а не словом, значком `user`/`capsule` или пустой карточкой. Форма для этого морфит в «окно-сцену» (карточка 900×700…900, `fill` белый или чёрный для ночи) и внутри живёт иллюстрация.
11. **Люди, если о них речь**: рыбаки, продавцы, дети, рабочие, бабушка, танцующие - `M.person`/`M.people` с позой по действию (машут → `wave`, бегут → `run`, читает → `hold` + `book`). Аватар-кружок человека не заменяет.
12. **Названный цвет - закон**: «розовое солнце» → `col: M.C.pink`, «синий автобус» → `M.C.blue`, «рыжий пёс» → `M.C.ginger`, «оранжевые куртки» → `shirt: M.C.orange`. Градиент плитки тоже можно задать цветом: `tile(…, seed: '#FF7EB0')`.
13. **Синхрон**: событие (появление, действие, смена числа) начинается на слове ±0,2 с. Число барабаном докручено к моменту произнесения (`count(t, слово − 0.8, слово, …)`), а не после.

## Каркас
```js
const M = MORPH, P = M.P; let TT = 0;
const CL = { go: 5.75 };                                   // клики курсора
const PK = [[0, 1180, 1780], [4.9, 700, 1190]];             // [старт движения, x, y]
const CAPS = [[0.1, 2.3, 'онлайн', 'Запись к *врачу', { at: [0.15, 0.45, 0.8] }]];
const btn = (g, B) => M.text(g, 'Начать', B.cx, B.cy, 66, { w: 600, col: P.white, al: 'center', max: B.w - 90 });
const scene = (g, B, lt) => { M.sun(g, B.x + 700, B.y + 220, 90, { col: M.C.pink }); M.sea(g, B.x, B.y + 420, B.w, B.h - 420);
  M.boat(g, B.x + 200 + lt * 60, B.y + 440, 300, { col: M.C.red, crew: [{ shirt: M.C.orange, pose: 'wave' }] }); }; // «розовое солнце», «рыбак машет»
const TL = M.timeline([
  [0, { x: 540, y: 1130, w: 640, h: 228, r: 'pill', fill: P.ink, split: .5, rot: -16, float: 12 }],
  [2.4, { w: 620, h: 176, split: 0, rot: 0, draw: btn, delay: .14 }],
  [6.0, { y: 1170, w: 900, h: 760, r: 64, fill: P.white, draw: scene }],
]);
const HITS = TL.times.filter(x => x > 0);
function draw(t, k) {
  TT = t; const b = TL.at(t), g = M.begin(t, k, { dx: (540 - b.cx) * .05, dy: (1150 - b.cy) * .06 });
  M.floaters(g, t);
  M.cam(g, t, HITS, g => {
    M.hero(g, TL, t, { press: M.press(t, [CL.go]), scale: M.lerp(.74, 1, M.spring(t + .02, 260, 17)) });
    const c = M.pointer(t, PK); M.ripple(g, c.x, c.y, t - CL.go, { col: P.white });
    if (t > 4.8) M.cursor(g, c.x, c.y, { press: M.press(t, Object.values(CL)) });
  });
  M.hud(g, t, { t0: 6.1, text: M.mmss(t - 5.75), steps: 4, step: 1 });
  M.captions(g, t, CAPS);
}
```
Пиксели кадра, секунды ролика (`lt` - от начала состояния), углы в градусах.

## API
**Кадр**: `begin(t,k,{dx,dy})`→g · `floaters(g,t,{n,a})` · `cam(g,t,hits,fn,{cx,cy})`.
**Время**: `pr(t,a,b)` · `lerp` · `cl` · `eo` `eo5` `ei` `eio` `eb` · `spring(dt,k,d)` 0→1 (`SP.ui/snappy/soft/heavy/text/pop` = [k,d]) · `track(t,[[t,v]…],k,d)` (значение с несколькими целями, без рывков) · `kf([[t,v]…],t)` · `count(t,t0,t1,from,to)` · `rnd(seed)` · `mmss(сек)`→"0:18" · `hm(мин)`→"10:30" · `num(v,d)`→"84 320".
**Форма**: `timeline([[t,{x,y (центр),w,h,r ('pill'|px),fill,split (доля светлой половины капсулы),splitCol,rot,elev,float,draw,delay,din,dout}]…])`→{S,at(t),times}; свойства наследуются от прошлого состояния, `draw`/`float` нет. `draw(g,B,lt,p)`: B = {x,y,w,h,r,cx,cy} - живая коробка, раскладывай от неё; рисуется с обрезкой по форме. `hero(g,tl,t,{press,scale})`→B.
**Появление**: `pres(t,tIn,tOut,{din,dout})`→{a,b,s,dy} · `reveal(g,p,x,y,w,h,fn)` · `blurred(g,b,x,y,w,h,fn)`.
**Курсор**: `pointer(t,[[t,x,y]…])`→{x,y} · `cursor(g,x,y,{press,s,a})` · `press(t,[клики])` 0…1 · `ripple(g,x,y,lt,{col,r})`.
**Текст**: `text(g,s,x,y,size,{w,kind:'ui'|'mono',col,al,max})`→ширина (y - центр строки) · `tw(g,s,font)` · `font(size,w,kind)` · `roll(g,x,y,size,v,fmt,{col,w,al,kind})` (барабан; v дробное) · `typed(s,lt,t0,cps)`.
**Подписи**: `captions(g,t,[[tIn,tOut,'надзаголовок','Слова *ключ и_неразрывно',{at:[моменты слов],size,y,maxW}]…],{y,size})` · `caption(...)`→{bottom}.
**Значки** интерфейса (`icon(g,name,cx,cy,s,col,{rot,lw,a})`): check cross plus minus chev back search clock stopwatch cal bell phone user pin play pause next prev heart · `checkmark(g,cx,cy,s,p,col,lw)`. Медицинские tooth steth child capsule - только для медицинских тем.
**Элементы**: `tile(g,x,y,s,r,seed,glyph)` (градиентная плитка; seed - номер или цвет '#…') · `avatar(g,cx,cy,r,seed,glyph)` · `card(g,x,y,w,h,{r,fill,elev})` · `badge(g,cx,cy,s,{size,dark,icon,p,al,elev})` · `row(g,x,y,w,h,{tile:[seed,glyph],title,sub,right,hover,sel})` · `seg(g,x,y,w,h,items,{sel|lead+trail,on,col,size,bg})` · `toggle(g,x,y,w,h,on)` · `slider(g,x,cy,w,v,{dark,knob})`→x ручки · `progress(g,x,cy,w,v)` · `steps(g,x,cy,n,cur)` · `calendar(g,x,y,w,{title,start (0 = пн),days,free,freeP(j),sel,selP,rh})` + `calLayout(...).cell(d)`→{x,y} · `chart(g,x,y,w,h,vals,p)`→pt(i) · `bars(g,x,cy,w,h,t,{n,amp,col})` · `field(g,x,y,w,h,s,{ph})` · `notice(g,B,{app,when,title,body,glyph,seed})` (все тексты - параметры) · `burst(g,cx,cy,lt,{r0,r1,n})`.
**Статус**: `hud(g,t,{t0,t1,text,label,icon,a,steps,step,done})` - белая пилюля сверху: иконка + моно-счётчик + шаги; `done` 0…1 превращает иконку в галочку.
**Цвет**: `mix(a,b,p)` · `rgba(c,a)` · `grad(...)` · `rr(g,x,y,w,h,r)` · `shadow(g,x,y,w,h,r,{blur,a,dy})`.

## Типовые объекты (плоские фигуры, без обводок; якорь - середина низа на земле; `t` по умолчанию - время кадра)
Цвета `M.C`: red orange yellow green dgreen teal blue navy sky purple pink rose ginger brown beige grey · кожа skin skin2 skin3 · волосы hair blond grey2 · warm (свет окон) sea chalk.
- **Люди**: `person(g,x,y,h,{kind:'adult'|'child'|'old', pose:'stand'|'walk'|'run'|'wave'|'sit'|'hold'|'ride', dir:±1, shirt, pants, dress, skin, hair, hairStyle:'short'|'long'|'bun'|'bald', hat (каска/кепка цветом), bag (рюкзак цветом), item:'book'|'bag'|'phone'|'flag'|'cane'|fn(g,x,y), itemCol, edge, seat, ph})`. Рост: взрослый ~300–420 px в сцене, ребёнок ×0,65. `people(g,x,y,h,[опции person…],{gap:.42, edge})` - ряд без слияния (белый контур, сдвиг фазы шага).
- **Здания**: `house(g,x,y,w,h,{wall,roof,win,door,lit})` · `tower(g,x,y,w,h,{floors,cols,wall,win,lit,litCol,seed})`→число окон · `shop`/`cafe(g,x,y,w,h,{sign,signBg,signCol,wall,awning,awning2})` · `school(g,x,y,w,h,{sign,wall,roof,flag})` · `windows(g,x,y,w,h,rows,cols,{lit,win,litCol})`. `lit` - доля 0…1 или `(i, r) => 0…1` (r - случайный порядок): «гаснут один за другим» = `lit: (i, r) => 1 - M.pr(t, t0 + r * 5, t0 + r * 5 + .3)`.
- **Растения**: `tree(g,x,y,h,{kind:'leaf'|'oak'|'pine', col, trunk})` · `grass(g,x,y,w,{h,col})` · `leaf(g,cx,cy,s,{kind:'maple'|'oval', col, rot})`.
- **Транспорт**: `car(g,x,y,w,{col,dir,spin})` · `bus(g,x,y,w,{col,num:'3',dir,spin})` · `bike(g,x,y,w,{col, rider:{опции person}|false, dir})` · `boat(g,x,y_воды,w,{col,motor,cabin,crew:[опции person…],dir,ph})`. Движение - меняй x от t.
- **Животные**: `dog(g,x,y,s,{col,pose:'stand'|'sit'|'sleep',dir})` · `cat(g,x,y,s,{col,pose:'sit'|'walk'|'sleep'})` · `bird(g,cx,cy,s,{col,pose:'fly'|'sit',ph})`.
- **Небо и природа** (центр): `sun(g,cx,cy,r,{col,rays})` · `moon(g,cx,cy,r,{col,phase})` · `stars(g,x,y,w,h,{n,on (доля зажжённых),col,seed})` · `cloud(g,cx,cy,w,{col})` · `sea(g,x,y_горизонта,w,h,{col,col2,n})` · `hill(g,x,y,w,h,{col})` · `ground(g,x,y,w)` - тень-пятно.
- **Улица**: `lamp(g,x,y,h,{on 0…1,col,light})` · `garland(g,x1,y1,x2,y2,{n,sag,on (сколько горит, дробное) | fn(i),cols})` · `board(g,x,y_верх,w,h,{title,lines:['строка'|['слева','справа']…],p (доля написанного),bg,col,frame})` · `sign(g,cx,cy,'текст',{bg,col,size,pole})`.
Всё рисуй внутри `draw` состояния формы от коробки B (обрезка по форме даёт «окно»). Своё (маяк, кран, рынок) - в том же языке: плоские скруглённые фигуры цветами `M.C`, тень `ground`.

## Рецепт сильного ролика
**Хук**: в 0 с форма уже в «предметном» облике темы (`split`, `rot`, `float`), к 0,8 с подпись с ключом. **Петля**: начни и закончи одной формой. **Морф на каждом ключевом слове**: 8–16 состояний, короткий «островок» 250×78 перед большой карточкой-сценой. **Сквозной герой** - из самой темы (форма-предмет, человек, животное из озвучки), а не обязательный курсор или значок. **Счётчик**: `hud` только если в теме есть время/шаги (часы дня, этапы), числа через `roll`. **Итог** последние 2 с: та же форма + подпись (курсор и `burst`, если по смыслу). Значки, плитки, плееры, переключатели - только когда в теме есть интерфейс.

## Звук
Тихо и точно в события (0,08–0,2): `click` - каждый клик; `bubble` - форма растёт, `bubble_down` - сжимается; `tick` - наведение и шаги ползунка; `counter`/`odometer` - барабан; `abacus` - каскад; `toggle_on/off` - переключение и тост; `notify` - уведомление; `success`/`success3` - итог; `marimba_run`/`kalimba_run` - смена смысла (раздел, финал); `error_soft` - отказ. 25–35 событий: `M.cues(s, [[t, 'имя', громкость, pitch], …])`.

Нельзя: `Math.random`, `Date`, `ctx.filter`, `shadowBlur`, эмодзи, длинное тире.
