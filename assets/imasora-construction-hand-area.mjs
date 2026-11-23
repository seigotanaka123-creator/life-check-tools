import {transportArea,transportDigProtection} from './imasora-construction-transport-field.mjs?v=120ov';
import {shovelDropTarget,shovelDropSurface,shovelStanding,shovelGroundHeight,walkShovelWork,turnShovelWork,shovelMachines,shovelDumpBody,shovelNearbySoil,shovelSegmentHits} from './imasora-construction-shovel-work.mjs?v=120pv';
import {SITE,WALKER} from './imasora-construction-loader-physics.js?v=120ov';
import {boxesOverlap3D} from './imasora-construction-native-dump-pose.mjs?v=120pv';
import {HAND_EARTH_SHAPES,SOIL_CAPACITY,handEarthOnSurface,handEarthPositions,handEarthPlacedPiece,soilTransportCommand,soilVoxel} from './imasora-construction-soil-transport.mjs?v=120pv';

// Selection covers the yard. The actual placement remains a short, checked
// shovel stroke: plan real walking to a safe stance, never relocate the actor.
export const HAND_AREA_SEARCH_LIMIT=8192;
export const handAreaEnvironment=s=>JSON.stringify([s.soil.revision,s.dump,s.machineArm??null,s.machineVehicle??null,s.soil.field??null]);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const facing=(p,t)=>Math.atan2(t[0]-p.x,t[2]-p.z);
const inside=(p,s)=>{const SITE=transportArea(s);return p.x>=SITE.minX+WALKER.radius&&p.x<=SITE.maxX-WALKER.radius&&p.z>=SITE.minZ+WALKER.radius&&p.z<=SITE.maxZ-WALKER.radius;};

