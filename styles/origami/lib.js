// lib.js: ORIGA, стиль «дудл + оригами». Бумага, дрожащая линия (boil 8 к/с), тени-сдвиги, тёплая палитра.
const ORIGA = (() => {
const W=1080,H=1920,X0=60,X1=1020;
const C={ink:'#3A2E2A',cream:'#FFF8EC',paper:'#F6EEDF',red:'#E5684F',orange:'#F2A33A',yellow:'#F8D364',teal:'#4E9FA0',
  blue:'#6E8FC4',green:'#9DBF72',pink:'#F2A9A0',brown:'#B9825A',wood:'#D9A877',dark:'#4B4A55',sky:'#B8D1C8',sea:'#A7C7C4',
  sand:'#E6CB97',grass:'#C9D59A',sun:'#FBE3A0',steel:'#C9CBD1',ok:'#5DB56A',screen:'#CFEDEA',shade:'rgba(60,35,20,.13)'};
const F={sans:'"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif',
  serif:'"DejaVu Serif",Georgia,"Noto Serif","Times New Roman",serif',
  mono:'"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace'};
let BOIL=0,TX=null;const GL={},GLC={warm:'255,190,85',cool:'120,220,210',pink:'250,160,150'};

// ---------- математика ----------
const hn=i=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,u)=>a+(b-a)*u;
const prog=(t,a,b)=>clamp((t-a)/(b-a));
const eo=x=>1-Math.pow(1-clamp(x),3);
const eio=x=>{x=clamp(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;};
const back=x=>{x=clamp(x);const c=1.70158;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2);};
const spr=(x,f=13,d=6)=>x<=0?0:1-Math.exp(-d*x)*Math.cos(f*x);
const kick=(lt,a=.035)=>lt<=0?0:a*Math.exp(-5*lt)*Math.cos(11*lt);
const vis=(t,t0,t1,din=.3,dout=.2)=>eo((t-t0)/din)*(t1==null?1:1-eo((t-(t1-dout))/dout));
function rng(seed){let s=(seed>>>0)||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}

// ---------- фактуры ----------
function tex(){if(TX)return TX;
  const p=new OffscreenCanvas(W+80,H+80),g=p.getContext('2d');g.fillStyle=C.paper;g.fillRect(0,0,W+80,H+80);
  for(let i=0;i<6000;i++){const a=hn(i*3+1),b=hn(i*3+2),c=hn(i*3+3);g.fillStyle=c>.5?'rgba(120,85,50,.06)':'rgba(255,255,255,.4)';g.fillRect(a*(W+80),b*(H+80),1+c*2.5,1+c*1.5);}
  g.strokeStyle='rgba(120,90,60,.07)';g.lineWidth=1.2;
  for(let i=0;i<180;i++){const x=hn(i+9e3)*(W+80),y=hn(i+9100)*(H+80);g.beginPath();g.moveTo(x,y);g.lineTo(x+(hn(i+9200)-.5)*70,y+(hn(i+9300)-.5)*24);g.stroke();}
  const v=g.createRadialGradient(W/2+40,H*.45,350,W/2+40,H*.45,1250);v.addColorStop(0,'rgba(90,60,30,0)');v.addColorStop(1,'rgba(90,60,30,.2)');
  g.fillStyle=v;g.fillRect(0,0,W+80,H+80);return TX={p};}
function glowImg(col){if(GL[col])return GL[col];const c=new OffscreenCanvas(256,256),h=c.getContext('2d'),r=h.createRadialGradient(128,128,0,128,128,128);
  r.addColorStop(0,`rgba(${col},.75)`);r.addColorStop(.35,`rgba(${col},.3)`);r.addColorStop(1,`rgba(${col},0)`);h.fillStyle=r;h.fillRect(0,0,256,256);return GL[col]=c;}
function glow(g,x,y,r,a=1,col='warm'){if(r<=1||a<=0)return;g.save();g.globalAlpha=Math.min(1,a);g.drawImage(glowImg(GLC[col]||col),x-r,y-r,r*2,r*2);g.restore();}
function bg(g,t,o={}){tex();const px=clamp((o.px||0)*.25,-38,38);g.drawImage(TX.p,-40-px,-40);
  const n=o.confetti??9,cols=o.colors||[C.orange,C.teal,C.red,C.blue];
  for(let i=0;i<n;i++){const x=(hn(i)*1200+t*(20+hn(i+5)*30))%1200-60,y=420+hn(i+9)*950+Math.sin(t+i)*30;
    g.save();g.translate(x,y);g.rotate(t*.5+i);g.globalAlpha=.3;g.fillStyle=cols[i%cols.length];g.beginPath();g.moveTo(-12,-8);g.lineTo(14,0);g.lineTo(-8,12);g.fill();g.restore();}}
function frame(k,t,o={}){BOIL=Math.floor(t*8);bg(k.g,t,o);return k.g;}

// ---------- линии и бумага ----------
function path(g,pts,closed){const n=pts.length,m=closed?n:n-1;g.beginPath();
  for(let i=0;i<m;i++){const a=pts[i],b=pts[(i+1)%n];for(let j=0;j<2;j++){const s=BOIL*31+i*7+j*3+((a[0]*3+a[1])|0);
    const x=lerp(a[0],b[0],j/2)+(hn(s)-.5)*3,y=lerp(a[1],b[1],j/2)+(hn(s+50)-.5)*3;(i||j)?g.lineTo(x,y):g.moveTo(x,y);}}
  closed?g.closePath():g.lineTo(pts[n-1][0],pts[n-1][1]);}
function poly(g,pts,fill,lw=5,sh=1){if(fill){if(sh){g.save();g.translate(6,8);g.fillStyle='rgba(80,50,30,.16)';path(g,pts,1);g.fill();g.restore();}g.fillStyle=fill;path(g,pts,1);g.fill();}
  if(lw){g.lineWidth=lw;g.strokeStyle=C.ink;g.lineJoin=g.lineCap='round';path(g,pts,1);g.stroke();}}
function line(g,pts,lw=5,c=C.ink){if(pts.length<2)return;g.lineWidth=lw;g.strokeStyle=c;g.lineJoin=g.lineCap='round';path(g,pts,0);g.stroke();}
function shade(g,pts,c=C.shade){g.fillStyle=c;g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.closePath();g.fill();}
const circ=(x,y,r,n=12,ry=r,a0=0)=>Array.from({length:n},(_,i)=>{const a=a0+i/n*Math.PI*2;return[x+Math.cos(a)*r,y+Math.sin(a)*ry];});
const rect=(cx,cy,w,h)=>[[cx-w/2,cy-h/2],[cx+w/2,cy-h/2],[cx+w/2,cy+h/2],[cx-w/2,cy+h/2]];
const star=(x,y,r,n=5,inner=.45,rot=0)=>Array.from({length:n*2},(_,i)=>{const a=rot-Math.PI/2+i*Math.PI/n,rr=i%2?r*inner:r;return[x+Math.cos(a)*rr,y+Math.sin(a)*rr];});
function dot(g,x,y,r,c=C.ink){if(r<=0)return;g.fillStyle=c;g.beginPath();g.arc(x,y,r,0,7);g.fill();}
function underline(g,x,y,w,p=1,col=C.orange,lw=7){const L=w*clamp(p);if(L<2)return;const pts=[];for(let j=0;j<=6;j++)pts.push([x+L*j/6,y+Math.sin(j*1.7)*5]);line(g,pts,lw,col);}
function ring(g,x,y,rx,ry,p,col=C.red,lw=6){if(p<=0)return;const n=Math.max(2,Math.ceil(28*clamp(p))),pts=[];
  for(let j=0;j<=n;j++){const a=-2.3+j/28*(Math.PI*2+.6),w=1+Math.sin(a*3)*.04+j*.002;pts.push([x+Math.cos(a)*rx*w,y+Math.sin(a)*ry*w]);}line(g,pts,lw,col);}
function arrow(g,ax,ay,bx,by,p=1,col=C.ink,lw=6,bend=.25){if(p<=0)return;const mx=(ax+bx)/2-(by-ay)*bend,my=(ay+by)/2+(bx-ax)*bend,n=16,m=Math.max(1,Math.round(n*clamp(p))),pts=[];
  const Q=u=>[(1-u)*(1-u)*ax+2*u*(1-u)*mx+u*u*bx,(1-u)*(1-u)*ay+2*u*(1-u)*my+u*u*by];for(let j=0;j<=m;j++)pts.push(Q(j/n));line(g,pts,lw,col);
  if(p>.85){const e=pts[pts.length-1],d=pts[pts.length-2],a=Math.atan2(e[1]-d[1],e[0]-d[0]),h=lw*4;
    line(g,[[e[0]+Math.cos(a+2.6)*h,e[1]+Math.sin(a+2.6)*h],e,[e[0]+Math.cos(a-2.6)*h,e[1]+Math.sin(a-2.6)*h]],lw,col);}}

// ---------- текст ----------
const clean=s=>String(s).replace(/[\u2014\u2013]/g,'-');
const toWords=x=>(Array.isArray(x)?x.map(clean):clean(x).trim().split(/\s+/)).filter(Boolean);
function setF(g,fs,wt=800,fam=F.sans){g.font=`${wt} ${Math.round(fs)}px ${fam}`;}
function fit(g,text,fs,maxW,wt=800,fam=F.sans){maxW=Math.min(maxW,X1-X0);setF(g,fs,wt,fam);const w=g.measureText(text).width;if(w>maxW){fs*=maxW/w;setF(g,fs,wt,fam);}return fs;}
function layout(g,ws,fs,maxW,o={}){const wt=o.weight||800,fam=o.font||F.sans,maxL=o.lines||2,minFs=Math.min(o.min||44,fs);maxW=Math.min(maxW,X1-X0);let r;
  for(let it=0;it<40;it++){setF(g,fs,wt,fam);const sp=fs*.26,ww=ws.map(w=>g.measureText(w).width),L=[[]];let cw=0;
    ws.forEach((w,i)=>{const cur=L[L.length-1],add=(cur.length?sp:0)+ww[i];if(cur.length&&cw+add>maxW){L.push([i]);cw=ww[i];}else{cur.push(i);cw+=add;}});
    const n=L.length;if(n>1&&L[n-1].length==1&&L[n-2].length>=3)L[n-1].unshift(L[n-2].pop());
    const lines=L.map(ids=>({ids,w:ids.reduce((s,i,j)=>s+ww[i]+(j?sp:0),0)})),mw=Math.max(...lines.map(l=>l.w));
    r={fs,sp,ww,lines,lh:fs*1.18};
    if(!(mw>maxW+.5||lines.length>maxL||(lines.length>1&&lines.some(l=>l.ids.length<2))))return r;
    if(fs<=minFs+.5){if(mw>maxW){const f=maxW/mw;r.fs*=f;r.sp*=f;r.lh*=f;r.ww=ww.map(v=>v*f);lines.forEach(l=>l.w*=f);}return r;}
    fs=Math.max(minFs,fs*.93);}return r;}
function words(g,t,o){const t0=o.t0||0;if(t<t0)return null;const ws=toWords(o.text);if(!ws.length)return null;
  const q=o.t1!=null?eo((t-(o.t1-.22))/.18):0;if(q>=1)return null;
  const pad=o.plate?40:0,Lo=layout(g,ws,o.size||96,Math.min(o.maxW||900,X1-X0-2*pad),o),fs=Lo.fs,al=o.align||'center';
  const bw=Math.max(...Lo.lines.map(l=>l.w));let bx=al==='left'?(o.x??X0+pad):al==='right'?(o.x??X1-pad)-bw:(o.x??540)-bw/2;bx=clamp(bx,X0+pad,X1-pad-bw);
  const y=o.y??1490,n=ws.length,step=o.step??Math.min(.16,.45/Math.max(1,n-1)),dur=o.dur??.28,last=y+(Lo.lines.length-1)*Lo.lh;
  const keys=[].concat(o.key??[]).map(k=>typeof k==='number'?k:ws.findIndex(w=>w.toLowerCase().replace(/[.,!?:;]/g,'')===String(k).toLowerCase()));
  if(o.plate){g.save();g.globalAlpha=eo((t-t0)/.25)*(1-q);poly(g,[[bx-36,y-fs*.95],[bx+bw+36,y-fs*.95+6],[bx+bw+30,last+fs*.45],[bx-30,last+fs*.42]],o.fill||C.cream,5);g.restore();}
  Lo.lines.forEach((l,li)=>{let x=al==='left'?bx:al==='right'?bx+bw-l.w:bx+(bw-l.w)/2;const ly=y+li*Lo.lh;
    l.ids.forEach(i=>{const p=eo((t-t0-.08-i*step)/dur),w=Lo.ww[i];if(p>0){const yy=ly+(1-p)*34-q*30,isK=keys.includes(i);
      g.save();setF(g,fs,o.weight||800,o.font||F.sans);g.textAlign='left';g.textBaseline='alphabetic';g.globalAlpha=p*(1-q);
      g.fillStyle='rgba(80,50,30,.18)';g.fillText(ws[i],x+4,yy+6);g.fillStyle=isK?(o.keyColor||C.red):(o.color||C.ink);g.fillText(ws[i],x,yy);
      if(isK)underline(g,x,yy+fs*.2,w,eo((t-t0-.3-i*step)/.35),o.lineColor||C.orange,Math.max(4,fs*.06));g.restore();}
      x+=w+Lo.sp;});});
  return{x0:bx,x1:bx+bw,y0:y-fs*.95,y1:last+fs*.42,fs};}
const caption=(g,t,o)=>words(g,t,Object.assign({y:1490,size:112,plate:true,maxW:880},o));
const title=(g,t,o)=>words(g,t,Object.assign({y:760,size:132,maxW:900,min:90},o));
function label(g,t,o){const t0=o.t0||0;if(t<t0)return;const q=o.t1!=null?eo((t-(o.t1-.2))/.15):0;if(q>=1)return;
  const txt=clean(o.text),fs=fit(g,txt,o.size||48,o.maxW||560,o.weight||700),w=g.measureText(txt).width+fs*1.1,h=fs*1.55,p=spr(t-t0)*(1-q*.3);
  const x=clamp(o.x??540,X0+w*.56,X1-w*.56);g.save();g.translate(x,o.y??400);g.rotate(o.rot??-.03);g.scale(p,p);g.globalAlpha=1-q;
  poly(g,rect(0,0,w,h),o.fill||C.cream,4);g.fillStyle=o.color||C.ink;g.textAlign='center';g.textBaseline='middle';g.fillText(txt,0,fs*.05);g.restore();}
function val(t,keys){if(t<=keys[0][0])return Math.round(keys[0][1]);for(let i=keys.length-1;i>=0;i--)if(t>=keys[i][0]){const a=keys[i],b=keys[i+1];
  return Math.round(b?lerp(a[1],b[1],eo((t-a[0])/(b[0]-a[0]))):a[1]);}return 0;}
const fmtN=n=>{const a=Math.abs(Math.round(n)),s=a>=10000?String(a).replace(/\B(?=(\d{3})+(?!\d))/g,'\u00A0'):String(a);return(n<0?'-':'')+s;};
function counter(g,t,o){const t0=o.t0||0;if(t<t0||!o.keys)return;const n=val(t,o.keys),s=(o.prefix||'')+(o.fmt?o.fmt(n):fmtN(n))+(o.suffix||'');
  const fs=fit(g,s,o.size||64,o.maxW||760,800),w=g.measureText(s).width+fs*1.25,h=fs*1.9,p=spr(t-t0),ch=n!==val(t-.05,o.keys);
  g.save();g.translate(clamp(o.x??540,X0+w*.55,X1-w*.55),o.y??215);g.rotate((o.rot??-.02)+(ch?Math.sin(t*40)*.012:0));g.scale(p,p);
  poly(g,rect(0,0,w,h),o.fill||C.cream,5);g.fillStyle=o.color||C.ink;g.textAlign='center';g.textBaseline='middle';g.fillText(s,0,fs*.06);g.restore();return n;}
function stamp(g,t,o){const t0=o.t0||0;if(t<t0)return;const p=clamp((t-t0)/.2),sc=lerp(1.8,1,eo(p)),col=o.color||C.red,txt=clean(o.text);
  const fs=fit(g,txt,o.size||40,o.maxW||300,800),w=g.measureText(txt).width+fs*1.5,h=fs*2;
  g.save();g.translate(clamp(o.x??870,X0+w*.6,X1-w*.6),o.y??215);g.rotate(o.rot??-.18);g.scale(sc,sc);g.globalAlpha=p;
  g.strokeStyle=col;g.lineWidth=6;g.strokeRect(-w/2,-h/2,w,h);g.fillStyle=col;g.textAlign='center';g.textBaseline='middle';g.fillText(txt,0,fs*.07);g.restore();}
function timeline(g,t,o){const n=o.n,x0=Math.max(o.x0??240,X0+20),x1=Math.min(o.x1??840,X1-20),y=o.y??330,st=(x1-x0)/Math.max(1,n-1),i=o.i;
  line(g,[[x0,y],[x1,y]],3,'rgba(58,46,42,.35)');for(let j=0;j<n;j++)dot(g,x0+j*st,y,j<=i?10:7,j<=i?(o.col||C.orange):'rgba(58,46,42,.35)');
  const m=eo((t-(o.ti||0))/.6);spark(g,i?x0+(i-1+m)*st:x0,y,18,t);}

// ---------- сцены, камера, переходы ----------
function scene(t,cuts,end=35){let i=0;while(i<cuts.length-1&&t>=cuts[i+1])i++;const a=cuts[i],b=cuts[i+1]??end,lt=t-a;return{i,a,b,lt,len:b-a,u:eio(lt/(b-a))};}
function cam(sc,c=[1,1.05,0,0,0,0]){const k=sc.i?1+kick(sc.lt):1;return{s:lerp(c[0],c[1],sc.u)*k,x:lerp(c[2]||0,c[3]||0,sc.u),y:lerp(c[4]||0,c[5]||0,sc.u)};}
function camOn(g,cm,py=900){g.save();g.translate(540+cm.x,py+cm.y);g.scale(cm.s,cm.s);g.translate(-540,-py);}
const camOff=g=>g.restore();
function wipe(g,t,cuts,dur=.5,col='#F1E6D2'){for(const c of cuts){if(c<=0)continue;const p=(t-c+dur/2)/dur;if(p<=0||p>=1)continue;const d=lerp(-2200,2200,eio(p));
  g.save();g.translate(540,960);g.rotate(.35);g.translate(d,0);g.fillStyle='rgba(80,50,30,.2)';g.fillRect(-1182,-2600,2400,5200);g.fillStyle=col;g.fillRect(-1200,-2600,2400,5200);
  shade(g,[[1200,-2600],[1200,2600],[1000,2600]],'rgba(255,255,255,.4)');line(g,[[1200,-1500],[1200,1500]],5);line(g,[[-1200,-1500],[-1200,1500]],5);g.restore();}}
function fold(g,t,cut,dur=.5,col='#F1E6D2'){const p=(t-cut+dur/2)/dur;if(p<=0||p>=1)return;const c=eio(Math.sin(Math.PI*p)),e=lerp(-10,545,c),f=lerp(1090,535,c);
  g.fillStyle='rgba(80,50,30,.18)';g.fillRect(-60,-60,e+16,2040);g.fillRect(f-16,-60,1200,2040);g.fillStyle=col;g.fillRect(-60,-60,e+60,2040);g.fillRect(f,-60,1200,2040);
  shade(g,[[e-80,-60],[e,-60],[e,1980],[e-80,1980]],'rgba(60,35,20,.08)');line(g,[[e,-40],[e,1960]],5);line(g,[[f,-40],[f,1960]],5);}

// ---------- герои и предметы (x,y = опорная точка снизу/центр, s = масштаб; s<=0.01 не рисуется) ----------
function spark(g,x,y,r,rot=0){if(r<=1)return;glow(g,x,y,r*3.2,.85);const p=star(x,y,r,5,.45,rot);poly(g,p,C.yellow,4,0);
  g.fillStyle='rgba(230,120,40,.35)';g.beginPath();for(let i=0;i<10;i+=2){g.moveTo(x,y);g.lineTo(p[i][0],p[i][1]);g.lineTo(p[i+1][0],p[i+1][1]);g.closePath();}g.fill();}
function person(g,x,y,s,col=C.red,a1=.9,a2=.9){if(s<=.01)return;g.save();g.translate(x,y);g.scale(s,s);
  poly(g,[[0,-150],[-60,0],[60,0]],col);shade(g,[[0,-150],[60,0],[0,0]]);
  line(g,[[-12,-105],[-12-62*Math.cos(a1),-105+62*Math.sin(a1)]]);line(g,[[12,-105],[12+62*Math.cos(a2),-105+62*Math.sin(a2)]]);
  poly(g,circ(0,-188,40,10),C.cream);dot(g,-13,-190,5.5);dot(g,13,-190,5.5);dot(g,-24,-176,6,C.pink);dot(g,24,-176,6,C.pink);g.restore();}
function face(g,x,y,r,lt=0,o={}){const bl=(lt%2.6)<.12?.15:1,ec=o.eye||C.ink;g.fillStyle=ec;g.beginPath();
  g.ellipse(x-r*.3,y-r*.05,r*.1,r*.15*bl,0,0,7);g.ellipse(x+r*.3,y-r*.05,r*.1,r*.15*bl,0,0,7);g.fill();
  if(o.blush!==false){dot(g,x-r*.55,y+r*.25,r*.09,C.pink);dot(g,x+r*.55,y+r*.25,r*.09,C.pink);}
  g.strokeStyle=ec;g.lineWidth=Math.max(3,r*.05);g.lineCap='round';g.beginPath();g.arc(x,y+r*.12,r*.16,.3,Math.PI-.3);g.stroke();}
function fire(g,x,y,s){if(s<=.01)return;g.save();g.translate(x,y);g.scale(s,s);glow(g,0,-70,230,.8);
  poly(g,[[-80,-10],[70,-34],[76,-14],[-74,10]],C.brown);poly(g,[[-70,-34],[80,-8],[74,12],[-76,-14]],'#9A6844');
  [[C.red,140,0,56],[C.orange,100,-30,38],[C.yellow,78,24,30]].forEach(([c,h,fx,w],i)=>{const hh=h*(.85+hn(BOIL*5+i)*.3);
    poly(g,[[fx-w,-18],[fx+(hn(BOIL*7+i)-.5)*22,-18-hh],[fx+w,-18]],c,4,0);});g.restore();}
function sun(g,x,y,r,lt=0){if(r<=1)return;poly(g,circ(x,y,r,10),C.sun,4,0);shade(g,[[x,y-r],[x+r,y],[x,y+r]]);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2+lt*.3;line(g,[[x+Math.cos(a)*r*1.25,y+Math.sin(a)*r*1.25],[x+Math.cos(a)*r*1.5,y+Math.sin(a)*r*1.5]],4);}}
function cloud(g,x,y,s,lt=0){if(s<=.01)return;const dx=Math.sin(lt*.5)*10;
  poly(g,circ(0,0,1,18).map(([c,sn])=>{const a=Math.atan2(sn,c),k=1+(sn<0?.25*Math.abs(Math.sin(a*3)):0);return[x+dx+c*120*k*s,y+sn*60*k*s];}),C.cream,4);}
