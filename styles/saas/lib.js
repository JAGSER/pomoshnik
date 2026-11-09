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
let xx=pad;for(const ch of w){x.fillText(ch,xx,asc);xx+=cw(g,ch)+tr;}cc.pad=pad;cc.asc=asc;if(WS.size>500)WS.clear();WS.set(k,cc);return cc;}
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
// «дождь»: колонки мелких моно-строк с цветными точками; слова только из параметра words (по теме ролика), без слов - точки и штрихи
function rainSpr(words){const k='rain'+(words||[]).join('|');if(SPR[k])return SPR[k];const [c,x]=cv(1080,1920),R=rng(77);x.font='500 17px '+MONO;x.textBaseline='middle';
const DC=['#3DDC84','#6E8BFF','#F5A524','#F05B9C','#A98BFF','#FF5470'];
for(let i=0;i<7;i++){const xx=i*156+6,sh=Math.floor(R()*32);for(let y=14+sh;y<1920;y+=32){const r1=R(),r2=R(),r3=R();
x.globalAlpha=0.3+r2*0.55;x.fillStyle=DC[Math.floor(r3*6)];x.beginPath();x.arc(xx+6,y,3,0,7);x.fill();x.fillStyle='#9C93D0';
if(words&&words.length)x.fillText(words[Math.floor(r1*words.length)],xx+16,y);else x.fillRect(xx+16,y-2,30+r1*80,4);}}return SPR[k]=c;}
// статичные фоны запекаются один раз (ключ - положение свечения)
// фоны строятся в 1/4 разрешения (мягкие пятна), растягиваются один раз, сетка поверх в полном - сборка ~5 мс вместо ~30
function softBg(draw){const [s,y]=cv(270,480);y.scale(0.25,0.25);draw(y);const [c,x]=cv(1080,1920);x.imageSmoothingQuality='high';x.drawImage(s,0,0,1080,1920);return [c,x];}
function darkSpr(gx,gy,gr){const k='dk'+gx+'_'+gy+'_'+gr;if(SPR[k])return SPR[k];const [c,x]=softBg(x=>{x.fillStyle=C.night;x.fillRect(0,0,1080,1920);
x.drawImage(glowSpr(C.glow),gx-gr,gy-gr,2*gr,2*gr);x.globalAlpha=0.5;x.drawImage(glowSpr('#2A1470'),gx-260-560,gy+520-560,1120,1120);x.globalAlpha=1;x.drawImage(vigSpr(),0,0,1080,1920);});
x.drawImage(gridSpr(1),0,0);return SPR[k]=c;}
function lightSpr(cy){const k='lt'+cy;if(SPR[k])return SPR[k];const [c,x]=softBg(x=>{x.fillStyle=C.paper;x.fillRect(0,0,1080,1920);
x.globalAlpha=0.85;x.drawImage(glowSpr(C.paperGlow),540-900,-80-900,1800,1800);x.globalAlpha=0.6;x.drawImage(glowSpr('#DCD2FF'),540-760,cy-760,1520,1520);
x.globalAlpha=0.5;x.drawImage(glowSpr('#E4DCFF'),120-520,1700-520,1040,1040);x.globalAlpha=1;});x.drawImage(gridSpr(0),0,0);return SPR[k]=c;}
// bgDark: индиго, световое пятно (gx,gy,gr), сетка, виньетка; o.rain 0..1 - «дождь» строк, o.words - слова дождя (из темы)
function bgDark(g,t,o={}){g.drawImage(darkSpr(o.gx==null?540:o.gx,o.gy==null?820:o.gy,o.gr||900),0,0);const ra=o.rain||0;
if(ra>0){const off=Math.floor((t*52)%1920),R=rainSpr(o.words);g.save();g.globalAlpha*=0.42*ra;
if(off>0)g.drawImage(R,0,1920-off,1080,off,0,0,1080,off);g.drawImage(R,0,0,1080,1920-off,0,off,1080,1920-off);g.restore();}}
// bgLight: лавандово-белый, мягкое свечение сверху и за карточкой (o.cy), сетка 48 px
function bgLight(g,t,o={}){g.drawImage(lightSpr(o.cy||1100),0,0);}

