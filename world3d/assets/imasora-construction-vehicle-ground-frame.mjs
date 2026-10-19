// Derived ground frames are read models, never additional saved vehicle poses.
const unit=a=>{const n=Math.hypot(...a);return a.map(v=>v/n);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const groundPoint=(g,x,y,z)=>g.position.map((p,i)=>p+g.axes[0][i]*x+g.axes[1][i]*y+g.axes[2][i]*z);
export const groundVector=(g,v)=>g.axes[0].map((_,i)=>g.axes.reduce((n,a,k)=>n+a[i]*v[k],0));
export const groundLocal=(g,p)=>g.axes.map(a=>a.reduce((n,v,i)=>n+v*(p[i]-g.position[i]),0));
const wheelPoints=[-31,18].flatMap(z=>[-25.5,25.5].map(x=>({x,z})));
const trackPoints=[-36,0,36].flatMap(z=>[-28,28].map(x=>({x,z})));
export function vehicleGroundFrame(v,heightAt=()=>0,{tracked=false,maxDegrees=8}={}){
 if(!v||![v.x,v.z,v.heading].every(Number.isFinite))throw Error('車の位置を確認できません。');
 const c=Math.cos(v.heading),s=Math.sin(v.heading),horizontal=(x,z)=>[v.x+c*x+s*z,v.z-s*x+c*z];
 const sample=(x,z)=>{const h=heightAt(x,z);if(!Number.isFinite(h))throw Error('この先に車を支える地面がありません。');return h;};
 const points=tracked?trackPoints:wheelPoints,heights=points.map(p=>sample(...horizontal(p.x,p.z))),mz=points.reduce((n,p)=>n+p.z,0)/points.length,mh=heights.reduce((a,b)=>a+b,0)/points.length;
 const a=points.reduce((n,p,i)=>n+p.x*(heights[i]-mh),0)/points.reduce((n,p)=>n+p.x*p.x,0),b=points.reduce((n,p,i)=>n+(p.z-mz)*(heights[i]-mh),0)/points.reduce((n,p)=>n+(p.z-mz)**2,0),slope=Math.hypot(a,b);
 if(slope>Math.tan(maxDegrees*Math.PI/180)+1e-8)throw Error('坂が急すぎるよ。ゆるやかな道を通ろう。');
 const yy=unit([-a,1,-b]),xx=unit([1,a,0]),zz=unit(cross(xx,yy)),axes=[xx,yy,zz].map(q=>[c*q[0]+s*q[2],q[1],-s*q[0]+c*q[2]]);
 const g={position:[v.x,mh-b*mz,v.z],axes,slope,suspension:[],tracked};
 const patch=(x,z,hx,hz,angle=0)=>{const samples=[],cs=Math.cos(angle),sn=Math.sin(angle);for(let dx=-hx;dx<=hx+1e-8;dx++)for(let dz=-hz;dz<=hz;dz++){const q=groundPoint(g,x+cs*dx+sn*dz,0,z-sn*dx+cs*dz);samples.push({x:q[0],z:q[2],h:sample(q[0],q[2]),plane:q[1]});}return samples;};
 const hole=q=>{if(heightAt.isPit)return heightAt.isPit(q.x,q.z,q.h);for(const [dx,dz]of [[1,0],[0,1]]){let low=false,high=false;for(let d=2;d<=12&&!(low&&high);d+=2){low ||= heightAt(q.x-dx*d,q.z-dz*d)>q.h+1.5;high ||= heightAt(q.x+dx*d,q.z+dz*d)>q.h+1.5;}if(low&&high)return true;}return false;};
 if(tracked){
  let lift=0;const patches=[];for(const x of[-28,28])patches.push(...patch(x,0,6,40));
  for(const q of patches){if(Math.abs(q.h-q.plane)>3.99||q.h<q.plane-.4&&hole(q))throw Error('履帯の下に穴や大きな段差があるよ。');lift=Math.max(lift,q.h-q.plane);}
  g.position[1]+=lift;
 }else{
  for(const p of points){const qs=patch(p.x,p.z,4.5,1,(v.steering??0)*(p.z>0?1:-1));
   if(qs.some(q=>Math.abs(q.h-q.plane)>2.1||q.h<q.plane-.4&&hole(q)))throw Error('タイヤの下に穴や大きな段差があるよ。');
   // The full tyre width follows the same tilted up axis as the cabin.
   // Contact is measured against the inclined plane, not a horizontal tyre
   // envelope. A smooth slope must not add an artificial floating gap.
   let offset=Math.max(...qs.map(q=>(q.h-q.plane)/axes[1][1]))+.065;
   // The rounded leading/trailing tyre meets a stair before its centre does.
   // Raise the same physical wheel, rather than clipping through the riser.
   for(const dx of[-4.5,0,4.5])for(const dz of[-8,-6,-4,-2,2,4,6,8]){const q=groundPoint(g,p.x+dx,8.9-Math.sqrt(8.9**2-dz**2),p.z+dz);offset=Math.max(offset,(sample(q[0],q[2])-q[1])/axes[1][1]);}
   if(Math.abs(offset)>2.1)throw Error('タイヤを支えられない段差があるよ。');g.suspension.push(offset);
  }
  // Keep tyres below the existing fenders. Lift the sprung body while the
  // offsets counter that lift, preserving all four world contact positions.
  const lift=Math.max(0,Math.max(...g.suspension)-.5);if(lift){g.position=g.position.map((n,i)=>n+axes[1][i]*lift);g.suspension=g.suspension.map(n=>n-lift);}
 }
 // Protect the belly between supports, including the leading edge on a slope.
 for(let x=-20;x<=20;x+=4)for(let z=-39;z<=39;z+=3){const q=groundPoint(g,x,tracked?3.5:4.5,z),h=sample(q[0],q[2]),base=groundPoint(g,x,0,z);if(h>q[1]+.05)throw Error('車の底に土が当たるよ。道をならしてね。');if(h<base[1]-5)throw Error('車の下に深い穴があるよ。別の道を通ろう。');}
 return g;
}
export function flatGroundWork(g){return Math.abs(g.position[1])<.1&&g.slope<1e-6;}
