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
const withDisplayRate=o=>({...o,displayRate:o.cap===0?(baseRate[o.id]??o.rate):o.rate});
// For equal miles, prefer no added fee, then the disclosed Amaze spread over
// an unmodelled bank FX fee. This is a tie-break, not a net-value calculation.
const fxCostOrder=o=>o.fee===0?0:o.id==='amaze'?1:2;
export function recommend(input,settings=WALLET_DEFAULTS,now=new Date().toISOString()){
 const owned=settings.cards??WALLET_DEFAULTS.cards;
 const quick=input.amount===undefined||input.amount===null||input.amount==='';
 const r=evaluate({...input,amount:quick?100:input.amount},settings,now);
 if(r.status!=='ok')return{...r,quick};
 const direct=r.options.filter(o=>owned.includes(o.id)).map(withDisplayRate);
 const paired=owned.includes('citi')&&settings.amaze===true&&r.amaze?withDisplayRate(r.amaze):null;
 const options=r.foreign&&paired?[...direct,paired]:direct;
 const rank=(a,b)=>(quick?b.displayRate-a.displayRate:b.miles-a.miles)||(r.foreign?fxCostOrder(a)-fxCostOrder(b):0)||priority.indexOf(a.id)-priority.indexOf(b.id);
 const candidates=options.filter(o=>o.eligible&&(r.foreign||o.fee===0)).sort(rank);
 const best=candidates[0]||null;
 const feeFree=options.filter(o=>o.eligible&&o.fee===0).sort(rank)[0]||null;
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
 if(r.foreign){
  warnings.unshift('Ranked by estimated miles before FX costs. This is not a net-value comparison. Exchange rates and fees can outweigh the extra miles.');
  if(paired)warnings.push('Amaze estimates assume the reported Citi Rewards Mastercard pairing qualifies for the online bonus. Merchant exclusions and Citi’s shared statement-month cap still apply.');
 }
 const amaze=r.foreign?paired:!quick&&paired&&(!best||paired.miles>best.miles+.01)?paired:null;
 return{...r,quick,best,options,warnings,amaze,feeFreeAlternative:r.foreign&&feeFree?.id!==best?.id?feeFree:null};
}
