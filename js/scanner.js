'use strict';
// ===== Utilitas: loading, urutan proses, thumbnail, simpan inkremental =====
let _bz=0;
function busy(on,msg){let b=$('#busy');if(!b){b=document.createElement('div');b.id='busy';b.innerHTML='<div class=sp></div><span></span>';document.body.append(b)}
 if(on){_bz++;b.querySelector('span').textContent=msg||'Memproses…'}else _bz=Math.max(0,_bz-1);b.hidden=_bz===0}
const wrap=(f,m)=>async function(...a){busy(true,m);try{return await f.apply(this,a)}finally{busy(false)}};
const seq=async(a,f)=>{const o=[];for(const x of a){o.push(await f(x));await new Promise(r=>setTimeout(r))}return o};
async function mkThumb(b){const bm=await createImageBitmap(b),k=Math.min(1,240/Math.max(bm.width,bm.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(bm.width*k));c.height=Math.max(1,Math.round(bm.height*k));c.getContext('2d').drawImage(bm,0,0,c.width,c.height);bm.close&&bm.close();return new Promise(r=>c.toBlob(r,'image/jpeg',.7))}
const TU=new Map(),SG=new WeakMap(),BI=new WeakMap();let bn=0;
const bid=b=>b?(BI.get(b)||(BI.set(b,++bn),bn)):0;
const sig=p=>[p.order,p.cap,p.ts,p.tsEdited,bid(p.edit),bid(p.thumb),JSON.stringify(p.params)].join('|');
function thumbURL(p){let u=TU.get(p.id);if(!u){u=URL.createObjectURL(p.thumb||p.edit||p.orig);TU.set(p.id,u)}return u}
async function ensureThumbs(){for(const p of cur.photos)if(!p.thumb){try{p.thumb=await mkThumb(p.edit||p.orig);await put('photos',p);SG.delete(p)}catch{}}}
// simpan hanya foto yang berubah (sebelumnya semua blob ditulis ulang tiap simpan)
save=async function(){const{doc,photos}=cur;doc.updated=new Date().toISOString();const tx=db.transaction(['documents','photos'],'readwrite'),ch=[];tx.objectStore('documents').put(doc);
 photos.forEach((p,i)=>{p.order=i;const s=sig(p);if(SG.get(p)!==s){tx.objectStore('photos').put(p);ch.push([p,s])}});await done(tx);ch.forEach(([p,s])=>SG.set(p,s))};
const _vd=V.doc;V.doc=async()=>{if(cur&&cur.photos.some(p=>!p.thumb)){busy(true,'Memuat foto…');try{await ensureThumbs()}finally{busy(false)}}TU.forEach(u=>URL.revokeObjectURL(u));TU.clear();return _vd()};
addFiles=async function(fs,src){const L=[...fs];let n=0;try{for(const f of L){busy(true,`Memproses foto ${++n}/${L.length}…`);const b=new Blob([await f.arrayBuffer()],{type:f.type||'image/jpeg'});
 cur.photos.push({id:uid(),docId:cur.doc.id,orig:b,edit:null,params:null,thumb:await mkThumb(b),cap:'',ts:new Date().toISOString(),tsEdited:false,order:cur.photos.length,src});await doSave()}}
 catch(e){toast('Gagal menambah foto: '+e.message)}finally{while(_bz)busy(false)}V.doc()};
preview=wrap(preview,'Membuat preview…');exportPdf=wrap(exportPdf,'Membuat PDF…');restore=wrap(restore,'Memulihkan…');
backup=async function(){busy(true,'Membuat backup…');try{const d=await all('documents'),ps=await all('photos'),parts=[`{"app":"PWA Dokumentasi Struk","backupVersion":1,"createdAt":${JSON.stringify(new Date().toISOString())},"documents":${JSON.stringify(d)},"settings":{},"qrHistory":[],"photos":[`];let i=0;
 for(const p of ps){busy(true,`Backup foto ${++i}/${ps.length}…`);parts.push((i>1?',':'')+JSON.stringify({...p,thumb:undefined,orig:await b64(p.orig),edit:p.edit?await b64(p.edit):null}))}
 parts.push(']}');const b=new Blob(parts,{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`Backup_Struk_${new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Jakarta'})}.json`;a.click();toast(`Backup: ${d.length} dokumen, ${ps.length} foto, ${mb(b.size)}`)}catch(e){toast('Backup gagal: '+e.message)}finally{busy(false)}};
function viewP(i){const p=cur.photos[i],m=$('#modal'),u=URL.createObjectURL(p.edit||p.orig);m.hidden=false;
 m.innerHTML=`<div class=sheet-h><b>Foto ${i+1}</b>${IB('x','Tutup','',"$('#modal').hidden=true")}</div><img id=vi src="${u}" style="width:100%;border-radius:12px;background:#fff">${p.edit?`<div class=row><button class=s style="user-select:none;-webkit-user-select:none;touch-action:none" oncontextmenu="return false" onpointerdown="vo(${i},1)" onpointerup="vo(${i},0)" onpointerleave="vo(${i},0)" onpointercancel="vo(${i},0)">${ic('eye',18)}<span>Tahan: lihat foto asli</span></button></div>`:''}`}
let _vu=null;function vo(i,o){const p=cur.photos[i],im=$('#vi');if(!im)return;if(_vu)URL.revokeObjectURL(_vu);_vu=URL.createObjectURL(o?p.orig:(p.edit||p.orig));im.src=_vu}
// ===== Document scanner: homografi, filter, deteksi tepi =====
function H(dst,src){const A=[];for(let i=0;i<4;i++){const[x,y]=dst[i],[u,v]=src[i];A.push([x,y,1,0,0,0,-u*x,-u*y,u],[0,0,0,x,y,1,-v*x,-v*y,v])}
 for(let i=0;i<8;i++){let m=i;for(let r=i+1;r<8;r++)if(Math.abs(A[r][i])>Math.abs(A[m][i]))m=r;[A[i],A[m]]=[A[m],A[i]];for(let r=0;r<8;r++){if(r===i)continue;const f=A[r][i]/A[i][i];for(let c=i;c<9;c++)A[r][c]-=f*A[i][c]}}
 return A.map((r,i)=>r[8]/r[i]).slice(0,8)}
function warpC(bmp,cn,maxOut,cache){const key=maxOut+'|'+cn.join();if(cache&&cache.key===key)return cache.c;
 const k=Math.min(1,maxOut*1.5/Math.max(bmp.width,bmp.height)),sw=Math.round(bmp.width*k),sh=Math.round(bmp.height*k),sc=document.createElement('canvas');sc.width=sw;sc.height=sh;const sx=sc.getContext('2d');sx.drawImage(bmp,0,0,sw,sh);const sd=sx.getImageData(0,0,sw,sh).data;
 const q=cn.map(([x,y])=>[x*sw,y*sh]),dd=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);let W=Math.max(dd(q[0],q[1]),dd(q[3],q[2])),Hh=Math.max(dd(q[0],q[3]),dd(q[1],q[2]));const f=Math.min(1,maxOut/Math.max(W,Hh));W=Math.max(2,Math.round(W*f));Hh=Math.max(2,Math.round(Hh*f));
 const h=H([[0,0],[W,0],[W,Hh],[0,Hh]],q),c=document.createElement('canvas');c.width=W;c.height=Hh;const cx=c.getContext('2d'),o=cx.createImageData(W,Hh),od=o.data;
 for(let y=0;y<Hh;y++)for(let x=0;x<W;x++){const w=h[6]*x+h[7]*y+1,u=(h[0]*x+h[1]*y+h[2])/w,v=(h[3]*x+h[4]*y+h[5])/w,i=(y*W+x)*4;od[i+3]=255;
  if(u<0||v<0||u>=sw-1||v>=sh-1){od[i]=od[i+1]=od[i+2]=255;continue}
  const x0=u|0,y0=v|0,fx=u-x0,fy=v-y0,p=(y0*sw+x0)*4,p2=p+sw*4;
  for(let j=0;j<3;j++){const a=sd[p+j],b=sd[p+4+j],c2=sd[p2+j],e=sd[p2+4+j];od[i+j]=a+(b-a)*fx+(c2-a)*fy+(a-b-c2+e)*fx*fy}}
 cx.putImageData(o,0,0);if(cache){cache.key=key;cache.c=c}return c}
function rotC(c,r){if(!r)return c;const q=r%2,o=document.createElement('canvas');o.width=q?c.height:c.width;o.height=q?c.width:c.height;const x=o.getContext('2d');x.translate(o.width/2,o.height/2);x.rotate(r*Math.PI/2);x.drawImage(c,-c.width/2,-c.height/2);return o}
function fxC(c,s){const w=c.width,h=c.height,im=c.getContext('2d').getImageData(0,0,w,h),d=im.data,n=w*h;
 if(s.mode==='enh'){const hs=new Uint32Array(256);for(let i=0;i<n;i++)hs[(d[i*4]*.299+d[i*4+1]*.587+d[i*4+2]*.114)|0]++;let a=0,lo=0,hi=255;for(let v=0;v<256;v++){a+=hs[v];if(a>=n*.01){lo=v;break}}a=0;for(let v=255;v>=0;v--){a+=hs[v];if(a>=n*.01){hi=v;break}}
  if(hi-lo>20){const k=255/(hi-lo);for(let i=0;i<n*4;i+=4)for(let j=0;j<3;j++)d[i+j]=(d[i+j]-lo)*k}}
 if(s.b||s.c){const L=new Uint8ClampedArray(256),k=1+s.c/100;for(let v=0;v<256;v++)L[v]=(v-128)*k+128+s.b*1.28;for(let i=0;i<n*4;i+=4){d[i]=L[d[i]];d[i+1]=L[d[i+1]];d[i+2]=L[d[i+2]]}}
 if(s.mode==='gray'||s.mode==='bw')for(let i=0;i<n*4;i+=4)d[i]=d[i+1]=d[i+2]=d[i]*.299+d[i+1]*.587+d[i+2]*.114;
 if(s.sh>0){const a=s.sh/100*1.5,sr=new Uint8ClampedArray(d);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=(y*w+x)*4;for(let j=0;j<3;j++){const p=i+j,m=(sr[p-4]+sr[p+4]+sr[p-w*4]+sr[p+w*4]+sr[p])/5;d[p]=sr[p]+a*(sr[p]-m)}}}
 if(s.mode==='bw'){const W1=w+1,I=new Uint32Array(W1*(h+1)),R=Math.max(8,Math.round(Math.min(w,h)/24));for(let y=0;y<h;y++){let r=0;for(let x=0;x<w;x++){r+=d[(y*w+x)*4];I[(y+1)*W1+x+1]=I[y*W1+x+1]+r}}
  for(let y=0;y<h;y++){const y0=Math.max(0,y-R),y1=Math.min(h,y+R+1);for(let x=0;x<w;x++){const x0=Math.max(0,x-R),x1=Math.min(w,x+R+1),m=(I[y1*W1+x1]-I[y0*W1+x1]-I[y1*W1+x0]+I[y0*W1+x0])/((x1-x0)*(y1-y0)),i=(y*w+x)*4,v=d[i]<m*.94?0:255;d[i]=d[i+1]=d[i+2]=v}}}
 const o=document.createElement('canvas');o.width=w;o.height=h;o.getContext('2d').putImageData(im,0,0);return o}
function detect(bmp){const k=200/Math.max(bmp.width,bmp.height),w=Math.round(bmp.width*k),h=Math.round(bmp.height*k),N=w*h,c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.filter='blur(2px)';x.drawImage(bmp,0,0,w,h);
 const d=x.getImageData(0,0,w,h).data,g=new Uint8Array(N),hs=new Array(256).fill(0);let sum=0;for(let i=0;i<N;i++){g[i]=d[i*4]*.299+d[i*4+1]*.587+d[i*4+2]*.114;hs[g[i]]++;sum+=g[i]}
 let sb=0,wb=0,mx=0,th=128;for(let t=0;t<256;t++){wb+=hs[t];const wf=N-wb;if(!wb)continue;if(!wf)break;sb+=t*hs[t];const v=wb*wf*(sb/wb-(sum-sb)/wf)**2;if(v>mx){mx=v;th=t}}
 const m=new Uint8Array(N);for(let i=0;i<N;i++)m[i]=g[i]>th?1:0;let bd=0,bc=0;for(let i=0;i<w;i++){bd+=m[i]+m[(h-1)*w+i];bc+=2}for(let j=0;j<h;j++){bd+=m[j*w]+m[j*w+w-1];bc+=2}if(bd/bc>.5)for(let i=0;i<N;i++)m[i]^=1;
 const seen=new Uint8Array(N),st=new Int32Array(N);let best=null;
 for(let s0=0;s0<N;s0++){if(!m[s0]||seen[s0])continue;let sp=0;const pts=[];st[sp++]=s0;seen[s0]=1;while(sp){const p=st[--sp];pts.push(p);const px=p%w,py=(p/w)|0;
  if(px>0&&m[p-1]&&!seen[p-1]){seen[p-1]=1;st[sp++]=p-1}if(px<w-1&&m[p+1]&&!seen[p+1]){seen[p+1]=1;st[sp++]=p+1}if(py>0&&m[p-w]&&!seen[p-w]){seen[p-w]=1;st[sp++]=p-w}if(py<h-1&&m[p+w]&&!seen[p+w]){seen[p+w]=1;st[sp++]=p+w}}
  if(!best||pts.length>best.length)best=pts}
 if(!best||best.length<N*.12||best.length>N*.97)return null;
 let a=1e9,b=-1e9,e=-1e9,f=1e9,tl,br,tr,bl;for(const p of best){const px=p%w,py=(p/w)|0,s=px+py,df=px-py;if(s<a){a=s;tl=[px,py]}if(s>b){b=s;br=[px,py]}if(df>e){e=df;tr=[px,py]}if(df<f){f=df;bl=[px,py]}}
 return[tl,tr,br,bl].map(([px,py])=>[px/w,py/h])}
// ===== Editor: langkah 1 potong (4 titik kuning), langkah 2 filter =====
const MODES=[['orig','Original'],['enh','Enhance'],['gray','Abu-abu'],['bw','Hitam Putih']],BOX=()=>[[.02,.02],[.98,.02],[.98,.98],[.02,.98]];
edP=async function(i){const p=cur.photos[i];busy(true,'Membuka foto…');try{const bmp=await createImageBitmap(p.orig),pr=p.params&&p.params.corners?p.params:null;let cn=pr?pr.corners.map(a=>[...a]):null,msg='';
 if(!cn){cn=detect(bmp);msg=cn?'Batas struk terdeteksi, geser titik bila perlu':'Deteksi otomatis kurang yakin, atur titik manual';cn=cn||BOX()}
 ed={i,p,bmp,cache:{},step:'crop',s:{rot:pr?pr.rot:0,mode:pr?pr.mode:'orig',b:pr?pr.b:0,c:pr?pr.c:0,sh:pr?pr.sh:0,corners:cn}};$('#modal').hidden=false;eStep('crop');if(msg)toast(msg)}catch(e){toast('Gagal membuka foto: '+e.message)}finally{busy(false)}};
function eStep(st){ed.step=st;const m=$('#modal'),s=ed.s,sl=(k,n,a,b)=>`<label class=sl><span>${n}</span><input type=range min=${a} max=${b} value=${s[k]} oninput="ed.s.${k}=+this.value;fxSoon()"></label>`;
 if(st==='crop'){m.innerHTML=`<div class=sheet-h><b>Potong Struk</b>${IB('x','Tutup','','edClose()')}</div><small>Geser titik kuning ke empat sudut struk.</small><div class=cv><canvas id=edc style="touch-action:none;width:100%"></canvas></div><div class=row>${B('eye','Deteksi Otomatis','s','autoC()')}${B('rotate','Reset Kotak','s','boxC()')}</div><div class=row>${B('file','Lanjut: Filter','',"eStep('fx')")}</div>`;
  const c=$('#edc'),k=Math.min(1,900/Math.max(ed.bmp.width,ed.bmp.height));c.width=Math.round(ed.bmp.width*k);c.height=Math.round(ed.bmp.height*k);cDraw();cBind()}
 else{m.innerHTML=`<div class=sheet-h><b>Filter &amp; Hasil</b>${IB('x','Tutup','','edClose()')}</div><div class=cv><canvas id=edc></canvas></div><div class=row>${MODES.map(([k,n])=>`<button class="${s.mode===k?'':'s'}" onclick="ed.s.mode='${k}';eStep('fx')">${n}</button>`).join('')}</div>
  <section class=panel>${sl('b','Brightness',-60,60)}${sl('c','Contrast',-60,60)}${sl('sh','Sharpness',0,100)}</section>
  <div class=row>${B('rotate','Putar 90°','s','ed.s.rot=(ed.s.rot+1)%4;fxDraw()')}<button class=s style="user-select:none;-webkit-user-select:none;touch-action:none" oncontextmenu="return false" onpointerdown="cmp(1)" onpointerup="cmp(0)" onpointerleave="cmp(0)" onpointercancel="cmp(0)">${ic('eye',18)}<span>Tahan: asli</span></button></div>
  <div class=row>${B('image','Ubah Potongan','s',"eStep('crop')")}${B('rotate','Reset ke asli','d','edReset()')}</div><div class=row>${B('save','Simpan','','edSave()')}</div>`;fxDraw()}}
function cDraw(){const c=$('#edc'),x=c.getContext('2d'),p=ed.s.corners.map(([a,b])=>[a*c.width,b*c.height]);x.drawImage(ed.bmp,0,0,c.width,c.height);x.fillStyle='rgba(0,0,0,.45)';x.beginPath();x.rect(0,0,c.width,c.height);x.moveTo(...p[0]);p.slice(1).forEach(q=>x.lineTo(...q));x.closePath();x.fill('evenodd');
 x.strokeStyle='#facc15';x.lineWidth=Math.max(2,c.width/300);x.beginPath();x.moveTo(...p[0]);p.slice(1).forEach(q=>x.lineTo(...q));x.closePath();x.stroke();const r=c.width/34;p.forEach(([a,b])=>{x.beginPath();x.arc(a,b,r,0,7);x.fillStyle='#facc15';x.fill();x.strokeStyle='#000';x.lineWidth=2;x.stroke()})}
function cBind(){const c=$('#edc');let k=-1;const pos=e=>{const r=c.getBoundingClientRect();return[Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),Math.min(1,Math.max(0,(e.clientY-r.top)/r.height))]};
 c.onpointerdown=e=>{const[px,py]=pos(e),r=c.getBoundingClientRect();let bd=1e9;ed.s.corners.forEach(([x,y],i)=>{const t=Math.hypot((x-px)*r.width,(y-py)*r.height);if(t<bd){bd=t;k=i}});if(bd>70)k=-1;else c.setPointerCapture(e.pointerId)};
 c.onpointermove=e=>{if(k<0)return;ed.s.corners[k]=pos(e);cDraw()};c.onpointerup=c.onpointercancel=()=>k=-1}
