import {validateNotebook} from './merchants.js';
import {WALLET_DEFAULTS} from './recommend.js';
import {DeviceKeys} from './device.js';
const CACHE='pocket-miles-personal-v3',AUTH='pocket-miles-device-key';
const preview=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
const API=preview?'':'https://streetbot.fly.dev';
const empty=()=>({version:1,merchants:[],settings:{...WALLET_DEFAULTS}});
const keyId=key=>preview?'preview':/^sb_([a-f0-9]{16})_/.exec(key)?.[1]||null;
const connectionError=()=>Object.assign(new Error('Connection changed in another tab. Reload this app.'),{code:'CONNECTION_CHANGED'});
function profile(value){
 if(preview&&!value)return{id:'owner',name:'Local preview'};
 if(!value||typeof value.id!=='string'||!/^[a-z][a-z0-9-]{0,31}$/.test(value.id)||typeof value.name!=='string'||!value.name.trim()||value.name.length>64)throw Object.assign(new Error('Profile could not be verified. Ask the app owner for a new setup key.'),{status:403});
 return{id:value.id,name:value.name};
}
function stored(key){try{return localStorage.getItem(key);}catch{return null;}}
function remove(key){try{localStorage.removeItem(key);}catch{}}
export class Store{
 constructor(onChange,{devices=new DeviceKeys()}={}){this.data=empty();this.profile=null;this.revision=null;this.ready=false;this.online=false;this.busy=false;this.locked=false;this.preview=preview;this.key=stored(AUTH)||'';this.remembered=!!this.key;this.generation=0;this.deviceName='';this.devices=devices;this.message='Loading your wallet…';this.onChange=onChange;}
 cache(){try{localStorage.setItem(CACHE,JSON.stringify({keyId:keyId(this.key),profile:this.profile,data:this.data,revision:this.revision}));}catch{}}
 clear(){
  // A stale tab must not erase the cache belonging to a newly paired profile.
  try{const saved=JSON.parse(stored(CACHE)||'null');if(!saved?.keyId||saved.keyId===keyId(this.key))remove(CACHE);}catch{remove(CACHE);}
  this.data=empty();this.profile=null;this.ready=false;this.revision=null;
 }
 assertConnection(generation=this.generation,key=this.key){if(generation!==this.generation||key!==this.key||(!preview&&this.remembered&&stored(AUTH)!==key))throw connectionError();}
 connectionChanged(){
  if(preview||!this.remembered||stored(AUTH)===this.key)return false;
  this.generation++;this.clear();this.key='';this.deviceName='';this.remembered=false;this.locked=true;this.online=false;this.busy=false;this.message=connectionError().message;this.onChange();return true;
 }
 async disconnect(){const key=this.key;this.generation++;if(stored(AUTH)===key)remove(AUTH);this.clear();this.key='';this.remembered=false;this.deviceName='';this.locked=true;this.online=false;this.busy=false;if(key)try{await this.devices.forget(key);}catch{}}
 async request(method='GET',body,key=this.key,path='/pocket-miles/notebook'){
  if(path!=='/pocket-miles/device')this.assertConnection();
  const headers=body?{'Content-Type':'application/json'}:{};
  if(!preview){headers['X-Auth']=key;headers.Authorization=await this.devices.sign(key,method,path,body);}
  if(path!=='/pocket-miles/device')this.assertConnection();
  let response;try{response=await fetch(API+path,{method,credentials:'omit',cache:'no-store',redirect:'error',headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000)});}catch{throw new Error('Cannot reach Streetbot. Check your connection and try Refresh.');}
  let result;try{result=await response.json();}catch{throw new Error('Streetbot has not returned app data. The Pocket Miles backend may need deployment.');}
  if(!response.ok){const e=new Error(result.error||([401,403].includes(response.status)?'This browser’s connection is no longer valid. Ask the app owner for a new setup key.':'Could not complete the request.'));e.status=response.status;throw e;}
  return result;
 }
 accept(result){
  if(!Number.isSafeInteger(result.revision)||result.revision<0)throw new Error('Invalid saved version from server.');
  const nextProfile=profile(result.profile),data=validateNotebook(result.data);
  if(this.profile&&this.profile.id!==nextProfile.id)throw Object.assign(new Error('Profile changed unexpectedly. Pair this browser again.'),{status:403});
  this.profile=nextProfile;this.data=data;this.data.settings??={...WALLET_DEFAULTS};this.revision=result.revision;this.ready=true;this.online=true;this.locked=false;this.cache();
 }
 async load(){
  if(this.connectionChanged()||this.busy)return;
  if(!preview&&!this.key){this.clear();this.locked=true;this.message='Connect this device once to get started';this.onChange();return;}
  const generation=this.generation,key=this.key;
  this.busy=true;this.message='Syncing your wallet…';this.onChange();
  try{if(!preview)this.deviceName=(await this.devices.get(key))?.name||'';const result=await this.request();this.assertConnection(generation,key);this.accept(result);this.message=preview?'Local preview · saved on this computer':`${this.profile.name} · Synced`;}
  catch(e){
   if(generation!==this.generation)return;
   if(this.connectionChanged())return;
   this.online=false;
   if([401,403].includes(e.status)){await this.disconnect();this.message=e.message;}
   else{
    try{
     const saved=JSON.parse(stored(CACHE)||'null');
     if(saved?.keyId===keyId(key)&&Number.isSafeInteger(saved.revision)&&saved.revision>=0){
      const cachedProfile=profile(saved.profile);
      if(this.profile&&this.profile.id!==cachedProfile.id)throw new Error('Different profile cache');
      this.data=validateNotebook(saved.data);this.profile=cachedProfile;this.revision=saved.revision;this.ready=true;this.locked=false;
     }
    }catch{}
    this.locked=!this.ready;this.message=this.ready&&!e.status?`Offline · ${this.profile.name} · edits need a connection`:e.message;
   }
  }finally{if(generation===this.generation){this.busy=false;this.onChange();}else if(!this.busy)this.onChange();}
 }
 async save(change){
  if(this.connectionChanged())throw connectionError();
  if(!this.online||!this.ready||this.revision===null)throw new Error('Reconnect and refresh before saving.');
  if(this.busy)throw new Error('Another save is in progress. Please wait.');
  const generation=this.generation,key=this.key;
  const data=validateNotebook(change(this.data));this.busy=true;this.message='Saving…';this.onChange();
  try{const result=await this.request('PUT',{data,revision:this.revision});this.assertConnection(generation,key);this.accept(result);this.message=preview?'Saved on this computer':`${this.profile.name} · Saved`;}
  catch(e){
   if(generation!==this.generation||this.connectionChanged())throw connectionError();
   this.online=false;if([401,403].includes(e.status))await this.disconnect();this.message=e.status===409?'Another device saved changes. Refresh before retrying.':'Save not confirmed. Refresh to check before retrying.';throw e;
  }finally{if(generation===this.generation){this.busy=false;this.onChange();}else if(!this.busy)this.onChange();}
 }
 async unlock(value,name='My browser'){
  if(this.busy)throw new Error('Please wait for the current request.');
  const key=value.trim();if(!/^sb_[a-f0-9]{16}_[A-Za-z0-9_-]{43}$/.test(key))throw new Error('Paste the full setup key from the app owner’s /pocket reply.');
  if(typeof name!=='string'||!name.trim()||name.length>60)throw new Error('Give this browser a name (up to 60 characters).');
  const previousStored=stored(AUTH);let generation=this.generation;
  this.busy=true;this.message='Connecting this device…';this.onChange();
  try{
   const device=await this.devices.prepare(key);
   const paired=await this.request('POST',{publicKey:device.publicKey,name:name.trim()},key,'/pocket-miles/device');
   const pairedProfile=profile(paired.profile);
   await this.devices.name(key,paired.name);
   if(generation!==this.generation||stored(AUTH)!==previousStored)throw connectionError();
   // Clear the previous wallet before adopting this connection, even when the
   // first notebook request fails. No previous profile may become its fallback.
   this.clear();generation=++this.generation;this.profile=pairedProfile;this.deviceName=paired.name;this.key=key;this.locked=true;this.online=false;
   this.remembered=true;try{localStorage.setItem(AUTH,key);}catch{this.remembered=false;}
   this.onChange();
   const result=await this.request();this.assertConnection(generation,key);this.accept(result);
   this.message=this.remembered?`${this.profile.name} · Device paired`:'Connected for this session only · allow browser storage to remember it';
  }catch(e){if(e.code==='CONNECTION_CHANGED')this.connectionChanged();else if([401,403].includes(e.status)&&this.key===key)await this.disconnect();throw e;}
  finally{if(generation===this.generation){this.busy=false;this.onChange();}else if(!this.busy)this.onChange();}
 }
 async lock(){await this.disconnect();this.message='Disconnected here · the app owner can revoke this connection in Telegram';this.onChange();}
}
