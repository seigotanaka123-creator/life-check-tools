// Short, untimed cargo route. State lives inside the existing coast save and
// work history. These stars never mint coins or building materials.
export const COAST_VOYAGE = Object.freeze([
 Object.freeze({x:160,z:735,radius:64,name:'① 沖のうき'}),
 Object.freeze({x:-60,z:735,radius:64,name:'② 波の通り道'}),
 Object.freeze({x:-280,z:735,radius:65,name:'③ 荷受けブイ'})
]);
export const COAST_VOYAGE_BUOYS=Object.freeze(COAST_VOYAGE.flatMap((g,i)=>{
 const from=i?COAST_VOYAGE[i-1]:{x:340,z:642},dx=g.x-from.x,dz=g.z-from.z,d=Math.hypot(dx,dz);
 return[-1,1].map(side=>Object.freeze({x:g.x+side*dz/d*110,z:g.z-side*dx/d*110,gate:i}));
}));
export const COAST_VOYAGE_SOLIDS=Object.freeze(COAST_VOYAGE_BUOYS.map(g=>Object.freeze({x:g.x,z:g.z,halfX:6,halfZ:6,minY:-14,maxY:24})));
// Old cargo courses retain their buoys; ordinary island sailing has no course props.
const noCourseSolids=Object.freeze([]);
export const coastVoyageSolids=s=>s?.voyage?COAST_VOYAGE_SOLIDS:noCourseSolids;
export function validateCoastVoyage(v){
 const ok=(x)=>{if(!x)throw Error('荷物の航路の記録が違います。');};
 ok(v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).sort().join('|')==='board|cargo|done|hold|stage');
 ok(typeof v.board==='string'&&typeof v.cargo==='string'&&/^sea-\d+$/.test(v.board)&&/^sea-\d+$/.test(v.cargo)&&v.board!==v.cargo);
 ok(Number.isSafeInteger(v.stage)&&v.stage>=0&&v.stage<=3&&Number.isSafeInteger(v.hold)&&v.hold>=0&&v.hold<=360&&typeof v.done==='boolean');
 ok(v.done===(v.stage===3)&&(!v.done||v.hold===360)&&(!(v.stage<2)||v.hold===0));
 return v;
}
export const newCoastVoyage=(board,cargo)=>({board,cargo,stage:0,hold:0,done:false});
export function advanceCoastVoyage(v,{point,loaded,aboard,speed=Infinity,tilt=180}){
 if(!v||v.done)return;
 if(!loaded||!aboard||!point){v.hold=0;return;}
 const target=COAST_VOYAGE[v.stage],inside=Math.hypot(point[0]-target.x,point[1]-target.z)<=target.radius;
 // At a fixed 120 Hz the boat travels less than one unit per step. Requiring
 // an actual in-zone sample avoids crediting a skipped/teleported waypoint.
 if(v.stage<2){if(inside){v.stage++;v.hold=0;}return;}
 if(inside&&speed<8&&tilt<22)v.hold=Math.min(360,v.hold+1);else v.hold=Math.max(0,v.hold-3);
 if(v.hold===360){v.done=true;v.stage=3;}
}
