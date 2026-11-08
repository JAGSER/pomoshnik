// example.js: «Искра человечества», собран только на ORIGA + canvas.
// Сквозной герой: бумажная искра. Счётчик: год. Штамп: «сегодня».
const O=ORIGA,C=O.C;
const CUTS=[0,3.5,7.5,11,14.5,17.5];
const WIPES=[3.5,7.5,11,14.5];                      // 17.5 без шторки: там вылупление
const CAMS=[[1.12,1,0,0],[1,1.04,50,-50],[1,1.06,0,-20],[1.08,1,0,0],[1,1.1,0,0],[1.06,1,0,0]];
const CAP=[
  {text:'Первый огонь',key:1},
  {text:'Колесо и письмо',key:2},
  {text:'Города и книги',key:2},
  {text:'Свет и сеть',key:2},
  {text:'Вылупился ИИ',key:1},
  {text:'Помощник AI',key:1,size:132,plate:false}];
const YK=[[0,-300000],[3.5,-300000],[4.3,-3500],[7.5,-3500],[8.3,1450],[11,1450],[11.8,1900],[14.5,1900],[15.3,2022],[17.5,2022],[18.3,2026]];
const yfmt=n=>n<0?O.fmtN(-n)+' до н.э.':(n||1)+' год';

// ---------- сцена 1: огонь ----------
function s1(g,lt){
  O.mountain(g,300,1210,480,390,C.sky);
  O.mountain(g,700,1210,560,490,C.sea);
  O.ground(g,1215,C.grass);
  O.sun(g,860,540,64*O.spr(lt),lt);
  [[180,470],[330,600],[620,450],[960,660]].forEach(([x,y],i)=>{const s=12+Math.sin(lt*4+i)*4;
    O.line(g,[[x-s,y],[x+s,y]],4);O.line(g,[[x,y-s],[x,y+s]],4);});
  O.fire(g,540,1215,O.spr(lt));
  const j=lt>2.3?Math.abs(Math.sin((lt-2.3)*9))*30*Math.exp(-(lt-2.3)*1.5):0,up=O.eo((lt-2.3)/.3);
  O.person(g,320,1225-j,O.spr(lt-.35),C.red,O.lerp(.3,-1,up),O.lerp(.1,-1,up));
  O.person(g,780,1225-j*.8,O.spr(lt-.6)*.72,C.blue,O.lerp(.2,-1,up),O.lerp(.9,-1,up));
  if(lt>1.2)O.spark(g,540+Math.sin(lt*3)*14,O.lerp(1110,760,O.eo((lt-1.3)/1.1)),46*O.spr(lt-1.2),lt*.8);
}

// ---------- сцена 2: колесо и письмо ----------
function tablet(g,x,y,s,lt){if(s<=.01)return;g.save();g.translate(x,y);g.rotate(.03);g.scale(s,s);
  O.poly(g,O.rect(0,0,300,360),C.wood);O.shade(g,[[110,-180],[150,-180],[150,180],[110,180]]);
  const n=Math.floor(O.clamp((lt-1.2)/1.6)*16);
  for(let i=0;i<n;i++){const cx=-100+(i%4)*66,cy=-110+Math.floor(i/4)*72;
    if(O.hn(i)>.6){O.line(g,[[cx-18,cy-12],[cx+18,cy-12]],5,'#8E5B3A');O.line(g,[[cx-18,cy+8],[cx+18,cy+8]],5,'#8E5B3A');}
    else O.poly(g,[[cx-18,cy-14],[cx+22,cy],[cx-18,cy+14]],'#8E5B3A',3,0);}
  g.restore();}
function s2(g,lt){
  O.sun(g,250,560,70*O.spr(lt-.1),lt);
  O.ground(g,1235,C.sand);
  const wx=O.lerp(-160,400,O.eo(lt/1.8)),r=110;
  O.person(g,wx-200,1232-Math.abs(Math.sin(lt*9))*12*(lt<1.8),O.spr(lt-.05)*.95,C.green,Math.PI-.15,-.1);
  O.wheel(g,wx,1230-r,r,(wx+160)/r);
  tablet(g,760,1045,O.spr(lt-.8),lt);
  const q=O.eo((lt-2.3)/.6);
  O.spark(g,O.lerp(wx,620,q),O.lerp(1120,870,q)-Math.sin(q*Math.PI)*260,O.lerp(30,40,q),lt);
}

