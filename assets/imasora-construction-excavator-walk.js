// 9-1b: solid voxel floors/walls/ceilings, not a top-height-only terrain.
// The approved excavator remains the owner of soil quantities and arm actions.
import {initialExcavator,actExcavator,stepExcavator,armPose,CELL,PLOT,BIN} from './imasora-construction-excavator.js';
import {WALKER,SITE,worldToLocal,localToWorld} from './imasora-construction-loader-physics.js';
import {EX_ACCESS} from './imasora-construction-excavator-access.js';
export const DIG_WALK=Object.freeze({...WALKER,step:8.01,gravity:90,jump:44});
const EPS=1e-6;
const volume=(name,x,y,z,w,h,d,angle=0,step=true)=>({name,x,y,z,w,h,d,angle,step});
export const DIG_FIXED=Object.freeze([
  volume('岩盤',32,-64,112,128,32,128),
  volume('西の地面',(-320+PLOT.minX)/2,-64,0,PLOT.minX+320,64,500),
  volume('東の地面',(320+PLOT.maxX)/2,-64,0,320-PLOT.maxX,64,500),
  volume('入口の地面',32,-64,(-250+PLOT.minZ)/2,128,64,PLOT.minZ+250),
  volume('奥の地面',32,-64,(250+PLOT.maxZ)/2,128,64,250-PLOT.maxZ),
  volume('土の受け箱',BIN.x,0,BIN.z,BIN.width,BIN.height,BIN.depth,0,false)
]);
export function digPlayer(p){return{vy:0,grounded:false,jumpHeld:false,ceilingHit:false,...p};}
export function initialExcavatorWalk(example='dig'){
  if(!['dig','gallery','pit'].includes(example))throw Error('不明な練習区画です');
  const s=initialExcavator();s.example=example;s.loader.player=digPlayer(s.loader.player);
  if(example==='dig'){s.message='掘った土に床・壁・天井の判定があります。掘削後に降車して確認できます。';return s;}
  // Explicit, pre-dug inspection samples. Removed soil is accounted in the bin.
  // They are not claimed as work performed by the player or saved to their game.
  for(const [id,[x,y,z]] of Object.entries(s.terrain)){
    if(x<0||x>=8||z<6||z>=21)continue;
    const floor=example==='pit'?Math.max(-4,-1-Math.floor((z-6)/2)):(z<8?-1:-2);
    const roof=example==='gallery'&&z>=14?2:3;
    if(y>=floor&&y<roof){delete s.terrain[id];s.bin++;}
  }
  s.loader.vehicle={...s.loader.vehicle,x:-165,z:-95};
  s.loader.player=digPlayer({x:32,y:0,z:24,heading:0});s.revision++;
  s.message=example==='gallery'?'横穴の徒歩確認例です。前へ進むと段差を下り、天井のある通路へ入れます。':'深さ32の掘削例です。前へ進んで下り、8刻みの階段から歩いて戻れます。';
  return s;
}
export function horizontalOverlap(p,b,r=DIG_WALK.radius){
  const q=worldToLocal({x:b.x,z:b.z,heading:b.angle||0},p.x,p.z);
  const x=Math.max(0,Math.abs(q.x)-b.w/2),z=Math.max(0,Math.abs(q.z)-b.d/2);
  return x*x+z*z<r*r-EPS;
}
export function bodyOverlap(p,b){return p.y<b.y+b.h-EPS&&p.y+DIG_WALK.height>b.y+EPS&&horizontalOverlap(p,b);}
const inside=p=>p.x-DIG_WALK.radius>=SITE.minX&&p.x+DIG_WALK.radius<=SITE.maxX&&p.z-DIG_WALK.radius>=SITE.minZ&&p.z+DIG_WALK.radius<=SITE.maxZ;
export function excavationVolumes(s,p,{machine=true}={}){
  const out=[...DIG_FIXED],r=DIG_WALK.radius+4;
  // Local broad phase includes one full step and this frame's jump/fall sweep.
  for(let x=Math.floor((p.x-r)/CELL);x<=Math.floor((p.x+r)/CELL);x++)
    for(let z=Math.floor((p.z-r)/CELL);z<=Math.floor((p.z+r)/CELL);z++)
      for(let y=Math.max(-4,Math.floor((p.y-16)/CELL));y<=Math.min(2,Math.floor((p.y+DIG_WALK.height+16)/CELL));y++){
        if(s.terrain[`${x},${y},${z}`])out.push(volume('普通の土',(x+.5)*CELL,y*CELL,(z+.5)*CELL,CELL,CELL,CELL));
      }
  for(const o of s.spoil)if(Math.abs(o.x-p.x)<r+4&&Math.abs(o.z-p.z)<r+4)out.push(volume('排土',o.x,o.y-4,o.z,8,8,8));
  if(!machine)return out;
  const v=s.loader.vehicle,heading=v.heading+s.arm.slew;
  out.push(volume('クローラー',v.x,0,v.z,68,17,86,v.heading,false));
  out.push(volume('キャビン',v.x,9,v.z,60,36+EX_ACCESS.lift,86,heading,false));
  // Fold-out access is used only during the controlled boarding corridor.
  const arm=armPose(s);
  for(let i=0;i<2;i++){
    const a=arm.world[i],b=arm.world[i+1],count=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)/3);
    for(let j=0;j<=count;j++){const t=j/count;out.push(volume('アーム',a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t-3,a.z+(b.z-a.z)*t,6,6,6,0,false));}
  }
  const q=arm.bucket;out.push(volume('バケット',q.x,q.y-8,q.z,22,18,24,heading,false));
  return out;
}
export function digPersonBlocked(s,p,options){return !inside(p)||excavationVolumes(s,p,options).some(b=>bodyOverlap(p,b));}
function verticalTravel(p,dy,boxes){
  let distance=dy,hit='';
  for(const b of boxes){if(!horizontalOverlap(p,b))continue;
    if(dy<0&&p.y>=b.y+b.h-EPS){const gap=Math.min(0,b.y+b.h-p.y);if(gap>distance){distance=gap;hit=b.name;}}
    if(dy>0&&p.y+DIG_WALK.height<=b.y+EPS){const gap=Math.max(0,b.y-p.y-DIG_WALK.height);if(gap<distance){distance=gap;hit=b.name;}}
  }return{distance,hit};
}
const supported=(p,boxes)=>verticalTravel(p,-.002,boxes).distance>-.002+EPS;
function horizontalMove(p,axis,distance,boxes){
  if(!distance)return'';
  const q={...p,[axis]:p[axis]+distance};if(!inside(q))return'外周の柵';
  const blockers=boxes.filter(b=>bodyOverlap(q,b));
  if(!blockers.length){p[axis]=q[axis];return'';}
  if(p.grounded&&p.vy<=0&&blockers.every(b=>b.step)){
    const rise=Math.max(...blockers.map(b=>b.y+b.h-p.y));
    if(rise>EPS&&rise<=DIG_WALK.step&&verticalTravel(p,rise,boxes).distance>=rise-EPS){
      const lifted={...q,y:p.y+rise};
      if(!boxes.some(b=>bodyOverlap(lifted,b))&&supported(lifted,boxes)){p[axis]=q[axis];p.y=lifted.y;return'';}
    }
  }return blockers[0].name;
}
export function stepDigWalker(s,input,dt){
  if(!Number.isFinite(dt)||dt<=0||dt>.05)throw Error('歩行の更新刻みが不正です');
  const p=digPlayer(s.loader.player);let boxes=excavationVolumes(s,p),hit='';
  p.grounded=supported(p,boxes)&&p.vy<=0;
  if(input.jump&&!p.jumpHeld&&p.grounded){p.vy=DIG_WALK.jump;p.grounded=false;}
  p.jumpHeld=!!input.jump;
  const norm=Math.max(1,Math.hypot(input.x||0,input.z||0)),dx=(input.x||0)/norm*DIG_WALK.speed*dt,dz=(input.z||0)/norm*DIG_WALK.speed*dt;
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.3));
  for(let i=0;i<steps;i++){
    boxes=excavationVolumes(s,p);
    hit=horizontalMove(p,'x',dx/steps,boxes)||hit;hit=horizontalMove(p,'z',dz/steps,boxes)||hit;
    p.grounded=supported(p,boxes)&&p.vy<=0;
  }
  p.vy-=DIG_WALK.gravity*dt;
  // Vertical sweep, not a final-position overlap, prevents ceiling tunnelling.
  const dy=p.vy*dt,moved=verticalTravel(p,dy,excavationVolumes(s,p));p.y+=moved.distance;
  p.grounded=dy<0&&moved.distance>dy+EPS;p.ceilingHit=dy>0&&moved.distance<dy-EPS;
  if(p.grounded||p.ceilingHit)p.vy=0;if(p.ceilingHit)hit=`${moved.hit}（頭上）`;
  if(Math.hypot(dx,dz)>EPS)p.heading=Math.atan2(dx,dz);
  return{...s.loader,player:p,hit};
}
export function excavationRouteClear(s,path){
  for(let i=0;i<path.length-1;i++){
    const a=path[i],b=path[i+1],count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)/.4));
    for(let j=0;j<=count;j++){const t=j/count;if(digPersonBlocked(s,{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t},{machine:false}))return false;}
  }return true;
}
export function actExcavatorWalk(s,action){
  if(action==='interact'&&s.loader.mode==='foot'){
    const p=digPlayer(s.loader.player);
    if(Math.abs(p.y)>.05||Math.abs(p.vy)>.1||!supported(p,excavationVolumes(s,p)))return{...s,message:'地上のステップへ戻り、着地してから乗車してください。穴や空中からは乗車できません。'};
  }
  const n=actExcavator(s,action);
  if(action==='home')return{...n,loader:{...n.loader,player:digPlayer(n.loader.player)}};
  if(n.loader.transition&&!excavationRouteClear(n,n.loader.transition.path))return{...s,message:'乗降経路の土・排土・天井が身体に当たります。先に経路を空けてください。'};
  return n;
}
export function stepExcavatorWalk(s,input,dt){
  // Existing kinematic foot motion is kept idle; this module owns 3D walking.
  const n=stepExcavator(s,s.loader.mode==='foot'?{}:input,dt);
  if(s.loader.mode==='foot'){
    n.loader=stepDigWalker(n,input,dt);
    if(n.loader.hit)n.message=`${n.loader.hit}に接触しました。`;
  }
  if(n.loader.transition&&!excavationRouteClear(n,n.loader.transition.path))return{...s,message:'乗降中の経路が塞がっています。安全エリアへ戻って確認してください。'};
  return n;
}
