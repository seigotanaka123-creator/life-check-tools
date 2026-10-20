import * as T from '../three.module.min.js';
import {freeCell} from './free-build-state.mjs?v=120gn';
import {constructionBase} from './free-supported-build.mjs?v=120gn';
import {freePlacedFill} from './free-work-parts.mjs';
import {placePaintPatch,surfaceMaterial,surfaceMesh} from './free-paint-layer.mjs?v=120gn';
import {placeWorkTargetLabel} from './work-target-layout.mjs?v=120dt';

// A visual-only description derived from the same selected cells as the action.
export function describeWorkTarget(f,selection={}){
 if(!f?.location)return null;
 if(selection.mode==='paint'){
  const {work,cell,face}=selection.paint??{},w=f.completed[work];
  if(!w||!freePlacedFill(w,cell)||!['top','north','south','east','west'].includes(face))return null;
  const c=freeCell(cell),h=w.fill[cell]/2,base=constructionBase(w),p={x:w.x-f.location.x+c.x,y:base+h/2,z:w.z-f.location.z+c.z};
  if(face==='top')p.y=base+h+.25;else if(face==='north'||face==='south')p.z+=face==='north'?-8.25:8.25;else p.x+=face==='west'?-8.25:8.25;
  const pixels=[...new Set(selection.pixels??Array.from({length:16},(_,i)=>i))].filter(i=>Number.isInteger(i)&&i>=0&&i<16);
  return{kind:'paint',point:p,title:pixels.length?'ここを塗るよ！':'ここは保護中',detail:'作品 '+(work+1)+'・マス '+(cell+1)+'・'+({top:'上面',north:'北の面',south:'南の面',west:'西の面',east:'東の面'})[face],work:w,cell,face,pixels};
 }
 if(selection.mode==='build'){
  const design=f.stage==='design',mask=design?(selection.mask??f.mask):f.mask;
  const pouring=['framed','wet'].includes(f.stage),selected=selection.cell??0;
  const cells=Array.from({length:16},(_,i)=>i).filter(i=>mask&(1<<i)).filter(i=>!pouring||i===selected);
  if(!cells.length)return null;
  const height=design?(selection.height??f.height):f.height,base=constructionBase(f);
  const points=cells.map(i=>({...freeCell(i),y:base+(pouring?f.fill[i]/2:height)}));
  const point={x:points.reduce((n,p)=>n+p.x,0)/points.length,y:base+height+.3,z:points.reduce((n,p)=>n+p.z,0)/points.length};
  return{kind:'build',point,title:design?'ここにつくるよ！':pouring?'ここに注ぐよ！':f.stage==='complete'?'ここにできたよ！':'ここを仕上げるよ！',detail:pouring?'注ぐ場所：マス '+(selected+1):cells.length+'マス・高さ '+height,cells,base,height,points};
 }
 return null;
}

export function workTargetCamera(target,angle=0){
 const vertical=target.kind==='paint'&&target.face!=='top';
 const faceAngle={south:0,north:Math.PI,east:Math.PI/2,west:-Math.PI/2};
 return {focus:{...target.point},distance:target.kind==='paint'?90:145,viewAngle:vertical?faceAngle[target.face]:angle,elevation:vertical?24:target.kind==='paint'?85:100};
}

