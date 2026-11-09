# Стиль PLK: плакат-эссе

Редакционный документальный ролик: неторопливый, много пустоты, мысль за мыслью. Три фона (почти чёрный со звёздной пылью, тёплая кремовая бумага с виньеткой, сплошной красный в финале), узкий жирный гротеск капсом, антиква в цитатах, тонкий моно-HUD. Мир темы (люди, дома, транспорт, животные, природа) рисуется плоскими плакатными силуэтами без обводок и градиентов. Тема любая.

## Палитра (`PLK.C`)
- Фоны: тёмный #0A0A12, бумага #ECE6DD, красный #E1372A (только финал). Текст: на тёмном крем `cream` #EEE5DA, на бумаге тушь `ink` #0B0A10.
- Акценты: красный `red` #E2362B (ключевое слово, зачёркивание), охра `gold` #E2AC4C (ключевое слово на тёмном), маркер `hl` #EAC984 (на бумаге под 1–3 словами). Серые `bar1/bar2`.
- Тона объектов: `blue yellow green purple orange pink ginger brown sky glass stone leaf pine`, кожа `skin skin2 skin3`, волосы `hairDark hairBlond hairGray`.
- **Цвет, названный в тексте, соблюдается** (розовое солнце `C.pink`, оранжевые куртки `C.orange`, синий автобус `C.blue`, жёлтый кран `C.yellow`, рыжий пёс `C.ginger`): ближайшим тоном палитры, никогда не подменяется красным акцентом. Градиентов на фигурах нет; свечение только у фонарей, гирлянд и красного шара.

## Шрифты
- Заголовок `head`: гротеск 700, сжатый 0.72, капс, 130–240 px (сам ужимается под 920 px).
- Кикер `kicker`: 22–32 px капс с разрядкой, красный квадратик. Цитата `quote`: антиква 56–72 px, курсив 58–90 px. Моно `mono` 17–22 px: HUD и подписи.

## Композиция (1080×1920)
- Поля x 80…1000, ниже y 1690 ничего. Кадр = заголовок/кикер сверху (y 300–700) + **иллюстрация сцены** в середине и внизу (y 700–1650), или цитата + атрибуция.
- Если в фразе есть люди, место, предмет или животное, они **нарисованы** типовыми объектами, а не заменены словом, графиком, фишками или точками. Абстракции (`bars`, `chess`, `constellation`, `columns`, `venn`) только для чисел и понятий.
- Объекты целиком в кадре: ничто важное не режется краем, текст не налезает на фигуры.
- HUD всегда: уголки, `label` (метка ролика по его теме, 2–3 слова), таймкод, глава «03 - НАЗВАНИЕ», счётчик кадров.
- Огромные контурные цифры (`outlineNum`) фоном на бумаге для чисел из текста.

## Синхронизация и надписи
- Событие появляется в момент своего слова (время слова оценивай по положению в фразе: t0 + доля символов × длительность), а не в начале сцены и не после неё. 1 мысль = 1 фраза, длинную фразу дели на 2–3 смены внутри сцены.
- Надписи только по теме ролика и на русском: никаких подписей из примера, вымышленных авторов и «эссе» в чужой теме. Цитата с атрибуцией только если в тексте есть прямая речь.
- Сквозной предмет и мотивы (красный шар, циферблат, созвездие, доска с фишками) не обязательны: только если подходят теме. Сквозного героя выбирай из самой темы (человек, животное, предмет из озвучки).

## Текст и графика (функции `PLK`)
- `head(g,"СТРОКА|СТРОКА",{x,y,size,align,col,acc,accCol,lt,t0,step,out})` буквы встают из-под линии, `out` падают. `kicker`, `mono`, `small`, `quote(g,txt,{x,y,w,size,italic,acc,hl,hlAt,marks,bar,lt,t0,step})`, `attrib`, `strike(g,x0,x1,y,p,col,lw)`, `rule`.
- Фоны: `bg(g,"dark"|"paper"|"red")` (запоминает тему для кромки объектов), `dust`, `constellation`, `rings`, `dial`, `glow(g,x,y,r,a,"rgba(..,1)")`, `ball`.
- Графика: `timeline`, `bars` (+`gather` в стопку), `crane` (крюк кладёт блок), `venn`, `chess`, `columns`, `outlineNum(g,"1962",{x,y,size,align,roll,p,a})`.

