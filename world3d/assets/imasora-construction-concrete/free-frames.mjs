import {constructionBase,frameAssembly,RAISED_FRAME_ACTION} from './free-supported-build.mjs';
import {pipeContactPath} from './free-boom-contact.mjs';
import {ROUTE_EPS,pointBoxDistance,segmentBoxDistance,clearanceBlocked,hoseSegmentBlocked,externalSegmentBlocked} from './free-route-clearance.mjs';
import {makeFrameScaffold} from './free-frame-scaffold.mjs';
import {frameDeckHeight,frameWorkBoxes,frameWorkspaceBlocked,frameExterior} from './free-frame-workspace.mjs';
import {footingAt,FOOT_LEVEL_EPS,FOOTING_MESSAGE} from './free-footing.mjs';
import {walkingGroundAt} from './free-walking-ground.mjs';
import {freePlacedFill} from './free-work-parts.mjs';
import {freeFramePanels,freeCell} from './free-build-state.mjs';

export const FREE_FRAME_ACTIONS=new Set(['FREE_FRAME','FREE_FRAME_RAISED','FREE_DEMOLD','FREE_UNFRAME']);
export const FRAME_HAND_REACH=24,FRAME_TOOL_REACH=64,FRAME_GRIP_SPAN=4,FRAME_RACK={x:0,z:140},FRAME_RACK_STANCE={x:0,z:116,heading:0};
export const FRAME_WORK_TEMPO=Object.freeze({walkSpeed:210,pickup:.22,place:.3,fasten:.18,climb:.22,open:.16,close:.12});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function frameOrder(mask){return freeFramePanels(mask).sort((a,b)=>a.z-b.z||a.x-b.x||a.id.localeCompare(b.id));}
// The default datum is Y=0; an explicit saved foundation supplies a raised datum.
// Missing ground never supplies an invisible support or scaffold.
export function assertFrameFoundation(f,heightAt=()=>0,panels=null){
 const check=(x,z)=>{const h=heightAt(f.location.x+x,f.location.z+z);if(!Number.isFinite(h)||Math.abs(h-constructionBase(f))>FOOT_LEVEL_EPS)throw Error('型枠の底・足場を支える平らな地面がありません。足元の穴や段差を避けて施工してください。');};
 if(panels){for(const p of panels)for(let i=0;i<=8;i++){const offset=-8+i*2;check(p.x+(p.width>p.depth?offset:0),p.z+(p.depth>p.width?offset:0));}}
 else{for(let i=0;i<16;i++)if(f.mask&(1<<i)){const c=freeCell(i);for(let x=-8;x<=8;x+=2)for(let z=-8;z<=8;z+=2)check(c.x+x,c.z+z);}}
}
export function frameSurface(f,x,z){
 let height=0;const works=[...f.completed];if(f.stage==='cured')works.push({...f.location,fill:f.fill,baseY:constructionBase(f)});
 for(const w of works)for(let i=0;i<16;i++)if(freePlacedFill(w,i)){const c=freeCell(i);if(Math.abs(x-(w.x-f.location.x+c.x))<=8&&Math.abs(z-(w.z-f.location.z+c.z))<=8)height=Math.max(height,constructionBase(w)+w.fill[i]/2);}return height;
}
function* frameObstacles(f,panels,vehicleMargin){
 yield{box:{x:FRAME_RACK.x,z:FRAME_RACK.z,hx:11,hz:6},radius:14};
 for(const v of [f.truck,f.pump])yield{box:{...v,hx:v.legs?40:33,hz:44},radius:vehicleMargin};
 for(const p of panels)yield{box:{x:p.x,z:p.z,hx:p.width/2,hz:p.depth/2},radius:14};
}
const outside=(f,p)=>![p.x,p.z].every(Number.isFinite)||Math.abs(p.x+f.location.x)>2600||Math.abs(p.z+f.location.z)>1700;
export function frameBlocked(f,panels,point,external=()=>false,vehicleMargin=20){
 if(outside(f,point)||external(f.location.x+point.x,f.location.z+point.z,vehicleMargin-ROUTE_EPS)||hoseSegmentBlocked(pipeContactPath(f),point,point,vehicleMargin))return true;
 for(const {box,radius}of frameObstacles(f,panels,vehicleMargin))if(clearanceBlocked(pointBoxDistance(point,box),radius))return true;return false;
}
export function frameSegmentBlocked(f,panels,from,to,external=()=>false,vehicleMargin=20){
 if(outside(f,from)||outside(f,to)||externalSegmentBlocked(f.location,from,to,vehicleMargin,external)||hoseSegmentBlocked(pipeContactPath(f),from,to,vehicleMargin))return true;
 for(const {box,radius}of frameObstacles(f,panels,vehicleMargin))if(clearanceBlocked(segmentBoxDistance(from,to,box),radius))return true;return false;
}
export function frameRoute(f,panels,start,end,external=()=>false,vehicleMargin=20,heightAt=()=>0,supportAt=(x,z)=>walkingGroundAt(f,x,z,heightAt,true),strictFooting=true,bounds=null){
 let samples=0;const edges=new Map();
 const blocked=p=>frameBlocked(f,panels,p,external,vehicleMargin)||(strictFooting&&!supportAt(p.x,p.z)),checkEdge=(a,b)=>{
  if(frameSegmentBlocked(f,panels,a,b,external,vehicleMargin))return false;const n=Math.max(1,Math.ceil(distance(a,b)/2));let last=null;
  for(let i=0;i<=n;i++){if(++samples>20000){const e=Error('型枠作業の経路が複雑です。車両を離し、近くの平らな通路を空けてください。');e.code='FRAME_ROUTE_BUDGET';throw e;}const t=i/n,p={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};if(blocked(p))return false;if(!strictFooting)continue;const h=supportAt(p.x,p.z).height;if(i===0&&Number.isFinite(a.y)&&Math.abs(h-a.y)>FOOT_LEVEL_EPS||last!==null&&Math.abs(h-last)>Math.tan(8*Math.PI/180)*distance(a,b)/n+FOOT_LEVEL_EPS)return false;last=h;}return true;};
 // Repeated A* edges are identical within this synchronous planning call.
 // Keep direction and datum in the key, and revalidate live terrain in motion.
 const safe=(a,b)=>{const k=[a.x,a.z,a.y,b.x,b.z,b.y].join(',');if(edges.has(k))return edges.get(k);const ok=checkEdge(a,b);if(edges.size<40000)edges.set(k,ok);return ok;};
 const point=p=>({...p,y:strictFooting?supportAt(p.x,p.z).height:frameSurface(f,p.x,p.z)});
 if(strictFooting){const origin=supportAt(start.x,start.z);if(!origin||Number.isFinite(start.y)&&Math.abs(origin.height-start.y)>FOOT_LEVEL_EPS)throw Error(FOOTING_MESSAGE);}
 if(blocked(start)||blocked(end))throw Error('型枠作業の通路を空けてください。車両を型枠と資材置き場から離せます。');
 if(safe(start,end))return[point(start),point(end)];
 // Short, fully checked doglegs clear a rack or vehicle without searching a
 // whole grid. They never bypass the same terrain and obstacle checks.
 for(const offset of[-40,40,-80,80])for(const axis of['x','z']){
  const other=axis==='x'?'z':'x',path=[start,{[axis]:start[axis]+offset,[other]:start[other]},{[axis]:start[axis]+offset,[other]:end[other]},end];
  if(path.slice(1).every((b,i)=>safe(path[i],b)))return path.map(point);
 }
 // Bounded A*: a 6-unit grid, validated edges and exact start/end links.
 // No unbounded retry loop and no fallback through an obstacle.
 const step=6,limit=180,key=(x,z)=>`${x},${z}`,nodes=new Map(),queue=[];
 function add(x,z,g,prev){const k=key(x,z),old=nodes.get(k);if(old&&old.g<=g)return;const node={x,z,g,prev,score:g+distance({x,z},end)};nodes.set(k,node);queue.push(node);}
 for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const x=(Math.round(start.x/step)+dx)*step,z=(Math.round(start.z/step)+dz)*step;if(safe(start,{x,z}))add(x,z,distance(start,{x,z}),null);}
 let visits=0;
 while(queue.length&&visits++<5000){queue.sort((a,b)=>b.score-a.score);const n=queue.pop();if(nodes.get(key(n.x,n.z))!==n)continue;
  if(distance(n,end)<14&&safe(n,end)){const path=[point(end)];for(let p=n;p;p=p.prev)path.unshift(point(p));path.unshift(point(start));const compact=[path[0]];for(let i=1;i<path.length;){let j=path.length-1;while(j>i&&!safe(compact.at(-1),path[j]))j--;compact.push(path[j]);i=j+1;}return compact;}
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const p={x:n.x+dx*step,z:n.z+dz*step};if((bounds?(p.x<bounds.minX||p.x>bounds.maxX||p.z<bounds.minZ||p.z>bounds.maxZ):(Math.abs(p.x)>limit||Math.abs(p.z)>limit))||!safe(n,p))continue;add(p.x,p.z,n.g+distance(n,p),n);}
 }
 throw Error('板を運ぶ通路がありません。車両を型枠と資材置き場から離してください。');
}
// Tools and panels prefer level ground around small ledges. Retain continuous
// sloping routes when no level approach exists; live shoe contact still guards it.
export function frameGroundRoute(f,panels,start,end,external=()=>false,margin=20,heightAt=()=>0,bounds=null){
 try{return frameRoute(f,panels,start,end,external,margin,heightAt,(x,z)=>footingAt(f,x,z,heightAt,true),true,bounds);}
 catch(e){if(['SHARED_PLATFORM_BUDGET','FRAME_HIGH_BUDGET','FINISH_ACCESS_BUDGET','PAINT_ACCESS_BUDGET'].includes(e.code))throw e;return frameRoute(f,panels,start,end,external,margin,heightAt,undefined,true,bounds);}
}
export function frameLocal(pose,point){const c=Math.cos(pose.heading),s=Math.sin(pose.heading);return{x:pose.x+c*point.x+s*point.z,y:(pose.y??0)+(point.y??0),z:pose.z-s*point.x+c*point.z};}
export function framePlan(f,type,start,handBases,external=()=>false,heightAt=()=>0,reuseScaffold=null){
 if(f.aboard)throw Error('型枠の作業は車を降りて行ってください。');
 if(frameAssembly(type)&&f.stage!=='design'||type==='FREE_DEMOLD'&&f.stage!=='cured'||type==='FREE_UNFRAME'&&(f.stage!=='framed'||f.fill.some(Boolean)))throw Error('型枠を作業できる工程ではありません。');
 const raised=type===RAISED_FRAME_ACTION,highScaffold=raised||constructionBase(f)>4,strictFooting=type==='FREE_FRAME';
 if(highScaffold){let queries=0;const cache=fn=>{const values=new Map();return(...args)=>{const key=args.join(',');if(values.has(key))return values.get(key);if(++queries>250000){const e=Error('高所の施工経路が複雑です。型枠の周りに平らな通路を空けてください。');e.code='FRAME_HIGH_BUDGET';throw e;}const value=fn(...args);values.set(key,value);return value;};};heightAt=cache(heightAt);external=cache(external);}
 assertFrameFoundation(f,heightAt);
 const deckHeight=frameDeckHeight(f),workBoxes=frameWorkBoxes(f),exterior=frameExterior(f);
 const supportCache=new Map(),supportAt=(x,z)=>{const k=x+','+z;if(supportCache.has(k))return supportCache.get(k);if(supportCache.size>=30000){const e=Error('型枠作業の経路が複雑です。車両を離し、近くの平らな通路を空けてください。');e.code='FRAME_ROUTE_BUDGET';throw e;}const s=strictFooting?walkingGroundAt(f,x,z,heightAt,true):{height:deckHeight};supportCache.set(k,s);return s;};
 const deckExternal=(x,z,margin)=>external(x,z,margin,deckHeight)||frameWorkspaceBlocked(workBoxes,{x:x-f.location.x,z:z-f.location.z});
 const order=frameOrder(f.mask);if(!order.length)throw Error('型枠の形を選んでください。');
 if(frameAssembly(type))for(const board of order)for(let i=0;i<=8;i++){const offset=-8+i*2,point={x:board.x+(board.width>board.depth?offset:0),z:board.z+(board.depth>board.width?offset:0)};if(frameBlocked(f,[],point,external,.5))throw Error('型枠を置く場所に車両や建物があります。先に移動してください。');}
 const remove=!frameAssembly(type),scaffoldWork=remove||raised,sequence=remove?[...order].reverse():order,remaining=remove?[...order]:[],steps=[];let from={...start},preferredEntry=null;
 const rackSupport=footingAt(f,0,116,heightAt,true);if(!rackSupport)throw Error('資材置き場の足元を平らにしてください。');const rack={...FRAME_RACK_STANCE,y:rackSupport.height};
 function route(to,carrying,panel){const path=frameRoute(f,remaining,from,to,external,carrying?20:14,heightAt,supportAt,strictFooting);for(let i=1;i<path.length;i++)steps.push({kind:'walk',from:path[i-1],to:path[i],carrying,panel,obstacles:[...remaining],duration:Math.max(.08,distance(path[i-1],path[i])/FRAME_WORK_TEMPO.walkSpeed)});from={...to};}
 const groundPaths=new Map();
 const groundRoute=(a,b,margin=20)=>{
  const obstacles=highScaffold?order:remaining,key=JSON.stringify([a,b,margin,obstacles.map(p=>p.id)]);
  if(!groundPaths.has(key))groundPaths.set(key,frameGroundRoute(f,obstacles,a,b,external,margin,heightAt));
  return groundPaths.get(key);
 };
 const addWalk=(path,carrying,panel,obstacles,scaffold=null)=>{for(let i=1;i<path.length;i++)steps.push({kind:'walk',from:path[i-1],to:path[i],carrying,panel,obstacles,scaffold,duration:Math.max(.08,distance(path[i-1],path[i])/FRAME_WORK_TEMPO.walkSpeed)});};
 if(scaffoldWork){addWalk(groundRoute(start,rack,14),false,sequence[0],remaining);from={...rack};}
 for(let index=0;index<sequence.length;index++){
  const panel=sequence[index],vertical=panel.depth>panel.width,candidates=[];
  const stances=[];for(const heading of vertical?[-Math.PI/2,Math.PI/2]:[Math.PI,0])for(const offset of [0,-8,8,-16,16])for(const gap of scaffoldWork?[16,20,24,32,40,48,56,64]:[20,24])stances.push({x:panel.x-Math.sin(heading)*gap+Math.cos(heading)*offset,z:panel.z-Math.cos(heading)*gap-Math.sin(heading)*offset,heading,offset,targetHeadings:[heading]});
  if(scaffoldWork)for(const heading of vertical?[0,Math.PI]:[-Math.PI/2,Math.PI/2])for(const offset of [0,-4,4,-8,8])for(const gap of [22,24,26])stances.push({x:panel.x-Math.sin(heading)*gap+Math.cos(heading)*offset,z:panel.z-Math.cos(heading)*gap-Math.sin(heading)*offset,heading,offset,targetHeadings:vertical?[-Math.PI/2,Math.PI/2]:[0,Math.PI]});
  for(const {offset,targetHeadings,...stance}of stances){const support=scaffoldWork?supportAt(stance.x,stance.z):footingAt(f,stance.x,stance.z,heightAt,true);if(!support)continue;stance.y=support.height;
   if(scaffoldWork&&!exterior(stance)||frameBlocked(f,remove||raised?[panel]:remaining,stance,scaffoldWork?deckExternal:external))continue;
   for(const heading of targetHeadings){const target={x:panel.x,y:constructionBase(f)+f.height/2,z:panel.z,heading};
    let max=0;for(let h=0;h<2;h++){const base=frameLocal(stance,handBases[h]),grip=frameLocal(target,{x:h?FRAME_GRIP_SPAN:-FRAME_GRIP_SPAN,y:0,z:-.2});max=Math.max(max,Math.hypot(base.x-grip.x,base.y-grip.y,base.z-grip.z));}
    for(const hit of [-6,6])for(const lift of [0,4]){const base=frameLocal(stance,handBases[hit<0?0:1]),point=frameLocal(target,{x:hit,y:f.height/2+.4,z:-.4}),grip={x:point.x-Math.sin(stance.heading)*4,y:point.y+4+lift,z:point.z-Math.cos(stance.heading)*4};max=Math.max(max,Math.hypot(base.x-grip.x,base.y-grip.y,base.z-grip.z));}
    const useTool=max>FRAME_HAND_REACH-1;if(useTool){if(!scaffoldWork)continue;const handle=frameLocal(stance,{x:0,y:10,z:10}),clamp=frameLocal(target,{x:0,y:f.height/2+.8,z:-.4});if(Math.hypot(handle.x-clamp.x,handle.y-clamp.y,handle.z-clamp.z)>FRAME_TOOL_REACH-8)continue;}
    candidates.push({stance,target,useTool,cost:distance(stance,from)+Math.abs(offset)+(useTool?500:0)});
   }
  }
  candidates.sort((a,b)=>a.cost-b.cost);const retained=scaffoldWork&&reuseScaffold?reuseScaffold(panel,external,heightAt):null;if(retained)candidates.splice(0,candidates.length,retained);let choice=null,lastProblem=null;
  for(const c of candidates)try{
   if(scaffoldWork&&!retained){
    // A retained staircase must stay clear of every board throughout this job.
    const panels=order,height=deckHeight;
    // Taller stairs need a longer approach outside the future side deck.
    // Keep the old entrance for existing low work; never put a shared floor
    // above the lower treads of a newly planned high staircase.
    const entrance=height>8.8?Math.max(116,Math.ceil(height/2.5)*12+92):116;
    const origins=highScaffold?[0,-64,64,-160,160].flatMap(x=>[{x,z:entrance,dz:-1},{x,z:-entrance,dz:1}]).filter(o=>Array.from({length:Math.ceil(height/2.5)+1},(_,i)=>({x:o.x,z:o.z+o.dz*(20+i*12)})).every(point=>!frameBlocked(f,panels,point,external,20))).sort((a,b)=>{const preferred=o=>preferredEntry&&o.x===preferredEntry.x&&o.z===preferredEntry.z&&o.dz===preferredEntry.dz?0:1;return preferred(a)-preferred(b)||distance(a,c.stance)-distance(b,c.stance);}):undefined;
    c.scaffold=makeFrameScaffold(f,c.stance,panels,heightAt,external,end=>groundRoute(rack,end),(a,b,blocked)=>frameRoute(f,[panel],a,b,blocked,20,heightAt,supportAt,false),{height,...(origins?{origins}:{}),deckExternal});
   }
   else if(!scaffoldWork){frameRoute(f,remaining,rack,c.stance,external,20,heightAt,supportAt,true);frameRoute(f,[...remaining,panel],c.stance,rack,external,14,heightAt,supportAt,true);}
   choice=c;break;
  }catch(e){lastProblem=e;if(e.code==='FRAME_HIGH_BUDGET'||e.code==='FRAME_ROUTE_BUDGET'&&!remove)throw e;}
  if(!choice)throw Error(`型枠の板 ${index+1}/${sequence.length} に手と通路${remove?'・足場':''}が届きません。近くの車両を離してから組み直してください。`,{cause:lastProblem});
  if(choice.scaffold)preferredEntry={x:choice.scaffold.entry.x,z:choice.scaffold.entry.z,dz:choice.scaffold.direction};
  const common={panel,index,total:sequence.length,stance:choice.stance,target:choice.target,useTool:choice.useTool};
  if(!scaffoldWork){route(rack,false,panel);steps.push({...common,kind:'pickup',stance:rack,duration:FRAME_WORK_TEMPO.pickup});route(choice.stance,true,panel);steps.push({...common,kind:'place',duration:FRAME_WORK_TEMPO.place});remaining.push(panel);for(let hit=0;hit<2;hit++)steps.push({...common,kind:'hammer',hit,duration:FRAME_WORK_TEMPO.fasten});route(rack,false,panel);}
  else if(raised){
   const scaffold=choice.scaffold,withScaffold={...common,scaffold};
   steps.push({...common,kind:'pickup',stance:rack,duration:FRAME_WORK_TEMPO.pickup});addWalk(scaffold.ground,true,panel,[...remaining]);steps.push({...withScaffold,kind:'scaffold-open',stance:scaffold.entry,carrying:true,duration:FRAME_WORK_TEMPO.open});
   const upHeading=scaffold.direction<0?Math.PI:0,downHeading=scaffold.direction<0?0:Math.PI;
   let prior={...scaffold.entry};for(const [i,tread]of [...scaffold.stairs,scaffold.path[0]].entries()){const end={x:tread.x,z:tread.z,y:tread.y,heading:upHeading};if(i<scaffold.stairs.length)end.z-=scaffold.direction*2.0592;steps.push({...withScaffold,kind:'climb',from:prior,to:end,carrying:true,ascending:true,duration:FRAME_WORK_TEMPO.climb});prior=end;}
   addWalk(scaffold.path,true,panel,[panel],scaffold);steps.push({...withScaffold,kind:'place',duration:FRAME_WORK_TEMPO.place});remaining.push(panel);for(let hit=0;hit<2;hit++)steps.push({...withScaffold,kind:'hammer',hit,duration:FRAME_WORK_TEMPO.fasten});
   addWalk([...scaffold.path].reverse(),false,panel,[panel],scaffold);prior={...scaffold.path[0]};for(const tread of [...scaffold.stairs].reverse().concat(scaffold.entry)){const end={x:tread.x,z:tread.z,y:tread.y,heading:downHeading};if(tread!==scaffold.entry)end.z+=scaffold.direction*2.0592;steps.push({...withScaffold,kind:'climb',from:prior,to:end,carrying:false,ascending:false,duration:FRAME_WORK_TEMPO.climb});prior=end;}
   steps.push({...withScaffold,kind:'scaffold-close',stance:scaffold.entry,carrying:false,duration:FRAME_WORK_TEMPO.close});addWalk([...scaffold.ground].reverse(),false,panel,[...remaining]);from={...rack};
  }
  else{
   const scaffold=choice.scaffold,withScaffold={...common,scaffold},upHeading=scaffold.direction<0?Math.PI:0,downHeading=scaffold.direction<0?0:Math.PI;
   addWalk(scaffold.ground,false,panel,[...remaining]);steps.push({...withScaffold,kind:'scaffold-open',stance:scaffold.entry,duration:FRAME_WORK_TEMPO.open});
   let prior={...scaffold.entry};
   for(const [i,tread]of [...scaffold.stairs,scaffold.path[0]].entries()){const end={x:tread.x,z:tread.z,y:tread.y,heading:upHeading};if(i<scaffold.stairs.length)end.z-=scaffold.direction*2.0592;steps.push({...withScaffold,kind:'climb',from:prior,to:end,carrying:false,ascending:true,duration:FRAME_WORK_TEMPO.climb});prior=end;}
   addWalk(scaffold.path,false,panel,[panel],scaffold);
   for(let hit=0;hit<2;hit++)steps.push({...withScaffold,kind:'unlock',hit,duration:FRAME_WORK_TEMPO.fasten});steps.push({...withScaffold,kind:'lift',duration:FRAME_WORK_TEMPO.place});remaining.splice(remaining.findIndex(p=>p.id===panel.id),1);
   addWalk([...scaffold.path].reverse(),true,panel,[],scaffold);prior={...scaffold.path[0]};
   for(const tread of [...scaffold.stairs].reverse().concat(scaffold.entry)){const end={x:tread.x,z:tread.z,y:tread.y,heading:downHeading};if(tread!==scaffold.entry)end.z+=scaffold.direction*2.0592;steps.push({...withScaffold,kind:'climb',from:prior,to:end,carrying:true,ascending:false,duration:FRAME_WORK_TEMPO.climb});prior=end;}
   steps.push({...withScaffold,kind:'scaffold-close',stance:scaffold.entry,carrying:true,duration:FRAME_WORK_TEMPO.close});
   addWalk([...scaffold.ground].reverse(),true,panel,[...remaining]);steps.push({...common,kind:'putaway',stance:rack,duration:FRAME_WORK_TEMPO.pickup});from={...rack};
  }
 }
 return{steps,endPose:rack,order:sequence};
}
