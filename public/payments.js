import {recommend} from './recommend.js';

export const PAYMENT_NAMES={tap:'Tap / phone',online:'Online / app',insert:'Insert card'};
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
 return paymentMethods(merchant).map(method=>{
  const input={...merchant,method,amount,onlineWallet:method==='online'&&!!merchant.onlineWallet};
  return {method,result:recommend(input,settings,now)};
 });
}
