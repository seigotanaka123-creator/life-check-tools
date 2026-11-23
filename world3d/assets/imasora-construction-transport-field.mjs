import {FIELD,FIELD_ROADS,sharedParkingLayouts} from './imasora-construction-shared-field.mjs?v=121cw';
import {SITE} from './imasora-construction-loader-physics.js?v=120ov';
import {EXCAVATION_YARDS} from './imasora-construction-world-excavation.js?v=120ov';
import {BIN} from './imasora-construction-excavator.js?v=120ov';

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

const clusteredBins=new WeakMap(),storageLayouts=new WeakMap();
export function clusteredStorageBin(frame){
 const soil=frame?.soil??frame,field=assertTransportField(soil);
 if(!field)return null;
 let bin=clusteredBins.get(field);
 if(!bin){
  const layout=layouts.find(l=>l.corner===field.corner),material=layout.facilities.find(f=>f.id==='material-store'),{sx,sz}=layout.orientation;
  bin=Object.freeze({...BIN,x:material.x+20*sx-field.origin[0],z:material.z+224*sz-field.origin[1],approachSign:sz,clustered:true});
  clusteredBins.set(field,bin);
 }
 return bin;
}
export function nativeStorageBin(frame){
 const soil=frame?.soil??frame;
 if(soil?.schema!==3)return BIN;
 if(storageLayouts.has(soil))return storageLayouts.get(soil);
 const bin=soil.journal.some(entry=>entry.type==='relocate-earth-storage')?clusteredStorageBin(soil):BIN;
 if(Object.isFrozen(soil.journal))storageLayouts.set(soil,bin);
 return bin;
}

export function storageBinBox(frame){
 const bin=nativeStorageBin(frame);
 return {position:[bin.x,bin.height/2,bin.z],half:[bin.width/2,bin.height/2,bin.depth/2],heading:0};
}

// The fleet stands on an operating apron. Its parking, door approaches and
// connected supply aisle remain usable while earth elsewhere is excavated.
// Coordinates are translated into this soil record's retained yard origin.
const protectedDigAreas=new WeakMap();
export function transportDigProtectedRegions(frame){
 const soil=frame?.soil??frame,field=assertTransportField(soil);if(!field)return [];
 let cached=protectedDigAreas.get(field);if(cached)return cached;
 const layout=layouts.find(l=>l.corner===field.corner),[x,z]=field.origin;
 cached=Object.freeze([...layout.pavement,...FIELD_ROADS].map(p=>Object.freeze({
  id:p.id,minX:p.minX-x,maxX:p.maxX-x,minZ:p.minZ-z,maxZ:p.maxZ-z
 })));
 protectedDigAreas.set(field,cached);return cached;
}
export function transportDigProtection(frame,x,z,radius=1){
 if(![x,z,radius].every(Number.isFinite)||radius<0)throw Error('掘る位置を確認できません。');
 return transportDigProtectedRegions(frame).some(r=>x+radius>=r.minX&&x-radius<=r.maxX&&z+radius>=r.minZ&&z-radius<=r.maxZ)?'舗装された場所は掘れません。土の作業場へ移動してください。':'';
}
