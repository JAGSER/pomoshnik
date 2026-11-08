// lib.js: стиль «Премиум-техно». Графитовый фон с зерном и сеткой, янтарь-розовый-фиолет,
// моно-подписи интерфейса, искра-герой со свечением, склейки со вспышкой и отскоком камеры.
const TECH = (() => {
const W=1080,H=1920,CX=540,CY=960,X0=60,X1=1020,TAU=Math.PI*2;
const F={sans:'"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif',
  serif:'"DejaVu Serif",Georgia,"Noto Serif","Times New Roman",serif',
  mono:'"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace'};
const C={bg0:'#14151B',bg1:'#090A0D',ink:'#F3F1EE',mut:'#8C909B',dim:'#3A3E48',card:'#15171D',edge:'#2C3039',
  a:'#FFB23F',b:'#FF4D7E',c:'#8A6BFF',ok:'#3DDC97',okBg:'#10241C',hot:'#FFF6E8',wire:'#4A4F5C'};
const ACC=['a','b','c'];
let BG=null,GRID=null;const GL={};

// ---------- время, изинги, пружины
function clamp(x,a=0,b=1){return x<a?a:x>b?b:x;}
function prog(t,a,b){if(b<=a)return t>=b?1:0;return clamp((t-a)/(b-a));}
function lerp(a,b,p){return a+(b-a)*p;}
function eo(p){p=clamp(p);return 1-(1-p)*(1-p)*(1-p);}
function ei(p){p=clamp(p);return p*p*p;}
function eio(p){p=clamp(p);return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;}
function back(p,s=1.6){p=clamp(p);const c=s+1;return 1+c*Math.pow(p-1,3)+s*Math.pow(p-1,2);}
function spring(p){if(p<=0)return 0;if(p>=1.4)return 1;return 1-Math.exp(-5*p)*Math.cos(9*p);}
function bump(t,a,b){return Math.sin(prog(t,a,b)*Math.PI);}
function vis(t,t0,t1,din=.3){return eo(prog(t,t0,t0+din))*(t1==null?1:1-eo(prog(t,t1-din/1.4,t1)));}
function exitK(l,len,d=.25){return eo(prog(l,len-d,len));}
function stagger(t,t0,i,step=.08,dur=.4,f=spring){return f(prog(t,t0+i*step,t0+i*step+dur));}
function blink(t,hz=1.5){return Math.floor(t*hz*2)%2===0;}
function travel(keys,t){
  if(t<=keys[0][0])return[keys[0][1],keys[0][2]];
  for(let i=0;i<keys.length-1;i++){const A=keys[i],B=keys[i+1];
    if(t<B[0]){const p=eo(prog(t,A[0],B[0]));return[lerp(A[1],B[1],p),lerp(A[2],B[2],p)];}}
  const L=keys[keys.length-1];return[L[1],L[2]];
}
function rng(seed){let s=seed|0;return function(){s=s+0x6D2B79F5|0;let x=Math.imul(s^s>>>15,1|s);
  x=x+Math.imul(x^x>>>7,61|x)^x;return((x^x>>>14)>>>0)/4294967296;};}

// ---------- текст
function col(c){return C[c]||c;}
function font(g,wt,size,fam){g.font=wt+' '+Math.round(size)+'px '+(F[fam||'sans']||fam);}
function fitSize(g,s,wt,size,maxW,fam){let fs=size;
  for(let i=0;i<5;i++){font(g,wt,fs,fam);const w=g.measureText(s).width;if(w<=maxW||fs<=14)break;
    fs=Math.max(14,Math.floor(fs*maxW/w*0.98));}
  font(g,wt,fs,fam);return fs;}
function leftX(x,w,align){const l=align==='center'?x-w/2:align==='right'?x-w:x;if(w>=X1-X0)return X0;return clamp(l,X0,X1-w);}
function text(g,s,x,y,o={}){s=String(s);const wt=o.weight||600,fam=o.fam||'sans';
  const fs=fitSize(g,s,wt,o.size||46,Math.min(o.maxW||960,X1-X0),fam);
  const w=g.measureText(s).width,l=leftX(x,w,o.align||'left'),a0=g.globalAlpha;
  if(o.a!=null){if(o.a<=0)return{w,fs,x:l};g.globalAlpha=a0*clamp(o.a);}
  g.textAlign='left';g.fillStyle=col(o.color||'ink');g.fillText(s,l,y);g.globalAlpha=a0;return{w,fs,x:l};}
function layout(g,words,size,wt,fam,maxW,maxLines=2){let fs=size,R=null;
  for(let it=0;it<16;it++){font(g,wt,fs,fam);const sw=g.measureText(' ').width,ww=words.map(w=>g.measureText(w).width);
    const L=[[]];let cw=0;
    ww.forEach((w,i)=>{const l=L[L.length-1],add=(l.length?sw:0)+w;if(l.length&&cw+add>maxW){L.push([i]);cw=w;}else{l.push(i);cw+=add;}});
    for(let k=L.length-1;k>0;k--)if(L[k].length===1&&L[k-1].length>2)L[k].unshift(L[k-1].pop());
    const lw=L.map(l=>l.reduce((s,i,j)=>s+ww[i]+(j?sw:0),0));R={fs,lines:L,lw,sw,ww};
    if((Math.max(...lw)<=maxW&&L.length<=maxLines)||fs<=30)break;fs=Math.floor(fs*0.94);}
  font(g,wt,R.fs,fam);return R;}
// заголовок по словам: появление снизу без перелёта, ключевые слова янтарём, подгонка ширины
function title(g,words,o={}){if(typeof words==='string')words=words.split(/\s+/).filter(Boolean);
  const t=o.t,t0=o.t0||0,fam=o.fam||'sans',wt=o.weight||800,align=o.align||'center';
  const x=o.x!=null?clamp(o.x,X0,X1-200):(align==='center'?CX:110);
  const room=align==='center'?2*Math.min(x-X0,X1-x):X1-x;
  const L=layout(g,words,o.size||116,wt,fam,Math.min(o.maxW||860,room),o.lines||2);
  const acc=[].concat(o.acc==null?[]:o.acc),step=o.step==null?.09:o.step,dur=o.dur||.27,rise=o.rise==null?34:o.rise;
  const out=o.tout?1-prog(t,o.tout-.18,o.tout):1,lh=L.fs*(o.lh||1.1),y=o.y==null?300:o.y,a0=g.globalAlpha;
  g.textAlign='left';
  L.lines.forEach((ln,li)=>{let lx=align==='center'?x-L.lw[li]/2:x;
    ln.forEach((i,j)=>{if(j)lx+=L.sw;const p=eo(prog(t,t0+i*step,t0+i*step+dur));
      if(p>0&&out>0){const s=o.disp&&o.disp[i]!=null?String(o.disp[i]):words[i],dx=L.ww[i]-g.measureText(s).width;
        g.globalAlpha=a0*p*out;g.fillStyle=acc.includes(i)?col(o.accColor||'a'):col(o.color||'ink');
        g.fillText(s,lx+dx,y+L.fs*.85+li*lh+(1-p)*rise);}
      lx+=L.ww[i];});});
  g.globalAlpha=a0;return{bottom:y+L.lines.length*lh,fs:L.fs,lines:L.lines.length};}
function subline(g,s,y,t,t0,t1,o={}){const a=eo(prog(t,t0,t0+.3))*(t1==null?1:1-prog(t,t1-.2,t1));if(a<=0)return;
  text(g,s,o.x||CX,y+(1-a)*20,{size:o.size||46,weight:500,color:o.color||'mut',align:o.align||'center',a,maxW:900});}
function label(g,s,x,y,o={}){return text(g,s,x,y,{size:o.size||30,weight:o.weight||500,fam:'mono',color:o.color||'mut',align:o.align||'left',a:o.a,maxW:o.maxW});}
function counter(g,v,x,y,o={}){return text(g,(o.pre||'')+Math.round(v)+(o.suf||''),x,y,{size:o.size||120,weight:o.weight||800,
  fam:o.fam||'sans',color:o.color||'ink',align:o.align||'center',a:o.a});}
function countTo(t,t0,t1,to,from=0){return Math.round(lerp(from,to,eo(prog(t,t0,t1))));}

// ---------- фон, фактуры, базовые формы
function init(){if(BG)return;
  BG=new OffscreenCanvas(W,H);let g=BG.getContext('2d');
  const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,C.bg0);gr.addColorStop(1,C.bg1);g.fillStyle=gr;g.fillRect(0,0,W,H);
  const r=rng(7);for(let i=0;i<9000;i++){g.fillStyle=r()<.5?'rgba(255,255,255,0.035)':'rgba(0,0,0,0.25)';g.fillRect(r()*W,r()*H,1.5,1.5);}
  const vg=g.createRadialGradient(540,900,300,540,900,1300);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.55)');
  g.fillStyle=vg;g.fillRect(0,0,W,H);
  GRID=new OffscreenCanvas(1200,2040);g=GRID.getContext('2d');g.strokeStyle='rgba(255,255,255,0.045)';g.lineWidth=1;
  for(let x=0;x<=1200;x+=60){g.beginPath();g.moveTo(x+.5,0);g.lineTo(x+.5,2040);g.stroke();}
  for(let y=0;y<=2040;y+=60){g.beginPath();g.moveTo(0,y+.5);g.lineTo(1200,y+.5);g.stroke();}
  for(const n of ['a','b','c','ok','hot']){const s=new OffscreenCanvas(256,256),q=s.getContext('2d'),rg=q.createRadialGradient(128,128,0,128,128,128);
    rg.addColorStop(0,C[n]);rg.addColorStop(.25,C[n]+'88');rg.addColorStop(1,C[n]+'00');q.fillStyle=rg;q.fillRect(0,0,256,256);GL[n]=s;}}
