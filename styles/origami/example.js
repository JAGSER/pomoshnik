// video.js: «Как люди научились печь хлеб», собран на ORIGA («Сказка на бумаге»).
// Сквозной герой: светлячок. Без склеек: наезд в рисунок на странице -> панорама поле/жернов/деревня -> растворение в ночь ->
// наклон камеры в небо за искрами -> утро с хлебом -> отъезд в кляксу на странице -> перелистывание -> итоговая страница.
const O=ORIGA,C=O.C,W=O.W,H=O.H;
const CUTS=[0,4.4,9.9,15,20,25,28.3];

// ---------- светлячок: путь в координатах экрана ----------
const FF=[[2.95,540,860],[3.6,640,760],[4.6,700,820],[6,760,1130],[8,420,1170],[9.7,600,1060],[11.2,760,1180],[13,560,1120],[14.8,650,980],
  [16.6,820,1160],[18.6,560,1100],[20.6,700,1200],[23.3,600,1180],[24.6,560,560],[25.0,560,600],[26.3,505,1278],[28.3,505,1278]];
function ffPos(t){const p=O.kf(t,FF.map(k=>[k[0],[k[1],k[2]]]),O.sm);const free=(t>26.3&&t<28.4)?0:1;
  return[p[0]+Math.sin(t*2.3)*26*free+Math.sin(t*5.1)*6*free,p[1]+Math.sin(t*3.1)*18*free+Math.cos(t*4.3)*5*free];}
function hero(g,t,a=1){if(t<2.95)return;const s=O.spr((t-2.95)/1.1)*1.0;const pts=[];for(let i=0;i<16;i++){const tt=t-i*.045;if(tt<2.95)break;pts.push(ffPos(tt));}
  const land=t>26.3&&t<28.4;const ze=O.kf(t,[[27.6,1],[28.3,1.6]]),Z=q=>[540+(q[0]-540)*ze,960+(q[1]-960)*ze];
  O.trail(g,pts.map(Z),a*(land?.3:1));const p=Z(ffPos(t));O.firefly(g,p[0],p[1],s*ze,t,{a,glow:land?.75:1});}

// ---------- жернов (свой предмет ролика) ----------
function quernBase(g){g.lineJoin='round';
  g.beginPath();g.moveTo(-140,-26);g.lineTo(-140,-2);g.ellipse(0,-2,140,36,0,Math.PI,0,true);g.lineTo(140,-26);g.ellipse(0,-26,140,36,0,0,Math.PI);g.closePath();O.sf(g,'#968E81');
  g.beginPath();g.ellipse(0,-26,140,36,0,0,7);O.sf(g,'#BDB5A7');
  g.beginPath();g.ellipse(0,-58,118,30,0,0,Math.PI);g.lineTo(-118,-84);g.ellipse(0,-84,118,30,0,Math.PI,0,true);g.closePath();O.sf(g,'#A9A194');
  g.beginPath();g.ellipse(0,-84,118,30,0,0,7);O.sf(g,'#C7C0B2');g.beginPath();g.ellipse(0,-84,22,7,0,0,7);O.sf(g,'#6E655C',2);
  g.beginPath();g.ellipse(150,6,62,15,0,0,7);O.sf(g,C.flour,2);}
function quern(g,x,y,t){const rot=t*2.2;O.blitS(g,O.spriteOf('quern',380,160,145,120,quernBase),x,y);
  g.save();g.strokeStyle=O.col('rgba(90,80,70,.35)');g.lineWidth=1.5;g.beginPath();for(let i=0;i<6;i++){const a=rot+i*1.05;g.moveTo(x+Math.cos(a)*30,y-84+Math.sin(a)*8);g.lineTo(x+Math.cos(a)*110,y-84+Math.sin(a)*28);}g.stroke();
  const hx=x+Math.cos(rot)*86,hy=y-84+Math.sin(rot)*22;g.lineJoin='round';g.beginPath();g.roundRect(hx-6,hy-78,12,80,5);O.sf(g,C.woodProp,2.2);g.restore();
  g.save();g.fillStyle='#FBF6EA';for(let i=0;i<10;i++){const u=((t*.8+i/10)%1);g.globalAlpha=(1-u)*.8;g.beginPath();g.arc(x+120+u*70+Math.sin(i*3)*20,y-30-u*60-O.hn(i)*20,3+u*4,0,7);g.fill();}g.restore();
  return[hx,hy-74];}

