// Stage 7-2: connected horizontal floors, one load/velocity per component.
import {bounds,collides,placement} from './imasora-construction-crane.js';
import {polygonsOverlap,worldToLocal} from './imasora-construction-loader-physics.js';
import {CRANE_WALK,cranePersonBlocked,craneWalkingRouteClear} from './imasora-construction-crane-walk.js';
export {releaseFloating} from './imasora-construction-floating-physics.js';
export const FLOATING=Object.freeze({capacity:4,sagPerLoad:.7,spring:15,damping:6,maxSpeed:24,personMass:1});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function component(s,id){
  const ids=new Set([id]);let changed=true;
  while(changed){changed=false;for(const j of s.joints)if(ids.has(j.a)!==ids.has(j.b)){ids.add(j.a);ids.add(j.b);changed=true;}}
  return s.parts.filter(p=>ids.has(p.id)&&p.hover).sort((a,b)=>a.id.localeCompare(b.id));
}
export function floatingView(s){const next=structuredClone(s);for(const p of next.parts)if(p.hover&&p.id!==next.held)p.fixed=true;return next;}
export function restoreFloatingFlags(s){for(const p of s.parts)if(p.hover)p.fixed=false;return s;}
export function floatingPlacement(s){
  const o=placement(floatingView(s));if(!o?.ok)return o;
  const roots=new Set(o.support.ids.map(id=>component(s,id)[0]?.id).filter(Boolean));
  if(roots.size>1)return{...o,ok:false,reason:'別々に浮いている床です。先に床同士を接合してください。'};
  if(o.candidate.materialId==='mars-timber'&&roots.size)return{...o,ok:false,reason:'火星木材の床は上に重ねず、横へ近づけて接合してください。'};
  return o;
}
function horizontalPerson(p,b){const q=worldToLocal({x:b.x,z:b.z,heading:b.angle},p.x,p.z);return Math.hypot(Math.max(0,Math.abs(q.x)-b.w/2),Math.max(0,Math.abs(q.z)-b.d/2))<CRANE_WALK.radius;}
function bodyPerson(p,b){return p.y<b.y+b.h-1e-6&&p.y+CRANE_WALK.height>b.y+1e-6&&horizontalPerson(p,b);}
function supported(s,floors){
  const members=[...floors],ids=new Set(floors.map(p=>p.id));let changed=true;
  while(changed){changed=false;for(const p of s.parts){
    if(ids.has(p.id)||p.hover||p.id===s.held||!ids.has(p.carrierId)||Math.abs(p.vy)>.1)continue;
    if(members.some(q=>p.y>=q.y+q.h-.03&&p.y<=q.y+q.h+.04&&polygonsOverlap(bounds(p),bounds(q)))){ids.add(p.id);members.push(p);changed=true;}
  }}
  const a=s.rig.player,rider=s.rig.mode==='foot'&&!s.rig.transition&&a.grounded&&a.vy<=0&&members.some(p=>Math.abs(a.y-p.y-p.h)<.05&&horizontalPerson(a,p));
  return{members,ids,rider};
}
const mass=p=>p.w*p.h*p.d/(p.materialId==='earth-iron'?3200:8000);
export function floatReadout(s,id='mars-deck'){
  let floors=component(s,id);if(!floors.length&&id==='mars-deck'){const first=s.parts.find(p=>p.hover);if(first)floors=component(s,first.id);}
  if(!floors.length)return{active:false,count:0,load:0,capacity:0,rider:false,overload:false,memberIds:[],height:0,target:0,contact:''};
  const group=supported(s,floors),load=group.members.filter(p=>!p.hover).reduce((v,p)=>v+mass(p),group.rider?1:0),capacity=floors.length*FLOATING.capacity;
  return{active:true,count:floors.length,load,capacity,rider:group.rider,overload:load>capacity,memberIds:group.members.map(p=>p.id),height:floors[0].y,target:floors.reduce((v,p)=>v+p.hover.height,0)/floors.length,contact:floors[0].hover.contact};
}
function carrierUnder(s,p){return s.parts.find(q=>q.id!==p.id&&(q.hover||q.carrierId)&&p.y>=q.y+q.h-.03&&p.y<=q.y+q.h+.04&&polygonsOverlap(bounds(p),bounds(q)));}
function settleContact(s,p,q){const y=q.y+q.h;if(p.vy<=0&&Math.abs(p.y-y)<.03&&!collides(s,{...p,y})){p.y=y;p.vy=0;}}
export function bindPlacedCargo(s,p){const q=carrierUnder(s,p);p.carrierId=q?.id??null;}
export function bindLandedCargo(s,prior){
  for(const p of s.parts){
    if(p.hover||p.id===s.held){p.carrierId=null;continue;}
    if(p.carrierId){const q=carrierUnder(s,p);if(!q)p.carrierId=null;else{p.carrierId=q.id;settleContact(s,p,q);}continue;}
    if(p.fixed||p.materialId==='mars-timber')continue;
    const q=carrierUnder(s,p),old=prior.parts.find(t=>t.id===p.id),oldQ=prior.parts.find(t=>t.id===q?.id);
    if(q&&old&&oldQ&&old.y>=oldQ.y+oldQ.h-.03&&old.vy<=0){bindPlacedCargo(s,p);settleContact(s,p,q);}
  }
}
export function movingHit(s,p){
  return collides(s,p)||s.parts.find(q=>q.id!==p.id&&p.y<q.y+q.h-1e-6&&p.y+p.h>q.y+1e-6&&polygonsOverlap(bounds(p),bounds(q)))?.name||'';
}
function shift(s,group,axis,distance){
  if(!distance)return'';const n=Math.max(1,Math.ceil(Math.abs(distance)/.2)),d=distance/n;
  for(let i=0;i<n;i++){
    const moving=group.members.map(p=>({...p,[axis]:p[axis]+d})),obstacles={...s,parts:s.parts.filter(p=>!group.ids.has(p.id))};
    let hit=moving.map(p=>movingHit(obstacles,p)).find(Boolean)||'';
    const next={...s,parts:s.parts.map(p=>moving.find(q=>q.id===p.id)||p)};
    if(!hit&&group.rider&&cranePersonBlocked(next,{...s.rig.player,[axis]:s.rig.player[axis]+d}))hit='レンの頭上や移動経路';
    if(!hit&&!group.rider&&s.rig.mode==='foot'&&moving.some(p=>bodyPerson(s.rig.player,p)))hit='レン';
    if(!hit&&s.rig.transition&&!craneWalkingRouteClear(next,s.rig.transition.path))hit='乗降経路';
    if(hit)return hit;
    for(const p of group.members)p[axis]+=d;
    if(group.rider)s.rig.player[axis]+=d;
  }
  return'';
}
export function stepFloating(s,dt){
  const before=JSON.stringify([s.parts,s.rig.player]),seen=new Set();
  for(const p of s.parts){
    if(!p.hover||seen.has(p.id))continue;
    const floors=component(s,p.id);floors.forEach(q=>seen.add(q.id));
    if(s.joining&&floors.some(q=>q.id===s.joining.targetId))continue; // Visible joining clamp holds this component.
    const group=supported(s,floors),info=floatReadout(s,p.id),count=floors.length;
    const velocity={vx:0,vy:0,vz:0};for(const q of floors)for(const key of Object.keys(velocity))velocity[key]+=q[key]/count;
    // More float panels share the same applied load; seams never move separately.
    const desired=info.target-info.load*FLOATING.sagPerLoad/count;
    const a=info.overload?-Math.min(22,4+(info.load-info.capacity)*4)-velocity.vy*2.5:(desired-info.height)*FLOATING.spring-velocity.vy*FLOATING.damping;
    velocity.vy=clamp(velocity.vy+a*dt,-24,24);velocity.vx*=Math.exp(-2*dt);velocity.vz*=Math.exp(-2*dt);
    let contact='';
    for(const [axis,key]of[['x','vx'],['z','vz'],['y','vy']]){
      if(Math.abs(velocity[key])<1e-8)velocity[key]=0;
      const hit=shift(s,group,axis,velocity[key]*dt);if(hit){velocity[key]=0;contact=hit;}
    }
    if(!info.overload&&Math.abs(desired-floors[0].y)<1e-6&&Math.abs(velocity.vy)<1e-5)velocity.vy=0;
    for(const q of floors){Object.assign(q,velocity);q.hover.contact=contact;}
  }
  if(JSON.stringify([s.parts,s.rig.player])!==before)s.revision++;
}
