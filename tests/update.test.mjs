import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {updateApp} from '../public/updater.js';

class Worker extends EventTarget{
 constructor(state){super();this.state=state;this.messages=[];}
 change(state){this.state=state;this.dispatchEvent(new Event('statechange'));}
 postMessage(message){this.messages.push(message);queueMicrotask(()=>this.change('activated'));}
}
const base='https://joellimrl.github.io/pocket-miles/update.html';
const service=registration=>({register:async(url,options)=>{
 assert.equal(url,'https://joellimrl.github.io/pocket-miles/sw.js');
 assert.deepEqual(options,{scope:'https://joellimrl.github.io/pocket-miles/',updateViaCache:'none'});
 return registration;
}});

test('update activates a waiting release without unregistering or clearing user storage',async()=>{
 const waiting=new Worker('installed');let updates=0;
 await updateApp(service({waiting,update:async()=>{updates++;}}),base);
 assert.equal(updates,1);assert.deepEqual(waiting.messages,[{type:'SKIP_WAITING'}]);assert.equal(waiting.state,'activated');
});

test('new installing worker takes precedence over an older waiting worker',async()=>{
 const waiting=new Worker('installed'),installing=new Worker('installing');
 const update=updateApp(service({waiting,installing,update:async()=>{setTimeout(()=>installing.change('installed'),5);}}),base);
 await update;
 assert.equal(waiting.messages.length,0);assert.equal(installing.state,'activated');
});

test('current release and failed downloads finish or report failure without clearing data',async()=>{
 await updateApp(service({active:{state:'activated'},update:async()=>{}}),base);
 await assert.rejects(updateApp(service({update:async()=>{throw new Error('Offline');}}),base),/Offline/);
 const installing=new Worker('installing');
 await assert.rejects(updateApp(service({installing,update:async()=>{setTimeout(()=>installing.change('redundant'),5);}}),base),/could not finish/);
});

test('service worker refreshes shell assets and activates early only on the update message',async()=>{
 const events={},requests=[];let skips=0;
 const self={registration:{scope:'https://joellimrl.github.io/pocket-miles/'},addEventListener:(type,handler)=>events[type]=handler,skipWaiting:async()=>{skips++;}};
 const caches={open:async()=>({addAll:async list=>requests.push(...list)})};
 vm.runInNewContext(await readFile(new URL('../public/sw.js',import.meta.url),'utf8'),{self,caches,URL,Request});
 let pending;
 events.install({waitUntil:p=>pending=p});await pending;
 assert.ok(requests.length>10);assert.ok(requests.every(request=>request.cache==='reload'));
 assert.equal(requests.some(request=>/update(?:r)?\.(html|js)/.test(request.url)),false,'update entry stays outside the old offline shell');
 events.message({data:{type:'unrelated'},waitUntil:p=>pending=p});assert.equal(skips,0);
 events.message({data:{type:'SKIP_WAITING'},waitUntil:p=>pending=p});await pending;assert.equal(skips,1);
});
