import test from 'node:test';
import assert from 'node:assert/strict';
import {CATEGORIES} from '../public/rules.js';
import {DETAIL_CATEGORIES,detailedCategory} from '../public/detailed-model.js';

const now='2026-10-25T00:00:00Z';
const sheet=(id,options={})=>detailedCategory(id,options,now);
const cell=(s,card,route)=>s.rows.find(r=>r.id===card).cells.find(c=>c.route===route).option;

test('detailed reference retains every card across every supported category and only valid routes',()=>{
 assert.deepEqual(DETAIL_CATEGORIES.map(c=>c.id).sort(),CATEGORIES.map(c=>c.id).sort());
 for(const c of DETAIL_CATEGORIES)for(const currency of ['sgd','foreign']){
  const s=sheet(c.id,{currency});
  assert.deepEqual(s.rows.map(r=>r.id).sort(),currency==='foreign'&&c.id!=='mrt'?['amaze','citi','hsbc','trust','uob']:['citi','hsbc','trust','uob']);
  assert.ok(s.rows.every((row,i)=>!i||s.rows[i-1].score>=row.score));
 }
 assert.deepEqual(sheet('marketplace').comparisons.map(c=>c.route),['wallet','online']);
 assert.deepEqual(sheet('dining').comparisons.map(c=>c.route),['tap','wallet','online','card','insert']);
 assert.deepEqual(sheet('mrt',{currency:'foreign'}).comparisons.map(c=>c.route),['tap','card']);
 assert.equal(sheet('mrt',{currency:'foreign'}).currency,'sgd');
 assert.deepEqual(sheet('taxi').comparisons.map(c=>c.route),['tap','card','insert']);
});

test('Citi general online bonus differs from wallets, while shopping bonus survives each route',()=>{
 const dining=sheet('dining');
 assert.equal(cell(dining,'citi','online').displayRate,4);
 assert.equal(cell(dining,'citi','wallet').displayRate,.4);
 assert.equal(cell(dining,'citi','tap').displayRate,.4);
 assert.equal(cell(dining,'hsbc','tap').displayRate,10/3);
 assert.equal(cell(dining,'hsbc','card').displayRate,10/3);
 assert.equal(cell(dining,'hsbc','insert').displayRate,1/3);
 for(const route of ['tap','wallet','online','card','insert'])assert.equal(cell(sheet('fashion'),'citi',route).displayRate,4);
 assert.equal(cell(sheet('dining',{currency:'foreign'}),'amaze','wallet').displayRate,4);
});

test('amounts, allowances and UOB qualification change the public scenario without hiding cards',()=>{
 const small=sheet('fastfood',{amount:4.99});
 assert.equal(cell(small,'uob','tap').miles,0);
 assert.equal(cell(small,'trust','tap').miles,0);
 assert.equal(cell(small,'citi','online').miles,16);
 const capped=sheet('groceries',{amount:100,citiRemaining:20});
 assert.equal(cell(capped,'citi','online').miles,112);
 assert.equal(cell(sheet('groceries',{currency:'foreign',amount:100,citiRemaining:20}),'amaze','tap').miles,112);
 assert.equal(capped.rows[0].id,'trust');
 assert.equal(cell(sheet('fashion',{citiRemaining:0}),'citi','wallet').displayRate,.4);
 assert.equal(cell(sheet('dining',{hsbcRemaining:0}),'hsbc','tap').displayRate,1/3);
 assert.equal(cell(sheet('dining',{uobQualified:false}),'uob','tap').displayRate,1.2);
 assert.equal(cell(sheet('sia',{uobQualified:false}),'uob','online').displayRate,3);
});

test('foreign fees, unmodelled travel, exclusions and input errors remain explicit',()=>{
 const foreign=sheet('groceries',{currency:'foreign'});
 assert.match(cell(foreign,'amaze','tap').feeLabel,/2.1%/);
 assert.match(cell(foreign,'trust','tap').feeLabel,/No foreign/);
 assert.match(cell(foreign,'hsbc','tap').feeLabel,/Bank FX/);
 assert.equal(cell(sheet('hotel',{currency:'foreign'}),'amaze','online').displayRate,null);
 assert.equal(cell(sheet('bills'),'citi','online').displayRate,0);
 assert.equal(sheet('bills').comparisons[0].result.best,null);
 for(const invalid of [{amount:-1},{amount:Infinity},{amount:1000001},{citiRemaining:-1},{hsbcRemaining:1001},{currency:'usd'},{uobQualified:'yes'}])assert.throws(()=>sheet('dining',invalid));
});
