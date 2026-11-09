// lib.js: ORIGA, стиль «Сказка на бумаге». Иллюстрированная детская книжка: акварельная бумага, слоистые полосы неба,
// холмы с карандашной штриховкой и тонким коричневым контуром, человечки-куколки, тёплые свечения, карандашные чертежи в небе,
// раскрытая книга на деревянном столе. Без склеек: наезд в рисунок, растворение, наклон камеры, отъезд в кляксу, перелистывание.
const ORIGA = (() => {
const W=1080,H=1920,X0=60,X1=1020;
const C={ink:'#5B4636',graphite:'#6A5F5A',page:'#E9E2D0',pageDk:'#D8CDB9',wood:'#664C37',woodDk:'#4F3A2B',
  sky:'#A9B8B8',rose:'#C99D90',salmon:'#DAA898',peach:'#E3B59C',butter:'#E6C190',cream:'#EEDBB0',
  day:'#9DB4BF',dayLow:'#E8DCC4',duskTop:'#5E5F80',dusk:'#A5849A',duskLow:'#D6A08E',nightTop:'#1E2232',night:'#2C3142',
  hillFar:'#BAC0A4',hillMid:'#AFBE9F',hillNear:'#A5B98F',grass:'#9DB68A',grassDk:'#7E9A6E',soil:'#AD8F75',
  skin:'#DDB291',skin2:'#B07E60',skin3:'#7E5444',hair:'#6B5243',hairDk:'#3F2F27',hairRed:'#A8583C',grey:'#B9B2A8',cheek:'#E59C8E',
  sage:'#8FA67C',green:'#87A06F',beige:'#CDAE8A',lilac:'#A893BC',pink:'#E2AFAA',blue:'#97AFC6',mustard:'#D7B262',
  terra:'#B65C42',stamp:'#C4664B',ochre:'#D6B35E',wheat:'#E2C17A',wheatDk:'#B39046',clay:'#C2906F',clayDk:'#94634C',
  thatch:'#D3B47E',wall:'#E4D2B6',door:'#6E5040',stone:'#B1A99C',water:'#6A929A',woodProp:'#9C7552',
  fireO:'#E37F5C',fireY:'#F3C46C',fireC:'#F8EED2',moon:'#DAD1B4',sun:'#EDD9A0',crust:'#C8864F',crustLt:'#E2AA6A',flour:'#F1EADB'};
const F={serif:'"DejaVu Serif",Georgia,"Noto Serif","Times New Roman",serif',
  sans:'"Inter Display","Inter",Roboto,"Helvetica Neue",Arial,system-ui,sans-serif'};
const LW=2.6;

// ---------- математика ----------
const hn=i=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,u)=>a+(b-a)*u;
const prog=(t,a,b)=>clamp((t-a)/(b-a));
const eo=x=>1-Math.pow(1-clamp(x),3);
const eio=x=>{x=clamp(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;};
const sm=x=>{x=clamp(x);return x*x*(3-2*x);};
const back=x=>{x=clamp(x);const c=1.4;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2);};
const spr=(x,f=11,d=6)=>x<=0?0:1-Math.exp(-d*x)*Math.cos(f*x);
const vis=(t,t0,t1,din=.4,dout=.3)=>sm((t-t0)/din)*(t1==null?1:1-sm((t-(t1-dout))/dout));
function rng(seed){let s=(seed>>>0)||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
// ключи камеры/величин: [[t, v], ...] или [[t, [a,b,c]], ...], между ключами плавно (in-out)
function kf(t,keys,ease=eio){if(t<=keys[0][0])return keys[0][1];
  for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){const a=keys[i-1],b=keys[i],u=ease((t-a[0])/(b[0]-a[0]));
    return Array.isArray(a[1])?a[1].map((v,j)=>lerp(v,b[1][j],u)):lerp(a[1],b[1],u);}
  return keys[keys.length-1][1];}

// ---------- цвет и ночь ----------
const hx=h=>{h=h.replace('#','');return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];};
const toHex=a=>'#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
function mix(a,b,u){const A=hx(a),B=hx(b);return toHex(A.map((v,i)=>lerp(v,B[i],clamp(u))));}
let LIGHT=0;const NK=[.3,.35,.5],CC={};
// light(n): 0 день, 1 глубокая ночь. Все предметы и человечки темнеют сами (кроме огня и свечений).
function light(n){LIGHT=clamp(n);}
function col(h){if(LIGHT<.01||h[0]!=='#')return h;const q=Math.round(LIGHT*24),k=h+q;if(CC[k])return CC[k];
  const u=q/24;return CC[k]=toHex(hx(h).map((v,i)=>v*lerp(1,NK[i],u)));}
function sf(g,fill,lw=LW,stroke=C.ink){if(fill){g.fillStyle=col(fill);g.fill();}if(lw>0){g.lineWidth=lw;g.strokeStyle=col(stroke);g.stroke();}}

// ---------- заготовки (один раз) ----------
function mk(w,h){const c=new OffscreenCanvas(w,h);return[c,c.getContext('2d')];}
function blot(h,x,y,r,c,a){const gr=h.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,`rgba(${c},${a})`);gr.addColorStop(1,`rgba(${c},0)`);h.fillStyle=gr;h.fillRect(x-r,y-r,r*2,r*2);}
function grain(h,w,ht,n,seed,a=1){const r=rng(seed);for(let i=0;i<n;i++){const c=r();h.fillStyle=c>.5?`rgba(90,65,45,${.05*a})`:`rgba(255,250,240,${.10*a})`;h.fillRect(r()*w,r()*ht,1+c*2,1+r()*1.5);}
  h.strokeStyle=`rgba(110,85,60,${.05*a})`;h.lineWidth=1;for(let i=0;i<n/60;i++){const x=r()*w,y=r()*ht;h.beginPath();h.moveTo(x,y);h.lineTo(x+(r()-.5)*40,y+(r()-.5)*14);h.stroke();}}
let OV=null;
// бумага поверх всего: молочная вуаль, акварельные пятна, зерно, волокна, виньетка
// бумага: молочная вуаль, акварельные пятна, зерно. Запекается в небо, холмы, стол и страницу (не рисуется каждый кадр)
function paperOn(h,w,ht,seed,a=1){h.fillStyle=`rgba(238,230,212,${.09*a})`;h.fillRect(0,0,w,ht);const r=rng(seed);
  for(let i=0;i<w*ht/30000;i++)blot(h,r()*w,r()*ht,90+r()*240,r()>.5?'255,248,235':'110,85,60',.045*a);grain(h,w,ht,w*ht/130,seed+1,a);}
function vigGrad(h,a=1){const v=h.createRadialGradient(W/2,H*.47,H*.3,W/2,H*.47,H*.74);v.addColorStop(0,'rgba(45,30,22,0)');v.addColorStop(1,`rgba(45,30,22,${.38*a})`);h.fillStyle=v;h.fillRect(0,0,W,H);}
function overlayTex(){if(OV)return OV;const[c,h]=mk(W,H);vigGrad(h);grain(h,W,H,9000,5);return OV=c;}
// overlay(g): виньетка низа и боков земли (верх виньетки запечён в небо) - дёшево, рисуй в конце кадра
const VS=[[0,1336,W,H-1336],[0,1000,110,336],[W-110,1000,110,336]];
function overlay(g,a=1){const o=overlayTex();g.save();g.globalAlpha=a;VS.forEach(([x,y,w,h])=>g.drawImage(o,x,y,w,h,x,y,w,h));g.restore();}
let HT=null;
function hatchPat(g){if(HT)return HT;const[c,h]=mk(240,240);const r=rng(31);h.lineCap='round';
  for(let i=0;i<66;i++){const x=r()*240,y=r()*240,l=20+r()*60;h.strokeStyle=`rgba(60,50,35,${.25+r()*.3})`;h.lineWidth=.8+r()*.7;
    for(const dx of[-240,0,240])for(const dy of[-240,0,240]){h.beginPath();h.moveTo(x+dx,y+dy);h.lineTo(x+dx-l*.94,y+dy+l*.34);h.stroke();}}
  return HT=g.createPattern(c,'repeat');}
const GLS={};const GLC={warm:'255,214,150',fire:'255,170,105',white:'255,248,232',cool:'200,215,255',gold:'255,230,160'};
function glowImg(k){if(GLS[k])return GLS[k];const[c,h]=mk(256,256),gr=h.createRadialGradient(128,128,0,128,128,128),cc=GLC[k]||k;
  gr.addColorStop(0,`rgba(${cc},.85)`);gr.addColorStop(.25,`rgba(${cc},.4)`);gr.addColorStop(.6,`rgba(${cc},.1)`);gr.addColorStop(1,`rgba(${cc},0)`);h.fillStyle=gr;h.fillRect(0,0,256,256);return GLS[k]=c;}
let PL=null;
// pool(g,x,y,rx,ry,a): тёплое пятно света на земле (от костра/печи/лампы), эллипс
function pool(g,x,y,rx,ry,a=1,k='255,200,130'){if(a<=.01)return;if(!PL){const[c,h]=mk(512,256),gr=h.createRadialGradient(128,128,0,128,128,128);gr.addColorStop(0,`rgba(${k},.7)`);gr.addColorStop(.45,`rgba(${k},.3)`);gr.addColorStop(1,`rgba(${k},0)`);
  h.setTransform(2,0,0,1,0,0);h.fillStyle=gr;h.fillRect(0,0,256,256);PL=c;}g.save();g.globalAlpha=Math.min(1,a);g.drawImage(PL,x-rx,y-ry,rx*2,ry*2);g.restore();}
// мягкое свечение (спрайт). mode 'lighter' для огня ночью
function glow(g,x,y,r,a=1,k='warm',mode){if(r<=1||a<=.01)return;if(mode==='lighter'&&r>240){mode=null;a*=.8;}g.save();g.globalAlpha=Math.min(1,a);if(mode)g.globalCompositeOperation=mode;g.drawImage(glowImg(k),x-r,y-r,r*2,r*2);g.restore();}

// ---------- небо ----------
// Режимы: dawn (полосы закат/рассвет), day, dusk (сиреневые полосы), night (синее, звёзды). Горизонт около y 1000.
const SKY={};
const SKYDEF={
  dawn:{bands:['#A6B6B7','#B0B6B1','#C89C90','#D7A596','#E1B19B','#E5BE93','#EBD0A3'],edges:[170,330,500,660,810,940,1200]},
  dusk:{bands:['#5D5E7F','#73698A','#977D97','#BB8E93','#CF9A8E','#DDAE93','#E7C29C'],edges:[200,380,540,690,830,950,1200]},
  day:{grad:[[0,'#9AB2BE'],[.3,'#AFC2C6'],[.52,'#D3D6C8'],[.62,'#E9DDC5'],[1,'#EADFC8']]},
  night:{grad:[[0,'#1C2030'],[.3,'#252A3B'],[.5,'#2E3447'],[.62,'#3A4258'],[1,'#3A4258']]}};
function skyTex(mode){if(SKY[mode])return SKY[mode];const d=SKYDEF[mode],[c,h]=mk(W,H),r=rng(mode.length*91);
  if(d.grad){const gr=h.createLinearGradient(0,0,0,H);d.grad.forEach(([u,cl])=>gr.addColorStop(u,cl));h.fillStyle=gr;h.fillRect(0,0,W,H);
    // едва заметные бумажные полосы, как в полосатом закате
    for(let i=0;i<5;i++){const y=150+i*170+r()*40;h.beginPath();h.moveTo(0,y);for(let x=0;x<=W;x+=40)h.lineTo(x,y+Math.sin(x*.004+i*2)*16+Math.sin(x*.011+i)*6);
      h.lineTo(W,0);h.lineTo(0,0);h.closePath();h.fillStyle=mode==='night'?'rgba(10,12,30,.05)':'rgba(255,255,255,.05)';h.fill();}}
  else{h.fillStyle=d.bands[d.bands.length-1];h.fillRect(0,0,W,H);
    for(let i=d.bands.length-2;i>=0;i--){const e=d.edges[i],ph=r()*6,amp=10+r()*12;
      const edge=()=>{h.beginPath();h.moveTo(-10,-10);h.lineTo(-10,e);for(let x=-10;x<=W+10;x+=24)h.lineTo(x,e+Math.sin(x*.0045+ph)*amp+Math.sin(x*.013+ph*2)*4);h.lineTo(W+10,-10);h.closePath();};
      h.save();h.translate(0,9);edge();h.fillStyle='rgba(70,40,40,.07)';h.fill();h.translate(0,-5);edge();h.fillStyle='rgba(70,40,40,.07)';h.fill();h.restore();
      edge();h.fillStyle=d.bands[i];h.fill();
      h.save();h.translate(0,-2);h.beginPath();for(let x=-10;x<=W+10;x+=24)h.lineTo(x,e+Math.sin(x*.0045+ph)*amp+Math.sin(x*.013+ph*2)*4);h.strokeStyle='rgba(255,245,230,.28)';h.lineWidth=3;h.stroke();h.restore();}}
  for(let i=0;i<40;i++)blot(h,r()*W,r()*H*.6,80+r()*200,r()>.5?'255,250,240':'80,60,70',mode==='night'?.04:.05);
  if(mode==='night'){for(let i=0;i<420;i++){const y=Math.pow(r(),1.3)*H*.62,s=r();h.fillStyle=`rgba(255,250,225,${.2+s*.6})`;h.beginPath();h.arc(r()*W,y,.6+s*s*2.2,0,7);h.fill();}}
  paperOn(h,W,H,mode.length+40,mode==='night'?.6:1);vigGrad(h);return SKY[mode]=c;}
// sky(g, [['dawn',1],['day',.3]]) - первый слой целиком, остальные поверх с прозрачностью (растворение). dy - сдвиг при наклоне камеры
// h - сколько строк неба рисовать (ниже всё равно закрыто холмами): экономия; по умолчанию весь кадр
function sky(g,layers,h=H){if(typeof layers==='string')layers=[[layers,1]];h=Math.min(H,Math.round(h));
  let st=0;layers.forEach(([m,a],i)=>{if(a>=.99)st=i;});layers.forEach(([m,a],i)=>{if(a<=.01||i<st)return;g.save();g.globalAlpha=i===st?1:clamp(a);g.drawImage(skyTex(m),0,0,W,h,0,0,W,h);g.restore();});}
// мерцающие звёзды-искорки (4 луча) и падающая звезда
function stars(g,t,a=1,seed=3,n=9){if(a<=.01)return;g.save();for(let i=0;i<n;i++){const x=60+hn(seed+i)*960,y=140+hn(seed+i*5)*650,tw=.5+.5*Math.sin(t*2.2+i*1.7),s=5+hn(i+seed*3)*7;
  g.globalAlpha=a*(.45+.55*tw);g.fillStyle='#FFF6DC';g.beginPath();g.moveTo(x,y-s);g.quadraticCurveTo(x,y,x+s,y);g.quadraticCurveTo(x,y,x,y+s);g.quadraticCurveTo(x,y,x-s,y);g.quadraticCurveTo(x,y,x,y-s);g.fill();
  if(i<3)glow(g,x,y,s*4,a*.35*tw,'white');}g.restore();}
function moon(g,x,y,r,a=1){if(a<=.01)return;glow(g,x,y,r*3.2,a*.35,'gold');g.save();g.globalAlpha=a;g.beginPath();g.arc(x,y,r,0,7);g.fillStyle='#D7CEB0';g.fill();
  g.fillStyle='rgba(150,140,110,.22)';[[-.3,-.2,.28],[.35,.25,.2],[-.1,.4,.14]].forEach(([u,v,s])=>{g.beginPath();g.arc(x+u*r,y+v*r,s*r,0,7);g.fill();});g.restore();}
let SUN=null;
const SUNS={};function sunTex(cl){cl=cl||C.sun;if(SUNS[cl])return SUNS[cl];const[c,h]=mk(256,256);h.beginPath();h.arc(128,128,120,0,7);h.fillStyle=cl;h.fill();h.save();h.clip();
  const r=rng(9);h.strokeStyle='rgba(215,170,80,.45)';h.lineWidth=1.4;for(let i=0;i<60;i++){const x=r()*256,y=r()*256;h.beginPath();h.moveTo(x,y);h.lineTo(x+40,y-26);h.stroke();}
  blot(h,150,105,90,'255,250,225',.5);h.restore();h.beginPath();h.arc(128,128,120,0,7);h.strokeStyle=cl===C.sun?'#CDA958':mix(cl,'#7A5A40',.3);h.lineWidth=3.5;h.stroke();if(cl===C.sun)SUN=c;return SUNS[cl]=c;}
