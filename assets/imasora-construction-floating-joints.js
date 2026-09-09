import {tip,pickOption} from './imasora-construction-crane.js';
import {component,floatReadout,floatingView,movingHit} from './imasora-construction-floating-assembly-physics.js';
export const JOIN_SECONDS=1.2;
function dimensions(p){
  const turn=Math.round(p.angle/(Math.PI/2));
  if(Math.abs(p.angle-turn*Math.PI/2)>1e-5)return null;
  return Math.abs(turn)%2?{w:p.d,d:p.w}:{w:p.w,d:p.d};
}
export function touchingFaces(a,b,tolerance=1e-5){
  const aa=dimensions(a),bb=dimensions(b);if(!aa||!bb||Math.abs(a.y-b.y)>tolerance||a.h!==b.h)return false;
  const dx=Math.abs(a.x-b.x),dz=Math.abs(a.z-b.z),wx=(aa.w+bb.w)/2,wz=(aa.d+bb.d)/2;
  return Math.abs(dx-wx)<tolerance&&dz<Math.min(aa.d,bb.d)-1||Math.abs(dz-wz)<tolerance&&dx<Math.min(aa.w,bb.w)-1;
}
export function jointPose(a,b){
  const aa=dimensions(a),bb=dimensions(b),alongX=Math.abs(Math.abs(a.x-b.x)-(aa.w+bb.w)/2)<1e-4;
  return alongX?{x:a.x+Math.sign(b.x-a.x)*aa.w/2,z:(Math.max(a.z-aa.d/2,b.z-bb.d/2)+Math.min(a.z+aa.d/2,b.z+bb.d/2))/2,angle:0}:{x:(Math.max(a.x-aa.w/2,b.x-bb.w/2)+Math.min(a.x+aa.w/2,b.x+bb.w/2))/2,z:a.z+Math.sign(b.z-a.z)*aa.d/2,angle:Math.PI/2};
}
function pathHit(s,start,end){
  const n=Math.max(1,Math.ceil(Math.hypot(end.x-start.x,end.y-start.y,end.z-start.z)/.2));
  for(let i=1;i<=n;i++){const t=i/n,p={...start,x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t,z:start.z+(end.z-start.z)*t};const hit=movingHit(s,p);if(hit)return hit;}
  return'';
}
export function joinOption(s){
  const p=s.parts.find(p=>p.id===s.held);
  let reason=s.joining?'接合中です。次の操作は予約しません。':!p?'接合したい火星木材を吊ってください。':p.materialId!=='mars-timber'?'接合できるのは火星木材の床同士です。':s.rotation?'90°回転が終わるまで待ってください。':s.rig.mode!=='driving'||!s.work||s.deployment<1?'クレーン作業の準備を終えてください。':!dimensions(p)?'床を90°単位の向きへ揃えてください。':'';
  if(reason)return{ok:false,reason};
  const pd=dimensions(p),options=[];
  for(const q of s.parts){
    if(!q.hover||q.id===p.id)continue;const qd=dimensions(q);if(!qd)continue;
    for(const axis of['x','z'])for(const sign of[-1,1]){
      const candidate={...p,x:q.x,y:q.y,z:q.z};candidate[axis]+=sign*(axis==='x'?pd.w+qd.w:pd.d+qd.d)/2;
      const horizontal=Math.hypot(candidate.x-p.x,candidate.z-p.z),vertical=Math.abs(candidate.y-p.y);
      if(horizontal>12||vertical>8)continue;
      const info=floatReadout(s,q.id),floors=component(s,q.id),t=tip(s),v=t.y-candidate.y-p.h-4;
      let why=info.load>0?'接合先からレンや荷物を降ろしてください。':floors.some(f=>Math.hypot(f.vx,f.vz, f.vy)>.08)||Math.hypot(p.vx,p.vz)>8?'床の揺れが落ち着くまで待ってください。':v<3||Math.hypot(t.x-candidate.x,t.z-candidate.z)>22?'フックを接合位置へ寄せてください。':pathHit(s,p,candidate);
      options.push({ok:!why,reason:why||`${q.name}に面を合わせて接合できます。`,candidate,targetId:q.id,score:horizontal+vertical});
    }
  }
  options.sort((a,b)=>Number(b.ok)-Number(a.ok)||a.score-b.score);
  return options[0]||{ok:false,reason:'浮いている床の辺へ近づけてください（横12・高さ差8以内）。'};
}
export function detachOption(s){
  const p=pickOption(floatingView(s));
  const why=s.joining?'接合中です。':s.rig.mode!=='driving'||!s.work||s.deployment<1?'クレーン作業の準備を終えてください。':!p?.hover||component(s,p.id).length<2?'外したい接合床の中央へフックを下ろしてください。':floatReadout(s,p.id).load>0?'接合床に載っているレンや荷物を先に降ろしてください。':'';
  return{ok:!why,reason:why||`${p.name}を接合から外して吊れます。`,part:p};
}
export function beginJoin(s,o){
  const p=s.parts.find(p=>p.id===s.held);
  s.joining={partId:p.id,targetId:o.targetId,start:{x:p.x,y:p.y,z:p.z},end:{x:o.candidate.x,y:o.candidate.y,z:o.candidate.z},elapsed:0};
  s.message='接合金具でゆっくり引き寄せています。';s.revision++;
}
export function alignCable(s,p){const t=tip(s);s.boom.cable=Math.sqrt((t.y-p.y-p.h-4)**2+(t.x-p.x)**2+(t.z-p.z)**2);}
export function stepJoining(s,dt){
  const j=s.joining;if(!j)return;
  const p=s.parts.find(p=>p.id===j.partId),elapsed=Math.min(JOIN_SECONDS,j.elapsed+dt),t=elapsed/JOIN_SECONDS,ease=t*t*(3-2*t);
  const next={...p,x:j.start.x+(j.end.x-j.start.x)*ease,y:j.start.y+(j.end.y-j.start.y)*ease,z:j.start.z+(j.end.z-j.start.z)*ease};
  const hit=pathHit(s,p,next);
  if(hit){delete s.joining;alignCable(s,p);s.message=`${hit}に接触したため接合を中止しました。部材は吊ったままです。`;s.revision++;return;}
  Object.assign(p,next,{vx:0,vy:0,vz:0});alignCable(s,p);j.elapsed=elapsed;s.revision++;
  if(elapsed>=JOIN_SECONDS-1e-9){
    const target=s.parts.find(q=>q.id===j.targetId),info=floatReadout(s,target.id);
    p.hover={height:info.target,contact:''};p.fixed=false;p.carrierId=null;s.held=null;
    s.joints.push({a:j.targetId,b:p.id});delete s.joining;
    // Every panel shares the group's anchor; no loaded panel is moved or reset.
    for(const q of component(s,p.id)){q.hover.height=info.target;q.vx=q.vy=q.vz=0;}
    s.message=`接合しました。${info.count+1}枚の床で支持力${info.capacity+4}です。`;
  }
}
