// «Как работает солнечная батарея» в стиле TECH
const T=TECH,C=T.C,A='#FFB23F',PK='#FF4D7E',VI='#8A6BFF',MONO='"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace';
let CUT=null;

function draw(t,k){const g=k.g;
  if(!CUT)CUT=k.subs.map(s=>s.t0).concat(k.duration);
  T.bg(g,t);
  const S=T.sceneAt(t,CUT);
  T.camera(g,t,S.l,()=>[s1,s2,s3,s4,s5,s6][Math.min(S.i,5)](g,t,S));
  T.cutFlash(g,t,CUT);
}

// ---------- предметы темы ----------
function rays(g,x,y,r0,r1,a,rot){if(a<=0)return;g.save();g.globalAlpha*=T.clamp(a);
  g.strokeStyle=A;g.lineWidth=5;g.lineCap='round';g.beginPath();
  for(let i=0;i<12;i++){const an=rot+i*Math.PI/6,q=i%2?.72:1,r=r0+(r1-r0)*q*T.clamp(a);
    g.moveTo(x+Math.cos(an)*r0,y+Math.sin(an)*r0);g.lineTo(x+Math.cos(an)*r,y+Math.sin(an)*r);}
  g.stroke();g.restore();}

function panel(g,cx,cy,w,h,a,lit,t){if(a<=0)return;g.save();g.globalAlpha*=T.clamp(a*1.5);const al=g.globalAlpha;
  g.translate(cx,cy);const s=.9+.1*a;g.scale(s,s);
  g.strokeStyle='#2C3039';g.lineWidth=6;g.lineCap='round';g.beginPath();
  g.moveTo(-w*.28,h/2);g.lineTo(-w*.34,h/2+80);g.moveTo(w*.28,h/2);g.lineTo(w*.34,h/2+80);g.stroke();
  const x=-w/2,y=-h/2;T.card(g,x,y,w,h,{r:18});g.globalAlpha=al;
  const cols=6,rows=4,p=18,gp=8,cw=(w-2*p-gp*(cols-1))/cols,ch=(h-2*p-gp*(rows-1))/rows;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const X=x+p+c*(cw+gp),Y=y+p+r*(ch+gp),i=r*cols+c;
    g.globalAlpha=al;g.fillStyle='#1C2230';g.fillRect(X,Y,cw,ch);
    if(lit>0){g.globalAlpha=al*lit*(.2+.16*Math.sin(t*3-i*.55));g.fillStyle=A;g.fillRect(X,Y,cw,ch);}}
  g.globalAlpha=al;g.strokeStyle='#3A3E48';g.lineWidth=2;g.beginPath();
  for(let r=0;r<rows;r++){const Y=y+p+r*(ch+gp);g.moveTo(x+p,Y+ch/3);g.lineTo(x+w-p,Y+ch/3);g.moveTo(x+p,Y+2*ch/3);g.lineTo(x+w-p,Y+2*ch/3);}
  g.stroke();
  const q=T.clamp(a);T.gradLine(g,x,y,x+w,y,q,3);T.gradLine(g,x+w,y,x+w,y+h,q,3);
  T.gradLine(g,x+w,y+h,x,y+h,q,3);T.gradLine(g,x,y+h,x,y,q,3);
  g.restore();}

function photon(g,x,y,dx,dy,a){if(a<=0)return;g.save();g.globalAlpha*=T.clamp(a);
  const nx=-dy,ny=dx;g.strokeStyle=A;g.lineWidth=4;g.lineCap='round';g.beginPath();
  for(let j=0;j<=18;j++){const s=j*6,w=Math.sin(j*.95)*13*(1-j/18);
    const px=x-dx*s+nx*w,py=y-dy*s+ny*w;j?g.lineTo(px,py):g.moveTo(px,py);}
  g.stroke();g.fillStyle=A;g.beginPath();g.arc(x,y,9,0,7);g.fill();g.restore();}

