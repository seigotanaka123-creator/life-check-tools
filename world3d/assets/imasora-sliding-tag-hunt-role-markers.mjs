import*as T from'./three.module.min.js';
import{HUNT_CHARACTER_HEIGHT}from'./imasora-sliding-tag-hunt-world.mjs';
import{huntCanObserve,huntHasClearSight}from'./imasora-sliding-tag-hunt-sight.mjs';
import{huntActorConcealed}from'./imasora-sliding-tag-hunt-visibility.mjs';
import{createHuntDiscoveryTracker}from'./imasora-sliding-tag-hunt-discovery.mjs';
// Use the actual rendered camera ray, with only the controlled actor's lenses.
// huntCanObserve adds three units to its endpoints; offset the view proxies
// so this shares the physical foam volume without shifting that visual ray.
export function huntMarkerSight(s,camera,actor){
 const viewer=s.config.mode==='hunt'?s.hunters[0]:s.player,p=camera.position;
 return huntCanObserve(s,{owner:viewer.owner,effects:viewer.effects,x:p.x,y:p.y-3,z:p.z},{...actor,y:actor.y+HUNT_CHARACTER_HEIGHT*.55-3},Infinity);
}
export function createHuntRoleMarkers({scene,document:doc=globalThis.document,onDiscover=()=>{}}){
 const labels=['逃走者','鬼'],colors=[0x64e4df,0xff8478],materials=labels.map(label=>{
  const canvas=doc.createElement('canvas');canvas.width=192;canvas.height=64;const c=canvas.getContext('2d');c.clearRect(0,0,192,64);c.font='bold 40px system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.strokeStyle='#173243';c.lineWidth=6;c.strokeText(label,96,33);c.fillStyle='#fff';c.fillText(label,96,33);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;const m=new T.SpriteMaterial({map,transparent:true,depthTest:true,depthWrite:false,toneMapped:false,fog:true});m.userData.label=label;return m;
 });
 const canvas=doc.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');c.clearRect(0,0,256,256);c.strokeStyle='#fff';c.lineWidth=4;for(let j=0;j<4;j++){const angle=j*Math.PI/2;c.beginPath();c.arc(128,128,108,angle+.14,angle+1.35);c.stroke();c.beginPath();c.moveTo(128+Math.cos(angle)*99,128+Math.sin(angle)*99);c.lineTo(128+Math.cos(angle)*122,128+Math.sin(angle)*122);c.stroke();}
 const ringMap=new T.CanvasTexture(canvas);ringMap.colorSpace=T.SRGBColorSpace;
 const sprites=[],rings=[],tracker=createHuntDiscoveryTracker(),sight=new Map(),projected=new T.Vector3();let visible=0,cloneCount=0,pulses=0,discoveries=0;
 function sprite(i){if(!sprites[i]){const a=new T.Sprite(materials[0]);a.name='hunt-role-marker-'+i;a.scale.set(2.8,.952,1);scene.add(a);sprites[i]=a;const ring=new T.Sprite(new T.SpriteMaterial({map:ringMap,transparent:true,depthTest:true,depthWrite:false,toneMapped:false,fog:true,opacity:0}));ring.name='hunt-discovery-'+i;ring.visible=false;scene.add(ring);rings[i]=ring;}return sprites[i];}
 for(let i=0;i<4;i++)sprite(i);
 // Ordinary camera/actor movement uses the short sight cache, but the
 // curtain's silhouette and the opposing marker must change together.
 const curtainBounds=[];
 function refreshCurtainSight(gadgets){
  let i=0,changed=false;
  for(const g of gadgets){
   if(g.kind!=='curtain')continue;
   if(curtainBounds[i]!==g.x||curtainBounds[i+1]!==g.y||
      curtainBounds[i+2]!==g.z||curtainBounds[i+3]!==g.radius){
    changed=true;
    curtainBounds[i]=g.x;
    curtainBounds[i+1]=g.y;
    curtainBounds[i+2]=g.z;
    curtainBounds[i+3]=g.radius;
   }
   i+=4;
  }
  if(changed||i!==curtainBounds.length){
   curtainBounds.length=i;
   sight.clear();
   return true;
  }
  return false;
 }
 function place(i,a,role,s,options){const m=sprite(i),show=!huntActorConcealed(s,a),ring=rings[i];m.material=materials[role];m.userData.role=labels[role];m.userData.owner=a.owner;m.visible=show;m.position.set(a.x,a.y+HUNT_CHARACTER_HEIGHT+.6,a.z);const model=options.models?.[i];if(model){m.position.set(0,HUNT_CHARACTER_HEIGHT,0).applyMatrix4(model.root.matrixWorld);m.position.y+=.7;}ring.visible=false;
  const enemy=s.config.mode==='hunt'?role===0:role===1,camera=options.camera;let seen=false;
  if(camera&&enemy){projected.set(a.x,a.y+HUNT_CHARACTER_HEIGHT*.55,a.z).project(camera);const view=camera.position,inView=show&&projected.z>=-1&&projected.z<=1&&Math.abs(projected.x)<.96&&Math.abs(projected.y)<.96&&Math.hypot(a.x-view.x,a.z-view.z)<135;
   if(inView){const now=options.now??s.time,viewer=s.config.mode==='hunt'?s.hunters[0]:s.player,lenses=huntHasClearSight(s,viewer);let cached=sight.get(a.owner);if(!cached||now<cached.at||s.time<cached.roundAt||now-cached.at>=.1||lenses!==cached.lenses){cached={at:now,roundAt:s.time,lenses,seen:huntMarkerSight(s,camera,a)};sight.set(a.owner,cached);}seen=cached.seen;}else sight.delete(a.owner);
   m.visible=seen;
  }if(m.visible)visible++;if(!options.active||!camera||!enemy)return;
  const p=tracker.sample(a.owner,seen,s.time);if(p.discovered){discoveries++;onDiscover();}if(p.opacity<=0)return;ring.material.opacity=p.opacity;ring.material.color.setHex(colors[role]);ring.material.rotation=p.age*.35;ring.position.set(a.x,a.y+HUNT_CHARACTER_HEIGHT*.62,a.z);ring.scale.set(Math.max(6.8,(a.radius??2.7)*2.2),6.5,1);ring.visible=true;pulses++;
 }
 return{withoutLabels(draw){const labels=[...sprites,...rings],visible=labels.map(label=>label.visible);for(const label of labels)label.visible=false;try{return draw();}finally{labels.forEach((label,i)=>{label.visible=visible[i];});}},reset(){tracker.reset();sight.clear();discoveries=0;for(const r of rings)r.visible=false;},update(s,options={}){const curtainChanged=refreshCurtainSight(s.gadgets);visible=0;cloneCount=0;pulses=0;place(0,s.player,0,s,options);for(let i=0;i<s.hunters.length;i++)place(i+1,s.hunters[i],1,s,options);for(const g of s.gadgets)if(g.kind==='clone'&&g.owner==='player'&&g.until>s.time&&cloneCount<2){place(4+cloneCount,{...g,owner:'echo:'+g.id},0,s,options);cloneCount++;}for(let i=4+cloneCount;i<sprites.length;i++)sprites[i].visible=rings[i].visible=false;return curtainChanged;},stats(){return{visible,clones:cloneCount,allocated:sprites.length,textures:3,pulses,discoveries,labels:sprites.filter(s=>s.visible).map(s=>s.userData.role)};},dispose(){for(const s of sprites)scene.remove(s);for(const r of rings){scene.remove(r);r.material.dispose();}for(const m of materials){m.map.dispose();m.dispose();}ringMap.dispose();}};
}
