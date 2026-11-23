import {excavatorGroundFrame,groundPoint,excavatorGroundHeight} from './imasora-construction-native-excavator-ground.mjs?v=120pv';
import {shovelMachineState,shovelStanding} from './imasora-construction-shovel-work.mjs?v=120pv';
import {excavatorAccessPath} from './imasora-construction-excavator-access.js?v=120ov';
import {dumpDoorFooting} from './imasora-construction-dump-work.mjs?v=120pv';
import {linkedAccessTarget,dumpBoardTarget} from './imasora-construction-bucket-dump.mjs?v=120pv';

// Only the walking actor is handed over. The soil, vehicles and operation
// clocks stay owned by the same work record, at their original world origin.
export function transportDoorSpots(f,id){
 const candidates=[];
 if(id==='excavator'){
  const v=shovelMachineState(f).loader.vehicle;
  for(const side of [-1,1]){let p=excavatorAccessPath(v,f.machineArm.slew,side)[0];const g=excavatorGroundFrame(f);if(g){const c=Math.cos(v.heading),sn=Math.sin(v.heading),dx=p.x-v.x,dz=p.z-v.z,q=groundPoint(g,c*dx-sn*dz,0,sn*dx+c*dz),y=excavatorGroundHeight(f,q[0],q[2],q[1]);if(!Number.isFinite(y)||Math.abs(y-q[1])>2.1)continue;p={...p,x:q[0],y,z:q[2]};}candidates.push(p);}
 }else if(id==='dump'){
  for(const side of [-1,1]){const point=dumpDoorFooting(f,side);
   if(point)candidates.push({x:point[0],y:point[1],z:point[2],heading:f.dump.heading});}
 }
 return candidates.map(p=>({x:p.x,y:p.y,z:p.z,heading:Math.atan2(Math.sin(p.heading),Math.cos(p.heading))}));
}

export function transportDoorApproaches(work,id){
 const f=work?.frame;
 if(!f||work.mode!=='foot'||work.scoop||work.link||work.unload||f.job||f.soil.pending||f.soil.containers.shovel.amount)return [];
 return transportDoorSpots(f,id).filter(p=>{
  if(!shovelStanding(f,p))return false;
  const at={...work,frame:{...f,player:{...f.player,...p}}};
  return !!(id==='excavator'?linkedAccessTarget(at):dumpBoardTarget(at));
 });
}

export function transportDoorApproach(work,id,from){
 const doors=transportDoorApproaches(work,id);
 if(from)doors.sort((a,b)=>Math.hypot(a.x-from.x,a.z-from.z)-Math.hypot(b.x-from.x,b.z-from.z));
 return doors[0]??null;
}

export function arriveTransportDoor(work,id,p,near=false){
 const door=p&&transportDoorApproach(work,id,p);
 const atDoor={...work,frame:{...work.frame,player:{...work.frame.player,...p}}};
 const safe=door&&['x','y','z'].every(k=>Number.isFinite(p[k]))&&Math.hypot(p.x-door.x,p.z-door.z)<=(near?9:.6)&&Math.abs(p.y-door.y)<=.05&&shovelStanding(work.frame,p);
 if(!safe||near&&!(id==='excavator'?linkedAccessTarget(atDoor):dumpBoardTarget(atDoor)))throw Error('運転席のドアへ歩いてから乗ろう。作業途中の土はそのまま残るよ。');
 const player={...work.frame.player,x:p.x,y:p.y,z:p.z,heading:door.heading};
 return{...work,revision:work.revision+1,frame:{...work.frame,revision:work.frame.revision+1,player}};
}
