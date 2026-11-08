// lib.js: стиль POPS. Плоская поп-моушн-графика: точечная сетка, сквозной герой-устройство на пружине,
// орбиты фигур, круговая шторка на склейке, слова по одному с маркером ключевого слова.
const POPS = (() => {
const SANS='"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif';
const SERIF='"DejaVu Serif",Georgia,"Noto Serif","Times New Roman",serif';
const MONO='"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace';
const TAU=Math.PI*2;
const PAL={cream:'#F6F1E9',paper:'#FFF8EE',ink:'#15132B',night:'#0E0D1F',coral:'#FF5A36',sun:'#FFC83D',
  green:'#1FA463',blue:'#3A5BFF',red:'#E63946',orange:'#FF9F1C',violet:'#8E6CC9',mint:'#7BC4A4',
  grey:'#8A8496',line:'#EAE3D6',white:'#FFFFFF'};
const THEMES={
  light:{bg:PAL.cream,ink:PAL.ink,acc:PAL.coral,d:0},
  night:{bg:PAL.ink,ink:PAL.cream,acc:PAL.sun,d:1},
  fresh:{bg:PAL.cream,ink:PAL.ink,acc:PAL.green,d:0},
  blue:{bg:PAL.blue,ink:'#FFFFFF',acc:PAL.sun,d:1},
  coral:{bg:PAL.coral,ink:'#FFFFFF',acc:PAL.sun,d:1}};
const ORDER=['light','night','fresh','blue'];
// тема: по имени или по номеру сцены (чередование light, night, fresh, blue)
function theme(i){if(typeof i==='string')return THEMES[i]||THEMES.light;
  return THEMES[ORDER[((i%ORDER.length)+ORDER.length)%ORDER.length]];}

// ---------- математика и изинги ----------
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,p)=>a+(b-a)*p;
const prog=(t,a,b)=>clamp((t-a)/(b-a),0,1);
const eo=x=>1-Math.pow(1-clamp(x,0,1),3);
const eio=x=>{x=clamp(x,0,1);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;};
const back=x=>{x=clamp(x,0,1);const c=1.7;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2);};
// пружина 0→1 с перелётом, x = секунды от старта
const spring=(x,d=6,f=10)=>x<=0?0:1-Math.exp(-d*x)*Math.cos(f*x);
const springTo=(a,b,x,d,f)=>lerp(a,b,spring(x,d,f));
// затухающее покачивание вокруг 0
const settle=(x,amp=1,d=5,f=9)=>x<0?0:amp*Math.exp(-d*x)*Math.cos(f*x);
const appear=(t,ta,dur=.3)=>eo(prog(t,ta,ta+dur));
const leave=(t,tb,dur=.2)=>1-eo(prog(t,tb-dur,tb));
function rng(seed){let s=((seed+1)*2654435761)>>>0||1;
  return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}

// ---------- сцены ----------
function cutsFromSubs(k){const c=(k.subs||[]).map(s=>s.t0);if(!c.length||c[0]>.01)c.unshift(0);c[0]=0;
  c.push(k.duration);return c;}
function scene(t,cuts){let i=0;while(i<cuts.length-2&&t>=cuts[i+1])i++;
  return{i,lt:t-cuts[i],t0:cuts[i],t1:cuts[i+1],dur:cuts[i+1]-cuts[i],n:cuts.length-1,last:i===cuts.length-2};}