function dot(g,x,y,r,col,a){if(a<=0)return;g.save();g.globalAlpha*=T.clamp(a);g.fillStyle=col;
  g.beginPath();g.arc(x,y,r,0,7);g.fill();g.restore();}

// 1. Хук: солнце-искра, лучи в панель
function s1(g,t,S){const l=S.l,ex=T.exitK(l,S.len),SUN=[540,640];
  T.title(g,['Свет','в','ток'],{t,t0:S.t0,tout:S.t1,acc:2,size:116});
  g.globalAlpha=1-ex;
  rays(g,SUN[0],SUN[1],70,130,T.eo(T.prog(l,.05,.4)),t*.2);
  const pa=T.spring(T.prog(l,.15,.6)),lit=T.eo(T.prog(l,1,1.8));
  panel(g,540,1130,760,400,pa,lit,t);
  const XS=[330,540,750];
  for(let i=0;i<3;i++){const P=[[540,790],[540,850],[XS[i],860],[XS[i],930]];
    T.curve(g,P[0],P[1],P[2],P[3],T.eo(T.prog(l,.45+i*.08,.85+i*.08)),'a',3);
    if(l>1.05)T.flowDot(g,P[0],P[1],P[2],P[3],l*1.1+i*.33,'a');}
  T.subline(g,'солнечная батарея',1560,t,S.t0+1.4,S.t1-.3);
  g.globalAlpha=1;
  T.spark(g,T.lerp(SUN[0],220,T.eo(ex)),T.lerp(SUN[1],700,T.eo(ex)),1.6-.6*ex);
}

// 2. Свет состоит из фотонов
function s2(g,t,S){const l=S.l,ex=T.exitK(l,S.len),O=[220,700];
  T.title(g,['Свет:','фотоны'],{t,t0:S.t0,tout:S.t1,acc:1,size:112});
  g.globalAlpha=1-ex;
  rays(g,O[0],O[1],60,110,T.eo(T.prog(l,0,.35)),t*.2);
  panel(g,720,1330,400,200,T.spring(T.prog(l,.25,.7)),T.eo(T.prog(l,.9,2)),t);
  const D=[650-O[0],1250-O[1]],L=Math.hypot(D[0],D[1]),dx=D[0]/L,dy=D[1]/L;
  for(let i=0;i<7;i++){const c=(l*.42+i/7)%1,off=(i%3-1)*60,fa=T.clamp((l-.2-i*.06)/.3)*T.clamp((1-c)*6)*T.clamp(c*8);
    photon(g,O[0]+dx*(90+c*(L-90))-dy*off,O[1]+dy*(90+c*(L-90))+dx*off,dx,dy,fa);}
  const pa=T.spring(T.prog(l,.8,1.2));
  T.curve(g,[760,900],[760,960],[640,1000],[600,1060],T.eo(T.prog(l,.9,1.3)),C.wire,3);
  T.pill(g,'фотон',760,860,{a:pa,size:56});
  T.subline(g,'крошечные порции энергии',1620,t,S.t0+1.5,S.t1-.3);
  g.globalAlpha=1;
  T.spark(g,T.lerp(O[0],540,T.eo(ex)),T.lerp(O[1],640,T.eo(ex)),1.4-.4*ex);
}

