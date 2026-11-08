// example.js: «Цена бдительности», стиль PLK. Сквозной герой: глаз гражданина.
const P=PLK,C=P.C;
let CUTS=null;
const pr=P.prog,eo=P.easeOut,sp=P.spring;

// 0. Хук: глаз на красном круге и крупное слово
function s0(g,lt){
  P.rays(g,540,1000,lt*0.08,0.16*eo(pr(lt,0,0.6)),1);
  P.disc(g,540,1000,400*sp(lt-0.1));
  P.ring(g,540,1000,430,lt*0.15,C.ink,eo(pr(lt,0.4,0.9)));
  P.eye(g,540,1000,320,sp((lt-0.5)*0.8),0.6*Math.sin(lt*1.3));
  P.title(g,"ЗНАТЬ ПРАВДУ",{acc:"ПРАВДУ",y:330,lt,t0:0,size:160});
  P.caption(g,"долг каждого гражданина",{y:1580,lt,t0:1.6});
}

// 1. Народ читает: листки разлетаются к толпе
const ROW1=[{n:8,x0:110,x1:970,y:1340,s:0.75,c:C.red},{n:7,x0:150,x1:930,y:1500,s:0.95,c:C.brown},{n:6,x0:140,x1:940,y:1680,s:1.15,c:C.ink}];
function s1(g,lt){
  P.halftone(g,1180,0.22);
  P.eye(g,540,760,180,sp(lt-0.3),Math.sin(lt*2.2));
  P.crowd(g,lt,ROW1,0.5,(n,ri,j)=>({paper:ri===2&&lt>2.0+j*0.35}));
  for(let j=0;j<6;j++){const a=1.4+j*0.35,p=pr(lt,a,a+0.6);if(p<=0||p>=1)continue;
    const q=P.toss(p,540,780,140+j*160,1590,160);P.sheet(g,q.x,q.y,q.rot);}
  P.title(g,"ЗНАЮЩИЙ НАРОД|СТРАЖ СВОБОДЫ",{acc:"СВОБОДЫ",y:300,lt,t0:0.25});
}

// 2. Рынок для всех: весы, люди против монет
function s2(g,lt){
  P.halftone(g,1220,0.22);
  const tilt=lt<1.6?0.26*eo(pr(lt,0.8,1.4)):P.settle(lt-1.6,0.26,6);
  P.scales(g,540,900,{tilt,p:eo(pr(lt,0.2,0.9)),
    left:(g,x,y)=>{for(let i=0;i<3;i++){const q=sp(lt-1.6-i*0.1);if(q>0.01)P.person(g,x-60+i*60,y,0.48*q,C.red);}},
    right:(g,x,y)=>{for(let i=0;i<5;i++)if(lt>0.8+i*0.08)P.coin(g,x,y-10-i*16,46);}});
  P.eye(g,540,840,64,sp(lt-0.6),Math.sin(lt*2));
  P.title(g,"РЫНОК ДЛЯ ВСЕХ",{acc:"ВСЕХ",y:300,lt,t0:0.25});
  P.caption(g,"Адам Смит, «Богатство народов», 1776",{y:420,lt,t0:0.9,size:50});
}

// 3. Сговор: чиновник и делец, монеты из рук в руки, штамп
function s3(g,lt){
  P.halftone(g,1250,0.2);
  P.disc(g,540,1240,360*sp(lt-0.15));
  P.person(g,300-400*(1-sp(lt-0.3)),1500,2.4,C.ink,{tie:1,arm:1.3});
  P.person(g,780+400*(1-sp(lt-0.45)),1500,2.7,C.ink,{hat:1,flip:1,arm:1.3});
  let landed=0;
  for(let i=0;i<4;i++){const a=1.0+i*0.35,p=pr(lt,a,a+0.5);if(p>=1){landed++;continue;}if(p<=0)continue;
    const q=P.toss(p,600,1250,170,1490,260);P.coin(g,q.x,q.y,30);}
  P.coinStack(g,170,1490,landed,30);
  P.title(g,"ВЛАСТЬ И ДЕНЬГИ|В СГОВОРЕ",{acc:"СГОВОРЕ",y:300,lt,t0:0.25});
  P.stamp(g,"КОРРУПЦИЯ",540,710,{rot:-0.12,d:lt-2.9,size:110});
}

// 4. Пирамида власти, счётчик растёт
function s4(g,lt){
  const gr=eo(pr(lt,1.2,4.5));
  P.pyramid(g,540,1420,lt,{levels:[7,5,4,2],t0:0.3,grow:gr});
  if(lt>1.2)for(let j=0;j<10;j++){const u=(lt*0.4+j/5)%1,sd=j%2?1:-1;P.coin(g,540+sd*(480-440*u),1420-740*u,14);}
  P.title(g,"НЕМНОГИЕ РЕШАЮТ|ЗА ВСЕХ",{acc:"НЕМНОГИЕ",y:300,lt,t0:0.25});
  P.counter(g,12+75*gr,540,1650,{lt,t0:1.0,suffix:"%",label:"ВЛАСТЬ У ВЕРХУШКИ"});
  P.eye(g,880,1580,50,0.5+0.3*Math.sin(lt*3),-0.6);
}

