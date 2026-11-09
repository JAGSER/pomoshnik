// video.js: «Сверка» - проверка чеков и расходов семьи, через библиотеку SAAS
const {C,MONO,FT,rgba,clamp,lerp,prog,eo,eio,back,rub,countInt,typeOn,T,Tr,label,body,head,bgDark,bgLight,card,win,rise,pop,field,btn,chip,tag,
steps,score,minibars,segbar,stat,glass,tabs,cursor,path,checkTile,icon,node,link,cam,play,sfx,cutSounds,fnt,rr}=SAAS;
const TABS=['Чек','Месяц','Банк','Связи'];
const TR1={type:'circle',x:540,y:1000,r:72};
const RAIN=['молоко 89 ₽','хлеб 54 ₽','такси 412 ₽','кофе 290 ₽','аптека 640 ₽','кино 399 ₽','сыр 512 ₽','бензин 2 100 ₽','обед 450 ₽','связь 600 ₽','кешбэк 37 ₽','фрукты 318 ₽'];

// 0. Хук: тёмный фон с дождём строк, «Стоп переплатам» (зачёркнуто), «до кассы.», круг-кнопка летит на слово
function s0(g,lt,t,S){bgDark(g,t,{rain:1,words:RAIN});g.save();const z=cam(g,lt,S.dur,{z:0.04,cy:900});
icon(g,488,300,52,{glyph:'receipt',p:prog(lt,0,0.45)});label(g,'Сверка',528,301,{size:24,color:'#C9BDFF',p:prog(lt,0.1,0.3)});
const a=head(g,['Стоп','переплатам'],540,620,{size:160,maxW:880,dark:1,lt,delay:0.08,stagger:0.16,strike:'переплатам',strikeAt:0.9});
const b=head(g,['до кассы.'],540,620+a.h,{size:a.sz,dark:1,lt,delay:1.25,stagger:0.12,key:['кассы.']});
const k=b.box['кассы'];if(k){TR1.x=540+(k.x+k.w*0.62-540)*z;TR1.y=900+(k.y+a.sz*0.5-900)*z;}g.restore();}

// 1. Проверка чека: поле с печатью, кнопка, курсор, шкала шагов, оценка 82 → 85, метка «в норме»
function s1(g,lt,t,S){bgLight(g,t,{cy:1050});g.save();cam(g,lt,S.dur,{cy:1000});
label(g,'Проверка чека',60,250,{p:prog(lt,0,0.3)});head(g,['Сфоткай чек.','Проверим по шагам.'],60,290,{align:'left',size:112,grey:[1],lt,delay:0.05});
const x=60,y=650,w=960,h=800;g.save();rise(g,prog(lt,0.1,0.6));card(g,x,y,w,h);
label(g,'Чек с лишним?',x+40,y+58,{size:20,color:'#5A5470',tr:0.2});chip(g,'5 проверок сегодня',x+w-40,y+58,'tint',{align:'right',size:19});
const ty=typeOn('магазин у дома, 1 248 ₽',lt,0.5,30),chk=lt>1.55&&lt<2.4;field(g,x+40,y+108,610,100,ty,{focus:1,caret:lt<1.5,t,size:34});
btn(g,chk?'Проверяю…':'Проверить',x+670,y+108,250,100,{press:prog(lt,1.5,0.25),size:32});
const sp=lt<1.55?0:clamp((lt-1.55)/0.8*5,0,5);steps(g,x+72,y+300,w-144,['фото','сумма','цены','дубли','итог'],sp-0.001);
g.fillStyle='#EEECF5';g.fillRect(x+40,y+400,w-80,2);
const r=prog(lt,2.35,0.4);if(r>0){tag(g,'в норме',x+40,y+480,'green',{size:30,p:r});
body(g,'Цены обычные, дублей нет. Можно платить.',x+40,y+535,{size:30,maxW:440,p:prog(lt,2.5,0.4)});
const n=lt<2.95?countInt(lt,2.4,0.45,0,82):countInt(lt,2.95,0.25,82,85);g.save();g.globalAlpha*=eo(r);score(g,n,x+w-40,y+630,{size:176,of:'/100'});g.restore();
minibars(g,[['фото +10',0.25],['цены +40',0.9],['дубли +20',0.5],['сумма +15',0.35]],x+w-470,y+690,430,lt-2.6);}
g.restore();
chip(g,'0,7 с',x+w-14,y-6,'dark',{icon:'timer',size:24,align:'right',p:prog(lt,2.6,0.35)});
chip(g,'0 ₽ лишнего',x+24,y+h+8,'white',{icon:'coin',size:24,p:prog(lt,2.8,0.35)});
if(lt>0.9&&lt<2.9){const [cx,cy]=path(lt,[[960,1560],[900,1100],[x+800,y+170]],0.9,1.5);cursor(g,cx,cy,{press:prog(lt,1.5,0.35)});}
g.restore();}