export function createWorkTarget({root,camera,host}){
 const group=new T.Group();group.name='selected-work-target';root.add(group);
 const plane=new T.PlaneGeometry(1,1),edge=new T.EdgesGeometry(plane),edgeMat=new T.LineBasicMaterial({color:'#ee729c',depthTest:true,depthWrite:false}),fill=surfaceMaterial('#ffdb78',true);
 fill.transparent=true;fill.opacity=.28;
 const rimMat=new T.MeshBasicMaterial({color:'#f276a7',depthTest:true,depthWrite:false,side:T.DoubleSide});
 function rim(m,width,height){const outline=new T.Group();outline.position.copy(m.position);outline.rotation.copy(m.rotation);const thick=Math.min(.7,height/5);for(const [x,y,sx,sy] of [[0,-height/2,width,thick],[0,height/2,width,thick],[-width/2,0,thick,height],[width/2,0,thick,height]]){const strip=surfaceMesh(plane,rimMat);strip.position.set(x,y,.05);strip.scale.set(sx,sy,1);strip.renderOrder=25;outline.add(strip);}group.add(outline);}
 const label=document.createElement('div');label.className='work-target-callout';label.hidden=true;label.setAttribute('aria-live','polite');label.innerHTML='<strong></strong><span></span><i aria-hidden="true">▼</i>';host.append(label);
 let target=null,key='',enabled=false;const point=new T.Vector3(),world=new T.Vector3(),direction=new T.Vector3(),toward=new T.Vector3();
 const controls='.free-hud-top,.free-basics,.free-deck,.free-deck-open,.hold-dash-button,.free-stop,[data-work-watch]';
 let layoutDirty=true,layout=null;const observed=new Set();
 const invalidate=()=>{layoutDirty=true;};
 const resize=new ResizeObserver(invalidate);resize.observe(host);
 const mutations=new MutationObserver(records=>{
  if(!records.some(r=>r.target!==label&&!label.contains(r.target)))return;
  invalidate();
  if(host.querySelector('.free-sheet-overlay:not([hidden]):not([data-menu-scene-peek="true"]),.free-confirm-overlay:not([hidden])'))label.hidden=true;
 });
 mutations.observe(host,{subtree:true,attributes:true,attributeFilter:['hidden','class','data-menu-scene-peek']});
 // Scrolling a tool panel or resizing Safari can move its controls without
 // changing the target. Cache those bounds instead of measuring every frame.
 host.addEventListener('scroll',invalidate,true);
 function measureLayout(){
  const origin=host.getBoundingClientRect(),obstacles=[];
  const visible=el=>!el.closest('[hidden],[data-menu-scene-peek="true"]')&&el.getClientRects().length>0;
  const elements=[...host.querySelectorAll(controls)];
  for(const el of elements){if(!observed.has(el)){observed.add(el);resize.observe(el);}if(!visible(el))continue;const r=el.getBoundingClientRect();if(r.width&&r.height)obstacles.push({left:r.left-origin.left,right:r.right-origin.left,top:r.top-origin.top,bottom:r.bottom-origin.top});}
  for(const el of observed)if(!elements.includes(el)){resize.unobserve(el);observed.delete(el);}
  const modal=[...host.querySelectorAll('.free-sheet-overlay,.free-confirm-overlay')].some(visible);
  label.style.visibility='hidden';label.hidden=false;
  const r=label.getBoundingClientRect();label.hidden=true;label.style.visibility='';
  layout={width:host.clientWidth,height:host.clientHeight,labelWidth:r.width,labelHeight:r.height,obstacles,modal};layoutDirty=false;
 }
 function clear(){group.clear();label.hidden=true;}
 function update(f,selection){
  const next=describeWorkTarget(f,selection),nextKey=JSON.stringify([next&&{kind:next.kind,point:next.point,title:next.title,detail:next.detail,cell:next.cell,face:next.face,pixels:next.pixels,cells:next.cells,base:next.base,height:next.height,points:next.points},f?.location]);
  target=next;if(key===nextKey)return;key=nextKey;clear();invalidate();if(!next)return;
  label.querySelector('strong').textContent=next.title;label.querySelector('span').textContent=next.detail;
  if(next.kind==='paint'){
   for(const pixel of next.pixels){const m=placePaintPatch(surfaceMesh(plane,fill),next.work,f.location,next.cell,next.face,pixel,.18);group.add(m);}
   // Continuous perimeter makes the selected face clear without covering its picture.
   const m=placePaintPatch(surfaceMesh(plane,fill),next.work,f.location,next.cell,next.face,0,.21);
   const w=next.work,h=w.fill[next.cell]/2,c=freeCell(next.cell);m.position.set(next.point.x,next.point.y,next.point.z);m.scale.set(16,next.face==='top'?16:h,1);
   const line=new T.LineSegments(edge,edgeMat);line.position.copy(m.position);line.rotation.copy(m.rotation);line.scale.copy(m.scale);line.renderOrder=24;group.add(line);rim(m,16,next.face==='top'?16:h);
  }else for(const p of next.points){
   const m=surfaceMesh(plane,fill);m.rotation.x=-Math.PI/2;m.position.set(p.x,p.y+.2,p.z);m.scale.set(15.8,15.8,1);group.add(m);
   const line=new T.LineSegments(edge,edgeMat);line.rotation.copy(m.rotation);line.position.copy(m.position);line.scale.copy(m.scale);group.add(line);rim(m,15.8,15.8);
  }
 }
 return{group,update,get target(){return target;},setVisible(v){enabled=v;group.visible=v;if(!v||!target)label.hidden=true;},
 tick(){if(!enabled||!target){label.hidden=true;return;}root.updateWorldMatrix(true,false);world.copy(point.set(target.point.x,target.point.y,target.point.z));root.localToWorld(world);point.copy(world).project(camera);
  const behind=toward.copy(world).sub(camera.position).dot(camera.getWorldDirection(direction))<=0;
  if(behind||point.z<-1||point.z>1||Math.abs(point.x)>1||Math.abs(point.y)>1){label.hidden=true;return;}
  if(layoutDirty)measureLayout();
  const pos=placeWorkTargetLabel({...layout,x:(point.x+1)*layout.width/2,y:(1-point.y)*layout.height/2});
  label.hidden=!pos;if(!pos)return;
  label.style.left=pos.left+'px';label.style.top=pos.top+'px';label.dataset.side=pos.side;
 },dispose(){resize.disconnect();mutations.disconnect();host.removeEventListener('scroll',invalidate,true);plane.dispose();edge.dispose();fill.dispose();edgeMat.dispose();rimMat.dispose();group.removeFromParent();label.remove();}};
}