// ---------- карточки и окна
function shSpr(w,h,r,dark){w=Math.round(w);h=Math.round(h);const k='sh'+w+'x'+h+'x'+r+dark;if(SPR[k])return SPR[k];const pad=110,[c,x]=cv((w+2*pad)/2,(h+2*pad)/2);
x.scale(0.5,0.5);x.shadowColor=dark?'rgba(20,8,60,0.45)':'rgba(91,46,235,0.20)';x.shadowBlur=35;x.shadowOffsetY=17;x.shadowOffsetX=10000;x.fillStyle='#000';
rr(x,pad-20000,pad,w,h,r);x.fill();x.shadowColor=dark?'rgba(0,0,0,0.25)':'rgba(30,20,80,0.10)';x.shadowBlur=5;x.shadowOffsetY=2;rr(x,pad-20000,pad,w,h,r);x.fill();
SHN++;if(SHN>140){SHN=0;for(const kk in SPR)if(kk.startsWith('sh'))delete SPR[kk];}return SPR[k]=c;}
// крупные карточки: тень 9 кусками только по краям (середину всё равно закрывает карточка) - дёшево для больших окон
function sh9(r,dark){const k='s9'+r+dark;if(SPR[k])return SPR[k];const c=shSpr(2*r+40,2*r+40,r,dark);return SPR[k]=c;}
function shadow(g,x,y,w,h,r,dark){w=Math.round(w);h=Math.round(h);if(w*h<200000||w<2*r+60||h<2*r+60){g.drawImage(shSpr(w,h,r,dark),x-110,y-110,w+220,h+220);return;}
const s=sh9(r,dark),cw=2*r+40,S2=cw+220,a=110+r+10,sx=[0,a,S2-a,S2],dx=[x-110,x-110+a,x+w+110-a,x+w+110],dy=[y-110,y-110+a,y+h+110-a,y+h+110];
for(let i=0;i<3;i++)for(let j=0;j<3;j++){if(i===1&&j===1)continue;g.drawImage(s,sx[i]/2,sx[j]/2,(sx[i+1]-sx[i])/2,(sx[j+1]-sx[j])/2,dx[i],dy[j],dx[i+1]-dx[i],dy[j+1]-dy[j]);}}
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
// field: поле ввода моно с мигающей кареткой. o.focus, o.caret, o.valid (зелёная рамка; строка - ещё и метка с этим текстом)
function field(g,x,y,w,h,txt,o={}){const fc=o.valid?C.green:o.focus?C.violet:'#D9D5E8';g.fillStyle=C.white;rr(g,x,y,w,h,14);g.fill();
g.strokeStyle=fc;g.lineWidth=o.focus||o.valid?3:2;g.stroke();if(o.focus&&!o.valid){g.save();g.strokeStyle=rgba(C.violet,0.12);g.lineWidth=8;rr(g,x-4,y-4,w+8,h+8,17);g.stroke();g.restore();}
const sz=o.size||36;fnt(g,500,sz,MONO);let s=String(txt||o.ph||'');let m=g.measureText(s).width;const lim=w-48-(typeof o.valid==='string'?150:0);
if(m>lim){fnt(g,500,sz*lim/m,MONO);m=lim;}g.fillStyle=txt?C.ink:'#B2ACC8';g.textAlign='left';g.textBaseline='middle';g.fillText(s,x+24,y+h/2);
if(o.caret&&(o.t||0)%0.9<0.5){g.fillStyle=C.violet;g.fillRect(x+26+m,y+h/2-sz*0.55,3,sz*1.1);}
if(typeof o.valid==='string')tag(g,o.valid,x+w-22,y+h/2,'green',{align:'right',size:24});}
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
// score: большой счёт. x - правый край, o.of - приписка мелко («/100», «лет»)
function score(g,n,x,y,o={}){const sz=o.size||150,of=o.of||'';fnt(g,500,sz*0.26,MONO);const sw=of?g.measureText(of).width:-10;
g.fillStyle=C.mute;g.textAlign='right';g.textBaseline='alphabetic';if(of)g.fillText(of,x,y);fnt(g,800,sz,F);const tr=-sz*0.04;
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
// icon: плитка-значок градиентом. o.glyph: 'check' (галочка, по умолчанию), 'receipt' (чек), или o.text (буква/цифра), или o.art(g,s) свой рисунок темы;
// o.p - влёт с поворотом, o.draw - прорисовка знака. Ставь, только если у темы есть сервис/бренд/знак; иначе герой темы
function icon(g,x,y,s,o={}){const p=o.p==null?1:o.p;if(p<=0)return;g.save();g.translate(x,y);g.rotate((1-eo(p))*-0.9);const k=back(p,1.4);g.scale(k,k);
const gr=g.createLinearGradient(-s/2,-s/2,s/2,s/2);gr.addColorStop(0,o.col||C.violetHi);gr.addColorStop(1,o.col2||'#4B1FD6');g.fillStyle=gr;rr(g,-s/2,-s/2,s,s,s*0.26);g.fill();
const d=o.draw==null?1:o.draw;g.strokeStyle='#fff';g.lineWidth=s*0.075;g.lineCap='round';g.lineJoin='round';
if(o.art){g.save();g.globalAlpha*=eo(d);o.art(g,s);g.restore();}
else if(o.text){g.save();g.globalAlpha*=eo(d);Tr(g,o.text,0,s*0.03,s*0.5,'#fff',800,'center',F,s*0.8);g.restore();}
else if(o.glyph==='receipt'){const L=s*2.2;g.setLineDash([L*eo(d),L]);g.beginPath();const a=s*0.22,t=-s*0.27,b=s*0.22;g.moveTo(-a,b);g.lineTo(-a,t);g.lineTo(a,t);g.lineTo(a,b);
for(let i=0;i<4;i++){g.lineTo(a-(i+0.5)*a/2,b-s*0.07);g.lineTo(a-(i+1)*a/2,b);}g.stroke();g.setLineDash([]);
const c=eo(prog(d,0.5,0.5));if(c>0){const L2=s*0.5;g.setLineDash([L2,L2]);g.lineDashOffset=L2*(1-c);g.beginPath();g.moveTo(-s*0.11,-s*0.03);g.lineTo(-s*0.02,s*0.06);g.lineTo(s*0.12,-s*0.1);g.stroke();g.setLineDash([]);}}
else{const L2=s*0.9;g.lineWidth=s*0.1;g.setLineDash([L2,L2]);g.lineDashOffset=L2*(1-eo(d));g.beginPath();g.moveTo(-s*0.2,0);g.lineTo(-s*0.05,s*0.15);g.lineTo(s*0.22,-s*0.14);g.stroke();g.setLineDash([]);}
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
// в первом кадре все сцены один раз рисуются в крошечный холст: фоны, слова заголовков, тени попадают в кэш заранее, дальше кадры ровные
// уходящая сцена на время перехода замораживается в кадр склейки (рисуется один раз, потом картинкой) - переход стоит как одна сцена
let FZ=null,FZK='';function oldSc(g,CUTS,i,dur){const tc=CUTS[i+1][0],k=i+'|'+tc+'|'+CUTS.length;if(!FZ)FZ=cv(1080,1920);const [c,x]=FZ;
if(FZK!==k){x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.clearRect(0,0,1080,1920);drawSc(x,CUTS,i,tc-0.001,dur);FZK=k;}if(g)g.drawImage(c,0,0);}
function drawSc(g,CUTS,i,t,dur){const t0=CUTS[i][0],t1=i+1<CUTS.length?CUTS[i+1][0]:dur;g.save();CUTS[i][1](g,t-t0,t,{i,dur:t1-t0,last:i===CUTS.length-1});g.restore();}
// play: рисует текущую сцену с переходом:
// circle - белый круг прилетает на ключевое слово (x,y) за 0,6 с до склейки и раскрывается в новую сцену;
// panel - новая сцена выезжает снизу панелью с круглыми верхними углами; fade - растворение;
// tab - быстрое растворение карточки при смене вкладки.
let WK='',WC_=null;function prewarm(t,S,CUTS,dur){const nx=CUTS[S.i+1];if(!nx)return;const left=nx[0]-t,k=S.i+'|'+nx[0]+'|'+CUTS.length;
if(left>0&&left<0.8&&FZK!==k){oldSc(null,CUTS,S.i,dur);return;}
if(left>0&&left<0.5&&WK!==k){WK=k;if(!WC_)WC_=cv(4,4);const x=WC_[1];x.setTransform(1,0,0,1,0,0);drawSc(x,CUTS,S.i+1,nx[0]+1.0,dur);}}
let WALL=null;function play(g,t,CUTS,dur){if(WALL!==CUTS){WALL=CUTS;if(!WC_)WC_=cv(4,4);const x=WC_[1];CUTS.forEach((c,i)=>{x.setTransform(1,0,0,1,0,0);drawSc(x,CUTS,i,c[0]+1.0,dur);});}
prewarm(t,scene(t,CUTS,dur),CUTS,dur);const S=scene(t,CUTS,dur),tr=S.tr,d=tr.d||(tr.type==='circle'?0.5:tr.type==='tab'?0.32:0.45),p=S.lt/d;
if(S.i>0&&p<1&&tr.type&&tr.type!=='cut'){const q=eio(p);
if(tr.type==='circle'){oldSc(g,CUTS,S.i-1,dur);g.save();g.beginPath();g.arc(tr.x,tr.y,lerp(tr.r||64,2300,eo5(p)),0,7);g.clip();drawSc(g,CUTS,S.i,t,dur);g.restore();}
else if(tr.type==='panel'){const Y0=lerp(1960,-120,eo(p));g.save();g.beginPath();g.rect(0,0,1080,Math.max(0,Y0+100));g.clip();const sc=1-0.04*q;g.translate(540,700);g.scale(sc,sc);g.translate(-540,-700);oldSc(g,CUTS,S.i-1,dur);g.restore();
g.fillStyle=rgba(C.night,0.35*q);g.fillRect(0,0,1080,1920);const Y=lerp(1960,-120,eo(p));g.save();rr(g,-4,Y,1088,2200,90);g.clip();g.translate(0,(1-eo(p))*140);drawSc(g,CUTS,S.i,t,dur);g.restore();}
else{oldSc(g,CUTS,S.i-1,dur);
g.save();g.globalAlpha=tr.type==='tab'?q:eo(p);drawSc(g,CUTS,S.i,t,dur);g.restore();}}
else drawSc(g,CUTS,S.i,t,dur);
const nx=CUTS[S.i+1];if(nx&&nx[2]&&nx[2].type==='circle'){const tc=nx[0],fd=nx[2].fly||0.6,q=(t-(tc-fd))/fd;
if(q>0&&q<=1){const r=nx[2].r||64,u=back(clamp(q/0.75),1.2),x=lerp(1180,nx[2].x,u),y=lerp(nx[2].y+260,nx[2].y,u);g.save();
g.fillStyle='rgba(20,8,60,0.25)';g.beginPath();g.arc(x+8,y+18,r*1.02,0,7);g.fill();const gr=g.createRadialGradient(x-r*0.3,y-r*0.3,r*0.1,x,y,r);
gr.addColorStop(0,'#FFFFFF');gr.addColorStop(1,'#E6E1F7');g.fillStyle=gr;g.beginPath();g.arc(x,y,r*(0.6+0.4*eo(q*2)),0,7);g.fill();g.restore();}}
return S;}

// ---------- типовые объекты: плоская продуктовая иллюстрация (скруглённые формы, плоская заливка, светлый блик, мягкая лавандовая тень).
// x - центр, y - земля под объектом (у лодки ватерлиния). Цвет каждой части - параметр (hex #RRGGBB).
function mix(a,b,u){const h=s=>{s=String(s);if(s.length===4)s='#'+s[1]+s[1]+s[2]+s[2]+s[3]+s[3];return parseInt(s.slice(1,7),16)||0;};const p=h(a),q=h(b);
const ch=k=>Math.round(lerp(p>>k&255,q>>k&255,clamp(u)));return '#'+((1<<24)|(ch(16)<<16)|(ch(8)<<8)|ch(0)).toString(16).slice(1);}
const dark=(c,u=0.25)=>mix(c,'#1A0F3D',u),light=(c,u=0.3)=>mix(c,'#FFFFFF',u);
function gsh(g,x,y,w,a=0.13){g.fillStyle=rgba('#3B1C93',a);g.beginPath();g.ellipse(x,y,w/2,Math.max(2,w*0.08),0,0,7);g.fill();}
function seg(g,pts,w,col){g.strokeStyle=col;g.lineWidth=w;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(pts[0][0],pts[0][1]);
for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.stroke();}
function disc(g,x,y,r,col){g.fillStyle=col;g.beginPath();g.arc(x,y,Math.max(0.5,r),0,7);g.fill();}
function ell(g,x,y,rx,ry,col,rot=0){g.fillStyle=col;g.beginPath();g.ellipse(x,y,Math.max(0.5,rx),Math.max(0.5,ry),rot,0,7);g.fill();}
function poly(g,pts,col){g.fillStyle=col;g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.closePath();g.fill();}
function ik(ax,ay,bx,by,l1,l2,bend){let dx=bx-ax,dy=by-ay,d=Math.hypot(dx,dy)||1;const L=(l1+l2)*0.999;if(d>L){bx=ax+dx*L/d;by=ay+dy*L/d;d=L;}
const a=Math.atan2(by-ay,bx-ax),c=Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1)),an=a+bend*c;return [ax+Math.cos(an)*l1,ay+Math.sin(an)*l1,bx,by];}
const SKIN=['#F6D3BA','#E9B590','#C98D66','#8D5A3B','#F2C6A2'],HAIR=['#2B1B12','#6A4326','#B0602E','#E3B45E','#1C1530'],
SHIRTS=['#5B2EEB','#F2A324','#34C77B','#E0457B','#4C7BF4','#9A80F8','#E5484D','#1FA7A0'];

