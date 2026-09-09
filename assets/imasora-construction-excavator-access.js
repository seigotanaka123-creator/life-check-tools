// Excavator-only access. The wheel loader keeps its original low floor/path.
import {LOADER,WALKER,localToWorld,worldToLocal,routeClear,samplePath} from './imasora-construction-loader-physics.js';
export const EX_ACCESS=Object.freeze({version:2,lift:9,floor:LOADER.floor+9,trackTop:16.6,trackWidth:10.5,trackLength:76.4});
export function trackBlocksPerson(p,vehicle){
  if(p.y>=EX_ACCESS.trackTop+.05)return false;
  const q=worldToLocal(vehicle,p.x,p.z);
  return [-28,28].some(x=>Math.hypot(Math.max(0,Math.abs(q.x-x)-EX_ACCESS.trackWidth/2),Math.max(0,Math.abs(q.z)-EX_ACCESS.trackLength/2))<WALKER.radius+.3);
}
export function accessOuter(slew,side){
  const base={x:0,z:0,heading:0},cab={...base,heading:slew};
  for(let x=50;x<=72;x+=2)if(!trackBlocksPerson({...localToWorld(cab,side*x,-8),y:0},base))return x;
  return 72;
}
export function excavatorAccessPath(vehicle,slew,side,boarding=true){
  const outer=accessOuter(slew,side),x=n=>side*(outer+n),cab={...vehicle,heading:vehicle.heading+slew};
  // Lift outside the tracks, step onto each tread, then enter above the track.
  // Vertical segments prevent diagonal interpolation cutting through a riser.
  const points=[{x:x(8),y:0},{x:x(8),y:6},{x:x(4),y:6},{x:x(4),y:12},{x:x(0),y:12},{x:x(0),y:EX_ACCESS.floor},{x:LOADER.seatX,y:EX_ACCESS.floor}]
    .map(p=>({...localToWorld(cab,p.x,LOADER.seatZ),y:p.y,heading:cab.heading}));
  return boarding?points:points.reverse();
}
export function excavatorAccessClear(path,vehicle,obstacles){
  if(!routeClear(path,obstacles))return false;
  for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i],count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)/.3));
    for(let j=0;j<=count;j++){const t=j/count;if(trackBlocksPerson({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t},vehicle))return false;}
  }return true;
}
export function excavatorAccessAction(loader,slew,obstacles){
  const boarding=loader.mode==='foot';
  if(!boarding&&(loader.mode!=='driving'||Math.abs(loader.vehicle.speed)>.8))return {...loader,message:'ブレーキで停車してから降りてください。'};
  for(const side of boarding?[-1]:[-1,1]){
    let path=excavatorAccessPath(loader.vehicle,slew,side,boarding);
    if(boarding){if(Math.hypot(loader.player.x-path[0].x,loader.player.z-path[0].z)>24)continue;path=[{...loader.player,heading:path[0].heading},...path];}
    if(!excavatorAccessClear(path,loader.vehicle,obstacles))continue;
    return {...loader,mode:boarding?'boarding':'exiting',vehicle:{...loader.vehicle,speed:0},transition:{path,elapsed:0,duration:boarding?1.9:2.1,side,accessVersion:EX_ACCESS.version},message:boarding?'乗降ステップを出し、キャタピラーより上へ足を上げて乗り込みます。':'ステップを使い、キャタピラーの外側へ降ります。'};
  }
  return {...loader,message:boarding?'運転席側の足元へ近づいてください。キャタピラーや障害物を横切る経路では乗車できません。':'降車経路が塞がっています。空いている場所へ移動してください。'};
}
export function upgradeExcavatorAccess(state){
  const l=state.loader,t=l.transition;
  if(t&&!t.accessVersion){
    // Preserve elapsed time, soil and the stored departure point. Only replace
    // the obsolete low wheel-loader corridor; no database write occurs here.
    let path=excavatorAccessPath(l.vehicle,state.arm.slew,t.side,l.mode==='boarding');
    if(l.mode==='boarding')path=[{...t.path[0]},...path];
    const transition={...t,path,accessVersion:EX_ACCESS.version};
    return {...state,loader:{...l,transition,player:{...l.player,...samplePath(path,t.elapsed/t.duration)}}};
  }
  if(['driving','working'].includes(l.mode)&&l.player.y!==EX_ACCESS.floor)return {...state,loader:{...l,player:{...l.player,y:EX_ACCESS.floor}}};
  return state;
}
