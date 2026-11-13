'use strict';
const _cl=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
// ===== v1.8: kamera portrait + flash/zoom/suara; Scan QR dengan notifikasi suara & redirect otomatis 5 detik =====
Object.assign(IC,{zap:'<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
 zapoff:'<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/><path d="m2 2 20 20"/>',
 vol:'<path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.4 18.4a9 9 0 0 0 0-12.8"/>',
 volx:'<path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/>'});
// ---- Suara (WebAudio, tanpa file) — konteks dibuka setelah interaksi pertama pengguna
const sfx=(()=>{let ctx=null;const get=()=>{try{ctx=ctx||new(window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')ctx.resume()}catch{ctx=null}return ctx};
 const tone=(f,t0,d,v)=>{const c=get();if(!c)return;const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+t0;o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+d+.02)};
 return{unlock:get,success(){tone(880,0,.14,.25);tone(1318,.12,.24,.25)},
  shutter(){const c=get();if(!c)return;const n=Math.floor(c.sampleRate*.05),b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,3);
   [0,.075].forEach(o=>{const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();f.type='highpass';f.frequency.value=1500;g.gain.value=.55;s.buffer=b;s.connect(f);f.connect(g);g.connect(c.destination);s.start(c.currentTime+o)})}}})();
{const ev=['pointerup','touchend','click','keydown'],un=()=>{sfx.unlock();ev.forEach(e=>removeEventListener(e,un))};ev.forEach(e=>addEventListener(e,un,{passive:true}))}
// ---- Kamera dokumentasi (portrait, layar penuh)
openCam=async function(){if(cam)return;const o=document.createElement('div');o.id='cam';o.className='v2';
 o.innerHTML=`<div class=cstage id=cst><div class=cw id=cw><video id=cv playsinline muted autoplay></video><canvas id=co></canvas><div class=flash id=cf></div></div>
<div class=ctop><button class=ib onclick="closeCam()" aria-label="Tutup">${ic('x',20)}</button><b id=cn>Kamera</b><div class=cgrp><button class=ib id=cfl onclick="camFlash()" aria-label="Flash"></button><button class=ib id=csn onclick="camSound()" aria-label="Suara shutter"></button><button class=ib id=csw hidden onclick="camSwitch()" aria-label="Ganti kamera">${ic('rotate',20)}</button></div></div>
<div class=chip id=cs>Memulai kamera…</div>
<div class=czoom><span id=czl></span><input type=range id=czr hidden min=1 max=1 step=.1 value=1 oninput="camZoom(+this.value)" aria-label="Zoom"></div></div>
<div class=cb><button class=cs2 id=cauto onclick="camAuto()">${ic('eye',18)}<span>Auto</span></button><button class=shut id=csh onclick="camShot()" aria-label="Ambil foto"></button><button class=cs2 onclick="closeCam()"><span>Selesai</span></button></div>`;
 document.body.append(o);cam={o,stream:null,corners:null,manual:false,stable:0,miss:0,n:0,devs:[],di:0,busy:false,run:true,t:0,err:0,sound:localStorage.getItem('cam-sound')!=='0',torch:false,cap:null,zoom:1,view:null};camUI();sfx.unlock();
 try{const l=screen.orientation&&screen.orientation.lock&&screen.orientation.lock('portrait');l&&l.catch&&l.catch(()=>{})}catch{}await camStart()};
// area video yang terlihat (cover): fraksi 0..1 dari frame asli
function camView(va,ba){return va>ba?{x:(1-ba/va)/2,y:0,w:ba/va,h:1}:{x:0,y:(1-va/ba)/2,w:1,h:va/ba}}
function camFit(){const c=cam,v=$('#cv'),w=$('#cw'),st=$('#cst');if(!c||!v||!w||!st||!v.videoWidth||!st.clientHeight)return;const ba=st.clientWidth/st.clientHeight;c.view=camView(v.videoWidth/v.videoHeight,ba);
 w.style.cssText='position:absolute;inset:0';if(!c.sc)c.sc=document.createElement('canvas');c.sc.width=240;c.sc.height=Math.max(1,Math.round(240/ba));camSize();camDraw()}
addEventListener('resize',()=>{if(cam)camFit()});
camStart=async function(dev){camStop();const c=cam;if(!c)return;const my=c.gen=(c.gen||0)+1;try{if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw Error('Browser tidak mendukung kamera');
 const por=innerHeight>innerWidth,vc={width:{ideal:por?1440:2560},height:{ideal:por?2560:1440},frameRate:{ideal:30}};if(dev)vc.deviceId={exact:dev};else vc.facingMode={ideal:'environment'};
 const st=await navigator.mediaDevices.getUserMedia({video:vc,audio:false});if(cam!==c||!c.run||my!==c.gen){st.getTracks().forEach(t=>t.stop());return}c.stream=st;const v=$('#cv');v.srcObject=st;await v.play();if(cam!==c||my!==c.gen)return;
 if(!c.devs.length){c.devs=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput');$('#csw').hidden=c.devs.length<2;const id=c.stream.getVideoTracks()[0].getSettings().deviceId;c.di=Math.max(0,c.devs.findIndex(d=>d.deviceId===id))}
 const t=c.stream.getVideoTracks()[0];t.onended=()=>camLost(c);let cap={};try{cap=t.getCapabilities?t.getCapabilities():{}}catch{}c.cap=cap;if(!cap.torch)c.torch=false;c.zoom=cap.zoom?cap.zoom.min:1;camUI();await camTorch();
 c.corners=null;c.manual=false;c.sc=document.createElement('canvas');c.sc.width=240;c.sc.height=Math.max(1,Math.round(240*v.videoHeight/v.videoWidth));camFit();bindDrag();camStatus('Arahkan ke dokumen');camDraw();camLoop()}
 catch(e){if(c.stream&&(cam!==c||!c.run)){c.stream.getTracks().forEach(t=>t.stop());c.stream=null}camFail(e)}};
function camUI(){const c=cam;if(!c||!$('#cfl'))return;const cap=c.cap||{},f=$('#cfl'),s=$('#csn'),z=cap.zoom,r=$('#czr');
 f.innerHTML=ic(c.torch?'zap':'zapoff',20);f.classList.toggle('on',!!c.torch);f.classList.toggle('na',!cap.torch);f.setAttribute('aria-pressed',!!c.torch);
 s.innerHTML=ic(c.sound?'vol':'volx',20);s.classList.toggle('na',!c.sound);s.setAttribute('aria-pressed',!!c.sound);
 if(z&&z.max>z.min){r.hidden=false;r.min=z.min;r.max=z.max;r.step=z.step||.1;r.value=c.zoom;$('#czl').textContent=(+c.zoom).toFixed(1)+'×'}else{r.hidden=true;$('#czl').textContent='Zoom tidak tersedia di kamera ini'}}
async function camTorch(){const t=cam&&cam.stream&&cam.stream.getVideoTracks()[0];if(!t||!cam.cap||!cam.cap.torch)return;try{await t.applyConstraints({advanced:[{torch:!!cam.torch}]})}catch{cam.torch=false;camUI();toast('Flash gagal diaktifkan')}}
async function camFlash(){const c=cam;if(!c)return;if(!c.cap||!c.cap.torch){toast('Flash tidak didukung kamera ini');return}c.torch=!c.torch;await camTorch();camUI()}
function camSound(){const c=cam;if(!c)return;c.sound=!c.sound;try{localStorage.setItem('cam-sound',c.sound?'1':'0')}catch{}camUI();if(c.sound)sfx.shutter()}
function camZoom(v){const c=cam;if(!c)return;c.zoom=v;$('#czl').textContent=v.toFixed(1)+'×';clearTimeout(c.zt);c.zt=setTimeout(async()=>{const t=c.stream&&c.stream.getVideoTracks()[0];if(!t)return;try{await t.applyConstraints({advanced:[{zoom:v}]})}catch{}},40)}
camShot=async function(){const c=cam,v=$('#cv');if(!c||c.busy||!v||!v.videoWidth)return;c.busy=true;$('#csh').disabled=true;if(c.sound)sfx.shutter();
 try{let cn=c.corners?c.corners.map(a=>[...a]):null;const W=v.videoWidth,Hh=v.videoHeight,vw=c.view||{x:0,y:0,w:1,h:1};
  if(cn&&!c.manual){const mx=cn.reduce((s,p)=>s+p[0],0)/4,my=cn.reduce((s,p)=>s+p[1],0)/4;cn=cn.map(([x,y])=>[_cl(x+(x-mx)*.03),_cl(y+(y-my)*.03)])}
  const f=document.createElement('canvas'),fx=f.getContext('2d');
  if(cn){f.width=W;f.height=Hh;fx.drawImage(v,0,0);cn=cn.map(([x,y])=>[vw.x+x*vw.w,vw.y+y*vw.h])}
  else{f.width=Math.round(vw.w*W);f.height=Math.round(vw.h*Hh);fx.drawImage(v,vw.x*W,vw.y*Hh,vw.w*W,vw.h*Hh,0,0,f.width,f.height)}
  const orig=await new Promise(r=>f.toBlob(r,'image/jpeg',.92));let edit=null,params=null;
  if(cn){try{const w=warpC(f,cn,procMax());edit=await new Promise(r=>w.toBlob(r,'image/jpeg',.9));params={v:2,rot:0,mode:'orig',b:0,c:0,sh:0,corners:cn}}catch{edit=null;params=null}}
  const p={id:uid(),docId:cur.doc.id,orig,edit,params,thumb:null,cap:'',ts:new Date().toISOString(),tsEdited:false,order:cur.photos.length,src:'kamera'};
  p.thumb=await mkThumb(edit||orig);p.ar=mkThumb.last;cur.photos.push(p);await doSave();c.n++;$('#cn').textContent=c.n+' foto';
  const fl=$('#cf');if(fl){fl.classList.remove('on');void fl.offsetWidth;fl.classList.add('on')}navigator.vibrate&&navigator.vibrate(25);toast(edit?'Tersimpan · dokumen diluruskan':'Tersimpan')}
 catch(e){toast('Gagal menyimpan foto: '+e.message)}finally{c.busy=false;const b=$('#csh');if(b)b.disabled=false}};
// deteksi memakai area yang sama dengan yang terlihat di layar
camLoop=function(){const c=cam;if(!c||!c.run)return;clearTimeout(c.t);const step=()=>{if(cam!==c||!c.run)return;const t0=performance.now(),v=$('#cv');
 if(!c.manual&&!document.hidden&&v&&v.videoWidth&&c.view){try{const w=v.videoWidth,h=v.videoHeight,q=c.view;c.sc.getContext('2d',{willReadFrequently:true}).drawImage(v,q.x*w,q.y*h,q.w*w,q.h*h,0,0,c.sc.width,c.sc.height);const r=detect(c.sc);camUpdate(r&&qArea(r)>.1?r:null)}
  catch(e){if(++c.err>3){c.manual=true;camStatus('Deteksi otomatis nonaktif — atur sudut manual')}}}
 c.t=setTimeout(step,performance.now()-t0>45?260:130)};step()};
const _cc=closeCam;closeCam=function(s){try{screen.orientation&&screen.orientation.unlock&&screen.orientation.unlock()}catch{}return _cc(s)};
// ---- Scan QR
// QR-START
const QR_DELAY=5000;let qrT=null,qrCur=null;
function qrValid(t){try{const x=new URL(String(t).trim());return(x.protocol==='http:'||x.protocol==='https:')&&x.hostname?x.href:null}catch{return null}}
function qrCancel(silent){if(qrT){clearInterval(qrT);qrT=null}const w=$('#cdw');if(w&&!silent)w.textContent='Redirect otomatis dibatalkan.'}
function qrGo(u){if(!/^https?:\/\//i.test(u))return;qrStop();location.assign(u)}
function qrCountdown(u){const end=Date.now()+QR_DELAY;qrT=setInterval(()=>{const ms=end-Date.now(),n=$('#cdn'),b=$('#cdb');if(!n){qrCancel(true);return}if(ms<=0){qrCancel(true);qrGo(u);return}n.textContent=Math.ceil(ms/1000);b.style.width=(100-ms/QR_DELAY*100)+'%'},100)}
function qrRisk(u){const x=new URL(u),w=[],h=x.hostname;let block=false;if(x.protocol==='http:')w.push('Tidak terenkripsi (http)');if(/^\d{1,3}(\.\d{1,3}){3}$/.test(h)||h.includes(':'))w.push('Alamat berupa IP');
 if(h.split('.').some(s=>s.startsWith('xn--'))){w.push('Domain punycode (bisa menyerupai domain lain)');block=true}if(x.username||x.password){w.push('Mengandung nama pengguna/kata sandi di URL');block=true}return{w,block,host:h}}
qrShow=function(t){qrCancel(true);const u=qrValid(t),rk=u?qrRisk(u):null,auto=!!u&&!rk.block;qrCur={text:t,url:u};qlast=t;sfx.success();navigator.vibrate&&navigator.vibrate(40);const r=$('#qres');if(!r)return;r.hidden=false;
 r.innerHTML=`<span class=tag>${u?'Tautan':'Teks'}</span>${u?`<div class=qhost>${esc(rk.host)}</div><a class=qlink href="${esc(u)}" target=_blank rel=noopener onclick="qrCancel()">${esc(u)}</a>${rk.w.length?`<div class=qwarn>⚠ ${rk.w.map(esc).join(' · ')}</div>`:''}${auto?`<div id=cdw class=cdw>Membuka otomatis dalam <b id=cdn>${QR_DELAY/1000}</b> detik…<div class=cdbar><i id=cdb></i></div></div>`:`<div class=cdw>Redirect otomatis dinonaktifkan untuk tautan ini. Buka hanya jika Anda percaya.</div>`}`:`<p class=res>${esc(t)}</p>`}
 <div class=row>${u?`<a class=btn href="${esc(u)}" target=_blank rel=noopener style="text-decoration:none" onclick="qrCancel()">${ic('link',18)}<span>Buka Sekarang</span></a>`:''}${auto?B('x','Batalkan','s','qrCancel()'):''}${B('copy','Salin','s',"navigator.clipboard.writeText(qlast).then(()=>toast('Disalin'))")}${B('rotate','Scan Lagi','s','qrAgain()')}</div>`;
 scrollTo({top:0,behavior:'smooth'});if(auto)qrCountdown(u)};
// QR-END
let qrGen=0;const _qstop=qrStop;qrStop=function(){qrGen++;_qstop()};
function qrAgain(){qrCancel(true);qrCur=null;const r=$('#qres');if(r)r.hidden=true;if(!qs){const s=$('#cams');qrStart(s&&s.value||undefined)}}
V.qr=async()=>{qrCancel(true);qrCur=null;M.innerHTML=`<div id=qwrap><section id=qres class="panel qres" hidden></section><section id=qcam class=panel><select id=cams onchange="qrStart(this.value)"></select><div class=scan><video id=vd playsinline muted></video></div><label class="btn s" style="width:100%;margin-top:10px">${ic('image',18)}<span>Pilih QR dari Galeri</span><input type=file accept="image/*" hidden onchange="qrFile(this.files[0]);this.value=''"></label><p id=qhint style="text-align:center"><small>Arahkan kamera ke QR Code</small></p></section></div>`;qrStart()};
qrStart=async function(dev){qrStop();const my=qrGen;try{const st=await navigator.mediaDevices.getUserMedia({video:dev?{deviceId:{exact:dev}}:{facingMode:{ideal:'environment'}}});if(my!==qrGen){st.getTracks().forEach(t=>t.stop());return}qs=st;qs.getVideoTracks()[0].onended=()=>qrLost();const v=$('#vd');if(!v){qrStop();return}v.srcObject=qs;await v.play();if(my!==qrGen)return;
 const s=$('#cams');if(s&&!s.options.length)(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput').forEach((c,i)=>s.add(new Option(c.label||'Kamera '+(i+1),c.deviceId)));
 const cv=document.createElement('canvas'),x=cv.getContext('2d',{willReadFrequently:true});let last=0;
 const tick=ts=>{if(!qs)return;qraf=requestAnimationFrame(tick);if(ts-last<110||!v.videoWidth)return;last=ts;const k=Math.min(1,640/v.videoWidth);cv.width=v.videoWidth*k;cv.height=v.videoHeight*k;x.drawImage(v,0,0,cv.width,cv.height);const r=jsQR(x.getImageData(0,0,cv.width,cv.height).data,cv.width,cv.height);if(r&&r.data&&(!qrCur||qrCur.text!==r.data))qrShow(r.data)};qraf=requestAnimationFrame(tick)}
 catch(e){const q=$('#qhint');if(q)q.innerHTML='<span class=warn style="display:block">Kamera tidak tersedia atau izin ditolak: '+esc(e.message)+'</span>'}};
const _qf=qrFile;qrFile=async function(f){if(!f)return;qrCancel(true);await _qf(f);const r=$('#qres');if(r&&r.innerHTML.trim()){r.hidden=false;scrollTo({top:0,behavior:'smooth'})}};
const _g8=go;go=async function(v){if(v!=='qr')qrCancel(true);return _g8(v)};
