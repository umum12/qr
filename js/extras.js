'use strict';
// ===== v1.7: tombol pasang PWA, kalender internal, editor foto (tab, panel lipat, zoom, potong presisi) =====
const clampN=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
// -- 1. Pasang Aplikasi
let _ip=null;
function instVis(){const b=$('#inst');if(b)b.hidden=!(_ip&&!(matchMedia('(display-mode: standalone)').matches||navigator.standalone))}
async function instApp(){if(!_ip)return;_ip.prompt();try{await _ip.userChoice}catch{}_ip=null;instVis()}
addEventListener('beforeinstallprompt',e=>{e.preventDefault();_ip=e;instVis()});
addEventListener('appinstalled',()=>{_ip=null;instVis();toast('Aplikasi berhasil dipasang')});
try{matchMedia('(display-mode: standalone)').addEventListener('change',instVis)}catch{}
(()=>{const b=document.createElement('button');b.id='inst';b.hidden=true;b.innerHTML=ic('download',16)+'<span>Pasang Aplikasi</span>';b.onclick=instApp;$('#bar').append(b)})();
// -- 3. Kalender internal (Senin pertama, Sabtu/Minggu merah, zona WIB)
const BLN=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'],HRN=['Sen','Sel','Rab','Kam','Jum','Sab','Min'],p2=n=>String(n).padStart(2,'0');
function calGrid(Y,M){return{first:(new Date(Date.UTC(Y,M,1)).getUTCDay()+6)%7,dim:new Date(Date.UTC(Y,M+1,0)).getUTCDate()}}
function pickDT(iso){return new Promise(res=>{const j=jk(iso);let today=jk(new Date().toISOString()).slice(0,10),Y=+j.slice(0,4),M=+j.slice(5,7)-1,sel=j.slice(0,10);const hh0=j.slice(11,13),mm0=j.slice(14,16),o=document.createElement('div');o.id='dtp';document.body.append(o);
 const close=v=>{o.remove();res(v)},draw=(h,m)=>{const g=calGrid(Y,M);let c='';for(let i=0;i<g.first;i++)c+='<i></i>';
  for(let d=1;d<=g.dim;d++){const ds=`${Y}-${p2(M+1)}-${p2(d)}`,col=(g.first+d-1)%7;c+=`<button class="d${col>=5?' we':''}${ds===sel?' sel':''}${ds===today?' td':''}" data-d="${ds}">${d}</button>`}
  o.innerHTML=`<div class=dtc><div class=dth><button class=ib data-y=-1 aria-label="Tahun sebelumnya">«</button><button class=ib data-n=-1 aria-label="Bulan sebelumnya">‹</button><b>${BLN[M]} ${Y}</b><button class=ib data-n=1 aria-label="Bulan berikutnya">›</button><button class=ib data-y=1 aria-label="Tahun berikutnya">»</button></div>
  <div class=dtg>${HRN.map((n,i)=>`<span class="${i>=5?'we':''}">${n}</span>`).join('')}${c}</div>
  <div class=dtt><label>Jam<input id=th type=number inputmode=numeric min=0 max=23 value="${h}"></label><b>:</b><label>Menit<input id=tm type=number inputmode=numeric min=0 max=59 value="${m}"></label><span>WIB</span></div>
  <div class=row><button class=s data-a=now>Sekarang</button><button class=s data-a=cancel>Batal</button><button data-a=ok>Simpan</button></div></div>`};
 draw(hh0,mm0);
 o.onclick=e=>{if(e.target===o)return close(null);const b=e.target.closest('button');if(!b)return;const h=()=>$('#th').value,m=()=>$('#tm').value;
  if(b.dataset.d){sel=b.dataset.d;draw(h(),m())}
  else if(b.dataset.n){M+=+b.dataset.n;if(M<0){M=11;Y--}if(M>11){M=0;Y++}draw(h(),m())}
  else if(b.dataset.y){Y+=+b.dataset.y;draw(h(),m())}
  else if(b.dataset.a==='now'){const n=jk(new Date().toISOString());today=n.slice(0,10);sel=today;Y=+n.slice(0,4);M=+n.slice(5,7)-1;draw(n.slice(11,13),n.slice(14,16))}
  else if(b.dataset.a==='cancel')close(null);
  else if(b.dataset.a==='ok'){const H=clampN(parseInt(h())||0,0,23),Mi=clampN(parseInt(m())||0,0,59);close(new Date(`${sel}T${p2(H)}:${p2(Mi)}:00+07:00`).toISOString())}}})}
