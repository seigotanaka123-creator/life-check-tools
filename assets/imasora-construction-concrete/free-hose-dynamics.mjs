// Small elastic motion inside a pre-certified tube envelope. Material amounts
// and couplers belong to the saved project; transient velocities never do.
export const HOSE_MOTION_LIMITS=Object.freeze({radius:.6,step:1/60,substeps:4,strain:.04});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),copy=p=>({x:p.x,y:p.y,z:p.z});
export function createHoseDynamics(source,{radii=source.map(()=>0),floor=source.map(p=>p.y),maxLength=240,friction=.65}={}){
 if(!Array.isArray(source)||source.length<2||source.length>300||source.some(p=>!p||!['x','y','z'].every(k=>Number.isFinite(p[k])))||radii.length!==source.length||floor.length!==source.length||radii.some(r=>!Number.isFinite(r)||r<0||r>HOSE_MOTION_LIMITS.radius)||floor.some((y,i)=>!Number.isFinite(y)||y>source[i].y+1e-7)||!Number.isFinite(maxLength)||maxLength<=0||!Number.isFinite(friction)||friction<0)throw Error('ホースの動ける範囲を確認できません。');
 const base=source.map(copy),path=source.map(copy),velocity=source.map(()=>({x:0,y:0,z:0})),rest=source.slice(1).map((p,i)=>distance(p,source[i])),caps=[...radii];caps[0]=caps[caps.length-1]=0;
 if(rest.reduce((a,b)=>a+b,0)>maxLength+1e-7)throw Error('ホースが長すぎます。');
 let accumulator=0,time=0,load=0,steps=0,rejected=0;
 const safe=p=>{let length=0;for(let i=1;i<p.length;i++){const d=distance(p[i-1],p[i]);if(d>rest[i-1]*(1+HOSE_MOTION_LIMITS.strain)+1e-8)return false;length+=d;}return length<=maxLength+1e-8;};
 function step(pumping){
  const h=HOSE_MOTION_LIMITS.step,mass=1+3*load,next=path.map(copy);time+=h;steps++;
  for(let i=1;i<path.length-1;i++){
   if(!caps[i])continue;const p=path[i],b=base[i],v=velocity[i],fade=Math.sin(Math.PI*i/(path.length-1)),left=path[i-1],right=path[i+1],bl=base[i-1],br=base[i+1];
   for(const k of ['x','y','z']){const displacement=p[k]-b[k],lap=left[k]-bl[k]+right[k]-br[k]-2*displacement;
    const pressure=pumping?(k==='y'?.25:1)*Math.sin(time*18-i*.45)*2.8*fade:0;
    const gravity=k==='y'?-3*load:0;v[k]+=( (-34*displacement+18*lap+pressure)/mass+gravity-4*v[k])*h;next[i][k]+=v[k]*h;}
   if(next[i].y<=floor[i]+.015){next[i].y=Math.max(next[i].y,floor[i]);v.y=Math.max(0,v.y);const speed=Math.hypot(v.x,v.z),loss=friction*9.8*h,ratio=speed>0?Math.max(0,1-loss/speed):0;v.x*=ratio;v.z*=ratio;next[i].x=p.x+v.x*h;next[i].z=p.z+v.z*h;}
   const d=distance(next[i],b);if(d>caps[i]){for(const k of ['x','y','z'])next[i][k]=b[k]+(next[i][k]-b[k])*caps[i]/d;for(const k of ['x','y','z'])v[k]*=.2;}
  }
  if(!safe(next)){
   // The strain ball and total-length constraint are convex. Blending from
   // the last valid pose keeps every intermediate pose in the same envelope.
   let lo=0,hi=1;for(let n=0;n<14;n++){const t=(lo+hi)/2,trial=next.map((p,i)=>({x:path[i].x+(p.x-path[i].x)*t,y:path[i].y+(p.y-path[i].y)*t,z:path[i].z+(p.z-path[i].z)*t}));if(safe(trial))lo=t;else hi=t;}
   for(let i=1;i<path.length-1;i++)for(const k of ['x','y','z']){next[i][k]=path[i][k]+(next[i][k]-path[i][k])*lo;velocity[i][k]*=lo;}rejected++;
  }
  for(let i=0;i<path.length;i++)Object.assign(path[i],next[i]);
 }
 return{path,base,radii:caps,setLoad(value){const amount=Math.max(0,Math.min(1,Number.isFinite(value)?value:0));if(amount>load)for(let i=1;i<path.length-1;i++){const kick=(amount-load)*Math.sin(Math.PI*i/(path.length-1));velocity[i].x+=kick*.8;velocity[i].y-=kick*.3;}load=amount;},tick(dt,{pumping=false}={}){if(!Number.isFinite(dt)||dt<=0)return path;accumulator=Math.min(accumulator+dt,HOSE_MOTION_LIMITS.step*HOSE_MOTION_LIMITS.substeps);for(let n=0;n<HOSE_MOTION_LIMITS.substeps&&accumulator+1e-10>=HOSE_MOTION_LIMITS.step;n++){accumulator-=HOSE_MOTION_LIMITS.step;step(pumping);}return path;},get stats(){return{steps,rejected,mass:1+3*load,maxOffset:Math.max(...path.map((p,i)=>distance(p,base[i]))),kinetic:velocity.reduce((s,v)=>s+(1+3*load)*(v.x*v.x+v.y*v.y+v.z*v.z)/2,0)};}};
}

// The operator holds the outlet over the cell. The suspended span has a
// damped transverse mode; added concrete slows its response. Both ends stay
// on the boom/outlet and phase joins have zero displacement and velocity.
export function hangingHoseResponse(phase,t,load=0){
 if(![4,5,6].includes(phase)||!Number.isFinite(t))return{x:0,z:0};
 const q=Math.max(0,Math.min(1,t)),window=Math.sin(Math.PI*q)**2,mass=1+3*Math.max(0,Math.min(1,load)),omega=12/Math.sqrt(mass),decay=Math.exp(-1.2*q);
 return{x:.5*window*decay*Math.sin(omega*q),z:.3*window*decay*Math.sin(omega*q*.8)};
}
