# Стиль «Финансовый канал» (FINS)

`FINS` уже подключена, саму библиотеку заново не объявляй (свои функции для новых предметов писать можно, в том же языке: плоская заливка, контур `C.dark`, цвета `C`). Язык стиля: почти чёрный зелёный фон в линейку, жёлтый и красный акценты, огромные слова капсом слева, тёмные панели со скруглением, в панелях графики или плоские картинки.

## Правила
1. Палитра `FINS.C`: фон `dark`, панели `panel`, линии `line`, `yellow` (главное слово), `red`, `green`, `text`, `muted`, `faded`, `ink`; для предметов ещё `blue pink purple orange ginger brown grey white skin skin2 wood sea night pine chalk`. Цвет, названный в тексте (розовое солнце, синий автобус, рыжий пёс), соблюдай точно, ближайшим цветом `C` или своим hex.
2. Говорится о людях, животных, предметах: рисуй их (см. «Типовые объекты»), а не слово, цифру или график вместо них. Люди делают то, что сказано (идут, машут, читают, танцуют).
3. Событие появляется в момент своего слова (по таймингу фразы), не раньше и не позже; цифры счётчиков доезжают до значения к моменту слова.
4. Надписи только из текста темы. Не выдумывай факты, даты, лозунги; без английских слов и длинного тире.
5. Слова: `word` капсом, 900, 100–130 px, слева x 80, 1–2 слова на строку; под ним `note` одной строкой. Картинка в панели сверху (y 300–1250), слово под ней (y ≈ 1400).
6. Графики (`candles`, `metrics`, `bars`, `curve`) только когда в тексте есть цифры для сравнения или роста. Свечи только про рынок и цены, не как заполнитель.
7. Элементы канала только если тема про канал, блог, деньги: `top` с рубрикой «01/04», хук «старая мысль → `strike`», жёлтый взрыв `burst` с огоньком `flame`, карточка `profile` с подпиской. Иначе: `top(g, тема)` без рубрики или без шапки, финал по смыслу темы. Сквозной герой берётся из темы (человек, животное, предмет из озвучки).
8. Одна сцена может быть жёлтой: `bg(g, true)`, текст на ней `C.ink`.
9. Деньги в рублях, без инвестиционных советов.
10. Звуки: `drop` на слова, `error_soft` на зачёркивание, `marimba_run`/`counter`/`odometer` на графики, `ta_da` на взрыв, `click`/`success3` на кнопки. Склейки `cutSounds(s, CUTS, 'rim', 0.08)`.

## API канала
- `scene(t, cuts)` → `{i, lt, dur}`; `cam(g, lt, cx, cy, k)`; `bg(g, yellow)`.
- `top(g, имя, n?, total=4, ярлык='')`; `word(g, s, y, t, t0, col, size)`; `note(g, s, y, col)`; `strike(g, x, y, w, t, t0)`.
- `panel(g, x, y, w, h)`; `candles(g, x, y, w, h, t, t0, {label, badge})`; `metrics(g, [[подпись, значение, 0..1, цвет] ×4], y, t, t0)`; `bars(g, [[a, b]...], [имяA, имяB], подписи, x, y, w, h, t, t0)`; `curve(g, t, t0, {x, y, w, h, max, d, ticks})`.
- `flame(g, x, y, s, t)`; `burst(g, t, cx, cy)`; `letters(g, s, y, size, t, t0, col)`.
- `profile(g, имя, подзаголовок, [[число, подпись] ×3], on, t, t0, {y, line, btn: [текст, текст после нажатия], icon(g, x, y)})`; `cursor(g, x, y, press, s)`.
- Утилиты: `cl eo eio sp mix font rr words count shade(hex, ±k) hash(i, seed) line(g, pts, w, col) blob(g, path, col) fit(g, s, w, size)`.

