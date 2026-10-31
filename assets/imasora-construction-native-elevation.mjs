import {nativeDeckSnapshot,nativeDeckMatchesWorld,withNativeDecks} from './imasora-construction-native-decks.mjs?v=120ps';
import {nativeDumpSupport} from './imasora-construction-native-dump-support.mjs?v=120pv';
import {excavatorGroundFrame} from './imasora-construction-native-excavator-ground.mjs?v=120pv';
import {transportExcavatorPositionSafe} from './imasora-construction-transport-drive.mjs?v=120pv';
import {dumpPositionSafe} from './imasora-construction-dump-work.mjs?v=120pv';
import {shovelMachines,shovelDumpBody} from './imasora-construction-shovel-work.mjs?v=120pv';
import {boxesOverlap3D} from './imasora-construction-native-dump-pose.mjs?v=120pv';
import {outdoorSignObstacles} from './imasora-construction-outdoor-sign-guard.mjs?v=120pv';
const obstacles=new WeakMap();
function environment(world){let boxes=obstacles.get(world);if(!boxes){boxes=outdoorSignObstacles(world,{includeReel:false,includeTransport:false}).map(b=>({position:[b.x,b.y,b.z],half:[b.w/2,b.h/2,b.d/2],heading:b.angle??0}));obstacles.set(world,boxes);}return boxes;}
// Stored shapes are a bounded physical read model, not authority to create a
// floor. Every normal write and structural edit checks the actual world too.
export function assertNativeElevationWorld(world,before=null,{match=false}={}){
 const f=world?.constructionTransport?.work?.frame;if(!f)return true;if(!f.decks){if(f.machineVehicle?.groundY!==undefined||f.dump?.groundY!==undefined)throw Error('車を支える床の記録がありません。');return true;}
 if(match&&!nativeDeckMatchesWorld(f,world))throw Error('現場の床が変わったよ。車を止めてもう一度ためそう。');
 const actual=withNativeDecks(f,nativeDeckSnapshot(world)),o=f.soil.field.origin;
 let external=null;
 for(const key of ['machineVehicle','dump']){const v=f[key];if(v.groundY===undefined)continue;
  const g=key==='dump'?nativeDumpSupport(actual):excavatorGroundFrame(actual),y=key==='dump'?g.y:g.position[1];
  if(!Number.isFinite(y)||Math.abs(y-v.groundY)>.05||!(key==='dump'?dumpPositionSafe(actual):transportExcavatorPositionSafe(actual)))throw Error('車を支える床と、停車した高さが合わないよ。');
  const old=before?.constructionTransport?.work?.frame;if(old){const p=old[key],oldFrame=withNativeDecks(old,nativeDeckSnapshot(before));let prior=p.groundY;try{prior??=key==='dump'?nativeDumpSupport(oldFrame).y:excavatorGroundFrame(oldFrame).position[1];}catch{}
   const tr=world.constructionTransport.work,oldWork=before.constructionTransport.work,travel=key==='dump'?tr.vehicleTravel-oldWork.vehicleTravel:Math.abs(v.wheelTravel-p.wheelTravel),length=Math.max(Math.hypot(v.x-p.x,v.z-p.z),Number.isFinite(travel)?travel:0),grade=key==='dump'?Math.hypot(Math.tan(19*Math.PI/180),Math.tan(13*Math.PI/180)):Math.tan(8*Math.PI/180);
   if(!Number.isFinite(prior)||Math.abs(y-prior)>(key==='machineVehicle'?4.01:2.1)+length*grade)throw Error('車は実際の坂を通って同じ階へ進もう。');}
  external??=environment(world);const boxes=(key==='dump'?[shovelDumpBody(actual)]:shovelMachines(actual).filter((_,i)=>i!==1)).map(b=>({...b,position:[b.position[0]+o[0],b.position[1],b.position[2]+o[1]]}));
  if(boxes.some(b=>external.some(e=>boxesOverlap3D(b,e))))throw Error('車や建物に重なる場所へは進めないよ。');
 }
 return true;
}