// 3. Решётка кремния: фотон выбивает электрон
const LX=[200,370,540,710,880],LY=[760,930,1100,1270];
function s3(g,t,S){const l=S.l,ex=T.exitK(l,S.len),HIT=1.3;
  T.title(g,['Удар','фотона'],{t,t0:S.t0,tout:S.t1,acc:1,size:112});
  g.globalAlpha=1-ex;
  const ba=T.eo(T.prog(l,.1,.6));
  g.save();g.globalAlpha*=ba;g.strokeStyle='#2C3039';g.lineWidth=4;g.lineCap='round';g.beginPath();
  for(const y of LY){g.moveTo(LX[0],y);g.lineTo(LX[4],y);}for(const x of LX){g.moveTo(x,LY[0]);g.lineTo(x,LY[3]);}
  g.stroke();g.restore();
  g.font='700 26px '+MONO;g.textAlign='center';g.textBaseline='middle';
  for(let r=0;r<4;r++)for(let c=0;c<5;c++){const i=r*5+c,a=T.spring(T.prog(l,.05+i*.02,.45+i*.02));if(a<=0)continue;
    const x=LX[c],y=LY[r],hit=(i===2&&l>HIT);
    g.save();g.globalAlpha*=T.clamp(a*1.5);g.fillStyle='#15171D';g.strokeStyle=hit?A:VI;g.lineWidth=4;
    g.beginPath();g.arc(x,y,36*a,0,7);g.fill();g.stroke();
    g.fillStyle='#8C909B';g.fillText('Si',x,y+1);g.restore();}
  if(l>HIT){T.ring(g,540,760,T.prog(l,HIT,HIT+.5),30,220,'b');
    const e=T.spring(T.prog(l,HIT,HIT+.45)),ex2=T.lerp(540,780,e)+3*Math.sin(l*9),ey=T.lerp(760,650,e)+3*Math.cos(l*7);
    g.save();g.globalAlpha*=.5;g.setLineDash([6,10]);g.strokeStyle=PK;g.lineWidth=3;g.lineCap='round';
    g.beginPath();g.moveTo(540,760);g.lineTo(ex2,ey);g.stroke();g.restore();
    dot(g,ex2,ey,14,PK,1);
    T.chip(g,'e-',ex2+100,ey,{col:'b',a:T.spring(T.prog(l,HIT+.2,HIT+.6))});}
  T.subline(g,'атомы кремния',1430,t,S.t0+1.9,S.t1-.3);
  g.globalAlpha=1;
  const py=T.lerp(640,760,T.eo(T.prog(l,.8,HIT)));
  T.spark(g,T.lerp(540,140,T.eo(ex)),T.lerp(py,970,T.eo(ex)),1);
}

// 4. Слои n и p толкают электроны в одну сторону
function s4(g,t,S){const l=S.l,ex=T.exitK(l,S.len);
  T.title(g,['Слои','n','и','p'],{t,t0:S.t0,tout:S.t1,acc:0,size:112});
  g.globalAlpha=1-ex;
  const LAY=[[700,'b','n-слой'],[1000,'c','p-слой']];
  for(let i=0;i<2;i++){const a=T.spring(T.prog(l,.1+i*.1,.5+i*.1));if(a<=0)continue;
    g.save();g.globalAlpha*=T.clamp(a*1.5);g.translate((1-a)*90,0);
    T.rowCard(g,140,LAY[i][0],800,240,{col:LAY[i][1],label:LAY[i][2]});g.restore();}
  const jp=T.eo(T.prog(l,.6,1.4));
  T.gradLine(g,140,970,940,970,jp,4);
  for(let i=0;i<6;i++){if(l<1.2)break;const c=((l-1.2)*.45+i/6)%1,y=T.lerp(1195,745,T.eo(c));
    dot(g,230+i*92,y,12,PK,T.clamp((l-1.2-i*.05)/.3)*T.clamp((1-c)*7)*T.clamp(c*10));}
  g.save();g.strokeStyle=A;g.lineWidth=4;g.lineCap='round';
  for(let j=0;j<3;j++){const y=1150-((l*120+j*150)%450);g.globalAlpha=(1-ex)*T.clamp((l-1.2)/.3)*.8;
    g.beginPath();g.moveTo(962,y+14);g.lineTo(980,y-4);g.lineTo(998,y+14);g.stroke();}
  g.restore();
  T.subline(g,'электроны идут в одну сторону',1420,t,S.t0+1.6,S.t1-.3);
  g.globalAlpha=1;
  T.spark(g,T.lerp(T.lerp(140,940,jp),540,T.eo(ex)),T.lerp(970,780,T.eo(ex)),1);
}

