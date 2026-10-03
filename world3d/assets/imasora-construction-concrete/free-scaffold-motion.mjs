import {accessPlatePieces} from './free-foundation-access.mjs';
import {accessDeckPlates} from './free-access-deck.mjs';
import * as T from '../three.module.min.js';
import {scaffoldSurface,scaffoldSupport,SCAFFOLD_RADIUS} from './free-frame-scaffold.mjs';
import {FOOT_LEVEL_EPS} from './free-footing.mjs';

// Work decks use measured shoes rather than the conservative square used for
// unassisted ground travel. Stairs plant one foot before moving the other.
export function createScaffoldMotion({f,root,actor,feet,record,footing,heightAt,external,parent,box,mats,name='demold-scaffold',surfaceAt=scaffoldSurface,supportAt=scaffoldSupport,fixedPlan=null,sharedPlatform=null}){
 const group=new T.Group();group.name=name;parent.add(group);
 const disk=new T.CylinderGeometry(SCAFFOLD_RADIUS,SCAFFOLD_RADIUS,.6,20);
 root.updateMatrixWorld(true);const origin=root.getWorldPosition(new T.Vector3());
 const clearance=Math.min(...feet.map(e=>new T.Box3().setFromObject(e.o).min.y))-origin.y-actor.position.y;
 let current=null,fixedGeometry=null;const platformMaterial=fixedPlan?new T.MeshStandardMaterial({color:'#637785',roughness:.95,metalness:.1}):null;
 const reset=()=>feet.forEach(e=>e.o.position.copy(e.position));
 function shoe(e){root.updateMatrixWorld(true);return new T.Box3().setFromObject(e.o).translate(origin.clone().negate());}
 function centre(b){return new T.Vector3((b.min.x+b.max.x)/2,b.min.y,(b.min.z+b.max.z)/2);}
 function anchors(pose){const position=actor.position.clone(),r=actor.rotation.clone();actor.position.set(pose.x,pose.y,pose.z);actor.rotation.set(0,pose.heading,0);reset();const result=feet.map(e=>centre(shoe(e)));actor.position.copy(position);actor.rotation.copy(r);return result;}
 function show(plan){
  if(fixedPlan)plan=fixedPlan;
  if(sharedPlatform){sharedPlatform.show();current=plan;return;}
  if(current===plan)return;group.clear();current=plan;
  const thickness=plan.thickness??.6;
  for(const s of plan.stairs)if(plan.kind!=='fixed-frame-work'||Math.abs(s.y-plan.height)>1e-8)box(group,s.x,s.y-thickness/2,s.z,s.halfX*2,thickness,s.halfZ*2,platformMaterial??mats.metal,'scaffold-tread');
  if(plan.kind==='fixed-frame-work'){
   // One merged opaque mesh. Adjacent pieces do not overlap or z-fight.
   const positions=[],normals=[],indices=[],top=plan.height,bottom=top-thickness;
   const quad=(points,normal)=>{const offset=positions.length/3;for(const p of points){positions.push(...p);normals.push(...normal);}indices.push(offset,offset+1,offset+2,offset,offset+2,offset+3);};
   const exposed=(a,b,covered)=>{let runs=[[a,b]];for(const[c,d]of covered){const next=[];for(const[x,y]of runs){if(d<=x||c>=y)next.push([x,y]);else{if(c>x)next.push([x,c]);if(d<y)next.push([d,y]);}}runs=next;}return runs;};
   const bounds=plan.pieces.map(p=>({x0:p.x-p.width/2,x1:p.x+p.width/2,z0:p.z-p.depth/2,z1:p.z+p.depth/2}));
   for(const p of bounds){const{x0,x1,z0,z1}=p;quad([[x0,top,z0],[x0,top,z1],[x1,top,z1],[x1,top,z0]],[0,1,0]);quad([[x0,bottom,z0],[x1,bottom,z0],[x1,bottom,z1],[x0,bottom,z1]],[0,-1,0]);
    for(const[a,b]of exposed(z0,z1,bounds.filter(q=>q!==p&&q.x0===x1).map(q=>[q.z0,q.z1])))quad([[x1,bottom,a],[x1,top,a],[x1,top,b],[x1,bottom,b]],[1,0,0]);
    for(const[a,b]of exposed(z0,z1,bounds.filter(q=>q!==p&&q.x1===x0).map(q=>[q.z0,q.z1])))quad([[x0,bottom,b],[x0,top,b],[x0,top,a],[x0,bottom,a]],[-1,0,0]);
    for(const[a,b]of exposed(x0,x1,bounds.filter(q=>q!==p&&q.z0===z1).map(q=>[q.x0,q.x1])))quad([[a,bottom,z1],[b,bottom,z1],[b,top,z1],[a,top,z1]],[0,0,1]);
    for(const[a,b]of exposed(x0,x1,bounds.filter(q=>q!==p&&q.z1===z0).map(q=>[q.x0,q.x1])))quad([[b,bottom,z0],[a,bottom,z0],[a,top,z0],[b,top,z0]],[0,0,-1]);
   }
   fixedGeometry=new T.BufferGeometry();fixedGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));fixedGeometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));fixedGeometry.setIndex(indices);const mesh=new T.Mesh(fixedGeometry,platformMaterial);mesh.name='fixed-work-platform';group.add(mesh);
   // Shared box geometry is owned by the calling motion. Two draw calls keep
   // every measured post without hundreds of separate mobile draw calls.
   const sample=box(group,0,0,0,1,1,1,mats.metal,'post-template'),geometry=sample.geometry;group.remove(sample);
   const posts=new T.InstancedMesh(geometry,mats.metal,plan.legs.length),pads=new T.InstancedMesh(geometry,mats.dark,plan.legs.length),matrix=new T.Matrix4(),q=new T.Quaternion(),scale=new T.Vector3(),pos=new T.Vector3();
   posts.name='scaffold-post';pads.name='scaffold-foot';
   for(let i=0;i<plan.legs.length;i++){const p=plan.legs[i],h=p.y-thickness-p.base;posts.setMatrixAt(i,matrix.compose(pos.set(p.x,p.base+h/2,p.z),q,scale.set(.6,h,.6)));pads.setMatrixAt(i,matrix.compose(pos.set(p.x,p.base+.025,p.z),q,scale.set(1.2,.05,1.2)));}
   posts.instanceMatrix.needsUpdate=pads.instanceMatrix.needsUpdate=true;group.add(posts,pads);return;
  }
  if(plan.kind==='foundation-work'){for(const q of plan.pieces)box(group,q.x,plan.height-thickness/2,q.z,q.width,thickness,q.depth,mats.metal,'foundation-work-deck');for(const p of plan.legs){const h=p.y-thickness-p.base;box(group,p.x,p.base+h/2,p.z,.6,h,.6,mats.metal,'scaffold-post');box(group,p.x,p.base+.025,p.z,1.2,.05,1.2,mats.dark,'scaffold-foot');}return;}
  if(plan.kind==='foundation-access'){for(const r of accessDeckPlates(plan.path))for(const q of accessPlatePieces(r,plan.cutouts))box(group,q.x,plan.height-thickness/2,q.z,q.width,thickness,q.depth,mats.metal,'foundation-access-deck');for(const p of plan.legs){const h=Math.max(0,p.y-thickness-p.base);if(h)box(group,p.x,p.base+h/2,p.z,.6,h,.6,mats.metal,'scaffold-post');box(group,p.x,p.base+.025,p.z,1.2,.05,1.2,mats.dark,'scaffold-foot');}return;}
  for(let i=1;i<plan.path.length;i++){const a=plan.path[i-1],b=plan.path[i],length=Math.hypot(b.x-a.x,b.z-a.z),deck=box(group,(a.x+b.x)/2,plan.height-thickness/2,(a.z+b.z)/2,SCAFFOLD_RADIUS*2,thickness,length,mats.metal,'scaffold-deck');deck.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);}
  for(const p of plan.path){const cap=new T.Mesh(disk,mats.metal);cap.scale.y=thickness/.6;cap.position.set(p.x,plan.height-thickness/2,p.z);cap.name='scaffold-landing';group.add(cap);}
  for(const p of plan.legs){box(group,p.x,(p.y-thickness+p.base)/2,p.z,.6,p.y-thickness-p.base,.6,mats.metal,'scaffold-post');box(group,p.x,p.base+.025,p.z,1.2,.05,1.2,mats.dark,'scaffold-foot');}
 }
 function support(plan){record.maxSupportError=Math.max(record.maxSupportError,supportAt(f,fixedPlan??plan,heightAt,external));}
 function measure(plan,planted=[true,true]){
  support(plan);plan=fixedPlan??plan;let count=0,error=0;
  feet.forEach((e,i)=>{const b=shoe(e);for(const u of [0,.5,1])for(const v of [0,.5,1]){const x=b.min.x+(b.max.x-b.min.x)*u,z=b.min.z+(b.max.z-b.min.z)*v,h=surfaceAt(f,plan,x,z,heightAt),diff=b.min.y-clearance-h;if(h===null||!Number.isFinite(diff)||diff<-.15||planted[i]&&Math.abs(diff)>FOOT_LEVEL_EPS+1e-5)throw Error('階段・足場が靴底を支えていないため止めました。',{cause:{x,z,h,bottom:b.min.y,clearance,planted,i}});if(planted[i])error=Math.max(error,Math.abs(diff));}if(planted[i])count++;});
  if(!count)throw Error('階段に足を置いてから進んでください。');record.samples++;record.minimumPlanted=Math.min(record.minimumPlanted,count);record.maxSoleError=Math.max(record.maxSoleError,error);
  if(count===2){footing.samples++;footing.maxHeightError=Math.max(footing.maxHeightError,error);}
 }
 return{
  group,
  open(plan,progress){show(plan);support(plan);if(progress===1)record.deployments++;},
  close(plan,progress){support(plan);if(progress===1){if(!fixedPlan){group.clear();current=null;}record.recoveries++;}},
  stand(plan){show(plan);measure(plan);},
  walk(plan,phase){show(plan);feet.forEach((e,i)=>e.o.position.y+=Math.max(0,Math.sin(phase+i*Math.PI))*2.6);measure(plan,feet.map((_,i)=>Math.sin(phase+i*Math.PI)<=1e-9));},
  climb(s,t){
   show(s.scaffold);const from={...s.from,heading:s.to.heading},to=s.to,a=anchors(from),b=anchors(to),smooth=u=>u*u*(3-2*u),body=smooth(t);
   actor.position.set(from.x+(to.x-from.x)*body,from.y+(to.y-from.y)*body,from.z+(to.z-from.z)*body);actor.rotation.set(0,to.heading,0);reset();
   const planted=[];
   feet.forEach((e,i)=>{const u=Math.max(0,Math.min(1,t*2-i)),v=smooth(u),goal=a[i].clone().lerp(b[i],v);goal.y+=Math.sin(Math.PI*u)*4;planted[i]=u===0||u===1;const delta=goal.sub(centre(shoe(e)));root.updateMatrixWorld(true);const world=e.o.getWorldPosition(new T.Vector3()).add(delta);e.o.position.copy(e.o.parent.worldToLocal(world));});
   try{measure(s.scaffold,planted);}catch(e){e.cause={...e.cause,from,to,t,a:a.map(p=>p.toArray()),b:b.map(p=>p.toArray()),actor:actor.position.toArray()};throw e;}if(t===1)record[s.ascending?'ascents':'descents']++;
  },
  verify(){if(fixedPlan)support(fixedPlan);},
  dispose(){group.children.forEach(o=>{if(o.isInstancedMesh)o.dispose();});group.clear();fixedGeometry?.dispose();platformMaterial?.dispose();disk.dispose();}
 };
}
