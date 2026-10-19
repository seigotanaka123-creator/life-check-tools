import {FIELD} from './imasora-construction-shared-field.mjs?v=120ey';

// The frame belongs to saved work, never to a parking bay. Do not translate
// terrain, pipes, liquid parcels or finished works when the fleet moves.
export function constructionWorkFrame(origin){
 if(!origin||![origin.x,origin.z].every(Number.isFinite))throw Error('作業の基準位置が不正です。');
 const x=origin.x,z=origin.z;
 const map=(point,sign)=>{
  if(!point||![point.x,point.z].every(Number.isFinite)||('y' in point&&!Number.isFinite(point.y)))throw Error('作業の座標が不正です。');
  return{...point,x:point.x+sign*x,z:point.z+sign*z};
 };
 return Object.freeze({
  origin:Object.freeze({x,z}),
  bounds:Object.freeze({minX:FIELD.minX-x,maxX:FIELD.maxX-x,minZ:FIELD.minZ-z,maxZ:FIELD.maxZ-z}),
  toWorld:point=>map(point,1),
  toLocal:point=>map(point,-1)
 });
}

// Used at the migration boundary: expand the usable footprint and put only
// the vehicle at a parking pose. Original work records stay byte-identical.
// This returns a proposal. The normal-game ledger is deliberately not written.
export function relocatedVehiclePose(frame,vehicle,worldPose){
 if(!frame?.toLocal||!vehicle||!worldPose||!Number.isFinite(worldPose.heading))throw Error('車の移行位置が不正です。');
 const p=frame.toLocal(worldPose),b=frame.bounds;
 if(p.x<b.minX||p.x>b.maxX||p.z<b.minZ||p.z>b.maxZ)throw Error('車が工事現場の外に出ています。');
 return{...structuredClone(vehicle),x:p.x,z:p.z,heading:worldPose.heading,speed:0,steering:0};
}
