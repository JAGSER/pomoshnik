// video.js: «Город держится на соседях», стиль PLK (плакат-эссе).
// Сквозной предмет: красная точка (точка циферблата -> шар -> точки кикеров -> точка таймлайна -> красная стопка -> красный финал).
const P=PLK,C=P.C,pr=P.prog,eo=P.easeOut;
let CUTS=null;
const BGS=["dark","dark","dark","paper","paper","dark","paper","dark","red"];
const TR=[null,"iris","glitch","stairs","glitch","glitch","stairs","glitch","red"];
const CH=["01 - ОБЕЩАНИЕ ДВОРА","02 - ЧТО ДЕРЖИТ ДОМ","02 - ЧТО ДЕРЖИТ ДОМ","03 - ХАТА С КРАЮ","03 - ДВОР ПОМНИТ","04 - ПОМОЩЬ","05 - ОБЩАЯ ИГРА","06 - КОЛОННЫ","07 - ВЫВОД"];

// 0. Хук: циферблат, «ГОРОД,» и курсивная строка
function s0(g,lt){
  P.dust(g,lt,0.6);
  P.dial(g,540,860,400,pr(lt,0.05,2.8));
  P.mono(g,"ДОМ НА САДОВОЙ · 1962",{x:540,y:580,size:22,align:"center",lt,t0:0.25,col:"#8E8C94"});
  P.rule(g,200,880,930,pr(lt,0.0,0.7),C.red,3);
  P.head(g,"ГОРОД,",{x:540,y:900,size:240,align:"center",lt,t0:0.3,step:0.05,out:2.95});
  P.quote(g,"держится на соседях.",{x:540,y:1035,size:86,italic:1,align:"center",acc:["соседях."],lt,t0:1.2,step:0.16,out:2.95});
  if(lt<3.0)P.small(g,"Вера Ладогина, из записок о дворе",{x:540,y:1112,size:26,align:"center",lt,t0:2.1,col:"#8E8C94"});
}

// 1. Созвездие соседей, слово меняется глитчем
const W1=[["ДОВЕРИЕ.",0.5],["ПОМОЩЬ.",1.5],["РАЗГОВОР.",2.4],["ЗНАКОМЫЕ|ЛИЦА.",3.2]];
function s1(g,lt){
  P.dust(g,lt,0.5);
  P.constellation(g,lt,{p:eo(pr(lt,0,1.6)),cx:300,cy:900,gold:[1.5,2.4,3.2]});
  P.kicker(g,"ЧТО ДЕРЖИТ ДОМ",{x:100,y:800,size:32,lt,t0:0.15});
  for(let i=0;i<W1.length;i++){const [w,a]=W1[i],nx=W1[i+1]?W1[i+1][1]-0.08:null;if(lt<a-0.1||(nx!=null&&lt>nx+0.6))continue;
    P.head(g,w,{x:80,y:980,size:200,lt,t0:a,out:nx,acc:["ЗНАКОМЫЕ"],accCol:C.gold,step:0.022});}
}

// 2. Цитата антиквой на тёмном
function s2(g,lt){
  P.dust(g,lt,0.4);
  P.constellation(g,lt+4,{a:0.35});
  const q=P.quote(g,"Дом начинается не с ключа, а с соседа, который помнит твоё имя.",{x:560,y:740,w:880,size:72,marks:1,align:"center",acc:["соседа,","имя."],lt,t0:0.3,step:0.11});
  P.attrib(g,"В. ЛАДОГИНА · ЗАПИСКИ О ДВОРЕ · 1987",{x:540,y:q.bottom+170,align:"center",lt,t0:2.3});
}

// 3. Бумага: «моя хата с краю» зачёркнуто, красный ответ, контурные цифры-одометр
function s3(g,lt){
  P.outlineNum(g,"19",{x:1010,y:1160,size:470,align:"right",a:eo(pr(lt,0,0.6))});
  P.outlineNum(g,"62",{x:1010,y:1600,size:470,align:"right",roll:["00"],p:pr(lt,0.1,1.3),a:eo(pr(lt,0,0.6))});
  P.kicker(g,"ВСЕ ГОВОРЯТ",{x:100,y:470,size:30,col:C.ink,lt,t0:0.15});
  const r=P.head(g,"МОЯ ХАТА|С КРАЮ.",{x:80,y:660,size:170,col:C.ink,lt,t0:0.35});
  const f=P.fCond(r.size);["МОЯ ХАТА","С КРАЮ."].forEach((l,i)=>P.strike(g,70,80+P.tw(g,f,l)*P.SX+14,660+i*r.size*1.02-r.size*0.34,pr(lt,1.45+i*0.12,1.8+i*0.12),C.red,8));
  P.head(g,"А ДВОР|У НАС ОДИН.",{x:80,y:1060,size:170,col:C.red,lt,t0:1.9});
}

