import {nativeStorageBin} from './imasora-construction-transport-field.mjs?v=120ov';
import {SOIL_CAPACITY} from './imasora-construction-soil-transport.mjs?v=120pv';

const check=(ok,message)=>{if(!ok)throw Error('土の保管箱：'+message);};
const quantity=new Intl.NumberFormat('ja-JP',{maximumFractionDigits:3});
export const storageAmountText=amount=>quantity.format(amount/8)+'すくい';

// Storage is an inventory, not a newly placed physical pile. Its contents
// marker stays inside the existing bin collider, with an exact quantity label.
// Only terrain, carried soil and cargo use their physical volume geometry.
export function storageDisplay(soil,reserved=0){
 const c=soil?.containers?.storage,bin=nativeStorageBin(soil);
 check(c&&Number.isSafeInteger(c.amount)&&c.amount>=0&&c.amount<=SOIL_CAPACITY.storage,'保管量を読み取れません。土を保持して止めました。');
 check(c.amount?c.materialId==='earth-soil':c.materialId===null,'保存した土の種類を表示できません。');
 check(Number.isSafeInteger(reserved)&&reserved>=0&&reserved<=c.amount,'花壇と保管箱の土の量が一致しません。');const amount=c.amount-reserved;
 return Object.freeze({amount,materialId:c.materialId,visible:amount>0,representation:'inventory-contents-marker',
  title:'土の保管箱',quantity:amount?storageAmountText(amount):'空です',
  surface:Object.freeze({position:Object.freeze([bin.x,3.92,bin.z]),size:Object.freeze([bin.width-6,1.6,bin.depth-6])}),
  label:Object.freeze({position:Object.freeze([bin.x,24,bin.z]),size:Object.freeze([64,20])})});
}
