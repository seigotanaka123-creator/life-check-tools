import{chooseVehicleHeight}from'./imasora-construction-vehicle-elevation.mjs?v=120ov';
import{reelWorldParts}from'./imasora-construction-reel-world.mjs?v=120ps';
import{lightItems,lightParts}from'./imasora-construction-lights.mjs?v=120pl';
import{gardenItems,gardenZones}from'./imasora-construction-garden.mjs?v=120ps';
import{outdoorPaintSurfaces,routeOutdoorPaint}from'./imasora-construction-outdoor-paint.mjs?v=120hh';
import{isCapturedConstructionJson}from'./imasora-construction-json-capture.mjs';
import{outdoorSignItems,outdoorSignParts,outdoorSignTarget}from'./imasora-construction-outdoor-signs.mjs?v=120hh';
import{highProjects,highSiteBounds,highWorldGeometry}from'./imasora-construction-high-world.mjs?v=120pv';
import{inspectBuildingGround}from'./imasora-construction-building-ground.mjs';
import{transportGroundHeightAt,transportGroundHeightReader,transportSiteOrigin}from'./imasora-construction-transport-site.mjs?v=120pv';
import{shovelMachines,shovelDumpBody}from'./imasora-construction-shovel-work.mjs?v=120pv';
import{boxExtent}from'./imasora-construction-native-dump-pose.mjs?v=120pv';
import{FIELD,sharedParkingLayouts}from'./imasora-construction-shared-field.mjs?v=120ey';
import{IMASORA_WORLD_MAPS,normalizedPoint}from'./imasora-world-map-schema.js?v=120mx';
import{WATER_YARDS,SOIL_YARDS,TIMBER_YARDS}from'./imasora-construction-yard-origins.mjs?v=120gb';
import{fieldGroundPose,fieldGroundBounds}from'./imasora-construction-field-contact.mjs?v=120pv';
import{craneWalkVolumes}from'./imasora-construction-crane-walk.js?v=120pv';
import{worldSoilFloors}from'./imasora-construction-world-soil.js?v=120pv';
import{waterBuildLevel,waterBuildCellSize}from'./imasora-construction-water-build.mjs?v=120ov';
import{concreteVehicleGeometry}from'./imasora-construction-concrete/free-vehicle-contact.mjs?v=120pv';
import{freeWorkCells}from'./imasora-construction-concrete/free-work-parts.mjs?v=120hb';
import{upperCastingGeometry,upperSegmentHitsBox}from'./imasora-construction-high-casting.mjs?v=120pv';
import{highWorkBodyHits}from'./imasora-construction-high-work-position.mjs?v=120ov';
import{overlaps}from'./imasora-construction-concrete/free-vehicle-shape.mjs?v=120ov';
const ok=(v,m)=>{if(!v)throw Error(m);};
export const outdoorBoxesHit=(a,b)=>a.y+a.h/2>b.y-b.h/2+.001&&a.y-a.h/2<b.y+b.h/2-.001&&overlaps({x:a.x,z:a.z,hx:a.w/2,hz:a.d/2,heading:a.angle??0},{x:b.x,z:b.z,hx:b.w/2,hz:b.d/2,heading:b.angle??0});
const asBox=b=>({x:b.x,z:b.z,y:((b.minY??0)+(b.maxY??b.obstacleHeight??80))/2,w:(b.localHalfX??b.halfX)*2,d:(b.localHalfZ??b.halfZ)*2,h:(b.maxY??b.obstacleHeight??80)-(b.minY??0),angle:b.rotation??0});
function checkedWorld(world){
 const t=world.constructionTransport,soil=t?.work?.frame.soil,earth=soil&&!isCapturedConstructionJson(soil)?structuredClone(t):t;
 const s=world.constructionSoil,patches=s?.work.patches,needsCopy=patches?.some(p=>!isCapturedConstructionJson(p)),beds=needsCopy?{...s,work:{...s.work,patches:patches.map(p=>isCapturedConstructionJson(p)?p:structuredClone(p))}}:s;
 return earth===t&&beds===s?world:{...world,constructionTransport:earth,constructionSoil:beds};
}
export function outdoorSignObstacles(world,options){return signObstacles(checkedWorld(world),options);}
function signObstacles(world,{includeReel=true,includeTransport=true}={}){
 const bearingFloors=reelWorldParts(world.constructionHighBuild).filter(p=>p.kind==='floor'||p.kind==='ramp-tread'),soilFloors=world.constructionSoil?worldSoilFloors(world.constructionSoil):[],concreteFloors=(world.constructionProfileProject?.freeBuild?.completed??[]).filter(w=>!w.stored).flatMap(freeWorkCells);
 const earthRead=world.constructionTransport?transportGroundHeightReader(world.constructionTransport):()=>0,heightAt=(x,z,reference)=>{let ground=earthRead(x,z,reference)??0;for(const p of soilFloors)if(Math.abs(x-p.x)<=p.size[0]/2&&Math.abs(z-p.z)<=p.size[1]/2)ground=Math.max(ground,p.height);const tops=bearingFloors.filter(p=>Math.abs(x-p.x)<=p.w/2&&Math.abs(z-p.z)<=p.d/2).map(p=>p.y+p.h/2+(p.supportSlopeX??0)*(x-p.x)+(p.supportSlopeZ??0)*(z-p.z)).concat(concreteFloors.filter(p=>p.height>0&&Math.abs(x-p.x)<=(p.w??16)/2&&Math.abs(z-p.z)<=(p.d??16)/2).map(p=>(p.baseY??0)+p.height)).filter(y=>y>=ground-.15);return Number.isFinite(reference)?chooseVehicleHeight(ground,tops,reference):tops.length?Math.min(...tops):ground;},boxes=[];
 for(const p of highProjects(world.constructionHighBuild)){const b=highSiteBounds(p.record.site,p.record.work);boxes.push({...b,y:p.record.site.y+b.h/2,angle:0});}
 const map=IMASORA_WORLD_MAPS.construction;for(const b of world.builtByMap?.construction??[]){const spec=map.buildCatalog.find(c=>c.id===b.catalogId);ok(spec&&Array.isArray(b.position)&&b.position.every(Number.isFinite),'建物の場所をたしかめよう。');const scale=b.scale??[1,1,1];boxes.push({x:b.position[0],y:b.position[1]+spec.size[1]*2.5*scale[1]/2,z:b.position[2],w:spec.size[0]*2.5*scale[0],h:spec.size[1]*2.5*scale[1],d:spec.size[2]*2.5*scale[2],angle:b.rotation?.[1]??0});}
 const bridge=map.entry,at=normalizedPoint(map,bridge.point);boxes.push({x:at[0],y:5,z:at[2],w:bridge.footprint[0]*2.5,d:bridge.footprint[1]*2.5,h:10,angle:bridge.rotationDeg*Math.PI/180});
 const parking=sharedParkingLayouts().find(l=>l.corner===world.constructionParking?.corner);for(const f of parking?.facilities??[])boxes.push({x:f.x,z:f.z,y:30,w:f.hx*2,h:60,d:f.hz*2,angle:0});
 const tr=world.constructionTransport;if(tr&&includeTransport){const o=transportSiteOrigin(tr),f=tr.work.frame,native=shovelMachines(f).map((b,i)=>({...b,...(i!==1&&Number.isFinite(f.machineVehicle?.groundY)?{supportTop:f.machineVehicle.groundY}:{})})).concat({...shovelDumpBody(f),...(Number.isFinite(f.dump.groundY)?{supportTop:f.dump.groundY}:{})});for(const b of native){const r=b.axes?boxExtent(b):b.half??Array(3).fill(b.size/2);boxes.push({x:o[0]+b.position[0],y:b.position[1],z:o[2]+b.position[2],w:r[0]*2,h:r[1]*2,d:r[2]*2,angle:b.axes?0:b.heading??0,...(Number.isFinite(b.supportTop)?{supportTop:b.supportTop}:{})});}}
 for(const [record,yards]of[[world.constructionWater,WATER_YARDS],[world.constructionSoil,SOIL_YARDS]]){const o=yards[record?.siteIndex];if(!o)continue;const frame=fieldGroundPose(record.work,{x:o[0],z:o[1]},heightAt),g=fieldGroundBounds(frame,[44,38,65]);boxes.push({x:o[0]+g.x,y:(g.minY+g.maxY)/2,z:o[1]+g.z,w:g.width,h:g.maxY-g.minY,d:g.depth,angle:0,supportTop:frame.position[1]});}
 const timber=world.constructionTimber,to=TIMBER_YARDS[timber?.siteIndex];if(to){const v=timber.work.rig.vehicle,base=heightAt(to[0]+v.x,to[1]+v.z,v.groundY),parts=new Set(timber.work.parts.map(p=>p.id));for(const b of craneWalkVolumes(timber.work)){const vehicle=!parts.has(b.id);boxes.push({...b,x:to[0]+b.x,y:(vehicle?base:0)+b.y+b.h/2,z:to[1]+b.z,...(vehicle?{supportTop:base}:{})});}}
 if(world.constructionSoil)for(const b of worldSoilFloors(world.constructionSoil))boxes.push({x:b.x,y:(b.underside+b.height)/2,z:b.z,w:b.size[0],h:b.height-b.underside,d:b.size[1],angle:0});
 const water=world.constructionWater,wo=WATER_YARDS[water?.siteIndex];if(wo)for(const b of water.work.waterBuilds??[]){if(!b.q)continue;const level=waterBuildLevel(b),size=waterBuildCellSize(b);for(const c of b.cells)if(c.y<level)boxes.push({x:wo[0]+c.x,y:(c.y+level)/2,z:wo[1]+c.z,w:size,h:level-c.y,d:size,angle:0});}
 const f=world.constructionProfileProject?.freeBuild;if(f?.location){boxes.push(...concreteVehicleGeometry(f,heightAt).walls.map(b=>({...asBox(b),supportTop:b.supportTop??(b.minY??-10)+10})));for(const w of[...(f.completed??[]).filter(w=>!w.stored),...(!['design','complete'].includes(f.stage)?[{...f,...f.location,frame:true}]:[])])for(const c of freeWorkCells(w)){const h=c.height+(w.frame?2:0);if(h>0)boxes.push({x:c.x,y:(c.baseY??0)+h/2,z:c.z,w:(c.w??16)+(w.frame?1:0),h,d:(c.d??16)+(w.frame?1:0),angle:0});}}
 boxes.push(...upperCastingGeometry(world));if(includeReel)boxes.push(...reelWorldParts(world.constructionHighBuild));return boxes;
}
export function assertOutdoorSignsWorld(world){
 const items=outdoorSignItems(world.constructionHighBuild);if(!items.length)return true;world=checkedWorld(world);const obstacles=signObstacles(world).concat(gardenItems(world.constructionHighBuild).flatMap(gardenZones),lightItems(world.constructionHighBuild).flatMap(lightParts)),earthRead=transportGroundHeightReader(world.constructionTransport),heightAt=(x,z)=>earthRead(x,z)??0,prior=[];
 for(const i of items){const parts=outdoorSignParts(i),foot=parts.at(-1),g=inspectBuildingGround([foot.x,i.y,foot.z],[foot.w,28,foot.d],{heightAt,bounds:FIELD});ok(g.valid&&Math.abs(g.y-i.y)<.001,'看板の足元を残してね。地面を変える前に看板を片付けよう。');ok(!parts.some(p=>[...obstacles,...prior].some(b=>outdoorBoxesHit(p,b))),'看板と車・建物・材料が重なるよ。場所をあけてから進もう。');prior.push(...parts);}
 return true;
}
export function outdoorSignToolPath(i,p){const a=i.turn*Math.PI/2,h=Math.atan2(i.x-p.x,i.z-p.z),hand={x:p.x+Math.cos(h)*7.02+Math.sin(h)*8.67,y:p.y+10.51,z:p.z-Math.sin(h)*7.02+Math.cos(h)*8.67},side=Math.sin(a)*(p.x-i.x)+Math.cos(a)*(p.z-i.z)>=0?1:-1,target={x:i.x+Math.sin(a)*1.4*side,y:i.y+22,z:i.z+Math.cos(a)*1.4*side};return[hand,{...hand,y:Math.max(p.y,i.y)+31},{...target,y:Math.max(p.y,i.y)+31},target];}
export function assertOutdoorSignAction(world,a,draft,candidate){
 if(!['SIGN_EDIT','SIGN_UNDO'].includes(a.type))return;const y=draft.position?.y??draft.groundY;ok(draft.map==='construction'&&draft.position&&Number.isFinite(y)&&Number.isFinite(draft.position.x)&&Number.isFinite(draft.position.z),'着地してから看板の道具をひらこう。');
 const p={x:draft.position.x,y,z:draft.position.z,heading:draft.heading??0},all=outdoorSignItems(candidate).flatMap(outdoorSignParts);ok(!highWorkBodyHits(p,p.heading,all),'モンスターから少し離して看板を置こう。');
 if(a.type==='SIGN_UNDO')return;const i=outdoorSignTarget(world.constructionHighBuild,a);ok(i&&Math.hypot(i.x-p.x,i.z-p.z)<=56&&Math.abs(i.y-p.y)<.2,'看板のそばまで歩いてから作業しよう。');
 const solids=signObstacles(checkedWorld({...world,constructionHighBuild:candidate})).concat(outdoorSignItems(candidate).flatMap(outdoorSignParts),a.edit.op==='remove'?outdoorSignParts(i):[],gardenItems(candidate).flatMap(gardenZones),lightItems(candidate).flatMap(lightParts)),path=a.edit.op==='paint'?routeOutdoorPaint(outdoorSignParts(i),outdoorPaintSurfaces(outdoorSignParts(i),a.edit.part,i.y),outdoorSignToolPath(i,p)[0],solids,upperSegmentHitsBox):outdoorSignToolPath(i,p);for(let n=0;n<24;n++)ok(!highWorkBodyHits(p,n*Math.PI/12,solids),'体を向けられる広い場所で作業しよう。');for(let n=1;n<path.length;n++)ok(!solids.some(b=>upperSegmentHitsBox(path[n-1],path[n],b,.35)),'道具の前をあけよう。看板の文字はそのまま残したよ。');return path;
}
