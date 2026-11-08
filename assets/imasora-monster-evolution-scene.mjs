// Presentation only. No save, reward, camera-recognition or evolution rule is owned here.
export const SKY_EVOLUTION_SECONDS=13.4;
export const SKY_EVOLUTION_NARRATION_START=6.4;
export const SKY_EVOLUTION_NAME_ACTION_SECONDS=.82;
export const SKY_EVOLUTION_EXTRA_HOLD_SECONDS=.5;
export function skyEvolutionNarrationLabels(narration){const clock=Math.max(0,Number(narration?.currentTime)||0),started=Boolean(narration?.started),nameAt=Math.max(0,Number(narration?.nameStartSeconds)||0);return{captionVisible:started,nameVisible:started&&clock>=Math.max(0,nameAt-.2)};}
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const n=clamp(x);return n*n*(3-2*n);};
export function skyEvolutionFrame(seconds,{reducedMotion=false}={}){
 const t=Math.max(0,Number(seconds)||0),u=reducedMotion?t/4.4*SKY_EVOLUTION_SECONDS:t;
 const gather=smooth((u-1.7)/4.4),change=smooth((u-6.0)/1.7),reveal=smooth((u-7.7)/1.5),joy=clamp((u-9.5)/2.15);
 const hop=joy>0&&joy<1?Math.sin(joy*Math.PI):0;
 return Object.freeze({time:u,beforeNameVisible:u<5.8,phase:u<2?'arrival':u<6?'gather':u<7.7?'change':u<9.5?'reveal':u<11.65?'joy':'farewell',
  gather,change,reveal,fromAlpha:1-change,toAlpha:change,veil:reducedMotion?0:Math.sin(change*Math.PI)*.25,
  joy,hop:hop*(reducedMotion?.035:.42),squash:!reducedMotion&&joy>0&&joy<.12?Math.sin(joy/.12*Math.PI)*.08:0,
  fade:smooth((u-12.35)/1.05),done:u>=SKY_EVOLUTION_SECONDS});
}
// The media clock, rather than an animation timeout, owns the name/action cue.
export function skyEvolutionNarratedFrame(seconds,{reducedMotion=false,narration}={}){
 if(!narration)return skyEvolutionFrame(seconds,{reducedMotion});
 const intro=Math.max(0,Number(seconds)||0)*(reducedMotion?SKY_EVOLUTION_SECONDS/4.4:1);
 if(intro<7.7)return Object.freeze({...skyEvolutionFrame(seconds,{reducedMotion}),nameAction:false,narrationTime:0});
 const clock=Math.max(0,Number(narration.currentTime)||0),nameAt=Number(narration.nameStartSeconds),duration=Number(narration.durationSeconds);
 const nameAction=Boolean(narration.started)&&clock>=nameAt,age=nameAction?Math.max(0,clock-nameAt):0,joy=nameAction?clamp(age/SKY_EVOLUTION_NAME_ACTION_SECONDS):0;
 const visual=nameAction?9.5+Math.min(age,3.9):Math.min(intro,9.49),base=skyEvolutionFrame(visual);
 // Lift promptly during the spoken name, then keep the final pose for the original celebration window plus half a second.
 const lift=age<=.18?Math.sin(age/.18*Math.PI/2):1-smooth((age-.18)/.52);
 const settle=Math.max(duration,nameAt+2.15)+.4+SKY_EVOLUTION_EXTRA_HOLD_SECONDS,fade=smooth((clock-settle)/1.05);
 return Object.freeze({...base,phase:!nameAction?'narration':joy<1?'joy':'farewell',joy,nameAction,narrationTime:clock,
  hop:nameAction?lift*(reducedMotion?.035:.42):0,landing:nameAction?clamp((age-.7)/.6):0,
  squash:!reducedMotion&&age>.7&&age<.82?Math.sin((age-.7)/.12*Math.PI)*.06:0,veil:0,fade,done:clock>=settle+1.05});
}