// 5. Тёмная сцена: тень над маршем
function s5(g,lt){
  P.darkBg(g);
  P.searchlights(g,lt,{y:1700,spread:440});
  P.person(g,540,1720,(4+2.2*eo(pr(lt,0.2,5)))*sp(lt-0.2),C.black,{cap:1});
  P.band(g,1660,8,C.red);
  for(let j=0;j<11;j++){const x=((j*120+lt*90)%1320)-120,b=-Math.abs(Math.sin(lt*8+j))*8;P.person(g,x,1660+b,0.8,C.red,{cap:1});}
  P.eye(g,540,660,80,0.1+0.05*Math.sin(lt*2),0,C.paper);
  P.title(g,"ТЕНЬ ФАШИЗМА|НЕ ДРЕМЛЕТ",{acc:"ТЕНЬ",y:300,lt,t0:0.25,col:C.paper});
  P.caption(g,"кумовской капитализм",{y:530,lt,t0:1.2,col:C.paper});
}

// 6. Поворот: глаз открывается, руки вверх, счётчик падает
const ROW6=[{n:8,x0:110,x1:970,y:1530,s:0.8,c:C.red},{n:7,x0:140,x1:940,y:1690,s:1.05,c:C.ink}];
function s6(g,lt){
  P.rays(g,540,820,-lt*0.1,0.18*eo(pr(lt,0.2,0.8)),0.9);
  P.eye(g,540,820,250,0.1+0.9*sp(lt-0.3),0.7*Math.sin(lt*1.1));
  P.counter(g,87-63*eo(pr(lt,1.2,4.5)),540,1265,{lt,t0:0.9,suffix:"%",label:"ВЛАСТЬ У ВЕРХУШКИ"});
  P.crowd(g,lt,ROW6,0.3,(n,ri,j)=>({arm:Math.PI-(Math.PI+0.15)*sp(lt-1.0-n*0.06),paper:ri===1&&j%2===0}));
  P.title(g,"ЗНАНИЕ И ГОЛОС|СИЛЬНЕЕ СТРАХА",{acc:"ГОЛОС",y:280,lt,t0:0.25});
}

// 7. Финал: глаз моргает, штамп-вывод
function s7(g,lt){
  P.rays(g,540,760,lt*0.1,0.2*eo(pr(lt,0.1,0.7)),1);
  P.disc(g,540,760,330*sp(lt-0.1));
  P.ring(g,540,760,350,-lt*0.12,C.ink,eo(pr(lt,0.4,0.9)));
  P.eye(g,540,760,270,sp(lt-0.25)*P.blink(lt,1.0,0.25),0.4*Math.sin(lt*1.4));
  P.title(g,"СВОБОДЕ НУЖНЫ|ЗОРКИЕ ГРАЖДАНЕ",{acc:"ЗОРКИЕ",y:1230,lt,t0:0.35});
  P.stamp(g,"КАЖДЫЙ ДЕНЬ",540,1530,{rot:-0.06,d:lt-1.6,size:90});
}

const SC=[s0,s1,s2,s3,s4,s5,s6,s7];
function draw(t,k){
  const g=k.g;if(!CUTS)CUTS=P.cutsFromSubs(k);
  const {i,lt}=P.sceneAt(t,CUTS);
  P.paper(g);
  P.camera(g,lt,i);
  SC[Math.min(i,SC.length-1)](g,lt,k,i);
  P.camEnd(g);
  P.wipe(g,t,CUTS);
}

function sound(s){
  const c=PLK.subCuts(s);
  PLK.cutSounds(s,c,0.16,[1,1,1,1,1,0.7,1,1]);
  const E=[
    [0,0.05,"woodblock",.16],[0,0.35,"pop_soft",.12],[0,0.6,"bubble",.12],[0,1.7,"rim",.1],
    [1,0.6,"pop_soft",.1],[1,2.0,"drop",.12],[1,3.05,"drop",.1],[1,3.8,"pop_high",.1],
    [2,0.8,"wood",.14],[2,1.6,"pop_soft",.1],[2,2.5,"kalimba",.14],
    [3,1.5,"tick",.1],[3,2.2,"tick",.1],[3,2.9,"woodblock",.24,0.6],
    [4,0.4,"wood",.12],[4,1.2,"counter",.14],[4,3.3,"odometer",.12],[4,4.5,"error_soft",.12],
    [5,0.4,"bubble_down",.14],[5,2.5,"rim",.1,0.7],[5,4.3,"rim",.1,0.6],
    [6,0.4,"magic",.14],[6,1.1,"counter",.12],[6,1.7,"pop_soft",.1],[6,4.5,"success",.14],
    [7,0.6,"sparkle",.12],[7,1.6,"woodblock",.24,0.7],[7,2.2,"fanfare_soft",.16]];
  for(const e of E){if(e[0]>=c.length)continue;const t=c[e[0]]+e[1];
    if(t<s.duration)s.play(t,e[2],e[3],{pitch:e[4]||1});}
}