// person: человек. o: h 300 (рост взрослого), age 'adult'|'kid'|'old', pose 'stand'|'walk'|'run'|'wave'|'hold'|'point'|'shout'|'sit'|'read'|'dance'|'ride',
// t, ph (сдвиг фазы), dir 1|-1, skin, hair, hs 'short'|'long'|'bun'|'bald', shirt, pants, shoe, dress (цвет платья), apron, scarf (платок), helmet, cap,
// bag (рюкзак), glasses, book (цвет книги в руках), seat (цвет сиденья под sit/read), sleep (глаза закрыты), hands [[x,y],[x,y]], lean. Возвращает {hand,hand2,head,top}.
function person(g,x,y,o={}){const age=o.age||'adult',kid=age==='kid',old=age==='old',H=(o.h||300)*(kid?0.64:old?0.95:1),t=o.t||0,dir=o.dir||1,pose=o.pose||'stand';
const hr=H*(kid?0.1:0.082),leg=H*(kid?0.39:0.44),tor=H*(kid?0.27:0.3),arm=H*(kid?0.31:0.34),tw=H*(kid?0.19:0.2),lw=H*0.07,aw=H*0.058;
const skin=o.skin||SKIN[0],hair=o.hair||(old?'#D6D2E4':HAIR[0]),shirt=o.shirt||C.violet,pants=o.pants||'#2A2250',shoe=o.shoe||'#1A1238';
const sp=pose==='run'?10:6,ph=t*sp+(o.ph||0),sit=pose==='sit'||pose==='read',ride=pose==='ride';
let bob=pose==='walk'?Math.abs(Math.sin(ph))*H*0.012:pose==='run'?Math.abs(Math.sin(ph))*H*0.035:pose==='dance'?Math.abs(Math.sin(t*6+(o.ph||0)))*H*0.03:0;
let hipY=(sit?y-leg*0.52:ride&&o.hip?o.hip[1]:y-leg)-bob;const hx=ride&&o.hip?o.hip[0]:x;
const lean=o.lean!=null?o.lean:pose==='run'?0.16:pose==='walk'?0.04:ride?0.28:old?0.08:pose==='shout'?0.06:0;
g.save();if(dir<0){g.translate(x,0);g.scale(-1,1);g.translate(-x,0);}
if(!sit&&!ride&&o.shadow!==false)gsh(g,x,y,H*0.34);if(sit&&o.seat){gsh(g,x+leg*0.2,y,leg*0.9);g.fillStyle=o.seat;rr(g,x-tw*0.5,hipY+lw*0.4,tw+leg*0.35,y-hipY-lw*0.4,lw*0.4);g.fill();}
// ноги (дальняя темнее)
const feet=[];for(let i=0;i<2;i++){let fx,fy;
 if(sit){fx=hx+leg*0.52+i*lw*0.5;fy=y;}else if(ride){const P=o.pedal||[[hx+leg*0.3,y],[hx-leg*0.05,y]];fx=P[i][0];fy=P[i][1];}
 else{const s=i?1:-1;let sw=0;if(pose==='walk')sw=Math.sin(ph+i*Math.PI)*0.36;else if(pose==='run')sw=Math.sin(ph+i*Math.PI)*0.7;else if(pose==='dance')sw=Math.sin(t*6+(o.ph||0)+i*Math.PI)*0.22;
  fx=hx+s*tw*0.14+Math.sin(sw)*leg;fy=Math.min(y,hipY+Math.cos(sw)*leg*1.02);if(pose==='walk'||pose==='run')fy-=Math.max(0,Math.cos(ph+i*Math.PI))*H*(pose==='run'?0.06:0.025);}
 feet.push([fx,fy]);}
const legC=[dark(pants,0.18),pants];for(let i=0;i<2;i++){const hpx=hx+(i?1:-1)*tw*0.18,[fx,fy]=feet[i];let kx,ky;
 if(sit){kx=hx+leg*0.5+i*lw*0.5;ky=hipY;}else{const k=ik(hpx,hipY,fx,fy,leg*0.5,leg*0.5,-1);kx=k[0];ky=k[1];}
 if(!o.dress||sit||ride)seg(g,[[hpx,hipY],[kx,ky],[fx,fy-lw*0.3]],lw,legC[i]);else seg(g,[[kx,ky],[fx,fy-lw*0.3]],lw*0.8,skin);
 ell(g,fx+lw*0.35,fy-lw*0.28,lw*0.68,lw*0.36,shoe);}
// плечи, руки
const ax=hx+Math.sin(lean)*tor,ay=hipY-Math.cos(lean)*tor+aw*0.7;
const hand=(i)=>{const s=i?1:-1,bx=ax+s*tw*0.36;if(o.hands)return o.hands[i];
 if(pose==='walk'||pose==='run'){const a=-Math.sin(ph+i*Math.PI)*(pose==='run'?0.9:0.45);return [bx+Math.sin(a)*arm*0.95,ay+Math.cos(a)*arm*(pose==='run'?0.7:0.95)];}
 if(pose==='wave')return i?[bx+arm*0.3+Math.sin(t*9+(o.ph||0))*arm*0.16,ay-arm*0.85]:[bx-tw*0.1,ay+arm*0.95];
 if(pose==='hold'||sit)return [ax+arm*(sit?0.6:0.45)+s*tw*0.12,ay+arm*(sit?0.5:0.42)];
 if(pose==='point'||pose==='shout')return i?[bx+arm*0.95,ay-(pose==='shout'?arm*0.35:arm*0.05)]:[bx-tw*0.08,ay+arm*0.95];
 if(pose==='dance'){const w=Math.sin(t*6+(o.ph||0)+i*2)*arm*0.25;return [bx+s*arm*0.35+w,ay-arm*0.75];}
 if(ride)return [hx+leg*0.75,ay+arm*0.25];return [bx+s*tw*0.12,ay+arm*0.95];};
const arms=[0,1].map(i=>{const s=i?1:-1,bx=ax+s*tw*0.36,[px,py]=hand(i),k=ik(bx,ay,px,py,arm*0.5,arm*0.5,(pose==='hold'||sit||ride)?-1:1);return [[bx,ay],[k[0],k[1]],[px,py]];});
const drawArm=(a,c)=>{seg(g,a,aw,c);disc(g,a[2][0],a[2][1],aw*0.62,skin);};
if(o.bag){g.save();g.translate(hx,hipY);g.rotate(lean);g.fillStyle=o.bag;rr(g,-tw*0.5-tw*0.42,-tor*0.92,tw*0.55,tor*0.62,tw*0.16);g.fill();g.restore();}
drawArm(arms[0],dark(shirt,0.15));
// корпус
g.save();g.translate(hx,hipY);g.rotate(lean);
if(o.dress&&!sit&&!ride){g.fillStyle=o.dress;g.beginPath();g.moveTo(-tw*0.42,-tor*0.4);g.lineTo(tw*0.42,-tor*0.4);g.lineTo(tw*0.72,leg*0.55);g.lineTo(-tw*0.72,leg*0.55);g.closePath();g.fill();}
g.fillStyle=o.dress&&!sit&&!ride?o.dress:shirt;rr(g,-tw/2,-tor,tw,tor+lw*0.5,tw*0.36);g.fill();
g.fillStyle='rgba(255,255,255,0.13)';rr(g,-tw/2,-tor,tw,tor*0.45,tw*0.36);g.fill();
if(o.apron){g.fillStyle=o.apron;rr(g,-tw*0.32,-tor*0.62,tw*0.64,tor*0.62+lw*0.9,tw*0.12);g.fill();}
g.restore();
// голова
const hX=hx+Math.sin(lean)*(tor+hr*1.05),hY=hipY-Math.cos(lean)*(tor+hr*1.05)-H*0.012;
seg(g,[[ax,ay-aw*0.6],[hX,hY+hr*0.5]],hr*0.55,dark(skin,0.12));
if(o.scarf)disc(g,hX,hY,hr*1.22,o.scarf);
else if(o.hs==='long'||(!o.hs&&o.dress&&!old)){g.fillStyle=hair;rr(g,hX-hr*1.12,hY-hr*0.9,hr*1.5,hr*2.2,hr*0.7);g.fill();}
disc(g,hX,hY,hr,skin);
const hs=o.hs||(old?'bun':'short');
if(o.scarf){g.fillStyle=o.scarf;g.beginPath();g.arc(hX,hY-hr*0.2,hr*1.14,Math.PI,0);g.closePath();g.fill();poly(g,[[hX-hr*0.3,hY+hr*0.95],[hX-hr*0.75,hY+hr*1.55],[hX+hr*0.05,hY+hr*1.3]],o.scarf);}
else if(hs!=='bald'){g.fillStyle=hair;g.beginPath();g.arc(hX,hY-hr*0.06,hr*1.06,Math.PI*1.02,Math.PI*1.98);g.quadraticCurveTo(hX+hr*0.5,hY-hr*0.45,hX-hr*0.2,hY-hr*0.38);g.lineTo(hX-hr*1.04,hY+hr*0.15);g.closePath();g.fill();
 if(hs==='bun')disc(g,hX-hr*0.55,hY-hr*0.9,hr*0.45,hair);}
if(o.helmet){g.fillStyle=o.helmet;g.beginPath();g.arc(hX,hY-hr*0.12,hr*1.14,Math.PI,0);g.closePath();g.fill();rr(g,hX-hr*1.3,hY-hr*0.2,hr*2.6,hr*0.28,hr*0.14);g.fill();
 g.fillStyle='rgba(255,255,255,0.3)';rr(g,hX-hr*0.15,hY-hr*1.2,hr*0.3,hr*0.9,hr*0.15);g.fill();}
else if(o.cap){g.fillStyle=o.cap;g.beginPath();g.arc(hX,hY-hr*0.12,hr*1.06,Math.PI,0);g.closePath();g.fill();rr(g,hX,hY-hr*0.32,hr*1.5,hr*0.26,hr*0.13);g.fill();}
const ec='#1A1238';if(o.sleep){g.strokeStyle=ec;g.lineWidth=hr*0.1;g.lineCap='round';g.beginPath();g.moveTo(hX+hr*0.12,hY+hr*0.08);g.lineTo(hX+hr*0.36,hY+hr*0.08);g.moveTo(hX+hr*0.52,hY+hr*0.08);g.lineTo(hX+hr*0.76,hY+hr*0.08);g.stroke();}
else{disc(g,hX+hr*0.25,hY+hr*0.05,hr*0.1,ec);disc(g,hX+hr*0.65,hY+hr*0.05,hr*0.1,ec);}
if(o.glasses){g.strokeStyle=o.glasses===true?'#2A2250':o.glasses;g.lineWidth=hr*0.08;g.beginPath();g.arc(hX+hr*0.25,hY+hr*0.05,hr*0.22,0,7);g.moveTo(hX+hr*0.87,hY+hr*0.05);g.arc(hX+hr*0.65,hY+hr*0.05,hr*0.22,0,7);g.stroke();}
if(pose==='shout'||o.mouth==='open')ell(g,hX+hr*0.5,hY+hr*0.48,hr*0.16,hr*0.2,'#7A1F3A');
else{g.strokeStyle=dark(skin,0.45);g.lineWidth=hr*0.08;g.lineCap='round';g.beginPath();g.arc(hX+hr*0.48,hY+hr*0.32,hr*0.2,0.35,Math.PI-0.35);g.stroke();}
drawArm(arms[1],shirt);
if(o.book||pose==='read'){const [bx,by]=arms[1][2],bc=o.book||C.violet;g.save();g.translate(bx,by);g.rotate(-0.15);
 g.fillStyle=bc;rr(g,-hr*1.2,-hr*0.9,hr*2.4,hr*1.25,hr*0.12);g.fill();g.fillStyle='#FFFFFF';rr(g,-hr*1.05,-hr*0.82,hr*1.0,hr*1.05,hr*0.08);g.fill();rr(g,hr*0.05,-hr*0.82,hr*1.0,hr*1.05,hr*0.08);g.fill();g.restore();}
g.restore();const fl=p=>dir<0?[2*x-p[0],p[1]]:p;
return {hand:fl(arms[1][2]),hand2:fl(arms[0][2]),head:fl([hX,hY]),top:hY-hr*1.1,h:H};}
// crowd: n разных людей в ряд от x0 до x1 (разные кожа, волосы, одежда, фаза). o: h, pose, t, kids 0..1, old 0..1, shirts[], seed, dir, opts(i)
function crowd(g,x0,x1,y,n,o={}){const R=rng(o.seed||7),dx=n>1?(x1-x0)/(n-1):0,sh=o.shirts||SHIRTS,out=[];
for(let i=0;i<n;i++){const r1=R(),r2=R(),r3=R(),r4=R(),r5=R(),kid=o.kids&&r1<o.kids,old=!kid&&o.old&&r2<o.old;
const p=Object.assign({h:(o.h||260)*(0.92+r3*0.14),age:kid?'kid':old?'old':'adult',pose:o.pose||'stand',t:o.t,ph:i*1.9,dir:o.dir||(i%2?-1:1),
skin:SKIN[Math.floor(r4*SKIN.length)],hair:HAIR[Math.floor(r5*HAIR.length)],hs:['short','long','bun','short'][i%4],shirt:sh[i%sh.length],
pants:['#2A2250','#3B4A7A','#5A4A3A','#1E1838'][i%4],dress:i%4===1?sh[(i+3)%sh.length]:null},o.opts?o.opts(i):{});
out.push(person(g,x0+dx*i,y+(i%2)*6,p));}return out;}

