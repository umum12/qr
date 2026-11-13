'use strict';
// ===== Inisialisasi: unduh -> simpan ke Cache Storage (via Service Worker) -> verifikasi -> baru "siap" =====
(()=>{const B=$('#boot'),T=B.querySelector('h2'),S=B.querySelector('small'),P=B.querySelector('.pb i'),A=$('#bootRetry'),K=$('#bootSkip'),hadCtl=!!(navigator.serviceWorker&&navigator.serviceWorker.controller);let wd=0,done=false,last=0;
const set=(h,s,p)=>{if(h)T.textContent=h;if(s!==undefined)S.textContent=s;if(p!=null)P.style.width=p+'%'};
const arm=()=>{clearTimeout(wd);wd=setTimeout(()=>fail('Proses terlalu lama','Periksa koneksi lalu Coba lagi, atau lanjutkan tanpa mode offline.'),30000)};
const finish=()=>{if(done)return;done=true;clearTimeout(wd);document.body.classList.remove('booting');B.classList.add('out');setTimeout(()=>B.remove(),400);afterBoot()};
const fail=(h,s)=>{if(done)return;clearTimeout(wd);B.classList.add('err');set(h,s,0);A.hidden=false;K.hidden=false};
const timeout=(p,ms,msg)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(Error(msg)),ms))]);
const call=(sw,msg,onp,ms)=>new Promise((res,rej)=>{const ch=new MessageChannel(),t=ms&&setTimeout(()=>rej(Error('SW tidak merespons')),ms);ch.port1.onmessage=e=>{if(e.data.type==='p'){arm();onp&&onp(e.data);return}clearTimeout(t);res(e.data)};sw.postMessage(msg,[ch.port2])});
function showUpd(v){if($('#upd'))return;const d=document.createElement('div');d.id='upd';d.innerHTML=`<span>Versi baru tersedia${v?' ('+v+')':''}</span><button id="updb">Muat ulang</button>`;document.body.append(d);$('#updb').onclick=()=>location.reload()}
async function chk(){last=Date.now();if(!navigator.onLine)return;try{const t=await(await fetch('js/resources.js',{cache:'no-store'})).text(),m=t.match(/APP_VERSION\s*=\s*'([^']+)'/);if(m&&m[1]!==APP_VERSION)showUpd(m[1])}catch{}}
function afterBoot(){if(!('serviceWorker' in navigator))return;if(hadCtl)navigator.serviceWorker.addEventListener('controllerchange',()=>showUpd());chk();document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-last>30*60*1000)chk()})}
async function run(){B.classList.remove('err');A.hidden=true;K.hidden=true;arm();set('Memeriksa aplikasi…','',8);
 if(!('serviceWorker' in navigator)||!window.caches){set('Mode offline tidak didukung browser ini','Aplikasi berjalan online',100);return setTimeout(finish,1200)}
 try{const reg=await navigator.serviceWorker.register('service-worker.js');try{await reg.update()}catch{}
  const w=reg.installing||reg.waiting||reg.active;if(w&&w.state!=='activated'&&w.state!=='redundant')await new Promise(r=>{w.addEventListener('statechange',()=>{if(w.state==='activated'||w.state==='redundant')r()});setTimeout(r,8000)});
  if(w&&w.state==='redundant'&&!reg.active)throw Error('Service worker gagal dipasang');
  await timeout(navigator.serviceWorker.ready,10000,'Service worker tidak aktif');const sw=reg.active,h=await call(sw,{type:'HELLO'},null,4000).catch(()=>null);
  if(!h||h.version!==APP_VERSION){if(!sessionStorage.getItem('boot-rl')){sessionStorage.setItem('boot-rl','1');return location.reload()}return fail('Versi aplikasi belum sinkron','Tutup aplikasi lalu buka lagi, tekan Coba lagi, atau lanjutkan tanpa mode offline.')}
  sessionStorage.removeItem('boot-rl');let v=await call(sw,{type:'VERIFY'},null,15000),opt=[];
  if(!v.ok){if(!navigator.onLine)return fail('Butuh koneksi internet',`Pembukaan pertama harus online untuk mengunduh resource (${v.missing.length} file belum tersimpan).`);
   set('Mengunduh resource aplikasi…','Menyiapkan…',10);
   const r=await call(sw,{type:'PRECACHE'},d=>set(null,`${d.done}/${d.total} · ${d.name}`,10+d.done/d.total*80),180000);opt=r.optMissing||[];
   if(!r.ok)return fail('Pengunduhan belum lengkap','Gagal: '+r.missing.slice(0,3).join(', ')+(r.missing.length>3?' …':'')+'. Periksa koneksi lalu coba lagi.');
   set('Memverifikasi resource…','',95);v=await call(sw,{type:'VERIFY',deep:true},null,30000);if(!v.ok)return fail('Verifikasi gagal',`${v.missing.length} file belum lengkap. Coba lagi.`)}
  set('Aplikasi siap ✓',`${v.count} resource tersimpan untuk mode offline`+(opt.length?` (${opt.length} opsional tidak terunduh)`:''),100);setTimeout(finish,v.count&&!opt.length?600:1500)}
 catch(e){fail('Gagal menyiapkan aplikasi',e.message)}}
A.onclick=run;K.onclick=()=>{toast('Mode offline belum aktif — aplikasi berjalan online');finish()};run();
window.checkRes=async()=>{try{const reg=await navigator.serviceWorker.ready,v=await call(reg.active,{type:'VERIFY',deep:true},null,20000);toast(v.ok?`Resource offline lengkap (${v.count} file)`:`Belum lengkap: ${v.missing.length} file. Buka ulang aplikasi saat online`)}catch(e){toast('Tidak bisa memeriksa: '+e.message)}}})();