export function createEvolutionNarrationSession(entry,{url,audioFactory=()=>new Audio(),getVolume=()=>1,onStateChange=()=>{},onBlocked=()=>{}}={}){
 if(!entry?.approved||!(entry.nameStartSeconds>0)||!(entry.durationSeconds>entry.nameStartSeconds))throw Error('Narration is not approved');
 const audio=audioFactory();let status='ready',requested=false,started=false,closed=false,resumeHidden=false,clock=0,tail=0,stale=0,notified=false,failed=false;
 const volume=()=>{const value=Math.max(0,Math.min(1,Number(getVolume())||0));audio.volume=value;audio.muted=value===0;};
 const notify=value=>{if(notified===value)return;notified=value;onStateChange(value);};
 const fail=()=>{if(closed)return;failed=true;status='fallback';clock=Math.max(clock,Number(audio.currentTime)||0);audio.pause();notify(false);};
 const events={playing(){if(closed)return;if(resumeHidden){audio.pause();status='hidden';return;}started=true;status='playing';stale=0;notify(true);},pause(){if(closed||resumeHidden||failed||status==='ended'||audio.ended||!started)return;status='paused';notify(false);onBlocked();},waiting(){if(!closed&&started)status='buffering';},stalled(){if(!closed&&started)status='buffering';},ended(){if(closed)return;started=true;status='ended';clock=Math.max(clock,Number(audio.currentTime)||0,entry.durationSeconds);tail=0;notify(false);},error:fail};
 for(const[name,handler]of Object.entries(events))audio.addEventListener(name,handler);
 audio.preload='auto';audio.setAttribute?.('playsinline','');audio.src=url;volume();audio.load?.();
 function start(){
  if(closed)return Promise.resolve(false);requested=true;resumeHidden=false;if(failed){status='fallback';return Promise.resolve(false);}
  status='starting';stale=0;volume();
  let playing;try{playing=audio.play();}catch(error){playing=Promise.reject(error);}
  return Promise.resolve(playing).then(()=>{if(closed||resumeHidden){audio.pause();return false;}if(status==='starting'){started=true;status='playing';notify(true);}return true;}).catch(error=>{if(closed||resumeHidden)return false;if(error?.name==='NotAllowedError'){status='blocked';notify(false);onBlocked();}else fail();return false;});
 }
 return Object.freeze({audio,start,
  tick(delta=0){
   if(closed)return{currentTime:clock,status:'closed',started:false,...entry};volume();const dt=Math.max(0,Math.min(.25,Number(delta)||0));
   if(requested){
    if(status==='ended'){tail+=dt;clock=Math.max(clock,entry.durationSeconds+tail);}
    else if(status==='fallback')clock+=dt;
    else if(!['blocked','paused','hidden'].includes(status)){
     const time=Math.max(clock,Number(audio.currentTime)||0);stale=time>clock+.0001?0:stale+dt;clock=time;
     if(stale>8)fail();
    }
   }
   return{currentTime:clock,status,started:started||status==='fallback',nameStartSeconds:entry.nameStartSeconds,durationSeconds:entry.durationSeconds};
  },
  pauseForVisibility(){if(closed||!requested||['ended','fallback','blocked','paused'].includes(status))return;resumeHidden=true;audio.pause();status='hidden';notify(false);},
  resumeFromVisibility(){if(resumeHidden&&!closed)return start();return Promise.resolve(false);},
  dispose(){if(closed)return;closed=true;for(const[name,handler]of Object.entries(events))audio.removeEventListener(name,handler);audio.pause();audio.removeAttribute?.('src');audio.load?.();notify(false);},
  get status(){return status;}
 });
}
export function describeSkyEvolution(before,next,{names,handColor,footColor,skyId=null}={}){
 const a=before?.monster,b=next?.monster;if(!a||!b||!names)return null;
 const from=Number(a.evolutionStage??0),to=Number(b.evolutionStage??0);
 if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||to<1||to>4)return null;
 const sameBirth=a.bornAt===b.bornAt;
 if(sameBirth?to<=from:to!==1)return null;
 // A newly chosen seed is the origin of its own sprout, including after retirement.
 const origin=(!sameBirth||from===0)?{...b,evolutionStage:0}:a;
 const beforeId=names.currentId(origin),afterId=names.currentId(b),old=names.get(beforeId),now=names.get(afterId);
 if(!old||!now||old.id===now.id)return null;
 return Object.freeze({key:JSON.stringify([b.bornAt,b.seedId,to]),beforeId:old.id,afterId:now.id,
  beforeName:old.name,afterName:now.name,stage:now.stage,handColor,footColor,skyId:typeof skyId==='string'?skyId:null});
}
export function skyEvolutionPalette(skyId){
 const palettes={blue:['#80c8ed','#eaf8ff','#ffe7a5'],cloud:['#a9c7df','#f5f8ff','#dcecff'],sunset:['#efa99a','#fff1d6','#ffd98b'],morning:['#a5d9e5','#fff8db','#ffe4a7'],night:['#344b78','#bfdfed','#f7e7a7'],star:['#344b78','#bfdfed','#f7e7a7'],wind:['#9edcce','#f5fff1','#e2ef9d']};
 const [sky,horizon,light]=palettes[skyId]??['#9bd4e7','#f3fbeb','#ffe7ad'];return{sky,horizon,light};
}
// Rendered in real time from procedural atmosphere and the game's canonical models.
const evolutionNoiseGLSL=`
float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float n=0.,a=.54;for(int i=0;i<4;i++){n+=a*noise3(p);p=mat3(.00,.80,.60,-.80,.36,-.48,-.60,-.48,.64)*p*2.05+4.7;a*=.48;}return n;}
`;

