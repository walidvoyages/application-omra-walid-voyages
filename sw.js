const CACHE='walid-omra-v2';
const APP=['./','./index.html','./styles.css','./app.js','./content.json','./icon.svg','./manifest.webmanifest','./config.js','./supabase-sync.js','./admin.html','./admin.css','./admin.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 const req=e.request;if(req.method!=='GET'||new URL(req.url).origin!==location.origin)return;
 const url=new URL(req.url);
 if(url.pathname.endsWith('/content.json')){e.respondWith(fetch(req).catch(()=>caches.match(req)));return}
 e.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(req,copy))}return response})));
});