editTs=async function(i){const p=cur.photos[i],r=await pickDT(p.ts);if(!r)return;p.ts=r;p.tsEdited=true;V.doc()};
// -- 4/5/6. Editor foto
const TABS=st=>`<div class=tabs><button class="${st==='crop'?'on':''}" onclick="eStep('crop')">${ic('image',16)}<span>Potong Struk</span></button><button class="${st==='fx'?'on':''}" onclick="eStep('fx')">${ic('eye',16)}<span>Filter &amp; Hasil</span></button></div>`;
eStep=function(st){ed.step=st;const m=$('#modal'),s=ed.s,sl=(k,n,a,b)=>`<label class=sl><span>${n}</span><input type=range min=${a} max=${b} value=${s[k]} oninput="ed.s.${k}=+this.value;fxSoon()"></label>`,hd=`<div class=sheet-h><b>Edit Foto</b>${IB('x','Tutup','','edClose()')}</div>${TABS(st)}`;
 if(st==='crop'){ed.z=ed.z||{s:1,tx:0,ty:0};ed.snip=0;ed.sA=ed.sB=null;
  m.innerHTML=`${hd}<small id=ch>Geser titik kuning ke sudut struk. Cubit dua jari untuk zoom.</small><div class="cv zoom" id=cvb><canvas id=edc></canvas><button class=zchip id=zc onclick="zoomReset()">1×</button></div><div class=row>${B('eye','Deteksi Otomatis','s','autoC()')}${B('rotate','Reset Kotak','s','boxC()')}</div><div class=row>${B('plus','Potong Presisi (2 geser)','s','snipStart()')}</div>`;
  if(!ed.base){const k=Math.min(1,1600/Math.max(ed.bmp.width,ed.bmp.height)),b=document.createElement('canvas');b.width=Math.round(ed.bmp.width*k);b.height=Math.round(ed.bmp.height*k);b.getContext('2d').drawImage(ed.bmp,0,0,b.width,b.height);ed.base=b}
  const c=$('#edc');c.width=ed.base.width;c.height=ed.base.height;zApply();cBind()}
 else{m.innerHTML=`${hd}<div class=cv><canvas id=edc></canvas></div><div class=row>${MODES.map(([k,n])=>`<button class="${s.mode===k?'':'s'}" onclick="ed.s.mode='${k}';eStep('fx')">${n}</button>`).join('')}</div>
  <section class=panel><button class="acc${ed.open?' open':''}" onclick="ed.open=!ed.open;this.classList.toggle('open',ed.open);this.nextElementSibling.hidden=!ed.open" aria-label="Buka/tutup pengaturan gambar"><span>Pengaturan gambar</span>${ic('down',20)}</button><div ${ed.open?'':'hidden'}>${sl('b','Kecerahan',-60,60)}${sl('c','Kontras',-60,60)}${sl('sh','Ketajaman',0,100)}</div></section>
  <div class=row>${B('rotate','Putar 90°','s','ed.s.rot=(ed.s.rot+1)%4;fxDraw()')}<button class=s style="user-select:none;-webkit-user-select:none;touch-action:none" oncontextmenu="return false" onpointerdown="cmp(1)" onpointerup="cmp(0)" onpointerleave="cmp(0)" onpointercancel="cmp(0)">${ic('eye',18)}<span>Tahan: asli</span></button></div>
  <div class=row>${B('rotate','Reset ke asli','d','edReset()')}</div><div class=row>${B('save','Simpan','','edSave()')}</div>`;fxDraw()}};
function zApply(){const c=$('#edc'),b=$('#cvb');if(!c||!b)return;const z=ed.z,r=b.getBoundingClientRect();z.tx=Math.min(0,Math.max(r.width*(1-z.s),z.tx));z.ty=Math.min(0,Math.max(r.height*(1-z.s),z.ty));c.style.transform=`translate(${z.tx}px,${z.ty}px) scale(${z.s})`;const zc=$('#zc');if(zc)zc.textContent=(Math.round(z.s*10)/10)+'×';cDraw()}
function zoomReset(){ed.z={s:1,tx:0,ty:0};zApply()}
function pinchT(g,d,cc,r){const s=clampN(g.s*d/g.d,1,6),px=(g.c[0]-r.left-g.tx)/g.s,py=(g.c[1]-r.top-g.ty)/g.s;return{s,tx:cc[0]-r.left-px*s,ty:cc[1]-r.top-py*s}}
cDraw=function(){const c=$('#edc'),b=$('#cvb');if(!c||!ed||!ed.base)return;const x=c.getContext('2d'),W=c.width,Hh=c.height,u=W/((b?b.clientWidth:W)*ed.z.s||W),p=ed.s.corners.map(([a,q])=>[a*W,q*Hh]);
 x.drawImage(ed.base,0,0);x.fillStyle='rgba(0,0,0,.45)';x.beginPath();x.rect(0,0,W,Hh);x.moveTo(...p[0]);p.slice(1).forEach(q=>x.lineTo(...q));x.closePath();x.fill('evenodd');
 x.strokeStyle='#facc15';x.lineWidth=2.5*u;x.beginPath();x.moveTo(...p[0]);p.slice(1).forEach(q=>x.lineTo(...q));x.closePath();x.stroke();
 p.forEach(([a,q])=>{x.beginPath();x.arc(a,q,13*u,0,7);x.fillStyle='#facc15';x.fill();x.strokeStyle='#000';x.lineWidth=2*u;x.stroke()});
 if(ed.snip){const cr=(pt,col)=>{if(!pt)return;const a=pt[0]*W,q=pt[1]*Hh;x.strokeStyle=col;x.lineWidth=2*u;x.beginPath();x.moveTo(a-16*u,q);x.lineTo(a+16*u,q);x.moveTo(a,q-16*u);x.lineTo(a,q+16*u);x.stroke();x.beginPath();x.arc(a,q,5*u,0,7);x.stroke()};
  if(ed.sA&&ed.sB){x.setLineDash([8*u,6*u]);x.strokeStyle='#38bdf8';x.lineWidth=2.5*u;x.strokeRect(ed.sA[0]*W,ed.sA[1]*Hh,(ed.sB[0]-ed.sA[0])*W,(ed.sB[1]-ed.sA[1])*Hh);x.setLineDash([])}cr(ed.sA,'#38bdf8');cr(ed.sB,'#f472b6')}};
