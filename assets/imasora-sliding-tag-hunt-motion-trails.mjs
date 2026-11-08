import*as T from'./three.module.min.js';
import{worldSurface}from'./imasora-sliding-tag-hunt-world.mjs';
import{huntActorConcealed}from'./imasora-sliding-tag-hunt-visibility.mjs';
import{huntCanObserve}from'./imasora-sliding-tag-hunt-sight.mjs';
const EMPTY=Object.freeze([]),CAPACITY=128,SMOKE_LIFE=.62,ECHO_LIFE=.24;
// Presentation records only. Positions, inputs, contact and round proofs are
// never modified. Timestamped, immutable puffs also survive replay seeking.
export function createHuntMotionCues({isIce=a=>a.slippery||worldSurface(a.x,a.z)==='ice',reducedMotion=()=>false}={}){
 let cues=EMPTY,lastTime=-Infinity,seed,lastEmit=new Map(),sequence=0;
 function reset(){cues=EMPTY;lastTime=-Infinity;seed=undefined;lastEmit.clear();sequence=0;}
 return{reset,sample(s){
  if(seed!==s.config?.seed||s.time<lastTime){reset();seed=s.config?.seed;}
  if(!Number.isFinite(s.time)||s.time===lastTime)return cues;
  lastTime=s.time;let next=cues.filter(c=>s.time-c.at<c.life),changed=next.length!==cues.length;
  if(s.phase==='playing')for(const a of[s.player,...s.hunters]){
   const speed=Math.hypot(a.vx,a.vz),diving=a.dive?.stage==='slide';
   const eligible=a.grounded&&!a.flight&&!a.hook&&(a.effects?.dizzy??0)<=s.time;
   const kind=eligible&&diving?'dive':eligible&&!a.dive&&speed>5&&isIce(a)?'smoke':null;
   if(!kind){lastEmit.delete(a.owner);continue;}
   const reduced=reducedMotion(),interval=reduced?.12:.04,previous=lastEmit.get(a.owner);
   if(previous&&previous.kind===kind&&s.time-previous.time<interval-1e-8)continue;
   lastEmit.set(a.owner,{time:s.time,kind});
   const yaw=diving?Math.atan2(a.dive.x,a.dive.z):Math.atan2(a.vx,a.vz),dx=Math.sin(yaw),dz=Math.cos(yaw);
   for(const side of(kind==='smoke'?[-1,1]:[0])){
    const spread=side*a.radius*.57;
    next.push(Object.freeze({id:++sequence,owner:a.owner,kind,at:s.time,life:reduced?(kind==='smoke'?.35:.15):kind==='smoke'?SMOKE_LIFE:ECHO_LIFE,x:a.x+Math.cos(a.yaw)*spread-dx*.55,y:a.y,z:a.z-Math.sin(a.yaw)*spread-dz*.55,dx,dz,radius:a.radius,power:reduced?.55:Math.min(1.35,.65+speed/35)}));
   }
   changed=true;
  }
  if(next.length>CAPACITY)next=next.slice(-CAPACITY);
  if(changed)cues=Object.freeze(next);
  return cues;
 },get cues(){return cues;},stats:()=>({cues:cues.length,capacity:CAPACITY})};
}
function smokeTexture(){
 const size=96,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=(x+.5)/size*2-1,v=(y+.5)/size*2-1;
  const edge=1-Math.hypot(u*(1+.10*Math.sin(v*9)),v*(1+.09*Math.cos(u*11)));
  const noise=.84+.16*Math.sin(x*.37+Math.sin(y*.22)*2)*Math.cos(y*.29);
  const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(Math.max(0,edge)**1.3*noise*255);
 }
 const texture=new T.DataTexture(data,size,size);texture.needsUpdate=true;texture.magFilter=texture.minFilter=T.LinearFilter;return texture;
}
const vertexShader='attribute float trailAlpha;varying vec2 vUv;varying float vFade;void main(){vUv=uv;vFade=trailAlpha;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}';
export function createHuntMotionTrails({scene,reducedMotion}={}){
 const media=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)'),history=createHuntMotionCues({reducedMotion:reducedMotion??(()=>!!media?.matches)});
 const texture=smokeTexture(),plane=new T.PlaneGeometry(1,1),sphere=new T.SphereGeometry(1,10,6);
 const smokeMaterial=new T.ShaderMaterial({uniforms:{smokeMap:{value:texture}},vertexShader,fragmentShader:'uniform sampler2D smokeMap;varying vec2 vUv;varying float vFade;void main(){float alpha=texture2D(smokeMap,vUv).a*vFade;if(alpha<.004)discard;gl_FragColor=vec4(mix(vec3(.73,.85,.91),vec3(.97,.99,1.),vUv.y),alpha);}',transparent:true,depthWrite:false,toneMapped:false,side:T.DoubleSide,forceSinglePass:true});
 const echoMaterial=new T.ShaderMaterial({vertexShader,fragmentShader:'varying vec2 vUv;varying float vFade;void main(){float alpha=pow(max(0.,sin(vUv.y*3.14159265)),.5)*vFade;if(alpha<.004)discard;gl_FragColor=vec4(mix(vec3(.34,.77,1.),vec3(.85,.96,1.),vUv.y),alpha);}',transparent:true,depthWrite:false,toneMapped:false});
 const rows=Array.from({length:4},(_,i)=>{
  const smoke=new T.InstancedMesh(plane.clone(),smokeMaterial,40),echo=new T.InstancedMesh(sphere.clone(),echoMaterial,48);
  smoke.name='hunt-drift-smoke-'+i;echo.name='hunt-dive-afterimage-'+i;
  for(const mesh of[smoke,echo]){mesh.frustumCulled=false;mesh.geometry.setAttribute('trailAlpha',new T.InstancedBufferAttribute(new Float32Array(mesh.instanceMatrix.count),1).setUsage(T.DynamicDrawUsage));mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.count=0;mesh.visible=false;scene.add(mesh);}
  return{smoke,echo,smokeCount:0,echoCount:0,owner:null};
 });
 const matrix=new T.Matrix4(),position=new T.Vector3(),scale=new T.Vector3(),rotation=new T.Quaternion(),axis=new T.Vector3(0,1,0);
 function put(mesh,index,x,y,z,sx,sy,sz,q,opacity){position.set(x,y,z);scale.set(sx,sy,sz);matrix.compose(position,q,scale);mesh.setMatrixAt(index,matrix);mesh.geometry.attributes.trailAlpha.setX(index,opacity);}
 function setView(s){const actors=[s.player,...s.hunters],viewer=s.config?.mode==='hunt'?s.hunters[0]:s.player;for(let i=0;i<rows.length;i++){const r=rows[i],a=actors[i],hasCues=r.smokeCount>0||r.echoCount>0,visible=!!a&&hasCues&&!huntActorConcealed(s,a)&&(a.owner===viewer.owner?(a.effects?.cloak??0)<=s.time:huntCanObserve(s,viewer,a,Infinity));r.smoke.visible=visible&&r.smokeCount>0;r.echo.visible=visible&&r.echoCount>0;}}
 function update(s,camera,recorded){
  for(let i=0;i<rows.length;i++){const r=rows[i];r.owner=[s.player,...s.hunters][i]?.owner;r.smokeCount=r.echoCount=0;}
  for(const c of recorded??history.cues){const age=s.time-c.at;if(age<0||age>=c.life)continue;const r=rows.find(r=>r.owner===c.owner);if(!r)continue;const u=age/c.life,fade=(1-u)**1.65;
   if(c.kind==='smoke'&&r.smokeCount<40){const size=(1.15+u*3)*c.power;rotation.copy(camera.quaternion);put(r.smoke,r.smokeCount++,c.x-c.dx*age*1.5,c.y+.3+u*1.5,c.z-c.dz*age*1.5,size,size*.85,1,rotation,.72*fade);}
   else if(c.kind==='dive'&&r.echoCount+4<=48){
    rotation.setFromAxisAngle(axis,Math.atan2(c.dx,c.dz));const x=c.x-c.dx*age*4,z=c.z-c.dz*age*4,width=Math.max(.55,Math.min(1.5,c.radius*.32));
    put(r.echo,r.echoCount++,x,c.y+1.35,z,width,.62,1.9,rotation,.26*fade);
    put(r.echo,r.echoCount++,x+c.dx*2,c.y+1.5,z+c.dz*2,width*.75,.66,.7,rotation,.23*fade);
    for(const side of[-1,1])put(r.echo,r.echoCount++,x+c.dz*side*width*1.3,c.y+.72,z-c.dx*side*width*1.3,.09,.075,2.7+u,rotation,.72*fade);
   }
  }
  for(const r of rows)for(const [mesh,count]of[[r.smoke,r.smokeCount],[r.echo,r.echoCount]]){mesh.count=count;if(count){mesh.instanceMatrix.needsUpdate=true;mesh.geometry.attributes.trailAlpha.needsUpdate=true;}}
  setView(s);
 }
 function reset(){history.reset();for(const r of rows){r.smokeCount=r.echoCount=0;r.smoke.count=r.echo.count=0;r.smoke.visible=r.echo.visible=false;}}
 return{sample:history.sample,update,setView,reset,get cues(){return history.cues;},attachedNodes:index=>[rows[index].smoke,rows[index].echo],stats:()=>({recorded:history.cues.length,capacity:CAPACITY,smoke:rows.reduce((n,r)=>n+(r.smoke.visible?r.smokeCount:0),0),afterimages:rows.reduce((n,r)=>n+(r.echo.visible?r.echoCount:0),0),maxMeshes:8}),dispose(){for(const r of rows)for(const m of[r.smoke,r.echo]){scene.remove(m);m.dispose();m.geometry.dispose();}plane.dispose();sphere.dispose();smokeMaterial.dispose();echoMaterial.dispose();texture.dispose();history.reset();}};
}
