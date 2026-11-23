import {sameConstructionRecordValue as same} from './imasora-construction-record-equality.mjs';
import {transportSiteGate,transportWorldPose,transportSiteOrigin} from './imasora-construction-transport-site.mjs?v=120pv';
import {transportDoorApproaches} from './imasora-construction-transport-door.mjs?v=120pv';
import {shovelStanding} from './imasora-construction-shovel-work.mjs?v=120pv';
import {excavationEntry} from './imasora-construction-world-excavation.js?v=120ov';
import {worldTransportSoil} from './imasora-construction-transport-authority.mjs?v=120pv';
const require=(ok,text)=>{if(!ok)throw Error(text);};
export const transportWorkMoving=w=>!!(w?.scoop||w?.link||w?.unload||w?.frame.job);
// A short scoop has a durable reservation before it moves and a durable result
// on completion. Avoid repeatedly stopping its animation for timer saves.
// Pause/hide/manual-save still capture its exact current arm and progress.
export const deferShortScoopAutosave=(work,{paused=false,hidden=false}={})=>!paused&&!hidden&&!!work?.scoop&&Number.isFinite(work.scoop.plan?.duration)&&work.scoop.plan.duration<=10;
export function transportWorkCanExit(record){const w=record.work;return w.mode==='foot'&&!transportWorkMoving(w)&&!w.frame.soil.pending&&shovelStanding(w.frame,w.frame.player);}
// Scene ownership is transient; physical work is saved only by the existing
// normal-world session. Opening a menu or completing a retry never resumes it.
export class TransportPlaySession{
 #active=false;#paused=true;#saving=false;#automaticSave=false;#automaticCancel=null;#entered=false;
 #doorApproaches=new WeakMap();
 constructor(session,{clearInput=()=>{},savedLanding=true}={}){const source=session?.record??session?.service?.constructionTransport;require(session?.state&&source?.version===2,'保存した土運搬の現場を開いてください。');require(typeof savedLanding==='boolean','現場の入口を確認してください。');this.session=session;this.source=source;this.clearInput=clearInput;this.savedLanding=savedLanding;}
 get active(){return this.#active;}get paused(){return this.#paused;}get busy(){return this.#saving||this.session.busy;}
 get savingAutomatically(){return this.#automaticSave&&!this.#paused&&!this.session.blocked;}
 get dirty(){const dirty=this.session.dirty;return typeof dirty==='boolean'?dirty:!same(this.session.state,this.session.saved);}
 get record(){return{...this.source,work:this.session.state};}
 get canAdvance(){return this.#active&&!this.#paused&&!this.busy&&!this.session.blocked&&!this.session.intent;}
 get canOperate(){return this.canAdvance&&!transportWorkMoving(this.session.state);}
 get canExit(){return this.#active&&!this.busy&&!this.session.blocked&&!this.session.intent&&transportWorkCanExit(this.record);}
 canBegin(p){if(this.#active||this.busy||this.session.blocked||this.session.intent||!p)return false;const site=worldTransportSoil(this.record).initial.source.site;
  // First load resumes the recorded body at its actual position, including an
  // interrupted operation. A later visit must come through the physical gate.
  if(!this.#entered&&this.savedLanding){const saved=transportWorldPose(this.record);return [p.x,p.y,p.z].every(Number.isFinite)&&Math.hypot(p.x-saved.x,p.z-saved.z)<.5&&Math.abs(p.y-saved.y)<.05;}
  return excavationEntry(site,p);
 }
 begin(p){require(this.canBegin(p),'入口へ戻ってから、保存した現場を再開してください。');this.clearInput();this.#active=true;this.#paused=true;this.#entered=true;return this.session.state;}
 beginHandEarth(p){
  require(!this.#active&&!this.busy&&!this.session.blocked&&!this.session.intent&&p,'前の作業を終えてから、土でつくろう。');
  const o=transportSiteOrigin(this.record);
  this.session.move('arriveHandEarth',{x:p.x-o[0],y:p.y,z:p.z-o[2],heading:p.heading});
  this.clearInput();this.#active=true;this.#paused=true;this.#entered=true;return this.session.state;
 }
 doorTargets(id){
  if(this.#active||this.busy||this.session.blocked||this.session.intent)return [];
  const work=this.session.state;
  let points;
  if(Object.isFrozen(work)){
   // Reuse the physical result while the terrain and both vehicle poses are identical.
   let doors=this.#doorApproaches.get(work);
   if(!doors)this.#doorApproaches.set(work,doors=new Map());
   if(!doors.has(id))doors.set(id,transportDoorApproaches(work,id));
   points=doors.get(id);
  }else points=transportDoorApproaches(work,id);
  const o=transportSiteOrigin(this.record);return points.map(p=>({...p,x:p.x+o[0],z:p.z+o[2]}));
 }
 doorTarget(id,from){
  const points=this.doorTargets(id);
  if(from)points.sort((a,b)=>Math.hypot(a.x-from.x,a.z-from.z)-Math.hypot(b.x-from.x,b.z-from.z));
  return points[0]??null;
 }
 beginAtDoor(id,p,{near=false}={}){
  const goal=this.doorTarget(id,p);
  require(goal&&p&&['x','y','z'].every(k=>Number.isFinite(p[k]))&&Math.hypot(p.x-goal.x,p.z-goal.z)<=(near?9:.6)&&Math.abs(p.y-goal.y)<=.05,'運転席のドアへ歩いてから乗ろう。');
  const o=transportSiteOrigin(this.record);
  this.session.move('arriveTransportDoor',id,{x:p.x-o[0],y:p.y,z:p.z-o[2]},...(near?[true]:[]));
  this.clearInput();this.#active=true;this.#paused=true;this.#entered=true;return this.session.state;
 }
 pause(){this.clearInput();this.#paused=true;}
 resume(){require(this.#active&&!this.busy&&!this.session.blocked&&!this.session.intent,'保存を確認してから再開してください。');this.clearInput();this.#paused=false;}
 move(name,...args){require(this.canAdvance,'メニューを閉じ、保存を確認してから操作してください。');return this.session.move(name,...args);}
 async save({automatic=false,interruptible=false,rainTrial}={}){
  require(this.#active&&!this.busy&&!this.session.blocked&&!this.session.intent,'保存中、または保存の確認が必要です。');
  if(!automatic)this.pause();
  const cancel=automatic&&interruptible?new AbortController():null;
  this.#saving=true;this.#automaticSave=automatic;this.#automaticCancel=cancel;
  try{return await this.session.save(undefined,{signal:cancel?.signal,rainTrial});}
  finally{this.#saving=false;this.#automaticSave=false;this.#automaticCancel=null;}
 }
 cancelAutomaticSave(){this.#automaticCancel?.abort();}
 async retry(){require(this.#active&&!this.busy,'保存中は再保存できません。');this.pause();this.#saving=true;try{return await this.session.retry();}finally{this.#saving=false;}}
 async exit({force=false}={}){require(this.#active&&!this.busy&&!this.session.blocked&&!this.session.intent,'保存を確認してから退出してください。');require(force||transportWorkCanExit(this.record),'車を降り、土を動かす作業を終えてから戻ろう。');
  await this.save();const pose=force?{...transportSiteGate(this.record),z:transportSiteGate(this.record).z-12,heading:Math.PI}:transportWorldPose(this.record);
  this.#active=false;this.#paused=true;this.clearInput();return pose;
 }
}
