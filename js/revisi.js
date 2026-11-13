'use strict';
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
['pointerup','touchend','click','keydown'].forEach(e=>addEventListener(e,()=>sfx.unlock(),{passive:true}));
// ---- Kamera dokumentasi (portrait, layar penuh)
openCam=async function(){if(cam)return;const o=document.createElement('div');o.id='cam';o.className='v2';
 o.innerHTML=`<div class=cw id=cw><video id=cv playsinline muted autoplay></video><canvas id=co></canvas><div class=flash id=cf></div></div>
<div class=ctop><button class=ib onclick="closeCam()" aria-label="Tutup">${ic('x',20)}</button><b id=cn>Kamera</b><div class=cgrp><button class=ib id=cfl onclick="camFlash()" aria-label="Flash"></button><button class=ib id=csn onclick="camSound()" aria-label="Suara shutter"></button><button class=ib id=csw hidden onclick="camSwitch()" aria-label="Ganti kamera">${ic('rotate',20)}</button></div></div>
<div class=chip id=cs>Memulai kamera…</div>
<div class=cbot><div class=czoom><span id=czl></span><input type=range id=czr hidden min=1 max=1 step=.1 value=1 oninput="camZoom(+this.value)" aria-label="Zoom"></div>
<div class=cb><button class=cs2 id=cauto onclick="camAuto()">${ic('eye',18)}<span>Auto</span></button><button class=shut id=csh onclick="camShot()" aria-label="Ambil foto"></button><button class=cs2 onclick="closeCam()"><span>Selesai</span></button></div></div>`;
 document.body.append(o);cam={o,stream:null,corners:null,manual:false,stable:0,miss:0,n:0,devs:[],di:0,busy:false,run:true,t:0,err:0,sound:localStorage.getItem('cam-sound')!=='0',torch:false,cap:null,zoom:1};camUI();sfx.unlock();
 try{const l=screen.orientation&&screen.orientation.lock&&screen.orientation.lock('portrait');l&&l.catch&&l.catch(()=>{})}catch{}await camStart()};
function camFit(){const c=cam,v=$('#cv'),w=$('#cw');if(!c||!v||!w||!v.videoWidth)return;const ar=v.videoWidth/v.videoHeight,W=c.o.clientWidth,H=c.o.clientHeight;let bw=W,bh=W/ar;if(bh>H){bh=H;bw=H*ar}
 w.style.cssText=`position:absolute;left:50%;top:50%;width:${bw}px;height:${bh}px;transform:translate(-50%,-50%)`;camSize();camDraw()}
