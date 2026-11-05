import{makeCornerStairs,cornerStairHeight,cornerStairReserved}from'./imasora-sliding-tag-hunt-corner-stairs.mjs';
// New hunt-world physics under construction. The live v13 preview stays untouched.
// Shared roster and timing; coordinate scale follows the canonical .36-scale Ren model.
import {STEP,actor,match,opponentSpec,OPPONENTS,TAG_CHARACTERS,BODY as LEGACY_BODY} from './imasora-sliding-tag-model.mjs';
import {SKY_JUMP_VELOCITY,SKY_JUMP_GRAVITY,SKY_MAX_JUMPS,releasedJumpVelocity} from './imasora-construction-locomotion.mjs';
import {HOOK_POLES} from './imasora-sliding-tag-hunt-items.mjs';
export {STEP,TAG_CHARACTERS,actor,opponentSpec};
export const HUNT_REFERENCE_HEIGHT=26.485200549316403;
export const HUNT_CHARACTER_HEIGHT=5.4;
export const HUNT_MAP_SCALE=HUNT_CHARACTER_HEIGHT/HUNT_REFERENCE_HEIGHT;
// Short low-obstacle jumps get clearance without changing open-ground jump arcs.
export const HUNT_JUMP=Object.freeze({launch:SKY_JUMP_VELOCITY*HUNT_MAP_SCALE,gravity:SKY_JUMP_GRAVITY*HUNT_MAP_SCALE,maxJumps:SKY_MAX_JUMPS,tapRelease:.9});
export const BODY=Object.freeze({...LEGACY_BODY,dash:20,gravity:HUNT_JUMP.gravity});
const characterById=new Map(TAG_CHARACTERS.map(c=>[c.id,c]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function bounce(a,nx,nz,restitution){const v=a.vx*nx+a.vz*nz;if(v<0){a.vx-=(1+restitution)*v*nx;a.vz-=(1+restitution)*v*nz;}}
export const WORLD_RADII=Object.freeze({walkCute:3.2,walkBrave:4.5,walkSaber:3.6,rioCute:3.7,rioBrave:4.6,rioSaber:3.5});
export const WORLD_RULES='tag-hunt-foundation-v1';
export const WORLD_DASH_FORCE=1.18;
export const WORLD=Object.freeze({width:640,depth:480,duration:90,grid:16});
export const WORLD_CORNER_STAIRS=makeCornerStairs(WORLD.width,WORLD.depth);
export const WORLD_JUMP_STEPS=Object.freeze([80,112,144].map((x,i)=>Object.freeze({x,z:-172,w:32,d:32,h:[1.5,4.5,8][i],ramp:32})));
export const WORLD_HILL=Object.freeze({x:-267,z:-20,rx:44,rz:108,h:8,cell:4});
export const WORLD_BASIN=Object.freeze({x:112,z:172,rx:54,rz:44,depth:5.5,brake:Object.freeze({x:112,z:172,w:16,d:24})});
export const WORLD_RISE=Object.freeze({x:116,z:0,halfW:48,halfD:48,topW:16,topD:16,h:7.5});
export const WORLD_ICE_LOOP=Object.freeze([{x:116,z:-48,w:112,d:10},{x:116,z:48,w:112,d:10},{x:60,z:0,w:10,d:96},{x:172,z:0,w:10,d:96}].map(Object.freeze));
export const WORLD_DECK=Object.freeze({x:260,z:0,w:28,length:170,ramp:64,h:13});const deck=WORLD_DECK;
export const WORLD_RIDGE=Object.freeze({start:WORLD_RISE.x+WORLD_RISE.topW,end:WORLD_DECK.x-WORLD_DECK.w/2,startHeight:WORLD_RISE.h,endHeight:WORLD_DECK.h,halfTop:9,halfBase:44,cap:32});
function ridgeGround(x,z){const r=WORLD_RIDGE;if(x<r.start-r.cap||x>WORLD_DECK.x+WORLD_DECK.w/2||Math.abs(z)>r.halfBase)return 0;const along=clamp((x-r.start)/(r.end-r.start),0,1),cap=clamp((x-r.start+r.cap)/r.cap,0,1),across=1-clamp((Math.abs(z)-r.halfTop)/(r.halfBase-r.halfTop),0,1);return(r.startHeight+(r.endHeight-r.startHeight)*along)*cap*across;}
function basinGround(x,z){const b=WORLD_BASIN,q=((x-b.x)/b.rx)**2+((z-b.z)/b.rz)**2;return q<1?-b.depth*(1-q)**2:0;}
function rawGround(x,z){const q=((x-WORLD_HILL.x)/WORLD_HILL.rx)**2+((z-WORLD_HILL.z)/WORLD_HILL.rz)**2;const r=WORLD_RISE,t=Math.max((Math.abs(x-r.x)-r.topW)/(r.halfW-r.topW),(Math.abs(z-r.z)-r.topD)/(r.halfD-r.topD));return Math.max(q<1?WORLD_HILL.h*(1-q)**2:0,r.h*(1-clamp(t,0,1)),ridgeGround(x,z))+basinGround(x,z);}
// Identical triangles in physics and rendering: feet cannot sink into a smoothed mesh.
export function worldGroundHeight(x,z){const h=WORLD_HILL;if((Math.abs(x-h.x)>h.rx+h.cell||Math.abs(z-h.z)>h.rz+h.cell)&&(Math.abs(x-WORLD_RISE.x)>WORLD_RISE.halfW+h.cell||Math.abs(z-WORLD_RISE.z)>WORLD_RISE.halfD+h.cell)&&(x<WORLD_RIDGE.start-WORLD_RIDGE.cap-h.cell||x>WORLD_DECK.x+WORLD_DECK.w/2+h.cell||Math.abs(z)>WORLD_RIDGE.halfBase+h.cell)&&(Math.abs(x-WORLD_BASIN.x)>WORLD_BASIN.rx+h.cell||Math.abs(z-WORLD_BASIN.z)>WORLD_BASIN.rz+h.cell))return 0;const x0=Math.floor(x/h.cell)*h.cell,z0=Math.floor(z/h.cell)*h.cell,u=(x-x0)/h.cell,v=(z-z0)/h.cell,a=rawGround(x0,z0),b=rawGround(x0+h.cell,z0),c=rawGround(x0,z0+h.cell),d=rawGround(x0+h.cell,z0+h.cell);return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);}
export function worldGradient(x,z){return{x:clamp((worldHeight(x+.25,z)-worldHeight(x-.25,z))*2,-.36,.36),z:clamp((worldHeight(x,z+.25)-worldHeight(x,z-.25))*2,-.36,.36)};}
// Built once for rendering; every painted point uses the shared physical ground.
export function worldBasinContours(){
 const positions=[],indices=[];
 for(const radius of[.54,.86])for(let i=0;i<96;i++){
  const start=positions.length/3;
  for(const angle of[i/96*Math.PI*2,(i+1)/96*Math.PI*2])for(const width of[-.006,.006]){
   const x=WORLD_BASIN.x+Math.cos(angle)*WORLD_BASIN.rx*(radius+width),z=WORLD_BASIN.z+Math.sin(angle)*WORLD_BASIN.rz*(radius+width);
   positions.push(x,worldGroundHeight(x,z)+.06,z);
  }
  indices.push(start,start+2,start+1,start+1,start+2,start+3);
 }
 return{positions,indices};
}
export const WORLD_GARDEN=Object.freeze({x:-116,z:128,halfW:56,halfD:80,narrowWidth:16,h:14});
export const WORLD_GARDEN_BEDS=Object.freeze([{x:-132,z:96,w:24,d:28},{x:-92,z:96,w:24,d:28},{x:-120,z:160,w:56,d:28}].map(b=>Object.freeze({...b,h:WORLD_GARDEN.h,kind:'garden'})));
export const WORLD_PATHS=Object.freeze([{...WORLD_BASIN.brake},{x:56,z:128,w:112,d:8},{x:0,z:0,w:28,d:480},{x:-46,z:0,w:548,d:24},{x:260,z:0,w:28,d:480},{x:228,z:0,w:24,d:328},{x:244,z:-164,w:56,d:24},{x:244,z:164,w:56,d:24},{x:34,z:-80,w:40,d:16},{x:116,z:0,w:18,d:96},{x:-32,z:128,w:64,d:16},{x:-116,z:128,w:112,d:16},{x:-68,z:88,w:16,d:64},{x:-164,z:168,w:16,d:64},{x:-112,z:96,w:16,d:56},{x:(WORLD_RIDGE.start+WORLD_RIDGE.end)/2,z:0,w:WORLD_RIDGE.end-WORLD_RIDGE.start,d:18},{x:180,z:0,w:16,d:104}].map(Object.freeze));
export const WORLD_COURTYARD=Object.freeze({x:0,z:-80,halfW:38,halfD:32,wall:8,narrowWidth:16,wideNorth:20,wideEast:16,h:18,archBase:15});
function courtyardParts(){const c=WORLD_COURTYARD,parts=[],wall=(x,z,w,d)=>parts.push(Object.freeze({x:c.x+x,z:c.z+z,w,d,h:c.h,kind:'courtyard'})),arch=(x,z,w,d)=>parts.push(Object.freeze({x:c.x+x,z:c.z+z,w,d,h:c.h-c.archBase,base:c.archBase,kind:'arch'}));wall(-c.halfW+c.wall/2,0,c.wall,c.halfD*2);for(const side of[-1,1]){const north=c.halfW-c.wideNorth/2,south=c.halfW-c.narrowWidth/2,east=c.halfD-c.wideEast/2;wall(side*(c.wideNorth/2+north/2),-c.halfD,north,c.wall);wall(side*(c.narrowWidth/2+south/2),c.halfD,south,c.wall);wall(c.halfW-c.wall/2,side*(c.wideEast/2+east/2),c.wall,east);}arch(0,c.halfD,c.narrowWidth,c.wall);arch(0,-c.halfD,c.wideNorth,c.wall);arch(c.halfW-c.wall/2,0,c.wall,c.wideEast);return parts;}
export const WORLD_BLOCKS=Object.freeze([...Array.from({length:30},(_,i)=>{const col=i%6,row=Math.floor(i/6),x=(col-2.5)*76,z=(row-2)*78;return Object.freeze({x,z,w:34+(i%3)*4,d:32+(i%2)*8,h:30+(i%4)*6});}).filter(b=>!(Math.abs(b.x-112)<104&&Math.abs(b.z+172)<60)&&!(Math.abs(b.x-WORLD_BASIN.x)<WORLD_BASIN.rx+b.w/2&&Math.abs(b.z-WORLD_BASIN.z)<WORLD_BASIN.rz+b.d/2)&&b.z!==0&&!(Math.abs(b.x)<55&&Math.abs(b.z)<90)&&!(Math.abs(b.x-WORLD_GARDEN.x)<32&&Math.abs(b.z-WORLD_GARDEN.z)<WORLD_GARDEN.halfD)),
 ...courtyardParts(),...WORLD_GARDEN_BEDS]);
export const WORLD_TREES=Object.freeze(Array.from({length:100},(_,i)=>({x:-292+(i%10)*61,z:-222+Math.floor(i/10)*49,r:2.8,h:11})).filter(p=>!cornerStairReserved(p.x,p.z,WORLD_CORNER_STAIRS,p.r+7)&&!(Math.abs(p.x-112)<100&&Math.abs(p.z+180)<50)&&(((p.x-WORLD_BASIN.x)/WORLD_BASIN.rx)**2+((p.z-WORLD_BASIN.z)/WORLD_BASIN.rz)**2>1.15)&&(Math.abs(p.x-WORLD_GARDEN.x)>WORLD_GARDEN.halfW||Math.abs(p.z-WORLD_GARDEN.z)>WORLD_GARDEN.halfD)&&Math.abs(p.x)>=25&&Math.abs(p.z)>=22&&WORLD_BLOCKS.every(b=>Math.abs(p.x-b.x)>b.w/2+8||Math.abs(p.z-b.z)>b.d/2+8)&&Math.abs(p.x-260)>=23&&WORLD_PATHS.every(r=>Math.abs(p.x-r.x)>r.w/2+6||Math.abs(p.z-r.z)>r.d/2+6)).map(p=>Object.freeze({...p,y:worldGroundHeight(p.x,p.z)})));

export function worldHeight(x,z){let ground=Math.max(worldGroundHeight(x,z),cornerStairHeight(x,z,WORLD_CORNER_STAIRS));for(const t of WORLD_JUMP_STEPS){if(Math.abs(x-t.x)<=t.w/2){if(Math.abs(z-t.z)<=t.d/2)ground=Math.max(ground,t.h);else if(z<t.z-t.d/2&&z>t.z-t.d/2-t.ramp)ground=Math.max(ground,t.h*(z-(t.z-t.d/2-t.ramp))/t.ramp);}}if(Math.abs(x-deck.x)>deck.w/2)return ground;const az=Math.abs(z);return Math.max(ground,az<=deck.length/2?deck.h:az<deck.length/2+deck.ramp?deck.h*(1-(az-deck.length/2)/deck.ramp):0);}
export function worldSurface(x,z){if(WORLD_PATHS.some(p=>Math.abs(x-p.x)<=p.w/2&&Math.abs(z-p.z)<=p.d/2))return'grip';return WORLD_ICE_LOOP.some(p=>Math.abs(x-p.x)<=p.w/2&&Math.abs(z-p.z)<=p.d/2)||((x-WORLD_BASIN.x)/WORLD_BASIN.rx)**2+((z-WORLD_BASIN.z)/WORLD_BASIN.rz)**2<1?'ice':'grip';}
export function worldValid(p,padding=BODY.radius){return Math.abs(p.x)<WORLD.width/2-padding&&Math.abs(p.z)<WORLD.depth/2-padding&&WORLD_BLOCKS.every(b=>(p.y??worldHeight(p.x,p.z))+5.4<=(b.base??0)+.001||Math.abs(p.x-b.x)>b.w/2+padding||Math.abs(p.z-b.z)>b.d/2+padding)&&WORLD_TREES.every(t=>Math.hypot(p.x-t.x,p.z-t.z)>t.r+padding)&&HOOK_POLES.every(t=>(p.y??worldHeight(p.x,p.z))>worldHeight(t.x,t.z)+4||Math.hypot(p.x-t.x,p.z-t.z)>.65+padding); }
// Slab intersection tests the whole segment; roof/floor separation cannot tag through a wall.
// Immutable broad-phase bounds are shared by navigation, sight and camera rays.
// The narrow phase retains the same divisions, axis order and contact rules.
const sightBoxes=WORLD_BLOCKS.map(b=>({minX:b.x-b.w/2,maxX:b.x+b.w/2,minZ:b.z-b.d/2,maxZ:b.z+b.d/2,minY:b.base??0,maxY:(b.base??0)+b.h}));
const sightRaisedGround=[...WORLD_CORNER_STAIRS.map(c=>({minX:Math.min(c.x,c.x-c.sx*c.reach),maxX:Math.max(c.x,c.x-c.sx*c.reach),minZ:Math.min(c.z,c.z-c.sz*c.reach),maxZ:Math.max(c.z,c.z-c.sz*c.reach)})),...WORLD_JUMP_STEPS.map(t=>({minX:t.x-t.w/2,maxX:t.x+t.w/2,minZ:t.z-t.d/2-t.ramp,maxZ:t.z+t.d/2})),
 {minX:WORLD_HILL.x-WORLD_HILL.rx-WORLD_HILL.cell,maxX:WORLD_HILL.x+WORLD_HILL.rx+WORLD_HILL.cell,minZ:WORLD_HILL.z-WORLD_HILL.rz-WORLD_HILL.cell,maxZ:WORLD_HILL.z+WORLD_HILL.rz+WORLD_HILL.cell},
 {minX:WORLD_RISE.x-WORLD_RISE.halfW-WORLD_HILL.cell,maxX:WORLD_RISE.x+WORLD_RISE.halfW+WORLD_HILL.cell,minZ:WORLD_RISE.z-WORLD_RISE.halfD-WORLD_HILL.cell,maxZ:WORLD_RISE.z+WORLD_RISE.halfD+WORLD_HILL.cell},
 {minX:WORLD_RIDGE.start-WORLD_RIDGE.cap-WORLD_HILL.cell,maxX:WORLD_DECK.x+WORLD_DECK.w/2+WORLD_HILL.cell,minZ:-WORLD_RIDGE.halfBase-WORLD_HILL.cell,maxZ:WORLD_RIDGE.halfBase+WORLD_HILL.cell},
 {minX:WORLD_DECK.x-WORLD_DECK.w/2,maxX:WORLD_DECK.x+WORLD_DECK.w/2,minZ:-WORLD_DECK.length/2-WORLD_DECK.ramp,maxZ:WORLD_DECK.length/2+WORLD_DECK.ramp}
];
const sightMaxGround=Math.max(WORLD_HILL.h,WORLD_RISE.h,WORLD_DECK.h,WORLD_RIDGE.startHeight,WORLD_RIDGE.endHeight);
export function worldSight(a,b,padding=0){
 const ax=a.x,az=a.z,ay=a.y??2,by=b.y??2,dx=b.x-ax,dz=b.z-az,dy=by-ay,minX=Math.min(ax,b.x),maxX=Math.max(ax,b.x),minZ=Math.min(az,b.z),maxZ=Math.max(az,b.z),minY=Math.min(ay,by),maxY=Math.max(ay,by);
 for(const box of sightBoxes){
  const x0=box.minX-padding,x1=box.maxX+padding,z0=box.minZ-padding,z1=box.maxZ+padding;
  if(maxX<Math.min(x0,x1)||minX>Math.max(x0,x1)||maxZ<Math.min(z0,z1)||minZ>Math.max(z0,z1)||maxY<box.minY||minY>box.maxY)continue;
  let lo=0,hi=1;
  if(Math.abs(dx)<1e-9){if(ax<x0||ax>x1)continue;}else{const t0=(x0-ax)/dx,t1=(x1-ax)/dx;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));}
  if(Math.abs(dz)<1e-9){if(az<z0||az>z1)continue;}else{const t0=(z0-az)/dz,t1=(z1-az)/dz;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));}
  if(Math.abs(dy)<1e-9){if(ay<box.minY||ay>box.maxY)continue;}else{const t0=(box.minY-ay)/dy,t1=(box.maxY-ay)/dy;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));}
  if(lo<=hi&&hi>0&&lo<1)return false;
 }
 for(const tree of WORLD_TREES){
  const reach=tree.r+padding,low=tree.y,high=tree.y+tree.h;
  if(reach<=0||maxX<tree.x-reach||minX>tree.x+reach||maxZ<tree.z-reach||minZ>tree.z+reach||maxY<low||minY>high)continue;
  let lo=0,hi=1;if(Math.abs(dy)<1e-9){if(ay<low||ay>high)continue;}else{const u=(low-ay)/dy,v=(high-ay)/dy;lo=Math.max(0,Math.min(u,v));hi=Math.min(1,Math.max(u,v));if(lo>hi)continue;}
  const t=clamp(((tree.x-ax)*dx+(tree.z-az)*dz)/(dx*dx+dz*dz||1),lo,hi);if(Math.hypot(ax+dx*t-tree.x,az+dz*t-tree.z)<reach)return false;
 }
 // Above the highest terrain, or over flat/lowered land, no ground sample can block.
 // Expand the raised bounds by a mesh cell so rim triangles are never skipped.
 if(minY>=sightMaxGround+.05||minY>=.05&&!sightRaisedGround.some(r=>maxX>=r.minX&&minX<=r.maxX&&maxZ>=r.minZ&&minZ<=r.maxZ))return true;
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/3));for(let i=1;i<steps;i++){const t=i/steps,x=ax+dx*t,z=az+dz*t,y=ay+dy*t;if(y<worldHeight(x,z)+.05)return false;}return true;
}
function stairJumpAccess(a,x,z,n,radius){const reach=radius+Math.max(3,Math.min(10,Math.hypot(a.vx,a.vz)*.5)),probe=(dx,dz)=>{const px=a.x+dx*reach,pz=a.z+dz*reach,h=cornerStairHeight(px,pz,WORLD_CORNER_STAIRS);return h>worldGroundHeight(px,pz)&&h>a.y+.6&&h<=a.y+1.41;};return n>.05?probe(Math.abs(x)>.05?Math.sign(x):0,Math.abs(z)>.05?Math.sign(z):0):probe(1,0)||probe(-1,0)||probe(0,1)||probe(0,-1)||probe(1,1)||probe(1,-1)||probe(-1,1)||probe(-1,-1);}
export function worldMove(a,input={},dt=STEP){
 const radius=a.radius??2.7,dash=a.flight?LEGACY_BODY.dash:BODY.dash;let x=Number.isFinite(input.x)?input.x:0,z=Number.isFinite(input.z)?input.z:0,n=Math.hypot(x,z);if(n>1){x/=n;z/=n;}
 const intendedYaw=n>.05?Math.atan2(x,z):a.yaw;

 const t=a.tuning??{accel:1,speed:1,turn:1,brake:1},before={x:a.x,z:a.z,y:a.y},ground=a.grounded,grip=!a.slippery&&worldSurface(a.x,a.z)==='grip';
 if(input.jump&&!a.jumpHeld&&a.jumps<HUNT_JUMP.maxJumps){if(a.grounded&&(input.jumpAccess||stairJumpAccess(a,x,z,n,radius)))a.stepJump=true;else delete a.stepJump;a.vy=HUNT_JUMP.launch;a.jumps++;a.grounded=false;}if(!input.jump&&a.jumpHeld)a.vy=a.stepJump&&a.vy>0?a.vy*HUNT_JUMP.tapRelease:releasedJumpVelocity(a.vy);a.jumpHeld=!!input.jump;
 const velocity=Math.hypot(a.vx,a.vz),running=ground&&grip&&!a.externalForce&&!['cushion','sticky'].includes(a.kind);
 if(running){
  const amount=Math.min(1,n),limit=(input.dash?dash:BODY.max)*t.speed,tx=x*limit,tz=z*limit,dx=tx-a.vx,dz=tz-a.vz,d=Math.hypot(dx,dz),turning=amount>.05&&velocity>1&&(a.vx*x+a.vz*z)/(velocity*amount)<.95;
  const rate=amount<.05?150*t.brake:100*t.accel*(turning?.5+.5*t.turn:1),step=Math.min(d,rate*dt);
  if(d>1e-9){a.vx+=dx/d*step;a.vz+=dz/d*step;}if(amount<.05&&Math.hypot(a.vx,a.vz)<.03){a.vx=0;a.vz=0;}
 }else{
  if(velocity>.1){const nx=a.vx/velocity,nz=a.vz/velocity,dot=x*nx+z*nz;x=dot*nx+(x-dot*nx)*t.turn;z=dot*nz+(z-dot*nz)*t.turn;}
  // Retain directional control from a standing jump, not just a running takeoff.
  const drag=ground?(grip?4.7:(n<.05?1.8:.6))*t.brake:.08,decay=Math.exp(-drag*dt),force=BODY.accel*t.accel*(ground?(grip?2.7:1):a.stepJump?3:.22)*(ground&&input.dash?WORLD_DASH_FORCE:1);
  a.vx=a.vx*decay+x*force*dt;a.vz=a.vz*decay+z*force*dt;
 }
 const slope=worldGradient(a.x,a.z),rest=running&&n<.05;if(!rest&&ground){a.vx-=slope.x*BODY.gravity*dt;a.vz-=slope.z*BODY.gravity*dt;}
 const speed=Math.hypot(a.vx,a.vz),downhill=ground?clamp(-(slope.x*a.vx+slope.z*a.vz)/(Math.hypot(a.vx,a.vz)||1)*10,0,3):0,max=Math.max((input.dash?dash:BODY.max)*t.speed+downhill,a.trampolineBoost&&!ground&&a.vy>0&&Number.isFinite(a.trampolineForwardSpeed)?clamp(a.trampolineForwardSpeed,0,34):0);if(speed>max){const cap=Math.min(speed,Math.max(max,velocity-16*dt));a.vx*=cap/speed;a.vz*=cap/speed;}
 a.x+=a.vx*dt;a.z+=a.vz*dt;
 for(const box of WORLD_BLOCKS){if(a.y>=(box.base??0)+box.h-.01||a.y+5.4<=(box.base??0)+.001)continue;const minX=box.x-box.w/2-radius,maxX=box.x+box.w/2+radius,minZ=box.z-box.d/2-radius,maxZ=box.z+box.d/2+radius;if(a.x>minX&&a.x<maxX&&a.z>minZ&&a.z<maxZ){const options=[[Math.abs(a.x-minX),'x',minX,-1],[Math.abs(maxX-a.x),'x',maxX,1],[Math.abs(a.z-minZ),'z',minZ,-1],[Math.abs(maxZ-a.z),'z',maxZ,1]];const chosen=options.reduce((m,v)=>v[0]<m[0]?v:m);a[chosen[1]]=chosen[2];bounce(a,chosen[1]==='x'?chosen[3]:0,chosen[1]==='z'?chosen[3]:0,.2);}}
 // A falling foot can reach the canopy during this same fixed step.
 const treeFootY=a.grounded?a.y:Math.min(a.y,a.y+a.vy*dt-BODY.gravity*dt*dt/2);
 for(const tree of WORLD_TREES){if(!a.flight&&(treeFootY>tree.y+tree.h||a.y+5.4<tree.y))continue;const dx=a.x-tree.x,dz=a.z-tree.z,d=Math.hypot(dx,dz),r=tree.r+radius;if(d<r){const nx=d>1e-8?dx/d:1,nz=d>1e-8?dz/d:0;a.x=tree.x+nx*r;a.z=tree.z+nz*r;bounce(a,nx,nz,.2);}}
 // Resolve poles against the full vertical step, including a descending foot.
 const poleFootY=a.grounded?a.y:Math.min(a.y,a.y+a.vy*dt-BODY.gravity*dt*dt/2);
 for(const pole of HOOK_POLES){if(poleFootY>worldHeight(pole.x,pole.z)+4)continue;const dx=a.x-pole.x,dz=a.z-pole.z,d=Math.hypot(dx,dz),r=.65+radius;if(d<r){const nx=d>1e-8?dx/d:1,nz=d>1e-8?dz/d:0;a.x=pole.x+nx*r;a.z=pole.z+nz*r;bounce(a,nx,nz,.2);}}
 for(const axis of['x','z'])for(const sign of[-1,1]){const edge={x:a.x,z:a.z};edge[axis]+=sign*radius;if(sign*(a[axis]-before[axis])>0&&worldHeight(edge.x,edge.z)>a.y+.6&&!terrainContinuous(a,edge)){a[axis]=before[axis];a[axis==='x'?'vx':'vz']*= -.2;break;}}
 a.x=clamp(a.x,-WORLD.width/2+radius,WORLD.width/2-radius);a.z=clamp(a.z,-WORLD.depth/2+radius,WORLD.depth/2-radius);
 const floor=worldHeight(a.x,a.z);if(a.grounded){if(floor<=before.y+.6&&floor>=before.y-.6)a.y=floor;else if(floor>before.y+.6){a.x=before.x;a.z=before.z;a.vx=0;a.vz=0;}else a.grounded=false;}
 if(!a.grounded&&floor>before.y+(cornerStairHeight(a.x,a.z,WORLD_CORNER_STAIRS)>worldGroundHeight(a.x,a.z)?.01:.6)){a.x=before.x;a.z=before.z;}
 if(!a.grounded){a.y+=a.vy*dt-BODY.gravity*dt*dt/2;a.vy-=BODY.gravity*dt;for(const b of WORLD_BLOCKS){const base=b.base??0;if(base>0&&before.y+5.4<=base+.001&&a.y+5.4>base&&Math.abs(a.x-b.x)<b.w/2+radius&&Math.abs(a.z-b.z)<b.d/2+radius){a.y=base-5.4;a.vy=Math.min(0,a.vy);}}const landing=worldHeight(a.x,a.z);if(a.y<=landing&&a.vy<=0){a.y=landing;a.vy=0;a.grounded=true;a.jumps=0;delete a.stepJump;}}
 if(a.keepInputFacing)a.yaw=intendedYaw;else if(Math.hypot(a.vx,a.vz)>.2)a.yaw=Math.atan2(a.vx,a.vz);return a;
}
function terrainContinuous(a,b){const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)*2));let h=worldHeight(a.x,a.z);for(let i=1;i<=steps;i++){const t=i/steps,next=worldHeight(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t);if(Math.abs(next-h)>.3)return false;h=next;}return true;}
export function worldTraversable(a,b,padding=BODY.radius+.2){
 // A visible ray may leave the map; a walking destination must stay inside it.
 // Check the destination, so a body already at the physical rim can return
 // inward even when the planning margin is wider than its actual radius.
 if(Math.abs(b.x)>WORLD.width/2-padding||Math.abs(b.z)>WORLD.depth/2-padding)return false;
 if(!worldSight({...a,y:worldHeight(a.x,a.z)+2},{...b,y:worldHeight(b.x,b.z)+2},padding))return false;const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)*2));let h=worldHeight(a.x,a.z);for(let i=1;i<=steps;i++){const t=i/steps,next=worldHeight(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t);if(Math.abs(next-h)>.3)return false;h=next;}return true;}
