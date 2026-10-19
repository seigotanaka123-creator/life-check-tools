import {highProjects,highWorldPoint,highLocalPoint} from './imasora-construction-high-world.mjs?v=120fw';
import {highFloorPieces} from './imasora-construction-high-shape.mjs?v=120fi';
import {highPlatform} from './imasora-construction-high-build.mjs?v=120fw';
import {CRANE,hook} from './imasora-construction-crane.js?v=120fw';
import {craneChassisFrame} from './imasora-construction-crane-ground.mjs?v=120ey';
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
 const roofs=highProjects(collection).filter(p=>p.record.work.levels>0).map(project=>{
  const {record}=project,level=record.work.levels,label='建物 '+project.id.slice(9)+'・'+level+'階の床';
  let reason=!part?'先に床板を吊ろう。':s.rig.mode!=='driving'||!s.work||s.deployment!==1?'停車して支持脚を開こう。':s.rotation||s.joining?'回転や接合が終わるまで待とう。':record.work.job?'建物の作業が終わるまで待とう。':!quarter(part.angle)?'床板を90°ずつ回して向きを合わせよう。':'';
  const entry={id:project.id,key:key(project),level,label,ok:false,reason,target:null};if(reason)return entry;
  // Keep clearance above the outside handrails while transporting a full board.
  if(base+42+CRANE.maxReach*.35-4-part.h-4<record.site.y+level*40+12)return{...entry,reason:'この階は高すぎるよ。リフトで運ぼう。'};
  const floors=highFloorPieces(record.work,level),xs=floors.flatMap(f=>[f.x-f.w/2,f.x+f.w/2]),zs=floors.flatMap(f=>[f.z-f.d/2,f.z+f.d/2]);let best=null,fit=false;
  for(let x=Math.min(...xs);x<=Math.max(...xs);x+=4)for(let z=Math.min(...zs);z<=Math.max(...zs);z+=4){
   const world=highWorldPoint(record.site,{x,y:level*40,z}),target={...part,x:Math.round((world.x-origin.x)/6)*6,y:world.y,z:Math.round((world.z-origin.z)/6)*6};
   if(!highCargoFits(record,target,origin))continue;fit=true;const aim=craneAim(s,target);
   if(aim.reach<CRANE.minReach+.5||aim.reach>CRANE.maxReach-.5||Math.abs(aim.yaw)>Math.PI*.8-.01||aim.cable<4||aim.cable>100)continue;
   const score=Math.abs(aim.yaw-s.boom.yaw)*100+Math.abs(aim.reach-s.boom.reach)+Math.hypot(target.x-part.x,target.z-part.z)*.1;
   if(!best||score<best.score)best={target:{x:target.x,y:target.y,z:target.z},aim,score};
  }
  return best?{...entry,ok:true,reason:'黄色い枠へ、吊った床板を運ぶよ。',...best}:{...entry,reason:fit?'車を床の近くへ移動し、アームが向く側へ停めよう。':'床板を90°回すか、もっと広い床をつくろう。'};
 });
 if(!includePlatforms)return roofs;
 return roofs.flatMap(roof=>{
  const project=highProjects(collection).find(p=>p.id===roof.id),{record}=project,choices=[];
  for(let level=1;level<record.work.levels;level++){
   const entry={id:project.id+':platform:'+level,projectId:project.id,key:key(project),level,surface:'platform',label:'建物 '+project.id.slice(9)+'・'+level+'階の作業台',ok:false,reason:'',target:null};
   const reason=!part?'先に床板を吊ろう。':s.rig.mode!=='driving'||!s.work||s.deployment!==1?'停車して支持脚を開こう。':s.rotation||s.joining?'回転や接合が終わるまで待とう。':record.work.job?'建物の作業が終わるまで待とう。':!quarter(part.angle)?'床板を90°ずつ回して向きを合わせよう。':'';
   if(reason){choices.push({...entry,reason});continue;}
   // Retract OUTSIDE the building, turn at cab-clearance height, then enter
   // horizontally below the next deck. A rope lowered through a ceiling is not
   // a route. The ordinary arm/load swept solver remains authoritative.
   const stageReach=50,travelY=base+42+stageReach*.35-4-part.h-4,ceiling=record.site.y+(level+1)*40-2.5;
   if(travelY<record.site.y+level*40+4||travelY+part.h+4>=ceiling){choices.push({...entry,reason:'この高さには横から入れないよ。リフトを使おう。'});continue;}
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
}
export function upperDeliveryProjectKey(collection,target){const p=highProjects(collection).find(p=>p.id===(target.projectId??target.id));return p?key(p):null;}
export function upperLandingFits(collection,target,candidate,origin){const p=highProjects(collection).find(p=>p.id===(target.projectId??target.id));return !!p&&key(p)===target.key&&highCargoFits(p.record,candidate,origin,target.surface?target:{});}
// Reopening a saved crane beside its last delivery should still show that load
// beneath the ceiling. This is a view hint, never a job added to the save.
export function recoverUpperLanding(collection,s,origin={x:0,z:0}){
 if(s.held)return null;const h=hook(s),part=s.parts.find(p=>p.fixed&&Math.hypot(p.x-h.x,p.z-h.z)<22&&Math.abs(p.y+p.h+4-h.y)<4);if(!part)return null;
 for(const project of highProjects(collection)){const level=Math.round((part.y-project.record.site.y)/40);if(level>=project.record.work.levels||!highCargoFits(project.record,part,origin,{level,surface:'platform'}))continue;return{id:project.id+':platform:'+level,projectId:project.id,key:key(project),level,surface:'platform',target:{x:part.x,y:part.y,z:part.z}};}return null;
}
export function startUpperDelivery(s,target){
 if(!target?.ok||!cargo(s)||s.rig.mode!=='driving'||!s.work||s.deployment!==1||s.rotation||s.joining||s.paused||s.rig.transition||Math.abs(s.rig.vehicle.speed)>.01)throw Error('床板を吊って、支持脚を開いてから運ぼう。');
 const p=cargo(s),at=Math.hypot(p.x-target.target.x,p.z-target.target.z)<1.2&&Math.abs(p.y-target.target.y)<.15&&Math.hypot(p.vx,p.vy,p.vz)<.4&&['yaw','reach','cable'].every(k=>Math.abs(s.boom[k]-target.aim[k])<.01);
 // A stationary board already on this surface needs only the same final
 // support/contact check; lifting it around the whole route again adds risk.
 return{target:structuredClone(target),partId:s.held,vehicle:JSON.stringify(s.rig.vehicle),phase:at?5:0,elapsed:0,stall:0,last:null,settled:at?.4:0};
}
const phases=['床板を持ち上げているよ','アームを伸ばしているよ','床の方へ回しているよ','置き先に合わせているよ','ゆっくり下ろしているよ','揺れが止まるのを待っているよ'];
const deliveryMessage=j=>j.target.route?.kind==='side'&&j.phase===1?'アームを縮め、天井の下へ入る準備をしているよ':j.target.route?.kind==='side'&&j.phase===3?'作業台へ横から運んでいるよ':phases[j.phase];
// This produces motor inputs only. The existing swept contact/spring solver is
// the sole authority for boom and cargo movement; no position is assigned here.
export function stepUpperDelivery(job,s,dt,currentKey){
 if(!Number.isFinite(dt)||dt<=0||dt>.1)throw Error('更新刻みをたしかめよう。');
 const j={...job},p=cargo(s),stop=reason=>({job:null,input:{brake:true},reason});
 if(!p||p.id!==j.partId||s.rig.mode!=='driving'||!s.work||s.deployment!==1||s.rotation||s.joining||s.paused||s.rig.transition||JSON.stringify(s.rig.vehicle)!==j.vehicle||currentKey!==j.target.key)return stop('現場が変わったので止めたよ。置き先をもう一度えらぼう。');
 j.elapsed+=dt;if(j.elapsed>45)return stop('ここでは運べなかったよ。荷は吊ったまま。車の位置を変えて試そう。');
 const aim=j.target.aim,side=j.target.route?.kind==='side',reach=side?j.target.route.stageReach:CRANE.maxReach;
 const desired=j.phase===0?{cable:4}:j.phase===1?{cable:4,reach}:j.phase===2?{cable:4,reach,yaw:aim.yaw}:j.phase===3?{cable:side?4+(s.boom.reach-reach)*.35:4,reach:aim.reach,yaw:aim.yaw}:{cable:aim.cable,reach:aim.reach,yaw:aim.yaw};
 const rates={cable:CRANE.hoist,reach:CRANE.extend,yaw:CRANE.slew},names={cable:'hoist',reach:'extend',yaw:'slew'},input={brake:true};let error=0;
 for(const[k,want]of Object.entries(desired)){const delta=want-s.boom[k];error+=Math.abs(delta)* (k==='yaw'?100:1);input[names[k]]=clamp(delta/(rates[k]*Math.max(.04,dt)),-1,1)*(k==='cable'?-1:1);}
 if(error<.08){j.stall=0;j.last=null;if(j.phase<5){j.phase++;return{job:j,input:{brake:true},message:deliveryMessage(j)};}
  const at=Math.hypot(p.x-j.target.target.x,p.z-j.target.target.z)<1.2&&Math.abs(p.y-j.target.target.y)<.15,still=Math.hypot(p.vx,p.vy,p.vz)<.4;
  j.settled=at&&still?j.settled+dt:0;if(j.settled>.4)return{job:j,input:{brake:true},place:true,message:'床に置くよ。'};
 }else{j.stall=j.last!==null&&error>=j.last-.002?j.stall+dt:0;j.last=error;if(j.stall>1.5)return stop('何かに当たっているよ。荷はそのまま止めたよ。手動でも動かせるよ。');}
 return{job:j,input,message:deliveryMessage(j)};
}