// ---------- здания (o.night: стены в тени, погасшие окна тёмные)
const nw=(c,n)=>n?mix(c,'#2A1F66',0.6*(n===true?1:clamp(n))):c;
function winR(g,x,y,w,h,lit,o={}){const l=typeof lit==='number'?clamp(lit):lit?1:0;g.fillStyle=l>0?mix(o.off||'#CFC6F5',o.lit||'#FFC94D',l):(o.off||'#CFC6F5');
rr(g,x,y,w,h,Math.min(w,h)*0.16);g.fill();if(l>0&&o.glow!==false)glow(g,x+w/2,y+h/2,Math.max(w,h)*1.05,'#FFB938',0.32*l);}
// house: дом с треугольной крышей. o: wall, roof, door, win, lit 0..1, night (тёмные окна)
function house(g,x,y,w,h,o={}){const wall=nw(o.wall||'#FFFFFF',o.night),roof=o.roof||C.violet,x0=x-w/2,bh=h*0.58,off=o.night?'#2C2366':o.win||'#CFC6F5';gsh(g,x,y,w*1.2);
g.fillStyle=roof;g.strokeStyle=roof;g.lineWidth=w*0.05;g.lineJoin='round';g.beginPath();g.moveTo(x0-w*0.07,y-bh+w*0.02);g.lineTo(x,y-h);g.lineTo(x0+w*1.07,y-bh+w*0.02);g.closePath();g.fill();g.stroke();
g.fillStyle=wall;rr(g,x0,y-bh,w,bh,w*0.04);g.fill();g.fillStyle='rgba(59,28,147,0.07)';g.fillRect(x0+w*0.7,y-bh,w*0.3,bh);
g.fillStyle=o.door||dark(roof,0.3);rr(g,x0+w*0.6,y-bh*0.62,w*0.22,bh*0.62,w*0.05);g.fill();
winR(g,x0+w*0.14,y-bh*0.75,w*0.3,bh*0.36,o.lit||0,{off,glow:o.glow});}
// tower: многоэтажка cols×rows окон. o: wall, roof, win, lit 0..1 (доля горящих, гаснут по одному в случайном порядке), grow 0..1 (стройка по этажам), night, cw, ch, seed
function tower(g,x,y,cols,rows,o={}){const cw=o.cw||46,ch=o.ch||56,gx=cw*0.45,gy=ch*0.42,w=cols*cw+(cols+1)*gx,fh=ch+gy,h=rows*fh+gy+ch*0.35;
const wall=nw(o.wall||'#FFFFFF',o.night),x0=x-w/2,gr=o.grow==null?1:clamp(o.grow),fl=gr*rows,nf=Math.ceil(fl-1e-6),off=o.night?'#2C2366':o.win||'#CFC6F5';
if(nf<=0)return {x0,top:y,w,h:0};const hh=nf*fh+gy+(nf>=rows?ch*0.35:0),top=y-hh;gsh(g,x,y,w*1.15);
g.fillStyle=wall;rr(g,x0,top,w,hh,10);g.fill();g.fillStyle='rgba(59,28,147,0.07)';g.fillRect(x0+w*0.78,top,w*0.22,hh);
if(nf>=rows){g.fillStyle=o.roof||C.violet;rr(g,x0-6,top-12,w+12,20,8);g.fill();}
const N=cols*rows,R=rng(o.seed||11),ord=[...Array(N).keys()].map(i=>[R(),i]).sort((a,b)=>a[0]-b[0]).map(a=>a[1]),rank=new Array(N);ord.forEach((v,k)=>rank[v]=k);
const L=(o.lit||0)*N;for(let r=0;r<nf;r++){const fy=y-(r+1)*fh,fa=r===nf-1?clamp((fl-r)*1.5):1;if(fa<=0)continue;g.save();g.globalAlpha*=fa;
for(let c=0;c<cols;c++){const i=r*cols+c;winR(g,x0+gx+c*(cw+gx),fy,cw,ch,clamp(L-rank[i]),{off,glow:o.glow});}g.restore();}
return {x0,top,w,h:hh};}
// shop: магазин или кафе. o: kind 'shop'|'cafe', sign (текст вывески), awning, awning2 (полосы навеса), wall, lit
function shop(g,x,y,w,h,o={}){const x0=x-w/2,wall=nw(o.wall||'#FFFFFF',o.night),a1=o.awning||C.violet,a2=o.awning2||'#FFFFFF',sh=h*0.2,ah=h*0.16;gsh(g,x,y,w*1.15);
g.fillStyle=wall;rr(g,x0,y-h,w,h,w*0.03);g.fill();g.fillStyle='rgba(59,28,147,0.07)';g.fillRect(x0+w*0.8,y-h,w*0.2,h);
g.fillStyle=o.signBg||dark(a1,0.35);rr(g,x0+w*0.08,y-h+h*0.04,w*0.84,sh,sh*0.25);g.fill();if(o.sign)Tr(g,o.sign,x,y-h+h*0.04+sh/2,sh*0.55,'#FFFFFF',800,'center',F,w*0.76);
const ay=y-h+sh+h*0.08,n=Math.max(4,Math.round(w/50));for(let i=0;i<n;i++){g.fillStyle=i%2?a2:a1;const sx=x0-w*0.03+i*(w*1.06/n),sw=w*1.06/n;g.fillRect(sx,ay,sw+0.5,ah);g.beginPath();g.arc(sx+sw/2,ay+ah,sw/2,0,Math.PI);g.fill();}
const wy=ay+ah+h*0.08;winR(g,x0+w*0.08,wy,w*0.5,y-wy-h*0.08,o.lit||0,{off:o.win||'#D9E6FF',glow:o.glow});
g.fillStyle=o.door||dark(a1,0.3);rr(g,x0+w*0.66,wy,w*0.24,y-wy,w*0.03);g.fill();disc(g,x0+w*0.7,wy+(y-wy)*0.55,w*0.012,'#FFFFFF');
if(o.kind==='cafe'){const tx=x0+w*0.33,ty=y;g.fillStyle=dark(a1,0.3);rr(g,tx-w*0.12,ty-h*0.2,w*0.24,h*0.03,4);g.fill();g.fillRect(tx-2,ty-h*0.2,4,h*0.2);
 g.fillStyle='#FFFFFF';rr(g,tx-w*0.04,ty-h*0.27,w*0.06,h*0.07,3);g.fill();}}