// A fixed sparse graph, built once. Search runs on decisions, never once per render frame.
const WORLD_NODES=[];for(let z=-224;z<=224;z+=16)for(let x=-304;x<=304;x+=16)if(worldValid({x,z},BODY.radius+1))WORLD_NODES.push({x,z,y:worldHeight(x,z)});
const worldCell=new Map(WORLD_NODES.map((n,i)=>[n.x+','+n.z,i]));
const WORLD_LINKS=WORLD_NODES.map(a=>{const list=[];for(const [dx,dz]of[[16,0],[-16,0],[0,16],[0,-16],[16,16],[16,-16],[-16,16],[-16,-16]]){const i=worldCell.get((a.x+dx)+','+(a.z+dz));if(i===undefined)continue;const b=WORLD_NODES[i];if(Math.abs(b.y-a.y)/Math.hypot(dx,dz)<.32&&worldTraversable(a,b))list.push(i);}return list;});
function segmentClearance(a,b){const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz||1,point=(x,z)=>{const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/length,0,1);return Math.hypot(a.x+dx*t-x,a.z+dz*t-z);};let clearance=Infinity;for(const box of WORLD_BLOCKS){if(Math.max(a.y??0,b.y??0)+5.4<=(box.base??0)+.001)continue;const hx=box.w/2,hz=box.d/2;for(const p of[a,b])clearance=Math.min(clearance,Math.hypot(Math.max(Math.abs(p.x-box.x)-hx,0),Math.max(Math.abs(p.z-box.z)-hz,0)));for(const x of[box.x-hx,box.x+hx])for(const z of[box.z-hz,box.z+hz])clearance=Math.min(clearance,point(x,z));}for(const tree of WORLD_TREES)clearance=Math.min(clearance,point(tree.x,tree.z)-tree.r);return clearance;}
const worldEdgeCache=new Map();
// The player and CPU need at most two widths. Keep exact physical clearance,
// including square wall corners, without rounding a body into a larger size.
const worldWidthCaches=new Map();
function worldWidthEdges(padding){
 let edges=worldWidthCaches.get(padding);
 if(!edges){if(worldWidthCaches.size>=4)worldWidthCaches.delete(worldWidthCaches.keys().next().value);edges=new Map();worldWidthCaches.set(padding,edges);}
 return edges;
}
export const WORLD_NAV_COUNT=WORLD_NODES.length;
function worldNear(p,padding){const candidates=[],gx=Math.round(p.x/16)*16,gz=Math.round(p.z/16)*16,h=worldHeight(p.x,p.z);for(let dz=-32;dz<=32;dz+=16)for(let dx=-32;dx<=32;dx+=16){const i=worldCell.get((gx+dx)+','+(gz+dz));if(i===undefined)continue;const n=WORLD_NODES[i];candidates.push({i,d:Math.hypot(n.x-p.x,n.z-p.z)+Math.abs(n.y-h)*4});}candidates.sort((a,b)=>a.d-b.d);for(const c of candidates)if(worldValid(WORLD_NODES[c.i],padding)&&worldTraversable(p,WORLD_NODES[c.i],Math.max(0,padding-.25)))return c.i;return -1;}
// Geometry-only edge samples are shared across bodies; the cache is limited to graph edges.
const worldTravelCache=new Map();
function routeSamples(a,b){
 const ai=worldCell.get(a.x+','+a.z),bi=worldCell.get(b.x+','+b.z),cacheable=WORLD_NODES[ai]===a&&WORLD_NODES[bi]===b&&WORLD_LINKS[ai].includes(bi),key=ai+'>'+bi;
 if(cacheable&&worldTravelCache.has(key))return worldTravelCache.get(key);
 const length=Math.hypot(b.x-a.x,b.z-a.z),count=Math.max(1,Math.ceil(length/4)),rows=[];
 for(let i=0;i<count;i++){const t=i/count,u=(i+1)/count,m=(t+u)/2,x=a.x+(b.x-a.x)*m,z=a.z+(b.z-a.z)*m,d=length/count;rows.push({length:d,grip:worldSurface(x,z)==='grip',grade:d?(worldHeight(a.x+(b.x-a.x)*u,a.z+(b.z-a.z)*u)-worldHeight(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))/d:0});}
 if(cacheable)worldTravelCache.set(key,rows);return rows;
}
const worldTravelMemos=new Map();
function routeConfig(a){const t=a.tuning??{},top=BODY.dash*(t.speed??1),accel=100*(t.accel??1),iceDrive=BODY.accel*(t.accel??1)*WORLD_DASH_FORCE,brake=t.brake??1,key=top+':'+accel+':'+brake;let memo=worldTravelMemos.get(key);if(!memo){if(worldTravelMemos.size>=4)worldTravelMemos.delete(worldTravelMemos.keys().next().value);memo=new WeakMap();worldTravelMemos.set(key,memo);}return{top,accel,iceDrive,turn:t.turn??1,brake,vx:a.vx??0,vz:a.vz??0,memo};}
function segmentSeconds(config,a,b,prior,initial=false){
 const samples=routeSamples(a,b),cached=config.memo.get(samples);let seconds=cached?.seconds??0,cruise=cached?.cruise??config.top;if(!cached){for(const row of samples){const limit=config.top+clamp(-row.grade*10,0,3);cruise=row.grip?limit:clamp((config.iceDrive-row.grade*BODY.gravity)/(.6*config.brake),2,limit);seconds+=row.length/cruise;}config.memo.set(samples,{seconds,cruise});}
 const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz)||1;
 if(initial){const forward=(config.vx*dx+config.vz*dz)/length,accel=samples[0]?.grip?config.accel:config.iceDrive*.7;seconds+=Math.max(0,cruise-Math.max(0,forward))**2/(2*accel*cruise);seconds+=Math.max(0,-forward)/(accel*Math.max(.3,config.brake));}
 else if(prior){const ux=a.x-prior.x,uz=a.z-prior.z,cos=(ux*dx+uz*dz)/((Math.hypot(ux,uz)||length)*length);seconds+=Math.max(0,1-cos)*.22/Math.max(.3,config.turn);}
 return seconds;
}
export function worldRouteSeconds(a,path){const config=routeConfig(a);let seconds=0,from=a,prior=null;for(const to of path){if(Math.hypot(to.x-from.x,to.z-from.z)<1e-6)continue;seconds+=segmentSeconds(config,from,to,prior,prior===null);prior=from;from=to;}return seconds;}
function routePush(heap,item){let at=heap.length;heap.push(item);while(at){const parent=(at-1)>>1;if(heap[parent].f<=item.f)break;heap[at]=heap[parent];at=parent;}heap[at]=item;}
function routePop(heap){const first=heap[0],last=heap.pop();if(heap.length){let at=0;while(at*2+1<heap.length){let child=at*2+1;if(child+1<heap.length&&heap[child+1].f<heap[child].f)child++;if(heap[child].f>=last.f)break;heap[at]=heap[child];at=child;}heap[at]=last;}return first;}
export function worldRoute(a,b){
 const padding=(a.radius??2.7)+.2,start=worldNear(a,padding),end=worldNear(b,padding);if(start<0||end<0)return[];
 const widthEdges=worldWidthEdges(padding),config=routeConfig(a),fastest=Math.max(config.top+3,Math.hypot(config.vx,config.vz)),heuristic=i=>Math.hypot(WORLD_NODES[i].x-WORLD_NODES[end].x,WORLD_NODES[i].z-WORLD_NODES[end].z)/fastest,cost=new Float64Array(WORLD_NODES.length).fill(Infinity),prev=new Int32Array(WORLD_NODES.length).fill(-1),heap=[];
 cost[start]=0;routePush(heap,{i:start,g:0,f:heuristic(start)});let at=-1,visits=0;
 while(heap.length&&visits<WORLD_NODES.length*3){const item=routePop(heap);if(item.g!==cost[item.i])continue;at=item.i;visits++;if(at===end)break;
  for(const i of WORLD_LINKS[at]){const edge=Math.min(at,i)+':'+Math.max(at,i);let clearance=worldEdgeCache.get(edge);if(clearance===undefined){clearance=segmentClearance(WORLD_NODES[at],WORLD_NODES[i]);worldEdgeCache.set(edge,clearance);}if(clearance<padding)continue;
   let allowed=widthEdges.get(edge);if(allowed===undefined){allowed=worldTraversable(WORLD_NODES[at],WORLD_NODES[i],padding);widthEdges.set(edge,allowed);}if(!allowed)continue;
   const from=WORLD_NODES[at],to=WORLD_NODES[i],prior=prev[at]>=0?WORLD_NODES[prev[at]]:a,c=cost[at]+segmentSeconds(config,from,to,prior,prev[at]<0);
   if(c<cost[i]){cost[i]=c;prev[i]=at;routePush(heap,{i,g:c,f:c+heuristic(i)});}
  }
 }
 if(at!==end)return[];const path=[WORLD_NODES[end]];while(at!==start){at=prev[at];if(at<0)return[];path.push(WORLD_NODES[at]);}
 const route=path.reverse(),endNode=route.at(-1),endHeight=worldHeight(b.x,b.z);if(worldValid(b,padding)&&Math.abs(endHeight-endNode.y)<=Math.hypot(b.x-endNode.x,b.z-endNode.z)*.32+.01&&worldTraversable(endNode,b,padding))route.push({x:b.x,z:b.z,y:endHeight});return route;
}


