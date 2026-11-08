// lib.js. Стиль "Неоновый запуск": тёмный tech-ролик, лаймовый акцент, телефон-герой, шторки-полосы.
const LAUNCH = (() => {
// ---------- константы, палитра, шрифты ----------
const W=1080,H=1920,X0=60,X1=1020,TX0=70,TX1=1010;
const C={bg:'#0C0D12',ink:'#F4F2EC',acc:'#C8FF3D',mut:'#8E93A3',vio:'#7B6CFF',dk:'#1A1C23',panel:'#1B1D26',
 line:'#2F3240',paper:'#F6F1E9',good:'#2BD46A',warn:'#FF9F1C',bad:'#FF4D4D',sky:'#8AB6F9',sand:'#E9C46A'};
const PALS=[['#120B2E','#FF3DCB','#3DF2FF','#7B6CFF'],['#F3E9D2','#E76F51','#E9C46A','#2A9D8F'],['#FFF15C','#FF3B3B','#1A1C23','#3D7BFF'],
 ['#1D2B53','#FFEC27','#008751','#29ADFF'],['#22352B','#F2F2F2','#9FB8A5','#5E7D6A'],['#0F0F10','#F5C26B','#3A2E28','#7A5C46']];
const FS='"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif';
const FSERIF='"DejaVu Serif",Georgia,"Noto Serif","Times New Roman",serif';
const FM='"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace';
const font=(s,w)=>(w||800)+' '+Math.max(1,Math.round(s))+'px '+FS;
const mono=(s,w)=>(w||600)+' '+Math.max(1,Math.round(s))+'px '+FM;
const serif=(s,w)=>(w||700)+' '+Math.max(1,Math.round(s))+'px '+FSERIF;
// ---------- математика, изинги, пружины ----------
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,p)=>a+(b-a)*p;
const prog=(t,t0,d)=>clamp((t-t0)/d,0,1);
const eo=p=>{p=clamp(p,0,1);return 1-Math.pow(1-p,3);};
const eio=p=>{p=clamp(p,0,1);return p<0.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;};
const back=p=>{p=clamp(p,0,1);const c=1.70158;return 1+(c+1)*Math.pow(p-1,3)+c*Math.pow(p-1,2);};
const spring=p=>p<=0?0:p>=1.6?1:1-Math.exp(-5*p)*Math.cos(9*p);
const springAt=(t,t0,d)=>spring((t-t0)/(d||0.6));
const move=(t,t0,a,b,d)=>lerp(a,b,spring((t-t0)/(d||0.7)));
function appear(t,t0,t1){const a=eo((t-t0)/0.3);return t1===undefined?a:a*(1-eo((t-t1+0.22)/0.2));}
function shake(t,t0,amp){const q=t-t0;return q>0?Math.sin(q*40)*(amp||14)*Math.exp(-q*8):0;}
function hash(n){const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);}
const fmt=n=>{const s=String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g,' ');return n<0?'-'+s:s;};
const norm=w=>String(w).toLowerCase().replace(/[.,:;!?«»"()]/g,'');
// ---------- примитивы ----------
function rr(g,x,y,w,h,r){w=Math.max(0,w);h=Math.max(0,h);r=Math.max(0,Math.min(r,w/2,h/2));g.beginPath();g.moveTo(x+r,y);
 g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function dot(g,x,y,r,col){g.fillStyle=col;g.beginPath();g.arc(x,y,Math.max(0,r),0,7);g.fill();}
function ctext(g,s,x,y){g.textAlign='center';g.fillText(s,x,y);g.textAlign='left';}
function fit(g,text,size,maxW,wt,fam){const f=fam==='mono'?mono:fam==='serif'?serif:font;g.font=f(size,wt);
 const w=g.measureText(text).width;if(w>maxW&&w>0){size*=maxW/w;g.font=f(size,wt);}return size;}
const placeX=(x,w)=>clamp(x,TX0,TX1-w);
function reset(g){g.textBaseline='alphabetic';g.textAlign='left';g.globalAlpha=1;g.setLineDash([]);g.lineCap='butt';g.lineJoin='miter';}
// ---------- кэш текстур ----------
let CA=null;const SH={};
function shadow(w,h,r){const k=Math.round(w)+'x'+Math.round(h)+'x'+Math.round(r);if(SH[k])return SH[k];
 const c=new OffscreenCanvas(Math.round(w)+120,Math.round(h)+120),x=c.getContext('2d');x.shadowColor='rgba(0,0,0,0.6)';x.shadowBlur=40;
 x.fillStyle='#000';rr(x,60,60,w,h,r);x.fill();return SH[k]=c;}
function cache(){if(CA)return CA;CA={};
 const n=new OffscreenCanvas(256,256),x=n.getContext('2d');let s=7;const r=()=>(s=(s*16807)%2147483647)/2147483647;
 for(let i=0;i<4000;i++){x.fillStyle='rgba(255,255,255,'+(r()*0.07).toFixed(3)+')';x.fillRect(r()*256,r()*256,1.5,1.5);}CA.grain=n;
 const mk=c=>{const b=new OffscreenCanvas(512,512),y=b.getContext('2d'),gr=y.createRadialGradient(256,256,0,256,256,256);
  gr.addColorStop(0,c);gr.addColorStop(1,'rgba(0,0,0,0)');y.fillStyle=gr;y.fillRect(0,0,512,512);return b;};
 CA.b1=mk('rgba(123,108,255,0.45)');CA.b2=mk('rgba(200,255,61,0.16)');
 const sh=new OffscreenCanvas(600,1040),z=sh.getContext('2d');z.shadowColor='rgba(0,0,0,0.75)';z.shadowBlur=60;
 z.fillStyle='#000';rr(z,90,90,420,860,64);z.fill();CA.sh=sh;return CA;}
// фон: тёмная база, два дышащих пятна, ползущая сетка 120 px, мерцающее зерно
function bg(g,t,o){o=o||{};const c=cache();g.fillStyle=o.base||C.bg;g.fillRect(0,0,W,H);
 g.drawImage(c.b1,-160+Math.sin(t*0.4)*120,200+Math.cos(t*0.3)*100,1400,1400);
 g.drawImage(c.b2,-300+Math.cos(t*0.5)*100,1000+Math.sin(t*0.35)*120,1200,1200);
 if(o.grid!==false){g.strokeStyle='rgba(255,255,255,0.045)';g.lineWidth=1.5;const q=(t*24)%120;g.beginPath();
  for(let x=-q;x<W;x+=120){g.moveTo(x,0);g.lineTo(x,H);}for(let y=-(q*0.5)%120;y<H;y+=120){g.moveTo(0,y);g.lineTo(W,y);}g.stroke();}
 const j=(Math.floor(t*12)%4)*37;for(let x=-j;x<W;x+=256)for(let y=-j;y<H;y+=256)g.drawImage(c.grain,x,y);}
// ---------- текст ----------
function wrap(g,text,maxW){const ws=String(text).split(/\s+/).filter(Boolean),L=[];let cur='';
 for(const w of ws){const s=cur?cur+' '+w:w;if(cur&&g.measureText(s).width>maxW){L.push(cur);cur=w;}else cur=s;}
 if(cur)L.push(cur);
 for(let i=L.length-1;i>0;i--){const a=L[i-1].split(' '),b=L[i].split(' ');
  if(b.length===1&&a.length>2){const m=a[a.length-1]+' '+b[0];if(g.measureText(m).width<=maxW){a.pop();L[i-1]=a.join(' ');L[i]=m;}}}
 return L;}
function layout(g,text,size,maxW,o){o=o||{};const wt=o.wt||800,ml=o.maxLines||3,mn=o.min||40,arr=Array.isArray(text);let s=size,lines=[];
 for(let k=0;k<12;k++){g.font=font(s,wt);lines=arr?text.slice():wrap(g,text,maxW);
  if(!arr&&lines.length===2&&lines[1].indexOf(' ')<0){const one=lines.join(' '),fw=g.measureText(one).width;
   if(fw*0.8<=maxW){s*=maxW/fw*0.98;g.font=font(s,wt);lines=[one];}}
  const mw=Math.max(0,...lines.map(l=>g.measureText(l).width));
  if(mw>maxW){s*=maxW/mw*0.99;continue;}
  if(lines.length>ml&&s*0.9>=mn){s*=0.9;continue;}break;}
 g.font=font(s,wt);return {lines,s};}
// по словам: каждое выезжает из маски снизу, ключевое лаймом + растущее подчёркивание
function words(g,text,x,y,size,t,t0,o){o=o||{};const al=o.align||'left',wt=o.wt||800;
 const av=al==='center'?2*Math.min(x-TX0,TX1-x):al==='right'?x-TX0:TX1-x;
 const maxW=Math.max(40,Math.min(o.w||940,av));const Lo=layout(g,text,size,maxW,{wt,maxLines:o.maxLines,min:o.min});
 const s=Lo.s,lh=s*(o.lh||1.1),sw=g.measureText(' ').width,out=o.out===undefined?1:o.out,st=o.stag||0.08,du=o.dur||0.3;
 const keys=(Array.isArray(o.key)?o.key:o.key?[o.key]:[]).map(norm),hl=o.hl||C.acc;let n=0;
 if(out>0)Lo.lines.forEach((ln,li)=>{const tw=g.measureText(ln).width;let cx=al==='center'?x-tw/2:al==='right'?x-tw:x;const by=y+li*lh+s*0.85;
  ln.split(' ').forEach(w=>{const ww=g.measureText(w).width,tw0=t0+n*st,p=eo((t-tw0)/du);n++;
   if(p>0){const hot=keys.length>0&&keys.indexOf(norm(w))>=0;
    g.save();g.globalAlpha*=out;g.beginPath();g.rect(cx-8,by-s*1.05,ww+16,s*1.38);g.clip();
    g.fillStyle=hot?hl:(o.col||C.ink);g.fillText(w,cx,by+(1-p)*s);g.restore();
    if(hot){const q=eo((t-tw0-0.2)/0.35);g.save();g.globalAlpha*=out;g.fillStyle=hl;g.fillRect(cx,by+s*0.14,ww*q,Math.max(6,s*0.07));g.restore();}}
   cx+=ww+sw;});});
 const nw=Lo.lines.join(' ').split(' ').length;
 return {bottom:y+Lo.lines.length*lh,size:s,lines:Lo.lines.length,end:t0+nw*st+du};}
function headline(g,text,y,t,t0,key,o){o=Object.assign({},o||{});o.key=key;return words(g,text,o.x||TX0,y,o.size||108,t,t0,o);}
function subline(g,text,y,t,t0,o){o=Object.assign({col:C.mut,wt:600},o||{});return words(g,text,o.x||TX0,y,o.size||56,t,t0,o);}
// контурная капсула-кикер ("Новый запуск")
function tag(g,text,cx,y,t,t0,o){o=o||{};const p=eo((t-t0)/0.3)*(o.out===undefined?1:o.out);if(p<=0)return;
 const fs=fit(g,text,o.size||40,Math.min(860,2*Math.min(cx-TX0,TX1-cx)-60),700),w=g.measureText(text).width+fs*1.6,h=fs*1.8,yy=y+(1-p)*20;
 g.save();g.globalAlpha*=p;rr(g,cx-w/2,yy,w,h,h/2);g.strokeStyle=o.col||C.acc;g.lineWidth=3;g.stroke();
 g.fillStyle=o.col||C.acc;g.textAlign='center';g.textBaseline='middle';g.fillText(text,cx,yy+h/2+fs*0.04);g.restore();}
// мелкая тёмная плашка (внутри экранов)
function pill(g,x,y,txt,o){o=o||{};const fs=fit(g,txt,o.size||22,o.w||300,700),w=g.measureText(txt).width+fs*1.36,h=fs*1.9;
 rr(g,x,y,w,h,h/2);g.fillStyle=o.bg||'rgba(0,0,0,0.55)';g.fill();g.fillStyle=o.col||'#fff';g.fillText(txt,x+fs*0.68,y+h*0.69);return w;}
// ---------- значки (рисуются штрихом) ----------
function glyph(g,name,x,y,s,col){const u=s/2;g.save();g.translate(x,y);g.strokeStyle=g.fillStyle=col||C.dk;
 g.lineWidth=Math.max(2,s*0.13);g.lineCap='round';g.lineJoin='round';g.beginPath();
 switch(name){
 case 'sound':g.fillRect(-u*0.9,-u*0.35,u*0.5,u*0.7);g.moveTo(-u*0.4,-u*0.35);g.lineTo(u*0.15,-u*0.8);g.lineTo(u*0.15,u*0.8);g.lineTo(-u*0.4,u*0.35);g.fill();
  g.beginPath();g.arc(u*0.2,0,u*0.7,-0.8,0.8);g.stroke();break;
 case 'text':g.font=font(s*0.75,800);g.textAlign='center';g.textBaseline='middle';g.fillText('Аа',0,s*0.03);break;
 case 'plus':g.moveTo(-u*0.7,0);g.lineTo(u*0.7,0);g.moveTo(0,-u*0.7);g.lineTo(0,u*0.7);g.stroke();break;
 case 'pill':g.rotate(0.6);rr(g,-u,-u*0.5,s,u,u*0.5);g.stroke();g.beginPath();g.moveTo(0,-u*0.5);g.lineTo(0,u*0.5);g.stroke();break;
 case 'check':g.moveTo(-u*0.6,0);g.lineTo(-u*0.15,u*0.45);g.lineTo(u*0.65,-u*0.45);g.stroke();break;
 case 'cross':g.moveTo(-u*0.55,-u*0.55);g.lineTo(u*0.55,u*0.55);g.moveTo(u*0.55,-u*0.55);g.lineTo(-u*0.55,u*0.55);g.stroke();break;
 case 'eye':g.moveTo(-u,0);g.quadraticCurveTo(0,-u*0.9,u,0);g.quadraticCurveTo(0,u*0.9,-u,0);g.stroke();g.beginPath();g.arc(0,0,u*0.3,0,7);g.fill();break;
 case 'heart':g.moveTo(0,u*0.75);g.bezierCurveTo(-u*1.2,-u*0.1,-u*0.5,-u,0,-u*0.35);g.bezierCurveTo(u*0.5,-u,u*1.2,-u*0.1,0,u*0.75);g.fill();break;
 case 'bolt':g.moveTo(u*0.2,-u);g.lineTo(-u*0.5,u*0.1);g.lineTo(0,u*0.1);g.lineTo(-u*0.2,u);g.lineTo(u*0.5,-u*0.1);g.lineTo(0,-u*0.1);g.closePath();g.fill();break;
 case 'star':for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?u*0.42:u;g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath();g.fill();break;
 case 'chat':rr(g,-u*0.9,-u*0.7,u*1.8,u*1.1,u*0.3);g.stroke();g.beginPath();g.moveTo(-u*0.4,u*0.4);g.lineTo(-u*0.6,u*0.85);g.lineTo(0,u*0.4);g.stroke();break;
 case 'camera':rr(g,-u*0.95,-u*0.55,u*1.9,u*1.2,u*0.2);g.stroke();g.beginPath();g.arc(0,u*0.05,u*0.35,0,7);g.stroke();break;
 case 'clock':g.arc(0,0,u*0.85,0,7);g.stroke();g.beginPath();g.moveTo(0,-u*0.5);g.lineTo(0,0);g.lineTo(u*0.4,u*0.2);g.stroke();break;
 case 'lock':rr(g,-u*0.7,-u*0.1,u*1.4,u*0.95,u*0.15);g.fill();g.beginPath();g.arc(0,-u*0.1,u*0.45,Math.PI,0);g.stroke();break;
 case 'arrow':g.moveTo(-u*0.7,0);g.lineTo(u*0.7,0);g.moveTo(u*0.25,-u*0.45);g.lineTo(u*0.7,0);g.lineTo(u*0.25,u*0.45);g.stroke();break;
 default:g.arc(0,0,u*0.4,0,7);g.fill();}
 g.restore();}
// ---------- плашки и метки ----------
// чип-фича: капсула с лаймовым кружком-значком, въезжает сбоку пружиной
function chip(g,x,y,label,icon,p,o){if(p<=0)return;o=o||{};const right=!!o.right,av=right?x-TX0:TX1-x,maxW=Math.min(o.w||560,av);
 let fs=o.size||44;g.font=font(fs,700);let tw=g.measureText(label).width,w=fs*2.7+tw;
 if(w>maxW){fs*=maxW/w;g.font=font(fs,700);tw=g.measureText(label).width;w=fs*2.7+tw;}
 const h=fs*1.9,x0=right?x-w:x;let off=(1-p)*(right?-120:120);off=clamp(off,TX0-x0,TX1-w-x0);
 g.save();g.globalAlpha*=clamp(p*3,0,1);g.translate(off,0);rr(g,x0,y,w,h,h/2);g.fillStyle=o.bg||C.panel;g.fill();
 g.strokeStyle=C.line;g.lineWidth=2;g.stroke();dot(g,x0+h/2,y+h/2,h*0.31,o.col||C.acc);glyph(g,icon,x0+h/2,y+h/2,h*0.36,C.dk);
 g.font=font(fs,700);g.fillStyle=C.ink;g.fillText(label,x0+h*0.98,y+h/2+fs*0.35);g.restore();}
// круглая оценка-бейдж (пружина)
function badge(g,x,y,r,col,text,p){if(p<=0)return;g.save();g.translate(x,y);g.scale(p,p);dot(g,0,0,r,col);
 const fs=fit(g,text,r*0.65,r*1.6,800);g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.fillText(text,0,fs*0.06);g.restore();}
// счётчик целыми, правый край стабилен; вернёт {w,size} конечного числа
function counter(g,to,x,y,size,t,t0,o){o=o||{};const al=o.align||'left',pre=o.prefix||'',suf=o.suffix||'',wt=o.wt||900;
 const av=al==='center'?2*Math.min(x-TX0,TX1-x):al==='right'?x-TX0:TX1-x,full=pre+fmt(to)+suf;
 const s=fit(g,full,size,Math.min(o.w||940,av),wt),fw=g.measureText(full).width,a=eo((t-t0+0.1)/0.25)*(o.out===undefined?1:o.out);
 if(a>0){const n=Math.round(lerp(o.from||0,to,eo((t-t0)/(o.dur||1.6))));g.save();g.globalAlpha*=a;g.fillStyle=o.col||C.acc;g.textAlign='right';
  g.fillText(pre+fmt(n)+suf,al==='left'?x+fw:al==='center'?x+fw/2:x,y);g.restore();}
 return {w:fw,size:s};}
// фирменная "большая цифра": число 250 px + слово справа + серая строка ниже; y = базовая линия числа
function bigStat(g,to,label,x,y,t,t0,o){o=o||{};const out=o.out===undefined?1:o.out;
 const r=counter(g,to,x,y,o.size||250,t,t0,{dur:o.dur||1.6,suffix:o.suffix,out,w:o.nw||620});
 const lx=x+r.w+30,ls=o.ls||100;let bottom=y+r.size*0.12;
 if(label){if(TX1-lx>=240)words(g,label,lx,y-ls*0.85,ls,t,t0+0.1,{out,maxLines:1,key:o.key});
  else bottom=words(g,label,x,y+30,ls,t,t0+0.1,{out,key:o.key}).bottom;}
 if(o.sub)bottom=words(g,o.sub,x,bottom+20,o.ss||60,t,t0+0.3,{col:C.mut,wt:600,out}).bottom;
 return bottom;}
// штамп: падает с масштаба 2.4, наклон, контур лаймом
function stamp(g,text,cx,y,t,t0,o){o=o||{};const p=eo((t-t0)/0.22)*(o.out===undefined?1:o.out);if(p<=0)return;const col=o.col||C.acc;
 cx=clamp(cx,TX0+120,TX1-120);const fs=fit(g,text,o.size||50,Math.min(o.w||820,2*Math.min(cx-TX0,TX1-cx)-90),900);
 const tw=g.measureText(text).width,sc=1+1.4*(1-eo((t-t0)/0.22));
 g.save();g.translate(cx,y);g.rotate(o.rot===undefined?-0.06:o.rot);g.scale(sc,sc);g.globalAlpha*=p;
 rr(g,-tw/2-fs*0.6,-fs*0.92,tw+fs*1.2,fs*1.84,fs*0.28);g.lineWidth=Math.max(4,fs*0.12);g.strokeStyle=col;g.stroke();
 g.fillStyle=col;g.textAlign='center';g.textBaseline='middle';g.fillText(text,0,fs*0.06);g.restore();}
// вордмарк: буквы выезжают из маски каскадом + лаймовый бейдж прыгает пружиной
function wordmark(g,word,bdg,cx,y,size,t,t0,o){o=o||{};const out=o.out===undefined?1:o.out;if(out<=0)return;
 const av=2*Math.min(cx-TX0,TX1-cx);let fs=size;
 const meas=()=>{g.font=font(fs*0.78,900);const bw=bdg?Math.max(fs*1.2,g.measureText(bdg).width+fs*0.42):0;g.font=font(fs,900);return [g.measureText(word).width,bw];};
 let [tw,bw]=meas();const tot=tw+(bdg?fs*0.2:0)+bw;if(tot>av){fs*=av/tot;[tw,bw]=meas();}
 const gp=bdg?fs*0.2:0,x0=cx-(tw+gp+bw)/2;g.font=font(fs,900);
 for(let i=0;i<word.length;i++){const xi=x0+g.measureText(word.slice(0,i)).width,w=g.measureText(word[i]).width,p=eo((t-t0-0.1-i*0.035)/0.3);if(p<=0)continue;
  g.save();g.globalAlpha*=out;g.beginPath();g.rect(xi-4,y-fs,w+8,fs*1.3);g.clip();g.fillStyle=o.col||C.ink;g.fillText(word[i],xi,y+(1-p)*fs);g.restore();}
 const p=spring((t-t0-0.55)/0.6);if(!bdg||p<=0)return;g.save();g.globalAlpha*=out;g.translate(x0+tw+gp+bw/2,y-fs*0.36);g.scale(p,p);
 g.rotate(-0.1*(1-Math.min(p,1)));rr(g,-bw/2,-fs*0.55,bw,fs*1.1,fs*0.24);g.fillStyle=C.acc;g.fill();g.fillStyle=C.bg;g.font=font(fs*0.78,900);
 g.textAlign='center';g.textBaseline='middle';g.fillText(bdg,0,fs*0.04);g.restore();}
// печатающаяся подпись в тёмной плашке (o.local=1 внутри экрана телефона)
function typeBox(g,text,cx,y,w,t,t0,o){o=o||{};const n=Math.floor(clamp((t-t0)*(o.rate||28),0,text.length));if(n<=0)return;
 if(!o.local){w=Math.min(w,TX1-TX0);cx=clamp(cx,TX0+w/2,TX1-w/2);}
 const fs=fit(g,text,o.size||28,w-40,700),h=fs*2.85;rr(g,cx-w/2,y,w,h,fs*0.65);g.fillStyle=o.bg||'rgba(0,0,0,0.6)';g.fill();
 g.fillStyle=o.col||'#fff';g.textAlign='center';g.fillText(text.slice(0,n),cx,y+h/2+fs*0.36);g.textAlign='left';}
// пузырь чата: me=1 справа фиолетовый
function bubble(g,x,y,txt,me,p,o){if(p<=0)return;o=o||{};const fs=fit(g,txt,o.size||24,(o.w||340)-36,600),w=g.measureText(txt).width+fs*1.5,h=fs*2.33;
 g.save();g.translate(x,y);g.scale(p,p);g.globalAlpha*=clamp(p*2,0,1);rr(g,me?-w:0,0,w,h,h*0.4);g.fillStyle=me?C.vio:'#fff';g.fill();
 g.fillStyle=me?'#fff':C.dk;g.fillText(txt,(me?-w:0)+fs*0.75,h*0.66);g.restore();}
// список выгод с галочками
function checklist(g,items,x,y,t,t0,o){o=o||{};const f0=o.size||48,gap=o.gap||f0*1.7,maxW=Math.min(o.w||940,TX1-x)-f0*1.4,out=o.out===undefined?1:o.out;
 items.forEach((it,i)=>{const p=eo((t-t0-i*(o.stag||0.15))/0.35);if(p<=0||out<=0)return;const fs=fit(g,it,f0,maxW,700),yy=y+i*gap+f0*0.5;
  g.save();g.globalAlpha*=out*p;g.translate((1-p)*40,0);dot(g,x+f0*0.45,yy,f0*0.45,o.col||C.acc);glyph(g,'check',x+f0*0.45,yy,f0*0.55,C.dk);
  g.font=font(fs,700);g.fillStyle=C.ink;g.textBaseline='middle';g.fillText(it,x+f0*1.3,yy+fs*0.04);g.restore();});
 return y+items.length*gap;}
// строка-легенда: [[текст,цвет],...] по центру, активный пункт ярче
function legend(g,items,cy,t,t0,o){o=o||{};let fs=o.size||44;g.font=font(fs,700);let ws=items.map(q=>g.measureText(q[0]).width);
 let tot=ws.reduce((a,b)=>a+b,0)+items.length*fs*2.2-fs*1.2;if(tot>TX1-TX0){const k=(TX1-TX0)/tot;fs*=k;ws=ws.map(v=>v*k);tot*=k;g.font=font(fs,700);}
 let x=540-tot/2;items.forEach((q,i)=>{const p=eo((t-t0-i*(o.stag||0.4))/0.3),on=o.active===undefined||o.active===i;
  if(p>0){g.save();g.globalAlpha*=p*(on?1:0.45)*(o.out===undefined?1:o.out);dot(g,x+fs*0.35,cy-fs*0.33,fs*0.33*(on?1.2:1),q[1]);
   g.fillStyle=C.ink;g.fillText(q[0],x+fs,cy);g.restore();}x+=ws[i]+fs*2.2;});}
// ---------- герои и экраны ----------
// телефон-герой: экран в локальных координатах x -192..192, y -412..412, screen(g,t)
function phone(g,x,y,s,r,t,screen,o){o=o||{};g.save();g.translate(x,y);g.rotate(r||0);g.scale(s,s);g.drawImage(cache().sh,-300,-490);
 rr(g,-210,-430,420,860,64);g.fillStyle=C.dk;g.fill();g.strokeStyle='#3A3E4A';g.lineWidth=3;g.stroke();
 g.save();rr(g,-192,-412,384,824,50);g.clip();g.fillStyle=o.screen||C.paper;g.fillRect(-192,-412,384,824);
 if(screen){g.save();screen(g,t);g.restore();}
 g.fillStyle='rgba(255,255,255,0.06)';g.beginPath();g.moveTo(-192,-412);g.lineTo(40,-412);g.lineTo(-192,60);g.fill();g.restore();
 rr(g,-60,-400,120,30,15);g.fillStyle='#0B0C10';g.fill();g.restore();}
function scrHeader(g,title,o){o=o||{};dot(g,-160,-340,10,o.col||C.vio);fit(g,title,30,300,800);g.fillStyle=C.dk;g.fillText(title,-140,-330);}
// уголки видоискателя, дышат
function corners(g,t,o){o=o||{};const b=(o.size||150)+Math.sin(t*5)*6,ay=o.ay||1.25,a=o.arm||36;g.strokeStyle=o.col||C.acc;g.lineWidth=o.lw||6;g.beginPath();
 for(const[sx,sy]of[[-1,-1],[1,-1],[1,1],[-1,1]]){const cx=(o.x||0)+sx*b*0.85,cy=(o.y||0)+sy*b*ay;g.moveTo(cx,cy-sy*a);g.lineTo(cx,cy);g.lineTo(cx-sx*a,cy);}g.stroke();}
// линия-сканер сверху вниз за dur
function scan(g,t,t0,dur,y0,y1,o){o=o||{};if(t<t0||t>t0+dur)return;const y=lerp(y0,y1,eo((t-t0)/dur)),w=o.w||384;
 g.fillStyle='rgba(200,255,61,0.25)';g.fillRect(-w/2,y-30,w,30);g.fillStyle=C.acc;g.fillRect(-w/2,y,w,5);}
function pulse(g,x,y,r,t,o){o=o||{};const f=(t*(o.speed||1.4))%1;g.strokeStyle='rgba(255,255,255,'+(1-f).toFixed(2)+')';
 if(o.ring)g.strokeStyle=o.ring;g.globalAlpha*=1;g.lineWidth=4;g.beginPath();g.arc(x,y,r*(1.15+f*2.8),0,7);g.stroke();dot(g,x,y,r,o.col||'#fff');}
function eq(g,x,y,n,t,o){o=o||{};g.fillStyle=o.col||C.acc;const x0=x-(n*20-10)/2;
 for(let j=0;j<n;j++){const h=8+Math.abs(Math.sin(t*9+j*0.7))*(o.amp||26);g.fillRect(x0+j*20,y-h/2,10,h);}}
function typingDots(g,x,y,t,col){for(let j=0;j<3;j++){g.globalAlpha=0.3+0.5*Math.abs(Math.sin(t*6-j));dot(g,x+j*22,y,7,col||C.dk);}g.globalAlpha=1;}
// пейзаж-миниатюра по палитре PALS[i]
function tile(g,x,y,w,h,pal,t){g.save();g.beginPath();g.rect(x,y,w,h);g.clip();g.fillStyle=pal[0];g.fillRect(x,y,w,h);
 dot(g,x+w*0.68,y+h*(0.3+0.03*Math.sin(t*2)),Math.min(w,h)*0.17,pal[1]);
 g.fillStyle=pal[2];g.beginPath();g.ellipse(x+w*0.25,y+h*0.98,w*0.65,h*0.36,0,0,7);g.fill();
 g.fillStyle=pal[3];g.beginPath();g.ellipse(x+w*0.9,y+h*1.04,w*0.6,h*0.32,0,0,7);g.fill();g.restore();}
function priceTag(g,x,y,txt,rot,p,o){if(p<=0)return;o=o||{};g.save();g.translate(x,y);g.rotate(rot||0);g.scale(p,p);
 rr(g,-80,-40,160,80,12);g.fillStyle='#fff';g.fill();dot(g,-60,0,7,o.hole||'#5B4636');fit(g,txt,34,110,800);g.fillStyle=C.dk;ctext(g,txt,10,12);g.restore();}
// парящая UI-карточка с тенью-спрайтом; fn(g,w,h) рисует содержимое от (0,0)
function card(g,x,y,w,h,p,fn,o){if(p<=0)return;o=o||{};w=Math.min(w,X1-X0);x=clamp(x,X0,X1-w);const r=o.r||28;
 g.save();g.translate(x+w/2,y+h/2);g.rotate((o.tilt||0)+(o.rot||0.08)*(1-Math.min(p,1)));g.scale(p,p);g.globalAlpha*=clamp(p*3,0,1);
 g.drawImage(shadow(w,h,r),-w/2-60,-h/2-40);rr(g,-w/2,-h/2,w,h,r);g.fillStyle=o.bg||C.panel;g.fill();g.strokeStyle=o.stroke||C.line;g.lineWidth=2;g.stroke();
 g.translate(-w/2,-h/2);if(fn)fn(g,w,h);g.restore();}
// сквозной маскот-значок: лаймовый скруглённый квадрат с фиолетовым "глазом", моргает и смотрит
function orb(g,x,y,s,t,o){o=o||{};if(s<=0)return;const lx=o.look?o.look[0]:Math.sin(t*0.9)*0.5,ly=o.look?o.look[1]:Math.cos(t*0.7)*0.3;
 const bl=hash(Math.floor(t/2.7))>0.4&&(t%2.7)<0.14;g.save();g.translate(x,y);rr(g,-s/2,-s/2,s,s,s*0.26);g.fillStyle=o.col||C.acc;g.fill();
 g.fillStyle=o.iris||C.vio;g.beginPath();g.ellipse(lx*s*0.08,ly*s*0.08,s*0.24,bl?s*0.03:s*0.24,0,0,7);g.fill();
 if(!bl)dot(g,lx*s*0.08+s*0.08,ly*s*0.08-s*0.06,s*0.07,'#fff');g.restore();}
function micBtn(g,x,y,r,t){const f=(t*1.2)%1;g.strokeStyle='rgba(123,108,255,'+(1-f).toFixed(2)+')';g.lineWidth=4;g.beginPath();g.arc(x,y,r+f*r*0.8,0,7);g.stroke();
 dot(g,x,y,r,C.acc);g.fillStyle=C.dk;rr(g,x-r*0.18,y-r*0.44,r*0.36,r*0.68,r*0.18);g.fill();}
// пунктирная связь + бегущая точка
function link(g,x1,y1,x2,y2,t,t0,o){o=o||{};const cp=eo((t-t0)/0.4);if(cp<=0)return;g.save();g.setLineDash([10,12]);
 g.strokeStyle='rgba(255,255,255,'+(0.4*cp*(o.out===undefined?1:o.out)).toFixed(2)+')';g.lineWidth=4;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();g.restore();
 const lt=o.loop?((t-t0-0.4)%1.2):(t-t0-0.4);if(lt>0&&lt<0.6){const e=eo(lt/0.6);dot(g,lerp(x1,x2,e),lerp(y1,y2,e),12,C.acc);}}
// ---------- сцены, камера, переходы ----------
// T = начала сцен [0,3,7,...]; out гаснет за 0.26 с до склейки
function scene(t,T){let i=0;while(i<T.length-1&&t>=T[i+1])i++;const last=i===T.length-1;
 return {i,lt:t-T[i],last,t0:T[i],t1:last?Infinity:T[i+1],out:last?1:1-eo((t-T[i+1]+0.26)/0.22)};}
function keyframe(K,i,p){const A=K[Math.min(i,K.length-1)],B=K[Math.min(i+1,K.length-1)];return A.map((v,j)=>lerp(v,B[j],p));}
// камера: оседание 0.965→1 за 0.7 с + медленный наезд; закрывать camEnd(g)
function camera(g,lt,o){o=o||{};const f=o.from||0.965,s=f+(1-f)*eo(lt/0.7)+(o.push===undefined?0.003:o.push)*Math.min(lt,5);
 g.save();g.translate(540+(o.x||0),960+(o.y||0));g.scale(s,s);if(o.rot)g.rotate(o.rot);g.translate(-540,-960);return s;}
function camEnd(g){g.restore();}
function parallax(t,depth){return {x:Math.sin(t*0.5)*depth*10,y:Math.cos(t*0.4)*depth*8};}
// сегменты прогресса вверху (y 120)
function progress(g,t,T,dur,o){const n=T.length,gap=10,w=(TX1-TX0-gap*(n-1))/n,y=(o&&o.y)||120;
 for(let i=0;i<n;i++){const x=TX0+i*(w+gap),e=i<n-1?T[i+1]:dur,f=clamp((t-T[i])/Math.max(0.1,e-T[i]),0,1);
  g.fillStyle='rgba(255,255,255,0.15)';g.fillRect(x,y,w,6);g.fillStyle=C.acc;g.fillRect(x,y,w*f,6);}}
// фирменная шторка: наклонные фиолетовая + лаймовая полосы пролетают через кадр, центр ровно на склейке
function wipe(g,t,T){for(let i=1;i<T.length;i++){const p=(t-T[i]+0.2)/0.4;if(p<=0||p>=1)continue;const e=eio(p);
 g.save();g.translate(-900+e*2900,960);g.rotate(0.25);g.fillStyle=C.vio;g.fillRect(-470,-1400,160,2800);g.fillStyle=C.acc;g.fillRect(-290,-1400,290,2800);g.restore();}}
// ---------- звук ----------
function sfx(s,list){list.forEach(e=>s.play(e[0],e[1],clamp(e[2]||0.12,0.05,0.3),{pitch:e[3]||1}));}
function cutSounds(s,T,vol){for(let i=1;i<T.length;i++)s.play(T[i],i%2?'marimba_run':'kalimba_run',vol||0.16,{pitch:1});}
return {W,H,C,PALS,FS,FSERIF,FM,font,mono,serif,clamp,lerp,prog,eo,eio,back,spring,springAt,move,appear,shake,hash,fmt,
 rr,dot,ctext,fit,placeX,reset,shadow,cache,bg,wrap,layout,words,headline,subline,tag,pill,glyph,chip,badge,counter,bigStat,
 stamp,wordmark,typeBox,bubble,checklist,legend,phone,scrHeader,corners,scan,pulse,eq,typingDots,tile,priceTag,card,
 orb,micBtn,link,scene,keyframe,camera,camEnd,parallax,progress,wipe,sfx,cutSounds};
})();