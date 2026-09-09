// 9-1a: finite, session-only ordinary soil. No wallet or world-save access.
import {initialLoaderState,actLoader,stepLoader,actorPose,localToWorld,polygonsOverlap,polygon,approach} from './imasora-construction-loader-physics.js';
import {EX_ACCESS,excavatorAccessAction,excavatorAccessClear,upgradeExcavatorAccess} from './imasora-construction-excavator-access.js';
import {bucketOffset,isBackhoe,isContactDig} from './imasora-construction-excavator-bucket.js';
import {toothContacts,bucketEnvironmentHits} from './imasora-construction-excavator-contact.js';
export const CELL=8;
export const PLOT=Object.freeze({minX:-32,maxX:96,minZ:48,maxZ:176,bottom:-32,top:24});
export const BIN=Object.freeze({x:-94,z:-12,width:64,depth:48,height:10});
export const EX=Object.freeze({boomLength:56,stickLength:48,shoulder:{x:35,y:24,z:12},capacity:6,boomMin:-.18,boomMax:1.3,stickMin:-2.2,stickMax:-.22,slewLimit:1.94});
// The inward attachment needs a nearly straight stick for shallow roof cuts;
// retain a nonzero bend and the legacy limit for every older checkpoint.
export const stickExtensionLimit=s=>isBackhoe(s)?-.06:EX.stickMax;
export const bucketOpenLimit=s=>isContactDig(s)?-1.25:-.45;
export const OBSTACLES=Object.freeze([{id:'掘削区画の縁',x:32,z:112,width:128,depth:128,height:24},{id:'土の受け箱',...BIN}]);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),key=p=>p.join(','),point=p=>({x:p[0],y:p[1],z:p[2]});
export const cellCenter=p=>({x:(p[0]+.5)*CELL,y:(p[1]+.5)*CELL,z:(p[2]+.5)*CELL});
export function initialExcavator(){
  const terrain={};for(let x=-4;x<12;x++)for(let y=-4;y<3;y++)for(let z=6;z<22;z++)terrain[key([x,y,z])]=[x,y,z];
  const loader=initialLoaderState();loader.vehicle.z=-45;loader.player.z=-53;
  return {loader,arm:{boom:.72,stick:-1.62,curl:0,slew:0},terrain,total:Object.keys(terrain).length,load:0,bin:0,spoil:[],falling:[],action:null,serial:0,revision:0,hit:'',message:'運転席に乗る → 作業モード → 「すくう」を押してみてください。',travel:0};
}
export function armPose(s){
  const a=s.arm,v=s.loader.vehicle,heading=v.heading+a.slew,b=EX.shoulder;
  const positions=[{...b},{x:b.x,y:b.y+EX.boomLength*Math.sin(a.boom),z:b.z+EX.boomLength*Math.cos(a.boom)}];
  positions.push({x:b.x,y:positions[1].y+EX.stickLength*Math.sin(a.boom+a.stick),z:positions[1].z+EX.stickLength*Math.cos(a.boom+a.stick)});
  const wrist=positions[2],offset=bucketOffset(s),center={x:wrist.x,y:wrist.y+offset.y,z:wrist.z+offset.z};
  const transform=p=>({...localToWorld({...v,heading},p.x,p.z),y:p.y});
  return {local:positions,world:positions.map(transform),bucket:transform(center),wrist:transform(wrist),heading};
}
const near=(a,b,r)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<=r;
export function solveBucketPose(s,p,curl=s.arm.curl){
  const v=s.loader.vehicle,dx=p.x-v.x,dz=p.z-v.z,r2=dx*dx+dz*dz-EX.shoulder.x**2;if(r2<0)return null;
  const localZ=Math.sqrt(r2),yaw=Math.atan2(dx,dz)-Math.atan2(EX.shoulder.x,localZ),slew=Math.atan2(Math.sin(yaw-v.heading),Math.cos(yaw-v.heading));
  const contact=isContactDig(s),offset=bucketOffset(contact?{...s,arm:{...s.arm,boom:0,stick:0}}:s,curl),length=contact?Math.hypot(offset.y,EX.stickLength+offset.z):EX.stickLength,beta=contact?Math.atan2(offset.y,EX.stickLength+offset.z):0;
  const y=p.y-(contact?0:offset.y)-EX.shoulder.y,z=localZ-(contact?0:offset.z)-EX.shoulder.z;
  const c=(y*y+z*z-EX.boomLength**2-length**2)/(2*EX.boomLength*length);if(c<-1||c>1)return null;
  const effective=-Math.acos(c),stick=effective-beta,boom=Math.atan2(y,z)-Math.atan2(length*Math.sin(effective),EX.boomLength+length*Math.cos(effective));
  if(boom<EX.boomMin||boom>EX.boomMax||stick<(s.cutMask?-2.55:EX.stickMin)||stick>stickExtensionLimit(s)||Math.abs(slew)>EX.slewLimit)return null;
  return {boom,stick,slew,curl};
}
export function totals(s){return{terrain:Object.keys(s.terrain).length,bucket:s.load,inFlight:s.falling.length,ground:s.spoil.length,bin:s.bin,total:Object.keys(s.terrain).length+s.load+s.falling.length+s.spoil.length+s.bin};}
export function scoopPoseAt(s,center,start,t){
  const e=t*t*(3-2*t),curl=start+(1.1-start)*e;
  if(!isBackhoe(s))return solveBucketPose(s,center,curl);
  // A backhoe draws the stick toward the machine while curling. Keeping its
  // bowl fixed in space would force the wrist farther into a low tunnel roof.
  const begin=solveBucketPose(s,center,start);if(!begin)return null;
  const heading=s.loader.vehicle.heading+begin.slew,draw=16*e;
  return solveBucketPose(s,{x:center.x-Math.sin(heading)*draw,y:center.y,z:center.z-Math.cos(heading)*draw},curl);
}
export function scoopTargets(s){
  if(isContactDig(s))return toothContacts(s,armPose(s));
  const p=armPose(s).bucket,out=[];
  // Only neighboring solid cells exposed to air; not distant or buried selections.
  for(let x=Math.floor(p.x/CELL)-2;x<=Math.floor(p.x/CELL)+2;x++)for(let y=Math.floor(p.y/CELL)-2;y<=Math.floor(p.y/CELL)+2;y++)for(let z=Math.floor(p.z/CELL)-2;z<=Math.floor(p.z/CELL)+2;z++){
    const pos=[x,y,z],id=key(pos);if(!s.terrain[id]||(s.cutMask&&!s.cutMask[id])||!near(p,cellCenter(pos),s.cutMask?20:13))continue;
    if(![[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].some(d=>!s.terrain[key(pos.map((n,i)=>n+d[i]))]))continue;
    out.push({kind:'terrain',id,position:cellCenter(pos)});
  }
  for(const o of s.spoil)if(near(p,o,13))out.push({kind:'spoil',id:o.id,position:o});
  return out.sort((a,b)=>Math.hypot(a.position.x-p.x,a.position.y-p.y,a.position.z-p.z)-Math.hypot(b.position.x-p.x,b.position.y-p.y,b.position.z-p.z)).slice(0,EX.capacity-s.load);
}
export function armIntersections(s,padding=0){
  const pose=armPose(s),hits=new Set(),sample=(p,r)=>{
    r+=padding;
    if(p.y-r<PLOT.bottom)hits.add('岩盤');
    if((p.x<PLOT.minX||p.x>PLOT.maxX||p.z<PLOT.minZ||p.z>PLOT.maxZ)&&p.y-r<0)hits.add('固定地面');
    const local={...localToWorld({x:0,z:0,heading:-s.loader.vehicle.heading},p.x-s.loader.vehicle.x,p.z-s.loader.vehicle.z),y:p.y};
    if(Math.abs(local.x)<35+r&&Math.abs(local.z)<43+r&&p.y-r<17)hits.add('クローラー');
    const dx=Math.abs(p.x-BIN.x),dz=Math.abs(p.z-BIN.z);
    if(p.y-r<BIN.height&&p.y+r>0&&dx<BIN.width/2+r&&dz<BIN.depth/2+r&&(dx>BIN.width/2-3-r||dz>BIN.depth/2-3-r))hits.add('受け箱の縁');
    for(let x=Math.floor((p.x-r)/CELL);x<=Math.floor((p.x+r)/CELL);x++)for(let y=Math.floor((p.y-r)/CELL);y<=Math.floor((p.y+r)/CELL);y++)for(let z=Math.floor((p.z-r)/CELL);z<=Math.floor((p.z+r)/CELL);z++){
      const id=key([x,y,z]);if(s.terrain[id])hits.add(`土:${id}`);
    }
    for(const o of s.spoil)if(near(o,p,4+r))hits.add(`排土:${o.id}`);
  };
  for(let n=0;n<2;n++){const a=pose.world[n],b=pose.world[n+1],steps=Math.ceil(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)/2);for(let i=1;i<=steps;i++)sample({x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps,z:a.z+(b.z-a.z)*i/steps},2.2);}
  if(isContactDig(s)){for(const hit of bucketEnvironmentHits(s,pose))hits.add(hit);}else sample(pose.bucket,6);return hits;
}
function contactMove(s,input,dt){
 const targets={boom:clamp(s.arm.boom+(input.boom||0)*dt*.5,EX.boomMin,EX.boomMax),stick:clamp(s.arm.stick+(input.stick||0)*dt*.65,-2.55,stickExtensionLimit(s)),slew:clamp(s.arm.slew-(input.slew||0)*dt*.62,-EX.slewLimit,EX.slewLimit),curl:clamp(s.arm.curl+(input.curl||0)*dt*.75,bucketOpenLimit(s),1.1)};
 let n={...s,arm:{...s.arm},hit:''};const groups=input.coordinated?[Object.keys(targets)]:Object.keys(targets).map(k=>[k]);
 for(const keys of groups){const from={...n.arm},steps=Math.max(1,...keys.map(k=>Math.ceil(Math.abs(targets[k]-from[k])/.003)));for(let i=1;i<=steps;i++){const arm={...from};for(const k of keys)arm[k]=from[k]+(targets[k]-from[k])*i/steps;if(keys.every(k=>arm[k]===n.arm[k]))continue;const candidate={...n,arm},hit=[...armIntersections(candidate)][0];if(hit){
   // Approach the actual surface, not the previous coarse sample; the contact
   // readout and the next scoop then agree with what the player can see.
   const safe={...n.arm};let lo=0,hi=1;for(let j=0;j<4;j++){const t=(lo+hi)/2,probe={...safe};for(const k of keys)probe[k]=safe[k]+(arm[k]-safe[k])*t;if(armIntersections({...n,arm:probe}).size)hi=t;else{lo=t;n={...n,arm:probe};}}
   n.hit=hit;n.message=`${hit.startsWith('土:')?'爪・バケットが土':hit}に接触しました。逆方向へ戻すか、土なら「すくう」を使ってください。`;break;}n=candidate;}}
 return n;
}
export function moveArm(s,input,dt){
  if(isContactDig(s))return contactMove(s,input,dt);
  let next={...s,arm:{...s.arm},hit:''};
  const old=armIntersections(s);
  const targets={boom:clamp(s.arm.boom+(input.boom||0)*dt*.5,EX.boomMin,EX.boomMax),stick:clamp(s.arm.stick+(input.stick||0)*dt*.65,s.cutMask?-2.55:EX.stickMin,stickExtensionLimit(s)),slew:clamp(s.arm.slew-(input.slew||0)*dt*.62,-EX.slewLimit,EX.slewLimit)};
  if(input.coordinated){
    // Coordinated hydraulics follow the sampled joint-space path, not three
    // independent full-speed axes which bend that path into obstacles.
    const count=Math.max(1,...Object.keys(targets).map(k=>Math.ceil(Math.abs(targets[k]-s.arm[k])/.003)));let before=old;
    for(let i=1;i<=count;i++){const arm={...s.arm};for(const k of Object.keys(targets))arm[k]=s.arm[k]+(targets[k]-s.arm[k])*i/count;
      const hits=armIntersections({...s,arm}),blocked=[...hits].find(id=>!before.has(id));
      if(blocked)return{...s,hit:blocked,message:'同期油圧の経路で接触したため停止しました。'};before=hits;
    }return{...next,arm:{...s.arm,...targets}};
  }
  for(const k of ['boom','stick','slew']){
    if(targets[k]===s.arm[k])continue;const proposal={...next,arm:{...next.arm,[k]:targets[k]}};
    const blocked=[...armIntersections(proposal)].find(id=>!old.has(id));
    if(blocked){next.hit=blocked.startsWith('土:')?'普通の土':blocked.startsWith('排土:')?'排土':blocked;next.message=`${next.hit}に接触しています。持ち上げるか逆方向へ戻してください。`;}
    else next=proposal;
  }return next;
}
export function actExcavator(s,action){
  if(action==='home')return {...s,loader:actLoader(s.loader,'home',OBSTACLES),message:'レンを安全エリアへ戻しました。掘削状態と土は残り、作業は一時停止します。'};
  if(action==='interact'){
    if(s.loader.mode==='working')return{...s,message:'先に「走行モード」に戻してください。'};
    const loader=excavatorAccessAction(s.loader,s.arm.slew,OBSTACLES);return{...s,loader,message:loader.message};
  }
  if(action==='work'){
    if(s.loader.mode==='driving'&&Math.abs(s.loader.vehicle.speed)<.8)return {...s,loader:{...s.loader,mode:'working'},message:s.action?'途中の作業を再開します。':isContactDig(s)?'ブームは根元、アームは先端側の関節です。バケットを開き、爪を掘りたい土へ向けて「すくう」。':'アーム先端の枠が緑なら掘れます。「すくう」は1回押すと最後まで動きます。'};
    if(s.loader.mode==='working'){
      if(s.action)return{...s,message:'バケットの動作が終わるまでお待ちください。'};
      if(Math.abs(s.arm.slew)>.04)return {...s,action:{kind:'center',elapsed:0},message:'安全を確認しながらキャビンを正面へ戻しています。完了後、走行モードになります。'};
      return {...s,loader:{...s.loader,mode:'driving'},message:'走行モード。地形と受け箱には車両で進入できません。'};
    }return {...s,message:'運転席へ乗り、停車してから作業モードにしてください。'};
  }
  if(s.loader.mode!=='working'||s.action)return s;
  if(isContactDig(s)&&(action==='scoop'||action==='dump')){
    if(action==='scoop'&&s.load)return{...s,message:'先に「こぼす」で積載している土を降ろしてください。'};
    if(action==='dump'&&!s.load)return{...s,message:'バケットは空です。角度は「開く／閉じる」で調整できます。'};
    if(action==='scoop'&&s.arm.curl>=1.08)return{...s,message:'バケットが閉じています。「バケット開く」で戻してからすくってください。'};
    const from={...s.arm},end={...from,curl:action==='scoop'?Math.min(1.1,from.curl+.95):bucketOpenLimit(s),stick:action==='scoop'?Math.max(-2.55,from.stick-.22):from.stick};
    return{...s,action:{kind:action,contact:true,elapsed:0,duration:1.6,from,end,initialLoad:s.load,collected:[]},message:action==='scoop'?'今の位置で巻き込みます。爪が実際に触れた土だけをすくいます。':'バケットを開いて、その下へ土を落とします。'};
  }
  if(action==='scoop'){
    if(s.load)return {...s,message:'バケットの土を先にこぼしてください。'};
    const targets=scoopTargets(s);if(!targets.length)return {...s,message:'バケット先端を土の表面へ近づけてください。離れた土は掘れません。'};
    return {...s,action:{kind:'scoop',elapsed:0,duration:1.6,start:s.arm.curl,targets,transferred:false,...(s.cutMask?{center:armPose(s).bucket}:{})},message:'油圧でバケットを巻き込み、普通の土をすくいます。'};
  }
  if(action==='dump'){
    if(!s.load)return{...s,message:'バケットは空です。'};
    return {...s,action:{kind:'dump',elapsed:0,duration:1.6,start:s.arm.curl},message:'バケットを開いて排土します。受け箱の上なら保管、外なら地面へ落ちます。'};
  }return s;
}
export function soilSupportBelow(s,x,z,bottom=Infinity){
  const inside=x>=PLOT.minX&&x<PLOT.maxX&&z>=PLOT.minZ&&z<PLOT.maxZ;
  let h=inside?PLOT.bottom:0;
  if(inside)for(let y=2;y>=-4;y--){const top=(y+1)*CELL;if(top<=bottom+1e-6&&s.terrain[key([Math.floor(x/CELL),y,Math.floor(z/CELL)])]){h=top;break;}}
  for(const o of s.spoil)if(o.y+4<=bottom+1e-6&&Math.abs(o.x-x)<7&&Math.abs(o.z-z)<7)h=Math.max(h,o.y+4);
  return h;
}
export function excavatorActorPose(s){
  const pose=actorPose({...s.loader,mode:s.loader.mode==='working'?'driving':s.loader.mode,vehicle:{...s.loader.vehicle,heading:s.loader.vehicle.heading+s.arm.slew}}),t=s.loader.transition;
  if(t){const p=t.elapsed/t.duration,boarding=s.loader.mode==='boarding',q=boarding?clamp((1-p)/.32,0,1):clamp(p/.28,0,1),e=q*q*(3-2*q);pose.heading=s.loader.vehicle.heading+s.arm.slew+(boarding?-t.side:t.side)*Math.PI/2*e;}
  return ['driving','working'].includes(s.loader.mode)?{...pose,y:EX_ACCESS.floor}:pose;
}
export function contactActionArm(a,t){const e=t*t*(3-2*t),arm={};for(const k of['boom','stick','slew','curl'])arm[k]=a.from[k]+(a.end[k]-a.from[k])*e;return arm;}
function stepContactAction(s,dt){
 const original=s.action,elapsed=Math.min(original.duration,original.elapsed+dt),end=contactActionArm(original,elapsed/original.duration),steps=Math.max(1,...Object.keys(end).map(k=>Math.ceil(Math.abs(end[k]-s.arm[k])/.003)));let n={...s,hit:'',action:{...original,elapsed,collected:[...original.collected]}};
 for(let i=1;i<=steps;i++){
  const arm={};for(const k of Object.keys(end))arm[k]=s.arm[k]+(end[k]-s.arm[k])*i/steps;
  let candidate={...n,arm};const contacts=original.kind==='scoop'&&!original.loadedLift?scoopTargets(candidate):[];
  if(contacts.length){candidate={...candidate,terrain:{...n.terrain},spoil:[...n.spoil],action:{...n.action,collected:[...n.action.collected]}};for(const target of contacts){if(target.kind==='terrain')delete candidate.terrain[target.id];else candidate.spoil=candidate.spoil.filter(p=>p.id!==target.id);candidate.load++;candidate.action.collected.push(target);}candidate.revision++;}
  const hit=[...armIntersections(candidate)][0];if(hit)return{...n,action:null,hit,message:`${hit.startsWith('土:')?'バケット本体が土':hit}に接触したため停止しました。爪の向きを変えてください。積載 ${n.load}/6。`};
  n=candidate;if(n.load===6&&original.kind==='scoop'&&!original.loadedLift)break;
 }
 const t=elapsed/original.duration;
 if(original.kind==='dump'&&t>.3&&n.load){const desired=Math.min(original.initialLoad,Math.ceil((t-.3)/.6*original.initialLoad)),released=original.initialLoad-n.load;if(desired>released){const p=armPose(n).bucket,id=++n.serial;n.load--;n.falling=[...n.falling,{...p,x:p.x+(id%3-1)*3,z:p.z+(Math.floor(id/3)%2-.5)*3,id,vy:0}];}}
 if(original.kind==='scoop'&&n.load===6&&!original.loadedLift){
  // A full bucket does not snap to a carrying pose. Lift/curl it mechanically,
  // with the same swept collision test and without removing any more soil.
  const from={...n.arm};n.action={...n.action,loadedLift:true,elapsed:0,from,end:{...from,boom:Math.min(EX.boomMax,from.boom+.28),stick:Math.max(-2.55,from.stick-.1),curl:1.1}};n.message='6個の土を保持し、接触しない範囲でバケットを持ち上げて閉じます。';
 }else if(elapsed>=original.duration){n.action=null;n.message=original.kind==='scoop'?(n.load?`${n.load}個の土をすくいました。`:'爪は土に触れませんでした。ブーム・アーム・バケット角度で掘りたい場所へ合わせてください。'):'その場へ排土しました。';}
 return n;
}
export function stepExcavator(s,input,dt){
  if(!Number.isFinite(dt)||dt<=0||dt>.05)throw Error('更新刻みが不正です');
  s=upgradeExcavatorAccess(s);
  if(s.loader.transition&&!excavatorAccessClear(s.loader.transition.path,s.loader.vehicle,OBSTACLES))return {...s,message:'乗降経路が塞がっています。先に障害物を移動してください。'};
  let n={...s,hit:''};
  if(s.loader.mode==='working'){
    if(!s.action)n=moveArm(n,input,dt);
    else if(isContactDig(s)&&s.action.contact)n=stepContactAction(n,dt);
    else if(s.action.kind==='center'){
      n=moveArm(n,{slew:Math.sign(s.arm.slew)},dt);
      if(n.hit){n.action=null;n.message='正面へ戻す経路で接触しました。アームを持ち上げてから、もう一度走行モードを押してください。';}
      else if(Math.abs(n.arm.slew)<.006||Math.sign(n.arm.slew)!==Math.sign(s.arm.slew)){
        n.arm={...n.arm,slew:0};n.action=null;n.loader={...n.loader,mode:'driving',message:'正面へ戻りました。走行・降車できます。'};n.message=n.loader.message;
      }
    }else{
      const a={...s.action,elapsed:Math.min(s.action.duration,s.action.elapsed+dt)},t=a.elapsed/a.duration,e=t*t*(3-2*t);
      n.action=a;n.arm={...s.arm,curl:a.start+((a.kind==='scoop'?1.1:-.45)-a.start)*e};
      if(a.center){
        const arm=scoopPoseAt(s,a.center,a.start,t);
        if(!arm)return {...s,action:null,guide:null,message:'これ以上巻き込めない姿勢です。腕を戻してすくい直してください。'};
        const allowed=armIntersections(s),hit=[...armIntersections({...s,arm})].find(id=>!allowed.has(id));
        if(hit)return {...s,action:null,guide:null,hit,message:'巻き込み経路で接触したため停止しました。土の数量は保持しています。'};
        n.arm=arm;
      }
      if(a.kind==='scoop'&&!a.transferred&&t>=.48){
        n.terrain={...s.terrain};n.spoil=[...s.spoil];let count=0;
        for(const p of a.targets){if(p.kind==='terrain'&&n.terrain[p.id]){delete n.terrain[p.id];count++;}else if(p.kind==='spoil'&&n.spoil.some(o=>o.id===p.id)){n.spoil=n.spoil.filter(o=>o.id!==p.id);count++;}}
        n.load+=count;n.revision++;a.transferred=true;
      }
      if(a.kind==='dump'&&t>.38&&n.load>0){
        const desired=Math.ceil((t-.38)/.5*EX.capacity),released=EX.capacity-s.load;
        if(desired>released){const p=armPose(n).bucket,id=++n.serial;n.load--;n.falling=[...s.falling,{...p,x:p.x+(id%3-1)*3,z:p.z+(Math.floor(id/3)%2-.5)*3,id,vy:0}];}
      }
      if(t>=1){n.action=null;n.message=a.kind==='scoop'?`${n.load}個分をすくいました。ブームを持ち上げて受け箱の方へ旋回してください。`:'排土しました。落とした土も数量に含まれています。';}
    }
  }else{
    if(s.loader.mode==='driving'&&Math.abs(s.arm.slew)>.04){n.loader={...s.loader,vehicle:{...s.loader.vehicle,speed:0}};n.message='キャビンが横を向いています。作業モードから走行モードへ切り替え、正面へ戻してください。';}
    else n.loader=stepLoader(s.loader,input,dt,OBSTACLES);
    if(n.loader.mode!==s.loader.mode)n.message=n.loader.message;
    // The extended attachment also follows a swept collision check while driving.
    if(s.loader.mode==='driving'){
      const before=armIntersections(s),hit=[...armIntersections(n)].find(id=>!before.has(id));
      if(hit){n.loader={...n.loader,vehicle:{...s.loader.vehicle,speed:0}};n.message='アーム先端が接触しました。作業モードで持ち上げてください。';}
    }
  }
  if(n.falling.length){const active=[];n.spoil=[...n.spoil];
    for(const old of n.falling){const p={...old,vy:old.vy-90*dt};p.y+=p.vy*dt;
      const inBin=Math.abs(p.x-BIN.x)<BIN.width/2-5&&Math.abs(p.z-BIN.z)<BIN.depth/2-5,h=inBin?3:soilSupportBelow(n,p.x,p.z,old.y-4);
      if(p.y<=h+4){if(inBin)n.bin++;else n.spoil.push({...p,y:h+4,vy:0});n.revision++;}else active.push(p);
    }n.falling=active;
  }
  return n;
}
