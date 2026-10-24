import test from 'node:test';
import assert from 'node:assert/strict';
import {CATEGORIES} from '../public/rules.js';
import {CARDS,recommend,WALLET_DEFAULTS} from '../public/recommend.js';

const now='2026-10-24T12:00:00Z';
const wallet={...WALLET_DEFAULTS,cards:CARDS.map(c=>c.id),amaze:true,uobQualified:true,hsbcRemaining:1000,citiRemaining:1000,hsbcUpdated:now,citiUpdated:now};
const pay=(input={},settings=wallet)=>recommend({category:'groceries',method:'tap',currency:'sgd',...input},settings,now);

test('every category retains all owned cards and the enabled pairing, sorted by miles',()=>{
 for(const {id:category} of CATEGORIES)for(const method of ['tap','online','insert'])for(const currency of ['sgd','foreign'])for(const amount of ['',4.99,100]){
  const r=pay({category,method,currency,amount}),label=`${category}/${method}/${currency}/${amount}`;
  assert.deepEqual(r.options.map(o=>o.id).sort(),['amaze','citi','hsbc','trust','uob'],label);
  const scores=r.options.map(o=>(r.quick?o.displayRate:o.miles)??-1);
  assert.ok(scores.every((score,i)=>!i||scores[i-1]>=score),label);
  assert.ok(!r.best||r.best===r.options[0],label);
 }
});

test('a higher-mile paid route ranks first locally, while equal miles favour direct Citi',()=>{
 const physical=pay();
 assert.deepEqual(physical.options.map(o=>o.id),['amaze','trust','uob','citi','hsbc']);
 const online=pay({method:'online'});
 assert.equal(online.options[0].id,'citi');assert.equal(online.options[1].id,'amaze');
 assert.equal(online.options[0].displayRate,online.options[1].displayRate);
 assert.match(online.amaze.feeLabel,/1%.*minimum/);
});

test('adding an amount reorders a partially capped card by total miles',()=>{
 const partial={...wallet,citiRemaining:20};
 assert.equal(pay({},partial).best.id,'amaze');
 const r=pay({amount:100},partial);
 assert.deepEqual(r.options.map(o=>o.id),['trust','uob','amaze','citi','hsbc']);
 assert.equal(r.options[0].miles,130);assert.equal(r.amaze.miles,112);
 assert.equal(r.amaze.fee,1);
});

test('excluded and disabled cards show zero; unmodelled travel pairing stays last',()=>{
 const disabled=pay({}, {...wallet,trustMiles:false});
 assert.equal(disabled.options.at(-1).id,'trust');assert.equal(disabled.options.at(-1).displayRate,0);
 const transit=pay({category:'mrt'});
 assert.equal(transit.options.find(o=>o.id==='citi').displayRate,0);
 assert.equal(transit.amaze.displayRate,0);
 const excluded=pay({category:'bills',amount:35});
 assert.equal(excluded.best,null);assert.equal(excluded.amount,35);
 assert.ok(excluded.options.every(o=>!o.eligible&&o.displayRate===0&&o.miles===0));
 const travel=pay({category:'hotel',amount:100});
 assert.equal(travel.options.at(-1).id,'amaze');assert.equal(travel.amaze.miles,null);
 assert.match(travel.amaze.reason,/not estimated/);
});
