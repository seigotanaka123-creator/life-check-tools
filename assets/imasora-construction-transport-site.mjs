import {createBuildingGroundProbe} from './imasora-construction-building-ground.mjs?v=120et';
import {earthBase,earthHoles,earthPatches,patchColumns} from './imasora-construction-field-earth.mjs?v=120fc';
import {soilVoxel,soilTransportGeometry} from './imasora-construction-soil-transport.mjs?v=120fw';
import {boxExtent} from './imasora-construction-native-dump-pose.mjs?v=120fw';
import {fieldWorkOverlaps} from './imasora-construction-field-contact.mjs?v=120fw';
import {transportFences} from './imasora-construction-transport-field.mjs?v=120fc';
import {SITE,WALKER} from './imasora-construction-loader-physics.js?v=120ey';
import {PLOT} from './imasora-construction-excavator.js?v=120fc';
import {EXCAVATION_YARDS,EXCAVATION_GATE,excavationReserved} from './imasora-construction-world-excavation.js?v=120fc';
import {worldTransportSoil} from './imasora-construction-transport-authority.mjs?v=120fw';
import {shovelSoilBoxes,shovelVisibleSource,shovelMachines,shovelDumpBody} from './imasora-construction-shovel-work.mjs?v=120fw';
export {SITE as TRANSPORT_SITE};
const check=(ok,text)=>{if(!ok)throw Error('土運搬の現場：'+text);};
export function createTransportSceneReadStore(store){
 check(store?.name==='imasora-world-authority-v1'&&typeof store.read==='function','表示確認用の保存領域が違います。');
 return{name:store.name,read:()=>store.read(),commit:async()=>{throw Error('この現場の表示確認では保存を変更できません。');},close:()=>store.close?.()};
}
export function transportSiteOrigin(record){
 check(record?.version===2,'人物と車両を含む保存が必要です。');
 const source=worldTransportSoil(record)?.initial.source,site=source?.site,origin=source?.source?.yardOrigin,expected=EXCAVATION_YARDS[site];
 check(expected&&Array.isArray(origin)&&origin.length===3&&origin[0]===expected[0]&&origin[1]===0&&origin[2]===expected[1],'取得した区画と地形の位置が違います。');
 return [...origin];
}
// The renderer can receive a pending source twice (hand-tool and general source
// options). Draw each exact source box once to avoid coplanar duplicate faces.
export function visibleTransportSources(frame,extra=[]){
 const unique=new Map();for(const box of [...shovelVisibleSource(frame),...extra])unique.set(box.position.join(',')+'/'+box.size,box);return [...unique.values()];
}
export function transportWorldPose(record){const o=transportSiteOrigin(record),p=record.work.frame.player;return{x:o[0]+p.x,y:p.y,z:o[2]+p.z,heading:p.heading};}
export function transportSiteOpening(record){const o=transportSiteOrigin(record);return{minX:o[0]+PLOT.minX,maxX:o[0]+PLOT.maxX,minZ:o[2]+PLOT.minZ,maxZ:o[2]+PLOT.maxZ};}
export function transportSiteGate(record){const o=transportSiteOrigin(record);return{x:o[0]+EXCAVATION_GATE.x,y:0,z:o[2]+EXCAVATION_GATE.z,heading:0};}
const groundReservations=new WeakMap();
function openedGroundReservations(soil){
 let boxes=groundReservations.get(soil);if(boxes)return boxes;boxes=[];
 // Merely preparing natural ground for digging must not reserve the entire
 // patch against construction. Reserve only actual openings in its top layer.
 for(const patch of earthPatches(soil).values())for(const [x,z] of patchColumns(soil,patch))for(let dx=0;dx<4;dx++)for(let dz=0;dz<4;dz++){
  const vx=x*4+dx,vz=z*4+dz;if(!soilVoxel(soil,[vx,-1,vz]))boxes.push({x:vx*2+1,z:vz*2+1,w:2,d:2});
 }
 groundReservations.set(soil,boxes);return boxes;
}
const buildingGroundProbes=new WeakMap();
export function transportSiteReserved(record,position,size,{terrainSupport=false}={}){
 const o=transportSiteOrigin(record),f=record.work.frame;
 if(transportFences(f))return excavationReserved(worldTransportSoil(record).initial.source.site,position,size);
 // Catalog placement measures the whole foundation again. Other callers still
 // reserve earth and holes, including concrete approach planning.
 let supported=false;
 if(terrainSupport){if(f.job||f.soil.pending||record.work.scoop||record.work.link||record.work.unload)return true;let probe=buildingGroundProbes.get(f.soil);if(!probe){probe=createBuildingGroundProbe({heightAt:(x,z)=>transportGroundHeightAt(record,x,z)??0});buildingGroundProbes.set(f.soil,probe);}const g=probe.inspect(position,size);supported=g.valid&&Number.isFinite(position[1])&&Math.abs(g.y-position[1])<.001;if(!supported)return true;}
 const earth=supported?soilTransportGeometry({blocks:{},loose:f.soil.loose??{}}):[...shovelSoilBoxes(f.soil).filter(b=>b.position[1]+b.size/2>.001),{position:[(PLOT.minX+PLOT.maxX)/2,0,(PLOT.minZ+PLOT.maxZ)/2],half:[(PLOT.maxX-PLOT.minX)/2,1,(PLOT.maxZ-PLOT.minZ)/2]}];
 const boxes=[...shovelMachines(f),shovelDumpBody(f),...earth].map(b=>{const h=b.axes?boxExtent(b):b.half??Array(3).fill(b.size/2);return{x:b.position[0],z:b.position[2],w:h[0]*2,d:h[2]*2,angle:b.axes?0:b.heading??0};});
 return fieldWorkOverlaps({x:o[0],z:o[2]},position,size,[...boxes,...(supported?[]:openedGroundReservations(f.soil))]);
}
export function transportGateFits(){return EXCAVATION_GATE.x>=SITE.minX+WALKER.radius&&EXCAVATION_GATE.x<=SITE.maxX-WALKER.radius&&EXCAVATION_GATE.z>=SITE.minZ+WALKER.radius&&EXCAVATION_GATE.z<=SITE.maxZ-WALKER.radius;}
export function requireTransportSceneCheckpoint(record){
 const w=record?.work,f=w?.frame;
 check(record?.version===2&&w.mode==='foot'&&!f.job&&!w.scoop&&!w.link&&!w.unload&&!f.soil.pending,'この表示確認は、徒歩で作業を終えて保存した現場を開いてください。途中の保存は保持しています。');
 check(f.soil.containers.shovel.amount===0&&f.soil.containers.storage.amount===0,'この表示確認では、手元の土と保管箱が空の現場を開いてください。保存した土は変更しません。');
 return record;
}
const columnsCache=new WeakMap();
function columns(soil){let index=columnsCache.get(soil);if(!index){index=new Map();for(const box of shovelSoilBoxes(soil)){const r=box.size/2;for(let x=Math.floor((box.position[0]-r)/8);x<=Math.floor((box.position[0]+r)/8);x++)for(let z=Math.floor((box.position[2]-r)/8);z<=Math.floor((box.position[2]+r)/8);z++){const key=x+','+z,list=index.get(key)??[];list.push(box);index.set(key,list);}}columnsCache.set(soil,index);}return index;}
export function transportGroundHeightAt(record,x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z))return undefined;const o=transportSiteOrigin(record),f=record.work.frame,p={x:x-o[0],z:z-o[2]},inside=p.x>=PLOT.minX&&p.x<PLOT.maxX&&p.z>=PLOT.minZ&&p.z<PLOT.maxZ;
 let h=inside||earthBase(f.soil,p.x,p.z)<0?-32:undefined;
 for(const box of [...(columns(f.soil).get(Math.floor(p.x/8)+','+Math.floor(p.z/8))??[]),...visibleTransportSources(f)]){const r=box.size/2;if(p.x>=box.position[0]-r&&p.x<box.position[0]+r&&p.z>=box.position[2]-r&&p.z<box.position[2]+r)h=Math.max(h??0,box.position[1]+r);}
 return h;
}
export function transportVehicleBlockedAt(record,x,z,r=0){
 const o=transportSiteOrigin(record);if(![x,z,r].every(Number.isFinite)||r<0)return true;const f=record.work.frame,px=x-o[0],pz=z-o[2];
 return [...shovelMachines(f),shovelDumpBody(f)].some(b=>{const h=b.axes?boxExtent(b):b.half??Array(3).fill(b.size/2);if(b.position[1]-h[1]>=80)return false;const c=b.axes?1:Math.cos(b.heading??0),sn=b.axes?0:Math.sin(b.heading??0),dx=px-b.position[0],dz=pz-b.position[2];return Math.hypot(Math.max(0,Math.abs(c*dx-sn*dz)-h[0]),Math.max(0,Math.abs(sn*dx+c*dz)-h[2]))<=r;});
}

