import {loaderCab} from './imasora-construction-loader-physics.js?v=120ey';
import {planFieldRoute,FIELD_RUN_SPEED,sharedParkingLayouts} from './imasora-construction-shared-field.mjs?v=120ey';
import {vehicleGroundFrame,groundPoint} from './imasora-construction-vehicle-ground-frame.mjs?v=120el';

// These are world-space door approaches, not new origins for saved works.
export function nativeDoorTarget(record,origin,{busy=false,active=false,groundHeightAt=null}={}){
 const w=record?.work,rig=w?.loader??w?.rig,v=rig?.vehicle;
 if(!v||!origin||busy||active)return null;
 if(rig.mode!=='foot'||rig.transition||w.task||w.held||w.rotation||w.joining||record.delivery||w.air?.length||Math.abs(v.speed)>.01||w.body?.grounded===false||rig.player?.grounded===false||Math.abs(rig.player?.vy??0)>.1)return null;
 const c=Math.cos(v.heading),s=Math.sin(v.heading),doorZ=loaderCab(v).seatZ;
 // Six units outside the door marker, within its eight-unit boarding zone.
 // This leaves the normal world's whole-body collider outside the side step.
 if(record.schema===2&&groundHeightAt){try{const g=vehicleGroundFrame(v,(x,z)=>groundHeightAt(origin.x+x,origin.z+z)),p=groundPoint(g,-64,0,doorZ),y=groundHeightAt(origin.x+p[0],origin.z+p[2]);if(!Number.isFinite(y)||Math.abs(y-p[1])>2.1)return null;return{x:origin.x+p[0],z:origin.z+p[2],y,heading:v.heading};}catch{return null;}}
 return{x:origin.x+v.x-64*c+doorZ*s,z:origin.z+v.z+64*s+doorZ*c,y:0,heading:v.heading};
}

// Provides movement input only. The ordinary character controller remains the
// sole owner of position, animation, terrain contact and saved player pose.
export function createNativeDoorNavigator({position,canStand,canStep,allowed=()=>true,onStatus=()=>{},onArrive=()=>{},planner=planNativeDoorRoute}){
 let request=0,abort=null,path=null,target=null,last=null,stalled=0,planning=false;
 function cancel(message=''){request++;abort?.abort();abort=null;path=null;target=null;last=null;stalled=0;planning=false;onStatus(message,false);}
 async function start(id,goal){
  cancel();if(!goal||!allowed())return false;
  const token=request,controller=new AbortController();abort=controller;planning=true;target={...goal,id};onStatus('通り道をさがしているよ…',true);
  try{
   // Timer clamping in an embedded/background browser must not turn hundreds
   // of cooperative yields into hundreds of seconds.
   const yieldTurn=()=>globalThis.scheduler?.yield?globalThis.scheduler.yield():new Promise(resolve=>{if(typeof MessageChannel==='undefined'){setTimeout(resolve,0);return;}const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(null);});
   const result=await planner({...position()},goal.approach??goal,{canStand,canStep,signal:controller.signal,yieldFrame:yieldTurn});
   if(goal.approach){if(!canStand(goal)||!canStep(goal.approach,goal))throw Error('ドアの足掛けの前に通り道を空けてね。');result.push({...goal});}
   if(token!==request||controller.signal.aborted)return false;
   if(!allowed()){cancel('移動を止めたよ。');return false;}
   path=result.map(p=>({...p}));planning=false;last={...position()};onStatus('車のドアへ走っているよ。',true);return true;
  }catch(e){if(token===request)cancel(e.message||'歩ける道が見つからないよ。');return false;}
 }
 function input(dt){
  if(!path)return null;
  if(!allowed()){cancel('移動を止めたよ。');return null;}
  const p=position();
  if(last&&Math.hypot(p.x-last.x,p.z-last.z)<.01)stalled+=dt;else stalled=0;
  last={...p};
  if(stalled>.6){cancel('通り道がふさがったので止まったよ。');return null;}
  while(path.length&&Math.hypot(path[0].x-p.x,path[0].z-p.z)<.08)path.shift();
  if(!path.length){const arrived=target;if(Number.isFinite(arrived.y)&&(!Number.isFinite(p.y)||Math.abs(arrived.y-p.y)>.25)){cancel('ドアと足元の高さが合わないので止まったよ。');return null;}cancel();onStatus('ドアに着いたよ！「運転席に乗る」を押してね。',false);onArrive(arrived);return null;}
  const q=path[0],distance=Math.hypot(q.x-p.x,q.z-p.z),step=Math.min(distance,FIELD_RUN_SPEED*Math.max(0,dt)),scale=Math.min(1,distance/Math.max(.001,FIELD_RUN_SPEED*dt)),next={heading:Math.atan2(q.x-p.x,q.z-p.z),x:p.x+(q.x-p.x)/distance*step,z:p.z+(q.z-p.z)/distance*step};
  if(!canStand(next)||!canStep(p,next)){cancel('通り道が変わったので止まったよ。');return null;}
  return{x:(q.x-p.x)/distance*scale,z:(q.z-p.z)/distance*scale};
 }
 return{start,cancel,input,get running(){return !!path;},get active(){return planning||!!path;},get destination(){return target;},speed:FIELD_RUN_SPEED};
}

// A parked empty vehicle still requires walking to its door. Only an already
// saved rider or interrupted operation may resume at that saved position.
export function nativeSavedWorkPending(record){const w=record?.work,r=w?.loader??w?.rig;return !!r&&(['boarding','driving','exiting'].includes(r.mode)||!!r.transition||!!w.task||!!w.held||!!w.rotation||!!w.joining||!!w.air?.length||!!record.delivery);}

export function nativeDoorCorridors(start,goal){
 const layout=sharedParkingLayouts().find(({parking:p})=>goal.x>=p.minX-60&&goal.x<=p.maxX+60&&goal.z>=p.minZ-60&&goal.z<=p.maxZ+60);if(!layout)return[];
 const p=layout.parking,nodes=[{x:p.minX-24,z:p.minZ-24},{x:p.maxX+24,z:p.minZ-24},{x:p.maxX+24,z:p.maxZ+24},{x:p.minX-24,z:p.maxZ+24}],routes=[];
 for(let i=0;i<4;i++)for(let j=0;j<4;j++)for(const direction of[-1,1]){if(i===j&&direction===1)continue;const path=[nodes[i]];for(let k=i;k!==j;){k=(k+direction+4)%4;path.push(nodes[k]);}routes.push(path);}
 const length=path=>{let d=0,prior=start;for(const p of[...path,goal]){d+=Math.hypot(p.x-prior.x,p.z-prior.z);prior=p;}return d;};return routes.sort((a,b)=>length(a)-length(b));
}
export async function planNativeDoorRoute(start,goal,options={}){
 const corridors=nativeDoorCorridors(start,goal);
 try{return await planFieldRoute(start,goal,{...options,corridors,cell:64,limit:Math.min(options.limit??10000,10000)});}
 catch(error){if(options.signal?.aborted)throw error;return planFieldRoute(start,goal,{...options,cell:20});}
}
