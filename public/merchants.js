import {CATEGORIES,DEFAULT_SETTINGS} from './rules.js';
import {WALLET_DEFAULTS,CARDS} from './recommend.js';
export const MAX_MERCHANTS=500;
export const normalize=value=>String(value).normalize('NFKC').toLocaleLowerCase('en-SG').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export const displayName=m=>m.name+(m.variant?' · '+m.variant:'');
export const merchantKey=m=>[normalize(m.name),normalize(m.variant),m.method,m.currency].join('|');
export function queryName(text){return text.replace(/(?:S?\$\s*|SGD\s*)\d[\d,]*(?:\.\d{1,2})?\b/ig,'').replace(/\s+\d[\d,]*(?:\.\d{1,2})?\s*(?:dollars|sgd)?\s*$/i,'').trim();}
export function matchMerchants(records,text){
 const raw=normalize(text),q=normalize(queryName(text));
 if(!raw)return{exact:null,matches:[]};
 let exact=records.filter(m=>normalize(displayName(m))===raw||normalize(m.name)===raw);
 if(!exact.length&&q)exact=records.filter(m=>normalize(displayName(m))===q||normalize(m.name)===q);
 const terms=(q||raw).split(' ');
 const matches=exact.length?exact:records.filter(m=>terms.every(t=>normalize(displayName(m)).includes(t)));
 return{exact:exact.length===1?exact[0]:null,matches:matches.sort((a,b)=>displayName(a).localeCompare(displayName(b)))};
}
function string(value,max,label,required=false){if(typeof value!=='string'||value.length>max||required&&!value.trim())throw new Error('Check '+label+'.');return value.trim();}
function choice(value,values,label){if(!values.includes(value))throw new Error('Check '+label+'.');return value;}
function date(value,label){if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw new Error('Check '+label+'.');return new Date(value).toISOString();}
function bool(value){if(typeof value!=='boolean')throw new Error('Check the payment options.');return value;}
export function validateMerchant(m){
 if(!m||typeof m!=='object'||typeof m.id!=='string'||!/^[-\w]{8,80}$/.test(m.id))throw new Error('Invalid merchant record.');
 return{id:m.id,name:string(m.name,80,'merchant name',true),variant:string(m.variant,60,'branch or label'),category:choice(m.category,CATEGORIES.map(c=>c.id),'category'),method:choice(m.method,['tap','online','insert'],'payment method'),currency:choice(m.currency,['sgd','foreign'],'currency'),uobExcluded:bool(m.uobExcluded),onlineWallet:bool(m.onlineWallet),confidence:choice(m.confidence,['guess','confirmed'],'confirmation status'),notes:string(m.notes,600,'notes'),createdAt:date(m.createdAt,'created date'),updatedAt:date(m.updatedAt,'updated date')};
}
export function validateSettings(s){
 if(s===null)return null;if(!s||typeof s!=='object')throw new Error('Invalid card settings.');
 const out={...WALLET_DEFAULTS};
 const cards=s.cards??WALLET_DEFAULTS.cards;
 if(!Array.isArray(cards)||cards.length>CARDS.length||new Set(cards).size!==cards.length||cards.some(id=>!CARDS.some(c=>c.id===id)))throw new Error('Choose cards from the supported wallet list.');
 out.cards=[...cards];out.amaze=s.amaze===undefined?true:bool(s.amaze);
 for(const k of ['hsbcRemaining','citiRemaining']){if(s[k]!==null&&(!Number.isFinite(s[k])||s[k]<0||s[k]>1000))throw new Error('Bonus allowance must be between 0 and 1,000.');out[k]=s[k];}
 for(const k of ['uobQualified','trustMiles'])out[k]=bool(s[k]);
 for(const k of ['hsbcUpdated','citiUpdated','savedAt'])out[k]=s[k]===null?null:date(s[k],k);
 out.citiResetDate=string(s.citiResetDate,10,'Citi reset date');if(out.citiResetDate&&!/^\d{4}-\d{2}-\d{2}$/.test(out.citiResetDate))throw new Error('Check the reset date.');
 out.uobYearEnd=string(s.uobYearEnd,40,'membership-year end');return out;
}
export function validateNotebook(data){
 if(!data||data.version!==1||!Array.isArray(data.merchants)||data.merchants.length>MAX_MERCHANTS)throw new Error('Use a Pocket Miles backup with up to 500 merchants.');
 const merchants=data.merchants.map(validateMerchant),ids=new Set(),keys=new Set();
 for(const m of merchants){if(ids.has(m.id)||keys.has(merchantKey(m)))throw new Error('A merchant with this name, label and payment method already exists. Edit it or give this entry a different label.');ids.add(m.id);keys.add(merchantKey(m));}
 return{version:1,merchants,settings:validateSettings(data.settings)};
}
export function merchantInput(m,amount){return{category:m.category,method:m.method,currency:m.currency,uobExcluded:m.uobExcluded,onlineWallet:m.onlineWallet,amount};}
export function samePayment(m,input){return['category','method','currency','uobExcluded','onlineWallet'].every(k=>m[k]===input[k]);}
