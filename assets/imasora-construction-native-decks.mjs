import {readReel,reelParts} from './imasora-construction-reel.mjs?v=120ps';
import {FIELD} from './imasora-construction-shared-field.mjs?v=120ey';
import {createVehicleSurfaceIndex} from './imasora-construction-vehicle-elevation.mjs?v=120ov';
import {chooseVehicleHeight} from './imasora-construction-vehicle-elevation.mjs?v=120ov';
import {rampItems,rampPoint} from './imasora-construction-reel-ramp.mjs?v=120oz';
const snapshots=new WeakMap(),geometry=new WeakMap(),checked=new WeakSet(),signatures=new WeakMap();
const sign=d=>{let s=signatures.get(d);if(!s){s=JSON.stringify(d);signatures.set(d,s);}return s;};
const freeze=d=>{if(d&&typeof d==='object'){Object.values(d).forEach(freeze);Object.freeze(d);}return d;};
// Only the current authored shapes are retained, never stock, undo history,
// expanded ramp treads or a second copy of the native earth allocation.
export function nativeDeckSnapshot(world){const reel=world?.constructionHighBuild?.reel;if(!reel?.rooms?.length)return null;let d=snapshots.get(reel);if(!d){d=freeze({version:1,rooms:structuredClone(reel.rooms)});validateNativeDecks(d);snapshots.set(reel,d);}return d;}
export function validateNativeDecks(d){
 if(checked.has(d))return d;
 if(!d||Object.getPrototypeOf(d)!==Object.prototype||Object.keys(d).sort().join('|')!=='rooms|version'||d.version!==1||!Array.isArray(d.rooms)||d.rooms.length>16)throw Error('車を支える床の記録を確認できません。');
 const s={version:4,nextId:Math.max(0,...d.rooms.map(r=>r.id))+1,selected:null,rooms:d.rooms,past:[],book:{nextId:1,entries:[]}};
 if(!readReel(JSON.stringify(s),FIELD))throw Error('車を支える床の形を確認できません。');
 freeze(d);checked.add(d);return d;
}
export function withNativeDecks(frame,d){if(frame.version!==2||!d&&!frame.decks)return frame;d??=freeze({version:1,rooms:[]});validateNativeDecks(d);if(frame.decks&&sign(frame.decks)===sign(d))return frame;return{...frame,decks:d};}
export function nativeDeckGeometry(d){if(!d)return null;validateNativeDecks(d);let g=geometry.get(d);if(g)return g;const parts=reelParts(d.rooms),surfaces=parts.filter(p=>['floor','stair-tread'].includes(p.kind)).map(p=>({...p,halfX:p.w/2,halfZ:p.d/2,height:p.y+p.h/2}));
 const ramps=d.rooms.flatMap(r=>rampItems(r).map(i=>{const a=rampPoint(r,i,0),b=rampPoint(r,i,1),axis=i.side==='east'||i.side==='west'?'x':'z',n=i.run/(i.step??4),ys=Float64Array.from({length:n+1},(_,k)=>rampPoint(r,i,k/n).y);return{axis,a:a[axis],length:b[axis]-a[axis],cross:i.center,width:i.width,n,ys,continuous:i.step===1};}));
 const cells=new Map(),wide=[];for(const p of parts){const x0=Math.floor((p.x-p.w/2)/64),x1=Math.floor((p.x+p.w/2)/64),z0=Math.floor((p.z-p.d/2)/64),z1=Math.floor((p.z+p.d/2)/64);if((x1-x0+1)*(z1-z0+1)>256){wide.push(p);continue;}for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){const key=x+','+z,a=cells.get(key)??[];a.push(p);cells.set(key,a);}}
 const near=(x,z,r)=>{const found=new Set(wide);for(let a=Math.floor((x-r)/64);a<=Math.floor((x+r)/64);a++)for(let b=Math.floor((z-r)/64);b<=Math.floor((z+r)/64);b++)for(const p of cells.get(a+','+b)??[])found.add(p);return [...found];};
 g={parts,ramps,near,index:createVehicleSurfaceIndex(surfaces,(x,z,p)=>Math.abs(x-p.x)<=p.w/2+.001&&Math.abs(z-p.z)<=p.d/2+.001)};geometry.set(d,g);return g;}
export function nativeDeckHeight(frame,x,z,earth,reference=0){const g=nativeDeckGeometry(frame.decks);if(!g)return earth;const o=frame.soil.field?.origin??[0,0],wx=x+o[0],wz=z+o[1];let y=g.index.heightAt(wx,wz,earth,reference);if(!Number.isFinite(y))return y;for(const p of g.ramps){const along=p.axis==='x'?wx:wz,cross=p.axis==='x'?wz:wx,u=(along-p.a)/p.length;if(u<0||u>1||Math.abs(cross-p.cross)>p.width/2+.001)continue;const t=u*p.n,k=Math.min(p.n-1,Math.floor(t)),h=p.continuous?p.ys[k]+(p.ys[k+1]-p.ys[k])*(t-k):(()=>{const v=(k+.5)/p.n;return p.ys[0]+(p.ys.at(-1)-p.ys[0])*v*v*(3-2*v);})();y=chooseVehicleHeight(y,[h],reference);}return y;}
export function nativeDeckBoxes(frame,{footY=null,vehicleY=null,x=null,z=null,r=180}={}){const g=nativeDeckGeometry(frame.decks);if(!g)return[];const o=frame.soil.field.origin;return (Number.isFinite(x)&&Number.isFinite(z)?g.near(x+o[0],z+o[1],r):g.parts).filter(p=>{
  if(['floor','ramp-tread','stair-tread'].includes(p.kind)){const y=p.y+p.h/2;if(Number.isFinite(footY)&&y<=footY+2.1||Number.isFinite(vehicleY)&&y<=vehicleY+8)return false;}
  return true;
 }).map(p=>({position:[p.x-o[0],p.y,p.z-o[1]],half:[p.w/2,p.h/2,p.d/2],heading:0}));}
export function nativeDeckMatchesWorld(frame,world){const d=nativeDeckSnapshot(world);return !frame.decks?!d:sign(frame.decks)===sign(d??{version:1,rooms:[]});}
