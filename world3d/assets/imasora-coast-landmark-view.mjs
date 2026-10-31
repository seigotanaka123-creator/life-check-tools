import * as T from './three.module.min.js';
import {coastHeight} from './imasora-coast-layout.mjs?v=120mx';
import {COAST_TOYS,LIGHT_ANGLES} from './imasora-coast-landmark-play.mjs?v=120io';
import {batchCoastScenery} from './imasora-coast-static-batches.mjs?v=120id';

export function createCoastLandmarkView(parent,{collider=()=>{}}={}){
 const root=new T.Group();root.name='手で動かす海辺の仕掛け';parent.add(root);
 const geometries=new Set(),materials=new Set(),fixed=[],groups={};
 const material=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness:.65,...extra});materials.add(m);return m;};
 const mint=material(0x78c9ba),gold=material(0xf2bd59),ivory=material(0xfff2d2),wood=material(0xc79562),water=material(0x67cce1,{transparent:true,opacity:.65,depthWrite:false}),coral=material(0xf29487),leaf=material(0x77b47c);
 const glass=material(0xc2eee8,{transparent:true,opacity:.23,depthWrite:false});
 const cube=new T.BoxGeometry(1,1,1),ball=new T.SphereGeometry(1,12,8),ring=new T.TorusGeometry(1,.12,6,24);[cube,ball,ring].forEach(g=>geometries.add(g));
 const mesh=(geo,mat,p,size,g,dynamic=false)=>{const o=new T.Mesh(geo,mat);o.position.set(...p);o.scale.set(...size);g.add(o);if(!dynamic)fixed.push(o);return o;};
 const box=(p,size,m,g,d=false)=>mesh(cube,m,p,size,g,d);
 const solid=(id,x,z,w,d,h)=>{const y=coastHeight(x,z);collider(x,z,[w,d],0,'coast-toy-'+id,0,{minY:y,maxY:y+h,obstacleHeight:y+h});};
 for(const [id,t]of Object.entries(COAST_TOYS)){const g=new T.Group();g.position.set(t.x,coastHeight(t.x,t.z),t.z);g.userData.nearbyName={id:'coast:toy:'+id,name:t.name,hx:12,hz:12,height:38};root.add(g);groups[id]=g;}
 const l=groups.lighthouse;
 box([0,9,0],[12,18,10],mint,l);solid('light-handle',-650,235,12,10,25);
 const handle=new T.Group();handle.position.set(0,23,0);l.add(handle);mesh(ring,gold,[0,0,0],[10,10,10],handle,true);box([0,0,0],[18,1.5,1.5],ivory,handle,true);box([0,0,0],[1.5,18,1.5],ivory,handle,true);
 const lenses=LIGHT_ANGLES.map(a=>{
  const x=Math.sin(a)*115,z=185+Math.cos(a)*115,y=coastHeight(-650+x,z);
  const g=new T.Group();g.position.set(-650+x,y,z);root.add(g);box([0,3,0],[16,6,14],wood,g);
  const mat=material(0xffda83,{emissive:0xffc461,emissiveIntensity:0});const gem=mesh(ball,mat,[0,12,0],[8,9,4],g,true);mesh(ring,ivory,[0,12,0],[11,12,9],g);solid('light-target-'+a,-650+x,z,16,14,22);return gem;
 });
 const beamGeo=new T.ConeGeometry(13,1,20,1,true);beamGeo.translate(0,-.5,0);beamGeo.rotateX(-Math.PI/2);geometries.add(beamGeo);
 const beamMat=new T.MeshBasicMaterial({color:0xffe39b,transparent:true,opacity:.16,depthWrite:false,side:T.DoubleSide});materials.add(beamMat);
 const beam=new T.Mesh(beamGeo,beamMat);beam.position.set(-650,coastHeight(-650,185)+91,185);root.add(beam);
 const spot=mesh(ring,gold,[0,0,0],[12,12,12],root,true);spot.rotation.x=-Math.PI/2;
 const r=groups.rocks;
 // A shallow channel sits inside the existing tide pool. Its solid sides are
 // shared with walking collision; the visible body floats on the simulated water.
 box([0,1,40],[76,2,25],wood,r);box([0,7,27],[80,14,2],glass,r);box([0,7,53],[80,14,2],glass,r);box([0,14,27],[80,1.5,2],ivory,r);box([0,14,53],[80,1.5,2],ivory,r);box([-39,7,40],[2,14,28],ivory,r);box([39,7,40],[2,14,28],ivory,r);
 solid('channel',-465,280,80,28,14);box([-32,10,0],[8,20,8],mint,r);solid('gate-handle',-497,240,8,8,20);
 const goalMaterial=material(0xf2bd59,{emissive:0xf2bd59,emissiveIntensity:.14}),goalGold=new T.Color(0xf2bd59),goalMint=new T.Color(0x78c9ba);
 const floatMaterial=material(0xf29487,{emissive:0xf29487,emissiveIntensity:.12}),handleMaterial=material(0xf2bd59,{emissive:0xf6c46b,emissiveIntensity:.18});
 const gate=box([-33,8,40],[3,14,24],mint,r,true),pool=box([0,2,40],[74,.1,24],water,r,true),float=mesh(ball,floatMaterial,[-28,5,40],[4,3,4],r,true),goal=mesh(ring,goalMaterial,[20,3,40],[6,6,6],r,true);goal.rotation.x=-Math.PI/2;goal.name='浮きをとめる輪';
 const arrowGeometry=new T.ConeGeometry(1.3,5,5);arrowGeometry.rotateZ(-Math.PI/2);geometries.add(arrowGeometry);
 const arrowMaterial=new T.MeshBasicMaterial({color:0xffedbc,toneMapped:false});materials.add(arrowMaterial);
 const flowArrows=new T.InstancedMesh(arrowGeometry,arrowMaterial,6),arrowPose=new T.Object3D();flowArrows.name='水門からの流れ';flowArrows.visible=false;flowArrows.frustumCulled=false;r.add(flowArrows);
 const gateHandle=box([-32,23,0],[16,2,3],handleMaterial,r,true);
 const g=groups.garden;box([0,10,0],[9,20,9],mint,g);box([5,22,0],[15,3,3],mint,g);solid('garden-pump',665,113,12,12,25);
 const pump=box([0,28,0],[24,2,3],gold,g,true);
 const wheel=new T.Group();wheel.position.set(23,15,-15);g.add(wheel);mesh(ring,wood,[0,0,0],[13,13,13],wheel,true);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;const paddle=box([Math.sin(a)*11,Math.cos(a)*11,0],[8,3,5],gold,wheel,true);paddle.rotation.z=-a;}
 const stream=box([16,24,-15],[2,17,2],water,g,true);stream.name='水車へ落ちる水';stream.visible=false;
 box([23,2,-15],[30,4,18],mint,g);solid('garden-wheel',688,98,30,18,29);
 const beds=[],petals=[];for(let i=0;i<2;i++){
  const x=i?40:-20;beds.push(box([x,3,-40],[22,6,20],wood,g,true));solid('garden-bed-'+i,665+x,73,22,20,18);
  const flower=new T.Group();flower.position.set(x,5,-40);g.add(flower);box([0,4,0],[1.5,8,1.5],leaf,flower,true);
  for(let j=0;j<5;j++){const a=j*Math.PI*2/5;mesh(ball,coral,[Math.sin(a)*4,9+Math.cos(a)*4,0],[3,3,1.5],flower,true);}mesh(ball,gold,[0,9,0],[2,2,2],flower,true);petals.push(flower);
 }
 const spout=box([10,6,-28],[3,3,28],mint,g,true),waterTrail=box([0,7,-40],[2,3,2],water,g,true);
 const pumpJet=box([0,0,0],[1,1,1],water,g,true);pumpJet.name='ポンプから水車へ';waterTrail.name='選んだ花へ流れる水';
 const flowerChoice=mesh(ring,gold,[-20,6.7,-40],[9,9,9],g,true);flowerChoice.rotation.x=-Math.PI/2;flowerChoice.name='水を送る花壇';
 const segmentStart=new T.Vector3(),segmentEnd=new T.Vector3(),segmentDelta=new T.Vector3(),up=new T.Vector3(0,1,0);
 function segment(o,a,b,width){segmentStart.set(...a);segmentEnd.set(...b);segmentDelta.subVectors(segmentEnd,segmentStart);const length=segmentDelta.length();o.position.copy(segmentStart).add(segmentEnd).multiplyScalar(.5);o.scale.set(width,length,width);o.quaternion.setFromUnitVectors(up,segmentDelta.normalize());}
 segment(pumpJet,[10,23,0],[16,27,-15],2.4);segment(stream,[16,27,-15],[23,8,-15],2.4);
 // Parts rigidly attached to the same moving wheel/flower share a draw.
 // Keep a local ownership set so baking a child never disposes sibling geometry.
 for(const group of [wheel,handle,...petals]){const local=new Set();batchCoastScenery(group,[...group.children],{geometries:local});for(const geo of local)geometries.add(geo);}
 const resources={root,geometries,materials};batchCoastScenery(root,fixed,{geometries});
 const target=new T.Vector3(),ray=new T.Raycaster(),screen=new T.Vector2(),anchor=new T.Vector3();let disposed=false,lastTank=null,lastTick=-1,lastEdit=-1,waterUntil=-Infinity,selectedAim=null;
 const controls=[{id:'lighthouse',kind:'turn',node:handle},{id:'rocks',kind:'gate',node:gateHandle},{id:'garden',kind:'pump',node:pump},{id:'garden',kind:'aim',node:spout,aim:null},{id:'garden',kind:'aim',node:flowerChoice,get aim(){return selectedAim;}},...beds.map((node,i)=>({id:'garden',kind:'aim',node,flower:petals[i],aim:i}))];
 const contains=(node,o)=>{for(let p=o;p&&p!==root;p=p.parent)if(p===node)return true;return false;};
 const opaque=o=>{if(!o.visible)return false;for(let p=o.parent;p;p=p.parent)if(!p.visible)return false;const mats=Array.isArray(o.material)?o.material:[o.material];return mats.some(m=>m&&m.visible&&(!m.transparent||m.opacity>=.5));};
 function pickControl(camera,canvas,x,y,id){
  if(disposed||!camera||!canvas||!controls.some(c=>c.id===id))return null;
  const rect=canvas.getBoundingClientRect();if(rect.width<=0||rect.height<=0||x<rect.left||x>rect.right||y<rect.top||y>rect.bottom)return null;
  parent.updateWorldMatrix(true,true);camera.updateMatrixWorld();screen.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);ray.setFromCamera(screen,camera);
  const hit=ray.intersectObject(parent,true).find(h=>opaque(h.object));
  const direct=hit&&controls.find(c=>c.id===id&&(contains(c.node,hit.object)||c.flower&&contains(c.flower,hit.object)));if(direct)return{id:direct.id,kind:direct.kind,aim:direct.aim};
  // Small handles have a modest touch allowance. Project the real handle and
  // keep the first opaque obstruction, so walls cannot be touched through.
  let near=null,distance=22;
  for(const c of controls.filter(c=>c.id===id&&c.kind!=='aim')){c.node.getWorldPosition(anchor);const depth=anchor.distanceTo(ray.ray.origin),p=anchor.clone().project(camera);if(p.z < -1||p.z>1||hit&&hit.distance<depth-10)continue;
   const d=Math.hypot(x-(rect.left+(p.x+1)*rect.width/2),y-(rect.top+(1-p.y)*rect.height/2));if(d<distance){distance=d;near=c;}}
  return near?{id:near.id,kind:near.kind,aim:near.aim}:null;
 }
 function update(s,now=0){
  if(disposed)return;const a=s.lighthouse;handle.rotation.z=-a.angle*2;
  target.set(-650+Math.sin(a.angle)*115,coastHeight(-650,300)+8,185+Math.cos(a.angle)*115);beam.lookAt(target);beam.scale.set(1,1,beam.position.distanceTo(target));beam.visible=a.power>.01;beamMat.opacity=a.power*.19;spot.position.copy(target);spot.position.y=coastHeight(target.x,target.z)+.4;spot.visible=beam.visible;
  lenses.forEach((gem,i)=>{gem.material.emissiveIntensity=a.lit[i]?1.2:a.charge[i]*.8;gem.material.color.setHex(a.lit[i]?0xffee98:0xb5c7bd);});
  const b=s.rocks;gate.position.y=8+b.gate*13;gateHandle.rotation.z=-b.gate*.9;pool.scale.y=Math.max(.1,b.water*10);pool.position.y=2+pool.scale.y/2;float.position.set(b.x,3+b.y,40);float.rotation.z=-b.vx*.05;goal.position.y=3+b.water*10;
  goalMaterial.color.copy(goalGold).lerp(goalMint,b.done?1:b.hold);goalMaterial.emissive.copy(goalMaterial.color);goalMaterial.emissiveIntensity=.14+(b.done?1:b.hold)*.35;
  const current=b.gate*b.water;flowArrows.visible=current>.02;
  if(flowArrows.visible){const phase=(s.tick/60*(3+current*10))%10;for(let i=0;i<6;i++){arrowPose.position.set(-29+i*10+phase,2.7+b.water*10,40);arrowPose.scale.set(1,.5,1);arrowPose.updateMatrix();flowArrows.setMatrixAt(i,arrowPose.matrix);}flowArrows.instanceMatrix.needsUpdate=true;}
  const c=s.garden;wheel.rotation.z=-c.wheel;
  // The wheel may coast after release, but flowing water is shown only while
  // the finite tank is actually supplying it. A resumed spinning wheel does
  // not pretend to keep watering a flower.
  if(s.edit!==lastEdit&&s.tick===lastTick)waterUntil=-Infinity;
  if(s.tick>lastTick&&lastTank!==null&&c.tank<lastTank-.00001)waterUntil=now+100;lastTank=c.tank;lastTick=s.tick;lastEdit=s.edit;
  const flowing=now<waterUntil,destination=c.aim?40:-20;
  pump.rotation.z=flowing?Math.sin(c.wheel*3)*Math.min(.35,c.speed*.12):0;
  stream.visible=pumpJet.visible=waterTrail.visible=flowing;
  if(selectedAim!==c.aim){selectedAim=c.aim;segment(spout,[23,6.5,-15],[destination,7,-40],3);segment(waterTrail,[23,8.5,-15],[destination,8.5,-40],1.6);flowerChoice.position.x=destination;}
  petals.forEach((p,i)=>p.scale.setScalar(.3+.7*c.beds[i]/4));
 }
 return{...resources,update,pickControl,point(id){const t=COAST_TOYS[id];return new T.Vector3(t.x,coastHeight(t.x,t.z)+42,t.z);},controlPoint(id){const node=id==='rocks'?gateHandle:id==='garden'?pump:handle;return node.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,9,0));},dispose(){if(disposed)return;disposed=true;root.removeFromParent();flowArrows.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
