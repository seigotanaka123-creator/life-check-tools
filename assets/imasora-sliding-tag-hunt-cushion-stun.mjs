import{movingItemContactRadius}from'./imasora-sliding-tag-hunt-contact.mjs';
export const CUSHION_DIZZY_SECONDS=2;
export const huntIsDizzy=(s,a)=>(a?.effects?.dizzy??0)>s.time;
// Each rolling cushion can daze a body once. Resting against the same ball
// must never keep renewing the two-second timer.
export function applyCushionDizzy(s,a,g){
 if(g.kind!=='cushion'||g.until<=s.time||g.owner===a.owner&&s.time-g.spawnedAt<.35||g.ignore===a.owner&&s.time<g.ignoreUntil||g.dizzyHits?.[a.owner])return false;
 const r=movingItemContactRadius(a,g);if(r<0||Math.hypot(a.x-g.x,a.z-g.z)>r)return false;
 (g.dizzyHits??={})[a.owner]=true;(a.effects??={}).dizzy=s.time+CUSHION_DIZZY_SECONDS;
 a.hook=null;a.flight=null;a.dive=null;a.pendingItem=null;a.vx*=.25;a.vz*=.25;return true;
}
