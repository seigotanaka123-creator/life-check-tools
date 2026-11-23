import * as T from './three.module.min.js';
import {officialCharacter} from './imasora-construction-layout.js?v=120ob';
import {FLEET} from './imasora-construction-shared-field.mjs?v=120ey';
import {updateWaterTruck} from './imasora-construction-water-truck-model.mjs?v=120ov';
export const fleetLesson=id=>id==='truck'?'mixer':id;
export function disposeFleetTree(root){const g=new Set(),m=new Set(),t=new Set();root.traverse(o=>{if(o.geometry)g.add(o.geometry);for(const x of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){m.add(x);for(const v of Object.values(x))if(v?.isTexture)t.add(v);}});g.forEach(x=>x.dispose());m.forEach(x=>x.dispose());t.forEach(x=>x.dispose());}
export async function createFleetModel(id){
 if(!FLEET.some(v=>v.id===id))throw Error('車をえらび直してね。');
 let model,extra=null,actuate;
 const vehicle={x:0,z:0,heading:0,steering:0,speed:0,wheelTravel:0};
 if(id==='excavator'){
  const [{createExcavator,updateExcavatorModel},{initialExcavator}]=await Promise.all([import('./imasora-construction-excavator-model.js?v=120ov'),import('./imasora-construction-excavator.js?v=120ov')]);
  model=createExcavator();const s=initialExcavator();s.loader.vehicle=vehicle;s.loader.mode='driving';s.bucketStyle='backhoe-v2';
  const rest={boom:74*Math.PI/180,stick:-30*Math.PI/180,curl:-72*Math.PI/180,slew:0};
  actuate=p=>{
   s.arm=p.arm??rest;
   s.loader.transition=p.boarding?{}:null;
   s.digMode=p.contactDig?'tooth-contact-v1':undefined;
   s.load=p.load??0;
   updateExcavatorModel(model,s,{});
  };
 }else if(id==='dump'){
  const {createDumpModel,updateDumpModel}=await import('./imasora-construction-dump-model.js?v=120ov');
  model=createDumpModel();actuate=p=>updateDumpModel(model,{rig:{vehicle,mode:p.boarding?'boarding':'driving'},bed:p.bed??0,load:p.load??0},{});
 }else if(id==='crane'){
  const [{createCrane,updateCraneModel},{initialCrane}]=await Promise.all([import('./imasora-construction-crane-model.js?v=120pv'),import('./imasora-construction-crane.js?v=120pv')]);
  model=createCrane();const s=initialCrane(),rest={...s.boom};s.rig.vehicle=vehicle;s.rig.mode='driving';
  actuate=p=>{s.deployment=p.deployment??0;s.boom=p.boom??rest;s.parts=p.held?[p.held]:[];s.held=p.held?.id??null;updateCraneModel(model,s,{steps:p.boarding===false?0:1});};
 }else if(['truck','pump'].includes(id)){
  const car=(await import('./imasora-construction-concrete/vehicle-models.mjs?v=120pv')).createConcreteVehicle(id);
  model=car.root;
  actuate=p=>{
   model.position.set(vehicle.x,0,vehicle.z);model.rotation.y=vehicle.heading;
   car.driverDoor.rotation.y=p.doorAngle??0;
   if(p.drum!==undefined)car.drum.rotation.z=p.drum;
   if(p.deployment!==undefined){
    car.legs.visible=p.deployment>.01;car.legs.scale.x=Math.max(.01,p.deployment);
    car.boom.visible=!p.externalHose;
   }
  };
 }else{
  const {createLoader,updateLoaderModel}=await import('./imasora-construction-loader-work-model.js?v=120ov');
  if(id==='water'){
   extra=(await import('./imasora-construction-water-transport-view.js?v=120ov')).createWaterTransportView({embedded:true});
   model=extra.userData.loader;model.removeFromParent();
  }else model=createLoader();
  actuate=p=>(id==='water'?updateWaterTruck:updateLoaderModel)(model,vehicle,{steps:p.boarding?1:0,bucket:p.bucket??{lift:0,tilt:0},load:p.load??0});
 }
 function pose(p={}){
  const {x=0,z=0,heading=0,steering=0,travel=0}=p;
  Object.assign(vehicle,{x,z,heading,steering,wheelTravel:travel});
  actuate(p);
 }
 pose();
 const driver=officialCharacter();driver.name='fleet-preview-driver';if(model.userData.pilotSocket)model.userData.pilotSocket.add(driver);else{driver.updateMatrixWorld(true);const bottom=Math.min(...driver.userData.feet.map(f=>new T.Box3().setFromObject(f).min.y));driver.position.set(-15,19-bottom,21);model.add(driver);}
 model.name='fleet-preview-'+id;model.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),target=bounds.getCenter(new T.Vector3());
 return {root:model,driver,target,pose,radius:Math.max(size.x,size.y,size.z)*.64,dispose(){disposeFleetTree(model);if(extra)disposeFleetTree(extra);}};
}

