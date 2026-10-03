import {constructionBase} from './free-supported-build.mjs';
import {freeCell} from './free-build-state.mjs';
import {frameBlocked,frameRoute,frameLocal} from './free-frames.mjs';
import {makeFrameScaffold,newScaffoldReceipt,assertScaffoldReceipt} from './free-frame-scaffold.mjs';
import {frameDeckHeight} from './free-frame-workspace.mjs';

export const finishNeedsScaffold=f=>constructionBase(f)+f.height>4;
export const newFinishAccess=f=>Array.from({length:16},(_,cell)=>cell).filter(cell=>f.fill[cell]>0&&finishNeedsScaffold(f)).map(cell=>({cell,...newScaffoldReceipt()}));
export function assertFinishAccess(records,f){
 const expected=newFinishAccess(f);if(!Array.isArray(records)||records.length!==expected.length)throw Error('仕上げ用足場の記録が一致しません。');
 records.forEach((record,i)=>{if(record.cell!==expected[i].cell)throw Error('仕上げ用足場の対象が一致しません。');const {cell,...r}=record,low=frameDeckHeight(f);assertScaffoldReceipt(r,1,constructionBase(f)+f.height,{deckHeight:r.ascents===Math.ceil(low/2.5)+1?low:constructionBase(f)+f.height+2});});
}
export function finishHandReach(f,cell,stance,hand){
 const grip=frameLocal(stance,hand),c=freeCell(cell),y=Math.max(constructionBase(f)+f.fill[cell]/2+.7,constructionBase(f)+f.height+2);let max=0;
 for(const dx of [-6,6])for(const dz of [-6,6])max=Math.max(max,Math.hypot(c.x+dx-grip.x,y-grip.y,c.z+dz-grip.z));return max;
}
export function finishAccessPlan(f,cell,from,hand,external=()=>false,heightAt=()=>0,sharedPlatform=null){
 const shared=sharedPlatform?.access(f,from,freeCell(cell),stance=>finishHandReach(f,cell,stance,hand)<=64,external,heightAt);if(shared)return shared;
 // Wet concrete cannot carry the scaffold. Keep every post and deck outside
 // the selected form footprint, including still-empty cells.
 const panels=Array.from({length:16},(_,i)=>i).filter(i=>f.mask&(1<<i)).map(i=>({...freeCell(i),width:16.7,depth:16.7}));
 const c=freeCell(cell),height=constructionBase(f)+f.height+2,candidates=[];
 for(const d of [24,40,56])for(const [dx,dz]of [[d,0],[-d,0],[0,d],[0,-d]]){const stance={x:c.x+dx,z:c.z+dz,y:height,heading:Math.atan2(-dx,-dz)};if(!frameBlocked(f,panels,stance,external,14)&&finishHandReach(f,cell,stance,hand)<=64)candidates.push(stance);}
 candidates.sort((a,b)=>Math.hypot(a.x-from.x,a.z-from.z)-Math.hypot(b.x-from.x,b.z-from.z));
 let queries=0;const cached=(fn)=>{const cache=new Map();return(...args)=>{const key=args.join(',');if(cache.has(key))return cache.get(key);if(++queries>250000){const e=Error('仕上げの通路が複雑です。車両を離し、型枠の周りを空けてください。');e.code='FINISH_ACCESS_BUDGET';throw e;}const value=fn(...args);cache.set(key,value);return value;};};external=cached(external);heightAt=cached(heightAt);
 const origins=[0,-64,64,-160,160].flatMap(x=>[{x,z:116,dz:-1},{x,z:-116,dz:1}]).filter(o=>Array.from({length:Math.ceil(height/2.5)+1},(_,i)=>({x:o.x,z:o.z+o.dz*(20+i*12)})).every(p=>!frameBlocked(f,panels,p,external,14))).sort((a,b)=>Math.hypot(a.x-c.x,a.z-c.z)+.1*Math.hypot(a.x-from.x,a.z-from.z)-Math.hypot(b.x-c.x,b.z-c.z)-.1*Math.hypot(b.x-from.x,b.z-from.z)),groundRoutes=new Map();let last;
 const bounds={minX:Math.min(-180,from.x-20),maxX:Math.max(180,from.x+20),minZ:Math.min(-180,from.z-20),maxZ:Math.max(180,from.z+20)};
 const groundRoute=to=>{const key=to.x+','+to.z;if(!groundRoutes.has(key)){try{groundRoutes.set(key,frameRoute(f,panels,from,to,external,14,heightAt,undefined,true,bounds));}catch(e){groundRoutes.set(key,e);}}const route=groundRoutes.get(key);if(route instanceof Error)throw route;return route;};
 for(const stance of candidates)try{const scaffold=makeFrameScaffold(f,stance,panels,heightAt,external,groundRoute,(a,b,blocked)=>frameRoute(f,panels,a,b,blocked,14,heightAt,()=>({height}),false,{minX:-180,maxX:180,minZ:-180,maxZ:180}),{height,origins});return{stance,ground:scaffold.ground,scaffold};}catch(e){if(e.code==='FINISH_ACCESS_BUDGET')throw e;last=e;}
 throw Error('高い型枠を仕上げる足場を置けません。周りの車両やホースを離し、平らな通路を空けてください。',{cause:last});
}