function mountain(g,x,y,w,h,col=C.sky){poly(g,[[x-w/2,y],[x,y-h],[x+w/2,y]],col,5,0);shade(g,[[x,y-h],[x+w/2,y],[x,y]]);}
function ground(g,y,col=C.grass,lt=0,wave=0){const p=[];for(let i=0;i<=10;i++)p.push([-300+i*170,y+Math.sin(i*1.3+lt*3)*wave+(hn(i+3)-.5)*24]);p.push([1400,2000],[-300,2000]);poly(g,p,col,5,0);}
function water(g,y,lt=0,col=C.blue){ground(g,y,col,lt,14);for(let i=0;i<3;i++){const yy=y+90+i*90;line(g,[[120+i*200,yy],[220+i*200,yy-12],[320+i*200,yy]],4,'rgba(255,255,255,.5)');}}
function tree(g,x,y,s,col=C.green,lt=0){if(s<=.01)return;g.save();g.translate(x,y);g.rotate(Math.sin(lt*2+x)*.03);g.scale(s,s);
  poly(g,[[-14,0],[14,0],[10,-60],[-10,-60]],C.brown,4);
  [[110,-50],[90,-110],[70,-165]].forEach(([w,yy])=>{poly(g,[[-w,yy],[0,yy-110],[w,yy]],col,4);shade(g,[[0,yy-110],[w,yy],[0,yy]]);});g.restore();}
