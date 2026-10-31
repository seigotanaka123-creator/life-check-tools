import * as T from './three.module.min.js';
import {eveningLight} from './imasora-evening-light.mjs?v=120mx';

// Finish the real, supported metal pieces. No extra walkable faces, invisible
// collision boxes, lights, draw calls or materials charged to the save.
let clockAt=-Infinity,clockStrength=0;
function nightNow(){const now=Date.now();if(Math.abs(now-clockAt)>=10000){clockAt=now;clockStrength=eveningLight(new Date(now)).strength;}return clockStrength;}
export function updateIndustrialMaterial(material,date){
 const night=material.userData.industrialNight;if(night)night.value=date?eveningLight(date).strength:nightNow();
}
export function createIndustrialMaterial(kind='steel',{color=kind==='deck'?0xa4b9c2:0x79a1af,glow=0x16e9c8,localY=[-.5,.5]}={}){
 const material=new T.MeshStandardMaterial({color,metalness:kind==='deck'?.42:.58,roughness:kind==='deck'?.62:.43});
 const night={value:nightNow()},glowColor={value:new T.Color(glow)};material.name='industrial-work-'+kind;
 material.userData.industrialNight=night;
 material.onBeforeRender=()=>updateIndustrialMaterial(material);
 material.customProgramCacheKey=()=> 'industrial-work-120pn-'+kind;
 material.onBeforeCompile=shader=>{
  shader.uniforms.industrialNight=night;shader.uniforms.industrialGlow=glowColor;shader.uniforms.industrialY={value:new T.Vector2(localY[0],Math.max(.0001,localY[1]-localY[0]))};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform vec2 industrialY;varying vec3 factoryUnit;varying vec3 factoryPos;varying vec3 factoryNormal;');
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   factoryUnit=position;factoryUnit.y=(position.y-industrialY.x)/industrialY.y-.5;factoryNormal=normal;
   #ifdef USE_INSTANCING
    factoryPos=(instanceMatrix*vec4(position,1.)).xyz;
   #else
    factoryPos=(modelMatrix*vec4(position,1.)).xyz;
   #endif`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 factoryUnit;varying vec3 factoryPos;varying vec3 factoryNormal;
   uniform float industrialNight;uniform vec3 industrialGlow;
   float factoryBand(float x,float width){float aa=max(fwidth(x),.018);return 1.-smoothstep(width-aa,width+aa,abs(x));}`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 n=abs(factoryNormal);vec2 face=n.y>.5?factoryPos.xz:n.x>.5?factoryPos.zy:factoryPos.xy;
   vec2 tile=mod(face,vec2(16.,8.));
   float seam=max(factoryBand(min(tile.x,16.-tile.x),.13),factoryBand(min(tile.y,8.-tile.y),.11));
   float rivet=factoryBand(length(tile-vec2(1.25)),.34);
   float fade=1.-smoothstep(.65,2.,max(length(dFdx(face)),length(dFdy(face))));
   float tread=factoryBand(mod(face.x+face.y,3.)-1.5,.24)*factoryBand(mod(face.x-face.y,5.)-2.5,.8);
   diffuseColor.rgb*=1.-fade*(seam*.32+rivet*.38${kind==='deck'?'+tread*.12':''});
   diffuseColor.rgb+=vec3(.12)*rivet*fade;
   // Inset marker strips occupy the side of the existing deck, never its top.
   float factoryLED=${kind==='tank'?'(1.-step(.5,n.y))*max(factoryBand(factoryUnit.y-.34,.018),factoryBand(factoryUnit.y+.34,.018))':kind==='deck'?'(1.-step(.5,n.y))*factoryBand(factoryUnit.y+.08,.13)*(1.-factoryBand(mod(face.x,24.)-12.,3.))':kind==='lamp'?'1.':kind==='frame'?'(1.-step(.5,n.y))*max(factoryBand(factoryUnit.y-.32,.055),factoryBand(factoryUnit.y+.32,.055))':'0.'};
   ${kind==='lamp'?'diffuseColor.rgb=vec3(.68,.62,.46);':'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.20,.49,.48),factoryLED*.45);'}
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   ${kind==='lamp'?`float towerOn=vColor.r+vColor.g*industrialNight;totalEmissiveRadiance+=industrialGlow*towerOn*3.4;`:'totalEmissiveRadiance+=industrialNight*industrialGlow*(factoryLED*3.3+.055);'}
  `);
 };
 return material;
}

