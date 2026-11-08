// example.js: «Помощник AI: всё в одном» через библиотеку SAAS
const {C,MONO,PAL,rr,T,words,headline,pill,chips,typeOn,countInt,counter,bg,cam,par,scene,swap,rise,phone,card,bubble,
typing,btn,wave,gear,check,pin,stamp,tap,cursor,corners,live,tiles,bot,person,prog,eo,sfx,cuts}=SAAS;

// [t0,t1,заголовок,ключ]: времена из subs.json
const SC=[[0,2.6,'Помощник AI','AI'],[2.6,5.4,'Камера покажет, куда нажать','нажать'],[5.4,8,'Брать или не брать','Брать'],
[8,10.8,'Переведёт и всё посчитает','Переведёт'],[10.8,13.4,'Про лекарство и поломку','поломку'],[13.4,16,'Ролики в 20 стилях','20'],
[16,18,'Поможет маме и папе','маме'],[18,99,'Помощник AI','AI']];

// 1. Чат: вопрос, «печатает», ответ по буквам, режимы
function c0(g,lt,b,t){const h1=bubble(g,'Как включить Wi-Fi?',b.x,b.y+30,b.w,prog(lt,0.25),{right:1,dark:1});
const yy=b.y+30+h1+28;if(lt>0.6&&lt<1.15)typing(g,b.x,yy,t,(lt-0.6)/0.2);
if(lt>=1.1)bubble(g,typeOn('Открой «Настройки», я покажу шаг за шагом',lt,1.07),b.x,yy,b.w,prog(lt,1.1,0.2));
chips(g,['Фото','Голос','Ролик'],b.x,b.y+b.h-90,lt,1.7,{right:b.x+b.w});}

// 2. Камера: пульт в видоискателе, касание по нужной кнопке
function c1(g,lt,b,t){const {x,y,w,h}=b;card(g,x,y,w,h,{fill:C.dark});
const jx=Math.sin(t*2.3)*5,jy=Math.cos(t*1.9)*4,ox=x+50+jx,oy=y+170+jy,ow=w-100;
g.fillStyle='#E7E1D7';rr(g,ox,oy,ow,440,40);g.fill();g.fillStyle='#1F2A24';rr(g,ox+40,oy+40,ow-80,100,18);g.fill();
T(g,'12:30',ox+ow/2,oy+92,52,C.mint,700,'center',MONO);let tx=0,ty=0;
for(let r=0;r<2;r++)for(let c=0;c<3;c++){const bx=ox+ow*(0.22+c*0.28),by=oy+215+r*120,on=r===1&&c===2;
g.fillStyle=on?C.green:'#CFC7BA';g.beginPath();g.arc(bx,by,42,0,7);g.fill();if(on){tx=bx;ty=by;}}
tap(g,tx,ty,lt,0.6);corners(g,x,y,w,h);live(g,x+w/2-100,y+64,'Живой режим',t);
pill(g,'Жми зелёную',x+w/2,y+h-110,{lt,a:1.0,key:'зелёную',fill:'rgba(0,0,0,0.65)',color:'#fff',keyColor:C.mint});}

