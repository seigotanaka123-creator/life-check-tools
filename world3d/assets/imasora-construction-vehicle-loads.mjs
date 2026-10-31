import{WATER_YARDS,SOIL_YARDS,TIMBER_YARDS}from'./imasora-construction-yard-origins.mjs?v=120gb';
// Game mass units, shared by previews and the normal save boundary. They are
// derived loads, never a second inventory or an engineering safety promise.
export const VEHICLE_MASS=Object.freeze({excavator:38,dump:28,water:24,soil:26,crane:40,truck:34,pump:38});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),amount=n=>Number.isFinite(n)?Math.max(0,n):0;
const wheels=()=>[-25.5,25.5].flatMap(x=>[-31,18].map(z=>({x,z,w:9,d:2})));
const tracks=()=>[-28,28].flatMap(x=>[-27,0,27].map(z=>({x,z,w:12,d:27})));
const sixWheels=()=>[-29,29].flatMap(x=>[-30,-13,26].map(z=>({x,z,w:6,d:2})));
const pads=(xs,zs)=>xs.flatMap(x=>zs.map(z=>({x,z,w:10,d:10})));
const point=(v,p)=>({x:v.x+Math.cos(v.heading)*p.x+Math.sin(v.heading)*p.z,z:v.z-Math.sin(v.heading)*p.x+Math.cos(v.heading)*p.z});
const cargo=p=>p?amount(p.w*p.h*p.d)/768*(p.materialId==='earth-iron'?(p.id?.startsWith('structural-kit-')?72/192:1)*7.8:1):0;
export function fleetVehicles(world){
 const out=[],add=(id,family,v,origin,mass,contacts,extra={})=>{if(v&&origin&&[v.x,v.z,v.heading].every(Number.isFinite))out.push({id,family,x:v.x+origin[0],z:v.z+origin[1],heading:v.heading,...(v.groundY===undefined?{}:{groundY:v.groundY}),speed:v.speed??0,steering:v.steering??0,mass,contacts,cgX:0,cgZ:0,...extra});};
 const water=world?.constructionWater,soil=world?.constructionSoil,timber=world?.constructionTimber,transport=world?.constructionTransport,f=transport?.work?.frame,free=world?.constructionProfileProject?.freeBuild;
 if(water){const w=water.work,v=w?.loader?.vehicle,loading=['source','returned','field-return','build-return'].includes(w?.task?.type),q=loading?128:amount(w?.load);add('water','constructionWater',v,WATER_YARDS[water.siteIndex],VEHICLE_MASS.water+q/24,wheels(),{cgZ:q/128*4});}
 if(soil){const w=soil.work,q=w?.task?4:amount(w?.load);add('soil','constructionSoil',w?.loader?.vehicle,SOIL_YARDS[soil.siteIndex],VEHICLE_MASS.soil+q*512*1.6/768,wheels(),{cgZ:q*3});}
 if(timber){const w=timber.work,v=w?.rig?.vehicle,p=w?.parts?.find(p=>p.id===w.held),m=cargo(p),o=TIMBER_YARDS[timber.siteIndex],mass=VEHICLE_MASS.crane+m;
  const deployed=clamp(w?.deployment??(w?.work?1:0),0,1),contacts=deployed===1?pads([-55,55],[-32,24]).map(p=>({...p,w:12,d:12})):wheels();
  let cgX=0,cgZ=0;if(p&&v){const dx=p.x-v.x,dz=p.z-v.z;cgX=(Math.cos(v.heading)*dx-Math.sin(v.heading)*dz)*m/mass;cgZ=(Math.sin(v.heading)*dx+Math.cos(v.heading)*dz)*m/mass;}
  add('crane','constructionTimber',v,o,mass,contacts,{cgX,cgZ,deployed});
 }
 if(f){const source=f.soil?.initial?.source,raw=f.soil?.field?.origin??(source?.yardOrigin?[source.yardOrigin[0],source.yardOrigin[2]]:null),o=raw;
  const containers=f.soil?.containers??{},pending=f.soil?.pending,nativeAmount=k=>amount(containers[k]?.amount)+(pending?.from===k?amount(pending.amount):0);add('excavator','constructionTransport',f.machineVehicle,o,VEHICLE_MASS.excavator+nativeAmount('bucket')*8*1.6/768,tracks(),{terrainFrame:f,cgZ:3});
  add('dump','constructionTransport',f.dump,o,VEHICLE_MASS.dump+nativeAmount('dump')*8*1.6/768,wheels(),{terrainFrame:f,cgZ:-nativeAmount('dump')/1392*10});
 }
 if(free?.location){const o=[free.location.x,free.location.z],m=free.mixer,ingredients=m?.ingredients,stored=ingredients?Math.min(...Object.entries({cement:150,sand:350,gravel:400,water:100}).map(([k,n])=>Math.floor(amount(ingredients[k])/n))):0,q=amount(free.wet)/4+stored+amount(m?.pending?.cells);
  add('truck','constructionProfileProject',free.truck,o,VEHICLE_MASS.truck+q*512*2.4/768,sixWheels(),{cgZ:-q/8*4});
  add('pump','constructionProfileProject',free.pump,o,VEHICLE_MASS.pump+amount(free.hose)*128*2.4/768,free.pump?.legs?pads([-35,35],[-20,20]).map(p=>({...p,w:9,d:9})):sixWheels(),{deployed:free.pump?.legs?1:0});
 }
 return out;
}
// Front/back and left/right reactions conserve the whole mass and its centre
// of gravity within the support polygon. No wheel gets a fresh mass allowance.
export function vehicleReactions(v){
 const points=v.contacts,x0=Math.min(...points.map(p=>p.x)),x1=Math.max(...points.map(p=>p.x)),z0=Math.min(...points.map(p=>p.z)),z1=Math.max(...points.map(p=>p.z)),x=clamp(v.cgX??0,x0,x1),z=clamp(v.cgZ??0,z0,z1);
 const sx=(x-x0)/(x1-x0||1),groups=[...new Set(points.map(p=>p.z))].sort((a,b)=>a-b),shares=new Map();
 for(const p of points){const zi=groups.indexOf(p.z),lo=groups[Math.max(0,zi-1)],hi=groups[Math.min(groups.length-1,zi+1)];let wz=0;if(z>=lo&&z<=p.z)wz+=(p.z===lo?1:(z-lo)/(p.z-lo));else if(z>p.z&&z<=hi)wz+=(hi===p.z?1:(hi-z)/(hi-p.z));shares.set(p,(p.x===x0?1-sx:sx)*wz);}
 const sum=[...shares.values()].reduce((a,b)=>a+b,0)||1,factor=Math.abs(v.speed??0)>.01?1.08+Math.min(.04,Math.abs(v.steering??0)*.08):1;
 return points.map(p=>({...p,...point(v,p),localX:p.x,localZ:p.z,heading:v.heading,load:v.mass*factor*shares.get(p)/sum,vehicleId:v.id}));
}
export function contactPolygon(p){const c=Math.cos(p.heading),s=Math.sin(p.heading);return[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>({x:p.x+c*x*p.w/2+s*z*p.d/2,z:p.z-s*x*p.w/2+c*z*p.d/2}));}
export function contactArea(polygon,b){let poly=polygon;for(const[axis,sign,limit]of[['x',1,b.x+b.w/2],['x',-1,-b.x+b.w/2],['z',1,b.z+b.d/2],['z',-1,-b.z+b.d/2]]){const next=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],aa=sign*a[axis]-limit,bb=sign*b[axis]-limit;if(aa<=0)next.push(a);if((aa<=0)!==(bb<=0)){const t=aa/(aa-bb);next.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});}}poly=next;if(!poly.length)return 0;}return Math.abs(poly.reduce((sum,a,i)=>{const b=poly[(i+1)%poly.length];return sum+a.x*b.z-a.z*b.x;},0))/2;}
export function vehicleContactLoads(vehicles,decks,heightAt=()=>0,measured=false){
 const loads=[],contacts=[];for(const v of vehicles)for(const p of vehicleReactions(v)){if(p.load<1e-8)continue;const polygon=contactPolygon(p),near=decks.filter(d=>d.panels.some(b=>contactArea(polygon,b)>1e-6));if(!near.length){contacts.push({vehicleId:v.id,x:p.x,z:p.z,top:0,deckIds:[],load:p.load,covered:0});continue;}const terrain=heightAt(p.x,p.z,v),ground=Number.isFinite(terrain)?terrain:0,higher=near.map(d=>d.top).filter(y=>y>=ground-.15),top=Number.isFinite(v.groundY)?(measured?ground:(higher.filter(y=>y<=v.groundY+8).sort((a,b)=>b-a)[0]??ground)):measured||v.terrainFrame||!higher.length?ground:Math.min(...higher),candidates=near.filter(d=>Math.abs(d.top-top)<.15);let left=p.w*p.d;
  const hit=[];for(const d of candidates){const a=Math.min(left,d.panels.reduce((n,b)=>n+contactArea(polygon,b),0));if(a<=1e-7)continue;const load=p.load*a/(p.w*p.d);loads.push({deckId:d.id,x:p.x,z:p.z,load,source:'vehicle-'+v.id});hit.push(d.id);left-=a;}
  contacts.push({vehicleId:v.id,x:p.x,z:p.z,top,deckIds:hit,load:p.load,covered:1-left/(p.w*p.d)});
 }
 return{loads,contacts};
}
export function sameVehicle(a,b){return a&&b&&['x','z','heading','speed','steering','mass','cgX','cgZ','deployed','groundY'].every(k=>a[k]===b[k]);}
export function sweptFleet(before,after,visit){const old=new Map(before.map(v=>[v.id,v]));let n=1;for(const b of after){const a=old.get(b.id);if(a)n=Math.max(n,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/2),Math.ceil(Math.abs(Math.atan2(Math.sin(b.heading-a.heading),Math.cos(b.heading-a.heading)))/.025));}if(n>256)return '車の移動を小さく分けてね。';for(let i=1;i<=n;i++){const t=i/n,fleet=after.map(b=>{const a=old.get(b.id);if(!a)return b;const q={...b};for(const k of['x','z','mass','cgX','cgZ'])q[k]=a[k]+(b[k]-a[k])*t;if(Number.isFinite(a.groundY)&&Number.isFinite(b.groundY))q.groundY=a.groundY+(b.groundY-a.groundY)*t;const angle=Math.atan2(Math.sin(b.heading-a.heading),Math.cos(b.heading-a.heading));q.heading=a.heading+angle*t;return q;});const issue=visit(fleet);if(issue)return issue;}return '';}