// 4. Бумага: таймлайн двора и вывод
function s4(g,lt){
  P.kicker(g,"ДВОР ПОМНИТ ВСЁ.",{x:540,y:430,size:32,col:C.ink,align:"center",lt,t0:0.1});
  P.timeline(g,lt,{x0:190,x1:890,y:740,t0:0.4,dur:1.4,col:C.ink,pts:[
    {u:0,year:"1962",label:"ДОМ\nПОСТРОЕН"},{u:0.55,year:"1987",col:C.red,big:false},{u:1,year:"2026",label:"МЫ\nЗДЕСЬ"}]});
  P.head(g,"ДОМУ НУЖНЫ|ЛЮДИ.",{x:540,y:1120,size:175,align:"center",col:C.ink,acc:["ЛЮДИ."],lt,t0:1.9});
}

// 5. Тёмная: график помощи собирается в красную стопку, крюк кладёт последний блок
function s5(g,lt){
  P.dust(g,lt,0.3);
  const ga=pr(lt,1.9,3.1);
  P.head(g,"ПОМОЩЬ",{x:80,y:420,size:130,lt,t0:0.15,out:1.85});
  P.head(g,"ВМЕСТЕ",{x:80,y:420,size:130,col:C.red,lt,t0:2.0});
  P.mono(g,lt<2.0?"СОСЕДЕЙ  14":"ДОМ  01",{x:1000,y:400,size:22,align:"right",step:0,col:"#8E8C94"});
  P.bars(g,lt,{vals:[.55,.68,.9,.52,.6,.72,.38,.62,.78,.95,.42,.66],x0:100,x1:980,yb:1360,h:620,t0:0.3,step:0.05,gather:ga,cx:540,blockH:46,stackW:170});
  P.crane(g,540,1360-12*46,pr(lt,3.0,3.75),{w:170,h:46});
  P.mono(g,"ИЛЛЮСТРАЦИЯ",{x:1000,y:1420,size:17,align:"right",step:0,col:"#5E5D66",alpha:eo(pr(lt,0.5,1))});
}

// 6. Бумага: доска-двор, фишки из хаоса в круг, цитата с маркером
function s6(g,lt){
  P.chess(g,lt,{cx:540,cy:640,size:600,p:pr(lt,1.0,2.7),form:"ring",t0:0.05,n:30});
  P.kicker(g,"ДВОР СВЕРХУ",{x:120,y:1050,size:28,col:C.red,dot:false,lt,t0:0.4,track:0.4});
  const q=P.quote(g,"Двор похож на доску: у каждого своя клетка, но игра общая.",{x:120,y:1140,w:840,size:58,col:C.ink,hl:["игра","общая."],hlAt:2.5,lt,t0:0.6,step:0.08});
  P.attrib(g,"В. ЛАДОГИНА · ЗАПИСКИ О ДВОРЕ",{x:120,y:q.bottom+90,col:"#8A8379",rule:false,lt,t0:2.6});
}

// 7. Тёмная с кругами: колонны встают по одной, фронтон
function s7(g,lt){
  P.rings(g,lt,{cy:900});
  P.kicker(g,"ЧТО ДЕРЖИТ ДОМ",{x:540,y:300,size:28,col:C.gold,align:"center",dot:false,lt,t0:0.1,track:0.4});
  P.head(g,"ДОМ ДЕРЖИМ МЫ.",{x:540,y:500,size:140,align:"center",col:C.gold,lt,t0:1.9});
  P.columns(g,lt,{cx:540,yb:1270,w:900,h:460,labels:["ДОВЕРИЕ","ПОМОЩЬ","РАЗГОВОР","ОБЩИЙ ДВОР"],t0:0.35,step:0.35,ped:1.75,pedLabel:"НАШ ДОМ",labSize:21});
}

