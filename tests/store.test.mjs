import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
const values=new Map();
globalThis.location={hostname:'joellimrl.github.io'};
globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
const {Store}=await import('../public/store.js');
const {WALLET_DEFAULTS}=await import('../public/recommend.js');
const key='sb_'+'1'.repeat(16)+'_'+'a'.repeat(43);
const initial=()=>({profile:{id:"owner",name:"Owner"},data:{version:1,merchants:[],settings:{...WALLET_DEFAULTS,cards:['trust']}},revision:1});
test('connect, persist, offline cache, conflict protection and revoke recovery',async()=>{
 let server=initial(),mode='ok',calls=0;
 globalThis.fetch=async(url,options)=>{
  calls++;assert.match(options.headers.Authorization,/^PocketDevice /);
  if(url.endsWith('/device'))return Response.json({name:JSON.parse(options.body).name,expiresAt:null,profile:{id:"owner",name:"Owner"}});
  assert.equal(url,'https://streetbot.fly.dev/pocket-miles/notebook');
  assert.equal(options.headers['X-Auth'],key);assert.equal(options.credentials,'omit');
  if(mode==='offline')throw new TypeError('Mock network unavailable');
  if(mode==='revoked')return Response.json({error:'Unauthorized'},{status:401});
  if(options.method==='PUT'){
   const input=JSON.parse(options.body);
   if(input.revision!==server.revision)return Response.json({error:'Another device saved changes'},{status:409});
   server={...server,data:input.data,revision:server.revision+1};
  }
  return Response.json(server);
 };
 const s=new Store(()=>{});
 await s.load();assert.equal(s.locked,true);assert.equal(calls,0);
 await assert.rejects(s.unlock('bad'),/full setup key/);assert.equal(calls,0);
 await s.unlock(key);assert.equal(s.ready,true);
 assert.equal(values.get('pocket-miles-device-key'),key);
 const restored=new Store(()=>{});await restored.load();assert.deepEqual(restored.data.settings.cards,['trust']);
 mode='offline';await restored.load();assert.equal(restored.ready,true);assert.equal(restored.online,false);
 await assert.rejects(restored.save(d=>d),/Reconnect/);
 mode='ok';await restored.load();server.revision++;
 await assert.rejects(restored.save(d=>d),/Another device/);assert.equal(restored.online,false);
 await restored.load();assert.equal(restored.revision,server.revision);
 await restored.save(d=>({...d,settings:{...d.settings,cards:['uob']}}));assert.deepEqual(server.data.settings.cards,['uob']);
 mode='revoked';await restored.load();assert.equal(restored.locked,true);assert.equal(restored.ready,false);
 assert.equal(values.size,0);
});
