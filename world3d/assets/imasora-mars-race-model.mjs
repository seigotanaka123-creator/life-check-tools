// Mars rally: a wheeled vehicle on a closed terrain route. No cloud/platform physics.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));const angle=v=>Math.atan2(Math.sin(v),Math.cos(v));
export const MARS_STEP=1/120,MARS_GRAVITY=3.71;
export const MARS_PARTS=[['タイヤ','直線で速い','岩場で曲がる'],['サスペンション','大きく伸びる','着地を吸収'],['車体','軽量フレーム','安定フレーム']];
export function marsSetup(parts=[0,1,0]){if(parts.length!==3||parts.some(v=>v!==0&&v!==1))throw Error('INVALID_MARS_PARTS');return{max:parts[0]?65:78,grip:parts[0]?6.5:3.5,accel:parts[2]?18:23,mass:parts[2]?1.65:1,suspension:parts[1]?.85:.48,steer:parts[2]?.48:.58};}
const knots=[[0,260],[200,255],[305,110],[250,-90],[90,-140],[-30,-295],[-230,-225],[-275,-45],[-145,70],[-210,230]];
function spline(points,t){const n=points.length,f=(t%1+1)%1*n,i=Math.floor(f),u=f-i,p0=points[(i+n-1)%n],p1=points[i],p2=points[(i+1)%n],p3=points[(i+2)%n];const at=k=>.5*((2*p1[k])+(-p0[k]+p2[k])*u+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*u*u+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*u*u*u);return{x:at(0),z:at(1)};}
export function marsCourse(kind='crater'){
 if(!['crater','ridge'].includes(kind))throw Error('INVALID_MARS_COURSE');const points=knots.map(([x,z],i)=>[x*(kind==='ridge'?.85:1),z+(kind==='ridge'&&i%2?40:0)]),path=[];let length=0;
 for(let i=0;i<=320;i++){const p=spline(points,i/320);if(i)length+=Math.hypot(p.x-path[i-1].x,p.z-path[i-1].z);path.push({...p,s:length});}
 return{kind,name:kind==='ridge'?'岩尾根ラリー':'クレーターラリー',path,length,width:30,laps:2};
}
export function marsPath(c,x,z){let best={distance:Infinity};for(let i=0;i<c.path.length-1;i++){const a=c.path[i],b=c.path[i+1],dx=b.x-a.x,dz=b.z-a.z,span=dx*dx+dz*dz,u=clamp(((x-a.x)*dx+(z-a.z)*dz)/span,0,1),px=a.x+dx*u,pz=a.z+dz*u,d=Math.hypot(x-px,z-pz);if(d<best.distance)best={x:px,z:pz,distance:d,s:a.s+(b.s-a.s)*u,yaw:Math.atan2(dx,dz),side:Math.sign(dx*(z-pz)-dz*(x-px))};}return best;}
export function marsTerrain(c,x,z){const p=marsPath(c,x,z),t=p.s/c.length*6.283;
 const rolling=3*Math.sin(t*2)+2*Math.sin(t*5),ramp=8*Math.max(0,1-Math.abs(t-1.65)/.28),crater=-11*Math.exp(-((x-65)**2+(z+10)**2)/11500),rough=Math.sin(x*.055)*Math.cos(z*.05)*Math.min(2.2,p.distance/30);
 return rolling+ramp+crater+rough;
}
export function marsCar(c,parts=[0,1,0],lane=0){marsSetup(parts);const p=c.path[0],next=c.path[1],yaw=Math.atan2(next.x-p.x,next.z-p.z),x=p.x+Math.cos(yaw)*lane,z=p.z-Math.sin(yaw)*lane;return{x,z,y:marsTerrain(c,x,z),vx:0,vz:0,vy:0,yaw,pitch:0,roll:0,parts:[...parts],grounded:true,gate:0,lap:0,finish:null,air:0,landings:0,off:0,slip:0,suspension:[0,0,0,0],recoveries:0};}
export function marsTick(c,a,input,dt=MARS_STEP,time=0){
 if(a.finish!==null)return;const cfg=marsSetup(a.parts),p=marsPath(c,a.x,a.z),old=marsTerrain(c,a.x,a.z),fx=Math.sin(a.yaw),fz=Math.cos(a.yaw),forward=a.vx*fx+a.vz*fz,lateral=a.vx*fz-a.vz*fx,gas=clamp(input.gas||0,-1,1),steer=clamp(input.steer||0,-1,1),rough=p.distance>c.width;
 // A bicycle steering model: wheels steer a moving car; a stationary car cannot spin.
 if(a.grounded)a.yaw+=Math.tan(steer*cfg.steer)*forward/15*dt;
 const brake=!!input.brake,grip=(rough?.45:1)*cfg.grip*(brake?.32:1);let drive=forward;
 if(a.grounded){drive+=gas*cfg.accel*dt;drive*=Math.exp(-(rough?.9:.075)*dt);if(brake)drive*=Math.exp(-1.4*dt);drive=clamp(drive,-14,cfg.max);const slip=lateral*Math.exp(-grip*dt);a.vx=Math.sin(a.yaw)*drive+Math.cos(a.yaw)*slip;a.vz=Math.cos(a.yaw)*drive-Math.sin(a.yaw)*slip;}
 else a.pitch+=clamp(input.gas||0,-1,1)*.2*dt;
 a.slip=lateral;a.x+=a.vx*dt;a.z+=a.vz*dt;
 const floor=marsTerrain(c,a.x,a.z),slope=(floor-old)/dt;
 if(a.grounded){if(slope<a.vy-1.5&&Math.abs(drive)>22){a.grounded=false;}else{a.y=floor;a.vy=slope;}}
 if(!a.grounded){a.air+=dt;a.vy-=MARS_GRAVITY*dt;a.y+=a.vy*dt;if(a.y<=floor&&a.vy<=slope){const impact=Math.max(0,slope-a.vy);a.y=floor;a.vy=slope;a.grounded=true;a.landings++;const retain=clamp(1-impact*(1-cfg.suspension)*.008,.65,1);a.vx*=retain;a.vz*=retain;}}
 const half=6,front=marsTerrain(c,a.x+Math.sin(a.yaw)*half,a.z+Math.cos(a.yaw)*half),back=marsTerrain(c,a.x-Math.sin(a.yaw)*half,a.z-Math.cos(a.yaw)*half),left=marsTerrain(c,a.x-Math.cos(a.yaw)*5,a.z+Math.sin(a.yaw)*5),right=marsTerrain(c,a.x+Math.cos(a.yaw)*5,a.z-Math.sin(a.yaw)*5);
 if(a.grounded){a.pitch+=(Math.atan2(front-back,12)-a.pitch)*(1-Math.exp(-8*dt));a.roll+=(Math.atan2(left-right,10)+steer*Math.abs(drive)*.0015-a.roll)*(1-Math.exp(-7*dt));}
 a.suspension=[[-8,-7],[-8,7],[8,-7],[8,7]].map(([x,z])=>a.grounded?marsTerrain(c,a.x+Math.cos(a.yaw)*x+Math.sin(a.yaw)*z,a.z-Math.sin(a.yaw)*x+Math.cos(a.yaw)*z)-floor:-1.4);
 const next=marsPath(c,a.x,a.z),expected=(a.gate+1)%12,target=c.path[Math.round(expected/12*320)];if(Math.hypot(a.x-target.x,a.z-target.z)<c.width*1.8){a.gate=expected;if(expected===0){a.lap++;if(a.lap===c.laps)a.finish=time;}}
 if(next.distance>c.width*2.8){a.off+=dt;if(a.off>3){const point=c.path[Math.round(a.gate/12*320)],t=marsPath(c,point.x,point.z);Object.assign(a,{x:point.x,z:point.z,y:marsTerrain(c,point.x,point.z),vx:0,vz:0,vy:0,yaw:t.yaw,grounded:true,off:0});a.recoveries++;}}else a.off=0;
}
export function marsPilot(c,a){const path=marsPath(c,a.x,a.z),speed=Math.hypot(a.vx,a.vz),ahead=(path.s+20+speed*.3)%c.length;let target=c.path.find(p=>p.s>=ahead)??c.path[0];const delta=angle(Math.atan2(target.x-a.x,target.z-a.z)-a.yaw),cfg=marsSetup(a.parts),safe=Math.min(cfg.max,Math.max(18,46/(1+Math.abs(delta)*2)));return{gas:speed>safe?-.65:1,steer:clamp(delta*1.8,-1,1),brake:speed>safe+10};}
export function marsContact(a,b){const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);if(d>=15||Math.abs(a.y-b.y)>7)return;const nx=d?dx/d:1,nz=d?dz/d:0,over=(15-d)/2;a.x-=nx*over;a.z-=nz*over;b.x+=nx*over;b.z+=nz*over;const rel=(b.vx-a.vx)*nx+(b.vz-a.vz)*nz;if(rel<0){a.vx+=rel*nx*.55;a.vz+=rel*nz*.55;b.vx-=rel*nx*.55;b.vz-=rel*nz*.55;}}