// солнце с карандашными лучами. o.rays 0..1 (дорисовка), o.beams - мягкие лучи света
const HALO={};
// ореол солнца: свечение + мягкие лучи света одним спрайтом (уровни лучей 0, .4, .7, 1)
function haloImg(r,bk){r=Math.round(r);const k=r+'_'+bk;if(HALO[k])return HALO[k];const gR=r*2.6,bR=Math.min(420,r*4.2),R=Math.ceil(Math.max(gR,bR)),[c,h]=mk(R*2,R*2);
  h.globalAlpha=.55;h.drawImage(glowImg('warm'),R-gR,R-gR,gR*2,gR*2);if(bk>0){beamsImg();h.globalAlpha=.6*bk;h.drawImage(BM,R-bR,R-bR,bR*2,bR*2);}return HALO[k]={c,R};}
const BKL=[0,.4,.7,1];
function sun(g,x,y,r,t=0,o={}){if(r<=1)return;const a=o.a==null?1:o.a,bk=clamp(o.beams||0);let li=0;while(li<BKL.length-2&&bk>BKL[li+1])li++;
  const lo=BKL[li],hi=BKL[li+1],u=(bk-lo)/(hi-lo);g.save();
  const M=g.getTransform(),sc=M.a,dev=Math.abs(M.b)<1e-6&&Math.abs(M.c)<1e-6&&Math.abs(sc-M.d)<1e-6&&(Math.abs(sc-1)<1e-6||Math.abs(sc-1.2)<1e-6);
  const hd=(lv,al)=>{if(al<=.01)return;g.globalAlpha=al;if(dev){const H_=haloImg(r*sc,lv);g.setTransform(1,0,0,1,0,0);g.drawImage(H_.c,Math.round(M.a*x+M.e-H_.R),Math.round(M.d*y+M.f-H_.R));g.setTransform(M);}
    else{const rb=r>60?92:Math.round(r),H_=haloImg(rb,lv),k=r/rb;g.drawImage(H_.c,x-H_.R*k,y-H_.R*k,H_.R*2*k,H_.R*2*k);}};
  if(u<.01)hd(lo,a);else if(u>.99)hd(hi,a);else{hd(lo,a*(1-u));hd(hi,a*u);}
  g.globalAlpha=a;g.drawImage(sunTex(o.c),x-r,y-r,r*2,r*2);const rp=o.rays==null?1:o.rays;
  if(rp>0){g.strokeStyle=o.c?mix(o.c,'#B07850',.25):'#D9B55A';g.lineWidth=Math.max(2,r*.045);g.lineCap='round';g.beginPath();for(let i=0;i<12;i++){const u=clamp(rp*12-i);if(u<=0)break;
    const an=i/12*Math.PI*2+Math.sin(t*.6)*.04,r1=r*1.32,r2=r*(i%2?1.62:1.8)+Math.sin(t*2+i)*r*.04;
    g.moveTo(x+Math.cos(an)*r1,y+Math.sin(an)*r1);g.lineTo(x+Math.cos(an)*lerp(r1,r2,u),y+Math.sin(an)*lerp(r1,r2,u));}g.stroke();}
  g.restore();}
let BM=null;
function beamsImg(){if(BM)return BM;const[c,h]=mk(900,900);for(let i=0;i<13;i++){const an=i/13*Math.PI*2,w=.07+hn(i)*.08;
    const gr=h.createRadialGradient(450,450,0,450,450,450);gr.addColorStop(0,'rgba(255,248,225,.55)');gr.addColorStop(1,'rgba(255,248,225,0)');h.fillStyle=gr;
    h.beginPath();h.moveTo(450,450);h.arc(450,450,450,an-w,an+w);h.closePath();h.fill();}return BM=c;}
// мягкие лучи света отдельно (в sun уже встроены через o.beams)
function beams(g,x,y,r,a,t){if(a<=.01)return;beamsImg();g.save();g.globalAlpha=a*.6;const s=Math.min(420,r*4.2);g.drawImage(BM,x-s,y-s,s*2,s*2);g.restore();}
function birds(g,t,x,y,n=3,a=1){g.save();g.globalAlpha=a;g.strokeStyle=col('#4E4038');g.lineWidth=2.2;g.lineCap='round';
  for(let i=0;i<n;i++){const bx=x+i*70+Math.sin(t*.7+i)*14+t*18,by=y+hn(i+4)*60-i*12,f=Math.sin(t*7+i*2)*5;
    g.beginPath();g.moveTo(bx-12,by+f*.3);g.quadraticCurveTo(bx-6,by-6-f,bx,by);g.quadraticCurveTo(bx+6,by-6-f,bx+12,by+f*.3);g.stroke();}g.restore();}

// ---------- холмы ----------
const PW=2160,TAU=Math.PI*2;
function hy(wx,y0,amp,seed){return y0+amp*(Math.sin(TAU*2*wx/PW+seed)*.62+Math.sin(TAU*4*wx/PW+seed*2.3)*.28+Math.sin(TAU*9*wx/PW+seed)*.1);}
// y верхнего края ближнего холма (земли) в мировой точке wx: ставить деревья/дома на линию холма
function groundY(wx,seed=1,y0=1165){return hy(wx,y0,30,seed+4);}
function hillPath(g,ox,x0,x1,y0,amp,seed,bot){g.beginPath();g.moveTo(x0+ox,bot);for(let x=x0;x<=x1;x+=12)g.lineTo(x+ox,hy(x+ox,y0,amp,seed));g.lineTo(x1+ox,bot);g.closePath();}
function hillPaint(g,ox,x0,x1,y0,amp,fill,line,seed,o={}){const bot=o.bot||H+20;hillPath(g,ox,x0,x1,y0,amp,seed,bot);
  const gr=g.createLinearGradient(0,y0-amp,0,y0+520);gr.addColorStop(0,mix(fill,'#F4EEDC',.16));gr.addColorStop(.35,fill);gr.addColorStop(1,mix(fill,'#2A2A22',.12));
  g.fillStyle=gr;g.fill();g.globalAlpha=o.hatch==null?.13:o.hatch;g.fillStyle=hatchPat(g);g.fill();g.globalAlpha=o.la||.75;
  g.beginPath();for(let x=x0;x<=x1;x+=12)g.lineTo(x+ox,hy(x+ox,y0,amp,seed));g.strokeStyle=line;g.lineWidth=o.lw||2.4;g.stroke();g.globalAlpha=1;}
// живой слой холма (для своих сцен, дороже): верхний край y0±amp, штриховка, контур
function hill(g,camX,par,y0,amp,fill,line,seed,o={}){const ox=camX*par;g.save();g.translate(-ox,0);hillPaint(g,ox,-260,W+260,y0,amp,fill,line,seed,o);g.restore();}
// Палитры ландшафта: day, dusk, night (имена). Переход: hills(g, camX, [['day',1],['dusk',u]])
const PAL={day:{far:'#BBC1A6',mid:'#AFBEA0',near:'#A6BA90',front:'#97AF85',line:'#6B5646',fg:'90,118,78'},
  dusk:{far:'#A8A3AE',mid:'#949E95',near:'#8A9C84',front:'#7D8F79',line:'#5E4E4E',fg:'70,86,70'},
  dusk:{far:'#B9AAA6',mid:'#A6AA97',near:'#9AAA88',front:'#8DA07E',line:'#6B5646',fg:'78,96,72'},
  night:{far:'#33405A',mid:'#34453F',near:'#283731',front:'#1B2826',line:'#8C9AA8',fg:'16,26,24'}};
// слои: [параллакс, y0, amp, сдвиг зерна, низ спрайта, штрих, контур]
const HL={far:[.22,940,46,0,1090,.08,.45],mid:[.5,1035,40,2,1210,.1,.6],near:[1,1165,30,4,1605,.13,.75],front:[1.15,1565,26,8,1935,.16,.75]};
const HSP={},ZP=1250;
function hillSprite(pal,seed,k,Z){const key=pal+seed+k+Z;if(HSP[key])return HSP[key];const[par,y0,amp,ds,bot,ht,la]=HL[k],P=PAL[pal],top=y0-amp-8;
  const[c,h]=mk(Math.ceil(PW*Z),Math.ceil((bot-top)*Z));h.scale(Z,Z);h.translate(0,-top);hillPaint(h,0,-12,PW+12,y0,amp,P[k],P.line,seed+ds,{bot,hatch:ht,la});h.setTransform(1,0,0,1,0,0);h.globalCompositeOperation='source-atop';paperOn(h,c.width,c.height,seed+ds+7,pal==='night'?.6:1);return HSP[key]={c,top};}
// слой рисуется блитом 1:1, масштаб камеры Z запечён в спрайт (пивот 540, 1250)
function drawHill(g,pal,seed,k,camX,a,Z,dy){const sp=hillSprite(pal,seed,k,Z),ox=((camX*HL[k][0])%PW+PW)%PW,y=Math.round(ZP+(sp.top+dy-ZP)*Z);if(y>H)return;
  g.save();if(a<1)g.globalAlpha=a;for(let x0=-ox-PW;540+(x0-540)*Z<W;x0+=PW){const sx=Math.round(540+(x0-540)*Z);if(sx+PW*Z>0)g.drawImage(sp.c,sx,y);}g.restore();}
const palL=P=>typeof P==='string'?[[P,1]]:P;
// hills(g, camX, 'day' | 'night' | [['day',1],['dusk',.4]] | [['day',1],['night',.5]], dy, {z}) - дальний, средний, ближний холм.
// z - масштаб камеры (холмы запекаются в нём, рисуются блитом 1:1); предметы рисуй внутри wz(g, z)
function hills(g,camX,P,dy=0,o={}){const s=o.seed||1,Z=o.z||1;
  ['far','mid','near'].forEach(k=>palL(P).forEach(([p,a],i)=>{if(a>.01)drawHill(g,p,s,k,camX,i?a:1,Z,dy);}));}
const HST={};
// hillsStack(g, camX, pal, {z}): три слоя холмов, заранее сведённые в один спрайт для неподвижной camX (для наездов/отъездов камеры: один блит вместо трёх)
function hillsStack(g,camX,P,o={}){const Z=o.z||1,k=P+camX+Z;let st=HST[k];if(!st){const top=Math.round(ZP+(888-ZP)*Z),bot=Math.round(ZP+(1605-ZP)*Z),[c,h]=mk(W,bot-top);h.translate(0,-top);hills(h,camX,P,0,o);st=HST[k]={c,top};}
  g.drawImage(st.c,0,st.top);}
// передний холм (рисовать после героев): тёмнее, край ~y 1560
function front(g,camX,P,dy=0,o={}){const Z=o.z||1;palL(P).forEach(([p,a],i)=>{if(a>.01)drawHill(g,p,o.seed||1,'front',camX,i?a:1,Z,dy);});}
// масштаб мира вокруг пивота холмов: внутри рисуй предметы в мировых координатах
function wz(g,z){zoom(g,z,540,ZP);}
const FG={};
function fgTex(k){if(FG[k])return FG[k];const[c,h]=mk(560,120),r=rng(41);h.lineCap='round';
  for(let i=0;i<95;i++){const x=r()*560,hh=30+r()*85,w=2+r()*3.5;h.strokeStyle=`rgba(${k},${.55+r()*.4})`;h.lineWidth=w;h.beginPath();h.moveTo(x,122);h.quadraticCurveTo(x+(r()-.5)*8,122-hh*.6,x+(r()-.5)*14,122-hh);h.stroke();}
  for(let i=0;i<8;i++){const x=r()*560,y=40+r()*40;h.fillStyle=k.split(',').reduce((x,y)=>x+ +y,0)<120?'rgba(40,40,50,.8)':'rgba(220,150,150,.75)';h.beginPath();h.arc(x,y,4+r()*3,0,7);h.fill();h.strokeStyle=`rgba(${k},.8)`;h.lineWidth=2;h.beginPath();h.moveTo(x,y+5);h.lineTo(x+1,122);h.stroke();}
  for(let i=0;i<4;i++){const x=r()*560;h.fillStyle=`rgba(${k},.6)`;h.fillRect(x,70,6,52);}
  // размываем увеличением и запекаем в полный размер
  const[c2,h2]=mk(2240,480);h2.imageSmoothingEnabled=true;h2.globalAlpha=.85;h2.drawImage(c,0,0,2240,480);return FG[k]=c2;}
// размытая трава на первом плане (глубина резкости), низ кадра y>1560
function fg(g,camX,P,dy=0,a=1,Z=1){const k=PAL[palL(P).sort((a,b)=>b[1]-a[1])[0][0]].fg,tx=fgTex(k),sw=2240,ox=((camX*1.45)%sw+sw)%sw;
  const y=Math.round(ZP+(1500+dy-ZP)*Z);if(y>H)return;g.save();g.globalAlpha=a;for(let x=-ox;x<W;x+=sw)if(x+sw>0)g.drawImage(tx,Math.round(x),y);g.restore();}
function tufts(g,xs,y,t,c=C.grassDk){g.save();g.strokeStyle=col(c);g.lineWidth=2.2;g.lineCap='round';g.beginPath();
  xs.forEach((x,i)=>{const yy=y+(hn(i+x)-.5)*30;for(let j=-1;j<=1;j++){g.moveTo(x+j*5,yy);g.lineTo(x+j*9+Math.sin(t*1.5+x)*1.5,yy-12-hn(x+j)*8);}});g.stroke();g.restore();}

// ---------- пылинки ----------
function motes(g,t,a=1,n=26,seed=1,warm){g.save();g.fillStyle=warm?'#FFE7B0':'#FFF8EA';for(let i=0;i<n;i++){const sp=8+hn(i+seed)*18,x=(hn(i*3+seed)*W+t*sp*(hn(i)>.5?1:-1)+W*4)%W,
  y=(hn(i*7+seed)*H-t*sp*.6+H*4)%H,tw=.5+.5*Math.sin(t*1.3+i);g.globalAlpha=a*.5*tw;g.beginPath();g.arc(x,y,1.4+hn(i+9)*2.4,0,7);g.fill();}g.restore();}
