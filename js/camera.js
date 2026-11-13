'use strict';
// ===== Kamera dokumentasi: getUserMedia + deteksi tepi real-time (memakai detect/warpC dari scanner.js) =====
let cam=null;
const qArea=c=>{let a=0;for(let i=0;i<4;i++){const[x1,y1]=c[i],[x2,y2]=c[(i+1)%4];a+=x1*y2-x2*y1}return Math.abs(a)/2};
async function openCam(){if(cam)return;const o=document.createElement('div');o.id='cam';
 o.innerHTML=`<div class=ct><button class=ib onclick="closeCam()" aria-label="Tutup">${ic('x',20)}</button><b id=cn>Kamera</b><button class=ib id=csw hidden onclick="camSwitch()" aria-label="Ganti kamera">${ic('rotate',20)}</button></div>
<div class=cw id=cw><video id=cv playsinline muted autoplay></video><canvas id=co></canvas><div class=chip id=cs>Memulai kamera…</div><div class=flash id=cf></div></div>
<div class=cb><button class=cs2 id=cauto onclick="camAuto()">${ic('eye',18)}<span>Auto</span></button><button class=shut id=csh onclick="camShot()" aria-label="Ambil foto"></button><button class=cs2 onclick="closeCam()"><span>Selesai</span></button></div>`;
 document.body.append(o);cam={o,stream:null,corners:null,manual:false,stable:0,miss:0,n:0,devs:[],di:0,busy:false,run:true,t:0,err:0};await camStart()}
async function camStart(dev){camStop();const c=cam;if(!c)return;try{if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw Error('Browser tidak mendukung kamera');
 const por=innerHeight>innerWidth,vc={width:{ideal:por?1440:2560},height:{ideal:por?2560:1440}};if(dev)vc.deviceId={exact:dev};else vc.facingMode={ideal:'environment'};
 c.stream=await navigator.mediaDevices.getUserMedia({video:vc,audio:false});const v=$('#cv');v.srcObject=c.stream;await v.play();
 if(!c.devs.length){c.devs=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput');$('#csw').hidden=c.devs.length<2;const id=c.stream.getVideoTracks()[0].getSettings().deviceId;c.di=Math.max(0,c.devs.findIndex(d=>d.deviceId===id))}
 const ar=v.videoWidth/v.videoHeight,w=$('#cw');w.style.aspectRatio=ar;w.style.width=`min(100%,${58*ar}vh)`;c.corners=null;c.manual=false;c.sc=document.createElement('canvas');c.sc.width=240;c.sc.height=Math.max(1,Math.round(240/ar));camSize();bindDrag();camStatus('Arahkan ke dokumen');camDraw();camLoop()}
 catch(e){camFail(e)}}
function camStop(){const c=cam;if(c){clearTimeout(c.t);if(c.stream){c.stream.getTracks().forEach(t=>t.stop());c.stream=null}}}
function camSwitch(){const c=cam;if(!c||!c.devs.length)return;c.di=(c.di+1)%c.devs.length;camStart(c.devs[c.di].deviceId)}
function closeCam(skip){const c=cam;if(!c)return;c.run=false;camStop();c.o.remove();cam=null;if(skip!==1)V.doc()}
function camFail(e){const c=cam;if(!c)return;c.o.classList.add('fail');const w=$('#cw');if(w)w.outerHTML=`<div class=cf><p>Kamera langsung tidak tersedia (${esc(e.name||e.message)}).<br><small>Anda tetap bisa memotret dengan kamera bawaan HP.</small></p><label class=btn>${ic('camera',18)}<span>Pakai kamera bawaan</span><input type=file accept="image/*" capture=environment hidden onchange="const f=this.files;closeCam(1);addFiles(f,'kamera')"></label></div>`}
function camSize(){const cv=$('#co');if(!cv)return;const r=$('#cw').getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);cv.width=Math.round(r.width*d);cv.height=Math.round(r.height*d)}
const camStatus=t=>{const e=$('#cs');if(e)e.textContent=t};
function camLoop(){const c=cam;if(!c||!c.run)return;clearTimeout(c.t);const step=()=>{if(cam!==c||!c.run)return;const t0=performance.now(),v=$('#cv');
 if(!c.manual&&!document.hidden&&v&&v.videoWidth){try{c.sc.getContext('2d',{willReadFrequently:true}).drawImage(v,0,0,c.sc.width,c.sc.height);const r=detect(c.sc);camUpdate(r&&qArea(r)>.1?r:null)}
  catch(e){if(++c.err>3){c.manual=true;camStatus('Deteksi otomatis nonaktif — atur sudut manual')}}}
 c.t=setTimeout(step,performance.now()-t0>45?260:130)};step()}