function house(g,x,y,w,h,col=C.orange,p=1){if(p<=.01)return;g.save();g.translate(x,y);g.scale(1,p);
  poly(g,[[-w/2,0],[-w/2,-h],[0,-h-w*.55],[w/2,-h],[w/2,0]],col);shade(g,[[0,-h-w*.55],[w/2,-h],[w/2,0],[0,0]]);
  g.fillStyle=C.cream;for(let yy=-h+30;yy<-30;yy+=55){g.fillRect(-w/4-8,yy,16,22);g.fillRect(w/4-8,yy,16,22);}g.restore();}
function book(g,x,y,s,lt=0,flip=true){if(s<=.01)return;g.save();g.translate(x,y);g.scale(s,s);
  poly(g,[[0,0],[-170,-30],[-170,90],[0,120]],C.cream);poly(g,[[0,0],[170,-30],[170,90],[0,120]],C.cream);shade(g,[[0,0],[170,-30],[170,90],[0,120]]);
  for(let i=0;i<3;i++){line(g,[[-140,-5+i*28],[-30,12+i*28]],3,'rgba(58,46,42,.4)');line(g,[[30,12+i*28],[140,-5+i*28]],3,'rgba(58,46,42,.4)');}
  if(flip){const p=(lt*1.1)%1,f=Math.cos(p*Math.PI),l=40*Math.sin(p*Math.PI);poly(g,[[0,0],[170*f,-30-l],[170*f,90-l],[0,120]],'#FFFDF6',4,0);}g.restore();}