function autoC(){const c=detect(ed.bmp);if(c){ed.s.corners=c;toast('Batas struk terdeteksi')}else toast('Deteksi kurang yakin, atur titik manual');cDraw()}
function boxC(){ed.s.corners=BOX();cDraw()}
function fxDraw(){const o=fxC(rotC(warpC(ed.bmp,ed.s.corners,900,ed.cache),ed.s.rot),ed.s),c=$('#edc');if(!c)return;c.width=o.width;c.height=o.height;c.getContext('2d').drawImage(o,0,0)}
let _ft;function fxSoon(){clearTimeout(_ft);_ft=setTimeout(fxDraw,70)}
function cmp(on){const c=$('#edc');if(!c)return;if(!on)return fxDraw();const k=Math.min(1,900/Math.max(ed.bmp.width,ed.bmp.height));c.width=Math.round(ed.bmp.width*k);c.height=Math.round(ed.bmp.height*k);c.getContext('2d').drawImage(ed.bmp,0,0,c.width,c.height)}
edClose=function(){if(ed&&ed.bmp.close)ed.bmp.close();$('#modal').hidden=true;ed=null;V.doc()};
edReset=async function(){ed.p.edit=null;ed.p.params=null;ed.p.thumb=null;await doSave();edClose()};
edSave=async function(){busy(true,'Menyimpan hasil edit…');try{const o=fxC(rotC(warpC(ed.bmp,ed.s.corners,2400),ed.s.rot),ed.s);ed.p.edit=await new Promise(r=>o.toBlob(r,'image/jpeg',.9));ed.p.params={v:2,...ed.s,corners:ed.s.corners.map(a=>[...a])};ed.p.thumb=null;await doSave();edClose()}catch(e){toast('Gagal menyimpan: '+e.message)}finally{busy(false)}};
