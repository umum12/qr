'use strict';
// ===== v1.9: perbaikan hasil audit (lihat BUG_AUDIT.md). Dimuat setelah revisi.js, sebelum boot.js =====
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const bmsg=m=>{const b=$('#busy'),s=b&&b.querySelector('span');if(s)s.textContent=m};            // ubah teks loading tanpa menambah hitungan
const procMax=()=>navigator.deviceMemory&&navigator.deviceMemory<=2?1600:2000;                  // M4: batas piksel pemrosesan
const okId=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{8,64}$/.test(s);                            // M6
let ARC=[];
// ---- C1: autosave (antrean tunggal, menyimpan objek yang benar walau `cur` sudah diganti)
let _sq=Promise.resolve(),_st=0;
function saveNow(){clearTimeout(_st);const c=cur;if(!c||!c.doc||!(c.photos.length||c.doc.updated))return _sq;_sq=_sq.then(()=>save(c)).catch(e=>{toast('Gagal menyimpan otomatis: '+e.message)});return _sq}
function saveSoon(){clearTimeout(_st);_st=setTimeout(saveNow,800)}
['input','change'].forEach(t=>document.addEventListener(t,e=>{if(view==='doc'&&e.target.closest&&e.target.closest('#main'))saveSoon()},true));
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveNow()});addEventListener('pagehide',()=>saveNow());
{const _mv=mv;mv=function(i,d){_mv(i,d);saveNow()};
 const _et=editTs;editTs=async function(i){await _et(i);saveNow()};
 const _od=openDoc;openDoc=async function(id){await saveNow();return _od(id)};
 const _nd=newDoc;newDoc=function(){saveNow();_nd()};
 const _g9=go;go=async function(v){if(view==='doc'&&v!=='doc')saveNow();return _g9(v)}}
