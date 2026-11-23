import {excavatorGroundFrame,groundPoint} from './imasora-construction-native-excavator-ground.mjs?v=120pv';
import {transportArea,transportFences} from './imasora-construction-transport-field.mjs?v=120ov';
import * as THREE from './three.module.min.js';
import {createSoilRenderLayers,soilCameraCandidates} from './imasora-construction-soil-instances.mjs?v=121ez';
import {createConstructionEarthMaterial} from './imasora-construction-ground.js?v=120ds';
import {officialCharacter,measureCharacter} from './imasora-construction-layout.js?v=120ob';
import {createDumpModel,updateDumpModel,orientDumpObject} from './imasora-construction-dump-model.js?v=120ov';
import {DUMP_CAB,dumpDriverLocal} from './imasora-construction-dump-cab.mjs?v=120ov';
import {createExcavator,updateExcavatorModel} from './imasora-construction-excavator-model.js?v=121e7';
import {unpackExcavation} from './imasora-construction-excavator-save.js?v=120ov';
import {shovelSoilBoxes,shovelDropFlight,shovelToolPose,shovelVisibleSource,shovelMachines,shovelSegmentHits,shovelDumpObstacles,shovelDumpPoint,shovelMachineState,SHOVEL_STROKE} from './imasora-construction-shovel-work.mjs?v=120pv';
import {nativeDumpPose,nativeDumpPoint,nativeDumpWheelOffsets,nativeDumpDoorPoint} from './imasora-construction-native-dump-pose.mjs?v=120pv';
import {nativeDumpHeightAt} from './imasora-construction-native-dump-support.mjs?v=120pv';
import {LOADER,localToWorld} from './imasora-construction-loader-physics.js?v=120ov';
import {visibleTransportSources} from './imasora-construction-transport-site.mjs?v=120pv';
import {EXCAVATION_FENCES} from './imasora-construction-world-excavation-model.js?v=120ov';
import {excavatorAccessPath} from './imasora-construction-excavator-access.js?v=120ov';
import {armPose} from './imasora-construction-excavator.js?v=120ov';
import {EXCAVATOR_KEYS} from './imasora-construction-guide-data.mjs?v=121fh';
import {nativeStorageBin} from './imasora-construction-transport-field.mjs?v=120ov';
import {dumpStorageFlowPoint} from './imasora-construction-dump-work.mjs?v=120pv';
import {storageDisplay,storageAmountText} from './imasora-construction-storage-display.mjs?v=120pv';
import {pickShovelSurface} from './imasora-construction-hand-placement.mjs?v=120pv';

import {createFirstPersonLens} from './imasora-world-camera-distance.mjs?v=120np';
export function drivingCameraFraming(aspect,high=false){
 const fit=Math.max(1,Math.min(1.55,1/(Number.isFinite(aspect)&&aspect>0?aspect:1)));
 return{distance:(high?250:210)*fit,height:(high?205:125)*Math.sqrt(fit),aimHeight:28,lookAhead:32};
}
export function excavatorCameraYaw(baseYaw,frame,aboard=false){const yaw=baseYaw+(aboard?(frame.machineArm?.slew??0):0);return Math.atan2(Math.sin(yaw),Math.cos(yaw));}
export function excavatorWorkCameraOffset(frame){const angle=(frame.machineVehicle?.heading??0)+(frame.machineArm?.slew??0),c=Math.cos(angle),s=Math.sin(angle);return[180*c-190*s,195,-180*s-190*c];}
export function scoopSurfaceMarker(boxes,heightAt=()=>undefined,outline=true){
 const columns=new Map();
 for(const b of boxes??[]){
  if(!b||!Number.isFinite(b.size)||b.size<=0||!b.position?.every(Number.isFinite))continue;
  const [x,y,z]=b.position,key=[x,z,b.size].join(','),top=y+b.size/2,old=columns.get(key);
  if(!old||top>old.top)columns.set(key,{x,z,size:b.size,top});
 }
 const cells=[...columns.values()].map(c=>{const h=heightAt(c.x,c.z,c.top);return{...c,y:Math.max(c.top,Number.isFinite(h)?h:c.top)+.24};});
 const edges=new Map();
 if(outline)for(const c of cells){const r=c.size/2,p=[[c.x-r,c.y+.07,c.z-r],[c.x+r,c.y+.07,c.z-r],[c.x+r,c.y+.07,c.z+r],[c.x-r,c.y+.07,c.z+r]];
  for(let i=0;i<4;i++){const a=p[i],b=p[(i+1)%4],key=[a.join(','),b.join(',')].sort().join('/');if(edges.has(key))edges.delete(key);else edges.set(key,[a,b]);}
 }
 if(!cells.length)return{cells,edges:[],centre:null};
 const minX=Math.min(...cells.map(c=>c.x-c.size/2)),maxX=Math.max(...cells.map(c=>c.x+c.size/2)),minZ=Math.min(...cells.map(c=>c.z-c.size/2)),maxZ=Math.max(...cells.map(c=>c.z+c.size/2));
 return{cells,edges:[...edges.values()],centre:[(minX+maxX)/2,Math.max(...cells.map(c=>c.y)),(minZ+maxZ)/2]};
}

