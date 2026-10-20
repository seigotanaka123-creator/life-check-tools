import {nativeDumpHeightAt,nativeDumpHeightReader} from './imasora-construction-native-dump-support.mjs?v=120gn';
export {nativeDumpHeightAt as excavatorGroundHeight};
import {vehicleGroundFrame,groundPoint,groundLocal} from './imasora-construction-vehicle-ground-frame.mjs?v=120el';
export {groundPoint,groundLocal};
const cache=new WeakMap();
export function excavatorGroundFrame(frame){
 if(frame.version!==2)return null;
 let entries=cache.get(frame.soil);if(!entries){entries=new Map();cache.set(frame.soil,entries);}
 const v=frame.machineVehicle,key=[v.x,v.z,v.heading].join(',');if(entries.has(key))return entries.get(key);
 const g=vehicleGroundFrame(v,nativeDumpHeightReader(frame),{tracked:true,maxDegrees:8});
 Object.freeze(g.position);g.axes.forEach(Object.freeze);Object.freeze(g.axes);Object.freeze(g.suspension);Object.freeze(g);
 if(entries.size>=96)entries.delete(entries.keys().next().value);entries.set(key,g);return g;
}
export function excavatorGroundPoint(frame,x,y,z){const g=excavatorGroundFrame(frame);if(g)return groundPoint(g,x,y,z);const v=frame.machineVehicle??{x:0,z:0,heading:0},c=Math.cos(v.heading),s=Math.sin(v.heading);return[v.x+c*x+s*z,y,v.z-s*x+c*z];}
export function excavatorLevelWork(frame){const g=excavatorGroundFrame(frame);return !g||g.slope<1e-6&&Math.abs(g.position[1])<.1;}
export function excavatorWorkSupported(frame){try{excavatorGroundFrame(frame);return true;}catch{return false;}}
