// lib.js: стиль «Техно-фильм» (TECH). Глубокий чёрный космос с дышащими туманностями,
// мелкая точная продуктовая графика по центру, пунктирная шина с бегущим сигналом,
// моно-плашки, орбиты из точек, карточки-графы, белый жирный заголовок по словам с размытием.
const TECH = (() => {
const W=1080,H=1920,CX=540,CY=960,X0=60,X1=1020,TAU=Math.PI*2;
const F={sans:'"Inter Display","Inter",Roboto,"Helvetica Neue","Liberation Sans",Arial,system-ui,sans-serif',
  serif:'"DejaVu Serif",Georgia,"Noto Serif","Times New Roman",serif',
  mono:'"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace'};
// палитра (пипеткой по оригиналу)
const C={bg:'#050508',ink:'#F4F4F7',mut:'#8B8E9C',dim:'#4A4D5C',faint:'#262836',
  card:'#0F1018',card2:'#151722',edge:'#262838',
  amber:'#F5A646',orange:'#F27B52',pink:'#EC5A7E',rose:'#F0606A',violet:'#9A6BF5',blue:'#4BA8F5',
  cyan:'#2FD6F2',green:'#34E3A0',red:'#F05A6A',dark:'#07080C'};
const GRAD=['#F5A646','#EC5A7E','#9A6BF5','#4BA8F5'];
// туманности: цвета пятен по настроению сцены
const MOODS={
  night:[['#3a2a78',.55,-260,-120,820],['#0c4a52',.55,240,120,760],['#1a1c40',.4,0,300,900]],
  amber:[['#6a4210',.65,-200,-60,760],['#3a2470',.5,260,180,820],['#20160a',.5,0,-300,700]],
  rose:[['#5a1426',.65,-120,0,780],['#5a3a10',.45,260,200,700],['#2a1240',.4,-260,-260,700]],
  blue:[['#163a6a',.6,140,-80,780],['#3a2470',.55,-220,160,760],['#0c4a52',.4,-200,-260,640]],
  teal:[['#0c4a4a',.6,-200,-160,760],['#2a2470',.5,240,160,760],['#0a3a2a',.4,0,320,700]],
  green:[['#0a4a36',.65,0,-60,820],['#0c3a52',.5,-240,240,700],['#1a1c40',.35,260,-260,700]],
  aura:[['#5a1c4a',.7,0,-40,800],['#3a2478',.6,180,160,760],['#5a1c1c',.4,-220,180,640]]};
let READY=false,BLOB=null,GRID=null,STARS=null;const GL={};

// ---------- время, изинги
function clamp(x,a=0,b=1){return x<a?a:x>b?b:x;}
function prog(t,a,b){if(b<=a)return t>=b?1:0;return clamp((t-a)/(b-a));}
function lerp(a,b,p){return a+(b-a)*p;}
function eo(p){p=clamp(p);return 1-Math.pow(1-p,3);}
function eo5(p){p=clamp(p);return 1-Math.pow(1-p,5);}
function ei(p){p=clamp(p);return p*p*p;}
function eio(p){p=clamp(p);return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;}
function back(p,s=1.4){p=clamp(p);const c=s+1;return 1+c*Math.pow(p-1,3)+s*Math.pow(p-1,2);}
function spring(p){if(p<=0)return 0;if(p>=1.4)return 1;return 1-Math.exp(-6*p)*Math.cos(8*p);}
function vis(t,t0,t1,din=.35){return eo(prog(t,t0,t0+din))*(t1==null?1:1-eo(prog(t,t1-din/1.4,t1)));}
function rng(seed){let s=seed|0;return function(){s=s+0x6D2B79F5|0;let x=Math.imul(s^s>>>15,1|s);
  x=x+Math.imul(x^x>>>7,61|x)^x;return((x^x>>>14)>>>0)/4294967296;};}
function typed(s,p){s=String(s);return s.slice(0,Math.round(clamp(p)*s.length));}
function countTo(t,t0,t1,n,from=0){return Math.round(lerp(from,n,eio(prog(t,t0,t1))));}
function fmt(n){return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,' ');}
function col(c){return C[c]||c;}
const HX=new Map();function hexA(h,a){h=col(h);const k=h+a;let r=HX.get(k);if(r)return r;const n=parseInt(h.slice(1),16);r='rgba('+(n>>16)+','+(n>>8&255)+','+(n&255)+','+a+')';if(HX.size>4000)HX.clear();HX.set(k,r);return r;}

// ---------- подготовка: спрайты пятна, свечения, сетка, звёзды
function init(){if(READY)return;READY=true;
  BLOB=new OffscreenCanvas(256,256);let b=BLOB.getContext('2d');
  let gr=b.createRadialGradient(128,128,0,128,128,128);
  gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(255,255,255,.55)');
  gr.addColorStop(.7,'rgba(255,255,255,.14)');gr.addColorStop(1,'rgba(255,255,255,0)');
  b.fillStyle=gr;b.fillRect(0,0,256,256);
  // перспективная сетка: лучи из точки схода + редкие горизонтали
  GRID=new OffscreenCanvas(W,H);const q=GRID.getContext('2d');q.strokeStyle='rgba(150,160,200,.06)';q.lineWidth=1.2;
  q.beginPath();for(let i=-14;i<=14;i++){q.moveTo(CX,CY-80);q.lineTo(CX+i*190,H+200);q.moveTo(CX,CY-80);q.lineTo(CX+i*190,-400);}
  q.stroke();q.globalCompositeOperation='destination-out';
  gr=q.createRadialGradient(CX,CY,0,CX,CY,700);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(.6,'rgba(0,0,0,.6)');gr.addColorStop(1,'rgba(0,0,0,0)');
  q.fillStyle=gr;q.fillRect(0,0,W,H);
  STARS=new OffscreenCanvas(W,H);const s=STARS.getContext('2d');const r=rng(7);
  for(let i=0;i<160;i++){const x=r()*W,y=r()*H,a=.08+r()*.3,rr=r()<.1?1.8:1.1;s.fillStyle='rgba(210,215,240,'+a+')';s.beginPath();s.arc(x,y,rr,0,TAU);s.fill();}
}
function glowSprite(c){c=col(c);if(GL[c])return GL[c];const o=new OffscreenCanvas(128,128),x=o.getContext('2d');
  const gr=x.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,hexA(c,1));gr.addColorStop(.25,hexA(c,.45));gr.addColorStop(1,hexA(c,0));
  x.fillStyle=gr;x.fillRect(0,0,128,128);GL[c]=o;return o;}
function glow(g,x,y,r,c,a){if(a<=0)return;const a0=g.globalAlpha;g.globalAlpha=a0*clamp(a);g.drawImage(glowSprite(c),x-r,y-r,r*2,r*2);g.globalAlpha=a0;}
function tintBlob(c){c=col(c);const k='b'+c;if(GL[k])return GL[k];const o=new OffscreenCanvas(256,256),x=o.getContext('2d');
  x.drawImage(BLOB,0,0);x.globalCompositeOperation='source-atop';x.fillStyle=c;x.fillRect(0,0,256,256);GL[k]=o;return o;}

// ---------- фон: чёрный, туманности дышат и плывут; mood: имя или [[имя,вес],...]
// туманности рисуются в малый холст 216×384 и растягиваются (мягкость бесплатно), сетка+звёзды+виньетка одним спрайтом
let NEB=null;
function bg(g,t,mood){init();if(!NEB){NEB=new OffscreenCanvas(216,384);
    const o=new OffscreenCanvas(W,H),q=o.getContext('2d');q.drawImage(GRID,0,0);q.globalAlpha=.9;q.drawImage(STARS,0,0);q.globalAlpha=1;
    const v=q.createRadialGradient(CX,CY-80,420,CX,CY-80,1250);v.addColorStop(0,'rgba(5,5,8,0)');v.addColorStop(1,'rgba(3,3,5,.92)');q.fillStyle=v;q.fillRect(0,0,W,H);GRID=o;}
  const n=NEB.getContext('2d'),sc=216/W;n.globalCompositeOperation='source-over';n.globalAlpha=1;n.fillStyle=C.bg;n.fillRect(0,0,216,384);
  const list=typeof mood==='string'?[[mood,1]]:mood;n.globalCompositeOperation='lighter';
  list.forEach(([m,wt])=>{if(wt<=0.01)return;(MOODS[m]||MOODS.night).forEach(([c,a,dx,dy,r],i)=>{
    const br=1+.08*Math.sin(t*.55+i*2.1),x=CX+dx+Math.sin(t*.13+i*1.7)*60,y=CY-140+dy+Math.cos(t*.11+i)*50,R=r*br;
    n.globalAlpha=a*wt*(.85+.15*Math.sin(t*.4+i));n.drawImage(tintBlob(c),(x-R)*sc,(y-R*1.15)*sc,R*2*sc,R*2.3*sc);});});
  g.imageSmoothingEnabled=true;g.drawImage(NEB,0,0,W,H);
  g.drawImage(GRID,Math.round(Math.sin(t*.05)*10),Math.round(Math.cos(t*.04)*8));}
// плавный переход настроения фона: keys=[[t,'mood'],...], кроссфейд 0.8 с
function moodAt(t,keys,d=.8){let i=0;while(i<keys.length-1&&t>=keys[i+1][0])i++;
  const cur=keys[i][1],p=i>0?prog(t,keys[i][0],keys[i][0]+d):1;if(p>=1||i===0)return[[cur,1]];return[[keys[i-1][1],1-p],[cur,p]];}

// ---------- шрифты и текст
function font(g,wt,size,fam){g.font=wt+' '+Math.round(size)+'px '+(F[fam||'sans']||fam);}
function tw(g,s){return g.measureText(s).width;}
function fit(g,s,wt,size,maxW,fam){let fs=size;font(g,wt,fs,fam);let w=tw(g,s);
  if(w>maxW){fs=Math.max(18,Math.floor(fs*maxW/w));font(g,wt,fs,fam);}return fs;}
function gradFill(g,x0,x1){const gr=g.createLinearGradient(x0,0,x1,0);GRAD.forEach((c,i)=>gr.addColorStop(i/(GRAD.length-1),c));return gr;}
// моно с разрядкой (без letterSpacing: по буквам)
function spaced(g,s,x,y,o={}){s=String(s);const size=o.size||40,sp=o.sp==null?size*.12:o.sp,wt=o.weight||500;
  font(g,wt,size,'mono');const cw=tw(g,'0');let w=s.length*cw+(s.length-1)*sp;
  let k=1;if(w>X1-X0){k=(X1-X0)/w;}
  const l=o.align==='center'?x-w*k/2:o.align==='right'?x-w*k:x;if(o.measure)return w*k;
  const a0=g.globalAlpha;if(o.a!=null)g.globalAlpha=a0*clamp(o.a);g.fillStyle=o.grad?gradFill(g,l,l+w*k):col(o.color||'mut');g.textAlign='left';
  g.save();g.translate(l,y);g.scale(k,k);for(let i=0;i<s.length;i++)g.fillText(s[i],i*(cw+sp),0);g.restore();g.globalAlpha=a0;return w*k;}
function mono(g,s,x,y,o={}){s=String(s);const fs=fit(g,s,o.weight||500,o.size||40,o.maxW||(X1-X0),'mono'),w=tw(g,s);
  let l=o.align==='center'?x-w/2:o.align==='right'?x-w:x;l=clamp(l,X0,X1-w);
  const a0=g.globalAlpha;if(o.a!=null)g.globalAlpha=a0*clamp(o.a);g.textAlign='left';
  g.fillStyle=o.grad?gradFill(g,l,l+w):col(o.color||'ink');g.fillText(s,l,y);g.globalAlpha=a0;return{w,fs,x:l};}
// перенос слов по ширине
function wrap(g,s,maxW){const ws=String(s).split(' ');const L=[];let cur='';
  ws.forEach(w=>{const n=cur?cur+' '+w:w;if(cur&&tw(g,n)>maxW){L.push(cur);cur=w;}else cur=n;});if(cur)L.push(cur);return L;}