// ---------- человечки-куколки ----------
// person(g, x, y-ноги, s, o): человечек-куколка. o: age 'adult'|'kid'|'old'; outfit 'dress'|'pants' (брюки + куртка);
//   dress / top (цвет платья или куртки), pants (цвет брюк), skin, hair 'cap'|'bun'|'long'|'curly'|'short'|'bald', hairC;
//   hat 'helmet'(каска)|'cap'(кепка)|'scarf'(платок)|'beanie', hatC; bag цвет рюкзака; stripe:1 светоотражающие полосы;
//   позы: aL/aR углы рук (0 вниз, PI вверх), sit, walk (фаза шага), wave:1 машет правой, dance:1 танцует, cane:1 трость,
//   hold(g,x,y) - предмет в правой руке, pat 'stripe'|'dots', tilt, mouth 'o', happy, flip, legs:false (для велосипеда), glasses, beard, t, seed
function person(g,x,y,s,o={}){if(s<=.01)return;const t=o.t||0,sd=o.seed||1,age=o.age||'adult',kid=age==='kid',old=age==='old';if(kid)s*=.74;
  g.save();g.translate(x,y);g.scale(s,s);g.lineJoin='round';g.lineCap='round';
  if(o.flip)g.scale(-1,1);const sit=!!o.sit,skin=o.skin||C.skin,dress=o.dress||o.top||C.sage,hc=o.hairC||(old?C.grey:C.hair),pants=o.outfit==='pants';
  const dn=o.dance?Math.sin(t*6.5+sd*1.3):0,wk=o.walk!=null?o.walk:null,bob=(wk!=null?Math.abs(Math.sin(wk*Math.PI))*7:0)+(o.dance?Math.abs(dn)*12:0);g.translate(0,-bob);if(o.dance)g.rotate(dn*.07);
  const hy0=sit?-168:-252,R=kid?47:40,dTop=sit?-126:-208,dBot=sit?-14:-96,dw=sit?62:52,sy=sit?-114:-194;
  // ноги
  const pc=o.pants||'#6F7C8C',legs=o.legs!==false;
  if(legs&&!sit){[-1,1].forEach(k=>{const sw=wk!=null?Math.sin(wk*Math.PI*2)*10*k:(o.dance?dn*8*k:0);g.beginPath();
      if(pants){g.roundRect(k*12-8+sw*.6,-110,16,104,4);sf(g,pc,2);}else{g.roundRect(k*11-4.5+sw*.6,-104,9,96,4);sf(g,skin,2);}
      g.beginPath();g.ellipse(k*13+sw,-5,12,6.5,0,0,7);sf(g,'#4A3428',1.8);});}
  else if(legs){if(pants){g.beginPath();g.roundRect(-34,-40,68,32,8);sf(g,pc,2);}[-1,1].forEach(k=>{g.beginPath();g.ellipse(k*17,-7,13,7.5,0,0,7);sf(g,'#4A3428',1.8);});}
  // рюкзак (видно по бокам) и волосы сзади
  if(o.bag){g.beginPath();g.roundRect(-52,-206,104,100,18);sf(g,o.bag,2.2);}
  if(o.hair==='long'){g.beginPath();g.roundRect(-R-8,hy0-14,R*2+16,R*1.8,[30,30,12,12]);sf(g,hc,2);}
  // платье-колокол или куртка
  if(pants){const yb=sit?-36:-100;g.beginPath();g.moveTo(-24,dTop);g.quadraticCurveTo(-36,dTop+20,-34,yb);g.lineTo(34,yb);g.quadraticCurveTo(36,dTop+20,24,dTop);g.quadraticCurveTo(0,dTop-8,-24,dTop);g.closePath();sf(g,dress,LW);
    g.strokeStyle=col(mix(dress,'#3A2A20',.35));g.lineWidth=2;g.beginPath();g.moveTo(0,dTop+2);g.lineTo(0,yb);g.stroke();
    if(o.stripe){g.fillStyle=col('#F1E9D6');g.fillRect(-35,yb-34,70,7);g.fillRect(-35,yb-58,70,7);}}
  else{g.beginPath();g.moveTo(-24,dTop);g.bezierCurveTo(-34,dTop+30,-dw-4,dBot-36,-dw,dBot-4);g.quadraticCurveTo(0,dBot+12,dw,dBot-4);g.bezierCurveTo(dw+4,dBot-36,34,dTop+30,24,dTop);g.quadraticCurveTo(0,dTop-8,-24,dTop);g.closePath();
    sf(g,dress,LW);
    if(o.pat){g.save();g.clip();g.fillStyle=col(mix(dress,o.pat==='dots'?'#FFFFFF':'#3A2A20',o.pat==='dots'?.55:.22));
      if(o.pat==='stripe')for(let yy=dTop+6;yy<dBot+10;yy+=15)g.fillRect(-80,yy,160,5.5);else for(let i=0;i<18;i++){g.beginPath();g.arc(-50+(i%5)*24+(i/5|0)%2*12,dTop+14+(i/5|0)*24,3.4,0,7);g.fill();}
      g.restore();}}
  if(o.bag){g.strokeStyle=col(mix(o.bag,'#3A2A20',.3));g.lineWidth=5;g.beginPath();g.moveTo(-15,dTop);g.lineTo(-17,dTop+70);g.moveTo(15,dTop);g.lineTo(17,dTop+70);g.stroke();}
  // руки-палочки с шариками
  const arm=(k,a)=>{const sx=k*22,ex=sx+k*Math.sin(a)*86,ey=sy+Math.cos(a)*86;g.beginPath();g.moveTo(sx,sy);g.lineTo(ex,ey);g.lineWidth=11.5;g.strokeStyle=col(C.ink);g.stroke();
    g.lineWidth=7.5;g.strokeStyle=col(pants&&!o.bare?dress:skin);g.stroke();g.beginPath();g.arc(ex,ey,6.5,0,7);sf(g,skin,2);g.beginPath();g.arc(sx,sy,5,0,7);sf(g,pants?dress:skin,1.6);return[ex,ey];};
  let aL=o.aL==null?(sit?.35:.18):o.aL,aR=o.aR==null?(sit?.35:.18):o.aR;
  if(o.wave)aR=2.55+Math.sin(t*9+sd)*.38;if(o.dance){aL=2.3+dn*.5;aR=2.3-dn*.5;}if(wk!=null&&o.aL==null&&o.aR==null){aL=.18+Math.sin(wk*Math.PI*2)*.35;aR=.18-Math.sin(wk*Math.PI*2)*.35;}
  if(o.cane){aR=.45;}
  arm(-1,aL);const hR=arm(1,aR);
  if(o.cane){g.beginPath();g.moveTo(hR[0],hR[1]-8);g.lineTo(hR[0]+14,-4);g.lineWidth=7;g.strokeStyle=col(C.ink);g.stroke();g.lineWidth=4;g.strokeStyle=col('#8C6A4D');g.stroke();}
  if(o.hold)o.hold(g,hR[0],hR[1]);
  // голова
  g.save();g.translate(0,hy0);g.rotate(o.tilt||0);g.beginPath();g.arc(0,0,R,0,7);sf(g,skin,LW);
  const hair=o.hair||(old?'bun':'cap');
  if(hair==='curly'){g.fillStyle=col(hc);for(let i=0;i<11;i++){const an=Math.PI*(1.02+i*.096);g.beginPath();g.arc(Math.cos(an)*R*.95,Math.sin(an)*R*.95,14,0,7);g.fill();}
    g.beginPath();g.arc(0,-R*.35,R*.75,Math.PI,0);g.fill();}
  else if(hair==='bald'){g.beginPath();g.arc(-R*.92,0,R*.3,Math.PI*.5,Math.PI*1.5);g.arc(R*.92,0,R*.3,Math.PI*1.5,Math.PI*.5);g.closePath();g.fillStyle=col(hc);g.fill();}
  else{g.beginPath();g.arc(0,0,R+3,Math.PI*.97,Math.PI*2.03);const fr=hair==='short'?-10:-15;g.bezierCurveTo(R*.7,fr+4,-R*.6,fr-2,-R-3,4);g.closePath();sf(g,hc,2);
    if(hair==='bun'){g.beginPath();g.arc(0,-R-10,15,0,7);sf(g,hc,2);}}
  // головной убор
  const hcol=o.hatC||(o.hat==='helmet'?'#E2B84E':o.hat==='scarf'?C.pink:C.blue);
  if(o.hat==='helmet'){g.beginPath();g.arc(0,-6,R+4,Math.PI,0);g.closePath();sf(g,hcol,2.4);g.beginPath();g.roundRect(-R-12,-10,R*2+24,9,4);sf(g,hcol,2);g.beginPath();g.moveTo(0,-R-9);g.lineTo(0,-8);g.strokeStyle=col(mix(hcol,'#3A2A20',.3));g.lineWidth=3;g.stroke();}
  else if(o.hat==='cap'){g.beginPath();g.arc(0,-8,R+2,Math.PI,0);g.closePath();sf(g,hcol,2.2);g.beginPath();g.ellipse(R*.7,-9,R*.75,7,0,0,7);sf(g,hcol,2);}
  else if(o.hat==='beanie'){g.beginPath();g.arc(0,-6,R+3,Math.PI,0);g.closePath();sf(g,hcol,2.2);g.beginPath();g.roundRect(-R-4,-14,R*2+8,12,5);sf(g,mix(hcol,'#FFFFFF',.3),2);g.beginPath();g.arc(0,-R-12,9,0,7);sf(g,mix(hcol,'#FFFFFF',.3),2);}
  else if(o.hat==='scarf'){g.beginPath();g.moveTo(-R-6,14);g.bezierCurveTo(-R-10,-R*1.4,R+10,-R*1.4,R+6,14);g.quadraticCurveTo(R*.5,-R*.55,0,-R*.62);g.quadraticCurveTo(-R*.5,-R*.55,-R-6,14);g.closePath();sf(g,hcol,2.2);
    g.beginPath();g.moveTo(-R+4,R*.62);g.lineTo(-R-14,R*1.05);g.lineTo(-R-4,R*.9);g.closePath();sf(g,hcol,2);}
  // лицо
  const bl=((t+sd*1.37)%3.9)>3.76;g.fillStyle=col('#36261F');g.strokeStyle=col('#36261F');g.lineWidth=2.6;
  if(o.happy||o.sleep){[-13,13].forEach(ex=>{g.beginPath();if(o.sleep)g.arc(ex,2,5.5,Math.PI*.1,Math.PI*.9);else g.arc(ex,6,5.5,Math.PI*1.1,Math.PI*1.9);g.stroke();});}
  else if(bl){[-13,13].forEach(ex=>{g.beginPath();g.moveTo(ex-4,5);g.lineTo(ex+4,5);g.stroke();});}
  else{[-13,13].forEach(ex=>{g.beginPath();g.arc(ex,4,3.8,0,7);g.fill();});}
  if(o.glasses||(old&&o.glasses!==false)){g.lineWidth=2;[-13,13].forEach(ex=>{g.beginPath();g.arc(ex,4,9,0,7);g.stroke();});g.beginPath();g.moveTo(-4,3);g.lineTo(4,3);g.stroke();g.lineWidth=2.6;}
  if(o.beard){g.fillStyle=col(hc);g.beginPath();g.ellipse(-8,15,9,4.5,.2,0,7);g.ellipse(8,15,9,4.5,-.2,0,7);g.fill();}
  else{g.beginPath();if(o.mouth==='o')g.arc(0,19,4,0,7);else g.arc(0,13,7,Math.PI*.2,Math.PI*.8);g.stroke();}
  g.globalAlpha=.5;g.fillStyle=col(C.cheek);[-24,24].forEach(cx=>{g.beginPath();g.arc(cx,13,7.5,0,7);g.fill();});g.restore();
  g.restore();}
// crowd(g, x0, x1, yНоги, n, t, {s, kids 0..1, old 0..1, pants 0..1, ages:['adult','kid',..], all:{общие опции}, each:i=>({опции i-го}), seed, depth})
// несколько разных человечков рядом: разные кожа, волосы, одежда, чередование глубины, без слияния (ставь шаг >= 110*s)
const SKINS=[C.skin,C.skin2,C.skin3],HAIRS=[C.hair,C.hairDk,C.hairRed,'#C9A06A'],CLOS=[C.sage,C.pink,C.blue,C.mustard,C.lilac,'#C98B6B',C.green,C.beige,'#7F93A8'];
function crowd(g,x0,x1,y,n,t,o={}){const sd=o.seed||7,P=[];for(let i=0;i<n;i++){const r=k=>hn(sd*31+i*7+k);
  const age=o.ages?o.ages[i%o.ages.length]:(r(1)<(o.kids||0)?'kid':r(2)<(o.old||0)?'old':'adult'),pn=r(3)<(o.pants==null?.45:o.pants),cl=CLOS[(sd+i*4)%CLOS.length];
  P.push({x:n>1?lerp(x0,x1,i/(n-1)):(x0+x1)/2,y:y+(i%2?-12:8)*(o.depth==null?1:o.depth),q:{age,outfit:pn?'pants':'dress',skin:SKINS[(sd+i)%3],hairC:age==='old'?C.grey:HAIRS[(sd+i*2)%4],
    hair:['cap','bun','short','curly','long'][(sd+i*3)%5],dress:cl,top:cl,pants:['#6F7C8C','#7A6656','#5E6B5A'][(i+sd)%3],pat:i%3===1?'dots':null,flip:i%2===1,seed:sd+i*3,t,...(o.all||{}),...(o.each?o.each(i):{})}});}
  P.sort((a,b)=>a.y-b.y).forEach(p=>person(g,p.x,p.y,o.s||1,p.q));}

// ---------- сквозной герой: светлячок ----------
// firefly(g, x, y, s, t, {a, glow}) - тёплый огонёк с крылышками; trail(g, pts, a) - тонкий след-нитка за ним
let FFG=null;
function firefly(g,x,y,s,t,o={}){if(s<=.01)return;const a=o.a==null?1:o.a,gl=o.glow==null?1:o.glow,pul=.85+.15*Math.sin(t*5);
  if(!FFG){const[c,h]=mk(300,300);h.globalCompositeOperation='lighter';h.globalAlpha=.9;h.drawImage(glowImg('warm'),0,0,300,300);h.globalAlpha=1;h.drawImage(glowImg('white'),104,104,92,92);FFG=c;}
  {const R=150*s*pul*gl;g.save();g.globalCompositeOperation='lighter';g.globalAlpha=Math.min(1,a*(gl>.99?1:(gl+1)/2));g.drawImage(FFG,x-R,y+4*s-R,R*2,R*2);g.restore();}
  g.save();g.translate(x,y);g.scale(s,s);g.globalAlpha=a;const fl=Math.abs(Math.sin(t*26));
  g.fillStyle='rgba(255,255,250,.55)';g.strokeStyle='rgba(110,95,80,.55)';g.lineWidth=1.4;
  [-1,1].forEach(k=>{g.save();g.rotate(k*(.5+fl*.5));g.beginPath();g.ellipse(k*12,-12,13,7,k*.4,0,7);g.fill();g.stroke();g.restore();});
  g.beginPath();g.ellipse(0,-4,7,9,0,0,7);g.fillStyle=col('#6B5243');g.fill();
  g.beginPath();g.ellipse(0,8,8,10,0,0,7);g.fillStyle='#FFF2BE';g.fill();
  g.strokeStyle=col('#6B5243');g.lineWidth=1.6;g.beginPath();g.moveTo(-3,-11);g.quadraticCurveTo(-6,-20,-10,-22);g.moveTo(3,-11);g.quadraticCurveTo(6,-20,10,-22);g.stroke();
  g.restore();}
function trail(g,pts,a=1,col_='255,244,214'){if(pts.length<2||a<=.01)return;g.save();g.lineCap='round';
  for(let i=1;i<pts.length;i++){g.globalAlpha=a*(1-i/pts.length)*.8;g.strokeStyle=`rgb(${col_})`;g.lineWidth=2.6*(1-i/pts.length)+.6;
    g.beginPath();g.moveTo(pts[i-1][0],pts[i-1][1]);g.lineTo(pts[i][0],pts[i][1]);g.stroke();}g.restore();}

// ---------- кэш спрайтов статичных предметов (с учётом ночи light) ----------
const SPC={};
function spriteOf(key,w,h,ax,ay,fn){const k=key+'|'+Math.round(LIGHT*8);let sp=SPC[k];
  if(!sp){const S=1.6,[c,q]=mk(Math.ceil(w*S),Math.ceil(h*S));q.scale(S,S);q.translate(ax,ay);fn(q);sp=SPC[k]={c,w,h,ax,ay};}return sp;}