function bg(g,t,o={}){init();g.globalAlpha=1;g.globalCompositeOperation='source-over';g.textAlign='left';g.textBaseline='alphabetic';g.lineCap='butt';
  g.drawImage(BG,0,0);if(o.grid!==false)g.drawImage(GRID,-((t*6)%60)-60,-((t*14)%60)-60);
  const k=o.amb==null?1:o.amb;glow(g,'c',200+Math.sin(t*.4)*80,500,700,.16*k);glow(g,'b',900,1500+Math.cos(t*.3)*90,650,.12*k);}
function glow(g,n,x,y,r,a=1){init();if(a<=0||r<=0)return;const o=g.globalAlpha;g.globalAlpha=Math.min(1,a)*o;
  g.drawImage(GL[n]||GL.a,x-r,y-r,2*r,2*r);g.globalAlpha=o;}
function rr(g,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);
  g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function grad(g,x0,y0,x1,y1,keys=ACC){const gr=g.createLinearGradient(x0,y0,x1,y1);
  keys.forEach((k,i)=>gr.addColorStop(keys.length>1?i/(keys.length-1):0,col(k)));return gr;}
function card(g,x,y,w,h,o={}){rr(g,x,y,w,h,o.r==null?28:o.r);g.fillStyle=col(o.fill||'card');g.fill();
  if(o.dash){g.setLineDash(o.dash);g.lineDashOffset=o.dashOff||0;}
  g.strokeStyle=o.edge?(typeof o.edge==='string'?col(o.edge):o.edge):C.edge;g.lineWidth=o.lw||2;g.stroke();g.setLineDash([]);
  if(o.bar){g.fillStyle=col(o.bar);rr(g,x,y+30,8,Math.max(8,h-60),4);g.fill();}}
