import{isKitCargo,kitPad,kitOnPad}from'./imasora-construction-kit-cargo.mjs?v=120gm';
import{isBeamBundle}from'./imasora-construction-timber-cargo.mjs?v=120gl';
import{boardLiftInstalled,boardBayLevels as liftLevels,BOARD_LIFT as H}from'./imasora-construction-board-bay-shape.mjs?v=120gn';
import{liftState}from'./imasora-construction-board-lift-state.mjs?v=120gd';
import {highProjects,highWorldPoint,highLocalPoint} from './imasora-construction-high-world.mjs?v=120gn';
import {highFloorPieces} from './imasora-construction-high-shape.mjs?v=120gn';
import {highPlatform} from './imasora-construction-high-build.mjs?v=120gn';
import {CRANE,hook,collides} from './imasora-construction-crane.js?v=120gn';
import {craneChassisFrame} from './imasora-construction-crane-ground.mjs?v=120gf';
import{BOARD_BAY as B,hasBoardBay,boardBayLevels}from'./imasora-construction-board-bay-shape.mjs?v=120gn';
import{boardBayFits,boardBayLevel}from'./imasora-construction-board-bay.mjs?v=120gn';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const key=p=>JSON.stringify([p.id,p.record.revision,p.record.site,p.record.work]);
const cargo=s=>s.parts.find(p=>p.id===s.held);
const quarter=a=>Math.abs(a/ (Math.PI/2)-Math.round(a/(Math.PI/2)))<.001;
// Exact rectangle coverage, including the real stair opening. Corners alone can
// falsely approve a large board spanning a hole or disconnected floor pieces.
export function highCargoFits(record,p,origin={x:0,z:0},{level=record.work.levels,surface='floor'}={}){
 if(!Number.isInteger(level)||level<1||level>record.work.levels||!['floor','platform'].includes(surface))return false;
 const pieces=surface==='floor'?highFloorPieces(record.work,level):highPlatform(record.work).decks.filter(f=>f.y===level*40);
 return coverageFits(record,p,origin,level,pieces);
}
function coverageFits(record,p,origin,level,pieces){
 const angle=p.angle-record.site.turn*Math.PI/2;if(!quarter(angle))return false;
 const c=highLocalPoint(record.site,{x:origin.x+p.x,y:p.y,z:origin.z+p.z}),swap=Math.abs(Math.round(angle/(Math.PI/2)))%2;
 const w=swap?p.d:p.w,d=swap?p.w:p.d,rect={l:c.x-w/2,r:c.x+w/2,b:c.z-d/2,t:c.z+d/2};
 // Decks overlap at their corners. Count their union, never the overlap twice.
 const xs=[rect.l,rect.r,...pieces.flatMap(f=>[f.x-f.w/2,f.x+f.w/2]).filter(x=>x>rect.l&&x<rect.r)].sort((a,b)=>a-b);let area=0;
 for(let i=1;i<xs.length;i++){const x=(xs[i]+xs[i-1])/2,zs=pieces.filter(f=>Math.abs(x-f.x)<f.w/2).map(f=>[Math.max(rect.b,f.z-f.d/2),Math.min(rect.t,f.z+f.d/2)]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);let end=rect.b,length=0;for(const[a,b]of zs){length+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b);}area+=(xs[i]-xs[i-1])*length;}
 return Math.abs(area-w*d)<.001&&Math.abs(p.y-(record.site.y+level*40))<.01;
}
function craneAim(s,p){
 const v=s.rig.vehicle,c=Math.cos(v.heading),sn=Math.sin(v.heading),dx=p.x-v.x,dz=p.z-v.z,x=dx*c-dz*sn,z=dx*sn+dz*c-26,reach=Math.hypot(x,z),yaw=Math.atan2(x,z);
 const level=craneChassisFrame(s)?.position[1]??0,cable=level+42+reach*.35-(p.y+p.h+4);
 return{yaw,reach,cable};
}
export function craneUpperTargets(collection,s,{origin={x:0,z:0},includePlatforms=false}={}){
 const part=cargo(s),base=craneChassisFrame(s)?.position[1]??0;
 if(isKitCargo(part)){
  const b=s.buildingKits?.find(b=>b.partId===part.id),project=highProjects(collection).find(p=>p.id===b?.projectId);if(!project)return[];
  const r=project.record;return[false,true].map(source=>{const pad=kitPad(r.work,source),q=highWorldPoint(r.site,pad),target={x:q.x-origin.x,y:q.y,z:q.z-origin.z},aim=craneAim(s,{...part,...target});
   const reason=s.rig.mode!=='driving'||!s.work||s.deployment!==1?'停車して支持脚を開こう。':s.rotation||s.joining?'回転が終わるまで待とう。':!kitOnPad({...part,...target},r.site,r.work,origin,source)?'キットを90°回して、台の向きに合わせよう。':aim.reach<42.5||aim.reach>151.5||Math.abs(aim.yaw)>Math.PI*.8-.01||aim.cable<4||aim.cable>100?'ここからは届かないよ。車を台の近くへ移そう。高い階は建物のリフトを使おう。':'';
   return{id:project.id+(source?':kit-source':':kit'),projectId:project.id,key:key(project),level:r.work.levels,surface:'kit',kitSource:source,label:'建物 '+project.id.slice(9)+(source?'・元のキット作業台':'・建築キットの受取台'),target,aim,route:{kind:'dock'},ok:!reason,reason:reason||(source?'置いたら「キットを元の作業台へ戻す」を押そう。':'受取台に置いたら「建物にキットを渡す」を押そう。')};});
 }
 const roofs=highProjects(collection).filter(p=>p.record.work.levels>0).map(project=>{
  const {record}=project,level=record.work.levels,label='建物 '+project.id.slice(9)+'・'+level+'階の床';
  let reason=!part?'先に木材を吊ろう。':s.rig.mode!=='driving'||!s.work||s.deployment!==1?'停車して支持脚を開こう。':s.rotation||s.joining?'回転や接合が終わるまで待とう。':record.work.job?'建物の作業が終わるまで待とう。':!quarter(part.angle)?'木材を90°ずつ回して向きを合わせよう。':'';
  const entry={id:project.id,key:key(project),level,label,ok:false,reason,target:null};if(reason)return entry;
  // Keep clearance above the outside handrails while transporting a full board.
  if(base+42+CRANE.maxReach*.35-4-part.h-4<record.site.y+level*40+12)return{...entry,reason:isBeamBundle(part)?'この階はクレーンが届かないよ。届く階をえらぼう。':'この階は高すぎるよ。リフトで運ぼう。'};
  const floors=highFloorPieces(record.work,level),xs=floors.flatMap(f=>[f.x-f.w/2,f.x+f.w/2]),zs=floors.flatMap(f=>[f.z-f.d/2,f.z+f.d/2]);let best=null,fit=false;
  for(let x=Math.min(...xs);x<=Math.max(...xs);x+=4)for(let z=Math.min(...zs);z<=Math.max(...zs);z+=4){
   const world=highWorldPoint(record.site,{x,y:level*40,z}),target={...part,x:Math.round((world.x-origin.x)/6)*6,y:world.y,z:Math.round((world.z-origin.z)/6)*6};
   if(!highCargoFits(record,target,origin))continue;fit=true;const aim=craneAim(s,target);
   if(aim.reach<CRANE.minReach+.5||aim.reach>CRANE.maxReach-.5||Math.abs(aim.yaw)>Math.PI*.8-.01||aim.cable<4||aim.cable>100)continue;
   const score=Math.abs(aim.yaw-s.boom.yaw)*100+Math.abs(aim.reach-s.boom.reach)+Math.hypot(target.x-part.x,target.z-part.z)*.1;
   if(!best||score<best.score)best={target:{x:target.x,y:target.y,z:target.z},aim,score};
  }
  return best?{...entry,ok:true,reason:'黄色い枠へ、吊った木材を運ぶよ。',...best}:{...entry,reason:fit?'車を床の近くへ移動し、アームが向く側へ停めよう。':'木材を90°回すか、もっと広い床をつくろう。'};
 });
 if(!includePlatforms)return roofs;
 const choices=roofs.flatMap(roof=>{
  const project=highProjects(collection).find(p=>p.id===roof.id),{record}=project,choices=[];
  for(let level=1;level<record.work.levels;level++){
   const entry={id:project.id+':platform:'+level,projectId:project.id,key:key(project),level,surface:'platform',label:'建物 '+project.id.slice(9)+'・'+level+'階の作業台',ok:false,reason:'',target:null};
   const reason=!part?'先に木材を吊ろう。':s.rig.mode!=='driving'||!s.work||s.deployment!==1?'停車して支持脚を開こう。':s.rotation||s.joining?'回転や接合が終わるまで待とう。':record.work.job?'建物の作業が終わるまで待とう。':!quarter(part.angle)?'床板を90°ずつ回して向きを合わせよう。':'';
   if(reason){choices.push({...entry,reason});continue;}
   // Retract OUTSIDE the building, turn at cab-clearance height, then enter
   // horizontally below the next deck. A rope lowered through a ceiling is not
   // a route. The ordinary arm/load swept solver remains authoritative.
   const stageReach=isBeamBundle(part)?52:50,clearance=isBeamBundle(part)?1:4,travelY=base+42+stageReach*.35-4-part.h-4,ceiling=record.site.y+(level+1)*40-2.5;
   if(travelY<record.site.y+level*40+clearance||travelY+part.h+4>=ceiling){choices.push({...entry,reason:isBeamBundle(part)?'この高さへは横から運べないよ。車や置き先を変えよう。':'この高さには横から入れないよ。リフトを使おう。'});continue;}
   const decks=highPlatform(record.work).decks.filter(d=>d.y===level*40),seen=new Set(),swap=Math.abs(Math.round((part.angle-record.site.turn*Math.PI/2)/(Math.PI/2)))%2,hw=(swap?part.d:part.w)/2,hd=(swap?part.w:part.d)/2;let best=null;
   // The four perimeter decks are receiving surfaces; keep the stair tower's
   // narrower landings available for people. Only examine centers which carry
   // the entire board, instead of scanning every unsupported point of a deck.
   for(const deck of decks.slice(0,4))for(let x=deck.x-deck.w/2+hw;x<=deck.x+deck.w/2-hw;x+=4)for(let z=deck.z-deck.d/2+hd;z<=deck.z+deck.d/2-hd;z+=4){
    const world=highWorldPoint(record.site,{x,y:level*40,z}),target={...part,x:world.x-origin.x,y:world.y,z:world.z-origin.z};
    const tile=target.x+','+target.z;if(seen.has(tile))continue;seen.add(tile);
    if(!coverageFits(record,target,origin,level,decks))continue;
    const aim=craneAim(s,target),tipY=base+42+aim.reach*.35;
    if(aim.reach<stageReach+.5||aim.reach>CRANE.maxReach-.5||Math.abs(aim.yaw)>Math.PI*.8-.01||aim.cable<4||aim.cable>100||tipY+4>=ceiling)continue;
    const score=Math.abs(aim.yaw-s.boom.yaw)*100+Math.abs(aim.reach-s.boom.reach)+Math.hypot(target.x-part.x,target.z-part.z)*.1;
    if(!best||score<best.score)best={target:{x:target.x,y:target.y,z:target.z},aim,score,route:{kind:'side',stageReach,travelY}};
   }
   choices.push(best?{...entry,...best,ok:true,reason:'建物の外の作業台へ、天井の下を横から運ぶよ。'}:{...entry,reason:'この向き・場所では板が台に収まらないよ。90°回すか、車を台の外側へ移そう。'});
  }
  return [...choices,roof];
 });
 for(const project of highProjects(collection).filter(p=>hasBoardBay(p.record.work))){
  const r=project.record;for(const level of boardBayLevels(r.work)){const entry={id:project.id+':bay'+(level?':'+level:''),projectId:project.id,key:key(project),level,surface:'bay',label:'建物 '+project.id.slice(9)+'・'+(level?'上の部屋の':'')+'大きな板の受取台',ok:false,reason:'',target:null};
  const reason=!part?'先に木材を吊ろう。':s.rig.mode!=='driving'||!s.work||s.deployment!==1?'停車して支持脚を開こう。':s.rotation||s.joining?'回転が終わるまで待とう。':r.work.job||r.work.roomWalkVersion||r.work.levels!==r.work.blueprint.storeys.length?'建物の作業を終えてから運ぼう。':'';
  if(reason){choices.push({...entry,reason});continue;}
  const p=highWorldPoint(r.site,{x:B.x,y:level*40,z:B.outside}),target={...part,x:p.x-origin.x,y:p.y,z:p.z-origin.z};
  if(isBeamBundle(part)){choices.push({...entry,reason:'大きな床板専用の受取台だよ。角材の束は床か作業台へ運ぼう。'});continue;}
  if(!boardBayFits(r,target,origin)){choices.push({...entry,reason:'床板を90°回して入口の向きに合わせよう。'});continue;}
  const aim=craneAim(s,target);if(aim.reach<CRANE.minReach+.5||aim.reach>CRANE.maxReach-.5||Math.abs(aim.yaw)>Math.PI*.8-.01||aim.cable<4||aim.cable>100){choices.push({...entry,reason:'車を受取台の外側へ移動し、入口へ向けて停めよう。'});continue;}
  choices.push({...entry,ok:true,reason:'外の受取台へ下ろそう。そのあとローラーで部屋へ運べるよ。',target:{x:target.x,y:target.y,z:target.z},aim,route:{kind:'dock'}});
 }}
 for(const project of highProjects(collection)){const r=project.record;if(!boardLiftInstalled(r.work)||!liftLevels(r.work).some(l=>l>=2))continue;const car=liftState(s,project.id),entry={id:project.id+':lift',projectId:project.id,key:key(project),level:0,surface:'lift',label:'建物 '+project.id.slice(9)+'・荷物リフトの台',ok:false,reason:'',target:null},p=highWorldPoint(r.site,{x:H.x,y:0,z:H.z}),target=part?{...part,x:p.x-origin.x,y:p.y,z:p.z-origin.z}:null;
  const reason=!part?'先に木材を吊ろう。':s.rig.mode!=='driving'||!s.work||s.deployment!==1?'停車して支持脚を開こう。':r.work.job||r.work.roomWalkVersion?'建物の作業を終えよう。':isBeamBundle(part)?'大きな床板専用のリフトだよ。角材の束はクレーンで床へ運ぼう。':car.height!==0||car.partId?'荷物から空のリフトを地上へ下ろそう。':part.w!==80||part.d!==56||part.h!==6||Math.abs(Math.cos(part.angle-r.site.turn*Math.PI/2))>1e-7?'床板を90°回してリフトの向きに合わせよう。':'';if(reason){choices.push({...entry,reason});continue;}const aim=craneAim(s,target);choices.push(aim.reach>=CRANE.minReach+.5&&aim.reach<=CRANE.maxReach-.5&&Math.abs(aim.yaw)<=Math.PI*.8-.01&&aim.cable>=4&&aim.cable<=100?{...entry,ok:true,reason:'リフトに下ろし、荷物から目的の階をえらぼう。',target:{x:target.x,y:target.y,z:target.z},aim,route:{kind:'dock'}}:{...entry,reason:'車をリフトの外側に寄せ、アームを向けよう。'});
 }return choices;
}
// A chosen point is an ephemeral motor destination, never a new inventory or
// save job. Keep the actual board dimensions and inspect the whole bearing area.
export function cranePointTarget(collection,s,request,{origin={x:0,z:0},external=[]}={}){
 if(!request||Object.keys(request).sort().join('|')!=='level|projectId|surface|x|z'||typeof request.projectId!=='string'||!Number.isInteger(request.level)||!['floor','platform'].includes(request.surface)||![request.x,request.z].every(n=>Number.isFinite(n)&&Number.isInteger(n/2)&&Math.abs(n)<=400))throw Error('建物と床の上をえらぼう。');
 const project=highProjects(collection).find(p=>p.id===request.projectId);if(!project)throw Error('建物をえらび直そう。');
 const r=project.record,part=cargo(s),world=highWorldPoint(r.site,{x:request.x,y:request.level*40,z:request.z}),target={x:world.x-origin.x,y:world.y,z:world.z-origin.z};
 const entry={id:project.id+':point',projectId:project.id,key:key(project),level:request.level,surface:request.surface,label:'建物 '+project.id.slice(9)+'・'+request.level+'階の'+(request.surface==='floor'?'床':'作業台'),ok:false,reason:'',target,point:structuredClone(request)};
 let reason=request.level<1||request.level>r.work.levels?'できあがった階をえらぼう。':!part?'先に木材を吊ろう。':s.rig.mode!=='driving'||!s.work||s.deployment!==1?'停車して支持脚を開こう。':s.rotation||s.joining||s.rig.transition?'車と木材が止まるまで待とう。':r.work.job||r.work.roomWalkVersion?'建物の作業を終えてから運ぼう。':!quarter(part.angle)?'木材を90°ずつ回して向きを合わせよう。':'';
 if(!reason&&!highCargoFits(r,{...part,...target},origin,request))reason='木材がはみ出すよ。穴や床の端から離してえらぼう。';
 if(reason)return{...entry,reason};
 const aim=craneAim(s,{...part,...target}),base=craneChassisFrame(s)?.position[1]??0,side=request.level<r.work.levels;
 if(side){const stageReach=isBeamBundle(part)?52:50,clearance=isBeamBundle(part)?1:4,travelY=base+42+stageReach*.35-4-part.h-4,ceiling=r.site.y+(request.level+1)*40-2.5,tipY=base+42+aim.reach*.35;
  if(travelY<target.y+clearance||travelY+part.h+4>=ceiling||tipY+4>=ceiling)return{...entry,reason:isBeamBundle(part)?'この高さへは横から運べないよ。車や置き先を変えよう。':'この高さには横から入れないよ。荷物リフトを使おう。'};
  if(aim.reach<stageReach+.5)reason='車を置き先の外側へ少し離して停めよう。';
  entry.route={kind:'side',stageReach,travelY};
 }else if(base+42+CRANE.maxReach*.35-4-part.h-4<target.y+12)reason=isBeamBundle(part)?'この階はクレーンが届かないよ。届く階をえらぼう。':'この階は高すぎるよ。荷物リフトを使おう。';
 if(!reason&&(aim.reach<CRANE.minReach+.5||aim.reach>CRANE.maxReach-.5||Math.abs(aim.yaw)>Math.PI*.8-.01||aim.cable<4||aim.cable>100))reason='アームが届かないよ。車を床の近くへ移そう。';
 if(!reason){const hit=collides(s,{...part,...target},{external});if(hit)reason='車・柱・材料と重なるよ。少しずらそう。';}
 return{...entry,aim,ok:!reason,reason:reason||'床をタップでえらぼう。黄色い枠なら運べるよ。'};
}
export function cranePointRequest(collection,choice,origin={x:0,z:0}){
 if(!choice?.target||!['floor','platform',undefined].includes(choice.surface))return null;
 const project=highProjects(collection).find(p=>p.id===(choice.projectId??choice.id));if(!project)return null;
 const p=highLocalPoint(project.record.site,{x:origin.x+choice.target.x,y:choice.target.y,z:origin.z+choice.target.z});
 return{projectId:project.id,level:choice.level,surface:choice.surface??'floor',x:Math.round(p.x/2)*2,z:Math.round(p.z/2)*2};
}
export function upperDeliveryProjectKey(collection,target){const p=highProjects(collection).find(p=>p.id===(target.projectId??target.id));return p?key(p):null;}
export function upperLandingFits(collection,target,candidate,origin){const p=highProjects(collection).find(p=>p.id===(target.projectId??target.id));return !!p&&key(p)===target.key&&(!target.point||Math.abs(candidate.y-target.target.y)<.001&&Math.hypot(candidate.x-target.target.x,candidate.z-target.target.z)<.001)&&(target.surface==='kit'?!!p.record.work.craneKit&&kitOnPad(candidate,p.record.site,p.record.work,origin,target.kitSource===true)&&Math.abs(candidate.y-target.target.y)<.001&&Math.hypot(candidate.x-target.target.x,candidate.z-target.target.z)<.001:target.surface==='lift'?boardLiftInstalled(p.record.work)&&Math.abs(candidate.y-target.target.y)<.001&&Math.hypot(candidate.x-target.target.x,candidate.z-target.target.z)<.001:target.surface==='bay'?boardBayLevel(p.record,candidate,origin)===target.level&&boardBayFits(p.record,candidate,origin)&&Math.abs(candidate.y-target.target.y)<.001&&Math.hypot(candidate.x-target.target.x,candidate.z-target.target.z)<.001:highCargoFits(p.record,candidate,origin,target.surface?target:{}));}
// Reopening a saved crane beside its last delivery should still show that load
// beneath the ceiling. This is a view hint, never a job added to the save.
export function recoverUpperLanding(collection,s,origin={x:0,z:0}){
 if(s.held)return null;const h=hook(s),part=s.parts.find(p=>p.fixed&&Math.hypot(p.x-h.x,p.z-h.z)<22&&Math.abs(p.y+p.h+4-h.y)<4);if(!part)return null;
 for(const project of highProjects(collection)){const level=Math.round((part.y-project.record.site.y)/40);if(level>=project.record.work.levels||!highCargoFits(project.record,part,origin,{level,surface:'platform'}))continue;return{id:project.id+':platform:'+level,projectId:project.id,key:key(project),level,surface:'platform',target:{x:part.x,y:part.y,z:part.z}};}return null;
}
export function startUpperDelivery(s,target){
 if(!target?.ok||!cargo(s)||s.rig.mode!=='driving'||!s.work||s.deployment!==1||s.rotation||s.joining||s.paused||s.rig.transition||Math.abs(s.rig.vehicle.speed)>.01)throw Error('木材を吊って、支持脚を開いてから運ぼう。');
 const p=cargo(s),at=Math.hypot(p.x-target.target.x,p.z-target.target.z)<1.2&&Math.abs(p.y-target.target.y)<.15&&Math.hypot(p.vx,p.vy,p.vz)<.4&&['yaw','reach','cable'].every(k=>Math.abs(s.boom[k]-target.aim[k])<.01);
 // A stationary board already on this surface needs only the same final
 // support/contact check; lifting it around the whole route again adds risk.
 return{target:structuredClone(target),partId:s.held,vehicle:JSON.stringify(s.rig.vehicle),phase:at?5:0,elapsed:0,stall:0,last:null,settled:at?.4:0};
}
const phases=['木材を持ち上げているよ','アームを伸ばしているよ','床の方へ回しているよ','置き先に合わせているよ','ゆっくり下ろしているよ','揺れが止まるのを待っているよ'];
const deliveryMessage=j=>j.target.route?.kind==='side'&&j.phase===1?'アームを縮め、天井の下へ入る準備をしているよ':j.target.route?.kind==='side'&&j.phase===3?'作業台へ横から運んでいるよ':phases[j.phase];
// This produces motor inputs only. The existing swept contact/spring solver is
// the sole authority for boom and cargo movement; no position is assigned here.
export function stepUpperDelivery(job,s,dt,currentKey){
 if(!Number.isFinite(dt)||dt<=0||dt>.1)throw Error('更新刻みをたしかめよう。');
 const j={...job},p=cargo(s),stop=reason=>({job:null,input:{brake:true},reason});
 if(!p||p.id!==j.partId||s.rig.mode!=='driving'||!s.work||s.deployment!==1||s.rotation||s.joining||s.paused||s.rig.transition||JSON.stringify(s.rig.vehicle)!==j.vehicle||currentKey!==j.target.key)return stop('現場が変わったので止めたよ。置き先をもう一度えらぼう。');
 j.elapsed+=dt;if(j.elapsed>45)return stop('ここでは運べなかったよ。荷は吊ったまま。車の位置を変えて試そう。');
 const aim=j.target.aim,side=j.target.route?.kind==='side',reach=j.target.surface==='lift'?60:side?j.target.route.stageReach:j.target.route?.kind==='dock'?aim.reach:CRANE.maxReach;
 const desired=j.phase===0?{cable:4}:j.phase===1?{cable:4,reach}:j.phase===2?{cable:4,reach,yaw:aim.yaw}:j.phase===3?{cable:side?4+(s.boom.reach-reach)*.35:4,reach:aim.reach,yaw:aim.yaw}:{cable:aim.cable,reach:aim.reach,yaw:aim.yaw};
 const rates={cable:CRANE.hoist,reach:CRANE.extend,yaw:CRANE.slew},names={cable:'hoist',reach:'extend',yaw:'slew'},input={brake:true};let error=0;
 for(const[k,want]of Object.entries(desired)){const delta=want-s.boom[k];error+=Math.abs(delta)* (k==='yaw'?100:1);input[names[k]]=clamp(delta/(rates[k]*Math.max(.04,dt)),-1,1)*(k==='cable'?-1:1);}
 if(error<.08){j.stall=0;j.last=null;if(j.phase<5){j.phase++;return{job:j,input:{brake:true},message:deliveryMessage(j)};}
  const at=Math.hypot(p.x-j.target.target.x,p.z-j.target.target.z)<1.2&&Math.abs(p.y-j.target.target.y)<.15,still=Math.hypot(p.vx,p.vy,p.vz)<.4;
  j.settled=at&&still?j.settled+dt:0;if(j.settled>.4)return{job:j,input:{brake:true},place:true,message:'床に置くよ。'};
 }else{j.stall=j.last!==null&&error>=j.last-.002?j.stall+dt:0;j.last=error;if(j.stall>1.5)return stop('何かに当たっているよ。荷はそのまま止めたよ。手動でも動かせるよ。');}
 return{job:j,input,message:deliveryMessage(j)};
}