// ---------- панорама дня: поле -> жернов -> деревня ----------
function day(g,t,o={}){const noOv=o.noOv;const camX=O.kf(t,[[4,540],[5.8,540],[9.7,640],[10.9,1640],[14.6,1720],[15.8,2740],[20.6,2810]]);
  const dk=O.prog(t,15.8,19.4),P=[['day',1],['dusk',O.sm(O.prog(t,17,17.8))]];O.light(dk*.22);
  const zw=O.kf(t,[[4.0,3.0],[5.8,1.0]]),Z=1.2;
  O.sky(g,[['dawn',1],['day',O.prog(t,9.7,10.8)],['dusk',dk]],zw>1.001?H:1130);
  g.save();if(zw>1.001)O.zoom(g,zw,540,880);g.save();O.wz(g,Z);
  const sy=O.kf(t,[[4,918],[10,770],[16,620],[19.5,880]]),sx=O.kf(t,[[4,540],[10,470],[16,300],[19.5,220]]);
  O.sun(g,sx,sy,O.kf(t,[[4,74],[5.8,92]]),t,{beams:1-O.prog(t,9,11)*.6,rays:1});
  O.birds(g,t,180,560,3,1-dk);
  if(t>15.6)O.blueprint(g,560,720,.9,O.sm(O.prog(t,16,18.8)),t,{gears:1});
  g.restore();if(zw>1.001)O.hillsStack(g,camX,'day',{z:Z});else O.hills(g,camX,P,0,{z:Z});
  g.save();O.wz(g,Z);g.translate(W/2-camX,0);
  const vis=(x,m=200)=>Math.abs(x-camX)<540/1.2+m;
  if(vis(150))O.tree(g,150,O.groundY(150)+8,1.15);if(vis(1180))O.tree(g,1180,O.groundY(1180)+8,.9);if(vis(1990))O.windmill(g,1990,O.groundY(1990)+10,1.1,t);if(vis(2250))O.tree(g,2250,O.groundY(2250)+8,1,{kind:'round'});if(vis(3260))O.tree(g,3260,O.groundY(3260)+8,1.1);
  O.tufts(g,[60,330,760,1010,1300,1450,1880,2120,2360,2600,2900,3150].filter(x=>vis(x,40)),1250,t);
  const vF=camX<1400,vQ=camX>800&&camX<2500,vV=camX>1900;
  // поле
  if(vF){  O.soil(g,540,1452,480,74);O.field(g,110,970,1428,46,t,{h:190,depth:44,seed:2});
  const pick=O.sm(O.prog(t,6.4,7.2));
  O.person(g,600,1478,O.spr((t-5.1)*1.2),{hair:'bun',dress:C.green,aL:1.2,aR:O.lerp(1.1,2.5,pick),happy:t>7.2,t,seed:1,
    hold:pick>.5?(h,x,y)=>{h.save();h.translate(x,y);h.rotate(-.3);O.field(h,0,1,30,1,t,{h:40,wind:.2});h.restore();}:null});
  O.field(g,140,960,1492,18,t,{h:150,depth:12,seed:7});
  const bx=O.kf(t,[[4.6,1180],[7,880]],O.eo),wk=t<7?t*2.2:null;
  O.person(g,bx,1488,.95,{hair:'cap',dress:C.beige,pat:'stripe',skin:C.skin2,aR:.2,aL:.25,walk:wk,flip:true,t,seed:2,happy:t>7.6,
    hold:(h,x,y)=>O.basket(h,x,y+56,.85,{fill:t>7.3,t})});
  }
  // жернов
  if(vQ){  const hd=quern(g,1660,1462,t);const sx2=1478+22,sy2=1474-194;
  O.person(g,1478,1474,1,{hair:'short',dress:C.blue,skin:C.skin2,aR:Math.atan2(hd[0]-sx2,hd[1]-sy2),aL:.3,t,seed:3});
  O.sack(g,1920,1478,.9);O.person(g,1846,1482,.78,{hair:'curly',dress:C.mustard,pat:'dots',skin:C.skin3,hairC:C.hairDk,aL:.2,aR:1.5,flip:true,happy:true,t,seed:4});
  }
  // деревня
  if(vV){  O.hut(g,2450,1352,150,110);O.hut(g,3050,1342,170,120);
  O.oven(g,2740,1468,1.15,t,{smoke:O.prog(t,15.4,16.4)});
  O.person(g,2565,1480,1,{hair:'long',dress:C.lilac,aR:O.lerp(.4,1.6,O.sm(O.prog(t,16.2,16.9))),aL:.25,t,seed:5,
    hold:(h,x,y)=>{h.save();h.translate(x,y);h.beginPath();h.roundRect(-6,-8,96,14,5);O.sf(h,C.woodProp,2);O.bread(h,52,-8,.3,t);h.restore();}});
  O.person(g,2935,1486,.8,{hair:'cap',dress:C.pink,pat:'dots',hairC:C.hairRed,aR:1.9,flip:true,happy:true,t,seed:6});}
  g.restore();
  O.front(g,camX,P,0,{z:Z});O.fg(g,camX,P,0,1,Z);g.restore();
  if(!noOv){O.overlay(g,.8);O.motes(g,t,.8);}}