function wheel(g,x,y,r,rot=0,col=C.brown){g.save();g.translate(x,y);g.rotate(rot);poly(g,circ(0,0,r,14),col);poly(g,circ(0,0,r*.72,14),C.wood,4,0);
  for(let i=0;i<4;i++){const a=i*Math.PI/4,q=r*.72;line(g,[[-Math.cos(a)*q,-Math.sin(a)*q],[Math.cos(a)*q,Math.sin(a)*q]],4);}g.restore();}
function gear(g,x,y,r,rot=0,col=C.steel){const k=r/92,p=[];g.save();g.translate(x,y);g.rotate(rot);
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2,rr=((i>>1)%2?70:92)*k;p.push([Math.cos(a)*rr,Math.sin(a)*rr]);}poly(g,p,col);poly(g,circ(0,0,26*k,8),C.cream,4,0);g.restore();}
function bulb(g,x,y,s,on=1){if(s<=.01)return;g.save();g.translate(x,y);g.scale(s,s);glow(g,0,-10,340*on,.9*on);
  if(on>.05)for(let i=0;i<8;i++){const a=i/8*Math.PI*2-Math.PI/2,r1=185+45*on;if(Math.sin(a)<.6)line(g,[[Math.cos(a)*185,Math.sin(a)*185],[Math.cos(a)*r1,Math.sin(a)*r1]],6,C.orange);}
  poly(g,circ(0,0,150,14),on>.5?'rgba(255,246,214,.95)':'rgba(255,255,255,.6)');shade(g,[[0,-150],[150,0],[0,150]],'rgba(60,35,20,.06)');
  poly(g,[[-60,142],[60,142],[60,222],[-60,222]],'#AEB3BA');line(g,[[-60,168],[60,168]],4);line(g,[[-60,194],[60,194]],4);g.restore();}
