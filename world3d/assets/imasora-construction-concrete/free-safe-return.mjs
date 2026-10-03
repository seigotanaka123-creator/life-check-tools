import {freeEntryPose} from './free-boarding.mjs';
import {walkingGroundAt} from './free-walking-ground.mjs';
import {walkingBlocked} from './free-contact.mjs';
const context=p=>JSON.stringify({revision:p.revision,freeBuild:p.freeBuild,foundation:p.foundation??null});
// This is an explicit rescue, after confirmation. It does not pretend that a
// missing route can be walked, and never moves a vehicle or alters saved materials.
export function safeReturnPlan(p,external=()=>false,heightAt=()=>0,canStand=()=>true){
 if(p.freeBuild.aboard)throw Error('安全なドア前に停めて車を降りてから、地面へ戻ってください。');
 return{context:context(p),pose:freeEntryPose(p.freeBuild,{x:0,y:0,z:116,heading:Math.PI},external,heightAt,canStand)};
}
export function assertSafeReturn(p,plan,external=()=>false,heightAt=()=>0){
 if(p.freeBuild.aboard||!plan||plan.context!==context(p)||Object.keys(plan).sort().join(',')!=='context,pose')throw Error('現場が変わりました。戻る場所をもう一度確認してください。');
 const q=plan.pose;if(!q||Object.keys(q).sort().join(',')!=='heading,x,y,z'||![q.x,q.y,q.z,q.heading].every(Number.isFinite)||Math.hypot(q.x,q.z-116)>160+1e-5)throw Error('戻る場所を確認できません。');
 const s=walkingGroundAt(p.freeBuild,q.x,q.z,heightAt);if(!s||Math.abs(s.height-q.y)>1e-5||walkingBlocked(p.freeBuild,q.x,q.z,external,null,heightAt))throw Error('戻る場所の足元や通路が変わりました。もう一度確認してください。');
 return s;
}