const siteHolesCache=new WeakMap();export function transportSiteHoles(record){const o=transportSiteOrigin(record),holes=earthHoles(record.work.frame.soil);let result=siteHolesCache.get(holes);if(!result){result=[transportSiteOpening(record),...holes.map(p=>({minX:p.minX+o[0],maxX:p.maxX+o[0],minZ:p.minZ+o[2],maxZ:p.maxZ+o[2]}))];siteHolesCache.set(holes,result);}return result;}

// Conservative geometry bound, including every finite column intersecting the box.
// It is only an early-out above ground; near-contact still checks the full load.
export function transportGroundUpperBound(record,b){
 if(!b||![b.minX,b.maxX,b.minZ,b.maxZ].every(Number.isFinite)||b.maxX-b.minX>1000||b.maxZ-b.minZ>1000||b.maxX<b.minX||b.maxZ<b.minZ)return undefined;
 const o=transportSiteOrigin(record),f=record.work.frame,q={minX:b.minX-o[0],maxX:b.maxX-o[0],minZ:b.minZ-o[2],maxZ:b.maxZ-o[2]},index=columns(f.soil),boxes=new Set(visibleTransportSources(f));let top=0;
 for(let x=Math.floor(q.minX/8);x<=Math.floor(q.maxX/8);x++)for(let z=Math.floor(q.minZ/8);z<=Math.floor(q.maxZ/8);z++)for(const box of index.get(x+','+z)??[])boxes.add(box);
 for(const box of boxes){const r=box.size/2,p=box.position;if(p[0]+r>=q.minX&&p[0]-r<=q.maxX&&p[2]+r>=q.minZ&&p[2]-r<=q.maxZ)top=Math.max(top,p[1]+r);}return top;
}
