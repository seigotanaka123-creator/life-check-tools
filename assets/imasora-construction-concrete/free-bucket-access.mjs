import {castPoint,CAST_PORTS} from './free-casting.mjs';
import {walkPath,walkingBlocked} from './free-contact.mjs';
import {footingAt} from './free-footing.mjs';
import {walkingGroundAt} from './free-walking-ground.mjs';

// Keep the usual rear stance when it is usable. A nearby boundary need not
// prevent filling a bucket: the rear chute can turn toward another clear spot.
// All candidates remain behind the body, within the short chute's reach.
const rearStances=Object.freeze([...([0,-16,16,-28,28].flatMap(x=>[-70,-64].map(z=>({x,y:0,z})))),...[-42,42].map(x=>({x,y:0,z:-56})),...[-48,48].map(x=>({x,y:0,z:-52}))].map(Object.freeze));
export function bucketLoadAccess(f,start,external=()=>false,heightAt=()=>0){
 if(walkingBlocked(f,start.x,start.z,external)||!walkingGroundAt(f,start.x,start.z,heightAt))throw Error('足元から安全に歩けません。平らな地面へ移動してから汲んでください。');
 for(const local of rearStances){
  const dest=castPoint(f.truck,local),ground=footingAt(f,dest.x,dest.z,heightAt);
  if(!ground||walkingBlocked(f,dest.x,dest.z,external))continue;
  const port=castPoint(f.truck,CAST_PORTS.truck),heading=Math.atan2(port.x-dest.x,port.z-dest.z);
  try{return{stance:{...dest,y:ground.height,heading},path:walkPath(f,start,dest,external,heightAt)};}catch{/* Try the next bounded rear stance; never cross a blocked route. */}
 }
 throw Error('ミキサー車の後ろへ近づけません。後ろに空きを作り、平らな場所へ停め直してください。');
}
