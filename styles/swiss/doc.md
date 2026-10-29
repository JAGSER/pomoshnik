# Стиль «Швейцарский постер» (библиотека `SWISS`)

`SWISS` уже подключена, своё не объявляй. Ролик: серия плакатов, сплошные поля, огромный гротеск, курсив, тонкий HUD, упругое движение.

## Правила
1. **Поля**: `red` `blue` `cream` `black` `yellow` на весь кадр. Каждая сцена меняет поле, два одинаковых подряд нельзя. Цвета поля в `s.f`: `fg` текст, `acc` и `alt` акценты. Палитра `P`: red, blue, cream, black, yellow, ink, white. Без градиентов и теней.
2. **Набор**: в сцене одно огромное слово `wide` (капс, 130–260 px, 70–95 % ширины) + курсив `serif` строчными 76–100 px (`*ключ` подсвечен) или разрядка `caps` 50–60 px. `mono` 24–30 px только для меток. До 3 текстовых блоков. Только ключи, числа, подписи. Без «—».
3. **Сетка**: поля 96 px, ось по центру или левый край x=96. Контент в y 220…1600 (HUD занимает верх и низ). Один крупный предмет; слово то сверху (y≈520), то снизу (y≈1580). Линейки `rule` с моно-метками делят блоки.
4. **Движение**: только пружины (`sp`, `track`) и ease-out. Буквы `wide` «надуваются», предметы выпрыгивают (`'pop'`), уход быстрее входа (`out`). Фон живёт всегда.
5. **Склейки** на ключевом слове фразы: `iris` из позиции героя (матч-кат), `wipe` с цветным блоком `band`, `tiles`, `bands`, `slide`, жёсткая `cut`. Камера после склейки оседает сама.
6. **Сквозной герой** (предмет темы) в каждой сцене меняет роль, цвет, форму (`morph`). Счётчик `odo` и глава в HUD ведут прогресс.
7. **Последним** в draw: `grain`, затем `hud`.

## Каркас
```js
const S = SWISS, P = S.P, NAMES = ['ИНТРО', 'ШАГ' /* по фразам */];
const SC = [
  { at: 0, field: 'black', draw: (g, lt, s) => {
    S.rings(g, 540, 1100, 200, { lt, col: s.f.fg });
    S.wide(g, 'Слово', 540, 520, 200, { lt, t0: .05, col: s.f.fg });
    S.serif(g, 'на *ключе', 540, 650, 88, { lt, ts: [s.w('на'), s.w('ключе')], col: s.f.fg, acc: s.f.acc, al: 'center' });
  } },
  { at: [0, 'ключе'], field: 'red', tr: 'iris', x: 540, y: 1100, draw: (g, lt, s) => { /* … */ } },
];
function draw(t, k) {
  const g = S.begin(t, k), s = S.play(g, t, SC), sub = k.sub(t);
  S.grain(g, .9);
  S.hud(g, t, { field: s.f, title: 'ТЕМА · ПЛАКАТ', chap: sub.i, chapAt: sub.t0, total: k.subs.length, name: NAMES[sub.i] });
}
function sound(s) { const C = SWISS.cutTimes(SC, s.subs), at = (i, w) => SWISS.at(i, w, s.subs);
  s.play(C[1], 'marimba_run', .17); s.play(at(0, 'ключе'), 'pop_double', .16); }
```
**Сцена**: `{at, field, tr, dir, x, y, band, n, dur, cam, draw}`. `at` в секундах или `[фраза, 'слово']` (можно 2 слова: `'с семи'`). `tr`: cut | iris (x, y центр) | wipe (dir up/down/left/right, band цвет) | bands (n, dir 'side') | tiles (x, y откуда) | slide (dir). `cam`: `{kick .06, push .035, rise 26, pan, x, y}`.
**draw(g, lt, s)**: `lt` секунды от склейки; `s` = `{i, lt, d, p, f, ph}`; `s.w('слово', фраза?)` момент слова от склейки, синхронизируй всё через него.

