// lib.js - стиль SAAS: кремовый фон с точками, крупный заголовок по словам, устройство-сцена,
// плоские карточки, пружинный интерфейс, штампы и счётчики. Все тексты ужимаются в x 60..1020.
const SAAS = (() => {
const F='"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif';
const SERIF='"DejaVu Serif",Georgia,"Noto Serif","Times New Roman",serif';
const MONO='"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace';
const C={bg:'#F6F1E9',ink:'#141413',acc:'#D97757',green:'#2E9E5B',orange:'#E8963A',red:'#D64545',blue:'#3B6BF5',
muted:'#8A847A',soft:'#F3EEE6',bubble:'#F1ECE3',line:'#E2D9CB',track:'#E5DDD0',screen:'#FFFDF9',dark:'#2B2724',
mint:'#7CE0A0',white:'#FFFFFF',hl:'rgba(217,119,87,0.18)'};
const PAL=['#D97757','#3B6BF5','#2E9E5B','#E8963A','#141413','#8E6BD8','#E86A92','#2BA3A8'];
const X0=60,X1=1020,K={};

// ---------- математика, изинги, пружины
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,u)=>a+(b-a)*u;
const prog=(lt,a=0,d=0.3)=>clamp((lt-a)/d);
const eo=x=>1-Math.pow(1-clamp(x),3);
const eio=x=>{x=clamp(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;};
const back=(x,c=1.4)=>{x=clamp(x);return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2);};
const spring=(x,f=11,d=5)=>x<=0?0:1-Math.exp(-d*x)*Math.cos(f*x);
const settle=(x,f=11,d=5)=>x<=0?0:Math.exp(-d*x)*Math.cos(f*x);
const outP=(lt,dur,last,d=0.2)=>last?0:eo((lt-dur+d)/d);
function rgba(hex,a){const n=parseInt(String(hex).slice(1),16);return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')';}
function rng(seed){let s=Math.imul(seed|0,-1640531535)>>>0||123456789;
return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
function cv(w,h){const c=new OffscreenCanvas(w,h);return [c,c.getContext('2d')];}

// ---------- геометрия и базовый текст
function rr(g,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);
g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function fnt(g,w,sz,fam){g.font=(w||600)+' '+Math.max(8,Math.round(sz))+'px '+(fam||F);}
function room(x,al){x=clamp(x,X0,X1);return al==='center'?2*Math.min(x-X0,X1-x):al==='right'?x-X0:X1-x;}
// Tr: текст без проверки края (для рисования внутри translate/scale), ужимается до maxW
function Tr(g,s,x,y,sz,col,w=600,al='left',fam=F,maxW=1e9){s=String(s);fnt(g,w,sz,fam);let m=g.measureText(s).width;
if(m>maxW&&m>0){fnt(g,w,Math.floor(sz*maxW/m),fam);m=maxW;}g.fillStyle=col;g.textAlign=al;g.textBaseline='middle';g.fillText(s,x,y);return m;}
// T: то же в абсолютных координатах, дополнительно ужимается до границ x 60..1020
function T(g,s,x,y,sz,col,w,al='left',fam,maxW=1e9){return Tr(g,s,x,y,sz,col,w,al,fam,Math.min(maxW,Math.max(40,room(x,al))));}
function lines(g,ws,maxW){const sp=g.measureText(' ').width,wd=ws.map(w=>g.measureText(w).width),L=[];let cur=[],cw=0;
ws.forEach((w,i)=>{const nw=cur.length?cw+sp+wd[i]:wd[i];if(nw>maxW&&cur.length){L.push(cur);cur=[i];cw=wd[i];}else{cur.push(i);cw=nw;}});
if(cur.length)L.push(cur);const lw=a=>a.reduce((s,i,j)=>s+wd[i]+(j?sp:0),0);
for(let k=L.length-1;k>0;k--){while(L[k].length<2&&L[k-1].length>2){const m=L[k-1].pop();L[k].unshift(m);
if(lw(L[k])>maxW){L[k].shift();L[k-1].push(m);break;}}}
return {L,wd,sp,w:Math.max(0,...L.map(lw))};}
const norm=s=>String(s).toLowerCase().replace(/[^0-9a-zа-яё%+]/g,'');
function findKey(ws,key){if(typeof key==='number')return key;if(!key)return -1;const k=norm(key);
return ws.findIndex(w=>{const n=norm(w);return n&&(n===k||n.startsWith(k));});}

// ---------- текстовые блоки
// words: блок по словам, перенос без висячих слов, ключевое слово с плашкой. y = центр блока (anchor:'top' - верх)
function words(g,str,x,y,o={}){const ws=String(str).split(/\s+/).filter(Boolean);if(!ws.length)return {h:0,w:0,sz:0,n:0};
const w=o.weight||700,fam=o.fam||F,al=o.align||'left',sz0=o.size||56,minS=o.min||Math.round(sz0*0.7),maxL=o.maxLines||3;
const lim=Math.max(40,Math.min(o.maxW||1e9,room(x,al)));let sz=sz0,R;
for(;;){fnt(g,w,sz,fam);R=lines(g,ws,lim);if((R.L.length<=maxL&&R.w<=lim)||sz<=minS)break;sz-=4;}
if(R.w>lim){sz=Math.floor(sz*lim/R.w);fnt(g,w,sz,fam);R=lines(g,ws,lim);}
const lh=sz*(o.lh||1.1),H=R.L.length*lh,y0=o.anchor==='top'?y+lh/2:y-(H-lh)/2,ki=findKey(ws,o.key);
const lt=o.lt==null?99:o.lt,d0=o.delay||0,st=o.stagger==null?0.11:o.stagger,e=o.out||0,dy=o.dy==null?sz*0.3:o.dy;
g.textAlign='left';g.textBaseline='middle';let n=0;
R.L.forEach((ln,li)=>{const lw=ln.reduce((s,i,j)=>s+R.wd[i]+(j?R.sp:0),0);let cx=al==='center'?x-lw/2:al==='right'?x-lw:x;
ln.forEach(i=>{const tw=d0+n*st,p=eo((lt-tw)/0.28);n++;
if(p>0){const yy=y0+li*lh+(1-p)*dy-e*24;g.save();g.globalAlpha*=p*(1-e);
if(i===ki&&o.hl!==false){const hp=eo((lt-tw-0.2)/0.3);if(hp>0){g.fillStyle=o.hlColor||C.hl;
rr(g,cx-10,yy-sz*0.46,(R.wd[i]+20)*hp,sz*0.92,sz*0.14);g.fill();}}
g.fillStyle=i===ki?(o.keyColor||C.acc):(o.color||C.ink);g.fillText(ws[i],cx,yy);g.restore();}cx+=R.wd[i]+R.sp;});});
return {h:H,w:R.w,sz,n:R.L.length};}
// headline: главный заголовок сцены 88-124 px по центру, уходит вверх к концу сцены
function headline(g,str,key,lt,dur,o={}){return words(g,str,o.x||540,o.y||370,{size:o.size||124,min:o.min||88,weight:800,
align:'center',maxW:o.maxW||900,maxLines:o.maxLines||2,key,lt,delay:-0.1,stagger:0.11,color:o.color,
out:o.last?0:0.7*outP(lt,dur,false,0.2)});}
function caption(g,str,x,y,o={}){const p=o.p==null?1:o.p;if(p<=0)return 0;g.save();g.globalAlpha*=eo(p);
const w=T(g,str,x,y+(1-eo(p))*10,o.size||30,o.color||C.muted,o.weight||600,o.align||'left',o.fam||F,o.maxW);g.restore();return w;}
// pill: плашка-фраза, слова появляются по очереди, key подсвечен цветом. x - центр
function pill(g,str,x,y,o={}){const sz=o.size||44,w=o.weight||700,fam=o.fam||F,pad=o.pad||30,ws=String(str).split(/\s+/).filter(Boolean);
const lim=Math.max(40,Math.min(o.maxW||1e9,room(x,'center'))-2*pad);let s=sz,sp,wd,tw;
const ms=()=>{fnt(g,w,s,fam);sp=g.measureText(' ').width;wd=ws.map(v=>g.measureText(v).width);tw=wd.reduce((a,b)=>a+b,0)+sp*(ws.length-1);};
ms();if(tw>lim){s=Math.floor(s*lim/tw);ms();}
const lt=o.lt==null?99:o.lt,a=o.a||0,pa=prog(lt,a,0.25);if(pa<=0)return tw+2*pad;const h=s*2.05,ki=findKey(ws,o.key);
g.save();g.globalAlpha*=pa;g.fillStyle=o.fill||C.white;rr(g,x-tw/2-pad,y-h/2,tw+2*pad,h,h/2);g.fill();
if(o.stroke){g.strokeStyle=o.stroke;g.lineWidth=3;g.stroke();}let cx=x-tw/2;g.textAlign='left';g.textBaseline='middle';
ws.forEach((v,i)=>{const q=prog(lt,a+i*(o.stagger==null?0.12:o.stagger),0.25);if(q>0){g.save();g.globalAlpha*=q;
g.fillStyle=i===ki?(o.keyColor||C.acc):(o.color||C.ink);g.fillText(v,cx,y+(1-eo(q))*14);g.restore();}cx+=wd[i]+sp;});
g.restore();return tw+2*pad;}
function chips(g,arr,x,y,lt,a0=0,o={}){const sz=o.size||34,right=Math.min(o.right||X1,X1),h=sz*1.9;let cx=x,cy=y;
arr.forEach((s,i)=>{fnt(g,600,sz,F);const w=Math.min(g.measureText(s).width+48,right-x);if(cx+w>right&&cx>x){cx=x;cy+=h+14;}
const p=prog(lt,a0+i*0.08,0.25);if(p>0){g.save();g.globalAlpha*=p;g.translate(0,(1-eo(p))*20);rr(g,cx,cy,w,h,h/2);
if(o.fill){g.fillStyle=o.fill;g.fill();}g.strokeStyle=o.stroke||C.line;g.lineWidth=3;g.stroke();
T(g,s,cx+24,cy+h/2+1,sz,o.color||C.ink,600,'left',F,w-48);g.restore();}cx+=w+14;});return cy+h-y;}
const fmt=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,' ');
const countInt=(lt,a,d,from,to)=>Math.round(lerp(from,to,eo((lt-a)/d)));
const typeOn=(s,lt,a=0,cps=34)=>String(s).slice(0,Math.max(0,Math.floor((lt-a)*cps)));
// counter: крупное целое + единица справа, ужимается под ширину
function counter(g,n,x,y,o={}){const sz=o.size||120,s=fmt(n),u=o.unit||'';fnt(g,800,sz,F);const nw=g.measureText(s).width;
fnt(g,700,sz*0.4,F);const gap=sz*0.17,uw=u?g.measureText(u).width+gap:0,al=o.align||'left',lim=Math.min(o.maxW||1e9,room(x,al));
const k=Math.min(1,lim/(nw+uw)),S=sz*k,tw=(nw+uw)*k,lx=al==='center'?x-tw/2:al==='right'?x-tw:x;
Tr(g,s,lx,y,S,o.color||C.acc,800,'left',F,nw*k+1);if(u)Tr(g,u,lx+(nw+gap)*k,y+S*0.15,S*0.4,o.ucolor||C.ink,700,'left',F,(uw-gap)*k+1);return tw;}

// ---------- фон, тени, камера, сцены, переходы
function dotsTex(){if(K.dots)return K.dots;const [c,q]=cv(1240,2040);q.fillStyle='rgba(20,20,19,0.07)';
for(let y=0;y<2040;y+=40)for(let x=0;x<1240;x+=40){q.beginPath();q.arc(x,y,2.2,0,7);q.fill();}return K.dots=c;}
function blob(hex,a){const key='b'+hex+a;if(K[key])return K[key];const [c,q]=cv(900,900),gr=q.createRadialGradient(450,450,0,450,450,450);
gr.addColorStop(0,rgba(hex,a));gr.addColorStop(1,rgba(hex,0));q.fillStyle=gr;q.fillRect(0,0,900,900);return K[key]=c;}
function bg(g,t,o={}){g.fillStyle=o.base||C.bg;g.fillRect(0,0,1080,1920);
g.drawImage(blob(o.a||C.acc,o.aa||0.22),-260+Math.sin(t*0.4)*80,120+Math.cos(t*0.3)*60);
g.drawImage(blob(o.b||C.blue,o.ba||0.12),420+Math.cos(t*0.35)*70,980+Math.sin(t*0.5)*80);
if(o.dots!==false)g.drawImage(dotsTex(),-60-(t*8)%40,-40-(t*5)%40);}
function shadowSpr(w,h,r){const key='s'+w+'x'+h+'r'+r;if(K[key])return K[key];const [c,q]=cv(w+200,h+260);
q.shadowColor='rgba(20,20,19,0.28)';q.shadowBlur=70;q.shadowOffsetY=40;q.fillStyle=C.ink;rr(q,100,100,w,h,r);q.fill();
q.shadowColor='rgba(0,0,0,0)';q.shadowBlur=0;q.shadowOffsetY=0;q.globalCompositeOperation='destination-out';rr(q,100,100,w,h,r);q.fill();return K[key]=c;}
function shadow(g,x,y,w,h,r=28){g.drawImage(shadowSpr(Math.round(w),Math.round(h),r),x-100,y-100);}
// cam: делает g.save()! Закрывай g.restore(). Наезд + толчок-оседание на склейке + дрейф
function cam(g,t,lt,dur,o={}){const z=1+(o.push==null?0.02:o.push)*clamp(lt/dur)+(o.kick==null?0.018:o.kick)*settle(lt),
px=Math.sin(t*0.6)*8,cy=o.cy||1100;g.save();g.translate(540+px,cy);g.scale(z,z);g.translate(-540,-cy);return {z,px};}
function par(g,c,f=0.5,dy=120){g.translate(-c.px*f,-(c.z-1)*dy);}
function scene(SC,t){let i=SC.length-1;for(let j=0;j<SC.length;j++)if(t<SC[j][1]){i=j;break;}
const r=SC[i];return {i,row:r,t0:r[0],t1:r[1],lt:t-r[0],dur:r[1]-r[0],last:i===SC.length-1,n:SC.length};}
function fromSubs(subs,list){return list.map((r,i)=>{const s=subs[Math.min(i,subs.length-1)]||{t0:i*3,t1:i*3+3};
return [s.t0,i===list.length-1?1e9:s.t1].concat(r);});}
// swap: смена содержимого экрана: въезд справа, уход влево (внутри save)
function swap(g,lt,dur,last,o={}){const e=eo(lt/0.3),q=outP(lt,dur,last);g.globalAlpha*=(0.35+0.65*e)*(1-0.65*q);
g.translate((1-e)*(o.dx||90)-q*(o.ox||70),0);}
function rise(g,p,dy=40){g.translate(0,(1-eo(p))*dy);g.globalAlpha*=clamp(p*1.5);}

// ---------- устройства и карточки
function stepDots(g,xr,y,n,i,lt=9){let rx=xr;for(let d=n-1;d>=0;d--){const ww=d===i-1?14+22*eo(lt/0.3):14;rx-=ww;
g.fillStyle=d<i?C.acc:C.track;rr(g,rx,y-7,ww,14,7);g.fill();rx-=10;}return xr-rx;}
// phone: телефон 600x1060 с шапкой (иконка, название, шаги); fn(g,box) рисует экран, box={x,y,w,h}
function phone(g,t,o,fn){o=o||{};const x=o.x==null?240:o.x,y=o.y==null?590:o.y,w=o.w||600,h=o.h||1060,R=80,i=18;
const ent=(1-eo(o.rise==null?1:o.rise))*500;g.save();g.translate(0,Math.sin(t*1.4)*6+ent);shadow(g,x,y,w,h,R);
g.fillStyle=o.body||C.ink;rr(g,x,y,w,h,R);g.fill();const sx=x+i,sy=y+i,sw=w-2*i,sh=h-2*i;rr(g,sx,sy,sw,sh,R-16);g.clip();
g.fillStyle=o.screen||C.screen;g.fillRect(sx,sy,sw,sh);g.fillStyle=C.ink;rr(g,x+w/2-70,sy+22,140,38,19);g.fill();
let tx=sx+36;if(o.icon){o.icon(g,sx+60,sy+106,t);tx=sx+98;}
const dw=o.steps?stepDots(g,sx+sw-36,sy+106,o.steps,o.step||0,o.lt==null?9:o.lt):0;
if(o.title)T(g,o.title,tx,sy+106,34,C.ink,700,'left',F,sx+sw-36-dw-20-tx);
g.fillStyle='#EEE7DC';g.fillRect(sx+24,sy+148,sw-48,3);
if(fn){g.save();fn(g,{x:sx+24,y:sy+164,w:sw-48,h:sh-188});g.restore();}g.restore();}
// browser: окно сайта/дашборда; fn(g,box)
function browser(g,x,y,w,h,o,fn){o=o||{};shadow(g,x,y,w,h,36);g.fillStyle=o.fill||C.white;rr(g,x,y,w,h,36);g.fill();
for(let i=0;i<3;i++){g.fillStyle=C.line;g.beginPath();g.arc(x+40+i*30,y+42,9,0,7);g.fill();}
g.fillStyle=C.soft;rr(g,x+150,y+20,w-180,44,22);g.fill();if(o.url)T(g,o.url,x+176,y+43,24,C.muted,500,'left',MONO,w-230);
g.fillStyle='#EEE7DC';g.fillRect(x,y+84,w,3);if(fn){g.save();rr(g,x,y,w,h,36);g.clip();fn(g,{x:x+30,y:y+110,w:w-60,h:h-140});g.restore();}}
function card(g,x,y,w,h,o={}){rr(g,x,y,w,h,o.r==null?28:o.r);g.fillStyle=o.fill||C.soft;g.fill();
if(o.stroke){g.strokeStyle=o.stroke;g.lineWidth=o.lw||3;g.stroke();}}
// bubble: сообщение чата, перенос по словам, перелёт back от угла. Возвращает высоту
function bubble(g,str,x,y,maxW,p,o={}){const ws=String(str).split(/\s+/).filter(Boolean);let sz=o.size||44;maxW=Math.min(maxW,X1-x);
const lim=Math.max(40,maxW-56);fnt(g,500,sz,F);let R=lines(g,ws,lim);if(R.w>lim){sz=Math.floor(sz*lim/R.w);fnt(g,500,sz,F);R=lines(g,ws,lim);}
const lh=sz*1.27,bw=R.w+56,bh=Math.max(1,R.L.length)*lh+40;if(p<=0||!ws.length)return bh;
const bx=o.right?x+maxW-bw:x,ox=o.right?bx+bw:bx,sc=back(p);g.save();g.globalAlpha*=clamp(p*3);
g.translate(ox,y+bh);g.scale(sc,sc);g.translate(-ox,-(y+bh));g.fillStyle=o.dark?C.ink:(o.fill||C.bubble);rr(g,bx,y,bw,bh,30);g.fill();
g.fillStyle=o.dark?'#fff':C.ink;g.textAlign='left';g.textBaseline='middle';
R.L.forEach((ln,i)=>g.fillText(ln.map(j=>ws[j]).join(' '),bx+28,y+20+lh*(i+0.5)));g.restore();return bh;}
function typing(g,x,y,t,p=1){if(p<=0)return;g.save();g.globalAlpha*=eo(p);g.fillStyle=C.bubble;rr(g,x,y,150,80,30);g.fill();
g.fillStyle=C.muted;for(let d=0;d<3;d++){g.beginPath();g.arc(x+40+d*35,y+40-Math.max(0,Math.sin(t*10-d))*8,9,0,7);g.fill();}g.restore();}
// btn: пилюля-кнопка по центру x,y; o.press = секунд с момента нажатия
function btn(g,str,x,y,o={}){const p=o.p==null?1:o.p;if(p<=0)return;const sz=o.size||44;fnt(g,700,sz,F);
const tw=Math.min(g.measureText(str).width,room(x,'center')-80),w=Math.max(o.minW||260,tw+80),h=sz*2.27;
const pr=o.press>0?1-0.06*Math.sin(clamp(o.press/0.25)*Math.PI):1,s=back(p)*pr;g.save();g.translate(x,y);g.scale(s,s);
g.fillStyle=o.fill||C.green;rr(g,-w/2,-h/2,w,h,h/2);g.fill();Tr(g,str,0,2,sz,o.color||'#fff',700,'center',F,tw);g.restore();}
function toggle(g,x,y,on,o={}){const w=o.w||110,h=w*0.56,v=eo(on);g.fillStyle=v>0.5?(o.color||C.green):C.track;rr(g,x,y,w,h,h/2);g.fill();
g.fillStyle='#fff';g.beginPath();g.arc(lerp(x+h/2,x+w-h/2,v),y+h/2,h*0.38,0,7);g.fill();}
function bar(g,x,y,w,h,v,o={}){g.fillStyle=o.track||C.track;rr(g,x,y,w,h,h/2);g.fill();const fw=w*clamp(v);
if(fw>0){g.fillStyle=o.color||C.acc;rr(g,x,y,Math.max(h,fw),h,h/2);g.fill();}}
function ring(g,x,y,r,v,o={}){g.lineCap='round';g.lineWidth=o.lw||18;g.strokeStyle=o.track||C.track;g.beginPath();g.arc(x,y,r,0,7);g.stroke();
if(v>0){g.strokeStyle=o.color||C.acc;g.beginPath();g.arc(x,y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(v));g.stroke();}
if(o.label!=null)T(g,o.label,x,y+2,o.size||r*0.55,o.tc||C.ink,800,'center',F,r*1.6);}
function bars(g,x,y,w,h,vals,p,o={}){const n=vals.length,gap=o.gap||14,bw=(w-gap*(n-1))/n,mx=o.max||Math.max(...vals,1),hi=o.hi==null?n-1:o.hi;
vals.forEach((v,i)=>{const bh=h*clamp(v/mx)*eo((p-i*0.06)/0.5);if(bh<=0)return;
g.fillStyle=o.colors?o.colors[i%o.colors.length]:(i===hi?(o.color||C.acc):(o.base||'#D9CFC0'));rr(g,x+i*(bw+gap),y+h-bh,bw,bh,Math.min(12,bw/2));g.fill();});}

// ---------- значки, метки, штампы, указатели
function check(g,x,y,r,p,col=C.green){if(p<=0)return;const s=back(p);g.save();g.translate(x,y);g.scale(s,s);g.fillStyle=col;
g.beginPath();g.arc(0,0,r,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=r*0.2;g.lineCap='round';g.lineJoin='round';
g.beginPath();g.moveTo(-r*0.42,0);g.lineTo(-r*0.12,r*0.32);g.lineTo(r*0.44,-r*0.32);g.stroke();g.restore();}
function cross(g,x,y,r,p,col=C.red){if(p<=0)return;const s=back(p),a=r*0.34;g.save();g.translate(x,y);g.scale(s,s);g.fillStyle=col;
g.beginPath();g.arc(0,0,r,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=r*0.2;g.lineCap='round';
g.beginPath();g.moveTo(-a,-a);g.lineTo(a,a);g.moveTo(a,-a);g.lineTo(-a,a);g.stroke();g.restore();}
function pin(g,x,y,str,p,o={}){if(p<=0)return;const s=back(p),r=o.r||54;g.save();g.translate(x,y);g.scale(s,s);g.fillStyle=o.color||C.green;
g.beginPath();g.moveTo(-r*0.26,r*0.89);g.lineTo(0,r*1.3);g.lineTo(r*0.26,r*0.89);g.fill();g.beginPath();g.arc(0,0,r,0,7);g.fill();
Tr(g,str,0,2,r*0.78,'#fff',800,'center',F,r*1.6);g.restore();}
// stamp: штамп-вердикт, падает с масштаба 1.8 и встаёт с наклоном
function stamp(g,str,x,y,p,o={}){if(p<=0)return;const col=o.color||C.green,sz=o.size||72;fnt(g,800,sz,F);let tw=g.measureText(str).width,s=sz;
const lim=Math.min(o.maxW||700,room(x,'center'))-100;if(tw>lim){s=Math.floor(sz*lim/tw);tw=lim;}const w=tw+80,h=s*1.65,sc=1+(1-eo(p))*0.8;
g.save();g.globalAlpha*=clamp(p*2);g.translate(x,y);g.rotate(o.rot==null?-0.15:o.rot);g.scale(sc,sc);g.strokeStyle=col;g.lineWidth=8;
rr(g,-w/2,-h/2,w,h,20);g.stroke();fnt(g,800,s,F);g.fillStyle=col;g.textAlign='center';g.textBaseline='middle';g.fillText(str,0,s*0.05);g.restore();}
// tap: касание с расходящимися кольцами, a = момент касания (лок. время). col только #RRGGBB
function tap(g,x,y,lt,a=0,col=C.acc){const p=prog(lt,a,0.3);if(p<=0)return;
for(let q=0;q<2;q++){const ph=((lt-a)*1.2+q*0.5)%1;g.strokeStyle=rgba(col,(1-ph)*0.9);g.lineWidth=5;g.beginPath();g.arc(x,y,24+ph*60,0,7);g.stroke();}
g.fillStyle=col;g.strokeStyle='#fff';g.lineWidth=6;g.beginPath();g.arc(x,y,22*back(p),0,7);g.fill();g.stroke();}
// cursor: точка-курсор по дуге a->e через k, q 0..1 (изинг внутри). Возвращает [x,y]
function cursor(g,a,k,e,q,o={}){q=eo(q);const u=1-q,x=u*u*a[0]+2*u*q*k[0]+q*q*e[0],y=u*u*a[1]+2*u*q*k[1]+q*q*e[1];
g.fillStyle=o.color||C.acc;g.strokeStyle='#fff';g.lineWidth=6;g.beginPath();g.arc(x,y,o.r||20,0,7);g.fill();g.stroke();return [x,y];}
function corners(g,x,y,w,h,o={}){const m=o.m==null?30:o.m,L=o.len||56;g.strokeStyle=o.color||'rgba(255,255,255,0.85)';g.lineWidth=o.lw||6;g.lineCap='round';
[[x+m,y+m,1,1],[x+w-m,y+m,-1,1],[x+m,y+h-m,1,-1],[x+w-m,y+h-m,-1,-1]].forEach(([a,b,sx,sy])=>{g.beginPath();g.moveTo(a,b+sy*L);g.lineTo(a,b);g.lineTo(a+sx*L,b);g.stroke();});}
function live(g,x,y,str,t,o={}){g.save();g.globalAlpha*=0.6+0.4*Math.sin(t*6);g.fillStyle=o.dot||C.red;g.beginPath();g.arc(x,y,9,0,7);g.fill();g.restore();
T(g,str,x+24,y,o.size||30,o.color||'#fff',600,'left',F,o.maxW||400);}
function wave(g,x,y,w,h,t,p=1,o={}){const n=o.n||16,bw=w/n,b=Math.min(12,bw*0.7);g.fillStyle=o.color||C.acc;
for(let i=0;i<n;i++){const hh=(h*0.2+(Math.abs(Math.sin(t*8+i*0.9))*0.7+0.3)*h*0.8)*eo(p);rr(g,x+i*bw,y-hh/2,b,hh,b/2);g.fill();}}
function gear(g,x,y,r,t,o={}){g.save();g.translate(x,y);g.rotate(t*(o.speed||1.2));g.fillStyle=o.color||C.ink;const n=o.teeth||9,tw=r*0.48;
for(let i=0;i<n;i++){g.rotate(Math.PI*2/n);g.fillRect(-tw/2,-r*1.32,tw,tw);}g.beginPath();g.arc(0,0,r,0,7);g.fill();
g.fillStyle=o.hole||C.soft;g.beginPath();g.arc(0,0,r*0.36,0,7);g.fill();g.restore();}
function arrow(g,x1,y1,x2,y2,p=1,o={}){if(p<=0)return;const q=eo(p),ex=lerp(x1,x2,q),ey=lerp(y1,y2,q),an=Math.atan2(y2-y1,x2-x1),hl=o.head||18;
g.strokeStyle=o.color||C.ink;g.lineWidth=o.lw||6;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(x1,y1);g.lineTo(ex,ey);
g.moveTo(ex-hl*Math.cos(an-0.6),ey-hl*Math.sin(an-0.6));g.lineTo(ex,ey);g.lineTo(ex-hl*Math.cos(an+0.6),ey-hl*Math.sin(an+0.6));g.stroke();}
// row: строка списка с меткой ok/bad/warn/none, подписью и значением справа
function row(g,x,y,w,label,value,p,o={}){if(p<=0)return;const h=o.h||100;g.save();rise(g,p,24);card(g,x,y,w,h,{fill:o.fill||C.white,stroke:C.line,r:24});
const m=o.mark||'ok',mx=x+50,my=y+h/2;if(m==='ok')check(g,mx,my,24,1,o.mc||C.green);else if(m==='bad')cross(g,mx,my,24,1,o.mc||C.red);
else if(m==='warn'){g.fillStyle=o.mc||C.orange;g.beginPath();g.arc(mx,my,24,0,7);g.fill();T(g,'!',mx,my+2,34,'#fff',800,'center');}
let vw=0;if(value!=null&&value!=='')vw=T(g,value,x+w-28,my,o.vsize||40,o.vc||C.muted,700,'right',o.vfam||F,w*0.45);
const lx=m==='none'?x+28:x+92;T(g,label,lx,my,o.size||44,o.color||C.ink,600,'left',o.fam||F,x+w-28-vw-20-lx);g.restore();}
function field(g,x,y,w,text,p,o={}){if(p<=0)return;const h=o.h||96;g.save();g.globalAlpha*=eo(p);rr(g,x,y,w,h,h/2);g.fillStyle=o.fill||C.white;g.fill();
g.strokeStyle=C.line;g.lineWidth=3;g.stroke();T(g,text,x+34,y+h/2+1,o.size||36,o.color||C.muted,500,'left',o.fam||F,w-h-50);
const bx=x+w-h/2-4,by=y+h/2;g.fillStyle=o.btn||C.acc;g.beginPath();g.arc(bx,by,h*0.36,0,7);g.fill();
arrow(g,bx,by+h*0.16,bx,by-h*0.16,1,{color:'#fff',lw:5,head:12});g.restore();}
// tiles: сетка цветных плиток каскадом; o.pick/o.pickAt - выбор плитки обводкой; o.draw(g,i,w,h) - свой рисунок
function tiles(g,x,y,w,h,cols,rows,lt,a=0,o={}){const gap=o.gap||14,cw=(w-gap*(cols-1))/cols,ch=(h-gap*(rows-1))/rows,st=o.step||0.045,t=o.t||0,P=o.colors||PAL;
for(let i=0;i<cols*rows;i++){const p=prog(lt,a+i*st,0.25);if(p<=0)continue;const c=i%cols,r=(i/cols)|0,tx=x+c*(cw+gap),ty=y+r*(ch+gap),s=back(p),m=(c+r)%4;
g.save();g.translate(tx+cw/2,ty+ch/2);g.scale(s,s);g.fillStyle=P[(i*3)%P.length];rr(g,-cw/2,-ch/2,cw,ch,Math.min(20,cw/4));g.fill();
const u=Math.min(cw,ch)*0.22;g.fillStyle='rgba(255,255,255,0.75)';if(o.draw)o.draw(g,i,cw,ch);
else if(m===0){g.beginPath();g.arc(0,0,u,0,7);g.fill();}else if(m===1){for(let k=-1;k<2;k++){rr(g,-u*1.2,k*u*0.8-u*0.2,u*2.4,u*0.42,u*0.21);g.fill();}}
else if(m===2){g.beginPath();g.moveTo(0,-u*1.1);g.lineTo(u*1.15,u*0.95);g.lineTo(-u*1.15,u*0.95);g.fill();}
else{g.rotate(0.6+t*0.5);g.fillRect(-u*0.8,-u*0.8,u*1.6,u*1.6);}g.restore();
if(o.pick===i&&lt>(o.pickAt==null?9e9:o.pickAt)){g.save();g.globalAlpha*=prog(lt,o.pickAt,0.2);g.strokeStyle=o.pickColor||C.ink;
g.lineWidth=6;rr(g,tx-7,ty-7,cw+14,ch+14,24);g.stroke();g.restore();}}}

// ---------- герои и финал
// bot: сквозной герой-помощник (корпус, экран-лицо, антенна, моргает). o: color, tip, face, mood 'happy'|'wow', look -1..1, p
function bot(g,x,y,r,t,o={}){const sc=o.p==null?1:back(o.p);if(sc<=0)return;const ax=Math.sin(t*2)*r*0.12;
g.save();g.translate(x,y+Math.sin(t*3)*r*0.05);g.scale(sc,sc);g.strokeStyle=C.ink;g.lineWidth=r*0.08;g.lineCap='round';
g.beginPath();g.moveTo(0,-r*0.85);g.lineTo(ax,-r*1.2);g.stroke();g.fillStyle=o.tip||C.orange;g.beginPath();g.arc(ax,-r*1.25,r*0.14,0,7);g.fill();
g.fillStyle=o.color||C.acc;rr(g,-r,-r*0.85,2*r,1.7*r,r*0.62);g.fill();g.fillStyle=o.face||'#FFF6EE';rr(g,-r*0.72,-r*0.55,1.44*r,r*0.95,r*0.42);g.fill();
const bl=(t%3.4)>3.25?0.12:1,lx=(o.look||0)*r*0.1;g.fillStyle=C.ink;
for(const s of[-1,1]){g.beginPath();g.ellipse(s*r*0.3+lx,-r*0.12,r*0.09,r*0.14*bl,0,0,7);g.fill();}
g.lineWidth=r*0.07;g.beginPath();if(o.mood==='wow')g.arc(lx,r*0.2,r*0.08,0,7);else g.arc(lx,r*0.06,r*0.16,0.3,Math.PI-0.3);g.stroke();g.restore();}
// person: человек-аватар (голова, волосы, плечи, очки по желанию)
function person(g,x,y,r,o={}){g.save();g.translate(x,y);g.fillStyle=o.shirt||'#7A9A6B';rr(g,-r*1.25,r*1.05,r*2.5,r*1.4,r*0.6);g.fill();
g.fillStyle=o.hair||'#4A3426';g.beginPath();g.arc(0,-r*0.2,r*1.12,0,7);g.fill();g.fillStyle=o.skin||'#F1C9A5';g.beginPath();g.arc(0,0,r,0,7);g.fill();
g.strokeStyle=C.ink;g.fillStyle=C.ink;g.lineWidth=Math.max(2,r*0.05);g.lineCap='round';const ey=-r*0.1,ex=r*0.4;
if(o.glasses){for(const s of[-1,1]){g.beginPath();g.arc(s*ex,ey,r*0.27,0,7);g.stroke();}g.beginPath();g.moveTo(-r*0.13,ey);g.lineTo(r*0.13,ey);g.stroke();}
for(const s of[-1,1]){g.beginPath();g.arc(s*ex,ey,r*0.06,0,7);g.fill();}g.beginPath();g.arc(0,r*0.3,r*0.32,0.3,Math.PI-0.3);g.stroke();g.restore();}

// ---------- звук
function sfx(s){return (t,n,v=0.12,p)=>{if(t>=0&&t<s.duration)s.play(t,n,clamp(v,0.05,0.3),p?{pitch:clamp(p,0.5,2)}:undefined);};}
function cuts(s,SC,v=0.16){const P=sfx(s);SC.forEach((r,i)=>{if(i>0)P(r[0],i===SC.length-1?'magic':(i%2?'marimba_run':'kalimba_run'),v);});}

return {F,SERIF,MONO,C,PAL,clamp,lerp,prog,eo,eio,back,spring,settle,outP,rgba,rng,rr,fnt,room,T,Tr,lines,words,headline,caption,pill,
chips,fmt,countInt,typeOn,counter,bg,shadow,cam,par,scene,fromSubs,swap,rise,stepDots,phone,browser,card,bubble,typing,btn,toggle,bar,
ring,bars,check,cross,pin,stamp,tap,cursor,corners,live,wave,gear,arrow,row,field,tiles,bot,person,sfx,cuts};
})();