const EARTH_REACH=42;
function idleHandEarth(work){
 return work?.mode==='foot'&&work.frame.soil.schema===3&&!work.scoop&&!work.link&&!work.unload&&!work.frame.job&&!work.frame.soil.pending&&!work.frame.soil.containers.shovel.amount;
}
export function arriveHandEarth(work,position){
 if(!idleHandEarth(work)||!position||!['x','y','z','heading'].every(key=>Number.isFinite(position[key]))||Math.abs(position.heading)>Math.PI)throw Error('手に持った土や車の作業を終えてから始めてください。');
 const player={...work.frame.player,...position};
 if(!shovelStanding(work.frame,player))throw Error('足元が安定した地面で始めてください。');
 return updatedHandEarth(work,{player});
}
export function handEarthBox(base,shape){
 const height=HAND_EARTH_SHAPES[shape].height;
 return {position:[base[0]*2+4,base[1]*2+height/2,base[2]*2+4],half:[4,height/2,4]};
}
export function planHandEarth(work,action,shape,point=null){
 const issue=(reason,preview={})=>({reason,...preview});
 if(!idleHandEarth(work))return issue('手に持った土や車の作業を終えてから、手でつくろう。');
 if(!Object.hasOwn(HAND_EARTH_SHAPES,shape)||!['place','remove'].includes(action))return issue('先に置く形と操作を選んでください。');
 const f=work.frame,p=f.player,soil=f.soil,a=transportArea(f);
 if(point!==null&&(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite)))return issue('近くの土の上を選んでください。');
 const [aimX,aimZ]=point??[p.x+Math.sin(p.heading)*27,p.z+Math.cos(p.heading)*27];
 const x=Math.floor(aimX/8)*8,z=Math.floor(aimZ/8)*8,cx=x+4,cz=z+4;
 if(x<a.minX||z<a.minZ||x+8>a.maxX||z+8>a.maxZ)return issue('工事現場の中を選んでください。');
 const top=shovelGroundHeight(f,cx,cz,p.y+30);
 if(!Number.isFinite(top)||top< -32||top>250)return issue('土の上面を選んでください。');
 const base=[x/2,Math.round(top/2),z/2];
 if(action==='remove'){
  const hit=Object.keys(HAND_EARTH_SHAPES).map(k=>[k,[base[0],base[1]-HAND_EARTH_SHAPES[k].height/2,base[2]]])
   .find(([k,b])=>handEarthPlacedPiece(soil,b)?.shape===k);
  if(!hit)return issue('回収できるのは、手で置いた一番上の土です。');
  [shape]=hit;base[1]=hit[1][1];
 }
 const box=handEarthBox(base,shape),positions=handEarthPositions(base,shape);
 const preview={base,shape,positions,target:box.position,box};
 if(Math.abs(top-Math.round(top/2)*2)>.01)return issue('高さがそろった地面を選んでください。',preview);
 if(Math.hypot(cx-p.x,cz-p.z,box.position[1]-p.y-9)>EARTH_REACH)return issue('手が届くところまで近づいてください。',preview);
 const protection=transportDigProtection(f,cx,cz,4.001);if(protection)return issue('舗装の外の土に作れます。',preview);
 if(!handEarthOnSurface(soil,base,shape))return issue('足元が平らで、上に何もない場所を選んでください。',preview);
 const above={position:[cx,box.position[1]+box.half[1]+.5,cz],half:[4,.5,4]};
 const units=shovelNearbySoil(soil,cx,cz,8);
 if(action==='place'&&units.some(b=>boxesOverlap3D(box,b)))return issue('選んだ場所に土があります。',preview);
 if(action==='remove'){
  if(positions.some(cell=>soilVoxel(soil,cell)!=='earth-soil'))return issue('すでに削れた部分があり、この形のままでは回収できません。',preview);
  if(units.some(b=>boxesOverlap3D(above,b)))return issue('上にある土を先に回収してください。',preview);
 }
 const player={position:[p.x,p.y+WALKER.height/2,p.z],half:[WALKER.radius,WALKER.height/2,WALKER.radius]};
 const obstacles=[...shovelMachines(f),shovelDumpBody(f)],guard=action==='remove'?{...box,position:[cx,box.position[1]+5,cz],half:[4,box.half[1]+5,4]}:box;
 const hand=[p.x,p.y+16,p.z];
 if([player,...obstacles].some(b=>boxesOverlap3D(guard,b))||obstacles.some(b=>shovelSegmentHits(hand,box.position,b,0)))return issue('体や重機が重なっています。少し離れてください。',preview);
 const surface=[cx,box.position[1]+box.half[1]+.25,cz];
 const reachSoil=shovelNearbySoil(soil,(p.x+cx)/2,(p.z+cz)/2,EARTH_REACH/2+4);
 if(reachSoil.some(b=>shovelSegmentHits(hand,surface,b,0)))return issue('手前の土がじゃましています。別の方向から近づいてください。',preview);
 const stock=soil.containers.storage,amount=HAND_EARTH_SHAPES[shape].amount;
 if(stock.materialId&&stock.materialId!=='earth-soil')return issue('保管箱には別の土が入っています。',preview);
 if(action==='place'&&stock.amount<amount)return issue('保管箱の建築用の土が足りません。',preview);
 if(action==='remove'&&stock.amount+amount>SOIL_CAPACITY.storage)return issue('保管箱に土を戻す空きがありません。',preview);
 return {reason:'',...preview};
}
function updatedHandEarth(work,frame){
 return {...work,revision:work.revision+1,frame:{...work.frame,...frame,revision:work.frame.revision+1}};
}
export function editHandEarth(work,action,shape,point,id){
 const plan=planHandEarth(work,action,shape,point);
 if(plan.reason)throw Error(plan.reason);
 const before=work.frame.soil;
 const soil=soilTransportCommand(before,{type:'hand-earth',action,shape:plan.shape,base:plan.base,id,expectedRevision:before.revision});
 return soil===before?work:updatedHandEarth(work,{soil});
}

function line(s,to){
 const length=distance(s.player,to);let next=s;
 for(let i=0;i<Math.ceil(length/6)+1;i++){
  const p=next.player,dx=to.x-p.x,dz=to.z-p.z,d=Math.hypot(dx,dz);
  if(d<1e-6)return Math.abs(p.y-to.y)<.05?next:null;
  const moved=walkShovelWork(next,dx/d,dz/d,Math.min(.05,d/(WALKER.speed*2.5)),{fast:true});
  if(moved===next||distance(moved.player,to)>=d-1e-8)return null;
  next=moved;
 }
 return null;
}

// Heap and grid are bounded by the physical yard, with time-sliced expansion.
class Queue{
 values=[];
 push(n){const a=this.values;a.push(n);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].score<=n.score)break;a[i]=a[p];i=p;}a[i]=n;}
 pop(){const a=this.values,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1].score<a[j].score)j++;if(a[j].score>=last.score)break;a[i]=a[j];i=j;}a[i]=last;}return first;}
}

