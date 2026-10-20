import * as T from './three.module.min.js';
import {coastLighting} from './imasora-coast-layout.mjs?v=120go';
import {createScenicSky} from './imasora-scenic-sky.mjs?v=120gp';

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

export function createSkyMapAtmosphere(){
 const group=new T.Group();group.name='sky-map-atmosphere';
 const uniforms=Object.fromEntries(colourKeys.map(k=>[k,{value:new T.Color()}]));
 Object.assign(uniforms,{time:{value:0},night:{value:0},sunDir:{value:new T.Vector3()}});
 const backdrop=createScenicSky({uniforms,cloudSea:true});group.add(backdrop.sky);
 let lastDate=-Infinity,phase='',disposed=false;
 function update({scene,camera,time=performance.now(),date=new Date()}){
  if(disposed)return;
  backdrop.update(camera,time);
  // Clouds move cheaply every frame. Lighting only changes when the actual clock does.
  // Absolute difference also catches clock adjustments and a resumed background tab.
  if(Math.abs(+date-lastDate)<10000)return;
  lastDate=+date;
  const l=skyMapLighting(date);phase=l.phase;
  for(const k of colourKeys)uniforms[k].value.copy(l[k]);
  uniforms.night.value=l.night;uniforms.sunDir.value.copy(l.direction);
  // This is scenery behind the original cloud world. Keep the established
  // white cloud floor, station/UFO lighting and distance fog at every hour.
  scene.background?.copy(l.horizon);
 }
 function dispose(){if(disposed)return;disposed=true;backdrop.dispose();group.removeFromParent();}
 return {group,update,dispose,get phase(){return phase;}};
}