## API (px, секунды, углы в градусах)
**Время**: `cl` `pr(t,a,b)` `lerp` `eo` `ei` `eio` `eb(p,c)` · `sp(t,name)` пружина 0→1 (snap, soft, heavy, text без перелёта, pop, jelly) · `spring(t,k,d)` · `track(t,[[t,v]…],name)` пружиной между целями · `kf(A,t)` · `life(lt,t0,out)`→{e,a,on} · `hash(n)` `rnd(seed)` `wob(t,f,seed)` `step(t,fps)` · `z2` `tc(t)` таймкод · `mix(a,b,p)` `rgba(c,a)` · `roast(p)` шкала сырое→чёрное.
**Фразы**: `words(i)`→[{w,t}] · `at(i,'слово')` абсолютное время · `phraseAt(t)` · `cutTimes(SC,subs)`.
**Кадр**: `begin(t,k)`→g · `play(g,t,SC)`→s · `field(g,f)` · `fieldOf(f)` · `grain(g,a)` · `layer(g,lt,depth,fn)` параллакс.
**Текст** (все принимают `lt`, `t0`, `col`, `out` время ухода):
- `wide(g,s,x,y,size,{al,max,mode:'stretch'|'rise'|'slide',stag,dot:цвет,mark:цвет плашки})`→{x0,x1,w,size,top,dx,dy}: капс, ужимается до `max`, `dot` точка-акцент.
- `serif(g,s,x,y,size,{al,max,lines,ts:[время слова],acc})`→{w,h,size}: курсив по словам, `*ключ` цветом `acc`.
- `caps(g,s,x,y,size,{al,max,cps,track})` разрядка капсом · `mono(g,s,x,y,size,{al,bold,type,scramble,cps})` метка, печать или перебор знаков.
- `rule(g,x0,y,x1,p,{l,r,bl,br,col})` линейка с метками · `marker(g,x,y,w,h,p,col)` · `bracket(g,x,y,w,h,p,{col,pad})` уголки выделения · `ringText(g,s,x,y,r,size,{p,spin,col,acc,lt})` текст по кругу · `odo(g,v,digits,x,y,size,{al,col,lt,t0})` счётчик-барабан, дробное v катит цифры.
**HUD**: `hud(g,t,{field,title,chap,chapAt,total,name,bpm,progress})` уголки, глава 01/08, таймкод, BPM · `corners` `beat`.
**Фоны и паттерны**: `rings(g,x,y,r0,{n,gap,lt,col,period})` кольца и импульсы · `dotGrid(g,{step,lt,waves:[{x,y,t0,hold}],col,acc})` точки с волной · `truchet(g,{size,lt,beats:[t…],col,col2})` трюше, переворот волной на beat · `globe(g,x,y,R,{lon,tilt,col,marks:[{lat,lon}]})`→экранные точки меток · `dotPlane(g,{lt,horizon,col,acc})` точечная плоскость · `specks(g,x,y,lt,{n,cols})` конфетти (только на смысловой удар).
**Фигуры**: `morph(g,x,y,r,a,b,p,{rot,fill,line})` формы circle bean star tri square hex · `star(g,x,y,r,{fill})` · `trail(g,n,dx,dy,fn)` смаз · `orbit(g,x,y,R,n,{lt,t0,stag,spin,rot},fn(g,x,y,i,e,a))` кольцо из n предметов · `transformBox(g,x,y,w,h,{a,rot,col,label})` рамка с ручками · `annot(g,x,y,tx,ty,'строки',{p,col})` выноска · `easeRow(g,x,y,w,label,p,{ease,item,end})` строка «из A в B» · `ruler(g,x,y,w,{n,a,b,p,d})`→{xa,xb} шкала.
**Предметы** (s=1 ≈ 300 px): `bean(g,x,y,r,{roast|col,groove,rot,flip})` · `beanPop(g,lt,t0,x,y,r,o)` · `lockup(g,x,y,size,'СЛОВО',{lt,t0,col,mark,max})` знак + слово · `cup(g,x,y,s,{col,band,lt})` · `cupTop(g,x,y,r,{rot,art})` · `croissant(g,x,y,s,{lt,t0,cols})` · `steam(g,x,y,h,lt)` · `clock(g,x,y,r,h,m,{face,sec})` · `gift(g,x,y,w,h,{p})` · `plate(g,x,y,'15',size,{e,bg})` · `pin(g,x,y,r)` · `tube(g,pts,p,{w,cols})` полосатая трубка · `mapGrid(g,x0,y0,x1,y1,{p,step})`.
Чего нет, рисуй сам: плоские круги и прямоугольники, `morph`, `orbit`, 1–2 цвета.

## Рецепт сильного ролика
1. **Хук**: с первого кадра слово `wide` и герой, падающий пружиной в кольца.
2. **Склейка на ключевом слове**, 10–14 сцен на 35 с, каждые 2–4 с новое поле и раскладка: слово сверху/снизу, строки, число на весь кадр, сфера, карта.
3. **Матч-кат**: `iris` из точки, где стоит герой.
4. **Числа** `odo` набегают в момент слова, `ruler` заполняется.
5. **Финал** (3–4 с): `lockup`, `rule` с выходными данными, плашка с призывом, печать `ringText`.
6. Одновременно движется не больше трети элементов; каскад букв укладывается в 0,5 с.

**Звук** (сухой, перкуссия, громкость .1–.18, 25–35 событий): смена поля marimba_run, kalimba_run, rim, bamboo; главное слово pop_double; точки и метки pop_high, tick, woodblock, click; числа counter, odometer; финал и подарок success, ta_da, sparkle. Сильнее всего на склейках.

Нельзя: `Math.random`, `Date`, `document`, `ctx.filter`, `shadowBlur`, эмодзи, длинное тире.
