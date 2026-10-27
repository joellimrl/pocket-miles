import {CATEGORIES,CHECKED,SOURCES,parseQuery} from './rules.js';
import {CARDS,WALLET_DEFAULTS} from './recommend.js';
import {PAYMENT_NAMES as methodName,comparePayments} from './payments.js';
import {displayName,matchMerchants,queryName,normalize,validateMerchant,validateNotebook,MAX_MERCHANTS} from './merchants.js';
import {Store} from './store.js';
import {setupBaselineImport} from './baseline-ui.js';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>new Intl.NumberFormat('en-SG',{maximumFractionDigits:2}).format(n);
const categoryName=id=>CATEGORIES.find(c=>c.id===id)?.name||id;
let active=null,currencyOverride=null,editor=null,walletDirty=false,dirtyCaps={hsbc:false,citi:false},toastTimer,installPrompt,lastProfile=null,baselineImport;
const store=new Store(()=>{
 const profileId=store.profile?.id||null;
 if(lastProfile!==profileId){
  baselineImport?.clear();
  active=null;currencyOverride=null;editor=null;walletDirty=false;
  $('merchant-search').value='';$('pay-amount').value='';$('places-search').value='';$('matches').hidden=true;$('search-tip').hidden=true;
  for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
  lastProfile=profileId;
 }
 $('connection-text').textContent=store.message;
 $('connection-dot').classList.toggle('offline',!store.online);
 $('refresh').disabled=store.busy;
 $('login').hidden=!store.locked;
 $('workspace').hidden=!store.ready||store.locked;
 $('navigation').hidden=!store.ready||store.locked;
 $('wallet-save').disabled=!store.online||store.busy;
 updateMerchantAction();
 baselineImport?.refresh();
 $('logout').hidden=store.preview;
 $('profile-status').textContent=store.profile?`Profile: ${store.profile.name}`:'';
 $('device-status').textContent=store.preview?'Local preview · no device pairing':store.deviceName?`${store.deviceName} · no automatic expiry. The app owner manages connections in Telegram.`:'';
 if(active?.id)active=store.data.merchants.find(m=>m.id===active.id)||null;
 if(!walletDirty)fillWallet();
 renderLists();renderResult();
});
baselineImport=setupBaselineImport({store,notify,onImported:()=>view('places')});
function notify(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5000);}
function view(name){for(const el of document.querySelectorAll('.view'))el.hidden=el.id!==name;for(const b of document.querySelectorAll('[data-view]')){b.classList.toggle('active',b.dataset.view===name);b.setAttribute('aria-current',b.dataset.view===name?'page':'false');}if(name==='wallet'&&!walletDirty)fillWallet();window.scrollTo({top:0,behavior:'instant'});}
function settings(){return store.data.settings||WALLET_DEFAULTS;}
function current(){
 const text=$('merchant-search').value,p=parseQuery(text);
 const m=active||(p.category?{name:queryName(text),variant:'',category:p.category,method:p.method||CATEGORIES.find(c=>c.id===p.category).method,currency:'sgd',uobExcluded:p.uobExcluded,onlineWallet:false,confidence:'guess',notes:''}:null);
 return m?{...m,currency:currencyOverride??m.currency}:null;
}
function select(m){active=m;currencyOverride=null;$('merchant-search').value=displayName(m);$('clear-search').hidden=false;$('matches').hidden=true;$('search-tip').hidden=true;$('search-tip').textContent=m.id?'Loaded your saved details. Compare the ways to pay below.':'One-off check. This merchant has not been saved.';renderResult();}
function search(){
 currencyOverride=null;
 const text=$('merchant-search').value,found=matchMerchants(store.data.merchants,text),parsed=parseQuery(text);
 const literal=found.exact&&[found.exact.name,displayName(found.exact)].some(n=>normalize(n)===normalize(text));
 if(parsed.amount!==null&&!literal)$('pay-amount').value=parsed.amount;
 active=found.exact;
 $('clear-search').hidden=!text;
 $('matches').hidden=!!found.exact||!found.matches.length;
 $('matches').innerHTML=found.matches.slice(0,8).map(m=>`<button data-select="${esc(m.id)}"><strong>${esc(displayName(m))}</strong><span>${methodName[m.method]} · ${m.currency==='sgd'?'SGD':'Foreign currency'} · ${esc(categoryName(m.category))}</span></button>`).join('');
 $('search-tip').textContent=found.exact?'Loaded your saved details.':found.matches.length?'Choose a saved place.':'';
 $('search-tip').hidden=!(found.matches.length&&!found.exact);
 // Ambiguous saved routes require selection, rather than quietly using a name shortcut.
 renderResult();
}
function renderResult(){
 const searching=!!$('merchant-search').value.trim();
 $('recents').hidden=searching;$('quick-categories').hidden=searching;
 const matches=matchMerchants(store.data.merchants,$('merchant-search').value);
 if(!active&&matches.matches.length&&!matches.exact){$('checkout-controls').hidden=true;$('amount-options').hidden=true;$('currency-options').hidden=true;$('result').innerHTML='';return;}
 const m=current(),query=$('merchant-search').value.trim(),owned=settings().cards||[];
 $('amount-options').hidden=!m;
 $('currency-options').hidden=!m;
 $('checkout-controls').hidden=!m||!owned.length;
 $('amount-label').textContent=m?.currency==='foreign'?'Amount (S$ equivalent)':'Amount (S$)';
 $('pay-currency').value=m?.currency||'sgd';
 $('currency-note').textContent=currencyOverride&&m?.id?'Currency changed for this check. Edit the place if you want to save it.':'Choose the currency charged at checkout. Enter foreign amounts as their estimated SGD equivalent.';
 if(!store.ready){$('result').innerHTML='';return;}
 if(!owned.length){$('result').innerHTML='<div class="empty-card"><span aria-hidden="true">▱</span><h2>Start with your wallet.</h2><p>Select the cards you own once. Every merchant search will compare just those cards.</p><button class="primary" data-wallet>Choose my cards <span>↗</span></button></div>';return;}
 if(!m){$('result').innerHTML=query?`<div class="empty-card compact"><h2>New place</h2><p>Choose a category for ${esc(queryName(query)||query)}.</p><button class="primary" data-add>Set payment details <span>↗</span></button></div>`:'';return;}
 const comparisons=comparePayments(m,$('pay-amount').value,settings()),r=comparisons[0].result;
 const context=`<div class="merchant-line"><div><h2>${esc(displayName(m))}</h2><small>${esc(categoryName(m.category))}${m.confidence!=='confirmed'?' · Unconfirmed':''}</small></div><div class="merchant-actions"><button class="quiet" data-edit-current>Edit</button>${m.id?'':'<button class="quiet" data-save-current>Save ＋</button>'}</div></div>`;
 if(r.status==='amount'){$('result').innerHTML=context+`<p class="warning">${esc(r.message)}</p>`;return;}
 const warningMethods=new Map();
 for(const {label,result} of comparisons)for(const warning of result.warnings){
  if(!warningMethods.has(warning))warningMethods.set(warning,[]);
  warningMethods.get(warning).push(label);
 }
 const warnings=[...warningMethods].map(([warning,methods])=>`<p class="warning">${methods.length<comparisons.length?`<strong>${methods.join(' / ')}:</strong> `:''}${esc(warning)}</p>`).join('');
 const pairing=r.foreign&&owned.includes('citi')&&!settings().amaze?'<p class="fine">Amaze + Citi Rewards is not enabled. <button class="quiet" data-wallet>Wallet ↗</button></p>':'';
 const excluded=r.status==='excluded'?'<p class="comparison-alert">No miles for this category.</p>':'';
 const assumptions=m.confidence!=='confirmed'?'Category is unconfirmed. Check the merchant’s bank classification.':'Your saved category applies to every column; a different checkout may have a different bank classification.';
 const preferred=comparisons.filter(c=>c.primary),other=comparisons.filter(c=>!c.primary);
 const moreOpen=$('result').querySelector('.other-methods')?.open;
 const tables=renderComparison(preferred.length?preferred:other,true)+(preferred.length&&other.length?`<details class="other-methods"${moreOpen?' open':''}><summary>Other payment methods</summary>${renderComparison(other)}</details>`:'');
 $('result').innerHTML=context+excluded+tables+`<details class="comparison-details"><summary>Fees & details</summary><p class="fine">${m.id?'Saved place':'One-off · not saved'}. ${assumptions} Checkout methods are suggestions, not live acceptance data.</p><p class="fine">Phone tapping and direct online payments appear first. Physical card tap, insert and online Google / Apple Pay are under Other payment methods where applicable. Phone and physical-card taps use the same contactless rules. Each table orders cards by their highest miles across its methods. Fees are extra; they only break ties. ${r.quick?'Remaining bonus allowance is assumed to cover your purchase. Add the amount if it could use that allowance up.':'Total miles include modelled caps and rounding.'}</p>${pairing}${r.message?`<p class="warning">${esc(r.message)}</p>`:''}${m.notes?`<p class="personal-note">${esc(m.notes)}</p>`:''}${warnings}${comparisons.map(c=>renderPaymentDetails(c)).join('')}</details>`;
}
function renderComparison(comparisons,primary=false){
 const r=comparisons[0].result,score=o=>r.quick?o.displayRate:o.miles;
 const rows=r.options.map(o=>({card:o,options:comparisons.map(c=>c.result.options.find(p=>p.id===o.id))}));
 rows.sort((a,b)=>Math.max(...b.options.map(o=>score(o)??-1))-Math.max(...a.options.map(o=>score(o)??-1)));
 const body=rows.map(({card,options})=>{
  const fee=card.id==='amaze'?'≤2.1% FX':r.foreign?(card.id==='trust'?'No FX fee':'Bank FX fee'):'';
  const name=card.id==='amaze'?'Amaze + Citi':card.name;
  return `<tr data-card-id="${card.id}"><th scope="row"><span class="matrix-card-name"><i class="card-mark ${card.color}" aria-hidden="true"></i>${esc(name)}</span>${fee?`<small class="matrix-fee">${fee}</small>`:''}</th>${options.map((o,i)=>{
   const value=score(o),best=comparisons[i].result.best?.id===o.id&&value>0;
   const status=value===null?'Not estimated':!o.eligible?(o.id==='trust'&&r.status!=='excluded'?'Mode off':'Excluded'):o.cap===0?'Base':o.unknownCap?'Cap?':'';
   return `<td data-method="${comparisons[i].route}" class="${best?'best-cell':''}"><strong class="matrix-miles">${value===null?'—':num(value)}</strong>${best||status?`<small class="matrix-status">${best?'★ Best':''}${best&&status?' · ':''}${status}</small>`:''}</td>`;
  }).join('')}</tr>`;
 }).join('');
 return `<div class="matrix-wrap"><table class="card-matrix${primary?' primary-comparison':''}"><caption>${r.quick?'Miles / S$':'Estimated miles'} · fees extra</caption><thead><tr><th scope="col">Your cards</th>${comparisons.map(c=>`<th scope="col" data-payment-method="${c.route}">${esc(c.short)}<small class="route-hint">${esc(c.hint)}</small></th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
}
function renderPaymentDetails({route,method,onlineWallet,label,result:r}){
 const pairedRoute={tap:'Select Amaze in Google / Apple Pay and tap, with Citi Rewards Mastercard linked in Amaze.',card:'Tap your physical Amaze card, linked to Citi Rewards Mastercard.',insert:'Insert your Amaze card, linked to Citi Rewards Mastercard.',online:'Use your Amaze card details online, linked to Citi Rewards Mastercard.',wallet:'Select Amaze in Google / Apple Pay at online checkout, with Citi Rewards Mastercard linked in Amaze.'};
 const checkout=method==='online'?(onlineWallet?'Google / Apple Pay button at online checkout.':'Card details entered or saved directly in the website or app.'):'';
 const cards=r.options.map(o=>{
  const spread=o.id==='amaze'&&o.eligible&&r.foreign&&!r.quick?`<p class="checkout-note">Spread illustration at 2.1%: S$${(r.amount*.021).toFixed(2)}. Actual FX cost depends on the conversion rate.</p>`:'';
  return `<li><strong>${esc(o.name)}</strong><p>${esc(o.feeLabel)}. ${esc(o.reason)} ${esc(o.rounding)}</p>${o.id==='amaze'&&o.eligible?`<p>${pairedRoute[route]} Shares Citi’s bonus allowance.</p>`:''}${spread}</li>`;
 }).join('');
 return `<section class="method-details"><h3>${esc(label)}</h3>${checkout?`<p>${esc(checkout)}</p>`:''}<ul>${cards}</ul></section>`;
}
function renderLists(){
 const all=[...store.data.merchants].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),q=normalize($('places-search').value);
 $('merchant-count').textContent=`${all.length} of ${MAX_MERCHANTS} saved places. One-off checks don’t use a slot.`;
 $('recent-list').innerHTML=all.slice(0,6).map(m=>`<button class="recent" data-select="${esc(m.id)}"><span class="place-icon" aria-hidden="true">↗</span><div><strong>${esc(displayName(m))}</strong><small>${methodName[m.method]} · ${esc(categoryName(m.category))}</small></div><span aria-hidden="true">→</span></button>`).join('')||'<p class="fine empty-list">Your saved places will appear here.</p>';
 const filtered=all.filter(m=>!q||normalize(displayName(m)).includes(q));
 $('places-list').innerHTML=filtered.map(m=>`<article class="place"><button class="place-body" data-select="${esc(m.id)}"><span class="eyebrow">${m.confidence==='confirmed'?'CHECKED BY YOU':'CATEGORY TO CONFIRM'}</span><strong>${esc(displayName(m))}</strong><small>${esc(categoryName(m.category))} · ${methodName[m.method]}</small></button><div class="place-actions"><button data-edit="${esc(m.id)}">Edit</button><button data-delete="${esc(m.id)}">Delete</button></div></article>`).join('')||'<p class="fine empty-list">No saved places here yet. Add a merchant from Pay.</p>';
}
function fillWallet(){
 const s=settings();
 $('card-list').innerHTML=CARDS.map(c=>`<label class="wallet-card"><input type="checkbox" name="card" value="${c.id}" ${s.cards?.includes(c.id)?'checked':''}><span class="card-mark ${c.color}"></span><span><strong>${esc(c.name)}</strong><small>${esc(c.description)}</small></span></label>`).join('');
 $('wallet-amaze').checked=!!s.amaze;$('hsbc-cap').value=s.hsbcRemaining??'';$('citi-cap').value=s.citiRemaining??'';$('citi-reset').value=s.citiResetDate||'';$('uob-qualified').checked=!!s.uobQualified;$('trust-miles').checked=!!s.trustMiles;dirtyCaps={hsbc:false,citi:false};
}
function categoryHelp(){$('category-help').textContent=CATEGORIES.find(c=>c.id===$('category').value)?.note||'Choose the merchant’s payment classification, rather than the item you bought.';}
function updateMerchantAction(){
 const full=!editor?.existing&&store.data.merchants.length>=MAX_MERCHANTS;
 $('remember-merchant').disabled=full;
 if(full)$('remember-merchant').checked=false;
 const save=$('remember-merchant').checked;
 $('merchant-save').textContent=save?(editor?.existing?'Save changes & show card':'Save & show card'):'Show best card';
 $('merchant-save').disabled=!store.ready||store.locked||(save&&(!store.online||store.busy));
 $('remember-help').textContent=full?`All ${MAX_MERCHANTS} saved slots are in use. You can still check this purchase without saving, or delete a place to free a slot.`:save?(!store.online?'Reconnect to save. Uncheck this option to check without saving.':editor?.existing?'Updates this saved place on your devices.':'Saves these details for next time on your devices.'):'Check only: these details stay on this screen and aren’t added to your saved places.';
}
function openEditor(m=null,{save=!!m?.id}={}){
 editor={id:m?.id||crypto.randomUUID(),createdAt:m?.createdAt||new Date().toISOString(),existing:!!m?.id};
 const value=m||{name:queryName($('merchant-search').value),category:'',method:'tap',currency:'sgd'};
 $('merchant-title').textContent=editor.existing?'Edit this place.':'Check this purchase.';
 for(const key of ['name','variant','category','method','currency','notes'])$(key).value=value[key]||'';
 $('confidence').value=value.confidence||'guess';$('uob-excluded').checked=!!value.uobExcluded;$('online-wallet').checked=!!value.onlineWallet;
 $('remember-merchant').checked=save;
 $('merchant-copy').hidden=!editor.existing;$('merchant-error').textContent='';categoryHelp();updateMerchantAction();$('merchant-dialog').showModal();
}
$('rules-date').textContent=CHECKED;
$('category').innerHTML='<option value="">Choose a category…</option>'+CATEGORIES.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
$('source-list').innerHTML=SOURCES.map(([label,url])=>`<li><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a></li>`).join('');
$('merchant-search').addEventListener('input',search);
$('merchant-search').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();search();}});
$('clear-search').addEventListener('click',()=>{active=null;$('merchant-search').value='';$('pay-amount').value='';search();$('merchant-search').focus();});
$('pay-amount').addEventListener('input',renderResult);
$('pay-currency').addEventListener('change',()=>{currencyOverride=$('pay-currency').value;renderResult();});
$('places-search').addEventListener('input',renderLists);
$('new-merchant').addEventListener('click',()=>openEditor(null,{save:true}));$('places-add').addEventListener('click',()=>openEditor(null,{save:true}));
$('result').addEventListener('click',e=>{if(e.target.closest('[data-wallet]'))view('wallet');if(e.target.closest('[data-add]'))openEditor();if(e.target.closest('[data-edit-current]'))openEditor(current());if(e.target.closest('[data-save-current]'))openEditor(current(),{save:true});});
document.body.addEventListener('click',async e=>{
 const b=e.target.closest('[data-select],[data-edit],[data-delete],[data-view],[data-seed]');if(!b)return;
 if(b.dataset.view){view(b.dataset.view);return;}
 if(b.dataset.seed){const cat=CATEGORIES.find(c=>c.id===b.dataset.seed);openEditor({name:cat.id==='mrt'?'SimplyGo':'',category:cat.id,method:cat.method,currency:'sgd'});return;}
 const m=store.data.merchants.find(row=>row.id===(b.dataset.select||b.dataset.edit||b.dataset.delete));if(!m)return;
 if(b.dataset.select){$('pay-amount').value='';select(m);view('pay');}
 if(b.dataset.edit)openEditor(m);
 if(b.dataset.delete&&confirm(`Delete ${displayName(m)} from your synced merchant book?`)){try{await store.save(data=>({...data,merchants:data.merchants.filter(row=>row.id!==m.id)}));if(active?.id===m.id){active=null;$('merchant-search').value='';renderResult();}notify('Merchant deleted.');}catch(err){notify(err.message);}}
});
$('category').addEventListener('change',categoryHelp);
$('remember-merchant').addEventListener('change',()=>{$('merchant-error').textContent='';updateMerchantAction();});
$('merchant-copy').addEventListener('click',()=>{editor={id:crypto.randomUUID(),createdAt:new Date().toISOString(),existing:false};$('variant').value='';$('merchant-copy').hidden=true;$('merchant-title').textContent='Check another route.';$('remember-merchant').checked=true;updateMerchantAction();$('variant').focus();});
$('merchant-form').addEventListener('submit',async e=>{
 e.preventDefault();const m={id:editor.id,createdAt:editor.createdAt,updatedAt:new Date().toISOString()};
 for(const key of ['name','variant','category','method','currency','notes','confidence'])m[key]=$(key).value;
 m.uobExcluded=$('uob-excluded').checked;m.onlineWallet=$('online-wallet').checked;
 try{
  const checked=validateMerchant(m),save=$('remember-merchant').checked;
  if(!store.ready||store.locked)throw new Error('Load your wallet before checking a purchase.');
  if(save){
   await store.save(data=>({...data,merchants:[...data.merchants.filter(row=>row.id!==checked.id),checked]}));
   select(store.data.merchants.find(row=>row.id===checked.id));
  }else{
   // Keep one-off details in memory only. No notebook write or saved-record identity.
   const {id,createdAt,updatedAt,...purchase}=checked;
   select(purchase);
  }
  $('merchant-dialog').close();view('pay');notify(save?'Merchant saved. Next time, just type its name.':'Card checked. Merchant not saved.');
 }catch(err){$('merchant-error').textContent=err.message;}
});
$('wallet-form').addEventListener('input',e=>{walletDirty=true;if(e.target.id==='hsbc-cap')dirtyCaps.hsbc=true;if(e.target.id==='citi-cap')dirtyCaps.citi=true;});
$('wallet-form').addEventListener('submit',async e=>{
 e.preventDefault();const now=new Date().toISOString(),old=settings();
 const next={...old,cards:[...document.querySelectorAll('input[name=card]:checked')].map(el=>el.value),amaze:$('wallet-amaze').checked,hsbcRemaining:$('hsbc-cap').value===''?null:Number($('hsbc-cap').value),citiRemaining:$('citi-cap').value===''?null:Number($('citi-cap').value),hsbcUpdated:dirtyCaps.hsbc?now:old.hsbcUpdated,citiUpdated:dirtyCaps.citi?now:old.citiUpdated,citiResetDate:$('citi-reset').value,uobQualified:$('uob-qualified').checked,trustMiles:$('trust-miles').checked,savedAt:now};
 try{await store.save(data=>({...data,settings:next}));walletDirty=false;fillWallet();$('wallet-error').textContent='';view('pay');notify('Wallet saved. Search a merchant to get your card.');}catch(err){$('wallet-error').textContent=err.message;}
});
$('login-form').addEventListener('submit',async e=>{e.preventDefault();$('login-error').textContent='Connecting…';try{await store.unlock($('password').value,$('device-name').value);$('password').value='';$('login-error').textContent='';}catch(err){$('login-error').textContent=err.message;}});
$('logout').addEventListener('click',async()=>{try{await store.lock();active=null;walletDirty=false;}catch(err){notify(err.message);}});
$('refresh').addEventListener('click',async()=>{if(walletDirty||document.querySelector('dialog[open]')){if(!confirm('Discard your unsaved form changes and load the latest saved details?'))return;walletDirty=false;for(const d of document.querySelectorAll('dialog[open]'))d.close();}await store.load();search();});
let lastFocus=0;window.addEventListener('focus',()=>{if(Date.now()-lastFocus>30000&&!document.querySelector('dialog[open]')&&!walletDirty){lastFocus=Date.now();store.load();}});
window.addEventListener('online',()=>{if(!walletDirty&&!document.querySelector('dialog[open]'))store.load();});
window.addEventListener('storage',event=>{if(event.key==='pocket-miles-device-key'||event.key===null)store.connectionChanged();});
$('export').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(store.data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='pocket-miles-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
$('import').addEventListener('click',()=>$('import-file').click());
$('import-file').addEventListener('change',async()=>{const file=$('import-file').files[0];if(!file)return;try{if(file.size>700000)throw new Error('Backup is too large.');const incoming=validateNotebook(JSON.parse(await file.text()));if(!confirm(`Replace your current wallet and merchant book with this backup (${incoming.merchants.length} places)? Export a backup first if you want to retain the current version.`))return;await store.save(()=>incoming);active=null;walletDirty=false;fillWallet();notify('Backup restored.');}catch(err){notify(err.message);}finally{$('import-file').value='';}});
for(const b of document.querySelectorAll('[data-close]'))b.addEventListener('click',()=>$(b.dataset.close).close());
$('sources-open').addEventListener('click',()=>$('sources-dialog').showModal());
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
$('install').addEventListener('click',async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;}else $('install-dialog').showModal();});
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
await store.load();