function screen(g,x,y,s,o={}){if(s<=.01)return;const w=o.w||200,h=o.h||360,iw=w-32,ih=h-48;g.save();g.translate(x,y);g.rotate(o.rot??.06);g.scale(s,s);
  poly(g,rect(0,0,w,h),o.col||C.dark,5);g.fillStyle=o.fill||C.screen;g.fillRect(-iw/2,-ih/2-4,iw,ih);
  if(o.draw){g.save();g.beginPath();g.rect(-iw/2,-ih/2-4,iw,ih);g.clip();o.draw(g,iw,ih);g.restore();}dot(g,0,h/2-12,5,C.cream);g.restore();}
function bird(g,x,y,s,lt=0,col=C.blue){if(s<=.01)return;g.save();g.translate(x,y+Math.sin(lt*3)*8*s);g.scale(s,s);const f=Math.sin(lt*8);
  poly(g,[[-110,-10],[-20,-30],[120,-80],[70,10],[-10,30]],col);shade(g,[[-20,-30],[120,-80],[70,10]]);
  poly(g,[[-30,-25],[40,-28],[-10,-25-120*f]],col===C.cream?C.yellow:C.cream,4);dot(g,90,-55,6);g.restore();}
function boat(g,x,y,s,lt=0){if(s<=.01)return;g.save();g.translate(x,y+Math.sin(lt*3)*10);g.rotate(Math.sin(lt*2.5)*.06);g.scale(s,s);
  poly(g,[[-120,-40],[120,-40],[80,30],[-80,30]],C.cream);shade(g,[[0,-40],[120,-40],[80,30],[0,30]]);
  poly(g,[[0,-45],[0,-200],[90,-55]],C.yellow);poly(g,[[-8,-45],[-8,-170],[-80,-55]],C.orange);g.restore();}
