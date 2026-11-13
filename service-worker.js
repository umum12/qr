importScripts('js/resources.js');
const CACHE='struk-'+APP_VERSION,SCOPE=self.registration.scope,abs=p=>new URL(p,SCOPE).href,nm=u=>u.replace(SCOPE,'')||'(halaman utama)';
const REQ=[...CORE.map(abs),...CDN_REQUIRED],OPT=[...CDN_OPTIONAL];
self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
async function dl(c,u){for(let i=0;i<3;i++){try{const r=await fetch(new Request(u,u.startsWith(SCOPE)?{cache:'reload'}:{cache:'reload',mode:'cors'}));if(!r.ok||r.type==='opaque')throw Error('HTTP '+r.status);await c.put(u,r);return true}catch{await new Promise(r=>setTimeout(r,400*(i+1)))}}return false}
async function verify(deep){const c=await caches.open(CACHE),missing=[];let count=0;
 for(const u of REQ){const r=await c.match(u,{ignoreVary:true});if(!r||!r.ok){missing.push(nm(u));continue}if(deep&&!(await r.clone().arrayBuffer()).byteLength){missing.push(nm(u));continue}count++}
 for(const u of OPT){const r=await c.match(u,{ignoreVary:true});if(r&&r.ok)count++}return{ok:!missing.length,missing,count}}
async function precache(post){const c=await caches.open(CACHE),all=[...REQ,...OPT],total=all.length,bad=[],badOpt=[];let i=0,done=0;
 const w=async()=>{while(i<total){const u=all[i++],ok=await dl(c,u);done++;if(!ok)(OPT.includes(u)?badOpt:bad).push(nm(u));post({type:'p',done,total,name:nm(u).slice(0,48)})}};
 await Promise.all([w(),w(),w(),w()]);const v=await verify(true);
 if(v.ok&&!bad.length)for(const k of await caches.keys())if(k.startsWith('struk-')&&k!==CACHE)await caches.delete(k);
 post({type:'done',ok:v.ok&&!bad.length,missing:[...new Set([...bad,...v.missing])],optMissing:badOpt,count:v.count})}
self.addEventListener('message',e=>{const p=e.ports&&e.ports[0],d=e.data||{};if(!p)return;
 if(d.type==='HELLO')p.postMessage({type:'hello',version:APP_VERSION});
 else if(d.type==='VERIFY')e.waitUntil(verify(!!d.deep).then(r=>p.postMessage({type:'verify',...r})));
 else if(d.type==='PRECACHE')e.waitUntil(precache(m=>p.postMessage(m)))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||!/^https?:/.test(e.request.url))return;
 e.respondWith((async()=>{const o={ignoreSearch:true,ignoreVary:true},c=await caches.open(CACHE),U=new URL(e.request.url);
  if(U.origin===location.origin&&/(\/|\/index\.html|\/js\/resources\.js)$/.test(U.pathname)){try{const n=await Promise.race([fetch(e.request),new Promise((_,j)=>setTimeout(()=>j(0),3000))]);if(n&&n.ok&&!n.redirected)return n}catch{}}   // network-first (3 dtk) agar versi baru terdeteksi cepat
  const r=await c.match(e.request,o);if(r)return r;
  try{return await fetch(e.request)}catch(x){const old=await caches.match(e.request,o);if(old)return old;throw x}})())});
