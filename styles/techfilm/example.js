// «Узел: одна розетка для всего дома» в стиле TECH (техно-фильм)
const T=TECH,C=T.C;
const CUTS=[0,3.5,7.5,11.5,15,18.5,21.5,25];
const MOOD=[[0,'night'],[3.5,'amber'],[7.5,'rose'],[11.5,'blue'],[15,'teal'],[18.5,'green'],[21.5,'aura']];
const BY=800; // уровень шины и центр графики
const TY=1300; // первая строка заголовка

function draw(t,k){const g=k.g;
  T.bg(g,t,T.moodAt(t,MOOD));
  const S=T.scene(t,CUTS);
  T.stage(g,t,S,()=>[s0,s1,s2,s3,s4,s5,s6][S.i](g,t,S),{last:S.i===6,cy:BY});
}

// 0. Хук: узел-звезда раскрывает связи к приборам
function s0(g,t,S){const l=S.l;
  T.starGraph(g,540,BY-40,t,T.prog(l,.1,1.6),{r:300,seed:4});
  T.spaced(g,'ДОМ · 14 ПРИБОРОВ · 9 РОЗЕТОК',540,BY+380,{size:32,align:'center',color:'dim',a:T.vis(l,1.3,S.len)});
  T.title(g,['Сколько розеток','нужно дому?'],{t,t0:S.t0+.1,t1:S.t1,y:TY,size:84});
}

// 1. узел() и орбита из 24 приборов, счётчик
const DEV=['свет','чайник','тёплый пол','камера','шторы','колонка'];
function s1(g,t,S){const l=S.l,lit=T.lerp(0,24,T.eio(T.prog(l,.5,3.3)));
  T.bus(g,540,BY,1080,BY,t,{a:T.eo(T.prog(l,.3,.8)),to:T.eo(T.prog(l,.3,1)),col:'violet'});
  const P=T.orbit(g,540,BY,420,230,24,lit,t,{grow:T.prog(l,0,.8),rot:-Math.PI/2+.13});
  T.plaque(g,'узел()',540,BY,{size:120,pop:T.prog(l,.05,.55),a:T.eo(T.prog(l,0,.3))});
  // ярлык текущего прибора с тонкой связью
  const cur=Math.floor(lit),di=Math.floor(cur/4);if(l>.6&&cur<24){const j=Math.min(23,di*4+2),q=P[j],ph=T.prog(lit,di*4+1,di*4+1.6);
    if(q){const up=q[1]<BY,ly=q[1]+(up?-70:70);g.strokeStyle=C.amber;g.lineWidth=2.5;g.globalAlpha*=T.eo(ph);g.beginPath();g.moveTo(q[0],q[1]);g.lineTo(q[0],ly+(up?26:-26));g.stroke();
      T.label(g,DEV[di%DEV.length],q[0],ly,{size:40,a:T.eo(ph)});g.globalAlpha=1;T.spark(g,q[0],q[1],.6);}}
  const n=Math.min(24,Math.floor(lit));
  const ca=T.eo(T.prog(l,.4,.8)),w1=T.spaced(g,'приборов',0,0,{size:40,measure:true}),w2=T.spaced(g,'00/24',0,0,{size:40,measure:true}),cx0=540-(w1+24+w2)/2;
  T.spaced(g,'приборов',cx0,BY+330,{size:40,color:'mut',a:ca});
  T.spaced(g,String(n).padStart(2,'0')+'/24',cx0+w1+24,BY+330,{size:40,color:'amber',weight:700,a:ca});
  T.formula(g,'узел()','24 прибора',TY+20,{t,t0:S.t0+.7,t1:S.t1,size:76});
}

