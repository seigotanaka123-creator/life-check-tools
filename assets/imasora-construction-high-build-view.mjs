import * as T from './three.module.min.js';
import {officialCharacter} from './imasora-construction-layout.js?v=120ds';
import {createConstructionWalkGait} from './imasora-construction-walk-gait.mjs';
import {HIGH,newHighBuild,highBuildingParts,highPlatform,highNextAction,beginHighJob,advanceHighJob,finishHighJob,highJobReady,highJobPlan,highRouteSeconds,highActorAt,highAssemblyAt,undoHighBuild,packHighBuild,unpackHighBuild} from './imasora-construction-high-build.mjs?v=120gn';
const q=id=>document.getElementById(id),key='imasora-high-build-prototype-120fc';
let state,paused=false,failed='',saveClock=0,lastWrite='',notice='';
try{const raw=localStorage.getItem(key);state=raw===null?newHighBuild():unpackHighBuild(raw);lastWrite=raw??'';}catch(e){failed=e.message;state=null;}
const scene=new T.Scene();scene.background=new T.Color('#eaf6fb');
const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;
q('scene').append(renderer.domElement);scene.add(new T.HemisphereLight(0xffffff,0x80928a,2.0));
const sun=new T.DirectionalLight(0xffffff,2.6);sun.position.set(-130,220,150);scene.add(sun);
const camera=new T.OrthographicCamera(-230,230,210,-210,.1,2200);
let yaw=-.65,pitch=.42,drag=null;const focus=new T.Vector3(32,58,0);
const unit=new T.BoxGeometry(1,1,1),cylinder=new T.CylinderGeometry(1,1,1,8);
const material=color=>new T.MeshStandardMaterial({color,roughness:.8});
const mats={wood:material('#c99a61'),beam:material('#b77b45'),floor:material('#e2be84'),steel:material('#839ca8'),deck:material('#c6d8de'),lift:material('#efbd44'),green:material('#6cba97'),tool:material('#eeaf3f')};
const ghostMat=new T.MeshBasicMaterial({color:'#e6b933',wireframe:true,transparent:true,opacity:.48,depthWrite:false});
function box(parent,p,mat){const m=new T.Mesh(unit,mat);m.position.set(p.x,p.y,p.z);m.scale.set(p.w,p.h,p.d);parent.add(m);return m;}
function line(parent,a,b,r,mat){const m=new T.Mesh(cylinder,mat),d=new T.Vector3(b.x-a.x,b.y-a.y,b.z-a.z);m.position.set((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);m.scale.set(r,d.length(),r);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());parent.add(m);return m;}
const ground=box(scene,{x:25,y:-1,z:0,w:390,h:2,d:300},material('#9dbb89'));
const site=new T.Group();site.name='high-build-persistent-platform';scene.add(site);
const platform=highPlatform();
function instances(items,mat,name){const m=new T.InstancedMesh(unit,mat,items.length),o=new T.Object3D();items.forEach((p,i)=>{o.position.set(p.x,p.y,p.z);o.scale.set(p.w,p.h,p.d);o.updateMatrix();m.setMatrixAt(i,o.matrix);});m.name=name;site.add(m);return m;}
instances(platform.decks.filter(p=>p.y).map(p=>({...p,y:p.y-1,h:2})),mats.deck,'same-working-decks');
instances(platform.stairs.map(p=>({...p,y:p.y-1.25,h:2.5})),mats.deck,'same-stairs');
instances(platform.posts.map(p=>({...p,y:60,w:2,h:126,d:2})),mats.steel,'same-support-posts');
const rails=[];for(const y of[40,80,120])for(const x of[-70,70])rails.push({x,y:y+10,z:0,w:1.2,h:1.2,d:140});
instances(rails,mats.steel,'outer-guardrails');
const lift=new T.Group();lift.position.set(-91,0,56);scene.add(lift);
box(lift,{x:0,y:-1,z:0,w:38,h:2,d:36},mats.lift);
for(const x of[-110,-72])box(scene,{x,y:65,z:72,w:2,h:134,d:2},mats.steel);
const cable=line(scene,{x:-91,y:130,z:72},{x:-91,y:0,z:72},.5,mats.steel);
const packageGroup=new T.Group();scene.add(packageGroup);
for(let i=0;i<4;i++)box(packageGroup,{x:(i%2?8:-8),y:2+Math.floor(i/2)*3,z:0,w:28,h:3,d:10},mats.wood);
const bench=new T.Group();scene.add(bench);box(bench,{x:-94,y:6,z:85,w:40,h:3,d:25},mats.wood);
for(const x of[-110,-78])for(const z of[78,92])box(bench,{x,y:2.5,z,w:3,h:5,d:3},mats.steel);
const building=new T.Group();building.name='high-build-actual-building';scene.add(building);
const levels=Array.from({length:3},(_,i)=>{const group=new T.Group();building.add(group);return highBuildingParts(i+1).map(p=>({p,mesh:box(group,p,mats[p.kind==='column'?'wood':p.kind==='beam'?'beam':'floor'])}));});
const bridge=box(scene,{x:39,y:119,z:0,w:14,h:2,d:32},mats.deck);
const preview=new T.Group();scene.add(preview);
const previewParts=Array.from({length:3},(_,i)=>highBuildingParts(i+1).map(p=>box(preview,p,ghostMat))).flat();
const model=officialCharacter(),actor=new T.Group();actor.name='official-builder';scene.add(actor);actor.add(model);model.updateMatrixWorld(true);
const footBottom=Math.min(...model.userData.feet.map(f=>new T.Box3().setFromObject(f).min.y));model.position.y=-footBottom;
const feet=model.userData.feet.map(o=>({o,y:o.position.y})),gait=createConstructionWalkGait();
const tool=new T.Group();scene.add(tool);const rod=line(tool,{x:0,y:0,z:0},{x:0,y:1,z:0},.55,mats.tool);
const jaw=box(tool,{x:0,y:0,z:0,w:7,h:2,d:4},mats.steel);
function targetLabel(text){const c=document.createElement('canvas');c.width=384;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#fff5c9';ctx.beginPath();ctx.roundRect(2,2,380,92,32);ctx.fill();ctx.fillStyle='#5b4c22';ctx.font='bold 29px sans-serif';ctx.textAlign='center';ctx.fillText(text,192,59);const tex=new T.CanvasTexture(c),m=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:true,transparent:true}));m.scale.set(69,17,1);scene.add(m);return m;}
const target=targetLabel('ここにつないでいくよ');
function save(){if(!state||failed)return false;try{const raw=packHighBuild(state),current=localStorage.getItem(key)??'';if(current!==lastWrite&&current!==raw)throw Error('another-tab');if(raw!==lastWrite){localStorage.setItem(key,raw);lastWrite=raw;}q('saved').textContent='自動セーブ済み · この試作の作業だけを記録しています';return true;}catch(e){failed=e.message==='another-tab'?'別のタブで作業が進んだよ。このタブを開き直してね。':'セーブできなかったので止めたよ。記録は消していません。';paused=true;return false;}}
function refresh(){
 if(!state||failed){q('message').textContent=failed;q('primary').disabled=true;q('undo').disabled=true;q('pause').hidden=true;return;}
 const next=highNextAction(state),names={MAKE:'部材をつくる',LIFT:state.levels?'リフトで上げる':'リフトにのせる',BUILD:(state.levels+1)+'階を組み立てる',VISIT:'見晴らし台へ登る',RETURN:'地上へもどる'};
 q('primary').textContent=names[next];q('primary').disabled=!!state.job;
 q('undo').textContent='↶ 1つ前にもどす'+(state.history.length?' ('+state.history.length+')':'');q('undo').disabled=!!state.job||!state.history.length||state.actor.y===120&&Math.abs(state.actor.x)<42;
 q('pause').hidden=!state.job;q('pause').textContent=paused?'つづける':'ひと休み';
 q('stock').textContent='木材 '+state.stock.timber+' ／ 床板 '+state.stock.panels;
 [...q('progress').children].forEach((el,i)=>el.classList.toggle('done',state.levels>i));
 if(state.job){const plan=highJobPlan(state,state.job.type),walk=highRouteSeconds(plan.route);q('message').textContent=paused?'ひと休み中。途中からつづけられるよ。':state.job.elapsed<walk?'モンスターが階段・作業台を歩いているよ':plan.label+'…';q('bar').style.width=state.job.elapsed/(walk+plan.work)*100+'%';}
 else{q('message').textContent=notice||({MAKE:'① 地上で柱・梁・床をつくろう。',LIFT:'② できた部材をリフトで運ぼう。',BUILD:'③ 同じ階段を登って、部材をつなごう。',VISIT:'3階までできた！上から現場を見てみよう。',RETURN:'完成！作業塔を残したまま、地上へもどれるよ。'})[next];q('bar').style.width='0%';}
}
q('primary').onclick=()=>{if(!state||state.job||failed)return;try{state=beginHighJob(state);notice='';paused=false;if(save())refresh();else refresh();}catch(e){notice=e.message;refresh();}};
q('undo').onclick=()=>{try{state=undoHighBuild(state);notice='ひとつ前の作業にもどしたよ。材料も戻ったよ。';save();refresh();}catch(e){notice=e.message;refresh();}};
q('pause').onclick=()=>{paused=!paused;save();refresh();};
q('help').onclick=()=>{paused=true;save();q('guide').showModal();refresh();};
q('close').onclick=()=>q('guide').close();
q('guide').addEventListener('close',()=>{paused=false;refresh();});
function update(dt){
 if(!state)return;let done=state.levels*12,current=null,pending=null;
 if(state.job?.type==='BUILD'){const plan=highJobPlan(state,'BUILD'),workTime=state.job.elapsed-highRouteSeconds(plan.route);
  if(workTime>=0){current=highAssemblyAt(state.levels+1,workTime);done+=current.completed;if(!current.moving&&current.completed<12)pending={index:done,progress:current.progress,part:current.part};}
 }
 for(let f=0;f<3;f++)for(let i=0;i<12;i++){const v=levels[f][i],index=f*12+i;v.mesh.visible=index<done||index===pending?.index;
  v.mesh.position.set(v.p.x,v.p.y,v.p.z);if(index===pending?.index){const t=pending.progress;v.mesh.position.lerpVectors(new T.Vector3(-91,state.levels*40+6,56),new T.Vector3(v.p.x,v.p.y,v.p.z),t);v.mesh.position.y+=Math.sin(t*Math.PI)*10;}
 }
 previewParts.forEach((m,i)=>{m.visible=i>=done&&i<(state.levels+1)*12&&state.levels<3;});bridge.visible=state.levels===3;
 const pos=highActorAt(state);actor.position.set(pos.x,pos.y,pos.z);actor.rotation.y=pos.heading;
 const moving=!!state.job&&!paused&&(state.job.elapsed<highRouteSeconds(highJobPlan(state,state.job.type).route)||current?.moving);
 const values=gait.update(pos,moving,dt);feet.forEach((f,i)=>f.o.position.y=f.y+values[i]);
 const making=state.job?.type==='MAKE'&&state.job.elapsed>=highRouteSeconds(highJobPlan(state,'MAKE').route);
 tool.visible=(!!pending||making)&&!paused;
 if(tool.visible){const p=pending?levels[Math.floor(pending.index/12)][pending.index%12].mesh.position:new T.Vector3(-94,10+Math.abs(Math.sin(state.job.elapsed*12))*5,85),a=new T.Vector3(pos.x,pos.y+18,pos.z),b=p.clone(),delta=b.clone().sub(a);
  rod.position.copy(a).add(b).multiplyScalar(.5);rod.scale.set(.55,delta.length(),.55);rod.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());jaw.position.copy(b);}
 const base=state.levels*40;
 let liftY=state.kit==='raised'?base:0,loading=0;
 if(state.job?.type==='LIFT'){const p=highJobPlan(state,'LIFT'),t=Math.max(0,state.job.elapsed-highRouteSeconds(p.route));loading=Math.min(1,t/.7);liftY=base*Math.max(0,Math.min(1,(t-.7)/(p.work-.7)));}
 lift.position.y=liftY;packageGroup.visible=!!state.kit||making;packageGroup.scale.setScalar(state.job?.type==='BUILD'?Math.max(.1,1-(done-state.levels*12)/12):1);
 packageGroup.position.set(-91,liftY,56);
 if(state.kit==='made'||making)packageGroup.position.lerpVectors(new T.Vector3(-94,8,85),new T.Vector3(-91,liftY,56),loading);
 cable.position.y=(130+liftY)/2;cable.scale.y=130-liftY;
 target.visible=state.levels<3;target.position.set(0,(state.levels+1)*40+18,0);
}
function resize(){const r=q('scene').getBoundingClientRect(),aspect=r.width/r.height,extent=aspect<.75?290:210;camera.left=-extent*aspect;camera.right=extent*aspect;camera.top=extent;camera.bottom=-extent;camera.updateProjectionMatrix();renderer.setSize(r.width,r.height,false);positionCamera();}
function positionCamera(){camera.position.copy(focus).add(new T.Vector3(Math.sin(yaw)*480*Math.cos(pitch),480*Math.sin(pitch),Math.cos(yaw)*480*Math.cos(pitch)));camera.lookAt(focus);}
q('front').onclick=()=>{yaw=0;pitch=.32;positionCamera();};q('side').onclick=()=>{yaw=-Math.PI/2;pitch=.35;positionCamera();};q('top').onclick=()=>{yaw=-.65;pitch=1.0;positionCamera();};
const canvas=renderer.domElement;
canvas.addEventListener('pointerdown',e=>{if(e.button!==0||drag)return;e.preventDefault();drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;if(e.pointerType==='mouse'&&!(e.buttons&1)){drag=null;return;}yaw-=(e.clientX-drag.x)*.008;pitch=Math.max(.12,Math.min(1.25,pitch+(e.clientY-drag.y)*.006));drag.x=e.clientX;drag.y=e.clientY;positionCamera();});
for(const event of['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>drag=null);
for(const event of['contextmenu','selectstart','gesturestart','gesturechange'])document.addEventListener(event,e=>e.preventDefault(),{passive:false});
function stop(){drag=null;paused=true;save();refresh();}
window.addEventListener('blur',stop);window.addEventListener('pagehide',stop);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
new ResizeObserver(resize).observe(q('scene'));resize();
let then=performance.now(),ui=0;
function frame(now){const dt=Math.max(0,Math.min(.05,(now-then)/1000));then=now;
 if(!document.hidden&&state&&!failed&&state.job&&!paused){state=advanceHighJob(state,dt);saveClock+=dt;
  if(highJobReady(state)){state=finishHighJob(state);save();refresh();}else if(saveClock>=1){saveClock=0;save();}
 }
 update(dt);ui+=dt;if(ui>.15){ui=0;refresh();}if(!document.hidden)renderer.render(scene,camera);requestAnimationFrame(frame);
}
refresh();update(0);requestAnimationFrame(frame);
