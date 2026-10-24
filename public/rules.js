export const CHECKED = '23 Oct 2026';
export const SOURCES = [
 ['HSBC categories & caps','https://www.hsbc.com.sg/content/dam/hsbc/sg/documents/credit-cards/revolution/offers/revolution-credit-card-reward-points-terms-and-conditions.pdf'],
 ['HSBC airline conversion ratios','https://www.hsbc.com.sg/credit-cards/rewards/'],
 ['Citi bonus categories & cap','https://www.citibank.com.sg/credit-cards/rewards/citi-rewards-card/pdf/10x-rewards-promotion-terms-and-conditions-2020.pdf'],
 ['Citi rewards exclusions','https://www.citibank.com.sg/credit-cards/pdf/rewards-exclusion-list.pdf'],
 ['Citi airline conversion ratios','https://www.citibank.com.sg/credit-cards/privileges-programs/credit-card-rewards-redemption/points-transfer.html'],
 ['KrisFlyer UOB terms','https://www.uob.com.sg/assets/pdfs/kf_credit_card_full_tnc.pdf'],
 ['UOB SimplyGo','https://www.uob.com.sg/personal/cards/card-privileges/simplygo.page'],
 ['Trust Miles','https://trustbank.sg/freedom-credit-card/miles/'],
 ['Trust exclusions','https://trustbank.sg/legal/trust-freedom-credit-card-product-terms/'],
 ['Trust rounding & transfer fee','https://help.heymax.ai/en/articles/16917571-earn-max-miles-with-the-trust-freedom-card'],
 ['Amaze fees','https://www.instarem.com/help-personal/faqs/amaze-card-fees/'],
 ['Amaze + Citi pairing (independent report)','https://milelion.com/2026/08/15/instarem-amaze-card-review/'],
 ['SimplyGo billing','https://www.lta.gov.sg/content/ltagov/en/getting_around/public_transport/plan_your_journey.html']
];
export const CATEGORIES = [
 {id:'mrt',name:'MRT & public buses',group:'Transport',method:'tap',mcc:'BUS/MRT',icon:'train',uobBonus:true,excludedCiti:true,note:'Tap KrisFlyer UOB directly, or through your phone wallet. Enter the combined posted BUS/MRT charge, not one ride. Mastercard fares accumulate for up to 5 days or S$15. EZ-Link top-ups are different.'},
 {id:'rides',name:'Grab, Gojek & taxi apps',group:'Transport',method:'online',mcc:'4121',icon:'car',hsbc:true,uobBonus:true,note:'Use the card as the payment source in the app. Wallet top-ups do not earn rewards. Taxi classification is assumed.'},
 {id:'taxi',name:'Taxi terminal',group:'Transport',method:'tap',mcc:'4121',icon:'car',hsbc:true,uobBonus:true,note:'Contactless payment at a taxi terminal, assuming taxi MCC 4121. Any taxi operator surcharge is separate.'},
 {id:'groceries',name:'Supermarket groceries',group:'Everyday',method:'tap',mcc:'5411',icon:'basket',note:'Supermarket MCC 5411 does not get HSBC bonus points or UOB online-shopping bonus. For online grocery orders, choose Online. This covers supermarket-classified purchases, not every merchant selling food.'},
 {id:'pharmacy',name:'Pharmacies',group:'Everyday',method:'tap',mcc:'5912',icon:'cross',hsbc:true,uobOnline:true,note:'Assumes pharmacy MCC 5912, which HSBC includes. Watsons or Guardian searches suggest this category; the actual outlet/payment route still needs confirmation.'},
 {id:'dining',name:'Restaurants, cafés & bars',group:'Food & drink',method:'tap',mcc:'5812 / 5813',icon:'cup',hsbc:true,uobBonus:true,note:'Assumes restaurant/bar classification. Some cafés and food courts code as fast food: choose Fast food if that applies. Hotel dining can use the hotel classification.'},
 {id:'fastfood',name:'Fast food & food courts',group:'Food & drink',method:'tap',mcc:'5814',icon:'cup',uobBonus:true,note:'Assumes fast-food MCC 5814, excluded from HSBC bonus points. Food courts can use other codes. UOB and Trust earn in S$5 blocks.'},
 {id:'bakery',name:'Bakeries & confectionery',group:'Food & drink',method:'tap',mcc:'5462 / 5441',icon:'cup',hsbc:true,note:'HSBC includes bakery and confectionery MCCs 5462 and 5441. They are not UOB’s restaurant/fast-food bonus MCCs. Confirm the store’s actual classification.'},
 {id:'delivery',name:'Food delivery apps',group:'Food & drink',method:'online',mcc:'Varies',icon:'basket',uobBonus:true,note:'Citi is the broad online option. UOB bonus estimate assumes its eligible delivery MCC/description (such as GrabFood, foodpanda or Deliveroo). HSBC is not assumed eligible because delivery coding varies.'},
 {id:'fashion',name:'Clothes, shoes & department stores',group:'Shopping',method:'tap',mcc:'Citi shopping list',icon:'bag',hsbc:true,citiShopping:true,uobOnline:true,note:'Citi gives its shopping bonus in person at eligible clothing, footwear, bag and department-store MCCs. No Amaze needed. This does not cover every shop in a mall.'},
 {id:'electronics',name:'Electronics stores',group:'Shopping',method:'tap',mcc:'5732',icon:'bag',hsbc:true,uobOnline:true,note:'Assumes electronics MCC 5732. Pay contactless for HSBC; an inserted card does not qualify for its selected-contactless bonus.'},
 {id:'books',name:'Books & toy shops',group:'Shopping',method:'tap',mcc:'5942 / 5945',icon:'bag',hsbc:true,uobOnline:true,note:'Assumes book or toy/hobby-store classification. Buying a book at a supermarket retains the supermarket classification.'},
 {id:'marketplace',name:'Shopee, Lazada & online retail',group:'Shopping',method:'online',mcc:'Varies',icon:'bag',hsbc:true,uobOnline:true,note:'HSBC/UOB bonus estimates assume an eligible marketplace or retail MCC. Not every website qualifies for those cards. Citi covers eligible online retail more broadly.'},
 {id:'otheronline',name:'Other online retail',group:'Shopping',method:'online',mcc:'Confirm category',icon:'bag',note:'For ordinary eligible retail purchases whose exact MCC is not known. HSBC/UOB category bonuses are not assumed. Travel, bills and top-ups must use their own categories.'},
 {id:'gym',name:'Gym & sports-club membership',group:'Lifestyle',method:'online',mcc:'7997',icon:'heart',hsbc:true,note:'HSBC estimate assumes club/membership MCC 7997. Other gym classifications and payment arrangements may differ. Trust recurring-payment eligibility should be verified.'},
 {id:'cinema',name:'Cinema & entertainment tickets',group:'Lifestyle',method:'online',mcc:'Varies',icon:'ticket',note:'Use Citi directly for eligible online tickets. In-person entertainment is not assumed to receive HSBC or UOB category bonuses.'},
 {id:'medical',name:'Clinic, dentist & hospital',group:'Everyday',method:'tap',mcc:'Medical MCCs',icon:'cross',excludedUob:true,excludedHsbc:true,excludedCiti:true,review:true,note:'Verify the actual medical MCC first. Trust has no blanket medical-MCC exclusion, but government-coded payments are excluded. Citi and HSBC exclude hospital MCC 8062; UOB excludes hospitals/doctors and some medical services. Those cards are treated conservatively for this combined category; some non-hospital payments may qualify. This is not pharmacy spending.'},
 {id:'petrol',name:'Petrol / fuel',group:'Everyday',method:'tap',mcc:'5541 / 5542',icon:'car',note:'Compare the station’s card-specific fuel discounts before paying: those can outweigh miles. UOB excludes SPC and UOB$ merchants. This estimate assumes an otherwise eligible station.'},
 {id:'sia',name:'Singapore Airlines, Scoot & KrisShop',group:'Travel',method:'online',mcc:'Qualifying direct purchase',icon:'plane',hsbc:true,travel:true,uobSia:true,note:'Use UOB when maintaining its S$1,000 qualifying spend each membership year. HSBC estimate assumes an eligible airline/retail MCC and direct online or contactless payment. Citi travel bonus is excluded here conservatively; KrisShop retail classification may differ.'},
 {id:'hotel',name:'Direct airline / hotel booking',group:'Travel',method:'online',mcc:'Airline / hotel',icon:'plane',hsbc:true,travel:true,note:'Direct qualifying airline/hotel merchant, not a travel agency. Select foreign currency separately. Hotel pre-authorisations are not final spending.'},
 {id:'ota',name:'Agoda, Booking.com & listed travel sites',group:'Travel',method:'online',mcc:'Listed UOB descriptors',icon:'plane',travel:true,uobTravel:true,note:'UOB estimate is for its listed platforms/descriptions: Agoda, Airbnb, Booking.com, Expedia, Hotels.com, Kaligo, Traveloka and Trip.com. HSBC travel-agency bonuses and Citi travel bonuses are not assumed.'},
 {id:'othertravel',name:'Other travel agency / tour booking',group:'Travel',method:'online',mcc:'4722 / other travel',icon:'plane',travel:true,note:'No Citi travel bonus. HSBC and UOB travel bonuses are not assumed for an unlisted agency.'},
 {id:'general',name:'Other ordinary retail',group:'Everyday',method:'tap',mcc:'Unconfirmed',icon:'bag',note:'Base rewards only unless you choose a more specific category. This is not a catch-all for excluded bills, top-ups or government payments.'},
 {id:'bills',name:'Utilities, insurance, tax, school fees & AXS',group:'Excluded payments',method:'online',mcc:'Excluded categories',icon:'file',excluded:true,note:'These are excluded categories across this card setup. Paying online or through Amaze does not turn them into eligible retail. Special paid bill-payment schemes and promotions are outside this picker.'},
 {id:'topup',name:'Wallet / EZ-Link / prepaid top-up',group:'Excluded payments',method:'online',mcc:'Top-up / stored value',icon:'file',excluded:true,note:'Do not confuse a top-up with paying a merchant or tapping a card directly on SimplyGo. Top-ups do not earn rewards in this guide.'},
 {id:'paynow',name:'PayNow / NETS-only / cash',group:'Excluded payments',method:'tap',mcc:'Not a credit-card purchase',icon:'file',excluded:true,note:'A bank transfer, ordinary NETS debit payment or cash purchase does not earn rewards on these credit cards. A QR code is not necessarily a credit-card payment.'}
];
const aliases = [
 [/\b(ez[ -]?link|top[ -]?up|grabpay|youtrip|prepaid)\b/i,'topup'],
 [/\b(paynow|nets|cash only)\b/i,'paynow'],
 [/\b(insurance|utilities|utility|electricity|water bill|tax|iras|school fee|tuition fee|axs)\b/i,'bills'],
 [/\b(mrt|simplygo|bus|buses|train|transit)\b/i,'mrt'],
 [/\b(grabfood|grab food|foodpanda|deliveroo|food delivery)\b/i,'delivery'],
 [/\b(grab|gojek|tada|zig|ride[ -]?hail)\b/i,'rides'],
 [/\b(taxi|comfortdelgro)\b/i,'taxi'],
 [/\b(fairprice|fair price|ntuc|cold storage|cs fresh|giant|sheng siong|don don donki|supermarket|grocer(?:y|ies))\b/i,'groceries'],
 [/\b(watsons|guardian|unity|pharmac(?:y|ies)|drugstore)\b/i,'pharmacy'],
 [/\b(mcdonald.?s?|mcd|kfc|burger king|subway|fast food|food court|foodcourt|koufu)\b/i,'fastfood'],
 [/\b(bakery|bakeries|breadtalk|confectionery)\b/i,'bakery'],
 [/\b(restaurant|cafe|café|coffee|starbucks|dining|dinner|lunch|bar)\b/i,'dining'],
 [/\b(uniqlo|zara|h&m|clothes|clothing|shoes|fashion|department|takashimaya|isetan)\b/i,'fashion'],
 [/\b(shopee|lazada|amazon|taobao|online shopping)\b/i,'marketplace'],
 [/\b(apple store|electronics|courts|harvey norman|best denki|challenger)\b/i,'electronics'],
 [/\b(bookstore|books|popular|kinokuniya|toys|lego)\b/i,'books'],
 [/\b(gym|fitness|sports club)\b/i,'gym'],
 [/\b(cinema|movie|golden village|shaw|ticket|concert)\b/i,'cinema'],
 [/\b(clinic|dentist|dental|hospital|doctor|medical)\b/i,'medical'],
 [/\b(petrol|fuel|shell|esso|caltex|spc)\b/i,'petrol'],
 [/\b(agoda|booking\.com|airbnb|expedia|hotels\.com|kaligo|traveloka|trip\.com)\b/i,'ota'],
 [/\b(singapore airlines|sia|scoot|krisshop)\b/i,'sia'],
 [/\b(hotel|airline|flight)\b/i,'hotel'],
 [/\b(travel agency|tour|cruise)\b/i,'othertravel']
];
export function parseQuery(text) {
 const found = aliases.find(([re])=>re.test(text));
 const amountMatch = text.match(/(?:S?\$\s*|SGD\s*)(\d[\d,]*(?:\.\d{1,2})?)\b/i) || text.match(/\b(\d[\d,]*(?:\.\d{1,2})?)\s*(?:dollars|sgd)\b/i) || text.match(/(?:^|\s)(\d[\d,]*(?:\.\d{1,2})?)\s*$/);
 const online = /\b(online|website|app|delivery)\b/i.test(text);
 return {category:found?.[1]||null,amount:amountMatch?Number(amountMatch[1].replaceAll(',','')):null,method:online?'online':null,uobExcluded:/\bspc\b/i.test(text)};
}
export const DEFAULT_SETTINGS = {hsbcRemaining:null,citiRemaining:null,uobQualified:true,trustMiles:true,hsbcUpdated:null,citiUpdated:null,citiResetDate:'',uobYearEnd:'',savedAt:null};
const floorDollar=x=>Math.floor(x+1e-8);
const blocks=x=>Math.floor((x+1e-8)/5);
function capacity(value,max) {return value===null||value===''||!Number.isFinite(Number(value))?max:Math.max(0,Math.min(max,Number(value)));}
function datedAllowance(value,updated,now,kind,resetDate) {
 if(value===null||value==='') return {value:null,unknown:true};
 const month=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit'}).format(new Date(d));
 const stale=!updated||(kind==='hsbc' && month(updated)!==month(now)) || (kind==='citi' && ((new Date(now)-new Date(updated)>32*864e5) || (resetDate && new Date(resetDate+'T00:00:00+08:00')<=new Date(now) && new Date(updated)<new Date(resetDate+'T00:00:00+08:00'))));
 return {value:stale?null:value,unknown:stale,stale};
}
export function evaluate(input,settings=DEFAULT_SETTINGS,now=new Date().toISOString()) {
 const cat=CATEGORIES.find(c=>c.id===input.category);
 if(!cat) return {status:'choose',message:'Choose a category to compare your cards.',options:[],warnings:[]};
 const amount=Number(input.amount);
 if(!Number.isFinite(amount)||amount<=0||amount>1000000) return {status:'amount',message:'Enter an amount between S$0.01 and S$1,000,000.',options:[],warnings:[]};
 if(cat.excluded) return {status:'excluded',category:cat,options:[],warnings:[],message:cat.note};
 const foreign=input.currency==='foreign', online=input.method==='online',contactless=input.method==='tap';
 const hsbcAllow=datedAllowance(settings.hsbcRemaining,settings.hsbcUpdated,now,'hsbc');
 const citiAllow=datedAllowance(settings.citiRemaining,settings.citiUpdated,now,'citi',settings.citiResetDate);
 const hc=capacity(hsbcAllow.value,1000),cc=capacity(citiAllow.value,1000),rounded=floorDollar(amount);
 const hb=cat.hsbc&&(online||contactless)&&!cat.excludedHsbc;
 const cb=!cat.excludedCiti && !cat.travel && (cat.citiShopping || (online&&!input.onlineWallet));
 const ub=settings.uobQualified && (cat.uobBonus||(cat.uobOnline&&online)||(cat.uobTravel&&online));
 const uobExcluded=cat.excludedUob||input.uobExcluded;
 const pointsCiti=bonus=>rounded*0.4+(bonus?Math.min(rounded,floorDollar(cc))*3.6:0);
 const hsbcMiles=cat.excludedHsbc?0:amount/3+(hb?Math.min(amount,hc)*3:0);
 const uobMiles=uobExcluded?0:blocks(amount)*(cat.uobSia?15:ub?12:6);
 const unknown=[]; if(hb&&hsbcAllow.unknown)unknown.push('HSBC'); if(cb&&citiAllow.unknown)unknown.push('Citi');
 const options=[
  {id:'hsbc',name:'HSBC Revolution',short:'HSBC',color:'red',miles:hsbcMiles,rate:hb?10/3:1/3,bonus:!!hb,cap:hb?hc:null,unknownCap:!!hb&&hsbcAllow.unknown,fee:foreign?null:0,feeLabel:foreign?'Bank FX fee applies':'No added route fee',eligible:!cat.excludedHsbc,reason:cat.excludedHsbc?'Medical eligibility varies; not recommended here.':hb?`Eligible ${online?'online':'contactless'} category; 10 points/$ converts to 3.33 KrisFlyer miles/$.`:'No category bonus for this payment. Only base points are assumed.',rounding:'Estimated marginal miles before HSBC’s monthly rounding. Standard 10× tier; no deposit-linked boost.'},
  {id:'citi',name:'Citi Rewards',short:'Citi',color:'blue',miles:cat.excludedCiti?0:pointsCiti(cb),rate:cb?4:.4,bonus:!!cb,cap:cb?cc:null,unknownCap:!!cb&&citiAllow.unknown,fee:foreign?null:0,feeLabel:foreign?'Bank FX fee applies':'No added route fee',eligible:!cat.excludedCiti,reason:cat.excludedCiti?(cat.id==='mrt'?'Citi Rewards excludes transit.':'Medical eligibility varies; not recommended for this combined category.'):cb?(cat.citiShopping?'Eligible shopping category; no Amaze needed.':'Eligible direct online retail purchase.'):cat.travel?'Travel is excluded from Citi’s online bonus.':input.onlineWallet&&online?'Online wallet route is not assumed to qualify for the online bonus.':'In-person spending outside Citi’s shopping list earns only base points.',rounding:'Each purchase is rounded down to whole S$1 for points. The bonus cap is shared with Amaze.'},
  {id:'uob',name:'KrisFlyer UOB',short:'UOB',color:'navy',miles:uobMiles,rate:cat.uobSia?3:ub?2.4:1.2,bonus:!!ub||!!cat.uobSia,fee:foreign?null:0,feeLabel:foreign?'Bank FX fee applies':'No added route fee',eligible:!uobExcluded,reason:uobExcluded?'Excluded merchant or medical category; no miles assumed.':cat.uobSia?'Qualifying SIA / Scoot / KrisShop purchase earns 3 miles/$.':ub?'Eligible bonus category with your annual SIA-group spending condition met.':'Eligible base spending; no category bonus assumed.',rounding:'Miles awarded in S$5 blocks. The extra 1.2 category miles/$ posts after the membership year.'},
  {id:'trust',name:'Trust Freedom',short:'Trust',color:'green',miles:settings.trustMiles?blocks(amount)*6.5:0,rate:1.3,bonus:false,fee:0,feeLabel:foreign?'No foreign transaction fee':'No added route fee',eligible:!!settings.trustMiles,reason:settings.trustMiles?'Miles mode: 1.3 miles/$ on eligible spending, with no monthly cap.':'Miles mode is off; cashback/stockback is not compared as miles.',rounding:'Each purchase is rounded down to S$5 blocks. S$27.25 per miles transfer; batch redemptions.'}
 ];
 const paidEligible=!cat.excludedCiti&&!cat.travel;
 const amaze=paidEligible?{id:'amaze',name:'Amaze + Citi Rewards',short:'Amaze + Citi',color:'purple',miles:pointsCiti(true),rate:4,bonus:true,cap:cc,unknownCap:citiAllow.unknown,fee:foreign?null:Math.max(.5,amount*.01),feeLabel:foreign?'Up to 2.1% FX spread':`S$${Math.max(.5,amount*.01).toFixed(2)} route fee`,eligible:true,reason:'Reported pairing converts eligible physical spending into online spending for Citi. Uses the same Citi bonus allowance.',rounding:'Pairing is based on independent reporting, not a bank guarantee. Excluded merchants stay excluded.'}:null;
 const candidates=options.filter(o=>o.eligible&&o.fee===0).sort((a,b)=>b.miles-a.miles||(['uob','citi','hsbc','trust'].indexOf(a.id)-['uob','citi','hsbc','trust'].indexOf(b.id)));
 let best=candidates[0]||null;
 // SimplyGo is billed in accumulated Mastercard charges. Keep this direct, established route as the default.
 if(cat.id==='mrt'&&!foreign&&!uobExcluded) best=options.find(o=>o.id==='uob');
 const warnings=[];
 if(unknown.length) warnings.push(`${unknown.join(' and ')} allowance not confirmed. Estimates assume the full standard bonus allowance. Enter remaining allowance in Your cards.`);
 if(hsbcAllow.stale||citiAllow.stale)warnings.push('A saved allowance is from an earlier period. Refresh it before relying on the estimate.');
 if(hb&&hc<amount&&!hsbcAllow.unknown)warnings.push('Part of this purchase exceeds your HSBC bonus allowance and earns only base points.');
 if(cb&&cc<rounded&&!citiAllow.unknown)warnings.push('Part of this purchase exceeds your Citi bonus allowance and earns only base points.');
 if(foreign)warnings.push('Recommendation prioritises no foreign transaction fee. Amount must be the estimated SGD equivalent. Bank-card FX charges are not estimated; pay in the merchant’s currency, not a merchant-converted SGD amount.');
 if(cat.review)warnings.push('Verify the medical MCC and payment route before paying. Government and other excluded classifications will earn no rewards.');
 if(cat.id==='mrt')warnings.push('This estimate is for a combined posted BUS/MRT charge, not an individual ride. Use the same card/device to tap in and out.');
 if(input.uobExcluded)warnings.push('UOB is excluded for this payment. Merchant exclusions can override its headline rate.');
 if(cat.id==='sia')warnings.push('Keep S$1,000 of qualifying SIA / Scoot / KrisShop spend on UOB each membership year to maintain its category bonus. The highest immediate earn estimate does not track that annual target.');
 if(best&&best.miles===0)warnings.push('This amount earns no miles on the recommended eligible route under its rounding rules.');
 return {status:'ok',category:cat,best,options,amaze:amaze&&(!best||amaze.miles>best.miles+.01)?amaze:null,warnings,amount,foreign};
}