// ---------- ночь у печи ----------
function night(g,t,dy=0,noOv){const camX=2770;O.light(.8);const P='night',Z=1.2,cx=camX+O.kf(t,[[19.6,40],[23.5,-40]]);
  O.sky(g,'night',dy>0?H:1130);O.moon(g,860,520+dy*.35,52);g.save();g.translate(0,dy*.3);O.stars(g,t,1,3,10);g.restore();
  O.hills(g,cx,P,dy,{z:Z});
  g.save();O.wz(g,Z);g.translate(W/2-cx,dy);
  O.tree(g,2420,O.groundY(2420)+8,1.05,{kind:'round',c:'#7A9270'});
  O.hut(g,2470,1352,150,110,{lit:.8});O.hut(g,3070,1342,170,120,{lit:.8});
  const fi=O.sm(O.prog(t,19.9,20.9));
  O.oven(g,2770,1468,1.15,t,{fire:fi});
  O.sparks(g,2770,1468-236,t,{n:22,h:560,a:fi});
  O.person(g,2520,1500,1,{sit:true,hair:'cap',dress:C.beige,pat:'stripe',skin:C.skin2,aR:1.3,happy:true,t,seed:1});
  O.person(g,3000,1504,1,{sit:true,hair:'long',dress:C.lilac,flip:true,t,seed:5});
  O.person(g,2880,1530,.8,{sit:true,hair:'bun',dress:C.pink,pat:'dots',skin:C.skin3,hairC:C.hairDk,flip:true,mouth:'o',t,seed:6});
  if(fi>.01){g.save();g.globalAlpha=fi;O.blitS(g,O.spriteOf('firelight',1200,660,600,450,h=>{O.pool(h,0,0,600,200,.9);O.pool(h,0,-10,330,110,.5);O.glow(h,0,-110,330,.4,'fire');}),2770,1490);g.restore();}
  g.restore();
  O.front(g,cx,P,dy,{z:Z});O.fg(g,cx,P,dy,1,Z);
  if(!noOv){O.overlay(g,.8);O.motes(g,t,.7,40,4,true);}}

// ---------- утро: семья и хлеб ----------
function morning(g,t,dy=0,lite){O.light(0);const ze=lite?1:O.kf(t,[[27.6,1],[28.3,1.6]]);g.save();if(ze>1.001)O.zoom(g,ze,540,960);const P='day',Z=1.2,camX=540+O.kf(t,[[25,-30],[28.3,30]]),HX=760;
  O.sky(g,'day',dy>0?H:1130);O.sun(g,850,560+dy*.35,72,t,{beams:.7});O.birds(g,t,140,520+dy*.35,3);
  O.hills(g,camX+HX,P,dy,{z:Z});
  g.save();O.wz(g,Z);g.translate(W/2-camX,dy);
  O.tree(g,110,O.groundY(110+HX)+8,1.05);O.tufts(g,[90,260,690,980],1250,t);
  O.house(g,870,1400,230,210,{});
  O.person(g,290,1440,1,{hair:'long',dress:C.pink,aR:.5,aL:.2,happy:true,t,seed:7});
  O.person(g,650,1440,1.04,{hair:'short',dress:C.blue,skin:C.skin2,aL:.6,aR:.2,t,seed:8});
  const up=O.sm(O.prog(t,26.6,27.2));O.person(g,470,1446,.78,{hair:'curly',dress:C.mustard,skin:C.skin3,hairC:C.hairDk,aL:O.lerp(.3,2.5,up),aR:O.lerp(.3,2.5,up),happy:t>26.8,t,seed:9});
  O.table(g,470,1420,600,{cloth:'#F1E6D2'});
  O.bread(g,470,1402,1,t,{steam:O.prog(t,25.6,26.4)});
  g.restore();
  O.front(g,camX+HX,P,dy,{z:Z});O.fg(g,camX,P,dy,1,Z);
  g.restore();if(!lite){O.overlay(g,.8);O.motes(g,t,.8,26,7);}}

