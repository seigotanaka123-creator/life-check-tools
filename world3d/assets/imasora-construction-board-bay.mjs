import{BOARD_BAY as B,hasBoardBay,boardBayLevels}from'./imasora-construction-board-bay-shape.mjs?v=120gn';
import{highProjects,highLocalPoint,highWorldPoint,highWorldGeometry}from'./imasora-construction-high-world.mjs?v=120gn';
import{transportGroundHeightAt,transportGroundUpperBound}from'./imasora-construction-transport-site.mjs?v=120gn';
import{collides}from'./imasora-construction-crane.js?v=120gn';
import{craneGroundContext,craneGroundObstacles}from'./imasora-construction-crane-ground.mjs?v=120gf';
const key=p=>JSON.stringify([p.id,p.record]);
const ready=(w)=>w.rig.mode==='driving'&&w.work&&w.deployment===1&&!w.held&&!w.rotation&&!w.joining&&!w.rig.transition&&Math.abs(w.rig.vehicle.speed)<.01;
const board=p=>p.w===80&&p.d===56&&p.h===6&&p.fixed&&!p.hover&&!p.carrierId&&Math.hypot(p.vx,p.vy,p.vz)<.01;
export const boardBayCraneAtRest=w=>ready(w)&&w.parts.every(p=>p.fixed&&!p.hover&&!p.carrierId&&p.vx===0&&p.vy===0&&p.vz===0);
export const boardBayQuietInput=(w,input)=>boardBayCraneAtRest(w)&&w.rig.vehicle.speed===0&&Object.entries(input).every(([k,v])=>k==='brake'||v===false||v===0||v===null||v===undefined);
export function boardBayTerrain(world,origin){const record=world.constructionTransport,read=(x,z)=>{const y=transportGroundHeightAt(record,x+origin.x,z+origin.z);return y===null?null:y??0;};read.upperBound=b=>transportGroundUpperBound(record,{minX:b.minX+origin.x,maxX:b.maxX+origin.x,minZ:b.minZ+origin.z,maxZ:b.maxZ+origin.z});return read;}
const fixedGeometry=new Map();
function bayBuildingSolids(collection,origin){const k=JSON.stringify([collection,origin.x,origin.z]);if(fixedGeometry.has(k))return fixedGeometry.get(k);const g=highWorldGeometry(collection),v=[...g.boxes.map(b=>({...b,x:b.x-origin.x,y:b.y-b.h/2,z:b.z-origin.z,angle:b.angle??g.angle})),...g.surfaces.map(b=>({...b,x:b.x-origin.x,y:b.y-2.5,z:b.z-origin.z,h:2.5,angle:b.angle??g.angle}))];if(fixedGeometry.size>=16)fixedGeometry.clear();fixedGeometry.set(k,v);return v;}
export function boardBayLevel(record,p,origin={x:0,z:0}){
 if(!hasBoardBay(record.work))return null;const q=highLocalPoint(record.site,{x:p.x+origin.x,y:p.y,z:p.z+origin.z}),angle=p.angle-record.site.turn*Math.PI/2;
 const level=boardBayLevels(record.work).find(level=>Math.abs(q.y-level*40)<.001);return level!==undefined&&p.w===80&&p.d===56&&p.h===6&&Math.abs(Math.cos(angle))<1e-7&&Math.abs(q.x-B.x)<.001&&q.z>=B.inside-.001&&q.z<=B.outside+.001?level:null;
}
export const boardBayFits=(record,p,origin)=>boardBayLevel(record,p,origin)!==null;
export function boardBayChoices(collection,w,{origin={x:0,z:0}}={}){
 if(!ready(w))return[];const out=[];
 for(const project of highProjects(collection)){
  const r=project.record;if(!hasBoardBay(r.work)||r.work.levels!==r.work.blueprint.storeys.length||r.work.job||r.work.roomWalkVersion)continue;
  const vehicle={x:w.rig.vehicle.x+origin.x,z:w.rig.vehicle.z+origin.z};if(Math.hypot(vehicle.x-r.site.x,vehicle.z-r.site.z)>(r.work.boardBayRetrofit?.version===3?550:430))continue;
  for(const p of w.parts){if(!board(p)||w.joints?.some(j=>JSON.stringify(j).includes(p.id))||!boardBayFits(r,p,origin))continue;
   const local=highLocalPoint(r.site,{x:p.x+origin.x,y:p.y,z:p.z+origin.z}),level=boardBayLevel(r,p,origin);
   for(const [direction,z,label]of[['inside',B.inside,'部屋の中へ運ぶ'],['outside',B.outside,'外の受取台へ戻す']]){
    if(Math.abs(local.z-z)<.001)continue;const end=highWorldPoint(r.site,{x:B.x,y:level*40,z});out.push({id:project.id+':'+p.id+':'+direction,projectId:project.id,key:key(project),partId:p.id,direction,level,label:'建物 '+project.id.slice(9)+'・'+(level?(direction==='inside'?'上の部屋へ運ぶ':'上の受取台へ戻す'):label),from:{x:p.x,y:p.y,z:p.z},target:{x:end.x-origin.x,y:end.y,z:end.z-origin.z},origin:{x:origin.x,z:origin.z},partKey:JSON.stringify([p.id,p.w,p.h,p.d,p.angle])});
   }
  }
 }return out;
}
export function startBoardBay(collection,w,choice){const current=boardBayChoices(collection,w,{origin:choice.origin}).find(c=>c.id===choice.id);if(!current||current.key!==choice.key||JSON.stringify(current.from)!==JSON.stringify(choice.from))throw Error('床板と入口をもう一度たしかめよう。');return{...current,distance:Math.hypot(current.target.x-current.from.x,current.target.z-current.from.z),travelled:0,vehicle:JSON.stringify(w.rig.vehicle)};}
export function stepBoardBay(job,state,dt,{collection,external=[],heightAt=null}={}){
 if(!Number.isFinite(dt)||dt<=0||dt>.1)throw Error('更新刻みをたしかめよう。');
 const p=state.work.parts.find(p=>p.id===job.partId),project=highProjects(collection).find(p=>p.id===job.projectId),stop=reason=>({state,job:null,reason,arrived:false});
 if(!p||!board(p)||!ready(state.work)||state.work.paused||!project||key(project)!==job.key||JSON.stringify(state.work.rig.vehicle)!==job.vehicle||!boardBayFits(project.record,p,job.origin)||JSON.stringify([p.id,p.w,p.h,p.d,p.angle])!==job.partKey)return stop('現場が変わったので止めたよ。床板はその場に残っているよ。');
 const end=['inside','outside'].includes(job.direction)?highWorldPoint(project.record.site,{x:B.x,y:job.level*40,z:job.direction==='inside'?B.inside:B.outside}):null;
 if(!end||boardBayLevel(project.record,p,job.origin)!==job.level||!Number.isFinite(job.distance)||!Number.isFinite(job.travelled)||job.distance<=0||job.travelled<0||job.travelled>job.distance+.0001||!boardBayFits(project.record,{...p,...job.from},job.origin)||Math.abs(job.target.x+job.origin.x-end.x)>.0001||Math.abs(job.target.z+job.origin.z-end.z)>.0001||Math.abs(job.target.y-end.y)>.0001||Math.abs(Math.hypot(job.target.x-job.from.x,job.target.z-job.from.z)-job.distance)>.0001)return stop('運び先をもう一度えらぼう。床板はその場に残っているよ。');
 const expected=job.distance?{x:job.from.x+(job.target.x-job.from.x)*job.travelled/job.distance,z:job.from.z+(job.target.z-job.from.z)*job.travelled/job.distance}:job.from;
 if(Math.hypot(p.x-expected.x,p.z-expected.z)>.001||Math.abs(p.y-job.from.y)>.001)return stop('床板が動いたので止めたよ。運び先をえらび直そう。');
 const w={...state.work,groundPose:craneGroundContext(state.work,heightAt)},volumes=[...external,...bayBuildingSolids(collection,job.origin)].filter(b=>[b.x,b.y,b.z,b.w,b.h,b.d].every(Number.isFinite)).map(b=>({id:b.id,name:b.name,x:b.x,z:b.z,width:b.w,depth:b.d,minY:b.y,height:b.y+b.h,angle:b.angle??0})),solids=craneGroundObstacles(w,volumes,heightAt);
 const rawNext=Math.min(job.distance,job.travelled+B.speed*dt),next=job.distance-rawNext<1e-8?job.distance:rawNext,steps=Math.max(1,Math.ceil((next-job.travelled)/.5));let q=p;
 for(let i=1;i<=steps;i++){const d=job.travelled+(next-job.travelled)*i/steps,t=job.distance?d/job.distance:1,candidate={...p,x:job.from.x+(job.target.x-job.from.x)*t,z:job.from.z+(job.target.z-job.from.z)*t};
  if(!boardBayFits(project.record,candidate,job.origin)||collides(w,candidate,{external:solids}))return stop('通り道にものがあるよ。床板を残して止めたよ。');q=candidate;
 }
 const arrived=next>=job.distance-1e-8,n={...state,revision:state.revision+1,work:{...state.work,revision:state.work.revision+1,parts:state.work.parts.map(a=>a.id===p.id?q:a),message:arrived?'床板を運び終わったよ！':'ローラーで床板を運んでいるよ。'}};
 return{state:n,job:arrived?null:{...job,travelled:next},arrived,progress:job.distance?next/job.distance:1};
}
// Keep visible conveyor travel independent of the world's capped driving
// delta. Every caught-up interval still uses the ordinary swept collision test.
export function advanceBoardBay(job,state,seconds,context){
 if(!Number.isFinite(seconds)||seconds<0||seconds>1)throw Error('搬送時間をたしかめよう。');
 let result={state,job,arrived:false,progress:job.distance?job.travelled/job.distance:0},remaining=seconds;
 while(remaining>1e-9&&result.job){const dt=Math.min(.1,remaining);result=stepBoardBay(result.job,result.state,dt,context);remaining-=dt;}return result;
}
