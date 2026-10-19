import {FIELD,sharedParkingLayouts} from './imasora-construction-shared-field.mjs?v=120ey';
export const LEGACY_WORK_AREA=Object.freeze({minX:-320,maxX:320,minZ:-250,maxZ:250});
const layouts=sharedParkingLayouts();
export function assertVehicleField(v){
 const f=v?.field;if(f===undefined)return null;
 if(!f||Object.keys(f).sort().join(',')!=='corner,origin'||!layouts.some(l=>l.corner===f.corner)||!Array.isArray(f.origin)||f.origin.length!==2||!f.origin.every(Number.isFinite)||Math.abs(f.origin[0])>2400||Math.abs(f.origin[1])>1500)throw Error('車と作品の基準位置を確認できません。');
 return f;
}
export function workArea(v){const f=assertVehicleField(v);return f?{minX:FIELD.minX-f.origin[0],maxX:FIELD.maxX-f.origin[0],minZ:FIELD.minZ-f.origin[1],maxZ:FIELD.maxZ-f.origin[1]}:LEGACY_WORK_AREA;}
export function inWorkArea(p,v,r=0){const b=workArea(v);return Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x-r>=b.minX&&p.x+r<=b.maxX&&p.z-r>=b.minZ&&p.z+r<=b.maxZ;}
export function sharedSupply(v,id){const f=assertVehicleField(v);if(!f)return null;const p=layouts.find(l=>l.corner===f.corner).facilities.find(p=>p.id===id);if(!p)throw Error('補給設備を確認できません。');return{x:p.x-f.origin[0],z:p.z-f.origin[1]};}
export function sharedBay(v,id){const f=assertVehicleField(v);if(!f)return null;const p=layouts.find(l=>l.corner===f.corner).vehicles.find(p=>p.id===id);if(!p)throw Error('駐車位置を確認できません。');return{x:p.x-f.origin[0],z:p.z-f.origin[1],heading:p.heading};}
export function assertWorkField(record,origin){const v=(record.work.loader??record.work.rig).vehicle,f=assertVehicleField(v);if(record.schema===2){if(!f||f.origin[0]!==origin[0]||f.origin[1]!==origin[1])throw Error('作品の基準位置を移すことはできません。');}else if(record.schema!==1||f)throw Error('対応する現場の保存で開いてください。');}
