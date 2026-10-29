# Стиль «Морфинг»: одна форма, без склеек

Глобальная `MORPH` уже подключена (своё не объявляй): `const M = MORPH, P = M.P;`.

## Правила
1. **Одна форма через весь ролик** (`M.timeline` + `M.hero`): пилюля-кнопка, круг, карточка, плашка. Она не исчезает и не режется: «сцена» = новое состояние той же формы (размер, скругление, цвет, наклон). Морф — на ключевом слове, не чаще раза в 0,8 с, состояние 1,2–4 с; чередуй чёрное/белое и заметно меняй размер (пилюля ↔ карточка ↔ круг).
2. **Палитра** `M.P`: фон светло-серый (рисует `M.begin`), форма `ink`, карточки `white`, вторичный текст `mute`/`mute2` (на чёрном `onInk2`), дорожки `track`/`trackInk`, тост `toast`. Единственный цвет — градиент в плитках `M.tile`/`M.avatar`. `red` только для «отклонить». Без текстур, рамок, свечений.
3. **Объём только тенью** (`hero`, `card`, `badge` рисуют её сами), без shadowBlur.
4. **Шрифт** `M.F.ui` (500/600/700), числа барабаном `M.roll`, время и мелкие метки `kind:'mono'`. Заголовки ≥ 90 px, текст ≥ 44 px, подписи 32–40 px серым. Всегда `max` у текста в коробке.
5. **Раскладка 9:16**: статус `M.hud` y≈172; подпись y≈300…620 (надзаголовок + до 2 строк); форма в зоне y 680…1640 по центру, карточки шириной 900; ничего ниже 1690.
6. **Движение**: форма — пружиной (делает `timeline`); содержимое появляется после посадки (расфокус → резкость, `delay` 0,1–0,2 с) и уходит быстрее. Внутри каскад 0,1 с на строку; текст без перелёта, интерфейс с лёгким.
7. **Курсор** — сквозной персонаж: подъезжает за ~0,5 с до клика (`M.pointer`), на клик сжимается (`M.press`), нажатая форма проседает, расходится `M.ripple`. Каждый клик что-то меняет.
8. **Подписи** — конспект 1–4 слова, ключ `*слово` в чёрной пилюле, слова в момент произнесения (`at`).
9. **Камера** — `M.cam` (толчок на морфе, дыхание), фон в противоход (`begin` с dx/dy), блики `M.floaters`. Успех — `M.burst`, без случайных взрывов.

