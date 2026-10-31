import {validateCoastPlay,coastUnloadingLanded,seaFloor} from './imasora-coast-physics.mjs?v=120nz';
import {COAST_SALVAGE} from './imasora-coast-salvage.mjs?v=120ny';

// Contents belong to the ordinary pouch ledger, not an undoable scene flag.
// The recovered container and its floats remain real reusable bodies.
export const COAST_RECOVERY_KITS=1;
export function coastRecoveryReceiptPlan(s,{actor=null,riderId=null}={}){
 const saved=s?.salvage,cargo=saved&&s.parts.find(p=>p.id===saved.cargo);
 if(!cargo)return null;
 const nearby=!!actor&&[actor.x,actor.y,actor.z].every(Number.isFinite)&&Math.hypot(actor.x-cargo.p[0],actor.z-cargo.p[2])<=60;
 const base={site:COAST_SALVAGE.id,cargo:cargo.id,point:[...cargo.p],nearby,valid:false};
 if(!nearby||riderId)return {...base,message:'船を降りて、岸へ下ろした箱のそばへ行こう。'};
 if(Math.abs(actor.y-seaFloor(actor.x,actor.z))>1.5||seaFloor(actor.x,actor.z)<-3)return {...base,message:'岸に立って、箱の建材を受け取ろう。'};
 if(s.links.some(j=>j.a===cargo.id||j.b===cargo.id))return {...base,message:'箱を岸へ下ろして、浮きとロープを片付けよう。'};
 if(!coastUnloadingLanded(s,cargo.id))return {...base,message:'箱が岸に着いて、落ち着くまで待とう。'};
 return {...base,valid:true,message:'海で見つけた建築セット！ ポーチへ入れて、港や工事の材料にしよう。'};
}
export function assertCoastRecoveryReceipt(draft,action){
 const s=validateCoastPlay(draft.coastPhysics),position=draft.position;
 const actor=Array.isArray(position)?{x:position[0],y:position[1],z:position[2]}:position;
 const plan=coastRecoveryReceiptPlan(s,{actor});
 if(!plan?.valid||plan.site!==action.site||plan.cargo!==action.cargo)throw Error(plan?.message??'持ち帰った箱を岸へ下ろしてから受け取ろう。');
 return true;
}
