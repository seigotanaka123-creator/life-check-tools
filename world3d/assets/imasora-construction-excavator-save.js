// 9-1c1: checkpoints for the v467 loan plot. No world wallet or legacy saves.
import {initialExcavatorBuild,tunnelPlan} from './imasora-construction-excavator-build.js';
import {EX,armPose,cellCenter,totals,scoopPoseAt,stickExtensionLimit,bucketOpenLimit,contactActionArm} from './imasora-construction-excavator.js';
import {canonical} from './imasora-construction-state.js';
import {EX_ACCESS,upgradeExcavatorAccess} from './imasora-construction-excavator-access.js';
import {BACKHOE_BUCKET,CONTACT_DIG,isContactDig} from './imasora-construction-excavator-bucket.js';
export const EXCAVATION_FORMAT='imasora-excavation-checkpoint-v1';
export const BACKHOE_EXCAVATION_FORMAT='imasora-excavation-checkpoint-v2';
export const CONTACT_EXCAVATION_FORMAT='imasora-excavation-checkpoint-v3';
const PLAN=tunnelPlan(),ORIGINAL=initialExcavatorBuild().terrain;
const FREE_PLAN=Object.fromEntries(Object.keys(ORIGINAL).map(id=>[id,true]));
const requireValue=(ok,message)=>{if(!ok)throw new Error(message);};
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const check=(v,message)=>requireValue(v,`掘削セーブ：${message}`);
function position(p){check(object(p)&&finite(p.x,-640,640)&&finite(p.z,-580,580)&&finite(p.y,-40,2000),'座標が不正です。');}
function hash(text){let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return(h>>>0).toString(16).padStart(8,'0');}
function armValid(a,s){check(object(a)&&finite(a.boom,EX.boomMin-1e-7,EX.boomMax+1e-7)&&finite(a.stick,-2.5500001,stickExtensionLimit(s)+1e-7)&&finite(a.slew,-EX.slewLimit-1e-7,EX.slewLimit+1e-7)&&finite(a.curl,bucketOpenLimit(s)-1e-7,1.1000001),'アーム角度が不正です。');}
export function validateExcavation(s){
  check(object(s)&&s.total===1792&&s.example==='dig'&&s.guide===null,'別の区画・形式、または未対応の補助経路です。');
  check(s.bucketStyle===undefined||s.bucketStyle===BACKHOE_BUCKET,'未対応のバケット形式です。');
  check(s.digMode===undefined||(s.digMode===CONTACT_DIG&&s.bucketStyle===BACKHOE_BUCKET),'未対応の接触掘削形式です。');
  const plan=isContactDig(s)?FREE_PLAN:PLAN;
  check(integer(s.revision,0,Number.MAX_SAFE_INTEGER-1)&&integer(s.serial,0,Number.MAX_SAFE_INTEGER-1),'保存番号が不正です。');
  check(integer(s.positionedRow,6,16)&&canonical(s.cutMask)===canonical(plan),'設計図が一致しません。');
  check(object(s.terrain)&&Object.keys(s.terrain).length<=1792,'地形が不正です。');
  for(const [id,p] of Object.entries(s.terrain))check(Object.hasOwn(ORIGINAL,id)&&canonical(p)===canonical(ORIGINAL[id]),'土セルの座標が一致しません。');
  for(const id of Object.keys(ORIGINAL))check(plan[id]||Object.hasOwn(s.terrain,id),'保護された床・壁・天井が欠けています。');
  check(integer(s.load,0,6)&&integer(s.bin,0,1792)&&Array.isArray(s.falling)&&Array.isArray(s.spoil)&&s.falling.length+s.spoil.length<=1792,'土の台帳が不正です。');
  const ids=new Set();for(const p of [...s.falling,...s.spoil]){position(p);check(integer(p.id,1,s.serial)&&!ids.has(p.id)&&finite(p.vy,-5000,0),'落下・排土のIDまたは速度が不正です。');ids.add(p.id);}
  check(totals(s).total===1792,'土の総量が一致しません。上書きせず停止します。');armValid(s.arm,s);
  const l=s.loader,v=l?.vehicle,p=l?.player;
  check(object(l)&&['foot','boarding','driving','working','exiting'].includes(l.mode)&&object(v),'乗車状態が不正です。');position(p);
  check(finite(v.x,-320,320)&&finite(v.z,-250,250)&&finite(v.heading,-Math.PI-1e-7,Math.PI+1e-7)&&finite(v.speed,-48.001,100.001)&&finite(v.steering,-.471,.471)&&finite(v.wheelTravel,-1e10,1e10),'車体の走行状態が不正です。');
  check(finite(p.heading,-20,20)&&finite(p.vy??0,-5000,100),'乗員の状態が不正です。');
  for(const k of ['grounded','ceilingHit','jumpHeld'])check(p[k]===undefined||typeof p[k]==='boolean','歩行状態が不正です。');
  if(l.transition){const t=l.transition;check(['boarding','exiting'].includes(l.mode)&&object(t)&&Array.isArray(t.path)&&t.path.length>=2&&t.path.length<=8&&[-1,1].includes(t.side),'乗降経路が不正です。');check(t.duration===(l.mode==='boarding'?1.9:2.1)&&finite(t.elapsed,0,t.duration)&&t.elapsed<t.duration,'乗降の時間が不正です。');for(const q of t.path){position(q);check(finite(q.heading,-20,20),'乗降の向きが不正です。');}}
  else check(l.transition===null&&!['boarding','exiting'].includes(l.mode),'乗降経路が欠けています。');
  if(s.action){
    const a=s.action;check(object(a)&&['scoop','dump','center'].includes(a.kind),'バケット動作が不正です。');
    if(a.kind==='center')check(a.elapsed===0,'旋回状態が不正です。');
    else if(isContactDig(s)){
      check(a.contact===true&&a.duration===1.6&&finite(a.elapsed,0,1.6)&&a.elapsed<1.6,'接触掘削の時間が不正です。');armValid(a.from,s);armValid(a.end,s);
      check(a.loadedLift===undefined||(a.loadedLift===true&&a.kind==='scoop'&&s.load===6),'持ち上げ状態が不正です。');
      const end=a.loadedLift?{...a.from,boom:Math.min(EX.boomMax,a.from.boom+.28),stick:Math.max(-2.55,a.from.stick-.1),curl:1.1}:{...a.from,curl:a.kind==='scoop'?Math.min(1.1,a.from.curl+.95):bucketOpenLimit(s),stick:a.kind==='scoop'?Math.max(-2.55,a.from.stick-.22):a.from.stick};
      check(canonical(a.end)===canonical(end),'バケットの動作終点が不正です。');
      const expected=contactActionArm(a,a.elapsed/a.duration);for(const k of['boom','stick','slew','curl'])check(Math.abs(expected[k]-s.arm[k])<1e-6,'関節角度と時間が一致しません。');
      check(Array.isArray(a.collected)&&a.collected.length<=6,'掘削した土の記録が不正です。');const taken=new Set();
      for(const t of a.collected){check(object(t)&&['terrain','spoil'].includes(t.kind),'掘削した土の種類が不正です。');position(t.position);const id=t.kind+':'+t.id;check(!taken.has(id),'掘削した土が重複しています。');taken.add(id);
        if(t.kind==='terrain')check(Object.hasOwn(ORIGINAL,t.id)&&!s.terrain[t.id]&&canonical(t.position)===canonical(cellCenter(ORIGINAL[t.id])),'接触掘削の土セルが不正です。');
        else check(integer(t.id,1,s.serial)&&!s.spoil.some(p=>p.id===t.id),'排土の転送状態が不正です。');
      }
      if(a.kind==='scoop')check(a.initialLoad===0&&s.load===a.collected.length,'接触掘削の数量が不正です。');
      else check(integer(a.initialLoad,1,6)&&s.load<=a.initialLoad&&a.collected.length===0,'排土の数量が不正です。');
    }else {
      check(a.contact===undefined,'従来形式に接触掘削は保存できません。');
      check(a.duration===1.6&&finite(a.elapsed,0,1.6)&&a.elapsed<1.6&&finite(a.start,-.4500001,1.1000001),'バケット動作の時間が不正です。');
      const t=a.elapsed/1.6,e=t*t*(3-2*t),curl=a.start+((a.kind==='scoop'?1.1:-.45)-a.start)*e;
      check(Math.abs(s.arm.curl-curl)<1e-6,'巻き込み角度と時間が一致しません。');
      if(a.kind==='scoop'){
        position(a.center);const expected=scoopPoseAt(s,a.center,a.start,t);check(expected,'掘削経路が届かない位置です。');
        const tip=armPose(s).bucket,planned=armPose({...s,arm:expected}).bucket;check(Math.hypot(tip.x-planned.x,tip.y-planned.y,tip.z-planned.z)<1e-5,'掘削位置が一致しません。');
        check(Array.isArray(a.targets)&&a.targets.length>=1&&a.targets.length<=6&&typeof a.transferred==='boolean'&&a.transferred===(t>=.48),'すくい込みの転送状態が不正です。');
        check(s.load===(a.transferred?a.targets.length:0),'バケットの数量と作業途中の数量が一致しません。');
        const targets=new Set();for(const target of a.targets){
          check(object(target)&&['terrain','spoil'].includes(target.kind),'掘削対象が不正です。');position(target.position);
          const id=`${target.kind}:${target.id}`;check(!targets.has(id),'掘削対象が重複しています。');targets.add(id);
          if(target.kind==='terrain'){
            check(Object.hasOwn(PLAN,target.id)&&canonical(target.position)===canonical(cellCenter(ORIGINAL[target.id])),'保護対象または不正な土セルです。');
            check(Object.hasOwn(s.terrain,target.id)!==a.transferred,'土セルの転送が二重、または欠落しています。');
          }else check(integer(target.id,1,s.serial)&&s.spoil.some(q=>q.id===target.id)!==a.transferred,'排土の転送が二重、または欠落しています。');
          check(Math.hypot(target.position.x-a.center.x,target.position.y-a.center.y,target.position.z-a.center.z)<=20.00001,'掘削対象が遠すぎます。');
        }
      }
    }
  }else check(s.action===null,'作業状態が欠けています。');
  if(l.transition?.accessVersion!==undefined)check(l.transition.accessVersion===EX_ACCESS.version,'未対応の乗降経路です。');
  return s;
}
export function excavationCheckpoint(state){
  // Plans and held inputs are ephemeral. A bucket/boarding action is not: keep
  // its elapsed time, selected cells and transfer flag, including airborne soil.
  const s=structuredClone(state);s.guide=null;s.hit='';s.message='保存した作業を読み込みました。「作業を再開」で続けられます。';
  s.loader.hit='';s.loader.message='';s.positionedRow=Number.isFinite(s.positionedRow)?s.positionedRow:16;
  return validateExcavation(s);
}
export function resumeExcavation(state){const s=structuredClone(state);s.guide=null;s.loader.vehicle.speed=0;s.loader.player.jumpHeld=false;return s;}
export function packExcavation(state){const s=excavationCheckpoint(state),payload=canonical(s);return{kind:isContactDig(s)?CONTACT_EXCAVATION_FORMAT:s.bucketStyle===BACKHOE_BUCKET?BACKHOE_EXCAVATION_FORMAT:EXCAVATION_FORMAT,payload,checksum:hash(payload)};}
export function unpackExcavation(packet){
  check([EXCAVATION_FORMAT,BACKHOE_EXCAVATION_FORMAT,CONTACT_EXCAVATION_FORMAT].includes(packet?.kind),'この版で読めない保存形式です。元データを保護します。');
  check(typeof packet.payload==='string'&&packet.payload.length<=1_000_000&&packet.checksum===hash(packet.payload),'保存データの破損を検出しました。');
  const state=validateExcavation(JSON.parse(packet.payload));
  check((packet.kind!==EXCAVATION_FORMAT)===(state.bucketStyle===BACKHOE_BUCKET)&&(packet.kind===CONTACT_EXCAVATION_FORMAT)===isContactDig(state),'バケットと保存形式が一致しません。');
  if(state.loader.transition?.accessVersion!==undefined)check(state.loader.transition.accessVersion===EX_ACCESS.version,'未対応の乗降経路です。');
  return upgradeExcavatorAccess(state);
}
