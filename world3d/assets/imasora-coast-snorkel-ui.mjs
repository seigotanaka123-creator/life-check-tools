import {SNORKEL_NET,snorkelCatchNotice,snorkelNetAim,snorkelHandMotion} from './imasora-coast-snorkel-net.mjs?v=120ob';
import * as T from './three.module.min.js';
import {createHeldDashButton} from './imasora-hold-dash.mjs?v=120od';
import {SNORKEL,REEF_FISH,snorkelInside,snorkelEntryNear,createSnorkelSimulation} from './imasora-coast-snorkeling.mjs?v=120ob';
import {createSnorkelView} from './imasora-coast-snorkel-view.mjs?v=120ob';
import {coastWave} from './imasora-coast-waves.mjs?v=120mx';
import {coastCanWade} from './imasora-coast-layout.mjs?v=120mx';
import {createCoastGroundCamera} from './imasora-coast-camera-ground.mjs?v=120mx';
import {createFirstPersonLens} from './imasora-world-camera-distance.mjs?v=120np';
export function createSnorkelController({host,state,saved,context,input,getScene,getCharacter,clearInput,persist,clear,animateWalk=()=>{}}){
 const sim=createSnorkelSimulation(saved),s=sim.record,view=createSnorkelView(),buttons=document.createElement('div'),start=document.createElement('button'),dive=document.createElement('button'),net=document.createElement('button'),rise=document.createElement('button'),kick=document.createElement('button'),info=document.createElement('div'),note=document.createElement('p');let initialized=false,dirty=!!saved,paused=false,noticeUntil=-1,time=0,pose={},cameraReady=false,boundaryNotified=false,lastTool=null,strokeAim=null,disposed=false,swimBody=null,swimCharacter=null;
 buttons.className='coast-snorkel-actions';start.className='coast-snorkel-start';dive.className='coast-snorkel-dive';rise.className='coast-snorkel-rise';net.className='coast-snorkel-net';kick.className='coast-snorkel-kick';kick.textContent='はやく泳ぐ';kick.setAttribute('aria-label','はやく泳ぐ（押している間）');kick.setAttribute('aria-pressed','false');info.className='coast-snorkel-info';note.className='coast-snorkel-note';note.setAttribute('role','status');buttons.append(start,dive,net,rise,kick);host.append(buttons,info,note);buttons.hidden=info.hidden=note.hidden=true;
 const put=(el,key,value)=>{if(el[key]!==value)el[key]=value;};let equippedShown=null,modeShown=null;
 const say=text=>{if(disposed)return;note.textContent=text;noticeUntil=time+4;note.hidden=!eligible(context());};
 const save=()=>{dirty=true;void persist().catch(()=>say('魚の記録を確認しています。保存が終わるまで待ってね。'));};
 const eligible=c=>!disposed&&c.map==='coast'&&!c.blocked&&!c.riding&&!document.hidden;
 function sync(){state.position.set(s.position.x,s.position.y,s.position.z);state.groundY=s.position.y;state.jumpY=state.jumpVelocity=state.jumpCount=0;state.falling=false;state.supportSurfaceId=null;}
 const keys=new Set(),centerScratch=new T.Vector3(),canDive=()=>s.active&&!paused&&eligible(context())&&pose.swimming;let swimShape=null;
 const diveHold=createHeldDashButton({element:dive,enabled:canDive}),riseHold=createHeldDashButton({element:rise,enabled:canDive}),kickHold=createHeldDashButton({element:kick,enabled:canDive});
 function releaseDepth(){keys.clear();diveHold.cancel();riseHold.cancel();kickHold.cancel();}
 function restoreBody(){if(!swimCharacter)return;swimCharacter.userData.collisionFootprint=swimBody;delete swimCharacter.userData.snorkelNeutralBody;swimCharacter.rotation.set(0,state.heading,0);swimCharacter=null;swimBody=null;swimShape=null;}
 function leave(){eyeLens.restore();s.active=s.diving=false;s.edit++;sim.stop();releaseDepth();restoreBody();clearInput();cameraReady=false;save();}
 start.onclick=()=>{const c=context();if(!eligible(c))return;if(s.active){if(!pose.swimming&&coastCanWade(state.position.x,state.position.z))leave();return;}if(!c.grounded||!snorkelEntryNear(state.position))return;s.active=true;s.diving=false;s.position={x:state.position.x,y:state.groundY,z:state.position.z};s.edit++;clearInput();sim.stop();dirty=true;say('海へ泳いで、魚に近づこう。');save();};
 dive.title='Fを押している間：潜る';rise.title='Rを押している間：浮上';net.title='E：網ですくう';kick.title='押している間：バタ足ではやく泳ぐ（PCはSpace／K）';
 function catchFish(){if(!s.active||paused||!eligible(context()))return;const fish=lastTool&&sim.previewNet(lastTool.grip,state.heading);if(sim.startCatch())strokeAim=fish?snorkelNetAim(lastTool.grip,state.heading,fish):null;}
 net.onclick=catchFish;
 const key=e=>{if(e.repeat||e.isComposing||e.ctrlKey||e.metaKey||e.altKey||!s.active||paused||/input|textarea|select/i.test(e.target?.tagName)||e.target?.isContentEditable)return;if(['KeyE','KeyF','KeyR'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();if(e.code==='KeyE')catchFish();else keys.add(e.code);}};
 const keyUp=e=>keys.delete(e.code);window.addEventListener('keydown',key,true);window.addEventListener('keyup',keyUp,true);window.addEventListener('blur',releaseDepth);window.addEventListener('pagehide',releaseDepth);
 function update(dt){if(disposed)return;const c=context();paused=!eligible(c);time+=paused?0:Math.min(.05,Math.max(0,dt));
  if(!initialized){if(!c.ready)return;initialized=true;if(s.active&&c.map==='coast'&&snorkelInside(state.position.x,state.position.z)){sync();clearInput();}else if(s.active){s.active=false;s.diving=false;s.edit++;dirty=true;}}
  if(s.active&&(c.map!=='coast'||!snorkelInside(state.position.x,state.position.z,0))){s.active=s.diving=false;sim.stop();releaseDepth();restoreBody();cameraReady=false;s.edit++;dirty=true;}
  if(!s.active)eyeLens.restore();
  if(view.root.parent!==getScene())getScene()?.add(view.root);
  if(s.active&&!paused){const v=input(),vertical=Number(diveHold.active||keys.has('KeyF'))-Number(riseHold.active||keys.has('KeyR'));pose=sim.step(dt,{...v,fast:!!v.fast||kickHold.active,vertical,bodyRadius:swimShape?swimShape.r+4:45,time:c.waveTime,clear});if(state.cameraMode==='first')state.heading=state.viewHeading;else if(Math.hypot(v.x,v.z)>.08)state.heading=Math.atan2(v.x,v.z);sync();state.moving=pose.speed>2;if(Math.hypot(v.x,v.z)<=.08)state.fastWalking=false;if(pose.surfaced)say('息つぎの時間だよ。自動で水面へ上がるよ。');if(snorkelInside(s.position.x,s.position.z,24))boundaryNotified=false;if(pose.boundary&&!boundaryNotified&&Math.hypot(v.x,v.z)>.08){say('浮きが泳げる範囲の目印だよ。');boundaryNotified=true;}}
  else if(paused){sim.stop();releaseDepth();if(s.active)state.moving=state.fastWalking=false;}
  // Equipment must not turn a walking monster into a sliding, frozen pose.
  // Advance the shared gait once, before attaching the net to the real hand.
  // characterPose is also called by the main frame; it must not advance time.
  if(s.active&&!pose.swimming)animateWalk(paused?0:Math.min(.05,Math.max(0,dt)),!paused&&state.moving,Math.max(.15,(pose.speed??0)/46));
  characterPose();
  const near=c.map==='coast'&&Math.hypot(state.position.x-SNORKEL.x,state.position.z-SNORKEL.z)<1500;
  const tool=view.update({visible:near,fish:s.active?sim.visibleFish():[],active:s.active,character:getCharacter(),time:s.clock,waveTime:c.waveTime,swing:sim.swing,aim:strokeAim,swimming:pose.swimming,firstPerson:state.cameraMode==='first'});
  lastTool=tool;const hit=!paused&&s.active?sim.sweepNet(tool):null;if(hit){say(snorkelCatchNotice(hit));save();}
  view.highlight(null,getCharacter());
  const shown=s.active&&c.map==='coast';if(modeShown!==shown){document.body.classList.toggle('coast-snorkel-mode',shown);modeShown=shown;}
  // The same hand-held net works on the beach and in shallow water. Waves
  // may change whether diving is possible, but must not remove its button.
  if(equippedShown!==s.active){buttons.classList.toggle('is-equipped',s.active);equippedShown=s.active;}
  put(buttons,'hidden',paused||!s.active&&(!c.grounded||!snorkelEntryNear(state.position)));put(start,'hidden',s.active&&(pose.swimming||!coastCanWade(state.position.x,state.position.z)));put(start,'textContent',s.active?'道具をはずす':'シュノーケリング');for(const el of[dive,rise,net,kick])put(el,'hidden',!s.active);diveHold.sync();riseHold.sync();kickHold.sync();put(net,'disabled',sim.swing>0);put(dive,'textContent','▼ 潜る');put(rise,'textContent','▲ 浮上');put(net,'textContent',sim.swing>0?'すくっている…':'網ですくう');
  const total=s.catches.reduce((n,r)=>n+r.count,0),kinds=s.catches.filter(r=>r.count).length,content='🐟 '+total+' 匹 · '+kinds+'/4種'+(s.active&&pose.swimming?'\n深さ '+((pose.depth??0)/20).toFixed(1)+'m　息 '+Math.ceil(s.air)+'秒':'')+(s.active?'':'\n'+s.catches.filter(r=>r.count).map(r=>REEF_FISH.find(f=>f.id===r.id).name+' '+r.count+'匹 · 最大'+r.best+'cm').join('\n'));if(info.textContent!==content)info.textContent=content;put(info,'hidden',paused||!(s.active||near&&total>0&&snorkelEntryNear(state.position)));put(note,'hidden',paused||time>noticeUntil);
 }
 function characterPose(){if(disposed||!s.active)return false;const ch=getCharacter();if(!ch)return false;const offset=ch.userData.grounding?.verticalOffset??0;
  function poseHand(h,n,kick=0){const m=snorkelHandMotion(n,{swimming:!!pose.swimming,kick,remaining:sim.swing});h.part.position.copy(h.basePosition);h.part.rotation.copy(h.baseRotation);h.part.position.x+=m.x/ch.scale.x;h.part.position.y+=m.y/ch.scale.y;h.part.position.z+=m.z/ch.scale.z;h.part.rotation.x+=m.rx;}
  function strokeHand(){const h=ch.userData.walkRig?.hands?.[1];if(h&&sim.swing>0)poseHand(h,1);}
  if(!pose.swimming){restoreBody();ch.position.set(s.position.x,s.position.y+offset,s.position.z);ch.rotation.set(0,state.heading,0);strokeHand();return true;}
  if(swimCharacter!==ch){restoreBody();swimCharacter=ch;swimBody=ch.userData.collisionFootprint;ch.userData.snorkelNeutralBody=swimBody;}
  // Rotate around the body's centre, not its feet. A conservative sphere
  // encloses the complete authored body and animated limbs at every angle.
  // Reuse that envelope for actual world contact, including vertical sweeps.
  if(!swimShape){const b=swimBody??{halfX:14,halfZ:14,minY:0,maxY:42},r=Math.hypot(Math.abs(b.offsetX??0)+b.halfX,(b.maxY-b.minY)/2,Math.abs(b.offsetZ??0)+b.halfZ)+12;swimShape={cy:(b.minY+b.maxY)/2,r,body:{offsetX:0,offsetZ:0,halfX:r,halfZ:r,minY:0,maxY:r*2}};}
  const {cy,r}=swimShape;ch.userData.collisionFootprint=swimShape.body;
  if(paused)return true;
  const moving=pose.speed>4,under=(pose.depth??0)>18,pitch=(under?1.4:moving?1.05:.45)-Math.max(-.5,Math.min(.5,(pose.verticalSpeed??0)*.009)),kick=s.clock*(moving?(pose.kicking?12:8):4.2),roll=Math.sin(kick*.5)*.065;
  ch.rotation.set(pitch,state.heading,roll,'YXZ');const center=centerScratch.set(0,cy-offset,0).applyEuler(ch.rotation);ch.position.set(s.position.x-center.x,s.position.y+r-center.y,s.position.z-center.z);
  const rig=ch.userData.walkRig;
  for(const [n,h]of (rig?.hands??[]).entries())poseHand(h,n,kick);
  for(const [n,f]of (rig?.feet??[]).entries()){f.part.position.copy(f.basePosition);f.part.rotation.copy(f.baseRotation);const k=Math.sin(kick+n*Math.PI);f.part.position.z+=k*(moving?(pose.kicking?9:6):3)/ch.scale.y;f.part.rotation.x+=k*(pose.kicking?.7:.5);}
  return true;
 }
 const eyeLens=createFirstPersonLens(),eye=new T.Vector3(),target=new T.Vector3(),feetSight=new T.Vector3(),resolveCamera=createCoastGroundCamera({heightAt:(x,z)=>clear.cameraFloor?.(x,z)??-200});
 function cameraFrame(camera){if(disposed||!s.active){eyeLens.restore();return false;}eyeLens.apply(camera,state.cameraMode==='first');const p=s.position,c=context(),water=coastWave(p.x,p.z,c.waveTime).height,under=p.y+(swimShape?.r??28)<water-45,h=state.viewHeading,pitch=Math.max(-.5,Math.min(.5,state.viewPitch)),back=state.cameraMode==='first'?36:(camera.aspect<1?130:100)*(1+(state.cameraDistanceIndex??1)*.12);
  if(state.cameraMode==='first'){const face=lastTool?.face;// Pull the lens slightly behind the eyes while the swimmer's own head is
   // already hidden. The actual hand/net and catch reach do not move.
   eye.set((face?.x??p.x)-Math.sin(h)*10,face?.y??p.y+25,(face?.z??p.z)-Math.cos(h)*10);eye.y=Math.max(eye.y,(clear.cameraFloor?.(eye.x,eye.z)??-200)+8);target.set(p.x,p.y+(swimShape?.r??32),p.z);camera.position.copy(resolveCamera(target,eye,{near:camera.near,fov:camera.fov,aspect:camera.aspect}));eye.copy(camera.position);camera.lookAt(eye.x+Math.sin(h)*90,eye.y+pitch*90,eye.z+Math.cos(h)*90);return true;}
  target.set(p.x,p.y+23,p.z);
  // Keep the viewing distance even beside a steep seabed. Raise the orbit,
  // including above the surface if necessary, rather than entering the head.
  eye.set(p.x-Math.sin(h)*back,p.y+35-pitch*back,p.z-Math.cos(h)*back);
  if(pose.swimming){
   // Frame the swimmer's real centre from above the right shoulder, where
   // the physical net stays visible. Never move or enlarge the actual tool.
   const cy=p.y+(swimShape?.r??32),side=back*.4;target.set(p.x,cy,p.z);
   eye.set(p.x-Math.sin(h)*back+Math.cos(h)*side,cy+52-pitch*back,p.z-Math.cos(h)*back-Math.sin(h)*side);
  }
  if(under)eye.y=Math.min(eye.y,water-7);else eye.y=Math.max(eye.y,water+14);
  feetSight.set(p.x,p.y+(swimShape?.r??23),p.z);
  camera.position.copy(resolveCamera(feetSight,eye,{near:camera.near,fov:camera.fov,aspect:camera.aspect}));cameraReady=true;camera.lookAt(target.x,target.y+pitch*35,target.z);return true;
 }
 return{update,characterPose,cameraFrame,get active(){return !disposed&&s.active&&state.map==='coast';},get swimming(){return !disposed&&s.active&&pose.swimming;},surface(){if(!s.active||paused||!eligible(context()))return false;sim.surface();releaseDepth();dirty=true;return true;},snapshot:()=>dirty?sim.snapshot():undefined,get autoSaveKey(){return s.edit+':'+Math.floor(s.clock/5);},dispose(){if(disposed)return;disposed=true;eyeLens.restore();releaseDepth();restoreBody();diveHold.dispose();riseHold.dispose();kickHold.dispose();window.removeEventListener('keydown',key,true);window.removeEventListener('keyup',keyUp,true);window.removeEventListener('blur',releaseDepth);window.removeEventListener('pagehide',releaseDepth);document.body.classList.toggle('coast-snorkel-mode',false);buttons.remove();info.remove();note.remove();view.dispose();}};
}
