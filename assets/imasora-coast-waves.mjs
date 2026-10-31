import {coastPortExposure,COAST_PORT_WAVE_GLSL} from './imasora-coast-island-harbors.mjs?v=120lr';
import {COAST_ISLAND_GLSL} from './imasora-coast-sea-regions.mjs?v=120mu';
import {coastHeight,COAST_WATER_Y,coastTownCanalDepth} from './imasora-coast-layout.mjs?v=120mx';
// Deterministic sea time is supplied by the caller. Live play uses the real
// clock even on shore; tests may supply a fixed clock. No catch-up simulation.
export const WAVE=Object.freeze({period:48,transition:12,tidePeriod:180,tideAmplitude:4.2,kz:.024,kx:.008,speed:1.18,kz2:.041,kx2:-.019,speed2:1.61});
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const grade=n=>1+Math.floor(((n*73+Math.floor(n/7)*19+37)%101)/10.1);
let cachedTime=NaN,cachedClock=null;
function seaClock(t){if(t===cachedTime)return cachedClock;
 const n=Math.max(0,Math.floor(t/WAVE.period)),f=t-n*WAVE.period,blend=smooth((f-36)/12),from=n===0?2:grade(n),next=grade(n+1),level=from+(next-from)*blend;
 const phase=t*2*Math.PI/WAVE.tidePeriod,tide=WAVE.tideAmplitude*Math.sin(phase),tideRate=WAVE.tideAmplitude*2*Math.PI/WAVE.tidePeriod*Math.cos(phase);
 cachedTime=t;return cachedClock={level,next,tide,tideRate};
}
export function coastSeaState(x,z,t){
 const {level,next,tide,tideRate}=seaClock(t),exposure=(smooth((z-720)/360)*coastPortExposure(x,z));
 return {level:Math.round(1+(level-1)*exposure),offshoreLevel:level,next,exposure,tide,tideRate,tideName:Math.abs(tideRate)<.004?(tide>0?'満潮':'干潮'):tideRate>0?'満ち潮':'引き潮',amplitude:1.1+exposure*(.5+level*level*.16),kx:WAVE.kx,kz:WAVE.kz};
}
export function coastWave(x,z,t){
 const sea=seaClock(t),depth=COAST_WATER_Y+sea.tide-coastHeight(x,z),fade=coastTownCanalDepth(z)>0?0:clamp(depth/10),p=WAVE.kz*z+WAVE.kx*x+WAVE.speed*t,q=WAVE.kz2*z+WAVE.kx2*x+WAVE.speed2*t,a=1.1+(smooth((z-720)/360)*coastPortExposure(x,z))*(.5+sea.level*sea.level*.16),b=a*.26,cp=Math.cos(p),cq=Math.cos(q),orbital=a*.72*cp,flow=sea.tideRate*32;
 // Water velocity acts on submerged points, not as an arbitrary roll impulse.
 return {height:COAST_WATER_Y+sea.tide+fade*(a*Math.sin(p)+b*Math.sin(q)),vx:fade*(-.316*orbital+.4*cq),vz:fade*(-.949*orbital-1.1-flow),vy:sea.tideRate+fade*(a*WAVE.speed*cp+b*WAVE.speed2*cq)};
}
// A seabed destination below this bound stays submerged across every grade
// (1..10), tide and clock, including a tab returning after a long pause.
export function coastWaveFloor(x,z){
 const exposure=smooth((z-720)/360)*coastPortExposure(x,z),maximum=1.1+exposure*(.5+10*10*.16);
 return COAST_WATER_Y-WAVE.tideAmplitude-maximum*1.26;
}
export const COAST_WAVE_GLSL=`
${COAST_ISLAND_GLSL}
${COAST_PORT_WAVE_GLSL}
float seaGrade(float n){return 1.+floor(mod(n*73.+floor(n/7.)*19.+37.,101.)/10.1);}
float seaTide(float t){return 4.2*sin(t*6.28318530718/180.);}

#ifdef COAST_LIVE_CLOCK
uniform vec4 oceanPhase; // reduced wave phases, tide and grade, computed in double precision
#endif
float coastWaveHeight(vec2 p,float t){
 float n=max(0.,floor(t/48.)),b=smoothstep(36.,48.,t-n*48.);
 float level=mix(n<.5?2.:seaGrade(n),seaGrade(n+1.),b);
 
#ifdef COAST_LIVE_CLOCK
 level=oceanPhase.w;
#endif
 float a=1.1+smoothstep(720.,1080.,p.y)*seaShelter(p)*(.5+level*level*.16),tide=seaTide(t);
 
#ifdef COAST_LIVE_CLOCK
 tide=oceanPhase.z;
#endif
 float shore=325.+28.*cos(p.x/235.)+16.*sin(p.x/120.);
 float mainland=max(-240.,-4.5*smoothstep(175.,shore,p.y)-max(0.,p.y-shore)*.075);
 float depth=max(0.,-4.5+tide-max(mainland,coastIslandGround(p)));
 float f=clamp(depth/10.,0.,1.);
 
#ifdef COAST_LIVE_CLOCK
 return tide+f*(a*sin(p.y*.024+p.x*.008+oceanPhase.x)+a*.26*sin(p.y*.041-p.x*.019+oceanPhase.y));
#else
 return tide+f*(a*sin(p.y*.024+p.x*.008+t*1.18)+a*.26*sin(p.y*.041-p.x*.019+t*1.61));
#endif
}`;