function blitS(g,sp,x,y){g.drawImage(sp.c,x-sp.ax,y-sp.ay,sp.w,sp.h);}
// ---------- предметы ----------
function treeV(g,x,y,s,o={}){g.save();g.translate(x,y);g.scale(s,s);g.lineJoin='round';g.lineCap='round';
  if(o.kind==='oak'){g.beginPath();g.moveTo(-16,0);g.quadraticCurveTo(-10,-60,-14,-120);g.lineTo(14,-120);g.quadraticCurveTo(10,-60,18,0);g.closePath();sf(g,'#80634E',2.4);
    g.beginPath();g.moveTo(-6,-100);g.lineTo(-50,-150);g.moveTo(6,-104);g.lineTo(46,-156);g.lineWidth=12;g.strokeStyle=col(C.ink);g.stroke();g.lineWidth=7.5;g.strokeStyle=col('#80634E');g.stroke();
    g.beginPath();[[-80,-170,52],[-30,-215,62],[40,-210,60],[86,-165,48],[0,-160,60],[-50,-130,40],[54,-128,40]].forEach(([cx,cy,r])=>{g.moveTo(cx+r,cy);g.arc(cx,cy,r,0,7);});sf(g,o.c||'#7E9A68',2.4);
    g.beginPath();[[-80,-170,52],[-30,-215,62],[40,-210,60],[86,-165,48],[0,-160,60],[-50,-130,40],[54,-128,40]].forEach(([cx,cy,r])=>{g.moveTo(cx+r-6,cy);g.arc(cx,cy,r-6,0,7);});g.fillStyle=col(o.c||'#7E9A68');g.fill();
    g.save();g.clip();g.globalAlpha=.16;g.fillStyle=hatchPat(g);g.fillRect(-140,-280,280,200);g.restore();}
  else if(o.kind==='pine'){g.beginPath();g.rect(-8,-40,16,40);sf(g,'#80634E',2.2);for(let i=0;i<4;i++){const yb=-30-i*48,w=78-i*15;g.beginPath();g.moveTo(-w,yb);g.lineTo(0,yb-90);g.lineTo(w,yb);g.quadraticCurveTo(0,yb+12,-w,yb);g.closePath();sf(g,o.c||'#6E8C68',2.4);}}
  else if(o.kind==='round'){g.beginPath();g.moveTo(0,0);g.lineTo(0,-120);g.lineWidth=9;g.strokeStyle=col(C.ink);g.stroke();g.lineWidth=5.5;g.strokeStyle=col('#7E6250');g.stroke();
    g.beginPath();g.ellipse(0,-160,46,62,0,0,7);sf(g,o.c||'#7E9670',2.2);g.fillStyle=col('rgba(40,60,40,.25)');for(let i=0;i<14;i++){g.beginPath();g.arc((hn(i)-.5)*60,-160+(hn(i+3)-.5)*90,2.5,0,7);g.fill();}}
  else{g.beginPath();g.moveTo(-6,0);g.lineTo(-4,-70);g.lineTo(-30,-130);g.moveTo(-4,-70);g.lineTo(18,-128);g.lineWidth=17;g.strokeStyle=col(C.ink);g.stroke();g.lineWidth=12;g.strokeStyle=col('#80634E');g.stroke();
    g.beginPath();g.moveTo(-110,-128);g.bezierCurveTo(-120,-160,-60,-178,-10,-172);g.bezierCurveTo(30,-186,90,-176,104,-150);g.bezierCurveTo(116,-128,96,-122,60,-124);g.lineTo(-90,-120);g.quadraticCurveTo(-112,-118,-110,-128);
    sf(g,o.c||'#86A178',2.4);g.save();g.clip();g.globalAlpha=.18;g.fillStyle=hatchPat(g);g.fill();g.restore();}
  g.restore();}
function tree(g,x,y,s,o={}){const k=o.kind||'',D={round:[130,245,65,235],oak:[300,300,150,290],pine:[180,300,90,290]}[k]||[270,205,135,195];const sp=spriteOf('tree'+k+(o.c||'')+s,D[0]*s,D[1]*s,D[2]*s,D[3]*s,q=>treeV(q,0,0,s,o));blitS(g,sp,x,y);}
function hut(g,x,y,w,h,o={}){const rx=w/2+w*.16+8,top=h+h*1.15+12;const sp=spriteOf('hut'+w+'x'+h+(o.wall||'')+(o.roof||''),rx*2,top+8,rx,top,q=>hutV(q,0,0,w,h,{...o,lit:0}));blitS(g,sp,x,y);
  if(o.lit){g.save();g.beginPath();g.rect(x+w*.24,y-h*.72,w*.16,h*.24);g.fillStyle='#F2D58E';g.fill();g.strokeStyle=col(C.ink);g.lineWidth=2;g.stroke();g.restore();glow(g,x+w*.32,y-h*.6,w*.5,o.lit,'warm','lighter');}}
function house(g,x,y,w,h,o={}){const sp=spriteOf('house'+w+'x'+h+(o.wall||'')+(o.roof||''),w+48,h+w*.5+20,w/2+24,h+w*.5+12,q=>houseV(q,0,0,w,h,{...o,lit:0}));blitS(g,sp,x,y);
  if(o.lit)glow(g,x,y-h-w*.16,w*.6,o.lit,'warm','lighter');}
function soil(g,x,y,rx,ry){const sp=spriteOf('soil'+rx+'x'+ry,rx*2+8,ry*2+8,rx+4,ry+4,q=>soilV(q,0,0,rx,ry));blitS(g,sp,x,y);}
// хижина: x центр, y земля; o.lit - окно светится (ночью)
function hutV(g,x,y,w,h,o={}){g.save();g.lineJoin='round';g.beginPath();g.rect(x-w/2,y-h,w,h);sf(g,o.wall||C.wall);
  g.beginPath();g.moveTo(x-w*.14,y);g.lineTo(x-w*.14,y-h*.5);g.arc(x,y-h*.5,w*.14,Math.PI,0);g.lineTo(x+w*.14,y);g.closePath();sf(g,C.door,2);
  if(o.win!==false){g.beginPath();g.rect(x+w*.24,y-h*.72,w*.16,h*.24);sf(g,o.lit?'#F2D58E':'#8A9DA6',2);if(o.lit)glow(g,x+w*.32,y-h*.6,w*.5,o.lit,'warm','lighter');}
  const rx=w/2+w*.16,rt=y-h-h*1.15;g.beginPath();g.moveTo(x-rx,y-h+h*.12);g.lineTo(x,rt);g.lineTo(x+rx,y-h+h*.12);g.quadraticCurveTo(x,y-h+h*.28,x-rx,y-h+h*.12);g.closePath();
  sf(g,o.roof||C.thatch);g.save();g.clip();g.strokeStyle=col('rgba(140,105,60,.45)');g.lineWidth=1.5;for(let i=-9;i<=9;i++){g.beginPath();g.moveTo(x,rt);g.lineTo(x+i*rx/8,y);g.stroke();}g.restore();
  g.beginPath();g.moveTo(x-rx,y-h+h*.12);g.lineTo(x,rt);g.lineTo(x+rx,y-h+h*.12);g.quadraticCurveTo(x,y-h+h*.28,x-rx,y-h+h*.12);sf(g,null);g.restore();}
// домик со скатной крышей (утро, город)
function houseV(g,x,y,w,h,o={}){g.save();g.lineJoin='round';g.beginPath();g.rect(x-w/2,y-h,w,h);sf(g,o.wall||'#EBDDC3');
  g.beginPath();g.moveTo(x-w/2-16,y-h+4);g.lineTo(x,y-h-w*.5);g.lineTo(x+w/2+16,y-h+4);sf(g,null,7,o.roof||'#C98C88');g.beginPath();g.moveTo(x-w/2-16,y-h+4);g.lineTo(x,y-h-w*.5);g.lineTo(x+w/2+16,y-h+4);sf(g,null,LW);
  g.beginPath();g.moveTo(x-w/2,y-h);g.lineTo(x,y-h-w*.46);g.lineTo(x+w/2,y-h);g.closePath();sf(g,o.wall||'#EBDDC3',0);
  g.beginPath();g.arc(x,y-h-w*.16,w*.1,0,7);sf(g,'#9FB7C4',2);
  g.beginPath();g.rect(x-w*.18,y-h*.62,w*.36,h*.62);sf(g,C.door,2);g.beginPath();g.rect(x-w*.11,y-h*.54,w*.22,h*.54);sf(g,'#8B6A55',1.6);
  g.beginPath();g.arc(x+w*.07,y-h*.27,3,0,7);sf(g,'#E2C26E',0);if(o.lit){glow(g,x,y-h-w*.16,w*.6,o.lit,'warm','lighter');}g.restore();}
// пшеница: поле колосков field(g, x0, x1, yОснования, n, t, {h, depth, seed, wind, grow 0..1})
const EARS=[];
function earImg(k){if(EARS[k])return EARS[k];const S=2,[c,h]=mk(40*S,50*S),a=(k-2)*.09;h.scale(S,S);h.translate(20,25);h.beginPath();h.ellipse(0,0,7.5,17,a,0,7);
  h.fillStyle=C.wheat;h.fill();h.strokeStyle='#A88A48';h.lineWidth=1.6;h.stroke();return EARS[k]=c;}
// пшеница: поле колосков field(g, x0, x1, yОснования, n, t, {h, depth, seed, wind, grow 0..1}). Стебли одним контуром, колоски - готовые спрайты
function field(g,x0,x1,yb,n,t,o={}){const hh=o.h||180,dep=o.depth||50,sd=o.seed||1,gr=o.grow==null?1:o.grow;const P=[];
  for(let i=0;i<n;i++){const u=(i+hn(sd+i)*.9)/n,x=x0+(x1-x0)*u,y=yb+(hn(i*7+sd)-.5)*dep,h=hh*(.78+hn(i*3+sd)*.35)*gr,sw=Math.sin(t*1.5+x*.011)*9*(o.wind==null?1:o.wind)+(o.push?o.push(x):0);P.push([x,y,h,sw]);}
  P.sort((a,b)=>a[1]-b[1]);g.save();g.lineCap='round';g.beginPath();P.forEach(([x,y,h,sw])=>{g.moveTo(x,y);g.quadraticCurveTo(x+sw*.3,y-h*.55,x+sw,y-h);});
  g.strokeStyle=col(C.wheatDk);g.lineWidth=2.6;g.stroke();
  if(LIGHT>.02){g.beginPath();P.forEach(([x,y,h,sw])=>{if(h<20)return;const ex=x+sw*1.05,ey=y-h-14;g.moveTo(ex+7,ey);g.ellipse(ex,ey,7.5,17,sw*.02,0,7);});g.fillStyle=col(C.wheat);g.fill();g.strokeStyle=col('#A88A48');g.lineWidth=1.6;g.stroke();}
  else P.forEach(([x,y,h,sw])=>{if(h<20)return;const k=clamp(Math.round(sw*.02/.09)+2,0,4);g.drawImage(earImg(k),x+sw*1.05-20,y-h-14-25,40,50);});
  g.restore();}
// пашня: овал земли с бороздами
function soilV(g,x,y,rx,ry){g.save();g.beginPath();g.ellipse(x,y,rx,ry,0,0,7);sf(g,C.soil,2.4);g.clip();g.strokeStyle=col('rgba(90,62,45,.35)');g.lineWidth=1.6;
  for(let i=-3;i<=3;i++){g.beginPath();g.moveTo(x-rx*.85,y+i*ry*.24);g.lineTo(x+rx*.85,y+i*ry*.24);g.stroke();}g.restore();}
function tongue(g,x,y,w,h,b){g.moveTo(x-w/2,y);g.bezierCurveTo(x-w*.6,y-h*.45,x+b-w*.25,y-h*.7,x+b,y-h);g.bezierCurveTo(x+b+w*.1,y-h*.6,x+w*.6,y-h*.4,x+w/2,y);g.closePath();}
// костёр/пламя: x,y низ огня, s масштаб (s=1 высота ~260)
function flames(g,x,y,s,t){if(s<=.01)return;g.save();g.translate(x,y);g.scale(s,s);g.lineJoin='round';
  const L=[[C.fireO,[[-62,70,170,-14],[-30,80,235,-8],[8,84,262,6],[44,74,200,12],[70,56,140,16]]],[C.fireY,[[-34,62,160,-6],[4,70,200,4],[38,58,150,10]]],[C.fireC,[[-10,46,110,2],[16,40,92,6]]]];
  L.forEach(([c,ts],li)=>{g.beginPath();ts.forEach(([dx,w,h,b],i)=>{const f=1+.09*Math.sin(t*(9+li*2)+i*2.1+dx)+.05*Math.sin(t*17+i);tongue(g,dx,0,w,h*f,b+Math.sin(t*6+i+li)*6);});
    g.fillStyle=c;g.fill();if(li===0){g.strokeStyle='rgba(170,80,55,.6)';g.lineWidth=2.2;g.stroke();}});g.restore();}
function fire(g,x,y,s,t,o={}){const a=o.a==null?1:o.a;glow(g,x,y-90*s,520*s,.55*a,'fire','lighter');glow(g,x,y+10*s,360*s,.35*a,'warm','lighter');
  g.save();g.lineJoin='round';[[-1,.22],[1,-.22]].forEach(([k,r])=>{g.save();g.translate(x,y-8*s);g.rotate(r);g.beginPath();g.roundRect(-110*s,-11*s,220*s,22*s,8*s);sf(g,'#7A5340',2);g.restore();});
  for(let i=0;i<11;i++){const an=Math.PI*(.05+i*.09),sx=x+Math.cos(an)*150*s,sy=y+8*s+Math.sin(an)*26*s*(i%2?1:.6);g.beginPath();g.ellipse(sx,sy,20*s,13*s,0,0,7);sf(g,C.stone,1.6);}
  g.restore();flames(g,x,y-6*s,s*a,t);}
// искры, летящие вверх
function sparks(g,x,y,t,o={}){const n=o.n||26,ht=o.h||520,a=o.a==null?1:o.a;g.save();g.globalCompositeOperation='lighter';
  for(let i=0;i<n;i++){const per=1.6+hn(i)*1.6,u=((t+hn(i*3)*per)%per)/per,yy=y-u*ht*(.6+hn(i+5)*.6),xx=x+Math.sin(u*7+i)*20*u+(hn(i*9)-.5)*60*u;
    g.globalAlpha=a*(1-u)*(.6+.4*Math.sin(t*20+i));g.fillStyle=i%3?'#FFE2A0':'#FFC27A';g.beginPath();g.arc(xx,yy,2+hn(i+1)*2.4,0,7);g.fill();}g.restore();}
// глиняная печь-купол: o.fire 0..1 (огонь в устье), o.smoke 0..1
function ovenBody(g){const w=250,h=205;g.lineJoin='round';
  for(let i=0;i<7;i++){g.beginPath();g.ellipse(-w*.5+i*w/6,-2,22,12,0,0,7);sf(g,C.stone,1.6);}
  g.beginPath();g.moveTo(-w/2,-6);g.bezierCurveTo(-w/2,-h*1.33,w/2,-h*1.33,w/2,-6);g.closePath();
  const gr=g.createLinearGradient(-w/2,0,w/2,0);gr.addColorStop(0,col(mix(C.clay,'#FFF0DA',.15)));gr.addColorStop(1,col(mix(C.clay,'#4A2E22',.12)));g.fillStyle=gr;g.fill();
  g.save();g.clip();g.globalAlpha=.16;g.fillStyle=hatchPat(g);g.fillRect(-w,-h*1.4,w*2,h*1.5);g.globalAlpha=1;g.strokeStyle=col('rgba(110,70,50,.45)');g.lineWidth=1.8;
  [[-.62,-.3],[-.2,-.55],[.25,-.42],[.55,-.22],[-.1,-.82],[.28,-.75]].forEach(([u,v])=>{g.beginPath();g.arc(u*w*.5,v*h,18,Math.PI*1.1,Math.PI*1.9);g.stroke();});g.restore();
  g.beginPath();g.moveTo(-w/2,-6);g.bezierCurveTo(-w/2,-h*1.33,w/2,-h*1.33,w/2,-6);g.closePath();sf(g,null,LW);
  g.beginPath();g.ellipse(0,-h*.99,22,8,0,0,7);sf(g,C.clayDk,2);ovenMouth(g);sf(g,'#3A2A24',LW);ovenRim(g);}
function ovenMouth(g){const ow=95,oh=102;g.beginPath();g.moveTo(-ow/2,-6);g.lineTo(-ow/2,-oh+ow/2);g.arc(0,-oh+ow/2,ow/2,Math.PI,0);g.lineTo(ow/2,-6);g.closePath();}
function ovenRim(g){const ow=95,oh=102;g.beginPath();g.moveTo(-ow/2-10,-6);g.lineTo(-ow/2-10,-oh+ow/2);g.arc(0,-oh+ow/2,ow/2+10,Math.PI,0);g.lineTo(ow/2+10,-6);g.strokeStyle=col('rgba(90,55,40,.6)');g.lineWidth=3;g.stroke();}
// глиняная печь-купол: o.fire 0..1 (огонь в устье), o.smoke 0..1. Корпус из кэша, огонь живой
function oven(g,x,y,s,t,o={}){g.save();g.translate(x,y);g.scale(s,s);blitS(g,spriteOf('oven',300,320,150,300,ovenBody),0,0);
  const fi=o.fire||0;if(fi>0){g.save();ovenMouth(g);g.clip();glow(g,0,-30,140,fi,'fire','lighter');flames(g,0,-6,.32*fi,t);g.restore();ovenRim(g);
    g.restore();glow(g,x,y-50*s,230*s*fi,.5*fi,'fire','lighter');g.save();g.translate(x,y);g.scale(s,s);}
  const sk=o.smoke||0;if(sk>0)smoke(g,0,-205*1.02,t,sk);g.restore();}
