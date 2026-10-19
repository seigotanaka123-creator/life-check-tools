import {sharedParkingLayouts} from '../imasora-construction-shared-field.mjs?v=120ey';
// Vehicles own a position; the work owns its unchanged construction origin.
export function concreteParkingProblem(f){
 if(!f?.location)return '先につくる場所を用意しよう。';
 if(f.parkingCorner)return 'この2台は駐車場へ移してあるよ。';
 if(f.aboard||f.connected||f.hose||f.bucket||f.mixer.pending||f.truck.legs||f.pump.legs)return '車を降り、作業とホースの回収を終えて、支持脚をしまおう。';
 return '';
}
export function parkedConcreteVehicles(f,corner){
 const issue=concreteParkingProblem(f);if(issue)throw Error(issue);
 const layout=sharedParkingLayouts().find(p=>p.corner===corner);if(!layout)throw Error('駐車場の場所を確認できません。');
 return Object.fromEntries(['truck','pump'].map(name=>{const bay=layout.vehicles.find(v=>v.id===name);return[name,{...f[name],x:bay.x-f.location.x,z:bay.z-f.location.z,heading:bay.heading}];}));
}
