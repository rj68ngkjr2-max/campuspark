const CACHE='campuspark-1e120b605242';
const FILES=['./','./index.html','./demo.html','./demo.js?v=1e120b605242','./demo.css?v=1e120b605242','./demo.webmanifest?v=1e120b605242','./app.js?v=1e120b605242','./styles.css?v=1e120b605242','./leaflet.css?v=1e120b605242','./icon-180.png?v=dhbw-20261102','./icon-192.png?v=dhbw-20261102','./icon-512.png?v=dhbw-20261102','./manifest.webmanifest?v=1e120b605242'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('campuspark-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin)return;
 if(e.request.mode==='navigate'){e.respondWith(fetch(e.request,{cache:'no-cache'}).catch(()=>caches.match(new URL(u.pathname.endsWith('/demo.html')?'./demo.html':'./index.html',self.location.href))));return;}
 const allowed=FILES.map(f=>new URL(f,self.location.href).pathname);if(!allowed.includes(u.pathname))return;
 e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}return r;}).catch(()=>caches.match(e.request)));
});
