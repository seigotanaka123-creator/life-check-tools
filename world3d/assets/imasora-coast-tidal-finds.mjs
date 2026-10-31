import {coastHeight,coastShore} from './imasora-coast-layout.mjs?v=120mx';
import {coastWave,coastSeaState,WAVE} from './imasora-coast-waves.mjs?v=120mx';

// One clock for water, buoyancy and discoveries, including when a menu is open.
export const coastOceanTime=(at=Date.now())=>at/1000;
const random=(seed,salt)=>{let n=Math.imul(seed^salt,1597334677);n=Math.imul(n^(n>>>15),2246822519);return ((n^(n>>>13))>>>0)/4294967296;};
function slotSeed(id){let n=5381;for(const c of id)n=Math.imul(n,33)^c.charCodeAt(0);return n;}
// New positions arrive under the incoming tide; the same tide has the same
// finds after reopening. Old receipt IDs and their cooldowns remain unchanged.
export function coastFindPose(find,at=Date.now()){
 const t=coastOceanTime(at),cycle=Math.floor(t/WAVE.tidePeriod),seed=slotSeed(find.id)^cycle;
 let x=Math.max(-810,Math.min(810,find.x+(random(seed,17)-.5)*164));
 if(x>260&&x<440)x=x<340?250:450; // Keep the pier's real boarding lane clear.
 const sea=coastSeaState(x,0,t);
 // A shoreward wave carries each item in, then the backwash draws it away.
 // The swell shares the real water phases. A deterministic alongshore offset
 // spreads the opportunities rather than laying all fifteen out at low tide.
 const swell=(1+Math.sin(WAVE.speed*t*.22+WAVE.kx*x+random(seed,53)*Math.PI*2))/2;
 const drift=swell*swell*(3-2*swell);
 x+=drift*(random(seed,91)-.5)*90;
 const z=coastShore(x)+15+random(seed,31)*15+drift*145,y=coastHeight(x,z);
 const water=coastWave(x,z,t).height,depth=water-y,visible=depth<.1&&drift<.24;
 // Wet objects can still be seen floating away, but cannot be picked up.
 // Once carried under the next breaker they disappear beneath the water.
 const rendered=sea.tide<.4&&depth<5.5&&drift<.82;
 const drawY=visible?y:Math.max(y,water-.8);
 return {...find,x,y,z,visible,rendered,drawY,washed:!visible,tide:sea.tideName,cycle,rotation:random(seed,77)*Math.PI*2+drift*.7};
}