// ---------- сцена 3: города и книги ----------
function s3(g,lt){
  O.poly(g,[[-300,910],[1400,910],[1400,1250],[-300,1250]],'#E8D3A6',5,0);
  [[150,110,170,C.red],[280,100,230,C.orange],[410,120,150,C.teal],[550,90,300,C.blue],[690,120,190,C.green],[830,110,160,C.red],[950,80,220,C.orange]]
    .forEach(([x,w,h,c],i)=>O.house(g,x,912,w,h,c,O.spr(lt-.1-i*.07)));
  O.water(g,1240,lt);
  O.boat(g,O.lerp(180,360,O.eo(lt/3)),1250,O.spr(lt-.9),lt);
  O.book(g,720,1120,O.spr(lt-1.5),lt-1.8,lt>1.8);
  const q=O.eo(lt/.8);
  O.spark(g,O.lerp(620,720,q),O.lerp(870,975,q)+Math.sin(lt*3)*10,40,lt);
}

// ---------- сцена 4: свет и сеть ----------
const NODES=[[180,1180],[340,1300],[520,1200],[700,1320],[880,1170],[260,1050],[820,1040],[540,905]];
const LINKS=[[7,5],[7,6],[7,2],[5,0],[0,1],[2,1],[2,3],[6,4],[4,3]];
function s4(g,lt){
  const on=O.eo((lt-.5)/.25);
  O.net(g,lt,{nodes:NODES,links:LINKS,t0:.55,col:C.teal});
  O.gear(g,210,720,92*O.spr(lt-.2),lt*1.2);
  O.screen(g,860,700,O.spr(lt-.4),{w:140,h:240,rot:0,fill:on?C.screen:'#DDDDDD'});
  O.bulb(g,540,680,1,on);
  const q=O.eo(lt/.5);
  O.spark(g,O.lerp(720,540,q),O.lerp(975,680,q),O.lerp(40,52,q)*(1+.08*on*Math.sin(lt*6)),lt);
}

// ---------- сцена 5: знания сходятся в яйцо ----------
function s5(g,lt){
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2+.3,x0=540+Math.cos(a)*480,y0=880+Math.sin(a)*450,p=O.eo((lt-i*.04)/.6);
    O.line(g,[[x0,y0],[O.lerp(x0,540,p*.55),O.lerp(y0,880,p*.55)]],3,'rgba(78,159,160,.6)');
    const d=(lt*.8+i*.13)%1;O.dot(g,O.lerp(x0,540,d*.6),O.lerp(y0,880,d*.6),8,i%2?C.orange:C.teal);}
  if(lt<.7)O.spark(g,540,O.lerp(680,880,O.eo(lt/.6)),52*(1-O.eo((lt-.2)/.5)),lt);
  const sk=((lt>.9&&lt<1.3)||(lt>1.6&&lt<2)||lt>2.4)?Math.sin(lt*30)*(lt>2.4?.07:.04):0;
  O.egg(g,540,1140,O.spr(lt-.15),{crack:O.clamp((lt-1.5)/1.3),shake:sk});
  O.glow(g,540,880,280*O.clamp((lt-1.5)/1.2),.55);
  O.wheel(g,360,1190,45,0);
  tablet(g,470,1190,.22,0);
  O.book(g,640,1180,.45,0,false);
  O.bulb(g,775,1150,.25,0);
}

// ---------- сцена 6: вылупление и финал ----------
function hatchling(g,x,y,s,lt){if(s<=.01)return;g.save();g.translate(x,y);g.scale(s,s);
  const wv=Math.sin(lt*7)*.35;
  O.poly(g,[[-150,10],[-250,-40+wv*60],[-200,70]],C.teal);
  O.poly(g,[[150,10],[250,-40-wv*60],[200,70]],C.teal);
  O.line(g,[[0,-160],[0,-232]],6);
  const b=O.circ(0,0,170,8,165,Math.PI/8);O.poly(g,b,C.cream,6);
  O.shade(g,[[0,0],b[0],b[1],b[2]]);
  O.poly(g,[[-112,-72],[112,-72],[120,58],[-120,58]],'#3B4A5A',5,0);
  O.face(g,0,-14,150,lt,{eye:'#8FF0D8',blush:false});
  O.dot(g,-118,96,13,C.pink);O.dot(g,118,96,13,C.pink);
  O.spark(g,0,-255,36,lt);
  g.restore();}
