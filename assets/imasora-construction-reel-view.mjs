import * as T from './three.module.min.js';
import {officialCharacter} from './imasora-construction-layout.js?v=120ob';
import {createConstructionGround} from './imasora-construction-ground.js?v=120ds';
import {createSkyMapAtmosphere} from './imasora-sky-map-atmosphere.mjs?v=120pc';
import {REEL_KEY,REEL,REEL_SIDES,newReel,readReel,reelDraft,commitReel,undoReel,reelParts,reelHandles,reelEstimate} from './imasora-construction-reel.mjs?v=120ps';

const q=s=>document.querySelector(s),canvas=q('#scene'),host=q('#viewport');
let state=newReel(),lastRaw=null,writeAllowed=true,storage=null;
try{storage=localStorage;lastRaw=storage.getItem(REEL_KEY);if(lastRaw!==null){const loaded=readReel(lastRaw);if(loaded)state=loaded;else writeAllowed=false;}}catch{writeAllowed=false;}
const scene=new T.Scene();scene.background=new T.Color('#d8edf5');scene.fog=new T.Fog('#d8edf5',850,1750);
const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});renderer.outputColorSpace=T.SRGBColorSpace;renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
const hemi=new T.HemisphereLight('#effbff','#a28b6b',2.4);scene.add(hemi);
const sun=new T.DirectionalLight('#fff4db',2.7);sun.position.set(-180,300,160);scene.add(sun);
const atmosphere=createSkyMapAtmosphere({cloudSea:false});scene.add(atmosphere.group);
scene.add(createConstructionGround({world:{width:1400,depth:1200,layoutWidth:600,layoutDepth:600},palette:{edge:'#b3c7b5'}}));
const camera=new T.OrthographicCamera(-300,300,240,-240,.1,2200),target=new T.Vector3(0,12,0);
let yaw=.6,pitch=.72,zoom=1,width=0,height=0;
const unit=new T.BoxGeometry(1,1,1),obj=new T.Object3D(),mat=color=>new T.MeshStandardMaterial({color,roughness:.74});
const floorMat=mat('#e6c792'),wallMat=mat('#f5dfb4'),jointMat=mat('#b99b67');
const floorMesh=new T.InstancedMesh(unit,floorMat,1024),wallMesh=new T.InstancedMesh(unit,wallMat,2048),jointMesh=new T.InstancedMesh(unit,jointMat,2048);
for(const mesh of[floorMesh,wallMesh,jointMesh]){mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(mesh);}
const preview=new T.Group();scene.add(preview);
const ghostMat=new T.MeshStandardMaterial({color:'#8de2ca',transparent:true,opacity:.48,roughness:.7,depthWrite:false}),badMat=ghostMat.clone();badMat.color.set('#e77770');
const ghosts=Array.from({length:5},()=>{const mesh=new T.Mesh(unit,ghostMat);preview.add(mesh);return mesh;});
const outline=new T.LineSegments(new T.EdgesGeometry(unit),new T.LineBasicMaterial({color:'#fff3ad'}));outline.visible=false;scene.add(outline);
const grid=new T.GridHelper(480,30,'#e5d5aa','#d0b780');grid.position.y=.08;grid.material.transparent=true;grid.material.opacity=.25;scene.add(grid);
// A few low details at the edge keep the building surface clear.
function box(parent,x,y,z,w,h,d,material){const mesh=new T.Mesh(unit,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;}
const edgeMat=mat('#8baf9b'),benchMat=mat('#deb574');
for(const z of[-330,330])box(scene,0,4,z,650,8,5,edgeMat);
for(const x of[-330,330])box(scene,x,4,0,5,8,650,edgeMat);
const bench=new T.Group();scene.add(bench);for(const x of[-202,-166])for(const z of[-170,-150])box(bench,x,8,z,3,16,3,benchMat);box(bench,-184,17,-160,46,3,28,benchMat);
for(let i=0;i<4;i++)box(bench,-184,20+i*2,-160,32,2,14,floorMat);
const model=officialCharacter(),actor=new T.Group();scene.add(actor);actor.add(model);model.updateMatrixWorld(true);
const sole=Math.min(...model.userData.feet.map(f=>new T.Box3().setFromObject(f).min.y));model.position.y=-sole;actor.position.set(-12,0,128);actor.rotation.y=Math.PI;
const hands=model.userData.hands,hand=hands[1]??hands[0],handPoint=new T.Vector3();
const reel=new T.Group();scene.add(reel);const spool=new T.Mesh(new T.CylinderGeometry(3.3,3.3,3,14),mat('#77c9c0'));spool.rotation.z=Math.PI/2;reel.add(spool);
for(const x of[-1.8,1.8]){const disc=new T.Mesh(new T.CylinderGeometry(4,4,.8,14),mat('#fff0b3'));disc.rotation.z=Math.PI/2;disc.position.x=x;reel.add(disc);}
const tapeGeometry=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),tape=new T.Line(tapeGeometry,new T.LineBasicMaterial({color:'#ffda71',transparent:true,opacity:.9}));scene.add(tape);tape.visible=false;

