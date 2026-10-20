import {fleetDoor,fieldPoint,FLEET} from './imasora-construction-shared-field.mjs?v=120ey';
import {transitionPoints,LOADER} from './imasora-construction-loader-physics.js?v=120gf';
import {excavatorAccessPath} from './imasora-construction-excavator-access.js?v=120gf';
import {DUMP_CAB} from './imasora-construction-dump-cab.mjs?v=120gf';

// Current native access paths, translated to a shared-world vehicle pose.
// Scene owner validates surrounding works and the current ground separately.
export function sharedBoardingPath(v){
 if(!FLEET.some(s=>s.id===v?.id))throw Error('車の種類をたしかめてください。');
 if(v.id==='excavator')return excavatorAccessPath(v,0,-1,true);
 if(['soil','water','crane'].includes(v.id))return transitionPoints(v,-1,true);
 if(v.id==='dump'){
  const cab={...v,...fieldPoint(v,0,DUMP_CAB.driverZ-LOADER.seatZ)};
  return transitionPoints(cab,-1,true).map(p=>({...p,y:p.y*DUMP_CAB.floor/LOADER.floor}));
 }
 return[fleetDoor(v),{...fieldPoint(v,-42,21),y:10,heading:v.heading},{...fieldPoint(v,-34,21),y:19,heading:v.heading},{...fieldPoint(v,-15,21),y:19,heading:v.heading}];
}