// 5. Ток: панель питает дом, телефон, лампу; счётчик ватт
function s5(g,t,S){const l=S.l,ex=T.exitK(l,S.len),n=T.countTo(l,.3,2.6,320);
  T.title(g,['Выход','320','Вт'],{t,t0:S.t0,tout:S.t1,acc:1,size:112,disp:{1:String(n)}});
  g.globalAlpha=1-ex;
  panel(g,540,780,600,320,T.spring(T.prog(l,0,.4)),1,t);
  const XS=[250,540,830],TL=['дом','телефон','лампа'];
  for(let i=0;i<3;i++){const P=[[540,1040],[540,1150],[XS[i],1150],[XS[i],1250]];
    T.curve(g,P[0],P[1],P[2],P[3],T.eo(T.prog(l,.3+i*.1,.8+i*.1)),C.wire,3);
    if(l>.9)T.flowDot(g,P[0],P[1],P[2],P[3],l*1.2+i*.3,'a');
    T.chip(g,TL[i],XS[i],1310,{col:T.ACC[i],a:T.spring(T.prog(l,.7+i*.1,1.1+i*.1))});}
  T.label(g,'заряд батареи',150,1440,{size:32,a:T.eo(T.prog(l,.6,.9))});
  T.streamBar(g,150,930,1500,T.eo(T.prog(l,.6,3)),{});
  g.globalAlpha=1;
  T.spark(g,540,T.lerp(780,640,T.eo(ex)),1.1);
}

// 6. Финал: всё сходится в искру-солнце
function s6(g,t,S){const l=S.l,M=[540,620];
  T.converge(g,M[0],M[1],t,S.t0);
  T.ring(g,M[0],M[1],T.prog(l,.6,1.1),110,490,'b');
  rays(g,M[0],M[1],90,170,T.spring(T.prog(l,.55,1)),t*.2);
  T.spark(g,M[0],M[1],l<.6?1+l:1.6-.3*T.eo(T.prog(l,.6,1)));
  T.brand(g,'Свет в ток',960,t,S.t0+.55,{size:150,step:.15});
  T.title(g,['Ноль','топлива'],{t,t0:S.t0+.9,y:1110,size:92,acc:-1});
  T.stamp(g,'чистая энергия',540,1380,T.spring(T.prog(l,1.5,1.9)),{w:660,cp:T.eo(T.prog(l,1.65,1.95))});
}

function sound(s){const P=(t,n,v,p)=>s.play(t,n,v,p?{pitch:p}:undefined);
  // 1: хук, панель, лучи
  P(.05,'pop_soft',.12);P(.3,'wood',.11);P(.9,'tick',.1);P(1.4,'pop_high',.1);P(2.6,'key_soft',.09);
  // 2: фотоны
  P(4,'marimba_run',.16);P(4.4,'pop_high',.1);P(5,'pop_double',.11);P(6,'tick',.09,1.2);P(6.8,'key_soft',.09);
  // 3: решётка, удар, электрон
  P(8.5,'kalimba_run',.16,1.05);P(8.7,'wood',.1);P(9.8,'drop',.14);P(9.95,'pop_high',.12,1.3);P(10.6,'woodblock',.1);
  // 4: слои n и p
  P(13,'marimba_run',.16,1.1);P(13.3,'woodblock',.11);P(13.9,'click',.12);P(14.6,'tick',.1);P(15.4,'key_soft',.09);
  // 5: счётчик ватт, потребители
  P(17.5,'kalimba_run',.16,1.15);P(17.8,'odometer',.1);P(18.4,'tick',.1,1);P(19,'tick',.1,1.15);P(19.6,'tick',.1,1.3);P(20,'toggle_on',.12);P(20.3,'pop_high',.1);
  // 6: схождение, финал
  P(22,'marimba_run',.17,1.2);P(22.2,'magic',.18);P(22.8,'ta_da',.18);P(23.6,'woodblock',.12);P(25.5,'success3',.12,.9);
}