// 2. Шесть ответов: тёмные стеклянные карточки с цветными метками
const ANS=[['в норме','green','#3DDC84','молоко',89,'Оставить.'],['дорого','orange','#F5A524','кофе в зёрнах',1290,'Есть на 30% дешевле.'],
['дубль','blue','#6E8BFF','такси',412,'Оспорить второй.'],['вернуть','pink','#F05B9C','наушники',2990,'14 дней на возврат.'],
['гарантия','violet','#A98BFF','чайник',3490,'До октября 2027.'],['подписка','red','#FF5470','онлайн-кино',399,'Не смотрите. Отменить.']];
function s2(g,lt,t,S){bgDark(g,t,{gy:420,gr:1000});g.save();cam(g,lt,S.dur,{z:0.03,cy:900});
head(g,['Шесть ответов.'],540,180,{size:120,dark:1,lt,delay:0.15});body(g,'Каждый говорит, что делать.',540,330,{size:40,align:'center',color:C.lilacGrey,p:prog(lt,0.4,0.4)});
const cw=470,ch=345,gap=20;ANS.forEach((a,i)=>{const p=prog(lt,0.55+i*0.1,0.6);if(p<=0)return;const x=60+(i%2)*(cw+gap),y=470+Math.floor(i/2)*(ch+gap);
g.save();rise(g,p,70);glass(g,x,y,cw,ch,a[2]);tag(g,a[0],x+28,y+56,a[1],{dark:1,size:26});
Tr(g,a[3],x+28,y+132,32,'#EDEAFB',500,'left',MONO,cw-56);Tr(g,rub(a[4])+(i===2?' × 2':i===5?' / мес':''),x+28,y+202,48,'#FFFFFF',700,'left',MONO,cw-56);
Tr(g,'→ '+a[5],x+28,y+276,29,C.lilacGrey,500,'left',FT,cw-56);g.restore();});g.restore();}

// 3. Месяц: вкладки, двухцветный заголовок, окно отчёта с полосой и итогами
function s3(g,lt,t,S){bgLight(g,t,{cy:1050});g.save();cam(g,lt,S.dur,{cy:1050});tabs(g,TABS,1,170,lt,{from:0});
label(g,'За месяц',60,285,{p:prog(lt,0.1,0.3)});head(g,['Весь месяц','за минуту.'],60,325,{align:'left',size:116,grey:[1],lt,delay:0.12});
g.save();rise(g,prog(lt,0.15,0.6));const b=win(g,60,620,960,880,'отчёт · октябрь');const x=b.x,y=b.y,w=b.w,done=lt>1.5;
g.fillStyle='#F2EFFC';rr(g,x,y+34,64,64,14);g.fill();g.strokeStyle='#D9D2F7';g.lineWidth=2;g.stroke();Tr(g,'ЧЕК',x+32,y+67,17,C.violet,700,'center',MONO);
Tr(g,'чеки-октябрь',x+88,y+52,32,C.ink,700,'left',MONO);Tr(g,countInt(lt,0.4,1.1,0,214)+' чеков проверено',x+88,y+88,20,C.mute,500,'left',MONO);
tag(g,done?'готово':'проверяю…',x+w,y+66,done?'green':'violet',{size:22,align:'right'});
const parts=[38400,2600,1900,4380,1700,620],cols=['#34C77B','#F2A324','#4C7BF4','#E0457B','#9B8BC8','#E5484D'];segbar(g,x,y+140,w,26,parts,prog(lt,0.45,1.0),cols);
const nm=['в норме','дорого','дубль','вернуть','гарантия','подписка'];nm.forEach((s,i)=>{const lx=x+(i%2)*(w/2+14),ly=y+212+Math.floor(i/2)*44,q=prog(lt,0.6+i*0.06,0.3);if(q<=0)return;
g.save();g.globalAlpha*=q;g.fillStyle=cols[i];g.beginPath();g.arc(lx+6,ly,6,0,7);g.fill();Tr(g,s,lx+22,ly,22,C.inkSoft,500,'left',MONO);Tr(g,rub(parts[i]),lx+w/2-34,ly,22,C.ink,700,'right',MONO);g.restore();});
const sw=(w-32)/3;[['В норме',38400,'green'],['Проверить',6120,'orange'],['Вернуть',4380,'red']].forEach((s,i)=>{const q=prog(lt,1.35+i*0.12,0.45);
if(q>0)stat(g,x+i*(sw+16),y+400,sw,170,s[0],rub(countInt(lt,1.35+i*0.12,0.6,0,s[1])),s[2],q);});
const bp=prog(lt,1.9,0.4);if(bp>0){g.save();g.globalAlpha*=eo(bp);btn(g,'Скачать отчёт',x,y+650,370,88,{icon:'down',size:30});
Tr(g,'таблица · для семьи',x+w,y+694,19,C.mute,500,'right',MONO);g.restore();}g.restore();g.restore();}

