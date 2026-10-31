import {COAST_ISLANDS,smooth,legacyCoastHeight} from './imasora-coast-geography.mjs?v=120li';
export {COAST_ISLANDS} from './imasora-coast-geography.mjs?v=120li';
const reefIsland=COAST_ISLANDS.find(i=>i.id==='tide-island');
// A bounded offshore reef, clear of the preserved landing and its boat route.
// The same cut is used by the mainland floor, island vertices and water shader.
export function coastReefBed(x,z){const dx=x-reefIsland.x,dz=z-reefIsland.landingZ,w=smooth(180,300,dx)*(1-smooth(1100,1400,dx))*(1-smooth(240,440,Math.abs(dz)));if(!w)return null;return {weight:w,height:-15-505*smooth(200,1050,dx)+5*Math.sin(dx*.017)*Math.cos(dz*.014)};}
export function coastReefCut(y,x,z){const b=coastReefBed(x,z);return b?y+(b.height-y)*b.weight:y;}
// Shared analytic relief for walking, buoyancy and the rendered waterline.
export function islandRelief(i,x,z){
 const u=(x-i.x)/i.rx,v=(z-i.z)/i.rz,a=Math.atan2(v,u),r=Math.hypot(u,v),s=i.seed;
 const edge=1+.18*Math.sin(a*3+s)+.1*Math.sin(a*5-s*.7)+.07*Math.cos(a*7+s),q=r/edge;
 let y=-4.5+(1-smooth(.82,1,q))*13-Math.max(0,q-1)*110;
 const hill=Math.exp(-((u+.24)**2*6+(v-.16)**2*5))+.63*Math.exp(-((u-.34)**2*14+(v+.03)**2*9));
 const ridge=.72+.13*Math.sin(u*13+v*6+s)+.09*Math.sin(v*23-u*8)+.06*Math.cos(u*37+v*31);
 y+=i.peak*hill*ridge*(1-smooth(.5,.95,q));
 y-=32*Math.exp(-((u-.42)**2*35+(v+.76)**2*19));
 if(!i.legacy){
  const along=z-i.landingZ,access=(1-smooth(95,180,Math.abs(x-i.x)))*smooth(-900,-700,along)*(1-smooth(i.rz*1.35,i.rz*1.7,along));
  const bank=Math.max(-90,5+11*smooth(0,160,along)+Math.max(0,along-640)*.23-Math.max(0,-120-along)*.55),channel=smooth(170,190,along)*(1-smooth(540,560,along))*(1-smooth(52,68,Math.abs(x-i.x)));
  return y*(1-access)+(bank*(1-channel)-24*channel)*access;
 }
 // The old landing moves as one piece, so boats, ropes and creations still fit.
 const lr=Math.hypot((x-i.x)/i.legacy.rx,(z-i.landingZ)/i.legacy.rz),weight=1-smooth(1.5,2.6,lr);
 if(weight>0)y=y*(1-weight)+legacyCoastHeight(x-i.shiftX,z-i.shiftZ)*weight;
 // The enlarged north beach must not seal the preserved boat landing into
 // a landlocked basin. Carve only outside the old saved landing footprint.
 if(z<i.landingZ&&lr>1.5){const entrance=(1-smooth(100,220,Math.abs(x-i.x)))*smooth(1.5,1.9,lr);y+=(Math.min(y,-36)-y)*entrance;}
 const along=z-i.landingZ,route=(1-smooth(45,180,Math.abs(x-i.x)))*smooth(60,110,along)*(1-smooth(i.rz*1.35,i.rz*1.7,along));
 const valley=Math.max(4.5,4.5+(along-130)*.26);y=y*(1-route)+valley*route;
 return i.id==='tide-island'?coastReefCut(y,x,z):y;
}
export function coastIslandHeight(x,z){let h=-Infinity;for(const i of COAST_ISLANDS){if(Math.abs(x-i.x)>i.rx*1.5||Math.abs(z-i.z)>i.rz*1.7)continue;h=Math.max(h,islandRelief(i,x,z));}return h;}
const f=n=>Number.isInteger(n)?n+'.':String(n);
export const COAST_ISLAND_GLSL=`float coastIslandGround(vec2 p){float height=-10000.;${COAST_ISLANDS.map(i=>`{
 vec2 uv=(p-vec2(${f(i.x)},${f(i.z)}))/vec2(${f(i.rx)},${f(i.rz)});
 if(abs(uv.x)<=1.5&&abs(uv.y)<=1.7){float u=uv.x,v=uv.y,s=${f(i.seed)},a=atan(v,u),r=length(uv);
 float edge=1.+.18*sin(a*3.+s)+.1*sin(a*5.-s*.7)+.07*cos(a*7.+s),q=r/edge;
 float y=-4.5+(1.-smoothstep(.82,1.,q))*13.-max(0.,q-1.)*110.;
 float hill=exp(-((u+.24)*(u+.24)*6.+(v-.16)*(v-.16)*5.))+.63*exp(-((u-.34)*(u-.34)*14.+(v+.03)*(v+.03)*9.));
 float ridge=.72+.13*sin(u*13.+v*6.+s)+.09*sin(v*23.-u*8.)+.06*cos(u*37.+v*31.);
 y+=${f(i.peak)}*hill*ridge*(1.-smoothstep(.5,.95,q));y-=32.*exp(-((u-.42)*(u-.42)*35.+(v+.76)*(v+.76)*19.));
 ${i.legacy?`vec2 old=p-vec2(${f(i.shiftX)},${f(i.shiftZ)});float lr=length((old-vec2(${f(i.legacy.x)},${f(i.legacy.z)}))/vec2(${f(i.legacy.rx)},${f(i.legacy.rz)}));
 float weight=1.-smoothstep(1.5,2.6,lr);if(weight>0.){float shore=325.+28.*cos(old.x/235.)+16.*sin(old.x/120.);float former=-4.5*smoothstep(175.,shore,old.y)-max(0.,old.y-shore)*.075;
 if(lr<1.6)former=max(former,-4.5+${f(i.legacy.peak)}*(1.-smoothstep(0.,.55,lr))+9.*(1.-smoothstep(.55,.9,lr))-max(0.,lr-.9)*45.);y=mix(y,former,weight);}
 if(p.y<${f(i.landingZ)}&&lr>1.5){float entrance=(1.-smoothstep(100.,220.,abs(p.x-(${f(i.x)}))))*smoothstep(1.5,1.9,lr);y=mix(y,min(y,-36.),entrance);}
 float along=p.y-${f(i.landingZ)},route=(1.-smoothstep(45.,180.,abs(p.x-(${f(i.x)}))))*smoothstep(60.,110.,along)*(1.-smoothstep(${f(i.rz*1.35)},${f(i.rz*1.7)},along));
 float valley=max(4.5,4.5+(along-130.)*.26);y=mix(y,valley,route);
 `:`float along=p.y-${f(i.landingZ)},access=(1.-smoothstep(95.,180.,abs(p.x-(${f(i.x)}))))*smoothstep(-900.,-700.,along)*(1.-smoothstep(${f(i.rz*1.35)},${f(i.rz*1.7)},along));
 float bank=max(-90.,5.+11.*smoothstep(0.,160.,along)+max(0.,along-640.)*.23-max(0.,-120.-along)*.55),channel=smoothstep(170.,190.,along)*(1.-smoothstep(540.,560.,along))*(1.-smoothstep(52.,68.,abs(p.x-(${f(i.x)}))));y=mix(y,mix(bank,-24.,channel),access);
 `}
 ${i.id==='tide-island'?`float dx=p.x-(${f(i.x)}),dz=p.y-${f(i.landingZ)},rw=smoothstep(180.,300.,dx)*(1.-smoothstep(1100.,1400.,dx))*(1.-smoothstep(240.,440.,abs(dz)));float rb=-15.-505.*smoothstep(200.,1050.,dx)+5.*sin(dx*.017)*cos(dz*.014);y=mix(y,rb,rw);`:''}
 height=max(height,y);}}
 `).join('')}return height;}`;
