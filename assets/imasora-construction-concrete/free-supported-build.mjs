import {inspectFormGround} from './free-foundation-check.mjs';
import {foundationContains} from './free-foundation-state.mjs';
import {ROUTE_EPS} from './free-route-clearance.mjs';

export const constructionBase=f=>f?.baseY??0;
export const RAISED_FRAME_ACTION='FREE_FRAME_RAISED';
// Match the existing foundation limit; clearance and support are still checked
// against the live terrain before and throughout every operation.
export const RAISED_BASE_MAX=16;
export const frameAssembly=a=>['FREE_FRAME',RAISED_FRAME_ACTION].includes(typeof a==='string'?a:a.type);
// Only an explicitly supported scaffold above the deck may pass over it.
// Calls without an elevation keep the original ground-level obstacle rule.
export const supportedToolBlocked=(p,external)=>(x,z,margin,soleY)=>external(x,z,margin)||((margin>=14-ROUTE_EPS)&&!!p.foundation&&!(Number.isFinite(soleY)&&soleY>p.foundation.deckY+.6)&&foundationContains(p.foundation,x-p.foundation.x,z-p.foundation.z,margin));
// Form/casting support only. Vehicle and ordinary walking queries retain the
// real terrain; this does not invent a ramp onto a temporary deck.
export function foundationSurfaceAt(s,x,z){
 if(!s)return null;
 for(let i=0;i<16;i++)if(s.mask&(1<<i)){
  const cx=s.x+(i%4-1.5)*16,cz=s.z+(Math.floor(i/4)-1.5)*16;
  if(Math.abs(x-cx)<=8+1e-8&&Math.abs(z-cz)<=8+1e-8)return s.deckY;
 }
 return null;
}
export function preparedFrameBuild(p,a){
 const f=p.freeBuild,s=p.foundation;
 if(a.type===RAISED_FRAME_ACTION){
  // Explicit heights work on low decks too; the legacy FREE_FRAME branch
  // below keeps its old meaning for existing saved operations.
  if(!s||s.x!==f.location.x||s.z!==f.location.z||s.deckY<=0||s.deckY>RAISED_BASE_MAX||![2,4,8].includes(a.height))throw Error('土台の高さは0超〜16、型枠の高さは2・4・8を選んでください。');
  return {...f,mask:s.mask,baseY:s.deckY,height:a.height};
 }
 if(a.type!=='FREE_FRAME'||!s)return f;
 if(s.x!==f.location.x||s.z!==f.location.z||s.deckY>4||f.height>4)throw Error('この土台ではまだ型枠を組めません。高さ4以下の土台と型枠を選んでください。');
 return {...f,mask:s.mask,baseY:s.deckY};
}
export function supportedWorkMatches(p,w,mask){
 const s=p.foundation;if(!s||Math.abs(s.deckY-constructionBase(w))>=1e-8)return false;
 if(p.schemaVersion<13)return s.x===w.x&&s.z===w.z&&(mask&s.mask)===mask;
 // Matching full 16x16 tiles keeps both corners and interiors supported and
 // retains the grid used by walking stairs/scaffold openings. No point-only
 // support test that would accept a small hole underneath a translated tile.
 for(let i=0;i<16;i++)if(mask&(1<<i)){
  const x=w.x+(i%4-1.5)*16,z=w.z+(Math.floor(i/4)-1.5)*16;
  const col=(x-s.x+24)/16,row=(z-s.z+24)/16;
  if(!Number.isInteger(col)||!Number.isInteger(row)||col<0||col>3||row<0||row>3||!(s.mask&(1<<(row*4+col))))return false;
 }
 return true;
}
export function assertFoundationSupport(p,{heightAt,blockedAt}={}){
 const s=p.foundation;if(!s)throw Error('施工物を支える土台がありません。');
 const plan=inspectFormGround(p.freeBuild,s.mask,2,heightAt,blockedAt,s.deckY);
 if(plan.kind!=='preparation'||plan.deckY!==s.deckY||plan.supports.length!==s.bottoms.length||plan.supports.some((v,i)=>Math.abs(v.bottom-s.bottoms[i])>1e-8))throw Error('土台を支える地面が変わりました。施工を止め、地面を確認してください。');
 return true;
}