function s6(g,lt){
  O.rays(g,520,830,900*O.eo(lt/.7),lt*.15);
  O.egg(g,540,1140,1,{open:O.clamp(lt/.8),inner:()=>hatchling(g,520,830,.55*O.spr(lt)+.45*O.spr(lt-.9),lt)});
  O.chat(g,230,560,O.spr(lt-1.2),lt);
  O.screen(g,860,820,O.spr(lt-1.4),{w:200,h:360,rot:.08,fill:C.cream,draw:(g)=>{
    O.poly(g,[[-40,-70],[40,-70],[50,50],[-50,50]],C.orange,4,0);
    O.poly(g,[[-30,-95],[30,-95],[30,-70],[-30,-70]],C.red,4,0);
    O.check(g,50,-100,26,lt-1.9);
    const r=(lt*1.2)%1;g.strokeStyle=`rgba(229,104,79,${1-r})`;g.lineWidth=4;g.beginPath();g.arc(0,110,12+r*30,0,7);g.stroke();
    O.dot(g,0,110,10,C.red);}});
  [[290,C.blue,.78],[540,C.red,.9],[790,C.green,.62]].forEach(([x,c,s],i)=>
    O.person(g,x,1300,O.spr(lt-1-i*.12)*s,c,.9,-.9+Math.sin(lt*8+i)*.4));
}
const SC=[s1,s2,s3,s4,s5,s6];

function draw(t,k){
  const sc=O.scene(t,CUTS,Math.max(21,k.duration)),cm=O.cam(sc,CAMS[sc.i]);
  const g=O.frame(k,t,{px:cm.x});
  O.camOn(g,cm);SC[sc.i](g,sc.lt);O.camOff(g);
  O.wipe(g,t,WIPES);
  O.timeline(g,t,{n:CUTS.length,i:sc.i,ti:sc.a});
  O.counter(g,t,{keys:YK,fmt:yfmt});
  O.stamp(g,t,{text:'сегодня',t0:18.6,x:870,y:215});
  const fin=sc.i===CUTS.length-1;
  O.caption(g,t,Object.assign({t0:sc.a+.25,t1:fin?null:sc.b},CAP[sc.i]));
  if(fin)O.words(g,t,{text:'для всей семьи',y:1605,size:56,weight:600,t0:sc.a+1.3});
}

function sound(s){const P=(t,n,v,p)=>s.play(t,n,v,p?{pitch:p}:undefined);
  O.sfxCuts(s,WIPES.slice(0,3));                                   // 3.28 / 7.28 / 10.78
  P(0,'kalimba',.16);P(.3,'pop_soft',.12);P(.5,'pop_high',.11);P(1.25,'sparkle',.12);P(2.35,'pop_double',.12);
  P(3.55,'odometer',.1);P(3.82,'pop_soft',.11);P(4.3,'wood',.13);P(4.85,'key_soft',.1);P(5.5,'key_soft',.1,1.2);P(5.85,'bubble',.12);
  P(7.6,'pop_double',.12);P(7.95,'marimba',.11,1.2);P(8.4,'drop',.12);P(9.0,'bubble',.11);P(9.4,'bamboo',.1);
  P(11.05,'odometer',.1);P(11.5,'toggle_on',.14);P(12.1,'tick',.1);P(12.35,'bubble',.1,1.3);P(13.2,'sparkle',.12);
  P(14.28,'magic',.14);P(14.6,'odometer',.09);P(15.4,'wood',.13);P(16.05,'click',.12);P(16.9,'rim',.12);
  P(17.5,'ta_da',.2);P(18.4,'bubble',.12,.8);P(18.6,'woodblock',.15);P(18.9,'pop_high',.11);P(19.4,'success',.16);P(20.1,'sparkle',.1);
}