function popAt(g,x,y,a,fn){if(a<=0)return;g.save();g.translate(x,y);g.scale(Math.max(.01,a),Math.max(.01,a));
  g.globalAlpha*=clamp(a*1.5);fn(g);g.restore();}
function pill(g,s,x,y,o={}){const a=o.a==null?1:o.a;if(a<=0)return null;s=String(s);const wt=o.weight||700,fam=o.fam||'mono';
  const fs=fitSize(g,s,wt,o.size||64,o.maxW||820,fam),tw=g.measureText(s).width,w=Math.max(o.minW||0,tw+fs*1.1),h=fs*1.6;
  x=clamp(x,X0+w/2,X1-w/2);g.save();g.translate(x,y);g.scale(a,a);g.globalAlpha*=clamp(a*1.5);
  rr(g,-w/2,-h/2,w,h,h/2);g.fillStyle=C.card;g.fill();g.strokeStyle=o.grad===false?col(o.col||'a'):grad(g,-w/2,0,w/2,0);
  g.lineWidth=o.lw||4;g.stroke();g.fillStyle=col(o.color||'ink');g.textAlign='center';g.fillText(s,0,fs*.35);g.textAlign='left';g.restore();
  return{x,w,h};}
function chip(g,s,x,y,o={}){return pill(g,s,x,y,{size:o.size||40,weight:600,grad:false,lw:2.5,minW:150,col:o.col||'a',a:o.a,color:o.color,maxW:o.maxW||420});}

