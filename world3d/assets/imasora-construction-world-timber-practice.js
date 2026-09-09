// An explicitly selected, unsaved rehearsal. Never called for received inventory.
import {initialWorldTimber,enterWorldTimber,worldTimberAction,validateWorldTimber,TIMBER_YARDS,FLOOR_VOLUME} from './imasora-construction-world-timber.js';
import {refreshTimberLedger} from './imasora-construction-purchased-timber.js';
import {alignCable} from './imasora-construction-floating-joints.js';
export function worldTimberJoinPractice(siteIndex,{practice,saveMode}){
  if(!practice||saveMode!=='readonly')throw Error('接合練習は保存しない貸出画面だけで使えます。');
  const[x,z]=TIMBER_YARDS[siteIndex],total=2*FLOOR_VOLUME;
  let s=enterWorldTimber(initialWorldTimber(siteIndex,total),{x:x-58,y:0,z:z-88},total);
  s=worldTimberAction(s,'issue','loan-join-first',total);Object.assign(s.work.parts[0],{x:90,y:24,z:30,hover:{height:24,contact:''}});refreshTimberLedger(s.work);
  s=worldTimberAction(s,'issue','loan-join-second',total);
  Object.assign(s.work.parts[0],{x:-40,y:2,z:16,hover:{height:2,contact:''}});
  Object.assign(s.work.parts[1],{x:44,y:4,z:18});
  s.work.rig.mode='driving';s.work.work=true;s.work.deployment=1;s.work.held=s.work.parts[1].id;
  s.work.boom.yaw=Math.atan2(44,72);s.work.boom.reach=Math.hypot(44,72);alignCable(s.work,s.work.parts[1]);
  s.work.message='貸出2枚を接合直前に準備しました。「床に接合」で金具が引き寄せます。所持品・通常保存は変更しません。';
  refreshTimberLedger(s.work);return validateWorldTimber(s,total);
}
