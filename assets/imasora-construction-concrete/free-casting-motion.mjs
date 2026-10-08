import {workVehicleState} from './work-vehicle-height.mjs';
import {vehicleGroundPose,vehicleGroundError} from './free-vehicle-ground.mjs';
import {constructionBase} from './free-supported-build.mjs';
import * as T from '../three.module.min.js';
import {freeCell} from './free-build-state.mjs';
import {newFreeReceipt,assertFreeReceipt,walkPath,walkingSurface,walkingSegmentBlocked,walkingBlocked} from './free-contact.mjs';
import {CAST_PORTS,castingProblem,finishBands,bucketSection,sectionVolume,pouringBucket} from './free-casting.mjs';
import {createBoomMotion,BOOM_DURATIONS} from './free-boom-motion.mjs';

import {footingAt} from './free-footing.mjs';
import {createFootingGuard} from './free-footing-motion.mjs';
import {finishNeedsScaffold,finishAccessPlan} from './free-finish-access.mjs';
import {paintScaffoldSteps} from './free-paint-access.mjs';
import {createScaffoldMotion} from './free-scaffold-motion.mjs';
import {frameBlocked,frameSegmentBlocked,assertFrameFoundation} from './free-frames.mjs';
import {bucketLoadAccess} from './free-bucket-access.mjs';