// ---------- герой «искра» и сети
function spark(g,x,y,s=1,c='a'){if(s<=0)return;glow(g,c,x,y,80*s,.85);g.fillStyle=C.hot;g.beginPath();g.arc(x,y,9*s,0,TAU);g.fill();}
function sparkPause(g,x,y,s=1){g.fillStyle='#C9CCD3';g.beginPath();g.arc(x,y,9*s,0,TAU);g.fill();
  g.fillRect(x-14*s,y-62*s,9*s,32*s);g.fillRect(x+5*s,y-62*s,9*s,32*s);}
function comet(g,x0,y0,x1,y1,q,o={}){if(q<=0)return;const n=o.n||6,arc=o.arc==null?140:o.arc,a0=g.globalAlpha;
  for(let j=n;j>=0;j--){const u=Math.max(0,q-j*.04),x=lerp(x0,x1,u),y=lerp(y0,y1,u)-Math.sin(u*Math.PI)*arc;
    if(j){g.globalAlpha=a0*.5*(1-j/(n+1));g.fillStyle=col(o.col||'a');g.beginPath();g.arc(x,y,Math.max(1,8-j),0,TAU);g.fill();g.globalAlpha=a0;}
    else spark(g,x,y,o.s||1,o.col||'a');}}
function ring(g,x,y,p,r0=60,r1=480,c='a',lw=3){if(p<=0||p>=1)return;const a0=g.globalAlpha;g.globalAlpha=a0*.6*(1-p);
  g.strokeStyle=col(c);g.lineWidth=lw;g.beginPath();g.arc(x,y,r0+(r1-r0)*eo(p),0,TAU);g.stroke();g.globalAlpha=a0;}
function network(g,cx,cy,t,t0,o={}){const n=o.n||16,R=rng(o.seed||11),conv=o.conv||0,pts=[];
  for(let i=0;i<n;i++){const an=i/n*TAU+R()*.3+t*(o.spin==null?.12:o.spin),rd=(o.r0||190)+R()*(o.r1||190),
    e=eo(prog(t,t0+i*.02,t0+.4+i*.02))*(1-.8*conv);
    pts.push([cx+Math.cos(an)*rd*e,cy+Math.sin(an)*rd*e*(o.sq||.85),5+R()*7,ACC[i%3]]);}
  g.lineWidth=2;pts.forEach((p,i)=>{const q=pts[(i+1)%n];g.strokeStyle='rgba(255,178,63,0.28)';g.beginPath();g.moveTo(cx,cy);g.lineTo(p[0],p[1]);g.stroke();
    g.strokeStyle='rgba(138,107,255,0.22)';g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);g.stroke();});
  pts.forEach(p=>{g.fillStyle=C[p[3]];g.beginPath();g.arc(p[0],p[1],p[2],0,TAU);g.fill();});return pts;}
function hub(g,cx,cy,labels,t,t0,o={}){const N=Array.isArray(labels)?labels.length:(o.n||6),l=t-t0,ex=o.ex||0,a0=g.globalAlpha;
  for(let i=0;i<N;i++){const an=i/N*TAU-1.571+l*(o.spin==null?.22:o.spin),a=spring(prog(l,.12+i*.04,.6+i*.04))*(1+.4*ex);if(a<=0)continue;
    const x=cx+Math.cos(an)*(o.rx||360)*a,y=cy+Math.sin(an)*(o.ry||300)*a,k=ACC[i%3],al=clamp(a)*(1-ex);
    g.globalAlpha=a0*al*.45;g.strokeStyle=C[k];g.lineWidth=2;g.beginPath();g.moveTo(cx,cy);g.lineTo(x,y);g.stroke();
    g.globalAlpha=a0*al;const u=(l*1.4+i/N)%1;g.fillStyle=C[k];g.beginPath();g.arc(lerp(x,cx,u),lerp(y,cy,u),5,0,TAU);g.fill();
    g.globalAlpha=a0*(1-ex);chip(g,typeof labels==='function'?labels(i,l):labels[i],x,y,{col:k,a:Math.min(a,1.15)});}
  g.globalAlpha=a0;}
