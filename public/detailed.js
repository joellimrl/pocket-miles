import {CHECKED,SOURCES} from './rules.js';
import {DETAIL_CATEGORIES,ROUTES,detailedCategory} from './detailed-model.js';

const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>new Intl.NumberFormat('en-SG',{maximumFractionDigits:2}).format(n);
const score=(o,quick)=>quick?o.displayRate:o.miles;

function renderTable(sheet){
 const {category,quick,amount,currency,comparisons,rows}=sheet;
 const caption=quick?`Miles / S$ · ${currency==='sgd'?'SGD':'foreign currency'}`:`Estimated miles on S$${num(amount)}${currency==='foreign'?' equivalent':''}`;
 const body=rows.map(row=>`<tr data-card="${row.id}"><th scope="row"><span class="card-name card-${row.id}">${esc(row.name)}</span><span class="fee">${esc(row.feeLabel)}</span></th>${row.cells.map(({route,option:o,best})=>{
  const value=score(o,quick),top=best&&value>0;
  const status=value===null?'Not estimated':!o.eligible?(category.review?'Conservative':'Excluded'):o.cap===0?'Base rate':!quick&&o.bonus&&o.cap!==null&&o.cap!==undefined&&amount>o.cap?'Cap split':'';
  return `<td data-route="${route}" class="${top?'best':''}"><span class="value">${value===null?'—':num(value)}</span><span class="cell-status">${top?'★ Top miles':''}${top&&status?' · ':''}${status}</span></td>`;
 }).join('')}</tr>`).join('');
 return `<div class="table-wrap" tabindex="0" role="region" aria-label="${esc(category.name)} card comparison"><table class="primary-comparison${comparisons.length===5?' all-methods':''}"><caption>${esc(caption)} · fees extra</caption><thead><tr><th scope="col">Card</th>${comparisons.map(c=>`<th scope="col" data-route="${c.route}">${esc(c.short)}<small class="route-hint">${esc(c.hint)}</small></th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function renderCategory(sheet){
 const {category,comparisons,rows}=sheet;
 const tables=renderTable(sheet);
 const reasons=rows.map(row=>{
  const grouped=new Map();
  for(const {route,option} of row.cells){
   const reason=(option.cap===0&&option.bonus?'Bonus allowance exhausted; base miles shown. ':'')+option.reason;
   const routes=grouped.get(reason)||[];routes.push(ROUTES[route].label);grouped.set(reason,routes);
  }
  return `<section><h3 class="card-${row.id}">${esc(row.name)}</h3><ul>${[...grouped].map(([reason,routes])=>`<li><strong>${esc(routes.join(' / '))}:</strong> ${esc(reason)}</li>`).join('')}</ul>${row.rounding?`<p class="rounding">${esc(row.rounding)}</p>`:''}</section>`;
 }).join('');
 const amazeNote=rows.some(row=>row.id==='amaze')?' Amaze + Citi assumes the reported pairing qualifies even when Amaze is selected in the wallet; its fees still apply.':'';
 const onlineNote=comparisons.some(c=>c.route==='wallet')?`<p>Online Google / Apple Pay rates for HSBC and UOB assume a qualifying online indicator and merchant category.${amazeNote}</p>`:'';
 return `<article class="category-sheet" id="${category.id}"><div class="category-heading"><h2>${esc(category.name)}</h2><a href="#${category.id}" aria-label="Show only ${esc(category.name)}">↗</a></div><p class="category-meta">${esc(category.group)} · Category / MCC: ${esc(category.mcc)}</p>${tables}<p class="category-note">${esc(category.note)}</p><details class="route-details"><summary>Why each card earns this · conditions &amp; rounding</summary>${onlineNote}${reasons}</details></article>`;
}

export function mountDetailed(doc,location){
 const $=id=>doc.getElementById(id);
 const categorySelect=$('sheet-category');
 for(const c of DETAIL_CATEGORIES){const option=doc.createElement('option');option.value=c.id;option.textContent=c.name;categorySelect.append(option);}
 const url=new URL(location.href);
 if(url.searchParams.get('currency')==='foreign')$('sheet-currency').value='foreign';
 $('sheet-date').textContent=CHECKED;
 $('sheet-sources').innerHTML=SOURCES.map(([label,url])=>`<li><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a></li>`).join('');
 const render=()=>{
  try{
   const scenario={currency:$('sheet-currency').value,amount:$('sheet-amount').value,hsbcRemaining:$('sheet-hsbc').value,citiRemaining:$('sheet-citi').value,uobQualified:$('sheet-uob').checked};
   const categories=categorySelect.value==='all'?DETAIL_CATEGORIES:DETAIL_CATEGORIES.filter(c=>c.id===categorySelect.value);
   const sheets=categories.map(c=>detailedCategory(c.id,scenario));
   $('sheet-results').innerHTML=sheets.map(renderCategory).join('');
   $('sheet-results').hidden=false;$('sheet-error').hidden=true;$('sheet-error').textContent='';
   const hasAmaze=sheets.some(sheet=>sheet.rows.some(row=>row.id==='amaze'));
   $('sheet-status').textContent=`${sheets.length} spending ${sheets.length===1?'type':'types'} · all 4 cards${hasAmaze?' + Amaze for foreign currency':''} · ${scenario.amount===''?'headline rates before rounding':'amount includes modelled rounding and caps'}`;
   $('sheet-assumptions').textContent=`Assumed bonus allowance: HSBC S$${num(Number(scenario.hsbcRemaining))}; Citi${hasAmaze?' + Amaze':''} S$${num(Number(scenario.citiRemaining))}. UOB annual condition ${scenario.uobQualified?'met':'not met'}. Trust Miles mode. ${scenario.currency==='foreign'?'SimplyGo stays in SGD.':''}`;
  }catch(error){
   $('sheet-error').textContent=error.message;$('sheet-error').hidden=false;$('sheet-results').hidden=true;$('sheet-status').textContent='';$('sheet-assumptions').textContent='';
  }
 };
 const selectHash=()=>{
  const id=location.hash.slice(1);
  categorySelect.value=DETAIL_CATEGORIES.some(c=>c.id===id)?id:'all';
  render();
 };
 const updateLink=()=>{
  const next=new URL(location.href);
  if($('sheet-currency').value==='foreign')next.searchParams.set('currency','foreign');else next.searchParams.delete('currency');
  next.hash=categorySelect.value;
  doc.defaultView.history.replaceState(null,'',next.pathname+next.search+next.hash);
  render();
 };
 categorySelect.addEventListener('change',updateLink);
 $('sheet-currency').addEventListener('change',updateLink);
 $('sheet-uob').addEventListener('change',render);
 for(const id of ['sheet-amount','sheet-hsbc','sheet-citi'])$(id).addEventListener('input',render);
 doc.defaultView.addEventListener('hashchange',selectHash);
 selectHash();
}

mountDetailed(document,window.location);