// 3. Магазин: три товара, оценки цветом, штамп
function c2(g,lt,b,t){const {x,y,w}=b;card(g,x,y,w,b.h);const by=y+600,cs=[x+w*0.18,x+w*0.5,x+w*0.82];
g.fillStyle='#C9B79C';rr(g,x+16,by,w-32,24,8);g.fill();let c=cs[0];
g.fillStyle='#5B7FD8';rr(g,c-46,by-250,92,250,30);g.fill();rr(g,c-18,by-300,36,60,8);g.fill();
g.fillStyle=C.ink;rr(g,c-22,by-322,44,28,8);g.fill();g.fillStyle='rgba(255,255,255,0.85)';g.fillRect(c-46,by-170,92,70);
c=cs[1];g.fillStyle='#E8B04A';rr(g,c-66,by-230,132,230,10);g.fill();g.fillStyle='rgba(255,255,255,0.8)';rr(g,c-46,by-170,92,92,46);g.fill();
c=cs[2];g.fillStyle='#C2504A';rr(g,c-54,by-200,108,200,18);g.fill();g.fillStyle='rgba(0,0,0,0.15)';
g.fillRect(c-54,by-180,108,10);g.fillRect(c-54,by-30,108,10);
[[C.green,'4.8'],[C.orange,'3.6'],[C.red,'2.1']].forEach(([col,s],i)=>pin(g,cs[i],y+190,s,prog(lt,0.35+i*0.3),{color:col}));
const p=prog(lt,1.5,0.25);if(p>0){g.save();g.globalAlpha*=p;g.strokeStyle=C.green;g.lineWidth=6;rr(g,cs[0]-64,by-340,128,350,30);g.stroke();g.restore();}
stamp(g,'БРАТЬ',x+w/2,y+740,p);}

// 4. Перевод, счёт, чтение вслух: три карточки каскадом
function c3(g,lt,b,t){const {x,y,w}=b;let p=prog(lt,0.02);
if(p>0){g.save();rise(g,p);card(g,x,y,w,250);T(g,'Перевод',x+30,y+40,30,C.muted,600);
g.fillStyle=C.green;rr(g,x+30,y+75,190,110,16);g.fill();T(g,'EXIT',x+125,y+132,54,'#fff',800,'center');
SAAS.arrow(g,x+240,y+130,x+292,y+130,1);T(g,'Выход',x+310,y+132,60,C.ink,800,'left',undefined,w-325);g.restore();}
p=prog(lt,0.7);if(p>0){const yy=y+280;g.save();rise(g,p);card(g,x,yy,w,250);T(g,'Счёт',x+30,yy+40,30,C.muted,600);
T(g,'3 × 149 ₽',x+30,yy+105,50,C.muted,700,'left',MONO);
if(lt>1.0)counter(g,countInt(lt,1.0,0.5,0,447),x+30,yy+185,{unit:'₽',size:72,color:C.ink,maxW:w-60});g.restore();}
p=prog(lt,1.2);if(p>0){const yy=y+560,y0=yy+150;g.save();rise(g,p);card(g,x,yy,w,250);T(g,'Вслух',x+30,yy+40,30,C.muted,600);
g.fillStyle=C.ink;g.fillRect(x+36,y0-18,22,36);g.beginPath();g.moveTo(x+58,y0-18);g.lineTo(x+88,y0-40);g.lineTo(x+88,y0+40);g.lineTo(x+58,y0+18);g.fill();
g.strokeStyle=C.ink;g.lineWidth=5;for(const r of[22,40]){g.beginPath();g.arc(x+92,y0,r,-0.8,0.8);g.stroke();}
wave(g,x+150,y0,w-180,100,t,p);g.restore();}}

// 5. Лекарство и поломка
function c4(g,lt,b,t){const {x,y,w}=b;let p=prog(lt,0.02);
if(p>0){const yy=y+20;g.save();rise(g,p);card(g,x,yy,w,380);g.save();g.translate(x+95,yy+190);g.rotate(-0.6+Math.sin(t*2)*0.08);
g.fillStyle='#fff';g.strokeStyle=C.line;g.lineWidth=4;rr(g,-32,-10,64,100,32);g.fill();g.stroke();g.fillStyle=C.acc;rr(g,-32,-90,64,100,32);g.fill();g.restore();
T(g,'Лекарство',x+190,yy+120,30,C.muted,600);T(g,'2 раза в день',x+190,yy+190,44,C.ink,800,'left',undefined,w-210);
T(g,'после еды',x+190,yy+250,36,C.muted,500);g.restore();}
p=prog(lt,0.6);if(p>0){const yy=y+430;g.save();rise(g,p);card(g,x,yy,w,380);gear(g,x+95,yy+190,50,t);
T(g,'Поломка',x+190,yy+120,30,C.muted,600);T(g,'Проверь фильтр',x+190,yy+190,44,C.ink,800,'left',undefined,w-210);
T(g,'и перезапусти',x+190,yy+250,36,C.muted,500);check(g,x+w-56,yy+56,34,prog(lt,1.6));g.restore();}}