function camUpdate(r){const c=cam,cd=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
 if(r){if(c.corners&&r.every((p,i)=>cd(p,c.corners[i])<.15)){const mv=Math.max(...r.map((p,i)=>cd(p,c.corners[i])));c.corners=r.map((p,i)=>[c.corners[i][0]*.55+p[0]*.45,c.corners[i][1]*.55+p[1]*.45]);c.stable=mv<.015?c.stable+1:0}else{c.corners=r;c.stable=0}c.miss=0}
 else if(c.corners&&++c.miss>6){c.corners=null;c.stable=0}
 camStatus(c.corners?(c.stable>=3?'Dokumen terdeteksi — tahan stabil':'Mendeteksi dokumen…'):'Dokumen belum terdeteksi — geser sudut manual bila perlu');camDraw()}
function camDraw(){const c=cam,cv=$('#co');if(!c||!cv)return;const x=cv.getContext('2d'),W=cv.width,H=cv.height,d=W/($('#cw').clientWidth||W);x.clearRect(0,0,W,H);
 if(!c.corners){x.strokeStyle='#ffffff88';x.setLineDash([10*d,8*d]);x.lineWidth=2*d;x.strokeRect(W*.1,H*.1,W*.8,H*.8);return}
 const p=c.corners.map(([a,b])=>[a*W,b*H]),col=c.manual?'#38bdf8':c.stable>=3?'#22c55e':'#facc15';x.beginPath();p.forEach((q,i)=>i?x.lineTo(...q):x.moveTo(...q));x.closePath();x.fillStyle=col+'30';x.fill();x.strokeStyle=col;x.lineWidth=3*d;x.stroke();
 p.forEach(([a,b])=>{x.beginPath();x.arc(a,b,12*d,0,7);x.fillStyle=col;x.fill();x.strokeStyle='#fff';x.lineWidth=2*d;x.stroke()})}
function bindDrag(){const cv=$('#co');let k=-1;const pos=e=>{const r=cv.getBoundingClientRect();return[Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),Math.min(1,Math.max(0,(e.clientY-r.top)/r.height))]};
 cv.onpointerdown=e=>{const c=cam,[px,py]=pos(e),r=cv.getBoundingClientRect(),had=!!c.corners;if(!had)c.corners=[[.1,.1],[.9,.1],[.9,.9],[.1,.9]];let bd=1e9;c.corners.forEach(([x,y],i)=>{const t=Math.hypot((x-px)*r.width,(y-py)*r.height);if(t<bd){bd=t;k=i}});
  if(bd>52){k=-1;if(!had)c.corners=null;camDraw();return}c.manual=true;cv.setPointerCapture(e.pointerId);camStatus('Mode manual — geser titik sudut');camDraw()};
 cv.onpointermove=e=>{if(k<0)return;cam.corners[k]=pos(e);camDraw()};cv.onpointerup=cv.onpointercancel=()=>{k=-1}}
function camAuto(){const c=cam;if(!c)return;c.manual=false;c.corners=null;c.miss=0;c.stable=0;c.err=0;camStatus('Mencari dokumen…');camDraw();camLoop()}
async function camShot(){const c=cam,v=$('#cv');if(!c||c.busy||!v||!v.videoWidth)return;c.busy=true;$('#csh').disabled=true;
 try{let cn=c.corners?c.corners.map(a=>[...a]):null;
  if(cn&&!c.manual){const mx=cn.reduce((s,p)=>s+p[0],0)/4,my=cn.reduce((s,p)=>s+p[1],0)/4;cn=cn.map(([x,y])=>[Math.min(1,Math.max(0,x+(x-mx)*.03)),Math.min(1,Math.max(0,y+(y-my)*.03))])} // sedikit longgar agar tepi tidak terpotong
  const f=document.createElement('canvas');f.width=v.videoWidth;f.height=v.videoHeight;f.getContext('2d').drawImage(v,0,0);
  const orig=await new Promise(r=>f.toBlob(r,'image/jpeg',.92));let edit=null,params=null;
  if(cn){try{const w=warpC(f,cn,2400);edit=await new Promise(r=>w.toBlob(r,'image/jpeg',.9));params={v:2,rot:0,mode:'orig',b:0,c:0,sh:0,corners:cn}}catch{edit=null;params=null}}
  const p={id:uid(),docId:cur.doc.id,orig,edit,params,thumb:null,cap:'',ts:new Date().toISOString(),tsEdited:false,order:cur.photos.length,src:'kamera'};
  p.thumb=await mkThumb(edit||orig);p.ar=mkThumb.last;cur.photos.push(p);await doSave();c.n++;$('#cn').textContent=c.n+' foto';
  const fl=$('#cf');if(fl){fl.classList.remove('on');void fl.offsetWidth;fl.classList.add('on')}navigator.vibrate&&navigator.vibrate(25);toast(edit?'Tersimpan · dokumen diluruskan':'Tersimpan')}
 catch(e){toast('Gagal menyimpan foto: '+e.message)}finally{c.busy=false;const b=$('#csh');if(b)b.disabled=false}}
