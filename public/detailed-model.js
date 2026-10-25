import {CATEGORIES} from './rules.js';
import {CARDS, WALLET_DEFAULTS, recommend} from './recommend.js';
import {paymentMethods} from './payments.js';

const order=['dining','fastfood','groceries','pharmacy','bakery','electronics','books','fashion','marketplace','delivery','rides','mrt','sia','general'];
export const DETAIL_CATEGORIES=[...order.map(id=>CATEGORIES.find(c=>c.id===id)),...CATEGORIES.filter(c=>!order.includes(c.id))];
export const ROUTES={
 tap:{label:'Tap / phone',short:'Tap',method:'tap',onlineWallet:false},
 online:{label:'Online · direct card details',short:'Online',method:'online',onlineWallet:false},
 wallet:{label:'Online · Google / Apple Pay',short:'GPay / APay',method:'online',onlineWallet:true},
 insert:{label:'Insert card',short:'Insert',method:'insert',onlineWallet:false}
};
export const SHEET_DEFAULTS={currency:'sgd',amount:'',hsbcRemaining:1000,citiRemaining:1000,uobQualified:true};
const numberIn=(value,min,max,label)=>{
 const n=Number(value);
 if(value===null||value===''||!Number.isFinite(n)||n<min||n>max)throw new Error(label);
 return n;
};

// A public what-if sheet: every card is included, with no profile or storage access.
export function detailedCategory(id,scenario={},now=new Date().toISOString()){
 const category=CATEGORIES.find(c=>c.id===id);
 if(!category)throw new Error('Choose a supported spending type.');
 const s={...SHEET_DEFAULTS,...scenario};
 if(!['sgd','foreign'].includes(s.currency))throw new Error('Choose SGD or foreign currency.');
 const amount=s.amount===''?'':numberIn(s.amount,0.01,1000000,'Enter an amount from S$0.01 to S$1,000,000, or leave it blank.');
 const hsbcRemaining=numberIn(s.hsbcRemaining,0,1000,'HSBC allowance must be between S$0 and S$1,000.');
 const citiRemaining=numberIn(s.citiRemaining,0,1000,'Citi allowance must be between S$0 and S$1,000.');
 if(typeof s.uobQualified!=='boolean')throw new Error('Choose whether the UOB annual condition is met.');
 const settings={...WALLET_DEFAULTS,cards:CARDS.map(c=>c.id),amaze:true,trustMiles:true,uobQualified:s.uobQualified,hsbcRemaining,citiRemaining,hsbcUpdated:now,citiUpdated:now};
 const currency=id==='mrt'?'sgd':s.currency;
 const merchant={name:category.name,category:id,method:category.method,currency,onlineWallet:false};
 const methods=paymentMethods(merchant);
 const routeIds=['tap','online','wallet','insert'].filter(route=>methods.includes(ROUTES[route].method));
 const comparisons=routeIds.map(route=>({route,...ROUTES[route],result:recommend({...merchant,...ROUTES[route],amount},settings,now)}));
 const quick=amount==='';
 const value=o=>quick?o.displayRate:o.miles;
 const rows=comparisons[0].result.options.map(card=>{
  const cells=comparisons.map(c=>({route:c.route,option:c.result.options.find(o=>o.id===card.id),best:c.result.best?.id===card.id}));
  return {...card,cells,score:Math.max(...cells.map(c=>value(c.option)??-1))};
 }).sort((a,b)=>b.score-a.score||Number(a.id==='amaze')-Number(b.id==='amaze'));
 return {category,currency,amount,quick,comparisons,rows};
}