// ЗАГОЛОВОК: белый жирный гротеск, 1-3 короткие строки по центру, появляется по словам снизу с размытием.
// lines: ['Одна точка.','Любой прибор.']; o: {t,t0,t1,y,size(80),step(.09),acc:{lineIdx:wordIdx|'all'},lineGap(.35)}
function title(g,lines,o){const t=o.t,size=o.size||82,lh=size*1.08,y0=o.y||1300,step=o.step||.09,lgap=o.lineGap==null?.3:o.lineGap;
  if(typeof lines==='string')lines=[lines];
  let fs=size;font(g,700,fs,'sans');const mw=Math.max(...lines.map(l=>tw(g,l)));if(mw>X1-X0-20){fs=Math.floor(fs*(X1-X0-20)/mw);font(g,700,fs,'sans');}
  const sw=tw(g,' '),out=o.t1==null?0:eo(prog(t,o.t1-.32,o.t1));let k=0;
  lines.forEach((ln,li)=>{const ws=ln.split(' '),ww=ws.map(w=>tw(g,w)),tot=ww.reduce((a,b)=>a+b,0)+sw*(ws.length-1);
    let x=CX-tot/2;const y=y0+li*fs*1.08;
    ws.forEach((w,wi)=>{const st=o.t0+li*lgap+k*step,p=eo5(prog(t,st,st+.55));k++;
      const a=clamp(p*1.4)*(1-out);if(a>0){const dy=(1-p)*fs*.55+out*fs*.25;
        const acc=o.acc&&(o.acc[li]===wi||o.acc[li]==='all');
        g.textAlign='left';g.fillStyle=acc?gradFill(g,x,x+ww[wi]):C.ink;
        // размытие движения: две призрачные копии
        const bl=(1-p)+out;if(bl>.04){g.globalAlpha=a*.22;g.fillText(w,x,y+dy-fs*.12*bl);g.fillText(w,x,y+dy+fs*.12*bl);}
        g.globalAlpha=a*(1-.35*bl);g.fillText(w,x,y+dy);g.globalAlpha=1;}
      x+=ww[wi]+sw;});});
  return {fs,h:lines.length*fs*1.08};}
// ПОДПИСЬ-ФОРМУЛА: «узел() · 24 прибора»: моно-градиент + точка + жирный белый
function formula(g,code,rest,y,o={}){const t=o.t,a=vis(t,o.t0,o.t1,.45),p=eo5(prog(t,o.t0,o.t0+.6));if(a<=0)return;
  const size=o.size||72;font(g,600,size,'mono');const cw=tw(g,code);font(g,700,size,'sans');const rw=tw(g,rest);
  const gap=size*.55,tot=cw+gap+rw,k=Math.min(1,(X1-X0)/tot),x=CX-tot*k/2,dy=(1-p)*40;
  g.save();g.translate(x,y+dy);g.scale(k,k);g.globalAlpha=a;font(g,600,size,'mono');g.fillStyle=gradFill(g,0,cw);g.textAlign='left';g.fillText(code,0,0);
  g.fillStyle=C.dim;g.beginPath();g.arc(cw+gap/2,-size*.3,size*.07,0,TAU);g.fill();
  font(g,700,size,'sans');g.fillStyle=C.ink;g.fillText(rest,cw+gap,0);g.restore();g.globalAlpha=1;}

