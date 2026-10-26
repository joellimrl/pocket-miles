import test from 'node:test';
import assert from 'node:assert/strict';
import {CATEGORIES} from '../public/rules.js';
import {CARDS,recommend,WALLET_DEFAULTS} from '../public/recommend.js';

const now='2026-10-24T12:00:00Z';
const wallet={...WALLET_DEFAULTS,cards:CARDS.map(c=>c.id),amaze:true,uobQualified:true,hsbcRemaining:1000,citiRemaining:1000,hsbcUpdated:now,citiUpdated:now};
const pay=(input={},settings=wallet)=>recommend({category:'groceries',method:'tap',currency:'sgd',...input},settings,now);

test('every category retains owned cards, with the enabled pairing only for foreign currency',()=>{
 for(const {id:category} of CATEGORIES)for(const method of ['tap','online','insert'])for(const currency of ['sgd','foreign'])for(const amount of ['',4.99,100]){
  const r=pay({category,method,currency,amount}),label=`${category}/${method}/${currency}/${amount}`;
  assert.deepEqual(r.options.map(o=>o.id).sort(),currency==='foreign'?['amaze','citi','hsbc','trust','uob']:['citi','hsbc','trust','uob'],label);
  if(currency==='sgd')assert.equal(r.amaze,null,label);
  const scores=r.options.map(o=>(r.quick?o.displayRate:o.miles)??-1);
  assert.ok(scores.every((score,i)=>!i||scores[i-1]>=score),label);
  assert.ok(!r.best||r.best===r.options[0],label);
 }
});

test('SGD compares direct cards even when the Amaze pairing is enabled',()=>{
 const physical=pay();
 assert.deepEqual(physical.options.map(o=>o.id),['trust','uob','citi','hsbc']);
 const online=pay({method:'online'});
 assert.equal(online.best.id,'citi');assert.equal(online.amaze,null);
});

test('adding an amount reorders a partially capped card by total miles',()=>{
 const partial={...wallet,citiRemaining:20};
 assert.equal(pay({currency:'foreign'},partial).best.id,'amaze');
 const r=pay({currency:'foreign',amount:100},partial);
 assert.deepEqual(r.options.map(o=>o.id),['trust','uob','amaze','citi','hsbc']);
 assert.equal(r.options[0].miles,130);assert.equal(r.amaze.miles,112);
 assert.match(r.amaze.feeLabel,/2.1%/);
});

test('excluded and disabled cards show zero; unmodelled travel pairing stays last',()=>{
 const disabled=pay({}, {...wallet,trustMiles:false});
 assert.equal(disabled.options.at(-1).id,'trust');assert.equal(disabled.options.at(-1).displayRate,0);
 const transit=pay({category:'mrt'});
 assert.equal(transit.options.find(o=>o.id==='citi').displayRate,0);
 assert.equal(transit.amaze,null);
 const excluded=pay({category:'bills',amount:35});
 assert.equal(excluded.best,null);assert.equal(excluded.amount,35);
 assert.ok(excluded.options.every(o=>!o.eligible&&o.displayRate===0&&o.miles===0));
 const travel=pay({category:'hotel',currency:'foreign',amount:100});
 assert.equal(travel.options.at(-1).id,'amaze');assert.equal(travel.amaze.miles,null);
 assert.match(travel.amaze.reason,/not estimated/);
});
