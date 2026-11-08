// example.js: «Помощник AI» в стиле POPS. Сквозной герой: телефон. Счётчик: рейтинг 0..92. Штамп: БРАТЬ.
const S=POPS,P=S.PAL;
let CUTS=null;
const POSES=[{x:540,y:1170,s:.82,r:-.1},{x:540,y:1190,s:1,r:0},{x:540,y:1190,s:.98,r:.06},
  {x:310,y:1080,s:.82,r:-.04},{x:540,y:1180,s:.66,r:0}];
const URL='pomoshnik.jagser.deno.net';
const thm=i=>i===CUTS.length-2?S.theme('light'):S.theme(i);

// рейтинг сцены 2: значение и цвет считаются из t
function rating(lt){const v=S.countInt(lt,.35,2,0,92);return{v,col:S.gaugeColor(v),ai:v<40?2:v<70?1:0};}

// ---------- экраны героя (координаты экрана -212..212 × -452..452) ----------
function scr0(g,lt,t){
  g.save();g.translate(-160,-370);S.mark(g,64,{text:'AI',col:P.ink});g.restore();
  S.skeleton(g,-110,-388,150,1,P.ink,{h:16});
  g.globalAlpha=.3;S.skeleton(g,-110,-362,100,1,P.ink,{h:12});g.globalAlpha=1;
  S.chatStack(g,lt,[{ta:.5,me:0,w:240,n:2},{ta:1.1,me:1,w:200,n:1},{ta:1.7,me:0,w:260,n:3},{ta:2.2,me:1,w:170,n:1}],{y:-290});
  S.card(g,-190,350,380,74,{r:37,shadow:false,stroke:'rgba(21,19,43,.12)'});
  S.circle(g,150,387,26*(1+.12*Math.sin(t*6)),P.coral);
  g.fillStyle='#fff';S.rr(g,144,372,12,22,6);g.fill();
}
function scr1(g,lt,t){
  g.fillStyle='#3B3A55';g.fillRect(-212,-452,424,904);
  g.save();g.translate(Math.sin(t*1.4)*6,Math.cos(t*1.1)*5);
  g.fillStyle='#ECE7DD';S.rr(g,-170,-340,340,570,30);g.fill();
  g.fillStyle='#D6CFC2';g.fillRect(-170,-235,340,6);
  S.circle(g,-120,-285,18,'#9C9488');S.circle(g,-70,-285,18,'#9C9488');
  S.circle(g,110,-285,22,P.blue);
  S.circle(g,0,-10,130,'#BDB5A8');S.circle(g,0,-10,100,'#6E8FC4');S.circle(g,-30,-45,38,'rgba(255,255,255,.35)');
  const e=S.spring(lt-.45,7);
  if(e>0){S.ripples(g,110,-285,26,lt-.45,P.sun,{span:60,speed:1.2,a:Math.min(e,1)});S.circle(g,110,-285,14*e,P.sun);}
  g.restore();
  S.corners(g,0,-70,188,300,S.eo(S.prog(lt,.05,.35)),'#fff');
  const ba=S.eo(S.prog(lt,.95,1.12));
  if(ba>0){g.globalAlpha=ba;S.eqBars(g,0,262,t,P.sun);
    g.fillStyle='rgba(14,13,31,.82)';S.rr(g,-200,296,400,150,26);g.fill();g.globalAlpha=1;
    S.words(g,{text:'Нажми синюю кнопку вверху',hi:1,x:0,y:356,size:54,wt:700,maxW:360,lines:2,
      col:'#fff',acc:P.sun,t0:1,step:.14},lt);}
}
function scr2(g,lt,t){
  g.fillStyle='#F3ECDF';g.fillRect(-212,-452,424,904);
  const r=rating(lt);
  S.goods(g,0,-290,1,t,{pick:lt>.3?1:null,pickCol:r.col});
  S.gaugeCard(g,0,260,lt,.2,{p:r.v/100,value:r.v,col:r.col,label:'из 100',shadow:false});
}
function scr3(g,lt,t){
  g.fillStyle='#FFE3CC';g.fillRect(-212,-452,424,904);
  S.person(g,0,0,1,t,{hairStyle:'bun',hair:'#C9C9D1',glasses:true,shirt:P.violet});
  g.fillStyle=P.ink;S.rr(g,80,-430,115,160,18);g.fill();
  S.circle(g,137,-372,26,'#F2C7A5');
  g.fillStyle=P.coral;g.beginPath();g.arc(137,-280,40,Math.PI,S.TAU);g.fill();
  S.circle(g,-60,380,36,'#fff');S.circle(g,60,380,36,P.red);
  g.fillStyle=P.ink;S.rr(g,-68,362,16,30,8);g.fill();
  if(lt>.4){S.rippleOnce(g,-60,380,36,lt,2.1,P.sun);S.pathDot(g,S.prog(lt,.5,1.8),160,-150,-60,380,{bend:80});}
}
function scr4(g,lt,t){
  g.fillStyle=P.coral;g.fillRect(-212,-452,424,904);
  S.ripples(g,0,-60,150,lt,'#fff',{span:120,speed:.7});
  const e=S.spring(lt+.14,7);
  g.save();g.translate(0,-60);g.scale(e,e);S.mark(g,230,{text:'AI',col:P.ink});g.restore();
  g.fillStyle='rgba(255,255,255,.55)';
  [0,1].forEach(j=>{const w=S.eo(S.prog(lt,.5+j*.15,.9+j*.15))*(260-j*90);if(w>0){S.rr(g,-130,180+j*40,w,18,9);g.fill();}});
}
const SCR=[scr0,scr1,scr2,scr3,scr4];

