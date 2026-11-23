import * as THREE from './three.module.min.js';
import {createGroundMark,createIndustrialMaterial,createParkingPaintMap} from './imasora-construction-ground-mark.js?v=121cv';
import {sharedParkingLayouts} from './imasora-construction-shared-field.mjs?v=121cw';

export function createParkingReturn({panel,dock,vehicle,clear,available,returnVehicle,notice}){
 const button=document.createElement('button');
 button.type='button';
 button.textContent='駐車場に戻す';
 button.dataset.parkingReturn='';
 button.hidden=true;
 dock.append(button);
 const dialog=document.createElement('dialog');
 dialog.className='transport-sheet';
 dialog.dataset.parkingConfirm='';
 dialog.setAttribute('aria-label','駐車場に戻す確認');
 dialog.style.cssText='color:#ecf8f8;background:#17313d;border:1px solid #8ab2ba;border-radius:18px;padding:22px;max-width:min(360px,calc(100% - 32px));pointer-events:auto';
 dialog.innerHTML='<h2>駐車場に戻す？</h2><p></p><form method="dialog"><button value="no" autofocus>いいえ</button> <button value="yes" class="primary">はい</button></form>';
 panel.append(dialog);
 let pending=false,selected=null;
 const sync=()=>{
  button.hidden=!vehicle();
  button.disabled=pending;
 };
 button.onclick=()=>{
  if(pending||dialog.open)return;
  const v=vehicle(),problem=available();
  if(!v)return;
  if(problem){notice(problem,'warning');return;}
  selected=v;
  clear();
  dialog.returnValue='no';
  dialog.querySelector('p').textContent=v.name+'を所定の駐車枠に戻します。相棒は乗ったまま移動します。';
  dialog.showModal();
 };
 dialog.addEventListener('close',async()=>{
  clear();
  if(dialog.returnValue!=='yes'||!selected)return;
  const v=vehicle();
  if(v?.id!==selected.id)return;
  const problem=available();
  if(problem){notice(problem,'warning');return;}
  pending=true;
  sync();
  try{if(await returnVehicle(v.id)!==false)notice(v.name+'を駐車枠に戻しました。');}
  catch(error){notice(error.message,'warning');}
  finally{pending=false;sync();}
 });
 return {sync,get open(){return dialog.open;}};
}