// 2. Одна точка, любой прибор: поле ввода -> волна мощности -> картинка камеры -> лента кадров
function s2(g,t,S){const l=S.l,ph=l<1.1?0:l<2.1?1:l<2.9?2:3;
  T.tabs(g,['СВЕТ','ЧАЙНИК','ТЕПЛО','КАМЕРЫ'],ph,BY-300,{size:36,a:T.eo(T.prog(l,0,.4))});
  T.bus(g,0,BY,1080,BY,t,{col:'rose',speed:160});
  if(l<1.3){const a=1-T.eo(T.prog(l,1.05,1.3));T.input(g,540,BY,860,'включи свет на кухне',T.prog(l,.15,1),t,{size:46,a});}
  if(l>1.05&&l<2.95){const a=T.eo(T.prog(l,1.05,1.3))*(1-T.eo(T.prog(l,2.7,2.95))),big=T.eo(T.prog(l,2.05,2.5));
    T.wave(g,540,BY,T.lerp(780,860,big),T.lerp(150,330,big),t,{a,n:30,grow:T.prog(l,1.05,1.6),box:big<.5,c1:big>.5?C.amber:C.blue,c2:big>.5?C.rose:C.violet});
    if(big>0)T.spaced(g,'22,5°',540,BY+250,{size:44,weight:700,align:'center',color:'amber',a:big*a});}
  if(l>2.7){const a=T.eo(T.prog(l,2.7,3.0)),st=T.eo(T.prog(l,3.35,3.75));
    if(st<1)T.picture(g,540-310,BY-175,620,350,t,{kind:'houses',a:a*(1-st),edge:'pink'});
    if(st>0)T.filmstrip(g,540,BY,150,90,6,t,{kind:'houses',a:st,grow:st});}
  T.title(g,['Одна точка.','Любой прибор.'],{t,t0:S.t0+.25,t1:S.t1,y:TY,size:84});
}

// 3. Граф: комнаты-карточки -> хаб -> группы приборов
const ROOMS=[['кухня','01','cyan',['свет','чайник','шторы']],['гостиная','02','violet',['тепло','колонка','свет']],['детская','03','amber',['ночник','камера','тепло']]];
function s3(g,t,S){const l=S.l,YC=[BY-190,BY,BY+190],CL=170,CR=800,HX=930;
  T.bus(g,0,BY,110,BY,t,{col:'violet'});
  T.spark(g,110,BY,.5);
  const hubA=T.eo(T.prog(l,.6,1));
  ROOMS.forEach((r,i)=>{const a=T.spring(T.prog(l,.1+i*.08,.6+i*.08)),done=T.prog(l,1.9+i*.35,2.1+i*.35);
    const P=T.link(g,[110,BY],[CL,YC[i]],T.eo(T.prog(l,0,.4+i*.08)),r[2],2.5,.9);
    T.link(g,[CR,YC[i]],[HX-60,BY],T.eo(T.prog(l,.5,.9)),r[2],2.5,.7);
    if(l>.8)T.flow(g,P,(l*.7+i*.3)%1,'#ffffff',.6);
    g.save();g.translate((1-a)*40,0);
    T.card(g,CL,YC[i]-72,CR-CL,144,{a,edge:done>0?r[2]:null,bar:[T.prog(l,.5+i*.2,2.1+i*.35),r[2]],halo:done>0?r[2]:null});
    if(a>0){g.globalAlpha*=T.clamp(a);
      T.mono(g,r[0],CL+26,YC[i]-14,{size:44,weight:700});
      T.font(g,700,44,'mono');const nw=T.tw(g,r[0]);T.mono(g,'·'+r[1],CL+26+nw,YC[i]-14,{size:44,weight:700,color:r[2]});
      // шаги сценария: текущий шаг белым
      const step=Math.min(2,Math.floor(T.prog(l,.6+i*.1,1.9+i*.35)*3));let x=CL+26;
      r[3].forEach((w,j)=>{T.mono(g,w,x,YC[i]+44,{size:37,color:j===step?C.ink:(j<step?C.mut:C.dim),weight:j===step?600:400});T.font(g,j===step?600:400,37,'mono');x+=T.tw(g,w)+(j<2?40:0);
        if(j<2){g.fillStyle=C.dim;g.beginPath();g.moveTo(x-34,YC[i]+32);g.lineTo(x-24,YC[i]+38);g.lineTo(x-34,YC[i]+44);g.fill();}});
      if(done>0)T.tag(g,'ГОТОВО',CR-24,YC[i]-30,{size:32,color:r[2],align:'right',pop:done});
      else T.tag(g,'СЦЕНА',CR-24,YC[i]-30,{size:32,color:C.mut,align:'right',outline:true});
      g.globalAlpha=1;}
    g.restore();});
  // хаб
  g.save();g.globalAlpha*=hubA;T.card(g,HX-60,BY-48,120,96,{edge:'cyan',r:16,halo:'cyan'});T.spaced(g,'ХАБ',HX,BY+12,{size:34,weight:700,align:'center',color:'ink'});g.restore();
  // выходы
  const OUT=[['свет',300],['тепло',540],['камеры',780]];
  const dp=T.eo(T.prog(l,.9,1.15));g.strokeStyle='rgba(106,111,136,.8)';g.lineWidth=2.5;g.beginPath();g.moveTo(HX,BY+48);g.lineTo(HX,BY+48+(250)*dp);g.stroke();
  OUT.forEach(([s,x],i)=>{const p=T.eo(T.prog(l,1.1+i*.12,1.6+i*.12));T.link(g,[HX,BY+298],[x,BY+396],p,'#6a6f88',2.5,.8,true);
    const on=T.prog(l,2.2+i*.3,2.4+i*.3);
    T.tag(g,s,x,BY+430,{size:38,color:on>0?'cyan':C.mut,outline:on<=0,a:T.eo(T.prog(l,1.4+i*.12,1.7+i*.12)),pop:on>0?on:null,sp:2});});
  T.title(g,['Комнаты. Сценарии.','Один граф.'],{t,t0:S.t0+.3,t1:S.t1,y:TY+110,size:80});
}