// 4. Банк: тёмное окно-выписка, строки списаний по одной, дубль красным
const OPS=[['09:41','продукты','в норме','green',1248],['10:02','такси','в норме','green',412],['10:02','такси','дубль','red',412],
['13:15','аптека','в норме','green',640],['18:30','онлайн-кино','подписка','orange',399]];
function s4(g,lt,t,S){bgLight(g,t,{cy:1050});g.save();cam(g,lt,S.dur,{cy:1050});tabs(g,TABS,2,170,lt,{from:1});
label(g,'В выписке',60,285,{p:prog(lt,0.1,0.3)});head(g,['Ловит дубли','в выписке.'],60,325,{align:'left',size:116,grey:[1],lt,delay:0.12});
g.save();rise(g,prog(lt,0.12,0.6));const b=win(g,60,620,960,880,'банк · списания за неделю',{dark:1});const x=b.x,y=b.y,w=b.w;
fnt(g,600,22,MONO);g.textAlign='left';g.textBaseline='middle';g.fillStyle=C.dViolet;g.fillText('СВЕРКА',x,y+50);g.fillStyle='#CFC9EA';g.fillText('карта ** 4417 · 7 дней',x+108,y+50);
OPS.forEach((o,i)=>{const p=prog(lt,0.45+i*0.3,0.4);if(p<=0)return;const ry=y+100+i*116,bad=o[3]==='red',sh=bad?Math.sin(clamp(lt-1.35,0,0.4)*60)*6*(1-clamp((lt-1.35)/0.4)):0;
g.save();g.globalAlpha*=eo(p);g.translate((1-eo(p))*-40+sh,0);g.fillStyle=bad?'rgba(255,84,112,0.10)':C.termRow;rr(g,x,ry,w,90,14);g.fill();
if(bad&&lt>1.35){g.strokeStyle=rgba('#FF5470',0.6);g.lineWidth=2.5;g.stroke();}
Tr(g,o[0],x+22,ry+45,20,'#7D74A8',500,'left',MONO);Tr(g,o[1],x+110,ry+45,30,'#EDEAFB',500,'left',MONO,300);
tag(g,o[2],x+w-170,ry+45,o[3],{dark:1,size:21,align:'right'});Tr(g,rub(o[4]),x+w-22,ry+45,28,'#FFFFFF',700,'right',MONO);g.restore();});
const fp=prog(lt,2.0,0.4);if(fp>0){g.save();g.globalAlpha*=eo(fp);Tr(g,'дубль найден · 412 ₽ вернётся',x,y+760,20,'#8E86B5',500,'left',MONO);
Tr(g,'0,8 с',x+w,y+760,20,C.dGreen,700,'right',MONO);g.restore();}g.restore();g.restore();}

// 5. Связи: значок сервиса в центре, пунктиры к банку, таблице и др.
const NODES=[[-290,-250,'Банк','выписка'],[290,-250,'Таблица','расходы'],[-320,20,'Почта','чеки'],[320,20,'Семья','4 человека'],[-210,280,'Кешбэк','баллы'],[210,280,'Календарь','подписки']];
function s5(g,lt,t,S){bgLight(g,t,{cy:1050});g.save();cam(g,lt,S.dur,{cy:1050});tabs(g,TABS,3,170,lt,{from:2});
label(g,'Работает с вашим',60,285,{p:prog(lt,0.1,0.3)});head(g,['К банку','и таблице.'],60,325,{align:'left',size:116,grey:[1],lt,delay:0.12});
g.save();rise(g,prog(lt,0.12,0.6));win(g,60,620,960,880,'связи');const cx=540,cy=1070;
NODES.forEach((n,i)=>link(g,cx,cy,cx+n[0],cy+n[1],prog(lt,0.6+i*0.08,0.35),t,{ph:i*0.17}));
icon(g,cx,cy,150,{glyph:'receipt',p:prog(lt,0.3,0.5),draw:prog(lt,0.45,0.6)});NODES.forEach((n,i)=>node(g,cx+n[0],cy+n[1],n[2],n[3],prog(lt,0.8+i*0.08,0.4)));
const fp=prog(lt,1.6,0.4);if(fp>0){g.save();g.globalAlpha*=eo(fp);Tr(g,'подключение за 1 минуту',540,1458,20,C.mute,500,'center',MONO);g.restore();}
g.restore();g.restore();}