// ---------- примитивы интерфейса
function rr(g,x,y,w,h,r){r=Math.min(r,h/2,w/2);g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
// карточка: тёмная, тонкая кромка; edge: цвет активной кромки, bar: полоса прогресса снизу [p, цвет]
function card(g,x,y,w,h,o={}){const a=o.a==null?1:o.a;if(a<=0)return;const a0=g.globalAlpha;g.globalAlpha=a0*clamp(a);
  if(o.halo)glow(g,x+w/2,y+h/2,Math.max(w,h)*.75,o.halo,.18);
  rr(g,x,y,w,h,o.r||16);g.fillStyle=o.fill||'rgba(14,15,23,.94)';g.fill();
  g.lineWidth=o.lw||2;g.strokeStyle=o.edge?col(o.edge):C.edge;g.stroke();
  if(o.bar){const[p,c]=o.bar;g.fillStyle=col(c);rr(g,x+10,y+h-6,Math.max(6,(w-20)*clamp(p)),4,2);g.fill();}
  g.globalAlpha=a0;}
// значок-плашка: заливка цветом, тёмный моно-текст КАПСОМ (DONE, AG-UI, RUN_FINISHED)
function tag(g,s,x,y,o={}){const a=o.a==null?1:o.a;if(a<=0)return 0;const size=o.size||40,padX=size*.45,h=size*1.45;
  const w=spaced(g,s,0,0,{size,sp:o.sp==null?size*.06:o.sp,weight:700,measure:true})+padX*2;
  const l=o.align==='left'?x:o.align==='right'?x-w:x-w/2,s0=o.pop==null?1:lerp(.8,1,back(o.pop));
  g.save();g.globalAlpha*=clamp(a);g.translate(l+w/2,y);g.scale(s0,s0);
  rr(g,-w/2,-h/2,w,h,o.r||8);if(o.outline){g.fillStyle=hexA(o.color||'cyan',.1);g.fill();g.lineWidth=2.5;g.strokeStyle=col(o.color||'cyan');g.stroke();}
  else{g.fillStyle=col(o.color||'cyan');g.fill();}
  spaced(g,s,-w/2+padX,size*.36,{size,sp:o.sp==null?size*.06:o.sp,weight:700,color:o.outline?(o.color||'cyan'):(o.ink||C.dark)});g.restore();return w;}
// метка-ярлык прибора: тёмный бокс с белым моно-текстом (как «openai» у орбиты)
function label(g,s,x,y,o={}){const a=o.a==null?1:o.a;if(a<=0)return;const size=o.size||42;font(g,600,size,'mono');
  const w=tw(g,s)+size*.7,h=size*1.45;let l=clamp(x-w/2,X0,X1-w);
  g.save();g.globalAlpha*=clamp(a);rr(g,l,y-h/2,w,h,8);g.fillStyle='rgba(12,13,20,.96)';g.fill();g.strokeStyle=C.faint;g.lineWidth=2;g.stroke();
  g.fillStyle=col(o.color||'ink');g.textAlign='left';g.fillText(s,l+size*.35,y+size*.36);g.restore();}
// ряд вкладок-модальностей: моно КАПС, активная с розовой кромкой
function tabs(g,list,active,y,o={}){const a=o.a==null?1:o.a;if(a<=0)return;const size=o.size||40,gap=16;
  const ws=list.map(s=>spaced(g,s,0,0,{size,sp:size*.12,measure:true})+size*1.1);const tot=ws.reduce((p,c)=>p+c,0)+gap*(list.length-1);
  const k=Math.min(1,(X1-X0)/tot);let x=CX-tot*k/2;g.save();g.globalAlpha*=clamp(a);
  list.forEach((s,i)=>{const w=ws[i]*k,on=i===active,h=size*1.5;rr(g,x,y-h/2,w,h,h/2);
    g.fillStyle=on?hexA(o.color||'pink',.14):'rgba(20,21,30,.6)';g.fill();g.lineWidth=2;g.strokeStyle=on?col(o.color||'pink'):C.faint;g.stroke();
    g.save();g.translate(x+w/2,y);g.scale(k,k);spaced(g,s,0,size*.36,{size,sp:size*.12,weight:on?700:500,align:'center',color:on?C.ink:C.dim});g.restore();
    x+=w+gap;});g.restore();}
// тонкая полоса прогресса
function progress(g,x,y,w,p,c='green',o={}){const a0=g.globalAlpha;if(o.a!=null)g.globalAlpha*=clamp(o.a);
  g.fillStyle=C.faint;rr(g,x,y,w,6,3);g.fill();g.fillStyle=col(c);rr(g,x,y,Math.max(6,w*clamp(p)),6,3);g.fill();g.globalAlpha=a0;}
// мигающая каретка
function caret(g,x,y,h,t,c='violet',a=1){if(Math.floor(t*2.2)%2&&a>=1)return;const a0=g.globalAlpha;g.globalAlpha*=a;g.fillStyle=col(c);g.fillRect(x+3,y-h*.82,4,h);g.globalAlpha=a0;}

// ---------- ШИНА: тонкая цветная линия + бегущие белые штрихи (сигнал). dir 1 = от начала к концу.
// o: {col, a, speed(px/с), dash, gap, from, to (доля прорисовки 0..1), lit (0..1 доля «зажжённой» части), dots (пунктир после lit)}
function bus(g,x0,y0,x1,y1,t,o={}){const a=o.a==null?1:o.a;if(a<=0)return;const L=Math.hypot(x1-x0,y1-y0),ux=(x1-x0)/L,uy=(y1-y0)/L;
  const from=(o.from||0)*L,to=(o.to==null?1:o.to)*L;if(to<=from)return;
  g.save();g.globalAlpha*=clamp(a);g.lineCap='round';
  const lit=o.lit==null?1:o.lit,LL=from+(to-from)*lit;
  // базовая линия
  g.strokeStyle=hexA(o.col||'violet',.75);g.lineWidth=o.w||2.5;g.beginPath();g.moveTo(x0+ux*from,y0+uy*from);g.lineTo(x0+ux*LL,y0+uy*LL);g.stroke();
  // штрихи едут
  const dash=o.dash||30,gap=o.gap||46,per=dash+gap,off=((t*(o.speed||120))%per+per)%per;g.strokeStyle='rgba(240,240,248,.85)';g.lineWidth=(o.w||2.5)+1.5;g.beginPath();
  for(let s=from-per+off;s<LL;s+=per){const s0=Math.max(from,s),s1=Math.min(LL,s+dash);if(s1>s0){g.moveTo(x0+ux*s0,y0+uy*s0);g.lineTo(x0+ux*s1,y0+uy*s1);}}
  g.stroke();
  // после lit: точечный пунктир (ещё не пройдено)
  if(lit<1&&o.dots!==false){g.fillStyle='rgba(160,165,190,.45)';for(let s=LL+18;s<to;s+=18){g.beginPath();g.arc(x0+ux*s,y0+uy*s,2,0,TAU);g.fill();}}
  g.restore();}
// узел-точка: кольцо с ядром (ring-dot). lit 0..1: подсветка
function node(g,x,y,c='amber',a=1,o={}){if(a<=0)return;const r=o.r||11,lit=o.lit==null?1:o.lit;const a0=g.globalAlpha;g.globalAlpha=a0*clamp(a);
  if(lit>0&&o.halo!==false)glow(g,x,y,r*3.2,c,.35*lit);
  g.lineWidth=2.5;g.strokeStyle=lit>0?col(c):C.dim;g.globalAlpha=a0*clamp(a)*(lit>0?lerp(.5,1,lit):.7);g.beginPath();g.arc(x,y,r,0,TAU);g.stroke();
  g.fillStyle=lit>0?col(c):C.dim;g.beginPath();g.arc(x,y,r*.38,0,TAU);g.fill();g.globalAlpha=a0;}
// яркая белая точка (головка сигнала, узел-звезда)
function spark(g,x,y,s=1,c='#ffffff'){glow(g,x,y,46*s,'#c9c4ff',.55);glow(g,x,y,18*s,c,.9);g.fillStyle='#fff';g.beginPath();g.arc(x,y,6*s,0,TAU);g.fill();}

// ---------- кривые
function bez(p0,p1,p2,p3,u){const v=1-u;return[v*v*v*p0[0]+3*v*v*u*p1[0]+3*v*u*u*p2[0]+u*u*u*p3[0],v*v*v*p0[1]+3*v*v*u*p1[1]+3*v*u*u*p2[1]+u*u*u*p3[1]];}
function curve(g,p0,p1,p2,p3,p,c='violet',w=2.5,a=1){if(p<=0||a<=0)return;g.save();g.globalAlpha*=clamp(a);g.strokeStyle=col(c);g.lineWidth=w;g.lineCap='round';g.beginPath();g.moveTo(p0[0],p0[1]);
  const n=Math.max(2,Math.ceil(28*clamp(p)));for(let i=1;i<=n;i++){const q=bez(p0,p1,p2,p3,clamp(p)*i/n);g.lineTo(q[0],q[1]);}g.stroke();g.restore();}
// S-кривая между двумя точками (горизонтальная касательная, как в графе агентов)
function link(g,a,b,p,c,w,al,vert){const d=vert?(b[1]-a[1])*.55:(b[0]-a[0])*.55;
  const P1=vert?[a[0],a[1]+d]:[a[0]+d,a[1]],P2=vert?[b[0],b[1]-d]:[b[0]-d,b[1]];curve(g,a,P1,P2,b,p,c,w||2.5,al);return[a,P1,P2,b];}
function flow(g,P,u,c='white',s=.7){const q=bez(P[0],P[1],P[2],P[3],clamp(u));glow(g,q[0],q[1],20*s,c,.7);g.fillStyle='#fff';g.beginPath();g.arc(q[0],q[1],4.5*s,0,TAU);g.fill();}

// ---------- характерные элементы оригинала
// ЗВЕЗДА-ГРАФ: белый центр, цветные лучи к кольцам-узлам, вторичные ветки с бусинами. p 0..1 рост, t для дыхания
function starGraph(g,cx,cy,t,p,o={}){if(p<=0)return[];const R=o.r||330,n=o.n||8,r=rng(o.seed||3),out=[];const cols=o.cols||['cyan','amber','rose','violet'];
  const ex=o.ex||0;g.save();g.globalAlpha*=clamp(o.a==null?1:o.a);
  // тонкий эллипс-орбита
  g.strokeStyle=hexA('#8090c0',.12*clamp(p*2));g.lineWidth=2;g.beginPath();g.ellipse(cx,cy,R*1.35,R*1.2,0,0,TAU);g.stroke();
  for(let i=0;i<n;i++){const an=i/n*TAU+r()*.5+t*.03,rad=R*(.55+r()*.45)*(1+ex*.6),c=cols[i%cols.length],pi=eo5(prog(p,i*.05,.55+i*.05));
    const x=cx+Math.cos(an)*rad*pi,y=cy+Math.sin(an)*rad*pi*.95;g.strokeStyle=hexA(col(c),.75);g.lineWidth=2.5;g.beginPath();g.moveTo(cx,cy);g.lineTo(x,y);g.stroke();
    node(g,x,y,c,pi,{r:12});out.push([x,y,c]);
    // ветка второго уровня
    const sp=eo5(prog(p,.4+i*.05,.95+i*.05));if(sp>0&&o.depth!==1){const an2=an+(r()-.5)*1.4,l2=R*(.3+r()*.25)*sp,x2=x+Math.cos(an2)*l2,y2=y+Math.sin(an2)*l2,c2=cols[(i+1)%cols.length];
      g.strokeStyle=hexA(col(c2),.6);g.lineWidth=2;g.beginPath();g.moveTo(x,y);g.lineTo(x2,y2);g.stroke();
      g.fillStyle='rgba(230,230,245,.7)';for(let b=1;b<3;b++){g.beginPath();g.arc(lerp(x,x2,b/3),lerp(y,y2,b/3),2.5,0,TAU);g.fill();}
      node(g,x2,y2,c2,sp,{r:10});}}
  g.restore();spark(g,cx,cy,1.1*clamp(p*3));return out;}
// ОРБИТА: эллипс из колец-узлов вокруг плашки, лит. lit: сколько зажжено (0..n). Возвращает позиции
function orbit(g,cx,cy,rx,ry,n,lit,t,o={}){const a=o.a==null?1:o.a;if(a<=0)return[];const P=[],rot=o.rot==null?t*.05:o.rot;g.save();g.globalAlpha*=clamp(a);
  g.strokeStyle='rgba(160,160,190,.14)';g.lineWidth=2;g.beginPath();g.ellipse(cx,cy,rx,ry,0,0,TAU);g.stroke();
  for(let i=0;i<n;i++){const an=i/n*TAU+rot,x=cx+Math.cos(an)*rx,y=cy+Math.sin(an)*ry,on=clamp(lit-i),ap=eo(prog(o.grow==null?1:o.grow,i/n*.6,i/n*.6+.4));
    node(g,x,y,o.col||'amber',ap,{r:o.r||11,lit:on,halo:on>0&&on<1});P.push([x,y]);}
  g.restore();return P;}
// ПЛАШКА-ФУНКЦИЯ: моно-текст градиентом в тёмном боксе (как chat())
function plaque(g,s,cx,cy,o={}){const a=o.a==null?1:o.a;if(a<=0)return;const size=o.size||120;font(g,600,size,'mono');const w=tw(g,s)+size*.75,h=size*1.45,k=Math.min(1,(X1-X0)/w);
  const sc=(o.pop==null?1:lerp(.86,1,back(o.pop)))*k;g.save();g.globalAlpha*=clamp(a);g.translate(cx,cy);g.scale(sc,sc);
  glow(g,0,0,w*.9,o.halo||'amber',.22);rr(g,-w/2,-h/2,w,h,size*.2);g.fillStyle='rgba(14,15,22,.96)';g.fill();g.lineWidth=2;g.strokeStyle=C.edge;g.stroke();
  font(g,600,size,'mono');g.textAlign='left';g.fillStyle=gradFill(g,-w/2+size*.37,w/2-size*.37);g.fillText(s,-w/2+size*.37,size*.36);g.restore();return{w:w*sc,h:h*sc};}
// ПОЛЕ ВВОДА с печатью: «› текст|»
function input(g,cx,cy,w,s,p,t,o={}){const a=o.a==null?1:o.a;if(a<=0)return;const size=o.size||48,h=size*2.1,x=cx-w/2;
  card(g,x,cy-h/2,w,h,{a,r:14});g.save();g.globalAlpha*=clamp(a);font(g,500,size,'mono');g.fillStyle=C.dim;g.textAlign='left';
  let tx=x+size*.6;if(o.prompt!==false){g.fillText('›',tx,cy+size*.36);tx+=size*.9;}
  const vis=typed(s,p);g.fillStyle=C.ink;fit(g,s,500,size,w-(tx-x)-size*.7,'mono');g.fillText(vis,tx,cy+size*.36);caret(g,tx+tw(g,vis),cy+size*.36,size*1.05,t,o.caret||'pink');g.restore();}
// ВОЛНА из столбиков (синие с фиолетовым низом). morph 0..1: из строки в волну; grow 0..1: высота
function wave(g,cx,cy,w,h,t,o={}){const a=o.a==null?1:o.a;if(a<=0)return;const n=o.n||28,bw=w/n,grow=o.grow==null?1:o.grow;g.save();g.globalAlpha*=clamp(a);
  if(o.box!==false){card(g,cx-w/2-24,cy-h*.28,w+48,h*.56,{r:14});}
  for(let i=0;i<n;i++){const u=i/(n-1),env=.35+.65*Math.sin(Math.PI*u),k=.5+.5*Math.sin(t*6+i*1.3)*Math.cos(t*2.3+i*.7);
    const reveal=clamp((grow*1.3-u*.3)/1),bh=Math.max(bw*.5,h*env*(.35+.65*Math.abs(k))*reveal),x=cx-w/2+i*bw+bw*.2;
    const gr=g.createLinearGradient(0,cy-bh/2,0,cy+bh/2);gr.addColorStop(0,o.c1||C.blue);gr.addColorStop(1,o.c2||C.violet);g.fillStyle=gr;
    rr(g,x,cy-bh/2,bw*.6,bh,bw*.3);g.fill();}g.restore();}
// КАРТИНКА-ГРАДИЕНТ: небо фиолет→розовый→янтарь, солнце (sunCol цвет, sun 0..1 позиция), силуэт (kind:'city'|'houses'); edge: кромка
function picture(g,x,y,w,h,t,o={}){const a=o.a==null?1:o.a;if(a<=0)return;g.save();g.globalAlpha*=clamp(a);
  rr(g,x,y,w,h,14);g.save();g.clip();
  const sk=g.createLinearGradient(0,y,0,y+h);sk.addColorStop(0,'#2a1a6a');sk.addColorStop(.45,'#9a5ad8');sk.addColorStop(.75,'#f0708a');sk.addColorStop(1,'#f5a646');g.fillStyle=sk;g.fillRect(x,y,w,h);
  const sx=x+w*(o.sun==null?.55:o.sun),sy=y+h*.5;glow(g,sx,sy,h*.55,o.sunCol||'#ffd9b0',.6);g.fillStyle=o.sunCol?mix(o.sunCol,'#ffffff',.25):'#fff0d8';g.beginPath();g.arc(sx,sy,h*.17,0,TAU);g.fill();
  const r=rng(o.seed||11);g.fillStyle='#0b0a14';let cx=x;
  while(cx<x+w){const bw=w*(.05+r()*.07),bh=h*(.2+r()*.35);
    if(o.kind==='houses'){g.beginPath();g.moveTo(cx,y+h);g.lineTo(cx,y+h-bh*.7);g.lineTo(cx+bw/2,y+h-bh);g.lineTo(cx+bw,y+h-bh*.7);g.lineTo(cx+bw,y+h);g.fill();}
    else g.fillRect(cx,y+h-bh,bw-3,bh);
    // окна
    for(let k=0;k<3;k++){if(r()<.55){const wx=cx+bw*(.2+r()*.5),wy=y+h-bh*(.2+r()*.4),on=.6+.4*Math.sin(t*2+k+cx);g.fillStyle='rgba(245,166,70,'+on+')';g.fillRect(wx,wy,5,6);g.fillStyle='#0b0a14';}}
    cx+=bw;}
  g.restore();rr(g,x,y,w,h,14);g.lineWidth=4;g.strokeStyle=col(o.edge||'pink');g.stroke();g.restore();}
// ЛЕНТА КАДРОВ: n маленьких картинок на перфорированной ленте, сдвиг shift (кадров)
function filmstrip(g,cx,cy,fw,fh,n,t,o={}){const a=o.a==null?1:o.a;if(a<=0)return;const gap=10,tot=n*fw+(n-1)*gap,x0=cx-tot/2;g.save();g.globalAlpha*=clamp(a);
  g.fillStyle='rgba(10,10,16,.9)';g.fillRect(x0-14,cy-fh/2-26,tot+28,fh+52);
  g.fillStyle='rgba(200,200,220,.35)';for(let x=x0;x<x0+tot;x+=24){g.fillRect(x,cy-fh/2-18,10,6);g.fillRect(x,cy+fh/2+12,10,6);}
  for(let i=0;i<n;i++){const ap=eo(prog(o.grow==null?1:o.grow,i*.08,i*.08+.4));if(ap<=0)continue;g.globalAlpha=a*ap;
    picture(g,x0+i*(fw+gap),cy-fh/2,fw,fh,t,{kind:o.kind,sun:.15+i/(n-1)*.7,seed:o.seed||11,edge:o.edge||'#3a3050'});}
  g.restore();}
// СХЛОПЫВАНИЕ: цветные изогнутые штрихи летят к центру (p 0..1), затем вспышка
function implode(g,cx,cy,p,o={}){if(p<=0||p>=1)return;const n=o.n||26,r=rng(o.seed||5),cols=['amber','pink','violet','blue','cyan','green','rose'];
  g.save();g.lineCap='round';g.globalCompositeOperation='lighter';
  for(let i=0;i<n;i++){const an=i/n*TAU+r()*.3,d0=(700+r()*500)*(1-eo(p)),len=120+r()*200,cv=(r()-.5)*.6;
    const d1=d0+len*(1-p*.7),c=cols[i%cols.length];g.strokeStyle=col(c);g.lineWidth=3;g.globalAlpha=clamp(p*4)*(1-ei(prog(p,.8,1)));
    const x0=cx+Math.cos(an)*d0,y0=cy+Math.sin(an)*d0,x1=cx+Math.cos(an+cv)*d1,y1=cy+Math.sin(an+cv)*d1,mx=cx+Math.cos(an+cv*.4)*(d0+d1)/2,my=cy+Math.sin(an+cv*.4)*(d0+d1)/2;
    g.beginPath();g.moveTo(x0,y0);g.quadraticCurveTo(mx,my,x1,y1);g.stroke();}
  g.globalAlpha=1;g.globalCompositeOperation='source-over';g.restore();glow(g,cx,cy,90,'pink',eo(prog(p,.6,1)));}
// АУРА: эллипс из цветных точек, раскрывается из центра (p), медленно вращается
function aura(g,cx,cy,rx,ry,p,t,o={}){if(p<=0)return;const n=o.n||30,cols=['amber','pink','violet','cyan'],e=eo5(p);g.save();
  glow(g,cx,cy,rx*1.1,'#7a2a6a',.35*e);
  g.strokeStyle='rgba(200,180,230,'+(.16*e)+')';g.lineWidth=2;g.beginPath();g.ellipse(cx,cy,rx*e,ry*e,0,0,TAU);g.stroke();
  for(let i=0;i<n;i++){const an=i/n*TAU+t*.08,x=cx+Math.cos(an)*rx*e,y=cy+Math.sin(an)*ry*e,front=Math.sin(an)>0;
    g.globalAlpha=e*(front?.95:.4);g.fillStyle=col(cols[i%4]);g.beginPath();g.arc(x,y,front?6:4,0,TAU);g.fill();}g.restore();g.globalAlpha=1;}
// ЛОГОТИП-СЛОВО: белая часть + градиентная часть, буквы проявляются слева с размытием; линия-градиент под ним
function logo(g,white,grad,cx,cy,p,o={}){if(p<=0)return;const size=o.size||170;font(g,800,size,'sans');const sp=size*.22,ww=tw(g,white),gw=grad?tw(g,grad):0,tot=ww+(grad?sp+gw:0);
  const k=Math.min(1,(X1-X0-20)/tot);g.save();g.translate(cx,cy);g.scale(k,k);let x=-tot/2;const all=(white+(grad||'')).length;let idx=0;g.textAlign='left';
  const draw=(s,isG)=>{const x0=x,w=tw(g,s);for(const ch of s){const q=eo5(prog(p*1.4,idx/all*.6,idx/all*.6+.4));idx++;const cw=tw(g,ch);
      if(q>0){g.fillStyle=isG?gradFill(g,x0,x0+w):C.ink;const bl=1-q;if(bl>.05){g.globalAlpha=q*.25;g.fillText(ch,x-bl*18,size*.36);g.fillText(ch,x+bl*18,size*.36);}g.globalAlpha=q*(1-bl*.4);g.fillText(ch,x,size*.36);}x+=cw;}};
  draw(white,false);if(grad){x+=sp;draw(grad,true);}g.restore();g.globalAlpha=1;
  const lp=eo(prog(p,.55,1));if(lp>0){const lw=tot*k*.55*lp;g.fillStyle=gradFill(g,cx-lw/2,cx+lw/2);g.fillRect(cx-lw/2,cy+size*k*.62,lw,4);}}
function tagline(g,s,y,a,o={}){if(a<=0)return;const size=o.size||64;fit(g,s,500,size,X1-X0,'sans');g.globalAlpha=clamp(a);g.fillStyle=C.ink;g.textAlign='center';g.fillText(s,CX,y+(1-a)*20);g.textAlign='left';g.globalAlpha=1;}

// ---------- ТИПОВЫЕ ОБЪЕКТЫ (люди, дома, транспорт, звери, природа, улица) в языке стиля:
// тонкий контур 2.5 px цветом объекта + полупрозрачная заливка того же цвета (голограмма), огни и окна со свечением,
// под объектом мягкий отсвет. Цвет каждой части параметром: c (главный), остальное по имени. x: центр, y: земля под объектом.
const MX=new Map();function mix(a,b,p){a=col(a);b=col(b);const k=a+b+Math.round(p*100);let r=MX.get(k);if(r)return r;r=mix0(a,b,Math.round(p*100)/100);if(MX.size>4000)MX.clear();MX.set(k,r);return r;}
function mix0(a,b,p){const A=parseInt(a.slice(1),16),B=parseInt(b.slice(1),16),f=(s)=>{const x=(A>>s&255),y=(B>>s&255);return Math.round(x+(y-x)*clamp(p));};
  return '#'+((1<<24)|(f(16)<<16)|(f(8)<<8)|f(0)).toString(16).slice(1);}
// заливка+контур текущего пути: fa доля заливки (0.28), lw толщина контура (2.5; 0 без контура)
function paint(g,c,o={}){const fa=o.fa==null?.28:o.fa;if(fa>0){g.fillStyle=o.grad?vgrad(g,c,o.grad[0],o.grad[1],fa):hexA(c,fa);g.fill();}
  if(o.lw!==0){g.lineWidth=o.lw||2.5;g.strokeStyle=o.stroke?col(o.stroke):col(c);g.stroke();}}
function vgrad(g,c,y0,y1,fa){const gr=g.createLinearGradient(0,y0,0,y1);gr.addColorStop(0,hexA(c,Math.min(1,fa*1.6)));gr.addColorStop(1,hexA(c,fa*.35));return gr;}
function floorGlow(g,x,y,w,c,a=1){const a0=g.globalAlpha;g.globalAlpha=a0*.22*a;g.fillStyle=col(c);g.beginPath();g.ellipse(x,y,w/2,w*.07,0,0,TAU);g.fill();g.globalAlpha=a0;}
function win(g,x,y,w,h,on,c){// окно: on 0..1 горит янтарём со свечением; c цвет рамы
  if(on>0){glow(g,x+w/2,y+h/2,Math.max(w,h)*1.3,'#FFB347',.35*on);g.fillStyle=mix('#1a1c2a','#FFC46B',on);}else g.fillStyle='rgba(20,22,34,.9)';
  g.fillRect(x,y,w,h);g.lineWidth=1.5;g.strokeStyle=hexA(c||'#8a90b0',.7);g.strokeRect(x,y,w,h);}
function alpha(g,a,fn){if(a<=0)return;const a0=g.globalAlpha;g.globalAlpha=a0*clamp(a);const r=fn();g.globalAlpha=a0;return r;}

// ЧЕЛОВЕК. o: {h(220), age:'adult'|'kid'|'old', pose, t, dir(1 вправо|-1), skin, hair, hs:'short'|'long'|'bun'|'bald',
//  top (кофта/куртка), bottom (брюки), dress(true: платье цвета top), shoes, helmet(цвет каски), cap(цвет кепки), bag(цвет рюкзака),
//  apron(цвет фартука), glasses, cane, mouth(0..1 открыт: кричит/поёт), a}. pose: stand walk run wave cheer hold point shout sit read dance ride
// → {head:[x,y], hand:[x,y] (передняя), hand2, top:y}
const SKIN=['#F2C9A5','#E0A97E','#C98B62','#8D5B3E'],HAIR=['#2B2028','#5A3A28','#9A6A3A','#D8B070','#C9C9D2'],TOPS=['amber','pink','violet','blue','cyan','green','orange','rose'];
function person(g,x,y,o={}){const a=o.a==null?1:o.a;if(a<=0)return null;const age=o.age||'adult',kid=age==='kid',old=age==='old';
  const H=(o.h||220)*(kid?.68:old?.95:1),d=o.dir||1,t=o.t||0,pose=o.pose||'stand',ph=t*(pose==='run'?9:6)+(o.ph||0);
  const head=H*(kid?.105:.085),leg=H*(kid?.40:.46),torso=H*(kid?.30:.32),lw=H*(kid?.075:.065),arm=H*.36;
  const top=col(o.top||'blue'),bot=col(o.bottom||mix(top,'#1a1c2a',.6)),skin=o.skin||SKIN[0],hair=o.hair||(old?'#C9C9D2':HAIR[0]),sh=o.shoes||'#2a2c3a';
  let lean=old?.16:pose==='run'?.22:0,bob=0;
  // углы от вертикали вниз (+ вперёд): ноги [бедро, сгиб колена назад], руки [плечо, сгиб локтя вперёд]; 1 задняя, 2 передняя
  let L1=[0,0],L2=[0,0],A1=[.12,.15],A2=[-.1,.15];const s=Math.sin(ph);
  if(pose==='walk'){L1=[.42*s,Math.max(0,-.6*s)];L2=[-.42*s,Math.max(0,.6*s)];A1=[-.4*s,.3];A2=[.4*s,.3];bob=Math.abs(Math.cos(ph))*H*.012;}
  else if(pose==='run'){L1=[.75*s,.3+Math.max(0,-1*s)];L2=[-.75*s,.3+Math.max(0,1*s)];A1=[-.9*s,1.5];A2=[.9*s,1.5];bob=Math.abs(Math.cos(ph))*H*.03;}
  else if(pose==='wave'){A2=[2.7+.12*Math.sin(t*9),.3+.35*Math.sin(t*9)];}
  else if(pose==='cheer'){A1=[2.6,.2];A2=[2.8,.2+.2*Math.sin(t*8)];bob=Math.abs(Math.sin(t*7))*H*.02;}
  else if(pose==='hold'||pose==='read'){A1=[.45,1.25];A2=[.55,1.15];}
  else if(pose==='point'||pose==='shout'){A2=[1.5,.05];}
  else if(pose==='dance'){const q=Math.sin(t*5+(o.ph||0));A1=[2.3+.5*q,.6];A2=[2.3-.5*q,.6];L1=[.3*q,.35];L2=[-.3*q,.35];bob=Math.abs(Math.sin(t*10+(o.ph||0)))*H*.03;lean=.08*q;}
  else if(pose==='sit'){L1=[1.5,1.5];L2=[1.45,1.45];A1=[.5,.9];A2=[.45,.9];}
  else if(pose==='ride'){const r=t*7;L1=[.95+.35*Math.sin(r),1.15+.45*Math.cos(r)];L2=[.95-.35*Math.sin(r),1.15-.45*Math.cos(r)];A1=[1.05,.35];A2=[1.0,.35];lean=.32;}
  if(o.seat&&pose!=='sit'){L1=[1.5,1.5];L2=[1.45,1.45];}
  const sitting=pose==='sit'||pose==='ride'||!!o.seat,hipY=y-bob-(sitting?leg*.5:leg),hip=[x,hipY];
  const P=(p,an,len)=>[p[0]+Math.sin(an)*len*d,p[1]+Math.cos(an)*len];
  const sho=[x+Math.sin(lean)*torso*d,hipY-Math.cos(lean)*torso];
  const seg=(pts,c,wd)=>{g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.strokeStyle='rgba(5,5,8,.9)';g.lineWidth=wd+4;g.stroke();g.strokeStyle=c;g.lineWidth=wd;g.stroke();};
  const limb=(p0,A,len,knee)=>{const m=P(p0,A[0],len/2);return[p0,m,P(m,A[0]+(knee?-A[1]:A[1]),len/2)];};
  const dark=(c)=>mix(c,'#050508',.35);
  g.save();g.globalAlpha*=clamp(a);g.lineCap='round';g.lineJoin='round';
  if(!sitting)floorGlow(g,x,y,H*.45,top,1);
  if(o.bag){g.fillStyle=col(o.bag);rr(g,sho[0]-d*(lw*1.15+H*.11),sho[1]+torso*.06,H*.12,torso*.6,H*.03);g.fill();g.strokeStyle='rgba(5,5,8,.8)';g.lineWidth=2;g.stroke();}
  const a1=limb(sho,A1,arm);seg(a1,dark(top),lw*.9);g.fillStyle=dark(skin);g.beginPath();g.arc(a1[2][0],a1[2][1],lw*.55,0,TAU);g.fill();
  const l1=limb(hip,L1,leg,1),l2=limb(hip,L2,leg,1);seg(l1,dark(bot),lw*1.05);seg(l2,bot,lw*1.05);
  [[l1,dark(sh)],[l2,sh]].forEach(([L,c])=>{const f=L[2];g.fillStyle=c;g.beginPath();g.ellipse(f[0]+d*lw*.35,f[1],lw*.75,lw*.42,0,0,TAU);g.fill();});
  if(o.dress){g.fillStyle=top;g.beginPath();g.moveTo(hip[0]-lw*1.2,hip[1]-torso*.2);g.lineTo(hip[0]+lw*1.2,hip[1]-torso*.2);g.lineTo(hip[0]+lw*2.2,hip[1]+leg*.5);g.lineTo(hip[0]-lw*2.2,hip[1]+leg*.5);g.closePath();g.fill();}
  seg([hip,sho],top,lw*2.5);
  if(o.apron){g.strokeStyle=col(o.apron);g.lineWidth=lw*1.6;g.beginPath();g.moveTo(lerp(hip[0],sho[0],.75),lerp(hip[1],sho[1],.75));g.lineTo(hip[0],hip[1]+leg*.2);g.stroke();}
  const hc=[sho[0]+d*Math.sin(lean)*head*.6,sho[1]-head*1.15];
  if((o.hs||(old?'bun':'short'))==='long'&&!o.helmet){g.fillStyle=hair;rr(g,hc[0]-head*1.02-(d>0?head*.15:-head*.75),hc[1]-head*.3,head*1.4,head*1.75,head*.5);g.fill();}
  g.fillStyle=skin;g.beginPath();g.arc(hc[0],hc[1],head,0,TAU);g.fill();g.strokeStyle='rgba(5,5,8,.9)';g.lineWidth=2;g.stroke();
  const hs=o.hs||(old?'bun':'short');g.fillStyle=hair;
  if(o.helmet){g.fillStyle=col(o.helmet);g.beginPath();g.arc(hc[0],hc[1]-head*.15,head*1.12,Math.PI,0);g.closePath();g.fill();g.fillRect(hc[0]-head*1.35,hc[1]-head*.22,head*2.7,head*.24);}
  else if(o.cap){g.fillStyle=col(o.cap);g.beginPath();g.arc(hc[0],hc[1]-head*.2,head*1.02,Math.PI,0);g.fill();g.fillRect(hc[0]+(d>0?0:-head*1.6),hc[1]-head*.32,head*1.6,head*.2);}
  else if(hs!=='bald'){g.beginPath();g.arc(hc[0],hc[1]-head*.08,head*1.05,Math.PI*.92,Math.PI*2.08);g.closePath();g.fill();
    g.beginPath();g.arc(hc[0]-d*head*.55,hc[1]-head*.2,head*.62,0,TAU);g.fill();
    if(hs==='bun'){g.beginPath();g.arc(hc[0]-d*head*.8,hc[1]-head*.85,head*.45,0,TAU);g.fill();}}
  g.fillStyle='#1a1420';g.beginPath();g.arc(hc[0]+d*head*.45,hc[1]-head*.05,Math.max(1.6,head*.12),0,TAU);g.fill();
  if(o.glasses){g.strokeStyle='#1a1420';g.lineWidth=2;g.beginPath();g.arc(hc[0]+d*head*.45,hc[1]-head*.05,head*.3,0,TAU);g.stroke();}
  const mo=o.mouth||(pose==='shout'?.6+.4*Math.abs(Math.sin(t*10)):0);
  if(mo>0){g.fillStyle='#4a1a22';g.beginPath();g.ellipse(hc[0]+d*head*.55,hc[1]+head*.45,head*.16,head*.24*mo+1,0,0,TAU);g.fill();}
  else{g.strokeStyle='#5a2a30';g.lineWidth=2;g.beginPath();g.moveTo(hc[0]+d*head*.3,hc[1]+head*.42);g.lineTo(hc[0]+d*head*.62,hc[1]+head*.38);g.stroke();}
  const a2=limb(sho,A2,arm);seg(a2,top,lw*.9);const hand=a2[2];g.fillStyle=skin;g.beginPath();g.arc(hand[0],hand[1],lw*.55,0,TAU);g.fill();
  if(pose==='read'){const bx=hand[0]+d*H*.03,by=hand[1]-H*.05;g.save();g.translate(bx,by);g.rotate(-.2*d);g.fillStyle=col(o.book||'rose');rr(g,-H*.1,-H*.075,H*.2,H*.15,3);g.fill();g.fillStyle='#F4F4F7';g.fillRect(-H*.09,-H*.065,H*.18,H*.03);g.restore();}
  if(o.cane&&!sitting){g.strokeStyle='#B08A64';g.lineWidth=4;g.beginPath();g.moveTo(hand[0],hand[1]);g.lineTo(hand[0]+d*H*.04,y);g.stroke();}
  g.restore();return{head:hc,hand,hand2:a1[2],top:hc[1]-head,hip};}
// ГРУППА людей в ряд, не сливаются: разные цвета одежды, волос, роста. o: {h,pose,t,kids(доля),old(доля),tops[],seed,dir, opts(i)→доп. параметры}
function crowd(g,x0,x1,y,n,o={}){const r=rng(o.seed||9),out=[];for(let i=0;i<n;i++){const u=n>1?i/(n-1):.5,k=r(),q=r(),z=r();
  const age=k<(o.kids||0)?'kid':k>1-(o.old||0)?'old':'adult',tops=o.tops||TOPS;
  const p=Object.assign({h:(o.h||200)*(.92+q*.14),age,pose:o.pose||'stand',t:(o.t||0),ph:i*1.7,dir:o.dir||(i%2?-1:1),
    top:tops[i%tops.length],skin:SKIN[Math.floor(z*SKIN.length)],hair:HAIR[Math.floor(q*4)],hs:q>.6?'long':'short',bottom:o.bottom,a:o.a},o.opts?o.opts(i):{});
  out.push(person(g,lerp(x0,x1,u),y,p));}return out;}

// ЗДАНИЯ. Все: x центр, y земля. c цвет контура/стен; lit 0..1 доля горящих окон (гаснут по одному в порядке seed)
function litOrder(n,seed){const r=rng(seed||3),a=[];for(let i=0;i<n;i++)a.push([r(),i]);a.sort((p,q)=>p[0]-q[0]);const o=new Array(n);a.forEach((v,k)=>o[v[1]]=k/n);return o;}
function house(g,x,y,w,h,o={}){const a=o.a==null?1:o.a;if(a<=0)return;const c=o.c||'violet',wh=h*.6,l=x-w/2,lit=o.lit==null?1:o.lit;
  alpha(g,a,()=>{floorGlow(g,x,y,w*1.2,c);g.beginPath();g.rect(l,y-wh,w,wh);paint(g,c,{fa:.22,grad:[y-wh,y]});
    g.beginPath();g.moveTo(l-w*.08,y-wh);g.lineTo(x,y-h);g.lineTo(l+w*1.08,y-wh);g.closePath();paint(g,o.roof||c,{fa:.4});
    g.beginPath();rr(g,x-w*.1,y-wh*.5,w*.2,wh*.5,4);paint(g,o.door||c,{fa:.45});
    const ww=w*.18,wy=y-wh*.78;win(g,l+w*.12,wy,ww,ww,lit>.3?1:0,c);win(g,l+w*.7,wy,ww,ww,lit>.6?1:0,c);});}
// многоэтажка: floors×cols окон; grow 0..1 строится по этажам снизу; lit число 0..1 или массив; возвращает {top,l,r,fh}
function tower(g,x,y,o={}){const a=o.a==null?1:o.a,fl=o.floors||5,cols=o.cols||4,cw=o.cw||46,ch=o.ch||54,pad=18,w=cols*cw+pad*2,fh=ch,h=fl*fh+pad,c=o.c||'blue',l=x-w/2;
  const grow=o.grow==null?1:o.grow,built=grow*fl,top=y-pad-built*fh,ord=litOrder(fl*cols,o.seed),lit=o.lit==null?1:o.lit;if(a<=0)return{top,l,r:l+w,fh};
  alpha(g,a,()=>{floorGlow(g,x,y,w*1.3,c);
    g.beginPath();g.rect(l,top,w,y-top);paint(g,c,{fa:.2,grad:[top,y]});
    if(grow<1){g.setLineDash([6,8]);g.strokeStyle=hexA(c,.45);g.lineWidth=2;g.strokeRect(l,y-h,w,h-(y-top));g.setLineDash([]);}
    for(let f=0;f<fl;f++){const vis=clamp(built-f);if(vis<=0)break;for(let k=0;k<cols;k++){const i=f*cols+k,on=Array.isArray(lit)?lit[i]:clamp((lit-ord[i])*fl*cols);
      const wy=y-pad-(f+1)*fh+fh*.2;g.globalAlpha*=vis;win(g,l+pad+k*cw+cw*.18,wy,cw*.64,fh*.58,o.dark?0:on,c);g.globalAlpha/=vis;}}
    g.fillStyle=hexA(c,.6);g.fillRect(l-6,top-4,w+12,4);});
  return{top,l,r:l+w,fh};}
// магазин/кафе: козырёк-маркиза полосками awning, вывеска sign (текст из параметра), витрина. kind 'cafe' добавляет столик с зонтиком
function shop(g,x,y,w,h,o={}){const a=o.a==null?1:o.a;if(a<=0)return;const c=o.c||'cyan',l=x-w/2,aw=col(o.awning||'pink'),top=y-h;
  alpha(g,a,()=>{floorGlow(g,x,y,w*1.2,c);g.beginPath();g.rect(l,top,w,h);paint(g,c,{fa:.18,grad:[top,y]});
    const ay=top+h*.3,n=Math.max(4,Math.round(w/60));for(let i=0;i<n;i++){g.fillStyle=i%2?'#F4F4F7':aw;g.beginPath();g.moveTo(l-10+i*(w+20)/n,ay);g.lineTo(l-10+(i+1)*(w+20)/n,ay);
      g.lineTo(l-10+(i+1)*(w+20)/n,ay+h*.12);g.arc(l-10+(i+.5)*(w+20)/n,ay+h*.12,(w+20)/n/2,0,Math.PI);g.closePath();g.fill();}
    win(g,l+w*.08,ay+h*.24,w*.5,h*.38,o.lit==null?1:o.lit,c);g.beginPath();g.rect(l+w*.66,ay+h*.22,w*.24,y-(ay+h*.22));paint(g,c,{fa:.35});
    if(o.sign){const sy=top+h*.15;g.fillStyle='rgba(10,11,18,.95)';rr(g,l+w*.1,sy-h*.1,w*.8,h*.2,8);g.fill();g.strokeStyle=col(o.signC||c);g.lineWidth=2;g.stroke();
      font(g,700,h*.11,'sans');fit(g,o.sign,700,h*.12,w*.72,'sans');g.fillStyle=col(o.signC||'ink');g.textAlign='center';g.fillText(o.sign,x,sy+h*.04);g.textAlign='left';glow(g,x,sy,w*.4,o.signC||c,.15);}
    if(o.kind==='cafe'){const tx=l+w+w*.18;g.strokeStyle=hexA(c,.9);g.lineWidth=2.5;g.beginPath();g.moveTo(tx,y);g.lineTo(tx,y-h*.55);g.moveTo(tx-w*.12,y-h*.3);g.lineTo(tx+w*.12,y-h*.3);g.moveTo(tx,y-h*.3);g.stroke();
      g.beginPath();g.moveTo(tx-w*.22,y-h*.55);g.quadraticCurveTo(tx,y-h*.78,tx+w*.22,y-h*.55);g.closePath();paint(g,aw,{fa:.6});}});}
// школа/библиотека/ратуша: широкое здание, фронтон над входом, флаг, вывеска sign из параметра, окна 2 ряда
function school(g,x,y,w,h,o={}){const a=o.a==null?1:o.a;if(a<=0)return;const c=o.c||'amber',l=x-w/2,top=y-h;
  alpha(g,a,()=>{floorGlow(g,x,y,w*1.15,c);g.beginPath();g.rect(l,top,w,h);paint(g,c,{fa:.18,grad:[top,y]});
    g.beginPath();g.moveTo(x-w*.22,top);g.lineTo(x,top-h*.28);g.lineTo(x+w*.22,top);g.closePath();paint(g,o.roof||c,{fa:.35});
    const n=6,ww=w/(n+1)*.55;for(let r=0;r<2;r++)for(let i=0;i<n;i++){if(i===2||i===3){if(r===1)continue;}win(g,l+(i+.6)*w/(n+.2),top+h*(.32+r*.32),ww,h*.2,o.lit==null?1:o.lit,c);}
    g.beginPath();rr(g,x-w*.08,y-h*.42,w*.16,h*.42,6);paint(g,o.door||c,{fa:.45});
    if(o.flag!==false){const fx=x,fy=top-h*.28;g.strokeStyle=C.mut;g.lineWidth=2.5;g.beginPath();g.moveTo(fx,fy);g.lineTo(fx,fy-h*.32);g.stroke();
      const wv=Math.sin((o.t||0)*4)*6;g.fillStyle=col(o.flag||'red');g.beginPath();g.moveTo(fx,fy-h*.32);g.quadraticCurveTo(fx+w*.08,fy-h*.32+wv,fx+w*.16,fy-h*.3);g.lineTo(fx+w*.16,fy-h*.18);g.quadraticCurveTo(fx+w*.08,fy-h*.2+wv,fx,fy-h*.2);g.fill();}
    if(o.sign){g.fillStyle='rgba(10,11,18,.95)';rr(g,x-w*.3,top+h*.05,w*.6,h*.2,6);g.fill();g.strokeStyle=hexA(c,.9);g.lineWidth=2;g.stroke();
      fit(g,o.sign,700,h*.13,w*.55,'sans');g.fillStyle=C.ink;g.textAlign='center';g.fillText(o.sign,x,top+h*.15+h*.045);g.textAlign='left';}});}

// РАСТЕНИЯ. tree s = высота; kind 'leaf'|'oak'|'pine'; c крона, trunk ствол; t качает
function tree(g,x,y,s,o={}){const a=o.a==null?1:o.a;if(a<=0)return;const c=o.c||'green',k=o.kind||'leaf',sw=Math.sin((o.t||0)*1.3+x*.01)*s*.012;
  alpha(g,a,()=>{floorGlow(g,x,y,s*.6,c);g.strokeStyle=col(o.trunk||'#B08A64');g.lineWidth=k==='oak'?4:3;g.lineCap='round';
    const th=k==='pine'?s*.22:s*.42;g.beginPath();g.moveTo(x,y);g.lineTo(x+sw*.3,y-th);if(k==='oak'){g.moveTo(x,y-th*.6);g.lineTo(x-s*.12,y-th*1.05);g.moveTo(x,y-th*.7);g.lineTo(x+s*.13,y-th*1.1);}g.stroke();
    if(k==='pine'){for(let i=0;i<3;i++){const by=y-th-i*s*.22,bw=s*(.42-i*.1);g.beginPath();g.moveTo(x-bw+sw*i,by);g.lineTo(x+sw*(i+1),by-s*.36);g.lineTo(x+bw+sw*i,by);g.closePath();paint(g,c,{fa:.3});}}
    else{const B=k==='oak'?[[0,-.72,.3],[-.22,-.62,.22],[.22,-.62,.22],[-.12,-.86,.2],[.14,-.84,.2]]:[[0,-.7,.27],[-.16,-.58,.18],[.17,-.6,.18]];
      g.beginPath();B.forEach(([dx,dy,r])=>{g.moveTo(x+dx*s+sw+r*s,y+dy*s);g.arc(x+dx*s+sw,y+dy*s,r*s,0,TAU);});g.fillStyle=hexA(c,.3);g.fill();
      B.forEach(([dx,dy,r])=>{g.beginPath();g.arc(x+dx*s+sw,y+dy*s,r*s,Math.PI*.9,Math.PI*2.1);g.strokeStyle=col(c);g.lineWidth=2.5;g.stroke();});
      if(o.fruit){g.fillStyle=col(o.fruit);const r=rng(5);for(let i=0;i<7;i++){g.beginPath();g.arc(x+(r()-.5)*s*.5+sw,y-s*(.55+r()*.3),s*.025,0,TAU);g.fill();}}}});}
function grass(g,x0,x1,y,o={}){const c=o.c||'green',h=o.h||26,t=o.t||0,step=o.step||16;g.save();g.globalAlpha*=clamp(o.a==null?1:o.a);g.strokeStyle=hexA(c,.8);g.lineWidth=2;g.beginPath();
  for(let x=x0;x<x1;x+=step){const k=Math.sin(x*1.7)*.5+.5,s=Math.sin(t*2+x*.05)*4,hh=h*(.5+k*.6);g.moveTo(x,y);g.quadraticCurveTo(x+2,y-hh*.6,x+s+4,y-hh);g.moveTo(x+6,y);g.quadraticCurveTo(x+6,y-hh*.4,x+s+10-4*k,y-hh*.7);}
  g.stroke();g.restore();}
// кленовый лист (s размер, rot поворот)
function leaf(g,x,y,s,o={}){const c=col(o.c||'orange');g.save();g.translate(x,y);g.rotate(o.rot||0);g.beginPath();
  const P=[[0,-1],[.2,-.55],[.62,-.72],[.48,-.3],[.95,-.12],[.5,.12],[.62,.5],[.2,.32],[0,.6],[-.2,.32],[-.62,.5],[-.5,.12],[-.95,-.12],[-.48,-.3],[-.62,-.72],[-.2,-.55]];
  P.forEach((p,i)=>i?g.lineTo(p[0]*s,p[1]*s):g.moveTo(p[0]*s,p[1]*s));g.closePath();g.fillStyle=hexA(c,.75);g.fill();g.strokeStyle=c;g.lineWidth=1.5;g.stroke();
  g.beginPath();g.moveTo(0,s*.95);g.lineTo(0,-s*.5);g.stroke();g.restore();}
// листопад: n листьев падают и кружат в прямоугольнике (детерминированно от t)
function leaves(g,t,x0,x1,y0,y1,o={}){const n=o.n||14,r=rng(o.seed||21),cols=o.cols||['orange','amber','red'];for(let i=0;i<n;i++){const sx=r(),sp=.25+r()*.25,ph=r(),s=(o.s||18)*(.7+r()*.6);
  const u=(t*sp*.5+ph)%1,yy=lerp(y0,y1,u),xx=lerp(x0,x1,sx)+Math.sin(t*1.5+i)*30;leaf(g,xx,yy,s,{c:cols[i%cols.length],rot:t*1.2*(i%2?1:-1)+i});}}

// ТРАНСПОРТ: s = длина, dir ±1, t крутит колёса. c цвет кузова
function wheel(g,x,y,r,t,v){g.fillStyle='#0b0c12';g.beginPath();g.arc(x,y,r,0,TAU);g.fill();g.strokeStyle=C.mut;g.lineWidth=2.5;g.stroke();
  const an=-t*v/r;g.strokeStyle=C.dim;g.lineWidth=2;g.beginPath();for(let i=0;i<3;i++){const q=an+i*Math.PI/3;g.moveTo(x+Math.cos(q)*r*.75,y+Math.sin(q)*r*.75);g.lineTo(x-Math.cos(q)*r*.75,y-Math.sin(q)*r*.75);}g.stroke();
  g.fillStyle=C.mut;g.beginPath();g.arc(x,y,r*.22,0,TAU);g.fill();}
function car(g,x,y,s,o={}){const a=o.a==null?1:o.a;if(a<=0)return;const c=o.c||'red',d=o.dir||1,t=o.t||0,h=s*.36,r=s*.11;
  alpha(g,a,()=>{floorGlow(g,x,y,s*1.1,c);g.save();g.translate(x,y);g.scale(d,1);
    g.beginPath();g.moveTo(-s/2,-r);g.lineTo(-s/2,-h*.55);g.lineTo(-s*.28,-h*.6);g.lineTo(-s*.16,-h);g.lineTo(s*.18,-h);g.lineTo(s*.3,-h*.6);g.lineTo(s/2,-h*.5);g.lineTo(s/2,-r);g.closePath();paint(g,c,{fa:.55});
    g.beginPath();g.moveTo(-s*.13,-h*.92);g.lineTo(s*.02,-h*.92);g.lineTo(s*.02,-h*.62);g.lineTo(-s*.22,-h*.62);g.closePath();g.moveTo(s*.06,-h*.92);g.lineTo(s*.16,-h*.92);g.lineTo(s*.25,-h*.62);g.lineTo(s*.06,-h*.62);g.closePath();
    g.fillStyle='rgba(150,200,255,.35)';g.fill();glow(g,s/2,-h*.42,s*.18,'#FFE7A8',.7);
    wheel(g,-s*.3,-r,r,t,o.v==null?260:o.v);wheel(g,s*.3,-r,r,t,o.v==null?260:o.v);g.restore();});}
// автобус: num номер на табло (строка), people: головы пассажиров в окнах
function autobus(g,x,y,s,o={}){const a=o.a==null?1:o.a;if(a<=0)return;const c=o.c||'blue',d=o.dir||1,t=o.t||0,h=s*.34,r=s*.065,l=-s/2;
  alpha(g,a,()=>{floorGlow(g,x,y,s*1.05,c);g.save();g.translate(x,y);g.scale(d,1);
    g.beginPath();rr(g,l,-h-r,s,h,s*.04);paint(g,c,{fa:.6});
    g.fillStyle=hexA('#ffffff',.18);g.fillRect(l+4,-h*.48-r,s-8,3);
    const n=6,ww=s*.11;for(let i=0;i<n;i++){const wx=l+s*.06+i*s*.13;g.fillStyle='rgba(170,215,255,.4)';rr(g,wx,-h-r+h*.14,ww,h*.36,5);g.fill();
      if(o.people){g.fillStyle=SKIN[(i*3)%4];g.beginPath();g.arc(wx+ww/2,-h-r+h*.38,ww*.2,0,TAU);g.fill();}}
    g.beginPath();g.rect(s/2-s*.12,-h-r+h*.14,s*.08,h*.78);paint(g,'#9ad0ff',{fa:.25,lw:2});
    g.fillStyle='rgba(10,11,18,.95)';rr(g,s/2-s*.2,-h-r-h*.02,s*.18,h*.16,4);g.fill();
    if(o.num){fit(g,o.num,700,h*.13,s*.16,'mono');g.fillStyle=C.amber;g.textAlign='center';g.save();g.scale(d,1);g.fillText(o.num,d*(s/2-s*.11),-h-r+h*.1);g.restore();g.textAlign='left';}
    glow(g,s/2,-r-h*.2,s*.12,'#FFE7A8',.7);wheel(g,l+s*.2,-r,r,t,o.v==null?260:o.v);wheel(g,l+s*.78,-r,r,t,o.v==null?260:o.v);g.restore();});}
// велосипед с человеком: rider = параметры person (top, helmet...) или false
function bike(g,x,y,s,o={}){const a=o.a==null?1:o.a;if(a<=0)return;const c=o.c||'cyan',d=o.dir||1,t=o.t||0,r=s*.24;
  alpha(g,a,()=>{floorGlow(g,x,y,s*.9,c);const bx=x-d*s*.32,fx=x+d*s*.32,wy=y-r,sx=x-d*s*.08,sy=y-r*2.2,hx=x+d*s*.22,hy=y-r*2.6;
    wheel(g,bx,wy,r,t*d,o.v==null?240:o.v);wheel(g,fx,wy,r,t*d,o.v==null?240:o.v);
    g.strokeStyle=col(c);g.lineWidth=3.5;g.lineJoin='round';g.beginPath();g.moveTo(bx,wy);g.lineTo(x,wy);g.lineTo(sx,sy);g.lineTo(bx,wy);g.moveTo(x,wy);g.lineTo(hx-d*s*.03,hy+r*.3);g.lineTo(sx,sy);g.moveTo(hx-d*s*.03,hy+r*.3);g.lineTo(fx,wy);g.moveTo(hx-d*s*.03,hy+r*.3);g.lineTo(hx,hy);g.stroke();
    if(o.rider!==false){const R=Object.assign({h:s*1.2,top:'amber'},o.rider||{},{pose:'ride',t:t,dir:d});person(g,sx,sy+R.h*(R.age==='kid'?.68:1)*(R.age==='kid'?.40:.46)*.5,R);}
  });}
// лодка/катер: y ватерлиния, c корпус, cabin рубка (цвет|false), motor мотор сзади, run 0..1 бурун, crew: [параметры person,...] стоят на палубе
function boat(g,x,y,s,o={}){const a=o.a==null?1:o.a;if(a<=0)return;const c=o.c||'cyan',d=o.dir||1,t=o.t||0,h=s*.2,bob=Math.sin(t*2+x*.01)*s*.012;
  alpha(g,a,()=>{g.save();g.translate(x,y+bob);g.scale(d,1);g.rotate(Math.sin(t*1.6+x)*.025);
    if(o.run>0){g.strokeStyle=hexA('#ffffff',.6*o.run);g.lineWidth=2;for(let i=0;i<3;i++){const L=s*(.35+i*.18)*o.run;g.beginPath();g.moveTo(-s*.52,-2+i*6);g.lineTo(-s*.52-L,4+i*9);g.stroke();}}
    if(o.cabin!==false){g.beginPath();rr(g,-s*.12,-h-s*.2,s*.32,s*.2,6);paint(g,o.cabin||'#F4F4F7',{fa:.3});g.fillStyle='rgba(150,200,255,.45)';g.fillRect(s*.04,-h-s*.16,s*.12,s*.07);}
    g.restore();
    if(o.crew)o.crew.forEach((p,i)=>person(g,x+d*s*(-.36+i*.16)*(o.crew.length>2?.9:1),y+bob-h*.85,Object.assign({h:s*.5,dir:d,t},p)));
    g.save();g.translate(x,y+bob);g.scale(d,1);g.rotate(Math.sin(t*1.6+x)*.025);
    g.beginPath();g.moveTo(-s*.5,-h);g.lineTo(s*.56,-h);g.quadraticCurveTo(s*.42,0,s*.2,h*.25);g.lineTo(-s*.42,h*.25);g.closePath();paint(g,c,{fa:.65});
    g.fillStyle=hexA('#ffffff',.85);g.fillRect(-s*.46,-h*.5,s*.92,3);
    if(o.motor){g.beginPath();rr(g,-s*.6,-h*1.2,s*.1,h*.9,4);paint(g,'#C9CCD8',{fa:.55});g.strokeStyle=C.mut;g.lineWidth=3;g.beginPath();g.moveTo(-s*.55,-h*.3);g.lineTo(-s*.55,h*.5);g.stroke();
      if(o.run>0){g.fillStyle=hexA('#ffffff',.5*o.run);for(let i=0;i<3;i++){g.beginPath();g.arc(-s*.6-i*10-Math.sin(t*12+i)*4,h*.4,4-i,0,TAU);g.fill();}}}
    g.restore();g.strokeStyle=hexA('#9ad0ff',.5);g.lineWidth=2;g.beginPath();g.moveTo(x-s*.6,y+h*.32);g.quadraticCurveTo(x,y+h*.32+6,x+s*.6,y+h*.32);g.stroke();});}

// ЖИВОТНЫЕ: s = длина тела; c окрас; pose 'stand'|'walk'|'sit'|'sleep'
function dog(g,x,y,s,o={}){const a=o.a==null?1:o.a;if(a<=0)return;const c=col(o.c||'#D9822B'),d=o.dir||1,t=o.t||0,p=o.pose||'stand',dk=mix(c,'#050508',.35);
  alpha(g,a,()=>{floorGlow(g,x,y,s*1.1,c);g.save();g.translate(x,y);g.scale(d,1);g.lineCap='round';g.lineJoin='round';
    if(p==='sleep'){const br=1+.03*Math.sin(t*2.2);g.fillStyle=c;g.beginPath();g.ellipse(0,-s*.17*br,s*.48,s*.17*br,0,0,TAU);g.fill();
      g.beginPath();g.ellipse(s*.38,-s*.13,s*.17,s*.12,0,0,TAU);g.fill();g.fillStyle=dk;g.beginPath();g.ellipse(s*.3,-s*.21,s*.08,s*.12,-.6,0,TAU);g.fill();
      g.strokeStyle='#1a1420';g.lineWidth=2;g.beginPath();g.arc(s*.43,-s*.16,s*.04,.2,Math.PI-.2);g.stroke();g.fillStyle='#1a1420';g.beginPath();g.arc(s*.55,-s*.13,s*.03,0,TAU);g.fill();
      g.strokeStyle=c;g.lineWidth=s*.08;g.beginPath();g.moveTo(-s*.45,-s*.12);g.quadraticCurveTo(-s*.6,-s*.02,-s*.4,-s*.01);g.stroke();
      if(o.collar){g.strokeStyle=col(o.collar);g.lineWidth=4;g.beginPath();g.moveTo(s*.24,-s*.27);g.lineTo(s*.27,-s*.05);g.stroke();}
      g.restore();return;}
    const sit=p==='sit',ph=t*9,sw=p==='walk'?Math.sin(ph)*.45:0,lh=s*.36,by=-lh-s*.06;let hx,hy;
    g.lineWidth=s*.09;
    if(sit){g.strokeStyle=c;g.beginPath();g.moveTo(-s*.4+s*.25,-s*.1);g.quadraticCurveTo(-s*.45,-s*.1+Math.sin(t*6)*s*.04,-s*.5,-s*.02);g.stroke();
      g.fillStyle=c;g.beginPath();g.ellipse(-s*.05,-s*.17,s*.2,s*.17,0,0,TAU);g.fill();
      g.save();g.translate(s*.1,-s*.38);g.rotate(.45);g.beginPath();g.ellipse(0,0,s*.14,s*.27,0,0,TAU);g.fill();g.restore();
      g.strokeStyle=c;g.beginPath();g.moveTo(s*.2,-s*.32);g.lineTo(s*.22,0);g.stroke();g.strokeStyle=dk;g.beginPath();g.moveTo(s*.12,-s*.3);g.lineTo(s*.12,0);g.stroke();
      g.fillStyle=dk;g.beginPath();g.ellipse(s*.02,-s*.04,s*.16,s*.05,0,0,TAU);g.fill();hx=s*.22;hy=-s*.68;}
    else{g.strokeStyle=dk;g.beginPath();[[-s*.3,sw],[s*.3,-sw]].forEach(([lx,q])=>{g.moveTo(lx,by+s*.05);g.lineTo(lx+Math.sin(q)*lh,by+s*.05+Math.cos(q)*lh);});g.stroke();
      g.strokeStyle=c;g.beginPath();[[-s*.22,-sw],[s*.36,sw]].forEach(([lx,q])=>{g.moveTo(lx,by+s*.05);g.lineTo(lx+Math.sin(q)*lh,by+s*.05+Math.cos(q)*lh);});g.stroke();
      g.strokeStyle=c;g.beginPath();g.moveTo(-s*.4,by-s*.04);g.quadraticCurveTo(-s*.58,by-s*.2+Math.sin(t*10)*s*.05,-s*.55,by-s*.34);g.stroke();
      g.fillStyle=c;g.beginPath();g.ellipse(0,by,s*.42,s*.16,0,0,TAU);g.fill();hx=s*.42;hy=by-s*.16;}
    g.fillStyle=c;g.beginPath();g.ellipse(hx,hy,s*.17,s*.14,0,0,TAU);g.fill();g.beginPath();g.ellipse(hx+s*.17,hy+s*.05,s*.1,s*.07,0,0,TAU);g.fill();
    g.fillStyle=dk;g.beginPath();g.ellipse(hx-s*.06,hy-s*.02,s*.07,s*.14,.4,0,TAU);g.fill();g.fillStyle='#1a1420';g.beginPath();g.arc(hx+s*.07,hy-s*.04,s*.028,0,TAU);g.fill();g.beginPath();g.arc(hx+s*.27,hy+s*.03,s*.032,0,TAU);g.fill();
    if(o.collar){g.strokeStyle=col(o.collar);g.lineWidth=4;g.beginPath();g.moveTo(hx-s*.14,hy+s*.06);g.lineTo(hx-s*.08,hy+s*.16);g.stroke();}
    g.restore();});}
function cat(g,x,y,s,o={}){const a=o.a==null?1:o.a;if(a<=0)return;const c=col(o.c||'#9A9CB0'),d=o.dir||1,t=o.t||0,p=o.pose||'sit';
  alpha(g,a,()=>{floorGlow(g,x,y,s,c);g.save();g.translate(x,y);g.scale(d,1);g.fillStyle=c;g.strokeStyle=c;g.lineCap='round';
    if(p==='sleep'){g.beginPath();g.ellipse(0,-s*.14,s*.4,s*.15,0,0,TAU);g.fill();g.beginPath();g.arc(s*.3,-s*.17,s*.13,0,TAU);g.fill();
      g.beginPath();g.moveTo(s*.22,-s*.27);g.lineTo(s*.26,-s*.38);g.lineTo(s*.32,-s*.29);g.moveTo(s*.34,-s*.29);g.lineTo(s*.41,-s*.37);g.lineTo(s*.42,-s*.25);g.fill();
      g.lineWidth=s*.07;g.beginPath();g.moveTo(-s*.38,-s*.1);g.quadraticCurveTo(-s*.3,0,s*.05,-s*.02);g.stroke();g.strokeStyle='#1a1420';g.lineWidth=2;g.beginPath();g.arc(s*.34,-s*.17,s*.035,.2,Math.PI-.2);g.stroke();}
    else if(p==='sit'){g.beginPath();g.ellipse(0,-s*.26,s*.2,s*.27,0,0,TAU);g.fill();g.beginPath();g.arc(s*.06,-s*.6,s*.15,0,TAU);g.fill();
      g.beginPath();g.moveTo(-s*.06,-s*.68);g.lineTo(-s*.03,-s*.84);g.lineTo(s*.06,-s*.73);g.lineTo(s*.12,-s*.82);g.lineTo(s*.18,-s*.66);g.fill();
      g.lineWidth=s*.06;g.beginPath();g.moveTo(-s*.15,-s*.05);g.quadraticCurveTo(-s*.45,-s*.05+Math.sin(t*2)*s*.04,-s*.4,-s*.35);g.stroke();
      g.fillStyle='#E8F060';g.beginPath();g.arc(s*.12,-s*.62,s*.03,0,TAU);g.fill();}
    else{const sw=Math.sin(t*8)*.4;g.lineWidth=s*.06;g.beginPath();[[-s*.25,sw],[-s*.15,-sw],[s*.2,-sw],[s*.3,sw]].forEach(([lx,q])=>{g.moveTo(lx,-s*.3);g.lineTo(lx+Math.sin(q)*s*.28,-s*.3+Math.cos(q)*s*.28);});g.stroke();
      g.beginPath();g.ellipse(0,-s*.34,s*.36,s*.13,0,0,TAU);g.fill();g.beginPath();g.arc(s*.38,-s*.45,s*.13,0,TAU);g.fill();
      g.beginPath();g.moveTo(s*.29,-s*.53);g.lineTo(s*.31,-s*.66);g.lineTo(s*.38,-s*.56);g.lineTo(s*.44,-s*.65);g.lineTo(s*.48,-s*.52);g.fill();
      g.beginPath();g.moveTo(-s*.34,-s*.36);g.quadraticCurveTo(-s*.55,-s*.5,-s*.48,-s*.7);g.stroke();}
    g.restore();});}
// птица (чайка): fly true машет крыльями; c цвет
function bird(g,x,y,s,o={}){const a=o.a==null?1:o.a;if(a<=0)return;const c=col(o.c||'#F4F4F7'),t=o.t||0,f=o.fly===false?.15:Math.sin(t*9+x*.05),d=o.dir||1;
  alpha(g,a,()=>{g.save();g.translate(x,y);g.scale(d,1);g.strokeStyle=c;g.fillStyle=c;g.lineWidth=Math.max(2,s*.07);g.lineCap='round';g.lineJoin='round';
    g.beginPath();g.moveTo(-s*.5,-f*s*.35);g.quadraticCurveTo(-s*.25,-s*.12-f*s*.2,0,0);g.quadraticCurveTo(s*.25,-s*.12-f*s*.2,s*.5,-f*s*.35);g.stroke();
    g.beginPath();g.ellipse(s*.02,s*.02,s*.16,s*.06,0,0,TAU);g.fill();g.fillStyle=C.amber;g.beginPath();g.moveTo(s*.17,0);g.lineTo(s*.26,s*.03);g.lineTo(s*.17,s*.05);g.fill();g.restore();});}
// стая кружит по эллипсу (cx,cy,rx,ry)
function flock(g,t,cx,cy,n,o={}){const rx=o.rx||300,ry=o.ry||90,s=o.s||60;for(let i=0;i<n;i++){const an=t*(o.speed||.5)+i/n*TAU*(o.spread||1)+i*.3,x=cx+Math.cos(an)*rx*(.8+.2*Math.sin(i*2)),y=cy+Math.sin(an)*ry+Math.sin(i*3)*20;
  bird(g,x,y,s*(.8+.25*Math.sin(an)),{c:o.c,t:t+i*.37,dir:-Math.sin(an)>0?1:-1,a:o.a});}}

// НЕБО И ПРИРОДА
function sun(g,x,y,r,o={}){const a=o.a==null?1:o.a;if(a<=0)return;const c=o.c||'amber';alpha(g,a,()=>{glow(g,x,y,r*3.2,c,.55);glow(g,x,y,r*1.6,c,.6);
  g.fillStyle=mix(c,'#ffffff',.25);g.beginPath();g.arc(x,y,r,0,TAU);g.fill();
  if(o.rays!==false){g.strokeStyle=hexA(c,.7);g.lineWidth=2.5;g.lineCap='round';g.beginPath();const n=12,ro=(o.t||0)*.15;for(let i=0;i<n;i++){const q=i/n*TAU+ro;g.moveTo(x+Math.cos(q)*r*1.3,y+Math.sin(q)*r*1.3);g.lineTo(x+Math.cos(q)*r*(i%2?1.55:1.75),y+Math.sin(q)*r*(i%2?1.55:1.75));}g.stroke();}});}
function moon(g,x,y,r,o={}){const a=o.a==null?1:o.a;if(a<=0)return;const c=col(o.c||'#E8EEFF'),k='m'+c+Math.round(r);
  if(!GL[k]){const S=Math.ceil(r*2+4),q=new OffscreenCanvas(S,S),z=q.getContext('2d');z.fillStyle=c;z.beginPath();z.arc(S/2,S/2,r,0,TAU);z.fill();
    z.globalCompositeOperation='destination-out';z.beginPath();z.arc(S/2+r*.5,S/2-r*.3,r*.88,0,TAU);z.fill();GL[k]=q;}
  alpha(g,a,()=>{glow(g,x,y,r*2.6,c,.3);const q=GL[k];g.drawImage(q,x-q.width/2,y-q.height/2);});}
// звёзды в прямоугольнике: p 0..1 доля зажжённых (загораются по одной), мерцают
function stars(g,t,x0,y0,x1,y1,o={}){const n=o.n||40,r=rng(o.seed||17),p=o.p==null?1:o.p,c=o.c||'#F4F4F7';for(let i=0;i<n;i++){const x=lerp(x0,x1,r()),y=lerp(y0,y1,r()),k=r(),on=clamp((p*n-i)*1.5);
  if(on<=0)continue;const tw=.55+.45*Math.sin(t*(1.5+k*3)+i);const s=k>.85?7:k>.5?4:2.5;g.globalAlpha=on*tw*(o.a==null?1:o.a);
  if(s>5){glow(g,x,y,s*4,c,.6);g.fillStyle=col(c);g.beginPath();g.moveTo(x,y-s*1.8);g.lineTo(x+s*.3,y-s*.3);g.lineTo(x+s*1.8,y);g.lineTo(x+s*.3,y+s*.3);g.lineTo(x,y+s*1.8);g.lineTo(x-s*.3,y+s*.3);g.lineTo(x-s*1.8,y);g.lineTo(x-s*.3,y-s*.3);g.fill();}
  else{g.fillStyle=col(c);g.beginPath();g.arc(x,y,s*.6,0,TAU);g.fill();}}g.globalAlpha=1;}
function cloud(g,x,y,s,o={}){const a=o.a==null?1:o.a;if(a<=0)return;const c=o.c||'#C9CCE8';alpha(g,a,()=>{g.beginPath();g.moveTo(x-s*.5,y);g.arc(x-s*.25,y-s*.08,s*.2,Math.PI*.9,Math.PI*1.9);
  g.arc(x+s*.05,y-s*.17,s*.26,Math.PI*1.1,Math.PI*1.95);g.arc(x+s*.32,y-s*.05,s*.18,Math.PI*1.3,Math.PI*.1+TAU);g.closePath();paint(g,c,{fa:.18,lw:2});});}
// море: от y вниз до y+h (до 1690), волнистые линии плывут; c цвет воды. Возвращает функцию высоты волны wy(x)
function sea(g,t,y,o={}){const x0=o.x0==null?0:o.x0,x1=o.x1==null?W:o.x1,h=o.h||420,c=o.c||'blue',amp=o.amp||8,a=o.a==null?1:o.a;const wy=(x)=>y+Math.sin(x*.012+t*1.4)*amp+Math.sin(x*.031-t*.9)*amp*.4;
  if(a>0)alpha(g,a,()=>{g.beginPath();g.moveTo(x0,y+h);for(let x=x0;x<=x1;x+=24)g.lineTo(x,wy(x));g.lineTo(x1,y+h);g.closePath();g.fillStyle=vgrad(g,c,y,y+h,.32);g.fill();
    g.strokeStyle=col(c);g.lineWidth=2.5;g.beginPath();for(let x=x0;x<=x1;x+=24)x===x0?g.moveTo(x,wy(x)):g.lineTo(x,wy(x));g.stroke();
    const n=o.lines||5;for(let i=1;i<=n;i++){const yy=y+h*(i/(n+1))*.8,sp=(i%2?1:-1)*t*30*(1+i*.2);g.strokeStyle=hexA(c,.55-.07*i);g.lineWidth=2;g.beginPath();
      for(let k=0;k<4;k++){const xs=((k*290+i*130+sp)%(x1-x0+300)+(x1-x0+300))%(x1-x0+300)+x0-150,L=60+i*12;g.moveTo(xs,yy);g.quadraticCurveTo(xs+L/2,yy-6,xs+L,yy);}g.stroke();}
    if(o.glint){const gx=o.glint;g.fillStyle=hexA(o.glintC||'amber',.5);for(let i=0;i<6;i++){const yy=y+14+i*20,w=(70-i*8)*(.7+.3*Math.sin(t*3+i));g.fillRect(gx-w/2,yy,w,3);}}});
  return wy;}
function hill(g,cx,y,w,h,o={}){const a=o.a==null?1:o.a;if(a<=0)return;alpha(g,a,()=>{g.beginPath();g.moveTo(cx-w/2,y);g.bezierCurveTo(cx-w*.25,y-h*1.3,cx+w*.25,y-h*1.3,cx+w/2,y);g.closePath();paint(g,o.c||'green',{fa:.18,grad:[y-h,y]});});}
// линия земли: тонкая, гаснет к краям, с отсветом
function ground(g,y,o={}){const x0=o.x0==null?0:o.x0,x1=o.x1==null?W:o.x1,c=o.c||'#8a90b0',gr=g.createLinearGradient(x0,0,x1,0);
  gr.addColorStop(0,hexA(c,0));gr.addColorStop(.2,hexA(c,.7));gr.addColorStop(.8,hexA(c,.7));gr.addColorStop(1,hexA(c,0));g.save();g.globalAlpha*=clamp(o.a==null?1:o.a);g.fillStyle=gr;g.fillRect(x0,y,x1-x0,2.5);
  g.globalAlpha*=.12;g.fillRect(x0,y,x1-x0,60);g.restore();}

// УЛИЦА: фонарь (on 0..1 горит), гирлянда (on 0..1 лампочки загораются по очереди), доска/вывеска с текстом из параметра
function lamp(g,x,y,h,o={}){const a=o.a==null?1:o.a;if(a<=0)return;const on=o.on==null?1:o.on,lc=o.light||'amber';alpha(g,a,()=>{g.strokeStyle=col(o.c||'#8B8E9C');g.lineWidth=3.5;g.lineCap='round';
  g.beginPath();g.moveTo(x,y);g.lineTo(x,y-h);g.quadraticCurveTo(x,y-h-h*.08,x+h*.12,y-h-h*.06);g.stroke();const lx=x+h*.12,ly=y-h-h*.02;
  if(on>0){glow(g,lx,ly+10,h*.45,lc,.55*on);g.fillStyle=hexA(lc,.07*on);g.beginPath();g.moveTo(lx-8,ly);g.lineTo(lx-h*.28,y);g.lineTo(lx+h*.28,y);g.lineTo(lx+8,ly);g.fill();}
  g.fillStyle=on>0?mix('#3a3c4c','#FFE0A0',on):'#3a3c4c';g.beginPath();g.moveTo(lx-14,ly-6);g.lineTo(lx+14,ly-6);g.lineTo(lx+8,ly+12);g.lineTo(lx-8,ly+12);g.fill();});}
function garland(g,x0,y0,x1,y1,o={}){const n=o.n||12,on=o.on==null?1:o.on,cols=o.cols||['amber','pink','cyan','green','violet'],sag=o.sag||60,t=o.t||0;g.save();g.globalAlpha*=clamp(o.a==null?1:o.a);
  const pt=(u)=>[lerp(x0,x1,u),lerp(y0,y1,u)+Math.sin(Math.PI*u)*sag];g.strokeStyle='rgba(140,145,170,.6)';g.lineWidth=2;g.beginPath();for(let i=0;i<=20;i++){const p=pt(i/20);i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]);}g.stroke();
  for(let i=0;i<n;i++){const u=(i+.5)/n,p=pt(u),l=clamp((on*n-i)*1.5),c=cols[i%cols.length],tw=.8+.2*Math.sin(t*4+i*1.7);
    if(l>0)glow(g,p[0],p[1]+8,26,c,.7*l*tw);g.fillStyle=l>0?mix('#2a2c3a',col(c),l):'#2a2c3a';g.beginPath();g.ellipse(p[0],p[1]+9,6,9,0,0,TAU);g.fill();}g.restore();}
