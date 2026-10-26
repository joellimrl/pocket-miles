import {evaluate,DEFAULT_SETTINGS} from './rules.js';
export const CARDS=[
 {id:'hsbc',name:'HSBC Revolution',short:'HSBC',color:'red',description:'Selected online and contactless categories · standard 10× tier'},
 {id:'citi',name:'Citi Rewards',short:'Citi',color:'blue',description:'Eligible online purchases and selected shopping categories'},
 {id:'uob',name:'KrisFlyer UOB',short:'UOB',color:'navy',description:'Dining, transport and selected categories with your annual qualification'},
 {id:'trust',name:'Trust Freedom',short:'Trust',color:'green',description:'Miles mode · uncapped base spending · no foreign transaction fee'}
];
export const WALLET_DEFAULTS={...DEFAULT_SETTINGS,cards:[],amaze:false,uobQualified:false};
const priority=['uob','citi','hsbc','trust','amaze'];
const baseRate={hsbc:1/3,citi:0.4,amaze:0.4};
const withDisplayRate=o=>({...o,miles:o.eligible?o.miles:0,displayRate:!o.eligible?0:o.cap===0?(baseRate[o.id]??o.rate):o.rate});
// Miles determine the order of included routes. Costs only break ties.
const costOrder=o=>o.fee===0?0:o.id==='amaze'?1:2;
export function recommend(input,settings=WALLET_DEFAULTS,now=new Date().toISOString()){
 const owned=settings.cards??WALLET_DEFAULTS.cards;
 const quick=input.amount===undefined||input.amount===null||input.amount==='';
 const r=evaluate({...input,amount:quick?100:input.amount},settings,now);
 if(!['ok','excluded'].includes(r.status))return{...r,quick};
 const foreign=input.currency==='foreign';
 const direct=r.status==='excluded'?CARDS.filter(o=>owned.includes(o.id)).map(o=>({...o,miles:0,displayRate:0,eligible:false,fee:null,feeLabel:'Rewards excluded',reason:r.message,rounding:''})):r.options.filter(o=>owned.includes(o.id)).map(withDisplayRate);
 // Keep the saved pairing for foreign purchases; omit its paid SGD route.
 const pairingEnabled=foreign&&owned.includes('citi')&&settings.amaze===true;
 const paired=pairingEnabled&&r.amaze?withDisplayRate(r.amaze):null;
 const unavailablePair=pairingEnabled&&!paired?{id:'amaze',name:'Amaze + Citi Rewards',short:'Amaze + Citi',color:'purple',eligible:false,miles:r.category?.travel?null:0,displayRate:r.category?.travel?null:0,fee:null,feeLabel:r.category?.travel?'Travel bonus excluded':'No miles assumed',reason:r.category?.travel?'Citi’s online bonus excludes travel. Amaze base miles are not estimated for this category.':r.message||'This category is excluded or treated conservatively for Citi. Routing the payment through Amaze does not remove those exclusions.',rounding:''}:null;
 const amaze=paired||unavailablePair;
 const score=o=>quick?o.displayRate:o.miles;
 const rank=(a,b)=>(score(b)??-1)-(score(a)??-1)||Number(b.eligible)-Number(a.eligible)||costOrder(a)-costOrder(b)||priority.indexOf(a.id)-priority.indexOf(b.id);
 const options=[...direct,...(amaze?[amaze]:[])].sort(rank);
 const candidates=options.filter(o=>o.eligible);
 const best=candidates[0]||null;
 let warnings=r.warnings.filter(w=>!/amount earns no/.test(w)&&!(quick&&/exceeds your/.test(w)));
 if(!owned.includes('hsbc'))warnings=warnings.filter(w=>!(/HSBC/.test(w)&&!/Citi/.test(w)));
 if(!owned.includes('citi'))warnings=warnings.filter(w=>!(/Citi/.test(w)&&!/HSBC/.test(w)));
 if(!owned.includes('uob'))warnings=warnings.filter(w=>!/UOB|annual target/.test(w));
 const unknown=[...new Set(options.filter(o=>o.unknownCap&&o.eligible).map(o=>o.id==='amaze'?'Citi':o.short))];
 warnings=warnings.filter(w=>!/allowance not confirmed/.test(w));
 if(unknown.length)warnings.unshift(`${unknown.join(' and ')} bonus allowance is unconfirmed. This choice assumes allowance remains; update it in Wallet.`);
 if(quick&&best?.cap>0&&!best.unknownCap)warnings.unshift(`S$${best.cap} bonus allowance remains on this card. Add the amount if this purchase could use it up.`);
 if(paired&&!quick&&!paired.unknownCap&&paired.cap<Math.floor(r.amount)&&!warnings.some(w=>/exceeds your Citi/.test(w)))warnings.push('Part of this purchase exceeds your Citi bonus allowance. Amaze and direct Citi spending share that allowance.');
 if(!quick&&best?.miles===0)warnings.push('This amount earns no miles on the recommended eligible route under its rounding rules.');
 if(paired)warnings.push('Amaze estimates assume the reported Citi Rewards Mastercard pairing qualifies for the online bonus. Merchant exclusions and Citi’s shared statement-month cap still apply.');
 return{...r,quick,amount:quick?null:Number(input.amount),foreign,best,options,warnings,amaze};
}