export async function planHandArea(s,point,{yieldNow=()=>Promise.resolve(),cancelled=()=>false}={}){
 const SITE=transportArea(s);const issue=t=>({point:Array.isArray(point)?[...point]:null,target:null,points:null,issue:t,visited:0});
 if(s.job||s.soil.pending||!s.soil.containers.shovel.amount)return issue('土を持ってから置き先を選んでください。');
 if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite))return issue('地面や土の上面を選んでください。');
 const x=Math.floor(point[0]/4)*4,z=Math.floor(point[1]/4)*4;
 if(x<SITE.minX||x+4>SITE.maxX||z<SITE.minZ||z+4>SITE.maxZ)return issue('工事現場の中を選んでください。');
 if(!shovelStanding(s,s.player))return issue('足元が変わりました。移動できる場所を確認してください。');
 const selected=[x,z],surface=shovelDropSurface(s,selected);
 if(!surface)return issue('土を受け止められる地面や盛土を選んでください。');
 const target=surface.target,environment=handAreaEnvironment(s);
 const result=(p,points,visited=0)=>({...shovelDropTarget({...s,player:{...p,heading:facing(p,target)}},selected),point:selected,points,heading:facing(p,target),environment,issue:'',visited});
 const directly=turnShovelWork(s,facing(s.player,target));
 if(shovelDropTarget(directly,selected))return result(s.player,[]);
 const goals=[],angle=Math.atan2(s.player.x-target[0],s.player.z-target[2]);
 for(const radius of [24,32,44])for(let i=0;i<16;i++){
  if(cancelled())return issue('置き先の確認を中止しました。');
  const offset=i===0?0:(i%2?1:-1)*Math.ceil(i/2)*Math.PI/8,a=angle+offset;
  const p={...s.player,x:target[0]+Math.sin(a)*radius,z:target[2]+Math.cos(a)*radius};
  p.y=shovelGroundHeight(s,p.x,p.z,256);p.heading=facing(p,target);
  if(inside(p,s)&&shovelStanding(s,p)&&shovelDropTarget({...s,player:p},selected))goals.push(p);
  if(i%4===3)await yieldNow();
 }
 if(!goals.length)return issue('ここには土を置けません。車・土の重なりや置き先の高さを確認してください。');
 goals.sort((a,b)=>distance(s.player,a)-distance(s.player,b));
 for(const goal of goals){
  if(cancelled())return issue('置き先の確認を中止しました。');
  if(line(s,goal))return result(goal,[[goal.x,goal.z]]);
  await yieldNow();
 }
 const heuristic=p=>Math.min(...goals.map(g=>distance(p,g))),queue=new Queue(),best=new Map(),closed=new Set();
 const root={x:s.player.x,z:s.player.z,y:s.player.y,g:0,key:'0,0',ix:0,iz:0,parent:null};root.score=heuristic(root);queue.push(root);best.set(root.key,0);
 let visited=0;
 while(queue.values.length&&visited<HAND_AREA_SEARCH_LIMIT){
  if(cancelled())return issue('置き先の確認を中止しました。');
  const n=queue.pop();if(closed.has(n.key))continue;closed.add(n.key);visited++;
  const frame={...s,player:{...s.player,x:n.x,y:n.y,z:n.z}};
  for(const goal of goals)if(distance(n,goal)<=14&&line(frame,goal)){
   const points=[[goal.x,goal.z]];for(let p=n;p.parent;p=p.parent)points.push([p.x,p.z]);points.reverse();return result(goal,points,visited);
  }
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const ix=n.ix+dx,iz=n.iz+dz,key=ix+','+iz,p={x:root.x+ix*8,z:root.z+iz*8};if(closed.has(key)||!inside(p,s))continue;
   const g=n.g+Math.hypot(dx,dz)*8;if(g>=(best.get(key)??Infinity))continue;
   p.y=shovelGroundHeight(s,p.x,p.z,n.y);const next=line(frame,p);if(!next)continue;
   const node={...p,y:next.player.y,g,score:g+heuristic(p),key,ix,iz,parent:n};best.set(key,g);queue.push(node);
  }
  if(visited%24===0)await yieldNow();
 }
 return{...issue('置き先までの通り道がありません。土は手元に残ります。'),target,visited};
}
