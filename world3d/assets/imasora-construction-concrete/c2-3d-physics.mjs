import {TRIAL,assertTrialState} from './c2-formwork-trial.mjs';
export const SITE=Object.freeze({half:16,radius:10.6,step:.3,rampHalf:12,rampEnd:28,bound:90,stockX:54,stockZ:0});
export const BUCKET=Object.freeze({height:8,radius:Math.sqrt(512/(Math.PI*8)),volume:512});
export function createSiteCollider(state){
 assertTrialState(state);
 return Object.freeze({framed:state.formworkPanelsInUse>0,ready:state.stage==='demolded',height:TRIAL.formHeight*state.pouredCells/TRIAL.targetCells});
}
function finitePoint(p){if(!p||!['x','y','z'].every(k=>Number.isFinite(p[k])))throw Error('INVALID_WALK_POSITION');}
function onSlab(p){return Math.abs(p.x)<=SITE.half&&Math.abs(p.z)<=SITE.half;}
export function supportAt(c,p){
 if(!c.ready)return 0;
 if(onSlab(p))return c.height;
 if(Math.abs(p.x)<=SITE.rampHalf&&p.z>SITE.half&&p.z<=SITE.rampEnd)return c.height*(SITE.rampEnd-p.z)/(SITE.rampEnd-SITE.half);
 return 0;
}
function intersectsRect(p,x0,x1,z0,z1,r){const dx=p.x-Math.max(x0,Math.min(x1,p.x)),dz=p.z-Math.max(z0,Math.min(z1,p.z));return dx*dx+dz*dz<r*r;}
function blocks(c,p,r){
 if(c.framed&&intersectsRect(p,-16.5,16.5,-16.5,16.5,r))return true;
 // The pallet is an obstacle too; material cannot be collected from inside it.
 if(intersectsRect(p,46,62,-8,8,r))return true;
 if(!c.ready)return false;
 const height=supportAt(c,p);
 if(height>p.y+SITE.step)return true;
 // Body cannot phase through the slab sides. The front opening is the ramp.
 const rampLane=Math.abs(p.x)<=SITE.rampHalf&&p.z>=16;
 if(!rampLane&&p.y+SITE.step<c.height&&intersectsRect(p,-16,16,-16,16,r))return true;
 if(Math.abs(p.x)>SITE.rampHalf&&p.z>16&&p.z<28){
  const edgeHeight=c.height*(28-p.z)/12;
  if(p.y+SITE.step<edgeHeight&&Math.abs(p.x)-SITE.rampHalf<r)return true;
 }
 return false;
}
// Bounded .2-unit substeps prevent high speed / large frame deltas tunnelling.
// Collider is rebuilt only after persisted changes, never by replaying history each frame.
export function stepCharacter(c,actor,delta,dt,radius=SITE.radius){
 finitePoint(actor);if(!Number.isFinite(delta?.x)||!Number.isFinite(delta?.z)||!Number.isFinite(dt)||dt<=0||dt>1||!Number.isFinite(radius)||radius<0||radius>15)throw Error('INVALID_WALK_STEP');
 if(Math.hypot(delta.x,delta.z)>200)throw Error('WALK_DELTA_TOO_LARGE');
 const n=Math.max(1,Math.ceil(Math.hypot(delta.x,delta.z)/.2),Math.ceil(dt/.02)),p={...actor,vy:actor.vy??0},hit=new Set();
 for(let i=0;i<n;i++){
  for(const axis of ['x','z']){const candidate={...p,[axis]:Math.max(-SITE.bound,Math.min(SITE.bound,p[axis]+delta[axis]/n))};if(blocks(c,candidate,radius))hit.add(axis);else p[axis]=candidate[axis];}
  const ground=supportAt(c,p),h=dt/n;
  if(p.y<=ground+SITE.step&&p.vy<=0&&ground>=p.y-.06){p.y=ground;p.vy=0;p.grounded=true;}
  else{p.vy-=32*h;p.y+=p.vy*h;if(p.y<=ground){p.y=ground;p.vy=0;p.grounded=true;}else p.grounded=false;}
 }
 return{actor:p,blocked:[...hit],distance:Math.hypot(p.x-actor.x,p.z-actor.z)};
}
export function onFinishedSurface(c,p){return c.ready&&onSlab(p)&&p.grounded===true&&Math.abs(p.y-c.height)<.001;}
export function contactAtFinishedEdge(c,p){return onFinishedSurface(c,p)&&(16-Math.abs(p.x)<2||16-Math.abs(p.z)<2);}
