import {cranePoint,craneChassisFrame,craneGroundHeight} from './imasora-construction-crane-ground.mjs?v=120ey';
import {SKY_WALK_SPEED,SKY_JUMP_VELOCITY,SKY_JUMP_GRAVITY,beginThreeJump,landThreeJump} from './imasora-construction-locomotion.mjs?v=120eg';
import {inWorkArea,sharedSupply,assertVehicleField,workArea} from './imasora-construction-field-area.mjs?v=120ey';
import {walkFactor} from './imasora-construction-travel-input.mjs';
// Stage 4-2: the same oriented parts are floors, walls and ceilings.
// Independent of the approved loader/terrain physics and their saves.
import {WALKER,SITE,worldToLocal,localToWorld} from './imasora-construction-loader-physics.js?v=120ey';
import {craneOutriggerVolumes} from './imasora-construction-crane-outriggers.js?v=120fw';
export const CRANE_WALK=Object.freeze({...WALKER,step:8.01,gravity:SKY_JUMP_GRAVITY,jump:SKY_JUMP_VELOCITY});
const EPS=1e-6;
export function cranePlayer(p){return{vy:0,grounded:p.y===0,ceilingHit:false,jumpHeld:false,...p};}
export function craneWalkVolumes(s,{partsOnly=false}={}){
  const out=s.parts.map(p=>({id:p.id,name:p.name,x:p.x,y:p.y,z:p.z,w:p.w,h:p.h,d:p.d,angle:p.angle,
    step:p.id!==s.held&&(p.fixed||p.y<.05&&Math.abs(p.vy)<.1)}));
  if(partsOnly)return out;
  const v=s.rig.vehicle;
  const base=craneChassisFrame(s)?.position[1]??0;out.push({id:'vehicle',name:'車体',...v,y:base,w:68,h:44,d:86,angle:v.heading,step:false});
  for(const side of[-1,1])out.push({id:'vehicle-step',name:'乗降ステップ',...cranePoint(s,side*35,0,-8),w:10,h:9.12,d:28,angle:v.heading,step:false});
  out.push(...craneOutriggerVolumes(s));
  return out;
}
function horizontalOverlap(p,b,r=CRANE_WALK.radius){
  const q=worldToLocal({x:b.x,z:b.z,heading:b.angle||0},p.x,p.z);
  const x=Math.max(0,Math.abs(q.x)-b.w/2),z=Math.max(0,Math.abs(q.z)-b.d/2);
  return x*x+z*z<r*r-EPS;
}
function bodyOverlap(p,b){return p.y<b.y+b.h-EPS&&p.y+CRANE_WALK.height>b.y+EPS&&horizontalOverlap(p,b);}
const inside=(p,v)=>inWorkArea(p,v,CRANE_WALK.radius);
export function cranePersonBlocked(s,p){return !inside(p,s.rig.vehicle)||p.y<-EPS||craneWalkVolumes(s).some(b=>bodyOverlap(p,b));}
function verticalTravel(p,dy,boxes,ground=0){
  let allowed=dy,hit='';
  if(dy<0&&p.y+dy<ground){allowed=ground-p.y;hit='地面';}
  for(const b of boxes){
    if(!horizontalOverlap(p,b))continue;
    if(dy<0&&p.y>=b.y+b.h-EPS){const gap=Math.min(0,b.y+b.h-p.y);if(gap>allowed){allowed=gap;hit=b.name;}}
    if(dy>0&&p.y+CRANE_WALK.height<=b.y+EPS){const gap=Math.max(0,b.y-p.y-CRANE_WALK.height);if(gap<allowed){allowed=gap;hit=b.name;}}
  }
  return{distance:allowed,hit};
}
function grounded(p,boxes,ground=0){return verticalTravel(p,-.002,boxes,ground).distance>-.002+EPS;}
function horizontalMove(p,axis,distance,boxes,v){
  if(!distance)return'';
  const q={...p,[axis]:p[axis]+distance};if(!inside(q,v))return'外周の柵';
  const blockers=boxes.filter(b=>bodyOverlap(q,b));
  if(!blockers.length){p[axis]=q[axis];return'';}
  if(p.grounded&&p.vy<=0&&blockers.every(b=>b.step)){
    const rise=Math.max(...blockers.map(b=>b.y+b.h-p.y));
    if(rise>EPS&&rise<=CRANE_WALK.step&&verticalTravel(p,rise,boxes).distance>=rise-EPS){
      const lifted={...q,y:p.y+rise};
      if(!boxes.some(b=>bodyOverlap(lifted,b))&&grounded(lifted,boxes)){p[axis]=q[axis];p.y=lifted.y;return'';}
    }
  }
  return blockers[0].name;
}
export function stepCraneWalker(s,rig,input,dt,external=[]){
  if(!Number.isFinite(dt)||dt<=0||dt>.05)throw new Error('歩行の更新刻みが不正です。');
  const p=cranePlayer(rig.player),reader=rig.vehicle.field&&typeof external.groundHeightAt==='function'?external.groundHeightAt:()=>0,base=reader(p.x,p.z);if(!Number.isFinite(base))return{...rig,hit:'地面'};p.y+=base;const boxes=[...craneWalkVolumes(s),...external.map(o=>({id:o.id,name:o.id||'建物',x:o.x,z:o.z,y:o.minY??0,w:o.width,d:o.depth,h:o.height-(o.minY??0),angle:o.angle??0,step:false}))];
  p.grounded=grounded(p,boxes,reader(p.x,p.z))&&p.vy<=0;
  landThreeJump(p);if(input.jump&&!p.jumpHeld)beginThreeJump(p,CRANE_WALK.jump);
  p.jumpHeld=!!input.jump;
  const n=Math.max(1,Math.hypot(input.x||0,input.z||0)),dx=(input.x||0)/n*CRANE_WALK.speed*walkFactor(input)*dt,dz=(input.z||0)/n*CRANE_WALK.speed*walkFactor(input)*dt;
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.3));let hit='';
  for(let i=0;i<steps;i++){
    for(const [axis,d]of[['x',dx/steps],['z',dz/steps]]){const h=reader(p.x,p.z),q={...p,[axis]:p[axis]+d},next=reader(q.x,q.z),oldY=p.y;if(!Number.isFinite(next)||Math.abs(next-h)>3.1){hit='地面の段差';continue;}if(p.grounded&&Math.abs(p.y-h)<.05)p.y+=next-h;const blocked=horizontalMove(p,axis,d,boxes,rig.vehicle);if(blocked){p.y=oldY;hit=blocked;}}
    p.grounded=grounded(p,boxes,reader(p.x,p.z))&&p.vy<=0;
  }
  p.vy-=CRANE_WALK.gravity*dt;
  const wanted=p.vy*dt,moved=verticalTravel(p,wanted,boxes,reader(p.x,p.z));p.y+=moved.distance;
  p.grounded=wanted<0&&moved.distance>wanted+EPS;
  p.ceilingHit=wanted>0&&moved.distance<wanted-EPS;
  if(p.grounded||p.ceilingHit)p.vy=0;landThreeJump(p);
  if(p.ceilingHit)hit=`${moved.hit}（頭上）`;
  if(Math.hypot(dx,dz)>EPS)p.heading=Math.atan2(dx,dz);
  p.y-=reader(p.x,p.z);if(Math.abs(p.y)<1e-8)p.y=0;return{...rig,player:p,hit};
}
// Boarding retains the existing visible stepping animation but also checks its
// full head/body corridor in 3D. Do not board from a roof or mid-jump.
export function craneWalkingRouteClear(s,path){
  const boxes=craneWalkVolumes(s,{partsOnly:true});
  for(let i=0;i<path.length-1;i++){
    const a=path[i],b=path[i+1],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)/.4));
    for(let j=0;j<=n;j++){const t=j/n,raw={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t},local=worldToLocal(s.rig.vehicle,raw.x,raw.z),p=s.groundPose?cranePoint(s,local.x,raw.y,local.z):raw;if(boxes.some(b=>bodyOverlap(p,b)))return false;}
  }
  return true;
}
