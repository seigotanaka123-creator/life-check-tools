// Cloud racing: a one-way platform course. No car, road, lap or tire model.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const SKY_STEP=1/120,SKY_GRAVITY=22;
export const SKY_PARTS=[['足元','きびきび走る','勢いを残す'],['雲の弾み','高く跳ぶ','低く速く'],['風への備え','身軽に進む','風に負けない']];
export function skySetup(parts=[0,0,0]){if(parts.length!==3||parts.some(v=>v!==0&&v!==1))throw Error('INVALID_SKY_PARTS');return{speed:parts[0]?34:30,response:parts[0]?5:12,launch:parts[1]?18:23,mass:parts[2]?1.6:1,airControl:parts[2]?4:6};}
export function skyCourse(kind='terraces'){
 if(!['terraces','windway'].includes(kind))throw Error('INVALID_SKY_COURSE');
 const shift=kind==='windway'?35:0;
 const rows=[
  [0,0,0,64,68],[0,-130,2,68,58],[-75-shift,-260,5,72,64],[45+shift*.4,-280,14,64,52],
  [0,-395,7,96,65],[-85,-535,11,73,64],[40,-552,23,62,52],
  [0,-670,14,98,65],[shift,-810,18,85,64],[0,-945,22,85,70]
 ];
 const clouds=rows.map(([x,z,y,rx,rz],id)=>({id,x,z,y,rx,rz,spring:id===1||id===4||id===7}));
 const gates=[{x:0,z:-130,y:2,ids:[1]},{x:0,z:-260,y:5,ids:[2,3]},{x:0,z:-395,y:7,ids:[4]},{x:0,z:-535,y:11,ids:[5,6]},{x:0,z:-670,y:14,ids:[7]},{x:shift,z:-810,y:18,ids:[8]},{x:0,z:-945,y:22,ids:[9]}];
 return{kind,name:kind==='windway'?'風わたる雲の道':'段雲のぼり',clouds,gates,finish:945};
}
// Rounded rectangles provide broad, readable landing areas, matching the mesh.
export function skyCloudContains(c,x,z,margin=0){const dx=Math.abs(x-c.x),dz=Math.abs(z-c.z),r=14;return Math.hypot(Math.max(0,dx-(c.rx-r+margin)),Math.max(0,dz-(c.rz-r+margin)))<=r+margin;}
export function skySupport(course,x,z){let best=null;for(const c of course.clouds)if(skyCloudContains(c,x,z)&&(!best||c.y>best.y))best=c;return best;}
export function skyWind(seed,time,z=0){const p=(seed>>>0)%997/997*6.283,force=3+Math.sin(time*.38-z*.005+p)*2;return{x:Math.sin(p+z*.003+time*.06)*force,z:Math.cos(p+time*.07)*force*.3};}
export function skyRunner(course,parts=[0,0,0],lane=0){skySetup(parts);return{x:lane,y:0,z:8,vx:0,vy:0,vz:0,yaw:Math.PI,grounded:true,support:0,gate:0,jumpHeld:false,jumps:0,falls:0,penalty:0,finish:null,parts:[...parts],checkpoint:{x:lane,y:0,z:8},boost:0};}
export function skyTick(c,a,input,dt=SKY_STEP,time=0,seed=1){
 if(a.finish!==null)return;const cfg=skySetup(a.parts),oldY=a.y;
 let ix=clamp(input.x||0,-1,1),iz=clamp(input.z||0,-1,1),n=Math.hypot(ix,iz);if(n>1){ix/=n;iz/=n;}if(n>.05)a.yaw=Math.atan2(ix,iz);
 const response=a.grounded?cfg.response:cfg.airControl,blend=1-Math.exp(-response*dt),speed=cfg.speed*(input.dash?1.18:1);
 a.vx+=(ix*speed-a.vx)*blend;a.vz+=(iz*speed-a.vz)*blend;
 const wind=skyWind(seed,time,a.z),windResponse=(a.grounded?.1:.65)/cfg.mass;a.vx+=wind.x*windResponse*dt;a.vz+=wind.z*windResponse*dt;
 const support=c.clouds[a.support];if(input.jump&&!a.jumpHeld&&a.grounded){a.vy=cfg.launch+(support?.spring?7:0);a.grounded=false;a.jumps++;a.boost=support?.spring?1:0;}a.jumpHeld=!!input.jump;
 a.x+=a.vx*dt;a.z+=a.vz*dt;
 if(!a.grounded){a.vy-=SKY_GRAVITY*dt;a.y+=a.vy*dt;}
 const ground=skySupport(c,a.x,a.z);
 if(a.grounded&&(!ground||Math.abs(ground.y-a.y)>1.2)){a.grounded=false;a.vy=0;}
 if(ground&&!a.grounded&&a.vy<=0&&oldY>=ground.y-.2&&a.y<=ground.y){a.y=ground.y;a.vy=0;a.grounded=true;a.support=ground.id;}
 if(a.grounded&&ground){a.y=ground.y;a.support=ground.id;const gate=c.gates[a.gate];if(gate&&gate.ids.includes(ground.id)&&Math.abs(a.z-gate.z)<(a.gate===c.gates.length-1?18:38)){a.gate++;a.checkpoint={x:a.x,y:a.y,z:a.z};if(a.gate===c.gates.length)a.finish=time+a.penalty;}}
 if(a.y< -35){a.falls++;a.penalty+=2;Object.assign(a,a.checkpoint,{vx:0,vz:0,vy:0,grounded:true,jumpHeld:false});a.support=skySupport(c,a.x,a.z)?.id??0;}
}
export function skyPilot(c,a,time=0){const gate=c.gates[a.gate];if(!gate)return{};const target=gate.ids.map(id=>c.clouds[id]).sort((a,b)=>a.y-b.y)[0],dx=target.x-a.x,dz=target.z-a.z,d=Math.hypot(dx,dz),cloud=c.clouds[a.support];let jump=false;if(a.grounded&&cloud&&d>35){const fx=dx/Math.max(d,1),fz=dz/Math.max(d,1),look=skyCloudContains(cloud,a.x+fx*22,a.z+fz*22);jump=!look||target.y>cloud.y&&d<65;}return{x:dx/Math.max(d,1),z:dz/Math.max(d,1),jump:jump&&!a.jumpHeld,dash:false};}
export function skyContact(a,b){const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);if(d>=8||Math.abs(a.y-b.y)>8)return;const nx=d?dx/d:1,nz=d?dz/d:0;a.x-=nx*(8-d)/2;a.z-=nz*(8-d)/2;b.x+=nx*(8-d)/2;b.z+=nz*(8-d)/2;}