function orbitDots(g,cx,cy,rx,ry,n,t,o={}){const a0=g.globalAlpha;g.globalAlpha=a0*(o.a==null?1:o.a);g.fillStyle=col(o.col||'a');
  for(let j=0;j<n;j++){const an=t*(o.speed||3)+j*TAU/n;g.beginPath();g.arc(cx+Math.cos(an)*rx,cy+Math.sin(an)*ry,o.r||6,0,TAU);g.fill();}
  g.globalAlpha=a0;}
function converge(g,cx,cy,t,t0,o={}){const l=t-t0,n=o.n||14,fa=1-prog(l,.6,.9);if(fa<=0)return;const a0=g.globalAlpha;
  for(let i=0;i<n;i++){const an=i/n*TAU+.2,sx=cx+Math.cos(an)*(o.rx||760),sy=cy+Math.sin(an)*(o.ry||1050),
    q=eo(prog(l,i*.02,.6+i*.02)),b=Math.max(0,q-.35),c=C[ACC[i%3]];
    g.globalAlpha=a0*.7*fa;g.strokeStyle=c;g.lineWidth=3;g.beginPath();g.moveTo(lerp(sx,cx,b),lerp(sy,cy,b));g.lineTo(lerp(sx,cx,q),lerp(sy,cy,q));g.stroke();
    g.fillStyle=c;g.beginPath();g.arc(lerp(sx,cx,q),lerp(sy,cy,q),6,0,TAU);g.fill();}
  g.globalAlpha=a0;}
function emblem(g,x,y,r,a){if(a<=0)return;g.save();g.translate(x,y);g.rotate((1-a)*-2.2);g.lineCap='round';g.lineWidth=r*.19;
  ACC.forEach((n,j)=>{g.strokeStyle=C[n];const s0=j*2.094-1.571+.25;g.beginPath();g.arc(0,0,r*Math.max(.01,a),s0,s0+1.594);g.stroke();});g.restore();}

// ---------- линии и потоки
function bez(a,b,c,d,u){const v=1-u;return[v*v*v*a[0]+3*v*v*u*b[0]+3*v*u*u*c[0]+u*u*u*d[0],v*v*v*a[1]+3*v*v*u*b[1]+3*v*u*u*c[1]+u*u*u*d[1]];}
function curve(g,a,b,c,d,f,c0,w=3){if(f<=0)return;g.lineCap='round';g.strokeStyle=col(c0);g.lineWidth=w;g.beginPath();g.moveTo(a[0],a[1]);
  for(let i=1;i<=20;i++){const p=bez(a,b,c,d,f*i/20);g.lineTo(p[0],p[1]);}g.stroke();}
function flowDot(g,a,b,c,d,u,c0='a',r=5){const p=bez(a,b,c,d,((u%1)+1)%1);g.fillStyle=col(c0);g.beginPath();g.arc(p[0],p[1],r,0,TAU);g.fill();}
function gradLine(g,x0,y0,x1,y1,f,w=6){if(f<=0)return;g.lineCap='round';g.strokeStyle=grad(g,x0,y0,x1,y1);g.lineWidth=w;
  g.beginPath();g.moveTo(x0,y0);g.lineTo(lerp(x0,x1,f),lerp(y0,y1,f));g.stroke();}
function spine(g,x,y0,y1,yh,l,a=1){if(a<=0)return;const a0=g.globalAlpha;g.globalAlpha=a0*a;g.lineCap='round';
  g.strokeStyle=grad(g,0,y0,0,y1);g.lineWidth=6;g.beginPath();g.moveTo(x,y0);g.lineTo(x,yh);g.stroke();
  g.globalAlpha=a0*a*.7;g.fillStyle='#fff';for(let j=0;j<8;j++){g.beginPath();g.arc(x,y0+((l*420+j*110)%Math.max(1,yh-y0)),4,0,TAU);g.fill();}
  g.globalAlpha=a0;}
function streamBar(g,x0,x1,y,P,o={}){const hx=lerp(x0,x1,clamp(P)),gap=o.gap||0;g.lineCap='round';
  g.strokeStyle=o.broken?C.mut:col(o.col||'a');g.lineWidth=6;g.beginPath();g.moveTo(x0,y);g.lineTo(hx,y);g.stroke();
  g.setLineDash([4,14]);g.strokeStyle=C.wire;g.beginPath();g.moveTo(Math.min(x1,hx+16+gap),y);g.lineTo(x1,y);g.stroke();g.setLineDash([]);
  if(gap>2){g.fillStyle=C.b;g.fillRect(hx+14,y-14,4,28);g.fillRect(hx+14+gap,y-14,4,28);}return hx;}

