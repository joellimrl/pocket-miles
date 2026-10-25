import {validateMerchant,validateNotebook,merchantKey,normalize,MAX_MERCHANTS} from './merchants.js';

const text=(value,max)=>typeof value==='string'&&value.trim()&&value.length<=max;
const day=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;

// A history baseline contains suggestions, never verified MCCs or wallet settings.
export function validateBaseline(value){
 if(!value||value.format!=='pocket-miles-merchant-baseline'||value.version!==1||
  typeof value.profileId!=='string'||!/^[a-z][a-z0-9-]{0,31}$/.test(value.profileId)||!text(value.source,160)||!day(value.asOf)||
  !Array.isArray(value.candidates)||!value.candidates.length||value.candidates.length>MAX_MERCHANTS)throw new Error('Choose a valid Pocket Miles merchant baseline.');
 const ids=new Set(),keys=new Set();
 const candidates=value.candidates.map(row=>{
  if(!row||!Number.isSafeInteger(row.count)||row.count<1||row.count>1000000||!day(row.lastSeen)||row.lastSeen>value.asOf||typeof row.suggested!=='boolean'||
   !Array.isArray(row.aliases)||row.aliases.length>20||row.aliases.some(name=>!text(name,80)))throw new Error('Invalid merchant history details.');
  const merchant=validateMerchant({...row.merchant,confidence:'guess'}),key=merchantKey(merchant);
  if(ids.has(merchant.id)||keys.has(key))throw new Error('The baseline contains duplicate merchants.');
  ids.add(merchant.id);keys.add(key);
  return{merchant,count:row.count,lastSeen:row.lastSeen,suggested:row.suggested,aliases:[...row.aliases]};
 });
 return{format:value.format,version:1,profileId:value.profileId,source:value.source.trim(),asOf:value.asOf,candidates};
}

export function baselineRows(data,baseline){
 const ids=new Set(data.merchants.map(m=>m.id)),names=new Set(data.merchants.map(m=>normalize(m.name))),keys=new Set(data.merchants.map(merchantKey));
 return baseline.candidates.map(row=>({...row,exists:ids.has(row.merchant.id)||keys.has(merchantKey(row.merchant))||[row.merchant.name,...row.aliases].some(name=>names.has(normalize(name)))}));
}

export function mergeBaseline(data,value,selectedIds,profileId){
 const baseline=validateBaseline(value);
 if(profileId!==baseline.profileId)throw new Error('This baseline belongs to a different profile.');
 if(!Array.isArray(selectedIds)||new Set(selectedIds).size!==selectedIds.length||selectedIds.some(id=>!baseline.candidates.some(row=>row.merchant.id===id)))throw new Error('Invalid merchant selection.');
 const selected=new Set(selectedIds),merchants=[...data.merchants];let added=0,skipped=0;
 for(const row of baseline.candidates){
  if(!selected.has(row.merchant.id))continue;
  if(baselineRows({merchants},{candidates:[row]})[0].exists){skipped++;continue;}
  merchants.push({...row.merchant,confidence:'guess'});added++;
 }
 if(merchants.length>MAX_MERCHANTS)throw new Error(`Choose fewer places. You have ${MAX_MERCHANTS-data.merchants.length} saved slots available.`);
 return{data:validateNotebook({...data,merchants}),added,skipped};
}