export function drawSharedParking(group,record){
 const layout=sharedParkingLayouts().find(p=>p.corner===record?.corner);
 if(!layout)return;
 const paved=new THREE.Group();
 paved.name='重機駐車場・舗装';
 group.add(paved);
 const asphalt=createIndustrialMaterial(0x626b6b,'concrete');
 asphalt.polygonOffset=true;
 asphalt.polygonOffsetFactor=-4;
 asphalt.polygonOffsetUnits=-6;
 for(const surface of layout.pavement){
  const {minX,maxX,minZ,maxZ}=surface;
  const geometry=new THREE.PlaneGeometry(maxX-minX,maxZ-minZ);
  const uv=geometry.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,(minX+uv.getX(i)*(maxX-minX))/128,(minZ+uv.getY(i)*(maxZ-minZ))/128);
  const mesh=new THREE.Mesh(geometry,asphalt);
  mesh.name=surface.id==='exit'?'作業場への舗装路':'駐車場の全面舗装';
  mesh.rotation.x=-Math.PI/2;
  mesh.position.set((minX+maxX)/2,.08,(minZ+maxZ)/2);
  mesh.receiveShadow=true;
  mesh.userData.nonCollidable=true;
  paved.add(mesh);
 }
 const boardingPaint=new THREE.Group();
 boardingPaint.name='construction-parking-boarding-paint';
 paved.add(boardingPaint);
 const map=createParkingPaintMap();
 const mark=(name,x,z,width,depth,color=0xf5eee0,parent=paved)=>{
  const mesh=createGroundMark(parent,{name,x,z,width,depth,color,map,y:.11});
  mesh.material.polygonOffsetFactor=-6;
  mesh.material.polygonOffsetUnits=-8;
  return mesh;
 };
 // Paint is flat and non-interactive. Batch nearby marks without changing
 // their outlines, colours, positions or boarding-only visibility.
 const paintBatches=new Map();
 const line=(name,x,z,width,depth,color=0xf5eee0,parent=paved)=>{
  const key=[parent.id,Math.floor(x/480),Math.floor(z/480)].join('/');
  if(!paintBatches.has(key))paintBatches.set(key,{parent,marks:[]});
  paintBatches.get(key).marks.push({name,x,z,width,depth,color});
 };
 const {sx,sz}=layout.orientation;
 // Draw a single contiguous apron with open bays. Color matches each working
 // port and its own stop marks. The approach stays flush and unobstructed.
 const xMin=-1644,xMax=-1432,zMin=-1550,zMax=-1010,center=(zMin+zMax)/2;
 const surface=mark('共同補給ヤード',(xMin+xMax)/2*sx,center*sz,xMax-xMin,zMax-zMin,0x566967);
 surface.material.map=null;
 for(const x of [xMin,xMax])mark('補給ヤードの縁',x*sx,center*sz,3,zMax-zMin,0xb8c4bc);
 for(const z of [zMin,zMax])mark('補給ヤードの縁',(xMin+xMax)/2*sx,z*sz,xMax-xMin,3,0xb8c4bc);
 const bays=[
  {z:-1472,from:-1542,to:-1410,color:0x84cadf,name:'給水区画'},
  {z:-1301,from:-1403,to:-1199,color:0xa6c48b,name:'資材区画'},
  {z:-1116,from:-1191,to:-1018,color:0xf0c77c,name:'採土の荷下ろし区画'},
 ];
 for(const {z,from,to,color,name} of bays){
  const length=to-from,bay=mark(name,-1537*sx,z*sz,184,length-12,color);
  bay.material.map=null;
  bay.material.opacity=.17;bay.material.transparent=true;bay.material.depthWrite=false;
  for(const side of [from,to]){
   mark(name+'の車止め目印',-1635*sx,side*sz,17,3.5,color);
   mark(name+'の車止め目印',-1441*sx,side*sz,17,3.5,color);
  }
 }
 for(const v of layout.vehicles){
  const face=Math.sign(Math.cos(v.heading));
  for(const dx of [-76,76])line('駐車枠',v.x+dx,v.z,2.2,164);
  line('駐車枠の停止線',v.x,v.z-face*82,154,2.2);
  for(let i=0;i<4;i++)line('乗降場所の表示',v.x+sx*69,v.z+(i-1.5)*14,12,3.5,0xefc566,boardingPaint);
 }
 for(const lane of layout.lanes){
 const w=lane.maxX-lane.minX,d=lane.maxZ-lane.minZ;
  const x=(lane.minX+lane.maxX)/2,z=(lane.minZ+lane.maxZ)/2;
  if(lane.id==='aisle'){
   for(let a=lane.minX+30;a<lane.maxX-20;a+=50)line('中央車道の破線',a,z,26,2.5,0xefc566);
  }else{
   for(let a=lane.minZ+30;a<lane.maxZ-20;a+=50)line('出入口へ続く車道の破線',x,a,2.5,26,0xefc566);
   for(const side of [-1,1])line('車道の端',x+side*w/2,z,2.6,d,0xe9e5d6);
  }
 }
 const paintGeometry=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);
 const paintMaterial=new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-6,polygonOffsetUnits:-8});
 const paintTransform=new THREE.Matrix4(),paintColor=new THREE.Color();
 for(const {parent,marks} of paintBatches.values()){
  const mesh=new THREE.InstancedMesh(paintGeometry,paintMaterial,marks.length);
  mesh.name=marks.every(mark=>mark.name===marks[0].name)?marks[0].name:'駐車場の路面表示';mesh.renderOrder=20;
  mesh.userData.groundMark=mesh.userData.nonCollidable=true;
  for(const [i,{x,z,width,depth,color}] of marks.entries()){
   mesh.setMatrixAt(i,paintTransform.makeScale(width,1,depth).setPosition(x,.11,z));
   mesh.setColorAt(i,paintColor.setHex(color));
  }
  mesh.computeBoundingSphere();parent.add(mesh);
 }
 return layout;
}


export function createConstructionBoardingMarkers(scene, vehicles, readDoors) {
  const group = new THREE.Group();
  group.name = 'construction-boarding-spots';
  group.visible = false;
  scene.add(group);

  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 78;
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff5da';
  context.font = 'bold 30px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.strokeStyle = '#152a35';
  context.lineWidth = 5;
  context.strokeText('乗り場', 96, 33);
  context.fillText('乗り場', 96, 33);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({map: texture, transparent: true, depthWrite: false, toneMapped: false});
  const spots = new THREE.InstancedMesh(
    new THREE.RingGeometry(9, 12, 24).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({color: 0xffd376, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, toneMapped: false}),
    vehicles.length * 2
  );
  spots.frustumCulled = false;
  group.add(spots);
  const signs = Array.from({length: vehicles.length * 2}, () => {
    const sign = new THREE.Sprite(material);
    sign.scale.set(47, 19, 1);
    sign.center.set(.5, -.03);
    group.add(sign);
    return sign;
  });
  const transform = new THREE.Matrix4();
  let nextUpdate = 0;
  let active = false;
  return {
    update(map, actor, now, aboard = false) {
      group.visible = map === 'construction' && !aboard;
      if (!group.visible) {
        active = false;
        return;
      }
      if (active && now < nextUpdate) return;
      active = true;
      nextUpdate = now + 140;
      const positions = vehicles.flatMap(({id}) => readDoors(id).slice(0, 2));
      spots.count = positions.length;
      for (const [index, position] of positions.entries()) {
        const {x, y, z} = position;
        transform.makeTranslation(x, y + .19, z);
        spots.setMatrixAt(index, transform);
        signs[index].position.set(x, y + 10, z);
        signs[index].visible = Math.hypot(actor.x - x, actor.z - z) < 190;
      }
      for (let index = positions.length; index < signs.length; index++) signs[index].visible = false;
      spots.instanceMatrix.needsUpdate = true;
      group.userData.boardingSpots = positions.length;
    }
  };
}