// ---------- интерфейсные предметы
function inputBar(g,x,y,w,ph,t,t0,o={}){const a=spring(prog(t,t0,t0+.4)),fo=o.out!=null?1-eo(prog(t,o.out-.25,o.out)):1;
  w=Math.min(w,X1-X0);x=clamp(x,X0,X1-w);const h=140,sx=x+w-74,sy=y+70,press=o.press==null?t0+.7:o.press;
  if(a<=0||fo<=0)return{sx,sy};g.save();g.globalAlpha*=clamp(a)*fo;const s=.92+.08*a;
  g.translate(x+w/2,y+70);g.scale(s,s);g.translate(-x-w/2,-y-70);card(g,x,y,w,h,{r:40});
  font(g,700,54,'mono');g.fillStyle=C.a;g.fillText('›',x+42,y+88);
  if(t<press&&blink(t,1.65)){g.fillStyle=C.ink;g.fillRect(x+98,y+42,5,58);}
  fitSize(g,ph,400,44,w-260,'mono');g.fillStyle=C.mut;g.fillText(ph,x+122,y+86);
  const bp=1-.18*bump(t,press-.02,press+.16);g.fillStyle=C.a;g.beginPath();g.arc(sx,sy,44*bp,0,TAU);g.fill();
  g.strokeStyle=C.bg0;g.lineWidth=6;g.lineCap='round';g.beginPath();g.moveTo(sx,sy+20);g.lineTo(sx,sy-20);
  g.moveTo(sx-18,sy-4);g.lineTo(sx,sy-20);g.lineTo(sx+18,sy-4);g.stroke();g.restore();return{sx,sy};}
function typeLine(g,s,x,y,p,o={}){x=clamp(x,X0,X1-200);const fs=fitSize(g,s,o.weight||500,o.size||46,X1-40-x,'mono'),
  n=Math.floor(clamp(p)*s.length),part=s.slice(0,n);g.textAlign='left';g.fillStyle=col(o.color||'ink');g.fillText(part,x,y);
  if(o.cursor!==false&&(p<1||blink(o.lt||0,1.5))){const w=g.measureText(part).width;g.fillStyle=col(o.cur||'a');g.fillRect(x+w+4,y-fs*.82,fs*.48,fs);}}
function wave(g,x,y,w,q,lt,c='b',h=70){g.fillStyle=col(c);const n=Math.floor(w/15.5);
  for(let j=0;j<n;j++){if(j>q*n)break;const bh=14+h*Math.abs(Math.sin(j*.55+lt*7))*(.45+.55*Math.abs(Math.sin(j*.21)));g.fillRect(x+j*15.5,y-bh/2,8,bh);}}
function timeline(g,x,y,w,q,lt){const f=w/680,Wd=[120,90,160,110,140],cs=[C.a,C.b,C.c,C.ok,C.a];g.fillStyle=C.dim;
  for(let j=0;j<Math.floor(w/20);j++)g.fillRect(x+j*20,y,2,j%5?8:14);let xx=x;
  for(let j=0;j<5;j++){const ww=Wd[j]*f*clamp(q*5-j);if(ww>0){g.fillStyle=cs[j];rr(g,xx,y+28,Math.max(8,ww-8),50,10);g.fill();}xx+=(Wd[j]+10)*f;}
  if(q>.3){const ph=x+w*((lt*.5)%1);g.fillStyle='#fff';g.fillRect(ph-2,y-6,4,96);g.beginPath();g.moveTo(ph-10,y-12);g.lineTo(ph+10,y-12);g.lineTo(ph,y);g.fill();}}
function tiles(g,x,y,w,h,q,n=3){const gap=20,tw=(w-gap*(n-1))/n,cs=[C.b,C.c,C.a];
  for(let k=0;k<n;k++){const fx=x+k*(tw+gap),rv=eo(clamp(q*1.6-k*.3));if(rv<=0)continue;g.save();rr(g,fx,y,tw,h,14);g.clip();
    const sk=g.createLinearGradient(0,y,0,y+h);sk.addColorStop(0,'#2A1F5C');sk.addColorStop(1,cs[k%3]);g.fillStyle=sk;g.fillRect(fx,y,tw,h);
    g.fillStyle=C.a;g.beginPath();g.arc(fx+tw*(.27+.2*(k%3)),y+h*.41,h*.2,0,TAU);g.fill();
    g.fillStyle='#1A1530';g.beginPath();g.moveTo(fx,y+h);g.lineTo(fx+tw*.27,y+h*.5);g.lineTo(fx+tw*.5,y+h*.79);g.lineTo(fx+tw*.73,y+h*.41);g.lineTo(fx+tw,y+h);g.fill();
    g.fillStyle=C.card;g.fillRect(fx,y+h*rv,tw,h);g.restore();if(rv<1){g.fillStyle='#fff';g.fillRect(fx,y-2+h*rv,tw,3);}}}
