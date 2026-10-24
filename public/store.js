import {validateNotebook} from './merchants.js';
import {WALLET_DEFAULTS} from './recommend.js';
const CACHE='pocket-miles-personal-v3',AUTH='pocket-miles-device-key';
const preview=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
const API=preview?'/pocket-miles/notebook':'https://streetbot.fly.dev/pocket-miles/notebook';
const empty=()=>({version:1,merchants:[],settings:{...WALLET_DEFAULTS}});
function stored(key){try{return localStorage.getItem(key);}catch{return null;}}
function remove(key){try{localStorage.removeItem(key);}catch{}}
export class Store{
 constructor(onChange){this.data=empty();this.revision=null;this.ready=false;this.online=false;this.busy=false;this.locked=false;this.preview=preview;this.key=stored(AUTH)||'';this.message='Loading your wallet…';this.onChange=onChange;}
 cache(){try{localStorage.setItem(CACHE,JSON.stringify({data:this.data,revision:this.revision}));}catch{}}
 clear(){remove(CACHE);this.data=empty();this.ready=false;this.revision=null;}
 disconnect(){remove(AUTH);this.key='';this.clear();this.locked=true;this.online=false;}
 async request(method='GET',body,key=this.key){
  const headers=body?{'Content-Type':'application/json'}:{};if(!preview)headers['X-Auth']=key;
  let response;try{response=await fetch(API,{method,credentials:'omit',cache:'no-store',redirect:'error',headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000)});}catch{throw new Error('Cannot reach Streetbot. Check your connection and try Refresh.');}
  let result;try{result=await response.json();}catch{throw new Error('Streetbot has not returned app data. The Pocket Miles backend may need deployment.');}
  if(!response.ok){const e=new Error([401,403].includes(response.status)?'This connection key expired or was revoked. Send /pocket to your bot for a new one.':result.error||'Could not complete the request.');e.status=response.status;throw e;}
  return result;
 }
 accept(result){if(!Number.isSafeInteger(result.revision)||result.revision<0)throw new Error('Invalid saved version from server.');this.data=validateNotebook(result.data);this.data.settings??={...WALLET_DEFAULTS};this.revision=result.revision;this.ready=true;this.online=true;this.locked=false;this.cache();}
 async load(){
  if(this.busy)return;
  if(!preview&&!this.key){this.clear();this.locked=true;this.message='Connect this device once to get started';this.onChange();return;}
  this.busy=true;this.message='Syncing your wallet…';this.onChange();
  try{this.accept(await this.request());this.message=preview?'Local preview · saved on this computer':'Saved and synced with Streetbot';}
  catch(e){
   this.online=false;
   if([401,403].includes(e.status)){this.disconnect();this.message=e.message;}
   else{try{const saved=JSON.parse(stored(CACHE)||'null');if(saved&&Number.isSafeInteger(saved.revision)){this.data=validateNotebook(saved.data);this.revision=saved.revision;this.ready=true;this.locked=false;}}catch{}
    this.message=this.ready?'Offline · using saved details · edits need a connection':e.message;}
  }finally{this.busy=false;this.onChange();}
 }
 async save(change){
  if(!this.online||!this.ready||this.revision===null)throw new Error('Reconnect and refresh before saving.');
  if(this.busy)throw new Error('Another save is in progress. Please wait.');
  const data=validateNotebook(change(this.data));this.busy=true;this.message='Saving…';this.onChange();
  try{this.accept(await this.request('PUT',{data,revision:this.revision}));this.message=preview?'Saved on this computer':'Saved and synced with Streetbot';}
  catch(e){this.online=false;if([401,403].includes(e.status))this.disconnect();this.message=e.status===409?'Another device saved changes. Refresh before retrying.':'Save not confirmed. Refresh to check before retrying.';throw e;}
  finally{this.busy=false;this.onChange();}
 }
 async unlock(value){
  if(this.busy)throw new Error('Please wait for the current request.');
  const key=value.trim();if(!/^sb_[a-f0-9]{16}_[A-Za-z0-9_-]{43}$/.test(key))throw new Error('Paste the full connection key from your bot’s /pocket reply.');
  this.busy=true;this.message='Connecting this device…';this.onChange();
  try{const result=await this.request('GET',undefined,key);this.accept(result);this.key=key;try{localStorage.setItem(AUTH,key);}catch{this.message='Connected for this session only';return;}this.message='Saved and synced with Streetbot';}
  finally{this.busy=false;this.onChange();}
 }
 async lock(){this.disconnect();this.message='Disconnected on this device';this.onChange();}
}
