import {ROUTE_EPS,pointBoxDistance,segmentBoxDistance,clearanceBlocked,hoseSegmentBlocked,externalSegmentBlocked} from './free-route-clearance.mjs';
import {workVehicleState} from './work-vehicle-height.mjs';
import {constructionBase,preparedFrameBuild,RAISED_FRAME_ACTION} from './free-supported-build.mjs';
import {newPaintAccessReceipt,assertPaintAccessReceipt,sharedPaintHeight} from './free-paint-access.mjs';
import {newFinishAccess,assertFinishAccess} from './free-finish-access.mjs';
import {newScaffoldReceipt,assertScaffoldReceipt} from './free-frame-scaffold.mjs';
import {frameDeckHeight} from './free-frame-workspace.mjs';
import {freeWorkMask,freePlacedFill} from './free-work-parts.mjs';
import {canonicalFreeAction,freeCell} from './free-build-state.mjs';
import {FREE_CAST_ACTIONS,finishBands} from './free-casting.mjs';
import {FREE_FRAME_ACTIONS,FRAME_HAND_REACH,FRAME_TOOL_REACH,frameOrder,FRAME_RACK} from './free-frames.mjs';
import {newBoomReceipt,assertBoomReceipt,pipeContactPath,pipeWalkingCorners} from './free-boom-contact.mjs';

import {footSurface,footingAt,footingSegment,needsFooting,newFootingReceipt,assertFootingReceipt} from './free-footing.mjs';
import {walkingGroundAt,walkingGroundSegment} from './free-walking-ground.mjs';
import {assertVehicleRescueReceipt} from './free-vehicle-rescue.mjs';