// дымок/пар: карандашные завитки
function smoke(g,x,y,t,a=1,n=3,len=150){g.save();g.lineCap='round';for(let i=0;i<n;i++){const u=((t*.45+i/n)%1);g.globalAlpha=a*Math.sin(u*Math.PI)*.7;g.strokeStyle='#F4EEE2';g.lineWidth=4;
  g.beginPath();for(let j=0;j<=12;j++){const v=j/12,yy=y-u*len*.6-v*len*.5,xx=x+(i-1)*12+Math.sin(v*6+t*2+i*2)*10*(.4+v);j?g.lineTo(xx,yy):g.moveTo(xx,yy);}g.stroke();}g.restore();}
// каравай: x центр, y низ, s масштаб (s=1 ширина ~220); o.steam 0..1
function bread(g,x,y,s,t=0,o={}){if(s<=.01)return;g.save();g.translate(x,y);g.scale(s,s);g.lineJoin='round';const w=220,h=110;
  g.beginPath();g.moveTo(-w/2,0);g.bezierCurveTo(-w/2-6,-h*1.25,w/2+6,-h*1.25,w/2,0);g.closePath();sf(g,C.crust);
  g.beginPath();g.moveTo(-w*.38,-h*.35);g.bezierCurveTo(-w*.36,-h*1.05,w*.36,-h*1.05,w*.38,-h*.35);g.bezierCurveTo(w*.2,-h*.5,-w*.2,-h*.5,-w*.38,-h*.35);g.fillStyle=col(C.crustLt);g.fill();
  g.strokeStyle=col('#F3DDA8');g.lineWidth=5;g.lineCap='round';[-.5,0,.5].forEach(k=>{g.beginPath();g.moveTo(k*w*.42-14,-h*.42);g.quadraticCurveTo(k*w*.42,-h*.78,k*w*.42+16,-h*.86);g.stroke();});
  g.beginPath();g.moveTo(-w/2,0);g.bezierCurveTo(-w/2-6,-h*1.25,w/2+6,-h*1.25,w/2,0);g.closePath();sf(g,null,LW);g.restore();
  if(o.steam)smoke(g,x,y-h*s*.95,t,o.steam,3,170*s);}
function table(g,x,y,w,o={}){g.save();g.lineJoin='round';[-1,1].forEach(k=>{g.beginPath();g.rect(x+k*(w/2-40)-7,y,14,100);sf(g,'#8C6A4D',2);});
  g.beginPath();g.roundRect(x-w/2,y-18,w,26,6);sf(g,C.woodProp);if(o.cloth){g.beginPath();g.moveTo(x-w*.32,y-18);g.lineTo(x+w*.32,y-18);g.lineTo(x+w*.28,y+40);g.quadraticCurveTo(x,y+30,x-w*.28,y+40);g.closePath();sf(g,o.cloth,2);
    g.save();g.clip();g.fillStyle=col('rgba(190,90,80,.35)');for(let i=-6;i<7;i++)g.fillRect(x+i*28,y-20,10,70);g.restore();}g.restore();}
function sack(g,x,y,s,o={}){g.save();g.translate(x,y);g.scale(s,s);g.lineJoin='round';g.beginPath();g.moveTo(-50,0);g.bezierCurveTo(-70,-60,-44,-112,-22,-120);g.lineTo(22,-120);g.bezierCurveTo(44,-112,70,-60,50,0);g.closePath();
  sf(g,o.c||'#E7DDC6');g.beginPath();g.moveTo(-22,-120);g.lineTo(-30,-140);g.lineTo(-6,-128);g.lineTo(6,-142);g.lineTo(22,-120);sf(g,o.c||'#E7DDC6',2);
  g.strokeStyle=col('#9B7A57');g.lineWidth=4;g.beginPath();g.moveTo(-24,-118);g.lineTo(24,-118);g.stroke();g.restore();}
function basket(g,x,y,s,o={}){g.save();g.translate(x,y);g.scale(s,s);g.lineJoin='round';if(o.fill){g.save();g.beginPath();g.rect(-60,-80,120,46);g.clip();field(g,-40,40,-40,7,o.t||0,{h:20,depth:6,wind:.3});g.restore();}
  g.beginPath();g.moveTo(-48,-44);g.lineTo(-36,0);g.lineTo(36,0);g.lineTo(48,-44);g.closePath();sf(g,'#C9A26B');g.save();g.clip();g.strokeStyle=col('rgba(120,80,40,.5)');g.lineWidth=2;
  for(let i=-6;i<7;i++){g.beginPath();g.moveTo(i*10,-50);g.lineTo(i*10+12,4);g.stroke();}for(let j=1;j<4;j++){g.beginPath();g.moveTo(-60,-j*11);g.lineTo(60,-j*11);g.stroke();}g.restore();
  g.beginPath();g.moveTo(-40,-44);g.quadraticCurveTo(0,-110,40,-44);g.lineWidth=5;g.strokeStyle=col(C.ink);g.stroke();g.lineWidth=2.5;g.strokeStyle=col('#C9A26B');g.stroke();g.restore();}
function windmill(g,x,y,s,t){g.save();g.translate(x,y);g.scale(s,s);g.lineJoin='round';g.beginPath();g.moveTo(-18,0);g.lineTo(-10,-110);g.lineTo(10,-110);g.lineTo(18,0);g.closePath();sf(g,'#EDE4D2',2);
  g.translate(0,-104);g.rotate(t*.8);for(let i=0;i<4;i++){g.rotate(Math.PI/2);g.beginPath();g.moveTo(0,0);g.lineTo(-6,-14);g.lineTo(-12,-80);g.lineTo(10,-80);g.closePath();sf(g,'#F4EEE2',1.8);}g.restore();}

// ---------- карандашные наброски в небе ----------
const PEN={c:'rgba(85,70,70,.55)',lw:1.8};
// отрисовка ломаной по прогрессу p (0..1); dash - пунктир
function pline(g,pts,p=1,o={}){if(p<=0||pts.length<2)return;let L=0;const d=[0];for(let i=1;i<pts.length;i++){L+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);d.push(L);}
  const lim=L*clamp(p);g.save();g.strokeStyle=o.c||PEN.c;g.lineWidth=o.lw||PEN.lw;g.lineCap='round';g.lineJoin='round';if(o.dash)g.setLineDash(o.dash);if(o.a!=null)g.globalAlpha=o.a;
  g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++){if(d[i]<=lim)g.lineTo(pts[i][0],pts[i][1]);else{const u=(lim-d[i-1])/(d[i]-d[i-1]);g.lineTo(lerp(pts[i-1][0],pts[i][0],u),lerp(pts[i-1][1],pts[i][1],u));break;}}
  g.stroke();g.restore();}
const circPts=(x,y,r,a0=-Math.PI/2,a1=Math.PI*1.5,n=64,wob=0)=>{const P=[];for(let i=0;i<=n;i++){const a=lerp(a0,a1,i/n),rr=r*(1+wob*Math.sin(a*3+1.3));P.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr]);}return P;};
function pcircle(g,x,y,r,p,o={}){pline(g,circPts(x,y,r,-Math.PI/2,Math.PI*1.5,Math.max(24,r/4|0),o.wob||0),p,o);}
function pgear(g,x,y,r,p,rot=0,o={}){const n=o.n||10,P=[];for(let i=0;i<=n*4;i++){const a=rot+i/(n*4)*Math.PI*2,rr=(i%4<2)?r:r*.8;P.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr]);}
  pline(g,P,p,o);pcircle(g,x,y,r*.28,p,o);if(o.fill&&p>=1){g.save();g.globalAlpha=o.fill;g.beginPath();P.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.fillStyle=o.fc||'#B9B2A8';g.fill();g.restore();}}
function pcompass(g,x,y,r,p,o={}){pcircle(g,x,y,r*.62,p,o);pcircle(g,x,y,r*.5,p,{...o,dash:[3,6]});const P=[];for(let i=0;i<8;i++){const a=i/8*Math.PI*2-Math.PI/2,rr=i%2?r*.45:r;P.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr]);}P.push(P[0]);pline(g,P,p,o);}
function pdots(g,pts,p,o={}){pline(g,pts,p,{...o,dash:[5,7]});g.save();g.fillStyle=o.c||PEN.c;pts.forEach((q,i)=>{if(i/(pts.length-1)<=p+.01){g.save();g.translate(q[0],q[1]);g.rotate(.785);g.fillRect(-4,-4,8,8);g.restore();}});g.restore();}
// блок набросков-чертежей в духе «учёные смотрят в небо» вокруг (x,y), p - прогресс дорисовки, t - вращение шестерёнок
function blueprint(g,x,y,s,p,t=0,o={}){g.save();g.translate(x,y);g.scale(s,s);const q=i=>clamp(p*1.6-i*.15);
  pline(g,circPts(0,140,330,-Math.PI*.92,-Math.PI*.08,60),q(0),{dash:[4,8]});for(let i=0;i<9;i++){const a=-Math.PI*.9+i*Math.PI*.1;if(q(0)*9>i)pline(g,[[Math.cos(a)*320,140+Math.sin(a)*320],[Math.cos(a)*342,140+Math.sin(a)*342]],1);}
  pcircle(g,-60,-40,82,q(1));pcircle(g,30,-40,82,q(1.4));pline(g,[[-15,-110],[-75,0],[45,0],[-15,-110]],q(2));
  pcompass(g,190,90,90,q(3));pgear(g,-230,70,58,q(2.5),t*.4,{fill:o.gears?.55:0});pgear(g,-160,150,34,q(3),-t*.7,{n:8,fill:o.gears?.55:0});
  pdots(g,[[150,-160],[210,-120],[270,-150],[330,-90],[300,-40]],q(4));g.restore();}

// ---------- текст: книжная антиква ----------
function setF(g,size,it=true,wt=400){g.font=`${it?'italic ':''}${wt} ${Math.round(size)}px ${F.serif}`;}
// fit: подбирает кегль, чтобы текст влез в maxW (не меньше min); при нехватке делит на 2 строки
function fit(g,text,size,maxW,min=56,it=true){let s=size;setF(g,s,it);while(g.measureText(text).width>maxW&&s>min){s-=2;setF(g,s,it);}
  if(g.measureText(text).width<=maxW)return{size:s,lines:[text]};const ws=text.split(' ');let best=null;
  for(let k=1;k<ws.length;k++){const a=ws.slice(0,k).join(' '),b=ws.slice(k).join(' '),m=Math.max(g.measureText(a).width,g.measureText(b).width);if(!best||m<best.m)best={m,lines:[a,b]};}
  while(best&&best.m>maxW&&s>40){s-=2;setF(g,s,it);best.m=Math.max(...best.lines.map(l=>g.measureText(l).width));}return{size:s,lines:best?best.lines:[text]};}
// рваная бумажная плашка
const PLC={};
function plate(g,x,y,w,h,seed=1,rot=-.012){w=Math.round(w);h=Math.round(h);const key=w+'x'+h+'s'+seed;let c=PLC[key];
  if(!c){const m=20,[cc,q]=mk(w+m*2,h+m*2);q.translate(w/2+m,h/2+m);const P=[],r=rng(seed);const st=18;
    for(let u=-w/2;u<=w/2;u+=st)P.push([u,-h/2+(r()-.5)*5]);for(let v=-h/2;v<=h/2;v+=st)P.push([w/2+(r()-.5)*6,v]);for(let u=w/2;u>=-w/2;u-=st)P.push([u,h/2+(r()-.5)*5]);for(let v=h/2;v>=-h/2;v-=st)P.push([-w/2+(r()-.5)*6,v]);
    const pth=(dx,dy)=>{q.beginPath();P.forEach((p,i)=>i?q.lineTo(p[0]+dx,p[1]+dy):q.moveTo(p[0]+dx,p[1]+dy));q.closePath();};
    pth(5,8);q.fillStyle='rgba(50,30,20,.16)';q.fill();pth(2,3);q.fillStyle='rgba(50,30,20,.1)';q.fill();pth(0,0);q.fillStyle='#F2EBD9';q.fill();
    q.save();q.clip();blot(q,-w*.3,-h*.2,w*.5,'190,160,120',.08);blot(q,w*.3,h*.2,w*.4,'255,255,255',.2);grain(q,w,h,w*h/400,seed);q.restore();q.strokeStyle='rgba(120,95,70,.35)';q.lineWidth=1.4;q.stroke();c=PLC[key]=cc;}
  g.save();g.translate(x,y);g.rotate(rot);g.drawImage(c,-c.width/2,-c.height/2);g.restore();}
// волнистое карандашное подчёркивание
function squiggle(g,x0,x1,y,p,c=C.terra,lw=4){if(p<=0)return;const P=[];for(let x=x0;x<=x1;x+=8)P.push([x,y+Math.sin((x-x0)*.06)*4]);pline(g,P,p,{c,lw});}
// caption(g, t, 'Зерно в поле', t0, t1, {key: индекс слова, y, size, plate}) - подпись по словам, ключевое слово терракотой с подчёркиванием
const CPC={};
// caption(g, t, 'Зерно в поле', t0, t1, {key: индекс слова, y, size, plate}) - подпись по словам, ключевое слово терракотой с подчёркиванием.
// Пока подпись целиком на месте, рисуется из кэша (один спрайт)
function caption(g,t,text,t0,t1,o={}){if(t<t0||t>t1)return;const n=text.split(' ').length,st=Math.min(.2,.55/n),tf=Math.max(t0+.35,t0+.12+(n-1)*st+(o.key!=null&&o.key>=0?.7:.3));
  if(t>=tf&&t<=t1-.32){const y=o.y||270,k=text+'|'+(o.size||82)+'|'+o.key+'|'+o.plate+'|'+o.rot;let c=CPC[k];
    if(!c){const[cc,h]=mk(W,420);captionLive(h,50,text,0,100,{...o,y:210});c=CPC[k]=cc;}g.drawImage(c,0,y-210);return;}
  captionLive(g,t,text,t0,t1,o);}
function captionLive(g,t,text,t0,t1,o={}){if(t<t0||t>t1)return;const pad=40,y=o.y||270,size0=o.size||82,ws=text.split(' ');
  const f=fit(g,text,size0,X1-X0-pad*2,56);const lh=f.size*1.18,lines=f.lines;setF(g,f.size);
  const aIn=sm((t-t0)/.35),aOut=1-sm((t-(t1-.32))/.32),A=aIn*aOut;if(A<=.01)return;
  const tw=Math.max(...lines.map(l=>g.measureText(l).width)),pw=tw+pad*2,ph=lines.length*lh+f.size*.62;
  g.save();g.globalAlpha=A;const lift=(1-aIn)*16-(1-aOut)*14;
  if(o.plate!==false)plate(g,W/2,y+lift,pw,ph,text.length*7+3,o.rot==null?-.012:o.rot);
  setF(g,f.size);g.textBaseline='alphabetic';g.textAlign='left';const st=Math.min(.2,.55/ws.length);let wi=0;
  lines.forEach((ln,li)=>{const lw=g.measureText(ln).width;let cx=W/2-lw/2;const by=y+lift-(lines.length-1)*lh/2+(li)*lh+f.size*.34;
    ln.split(' ').forEach(w=>{const ww=g.measureText(w).width,wt=t0+.12+wi*st,u=sm((t-wt)/.3),isK=o.key===wi;
      if(u>0){g.save();g.globalAlpha=A*u;g.fillStyle=isK?C.terra:'#4A3B30';g.fillText(w,cx,by+(1-u)*12);g.restore();
        if(isK)squiggle(g,cx-4,cx+ww+4,by+f.size*.2,sm((t-wt-.25)/.45),C.terra,Math.max(3,f.size*.05));}
      cx+=ww+g.measureText(' ').width;wi++;});});
  g.restore();}
// рукописная надпись на странице: проявляется слева направо, как будто пишут; возвращает x кончика пера
function pageText(g,text,x,y,size,p,o={}){setF(g,size,o.it!==false,o.wt||400);const f=fit(g,text,size,o.maxW||(X1-X0-80),48,o.it!==false);setF(g,f.size,o.it!==false,o.wt||400);
  const w=g.measureText(f.lines[0]).width,x0=x-w/2;g.save();g.beginPath();g.rect(x0-20,y-f.size*1.2,(w+40)*clamp(p),f.size*1.8);g.clip();g.fillStyle=o.c||'#4A3B30';g.textAlign='left';g.textBaseline='alphabetic';
  g.fillText(f.lines[0],x0,y);g.restore();return{x:x0+w*clamp(p),w,size:f.size};}