/** Fit the projected excavator between the controls, in viewport coordinates. */
export function fitExcavatorRearView(bounds,regions,previous=null){
 const width=bounds.right-bounds.left,height=bounds.bottom-bounds.top;
 if(!(width>0&&height>0))return null;
 const offset=(a,b,lo,hi,zoom,wanted)=>
  Math.max(lo-(.5+(a-.5)*zoom),Math.min(hi-(.5+(b-.5)*zoom),wanted));
 let best=null;
 for(const region of regions){
  const {left,top,right,bottom}=region;
  const fit=Math.min(1,(right-left)/width,(bottom-top)/height);
  const x=offset(bounds.left,bounds.right,left,right,fit,0);
  const y=offset(bounds.top,bounds.bottom,top,bottom,fit,0);
  const score=1-fit+Math.hypot(x,y)*.85-(region===previous?.region ? .025 : 0);
  if(!best||score<best.score)best={region,fit,score};
 }
 if(!best)return null;
 const {region,fit}=best,zoom=Math.min(fit,(previous?.zoom??1)+.018);
 // Make room as soon as it is needed, then ease back toward the normal framing.
 return {zoom,x:offset(bounds.left,bounds.right,region.left,region.right,zoom,(previous?.x??0)*.82),
  y:offset(bounds.top,bounds.bottom,region.top,region.bottom,zoom,(previous?.y??0)*.82),region};
}
function scoopOverlay(cells,heightAt){
 const fill=[],trim=[],outline=[],corners=new Map(),edges=new Map(),faces=[];
 const stride=cells.length*4+1;
 function corner(x,z,cell){
  const key=x+','+z,old=corners.get(key);
  if(old){old.y=Math.max(old.y,cell.top+.42);return old;}
  const h=heightAt(x,z);
  const entry={id:corners.size,x,y:Math.max(cell.top,Number.isFinite(h)?h:cell.y)+.42,z};
  corners.set(key,entry);return entry;
 }
 for(const c of cells){
  const r=c.size/2,points=[corner(c.x-r,c.z-r,c),corner(c.x-r,c.z+r,c),corner(c.x+r,c.z+r,c),corner(c.x+r,c.z-r,c)];
  faces.push(points);
  for(let i=0;i<4;i++){
   const a=points[i],b=points[(i+1)%4],key=Math.min(a.id,b.id)*stride+Math.max(a.id,b.id);
   if(!edges.delete(key))edges.set(key,[a,b]);
  }
 }
 for(const [a,b,c,d] of faces)fill.push(a.x,a.y,a.z,b.x,b.y,b.z,c.x,c.y,c.z,a.x,a.y,a.z,c.x,c.y,c.z,d.x,d.y,d.z);
 function rim(out,a,b,nx,nz,width,height){
  const x=nx*width,z=nz*width,y=a.y+height,v=b.y+height;
  out.push(a.x+x,y,a.z+z,b.x+x,v,b.z+z,b.x-x,v,b.z-z,a.x+x,y,a.z+z,b.x-x,v,b.z-z,a.x-x,y,a.z-z);
 }
 for(const [a,b] of edges.values()){
  const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),nx=dz/length,nz=-dx/length;
  rim(trim,a,b,nx,nz,.95,.10);
  rim(outline,a,b,nx,nz,.44,.16);
 }
 return{fill,trim,outline};
}
export function createShovelWorkView(canvas,initial,host=null){
 const renderer=host?null:new THREE.WebGLRenderer({canvas,antialias:true});if(renderer){renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;}
 const scene=host?new THREE.Group():new THREE.Scene();if(host){host.group.add(scene);}else{scene.background=new THREE.Color(0xafd7e2);scene.fog=new THREE.Fog(0xafd7e2,340,780);}
 const eyeLens=createFirstPersonLens();let hostFov=null,hostLensOwned=false,hostProjection=null,rearFrame=null;
 function restoreHostProjection(){
  if(!hostProjection)return;
  Object.assign(host.camera,hostProjection);
  host.camera.updateProjectionMatrix();
  hostProjection=null;
 }
 const restoreHostLens=()=>{
  restoreHostProjection();
  if(!hostLensOwned)return;
  if(host.camera.fov!==hostFov){host.camera.fov=hostFov;host.camera.updateProjectionMatrix();}
  hostLensOwned=false;hostFov=null;rearFrame=null;
 };
 const camera=new THREE.PerspectiveCamera(48,1,.5,1200),occlusionRay=new THREE.Raycaster();if(!host){scene.add(new THREE.HemisphereLight(0xd8f2ff,0x61402e,2.6));const sun=new THREE.DirectionalLight(0xffefcd,2.4);sun.position.set(-100,180,80);scene.add(sun);}
 const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...extra}),ground=mat(0x897f60),earth=host?createConstructionEarthMaterial({color:0xb28c66}):mat(0xa16e46),metal=mat(0xc4d4d3,{metalness:.45}),wood=mat(0x734e2f);
 const cube=new THREE.BoxGeometry(1,1,1),matrix=new THREE.Matrix4(),q=new THREE.Quaternion();
 function box(x,y,z,w,h,d,material){const m=new THREE.Mesh(cube,material);m.position.set(x,y,z);m.scale.set(w,h,d);scene.add(m);return m;}
 // Outside ground never covers the original excavated plot.
 if(!host&&transportFences(initial)){box(-176,-.6,0,288,1,600,ground);box(208,-.6,0,224,1,600,ground);box(32,-.6,-126,128,1,348,ground);box(32,-.6,238,128,1,124,ground);box(32,-32.6,112,128,1,128,earth);
 for(const f of EXCAVATION_FENCES)box(f.x,20,f.z,f.w,40,f.d,mat(0x46594f));}
 if(!host&&!transportFences(initial)){const a=transportArea(initial);box((a.minX-32)/2,-.6,(a.minZ+a.maxZ)/2,-32-a.minX,1,a.maxZ-a.minZ,ground);box((96+a.maxX)/2,-.6,(a.minZ+a.maxZ)/2,a.maxX-96,1,a.maxZ-a.minZ,ground);box(32,-.6,(a.minZ+48)/2,128,1,48-a.minZ,ground);box(32,-.6,(176+a.maxZ)/2,128,1,a.maxZ-176,ground);box(32,-32.6,112,128,1,128,earth);}
 // The main host already owns the physical bin. Standalone views need the
 // same shell so the existing collision footprint has a visible counterpart.
 const initialBin=nativeStorageBin(initial);
 let lastBin=null;
 if(!host){box(initialBin.x,1.5,initialBin.z,initialBin.width,3,initialBin.depth,metal);for(const side of[-1,1]){box(initialBin.x+side*(initialBin.width/2-1.5),5,initialBin.z,3,10,initialBin.depth,metal);box(initialBin.x,5,initialBin.z+side*(initialBin.depth/2-1.5),initialBin.width,10,3,metal);}}
 const contents=storageDisplay(initial.soil,host?.gardenReserved?.()??0),storageSurface=box(...contents.surface.position,...contents.surface.size,earth);
 storageSurface.name='土の保管箱・中身の目印';storageSurface.visible=contents.visible;
 let currentStorage=null;
 function storedSoil(soil,job=null){const pendingText=['store','take'].includes(job?.kind)?(job.kind==='store'?'預け入れ中：':'取り出し中：')+storageAmountText(soil.pending.amount):soil.pending?.from==='storage'&&soil.pending.to==='bucket'?'取り出し中：'+storageAmountText(soil.pending.amount):soil.pending?.from==='dump'&&soil.pending.to==='storage'?'預け入れ中：'+storageAmountText(soil.pending.amount):'',display={...storageDisplay(soil,host?.gardenReserved?.()??0),pendingText};if(currentStorage?.amount===display.amount&&currentStorage.materialId===display.materialId&&currentStorage.pendingText===pendingText)return;currentStorage=display;storageSurface.visible=display.visible;}
 storedSoil(initial.soil);
 const sourceWork=shovelMachineState(initial),excavator=createExcavator();updateExcavatorModel(excavator,sourceWork);scene.add(excavator);
 const dump=createDumpModel();scene.add(dump);const cargo=box(initial.dump.x-18,19,initial.dump.z-28,4,4,4,earth);cargo.visible=false;scene.remove(cargo);dump.userData.bed.add(cargo);
 const doors=[];for(const side of[-1,1]){const marker=new THREE.Mesh(new THREE.PlaneGeometry(16,18),new THREE.MeshBasicMaterial({color:0xe8c76b,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));marker.rotation.x=-Math.PI/2;marker.position.set(side*52,.12,18);scene.add(marker);doors.push(marker);}
 const excavatorDoors=doors.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(16,18),doors[0].material);m.rotation.x=-Math.PI/2;scene.add(m);m.visible=false;return m;});
 const bucketFlow=new THREE.InstancedMesh(cube,earth,24);bucketFlow.visible=false;scene.add(bucketFlow);
 const unloadPreview=box(0,0,0,1,1,1,new THREE.MeshBasicMaterial({color:0xffe2a0,wireframe:true,depthWrite:false}));unloadPreview.visible=false;const flowing=new THREE.InstancedMesh(cube,earth,24);flowing.visible=false;flowing.name='ダンプから運ぶ土';scene.add(flowing);let previewRef=null;
 const digPreview=new THREE.InstancedMesh(cube,new THREE.MeshBasicMaterial({color:0x23dfff,depthWrite:false,transparent:true,opacity:.65,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),1024);digPreview.name='すくう場所・地表';digPreview.visible=false;digPreview.renderOrder=20;scene.add(digPreview);
 const digOutline=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xfffde0,toneMapped:false,depthWrite:false}));digOutline.name='すくう場所・輪郭';digOutline.visible=false;digOutline.renderOrder=21;scene.add(digOutline);
 const scoopCellLimit=1024;
 const scoopSurfacePart=(name,color,order,quads)=>{
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(scoopCellLimit*quads*18),3).setUsage(THREE.DynamicDrawUsage));
  geometry.setDrawRange(0,0);
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  mesh.name=name;mesh.frustumCulled=false;mesh.visible=false;mesh.renderOrder=order;scene.add(mesh);return mesh;
 };
 const scoopPatch=scoopSurfacePart('すくう範囲・面',0x31dbcf,20,1);
 const scoopTrim=scoopSurfacePart('すくう範囲・暗縁',0x183630,21,4);
 const scoopBorder=scoopSurfacePart('すくう範囲・縁',0xd8fff2,22,4);
 const scoopParts=[scoopPatch,scoopTrim,scoopBorder];
 const pinMap=document.createElement('canvas');pinMap.width=pinMap.height=64;
 const pinPen=pinMap.getContext('2d');
 pinPen.beginPath();pinPen.moveTo(12,23);pinPen.lineTo(32,47);pinPen.lineTo(52,23);
 pinPen.lineJoin=pinPen.lineCap='round';pinPen.strokeStyle='#183630';pinPen.lineWidth=14;pinPen.stroke();
 pinPen.strokeStyle='#e0fff5';pinPen.lineWidth=8;pinPen.stroke();
 const pinTexture=new THREE.CanvasTexture(pinMap);pinTexture.colorSpace=THREE.SRGBColorSpace;
 const scoopPin=new THREE.Sprite(new THREE.SpriteMaterial({map:pinTexture,transparent:true,depthWrite:false,toneMapped:false}));
 scoopPin.name='すくう位置・矢印';scoopPin.scale.set(12,12,1);scoopPin.visible=false;scene.add(scoopPin);
 const keySuffix=' ［'+EXCAVATOR_KEYS.scoop+'］';
 const digTexts=['ここをすくう','ここをすくう'+keySuffix,'ここに穴を掘る','ここに穴を掘る'+keySuffix,'土を下ろす場所'];
 const digLabelCanvas=document.createElement('canvas');
 digLabelCanvas.width=512;digLabelCanvas.height=128*digTexts.length;
 const dl=digLabelCanvas.getContext('2d');
 dl.font='bold 60px sans-serif';dl.textAlign='center';dl.textBaseline='middle';
 dl.lineWidth=6;dl.lineJoin='round';dl.strokeStyle='#192a35';dl.fillStyle='#fff9e8';
 digTexts.forEach((label,row)=>{
  dl.strokeText(label,256,65+row*128,483);
  dl.fillText(label,256,65+row*128,483);
 });
 const digLabelTexture=new THREE.CanvasTexture(digLabelCanvas);
 digLabelTexture.colorSpace=THREE.SRGBColorSpace;digLabelTexture.generateMipmaps=false;digLabelTexture.minFilter=THREE.LinearFilter;
 digLabelTexture.repeat.y=1/digTexts.length;
 const digLabel=new THREE.Sprite(new THREE.SpriteMaterial({map:digLabelTexture,transparent:true,depthWrite:false,toneMapped:false}));
 digLabel.name='すくう場所・案内';digLabel.scale.set(58,14.5,1);digLabel.visible=false;scene.add(digLabel);
 let digRef=null,digSoil=null,digDecks=null,digCentre=null,digTone='';
 function drawDigPreview(s,boxes,guide=null){
  const kind=guide?.kind??'scoop',exact=guide?.exact!==false,scoop=kind==='scoop',show=!!boxes?.length&&guide?.validSurface!==false;
  digLabel.visible=show;digPreview.visible=digOutline.visible=show&&!scoop;
  for(const part of scoopParts)part.visible=show&&scoop;
  scoopPin.visible=show&&scoop;
  if(!show){digCentre=null;return;}
  const mode=document.documentElement.dataset.controlDisplay,tone=[kind,exact,mode,!!guide?.basin].join('|');
  if(tone!==digTone){
   digTone=tone;
   digPreview.material.color.set(exact?(kind==='scoop'?0x23dfff:0xffd47b):0xd6e4e6);
   digPreview.material.opacity=exact?.65:.24;
   digOutline.material.color.set(exact?0xfffde0:0xe5f0f2);
   scoopPatch.material.color.set(0x32dbc5);
   scoopPatch.material.opacity=.61;
   scoopBorder.material.color.set(0xe0fff5);
   scoopPin.material.color.copy(scoopBorder.material.color);
   const suffix=scoop&&mode!=='touch'?keySuffix:'';
   const label=scoop?(guide?.basin?'ここに穴を掘る':'ここをすくう'):'土を下ろす場所';
   digLabelTexture.offset.y=1-(digTexts.indexOf(label+suffix)+1)/digTexts.length;
  }
  if(digRef!==boxes||digSoil!==s.soil||digDecks!==s.decks||digPreview.userData.guideKind!==kind){
   digRef=boxes;digSoil=s.soil;digDecks=s.decks;
   const height=(x,z)=>nativeDumpHeightAt(s,x,z,s.machineVehicle?.groundY??0);
   const marker=scoopSurfaceMarker(boxes,height,!scoop);
   if(scoop&&marker.centre){
    const [cx,,cz]=marker.centre,distance=c=>(c.x-cx)**2+(c.z-cz)**2;
    const anchor=marker.cells.reduce((a,b)=>distance(a)<=distance(b)?a:b);
    marker.anchor=[anchor.x,anchor.y+.5,anchor.z];
    const {fill,trim,outline}=scoopOverlay(marker.cells.slice(0,scoopCellLimit),height);
    for(const [part,vertices] of [[scoopPatch,fill],[scoopTrim,trim],[scoopBorder,outline]]){
     const pos=part.geometry.getAttribute('position');
     pos.array.set(vertices);pos.clearUpdateRanges();pos.addUpdateRange(0,vertices.length);
     pos.needsUpdate=true;part.geometry.setDrawRange(0,vertices.length/3);
    }
   }else{
    digPreview.count=Math.min(1024,marker.cells.length);
    marker.cells.slice(0,1024).forEach((c,i)=>{matrix.compose(new THREE.Vector3(c.x,c.y,c.z),q,new THREE.Vector3(c.size-.04,.08,c.size-.04));digPreview.setMatrixAt(i,matrix);});digPreview.instanceMatrix.needsUpdate=true;digPreview.computeBoundingSphere();
    digOutline.geometry.dispose();digOutline.geometry=new THREE.BufferGeometry();digOutline.geometry.setAttribute('position',new THREE.Float32BufferAttribute(marker.edges.flat(2),3));digOutline.geometry.computeBoundingSphere();
   }
   digPreview.userData.marker=marker;digPreview.userData.guideKind=kind;digPreview.userData.guideExact=exact;digPreview.userData.guideValid=true;
   const extremes=marker.cells.length?[marker.cells.reduce((a,b)=>a.x<b.x?a:b),marker.cells.reduce((a,b)=>a.x>b.x?a:b),marker.cells.reduce((a,b)=>a.z<b.z?a:b),marker.cells.reduce((a,b)=>a.z>b.z?a:b)]:[];
   marker.sightPoints=marker.centre?[marker.centre,...extremes.map(c=>[c.x,c.y+.1,c.z])]:[];
  }
  digCentre=digPreview.userData.marker.centre;
  if(!digCentre){
   digPreview.visible=digOutline.visible=digLabel.visible=scoopPin.visible=false;
   for(const part of scoopParts)part.visible=false;
  }
 }
 const actor=host?.character??officialCharacter(),measurement=host?{footBottom:-(actor.userData.grounding.verticalOffset+.12)}:measureCharacter();scene.add(actor);const feet=actor.userData.feet.map(p=>({p,position:p.position.clone(),rotation:p.rotation.clone()})),hands=actor.userData.hands.map(p=>({p,position:p.position.clone(),rotation:p.rotation.clone()}));
 const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,1,10),wood);scene.add(shaft);const blade=new THREE.Mesh(new THREE.BoxGeometry(4,.7,4),metal);scene.add(blade);const held=new THREE.Mesh(cube,earth);scene.add(held);
 held.name='シャベルに載せた土';const grip=new THREE.Mesh(new THREE.TorusGeometry(1.7,.4,6,14),wood);scene.add(grip);const arriving=new THREE.Group();arriving.name='シャベルから運ぶ土';scene.add(arriving);for(let i=0;i<8;i++){const bit=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),earth);arriving.add(bit);}
 const outline=box(0,0,0,4.2,4.2,4.2,new THREE.MeshBasicMaterial({color:0xffd24a,wireframe:true,depthWrite:false}));outline.visible=false;const placementRing=new THREE.Mesh(new THREE.RingGeometry(2.4,3,32),new THREE.MeshBasicMaterial({color:0xffd24a,side:THREE.DoubleSide,transparent:true,opacity:.7,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));placementRing.name='土の置き先の目印';placementRing.rotation.x=-Math.PI/2;placementRing.visible=false;scene.add(placementRing);
 const earthOutline=new THREE.LineSegments(new THREE.EdgesGeometry(cube),new THREE.LineBasicMaterial({color:0xffe390,depthWrite:false,toneMapped:false}));
 const earthFootprint=new THREE.Mesh(new THREE.PlaneGeometry(8,8),new THREE.MeshBasicMaterial({color:0xffe390,transparent:true,opacity:.36,depthWrite:false,toneMapped:false}));
 earthOutline.name='手作業の土・形';earthFootprint.name='手作業の土・置き先';
 earthOutline.visible=earthFootprint.visible=false;earthFootprint.rotation.x=-Math.PI/2;
 scene.add(earthOutline,earthFootprint);
 outline.name='土を置く位置の枠';const soilLayers=createSoilRenderLayers(scene,cube,earth,{terrainBoxes:shovelSoilBoxes,sourceBoxes:visibleTransportSources,fieldSurface:!!host,progressiveQuarry:host?.progressiveQuarry===true});let lookYaw=initial.player.heading,mode='chase',lastTravel=initial.player.travel,cameraReady=false,cameraGuardKey='',cameraGuardHeight=0,cameraGuardSide=0,cameraGuardBack=0,carryCamera=false,lookPitch=0,actorFaded=false;
 const handDisplayMaterials=[shaft,blade,grip,held].map(mesh=>{const original=mesh.material,display=original.clone();display.depthTest=false;display.depthWrite=false;return{mesh,original,display};});
 const fadedMaterials=[];actor.traverse(mesh=>{if(!mesh.isMesh)return;const original=mesh.material,clone=m=>{const n=m.clone();n.transparent=true;n.opacity=Math.min(m.opacity,.24);n.depthWrite=false;return n;};fadedMaterials.push({mesh,original,faded:Array.isArray(original)?original.map(clone):clone(original)});});
 function fadeActor(on){if(actorFaded===on)return;actorFaded=on;for(const f of fadedMaterials)f.mesh.material=on?f.faded:f.original;}
 function hiddenByActor(from,focus){const start=host?scene.localToWorld(from.clone()):from,point=host?scene.localToWorld(new THREE.Vector3(...focus)):new THREE.Vector3(...focus),dir=point.sub(start),length=dir.length();occlusionRay.set(start,dir.normalize());occlusionRay.far=length-.25;return occlusionRay.intersectObject(actor,true).length>0;}
 function hiddenByVehicle(from,focus,aboardExcavator=false,aboardDump=false){const start=host?scene.localToWorld(from.clone()):from,point=host?scene.localToWorld(new THREE.Vector3(...focus)):new THREE.Vector3(...focus),dir=point.sub(start),length=dir.length();occlusionRay.set(start,dir.normalize());occlusionRay.far=length-.5;return occlusionRay.intersectObjects(aboardExcavator?[dump]:aboardDump?[excavator]:[dump,excavator],true).length>0;}
 function soil(s,extra=[]){soilLayers.sync(s,extra);soilLayers.prepareRockDetail(s.player);}

 const viewProjection=new THREE.Matrix4(),worldProjection=new THREE.Matrix4(),meshProjection=new THREE.Matrix4();
 const inverseScene=new THREE.Matrix4(),clipPoint=new THREE.Vector4();
 function projectRearSubject(){
  camera.updateMatrixWorld(true);
  excavator.updateWorldMatrix(true,true);
  viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  worldProjection.multiplyMatrices(viewProjection,inverseScene.copy(scene.matrixWorld).invert());
  const bounds={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};
  let crossesNear=false;
  function include(x,y,halfX=0,halfY=0){
   bounds.left=Math.min(bounds.left,x-halfX);bounds.right=Math.max(bounds.right,x+halfX);
   bounds.top=Math.min(bounds.top,y-halfY);bounds.bottom=Math.max(bounds.bottom,y+halfY);
  }
  excavator.traverseVisible(mesh=>{
   if(!mesh.isMesh)return;
   const geometry=mesh.geometry;
   if(mesh.isInstancedMesh&&!mesh.boundingBox)mesh.computeBoundingBox();
   if(!geometry.boundingBox)geometry.computeBoundingBox();
   const {min,max}=mesh.isInstancedMesh?mesh.boundingBox:geometry.boundingBox;
   meshProjection.multiplyMatrices(worldProjection,mesh.matrixWorld);
   for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z]){
    clipPoint.set(x,y,z,1).applyMatrix4(meshProjection);
    if(clipPoint.w<camera.near){crossesNear=true;continue;}
    include(.5+clipPoint.x/clipPoint.w*.5,.5-clipPoint.y/clipPoint.w*.5);
   }
  });
  if(crossesNear)return null;
  // The aiming label and patch sit outside the machine's own silhouette.
  function includeLocal(x,y,z,width=0,height=0){
   clipPoint.set(x,y,z,1).applyMatrix4(viewProjection);
   if(clipPoint.w<camera.near)return;
   const e=camera.projectionMatrix.elements;
   include(.5+clipPoint.x/clipPoint.w*.5,.5-clipPoint.y/clipPoint.w*.5,
    width*e[0]/clipPoint.w*.25,height*e[5]/clipPoint.w*.25);
  }
  if(digLabel.visible){
   for(const edge of digPreview.userData.marker.sightPoints)includeLocal(...edge,8,8);
   for(const sprite of [digLabel,scoopPin])if(sprite.visible)
    includeLocal(sprite.position.x,sprite.position.y,sprite.position.z,sprite.scale.x,sprite.scale.y);
  }
  return bounds;
 }
 function applyRearProjection(lens,frame){
  const width=camera.aspect;
  if(!lens.view?.enabled||lens.view.fullWidth!==width||lens.view.offsetX!==-frame.x*width||
     lens.view.offsetY!==-frame.y||lens.zoom!==frame.zoom){
   lens.zoom=frame.zoom;
   lens.setViewOffset(width,1,-frame.x*width,-frame.y,width,1);
  }
 }

 function draw(s,target,options={}){storedSoil(s.soil,s.job);storageSurface.visible=!!options.storageSourceVisible||s.soil.containers.storage.amount>0||s.job?.kind==='take'&&s.job.elapsed<SHOVEL_STROKE*.55;soil(s,options.extraSoil);drawDigPreview(s,options.workGuide?.boxes??options.digPreview,options.workGuide);if(s.machineArm){const live=shovelMachineState(s),access=options.accessLink;updateExcavatorModel(excavator,{...live,load:(options.bucketAmount??s.soil.containers.bucket.amount)/64,loader:{...live.loader,transition:access?{side:access.side}:null}},{pivotTravel:options.excavatorPivotTravel});excavatorDoors.forEach((m,i)=>{const p=excavatorAccessPath(live.loader.vehicle,live.arm.slew,i?1:-1)[0];m.position.set(p.x,(s.version===2?nativeDumpHeightAt(s,p.x,p.z,s.machineVehicle?.groundY??0)??0:0)+.12,p.z);m.rotation.z=0;m.rotation.set(-Math.PI/2,0,live.loader.vehicle.heading+live.arm.slew);m.visible=!!options.doorMarks&&!options.aboardExcavator&&!access;});} const p=s.player,walk=p.travel-lastTravel;lastTravel=p.travel;if(options.driving){actor.position.fromArray(nativeDumpPoint(s,...dumpDriverLocal(measurement.footBottom)));orientDumpObject(actor,nativeDumpPose(s).axes);}else if(options.aboardExcavator&&shovelMachineState(s).groundPose){const g=shovelMachineState(s).groundPose,cs=Math.cos(s.machineArm.slew),sn=Math.sin(s.machineArm.slew),axes=[g.axes[0].map((n,i)=>n*cs-g.axes[2][i]*sn),g.axes[1],g.axes[0].map((n,i)=>n*sn+g.axes[2][i]*cs)];actor.position.set(p.x-g.axes[1][0]*measurement.footBottom,p.y-g.axes[1][1]*measurement.footBottom,p.z-g.axes[1][2]*measurement.footBottom);orientDumpObject(actor,axes);}else{actor.position.set(p.x,p.y-measurement.footBottom,p.z);actor.rotation.set(0,p.heading,0);}const phase=p.travel*.29,stride=walk>1e-6&&!options.airborne&&!options.driving&&!options.aboardExcavator?Math.sin(phase):0;feet.forEach((f,i)=>{f.p.position.copy(f.position);f.p.rotation.copy(f.rotation);f.p.position.z+=(i?1:-1)*stride*6;f.p.position.y+=Math.max(0,(i?1:-1)*stride)*3;});hands.forEach(h=>{h.p.position.copy(h.position);h.p.rotation.copy(h.rotation);});actor.updateMatrixWorld(true);
 const tool=shovelToolPose(s),h=new THREE.Vector3(...tool.hand),tip=new THREE.Vector3(...tool.tip),axis=tip.clone().sub(h);shaft.position.copy(h).add(tip).multiplyScalar(.5);shaft.scale.y=axis.length();shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize());blade.position.copy(tip);blade.rotation.y=s.job?.kind==='load'?Math.PI/2+s.dump.heading:p.heading;grip.position.copy(h);grip.rotation.y=p.heading;held.visible=tool.soil>0;held.scale.set(4,tool.soil/2,4);held.position.copy(tip).add(new THREE.Vector3(0,.35+tool.soil/4,0));
 // Both actual hands meet the same handle instead of floating beside it.
 if(!options.accessLink&&(options.driving||options.aboardExcavator||options.toolOwned!==false))hands.forEach((hand,i)=>{const live=options.aboardExcavator?shovelMachineState(s):null,cab=live?{...live.loader.vehicle,heading:live.loader.vehicle.heading+live.arm.slew}:null,gripPoint=cab?localToWorld(cab,-14+(i?3.8:-3.8),8):null;const point=cab?new THREE.Vector3(gripPoint.x,31,gripPoint.z):options.driving?new THREE.Vector3(...shovelDumpPoint(s,DUMP_CAB.driverX+(i?3.8:-3.8),DUMP_CAB.gripY,DUMP_CAB.gripZ)):h.clone().lerp(tip,i?.15:.02);hand.p.parent.updateMatrixWorld(true);if(cab&&live.groundPose){const g=live.groundPose,v=live.loader.vehicle,c=Math.cos(v.heading),sn=Math.sin(v.heading),dx=point.x-v.x,dz=point.z-v.z;point.fromArray(groundPoint(g,c*dx-sn*dz,point.y,sn*dx+c*dz));}if(host)scene.localToWorld(point);hand.p.position.copy(hand.p.parent.worldToLocal(point));});
 actor.updateMatrixWorld(true);shaft.visible=blade.visible=grip.visible=options.toolOwned!==false&&!options.driving&&!options.aboardExcavator&&!options.accessLink;held.visible=options.toolOwned!==false&&!options.driving&&!options.aboardExcavator&&!options.accessLink&&tool.soil>0;const v={...s.dump,speed:0,steering:options.steering??0,wheelTravel:options.wheelTravel??0};updateDumpModel(dump,{rig:{vehicle:v,mode:options.driving?'driving':'foot'},bed:options.bed??0,load:0},{supportPose:nativeDumpPose(s),wheelOffsets:nativeDumpWheelOffsets(s)});doors.forEach((d,i)=>{const p=nativeDumpDoorPoint(s,i?1:-1);d.visible=!!p&&!!options.doorMarks&&!options.driving;if(p){let y=p[1];for(const dx of[-8,8])for(const dz of[-9,9])y=Math.max(y,nativeDumpHeightAt(s,p[0]+dx,p[2]+dz,p[1])??y);d.position.set(p[0],y+.14,p[2]);d.rotation.set(-Math.PI/2,0,s.dump.heading);}});const amount=options.cargo??s.soil.containers.dump.amount;cargo.visible=amount>0;if(amount){const vol=amount*8,w=Math.min(48,Math.max(4,Math.sqrt(vol/4))),d=Math.min(29,Math.max(4,vol/(w*4))),height=vol/(w*d);cargo.scale.set(w,height,d);cargo.position.set(-24+w/2,1+height/2,18);}
 arriving.visible=!!s.job&&!['dig','take'].includes(s.job.kind)&&s.job.elapsed/SHOVEL_STROKE>=.55;if(arriving.visible){const pending=s.soil.pending,land=s.job.kind==='load'?new THREE.Vector3(...shovelDumpPoint(s,-22,19,-22)):new THREE.Vector3(...s.job.target).add(new THREE.Vector3(0,s.job.kind==='store'?-.3:0,0)),u=Math.min(1,(s.job.elapsed/SHOVEL_STROKE-.55)/.25),centre=new THREE.Vector3(...s.job.target).lerp(land,u);arriving.children.forEach((bit,i)=>{bit.visible=i<pending.amount;if(s.job.kind==='drop'){bit.position.set(...shovelDropFlight(s,s.job.cast?Math.min(1,(s.job.elapsed/SHOVEL_STROKE-.55)/.45):u,i%pending.positions.length));}else bit.position.copy(centre).add(new THREE.Vector3((i%2)*2-1,(Math.floor(i/2)%2)*2-1,Math.floor(i/4)*2-1));});}
 const plan=options.preview??null;if(previewRef!==plan){previewRef=plan;unloadPreview.visible=!!plan?.length;if(plan?.length){const bounds=[0,1,2].map(i=>[Math.min(...plan.map(p=>p[i]*2)),Math.max(...plan.map(p=>p[i]*2+2))]);unloadPreview.scale.set(...bounds.map(b=>b[1]-b[0]+.15));unloadPreview.position.set(...bounds.map(b=>(b[0]+b[1])/2));}}
 const liveBucket=options.aboardExcavator?armPose(shovelMachineState(s)).bucket:null,liveTarget=liveBucket?[liveBucket.x,nativeDumpHeightAt(s,liveBucket.x,liveBucket.z,s.machineVehicle?.groundY??0)??0,liveBucket.z]:null,workCentre=(scoopPin.visible&&!options.scooping?liveTarget:digCentre)??(options.aboardExcavator&&unloadPreview.visible?unloadPreview.position.toArray():liveTarget);
 const bin=nativeStorageBin(s);
 if(bin!==lastBin){lastBin=bin;host?.group.userData.stockBin?.position.set(bin.x,0,bin.z);storageSurface.position.set(bin.x,3.92,bin.z);}
 flowing.visible=!!options.unload&&options.portion>0&&options.portion<1;if(flowing.visible){const j=options.unload,ps=s.soil.pending.positions,start=new THREE.Vector3(...shovelDumpPoint(s,0,17,-42));for(let i=0;i<24;i++){const u=(options.portion*3+i/24)%1;let pos;if(j.destination==='storage')pos=new THREE.Vector3(...dumpStorageFlowPoint(s,j.target,i,u));else{const dest=new THREE.Vector3(...ps[Math.floor(i*ps.length/24)].map(n=>n*2+1));pos=start.clone().lerp(dest,u);pos.y+=Math.sin(Math.PI*u)*4;}matrix.compose(pos,q,new THREE.Vector3(2,2,2));flowing.setMatrixAt(i,matrix);}flowing.instanceMatrix.needsUpdate=true;flowing.computeBoundingSphere();}
 const groundParticles=options.bucketGroundParticles;
 bucketFlow.visible=Array.isArray(groundParticles)?!!groundParticles?.length:!!options.bucketMouth&&options.bucketPortion>0&&options.bucketPortion<1;
 if(bucketFlow.visible){
  if(Array.isArray(groundParticles)){bucketFlow.count=Math.min(24,groundParticles.length);for(let i=0;i<bucketFlow.count;i++){const pos=new THREE.Vector3(...groundParticles[Math.floor(i*groundParticles.length/bucketFlow.count)]);matrix.compose(pos,q,new THREE.Vector3(2,2,2));bucketFlow.setMatrixAt(i,matrix);}}
  else{bucketFlow.count=24;const start=new THREE.Vector3(...options.bucketMouth),vol=options.bucketDestinationAmount*8,w=Math.min(48,Math.max(4,Math.sqrt(vol/4))),d=Math.min(29,Math.max(4,vol/(w*4))),height=vol/(w*d);for(let i=0;i<24;i++){const u=(options.bucketPortion*3+i/24)%1,dest=new THREE.Vector3(...shovelDumpPoint(s,-24+w*(.2+.6*(i%4)/3),17+height/2,-22+d*(-.3+.6*Math.floor(i/4)/5))),pos=start.clone().lerp(dest,u);matrix.compose(pos,q,new THREE.Vector3(2,2,2));bucketFlow.setMatrixAt(i,matrix);}}
  bucketFlow.instanceMatrix.needsUpdate=true;bucketFlow.computeBoundingSphere();
 }

 outline.visible=!!target&&options.placementValid!==false&&!s.job&&!options.driving&&!options.aboardExcavator;const placement=options.placementPositions,placementBounds=placement?.length?[0,1,2].map(i=>[Math.min(...placement.map(p=>p[i]*2)),Math.max(...placement.map(p=>p[i]*2+2))]):null;outline.scale.set(...(placementBounds?placementBounds.map(b=>b[1]-b[0]+.2):[4.2,4.2,4.2]));if(target)outline.position.set(...(placementBounds?placementBounds.map(b=>(b[0]+b[1])/2):target));placementRing.visible=outline.visible&&options.showPlacementRing&&s.soil.containers.shovel.amount>0;if(placementRing.visible)placementRing.position.set(outline.position.x,placementBounds?placementBounds[1][0]+.2:target[1]-1.8,outline.position.z);
 earthOutline.visible=earthFootprint.visible=!!options.handEarth&&outline.visible&&!!placementBounds;
 if(earthOutline.visible){
  outline.visible=false;
  earthOutline.scale.copy(outline.scale);
  earthOutline.position.copy(outline.position);
  earthFootprint.position.set(outline.position.x,placementBounds[1][0]+.09,outline.position.z);
  earthOutline.material.color.set(0xffed9e);
  earthFootprint.material.color.copy(earthOutline.material.color);
 }
 carryCamera=!options.driving&&!options.aboardExcavator&&!options.accessLink&&(tool.soil>0||s.job&&s.soil.pending?.from==='shovel');
 const offset=options.quarryOffset;
 if(offset){(options.driving?dump:excavator).position.add(offset);actor.position.add(offset);}
 const driverFoot=options.driving?nativeDumpPoint(s,...dumpDriverLocal(0)):null,seat=driverFoot?{x:driverFoot[0],y:driverFoot[1],z:driverFoot[2]}:p;
 const cameraPlayer=offset?{x:seat.x+offset.x,y:seat.y+offset.y,z:seat.z+offset.z}:seat;
 if(host&&camera.aspect!==host.camera.aspect){camera.aspect=host.camera.aspect;camera.updateProjectionMatrix();}
 if(camera.view?.enabled){camera.zoom=1;camera.clearViewOffset();}
 eyeLens.apply(camera,mode==='eye');
 const fitRear=mode==='chase'&&options.aboardExcavator&&options.rearRegions?.length;
 let rearPose=null;
 const effectiveMode=mode,cameraYaw=excavatorCameraYaw(lookYaw,s,!!options.aboardExcavator),f=new THREE.Vector3(Math.sin(cameraYaw),0,Math.cos(cameraYaw)),right=new THREE.Vector3(f.z,0,-f.x),eye=new THREE.Vector3(cameraPlayer.x,cameraPlayer.y+20,cameraPlayer.z);
 if(options.storageCameraTarget&&mode==='chase'){const bin=options.storageCameraTarget,centre=new THREE.Vector3((s.dump.x+bin[0])/2,22,(s.dump.z+bin[2])/2),desired=centre.clone().add(new THREE.Vector3(160,140,-180));if(!cameraReady){camera.position.copy(desired);cameraReady=true;}else camera.position.lerp(desired,.12);camera.lookAt(centre);if(fitRear)rearPose={position:desired,target:centre};actor.visible=true;cameraGuardKey='';}
 else if(options.bucketStorageCamera&&mode==='chase'){const base=shovelMachineState(s).loader.vehicle,centre=new THREE.Vector3((base.x+bin.x)/2,28,(base.z+bin.z)/2),desired=centre.clone().add(new THREE.Vector3(160,140,-180));if(!cameraReady){camera.position.copy(desired);cameraReady=true;}else camera.position.lerp(desired,.12);camera.lookAt(centre);if(fitRear)rearPose={position:desired,target:centre};actor.visible=true;cameraGuardKey='';}
 else if(options.workCamera&&!offset&&mode==='chase'){const base=shovelMachineState(s).loader.vehicle,centre=workCentre?new THREE.Vector3((base.x+workCentre[0])/2,Math.max(28,workCentre[1]+24),(base.z+workCentre[2])/2):new THREE.Vector3((base.x+s.dump.x)/2,42,(base.z+s.dump.z)/2),desired=centre.clone().add(new THREE.Vector3(...excavatorWorkCameraOffset(s)));if(!cameraReady){camera.position.copy(desired);cameraReady=true;}else camera.position.lerp(desired,.18);camera.lookAt(centre);if(fitRear)rearPose={position:desired,target:centre};actor.visible=true;cameraGuardKey='';}
 // Carrying soil must not turn the player's gaze down or restrict looking up.
 else if(effectiveMode==='eye'){const sight=f.clone().add(new THREE.Vector3(0,-Math.tan(lookPitch),0)).normalize();camera.position.copy(eye).addScaledVector(sight,-8);camera.lookAt(camera.position.clone().addScaledVector(sight,100));actor.visible=false;cameraReady=false,cameraGuardKey='',cameraGuardHeight=0;}
 else{
  const riding=!!(options.driving||options.aboardExcavator),base=options.driving?s.dump:options.aboardExcavator?shovelMachineState(s).loader.vehicle:null;
  const follow=base?{x:base.x+(offset?.x??0),z:base.z+(offset?.z??0),y:(options.driving?nativeDumpPose(s).groundPosition[1]:shovelMachineState(s).groundPose?.position[1]??0)+(offset?.y??0)}:cameraPlayer;
  const framing=riding?drivingCameraFraming(camera.aspect,mode==='high'):options.handEarth&&mode==='chase'?{distance:76,height:126,aimHeight:8,lookAhead:23}:null;
  actor.visible=true;const distance=framing?.distance??(mode==='high'?110:90),height=(framing?.height??(mode==='high'?130:carryCamera?90:73))+lookPitch*90,aim=new THREE.Vector3(follow.x,follow.y+(framing?.aimHeight??(carryCamera?10:18)),follow.z).addScaledVector(f,framing?.lookAhead??(carryCamera?18:8)),desired=new THREE.Vector3(follow.x,follow.y+height,follow.z).addScaledVector(f,-distance);
  const shoulder=options.aboardExcavator?70:options.handEarth?70:0;desired.addScaledVector(right,shoulder);if(workCentre&&options.aboardExcavator)aim.lerp(new THREE.Vector3(workCentre[0],follow.y+28,workCentre[2]),.5);
  const carryPoints=carryCamera?[held.position.toArray(),...(target&&options.placementValid!==false?[target]:[])]:[],guardKey=[effectiveMode,Math.round(camera.aspect*1000),distance,height,shoulder,workCentre?.[0],workCentre?.[2],Math.floor(follow.x/2),Math.floor(follow.z/2),follow.y,Math.round(cameraYaw/.04),lookPitch,s.soil.revision,s.dump.x,s.dump.z,s.dump.heading,s.machineVehicle?.x,s.machineVehicle?.z,s.machineVehicle?.heading,!!options.driving,!!options.aboardExcavator,s.machineArm?Math.round(s.machineArm.slew/.04):0,...carryPoints.flat()].join(',');
  if(guardKey!==cameraGuardKey){const nonSoil=[...(options.aboardExcavator?shovelMachines(s).slice(1):shovelMachines(s)),...(options.driving?[]:shovelDumpObstacles(s)),...(host&&transportFences(s)?EXCAVATION_FENCES.map(b=>({position:[b.x,20,b.z],half:[b.w/2,20,b.d/2]})):[])];dump.updateMatrixWorld(true);excavator.updateMatrixWorld(true);const focusPoints=carryCamera?carryPoints:[...feet.map(f=>{const v=f.p.getWorldPosition(new THREE.Vector3());return(host?scene.worldToLocal(v):v).toArray();}),[cameraPlayer.x,cameraPlayer.y+22,cameraPlayer.z],options.driving?nativeDumpPoint(s,DUMP_CAB.driverX,DUMP_CAB.gripY,DUMP_CAB.gripZ):tool.hand];const obstacles=[...soilCameraCandidates(s.soil,desired.toArray(),focusPoints),...nonSoil];for(let k=0;k<(carryCamera&&mode!=='high'?4:16);k++){const sceneBlocked=obstacles.some(b=>focusPoints.some(focus=>shovelSegmentHits(focus,desired.toArray(),b,1)))||focusPoints.some(focus=>hiddenByVehicle(desired,focus,!!options.aboardExcavator,!!options.driving));const digBlocked=digCentre&&options.aboardExcavator&&(scoopPin.visible&&!options.scooping?[workCentre]:digPreview.userData.marker.sightPoints).every(point=>point&&hiddenByVehicle(desired,point,false,false));if(!sceneBlocked&&!digBlocked)break;desired.y+=12;}cameraGuardKey=guardKey;cameraGuardHeight=desired.y-follow.y+(carryCamera?0:4);cameraGuardSide=shoulder;cameraGuardBack=desired.clone().sub(new THREE.Vector3(follow.x,desired.y,follow.z)).dot(f);}
  desired.copy(new THREE.Vector3(follow.x,follow.y+cameraGuardHeight,follow.z).addScaledVector(f,cameraGuardBack).addScaledVector(right,cameraGuardSide));if(!cameraReady){camera.position.copy(desired);cameraReady=true;}else{camera.position.lerp(desired,.15);camera.position.x=desired.x;camera.position.z=desired.z;}camera.lookAt(aim);
  if(fitRear)rearPose={position:desired,target:aim};
 }
 function placeDigLabel(){
  if(!digCentre)return;
  if(scoopPin.visible){
   const [x,y,z]=digPreview.userData.marker.anchor;
   camera.updateMatrixWorld(true);
   const side=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
   scoopPin.position.set(x,y+6,z);
   digLabel.position.set(x,y+23,z).addScaledVector(side,-28);
  }else digLabel.position.set(digCentre[0],digCentre[1]+15,digCentre[2]);
 }
 placeDigLabel();
 if(fitRear){
  let bounds=projectRearSubject();
  if(!bounds&&rearPose){
   // A switch of work/drive view can leave the interpolating lens briefly
   // inside the vehicle. Resume from that view's own proper camera position.
   camera.position.copy(rearPose.position);camera.lookAt(rearPose.target);
   placeDigLabel();bounds=projectRearSubject();
  }
  rearFrame=bounds?fitExcavatorRearView(bounds,options.rearRegions,rearFrame):null;
 }else rearFrame=null;
 const fitted=rearFrame&&(rearFrame.zoom!==1||Math.abs(rearFrame.x)+Math.abs(rearFrame.y)>.0001);
 if(fitted)applyRearProjection(camera,rearFrame);
 // The first-person hand model sits below the aiming area. Only its idle
 // display moves; the soil quantity, physical shovel stroke and destination
 // stay in world coordinates.
 const handDisplay=effectiveMode==='eye'&&carryCamera&&held.visible&&!s.job;for(const h of handDisplayMaterials){h.mesh.material=handDisplay?h.display:h.original;h.mesh.renderOrder=handDisplay?1000:0;}if(handDisplay){camera.updateMatrixWorld(true);const depth=24,halfHeight=Math.tan(camera.fov*Math.PI/360)*depth,aspect=host?.camera.aspect??camera.aspect,display=new THREE.Vector3(.55*halfHeight*aspect,-.6*halfHeight,-depth).applyMatrix4(camera.matrixWorld),offset=display.sub(held.position);for(const mesh of[shaft,blade,grip,held])mesh.position.add(offset);}
 fadeActor(!!carryCamera&&actor.visible&&(hiddenByActor(camera.position,held.position.toArray())||target&&options.placementValid!==false&&hiddenByActor(camera.position,target)));
 if(host){
  if(!hostLensOwned){hostFov=host.camera.fov;hostLensOwned=true;}
  if(host.camera.fov!==camera.fov){host.camera.fov=camera.fov;host.camera.updateProjectionMatrix();}
  if(fitted){
   hostProjection??={zoom:host.camera.zoom,view:host.camera.view?{...host.camera.view}:null};
   applyRearProjection(host.camera,rearFrame);
  }else restoreHostProjection();
  scene.updateMatrixWorld(true);host.camera.position.copy(scene.localToWorld(camera.position.clone()));host.camera.quaternion.copy(camera.quaternion);return;
 }
 const rect=canvas.getBoundingClientRect(),w=Math.max(1,Math.round(rect.width)),height=Math.max(1,Math.round(rect.height));if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(height*renderer.getPixelRatio())){renderer.setSize(w,height,false);camera.aspect=w/height;camera.updateProjectionMatrix();}renderer.render(scene,camera);
 }
 return{draw,prepareQuarryView:eye=>soilLayers.prepareRockDetail(eye),get soilRenderProof(){return soilLayers.proof;},get storage(){return currentStorage;},get cameraProof(){return{vehicle:{position:dump.position.toArray(),quaternion:dump.quaternion.toArray(),wheels:dump.userData.wheels.map(w=>w.pivot.getWorldPosition(new THREE.Vector3()).toArray()),monsterPosition:actor.position.toArray(),monsterQuaternion:actor.quaternion.toArray()},mode,carrying:!!carryCamera,position:camera.position.toArray(),direction:camera.getWorldDirection(new THREE.Vector3()).toArray(),held:held.visible?held.position.toArray():null,placement:earthOutline.visible?earthOutline.position.toArray():outline.visible?outline.position.toArray():null,monsterFaded:actorFaded,sideOffset:camera.position.clone().sub(new THREE.Vector3(actor.position.x,camera.position.y,actor.position.z)).dot(new THREE.Vector3(Math.cos(lookYaw),0,-Math.sin(lookYaw))),heldHiddenByMonster:held.visible?actor.visible&&!actorFaded&&hiddenByActor(camera.position,held.position.toArray()):null,placementHiddenByMonster:outline.visible?actor.visible&&!actorFaded&&hiddenByActor(camera.position,outline.position.toArray()):null};},pick(clientX,clientY,frame,nearby=false){const rect=canvas.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return null;camera.updateMatrixWorld(true);const ndc=new THREE.Vector3((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1,.5),point=ndc.unproject(camera),direction=point.sub(camera.position).normalize();return pickShovelSurface(frame,camera.position.toArray(),direction.toArray(),nearby);},get mode(){return mode;},look(dx,dy,sensitivity){if(![dx,dy,sensitivity].every(Number.isFinite))return lookYaw;lookPitch=Math.max(mode==='eye'?-1.05:-.25,Math.min(mode==='eye'?1.2:.35,lookPitch+dy*sensitivity*.5));return this.setYaw(lookYaw-dx*sensitivity);},resetPitch(){lookPitch=0;},attachActor(){scene.add(actor);},releaseActor(){eyeLens.restore();restoreHostLens();fadeActor(false);if(host)host.scene.attach(actor);},captureLook(){return {mode,yaw:lookYaw,pitch:lookPitch};},restoreLook(look){mode=look.mode;lookYaw=look.yaw;lookPitch=look.pitch;cameraReady=false;cameraGuardKey='';},get yaw(){return lookYaw;},setYaw(yaw){lookYaw=Math.atan2(Math.sin(yaw),Math.cos(yaw));return lookYaw;},cycle({externalOnly=false}={}){if(externalOnly&&mode==='eye')return null;lookPitch=0;mode=mode==='chase'?'high':mode==='high'&&!externalOnly?'eye':'chase';return mode==='chase'?'モンスター後方':mode==='high'?'モンスター上方':'モンスター目線';},dispose(){eyeLens.restore();restoreHostLens();soilLayers.dispose();fadeActor(false);for(const h of handDisplayMaterials){h.mesh.material=h.original;h.display.dispose();}for(const f of fadedMaterials)for(const m of Array.isArray(f.faded)?f.faded:[f.faded])m.dispose();digOutline.geometry.dispose();digOutline.material.dispose();earthOutline.geometry.dispose();earthOutline.material.dispose();digLabelTexture.dispose();digLabel.material.dispose();pinTexture.dispose();scoopPin.material.dispose();if(host){host.scene.attach(actor);scene.removeFromParent();}renderer?.dispose();scene.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.isMesh){o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();}});}};
}
