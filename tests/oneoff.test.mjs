// DOM interactions with a mocked notebook; no browser or external requests.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {CARDS,WALLET_DEFAULTS} from '../public/recommend.js';
import {MAX_MERCHANTS,validateNotebook} from '../public/merchants.js';

test('one-off purchase checks are separate from saved places',async t=>{
 const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
 const dom=new JSDOM(html,{url:'https://joellimrl.github.io/pocket-miles/'}),{window}=dom;
 window.scrollTo=()=>{};
 window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
 const originalTimeout=globalThis.setTimeout,timers=[];
 globalThis.setTimeout=(...args)=>{const timer=originalTimeout(...args);timers.push(timer);return timer;};
 t.after(()=>{for(const timer of timers)clearTimeout(timer);globalThis.setTimeout=originalTimeout;dom.window.close();});
 for(const key of ['window','document','location','localStorage','navigator'])Object.defineProperty(globalThis,key,{value:window[key],configurable:true});
 globalThis.confirm=()=>true;
 localStorage.setItem('pocket-miles-device-key','sb_'+'2'.repeat(16)+'_'+'b'.repeat(43));
 let server={data:{version:1,merchants:[],settings:{...WALLET_DEFAULTS,cards:CARDS.map(c=>c.id),uobQualified:true}},revision:0};
 let calls=0,writes=0,offline=false;
 globalThis.fetch=async(_url,options)=>{
  calls++;
  if(offline)throw new Error('Offline');
  if(options.method==='PUT'){
   writes++;const input=JSON.parse(options.body);
   if(input.revision!==server.revision)return Response.json({error:'Conflict'},{status:409});
   server={data:validateNotebook(input.data),revision:server.revision+1};
  }
  return Response.json(server);
 };
 const $=id=>document.getElementById(id);
 const event=(id,type)=>$(id).dispatchEvent(new window.Event(type,{bubbles:true,cancelable:true}));
 const input=(id,value)=>{$(id).value=value;event(id,'input');};
 const remember=value=>{$('remember-merchant').checked=value;event('remember-merchant','change');};
 const until=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw new Error('UI condition timed out');};
 const cache=()=>localStorage.getItem('pocket-miles-personal-v3');
 await import('../public/app.js');
 assert.equal($('workspace').hidden,false);

 await t.test('new merchant defaults to check only, validates details and never persists them',async()=>{
  const before=cache(),beforeCalls=calls;
  input('merchant-search','Zaffron Corner');document.querySelector('[data-add]').click();
  assert.equal($('remember-merchant').checked,false);
  assert.equal($('merchant-save').textContent,'Show best card');
  event('merchant-form','submit');
  assert.match($('merchant-error').textContent,/category/);
  assert.equal($('merchant-dialog').open,true);
  $('category').value='pharmacy';event('merchant-form','submit');
  assert.equal($('merchant-dialog').open,false);
  assert.match($('result').textContent,/HSBC Revolution/);
  assert.match($('result').textContent,/One-off · not saved/);
  assert.equal(calls,beforeCalls);assert.equal(writes,0);
  assert.equal(server.data.merchants.length,0);assert.equal(cache(),before);
  assert.doesNotMatch($('recent-list').textContent,/Zaffron/);
 });

 await t.test('explicit save persists the checked details and recalls them by name',async()=>{
  document.querySelector('[data-save-current]').click();
  assert.equal($('remember-merchant').checked,true);
  assert.equal($('category').value,'pharmacy');
  event('merchant-form','submit');
  await until(()=>server.data.merchants.length===1&&!$('merchant-dialog').open);
  assert.equal(writes,1);assert.match($('result').textContent,/Saved place/);
  $('clear-search').click();input('merchant-search','Zaffron Corner');
  assert.match($('result').textContent,/HSBC Revolution/);
  assert.match($('search-tip').textContent,/saved details/);
 });

 await t.test('a temporary payment change does not overwrite a saved place',async()=>{
  const before=cache(),beforeCalls=calls;
  document.querySelector('[data-edit-current]').click();
  assert.equal($('remember-merchant').checked,true);
  $('method').value='insert';remember(false);event('merchant-form','submit');
  assert.match($('result').textContent,/Trust Freedom/);
  assert.match($('result').textContent,/One-off · not saved/);
  assert.equal(server.data.merchants[0].method,'tap');assert.equal(cache(),before);
  assert.equal(calls,beforeCalls);
  $('clear-search').click();input('merchant-search','Zaffron Corner');
  assert.match($('result').textContent,/HSBC Revolution/);
 });

 await t.test('500 saved places still allow one-off checks and edits to existing places',async()=>{
  const template=server.data.merchants[0];
  server.data.merchants=Array.from({length:MAX_MERCHANTS},(_,i)=>({...template,id:`merchant-${i}`,name:`Saved place ${i}`}));
  server.revision++;$('refresh').click();
  await until(()=>$('merchant-count').textContent.startsWith('500 of 500')&&!$('refresh').disabled);
  input('merchant-search','Saved place 0');document.querySelector('[data-edit-current]').click();
  assert.equal($('remember-merchant').disabled,false);
  assert.equal($('remember-merchant').checked,true);
  input('notes','Keep this existing entry');event('merchant-form','submit');
  await until(()=>!$('merchant-dialog').open);
  assert.equal(server.data.merchants.length,MAX_MERCHANTS);
  assert.equal(server.data.merchants.find(m=>m.id==='merchant-0').notes,'Keep this existing entry');
  const beforeCalls=calls,before=cache();
  input('merchant-search','Unfamiliar Corner');document.querySelector('[data-add]').click();
  assert.equal($('remember-merchant').checked,false);
  assert.equal($('remember-merchant').disabled,true);
  assert.equal($('merchant-save').disabled,false);
  assert.match($('remember-help').textContent,/500.*without saving/);
  $('category').value='pharmacy';event('merchant-form','submit');
  assert.ok($('result').querySelector('.recommendation'));
  document.querySelector('[data-save-current]').click();
  assert.equal($('remember-merchant').checked,false,'explicit save cannot bypass the full saved list');
  event('merchant-form','submit');
  assert.equal(calls,beforeCalls);assert.equal(cache(),before);
  assert.equal(server.data.merchants.length,MAX_MERCHANTS);
 });

 await t.test('cached wallet supports new one-off checks offline but cannot save',async()=>{
  server.data.merchants=server.data.merchants.slice(0,1);server.revision++;
  $('refresh').click();await until(()=>$('merchant-count').textContent.startsWith('1 of 500')&&!$('refresh').disabled);
  offline=true;$('refresh').click();await until(()=>$('connection-text').textContent.startsWith('Offline'));
  const before=cache(),beforeCalls=calls;
  input('merchant-search','Unfamiliar Offline Shop');document.querySelector('[data-add]').click();
  assert.equal($('remember-merchant').checked,false);assert.equal($('merchant-save').disabled,false);
  remember(true);assert.equal($('merchant-save').disabled,true);
  assert.match($('remember-help').textContent,/Reconnect/);
  remember(false);$('category').value='pharmacy';event('merchant-form','submit');
  assert.equal($('merchant-dialog').open,false);
  assert.ok($('result').querySelector('.recommendation'));
  assert.equal(calls,beforeCalls);assert.equal(cache(),before);
  input('merchant-search','Unfamiliar Different Shop');
  assert.ok(document.querySelector('[data-add]'),'another unknown merchant needs its own details');
  assert.doesNotMatch($('recent-list').textContent,/Offline Shop/);
 });
});