// school: школа, библиотека, ратуша (центр с фронтоном). o: sign (текст), wall, roof, flag (цвет флага), clock:false, hm:[часы,минуты], lit, night
function school(g,x,y,w,h,o={}){const x0=x-w/2,wall=nw(o.wall||'#FFFFFF',o.night),roof=o.roof||C.violet,off=o.night?'#2C2366':o.win||'#CFC6F5',bh=h*0.72,cw=w*0.34;gsh(g,x,y,w*1.1);
g.fillStyle=wall;rr(g,x0,y-bh,w,bh,8);g.fill();g.fillStyle=roof;rr(g,x0-6,y-bh-10,w+12,16,6);g.fill();
g.fillStyle=wall;rr(g,x-cw/2,y-h*0.92,cw,h*0.92,6);g.fill();g.fillStyle='rgba(59,28,147,0.07)';g.fillRect(x+cw*0.25,y-h*0.92,cw*0.25,h*0.92);
poly(g,[[x-cw/2-10,y-h*0.92+2],[x,y-h],[x+cw/2+10,y-h*0.92+2]],roof);
if(o.clock!==false){disc(g,x,y-h*0.78,cw*0.13,'#FFFFFF');g.strokeStyle=roof;g.lineWidth=3;g.beginPath();g.arc(x,y-h*0.78,cw*0.13,0,7);const hm=o.hm||[3,0],ah=(hm[0]%12+hm[1]/60)/12*Math.PI*2,am=hm[1]/60*Math.PI*2;g.moveTo(x,y-h*0.78);g.lineTo(x+Math.sin(ah)*cw*0.07,y-h*0.78-Math.cos(ah)*cw*0.07);g.moveTo(x,y-h*0.78);g.lineTo(x+Math.sin(am)*cw*0.1,y-h*0.78-Math.cos(am)*cw*0.1);g.stroke();}
if(o.sign){g.fillStyle=roof;rr(g,x-cw*0.62,y-h*0.6,cw*1.24,h*0.11,h*0.03);g.fill();Tr(g,o.sign,x,y-h*0.6+h*0.055,h*0.065,'#FFFFFF',800,'center',F,cw*1.14);}
g.fillStyle=o.door||dark(roof,0.3);rr(g,x-cw*0.24,y-h*0.3,cw*0.48,h*0.3,cw*0.06);g.fill();
const ww=(w-cw)/2,nc=Math.max(2,Math.round(ww/70));for(const s of [-1,1])for(let r=0;r<2;r++)for(let c=0;c<nc;c++){const wx=s<0?x0+18+c*((ww-24)/nc):x+cw/2+8+c*((ww-24)/nc);
winR(g,wx,y-bh+bh*0.14+r*bh*0.44,(ww-24)/nc-14,bh*0.3,o.lit||0,{off,glow:o.glow});}
if(o.flag){const fx=x+cw*0.36,fy=y-h*1.12;g.fillStyle='#8C86A8';g.fillRect(fx,fy,4,h*0.12);const wv=Math.sin((o.t||0)*4)*4;
g.fillStyle=o.flag;g.beginPath();g.moveTo(fx+4,fy);g.quadraticCurveTo(fx+24,fy-4+wv,fx+44,fy+wv);g.lineTo(fx+44,fy+22+wv);g.quadraticCurveTo(fx+24,fy+18+wv,fx+4,fy+22);g.closePath();g.fill();}}

// ---------- растения
// tree: дерево высотой s. o: kind 'leaf'|'oak'|'pine', col (крона), trunk, t (покачивание)
function tree(g,x,y,s,o={}){const k=o.kind||'leaf',col=o.col||(k==='pine'?'#1F8A5B':'#34C77B'),tr=o.trunk||'#8A5A3C',sw=Math.sin((o.t||0)*1.3+x*0.013)*0.02;
gsh(g,x,y,s*(k==='oak'?0.7:0.45));g.save();g.translate(x,y);g.rotate(sw);
if(k==='pine'){g.fillStyle=tr;rr(g,-s*0.04,-s*0.2,s*0.08,s*0.2,3);g.fill();for(let i=0;i<3;i++){const b=-s*0.14-i*s*0.24,w=s*(0.36-i*0.08);
 g.fillStyle=i%2?light(col,0.08):col;g.strokeStyle=g.fillStyle;g.lineWidth=s*0.03;g.lineJoin='round';g.beginPath();g.moveTo(-w,b);g.lineTo(0,b-s*0.34);g.lineTo(w,b);g.closePath();g.fill();g.stroke();}}
else{const oak=k==='oak',th=s*(oak?0.4:0.45),tw=s*(oak?0.11:0.07);g.fillStyle=tr;rr(g,-tw/2,-th-s*0.05,tw,th+s*0.05,tw*0.3);g.fill();
 if(oak){seg(g,[[0,-th*0.8],[-s*0.16,-th*1.15]],tw*0.45,tr);seg(g,[[0,-th*0.85],[s*0.15,-th*1.2]],tw*0.45,tr);}
 const C2=oak?[[0,-0.7,0.25],[-0.24,-0.6,0.2],[0.25,-0.6,0.21],[-0.12,-0.85,0.2],[0.14,-0.84,0.2]]:[[0,-0.68,0.27],[-0.17,-0.55,0.2],[0.18,-0.56,0.21]];
 C2.forEach(c=>disc(g,c[0]*s,c[1]*s,c[2]*s,col));g.globalAlpha*=0.5;disc(g,-s*0.07,-s*(oak?0.82:0.76),s*0.11,light(col,0.25));}
g.restore();}
// grass: полоса травы от x0 до x1 по земле y. o: col, h (высота травинок), t
function grass(g,x0,x1,y,o={}){const h=o.h||22,col=o.col||'#34C77B',R=rng(o.seed||5),t=o.t||0;g.fillStyle=col;g.beginPath();
for(let x=x0;x<x1;x+=h*0.55){const hh=h*(0.6+R()*0.6),sw=Math.sin(t*2+x*0.05)*h*0.12;g.moveTo(x-h*0.18,y);g.lineTo(x+sw,y-hh);g.lineTo(x+h*0.18,y);}g.fill();
g.fillStyle=dark(col,0.12);g.fillRect(x0,y-1,x1-x0,4);}
// leaf: кленовый лист; leaves: листья падают в прямоугольнике (x0..x1, y0..y1). o: n, cols[], seed
function leaf(g,x,y,s,o={}){g.save();g.translate(x,y);g.rotate(o.rot||0);g.fillStyle=o.col||'#F2A324';g.beginPath();
for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?s*0.42:s*(i===0?1:i===2||i===8?0.85:0.7);g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath();g.fill();
g.strokeStyle=dark(o.col||'#F2A324',0.25);g.lineWidth=Math.max(1,s*0.08);g.beginPath();g.moveTo(0,0);g.lineTo(0,s*0.9);g.stroke();g.restore();}
function leaves(g,t,x0,x1,y0,y1,o={}){const R=rng(o.seed||9),n=o.n||14,cols=o.cols||['#F2A324','#E5484D','#E07A2E','#E3B45E'];
for(let i=0;i<n;i++){const ox=R(),sp=0.12+R()*0.1,ph=R(),u=(t*sp+ph)%1,s=(o.s||16)*(0.8+R()*0.5);
leaf(g,lerp(x0,x1,ox)+Math.sin(t*1.5+i)*30,lerp(y0,y1,u),s,{col:cols[i%cols.length],rot:t*1.2+i});}}

