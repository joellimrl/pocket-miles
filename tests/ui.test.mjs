import 'fake-indexeddb/auto';
// DOM interaction test only; no browser automation or external requests.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {WALLET_DEFAULTS} from '../public/recommend.js';
test('connect, compare checkout methods, save merchant, recall name, edit route and disambiguate branches',async t=>{
 const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
 const dom=new JSDOM(html,{url:'https://joellimrl.github.io/pocket-miles/'});
 const {window}=dom;window.scrollTo=()=>{};
 const originalTimeout=globalThis.setTimeout,timers=[];
 globalThis.setTimeout=(...args)=>{const timer=originalTimeout(...args);timers.push(timer);return timer;};
 t.after(()=>{for(const timer of timers)clearTimeout(timer);globalThis.setTimeout=originalTimeout;dom.window.close();});
 window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
 for(const key of ['window','document','location','localStorage','navigator'])Object.defineProperty(globalThis,key,{value:window[key],configurable:true});
 globalThis.confirm=()=>true;
 let server={profile:{id:"owner",name:"Owner"},data:{version:1,merchants:[],settings:{...WALLET_DEFAULTS}},revision:0},calls=0;
 globalThis.fetch=async(_url,options)=>{
  calls++;
  if(options.method==='POST')return Response.json({name:JSON.parse(options.body).name,expiresAt:null,profile:{id:"owner",name:"Owner"}});
  if(options.method==='PUT'){
   const data=JSON.parse(options.body);
   if(data.revision!==server.revision)return Response.json({error:'Conflict'},{status:409});
   server={...server,data:data.data,revision:server.revision+1};
  }
  return Response.json(server);
 };
 const $=id=>document.getElementById(id);
 const event=(id,type)=>$(id).dispatchEvent(new window.Event(type,{bubbles:true,cancelable:true}));
 const until=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw new Error('UI condition timed out');};
 const input=(id,value)=>{$(id).value=value;event(id,'input');};
 await import('../public/app.js');
 assert.equal($('login').hidden,false);assert.equal($('workspace').hidden,true);
 input('password','sb_'+'2'.repeat(16)+'_'+'b'.repeat(43));event('login-form','submit');
 await until(()=>$('workspace').hidden===false);
 assert.match($('result').textContent,/Start with your wallet/);
 document.querySelector('[data-wallet]').click();
 for(const checkbox of document.querySelectorAll('input[name=card]')){checkbox.checked=true;checkbox.dispatchEvent(new window.Event('input',{bubbles:true}));}
 $('uob-qualified').checked=true;event('wallet-form','input');event('wallet-form','submit');
 await until(()=>server.data.settings.cards.length===4&&$('pay').hidden===false);
 assert.equal($('profile-status').textContent,'Profile: Owner');
 const methods=()=>[...document.querySelectorAll('[data-payment-method]')].map(el=>el.dataset.paymentMethod);
 const cell=(method,id)=>document.querySelector(`tr[data-card-id="${id}"] [data-method="${method}"]`);
 const card=method=>document.querySelector(`.best-cell[data-method="${method}"]`)?.closest('tr').querySelector('.matrix-card-name').textContent;
 const beforeComparisonCalls=calls,beforeComparisonData=JSON.stringify(server);
 input('merchant-search',"McDonald's");
 assert.deepEqual(methods(),['tap','wallet','online','card','insert']);
 assert.deepEqual([...document.querySelectorAll('.primary-comparison [data-payment-method]')].map(el=>el.dataset.paymentMethod),['tap','wallet','online','card','insert']);
 assert.equal(document.querySelector('.other-methods'),null);
 assert.equal(document.querySelectorAll('.card-matrix').length,1);
 assert.equal(card('tap'),'KrisFlyer UOB');assert.equal(card('online'),'Citi Rewards');assert.equal(card('insert'),'KrisFlyer UOB');
 input('pay-amount','12.50');
 for(const method of methods())assert.equal(document.querySelectorAll(`td[data-method="${method}"]`).length,4);
 assert.equal(cell('online','citi').querySelector('.matrix-miles').textContent,'48');
 assert.equal(cell('wallet','citi').querySelector('.matrix-miles').textContent,'4.8');
 assert.equal(calls,beforeComparisonCalls);assert.equal(JSON.stringify(server),beforeComparisonData,'comparisons never save or change a merchant');
 input('merchant-search','Shopee');assert.deepEqual(methods(),['wallet','online']);
 input('merchant-search','GrabFood');assert.deepEqual(methods(),['wallet','online']);
 input('merchant-search','McDelivery');assert.deepEqual(methods(),['wallet','online']);
 input('merchant-search','SimplyGo');assert.deepEqual(methods(),['tap','card']);
 input('merchant-search','taxi');assert.deepEqual(methods(),['tap','card','insert']);
 input('pay-amount','-1');assert.equal(methods().length,0);assert.match($('result').textContent,/Enter an amount/);
 input('pay-amount','');
 input('merchant-search','Guardian');assert.match($('result').textContent,/HSBC Revolution/);
 assert.deepEqual(methods(),['tap','wallet','online','card','insert']);
 assert.equal(cell('tap','hsbc').querySelector('.matrix-miles').textContent,'3.33');
 assert.equal(cell('insert','hsbc').querySelector('.matrix-miles').textContent,'0.33');
 assert.equal(cell('tap','citi').querySelector('.matrix-miles').textContent,'0.4');
 assert.equal(cell('online','citi').querySelector('.matrix-miles').textContent,'4');
 const callsBefore=calls;input('merchant-search','Guardian');assert.equal(calls,callsBefore,'typing needs no API request');
 document.querySelector('[data-save-current]').click();
 assert.equal($('category').value,'pharmacy');input('variant','Tampines');event('merchant-form','submit');
 await until(()=>server.data.merchants.length===1&&!$('merchant-dialog').open);
 assert.equal($('pay-amount').value,'');assert.match($('result').textContent,/Miles \/ S\$/);
 $('clear-search').click();input('merchant-search','Guardian');
 assert.match($('result').textContent,/Guardian · Tampines/);
 document.querySelector('[data-edit-current]').click();
 $('merchant-copy').click();input('variant','website');$('method').value='online';event('merchant-form','submit');
 await until(()=>server.data.merchants.length===2&&!$('merchant-dialog').open);
 assert.deepEqual(methods(),['tap','wallet','online','card','insert'],'saved online preference still shows the other methods');
 assert.equal(card('online'),'Citi Rewards');
 $('clear-search').click();input('merchant-search','Guardian');
 assert.equal($('matches').hidden,false);assert.equal($('result').innerHTML,'');
 event('pay-amount','input');assert.equal($('result').innerHTML,'','amount rerender must not bypass ambiguous routes');
 document.querySelector('#matches [data-select]').click();
 assert.ok($('result').querySelector('.card-matrix'));
 const row=server.data.merchants.find(m=>$('merchant-search').value.includes(m.variant));
 row.method='insert';server.revision++;
 $('refresh').click();await until(()=>!$('refresh').disabled);
 assert.equal(card('insert'),'Trust Freedom');
 // Foreign comparisons must include Amaze before an amount is entered, and
 // keep every card and its fees visible outside disclosure.
 server.data.settings.amaze=true;server.revision++;
 $('refresh').click();await until(()=>!$('refresh').disabled);
 assert.equal($('pay-currency').value,'sgd');
 const table=document.querySelector('.card-matrix');
 assert.equal(table.querySelectorAll('tbody tr').length,4);
 assert.equal(table.querySelectorAll('thead [scope=col]').length,6);
 assert.equal(table.closest('details'),null);
 assert.equal(document.querySelector('.comparison-details').open,false);
 assert.equal($('recents').hidden,true);assert.equal($('quick-categories').hidden,true);
 assert.equal(document.querySelector('#pay .hero'),null);
 for(const method of methods()){
  assert.equal(cell(method,'amaze'),null);
  assert.equal(document.querySelectorAll(`td[data-method="${method}"]`).length,4);
 }
 assert.equal(table.querySelector('[data-card-id=amaze]'),null);
 assert.equal(card('tap'),'HSBC Revolution');assert.equal(card('online'),'Citi Rewards');
 const currencyCalls=calls,currencyCache=localStorage.getItem('pocket-miles-personal-v3');
 $('pay-currency').value='foreign';event('pay-currency','change');
 assert.equal(calls,currencyCalls);assert.equal(localStorage.getItem('pocket-miles-personal-v3'),currencyCache);
 assert.equal(row.currency,'sgd','quick currency switch does not edit the saved place');
 assert.match($('currency-note').textContent,/this check/);
 for(const method of methods())assert.equal(card(method),'Amaze + Citi');
 assert.match(document.querySelector('tr[data-card-id=amaze] .matrix-fee').textContent,/2.1% FX/);
 assert.match(document.querySelector('tr[data-card-id=trust] .matrix-fee').textContent,/No FX fee/);
 assert.match($('amount-label').textContent,/equivalent/);
 $('pay-currency').value='sgd';event('pay-currency','change');
 assert.equal(document.querySelector('[data-card-id=amaze]'),null);
 assert.equal(server.data.settings.amaze,true);
 $('pay-currency').value='foreign';event('pay-currency','change');
 input('pay-amount','100');
 assert.equal(cell('tap','amaze').querySelector('.matrix-miles').textContent,'400');
 assert.match(document.querySelector('.comparison-details').textContent,/S\$2\.10/);
 row.currency='foreign';
 server.data.settings.cards=['citi','trust'];server.data.settings.citiRemaining=0;server.data.settings.citiUpdated=new Date().toISOString();server.revision++;
 $('refresh').click();await until(()=>!$('refresh').disabled);
 assert.equal(card('tap'),'Trust Freedom');
 assert.equal(document.querySelectorAll('td[data-method=tap]').length,3);
 server.data.settings.amaze=false;server.revision++;
 $('refresh').click();await until(()=>!$('refresh').disabled);
 assert.equal(document.querySelectorAll('[data-card-id="amaze"]').length,0);
 assert.match($('result').textContent,/Amaze \+ Citi Rewards is not enabled/);
 // Excluded payments keep the entire wallet on screen, with no fabricated winner.
 input('merchant-search','AXS');
 assert.equal(document.querySelectorAll('.primary-comparison tbody tr').length,2);
 assert.equal(document.querySelector('.best-cell'),null);
 assert.equal(document.querySelector('.primary-comparison').closest('details'),null);
 for(const option of document.querySelectorAll('.card-matrix td')){
  assert.match(option.textContent,/Excluded/);
  assert.equal(option.querySelector('.matrix-miles').textContent,'0');
 }
 assert.doesNotMatch($('result').textContent,/NaN/);
 server.data.settings.amaze=true;server.data.settings.trustMiles=false;server.revision++;
 $('refresh').click();await until(()=>!$('refresh').disabled);
 input('merchant-search','hotel');
 $('pay-currency').value='foreign';event('pay-currency','change');
 for(const method of methods()){
  assert.match(cell(method,'amaze').textContent,/—Not estimated/);
  assert.match(cell(method,'trust').textContent,/0Mode off/);
 }
 assert.equal(document.querySelector('.card-matrix tbody tr:last-child').dataset.cardId,'amaze');
 $('clear-search').click();
 assert.equal($('recents').hidden,false);assert.equal($('quick-categories').hidden,false);
 assert.equal($('checkout-controls').hidden,true);
 input('merchant-search',displaySaved(row));
 // Stored HTML-looking merchant data must remain text.
 document.querySelector('[data-edit-current]').click();input('name','<img src=x onerror=alert(1)>');event('merchant-form','submit');
 await until(()=>server.data.merchants.some(m=>m.name.startsWith('<img'))&&!$('merchant-dialog').open);
 assert.equal(document.querySelector('#result img'),null);
 $('logout').click();await until(()=>$('workspace').hidden);
 assert.equal(localStorage.length,0);
 server={profile:{id:'spouse',name:'Spouse'},data:{version:1,merchants:[],settings:{...WALLET_DEFAULTS,cards:['trust']}},revision:0};
 // Pair response must identify the same profile as the notebook response.
 const previousFetch=globalThis.fetch;
 globalThis.fetch=async(url,options)=>options.method==='POST'?Response.json({name:'Spouse phone',expiresAt:null,profile:server.profile}):previousFetch(url,options);
 input('password','sb_'+'3'.repeat(16)+'_'+'c'.repeat(43));event('login-form','submit');
 await until(()=>$('workspace').hidden===false);
 assert.equal($('profile-status').textContent,'Profile: Spouse');
 assert.equal($('merchant-search').value,'');assert.equal($('places-search').value,'');
 assert.doesNotMatch($('places-list').textContent,/Guardian|<img/);
 input('merchant-search','Guardian');assert.equal(document.querySelectorAll('.primary-comparison tbody tr').length,1);
 assert.equal(document.querySelector('.card-matrix tbody tr').dataset.cardId,'trust');
 $('logout').click();await until(()=>$('workspace').hidden);
});

function displaySaved(row){return row.variant?`${row.name} · ${row.variant}`:row.name;}
