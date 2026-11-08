// lib.js - стиль SAAS: продуктовый ролик сервиса. Два фона: глубокий индиго со свечением и «дождём» строк,
// светлый лавандовый с сеткой. Жирный гротеск с плотным трекингом, второе слово сиреневым или зачёркнуто,
// белые карточки интерфейса с лавандовой тенью, тёмные стеклянные карточки, вкладки-таблетки, курсор.
const SAAS = (() => {
const F='"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif';
const FT='"Inter","Inter Display",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif';
const SERIF='"DejaVu Serif",Georgia,"Noto Serif","Times New Roman",serif';
const MONO='"DejaVu Sans Mono",ui-monospace,Menlo,"Roboto Mono",monospace';
const C={
  night:'#09051B', night2:'#120A2D', glow:'#3B1C93',            // тёмный фон и свечение
  paper:'#ECEAF4', paperGlow:'#D8CCFA', grid:'rgba(70,50,160,0.045)', // светлый фон
  ink:'#0C0624', inkSoft:'#6B6488', mute:'#8C86A8', line:'#ECEAF4', white:'#FFFFFF',
  violet:'#5B2EEB', violetHi:'#6D3BFF', lilac:'#9A80F8', lilacGrey:'#B3ABD6', red:'#E8304A',
  green:'#17A35A', greenBg:'#DEF6EA', orange:'#C26A00', orangeBg:'#FFF1DC', rose:'#C8233F', roseBg:'#FDE6EA',
  term:'#120B2E', termBar:'#19113A', termRow:'#1A1340', glass:'#181232',
  // яркие для тёмных карточек и меток
  dGreen:'#3DDC84', dBlue:'#6E8BFF', dOrange:'#F5A524', dPink:'#F05B9C', dViolet:'#A98BFF', dRed:'#FF5470', dGrey:'#9A94B8'
};
const SEG=['#34C77B','#4C7BF4','#F2A324','#E0457B','#9B8BC8','#E5484D'];
const X0=60,X1=1020;

// ---------- математика
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,u)=>a+(b-a)*u;
const prog=(lt,a=0,d=0.4)=>clamp((lt-a)/d);
const eo=x=>1-Math.pow(1-clamp(x),3);
const eo5=x=>1-Math.pow(1-clamp(x),5);
const eio=x=>{x=clamp(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;};
const back=(x,c=1.3)=>{x=clamp(x);return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2);};
const spring=(x,f=12,d=6)=>x<=0?0:1-Math.exp(-d*x)*Math.cos(f*x);
function rgba(hex,a){const n=parseInt(String(hex).slice(1),16);return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')';}
function rng(seed){let s=Math.imul(seed|0,-1640531535)>>>0||123456789;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
function cv(w,h){const c=new OffscreenCanvas(Math.max(1,Math.ceil(w)),Math.max(1,Math.ceil(h)));return [c,c.getContext('2d')];}
const fmt=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,' ');
const rub=n=>fmt(n)+' ₽';
const countInt=(lt,a,d,from,to)=>Math.round(lerp(from,to,eo(prog(lt,a,d))));
const typeOn=(s,lt,a,cps=18)=>String(s).slice(0,Math.max(0,Math.floor((lt-a)*cps)));
const norm=s=>String(s).toLowerCase().replace(/[^0-9a-zа-яё%₽]/g,'');

// ---------- геометрия
function rr(g,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);
g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function fnt(g,w,sz,fam){g.font=(w||600)+' '+Math.max(8,Math.round(sz))+'px '+(fam||F);}

// ---------- текст с трекингом (без letterSpacing: по буквам, ширины в кэше)
const WC=new Map();
function cw(g,ch){const k=g.font+'|'+ch;let v=WC.get(k);if(v==null){v=g.measureText(ch).width;if(WC.size>6000)WC.clear();WC.set(k,v);}return v;}
function trW(g,s,tr){let w=0;for(const ch of s)w+=cw(g,ch)+tr;return s.length?w-tr:0;}
function trDraw(g,s,x,y,tr){g.textAlign='left';for(const ch of s){g.fillText(ch,x,y);x+=cw(g,ch)+tr;}return x;}
// T: строка без трекинга, ужимается до maxW и до края кадра
function T(g,s,x,y,sz,col,w=500,al='left',fam=FT,maxW=1e9){s=String(s);fnt(g,w,sz,fam);
const room=al==='center'?2*Math.min(x-X0,X1-x):al==='right'?x-X0:X1-x;const lim=Math.max(30,Math.min(maxW,room));
let m=g.measureText(s).width;if(m>lim){fnt(g,w,sz*lim/m,fam);m=lim;}
g.fillStyle=col;g.textAlign=al;g.textBaseline='middle';g.fillText(s,x,y);return m;}
// Tr: то же внутри трансформаций (без проверки края кадра)
function Tr(g,s,x,y,sz,col,w=500,al='left',fam=FT,maxW=1e9){s=String(s);fnt(g,w,sz,fam);let m=g.measureText(s).width;
if(m>maxW){fnt(g,w,sz*maxW/m,fam);m=maxW;}g.fillStyle=col;g.textAlign=al;g.textBaseline='middle';g.fillText(s,x,y);return m;}
// label: моно капсом с разрядкой (надзаголовок «ПРОВЕРКА ЧЕКА»)
function label(g,s,x,y,o={}){s=String(s).toUpperCase();const sz=o.size||24;fnt(g,o.weight||700,sz,MONO);
let tr=sz*(o.tr==null?0.22:o.tr),w=trW(g,s,tr);const lim=o.maxW||(X1-X0);if(w>lim){tr=Math.max(0,tr-(w-lim)/Math.max(1,s.length-1));w=trW(g,s,tr);}
const al=o.align||'left',x0=al==='center'?x-w/2:al==='right'?x-w:x;g.save();g.globalAlpha*=o.p==null?1:eo(o.p);
g.fillStyle=o.color||C.violet;g.textBaseline='middle';trDraw(g,s,x0,y,tr);g.restore();return w;}
// body: подпись обычным начертанием с переносом. y = верх. Возвращает высоту
function body(g,s,x,y,o={}){const sz=o.size||36,w=o.weight||400,lh=sz*(o.lh||1.35),al=o.align||'left';fnt(g,w,sz,FT);
const room=al==='center'?2*Math.min(x-X0,X1-x):X1-x,lim=Math.min(o.maxW||1e9,room);const ws=String(s).split(/\s+/);const L=[];let cur='';
for(const wd of ws){const t=cur?cur+' '+wd:wd;if(g.measureText(t).width>lim&&cur){L.push(cur);cur=wd;}else cur=t;}if(cur)L.push(cur);
const p=o.p==null?1:eo(o.p);g.save();g.globalAlpha*=p;g.fillStyle=o.color||C.inkSoft;g.textAlign=al;g.textBaseline='top';
L.forEach((l,i)=>{fnt(g,w,sz,FT);let m=g.measureText(l).width;if(m>lim)fnt(g,w,sz*lim/m,FT);g.fillText(l,x,y+i*lh+(1-p)*16);});g.restore();return L.length*lh;}

// слово заголовка заранее в спрайт (крупные буквы дорогие): ключ - слово, размер, цвет, трекинг
const WS=new Map();
function wordSpr(g,w,wt,sz,col,tr){sz=Math.round(sz);const k=w+'|'+wt+'|'+sz+'|'+col+'|'+tr.toFixed(2)+'|'+g.font.slice(-12);let c=WS.get(k);if(c)return c;
fnt(g,wt,sz,F);const ww=trW(g,w,tr),pad=Math.ceil(sz*0.12),asc=Math.ceil(sz*1.0),[cc,x]=cv(ww+pad*2,asc+sz*0.35);x.font=g.font;x.fillStyle=col;x.textBaseline='alphabetic';
let xx=pad;for(const ch of w){x.fillText(ch,xx,asc);xx+=cw(g,ch)+tr;}cc.pad=pad;cc.asc=asc;if(WS.size>260)WS.clear();WS.set(k,cc);return cc;}
// head: главный заголовок. lines: массив строк. Слова встают из-под маски по одному (шаг 0,07 с), без перелёта.
// o: size 120, align 'center'|'left', dark, lt, delay, stagger, key:[слова сиреневым/фиолетовым], grey:[индексы строк серым],
// strike:'слово', strikeAt (лок. время), out 0..1, maxW, tr (трекинг в em, -0.045). y = верх блока.
// Возвращает {sz,h,w,box:{слово:{x,y,w,h}}} - рамки слов (для круга-кнопки).
function head(g,lines,x,y,o={}){const wt=o.weight||800,al=o.align||'center',dark=!!o.dark;
const base=o.color||(dark?C.white:C.ink),grey=o.greyColor||(dark?C.lilacGrey:C.inkSoft),keyC=o.keyColor||(dark?C.lilac:C.violet);
const room=al==='center'?2*Math.min(x-X0,X1-x):al==='right'?x-X0:X1-x,lim=Math.min(o.maxW||1e9,room);
let sz=o.size||120;const trk=o.tr==null?-0.045:o.tr;const L=lines.map(l=>String(l).split(/\s+/).filter(Boolean));
const meas=()=>{fnt(g,wt,sz,F);const tr=sz*trk,sp=cw(g,' ')*0.82;return L.map(ws=>{const wd=ws.map(w=>trW(g,w,tr));return {wd,sp,tr,w:wd.reduce((a,b)=>a+b,0)+sp*(ws.length-1)};});};
let M=meas();const mx=Math.max(...M.map(m=>m.w));if(mx>lim){sz=Math.floor(sz*lim/mx);M=meas();}
const lh=sz*(o.lh||1.0),keys=(o.key||[]).map(norm),greys=o.grey||[],lt=o.lt==null?99:o.lt,d0=o.delay||0,st=o.stagger==null?0.07:o.stagger;
const out=clamp(o.out||0),box={};let n=0,maxw=0;g.save();g.globalAlpha*=1-out;g.textBaseline='alphabetic';
L.forEach((ws,li)=>{const m=M[li];maxw=Math.max(maxw,m.w);let cx=al==='center'?x-m.w/2:al==='right'?x-m.w:x;const top=y+li*lh-out*30,bl=top+sz*0.80;
g.save();g.beginPath();g.rect(cx-sz,top-sz*0.12,m.w+sz*2,lh+sz*0.2);g.clip();
ws.forEach((w,i)=>{const p=eo5((lt-d0-n*st)/0.5);n++;const nk=norm(w);box[nk]={x:cx,y:top,w:m.wd[i],h:sz};
if(p>0){const col=keys.includes(nk)?keyC:greys.includes(li)?grey:base;const sp=wordSpr(g,w,wt,sz,col,m.tr);g.drawImage(sp,cx-sp.pad,bl+(1-p)*lh-sp.asc);}
cx+=m.wd[i]+m.sp;});g.restore();});
if(o.strike){const b=box[norm(o.strike)],sp=eo(prog(lt,o.strikeAt||0,0.28));if(b&&sp>0){g.strokeStyle=o.strikeColor||C.red;g.lineWidth=Math.max(4,sz*0.075);g.lineCap='round';
const yy=b.y+sz*0.52;g.beginPath();g.moveTo(b.x-sz*0.04,yy);g.lineTo(b.x-sz*0.04+(b.w+sz*0.08)*sp,yy);g.stroke();}}
g.restore();return {sz,h:L.length*lh,w:maxw,box};}

// ---------- фоны (всё тяжёлое заранее в спрайтах)
const SPR={};let SHN=0;
function glowSpr(col){const k='g'+col;if(SPR[k])return SPR[k];const [c,x]=cv(256,256);const gr=x.createRadialGradient(128,128,0,128,128,128);
gr.addColorStop(0,rgba(col,1));gr.addColorStop(0.45,rgba(col,0.45));gr.addColorStop(1,rgba(col,0));x.fillStyle=gr;x.fillRect(0,0,256,256);return SPR[k]=c;}
function glow(g,x,y,r,col,a=1){g.save();g.globalAlpha*=a;g.drawImage(glowSpr(col),x-r,y-r,2*r,2*r);g.restore();}
function gridSpr(dark){const k='grid'+dark;if(SPR[k])return SPR[k];const [c,x]=cv(1080,1920);const s=dark?36:48;
x.strokeStyle=dark?'rgba(150,130,255,0.045)':C.grid;x.lineWidth=1;x.beginPath();for(let i=0;i<=1080;i+=s){x.moveTo(i+0.5,0);x.lineTo(i+0.5,1920);}
for(let j=0;j<=1920;j+=s){x.moveTo(0,j+0.5);x.lineTo(1080,j+0.5);}x.stroke();return SPR[k]=c;}
function vigSpr(){if(SPR.vig)return SPR.vig;const [c,x]=cv(540,960);const gr=x.createRadialGradient(270,430,120,270,480,620);
gr.addColorStop(0,'rgba(9,5,27,0)');gr.addColorStop(1,'rgba(6,3,18,0.92)');x.fillStyle=gr;x.fillRect(0,0,540,960);return SPR.vig=c;}
// «дождь»: колонки мелких моно-строк с цветными точками (один холст на кадр, прокрутка сверху вниз)
const RAIN_WORDS=['молоко 89 ₽','хлеб 54 ₽','такси 412 ₽','кофе 290 ₽','аптека 640 ₽','кино 399 ₽','сыр 512 ₽','бензин 2 100 ₽','обед 450 ₽',
'связь 600 ₽','кешбэк 37 ₽','фрукты 318 ₽','сад 3 200 ₽','обувь 4 990 ₽','вода 120 ₽','книги 780 ₽','спорт 1 500 ₽','свет 1 240 ₽'];
function rainSpr(){if(SPR.rain)return SPR.rain;const [c,x]=cv(1080,1920),R=rng(77);x.font='500 17px '+MONO;x.textBaseline='middle';
const DC=['#3DDC84','#6E8BFF','#F5A524','#F05B9C','#A98BFF','#FF5470'];
for(let i=0;i<7;i++){const xx=i*156+6,sh=Math.floor(R()*32);for(let y=14+sh;y<1920;y+=32){const w=RAIN_WORDS[Math.floor(R()*RAIN_WORDS.length)];
x.globalAlpha=0.3+R()*0.55;x.fillStyle=DC[Math.floor(R()*6)];x.beginPath();x.arc(xx+6,y,3,0,7);x.fill();x.fillStyle='#9C93D0';x.fillText(w,xx+16,y);}}return SPR.rain=c;}
// статичные фоны запекаются один раз (ключ - положение свечения)
function darkSpr(gx,gy,gr){const k='dk'+gx+'_'+gy+'_'+gr;if(SPR[k])return SPR[k];const [c,x]=cv(1080,1920);x.fillStyle=C.night;x.fillRect(0,0,1080,1920);
x.drawImage(glowSpr(C.glow),gx-gr,gy-gr,2*gr,2*gr);x.globalAlpha=0.5;x.drawImage(glowSpr('#2A1470'),gx-260-560,gy+520-560,1120,1120);x.globalAlpha=1;
x.drawImage(gridSpr(1),0,0);x.drawImage(vigSpr(),0,0,1080,1920);return SPR[k]=c;}
function lightSpr(cy){const k='lt'+cy;if(SPR[k])return SPR[k];const [c,x]=cv(1080,1920);x.fillStyle=C.paper;x.fillRect(0,0,1080,1920);
x.globalAlpha=0.85;x.drawImage(glowSpr(C.paperGlow),540-900,-80-900,1800,1800);x.globalAlpha=0.6;x.drawImage(glowSpr('#DCD2FF'),540-760,cy-760,1520,1520);
x.globalAlpha=0.5;x.drawImage(glowSpr('#E4DCFF'),120-520,1700-520,1040,1040);x.globalAlpha=1;x.drawImage(gridSpr(0),0,0);return SPR[k]=c;}
// bgDark: индиго, световое пятно (gx,gy,gr), сетка, виньетка; o.rain 0..1 - «дождь» строк
function bgDark(g,t,o={}){g.drawImage(darkSpr(o.gx==null?540:o.gx,o.gy==null?820:o.gy,o.gr||900),0,0);const ra=o.rain||0;
if(ra>0){const off=Math.floor((t*52)%1920),R=rainSpr();g.save();g.globalAlpha*=0.42*ra;
if(off>0)g.drawImage(R,0,1920-off,1080,off,0,0,1080,off);g.drawImage(R,0,0,1080,1920-off,0,off,1080,1920-off);g.restore();}}
// bgLight: лавандово-белый, мягкое свечение сверху и за карточкой (o.cy), сетка 48 px
function bgLight(g,t,o={}){g.drawImage(lightSpr(o.cy||1100),0,0);}

// ---------- карточки и окна
function shSpr(w,h,r,dark){w=Math.round(w);h=Math.round(h);const k='sh'+w+'x'+h+'x'+r+dark;if(SPR[k])return SPR[k];const pad=110,[c,x]=cv((w+2*pad)/2,(h+2*pad)/2);
x.scale(0.5,0.5);x.shadowColor=dark?'rgba(20,8,60,0.45)':'rgba(91,46,235,0.20)';x.shadowBlur=35;x.shadowOffsetY=17;x.shadowOffsetX=10000;x.fillStyle='#000';
rr(x,pad-20000,pad,w,h,r);x.fill();x.shadowColor=dark?'rgba(0,0,0,0.25)':'rgba(30,20,80,0.10)';x.shadowBlur=5;x.shadowOffsetY=2;rr(x,pad-20000,pad,w,h,r);x.fill();
SHN++;if(SHN>140){SHN=0;for(const kk in SPR)if(kk.startsWith('sh'))delete SPR[kk];}return SPR[k]=c;}
function shadow(g,x,y,w,h,r,dark){g.drawImage(shSpr(w,h,r,dark),x-110,y-110,Math.round(w)+220,Math.round(h)+220);}
// card: белая карточка интерфейса с тонкой лавандовой тенью. o.fill, o.r (22), o.dark (тёмное окно)
function card(g,x,y,w,h,o={}){const r=o.r||22;shadow(g,x,y,w,h,r,!!o.dark);g.fillStyle=o.fill||(o.dark?C.term:C.white);rr(g,x,y,w,h,r);g.fill();
g.strokeStyle=o.dark?'rgba(160,140,255,0.10)':'rgba(30,20,80,0.06)';g.lineWidth=2;g.stroke();}
// win: окно с тремя точками и моно-заголовком. Возвращает {x,y,w,h} рабочей области
function win(g,x,y,w,h,title,o={}){const dk=!!o.dark;card(g,x,y,w,h,{dark:dk});g.save();rr(g,x,y,w,h,22);g.clip();
g.fillStyle=dk?C.termBar:'#FBFAFE';g.fillRect(x,y,w,58);g.fillStyle=dk?'rgba(160,140,255,0.10)':'#EEECF5';g.fillRect(x,y+58,w,2);g.restore();
for(let i=0;i<3;i++){g.fillStyle=dk?'#3A3160':'#D9D5E8';g.beginPath();g.arc(x+32+i*22,y+29,6.5,0,7);g.fill();}
if(title){fnt(g,500,21,MONO);g.fillStyle=dk?'#8E86B5':C.mute;g.textAlign='center';g.textBaseline='middle';g.fillText(title,x+w/2,y+30);}
return {x:x+34,y:y+60,w:w-68,h:h-60};}
// rise: карточка въезжает снизу (лёгкий перелёт), вызывать внутри save/restore
function rise(g,p,dy=110){g.globalAlpha*=eo(p*1.6);g.translate(0,(1-back(p,1.1))*dy);}
// pop: масштаб с перелётом вокруг (x,y)
function pop(g,p,x,y){const s=back(p,1.6);g.globalAlpha*=clamp(p*2.5);g.translate(x,y);g.scale(s,s);g.translate(-x,-y);}

// ---------- элементы интерфейса
// field: поле ввода моно с мигающей кареткой. o.focus, o.caret, o.valid (зелёная рамка и метка)
function field(g,x,y,w,h,txt,o={}){const fc=o.valid?C.green:o.focus?C.violet:'#D9D5E8';g.fillStyle=C.white;rr(g,x,y,w,h,14);g.fill();
g.strokeStyle=fc;g.lineWidth=o.focus||o.valid?3:2;g.stroke();if(o.focus&&!o.valid){g.save();g.strokeStyle=rgba(C.violet,0.12);g.lineWidth=8;rr(g,x-4,y-4,w+8,h+8,17);g.stroke();g.restore();}
const sz=o.size||36;fnt(g,500,sz,MONO);let s=String(txt||o.ph||'');let m=g.measureText(s).width;const lim=w-48-(o.valid?150:0);
if(m>lim){fnt(g,500,sz*lim/m,MONO);m=lim;}g.fillStyle=txt?C.ink:'#B2ACC8';g.textAlign='left';g.textBaseline='middle';g.fillText(s,x+24,y+h/2);
if(o.caret&&(o.t||0)%0.9<0.5){g.fillStyle=C.violet;g.fillRect(x+26+m,y+h/2-sz*0.55,3,sz*1.1);}
if(o.valid)tag(g,'в норме',x+w-22,y+h/2,'green',{align:'right',size:24});}
// btn: фиолетовая кнопка. o.press 0..1 (утопление), o.w, o.h, o.dark (тёмная), o.icon 'down'
function btn(g,s,x,y,w,h,o={}){const pr=o.press||0,sc=1-0.05*Math.sin(clamp(pr)*Math.PI);g.save();g.translate(x+w/2,y+h/2);g.scale(sc,sc);
g.fillStyle=o.fill||(o.dark?C.ink:C.violet);rr(g,-w/2,-h/2,w,h,o.r||14);g.fill();g.fillStyle='rgba(255,255,255,0.12)';rr(g,-w/2,-h/2,w,h*0.5,o.r||14);g.fill();
let tx=0;if(o.icon==='down'){g.strokeStyle='#fff';g.lineWidth=3.5;g.lineCap='round';const ix=-w/2+40;g.beginPath();g.moveTo(ix,-12);g.lineTo(ix,10);g.moveTo(ix-9,2);g.lineTo(ix,11);g.lineTo(ix+9,2);g.moveTo(ix-11,17);g.lineTo(ix+11,17);g.stroke();tx=18;}
Tr(g,s,tx,0,o.size||34,'#fff',700,'center',FT,w-40);g.restore();}
// chip: маленькая таблетка-подпись. kind 'tint' (фиолетовый оттенок), 'dark' (чёрная с белым), 'white' (белая с тенью)
function chip(g,s,x,y,kind='tint',o={}){const sz=o.size||22;fnt(g,600,sz,MONO);const w=g.measureText(s).width+(o.icon?sz*1.4:0)+sz*1.3,h=sz*2;
const al=o.align||'left',x0=al==='right'?x-w:al==='center'?x-w/2:x;g.save();if(o.p!=null)pop(g,o.p,x0+w/2,y);if(o.rot)g.translate(0,0);
if(kind==='white')shadow(g,x0,y-h/2,w,h,h/2,0);g.fillStyle=kind==='dark'?C.ink:kind==='white'?'#fff':'#EFEAFE';rr(g,x0,y-h/2,w,h,h/2);g.fill();
let tx=x0+sz*0.65;const col=kind==='dark'?'#fff':kind==='white'?C.ink:C.violet;
if(o.icon==='timer'){g.strokeStyle=col;g.lineWidth=2.4;g.beginPath();g.arc(tx+sz*0.42,y+1,sz*0.38,0,7);g.moveTo(tx+sz*0.42,y+1);g.lineTo(tx+sz*0.42,y-sz*0.2);g.stroke();tx+=sz*1.4;}
if(o.icon==='coin'){g.strokeStyle=C.violet;g.lineWidth=2.4;g.beginPath();g.arc(tx+sz*0.42,y,sz*0.4,0,7);g.stroke();Tr(g,'₽',tx+sz*0.42,y+1,sz*0.6,C.violet,700,'center',FT);tx+=sz*1.4;}
g.fillStyle=col;g.textAlign='left';g.textBaseline='middle';fnt(g,600,sz,MONO);g.fillText(s,tx,y+1);g.restore();return w;}
// tag: метка статуса с точкой. col: 'green','orange','red','blue','violet','pink','grey'. o.dark - на тёмном
const TAGC={green:['#17A35A','#DEF6EA',C.dGreen],orange:['#B55F00','#FFF1DC',C.dOrange],red:['#C8233F','#FDE6EA',C.dRed],blue:['#2F5BD8','#E3EAFE',C.dBlue],
violet:['#5B2EEB','#ECE6FE',C.dViolet],pink:['#C02A6E','#FCE4F0',C.dPink],grey:['#6B6488','#EEECF5',C.dGrey]};
function tag(g,s,x,y,col='green',o={}){const sz=o.size||26,c=TAGC[col]||TAGC.green,dk=!!o.dark;fnt(g,600,sz,MONO);const w=g.measureText(s).width+sz*1.9,h=sz*1.7;
const x0=o.align==='right'?x-w:o.align==='center'?x-w/2:x;g.save();if(o.p!=null)pop(g,o.p,x0+w/2,y);
g.fillStyle=dk?rgba(c[2],0.16):c[1];rr(g,x0,y-h/2,w,h,h/2);g.fill();g.fillStyle=dk?c[2]:c[0];g.beginPath();g.arc(x0+sz*0.7,y,sz*0.2,0,7);g.fill();
fnt(g,600,sz,MONO);g.textAlign='left';g.textBaseline='middle';g.fillText(s,x0+sz*1.15,y+1);g.restore();return w;}
// steps: шкала проверки из точек-этапов. p 0..n (сколько пройдено, дробное), active рамка у текущей
function steps(g,x,y,w,names,p,o={}){const n=names.length,dx=w/(n-1);g.fillStyle='#E4E1EF';g.fillRect(x,y-2,w,4);
g.fillStyle=C.violet;g.fillRect(x,y-2,w*clamp(p/(n-1)),4);
names.forEach((nm,i)=>{const cx=x+i*dx,q=clamp(p-i+1),done=p>=i;
if(done){const s=0.8+0.2*back(clamp((p-i)*3));g.fillStyle=C.violet;g.beginPath();g.arc(cx,y,15*s,0,7);g.fill();
g.strokeStyle='#fff';g.lineWidth=3.2;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(cx-6,y);g.lineTo(cx-1.5,y+5);g.lineTo(cx+7,y-5);g.stroke();
if(p-i<0.6&&p<n-0.4||(i===n-1&&p<n)){g.strokeStyle=rgba(C.violet,0.25);g.lineWidth=3;g.beginPath();g.arc(cx,y,25,0,7);g.stroke();}}
else{g.fillStyle='#fff';g.strokeStyle='#D5D1E4';g.lineWidth=2.5;g.beginPath();g.arc(cx,y,14,0,7);g.fill();g.stroke();}
Tr(g,nm,cx,y+44,o.size||22,done?C.ink:C.mute,done?700:500,i===0?'left':i===n-1?'right':'center',MONO);});}
// score: большой счёт «85/100». x - правый край
function score(g,n,x,y,o={}){const sz=o.size||150;fnt(g,500,sz*0.26,MONO);const sw=g.measureText('/100').width;
g.fillStyle=C.mute;g.textAlign='right';g.textBaseline='alphabetic';g.fillText(o.of||'/100',x,y);fnt(g,800,sz,F);const tr=-sz*0.04;
const s=String(n),w=trW(g,s,tr);g.fillStyle=o.color||C.ink;trDraw(g,s,x-sw-10-w,y,tr);return w+sw+10;}
// minibars: мини-полоски вклада («цены +40»). items [[подпись, доля 0..1]]
function minibars(g,items,x,y,w,p){const n=items.length,gap=14,bw=(w-gap*(n-1))/n;items.forEach(([s,v],i)=>{const bx=x+i*(bw+gap),q=eo(prog(p,i*0.12,0.5));
Tr(g,s,bx,y,17,C.mute,500,'left',MONO,bw);g.fillStyle='#ECE9F6';rr(g,bx,y+16,bw,6,3);g.fill();g.fillStyle=C.violet;rr(g,bx,y+16,Math.max(6,bw*v*q),6,3);g.fill();});}
// segbar: сегментная полоса распределения. parts [доли], p 0..1
function segbar(g,x,y,w,h,parts,p,cols=SEG){const tot=parts.reduce((a,b)=>a+b,0);g.fillStyle='#ECE9F6';rr(g,x,y,w,h,h/2);g.fill();g.save();rr(g,x,y,w,h,h/2);g.clip();
let cx=x;const lim=x+w*eo(p);parts.forEach((v,i)=>{const sw=w*v/tot;g.fillStyle=cols[i%cols.length];g.fillRect(cx,y,Math.max(0,Math.min(sw,lim-cx)),h);cx+=sw;});g.restore();}
// stat: плитка-итог с подписью и крупным числом (светлая)
function stat(g,x,y,w,h,lbl,val,col='green',p=1){const c=TAGC[col];g.save();pop(g,p,x+w/2,y+h/2);g.fillStyle=c[1];rr(g,x,y,w,h,18);g.fill();
Tr(g,lbl,x+24,y+38,26,c[0],600,'left',FT,w-40);Tr(g,val,x+24,y+h-50,44,c[0],700,'left',MONO,w-40);g.restore();}
// glass: тёмная стеклянная карточка с цветным свечением в углу. col - hex
function glass(g,x,y,w,h,col,o={}){g.fillStyle='rgba(30,22,68,0.78)';rr(g,x,y,w,h,20);g.fill();g.save();rr(g,x,y,w,h,20);g.clip();
g.globalAlpha*=0.42;g.drawImage(glowSpr(col),x+w*0.35,y-h*0.55,w*1.1,h*1.3);g.restore();
g.strokeStyle='rgba(190,175,255,0.12)';g.lineWidth=2;rr(g,x+1,y+1,w-2,h-2,19);g.stroke();}
// tabs: таблетки-вкладки сверху, активная (тёмная) переезжает с from на act за 0,4 с
function tabs(g,names,act,cy,lt,o={}){const sz=o.size||28;fnt(g,600,sz,FT);const pad=sz*0.95,ws=names.map(s=>g.measureText(s).width+pad*2);
let tot=ws.reduce((a,b)=>a+b,0)+12;const sc=Math.min(1,(X1-X0)/tot);g.save();g.translate(540,cy);g.scale(sc,sc);const x0=-tot/2,h=sz*2.5;
shadow(g,x0,-h/2,tot,h,h/2,0);g.fillStyle='#fff';rr(g,x0,-h/2,tot,h,h/2);g.fill();
const pos=[];let cx=x0+6;ws.forEach(w=>{pos.push(cx);cx+=w;});const from=o.from==null?act:o.from,q=eio(prog(lt,o.at||0.05,0.42));
const ax=lerp(pos[from],pos[act],q),aw=lerp(ws[from],ws[act],q);g.fillStyle=C.ink;rr(g,ax,-h/2+6,aw,h-12,(h-12)/2);g.fill();
names.forEach((s,i)=>{const on=Math.abs(pos[i]+ws[i]/2-(ax+aw/2))<aw*0.5;fnt(g,600,sz,FT);g.fillStyle=on?'#fff':'#3B3555';g.textAlign='center';g.textBaseline='middle';g.fillText(s,pos[i]+ws[i]/2,1);});
g.restore();}
// cursor: стрелка-курсор. o.press 0..1 - нажатие (сжатие и круг)
function cursor(g,x,y,o={}){const pr=o.press||0;if(pr>0&&pr<1){g.save();g.strokeStyle=rgba(C.violet,0.5*(1-pr));g.lineWidth=4;g.beginPath();g.arc(x,y,16+40*eo(pr),0,7);g.stroke();g.restore();}
const s=(o.s||1.5)*(1-0.12*Math.sin(clamp(pr)*Math.PI));g.save();g.translate(x,y);g.scale(s,s);g.beginPath();
g.moveTo(0,0);g.lineTo(0,30);g.lineTo(7.5,23);g.lineTo(12.5,34);g.lineTo(17.5,31.5);g.lineTo(12.5,21);g.lineTo(22,21);g.closePath();
g.fillStyle=C.ink;g.fill();g.strokeStyle='#fff';g.lineWidth=2.2;g.lineJoin='round';g.stroke();g.restore();}
// path: позиция по точкам [[x,y],...] за отрезок [a,b] (ease in-out), для курсора
function path(lt,pts,a,b){const u=eio(prog(lt,a,b-a)),n=pts.length-1,f=u*n,i=Math.min(n-1,Math.floor(f)),q=f-i;return [lerp(pts[i][0],pts[i+1][0],q),lerp(pts[i][1],pts[i+1][1],q)];}
// checkTile: тёмная плитка с галочкой (пункты списка на тёмном фоне), всплывает с поворотом
function checkTile(g,x,y,s,p){if(p<=0)return;g.save();g.translate(x,y);g.rotate((1-eo(p))*-0.5);const k=back(p,1.6);g.scale(k,k);g.globalAlpha*=clamp(p*3);
g.fillStyle='#24175A';rr(g,-s/2,-s/2,s,s,s*0.26);g.fill();g.strokeStyle='rgba(169,139,255,0.35)';g.lineWidth=2;g.stroke();
g.strokeStyle='#fff';g.lineWidth=s*0.08;g.lineCap='round';g.lineJoin='round';const L=s*0.5;g.setLineDash([L,L]);g.lineDashOffset=L*(1-eo(prog(p,0.3,0.7)));
g.beginPath();g.moveTo(-s*0.17,0);g.lineTo(-s*0.04,s*0.13);g.lineTo(s*0.19,-s*0.12);g.stroke();g.setLineDash([]);g.restore();}
// icon: значок сервиса (фиолетовая плитка, белый чек с галочкой). o.p - влёт с поворотом, o.draw - прорисовка знака
function icon(g,x,y,s,o={}){const p=o.p==null?1:o.p;if(p<=0)return;g.save();g.translate(x,y);g.rotate((1-eo(p))*-0.9);const k=back(p,1.4);g.scale(k,k);
const gr=g.createLinearGradient(-s/2,-s/2,s/2,s/2);gr.addColorStop(0,C.violetHi);gr.addColorStop(1,'#4B1FD6');g.fillStyle=gr;rr(g,-s/2,-s/2,s,s,s*0.26);g.fill();
const d=o.draw==null?1:o.draw;g.strokeStyle='#fff';g.lineWidth=s*0.075;g.lineCap='round';g.lineJoin='round';
const L=s*2.2;g.setLineDash([L*eo(d),L]);g.beginPath();const a=s*0.22,t=-s*0.27,b=s*0.22;g.moveTo(-a,b);g.lineTo(-a,t);g.lineTo(a,t);g.lineTo(a,b);
for(let i=0;i<4;i++){g.lineTo(a-(i+0.5)*a/2,b-s*0.07);g.lineTo(a-(i+1)*a/2,b);}g.stroke();g.setLineDash([]);
const c=eo(prog(d,0.5,0.5));if(c>0){const L2=s*0.5;g.setLineDash([L2,L2]);g.lineDashOffset=L2*(1-c);g.beginPath();g.moveTo(-s*0.11,-s*0.03);g.lineTo(-s*0.02,s*0.06);g.lineTo(s*0.12,-s*0.1);g.stroke();g.setLineDash([]);}
g.restore();}
// node: узел-сервис на схеме связей (белая плашка: имя + моно-подпись)
function node(g,x,y,name,sub,p){if(p<=0)return;fnt(g,700,30,FT);const w=Math.max(g.measureText(name).width,90)+56,h=92;g.save();pop(g,p,x,y);
shadow(g,x-w/2,y-h/2,w,h,16,0);g.fillStyle='#fff';rr(g,x-w/2,y-h/2,w,h,16);g.fill();g.strokeStyle='#ECEAF4';g.lineWidth=2;g.stroke();
Tr(g,name,x,y-12,30,C.ink,700,'center');label(g,sub,x,y+24,{size:15,align:'center',tr:0.15});g.restore();}
// link: пунктир от a к b с бегущей точкой. p - прорисовка
function link(g,ax,ay,bx,by,p,t,o={}){if(p<=0)return;g.save();g.strokeStyle=o.col||'#B9B0DA';g.lineWidth=2.5;g.setLineDash([7,9]);g.lineDashOffset=-t*30;
g.beginPath();g.moveTo(ax,ay);g.lineTo(lerp(ax,bx,eo(p)),lerp(ay,by,eo(p)));g.stroke();g.setLineDash([]);
if(p>=1){const u=((t*0.6+(o.ph||0))%1);g.fillStyle=C.violet;g.beginPath();g.arc(lerp(ax,bx,u),lerp(ay,by,u),6,0,7);g.fill();}g.restore();}

// ---------- камера, сцены, переходы
// cam: медленный наезд за сцену (2,5%) вокруг (cx,cy); вызывать внутри save/restore
function cam(g,lt,dur,o={}){const z=1+(o.z||0.025)*eio(clamp(lt/Math.max(0.5,dur)))+(o.kick||0)*Math.exp(-6*lt);const cx=o.cx||540,cy=o.cy||960;
g.translate(cx,cy);g.scale(z,z);g.translate(-cx,-cy);return z;}
// scene: CUTS = [[t0, fn(g,lt,t,S), {type:'cut'|'circle'|'panel'|'fade'|'tab', d, x,y,r}] ...]
function scene(t,CUTS,dur=1e9){let i=0;for(let j=0;j<CUTS.length;j++)if(t>=CUTS[j][0])i=j;const t0=CUTS[i][0],t1=i+1<CUTS.length?CUTS[i+1][0]:dur;
return {i,t0,t1,lt:t-t0,dur:t1-t0,last:i===CUTS.length-1,tr:CUTS[i][2]||{}};}
function drawSc(g,CUTS,i,t,dur){const t0=CUTS[i][0],t1=i+1<CUTS.length?CUTS[i+1][0]:dur;g.save();CUTS[i][1](g,t-t0,t,{i,dur:t1-t0,last:i===CUTS.length-1});g.restore();}
// play: рисует текущую сцену с переходом:
// circle - белый круг прилетает на ключевое слово (x,y) за 0,6 с до склейки и раскрывается в новую сцену;
// panel - новая сцена выезжает снизу панелью с круглыми верхними углами; fade - растворение со взлётом старой;
// tab - быстрое растворение карточки при смене вкладки.
function play(g,t,CUTS,dur){const S=scene(t,CUTS,dur),tr=S.tr,d=tr.d||(tr.type==='circle'?0.5:tr.type==='tab'?0.32:0.45),p=S.lt/d;
if(S.i>0&&p<1&&tr.type&&tr.type!=='cut'){const q=eio(p);
if(tr.type==='circle'){drawSc(g,CUTS,S.i-1,t,dur);g.save();g.beginPath();g.arc(tr.x,tr.y,lerp(tr.r||64,2300,eo5(p)),0,7);g.clip();drawSc(g,CUTS,S.i,t,dur);g.restore();}
else if(tr.type==='panel'){g.save();const sc=1-0.04*q;g.translate(540,700);g.scale(sc,sc);g.translate(-540,-700);drawSc(g,CUTS,S.i-1,t,dur);g.restore();
g.fillStyle=rgba(C.night,0.35*q);g.fillRect(0,0,1080,1920);const Y=lerp(1960,-120,eo(p));g.save();rr(g,-4,Y,1088,2200,90);g.clip();g.translate(0,(1-eo(p))*140);drawSc(g,CUTS,S.i,t,dur);g.restore();}
else{g.save();const sc=1+0.05*q;g.translate(540,900);g.scale(sc,sc);g.translate(-540,-900);drawSc(g,CUTS,S.i-1,t,dur);g.restore();
g.save();g.globalAlpha=tr.type==='tab'?q:eo(p);drawSc(g,CUTS,S.i,t,dur);g.restore();}}
else drawSc(g,CUTS,S.i,t,dur);
const nx=CUTS[S.i+1];if(nx&&nx[2]&&nx[2].type==='circle'){const tc=nx[0],fd=nx[2].fly||0.6,q=(t-(tc-fd))/fd;
if(q>0&&q<=1){const r=nx[2].r||64,u=back(clamp(q/0.75),1.2),x=lerp(1180,nx[2].x,u),y=lerp(nx[2].y+260,nx[2].y,u);g.save();
g.fillStyle='rgba(20,8,60,0.25)';g.beginPath();g.arc(x+8,y+18,r*1.02,0,7);g.fill();const gr=g.createRadialGradient(x-r*0.3,y-r*0.3,r*0.1,x,y,r);
gr.addColorStop(0,'#FFFFFF');gr.addColorStop(1,'#E6E1F7');g.fillStyle=gr;g.beginPath();g.arc(x,y,r*(0.6+0.4*eo(q*2)),0,7);g.fill();g.restore();}}
return S;}

// ---------- звук
function sfx(s){return (t,n,v=0.12,p)=>{if(t>=0&&t<s.duration)s.play(t,n,clamp(v,0.05,0.3),p?{pitch:clamp(p,0.5,2)}:undefined);};}
// cutSounds: на склейки marimba_run/kalimba_run попеременно, на вкладках toggle_on, на финале magic
function cutSounds(s,CUTS,v=0.16){const P=sfx(s);CUTS.forEach((r,i)=>{if(!i)return;const ty=(r[2]||{}).type;
P(r[0],i===CUTS.length-1?'magic':ty==='tab'?'toggle_on':(i%2?'marimba_run':'kalimba_run'),ty==='tab'?v*0.8:v);});}

return {F,FT,SERIF,MONO,C,SEG,TAGC,clamp,lerp,prog,eo,eo5,eio,back,spring,rgba,rng,cv,fmt,rub,countInt,typeOn,norm,rr,fnt,cw,trW,trDraw,T,Tr,
label,body,head,glow,bgDark,bgLight,card,win,rise,pop,field,btn,chip,tag,steps,score,minibars,segbar,stat,glass,tabs,cursor,path,checkTile,icon,node,link,
cam,scene,play,sfx,cutSounds};
})();
