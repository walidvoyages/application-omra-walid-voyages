const CACHE='walid-omra-v7';
const APP=['./','./index.html','./styles.css','./app.js','./content.json','./icon.svg','./manifest.webmanifest','./config.js','./supabase-sync.js','./admin.html','./admin.css','./admin.js','./reminders.js','./adhkar.js','./schedule.js','./omra-logo.webp'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==location.origin)return;
 const url=new URL(request.url);
 const live=request.mode==='navigate'||/\/(?:admin\.html|index\.html|config\.js|admin\.js|app\.js|supabase-sync\.js|content\.json)$/.test(url.pathname);
 const cached=()=>caches.match(request,{ignoreSearch:true});
 if(live){
  event.respondWith(fetch(request,{cache:'no-store'}).then(response=>{
   if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}
   return response;
  }).catch(cached));
 }else{
  event.respondWith(cached().then(response=>response||fetch(request).then(fresh=>{
   if(fresh.ok){const copy=fresh.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}
   return fresh;
  })));
 }
});
