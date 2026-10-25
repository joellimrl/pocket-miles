import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {DeviceKeys} from '../public/device.js';
import {WALLET_DEFAULTS} from '../public/recommend.js';
const values=new Map(),AUTH='pocket-miles-device-key',CACHE='pocket-miles-personal-v3';
globalThis.location={hostname:'joellimrl.github.io'};
globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
const {Store}=await import('../public/store.js');
const key=n=>'sb_'+n.repeat(16)+'_'+'a'.repeat(43);
const ownerKey=key('a'),spouseKey=key('b');
const snapshot=(id,cards)=>({profile:{id,name:id==='owner'?'Owner':'Spouse'},data:{version:1,merchants:[],settings:{...WALLET_DEFAULTS,cards}},revision:1});
const owner=()=>snapshot('owner',['uob']),spouse=()=>snapshot('spouse',['citi']);
const cache=(credential,result)=>JSON.stringify({keyId:credential.slice(3,19),...result});

test('existing owner device upgrades without pairing again; unbound old cache needs one online load',async()=>{
 values.clear();values.set(AUTH,ownerKey);values.set(CACHE,JSON.stringify(owner()));
 await new DeviceKeys().prepare(ownerKey);
 let offline=true,posts=0;
 globalThis.fetch=async(_url,options)=>{if(options.method==='POST')posts++;if(offline)throw Error('offline');return Response.json(owner());};
 const s=new Store(()=>{});await s.load();
 assert.equal(s.ready,false);assert.equal(s.locked,true);assert.deepEqual(s.data.settings.cards,[]);
 offline=false;await s.load();
 assert.equal(s.ready,true);assert.equal(s.profile.id,'owner');assert.deepEqual(s.data.settings.cards,['uob']);
 assert.equal(posts,0);assert.equal(values.get(AUTH),ownerKey);
 offline=true;const restored=new Store(()=>{});await restored.load();
 assert.equal(restored.ready,true);assert.equal(restored.profile.id,'owner');assert.equal(restored.online,false);
});

test('new spouse pairing clears the previous profile before a failed first notebook load',async()=>{
 values.clear();values.set(AUTH,ownerKey);values.set(CACHE,cache(ownerKey,owner()));
 let spouseOffline=true;
 globalThis.fetch=async(url,options)=>{
  const result=options.headers['X-Auth']===spouseKey?spouse():owner();
  if(url.endsWith('/device'))return Response.json({name:'Spouse phone',profile:result.profile});
  if(result.profile.id==='spouse'&&spouseOffline)throw Error('offline');
  return Response.json(result);
 };
 const s=new Store(()=>{});await s.load();assert.deepEqual(s.data.settings.cards,['uob']);
 await assert.rejects(s.unlock(spouseKey,'Spouse phone'),/Cannot reach/);
 assert.equal(s.ready,false);assert.equal(s.locked,true);assert.deepEqual(s.data.settings.cards,[]);
 assert.equal(values.has(CACHE),false);assert.equal(values.get(AUTH),spouseKey);
 const restored=new Store(()=>{});await restored.load();assert.equal(restored.ready,false);
 spouseOffline=false;await restored.load();assert.equal(restored.profile.id,'spouse');assert.deepEqual(restored.data.settings.cards,['citi']);
 assert.equal(JSON.parse(values.get(CACHE)).keyId,'b'.repeat(16));
 spouseOffline=true;await restored.load();assert.equal(restored.profile.id,'spouse');assert.equal(restored.ready,true);
});

test('a different credential never falls back to another profile’s offline cache',async()=>{
 values.clear();values.set(AUTH,spouseKey);values.set(CACHE,cache(ownerKey,owner()));
 await new DeviceKeys().prepare(spouseKey);globalThis.fetch=async()=>{throw Error('offline');};
 const s=new Store(()=>{});await s.load();
 assert.equal(s.ready,false);assert.equal(s.profile,null);assert.deepEqual(s.data.settings.cards,[]);
});

test('profile change in another tab clears stale memory and blocks saving with the old account',async()=>{
 values.clear();values.set(AUTH,ownerKey);await new DeviceKeys().prepare(ownerKey);
 let writes=0;globalThis.fetch=async(_url,options)=>{if(options.method==='PUT')writes++;return Response.json(owner());};
 const s=new Store(()=>{});await s.load();
 values.set(AUTH,spouseKey);const spouseCache=cache(spouseKey,spouse());values.set(CACHE,spouseCache);
 await assert.rejects(s.save(d=>d),/Connection changed/);
 assert.equal(s.locked,true);assert.equal(s.ready,false);assert.equal(s.profile,null);assert.equal(writes,0);
 assert.equal(values.get(AUTH),spouseKey);assert.equal(values.get(CACHE),spouseCache);
 await s.lock();assert.equal(values.get(AUTH),spouseKey);assert.equal(values.get(CACHE),spouseCache);
});

test('late response from a previous tab connection cannot replace the new profile cache',async()=>{
 values.clear();values.set(AUTH,ownerKey);await new DeviceKeys().prepare(ownerKey);
 let release,started;const ready=new Promise(resolve=>{started=resolve;});
 globalThis.fetch=async()=>{started();return new Promise(resolve=>{release=resolve;});};
 const s=new Store(()=>{}),loading=s.load();await ready;
 values.set(AUTH,spouseKey);const spouseCache=cache(spouseKey,spouse());values.set(CACHE,spouseCache);
 assert.equal(s.connectionChanged(),true);release(Response.json(owner()));await loading;
 assert.equal(s.ready,false);assert.equal(s.busy,false);assert.equal(values.get(CACHE),spouseCache);
});

test('pairing and notebook profile mismatch is rejected without exposing the returned wallet',async()=>{
 values.clear();
 globalThis.fetch=async url=>Response.json(url.endsWith('/device')?{name:'Phone',profile:spouse().profile}:owner());
 const s=new Store(()=>{});await assert.rejects(s.unlock(spouseKey,'Phone'),/Profile changed/);
 assert.equal(s.ready,false);assert.equal(s.locked,true);assert.equal(s.busy,false);assert.deepEqual(s.data.settings.cards,[]);
 assert.equal(values.has(CACHE),false);assert.equal(values.has(AUTH),false);
});
