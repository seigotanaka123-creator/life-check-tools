import{stairPlacement,stairPoint,stairEntry,stairExit,stairGround,stairDoor,stairApproach,stairRoomBound}from'./imasora-construction-stair-placement.mjs?v=120gn';
import {roomGraphRoute} from './imasora-construction-building-room.mjs?v=120gn';
import {highFloors} from './imasora-construction-high-shape.mjs?v=120gn';
import {roomWalkGeometry,roomSurfaceAt as at,roomSupport as support,roomBodyClear} from './imasora-construction-room-contact.mjs?v=120gn';
import {assertRoomMotion} from './imasora-construction-room-motion.mjs?v=120gn';
export {roomWalkGeometry,roomWalkHullHit} from './imasora-construction-room-contact.mjs?v=120gn';
const ok=(v,m)=>{if(!v)throw Error(m);};
export const ROOM_WALK_LIMIT=256;
export function roomWalkPose(w,p,extra=[],geometry=roomWalkGeometry(w)){
 if(!p||Object.keys(p).sort().join('|')!=='heading|x|y|z'||!Object.values(p).every(Number.isFinite)||!stairRoomBound(w,p)||p.y<0||p.y>w.levels*40||Math.abs(p.heading)>Math.PI*8)return false;
 const y=support(geometry,p,p.y);if(y===undefined||Math.abs(y-p.y)>.0001)return false;
 const c=Math.cos(p.heading),s=Math.sin(p.heading);
 // Each curved foot has its own supported contact patch, rather than an empty rectangle between feet.
 for(const foot of[-5.4936,5.4936])for(const dx of[-1.5,1.5])for(const z of[.55,3.55]){const x=foot+dx;if(at(geometry,p.x+c*x+s*z,p.z-s*x+c*z,p.y)===undefined)return false;}
 return roomBodyClear(w,p,extra,geometry,2.5);
}
function turn(w,p,h,extra,g){const d=Math.atan2(Math.sin(h-p.heading),Math.cos(h-p.heading));if(Math.abs(d)<1e-8)return true;for(let i=0;i<=12;i++)if(!roomWalkPose(w,{...p,heading:p.heading+d*i/12},extra,g))return false;return true;}
export function roomWalkStep(w,from,dx,dz,heading,extra=[]){
 const g=roomWalkGeometry(w),n=Math.max(1,Math.ceil(Math.hypot(dx,dz)*2));let p={...from};if(turn(w,p,heading,extra,g))p.heading=heading;
 for(let i=0;i<n;i++){const q={...p,x:p.x+dx/n,z:p.z+dz/n},y=support(g,q,p.y);if(y===undefined)break;q.y=y;if(!roomWalkPose(w,q,extra,g))break;p=q;}return p;
}
const eligible=w=>!!w&&w.version===5&&w.levels===highFloors(w)&&!w.kit&&!w.job;
export function beginRoomWalk(w){ok(eligible(w)&&!w.roomWalkVersion,'建物の作業が終わってから歩こう。');ok(roomWalkPose(w,w.actor),'入口か広い床から歩きはじめよう。');const n={...w,actor:{...w.actor},roomWalkVersion:1,accessVersion:1,revision:w.revision+1};for(const k of['station','paintStation','interiorPaintStation','interiorLayoutStation'])delete n[k];return n;}
export function assertRoomWalking(w){ok(eligible(w)&&w.roomWalkVersion===1&&!w.station&&!w.paintStation&&!w.interiorPaintStation&&!w.interiorLayoutStation&&(Object.hasOwn(w,'roomMotion')?assertRoomMotion(w):roomWalkPose(w,w.actor)),'歩いている場所をたしかめよう。');return true;}
export function roomWalkEndAllowed(w){if(!eligible(w)||w.roomWalkVersion!==1||w.roomMotion&&!w.roomMotion.grounded||Math.abs(w.actor.y/40-Math.round(w.actor.y/40))>1e-8)return false;if(w.actor.y===0&&(stairPlacement(w)?Math.hypot(w.actor.x-stairGround(w).x,w.actor.z-stairGround(w).z)<44:w.actor.z>=76))return true;return !!roomGraphRoute(w,w.actor,stairEntry(w,w.actor.y));}
export function endRoomWalk(w){assertRoomWalking(w);ok(roomWalkEndAllowed(w),'階段をのぼりきって、広い床で道具をひらこう。');const n={...w,actor:{...w.actor,y:Math.round(w.actor.y/40)*40},revision:w.revision+1};delete n.roomWalkVersion;delete n.roomMotion;if(w.actor.y>0||(stairPlacement(w)?Math.abs(w.actor.x)<68&&Math.abs(w.actor.z)<68:w.actor.z<76))n.interiorLayoutStation=true;return n;}
const checkedPaths=new Map();
export function walkRoomPath(w,path,extra=[]){
 assertRoomWalking(w);ok(!w.roomMotion||w.roomMotion.grounded,'着地してから歩こう。');ok(roomWalkPose(w,w.actor,extra),'足元と通り道をあけよう。');ok(Array.isArray(path)&&path.length>0&&path.length<=ROOM_WALK_LIMIT,'歩いた道をたしかめよう。');
 for(const q of path)ok(q&&Object.keys(q).sort().join('|')==='heading|x|y|z'&&Object.values(q).every(Number.isFinite)&&Math.abs(q.heading)<=Math.PI*8,'歩いた場所をたしかめよう。');
 // Cache values, never mutable caller identity. Moving any obstacle changes this key.
 const core=JSON.stringify([w.version,w.levels,w.blueprint,w.boardBayRetrofit,w.roomLayout,w.entranceDoor,w.actor,path]),key=core+'|'+JSON.stringify(extra),known=checkedPaths.get(key);if(known)return{...w,actor:{...known},revision:w.revision+1};let p=w.actor;
 for(const q of path){ok(q&&Object.keys(q).sort().join('|')==='heading|x|y|z'&&Object.values(q).every(Number.isFinite)&&Math.abs(q.heading)<=Math.PI*8,'歩いた場所をたしかめよう。');const d=Math.hypot(q.x-p.x,q.z-p.z);ok(d<=20.00001,'少しずつ歩こう。');const next=roomWalkStep(w,p,q.x-p.x,q.z-p.z,q.heading,extra);ok(Math.hypot(next.x-q.x,next.y-q.y,next.z-q.z)<1e-6&&Math.abs(Math.atan2(Math.sin(next.heading-q.heading),Math.cos(next.heading-q.heading)))<1e-7,'床や通り道をたしかめよう。');p={...q};}
 ok(roomWalkPose(w,p,extra),'立ち止まる床をたしかめよう。');if(checkedPaths.size>=64)checkedPaths.clear();const endpoint=Object.freeze({...p});checkedPaths.set(key,endpoint);
 // Extra solids only restrict a validated path; the same exact path is also valid without them.
 if(extra.length)checkedPaths.set(core+'|[]',endpoint);
 return {...w,actor:{...p},revision:w.revision+1};
}