## Каркас
```js
const M = MORPH, P = M.P; let TT = 0;
const CL = { go: 5.75 };                                   // клики курсора
const PK = [[0, 1180, 1780], [4.9, 700, 1190]];             // [старт движения, x, y]
const CAPS = [[0.1, 2.3, 'онлайн', 'Запись к *врачу', { at: [0.15, 0.45, 0.8] }]];
const btn = (g, B) => M.text(g, 'Начать', B.cx, B.cy, 66, { w: 600, col: P.white, al: 'center', max: B.w - 90 });
const card = (g, B, lt) => M.row(g, B.x + 22, B.y + 120, B.w - 44, 190, { tile: [0, 'tooth'], title: 'Стоматолог', sub: '6 окон' });
const TL = M.timeline([
  [0, { x: 540, y: 1130, w: 640, h: 228, r: 'pill', fill: P.ink, split: .5, rot: -16, float: 12 }],
  [2.4, { w: 620, h: 176, split: 0, rot: 0, draw: btn, delay: .14 }],
  [6.0, { y: 1170, w: 900, h: 760, r: 64, fill: P.white, draw: card }],
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
Пиксели кадра, секунды ролика (`lt` — от начала состояния), углы в градусах.

## API
**Кадр**: `begin(t,k,{dx,dy})`→g · `floaters(g,t,{n,a})` · `cam(g,t,hits,fn,{cx,cy})`.
**Время**: `pr(t,a,b)` · `lerp` · `cl` · `eo` `eo5` `ei` `eio` `eb` · `spring(dt,k,d)` 0→1 (`SP.ui/snappy/soft/heavy/text/pop` = [k,d]) · `track(t,[[t,v]…],k,d)` (значение с несколькими целями, без рывков) · `kf([[t,v]…],t)` · `count(t,t0,t1,from,to)` · `rnd(seed)` · `mmss(сек)`→"0:18" · `hm(мин)`→"10:30" · `num(v,d)`→"84 320".
**Форма**: `timeline([[t,{x,y (центр),w,h,r ('pill'|px),fill,split (доля светлой половины капсулы),splitCol,rot,elev,float,draw,delay,din,dout}]…])`→{S,at(t),times}; свойства наследуются от прошлого состояния, `draw`/`float` нет. `draw(g,B,lt,p)`: B = {x,y,w,h,r,cx,cy} — живая коробка, раскладывай от неё; рисуется с обрезкой по форме. `hero(g,tl,t,{press,scale})`→B.
**Появление**: `pres(t,tIn,tOut,{din,dout})`→{a,b,s,dy} · `reveal(g,p,x,y,w,h,fn)` · `blurred(g,b,x,y,w,h,fn)`.
**Курсор**: `pointer(t,[[t,x,y]…])`→{x,y} · `cursor(g,x,y,{press,s,a})` · `press(t,[клики])` 0…1 · `ripple(g,x,y,lt,{col,r})`.
**Текст**: `text(g,s,x,y,size,{w,kind:'ui'|'mono',col,al,max})`→ширина (y — центр строки) · `tw(g,s,font)` · `font(size,w,kind)` · `roll(g,x,y,size,v,fmt,{col,w,al,kind})` (барабан; v дробное) · `typed(s,lt,t0,cps)`.
**Подписи**: `captions(g,t,[[tIn,tOut,'надзаголовок','Слова *ключ и_неразрывно',{at:[моменты слов],size,y,maxW}]…],{y,size})` · `caption(...)`→{bottom}.
**Значки** (`icon(g,name,cx,cy,s,col,{rot,lw,a})`): check cross plus minus chev back search clock stopwatch cal bell phone user pin play pause next prev heart tooth steth child capsule · `checkmark(g,cx,cy,s,p,col,lw)` (прорисовка).
**Элементы**: `tile(g,x,y,s,r,seed,glyph)` (градиентная плитка) · `avatar(g,cx,cy,r,seed,glyph)` · `card(g,x,y,w,h,{r,fill,elev})` · `badge(g,cx,cy,s,{size,dark,icon,p,al,elev})` · `row(g,x,y,w,h,{tile:[seed,glyph],title,sub,right,hover,sel})` · `seg(g,x,y,w,h,items,{sel|lead+trail,on,col,size,bg})` · `toggle(g,x,y,w,h,on)` · `slider(g,x,cy,w,v,{dark,knob})`→x ручки · `progress(g,x,cy,w,v)` · `steps(g,x,cy,n,cur)` · `calendar(g,x,y,w,{title,start (0 = пн),days,free,freeP(j),sel,selP,rh})` + `calLayout(...).cell(d)`→{x,y} · `chart(g,x,y,w,h,vals,p)`→pt(i) · `bars(g,x,cy,w,h,t,{n,amp,col})` · `field(g,x,y,w,h,s,{ph})` · `notice(g,B,{app,when,title,body,glyph})` · `burst(g,cx,cy,lt,{r0,r1,n})`.
**Статус**: `hud(g,t,{t0,t1,text,label,icon,a,steps,step,done})` — белая пилюля сверху: иконка + моно-счётчик + шаги; `done` 0…1 превращает иконку в галочку.
**Цвет**: `mix(a,b,p)` · `rgba(c,a)` · `grad(...)` · `rr(g,x,y,w,h,r)` · `shadow(g,x,y,w,h,r,{blur,a,dy})`.

## Рецепт сильного ролика
1. **Хук**: в 0 с форма уже видна в «предметном» облике темы (капсула, монета, билет: `split`, `rot`, `float`), к 0,8 с подпись с ключом.
2. **Петля**: начни и закончи одной и той же кнопкой.
3. **Морф на каждом ключевом слове**: 8–16 состояний; короткое промежуточное (чип, «островок» 250×78) перед большой карточкой усиливает переход.
4. **Курсор ведёт историю**: наведение по списку под перечисление (подсветка `track`), клик = выбор; при перетаскивании ручка и курсор на одних ключах.
5. **Счётчик и штамп**: `hud` (секундомер, шаги) + `badge`-штамп после успеха; числа через `roll`.
6. **Итог** последние 2 с: кнопка + подпись + курсор на кнопке, `burst` на касание.

## Звук
Тихо и точно в события (0,08–0,2): `click` — каждый клик; `bubble` — форма растёт, `bubble_down` — сжимается; `tick` — наведение и шаги ползунка; `counter`/`odometer` — барабан; `abacus` — каскад; `toggle_on/off` — переключение и тост; `notify` — уведомление; `success`/`success3` — итог; `marimba_run`/`kalimba_run` — смена смысла (раздел, финал); `error_soft` — отказ. 25–35 событий: `M.cues(s, [[t, 'имя', громкость, pitch], …])`.

Нельзя: `Math.random`, `Date`, `ctx.filter`, `shadowBlur`, эмодзи, длинное тире.
