import {FIELD,sharedParkingLayouts} from './imasora-construction-shared-field.mjs?v=120ey';
import {SITE} from './imasora-construction-loader-physics.js?v=120ey';
import {EXCAVATION_YARDS} from './imasora-construction-world-excavation.js?v=120fc';

const layouts=sharedParkingLayouts();
// Earth always uses its original allocation's coordinates. A field marker
// widens the usable area; it never moves the source, blocks or loose fragments.
export function assertTransportField(soil){
 const f=soil?.field;
 if(soil?.schema!==3){if(f!==undefined)throw Error('土の保存と現場の範囲が一致しません。');return null;}
 const source=soil.initial?.source,origin=source?.yardOrigin,yard=EXCAVATION_YARDS[source?.site];
 if(!f||Object.getPrototypeOf(f)!==Object.prototype||Object.keys(f).sort().join(',')!=='corner,origin'||!layouts.some(l=>l.corner===f.corner)||!Array.isArray(f.origin)||f.origin.length!==2||!f.origin.every(Number.isFinite)||!yard||!origin||origin.length!==3||origin[1]!==0||f.origin[0]!==origin[0]||f.origin[1]!==origin[2]||yard[0]!==origin[0]||yard[1]!==origin[2])throw Error('土を動かさずに使う元の現場を確認できません。');
 return f;
}
export function transportArea(frame){
 const f=assertTransportField(frame?.soil??frame);
 return f?{minX:FIELD.minX-f.origin[0],maxX:FIELD.maxX-f.origin[0],minZ:FIELD.minZ-f.origin[1],maxZ:FIELD.maxZ-f.origin[1]}:SITE;
}
export const transportFences=frame=>frame?.soil?.schema!==3;
export function transportPoseKey(frame){return JSON.stringify([frame.machineVehicle??null,frame.machineArm??null]);}
export function transportBay(soil,id){
 const f=assertTransportField(soil);if(!f)throw Error('共通駐車場の準備が必要です。');
 const v=layouts.find(l=>l.corner===f.corner).vehicles.find(v=>v.id===id);
 if(!v)throw Error('駐車する車が見つかりません。');
 return{x:v.x-f.origin[0],z:v.z-f.origin[1],heading:v.heading===0?0:v.heading};
}