// ---------- книга на столе ----------
let WD=null,PGT=null;
function woodTex(){if(WD)return WD;const[c,h]=mk(W,H);const gr=h.createLinearGradient(0,0,W,H);gr.addColorStop(0,'#715440');gr.addColorStop(1,'#573F2E');h.fillStyle=gr;h.fillRect(0,0,W,H);
  const r=rng(12);for(let i=0;i<160;i++){const y=r()*H,a=.03+r()*.06;h.strokeStyle=r()>.5?`rgba(255,220,180,${a})`:`rgba(30,18,10,${a})`;h.lineWidth=1+r()*3;h.beginPath();h.moveTo(0,y);
    for(let x=0;x<=W;x+=60)h.lineTo(x,y+Math.sin(x*.004+i)*8);h.stroke();}grain(h,W,H,6000,4,1.4);vigGrad(h,.8);return WD=c;}
const PG={x:120,y:200,w:880,h:1360};
function pageTex(){if(PGT)return PGT;const[c,h]=mk(PG.w,PG.h);h.fillStyle=C.page;h.fillRect(0,0,PG.w,PG.h);const r=rng(5);
  for(let i=0;i<40;i++)blot(h,r()*PG.w,r()*PG.h,80+r()*220,r()>.5?'255,252,242':'150,125,95',.07);grain(h,PG.w,PG.h,7000,8);
  const s=h.createLinearGradient(0,0,90,0);s.addColorStop(0,'rgba(90,70,50,.22)');s.addColorStop(1,'rgba(90,70,50,0)');h.fillStyle=s;h.fillRect(0,0,90,PG.h);return PGT=c;}
// карандаш: кончик грифеля в (x,y), направление ang (рад, куда смотрит кончик), длина len
function pencil(g,x,y,ang,len=430){g.save();g.translate(x,y);g.rotate(ang+Math.PI);g.lineJoin='round';const w=24;
  g.fillStyle='rgba(40,25,15,.25)';g.beginPath();g.roundRect(10,-w/2+12,len,w,4);g.fill();
  g.beginPath();g.moveTo(0,0);g.lineTo(56,-w/2);g.lineTo(56,w/2);g.closePath();g.fillStyle='#E6C9A0';g.fill();g.strokeStyle=C.ink;g.lineWidth=2;g.stroke();
  g.beginPath();g.moveTo(0,0);g.lineTo(16,-w*.15);g.lineTo(16,w*.15);g.closePath();g.fillStyle='#4B392A';g.fill();
  g.beginPath();g.rect(56,-w/2,len-120,w);g.fillStyle='#E2C46E';g.fill();g.fillStyle='#C9A44E';g.fillRect(56,-w/2+w*.33,len-120,2.5);g.fillRect(56,-w/2+w*.66,len-120,2.5);g.strokeStyle=C.ink;g.stroke();
  g.beginPath();g.rect(len-64,-w/2,26,w);g.fillStyle='#ABA79F';g.fill();g.stroke();g.strokeStyle='rgba(80,80,80,.5)';for(let i=1;i<4;i++){g.beginPath();g.moveTo(len-64+i*6.5,-w/2);g.lineTo(len-64+i*6.5,w/2);g.stroke();}
  g.beginPath();g.roundRect(len-38,-w/2,34,w,[0,6,6,0]);g.fillStyle='#DB9799';g.fill();g.strokeStyle=C.ink;g.stroke();g.restore();}
// book(g, {left: показывать ли край левой страницы}) - стол, раскрытая книга (правая страница вертикально), возвращает прямоугольник страницы PG
let BKC=null;
// book(g): стол и раскрытая книга (из кэша одним блитом), возвращает прямоугольник страницы PG
function book(g,o={}){if(!BKC){const[c,h]=mk(W,H);bookDraw(h);BKC=c;}g.drawImage(BKC,0,0);return PG;}
function bookDraw(g){g.drawImage(woodTex(),0,0);g.save();
  g.fillStyle='rgba(30,18,10,.38)';g.fillRect(PG.x-10+18,PG.y+22,PG.w+16,PG.h+12);g.fillStyle='#4A3627';g.fillRect(-20,PG.y-6,PG.x+PG.w+24,PG.h+22);
  g.fillStyle='#DCD2BE';g.fillRect(-20,PG.y,PG.x+PG.w+12,PG.h+10);g.strokeStyle='rgba(120,100,80,.4)';g.lineWidth=1.2;for(let i=1;i<4;i++){g.beginPath();g.moveTo(PG.x,PG.y+PG.h+i*2.5);g.lineTo(PG.x+PG.w+i*2.5,PG.y+PG.h+i*2.5);g.lineTo(PG.x+PG.w+i*2.5,PG.y);g.stroke();}
  const lg=g.createLinearGradient(0,0,PG.x,0);lg.addColorStop(0,'#E2DBC8');lg.addColorStop(1,'#C9BFA9');g.fillStyle=lg;g.fillRect(-20,PG.y,PG.x+20,PG.h);
  g.drawImage(pageTex(),PG.x,PG.y);g.strokeStyle='rgba(90,70,50,.35)';g.lineWidth=2;g.beginPath();g.moveTo(PG.x,PG.y);g.lineTo(PG.x,PG.y+PG.h);g.stroke();g.restore();return PG;}
// звёздочка-набросок на странице (жёлтая, 4 луча)
function pstar(g,x,y,s,c='#D9B55A'){if(s<=.01)return;g.save();g.translate(x,y);g.scale(s,s);g.beginPath();g.moveTo(0,-16);g.quadraticCurveTo(2,-2,16,0);g.quadraticCurveTo(2,2,0,16);g.quadraticCurveTo(-2,2,-16,0);g.quadraticCurveTo(-2,-2,0,-16);
  g.fillStyle=mix(c,'#FFFFFF',.3);g.fill();g.strokeStyle=c;g.lineWidth=2;g.stroke();g.restore();}
// перелистывание: p 0..1, newPage(g) рисует содержимое новой страницы
function pageTurn(g,p,newPage){if(p<=0)return;const R=PG.x+PG.w,f=lerp(R,PG.x-PG.w*.15,eio(p)),fw=R-f;
  g.save();g.beginPath();g.rect(f,PG.y,R-f+4,PG.h);g.clip();g.drawImage(pageTex(),PG.x,PG.y);if(newPage)newPage(g);g.restore();
  const sh=g.createLinearGradient(f,0,f+120,0);sh.addColorStop(0,'rgba(60,40,25,.25)');sh.addColorStop(1,'rgba(60,40,25,0)');g.fillStyle=sh;g.fillRect(f,PG.y,120,PG.h);
  const ex=f-fw*.92,bend=Math.min(60,fw*.15);g.save();g.beginPath();g.moveTo(f,PG.y);g.quadraticCurveTo(f-fw*.5,PG.y-bend*.6,ex,PG.y+bend);g.lineTo(ex-10,PG.y+PG.h-bend*.6);g.quadraticCurveTo(f-fw*.5,PG.y+PG.h+bend*.3,f,PG.y+PG.h);g.closePath();
  const fg_=g.createLinearGradient(ex,0,f,0);fg_.addColorStop(0,'#EEE7D6');fg_.addColorStop(.7,'#DDD3BF');fg_.addColorStop(1,'#C7BBA4');g.fillStyle=fg_;g.fill();g.strokeStyle='rgba(110,90,70,.45)';g.lineWidth=1.5;g.stroke();g.restore();}
// клякса с рваным акварельным краем (для «картинки на странице»)
function blobPath(g,rc){g.beginPath();for(let i=0;i<=140;i++){const a=i/140*Math.PI*2,rr=1+.05*Math.sin(a*3+1)+.035*Math.sin(a*7+2)+.012*Math.sin(a*23)+.008*Math.sin(a*41+1);
  const x=rc.x+rc.w/2+Math.cos(a)*rc.w*.47*rr,y=rc.y+rc.h/2+Math.sin(a)*rc.h*.45*rr;i?g.lineTo(x,y):g.moveTo(x,y);}g.closePath();}
// painting(g, drawScene, rect, a): вся сцена (кадр 1080x1920) вписывается в rect и обрезается кляксой; край чуть темнее, как у акварели
function painting(g,drawScene,rc,a=1){if(a<=.01)return;g.save();g.globalAlpha=a;blobPath(g,rc);g.save();g.clip();g.translate(rc.x,rc.y);g.scale(rc.w/W,rc.h/H);drawScene(g);g.restore();
  blobPath(g,rc);g.strokeStyle='rgba(40,40,60,.22)';g.lineWidth=Math.max(2,rc.w*.008);g.stroke();g.restore();}
// layer(g, a, fn): нарисовать fn отдельным слоем с прозрачностью (честное растворение двух сцен)
// reset(g): чистое состояние контекста (вызывать в начале draw, чтобы кадр не зависел от предыдущего)
function reset(g){g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.lineJoin='miter';g.lineCap='butt';g.lineWidth=1;
  g.setLineDash([]);g.textAlign='left';g.textBaseline='alphabetic';g.imageSmoothingEnabled=true;g.fillStyle='#000';g.strokeStyle='#000';}
// prewarm(fn): нарисовать fn во вспомогательный холст (только чтобы заполнить кэши спрайтов до показа)
function prewarm(fn){if(!LY)LY=mk(W,H);const[c,h]=LY;reset(h);fn(h);}
let LY=null;function layer(g,a,fn){if(a<=.01)return;if(a>=.99){fn(g);return;}if(!LY)LY=mk(W,H);const[c,h]=LY;reset(h);h.clearRect(0,0,W,H);fn(h);g.save();g.setTransform(1,0,0,1,0,0);g.globalAlpha=a;g.drawImage(c,0,0);g.restore();}
// штамп-силуэт терракотой (финальная страница): kind 'bread' | 'wheat' | 'firefly'
function stamp(g,kind,x,y,s,o={}){if(s<=.01)return;g.save();g.translate(x,y);g.scale(s,s);g.fillStyle=o.c||C.stamp;g.beginPath();
  if(kind==='bread'){g.moveTo(-110,40);g.bezierCurveTo(-118,-100,118,-100,110,40);g.quadraticCurveTo(0,52,-110,40);g.fill();g.strokeStyle=C.page;g.lineWidth=9;g.lineCap='round';[-46,0,46].forEach(k=>{g.beginPath();g.moveTo(k-16,0);g.quadraticCurveTo(k,-34,k+18,-42);g.stroke();});}
  else if(kind==='wheat'){g.strokeStyle=o.c||C.stamp;g.lineWidth=9;g.lineCap='round';g.moveTo(0,90);g.quadraticCurveTo(4,0,0,-40);g.stroke();
    for(let i=0;i<4;i++){[-1,1].forEach(k=>{g.save();g.translate(k*14,-i*30+10);g.rotate(k*.5);g.beginPath();g.ellipse(0,-6,10,20,0,0,7);g.fill();g.restore();});}g.beginPath();g.ellipse(0,-112,10,20,0,0,7);g.fill();
    g.lineWidth=3;g.beginPath();g.moveTo(0,-130);g.lineTo(0,-165);g.stroke();}
  else if(kind==='firefly'){g.arc(0,0,22,0,7);g.fill();g.globalAlpha=.6;[-1,1].forEach(k=>{g.beginPath();g.ellipse(k*26,-22,22,12,k*.5,0,7);g.fill();});}
  g.globalAlpha=1;g.fillStyle='rgba(255,230,200,.35)';for(let i=0;i<14;i++){g.beginPath();g.arc((hn(i+kind.length)-.5)*150,(hn(i*3)-.5)*110,1.5+hn(i)*2.5,0,7);g.fill();}g.restore();}

// ---------- типовые объекты: город, транспорт, животные, природа, улица. Цвет каждого задаётся параметром c ----------
const WINL='#F2D58E',WIND='#8A9DA6';
function hatch(q,x,y,w,h,a=.12){q.save();q.globalAlpha=a;q.fillStyle=hatchPat(q);q.fillRect(x,y,w,h);q.restore();}
// многоэтажка: block(g, x центр, y земля, cols, floors, {wall, roof, lit 0..1 доля горящих окон (гаснут и зажигаются по одному), build 0..1 (стройка: готовые этажи), seed, s})
function block(g,x,y,cols,fl,o={}){const s=o.s||1,cw=70,fh=84,w=cols*cw+30,built=o.build==null?fl:Math.max(1,Math.ceil(clamp(o.build)*fl)),h=built*fh+20,full=built>=fl&&o.build==null||o.build>=1;
  const sp=spriteOf('blk'+cols+'x'+fl+'b'+built+(o.wall||'')+(o.roof||'')+s,(w+40)*s,(fl*fh+80)*s,(w/2+20)*s,(fl*fh+60)*s,q=>{q.scale(s,s);q.lineJoin='round';
    q.beginPath();q.rect(-w/2,-h,w,h);sf(q,o.wall||'#E3D3B5');q.save();q.clip();hatch(q,-w/2,-h,w,h);q.restore();
    for(let f=0;f<built;f++)for(let c=0;c<cols;c++){const wx=-w/2+15+c*cw+18,wy=-(f+1)*fh+8;if(f===0&&c===(cols>>1)){q.beginPath();q.rect(wx-2,wy+16,38,fh-24);sf(q,C.door,2);continue;}
      q.beginPath();q.rect(wx,wy+14,34,42);sf(q,WIND,2);q.beginPath();q.moveTo(wx+17,wy+14);q.lineTo(wx+17,wy+56);q.strokeStyle=col(C.ink);q.lineWidth=1.4;q.stroke();}
    if(full){q.beginPath();q.rect(-w/2-8,-h-14,w+16,14);sf(q,o.roof||'#B6A592',2.2);}
    else{q.strokeStyle=col(C.ink);q.lineWidth=2;q.setLineDash([8,7]);q.strokeRect(-w/2,-h-fh,w,fh);q.setLineDash([]);}});
  blitS(g,sp,x,y);const L=o.lit||0;if(L<=0)return;g.save();g.fillStyle=WINL;let on=0;
  for(let f=0;f<built;f++)for(let c=0;c<cols;c++){if(f===0&&c===(cols>>1))continue;if(hn((o.seed||3)*17+f*7.3+c*3.1)<L){const wx=x+(-w/2+15+c*cw+18)*s,wy=y+(-(f+1)*fh+22)*s;g.fillRect(wx+1.5*s,wy+1.5*s,31*s,39*s);on++;}}
  g.restore();if(on)glow(g,x,y-h*s*.5,Math.min(240,w*s*.8),L*.45,'warm','lighter');}
// магазин или кафе: shop(g, x центр, y земля, w, {wall, awn цвет полос маркизы, sign 'текст вывески', lit 0..1 (свет в витрине), s})
function shop(g,x,y,w,o={}){const s=o.s||1,h=w*.62;const sp=spriteOf('shop'+w+(o.wall||'')+(o.awn||'')+(o.sign||'')+s,(w+60)*s,(h+150)*s,(w/2+30)*s,(h+130)*s,q=>{q.scale(s,s);q.lineJoin='round';
    q.beginPath();q.rect(-w/2,-h,w,h);sf(q,o.wall||'#EADCC0');q.save();q.clip();hatch(q,-w/2,-h,w,h,.1);q.restore();
    q.beginPath();q.rect(-w*.42,-h*.62,w*.48,h*.48);sf(q,WIND,2.2);q.beginPath();q.rect(w*.14,-h*.66,w*.26,h*.66);sf(q,C.door,2.2);
    const aw=o.awn||C.terra,n=Math.max(5,Math.round(w/36));q.beginPath();q.moveTo(-w/2-10,-h);q.lineTo(w/2+10,-h);q.lineTo(w/2+10,-h+34);for(let i=n;i>=0;i--){const xx=-w/2-10+(w+20)*i/n;q.quadraticCurveTo(xx+(w+20)/n/2,-h+46,xx,-h+34);}
    q.closePath();q.fillStyle=col('#F2EBD9');q.fill();q.save();q.clip();q.fillStyle=col(aw);for(let i=0;i<n;i+=2)q.fillRect(-w/2-10+(w+20)*i/n,-h,(w+20)/n,50);q.restore();sf(q,null,2.2);
    if(o.sign){setF(q,40);const f=fit(q,o.sign,40,w*.9,22);setF(q,f.size);const tw=q.measureText(o.sign).width+40;q.beginPath();q.roundRect(-tw/2,-h-70,tw,58,6);sf(q,'#F2EBD9',2.2);
      q.fillStyle=col(C.terra);q.textAlign='center';q.textBaseline='middle';q.fillText(o.sign,0,-h-40);}});
  blitS(g,sp,x,y);if(o.lit){g.save();g.globalAlpha=o.lit;g.fillStyle=WINL;g.fillRect(x+(-w*.42+2)*s,y+(-h*.62+2)*s,(w*.48-4)*s,(h*.48-4)*s);g.restore();glow(g,x-w*.18*s,y-h*.4*s,w*.5*s,o.lit*.6,'warm','lighter');}}
