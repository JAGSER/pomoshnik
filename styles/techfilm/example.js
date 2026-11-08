// example.js: «Премьера TanStack AI» в стиле TECH (только библиотека + canvas)
const T=TECH,C=T.C;
let CUT=null;
const MOD=['текст','звук','изображение','видео'];

function draw(t,k){const g=k.g;
  if(!CUT)CUT=k.subs.map(s=>s.t0).concat(k.duration);
  T.bg(g,t);
  const S=T.sceneAt(t,CUT);
  T.camera(g,t,S.l,()=>[s1,s2,s3,s4,s5,s6][Math.min(S.i,5)](g,t,S));
  T.cutFlash(g,t,CUT);
}

// 1. Поле ввода, искра улетает в центр, рождается сеть
function s1(g,t,S){const l=S.l;
  T.title(g,['Чем','станет','один','AI','API?'],{t,t0:S.t0,tout:S.t1,acc:2});
  const b=T.inputBar(g,150,1360,780,'спроси что угодно',t,S.t0,{press:S.t0+.75,out:S.t0+1.85});
  if(l>=.82&&l<1.2)T.comet(g,b.sx,b.sy,540,960,T.eo(T.prog(l,.82,1.15)));
  if(l>=1.1){const conv=T.eo(T.prog(l,1.72,2));
    T.ring(g,540,960,T.prog(l,1.1,1.7),60,480,'a');
    T.network(g,540,960,t,S.t0+1.1,{conv,seed:11});
    T.spark(g,540,960,1.2+.3*conv);}
}

// 2. chat() в центре, 24 провайдера по кругу, счётчик в заголовке
function s2(g,t,S){const l=S.l,ex=T.eo(T.prog(l,1.72,2)),n=T.countTo(l,.15,1.5,24);
  T.title(g,['chat()','и','24','провайдера'],{t,t0:S.t0,tout:S.t1,acc:2,disp:{2:String(n)}});
  const ph=Math.min(3,Math.floor(l/.4));
  T.hub(g,540,960,(i)=>{const id=ph*6+i+1;return '#'+(id<10?'0':'')+id;},t,S.t0,{rx:360,ry:300,ex});
  const pa=T.spring(T.prog(l,0,.4)),ps=pa*(1-ex);
  T.glow(g,'a',540,960,260*Math.max(.01,ps),.5);
  T.orbitDots(g,540,960,230,115,3,l,{a:1-ex});
  T.pill(g,'chat()',540,960,{a:ps,size:80});
  if(ex>0)T.spark(g,T.lerp(540,130,ex),T.lerp(960,640,ex),ex);
  T.subline(g,'провайдер меняется, поток нет',1420,t,S.t0+.55,S.t0+1.8);
}

// 3. Вертикальный поток и четыре модальности
function s3(g,t,S){const l=S.l,ex=T.exitK(l,S.len);
  T.title(g,['Один','паттерн.','Все','модальности.'],{t,t0:S.t0,tout:S.t1,acc:3,size:112});
  const hy=T.travel([[0,0,640],[.2,0,745],[.7,0,965],[1.2,0,1185],[1.7,0,1405],[2.2,0,1500]],l)[1];
  T.spine(g,130,640,1500,hy,l,1-ex);
  for(let i=0;i<4;i++){const Y=650+i*220,ti=.2+i*.5,a=T.spring(T.prog(l,ti-.05,ti+.4));
    if(a<=0){T.ghost(g,200,Y,780,190,MOD[i],.6*T.clamp(l/.3)*(1-ex));continue;}
    const q=T.prog(l,ti,ti+.5),c=['a','b','c','ok'][i],lt=l-ti;
    g.globalAlpha=T.clamp(a*1.5)*(1-ex);
    T.gradLine(g,130,Y+95,200,Y+95,T.clamp(a*2),4);
    g.save();g.translate((1-a)*90-ex*60,0);
    T.rowCard(g,200,Y,780,190,{col:c,label:MOD[i]});
    if(i===0)T.typeLine(g,'Вот ваш план на день',240,Y+135,q,{lt,cur:c});
    else if(i===1)T.wave(g,240,Y+118,680,q,lt,c);
    else if(i===2)T.tiles(g,240,Y+62,700,112,q);
    else T.timeline(g,240,Y+76,680,q,lt);
    g.restore();}
  g.globalAlpha=1;
  T.spark(g,T.lerp(130,540,ex),T.lerp(hy,630,ex),1);
}

// 4. Агенты в песочницах, хаб MCP и инструменты
function s4(g,t,S){const l=S.l,ex=T.exitK(l,S.len),SRC=[540,630],XS=[250,540,830],RT=[1.2,1.6,1.4];
  T.title(g,['Агенты,','песочницы','и','MCP'],{t,t0:S.t0,tout:S.t1,acc:3,size:90});
  g.globalAlpha=1-ex;
  for(let i=0;i<3;i++){const x=XS[i],c=T.ACC[i];
    T.curve(g,SRC,[540,720],[x,700],[x,800],T.eo(T.prog(l,.08,.5)),c,4);
    T.curve(g,[x,1050],[x,1150],[540,1120],[540,1210],T.eo(T.prog(l,1.3+i*.1,1.6+i*.1)),C[c]+'99',3);}
  for(let i=0;i<3;i++){const a=T.spring(T.prog(l,.42+i*.08,.85+i*.08));
    T.sandbox(g,XS[i],925,{title:'запуск '+(i+1),col:T.ACC[i],pg:T.eo(T.prog(l,.7,.7+RT[i])),l,a,seed:i});}
  T.pill(g,'MCP',540,1270,{a:T.spring(T.prog(l,1.2,1.6)),size:64,weight:800});
  const TL=['поиск','файлы','база'];
  for(let i=0;i<3;i++){const a=T.spring(T.prog(l,1.6+i*.1,2+i*.1));if(a<=0)continue;
    const P=[[540,1330],[540,1390],[XS[i],1370],[XS[i],1432]];
    T.curve(g,P[0],P[1],P[2],P[3],T.eo(T.prog(l,1.55+i*.1,1.8+i*.1)),C.wire,3);
    T.flowDot(g,P[0],P[1],P[2],P[3],l*1.2+i*.3,'a');
    T.chip(g,TL[i],XS[i],1470,{col:T.ACC[i],a});}
  g.globalAlpha=1;
  T.spark(g,T.lerp(SRC[0],150,ex),T.lerp(SRC[1],985,ex),1);
}