// 4. События в реальном времени: метки событий и стриминговая карточка
const EV=[['ДВИЖЕНИЕ','violet',.5],['ЧАЙНИК_ВКЛ','amber',1.3],['ГОТОВО','cyan',2.3]];
function s4(g,t,S){const l=S.l,CX0=200,CW=680;
  const top=T.eo(T.prog(l,0,.4));
  const P=T.link(g,[0,BY-60],[CX0+60,BY-310],1,'violet',2.5,top);
  T.bus(g,0,BY-60,0.1,BY-60,t,{});
  if(l>.3)T.flow(g,P,(l*.8)%1,'#ffffff',.6);
  T.card(g,CX0+60,BY-370,CW-120,124,{a:top,edge:'violet'});
  g.save();g.globalAlpha*=top;T.mono(g,'кухня·01',CX0+90,BY-318,{size:42,weight:700});T.mono(g,'шлёт события',CX0+90,BY-270,{size:32,color:'mut'});
  T.tag(g,'ПОТОК',CX0+CW-90,BY-318,{size:28,color:'cyan',align:'right'});g.restore();
  // метка события (меняется)
  let ei=-1;EV.forEach((e,i)=>{if(l>=e[2])ei=i;});
  g.strokeStyle='rgba(150,150,180,.35)';g.setLineDash([4,8]);g.lineWidth=2;g.beginPath();g.moveTo(540,BY-246);g.lineTo(540,BY-120);g.stroke();g.setLineDash([]);
  if(ei>=0){const e=EV[ei];T.tag(g,e[0],540,BY-170,{size:34,color:e[1],pop:T.prog(l,e[2],e[2]+.3)});}
  // карточка интерфейса
  const ca=T.spring(T.prog(l,.25,.75));const Y0=BY-90;
  T.card(g,CX0,Y0,CW,420,{a:ca});
  if(ca>0){g.save();g.globalAlpha*=T.clamp(ca);
    T.spaced(g,'ДОМ · сейчас',CX0+32,Y0+62,{size:32,color:'mut'});
    // пилюля «онлайн»
    const pw=200,px=CX0+CW-32-pw;T.rr(g,px,Y0+30,pw,46,23);g.strokeStyle=C.cyan;g.lineWidth=2;g.stroke();g.fillStyle=C.cyan;g.beginPath();g.arc(px+26,Y0+53,6,0,7);g.fill();
    T.mono(g,'онлайн',px+46,Y0+64,{size:30,weight:700,color:'cyan'});
    const tp=T.prog(l,.9,2.3);T.card(g,CX0+28,Y0+100,CW-56,128,{fill:'rgba(22,23,33,.9)',r:12,a:T.eo(T.prog(l,.6,.9))});
    if(l>.8){T.font(g,500,44,'sans');const s=T.typed('Чайник закипел, 100°. Можно пить чай',tp);const L=T.wrap(g,s,CW-110);g.fillStyle=C.ink;
      L.slice(0,2).forEach((ln,i)=>{g.fillText(ln,CX0+52,Y0+152+i*54);});const lastW=T.tw(g,L[Math.min(1,L.length-1)]||'');if(tp<1)T.caret(g,CX0+52+lastW,Y0+152+(Math.min(2,L.length)-1)*54,46,t,'violet');}
    const r1=T.eo(T.prog(l,1.6,1.9));if(r1>0){g.globalAlpha*=r1;T.rr(g,CX0+32,Y0+262,30,30,6);g.fillStyle=C.amber;g.fill();
      g.strokeStyle=C.dark;g.lineWidth=4;g.beginPath();g.moveTo(CX0+39,Y0+277);g.lineTo(CX0+45,Y0+284);g.lineTo(CX0+56,Y0+269);g.stroke();
      T.mono(g,'чайник',CX0+78,Y0+288,{size:36,color:'amber',weight:600});T.mono(g,'· 1,8 кВт',CX0+218,Y0+288,{size:36,color:'mut'});g.globalAlpha=ca;}
    const r2=T.eo(T.prog(l,2.1,2.4));if(r2>0){g.globalAlpha*=r2;T.mono(g,'утро',CX0+32,Y0+350,{size:36,weight:700});T.mono(g,'сценарий',CX0+130,Y0+350,{size:36,color:'mut'});
      const n=Math.min(3,1+Math.floor(T.prog(l,2.2,3)*3));T.mono(g,n+'/3',CX0+CW-32,Y0+350,{size:36,color:'green',align:'right',weight:700});
      T.progress(g,CX0+32,Y0+374,CW-64,n/3,'green');}
    g.restore();}
  T.title(g,['События.','Сразу на экране.'],{t,t0:S.t0+.3,t1:S.t1,y:TY+80,size:82});
}