// доска/вывеска: lines массив строк; kind 'chalk' (школьная доска мелом, на ножках legs) | 'sign' (тёмная вывеска с цветной кромкой c) | 'paper' (светлый лист)
// p 0..1: надпись пишется по буквам; size кегль
function board(g,x,y,w,h,lines,o={}){const a=o.a==null?1:o.a;if(a<=0)return;const k=o.kind||'chalk',L=typeof lines==='string'?lines.split('\n'):lines,size=o.size||Math.min(56,h/(L.length+.8)*.72);
  alpha(g,a,()=>{const l=x-w/2,t0=y-h/2;
    if(o.legs){g.strokeStyle='#B08A64';g.lineWidth=4;g.beginPath();g.moveTo(l+w*.15,t0+h);g.lineTo(l+w*.08,t0+h+h*.45);g.moveTo(l+w*.85,t0+h);g.lineTo(l+w*.92,t0+h+h*.45);g.stroke();}
    if(k==='chalk'){g.fillStyle='#B08A64';rr(g,l-10,t0-10,w+20,h+20,8);g.fill();g.fillStyle='#1E2E2A';rr(g,l,t0,w,h,4);g.fill();}
    else if(k==='paper'){g.fillStyle='#ECE6DA';rr(g,l,t0,w,h,6);g.fill();}
    else{g.fillStyle='rgba(10,11,18,.96)';rr(g,l,t0,w,h,12);g.fill();g.strokeStyle=col(o.c||'cyan');g.lineWidth=2.5;g.stroke();glow(g,x,y,w*.6,o.c||'cyan',.12);}
    const tot=L.join('').length,p=o.p==null?1:o.p;let used=0;const ink=k==='chalk'?'#EEF2EC':k==='paper'?'#20222C':C.ink;
    L.forEach((s,i)=>{const fs=fit(g,s,k==='chalk'?500:700,size,w*.88,'sans'),ny=t0+h/2+(i-(L.length-1)/2)*fs*1.3+fs*.35,vis=typed(s,clamp((p*tot-used)/s.length));used+=s.length;
      g.fillStyle=ink;g.textAlign='left';const sw=tw(g,s);g.fillText(vis,x-sw/2,ny);});
    g.textAlign='left';});}