export function createSkyEvolutionScene(THREE,Characters,buildCharacter,descriptor,{glowTexture=null,backdropTexture=null}={}){
 const palette=skyEvolutionPalette(descriptor.skyId),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,160);
 scene.fog=new THREE.FogExp2('#223c54',.014);
 const ownGeometries=new Set(),ownMaterials=new Set(),models=[],textures=new Set(),state={aspect:1,time:0,reduced:false};
 const geometry=g=>(ownGeometries.add(g),g),material=m=>(ownMaterials.add(m),m);
 const atmosphere={uTime:{value:0},uPower:{value:0},uReveal:{value:0},uSky:{value:new THREE.Color(palette.sky)},uHorizon:{value:new THREE.Color(palette.horizon)},uSun:{value:new THREE.Color(palette.light)},uBackdrop:{value:backdropTexture},uHasBackdrop:{value:0},uResolution:{value:new THREE.Vector2(1,1)},uAspect:{value:1},uImageAspect:{value:backdropTexture?.image?backdropTexture.image.width/backdropTexture.image.height:16/9}};
 const sky=new THREE.Mesh(geometry(new THREE.SphereGeometry(100,32,20)),material(new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:atmosphere,
  vertexShader:'varying vec3 vWorld;void main(){vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}',
  fragmentShader:`varying vec3 vWorld;uniform float uTime,uPower,uReveal;uniform vec3 uSky,uHorizon,uSun;uniform sampler2D uBackdrop;uniform float uHasBackdrop,uAspect,uImageAspect;uniform vec2 uResolution;${evolutionNoiseGLSL}
  float density(vec3 p){float low=1.-smoothstep(1.4,4.8,abs(p.y+4.7));float high=1.-smoothstep(2.,5.2,abs(p.y-10.5));float layer=max(low,high*.82);if(layer<.01)return 0.;vec3 q=p*.145+vec3(uTime*.018,0.,uTime*.009);float base=fbm(q);float detail=noise3(q*4.1+7.);float field=max(base-.37-detail*.10,0.);float clear=1.-uReveal*.24*exp(-dot(p.xz-vec2(0.,-18.),p.xz-vec2(0.,-18.))*.012);return field*layer*2.6*clear;}
  void main(){vec3 rd=normalize(vWorld-cameraPosition),sun=normalize(vec3(-.35,.43,-.83));float elevation=smoothstep(-.3,.85,rd.y);vec3 color=mix(uHorizon*.38,uSky*.62,pow(elevation,.65));float sundot=max(0.,dot(rd,sun));color+=uSun*(pow(sundot,6.)*.17+pow(sundot,90.)*.85+pow(sundot,900.)*7.);
   float transmittance=1.;vec3 scattering=vec3(0.);float jitter=hash31(vec3(gl_FragCoord.xy,3.));
   for(int i=0;i<18;i++){float t=7.+(float(i)+jitter)*2.35;vec3 p=cameraPosition+rd*t;float d=density(p);if(d>.006){float ahead=density(p+sun*2.6);float light=exp(-ahead*3.8);float phase=.44+pow(sundot,5.)*.7;vec3 lit=uHorizon*.13+vec3(.035,.065,.11)+uSun*light*phase*1.05;float alpha=1.-exp(-d*1.6);scattering+=transmittance*lit*alpha;transmittance*=1.-alpha;if(transmittance<.025)break;}}
   color=color*transmittance+scattering;float haze=exp(-abs(rd.y+.05)*12.);color=mix(color,uHorizon*.34,haze*.18);float rays=pow(max(0.,sin(atan(rd.x+.25,-rd.z)*35.+rd.y*6.)),20.)*pow(sundot,9.)*transmittance*(.08+uPower*.16);color+=uSun*rays;if(uHasBackdrop>.5){vec2 uv=gl_FragCoord.xy/uResolution;vec2 crop=vec2(min(1.,uAspect/uImageAspect),min(1.,uImageAspect/uAspect));uv=(uv-.5)*crop+vec2(mix(.43,.5,smoothstep(.6,1.7,uAspect)),.5);uv+=vec2(sin(uTime*.08)*.003,sin(uTime*.035)*.0015);uv=clamp(uv,.001,.999);vec3 art=texture2D(uBackdrop,uv).rgb;float edge=pow(abs(uv.x-.5)*2.,2.);float movingCloud=.035+edge*.075;color=mix(art*(.66+uReveal*.37+uPower*.12),color,movingCloud);color+=uSun*rays*.6;}gl_FragColor=vec4(max(color,vec3(.002)),1.);
  }`})));
 sky.name='procedural-cloud-sea';sky.renderOrder=-1000;const atmosphereScene=new THREE.Scene();atmosphereScene.add(sky);
 scene.add(new THREE.HemisphereLight('#b6dcff','#142127',.78));
 const sunlight=new THREE.DirectionalLight('#ffe1ac',3.4);sunlight.position.set(-4,8,-3);sunlight.castShadow=true;sunlight.shadow.mapSize.set(1024,1024);sunlight.shadow.camera.left=-4;sunlight.shadow.camera.right=4;sunlight.shadow.camera.top=6;sunlight.shadow.camera.bottom=-3;sunlight.shadow.camera.far=24;sunlight.shadow.bias=-.0005;sunlight.shadow.normalBias=.025;sunlight.shadow.radius=3;scene.add(sunlight);
 const faceLight=new THREE.DirectionalLight('#dceeff',1.55);faceLight.position.set(3,4,7);scene.add(faceLight);
 const edgeLight=new THREE.DirectionalLight('#75c9ff',2.3);edgeLight.position.set(4,3,-4);scene.add(edgeLight);
 const blessingLight=new THREE.PointLight('#ffdf9c',0,13,2);blessingLight.position.set(0,3.2,1);scene.add(blessingLight);
 // A weathered stone ledge above the cloud sea, with a true lit surface and shadows.
 const rockMaterial=material(new THREE.MeshStandardMaterial({color:'#53616b',roughness:.94,metalness:.08}));
 rockMaterial.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 vStone;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvStone=position;');shader.fragmentShader='varying vec3 vStone;\n'+evolutionNoiseGLSL+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float rockNoise=fbm(vStone*3.1);float grain=noise3(vStone*57.);float veins=smoothstep(.445,.46,abs(noise3(vStone*6.1)-.5));diffuseColor.rgb*=.48+rockNoise*.72+grain*.11;diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.13,.17,.20),veins*.22);`);shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 float stoneHeight=noise3(vStone*18.)*.0035+noise3(vStone*44.)*.0005;vec3 stoneDx=dFdx(-vViewPosition),stoneDy=dFdy(-vViewPosition);vec3 stoneR1=cross(stoneDy,normal),stoneR2=cross(normal,stoneDx);float stoneDet=dot(stoneDx,stoneR1);vec3 stoneGrad=sign(stoneDet)*(dFdx(stoneHeight)*stoneR1+dFdy(stoneHeight)*stoneR2);normal=normalize(abs(stoneDet)*normal-stoneGrad);`);};rockMaterial.customProgramCacheKey=()=> 'evolution-weathered-stone-v1';
 const rockGeometry=geometry(new THREE.PlaneGeometry(18,15,144,120).rotateX(-Math.PI/2)),array=rockGeometry.attributes.position;
 const rockHash=(x,z)=>{const v=Math.sin(x*127.1+z*311.7)*43758.5453;return v-Math.floor(v);},rockNoise=(x,z)=>{const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);return(rockHash(ix,iz)*(1-u)+rockHash(ix+1,iz)*u)*(1-v)+(rockHash(ix,iz+1)*(1-u)+rockHash(ix+1,iz+1)*u)*v;};
 for(let i=0;i<array.count;i++){const x=array.getX(i),z=array.getZ(i),r=Math.hypot(x,z*.78),blend=smooth((r-1.35)/1.6),n=rockNoise(x*.75,z*.75)*.50+rockNoise(x*2.2,z*2.2)*.17+rockNoise(x*6,z*6)*.055,cliff=smooth((r-4.4)/3.1),ridge=Math.pow(Math.max(0,Math.sin(x*.7+z*.45)),5.)*Math.max(0,-z-1.5)*.18;array.setY(i,.47+blend*(n-.33+ridge)-cliff*(2.4+rockNoise(x,z)*1.2));}
 rockGeometry.computeVertexNormals();const island=new THREE.Mesh(rockGeometry,rockMaterial);island.name='weathered-sky-ledge';island.receiveShadow=true;scene.add(island);
 const stoneGeometry=geometry(new THREE.IcosahedronGeometry(1,2));
 for(let i=0;i<15;i++){const x=Math.sin(i*11.3)*4.8,z=-1.9-Math.abs(Math.sin(i*5.7))*2.6,rock=new THREE.Mesh(stoneGeometry,rockMaterial);rock.position.set(x,.16,z);const size=.12+(i%5)*.075;rock.scale.set(size*1.35,size*.62,size);rock.rotation.set(i*.4,i,.3);rock.castShadow=true;rock.receiveShadow=true;scene.add(rock);}
 const shadowMaterial=material(new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uOpacity:{value:.40}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float uOpacity;void main(){float d=length((vUv-.5)*2.);gl_FragColor=vec4(.005,.012,.019,exp(-d*d*5.)*uOpacity);}',polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
 const contactShadow=new THREE.Mesh(geometry(new THREE.PlaneGeometry(2.4,1.65)),shadowMaterial);contactShadow.rotation.x=-Math.PI/2;contactShadow.position.y=.476;scene.add(contactShadow);
 function actor(id){
  const model=buildCharacter(THREE,Characters,id,{handColor:descriptor.handColor,footColor:descriptor.footColor}),holder=new THREE.Group();
  if(['新芽期','青葉期'].includes(model.userData.growthStage)&&model.userData.body){model.updateMatrixWorld(true);const body=model.userData.body,box=new THREE.Box3().setFromObject(body),ray=new THREE.Raycaster();for(const foot of model.userData.feet||[]){const feetBox=new THREE.Box3().setFromObject(foot),center=feetBox.getCenter(new THREE.Vector3()),height=feetBox.max.y-feetBox.min.y;ray.set(new THREE.Vector3(center.x,box.min.y-20,center.z),new THREE.Vector3(0,1,0));const hit=ray.intersectObject(body,true)[0];if(!hit)continue;const origin=foot.getWorldPosition(new THREE.Vector3());origin.y+=hit.point.y-height*.25-center.y;foot.position.copy(foot.parent.worldToLocal(origin));}model.updateMatrixWorld(true);}
  const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),position=model.position.clone(),scale=2.35/Math.max(size.y,size.x*.9,size.z*.75,.01);model.scale.multiplyScalar(scale);model.position.copy(position.multiplyScalar(scale)).sub(new THREE.Vector3(center.x*scale,bounds.min.y*scale,center.z*scale));
  holder.add(model);holder.position.y=.47;scene.add(holder);const fades=[],seen=new Set();model.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m&&!seen.has(m)){seen.add(m);if(m.isMeshStandardMaterial){m.roughness=Math.max(.42,Math.min(.78,m.roughness));m.envMapIntensity=.8;}fades.push({material:m,opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite,emissive:m.emissive?.clone(),emissiveIntensity:m.emissiveIntensity});}});
  const row={holder,model,fades,scale};models.push(row);return row;
 }
 const before=actor(descriptor.beforeId),after=actor(descriptor.afterId);before.holder.name='before-evolution';after.holder.name='after-evolution';
 const energyUniforms={uTime:{value:0},uPower:{value:0},uColor:{value:new THREE.Color('#ffe6b4')}};
 const beamMaterial=material(new THREE.ShaderMaterial({uniforms:energyUniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;uniform float uTime,uPower;uniform vec3 uColor;void main(){float strand=pow(.5+.5*sin(vUv.x*94.+sin(vUv.y*12.-uTime*1.4)*.7),12.);float edge=pow(abs(sin(vUv.x*3.14159)),3.);float vertical=smoothstep(0.,.07,vUv.y)*(1.-smoothstep(.72,1.,vUv.y));float a=(strand*.095+edge*.022)*vertical*uPower;gl_FragColor=vec4(uColor*(1.8+strand*3.),a);}`}));
 const beam=new THREE.Mesh(geometry(new THREE.CylinderGeometry(.8,1.25,11,80,1,true)),beamMaterial);beam.position.set(0,5.7,0);beam.name='sky-blessing-column';scene.add(beam);
 const cocoonUniforms={uTime:{value:0},uPower:{value:0}};
 const cocoon=new THREE.Mesh(geometry(new THREE.SphereGeometry(1.72,64,48)),material(new THREE.ShaderMaterial({uniforms:cocoonUniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,vertexShader:'varying vec3 vNormal,vEye,vLocal;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vEye=normalize(-mv.xyz);vLocal=position;gl_Position=projectionMatrix*mv;}',fragmentShader:`varying vec3 vNormal,vEye,vLocal;uniform float uTime,uPower;${evolutionNoiseGLSL}void main(){float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vEye))),2.4);float field=fbm(vLocal*2.8+vec3(0.,-uTime*.45,uTime*.1));float veins=pow(smoothstep(.30,.7,field),3.);float stream=pow(.5+.5*sin(vLocal.y*13.+atan(vLocal.z,vLocal.x)*5.-uTime*1.2+field*6.),7.);float a=(rim*.18+stream*.36)*veins*uPower;vec3 color=mix(vec3(.32,1.25,2.),vec3(2.2,1.45,.42),field);gl_FragColor=vec4(color*2.,a);}` })));cocoon.position.set(0,1.64,0);cocoon.name='condensed-sky-blessing';scene.add(cocoon);
 const ribbons=[];
 for(let i=0;i<7;i++){const points=[];for(let j=0;j<=70;j++){const u=j/70,a=u*3.3+i*Math.PI*2/7,r=3.9*(1-u)+.22;points.push(new THREE.Vector3(Math.cos(a)*r,7.5-u*6.05,Math.sin(a)*r));}const mat=material(new THREE.MeshBasicMaterial({color:i%2?'#79cbff':'#ffe3a4',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending})),mesh=new THREE.Mesh(geometry(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),100,.012+i%2*.008,5,false)),mat);mesh.name='atmospheric-energy-stream';scene.add(mesh);ribbons.push(mesh);}
 const waveUniforms={uTime:{value:0},uOpacity:{value:0},uColor:{value:new THREE.Color('#a8e7ff')}};
 const wave=new THREE.Mesh(geometry(new THREE.PlaneGeometry(2,2)),material(new THREE.ShaderMaterial({uniforms:waveUniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float uTime,uOpacity;uniform vec3 uColor;void main(){float r=length(vUv-.5)*2.;float wave=exp(-pow((r-.72)*26.,2.))+.25*exp(-pow((r-.61)*22.,2.));gl_FragColor=vec4(uColor*2.,wave*uOpacity);}' })));wave.rotation.x=-Math.PI/2;wave.position.y=.51;wave.name='reveal-pressure-wave';scene.add(wave);
 const particleCount=1100,positions=new Float32Array(particleCount*3),colors=new Float32Array(particleCount*3),particlesGeo=geometry(new THREE.BufferGeometry());particlesGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const gold=new THREE.Color('#ffe4a2'),blue=new THREE.Color('#9edfff');for(let i=0;i<particleCount;i++){const c=i%3?gold:blue;colors[i*3]=c.r*2.2;colors[i*3+1]=c.g*2.2;colors[i*3+2]=c.b*2.2;}particlesGeo.setAttribute('color',new THREE.BufferAttribute(colors,3));
 const particlesMat=material(new THREE.PointsMaterial({map:glowTexture,size:.065,vertexColors:true,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending})),particles=new THREE.Points(particlesGeo,particlesMat);particles.name='sky-gift-motes';particles.frustumCulled=false;scene.add(particles);
 const flareMat=material(new THREE.SpriteMaterial({color:'#ffdfa7',map:glowTexture,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending})),flare=new THREE.Sprite(flareMat);flare.position.set(0,2,-.7);flare.scale.set(5,5,1);scene.add(flare);
 function fade(row,value,power){row.holder.visible=value>.001;for(const f of row.fades){const m=f.material;m.opacity=f.opacity*value;m.transparent=value<.999||f.transparent;m.depthWrite=value>.98&&f.depthWrite;if(f.emissive&&m.emissive){m.emissive.copy(f.emissive).lerp(new THREE.Color('#c8eaff'),power*.28);m.emissiveIntensity=(f.emissiveIntensity||0)+power*.65;}}}
 function composeCamera(f){const quiet=state.reduced?0:1,reveal=smooth((f.time-7.7)/1.8),gather=smooth((f.time-1.2)/5),orbit=quiet*((1-reveal)*(-.36+gather*.43)),base=state.reduced?7.35:(8.5-gather*1.9)*(1-reveal)+7.35*reveal,distance=base*Math.max(1,.96/state.aspect);camera.position.set(Math.sin(orbit)*distance,state.reduced?2.75:2.5-gather*.18*(1-reveal)+reveal*.25,Math.cos(orbit)*distance);camera.lookAt(0,1.52,0);camera.updateMatrixWorld(true);}
 let disposed=false;
 return{scene,atmosphereScene,atmosphereResolution:atmosphere.uResolution.value,backdropTexture,camera,before,after,palette,
  fit(width,height){state.aspect=Math.max(.1,width/Math.max(1,height));atmosphere.uAspect.value=state.aspect;camera.aspect=state.aspect;camera.updateProjectionMatrix();composeCamera(state.frame??skyEvolutionFrame(state.time,{reducedMotion:state.reduced}));},
  frameAt(seconds,options){state.time=seconds;state.reduced=Boolean(options?.reducedMotion);const f=skyEvolutionNarratedFrame(seconds,options);state.frame=f;const power=f.gather*(1-f.reveal),motion=state.reduced?0:f.time,burst=clamp((f.time-7.7)/2.0),landing=f.landing??clamp((f.time-11.5)/1.1);
   fade(before,f.fromAlpha,power);fade(after,f.toAlpha,(1-f.reveal)*.45);before.holder.rotation.y=Math.sin(motion*.35)*.045;after.holder.rotation.y=(1-f.reveal)*-.17;before.holder.position.y=.47+Math.sin(motion*1.3)*.015*(1-f.change);after.holder.position.y=.47+f.hop;after.holder.scale.set(1+f.squash,1-f.squash,1+f.squash);after.holder.rotation.z=Math.sin(f.joy*Math.PI)*.045;
   shadowMaterial.uniforms.uOpacity.value=.45-f.hop*.32;contactShadow.scale.setScalar(1+f.hop*.2);atmosphere.uTime.value=motion;atmosphere.uPower.value=power;atmosphere.uReveal.value=f.reveal;cocoonUniforms.uTime.value=motion;cocoonUniforms.uPower.value=Math.sin(f.change*Math.PI)*(state.reduced?.16:1);cocoon.rotation.y=motion*.12;energyUniforms.uTime.value=motion;energyUniforms.uPower.value=state.reduced?power*.2:power*.85;blessingLight.intensity=power*18+f.reveal*1.8;sunlight.intensity=2.8+f.reveal*1.8;edgeLight.intensity=1.8+f.reveal*1.2;faceLight.intensity=1.25+f.reveal*.65;
   for(const [i,r]of ribbons.entries()){r.material.opacity=state.reduced?0:f.gather*(1-f.change)*(.23+i%2*.13);r.rotation.y=motion*.045;}
   const waveProgress=burst>0&&burst<1?burst:landing>0&&landing<1?landing:0;wave.visible=!state.reduced&&waveProgress>0;wave.scale.setScalar(1.3+waveProgress*(burst<1?8:3.5));waveUniforms.uOpacity.value=Math.sin(waveProgress*Math.PI)*.45;waveUniforms.uTime.value=motion;
   for(let i=0;i<particleCount;i++){const a=i*2.399+motion*(.08+power*.12),cycle=(i/particleCount+motion*.07)%1,spread=1-f.gather*.87;if(i<800){positions[i*3]=Math.cos(a)*(1.3+cycle*5)*spread;positions[i*3+1]=.5+(1-cycle)*7*(1-f.gather*.75)+Math.sin(i)*.12;positions[i*3+2]=Math.sin(a)*(1+cycle*4)*spread;}else{const u=(i-800)/300,r=.3+burst*(3+(i%8)*.5);positions[i*3]=Math.cos(a)*r;positions[i*3+1]=1.7+Math.sin(u*8)*burst*2-burst*burst*.8;positions[i*3+2]=Math.sin(a)*r;}}
   particlesGeo.attributes.position.needsUpdate=true;particlesMat.opacity=(.18+power*.66+Math.sin(burst*Math.PI)*.55)*(1-f.fade);particlesMat.size=state.reduced?.035:.055+power*.018;flareMat.opacity=state.reduced?0:Math.sin(f.change*Math.PI)*.28;flare.scale.setScalar(2.5+f.change*3.5);composeCamera(f);return f;
  },
  dispose(){if(disposed)return;disposed=true;for(const row of models){scene.remove(row.holder);Characters.disposeMatureCharacterModel(row.model);}sunlight.shadow.map?.dispose();sunlight.shadow.mapPass?.dispose();for(const g of ownGeometries)g.dispose();for(const m of ownMaterials)m.dispose();for(const t of textures)t.dispose();}
 };
}

export function createSkyEvolutionRenderer(THREE,renderer){
 const floatColor=renderer.extensions.has('EXT_color_buffer_float'),type=floatColor?THREE.HalfFloatType:THREE.UnsignedByteType,targets=[];
 const target=()=>{const t=new THREE.WebGLRenderTarget(1,1,{type,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false});targets.push(t);return t;};
 const main=target();main.depthBuffer=true;main.samples=4;const skyTarget=target();const bright=target(),blurX=target(),blurY=target();
 const quadGeometry=new THREE.PlaneGeometry(2,2),scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1),quad=new THREE.Mesh(quadGeometry);quad.frustumCulled=false;scene.add(quad);
 const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
 const backgroundMat=new THREE.ShaderMaterial({uniforms:{uAtmosphere:{value:skyTarget.texture},uBackdrop:{value:null},uHasBackdrop:{value:0},uAspect:{value:1},uImageAspect:{value:16/9},uTime:{value:0},uPower:{value:0},uReveal:{value:0}},vertexShader:vertex,fragmentShader:`varying vec2 vUv;uniform sampler2D uAtmosphere,uBackdrop;uniform float uHasBackdrop,uAspect,uImageAspect,uTime,uPower,uReveal;void main(){vec3 cloud=texture2D(uAtmosphere,vUv).rgb;if(uHasBackdrop>.5){vec2 crop=vec2(min(1.,uAspect/uImageAspect),min(1.,uImageAspect/uAspect));vec2 uv=(vUv-.5)*crop+vec2(mix(.43,.5,smoothstep(.6,1.7,uAspect)),.5);uv+=vec2(sin(uTime*.08)*.003,sin(uTime*.035)*.0015);vec3 art=texture2D(uBackdrop,clamp(uv,.001,.999)).rgb;float edge=pow(abs(uv.x-.5)*2.,2.);cloud=mix(art*(.66+uReveal*.37+uPower*.12),cloud,.035+edge*.075);}gl_FragColor=vec4(cloud,1.);}`,depthTest:false,depthWrite:false,toneMapped:false});
 const brightMat=new THREE.ShaderMaterial({uniforms:{uMap:{value:main.texture}},vertexShader:vertex,fragmentShader:'varying vec2 vUv;uniform sampler2D uMap;void main(){vec3 c=texture2D(uMap,vUv).rgb;float l=max(c.r,max(c.g,c.b));float w=smoothstep(.72,1.8,l);gl_FragColor=vec4(c*w,1.);}',depthTest:false,depthWrite:false,toneMapped:false});
 const blurMat=new THREE.ShaderMaterial({uniforms:{uMap:{value:null},uStep:{value:new THREE.Vector2()}},vertexShader:vertex,fragmentShader:'varying vec2 vUv;uniform sampler2D uMap;uniform vec2 uStep;void main(){vec3 c=texture2D(uMap,vUv).rgb*.227027;c+=(texture2D(uMap,vUv+uStep*1.384615).rgb+texture2D(uMap,vUv-uStep*1.384615).rgb)*.316216;c+=(texture2D(uMap,vUv+uStep*3.230769).rgb+texture2D(uMap,vUv-uStep*3.230769).rgb)*.070270;gl_FragColor=vec4(c,1.);}',depthTest:false,depthWrite:false,toneMapped:false});
 const outputMat=new THREE.ShaderMaterial({uniforms:{uScene:{value:main.texture},uBloom:{value:blurY.texture},uTime:{value:0},uPower:{value:0},uReduced:{value:0}},vertexShader:vertex,
  fragmentShader:`varying vec2 vUv;uniform sampler2D uScene,uBloom;uniform float uTime,uPower,uReduced;
  vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
  void main(){vec2 q=vUv-.5;vec2 fringe=q*uPower*.0015*(1.-uReduced);vec3 c=texture2D(uScene,vUv).rgb;c.r=texture2D(uScene,vUv+fringe).r;c.b=texture2D(uScene,vUv-fringe).b;c+=texture2D(uBloom,vUv).rgb*(.22+uPower*.13);c=aces(c*1.05);float vignette=1.-dot(q*vec2(.72,1.),q*vec2(.72,1.))*.48;c*=vignette;float grain=(fract(sin(dot(gl_FragCoord.xy+floor(uTime*12.),vec2(12.9898,78.233)))*43758.5453)-.5)*.004*(1.-uReduced);gl_FragColor=vec4(c+grain,1.);
  #include <colorspace_fragment>
  }`,depthTest:false,depthWrite:false,toneMapped:false});
 let disposed=false,width=1,height=1,ratio=1;renderer.toneMapping=THREE.NoToneMapping;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor('#081521',1);
 function pass(mat,destination){quad.material=mat;renderer.setRenderTarget(destination);renderer.render(scene,camera);}
 return{quality:floatColor?'hdr-bloom':'bloom',resize(w,h,pixelRatio=1){width=Math.max(1,Math.floor(w));height=Math.max(1,Math.floor(h));ratio=Math.min(Math.max(.65,pixelRatio),1.5,1800/Math.max(width,height));renderer.setPixelRatio(ratio);renderer.setSize(width,height,false);main.setSize(Math.max(1,Math.floor(width*ratio)),Math.max(1,Math.floor(height*ratio)));skyTarget.setSize(Math.max(1,Math.floor(width*ratio*.55)),Math.max(1,Math.floor(height*ratio*.55)));for(const t of[bright,blurX,blurY])t.setSize(Math.max(1,Math.floor(width*ratio/4)),Math.max(1,Math.floor(height*ratio/4)));},
  render(world,frame,{reducedMotion=false}={}){if(disposed)return;world.atmosphereResolution.set(skyTarget.width,skyTarget.height);renderer.setRenderTarget(skyTarget);renderer.render(world.atmosphereScene,world.camera);world.scene.background=null;backgroundMat.uniforms.uBackdrop.value=world.backdropTexture;backgroundMat.uniforms.uHasBackdrop.value=world.backdropTexture?1:0;backgroundMat.uniforms.uAspect.value=width/height;backgroundMat.uniforms.uImageAspect.value=world.backdropTexture?.image?world.backdropTexture.image.width/world.backdropTexture.image.height:16/9;backgroundMat.uniforms.uTime.value=reducedMotion?0:frame.time;backgroundMat.uniforms.uPower.value=frame.gather*(1-frame.reveal);backgroundMat.uniforms.uReveal.value=frame.reveal;pass(backgroundMat,main);const oldClear=renderer.autoClear;renderer.autoClear=false;try{renderer.render(world.scene,world.camera);}finally{renderer.autoClear=oldClear;}pass(brightMat,bright);blurMat.uniforms.uMap.value=bright.texture;blurMat.uniforms.uStep.value.set(1.5/bright.width,0);pass(blurMat,blurX);blurMat.uniforms.uMap.value=blurX.texture;blurMat.uniforms.uStep.value.set(0,1.5/bright.height);pass(blurMat,blurY);outputMat.uniforms.uTime.value=frame.time;outputMat.uniforms.uPower.value=frame.gather*(1-frame.reveal);outputMat.uniforms.uReduced.value=reducedMotion?1:0;pass(outputMat,null);},
  dispose(){if(disposed)return;disposed=true;for(const t of targets)t.dispose();backgroundMat.dispose();brightMat.dispose();blurMat.dispose();outputMat.dispose();quadGeometry.dispose();}
 };
}

export function installSkyEvolutionPresentation({loadResources,buildCharacter,documentTarget=document,windowTarget=window,backdropUrl=null,narrationCatalogue=null,narrationPreviewOrigin=null,getNarrationVolume=()=>1,onNarrationStateChange=()=>{}}={}){
 const doc=documentTarget,win=windowTarget,seen=new Set(),pending=[];let active=null,disposed=false;
 const voices=new Map((narrationCatalogue?.voices??[]).filter(row=>row.approved).map(row=>[row.id,row]));
 const names=()=>win.ImasoraMonsterNames;
 function enqueue(before,next,options={}){const descriptor=describeSkyEvolution(before,next,{...options,names:names()});if(!descriptor||seen.has(descriptor.key))return false;seen.add(descriptor.key);if(seen.size>40)seen.delete(seen.values().next().value);pending.push(descriptor);void startNext();return true;}
 function show(descriptor){if(disposed||!names()?.get(descriptor?.beforeId)||!names()?.get(descriptor?.afterId))return false;pending.push(Object.freeze({...descriptor}));void startNext();return true;}
 async function startNext(){
  if(disposed||active||!pending.length||doc.hidden)return;
  const descriptor=pending.shift(),previousFocus=doc.activeElement,root=doc.createElement('section');root.className='sky-evolution';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','空の恵みで進化');
  root.innerHTML='<div class="evolution-sky-art" aria-hidden="true"></div><header><span>IMASORA WALK</span><div class="evolution-actions"><button type="button" data-evolution-play hidden>音声つきで再生</button><button type="button" data-evolution-skip>演出をスキップ</button></div></header><div class="evolution-canvas" role="img" aria-label="今の空の光が相棒に集まり、新しい姿へ育つ3Dの進化シーン"></div><div class="evolution-copy" aria-live="polite"><p data-evolution-line hidden></p><h2 data-evolution-name></h2><p data-evolution-stage></p><p data-evolution-audio-status role="status" hidden></p></div>';
  const title=root.querySelector('[data-evolution-name]'),stage=root.querySelector('[data-evolution-stage]'),line=root.querySelector('[data-evolution-line]'),host=root.querySelector('.evolution-canvas'),skip=root.querySelector('[data-evolution-skip]'),play=root.querySelector('[data-evolution-play]'),audioStatus=root.querySelector('[data-evolution-audio-status]');title.textContent=descriptor.beforeName||names().name(descriptor.beforeId);stage.textContent='';
  const palette=skyEvolutionPalette(descriptor.skyId);root.style.setProperty('--evolution-sky',palette.sky);root.style.setProperty('--evolution-horizon',palette.horizon);
  const token={root,world:null,renderer:null,pipeline:null,narration:null,frame:0,elapsed:0,previous:0,closed:false};active=token;
  const inert=[...doc.body.children].filter(e=>e!==root&&e.tagName!=='SCRIPT'&&e.tagName!=='STYLE').map(e=>({element:e,value:e.inert}));for(const row of inert)row.element.inert=true;
  doc.body.append(root);doc.body.classList.add('sky-evolution-open');skip.focus({preventScroll:true});
  let resize,texture,backdropTexture,revealed=false,beforeNameCleared=false,captionShown=false,nameShown=false,nameCalled=false,narrationRequested=false;
  const voice=voices.get(descriptor.afterId),approvedVoice=voice?.name===names().name(descriptor.afterId)?voice:null;
  if(approvedVoice){
   const url=narrationPreviewOrigin?new URL(approvedVoice.previewPath,narrationPreviewOrigin).href:new URL(approvedVoice.src,doc.baseURI).href;
   token.narration=createEvolutionNarrationSession(approvedVoice,{url,audioFactory:()=>doc.createElement('audio'),getVolume:getNarrationVolume,onStateChange:onNarrationStateChange,onBlocked(){play.hidden=false;audioStatus.hidden=false;audioStatus.textContent='音声つきで再生を押すと、つづきが始まります。';}});
   token.narration.audio.hidden=true;root.append(token.narration.audio);root.dataset.narrationId=approvedVoice.id;
  }
  const reduced=win.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
  function finish(){if(token.closed)return;token.closed=true;win.cancelAnimationFrame(token.frame);token.narration?.dispose();resize?.disconnect();token.world?.dispose();token.pipeline?.dispose();texture?.dispose();backdropTexture?.dispose();token.renderer?.dispose();token.renderer?.forceContextLoss?.();root.remove();for(const row of inert)row.element.inert=row.value;doc.body.classList.remove('sky-evolution-open');doc.removeEventListener('keydown',keys,true);const focus=previousFocus?.isConnected?previousFocus:doc.querySelector('.nav-tab.active');if(focus&&!focus.closest?.('[inert]'))focus.focus?.({preventScroll:true});active=null;void startNext();}
  function keys(event){if(event.key==='Escape'){event.preventDefault();finish();}else if(event.key==='Tab'){event.preventDefault();const buttons=[play,skip].filter(button=>!button.hidden),index=buttons.indexOf(doc.activeElement),next=(index+(event.shiftKey?-1:1)+buttons.length)%buttons.length;buttons[next].focus();}}
  token.finish=finish;skip.addEventListener('click',finish);play.addEventListener('click',()=>{play.hidden=true;audioStatus.hidden=true;void token.narration?.start();});doc.addEventListener('keydown',keys,true);
  let pixelRatio=Math.min(win.devicePixelRatio||1,win.innerWidth<600?1.25:1.5),slowFrames=0,measuredFrames=0,measuredTime=0,fit=()=>{};
  function frame(now){
   if(token.closed)return;const dt=token.previous?Math.min(.08,Math.max(0,(now-token.previous)/1000)):0;token.previous=now;const elapsed=doc.hidden?0:dt;token.elapsed+=elapsed;
   const intro=token.elapsed*(reduced?SKY_EVOLUTION_SECONDS/4.4:1);
   if(token.narration&&intro>=SKY_EVOLUTION_NARRATION_START&&!narrationRequested&&!doc.hidden){narrationRequested=true;root.dataset.narrationStartedAt=String(token.elapsed);void token.narration.start();}
   const narration=token.narration?.tick(elapsed),options={reducedMotion:reduced,narration},f=token.world?token.world.frameAt(token.elapsed,options):skyEvolutionNarratedFrame(token.elapsed,options);root.dataset.phase=f.phase;root.style.opacity=String(1-f.fade);
   if(!f.beforeNameVisible&&!beforeNameCleared){beforeNameCleared=true;title.textContent='';title.hidden=true;root.dataset.beforeNameHiddenAt=String(token.elapsed);root.dataset.beforeNameHiddenSceneTime=String(f.time);}
   if(f.time>=7.7&&!revealed){revealed=true;if(!approvedVoice){stage.textContent=descriptor.stage||names().get(descriptor.afterId).stage;title.textContent=descriptor.afterName||names().name(descriptor.afterId);title.hidden=false;line.hidden=false;line.textContent='空がくれた、新しい力';}}
   const labels=skyEvolutionNarrationLabels(narration);
   if(approvedVoice&&labels.captionVisible&&!captionShown){captionShown=true;line.textContent=approvedVoice.catchphrase;line.hidden=false;root.dataset.captionMediaTime=String(narration.currentTime);}
   if(approvedVoice&&labels.nameVisible&&!nameShown){nameShown=true;title.textContent=approvedVoice.name;title.hidden=false;stage.textContent=descriptor.stage||names().get(descriptor.afterId).stage;root.classList.add('name-shown');root.dataset.nameDisplayMediaTime=String(narration.currentTime);}
   if(narration){root.dataset.narrationStatus=narration.status;root.dataset.narrationTime=String(narration.currentTime);if(narration.status==='playing'){play.hidden=true;audioStatus.hidden=true;}else if(narration.status==='fallback'){play.hidden=true;audioStatus.hidden=false;audioStatus.textContent='音声を読み込めませんでした。演出をつづけています。';}}
   if(approvedVoice&&f.nameAction&&!nameCalled){nameCalled=true;root.classList.add('name-called');const detail={id:approvedVoice.id,name:approvedVoice.name,nameStartSeconds:approvedVoice.nameStartSeconds,mediaTime:narration.currentTime,offsetMs:(narration.currentTime-approvedVoice.nameStartSeconds)*1000,fallback:narration.status==='fallback'};root.dataset.nameCueTime=String(detail.nameStartSeconds);root.dataset.nameActionMediaTime=String(detail.mediaTime);root.dataset.nameActionOffsetMs=String(detail.offsetMs);root.dispatchEvent(new win.CustomEvent('imasora-evolution-name-action',{bubbles:true,detail}));}
   if(elapsed>0){measuredFrames++;measuredTime+=elapsed;if(dt>.045&&measuredFrames>30&&measuredFrames<100)slowFrames++;if(slowFrames===9&&pixelRatio>.76){pixelRatio=Math.max(.75,pixelRatio*.78);slowFrames=0;fit();}root.dataset.frameRate=String(Math.round(measuredFrames/Math.max(.001,measuredTime)));root.dataset.time=String(Math.round(f.time*10)/10);}
   token.pipeline?.render(token.world,f,{reducedMotion:reduced});if(f.done){finish();return;}token.frame=win.requestAnimationFrame(frame);
  }
  try{
   const[THREE,Characters]=await loadResources();if(token.closed||disposed)return;
   const canvas=doc.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.22,'rgba(255,255,255,.7)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);texture=new THREE.CanvasTexture(canvas);
   backdropTexture=await new THREE.TextureLoader().loadAsync(backdropUrl||new URL('./assets/imasora-evolution-cloudsea-1211q.jpg',doc.baseURI).href).catch(()=>null);if(backdropTexture)backdropTexture.colorSpace=THREE.SRGBColorSpace;if(token.closed||disposed){backdropTexture?.dispose();return;}
   token.world=createSkyEvolutionScene(THREE,Characters,buildCharacter,descriptor,{glowTexture:texture,backdropTexture});
   token.renderer=new THREE.WebGLRenderer({alpha:false,antialias:true,powerPreference:'high-performance'});token.pipeline=createSkyEvolutionRenderer(THREE,token.renderer);root.dataset.quality=token.pipeline.quality;host.append(token.renderer.domElement);
   fit=()=>{const r=host.getBoundingClientRect();token.pipeline.resize(Math.max(1,r.width),Math.max(1,r.height),pixelRatio);token.world.fit(r.width,r.height);};resize=new win.ResizeObserver(fit);resize.observe(host);fit();
   token.renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();finish();});
   token.frame=win.requestAnimationFrame(frame);
  }catch(error){if(token.closed)return;token.pipeline?.dispose();token.renderer?.dispose();token.world?.dispose();token.pipeline=null;token.renderer=null;token.world=null;root.dataset.quality='text-fallback';skip.textContent='つづける';token.frame=win.requestAnimationFrame(frame);console.warn('進化のお祝いの3D表示を省略しました',error);}
 }
 const visibility=()=>{if(active){active.previous=0;if(doc.hidden)active.narration?.pauseForVisibility();else void active.narration?.resumeFromVisibility();}else void startNext();};doc.addEventListener('visibilitychange',visibility);
 const leave=()=>{pending.length=0;active?.finish();};win.addEventListener('pagehide',leave);
 return Object.freeze({enqueue,show,get active(){return Boolean(active);},dispose(){disposed=true;pending.length=0;active?.finish();doc.removeEventListener('visibilitychange',visibility);win.removeEventListener('pagehide',leave);}});
}