// ---------- книга ----------
const zbO=t=>t<3.2?1:O.lerp(1,1.8,O.eio(O.prog(t,3.2,4.6)));
let PV=null;
// снимок страницы после 3.6 с (всё нарисовано, надпись погасла): дальше наезд одним блитом
function pageView(){if(!PV){PV=new OffscreenCanvas(W,H);const h=PV.getContext('2d');O.reset(h);pageContent(h,3.6);}return PV;}
function opening(g,t,a=1,ovA){if(t>=3.6){g.save();g.globalAlpha=a;O.zoom(g,zbO(t),540,860);g.drawImage(pageView(),0,0);g.restore();}
  else{const zb=zbO(t);g.save();if(zb>1.001)O.zoom(g,zb,540,860);pageContent(g,t);g.restore();}
  O.overlay(g,ovA==null?.85*a:ovA);O.motes(g,t,.7*a);}
function pageContent(g,t){O.book(g);
  g.save();g.globalAlpha=1-O.sm(O.prog(t,3.1,3.6));O.pageText(g,'Давным-давно',560,440,108,O.eo(O.prog(t,.15,1.05)));g.restore();
  const u=O.prog(t,.9,2.3);O.pcircle(g,540,860,150,u,{c:'#4A3B30',lw:3.2,wob:.012});
  const fa=O.sm(O.prog(t,2.35,2.9));if(fa>0)O.sun(g,540,860,150,t,{a:fa,rays:O.prog(t,2.5,3.1)});
  [[290,650,2.55],[810,610,2.7],[260,1080,2.85],[820,1150,3.0],[600,1290,3.1]].forEach(([x,y,t0],i)=>O.pstar(g,x,y,O.spr((t-t0)*1.4)*(i%2?1:1.3)));
  let tip;if(t<.55)tip=[980,1420];else if(t<.9){const q=O.eio(O.prog(t,.55,.9));tip=[O.lerp(980,540,q),O.lerp(1420,710,q)];}
  else if(t<2.3){const a=u*Math.PI*2;tip=[540+Math.sin(a)*150,860-Math.cos(a)*150];}else{const q=O.eio(O.prog(t,2.3,2.85));tip=[O.lerp(540,980,q),O.lerp(710,1420,q)];}
  O.pencil(g,tip[0],tip[1],-.5);}
let PI=null;
// картинка-клякса со страницы: утро в момент 28.3 с, запечено один раз в 1.6x (кадр 1728x3072), край обрезан кляксой
function paintingImg(){if(!PI){const S=1.6;PI=new OffscreenCanvas(Math.round(W*S),Math.round(H*S));const h=PI.getContext('2d');O.reset(h);h.scale(S,S);
  morning(h,28.3,0,true);O.firefly(h,505,1278,1,28.3,{glow:.75});O.light(0);h.globalCompositeOperation='destination-in';O.blobPath(h,{x:0,y:0,w:W,h:H});h.fillStyle='#000';h.fill();
  h.globalCompositeOperation='source-over';O.blobPath(h,{x:0,y:0,w:W,h:H});h.strokeStyle='rgba(40,40,60,.22)';h.lineWidth=Math.max(2,424*.008)/(424/1080);h.stroke();}return PI;}
function ending(g,t){const zb=O.kf(t,[[28.3,4.075],[29.6,1.0]]);const R0={x:540-212,y:960-377,w:424,h:754};
  g.save();if(zb>1.001)O.zoom(g,zb,540,960);O.book(g);
  if(t<30.4)g.drawImage(paintingImg(),R0.x,R0.y,R0.w,R0.h);
  const tp=O.prog(t,29.55,30.35);
  O.pageTurn(g,tp,h=>{O.stamp(h,'bread',390,780,1.5*O.spr((t-30.25)*1.3));O.stamp(h,'wheat',760,770,1.35*O.spr((t-30.45)*1.3));
    const pt=O.pageText(h,'Сказка о хлебе',560,1120,94,O.eo(O.prog(t,30.6,31.6)));
    h.save();h.globalAlpha=.6*O.sm(O.prog(t,31.5,32));O.squiggle(h,560-pt.w/2,560+pt.w/2,1150,O.prog(t,31.5,32.1),C.terra,4);h.restore();});
  const wr=O.prog(t,30.6,31.6);let tip=[980,1420];if(t>30.3&&t<31.9){const pw=490,q=O.sm(O.prog(t,30.3,30.6))*(1-O.sm(O.prog(t,31.6,31.9)));tip=[O.lerp(980,560-pw/2+pw*wr,q),O.lerp(1420,1110,q)];}
  O.pencil(g,tip[0],tip[1],-.5);g.restore();O.overlay(g,.85);
  if(t>30.6){const a=O.sm(O.prog(t,30.6,31.2));O.firefly(g,O.lerp(140,880,O.eo(O.prog(t,30.6,31.8))),O.lerp(1300,560,O.eo(O.prog(t,30.6,31.8)))+Math.sin(t*3)*8,.9,t,{a});}
  O.motes(g,t,.6);}

