import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createPublicKey,verify,createHash} from 'node:crypto';
import {DeviceKeys} from '../public/device.js';
const key=n=>'sb_'+n.repeat(16)+'_'+'a'.repeat(43);
const values=new Map();
globalThis.location={hostname:'joellimrl.github.io'};
globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
const {Store}=await import('../public/store.js');
const {WALLET_DEFAULTS}=await import('../public/recommend.js');

test('identity survives reload, private key cannot be exported and signed requests bind payment data',async()=>{
 const keys=new DeviceKeys(),credential=key('3'),first=await keys.prepare(credential);
 assert.equal(first.privateKey.extractable,false);
 await assert.rejects(crypto.subtle.exportKey('jwk',first.privateKey),{name:'InvalidAccessException'});
 await keys.name(credential,'iPhone Safari');
 const reloaded=new DeviceKeys(),saved=await reloaded.get(credential);
 assert.deepEqual(saved.publicKey,first.publicKey);assert.equal(saved.name,'iPhone Safari');
 const body={revision:4,data:{merchants:[]}},path='/pocket-miles/notebook';
 const proof=await reloaded.sign(credential,'PUT',path,body),[,stamp,nonce,signature]=/^PocketDevice (\d+)\.([a-f0-9-]+)\.([A-Za-z0-9_-]+)$/.exec(proof);
 const payload=JSON.stringify(['pocket-miles-device-v1','3'.repeat(16),'PUT',path,Number(stamp),nonce,createHash('sha256').update(JSON.stringify(body)).digest('hex')]);
 assert.equal(verify('sha256',Buffer.from(payload),{key:createPublicKey({key:saved.publicKey,format:'jwk'}),dsaEncoding:'ieee-p1363'},Buffer.from(signature,'base64url')),true);
 assert.notEqual(await reloaded.sign(credential,'PUT',path,body),proof,'each request has a new nonce');
 await reloaded.forget(credential);
 await assert.rejects(reloaded.sign(credential,'GET',path),/connection is missing/);
 const replacement=await reloaded.prepare(credential);
 assert.notDeepEqual(replacement.publicKey,saved.publicKey,'clearing browser identity does not recreate the paired key');
 await reloaded.forget(credential);
});

test('two tabs preparing the same setup key retain one browser identity',async()=>{
 const credential=key('4'),a=new DeviceKeys(),b=new DeviceKeys();
 const [one,two]=await Promise.all([a.prepare(credential),b.prepare(credential)]);
 assert.deepEqual(one.publicKey,two.publicKey);await a.forget(credential);
});

test('lost pairing response can retry with the stored identity and reload without pairing again',async()=>{
 values.clear();const credential=key('5');let paired=null,dropResponse=true,pairCalls=0;
 globalThis.fetch=async(url,options)=>{
  assert.match(options.headers.Authorization,/^PocketDevice /);
  if(url.endsWith('/device')){
   pairCalls++;const body=JSON.parse(options.body);
   if(paired)assert.deepEqual(body.publicKey,paired.publicKey);else paired=body;
   if(dropResponse){dropResponse=false;throw new Error('Response lost after server paired');}
   return Response.json({name:body.name,expiresAt:null});
  }
  return Response.json({data:{version:1,merchants:[],settings:WALLET_DEFAULTS},revision:0});
 };
 const store=new Store(()=>{});
 await assert.rejects(store.unlock(credential,'Laptop Chrome'),/Cannot reach/);
 assert.equal(values.has('pocket-miles-device-key'),false);
 assert.ok(await new DeviceKeys().get(credential),'private key was saved before pairing');
 await store.unlock(credential,'Laptop Chrome');assert.equal(store.ready,true);assert.equal(pairCalls,2);
 const restored=new Store(()=>{});await restored.load();
 assert.equal(restored.deviceName,'Laptop Chrome');assert.equal(pairCalls,2);
 await restored.lock();assert.equal(await new DeviceKeys().get(credential),null);assert.equal(values.size,0);
});

test('a copied bearer without the browser identity cannot load the remote wallet or cached data',async()=>{
 values.clear();const credential=key('6');values.set('pocket-miles-device-key',credential);
 values.set('pocket-miles-personal-v3',JSON.stringify({data:{version:1,merchants:[],settings:WALLET_DEFAULTS},revision:0}));
 let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('Must not reach network');};
 const store=new Store(()=>{});await store.load();
 assert.equal(calls,0);assert.equal(store.locked,true);assert.equal(store.ready,false);assert.equal(values.size,0);
});

test('pairing fails before contacting the server when persistent browser key storage is unavailable',async()=>{
 values.clear();const saved=globalThis.indexedDB;let calls=0;
 globalThis.fetch=async()=>{calls++;throw new Error('Must not reach network');};
 try{
  globalThis.indexedDB=undefined;
  await assert.rejects(new Store(()=>{}).unlock(key('7'),'Phone'),/browser storage/);
  assert.equal(calls,0);assert.equal(values.size,0);
 }finally{globalThis.indexedDB=saved;}
});