export function worldRouteLookahead(a,path,start=0,threat=null){
 if(!path.length)return 0;let at=start;const remaining=path.slice(start),threats=threat?(Array.isArray(threat)?threat:[threat]):[],clearance=p=>Math.min(...threats.map(t=>worldEscapeClearance(a,t,p))),margin=threats.length?clearance(remaining):-Infinity;
 for(let i=start+1;i<Math.min(path.length,start+5);i++){
  if(!worldTraversable(a,path[i],(a.radius??2.7)-.05))break;
  if(threats.length&&clearance([path[i]])+.001<margin)break;
  if(worldRouteSeconds(a,[path[i]])>worldRouteSeconds(a,path.slice(start,i+1))*1.03+.02)break;
  at=i;
 }
 return at;
}
export function worldSearchPlan(seen,radius=2.7,{role,reserved=[]}={}){
 const candidates=WORLD_NODES.filter(n=>{const d=Math.hypot(n.x-seen.x,n.z-seen.z);return d>=22&&d<=62&&worldValid(n,radius+.2);}),heading=Math.atan2(seen.vx??0,seen.vz??1),used=new Set(),plan=[];
 const offsets=role==='intercept'?[.8,-.8,0,1.8,-1.8,Math.PI]:role==='patrol'?[-1.8,1.8,Math.PI,-.8,.8,0]:[0,.8,-.8,1.8,-1.8,Math.PI];
 for(const offset of offsets){let best=-Infinity,pick;
  for(const n of candidates){if(used.has(n))continue;const dx=n.x-seen.x,dz=n.z-seen.z,d=Math.hypot(dx,dz),occupied=plan.length===0?reserved.reduce((penalty,p)=>penalty+Math.max(0,24-Math.hypot(n.x-p.x,n.z-p.z))*1.6,0):0;
   const score=(dx*Math.sin(heading+offset)+dz*Math.cos(heading+offset))/d*20-Math.abs(d-40)*.2-Math.abs(n.y-(seen.y??0))*.6-occupied;
   if(score>best){best=score;pick=n;}
  }if(pick){used.add(pick);plan.push({...pick});}
 }return plan;
}
function localPatrol(a,m){m.patrol=(m.patrol??0)+1;const angle=m.patrol*2.399963,tx=a.x+Math.sin(angle)*45,tz=a.z+Math.cos(angle)*45;let best=Infinity,pick=a;for(const n of WORLD_NODES){const d=Math.hypot(n.x-a.x,n.z-a.z);if(d<20||d>70||!worldValid(n,(a.radius??2.7)+.2))continue;const score=Math.hypot(n.x-tx,n.z-tz)+Math.abs(n.y-a.y)*2;if(score<best){best=score;pick=n;}}return {...pick};}
// Inspect the real escape route, not just its endpoint. Only visible threats enter this planner.
export function worldEscapeClearance(a,threat,path,horizon=80){
 if(!path.length)return -Infinity;
 let nearest=Math.hypot(a.x-threat.x,a.z-threat.z),remaining=horizon,from=a;
 for(const to of path){const dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz),portion=Math.min(1,remaining/(length||1)),sx=dx*portion,sz=dz*portion,t=clamp(((threat.x-from.x)*sx+(threat.z-from.z)*sz)/(sx*sx+sz*sz||1),0,1);nearest=Math.min(nearest,Math.hypot(from.x+sx*t-threat.x,from.z+sz*t-threat.z));remaining-=length;if(remaining<=0)break;from=to;}
 return nearest;
}
export function worldEscapePlan(a,threat,preferred){
 const score=n=>Math.hypot(n.x-threat.x,n.z-threat.z)-Math.hypot(n.x-a.x,n.z-a.z)*.35;
 const plan=target=>{const path=worldRoute(a,target);return{target,path,clearance:worldEscapeClearance(a,threat,path)};};
 let best=plan(preferred);const gap=Math.hypot(a.x-threat.x,a.z-threat.z),safe=Math.max((a.radius??2.7)+(threat.radius??2.7)+5,Math.min(28,gap*.6));
 if(best.clearance>=safe)return best;
 // At most one alternative per direction; normal open-ground decisions need only one route.
 const sectors=new Array(8);for(const n of WORLD_NODES){const dx=n.x-a.x,dz=n.z-a.z,d=Math.hypot(dx,dz);if(d<22||d>65||!worldValid(n,(a.radius??2.7)+.2))continue;const sector=Math.floor((Math.atan2(dz,dx)+Math.PI)*4/Math.PI)%8;if(!sectors[sector]||score(n)>score(sectors[sector]))sectors[sector]=n;}
 for(const n of sectors.filter(Boolean).sort((a,b)=>score(b)-score(a))){const candidate=plan(n);if(candidate.clearance>best.clearance+.001||Math.abs(candidate.clearance-best.clearance)<=.001&&score(n)>score(best.target))best=candidate;if(best.clearance>=safe)break;}
 return best;
}
// Bounded team evasion uses only observations supplied by the runner's senses.
export function worldEscapeTeamPlan(a,threats,prior){
 const forecasts=threats.map(t=>{const cap=Math.min(1,24/(Math.hypot(t.vx??0,t.vz??0)||1)),p={x:t.x+(t.vx??0)*cap*1.2,z:t.z+(t.vz??0)*cap*1.2,y:t.y};return{...t,end:worldTraversable(t,p,(t.radius??2.7)-.05)?p:t};}),top=BODY.dash*(a.tuning?.speed??1),endpoint=n=>Math.min(...forecasts.map(t=>Math.min(Math.hypot(n.x-t.x,n.z-t.z),Math.hypot(n.x-t.end.x,n.z-t.end.z))-(a.radius+t.radius)))-Math.hypot(n.x-a.x,n.z-a.z)*.2;
 const sectors=new Array(8);for(const n of WORLD_NODES){const dx=n.x-a.x,dz=n.z-a.z,d=Math.hypot(dx,dz);if(d<22||d>88||!worldValid(n,(a.radius??2.7)+.2))continue;const sector=Math.floor((Math.atan2(dz,dx)+Math.PI)*4/Math.PI)%8;if(!sectors[sector]||endpoint(n)>endpoint(sectors[sector]))sectors[sector]=n;}
 const choices=[];if(prior&&Math.hypot(prior.x-a.x,prior.z-a.z)>12&&Math.hypot(prior.x-a.x,prior.z-a.z)<100&&worldValid(prior,a.radius+.2))choices.push(prior);const velocity=Math.hypot(a.vx,a.vz);if(velocity>3){const forward={x:a.x+a.vx/velocity*60,z:a.z+a.vz/velocity*60},coast=WORLD_NODES.filter(n=>Math.hypot(n.x-forward.x,n.z-forward.z)<18&&worldValid(n,a.radius+.2)).sort((x,y)=>Math.hypot(x.x-forward.x,x.z-forward.z)-Math.hypot(y.x-forward.x,y.z-forward.z))[0];if(coast)choices.push(coast);}for(const n of sectors.filter(Boolean).sort((a,b)=>endpoint(b)-endpoint(a)))if(choices.length<6&&!choices.includes(n))choices.push(n);
 let best={target:a,path:[],clearance:-Infinity,score:-Infinity};
 for(const target of choices){const path=worldRoute(a,target);if(!path.length)continue;let from=a,travel=0,min=Infinity,sum=0,count=0;
  for(const to of path){const length=Math.hypot(to.x-from.x,to.z-from.z),steps=Math.max(1,Math.ceil(length/8));for(let i=1;i<=steps;i++){const fraction=i/steps,x=from.x+(to.x-from.x)*fraction,z=from.z+(to.z-from.z)*fraction,at=Math.min(1,(travel+length*fraction)/Math.max(8,top)/1.2),margin=Math.min(...forecasts.map(t=>Math.min(Math.hypot(x-t.x,z-t.z),Math.hypot(x-(t.x+(t.end.x-t.x)*at),z-(t.z+(t.end.z-t.z)*at)))-a.radius-t.radius));min=Math.min(min,margin);sum+=margin;count++;}travel+=length;from=to;if(travel>=48)break;}
  const first=path.find(p=>Math.hypot(p.x-a.x,p.z-a.z)>2)??target,dx=first.x-a.x,dz=first.z-a.z,alignment=velocity>3?(a.vx*dx+a.vz*dz)/(velocity*(Math.hypot(dx,dz)||1)):1,turnCost=(1-alignment)*Math.min(30,velocity)*(a.grounded&&worldSurface(a.x,a.z)==='grip'?1:2),cover=forecasts.filter(t=>!worldSight({...t,y:t.y+3},{...target,y:target.y+3})).length*4,exits=[[18,0],[-18,0],[0,18],[0,-18]].filter(([x,z])=>worldTraversable(target,{x:target.x+x,z:target.z+z},a.radius+.2)).length,pressure=Math.min(...threats.map(t=>Math.hypot(t.x-a.x,t.z-a.z)))<50,score=min*4+sum/Math.max(1,count)*.45+cover+exits*4+(target===prior?(pressure?4:12):0)-turnCost;if(score>best.score)best={target,path,clearance:min,score};if(best.clearance>22&&Math.min(...threats.map(t=>Math.hypot(t.x-a.x,t.z-a.z)))>65)break;
 }return best;
}
// One room probe per current path leg; old actors and paths are not retained.
const worldSteeringMemos = new WeakMap();
function steeringRoom(a, goal, next) {
 const dx=goal.x-a.x, dz=goal.z-a.z, d=Math.hypot(dx,dz);
 if(!next||d<1e-6)return .25;
 let room=.25;
 for(const r of [1.5,3,6,10]) {
  const to={x:goal.x+dx/d*r,z:goal.z+dz/d*r};
  if(!worldTraversable(goal,to,(a.radius??2.7)+.2))break;
  room=r;
 }
 return room;
}
// Only real input is returned: acceleration, speed caps and collisions stay in worldMove.
export function worldSteering(a, goal, next, {sprint=true,room=10}={}) {
 if(!Number.isFinite(goal?.x)||!Number.isFinite(goal?.z))return {x:0,z:0,dash:false,jump:false};
 const dx=goal.x-a.x,dz=goal.z-a.z,d=Math.hypot(dx,dz),t=a.tuning??{};
 const top=(sprint?BODY.dash:BODY.max)*(t.speed??1);
 // Pass through intermediate points; only the actual destination needs a full stop.
 let speed=next?top:Math.min(top,d*2);
 if(next&&d>1e-6) {
  const nx=next.x-goal.x,nz=next.z-goal.z,length=Math.hypot(nx,nz);
  const cos=length?(dx*nx+dz*nz)/(d*length):1;
  if(cos<.96) {
   const grounded=a.grounded!==false,grip=!a.slippery&&worldSurface(a.x,a.z)==='grip';
   const drive=grounded&&grip?100*(t.accel??1):BODY.accel*(t.accel??1)*(grounded?1:.22)*(grounded&&sprint?WORLD_DASH_FORCE:1);
   const drag=grounded?(grip?4.7:.6)*(t.brake??1):.08;
   // The reserve accounts for discrete waypoint changes and the motor's response time.
   const corner=Math.min(top,Math.sqrt(drive*(t.turn??1)*Math.max(.25,room)*.12/Math.max(.25,1-cos)));
   const v=Math.hypot(a.vx,a.vz),slope=grounded?worldGradient(a.x,a.z):{x:0,z:0};
   const downhill=v>1?-(slope.x*a.vx+slope.z*a.vz)/v*BODY.gravity:0;
   const brake=Math.max(drive*.3,drive+drag*corner-downhill);
   speed=Math.min(speed,Math.sqrt(corner*corner+2*brake*Math.max(0,d-5)));
  }
 }
 if(a.grounded!==false&&!a.slippery&&worldSurface(a.x,a.z)==='grip')return{x:dx/(d||1)*speed/top,z:dz/(d||1)*speed/top,dash:!!sprint,jump:false};
 let x=dx/(d||1)*speed-a.vx,z=dz/(d||1)*speed-a.vz,n=Math.hypot(x,z);
 if(n>1){x/=n;z/=n;}
 return {x,z,dash:!!sprint,jump:false};
}
// Roles choose destinations, never position corrections or knowledge through walls.
export function worldHuntAim(a,other,m){
 const gap=Math.hypot(a.x-other.x,a.z-other.z),speed=Math.hypot(other.vx??0,other.vz??0),top=BODY.dash*(a.tuning?.speed??1);
 const lead=m.role==='intercept'?clamp(gap/top*.65,.35,2.4):m.role==='patrol'?clamp(gap/top*.4,.6,1.5):.18;
 let target={x:other.x+(other.vx??0)*lead,z:other.z+(other.vz??0)*lead,y:other.y};
 if(!worldValid(target,(a.radius??2.7)+.2)||!worldTraversable(other,target,(other.radius??2.7)-.05))target={x:other.x,z:other.z,y:other.y};
 if(m.role==='patrol'&&gap>24&&speed>3){
  const nx=(other.vz??0)/speed,nz=-(other.vx??0)/speed,candidates=[];
  for(const side of[14,-14,22,-22]){const p={x:target.x+nx*side,z:target.z+nz*side};p.y=worldHeight(p.x,p.z);
   if(!worldValid(p,(a.radius??2.7)+.2)||!worldTraversable(other,p,(other.radius??2.7)-.05))continue;
   const occupied=(m.reservedTargets??[]).reduce((sum,q)=>sum+Math.max(0,24-Math.hypot(q.x-p.x,q.z-p.z))*3,0);
   candidates.push({p,score:Math.hypot(a.x-p.x,a.z-p.z)+occupied});
  }
  candidates.sort((a,b)=>a.score-b.score);if(candidates.length)return{target:candidates[0].p,mode:'flank'};
 }
 return{target,mode:m.role==='intercept'?'intercept':'pursuit'};
}
function huntContactApproach(a,observed){
 const radius=a.radius??2.7,padding=radius+.2;
 if(worldValid(observed,padding))return observed;
 const margin=padding+.05;
 const x=clamp(observed.x,-WORLD.width/2+margin,WORLD.width/2-margin);
 const z=clamp(observed.z,-WORLD.depth/2+margin,WORLD.depth/2-margin);
 const y=observed.y??worldHeight(observed.x,observed.z);
 const contact={x:observed.x,y:y+2.7,z:observed.z};
 const candidate=(x,z)=>{
  const p={x,y:worldHeight(x,z),z};
  return Math.abs(p.y-y)<=2.8&&worldValid(p,padding)&&worldSight({...p,y:p.y+2.7},contact,.05)?p:null;
 };
 const edge=candidate(x,z);
 if(edge)return edge;
 for(const distance of [1,2,3,4,6])for(let i=0;i<8;i++){
  const yaw=i*Math.PI/4;
  const p=candidate(x+Math.sin(yaw)*distance,z+Math.cos(yaw)*distance);
  if(p)return p;
 }
 return observed;
}
export function worldPilot(a,other,chasing,time,m,reachObserved=false){
 if(time>=m.next||!m.path){m.next=time+(!chasing&&m.escapeThreats?.length ? .4 : .65);const spec=opponentSpec(m.profile)??OPPONENTS[1],style=m.role==='pursuit'?'direct':m.role==='intercept'?'cutoff':m.role==='patrol'?'patrol':spec.movement?.style??spec.id,visible=!m.suppressSight&&Math.hypot(a.x-other.x,a.z-other.z)<(m.role==='patrol'?70:140)&&worldSight({...a,y:a.y+3},{...other,y:other.y+3});
 const movement=m.lastDecision?Math.hypot(a.x-m.lastDecision.x,a.z-m.lastDecision.z):Infinity;m.stuck=movement<.4&&m.target&&Math.hypot(m.target.x-a.x,m.target.z-a.z)>10?(m.stuck??0)+1:0;m.lastDecision={x:a.x,z:a.z};
 if(visible){m.seen={x:other.x,z:other.z,y:other.y,vx:other.vx,vz:other.vz};m.seenAt=time;m.searchPlan=null;m.searchIndex=0;}m.visible=visible;let target,plannedPath;if(!chasing&&visible&&Math.hypot(a.x-other.x,a.z-other.z)<55)m.sprintUntil=time+1.6;
 if(chasing&&visible){if(['pursuit','intercept','patrol'].includes(m.role)){const aim=worldHuntAim(a,other,m);target=aim.target;m.mode=aim.mode;}else{const horizon=style==='cutoff'?clamp(Math.hypot(a.x-other.x,a.z-other.z)/(BODY.dash*(a.tuning?.speed??1))*.65,.35,2.8):style==='direct'?.18:.8;target={x:other.x+other.vx*horizon,z:other.z+other.vz*horizon,y:other.y};if(!worldValid(target,(a.radius??2.7)+.2)||!worldTraversable(other,target,(other.radius??2.7)-.05))target={x:other.x,z:other.z,y:other.y};m.mode=style==='cutoff'?'intercept':'pursuit';}m.goalSince=time;}
 else if(chasing&&m.seen&&time-m.seenAt<18){const last=m.seen,gap=Math.hypot(a.x-last.x,a.z-last.z),atLast=gap<12;
  // The pursuer checks the actual old contact. Other roles may investigate
  // different exits nearby, using only that observation's direction and age.
  const branch=m.role==='intercept'?gap<70&&time-m.seenAt>=.75:m.role==='patrol'?gap<80&&time-m.seenAt>=1.1:false;
  if(!m.searchPlan&&!atLast&&!branch&&m.stuck<3&&m.path?.length!==0){target={x:last.x,z:last.z,y:last.y};m.mode='last-seen';}
  else{if(!m.searchPlan){m.searchPlan=worldSearchPlan(last,a.radius,{role:m.role,reserved:m.searchReservations});m.searchIndex=0;m.goalSince=time;}if(m.target&&m.mode==='search'&&(Math.hypot(a.x-m.target.x,a.z-m.target.z)<8||time-m.goalSince>4||m.stuck>=3)){
   m.searchIndex++;for(let i=0;i<m.searchPlan.length;i++){const p=m.searchPlan[(m.searchIndex+i)%m.searchPlan.length];if((m.searchReservations??[]).every(q=>Math.hypot(p.x-q.x,p.z-q.z)>=20)){m.searchIndex+=i;break;}}m.goalSince=time;
  }target=m.searchPlan[m.searchIndex%m.searchPlan.length];m.mode='search';}
 }
 else if(!chasing&&m.escapeThreats?.length){const escape=worldEscapeTeamPlan(a,m.escapeThreats,m.target);target=escape.target;plannedPath=escape.path;m.mode='escape';m.goalSince=time;}
 else if(!chasing&&visible){let best=-Infinity;const candidates=[];for(let i=0;i<WORLD_NODES.length;i+=3){const n=WORLD_NODES[i],distance=Math.hypot(n.x-a.x,n.z-a.z);if(distance<22||distance>75||!worldValid(n,(a.radius??2.7)+.2))continue;candidates.push({n,score:Math.hypot(n.x-other.x,n.z-other.z)-distance*.35});}candidates.sort((a,b)=>b.score-a.score);for(const c of candidates.slice(0,24)){const score=c.score+(worldSight({...other,y:other.y+3},{...c.n,y:c.n.y+3})?0:12+spec.cover*4);if(score>best){best=score;target=c.n;}}if(target){const escape=worldEscapePlan(a,other,target);target=escape.target;plannedPath=escape.path;}m.mode='escape';m.goalSince=time;
 }
 if(!target){if(m.target&&time-(m.goalSince??0)<4&&Math.hypot(a.x-m.target.x,a.z-m.target.z)>8&&m.stuck<3)target=m.target;else{target=localPatrol(a,m);m.goalSince=time;}m.mode='patrol';}
 if(chasing&&reachObserved&&['pursuit','intercept','last-seen'].includes(m.mode))target=huntContactApproach(a,target);
 m.path=plannedPath??worldRoute(a,target);m.target={...target};m.at=worldRouteLookahead(a,m.path,0,!chasing&&m.escapeThreats?.length?m.escapeThreats:!chasing&&visible?m.seen:null);
 }
 const path=m.path??[];while(m.at<path.length-1&&Math.hypot(path[m.at].x-a.x,path[m.at].z-a.z)<2.8)m.at++;const goal=path[m.at]??a,next=path[m.at+1];let memo=worldSteeringMemos.get(a);if(!memo||memo.path!==path||memo.at!==m.at||memo.radius!==a.radius){memo={path,at:m.at,radius:a.radius,room:steeringRoom(a,goal,next)};worldSteeringMemos.set(a,memo);}return worldSteering(a,goal,next,{sprint:chasing||time<(m.sprintUntil??0),room:memo.room});
}
function startSpec(id,name,hint,p,c,swap=false){const pair=(a,b)=>Object.freeze({player:Object.freeze([...a]),cpu:Object.freeze([...b])});return Object.freeze({id,name,hint,escape:pair(p,c),chase:swap?pair(c,p):pair(p,c)});}
export const WORLD_STARTS=Object.freeze([startSpec('boulevard','大通り','直線の勝負',[0,80],[8,-2]),startSpec('hill','氷の丘','坂とすべり',[-245,0],[-309,0],true),startSpec('courtyard','中庭','入口の読み合い',[0,-80],[0,0],true),startSpec('garden','庭のこみち','近道と氷',[-112,64],[-112,128],true),startSpec('basin','氷のくぼ地','勢いと切り返し',[112,132],[112,212],true)]);
export const worldStart=id=>WORLD_STARTS.find(s=>s.id===id);
export function worldNextStart(selection='auto',round=0){if(selection==='auto'){if(!Number.isSafeInteger(round)||round<0)throw Error('invalid start cycle');return WORLD_STARTS[round%WORLD_STARTS.length];}const found=worldStart(selection);if(!found)throw Error('invalid start');return found;}
export function worldMatch(role='escape',duration=WORLD.duration,opponent='cutoff',{playerRadius=2.7,startKey='boulevard'}={}){if(!Number.isFinite(playerRadius)||playerRadius<2||playerRadius>6)throw Error('invalid body');const s=match(role,duration,opponent),area=worldStart(startKey);if(!area)throw Error('invalid start');const points=area[role],spawn=p=>Object.assign(actor(p[0],p[1]),{y:worldHeight(p[0],p[1])});s.rules=WORLD_RULES;s.world=true;s.startKey=startKey;s.player=spawn(points.player);s.player.radius=playerRadius;s.cpu=spawn(points.cpu);if(opponentSpec(opponent).movement)s.cpu.tuning=opponentSpec(opponent).movement;s.cpu.radius=(WORLD_RADII[characterById.get(opponent)?.profileKey]??3.2);if(!worldValid(s.player,playerRadius+.1)||!worldValid(s.cpu,s.cpu.radius+.1)||Math.hypot(s.player.x-s.cpu.x,s.player.z-s.cpu.z)<playerRadius+s.cpu.radius+16)throw Error('unsafe start');const sign=role==='chase'?1:-1,dx=(s.cpu.x-s.player.x)*sign,dz=(s.cpu.z-s.player.z)*sign;s.player.yaw=Math.atan2(dx,dz);s.cameraYaw=Math.atan2(-dx,-dz);s.cpu.yaw=Math.atan2((s.player.x-s.cpu.x)*sign*-1,(s.player.z-s.cpu.z)*sign*-1);s.memory={profile:opponent,next:0};return s;}
export function worldStep(s,input={},dt=STEP){if(!['countdown','playing'].includes(s.phase))return s;if(s.countdown>0){s.countdown=Math.max(0,s.countdown-dt);if(!s.countdown)s.phase='playing';return s;}s.phase='playing';const elapsed=Math.min(dt,s.duration-s.time);s.time=Math.min(s.duration,s.time+elapsed);worldMove(s.player,input,elapsed);worldMove(s.cpu,worldPilot(s.cpu,s.player,s.role==='escape',s.time,s.memory),elapsed);const caught=Math.hypot(s.player.x-s.cpu.x,s.player.z-s.cpu.z)<=(s.player.radius??2.7)+(s.cpu.radius??2.7)&&Math.abs(s.player.y-s.cpu.y)<5.4&&worldSight({...s.player,y:s.player.y+2},{...s.cpu,y:s.cpu.y+2},.05);if(caught||s.time>=s.duration){s.phase='finished';s.result={caught,win:s.role==='chase'?caught:!caught,time:s.time};}return s;}

