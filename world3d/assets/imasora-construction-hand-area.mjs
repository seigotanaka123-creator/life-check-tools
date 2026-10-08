import {shovelDropTarget,shovelStanding,shovelGroundHeight,walkShovelWork,turnShovelWork} from './imasora-construction-shovel-work.mjs';
import {SITE,WALKER} from './imasora-construction-loader-physics.js';

// Selection covers the yard. The actual placement remains a short, checked
// shovel stroke: plan real walking to a safe stance, never relocate the actor.
export const HAND_AREA_SEARCH_LIMIT=8192;
export const handAreaEnvironment=s=>JSON.stringify([s.soil.revision,s.dump,s.machineArm??null]);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const facing=(p,t)=>Math.atan2(t[0]-p.x,t[2]-p.z);
const inside=p=>p.x>=SITE.minX+WALKER.radius&&p.x<=SITE.maxX-WALKER.radius&&p.z>=SITE.minZ+WALKER.radius&&p.z<=SITE.maxZ-WALKER.radius;

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
 const issue=t=>({point:Array.isArray(point)?[...point]:null,target:null,points:null,issue:t,visited:0});
 if(s.job||s.soil.pending||!s.soil.containers.shovel.amount)return issue('土を持ってから置き先を選んでください。');
 if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite))return issue('地面や土の上面を選んでください。');
 const x=Math.floor(point[0]/4)*4,z=Math.floor(point[1]/4)*4;
 if(x<SITE.minX||x+4>SITE.maxX||z<SITE.minZ||z+4>SITE.maxZ)return issue('工事区画の中を選んでください。');
 if(!shovelStanding(s,s.player))return issue('足元が変わりました。移動できる場所を確認してください。');
 const heights=[0,1].flatMap(dx=>[0,1].map(dz=>shovelGroundHeight(s,x+dx*2+1,z+dz*2+1,256))),y=Math.max(...heights);
 if(heights.some(h=>Math.abs(h-y)>.05)||Math.abs(Math.round(y/2)*2-y)>.05)return issue('土全体が載る平らな上面を選んでください。');
 const target=[x+2,y+2,z+2],selected=[x,z],environment=handAreaEnvironment(s);
 const result=(p,points,visited=0)=>({point:selected,target,points,heading:facing(p,target),environment,issue:'',visited});
 const directly=turnShovelWork(s,facing(s.player,target));
 if(shovelDropTarget(directly,selected))return result(s.player,[]);
 const goals=[],angle=Math.atan2(s.player.x-target[0],s.player.z-target[2]);
 for(const radius of [24,32,44])for(let i=0;i<16;i++){
  if(cancelled())return issue('置き先の確認を中止しました。');
  const offset=i===0?0:(i%2?1:-1)*Math.ceil(i/2)*Math.PI/8,a=angle+offset;
  const p={...s.player,x:target[0]+Math.sin(a)*radius,z:target[2]+Math.cos(a)*radius};
  p.y=shovelGroundHeight(s,p.x,p.z,256);p.heading=facing(p,target);
  if(inside(p)&&shovelStanding(s,p)&&shovelDropTarget({...s,player:p},selected))goals.push(p);
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
   const ix=n.ix+dx,iz=n.iz+dz,key=ix+','+iz,p={x:root.x+ix*8,z:root.z+iz*8};if(closed.has(key)||!inside(p))continue;
   const g=n.g+Math.hypot(dx,dz)*8;if(g>=(best.get(key)??Infinity))continue;
   p.y=shovelGroundHeight(s,p.x,p.z,n.y);const next=line(frame,p);if(!next)continue;
   const node={...p,y:next.player.y,g,score:g+heuristic(p),key,ix,iz,parent:n};best.set(key,g);queue.push(node);
  }
  if(visited%24===0)await yieldNow();
 }
 return{...issue('置き先までの通り道がありません。土は手元に残ります。'),target,visited};
}
