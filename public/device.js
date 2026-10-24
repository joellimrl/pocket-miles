// Browser-profile identity. Non-extractable does not imply hardware protection.
const DATABASE='pocket-miles-devices-v1',TABLE='keys';
const keyId=key=>{
 const match=/^sb_([a-f0-9]{16})_[A-Za-z0-9_-]{43}$/.exec(key);
 if(!match)throw new Error('Paste the full setup key from /pocket.');
 return match[1];
};
const missing=()=>Object.assign(new Error('This browser’s connection is missing. Send /pocket to pair it again.'),{status:403});
const base64url=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const hex=bytes=>[...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
export class DeviceKeys{
 async transaction(mode,action){
  if(!globalThis.indexedDB||!globalThis.crypto?.subtle)throw new Error('Device pairing needs HTTPS and browser storage. Open this app in a regular browser window.');
  const db=await new Promise((resolve,reject)=>{
   const request=indexedDB.open(DATABASE,1);
   request.onupgradeneeded=()=>request.result.createObjectStore(TABLE);
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(new Error('Cannot open device storage. Allow this site to store data.'));
   request.onblocked=()=>reject(new Error('Close other Pocket Miles windows and retry pairing.'));
  });
  try{return await new Promise((resolve,reject)=>{
   const tx=db.transaction(TABLE,mode);let result;
   tx.oncomplete=()=>resolve(result);
   tx.onabort=tx.onerror=()=>reject(new Error('Could not save this browser’s connection. Allow site storage and retry.'));
   try{action(tx.objectStore(TABLE),value=>{result=value;});}catch(error){tx.abort();reject(error);}
  });}finally{db.close();}
 }
 get(key){return this.transaction('readonly',(store,done)=>{const request=store.get(keyId(key));request.onsuccess=()=>done(request.result||null);});}
 async prepare(key){
  const existing=await this.get(key);if(existing)return existing;
  const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);
  const {kty,crv,x,y}=await crypto.subtle.exportKey('jwk',pair.publicKey);
  const candidate={privateKey:pair.privateKey,publicKey:{kty,crv,x,y},name:''};
  // A read/write transaction chooses one identity even if two tabs pair together.
  return this.transaction('readwrite',(store,done)=>{
   const id=keyId(key),request=store.get(id);
   request.onsuccess=()=>{if(request.result)done(request.result);else{store.put(candidate,id);done(candidate);}};
  });
 }
 name(key,name){return this.transaction('readwrite',(store,done)=>{
  const id=keyId(key),request=store.get(id);
  request.onsuccess=()=>{if(!request.result)return done(false);store.put({...request.result,name},id);done(true);};
 });}
 forget(key){if(!key)return Promise.resolve();return this.transaction('readwrite',store=>store.delete(keyId(key)));}
 async sign(key,method,path,body){
  const record=await this.get(key);
  if(!record?.privateKey||record.privateKey.extractable!==false)throw missing();
  const stamp=Date.now(),nonce=crypto.randomUUID();
  const digest=hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(method==='GET'?null:body))));
  const payload=JSON.stringify(['pocket-miles-device-v1',keyId(key),method,path,stamp,nonce,digest]);
  const signature=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},record.privateKey,new TextEncoder().encode(payload));
  return `PocketDevice ${stamp}.${nonce}.${base64url(signature)}`;
 }
}
