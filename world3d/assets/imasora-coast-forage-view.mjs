import {coastFindPose} from './imasora-coast-tidal-finds.mjs?v=120mx';
import * as T from './three.module.min.js';
import {COAST_FINDS,coastFindAvailable} from './imasora-coast-forage.mjs?v=120ps';
import {coastHeight} from './imasora-coast-layout.mjs?v=120mx';

export function createCoastForageView(parent,{collider=()=>{},workshop=false}={}){
 const root=new T.Group();root.name='海辺の落とし物';parent.add(root);
 const cube=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,10,6),diamond=new T.OctahedronGeometry(1),ringGeo=new T.RingGeometry(5,5.6,28);
 const timber=new T.MeshStandardMaterial({color:0xecc591,roughness:.9}),straps=new T.MeshStandardMaterial({color:0xffffff,roughness:.8}),natural=new T.MeshStandardMaterial({color:0xffffff,roughness:.72}),shine=new T.MeshBasicMaterial({color:0xfff7b5}),ringMat=new T.MeshBasicMaterial({color:0xffde79,side:T.DoubleSide,depthTest:true});
 const bodies=new T.InstancedMesh(cube,timber,24),bands=new T.InstancedMesh(cube,straps,24),finds=new T.InstancedMesh(sphere,natural,20),glints=new T.InstancedMesh(diamond,shine,16);
 for(const m of[bodies,bands,finds,glints]){m.count=0;m.frustumCulled=false;m.receiveShadow=true;root.add(m);}
 const marker=new T.Mesh(ringGeo,ringMat);marker.rotation.x=-Math.PI/2;marker.visible=false;root.add(marker);
 const signal=new T.Mesh(diamond,shine);signal.name='いま拾える落とし物';signal.visible=false;signal.scale.set(1.8,2.7,1.8);root.add(signal);
 const workbench=new T.Group();workbench.position.set(590,coastHeight(590,142)+16,142);if(workshop)root.add(workbench);
 const toolMaterial=new T.MeshStandardMaterial({color:0xf3b97c}),paintMaterial=new T.MeshStandardMaterial({color:0x8bd5cb});
 const lid=new T.Mesh(cube,toolMaterial);lid.position.set(-8,5,0);lid.scale.set(10,1.5,8);workbench.add(lid);
 const bowl=new T.Mesh(sphere,paintMaterial);bowl.position.set(7,2,0);bowl.scale.set(4,2,4);workbench.add(bowl);
 const pestle=new T.Mesh(cube,toolMaterial);pestle.position.set(7,6,0);pestle.scale.set(1.5,8,1.5);workbench.add(pestle);
 let workType=null,workUntil=0,workDone=false;
 function work(type,phase){workType=type;workDone=phase==='done';workUntil=phase==='cancel'?0:performance.now()+(workDone?1200:10000);}
 const matrix=new T.Matrix4(),size=new T.Vector3(),color=new T.Color();let key=null,disposed=false,turn=0;
 const add=(mesh,n,x,y,z,w,h,d,c)=>{matrix.makeRotationY(turn);matrix.scale(size.set(w,h,d));matrix.setPosition(x,y,z);mesh.setMatrixAt(n,matrix);if(c!==undefined)mesh.setColorAt(n,color.set(c));};
 const benchName=new T.Group();benchName.position.set(590,coastHeight(590,142),142);benchName.userData.nearbyName={id:'coast:workshop',name:'海辺の工房',hx:18,hz:16,height:24};if(workshop)root.add(benchName);
 const ground=coastHeight(590,142);if(workshop)collider(590,142,[28,16],0,'coast-workshop',0,{minY:ground,maxY:ground+16,obstacleHeight:ground+16});
 function sync(state,now=Date.now()){
  if(disposed)return;const active=COAST_FINDS.map(f=>coastFindPose(f,now)).filter(f=>f.rendered&&coastFindAvailable(state,f,now)),next=active.map(f=>f.id+':'+f.x.toFixed(1)+':'+f.z.toFixed(1)+':'+f.drawY.toFixed(1)).join('|');if(next===key)return;key=next;
  let b=0,s=0,n=0,g=0;turn=0;
  // A real table in front of the pavilion; its roof never hides the hand tools.
  if(workshop){
  add(bodies,b++,590,ground+14,142,28,3,16);for(const x of[-10,10])for(const z of[-5,5])add(bodies,b++,590+x,ground+6,142+z,2,12,2);
  add(bands,s++,590,ground+18,142,9,5,7,0x9fd9e6);add(bands,s++,590,ground+21,142,10,1,8,0xffe2a1);
  }
  for(const f of active){turn=f.rotation;const y=f.drawY;
   if(f.kind==='kit'){add(bodies,b++,f.x,y+4,f.z,9,7,7);add(bands,s++,f.x,y+4.1,f.z,1.4,7.3,7.3,0x8bd7dc);add(bands,s++,f.x,y+7.7,f.z,9.3,.8,7.3,0x9fdde4);}
   else{const trash=f.kind==='litter',c=trash?0xf2ada0:f.kind==='shell'?0xffe6c8:f.kind==='glass'?0x7cdad7:0x92cfa6;add(finds,n++,f.x,y+(trash?2.5:1.3),f.z,trash?3.4:3,trash?2.5:1.1,trash?2.5:2.7,c);}
   // No global floating diamonds: discover the actual object in the wet sand.
  }
  for(const[m,count]of[[bodies,b],[bands,s],[finds,n],[glints,g]]){m.count=count;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
 }
 function update(state,target,now=Date.now()){
  if(disposed)return;sync(state,now);const working=performance.now()<workUntil;lid.rotation.z=working&&workType==='open'?-1.1:0;pestle.position.y=working?6+Math.sin(now*.02)*2:6;pestle.rotation.z=working&&workType!=='dye'?Math.sin(now*.013)*.45:0;bowl.material.color.setHex(workDone&&working?0xf3a6c4:0x8bd5cb);glints.position.y=Math.sin(now*.002)*.8;
  const slot=COAST_FINDS.find(f=>f.id===target),f=slot&&coastFindPose(slot,now);marker.visible=!!f&&f.visible&&coastFindAvailable(state,f,now);
  signal.visible=marker.visible;if(signal.visible)signal.position.set(f.x,coastHeight(f.x,f.z)+11+Math.sin(now*.004),f.z);
  if(marker.visible){marker.position.set(f.x,coastHeight(f.x,f.z)+.25,f.z);marker.scale.setScalar(1+Math.sin(now*.004)*.035);}
 }
 function dispose(){if(disposed)return;disposed=true;for(const m of[bodies,bands,finds,glints])m.dispose();for(const g of[cube,sphere,diamond,ringGeo])g.dispose();for(const m of[timber,straps,natural,shine,ringMat,toolMaterial,paintMaterial])m.dispose();root.removeFromParent();}
 return{root,sync,update,work,dispose};
}
