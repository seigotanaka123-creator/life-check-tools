import {constructionBase,supportedWorkMatches,assertFoundationSupport} from './free-supported-build.mjs';
import {freeWorkMask,freeFilledMask,freeWorkCells} from './free-work-parts.mjs';
import {freeWorkMoveProblem,freeWorkMoveEnvironmentProblem} from './free-work-move.mjs';
import {rotateFreeWork} from './free-work-rotation.mjs';
import {walkingGroundAt} from './free-walking-ground.mjs';
import {foundationContains} from './free-foundation-state.mjs';
import {canonicalFreeAction} from './free-build-state.mjs';

export const SUPPORTED_WORK_MOVE='FREE_TRANSFORM_SUPPORTED_WORK';
// Old MOVE_WORK/TRANSFORM_WORK retain their historical ground-only meaning.
// Only this explicit action migrates a successful supported placement to v13.
const groundCopy=(p,index)=>({...p,freeBuild:{...p.freeBuild,completed:p.freeBuild.completed.map((w,i)=>i===index?{...w,baseY:0}:w)}});
export function supportedWorkMoveProblem(p,index,position,quarterTurns=0){
 const w=p.freeBuild?.completed[index];
 if(!w||!constructionBase(w))return '土台上の完成作品を選んでください。';
 const issue=freeWorkMoveProblem(groundCopy(p,index),index,position,quarterTurns);if(issue)return issue;
 const next={...rotateFreeWork(w,quarterTurns),x:position.x,z:position.z};
 if(freeWorkMask(next)&&!supportedWorkMatches({...p,schemaVersion:13},next,freeWorkMask(next)))return '同じ高さの土台のマスに合わせてください。配置する全ての部分を土台で支える必要があります。';
 return '';
}
export function supportedWorkMoveEnvironmentProblem(p,index,position,environment={},quarterTurns=0){
 const issue=supportedWorkMoveProblem(p,index,position,quarterTurns);if(issue)return issue;
 const {foot,blockedAt=()=>false,supportHeightAt=()=>null}=environment,f=p.freeBuild;
 if(!foot||!Number.isFinite(foot.x+foot.y+foot.z))return '地上から作品の配置を確認してください。';
 if(p.foundation&&foundationContains(p.foundation,f.location.x+foot.x-p.foundation.x,f.location.z+foot.z-p.foundation.z,14))return '土台の外の地上に立ってから作品を配置してください。';
 const support=walkingGroundAt(f,foot.x,foot.z,supportHeightAt);
 if(!support||Math.abs(support.height-foot.y)>.15)return '安全な地面に立ってから作品を配置してください。';
 if(freeWorkMask(f.completed[index]))try{assertFoundationSupport(p,{heightAt:supportHeightAt,blockedAt});}catch(e){return e.message;}
 // The deck, not natural Y=0, supplies support. Reuse all old spatial checks:
 // other work, source/destination soles, buildings, vehicles and material rack.
 return freeWorkMoveEnvironmentProblem(groundCopy(p,index),index,position,{foot,blockedAt,supportHeightAt:()=>0},quarterTurns);
}
export function supportedWorkSnapCandidates(p,index,quarterTurns=0,from=p.freeBuild?.completed[index]){
 const w=p.freeBuild?.completed[index],s=p.foundation;if(!w||!s||Math.abs(s.deckY-constructionBase(w))>1e-8)return [];
 const shape=rotateFreeWork(w,quarterTurns),cells=freeWorkCells(shape,freeWorkMask(shape)||freeFilledMask(shape)),found=new Map();
 for(const c of cells)for(let i=0;i<16;i++)if(s.mask&(1<<i)){const x=shape.x+s.x+(i%4-1.5)*16-c.x,z=shape.z+s.z+(Math.floor(i/4)-1.5)*16-c.z;const next={...shape,x,z};if(supportedWorkMatches({...p,schemaVersion:13},next,freeWorkMask(shape)||freeFilledMask(shape)))found.set(x+':'+z,{x,z});}
 return [...found.values()].sort((a,b)=>Math.hypot(a.x-from.x,a.z-from.z)-Math.hypot(b.x-from.x,b.z-from.z)||a.x-b.x||a.z-b.z);
}
const context=(p,a)=>JSON.stringify({profileId:p.profileId,revision:p.revision,action:canonicalFreeAction(a),freeBuild:p.freeBuild,foundation:p.foundation??null,location:p.location,completedFloors:p.completedFloors});
export function newSupportedWorkMoveReceipt(p,a,environment){
 if(a.type!==SUPPORTED_WORK_MOVE)throw Error('土台上の配置操作ではありません。');
 const issue=supportedWorkMoveEnvironmentProblem(p,a.work,a,environment,a.quarterTurns);if(issue)throw Error(issue);
 return{type:a.type,operationId:a.operationId,revision:p.revision,context:context(p,a),foot:{...environment.foot}};
}
export function assertSupportedWorkMoveReceipt(p,a,revision,r){
 if(a.type!==SUPPORTED_WORK_MOVE||!r||JSON.stringify(Object.keys(r).sort())!==JSON.stringify(['type','operationId','revision','context','foot'].sort())||r.type!==a.type||r.operationId!==a.operationId||revision!==p.revision||r.revision!==revision||r.context!==context(p,a)||!r.foot||JSON.stringify(Object.keys(r.foot).sort())!==JSON.stringify(['x','y','z'].sort())||!Number.isFinite(r.foot.x+r.foot.y+r.foot.z))throw Error('土台上の配置の確認記録が一致しません。確認し直してください。');
 const issue=supportedWorkMoveProblem(p,a.work,a,a.quarterTurns);if(issue)throw Error(issue);
 return true;
}
