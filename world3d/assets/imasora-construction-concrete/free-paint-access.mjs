import {constructionBase,RAISED_BASE_MAX} from './free-supported-build.mjs';
import {freeCell,freeFramePanels} from './free-build-state.mjs';
import {freePlacedFill} from './free-work-parts.mjs';
import {paintPatch,assertPaintAccess,walkPath} from './free-contact.mjs';
import {footingAt} from './free-footing.mjs';
import {frameBlocked,frameRoute} from './free-frames.mjs';
import {makeFrameScaffold,newScaffoldReceipt,assertScaffoldReceipt} from './free-frame-scaffold.mjs';
const distance=(a,b)=>Math.hypot(a.x-b.x,(a.y??0)-(b.y??0),a.z-b.z);
export const newPaintAccessReceipt=()=>({height:0,...newScaffoldReceipt()});
export const paintDeckHeight=f=>2+Math.max(f.stage==='complete'?0:constructionBase(f)+f.height,...f.completed.flatMap(w=>w.fill.map((_,i)=>constructionBase(w)+freePlacedFill(w,i)/2)));
export const sharedPaintHeight=(f,a)=>constructionBase(f.completed[a.work])+.8;
export function assertPaintAccessReceipt(r,f,a=null){
 if(!r||JSON.stringify(Object.keys(r).sort())!==JSON.stringify(Object.keys(newPaintAccessReceipt()).sort()))throw Error('塗装用足場の確認記録がありません。');
 if(r.height===0){if(JSON.stringify(r)!==JSON.stringify(newPaintAccessReceipt()))throw Error('地上塗装の足場記録が不正です。');return;}
 const low=a&&r.height===sharedPaintHeight(f,a)&&r.height>=.8&&r.height<=RAISED_BASE_MAX+.8,ordinary=r.height>=2&&r.height<=RAISED_BASE_MAX+8+2&&r.height===paintDeckHeight(f);
 if(!Number.isFinite(r.height)||!low&&!ordinary)throw Error('塗装用足場の高さを確認できません。');
 const {height,...s}=r;assertScaffoldReceipt(s,1,height,{deckHeight:height});
}
// Check the real hand-to-tool length before any approach or paint consumption.
export function paintReach(f,a,stance,hand){
 const c=Math.cos(stance.heading),s=Math.sin(stance.heading),grip={x:stance.x+c*hand.x+s*hand.z,y:stance.y+hand.y,z:stance.z-s*hand.x+c*hand.z};let max=0;
 for(const pixel of a.pixels)for(const t of [0,1]){const p=paintPatch(f,a,pixel,t),radius=a.tool==='roller'?(a.face==='top'?.65:Math.min(.65,p.span*.018)):.18;const end={x:p.point.x+p.normal[0]*(radius+.6),y:p.point.y+p.normal[1]*(radius+.6),z:p.point.z+p.normal[2]*(radius+.6)};max=Math.max(max,distance(grip,end));}
 return max;
}
export function paintAccessPlan(f,a,from,hand,external=()=>false,heightAt=()=>0,checkRoute=null,groundExternal=external,sharedPlatform=null){
 const w=f.completed[a.work],c=freeCell(a.cell);assertPaintAccess(f,a);const shared=sharedPlatform?.access(f,from,{x:w.x-f.location.x+c.x,z:w.z-f.location.z+c.z},stance=>paintReach(f,a,stance,hand)<=64,external,heightAt,{face:a.face});if(shared)return shared;
 let checks=0;const spend=()=>{if(++checks>250000){const e=Error('塗装の通路が複雑です。近くへ歩き、作品の周りを空けてから試してください。');e.code='PAINT_ACCESS_BUDGET';throw e;}};const oldExternal=external,oldHeight=heightAt,heights=new Map(),blocked=new Map();external=(...args)=>{const key=args.join(',');if(blocked.has(key))return blocked.get(key);spend();const value=oldExternal(...args);blocked.set(key,value);return value;};heightAt=(...args)=>{const key=args.join(',');if(heights.has(key))return heights.get(key);spend();const value=oldHeight(...args);heights.set(key,value);return value;};
 const rawGroundExternal=groundExternal,groundChecks=new Map();groundExternal=rawGroundExternal===oldExternal?external:(...args)=>{const key=args.join(',');if(groundChecks.has(key))return groundChecks.get(key);spend();const value=rawGroundExternal(...args);groundChecks.set(key,value);return value;};
 assertPaintAccess(f,a);const work=f.completed[a.work],cell=freeCell(a.cell),center={x:work.x-f.location.x+cell.x,z:work.z-f.location.z+cell.z};
 const offsets=a.face==='top'?[[24,0],[-24,0],[0,24],[0,-24],...(checkRoute?[[24,24],[24,-24],[-24,24],[-24,-24],[26,26],[26,-26],[-26,26],[-26,-26]]:[])]:{north:[[0,-24]],south:[[0,24]],west:[[-24,0]],east:[[24,0]]}[a.face];
 const candidates=offsets.map(([dx,dz])=>({x:center.x+dx,z:center.z+dz,heading:Math.atan2(-dx,-dz)})).sort((a,b)=>Math.hypot(a.x-from.x,a.z-from.z)-Math.hypot(b.x-from.x,b.z-from.z));let chosen=null;
 for(const dest of candidates)try{const support=footingAt(f,dest.x,dest.z,heightAt);if(!support)continue;const stance={...dest,y:support.height};if(paintReach(f,a,stance,hand)>42)continue;const ground=walkPath(f,from,stance,groundExternal,heightAt),length=ground.slice(1).reduce((n,b,i)=>n+distance(ground[i],b),0);if(checkRoute&&!checkRoute(ground,stance))continue;if(!chosen||length<chosen.length)chosen={stance,ground,length,scaffold:null};break;}catch(e){if(e.code==='PAINT_ACCESS_BUDGET')throw e;}
 if(chosen)return chosen;
 // Cured surfaces are crossed on an explicit deck, never by hovering over an edge.
 const panels=[...(['design','complete'].includes(f.stage)?[]:freeFramePanels(f.mask)),{...center,width:16,depth:16}],height=paintDeckHeight(f,a);
 const origin={x:work.x-f.location.x,z:work.z-f.location.z},origins=[0,-64,64].flatMap(dx=>[{x:origin.x+dx,z:origin.z+116,dz:-1},{x:origin.x+dx,z:origin.z-116,dz:1}]);
 let last;
 for(const dest of candidates){const stance={...dest,y:height};if(paintReach(f,a,stance,hand)>42||frameBlocked(f,panels,stance,external,14))continue;
  try{const scaffold=makeFrameScaffold(f,stance,panels,heightAt,external,to=>walkPath(f,from,to,groundExternal,heightAt),(start,end,blocked)=>frameRoute(f,panels,start,end,blocked,14,heightAt,()=>({height}),false,{minX:Math.min(start.x,end.x)-80,maxX:Math.max(start.x,end.x)+80,minZ:Math.min(start.z,end.z)-80,maxZ:Math.max(start.z,end.z)+80}),{origins,height});if(checkRoute&&!checkRoute(scaffold.ground,scaffold.entry))continue;return{stance,ground:scaffold.ground,scaffold};}catch(e){if(e.code==='PAINT_ACCESS_BUDGET')throw e;last=e;}
 }
 throw Error('塗る面までの通路・足場を確保できません。車両やホースを避け、作品の周りに平らな通路を空けてください。',{cause:last});
}
export function paintScaffoldSteps(plan){
 const s=plan.scaffold;if(!s)return{up:[],down:[]};const axis=s.axis??'z',up=[],down=[],heading=Math.atan2(axis==='x'?s.direction:0,axis==='z'?s.direction:0),downHeading=Math.atan2(axis==='x'?-s.direction:0,axis==='z'?-s.direction:0);let prior={...s.entry};
 for(const [i,tread]of [...s.stairs,s.path[0]].entries()){const to={x:tread.x,y:tread.y,z:tread.z,heading};if(i<s.stairs.length)to[axis]-=s.direction*2.0592;up.push({kind:'climb',from:prior,to,ascending:true,scaffold:s,duration:.5});prior=to;}
 prior={...s.path[0]};for(const tread of [...s.stairs].reverse().concat(s.entry)){const to={x:tread.x,y:tread.y,z:tread.z,heading:downHeading};if(tread!==s.entry)to[axis]+=s.direction*2.0592;down.push({kind:'climb',from:prior,to,ascending:false,scaffold:s,duration:.5});prior=to;}
 return{up,down};
}

