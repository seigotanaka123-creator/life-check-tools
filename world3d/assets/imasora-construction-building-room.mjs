import{stairPlacement,stairPoint,stairEntry,stairExit,stairGround,stairDoor,stairApproach}from'./imasora-construction-stair-placement.mjs?v=120gn';
import{decorPaintTarget,decorPaintCamera}from'./imasora-construction-decor-paint-path.mjs?v=120gn';
import{wallDoorForPart,wallDoorPaintPatches}from'./imasora-construction-wall-door-shape.mjs?v=120gn';
import {buildingPaintPart,buildingPaintPatches} from './imasora-construction-building-paint.mjs?v=120gn';
import {highRoomRoute,highRoomNodes,highWorkSolids,highWorkBodyHits,highWorkSegmentClear} from './imasora-construction-high-work-position.mjs?v=120gn';
import {highInnerRoute,highStairSpine} from './imasora-construction-high-interior.mjs?v=120gn';
import {highLocalPoint,highWorldPoint} from './imasora-construction-high-world.mjs?v=120gn';
import {upperSegmentHitsBox} from './imasora-construction-high-casting.mjs?v=120gn';
const ok=(v,m)=>{if(!v)throw Error(m);},point=(x,y,z,heading=0)=>({x,y,z,heading});
const nodes=y=>[-48,-16,16,48].flatMap(z=>[16,48].map(x=>point(x,y,z)));
function turnClear(p,boxes){return Array.from({length:24},(_,i)=>i*Math.PI/12).every(a=>!highWorkBodyHits(p,a,boxes));}
export function roomGraphRoute(w,from,to,extra=[]){
 if(stairPlacement(w))return highRoomRoute(w,from,to,extra);const all=nodes(from.y),boxes=highWorkSolids(w).concat(extra),exact=all.findIndex(n=>n.x===from.x&&n.z===from.z),end=all.findIndex(n=>n.x===to.x&&n.z===to.z);if(end<0)return null;
 const starts=exact>=0?[exact]:all.map((n,i)=>({n,i})).filter(({n})=>turnClear(n,boxes)&&highWorkSegmentClear(from,n,boxes)).map(v=>v.i),queue=[...starts],prev=new Map(starts.map(i=>[i,null]));
 for(const k of queue){if(k===end)break;for(let j=0;j<all.length;j++)if(!prev.has(j)&&Math.abs(all[k].x-all[j].x)+Math.abs(all[k].z-all[j].z)===32&&turnClear(all[j],boxes)&&highWorkSegmentClear(all[k],all[j],boxes)){prev.set(j,k);queue.push(j);}}
 if(!prev.has(end))return null;const route=[];for(let k=end;k!==null;k=prev.get(k))route.unshift(all[k]);return exact>=0?route:[from,...route];
}
export function roomPaintToolPaths(record,a,patches,worldHand=null,extra=[],stance=null){
 const w=record.work,p=buildingPaintPart(w.blueprint,a.level,a.part);patches=wallDoorPaintPatches(w,p,patches);const pose=stance??roomPaintTarget(w,a).stance,h=pose.heading,hand=worldHand?highLocalPoint(record.site,worldHand):{x:pose.x+Math.cos(h)*7.02+Math.sin(h)*8.67,y:pose.y+10.51,z:pose.z-Math.sin(h)*7.02+Math.cos(h)*8.67},out={x:hand.x+Math.sin(h)*2,y:hand.y,z:hand.z+Math.cos(h)*2},lift={...out,y:pose.y+31},solids=highWorkSolids(w).filter(v=>!['x','y','z','w','h','d'].every(k=>v[k]===p[k])&&(!v.wallDoorId||v.wallDoorId!==wallDoorForPart(w,p)?.id)).concat(extra),clear=(a,b)=>!solids.some(v=>upperSegmentHitsBox(a,b,v,.2)),result=[];
 ok(clear(hand,out)&&clear(out,lift),'道具の前をあけよう。');
 for(const pixel of a.pixels??Array.from({length:16},(_,i)=>i))for(const r of patches[pixel].rects){const q=patches[pixel],target={x:0,y:(r.y0+r.y1)/2,z:0};target[q.axis]=q.plane;target[q.tan]=(r.x0+r.x1)/2;const edge={...target,[q.axis]:target[q.axis]+q.sign*4},top={...edge,y:pose.y+31},route=[hand,out,lift,top,edge,target];for(let i=1;i<route.length;i++)ok(clear(route[i-1],route[i]),'この場所は柱や階段のうしろだよ。別の面をえらぼう。');result.push({pixel,rect:r,local:target,points:route.map(p=>highWorldPoint(record.site,p))});}
 ok(result.length,'室内から見える面をえらぼう。');return result;
}
const cache=new Map();
export function roomPaintTarget(w,q){
 if(q.decor)return decorPaintTarget(w,q.target);
 const key=JSON.stringify([w.blueprint,w.levels,w.boardBayRetrofit,w.roomLayout,q.level,q.part,q.face]);if(cache.has(key))return cache.get(key);
 const p=buildingPaintPart(w.blueprint,q.level,q.part),patches=buildingPaintPatches(w.blueprint,q.level,q.part,q.face,true),visible=patches.find(p=>p.area>0);ok(visible,'室内から見える面をえらぼう。');const y=(q.level-1)*40,entry=stairEntry(w,y),boxes=highWorkSolids(w);
 const candidates=highRoomNodes(w,y).map(n=>({...n,d:Math.hypot(n.x-p.x,n.z-p.z),heading:Math.atan2(p.x-n.x,p.z-n.z)})).filter(n=>n.d>=17&&n.d<=100&&(n[visible.axis]-visible.plane)*visible.sign>5&&turnClear(n,boxes)).sort((a,b)=>a.d-b.d||a.z-b.z||a.x-b.x);
 for(const n of candidates){const stance=point(n.x,y,n.z,n.heading),route=roomGraphRoute(w,entry,stance);if(!route)continue;try{roomPaintToolPaths({site:{x:0,y:0,z:0,turn:0},work:w},{...q,pixels:Array.from({length:16},(_,i)=>i)},patches,null,[],stance);}catch{continue;}const result={stance,entry:[stairExit(w,y),...route]};result.entry.forEach(Object.freeze);Object.freeze(result.entry);Object.freeze(stance);Object.freeze(result);if(cache.size>=256)cache.clear();cache.set(key,result);return result;}
 throw Error('室内の通路から手が届く面をえらぼう。');
}
export function roomPaintRoute(w,q=null,extra=[]){
 const fromFloor=Math.round(w.actor.y/40),current=w.interiorPaintStation?roomPaintTarget(w,w.interiorPaintStation):null,fromInside=!!w.interiorLayoutStation||!!current||w.actor.y>0&&Math.abs(w.actor.x)<80&&Math.abs(w.actor.z)<80;
 const exit=fromInside?roomGraphRoute(w,w.actor,stairEntry(w,w.actor.y),extra):null;ok(!fromInside||exit,'階段への道をあけよう。');
 const start=fromInside?[...exit,stairExit(w,w.actor.y)]:stairPlacement(w)?stairApproach(w,w.actor):[w.actor,point(w.actor.x,0,248),point(-48,0,248),point(-48,0,72)],from=fromInside?fromFloor:0,to=q?q.level-1:0,target=q?roomPaintTarget(w,q):null;
 if(current&&q&&from===to){const direct=roomGraphRoute(w,w.actor,target.stance,extra);ok(direct,'室内の通路をあけよう。');return direct;}
 const spine=highInnerRoute(Math.max(from,to),w),at=f=>f===0?0:spine.findIndex(p=>p.x===stairExit(w,f*40).x&&p.y===f*40&&p.z===stairExit(w,f*40).z),a=at(from),b=at(to),steps=a<=b?spine.slice(a,b+1):spine.slice(b,a+1).reverse();
 if(target)return[...start,...steps.slice(1),...(to===0?[stairExit(w,0)]:[]),...target.entry.slice(1)];
 return[...start,...steps.slice(1),...(stairPlacement(w)?stairApproach(w,point(-188,0,248,Math.PI)).reverse():[point(-48,0,72),point(-48,0,248),point(-188,0,248,Math.PI)])];
}
export function roomPaintCamera(record,q){
 if(q.decor)return decorPaintCamera(record,q.target);
 const p=buildingPaintPart(record.work.blueprint,q.level,q.part),patch=buildingPaintPatches(record.work.blueprint,q.level,q.part,q.face,true).find(p=>p.area),pose=roomPaintTarget(record.work,q).stance,base=(q.level-1)*40,surface={...p,[patch.axis]:patch.plane},worker={x:pose.x,y:base+14,z:pose.z},focus={x:(surface.x+pose.x)/2,y:base+16,z:(surface.z+pose.z)/2},boxes=highWorkSolids(record.work).map(p=>roomPaintVisiblePart(p,q.level-1)).filter(Boolean),others=highWorkSolids(record.work).filter(b=>!['x','y','z','w','h','d'].every(k=>b[k]===p[k])).map(p=>roomPaintVisiblePart(p,q.level-1)).filter(Boolean);
 const samples=[worker,{...worker,y:base+26},...[-12,12].flatMap(x=>[-12,12].map(z=>({x:pose.x+x,y:base+14,z:pose.z+z})))],paintPoints=buildingPaintPatches(record.work.blueprint,q.level,q.part,q.face,true).flatMap(p=>p.rects.map(r=>{const t={x:0,y:(r.y0+r.y1)/2,z:0};t[p.axis]=p.plane;t[p.tan]=(r.x0+r.x1)/2;return t;})),cameras=[-112,-88,8,16,24,40,48,56,88,112].flatMap(x=>[-56,-48,-40,-24,-16,-8,8,16,24,40,48,56].map(z=>({x,z}))).sort((a,b)=>Math.abs(Math.hypot(a.x-focus.x,a.z-focus.z)-65)-Math.abs(Math.hypot(b.x-focus.x,b.z-focus.z)-65));
 for(const n of cameras)for(const y of[base+31.5,base+30]){const local={x:n.x,y,z:n.z};if(Math.hypot(n.x-pose.x,n.z-pose.z)<24)continue;if((local[patch.axis]-patch.plane)*patch.sign<4)continue;const actor={...worker,w:25,h:27,d:25};if(paintPoints.some(v=>others.some(b=>upperSegmentHitsBox(v,local,b,.1)))||samples.some(v=>boxes.some(b=>upperSegmentHitsBox(v,local,b,.1))))continue;return{target:highWorldPoint(record.site,focus),position:highWorldPoint(record.site,local),surface:highWorldPoint(record.site,surface)};}
 return{target:highWorldPoint(record.site,surface),position:highWorldPoint(record.site,{x:pose.x,y:base+30,z:pose.z}),surface:highWorldPoint(record.site,surface)};
}

// Drawing only: keep the actual staircase and its collisions for every walk.
export function roomPaintVisiblePart(p,floor,ceiling=false){const top=floor*40+(ceiling?40.01:32),low=p.y-p.h/2;if(low>=top||p.kind==='stair'&&p.y+p.h/2>floor*40+.01)return null;return p.y+p.h/2>top?{...p,h:top-low,y:(top+low)/2}:p;}

