// Stage 3-1: flat-ground, kinematic vehicle/boarding prototype. No game-save access.
export const LOADER = Object.freeze({width:60,length:86,floor:9.12,seatZ:-8,seatX:-14,wheelbase:49,wheelRadius:8.9,maxSpeed:100,reverseSpeed:48,acceleration:65,coast:35,brake:190,steering:.47});
export const WALKER = Object.freeze({radius:15.6,height:26.6,speed:48});
export const SITE = Object.freeze({minX:-320,maxX:320,minZ:-250,maxZ:250});
export const OBSTACLES = Object.freeze([
  {id:'横長のコンクリート壁',x:135,z:49,width:80,depth:18,height:20},
  {id:'積みブロック',x:-130,z:98,width:70,depth:54,height:25},
  {id:'側面のコンクリート壁',x:134,z:-80,width:18,depth:90,height:18}
]);
export const SAFE_ZONE = Object.freeze({id:'歩行者退避エリア',x:-260,z:-190,width:110,depth:110,height:0});
export const SAFE_SPAWN = Object.freeze({x:-260,z:-190,y:0,heading:0});
const EPS=.00001, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const approach=(value,target,amount)=>value<target?Math.min(target,value+amount):Math.max(target,value-amount);
// One input path for touch buttons and keyboard; steer +1 means the user's right.
export function loaderDrivingInput(actions=[],codes=[]){
  const held=new Set(actions),keys=new Set(codes),down=(action,...names)=>held.has(action)||names.some(name=>keys.has(name));
  return{steer:Number(down('right','KeyD','ArrowRight'))-Number(down('left','KeyA','ArrowLeft')),throttle:Number(down('accelerate','KeyW','ArrowUp'))-Number(down('reverse','KeyS','ArrowDown')),brake:down('brake','Space')};
}
export function localToWorld(vehicle,x,z){const s=Math.sin(vehicle.heading),c=Math.cos(vehicle.heading);return{x:vehicle.x+x*c+z*s,z:vehicle.z-x*s+z*c};}
export function worldToLocal(vehicle,x,z){const dx=x-vehicle.x,dz=z-vehicle.z,s=Math.sin(vehicle.heading),c=Math.cos(vehicle.heading);return{x:dx*c-dz*s,z:dx*s+dz*c};}
export function polygon(p,width,depth){return[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>localToWorld(p,x*width/2,z*depth/2));}
export function polygonsOverlap(a,b){
  for(const poly of[a,b])for(let i=0;i<4;i++){
    const p=poly[i],q=poly[(i+1)%4],nx=q.z-p.z,nz=p.x-q.x;
    const aa=a.map(v=>v.x*nx+v.z*nz),bb=b.map(v=>v.x*nx+v.z*nz);
    if(Math.max(...aa)<=Math.min(...bb)+EPS||Math.max(...bb)<=Math.min(...aa)+EPS)return false;
  }return true;
}
const rect=o=>polygon({...o,heading:0},o.width,o.depth);
const inside=poly=>poly.every(p=>p.x>=SITE.minX&&p.x<=SITE.maxX&&p.z>=SITE.minZ&&p.z<=SITE.maxZ);
export function vehicleBlocker(vehicle,obstacles=OBSTACLES){
  // Extra 4 units each side cover the steered tyre corners; bucket is inside length 86.
  const p=polygon(vehicle,68,86);
  if(!inside(p))return'外周の柵';
  for(const o of [...obstacles,SAFE_ZONE])if(polygonsOverlap(p,rect(o)))return o.id;
  return'';
}
function personClear(p,obstacles){const poly=polygon({...p,heading:0},WALKER.radius*2,WALKER.radius*2);return inside(poly)&&!obstacles.some(o=>polygonsOverlap(poly,rect(o)));}
export function walkingClear(p,vehicle,obstacles=OBSTACLES){
  if(!personClear(p,obstacles))return false;
  const poly=polygon({...p,heading:0},WALKER.radius*2,WALKER.radius*2);
  // Use the same envelope when walking: parked tyres may still be steered.
  if(polygonsOverlap(poly,polygon(vehicle,68,86)))return false;
  // Parked boarding steps extend beyond the travel envelope, only beside the cab.
  return ![-1,1].some(side=>polygonsOverlap(poly,polygon({...localToWorld(vehicle,side*35,-8),heading:vehicle.heading},10,28)));
}
export function initialLoaderState(){return{mode:'foot',vehicle:{x:0,z:-80,heading:0,speed:0,steering:0,wheelTravel:0},player:{x:-58,z:-88,y:0,heading:0},transition:null,hit:'',message:'車体左側の足元へ近づき、「運転席に乗る」を押してください。'};}
export function stepVehicle(vehicle,input,dt,obstacles=OBSTACLES){
  if(!Number.isFinite(dt)||dt<=0||dt>.05)throw new Error('車両の更新刻みが不正です。');
  const v={...vehicle},throttle=clamp(input.throttle||0,-1,1),steer=clamp(input.steer||0,-1,1);
  // The vehicle faces local +Z with +Y up: driver's right is -X.
  // Positive input is right, but Three's positive yaw turns +Z toward +X (left).
  v.steering=approach(v.steering,-steer*LOADER.steering,dt*1.8);
  const target=throttle*(throttle>=0?LOADER.maxSpeed:LOADER.reverseSpeed);
  v.speed=approach(v.speed,input.brake?0:target,dt*(input.brake?LOADER.brake:throttle?LOADER.acceleration:LOADER.coast));
  const travel=v.speed*dt,angle=travel*2*Math.tan(v.steering)/LOADER.wheelbase;
  const count=Math.max(1,Math.ceil(Math.abs(travel)/.6),Math.ceil(Math.abs(angle)/.008));let hit='';
  for(let i=0;i<count;i++){
    const mid=v.heading+angle/count/2,candidate={...v,x:v.x+Math.sin(mid)*travel/count,z:v.z+Math.cos(mid)*travel/count,heading:v.heading+angle/count};
    hit=vehicleBlocker(candidate,obstacles);if(hit){v.speed=0;break;}
    v.x=candidate.x;v.z=candidate.z;v.heading=candidate.heading;v.wheelTravel+=travel/count;
  }
  v.heading=Math.atan2(Math.sin(v.heading),Math.cos(v.heading));return{vehicle:v,hit};
}
function boardingPath(side){
  const x=side*58,seat=LOADER.seatX;
  // Rise outside the sill, then cross the open doorway at floor height.
  // The short, visible step-up matches the three deployed 3-unit treads.
  return[{x,y:0,z:-8},{x:side*55,y:3,z:-8},{x:side*48,y:6,z:-8},{x:side*41,y:LOADER.floor,z:-8},{x:side*27,y:LOADER.floor,z:-8},{x:seat,y:LOADER.floor,z:-8}];
}
export function transitionPoints(vehicle,side,boarding=true){const p=boardingPath(side).map(v=>({...localToWorld(vehicle,v.x,v.z),y:v.y,heading:vehicle.heading}));return boarding?p:p.reverse();}
export function samplePath(points,t){
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y,p.z-points[i].z));
  let distance=lengths.reduce((a,b)=>a+b,0)*clamp(t,0,1);
  for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1){const q=clamp(distance/(lengths[i]||1),0,1),a=points[i],b=points[i+1];return{x:a.x+(b.x-a.x)*q,y:a.y+(b.y-a.y)*q,z:a.z+(b.z-a.z)*q,heading:b.heading};}distance-=lengths[i];}
  return{...points.at(-1)};
}
export function routeClear(points,obstacles=OBSTACLES){
  // Check the entire corridor, not merely the final dismount point.
  for(let i=0;i<points.length-1;i++){
    const a=points[i],b=points[i+1],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.5));
    for(let j=0;j<=n;j++)if(!personClear({x:a.x+(b.x-a.x)*j/n,z:a.z+(b.z-a.z)*j/n},obstacles))return false;
  }return true;
}
export function boardOption(state,obstacles=OBSTACLES){
  if(state.mode!=='foot')return null;
  // Driver's left door only for boarding. Right door remains a safe exit alternative.
  const points=transitionPoints(state.vehicle,-1),start=points[0];
  if(Math.hypot(state.player.x-start.x,state.player.z-start.z)>24)return null;
  const path=[{...state.player,heading:state.vehicle.heading},...points];
  return routeClear(path,obstacles)?{side:-1,path}:null;
}
export function exitOption(state,obstacles=OBSTACLES){
  if(state.mode!=='driving'||Math.abs(state.vehicle.speed)>.8)return null;
  for(const side of[-1,1]){const path=transitionPoints(state.vehicle,side,false);if(routeClear(path,obstacles))return{side,path};}
  return null;
}
export function actLoader(state,action,obstacles=OBSTACLES){
  if(action==='home')return{...state,mode:'foot',vehicle:{...state.vehicle,speed:0,steering:0},player:{...SAFE_SPAWN},transition:null,hit:'',message:'レンだけ安全エリアへ戻りました。車両は停車した場所に残っています。'};
  if(action!=='interact')return state;
  const boarding=state.mode==='foot';const option=boarding?boardOption(state,obstacles):exitOption(state,obstacles);
  if(!option)return{...state,message:state.mode==='driving'?(Math.abs(state.vehicle.speed)>.8?'ブレーキで停車してから降りてください。':'左右の降車経路が塞がっています。空いている場所まで移動してください。'):'運転席側のステップに近づいてください。'};
  return{...state,mode:boarding?'boarding':'exiting',vehicle:{...state.vehicle,speed:0},transition:{path:option.path,elapsed:0,duration:boarding?1.9:2.1,side:option.side},message:boarding?'ステップから運転席へ乗り込みます。':`${option.side<0?'左':'右'}の開いた経路から降ります。`};
}
export function actorPose(state){
  if(state.mode==='driving')return{...localToWorld(state.vehicle,LOADER.seatX,LOADER.seatZ),y:LOADER.floor,heading:state.vehicle.heading};
  if(state.transition)return samplePath(state.transition.path,state.transition.elapsed/state.transition.duration);
  return state.player;
}
export function stepLoader(state,input,dt,obstacles=OBSTACLES){
  if(!Number.isFinite(dt)||dt<=0||dt>.05)throw new Error('更新刻みが不正です。');
  const next={...state,hit:''};
  if(state.transition){
    next.transition={...state.transition,elapsed:Math.min(state.transition.duration,state.transition.elapsed+dt)};
    if(!routeClear(next.transition.path,obstacles)){
      next.mode=state.mode==='boarding'?'foot':'driving';next.transition=null;next.message='経路が塞がったため乗り降りを中止しました。';return next;
    }
    next.player=actorPose(next);
    if(next.transition.elapsed>=next.transition.duration){next.mode=state.mode==='boarding'?'driving':'foot';next.transition=null;next.message=next.mode==='driving'?'前進・後退とハンドルで走れます。降りるときはブレーキで停車してください。':'降車しました。車体側面のステップから再び乗れます。';}
    return next;
  }
  if(state.mode==='driving'){const moved=stepVehicle(state.vehicle,input,dt,obstacles);Object.assign(next,moved);if(moved.hit)next.message=`${moved.hit}に接触したため止まりました。`;return next;}
  const p={...state.player},len=Math.max(1,Math.hypot(input.x||0,input.z||0)),dx=(input.x||0)/len*WALKER.speed*dt,dz=(input.z||0)/len*WALKER.speed*dt;
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.6));
  for(let i=0;i<count;i++){if(walkingClear({...p,x:p.x+dx/count},state.vehicle,obstacles))p.x+=dx/count;if(walkingClear({...p,z:p.z+dz/count},state.vehicle,obstacles))p.z+=dz/count;}
  if(Math.hypot(dx,dz)>.0001)p.heading=Math.atan2(dx,dz);next.player=p;return next;
}
