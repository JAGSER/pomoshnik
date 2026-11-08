// lib.js: стиль «Плакат-эссе» (PLK). Редакционный документальный ролик: почти чёрный фон с созвездиями,
// кремовая бумага с виньеткой, красный финал. Узкий жирный гротеск капсом, антиква в цитатах, моно-HUD.
const PLK = (() => {
const W=1080,H=1920,X0=60,X1=1020,SX=0.72,PI=Math.PI;
const C={
  dark:"#0A0A12", darkEdge:"#05060A", paper:"#ECE6DD", paperEdge:"#A39F98", redBg:"#E1372A", redEdge:"#8E211B",
  cream:"#EEE5DA", ink:"#0B0A10", red:"#E2362B", redDot:"#CD2F28", gold:"#E2AC4C", goldDim:"#5B4529",
  hl:"#EAC984", bar1:"#BDB8B1", bar2:"#86817D", gray:"#9A968F", line:"#2A2A30",
  chessL:"#DED4C7", chessD:"#C8BCAA", blue:"#3F67B0", yellow:"#E3B240", green:"#4E8C69", purple:"#7A5C8A", black:"#141418"
};
const F={
  sans:'"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif',
  serif:'"Liberation Serif","Times New Roman",Georgia,"DejaVu Serif","Noto Serif",serif',
  mono:'"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace'
};
const fCond=s=>`700 ${s}px ${F.sans}`, fKick=s=>`700 ${s}px ${F.sans}`, fMono=s=>`400 ${s}px ${F.mono}`;
const fSerif=(s,it)=>`${it?"italic ":""}400 ${s}px ${F.serif}`;

// ---------- математика
const clamp=(x,a,b)=>x<a?a:x>b?b:x, lerp=(a,b,u)=>a+(b-a)*u, prog=(t,a,b)=>clamp((t-a)/(b-a),0,1);
const easeOut=x=>{x=clamp(x,0,1);return 1-Math.pow(1-x,3);};
const easeOut5=x=>{x=clamp(x,0,1);return 1-Math.pow(1-x,5);};
const easeIn=x=>{x=clamp(x,0,1);return x*x*x;};
const easeInOut=x=>{x=clamp(x,0,1);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;};
const spring=x=>x<=0?0:1-Math.exp(-6*x)*Math.cos(9*x);
const settle=(d,amp,f)=>d<0?0:amp*Math.exp(-4*d)*Math.cos((f||7)*d);
function rng(s){s=(s>>>0)||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
const hash=i=>{let x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);};
function mix(a,b,u){const p=h=>[1,3,5].map(i=>parseInt(h.substr(i,2),16));const A=p(a),B=p(b);
  return "rgb("+A.map((v,i)=>Math.round(lerp(v,B[i],clamp(u,0,1)))).join(",")+")";}

// ---------- кэш ширин
const WC=new Map();
function tw(g,font,s){const k=font+"|"+s;let v=WC.get(k);if(v===undefined){g.font=font;v=g.measureText(s).width;WC.set(k,v);}return v;}

// ---------- фон и фактура (заранее отрисованные спрайты)
let GR=null;const BG={};
function grainTile(){if(GR)return GR;GR=new OffscreenCanvas(512,512);const x=GR.getContext("2d"),d=x.createImageData(512,512),r=rng(77);
  for(let i=0;i<d.data.length;i+=4){const v=r()<0.5?0:255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=r()*255|0;}x.putImageData(d,0,0);return GR;}
function bgSprite(kind){if(BG[kind])return BG[kind];const c=new OffscreenCanvas(W,H),x=c.getContext("2d");
  const st={dark:[[0,"#0C0C14"],[0.55,"#0A0A12"],[1,"#04050A"]],paper:[[0,"#EEE8DF"],[0.45,"#E6E0D7"],[0.8,"#CBC5BD"],[1,"#9E9A93"]],
    red:[[0,"#E5392C"],[0.5,"#D9332A"],[0.85,"#B02920"],[1,"#86201A"]]}[kind];
  x.fillStyle=st[1][1];x.fillRect(0,0,W,H);
  x.save();x.translate(540,900);x.scale(1,1.45);const gr=x.createRadialGradient(0,0,40,0,0,980);
  for(const s of st)gr.addColorStop(s[0],s[1]);x.fillStyle=gr;x.fillRect(-700,-800,1400,1600);x.restore();
  const t=grainTile();x.globalAlpha=kind==="dark"?0.06:0.07;
  for(let yy=0;yy<H;yy+=512)for(let xx=0;xx<W;xx+=512)x.drawImage(t,xx,yy);
  x.globalAlpha=1;x.globalCompositeOperation="source-over";BG[kind]=c;return c;}
// bg(g,"dark"|"paper"|"red",t): фон + живое зерно
// bg(g,"dark"|"paper"|"red"): фон с виньеткой и зерном (одна заранее отрисованная текстура)
function bg(g,kind){g.drawImage(bgSprite(kind),0,0);}
// ---------- спрайты свечения
const GL={};
function glowSprite(col){if(GL[col])return GL[col];const c=new OffscreenCanvas(256,256),x=c.getContext("2d"),gr=x.createRadialGradient(128,128,0,128,128,128);
  gr.addColorStop(0,col);gr.addColorStop(0.35,col.replace(/[\d.]+\)$/,"0.45)"));gr.addColorStop(1,col.replace(/[\d.]+\)$/,"0)"));x.fillStyle=gr;x.fillRect(0,0,256,256);GL[col]=c;return c;}
