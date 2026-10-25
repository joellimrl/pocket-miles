const CACHE='pocket-miles-shell-v3.6.2';
const ASSETS=['./','./index.html','./style.css','./app.js','./store.js','./device.js','./rules.js','./merchants.js','./recommend.js','./payments.js','./baseline.js','./baseline-ui.js','./quick.html','./quick.css','./quick.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./icon-maskable.png'].map(path=>new URL(path,self.registration.scope).href);
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'})))));});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')event.waitUntil(self.skipWaiting());});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('pocket-miles-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||!ASSETS.includes(event.request.url))return;
 event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(event.request))||fetch(event.request)));
});