// 6. Итог: тёмный фон, пункты с галочками, числа сиреневым
const ROWS=[['Дубли: 0 ₽.',['0','₽.']],['Подписки: 2 из 5.',['2','5.']],['Вернули '+rub(4380)+'.',['4','380','₽.']]];
function s6(g,lt,t,S){bgDark(g,t);g.save();cam(g,lt,S.dur,{z:0.03,cy:900});
label(g,'Итог за октябрь',60,650,{color:'#A898F0',p:prog(lt,0.05,0.3),size:22});
ROWS.forEach((r,i)=>{const d=0.2+i*0.42,y=710+i*130;checkTile(g,98,y+46,72,prog(lt,d,0.45));head(g,[r[0]],160,y,{align:'left',size:90,maxW:860,dark:1,lt,delay:d+0.08,key:r[1]});});
const fp=prog(lt,1.5,0.4);if(fp>0){g.save();g.globalAlpha*=eo(fp)*0.9;Tr(g,'цены в рублях · без рекламы · отмена в 1 клик',160,1150,22,'#9188C0',500,'left',MONO);g.restore();}g.restore();}

// 7. Финал: значок влетает с поворотом, выезжает название, слоган и кнопка
function s7(g,lt,t,S){bgDark(g,t);g.save();cam(g,lt,S.dur,{z:0.02,cy:900});
fnt(g,800,150,SAAS.F);const ww=SAAS.trW(g,'Сверка',-150*0.045),tot=140+34+ww,sl=eio(prog(lt,0.55,0.5));const ix=lerp(540,540-tot/2+70,sl);
if(sl>0){g.save();g.beginPath();g.rect(ix+70,700,1000,240);g.clip();head(g,['Сверка'],lerp(ix+70-ww*0.6,540-tot/2+174,sl),740,{align:'left',size:150,dark:1,tr:-0.045});g.restore();}
icon(g,ix,820,140,{glyph:'receipt',p:prog(lt,0,0.5),draw:prog(lt,0.15,0.6)});
head(g,['Каждый рубль','на месте.'],540,960,{size:72,dark:1,lt,delay:0.9,key:['рубль'],weight:700});
const bp=prog(lt,1.25,0.4);if(bp>0){g.save();pop(g,bp,540,1180);SAAS.glow(g,540,1180,260,'#7A5CFF',0.35);g.fillStyle='#fff';rr(g,330,1138,420,84,42);g.fill();
Tr(g,'Проверить чек',540,1181,32,C.ink,700,'center',MONO,380);g.restore();
g.save();g.globalAlpha*=eo(prog(lt,1.4,0.4));Tr(g,'5 проверок в день · бесплатно',540,1270,22,'#8E86B5',500,'center',MONO);g.restore();}g.restore();}

const CUTS=[[0,s0],[2.6,s1,TR1],[6.0,s2,{type:'panel'}],[9.2,s3,{type:'fade'}],[12.2,s4,{type:'tab'}],[15.2,s5,{type:'tab'}],[18.0,s6,{type:'fade',d:0.5}],[20.0,s7,{type:'fade',d:0.4}]];

function draw(t,k){play(k.g,t,CUTS,k.duration);}

function sound(s){const P=sfx(s);cutSounds(s,CUTS,0.16);
P(0.1,'pop_soft',0.12);P(0.3,'pop_high',0.12);P(0.92,'error_soft',0.1);P(1.3,'pop_soft',0.13,1.2);P(2.05,'bubble',0.14);
P(3.1,'type',0.1);P(4.1,'click',0.16);P(4.5,'tick',0.1);P(4.95,'counter',0.12);P(5.6,'success',0.15);
P(6.6,'pop_soft',0.11);P(6.95,'pop_high',0.1);P(7.3,'pop_soft',0.1,0.9);
P(9.7,'tally',0.11);P(10.6,'pop_double',0.12);P(11.1,'pop_high',0.1);P(11.6,'notify',0.1);
P(12.7,'tick',0.1);P(13.3,'tick',0.1,1.1);P(13.55,'error_soft',0.12);P(14.3,'success3',0.12);
P(15.6,'pop_soft',0.12);P(16.1,'bubble',0.11);P(16.6,'sparkle',0.1);
P(18.2,'pop_high',0.13);P(18.62,'pop_high',0.13,1.12);P(19.04,'pop_high',0.13,1.25);P(19.4,'success3',0.13);
P(20.6,'sparkle',0.12);P(21.25,'ta_da',0.18);}
