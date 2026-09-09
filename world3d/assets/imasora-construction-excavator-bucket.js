// A backhoe curls toward the cab (-Z), unlike the old loader-facing scoop.
// Explicit versioning leaves pre-v472 checkpoints and suspended cuts intact.
export const BACKHOE_BUCKET='backhoe-v2';
export const isBackhoe=s=>s.bucketStyle===BACKHOE_BUCKET;
export const CONTACT_DIG='tooth-contact-v1';
export const isContactDig=s=>s.digMode===CONTACT_DIG;
export const BUCKET_OUTLINE=[[1,0],[-2,5],[-8,5],[-13,0],[-15,-7],[-12,-15],[-8,-12],[-4,-9],[0,-5]];
export const BUCKET_SHELL=[[1,0],[-2,5],[-8,5],[-13,0],[-15,-7],[-12,-15],[-10.7,-14],[-13.3,-7],[-11.4,0],[-7,3.5],[-2,3.5],[0,0]];
export const BUCKET_TOOTH=[[-10.8,-13.8],[-13.1,-14.6],[-11.1,-17.8],[-10.4,-18]];
export const toothHalfWidth=z=>1.4*(1-.28*Math.max(0,Math.min(1,(-z-14.6)/3.4)));
export function bucketOffset(s,curl=s.arm.curl){
  if(isContactDig(s)){const angle=curl-s.arm.boom-s.arm.stick;return{x:0,y:-6*Math.cos(angle)+8*Math.sin(angle),z:-6*Math.sin(angle)-8*Math.cos(angle)};}
  const y=-6*Math.cos(curl)+8*Math.sin(curl),z=6*Math.sin(curl)+8*Math.cos(curl);
  return{x:0,y,z:isBackhoe(s)?-z:z};
}
export const bucketRotation=s=>isContactDig(s)?s.arm.curl-s.arm.boom-s.arm.stick:isBackhoe(s)?s.arm.curl:-s.arm.curl;
export function bucketPoint(s,p){const angle=bucketRotation(s),c=Math.cos(angle),n=Math.sin(angle);return{x:p.x,y:p.y*c-p.z*n,z:p.y*n+p.z*c};}