function snipStart(){ed.snip=1;ed.sA=ed.sB=null;$('#ch').textContent='Potong presisi: geser/ketuk titik KIRI-ATAS lalu lepas (zoom boleh).';cDraw()}
function snipUp(){if(ed.snip===1&&ed.sA){ed.snip=2;$('#ch').textContent='Sekarang geser/ketuk titik KANAN-BAWAH lalu lepas.'}
 else if(ed.snip===2&&ed.sB){const a=ed.sA,b=ed.sB,x0=Math.min(a[0],b[0]),x1=Math.max(a[0],b[0]),y0=Math.min(a[1],b[1]),y1=Math.max(a[1],b[1]);ed.snip=0;
  if(x1-x0<.03||y1-y0<.03){toast('Area terlalu kecil, ulangi');ed.sA=ed.sB=null}else{ed.s.corners=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];ed.sA=ed.sB=null;$('#ch').textContent='Selesai. Geser titik kuning bila perlu.'}}cDraw()}
cBind=function(){const c=$('#edc'),box=$('#cvb'),P=new Map();let k=-1,mode=null,g=null;
 const norm=e=>{const r=c.getBoundingClientRect();return[clampN((e.clientX-r.left)/r.width),clampN((e.clientY-r.top)/r.height)]},mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2],dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 box.onpointerdown=e=>{P.set(e.pointerId,[e.clientX,e.clientY]);box.setPointerCapture(e.pointerId);
  if(P.size===2){const[a,b]=[...P.values()];k=-1;g={d:dist(a,b),c:mid(a,b),s:ed.z.s,tx:ed.z.tx,ty:ed.z.ty};mode='pinch';return}if(P.size>2)return;
  const pt=norm(e);if(ed.snip){mode='snip';if(ed.snip===1)ed.sA=pt;else ed.sB=pt;cDraw();return}
  const r=c.getBoundingClientRect();let bd=1e9;k=-1;ed.s.corners.forEach(([x,y],i)=>{const t=Math.hypot((x-pt[0])*r.width,(y-pt[1])*r.height);if(t<bd){bd=t;k=i}});
  if(bd<=44)mode='handle';else{k=-1;mode='pan';g={x:e.clientX,y:e.clientY,tx:ed.z.tx,ty:ed.z.ty}}};
 box.onpointermove=e=>{if(!P.has(e.pointerId))return;P.set(e.pointerId,[e.clientX,e.clientY]);
  if(mode==='pinch'&&P.size>=2){const[a,b]=[...P.values()],t=pinchT(g,dist(a,b),mid(a,b),box.getBoundingClientRect());ed.z.s=t.s;ed.z.tx=t.tx;ed.z.ty=t.ty;zApply();return}
  if(mode==='handle'&&k>=0){ed.s.corners[k]=norm(e);cDraw()}
  else if(mode==='pan'){ed.z.tx=g.tx+e.clientX-g.x;ed.z.ty=g.ty+e.clientY-g.y;zApply()}
  else if(mode==='snip'){const pt=norm(e);if(ed.snip===1)ed.sA=pt;else ed.sB=pt;cDraw()}};
 box.onpointerup=box.onpointercancel=e=>{P.delete(e.pointerId);
  if(mode==='pinch'){if(P.size===1){const a=[...P.values()][0];g={x:a[0],y:a[1],tx:ed.z.tx,ty:ed.z.ty};mode='pan'}else if(!P.size)mode=null;return}
  if(P.size)return;if(mode==='snip')snipUp();mode=null;k=-1}};
