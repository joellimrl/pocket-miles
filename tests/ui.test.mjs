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
 let server={data:{version:1,merchants:[],settings:{...WALLET_DEFAULTS}},revision:0},calls=0;
 globalThis.fetch=async(_url,options)=>{
  calls++;
  if(options.method==='POST')return Response.json({name:JSON.parse(options.body).name,expiresAt:null});
  if(options.method==='PUT'){
   const data=JSON.parse(options.body);
   if(data.revision!==server.revision)return Response.json({error:'Conflict'},{status:409});
   server={data:data.data,revision:server.revision+1};
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
 const methods=()=>[...document.querySelectorAll('[data-payment-method]')].map(el=>el.dataset.paymentMethod);
 const card=method=>document.querySelector(`[data-payment-method="${method}"] .recommendation h4`)?.textContent;
 const beforeComparisonCalls=calls,beforeComparisonData=JSON.stringify(server);
 input('merchant-search',"McDonald's");
 assert.deepEqual(methods(),['tap','online','insert']);
 assert.equal(card('tap'),'KrisFlyer UOB');assert.equal(card('online'),'Citi Rewards');assert.equal(card('insert'),'KrisFlyer UOB');
 input('pay-amount','12.50');
 for(const method of methods())assert.match(document.querySelector(`[data-payment-method="${method}"] .recommendation`).textContent,/BEST ESTIMATE FOR THIS AMOUNT/);
 assert.equal(document.querySelector('[data-payment-method="online"] .reward-number').firstChild.textContent,'≈ 48');
 assert.equal(calls,beforeComparisonCalls);assert.equal(JSON.stringify(server),beforeComparisonData,'comparisons never save or change a merchant');
 input('merchant-search','Shopee');assert.deepEqual(methods(),['online']);
 input('merchant-search','GrabFood');assert.deepEqual(methods(),['online']);
 input('merchant-search','McDelivery');assert.deepEqual(methods(),['online']);
 input('merchant-search','SimplyGo');assert.deepEqual(methods(),['tap']);
 input('merchant-search','taxi');assert.deepEqual(methods(),['tap','insert']);
 input('pay-amount','-1');assert.equal(methods().length,0);assert.match($('result').textContent,/Enter an amount/);
 input('pay-amount','');
 input('merchant-search','Guardian');assert.match($('result').textContent,/HSBC Revolution/);
 assert.deepEqual(methods(),['tap','online','insert']);
 const callsBefore=calls;input('merchant-search','Guardian');assert.equal(calls,callsBefore,'typing needs no API request');
 document.querySelector('[data-save-current]').click();
 assert.equal($('category').value,'pharmacy');input('variant','Tampines');event('merchant-form','submit');
 await until(()=>server.data.merchants.length===1&&!$('merchant-dialog').open);
 assert.equal($('pay-amount').value,'');assert.match($('result').textContent,/YOUR DEFAULT CARD/);
 $('clear-search').click();input('merchant-search','Guardian');
 assert.match($('result').textContent,/Guardian · Tampines/);
 document.querySelector('[data-edit-current]').click();
 $('merchant-copy').click();input('variant','website');$('method').value='online';event('merchant-form','submit');
 await until(()=>server.data.merchants.length===2&&!$('merchant-dialog').open);
 assert.deepEqual(methods(),['tap','online','insert'],'saved online preference still shows the other methods');
 assert.equal(card('online'),'Citi Rewards');
 $('clear-search').click();input('merchant-search','Guardian');
 assert.equal($('matches').hidden,false);assert.equal($('result').innerHTML,'');
 event('pay-amount','input');assert.equal($('result').innerHTML,'','amount rerender must not bypass ambiguous routes');
 document.querySelector('#matches [data-select]').click();
 assert.ok($('result').querySelector('.recommendation'));
 const row=server.data.merchants.find(m=>$('merchant-search').value.includes(m.variant));
 row.method='insert';server.revision++;
 $('refresh').click();await until(()=>!$('refresh').disabled);
 assert.equal(card('insert'),'Trust Freedom');
 // Foreign comparisons must include Amaze before an amount is entered, and
 // make its spread and the fee-free alternative visible outside disclosure.
 server.data.settings.amaze=true;server.revision++;
 $('refresh').click();await until(()=>!$('refresh').disabled);
 assert.equal($('pay-currency').value,'sgd');
 for(const option of document.querySelectorAll('[data-amaze-option]')){
  assert.equal(option.closest('details'),null);assert.match(option.textContent,/4 miles \/ S\$/);
  assert.match(option.textContent,/minimum S\$0.50/);
 }
 assert.equal(document.querySelectorAll('[data-amaze-option]').length,3);
 const currencyCalls=calls,currencyCache=localStorage.getItem('pocket-miles-personal-v3');
 $('pay-currency').value='foreign';event('pay-currency','change');
 assert.equal(calls,currencyCalls);assert.equal(localStorage.getItem('pocket-miles-personal-v3'),currencyCache);
 assert.equal(row.currency,'sgd','quick currency switch does not edit the saved place');
 assert.match($('currency-note').textContent,/this check/);
 for(const method of methods()){
  assert.equal(card(method),'Amaze + Citi Rewards');
  const option=document.querySelector(`[data-payment-method="${method}"]`);
  assert.match(option.querySelector('.payment-fee').textContent,/2.1%/);
  assert.match(option.querySelector('.no-fx-alternative').textContent,/Trust Freedom/);
  assert.equal(option.querySelector('.no-fx-alternative').closest('details'),null);
  assert.match(option.querySelector('.checkout-note').textContent,/Amaze card/);
 }
 input('pay-amount','100');
 assert.equal(document.querySelector('[data-payment-method="tap"] .reward-number').firstChild.textContent,'≈ 400');
 assert.match(document.querySelector('[data-payment-method="tap"]').textContent,/S\$2\.10/);
 row.currency='foreign';
 server.data.settings.cards=['citi','trust'];server.data.settings.citiRemaining=0;server.data.settings.citiUpdated=new Date().toISOString();server.revision++;
 $('refresh').click();await until(()=>!$('refresh').disabled);
 assert.equal(card('tap'),'Trust Freedom');
 assert.equal(document.querySelector('.no-fx-alternative'),null);
 server.data.settings.amaze=false;server.revision++;
 $('refresh').click();await until(()=>!$('refresh').disabled);
 assert.equal(document.querySelectorAll('[data-amaze-option]').length,0);
 assert.match($('result').textContent,/Amaze \+ Citi Rewards is not enabled/);
 // Stored HTML-looking merchant data must remain text.
 document.querySelector('[data-edit-current]').click();input('name','<img src=x onerror=alert(1)>');event('merchant-form','submit');
 await until(()=>server.data.merchants.some(m=>m.name.startsWith('<img'))&&!$('merchant-dialog').open);
 assert.equal(document.querySelector('#result img'),null);
 $('logout').click();await until(()=>$('workspace').hidden);
 assert.equal(localStorage.length,0);
});
