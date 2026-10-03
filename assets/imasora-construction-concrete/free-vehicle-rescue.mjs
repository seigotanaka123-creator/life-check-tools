import {safeReturnPlan,assertSafeReturn} from './free-safe-return.mjs';
import {canonicalFreeAction} from './free-build-state.mjs';
const context=p=>JSON.stringify({profileId:p.profileId,revision:p.revision,freeBuild:p.freeBuild,foundation:p.foundation??null});
const onFoot=p=>({...p,freeBuild:{...p.freeBuild,aboard:null}});
const keys=(o,s)=>!!o&&typeof o==='object'&&Object.keys(o).sort().join(',')===s.split(',').sort().join(',');
// Rescue has an explicit confirmation and landing proof. The ordinary LEAVE
// history operation still changes only aboard; no new saved schema or vehicle pose.
export function vehicleRescuePlan(p,external,heightAt,canStand){
 if(!['truck','pump'].includes(p.freeBuild.aboard))throw Error('乗車中の車を確認してください。');
 const landing=safeReturnPlan(onFoot(p),external,heightAt,canStand);
 return{vehicle:p.freeBuild.aboard,context:context(p),landing};
}
export function assertVehicleRescue(p,plan,external,heightAt){
 if(!keys(plan,'vehicle,context,landing')||plan.vehicle!==p.freeBuild.aboard||plan.context!==context(p))throw Error('乗車中の車や現場が変わりました。救助をもう一度確認してください。');
 return assertSafeReturn(onFoot(p),plan.landing,external,heightAt);
}
const receiptContext=(p,a,landing)=>JSON.stringify({state:context(p),action:canonicalFreeAction(a),landing});
export function newVehicleRescueReceipt(p,a,plan){
 if(a.type!=='FREE_LEAVE'||plan.context!==context(p)||plan.vehicle!==p.freeBuild.aboard)throw Error('救助の対象が一致しません。');
 return{type:a.type,operationId:a.operationId,revision:p.revision,context:receiptContext(p,a,plan.landing),rescue:{version:1,vehicle:plan.vehicle,landing:structuredClone(plan.landing),samples:0,maxSoleError:0}};
}
export function assertVehicleRescueReceipt(p,a,revision,r){
 const b=r?.rescue;
 if(a.type!=='FREE_LEAVE'||!keys(r,'type,operationId,revision,context,rescue')||r.type!==a.type||r.operationId!==a.operationId||r.revision!==revision||p.revision!==revision||r.context!==receiptContext(p,a,b?.landing)||!keys(b,'version,vehicle,landing,samples,maxSoleError')||b.version!==1||b.vehicle!==p.freeBuild.aboard||!['truck','pump'].includes(b.vehicle))throw Error('救助記録が現在の乗車状態と一致しません。');
 // Replay the deterministic landing envelope; live terrain and the actual
 // rendered shoes are checked in the view again immediately before persistence.
 const q=b.landing?.pose;
 if(!keys(b.landing,'context,pose')||b.landing.context!==JSON.stringify({revision:p.revision,freeBuild:onFoot(p).freeBuild,foundation:p.foundation??null})||!keys(q,'heading,x,y,z')||![q.x,q.y,q.z,q.heading].every(Number.isFinite)||Math.hypot(q.x,q.z-116)>160+1e-5||Math.abs(q.heading)>Math.PI*2||!Number.isSafeInteger(b.samples)||b.samples<3||!Number.isFinite(b.maxSoleError)||b.maxSoleError<0||b.maxSoleError>.15+1e-5)throw Error('救助先の足元と靴底を確認できません。');
 return true;
}
