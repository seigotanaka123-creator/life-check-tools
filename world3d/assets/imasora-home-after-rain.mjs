const afterRainEase=(a,b,t)=>{const p=Math.max(0,Math.min(1,(t-a)/(b-a)));return p*p*(3-2*p);};
const afterRainMix=(a,b,t)=>a+(b-a)*t;
export function homeAfterRainFrame(seconds,reduced=false){
 const t=Math.max(0,seconds)*(reduced?2.65:1),handoff=afterRainEase(16.40,18.50,t);
 return {t,handoff:reduced?Number(t>=18.50):handoff,fade:.76*(1-afterRainEase(0,.9,t)),
  atWindow:t<6.2,
  light:afterRainEase(1.42,8.51,t),wet:(1-.69*afterRainEase(1.42,8.51,t))*(1-afterRainEase(9.8,12.55,t)),
  done:t>=18.50};
}

export function createHomeAfterRainScene(T,h){
 const {scene,camera,actors,road,roadSurfaceY,exterior,hemi,faceLight,homeView,target,cullOutside,windowPosition,windowSeat,couch}=h;
 const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),dry=road.material.color.clone(),wet=new T.Color('#506979');
 const rough=road.material.roughness;
 const seatTop=new T.Box3().setFromObject(windowSeat).max.y;
 const skin=new T.ShaderMaterial({
  transparent:true,depthWrite:false,depthTest:true,
  stencilWrite:true,stencilRef:1,stencilFunc:T.EqualStencilFunc,stencilFail:T.KeepStencilOp,
  stencilZFail:T.KeepStencilOp,stencilZPass:T.KeepStencilOp,
  uniforms:{wet:{value:1},light:{value:0}},
  vertexShader:'varying vec2 p; void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`
   varying vec2 p; uniform float wet,light;
   void main(){
    float u=p.x,v=p.y,edge=1.-smoothstep(.65,1.65,abs(v));
    float patches=smoothstep(.14,.78,sin(u*2.7+v*3.29)*sin(u*1.7-v*9.1)*.45+.49);
    float sheen=exp(-pow((v-.15- .12*sin(u*1.7))*3.3,2.))*edge*(.33+.48*patches);
    vec3 color=mix(vec3(.28,.42,.51),vec3(.80,.76,.60),light*.72);
    gl_FragColor=vec4(color,(sheen*.55+patches*edge*.023)*wet);
    #include <colorspace_fragment>
   }`
 });
 const sheen=new T.Mesh(new T.PlaneGeometry(28,3.3),skin);
 sheen.name='home-after-rain-road-sheen';sheen.rotation.x=-Math.PI/2;sheen.layers.set(1);
 sheen.position.set(-2,roadSurfaceY+.018,-9.9);sheen.renderOrder=3;exterior.add(sheen);
 const baseHemi=hemi.intensity,baseFace=faceLight.intensity;
 function surface(amount,light){
  road.material.color.copy(dry).lerp(wet,amount*.69);
  road.material.roughness=afterRainMix(rough,.23,amount);
  skin.uniforms.wet.value=amount;skin.uniforms.light.value=light;
  road.userData.afterRainWetness=amount;road.userData.afterRainLight=light;
 }
 // Both jumps begin at floor level, in front of the window-side cushion.
 const chairX=windowSeat.position.x+.09,chairZ=windowSeat.position.z+.04;
 const companionX=-2.90,companionZ=.80;
 const facingWindow=(x,z)=>Math.atan2(windowPosition.x-x,windowPosition.z-z);
 const cushionLift=1.035;
 function makeTrack(row,approach,takeoff,landing,launchTime,landTime,turnTime,walkEnd,sitTime){
  const [lx,lz]=takeoff,[sx,sz]=landing,{standingY:g,homePosition:seat,facing}=row;
  const yaw=Math.atan2(sx-lx,sz-lz),walkYaw=Math.atan2(seat.x-sx,0);
  const standing=g+cushionLift;
  const keys=[...approach,
   [launchTime-.23,lx,g,lz,yaw,0,0],
   [launchTime,lx,g,lz,yaw,0,0],
   [landTime,sx,standing,sz,yaw,0,0],
   [landTime+.15,sx,standing,sz,yaw,0,0],
   [turnTime,sx,standing,sz,walkYaw,0,0],
   [walkEnd,seat.x,standing,sz,walkYaw,0,.54],
   [walkEnd+.15,seat.x,standing,sz,walkYaw,0,0],
   [sitTime-.51,seat.x,standing,seat.z+.115,facing,0,0],
   [sitTime,seat.x,seat.y,seat.z,facing,1,0],
  ];
  return {keys,launchTime,landTime,turnTime,walkEnd,sitTime,takeoff,landing,yaw,standing};
 }
 function makePaths(companion,guide){
  const g=guide.standingY,c=companion.standingY,gr=guide.homePosition;
  return {
   guide:makeTrack(guide,[
    [6.20,chairX,gr.y-1.05+seatTop,chairZ,facingWindow(chairX,chairZ),1,0],
    [6.59,chairX,g+seatTop+.08,chairZ,facingWindow(chairX,chairZ),.26,0],
    [6.99,chairX,g+seatTop+.10,chairZ+.16,.65,0,.08],
    [7.40,chairX,g+seatTop+.07,chairZ+.35,.02,0,.37],
    [7.90,chairX,g+.48,.02,0,0,.55],
    [8.32,chairX,g,.43,0,0,.78],
    [9.00,-2.83,g,.78,.20,0,.62],
    [9.50,-2.41,g,1.35,.36,0,.60],
    [9.94,-2.06,g,1.84,.64,0,.28],
   ],[-2.06,1.95],[-.34,.274],10.42,11.38,11.83,13.55,14.58),
   companion:makeTrack(companion,[
    [6.20,companionX,c,companionZ,facingWindow(companionX,companionZ),0,0],
    [6.43,companionX,c,.89,2.34,0,.09],
    [6.94,-2.85,c,.91,.40,0,.12],
    [7.24,-2.74,c,1.03,0,0,.49],
    [7.62,-2.34,c,1.34,0,0,.69],
    [8.06,-1.88,c,1.75,0,0,.82],
    [8.70,-1.36,c,2.31,.18,0,.40],
    [9.04,-1.43,c,2.91,.26,0,.34],
    [9.39,-1.25,c,2.98,1.36,0,.21],
    [9.89,-.46,c,3.065,1.54,0,.36],
    [10.31,-.46,c,3.065,1.54,0,0],
    [11.10,-.46,c,3.065,4.71,0,0],
    [11.76,-1.75,c,2.93,4.71,0,.53],
    [12.06,-1.86,c,2.65,3.68,0,.45],
    [12.53,-2.06,c,2.01,3.39,0,.47],
   ],[-2.06,1.95],[-.29,.36],13.11,14.07,14.51,14.99,16.04),
  };
 }
 let paths=null,sourceActors=null;
 function moveActor(row,track,t,reduced){
  const {keys,launchTime,landTime,turnTime,walkEnd,sitTime,takeoff,landing,standing}=track;
  const nextIndex=keys.findIndex(key=>t<key[0]);
  const end=nextIndex<0?keys.length-1:Math.max(1,nextIndex);
  const from=keys[end-1],to=keys[end];
  const fraction=afterRainEase(from[0],to[0],t);
  let [x,y,z,yaw,seated,walk]=from.slice(1).map((metric,i)=>afterRainMix(metric,to[i+1],fraction));
  const heading=to[4]-from[4];
  yaw=from[4]+Math.atan2(Math.sin(heading),Math.cos(heading))*fraction;
  const {model,baseScale,footMotion,bodyHeight,standingY}=row;
  const airborne=t>=launchTime&&t<landTime;
  const onCushion=t>=landTime&&t<sitTime;
  const walkingOnCushion=t>=turnTime&&t<walkEnd;
  let tuck=0,anticipation=0,pitch=0;
  if(airborne){
   const progress=(t-launchTime)/(landTime-launchTime);
   const travel=afterRainEase(.17,1,progress);
   const rise=progress*(4.10-3.10*progress);
   x=afterRainMix(takeoff[0],landing[0],travel);
   z=afterRainMix(takeoff[1],landing[1],travel);
   y=afterRainMix(standingY,standing,progress)+cushionLift*(rise-progress);
   tuck=Math.sin(Math.PI*progress);
   pitch=-.085*tuck;
  }else{
   anticipation=afterRainEase(launchTime-.25,launchTime-.11,t)*(1-afterRainEase(launchTime-.11,launchTime,t));
   const landingBend=afterRainEase(landTime,landTime+.07,t)*(1-afterRainEase(landTime+.07,landTime+.20,t));
   anticipation=Math.max(anticipation,landingBend);
   y-=.047*anticipation;
   pitch=.065*anticipation;
  }
  model.position.set(x,y,z);
  model.rotation.set(pitch,yaw,reduced?0:Math.sin(t*8.6)*walk*.023);
  model.scale.copy(baseScale);
  for(const [i,foot] of footMotion.entries()){
   const phase=t*11.7+i*Math.PI,step=reduced?0:walk;
   foot.part.position.copy(foot.standing).lerp(foot.seated,seated);
   // On the cushion, take a narrower step so the planted sole stays on the seat.
   const narrow=afterRainEase((landTime+launchTime)/2,landTime,t)*(1-afterRainEase(sitTime-.51,sitTime,t));
   const rugEdge=afterRainEase(2.64,2.94,z);
   foot.part.position.x*=1-.47*Math.max(narrow,rugEdge);
   foot.part.position.x+=.125*narrow*Math.sin(yaw)/baseScale.x;
   let lift=Math.max(0,Math.sin(phase))*step*.05*bodyHeight;
   let stride=Math.cos(phase)*step*.042*bodyHeight;
   if(walkingOnCushion&&!reduced){
    const distance=Math.abs(row.homePosition.x-landing[0]);
    const cycleLength=distance/Math.max(1,Math.round(distance/.66));
    const travelled=Math.abs(x-landing[0]);
    const cycle=(travelled/cycleLength+i*.5)%1;
    const swing=afterRainEase(.57,1,cycle);
    const stepReach=cycleLength*(.285-Math.min(cycle,.57)+.57*swing);
    const easeInOut=afterRainEase(0,.12,travelled)*(1-afterRainEase(distance-.12,distance,travelled));
    stride=easeInOut*stepReach/baseScale.y;
    lift=easeInOut*.084*Math.sin(Math.PI*swing)/baseScale.y;
   }else if(onCushion){
    lift=0;stride=0;
   }
   foot.part.position.y+=lift+tuck*.105*bodyHeight+.047*anticipation/baseScale.y;
   foot.part.position.z+=stride-tuck*.047*bodyHeight;
   foot.part.rotation.copy(foot.standingTurn);
   foot.part.rotation.x=afterRainMix(foot.standingTurn.x,foot.seatedTurn.x,seated)+tuck*.17;
  }
  const byTable=afterRainEase(2.66,2.94,z);
  const settlingOnCushion=afterRainEase(landTime-.22,landTime,t)*(1-afterRainEase(walkEnd,walkEnd+.38,t));
  for(const hand of row.hands){
   const towardBackrest=Math.sign(hand.position.x)*Math.sin(yaw);
   hand.part.position.x*=1-.40*settlingOnCushion*Math.max(0,towardBackrest)-.29*byTable;
  }
 }
 function paint(s,w,height,reduced){
  const [companion,guide]=actors;if(!companion||!guide)return;
  if(sourceActors?.[0]!==companion||sourceActors[1]!==guide){
   sourceActors=[companion,guide];paths=makePaths(companion,guide);
  }
  const t=s.t;
  moveActor(guide,paths.guide,t,reduced);
  moveActor(companion,paths.companion,t,reduced);
  // Keep the ordinary furniture and the original seated models throughout.
  hemi.intensity=baseHemi*afterRainMix(.78+.14*s.light,1,s.handoff);
  faceLight.intensity=baseFace*afterRainMix(.57+.13*s.light,1,s.handoff);
  surface(s.wet,s.light);
  const filmAspect=w/Math.max(1,height),travel=reduced?0:afterRainEase(0,6.2,t);
  const tracking=afterRainEase(6.20,15.10,t);
  const walkingView=afterRainEase(6.2,7.6,t)*(1-afterRainEase(15.10,16.36,t));
  const lens=v(-1.20+.36*travel,2.57,4.21).lerp(v(couch.position.x+.76,2.72,5.65),tracking);
  const aim=v(-2.84,1.12,-1.12).lerp(v(couch.position.x,1.58,-.13),tracking);
  lens.z+=2.24*walkingView;
  aim.y-=.32*walkingView;aim.z+=.48*walkingView;
  const fov=afterRainMix(47,36,tracking)+2*walkingView;
  const end=homeView(w,height);
  camera.position.copy(lens.lerp(end,s.handoff));
  camera.lookAt(aim.lerp(target,s.handoff));
  camera.aspect=filmAspect;camera.fov=afterRainMix(fov,36,s.handoff);
  camera.updateProjectionMatrix();cullOutside();
  const phase=s.atWindow?'watching-window':t<7.90?'standing-up':t<13.63?'walking':t<16.40?'sitting':'home';
  scene.userData.afterRain={t,phase,wet:s.wet,light:s.light,handoff:s.handoff,
   companion:companion.model.userData.characterId};
 }
 function reset(){
  road.material.color.copy(dry);road.material.roughness=rough;
  delete road.userData.afterRainWetness;delete road.userData.afterRainLight;
  hemi.intensity=baseHemi;faceLight.intensity=baseFace;
  sheen.removeFromParent();sheen.geometry.dispose();skin.dispose();
  scene.userData.afterRain=null;
 }
 return {paint,reset};
}

export function openHomeAfterRainOverlay(doc,win,canvas){
 const dialog=doc.createElement('dialog'),surface=doc.createElement('div'),dark=doc.createElement('div');
 dialog.setAttribute('aria-label','雨の物語　エンドロールのあと');
 dialog.dataset.homeAfterRain='';
 dialog.style.cssText='position:fixed;inset:0;margin:0;width:100%;height:100%;max-width:none;max-height:none;padding:0;border:0;background:#000;overflow:hidden;outline:0;overscroll-behavior:contain';
 surface.style.cssText='position:absolute;overflow:hidden;pointer-events:none;background:#000';
 dark.style.cssText='position:absolute;inset:0;background:#000;pointer-events:none';
 const style=doc.createElement('style');
 style.textContent='dialog[data-home-after-rain]::backdrop{background:transparent}dialog[data-home-after-rain] .home-room-canvas{width:100%!important;height:100%!important;inset:0!important;border-radius:0!important;pointer-events:none!important}';
 surface.append(canvas,dark);dialog.append(style,surface);doc.body.append(dialog);
 dialog.addEventListener('cancel',e=>e.preventDefault());
 try{dialog.showModal();}catch(error){dialog.remove();throw error;}
 return {
  fit(host,s){
   const w=win.innerWidth,h=win.innerHeight,filmW=Math.min(w,h*2.353),filmH=filmW/2.353,a=s.handoff;
   const to=host.getBoundingClientRect(),rect={x:afterRainMix((w-filmW)/2,to.left,a),y:afterRainMix((h-filmH)/2,to.top,a),
    w:Math.max(1,afterRainMix(filmW,to.width,a)),h:Math.max(1,afterRainMix(filmH,to.height,a))};
   Object.assign(surface.style,{left:rect.x+'px',top:rect.y+'px',width:rect.w+'px',height:rect.h+'px'});
   dialog.style.background='rgba(0,0,0,'+(1-a)+')';dark.style.opacity=String(s.fade);
   return rect;
  },
  close(){dialog.close();dialog.remove();}
 };
}

export function openHomeAfterRainTrial(doc,{onTry,onCancel}){
 const dialog=doc.createElement('dialog'),style=doc.createElement('style');
 dialog.dataset.homeAfterRainTrial='';
 dialog.setAttribute('aria-labelledby','home-rain-trial-title');
 style.textContent=`
  [data-home-after-rain-trial]{width:min(420px,calc(100% - 36px));margin:auto;padding:27px;border:1px solid #789b95;
   border-radius:20px;background:linear-gradient(155deg,#24473f,#132d30);color:#fff9e7;text-align:center;
   box-shadow:0 24px 70px #0717189c;font-family:inherit}
  [data-home-after-rain-trial]::backdrop{background:#17252aae}
  [data-home-after-rain-trial] h2{margin:0 0 20px;font-size:clamp(1.35rem,4vw,1.8rem);color:inherit}
  [data-home-after-rain-trial] button{min-width:9rem;min-height:48px;padding:8px 24px;border:1px solid #ffedbb;
   border-radius:12px;background:linear-gradient(#fff0bc,#edc77c);color:#2b2116;
   font:700 1.15rem inherit;font-family:inherit;font-size:1.15rem;font-weight:700;box-shadow:0 4px 0 #a97747}
  [data-home-after-rain-trial] button:active{transform:translateY(3px);box-shadow:0 1px 0 #a97747}
  [data-home-after-rain-trial] button:focus-visible{outline:3px solid #fff;outline-offset:4px}
 `;
 const title=doc.createElement('h2'),button=doc.createElement('button');
 title.id='home-rain-trial-title';title.textContent='雨上がりのホーム';
 button.type='button';button.textContent='試す';
 const close=()=>{dialog.close();dialog.remove();};
 button.addEventListener('click',()=>{onTry();close();},{once:true});
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();onCancel();},{once:true});
 dialog.append(style,title,button);doc.body.append(dialog);dialog.showModal();
}
