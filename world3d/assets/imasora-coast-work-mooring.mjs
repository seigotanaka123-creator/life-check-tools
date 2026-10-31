import {legacyCoastHeight} from './imasora-coast-geography.mjs?v=120li';
import {coastHeight,COAST_WATER_Y,COAST_WORLD} from './imasora-coast-layout.mjs?v=120mx';

export const COAST_WORK_MOOR=Object.freeze({loadingPull:30000,loadingSpeed:3,ropeLimit:32000});
// Four spread lines supplement the ordinary bottom anchor. They act through the
// same rope solver as every other mooring: no heading lock, pose correction or
// extra buoyancy. The complete set is one reversible work operation.
export function createCoastWorkMooringTools(P){
 const {SEA_PLAY,coastAssembly,coastReadout,coastIsLoadingRamp,coastLoadingOffer,worldPoint,rotate,length,sub,ok}=P;
 const corners=[[-1,-1],[1,-1],[-1,1],[1,1]],key=(id,side,fore)=>'work-moor-'+id+(fore===1?'-bow':'')+'-'+side,ids=id=>corners.map(([side,fore])=>key(id,side,fore));
 const guideMatch=id=>/^align-moor-(sea-\d+)-(-?1)-(-?1)$/.exec(id),guides=(s,id)=>s.links.filter(j=>j.id.startsWith('align-moor-'+id+'-'));
 const active=(s,id)=>ids(id).every(key=>s.links.some(j=>j.id===key&&j.kind==='moor'&&j.a===id));
 function plan(s,id,{actor=null}={}){
  const b=s.parts.find(p=>p.id===id&&p.type==='board'),bad=message=>({valid:false,board:id,lines:[],message});
  if(!b||coastIsLoadingRamp(s,id))return bad('船の板のそばで使おう。');
  if(active(s,id))return bad('作業ロープで船を支えているよ。出発するときは、いかりと一緒に片付くよ。');
  if(!actor||!Number.isFinite(actor.y)||Math.hypot(actor.x-b.p[0],actor.z-b.p[2])>110||Math.abs(actor.y-b.p[1])>65)return bad('船のそばで、作業ロープを張ろう。');
  if(!s.links.some(j=>j.id==='sea-anchor-'+id))return bad('「止まる」で減速して、先にいかりを下ろそう。');
  if(s.links.length+4>SEA_PLAY.maxLinks)return bad('使わないロープを片付けよう。作業用に4本使うよ。');
  if(Math.hypot(b.v[0],b.v[2])>4||Math.abs(b.w[1])>.15||coastReadout(s,id,null,false).tilt>12)return bad('船の揺れがおさまってから、ロープを張ろう。');
  const right=rotate(b.q,[1,0,0]),front=rotate(b.q,[0,0,1]),flat=v=>{const n=Math.hypot(v[0],v[2]);return[v[0]/n,0,v[2]/n];},r=flat(right),f=flat(front),lines=[];
  for(const [side,fore] of corners){
   const anchor=[b.p[0]+side*r[0]*82+fore*f[0]*50,0,b.p[2]+side*r[2]*82+fore*f[2]*50];
   anchor[1]=coastHeight(anchor[0],anchor[2]);
   const localA=[side*24,3,fore*20],distance=length(sub(worldPoint(b,localA),anchor));
   if(Math.abs(anchor[0])>COAST_WORLD.width/2-50||Math.abs(anchor[2])>COAST_WORLD.depth/2-50||anchor[1]>=COAST_WATER_Y-4||anchor[1]<=COAST_WATER_Y-180||distance>184)return bad('海底にロープを広げられる、水のある場所へ船を動かそう。');
   lines.push({id:key(id,side,fore),kind:'moor',a:id,anchor,localA,length:Math.max(6,distance+.5)});
  }
  return {valid:true,board:id,lines,message:'船を前後左右のロープで支えるよ。波では自然に揺れるまま、荷役中の向きが流れにくくなるよ。'};
 }
 function edit(s,a,options){const p=plan(s,a.id,options);ok(p.valid,p.message);s.links.push(...p.lines);}
 function alignPlan(s,id,{actor=null}={}){
  const b=s.parts.find(p=>p.id===id&&p.type==='board'),offer=b&&coastLoadingOffer(s,id),cargo=offer?.cargo&&s.parts.find(p=>p.id===offer.cargo);
  if(!b||!active(s,id)||!offer?.ramp||!offer.rigged||!cargo||offer.secured||offer.ready)return null;
  const f=rotate(b.q,[0,0,offer.ramp.side===0?1:-1]),dx=cargo.p[0]-b.p[0],dz=cargo.p[2]-b.p[2],angle=Math.atan2(Math.sin(Math.atan2(dx,dz)-Math.atan2(f[0],f[2])),Math.cos(Math.atan2(dx,dz)-Math.atan2(f[0],f[2]))),near=actor&&Math.hypot(actor.x-b.p[0],actor.z-b.p[2])<=110&&Math.abs(actor.y-b.p[1])<65;
  const common={board:id,cargo:cargo.id,angle,direction:Math.sign(angle),valid:false,aligned:Math.abs(angle)<=6*Math.PI/180};
  if(!near)return {...common,message:'船のそばで、向きを合わせよう。'};
  if(common.aligned)return {...common,message:'箱が板のほうを向いているよ！「まく」で引き上げると、自動でベルトがかかるよ。'};
  if(s.links.length-guides(s,id).length+2>SEA_PLAY.maxLinks)return {...common,message:'使わないロープを片付けよう。向きを変えるロープを2本使うよ。'};
  if(rotate(b.q,[0,1,0])[1]<Math.cos(20*Math.PI/180)||Math.hypot(b.v[0],b.v[2])>6)return {...common,message:'先にロープを少しのばして、船を落ち着かせよう。'};
  return {...common,valid:true,message:'箱が板の横にいるよ。「向きを合わせる」を押してから巻こう。'};
 }
 function alignEdit(s,a,options){
  const p=alignPlan(s,a.id,options);ok(p?.valid&&p.cargo===a.cargo,p?.message??'板と箱をつないでから使おう。');
  const old=guides(s,a.id);ok(s.links.length-old.length+2<=SEA_PLAY.maxLinks,'使わないロープを片付けよう。向きを変えるロープを2本使うよ。');
  stop(s,a.id);s.links=s.links.filter(j=>!old.includes(j));const b=s.parts.find(q=>q.id===a.id);
  for(const fore of [-1,1]){const moor=s.links.find(j=>j.id===key(a.id,p.direction*fore,-fore)),localA=[0,3,fore*24],distance=length(sub(worldPoint(b,localA),moor.anchor));ok(distance<=258,'ロープが届く場所へ船を寄せよう。');s.links.push({id:'align-moor-'+a.id+'-'+p.direction+'-'+fore,kind:'moor',a:a.id,anchor:[...moor.anchor],localA,length:Math.max(6,distance+2)});}
 }
 function stop(s,id){
  const pair=guides(s,id),b=s.parts.find(p=>p.id===id);if(pair.length!==2||!b)return;
  for(const key of ids(id)){const j=s.links.find(j=>j.id===key);if(j)j.length=Math.max(6,Math.min(184.5,length(sub(worldPoint(b,j.localA),j.anchor))+.5));}
  for(const j of pair)j.length=Math.max(6,Math.min(260,length(sub(worldPoint(b,j.localA),j.anchor))+5));
 }
 function alignStep(s,input,dt){
  if(!input||!Number.isFinite(dt)||dt<=0||dt>SEA_PLAY.dt)return false;
  const b=s.parts.find(p=>p.id===input.board),p=b&&alignPlan(s,b.id,{actor:{x:b.p[0],y:b.p[1],z:b.p[2]}});
  if(!p?.valid||p.cargo!==input.cargo)return false;
  const pair=guides(s,b.id);if(pair.length!==2||pair.some(j=>Number(guideMatch(j.id)?.[2])!==p.direction))return false;
  for(const key of ids(b.id)){const line=s.links.find(j=>j.id===key),distance=length(sub(worldPoint(b,line.localA),line.anchor));line.length=Math.min(184.5,Math.max(line.length,distance+5));}
  for(const line of pair){const distance=length(sub(worldPoint(b,line.localA),line.anchor)),target=Math.max(6,distance-2);line.length=Math.max(6,Math.min(260,line.length+Math.max(-5*dt,Math.min(5*dt,target-line.length))));}
  // Pay out the actual loading line while the mooring drums turn the hull.
  // The floating cargo stays free; it is never carried around with the boat.
  for(const j of s.links)if(j.kind==='rope'&&j.a===b.id&&j.b===p.cargo){const cargo=s.parts.find(q=>q.id===p.cargo),distance=length(sub(worldPoint(b,j.localA),worldPoint(cargo,j.localB)));j.length=Math.min(152,Math.max(j.length,distance+5));}
  return true;
 }
 function forceLimit(s,j){
  const b=s.parts.find(p=>p.id===j.a),up=rotate(b.q,[0,1,0])[1];
  if(up>=Math.cos(22*Math.PI/180))return COAST_WORK_MOOR.ropeLimit;
  return Math.max(4500,14000*Math.max(0,up));
 }
 function clutch(s,j,distance,separating){
  const limit=forceLimit(s,j),support=j.id.startsWith('work-moor-')||j.id.startsWith('align-moor-');
  if(support){if(limit===COAST_WORK_MOOR.ropeLimit)return 24000;j.length=Math.min(j.id.startsWith('align-moor-')?260:184.5,Math.max(j.length,distance+.5));return 4500;}
  // The loading drum fully slips while the hull recovers. A reduced but still
  // taut loading line can keep pulling an off-centre crate under the hull.
  if(rotate(s.parts.find(p=>p.id===j.a).q,[0,1,0])[1]<Math.cos(20*Math.PI/180)&&distance<150){j.length=Math.min(152,Math.max(j.length,distance+2));return 0;}
  if(limit===COAST_WORK_MOOR.ropeLimit)return limit;
  // An overloaded drum pays out its existing line instead of pinning the hull.
  // It also acts after the hand is released: stored spring tension must not
  // continue rolling the boat while the player tries to reach another control.
  j.length=Math.min(152,Math.max(j.length,distance-Math.max(0,limit-separating*600)/1800));
  return limit;
 }
 function detach(s,j){
  if(j.id.startsWith('align-moor-')){stop(s,j.a);s.links=s.links.filter(k=>!guides(s,j.a).includes(k));return true;}
  const isWork=j.id.startsWith('work-moor-'),hasWork=s.links.some(k=>k.a===j.a&&k.id.startsWith('work-moor-'));
  if(!isWork&&!(hasWork&&j.id==='sea-anchor-'+j.a))return false;
  const keys=new Set([...ids(j.a),...guides(s,j.a).map(k=>k.id)]);if(!isWork)keys.add(j.id);s.links=s.links.filter(k=>!keys.has(k.id));return true;
 }
 function validLine(f,j){
  if(!f.parts.some(p=>p.id===j.a&&p.type==='board'))return false;
  const guide=guideMatch(j.id);if(guide){const direction=Number(guide[2]),fore=Number(guide[3]),moor=f.links.find(k=>k.id===key(j.a,direction*fore,-fore));return guide[1]===j.a&&!!moor&&JSON.stringify(j.anchor)===JSON.stringify(moor.anchor)&&JSON.stringify(j.localA)===JSON.stringify([0,3,fore*24])&&Number.isFinite(j.length)&&j.length>=6&&j.length<=260;}
  return corners.some(([side,fore])=>j.id===key(j.a,side,fore)&&JSON.stringify(j.localA)===JSON.stringify([side*24,3,fore*20]))
   &&Array.isArray(j.anchor)&&j.anchor.length===3&&j.anchor.every(v=>Number.isFinite(v)&&Math.abs(v)<=100000)
   &&Math.abs(j.anchor[1]-(f.geography===2?coastHeight:legacyCoastHeight)(j.anchor[0],j.anchor[2]))<.001&&j.anchor[1]<COAST_WATER_Y-4&&j.anchor[1]>COAST_WATER_Y-180
   &&Number.isFinite(j.length)&&j.length>=6&&j.length<=184.5;
 }
 function validateFrame(f){
  for(const j of f.links.filter(j=>j.id.startsWith('align-moor-'))){const match=guideMatch(j.id);ok(match&&j.kind==='moor'&&validLine(f,j)&&active(f,j.a),'向きを合わせるロープの記録が違います。');const pair=guides(f,j.a);ok(pair.length===2&&pair.every(k=>guideMatch(k.id)?.[2]===match[2])&&new Set(pair.map(k=>guideMatch(k.id)?.[3])).size===2,'向きを合わせるロープは2本を一緒に残そう。');}
  for(const j of f.links.filter(j=>j.id.startsWith('work-moor-'))){
   ok(j.kind==='moor'&&validLine(f,j),'作業ロープの記録が違います。');
   const pair=ids(j.a).map(id=>f.links.find(k=>k.id===id));
   ok(pair.every(Boolean)&&f.links.some(k=>k.id==='sea-anchor-'+j.a),'作業ロープは4本といかりを一緒に残そう。');
   for(let i=0;i<pair.length;i++)for(let k=i+1;k<pair.length;k++){const spread=length(sub(pair[i].anchor,pair[k].anchor));ok(spread>=90&&spread<=260,'作業ロープを張る場所の記録が違います。');}
  }
 }
 return {plan,active,edit,detach,validLine,validateFrame,clutch,forceLimit,alignPlan,alignEdit,alignStep,stop};
}
