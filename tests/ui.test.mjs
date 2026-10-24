import 'fake-indexeddb/auto';
// DOM interaction test only; no browser automation or external requests.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {WALLET_DEFAULTS} from '../public/recommend.js';
test('connect, select wallet, save merchant, recall name, edit route and disambiguate branches',async()=>{
 const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
 const dom=new JSDOM(html,{url:'https://joellimrl.github.io/pocket-miles/'});
 const {window}=dom;window.scrollTo=()=>{};
 const originalTimeout=globalThis.setTimeout,timers=[];
 globalThis.setTimeout=(...args)=>{const timer=originalTimeout(...args);timers.push(timer);return timer;};
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
 input('merchant-search','Guardian');assert.match($('result').textContent,/HSBC Revolution/);
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
 assert.match($('result').querySelector('.recommendation').textContent,/Citi Rewards/);
 $('clear-search').click();input('merchant-search','Guardian');
 assert.equal($('matches').hidden,false);assert.equal($('result').innerHTML,'');
 event('pay-amount','input');assert.equal($('result').innerHTML,'','amount rerender must not bypass ambiguous routes');
 document.querySelector('#matches [data-select]').click();
 assert.ok($('result').querySelector('.recommendation'));
 const row=server.data.merchants.find(m=>$('merchant-search').value.includes(m.variant));
 row.method='insert';server.revision++;
 $('refresh').click();await until(()=>$('result').textContent.includes('Insert card'));
 assert.match($('result').querySelector('.recommendation').textContent,/Trust Freedom/);
 // Stored HTML-looking merchant data must remain text.
 document.querySelector('[data-edit-current]').click();input('name','<img src=x onerror=alert(1)>');event('merchant-form','submit');
 await until(()=>server.data.merchants.some(m=>m.name.startsWith('<img'))&&!$('merchant-dialog').open);
 assert.equal(document.querySelector('#result img'),null);
 $('logout').click();await until(()=>$('workspace').hidden);
 assert.equal(localStorage.length,0);
 for(const timer of timers)clearTimeout(timer);
 globalThis.setTimeout=originalTimeout;
 dom.window.close();
});
