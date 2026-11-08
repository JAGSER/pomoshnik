// example.js. Ролик "Помощник AI: запуск", переписанный только через LAUNCH и обычный canvas.
const L=LAUNCH,C=L.C;
const T=[0,3,7,10.5,14,17.5];                       // начала фраз = склейки
const K=[[540,2000,0.82,0.15],[540,1250,0.82,-0.04],[540,1170,0.95,0],[540,1180,0.72,0],
 [770,1160,0.68,0.05],[300,1160,0.6,-0.05],[540,1150,0.78,0]]; // [x,y,масштаб,наклон], T.length+1
const NAMES=['Неон','Бумага','Комикс','Пиксели','Мел','Кино'];
const styleIdx=lt=>Math.floor(Math.max(0,lt-0.6)/0.45)%6;
const liveIdx=lt=>lt<1.5?0:lt<2.7?1:2;

// ---------- экраны телефона (локальные координаты -192..192 × -412..412) ----------
function scrHome(g,t,lt){
 L.scrHeader(g,'Помощник AI');
 L.bubble(g,-170,-270,'Привет! Чем помочь?',0,L.spring((lt-1.5)/0.5));
 L.bubble(g,170,-190,'Что это за таблетка?',1,L.spring((lt-2.0)/0.5));
 if(lt>2.4)L.typingDots(g,-150,-90,t);
 L.rr(g,-170,320,340,64,32);g.fillStyle='#fff';g.fill();
 L.micBtn(g,138,352,24,t);
 g.fillStyle=C.mut;g.font=L.font(22,500);g.fillText('Спросите что угодно',-150,360);
}
function scrLive(g,t,lt){
 g.fillStyle='#24262E';g.fillRect(-192,-412,384,824);g.fillStyle='#343743';g.fillRect(-192,150,384,24);
 const st=[0.3,1.5,2.7],i=liveIdx(lt),ox=(1-L.eo((lt-st[i])/0.35))*320;
 L.rr(g,-90+ox,-160,180,310,16);g.fillStyle=[C.sand,C.sky,'#F28482'][i];g.fill();
 g.fillStyle='rgba(255,255,255,0.85)';g.fillRect(-90+ox,-60,180,70);L.dot(g,ox,-25,22,C.dk);
 L.corners(g,t);
 L.badge(g,80+ox,-170,46,[C.good,C.warn,C.bad][i],['4,8','3,4','1,9'][i],L.spring((lt-st[i]-0.3)/0.5));
 if(lt>1.0)L.pulse(g,ox,90,14,t);
 L.typeBox(g,['Хороший выбор','Средне, можно','Лучше не брать'][i],0,220,340,lt,st[i]+0.35,{local:1});
 L.pill(g,-170,-380,'Эфир');
 L.eq(g,0,360,14,t);
}
function scrSum(g,t,lt){
 g.fillStyle='#5B4636';g.fillRect(-192,-412,384,824);
 g.fillStyle='rgba(0,0,0,0.12)';for(let j=0;j<6;j++)g.fillRect(-192,-400+j*140,384,50);
 [[-90,-260,'120 ₽',-0.12],[70,-140,'85 ₽',0.1],[-50,-10,'340 ₽',-0.06]].forEach((q,j)=>
  L.priceTag(g,q[0],q[1],q[2],q[3],L.spring((lt-0.3-j*0.2)/0.5)));
 L.scan(g,lt,1.2,0.8,-320,80);
 const p=L.spring((lt-2.1)/0.5);
 if(p>0){g.save();g.translate(0,250);g.scale(p,p);L.rr(g,-170,-70,340,140,24);g.fillStyle=C.acc;g.fill();
  g.fillStyle=C.dk;g.font=L.font(24,700);L.ctext(g,'Итого',0,-25);g.font=L.font(60,900);L.ctext(g,'545 ₽',0,42);g.restore();}
}
function scrStyles(g,t,lt){
 const si=styleIdx(lt);
 L.tile(g,-192,-412,384,824,L.PALS[si],t);
 L.pill(g,-170,-350,NAMES[si]);
 L.rr(g,-160,370,320,8,4);g.fillStyle='rgba(255,255,255,0.4)';g.fill();
 L.rr(g,-160,370,320*L.clamp(lt/3.5,0.03,1),8,4);g.fillStyle='#fff';g.fill();
}
function scrRemote(g,t,lt,mom){
 g.fillStyle='#3B3F4A';g.fillRect(-192,-412,384,824);
 L.rr(g,-85,-300,170,560,70);g.fillStyle='#1C1E25';g.fill();
 L.dot(g,0,-220,30,mom&&lt>2.4?'#FF7A7A':C.bad);
 for(let r=0;r<4;r++)for(let c=0;c<3;c++)L.dot(g,-45+c*45,-120+r*70,18,'#4A4E5A');
 L.pill(g,-170,-350,mom?'Подсказка':'Камера мамы');
 const at=mom?1.6:1.0;
 if(lt>at){const e=L.eo((lt-at)/0.6);g.strokeStyle='rgba(200,255,61,'+(1-e).toFixed(2)+')';g.lineWidth=5;
  g.beginPath();g.arc(0,-220,30+e*60,0,7);g.stroke();L.dot(g,0,-220,14,C.acc);}
 if(mom)L.typeBox(g,'Нажми красную',0,290,340,lt,1.7,{local:1});
}
function scrHello(g,t,lt){
 L.orb(g,0,-140,170*L.spring((lt-0.2)/0.6),t);
 g.fillStyle=C.dk;g.font=L.font(32,800);L.ctext(g,'Привет! Я рядом.',0,60);
 g.fillStyle=C.mut;g.font=L.font(24,500);L.ctext(g,'Чат, камера, ролики',0,105);
 L.micBtn(g,0,270,50,t);
}
const SCR=[scrHome,scrLive,scrSum,scrStyles,(g,t,lt)=>scrRemote(g,t,lt,false),scrHello];