## Типовые объекты
Всё рисуется от точки земли `y` (у лодки линия воды), `t` = время для анимации (обычно `lt`), `flip` разворот, `edge:false` убирает кромку фона. Цвета параметрами.
- `person(g,x,y,{h,age:"adult"|"child"|"old",pose:"stand"|"walk"|"run"|"wave"|"sit"|"hold"|"dance",t,flip,body,legs,skin,hair,hairStyle:"short"|"long"|"bun"|"none",skirt,hat:"helmet"|"cap"|"kerchief",hatCol,backpack,item:"book"|"box"|"bag"|"flag"|fn(g,hx,hy,u),itemCol,cane})` рост: взрослый 320, ребёнок 200, пожилой 290. Сидящему подставь скамью сам (прямоугольник).
- `crowd(g,x,y,[опции person...],{h,gap,t})` ряд людей, не сливаются (кромка фона).
- `building(g,x,y,{kind:"house"|"tower"|"shop"|"cafe"|"school",w,h,floors,cols,col,roof,lit (0..1 доля горящих окон, гаснут по одному),litCol,seed,p (0..1 стройка снизу),sign,signCol,awning})` x = левый край, вернёт `{top}`. `sign(g,cx,cy,"ТЕКСТ",{col,textCol,size,maxW})` вывеска.
- `tree(g,x,y,{kind:"leaf"|"oak"|"pine",h,col,trunk,autumn,t})`, `grass(g,x0,x1,y,{h,col})`, `leaves(g,lt,{x0,x1,y0,y1,n,cols,s})` падающие кленовые листья, `hill(g,x0,x1,y,{h,col})`.
- `car(g,x,y,{w,col,t})`, `bus(g,x,y,{w,col,num,heads:[цвета голов|null],t})`, `bike(g,x,y,{h,col,t,rider:{опции person}})`, `boat(g,x,y,{w,col,kind:"motor"|"sail"|"row",sail,crew:[опции person],crewH,wake,t})`, `towerCrane(g,x,y,{h,jib,col,trolley,hook,load:{w,h,col}})` вернёт `{hookX,hookY}`.
- `dog(g,x,y,{s,col,pose:"stand"|"walk"|"sit"|"sleep",t,flip})`, `cat(...)` то же, `bird(g,x,y,{s,col,t})`, `birds(g,lt,{n,cx,cy,rx,ry,s})` стая кружит.
- `sun(g,x,y,r,{col,rays,lt,horizon})`, `moon(g,x,y,r,{phase})`, `stars(g,lt,{x0,x1,y0,y1,n,p})`, `cloud(g,x,y,{s,col})`, `sea(g,lt,{y0,y1,fill,col})`.
- `lamp(g,x,y,{h,on})`, `garland(g,x0,y0,x1,y1,{n,sag,cols,on,lt})` фонарики загораются слева направо, `board(g,x,y,{w,h,title,lines,size,lt,t0,step})` меловая доска, строки пишутся по буквам.
Движение объектов считай от `lt`: x = lerp(старт, финиш, prog(lt,a,b)); появление через `spring`/`easeOut5` масштабом или выездом из-за края.

## Движение и переходы
- Появление 0.4–0.6 с `easeOut5`, уход в 1.4 раза быстрее. Камера `camera(g,lt)`/`camEnd(g)`: наезд и оседание после склейки. Сцена 3.5–6 с.
- Переходы: `iris(g,t,at,{toRed})` красный шар заливает кадр (начало и вход в финал), `stairs(g,t,at,from,to,{dir})` смена тёмный <-> бумага, `withGlitch(g,t,G,kind,fn)` на склейках внутри одного фона и смене слова. Не больше 3 типов.

## Звук
Под музыку 0.08–0.16: woodblock/wood (pitch 0.6–1.1) на заголовки, type на печать, kalimba на курсив, pop_soft/pop_high на появление объектов, sparkle на огни, drop на опускание груза, toggle_off на зачёркивание, success3 + fanfare_soft в финале. Склейки `cutSounds(s,cuts,types,vol)`.

## Запреты
Без «-», эмодзи, чужих брендов. Не больше 2–3 текстовых блоков в кадре; красный фон только в финале; золото и красное не в одном слове.

## Каркас
```js
const P=PLK,C=P.C,pr=P.prog;let CUTS=null;
const BGS=["dark","paper","red"];
function s0(g,lt){P.stars(g,lt,{y1:800});P.sea(g,lt,{y0:1200,y1:1680});P.boat(g,P.lerp(300,760,pr(lt,0.5,4)),1300,{t:lt,crew:[{body:C.orange}]});
  P.head(g,"ЗАГОЛОВОК",{x:80,y:520,size:170,lt,t0:0.3});}
function s1(g,lt){P.kicker(g,"КИКЕР",{x:100,y:400,col:C.ink,lt,t0:0.1});P.building(g,120,1500,{kind:"house"});P.person(g,700,1500,{pose:"wave",t:lt,body:C.blue});}
function s2(g,lt){P.head(g,"ИТОГ.",{x:540,y:900,size:220,align:"center",col:C.cream,lt,t0:0.15});}
const SC=[s0,s1,s2];
function draw(t,k){const g=k.g;if(!CUTS)CUTS=P.cutsFromSubs(k);const {i,lt}=P.scene(t,CUTS),kind=BGS[i];
  P.bg(g,kind);
  P.withGlitch(g,t,[],kind,()=>{P.camera(g,lt);SC[i](g,lt,k);P.camEnd(g);});
  P.stairs(g,t,CUTS[1],"dark","paper");P.iris(g,t,CUTS[2],{toRed:1});
  P.hud(g,t,{theme:kind,label:"МЕТКА ТЕМЫ",chapter:"01 - ГЛАВА",dur:k.duration});}
function sound(s){const c=PLK.cutsFromSubs(s);PLK.cutSounds(s,c,[null,"stairs","red"]);s.play(c[0]+0.3,"woodblock",0.12,{pitch:0.7});}
```
