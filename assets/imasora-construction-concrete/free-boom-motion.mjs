import {workVehicleState} from './work-vehicle-height.mjs';
import * as T from '../three.module.min.js';
import {BOOM_PHASES,createBoomPlan,pipeRoute,newPipeReceipt,assertPipeReceipt} from './free-boom-contact.mjs';
import {CAST_PORTS,castPoint} from './free-casting.mjs';
const vec=p=>new T.Vector3(p.x,p.y,p.z);
export const BOOM_DURATIONS=[.65,1.2,.65,1.1,1,4.5,1,1.1,.65,1.2,.65];
export function createBoomMotion({f,cell,vehicle,root,tools,line,mats,external,receipt}){
 const plan=createBoomPlan(f,cell),record=receipt.boom;
 const preflight=(function*(){for(let phase=0;phase<BOOM_PHASES.length;phase++)yield* plan.check(phase,0,1,external);})();
 const states=vehicle.boom.children.map(o=>({o,position:o.position.clone(),quaternion:o.quaternion.clone(),scale:o.scale.clone(),visible:o.visible})),beams=[0,1,2].map(i=>vehicle.boom.getObjectByName('boom-section-'+i));
 if(beams.some(m=>!m))throw Error('ブームの形状を確認できません。');
 const oldVisible=vehicle.boom.visible,carPose={position:vehicle.root.position.clone(),quaternion:vehicle.root.quaternion.clone(),scale:vehicle.root.scale.clone()};let lastPhase=-1,last=0;
 function local(p){root.updateMatrixWorld(true);return vehicle.boom.worldToLocal(root.localToWorld(vec(p)));}
 function measure(mesh,p,expected){root.updateMatrixWorld(true);const actual=root.worldToLocal(mesh.localToWorld(vec(p)));record.maxGeometryError=Math.max(record.maxGeometryError,actual.distanceTo(vec(expected)));}
 function segment(a,b,r,mat,name){const mesh=line(tools,a,b,r,mat);mesh.name=name;measure(mesh,{x:0,y:-.5,z:0},a);measure(mesh,{x:0,y:.5,z:0},b);return mesh;}
 return{plan,prepare(){const deadline=performance.now()+4;for(let i=0;i<32;i++){const next=preflight.next();if(next.done)return true;record.checkedPoses++;if(performance.now()>=deadline)break;}return false;},render(phase,t){
  if(vehicle.root.position.distanceTo(carPose.position)>1e-5||vehicle.root.quaternion.angleTo(carPose.quaternion)>1e-5||vehicle.root.scale.distanceTo(carPose.scale)>1e-5)throw Error('ポンプ車の姿勢が変わったため止めました。');
  plan.sweep(phase,lastPhase===phase?last:0,t,external,()=>record.checkedPoses++);lastPhase=phase;last=t;
  const state=plan.pose(phase,t);vehicle.boom.visible=true;states.forEach(s=>s.o.visible=false);
  state.segments.forEach((s,i)=>{const mesh=beams[i],a=local(s.a),b=local(s.b),box=state.boxes[i];mesh.visible=true;mesh.position.copy(a.clone().add(b).multiplyScalar(.5));const q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(...box.axes));mesh.quaternion.copy(vehicle.boom.getWorldQuaternion(new T.Quaternion()).invert().multiply(root.getWorldQuaternion(new T.Quaternion())).multiply(q));measure(mesh,{x:0,y:0,z:s.size[2]/2},s.a);measure(mesh,{x:0,y:0,z:-s.size[2]/2},s.b);
   for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){const localCorner={x:x*s.size[0]/2,y:y*s.size[1]/2,z:z*s.size[2]/2},expected=box.center.clone().addScaledVector(box.axes[0],localCorner.x).addScaledVector(box.axes[1],localCorner.y).addScaledVector(box.axes[2],localCorner.z);measure(mesh,localCorner,expected);}
   if(i)segment(state.segments[i-1].b,s.a,.5,mats.metal,'casting-boom-joint-'+i);
  });
  segment(castPoint(f.pump,CAST_PORTS.pump),state.segments[0].a,3.3,mats.metal,'casting-boom-lift');
  if(state.extension>0)for(let i=1;i<state.hose.length;i++)segment(state.hose[i-1],state.hose[i],1.35,mats.dark,'casting-hose');
  const phaseRecord=record.phases[phase];phaseRecord.min=Math.min(phaseRecord.min,t);phaseRecord.max=Math.max(phaseRecord.max,t);phaseRecord.samples++;
  if(record.maxGeometryError>1e-5)throw Error('ブームの表示位置が変わったため止めました。');
  return state;
 },restore(){for(const s of states){s.o.position.copy(s.position);s.o.quaternion.copy(s.quaternion);s.o.scale.copy(s.scale);s.o.visible=s.visible;}vehicle.boom.visible=oldVisible;}};
}
export function createPipeMotion({a,p,root,tools,pipes,line,mats,vehicles,external,supportHeightAt=()=>0}){
 // Disconnect remains available to recover an old, obstructed saved connection.
 let path;try{path=pipeRoute(p.freeBuild,a.connected?external:()=>false,supportHeightAt);}catch(e){if(a.connected)throw e;const f=workVehicleState(p.freeBuild,supportHeightAt);path=[castPoint(f.truck,CAST_PORTS.truck),castPoint(f.pump,CAST_PORTS.supplyInlet)];}
 const r=newPipeReceipt(a,p),wasVisible=pipes.visible;
 pipes.visible=false;let elapsed=0,started=false,done=false;
 function verify(){if(!a.connected)return;const current=pipeRoute(p.freeBuild,external,supportHeightAt);if(JSON.stringify(current)!==JSON.stringify(path))throw Error('配管を支える地面や車体の位置が変わったため止めました。');root.updateMatrixWorld(true);for(const [name,port,expected]of [['truck',CAST_PORTS.truck,path[0]],['pump',CAST_PORTS.supplyInlet,path.at(-1)]]){const actual=root.worldToLocal(vehicles[name].root.localToWorld(vec(port)));r.maxGeometryError=Math.max(r.maxGeometryError,actual.distanceTo(vec(expected)));}if(r.maxGeometryError>1e-5)throw Error('配管の接続口が車体の位置と一致しません。');}
 function render(t){
  verify();if(a.connected){const current=pipeRoute(p.freeBuild,external,supportHeightAt);if(JSON.stringify(current)!==JSON.stringify(path))throw Error('配管経路が変わったため止めました。');}
  const amount=a.connected?t:1-t,total=path.slice(1).reduce((n,b,i)=>n+vec(b).distanceTo(vec(path[i])),0);let left=total*amount;const drawn=[];
  for(let i=1;i<path.length&&left>0;i++){const start=path[i-1],length=vec(start).distanceTo(vec(path[i])),end=vec(start).lerp(vec(path[i]),Math.min(1,left/length)),m=line(tools,start,end,1.1,mats.dark);m.name='connecting-hose';drawn.push({m,start,end});left-=length;}
  root.updateMatrixWorld(true);for(const {m,start,end} of drawn)for(const [y,target]of [[-.5,start],[.5,end]])r.maxGeometryError=Math.max(r.maxGeometryError,root.worldToLocal(m.localToWorld(new T.Vector3(0,y,0))).distanceTo(vec(target)));
  r.samples++;r.min=Math.min(r.min,t);r.max=Math.max(r.max,t);
 }
 return{focus:{x:0,y:24,z:40},get phase(){return a.connected?'車体を避けて配管を接続しています。':'配管を収納しています。';},get receipt(){return r;},verifyFooting:verify,tick(dt){tools.clear();if(!started){started=true;render(0);return false;}elapsed+=Math.min(.05,Math.max(0,dt));const t=Math.min(1,elapsed/1.4);render(t);if(t===1){assertPipeReceipt(a,p,p.revision,r);done=true;}return done;},settle(){pipes.visible=wasVisible;tools.clear();},cancel(){done=true;this.settle();}};
}
