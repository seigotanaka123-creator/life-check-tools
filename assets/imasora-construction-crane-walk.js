// Stage 4-2: the same oriented parts are floors, walls and ceilings.
// Independent of the approved loader/terrain physics and their saves.
import {WALKER,SITE,worldToLocal,localToWorld} from './imasora-construction-loader-physics.js';
import {craneOutriggerVolumes} from './imasora-construction-crane-outriggers.js';
export const CRANE_WALK=Object.freeze({...WALKER,step:8.01,gravity:90,jump:44});
const EPS=1e-6;
export function cranePlayer(p){return{vy:0,grounded:p.y===0,ceilingHit:false,jumpHeld:false,...p};}
export function craneWalkVolumes(s,{partsOnly=false}={}){
  const out=s.parts.map(p=>({id:p.id,name:p.name,x:p.x,y:p.y,z:p.z,w:p.w,h:p.h,d:p.d,angle:p.angle,
    step:p.id!==s.held&&(p.fixed||p.y<.05&&Math.abs(p.vy)<.1)}));
  if(partsOnly)return out;
  const v=s.rig.vehicle;
  out.push({id:'vehicle',name:'車体',...v,y:0,w:68,h:44,d:86,angle:v.heading,step:false});
  for(const side of[-1,1])out.push({id:'vehicle-step',name:'乗降ステップ',...localToWorld(v,side*35,-8),y:0,w:10,h:9.12,d:28,angle:v.heading,step:false});
  out.push(...craneOutriggerVolumes(s));
  return out;
}
function horizontalOverlap(p,b,r=CRANE_WALK.radius){
  const q=worldToLocal({x:b.x,z:b.z,heading:b.angle||0},p.x,p.z);
  const x=Math.max(0,Math.abs(q.x)-b.w/2),z=Math.max(0,Math.abs(q.z)-b.d/2);
  return x*x+z*z<r*r-EPS;
}
function bodyOverlap(p,b){return p.y<b.y+b.h-EPS&&p.y+CRANE_WALK.height>b.y+EPS&&horizontalOverlap(p,b);}
const inside=p=>p.x-CRANE_WALK.radius>=SITE.minX&&p.x+CRANE_WALK.radius<=SITE.maxX&&p.z-CRANE_WALK.radius>=SITE.minZ&&p.z+CRANE_WALK.radius<=SITE.maxZ;
export function cranePersonBlocked(s,p){return !inside(p)||p.y<-EPS||craneWalkVolumes(s).some(b=>bodyOverlap(p,b));}
function verticalTravel(p,dy,boxes){
  let allowed=dy,hit='';
  if(dy<0&&p.y+dy<0){allowed=-p.y;hit='地面';}
  for(const b of boxes){
    if(!horizontalOverlap(p,b))continue;
    if(dy<0&&p.y>=b.y+b.h-EPS){const gap=Math.min(0,b.y+b.h-p.y);if(gap>allowed){allowed=gap;hit=b.name;}}
    if(dy>0&&p.y+CRANE_WALK.height<=b.y+EPS){const gap=Math.max(0,b.y-p.y-CRANE_WALK.height);if(gap<allowed){allowed=gap;hit=b.name;}}
  }
  return{distance:allowed,hit};
}
function grounded(p,boxes){return verticalTravel(p,-.002,boxes).distance>-.002+EPS;}
function horizontalMove(p,axis,distance,boxes){
  if(!distance)return'';
  const q={...p,[axis]:p[axis]+distance};if(!inside(q))return'外周の柵';
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
export function stepCraneWalker(s,rig,input,dt){
  if(!Number.isFinite(dt)||dt<=0||dt>.05)throw new Error('歩行の更新刻みが不正です。');
  const p=cranePlayer(rig.player),boxes=craneWalkVolumes(s);
  p.grounded=grounded(p,boxes)&&p.vy<=0;
  if(input.jump&&!p.jumpHeld&&p.grounded){p.vy=CRANE_WALK.jump;p.grounded=false;}
  p.jumpHeld=!!input.jump;
  const n=Math.max(1,Math.hypot(input.x||0,input.z||0)),dx=(input.x||0)/n*CRANE_WALK.speed*dt,dz=(input.z||0)/n*CRANE_WALK.speed*dt;
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.3));let hit='';
  for(let i=0;i<steps;i++){
    hit=horizontalMove(p,'x',dx/steps,boxes)||hit;
    hit=horizontalMove(p,'z',dz/steps,boxes)||hit;
    p.grounded=grounded(p,boxes)&&p.vy<=0;
  }
  p.vy-=CRANE_WALK.gravity*dt;
  const wanted=p.vy*dt,moved=verticalTravel(p,wanted,boxes);p.y+=moved.distance;
  p.grounded=wanted<0&&moved.distance>wanted+EPS;
  p.ceilingHit=wanted>0&&moved.distance<wanted-EPS;
  if(p.grounded||p.ceilingHit)p.vy=0;
  if(p.ceilingHit)hit=`${moved.hit}（頭上）`;
  if(Math.hypot(dx,dz)>EPS)p.heading=Math.atan2(dx,dz);
  return{...rig,player:p,hit};
}
// Boarding retains the existing visible stepping animation but also checks its
// full head/body corridor in 3D. Do not board from a roof or mid-jump.
export function craneWalkingRouteClear(s,path){
  const boxes=craneWalkVolumes(s,{partsOnly:true});
  for(let i=0;i<path.length-1;i++){
    const a=path[i],b=path[i+1],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)/.4));
    for(let j=0;j<=n;j++){const t=j/n,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};if(boxes.some(b=>bodyOverlap(p,b)))return false;}
  }
  return true;
}
