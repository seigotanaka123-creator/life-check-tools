import {highWorkSolids} from './imasora-construction-high-work-position.mjs?v=120fr';
import {highLocalPoint,highWorldPoint} from './imasora-construction-high-world.mjs?v=120fw';
import {upperSegmentHitsBox} from './imasora-construction-high-casting.mjs?v=120fw';
import {upperPaintPatch,upperPaintPlan} from './imasora-construction-concrete/high-paint.mjs?v=120fn';
// A jointed extension pole travels above the worker, below the next ceiling,
// then lowers OUTSIDE the selected face. It never shortcuts through concrete.
export function upperPaintToolPaths(record,c,a,worldHand=null,extraSolids=[]){
 upperPaintPlan(c,a);const floor=c.anchor.floor*40,anchor=highLocalPoint(record.site,c.anchor),actor=record.work.actor,heading=actor.heading??0;
 const right=worldHand?highLocalPoint(record.site,worldHand):{x:actor.x+Math.cos(heading)*7.02+Math.sin(heading)*8.67,y:floor+10.51,z:actor.z-Math.sin(heading)*7.02+Math.cos(heading)*8.67};
 const out={x:right.x+Math.sin(heading)*8,y:right.y,z:right.z+Math.cos(heading)*8},lift={...out,y:floor+30};
 const solids=[...highWorkSolids(record.work),...extraSolids],hit=(x,y)=>solids.some(b=>upperSegmentHitsBox(x,y,b,.35)),nodes=[];
 for(let z=-60;z<=60;z+=4)for(let x=4;x<=60;x+=4)nodes.push({x,y:floor+30,z});
 const prefix=[right,out,lift];if(hit(right,out)||hit(out,lift))throw Error('道具の前に柱や材料があるよ。先に動かそう。');
 const key=p=>p.x+','+p.z,by=new Map(nodes.map(n=>[key(n),n])),starts=nodes.filter(n=>Math.hypot(n.x-lift.x,n.z-lift.z)<6&&!hit(lift,n)),paths=new Map();
 for(const cell of a.tiles){const patch=upperPaintPatch(c,cell,a.face,5),n=patch.normal,faceCenter={x:anchor.x+patch.center.x-patch.right.x*patch.width/2,y:floor+patch.center.y,z:anchor.z+patch.center.z-patch.right.z*patch.width/2},outside={x:faceCenter.x+n.x*2,y:faceCenter.y+n.y*2,z:faceCenter.z+n.z*2},top={...outside,y:floor+30};
  const prev=new Map(starts.map(n=>[key(n),null])),queue=[...starts];let found=null;
  for(const p of queue){if(Math.hypot(p.x-top.x,p.z-top.z)<6&&!hit(p,top)){found=key(p);break;}for(const [dx,dz]of[[4,0],[-4,0],[0,4],[0,-4]]){const q=by.get((p.x+dx)+','+(p.z+dz));if(!q||prev.has(key(q))||hit(p,q))continue;prev.set(key(q),key(p));queue.push(q);}}
  if(!found||hit(top,outside)||hit(outside,faceCenter))throw Error('その面には道具が届かないよ。別の面をえらぼう。');
  for(const pixel of a.pixels){const patch=upperPaintPatch(c,cell,a.face,pixel),p={x:anchor.x+patch.center.x,y:floor+patch.center.y,z:anchor.z+patch.center.z},o={x:p.x+patch.normal.x*2,y:p.y+patch.normal.y*2,z:p.z+patch.normal.z*2},t={...o,y:floor+30};if(hit(top,t)||hit(t,o)||hit(o,p))throw Error('ぬる場所の前に柱や材料があるよ。別の面をえらぼう。');}
  const route=[];for(let k=found;k!==null;k=prev.get(k))route.unshift(by.get(k));paths.set(cell,[...prefix,...route,top,outside,faceCenter].map(p=>highWorldPoint(record.site,p)));
 }
 return paths;
}
