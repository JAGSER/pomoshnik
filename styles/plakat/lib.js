// lib.js: стиль «Плакат-эссе» (PLK). Редакционный документальный ролик: почти чёрный фон с созвездиями,
// кремовая бумага с виньеткой, красный финал. Узкий жирный гротеск капсом, антиква в цитатах, моно-HUD.
const PLK = (() => {
const W=1080,H=1920,X0=60,X1=1020,SX=0.72,PI=Math.PI;
const C={
  dark:"#0A0A12", darkEdge:"#05060A", paper:"#ECE6DD", paperEdge:"#A39F98", redBg:"#E1372A", redEdge:"#8E211B",
  cream:"#EEE5DA", ink:"#0B0A10", red:"#E2362B", redDot:"#CD2F28", gold:"#E2AC4C", goldDim:"#5B4529",
  hl:"#EAC984", bar1:"#BDB8B1", bar2:"#86817D", gray:"#9A968F", line:"#2A2A30",
  chessL:"#DED4C7", chessD:"#C8BCAA", blue:"#3F67B0", yellow:"#E3B240", green:"#4E8C69", purple:"#7A5C8A", black:"#141418",
  // тона для типовых объектов (названные в тексте цвета)
  orange:"#E07A2E", pink:"#E9879A", ginger:"#D2702E", brown:"#6E4A33", sky:"#8FB3CF", glass:"#A9B8C2", stone:"#B9AFA2",
  skin:"#E6B48F", skin2:"#B87A55", skin3:"#7A4E35", hairDark:"#2E2420", hairBlond:"#D9B26A", hairGray:"#D9D3C9", leaf:"#4E8C69", pine:"#2F5E48"
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
function bg(g,kind){THEME=kind;g.drawImage(bgSprite(kind),0,0);}
let THEME="dark";
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
// hud(g,t,{theme,label (метка ролика по теме, по умолчанию нет),chapter,dur})
function hud(g,t,o){o=o||{};const th=o.theme||"dark",col=th==="paper"?"rgba(40,36,32,0.42)":th==="red"?"rgba(255,232,222,0.5)":"rgba(160,160,172,0.45)";
  const L=26,m=40,yT=52,yB=1688;g.strokeStyle=col;g.lineWidth=2;g.beginPath();
  g.moveTo(m,yT+L);g.lineTo(m,yT);g.lineTo(m+L,yT);g.moveTo(W-m-L,yT);g.lineTo(W-m,yT);g.lineTo(W-m,yT+L);
  g.moveTo(m,yB-L);g.lineTo(m,yB);g.lineTo(m+L,yB);g.moveTo(W-m-L,yB);g.lineTo(W-m,yB);g.lineTo(W-m,yB-L);g.stroke();
  const f=Math.floor(t*30),tc=`ТК 00:00:${String(Math.floor(t)).padStart(2,"0")}:${String(f%30).padStart(2,"0")}`;
  if(o.label)mono(g,o.label,{x:m+42,y:yT+30,size:17,col,step:0});
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

// ---------- типовые объекты: плоский плакатный силуэт, заливка без градиентов и обводок;
// кромка цвета текущего фона (o.edge, false = без кромки) отделяет фигуры друг от друга. y везде = земля / линия воды.
const EDGE={dark:"#0A0A12",paper:"#E6E0D7",red:"#D9332A"};
const edgeOf=o=>o&&o.edge===false?null:(o&&o.edge)||EDGE[THEME];
const SHD=new Map();
function shade(col,k){if(typeof col!=="string"||col[0]!=="#")return col;const key=col+(k||0.25);let v=SHD.get(key);if(!v){v=mix(col,"#000000",k||0.25);SHD.set(key,v);}return v;}
function seg(g,pts,w,col,E,ew){g.lineCap="round";g.lineJoin="round";g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);
  if(E){g.strokeStyle=E;g.lineWidth=w+2*ew;g.stroke();}g.strokeStyle=col;g.lineWidth=w;g.stroke();}
function poly(g,pts,col,E,ew){g.lineJoin="round";g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.closePath();
  if(E){g.strokeStyle=E;g.lineWidth=2*ew;g.stroke();}g.fillStyle=col;g.fill();}
function disc(g,x,y,r,col,E,ew){g.beginPath();g.arc(x,y,Math.max(r,0.1),0,2*PI);if(E){g.strokeStyle=E;g.lineWidth=2*ew;g.stroke();}g.fillStyle=col;g.fill();}
function ik(a,b,L1,L2,dir){const dx=b[0]-a[0],dy=b[1]-a[1],d=clamp(Math.hypot(dx,dy),1e-3,L1+L2-1e-3),an=Math.atan2(dy,dx),c=clamp((L1*L1+d*d-L2*L2)/(2*L1*d),-1,1),k=an-dir*Math.acos(c);
  return [a[0]+Math.cos(k)*L1,a[1]+Math.sin(k)*L1];}

// person(g,x,y,o): человек. o: {h (рост px: взрослый 320, ребёнок 200, пожилой 290), age:"adult"|"child"|"old",
//  pose:"stand"|"walk"|"run"|"wave"|"sit"|"hold"|"dance", t (время: походка, взмах), flip (смотрит влево),
//  body (верх), legs (низ), skin, hair, hairStyle:"short"|"long"|"bun"|"none", skirt, hat:"helmet"|"cap"|"kerchief", hatCol,
//  backpack (цвет), item:"book"|"box"|"bag"|"flag"|fn(g,hx,hy,u), itemCol, cane, a, edge}
function person(g,x,y,o){o=o||{};const age=o.age||"adult",ch=age==="child",old=age==="old",h=o.h||(ch?200:old?290:320),u=h/100,t=o.t||0,pose=o.pose||"stand";
  const E=edgeOf(o),ew=Math.max(1.5,u*0.9),skin=o.skin||C.skin,body=o.body||o.col||C.blue,legC=o.legs||"#3A3942",hair=o.hair||(old?C.hairGray:C.hairDark),ink="#1B1A20";
  const L=(ch?21:24)*u,tor=(ch?29:34)*u,aL1=(ch?13:16)*u,aL2=(ch?12:15)*u,legW=(ch?7:8)*u,armW=(ch?5.5:6.2)*u;
  let hipY=-2*L,lean=old?0.16:0,bob=0,fF=[3*u,0],fB=[-3*u,0];const ph=t*(pose==="run"?10:6.5),s=Math.sin(ph),cph=Math.cos(ph);
  if(pose==="walk"||pose==="run"){const A=pose==="run"?0.5:0.34,lift=(pose==="run"?13:7)*u;fF=[s*2*L*A,-Math.max(0,cph)*lift];fB=[-s*2*L*A,-Math.max(0,-cph)*lift];bob=-Math.abs(cph)*2*u;if(pose==="run")lean+=0.16;}
  if(pose==="dance"){const d=Math.sin(t*5);lean+=d*0.1;fF=[10*u,-Math.max(0,d)*10*u];fB=[-10*u,-Math.max(0,-d)*10*u];bob=-Math.abs(d)*3*u;}
  if(pose==="sit"){hipY=-L*1.08;fF=[L*1.05,0];fB=[L*0.9,0];}
  let hip=[0,hipY+bob];if(o.seat){hip=o.seat.slice();fF=o.pedals[0];fB=o.pedals[1];lean=0.38;}
  const sh=[hip[0]+Math.sin(lean)*tor,hip[1]-Math.cos(lean)*tor],hc=[sh[0]+Math.sin(lean)*(ch?12:10)*u,sh[1]-(ch?12.5:10.5)*u],hr=(ch?10.5:8.2)*u;
  let hF=[sh[0]+5*u,sh[1]+29*u],hB=[sh[0]-4*u,sh[1]+29*u];
  if(pose==="walk")hF=[sh[0]-s*13*u,sh[1]+28*u],hB=[sh[0]+s*13*u,sh[1]+28*u];
  if(pose==="run")hF=[sh[0]-s*14*u+5*u,sh[1]+19*u],hB=[sh[0]+s*14*u+5*u,sh[1]+19*u];
  if(pose==="wave")hF=[sh[0]+13*u+Math.sin(t*9)*6*u,sh[1]-25*u];
  if(pose==="hold")hF=[sh[0]+21*u,sh[1]+15*u],hB=[sh[0]+18*u,sh[1]+17*u];
  if(pose==="sit")hF=[sh[0]+17*u,sh[1]+25*u],hB=[sh[0]+14*u,sh[1]+27*u];
  if(pose==="dance"){const d=Math.sin(t*5);hF=[sh[0]+15*u,sh[1]-24*u+d*6*u];hB=[sh[0]-13*u,sh[1]-22*u-d*6*u];}
  if(o.grip)hF=o.grip,hB=[o.grip[0]-3*u,o.grip[1]+2*u];
  if(o.cane&&pose!=="sit")hF=[sh[0]+15*u,sh[1]+24*u];
  g.save();g.translate(x,y);if(o.flip)g.scale(-1,1);if(o.a!=null)g.globalAlpha=o.a;
  if(o.hairStyle==="long"&&!o.hat){poly(g,[[hc[0]-hr*1.05,hc[1]],[hc[0]+hr*0.3,hc[1]],[hc[0]+hr*0.2,sh[1]+6*u],[hc[0]-hr*1.25,sh[1]+6*u]],hair,E,ew);}
  if(o.backpack){const bx=sh[0]-(ch?17:19)*u;poly(g,[[bx,sh[1]+4*u],[bx+9*u,sh[1]+3*u],[bx+9*u,sh[1]+(ch?21:24)*u],[bx-1*u,sh[1]+(ch?21:24)*u]],o.backpack,E,ew);}
  const arm=(hand,col)=>{const el=ik(sh,hand,aL1,aL2,-1);seg(g,[sh,el,hand],armW,col,E,ew);disc(g,hand[0],hand[1],armW*0.6,skin,null,0);};
  const leg=(foot,col)=>{const kn=ik(hip,foot,L,L,1);seg(g,[hip,kn,foot],legW,col,E,ew);seg(g,[[foot[0]-1*u,foot[1]-1.5*u],[foot[0]+5*u,foot[1]-1.5*u]],3.6*u,ink,null,0);};
  arm(hB,shade(body,0.28));leg(fB,shade(legC,0.3));leg(fF,legC);
  const hw=(ch?9:11)*u,bw=(o.skirt?15:9)*u,by=hip[1]+(o.skirt?(ch?14:18):5)*u,sl=Math.sin(lean)*4*u;
  poly(g,[[sh[0]-hw,sh[1]],[sh[0]+hw,sh[1]],[hip[0]+bw-sl,by],[hip[0]-bw-sl,by]],body,E,ew);
  if(o.cane&&pose!=="sit")seg(g,[hF,[hF[0]+4*u,0]],2.2*u,"#5A3E2B",E,ew*0.6);
  arm(hF,body);
  // голова
  disc(g,hc[0],hc[1],hr,skin,E,ew);
  const hs=o.hairStyle||(old&&o.skirt?"bun":"short");
  if(!o.hat&&hs!=="none"){g.fillStyle=hair;g.beginPath();g.arc(hc[0],hc[1],hr*1.06,PI*0.92,PI*2.08);g.closePath();g.fill();
    if(hs==="bun")disc(g,hc[0]-hr*0.75,hc[1]-hr*0.7,hr*0.45,hair,null,0);}
  disc(g,hc[0]+hr*0.48,hc[1]-hr*0.05,Math.max(1.4,u*0.95),ink,null,0);
  if(o.hat==="helmet"){const c=o.hatCol||C.yellow;g.fillStyle=c;g.beginPath();g.arc(hc[0],hc[1]-hr*0.08,hr*1.12,PI,2*PI);g.fill();g.fillRect(hc[0]-hr*1.35,hc[1]-hr*0.12,hr*2.7,hr*0.28);}
  else if(o.hat==="cap"){const c=o.hatCol||C.red;g.fillStyle=c;g.beginPath();g.arc(hc[0],hc[1]-hr*0.1,hr*1.05,PI,2*PI);g.fill();g.fillRect(hc[0],hc[1]-hr*0.2,hr*1.55,hr*0.24);}
  else if(o.hat==="kerchief"){const c=o.hatCol||C.red;g.fillStyle=c;g.beginPath();g.arc(hc[0],hc[1],hr*1.13,PI*0.62,PI*2.02);g.lineTo(hc[0]-hr*0.2,hc[1]+hr*0.45);g.closePath();g.fill();}
  if(o.item){const [ix,iy]=hF,c=o.itemCol||C.cream;
    if(typeof o.item==="function")o.item(g,ix,iy,u);
    else if(o.item==="book"){poly(g,[[ix-12*u,iy-9*u],[ix,iy-6*u],[ix,iy+4*u],[ix-12*u,iy+1*u]],c,E,ew*0.6);poly(g,[[ix,iy-6*u],[ix+12*u,iy-9*u],[ix+12*u,iy+1*u],[ix,iy+4*u]],shade(c,0.12),E,ew*0.6);
      g.fillStyle=o.coverCol||C.red;g.fillRect(ix-12*u,iy+1*u,24*u,1.6*u);}
    else if(o.item==="box")poly(g,[[ix-11*u,iy-14*u],[ix+11*u,iy-14*u],[ix+11*u,iy+3*u],[ix-11*u,iy+3*u]],c,E,ew*0.6);
    else if(o.item==="bag"){seg(g,[[ix-3*u,iy],[ix,iy+3*u],[ix+3*u,iy]],1.2*u,ink,null,0);poly(g,[[ix-7*u,iy+3*u],[ix+7*u,iy+3*u],[ix+8*u,iy+17*u],[ix-8*u,iy+17*u]],c,E,ew*0.6);}
    else if(o.item==="flag"){seg(g,[[ix,iy+6*u],[ix,iy-40*u]],1.6*u,ink,null,0);poly(g,[[ix,iy-40*u],[ix+22*u,iy-36*u+Math.sin(t*6)*2*u],[ix+21*u,iy-26*u],[ix,iy-27*u]],c,null,0);}}
  g.restore();}

// crowd(g,x,y,list,o): ряд людей с шагом o.gap (по умолчанию 0.3 роста); list = [опции person], o.t общее время
function crowd(g,x,y,list,o){o=o||{};let cx=x;for(let i=0;i<list.length;i++){const q=list[i],h=q.h||o.h||300;person(g,cx,y+(q.dy||0),Object.assign({h,t:(o.t||0)+i*0.37},q));cx+=(o.gap||h*0.3);}}

// building(g,x,y,o): здание, x = левый край. o: {kind:"house"|"tower"|"shop"|"cafe"|"school", w,h, floors, cols, col (стены), roof,
//  win (тёмное окно), litCol, lit (0..1 доля горящих окон; гаснут/загораются по одному), seed, p (0..1 стройка: этажи растут снизу),
//  sign (текст вывески, только из темы), signCol, signText, awning (цвет маркизы), door}  -> {x,y,w,h,top}
const BK={house:{w:300,h:250,floors:2,cols:2,col:"#C8B49A",roof:C.red,gable:1},tower:{w:330,h:620,floors:9,cols:4,col:"#A29C95"},
  shop:{w:340,h:270,floors:1,cols:1,col:"#B9AFA2",awning:C.red,shop:1},cafe:{w:360,h:280,floors:1,cols:1,col:"#C8B49A",awning:C.blue,shop:1},
  school:{w:600,h:330,floors:2,cols:6,col:"#C98F6B",roof:"#7A3B2E",ped:1}};
function building(g,x,y,o){o=o||{};const d=BK[o.kind||"house"]||BK.house,w=o.w||d.w,h=o.h||d.h,fl=o.floors||d.floors,cols=o.cols||d.cols,col=o.col||d.col,E=edgeOf(o),ew=2;
  const p=o.p==null?1:o.p,fv=Math.min(fl,Math.ceil(fl*p-1e-6)),fh=(d.shop?h*0.62:h)/fl,top=y-(d.shop?h:fv*fh);if(p<=0)return {x,y,w,h,top:y};
  const hv=d.shop?h:fv*fh;
  if(E){g.fillStyle=E;g.fillRect(x-ew,top-ew,w+2*ew,hv+ew);}
  g.fillStyle=col;g.fillRect(x,top,w,hv);g.fillStyle=shade(col,0.18);g.fillRect(x+w*0.84,top,w*0.16,hv);
  const lit=o.lit||0,litC=o.litCol||C.hl,off=o.win||"#2B2A31",r=rng((o.seed||7)*13+1);
  if(d.shop){const sy=y-h*0.62,ww=w*0.56;g.fillStyle=lit>0?litC:(o.win||C.glass);g.fillRect(x+w*0.08,sy+h*0.12,ww,h*0.42);
    g.fillStyle=shade(col,0.35);g.fillRect(x+w*0.08+ww/2-1.5,sy+h*0.12,3,h*0.42);
    g.fillStyle=o.door||C.brown;g.fillRect(x+w*0.72,sy+h*0.08,w*0.18,h*0.54);
    const aw=o.awning||d.awning,n=8,ay=sy-6;for(let i=0;i<n;i++){g.fillStyle=i%2?C.cream:aw;g.beginPath();g.moveTo(x-10+i*(w+20)/n,ay);g.lineTo(x-10+(i+1)*(w+20)/n,ay);
      g.lineTo(x-10+(i+1)*(w+20)/n,ay+30);g.arc(x-10+(i+0.5)*(w+20)/n,ay+30,(w+20)/n/2,0,PI);g.closePath();g.fill();}
    if(o.sign)sign(g,x+w/2,top+(h*0.38-6)/2,o.sign,{col:o.signCol||C.ink,textCol:o.signText||C.cream,maxW:w-30,size:o.signSize||Math.min(54,h*0.2)});}
  else{const N=fv*cols,ord=[];for(let i=0;i<fl*cols;i++)ord.push([r(),i]);ord.sort((a,b)=>a[0]-b[0]);const rank=[];ord.forEach((q,k)=>rank[q[1]]=k);
    const cw=w/cols,wW=cw*0.46,wH=fh*0.5;
    for(let f=0;f<fv;f++)for(let c=0;c<cols;c++){const i=f*cols+c;g.fillStyle=rank[i]<lit*fl*cols?litC:off;g.fillRect(x+c*cw+(cw-wW)/2,y-(f+1)*fh+fh*0.24,wW,wH);}
    if(o.door!==false&&p>=1){const dw=Math.min(54,w*0.16);g.fillStyle=o.doorCol||C.brown;g.fillRect(x+w/2-dw/2,y-fh*0.62,dw,fh*0.62);}
    if(p>=1&&(d.gable||o.roof&&!d.ped&&o.kind!=="tower")){const rc=o.roof||d.roof||C.red;poly(g,[[x-16,top],[x+w/2,top-w*0.32],[x+w+16,top]],rc,E,ew);}
    if(p>=1&&d.ped){const rc=o.roof||d.roof;poly(g,[[x-12,top],[x+w/2,top-70],[x+w+12,top]],rc,E,ew);g.fillStyle=shade(col,0.3);g.fillRect(x-12,top-2,w+24,10);
      seg(g,[[x+w/2,top-70],[x+w/2,top-170]],4,"#2B2A31",null,0);poly(g,[[x+w/2,top-170],[x+w/2+70,top-160],[x+w/2+68,top-128],[x+w/2,top-134]],o.flagCol||C.red,null,0);}
    if(o.kind==="tower"&&p>=1){g.fillStyle=shade(col,0.3);g.fillRect(x-8,top-14,w+16,14);}
    if(o.sign&&p>=1)sign(g,x+w/2,y-fh*0.62-30,o.sign,{col:o.signCol||C.ink,textCol:o.signText||C.cream,maxW:w-40,size:o.signSize||34});}
  return {x,y,w,h:hv,top};}
// sign(g,cx,cy,"ТЕКСТ",{col,textCol,size,maxW,pad}): вывеска-табличка с текстом (текст только по теме ролика)
function sign(g,cx,cy,text,o){o=o||{};let size=o.size||36;const maxW=o.maxW||600;let w=tw(g,fCond(size),text)*SX;if(w>maxW-2*(o.pad||18)){size=size*(maxW-2*(o.pad||18))/w;w=tw(g,fCond(size),text)*SX;}
  const pad=o.pad||size*0.45,bw=w+2*pad,bh=size*1.35;g.fillStyle=o.col||C.ink;g.fillRect(cx-bw/2,cy-bh/2,bw,bh);
  g.save();g.translate(cx-w/2,cy+size*0.36);g.scale(SX,1);g.font=fCond(size);g.fillStyle=o.textCol||C.cream;g.fillText(text,0,0);g.restore();return {w:bw,h:bh};}

// tree(g,x,y,o): дерево, x = центр ствола. o: {kind:"leaf"|"oak"|"pine", h (320), col (листва), trunk, t (покачивание), autumn (цвет пятен осени)}
function tree(g,x,y,o){o=o||{};const k=o.kind||"leaf",h=o.h||320,E=edgeOf(o),ew=2,tr=o.trunk||"#5A3E2B";g.save();g.translate(x,y);g.rotate(Math.sin((o.t||0)*1.3+x)*0.012);
  if(k==="pine"){const c=o.col||C.pine;g.fillStyle=tr;g.fillRect(-h*0.04,-h*0.16,h*0.08,h*0.16);
    for(let i=0;i<3;i++){const yb=-h*(0.12+i*0.26),ww=h*(0.36-i*0.08);poly(g,[[-ww,yb],[0,yb-h*0.42],[ww,yb]],i%2?shade(c,0.12):c,E,ew);}}
  else{const c=o.col||C.leaf,oak=k==="oak",tw_=h*(oak?0.13:0.08);poly(g,[[-tw_/2,0],[tw_/2,0],[tw_*0.35,-h*0.55],[-tw_*0.35,-h*0.55]],tr,E,ew);
    const B=oak?[[0,-0.66,0.24],[-0.27,-0.55,0.2],[0.27,-0.56,0.21],[-0.13,-0.8,0.19],[0.15,-0.82,0.18],[0,-0.48,0.18]]:[[0,-0.68,0.24],[-0.16,-0.54,0.18],[0.17,-0.55,0.19]];
    for(const b of B)disc(g,b[0]*h,b[1]*h,b[2]*h,c,E,ew);for(const b of B)disc(g,b[0]*h,b[1]*h,b[2]*h,c,null,0);
    g.fillStyle=shade(c,0.16);g.beginPath();for(const b of B)if(b[0]>=0){g.moveTo(b[0]*h+b[2]*h*0.95,b[1]*h+b[2]*h*0.2);g.arc(b[0]*h+b[2]*h*0.3,b[1]*h+b[2]*h*0.2,b[2]*h*0.65,0,2*PI);}g.fill();
    if(o.autumn){g.fillStyle=o.autumn;g.beginPath();for(let i=0;i<9;i++){const b=B[i%B.length],an=hash(i*5.3+x)*6.28,rr=b[2]*h*0.6;const px=b[0]*h+Math.cos(an)*rr,py=b[1]*h+Math.sin(an)*rr;g.moveTo(px+h*0.035,py);g.arc(px,py,h*0.035,0,2*PI);}g.fill();}}
  g.restore();}
// grass(g,x0,x1,y,{h,col,seed}): полоса травы треугольниками
function grass(g,x0,x1,y,o){o=o||{};const h=o.h||26,r=rng(o.seed||9);g.fillStyle=o.col||C.leaf;g.beginPath();g.moveTo(x0,y);for(let x=x0;x<x1;x+=9+r()*8){g.lineTo(x+3,y-h*(0.5+r()*0.6));g.lineTo(x+7,y);}g.lineTo(x1,y);g.closePath();g.fill();g.fillRect(x0,y,x1-x0,4);}
// leaves(g,lt,{x0,x1,y0,y1,n,cols,s,seed}): падающие кленовые листья (кружатся, детерминированно)
function leaves(g,lt,o){o=o||{};const n=o.n||14,s=o.s||22,cols=o.cols||[C.orange,C.red,C.yellow],x0=o.x0||80,x1=o.x1||1000,y0=o.y0||200,y1=o.y1||1600;
  for(let i=0;i<n;i++){const sp=0.07+hash(i*2.1)*0.06,u=(lt*sp+hash(i*3.7))%1,yy=lerp(y0,y1,u),xx=lerp(x0,x1,hash(i*1.3))+Math.sin(lt*1.6+i)*40,rot=lt*1.8+i;
    g.save();g.translate(xx,yy);g.rotate(rot);g.scale(Math.cos(lt*2+i)*0.4+0.8,1);g.fillStyle=cols[i%cols.length];g.beginPath();
    for(let k=0;k<10;k++){const a=k/10*2*PI-PI/2,rr=k%2?s*0.42:s;g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}g.closePath();g.fill();g.restore();}}

// car(g,x,y,o): машина, x = центр. o: {w (320), col, t (колёса), flip}
function car(g,x,y,o){o=o||{};const w=o.w||320,u=w/100,col=o.col||C.red,E=edgeOf(o),ew=2;g.save();g.translate(x,y);if(o.flip)g.scale(-1,1);
  poly(g,[[-50*u,-9*u],[50*u,-9*u],[50*u,-24*u],[30*u,-27*u],[18*u,-40*u],[-26*u,-40*u],[-38*u,-27*u],[-50*u,-25*u]],col,E,ew);
  g.fillStyle=o.win||C.glass;g.beginPath();g.moveTo(-23*u,-37*u);g.lineTo(-4*u,-37*u);g.lineTo(-4*u,-27*u);g.lineTo(-33*u,-27*u);g.closePath();g.moveTo(0,-37*u);g.lineTo(16*u,-37*u);g.lineTo(26*u,-27*u);g.lineTo(0,-27*u);g.closePath();g.fill();
  g.fillStyle=shade(col,0.25);g.fillRect(-50*u,-14*u,100*u,5*u);g.fillStyle=C.hl;g.fillRect(45*u,-23*u,5*u,4*u);
  for(const wx of [-30,30])wheel(g,wx*u,-9*u,9*u,o.t||0,E);g.restore();}
function wheel(g,x,y,r,t,E){disc(g,x,y,r,"#1B1A20",E,2);disc(g,x,y,r*0.42,"#9A968F",null,0);const a=t*8;g.strokeStyle="#1B1A20";g.lineWidth=Math.max(1.5,r*0.12);g.beginPath();g.moveTo(x+Math.cos(a)*r*0.42,y+Math.sin(a)*r*0.42);g.lineTo(x-Math.cos(a)*r*0.42,y-Math.sin(a)*r*0.42);g.stroke();}
// bus(g,x,y,o): автобус, x = центр. o: {w (560), col (C.blue), num (номер маршрута, строка), t, flip, heads (цвета голов пассажиров в окнах)}
function bus(g,x,y,o){o=o||{};const w=o.w||560,u=w/100,col=o.col||C.blue,E=edgeOf(o),ew=2;g.save();g.translate(x,y);if(o.flip)g.scale(-1,1);
  poly(g,[[-50*u,-6*u],[50*u,-6*u],[50*u,-34*u],[46*u,-38*u],[-48*u,-38*u],[-50*u,-34*u]],col,E,ew);
  g.fillStyle=shade(col,0.22);g.fillRect(-50*u,-12*u,100*u,6*u);g.fillStyle=C.cream;g.fillRect(-50*u,-21*u,100*u,1.6*u);
  const wy=-33*u,wh=10*u;g.fillStyle=o.win||C.glass;for(let i=0;i<6;i++)g.fillRect(-46*u+i*13*u,wy,11*u,wh);g.fillRect(36*u,wy,12*u,22*u);
  if(o.heads)o.heads.forEach((c,i)=>{if(!c)return;disc(g,-40.5*u+i*13*u,wy+wh*0.62,3*u,c,null,0);g.fillStyle=c;g.fillRect(-44*u+i*13*u,wy+wh*0.8,7*u,wh*0.2);});
  g.fillStyle=shade(col,0.35);g.fillRect(28*u,-30*u,6*u,24*u);
  if(o.num!=null){g.fillStyle=C.ink;g.fillRect(37*u,-37.5*u,10*u,4.5*u);g.save();g.font=fCond(4*u);g.fillStyle=C.hl;const s=String(o.num),tw0=tw(g,fCond(4*u),s)*SX;g.translate(42*u-tw0/2,-34*u);g.scale(SX,1);g.fillText(s,0,0);g.restore();}
  g.fillStyle=C.hl;g.fillRect(47*u,-11*u,3*u,3*u);for(const wx of [-32,30])wheel(g,wx*u,-6*u,6.5*u,o.t||0,E);g.restore();}
// bike(g,x,y,o): велосипед с ездоком, x = центр. o: {h (рост ездока 300), col (рама), t (педали, колёса), flip, rider:{опции person}|false}
function bike(g,x,y,o){o=o||{};const u=(o.h||300)/100,t=o.t||0,col=o.col||C.red,E=edgeOf(o),R=13*u,wb=23*u,an=t*7;g.save();g.translate(x,y);if(o.flip)g.scale(-1,1);
  const wB=[-wb,-R],wF=[wb,-R],cr=[-1*u,-R],seat=[-8*u,-R-23*u],bar=[16*u,-R-26*u],p1=[cr[0]+Math.cos(an)*5.5*u,cr[1]+Math.sin(an)*5.5*u],p2=[cr[0]-Math.cos(an)*5.5*u,cr[1]-Math.sin(an)*5.5*u];
  for(const w of [wB,wF]){g.lineWidth=2.6*u+(E?4:0);if(E){g.strokeStyle=E;g.beginPath();g.arc(w[0],w[1],R,0,2*PI);g.stroke();}g.lineWidth=2.6*u;g.strokeStyle="#1B1A20";g.beginPath();g.arc(w[0],w[1],R,0,2*PI);g.stroke();
    g.lineWidth=1;g.beginPath();for(let k=0;k<3;k++){const a=an+k*PI/3;g.moveTo(w[0]+Math.cos(a)*R,w[1]+Math.sin(a)*R);g.lineTo(w[0]-Math.cos(a)*R,w[1]-Math.sin(a)*R);}g.stroke();}
  const fw=2.4*u;seg(g,[wB,cr,[seat[0]+1*u,seat[1]+3*u],wB],fw,col,E,1.5);seg(g,[cr,[bar[0]-3*u,bar[1]+7*u],[seat[0]+1*u,seat[1]+3*u]],fw,col,E,1.5);seg(g,[[bar[0]-3*u,bar[1]+7*u],wF],fw,col,E,1.5);
  seg(g,[[bar[0]-3*u,bar[1]+7*u],bar,[bar[0]+4*u,bar[1]]],1.8*u,"#1B1A20",null,0);seg(g,[[seat[0]-4*u,seat[1]],[seat[0]+4*u,seat[1]]],2.4*u,"#1B1A20",null,0);
  if(o.rider!==false)person(g,0,0,Object.assign({h:o.h||300},o.rider||{},{seat:[seat[0],seat[1]-1*u],pedals:[p1,p2],grip:bar,edge:o.edge}));
  g.restore();}
// boat(g,x,y,o): лодка на воде, x = центр, y = линия воды. o: {w (340), col (корпус), kind:"motor"|"sail"|"row", sail, t (качка, винт), crew:[опции person], crewH, wake (0..1 пена за кормой), flip}
function boat(g,x,y,o){o=o||{};const w=o.w||340,u=w/100,col=o.col||C.red,E=edgeOf(o),ew=2,t=o.t||0,k=o.kind||"motor";g.save();g.translate(x,y+Math.sin(t*2.1+x)*2*u);if(o.flip)g.scale(-1,1);g.rotate(Math.sin(t*1.7+x)*0.025);
  if(o.wake){g.fillStyle=`rgba(238,229,218,${0.55*o.wake})`;for(let i=0;i<4;i++){const ww=(12+i*14)*u*o.wake;g.fillRect(-50*u-ww-i*4*u,(1+i*1.6)*u,ww,1.4*u);}}
  if(k==="sail"){seg(g,[[0,-12*u],[0,-80*u]],2*u,"#2B2A31",null,0);poly(g,[[2*u,-78*u],[34*u,-16*u],[2*u,-16*u]],o.sail||C.cream,E,ew);poly(g,[[-2*u,-70*u],[-2*u,-18*u],[-26*u,-18*u]],shade(o.sail||C.cream,0.1),E,ew);}
  if(k==="motor"){poly(g,[[-12*u,-12*u],[16*u,-12*u],[16*u,-30*u],[-8*u,-30*u]],C.cream,E,ew);g.fillStyle=C.glass;g.fillRect(2*u,-27*u,11*u,8*u);poly(g,[[-52*u,-14*u],[-44*u,-14*u],[-44*u,4*u],[-50*u,4*u]],"#2B2A31",null,0);}
  const cr=o.crew||[],ch=o.crewH||w*0.55;cr.forEach((q,i)=>{person(g,(-34+i*(60/Math.max(1,cr.length)))*u+(k==="motor"?-6*u:0),-4*u,Object.assign({h:ch,t:t+i},q));});
  poly(g,[[-48*u,-12*u],[52*u,-15*u],[42*u,5*u],[-42*u,5*u]],col,E,ew);g.fillStyle=C.cream;g.fillRect(-46*u,-10*u,90*u,2*u);
  g.restore();}
// towerCrane(g,x,y,o): башенный кран, x = ось башни. o: {h (1000), jib (вылет стрелы вправо, 560), back (150), col (C.yellow), trolley (0..1 позиция каретки), hook (длина троса, px), load:{w,h,col} | null}
function towerCrane(g,x,y,o){o=o||{};const h=o.h||1000,J=o.jib||560,B=o.back||150,c=o.col||C.yellow,tw2=34,ty=y-h;g.save();g.translate(x,0);g.lineWidth=5;g.strokeStyle=c;g.lineJoin="round";
  g.beginPath();g.moveTo(-tw2/2,y);g.lineTo(-tw2/2,ty);g.moveTo(tw2/2,y);g.lineTo(tw2/2,ty);for(let yy=y;yy>ty+20;yy-=46){g.moveTo(-tw2/2,yy);g.lineTo(tw2/2,yy-46);g.lineTo(-tw2/2,yy-46);}g.stroke();
  g.beginPath();g.moveTo(-B,ty);g.lineTo(J,ty);g.moveTo(-B,ty-26);g.lineTo(J*0.97,ty-8);for(let xx=-B;xx<J-30;xx+=44){const y1=ty-26+(xx+B)/(J+B)*18;g.moveTo(xx,y1);g.lineTo(xx+22,ty);g.lineTo(xx+44,y1+1);}
  g.moveTo(0,ty-80);g.lineTo(-B,ty-26);g.moveTo(0,ty-80);g.lineTo(J*0.6,ty-14);g.stroke();g.fillStyle=c;g.fillRect(-6,ty-80,12,80);
  g.fillStyle="#3A3942";g.fillRect(-B,ty+2,70,40);g.fillStyle=c;g.fillRect(tw2/2,ty+2,40,36);g.fillStyle=C.glass;g.fillRect(tw2/2+8,ty+8,24,16);
  const tx=lerp(80,J-30,o.trolley==null?0.6:o.trolley),hk=o.hook==null?300:o.hook;g.fillStyle="#2B2A31";g.fillRect(tx-14,ty,28,10);
  g.strokeStyle="#2B2A31";g.lineWidth=2;g.beginPath();g.moveTo(tx-4,ty+10);g.lineTo(tx-4,ty+hk);g.moveTo(tx+4,ty+10);g.lineTo(tx+4,ty+hk);g.stroke();g.fillStyle=c;g.fillRect(tx-10,ty+hk-4,20,12);
  if(o.load){const L=o.load,lw=L.w||200,lh=L.h||40;g.strokeStyle="#2B2A31";g.lineWidth=2;g.beginPath();g.moveTo(tx,ty+hk+8);g.lineTo(tx-lw/2+8,ty+hk+46);g.moveTo(tx,ty+hk+8);g.lineTo(tx+lw/2-8,ty+hk+46);g.stroke();
    g.fillStyle=L.col||"#A29C95";g.fillRect(tx-lw/2,ty+hk+46,lw,lh);g.fillStyle=shade(L.col||"#A29C95",0.2);g.fillRect(tx-lw/2,ty+hk+46+lh-6,lw,6);}
  g.restore();return {hookX:x+tx,hookY:ty+hk+(o.load?46:8)};}

// animal(g,x,y,o): собака или кошка, x = центр. o: {kind:"dog"|"cat", s (длина корпуса 160), col, pose:"stand"|"walk"|"sit"|"sleep", t, flip}
function animal(g,x,y,o){o=o||{};const cat=o.kind==="cat",s=o.s||(cat?120:160),u=s/100,col=o.col||(cat?C.gray:C.ginger),dk=shade(col,0.28),E=edgeOf(o),ew=2,t=o.t||0,pose=o.pose||"stand",ink="#1B1A20";
  g.save();g.translate(x,y);if(o.flip)g.scale(-1,1);
  const ear=(hx,hy,r)=>cat?poly(g,[[hx-r*0.7,hy-r*0.5],[hx-r*0.3,hy-r*1.6],[hx+r*0.15,hy-r*0.8]],col,E,ew):poly(g,[[hx-r*0.6,hy-r*0.7],[hx-r*0.05,hy-r*0.95],[hx-r*0.6,hy+r*0.5]],dk,E,ew);
  const head=(hx,hy,r,closed)=>{disc(g,hx,hy,r,col,E,ew);if(!cat)poly(g,[[hx+r*0.3,hy-r*0.1],[hx+r*1.55,hy+r*0.05],[hx+r*1.5,hy+r*0.75],[hx+r*0.3,hy+r*0.8]],col,null,0);
    disc(g,hx+(cat?r*0.95:r*1.55),hy+(cat?r*0.15:r*0.15),r*(cat?0.16:0.2),ink,null,0);ear(hx,hy,r);
    if(closed){g.strokeStyle=ink;g.lineWidth=Math.max(1.5,r*0.1);g.beginPath();g.arc(hx+r*0.45,hy-r*0.1,r*0.22,0.2,PI-0.2);g.stroke();}else disc(g,hx+r*0.48,hy-r*0.2,Math.max(1.5,r*0.11),ink,null,0);};
  if(pose==="sleep"){const br=1+Math.sin(t*2.2)*0.04;g.save();g.scale(1,br);
    seg(g,[[-38*u,-6*u],[-22*u,-2*u],[10*u,-2*u]],7*u*(cat?0.7:1),dk,E,ew);
    g.beginPath();g.ellipse(0,-12*u,40*u,13*u,0,0,2*PI);if(E){g.strokeStyle=E;g.lineWidth=2*ew;g.stroke();}g.fillStyle=col;g.fill();g.restore();
    seg(g,[[22*u,-3*u],[52*u,-3*u]],6*u,col,E,ew);head(40*u,-14*u,(cat?13:12)*u,1);}
  else if(pose==="sit"){seg(g,[[-24*u,-8*u],[-46*u,-6*u],[-56*u,-20*u]],(cat?4:6)*u,dk,E,ew);
    g.beginPath();g.ellipse(-6*u,-30*u,22*u,28*u,0.35,0,2*PI);if(E){g.strokeStyle=E;g.lineWidth=2*ew;g.stroke();}g.fillStyle=col;g.fill();
    seg(g,[[6*u,-34*u],[9*u,-2*u]],7*u,col,E,ew);seg(g,[[14*u,-34*u],[16*u,-2*u]],7*u,col,E,ew);head(14*u,-62*u,(cat?13:12)*u,0);}
  else{const ph=pose==="walk"?t*7:0,sw=pose==="walk"?0.35:0,lw=(cat?5:7)*u,legs=[[-28,ph],[-20,ph+PI],[24,ph+PI],[32,ph]];
    seg(g,[[-36*u,-44*u],[-50*u,-56*u],[-58*u,cat?-80*u:-60*u]],(cat?4:5.5)*u,dk,E,ew);
    for(let i=0;i<4;i++){const [lx,p]=legs[i],a=Math.sin(p)*sw;seg(g,[[lx*u,-34*u],[lx*u+Math.sin(a)*30*u,-2*u]],lw,i%2?dk:col,E,ew);}
    g.beginPath();g.ellipse(0,-42*u,40*u,13*u,0,0,2*PI);if(E){g.strokeStyle=E;g.lineWidth=2*ew;g.stroke();}g.fillStyle=col;g.fill();
    head(42*u,-60*u+Math.abs(Math.sin(ph))*1.5*u,(cat?12:12.5)*u,0);}
  g.restore();}
const dog=(g,x,y,o)=>animal(g,x,y,Object.assign({},o,{kind:"dog"})),cat=(g,x,y,o)=>animal(g,x,y,Object.assign({},o,{kind:"cat"}));
// bird(g,x,y,{s,col,t,flip}): чайка/птица в полёте (машет крыльями); birds(g,lt,{n,cx,cy,rx,ry,s,col,seed}): стая кружит по эллипсу
function bird(g,x,y,o){o=o||{};const s=o.s||40,f=Math.sin((o.t||0)*9)*0.5;g.strokeStyle=o.col||(THEME==="paper"?C.ink:C.cream);g.lineWidth=Math.max(2,s*0.11);g.lineCap="round";g.lineJoin="round";
  g.beginPath();g.moveTo(x-s,y-s*0.15-f*s*0.6);g.quadraticCurveTo(x-s*0.45,y-s*0.55-f*s*0.4,x,y);g.quadraticCurveTo(x+s*0.45,y-s*0.55-f*s*0.4,x+s,y-s*0.15-f*s*0.6);g.stroke();}
function birds(g,lt,o){o=o||{};const n=o.n||6;for(let i=0;i<n;i++){const ph=hash(i*4.1+(o.seed||0))*6.28,sp=0.5+hash(i*2.3)*0.4,a=lt*sp+ph;
  bird(g,(o.cx||540)+Math.cos(a)*(o.rx||300)*(0.6+hash(i)*0.4),(o.cy||500)+Math.sin(a)*(o.ry||90)*(0.6+hash(i*7)*0.4),{s:(o.s||36)*(0.7+hash(i*9)*0.5),t:lt+i*0.3,col:o.col});}}

// sun(g,x,y,r,{col,rays,lt,horizon}): плоский диск солнца (цвет из текста: C.pink, C.yellow, C.orange), rays лучи-штрихи, horizon обрезает ниже y
function sun(g,x,y,r,o){o=o||{};const c=o.col||C.yellow;g.save();if(o.horizon!=null){g.beginPath();g.rect(0,0,W,o.horizon);g.clip();}
  if(o.rays){g.strokeStyle=c;g.lineWidth=Math.max(3,r*0.05);g.beginPath();const n=o.rays,a0=(o.lt||0)*0.15;for(let i=0;i<n;i++){const a=a0+i*2*PI/n;g.moveTo(x+Math.cos(a)*r*1.18,y+Math.sin(a)*r*1.18);g.lineTo(x+Math.cos(a)*r*1.45,y+Math.sin(a)*r*1.45);}g.stroke();}
  disc(g,x,y,r,c,null,0);g.fillStyle=shade(c,0.08);g.beginPath();g.arc(x,y,r,0.1,PI-0.1);g.fill();g.restore();}
// moon(g,x,y,r,{col,phase}): месяц (phase 0..1 толщина, 1 полная луна)
function moon(g,x,y,r,o){o=o||{};const ph=o.phase==null?0.45:o.phase;g.fillStyle=o.col||C.cream;g.save();g.beginPath();g.arc(x,y,r,0,2*PI);g.clip();
  g.beginPath();g.rect(x-r-2,y-r-2,2*r+4,2*r+4);if(ph<1)g.arc(x+r*2*ph,y-r*0.2*ph,r*1.02,0,2*PI);g.fill("evenodd");g.restore();}
// stars(g,lt,{x0,x1,y0,y1,n,col,p (0..1 сколько зажглось),seed}): звёзды-крестики и точки, мерцают
function stars(g,lt,o){o=o||{};const n=o.n||50,p=o.p==null?1:o.p,r=rng(o.seed||21);g.fillStyle=o.col||C.cream;g.beginPath();
  for(let i=0;i<n;i++){const x=lerp(o.x0||60,o.x1||1020,r()),y=lerp(o.y0||80,o.y1||900,r()),sz=2+r()*5,ph=r()*6.28;if(i>=n*p)continue;const k=0.6+0.4*Math.sin(lt*2+ph);
    if(sz>5){const a=sz*k;g.moveTo(x,y-a);g.lineTo(x+a*0.25,y-a*0.25);g.lineTo(x+a,y);g.lineTo(x+a*0.25,y+a*0.25);g.lineTo(x,y+a);g.lineTo(x-a*0.25,y+a*0.25);g.lineTo(x-a,y);g.lineTo(x-a*0.25,y-a*0.25);g.closePath();}
    else{g.rect(x-1.3,y-1.3,2.6*k+0.6,2.6*k+0.6);}}g.fill();}
// cloud(g,x,y,{s,col}): плоское облако (x центр, y низ)
function cloud(g,x,y,o){o=o||{};const s=o.s||1;g.fillStyle=o.col||(THEME==="paper"?"#F6F2EC":"#2A2A34");g.beginPath();
  for(const [cx,cy,r] of [[-60,-30,42],[-10,-52,58],[48,-34,44],[85,-20,28]]){g.moveTo(x+(cx+r)*s,y+cy*s);g.arc(x+cx*s,y+cy*s,r*s,0,2*PI);}g.rect(x-100*s,y-26*s,212*s,26*s);g.fill();}
// sea(g,lt,{y0,y1,fill,col,n}): море от горизонта y0 до y1: заливка fill и волны-штрихи col, гуще к горизонту
function sea(g,lt,o){o=o||{};const y0=o.y0||1100,y1=o.y1||1700;if(o.fill){g.fillStyle=o.fill;g.fillRect(0,y0,W,y1-y0);}g.fillStyle=o.col||(THEME==="paper"?"rgba(11,10,16,0.45)":"rgba(238,229,218,0.45)");
  const n=o.n||14;for(let i=0;i<n;i++){const u=i/(n-1),y=y0+(y1-y0)*Math.pow(u,1.6),th=1+u*3,sh=(lt*(20+u*40)+i*97)%240;for(let x=-240+sh;x<W;x+=240)g.fillRect(x,y,150-u*30,th);}}
// hill(g,x0,x1,y,{h,col}): холм (дуга) от x0 до x1 с основанием на y
function hill(g,x0,x1,y,o){o=o||{};g.fillStyle=o.col||C.leaf;g.beginPath();g.moveTo(x0,y);g.quadraticCurveTo((x0+x1)/2,y-(o.h||200)*2,x1,y);g.closePath();g.fill();}

// lamp(g,x,y,{h,col,on (0..1),light}): уличный фонарь; on зажигает свет со свечением
function lamp(g,x,y,o){o=o||{};const h=o.h||420,c=o.col||(THEME==="paper"?"#2B2A31":"#6E6A72"),on=o.on||0,lc=o.light||C.hl;g.fillStyle=c;g.fillRect(x-5,y-h,10,h);g.fillRect(x-14,y-14,28,14);
  g.fillRect(x-5,y-h,34,7);if(on>0.01)glow(g,x+30,y-h+36,h*0.32,0.55*on,"rgba(234,201,132,1)");poly(g,[[x+18,y-h+8],[x+42,y-h+8],[x+46,y-h+44],[x+14,y-h+44]],on>0.01?mix(shade(lc,0.6),lc,on):"#3A3942",null,0);
  g.fillStyle=c;g.fillRect(x+12,y-h+44,36,6);}
// garland(g,x0,y0,x1,y1,{n,sag,cols,on (0..1 загораются слева направо),lt}): гирлянда-фонарики на проводе
function garland(g,x0,y0,x1,y1,o){o=o||{};const n=o.n||12,sag=o.sag==null?70:o.sag,cols=o.cols||[C.red,C.gold,C.blue,C.green],on=o.on==null?1:o.on,mx=(x0+x1)/2,my=(y0+y1)/2+sag*2;
  g.strokeStyle=THEME==="paper"?"#2B2A31":"#6E6A72";g.lineWidth=2;g.beginPath();g.moveTo(x0,y0);g.quadraticCurveTo(mx,my,x1,y1);g.stroke();
  for(let i=0;i<n;i++){const u=(i+0.5)/n,x=(1-u)*(1-u)*x0+2*u*(1-u)*mx+u*u*x1,y=(1-u)*(1-u)*y0+2*u*(1-u)*my+u*u*y1+10,lit=on*n>i,c=cols[i%cols.length];
    const fl=lit?0.85+0.15*Math.sin((o.lt||0)*5+i*1.7):0;if(lit)glow(g,x,y+8,34,0.35*fl,"rgba(234,201,132,1)");g.fillStyle=lit?c:shade(c,0.55);g.beginPath();g.ellipse(x,y+10,9,12,0,0,2*PI);g.fill();g.fillStyle="#2B2A31";g.fillRect(x-4,y-4,8,5);}}
// board(g,x,y,{w,h,title,lines:[...],col,frame,text,size,lt,t0,step,legs}): меловая доска (x,y левый верх), строки пишутся по буквам с t0
function board(g,x,y,o){o=o||{};const w=o.w||560,h=o.h||380,lt=o.lt==null?99:o.lt,t0=o.t0||0,step=o.step==null?0.045:o.step,size=o.size||44;
  if(o.legs!==false){g.fillStyle=o.frame||"#6B4A2E";g.save();g.translate(x+w*0.2,y+h);g.rotate(0.12);g.fillRect(-7,-20,14,h*0.55);g.restore();g.save();g.translate(x+w*0.8,y+h);g.rotate(-0.12);g.fillRect(-7,-20,14,h*0.55);g.restore();}
  g.fillStyle=o.frame||"#6B4A2E";g.fillRect(x-14,y-14,w+28,h+28);g.fillStyle=o.col||"#24302A";g.fillRect(x,y,w,h);
  g.font=fSerif(size,1);g.fillStyle=o.text||C.cream;let k=0;const rows=(o.title?[o.title]:[]).concat(o.lines||[]),lh=size*1.35,ty=y+(h-lh*rows.length)/2+size*0.95;
  rows.forEach((s,i)=>{const n=Math.floor(clamp((lt-t0)/step-k,0,s.length));k+=s.length+4;if(n<=0)return;const sz=i===0&&o.title?size*1.1:size;g.font=fSerif(sz,1);
    const ww=tw(g,fSerif(sz,1),s),sc=Math.min(1,(w-50)/ww);g.save();g.translate(x+w/2-ww*sc/2,ty+i*lh);g.scale(sc,1);g.fillText(s.slice(0,n),0,0);g.restore();});}

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
  outlineNum,timeline,bars,crane,venn,chess,columns,
  person,crowd,building,sign,tree,grass,leaves,car,bus,bike,boat,towerCrane,animal,dog,cat,bird,birds,sun,moon,stars,cloud,sea,hill,lamp,garland,board,shade,iris,stairs,FX,glitchAmt,withGlitch,camera,camEnd,cutsFromSubs,scene,cutSounds};
})();