function rowCard(g,x,y,w,h,o={}){card(g,x,y,w,h,{bar:o.col||'a'});if(o.label)label(g,o.label,x+w-30,y+50,{align:'right',maxW:w/2});}
function ghost(g,x,y,w,h,s,a=.6){if(a<=0)return;const a0=g.globalAlpha;g.globalAlpha=a0*a;card(g,x,y,w,h,{fill:'rgba(0,0,0,0)',dash:[10,10]});
  if(s)label(g,s,x+w-30,y+50,{align:'right',color:'dim',maxW:w/2});g.globalAlpha=a0;}
function agentHex(g,x,y,r,c,open=true){g.strokeStyle=col(c);g.lineWidth=3;g.beginPath();
  for(let v=0;v<6;v++){const an=v*1.047+.524;g.lineTo(x+Math.cos(an)*r,y+Math.sin(an)*r);}g.closePath();g.stroke();
  const eh=r*.36*(open?1:.3);g.fillStyle=col(c);g.fillRect(x-r*.36,y-eh/2,r*.23,eh);g.fillRect(x+r*.18,y-eh/2,r*.23,eh);}
function checkMark(g,x,y,s,p,c='ok',lw=6){if(p<=0)return;g.strokeStyle=col(c);g.lineWidth=lw;g.lineCap='round';g.beginPath();
  g.moveTo(x-.45*s,y+.05*s);const p1=clamp(p*2.5),p2=clamp((p-.4)/.6);g.lineTo(x+lerp(-.45,-.15,p1)*s,y+lerp(.05,.4,p1)*s);
  if(p2>0)g.lineTo(x+lerp(-.15,.5,p2)*s,y+lerp(.4,-.45,p2)*s);g.stroke();}
function checkRow(g,x,y,state,c,bw,l=0){if(state==='done')checkMark(g,x,y,32,1,'ok',5);
  else{g.fillStyle=state==='cur'?col(c):C.dim;g.beginPath();g.arc(x,y,state==='cur'?8+2*Math.sin(l*12):7,0,TAU);g.fill();}
  g.fillStyle=state==='done'?C.wire:(state==='cur'?'#6B7080':C.dim);rr(g,x+32,y-9,bw,18,9);g.fill();}
function progress(g,x,y,w,p,c='a',h=10){rr(g,x,y,w,h,h/2);g.fillStyle=C.dim;g.fill();if(p>0){rr(g,x,y,Math.max(h,w*clamp(p)),h,h/2);g.fillStyle=col(c);g.fill();}}
function sandbox(g,x,y,o={}){const w=o.w||260,h=o.h||250,c=o.col||'a',l=o.l||0,pg=o.pg||0,n=o.rows||3;x=clamp(x,X0+w/2,X1-w/2);
  popAt(g,x,y,o.a==null?1:o.a,g=>{card(g,-w/2,-h/2,w,h,{r:24,edge:c,lw:3,dash:[12,9],dashOff:-l*30});
    if(o.title){fitSize(g,o.title,600,30,w-110,'mono');g.fillStyle=C.mut;g.fillText(o.title,-w/2+24,-h/2+50);}
    agentHex(g,w/2-42,-h/2+38,22,c,Math.floor(l*2+(o.seed||0))%4!==0);
    for(let s=0;s<n;s++){const d=pg>(s+1)/(n+.3),cur=!d&&pg>s/(n+.3);
      checkRow(g,-w/2+36,-h/2+105+s*48,d?'done':cur?'cur':'todo',c,(w-104)*[1,.73,.87][s%3],l);}
    progress(g,-w/2+24,h/2-29,w-48,pg,c);});}