export const FREE_CONTACT_ACTIONS=new Set(['FREE_PAINT','FREE_BOARD','FREE_LEAVE',...FREE_CAST_ACTIONS,...FREE_FRAME_ACTIONS]);
export const CONTACT_EPS=1e-5;
export function vehiclePoint(v,p){const c=Math.cos(v.heading),s=Math.sin(v.heading);return{x:v.x+c*p.x+s*p.z,y:p.y??0,z:v.z-s*p.x+c*p.z};}
export function paintPatch(f,a,pixel,progress=.5){
 const w=f.completed[a.work],c=freeCell(a.cell),h=freePlacedFill(w,a.cell)/2;
 if(!h)throw Error('塗るコンクリートがありません。');
 const col=pixel%4,row=Math.floor(pixel/4),x=w.x-f.location.x+c.x,z=w.z-f.location.z+c.z;
 const span=a.face==='top'?4:h/4,offset=(progress-.5)*span*.96;
 let point,normal,u,v;
 if(a.face==='top'){point={x:x-6+col*4,y:h,z:z-6+row*4+offset};normal=[0,1,0];u=[1,0,0];v=[0,0,1];}
 else if(['north','south'].includes(a.face)){point={x:x-6+col*4,y:h*(row+.5)/4+offset,z:z+(a.face==='north'?-8:8)};normal=[0,0,a.face==='north'?-1:1];u=[1,0,0];v=[0,1,0];}
 else{point={x:x+(a.face==='west'?-8:8),y:h*(row+.5)/4+offset,z:z-6+col*4};normal=[a.face==='west'?-1:1,0,0];u=[0,0,1];v=[0,1,0];}
 point.y+=constructionBase(w);return{point,normal,u,v,span};
}
export function assertPaintAccess(f,a){
 const w=f.completed[a.work];if(!freePlacedFill(w,a.cell))throw Error('塗るコンクリートがありません。');
 const i=a.cell,n={north:i>=4?i-4:-1,south:i<12?i+4:-1,west:i%4?i-1:-1,east:i%4<3?i+1:-1}[a.face];
 if(n>=0&&a.pixels.some(pixel=>Math.floor(pixel/4)*w.fill[i]/8<freePlacedFill(w,n)/2))throw Error('隣のコンクリートに隠れている部分を除いてください。');
}
function context(a,p){return JSON.stringify({profileId:p.profileId,action:canonicalFreeAction(a),freeBuild:p.freeBuild,...(p.schemaVersion>=10?{foundation:p.foundation}:{} )});}
export function newFreeReceipt(a,p){
 const base={type:a.type,operationId:a.operationId,revision:p.revision,context:context(a,p),...(needsFooting(a)?{footing:newFootingReceipt()}:{} )};
 if(FREE_FRAME_ACTIONS.has(a.type))return{...base,...([RAISED_FRAME_ACTION,'FREE_DEMOLD','FREE_UNFRAME'].includes(a.type)?{scaffold:newScaffoldReceipt()}:{}),maxGripError:0,maxHandReach:0,maxPlacementError:0,maxHitError:0,tool:{samples:0,maxLength:0,maxContactError:0},panels:frameOrder(preparedFrameBuild(p,a).mask).map(panel=>({id:panel.id,graspSamples:0,carrySamples:0,seatSamples:0,returnedSamples:0,min:1,max:0,hits:[false,false]}))};
 if(FREE_CAST_ACTIONS.has(a.type))return{...base,...(a.type==='FREE_FINISH'?{access:newFinishAccess(p.freeBuild)}:{}),maxGripError:0,maxContactError:0,maxPoleLength:0,maxVolumeError:0,min:1,max:0,samples:0,bands:a.type==='FREE_FINISH'?finishBands(p.freeBuild).map(b=>({...b,samples:0,min:1,max:0})):[],...(a.type==='FREE_POUR'&&a.source==='pump'?{boom:newBoomReceipt()}:{} )};
 return a.type==='FREE_PAINT'?{...base,access:newPaintAccessReceipt(),maxGripError:0,maxContactError:0,maxPoleLength:0,patches:a.pixels.map(pixel=>({pixel,samples:0,min:1,max:0}))}:{...base,travelSamples:0,stepSamples:0,endpointError:0,doorClosedError:0,doorOpened:false,boarding:{samples:0,terrainSamples:0,landingSamples:0,maxSlope:0,maxPatchError:0,maxPoseError:0,maxSoleError:0}};
}
export function assertFreeReceipt(a,p,revision,r){
 if(r&&Object.hasOwn(r,'rescue'))return assertVehicleRescueReceipt(p,a,revision,r);
 if(!FREE_CONTACT_ACTIONS.has(a.type)||!r||r.type!==a.type||r.operationId!==a.operationId||r.revision!==revision||p.revision!==revision||r.context!==context(a,p))throw Error('作業の接触記録が現在の対象と一致しません。');
 const expected=newFreeReceipt(a,p),keys=Object.keys(expected).sort();
 if(needsFooting(a))assertFootingReceipt(r.footing);
 if(JSON.stringify(Object.keys(r).sort())!==JSON.stringify(keys))throw Error('接触記録の形式が不正です。');
 const finite=(n,max)=>Number.isFinite(n)&&n>=0&&n<=max;
 if(FREE_FRAME_ACTIONS.has(a.type)){
  if([RAISED_FRAME_ACTION,'FREE_DEMOLD','FREE_UNFRAME'].includes(a.type)){const f=preparedFrameBuild(p,a);assertScaffoldReceipt(r.scaffold,expected.panels.length,constructionBase(f)+f.height,{deckHeight:frameDeckHeight(f)});}
  if(!['maxGripError','maxPlacementError','maxHitError'].every(k=>finite(r[k],CONTACT_EPS))||!finite(r.maxHandReach,FRAME_HAND_REACH+CONTACT_EPS)||!Array.isArray(r.panels)||r.panels.length!==expected.panels.length)throw Error('型枠の運搬・据付・固定を確認できません。');
  if(!r.tool||JSON.stringify(Object.keys(r.tool).sort())!==JSON.stringify(Object.keys(expected.tool).sort())||!Number.isSafeInteger(r.tool.samples)||r.tool.samples<0||r.tool.samples>0&&r.tool.samples<3||!finite(r.tool.maxLength,FRAME_TOOL_REACH)||!finite(r.tool.maxContactError,CONTACT_EPS)||r.tool.samples===0&&(r.tool.maxLength!==0||r.tool.maxContactError!==0))throw Error('型枠の伸縮工具の到達と接触を確認できません。');
  for(let i=0;i<expected.panels.length;i++){const b=r.panels[i],e=expected.panels[i];if(!b||JSON.stringify(Object.keys(b).sort())!==JSON.stringify(Object.keys(e).sort())||b.id!==e.id||!['graspSamples','carrySamples','seatSamples'].every(k=>Number.isSafeInteger(b[k])&&b[k]>=3)||!Number.isSafeInteger(b.returnedSamples)||(['FREE_DEMOLD','FREE_UNFRAME'].includes(a.type)?b.returnedSamples<3:b.returnedSamples!==0)||!finite(b.min,CONTACT_EPS)||!finite(b.max,1)||b.max<1-CONTACT_EPS||!Array.isArray(b.hits)||b.hits.length!==2||!b.hits.every(v=>v===true))throw Error('型枠の板がすべて固定・回収されていません。');}
 }else if(FREE_CAST_ACTIONS.has(a.type)){
  if(a.type==='FREE_FINISH')assertFinishAccess(r.access,p.freeBuild);
  if(a.type==='FREE_POUR'&&a.source==='pump')assertBoomReceipt(r.boom);
  if(!['maxGripError','maxContactError','maxVolumeError'].every(k=>finite(r[k],CONTACT_EPS))||!finite(r.maxPoleLength,64)||!Number.isSafeInteger(r.samples)||r.samples<3||!finite(r.min,CONTACT_EPS)||!finite(r.max,1)||r.max<1-CONTACT_EPS)throw Error('注ぎ口・生コン量・施工面の接触を確認できません。');
  const bands=expected.bands;if(!Array.isArray(r.bands)||r.bands.length!==bands.length)throw Error('コテの仕上げ範囲が一致しません。');
  for(let i=0;i<bands.length;i++){const b=r.bands[i],e=bands[i];if(JSON.stringify(Object.keys(b).sort())!==JSON.stringify(Object.keys(e).sort())||b.cell!==e.cell||b.row!==e.row||!Number.isSafeInteger(b.samples)||b.samples<3||!finite(b.min,CONTACT_EPS)||!finite(b.max,1)||b.max<1-CONTACT_EPS)throw Error('コテの仕上げが完了していません。');}
 }else if(a.type==='FREE_PAINT'){
  assertPaintAccess(p.freeBuild,a);assertPaintAccessReceipt(r.access,p.freeBuild,a);
  if(!finite(r.maxGripError,CONTACT_EPS)||!finite(r.maxContactError,CONTACT_EPS)||!finite(r.maxPoleLength,r.access.height===sharedPaintHeight(p.freeBuild,a)?64:42))throw Error('工具が正しく施工面に触れていません。');
  if(!Array.isArray(r.patches)||r.patches.length!==a.pixels.length)throw Error('塗り残しがあります。');
  const ids=[...a.pixels].sort((x,y)=>x-y),patches=[...r.patches].sort((x,y)=>x.pixel-y.pixel);
  for(let i=0;i<ids.length;i++){const b=patches[i];if(JSON.stringify(Object.keys(b).sort())!==JSON.stringify(['max','min','pixel','samples'])||b.pixel!==ids[i]||!Number.isSafeInteger(b.samples)||b.samples<3||!finite(b.min,CONTACT_EPS)||!finite(b.max,1)||b.max<1-CONTACT_EPS)throw Error('指定範囲の工具接触を確認できません。');}
 }else{
  if(!Number.isSafeInteger(r.travelSamples)||r.travelSamples<(a.type==='FREE_LEAVE'?0:2)||!Number.isSafeInteger(r.stepSamples)||r.stepSamples<3||!finite(r.endpointError,CONTACT_EPS)||!finite(r.doorClosedError,CONTACT_EPS)||r.doorOpened!==true)throw Error('乗降動作が最後まで完了していません。');
  const b=r.boarding;if(!b||JSON.stringify(Object.keys(b).sort())!==JSON.stringify(Object.keys(expected.boarding).sort())||!Number.isSafeInteger(b.samples)||b.samples<3||!Number.isSafeInteger(b.terrainSamples)||b.terrainSamples<b.samples*31||!Number.isSafeInteger(b.landingSamples)||b.landingSamples<3||!finite(b.maxSlope,Math.tan(8*Math.PI/180)+1e-8)||!finite(b.maxPatchError,.15+1e-8)||!finite(b.maxPoseError,CONTACT_EPS)||!finite(b.maxSoleError,.15+CONTACT_EPS))throw Error('車体・ドア前の地面・靴底の支持を確認できません。');
 }
 return true;
}