qrGo=function(u){if(!/^https?:\/\//i.test(u))return;qrStop();Promise.race([saveNow(),sleep(1500)]).finally(()=>location.assign(u))};
// ---- L6: impor foto — satu overlay loading, teks diperbarui tanpa menumpuk hitungan
addFiles=async function(fs,src){const L=[...fs];let n=0;busy(true,'Memproses foto…');
 try{for(const f of L){bmsg(`Memproses foto ${++n}/${L.length}…`);const b=new Blob([await f.arrayBuffer()],{type:f.type||'image/jpeg'});
  cur.photos.push({id:uid(),docId:cur.doc.id,orig:b,edit:null,params:null,thumb:await mkThumb(b),ar:mkThumb.last,cap:'',ts:new Date().toISOString(),tsEdited:false,order:cur.photos.length,src});await doSave()}}
 catch(e){toast('Gagal menambah foto: '+e.message)}finally{busy(false)}V.doc()};
// ---- L7: foto yang tidak bisa didekode tidak dicoba ulang terus-menerus
const BAD=new WeakSet();
ensureThumbs=async function(){let i=0;for(const p of cur.photos){i++;if((!p.thumb||!p.ar)&&!BAD.has(p)){try{p.thumb=await mkThumb(p.edit||p.orig);p.ar=mkThumb.last;await put('photos',p);SG.delete(p)}catch{BAD.add(p);toast(`Foto ${i} tidak bisa dibaca (rusak?)`)}}}};
// ---- H1 + H2 + M3 + M6: backup v2 (satu baris per foto) & restore bertahap dengan rollback
// BACKUP-START
const toB64=b=>new Promise((res,rej)=>{const f=new FileReader();f.onload=()=>res(f.result);f.onerror=()=>rej(f.error);f.readAsDataURL(b)});
backup=async function(){busy(true,'Membuat backup…');try{const d=await all('documents'),ps=await all('photos'),parts=[new Blob([JSON.stringify({app:'PWA Dokumentasi Struk',backupVersion:2,createdAt:new Date().toISOString(),documents:d,photoCount:ps.length,settings:{},qrHistory:[]})+'\n'])];let i=0;
 for(const p of ps){bmsg(`Backup foto ${++i}/${ps.length}…`);parts.push(new Blob([JSON.stringify({...p,thumb:undefined,orig:await toB64(p.orig),edit:p.edit?await toB64(p.edit):null})+'\n']))}   // tiap baris langsung jadi Blob → string dilepas
 const b=new Blob(parts,{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`Backup_Struk_${new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Jakarta'})}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),60000);toast(`Backup: ${d.length} dokumen, ${ps.length} foto, ${mb(b.size)}`)}
 catch(e){toast('Backup gagal: '+e.message)}finally{busy(false)}};
async function* lineIter(f){const dec=new TextDecoder(),CH=4<<20;let buf='';for(let o=0;o<f.size;o+=CH){buf+=dec.decode(new Uint8Array(await f.slice(o,o+CH).arrayBuffer()),{stream:true});let i;while((i=buf.indexOf('\n'))>=0){const l=buf.slice(0,i);buf=buf.slice(i+1);if(l.trim())yield l}}buf+=dec.decode();if(buf.trim())yield buf}
const dataBlob=async u=>(await fetch(u)).blob();
async function restoreV2(f,mode){let head=null,n=0;const ids=new Set();
 try{for await(const l of lineIter(f)){   // Tahap 1: validasi seluruh file, belum menulis apa pun
   if(!head){head=JSON.parse(l);if(head.app!=='PWA Dokumentasi Struk'||head.backupVersion!==2||!Array.isArray(head.documents))throw Error('Format backup tidak dikenali');if(!head.documents.every(d=>d&&okId(d.id)))throw Error('ID dokumen tidak valid');head.documents.forEach(d=>ids.add(d.id));continue}
   const p=JSON.parse(l);n++;if(!okId(p.id)||!ids.has(p.docId)||typeof p.orig!=='string'||!p.orig.startsWith('data:image/')||(p.edit&&!String(p.edit).startsWith('data:image/')))throw Error(`Data foto ke-${n} tidak valid`);if(n%5===0)bmsg(`Memeriksa backup… ${n}`)}
  if(!head)throw Error('File kosong');if(n!==head.photoCount)throw Error(`Jumlah foto tidak cocok (${n} dari ${head.photoCount}); file mungkin terpotong`);
  const e=await est();if(e&&f.size>e.quota-e.usage)throw Error('Ruang penyimpanan tidak cukup');
  if(!confirm(`Backup ${head.createdAt}: ${head.documents.length} dokumen, ${n} foto (${mb(f.size)}).\n${mode==='replace'?'SEMUA data lokal akan DIGANTI setelah seluruh backup berhasil dibaca.':'Akan digabung dengan data lokal.'} Lanjut?`))return;
  const exDocs=new Set((await all('documents')).map(d=>d.id)),exPh=new Set((await all('photos')).map(p=>p.id)),dmap=new Map(),ins=new Set();
  head.documents.forEach(d=>dmap.set(d.id,mode==='merge'&&exDocs.has(d.id)?uid():d.id));
  try{let k=0,first=true;   // Tahap 2: tulis foto satu per satu (id bentrok diganti); gagal → rollback
   for await(const l of lineIter(f)){if(first){first=false;continue}const p=JSON.parse(l);let id=p.id;if(exPh.has(id)||ins.has(id))id=uid();
    const rec={...p,id,docId:dmap.get(p.docId),orig:await dataBlob(p.orig),edit:p.edit?await dataBlob(p.edit):null};delete rec.thumb;await put('photos',rec);ins.add(id);bmsg(`Memulihkan foto ${++k}/${n}…`)}
   const tx=db.transaction(['documents','photos'],'readwrite');   // Tahap 3: satu transaksi atomik
   if(mode==='replace'){exDocs.forEach(x=>tx.objectStore('documents').delete(x));exPh.forEach(x=>tx.objectStore('photos').delete(x))}
   head.documents.forEach(d=>tx.objectStore('documents').put({...d,id:dmap.get(d.id)}));await done(tx)}
  catch(err){for(const id of ins){try{await del('photos',id)}catch{}}throw err}
  cur=null;toast(`Restore berhasil: ${head.documents.length} dokumen, ${n} foto`);V.set()}
 catch(e){toast('Restore dibatalkan: '+e.message)}}
// BACKUP-END
{const _rs1=restore;restore=async function(f,mode){if(!f)return;let head='';try{head=await f.slice(0,300).text()}catch{}
 if(/"backupVersion":2/.test(head)){busy(true,'Memeriksa backup…');try{return await restoreV2(f,mode)}finally{busy(false)}}
 if(f.size>120*1048576&&!confirm('Backup format lama (v1) ini besar dan dibaca sekaligus ke memori; bisa gagal di HP RAM kecil. Lanjutkan?'))return;return _rs1(f,mode)}}
// ---- L2: jsPDF & jsQR dimuat sesuai kebutuhan (tetap ada di cache offline)
const LIBS={jspdf:['vendor/jspdf.umd.min.js',()=>window.jspdf],jsqr:['vendor/jsQR.js',()=>window.jsQR]},_lp={};
function need(k){if(LIBS[k][1]())return Promise.resolve();return _lp[k]||(_lp[k]=new Promise((res,rej)=>{const s=document.createElement('script');s.src=LIBS[k][0];s.onload=res;s.onerror=()=>{delete _lp[k];rej(Error('Gagal memuat '+k))};document.head.append(s)}))}
{const _l=lpRun;lpRun=async function(){await need('jspdf');return _l()};
 const _p=preview;preview=async function(){await need('jspdf');return _p()};
 const _e=exportPdf;exportPdf=async function(){await need('jspdf');return _e()};
 const _b=build;build=async function(){await need('jspdf');return _b()};
 const _q=qrStart;qrStart=async function(d){await need('jsqr').catch(()=>{});return _q(d)};
 const _f=qrFile;qrFile=async function(f){if(f)await need('jsqr');return _f(f)}}
setTimeout(()=>{need('jspdf').catch(()=>{});need('jsqr').catch(()=>{})},1500);
// ---- M1: tombol Back Android menutup overlay teratas (editor, preview, kamera, kalender)
const OV=[];let _hs=0;
function ovOpen(id,fn){if(OV.some(o=>o.id===id))return;OV.push({id,fn});history.pushState({ov:id},'')}
function ovClosed(id){const i=OV.findIndex(o=>o.id===id);if(i<0)return;OV.splice(i,1);if(history.state&&history.state.ov===id){_hs++;history.back()}}
addEventListener('popstate',()=>{if(_hs>0){_hs--;return}const o=OV.pop();if(o)o.fn()});
{const mo=$('#modal');new MutationObserver(()=>mo.hidden?ovClosed('modal'):ovOpen('modal',()=>{if(ed)edClose();else mo.hidden=true})).observe(mo,{attributes:true,attributeFilter:['hidden']});
 new MutationObserver(()=>{[['cam',()=>closeCam()],['dtp',()=>{const b=$('#dtp [data-a=cancel]');b&&b.click()}]].forEach(([id,fn])=>$('#'+id)?ovOpen(id,fn):ovClosed(id))}).observe(document.body,{childList:true})}
// ---- M2: kamera terputus / aplikasi kembali dari background
let _lost=0;
function camLost(c){if(cam!==c||!c.run||c.busy)return;if(++_lost>3){camStatus('Kamera terputus — tutup lalu buka lagi');return}camStatus('Kamera terputus — memulai ulang…');setTimeout(()=>{if(cam===c&&c.run){const d=c.devs[c.di];camStart(d&&d.deviceId)}},300)}
function qrLost(){if(view==='qr'&&qs){const s=$('#cams');setTimeout(()=>view==='qr'&&qrStart(s&&s.value||undefined),300)}}
document.addEventListener('visibilitychange',()=>{if(document.hidden)return;setTimeout(()=>{
 if(cam&&cam.run&&cam.stream){const t=cam.stream.getVideoTracks()[0],v=$('#cv');if(!t||t.readyState==='ended'){const d=cam.devs[cam.di];camStart(d&&d.deviceId)}else if(v&&v.paused)v.play().catch(()=>{})}
 if(view==='qr'&&qs){const t=qs.getVideoTracks()[0],v=$('#vd');if(!t||t.readyState==='ended')qrLost();else if(v&&v.paused)v.play().catch(()=>{})}},400)});
// ---- M7: penanganan error global
let _ge=0;const gerr=m=>{console.error(m);if(Date.now()-_ge<3000)return;_ge=Date.now();while(typeof _bz!=='undefined'&&_bz>0)busy(false);toast('Terjadi kesalahan: '+String(m).slice(0,90))};
addEventListener('error',e=>{if(!e.message||/ResizeObserver|Script error/.test(e.message))return;gerr(e.message)});
addEventListener('unhandledrejection',e=>{const r=e.reason;if(r&&(r.name==='AbortError'||r.name==='NotAllowedError'))return;gerr(r&&r.message||r)});
// ---- L3: pemeriksaan kelengkapan komponen (modul yang gagal dimuat tidak diam-diam hilang)
setTimeout(()=>{const miss=['go','V','cur','save','detect','warpC','camStart','qrStart','sfx','LayoutEngine','pickDT','layoutFor','_cl','instApp','backup','restoreV2'].filter(n=>{try{return typeof eval(n)==='undefined'}catch{return true}});if(miss.length){console.error('Komponen belum lengkap:',miss);toast('Sebagian komponen gagal dimuat ('+miss.join(', ')+'). Muat ulang aplikasi.')}},1500);