// школа: school(g, x центр, y земля, w, {wall, roof, sign 'текст' (по умолчанию нет), lit 0..1, flag цвет флажка, s})
function school(g,x,y,w,o={}){const s=o.s||1,h=w*.5;const sp=spriteOf('sch'+w+(o.wall||'')+(o.roof||'')+(o.sign||'')+(o.flag||'')+s,(w+60)*s,(h+w*.32+170)*s,(w/2+30)*s,(h+w*.32+150)*s,q=>{q.scale(s,s);q.lineJoin='round';
    q.beginPath();q.rect(-w/2,-h,w,h);sf(q,o.wall||'#E8CDB0');q.save();q.clip();hatch(q,-w/2,-h,w,h,.1);q.restore();
    q.beginPath();q.moveTo(-w*.22,-h);q.lineTo(0,-h-w*.2);q.lineTo(w*.22,-h);q.closePath();sf(q,o.roof||C.terra,2.4);
    q.beginPath();q.rect(-w/2-8,-h-12,w+16,12);sf(q,o.roof||C.terra,2.2);q.beginPath();q.arc(0,-h-w*.075,w*.045,0,7);sf(q,'#F2EBD9',2);q.beginPath();q.moveTo(0,-h-w*.075);q.lineTo(0,-h-w*.1);q.moveTo(0,-h-w*.075);q.lineTo(w*.02,-h-w*.075);q.strokeStyle=col(C.ink);q.lineWidth=2;q.stroke();
    const cols=Math.max(4,Math.round(w/90));for(let r=0;r<2;r++)for(let c=0;c<cols;c++){const cx=-w/2+(c+.5)*w/cols;if(r===0&&Math.abs(cx)<w/cols*.6)continue;q.beginPath();q.rect(cx-17,-h+24+r*h*.48,34,44);sf(q,WIND,2);}
    q.beginPath();q.rect(-28,-h*.42,56,h*.42);sf(q,C.door,2.2);q.beginPath();q.rect(-48,-8,96,8);sf(q,C.stone,2);
    if(o.flag!==false){q.beginPath();q.moveTo(w/2-30,-h-12);q.lineTo(w/2-30,-h-110);q.strokeStyle=col(C.ink);q.lineWidth=3;q.stroke();q.beginPath();q.moveTo(w/2-30,-h-110);q.quadraticCurveTo(w/2+10,-h-120,w/2+30,-h-98);q.lineTo(w/2-30,-h-82);q.closePath();sf(q,o.flag||C.blue,2);}
    if(o.sign){setF(q,34);const f=fit(q,o.sign,34,w*.6,20);setF(q,f.size);const tw=q.measureText(o.sign).width+36;q.beginPath();q.roundRect(-tw/2,-h*.42-54,tw,44,5);sf(q,'#F2EBD9',2);q.fillStyle=col(C.terra);q.textAlign='center';q.textBaseline='middle';q.fillText(o.sign,0,-h*.42-32);}});
  blitS(g,sp,x,y);if(o.lit)glow(g,x,y-h*.5*s,w*.6*s,o.lit*.5,'warm','lighter');}
// кленовые листья: leaves(g, t, x0, x1, y0, y1, n, {cols:[цвета], ground: y земли (ещё лежат кучкой), seed, s}) - падают, кружась
const LFS={};function leafImg(c){if(LFS[c])return LFS[c];const[cv,q]=mk(64,64);q.translate(32,34);q.beginPath();for(let i=0;i<=60;i++){const a=i/60*Math.PI*2,r=24*(.55+.45*Math.pow(Math.abs(Math.cos(2.5*a)),.6));const xx=Math.sin(a)*r,yy=-Math.cos(a)*r*.95;i?q.lineTo(xx,yy):q.moveTo(xx,yy);}
  q.closePath();q.fillStyle=c;q.fill();q.strokeStyle=C.ink;q.lineWidth=1.6;q.stroke();q.beginPath();q.moveTo(0,24);q.lineTo(0,-16);q.moveTo(0,0);q.lineTo(-12,-10);q.moveTo(0,0);q.lineTo(12,-10);q.strokeStyle='rgba(91,70,54,.6)';q.lineWidth=1.2;q.stroke();return LFS[c]=cv;}
function leaves(g,t,x0,x1,y0,y1,n,o={}){const cols=o.cols||['#D98A4E','#C4664B','#D7B262','#B65C42'],sd=o.seed||5,s=o.s||1;g.save();
  if(o.ground!=null)for(let i=0;i<n*1.5;i++){const xx=lerp(x0,x1,hn(sd+i*3.7)),sz=26*s;g.save();g.translate(xx,o.ground+(hn(i*5.1+sd)-.5)*24);g.rotate(hn(i*2.3)*6);g.drawImage(leafImg(cols[i%cols.length]),-sz/2,-sz/2,sz,sz);g.restore();}
  for(let i=0;i<n;i++){const sp=.12+hn(sd+i*1.7)*.1,u=(t*sp+hn(i*9.1+sd))%1,xx=lerp(x0,x1,hn(i*4.3+sd))+Math.sin(t*1.4+i)*40,yy=lerp(y0,y1,u),sz=(26+hn(i)*12)*s;
    g.save();g.globalAlpha=Math.min(1,u*8,(1-u)*8);g.translate(xx,yy);g.rotate(Math.sin(t*2+i)*1.2);g.scale(Math.cos(t*2.6+i)*.5+.6,1);g.drawImage(leafImg(cols[i%cols.length]),-sz/2,-sz/2,sz,sz);g.restore();}g.restore();}
// колесо со спицами (a - угол поворота)
function wheel(g,x,y,r,a){g.save();g.translate(x,y);g.beginPath();g.arc(0,0,r,0,7);sf(g,'#4A3C34',2);g.beginPath();g.arc(0,0,r*.52,0,7);sf(g,'#CFC2AE',1.6);
  g.rotate(a);g.strokeStyle=col(C.ink);g.lineWidth=2.2;g.beginPath();for(let i=0;i<3;i++){const an=i*2.094;g.moveTo(0,0);g.lineTo(Math.cos(an)*r*.52,Math.sin(an)*r*.52);}g.stroke();g.restore();}
// машина: car(g, x центр, y земля, s, {c цвет кузова, roll пройденный путь px (крутит колёса), flip едет влево}). Длина ~260*s
function car(g,x,y,s,o={}){const c=o.c||C.blue;g.save();g.translate(x,y);g.scale(o.flip?-s:s,s);
  const sp=spriteOf('car'+c,300,150,150,130,q=>{q.lineJoin='round';q.beginPath();q.moveTo(-130,-34);q.lineTo(-130,-74);q.quadraticCurveTo(-126,-84,-110,-86);q.lineTo(-70,-88);q.lineTo(-40,-128);q.lineTo(50,-128);q.lineTo(86,-88);q.lineTo(118,-84);q.quadraticCurveTo(132,-80,132,-60);q.lineTo(132,-34);q.closePath();sf(q,c,2.6);
    q.save();q.clip();hatch(q,-140,-130,280,100,.1);q.restore();q.beginPath();q.moveTo(-58,-88);q.lineTo(-34,-118);q.lineTo(0,-118);q.lineTo(0,-88);q.closePath();sf(q,'#B9CCD3',2);q.beginPath();q.moveTo(10,-88);q.lineTo(10,-118);q.lineTo(44,-118);q.lineTo(70,-88);q.closePath();sf(q,'#B9CCD3',2);
    q.beginPath();q.arc(124,-70,6,0,7);sf(q,'#F3E3A8',1.5);q.strokeStyle=col(mix(c,'#3A2A20',.35));q.lineWidth=2;q.beginPath();q.moveTo(4,-86);q.lineTo(4,-40);q.stroke();});
  blitS(g,sp,0,0);const a=(o.roll||0)/30;wheel(g,-78,-30,30,a);wheel(g,82,-30,30,a);g.restore();}
// автобус: bus(g, x центр, y земля, s, {c цвет, num 'номер' на табличке над лобовым стеклом, pass число пассажиров в окнах, roll, flip}). Длина ~440*s
function bus(g,x,y,s,o={}){const c=o.c||C.blue,n=o.num==null?'':String(o.num);g.save();g.translate(x,y);g.scale(o.flip?-s:s,s);
  const sp=spriteOf('bus'+c+'|'+n+'|'+(o.pass||0),480,270,240,250,q=>{q.lineJoin='round';q.beginPath();q.roundRect(-220,-190,440,160,[26,30,8,8]);sf(q,c,2.6);q.save();q.clip();hatch(q,-220,-190,440,160,.1);
      q.fillStyle=col(mix(c,'#FFFFFF',.35));q.fillRect(-220,-62,440,14);q.restore();
      for(let i=0;i<5;i++){const wx=-200+i*68;q.beginPath();q.roundRect(wx,-166,54,58,6);sf(q,'#C3D3D8',2);if(i<(o.pass||0)){q.save();q.clip();q.beginPath();q.arc(wx+27,-112,18,0,7);sf(q,[C.skin,C.skin2,C.skin3][i%3],1.8);q.beginPath();q.arc(wx+27,-118,19,Math.PI,0);sf(q,[C.hair,C.hairDk,C.hairRed][i%3],1.6);q.restore();}}
      q.beginPath();q.roundRect(150,-170,58,84,[14,18,4,4]);sf(q,'#C3D3D8',2);q.beginPath();q.rect(150,-80,40,50);sf(q,mix(c,'#3A2A20',.25),2);
      q.beginPath();q.arc(208,-56,7,0,7);sf(q,'#F3E3A8',1.5);
});
  blitS(g,sp,0,0);if(n){g.save();g.translate(176,-202);if(o.flip)g.scale(-1,1);g.beginPath();g.roundRect(-36,-24,72,46,6);sf(g,'#F2EBD9',2.2);setF(g,36,false,700);g.fillStyle=col(C.ink);g.textAlign='center';g.textBaseline='middle';g.fillText(n,0,0);g.restore();}const a=(o.roll||0)/34;wheel(g,-130,-30,34,a);wheel(g,140,-30,34,a);g.restore();}
// велосипед с человеком: bike(g, x, y земля, s, t, {c цвет рамы, rider опции person (по умолчанию в брюках), roll, flip}). Длина ~230*s
function bike(g,x,y,s,t,o={}){const c=o.c||C.terra,rd={outfit:'pants',...(o.rider||{})},pc=rd.outfit==='dress'?(rd.skin||C.skin):(rd.pants||'#6F7C8C'),a=(o.roll||0)/42;g.save();g.translate(x,y);g.scale(o.flip?-s:s,s);g.lineCap='round';g.lineJoin='round';
  const bb=[0,-42],ph=a*1.0,pd=k=>[bb[0]+Math.cos(ph+k*Math.PI)*20,bb[1]+Math.sin(ph+k*Math.PI)*20],hip=[-22,-128];
  const leg=(p,sh)=>{const kx=(hip[0]+p[0])/2+22,ky=(hip[1]+p[1])/2-6;g.beginPath();g.moveTo(hip[0],hip[1]);g.lineTo(kx,ky);g.lineTo(p[0],p[1]);g.lineWidth=17;g.strokeStyle=col(C.ink);g.stroke();g.lineWidth=12;g.strokeStyle=col(sh?mix(pc,'#3A2A20',.2):pc);g.stroke();
    g.beginPath();g.ellipse(p[0]+4,p[1]+2,11,6,0,0,7);sf(g,'#4A3428',1.6);};
  leg(pd(1),1);wheel(g,-75,-42,42,a);wheel(g,75,-42,42,a);
  g.beginPath();g.moveTo(-75,-42);g.lineTo(bb[0],bb[1]);g.lineTo(52,-112);g.lineTo(-30,-112);g.lineTo(bb[0],bb[1]);g.moveTo(-75,-42);g.lineTo(-30,-112);g.moveTo(75,-42);g.lineTo(52,-112);g.lineTo(46,-136);g.lineTo(66,-140);
  g.moveTo(-40,-122);g.lineTo(-12,-122);g.lineWidth=9;g.strokeStyle=col(C.ink);g.stroke();g.lineWidth=5;g.strokeStyle=col(c);g.stroke();
  person(g,-22,-22,.82,{...rd,legs:false,aL:-1.15,aR:1.15,t,seed:rd.seed||(o.seed||2)});leg(pd(0),0);g.restore();}
// лодка или катер: boat(g, x, y ватерлиния, s, t, {c цвет корпуса, cabin цвет рубки или false, crew:[опции person] (видны по пояс), smoke 0..1 дым мотора, sail цвет паруса, seed})
function boat(g,x,y,s,t,o={}){const sd=o.seed||1,bob=Math.sin(t*1.7+sd)*4,tl=Math.sin(t*1.3+sd*2)*.025;g.save();g.translate(x,y+bob);g.rotate(tl);g.scale(s,s);g.lineJoin='round';
  if(o.sail){g.beginPath();g.moveTo(10,-34);g.lineTo(10,-250);g.strokeStyle=col(C.ink);g.lineWidth=5;g.stroke();g.beginPath();g.moveTo(18,-240);g.quadraticCurveTo(90,-150,120,-44);g.lineTo(18,-44);g.closePath();sf(g,o.sail,2.4);}
  if(o.cabin!==false){g.beginPath();g.roundRect(-40,-96,96,64,[8,8,0,0]);sf(g,o.cabin||'#F2EBD9',2.4);g.beginPath();g.rect(-26,-82,28,22);sf(g,'#B9CCD3',2);g.beginPath();g.rect(14,-82,28,22);sf(g,'#B9CCD3',2);}
  (o.crew||[]).forEach((p,i)=>{g.save();g.beginPath();g.rect(-200,-400,400,370);g.clip();person(g,-100+i*58,60,.62,{outfit:'pants',seed:sd+i,t,...p});g.restore();});
  g.beginPath();g.moveTo(-150,-40);g.lineTo(150,-46);g.quadraticCurveTo(136,-4,104,8);g.lineTo(-118,8);g.quadraticCurveTo(-142,-6,-150,-40);g.closePath();sf(g,o.c||C.terra,2.6);
  g.save();g.clip();g.fillStyle=col('#F2EBD9');g.fillRect(-160,-30,320,8);hatch(g,-160,-50,320,60,.1);g.restore();g.restore();
  if(o.smoke)smoke(g,x-150*s,y+bob-40*s,t,o.smoke,3,120*s);}
