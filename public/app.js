import {CATEGORIES,CHECKED,SOURCES,parseQuery} from './rules.js';
import {CARDS,WALLET_DEFAULTS,recommend} from './recommend.js';
import {displayName,matchMerchants,queryName,normalize,validateNotebook} from './merchants.js';
import {Store} from './store.js';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>new Intl.NumberFormat('en-SG',{maximumFractionDigits:2}).format(n);
const methodName={tap:'Tap / phone',online:'Online / app',insert:'Insert card'};
const categoryName=id=>CATEGORIES.find(c=>c.id===id)?.name||id;
let active=null,editor=null,walletDirty=false,dirtyCaps={hsbc:false,citi:false},toastTimer,installPrompt;
const store=new Store(()=>{
 $('connection-text').textContent=store.message;
 $('connection-dot').classList.toggle('offline',!store.online);
 $('refresh').disabled=store.busy;
 $('login').hidden=!store.locked;
 $('workspace').hidden=!store.ready||store.locked;
 $('navigation').hidden=!store.ready||store.locked;
 $('wallet-save').disabled=$('merchant-save').disabled=!store.online||store.busy;
 $('logout').hidden=store.preview;
 if(active?.id)active=store.data.merchants.find(m=>m.id===active.id)||null;
 if(!walletDirty)fillWallet();
 renderLists();renderResult();
});
function notify(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5000);}
function view(name){for(const el of document.querySelectorAll('.view'))el.hidden=el.id!==name;for(const b of document.querySelectorAll('[data-view]')){b.classList.toggle('active',b.dataset.view===name);b.setAttribute('aria-current',b.dataset.view===name?'page':'false');}if(name==='wallet'&&!walletDirty)fillWallet();window.scrollTo({top:0,behavior:'instant'});}
function settings(){return store.data.settings||WALLET_DEFAULTS;}
function current(){
 if(active)return active;
 const text=$('merchant-search').value,p=parseQuery(text);
 return p.category?{name:queryName(text),variant:'',category:p.category,method:p.method||CATEGORIES.find(c=>c.id===p.category).method,currency:'sgd',uobExcluded:p.uobExcluded,onlineWallet:false,confidence:'guess',notes:''}:null;
}
function select(m){active=m;$('merchant-search').value=displayName(m);$('clear-search').hidden=false;$('matches').hidden=true;$('search-tip').textContent='Loaded your saved details. Your default card is ready below.';renderResult();}
function search(){
 const text=$('merchant-search').value,found=matchMerchants(store.data.merchants,text),parsed=parseQuery(text);
 const literal=found.exact&&[found.exact.name,displayName(found.exact)].some(n=>normalize(n)===normalize(text));
 if(parsed.amount!==null&&!literal)$('pay-amount').value=parsed.amount;
 active=found.exact;
 $('clear-search').hidden=!text;
 $('matches').hidden=!!found.exact||!found.matches.length;
 $('matches').innerHTML=found.matches.slice(0,8).map(m=>`<button data-select="${esc(m.id)}"><strong>${esc(displayName(m))}</strong><span>${methodName[m.method]} · ${m.currency==='sgd'?'SGD':'Foreign currency'} · ${esc(categoryName(m.category))}</span></button>`).join('');
 $('search-tip').textContent=found.exact?'Loaded your saved details. No amount needed for a quick choice.':found.matches.length?'Choose the branch or payment route you saved.':text?'New merchant: confirm its payment details once, then save.':'For a saved merchant, its name is all you need.';
 // Ambiguous saved routes require selection, rather than quietly using a name shortcut.
 if(found.matches.length&&!found.exact){$('amount-options').hidden=true;$('result').innerHTML='';return;}
 renderResult();
}
function renderResult(){
 const matches=matchMerchants(store.data.merchants,$('merchant-search').value);
 if(!active&&matches.matches.length&&!matches.exact){$('amount-options').hidden=true;$('result').innerHTML='';return;}
 const m=current(),query=$('merchant-search').value.trim(),owned=settings().cards||[];
 $('amount-options').hidden=!m;
 if(!store.ready){$('result').innerHTML='';return;}
 if(!owned.length){$('result').innerHTML='<div class="empty-card"><span aria-hidden="true">▱</span><h2>Start with your wallet.</h2><p>Select the cards you own once. Every merchant search will compare just those cards.</p><button class="primary" data-wallet>Choose my cards <span>↗</span></button></div>';return;}
 if(!m){$('result').innerHTML=query?`<div class="empty-card compact"><h2>Let’s remember this one.</h2><p>Add ${esc(queryName(query)||query)} and choose its payment category. You only need to do this once.</p><button class="primary" data-add>Add merchant details <span>＋</span></button></div>`:'';return;}
 const r=recommend({...m,amount:$('pay-amount').value},settings());
 const context=`<div class="merchant-line"><div><strong>${esc(displayName(m))}</strong><small>${esc(categoryName(m.category))} · ${methodName[m.method]} · ${m.currency==='sgd'?'SGD':'Foreign currency'}</small></div><button class="quiet" data-edit-current>${m.id?'Edit':'Save details'}</button></div>`;
 if(r.status==='amount'){$('result').innerHTML=context+`<p class="warning">${esc(r.message)}</p>`;return;}
 if(r.status==='excluded'){$('result').innerHTML=context+`<div class="empty-card compact"><h2>No rewards route assumed.</h2><p>${esc(r.message)}</p></div>`;return;}
 if(!r.best){$('result').innerHTML=context+'<div class="empty-card compact"><h2>No eligible fee-free route in your wallet.</h2><p>Check your selected cards, card modes and merchant category.</p><button class="quiet" data-wallet>Review wallet ↗</button></div>';return;}
 const b=r.best,other=r.options.filter(o=>o.id!==b.id&&o.eligible).sort((a,c)=>r.quick?c.displayRate-a.displayRate:c.miles-a.miles);
 const warnings=r.warnings.map(w=>`<p class="warning">${esc(w)}</p>`).join('');
 const amountNote=r.quick?'Rate comparison · amount optional':`S$${num(r.amount)}${r.foreign?' SGD equivalent':''} · after modelled rounding`;
 $('result').innerHTML=context+`<article class="recommendation"><div class="eyebrow">${r.quick?'YOUR DEFAULT CARD':'BEST ESTIMATE FOR THIS AMOUNT'}</div><h2>${esc(b.name)}</h2><p class="route">${methodName[m.method]}${m.method==='online'?' at checkout':' directly'}</p><div class="reward-number">${r.quick?num(b.displayRate):'≈ '+num(b.miles)}<span>${r.quick?'miles / S$':'KrisFlyer miles'}</span></div><div class="rec-bottom"><span>${esc(amountNote)}<br>${esc(b.feeLabel)}</span><span aria-hidden="true">↗</span></div></article><p class="reason">${esc(b.reason)}${r.quick&&b.cap===0?' Its bonus allowance is used up; the rate above is the base rate.':''}</p>${m.confidence!=='confirmed'?'<p class="assumption">Category is an assumption. Check the merchant’s bank classification before relying on the bonus.</p>':''}${m.notes?`<p class="personal-note">${esc(m.notes)}</p>`:''}${warnings}${other.length?`<details class="alternatives"><summary>Your other cards <span>＋</span></summary>${other.map(o=>`<div class="alternative"><span class="card-mark ${o.color}"></span><strong>${esc(o.name)}</strong><span>${r.quick?num(o.displayRate)+' miles/$':'≈ '+num(o.miles)+' miles'}</span></div>`).join('')}</details>`:''}${r.amaze?`<div class="amaze"><strong>Amaze + Citi Rewards · ≈ ${num(r.amaze.miles)} miles</strong><p>${esc(r.amaze.feeLabel)}. Shares Citi’s bonus allowance. Compare the extra cost before choosing this route.</p></div>`:''}`;
}
function renderLists(){
 const all=[...store.data.merchants].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),q=normalize($('places-search').value);
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
function openEditor(m=null){
 editor={id:m?.id||crypto.randomUUID(),createdAt:m?.createdAt||new Date().toISOString(),existing:!!m?.id};
 const value=m||{name:queryName($('merchant-search').value),category:'',method:'tap',currency:'sgd'};
 $('merchant-title').textContent=editor.existing?'Edit this place.':'Remember this place.';
 for(const key of ['name','variant','category','method','currency','notes'])$(key).value=value[key]||'';
 $('confidence').value=value.confidence||'guess';$('uob-excluded').checked=!!value.uobExcluded;$('online-wallet').checked=!!value.onlineWallet;
 $('merchant-copy').hidden=!editor.existing;$('merchant-error').textContent='';categoryHelp();$('merchant-dialog').showModal();
}
$('rules-date').textContent=CHECKED;
$('category').innerHTML='<option value="">Choose a category…</option>'+CATEGORIES.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
$('source-list').innerHTML=SOURCES.map(([label,url])=>`<li><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a></li>`).join('');
$('merchant-search').addEventListener('input',search);
$('merchant-search').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();search();}});
$('clear-search').addEventListener('click',()=>{active=null;$('merchant-search').value='';$('pay-amount').value='';search();$('merchant-search').focus();});
$('pay-amount').addEventListener('input',renderResult);
$('places-search').addEventListener('input',renderLists);
$('new-merchant').addEventListener('click',()=>openEditor());$('places-add').addEventListener('click',()=>openEditor());
$('result').addEventListener('click',e=>{if(e.target.closest('[data-wallet]'))view('wallet');if(e.target.closest('[data-add]'))openEditor();if(e.target.closest('[data-edit-current]'))openEditor(current());});
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
$('merchant-copy').addEventListener('click',()=>{editor={id:crypto.randomUUID(),createdAt:new Date().toISOString(),existing:false};$('variant').value='';$('merchant-copy').hidden=true;$('merchant-title').textContent='Add another route.';$('variant').focus();});
$('merchant-form').addEventListener('submit',async e=>{
 e.preventDefault();const m={id:editor.id,createdAt:editor.createdAt,updatedAt:new Date().toISOString()};
 for(const key of ['name','variant','category','method','currency','notes','confidence'])m[key]=$(key).value;
 m.uobExcluded=$('uob-excluded').checked;m.onlineWallet=$('online-wallet').checked;
 try{await store.save(data=>({...data,merchants:[...data.merchants.filter(row=>row.id!==m.id),m]}));select(store.data.merchants.find(row=>row.id===m.id));$('merchant-dialog').close();view('pay');notify('Merchant saved. Next time, just type its name.');}catch(err){$('merchant-error').textContent=err.message;}
});
$('wallet-form').addEventListener('input',e=>{walletDirty=true;if(e.target.id==='hsbc-cap')dirtyCaps.hsbc=true;if(e.target.id==='citi-cap')dirtyCaps.citi=true;});
$('wallet-form').addEventListener('submit',async e=>{
 e.preventDefault();const now=new Date().toISOString(),old=settings();
 const next={...old,cards:[...document.querySelectorAll('input[name=card]:checked')].map(el=>el.value),amaze:$('wallet-amaze').checked,hsbcRemaining:$('hsbc-cap').value===''?null:Number($('hsbc-cap').value),citiRemaining:$('citi-cap').value===''?null:Number($('citi-cap').value),hsbcUpdated:dirtyCaps.hsbc?now:old.hsbcUpdated,citiUpdated:dirtyCaps.citi?now:old.citiUpdated,citiResetDate:$('citi-reset').value,uobQualified:$('uob-qualified').checked,trustMiles:$('trust-miles').checked,savedAt:now};
 try{await store.save(data=>({...data,settings:next}));walletDirty=false;fillWallet();$('wallet-error').textContent='';view('pay');notify('Wallet saved. Search a merchant to get your card.');}catch(err){$('wallet-error').textContent=err.message;}
});
$('login-form').addEventListener('submit',async e=>{e.preventDefault();$('login-error').textContent='Connecting…';try{await store.unlock($('password').value);$('password').value='';$('login-error').textContent='';}catch(err){$('login-error').textContent=err.message;}});
$('logout').addEventListener('click',async()=>{try{await store.lock();active=null;walletDirty=false;}catch(err){notify(err.message);}});
$('refresh').addEventListener('click',async()=>{if(walletDirty||document.querySelector('dialog[open]')){if(!confirm('Discard your unsaved form changes and load the latest saved details?'))return;walletDirty=false;for(const d of document.querySelectorAll('dialog[open]'))d.close();}await store.load();search();});
let lastFocus=0;window.addEventListener('focus',()=>{if(Date.now()-lastFocus>30000&&!document.querySelector('dialog[open]')&&!walletDirty){lastFocus=Date.now();store.load();}});
window.addEventListener('online',()=>{if(!walletDirty&&!document.querySelector('dialog[open]'))store.load();});
$('export').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(store.data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='pocket-miles-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
$('import').addEventListener('click',()=>$('import-file').click());
$('import-file').addEventListener('change',async()=>{const file=$('import-file').files[0];if(!file)return;try{if(file.size>700000)throw new Error('Backup is too large.');const incoming=validateNotebook(JSON.parse(await file.text()));if(!confirm(`Replace your current wallet and merchant book with this backup (${incoming.merchants.length} places)? Export a backup first if you want to retain the current version.`))return;await store.save(()=>incoming);active=null;walletDirty=false;fillWallet();notify('Backup restored.');}catch(err){notify(err.message);}finally{$('import-file').value='';}});
for(const b of document.querySelectorAll('[data-close]'))b.addEventListener('click',()=>$(b.dataset.close).close());
$('sources-open').addEventListener('click',()=>$('sources-dialog').showModal());
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
$('install').addEventListener('click',async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;}else $('install-dialog').showModal();});
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
await store.load();
