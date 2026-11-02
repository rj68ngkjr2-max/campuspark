const CACHE='campuspark-6eca2b3f81f5';
const FILES=['./','./index.html','./demo.html','./demo.js?v=6eca2b3f81f5','./demo.css?v=6eca2b3f81f5','./demo.webmanifest?v=6eca2b3f81f5','./app.js?v=6eca2b3f81f5','./styles.css?v=6eca2b3f81f5','./leaflet.css?v=6eca2b3f81f5','./icon-180.png?v=dhbw-20261102','./icon-192.png?v=dhbw-20261102','./icon-512.png?v=dhbw-20261102','./manifest.webmanifest?v=6eca2b3f81f5'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('campuspark-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin)return;
 if(e.request.mode==='navigate'){e.respondWith(fetch(e.request,{cache:'no-cache'}).catch(()=>caches.match(new URL(u.pathname.endsWith('/demo.html')?'./demo.html':'./index.html',self.location.href))));return;}
 const allowed=FILES.map(f=>new URL(f,self.location.href).pathname);if(!allowed.includes(u.pathname))return;
 e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}return r;}).catch(()=>caches.match(e.request)));
});