// 8. Финал на красном
function s8(g,lt){
  P.head(g,"ЗНАЙ|СОСЕДЕЙ.",{x:540,y:660,size:210,align:"center",col:C.cream,lt,t0:0.12});
  P.head(g,"ДЕРЖИСЬ|ВМЕСТЕ.",{x:540,y:1110,size:210,align:"center",col:C.ink,lt,t0:0.75});
  P.quote(g,"Город держится на соседях.",{x:540,y:1480,size:58,italic:1,align:"center",col:C.cream,lt,t0:1.5,step:0.12});
  P.mono(g,"ЭССЕ О ДВОРЕ · ДОМ НА САДОВОЙ · 2026",{x:540,y:1590,size:18,align:"center",col:"rgba(255,232,222,0.7)",lt,t0:2.0,step:0.015});
}

let GL_=null;
function glitchList(){if(GL_)return GL_;GL_=[];
  for(const j of [2,4,5,7])GL_.push({at:CUTS[j],dur:0.34});           // склейки
  for(const a of [1.5,2.4,3.2])GL_.push({at:CUTS[1]+a-0.04,dur:0.2,amt:0.6,y0:760,y1:1240}); // смена слова
  GL_.push({at:CUTS[5]+1.95,dur:0.22,amt:0.7,y0:270,y1:460});
  return GL_;}
const SC=[s0,s1,s2,s3,s4,s5,s6,s7,s8];
function draw(t,k){
  const g=k.g;if(!CUTS)CUTS=P.cutsFromSubs(k);
  const {i,lt}=P.scene(t,CUTS),kind=BGS[i];
  P.bg(g,kind);
  P.withGlitch(g,t,glitchList(),kind,()=>{P.camera(g,lt);SC[i](g,lt,k);P.camEnd(g);});
  // переходы
  P.iris(g,t,CUTS[1]);
  P.stairs(g,t,CUTS[3],"dark","paper");
  P.stairs(g,t,CUTS[6],"dark","paper",{dir:1});
  P.iris(g,t,CUTS[8],{toRed:1});
  P.hud(g,t,{theme:kind,label:"ДВОР / ЭССЕ 2026",chapter:CH[i],dur:k.duration});
}

function sound(s){
  const c=PLK.cutsFromSubs(s);
  PLK.cutSounds(s,c,TR,0.14);
  const E=[
    [0,0.25,"type",.07],[0,0.35,"woodblock",.13,0.7],[0,1.25,"kalimba",.1,0.8],
    [1,0.2,"pop_soft",.08],[1,0.5,"woodblock",.12,0.8],[1,1.5,"woodblock",.12,0.9],[1,2.4,"woodblock",.12,1.0],[1,3.2,"wood",.14,0.9],[1,3.3,"sparkle",.07],
    [2,0.3,"kalimba",.1,0.7],[2,2.3,"type",.07],
    [3,0.15,"odometer",.08],[3,0.35,"woodblock",.12,0.75],[3,1.45,"toggle_off",.1,0.8],[3,1.9,"wood",.14,0.8],
    [4,0.45,"pop_soft",.09],[4,1.15,"pop_high",.08],[4,1.75,"pop_soft",.09],[4,1.9,"woodblock",.12,0.8],
    [5,0.3,"counter",.1],[5,2.0,"abacus",.12],[5,3.7,"drop",.14],
    [6,0.35,"pop_double",.09],[6,1.0,"bubble",.09],[6,2.5,"sparkle",.08],
    [7,0.35,"wood",.12,0.8],[7,0.7,"wood",.12,0.9],[7,1.05,"wood",.12,1.0],[7,1.4,"wood",.12,1.1],[7,2.0,"magic",.1],[7,1.9,"woodblock",.12,0.8],
    [8,0.12,"woodblock",.16,0.7],[8,0.75,"woodblock",.16,0.6],[8,1.5,"success3",.12],[8,2.0,"fanfare_soft",.1]];
  for(const e of E){if(e[0]>=c.length)continue;const t=c[e[0]]+e[1];if(t<s.duration)s.play(t,e[2],e[3],{pitch:e[4]||1});}
}
