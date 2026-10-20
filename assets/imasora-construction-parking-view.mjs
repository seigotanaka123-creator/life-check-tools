import {createGroundMark} from './imasora-construction-ground-mark.js?v=120ds';
import {parkingLayout} from './imasora-construction-parking-migration.mjs?v=120gf';
// Only paint on the existing ground. Vehicles are the actual saved work models.
export function drawSharedParking(group,record){const layout=parkingLayout(record);if(!layout)return;for(const v of layout.vehicles){for(const dx of [-64,64])createGroundMark(group,{name:'共通駐車場の白線',x:v.x+dx,z:v.z,width:1,depth:150,color:0xf3ecce});createGroundMark(group,{name:'共通駐車場の停止線',x:v.x,z:v.z+(Math.cos(v.heading)>0?-75:75),width:129,depth:1,color:0xf3ecce});}return layout;}
