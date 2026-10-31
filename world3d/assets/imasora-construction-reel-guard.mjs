import {nativeFloatingSoilBoxes} from './imasora-construction-native-soil-layers.mjs?v=120pv';
import{rampItems,rampParts,rampPoint}from'./imasora-construction-reel-ramp.mjs?v=120oz';
import{girders,rebarLeft,girderSupply}from'./imasora-construction-girder-shape.mjs?v=120pl';
import{floorSupported}from'./imasora-construction-reel-levels.mjs?v=120pm';
import{reelWorld,reelWorldParts,reelAddedParts,validateWorldReel}from'./imasora-construction-reel-world.mjs?v=120ps';
import{outdoorSignObstacles,outdoorBoxesHit}from'./imasora-construction-outdoor-sign-guard.mjs?v=120pv';
import{outdoorSignItems,outdoorSignParts}from'./imasora-construction-outdoor-signs.mjs?v=120hh';
import{gardenItems,gardenParts}from'./imasora-construction-garden.mjs?v=120ps';
import{lightItems,lightParts}from'./imasora-construction-lights.mjs?v=120pl';
import{transportGroundHeightReader,transportSiteOrigin,visibleTransportSources}from'./imasora-construction-transport-site.mjs?v=120pv';
import{worldSoilFloors}from'./imasora-construction-world-soil.js?v=120pv';
import{isCapturedConstructionJson}from'./imasora-construction-json-capture.mjs';
import{inspectBuildingGround}from'./imasora-construction-building-ground.mjs';
import{highWorkBodyHits}from'./imasora-construction-high-work-position.mjs?v=120ov';
import{FIELD}from'./imasora-construction-shared-field.mjs?v=120ey';
import{detailPoint}from'./imasora-construction-reel-structure.mjs?v=120pm';
const ok=(v,m)=>{if(!v)throw Error(m);},supportCache=new WeakMap();
export function assertReelWorld(world){
 const reel=reelWorld(world.constructionHighBuild);if(!reel)return true;validateWorldReel(reel);ok(rebarLeft(world)>=0,'鉄骨や歩廊の材料が足りないよ。建築セットの鉄筋材を受け取ろう。');ok(girders(reel.rooms).filter(g=>g.item.stage==='ready').length<=1,'用意した梁を運んでから、次の梁を用意しよう。');if(!reel.rooms.length)return true;
 const original=world.constructionTransport,soil=original?.work?.frame.soil;ok(soil,'足元の地面をたしかめよう。');
 const trusted=isCapturedConstructionJson(soil),terrain=trusted?original:structuredClone(original),patches=world.constructionSoil?.work.patches??[],tops=world.constructionSoil?worldSoilFloors(world.constructionSoil):[];
 // Only immutable captured earth with no extra soil patches shares a support result.
 let cache=trusted&&!patches.length?supportCache.get(soil):null;if(trusted&&!patches.length&&!cache){cache=new Set();supportCache.set(soil,cache);}
 const readEarth=transportGroundHeightReader(terrain),heightAt=(x,z)=>{let y=readEarth(x,z)??0;for(const p of tops)if(Math.abs(x-p.x)<=p.size[0]/2&&Math.abs(z-p.z)<=p.size[1]/2)y=Math.max(y,p.height);return y;};
 const supportContext=cache?JSON.stringify([transportSiteOrigin(terrain),visibleTransportSources(terrain.work.frame).map(b=>[b.position,b.size])]):'';
 for(const r of reel.rooms){if(floorSupported(r,reel.rooms))continue;const key=supportContext+'/'+[r.x0,r.x1,r.z0,r.z1,r.y].join('/');if(cache?.has(key))continue;const ground=inspectBuildingGround([(r.x0+r.x1)/2,r.y,(r.z0+r.z1)/2],[r.x1-r.x0,3,r.z1-r.z0],{heightAt,bounds:FIELD});ok(ground.valid&&Math.abs(ground.y-r.y)<.001,'床の下を平らにしよう。穴や段差が残っているよ。');if(cache){if(cache.size>=128)cache.clear();cache.add(key);}}
 for(const g of girders(reel.rooms).filter(g=>g.item.stage==='ready')){const src=girderSupply(g.item.corner,g.room),beam=reelWorldParts(world.constructionHighBuild).filter(p=>p.girder&&p.detailId===g.item.id&&p.id.startsWith('reel-'+g.room.id+'-')),ground=beam.every(b=>{const g=inspectBuildingGround([b.x,0,b.z],[b.w,16,b.d],{heightAt,bounds:FIELD});return g.valid&&Math.abs(g.y)<.001;});ok(ground,'床の脇を平らにしてから梁を用意しよう。');}
 const ramps=reel.rooms.flatMap(r=>rampItems(r).map(i=>({r,i})));ok(ramps.length<=4,'歩行用の坂道は現場に4本までだよ。');for(const{r,i}of ramps){const parts=rampParts(r,i);ok(parts.every(p=>p.x-p.w/2>=FIELD.minX&&p.x+p.w/2<=FIELD.maxX&&p.z-p.d/2>=FIELD.minZ&&p.z+p.d/2<=FIELD.maxZ),'坂道が現場から出るよ。向きを変えてね。');for(let d=0;d<=i.run;d+=8){const p=rampPoint(r,i,d/i.run);for(const side of[-1,0,1]){const x=p.x+(['north','south'].includes(i.side)?side*i.width/2:0),z=p.z+(['east','west'].includes(i.side)?side*i.width/2:0);ok(Math.abs(heightAt(x,z)-i.baseY)<.1,'坂道の下を平らにしよう。');}}}
 const solids=nativeFloatingSoilBoxes(terrain.work.frame).concat(outdoorSignObstacles(world,{includeReel:false}),outdoorSignItems(world.constructionHighBuild).flatMap(outdoorSignParts),gardenItems(world.constructionHighBuild).flatMap(gardenParts),lightItems(world.constructionHighBuild).flatMap(lightParts));
 ok(!reelWorldParts(world.constructionHighBuild).some(p=>solids.some(b=>!(Number.isFinite(b.supportTop)&&(p.kind==='floor'&&p.y+p.h/2<=b.supportTop+.02||p.kind.startsWith('ramp-')&&p.y+p.h/2<=b.supportTop+8))&&outdoorBoxesHit(p,b))),'車・建物・材料と重なるよ。少し離して作ろう。');return true;
}
function supportAt(collection,p){let y=null;for(const b of reelWorldParts(collection))if(b.kind!=='glass'&&b.y+b.h/2<=p.y+.3&&Math.abs(p.x-b.x)<=b.w/2+.001&&Math.abs(p.z-b.z)<=b.d/2+.001)y=Math.max(y??-Infinity,b.y+b.h/2);return y;}
export function assertReelAction(world,a,draft,candidate){
 if(!['REEL_EDIT','REEL_UNDO'].includes(a.type))return true;
 const p=draft?.position;ok(draft?.map==='construction'&&p&&[p.x,p.y,p.z,draft.heading??0].every(Number.isFinite)&&!draft.ufoBoarded,'地面に降りてから建築リールを使おう。');
 const before=supportAt(world.constructionHighBuild,p),after=supportAt(candidate,p);
 ok(!(before!==null&&Math.abs(p.y-before)<.3&&(after===null||after<before-.001)),'足元の床から離れてから、もどそう。');
 const parts=reelAddedParts(world.constructionHighBuild,candidate);for(let i=0;i<12;i++)ok(!highWorkBodyHits(p,i*Math.PI/6,parts),a.edit?.type==='DOOR_TOGGLE'?'モンスターが扉の通り道にいるよ。少し離れてね。':'モンスターより少し先に作ろう。');
 if(a.edit?.type==='DOOR_TOGGLE'){const r=reelWorld(candidate)?.rooms.find(r=>r.id===a.edit.id),door=r?.structure?.items.find(i=>i.id===a.edit.detailId),point=door?.kind==='door'?detailPoint(r,door):null;ok(point&&Math.hypot(p.x-point.x,p.z-point.z)<=64&&p.y>=r.y-.5&&p.y<=r.y+3.5,'扉のそばまで歩いてから、ひらこう。');}
 if(a.type==='REEL_EDIT'){const old=reelWorld(world.constructionHighBuild),now=reelWorld(candidate),changed=now.rooms.filter(r=>JSON.stringify(r)!==JSON.stringify(old?.rooms.find(o=>o.id===r.id)));ok(changed.every(r=>Math.hypot((r.x0+r.x1)/2-p.x,(r.z0+r.z1)/2-p.z)<700),'見える範囲で作ろう。遠い場所へは歩いて近づこう。');}
 return true;
}
