// lib.js: стиль «Социальный плакат». Красный, чёрный, бумага, лучи, растр, штампы.
const PLK = (() => {
const C={red:"#D7261E",ink:"#161412",paper:"#EFE6D2",ochre:"#E8B53A",dark:"#1E0C0A",white:"#FFFDF7",brown:"#4A3A33",black:"#000000"};
const F={sans:'"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif',
  serif:'"DejaVu Serif",Georgia,"Noto Serif","Times New Roman",serif',
  mono:'"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace'};
const PI=Math.PI,X0=60,X1=1020;
// ---------- математика и движение
const clamp=(x,a,b)=>x<a?a:x>b?b:x;
const lerp=(a,b,u)=>a+(b-a)*u;
const prog=(t,a,b)=>clamp((t-a)/(b-a),0,1);
const easeOut=x=>{x=clamp(x,0,1);return 1-Math.pow(1-x,3);};
const easeIn=x=>{x=clamp(x,0,1);return x*x*x;};
const easeInOut=x=>{x=clamp(x,0,1);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;};
const spring=x=>x<=0?0:1-Math.exp(-6*x)*Math.cos(10*x);
const springSoft=x=>x<=0?0:1-Math.exp(-5*x)*Math.cos(6*x);
const settle=(d,amp,f)=>d<0?0:amp*Math.exp(-4*d)*Math.cos((f||7)*d);
const stampScale=d=>Math.max(0.7,1+0.8*Math.exp(-7*d)*Math.cos(9*d));
function appear(lt,t0,dur){return easeOut(prog(lt,t0,t0+(dur||0.3)));}
function leave(lt,t1,dur){return 1-easeIn(prog(lt,t1,t1+(dur||0.22)));}
function countTo(lt,t0,t1,a,b){return Math.round(lerp(a,b,easeOut(prog(lt,t0,t1))));}
function parallax(lt,depth){return -lt*18*(depth||1);}
function rng(s){s=s>>>0;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function font(w,size,fam,it){return (it?"italic ":"")+w+" "+Math.round(size)+"px "+(fam||F.sans);}
function safeX(cx,w){return w>=X1-X0?540:clamp(cx,X0+w/2,X1-w/2);}
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
// ---------- текстуры (один раз в OffscreenCanvas)
const cache={};
function tex(key,w,h,fn){let c=cache[key];if(!c){c=new OffscreenCanvas(w,h);fn(c.getContext("2d"),w,h);cache[key]=c;}return c;}
function paperTex(){return tex("paper",540,960,pg=>{const r=rng(7);pg.fillStyle=C.paper;pg.fillRect(0,0,540,960);
  for(let i=0;i<9000;i++){pg.fillStyle=r()<0.55?"rgba(70,45,20,0.07)":"rgba(255,255,255,0.14)";pg.fillRect(r()*540,r()*960,1+r()*1.6,1+r()*1.6);}
  pg.strokeStyle="rgba(90,60,30,0.05)";pg.lineWidth=1;
  for(let i=0;i<60;i++){pg.beginPath();const x=r()*540,y=r()*960;pg.moveTo(x,y);pg.lineTo(x+r()*40-20,y+r()*40-20);pg.stroke();}});}
// ---------- фон
function paper(g){g.drawImage(paperTex(),0,0,1080,1920);}
function darkBg(g,col){g.fillStyle=col||C.dark;g.fillRect(-300,-300,1680,2520);}
function band(g,y,h,col){g.fillStyle=col||C.red;g.fillRect(-300,y,1680,h);}
function rays(g,x,y,rot,a,s,col){if(a<=0)return;col=col||C.red;
  const im=tex("ray"+col,1600,1600,rg=>{rg.fillStyle=col;rg.translate(800,800);
    for(let i=0;i<18;i++){const q=i/18*PI*2,b=q+PI/18;rg.beginPath();rg.moveTo(0,0);rg.lineTo(Math.cos(q)*1200,Math.sin(q)*1200);rg.lineTo(Math.cos(b)*1200,Math.sin(b)*1200);rg.fill();}});
  g.save();g.globalAlpha=a;g.translate(x,y);g.rotate(rot);g.scale(s||1,s||1);g.drawImage(im,-800,-800);g.restore();}
function halftone(g,y,a,col,up){if(a<=0)return;col=col||C.red;
  const im=tex("ht"+col,1200,700,hg=>{hg.fillStyle=col;for(let yy=0,row=0;yy<720;yy+=24,row++)for(let x=(row%2)*12;x<1220;x+=24){const r=11*(yy/700);if(r>0.6){hg.beginPath();hg.arc(x,yy,r,0,7);hg.fill();}}});
  g.save();g.globalAlpha=a;if(up){g.translate(0,y+700);g.scale(1,-1);g.drawImage(im,-60,0);}else g.drawImage(im,-60,y);g.restore();}
function ring(g,x,y,R,rot,col,a,lw){if(a<=0)return;g.save();g.globalAlpha=a;g.translate(x,y);g.rotate(rot);g.strokeStyle=col||C.ink;g.lineWidth=lw||6;g.beginPath();
  for(let i=0;i<36;i++){const q=i/36*PI*2,L=i%3?18:34;g.moveTo(Math.cos(q)*R,Math.sin(q)*R);g.lineTo(Math.cos(q)*(R+L),Math.sin(q)*(R+L));}g.stroke();g.restore();}
function disc(g,x,y,r,col){if(r<=0)return;g.fillStyle=col||C.red;g.beginPath();g.arc(x,y,r,0,7);g.fill();}
function searchlights(g,lt,o){o=o||{};const y=o.y||1700,sp=o.spread||440;g.fillStyle=o.col||"rgba(215,38,30,0.13)";
  for(const sd of[-1,1]){const bx=540+sd*sp,a=-PI/2+sd*0.35+0.3*Math.sin(lt*0.9+sd);g.beginPath();g.moveTo(bx,y);
    g.lineTo(bx+Math.cos(a-0.1)*1900,y+Math.sin(a-0.1)*1900);g.lineTo(bx+Math.cos(a+0.1)*1900,y+Math.sin(a+0.1)*1900);g.fill();}}
// ---------- текст: раскладка по словам, подгонка, без одиночных слов
const LC=new Map();
function norm(w){return String(w).toLowerCase().replace(/[.,:;!?«»"()…]/g,"");}
function layout(g,txt,o){
  const fam=o.fam||F.sans,wt=o.weight||900,it=!!o.italic,maxW=Math.min(o.maxW||900,X1-X0),maxL=o.maxLines||3,minS=o.minSize||44,acc=o.acc?norm(o.acc):"";
  const key=[txt,fam,wt,it,maxW,maxL,minS,acc,o.size,o.lh].join("\u0001");let L=LC.get(key);if(L)return L;
  const paras=String(txt).split("|").map(l=>l.trim().split(/\s+/).filter(Boolean)).filter(p=>p.length);
  let fs=o.size||120;
  for(let n=0;n<60;n++){const f=font(wt,fs,fam,it);g.font=f;
    const sw=g.measureText(" ").width,pad=acc?fs*0.18:0;
    const W=w=>g.measureText(w).width+(acc&&norm(w)===acc?pad*2:0);
    const lw=ws=>ws.reduce((s,w,j)=>s+W(w)+(j?sw:0),0);
    const lines=[];let ok=true;
    for(const ws of paras){const st=lines.length;let cur=[];
      for(const w of ws){if(W(w)>maxW)ok=false;if(cur.length&&lw(cur.concat(w))>maxW){lines.push(cur);cur=[w];}else cur.push(w);}
      lines.push(cur);const m=lines.length-1;
      if(m>st&&lines[m].length===1){const pv=lines[m-1];
        if(pv.length>=3&&lw([pv[pv.length-1]].concat(lines[m]))<=maxW)lines[m].unshift(pv.pop());else ok=false;}}
    if((ok&&lines.length<=maxL)||fs<=minS){L={fs,lines,lw:lines.map(lw),sw,pad,acc,font:f,lh:fs*(o.lh||1.08)};break;}
    fs=Math.max(minS,Math.floor(fs*0.93));}
  if(LC.size>400)LC.clear();LC.set(key,L);return L;}
function words(g,txt,o){
  const L=layout(g,txt,o),lt=o.lt==null?99:o.lt,t0=o.t0||0,step=o.step==null?0.13:o.step,dur=o.dur||0.3;
  const maxW=Math.min(o.maxW||900,X1-X0),bw0=Math.max(...L.lw),sc=bw0>maxW?maxW/bw0:1,bw=bw0*sc;
  const al=o.align||"center",x=o.x==null?540:o.x;
  let bx=al==="left"?x:al==="right"?x-bw:x-bw/2;bx=clamp(bx,X0,Math.max(X0,X1-bw));
  const out=o.out==null?1:leave(lt,o.out),col=o.col||C.ink,ab=o.accBg||C.red,ac=o.accCol||C.paper,fs=L.fs;
  g.save();g.translate(bx,o.y);g.scale(sc,sc);g.font=L.font;g.textAlign="left";g.textBaseline="alphabetic";
  let i=0;
  L.lines.forEach((ws,li)=>{let xx=al==="left"?0:al==="right"?bw0-L.lw[li]:(bw0-L.lw[li])/2;const by=li*L.lh;
    for(const w of ws){const A=L.acc&&norm(w)===L.acc,ww=g.measureText(w).width,a=t0+i*step,p=prog(lt,a,a+dur),e=easeOut(p);
      if(A)xx+=L.pad;
      if(p>0&&out>0){g.globalAlpha=p*out;const yy=by+(1-e)*fs*0.35;
        if(A){g.fillStyle=ab;g.fillRect(xx-L.pad*0.55,by-fs*0.82,(ww+L.pad*1.1)*e,fs);g.fillStyle=ac;}else g.fillStyle=col;
        g.fillText(w,xx,yy);}
      xx+=ww+L.sw+(A?L.pad:0);i++;}});
  g.restore();const n=L.lines.length;
  return {x:bx,w:bw,fs:fs*sc,top:o.y-fs*0.82*sc,bottom:o.y+((n-1)*L.lh+fs*0.22)*sc,lines:n,end:t0+Math.max(0,i-1)*step+dur};}
function title(g,txt,o){return words(g,txt,Object.assign({size:130,maxW:920,maxLines:3,minSize:90,weight:900},o));}
function hook(g,txt,o){return words(g,txt,Object.assign({size:170,maxW:920,maxLines:2,minSize:110,weight:900,step:0.1},o));}
function caption(g,txt,o){o=o||{};const r=words(g,txt,Object.assign({size:54,maxW:880,maxLines:2,minSize:44,weight:400,fam:F.serif,italic:true,step:0.08,col:C.ink},o));
  const lt=o.lt==null?99:o.lt,e=easeOut(prog(lt,r.end-0.15,r.end+0.25));
  if(e>0&&o.line!==false){g.globalAlpha=o.out==null?1:leave(lt,o.out);g.fillStyle=o.col||C.ink;g.fillRect(r.x+r.w*(1-e)/2,r.bottom+4,r.w*e,4);g.globalAlpha=1;}
  return r;}
function note(g,txt,o){return words(g,txt,Object.assign({size:46,maxW:880,maxLines:2,minSize:34,weight:700,fam:F.mono,step:0.06},o));}
function tag(g,txt,x,y,o){o=o||{};const lt=o.lt==null?99:o.lt,t0=o.t0||0,p=prog(lt,t0,t0+0.3);if(p<=0)return null;const e=easeOut(p);
  let fs=o.size||46;g.font=font(800,fs);let w=g.measureText(txt).width;const maxW=Math.min(o.maxW||900,X1-X0);
  if(w+fs*0.8>maxW){fs=Math.max(20,Math.floor(fs*maxW/(w+fs*0.8)));g.font=font(800,fs);w=g.measureText(txt).width;}
  const bw=w+fs*0.8,bh=fs*1.45;let bx=o.align==="left"?x:x-bw/2;bx=clamp(bx,X0,Math.max(X0,X1-bw));
  g.save();if(o.out!=null)g.globalAlpha=leave(lt,o.out);g.fillStyle=o.bg||C.red;g.fillRect(bx,y-bh/2,bw*e,bh);
  g.beginPath();g.rect(bx,y-bh/2,bw*e,bh);g.clip();g.fillStyle=o.col||C.paper;g.textBaseline="middle";g.textAlign="left";
  g.globalAlpha*=prog(lt,t0+0.1,t0+0.3);g.fillText(txt,bx+fs*0.4,y+fs*0.04);g.restore();return {x:bx,w:bw,h:bh};}
function counter(g,v,x,y,o){o=o||{};const lt=o.lt==null?99:o.lt,t0=o.t0||0,p=easeOut(prog(lt,t0,t0+0.3));if(p<=0)return;
  const col=o.col||C.ink,maxW=Math.min(o.maxW||900,X1-X0),txt=Math.round(v)+(o.suffix||"");
  g.save();g.globalAlpha=p*(o.out==null?1:leave(lt,o.out));g.textAlign="center";g.textBaseline="alphabetic";g.fillStyle=col;
  let fs=o.size||130;g.font=font(900,fs);let w=g.measureText(txt).width;if(w>maxW){fs=Math.floor(fs*maxW/w);g.font=font(900,fs);w=g.measureText(txt).width;}
  g.fillText(txt,safeX(x,w),y+(1-p)*30);
  if(o.label){let ls=o.labelSize||46;g.font=font(700,ls);let lw=g.measureText(o.label).width;
    if(lw>maxW){ls=Math.floor(ls*maxW/lw);g.font=font(700,ls);lw=g.measureText(o.label).width;}
    g.fillText(o.label,safeX(x,lw),y-fs*1.04+(1-p)*20);}
  g.restore();}
function stamp(g,txt,x,y,o){o=o||{};const d=o.d==null?1:o.d;if(d<=0)return;const rot=o.rot==null?-0.1:o.rot,col=o.col||C.red,maxW=Math.min(o.maxW||880,X1-X0);
  let fs=o.size||110;g.font=font(900,fs);let w=g.measureText(txt).width;
  if(w+fs*0.6>maxW){fs=Math.floor(fs*maxW/(w+fs*0.6));g.font=font(900,fs);w=g.measureText(txt).width;}
  const bw=w+fs*0.6,bh=fs*1.18,ar=Math.abs(rot),ex=bw/2*Math.cos(ar)+bh/2*Math.sin(ar);x=clamp(x,X0+ex,Math.max(X0+ex,X1-ex));
  const s=Math.min(1.5,stampScale(d));
  g.save();g.translate(x,y);g.rotate(rot);g.scale(s,s);g.globalAlpha=clamp(d*6,0,1)*0.92;g.strokeStyle=col;g.fillStyle=col;
  g.lineWidth=fs*0.09;g.strokeRect(-bw/2,-fs*0.68,bw,bh);g.lineWidth=fs*0.03;g.strokeRect(-w/2-fs*0.18,-fs*0.56,w+fs*0.36,fs*0.94);
  g.textAlign="center";g.textBaseline="middle";g.fillText(txt,0,0);g.textBaseline="alphabetic";g.textAlign="left";
  g.fillStyle=o.bg||C.paper;const r=rng(o.seed||31);for(let i=0;i<14;i++)g.fillRect(-w/2+r()*w,-fs*0.5+r()*fs,2+r()*6,2+r()*4);
  g.restore();}
function meter(g,x,y,w,v,o){o=o||{};const n=o.seg||10,h=o.h||44,gap=6;w=Math.min(w,X1-X0);x=clamp(x,X0,X1-w);
  g.lineWidth=5;g.strokeStyle=o.col||C.ink;g.strokeRect(x,y,w,h);const sw=(w-gap*(n+1))/n,f=clamp(v,0,1)*n;g.fillStyle=o.fill||C.red;
  for(let i=0;i<n;i++){const q=clamp(f-i,0,1);if(q<=0)break;g.fillRect(x+gap+i*(sw+gap),y+gap+(h-2*gap)*(1-q),sw,(h-2*gap)*q);}}
// ---------- герои и предметы
function person(g,x,y,s,col,o){o=o||{};if(s<=0)return;g.save();g.translate(x,y);g.scale(o.flip?-s:s,s);g.fillStyle=col;
  g.beginPath();g.moveTo(-34,0);g.lineTo(-30,-70);g.quadraticCurveTo(-30,-100,0,-102);g.quadraticCurveTo(30,-100,30,-70);g.lineTo(34,0);g.fill();
  g.beginPath();g.arc(0,-125,20,0,7);g.fill();
  if(o.arm!=null){g.save();g.translate(22,-88);g.rotate(o.arm);g.fillRect(-6,-60,12,60);g.beginPath();g.arc(0,-62,9,0,7);g.fill();g.restore();}
  if(o.hat){g.fillRect(-24,-146,48,6);g.fillRect(-15,-182,30,38);g.fillStyle=C.red;g.fillRect(-15,-152,30,6);g.fillStyle=col;}
  if(o.cap){g.beginPath();g.ellipse(0,-140,25,13,0,PI,0);g.fill();g.fillRect(-4,-141,34,5);g.fillStyle=C.red;g.fillRect(-12,-128,9,3);g.fillRect(3,-128,9,3);g.fillStyle=col;}
  if(o.tie){g.fillStyle=C.red;g.beginPath();g.moveTo(0,-98);g.lineTo(-6,-62);g.lineTo(0,-52);g.lineTo(6,-62);g.fill();g.fillStyle=col;}
  if(o.sign){g.fillRect(36,-210,6,130);g.fillStyle=o.sign;g.fillRect(4,-262,76,54);g.fillStyle=col;}
  if(o.paper){g.save();g.rotate(-0.1);g.fillStyle=C.white;g.fillRect(-26,-86,46,34);g.fillStyle=C.ink;for(let i=0;i<3;i++)g.fillRect(-22,-80+i*9,i?36:22,3);g.restore();}
  g.restore();}
function crowd(g,lt,rows,t0,fn){let n=0;rows.forEach((R,ri)=>{for(let j=0;j<R.n;j++){
  const x=R.x0+j*(R.x1-R.x0)/((R.n-1)||1)+Math.sin(lt*0.7)*(ri+1)*5,p=spring(lt-t0-n*0.025);
  if(p>0.01)person(g,x,R.y,R.s*p,R.c,fn?fn(n,ri,j):{});n++;}});}
function almond(g,r,h){g.beginPath();g.moveTo(-r,0);g.quadraticCurveTo(0,-2*h,r,0);g.quadraticCurveTo(0,2*h,-r,0);g.closePath();}
function eye(g,x,y,r,open,look,stroke,iris){open=Math.max(0.03,open);const h=r*0.55*open;g.save();g.translate(x,y);
  almond(g,r,h);g.fillStyle=C.white;g.fill();g.save();g.clip();const ix=(look||0)*r*0.3;
  g.fillStyle=iris||C.red;g.beginPath();g.arc(ix,0,r*0.42,0,7);g.fill();g.fillStyle=C.ink;g.beginPath();g.arc(ix,0,r*0.2,0,7);g.fill();
  g.fillStyle=C.white;g.beginPath();g.arc(ix+r*0.09,-r*0.09,r*0.06,0,7);g.fill();g.restore();
  almond(g,r,h);g.lineWidth=Math.max(3,r*0.06);g.strokeStyle=stroke||C.ink;g.lineJoin="round";g.stroke();
  if(open>0.3){g.lineCap="round";g.beginPath();for(let i=1;i<8;i++){const u=i/8,px=r*(2*u-1),py=-4*h*u*(1-u),vy=py-h,l=Math.hypot(px,vy)||1,L=r*0.2*clamp(open,0,1.2);
    g.moveTo(px,py);g.lineTo(px+px/l*L,py+vy/l*L);}g.stroke();g.lineCap="butt";}
  g.restore();}
function blink(lt,at,dur){dur=dur||0.25;return lt>at&&lt<at+dur?1-0.95*Math.sin((lt-at)/dur*PI):1;}
function sheet(g,x,y,rot,s){g.save();g.translate(x,y);g.rotate(rot||0);g.scale(s||1,s||1);g.fillStyle=C.white;g.fillRect(-36,-26,72,52);
  g.fillStyle=C.ink;g.fillRect(-30,-20,40,8);for(let i=0;i<3;i++)g.fillRect(-30,-6+i*9,60,3);g.restore();}
function coin(g,x,y,r,col){g.fillStyle=col||C.ochre;g.strokeStyle=C.ink;g.lineWidth=3;g.beginPath();g.ellipse(x,y,r,r*0.42,0,0,7);g.fill();g.stroke();}
function coinStack(g,x,y,n,r){for(let i=0;i<n;i++)coin(g,x,y-i*r*0.47,r);}
function coinFlow(g,lt,x0,y0,x1,y1,n,r){for(let j=0;j<n;j++){const u=(lt*0.4+j/n)%1,sd=j%2?1:-1,e=easeIn(u);
  coin(g,lerp(x0+sd*Math.abs(x1-x0),x1,e),lerp(y0,y1,u),r||14);}}
function toss(p,x0,y0,x1,y1,h){const e=easeOut(p);return {x:lerp(x0,x1,e),y:lerp(y0,y1,e)-Math.sin(PI*e)*(h||160),rot:(1-e)*6};}
function scales(g,x,y,o){o=o||{};const tl=o.tilt||0,b=o.p==null?1:o.p,s=o.s||1,col=o.col||C.ink,arm=360*s,drop=230*s;g.fillStyle=col;
  g.beginPath();g.moveTo(x-140*s,y+700*s);g.lineTo(x+140*s,y+700*s);g.lineTo(x+60*s,y+640*s);g.lineTo(x-60*s,y+640*s);g.fill();
  g.fillRect(x-14*s,y+640*s*(1-b),28*s,640*s*b);if(b<=0)return;
  g.save();g.translate(x,y);g.rotate(tl);g.fillRect(-arm*b,-12*s,2*arm*b,24*s);g.restore();
  for(const sd of[-1,1]){const ex=x+sd*arm*Math.cos(tl)*b,ey=y+sd*arm*Math.sin(tl)*b,py=ey+drop;
    g.strokeStyle=col;g.lineWidth=4;g.beginPath();g.moveTo(ex,ey);g.lineTo(ex-100*s,py);g.moveTo(ex,ey);g.lineTo(ex+100*s,py);g.stroke();
    g.fillStyle=col;g.beginPath();g.moveTo(ex-115*s,py);g.quadraticCurveTo(ex,py+90*s,ex+115*s,py);g.closePath();g.fill();
    const f=sd<0?o.left:o.right;if(f)f(g,ex,py);}}
function pyramid(g,cx,yb,lt,o){o=o||{};const lv=o.levels||[7,5,4,2],n=lv.length+1,s=o.s||1,w0=880*s,dw=w0*0.77/(n-1),hh=140*s,t0=o.t0==null?0.3:o.t0,gr=o.grow||0;
  for(let i=0;i<n;i++){const w=w0-i*dw,y=yb-i*hh*1.06,d=spring(lt-t0-i*0.12);if(d<0.01)continue;
    g.save();g.translate(cx,y-300*(1-d));if(i===n-1)g.scale(1+0.25*gr,1+0.25*gr);g.globalAlpha=clamp(d*3,0,1);
    g.fillStyle=i===n-1?(o.top||C.red):(o.col||C.ink);g.fillRect(-w/2,-hh,w,hh);
    if(i<n-1){const m=lv[i];for(let j=0;j<m;j++)person(g,-w/2+(j+1)*w/(m+1),-14*s,0.66*s,C.paper);}else person(g,0,-12*s,0.62*s,C.paper,{hat:1});
    g.restore();}}
const CRACK=[[0,-370],[-22,-300],[16,-220],[-12,-140],[20,-60],[0,0]];
function institution(g,x,y,s,col,o){o=o||{};g.save();g.translate(x,y);g.scale(s,s);g.fillStyle=col||C.ink;
  g.fillRect(-200,-30,400,30);g.fillRect(-180,-50,360,20);for(let i=0;i<5;i++)g.fillRect(-160+i*72,-250,32,200);
  g.fillRect(-190,-280,380,30);g.beginPath();g.moveTo(-210,-280);g.lineTo(0,-380);g.lineTo(210,-280);g.fill();
  if(o.crack>0){g.strokeStyle=o.crackCol||C.red;g.lineWidth=10;g.lineJoin="miter";g.beginPath();const m=o.crack*(CRACK.length-1);g.moveTo(CRACK[0][0],CRACK[0][1]);
    for(let i=1;i<=Math.ceil(m);i++){const a=CRACK[i-1],b=CRACK[i],u=clamp(m-i+1,0,1);g.lineTo(lerp(a[0],b[0],u),lerp(a[1],b[1],u));}g.stroke();}
  g.restore();}
function factory(g,x,y,s,col,lt,o){o=o||{};g.save();g.translate(x,y);g.scale(s,s);
  for(let j=0;j<5;j++){const u=((lt||0)*0.35+j/5)%1;g.globalAlpha=(1-u)*0.45;g.fillStyle=o.smoke||C.ink;g.beginPath();g.arc(120+u*70,-345-u*230,14+u*34,0,7);g.fill();}
  g.globalAlpha=1;g.fillStyle=col||C.ink;g.fillRect(-180,-160,360,160);g.beginPath();g.moveTo(-180,-160);
  for(let i=0;i<3;i++){g.lineTo(-180+i*120,-230);g.lineTo(-60+i*120,-160);}g.fill();g.fillRect(100,-330,40,170);g.fillRect(40,-290,36,130);
  g.fillStyle=o.win||C.ochre;for(let i=0;i<4;i++)g.fillRect(-150+i*80,-110,44,50);g.restore();}
function megaphone(g,x,y,s,rot,col,o){o=o||{};g.save();g.translate(x,y);g.rotate(rot||0);g.scale(s,s);g.fillStyle=col||C.ink;
  g.beginPath();g.moveTo(-60,-22);g.lineTo(60,-70);g.lineTo(60,70);g.lineTo(-60,22);g.closePath();g.fill();g.fillRect(-90,-20,32,40);g.fillRect(-40,18,16,50);
  if(o.waves!=null){g.strokeStyle=o.waveCol||C.red;g.lineWidth=10;g.lineCap="round";for(let i=0;i<3;i++){const u=(o.waves+i/3)%1;g.globalAlpha=1-u;g.beginPath();g.arc(60,0,40+u*140,-0.6,0.6);g.stroke();}}
  g.restore();}
function fist(g,x,y,s,col,rot){g.save();g.translate(x,y);g.rotate(rot||0);g.scale(s,s);g.fillStyle=col||C.ink;
  g.fillRect(-34,0,68,240);rr(g,-56,-110,112,124,24);g.fill();g.fillStyle=C.red;g.fillRect(-42,150,84,28);
  g.strokeStyle=C.paper;g.lineWidth=5;g.beginPath();for(let i=1;i<4;i++){g.moveTo(-56+i*28,-110);g.lineTo(-56+i*28,-58);}g.moveTo(-56,-40);g.lineTo(22,-40);g.stroke();g.restore();}
function ballot(g,x,y,s,p,col){g.save();g.translate(x,y);g.scale(s,s);
  if(p>0&&p<1){g.save();g.beginPath();g.rect(-200,-700,400,490);g.clip();sheet(g,0,lerp(-430,-160,easeIn(p)),0.05,1.3);g.restore();}
  g.fillStyle=col||C.ink;g.fillRect(-150,-220,300,220);g.fillStyle=C.red;g.fillRect(-150,-220,300,36);g.fillStyle=C.paper;g.fillRect(-70,-208,140,12);
  g.strokeStyle=C.paper;g.lineWidth=12;g.lineCap="round";g.beginPath();g.moveTo(-40,-100);g.lineTo(-10,-70);g.lineTo(45,-135);g.stroke();g.restore();}
function arrow(g,x0,y0,x1,y1,p,o){if(p<=0)return;o=o||{};const w=o.w||40,e=easeOut(p),L=Math.hypot(x1-x0,y1-y0)*e,hl=Math.min(L,w*1.6);
  g.save();g.translate(x0,y0);g.rotate(Math.atan2(y1-y0,x1-x0));g.fillStyle=o.col||C.red;g.fillRect(0,-w/2,Math.max(0,L-hl),w);
  g.beginPath();g.moveTo(L-hl,-w*1.1);g.lineTo(L,0);g.lineTo(L-hl,w*1.1);g.fill();g.restore();}
// ---------- сцены, камера, переходы, звук
function cutsFromSubs(k){const a=(k.subs||[]).map(s=>Array.isArray(s)?s[1]:s.t0);if(!a.length||a[0]>0)a.unshift(0);return a;}
function sceneAt(t,cuts){let i=0;while(i<cuts.length-1&&t>=cuts[i+1])i++;return {i,lt:t-cuts[i]};}
function camera(g,lt,i,o){o=o||{};const z=(o.z||1)*(1+0.045*Math.exp(-4*lt)*Math.cos(7*lt)+(o.push==null?0.005:o.push)*lt),r=(i%2?1:-1)*0.004*Math.sin(lt*0.8);
  g.save();g.translate(540+(o.dx||0),960+(o.dy||0));g.scale(z,z);g.rotate(r);g.translate(-540,-960);return z;}
function camEnd(g){g.restore();g.globalAlpha=1;}
function wipe(g,t,cuts,o){o=o||{};const D=o.dur||0.5;for(let i=1;i<cuts.length;i++){const d=t-cuts[i];if(d<=-D/2||d>=D/2)continue;
  const e=easeInOut((d+D/2)/D),L=-2000+4000*e-210,a=i%2?C.red:C.ink,b=i%2?C.ink:C.red;
  g.fillStyle=a;g.beginPath();g.moveTo(L,0);g.lineTo(L+1900,0);g.lineTo(L+1500,1920);g.lineTo(L-400,1920);g.fill();
  g.fillStyle=b;g.beginPath();g.moveTo(L+1940,0);g.lineTo(L+2010,0);g.lineTo(L+1610,1920);g.lineTo(L+1540,1920);g.fill();}}
function subCuts(s){const a=(s.subs||[]).map(x=>Array.isArray(x)?x[1]:x.t0);if(!a.length||a[0]>0)a.unshift(0);return a;}
function cutSounds(s,cuts,vol,pitches){for(let i=1;i<cuts.length;i++)s.play(cuts[i],i===cuts.length-1?"kalimba_run":"marimba_run",vol||0.16,{pitch:(pitches&&pitches[i])||1});}
return {C,F,X0,X1,clamp,lerp,prog,easeOut,easeIn,easeInOut,spring,springSoft,settle,stampScale,appear,leave,countTo,parallax,rng,font,safeX,rr,
  paper,darkBg,band,rays,halftone,ring,disc,searchlights,layout,words,title,hook,caption,note,tag,counter,stamp,meter,
  person,crowd,eye,blink,sheet,coin,coinStack,coinFlow,toss,scales,pyramid,institution,factory,megaphone,fist,ballot,arrow,
  cutsFromSubs,sceneAt,camera,camEnd,wipe,subCuts,cutSounds};
})();