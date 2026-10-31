import * as T from './three.module.min.js';
import {coastLighting} from './imasora-coast-layout.mjs?v=120mx';
import {createScenicSky} from './imasora-scenic-sky.mjs?v=120kw';
import {eveningLight,createLightHalos,WARM_LIGHT} from './imasora-evening-light.mjs?v=120mx';

const colourKeys=['top','horizon','sun'];
/** Same device-local clock as home/town/coast; no new save fields or fixed game clock. */
export function skyMapLighting(date=new Date()){
 const l=coastLighting(date),mix=k=>T.MathUtils.lerp(l.from[k],l.to[k],l.blend);
 const result={phase:l.phase,night:mix('night'),ambient:mix('ambient'),power:mix('power')};
 for(const k of colourKeys)result[k]=new T.Color(l.from[k]).lerp(new T.Color(l.to[k]),l.blend);
 const a=mix('azimuth'),e=mix('elevation');
 result.direction=new T.Vector3(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e));
 return result;
}

export function createSkyMapAtmosphere({cloudSea=true,lightWorld=false}={}){
 const group=new T.Group();group.name='sky-map-atmosphere';
 const uniforms=Object.fromEntries(colourKeys.map(k=>[k,{value:new T.Color()}]));
 Object.assign(uniforms,{time:{value:0},night:{value:0},sunDir:{value:new T.Vector3()}});
 const backdrop=createScenicSky({uniforms,cloudSea,infinite:lightWorld});group.add(backdrop.sky);
 const stations=[];
 function addStation(station){
  const panes=(station.userData.warmWindows??[]).map(mesh=>{const material=mesh.material.clone(),original=material.emissive.clone(),intensity=material.emissiveIntensity;mesh.material=material;return {material,original,intensity};});
  const halos=createLightHalos(station,2);halos.set([-13,13].map(x=>({x,y:24,z:31.6,size:18})));halos.strength(0);
  stations.push({panes,halos});lastDate=-Infinity;
 }
 let lastDate=-Infinity,phase='',disposed=false;
 function update({scene,camera,sun,hemi,time=performance.now(),date=new Date()}){
  if(disposed)return;
  backdrop.update(camera,time);
  // Clouds move cheaply every frame. Lighting only changes when the actual clock does.
  // Absolute difference also catches clock adjustments and a resumed background tab.
  if(Math.abs(+date-lastDate)<10000)return;
  lastDate=+date;
  const l=skyMapLighting(date),mood=eveningLight(date);phase=l.phase;
  for(const k of colourKeys)uniforms[k].value.copy(l[k]);
  uniforms.night.value=l.night;uniforms.sunDir.value.copy(l.direction);
  uniforms.dusk.value=mood.dusk;
  for(const s of stations){s.halos.strength(mood.strength);for(const p of s.panes){p.material.emissive.copy(p.original).lerp(new T.Color(WARM_LIGHT.halo),mood.strength);p.material.emissiveIntensity=T.MathUtils.lerp(p.intensity,1.7,mood.strength);}}
  // This is scenery behind the original cloud world. Keep the established
  // white cloud floor, station/UFO lighting and distance fog at every hour.
  scene.background?.copy(l.horizon);
  if(lightWorld&&sun&&hemi){
   // Only the construction world adopts time-of-day light. Sky's white cloud
   // floor, UFO, authentication and original lighting deliberately stay intact.
   scene.fog?.color.copy(l.horizon);if(scene.fog){scene.fog.near=2300;scene.fog.far=5800;}hemi.intensity=2.2-l.night*.6-mood.dusk*.25;
   hemi.color.set(0xd9f4ff);hemi.groundColor.set(0x37506b);
   sun.intensity=3.4*(1-l.night*.69-mood.dusk*.24);
   sun.color.set(0xffffff).lerp(new T.Color(0xffc183),mood.dusk*.65).lerp(new T.Color(0xc2dcff),l.night*.55);
   sun.position.copy(l.direction).multiplyScalar(500);sun.position.y=Math.max(70,sun.position.y);
  }
 }
 function dispose(){if(disposed)return;disposed=true;for(const s of stations){s.halos.dispose();s.panes.forEach(p=>p.material.dispose());}backdrop.dispose();group.removeFromParent();}
 return {group,update,dispose,addStation,get phase(){return phase;}};
}
