import {recommend} from './recommend.js';

export const PAYMENT_NAMES={tap:'Contactless · phone or card',online:'Online / app',insert:'Insert card'};
export const ROUTES={
 tap:{label:'Google / Apple Pay · tap',short:'Google / Apple Pay',hint:'Tap at terminal',method:'tap',onlineWallet:false,primary:true},
 online:{label:'Online · direct card',short:'Online',hint:'Direct card details',method:'online',onlineWallet:false,primary:true},
 wallet:{label:'Online · Google / Apple Pay',short:'Google / Apple Pay',hint:'Online checkout',method:'online',onlineWallet:true,primary:false},
 card:{label:'Physical card · tap',short:'Physical card',hint:'Tap at terminal',method:'tap',onlineWallet:false,primary:false},
 insert:{label:'Physical card · insert',short:'Insert card',hint:'Into terminal',method:'insert',onlineWallet:false,primary:false}
};
const onlineCategories=new Set(['rides','delivery','marketplace','otheronline','ota']);
const onlineMerchants=/\b(shopee|lazada|taobao|amazon|grabfood|foodpanda|deliveroo|gojek|tada|agoda|airbnb|expedia|kaligo|traveloka|mcdelivery)\b|\b(booking|hotels|trip)\.com\b|\bmc delivery\b/i;

// These are suggested checkout methods, not a live lookup of merchant acceptance.
// A saved method is a preference; it must not hide the other applicable comparisons.
export function paymentMethods(merchant){
 if(['mrt','paynow'].includes(merchant.category))return ['tap'];
 if(['bills','topup'].includes(merchant.category))return [merchant.method];
 if(onlineCategories.has(merchant.category)||onlineMerchants.test(merchant.name))return ['online'];
 if(merchant.category==='taxi')return ['tap','insert'];
 return ['tap','online','insert'];
}

export function comparePayments(merchant,amount,settings,now){
 const methods=paymentMethods(merchant);
 return Object.entries(ROUTES).filter(([,route])=>methods.includes(route.method)).map(([route,definition])=>{
  const input={...merchant,method:definition.method,amount,onlineWallet:definition.onlineWallet};
  return {route,...definition,result:recommend(input,settings,now)};
 });
}