// ---------- фигуры ----------
function rr(g,x,y,w,h,r){w=Math.max(0,w);h=Math.max(0,h);r=Math.max(0,Math.min(r,w/2,h/2));g.beginPath();
  g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function circle(g,x,y,r,col){if(r<=0)return;g.fillStyle=col;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();}
function ring(g,x,y,r,col,lw=6){if(r<=0)return;g.strokeStyle=col;g.lineWidth=lw;g.beginPath();g.arc(x,y,r,0,TAU);g.stroke();}
function star(g,cx,cy,R,r,n=4,col=PAL.sun){g.fillStyle=col;g.beginPath();
  for(let j=0;j<n*2;j++){const a=j*Math.PI/n-Math.PI/2,q=j%2?r:R;g.lineTo(cx+Math.cos(a)*q,cy+Math.sin(a)*q);}
  g.closePath();g.fill();}

// ---------- фон: точечная сетка (кэш) ----------
let DOTS=null;
function dotsTex(){if(DOTS)return DOTS;
  DOTS=[0,1].map(d=>{const c=new OffscreenCanvas(1160,2040),x=c.getContext('2d');
    x.fillStyle=d?'rgba(255,255,255,.09)':'rgba(21,19,43,.08)';
    for(let y=0;y<2040;y+=40)for(let q=0;q<1160;q+=40){x.beginPath();x.arc(q+20,y+20,3,0,TAU);x.fill();}
    return c;});
  return DOTS;}
function bg(g,t,th,o={}){g.fillStyle=th.bg;g.fillRect(0,0,1080,1920);
  if(o.dots!==false)g.drawImage(dotsTex()[th.d],-40-(t*14)%40,-40-(t*22)%40);}

// ---------- камера ----------
function camera(g,t,lt,o={}){const z=o.zoom??.022;
  const sc=1+z*lt/3+(o.first?.05*(1-eo(lt/1.4)):.035*settle(lt,1,5,9));
  const dy=Math.sin(t*.8)*6+(o.dy||0);g.save();g.translate(540+(o.dx||0),960+dy);g.scale(sc,sc);g.translate(-540,-960);return sc;}
function camEnd(g){g.restore();}
// удар камеры (штамп, падение): добавь в camera({dy:thud(lt,ta)})
function thud(lt,ta,amp=12){const x=lt-ta;return x<0?0:Math.exp(-10*x)*Math.sin(x*50)*amp;}

// ---------- текст ----------
const TC=new Map();
function font(wt,s,fam){return `${wt} ${Math.round(s)}px ${fam||SANS}`;}
function splitWords(s){return Array.isArray(s)?s:String(s).replace(/\u2014|\u2013/g,'-').split(/\s+/).filter(Boolean);}
// сколько локальных px доступно тексту в точке x с учётом камеры/устройства (экранные границы 60…1020)
function room(g,x,y,align,maxW){const m=g.getTransform(),sc=Math.hypot(m.a,m.b)||1,sx=m.a*x+m.c*y+m.e;let w;
  if(align==='center')w=2*Math.min(sx-60,1020-sx)/sc;else if(align==='right')w=(sx-60)/sc;else w=(1020-sx)/sc;
  return Math.max(8,Math.min(maxW||1e9,w));}
function parts(n,L){const r=[];if(L===1)r.push([]);else if(L===2){for(let i=2;i<=n-2;i++)r.push([i]);}
  else for(let i=2;i<=n-4;i++)for(let j=i+2;j<=n-2;j++)r.push([i,j]);return r;}
// подгонка: 1..lines строк, в каждой строке ≥2 слов, иначе уменьшение кегля шагом 2px
function fitWords(g,ws,maxW,size,o={}){ws=splitWords(ws);const wt=o.wt||800,fam=o.fam||SANS,maxL=o.lines||2,
  lh=o.lh||1.12,mw=Math.max(8,Math.floor(maxW/8)*8),n=ws.length;
  const key=ws.join(' ')+'|'+mw+'|'+size+'|'+wt+'|'+fam+'|'+maxL+'|'+lh;let r=TC.get(key);if(r)return r;
  for(let s=Math.round(size);;s-=2){g.font=font(wt,s,fam);const w=ws.map(x=>g.measureText(x).width),sp=g.measureText(' ').width;
    const lw=(a,b)=>{let v=0;for(let i=a;i<b;i++)v+=w[i]+(i>a?sp:0);return v;};let best=null;
    for(let L=1;L<=maxL&&!best;L++){if(L>1&&n<2*L)break;
      for(const br of parts(n,L)){let a=0,mx=0;const lines=[];
        for(const b of br.concat([n])){lines.push([a,b]);mx=Math.max(mx,lw(a,b));a=b;}
        if(mx<=mw&&(!best||mx<best.mx))best={mx,lines};}}
    if(best||s<=12){if(!best)best={mx:lw(0,n),lines:[[0,n]]};
      r={s,ws:w,sp,lines:best.lines,lh:s*lh,wt,fam,width:best.mx};break;}}
  if(TC.size>400)TC.clear();TC.set(key,r);return r;}
// слова по одному снизу вверх, ключевое (hi: индекс, слово или массив) цветом acc + маркер-полоса
function words(g,o,t){const ws=splitWords(o.text??o.w??''),align=o.align||'center',x=o.x??540,y=o.y;
  if(!ws.length)return{s:0,h:0,lines:0,width:0,bottom:y};
  const f=fitWords(g,ws,room(g,x,y,align,o.maxW||900),o.size||96,{wt:o.wt,fam:o.fam,lines:o.lines,lh:o.lh});
  const clean=w=>w.toLowerCase().replace(/[.,:;!?«»"]/g,'');
  const hi=[].concat(o.hi??[]).map(h=>typeof h==='string'?ws.findIndex(w=>clean(w)===clean(h)):h);
  const col=o.col||PAL.ink,acc=o.acc||PAL.coral,step=o.step??.15,t0=o.t0??0;
  g.font=font(f.wt,f.s,f.fam);g.textAlign='left';g.textBaseline='alphabetic';
  f.lines.forEach((ln,li)=>{let tw=0;for(let i=ln[0];i<ln[1];i++)tw+=f.ws[i]+(i>ln[0]?f.sp:0);
    let xx=align==='center'?x-tw/2:align==='right'?x-tw:x;const yl=y+li*f.lh;
    for(let i=ln[0];i<ln[1];i++){const ta=t0+i*step,e=eo(prog(t,ta,ta+.27)),
      ex=o.tEnd!=null?prog(t,o.tEnd-.2,o.tEnd):0;
      if(e>0&&ex<1){const a=e*(1-ex)*(o.alpha??1),yy=yl+(1-e)*f.s*.35-eo(ex)*f.s*.4,isH=hi.includes(i);
        if(isH){const m=eo(prog(t,ta+.15,ta+.45));g.globalAlpha=a*(o.markA??.32);g.fillStyle=acc;
          g.fillRect(xx,yy+f.s*.1,f.ws[i]*m,f.s*.12);}
        g.globalAlpha=a;g.fillStyle=isH?acc:col;g.fillText(ws[i],xx,yy);}
      xx+=f.ws[i]+f.sp;}});
  g.globalAlpha=1;const L=f.lines.length;
  return{s:f.s,h:L*f.lh,lines:L,width:f.width,bottom:y+(L-1)*f.lh+f.s*.3};}
function headline(g,text,hi,y,t,t0,th,o={}){return words(g,Object.assign({text,hi,x:540,y,size:140,wt:800,
  col:th.ink,acc:th.acc,t0,maxW:900},o),t);}
function caption(g,text,y,t,t0,th,o={}){return words(g,Object.assign({text,hi:-1,x:540,y,size:60,wt:600,
  col:th.ink,acc:th.acc,t0,maxW:880,step:.12},o),t);}
// статичная однострочная подпись, ужимается под ширину
function label(g,text,x,y,o={}){const align=o.align||'left',ws=splitWords(text);if(!ws.length)return 0;
  const f=fitWords(g,ws,room(g,x,y,align,o.maxW),o.size||32,{wt:o.wt||600,fam:o.fam,lines:1});
  g.font=font(f.wt,f.s,f.fam);g.textAlign=align;g.textBaseline=o.base||'alphabetic';g.fillStyle=o.col||PAL.ink;
  g.fillText(ws.join(' '),x,y);g.textBaseline='alphabetic';return f.width;}

// ---------- плашки и карточки ----------
function pill(g,x,y,text,o={}){const a=o.a??1;if(a<=0)return 0;const pad=o.pad||34,ws=splitWords(text);
  const f=fitWords(g,ws,room(g,x,y,'center',o.maxW||900)-pad*2,o.size||44,{wt:o.wt||700,fam:o.fam,lines:1});
  const w=f.width+pad*2,h=f.s*1.9,yy=y+(1-a)*20;g.globalAlpha=a;
  g.fillStyle=o.fill||'#fff';rr(g,x-w/2,yy-h/2,w,h,h/2);g.fill();
  if(o.stroke){g.strokeStyle=o.stroke;g.lineWidth=4;g.stroke();}
  g.font=font(f.wt,f.s,f.fam);g.fillStyle=o.col||PAL.ink;g.textAlign='center';g.textBaseline='middle';
  g.fillText(ws.join(' '),x,yy+2);g.textBaseline='alphabetic';g.globalAlpha=1;return w;}
function card(g,x,y,w,h,o={}){const r=o.r??34;
  if(o.shadow!==false){g.fillStyle='rgba(0,0,0,.15)';rr(g,x+10,y+14,w,h,r);g.fill();}
  g.fillStyle=o.fill||'#fff';rr(g,x,y,w,h,r);g.fill();
  if(o.stroke){g.strokeStyle=o.stroke;g.lineWidth=o.lw||3;g.stroke();}}
// плитка-пиктограмма 100×100 (масштаб S): plus check arrow home chart clock heart chat bolt dot
function iconTile(g,kind,x,y,S=100,col=PAL.coral){g.save();g.translate(x,y);g.scale(S/100,S/100);
  g.fillStyle=col;rr(g,0,0,100,100,24);g.fill();
  g.fillStyle=g.strokeStyle='#fff';g.lineWidth=7;g.lineCap='round';g.lineJoin='round';g.beginPath();
  if(kind==='plus'){g.moveTo(50,26);g.lineTo(50,74);g.moveTo(26,50);g.lineTo(74,50);g.stroke();}
  else if(kind==='check'){g.moveTo(28,52);g.lineTo(44,68);g.lineTo(73,34);g.stroke();}
  else if(kind==='arrow'){g.moveTo(26,50);g.lineTo(72,50);g.moveTo(54,32);g.lineTo(72,50);g.lineTo(54,68);g.stroke();}
  else if(kind==='home'){g.moveTo(20,50);g.lineTo(50,22);g.lineTo(80,50);g.stroke();rr(g,28,46,44,32,4);g.stroke();circle(g,50,62,6,'#fff');}
  else if(kind==='chart'){[[24,56,18],[44,42,32],[64,28,46]].forEach(([bx,by,bh])=>{rr(g,bx,by,12,bh,4);g.fill();});}
  else if(kind==='clock'){g.arc(50,50,25,0,TAU);g.stroke();g.beginPath();g.moveTo(50,50);g.lineTo(50,35);g.moveTo(50,50);g.lineTo(62,57);g.stroke();}
  else if(kind==='heart'){g.moveTo(50,74);g.bezierCurveTo(16,52,24,22,50,38);g.bezierCurveTo(76,22,84,52,50,74);g.fill();}
  else if(kind==='chat'){rr(g,22,26,56,38,12);g.fill();g.beginPath();g.moveTo(34,62);g.lineTo(28,78);g.lineTo(48,62);g.fill();}
  else if(kind==='bolt'){g.moveTo(56,20);g.lineTo(30,56);g.lineTo(48,56);g.lineTo(42,80);g.lineTo(70,42);g.lineTo(52,42);g.closePath();g.fill();}
  else circle(g,50,50,16,'#fff');
  g.restore();}
// карточка с плиткой и подписью, пружинит снизу в момент ta; возвращает прогресс пружины
function tileCard(g,x,y,w,h,text,t,ta,o={}){const e=spring(t-ta,o.d||7);if(e<=0)return 0;
  x=clamp(x,60,1020-w);const yy=y+(1-e)*90,S=Math.min(100,h-40);g.globalAlpha=clamp((t-ta)/.15,0,1);
  card(g,x,yy,w,h,o);iconTile(g,o.icon||'dot',x+30,yy+(h-S)/2,S,o.col||PAL.coral);
  label(g,text,x+S+60,yy+h/2+4,{size:o.size||56,wt:800,col:o.ink||PAL.ink,maxW:w-S-90,base:'middle'});
  g.globalAlpha=1;return e;}

// ---------- счётчик, шкала, штамп, набор ----------
function countInt(t,ta,tb,from,to){return Math.round(lerp(from,to,eo(prog(t,ta,tb))));}
function gaugeColor(v,lo=40,hi=70){return v<lo?PAL.red:v<hi?PAL.orange:PAL.green;}
// карточка 380×260: кольцо-прогресс p 0..1 слева, число справа
function gaugeCard(g,x,y,t,ta,o={}){const e=spring(t-ta,8);if(e<=0)return;const p=clamp(o.p??1,0,1),col=o.col||PAL.green;
  g.save();g.translate(x,y);g.scale(e,e);card(g,-190,-130,380,260,{shadow:o.shadow});
  g.lineWidth=18;g.lineCap='round';g.strokeStyle=PAL.line;g.beginPath();g.arc(-95,0,68,0,TAU);g.stroke();
  if(p>0){g.strokeStyle=col;g.beginPath();g.arc(-95,0,68,-Math.PI/2,-Math.PI/2+p*TAU);g.stroke();}
  circle(g,-95,0,22,col);
  label(g,String(o.value??Math.round(p*100))+(o.suffix||''),75,30,{size:104,wt:900,col,align:'center',maxW:190});
  if(o.label)label(g,o.label,75,82,{size:30,wt:600,col:PAL.grey,align:'center',maxW:190});
  g.restore();}
// штамп с двойной рамкой: падает 1.5→1 за 0.2 с в момент ta
function stamp(g,x,y,text,t,ta,o={}){const se=prog(t,ta,ta+.2);if(se<=0)return 0;
  const w=o.w||300,h=o.h||120,col=o.col||PAL.green;x=clamp(x,60+w*.75,1020-w*.75);
  g.save();g.translate(x,y);g.rotate(o.rot??-.18);const s=lerp(1.5,1,eo(se));g.scale(s,s);g.globalAlpha=se;
  g.strokeStyle=col;g.lineWidth=8;rr(g,-w/2,-h/2,w,h,18);g.stroke();g.lineWidth=3;rr(g,-w/2+14,-h/2+14,w-28,h-28,12);g.stroke();
  const ws=splitWords(text),f=fitWords(g,ws,w-60,o.size||72,{wt:900,lines:1});
  g.font=font(900,f.s);g.fillStyle=col;g.textAlign='center';g.textBaseline='middle';g.fillText(ws.join(' '),0,4);
  g.textBaseline='alphabetic';g.restore();g.globalAlpha=1;return se;}
// моно-строка набирается посимвольно в плашке с курсором (ta..tb)
function typeLine(g,x,y,text,t,ta,tb,o={}){text=String(text).replace(/\u2014|\u2013/g,'-');
  const pa=eo(prog(t,ta-.1,ta+.15));if(pa<=0)return 0;const fam=o.fam||MONO,maxW=room(g,x,y,'center',o.maxW||880)-70;
  let s=o.size||40;g.font=font(600,s,fam);while(g.measureText(text).width>maxW&&s>14){s-=2;g.font=font(600,s,fam);}
  const uw=g.measureText(text).width,n=Math.floor(prog(t,ta,tb)*text.length),h=s*2,yy=y+(1-pa)*20,ac=o.stroke||PAL.coral;
  g.globalAlpha=pa;g.fillStyle=o.fill||'#fff';rr(g,x-uw/2-34,yy-h/2,uw+68,h,h/2);g.fill();g.strokeStyle=ac;g.lineWidth=4;g.stroke();
  const sub=text.slice(0,n);g.fillStyle=o.col||PAL.ink;g.textAlign='left';g.textBaseline='middle';g.fillText(sub,x-uw/2,yy+2);
  if(n<text.length||Math.floor(t*3)%2===0){g.fillStyle=ac;g.fillRect(x-uw/2+g.measureText(sub).width+4,yy-s*.5,4,s);}
  g.textBaseline='alphabetic';g.globalAlpha=1;return n;}

// ---------- экранные элементы ----------
function skeleton(g,x,y,w,n,col,o={}){const gap=o.gap||34,h=o.h||14;g.fillStyle=col;
  for(let r=0;r<n;r++){rr(g,x,y+r*gap,w*(r===n-1&&n>1?.6:1),h,h/2);g.fill();}}
// чат-пузыри из «строк-скелетов»: items [{ta,me,w,n}], пружина от угла пузыря
function chatStack(g,lt,items,o={}){let y=o.y??-290;const L=o.left??-190,R=o.right??190,me=o.me||PAL.coral;
  items.forEach(it=>{const e=spring(lt-it.ta,8),h=30+it.n*34,ax=it.me?R:L;
    if(e>0){g.save();g.translate(ax,y+h);g.scale(e,e);g.translate(-ax,-(y+h));const x=it.me?R-it.w:L;
      g.fillStyle=it.me?me:'#fff';rr(g,x,y,it.w,h,26);g.fill();
      if(!it.me){g.strokeStyle='rgba(21,19,43,.12)';g.lineWidth=3;g.stroke();}
      skeleton(g,x+22,y+22,it.w-44,it.n,it.me?'rgba(255,255,255,.85)':'rgba(21,19,43,.55)');g.restore();}
    y+=h+28;});}

// ---------- фирменные приёмы ----------
function halo(g,x,y,R,de,col,a=.16){if(de<=0)return;g.globalAlpha=a;circle(g,x,y,R*de,col);g.globalAlpha=1;}
// кольцо, плюс, квадрат, треугольник вращаются по эллипсу вокруг героя
function orbiters(g,x,y,R,t,th,o={}){const n=o.n||4,k=o.k??1;if(k<=0)return;
  for(let j=0;j<n;j++){const a=t*.35+j*TAU/n+(o.seed||0),px=x+Math.cos(a)*R*1.12,py=y+Math.sin(a)*R*1.15;
    g.save();g.translate(px,py);g.rotate(t*.8+j);g.globalAlpha=.5*Math.min(k,1);
    g.strokeStyle=g.fillStyle=j%2?th.ink:th.acc;g.lineWidth=7;const f=j%4;
    if(f===0){g.beginPath();g.arc(0,0,22,0,TAU);g.stroke();}
    else if(f===1){g.fillRect(-20,-4,40,8);g.fillRect(-4,-20,8,40);}
    else if(f===2)g.fillRect(-14,-14,28,28);
    else{g.beginPath();g.moveTo(0,-20);g.lineTo(18,14);g.lineTo(-18,14);g.closePath();g.stroke();}
    g.restore();}
  g.globalAlpha=1;}
function ripples(g,x,y,r0,t,col,o={}){const n=o.n||2,span=o.span||120,sp=o.speed||.7,a=o.a??.5;
  g.lineWidth=o.lw||5;g.strokeStyle=col;
  for(let q=0;q<n;q++){const p=(((t*sp)+q/n)%1+1)%1;g.globalAlpha=(1-p)*a;g.beginPath();g.arc(x,y,r0+p*span,0,TAU);g.stroke();}
  g.globalAlpha=1;}
function rippleOnce(g,x,y,r0,t,ta,col,o={}){const p=prog(t,ta,ta+(o.dur||.6));if(p<=0||p>=1)return;
  g.globalAlpha=1-p;g.strokeStyle=col;g.lineWidth=o.lw||6;g.beginPath();g.arc(x,y,r0+eo(p)*(o.span||60),0,TAU);g.stroke();g.globalAlpha=1;}
// уголки видоискателя сходятся 1.25→1 при p 0→1
function corners(g,cx,cy,hw,hh,p,col='#fff',o={}){if(p<=0)return;const k=1.25-.25*p,len=o.len||44;
  g.strokeStyle=col;g.globalAlpha=p;g.lineWidth=o.lw||7;g.lineCap='round';
  for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const X=cx+sx*hw*k,Y=cy+sy*hh*k;
    g.beginPath();g.moveTo(X,Y-sy*len);g.lineTo(X,Y);g.lineTo(X-sx*len,Y);g.stroke();}
  g.globalAlpha=1;}
function eqBars(g,x,y,t,col,o={}){const n=o.n||7,gap=o.gap||20,bw=o.w||10,amp=o.amp||24;g.fillStyle=col;
  for(let j=0;j<n;j++){const h=10+Math.abs(Math.sin(t*9+j*1.7))*amp;rr(g,x-(n-1)*gap/2+j*gap-bw/2,y-h/2,bw,h,bw/2);g.fill();}}
function trafficDots(g,x,y,active,le,o={}){if(le<=0)return;const c=o.cols||[PAL.green,PAL.orange,PAL.red];
  g.globalAlpha=le;c.forEach((col,j)=>circle(g,x+j*(o.gap||70),y,(j===active?30:20)*le,col));g.globalAlpha=1;}
// круговая шторка цвета следующей сцены из центра героя за dur до склейки C
function circleWipe(g,t,C,x,y,col,dur=.3){if(t<=C-dur||t>=C)return 0;const p=eio(prog(t,C-dur,C));
  circle(g,x,y,p*2300,col);return p;}
const flashK=(lt,dur=.18)=>1-prog(lt,0,dur);
function pointer(g,x,y,col=PAL.sun,a=1){if(a<=0)return;g.globalAlpha=.35*a;circle(g,x,y,34,col);g.globalAlpha=a;circle(g,x,y,16,col);g.globalAlpha=1;}
function pathDot(g,p,x0,y0,x1,y1,o={}){const q=eio(p),x=lerp(x0,x1,q)+Math.sin(q*Math.PI)*(o.bend??80),y=lerp(y0,y1,q);
  pointer(g,x,y,o.col||PAL.sun,o.a??1);return{x,y};}

// ---------- герои и предметы ----------
// устройство 460×940 (экран -212..212 × -452..452), drawScreen(g) рисует в локальных координатах
function device(g,pose,drawScreen,o={}){g.save();g.translate(pose.x,pose.y);g.rotate(pose.r||0);g.scale(pose.s,pose.s);
  const body=o.body||PAL.night;g.fillStyle='rgba(0,0,0,.18)';rr(g,-208,-440,460,940,64);g.fill();
  g.fillStyle=body;rr(g,-230,-470,460,940,64);g.fill();
  g.strokeStyle='rgba(255,255,255,.28)';g.lineWidth=4;rr(g,-224,-464,448,928,58);g.stroke();
  g.save();rr(g,-212,-452,424,904,46);g.clip();g.fillStyle=o.screen||PAL.paper;g.fillRect(-212,-452,424,904);
  const r=drawScreen?drawScreen(g):undefined;
  if(o.flash>0){g.fillStyle=`rgba(255,255,255,${o.flash*.7})`;g.fillRect(-212,-452,424,904);}
  g.restore();if(o.notch!==false){g.fillStyle=body;rr(g,-60,-444,120,30,15);g.fill();}
  g.restore();return r;}
// поза героя по сценам: пружина от позы прошлой сцены, на первой въезд снизу; poses [{x,y,s,r}]
function heroPose(t,cuts,poses,o={}){const sc=scene(t,cuts),P=j=>poses[j%poses.length],b=P(sc.i),
  a=sc.i?P(sc.i-1):(o.from||{x:b.x,y:2600,s:b.s,r:-.35}),p=spring(sc.lt,sc.i?6:9),bob=o.bob??7;
  return{x:lerp(a.x,b.x,p),y:lerp(a.y,b.y,p)+Math.sin(t*2.1)*bob,s:lerp(a.s,b.s,p),r:lerp(a.r||0,b.r||0,p)+Math.sin(t*1.3)*.008};}
// персонаж по пояс (центр головы 0,-60; высота ≈ -250…460 × s). o: skin hair shirt hairStyle(short|bun|cap|curly) glasses mood(smile|wow) seed
function person(g,x,y,s,t,o={}){const skin=o.skin||'#F2C7A5',hair=o.hair||'#5A3E36',ink=PAL.ink;
  g.save();g.translate(x,y);g.scale(s,s);
  g.fillStyle=o.neck||'#E9B894';g.fillRect(-35,40,70,90);
  g.fillStyle=o.shirt||PAL.violet;g.beginPath();g.ellipse(0,320,210,210,0,Math.PI,TAU);g.fill();g.fillRect(-210,318,420,140);
  g.fillStyle='rgba(0,0,0,.14)';g.beginPath();g.moveTo(-40,112);g.lineTo(0,170);g.lineTo(40,112);g.closePath();g.fill();
  if(o.hairStyle==='bun')circle(g,0,-200,42,hair);
  circle(g,0,-60,120,skin);g.fillStyle=hair;
  if(o.hairStyle==='cap'){g.beginPath();g.arc(0,-80,124,Math.PI,TAU);g.closePath();g.fill();rr(g,-20,-92,170,26,13);g.fill();}
  else if(o.hairStyle==='curly'){for(let j=0;j<7;j++)circle(g,-108+j*36,-130+Math.abs(3-j)*14,34,hair);}
  else{g.beginPath();g.arc(0,-70,128,Math.PI*1.05,Math.PI*1.95);g.closePath();g.fill();}
  g.fillStyle='rgba(230,57,70,.22)';[-70,70].forEach(q=>{g.beginPath();g.arc(q,-10,20,0,TAU);g.fill();});
  g.strokeStyle=ink;g.lineWidth=6;g.lineCap='round';
  if(o.glasses){[-45,45].forEach(q=>{g.beginPath();g.arc(q,-55,32,0,TAU);g.stroke();});
    g.beginPath();g.moveTo(-13,-55);g.lineTo(13,-55);g.stroke();}
  const bl=((t+(o.seed||0))%2.6)<.12?.2:1;g.fillStyle=ink;
  [-45,45].forEach(q=>{g.beginPath();g.ellipse(q,-55,7,7*bl,0,0,TAU);g.fill();});
  g.beginPath();if(o.mood==='wow'){g.ellipse(0,5,16,20,0,0,TAU);g.fill();}else{g.arc(0,-5,38,.2*Math.PI,.8*Math.PI);g.stroke();}
  g.restore();}
// полка с тремя предметами (банка, коробка, бутылка); o.pick 0..2 обводит выбранный цветом pickCol
function goods(g,x,y,s,t,o={}){const c=o.cols||[PAL.coral,PAL.blue,PAL.mint],ox=Math.sin(t*1.2)*5;
  g.save();g.translate(x+ox,y);g.scale(s,s);g.fillStyle=o.shelf||'#C9A77C';g.fillRect(-212,150,424,16);g.fillRect(-212,380,424,16);
  g.fillStyle=c[0];rr(g,-195,0,90,150,18);g.fill();g.fillStyle='#6B4F3A';rr(g,-190,-16,80,24,8);g.fill();
  g.fillStyle=c[1];rr(g,-60,-40,120,190,10);g.fill();g.fillStyle='#fff';rr(g,-45,20,90,40,8);g.fill();
  g.fillStyle=c[2];rr(g,115,-10,60,160,22);g.fill();rr(g,132,-50,26,50,8);g.fill();
  g.fillStyle='rgba(21,19,43,.12)';[-180,-60,60].forEach(q=>{rr(g,q,250,100,130,12);g.fill();});
  if(o.pick!=null){const bx=[-150,0,145][o.pick],bw=[110,156,86][o.pick];
    g.strokeStyle=o.pickCol||PAL.green;g.lineWidth=6;rr(g,bx-bw/2,-58,bw,226,18);g.stroke();}
  g.restore();}
// знак темы: скруглённый квадрат, инициалы o.text, искра в углу (центр 0,0, сторона s)
function mark(g,s,o={}){g.fillStyle=o.bg||'#fff';rr(g,-s/2,-s/2,s,s,s*.26);g.fill();
  const ws=splitWords(o.text||'A'),f=fitWords(g,ws,s*.62,s*.5,{wt:900,lines:1});
  g.font=font(900,f.s);g.fillStyle=o.col||PAL.ink;g.textAlign='center';g.textBaseline='middle';
  g.fillText(ws.join(' '),0,s*.04);g.textBaseline='alphabetic';
  if(o.spark!==false)star(g,s*.33,-s*.33,s*.12,s*.035,4,o.spark||PAL.sun);}

// ---------- звук ----------
// ev: [[t,'имя',громкость,pitch]], громкость .05….3, pitch .5…2
function sfx(s,ev){const D=s.duration||99;ev.slice().sort((a,b)=>a[0]-b[0]).forEach(e=>
  s.play(clamp(e[0],0,D-.05),e[1],clamp(e[2]??.12,.05,.3),{pitch:clamp(e[3]||1,.5,2)}));}
// на каждую склейку: run за 0.3 с до неё и wood сразу после
function cutSounds(cuts){const r=[];for(let i=1;i<cuts.length-1;i++){const c=cuts[i];
  r.push([c-.3,i%2?'marimba_run':'kalimba_run',.16],[c+.05,'wood',.12]);}return r;}

return{SANS,SERIF,MONO,PAL,THEMES,TAU,theme,clamp,lerp,prog,eo,eio,back,spring,springTo,settle,appear,leave,rng,
  cutsFromSubs,scene,rr,circle,ring,star,dotsTex,bg,camera,camEnd,thud,room,font,splitWords,fitWords,words,
  headline,caption,label,pill,card,iconTile,tileCard,countInt,gaugeColor,gaugeCard,stamp,typeLine,skeleton,
  chatStack,halo,orbiters,ripples,rippleOnce,corners,eqBars,trafficDots,circleWipe,flashK,pointer,pathDot,
  device,heroPose,person,goods,mark,sfx,cutSounds};
})();