function heart(g,x,y,s,col=C.red){if(s<=.01)return;const p=[];for(let i=0;i<24;i++){const a=i/24*Math.PI*2,sn=Math.sin(a);
  p.push([x+16*sn*sn*sn*5*s,y-(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))*5*s]);}poly(g,p,col);shade(g,[[x,y-25*s],...p.slice(1,10),[x,y+85*s]]);}
function chat(g,x,y,s,lt=0,col=C.cream,dc=C.teal){if(s<=.01)return;g.save();g.translate(x,y);g.scale(s,s);
  poly(g,[[-90,-50],[90,-50],[90,40],[70,40],[100,85],[40,40],[-90,40]],col);for(let i=0;i<3;i++)dot(g,-40+i*40,-5-Math.abs(Math.sin(lt*6+i))*10,10,dc);g.restore();}
function check(g,x,y,r,p,col=C.ok){const b=spr(p*1.2);if(b<=.01)return;dot(g,x,y,r*b,col);const u=eo((p-.35)/.4);if(u<=0)return;
  const a=[x-r*.45,y],m=[x-r*.1,y+r*.38],e=[x+r*.5,y-r*.4],pts=u<.4?[a,[lerp(a[0],m[0],u/.4),lerp(a[1],m[1],u/.4)]]:[a,m,[lerp(m[0],e[0],(u-.4)/.6),lerp(m[1],e[1],(u-.4)/.6)]];line(g,pts,r*.16,C.cream);}