export function createConstructionCutMarkers(scene,heightAt) {
  const guides=new THREE.Group();
  guides.name='rain-works-cut-zones';
  scene.add(guides);
  const material=new THREE.MeshBasicMaterial({color:0xf4c56e,transparent:true,opacity:.68,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
  let prior=null;
  return {
    update(zones) {
      if(prior===zones||!zones.length&&prior?.length===0)return;
      prior=zones;
      for(const mesh of [...guides.children]){mesh.removeFromParent();mesh.geometry.dispose();}
      for(const {minX,maxX,minZ,maxZ} of zones){
        const vertices=[];
        for(const [ax,az,bx,bz] of [[minX,minZ,maxX,minZ],[maxX,minZ,maxX,maxZ],[maxX,maxZ,minX,maxZ],[minX,maxZ,minX,minZ]]){
          const length=Math.hypot(bx-ax,bz-az),nx=(bz-az)/length*1.5,nz=(ax-bx)/length*1.5;
          const point=(d,side)=>{const x=ax+(bx-ax)*d/length+nx*side,z=az+(bz-az)*d/length+nz*side;return [x,(heightAt(x,z)??0)+.5,z];};
          for(let d=0;d<length;d+=16){
            const end=Math.min(d+16,length),a=point(d,1),b=point(d,-1),c=point(end,1),e=point(end,-1);
            vertices.push(...a,...b,...c,...c,...b,...e);
          }
        }
        const geometry=new THREE.BufferGeometry();
        geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
        guides.add(new THREE.Mesh(geometry,material));
      }
      guides.visible=zones.length>0;
    }
  };
}

export function createDumpArrivalMarkers(scene,heightAt){
  const group=new THREE.Group(),bayMark=new THREE.Group();
  group.name='rain-works-dump-arrival';
  group.visible=false;
  group.add(bayMark);
  scene.add(group);
  const chevron=new THREE.Shape();
  // One open chevron per bend sample leaves the road visible between its wings.
  chevron.moveTo(-12,-6);chevron.lineTo(-11,-12);chevron.lineTo(0,-3);
  chevron.lineTo(11,-12);chevron.lineTo(12,-6);chevron.lineTo(0,9);chevron.closePath();
  const arrowGeometry=new THREE.ShapeGeometry(chevron).rotateX(Math.PI/2);
  const arrowPaint=new THREE.MeshBasicMaterial({color:0x90f7f3,side:THREE.DoubleSide,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-3});
  const edgePaint=new THREE.MeshBasicMaterial({color:0x153f46,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
  const arrows=Array.from({length:3},()=>{
    const mesh=new THREE.Mesh(arrowGeometry,arrowPaint),edge=new THREE.Mesh(arrowGeometry,edgePaint);
    edge.scale.set(1.13,1,1.14);edge.position.y=-.55;
    mesh.add(edge);mesh.renderOrder=1;group.add(mesh);return mesh;
  });
  const linePaint=new THREE.MeshBasicMaterial({color:0xffce62,transparent:true,opacity:.95,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2});
  const lines=Array.from({length:5},()=>{
    const line=new THREE.Mesh(new THREE.BoxGeometry(1,.08,1),linePaint);bayMark.add(line);return line;
  });
  let lastBay=null;
  function update({bay,arrowsAt=[],parked}={}){
    group.visible=!!bay;
    if(!bay)return;
    if(lastBay!==bay){
      lastBay=bay;
      bayMark.position.set(bay.x,(heightAt(bay.x,bay.z)??0)+.23,bay.z);
      const half=bay.depth/2,dx=Math.sin(bay.heading)*half,dz=Math.cos(bay.heading)*half;
      const back=heightAt(bay.x-dx,bay.z-dz)??0,front=heightAt(bay.x+dx,bay.z+dz)??0;
      bayMark.rotation.set(Math.atan2(back-front,bay.depth),bay.heading,0,'YXZ');
      const w=bay.width,d=bay.depth;
      for(const [i,side] of [-1,1].entries()){
        lines[i].position.set(side*w/2,0,0);lines[i].scale.set(4,1,d);
        lines[i+2].position.set(side*(w-30)/2,0,-d/2);lines[i+2].scale.set(30,1,4);
      }
      lines[4].position.set(0,0,d/2);lines[4].scale.set(w,1,4);
    }
    linePaint.color.set(parked?0x73ffbf:0xffce62);
    arrows.forEach((arrow,i)=>{
      const point=arrowsAt[i];
      arrow.visible=!!point;
      if(!point)return;
      arrow.position.set(point.x,(heightAt(point.x,point.z)??0)+28,point.z);
      arrow.rotation.set(-.38,point.heading,0,'YXZ');
    });
  }
  return {update,dispose(){group.removeFromParent();arrowGeometry.dispose();arrowPaint.dispose();edgePaint.dispose();linePaint.dispose();for(const line of lines)line.geometry.dispose();}};
}
