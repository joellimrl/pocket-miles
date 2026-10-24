import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,WALLET_DEFAULTS,recommend} from '../public/recommend.js';
import {matchMerchants,validateNotebook} from '../public/merchants.js';
const now='2026-10-23T12:00:00Z';
const settings={...WALLET_DEFAULTS,cards:CARDS.map(c=>c.id),uobQualified:true,hsbcRemaining:1000,citiRemaining:1000,hsbcUpdated:now,citiUpdated:now};
const pay=(category,extra={},s=settings)=>recommend({category,method:'tap',currency:'sgd',...extra},s,now);
test('Name-only quick choices use only owned cards',()=>{
 assert.equal(pay('pharmacy').best.id,'hsbc');assert.equal(pay('pharmacy').quick,true);
 assert.equal(pay('pharmacy',{}, {...settings,cards:['trust']}).best.id,'trust');
 assert.equal(pay('pharmacy',{}, {...settings,cards:[]}).best,null);
 assert.equal(pay('mrt',{}, {...settings,cards:['trust']}).best.id,'trust');
});
test('Quick rates respect exhausted caps; amount accounts for partial allowance and rounding',()=>{
 assert.equal(pay('pharmacy',{}, {...settings,hsbcRemaining:0}).best.id,'trust');
 assert.equal(pay('dining',{}, {...settings,hsbcRemaining:10}).best.id,'hsbc');
 assert.equal(pay('dining',{amount:100},{...settings,hsbcRemaining:10}).best.id,'uob');
 assert.equal(pay('general').best.id,'trust');assert.equal(pay('general',{amount:4.99}).best.id,'hsbc');
});
test('SGD Amaze is optional and ranked by miles with the other cards',()=>{
 assert.equal(pay('groceries',{amount:20}).amaze,null);
 const r=pay('groceries',{amount:20},{...settings,amaze:true});
 assert.equal(r.best.id,'amaze');assert.equal(r.amaze.id,'amaze');
 const quick=pay('groceries',{},{...settings,amaze:true});
 assert.equal(quick.amaze.id,'amaze');assert.equal(quick.amaze.displayRate,4);assert.equal(quick.amaze.fee,null);
 assert.match(quick.amaze.feeLabel,/1%.*minimum S\$0.50/);
});
test('Disabled miles mode and unqualified UOB are applied',()=>{
 assert.equal(pay('fastfood',{}, {...settings,uobQualified:false}).best.id,'trust');
 assert.equal(pay('general',{}, {...settings,trustMiles:false}).best.id,'uob');
});
const merchant=(id='merchant1',variant='')=>({id,name:'Guardian',variant,category:'pharmacy',method:'tap',currency:'sgd',uobExcluded:false,onlineWallet:false,confidence:'guess',notes:'',createdAt:now,updatedAt:now});
test('Saved routes require disambiguation; partial names never silently select a branch',()=>{
 const rows=[merchant(),merchant('merchant2','website')];rows[1].method='online';
 assert.equal(matchMerchants(rows,'Guardian').exact,null);
 assert.equal(matchMerchants(rows,'Guardian').matches.length,2);
 assert.equal(matchMerchants(rows,'Guardian website').exact.id,'merchant2');
 assert.equal(matchMerchants(rows,'Guard').exact,null);
 assert.equal(matchMerchants([merchant()],'guardian $35').exact.id,'merchant1');
 const m={...merchant(),name:'Clinic 21'};
 assert.equal(matchMerchants([m],'Clinic 21').exact.id,'merchant1');
});
test('Notebook validation rejects invalid cards, duplicate routes and malformed values',()=>{
 const data={version:1,merchants:[merchant()],settings};
 assert.deepEqual(validateNotebook(data).settings.cards,settings.cards);
 assert.throws(()=>validateNotebook({...data,settings:{...settings,cards:['fake']}}));
 assert.throws(()=>validateNotebook({...data,merchants:[merchant(),merchant('merchant2')]}));
 assert.throws(()=>validateNotebook({...data,merchants:[{...merchant(),category:'fake'}]}));
 assert.throws(()=>validateNotebook({...data,settings:{...settings,citiRemaining:1001}}));
 assert.equal('extra' in validateNotebook({...data,extra:'discard'}),false);
});
