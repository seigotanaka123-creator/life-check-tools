import * as THREE from './three.module.min.js';
import {createWorldExcavationModel,disposeWorldExcavationModel,EXCAVATION_FENCES} from './imasora-construction-world-excavation-model.js';
import {updateExcavatorModel} from './imasora-construction-excavator-model.js';
import {nativeDumpPose,nativeDumpWheelOffsets} from './imasora-construction-native-dump-pose.mjs';
import {createDumpModel,updateDumpModel} from './imasora-construction-dump-model.js';
import {shovelSoilBoxes,shovelMachineState} from './imasora-construction-shovel-work.mjs';
import {transportSiteOrigin,transportWorldPose,transportSiteOpening,transportSiteReserved,transportGroundHeightAt,transportVehicleBlockedAt,visibleTransportSources,requireTransportSceneCheckpoint} from './imasora-construction-transport-site.mjs';
import {validateWorldTransport,worldTransportSoil} from './imasora-construction-transport-authority.mjs';
import {soilTransportTotals} from './imasora-construction-soil-transport.mjs';
// First scene connection only. It displays the shared source and closes the old
// excavation writer. Gameplay entry/exit will be connected after this boundary.
export function createWorldTransportSceneBridge({service,state,scene,camera,character,shadow,canvas,clearInput,readout}){
 const record=service.constructionTransport;validateWorldTransport(record,service.world.constructionExcavation,service.constructionTransferProfileId);
 requireTransportSceneCheckpoint(record);
 let root=null,soilMesh=null,pose=null,blocked=false,characterOffset=null;
 const panel=document.createElement('section');panel.className='world-excavation-controls';panel.hidden=true;panel.style.cssText='right:12px;left:auto;bottom:16px;max-width:330px;padding:12px';
 panel.innerHTML='<header><strong>土運搬</strong><span>保存した現場の表示確認</span></header><p role="status"></p><button>視点を変える</button><details><summary>確認記録</summary><pre style="max-height:32vh;overflow:auto;font-size:11px"></pre></details>';
 canvas.parentElement.append(panel);let view=0;panel.querySelector('button').onclick=()=>{view=(view+1)%2;};
 function dispose(){if(soilMesh){soilMesh.dispose();soilMesh=null;}disposeWorldExcavationModel(root);root=null;}
 function inspect(){const f=record.work.frame,d=root?.userData;panel.querySelector('pre').textContent=JSON.stringify({保存世代:service.generation,区画:worldTransportSoil(record).initial.source.site,原点:transportSiteOrigin(record),人物:transportWorldPose(record),土量:soilTransportTotals(f.soil)['earth-soil'],描画箱数:soilMesh?.count??0,旧地形描画:!!(d?.terrain?.visible||d?.particles.visible||d?.pile.visible),通常保存:'確認用アドレスの世界のみ',書込:'この表示確認は書込なし'},null,2);}
 return{get active(){return !!root&&!blocked&&state.map==='construction';},get dirty(){return false;},begin(){return false;},save:async()=>false,leave(){return false;},look(){},
 install({group,blockedAt,reserved,collider}){
  dispose();panel.hidden=true;if(state.map!=='construction')return null;const o=transportSiteOrigin(record);
  if(blockedAt(o[0],o[2],425)||reserved([o[0],0,o[2]],[720,0,600])){blocked=true;panel.hidden=false;panel.querySelector('p').textContent='既存の作品と区画が重なるため、現場の表示を止めました。';return null;}
  blocked=false;root=createWorldExcavationModel();root.name='construction-transport-yard';root.position.fromArray(o);group.add(root);
  const f=record.work.frame,d=root.userData;d.particles.visible=d.pile.visible=false;
  updateExcavatorModel(d.machine,{...shovelMachineState(f),load:f.soil.containers.bucket.amount/64});
  const boxes=[...shovelSoilBoxes(f.soil),...visibleTransportSources(f)],cube=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshStandardMaterial({color:0xbe9159,roughness:1}),matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion();
  soilMesh=new THREE.InstancedMesh(cube,material,boxes.length);soilMesh.name='shared-transport-soil';soilMesh.castShadow=soilMesh.receiveShadow=true;boxes.forEach((b,i)=>{matrix.compose(new THREE.Vector3(...b.position),rotation,new THREE.Vector3(b.size,b.size,b.size));soilMesh.setMatrixAt(i,matrix);});soilMesh.instanceMatrix.needsUpdate=true;soilMesh.computeBoundingSphere();root.add(soilMesh);
  const dump=createDumpModel();root.add(dump);updateDumpModel(dump,{rig:{vehicle:{...f.dump,speed:0,steering:0,wheelTravel:record.work.wheelTravel},mode:record.work.mode==='driving'?'driving':'foot'},bed:0,load:0},{supportPose:nativeDumpPose(f),wheelOffsets:nativeDumpWheelOffsets(f)});
  const amount=f.soil.containers.dump.amount;if(amount){const volume=amount*8,w=Math.min(48,Math.max(4,Math.sqrt(volume/4))),depth=Math.min(29,Math.max(4,volume/(w*4))),h=volume/(w*depth),cargo=new THREE.Mesh(cube,material);cargo.scale.set(w,h,depth);cargo.position.set(-24+w/2,1+h/2,18);dump.userData.bed.add(cargo);}
  for(const b of EXCAVATION_FENCES)collider(o[0]+b.x,o[2]+b.z,[b.w,b.d],0,'construction-excavation-fence',0,{minY:0,maxY:40,obstacleHeight:40});
  pose=transportWorldPose(record);panel.hidden=false;panel.querySelector('p').textContent='保存した地形・荷台・モンスターを表示しています。操作の入口は次の接続工程です。';inspect();return transportSiteOpening(record);
 },overlapsBuild:(p,size)=>!!root&&transportSiteReserved(record,p,size),groundHeightAt:(x,z)=>root?transportGroundHeightAt(record,x,z):undefined,vehicleBlockedAt:(x,z,r)=>!!root&&transportVehicleBlockedAt(record,x,z,r),previewSpawn:()=>pose,
 update(){if(!root||blocked||state.map!=='construction')return false;clearInput();state.position.set(pose.x,0,pose.z);state.groundY=pose.y;state.heading=pose.heading;state.jumpY=state.jumpVelocity=0;state.falling=state.moving=false;scene.add(character);character.visible=true;shadow.visible=false;
  character.rotation.set(0,pose.heading,0);for(const f of character.userData.walkRig?.feet??[])f.part.position.copy(f.basePosition);
  if(characterOffset===null){character.position.set(0,0,0);character.updateMatrixWorld(true);characterOffset=.12-new THREE.Box3().setFromObject(character).min.y;}
  character.position.set(pose.x,pose.y+characterOffset,pose.z);
  const o=transportSiteOrigin(record),target=new THREE.Vector3(o[0]+32,10,o[2]+44);camera.position.copy(target).add(new THREE.Vector3(view?380:300,view?390:290,view?-380:-300));camera.lookAt(target);readout();return true;
 },dispose};
}