// Camera planning shares actual wall/arch occlusion, without renderer state.
function cameraRayClear(target,p){return p.y>worldHeight(p.x,p.z)+.2&&worldSight(target,p,.8);}
export function worldCameraPose(target,{yaw=0,pitch=.38,distance=31,minDistance=16,previousYaw=yaw,maxTurn=Math.PI/24}={}){
 const cast=(angle,elevation)=>{const dx=Math.sin(angle)*Math.cos(elevation)*distance,dy=Math.sin(elevation)*distance,dz=Math.cos(angle)*Math.cos(elevation)*distance,at=t=>({x:target.x+dx*t,y:target.y+dy*t,z:target.z+dz*t});let t=1;if(!cameraRayClear(target,at(1))){let low=0,high=1;for(let i=0;i<7;i++){const mid=(low+high)/2;if(cameraRayClear(target,at(mid)))low=mid;else high=mid;}t=Math.max(0,low-.012);}return{position:at(t),yaw:angle,pitch:elevation,distance:distance*t,adjusted:t<.999};};
 let best=cast(yaw,pitch);const delta=Math.atan2(Math.sin(previousYaw-yaw),Math.cos(previousYaw-yaw));if(best.distance>=minDistance){if(Math.abs(delta)>maxTurn){const returning=cast(previousYaw+clamp(-delta,-maxTurn,maxTurn),pitch);returning.adjusted=true;if(returning.distance>=minDistance)return returning;const held=cast(previousYaw,pitch);held.adjusted=true;if(held.distance>=minDistance)return held;}return best;}const sign=delta>0?1:-1;
 for(const offset of[sign*Math.PI/3,sign*Math.PI/2,-sign*Math.PI/3,-sign*Math.PI/2,Math.PI]){const p=cast(yaw+offset,pitch);p.adjusted=true;if(p.distance>=minDistance)return p;if(p.distance>best.distance)best=p;}
 const above=cast(yaw,1.12);above.adjusted=true;return above.distance>best.distance?above:best;
}
// An automatic camera dodge must not steer a held stick/key into another direction.
export function worldCameraInput(memory,x,z,renderYaw){const length=Math.hypot(x,z);if(length>1){x/=length;z/=length;}const previous=Math.hypot(memory.x??0,memory.z??0),direction=length>1e-8&&previous>1e-8?(x*memory.x+z*memory.z)/(Math.hypot(x,z)*previous):1;if(length<.01||previous<.01||direction<.98)memory.yaw=renderYaw;memory.x=x;memory.z=z;const yaw=memory.yaw??renderYaw;return{x:x*Math.cos(yaw)+z*Math.sin(yaw),z:-x*Math.sin(yaw)+z*Math.cos(yaw)};}

