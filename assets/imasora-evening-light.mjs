import * as T from './three.module.min.js';
import {coastLighting} from './imasora-coast-layout.mjs?v=120mx';

// Presentation only: saved colours, lamp switches and the local game clock stay intact.
export const WARM_LIGHT=Object.freeze({core:0xffefd2,halo:0xffb85c,reflection:0xffc178,whiteCore:0xf2faff,whiteHalo:0xbce6ff});
export function eveningLight(date=new Date()){
 const l=coastLighting(date),previous={morning:'night',day:'morning',evening:'day',night:'evening'}[l.phase];
 const glow={morning:0,day:0,evening:.78,night:1},dusk={morning:0,day:0,evening:1,night:0};
 return {phase:l.phase,strength:T.MathUtils.lerp(glow[previous],glow[l.phase],l.blend),dusk:T.MathUtils.lerp(dusk[previous],dusk[l.phase],l.blend)};
}

// One camera-facing draw for all lamps; depth-tested so walls still hide the glow.
// No bloom pass, shadows, textures or CPU billboarding per frame.
export function createLightHalos(parent,capacity=32){
 const geometry=new T.PlaneGeometry(1,1),material=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,toneMapped:false,
  uniforms:{strength:{value:0}},vertexShader:`varying vec2 uvHalo;varying vec3 tint;
  void main(){uvHalo=uv;tint=instanceColor;vec4 center=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
  vec2 size=vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));
  center.xy+=position.xy*size;gl_Position=projectionMatrix*center;}`,
  fragmentShader:`uniform float strength;varying vec2 uvHalo;varying vec3 tint;
  void main(){float r=length((uvHalo-.5)*2.);float glow=exp(-r*r*4.5)*(1.-smoothstep(.6,1.,r));
  gl_FragColor=vec4(tint,glow*.38*strength*min(1.,max(tint.r,max(tint.g,tint.b))));
  #include <colorspace_fragment>
  }`});
 const mesh=new T.InstancedMesh(geometry,material,capacity),matrix=new T.Matrix4(),color=new T.Color();mesh.count=0;mesh.frustumCulled=false;mesh.name='soft-lamp-halos';mesh.userData.nonCollidable=true;parent.add(mesh);let disposed=false;
 return {mesh,set(items){if(disposed)return;if(items.length>capacity)throw Error('Lamp glow capacity exceeded');mesh.count=items.length;items.forEach((p,i)=>{matrix.makeScale(p.size??22,p.size??22,1);matrix.setPosition(p.x,p.y,p.z);mesh.setMatrixAt(i,matrix);color.set(p.color??WARM_LIGHT.halo).multiplyScalar(p.on===false?0:1);mesh.setColorAt(i,color);});mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;},strength(n){material.uniforms.strength.value=n;mesh.visible=n>0&&mesh.count>0;},dispose(){if(disposed)return;disposed=true;mesh.removeFromParent();mesh.dispose();geometry.dispose();material.dispose();}};
}

// Bake soft pools onto the real ground/deck once. Height does not move with the clock.
export function createLightPools(parent,items,heightAt){
 const positions=[],uvs=[],indices=[],steps=8;
 for(const p of items){const start=positions.length/3,r=p.radius??27;for(let z=0;z<=steps;z++)for(let x=0;x<=steps;x++){const wx=p.x+(x/steps-.5)*r*2,wz=p.z+(z/steps-.5)*r*2;positions.push(wx,heightAt(wx,wz)+.09,wz);uvs.push(x/steps,z/steps);}for(let z=0;z<steps;z++)for(let x=0;x<steps;x++){const a=start+z*(steps+1)+x;indices.push(a,a+steps+1,a+1,a+1,a+steps+1,a+steps+2);}}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,uniforms:{strength:{value:0},warm:{value:new T.Color(WARM_LIGHT.halo)}},vertexShader:`varying vec2 poolUV;void main(){poolUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform float strength;uniform vec3 warm;varying vec2 poolUV;void main(){float r=length((poolUV-.5)*2.);float glow=exp(-r*r*3.5)*(1.-smoothstep(.65,1.,r));gl_FragColor=vec4(warm,glow*.22*strength);
 #include <colorspace_fragment>
 }`});
 const mesh=new T.Mesh(geometry,material);mesh.name='warm-ground-pools';mesh.userData.nonCollidable=true;parent.add(mesh);let disposed=false;
 return {mesh,strength(n){material.uniforms.strength.value=n;mesh.visible=n>0;},dispose(){if(disposed)return;disposed=true;mesh.removeFromParent();geometry.dispose();material.dispose();}};
}
