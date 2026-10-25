import {CATEGORIES} from './rules.js';
import {MAX_MERCHANTS} from './merchants.js';
import {validateBaseline,baselineRows,mergeBaseline} from './baseline.js';

export function setupBaselineImport({store,notify,onImported}){
 const $=id=>document.getElementById(id),dialog=$('baseline-dialog');
 const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let baseline=null,boundKey=null,readId=0;
 const selected=()=>[...dialog.querySelectorAll('[data-baseline-select]:checked')].map(el=>el.dataset.baselineSelect);
 function clear(){readId++;baseline=null;boundKey=null;$('baseline-file').value='';$('baseline-list').replaceChildren();$('baseline-source').textContent='';$('baseline-error').textContent='';$('baseline-summary').textContent='';if(dialog.open)dialog.close();}
 function refresh(){
  $('baseline-open').disabled=!store.ready||store.locked||store.busy;
  if(baseline&&(!store.ready||store.locked||store.key!==boundKey||store.profile?.id!==baseline.profileId)){clear();return;}
  if(!baseline)return;
  try{
   const result=mergeBaseline(store.data,baseline,selected(),store.profile.id);
   $('baseline-summary').textContent=`${store.profile.name}: ${result.added} new places · ${MAX_MERCHANTS-result.data.merchants.length} slots left${result.skipped?` · ${result.skipped} already saved`:''}`;
   $('baseline-save').disabled=!result.added||!store.online||store.busy;
   $('baseline-save').textContent=store.online?`Add ${result.added} places to ${store.profile.name}`:'Reconnect to save places';
  }catch(error){$('baseline-summary').textContent=error.message;$('baseline-save').disabled=true;}
 }
 function render(){
  $('baseline-source').textContent=`${baseline.source} · Prepared ${baseline.asOf} · Profile: ${store.profile.name}`;
  $('baseline-list').innerHTML=baselineRows(store.data,baseline).map(row=>{
   const m=row.merchant,disabled=row.exists?'disabled':'';
   return `<article class="baseline-row"><label class="check"><input type="checkbox" data-baseline-select="${esc(m.id)}" ${row.suggested&&!row.exists?'checked':''} ${disabled}><span><strong>${esc(m.name)}</strong>${m.variant?`<small>${esc(m.variant)}</small>`:''}<small>${row.count} history entries · Last seen ${row.lastSeen}${row.exists?' · Already saved, skipped':''}</small></span></label><details><summary>Review details</summary><p class="fine">${esc(m.notes)}</p><label>Category<select data-baseline-field="category" data-baseline-id="${esc(m.id)}" ${disabled}>${CATEGORIES.map(c=>`<option value="${c.id}" ${c.id===m.category?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><div class="form-grid"><label>Default method<select data-baseline-field="method" data-baseline-id="${esc(m.id)}" ${disabled}><option value="tap" ${m.method==='tap'?'selected':''}>Tap / phone</option><option value="online" ${m.method==='online'?'selected':''}>Online / app</option><option value="insert" ${m.method==='insert'?'selected':''}>Insert card</option></select></label><label>Charged in<select data-baseline-field="currency" data-baseline-id="${esc(m.id)}" ${disabled}><option value="sgd" ${m.currency==='sgd'?'selected':''}>SGD</option><option value="foreign" ${m.currency==='foreign'?'selected':''}>Foreign currency</option></select></label></div></details></article>`;
  }).join('');
  refresh();dialog.showModal();
 }
 $('baseline-open').addEventListener('click',()=>$('baseline-file').click());
 $('baseline-file').addEventListener('change',async()=>{
  const file=$('baseline-file').files[0];if(!file)return;
  clear();const request=readId,key=store.key,profileId=store.profile?.id;
  try{
   if(!store.ready||store.locked)throw new Error('Connect your wallet first.');
   if(file.size>700000)throw new Error('Baseline file is too large.');
   const content=await file.text();
   if(request!==readId||key!==store.key||profileId!==store.profile?.id)return;
   const incoming=validateBaseline(JSON.parse(content));
   if(incoming.profileId!==profileId)throw new Error(`This baseline is for the ${incoming.profileId} profile. Your connected profile is ${profileId}.`);
   baseline=incoming;boundKey=key;render();
  }catch(error){if(request===readId)notify(error.message);}
 });
 $('baseline-list').addEventListener('change',event=>{
  if(!baseline)return;
  const {baselineField,baselineId}=event.target.dataset;
  if(['category','method','currency'].includes(baselineField))baseline.candidates.find(row=>row.merchant.id===baselineId).merchant[baselineField]=event.target.value;
  $('baseline-error').textContent='';refresh();
 });
 $('baseline-none').addEventListener('click',()=>{for(const el of dialog.querySelectorAll('[data-baseline-select]'))el.checked=false;refresh();});
 $('baseline-suggested').addEventListener('click',()=>{for(const el of dialog.querySelectorAll('[data-baseline-select]'))el.checked=!el.disabled&&baseline?.candidates.find(row=>row.merchant.id===el.dataset.baselineSelect)?.suggested;refresh();});
 $('baseline-save').addEventListener('click',async()=>{
  if(!baseline||store.key!==boundKey)return;
  const incoming=baseline,ids=selected();let result;
  try{
   result=mergeBaseline(store.data,incoming,ids,store.profile?.id);if(!result.added)return;
   await store.save(data=>{result=mergeBaseline(data,incoming,ids,store.profile?.id);return result.data;});
   clear();onImported();notify(`${result.added} places added. Your wallet and existing places are unchanged.`);
  }catch(error){$('baseline-error').textContent=error.message;refresh();}
 });
 $('baseline-cancel').addEventListener('click',clear);dialog.addEventListener('cancel',clear);
 return{refresh,clear};
}