// 6. 20 стилей: счётчик и сетка плиток, выбор одной
function c5(g,lt,b,t){const n=Math.max(0,Math.min(20,Math.floor((lt-0.25)/0.045)+1));
counter(g,n,b.x+8,b.y+62,{unit:'стилей',maxW:b.w-16});tiles(g,b.x,b.y+150,b.w,b.h-150,4,5,lt,0.25,{pick:6,pickAt:1.7,t});}

// 7. Помощь родителям: видеозвонок, подсказка, курсор нажимает кнопку
function c6(g,lt,b,t){const {x,y,w}=b;card(g,x,y,w,b.h,{fill:'#DCE6F7'});const bob=Math.sin(t*2)*4;
person(g,x+w/2-30,y+262+bob,118,{hair:'#C9C4BD',glasses:1});
g.fillStyle=C.ink;rr(g,x+w-150,y+24,126,170,20);g.fill();g.save();rr(g,x+w-150,y+24,126,170,20);g.clip();
person(g,x+w-87,y+100,34,{shirt:C.acc});g.restore();
pill(g,'Мама, жми сюда',x+w/2,y+630,{lt,a:0.3,key:'сюда'});
const bx=x+w/2,by=y+760,ex=bx+150,ey=by+30;btn(g,'Ответить',bx,by,{press:lt-1.2});
if(lt>1.2)tap(g,ex,ey,lt,1.2);else if(lt>0.6)cursor(g,[x+w-87,y+190],[x+w-10,y+640],[ex,ey],(lt-0.6)/0.6);}

// 8. Финал: крупный герой, вопрос, поле ввода, режимы
function c7(g,lt,b,t){const {x,y,w}=b;bot(g,x+w/2,y+260,110,t,{p:prog(lt,0.1,0.4),look:Math.sin(t)});
words(g,'Чем помочь?',x+w/2,y+480,{size:52,weight:800,align:'center',maxW:w,lt,delay:0.4,hl:false});
SAAS.field(g,x+10,y+570,w-20,'Спроси что угодно',prog(lt,0.6));chips(g,['Фото','Голос','Ролик'],x+40,y+720,lt,0.8,{right:x+w});}

const SCN=[c0,c1,c2,c3,c4,c5,c6,c7];

function draw(t,k){const g=k.g,s=scene(SC,t),{i,lt,dur,last}=s;
bg(g,t);const c=cam(g,t,lt,dur);
g.save();par(g,c);headline(g,s.row[2],s.row[3],lt,dur,{last,y:last?300:370});
g.restore();
phone(g,t,{rise:t/0.7,title:'Помощник',icon:(g,x,y,tt)=>bot(g,x,y,22,tt),steps:SC.length-1,step:i,lt},
(g,b)=>{swap(g,lt,dur,last);SCN[i](g,lt,b,t);});
g.restore();}

function sound(s){const P=sfx(s);cuts(s,SC);
P(0.08,'pop_high',0.16);P(0.3,'pop_soft',0.14);P(1.15,'type',0.1);P(1.75,'pop_double',0.1);
P(3.2,'click',0.16);P(3.62,'pop_soft',0.11,1.2);
P(5.75,'pop_soft',0.13);P(6.05,'woodblock',0.12);P(6.35,'error_soft',0.1);P(6.9,'success',0.16);
P(8.9,'counter',0.12);P(9.3,'sparkle',0.1);
P(11.4,'pop_soft',0.12);P(12.4,'success3',0.14);
P(13.65,'abacus',0.13);P(15.1,'tally',0.12);
P(16.32,'pop_soft',0.1);P(17.2,'click',0.16);P(17.3,'notify',0.12);
P(18.5,'pop_high',0.14);P(19.0,'ta_da',0.18);}