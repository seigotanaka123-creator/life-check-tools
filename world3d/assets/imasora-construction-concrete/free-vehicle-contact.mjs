import {freePlacedFill} from './free-work-parts.mjs';
import {canonicalFreeAction,freeCell,freeVehicleProblem} from './free-build-state.mjs';
import {FRAME_RACK} from './free-frames.mjs';
import {VEHICLE_WHEELS,VEHICLE_GROUND,vehicleGroundPose,vehicleLevelWorkProblem} from './free-vehicle-ground.mjs';
export {VEHICLE_WHEELS} from './free-vehicle-ground.mjs';

export const FREE_VEHICLE_ACTIONS=new Set(['FREE_MOVE','FREE_LEGS']);
import {VEHICLE_CONTACT,VEHICLE_PADS,headingDelta,vehicleTravelHeading,vehicleContactPoint,vehiclePoseAt,vehicleSweepSteps,vehicleFootprints,overlaps} from './free-vehicle-shape.mjs';
export {VEHICLE_CONTACT,VEHICLE_PADS,headingDelta,vehicleTravelHeading,vehicleContactPoint,vehiclePoseAt,vehicleSweepSteps,vehicleFootprints,overlaps} from './free-vehicle-shape.mjs';
const rect=(v,hx,hz)=>({...v,hx,hz});
export function concreteVehicleGeometry(f,heightAt=()=>0){
 if(!f?.location)return{floors:[],walls:[]};
 return{floors:[],walls:['truck','pump'].flatMap(name=>{const v=f[name];let ground;try{ground=vehicleGroundPose(f,v,heightAt);}catch{ground={padX:10,padZ:10,position:{y:0}};}
  return vehicleFootprints(v,ground).map((r,i)=>({id:`construction-concrete-vehicle-${name}-${i}`,buildingId:'construction-concrete',x:r.x+f.location.x,z:r.z+f.location.z,rotation:r.heading,localHalfX:r.hx,localHalfZ:r.hz,minY:ground.position.y-10,maxY:ground.position.y+72,surfaceEdge:true,stepAdjacent:false}));})};
}
export function createConcreteSupportSampler({width,depth,hole=null,heightsAt=()=>[],earthHeightAt=()=>undefined}){
 return(x,z)=>{
  if(!Number.isFinite(x+z+width+depth)||width<=0||depth<=0||Math.abs(x)>=width/2||Math.abs(z)>=depth/2)return null;
  const earth=earthHeightAt(x,z);if(earth!==undefined&&!Number.isFinite(earth))return null;
  if(earth===undefined&&hole&&x>=hole.minX&&x<=hole.maxX&&z>=hole.minZ&&z<=hole.maxZ)return null;
  const heights=heightsAt(x,z);if(!Array.isArray(heights)||heights.some(h=>!Number.isFinite(h)))return null;
  return Math.max(earth??0,...heights);
 };
}
function supports(v){return[...VEHICLE_WHEELS.map((p,i)=>({...p,id:'wheel-'+i,kind:'wheel',offsets:[-2.5,0,2.5],depths:[-1,0,1]})),...(v.legs?VEHICLE_PADS.map((p,i)=>({...p,id:'pad-'+i,kind:'pad',offsets:[-4.5,-2.25,0,2.25,4.5],depths:[-4.5,-2.25,0,2.25,4.5]})):[])];}
export function vehiclePoseProblem(f,name,v,{blockedAt=()=>false,supportHeightAt=()=>0,terrainTravel=false}={}){
 if(!f?.location||!['truck','pump'].includes(name)||![v.x,v.z,v.heading].every(Number.isFinite))return '車両の位置を確認できません。';
 if(Math.abs(f.location.x+v.x)>2600||Math.abs(f.location.z+v.z)>1700)return '工事現場の端です。';
 let ground=null,otherGround=null;try{ground=vehicleGroundPose(f,v,supportHeightAt);}catch(e){return e.message;}
 const otherVehicle=f[name==='truck'?'pump':'truck'];try{otherGround=vehicleGroundPose(f,otherVehicle,supportHeightAt);}catch{otherGround={padX:10,padZ:10};}
 const bodies=vehicleFootprints(v,ground),other=vehicleFootprints(otherVehicle,otherGround);
 if(bodies.some(body=>other.some(part=>overlaps(body,part))))return '車体がもう1台に当たります。車間を空けてください。';
 if(bodies.some(body=>overlaps(body,rect({...FRAME_RACK,heading:0},11,6))))return '車体が型枠の資材置き場に当たります。';
 const works=[...f.completed,...(!['design','complete'].includes(f.stage)?[{...f.location,fill:Array.from({length:16},(_,i)=>f.mask&(1<<i)?1:0),frame:true}]:[])];
 for(const w of works)for(let i=0;i<16;i++)if(freePlacedFill(w,i)){const c=freeCell(i),r=rect({x:w.x-f.location.x+c.x,z:w.z-f.location.z+c.z,heading:0},w.frame?8.3:8,w.frame?8.3:8);if(bodies.some(body=>overlaps(body,r)))return '車体が型枠・完成作品に当たります。';}
 // Cover the rotated footprint, including its interior. The coarse test avoids
 // hundreds of world queries on clear ground; overlapping broad bounds use tiles.
 const wx=f.location.x+v.x,wz=f.location.z+v.z;
 if(blockedAt(wx,wz,VEHICLE_CONTACT.radius+Math.hypot(ground?.padX??0,ground?.padZ??0))){
  for(const body of bodies){const nx=Math.ceil(body.hx*2/6),nz=Math.ceil(body.hz*2/6),sx=body.hx*2/nx,sz=body.hz*2/nz,margin=Math.hypot(sx,sz)/2+VEHICLE_CONTACT.clearance;
   for(let x=0;x<nx;x++)for(let z=0;z<nz;z++){const p=vehicleContactPoint(body,{x:-body.hx+(x+.5)*sx,z:-body.hz+(z+.5)*sz});if(blockedAt(f.location.x+p.x,f.location.z+p.z,margin))return '車体の通り道に建物や障害物があります。';}
  }
 }
 for(const part of terrainTravel?[]:supports(v))for(const dx of part.offsets)for(const dz of part.depths){
  const p=vehicleContactPoint(v,{x:part.x+dx,z:part.z+dz}),h=supportHeightAt(f.location.x+p.x,f.location.z+p.z);
  if(!Number.isFinite(h)||Math.abs(h-ground.position.y)>1e-5)return part.kind==='pad'?'4本の支持脚を平らな地面に置ける場所へ停めてください。':'6輪すべてを平らな地面で支えられる場所へ停めてください。';
 }
 return '';
}
export function vehicleSweepProblem(f,name,from,to,environment,visit=()=>{}){
 const n=vehicleSweepSteps(from,to);for(let i=0;i<=n;i++){const v=vehiclePoseAt(from,to,i/n),problem=vehiclePoseProblem(f,name,v,environment);if(problem)return problem;visit(v);}
 return '';
}
export function vehicleActionProblem(f,a,environment){
 // Removing an empty hose moves neither vehicle; leave recovery available on changed ground.
 if(a.type==='FREE_CONNECT'&&a.connected===false)return ''; 
 if(a.type==='FREE_MOVE')return freeVehicleProblem(f,a.vehicle,a.x,a.z)||vehicleSweepProblem(f,a.vehicle,f[a.vehicle],{...f[a.vehicle],x:a.x,z:a.z,heading:a.heading},{...environment,terrainTravel:true});
 if(a.type==='FREE_BOARD'||a.type==='FREE_LEAVE'){const name=a.type==='FREE_BOARD'?a.vehicle:f.aboard;return name?vehiclePoseProblem(f,name,f[name],{...environment,terrainTravel:!f[name].legs}):'';}
 if(a.type==='FREE_LEGS')return vehiclePoseProblem(f,'pump',{...f.pump,legs:a.deployed},environment)||vehicleLevelWorkProblem(f,f.pump,environment?.supportHeightAt);
 const names=a.type==='FREE_BOARD'?[a.vehicle]:a.type==='FREE_LEAVE'&&f.aboard?[f.aboard]:a.type==='FREE_BUCKET_LOAD'||a.type==='FREE_MIX_START'?['truck']:a.type==='FREE_PRIME'||a.type==='FREE_CONNECT'?['truck','pump']:a.type==='FREE_POUR'&&a.source!=='bucket'?(a.source==='pump'?['truck','pump']:['truck']):[];
 for(const name of names){const problem=vehiclePoseProblem(f,name,f[name],environment)||vehicleLevelWorkProblem(f,f[name],environment?.supportHeightAt);if(problem)return problem;}
 return '';
}
function context(a,p){return JSON.stringify({profileId:p.profileId,action:canonicalFreeAction(a),freeBuild:p.freeBuild});}
export function newVehicleReceipt(a,p){return{type:a.type,operationId:a.operationId,revision:p.revision,context:context(a,p),min:1,max:0,samples:0,checkedPoses:0,maxPoseError:0,maxGroundError:0,supports:[],terrainSamples:0,maxSlope:0,maxSuspension:0,maxPatchError:0};}
export function assertVehicleReceipt(a,p,revision,r){
 if(!FREE_VEHICLE_ACTIONS.has(a.type)||!r||r.type!==a.type||r.operationId!==a.operationId||r.revision!==revision||p.revision!==revision||r.context!==context(a,p))throw Error('車体・接地の確認記録が現在の作業と一致しません。');
 const expected=newVehicleReceipt(a,p),f=p.freeBuild,name=a.type==='FREE_MOVE'?a.vehicle:'pump',v={...f[name],...(a.type==='FREE_LEGS'?{legs:a.deployed}:{x:a.x,z:a.z,heading:a.heading})};
 const ids=supports(v).map(s=>s.id),n=a.type==='FREE_MOVE'?vehicleSweepSteps(f[name],v)+1:1;
 if(JSON.stringify(Object.keys(r).sort())!==JSON.stringify(Object.keys(expected).sort())||!Number.isSafeInteger(r.samples)||r.samples<3||!Number.isSafeInteger(r.checkedPoses)||r.checkedPoses<n||r.min!==0||r.max!==1||![r.maxPoseError,r.maxGroundError].every(x=>Number.isFinite(x)&&x>=0&&x<=1e-5)||JSON.stringify(r.supports)!==JSON.stringify(ids))throw Error('車体の通過と全ての車輪・支持脚の接地を確認できません。');
 if(!Number.isSafeInteger(r.terrainSamples)||r.terrainSamples<(a.type==='FREE_MOVE'?r.samples*6:0)||!['maxSlope','maxSuspension','maxPatchError'].every(k=>Number.isFinite(r[k])&&r[k]>=0&&r[k]<=VEHICLE_GROUND[k]+1e-8))throw Error('斜面と6輪の接地を確認できません。');
 return true;
}
