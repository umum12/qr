'use strict';
/* Intelligent Auto Layout — murni hitungan (tanpa DOM/PDF). Satuan: mm.
   Input: rasio foto, ukuran halaman, margin, jarak, tinggi header, fungsi ukur teks footer.
   Output: halaman -> item {idx,x,y,w,h,cx,fw,fy,cl,tl}. Dipakai sama persis oleh preview & PDF. */
const LayoutEngine=(()=>{
const MINF=46,AREA_OK=6000;
function candRows(n){const o=new Map(),add=a=>o.set(a.join(),a);
 for(let c=1;c<=Math.min(n,5);c++){const k=Math.ceil(n/c),full=[];let l=n;for(let i=0;i<k;i++){const t=Math.min(c,l);full.push(t);l-=t}add(full);
  const b=Math.floor(n/k),e=n%k,bal=[];for(let i=0;i<k;i++)bal.push(b+(i<e?1:0));add(bal)}
 return[...o.values()]}
function evalRows(ids,rows,G){const{Wc,Hc,g,ar,meas,lh,m,top}=G,k=rows.length;let pos=0;
 const R=rows.map(c=>{const idx=ids.slice(pos,pos+c);pos+=c;return{idx,c,hmax:(Wc-(c-1)*g)/idx.reduce((s,i)=>s+ar[i],0)}});
 const mk=t=>{let tot=(k-1)*g;const L=R.map(r=>{const h=Math.min(r.hmax,t),ws=r.idx.map(i=>ar[i]*h),slack=Math.max(0,Wc-ws.reduce((a,b)=>a+b,0)-(r.c-1)*g),
   fws=ws.map(w=>Math.min(Math.max(w,MINF),w+slack/r.c)),fm=r.idx.map((i,j)=>meas(i,fws[j])),fh=Math.max(...fm.map(f=>f.fh));tot+=h+fh;return{r,h,ws,fws,fm,fh}});return{L,tot}};
 let hi=Math.max(...R.map(r=>r.hmax)),B=mk(hi);
 if(B.tot>Hc){let lo=1;if(mk(lo).tot>Hc)return null;for(let i=0;i<14;i++){const mid=(lo+hi)/2;if(mk(mid).tot<=Hc)lo=mid;else hi=mid}B=mk(lo)}
 let y=top+(Hc-B.tot)/2,minA=1e12,maxA=0,total=0,minD=1e9;const items=[];
 B.L.forEach(({r,h,ws,fws,fm,fh})=>{const rw=fws.reduce((a,b)=>a+b,0)+(r.c-1)*g;let x=m+(Wc-rw)/2;
  r.idx.forEach((i,j)=>{const w=ws[j],f=fm[j];items.push({idx:i,x:x+(fws[j]-w)/2,y,w,h,cx:x+fws[j]/2,fw:fws[j],fy:y+h+1.5+lh*.8,cl:f.cl,tl:f.tl,fh:f.fh});
   const a=w*h;minA=Math.min(minA,a);maxA=Math.max(maxA,a);total+=a;minD=Math.min(minD,w,h);x+=fws[j]+g});y+=h+fh+g});
 return{items,rows:rows.join('+'),total,minA,minD,score:total*(.5+.5*minA/maxA)*Math.min(1,minD/30)}}
function planPage(ids,G){let best=null;for(const rows of candRows(ids.length)){const r=evalRows(ids,rows,G);if(r&&(!best||r.score>best.score))best=r}return best}
function plan(o){const n=o.ar.length,Wc=Math.max(20,o.W-2*o.m),Hc=Math.max(20,o.H-2*o.m-o.hh),cache=new Map(),mc=new Map();
 const meas=(i,w)=>{const q=Math.floor(w*2)/2,k=i+'|'+q;let v=mc.get(k);if(!v){const r=o.meas(i,q);v={cl:r.cl,tl:r.tl,fh:1.5+(r.cl.length+r.tl.length)*o.lh+.5};mc.set(k,v)}return v};
 const G={Wc,Hc,g:o.g,ar:o.ar,meas,lh:o.lh,m:o.m,top:o.m+o.hh};
 const page=(s,e)=>{const k=s+'-'+e;if(!cache.has(k)){const ids=[];for(let i=s;i<e;i++)ids.push(i);cache.set(k,planPage(ids,G))}return cache.get(k)};
 const evalSizes=sz=>{let s=0,minA=1e12,tot=0,minD=1e9;const pg=[];for(const c of sz){const p=page(s,s+c);if(!p)return null;pg.push(p);minA=Math.min(minA,p.minA);tot+=p.total;minD=Math.min(minD,p.minD);s+=c}return{sz,pg,minA,tot,minD}};
 const bal=P=>{const b=Math.floor(n/P),e=n%P;return Array.from({length:P},(_,i)=>b+(i<e?1:0))};
 const better=(a,b)=>a.minA>b.minA+1||(Math.abs(a.minA-b.minA)<=1&&a.tot>b.tot+1);
 const refine=r=>{for(let it=0;it<10;it++){let imp=false;for(let b=0;b<r.sz.length-1;b++)for(const d of[-1,1]){const sz=r.sz.slice();sz[b]+=d;sz[b+1]-=d;if(sz[b]<1||sz[b+1]<1)continue;const c=evalSizes(sz);if(c&&better(c,r)){r=c;imp=true}}if(!imp)break}return r};
 const firstOk=P=>{let c=null;while(P<=n&&!(c=evalSizes(bal(P))))P++;return c};
 let r;
 if(o.mode==='per'){const v=Math.max(1,o.val|0),sz=[];for(let s=0;s<n;s+=v)sz.push(Math.min(v,n-s));r=evalSizes(sz)}
 else if(o.mode==='pages')r=firstOk(Math.min(n,Math.max(1,o.val|0)));
 else{let lo=Math.ceil(n/8),hi=n,ans=null;while(lo<=hi){const mid=(lo+hi)>>1,c=evalSizes(bal(mid));if(c&&c.minA>=AREA_OK){ans=c;hi=mid-1}else lo=mid+1}r=ans||firstOk(Math.ceil(n/8))}
 if(!r)throw Error('Foto per halaman terlalu banyak untuk ukuran kertas ini');
 if(o.mode!=='per')r=refine(r);
 return{pages:r.pg.map(p=>({items:p.items,rows:p.rows})),sizes:r.sz,minD:r.minD,minA:r.minA,warn:r.minD<40,pp:Math.max(...r.sz)}}
return{plan}})();
if(typeof module!=='undefined')module.exports=LayoutEngine;
