'use strict';
const $=s=>document.querySelector(s),M=$('#main');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
const toast=m=>{const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,4000)};
const fmt=iso=>{const p=Object.fromEntries(new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',weekday:'short',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso)).map(x=>[x.type,x.value]));return `${p.weekday.replace('.','')}, ${p.day} ${p.month.replace('.','')} ${p.year} · ${p.hour}:${p.minute} WIB`};
const jk=iso=>new Date(iso).toLocaleString('sv-SE',{timeZone:'Asia/Jakarta'}).slice(0,16).replace(' ','T');
const mb=n=>(n/1048576).toFixed(1)+' MB';
// ---- IndexedDB
let db;
const openDB=()=>new Promise((res,rej)=>{const r=indexedDB.open('struk',1);r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('documents',{keyPath:'id'});d.createObjectStore('photos',{keyPath:'id'}).createIndex('docId','docId');d.createObjectStore('settings',{keyPath:'k'})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const rq=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const st=(n,m='readonly')=>db.transaction(n,m).objectStore(n);
const all=n=>rq(st(n).getAll()),put=(n,v)=>rq(st(n,'readwrite').put(v)),del=(n,k)=>rq(st(n,'readwrite').delete(k));
const done=tx=>new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=tx.onabort=()=>rej(tx.error||new Error('Transaksi gagal'))});
const est=async()=>{try{const e=await navigator.storage.estimate();return e}catch{return null}};
// ---- state & router
let cur=null,view='home';
const V={};
async function go(v){if(v!=='qr')qrStop();view=v;document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));try{await V[v]()}catch(e){toast('Error: '+e.message)}}
function newDoc(){cur={doc:{id:uid(),title:'DOKUMENTASI BUKTI TRANSAKSI',subtitle:'',orient:'p',mode:'auto',val:4,margin:10,gap:4,created:new Date().toISOString(),pdfs:[]},photos:[]};go('doc')}
async function openDoc(id){const d=(await all('documents')).find(x=>x.id===id);const ph=(await all('photos')).filter(p=>p.docId===id).sort((a,b)=>a.order-b.order);cur={doc:d,photos:ph};go('doc')}
async function save(){const{doc,photos}=cur;doc.updated=new Date().toISOString();const tx=db.transaction(['documents','photos'],'readwrite');tx.objectStore('documents').put(doc);photos.forEach((p,i)=>{p.order=i;tx.objectStore('photos').put(p)});await done(tx)}
V.home=async()=>{const d=await all('documents'),p=await all('photos'),e=await est();M.innerHTML=`<h2>Beranda</h2><div class=box><b>${d.length}</b> dokumentasi · <b>${p.length}</b> foto<br><small>${e?`Penyimpanan: ${mb(e.usage)} dari ±${mb(e.quota)}`:'Info penyimpanan tidak tersedia'}</small></div><div class=row><button onclick="go('qr')">Scan QR</button><button onclick="newDoc()">Dokumentasi Baru</button></div><div class=warn>Data hanya di perangkat ini. Lakukan Backup JSON secara berkala (menu Setelan).</div>`};
// ---- Dokumen
V.doc=async()=>{if(!cur)return newDoc();const{doc:d,photos:ph}=cur;
M.innerHTML=`<h2>Dokumen</h2><label>Judul header<input value="${esc(d.title)}" oninput="cur.doc.title=this.value"></label><label>Subjudul (opsional)<input value="${esc(d.subtitle)}" oninput="cur.doc.subtitle=this.value"></label>
<div class=row><label class=btn style="text-align:center">Ambil Foto<input type=file accept="image/*" capture=environment hidden onchange="addFiles(this.files,'kamera');this.value=''"></label><label class="btn s" style="text-align:center">Galeri<input type=file accept="image/*" multiple hidden onchange="addFiles(this.files,'galeri');this.value=''"></label></div>
<b>${ph.length} foto</b>${ph.map((p,i)=>`<div class=card><img src="${URL.createObjectURL(p.edit||p.orig)}"><div><input placeholder="Keterangan" value="${esc(p.cap)}" oninput="cur.photos[${i}].cap=this.value"><small>${fmt(p.ts)}${p.tsEdited?' (waktu diedit)':''} · <a href="#" onclick="editTs(${i});return false">ubah</a></small><div class=row><button class=s onclick="mv(${i},-1)">↑</button><button class=s onclick="mv(${i},1)">↓</button><button class=s onclick="edP(${i})">Edit</button><button class=d onclick="rmP(${i})">Hapus</button></div></div></div>`).join('')}
<h3>Layout PDF A4</h3><div class=row><select onchange="cur.doc.orient=this.value"><option value=p ${d.orient=='p'?'selected':''}>Portrait</option><option value=l ${d.orient=='l'?'selected':''}>Landscape</option></select><select onchange="cur.doc.mode=this.value;V.doc()"><option value=auto ${d.mode=='auto'?'selected':''}>Otomatis</option><option value=pages ${d.mode=='pages'?'selected':''}>Jumlah halaman</option><option value=per ${d.mode=='per'?'selected':''}>Foto per halaman</option></select></div>
${d.mode!='auto'?`<label>${d.mode=='pages'?'Target jumlah halaman':'Foto per halaman'}<input type=number min=1 value="${d.val}" oninput="cur.doc.val=this.value"></label>`:''}
<div class=row><label>Margin (mm)<input type=number min=5 max=30 value="${d.margin}" oninput="cur.doc.margin=this.value"></label><label>Jarak (mm)<input type=number min=1 max=20 value="${d.gap}" oninput="cur.doc.gap=this.value"></label></div>
<div class=row><button class=s onclick="doSave().then(()=>toast('Tersimpan'))">Simpan</button><button class=s onclick="preview()">Preview</button><button onclick="exportPdf()">Ekspor PDF</button></div>`};
const doSave=async()=>{try{await save()}catch(e){toast('Gagal menyimpan (kuota?): '+e.message);throw e}};
async function addFiles(fs,src){toast('Memproses…');for(const f of fs){const b=new Blob([await f.arrayBuffer()],{type:f.type||'image/jpeg'});cur.photos.push({id:uid(),docId:cur.doc.id,orig:b,edit:null,params:null,cap:'',ts:new Date().toISOString(),tsEdited:false,order:cur.photos.length,src})}await doSave();V.doc()}
function mv(i,d){const a=cur.photos,j=i+d;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];V.doc()}
async function rmP(i){if(!confirm('Hapus foto ini?'))return;const p=cur.photos.splice(i,1)[0];await del('photos',p.id);V.doc()}
function editTs(i){const p=cur.photos[i];const v=prompt('Waktu (WIB), format YYYY-MM-DDTHH:mm',jk(p.ts));if(!v)return;const d=new Date(v+':00+07:00');if(isNaN(d))return toast('Format salah');p.ts=d.toISOString();p.tsEdited=true;V.doc()}
// ---- Editor foto
function rend(bmp,s,maxD){const q=s.rot%2,rw=q?bmp.height:bmp.width,rh=q?bmp.width:bmp.height,k=Math.min(1,maxD/Math.max(rw,rh));
const a=document.createElement('canvas');a.width=Math.round(rw*k);a.height=Math.round(rh*k);const x=a.getContext('2d');x.translate(a.width/2,a.height/2);x.rotate(s.rot*Math.PI/2);const bw=bmp.width*k,bh=bmp.height*k;x.drawImage(bmp,-bw/2,-bh/2,bw,bh);
const sx=a.width*s.l/100,sy=a.height*s.t/100,sw=a.width*(1-(s.l+s.r)/100),sh=a.height*(1-(s.t+s.bt)/100);
const o=document.createElement('canvas');o.width=Math.max(1,Math.round(sw));o.height=Math.max(1,Math.round(sh));const y=o.getContext('2d');y.filter=`brightness(${1+s.b/100}) contrast(${1+s.c/100})`;y.drawImage(a,sx,sy,sw,sh,0,0,o.width,o.height);return o}
let ed=null;
async function edP(i){const p=cur.photos[i];ed={i,p,bmp:await createImageBitmap(p.orig),s:{...{rot:0,b:0,c:0,l:0,t:0,r:0,bt:0},...(p.params||{})}};
const sl=(k,n,mn,mx)=>`<label>${n} <input type=range min=${mn} max=${mx} value=${ed.s[k]} oninput="ed.s.${k}=+this.value;edDraw()"></label>`;
const m=$('#modal');m.hidden=false;m.innerHTML=`<h3>Edit Foto</h3><canvas id=edc></canvas><button class=s onclick="ed.s.rot=(ed.s.rot+1)%4;edDraw()">Putar 90°</button>${sl('b','Kecerahan',-60,60)}${sl('c','Kontras',-60,60)}${sl('l','Potong kiri %',0,40)}${sl('r','Potong kanan %',0,40)}${sl('t','Potong atas %',0,40)}${sl('bt','Potong bawah %',0,40)}<div class=row><button onclick="edSave()">Simpan</button><button class=s onclick="edReset()">Reset ke asli</button><button class=s onclick="edClose()">Batal</button></div>`;edDraw()}
function edDraw(){const o=rend(ed.bmp,ed.s,700),c=$('#edc');c.width=o.width;c.height=o.height;c.getContext('2d').drawImage(o,0,0)}
function edClose(){$('#modal').hidden=true;ed=null;V.doc()}
async function edReset(){ed.p.edit=null;ed.p.params=null;await doSave();edClose()}
async function edSave(){const o=rend(ed.bmp,ed.s,3000);ed.p.edit=await new Promise(r=>o.toBlob(r,'image/jpeg',.92));ed.p.params={...ed.s};await doSave();edClose()}
// ---- Layout & PDF
async function build(){const{doc:d,photos:ph}=cur;if(!ph.length)throw Error('Belum ada foto');
const prep=await seq(ph,async p=>{const b=await createImageBitmap(p.edit||p.orig),s=Math.min(1,1500/Math.max(b.width,b.height)),c=document.createElement('canvas');c.width=Math.round(b.width*s);c.height=Math.round(b.height*s);c.getContext('2d').drawImage(b,0,0,c.width,c.height);b.close&&b.close();return{w:c.width,h:c.height,url:c.toDataURL('image/jpeg',.8)}});
const L=d.orient==='l',W=L?297:210,H=L?210:297,m=+d.margin||10,g=+d.gap||4,n=ph.length;
const pdf=new window.jspdf.jsPDF({orientation:L?'l':'p',unit:'mm',format:'a4'});
const pp=Math.min(n,d.mode==='pages'?Math.ceil(n/Math.max(1,+d.val||1)):d.mode==='per'?Math.max(1,+d.val||1):(L?6:4));
const hh=(d.title?9:0)+(d.subtitle?6:0)+(d.title||d.subtitle?3:0);
let best=null;for(let c=1;c<=Math.min(pp,8);c++){const r=Math.ceil(pp/c),cw=(W-2*m-g*(c-1))/c,ch=(H-2*m-hh-g*(r-1))/r,fw=Math.min(cw,(ch-15)*.7),sc=fw*fw/.7;if(!best||sc>best.sc)best={c,r,cw,ch,sc}}
const{c:cols,cw,ch}=best;pdf.setFontSize(8);const items=[];
ph.forEach((p,i)=>{const k=i%pp,x=m+(k%cols)*(cw+g),y=m+hh+Math.floor(k/cols)*(ch+g);
pdf.setFont('helvetica','bold');const cl=p.cap?pdf.splitTextToSize(p.cap,cw):[];pdf.setFont('helvetica','normal');const tl=pdf.splitTextToSize('Dokumentasi: '+fmt(p.ts),cw);
const fh=(cl.length+tl.length)*3.5+3,ih=Math.max(5,ch-fh),a=prep[i].w/prep[i].h;let w=cw,h=w/a;if(h>ih){h=ih;w=h*a}
items.push({pg:Math.floor(i/pp),x,y,w,h,img:prep[i].url,cl,tl,fy:y+h+3.5,cw,ih})});
const pages=Math.ceil(n/pp),warn=Math.min(...items.map(t=>Math.min(t.w,t.h)))<40;
for(let pg=0;pg<pages;pg++){if(pg)pdf.addPage();let fs=14;pdf.setFont('helvetica','bold');if(d.title){pdf.setFontSize(fs);while(pdf.getTextWidth(d.title)>W-2*m&&fs>7)pdf.setFontSize(--fs);pdf.text(d.title,W/2,m+5,{align:'center'})}
if(d.subtitle){pdf.setFont('helvetica','normal');pdf.setFontSize(10);pdf.text(d.subtitle,W/2,m+(d.title?11:5),{align:'center'})}
items.filter(t=>t.pg===pg).forEach(t=>{pdf.addImage(t.img,'JPEG',t.x,t.y,t.w,t.h);pdf.setFontSize(8);pdf.setFont('helvetica','bold');pdf.text(t.cl,t.x,t.fy);pdf.setFont('helvetica','normal');pdf.text(t.tl,t.x,t.fy+t.cl.length*3.5)})}
return{pdf,items,pages,pp,W,H,m,warn}}
async function preview(){try{toast('Membuat preview…');await doSave();const r=await build(),d=cur.doc,s=320/r.W,box=$('#modal');box.hidden=false;
box.innerHTML=`<h3>Preview: ${r.pages} halaman, ±${r.pp} foto/halaman</h3>${r.warn?'<div class=warn>Foto sangat kecil di layout ini; keterbacaan mungkin berkurang. Pertimbangkan menambah halaman.</div>':''}<div id=pv></div><button onclick="$('#modal').hidden=true">Tutup</button>`;
const imgs=await Promise.all(r.items.map(t=>new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.src=t.img})));
for(let pg=0;pg<r.pages;pg++){const c=document.createElement('canvas');c.width=r.W*s;c.height=r.H*s;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.fillStyle='#000';x.textAlign='center';
x.font=`bold ${14*.3528*s}px sans-serif`;if(d.title)x.fillText(d.title,c.width/2,(r.m+5)*s,(r.W-2*r.m)*s);x.font=`${10*.3528*s}px sans-serif`;if(d.subtitle)x.fillText(d.subtitle,c.width/2,(r.m+(d.title?11:5))*s,(r.W-2*r.m)*s);x.textAlign='left';
r.items.forEach((t,i)=>{if(t.pg!==pg)return;x.drawImage(imgs[i],t.x*s,t.y*s,t.w*s,t.h*s);x.font=`bold ${8*.3528*s}px sans-serif`;t.cl.forEach((l,j)=>x.fillText(l,t.x*s,(t.fy+j*3.5)*s));x.font=`${8*.3528*s}px sans-serif`;t.tl.forEach((l,j)=>x.fillText(l,t.x*s,(t.fy+(t.cl.length+j)*3.5)*s))});
$('#pv').append(c)}}catch(e){toast(e.message)}}
async function exportPdf(){try{toast('Membuat PDF…');await doSave();const r=await build(),b=r.pdf.output('blob'),name=`Dokumentasi_Struk_${new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Jakarta'})}.pdf`;
cur.doc.pdfs.push({at:new Date().toISOString(),pages:r.pages});await doSave();
const f=new File([b],name,{type:'application/pdf'});if(navigator.canShare&&navigator.canShare({files:[f]})&&confirm('Bagikan PDF lewat menu berbagi Android? (Batal = unduh)')){try{await navigator.share({files:[f]});return}catch{}}
const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();toast(r.warn?'PDF dibuat. Peringatan: foto kecil, keterbacaan mungkin berkurang':'PDF dibuat')}catch(e){toast(e.message)}}
// ---- Arsip
V.arc=async()=>{const d=(await all('documents')).sort((a,b)=>b.created.localeCompare(a.created)),p=await all('photos');M.innerHTML=`<h2>Arsip</h2>${d.length?'':'<p>Belum ada dokumen.</p>'}${d.map(x=>`<div class=box><b>${esc(x.title||'(tanpa judul)')}</b><br><small>${fmt(x.created)} · ${p.filter(q=>q.docId===x.id).length} foto · ${(x.pdfs||[]).length}× PDF</small><div class=row><button onclick="openDoc('${x.id}')">Buka</button><button class=d onclick="delDoc('${x.id}')">Hapus</button></div></div>`).join('')}`};
async function delDoc(id){if(!confirm('Hapus dokumen beserta semua fotonya?'))return;const ps=(await all('photos')).filter(p=>p.docId===id),tx=db.transaction(['documents','photos'],'readwrite');tx.objectStore('documents').delete(id);ps.forEach(p=>tx.objectStore('photos').delete(p.id));await done(tx);if(cur&&cur.doc.id===id)cur=null;V.arc()}
// ---- Setelan, backup, restore
V.set=async()=>{const e=await est(),pe=navigator.storage&&navigator.storage.persisted?await navigator.storage.persisted():false;M.innerHTML=`<h2>Setelan</h2><div class=box>${e?`Terpakai ${mb(e.usage)} / ±${mb(e.quota)}<br>`:''}Penyimpanan persisten: <b>${pe?'aktif':'tidak aktif / tidak dijamin'}</b><br><small>Data tetap bisa hilang jika browser dibersihkan atau perangkat rusak. Backup wajib.</small></div>
<div class=box><button onclick="backup()">Backup Data (JSON)</button><small><br>File bisa besar karena foto disimpan Base64.</small></div>
<div class=box><b>Restore</b><select id=rm><option value=merge>Gabungkan dengan data lokal</option><option value=replace>Ganti seluruh data lokal</option></select><input type=file accept=".json,application/json" onchange="restore(this.files[0],$('#rm').value);this.value=''"></div>
<div class=box><button class=d onclick="wipe()">Hapus semua data lokal</button></div><small>v1.0 · tanpa backend, semua data lokal.</small>`};
const b64=b=>new Promise((r,j)=>{const f=new FileReader();f.onload=()=>r(f.result);f.onerror=j;f.readAsDataURL(b)});
async function backup(){try{toast('Membuat backup…');const d=await all('documents'),ps=await all('photos'),o={app:'PWA Dokumentasi Struk',backupVersion:1,createdAt:new Date().toISOString(),documents:d,photos:[],settings:{},qrHistory:[]};
for(const p of ps)o.photos.push({...p,orig:await b64(p.orig),edit:p.edit?await b64(p.edit):null});
const b=new Blob([JSON.stringify(o)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`Backup_Struk_${new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Jakarta'})}.json`;a.click();toast(`Backup: ${d.length} dokumen, ${ps.length} foto, ${mb(b.size)}`)}catch(e){toast('Backup gagal: '+e.message)}}
async function restore(f,mode){if(!f)return;try{const j=JSON.parse(await f.text());
if(j.app!=='PWA Dokumentasi Struk'||j.backupVersion!==1||!Array.isArray(j.documents)||!Array.isArray(j.photos))throw Error('Format backup tidak dikenali');
const ids=new Set(j.documents.map(d=>d&&d.id));if(ids.has(undefined))throw Error('Dokumen tidak valid');
for(const p of j.photos)if(typeof p.id!=='string'||!ids.has(p.docId)||typeof p.orig!=='string'||!p.orig.startsWith('data:image/')||(p.edit&&!String(p.edit).startsWith('data:image/')))throw Error('Data foto tidak lengkap/rusak');
const e=await est();if(e&&f.size>e.quota-e.usage)throw Error('Ruang penyimpanan tidak cukup');
if(!confirm(`Backup ${j.createdAt}: ${j.documents.length} dokumen, ${j.photos.length} foto (${mb(f.size)}).\n${mode==='replace'?'SEMUA data lokal akan DIGANTI.':'Akan digabung dengan data lokal.'} Lanjut?`))return;
toast('Memulihkan…');const ph=[];for(const p of j.photos)ph.push({...p,orig:await (await fetch(p.orig)).blob(),edit:p.edit?await (await fetch(p.edit)).blob():null});
const docs=j.documents.map(d=>({...d}));
if(mode==='merge'){const ed=new Set((await all('documents')).map(d=>d.id)),ep=new Set((await all('photos')).map(p=>p.id));docs.forEach(d=>{if(ed.has(d.id)){const n=uid();ph.forEach(p=>{if(p.docId===d.id)p.docId=n});d.id=n}});ph.forEach(p=>{if(ep.has(p.id))p.id=uid()})}
const tx=db.transaction(['documents','photos'],'readwrite');if(mode==='replace'){tx.objectStore('documents').clear();tx.objectStore('photos').clear()}
docs.forEach(d=>tx.objectStore('documents').put(d));ph.forEach(p=>tx.objectStore('photos').put(p));await done(tx);cur=null;toast('Restore berhasil');V.set()}catch(e){toast('Restore dibatalkan: '+e.message)}}
async function wipe(){if(!confirm('Hapus SEMUA data lokal?')||!confirm('Yakin? Tindakan ini tidak bisa dibatalkan. Sudah backup?'))return;const tx=db.transaction(['documents','photos','settings'],'readwrite');['documents','photos','settings'].forEach(n=>tx.objectStore(n).clear());await done(tx);cur=null;toast('Semua data dihapus');V.set()}
// ---- QR
let qs=null,qraf=0,qlast='';
V.qr=async()=>{M.innerHTML=`<h2>Scan QR</h2><select id=cams onchange="qrStart(this.value)"></select><div class=vid><video id=vd playsinline muted></video></div><div id=qres></div>`;qrStart()};
function qrStop(){cancelAnimationFrame(qraf);if(qs)qs.getTracks().forEach(t=>t.stop());qs=null}
async function qrStart(dev){qrStop();$('#qres').innerHTML='';try{qs=await navigator.mediaDevices.getUserMedia({video:dev?{deviceId:{exact:dev}}:{facingMode:{ideal:'environment'}}});const v=$('#vd');v.srcObject=qs;await v.play();
const s=$('#cams');if(!s.options.length)(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput').forEach((c,i)=>s.add(new Option(c.label||'Kamera '+(i+1),c.deviceId)));
const cv=document.createElement('canvas'),x=cv.getContext('2d',{willReadFrequently:true});
const tick=()=>{if(!qs)return;if(v.videoWidth){const k=Math.min(1,640/v.videoWidth);cv.width=v.videoWidth*k;cv.height=v.videoHeight*k;x.drawImage(v,0,0,cv.width,cv.height);const r=jsQR(x.getImageData(0,0,cv.width,cv.height).data,cv.width,cv.height);if(r&&r.data){qrStop();qrShow(r.data);return}}qraf=requestAnimationFrame(tick)};tick()}catch(e){$('#qres').innerHTML='<div class=warn>Kamera tidak tersedia atau izin ditolak: '+esc(e.message)+'</div>'}}
function qrShow(t){qlast=t;let u=null;try{const x=new URL(t);if(/^https?:$/.test(x.protocol))u=x.href}catch{}
$('#qres').innerHTML=`<div class=box><b>Hasil:</b><p style="word-break:break-all">${esc(t)}</p><div class=row>${u?`<a class=btn href="${esc(u)}" target=_blank rel=noopener style="text-align:center;text-decoration:none;line-height:28px">Buka URL</a>`:''}<button class=s onclick="navigator.clipboard.writeText(qlast).then(()=>toast('Disalin'))">Salin</button><button class=s onclick="qrStart($('#cams').value||undefined)">Scan Lagi</button></div></div>`}
// ---- init
const upOff=()=>$('#off').hidden=navigator.onLine;addEventListener('online',upOff);addEventListener('offline',upOff);upOff();
(async()=>{try{db=await openDB();if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js').catch(()=>{});go('home')}catch(e){M.innerHTML='<div class=warn>IndexedDB tidak tersedia: '+esc(e.message)+'</div>'}})();
