// One deliberate press, not a held-input timing puzzle. Transient intent is never saved.
import {stepWork} from './imasora-construction-loader-work.js';
export function startDump(w){
  if(w.loader.mode!=='driving'||w.loader.transition||!w.load)return null;
  return{elapsed:0,stalled:0};
}
export function stepDump(w,task,dt){
  if(!task||w.loader.mode!=='driving')return{world:w,task:null};
  const braking=Math.abs(w.loader.vehicle.speed)>.01,lifting=!braking&&w.bucket.lift<.6;
  const world=stepWork(w,{brake:true,raise:lifting,tip:!braking&&!lifting&&w.bucket.tilt<.9,release:!braking&&!lifting},dt);
  const changed=world.load!==w.load||world.bucket.lift!==w.bucket.lift||world.bucket.tilt!==w.bucket.tilt||world.loader.vehicle.speed!==w.loader.vehicle.speed;
  const next={elapsed:task.elapsed+dt,stalled:changed?0:task.stalled+dt};
  if(!world.load)return{world:{...world,message:'荷下ろしできました。落とした土も、同じようにすくえます。'},task:null};
  if(next.stalled>.8||next.elapsed>12)return{world:{...world,message:'荷下ろしを停止しました。落とす先が塞がっています。空いた地面へ向きを変え、もう一度「こぼす」を押してください。'},task:null};
  world.message=braking?'荷下ろしのため停車しています…':lifting?'荷下ろしの高さまでバケットを上げています…':world.load<w.load||world.bucket.tilt>.32?`土をこぼしています。残り ${(world.load/8).toFixed(2)}。「止める」で中断できます。`:'バケットを前へ傾けています…';
  return{world,task:next};
}