// ---------- внешний слой сцены ----------
function outer(g,i,sc,t,th){
  const lt=sc.lt,end=sc.last?null:sc.t1;
  if(i===0){
    const h=S.headline(g,'Помощник AI','AI',330,t,-.06,th,{size:150,tEnd:end});
    S.caption(g,'чат, камера, голос',h.bottom+110,t,.7,th,{size:62,tEnd:end});
  }
  if(i===1)S.headline(g,'Наведи камеру','камеру',360,t,sc.t0+.05,th,{tEnd:end});
  if(i===2){
    S.headline(g,'Рейтинг цветом','цветом',330,t,sc.t0+.05,th,{size:130,tEnd:end});
    const r=rating(lt),le=S.eo(S.prog(lt,.3,.6))*S.leave(t,sc.t1,.2);
    S.trafficDots(g,150,560,r.ai,le);
    S.stamp(g,790,560,'БРАТЬ',lt,2.15,{col:P.green});
  }
  if(i===3){
    S.headline(g,'Для всей семьи','семьи',330,t,sc.t0+.05,th,{size:120,tEnd:end});
    [['Перевод','chat',P.coral],['Счёт','chart',P.green],['Родителям','heart',P.blue]].forEach(([lb,ic,c],j)=>
      S.tileCard(g,545,620+j*225,465,190,lb,t,sc.t0+.25+j*.75,{icon:ic,col:c}));
  }
  if(i===4){
    const h=S.headline(g,'Помощник AI','AI',340,t,sc.t0-.1,th);
    S.caption(g,'в браузере телефона',h.bottom+90,t,sc.t0+.35,th,{size:58});
  }
}

function draw(t,k){
  const g=k.g;CUTS=CUTS||S.cutsFromSubs(k);
  t=Math.min(t,k.duration-.01);
  const sc=S.scene(t,CUTS),i=Math.min(sc.i,SCR.length-1),lt=sc.lt,th=thm(sc.i),ph=S.heroPose(t,CUTS,POSES);
  S.bg(g,t,th);
  S.camera(g,t,lt,{first:sc.i===0,dy:i===2?S.thud(lt,2.35):0});
  const de=Math.min(S.spring(lt,7),1.2);
  S.halo(g,ph.x,ph.y,430*ph.s,de,th.acc);
  if(i!==3)S.orbiters(g,ph.x,ph.y,470*ph.s,t,th,{seed:i*.7,k:de});
  outer(g,i,sc,t,th);
  if(!sc.last)S.circleWipe(g,t,sc.t1,ph.x,ph.y,thm(sc.i+1).bg);
  S.device(g,ph,g=>SCR[i](g,lt,t),{flash:sc.i?S.flashK(lt):0});
  S.camEnd(g);
}

function sound(s){
  const C=S.cutsFromSubs(s),c=j=>C[Math.min(j,C.length-1)];
  const ev=[
    [0,'pop_high',.16],[.5,'bubble',.1],[.75,'wood',.1],[1.1,'bubble',.1,1.1],[1.7,'bubble',.1,1.2],[2.2,'bubble',.1,1.3],
    [c(1)+.35,'click',.12],[c(1)+.45,'pop_soft',.12],[c(1)+1,'notify',.12],[c(1)+1.5,'type',.08],
    [c(2)+.2,'pop_soft',.1],[c(2)+.4,'counter',.12],[c(2)+.64,'tick',.12],[c(2)+.98,'tick',.12,1.3],
    [c(2)+2,'success',.14],[c(2)+2.33,'drop',.18],
    [c(3)+.25,'pop_soft',.13],[c(3)+1,'pop_soft',.13,1.1],[c(3)+1.75,'pop_soft',.13,1.2],[c(3)+2.1,'toggle_on',.12],
    [c(4)-.05,'pop_high',.16],[c(4)+.25,'magic',.12],
    [c(4)+1,'type',.08],[c(4)+1.4,'type',.08],[c(4)+1.8,'type',.08],[c(4)+2.05,'success3',.18],
    ...S.cutSounds(C)];
  S.sfx(s,ev);
}