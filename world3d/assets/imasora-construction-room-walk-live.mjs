import{createJumpIntent}from'./imasora-construction-locomotion.mjs?v=120gf';
import{stepRoomMotion}from'./imasora-construction-room-motion.mjs?v=120gn';
import{ROOM_WALK_LIMIT,roomWalkStep,roomWalkEndAllowed}from'./imasora-construction-room-walk.mjs?v=120gn';
import{roomToolFloor,roomToolApproaches}from'./imasora-construction-room-tool-approach.mjs?v=120gn';
import{roomWalkWorldBoxes}from'./imasora-construction-room-walk-guard.mjs?v=120gn';
import{highSelected,withHighWork}from'./imasora-construction-high-world.mjs?v=120gn';
export function createRoomWalkLive({host,service,record,collection,setCollection,setWork,snapshot,perform,clearInput,readInput,enabled,jumping=false,paused,setPaused,onStart,onStop,onError}){
 const root=document.createElement('section');root.className='room-walk-controls';root.innerHTML='<button data-rw="start">🚶 自分で歩く</button><div data-rw-body hidden><strong data-rw="where"></strong><p data-rw="status" role="status"></p><button data-rw="stop">道具をひらく</button><button data-rw="cancel" hidden>移動をやめる</button><button data-rw="pause">ひと休み</button></div>';host.insertBefore(root,host.querySelector('.upper-roof-controls'));
 const q=k=>root.querySelector('[data-rw='+k+']');let trail=[],saving=null,clock=0,moving=false,issue='',world=null,obstacles=[],waiting=null,planning=false,approach=null,stopping=false,upgrading=false;const jumpInput=createJumpIntent();let pendingJumps=0;
 const active=()=>!!record()?.work.roomWalkVersion;
 function syncWorld(){if(world!==service.ledger){world=service.ledger;obstacles=roomWalkWorldBoxes(world.world,record());}}
 function refresh(){
  const w=record()?.work,on=active(),floor=roomToolFloor(w);root.hidden=(!enabled()&&!on)||w?.version!==5||w.levels!==w.blueprint.storeys.length||!!w.kit;
  q('start').hidden=on;root.querySelector('[data-rw-body]').hidden=!on;q('start').disabled=!!w?.job||service.busy;
  q('stop').hidden=!!approach||planning;q('stop').disabled=!on||!enabled()||!!saving||stopping||!floor;
  q('cancel').hidden=!waiting||stopping;q('pause').disabled=!enabled()||planning||stopping;q('pause').textContent=paused()?'つづける':'ひと休み';
  q('where').textContent=w?.roomMotion&&!w.roomMotion.grounded?'ジャンプ '+w.roomMotion.jumps+' / 3':w?(w.actor.y===w.levels*40?'屋上':Number.isInteger(w.actor.y/40)?(w.actor.y/40+1)+'階':'階段を歩いているよ'):'';
  q('status').textContent=issue||(paused()?'ひと休み中だよ。':planning?'道具を使う場所をたしかめているよ。':approach?'道具を使える場所へ歩いているよ。':stopping?'道具を出しているよ。':saving?'歩いた場所をセーブしているよ。':w?.roomMotion&&!w.roomMotion.grounded?'着地したら道具をひらけるよ。':!floor?'階段をのぼりきったら、道具を使えるよ。':jumping?'長く押すと高く、すぐ離すと低くジャンプ！ 空中で押し直すと3段まで。':'好きな場所へ歩こう。「道具をひらく」で、近くの使える場所へ案内するよ。');
  root.dataset.phase=planning?'planning':approach?'moving':stopping?'stopping':'foot';host.dataset.roomWalking=String(on);document.body.classList.toggle('high-room-walking',enabled()&&on);
 }
 async function save(){
  if(saving){const done=await saving;return done&&paused()&&trail.length?save():done;}
  if(!active()||!trail.length)return true;if(service.busy)return false;const path=trail.slice(),n=path.length,motion=!!record().work.roomMotion,action={type:motion?'ROOM_MOTION':'ROOM_WALK',...(motion?{commands:path}:{path}),projectId:collection().selected};
  saving=(async()=>{try{const saved=await service.saveConstructionHighBuild(action,snapshot(),service.ledger.revision),live=record().work,current=highSelected(saved).work;trail=trail.slice(n);setCollection(withHighWork(saved,{...current,actor:{...live.actor},...(live.roomMotion?{roomMotion:{...live.roomMotion}}:{})}));clock=0;issue='';return true;}catch(e){setPaused(true);clearInput();issue=e.message;onError(e);return false;}finally{saving=null;refresh();}})();refresh();return saving;
 }
 function complete(session,success,message=''){
  if(waiting!==session)return;waiting=null;planning=false;approach=null;stopping=false;if(message)issue=message;moving=false;session.resolve(success);refresh();
 }
 function cancel(message='移動をやめたよ。自分で歩けるよ。'){
  if(!waiting||stopping)return;clearInput();complete(waiting,false,message);
 }
 async function finish(session){
  if(waiting!==session||stopping)return;stopping=true;approach=null;clearInput();refresh();let success=false;
  try{
   if(saving&&!await saving)return;if(!await save())return;
   if(await perform({type:'ROOM_WALK_END'})){trail=[];issue='';success=true;onStop();}
  }catch(e){issue=e.message;onError(e);}finally{complete(session,success,!success&&!issue?'道具を出せなかったよ。もう一度ためしてね。':'');}
 }
 async function plan(session){
  try{syncWorld();const g=roomToolApproaches(record().work,obstacles);for(;;){const start=performance.now();let n;
   do{if(waiting!==session)return;n=g.next();}while(!n.done&&performance.now()-start<7);
   if(n.done){planning=false;if(!n.value){complete(session,false,'通り道がせまいよ。少し広い床へ歩いてから、もう一度押してね。');return;}
    if(!n.value.points.length){void finish(session);return;}
    approach={points:n.value.points,index:0};refresh();return;
   }
   await new Promise(resolve=>setTimeout(resolve,0));
  }}catch(e){complete(session,false,e.message);}
 }
 function stop(){
  clearInput();if(waiting)return waiting.promise;if(!active())return Promise.resolve(true);
  if(!roomToolFloor(record().work)){issue=record().work.roomMotion&&!record().work.roomMotion.grounded?'着地してから道具をひらこう。':'階段をのぼりきったら、道具を使えるよ。';refresh();return Promise.resolve(false);}
  let resolve;const promise=new Promise(r=>resolve=r),session={promise,resolve};waiting=session;issue='';setPaused(false);
  void(async()=>{try{if(record().work.roomMotion){stopping=true;refresh();if(saving&&!await saving){complete(session,false);return;}if(!await save()||!await perform({type:'ROOM_MOTION_END'})){complete(session,false,'広い床へ歩いてから、もう一度押してね。');return;}stopping=false;}if(roomWalkEndAllowed(record().work))void finish(session);else{planning=true;refresh();void plan(session);}}catch(e){complete(session,false,e.message);}})();return promise;
 }
 q('stop').onclick=()=>void stop();q('cancel').onclick=()=>cancel();
 q('pause').onclick=()=>{setPaused(!paused());clearInput();void save();refresh();};
 const remember=(w,p)=>{if(Math.hypot(p.x-w.actor.x,p.y-w.actor.y,p.z-w.actor.z)>1e-8||p.heading!==w.actor.heading){trail.push(p);setWork({...w,actor:p});moving=true;issue='';return true;}return false;};
 return{root,refresh,save,stop,get active(){return active();},get saving(){return !!saving;},get moving(){return moving;},get transitioning(){return planning||stopping||upgrading;},get jumpPreparing(){return upgrading;},get canJump(){const m=record()?.work.roomMotion;return jumping&&active()&&enabled()&&!paused()&&!waiting&&!upgrading&&(!m||m.grounded||m.jumps+pendingJumps<3);},releaseJump(){jumpInput.release();},jump(hold=false){if(!jumping||!active()||!enabled()||paused()||waiting||upgrading)return false;const m=record().work.roomMotion;if(m){if(m.jumps+pendingJumps>=3&&!m.grounded||!jumpInput.press())return false;pendingJumps++;if(!hold)jumpInput.release();return true;}upgrading=true;jumpInput.press();if(!hold)jumpInput.release();pendingJumps=1;void(async()=>{try{if(saving&&!await saving)return;if(!await save())return;if(await perform({type:'ROOM_MOTION_BEGIN'}))issue='';}finally{upgrading=false;refresh();}})();return true;},
  async begin(){if(await perform({type:jumping?'ROOM_MOTION_BEGIN':'ROOM_WALK_BEGIN'})){trail=[];jumpInput.reset();pendingJumps=0;clock=0;issue='';onStart();refresh();return true;}return false;},onBegin(fn){q('start').onclick=fn;},
  tick(dt,yaw){
   moving=false;if(!enabled()||!active()||paused()||record().work.job||stopping||upgrading){if(!upgrading){jumpInput.reset();pendingJumps=0;}return;}dt=Math.min(.05,Math.max(0,dt));if(!dt)return;if(!trail.length)clock=0;clock+=dt;syncWorld();const i=readInput?.()??{},x=i.x??0,y=i.y??0;
   if(waiting&&Math.hypot(x,y)>.0001)cancel();if(planning)return;
   if(trail.length>=ROOM_WALK_LIMIT){if(!saving)void save();return;}
   if(approach){
    let budget=200*dt;while(approach&&budget>1e-7&&trail.length<ROOM_WALK_LIMIT){const w=record().work,target=approach.points[approach.index],d=Math.hypot(target.x-w.actor.x,target.z-w.actor.z),step=Math.min(d,budget),dx=d?(target.x-w.actor.x)/d*step:0,dz=d?(target.z-w.actor.z)/d*step:0;let next=roomWalkStep(w,w.actor,dx,dz,target.heading,obstacles);
     if(Math.abs(next.y-w.actor.y)>1e-7||Math.hypot(next.x-w.actor.x,next.z-w.actor.z)<step-1e-7){cancel('通り道にものがあるよ。その場で止まったよ。');break;}
     if(d<=budget+1e-8&&Math.hypot(next.x-target.x,next.z-target.z)<1e-7)next={...next,x:target.x,z:target.z};remember(w,next);budget-=step;
     if(d<=budget+step+1e-8){approach.index++;if(approach.index===approach.points.length){void finish(waiting);break;}}
     if(step<1e-8)break;
    }
   }else{
    const n=Math.max(1,Math.hypot(x,y)),distance=(i.fast?200:68)*dt,wx=(Math.cos(yaw)*x-Math.sin(yaw)*y)/n*distance,wz=(-Math.sin(yaw)*x-Math.cos(yaw)*y)/n*distance,a=record().site.turn*Math.PI/2,c=Math.cos(a),s=Math.sin(a),dx=c*wx-s*wz,dz=s*wx+c*wz,w=record().work;
    if(w.roomMotion){const press=jumpInput.read();if(press&&!w.roomMotion.held)pendingJumps=Math.max(0,pendingJumps-1);const command={dt,x:dx/distance,z:dz/distance,heading:Math.hypot(dx,dz)>.0001?Math.atan2(dx,dz):w.actor.heading,fast:!!i.fast,jump:press,jumpStyle:2};try{const next=stepRoomMotion(w,command,obstacles);if(JSON.stringify([next.actor,next.roomMotion])!==JSON.stringify([w.actor,w.roomMotion])){trail.push(command);setWork(next);moving=Math.hypot(next.actor.x-w.actor.x,next.actor.z-w.actor.z)>1e-8;issue='';}}catch(e){setPaused(true);clearInput();issue=e.message;onError(e);refresh();}}else if(Math.hypot(dx,dz)>.0001)remember(w,roomWalkStep(w,w.actor,dx,dz,Math.atan2(dx,dz),obstacles));
   }
   if(trail.length&&(clock>=3||trail.length>=ROOM_WALK_LIMIT-4)&&!saving&&!stopping)void save();
  }};
}