// ---------- транспорт (dir 1 вправо / -1 влево, t крутит колёса, v скорость вращения)
function wheel(g,x,y,r,a){disc(g,x,y,r,'#1E1838');disc(g,x,y,r*0.48,'#D9D5E8');g.strokeStyle='#8C86A8';g.lineWidth=r*0.12;g.beginPath();
g.moveTo(x+Math.cos(a)*r*0.42,y+Math.sin(a)*r*0.42);g.lineTo(x-Math.cos(a)*r*0.42,y-Math.sin(a)*r*0.42);g.stroke();}
function flipX(g,x,dir){if(dir<0){g.translate(x,0);g.scale(-1,1);g.translate(-x,0);}}
// car: легковушка длиной s. o: col, win
function car(g,x,y,s=240,o={}){const col=o.col||'#E5484D',r=s*0.09,x0=x-s/2,a=(o.t||0)*(o.v==null?8:o.v);g.save();flipX(g,x,o.dir||1);gsh(g,x,y,s*1.05);
g.fillStyle=col;g.beginPath();g.moveTo(x0+s*0.2,y-s*0.3);g.lineTo(x0+s*0.32,y-s*0.47);g.lineTo(x0+s*0.66,y-s*0.47);g.lineTo(x0+s*0.8,y-s*0.3);g.closePath();g.fill();
g.lineJoin='round';g.strokeStyle=col;g.lineWidth=s*0.06;g.stroke();rr(g,x0,y-s*0.33,s,s*0.2,s*0.07);g.fill();
g.fillStyle=o.win||'#DCE6FF';poly(g,[[x0+s*0.27,y-s*0.32],[x0+s*0.35,y-s*0.43],[x0+s*0.48,y-s*0.43],[x0+s*0.48,y-s*0.32]],o.win||'#DCE6FF');
poly(g,[[x0+s*0.52,y-s*0.32],[x0+s*0.52,y-s*0.43],[x0+s*0.64,y-s*0.43],[x0+s*0.73,y-s*0.32]],o.win||'#DCE6FF');
g.fillStyle='rgba(255,255,255,0.18)';rr(g,x0,y-s*0.33,s,s*0.07,s*0.04);g.fill();disc(g,x0+s*0.96,y-s*0.25,s*0.025,'#FFE9A8');
wheel(g,x0+s*0.22,y-r,r,a);wheel(g,x0+s*0.78,y-r,r,a);g.restore();}
// bus: автобус длиной s. o: col, num (текст номера), people (головы в окнах), win
function bus(g,x,y,s=440,o={}){const col=o.col||'#2F5BD8',h=s*0.36,x0=x-s/2,r=s*0.06,a=(o.t||0)*(o.v==null?6:o.v);g.save();flipX(g,x,o.dir||1);gsh(g,x,y,s*1.02);
g.fillStyle=col;rr(g,x0,y-h-r*0.6,s,h,s*0.05);g.fill();g.fillStyle='rgba(255,255,255,0.16)';rr(g,x0,y-h-r*0.6,s,h*0.12,s*0.05);g.fill();
const wy=y-h-r*0.6+h*0.16,wh=h*0.36,n=4,ww=(s*0.68)/n;for(let i=0;i<n;i++){const wx=x0+s*0.04+i*ww;g.fillStyle=o.win||'#DCE6FF';rr(g,wx,wy,ww-10,wh,8);g.fill();
 if(o.people){const R=rng(i+3);disc(g,wx+ww*0.45,wy+wh*0.62,wh*0.22,SKIN[i%SKIN.length]);g.fillStyle=HAIR[Math.floor(R()*5)];g.beginPath();g.arc(wx+ww*0.45,wy+wh*0.58,wh*0.23,Math.PI,0);g.fill();}}
g.fillStyle=o.win||'#DCE6FF';rr(g,x0+s*0.78,wy,s*0.2,h*0.62,10);g.fill();g.fillStyle=dark(col,0.3);rr(g,x0+s*0.73,wy+wh+8,s*0.06,y-r*0.6-(wy+wh+8)-4,4);g.fill();
g.fillStyle=light(col,0.25);g.fillRect(x0,wy+wh+h*0.14,s*0.72,h*0.06);
if(o.num){const bw=s*0.15,bh=h*0.17;g.fillStyle='#1A1238';rr(g,x0+s*0.82,y-h-r*0.6-bh*0.2,bw,bh,6);g.fill();g.save();if((o.dir||1)<0){g.translate(x0+s*0.82+bw/2,0);g.scale(-1,1);g.translate(-(x0+s*0.82+bw/2),0);}
 Tr(g,o.num,x0+s*0.82+bw/2,y-h-r*0.6-bh*0.2+bh/2,bh*0.72,'#FFC94D',800,'center',MONO,bw*0.9);g.restore();}
disc(g,x0+s*0.985,y-r*1.6,s*0.016,'#FFE9A8');wheel(g,x0+s*0.18,y-r,r,a);wheel(g,x0+s*0.8,y-r,r,a);g.restore();}
// bike: велосипед с седоком длиной s. o: col (рама), rider (параметры person) или false
function bike(g,x,y,s=200,o={}){const col=o.col||C.violet,r=s*0.25,a=(o.t||0)*(o.v==null?8:o.v),bx=x-s*0.33,fx=x+s*0.33,wy=y-r,cx=x-s*0.02,cy=wy+r*0.05;
g.save();flipX(g,x,o.dir||1);gsh(g,x,y,s*1.1);for(const wx of [bx,fx]){g.strokeStyle='#1E1838';g.lineWidth=s*0.035;g.beginPath();g.arc(wx,wy,r,0,7);g.stroke();
 g.strokeStyle='#B9B0DA';g.lineWidth=1.5;g.beginPath();for(let k=0;k<3;k++){const q=a+k*Math.PI/3;g.moveTo(wx+Math.cos(q)*r,wy+Math.sin(q)*r);g.lineTo(wx-Math.cos(q)*r,wy-Math.sin(q)*r);}g.stroke();}
const sx=x-s*0.1,sy=wy-s*0.36,hx=fx-s*0.06,hy=wy-s*0.42;seg(g,[[bx,wy],[sx,sy+s*0.04],[cx,cy],[bx,wy]],s*0.04,col);seg(g,[[sx+s*0.02,sy+s*0.08],[hx,hy+s*0.06],[cx,cy]],s*0.04,col);seg(g,[[hx,hy],[fx,wy]],s*0.04,col);
seg(g,[[hx-s*0.05,hy-s*0.02],[hx+s*0.03,hy]],s*0.035,'#1E1838');g.fillStyle='#1E1838';rr(g,sx-s*0.08,sy-s*0.02,s*0.14,s*0.04,s*0.02);g.fill();
const pa=a*0.6,P=[[cx+Math.cos(pa)*s*0.1,cy+Math.sin(pa)*s*0.1],[cx-Math.cos(pa)*s*0.1,cy-Math.sin(pa)*s*0.1]];
let res=null;if(o.rider!==false){res=person(g,x,y,Object.assign({h:s*1.25,shirt:'#F2A324'},o.rider||{},{pose:'ride',hip:[sx,sy-s*0.02],pedal:[P[1],P[0]],hands:[[hx-s*0.03,hy],[hx,hy]],shadow:false,dir:1,t:o.t}));}
g.restore();return res;}
// boat: лодка/катер длиной s, y - ватерлиния. o: col (корпус), stripe, cabin (цвет рубки или false), motor, run 0..1 (бурун и ход), t, dir. Возвращает {deck:[x,y],x0,x1}
function boat(g,x,y,s=300,o={}){const col=o.col||'#FFFFFF',t=o.t||0,b=Math.sin(t*2.2+x*0.01)*s*0.012,x0=x-s/2,x1=x+s/2,dy=y+b,hh=s*0.17;g.save();flipX(g,x,o.dir||1);
g.translate(x,dy);g.rotate(Math.sin(t*1.7+x*0.02)*0.025);g.translate(-x,-dy);
const run=o.run||0;if(run>0){g.fillStyle=rgba('#FFFFFF',0.75*run);for(let i=0;i<3;i++){const wx=x0-s*0.05-i*s*0.16-((t*60)%(s*0.16));g.beginPath();g.ellipse(wx,dy+2,s*0.07*(1-i*0.2),s*0.018,0,0,7);g.fill();}}
if(o.cabin!==false){const cc=o.cabin||'#DCE6FF';g.fillStyle=cc;rr(g,x-s*0.2,dy-hh-s*0.16,s*0.3,s*0.18,s*0.03);g.fill();g.fillStyle='#9FC8FF';rr(g,x-s*0.03,dy-hh-s*0.13,s*0.1,s*0.07,s*0.015);g.fill();
 g.fillStyle=dark(cc,0.2);rr(g,x-s*0.23,dy-hh-s*0.18,s*0.36,s*0.035,s*0.015);g.fill();}
if(o.motor){g.fillStyle='#2A2250';rr(g,x0-s*0.06,dy-hh-s*0.06,s*0.09,s*0.12,s*0.02);g.fill();g.fillRect(x0-s*0.03,dy-hh+s*0.04,s*0.025,hh+s*0.02);}
g.fillStyle=col;g.beginPath();g.moveTo(x0,dy-hh);g.lineTo(x1+s*0.04,dy-hh-s*0.04);g.quadraticCurveTo(x1-s*0.04,dy+s*0.02,x1-s*0.2,dy+s*0.05);g.lineTo(x0+s*0.05,dy+s*0.05);g.closePath();g.fill();
g.strokeStyle=rgba('#1A0F3D',0.12);g.lineWidth=2;g.stroke();g.fillStyle=o.stripe||C.violet;g.beginPath();g.moveTo(x0+s*0.01,dy-hh*0.45);g.lineTo(x1-s*0.02,dy-hh*0.6);g.lineTo(x1-s*0.06,dy-hh*0.3);g.lineTo(x0+s*0.02,dy-hh*0.18);g.closePath();g.fill();
g.restore();const d=(o.dir||1)<0?-1:1;return {deck:[x,dy-hh],x0:x-d*s/2,x1:x+d*s/2};}

