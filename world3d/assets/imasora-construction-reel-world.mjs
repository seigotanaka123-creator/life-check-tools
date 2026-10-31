import{validateTankWaterReceipt}from'./imasora-construction-tank-water-history.mjs?v=120ph';
import{rampItems,rampParts}from'./imasora-construction-reel-ramp.mjs?v=120oz';
import{girders}from'./imasora-construction-girder-shape.mjs?v=120pl';
import{isCapturedConstructionJson}from'./imasora-construction-json-capture.mjs';
import{floorParts,stairItems,stairParts,stairTransition}from'./imasora-construction-reel-stairs.mjs?v=120pi';
import{newReel,readReel,commitReel,undoReel,reelParts,reelVolume}from'./imasora-construction-reel.mjs?v=120ps';
import{FIELD}from'./imasora-construction-shared-field.mjs?v=120ey';
const ok=(v,m)=>{if(!v)throw Error(m);},keys=(o,k)=>o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).sort().join('|')===k;
export const reelWorld=c=>c?.version===6?c.reel:null;
export function validateWorldReel(s){
 ok(keys(s,s?.version>=3?'book|nextId|past|rooms|selected|version':'nextId|past|rooms|selected|version')&&readReel(JSON.stringify(s),FIELD),'建築リールの記録を残して止めたよ。');
 for(const h of s.past){ok(keys(h,s.version>=6&&h.tankWater?'rooms|selected|tankWater':'rooms|selected'),'もどす前の記録をたしかめよう。');if(h.tankWater)validateTankWaterReceipt(h.tankWater);}
 for(const rooms of[s.rooms,...s.past.map(h=>h.rooms)])for(const r of rooms)ok(keys(r,(Object.hasOwn(r,'floorMaterial')?'floorMaterial|':'')+(r.structure?'id|structure|walls|x0|x1|y|z0|z1':'id|walls|x0|x1|y|z0|z1'))&&Number.isFinite(r.y)&&(!r.structure||s.version>=2),'床と部品の記録をたしかめよう。');return s;
}
export function editWorldReel(old,a){
 const before=old??newReel();if(old)validateWorldReel(old);
 if(a.type==='REEL_UNDO'){ok(keys(a,'type')&&before.past.length,'もどせる作業はまだないよ。');ok(!girders(before.rooms).some(g=>g.item.stage==='carried'),'運んでいる梁を据え付けてから、もどそう。');ok(!before.past.at(-1).tankWater,'庭とタンクの水をいっしょにもどそう。');const next=undoReel(before);for(const g of girders(next.rooms)){const live=girders(before.rooms).find(p=>p.room.id===g.room.id&&p.item.id===g.item.id);if(live?.item.stage==='installed')Object.assign(g.item,live.item);else ok(g.item.stage!=='carried','運搬途中の梁へは戻せないよ。');}return validateWorldReel(next);}
 ok(keys(a,'edit|type')&&a.type==='REEL_EDIT','建築リールの道具をえらび直そう。');const e=a.edit;
 const shapes={PIPE_BRANCH:'id|parentId|segment|side|to|toRoom|type',PIPE_NETWORK_SEND:'amountQ|from|id|to|toRoom|type',PIPE_LINK:'from|id|side|to|toRoom|type',PIPE_SEND:'amountQ|detailId|id|reverse|type',PIPE_TRANSFER:'amountQ|detailId|from|id|type',LEVEL_COPY:'count|id|type',FLOOR:'baseY|end|start|type',WALL:'height|id|side|type',RESIZE:'coordinate|id|side|type',DETAIL:'id|item|type',DETAIL_REMOVE:'detailId|id|type',DOOR_TOGGLE:'detailId|id|type',FLOOR_REPEAT:'count|id|side|type',WALL_REPEAT:'count|direction|id|side|type',COLUMN_ARRAY:'axis|count|detailId|direction|id|spacing|type',RAIL_RUN:'end|height|id|side|start|type',BOOK_SAVE:'id|name|type',BOOK_REMOVE:'designId|type',BOOK_PLACE:'baseY|designId|turn|type|x|z'};ok(e&&Object.hasOwn(shapes,e.type),'作る場所をえらび直そう。');ok(keys(e,e.type==='BOOK_SAVE'&&Object.hasOwn(e,'levels')?'id|levels|name|type':e.type==='FLOOR'&&Object.hasOwn(e,'material')?'baseY|end|material|start|type':e.type==='RAIL_RUN'&&Object.hasOwn(e,'material')?'end|height|id|material|side|start|type':shapes[e.type]),'作る形をえらび直そう。');
 if(e.type==='DETAIL'&&['riser','branch'].includes(e.item?.kind))throw Error('配管はタンクどうしを押してつなごう。');
 if(e.type==='DETAIL'&&e.item?.kind==='girder')ok(e.item.id===0&&e.item.stage==='ready','大型梁は用意してからクレーンで据え付けよう。');
 if(girders(before.rooms).some(g=>g.item.stage==='carried'))throw Error('運んでいる梁を据え付けてから、建築しよう。');
 if(e.type==='FLOOR')ok(keys(e.start,'x|z')&&keys(e.end,'x|z')&&Number.isFinite(e.baseY)&&e.baseY>=-32&&e.baseY<=48,'床の高さをたしかめよう。');
 const result=commitReel(before,e,FIELD);ok(!result.problem,result.problem);ok(result.changed,'形は変わっていないよ。');return validateWorldReel(result.state);
}
export const reelWorldParts=c=>reelParts(reelWorld(c)?.rooms??[]).map(p=>({...p,id:'reel-'+p.id+'-'+(p.key??p.side??p.kind),angle:0}));
export const reelTimber=c=>reelVolume(reelWorld(c)?.rooms??[]);
export const reelDecoration=c=>(reelWorld(c)?.rooms??[]).reduce((n,r)=>n+(r.structure?.items??[]).filter(i=>['door','window','furniture'].includes(i.kind)).length,0);
// Check the solid volume that this edit adds. An existing contact beside an
// unchanged floor must not prevent extending its other end.
export function reelAddedParts(before,after){const old=reelWorldParts(before),byId=new Map(old.map(p=>[p.id,p])),added=[];for(const p of reelWorldParts(after)){const same=byId.get(p.id);if(same&&['x','y','z','w','h','d'].every(k=>same[k]===p[k]))continue;let pending=[p];for(const b of old){const next=[];for(const q of pending){const lo=[q.x-q.w/2,q.y-q.h/2,q.z-q.d/2],hi=[q.x+q.w/2,q.y+q.h/2,q.z+q.d/2],cutLo=[b.x-b.w/2,b.y-b.h/2,b.z-b.d/2].map((v,i)=>Math.max(v,lo[i])),cutHi=[b.x+b.w/2,b.y+b.h/2,b.z+b.d/2].map((v,i)=>Math.min(v,hi[i]));if(cutLo.some((v,i)=>v>=cutHi[i]-.00001)){next.push(q);continue;}const put=(l,h)=>{if(h.every((v,i)=>v-l[i]>.00001))next.push({...q,x:(l[0]+h[0])/2,y:(l[1]+h[1])/2,z:(l[2]+h[2])/2,w:h[0]-l[0],h:h[1]-l[1],d:h[2]-l[2]});};for(let axis=0;axis<3;axis++){const l=lo.slice(),h=hi.slice();h[axis]=cutLo[axis];put(l,h);const l2=lo.slice(),h2=hi.slice();l2[axis]=cutHi[axis];put(l2,h2);lo[axis]=cutLo[axis];hi[axis]=cutHi[axis];}}pending=next;if(!pending.length)break;}added.push(...pending);}return added;}
export function reelGeometry(c){const parts=reelWorldParts(c);return{surfaces:parts.filter(p=>p.kind!=='glass').map(p=>({...p,y:p.y+p.h/2,underside:p.y-p.h/2})),boxes:parts.filter(p=>p.kind!=='floor'&&p.kind!=='stair-tread')};}
const walkCache=new WeakMap();function walkParts(s){if(!s)return[];const trusted=isCapturedConstructionJson(s),cached=trusted?walkCache.get(s):null;if(cached)return cached;const parts=(s.rooms??[]).flatMap(r=>floorParts(r).concat(stairItems(r).flatMap(i=>stairParts(r,i).filter(p=>p.kind==='stair-tread')),rampItems(r).flatMap(i=>rampParts(r,i).filter(p=>p.kind==='ramp-tread'))));if(trusted)walkCache.set(s,parts);return parts;}
export function reelTop(s,x,z,maxY=Infinity){let top=null;for(const p of walkParts(s))if(Math.abs(x-p.x)<=p.w/2+.001&&Math.abs(z-p.z)<=p.d/2+.001&&p.y+p.h/2+(p.supportSlopeX??0)*(x-p.x)+(p.supportSlopeZ??0)*(z-p.z)<=maxY)top=Math.max(top??-Infinity,p.y+p.h/2+(p.supportSlopeX??0)*(x-p.x)+(p.supportSlopeZ??0)*(z-p.z));return top;}
export function reelStep(s,x,z,height){let top=null;for(const p of walkParts(s))if(Math.abs(x-p.x)<=p.w/2+.001&&Math.abs(z-p.z)<=p.d/2+.001&&p.y+p.h/2+(p.supportSlopeX??0)*(x-p.x)+(p.supportSlopeZ??0)*(z-p.z)<=height+(p.kind==='stair-tread'?6.01:3.01))top=Math.max(top??-Infinity,p.y+p.h/2+(p.supportSlopeX??0)*(x-p.x)+(p.supportSlopeZ??0)*(z-p.z));return top;}
export const reelStairPass=(s,x,z,from,to,id)=>stairTransition(s?.rooms??[],x,z,from,to,id);
// A walking descent follows one real riser at a time. Outside the flight, or
// more than one riser below the feet, the ordinary falling rules still apply.
export function reelStairGround(s,x,z,height){const y=reelStep(s,x,z,height);if(y===null)return null;for(const r of s?.rooms??[])for(const i of stairItems(r))if(stairTransition([r],x,z,height,y,'reel-'+r.id+'-stair-step-'+i.id+'-walk'))return y;return null;}

// Only a real downward crossing can land on a higher reel floor.
export function reelLanding(s,x,z,previousFeet,feet){if(![x,z,previousFeet,feet].every(Number.isFinite)||feet>previousFeet)return null;const y=reelTop(s,x,z,previousFeet+.001);return y!==null&&feet<=y+.001?y:null;}
