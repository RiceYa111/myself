/* Cache static pictures first; never intercept API calls or clear player saves. */
const CACHE='myself-v1';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(clients.claim()));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==location.origin||!/\.(?:html|js|css|png|webp|ico|webmanifest)$/.test(u.pathname)&&!u.pathname.endsWith('/'))return;
 e.respondWith((async()=>{
  const cache=await caches.open(CACHE),cached=await cache.match(e.request);
  if(cached&&/\.(?:png|webp|ico)$/.test(u.pathname)&&e.request.cache!=='reload'&&e.request.cache!=='no-store')return cached;
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),60000);
  try{
   const r=await fetch(e.request,{signal:controller.signal});
   if(r.ok){const copy=r.clone();e.waitUntil(cache.put(e.request,copy).catch(()=>{}))}
   return r;
  }catch(err){if(cached)return cached;throw err}finally{clearTimeout(timer)}
 })());
});