// ---------- животные
// dog: собака длиной s. o: col, pose 'stand'|'run'|'sit'|'sleep', t, dir, collar (цвет ошейника), ear
function dog(g,x,y,s=170,o={}){const col=o.col||'#C98A4B',ear=o.ear||dark(col,0.3),belly=light(col,0.35),t=o.t||0,p=o.pose||'stand';g.save();flipX(g,x,o.dir||1);gsh(g,x,y,s*1.0);
const eye='#1A1238';if(p==='sleep'){const br=1+Math.sin(t*2.2)*0.03;g.strokeStyle=col;g.lineWidth=s*0.08;g.lineCap='round';g.beginPath();g.moveTo(x-s*0.38,y-s*0.1);g.quadraticCurveTo(x-s*0.55,y-s*0.02,x-s*0.35,y-s*0.02);g.stroke();
 ell(g,x-s*0.02,y-s*0.15*br,s*0.42,s*0.15*br,col);ell(g,x,y-s*0.06,s*0.3,s*0.06,belly);ell(g,x+s*0.38,y-s*0.04,s*0.12,s*0.04,col);
 disc(g,x+s*0.4,y-s*0.15,s*0.15,col);ell(g,x+s*0.55,y-s*0.1,s*0.09,s*0.06,belly);disc(g,x+s*0.63,y-s*0.12,s*0.025,eye);ell(g,x+s*0.33,y-s*0.16,s*0.06,s*0.11,ear,0.5);
 g.strokeStyle=eye;g.lineWidth=s*0.018;g.beginPath();g.arc(x+s*0.46,y-s*0.17,s*0.035,0.2,Math.PI-0.2);g.stroke();if(o.collar)seg(g,[[x+s*0.28,y-s*0.24],[x+s*0.3,y-s*0.08]],s*0.035,o.collar);g.restore();return;}
const run=p==='run',sit=p==='sit',ph=t*(run?14:0),lift=sit?0:0;const by=y-s*(sit?0.38:0.42),bx=x;
const legs=sit?[[bx+s*0.18,by+s*0.05],[bx+s*0.26,by+s*0.05]]:[[bx-s*0.26,0],[bx-s*0.18,1],[bx+s*0.2,0],[bx+s*0.28,1]];
if(!sit)legs.forEach(([lx,i],k)=>{const sw=run?Math.sin(ph+i*Math.PI+(k>1?1.2:0))*s*0.14:0;seg(g,[[lx,by],[lx+sw,y-s*0.03]],s*0.075,k%2?col:dark(col,0.12));});
else{ell(g,bx-s*0.12,y-s*0.08,s*0.2,s*0.08,dark(col,0.08));legs.forEach(([lx,ly],k)=>seg(g,[[lx,ly],[lx,y-s*0.03]],s*0.07,k?col:dark(col,0.12)));}
const wag=Math.sin(t*(run?14:7))*0.4;g.strokeStyle=col;g.lineWidth=s*0.06;g.lineCap='round';g.beginPath();g.moveTo(bx-s*0.32,by-s*0.04);
g.quadraticCurveTo(bx-s*0.48,by-s*0.12,bx-s*0.46+Math.sin(wag)*s*0.08,by-s*0.28);g.stroke();
if(sit){ell(g,bx-s*0.02,by-s*0.04,s*0.22,s*0.24,col,0.5);}else{ell(g,bx,by,s*0.36,s*0.16,col);ell(g,bx+s*0.02,by+s*0.06,s*0.24,s*0.07,belly);}
const hx=bx+s*(sit?0.18:0.36),hy=by-s*(sit?0.32:0.2)+(run?Math.sin(ph)*s*0.02:0);seg(g,[[bx+s*(sit?0.06:0.24),by-s*0.05],[hx-s*0.04,hy+s*0.06]],s*0.14,col);
if(o.collar)seg(g,[[hx-s*0.12,hy+s*0.02],[hx-s*0.06,hy+s*0.14]],s*0.04,o.collar);
disc(g,hx,hy,s*0.15,col);ell(g,hx+s*0.15,hy+s*0.05,s*0.1,s*0.065,belly);disc(g,hx+s*0.24,hy+s*0.02,s*0.03,eye);disc(g,hx+s*0.05,hy-s*0.04,s*0.025,eye);
ell(g,hx-s*0.08,hy+s*0.02,s*0.055,s*0.12,ear,0.35);if(o.tongue||run)ell(g,hx+s*0.16,hy+s*0.12,s*0.03,s*0.045,'#F05B9C');g.restore();}
// cat: кошка размером s. o: col, pose 'sit'|'walk'|'sleep', t, dir
function cat(g,x,y,s=120,o={}){const col=o.col||'#6B6488',t=o.t||0,p=o.pose||'sit',eye='#1A1238';g.save();flipX(g,x,o.dir||1);gsh(g,x,y,s*0.8);
if(p==='sleep'){ell(g,x,y-s*0.16,s*0.36,s*0.17*(1+Math.sin(t*2)*0.03),col);disc(g,x+s*0.26,y-s*0.16,s*0.15,col);poly(g,[[x+s*0.18,y-s*0.26],[x+s*0.2,y-s*0.4],[x+s*0.3,y-s*0.29]],col);
 g.strokeStyle=col;g.lineWidth=s*0.07;g.lineCap='round';g.beginPath();g.moveTo(x-s*0.3,y-s*0.06);g.quadraticCurveTo(x,y+s*0.02,x+s*0.2,y-s*0.04);g.stroke();
 g.strokeStyle=eye;g.lineWidth=s*0.02;g.beginPath();g.arc(x+s*0.31,y-s*0.16,s*0.035,0.2,Math.PI-0.2);g.stroke();g.restore();return;}
const tl=Math.sin(t*3)*0.2;g.strokeStyle=col;g.lineWidth=s*0.07;g.lineCap='round';g.beginPath();
if(p==='walk'){const ph=t*9;[[-0.2,0],[-0.12,1],[0.14,0],[0.22,1]].forEach(([lx,i])=>seg(g,[[x+lx*s,y-s*0.3],[x+lx*s+Math.sin(ph+i*Math.PI)*s*0.08,y-s*0.02]],s*0.06,col));
 g.strokeStyle=col;g.lineWidth=s*0.07;g.beginPath();g.moveTo(x-s*0.26,y-s*0.36);g.quadraticCurveTo(x-s*0.42,y-s*0.5,x-s*0.36+tl*s*0.2,y-s*0.7);g.stroke();
 ell(g,x,y-s*0.36,s*0.3,s*0.12,col);var hx=x+s*0.3,hy=y-s*0.52;}
else{g.moveTo(x-s*0.12,y-s*0.04);g.quadraticCurveTo(x-s*0.42,y,x-s*0.4+tl*s*0.15,y-s*0.3);g.stroke();ell(g,x,y-s*0.27,s*0.21,s*0.27,col);ell(g,x+s*0.04,y-s*0.2,s*0.1,s*0.16,light(col,0.25));var hx=x+s*0.04,hy=y-s*0.62;}
disc(g,hx,hy,s*0.17,col);poly(g,[[hx-s*0.16,hy-s*0.04],[hx-s*0.13,hy-s*0.26],[hx-s*0.02,hy-s*0.14]],col);poly(g,[[hx+s*0.16,hy-s*0.04],[hx+s*0.13,hy-s*0.26],[hx+s*0.02,hy-s*0.14]],col);
disc(g,hx-s*0.06,hy,s*0.028,'#FFD84D');disc(g,hx+s*0.07,hy,s*0.028,'#FFD84D');disc(g,hx-s*0.06,hy,s*0.013,eye);disc(g,hx+s*0.07,hy,s*0.013,eye);disc(g,hx+s*0.005,hy+s*0.06,s*0.018,'#F05B9C');g.restore();}
// bird: птица (чайка) размах s. o: col, tip (кончики крыльев), fly (машет), t, ph, dir
function bird(g,x,y,s=70,o={}){const col=o.col||'#FFFFFF',tip=o.tip||'#5A5470',t=o.t||0,fl=o.fly!==false,a=fl?Math.sin(t*9+(o.ph||0))*0.55:0;g.save();flipX(g,x,o.dir||1);
const wing=(sd)=>{g.fillStyle=col;g.strokeStyle=tip;g.lineWidth=Math.max(1.5,s*0.04);g.lineJoin='round';g.beginPath();g.moveTo(x,y);const ex=x+sd*s*0.5,ey=y-s*0.18-a*s*0.35;
 g.quadraticCurveTo(x+sd*s*0.2,y-s*0.28-a*s*0.2,ex,ey);g.quadraticCurveTo(x+sd*s*0.25,y-s*0.05-a*s*0.1,x,y+s*0.04);g.closePath();g.fill();g.stroke();disc(g,ex-sd*s*0.03,ey+s*0.02,s*0.04,tip);};
wing(-1);ell(g,x,y,s*0.2,s*0.08,col);g.strokeStyle=tip;g.lineWidth=Math.max(1,s*0.02);g.beginPath();g.ellipse(x,y,s*0.2,s*0.08,0,0,7);g.stroke();
disc(g,x+s*0.2,y-s*0.04,s*0.07,col);poly(g,[[x+s*0.26,y-s*0.05],[x+s*0.36,y-s*0.02],[x+s*0.26,y-s*0.01]],'#F5A524');disc(g,x+s*0.22,y-s*0.06,s*0.015,'#1A1238');wing(1);g.restore();}
// flock: стая n птиц кружит вокруг (cx,cy). o: r, s, col, seed
function flock(g,t,cx,cy,n,o={}){const R=rng(o.seed||3),r=o.r||220;for(let i=0;i<n;i++){const a=t*0.7*(i%2?1:-1)*(0.7+R()*0.5)+i*2.4,rr_=r*(0.6+R()*0.4);
const x=cx+Math.cos(a)*rr_,y=cy+Math.sin(a)*rr_*0.38;bird(g,x,y,(o.s||60)*(0.8+R()*0.4),{t,ph:i*1.3,col:o.col,dir:Math.sin(a)*(i%2?1:-1)>0?-1:1});}}