// 5. Сеть пропала: поток замер, вернулся без потерь
function s5(g,t,S){const l=S.l,CX0=180,CW=720,Y0=BY-200,LOST=.9,BACK=1.6;
  const lost=l>=LOST&&l<BACK,back=l>=BACK;
  const tok=lost?1285:back?1285+Math.floor((l-BACK)*14):1270+Math.floor(l*16);
  // метка над карточкой
  if(lost)T.tag(g,'сеть пропала',540,Y0-60,{size:34,color:'red',outline:true,pop:T.prog(l,LOST,LOST+.3),sp:1});
  if(back)T.tag(g,'продолжено с 1 285',540,Y0-60,{size:34,color:'cyan',outline:true,pop:T.prog(l,BACK,BACK+.3),sp:1});
  T.card(g,CX0,Y0,CW,300,{a:T.eo(T.prog(l,0,.35)),edge:lost?'red':null});
  T.spaced(g,'ПОТОК · хаб 02',CX0+32,Y0+60,{size:32,color:'mut'});
  const tc=lost?'red':'green';
  if(lost){g.fillStyle=C.red;g.fillRect(CX0+CW-262,Y0+36,8,28);g.fillRect(CX0+CW-248,Y0+36,8,28);}else{g.fillStyle=C.green;g.beginPath();g.arc(CX0+CW-244,Y0+50,6,0,7);g.fill();}
  T.mono(g,'сек '+T.fmt(tok),CX0+CW-32,Y0+62,{size:32,color:tc,weight:700,align:'right'});
  const s1='Свет в коридоре →',s2='выключен';T.font(g,500,46,'mono');
  T.mono(g,T.typed(s1,T.prog(l,.1,.8)),CX0+32,Y0+150,{size:46});
  const p2=back?T.prog(l,BACK+.1,BACK+.7):0,v2=T.typed(s2,p2);T.mono(g,v2,CX0+32,Y0+214,{size:46,color:back&&p2<1?'cyan':'ink'});
  T.font(g,500,46,'mono');if(l>.8)T.caret(g,CX0+32+T.tw(g,v2),Y0+214,48,t,lost?'red':'green',lost?1:.99);
  // шина-прогресс под карточкой: зелёная пройденная часть, точки впереди
  const lit=lost?.52:back?T.lerp(.52,.8,T.eo(T.prog(l,BACK,S.len))):T.lerp(.2,.52,T.prog(l,0,LOST));
  T.bus(g,0,Y0+400,1080,Y0+400,t,{col:lost?'#6a6f88':'green',lit,speed:lost?0:120});
  const hx=1080*lit;if(lost){T.node(g,hx,Y0+400,'red',1,{r:10});g.strokeStyle=C.red;g.lineWidth=2.5;g.beginPath();g.arc(hx+40,Y0+400,10,0,7);g.stroke();}else T.spark(g,hx,Y0+400,.55);
  const ok=T.prog(l,2.3,2.6);if(ok>0){const w=T.tag(g,'0 событий потеряно',575,Y0+500,{size:36,color:'green',outline:true,pop:ok,sp:1});
    const bx=575-w/2-40;g.globalAlpha=T.eo(ok);T.rr(g,bx-18,Y0+482,36,36,7);g.fillStyle=C.green;g.fill();g.strokeStyle=C.dark;g.lineWidth=4;g.beginPath();g.moveTo(bx-9,Y0+500);g.lineTo(bx-2,Y0+507);g.lineTo(bx+10,Y0+492);g.stroke();g.globalAlpha=1;}
  T.title(g,['Без сети.'],{t,t0:S.t0+.3,t1:S.t1,y:TY+80,size:84});
  T.title(g,['Без потерь.'],{t,t0:S.t0+BACK+.2,t1:S.t1,y:TY+80+91,size:84});
}