// glow(g,x,y,r,a): мягкое красное свечение (под курсивной цитатой, у шара)
function glow(g,x,y,r,a,col){if(a<=0.01)return;g.globalAlpha=a;g.drawImage(glowSprite(col||"rgba(200,40,30,1)"),x-r,y-r,2*r,2*r);g.globalAlpha=1;}
// ball(g,x,y,r,a): красный светящийся шар (сквозной предмет)
function ball(g,x,y,r,a){if(r<=0.5)return;a=a==null?1:a;glow(g,x,y,r*2.1,0.55*a);g.globalAlpha=a;
  const gr=g.createRadialGradient(x-r*0.2,y-r*0.25,r*0.1,x,y,r);gr.addColorStop(0,"#EE4636");gr.addColorStop(0.85,"#E2362B");gr.addColorStop(1,"#C42B22");
  g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,2*PI);g.fill();g.globalAlpha=1;}

// ---------- текст: узкий заголовок с буквами, встающими из-под базовой линии
const norm=s=>s.replace(/[.,:;!?«»"“”]/g,"").toUpperCase();
function fitSize(g,lines,size,maxW){let m=0;for(const l of lines)m=Math.max(m,tw(g,fCond(size),l)*SX);return m>maxW?Math.floor(size*maxW/m):size;}
// head(g,"СТРОКА 1|СТРОКА 2",{x,y,size,align,lh,col,acc:[слова],accCol,lineCols,lt,t0,step,dur,out,rgb,maxW})
// y = базовая линия первой строки. Возвращает {size, bottom, w}.
function head(g,text,o){o=o||{};const lines=text.split("|"),lt=o.lt==null?99:o.lt,t0=o.t0||0,step=o.step==null?0.028:o.step,dur=o.dur||0.5;
  const maxW=o.maxW||(X1-X0-40);let size=fitSize(g,lines,o.size||150,maxW);const lh=size*(o.lh||1.02),al=o.align||"left",font=fCond(size);
  const acc=(o.acc||[]).map(norm),accCol=o.accCol||C.red;let idx=0,maxw=0;
  for(let li=0;li<lines.length;li++){const ln=lines[li],y=o.y+li*lh,lw=tw(g,font,ln)*SX;maxw=Math.max(maxw,lw);
    let x=al==="center"?(o.x==null?540:o.x)-lw/2:al==="right"?o.x-lw:(o.x==null?X0:o.x);x=clamp(x,X0,Math.max(X0,X1-lw));
    const base=(o.lineCols&&o.lineCols[li])||o.col||C.cream;
    // слова для акцента
    const words=ln.split(" ");let ci=0;const colOf=[];for(const w of words){const c=acc.includes(norm(w))?accCol:base;for(let k=0;k<w.length;k++)colOf[ci++]=c;colOf[ci++]=base;}
    g.save();g.beginPath();g.rect(0,y-size*0.98,W,size*1.16);g.clip();g.font=font;
    for(let i=0;i<ln.length;i++,idx++){const ch=ln[i];if(ch===" ")continue;
      const a=t0+idx*step+(hash(idx*3.1)*0.05);const p=easeOut5(prog(lt,a,a+dur));if(p<=0)continue;
      let q=0;if(o.out!=null){const b=o.out+idx*step*0.4;q=easeIn(prog(lt,b,b+dur*0.6));if(q>=1)continue;}
      const cx=x+tw(g,font,ln.slice(0,i))*SX,dy=(1-p)*size*0.95+q*size*1.05,rot=(1-p)*0.32+q*0.28;
      g.save();g.translate(cx,y+dy);g.rotate(rot);g.scale(SX,1);
      const rg=Math.max(o.rgb||0,FX.rgb);if(rg>0){const d=rg*9;g.globalAlpha=0.85;g.fillStyle="#19C3E6";g.fillText(ch,-d,0);g.fillStyle="#F0306A";g.fillText(ch,d,1);g.fillStyle="#F2D23A";g.fillText(ch,0,-d*0.5);g.globalAlpha=1;}
      g.fillStyle=colOf[i];g.fillText(ch,0,0);g.restore();}
    g.restore();}
  return {size,bottom:o.y+(lines.length-1)*lh,w:maxw};}

// kicker(g,"ТЕКСТ",{x,y,size,col,align,dot,dotCol,lt,t0,out,track}): мелкий капс с разрядкой и красной точкой
function kicker(g,text,o){o=o||{};let size=o.size||30;const lt=o.lt==null?99:o.lt,t0=o.t0||0,track=o.track==null?0.32:o.track,maxW=o.maxW||(X1-X0-40);
  let font=fKick(size),ws=[...text].map(c=>tw(g,font,c)),tot=ws.reduce((a,b)=>a+b,0)+size*track*(ws.length-1);
  if(tot>maxW){size=Math.floor(size*maxW/tot);font=fKick(size);ws=[...text].map(c=>tw(g,font,c));tot=ws.reduce((a,b)=>a+b,0)+size*track*(ws.length-1);}
  const al=o.align||"left";let x=al==="center"?(o.x==null?540:o.x)-tot/2:al==="right"?o.x-tot:(o.x==null?X0+20:o.x);x=clamp(x,X0+(o.dot===false?0:size*0.6),X1-tot);
  const y=o.y;let out=o.out!=null?easeIn(prog(lt,o.out,o.out+0.3)):0;if(out>=1)return {w:tot,x};
  if(o.dot!==false){const p=easeOut(prog(lt,t0,t0+0.2));if(p>0){const s=size*0.3*p;g.fillStyle=o.dotCol||C.redDot;g.globalAlpha=1-out;g.fillRect(x-size*0.62,y-size*0.86,s,s);g.globalAlpha=1;}}
  g.font=font;g.fillStyle=o.col||C.cream;let cx=x;
  for(let i=0;i<ws.length;i++){const a=t0+0.08+i*0.026+hash(i*7.7)*0.08,p=easeOut(prog(lt,a,a+0.28));
    if(p>0){g.globalAlpha=p*(1-out);const j=(1-p)*(hash(i)-0.5)*size*0.9;if(FX.rgb>0){const d=FX.rgb*7,c0=g.fillStyle;g.fillStyle="#19C3E6";g.fillText(text[i],cx+j*0.4-d,y+j);g.fillStyle="#F0306A";g.fillText(text[i],cx+j*0.4+d,y+j);g.fillStyle=c0;}g.fillText(text[i],cx+j*0.4,y+j-out*size*0.6);}cx+=ws[i]+size*track;}
  g.globalAlpha=1;return {w:tot,x,size};}

// mono(g,"ТЕКСТ",{x,y,size,col,align,lt,t0,step,track}): моно-капс, печатается по буквам (подписи, атрибуции)
function mono(g,text,o){o=o||{};const size=o.size||22,lt=o.lt==null?99:o.lt,t0=o.t0||0,step=o.step==null?0.035:o.step,tr=o.track==null?0.3:o.track;
  const font=fMono(size),cw=tw(g,font,"0"),tot=text.length*cw+(text.length-1)*size*tr;let s=tot>X1-X0?(X1-X0)/tot:1;
  const al=o.align||"left";let x=al==="center"?(o.x==null?540:o.x)-tot*s/2:al==="right"?o.x-tot*s:(o.x==null?X0:o.x);
  const n=step>0?Math.floor(clamp((lt-t0)/step,0,text.length)):(lt>=t0?text.length:0);if(!n)return tot*s;
  g.save();g.translate(x,o.y);g.scale(s,s);g.font=font;g.fillStyle=o.col||C.gray;g.globalAlpha=o.alpha==null?1:o.alpha;
  for(let i=0;i<n;i++)g.fillText(text[i],i*(cw+size*tr),0);g.restore();g.globalAlpha=1;return tot*s;}

// small(g,"Текст",{x,y,size,col,align,lt,t0}): мелкая подпись обычным гротеском (подпись автора)
function small(g,text,o){const size=o.size||26,a=easeOut(prog(o.lt==null?99:o.lt,o.t0||0,(o.t0||0)+0.5));if(a<=0)return;const font=`400 ${size}px ${F.sans}`,w=tw(g,font,text);
  const x=o.align==="center"?(o.x==null?540:o.x)-w/2:(o.x==null?X0:o.x);g.font=font;g.globalAlpha=a;g.fillStyle=o.col||C.gray;g.fillText(text,clamp(x,X0,X1-w),o.y+(1-a)*8);g.globalAlpha=1;}

// ---------- цитата антиквой: слова проявляются из «размытия», ключевые красным, маркер подсветки
function wrap(g,font,text,maxW){const out=[];let cur=[];for(const w of text.split(" ")){const t=cur.concat(w).join(" ");if(cur.length&&tw(g,font,t)>maxW){out.push(cur);cur=[w];}else cur.push(w);}if(cur.length)out.push(cur);return out;}
// quote(g,"Текст",{x,y,w,size,lh,col,acc,accCol,hl,hlAt,italic,align,lt,t0,step,marks,bar,barCol,out})
function quote(g,text,o){o=o||{};const lt=o.lt==null?99:o.lt,t0=o.t0||0,step=o.step==null?0.075:o.step;let size=o.size||56;
  const maxW=o.w||(X1-X0);let font=fSerif(size,o.italic),lines=wrap(g,font,text,maxW);
  const lh=size*(o.lh||1.38),acc=(o.acc||[]).map(norm),hl=(o.hl||[]).map(norm),al=o.align||"left";
  const out=o.out!=null?easeIn(prog(lt,o.out,o.out+0.35)):0;if(out>=1)return {bottom:o.y,lines:lines.length};
  const sp=tw(g,font," ");let wi=0;
  if(o.bar){const p=easeOut(prog(lt,t0-0.2,t0+0.4));g.fillStyle=o.barCol||C.red;g.globalAlpha=1-out;g.fillRect(o.x-34,o.y-size*0.95,3,(lh*(lines.length-1)+size*1.3)*p);g.globalAlpha=1;}
  // маркер под словами (сначала, чтобы лёг под текст)
  const pos=[];for(let li=0;li<lines.length;li++){const ws=lines[li],lw=tw(g,font,ws.join(" "));let x=al==="center"?(o.x==null?540:o.x)-lw/2:o.x;
    for(const w of ws){pos.push({w,x,y:o.y+li*lh,ww:tw(g,font,w),i:wi++});x+=tw(g,font,w)+sp;}}
  if(o.marks){const p=easeOut(prog(lt,t0-0.25,t0+0.35));g.font=fSerif(size*2.6);g.fillStyle=o.markCol||C.goldDim;g.globalAlpha=p*(1-out);
    g.fillText("“",Math.max(X0-10,pos[0].x-size*1.15),o.y+size*0.9-(1-p)*12);g.globalAlpha=1;}
  if(hl.length){let k=0;for(const p of pos)if(hl.includes(norm(p.w))){const a=(o.hlAt||t0+1)+k*0.12;const e=easeOut(prog(lt,a,a+0.35));k++;
    if(e>0){g.fillStyle=o.hlCol||C.hl;g.globalAlpha=1-out;g.fillRect(p.x-4,p.y-size*0.78,(p.ww+(k<hl.length?sp:0)+8)*e,size*1.02);g.globalAlpha=1;}}}
  g.font=font;
  for(const p of pos){const a=t0+p.i*step,e=easeOut(prog(lt,a,a+0.55));if(e<=0)continue;const col=acc.includes(norm(p.w))?(o.accCol||C.red):(o.col||C.cream);
    g.fillStyle=col;const dy=(1-e)*10+out*14;
    if(e<1){g.globalAlpha=0.22*e;g.fillText(p.w,p.x-(1-e)*7,p.y+dy);g.fillText(p.w,p.x+(1-e)*7,p.y+dy);g.fillText(p.w,p.x,p.y+dy-(1-e)*6);}
    if(FX.rgb>0){const d=FX.rgb*8;g.globalAlpha=0.8;g.fillStyle="#19C3E6";g.fillText(p.w,p.x-d,p.y+dy);g.fillStyle="#F0306A";g.fillText(p.w,p.x+d,p.y+dy);g.fillStyle=col;}g.globalAlpha=e*e*(1-out);g.fillText(p.w,p.x,p.y+dy);}
  g.globalAlpha=1;return {bottom:o.y+(lines.length-1)*lh,lines:lines.length,size};}
// attrib(g,"АВТОР · ИСТОЧНИК · ГОД",{x,y,align,col,lt,t0,rule}): атрибуция моно с короткой золотой чертой
function attrib(g,text,o){const lt=o.lt==null?99:o.lt,t0=o.t0||0;if(o.rule!==false){const p=easeOut(prog(lt,t0-0.2,t0+0.3));const x=o.align==="center"?(o.x==null?540:o.x):o.x+30;
  g.fillStyle=o.col||C.gold;g.fillRect(x-30*p,o.y-44,60*p,2);}
  mono(g,text,{x:o.x,y:o.y,size:o.size||20,col:o.col||C.gold,align:o.align,lt,t0,step:0.02});}

// strike(g,x0,x1,y,p,col,lw): красная зачёркивающая линия
function strike(g,x0,x1,y,p,col,lw){if(p<=0)return;g.fillStyle=col||C.red;g.fillRect(x0,y-(lw||7)/2,(x1-x0)*easeOut(p),lw||7);}
// rule(g,x0,x1,y,p,col): тонкая линия-подчёркивание, растёт из центра
function rule(g,x0,x1,y,p,col,lw){if(p<=0)return;const c=(x0+x1)/2,h=(x1-x0)/2*easeOut(p);g.fillStyle=col||C.red;g.fillRect(c-h,y,2*h,lw||3);}

// ---------- фоновые слои тёмных сцен
let STARS=null,CONS=null;
function initStars(){if(STARS)return;const r=rng(5);STARS=[];for(let i=0;i<160;i++)STARS.push([r()*W,r()*H,r()*6.28,0.6+r()*1.6,r()<0.12]);}
// dust(g,lt,a): мерцающие звёздочки-пылинки
function dust(g,lt,a){initStars();a=a==null?1:a;for(let b=0;b<3;b++){g.fillStyle=b===2?"rgba(226,172,76,":"rgba(238,229,218,";
  const al=[0.25,0.5,0.8][b]*a;g.fillStyle+=al+")";g.beginPath();for(const s of STARS){const tw_=0.5+0.5*Math.sin(lt*s[3]+s[2]);const k=tw_<0.33?0:tw_<0.7?1:2;if(k!==b)continue;
    const y=(s[1]-lt*8+H)%H;g.rect(s[0],y,2.2,2.2);}g.fill();}}
function initCons(){if(CONS)return;const r=rng(11),N=[],E=[];
  for(let c=0;c<24;c++){const cx=40+r()*1000,cy=40+r()*1840,n=5+(r()*6|0),st=N.length;
    for(let i=0;i<n;i++)N.push({x:cx+(r()-0.5)*300,y:cy+(r()-0.5)*260,g:r()<0.14,ph:r()*6.28});
    for(let i=st+1;i<N.length;i++){let best=st,bd=1e9;for(let j=st;j<i;j++){const d=(N[i].x-N[j].x)**2+(N[i].y-N[j].y)**2;if(d<bd){bd=d;best=j;}}E.push([i,best]);if(r()<0.35)E.push([i,st+(r()*(i-st)|0)]);}}
  for(let i=0;i<60;i++)N.push({x:r()*W,y:r()*H,g:false,ph:r()*6.28,lone:1});
  CONS={N,E};}
// constellation(g,lt,{p, a, gold:[t...], cx,cy}): созвездие связей-соседей; p 0..1 проявление от точки (cx,cy)
function constellation(g,lt,o){initCons();o=o||{};const p=o.p==null?1:o.p,a=o.a==null?1:o.a,cx=o.cx==null?540:o.cx,cy=o.cy==null?960:o.cy,dy=-lt*7;
  const R=p*2300,vis=n=>Math.hypot(n.x-cx,n.y-cy)<R;
  g.strokeStyle=`rgba(200,196,188,${0.26*a})`;g.lineWidth=1.2;g.beginPath();
  for(const e of CONS.E){const A=CONS.N[e[0]],B=CONS.N[e[1]];if(!vis(A)||!vis(B))continue;g.moveTo(A.x,A.y+dy);g.lineTo(B.x,B.y+dy);}g.stroke();
  let fl=0;if(o.gold)for(const t of o.gold){const d=lt-t;if(d>=0&&d<1.2)fl=Math.max(fl,1-d/1.2);}
  g.fillStyle=`rgba(238,229,218,${0.75*a})`;g.beginPath();for(const n of CONS.N){if(!vis(n)||n.g)continue;const r=n.lone?2:3;g.moveTo(n.x+r,n.y+dy);g.arc(n.x,n.y+dy,r,0,2*PI);}g.fill();
  g.fillStyle=`rgba(226,172,76,${(0.55+0.45*fl)*a})`;g.beginPath();for(const n of CONS.N){if(!vis(n)||!n.g)continue;const r=4.2+2.5*fl;g.moveTo(n.x+r,n.y+dy);g.arc(n.x,n.y+dy,r,0,2*PI);}g.fill();}
// rings(g,lt,{cx,cy,a}): концентрические тонкие круги (сцена угрозы/вывода)
function rings(g,lt,o){o=o||{};const cx=o.cx==null?540:o.cx,cy=o.cy==null?820:o.cy,a=o.a==null?1:o.a;g.lineWidth=1.5;
  for(let i=1;i<16;i++){const r=i*85+((lt*14)%85);g.strokeStyle=`rgba(200,200,215,${0.075*a*clamp(1-r/1400,0,1)*clamp(r/150,0,1)})`;g.beginPath();g.arc(cx,cy,r,0,2*PI);g.stroke();}}
// dial(g,cx,cy,r,p,{a}): круг-циферблат с засечками, рисуется по часовой, красная точка на конце дуги
function dial(g,cx,cy,r,p,o){o=o||{};if(p<=0)return;const a=o.a==null?1:o.a,a0=-PI/2,a1=a0+2*PI*easeInOut(p);
  g.strokeStyle=`rgba(190,190,205,${0.32*a})`;g.lineWidth=2;g.beginPath();g.arc(cx,cy,r,a0,a1);g.stroke();
  g.beginPath();for(let i=0;i<60;i++){const an=a0+i*2*PI/60;if(an>a1)break;const L=i%5===0?(i%15===0?26:16):7;
    g.moveTo(cx+Math.cos(an)*(r+6),cy+Math.sin(an)*(r+6));g.lineTo(cx+Math.cos(an)*(r+6+L),cy+Math.sin(an)*(r+6+L));}g.stroke();
  g.fillStyle=`rgba(230,225,215,${0.7*a})`;g.fillRect(cx-1.5,cy-r-40,3,30);
  g.fillStyle=C.red;g.globalAlpha=a;g.beginPath();g.arc(cx+Math.cos(a1)*r,cy+Math.sin(a1)*r,9,0,2*PI);g.fill();g.globalAlpha=1;}

// ---------- HUD: уголки, метка, таймкод, глава, счётчик кадров
function hud(g,t,o){o=o||{};const th=o.theme||"dark",col=th==="paper"?"rgba(40,36,32,0.42)":th==="red"?"rgba(255,232,222,0.5)":"rgba(160,160,172,0.45)";
  const L=26,m=40,yT=52,yB=1688;g.strokeStyle=col;g.lineWidth=2;g.beginPath();
  g.moveTo(m,yT+L);g.lineTo(m,yT);g.lineTo(m+L,yT);g.moveTo(W-m-L,yT);g.lineTo(W-m,yT);g.lineTo(W-m,yT+L);
  g.moveTo(m,yB-L);g.lineTo(m,yB);g.lineTo(m+L,yB);g.moveTo(W-m-L,yB);g.lineTo(W-m,yB);g.lineTo(W-m,yB-L);g.stroke();
  const f=Math.floor(t*30),tc=`ТК 00:00:${String(Math.floor(t)).padStart(2,"0")}:${String(f%30).padStart(2,"0")}`;
  mono(g,o.label||"ДВОР / ЭССЕ 2026",{x:m+42,y:yT+30,size:17,col,step:0});
  mono(g,tc,{x:W-m-42,y:yT+30,size:17,col,step:0,align:"right"});
  if(o.chapter)mono(g,o.chapter,{x:m+42,y:yB-12,size:17,col,step:0});
  const fr="КД "+String(f).padStart(4,"0");mono(g,fr,{x:W-m-200,y:yB-12,size:17,col,step:0,align:"right"});
  g.fillStyle=col;g.fillRect(W-m-188,yB-19,140,1.5);const pr=clamp(t/(o.dur||35),0,1);g.fillRect(W-m-188,yB-20.5,140*pr,4);}

// ---------- графика
// outlineNum(g,"1962",{x,y,size,col,roll:[от,до],p,a,cols}): огромные контурные цифры-одометр на фоне
function outlineNum(g,str,o){const size=o.size||560,font=fCond(size),cw=tw(g,font,"0")*SX,a=o.a==null?1:o.a;if(a<=0)return;
  const n=str.length;let x=o.align==="right"?o.x-cw*n:o.x;g.save();g.font=font;g.strokeStyle=o.col||"rgba(40,36,32,0.16)";g.lineWidth=2.2/SX;g.globalAlpha=a;
  for(let i=0;i<n;i++){const to=+str[i];let v=to;if(o.roll){const fr=+String(o.roll[0]).padStart(n,"0")[i];v=lerp(fr,to+(to<fr?10:0),easeOut(o.p==null?1:o.p));}
    const d0=Math.floor(v),fr_=v-d0;g.save();g.beginPath();g.rect(x+i*cw-10,o.y-size*0.8,cw+20,size*0.86);g.clip();
    for(const [d,off] of [[d0%10,-fr_],[(d0+1)%10,1-fr_]]){if(Math.abs(off)>=1)continue;g.save();g.translate(x+i*cw,o.y+off*size*0.86);g.scale(SX,1);g.strokeText(String(d),0,0);g.restore();}
    g.restore();}g.restore();g.globalAlpha=1;}
// timeline(g,lt,{x0,x1,y,t0,dur,pts:[{u,year,label,col,big}],col,lab}): таймлайн с годами и точками
function timeline(g,lt,o){const t0=o.t0||0,p=easeInOut(prog(lt,t0,t0+(o.dur||1.2))),col=o.col||C.ink;
  g.fillStyle=col;g.fillRect(o.x0,o.y-1.5,(o.x1-o.x0)*p,3);
  for(const q of o.pts){const x=lerp(o.x0,o.x1,q.u),ta=t0+(o.dur||1.2)*q.u*0.9,e=spring((lt-ta)*1.6);if(e<=0.01)continue;
    g.fillStyle=q.col||col;g.beginPath();g.arc(x,o.y,(q.big===false?7:11)*Math.min(e,1.2),0,2*PI);g.fill();
    if(q.year)head(g,q.year,{x,y:o.y-44,size:q.big===false?64:100,align:"center",col:q.col||col,lt,t0:ta,step:0.04,maxW:420});
    if(q.label){const ls=q.label.split("\n");ls.forEach((l,i)=>kicker(g,l,{x:x,y:o.y+64+i*34,size:23,col:o.lab||col,align:"center",dot:false,lt,t0:ta+0.15,track:0.22}));}}}
// bars(g,lt,{vals,x0,x1,yb,h,t0,step,gather,cx,blockH,stackW,base}): столбчатый график серым;
// gather 0..1 собирает столбцы в красную стопку блоков по центру cx (столбец i -> блок i)
function bars(g,lt,o){const n=o.vals.length,sp=(o.x1-o.x0)/n,bw=sp*0.68,t0=o.t0||0,ga=o.gather||0,cx=o.cx==null?540:o.cx,bh=o.blockH||46,sw=o.stackW||150;
  g.fillStyle=o.baseCol||"rgba(200,200,210,0.25)";g.fillRect(o.x0-10,o.yb,o.x1-o.x0+20,2);
  const ord=o.vals.map((v,i)=>i).sort((a,b)=>Math.abs(a-(n-1)/2)-Math.abs(b-(n-1)/2));const rank=[];ord.forEach((i,k)=>rank[i]=k);
  for(let i=0;i<n;i++){const gr=easeOut(prog(lt,t0+i*(o.step||0.06),t0+i*(o.step||0.06)+0.6));if(gr<=0)continue;
    const e=easeInOut(clamp(ga*1.6-rank[i]*0.6/n,0,1));
    const draw=(e,al)=>{const x=lerp(o.x0+i*sp+(sp-bw)/2,cx-sw/2,e),w=lerp(bw,sw,e),h=lerp(o.h*o.vals[i]*gr,bh-3,e),yb=lerp(o.yb,o.yb-rank[i]*bh,e);
      g.globalAlpha=al;g.fillStyle=e>0.02?mix(i%2?C.bar2:C.bar1,C.red,e*1.4):(i%2?C.bar2:C.bar1);g.fillRect(x,yb-h,w,h);
};
    if(e>0.02&&e<0.98){draw(clamp(e-0.18,0,1),0.18);draw(clamp(e-0.09,0,1),0.3);}draw(e,1);g.globalAlpha=1;}}
// crane(g,x,yTop,p,{w,h,col}): трос с крюком опускает последний красный блок на стопку (p 0..1)
function crane(g,x,yTop,p,o){o=o||{};if(p<=0)return;const w=o.w||150,h=(o.h||46)-3,e=easeOut(p),y=lerp(140,yTop-h,e);
  g.strokeStyle="rgba(220,215,205,0.55)";g.lineWidth=2;g.beginPath();g.moveTo(x,60);g.lineTo(x,y-34);g.stroke();
  g.lineWidth=5;g.strokeStyle="rgba(220,215,205,0.8)";g.beginPath();g.arc(x,y-22,12,PI*0.1,PI*1.2);g.stroke();
  g.beginPath();g.moveTo(x-w/2+10,y);g.lineTo(x,y-22);g.lineTo(x+w/2-10,y);g.lineWidth=2;g.stroke();
  if(e<1){g.globalAlpha=0.25;g.fillStyle=C.red;g.fillRect(x-w/2,y-h-40*(1-e),w,h);}g.globalAlpha=1;g.fillStyle=C.red;g.fillRect(x-w/2,y,w,h);}
// venn(g,lt,{cx,cy,r,t0,merge,a,b,mid,orb:[подписи]}): два круга-диаграммы со стрелками, затем пересечение-линза красным
function venn(g,lt,o){const t0=o.t0||0,r=o.r||170,m=easeInOut(o.merge||0),d=lerp(o.gap||300,r*0.75,m),p=easeOut(prog(lt,t0,t0+0.7));
  const ax=o.cx-d,bx=o.cx+d,cy=o.cy;
  if(m>0.02){g.save();g.beginPath();g.arc(ax,cy,r,0,2*PI);g.clip();g.fillStyle=C.red;g.globalAlpha=m;g.beginPath();g.arc(bx,cy,r,0,2*PI);g.fill();g.restore();g.globalAlpha=1;}
  g.strokeStyle=C.cream;g.lineWidth=3;for(const x of [ax,bx]){g.beginPath();g.arc(x,cy,r,-PI/2,-PI/2+2*PI*p);g.stroke();}
  if(o.orb&&m<0.9){const ao=1-m;g.fillStyle=`rgba(226,54,43,${0.8*ao})`;for(let k=0;k<26;k++){const an=k/26*2*PI+lt*0.5;const ex=o.cx+Math.cos(an)*d*1.25,ey=cy+Math.sin(2*an)*r*0.6*0.8;g.fillRect(ex-2,ey-2,4,4);}
    o.orb.forEach((s,k)=>{const an=k/o.orb.length*2*PI+0.6;mono(g,s,{x:o.cx+Math.cos(an)*(d+r*0.3),y:cy+Math.sin(an)*r*1.15,size:17,col:`rgba(200,200,210,${0.6*ao})`,align:"center",lt,t0:t0+0.6+k*0.1});});}
  kicker(g,o.a,{x:ax-(1-m)*0+(m*-r*0.35),y:m>0.5?cy+r+60:cy+10,size:24,align:"center",dot:false,lt,t0:t0+0.4,col:C.cream});
  kicker(g,o.b,{x:bx+(m*r*0.35),y:m>0.5?cy+r+60:cy+10,size:24,align:"center",dot:false,lt,t0:t0+0.5,col:C.cream});
  if(o.mid&&m>0.6)head(g,o.mid,{x:o.cx,y:cy+r*0.18,size:r*0.42,align:"center",col:C.ink,lt,t0:(o.midAt||t0+1.5),maxW:r*0.9});}
// chess(g,lt,{cx,cy,size,p,form:"ring"|"rows",seed,n}): доска-двор и цветные фишки-жители; p 0..1 из хаоса в строй
const PCOL=["#D8392C","#3F67B0","#E3B240","#4E8C69","#7A5C8A","#141418"];
function chess(g,lt,o){const S=o.size||600,c=S/8,x0=o.cx-S/2,y0=o.cy-S/2,a=easeOut(prog(lt,o.t0||0,(o.t0||0)+0.5));if(a<=0)return;
  g.globalAlpha=a;g.fillStyle=C.chessL;g.fillRect(x0,y0,S,S);g.fillStyle=C.chessD;g.beginPath();for(let i=0;i<8;i++)for(let j=0;j<8;j++)if((i+j)%2)g.rect(x0+i*c,y0+j*c,c,c);g.fill();
  const n=o.n||30,r=rng(o.seed||3),P=[];for(let k=0;k<n;k++)P.push({sx:x0+c*0.5+r()*(S-c),sy:y0+c*0.5+r()*(S-c),col:PCOL[k%6],d:r()*0.3});
  const ring=(k)=>{const an=k/n*2*PI-PI/2,rr=S*0.36;return [o.cx+Math.cos(an)*rr,o.cy+Math.sin(an)*rr];};
  const rows=(k)=>{const cc=k%8,rw=k/8|0;return [x0+c*(cc+0.5),y0+c*(rw+2.5)];};
  const tgt=o.form==="rows"?rows:ring,rad=c*0.36;
  for(let k=0;k<n;k++){const q=P[k],[tx,ty]=tgt(k),w=Math.sin(lt*1.3+k)*3;
    const at=e=>[lerp(q.sx+w,tx,e),lerp(q.sy-w,ty,e)+Math.sin(e*PI)*-c*0.6];const e=easeInOut(clamp(((o.p||0)-q.d)/0.7,0,1));
    g.fillStyle=q.col;if(e>0.03&&e<0.97)for(const [de,al] of [[0.16,0.18],[0.08,0.32]]){const [x,y]=at(clamp(e-de,0,1));g.globalAlpha=al*a;g.beginPath();g.arc(x,y,rad,0,2*PI);g.fill();}
    const [x,y]=at(e),pop=spring((lt-(o.t0||0)-0.3-k*0.02)*1.5);if(pop<=0.01)continue;g.globalAlpha=a;g.beginPath();g.arc(x,y,rad*Math.min(pop,1.15),0,2*PI);g.fill();
    g.strokeStyle="#141418";g.lineWidth=2.5;g.stroke();}
  g.globalAlpha=1;}
// columns(g,lt,{cx,yb,w,h,labels,t0,step,ped,pedLabel,col,gold,labCol}): колонны встают по одной, затем фронтон золотым контуром
function columns(g,lt,o){const n=o.labels.length,w=o.w||900,sp=w/n,cw=Math.min(78,sp*0.36),h=o.h||520,t0=o.t0||0,yb=o.yb,col=o.col||"#E4DED2",x0=o.cx-w/2;
  const bp=easeOut(prog(lt,t0-0.4,t0+0.1));g.fillStyle=col;g.globalAlpha=bp;g.fillRect(o.cx-w/2-30,yb+14,(w+60),14);g.fillRect(o.cx-w/2-5,yb,w+10,14);g.globalAlpha=1;
  for(let i=0;i<n;i++){const a=t0+i*(o.step||0.4),e=spring((lt-a)*1.3);if(e<=0.005)continue;const x=x0+sp*(i+0.5),hh=h*Math.min(e,1.04);
    g.save();g.beginPath();g.rect(x-cw,yb-h-60,cw*2,h+60);g.clip();const top=yb-hh;
    g.fillStyle=col;g.fillRect(x-cw/2,top+18,cw,hh-18);g.fillRect(x-cw*0.66,top,cw*1.32,18);g.fillRect(x-cw*0.6,yb-12,cw*1.2,12);
    g.fillStyle="rgba(120,112,100,0.55)";for(let f=-1;f<=1;f++)g.fillRect(x+f*cw*0.25-1,top+30,2,hh-48);g.restore();
    kicker(g,o.labels[i],{x,y:yb+78,size:o.labSize||22,align:"center",dot:false,col:o.labCol||C.cream,lt,t0:a+0.2,track:0.18,maxW:sp-8});}
  if(o.ped!=null){const e=easeOut(prog(lt,o.ped,o.ped+0.5)),ty=yb-h;if(e>0){g.fillStyle=col;g.fillRect(o.cx-w/2+10,ty-30-(1-e)*40,w-20,30);g.globalAlpha=1;}
    const pe=easeInOut(prog(lt,o.ped+0.3,o.ped+1.1));if(pe>0){const L=o.cx-w/2-20,R=o.cx+w/2+20,Y=ty-34,T=Y-130;g.strokeStyle=o.gold||C.gold;g.lineWidth=3;g.beginPath();
      const pts=[[L,Y],[o.cx,T],[R,Y],[L,Y]];let tot=0;const seg=[];for(let k=0;k<3;k++){const d=Math.hypot(pts[k+1][0]-pts[k][0],pts[k+1][1]-pts[k][1]);seg.push(d);tot+=d;}
      let rem=tot*pe;g.moveTo(L,Y);for(let k=0;k<3;k++){const u=clamp(rem/seg[k],0,1);g.lineTo(lerp(pts[k][0],pts[k+1][0],u),lerp(pts[k][1],pts[k+1][1],u));rem-=seg[k];if(rem<=0)break;}g.stroke();
      if(o.pedLabel)kicker(g,o.pedLabel,{x:o.cx,y:Y-26,size:22,align:"center",dot:false,col:o.gold||C.gold,lt,t0:o.ped+0.9,track:0.5});}}}

// ---------- переходы (рисуются ПОСЛЕ camEnd, в экранных координатах)
// iris(g,t,at,{toRed}): красный шар растёт и заливает кадр до склейки; после склейки кольца расходятся и открывают новую сцену
function iris(g,t,at,o){o=o||{};const d=t-at;if(d<-0.75||d>(o.toRed?0:0.7))return;
  if(d<0){const e=easeIn(prog(d,-0.75,0)),r=lerp(60,1250,e);if(e>0.95){g.fillStyle=C.red;g.fillRect(0,0,W,H);return;}ball(g,540,880,r,1);if(e>0.6){g.fillStyle=C.red;g.globalAlpha=(e-0.6)/0.4;g.fillRect(0,0,W,H);g.globalAlpha=1;}return;}
  const e=easeOut(prog(d,0,0.7)),h=lerp(0,1500,e),bands=["#2A1214","#5A1D1B","#9A2922"];
  g.save();g.beginPath();g.rect(0,0,W,H);g.arc(540,880,h+300,0,2*PI,true);g.fillStyle=C.red;g.fill("evenodd");g.restore();
  for(let k=2;k>=0;k--){g.beginPath();g.arc(540,880,h+100*(k+1),0,2*PI);g.arc(540,880,h+100*k,0,2*PI,true);g.fillStyle=bands[k];g.fill("evenodd");}}
// stairs(g,t,at,from,to,{dir}): ступенчатая шторка «пиксельной лестницей» с тремя серыми ступенями на кромке (смена фона dark<->paper)
function stairs(g,t,at,from,to,o){o=o||{};const D=0.9,d=t-at;if(d<-D/2||d>D/2)return;const e=easeInOut((d+D/2)/D),cw=90,sh=36,k=1.25;
  const s=lerp(-300,W+H*k+300,e),A=bgSprite(to),B=bgSprite(from),sh3=[0.25,0.55,0.8];
  for(let x=0;x<W;x+=cw){let yb=(s-(o.dir?W-x-cw:x))/k;yb=Math.round(yb/sh)*sh;yb=clamp(yb,-4*sh,H+4*sh);
    if(d<0){if(yb>0)g.drawImage(A,x,0,cw,Math.min(yb,H),x,0,cw,Math.min(yb,H));}
    else{const y0=Math.max(yb+3*sh,0);if(y0<H)g.drawImage(B,x,y0,cw,H-y0,x,y0,cw,H-y0);}
    for(let b=0;b<3;b++){const y=yb+b*sh;if(y>H||y+sh<0)continue;g.fillStyle=mix(to==="paper"?"#E6E0D7":"#0A0A12",from==="paper"?"#E6E0D7":"#0A0A12",sh3[b]);g.fillRect(x,y,cw,sh);}}}
// glitch(g,t,at,{dur,amt,light,y0,y1}): глитч-сдвиг полос и RGB-кант на склейке/смене слова
// Глитч без чтения холста: сцена перерисовывается полосами со сдвигом, текст получает RGB-кант (FX.rgb).
// G = [{at, dur, amt, y0, y1}]; withGlitch(g,t,G,kind,fn): fn() рисует камеру+сцену.
const FX={rgb:0};
function glitchAmt(t,G){for(const q of G){const D=q.dur||0.3,d=t-q.at;if(d>-D/2&&d<D/2)return {q,amt:(q.amt||1)*Math.sin(PI*(d+D/2)/D)};}return null;}
function withGlitch(g,t,G,kind,fn){const r0=glitchAmt(t,G);if(!r0){fn();return;}const {q,amt}=r0,y0=q.y0||0,y1=q.y1||H,f=Math.floor(t*30),r=rng(f*31+7);
  FX.rgb=amt;fn();
  for(let i=0;i<5;i++){const yy=y0+r()*(y1-y0-30),sh=10+r()*70,dx=(r()-0.5)*170*amt;
    g.save();g.beginPath();g.rect(0,yy,W,sh);g.clip();g.drawImage(bgSprite(kind),0,yy,W,sh,0,yy,W,sh);g.translate(dx,0);fn();g.restore();}
  FX.rgb=0;}

// ---------- камера и сцены
function camera(g,lt,o){o=o||{};const z=1+0.006*lt*(o.push==null?1:o.push)+settle(lt,0.018,6),dy=settle(lt,-10,5)+(o.dy||0);
  g.save();g.translate(540,880+dy);g.scale(z,z);g.translate(-540,-880);return z;}
function camEnd(g){g.restore();g.globalAlpha=1;g.globalCompositeOperation="source-over";}
function cutsFromSubs(k){const a=(k.subs||[]).map(s=>Array.isArray(s)?s[1]:s.t0);if(!a.length||a[0]>0)a.unshift(0);return a;}
// scene(t,CUTS) -> {i, lt, len, left}: номер сцены, локальное время, длина сцены, сколько осталось
function scene(t,cuts){let i=0;while(i<cuts.length-1&&t>=cuts[i+1])i++;const end=i<cuts.length-1?cuts[i+1]:1e9;return {i,lt:t-cuts[i],len:end-cuts[i],left:end-t};}
// cutSounds(s,cuts,types): звук склейки по типу перехода ("iris","stairs","glitch","cut")
function cutSounds(s,cuts,types,vol){for(let i=1;i<cuts.length;i++){const ty=(types&&types[i])||"glitch",v=vol||0.14,t=cuts[i];
  if(ty==="iris"){s.play(t-0.7,"bubble_down",v*0.8,{pitch:0.55});s.play(t,"marimba_run",v,{pitch:0.6});}
  else if(ty==="stairs")s.play(t-0.35,"kalimba_run",v,{pitch:0.75});
  else if(ty==="glitch"){s.play(t-0.05,"click",v,{pitch:0.55});s.play(t+0.05,"toggle_off",v*0.8,{pitch:0.7});}
  else if(ty==="red")s.play(t-0.6,"bubble_down",v,{pitch:0.5});}}

return {C,F,W,H,X0,X1,SX,fCond,fKick,fMono,fSerif,clamp,lerp,prog,easeOut,easeOut5,easeIn,easeInOut,spring,settle,rng,hash,mix,tw,
  bg,bgSprite,glow,ball,head,kicker,mono,small,quote,attrib,strike,rule,dust,constellation,rings,dial,hud,
  outlineNum,timeline,bars,crane,venn,chess,columns,iris,stairs,FX,glitchAmt,withGlitch,camera,camEnd,cutsFromSubs,scene,cutSounds};
})();
