const CACHE='pocket-miles-shell-v3.8.1';
const ASSETS=['./','./index.html','./style.css','./app.js','./store.js','./device.js','./rules.js','./merchants.js','./recommend.js','./payments.js','./baseline.js','./baseline-ui.js','./quick.html','./quick.css','./quick.js','./detailed.html','./detailed.css','./detailed.js','./detailed-model.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./icon-maskable.png'].map(path=>new URL(path,self.registration.scope).href);
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'})))));});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')event.waitUntil(self.skipWaiting());});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('pocket-miles-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const asset=new URL(event.request.url);
 // Currency query parameters select a local scenario; the public HTML is identical.
 if(asset.pathname===new URL('./detailed.html',self.registration.scope).pathname)asset.search='';
 if(event.request.method!=='GET'||!ASSETS.includes(asset.href))return;
 event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(asset.href))||fetch(event.request)));
});
