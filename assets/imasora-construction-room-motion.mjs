import{stairPlacement,stairRoomBound}from'./imasora-construction-stair-placement.mjs?v=120gn';
import {roomWalkGeometry,roomSupport,roomBodyClear} from './imasora-construction-room-contact.mjs?v=120gn';
import {SKY_MAX_JUMPS,SKY_JUMP_VELOCITY as JUMP,SKY_JUMP_GRAVITY as NEW_G,releasedJumpVelocity} from './imasora-construction-locomotion.mjs?v=120gf';

export const ROOM_MOTION_LIMIT=256;
export const ROOM_JUMP_RISE=SKY_MAX_JUMPS*JUMP*JUMP/(2*NEW_G)+.02;
const OLD_JUMP=44*Math.sqrt(2),OLD_G=118;
const ok=(v,m)=>{if(!v)throw Error(m);},epsilon=1e-7;
const initial=()=>({version:1,vy:0,jumps:0,grounded:true,held:false,support:'building'});
const flat=(b,x,z)=>{const a=b.angle??0,c=Math.cos(a),s=Math.sin(a),dx=x-b.x,dz=z-b.z;return Math.abs(c*dx-s*dz)<=b.w/2+.0001&&Math.abs(s*dx+c*dz)<=b.d/2+.0001;};
function surfaces(g,extra){return extra.length?{...g,surfaces:[...g.surfaces,...extra.map(b=>({...b,y:b.y+b.h/2}))]}:g;}
function inside(p,w){const c=Math.cos(p.heading),s=Math.sin(p.heading);for(const f of[-5.4936,5.4936])for(const dx of[-1.5,1.5])for(const z of[.55,3.55]){const x=p.x+c*(f+dx)+s*z,y=p.z-s*(f+dx)+c*z;if(!stairRoomBound(w,{x,z:y}))return false;}return true;}
function height(g,p,near,range=2.5001,partial=false){
 const c=Math.cos(p.heading),s=Math.sin(p.heading),ys=[];
 for(const b of g.surfaces){if(Math.abs(b.y-near)>range||Math.abs(b.x-p.x)>b.w/2+b.d/2+12||Math.abs(b.z-p.z)>b.w/2+b.d/2+12)continue;ys.push(b.y);}
 for(const y of ys.sort((a,b)=>b-a)){
  let hits=0;for(const foot of[-5.4936,5.4936])for(const dx of[-1.5,1.5])for(const z of[.55,3.55]){const x=foot+dx,wx=p.x+c*x+s*z,wz=p.z-s*x+c*z;if(g.surfaces.some(b=>Math.abs(b.y-y)<=.0001&&flat(b,wx,wz)))hits++;}
  if(hits===8||partial&&hits>0)return y;
 }
 return undefined;
}
export function roomMotionPose(w,p=w.actor,extra=null,g=roomWalkGeometry(w)){
 if(!w.roomMotion||!roomBodyClear(w,p,extra??[],g,w.roomMotion.grounded?2.5:0)||!inside(p,w)||p.y>w.levels*40+ROOM_JUMP_RISE)return false;
 if(!w.roomMotion.grounded)return true;
 // Standalone building validation defers an explicitly external support to the
 // world guard, which must prove that the same real material still exists.
 if(w.roomMotion.support==='world'&&extra===null)return true;
 const sg=surfaces(g,extra??[]),y=height(sg,p,p.y,.0001,true);
 // Preserve the established curved-foot support on the inner stairs.
 return y!==undefined&&Math.abs(y-p.y)<.0001||Math.abs((roomSupport(g,p,p.y)??Infinity)-p.y)<.0001;
}
export function assertRoomMotion(w,extra=null){
 const m=w?.roomMotion;
 ok(w?.version===5&&w.roomWalkVersion===1&&w.levels===w.blueprint?.storeys.length&&!w.kit&&!w.job&&m&&Object.keys(m).sort().join('|')==='grounded|held|jumps|support|version|vy'&&m.version===1&&Number.isFinite(m.vy)&&m.vy>=-400&&m.vy<=JUMP+epsilon&&Number.isInteger(m.jumps)&&m.jumps>=0&&m.jumps<=SKY_MAX_JUMPS&&typeof m.grounded==='boolean'&&typeof m.held==='boolean'&&(m.grounded?m.vy===0&&m.jumps===0&&['building','world'].includes(m.support):m.support==='air')&&roomMotionPose(w,w.actor,extra),'ジャンプの場所をたしかめよう。');return true;
}
export function beginRoomMotion(w){
 ok(w?.roomWalkVersion===1&&!Object.hasOwn(w,'roomMotion'),'広い床からジャンプをはじめよう。');
 const n={...w,roomMotion:initial(),revision:w.revision+1};assertRoomMotion(n);return n;
}
function command(c){ok(c&&Object.keys(c).sort().join('|')===(c.jumpStyle===2?'dt|fast|heading|jump|jumpStyle|x|z':'dt|fast|heading|jump|x|z')&&[c.dt,c.x,c.z,c.heading].every(Number.isFinite)&&c.dt>0&&c.dt<=.05&&Math.abs(c.x)<=1&&Math.abs(c.z)<=1&&Math.hypot(c.x,c.z)<=1+epsilon&&Math.abs(c.heading)<=Math.PI*8&&typeof c.fast==='boolean'&&typeof c.jump==='boolean','ジャンプの操作をたしかめよう。');}
function simulate(w,c,extra,g,sg){
 const variable=c.jumpStyle===2,G=variable?NEW_G:OLD_G,launch=variable?JUMP:OLD_JUMP;let p={...w.actor},m={...w.roomMotion};const speed=c.fast?200:68,dx=c.x*speed,dz=c.z*speed;
 // Sweep the full body while turning; a blocked turn never prevents backing away.
 const angle=Math.atan2(Math.sin(c.heading-p.heading),Math.cos(c.heading-p.heading)),turns=Math.ceil(Math.abs(angle)/.05);let canTurn=true;
 for(let i=1;i<=turns;i++){const q={...p,heading:p.heading+angle*i/turns},y=m.support==='building'?roomSupport(g,q,p.y):height(sg,q,p.y,.0001);if(!inside(q,w)||!roomBodyClear(w,q,extra,g,m.grounded?2.5:0)||(m.grounded&&(y===undefined||Math.abs(y-p.y)>.0001))){canTurn=false;break;}}
 if(canTurn)p.heading+=angle;
 if(c.jump&&!m.held&&m.jumps<SKY_MAX_JUMPS){m.vy=launch;m.grounded=false;m.support='air';m.jumps++;}if(variable&&m.held&&!c.jump)m.vy=releasedJumpVelocity(m.vy);m.held=c.jump;
 let left=c.dt;
 while(left>1e-10){
  const h=Math.min(left,1/120,.45/Math.max(1,Math.hypot(dx,dz)),.45/Math.max(1,Math.abs(m.vy)+G/120));left-=h;
  // Keep ordinary stair walking, including uneven curved-foot contacts.
  for(const axis of['x','z']){
   const d=(axis==='x'?dx:dz)*h;if(Math.abs(d)<1e-12)continue;const q={...p,[axis]:p[axis]+d};if(!inside(q,w))continue;
   if(m.grounded){const y=roomSupport(g,q,p.y)??height(sg,q,p.y);if(y!==undefined){q.y=y;if(roomBodyClear(w,q,extra,g,2.5)){p=q;m.support=height(g,p,p.y,.0001,true)!==undefined||Math.abs((roomSupport(g,p,p.y)??Infinity)-p.y)<.0001?'building':'world';continue;}continue;}}
   q.y=p.y;if(roomBodyClear(w,q,extra,g)){p=q;if(m.grounded){m.grounded=false;m.support='air';m.vy=0;}}else continue;
  }
  if(m.grounded)continue;
  const nextY=p.y+m.vy*h-G*h*h/2,nextV=m.vy-G*h;
  if(nextY<=p.y){
   const lo=Math.max(0,nextY),y=height(sg,p,(p.y+lo)/2,(p.y-lo)/2+.0001,true);
   if(y!==undefined&&y<=p.y+.0001&&y>=nextY-.0001){const q={...p,y};if(roomBodyClear(w,q,extra,g)){p=q;m={...m,grounded:true,vy:0,jumps:0,support:height(g,p,p.y,.0001,true)!==undefined?'building':'world'};continue;}}
  }
  const q={...p,y:Math.max(0,nextY)};
  if(roomBodyClear(w,q,extra,g)){p=q;m.vy=nextV;}
  else{
   // Stop at the first solid surface, retaining the downward fall after a head hit.
   let low=0,high=1;for(let i=0;i<18;i++){const mid=(low+high)/2,t={...p,y:p.y+(q.y-p.y)*mid};if(roomBodyClear(w,t,extra,g))low=mid;else high=mid;}
   p={...p,y:p.y+(q.y-p.y)*low};m.vy=nextY>p.y?Math.min(0,nextV):nextV;
  }
 }
 return{...w,actor:p,roomMotion:m};
}
export function stepRoomMotion(w,c,extra=[]){assertRoomMotion(w,extra);command(c);const g=roomWalkGeometry(w);return simulate(w,c,extra,g,surfaces(g,extra));}
export function replayRoomMotion(w,commands,extra=[]){
 assertRoomMotion(w,extra);ok(Array.isArray(commands)&&commands.length>0&&commands.length<=ROOM_MOTION_LIMIT,'ジャンプの道をたしかめよう。');
 const g=roomWalkGeometry(w),sg=surfaces(g,extra);let n=w;for(const c of commands){command(c);n=simulate(n,c,extra,g,sg);}assertRoomMotion(n,extra);return{...n,revision:w.revision+1};
}
