import {COAST_ISLANDS} from './imasora-coast-geography.mjs?v=120li';
const DX=COAST_ISLANDS[0].shiftX,DZ=COAST_ISLANDS[0].shiftZ;
// The boardwalk extends the island without changing saved sand or anchor depths.
// These exact boxes are used by rendering, walking and rigid-body contact.
const slab=(id,x,z,halfX,halfZ,top)=>Object.freeze({id:'island-path-'+id,x:x+DX,z:z+DZ,halfX,halfZ,minY:top-4,maxY:top});
export const ISLAND_PATH=Object.freeze({
 name:'貝がらの島の渡り道',gapX:-510+DX,gapZ:1220+DZ,
 home:Object.freeze({x:-448+DX,y:10,z:1184+DZ}),
 decks:Object.freeze([
  slab('shore',-460,1220,32,48,10),
  slab('overlook',-556,1220,28,48,10),
  // The short bridge has a real 36-unit opening. The low, open south route
  // remains available for a first visit, jumping and experimentation.
  slab('side-a',-460,1284,32,16,10),
  slab('side-b',-508,1284,16,16,10),
  slab('side-c',-556,1284,32,16,10)
 ])
});
export const ISLAND_PATH_SOLIDS=Object.freeze([
 ...ISLAND_PATH.decks,
 ...ISLAND_PATH.decks.flatMap((d,i)=>[-1,1].map(side=>Object.freeze({id:d.id+'-post-'+side,x:d.x+side*(d.halfX-5),z:d.z,halfX:2.5,halfZ:2.5,minY:-65,maxY:d.minY})))
]);
const board=Object.freeze({id:'island-board-preview',type:'board',p:Object.freeze([-460+DX,13.8,1220+DZ]),q:Object.freeze([0,0,0,1]),v:Object.freeze([0,0,0]),w:Object.freeze([0,0,0])});
const props=Object.freeze([board]),none=Object.freeze([]);
export const coastIslandProps=s=>!s.islandBoard&&s.parts.filter(p=>p.type==='board').length<3&&s.parts.length<13?props:none;
const boardSolid=Object.freeze([{id:'island-board-preview',x:board.p[0],z:board.p[2],halfX:32,halfZ:27,minY:10.8,maxY:16.8}]);
export const coastIslandPropSolids=s=>coastIslandProps(s).length?boardSolid:none;
export function islandPathSurface(x,z){
 if(x< -588+DX||x> -428+DX||z<1172+DZ||z>1300+DZ)return -Infinity;
 let y=-Infinity;for(const d of ISLAND_PATH.decks)if(Math.abs(x-d.x)<=d.halfX&&Math.abs(z-d.z)<=d.halfZ)y=Math.max(y,d.maxY);return y;
}
// Recovery is only offered around this new boardwalk, never on unseen islands.
export function islandPathRecovery(x,z,isClear=()=>true){
 if(Math.hypot(x-DX+510,z-DZ-1230)>=155)return null;
 const candidates=[ISLAND_PATH.home];
 for(const d of ISLAND_PATH.decks)for(const dx of[-16,0,16])for(const dz of[-24,0,24]){
  if(Math.abs(dx)>d.halfX-10||Math.abs(dz)>d.halfZ-10)continue;
  candidates.push({x:d.x+dx,y:d.maxY,z:d.z+dz});
 }
 const p=candidates.find(isClear);return p?{...p}:null;
}
export function createCoastIslandPathTools({ok,newPart,obb,overlap}){
 function take(s,{actor}={}){
  ok(!s.islandBoard&&coastIslandProps(s).length,'この板はもう使っているよ。');
  ok(actor&&[actor.x,actor.y,actor.z].every(Number.isFinite)&&Math.hypot(actor.x-board.p[0],actor.z-board.p[2])<=125&&Math.abs(actor.y-board.p[1])<55,'板のそばで引いてみよう。');
  const box=obb(board),body={p:[actor.x,actor.y+20,actor.z],axes:[[1,0,0],[0,1,0],[0,0,1]],half:[9,19,9]};
  ok(!overlap(box,body)&&!s.parts.some(p=>overlap(box,obb(p))),'板から少し離れて、横から引こう。');
  // Scenery contact starts on the next fixed solver step, at the same pose.
  const p=newPart('board','sea-'+s.serial++,board.p,board.q);s.parts.push(p);s.islandBoard={version:1,id:p.id};return p;
 }
 function validate(s){if(s.islandBoard===undefined)return;const b=s.islandBoard;ok(b&&Object.getPrototypeOf(b)===Object.prototype&&Object.keys(b).sort().join('|')==='id|version'&&b.version===1&&/^sea-\d+$/.test(b.id)&&!['sea-2','sea-5'].includes(b.id)&&s.parts.some(p=>p.id===b.id&&p.type==='board'),'島の板の記録が違います。');}
 return{take,validate};
}
