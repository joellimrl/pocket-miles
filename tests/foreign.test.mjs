import test from 'node:test';
import assert from 'node:assert/strict';
import {recommend,WALLET_DEFAULTS} from '../public/recommend.js';
import {comparePayments} from '../public/payments.js';

const now='2026-10-24T12:00:00Z';
const wallet={...WALLET_DEFAULTS,cards:['hsbc','citi','uob','trust'],amaze:true,uobQualified:true,hsbcRemaining:1000,citiRemaining:1000,hsbcUpdated:now,citiUpdated:now};
const merchant={name:'Overseas supermarket',category:'groceries',method:'tap',currency:'foreign',onlineWallet:false};
const pay=(input={},settings=wallet)=>recommend({...merchant,...input},settings,now);

test('foreign name-only search ranks Amaze and retains Trust for every checkout',()=>{
 for(const {result:r} of comparePayments(merchant,'',wallet,now)){
  assert.equal(r.best.id,'amaze');assert.equal(r.best.displayRate,4);
  assert.equal(r.options.find(o=>o.id==='trust').id,'trust');assert.equal(r.options.find(o=>o.id==='trust').displayRate,1.3);
  assert.match(r.best.feeLabel,/2.1%/);

 }
});

test('foreign amount comparisons account for miles rounding and shared partial caps',()=>{
 const r=pay({amount:100});assert.equal(r.best.id,'amaze');assert.equal(r.best.miles,400);assert.equal(r.options.find(o=>o.id==='trust').miles,130);
 const partial=pay({amount:100},{...wallet,citiRemaining:20});
 assert.equal(partial.best.id,'trust');assert.equal(partial.amaze.miles,112);
 assert.ok(partial.warnings.some(w=>/shared|share that allowance/.test(w)));
 const within=pay({amount:10},{...wallet,citiRemaining:20});assert.equal(within.best.id,'amaze');
 const tiny=pay({amount:4.99});assert.equal(tiny.best.id,'amaze');assert.equal(tiny.best.miles,16);assert.equal(tiny.options.find(o=>o.id==='trust').miles,0);
});

test('exhausted caps use base miles and never retain an Amaze 4mpd recommendation',()=>{
 for(const amount of ['',100]){
  const r=pay({amount},{...wallet,citiRemaining:0});
  assert.equal(r.best.id,'trust');assert.equal(r.amaze.displayRate,.4);
  assert.equal(r.amaze.miles,40);
 }
});

test('Amaze needs an enabled pairing and an owned Citi card',()=>{
 for(const settings of [{...wallet,amaze:false},{...wallet,amaze:undefined},{...wallet,cards:['trust']},{...wallet,cards:[]}]){
  const r=pay({},settings);assert.equal(r.amaze,null);assert.equal(r.options.some(o=>o.id==='amaze'),false);
 }
 const onlyCiti=pay({}, {...wallet,cards:['citi']});
 assert.equal(onlyCiti.best.id,'amaze');assert.equal(onlyCiti.options.some(o=>o.id==='trust'),false);
 const noTrust=pay({}, {...wallet,trustMiles:false});assert.equal(noTrust.best.id,'amaze');assert.equal(noTrust.options.find(o=>o.id==='trust').displayRate,0);
});

test('travel, transit, medical and excluded bills cannot acquire an Amaze bonus',()=>{
 for(const category of ['sia','hotel','ota','othertravel','medical','mrt','bills','topup','paynow']){
  const r=pay({category});assert.equal(r.amaze.eligible,false,category);assert.ok(r.options.includes(r.amaze),category);assert.notEqual(r.best?.id,'amaze',category);
 }
});

test('foreign direct cards remain candidates when pairing is off or ineligible',()=>{
 const r=pay({category:'pharmacy'}, {...wallet,amaze:false});
 assert.equal(r.best.id,'hsbc');assert.equal(r.best.fee,null);assert.equal(r.options.find(o=>o.id==='trust').id,'trust');
 const hotel=pay({category:'hotel'});assert.equal(hotel.best.id,'hsbc');assert.equal(hotel.amaze.eligible,false);assert.equal(hotel.amaze.displayRate,null);
});

test('stale and unknown Citi caps disclose the assumption instead of treating it as confirmed',()=>{
 for(const settings of [{...wallet,citiRemaining:null,citiUpdated:null},{...wallet,citiRemaining:0,citiUpdated:'2026-08-01T00:00:00Z'}]){
  const r=pay({},settings);assert.equal(r.best.id,'amaze');assert.equal(r.best.unknownCap,true);
  assert.ok(r.warnings.some(w=>/Citi.*unconfirmed/.test(w)));
 }
});

test('SGD hides Amaze across routes and caps without disabling the foreign pairing',()=>{
 const settings={...wallet};
 for(const citiRemaining of [0,20,1000])for(const amount of ['',20,100]){
  for(const {result:r} of comparePayments({...merchant,currency:'sgd'},amount,{...settings,citiRemaining},now)){
   assert.equal(r.amaze,null);assert.equal(r.options.some(o=>o.id==='amaze'),false);
   assert.equal(r.warnings.some(w=>/Amaze/.test(w)),false);
  }
 }
 assert.equal(settings.amaze,true);
 assert.equal(pay({},settings).best.id,'amaze');
});