// ---------- сцены (текст и окружение вокруг телефона) ----------
function scene0(g,t,lt,o){
 L.tag(g,'Новый запуск',540,200,t,0.05,{out:o});
 L.wordmark(g,'Помощник','AI',540,450,170,t,0,{out:o});
 L.subline(g,'ИИ-помощник для всей семьи',540,t,1.0,{align:'center',x:540,size:60,out:o});
}
function scene1(g,t,lt,o){
 L.headline(g,'Наведи камеру, он объяснит',190,t,T[1]+0.05,'камеру',{out:o,size:112});
 L.legend(g,[['брать',C.good],['средне',C.warn],['не брать',C.bad]],560,t,T[1]+0.6,{stag:1.2,active:liveIdx(lt),out:o});
}
function scene2(g,t,lt,o){
 L.headline(g,'Читает, переводит и считает',190,t,T[2]+0.05,'считает',{out:o});
 [['Вслух','sound',70,920,0],['Перевод','text',70,1220,0],['Сумма','plus',1010,1020,1],['Лекарство','pill',1010,1320,1]]
  .forEach((c,i)=>{g.globalAlpha=o;L.chip(g,c[2],c[3],c[0],c[1],L.springAt(t,T[2]+0.4+i*0.12,0.6),{right:c[4]});g.globalAlpha=1;});
}
function scene3(g,t,lt,o){
 L.bigStat(g,20,'стилей',70,560,t,T[3]+0.2,{sub:'короткие ролики',out:o});
 const si=styleIdx(lt);
 for(let i=0;i<6;i++){
  const x=70+(i%2)*260,y=760+Math.floor(i/2)*182,p=L.spring((lt-0.5-i*0.08)/0.6);if(p<=0)continue;
  g.save();g.globalAlpha=o*L.clamp(p*3,0,1);g.translate(x+120,y+80);g.scale(p,p);g.translate(-x-120,-y-80);
  g.save();L.rr(g,x,y,240,160,20);g.clip();L.tile(g,x,y,240,160,L.PALS[i],t);g.restore();
  if(i===si){L.rr(g,x-4,y-4,248,168,24);g.strokeStyle=C.acc;g.lineWidth=5;g.stroke();}
  L.pill(g,x+12,y+104,NAMES[i],{size:24,w:200});
  g.restore();
 }
}
function scene4(g,t,lt,o){
 L.headline(g,'Помощь родителям на расстоянии',190,t,T[4]+0.05,'родителям',{out:o,size:104});
 L.link(g,448,1080,632,1080,t,T[4]+0.6,{out:o});
 L.words(g,'Вы',300,1470,52,t,T[4]+0.4,{align:'center',out:o});
 L.words(g,'Мама',780,1470,52,t,T[4]+0.6,{align:'center',out:o});
}
function scene5(g,t,lt){
 L.wordmark(g,'Помощник','AI',540,330,140,t,T[5]);
 L.stamp(g,'ДЛЯ ВСЕЙ СЕМЬИ',540,500,t,T[5]+0.8);
}
const SCENES=[scene0,scene1,scene2,scene3,scene4,scene5];

function draw(t,k){
 const g=k.g;L.reset(g);L.bg(g,t);
 const S=L.scene(t,T),i=S.i,lt=S.lt,o=S.out;
 L.camera(g,lt,{y:S.last?L.shake(t,T[5]+0.8,14):0});
 const pe=L.spring(i===0?(t-0.35)/0.8:lt/0.75),P=L.keyframe(K,i,pe);
 if(i===4)L.phone(g,L.move(t,T[4]+0.3,1300,780,0.7),1160,0.6,0.05,t,(g,t)=>scrRemote(g,t,lt,true));
 L.phone(g,P[0],P[1],P[2],P[3],t,(g,t)=>SCR[i](g,t,lt));
 L.reset(g);
 SCENES[i](g,t,lt,o);
 L.reset(g);
 L.camEnd(g);
 L.progress(g,t,T,k.duration);
 L.wipe(g,t,T);
}

function sound(s){
 L.cutSounds(s,T,0.16);   // marimba_run / kalimba_run на каждой склейке
 L.sfx(s,[
  [0.05,'pop_high',.14],[0.3,'woodblock',.1],[0.75,'pop_double',.16],[1.0,'bubble',.12],[1.55,'pop_soft',.1],[2.05,'bubble',.1],
  [3.6,'pop_high',.12],[4.3,'click',.12],[4.8,'wood',.12],[6.0,'error_soft',.12],
  [7.4,'bubble',.11],[7.85,'pop_soft',.1],[8.6,'tick',.1],[9.1,'success',.14],
  [10.7,'counter',.12],[11.2,'pop_double',.12],[12.6,'tick',.1],[13.2,'sparkle',.12],
  [14.4,'drop',.12],[15.0,'click',.12],[15.6,'notify',.12],[16.4,'success',.13],
  [17.7,'pop_high',.14],[18.3,'ta_da',.18],[19.0,'sparkle',.1]
 ]);
}