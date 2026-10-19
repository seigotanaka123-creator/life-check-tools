import {freeCell} from './free-build-state.mjs?v=120fw';
import {freeWorkCells} from './free-work-parts.mjs';
import {constructionBase,assertFoundationSupport} from './free-supported-build.mjs?v=120fw';
import {assertFoundationEnvironment} from './free-foundation-operation.mjs?v=120fw';
import {requireFormGround} from './free-foundation-check.mjs?v=120fw';
import {vehicleFootprints,overlaps} from './free-vehicle-shape.mjs';

// Walking never clears an undo. Re-check the present foot, vehicles and world
// before reintroducing geometry, instead of moving the player out of its way.
export function assertFreeStepUndoEnvironment(p,next,{foot,blockedAt=()=>true,heightAt=()=>null,step=p.workStepUndo}={}){
 const u=step;if(!u)return;
 const f=next.freeBuild,environment={foot,blockedAt,heightAt};
 if(u.type==='FREE_FOUNDATION_BUILD')assertFoundationEnvironment(p,{type:'FREE_FOUNDATION_REMOVE'},environment);
 if(u.type==='FREE_FOUNDATION_REMOVE')assertFoundationEnvironment(p,{type:'FREE_FOUNDATION_BUILD',...next.foundation},environment);
 if(u.type==='FREE_UNFRAME'){
  if(next.foundation)assertFoundationSupport(next,{heightAt,blockedAt});else requireFormGround(f,f.mask,f.height,heightAt,blockedAt);
  for(let i=0;i<16;i++)if(f.mask&(1<<i)){const c=freeCell(i);if(foot&&Math.abs(c.x-foot.x)<20&&Math.abs(c.z-foot.z)<20)throw Error('型枠を戻す場所から少し離れてね。');}
 }
 if(!['FREE_SET_WORK_PARTS','FREE_MOVE_WORK','FREE_TRANSFORM_WORK','FREE_TRANSFORM_SUPPORTED_WORK'].includes(u.type))return;
 if(next.foundation&&f.completed.some(w=>constructionBase(w)&&freeWorkCells(w).length))assertFoundationSupport(next,{heightAt,blockedAt});
 const cellKey=c=>`${c.x}:${c.z}:${c.baseY??0}:${c.quarters}`;
 const prior=p.freeBuild.completed.flatMap(w=>freeWorkCells(w)),after=f.completed.flatMap(w=>freeWorkCells(w));
 const oldKeys=new Set(prior.map(cellKey)),newKeys=new Set(after.map(cellKey));
 const changed=[...prior.filter(c=>!newKeys.has(cellKey(c))),...after.filter(c=>!oldKeys.has(cellKey(c)))];
 for(const c of changed)if(foot&&Math.abs(c.x-f.location.x-foot.x)<20&&Math.abs(c.z-f.location.z-foot.z)<20)throw Error('戻す作品の場所から少し離れてね。');
 for(const c of after.filter(c=>!oldKeys.has(cellKey(c)))){
  for(const dx of [-4,4])for(const dz of [-4,4])if(blockedAt(c.x+dx,c.z+dz,4))throw Error('戻す場所にほかの物があるよ。');
  const base=constructionBase(c);
  for(const dx of [-7.9,0,7.9])for(const dz of [-7.9,0,7.9]){const y=next.foundation&&base>0?next.foundation.deckY:heightAt(c.x+dx,c.z+dz);if(!Number.isFinite(y)||Math.abs(y-base)>.12)throw Error('作品を支える地面をたしかめてね。');}
  const tile={x:c.x-f.location.x,z:c.z-f.location.z,hx:8,hz:8,heading:0};
  for(const name of ['truck','pump'])if(vehicleFootprints(f[name]).some(body=>overlaps(body,tile)))throw Error('戻す場所に車があるよ。');
 }
}