// ---------- небо и природа
const SKY={dawn:['#F7B6CE','#FFE3D6'],morning:['#BFD8FF','#EEF0FF'],day:['#8FC0FF','#E3EEFF'],evening:['#6B4FD8','#F6A2B4'],night:['#0B0628','#2A1A6B']};
// sky: градиент неба в прямоугольнике. o: tone 'dawn'|'morning'|'day'|'evening'|'night' или top/bot
const SKC=new Map();function sky(g,x,y,w,h,o={}){const c=o.top?[o.top,o.bot||o.top]:SKY[o.tone||'day']||SKY.day;w=Math.round(w);h=Math.round(h);const k=c[0]+c[1]+w+'x'+h;let s=SKC.get(k);
if(!s){const [cc,xx]=cv(w,h);const gr=xx.createLinearGradient(0,0,0,h);gr.addColorStop(0,c[0]);gr.addColorStop(1,c[1]);xx.fillStyle=gr;xx.fillRect(0,0,w,h);s=cc;if(SKC.size>12)SKC.delete(SKC.keys().next().value);SKC.set(k,s);}
const m=g.getTransform();if(m.a===1&&m.d===1&&!m.b&&!m.c){g.drawImage(s,Math.round(x)+0,Math.round(y));return;}
const gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,c[0]);gr.addColorStop(1,c[1]);g.fillStyle=gr;g.fillRect(x,y,w,h);}
// sun: солнце. o: col, glow (0..1), rays, t
function sun(g,x,y,r,o={}){const col=o.col||'#FFC94D';glow(g,x,y,r*2.8,col,o.glow==null?0.55:o.glow);
if(o.rays){g.strokeStyle=col;g.lineWidth=r*0.12;g.lineCap='round';g.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5+(o.t||0)*0.3;g.moveTo(x+Math.cos(a)*r*1.3,y+Math.sin(a)*r*1.3);g.lineTo(x+Math.cos(a)*r*1.6,y+Math.sin(a)*r*1.6);}g.stroke();}
disc(g,x,y,r,col);g.save();g.globalAlpha*=0.35;disc(g,x-r*0.3,y-r*0.3,r*0.35,'#FFFFFF');g.restore();}
// moon: месяц. o: col
function moon(g,x,y,r,o={}){const col=o.col||'#FFF1C2',k='moon'+Math.round(r)+col;let s=SPR[k];if(!s){const R=Math.round(r),[cc,xx]=cv(R*2+4,R*2+4);xx.fillStyle=col;xx.beginPath();xx.arc(R+2,R+2,R,0,7);xx.fill();
xx.globalCompositeOperation='destination-out';xx.beginPath();xx.arc(R+2+R*0.55,R+2-R*0.3,R*0.85,0,7);xx.fill();s=SPR[k]=cc;}glow(g,x,y,r*2.2,col,0.25);g.drawImage(s,x-r-2,y-r-2);}
// stars: звёзды в прямоугольнике, мерцают. o: n, seed, alpha, col
function stars(g,t,x,y,w,h,o={}){const R=rng(o.seed||21),n=o.n||40,a0=o.alpha==null?1:o.alpha;g.save();g.fillStyle=o.col||'#FFFFFF';
for(let i=0;i<n;i++){const sx=x+R()*w,sy=y+R()*h,big=R()<0.15,tw=0.55+0.45*Math.sin(t*2.5+i*1.7);g.globalAlpha=a0*tw;
if(big){const r=3+R()*2;g.beginPath();g.moveTo(sx,sy-r*2.4);g.quadraticCurveTo(sx,sy,sx+r*2.4,sy);g.quadraticCurveTo(sx,sy,sx,sy+r*2.4);g.quadraticCurveTo(sx,sy,sx-r*2.4,sy);g.quadraticCurveTo(sx,sy,sx,sy-r*2.4);g.fill();}
else{g.beginPath();g.arc(sx,sy,1.2+R()*1.6,0,7);g.fill();}}g.restore();}
// cloud: облако шириной s. o: col, alpha
function cloud(g,x,y,s=200,o={}){g.save();g.globalAlpha*=o.alpha==null?0.95:o.alpha;const c=o.col||'#FFFFFF';rr(g,x-s/2,y-s*0.16,s,s*0.22,s*0.11);g.fillStyle=c;g.fill();
disc(g,x-s*0.18,y-s*0.14,s*0.17,c);disc(g,x+s*0.08,y-s*0.2,s*0.22,c);g.restore();}
// sea: вода от линии y до y1 в пределах x0..x1, бегущие волны. o: col, col2 (гребни), amp
function sea(g,t,x0,y,x1,y1,o={}){const col=o.col||'#4C7BF4',c2=o.col2||light(col,0.35),A=o.amp||8;g.fillStyle=col;g.beginPath();g.moveTo(x0,y1);
for(let x=x0;x<=x1+20;x+=20)g.lineTo(x,y+Math.sin(x*0.03+t*2)*A*0.5);g.lineTo(x1,y1);g.closePath();g.fill();g.strokeStyle=c2;g.lineWidth=4;g.lineCap='round';
for(let k=0;k<3;k++){const yy=y+(y1-y)*(0.2+k*0.25);g.globalAlpha=0.6-k*0.15;g.beginPath();for(let x=x0+((k*70+t*30)%140)-140;x<x1;x+=140){g.moveTo(x,yy);g.quadraticCurveTo(x+20,yy-A*0.8,x+40,yy);}g.stroke();}g.globalAlpha=1;}
// hill: холм (полуэллипс) шириной w, высотой h. o: col
function hill(g,x,y,w,h,o={}){g.fillStyle=o.col||'#7FD3A0';g.beginPath();g.ellipse(x,y,w/2,h,0,Math.PI,0);g.closePath();g.fill();}

// ---------- улица
// lamp: фонарь высотой h. o: on 0..1, col (столб), light (цвет света)
function lamp(g,x,y,h=300,o={}){const on=clamp(o.on||0),pc=o.col||'#2A2250',lc=o.light||'#FFC94D';gsh(g,x,y,h*0.15);g.fillStyle=pc;rr(g,x-h*0.018,y-h,h*0.036,h,h*0.018);g.fill();
rr(g,x-h*0.05,y-h*0.06,h*0.1,h*0.06,h*0.02);g.fill();seg(g,[[x,y-h*0.98],[x+h*0.12,y-h*1.02]],h*0.025,pc);
if(on>0)glow(g,x+h*0.14,y-h*0.94,h*0.38,lc,0.7*on);g.fillStyle=pc;rr(g,x+h*0.07,y-h*1.04,h*0.14,h*0.05,h*0.02);g.fill();
ell(g,x+h*0.14,y-h*0.965,h*0.05,h*0.035,mix('#8C86A8',lc,on));}
// garland: гирлянда от (x0,y0) до (x1,y1). o: n, on 0..1 (зажигаются по очереди), sag, cols[]
function garland(g,x0,y0,x1,y1,o={}){const n=o.n||12,on=o.on==null?1:o.on,sag=o.sag||60,cols=o.cols||['#FFC94D','#F05B9C','#3DDC84','#6E8BFF'],P=u=>[lerp(x0,x1,u),lerp(y0,y1,u)+sag*4*u*(1-u)];
g.strokeStyle='#3B3555';g.lineWidth=2.5;g.beginPath();for(let i=0;i<=20;i++){const p=P(i/20);i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]);}g.stroke();
for(let i=0;i<n;i++){const p=P((i+0.5)/n),l=clamp(on*n-i),c=cols[i%cols.length];if(l>0)glow(g,p[0],p[1]+8,30,c,0.6*l);disc(g,p[0],p[1]+8,8,mix('#5A5470',c,l));}}
// board: доска/вывеска с текстом, (x,y) центр. lines: массив строк или 'строка\nстрока'. o: kind 'chalk'|'white'|'wood', size, legs (высота ножек), n (сколько строк показать, дробное)
function board(g,x,y,w,h,lines,o={}){const k=o.kind||'chalk',L=Array.isArray(lines)?lines:String(lines).split('\n'),bg=k==='chalk'?'#23303A':k==='wood'?'#B07A4A':'#FFFFFF',fg=k==='white'?C.ink:'#F6F3FF';
if(o.legs){seg(g,[[x-w*0.3,y],[x-w*0.36,y+h/2+o.legs]],8,'#7A5236');seg(g,[[x+w*0.3,y],[x+w*0.36,y+h/2+o.legs]],8,'#7A5236');}
if(k==='white')shadow(g,x-w/2,y-h/2,w,h,16,0);g.fillStyle=k==='chalk'?'#8A5A3C':bg;rr(g,x-w/2-8,y-h/2-8,w+16,h+16,18);g.fill();g.fillStyle=bg;rr(g,x-w/2,y-h/2,w,h,12);g.fill();
const sz=o.size||Math.min(h/(L.length*1.5),56),n=o.n==null?L.length:o.n;L.forEach((s,i)=>{const q=clamp(n-i);if(q<=0)return;g.save();g.globalAlpha*=q;
Tr(g,s,x,y-h/2+h*(i+0.5)/L.length,sz,fg,k==='white'?700:600,'center',k==='chalk'?MONO:FT,w*0.88);g.restore();});}
// view: картинка-иллюстрация внутри карточки интерфейса: тень, скругление, небо (o.sky: tone или {top,bot}), draw(g,{x,y,w,h}) рисует внутри клипа. o.title - моно-заголовок окна
function view(g,x,y,w,h,draw,o={}){let b={x,y,w,h};if(o.title){const r=win(g,x,y,w,h,o.title,{dark:o.dark});b={x,y:y+60,w,h:h-60};}else card(g,x,y,w,h,{dark:o.dark});
g.save();if(o.title){g.beginPath();g.moveTo(b.x,b.y);g.lineTo(b.x+b.w,b.y);g.arcTo(b.x+b.w,b.y+b.h,b.x,b.y+b.h,22);g.arcTo(b.x,b.y+b.h,b.x,b.y,22);g.closePath();}else rr(g,b.x,b.y,b.w,b.h,22);
g.clip();const s=o.sky;if(s)sky(g,b.x,b.y,b.w,b.h,typeof s==='string'?{tone:s}:s);draw(g,b);g.restore();return b;}

// ---------- звук
function sfx(s){return (t,n,v=0.12,p)=>{if(t>=0&&t<s.duration)s.play(t,n,clamp(v,0.05,0.3),p?{pitch:clamp(p,0.5,2)}:undefined);};}
// cutSounds: на склейки marimba_run/kalimba_run попеременно, на вкладках toggle_on, на финале magic
function cutSounds(s,CUTS,v=0.16){const P=sfx(s);CUTS.forEach((r,i)=>{if(!i)return;const ty=(r[2]||{}).type;
P(r[0],i===CUTS.length-1?'magic':ty==='tab'?'toggle_on':(i%2?'marimba_run':'kalimba_run'),ty==='tab'?v*0.8:v);});}

return {F,FT,SERIF,MONO,C,SEG,TAGC,clamp,lerp,prog,eo,eo5,eio,back,spring,rgba,rng,cv,fmt,rub,countInt,typeOn,norm,rr,fnt,cw,trW,trDraw,T,Tr,
label,body,head,glow,bgDark,bgLight,card,win,rise,pop,field,btn,chip,tag,steps,score,minibars,segbar,stat,glass,tabs,cursor,path,checkTile,icon,node,link,
cam,scene,play,sfx,cutSounds,
mix,dark,light,gsh,seg,disc,ell,poly,ik,SKIN,HAIR,SHIRTS,person,crowd,winR,house,tower,shop,school,tree,grass,leaf,leaves,wheel,car,bus,bike,boat,dog,cat,bird,flock,
SKY,sky,sun,moon,stars,cloud,sea,hill,lamp,garland,board,view};
})();