## Типовые объекты
(x, y) у всех точка на земле под серединой; s масштаб; o параметры, все цвета через o; t для движения; `dir: -1` разворот.
- `person(g, x, y, s, o)` человек ≈ 200·s px. o: `age` 'adult'|'child'|'old'; `pose` 'stand'|'walk'|'run'|'wave'|'sit'|'hold'|'ride'; `t, phase`; `shirt pants skin hair shoe`; `hat` (каска цветом), `bag` (рюкзак цветом), `long`, `glasses`, `shout`, `cane`; `item(g, hx, hy)` рисует предмет в руке.
- `crowd(g, x, y, s, [o...], gap, t)` несколько людей в ряд, не сливаются (тёмный контур).
- `house(g, x, y, w, h, {wall, roof, lit})`; `tower(g, x, y, w, h, {wall, floors, cols, lit: 0..1 | fn(j), grow: 0..1})` многоэтажка, окна гаснут при уменьшении `lit`, `grow` строит снизу; `shop(g, x, y, w, h, {wall, awning, sign, kind: 'cafe'})`; `school(g, x, y, w, h, {sign, flag})`; `bench(g, x, y, w, {col})` (сиденье на высоте 48).
- `tree(g, x, y, s, {kind: 'oak'|'pine', leaf, trunk, t})`; `grass(g, x, y, w, {col, t})`; `leaf(g, x, y, s, угол, col)` кленовый; `leaves(g, x, y, w, h, t, {n, cols})` листопад.
- `car(g, x, y, s, {body})`; `bus(g, x, y, s, {body, num})`; `bike(g, x, y, s, {frame, rider: {...person}, t})`; `boat(g, x, y, s, {hull, stripe, cabin, crew: [{...person}], wake, t})` (y = линия воды).
- `dog(g, x, y, s, {fur, sleep, t})`; `cat(g, x, y, s, {fur, t})`; `bird(g, x, y, s, {col, t, phase})` чайка.
- `sun(g, x, y, r, {col, glow})`; `moon(g, x, y, r, {col, bg})`; `stars(g, x, y, w, h, t, {n, show: 0..1})`; `cloud(g, x, y, s, {col})`; `sea(g, x, y, w, h, t, {col, glint, gx})`; `hill(g, x, y, w, h, {col})`.
- `lamp(g, x, y, s, {on: 0..1, col})`; `garland(g, x0, y0, x1, y1, {n, on: 0..1, cols, t})`; `board(g, x, y, w, h, [строки], {title, t, t0, at: [время строки]})` доска мелом, строки пишутся по одной (с t0 через 0,6 с или в моменты at); `sign(g, x, y, текст, {bg, col, size})`.
- `stage(g, x, y, w, h, {sky: [верх, низ]}, () => {...})` панель стиля с картинкой внутри, всё обрезается по её краю.

## Каркас
```js
const F = FINS, C = F.C;
const CUTS = [0, 3.2, 6];
function draw(t, k) {
  const g = k.g, { i, lt } = F.scene(t, CUTS);
  F.bg(g, false); g.save(); F.cam(g, lt, 540, 960, 0.5);
  if (i === 1) { F.stage(g, 60, 300, 960, 900, { sky: ['#2A1E3A', '#7A4A6A'] }, () => { F.sun(g, 300, 900, 90, { col: C.pink }); F.sea(g, 60, 900, 960, 300, t); F.boat(g, 640, 980, 1, { t, wake: true, crew: [{ shirt: C.orange }] }); }); F.word(g, 'РАССВЕТ', 1400, t, CUTS[i] + 0.2, C.yellow); }
  g.restore();
}
```

## Типовые ошибки
- Слово длиннее 12 букв в одну строку: раздели на две строки `word`.
- Объект обрезан краем панели: держи его целиком внутри `stage`, если он не въезжает специально.
- Надзаголовок налезает на крупное слово: между ними не меньше 0,9 размера слова.
- На жёлтом фоне текст только `C.ink`.