const vec=p=>new T.Vector3(p.x,p.y??0,p.z),mix=(a,b,t)=>a+(b-a)*t;
const finishPoint=(f,cell,row,t)=>{const c=freeCell(cell);return{x:c.x-6+row*4,y:constructionBase(f)+f.fill[cell]/2,z:c.z-6+12*(row%2?1-t:t)};};
export function createFreeCastingMotion({a,p,root,actor,model,hand,feet,vehicles,tools,mats,line,external,supportHeightAt=()=>0,vehicleHeightAt=supportHeightAt,boomExternal=external,sharedPlatform=null}){
 const f=workVehicleState(p.freeBuild,vehicleHeightAt),r=newFreeReceipt(a,p),stages=[];
 const carNames=a.type==='FREE_BUCKET_LOAD'?['truck']:a.type==='FREE_POUR'&&a.source!=='bucket'?(a.source==='pump'?['truck','pump']:['truck']):[];
 const carGround=Object.fromEntries(carNames.map(name=>[name,vehicleGroundPose(p.freeBuild,p.freeBuild[name],vehicleHeightAt)]));
 function verifyCars(){for(const name of carNames){const g=vehicleGroundPose(p.freeBuild,p.freeBuild[name],vehicleHeightAt),old=carGround[name];if(g.position.distanceTo(old.position)>1e-5||g.rotation.angleTo(old.rotation)>1e-5||vehicleGroundError(vehicles[name],old)>1e-5)throw Error('車体や車輪を支える地面が変わったため作業を止めました。');}}
 const verifyForm=()=>{if(['FREE_POUR','FREE_FINISH'].includes(a.type))assertFrameFoundation(f,supportHeightAt);};verifyForm();
 let index=0,progress=0,started=false,done=false,phase=0,pose={x:actor.position.x,y:actor.position.y,z:actor.position.z,heading:actor.rotation.y};
 const initial={position:model.position.clone(),scale:model.scale.clone(),rotation:model.quaternion.clone()},focus={...pose,y:12};
 const oldBoomVisible=vehicles.pump.boom.visible;let boomMotion=null,boomPrepared=false;
 const resetFeet=()=>feet.forEach(e=>e.o.position.copy(e.position));
 const groundGuard=()=>r.footing?createFootingGuard({f,root,actor,feet,record:r.footing,heightAt:supportHeightAt}):null;let footing=groundGuard();
 function walk(to){const route=walkPath(f,pose,to,external,supportHeightAt);for(let i=1;i<route.length;i++)stages.push({kind:'walk',from:route[i-1],to:route[i],duration:Math.max(.1,vec(route[i-1]).distanceTo(vec(route[i]))/60)});pose={...to,y:footingAt(f,to.x,to.z,supportHeightAt).height,heading:pose.heading};}
 function approach(center){
  const candidates=[];for(const distance of [24,40,56])for(const [dx,dz]of [[distance,0],[-distance,0],[0,distance],[0,-distance]]){
   const dest={x:center.x+dx,z:center.z+dz};if(!footingAt(f,dest.x,dest.z,supportHeightAt))continue;try{const path=walkPath(f,pose,dest,external,supportHeightAt),length=path.reduce((sum,b,i)=>sum+(i?vec(b).distanceTo(vec(path[i-1])):0),0);candidates.push({dest,length});}catch{}}
  candidates.sort((a,b)=>a.length-b.length);if(!candidates.length)throw Error('型枠へ安全に近づけません。車両・穴・段差を避け、平らな通路を確保してください。');
  walk(candidates[0].dest);pose.heading=Math.atan2(center.x-pose.x,center.z-pose.z);return{...pose};
 }
 if(a.type==='FREE_FINISH'){
  if(f.aboard)throw Error('車を降りてからコテを使ってください。');
  root.updateMatrixWorld(true);const handBase=actor.worldToLocal(hand.getWorldPosition(new T.Vector3()));
  for(const cell of [...new Set(finishBands(f).map(b=>b.cell))]){
   const access=finishNeedsScaffold(f)?finishAccessPlan(f,cell,pose,handBase,external,supportHeightAt,sharedPlatform):null,stance=access?.stance??approach(freeCell(cell));
   const addPath=(path,platform=null)=>{for(let i=1;i<path.length;i++)stages.push({kind:'walk',from:path[i-1],to:path[i],access,cell,scaffold:platform,duration:Math.max(.1,vec(path[i-1]).distanceTo(vec(path[i]))/60)});};
   if(access){const platform=access.scaffold,{up}=paintScaffoldSteps(access);addPath(access.ground);stages.push({kind:'scaffold-open',stance:platform.entry,access,cell,duration:.65});stages.push(...up.map(s=>({...s,access,cell})));addPath(platform.path,platform);}
   for(let row=0;row<4;row++){if(row)stages.push({kind:'finish-shift',cell,row,stance,access,duration:.65});stages.push({kind:'finish',cell,row,stance,access,duration:1.4});}
   if(access){const platform=access.scaffold,{down}=paintScaffoldSteps(access);addPath([...platform.path].reverse(),platform);stages.push(...down.map(s=>({...s,access,cell})));stages.push({kind:'scaffold-close',stance:platform.entry,access,cell,duration:.55});pose={...platform.entry,heading:platform.direction<0?0:Math.PI};}
  }
  if(!stages.length)throw Error('仕上げる生コンがありません。');
 }else if(a.type==='FREE_BUCKET_LOAD'){
  if(f.aboard||f.bucket||f.wet<4)throw Error('車を降り、空のバケツと1杯分の生コンを用意してください。');
  const access=bucketLoadAccess(f,pose,external,supportHeightAt);for(let i=1;i<access.path.length;i++)stages.push({kind:'walk',from:access.path[i-1],to:access.path[i],duration:Math.max(.1,vec(access.path[i-1]).distanceTo(vec(access.path[i]))/60)});pose={...access.stance};stages.push({kind:'load',stance:{...pose},duration:3});
 }else{
  const problem=castingProblem(f,a.source,a.cell);if(problem)throw Error(problem);
  if(a.source==='bucket'){
   const stance=approach(freeCell(a.cell));stages.push({kind:'tilt',stance,from:0,to:pouringBucket(f.bucket*128).angle,volume:f.bucket*128,duration:.85},{kind:'pour',stance,duration:4.5},{kind:'tilt',stance,from:pouringBucket((f.bucket-1)*128).angle,to:0,volume:(f.bucket-1)*128,duration:.85});
  }else if(a.source==='pump'){
   boomMotion=createBoomMotion({f,cell:a.cell,vehicle:vehicles.pump,root,tools,line,mats,external:boomExternal,receipt:r});
   for(let phase=0;phase<BOOM_DURATIONS.length;phase++)stages.push({kind:'pump',phase,stance:{...pose},duration:BOOM_DURATIONS[phase]});
  }else stages.push({kind:'pour',stance:{...pose},duration:4.5});
 }
 const endPose={...pose};
 const unit=new T.BoxGeometry(1,1,1),liquidGeometry=new T.BufferGeometry(),positions=new Float32Array(180);liquidGeometry.setAttribute('position',new T.BufferAttribute(positions,3));
 function box(parent,x,y,z,w,h,d,material,name){const m=new T.Mesh(unit,material);m.position.set(x,y,z);m.scale.set(w,h,d);m.name=name??'';parent.add(m);return m;}
 const temporary=new T.Group();temporary.name='finish-access-operation';if(r.access?.length)root.add(temporary);
 const scaffolds=new Map();function scaffold(s){if(!s.access)return null;let m=scaffolds.get(s.cell);if(!m){m=createScaffoldMotion({f,root,actor,feet,record:r.access.find(v=>v.cell===s.cell),footing:r.footing,heightAt:supportHeightAt,external,parent:temporary,box,mats,name:'finish-scaffold',fixedPlan:sharedPlatform?.visible?sharedPlatform.plan:null,sharedPlatform:sharedPlatform?.visible?sharedPlatform:null});scaffolds.set(s.cell,m);}return m;}
 function localPoint(object,point){root.updateMatrixWorld(true);return root.worldToLocal(object.localToWorld(vec(point)));}
 function liquid(parent,points){
  let n=0;const push=(x,p)=>{positions[n++]=x;positions[n++]=p.y;positions[n++]=p.z;},tri=(x,a,b,c,reverse=false)=>{push(x,a);push(x,reverse?c:b);push(x,reverse?b:c);};
  for(let i=1;i+1<points.length;i++){tri(-4,points[0],points[i],points[i+1]);tri(4,points[0],points[i],points[i+1],true);}
  for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];push(-4,a);push(4,a);push(4,b);push(-4,a);push(4,b);push(-4,b);}
  liquidGeometry.attributes.position.needsUpdate=true;liquidGeometry.setDrawRange(0,n/3);liquidGeometry.computeVertexNormals();liquidGeometry.computeBoundingSphere();const m=new T.Mesh(liquidGeometry,mats.wet);m.name='casting-bucket-liquid';parent.add(m);
  return sectionVolume(points);
 }
 function bucket(volume,angle=0){
  root.updateMatrixWorld(true);const grip=root.worldToLocal(hand.getWorldPosition(new T.Vector3())),g=new T.Group();g.name='casting-bucket';g.position.copy(grip);g.rotation.order='YXZ';g.rotation.y=actor.rotation.y;g.rotation.x=angle;tools.add(g);
  box(g,0,-9.2,0,8.4,.4,8.4,mats.metal);for(const x of [-4.2,4.2])box(g,x,-5,0,.4,8,8.4,mats.metal);for(const z of [-4.2,4.2])box(g,0,-5,z,8,8,.4,mats.metal);
  line(g,{x:-4.2,y:-1,z:0},{x:0,y:0,z:0},.25,mats.metal);line(g,{x:0,y:0,z:0},{x:4.2,y:-1,z:0},.25,mats.metal);
  let low=-15,high=15;for(let i=0;i<48;i++){const mid=(low+high)/2;if(sectionVolume(bucketSection(angle,mid))<volume)low=mid;else high=mid;}
  const points=bucketSection(angle,(low+high)/2),measured=liquid(g,points);
  root.updateMatrixWorld(true);r.maxGripError=Math.max(r.maxGripError,g.getWorldPosition(new T.Vector3()).distanceTo(hand.getWorldPosition(new T.Vector3())));r.maxVolumeError=Math.max(r.maxVolumeError,Math.abs(measured-volume));
  return{g,lip:localPoint(g,{x:0,y:-1,z:4}),surface:localPoint(g,{x:0,y:-9+volume/64,z:0}),volume:measured};
 }
 function segment(a,b,radius,material,name){const m=line(tools,a,b,radius,material);m.name=name;return m;}
 function stream(source,target){
  const m=segment(source,target,.95,mats.wet,'casting-stream');root.updateMatrixWorld(true);
  r.maxContactError=Math.max(r.maxContactError,localPoint(m,{x:0,y:-.5,z:0}).distanceTo(vec(source)),localPoint(m,{x:0,y:.5,z:0}).distanceTo(vec(target)));
 }
 function trough(source,tip){
  if(source.y<=tip.y+.2)throw Error('注ぎ口より高い場所には流せません。ポンプ車を使ってください。');
  if(Math.hypot(source.x-tip.x,source.z-tip.z)<.001)return vec(source);
  // An open, sloping channel. Its outlet, not the vehicle centre, owns the stream.
  const delta=vec(tip).sub(vec(source)),length=delta.length(),along=delta.clone().normalize(),side=new T.Vector3().crossVectors(along,new T.Vector3(0,1,0)).normalize(),up=new T.Vector3().crossVectors(side,along);
  const channel=new T.Group();channel.name='casting-chute';channel.position.copy(vec(source).lerp(vec(tip),.5));channel.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(side,along,up));tools.add(channel);
  box(channel,0,0,-.6,4.8,length,.3,mats.metal,'casting-chute-bed');for(const x of [-2.25,2.25])box(channel,x,0,0,.3,length,1.5,mats.metal);
  box(channel,0,0,-.18,4.15,length,.55,mats.wet,'casting-chute-flow');return localPoint(channel,{x:0,y:length/2,z:0});
 }
 function actualPort(vehicle,point){return localPoint(vehicles[vehicle].root,point);}
 function mark(t){r.samples++;r.min=Math.min(r.min,t);r.max=Math.max(r.max,t);}
 function render(s,t){
  const platform=scaffold(s);
  if(s.kind==='scaffold-open'||s.kind==='scaffold-close'){resetFeet();actor.position.copy(vec(s.stance));actor.rotation.set(0,s.stance.heading,0);footing=groundGuard();footing.stand();platform[s.kind==='scaffold-open'?'open':'close'](s.access.scaffold,t);return;}
  if(s.kind==='climb'){resetFeet();platform.climb(s,t);if(frameBlocked(f,s.access.scaffold.panels,actor.position,external,14))throw Error('仕上げ用足場の通路がふさがったため止めました。');return;}
  if(s.kind==='walk'){
   const from={x:actor.position.x,z:actor.position.z};actor.position.copy(vec(s.from).lerp(vec(s.to),t));const d=vec(s.to).sub(vec(s.from));actor.rotation.y=Math.atan2(d.x,d.z);resetFeet();
   if(s.scaffold)platform.walk(s.scaffold,phase);else{footing.walk(phase);}
   if(s.scaffold?frameSegmentBlocked(f,s.scaffold.panels,from,actor.position,(x,z,m)=>external(x,z,m,s.scaffold.height),14):s.access?frameSegmentBlocked(f,s.access.scaffold.panels,from,actor.position,external,14):walkingSegmentBlocked(f,from,actor.position,external))throw Error('通路がふさがったため止めました。',{cause:{from,to:{x:actor.position.x,y:actor.position.y,z:actor.position.z},scaffold:!!s.scaffold,cell:s.cell,external:external(f.location.x+actor.position.x,f.location.z+actor.position.z,14,s.scaffold?.height)}});
   if(a.type==='FREE_POUR'&&a.source==='bucket')bucket(f.bucket*128);Object.assign(focus,{x:actor.position.x,y:12,z:actor.position.z});return;
  }
  actor.position.copy(vec(s.stance));actor.rotation.y=s.stance.heading;resetFeet();if(s.access)platform.stand(s.access.scaffold);else footing?.stand();root.updateMatrixWorld(true);
  if(s.kind==='tilt'){bucket(s.volume,mix(s.from,s.to,t));return;}
  if(s.kind==='pump'){
   const state=boomMotion.render(s.phase,t),c=freeCell(a.cell),amount=s.phase<5?0:s.phase===5?t:1,target={...c,y:constructionBase(f)+(f.fill[a.cell]+amount)/2};
   if(s.phase===5){stream(state.tip,target);mark(t);}
   if(amount>0){const addition=box(tools,c.x,constructionBase(f)+f.fill[a.cell]/2+amount/4,c.z,16,amount/2,16,mats.wet,'casting-new-fill');r.maxVolumeError=Math.max(r.maxVolumeError,Math.abs(addition.scale.x*addition.scale.y*addition.scale.z-amount*128));}
   return;
  }
  if(s.kind==='finish'||s.kind==='finish-shift'){
   const point=s.kind==='finish'?finishPoint(f,s.cell,s.row,t):vec(finishPoint(f,s.cell,s.row-1,1)).lerp(vec(finishPoint(f,s.cell,s.row,0)),t);
   if(s.kind==='finish-shift')point.y+=Math.sin(Math.PI*t)*1.2;
   const head=box(tools,point.x,point.y+.2,point.z,4,.4,4,mats.metal,'casting-trowel'),grip=root.worldToLocal(hand.getWorldPosition(new T.Vector3())),tip={...point,y:Math.max(point.y+.7,constructionBase(f)+f.height+2)},pole=segment(grip,tip,.3,mats.wood,'casting-trowel-handle');
   segment(tip,{...point,y:point.y+.4},.3,mats.metal,'casting-trowel-neck');
   root.updateMatrixWorld(true);r.maxGripError=Math.max(r.maxGripError,localPoint(pole,{x:0,y:-.5,z:0}).distanceTo(grip));if(s.kind==='finish')r.maxContactError=Math.max(r.maxContactError,localPoint(head,{x:0,y:-.5,z:0}).distanceTo(vec(point)));r.maxPoleLength=Math.max(r.maxPoleLength,grip.distanceTo(vec(tip)));
   if(r.maxPoleLength>64)throw Error('コテの届く通路がありません。車両を移動してください。');
   if(s.kind==='finish'){const band=r.bands.find(b=>b.cell===s.cell&&b.row===s.row);band.samples++;band.min=Math.min(band.min,t);band.max=Math.max(band.max,t);mark(t);}Object.assign(focus,point);return;
  }
  if(s.kind==='load'){
   if(walkingBlocked(f,s.stance.x,s.stance.z,external))throw Error('汲む場所がふさがったため止めました。材料は変更していません。');
   const cup=bucket(t*512),source=actualPort('truck',CAST_PORTS.truck),tip={x:cup.surface.x,y:s.stance.y+11,z:cup.surface.z};r.maxPoleLength=Math.max(r.maxPoleLength,source.distanceTo(vec(tip)));if(r.maxPoleLength>64)throw Error('バケツに注ぎ口が届きません。車の後ろに空きを作ってください。');const out=trough(source,tip);stream(out,cup.surface);r.maxVolumeError=Math.max(r.maxVolumeError,Math.abs((f.wet*128-t*512)+cup.volume-f.wet*128));mark(t);Object.assign(focus,{...cup.lip,y:12});return;
  }
  const c=freeCell(a.cell),target={...c,y:constructionBase(f)+(f.fill[a.cell]+t)/2},tip={...c,y:constructionBase(f)+f.height+1};let out;
  if(a.source==='bucket'){
   const remaining=(f.bucket-t)*128,cup=bucket(remaining,pouringBucket(remaining).angle);out=trough(cup.lip,tip);r.maxVolumeError=Math.max(r.maxVolumeError,Math.abs(cup.volume+t*128-f.bucket*128));
  }else if(a.source==='truck')out=trough(actualPort('truck',CAST_PORTS.truck),tip);
  stream(out,target);if(t>0){const addition=box(tools,c.x,constructionBase(f)+f.fill[a.cell]/2+t/4,c.z,16,t/2,16,mats.wet,'casting-new-fill');r.maxVolumeError=Math.max(r.maxVolumeError,Math.abs(addition.scale.x*addition.scale.y*addition.scale.z-t*128));}
  mark(t);Object.assign(focus,target);
 }
 function clean(){resetFeet();boomMotion?.restore();vehicles.pump.boom.visible=oldBoomVisible;for(const s of scaffolds.values())s.dispose();root.remove(temporary);tools.clear();unit.dispose();liquidGeometry.dispose();done=true;}
 return{focus,get endPose(){return endPose;},get receipt(){return r;},get phase(){const s=stages[index];if(s?.kind==='climb')return s.ascending?'仕上げ用足場の階段を上っています。':'仕上げ用足場の階段を下りています。';if(s?.kind==='scaffold-open')return sharedPlatform?.visible?'同じ作業台の足元を確認しています。':'型枠の外に仕上げ用足場を広げています。';if(s?.kind==='scaffold-close')return sharedPlatform?.visible?'同じ作業台を残して地上に戻りました。':'仕上げ用足場を片付けています。';if(boomMotion&&!boomPrepared)return 'ブームとホースの経路を確認しています。';if(stages[index]?.kind==='pump')return stages[index].phase===5?'型枠へ¼杯を注いでいます。':stages[index].phase<5?'周囲を確認してブームを開き、ホースを下ろしています。':'ホースを上げてブームを収納しています。';return {walk:'道具を持って施工位置へ歩いています。',tilt:'バケツの傾きを調整しています。',load:'ミキサーの後部から生コンを汲んでいます。',pour:'型枠へ¼杯を注いでいます。',finish:'生コンの上面をコテで仕上げています。','finish-shift':'コテを持ち上げ、隣の列へ移しています。'}[stages[index]?.kind]??'';},tick(dt){
  if(done)return true;verifyCars();verifyForm();if(boomMotion&&!boomPrepared){boomPrepared=boomMotion.prepare();return false;}if(model.position.distanceTo(initial.position)>1e-5||model.scale.distanceTo(initial.scale)>1e-5||model.quaternion.angleTo(initial.rotation)>1e-5)throw Error('キャラクターの位置が変わったため作業を止めました。');
  const step=Math.min(.05,Math.max(0,dt));phase+=step*10;tools.clear();const s=stages[index];if(!started){started=true;progress=0;render(s,0);return false;}
  progress=Math.min(1,progress+step/s.duration);render(s,progress);if(progress===1){index++;started=false;if(index===stages.length){assertFreeReceipt(a,p,p.revision,r);clean();return true;}}return false;
 },verifyFooting:()=>{verifyCars();verifyForm();footing?.stand();if(a.type==='FREE_BUCKET_LOAD'&&walkingBlocked(f,endPose.x,endPose.z,external))throw Error('汲む場所がふさがったため止めました。材料は変更していません。');},cancel(){if(!done)clean();}};
}