// 5. Обрыв потока, переподключение, штамп проверки типов
function s5(g,t,S){const l=S.l,ex=T.exitK(l,S.len);
  T.title(g,['Поток','не','рвётся,','типы','сходятся.'],{t,t0:S.t0,tout:S.t1,acc:3,size:112});
  const a=T.spring(T.prog(l,0,.4)),fr=l>.65&&l<1.3;
  const P=l<.65?.45*T.prog(l,.08,.65):.45+.55*T.eo(T.prog(l,1.3,2.1));
  const gap=fr?70*T.eo(T.prog(l,.65,.8))*(1-T.spring(T.prog(l,1,1.3))):0;
  const hx=T.lerp(150,930,P),ty=985;
  g.save();g.globalAlpha=T.clamp(a*1.5)*(1-ex);
  const sc=.94+.06*a;g.translate(540,850);g.scale(sc,sc);g.translate(-540,-850);
  T.card(g,100,640,880,420,{r:32});
  T.label(g,'поток ответа',144,704);
  const st=l<.65?['в эфире','ok']:fr?['обрыв','b']:['снова в сети','ok'];
  T.status(g,st[0],936,704,st[1]);
  const L1='Шаг 1: собираю данные',L2='Шаг 2: пишу вывод',n=Math.floor(P*(L1.length+L2.length));
  const col=fr?'mut':'ink';
  T.typeLine(g,L1,144,810,Math.min(1,n/L1.length),{color:col,cursor:n<L1.length,lt:l});
  if(n>L1.length)T.typeLine(g,L2,144,880,(n-L1.length)/L2.length,{color:col,lt:l});
  T.streamBar(g,150,930,ty,P,{gap,broken:fr});
  const ma=T.eo(T.prog(l,1,1.2))*(1-T.prog(l,1.8,1.95));
  if(ma>0)T.label(g,'та же точка',T.clamp(hx,250,830),ty+52,{align:'center',size:28,a:ma});
  g.restore();
  const hX=T.lerp(hx,540,ex),hY=T.lerp(ty,640,ex);
  if(fr)T.sparkPause(g,hX,hY);else T.spark(g,hX,hY,1);
  g.globalAlpha=1-ex;
  T.stamp(g,'tsc: 0 ошибок',540,1260,T.spring(T.prog(l,1.55,1.95)),{w:660,cp:T.eo(T.prog(l,1.7,1.95))});
  g.globalAlpha=1;
}

// 6. Всё сходится в искру, эмблема, имя, призыв, подпись
function s6(g,t,S){const l=S.l,M=[540,640];
  T.converge(g,M[0],M[1],t,S.t0);
  T.ring(g,M[0],M[1],T.prog(l,.6,1.1),110,490,'b');
  T.emblem(g,M[0],M[1],105,T.spring(T.prog(l,.55,1)));
  T.spark(g,M[0],M[1],l<.6?1+l:1.6-.4*T.eo(T.prog(l,.6,1)));
  T.brand(g,'TanStack AI',960,t,S.t0+.55,{size:180,step:.15});
  T.title(g,['Строй','то,','что','будет','дальше.'],{t,t0:S.t0+.75,y:1010,size:92,acc:4});
  T.credit(g,'фильм Studio1',1400,T.eo(T.prog(l,1.7,2)));
}

function sound(s){const P=(t,n,v,p)=>s.play(t,n,v,p?{pitch:p}:undefined);
  // 1: хук, нажатие, вылет искры
  P(.05,'pop_soft',.12);P(.4,'key_soft',.1);P(.75,'click',.12);P(.85,'drop',.14);P(1.12,'sparkle',.12);
  // 2: склейка, счётчик провайдеров
  P(2,'marimba_run',.16);P(2.15,'odometer',.1);P(2.4,'tick',.1,1);P(2.8,'tick',.1,1.15);P(3.2,'tick',.1,1.3);
  // 3: четыре карточки, высота растёт
  P(4,'kalimba_run',.16);[4.2,4.7,5.2,5.7].forEach((x,i)=>P(x,'pop_high',.11,.9+i*.12));
  // 4: песочницы, MCP, инструменты
  P(6.5,'marimba_run',.17,1.1);P(6.62,'bubble',.12);P(6.95,'wood',.1);P(7.7,'pop_double',.11);P(8.1,'click',.12);P(8.4,'woodblock',.1);
  // 5: обрыв, возврат, штамп
  P(9,'kalimba_run',.17,1.2);P(9.15,'type',.09);P(9.65,'toggle_off',.13);P(10.3,'toggle_on',.13);P(10.6,'success',.14);
  // 6: схождение и финал
  P(11.5,'magic',.18);P(12.1,'ta_da',.2);P(12.3,'pop_soft',.1);P(13.2,'notify',.1);P(14.2,'success3',.12,.9);
}