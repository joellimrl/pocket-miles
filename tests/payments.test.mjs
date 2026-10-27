import test from 'node:test';
import assert from 'node:assert/strict';
import {paymentMethods,comparePayments} from '../public/payments.js';
import {WALLET_DEFAULTS} from '../public/recommend.js';

const wallet={...WALLET_DEFAULTS,cards:['hsbc','citi','uob','trust'],uobQualified:true};
const merchant={name:"McDonald's",category:'fastfood',method:'tap',currency:'sgd',onlineWallet:false};
const now='2026-10-24T00:00:00Z';

test('saved payment preferences do not hide other applicable methods',()=>{
 for(const method of ['tap','online','insert']){
  assert.deepEqual(paymentMethods({...merchant,method}),['tap','online','insert']);
 }
 assert.deepEqual(paymentMethods({name:'Guardian',category:'pharmacy',method:'tap'}),['tap','online','insert']);
 assert.deepEqual(paymentMethods({name:'Cinema',category:'cinema',method:'online'}),['tap','online','insert']);
});

test('online merchants stay online even when saved with a physical preference',()=>{
 for(const name of ['Shopee','Lazada','Amazon','Taobao','GrabFood','foodpanda','McDelivery','Booking.com']){
  assert.deepEqual(paymentMethods({...merchant,name,category:'general',method:'insert'}),['online'],name);
 }
 for(const category of ['rides','delivery','marketplace','otheronline','ota']){
  assert.deepEqual(paymentMethods({...merchant,name:'Custom merchant',category}),['online'],category);
 }
 assert.deepEqual(paymentMethods({...merchant,name:'SimplyGo',category:'mrt'}),['tap']);
 assert.deepEqual(paymentMethods({...merchant,name:'Taxi terminal',category:'taxi'}),['tap','insert']);
});

test('each method uses its own reward calculation and recalculates amounts and caps',()=>{
 const before=JSON.stringify(merchant);
 const quick=comparePayments(merchant,'',wallet,now);
 assert.deepEqual(quick.map(p=>p.route),['tap','wallet','online','card','insert']);
 assert.deepEqual(quick.map(p=>p.result.best.id),['uob','uob','citi','uob','uob']);
 const amount=comparePayments(merchant,'12.50',wallet,now);
 assert.deepEqual(amount.map(p=>p.result.best.miles),[24,24,48,24,24]);
 const exhausted={...wallet,citiRemaining:0,citiUpdated:now};
 assert.equal(comparePayments(merchant,'',exhausted,now).find(p=>p.method==='online').result.best.id,'uob');
 assert.equal(JSON.stringify(merchant),before);
});

test('direct online and online wallet stay distinct regardless of the saved wallet flag',()=>{
 const comparisons=comparePayments({name:'Guardian',category:'pharmacy',method:'online',currency:'sgd',onlineWallet:true},'',wallet,now);
 const option=(route,id)=>comparisons.find(p=>p.route===route).result.options.find(o=>o.id===id);
 assert.equal(option('online','citi').bonus,true);
 assert.equal(option('wallet','citi').bonus,false);
 assert.equal(option('tap','hsbc').bonus,true);
 assert.equal(option('card','hsbc').bonus,true);
 assert.equal(option('insert','hsbc').bonus,false);
 assert.equal(comparisons.find(p=>p.route==='online').onlineWallet,false);
 assert.equal(comparisons.find(p=>p.route==='wallet').onlineWallet,true);
});

test('explicit routes respect online-only merchants, transit and terminal payments',()=>{
 const routes=input=>comparePayments({...merchant,...input},'',wallet,now).map(p=>p.route);
 assert.deepEqual(routes({name:'Shopee'}),['wallet','online']);
 assert.deepEqual(routes({category:'mrt'}),['tap','card']);
 assert.deepEqual(routes({category:'taxi'}),['tap','card','insert']);
 for(const onlineWallet of [false,true]){
  const result=comparePayments({...merchant,category:'fashion',onlineWallet},'',wallet,now);
  assert.ok(result.every(p=>p.result.options.find(o=>o.id==='citi').displayRate===4));
 }
});

test('excluded and invalid payments cannot create a card recommendation',()=>{
 for(const category of ['bills','topup','paynow']){
  for(const {result} of comparePayments({...merchant,category},'',wallet,now)){
   assert.equal(result.status,'excluded');assert.equal(result.best,null);
  }
 }
 for(const {result} of comparePayments(merchant,'-1',wallet,now))assert.equal(result.status,'amount');
 for(const {result} of comparePayments(merchant,'',{...wallet,cards:['citi'],trustMiles:false},now)){
  assert.ok(result.options.every(o=>o.id==='citi'));
 }
});