// ---------- сцены, переходы, камера
// CUTS=[0,t1,t2,...,dur]; возвращает {i,l,t0,t1,len,p}
function scene(t,CUTS){let i=0;while(i<CUTS.length-2&&t>=CUTS[i+1])i++;const t0=CUTS[i],t1=CUTS[i+1];return{i,l:t-t0,t0,t1,len:t1-t0,p:prog(t,t0,t1)};}
// мягкая смена: уходящая сцена тает за 0.22 с, входящая проявляется из 1.04 за 0.35 с; камера медленно наезжает 2%
function stage(g,t,S,fn,o={}){const dIn=o.din||.35,dOut=o.dout||.22,inP=S.i===0?1:eo(prog(S.l,0,dIn)),outP=o.last?0:eo(prog(S.l,S.len-dOut,S.len));
  const z=(1.04-.04*inP)*(1-.035*outP)*(1+.02*S.p),cy=o.cy||820;g.save();g.translate(CX,cy);g.scale(z,z);g.translate(-CX+Math.sin(t*.3)*4,-cy+Math.cos(t*.27)*4);
  g.globalAlpha=inP*(1-outP);fn(g.globalAlpha);g.restore();g.globalAlpha=1;}
// звуки на склейки
function cutSounds(s,CUTS,o={}){for(let i=1;i<CUTS.length-1;i++)s.play(CUTS[i]-.02,i%2?'marimba_run':'kalimba_run',o.vol||.13,{pitch:1+i*.03});}

return{W,H,CX,CY,X0,X1,F,C,GRAD,MOODS,clamp,prog,lerp,eo,eo5,ei,eio,back,spring,vis,rng,typed,countTo,fmt,col,hexA,
  init,glow,bg,moodAt,font,tw,fit,gradFill,spaced,mono,wrap,title,formula,rr,card,tag,label,tabs,progress,caret,
  bus,node,spark,bez,curve,link,flow,starGraph,orbit,plaque,input,wave,picture,filmstrip,implode,aura,logo,tagline,
  scene,stage,cutSounds,
  mix,paint,vgrad,floorGlow,win,person,crowd,house,tower,shop,school,tree,grass,leaf,leaves,wheel,car,autobus,bike,boat,dog,cat,bird,flock,
  sun,moon,stars,cloud,sea,hill,ground,lamp,garland,board,SKIN,HAIR,TOPS};
})();