// 6. Финал: штрихи схлопываются в точку, аура-эллипс, слово-логотип
function s6(g,t,S){const l=S.l,Y=BY+40;
  T.implode(g,540,Y,T.prog(l,0,.75));
  T.aura(g,540,Y,480,330,T.prog(l,.65,1.6),t);
  if(l>.55&&l<.9)T.spark(g,540,Y,1.4*(1-T.prog(l,.75,.9)));
  T.logo(g,'Узел','Дом',540,Y-50,T.prog(l,.75,1.9),{size:140});
  T.tagline(g,'Весь дом в одной точке.',Y+120,T.eo(T.prog(l,1.6,2.1)),{size:60});
  const a=T.eo(T.prog(l,2.2,2.6));if(a>0){g.save();g.globalAlpha=a;const w=T.tag(g,'ПРЕДЗАКАЗ',330,Y+470,{size:34,color:'amber',outline:true,align:'left'});
    T.mono(g,'от 4 990 ₽',330+w+28,Y+482,{size:40,color:'mut'});g.restore();}
}

function sound(s){const P=(t,n,v,p)=>s.play(t,n,v,p?{pitch:p}:undefined);
  T.cutSounds(s,CUTS,{vol:.12});
  // 0 хук: звезда раскрывается
  P(.1,'pop_soft',.12);P(.5,'sparkle',.09);P(2.2,'tick',.08,1.2);
  // 1 орбита: счётчик
  P(3.6,'pop_high',.12);P(4.1,'counter',.09);P(5.9,'tick',.08,1.25);P(6.8,'tick',.08,1.4);
  // 2 модальности
  P(7.65,'key_soft',.09);P(8.6,'click',.1);P(9.6,'toggle_on',.1);P(10.3,'pop_soft',.1);P(10.9,'pop_double',.1);
  // 3 граф
  P(11.65,'wood',.1);P(12.3,'pop_high',.09);P(13.4,'woodblock',.1);P(13.75,'woodblock',.1,1.15);P(14.1,'woodblock',.1,1.3);
  // 4 события
  P(15.5,'pop_high',.11);P(16.3,'pop_double',.11);P(17.3,'bubble',.11);
  // 5 сеть пропала / вернулась
  P(18.7,'type',.08);P(19.4,'error_soft',.13);P(20.1,'toggle_on',.12);P(20.85,'success',.12);
  // 6 финал
  P(21.6,'magic',.16);P(22.35,'ta_da',.17);P(23.2,'pop_soft',.1);P(23.8,'success3',.12,.9);
}
