import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBaseline,baselineRows,mergeBaseline} from '../public/baseline.js';
import {WALLET_DEFAULTS} from '../public/recommend.js';

const now='2026-10-25T00:00:00.000Z';
const merchant=(id,name)=>({id,name,variant:'',category:'dining',method:'tap',currency:'sgd',confidence:'confirmed',onlineWallet:false,uobExcluded:false,notes:'History suggests a merchant; MCC unconfirmed.',createdAt:now,updatedAt:now});
const candidate=(id,name)=>({merchant:merchant(id,name),count:12,lastSeen:'2026-05-02',suggested:true,aliases:[name]});
const bundle=()=>({format:'pocket-miles-merchant-baseline',version:1,profileId:'owner',asOf:'2026-10-25',source:'Synthetic test history',candidates:[candidate('history-1','Example Cafe'),candidate('history-2','Example Shop')]});
const notebook=()=>({version:1,merchants:[],settings:{...WALLET_DEFAULTS,cards:['citi'],citiRemaining:124,citiUpdated:now,savedAt:now}});

test('baseline adds selected suggestions and preserves wallet and existing merchant details',()=>{
 const data=notebook(),b=bundle();data.merchants.push({...merchant('existing-1','Example Cafe'),variant:'Confirmed outlet',notes:'Verified by owner'});
 const before=structuredClone(data);
 const result=mergeBaseline(data,b,['history-1','history-2'],'owner');
 assert.deepEqual(data,before);assert.deepEqual(result.data.settings,before.settings);
 assert.deepEqual(result.data.merchants[0],data.merchants[0]);
 assert.equal(result.added,1);assert.equal(result.skipped,1);assert.equal(result.data.merchants[1].confidence,'guess');
 assert.equal(mergeBaseline(result.data,b,['history-1','history-2'],'owner').added,0,'repeat import is idempotent');
});

test('duplicate IDs, routes and known merchant aliases cannot overwrite saved entries',()=>{
 const data=notebook(),b=bundle();b.candidates[0].aliases=['Shop nickname'];
 data.merchants.push(merchant('existing-1','SHOP NICKNAME'));
 data.merchants.push(merchant('history-2','Renamed place'));
 assert.ok(baselineRows(data,validateBaseline(b)).every(r=>r.exists));
 assert.equal(mergeBaseline(data,b,['history-1','history-2'],'owner').added,0);
 const duplicate=bundle();duplicate.candidates.push(structuredClone(duplicate.candidates[0]));
 assert.throws(()=>validateBaseline(duplicate),/duplicate/);
});

test('history cannot select another profile, update settings or add unticked rows',()=>{
 const b=bundle(),data=notebook();b.settings={cards:['trust']};b.candidates[0].merchant.confidence='confirmed';
 assert.throws(()=>mergeBaseline(data,b,['history-1'],'spouse'),/different profile/);
 assert.throws(()=>mergeBaseline(data,b,['missing-id'],'owner'),/selection/);
 const result=mergeBaseline(data,b,['history-1'],'owner');
 assert.equal(result.data.merchants.length,1);assert.equal(result.data.merchants[0].confidence,'guess');
 assert.deepEqual(result.data.settings,data.settings);
 assert.equal(mergeBaseline(data,b,[],'owner').added,0);
});

test('history validates dates, record sizes, selection uniqueness and saved capacity before writing',()=>{
 for(const change of [b=>b.candidates[0].lastSeen='2026-11-07',b=>b.asOf='2026-02-31',b=>b.candidates[0].count=-1,b=>b.candidates[0].aliases=[null],b=>b.candidates[0].merchant.category='unknown',b=>b.profileId=['owner']]){
  const b=bundle();change(b);assert.throws(()=>validateBaseline(b));
 }
 const data=notebook();data.merchants=Array.from({length:499},(_,i)=>merchant(`saved-${i}`.padEnd(8,'x'),`Saved ${i}`));
 assert.throws(()=>mergeBaseline(data,bundle(),['history-1','history-2'],'owner'),/1 saved slots/);
 assert.equal(mergeBaseline(data,bundle(),['history-1'],'owner').data.merchants.length,500);
 assert.throws(()=>mergeBaseline(notebook(),bundle(),['history-1','history-1'],'owner'),/selection/);
});
