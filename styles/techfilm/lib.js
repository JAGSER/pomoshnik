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
function hexA(h,a){h=col(h);const n=parseInt(h.slice(1),16);return 'rgba('+(n>>16)+','+(n>>8&255)+','+(n&255)+','+a+')';}

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
// КАРТИНКА-ГРАДИЕНТ: ночное небо фиолет→розовый→янтарь, солнце/луна, силуэт (kind:'city'|'houses'); edge: кромка
function picture(g,x,y,w,h,t,o={}){const a=o.a==null?1:o.a;if(a<=0)return;g.save();g.globalAlpha*=clamp(a);
  rr(g,x,y,w,h,14);g.save();g.clip();
  const sk=g.createLinearGradient(0,y,0,y+h);sk.addColorStop(0,'#2a1a6a');sk.addColorStop(.45,'#9a5ad8');sk.addColorStop(.75,'#f0708a');sk.addColorStop(1,'#f5a646');g.fillStyle=sk;g.fillRect(x,y,w,h);
  const sx=x+w*(o.sun==null?.55:o.sun),sy=y+h*.5;glow(g,sx,sy,h*.55,'#ffd9b0',.6);g.fillStyle='#fff0d8';g.beginPath();g.arc(sx,sy,h*.17,0,TAU);g.fill();
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
  scene,stage,cutSounds};
})();
