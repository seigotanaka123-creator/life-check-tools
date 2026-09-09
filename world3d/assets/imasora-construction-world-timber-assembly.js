// Finite received floors use the approved joint solver, never its demo inventory.
import {actCrane,stepCrane,pickOption} from './imasora-construction-crane.js';
import {purchasedTimberAction,timberPhysicsState,refreshTimberLedger} from './imasora-construction-purchased-timber.js';
import {component,floatReadout,floatingView,restoreFloatingFlags,floatingPlacement,releaseFloating,bindPlacedCargo,bindLandedCargo,stepFloating} from './imasora-construction-floating-assembly-physics.js';
import {joinOption,detachOption,beginJoin,stepJoining,touchingFaces,JOIN_SECONDS} from './imasora-construction-floating-joints.js';
export {component,floatReadout,floatingView,floatingPlacement,stepFloating,joinOption,detachOption};
const copy=structuredClone,ok=(v,m)=>{if(!v)throw Error(m);};
// v460 saves are read without mutation. Their IDs, poses and cargo stay intact.
export function assemblyState(s){return s.joints===undefined?{...s,joints:[],assemblyRevision:0}:s;}
function merge(s,p){const n={...s,...p};for(const k of ['rotation','joining'])if(!p[k])delete n[k];return refreshTimberLedger(n);}
export function worldAssemblyAction(state,action,id){
  const s=assemblyState(state);
  if(action==='pause')return purchasedTimberAction(s,action,id);
  ok(!s.paused,'一時停止中です。');ok(!s.rig.transition,'乗り降りの完了を待ってください。');
  if(s.joining)return{...s,message:'接合中です。次の操作は予約しません。'};
  if(action==='issue'||action==='return-stock')return purchasedTimberAction(s,action,id);
  ok(['join','detach','interact','mode','snap','home','pick','rotate','release','place'].includes(action),'不明な木材操作です。');
  if(action==='join'){
    const o=joinOption(s);ok(o.ok,o.reason);const n=copy(s);beginJoin(n,o);n.assemblyRevision++;n.joining.operation=n.assemblyRevision;return n;
  }
  const physics=timberPhysicsState(s),candidate=pickOption(floatingView(physics));
  if(action==='detach'){const o=detachOption(s);ok(o.ok,o.reason);}
  if(action==='pick'&&candidate?.hover&&component(s,candidate.id).length>1)throw Error('「接合を外して吊る」を使ってください。');
  if((action==='pick'||action==='detach')&&candidate?.hover&&floatReadout(s,candidate.id).load>0)throw Error('上のレンや荷物を先に降ろしてください。');
  if(action==='place'){const o=floatingPlacement(s);ok(o?.ok,o?.reason||'支持面へ近づけてください。');}
  const held=s.parts.find(p=>p.id===s.held),n=merge(s,restoreFloatingFlags(actCrane(floatingView(physics),action==='detach'?'pick':action))),p=n.parts.find(p=>p.id===held?.id);
  if(action==='release'&&p&&!n.held){releaseFloating(p);p.carrierId=null;n.message='この高さで浮遊を開始しました。辺にもう1枚の床を寄せると接合できます。';}
  if((action==='pick'||action==='detach')&&n.held){const q=n.parts.find(p=>p.id===n.held);q.hover=null;q.carrierId=null;n.joints=n.joints.filter(j=>j.a!==q.id&&j.b!==q.id);if(action==='detach'){n.assemblyRevision++;n.message='この1枚の接合を外して吊りました。残りの床はその場に浮いています。';}}
  if(action==='place'&&p&&!n.held)bindPlacedCargo(n,p);
  return refreshTimberLedger(n);
}
export function advanceWorldAssembly(state,input,dt){
  ok(Number.isFinite(dt)&&dt>=0&&dt<=.1,'更新刻みが不正です。');if(state.paused)return state;
  let s={...assemblyState(state),phase:state.phase+dt};
  while(s.phase>=1/120-1e-9){
    const prior=timberPhysicsState(s),view=floatingView(prior);
    if(s.joining){view.parts.find(p=>p.id===s.held).fixed=true;view.held=null;}
    const next=restoreFloatingFlags(stepCrane(view,s.joining?{}:input,1/120));
    if(s.joining){next.held=s.held;next.parts.find(p=>p.id===s.held).fixed=false;}
    bindLandedCargo(next,prior);stepFloating(next,1/120);stepJoining(next,1/120);
    s=merge(s,next);s.phase=Math.max(0,s.phase-1/120);
  }
  if(s.phase<1e-9)s.phase=0;return s;
}
export function validateWorldAssembly(state){
  if(state.joints===undefined){ok(state.assemblyRevision===undefined&&!state.joining,'接合情報のない旧保存に接合途中を混入できません。');return;}
  const s=state;ok(Number.isSafeInteger(s.assemblyRevision)&&s.assemblyRevision>=0&&Array.isArray(s.joints)&&s.joints.length<=7,'接合の形式が不正です。');
  const graph=new Map(),seen=new Set();
  function reachable(a,b,visited=new Set()){if(a===b)return true;if(visited.has(a))return false;visited.add(a);return [...(graph.get(a)||[])].some(id=>reachable(id,b,visited));}
  for(const j of s.joints){
    ok(j&&Object.keys(j).sort().join(',')==='a,b'&&typeof j.a==='string'&&typeof j.b==='string'&&j.a!==j.b,'接合先が不正です。');
    const a=s.parts.find(p=>p.id===j.a),b=s.parts.find(p=>p.id===j.b),key=[j.a,j.b].sort().join('|');
    ok(a?.hover&&b?.hover&&!seen.has(key)&&!reachable(j.a,j.b)&&touchingFaces(a,b),'接合が重複・循環、または床が離れています。');seen.add(key);
    for(const k of ['vx','vy','vz'])ok(Math.abs(a[k]-b[k])<1e-6,'接合床の速度が一致しません。');
    ok(Math.abs(a.hover.height-b.hover.height)<1e-6,'接合床の浮遊基準が一致しません。');
    if(!graph.has(j.a))graph.set(j.a,new Set());if(!graph.has(j.b))graph.set(j.b,new Set());graph.get(j.a).add(j.b);graph.get(j.b).add(j.a);
  }
  ok(s.assemblyRevision>=s.joints.length,'接合の作業番号が不正です。');
  if(s.joining){
    const j=s.joining,p=s.parts.find(p=>p.id===j.partId),q=s.parts.find(p=>p.id===j.targetId);
    ok(Object.keys(j).sort().join(',')==='elapsed,end,operation,partId,start,targetId'&&p&&p.id===s.held&&!p.hover&&q?.hover&&!s.rotation&&s.rig.mode==='driving'&&s.work&&s.deployment===1,'接合途中の部材・状態が不正です。');
    ok(Number.isSafeInteger(j.operation)&&j.operation>0&&j.operation===s.assemblyRevision&&Number.isFinite(j.elapsed)&&j.elapsed>=0&&j.elapsed<JOIN_SECONDS,'接合途中の時間・番号が不正です。');
    for(const v of [j.start,j.end])ok(v&&Object.keys(v).sort().join(',')==='x,y,z'&&Object.values(v).every(Number.isFinite),'接合経路が不正です。');
    ok(Math.hypot(j.end.x-j.start.x,j.end.z-j.start.z)<=12.00001&&Math.abs(j.end.y-j.start.y)<=8.00001&&touchingFaces({...p,...j.end},q),'接合先が離れすぎています。');
    const t=j.elapsed/JOIN_SECONDS,e=t*t*(3-2*t);for(const k of ['x','y','z'])ok(Math.abs(p[k]-(j.start[k]+(j.end[k]-j.start[k])*e))<1e-5,'接合途中の位置が一致しません。');
  }
}
