import {sameConstructionRecordValue as same} from './imasora-construction-record-equality.mjs';
import {transportSiteGate,transportWorldPose} from './imasora-construction-transport-site.mjs';
import {excavationEntry} from './imasora-construction-world-excavation.js';
import {worldTransportSoil} from './imasora-construction-transport-authority.mjs';
const require=(ok,text)=>{if(!ok)throw Error(text);};
export const transportWorkMoving=w=>!!(w?.scoop||w?.link||w?.unload||w?.frame.job);
export function transportWorkCanExit(record){const w=record.work,p=w.frame.player;return w.mode==='foot'&&!transportWorkMoving(w)&&!w.frame.soil.pending&&Math.abs(p.y)<.05&&Math.abs(p.x+230)<32&&p.z<-210;}
// Scene ownership is transient; physical work is saved only by the existing
// normal-world session. Opening a menu or completing a retry never resumes it.
export class TransportPlaySession{
 #active=false;#paused=true;#saving=false;#entered=false;
 constructor(session,{clearInput=()=>{},savedLanding=true}={}){const source=session?.record??session?.service?.constructionTransport;require(session?.state&&source?.version===2,'保存した土運搬の現場を開いてください。');require(typeof savedLanding==='boolean','現場の入口を確認してください。');this.session=session;this.source=source;this.clearInput=clearInput;this.savedLanding=savedLanding;}
 get active(){return this.#active;}get paused(){return this.#paused;}get busy(){return this.#saving||this.session.busy;}
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
 pause(){this.clearInput();this.#paused=true;}
 resume(){require(this.#active&&!this.busy&&!this.session.blocked&&!this.session.intent,'保存を確認してから再開してください。');this.clearInput();this.#paused=false;}
 move(name,...args){require(this.canAdvance,'メニューを閉じ、保存を確認してから操作してください。');return this.session.move(name,...args);}
 async save(){require(this.#active&&!this.busy&&!this.session.blocked&&!this.session.intent,'保存中、または保存の確認が必要です。');this.pause();this.#saving=true;try{return await this.session.save();}finally{this.#saving=false;}}
 async retry(){require(this.#active&&!this.busy,'保存中は再保存できません。');this.pause();this.#saving=true;try{return await this.session.retry();}finally{this.#saving=false;}}
 async exit({force=false}={}){require(this.#active&&!this.busy&&!this.session.blocked&&!this.session.intent,'保存を確認してから退出してください。');require(force||transportWorkCanExit(this.record),'車を降り、土を放す動作を終えて入口まで歩いて戻ってください。');
  await this.save();const pose=force?{...transportSiteGate(this.record),z:transportSiteGate(this.record).z-12,heading:Math.PI}:transportWorldPose(this.record);
  this.#active=false;this.#paused=true;this.clearInput();return pose;
 }
}