function status(g,s,xr,y,c='ok'){font(g,600,30,'mono');const sw=g.measureText(s).width;xr=clamp(xr,X0+sw+34,X1);
  g.fillStyle=col(c);g.beginPath();g.arc(xr-sw-24,y-10,8,0,TAU);g.fill();g.fillText(s,xr-sw,y);}
function stamp(g,s,x,y,a,o={}){if(a<=0)return;fitSize(g,s,700,o.size||46,700,'mono');const tw=g.measureText(s).width,
  w=Math.min(940,Math.max(o.w||560,tw+230));x=clamp(x,X0+w/2,X1-w/2);g.save();g.translate(x,y);g.rotate((o.rot==null?-.05:o.rot)*clamp(a));
  const sc=1.25-.25*a;g.scale(sc,sc);g.globalAlpha*=clamp(a*2);rr(g,-w/2,-70,w,140,28);g.fillStyle=col(o.bg||'okBg');g.fill();
  g.strokeStyle=col(o.col||'ok');g.lineWidth=4;g.stroke();g.fillStyle=col(o.col||'ok');g.beginPath();g.arc(-w/2+80,0,40,0,TAU);g.fill();
  checkMark(g,-w/2+80,0,52,o.cp==null?clamp(a):o.cp,'#0B1A13',9);g.fillStyle=C.ink;g.fillText(s,-w/2+144,16);g.restore();}

// ---------- финал, сцены, камера, склейки
function brand(g,s,y,t,t0,o={}){const ws=String(s).split(/\s+/),fs=fitSize(g,s,o.weight||900,o.size||180,o.maxW||880,'sans'),
  w=g.measureText(s).width,sw=g.measureText(' ').width,x0=CX-w/2,gr=grad(g,x0,0,x0+w,0),a0=g.globalAlpha,st=o.step||.15;let x=x0;
  g.textAlign='left';ws.forEach((wd,i)=>{const p=eo(prog(t,t0+i*st,t0+i*st+.3));if(p>0){g.globalAlpha=a0*p;g.fillStyle=gr;g.fillText(wd,x,y+(1-p)*40);}
    x+=g.measureText(wd).width+sw;});g.globalAlpha=a0;return{w,fs};}
function credit(g,s,y,a){if(a<=0)return;const a0=g.globalAlpha;g.globalAlpha=a0*a;g.fillStyle=C.dim;g.fillRect(CX-40,y-70,80,2);
  g.globalAlpha=a0;text(g,s,CX,y+(1-a)*16,{size:36,weight:500,color:'mut',align:'center',a});}
function sceneAt(t,cuts){let i=0;while(i<cuts.length-2&&t>=cuts[i+1])i++;return{i,l:t-cuts[i],t0:cuts[i],t1:cuts[i+1],len:cuts[i+1]-cuts[i]};}
function camera(g,t,l,fn,o={}){const z=1+(o.kick==null?.05:o.kick)*(1-spring(l/.7))+(o.push==null?.01:o.push)*Math.min(l,3.5),
  d=o.drift==null?10:o.drift;g.save();g.translate(CX,CY);g.scale(z,z);g.rotate((o.rot==null?.004:o.rot)*Math.sin(t*.7));
  g.translate(-CX+Math.sin(t*.5)*d,-CY+Math.cos(t*.4)*d*.8);fn();g.restore();g.globalAlpha=1;}
function cutFlash(g,t,cuts,o={}){for(let c=1;c<cuts.length-1;c++){const f=1-prog(t,cuts[c],cuts[c]+(o.d||.22));
  if(t>=cuts[c]&&f>0){g.globalCompositeOperation='lighter';glow(g,o.col||'a',CX,CY,o.r||900,(o.a||.25)*f);g.globalCompositeOperation='source-over';}}}

return{W,H,CX,CY,X0,X1,F,C,ACC,clamp,prog,lerp,eo,ei,eio,back,spring,bump,vis,exitK,stagger,blink,travel,rng,
  col,font,fitSize,leftX,text,layout,title,subline,label,counter,countTo,init,bg,glow,rr,grad,card,popAt,pill,chip,
  spark,sparkPause,comet,ring,network,hub,orbitDots,converge,emblem,bez,curve,flowDot,gradLine,spine,streamBar,
  inputBar,typeLine,wave,timeline,tiles,rowCard,ghost,agentHex,checkMark,checkRow,progress,sandbox,status,stamp,
  brand,credit,sceneAt,camera,cutFlash};
})();