// собака: dog(g, x, y земля, s, t, {c окрас (рыжий '#C9824F'), sleep лежит и дремлет, walk фаза шага, flip}). Длина ~200*s, смотрит вправо
function dog(g,x,y,s,t,o={}){const c=o.c||'#C9824F',dk=mix(c,'#3A2A20',.3);g.save();g.translate(x,y);g.scale(o.flip?-s:s,s);g.lineJoin='round';g.lineCap='round';
  if(o.sleep){const br=1+Math.sin(t*2.2)*.03;g.beginPath();g.moveTo(-70,-14);g.quadraticCurveTo(-120,-30,-110,-6);g.lineWidth=13;g.strokeStyle=col(C.ink);g.stroke();g.lineWidth=8;g.strokeStyle=col(c);g.stroke();
    g.save();g.scale(1,br);g.beginPath();g.ellipse(-10,-28,78,30,0,0,7);sf(g,c,2.6);g.restore();g.beginPath();g.ellipse(-30,-6,26,8,0,0,7);g.ellipse(30,-6,26,8,0,0,7);sf(g,c,2);
    g.beginPath();g.ellipse(74,-24,32,26,0,0,7);sf(g,c,2.6);g.beginPath();g.ellipse(102,-16,16,12,0,0,7);sf(g,mix(c,'#FFFFFF',.25),2);g.beginPath();g.arc(114,-20,4.5,0,7);g.fillStyle=col('#36261F');g.fill();
    g.beginPath();g.ellipse(60,-36,12,24,.9,0,7);sf(g,dk,2);g.beginPath();g.arc(80,-28,6,Math.PI*.1,Math.PI*.9);g.strokeStyle=col('#36261F');g.lineWidth=2.4;g.stroke();
    const z=(t*.6)%1;g.globalAlpha=Math.sin(z*Math.PI);setF(g,30);g.fillStyle=col(C.ink);g.fillText('z',96+z*30,-70-z*50);g.restore();return;}
  const wk=o.walk!=null?o.walk:null,sw=k=>wk!=null?Math.sin(wk*Math.PI*2+k)*14:0,wag=Math.sin(t*8)*.35;
  g.beginPath();g.moveTo(-66,-80);g.quadraticCurveTo(-96,-110+wag*20,-88,-136+wag*30);g.lineWidth=13;g.strokeStyle=col(C.ink);g.stroke();g.lineWidth=8;g.strokeStyle=col(c);g.stroke();
  [[-50,0],[-30,Math.PI],[44,Math.PI],[62,0]].forEach(([lx,ph],i)=>{g.beginPath();g.roundRect(lx-8+sw(ph),-70,16,68,6);sf(g,i%2?dk:c,2);});
  g.beginPath();g.ellipse(0,-80,74,32,0,0,7);sf(g,c,2.6);g.beginPath();g.ellipse(84,-120,34,30,0,0,7);sf(g,c,2.6);g.beginPath();g.ellipse(114,-108,18,13,0,0,7);sf(g,mix(c,'#FFFFFF',.25),2);
  g.beginPath();g.arc(128,-112,5,0,7);g.fillStyle=col('#36261F');g.fill();g.beginPath();g.arc(92,-126,4.5,0,7);g.fill();g.beginPath();g.ellipse(68,-118,12,26,.5,0,7);sf(g,dk,2);g.restore();}
// кошка: cat(g, x, y земля, s, t, {c окрас, sleep, flip}) сидит, хвост покачивается. Высота ~150*s
function cat(g,x,y,s,t,o={}){const c=o.c||'#9C948C';g.save();g.translate(x,y);g.scale(o.flip?-s:s,s);g.lineJoin='round';g.lineCap='round';const tw=Math.sin(t*2)*.3;
  g.beginPath();g.moveTo(30,-10);g.bezierCurveTo(80,-10,80,-60+tw*40,60,-90+tw*30);g.lineWidth=12;g.strokeStyle=col(C.ink);g.stroke();g.lineWidth=7;g.strokeStyle=col(c);g.stroke();
  g.beginPath();g.moveTo(-36,0);g.bezierCurveTo(-44,-60,-28,-96,0,-98);g.bezierCurveTo(28,-96,44,-60,36,0);g.closePath();sf(g,c,2.6);
  g.beginPath();g.arc(0,-118,32,0,7);sf(g,c,2.6);[-1,1].forEach(k=>{g.beginPath();g.moveTo(k*14,-144);g.lineTo(k*28,-166);g.lineTo(k*32,-130);sf(g,c,2.2);});
  g.strokeStyle=col('#36261F');g.lineWidth=2.4;[-11,11].forEach(ex=>{g.beginPath();if(o.sleep)g.arc(ex,-118,5,Math.PI*.1,Math.PI*.9);else g.arc(ex,-120,3.6,0,7);o.sleep?g.stroke():(g.fillStyle=col('#36261F'),g.fill());});
  g.beginPath();g.moveTo(-4,-106);g.lineTo(4,-106);g.lineTo(0,-102);g.closePath();g.fillStyle=col(C.cheek);g.fill();g.restore();}
// птица: bird(g, x, y, s, t, {c цвет (чайка '#EFEAE0'), sit сидит, flip}). Летит, взмахивая крыльями. Размах ~120*s
function bird(g,x,y,s,t,o={}){const c=o.c||'#EFEAE0',f=Math.sin(t*9+(o.seed||0))*.9;g.save();g.translate(x,y);g.scale(o.flip?-s:s,s);g.lineJoin='round';g.lineCap='round';
  if(!o.sit){[-1,1].forEach(k=>{g.beginPath();g.moveTo(-8,-4);g.quadraticCurveTo(-20,-30*f*k-6,-58,-44*f-10);g.quadraticCurveTo(-30,-8,6,-2);g.closePath();if(k<0)sf(g,mix(c,'#5B4636',.15),2);});}
  g.beginPath();g.ellipse(0,0,34,14,0,0,7);sf(g,c,2.2);g.beginPath();g.arc(30,-8,12,0,7);sf(g,c,2.2);g.beginPath();g.moveTo(40,-8);g.lineTo(56,-4);g.lineTo(40,-2);g.closePath();sf(g,'#E2B84E',1.6);
  g.beginPath();g.arc(32,-11,2.6,0,7);g.fillStyle=col('#36261F');g.fill();g.beginPath();g.moveTo(-30,-2);g.lineTo(-48,-8);g.lineTo(-46,6);g.closePath();sf(g,mix(c,'#5B4636',.25),2);
  if(o.sit){g.beginPath();g.ellipse(-4,-4,22,9,.15,0,7);sf(g,mix(c,'#5B4636',.15),2);g.strokeStyle=col('#C79A55');g.lineWidth=3;g.beginPath();g.moveTo(-4,12);g.lineTo(-6,26);g.moveTo(6,12);g.lineTo(6,26);g.stroke();}
  else{g.beginPath();g.moveTo(-8,-4);g.quadraticCurveTo(-20,30*f-6,-58,44*f-10);g.quadraticCurveTo(-30,-8,6,-2);g.closePath();sf(g,c,2);}g.restore();}
// бумажное облако: cloud(g, x, y, s, {c цвет, a прозрачность})
function cloud(g,x,y,s,o={}){const c=o.c||'#F2ECDF';const sp=spriteOf('cl'+c+s,320*s,150*s,160*s,120*s,q=>{q.scale(s,s);q.lineJoin='round';q.beginPath();q.moveTo(-140,0);q.arc(-90,-24,46,Math.PI*.9,Math.PI*1.6);q.arc(-20,-58,58,Math.PI*1.12,Math.PI*1.9);
    q.arc(66,-34,50,Math.PI*1.3,Math.PI*1.95);q.arc(112,-12,30,Math.PI*1.4,Math.PI*.3);q.lineTo(-140,8);q.quadraticCurveTo(-150,4,-140,0);q.closePath();q.fillStyle=c;q.fill();q.save();q.clip();
    blot(q,-30,-60,90,'255,255,255',.4);blot(q,40,10,110,'120,100,90',.12);q.restore();q.strokeStyle='rgba(91,70,54,.55)';q.lineWidth=2;q.stroke();});
  g.save();g.globalAlpha=o.a==null?1:o.a;blitS(g,sp,x,y);g.restore();}
// море от y до низа кадра: sea(g, y горизонт, t, {m 'day'|'dawn'|'dusk'|'night' или cols:[верх, середина, низ], sunX, sunC - дорожка от солнца/луны})
const SEAC={day:['#B4C6C3','#8EABAC','#6E949B'],dawn:['#D9B3A6','#B2A6A8','#8E9CA2'],dusk:['#9C93A6','#86869A','#6F7489'],night:['#2E374B','#252E40','#1B2333']},SEAT={};
function seaTex(P,nt){const k=P.join();if(SEAT[k])return SEAT[k];const hh=1100,[c,q]=mk(W,hh),r=rng(P[0].length*7+P[2].charCodeAt(3));const gr=q.createLinearGradient(0,0,0,hh);gr.addColorStop(0,P[0]);gr.addColorStop(.3,P[1]);gr.addColorStop(1,P[2]);q.fillStyle=gr;q.fillRect(0,0,W,hh);
  for(let i=1;i<10;i++){const yy=i*i*10+i*8,ph=r()*6;q.beginPath();q.moveTo(-10,hh);for(let x=-10;x<=W+10;x+=30)q.lineTo(x,yy+Math.sin(x*.008+ph)*(3+i));q.lineTo(W+10,hh);q.closePath();q.fillStyle=nt?'rgba(5,8,20,.07)':'rgba(40,60,75,.06)';q.fill();q.strokeStyle=nt?'rgba(160,180,210,.16)':'rgba(255,248,235,.3)';q.lineWidth=1.6;q.stroke();}
  for(let i=0;i<3000;i++){q.fillStyle=r()>.5?'rgba(60,50,40,.06)':'rgba(255,250,240,.09)';q.fillRect(r()*W,r()*hh,1+r()*2,1+r());}q.fillStyle=nt?'rgba(200,210,230,.25)':'rgba(255,250,235,.55)';q.fillRect(0,0,W,2);return SEAT[k]=c;}
function sea(g,y,t,o={}){const m=o.m||'day',P=o.cols||SEAC[m]||SEAC.day,nt=m==='night',tx=seaTex(P,nt);g.drawImage(tx,0,0,W,Math.min(tx.height,H-y+40),0,y,W,Math.min(tx.height,H-y+40));
  if(o.sunX!=null){g.save();g.globalAlpha=nt?.5:.6;g.fillStyle=o.sunC||(nt?'#E9E2C8':'#F6E2B6');for(let i=0;i<9;i++){const yy=y+8+i*i*6,w=(18+i*10)*(.7+.3*Math.sin(t*2+i*1.7));g.fillRect(o.sunX-w/2,yy,w,3+i*.6);}g.restore();}
  g.save();g.strokeStyle=nt?'rgba(190,200,225,.35)':'rgba(255,250,238,.7)';g.lineWidth=2.2;g.lineCap='round';g.beginPath();for(let i=0;i<10;i++){const yy=y+30+hn(i*3)*400*(1+hn(i)),xx=((hn(i*7)*W+t*(14+i*3))%(W+80))-40,w=20+hn(i*5)*26;
    g.moveTo(xx-w,yy);g.quadraticCurveTo(xx,yy-7,xx+w,yy);}g.stroke();g.restore();}
// уличный фонарь: lamp(g, x, y земля, s, {on 0..1, c цвет фонаря, h высота столба})
function lamp(g,x,y,s,o={}){const h=o.h||300,on=o.on||0;g.save();g.translate(x,y);g.scale(s,s);g.lineJoin='round';g.beginPath();g.roundRect(-6,-h,12,h,4);sf(g,'#6E5A4A',2.2);g.beginPath();g.rect(-18,-10,36,10);sf(g,'#6E5A4A',2);
  g.beginPath();g.moveTo(-26,-h-6);g.lineTo(26,-h-6);g.lineTo(18,-h-60);g.lineTo(-18,-h-60);g.closePath();sf(g,on>.05?mix('#E8DDBF',WINL,on):'#E8DDBF',2.2);g.beginPath();g.moveTo(-28,-h-60);g.lineTo(0,-h-82);g.lineTo(28,-h-60);g.closePath();sf(g,o.c||'#5E5A52',2.2);g.restore();
  if(on>.01){glow(g,x,y-(h+33)*s,90*s,on*.9,'warm','lighter');pool(g,x,y,120*s,26*s,on*.5);}}
// гирлянда: garland(g, x0, y0, x1, y1, n, t, {on 0..1 (лампочки зажигаются слева направо), cols:[цвета], sag провис})
function garland(g,x0,y0,x1,y1,n,t,o={}){const sag=o.sag==null?70:o.sag,on=o.on==null?1:o.on,cols=o.cols||['#F3C46C','#E37F5C','#F8EED2','#E2AFAA','#A6BA90'],pt=u=>[lerp(x0,x1,u),lerp(y0,y1,u)+sag*4*u*(1-u)];
  g.save();g.beginPath();for(let i=0;i<=20;i++){const p=pt(i/20);i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]);}g.strokeStyle=col('#4E4038');g.lineWidth=2.2;g.stroke();
  for(let i=0;i<n;i++){const u=(i+.5)/n,p=pt(u),lit=clamp((on*(n+1)-i)),c=cols[i%cols.length],fl=.85+.15*Math.sin(t*5+i*2);g.beginPath();g.ellipse(p[0],p[1]+12,8,11,0,0,7);
    g.fillStyle=lit>.05?mix(col('#B8AE9C'),c,lit):col('#B8AE9C');g.fill();g.strokeStyle=col(C.ink);g.lineWidth=1.6;g.stroke();if(lit>.05)glow(g,p[0],p[1]+12,32,lit*fl*.8,'warm','lighter');}g.restore();}
// доска или вывеска с текстом из параметров: board(g, x центр, y низ, w, h, ['строка', ...], {kind 'chalk'|'sign', p 0..1 (текст пишется по буквам), size, legs высота ножек (0 - без ножек), c цвет доски})
function board(g,x,y,w,h,lines,o={}){const ch=(o.kind||'chalk')==='chalk',lg=o.legs==null?(ch?90:0):o.legs,by=y-lg;g.save();g.lineJoin='round';
  if(lg){[-1,1].forEach(k=>{g.beginPath();g.moveTo(x+k*w*.3,by-10);g.lineTo(x+k*w*.36,y);g.lineWidth=10;g.strokeStyle=col(C.ink);g.stroke();g.lineWidth=6;g.strokeStyle=col('#8C6A4D');g.stroke();});}
  g.beginPath();g.roundRect(x-w/2,by-h,w,h,6);sf(g,ch?'#9C7552':'#F2EBD9',2.6);g.beginPath();g.rect(x-w/2+12,by-h+12,w-24,h-24);sf(g,ch?(o.c||'#3E4A44'):(o.c||'#F2EBD9'),ch?2:0);
  const tot=lines.join('').length,shown=Math.round(clamp(o.p==null?1:o.p)*tot);let used=0;const n=lines.length,size0=o.size||Math.min(58,(h-40)/n/1.25);
  g.fillStyle=ch?col('#F1ECE0'):col(C.terra);g.textAlign='center';g.textBaseline='middle';
  lines.forEach((ln,i)=>{const f=fit(g,ln,size0,w-60,20);setF(g,f.size);const k=clamp(shown-used,0,ln.length);used+=ln.length;if(k<=0)return;const s=ln.slice(0,k),fw=g.measureText(ln).width;
    g.textAlign='left';g.fillText(s,x-fw/2,by-h/2+(i-(n-1)/2)*size0*1.25);});g.restore();}

// warm(): заранее построить все текстуры (вызвать в начале draw; дальше бесплатно)
let WARM=false;function warm(o={}){if(WARM)return;WARM=true;overlayTex();['dawn','day','dusk','night'].forEach(skyTex);const z=o.z||1.2;
  ['day','dusk','night'].forEach(p=>['far','mid','near','front'].forEach(k=>hillSprite(p,1,k,z)));fgTex(PAL.day.fg);fgTex(PAL.night.fg);woodTex();pageTex();sunTex();['warm','fire','white','gold'].forEach(glowImg);}
// ---------- камера и сцены ----------
// zoom(g, z, cx, cy, dx, dy): масштаб вокруг точки + сдвиг
function zoom(g,z,cx=W/2,cy=H/2,dx=0,dy=0){g.translate(cx+dx,cy+dy);g.scale(z,z);g.translate(-cx,-cy);}
function scene(t,CUTS){let i=0;while(i<CUTS.length-1&&t>=CUTS[i+1])i++;const a=CUTS[i],b=CUTS[i+1]==null?a+4:CUTS[i+1];return{i,lt:t-a,a,b,p:clamp((t-a)/(b-a))};}
// звуки смен сцен: мягкий перелив на каждом переходе
function cutSounds(s,CUTS,o={}){CUTS.forEach((c,i)=>{if(i===0)return;s.play(c,i%2?'kalimba_run':'marimba_run',o.v||.12,{pitch:o.pitch||1});});}

return{W,H,X0,X1,C,F,PAL,PG,PW,ZP,wz,LW,hn,clamp,lerp,prog,eo,eio,sm,back,spr,vis,rng,kf,mix,light,col,sf,glow,overlay,
  pool,hillsStack,sky,stars,moon,sun,beams,birds,hill,hills,front,fg,tufts,motes,person,firefly,trail,tree,hut,house,field,soil,flames,fire,sparks,oven,smoke,
  groundY,blobPath,bread,table,sack,basket,windmill,pline,pcircle,pgear,pcompass,pdots,circPts,blueprint,setF,fit,plate,squiggle,caption,pageText,
  pencil,book,pstar,pageTurn,painting,layer,stamp,zoom,scene,cutSounds,warm,reset,prewarm,spriteOf,blitS,
  crowd,block,shop,school,leaves,wheel,car,bus,bike,boat,dog,cat,bird,cloud,sea,lamp,garland,board};
})();
