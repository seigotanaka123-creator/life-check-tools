import{highRoomNodes}from'./imasora-construction-high-work-position.mjs?v=120gn';
import {assertRoomWalking,roomWalkPose,roomWalkStep,roomWalkEndAllowed} from './imasora-construction-room-walk.mjs?v=120gn';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const roomToolFloor=w=>!!w&&w.roomWalkVersion===1&&!w.job&&(!w.roomMotion||w.roomMotion.grounded)&&Number.isInteger(w.actor.y/40);

// Planning yields after each short, fully checked step. The caller can spread
// this work over frames and cancel it; these preview points are never a save.
export function* roomToolApproaches(w,extra=[]){
 assertRoomWalking(w);
 if(!roomToolFloor(w)||!roomWalkPose(w,w.actor,extra))return null;
 if(roomWalkEndAllowed(w))return{destination:{...w.actor},points:[]};
 const targets=highRoomNodes(w,w.actor.y).map(p=>({...p,heading:w.actor.heading})).filter(p=>distance(p,w.actor)<=64).sort((a,b)=>distance(a,w.actor)-distance(b,w.actor));
 for(const target of targets){
  yield null;if(!roomWalkPose(w,target,extra))continue;
  const ways=[[target],[{x:w.actor.x,z:target.z},target],[{x:target.x,z:w.actor.z},target]];
  for(const way of ways){
   yield null;
   let p={...w.actor},failed=false;const points=[];
   for(const q of way){
    for(let guard=0;distance(p,q)>1e-7;guard++){
     if(guard>=160){failed=true;break;}
     const d=distance(p,q),step=Math.min(1,d),dx=(q.x-p.x)/d*step,dz=(q.z-p.z)/d*step,next=roomWalkStep(w,p,dx,dz,Math.atan2(dx,dz),extra);
     if(Math.abs(next.y-w.actor.y)>1e-7||distance(next,p)<step-1e-7){failed=true;break;}
     p=next;points.push(p);yield null;
    }
    if(failed)break;
   }
   if(failed)continue;
   // Only round sub-microscopic arithmetic drift at a reached endpoint.
   p={...p,x:target.x,z:target.z};
   if(!roomWalkPose(w,p,extra)||!roomWalkEndAllowed({...w,actor:p}))continue;
   if(points.length)points[points.length-1]=p;
   return{destination:p,points};
  }
 }
 return null;
}
export function roomToolApproach(w,extra=[]){const g=roomToolApproaches(w,extra);for(;;){const n=g.next();if(n.done)return n.value;}}