const mdy=t=>O.kf(t,[[25.0,1500],[26.0,0]],O.eo);
let PRE=false;
function draw(t,k){const g=k.g;O.reset(g);O.warm();
  if(!PRE){PRE=true;[4.2,6,9.5,12,15.3,16.9,17.5,19,19.4].forEach(tt=>O.prewarm(h=>day(h,tt)));O.prewarm(h=>night(h,22));O.prewarm(h=>morning(h,26));O.prewarm(h=>opening(h,2));pageView();O.prewarm(h=>ending(h,31));O.prewarm(h=>{h.drawImage(paintingImg(),0,0,40,70);h.drawImage(pageView(),0,0,40,70);});}
  O.light(0);
  if(t<4.4){if(t>3.9){const a=O.sm(O.prog(t,3.9,4.4));day(g,t,{noOv:true});opening(g,t,1-a,O.lerp(.85,.8,a));O.motes(g,t,.8*a);}else opening(g,t);}
  else if(t<20.6){if(t>19.7){const a=O.sm(O.prog(t,19.7,20.6));day(g,t,{noOv:true});O.layer(g,a,h=>night(h,t,0,true));O.overlay(g,.8);O.motes(g,t,.8*(1-a));O.motes(g,t,.7*a,40,4,true);}else day(g,t);}
  else if(t<25.1){const dy=O.kf(t,[[23.6,0],[25,1500]]);night(g,t,dy);if(t>24.7)O.layer(g,O.sm(O.prog(t,24.7,25.1)),h=>morning(h,t,mdy(t)));}
  else if(t<28.3){morning(g,t,mdy(t));}
  else ending(g,t);
  if(t<28.3)hero(g,t);
  O.caption(g,t,'Зерно в поле',4.9,9.75,{key:0});
  O.caption(g,t,'Жернов и мука',10.6,14.75,{key:0});
  O.caption(g,t,'Первая печь',15.8,19.75,{key:1});
  O.caption(g,t,'Огонь всю ночь',20.7,23.9,{key:0});
  O.caption(g,t,'Утренний хлеб',26.0,28.25,{key:1});}

function sound(s){const P=(t,n,v,p)=>s.play(t,n,v,p?{pitch:p}:undefined);
  P(.15,'kalimba',.15);P(.6,'woodblock',.09,1.3);P(1.6,'tick',.07);P(2.35,'bubble',.12);P(2.6,'pop_soft',.1);P(2.8,'pop_soft',.1,1.15);P(3.0,'sparkle',.12);P(3.1,'pop_soft',.1,1.3);
  P(3.9,'magic',.13);P(5.0,'kalimba',.12);P(6.8,'pop_high',.1);P(7.3,'wood',.12);
  P(9.9,'marimba_run',.12);P(10.7,'kalimba',.12,1.1);P(11.8,'woodblock',.1,.8);P(13.2,'woodblock',.1,.8);
  P(15.0,'kalimba_run',.12);P(15.9,'kalimba',.12,.9);P(16.3,'tally',.08);P(17.6,'tick',.07);P(18.6,'tick',.07,1.2);
  P(19.8,'magic',.12,.8);P(20.3,'pop_double',.11);P(20.8,'kalimba',.11,.8);P(23.6,'sparkle',.13);
  P(25.0,'kalimba_run',.12,1.1);P(26.1,'kalimba',.12,1.2);P(26.7,'bubble',.11);P(27.0,'pop_high',.1);
  P(28.4,'magic',.12);P(29.6,'bamboo',.12,.7);P(30.25,'pop_high',.12);P(30.45,'pop_high',.11,1.2);P(30.7,'success',.15);P(31.6,'sparkle',.11);}