const buttons=new Map();let mode='floor',gesture=null,draft=null,currentAction=null,paintKey='',lastParts=[],notice='',noticeUntil=0;
const stats={gestures:0,commits:0,cancelled:0,undo:0,toolChoices:0,buildMs:0,maxPreviewMs:0,maxCommitMs:0};
const clock=()=>performance.now(),say=(text,error=false,ms=2800)=>{notice=text;noticeUntil=clock()+ms;q('#hint').textContent=text;q('#hint').dataset.error=String(error);};
const selected=()=>state.rooms.find(r=>r.id===state.selected);
function cameraPosition(){camera.position.set(target.x+Math.sin(yaw)*620*Math.cos(pitch),target.y+620*Math.sin(pitch),target.z+Math.cos(yaw)*620*Math.cos(pitch));camera.lookAt(target);camera.updateMatrixWorld();positionHandles();}
function resize(){cancelGesture();const r=host.getBoundingClientRect();width=r.width;height=r.height;const extent=(height>width?260:190)/zoom;camera.left=-extent*width/height;camera.right=extent*width/height;camera.top=extent;camera.bottom=-extent;camera.updateProjectionMatrix();renderer.setSize(width,height,false);cameraPosition();}
const raycaster=new T.Raycaster(),pointer=new T.Vector2(),flat=new T.Plane(new T.Vector3(0,1,0),-3);
function ray(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.ray;}
function pointOn(e,plane=flat){const p=new T.Vector3();return ray(e).intersectPlane(plane,p);}
function hitRoom(e){const p=pointOn(e);if(!p)return null;return state.rooms.find(r=>p.x>=r.x0&&p.x<=r.x1&&p.z>=r.z0&&p.z<=r.z1)??null;}
function instance(mesh,index,p){obj.position.set(p.x,p.y,p.z);obj.rotation.set(0,0,0);obj.scale.set(p.w,p.h,p.d);obj.updateMatrix();mesh.setMatrixAt(index,obj.matrix);}
function renderParts(){
 const shown=draft&&!draft.problem?draft.rooms:state.rooms,key=JSON.stringify([shown,draft?.room,draft?.problem,state.selected,mode]);if(key===paintKey)return;paintKey=key;
 const edited=draft?.room?.id,base=draft?.room?state.rooms.filter(r=>r.id!==edited):state.rooms;let floors=0,walls=0,joints=0;
 lastParts=reelParts(base);
 for(const p of lastParts){
  if(p.kind==='floor'){const n=Math.ceil(p.w/8),w=p.w/n;for(let i=0;i<n;i++)instance(floorMesh,floors++,{...p,x:p.x-p.w/2+w*(i+.5),w:w-.18});}
  else{const along=p.w>p.d,length=along?p.w:p.d,n=Math.ceil(length/16),span=length/n;for(let i=0;i<n;i++)instance(wallMesh,walls++,{...p,x:along?p.x-length/2+span*(i+.5):p.x,z:along?p.z:p.z-length/2+span*(i+.5),w:along?span-.15:p.w,d:along?p.d:span-.15});for(const y of[6,p.y+p.h/2-3])instance(jointMesh,joints++,{...p,y,h:1.1,w:along?p.w:3.3,d:along?3.3:p.d});}
 }
 for(const [mesh,count]of[[floorMesh,floors],[wallMesh,walls],[jointMesh,joints]]){mesh.count=count;mesh.instanceMatrix.needsUpdate=true;}
 const parts=draft?.room?reelParts([draft.room]):[];ghosts.forEach((mesh,i)=>{const p=parts[i];mesh.visible=!!p;if(p){mesh.material=draft.problem?badMat:ghostMat;mesh.position.set(p.x,p.y,p.z);mesh.scale.set(p.w,p.h,p.d);}});
 const room=draft?.room??selected();outline.visible=!!room;if(room){outline.position.set((room.x0+room.x1)/2,1.6,(room.z0+room.z1)/2);outline.scale.set(Math.max(.1,room.x1-room.x0)+.7,3.6,Math.max(.1,room.z1-room.z0)+.7);}
 if(!gesture){const at=selected();actor.position.set(at?(at.x0+at.x1)/2:-12,0,at?at.z1+72:128);}
 q('#undo').disabled=!state.past.length||!!gesture;q('#undo-count').textContent=state.past.length?'('+state.past.length+')':'';
 q('#count').textContent='床 '+state.rooms.length+' · 壁 '+state.rooms.reduce((n,r)=>n+Object.values(r.walls).filter(Boolean).length,0);
 const selection=q('#selection');selection.hidden=!room;
 if(room){q('#size').textContent='幅 '+(room.x1-room.x0)/8+' × 奥行 '+(room.z1-room.z0)/8+(gesture?.kind==='wall'?' · 高さ '+(room.walls[gesture.side]??0)/8:'');q('#quantity').textContent='材料めやす '+Math.ceil(reelEstimate([room]))+'枚分';}
 syncHandles();
}
function defaultHint(){return mode==='view'?'画面を引いて見まわそう':mode==='wall'?(selected()?'辺の丸を上へ引くと、壁が起きるよ':'先に床を広げよう'):state.rooms.length?'床の丸を引くと伸びるよ · 空いた地面にも作れるよ':'地面を引くと、床が広がるよ';}
function syncHandles(){
 const room=selected(),items=mode==='view'?[]:room?reelHandles(draft?.room??room,mode):mode==='floor'?[{side:'new',x:-48,y:3,z:48}]:[];
 for(const [id,b]of buttons){if(!items.some(i=>i.side===id)){b.remove();q('#leaders [data-side="'+id+'"]')?.remove();buttons.delete(id);}}
 for(const item of items){let b=buttons.get(item.side);if(!b){b=document.createElement('button');b.type='button';b.dataset.handle=item.side;q('#handles').append(b);buttons.set(item.side,b);b.addEventListener('pointerdown',e=>beginHandle(e,b));b.addEventListener('keydown',e=>{if(e.key==='Escape')cancelGesture();});}b.dataset.mode=mode;b.dataset.x=String(item.x);b.dataset.y=String(item.y);b.dataset.z=String(item.z);b.textContent=item.side==='new'?'＋ 床':mode==='wall'?'↑':({north:'↖',east:'↗',south:'↘',west:'↙'})[item.side];b.setAttribute('aria-label',item.side==='new'?'床のはじめを引く':({north:'奥',east:'右',south:'手前',west:'左'})[item.side]+(mode==='wall'?'の壁を引き上げる':'の床を伸ばす'));}
 positionHandles();
}
function positionHandles(){
 const placed=[];for(const b of buttons.values()){
  const p=new T.Vector3(+b.dataset.x,+b.dataset.y,+b.dataset.z).project(camera),x=(p.x+1)*width/2,y=(1-p.y)*height/2;
  const clamp=(n,a,z)=>Math.max(a,Math.min(z,n)),minY=height<500?146:178,maxY=height-(height<500?134:158),bx=clamp(x,34,width-34);let best={x:bx,y:clamp(y,minY,maxY)},distance=Infinity;
  // Four grips stay reachable without covering each other or the tool strip.
  for(let i=0;i<13;i++){const px=clamp(bx+(i?Math.ceil(i/2)*54*(i%2?1:-1):0),34,width-34),py=best.y;if(placed.some(o=>Math.hypot(o.x-px,o.y-py)<51))continue;const d=Math.abs(px-x);if(d<distance){distance=d;best={x:px,y:py};}}
  placed.push(best);b.style.left=best.x+'px';b.style.top=best.y+'px';b.hidden=p.z<-1||p.z>1;b.style.visibility=gesture?'hidden':'visible';
  if(mode==='floor'&&b.dataset.handle!=='new'){const dir={north:[0,-24],east:[24,0],south:[0,24],west:[-24,0]}[b.dataset.handle],out=new T.Vector3(+b.dataset.x+dir[0],+b.dataset.y,+b.dataset.z+dir[1]).project(camera),a=Math.atan2(-(out.y-p.y),out.x-p.x);b.textContent=['→','↘','↓','↙','←','↖','↑','↗'][(Math.round(a/(Math.PI/4))+8)%8];}
  let line=q('#leaders [data-side="'+b.dataset.handle+'"]');if(!line){line=document.createElementNS('http://www.w3.org/2000/svg','line');line.dataset.side=b.dataset.handle;q('#leaders').append(line);}for(const[k,v]of Object.entries({x1:x,y1:y,x2:best.x,y2:best.y}))line.setAttribute(k,String(v));line.style.display=b.hidden||gesture||Math.hypot(best.x-x,best.y-y)<4?'none':'';
 }
}
function metrics(){q('#metrics').textContent=JSON.stringify({...stats,rooms:state.rooms.length,walls:state.rooms.reduce((n,r)=>n+Object.values(r.walls).filter(Boolean).length,0),history:state.past.length});}
function save(){
 if(!writeAllowed||!storage){q('#saved').textContent='このタブで試作中 · いつもの材料は使わないよ';return;}
 try{const raw=JSON.stringify(state),current=storage.getItem(REEL_KEY);if(current!==lastRaw&&current!==raw){writeAllowed=false;say('別のタブで変わったよ。この画面では試作を続けられるよ');return;}if(raw!==lastRaw)storage.setItem(REEL_KEY,raw);lastRaw=raw;q('#saved').textContent='試作を保存したよ · いつもの材料は使わないよ';}catch{writeAllowed=false;q('#saved').textContent='このタブで試作中 · 保存する場所がいっぱいだよ';}
}
function begin(e,kind,extra={}){
 if(gesture||e.button!==0)return false;e.preventDefault();e.stopPropagation();gesture={id:e.pointerId,el:e.currentTarget,kind,x:e.clientX,y:e.clientY,started:clock(),moved:false,...extra};try{gesture.el.setPointerCapture(e.pointerId);}catch{gesture=null;return false;}stats.gestures++;syncHandles();return true;
}
function beginHandle(e,b){
 if(mode==='view')return;const side=b.dataset.handle;
 if(side==='new'){const p=new T.Vector3(+b.dataset.x,3,+b.dataset.z);begin(e,'floor',{start:p});return;}
 const room=selected();if(!room)return;
 if(mode==='floor'){const p=pointOn(e);if(p)begin(e,'resize',{roomId:room.id,side,start:p,coordinate:room[({north:'z0',east:'x1',south:'z1',west:'x0'})[side]]});}
 else{const p=new T.Vector3(+b.dataset.x,+b.dataset.y,+b.dataset.z),normal=new T.Vector3();camera.getWorldDirection(normal);normal.y=0;normal.normalize();const plane=new T.Plane().setFromNormalAndCoplanarPoint(normal,p),hit=pointOn(e,plane);if(hit)begin(e,'wall',{roomId:room.id,side,plane,start:hit,height:room.walls[side]});}
}
canvas.addEventListener('pointerdown',e=>{
 if(gesture){if(e.pointerId!==gesture.id)cancelGesture();return;}
 if(e.button===2||mode==='view'){const right=e.button===2;if(right){const old=e.button;const start={id:e.pointerId,el:canvas,kind:'view',x:e.clientX,y:e.clientY,started:clock(),moved:false};e.preventDefault();gesture=start;canvas.setPointerCapture(e.pointerId);}else begin(e,'view');return;}
 const room=hitRoom(e);if(room){state={...state,selected:room.id};paintKey='';renderParts();say(mode==='wall'?'辺の丸を上へ引いてね':'床の丸を引いて伸ばそう');return;}
 if(mode==='floor'){const p=pointOn(e);if(p)begin(e,'floor',{start:p});}
});
function move(e){
 const g=gesture;if(!g||e.pointerId!==g.id)return;if(e.type==='pointermove'&&e.pointerType==='mouse'&&!(e.buttons&3)){cancelGesture();return;}e.preventDefault();
 if(g.kind==='view'){yaw-=(e.clientX-g.x)*.008;pitch=T.MathUtils.clamp(pitch+(e.clientY-g.y)*.006,.3,1.35);g.x=e.clientX;g.y=e.clientY;cameraPosition();return;}
 if(Math.hypot(e.clientX-g.x,e.clientY-g.y)>=6)g.moved=true;if(!g.moved)return;
 const p=pointOn(e,g.plane??flat);if(!p)return;const start=clock();
 currentAction=g.kind==='floor'?{type:'FLOOR',start:g.start,end:p}:g.kind==='resize'?{type:'RESIZE',id:g.roomId,side:g.side,coordinate:g.coordinate+((g.side==='north'||g.side==='south')?p.z-g.start.z:p.x-g.start.x)}:{type:'WALL',id:g.roomId,side:g.side,height:g.height+p.y-g.start.y};
 draft=reelDraft(state,currentAction);renderParts();stats.maxPreviewMs=Math.max(stats.maxPreviewMs,clock()-start);q('#hint').textContent=draft.problem||(g.kind==='wall'?'離すと壁がつながるよ':'離すと、この形になるよ');q('#hint').dataset.error=String(!!draft.problem);
 tape.visible=!!draft.room;tape.userData.end=p.clone();metrics();
}
function release(){const g=gesture;gesture=null;draft=currentAction=null;tape.visible=false;if(g)try{if(g.el.hasPointerCapture(g.id))g.el.releasePointerCapture(g.id);}catch{}paintKey='';renderParts();}
function cancelGesture(){if(!gesture)return;stats.cancelled++;release();say('下描きをやめたよ');metrics();}
function end(e){
 const g=gesture;if(!g||e.pointerId!==g.id)return;if(g.kind!=='view')move(e);
 if(g.kind!=='view'&&g.moved&&currentAction){const start=clock(),result=commitReel(state,currentAction);if(result.changed){state=result.state;stats.commits++;stats.buildMs+=clock()-g.started;stats.maxCommitMs=Math.max(stats.maxCommitMs,clock()-start);say(g.kind==='wall'?'壁がつながった！':g.kind==='resize'?'床を伸ばした！':'床ができた！');save();}else if(result.problem)say(result.problem,true);}
 release();metrics();
}
window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',end);
for(const type of['pointercancel','lostpointercapture'])window.addEventListener(type,e=>{if(gesture?.id===e.pointerId)cancelGesture();},true);
for(const type of['blur','pagehide'])window.addEventListener(type,cancelGesture);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelGesture();});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();cancelGesture();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!e.repeat){e.preventDefault();undo();}});
function undo(){if(gesture)return;const next=undoReel(state);if(next===state)return;state=next;stats.undo++;paintKey='';renderParts();say('1つ前にもどしたよ');save();metrics();}
q('#undo').onclick=undo;
for(const b of document.querySelectorAll('[data-tool]'))b.onclick=()=>{cancelGesture();stats.toolChoices++;mode=b.dataset.tool;for(const other of document.querySelectorAll('[data-tool]'))other.setAttribute('aria-pressed',String(other===b));canvas.style.cursor=mode==='view'?'grab':'crosshair';paintKey='';renderParts();say(defaultHint());metrics();};
q('#front').onclick=()=>{cancelGesture();yaw=.6;pitch=.72;cameraPosition();};
q('#zoom-in').onclick=()=>{zoom=Math.min(1.8,zoom*1.2);resize();};q('#zoom-out').onclick=()=>{zoom=Math.max(.55,zoom/1.2);resize();};
window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
let last=clock();function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;if(document.hidden)return;
 atmosphere.update({scene,camera,sun,hemi,time:now});
 hand.getWorldPosition(handPoint);reel.position.copy(handPoint);reel.position.z+=1.5;reel.rotation.y=actor.rotation.y;
 if(tape.visible){reel.rotation.x+=dt*8;const p=tape.geometry.attributes.position;p.setXYZ(0,handPoint.x,handPoint.y,handPoint.z);const end=tape.userData.end;p.setXYZ(1,end.x,end.y,end.z);p.needsUpdate=true;tape.geometry.computeBoundingSphere();}
 if(now>noticeUntil&&notice){notice='';q('#hint').textContent=defaultHint();q('#hint').dataset.error='false';}
 renderer.render(scene,camera);
}
resize();renderParts();metrics();if(!writeAllowed)q('#saved').textContent='このタブで試作中 · いつもの記録は変更しないよ';requestAnimationFrame(frame);
