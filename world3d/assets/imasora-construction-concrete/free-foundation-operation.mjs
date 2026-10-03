import {inspectFormGround} from './free-foundation-check.mjs';
import {FOUNDATION_ACTIONS,foundationBoardCount,foundationContains,foundationCorners,foundationParts,assertFoundationClear} from './free-foundation-state.mjs';
import {canonicalFreeAction} from './free-build-state.mjs';
import {walkingGroundAt} from './free-walking-ground.mjs';
import {frameBlocked} from './free-frames.mjs';
import {newToolWalkingReceipt} from './free-footing.mjs';
import {newScaffoldReceipt} from './free-frame-scaffold.mjs';
import {FOUNDATION_WORK_OFFSET} from './free-foundation-work-scaffold.mjs';
const error=()=>Error('土台の地面・通路・対象が変わりました。確認し直してください。');
export function foundationActionFromPlan(plan){if(plan.kind!=='preparation'||plan.deckY===null)throw Error(plan.issue);return{mask:plan.mask,deckY:plan.deckY,bottoms:plan.supports.map(p=>p.bottom)};}
export function assertFoundationEnvironment(p,a,{heightAt=()=>null,blockedAt=()=>true,foot=null}={}){
 if(!FOUNDATION_ACTIONS.has(a.type))throw error();const f=p.freeBuild,s=a.type==='FREE_FOUNDATION_BUILD'?{...foundationActionFromPlan(inspectFormGround(f,a.mask,2,heightAt,blockedAt)),x:f.location.x,z:f.location.z}:p.foundation;
 if(!s||s.x!==f.location.x||s.z!==f.location.z)throw error();
 assertFoundationClear(p,s);
 if(!foot||!Number.isFinite(foot.x+foot.y+foot.z)||foundationContains(s,foot.x,foot.z,14))throw Error('土台の外へ移動してから設置・回収してください。');
 const support=walkingGroundAt(f,foot.x,foot.z,heightAt);if(!support||Math.abs(support.height-foot.y)>.15)throw Error('足元を支える安全な地面から設置・回収してください。');
 if(a.type==='FREE_FOUNDATION_BUILD'){
  if(a.mask!==s.mask||Math.abs(a.deckY-s.deckY)>1e-8||a.bottoms.length!==s.bottoms.length||a.bottoms.some((v,i)=>Math.abs(v-s.bottoms[i])>1e-8))throw error();
 }else{
  // Removal does not require unchanged ground: a damaged empty support can be recovered.
  if(!(p.schemaVersion>=11?['design','complete']:['design']).includes(f.stage)||f.fill.some(Boolean)||f.aboard||f.connected||f.hose)throw Error('土台の上の作業を片付け、車を降りてから回収してください。');
  const visited=new Set();for(let i=0;i<16;i++)if(s.mask&(1<<i)){const c={x:(i%4-1.5)*16,z:(Math.floor(i/4)-1.5)*16};for(let dx=-8;dx<=8;dx+=2)for(let dz=-8;dz<=8;dz+=2){const point={x:c.x+dx,z:c.z+dz},key=point.x+','+point.z;if(visited.has(key))continue;visited.add(key);if(frameBlocked(f,[],point,blockedAt,1.5))throw Error('土台に重なる作品・車両・資材などを移動してから回収してください。');}}
 }
 return s;
}
const context=(p,a)=>JSON.stringify({profileId:p.profileId,action:canonicalFreeAction(a),freeBuild:p.freeBuild,foundation:p.foundation??null});
export function newFoundationReceipt(p,a){return{type:a.type,operationId:a.operationId,revision:p.revision,context:context(p,a),parts:0,samples:0,min:1,max:0,maxPlacementError:0,boardCount:foundationBoardCount(a.type==='FREE_FOUNDATION_BUILD'?a:p.foundation),terrainSamples:0};}
export function assertFoundationReceipt(p,a,revision,r,requireManual=false){const e=newFoundationReceipt(p,a),s=a.type==='FREE_FOUNDATION_BUILD'?a:p.foundation;
 if(r?.manual)e.manual=r.manual;
 if(!FOUNDATION_ACTIONS.has(a.type)||!r||JSON.stringify(Object.keys(r).sort())!==JSON.stringify(Object.keys(e).sort())||r.type!==a.type||r.operationId!==a.operationId||revision!==p.revision||r.revision!==revision||r.context!==e.context||r.boardCount!==e.boardCount||r.parts!==foundationParts(s).length||!Number.isSafeInteger(r.samples)||r.samples<3||!Number.isSafeInteger(r.terrainSamples)||r.terrainSamples<(a.type==='FREE_FOUNDATION_BUILD'?foundationCorners(s.mask).length:0)||!Number.isFinite(r.min)||r.min<0||r.min>1e-8||!Number.isFinite(r.max)||Math.abs(r.max-1)>1e-8||!Number.isFinite(r.maxPlacementError)||r.maxPlacementError<0||r.maxPlacementError>1e-5)throw Error('土台の設置・回収の完了を確認できません。');
 if(requireManual&&!r.manual)throw Error('土台の板運搬・手工具の接触を確認できません。');
 if(r.manual){const m=r.manual,keys=['version','ground','maxGripError','maxHandReach','maxHitError','items',...(m.version===2?['scaffold','scaffoldParts']:[])].sort(),parts=foundationParts(s);if(JSON.stringify(Object.keys(m).sort())!==JSON.stringify(keys)||![1,2].includes(m.version)||!Array.isArray(m.items)||m.items.length!==parts.length||!['maxGripError','maxHitError'].every(k=>Number.isFinite(m[k])&&m[k]>=0&&m[k]<=1e-5)||!Number.isFinite(m.maxHandReach)||m.maxHandReach<0||m.maxHandReach>24+1e-5)throw Error('土台の工具・運搬の記録が不正です。');
  const g=m.ground,valid=(n,max)=>Number.isFinite(n)&&n>=0&&n<=max;if(!g||JSON.stringify(Object.keys(g).sort())!==JSON.stringify(Object.keys(newToolWalkingReceipt()).sort())||!Number.isSafeInteger(g.samples)||g.samples<parts.length*3||!Number.isSafeInteger(g.terrainSamples)||g.terrainSamples<g.samples*25||!Number.isInteger(g.minimumPlanted)||g.minimumPlanted<1||g.minimumPlanted>2||!valid(g.maxSlope,Math.tan(8*Math.PI/180)+1e-8)||!valid(g.maxPatchError,.15+1e-5)||!valid(g.maxSoleError,.15+1e-5))throw Error('土台の工具作業の靴底・地面を確認できません。');
  const ordered=a.type==='FREE_FOUNDATION_REMOVE'?[...parts].reverse():parts;for(let i=0;i<ordered.length;i++){const q=m.items[i];if(!q||JSON.stringify(Object.keys(q).sort())!==JSON.stringify(['id','pickup','carry','placed','hits'].sort())||q.id!==ordered[i].id||!['pickup','carry','placed'].every(k=>Number.isSafeInteger(q[k])&&q[k]>=3)||!Array.isArray(q.hits)||q.hits.length!==2||!q.hits.every(v=>v===true))throw Error('土台の全ての部材が運搬・固定されていません。');}
  if(m.version===2){const q=m.scaffold,ids=m.scaffoldParts;let last=-1,steps=0;if(!Array.isArray(ids)||!ids.length)throw Error('土台の作業足場の対象がありません。');for(const v of ids){const i=ordered.findIndex(p=>p.id===v.id);if(JSON.stringify(Object.keys(v).sort())!==JSON.stringify(['id','height','base','treads'].sort())||i<=last||!Number.isFinite(v.height)||Math.abs(v.height-s.deckY-FOUNDATION_WORK_OFFSET)>1e-8||!Number.isFinite(v.base)||v.height-v.base<.35||!Number.isInteger(v.treads)||v.treads<1||v.treads>8||v.treads!==Math.ceil((v.height-v.base)/2.5))throw Error('土台の作業足場の階段が不正です。');last=i;steps+=v.treads+1;}
   if(!q||JSON.stringify(Object.keys(q).sort())!==JSON.stringify(Object.keys(newScaffoldReceipt()).sort())||q.deployments!==ids.length||q.recoveries!==ids.length||q.ascents!==steps||q.descents!==steps||!Number.isSafeInteger(q.samples)||q.samples<steps*6||!Number.isInteger(q.minimumPlanted)||q.minimumPlanted<1||q.minimumPlanted>2||!valid(q.maxSoleError,.15+1e-5)||!valid(q.maxSupportError,.15+1e-5))throw Error('土台の作業足場の設置・昇降・回収を確認できません。');
  }
 }
 return true;
}
export function createFoundationOperation({p,a,environment,draw,clear}){
 const s=assertFoundationEnvironment(p,a,environment()),receipt=newFoundationReceipt(p,a),parts=foundationParts(s);let elapsed=0,done=false,cancelled=false;
 receipt.maxPlacementError=draw(s,a.type==='FREE_FOUNDATION_BUILD'?0:1);receipt.samples=1;receipt.min=0;
 return{receipt,endPose:null,tick(dt){if(cancelled)return false;if(done)return true;if(!Number.isFinite(dt)||dt<=0)throw error();assertFoundationEnvironment(p,a,environment());elapsed+=Math.min(.05,dt);const t=Math.min(1,elapsed/4),progress=t*t*(3-2*t);const measured=draw(s,a.type==='FREE_FOUNDATION_BUILD'?progress:1-progress);receipt.samples++;receipt.min=Math.min(receipt.min,progress);receipt.max=progress;receipt.maxPlacementError=Math.max(receipt.maxPlacementError,measured);receipt.terrainSamples+=a.type==='FREE_FOUNDATION_BUILD'?foundationCorners(s.mask).length:0;
  if(t===1){receipt.parts=parts.length;assertFoundationReceipt(p,a,p.revision,receipt);done=true;return true;}return false;},verifyFooting(){assertFoundationEnvironment(p,a,environment());},cancel(){cancelled=true;clear();},settle(){clear();},get phase(){return a.type==='FREE_FOUNDATION_BUILD'?'支柱と土台を設置しています。':'土台と支柱を回収しています。';}};
}
