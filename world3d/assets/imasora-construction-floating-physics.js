// Stage 7-1: one independently hovering floor, load response, swept contacts.
// It is NOT a global anti-gravity zone, a kinematic Y animation, or joined bodies.
import {bounds,collides,placement} from './imasora-construction-crane.js';
import {polygonsOverlap,worldToLocal} from './imasora-construction-loader-physics.js';
import {CRANE_WALK,cranePersonBlocked,craneWalkingRouteClear} from './imasora-construction-crane-walk.js';
export const FLOATING=Object.freeze({capacity:4,sagPerLoad:.7,spring:15,damping:6,maxSpeed:24,personMass:1});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function floatingView(state){const s=structuredClone(state);for(const p of s.parts)if(p.hover&&p.id!==s.held)p.fixed=true;return s;}
export function restoreFloatingFlags(s){for(const p of s.parts)if(p.hover)p.fixed=false;return s;}
export function floatingPlacement(s){return placement(floatingView(s));}
export function releaseFloating(p){p.hover={height:p.y,contact:''};p.fixed=false;p.vy=0;}
function horizontalPerson(p,b){
  const q=worldToLocal({x:b.x,z:b.z,heading:b.angle},p.x,p.z);
  return Math.hypot(Math.max(0,Math.abs(q.x)-b.w/2),Math.max(0,Math.abs(q.z)-b.d/2))<CRANE_WALK.radius;
}
function bodyPerson(p,b){return p.y<b.y+b.h-1e-6&&p.y+CRANE_WALK.height>b.y+1e-6&&horizontalPerson(p,b);}
function ridersAndCargo(s,root){
  const members=[root],ids=new Set([root.id]);let more=true;
  while(more){more=false;for(const q of s.parts){
    if(ids.has(q.id)||q.id===s.held||q.hover||q.carrierId!==root.id||Math.abs(q.vy)>.1)continue;
    if(members.some(p=>q.y>=p.y+p.h-.03&&q.y<=p.y+p.h+.4&&polygonsOverlap(bounds(q),bounds(p)))){ids.add(q.id);members.push(q);more=true;}
  }}
  const actor=s.rig.player,rider=s.rig.mode==='foot'&&!s.rig.transition&&actor.grounded&&actor.vy<=0&&members.some(p=>Math.abs(actor.y-p.y-p.h)<.05&&horizontalPerson(actor,p));
  return{members,ids,rider};
}
function carrierUnder(s,p){return s.parts.find(q=>q.id!==p.id&&(q.hover||q.carrierId)&&p.y>=q.y+q.h-.03&&p.y<=q.y+q.h+.4&&polygonsOverlap(bounds(p),bounds(q)));}
export function bindPlacedCargo(s,p){const support=carrierUnder(s,p);p.carrierId=support?(support.hover?support.id:support.carrierId):null;}
function settleCarrierContact(s,p,support){
  // The ordinary falling solver has a small collision skin. Once it has landed,
  // keep loose cargo on the real top face, not slightly inside the moving floor.
  const y=support.y+support.h;
  if(p.vy<=0&&Math.abs(p.y-y)<.03&&!collides(s,{...p,y})){p.y=y;p.vy=0;}
}
export function bindLandedCargo(s,prior){
  for(const p of s.parts){
    if(p.hover||p.id===s.held){p.carrierId=null;continue;}
    if(p.carrierId){const support=carrierUnder(s,p);if(!support)p.carrierId=null;else settleCarrierContact(s,p,support);continue;}
    // A floor rising into an already fixed ceiling must never adopt that ceiling.
    if(p.fixed)continue;
    const support=carrierUnder(s,p),old=prior.parts.find(q=>q.id===p.id),oldSupport=prior.parts.find(q=>q.id===support?.id);
    if(support&&old&&oldSupport&&old.y>=oldSupport.y+oldSupport.h-.03&&old.vy<=0){bindPlacedCargo(s,p);settleCarrierContact(s,p,support);}
  }
}
function cargoMass(p){return p.w*p.h*p.d/(p.materialId==='earth-iron'?3200:8000);}
export function floatReadout(s,id='mars-deck'){
  const p=s.parts.find(p=>p.id===id);
  if(!p?.hover)return{active:false,load:0,capacity:FLOATING.capacity,rider:false,overload:false,memberIds:[],height:p?.y??0,target:0,contact:''};
  const {members,rider}=ridersAndCargo(s,p),load=members.slice(1).reduce((n,q)=>n+cargoMass(q),rider?FLOATING.personMass:0);
  return{active:true,load,capacity:FLOATING.capacity,rider,overload:load>FLOATING.capacity,memberIds:members.map(p=>p.id),height:p.y,target:p.hover.height,contact:p.hover.contact};
}
// Translate the actual colliders and their supported rider together. Sample each
// axis every .2 units so neither a thin ceiling nor a rider's head is skipped.
function shift(s,root,group,axis,distance){
  if(!distance)return true;
  const n=Math.max(1,Math.ceil(Math.abs(distance)/.2)),amount=distance/n;
  for(let i=0;i<n;i++){
    const moving=group.members.map(p=>({...p,[axis]:p[axis]+amount}));
    const obstacles={...s,parts:s.parts.filter(p=>!group.ids.has(p.id))};
    let hit='';for(const p of moving){
      hit=collides(obstacles,p)||obstacles.parts.find(q=>p.y<q.y+q.h-1e-6&&p.y+p.h>q.y+1e-6&&polygonsOverlap(bounds(p),bounds(q)))?.name||'';
      if(hit)break;
    }
    const candidate={...s,parts:s.parts.map(p=>moving.find(q=>q.id===p.id)||p)};
    if(!hit&&group.rider){
      const actor={...s.rig.player,[axis]:s.rig.player[axis]+amount};
      if(cranePersonBlocked(candidate,actor))hit='レンの頭上や移動経路';
    }else if(!hit&&s.rig.mode==='foot'&&moving.some(p=>bodyPerson(s.rig.player,p)))hit='レン';
    if(!hit&&s.rig.transition&&!craneWalkingRouteClear(candidate,s.rig.transition.path))hit='乗降経路';
    if(hit){root.hover.contact=hit;return false;}
    for(const p of group.members)p[axis]+=amount;
    if(group.rider)s.rig.player[axis]+=amount;
  }
  return true;
}
export function stepFloating(s,dt){
  const before=JSON.stringify([s.parts,s.rig.player]);
  for(const p of s.parts){
    if(!p.hover||p.id===s.held)continue;
    const group=ridersAndCargo(s,p),info=floatReadout(s,p.id),h=p.hover;
    const desired=h.height-info.load*FLOATING.sagPerLoad;
    let acceleration=info.overload?-Math.min(22,4+(info.load-info.capacity)*4)-p.vy*2.5:(desired-p.y)*FLOATING.spring-p.vy*FLOATING.damping;
    p.vy=clamp(p.vy+acceleration*dt,-FLOATING.maxSpeed,FLOATING.maxSpeed);
    p.vx*=Math.exp(-2*dt);p.vz*=Math.exp(-2*dt);h.contact='';
    for(const [axis,velocity]of[['x','vx'],['z','vz'],['y','vy']]){
      if(Math.abs(p[velocity])<1e-8)p[velocity]=0;
      if(!shift(s,p,group,axis,p[velocity]*dt))p[velocity]=0;
    }
    // Snap only a negligible settled velocity/error, never to a distant anchor.
    if(!info.overload&&Math.abs(desired-p.y)<1e-6&&Math.abs(p.vy)<1e-5)p.vy=0;
  }
  if(JSON.stringify([s.parts,s.rig.player])!==before)s.revision++;
}
