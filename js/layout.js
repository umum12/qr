'use strict';
// ===== Integrasi: ukur teks (jsPDF), gambar PDF, preview, live preview =====
const FF='Helvetica,Arial,sans-serif',LHF=.3528*1.25;let _mp=null;
const mpdf=()=>_mp||(_mp=new window.jspdf.jsPDF({unit:'mm',format:'a4'}));
function layoutFor(d,ph){const L=d.orient==='l',W=L?297:210,H=L?210:297,m=+d.margin||10,g=+d.gap||4,cfs=+d.cfs||8,hfs=+d.hfs||14,lh=cfs*LHF,pdf=mpdf();
 pdf.setFont('helvetica','bold');pdf.setFontSize(hfs);let fs=hfs;if(d.title)while(pdf.getTextWidth(d.title)>W-2*m&&fs>7)pdf.setFontSize(--fs);
 const hT=d.title?fs*.3528*1.3+2:0,hS=d.subtitle?6:0,hh=hT+hS+(hT||hS?3:0);
 const meas=(i,w)=>{pdf.setFontSize(cfs);pdf.setFont('helvetica','bold');const cl=ph[i].cap?pdf.splitTextToSize(ph[i].cap,w):[];pdf.setFont('helvetica','normal');return{cl,tl:pdf.splitTextToSize((ph[i].cap?'Dokumentasi: ':'')+fmt(ph[i].ts),w)}};
 const plan=LayoutEngine.plan({ar:ph.map(p=>p.ar||.75),W,H,m,g,hh,mode:d.mode,val:+d.val||1,meas,lh});
 return Object.assign(plan,{W,H,m,hh,fs,hT,cfs,lh,L})}
const IMC=new WeakMap(),BM=new WeakMap();
async function prepImg(p){const b=p.edit||p.orig;let v=IMC.get(b);if(v)return v;const bm=await createImageBitmap(b),s=Math.min(1,1500/Math.max(bm.width,bm.height)),c=document.createElement('canvas');c.width=Math.round(bm.width*s);c.height=Math.round(bm.height*s);c.getContext('2d').drawImage(bm,0,0,c.width,c.height);bm.close&&bm.close();v={url:c.toDataURL('image/jpeg',.8)};IMC.set(b,v);return v}
build=async function(){const{doc:d,photos:ph}=cur;if(!ph.length)throw Error('Belum ada foto');await ensureThumbs();const plan=layoutFor(d,ph),imgs=await seq(ph,prepImg),
 pdf=new window.jspdf.jsPDF({orientation:plan.L?'l':'p',unit:'mm',format:'a4'});
 plan.pages.forEach((pg,pi)=>{if(pi)pdf.addPage();pdf.setFont('helvetica','bold');
  if(d.title){pdf.setFontSize(plan.fs);pdf.text(d.title,plan.W/2,plan.m+plan.fs*.3528,{align:'center'})}
  if(d.subtitle){pdf.setFont('helvetica','normal');pdf.setFontSize(10);pdf.text(d.subtitle,plan.W/2,plan.m+plan.hT+3.5,{align:'center'})}
  pg.items.forEach(t=>{pdf.addImage(imgs[t.idx].url,'JPEG',t.x,t.y,t.w,t.h);pdf.setFontSize(plan.cfs);pdf.setFont('helvetica','bold');t.cl.forEach((l,j)=>pdf.text(l,t.cx,t.fy+j*plan.lh,{align:'center'}));
   pdf.setFont('helvetica','normal');t.tl.forEach((l,j)=>pdf.text(l,t.cx,t.fy+(t.cl.length+j)*plan.lh,{align:'center'}))})});
 return{pdf,plan,pages:plan.pages.length,pp:plan.pp,warn:plan.warn}};
async function getBmp(p){const b=p.thumb||p.edit||p.orig;let v=BM.get(b);if(!v){v=await createImageBitmap(b);BM.set(b,v)}return v}
async function drawPlan(plan,ph,d,pw){const s=pw/plan.W,out=[];for(const pg of plan.pages){const c=document.createElement('canvas');c.width=Math.round(plan.W*s);c.height=Math.round(plan.H*s);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.fillStyle='#000';x.textAlign='center';
 if(d.title){x.font=`bold ${plan.fs*.3528*s}px ${FF}`;x.fillText(d.title,c.width/2,(plan.m+plan.fs*.3528)*s)}
 if(d.subtitle){x.font=`${10*.3528*s}px ${FF}`;x.fillText(d.subtitle,c.width/2,(plan.m+plan.hT+3.5)*s)}
 for(const t of pg.items){x.drawImage(await getBmp(ph[t.idx]),t.x*s,t.y*s,t.w*s,t.h*s);x.font=`bold ${plan.cfs*.3528*s}px ${FF}`;t.cl.forEach((l,j)=>x.fillText(l,t.cx*s,(t.fy+j*plan.lh)*s));
  x.font=`${plan.cfs*.3528*s}px ${FF}`;t.tl.forEach((l,j)=>x.fillText(l,t.cx*s,(t.fy+(t.cl.length+j)*plan.lh)*s))}
 x.strokeStyle='#bbb';x.strokeRect(.5,.5,c.width-1,c.height-1);out.push(c)}return out}
const sum=p=>`<b>${p.pages.length}</b> halaman · foto terkecil ≈ ${Math.round(p.minD)} mm`+(p.warn?' <span style="color:var(--dg)">· keterbacaan mungkin berkurang, pertimbangkan menambah halaman</span>':'');
preview=wrap(async function(){try{await doSave();await ensureThumbs();const{doc:d,photos:ph}=cur;if(!ph.length)throw Error('Belum ada foto');const plan=layoutFor(d,ph),cs=await drawPlan(plan,ph,d,420),m=$('#modal');
 m.hidden=false;m.innerHTML=`<div class=sheet-h><b>Preview PDF</b>${IB('x','Tutup','',"$('#modal').hidden=true")}</div><p>${sum(plan)}</p><div id=pv></div>`;$('#pv').append(...cs)}catch(e){toast(e.message)}},'Membuat preview…');
let _lt,_lg=0;function lpSoon(){clearTimeout(_lt);_lt=setTimeout(lpRun,120)}
async function lpRun(){const el=$('#lp');if(!el)return;if(!cur||!cur.photos.length){el.replaceChildren();$('#lps').textContent='Tambahkan foto untuk melihat layout.';return}const g=++_lg;
 try{const{doc:d,photos:ph}=cur;if(ph.some(p=>!p.ar||!p.thumb))await ensureThumbs();const plan=layoutFor(d,ph),cs=await drawPlan(plan,ph,d,360);if(g!==_lg||!$('#lp'))return;$('#lps').innerHTML=sum(plan);el.replaceChildren(...cs)}
 catch(e){if(g===_lg&&$('#lps'))$('#lps').textContent=e.message}}
const _vd2=V.doc;V.doc=async()=>{await _vd2();lpSoon()};