addEventListener('resize',()=>{if(cam)camFit()});
camStart=async function(dev){camStop();const c=cam;if(!c)return;try{if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw Error('Browser tidak mendukung kamera');
 const por=innerHeight>innerWidth,vc={width:{ideal:por?1440:2560},height:{ideal:por?2560:1440},frameRate:{ideal:30}};if(dev)vc.deviceId={exact:dev};else vc.facingMode={ideal:'environment'};
 c.stream=await navigator.mediaDevices.getUserMedia({video:vc,audio:false});const v=$('#cv');v.srcObject=c.stream;await v.play();
 if(!c.devs.length){c.devs=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput');$('#csw').hidden=c.devs.length<2;const id=c.stream.getVideoTracks()[0].getSettings().deviceId;c.di=Math.max(0,c.devs.findIndex(d=>d.deviceId===id))}
 const t=c.stream.getVideoTracks()[0];let cap={};try{cap=t.getCapabilities?t.getCapabilities():{}}catch{}c.cap=cap;if(!cap.torch)c.torch=false;c.zoom=cap.zoom?cap.zoom.min:1;camUI();await camTorch();
 c.corners=null;c.manual=false;c.sc=document.createElement('canvas');c.sc.width=240;c.sc.height=Math.max(1,Math.round(240*v.videoHeight/v.videoWidth));camFit();bindDrag();camStatus('Arahkan ke dokumen');camDraw();camLoop()}
 catch(e){camFail(e)}};
function camUI(){const c=cam;if(!c||!$('#cfl'))return;const cap=c.cap||{},f=$('#cfl'),s=$('#csn'),z=cap.zoom,r=$('#czr');
 f.innerHTML=ic(c.torch?'zap':'zapoff',20);f.classList.toggle('on',!!c.torch);f.classList.toggle('na',!cap.torch);f.setAttribute('aria-pressed',!!c.torch);
 s.innerHTML=ic(c.sound?'vol':'volx',20);s.classList.toggle('na',!c.sound);s.setAttribute('aria-pressed',!!c.sound);
 if(z&&z.max>z.min){r.hidden=false;r.min=z.min;r.max=z.max;r.step=z.step||.1;r.value=c.zoom;$('#czl').textContent=(+c.zoom).toFixed(1)+'×'}else{r.hidden=true;$('#czl').textContent='Zoom tidak tersedia di kamera ini'}}
async function camTorch(){const t=cam&&cam.stream&&cam.stream.getVideoTracks()[0];if(!t||!cam.cap||!cam.cap.torch)return;try{await t.applyConstraints({advanced:[{torch:!!cam.torch}]})}catch{cam.torch=false;camUI();toast('Flash gagal diaktifkan')}}
async function camFlash(){const c=cam;if(!c)return;if(!c.cap||!c.cap.torch){toast('Flash tidak didukung kamera ini');return}c.torch=!c.torch;await camTorch();camUI()}
function camSound(){const c=cam;if(!c)return;c.sound=!c.sound;try{localStorage.setItem('cam-sound',c.sound?'1':'0')}catch{}camUI();if(c.sound)sfx.shutter()}
function camZoom(v){const c=cam;if(!c)return;c.zoom=v;$('#czl').textContent=v.toFixed(1)+'×';clearTimeout(c.zt);c.zt=setTimeout(async()=>{const t=c.stream&&c.stream.getVideoTracks()[0];if(!t)return;try{await t.applyConstraints({advanced:[{zoom:v}]})}catch{}},40)}
const _shot=camShot;camShot=async function(){const c=cam;if(c&&!c.busy&&c.sound)sfx.shutter();return _shot()};
const _cc=closeCam;closeCam=function(s){try{screen.orientation&&screen.orientation.unlock&&screen.orientation.unlock()}catch{}return _cc(s)};
// ---- Scan QR
// QR-START
const QR_DELAY=5000;let qrT=null,qrCur=null;
function qrValid(t){try{const x=new URL(String(t).trim());return(x.protocol==='http:'||x.protocol==='https:')&&x.hostname?x.href:null}catch{return null}}
function qrCancel(silent){if(qrT){clearInterval(qrT);qrT=null}const w=$('#cdw');if(w&&!silent)w.textContent='Redirect otomatis dibatalkan.'}
function qrGo(u){if(!/^https?:\/\//i.test(u))return;qrStop();location.assign(u)}
function qrCountdown(u){const end=Date.now()+QR_DELAY;qrT=setInterval(()=>{const ms=end-Date.now(),n=$('#cdn'),b=$('#cdb');if(!n){qrCancel(true);return}if(ms<=0){qrCancel(true);qrGo(u);return}n.textContent=Math.ceil(ms/1000);b.style.width=(100-ms/QR_DELAY*100)+'%'},100)}
qrShow=function(t){qrCancel(true);const u=qrValid(t);qrCur={text:t,url:u};qlast=t;sfx.success();navigator.vibrate&&navigator.vibrate(40);const r=$('#qres');if(!r)return;r.hidden=false;
 r.innerHTML=`<span class=tag>${u?'Tautan':'Teks'}</span>${u?`<a class=qlink href="${esc(u)}" target=_blank rel=noopener onclick="qrCancel()">${esc(u)}</a><div id=cdw class=cdw>Membuka otomatis dalam <b id=cdn>${QR_DELAY/1000}</b> detik…<div class=cdbar><i id=cdb></i></div></div>`:`<p class=res>${esc(t)}</p>`}
 <div class=row>${u?`<a class=btn href="${esc(u)}" target=_blank rel=noopener style="text-decoration:none" onclick="qrCancel()">${ic('link',18)}<span>Buka Sekarang</span></a>`:''}${u?B('x','Batalkan','s','qrCancel()'):''}${B('copy','Salin','s',"navigator.clipboard.writeText(qlast).then(()=>toast('Disalin'))")}${B('rotate','Scan Lagi','s','qrAgain()')}</div>`;
 scrollTo({top:0,behavior:'smooth'});if(u)qrCountdown(u)};
// QR-END
function qrAgain(){qrCancel(true);qrCur=null;const r=$('#qres');if(r)r.hidden=true;if(!qs){const s=$('#cams');qrStart(s&&s.value||undefined)}}
V.qr=async()=>{qrCancel(true);qrCur=null;M.innerHTML=`<div id=qwrap><section id=qres class="panel qres" hidden></section><section id=qcam class=panel><select id=cams onchange="qrStart(this.value)"></select><div class=scan><video id=vd playsinline muted></video></div><label class="btn s" style="width:100%;margin-top:10px">${ic('image',18)}<span>Pilih QR dari Galeri</span><input type=file accept="image/*" hidden onchange="qrFile(this.files[0]);this.value=''"></label><p id=qhint style="text-align:center"><small>Arahkan kamera ke QR Code</small></p></section></div>`;qrStart()};
qrStart=async function(dev){qrStop();try{qs=await navigator.mediaDevices.getUserMedia({video:dev?{deviceId:{exact:dev}}:{facingMode:{ideal:'environment'}}});const v=$('#vd');if(!v){qrStop();return}v.srcObject=qs;await v.play();
 const s=$('#cams');if(s&&!s.options.length)(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput').forEach((c,i)=>s.add(new Option(c.label||'Kamera '+(i+1),c.deviceId)));
 const cv=document.createElement('canvas'),x=cv.getContext('2d',{willReadFrequently:true});let last=0;
 const tick=ts=>{if(!qs)return;qraf=requestAnimationFrame(tick);if(ts-last<110||!v.videoWidth)return;last=ts;const k=Math.min(1,640/v.videoWidth);cv.width=v.videoWidth*k;cv.height=v.videoHeight*k;x.drawImage(v,0,0,cv.width,cv.height);const r=jsQR(x.getImageData(0,0,cv.width,cv.height).data,cv.width,cv.height);if(r&&r.data&&(!qrCur||qrCur.text!==r.data))qrShow(r.data)};qraf=requestAnimationFrame(tick)}
 catch(e){const q=$('#qhint');if(q)q.innerHTML='<span class=warn style="display:block">Kamera tidak tersedia atau izin ditolak: '+esc(e.message)+'</span>'}};
const _qf=qrFile;qrFile=async function(f){if(!f)return;qrCancel(true);await _qf(f);const r=$('#qres');if(r&&r.innerHTML.trim()){r.hidden=false;scrollTo({top:0,behavior:'smooth'})}};
const _g8=go;go=async function(v){if(v!=='qr')qrCancel(true);return _g8(v)};