// A conservative pedestrian route avoids the actual vehicle headings and wet forms.
// A blocked route fails before animation; it never falls back to a straight teleport.
export function walkingSurface(f,x,z,heightAt=()=>0){return footSurface(f,x,z,heightAt);}
function* walkingObstacles(f,ignoreVehicle){
 yield{x:FRAME_RACK.x,z:FRAME_RACK.z,hx:11,hz:6};
 for(const name of ['truck','pump'])if(name!==ignoreVehicle){const v=f[name];yield{...v,hx:v.legs?40:33,hz:44};}
 if(!['design','complete'].includes(f.stage))for(let i=0;i<16;i++)if(f.mask&(1<<i))yield{...freeCell(i),hx:8.3,hz:8.3};
}
const outside=(f,p)=>![p.x,p.z].every(Number.isFinite)||Math.abs(p.x+f.location.x)>2600||Math.abs(p.z+f.location.z)>1700;
export function walkingBlocked(f,x,z,external=()=>false,ignoreVehicle=null,heightAt=null){
 const p={x,z};if(outside(f,p)||external(x+f.location.x,z+f.location.z,14-ROUTE_EPS)||hoseSegmentBlocked(pipeContactPath(f,heightAt),p,p,14))return true;
 for(const box of walkingObstacles(f,ignoreVehicle))if(clearanceBlocked(pointBoxDistance(p,box),14))return true;return false;
}
export function walkingSegmentBlocked(f,from,to,external=()=>false,ignoreVehicle=null,heightAt=null){
 if(outside(f,from)||outside(f,to)||externalSegmentBlocked(f.location,from,to,14,external)||hoseSegmentBlocked(pipeContactPath(f,heightAt),from,to,14))return true;
 for(const box of walkingObstacles(f,ignoreVehicle))if(clearanceBlocked(segmentBoxDistance(from,to,box),14))return true;return false;
}
export function walkPath(f,start,end,external=()=>false,heightAt=()=>0){
 if(f.connected)f=workVehicleState(f,heightAt);
 let remainingSamples=12000;
 const blocked=(x,z)=>walkingBlocked(f,x,z,external)||!walkingGroundAt(f,x,z,heightAt),safe=(a,b)=>{if(walkingSegmentBlocked(f,a,b,external))return false;remainingSamples-=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/2))+1;if(remainingSamples<0)throw Error('徒歩経路が複雑です。近くの安全な場所へ移動してから作業してください。');if(!walkingGroundSegment(f,a,b,heightAt))return false;const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/4));for(let i=0;i<=n;i++){const t=i/n;if(blocked(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))return false;}return true;};
 const point=p=>({...p,y:walkingGroundAt(f,p.x,p.z,heightAt).height});
 if(blocked(start.x,start.z)||blocked(end.x,end.z))throw Error('安全な徒歩経路を確保してください。車両を離して停め直せます。');
 if(safe(start,end))return[point(start),point(end)];
 // Visibility graph uses corners around the two vehicles and the entire wet work area.
 const nodes=[start,end,...pipeWalkingCorners(f)];
 // A tight rear stance needs side corners for both the approach and departure.
 // The usual corners farther behind the truck may be across a yard boundary.
 for(const v of [f.truck,f.pump])for(const p of [start,end]){const c=Math.cos(v.heading),s=Math.sin(v.heading),dx=p.x-v.x,dz=p.z-v.z,x=c*dx-s*dz,z=s*dx+c*dz;if(Math.abs(x)<=64&&z<-44&&z>=-80)for(const side of [-63,63]){const q=vehiclePoint(v,{x:side,z});nodes.push({x:q.x,z:q.z});}}
 // These are horizontal planning points, not saved foot poses. vehiclePoint
 // supplies a default Y=0, which would reject a valid detour on raised ground.
 // Derive their height from the same surface as every checked route edge.
 for(const v of [f.truck,f.pump])for(const x of [-63,63])for(const z of [-68,68]){const p=vehiclePoint(v,{x,z});nodes.push({x:p.x,z:p.z});}
 for(const x of [-27,27])for(const z of [FRAME_RACK.z-22,FRAME_RACK.z+22])nodes.push({x,z});
 if(!['design','complete'].includes(f.stage))for(const x of [-56,56])for(const z of [-56,56])nodes.push({x,z});
 for(const w of f.completed.filter(w=>freeWorkMask(w)&&w.x-f.location.x>=Math.min(start.x,end.x)-100&&w.x-f.location.x<=Math.max(start.x,end.x)+100&&w.z-f.location.z>=Math.min(start.z,end.z)-100&&w.z-f.location.z<=Math.max(start.z,end.z)+100).slice(0,16))for(const dx of [-46,46])for(const dz of [-46,46])nodes.push({x:w.x-f.location.x+dx,z:w.z-f.location.z+dz});
 const dist=nodes.map(()=>Infinity),prev=nodes.map(()=>-1),done=new Set();dist[0]=0;
 for(let k=0;k<nodes.length;k++){
  let u=-1;for(let i=0;i<nodes.length;i++)if(!done.has(i)&&(u<0||dist[i]<dist[u]))u=i;
  if(u<0||!Number.isFinite(dist[u]))break;if(u===1){const route=[];for(let n=1;n!==-1;n=prev[n])route.unshift(point(nodes[n]));return route;}done.add(u);
  for(let v=0;v<nodes.length;v++)if(!done.has(v)){const d=dist[u]+Math.hypot(nodes[v].x-nodes[u].x,nodes[v].z-nodes[u].z);if(d<dist[v]&&safe(nodes[u],nodes[v])){dist[v]=d;prev[v]=u;}}
 }
 throw Error('車体・型枠を避ける通路がありません。車両を移動してください。');
}
