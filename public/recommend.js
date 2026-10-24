import {evaluate,DEFAULT_SETTINGS} from './rules.js';
export const CARDS=[
 {id:'hsbc',name:'HSBC Revolution',short:'HSBC',color:'red',description:'Selected online and contactless categories · standard 10× tier'},
 {id:'citi',name:'Citi Rewards',short:'Citi',color:'blue',description:'Eligible online purchases and selected shopping categories'},
 {id:'uob',name:'KrisFlyer UOB',short:'UOB',color:'navy',description:'Dining, transport and selected categories with your annual qualification'},
 {id:'trust',name:'Trust Freedom',short:'Trust',color:'green',description:'Miles mode · uncapped base spending · no foreign transaction fee'}
];
export const WALLET_DEFAULTS={...DEFAULT_SETTINGS,cards:[],amaze:false,uobQualified:false};
const priority=['uob','citi','hsbc','trust'];
export function recommend(input,settings=WALLET_DEFAULTS,now=new Date().toISOString()){
 const owned=settings.cards??WALLET_DEFAULTS.cards;
 const quick=input.amount===undefined||input.amount===null||input.amount==='';
 const r=evaluate({...input,amount:quick?100:input.amount},settings,now);
 if(r.status!=='ok')return{...r,quick};
 const options=r.options.filter(o=>owned.includes(o.id)).map(o=>({...o,displayRate:o.cap===0?(o.id==='hsbc'?1/3:o.id==='citi'?.4:o.rate):o.rate}));
 const candidates=options.filter(o=>o.eligible&&o.fee===0).sort((a,b)=>(quick?b.displayRate-a.displayRate:b.miles-a.miles)||priority.indexOf(a.id)-priority.indexOf(b.id));
 let best=candidates[0]||null;
 let warnings=r.warnings.filter(w=>!(quick&&/exceeds your|amount earns no/.test(w)));
 if(!owned.includes('hsbc'))warnings=warnings.filter(w=>!(/HSBC/.test(w)&&!/Citi/.test(w)));
 if(!owned.includes('citi'))warnings=warnings.filter(w=>!(/Citi/.test(w)&&!/HSBC/.test(w)));
 if(!owned.includes('uob'))warnings=warnings.filter(w=>!/UOB|annual target/.test(w));
 const unknown=options.filter(o=>o.unknownCap&&o.eligible).map(o=>o.short);
 warnings=warnings.filter(w=>!/allowance not confirmed/.test(w));
 if(unknown.length)warnings.unshift(`${unknown.join(' and ')} bonus allowance is unconfirmed. This choice assumes allowance remains; update it in Wallet.`);
 if(quick&&best?.cap>0&&!best.unknownCap)warnings.unshift(`S$${best.cap} bonus allowance remains on this card. Add the amount if this purchase could use it up.`);
 const paid=owned.includes('citi')&&settings.amaze!==false?r.amaze:null;
 return{...r,quick,best,options,warnings,amaze:quick?null:paid};
}
