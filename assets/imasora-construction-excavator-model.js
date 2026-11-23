import * as THREE from './three.module.min.js';
import {createLoader,repeatVehiclePart} from './imasora-construction-loader-model.js?v=121e7';
import {armPose,EX} from './imasora-construction-excavator.js?v=120ov';
import {EX_ACCESS,accessOuter} from './imasora-construction-excavator-access.js?v=120ov';
import {isBackhoe,bucketRotation,bucketPoint,BUCKET_OUTLINE,BUCKET_SHELL,BUCKET_TOOTH,toothHalfWidth} from './imasora-construction-excavator-bucket.js';
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.65,...extra});
const yellow=mat(0xfeb30e,{metalness:.18}),dark=mat(0x28393c),rubber=mat(0x202b2c),steel=mat(0xb9c8c3,{metalness:.8,roughness:.28});
function box(g,w,h,d,x,y,z,m,name){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.name=name;o.castShadow=o.receiveShadow=true;g.add(o);return o;}
function cylinder(g,r,length,x,y,z,m){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,length,20),m);o.rotation.z=Math.PI/2;o.position.set(x,y,z);o.castShadow=true;g.add(o);return o;}
function link(g,m,width){const o=box(g,width,1,width,0,0,0,m,'油圧アーム');return o;}
const vec=p=>new THREE.Vector3(p.x,p.y,p.z);
function align(o,a,b){a=vec(a);b=vec(b);const d=b.clone().sub(a);o.position.copy(a.add(b).multiplyScalar(.5));o.scale.y=d.length();o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());}
function bucketPlate(group,points,width,x,material,name){
  const shape=new THREE.Shape();points.forEach(([y,z],i)=>i?shape.lineTo(z,y):shape.moveTo(z,y));shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:width,bevelEnabled:false});geometry.rotateY(-Math.PI/2);geometry.translate(width/2,0,0);
  const mesh=new THREE.Mesh(geometry,material);mesh.position.x=x;mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;
}
// Keep the soil inside the same open cavity as the physical bucket. A small
// scaled box at its bottom looked empty even after a real cut. Clip the inner
// profile at the actual load level instead, without changing shell/colliders.
const soilProfile=BUCKET_SHELL.slice(6).map(p=>p.slice());
const soilArea=points=>Math.abs(points.reduce((a,p,i)=>{const q=points[(i+1)%points.length];return a+p[0]*q[1]-q[0]*p[1];},0))/2;
function soilBelow(height){
  const out=[];for(let i=0;i<soilProfile.length;i++){
    const a=soilProfile[i],b=soilProfile[(i+1)%soilProfile.length],inside=a[0]<=height,next=b[0]<=height;
    if(inside)out.push(a.slice());if(inside!==next){const t=(height-a[0])/(b[0]-a[0]);out.push([height,a[1]+(b[1]-a[1])*t]);}
  }return out;
}
function createBucketSoil(){
  const group=new THREE.Group();group.name='積載土';group.visible=false;
  const material=mat(0x936038,{roughness:1,metalness:0});
  const mesh=new THREE.Mesh(new THREE.BufferGeometry(),material);mesh.castShadow=mesh.receiveShadow=true;mesh.name='内面にたまった土';group.add(mesh);
  const clods=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),mat(0xa77648,{roughness:1}),84);clods.name='土の粒と凹凸';clods.castShadow=clods.receiveShadow=true;clods.count=0;group.add(clods);
  group.userData={mesh,clods,fraction:-1};return group;
}
function updateBucketSoil(group,amount){
  const fraction=Math.max(0,Math.min(1,amount/EX.capacity)),data=group.userData;group.visible=fraction>0;
  if(fraction===data.fraction)return;data.fraction=fraction;if(!fraction){data.clods.count=0;return;}
  const full=soilArea(soilProfile),target=full*fraction;let lo=-13.3,hi=0;
  for(let i=0;i<26;i++){const mid=(lo+hi)/2;if(soilArea(soilBelow(mid))<target)lo=mid;else hi=mid;}
  const height=(lo+hi)/2,profile=soilBelow(height),shape=new THREE.Shape();profile.forEach(([y,z],i)=>i?shape.lineTo(z,y):shape.moveTo(z,y));shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:14.8,bevelEnabled:false});geometry.rotateY(-Math.PI/2);geometry.translate(7.4,0,0);data.mesh.geometry.dispose();data.mesh.geometry=geometry;
  // Small, inset clods roughen the exposed free surface. They cannot extend
  // through a side plate, the curved shell or the open mouth's edge.
  const edge=profile.filter(p=>Math.abs(p[0]-height)<1e-5).map(p=>p[1]),z0=Math.min(...edge),z1=Math.max(...edge),dummy=new THREE.Object3D();let count=0;
  for(let row=0;row<6;row++)for(let col=0;col<7;col++){
    const x=-6+col*2+(row%2? .22:-.22),z=z0+(z1-z0)*(row+.5)/6,r=Math.min(.62,(z1-z0)/14,(height+13.3)*.2);
    if(r<.05)continue;dummy.position.set(x,height-r*.8,z);dummy.rotation.set(row*.71,col*.93,(row+col)*.38);dummy.scale.set(r*(.9+(col%3)*.1),r*.85,r);dummy.updateMatrix();data.clods.setMatrixAt(count++,dummy.matrix);
  }
  // The mouth is diagonal in bucket-local coordinates. Its exposed soil is
  // visible from the operator camera even when the local horizontal top ends
  // at the rim. Do not mistake that open face for a closed metal side plate.
  const mouth=Math.max(0,Math.min(1,(height+10.7)/10.7)),normal=new THREE.Vector2(-14,10.7).normalize();
  for(let row=0;row<6&&mouth>.03;row++)for(let col=0;col<7;col++){
    const t=mouth*(row+.5)/6,r=Math.min(.55,mouth*1.2),x=-6+col*2+(row%2?.18:-.18);
    dummy.position.set(x,-10.7+10.7*t+normal.x*r*.7,-14+14*t+normal.y*r*.7);dummy.rotation.set(row*.51,col*.81,(row+col)*.33);dummy.scale.set(r,r*.82,r);dummy.updateMatrix();data.clods.setMatrixAt(count++,dummy.matrix);
  }
  data.clods.count=count;data.clods.instanceMatrix.needsUpdate=true;data.clods.computeBoundingSphere();data.fillHeight=height;data.filledProfile=profile;data.filledArea=soilArea(profile);
}
function createBackhoeBucket(){
  const g=new THREE.Group();g.name='内向きバックホーバケット';
  bucketPlate(g,BUCKET_SHELL,18,0,dark,'曲面バケット外殻');
  // Shell and side plates used to cover the same x=+/-9 rim faces. Partition
  // the outline at the shell's inner contour so each visible face exists once.
  // The shell and outline share their first six points; keep the black rim,
  // original width, outer silhouette and physical collision geometry intact.
  const sideFill=[BUCKET_OUTLINE[0],...BUCKET_SHELL.slice(6).reverse(),...BUCKET_OUTLINE.slice(5)];
  for(const x of[-8.35,8.35])bucketPlate(g,sideFill,1.3,x,yellow,'バケット側板');
  for(const x of[-6,-2,2,6]){
    // Short wedge teeth continue the lip's inward/upward tangent. The previous
    // long downward spike bent away from the bowl instead of following it.
    const tooth=bucketPlate(g,BUCKET_TOOTH,2.8,x,steel,'掘削歯');
    const p=tooth.geometry.getAttribute('position');
    for(let i=0;i<p.count;i++)p.setX(i,p.getX(i)*toothHalfWidth(p.getZ(i))/1.4);
    p.needsUpdate=true;tooth.geometry.computeVertexNormals();
  }
  box(g,17,1.5,2,0,-12,-14,steel,'内向き切刃');
  for(const x of[-3,3])box(g,1.4,7,5,x,1,-1,yellow,'バケット取付耳');cylinder(g,2,10,0,0,0,steel);
  const soil=createBucketSoil();g.add(soil);
  return {group:g,soil};
}
export function createExcavator(){
  const root=new THREE.Group();root.name='ショベルカー';const upper=createLoader();upper.name='旋回キャビン';
  for(const w of upper.userData.wheels)upper.remove(w.pivot);
  const remove=['chassis','wheel-guard','lift-arm','bucket-link','hydraulic-cylinder','hydraulic-piston','arm-pivot','loader-bucket'];
  for(const o of [...upper.children])if(remove.includes(o.name))upper.remove(o);
  for(const o of upper.userData.steps)upper.remove(o);
  // Raise the existing cabin, both seats, socket and roof together. Do not
  // change the official character scale or the arm/undercarriage dimensions.
  for(const o of upper.children)o.position.y+=EX_ACCESS.lift;
  const steps=[],stepsPivot=new THREE.Group();root.add(stepsPivot);
  for(const side of [-1,1]){
    const group=new THREE.Group();group.userData.side=side;stepsPivot.add(group);steps.push(group);
    for(let i=0;i<3;i++){
      const top=i===2?EX_ACCESS.floor:6*(i+1);
      box(group,8,1.5,22,0,top-.75,-8,steel,'ショベル乗降踏板');
      for(const z of [-17,-11,-5,1])box(group,7,.18,.8,0,top+.09,z,dark,'踏板滑り止め');
    }
    box(group,1,EX_ACCESS.floor,1,0,EX_ACCESS.floor/2,-19,yellow,'乗降支柱');
    box(group,1,EX_ACCESS.floor,1,0,EX_ACCESS.floor/2,3,yellow,'乗降支柱');
    box(group,1,14,1,side*29,EX_ACCESS.floor+7,-21,steel,'乗降手すり');
    box(group,1,14,1,side*29,EX_ACCESS.floor+7,5,steel,'乗降手すり');
    box(group,1,1.5,22,0,EX_ACCESS.floor-.75,-8,dark,'乗降渡り板');
  }
  box(upper,55,EX_ACCESS.lift,35,0,13,-8,dark,'キャビンかさ上げ台');
  box(root,48,6,74,0,7,0,dark,'走行フレーム');
  const turn=new THREE.Mesh(new THREE.CylinderGeometry(23,23,4,40),steel);turn.position.y=10;root.add(turn);
  const wheels=[],trackPads=[];
  const trackRadius=7.8,curveLength=Math.PI*trackRadius,trackLength=120+2*curveLength;
  for(const x of[-28,28]){
    box(root,10,16,60,x,8,0,rubber,'クローラー');
    for(const z of[-30,30])cylinder(root,8,10,x,8,z,rubber);
    for(let z=-28;z<=28;z+=14)wheels.push(cylinder(root,5,10.3,x,8,z,steel));
    for(let z=-30;z<=30;z+=5)trackPads.push({x,y:16,z,path:z+30},{x,y:.6,z,path:90+curveLength-z});
    for(const z of[-30,30])for(let i=-2;i<=2;i++){
      const a=i*Math.PI/6+(z>0?0:Math.PI);
      const path=z>0?60+(Math.PI/2-a)*trackRadius:120+curveLength+(3*Math.PI/2-a)*trackRadius;
      trackPads.push({x,y:8+trackRadius*Math.sin(a),z:z+trackRadius*Math.cos(a),rx:-a+Math.PI/2,path});
    }
  }
  const tread=repeatVehiclePart(root,new THREE.BoxGeometry(10.5,1.2,3.4),dark,'履板',trackPads);
  const treadPose=new THREE.Object3D();
  let lastPivotTravel=0;
  function turnTreads(travel){
    if(travel===lastPivotTravel)return;
    lastPivotTravel=travel;
    for(const [i,pad] of trackPads.entries()){
      // With +Z forward, +X is vehicle left. The left track backs up
      // while the right track advances when the heading turns left.
      const path=THREE.MathUtils.euclideanModulo(pad.path-Math.sign(pad.x)*travel,trackLength);
      let y,z,rx=0;
      if(path<60){y=16;z=path-30;}
      else if(path<60+curveLength){
        const angle=Math.PI/2-(path-60)/trackRadius;
        y=8.3+7.7*Math.sin(angle);z=30+trackRadius*Math.cos(angle);rx=Math.PI/2-angle;
      }else if(path<120+curveLength){y=.6;z=90+curveLength-path;}
      else{
        const angle=3*Math.PI/2-(path-120-curveLength)/trackRadius;
        y=8.3+7.7*Math.sin(angle);z=-30+trackRadius*Math.cos(angle);rx=Math.PI/2-angle;
      }
      treadPose.position.set(pad.x,travel?y:pad.y,travel?z:pad.z);
      treadPose.rotation.set(travel?rx:pad.rx??0,0,0);
      treadPose.updateMatrix();
      tread.setMatrixAt(i,treadPose.matrix);
    }
    tread.instanceMatrix.needsUpdate=true;
  }
  root.add(upper);box(upper,8,12,16,35,18,12,yellow,'ブーム取付台');
  const boom=link(upper,yellow,5),stick=link(upper,yellow,4),hydraulics=[link(upper,dark,2.8),link(upper,steel,1.5),link(upper,dark,2.4),link(upper,steel,1.3)];
  const joints=[cylinder(upper,3,9,0,0,0,steel),cylinder(upper,3,8,0,0,0,steel),cylinder(upper,2.5,8,0,0,0,steel)];
  const bucket=new THREE.Group();bucket.name='掘削バケット';upper.add(bucket);
  const legacyBucket=new THREE.Group();bucket.add(legacyBucket);
  box(legacyBucket,18,1.5,15,0,-8,5,dark,'バケット底');box(legacyBucket,18,12,1.5,0,-2,-2,yellow,'バケット背板');
  for(const x of[-8.5,8.5])box(legacyBucket,1.5,10,15,x,-3,5,yellow,'バケット側板');
  for(const x of[-6,-2,2,6])box(legacyBucket,2,1.8,5,x,-8,13,steel,'掘削歯');
  const legacySoil=box(legacyBucket,14,6,10,0,-3,4,mat(0x956c3b),'積載土');legacySoil.visible=false;
  const backhoe=createBackhoeBucket();bucket.add(backhoe.group);backhoe.group.visible=false;
  const bucketHydraulics=[link(upper,dark,2.4),link(upper,steel,1.3)];bucketHydraulics.forEach(o=>o.visible=false);
  root.userData={upper,steps,stepsPivot,wheels,turnTreads,boom,stick,hydraulics,joints,bucket,soil:legacySoil,legacySoil,legacyBucket,backhoe,bucketHydraulics,pilotSocket:upper.userData.pilotSocket,measurement:upper.userData.measurement};return root;
}
export function updateExcavatorModel(root,s,{pivotTravel=0}={}){
  const d=root.userData,a=s.arm,p=armPose(s),v=s.loader.vehicle;root.position.set(v.x,0,v.z);root.rotation.set(0,v.heading,0);if(s.groundPose){root.position.fromArray(s.groundPose.position);root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(...s.groundPose.axes.map(a=>new THREE.Vector3(...a))));}d.upper.rotation.y=a.slew;
  align(d.boom,p.local[0],p.local[1]);align(d.stick,p.local[1],p.local[2]);
  const interpolate=(a,b,t)=>({x:a.x,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
  const c0={...EX.shoulder,x:39,y:17,z:2},c1={...interpolate(p.local[0],p.local[1],.6),x:39},c2={...interpolate(p.local[0],p.local[1],.75),x:39},c3={...interpolate(p.local[1],p.local[2],.55),x:39};
  for(const [i,[a,b]]of [[c0,c1],[c2,c3]].entries()){const mid=interpolate(a,b,.6);align(d.hydraulics[i*2],a,mid);align(d.hydraulics[i*2+1],mid,b);}
  const inward=isBackhoe(s);d.legacyBucket.visible=!inward;d.backhoe.group.visible=inward;d.soil=inward?d.backhoe.soil:d.legacySoil;
  d.joints.forEach((o,i)=>o.position.copy(vec(p.local[i])));d.bucket.position.copy(vec(p.local[2]));d.bucket.rotation.x=bucketRotation(s);if(inward)updateBucketSoil(d.soil,s.load);else{d.soil.visible=s.load>0;d.soil.scale.y=Math.max(.2,s.load/EX.capacity);}
  const lever=bucketPoint(s,{x:0,y:4,z:-4}),end={x:p.local[2].x+lever.x,y:p.local[2].y+lever.y,z:p.local[2].z+lever.z},start=interpolate(p.local[1],p.local[2],.63),mid=interpolate(start,end,.6);
  d.bucketHydraulics.forEach(o=>o.visible=inward);align(d.bucketHydraulics[0],start,mid);align(d.bucketHydraulics[1],mid,end);
  d.stepsPivot.rotation.y=a.slew;d.steps.forEach(g=>{
    g.visible=!!s.loader.transition;const side=g.userData.side,outer=accessOuter(a.slew,side);let i=0;
    for(const o of g.children){
      if(o.name==='ショベル乗降踏板')o.position.x=side*(outer+6-i++*4);
      if(o.name==='踏板滑り止め')o.position.x=side*(outer+6-(i-1)*4);
      if(o.name==='乗降支柱')o.position.x=side*(outer+9);
      if(o.name==='乗降渡り板'){const end=outer+2;o.position.x=side*(end+27.5)/2;o.scale.x=end-27.5;}
    }
  });
  d.wheels.forEach(o=>o.rotation.x=(v.wheelTravel-Math.sign(o.position.x)*pivotTravel)/8);
  d.turnTreads(pivotTravel);
  // Keep the two-seat cabin roof opaque while the upper body turns.
}
