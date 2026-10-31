import * as T from '../three.module.min.js';
import {pumpTargets,pumpDirectStep,stowPumpForDriving,pumpTargetVisible,pumpTargetViews} from './pump-direct-plan.mjs?v=120pv';

export function createPumpDirectPlay({panel,canvas,camera,scene,project,high,visible,uncovered=()=>true,ready,run,selectCell,focusHigh,clearInput,onMode,notice,refresh:refreshHost}){
 const root=document.createElement('section');root.className='pump-direct-ui';root.hidden=true;root.setAttribute('aria-label','ポンプ車の直接操作');
 root.innerHTML='<button class="pump-direct-mode" type="button"></button><button class="pump-direct-look" type="button" hidden>型枠を見る</button><div class="pump-direct-panel"><p role="status"></p><button class="pump-direct-action" type="button"></button></div>';
 panel.append(root);const mode=root.querySelector('.pump-direct-mode'),look=root.querySelector('.pump-direct-look'),body=root.querySelector('.pump-direct-panel'),note=root.querySelector('p'),button=root.querySelector('.pump-direct-action');let lookIndex=0;
 const geo=new T.BoxGeometry(1,1,1),mat=new T.MeshBasicMaterial({color:0xffcf50,transparent:true,opacity:.32,depthWrite:false}),edgeGeo=new T.EdgesGeometry(geo),edgeMat=new T.LineBasicMaterial({color:0xe0a424});
 const marker=new T.Mesh(geo,mat),edge=new T.LineSegments(edgeGeo,edgeMat);marker.name='pump-direct-selected-form';marker.add(edge);scene.add(marker);marker.visible=false;
 let working=true,previousAboard=false,pending=false,stowing=false,selected=null,selectedPoint=null,targets=[],priorProject=null,priorHigh=null,gesture=null;const pointers=new Set(),raycaster=new T.Raycaster(),point=new T.Vector3(),hit=new T.Vector3(),box=new T.Box3();
 const free=()=>project()?.freeBuild,can=()=>visible()&&uncovered()&&ready()&&!pending;
 function updateTargets(){const p=project(),h=high();if(p!==priorProject||h!==priorHigh){priorProject=p;priorHigh=h;targets=pumpTargets(p,h);}}
 function showForms(){updateTargets();if(!targets.some(t=>t.kind==='ground')){const t=targets.find(t=>t.kind==='upper');if(t)focusHigh(t.anchor,false);}}
 function target(){return targets.find(t=>t.key===selected&&t.x===selectedPoint?.x&&t.z===selectedPoint?.z)??targets.find(t=>t.key===selected)??null;}
 function resetGesture(){gesture=null;}
 function paintMarker(){const t=target();marker.visible=visible()&&uncovered()&&working&&!!t&&pumpTargetVisible(t,scene.userData.upperInspection);if(!marker.visible)return;marker.position.set(t.x,t.y+.1,t.z);marker.scale.set(t.w,.22,t.d);}
 function refresh(){
  const show=visible(),f=free();if(show&&!previousAboard){working=!!(f.pump.legs||f.connected||f.hose||f.highPipe);selected=f.highPipe?'upper:'+f.highPipe.castingId:null;onMode(working);if(working)showForms();}previousAboard=show;
  root.hidden=!show||!uncovered();panel.dataset.pumpDirect=String(show&&working);panel.dataset.pumpQuiet=String(panel.querySelector('[data-note]')?.textContent.trim()==='保存しました。');body.hidden=!working;
  if(!show){marker.visible=false;resetGesture();return;}
  updateTargets();if(selected&&!target())selected=null;
  look.hidden=!working||pumpTargetViews(targets).length<2;look.disabled=!can()||free().highCastings?.some(c=>c.pending)===true;
  const s=pumpDirectStep(f,target());mode.textContent=pending?(stowing?'片付け中…':'作業中…'):working?'🚚 運転へ':'🏗 作業へ';mode.disabled=!ready()||pending;
  button.textContent=s.label;button.disabled=!can()||!s.type||!!s.reason;
  const label=target()?.label,full=target()?Math.round(target().fill/target().capacity*100)+'％':'';
  note.textContent=s.reason||(s.type==='FREE_HIGH_FLOW_CANCEL'?'生コンを送っているよ':label?label+' · '+full:'型枠をタップして、注ぎ先をえらぼう');
  if(!can())resetGesture();paintMarker();
 }
 async function act(){if(!can()||!working)return;updateTargets();const s=pumpDirectStep(free(),target());if(!s.type||s.reason)return;resetGesture();clearInput();pending=true;refresh();try{await run(s.type,s.extra,s.animate);}finally{pending=false;refreshHost();}}
 button.onclick=act;
 look.onclick=()=>{if(!can())return;updateTargets();const choices=pumpTargetViews(targets);if(!choices.length)return;clearInput();resetGesture();lookIndex=(lookIndex+1)%choices.length;const t=choices[lookIndex];selected=null;focusHigh(t.kind==='upper'?t.anchor:null,false);refreshHost();};
 mode.onclick=async()=>{
  if(!can())return;clearInput();resetGesture();
  if(!working){working=true;onMode(true);showForms();refreshHost();return;}
  pending=true;stowing=true;refresh();try{if(await stowPumpForDriving({read:free,ready:()=>visible()&&uncovered()&&ready(),run})){working=false;selected=null;focusHigh(null);onMode(false);}}
  finally{pending=false;stowing=false;refreshHost();}
 };
 // Raycast only on a deliberate tap. Screen drag remains camera look; two
 // fingers, cancellation, busy transitions and stale revisions cancel a tap.
 function surfaceHit(t,ray){box.min.set(t.x-t.w/2,t.y-.35,t.z-t.d/2);box.max.set(t.x+t.w/2,t.y+.15,t.z+t.d/2);return ray.intersectBox(box,hit)?hit.clone():null;}
 function unobstructed(t,p){
  const origin=raycaster.ray.origin,delta=p.clone().sub(origin),length=delta.length();if(length<.01)return true;
  const r=new T.Raycaster(origin,delta.normalize(),0,Math.max(0,length-.7)),objects=[];
  scene.traverseVisible(o=>{if(o.isMesh&&o!==marker&&o.geometry&&(!o.material?.transparent||o.material.opacity>.7))objects.push(o);});
  const first=r.intersectObjects(objects,false)[0];return !first;
 }
 function pick(x,y){
  updateTargets();const rect=canvas.getBoundingClientRect();camera.updateMatrixWorld(true);raycaster.setFromCamera({x:(x-rect.left)/rect.width*2-1,y:1-(y-rect.top)/rect.height*2},camera);
  const candidates=[];
  for(const t of targets){if(!pumpTargetVisible(t,scene.userData.upperInspection))continue;const p=surfaceHit(t,raycaster.ray);if(p)candidates.push({t,p,score:0,d:p.distanceTo(raycaster.ray.origin)});else{point.set(t.x,t.y,t.z).project(camera);if(point.z< -1||point.z>1)continue;const dx=rect.left+(point.x+1)*rect.width/2-x,dy=rect.top+(1-point.y)*rect.height/2-y,score=Math.hypot(dx,dy);if(score<=22)candidates.push({t,p:new T.Vector3(t.x,t.y,t.z),score,d:new T.Vector3(t.x,t.y,t.z).distanceTo(raycaster.ray.origin)});}}
  candidates.sort((a,b)=>a.score-b.score||a.d-b.d);
  return candidates.find(q=>unobstructed(q.t,q.p))?.t??null;
 }
 canvas.addEventListener('pointerdown',e=>{pointers.add(e.pointerId);if(pointers.size!==1||e.button!==0||!can()||!working){resetGesture();return;}gesture={id:e.pointerId,x:e.clientX,y:e.clientY,revision:project().revision};},true);
 canvas.addEventListener('pointermove',e=>{if(gesture?.id===e.pointerId&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>9)resetGesture();},true);
 canvas.addEventListener('pointerup',e=>{
  const g=gesture;pointers.delete(e.pointerId);resetGesture();if(!g||g.id!==e.pointerId||pointers.size||!can()||!working||g.revision!==project().revision||Math.hypot(e.clientX-g.x,e.clientY-g.y)>9)return;
  if(free().highCastings?.some(c=>c.pending))return;
  const t=pick(e.clientX,e.clientY);if(!t){notice('見えている型枠をタップしよう');return;}
  selected=t.key;selectedPoint={x:t.x,z:t.z};lookIndex=Math.max(0,pumpTargetViews(targets).findIndex(q=>t.kind==='ground'?q.kind==='ground':q.key===t.key));clearInput();if(t.kind==='ground'){focusHigh(null);selectCell(t.cell);}else focusHigh(t.anchor);refreshHost();e.stopPropagation();
 },true);
 for(const name of ['pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>{pointers.delete(e.pointerId);resetGesture();},true);
 for(const name of ['pointerup','pointercancel'])window.addEventListener(name,e=>{if(e.target!==canvas){pointers.delete(e.pointerId);resetGesture();}},true);
 window.addEventListener('blur',()=>{pointers.clear();resetGesture();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){pointers.clear();resetGesture();}});
 return{refresh,tick(){if(!visible()||!uncovered())marker.visible=false;},get working(){return visible()&&working;},get pending(){return pending;}};
}
