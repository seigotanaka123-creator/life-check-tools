// Stage 4-1: inert, uniquely identified loan parts. No game inventory/economy access.
import {initialLoaderState,stepLoader,actLoader,boardOption,transitionPoints,routeClear,localToWorld,polygon,polygonsOverlap,SITE,SAFE_ZONE} from './imasora-construction-loader-physics.js';
import {cranePlayer,stepCraneWalker,craneWalkingRouteClear} from './imasora-construction-crane-walk.js';
import {craneOutriggerVolumes,overlapsOutrigger,hookSupportDepth,hookOutriggerHit} from './imasora-construction-crane-outriggers.js';
export const CRANE={minReach:42,maxReach:152,slew:.48,extend:26,hoist:23,gravity:65,snap:6,rotationSeconds:1.8};
export const PARTS=[
  {id:'panel-1',name:'床板 A',w:52,h:6,d:30,x:0,z:16,color:0xdab573},
  {id:'post-1',name:'柱 A',w:18,h:36,d:18,x:-75,z:30,color:0xc49d66},
  {id:'post-2',name:'柱 B',w:18,h:36,d:18,x:75,z:30,color:0xc49d66},
  {id:'wall-1',name:'壁 A',w:52,h:36,d:6,x:-88,z:95,color:0xe2c690},
  {id:'wall-2',name:'壁 B',w:52,h:36,d:6,x:88,z:95,color:0xe2c690},
  {id:'beam-1',name:'長い梁',w:100,h:8,d:18,x:0,z:145,color:0xac8152},
  {id:'panel-2',name:'床板 B',w:52,h:6,d:30,x:0,z:75,color:0xdab573}
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),copy=s=>structuredClone(s),EPS=.02;
const rotationAngle=r=>{const t=clamp(r.elapsed/CRANE.rotationSeconds,0,1);return r.start+Math.PI/2*t*t*(3-2*t);};
export const bounds=p=>polygon({x:p.x,z:p.z,heading:p.angle||0},p.w,p.d);
export function initialCrane(){const rig=initialLoaderState();rig.player=cranePlayer(rig.player);return{schemaVersion:1,revision:0,rig,work:false,deployment:0,boom:{yaw:0,reach:70,cable:54.5},held:null,snap:true,parts:PARTS.map(p=>({...p,y:0,angle:0,vx:0,vz:0,vy:0,fixed:false})),history:[],message:'「運転席に乗る」→「クレーン作業へ」。最初の床板はフックの真下にあります。'};}
export function tip(s){const p=localToWorld(s.rig.vehicle,Math.sin(s.boom.yaw)*s.boom.reach,26+Math.cos(s.boom.yaw)*s.boom.reach);return{...p,y:42+s.boom.reach*.35};}
export function hook(s){const p=s.parts.find(p=>p.id===s.held);return p?{x:p.x,z:p.z,y:p.y+p.h+4}:{...tip(s),y:tip(s).y-s.boom.cable};}
function footprint(o){return polygon({...o,heading:0},o.width,o.depth);}
function pointInside(p,poly){let sign=0;for(let i=0;i<4;i++){const a=poly[i],b=poly[(i+1)%4],cross=(b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x);if(Math.abs(cross)<.01)continue;const next=Math.sign(cross);if(sign&&sign!==next)return false;sign=next;}return true;}
export function collides(s,p,{ignoreGround=false}={}){
  const b=bounds(p);
  if(b.some(q=>q.x<SITE.minX+2||q.x>SITE.maxX-2||q.z<SITE.minZ+2||q.z>SITE.maxZ-2))return'外周の柵';
  if(!ignoreGround&&p.y<0)return'地面';
  if(polygonsOverlap(b,footprint(SAFE_ZONE)))return'歩行者退避エリア';
  if(p.y<44&&polygonsOverlap(b,polygon(s.rig.vehicle,68,86)))return'車体';
  // Match all four beams, vertical legs and outer foot plates, also mid-extension.
  if(craneOutriggerVolumes(s).some(q=>overlapsOutrigger(p,q)))return'支持脚';
  for(const q of s.parts)if(q.id!==p.id&&p.y<q.y+q.h-EPS&&p.y+p.h>q.y+EPS&&polygonsOverlap(b,bounds(q)))return q.name;
  return'';
}
export function supportAt(s,p){
  const poly=bounds(p),levels=[0,...s.parts.filter(q=>q.id!==p.id&&q.fixed&&q.y+q.h<=p.y+14&&polygonsOverlap(poly,bounds(q))).map(q=>q.y+q.h)].sort((a,b)=>b-a);
  for(const y of levels){
    if(y===0)return{y,ids:[]};
    const supports=s.parts.filter(q=>q.id!==p.id&&q.fixed&&Math.abs(q.y+q.h-y)<.05);
    // Two separated bearing points carry a beam/bridge; unsupported cantilevers are refused.
    const pose={x:p.x,z:p.z,heading:p.angle};
    const spans=[.3,.4,.45].flatMap(r=>[[localToWorld(pose,-p.w*r,0),localToWorld(pose,p.w*r,0)],[localToWorld(pose,0,-p.d*r),localToWorld(pose,0,p.d*r)]]);
    if(spans.some(pair=>pair.every(v=>supports.some(q=>pointInside(v,bounds(q))))))return{y,ids:supports.filter(q=>polygonsOverlap(poly,bounds(q))).map(q=>q.id)};
  }return{y:0,ids:[]};
}
export function placement(s){
  const p=s.parts.find(p=>p.id===s.held);if(!p)return null;
  const candidate={...p,x:s.snap?(Math.round(p.x/CRANE.snap)*CRANE.snap||0):p.x,z:s.snap?(Math.round(p.z/CRANE.snap)*CRANE.snap||0):p.z};
  const support=supportAt(s,candidate);candidate.y=support.y;
  let reason=s.rotation?'部材を回転中です。止まってから設置できます。':collides(s,candidate);
  if(!reason&&Math.abs(p.y-candidate.y)>14)reason='もう少し巻き下げてください';
  if(!reason&&Math.hypot(p.vx,p.vz)>12)reason='揺れが落ち着くまで少し待ってください';
  const t=tip(s);if(!reason&&(t.y-(candidate.y+p.h+4)<3||Math.hypot(candidate.x-t.x,candidate.z-t.z)>22))reason='フックを置き場所の上へ寄せてください';
  return{candidate,support,ok:!reason,reason:reason||'ここに設置できます'};
}
export function pickOption(s){
  if(!s.work||s.deployment<1||s.held)return null;
  const h=hook(s);
  return s.parts.filter(p=>Math.hypot(p.x-h.x,p.z-h.z)<18&&h.y>=p.y+p.h-1&&h.y<=p.y+p.h+22&&Math.abs(p.vy)<.1).sort((a,b)=>Math.hypot(a.x-h.x,a.z-h.z)-Math.hypot(b.x-h.x,b.z-h.z))[0]||null;
}
function record(s,action,id){s.revision++;s.history.push({revision:s.revision,action,id});if(s.history.length>60)s.history.shift();}
function obstacles(s){
  const items=s.parts.filter(p=>p.y<(s.rig.mode==='foot'?26.8:44)).map(p=>({...p,id:p.name}));
  // Stowed supports belong to the moving chassis, not stationary obstacles to
  // feed back into the driver's own footprint test.
  if(s.deployment>0)items.push(...craneOutriggerVolumes(s));
  return items.map(p=>{const b=bounds(p),xs=b.map(v=>v.x),zs=b.map(v=>v.z);return{id:p.id,x:(Math.min(...xs)+Math.max(...xs))/2,z:(Math.min(...zs)+Math.max(...zs))/2,width:Math.max(...xs)-Math.min(...xs),depth:Math.max(...zs)-Math.min(...zs),height:p.y+p.h};});
}
export function craneObstacles(s){return obstacles(s);}
export function craneBoardOption(s){
  if(Math.abs(s.rig.player.y)>.05||Math.abs(s.rig.player.vy||0)>.1)return null;
  const option=boardOption(s.rig,obstacles(s));return option&&craneWalkingRouteClear(s,option.path)?option:null;
}
export function craneExitOption(s){
  if(s.rig.mode!=='driving'||Math.abs(s.rig.vehicle.speed)>.8)return null;
  for(const side of[-1,1]){const path=transitionPoints(s.rig.vehicle,side,false);if(routeClear(path,obstacles(s))&&craneWalkingRouteClear(s,path))return{side,path};}
  return null;
}
export function actCrane(state,action){
  const s=copy(state);s.message='';
  if(action==='home'){delete s.rotation;s.rig=actLoader(s.rig,'home',obstacles(s));s.message='レンだけ安全エリアに戻りました。車両と部材はそのままです。';record(s,action,null);return s;}
  if(action==='interact'){
    if(s.work&&s.rig.mode==='driving'){s.message='先に部材を置き、「走行へ戻る」でクレーンを格納してください。';return s;}
    const boarding=s.rig.mode==='foot',option=boarding?craneBoardOption(s):craneExitOption(s);
    if(!option){s.message='乗降経路と頭上を空け、地面のステップ前から乗り降りしてください。';return s;}
    s.rig=actLoader(s.rig,'interact',obstacles(s));
    // The shared vehicle animation remains unchanged, but use the exit whose
    // complete head corridor passed the crane's 3D test, including the right side.
    s.rig.transition={...s.rig.transition,path:option.path,side:option.side};
    if(!boarding)s.rig.message=`${option.side<0?'左':'右'}の開いた経路から降ります。`;
    s.message=s.rig.message;record(s,action,null);return s;
  }
  if(action==='snap'){s.snap=!s.snap;s.message=s.snap?'面合わせ補助を有効にしました。':'自由位置で設置します。';record(s,action,null);return s;}
  if(s.rig.mode!=='driving'){s.message='運転席に乗って操作してください。';return s;}
  if(action==='mode'){
    if(s.held){s.message='吊った部材を設置するか、下ろしてから切り替えてください。';return s;}
    if(Math.abs(s.rig.vehicle.speed)>.8){s.message='ブレーキで停車してください。';return s;}
    const clearance=deploymentClearance(s,s.work?0:1);
    if(clearance==='部材'){s.message='支持脚の展開・格納経路が塞がっています。周囲の部材を離してください。';return s;}
    if(clearance==='フック'){
      if(s.work){s.message='格納経路でフックが支持脚に当たります。先に巻き上げてください。';return s;}
      // With no load, prepare a safe hook height while still folded. The normal
      // deployment animation then opens it gradually; no material is moved.
      s.boom.cable=Math.min(s.boom.cable,tip(s).y-16);
    }
    s.work=!s.work;s.rig.vehicle.speed=0;s.message=s.work?'支持脚を展開しています。':'クレーンを格納しています。';record(s,action,null);return s;
  }
  if(!s.work||s.deployment<1){s.message='作業モードの展開完了を待ってください。';return s;}
  if(action==='pick'){
    const p=pickOption(s);if(!p){s.message='フックを部材の中央の上へ。巻き下げて近づけてください。';return s;}
    // Placement searches nearby heights for snapping; removal must only consider
    // actual bottom-to-top contact, not a lower floor within that search window.
    const dependent=s.parts.find(q=>q.id!==p.id&&q.fixed&&Math.abs(q.y-(p.y+p.h))<.05&&polygonsOverlap(bounds(q),bounds(p)));
    if(dependent){s.message=`${dependent.name}を支えています。上の部材から外してください。`;return s;}
    const t=tip(s),cable=t.y-(p.y+p.h+4);if(cable<3){s.message='アームを伸ばして、フックの高さを確保してください。';return s;}
    p.fixed=false;p.vx=p.vz=p.vy=0;s.held=p.id;s.boom.cable=cable;s.message=`${p.name}に吊り索を掛けました。「巻上げ」で持ち上げてください。`;record(s,action,p.id);return s;
  }
  const p=s.parts.find(p=>p.id===s.held);if(!p)return s;
  if(s.rotation&&['rotate','place','release'].includes(action)){s.message='部材を回転中です。停止までお待ちください。追加の回転は予約しません。';return s;}
  if(action==='rotate'){
    const start=p.angle;for(let i=1;i<=36;i++){const q={...p,angle:start+Math.PI/2*i/36};if(collides(s,q)){s.message='回転する途中に部材や車体があるため回せません。先に持ち上げてください。';return s;}}
    p.angle=((start%(Math.PI*2))+Math.PI*2)%(Math.PI*2);s.rotation={partId:p.id,start:p.angle,elapsed:0};s.message=`${p.name}を機械で90°回転しています。`;record(s,action,p.id);
  }
  if(action==='place'){
    const preview=placement(s);if(!preview.ok){s.message=preview.reason;return s;}
    Object.assign(p,preview.candidate,{fixed:true,vx:0,vz:0,vy:0});s.held=null;s.message=`${p.name}を設置しました。同じフックでまた外せます。`;record(s,action,p.id);
  }
  if(action==='release'){s.held=null;p.fixed=false;p.vy=0;s.message=`${p.name}の吊り索を外しました。部材は消えず、下の面に落下します。`;record(s,action,p.id);}
  return s;
}
// The motor changes the physical pose, not a separate render-only angle. Sweep
// small arc segments so a moving load cannot clip a thin wall between frames.
function stepCargoRotation(s,dt){
  const r=s.rotation;if(!r)return;
  const p=s.parts.find(p=>p.id===s.held);
  if(!p||p.id!==r.partId||s.rig.mode!=='driving'){delete s.rotation;return;}
  const elapsed=Math.min(CRANE.rotationSeconds,r.elapsed+dt),target=rotationAngle({...r,elapsed});
  const start=p.angle,n=Math.max(1,Math.ceil(Math.abs(target-start)*Math.hypot(p.w,p.d)/2/.25));
  for(let i=1;i<=n;i++){
    const angle=start+(target-start)*i/n,hit=collides(s,{...p,angle});
    if(hit){p.angle%=Math.PI*2;delete s.rotation;s.message=`回転中に${hit}へ接触するため停止しました。巻上げや離れる方向へ操作してください。`;return;}
    p.angle=angle;
  }
  r.elapsed=elapsed;
  if(elapsed>=CRANE.rotationSeconds-1e-9){p.angle=(r.start+Math.PI/2)%(Math.PI*2);delete s.rotation;s.message=`${p.name}を90°回して停止しました。`;}
}
// Contact removes only obstructed motion. Never roll back an independent winch
// command merely because pendulum sway is pushing sideways into a column.
function cargoPathHit(s,old,p){
  const steps=Math.max(1,Math.ceil(Math.hypot(p.x-old.x,p.y-old.y,p.z-old.z)/.3));
  for(let i=1;i<=steps;i++){
    const t=i/steps,q={...p,x:old.x+(p.x-old.x)*t,y:old.y+(p.y-old.y)*t,z:old.z+(p.z-old.z)*t};
    const hit=collides(s,q);if(hit)return hit;
    if(hookOutriggerHit(s,{x:q.x,z:q.z,y:q.y+q.h+4}))return'支持脚';
  }return'';
}
// Check the swept extension/retraction, including the foot's vertical movement.
// The visible folded hook is above the front deck, not at its working endpoint.
function deploymentClearance(s,target){
  let hookHit=false;
  const workingHook=hook(s),folded=localToWorld(s.rig.vehicle,0,34);
  for(let i=0;i<=80;i++){
    const k=s.deployment+(target-s.deployment)*i/80,q={...s,deployment:k};
    for(const b of craneOutriggerVolumes(q)){
      const poly=bounds(b);
      if(poly.some(p=>p.x<SITE.minX||p.x>SITE.maxX||p.z<SITE.minZ||p.z>SITE.maxZ)||polygonsOverlap(poly,footprint(SAFE_ZONE))||s.parts.some(p=>overlapsOutrigger(p,b)))return'部材';
    }
    const h={x:folded.x+(workingHook.x-folded.x)*k,z:folded.z+(workingHook.z-folded.z)*k,y:24+(workingHook.y-24)*k};
    if(hookOutriggerHit(q,h))hookHit=true;
  }
  return hookHit?'フック':'';
}
// Empty hooks used to bypass cargo collision entirely. Sweep actual winch,
// extension and slew motion in <= .2-unit arc steps, stopping at contact. Try
// independent axes too, so the operator can always lift/retreat from a support.
function solveEmptyHookContact(s,prior){
  const boxes=craneOutriggerVolumes(s),requested={...s.boom},old=prior.boom;
  const distance=Math.max(old.reach,requested.reach)*Math.abs(requested.yaw-old.yaw)+1.35*Math.abs(requested.reach-old.reach)+Math.abs(requested.cable-old.cable);
  const steps=Math.max(1,Math.ceil(distance/.2)),delta=Object.fromEntries(['yaw','reach','cable'].map(k=>[k,(requested[k]-old[k])/steps]));
  let boom={...old},contact=false;
  const blocked=(from,to)=>{
    const a=hook({...s,boom:from}),b=hook({...s,boom:to});
    if(b.y<4-1e-7&&b.y<a.y-1e-8)return true;
    // Old saves may already contain a penetrated empty hook. Allow motion out
    // without allowing deeper penetration or snapping the hook through the foot.
    return boxes.some(box=>hookSupportDepth(b,box)>Math.max(1e-6,hookSupportDepth(a,box)+1e-8));
  };
  for(let i=0;i<steps;i++){
    const full=Object.fromEntries(Object.keys(delta).map(k=>[k,boom[k]+delta[k]]));
    if(!blocked(boom,full)){boom=full;continue;}
    contact=true;
    for(const key of['cable','reach','yaw']){
      if(!delta[key])continue;
      const next={...boom,[key]:boom[key]+delta[key]};
      if(!blocked(boom,next)){boom=next;continue;}
      let low=0,high=1;
      for(let n=0;n<12;n++){const t=(low+high)/2;if(blocked(boom,{...boom,[key]:boom[key]+delta[key]*t}))high=t;else low=t;}
      boom[key]+=delta[key]*low;
    }
  }
  s.boom=boom;
  if(contact)s.message='フックが支持脚に接触中です。巻上げや離れる方向へ操作できます。';
  else if(s.message.startsWith('フックが支持脚に接触中'))s.message='接触を抜けました。引き続きクレーンを操作できます。';
}
function solveCargoContact(s,prior,dt){
  const old=prior.parts.find(p=>p.id===s.held),requested=s.boom,previous=prior.boom;
  const choices=[requested,{...requested,yaw:previous.yaw},{...requested,reach:previous.reach},
    {...previous,cable:requested.cable},{...requested,cable:previous.cable},
    {...previous,yaw:requested.yaw},{...previous,reach:requested.reach},previous];
  const seen=new Set();let contact='';
  for(const boom of choices){
    const key=JSON.stringify(boom);if(seen.has(key))continue;seen.add(key);
    const t=tip({...s,boom}),length=Math.max(4,boom.cable),spring=CRANE.gravity/length;
    const vx=old.vx+((t.x-old.x)*spring-old.vx*1.7)*dt,vz=old.vz+((t.z-old.z)*spring-old.vz*1.7)*dt;
    let x=old.x+vx*dt,z=old.z+vz*dt;
    const radial=Math.hypot(x-t.x,z-t.z),maxRadius=length*.65;
    if(radial>maxRadius){x=t.x+(x-t.x)*maxRadius/radial;z=t.z+(z-t.z)*maxRadius/radial;}
    const candidates=[[x,z],[old.x,z],[x,old.z],[old.x,old.z]];
    for(let i=0;i<candidates.length;i++){
      const [cx,cz]=candidates[i],r=Math.hypot(cx-t.x,cz-t.z);if(r>maxRadius+.000001)continue;
      const p={...old,x:cx,z:cz,y:t.y-Math.sqrt(Math.max(0,length*length-r*r))-old.h-4,
        vx:Math.abs(cx-x)<.000001?vx:0,vz:Math.abs(cz-z)<.000001?vz:0};
      const hit=cargoPathHit(s,old,p);if(hit){contact=hit;continue;}
      // Do not keep pulling the boom farther past a blocked load. Retreat and
      // tangential movement remain available; the winch remains independent.
      if(i>0&&(boom.yaw!==previous.yaw||boom.reach!==previous.reach)){
        const prevTip=tip(prior);
        if(Math.abs(cx-x)>.000001&&Math.abs(t.x-cx)>Math.abs(prevTip.x-old.x)+.000001)continue;
        if(Math.abs(cz-z)>.000001&&Math.abs(t.z-cz)>Math.abs(prevTip.z-old.z)+.000001)continue;
      }
      return{part:p,boom:{...boom},contact:i>0||key!==JSON.stringify(requested)?contact:''};
    }
  }
  return{part:{...old,vx:0,vz:0},boom:{...previous},contact:contact||'障害物'};
}
export function stepCrane(state,input,dt){
  if(!Number.isFinite(dt)||dt<=0||dt>.05)throw new Error('更新刻みが不正です。');
  const s=copy(state),before=JSON.stringify([s.rig,s.boom,s.parts,s.deployment,s.rotation]);
  s.deployment=clamp(s.deployment+(s.work?1:-1)*dt/1.2,0,1);
  if((s.work||s.deployment>0)&&s.rig.mode==='driving')s.rig.vehicle.speed=0;
  else if(s.rig.mode==='foot'&&!s.rig.transition)s.rig=stepCraneWalker(s,s.rig,input,dt);
  else if(s.rig.transition&&!craneWalkingRouteClear(s,s.rig.transition.path)){
    s.rig={...s.rig,mode:s.rig.mode==='boarding'?'foot':'driving',transition:null,hit:'乗降経路',message:'頭上や乗降経路が塞がったため中止しました。'};
  }else s.rig=stepLoader(s.rig,input,dt,obstacles(s));
  if(s.rig.vehicle.steering===0)s.rig.vehicle.steering=0; // Canonicalize -0 for JSON round trips.
  if(s.work&&s.deployment===1&&s.rig.mode==='driving'){
    s.boom.yaw=clamp(s.boom.yaw+(input.slew||0)*CRANE.slew*dt,-Math.PI*.8,Math.PI*.8);
    s.boom.reach=clamp(s.boom.reach+(input.extend||0)*CRANE.extend*dt,CRANE.minReach,CRANE.maxReach);
    s.boom.cable=clamp(s.boom.cable-(input.hoist||0)*CRANE.hoist*dt,4,tip(s).y-4);
    // The raised arm must not cut through an already-built upper wall/beam.
    const t=tip(s),base=localToWorld(s.rig.vehicle,0,26);let armHit='';
    for(let i=1;(s.boom.yaw!==state.boom.yaw||s.boom.reach!==state.boom.reach)&&i<=60&&!armHit;i++){const q=i/60,x=base.x+(t.x-base.x)*q,z=base.z+(t.z-base.z)*q,y=42+(t.y-42)*q;
      for(const p of s.parts)if(p.id!==s.held&&y+4>p.y&&y-4<p.y+p.h&&polygonsOverlap(polygon({x,z,heading:0},8,8),bounds(p))){armHit=p.name;break;}}
    if(armHit){s.boom={...state.boom,cable:clamp(s.boom.cable,4,tip(state).y-4)};s.message=`アームが${armHit}に当たるため旋回・伸縮を止めました。フックは操作できます。`;}
  }
  const held=s.parts.find(p=>p.id===s.held);
  if(held){
    const solved=solveCargoContact(s,state,dt);Object.assign(held,solved.part);s.boom=solved.boom;
    if(solved.contact)s.message=`${solved.contact}に接触中です。接触する方向だけ止めています。巻上げや離れる方向へ操作できます。`;
    else if(/に接触中|に当たるため止めました/.test(s.message))s.message='接触を抜けました。引き続きクレーンを操作できます。';
  }else if(s.work&&s.deployment===1&&state.deployment===1)solveEmptyHookContact(s,state);
  stepCargoRotation(s,dt);
  for(const p of s.parts){
    if(p.fixed||p.id===s.held)continue;
    p.vy-=CRANE.gravity*dt;const target=p.y+p.vy*dt,n=Math.max(1,Math.ceil(Math.abs(target-p.y)/.35)),step=(target-p.y)/n;
    for(let i=0;i<n;i++){const q={...p,y:p.y+step};if(collides(s,q)){p.vy=0;break;}p.y=q.y;}
    if(p.y<.02&&p.vy===0)p.y=0;
  }
  if(s.deployment===1&&state.deployment<1)s.message='作業準備OK。フック下の部材を「吊り索を掛ける」でつかめます。';
  if(s.deployment===0&&state.deployment>0)s.message='格納しました。走行・降車できます。';
  if(JSON.stringify([s.rig,s.boom,s.parts,s.deployment,s.rotation])!==before)s.revision++;
  return s;
}
function checksum(text){let n=2166136261;for(let i=0;i<text.length;i++)n=Math.imul(n^text.charCodeAt(i),16777619);return(n>>>0).toString(16);}
export function validateCrane(s,templates=PARTS){
  if(s?.schemaVersion!==1||!Number.isSafeInteger(s.revision)||s.revision<0||!Array.isArray(s.parts)||s.parts.length!==templates.length||!Array.isArray(s.history)||s.history.length>60)throw new Error('クレーンの保存形式が不正です。');
  if(typeof s.work!=='boolean'||typeof s.snap!=='boolean'||!Number.isFinite(s.deployment)||s.deployment<0||s.deployment>1)throw new Error('作業状態が不正です。');
  if(!s.boom||!Number.isFinite(s.boom.yaw)||Math.abs(s.boom.yaw)>Math.PI*.8+.001||!Number.isFinite(s.boom.reach)||s.boom.reach<42||s.boom.reach>152||!Number.isFinite(s.boom.cable)||s.boom.cable<3||s.boom.cable>100)throw new Error('アームの状態が不正です。');
  for(const template of templates){const list=s.parts.filter(p=>p.id===template.id);if(list.length!==1)throw new Error('部材IDの重複・欠落があります。');const p=list[0];for(const k of['w','h','d','name','color'])if(p[k]!==template[k])throw new Error('部材の内容が一致しません。');for(const k of['x','y','z','angle','vx','vz','vy'])if(!Number.isFinite(p[k]))throw new Error('部材座標が不正です。');if(typeof p.fixed!=='boolean'||p.y<-.05||p.y>180||bounds(p).some(q=>q.x<-320||q.x>320||q.z<-250||q.z>250))throw new Error('部材が保存範囲外です。');}
  if(s.held!==null&&(!s.work||!s.parts.some(p=>p.id===s.held&&!p.fixed)))throw new Error('吊り荷の台帳が不正です。');
  if(s.rotation!==undefined){
    const r=s.rotation,p=s.parts.find(p=>p.id===s.held);
    if(!r||!p||r.partId!==s.held||s.rig?.mode!=='driving'||!Number.isFinite(r.start)||r.start<0||r.start>=Math.PI*2||!Number.isFinite(r.elapsed)||r.elapsed<0||r.elapsed>=CRANE.rotationSeconds||Math.abs(p.angle-rotationAngle(r))>1e-7)throw new Error('部材回転の保存状態が不正です。');
  }
  if(!['foot','driving'].includes(s.rig?.mode)||s.rig.transition)throw new Error('乗り降りの完了後に保存してください。');
  for(const obj of[s.rig.vehicle,s.rig.player])for(const k of['x','z','heading'])if(!Number.isFinite(obj?.[k]))throw new Error('車両・乗員の位置が不正です。');
  for(const k of['speed','steering','wheelTravel'])if(!Number.isFinite(s.rig.vehicle[k]))throw new Error('走行状態が不正です。');
  if(Math.abs(s.rig.vehicle.x)>320||Math.abs(s.rig.vehicle.z)>250||Math.abs(s.rig.player.x)>320||Math.abs(s.rig.player.z)>250||!Number.isFinite(s.rig.player.y))throw new Error('保存範囲外です。');
  if(s.rig.player.vy!==undefined&&(!Number.isFinite(s.rig.player.vy)||Math.abs(s.rig.player.vy)>2000))throw new Error('歩行速度が不正です。');
  for(const key of['grounded','ceilingHit','jumpHeld'])if(s.rig.player[key]!==undefined&&typeof s.rig.player[key]!=='boolean')throw new Error('歩行状態が不正です。');
  return s;
}
export function packCrane(s){validateCrane(s);const payload=JSON.stringify(s);return{kind:'crane-development-v1',payload,checksum:checksum(payload)};}
export function unpackCrane(p){if(p?.kind!=='crane-development-v1'||typeof p.payload!=='string'||p.checksum!==checksum(p.payload))throw new Error('保存データが壊れています。上書きせず停止しました。');return validateCrane(JSON.parse(p.payload));}
