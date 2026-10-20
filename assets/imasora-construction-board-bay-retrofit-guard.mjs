import{boardBaySupports,boardBayDecks,boardLiftStructure,boardLiftBridges,boardBayRetrofitAfter,boardBayRetrofitJobs}from'./imasora-construction-board-bay-shape.mjs?v=120gn';
import{highSelected,highSelectedId,highProjects,highLocalPoint,highWorldPoint,highWorldGeometry}from'./imasora-construction-high-world.mjs?v=120gn';
import{highJobPlan}from'./imasora-construction-high-build.mjs?v=120gn';
import{highWorkBody,highWorkBodyHits,highWorkSolids}from'./imasora-construction-high-work-position.mjs?v=120gn';
import{roomLayoutParts}from'./imasora-construction-room-layout-shape.mjs?v=120gn';
import{entranceDoorParts}from'./imasora-construction-building-door.mjs?v=120gn';
import{roomWalkWorldBoxes}from'./imasora-construction-room-walk-guard.mjs?v=120gn';
import{upperSegmentHitsBox}from'./imasora-construction-high-casting.mjs?v=120gn';
import{createTransportVehicleProbe}from'./imasora-construction-transport-site.mjs?v=120gn';
import{overlaps}from'./imasora-construction-concrete/free-vehicle-shape.mjs';
import{TIMBER_YARDS,WATER_YARDS,SOIL_YARDS}from'./imasora-construction-yard-origins.mjs?v=120gb';
import{assertBoardBaySupportChange}from'./imasora-construction-board-bay-guard.mjs?v=120gn';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const shape=b=>[b.x,b.y,b.z,b.w,b.h,b.d,b.angle??0].join('|');
const hit=(a,b)=>a.y+a.h/2>b.y-b.h/2+1e-7&&a.y-a.h/2<b.y+b.h/2-1e-7&&overlaps({x:a.x,z:a.z,hx:a.w/2,hz:a.d/2,heading:a.angle??0},{x:b.x,z:b.z,hx:b.w/2,hz:b.d/2,heading:b.angle??0});
const bounds=b=>{const c=Math.abs(Math.cos(b.angle??0)),s=Math.abs(Math.sin(b.angle??0)),x=c*b.w/2+s*b.d/2,z=s*b.w/2+c*b.d/2;return{box:b,minX:b.x-x,maxX:b.x+x,minZ:b.z-z,maxZ:b.z+z,minY:b.y-b.h/2,maxY:b.y+b.h/2};};
// Only reject boxes whose entire axis-aligned envelope misses the swept body.
// Every remaining box still uses the same one-unit oriented-body samples.
function nearby(a,b,heading,boxes){const body=highWorkBody(a,heading),end=highWorkBody(b,heading),c=Math.abs(Math.cos(heading)),s=Math.abs(Math.sin(heading)),x=c*body.hx+s*body.hz,z=s*body.hx+c*body.hz,e=1e-6,minX=Math.min(body.x,end.x)-x-e,maxX=Math.max(body.x,end.x)+x+e,minZ=Math.min(body.z,end.z)-z-e,maxZ=Math.max(body.z,end.z)+z+e,minY=Math.min(body.minY,end.minY)-e,maxY=Math.max(body.maxY,end.maxY)+e;return boxes.filter(q=>q.maxX>=minX&&q.minX<=maxX&&q.maxZ>=minZ&&q.minZ<=maxZ&&q.maxY>=minY&&q.minY<=maxY).map(q=>q.box);}
// Both the live preflight and the queued authority run this with current data.
// No path or extra copy of the world's inventory is added to the save.
export function assertBoardBayRetrofitWorld(world,action,candidate){
 const after=highSelected(candidate),before=highProjects(world.constructionHighBuild).find(p=>p.id===highSelectedId(candidate))?.record;if(!before||!after)return true;
 const w=before.work,n=after.work,changing=!same(w.boardBayRetrofit,n.boardBayRetrofit),job=n.job;
 const walking=boardBayRetrofitJobs.has(job?.type)||job?.type==='RETURN'&&n.boardBayRetrofit?.version>=2;if(!changing&&!walking)return true;
 const timber=world.constructionTimber,origin=TIMBER_YARDS[timber?.siteIndex];assertBoardBaySupportChange(world.constructionHighBuild,candidate,timber,origin?{x:origin[0],z:origin[1]}:null);
 const external=roomWalkWorldBoxes(world,before);
 // Keep a clear work area around the parked chassis; never walk or put new
 // bracing through a vehicle while the player is occupied with the building.
 const vehicles=[];for(const [r,yards]of[[world.constructionTimber,TIMBER_YARDS],[world.constructionWater,WATER_YARDS],[world.constructionSoil,SOIL_YARDS]]){const v=(r?.work?.loader??r?.work?.rig)?.vehicle,o=yards[r?.siteIndex];if(v&&o)vehicles.push({...v,x:v.x+o[0],z:v.z+o[1]});}
 const f=world.constructionProfileProject?.freeBuild;if(f?.location)for(const v of[f.truck,f.pump])if(v)vehicles.push({...v,x:f.location.x+v.x,z:f.location.z+v.z});
 for(const v of vehicles)external.push({...highLocalPoint(before.site,{x:v.x,y:32,z:v.z}),w:80,h:64,d:96,angle:v.heading-before.site.turn*Math.PI/2});
 for(const p of highProjects(world.constructionHighBuild))if(p.record!==before){const g=highWorldGeometry(p.record);external.push(...g.boxes.map(b=>({...b,...highLocalPoint(before.site,b),angle:(b.angle??g.angle)-before.site.turn*Math.PI/2})));}
 // Inspect the eventual result before starting as well as at the final commit.
 const future={...n};if(boardBayRetrofitJobs.has(job?.type)){future.job=null;const next=boardBayRetrofitAfter(n,job.type);if(next)future.boardBayRetrofit=next;else delete future.boardBayRetrofit;}
 const solidsFor=s=>highWorkSolids(s).concat(boardBaySupports(s),boardLiftStructure(s),boardLiftBridges(s).map(b=>({...b,y:b.y-1,h:2})),boardBayDecks(s).filter(b=>b.y>0).map(b=>({...b,y:b.y-1,h:2}))),prior=new Set(solidsFor(w).map(shape)),added=solidsFor(future).filter(b=>!prior.has(shape(b)));
 if(added.some(p=>external.some(b=>hit(p,b))))throw Error('柱や梁をつくる場所に材料・作品があるよ。先に動かそう。');
 if(added.some(p=>roomLayoutParts(n,{sweep:true}).some(b=>b!==p&&hit(p,b))))throw Error('補強する場所の家具を先に動かそう。');
 if(!job||!walking)return true;
 const plan=highJobPlan(n,job.type),solids=external.concat(highWorkSolids(w),boardBaySupports(w),boardLiftStructure(w),entranceDoorParts(w)).map(bounds),transport=world.constructionTransport,vehicleBlocked=transport?createTransportVehicleProbe(transport):null;
 for(let i=1;i<plan.route.length;i++){
  const a=plan.route[i-1],b=plan.route[i],length=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z),count=Math.max(1,Math.ceil(length)),heading=length?Math.atan2(b.x-a.x,b.z-a.z):b.heading??0,close=nearby(a,b,heading,solids);
  for(let k=0;k<=count;k++){const q={x:a.x+(b.x-a.x)*k/count,y:a.y+(b.y-a.y)*k/count,z:a.z+(b.z-a.z)*k/count},h=length?Math.atan2(b.x-a.x,b.z-a.z):b.heading??0;
   if(highWorkBodyHits(q,h,close))throw Error('搬入口へ歩く道をあけよう。材料はそのまま残したよ。');
   const p=highWorldPoint(before.site,q);if(vehicleBlocked?.(p.x,p.z,16))throw Error('搬入口のそばの車を少し離そう。');
  }
 }
 const hand={x:plan.end.x,y:plan.end.y+18,z:plan.end.z},target=plan.target;
 if(target&&external.some(b=>upperSegmentHitsBox(hand,target,b,.6)))throw Error('補強の道具が届く場所をあけよう。作品や材料はそのまま残したよ。');
 return true;
}