function rays(g,x,y,R,rot=0,col='rgba(248,200,90,.2)',n=16){g.save();g.translate(x,y);g.rotate(rot);g.fillStyle=col;g.beginPath();
  for(let i=0;i<n;i+=2){const a0=i/n*Math.PI*2,a1=(i+1)/n*Math.PI*2;g.moveTo(0,0);g.lineTo(Math.cos(a0)*R,Math.sin(a0)*R);g.lineTo(Math.cos(a1)*R,Math.sin(a1)*R);g.closePath();}g.fill();g.restore();}
function net(g,lt,o){const N=o.nodes,st=o.step??.1,t0=o.t0||0,col=o.col||C.teal;
  (o.links||[]).forEach(([a,b],i)=>{const A=N[a],B=N[b],p=eo((lt-t0-i*st)/.35);if(p>0)line(g,[A,[lerp(A[0],B[0],p),lerp(A[1],B[1],p)]],4,col);});
  N.forEach((n,i)=>{const p=spr(lt-t0-.15-i*st*.8);if(p>.01)poly(g,circ(n[0],n[1],(o.r||26)*p,8),i%2?C.orange:col,4,0);});}
const EG=Array.from({length:20},(_,i)=>{const a=i/20*Math.PI*2,s=Math.sin(a);return[Math.cos(a)*215,s*(s<0?310:260)];});
const ZIG=Array.from({length:9},(_,j)=>[-215+j*53.75,j%8==0?0:(j%2?-34:30)]);
function egg(g,x,y,s,o={}){if(s<=.01)return;const op=clamp(o.open||0),cr=clamp(o.crack||0),col=o.col||C.cream;
  if(op<=0){g.save();g.translate(x,y);g.rotate(o.shake||0);g.scale(s,s);g.translate(0,-260);poly(g,EG,col,6);
    shade(g,[[0,-310],...EG.slice(15,20),...EG.slice(0,6)]);line(g,[[0,-310],[0,260]],2,'rgba(58,46,42,.3)');
    const cn=Math.floor(cr*8);if(cn>0)line(g,ZIG.slice(0,cn+1),6);g.restore();return;}
  if(op<1){g.save();g.translate(x-280*op*s,y-260*s-(420*op-500*op*op)*s);g.rotate(-2*op);g.scale(s,s);g.globalAlpha=1-op;
    poly(g,[EG[10],...EG.slice(11,20),EG[0],...ZIG.slice().reverse()],col,6);g.restore();}
  if(o.inner)o.inner(g,op);
  if(op<1){g.save();g.translate(x,y-260*s+260*op*op*s);g.scale(s,s);g.globalAlpha=1-op;poly(g,[...EG.slice(0,11),...ZIG],col,6);g.restore();}}

// ---------- звук ----------
function sfxCuts(s,cuts,vol=.14){let j=0;for(const c of cuts){if(c<=0)continue;s.play(c-.22,j++%2?'kalimba_run':'marimba_run',vol);}}

return{W,H,X0,X1,C,F,hn,clamp,lerp,prog,eo,eio,back,spr,kick,vis,rng,tex,glow,bg,frame,path,poly,line,shade,circ,rect,star,dot,
  underline,ring,arrow,clean,setF,fit,layout,words,caption,title,label,val,fmtN,counter,stamp,timeline,scene,cam,camOn,camOff,wipe,fold,
  spark,person,face,fire,sun,cloud,mountain,ground,water,tree,house,book,wheel,gear,bulb,screen,bird,boat,heart,chat,check,rays,net,egg,sfxCuts};
})();