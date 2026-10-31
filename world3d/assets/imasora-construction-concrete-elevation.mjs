import {reelWorldParts} from './imasora-construction-reel-world.mjs?v=120ps';
import {transportSiteOrigin} from './imasora-construction-transport-site.mjs?v=120pv';
import {nativeEarthHeightReader} from './imasora-construction-native-dump-support.mjs?v=120pv';
import {worldSoilFloors} from './imasora-construction-world-soil.js?v=120pv';
import {outdoorSignObstacles} from './imasora-construction-outdoor-sign-guard.mjs?v=120pv';
import {createVehicleSurfaceIndex} from './imasora-construction-vehicle-elevation.mjs?v=120ov';
import {highWorldGeometry,highProjects} from './imasora-construction-high-world.mjs?v=120pv';
import {freeWorkCells} from './imasora-construction-concrete/free-work-parts.mjs?v=120hb';
import {vehicleSweepProblem} from './imasora-construction-concrete/free-vehicle-contact.mjs?v=120pv';
import {createConcreteVehicleProbe} from './imasora-construction-concrete/workshop-fence.mjs?v=120ov';
import {overlaps} from './imasora-construction-concrete/free-vehicle-shape.mjs?v=120ov';
import {vehicleGroundPose} from './imasora-construction-concrete/free-vehicle-ground.mjs?v=120ov';
// The normal save independently checks the real world. A motor receipt cannot
// create a floor or turn an arbitrary claimed height into a supported position.
export function concreteElevationEnvironment(world){
 const parts=reelWorldParts(world.constructionHighBuild),decks=parts.filter(p=>p.kind==='floor'||p.kind==='ramp-tread');
 const concrete=(world.constructionProfileProject?.freeBuild?.completed??[]).filter(w=>!w.stored).flatMap(freeWorkCells).filter(p=>p.height>0).map(p=>({x:p.x,z:p.z,halfX:(p.w??16)/2,halfZ:(p.d??16)/2,height:(p.baseY??0)+p.height}));
 const high=highProjects(world.constructionHighBuild).flatMap(p=>{const g=highWorldGeometry(p.record);return g.surfaces.map(b=>({...b,height:b.y,halfX:b.w/2,halfZ:b.d/2,rotation:g.angle}));});
 const inside=(x,z,p)=>{const c=Math.cos(p.rotation??0),s=Math.sin(p.rotation??0),dx=x-p.x,dz=z-p.z;return Math.abs(c*dx-s*dz)<=p.halfX+.001&&Math.abs(s*dx+c*dz)<=p.halfZ+.001;};
 const index=createVehicleSurfaceIndex(decks.map(p=>({x:p.x,z:p.z,halfX:p.w/2,halfZ:p.d/2,height:p.y+p.h/2,supportSlopeX:p.supportSlopeX,supportSlopeZ:p.supportSlopeZ})).concat(concrete,high),inside);
 const soil=world.constructionSoil?worldSoilFloors(world.constructionSoil):[],tr=world.constructionTransport,o=tr?transportSiteOrigin(tr):[0,0,0],native=tr?nativeEarthHeightReader(tr.work.frame):()=>0;
 const supportHeightAt=(x,z,reference=0)=>{let earth=native(x-o[0],z-o[2],reference);if(!Number.isFinite(earth))return undefined;for(const p of soil)if(Math.abs(x-p.x)<=p.size[0]/2&&Math.abs(z-p.z)<=p.size[1]/2)earth=Math.max(earth,p.height);return index.heightAt(x,z,earth,reference);};
 const boxes=outdoorSignObstacles({...world,constructionProfileProject:null}).map((b,i)=>({id:b.kind==='ramp-tread'?'ramp-tread-'+i:'elevation-'+i,x:b.x,z:b.z,rotation:b.angle??0,halfX:b.w/2,halfZ:b.d/2,minY:b.y-b.h/2,maxY:b.y+b.h/2,supportSurface:b.kind==='floor'||b.kind==='ramp-tread'}));
 const touches=(x,z,b,r)=>overlaps({x,z,hx:r,hz:r,heading:0},{x:b.x,z:b.z,hx:b.halfX,hz:b.halfZ,heading:b.rotation});
 return {supportHeightAt,terrainTravel:true,blockedAt:createConcreteVehicleProbe(boxes,touches)};
}
export function assertConcreteVehicleMove(before,after,a){
 if(a.type!=='FREE_MOVE'||a.groundY===undefined)return true;
 const f=before.constructionProfileProject?.freeBuild,next=after.constructionProfileProject?.freeBuild;
 if(!f?.location||!next?.location)throw Error('車の走行を確認できません。');
 const env=concreteElevationEnvironment(before),initial=vehicleGroundPose(f,f[a.vehicle],env.supportHeightAt).position.y,from={...f[a.vehicle],groundY:initial};
 const issue=vehicleSweepProblem(f,a.vehicle,from,next[a.vehicle],env,v=>{if(Math.abs(vehicleGroundPose(f,v,env.supportHeightAt).position.y-v.groundY)>.2)throw Error('車は実際の坂を通って同じ高さへ進もう。');});
 if(issue)throw Error(issue);return true;
}
