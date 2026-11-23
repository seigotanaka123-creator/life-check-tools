// Derived ground frames are read models, never additional saved vehicle poses.
const unit=a=>{const n=Math.hypot(...a);return a.map(v=>v/n);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const groundPoint=(g,x,y,z)=>g.position.map((p,i)=>p+g.axes[0][i]*x+g.axes[1][i]*y+g.axes[2][i]*z);
export const groundVector=(g,v)=>g.axes[0].map((_,i)=>g.axes.reduce((n,a,k)=>n+a[i]*v[k],0));
export const groundLocal=(g,p)=>g.axes.map(a=>a.reduce((n,v,i)=>n+v*(p[i]-g.position[i]),0));
const wheelPoints=[-31,18].flatMap(z=>[-25.5,25.5].map(x=>({x,z})));
const trackPoints=[-36,0,36].flatMap(z=>[-28,28].map(x=>({x,z})));
function tracksFollowGrade(sample,ground,maxDegrees){
 const [side,,forward]=ground.axes;
 const maxRise=16*Math.hypot(forward[0],forward[2])*Math.tan(maxDegrees*Math.PI/180)+2;
 const width=13,length=81,strip=new Float64Array(width*length);
 for(const track of [-28,28]){
  for(let row=0;row<width;row++)for(let column=0;column<length;column++){
   const x=track+row-6,z=column-40,index=row*length+column;
   const h=sample(ground.position[0]+side[0]*x+forward[0]*z,ground.position[2]+side[2]*x+forward[2]*z);
   if((column&&Math.abs(h-strip[index-1])>4.01)||
      (row&&Math.abs(h-strip[index-length])>4.01)||
      (column>=16&&Math.abs(h-strip[index-16])>maxRise))return false;
   strip[index]=h;
  }
 }
 return true;
}
export function vehicleGroundFrame(v,heightAt=()=>0,options={}){
 try{return supportedGroundFrame(v,heightAt,options);}
 catch(error){
  if(v?.field&&!options.tracked&&heightAt.quarryHeight){
   const rim=quarryChassis(v,32,41,heightAt,heightAt.quarryHeight);
   if(rim)return rim;
  }
  throw error;
 }
}
function supportedGroundFrame(v,heightAt,{tracked=false,maxDegrees=8,maxCrossDegrees=maxDegrees,trackSlopeTransition=false,continuousGround=false}={}){
 if(!v||![v.x,v.z,v.heading].every(Number.isFinite))throw Error('車の位置を確認できません。');
 const c=Math.cos(v.heading),s=Math.sin(v.heading),horizontal=(x,z)=>[v.x+c*x+s*z,v.z-s*x+c*z];
 const sample=(x,z)=>{const h=heightAt(x,z,v.groundY??0);if(!Number.isFinite(h))throw Error('この先に車を支える地面がありません。');return h;};
 const depression=(x,z,h)=>{if(continuousGround)return false;if(heightAt.isPit)return heightAt.isPit(x,z,h);for(const [dx,dz]of [[1,0],[0,1]]){let low=false,high=false;for(let d=2;d<=12&&!(low&&high);d+=2){low ||= heightAt(x-dx*d,z-dz*d)>h+1.5;high ||= heightAt(x+dx*d,z+dz*d)>h+1.5;}if(low&&high)return true;}return false;};
 // Only a native reader that can prove every point is at zero supplies
 // this predicate. The margin covers both tracks, the belly and pit probes
 // at any heading. Irregular terrain still runs the full sample grid.
 const flatTrack=tracked&&heightAt.isZeroArea?.(v.x-80,v.x+80,v.z-80,v.z+80);
 const trackSupport=(p)=>{const [x,z]=horizontal(p.x,p.z),h=sample(x,z);if(!depression(x,z,h))return h;let supported=Infinity;
  // A crawler is a contact patch, not six isolated point feet. A small hole
  // below a probe is bridged by the same actual track's neighbouring support.
  const offsets=[...[-6,-4,-2,2,4,6].map(dx=>[dx,0]),...[-24,-20,-16,-12,-8,-4,4,8,12,16,20,24].filter(dz=>Math.abs(p.z+dz)<=40).map(dz=>[0,dz])];
  for(const [dx,dz]of offsets){const q=horizontal(p.x+dx,p.z+dz),top=sample(q[0],q[1]);if(top>h+1.5)supported=Math.min(supported,top);}return Number.isFinite(supported)?supported:h;
 };
 const points=tracked?trackPoints:wheelPoints,mz=points.reduce((n,p)=>n+p.z,0)/points.length;
 const fit=heights=>{
  const mh=heights.reduce((sum,h)=>sum+h,0)/points.length;
  const a=points.reduce((sum,p,i)=>sum+p.x*(heights[i]-mh),0)/points.reduce((sum,p)=>sum+p.x*p.x,0);
  const b=points.reduce((sum,p,i)=>sum+(p.z-mz)*(heights[i]-mh),0)/points.reduce((sum,p)=>sum+(p.z-mz)**2,0);
  return {a,b,mh,slope:Math.hypot(a,b)};
 };
 let groundFit=fit(points.map(p=>flatTrack?0:tracked?trackSupport(p):sample(...horizontal(p.x,p.z))));
 const crossLimit=Math.tan(maxCrossDegrees*Math.PI/180)+1e-8,climbLimit=Math.tan(maxDegrees*Math.PI/180)+1e-8;
 const crossTooSteep=({a})=>maxCrossDegrees<maxDegrees&&Math.abs(a)>crossLimit;
 // Near the angle cap, average across each contact patch so an isolated
 // two-unit terrain cell cannot exaggerate the fitted crossfall.
 if(trackSlopeTransition&&crossTooSteep(groundFit)&&Math.abs(groundFit.a)<=crossLimit+2/56){
  groundFit=fit(points.map(({x,z})=>{
   let h=0;
   for(const dx of [-4,-2,0,2,4])for(const dz of [-4,-2,0,2,4])h+=sample(...horizontal(x+dx,z+dz));
   return h/25;
  }));
 }
 const {a,b,mh,slope}=groundFit;
 const checkAngles=!continuousGround||heightAt.cliffAt(v.x,v.z);
 if(checkAngles&&crossTooSteep(groundFit))throw Error('横傾斜が急すぎるよ。斜面に正面を向けよう。');
 if(checkAngles&&slope>climbLimit)throw Error('坂が急すぎるよ。ゆるやかな道を通ろう。');
 const yy=unit([-a,1,-b]),xx=unit([1,a,0]),zz=unit(cross(xx,yy)),axes=[xx,yy,zz].map(q=>[c*q[0]+s*q[2],q[1],-s*q[0]+c*q[2]]);
 const g={position:[v.x,mh-b*mz,v.z],axes,slope,suspension:[],tracked};
 if(flatTrack)return g;
 if(tracked&&continuousGround){
  let lift=0,high=0,low=0;
  for(const x of [-34,-28,-22,0,22,28,34])for(let z=-40;z<=40;z+=8){
   const [px,py,pz]=groundPoint(g,x,0,z),rise=sample(px,pz)-py;
   if(x)lift=Math.max(lift,rise);
   high=Math.max(high,rise);low=Math.min(low,rise);
  }
  if(checkAngles&&(high>10||low< -13))throw Error('履帯が斜面の縁に達しました。');
  g.position[1]+=lift;return g;
 }
 const patch=(x,z,hx,hz,angle=0)=>{
  const samples=[],cs=Math.cos(angle),sn=Math.sin(angle),position=g.position,ax=g.axes[0],ay=g.axes[1],az=g.axes[2];
  for(let dx=-hx;dx<=hx+1e-8;dx++)for(let dz=-hz;dz<=hz;dz++){
   const px=x+cs*dx+sn*dz,pz=z-sn*dx+cs*dz;
   // Keep every original support sample and arithmetic order, without making
   // a temporary three-element array for each tyre/track point.
   const qx=position[0]+ax[0]*px+ay[0]*0+az[0]*pz,qy=position[1]+ax[1]*px+ay[1]*0+az[1]*pz,qz=position[2]+ax[2]*px+ay[2]*0+az[2]*pz;
   samples.push({x:qx,z:qz,h:sample(qx,qz),plane:qy});
  }
  return samples;
 };
 const hole=q=>depression(q.x,q.z,q.h);
 if(tracked){
  let lift=0,step=false,unsupported=false,leastTrackLift=Infinity;
  const [ax,ay,az]=g.axes,[ox,oy,oz]=g.position;
  // The 34×40 half envelope projects to less than 54 units on any
  // horizontal axis. Keep the original rounded bands and every sample.
  const offset=54,counts=new Uint16Array(offset*2+1),supports=new Uint16Array(counts.length);
  for(const track of [-28,28]){
   counts.fill(0);supports.fill(0);
   let trackLift=0;
   for(let dx=-6;dx<=6;dx++)for(let dz=-40;dz<=40;dz++){
    const x=track+dx,z=dz;
    const qx=ox+ax[0]*x+ay[0]*0+az[0]*z,plane=oy+ax[1]*x+ay[1]*0+az[1]*z,qz=oz+ax[2]*x+ay[2]*0+az[2]*z;
    const h=sample(qx,qz),rise=h-plane,key=Math.round(s*(qx-v.x)+c*(qz-v.z))+offset;
    if(rise>3.99)step=true;
    trackLift=Math.max(trackLift,rise);
    counts[key]++;
    if(plane-h<=3.99)supports[key]++;
   }
   lift=Math.max(lift,trackLift);leastTrackLift=Math.min(leastTrackLift,trackLift);
   let gap=0,maxGap=0,minSupport=Infinity,maxSupport=-Infinity;
   for(let i=0;i<counts.length;i++){
    if(!counts[i])continue;
    const z=i-offset;
    if(supports[i]*2>=counts[i]){minSupport=Math.min(minSupport,z);maxSupport=Math.max(maxSupport,z);gap=0;}
    else{gap++;maxGap=Math.max(maxGap,gap);}
   }
   if(minSupport> -4||maxSupport<4||maxGap>80/3)unsupported=true;
  }
  // Keep the original error priority: missing land, leading step, then gap.
  // A curved road shoulder can sit above the fitted plane even with a
  // continuous grade. Check neighbouring tread samples before settling onto
  // it, keeping contact on both tracks and rejecting abrupt ledges.
  if(step&&(!trackSlopeTransition||lift>7.99||lift-leastTrackLift>6||!tracksFollowGrade(sample,g,maxDegrees)))
   throw Error('履帯の前に大きな段差があるよ。');
  if(unsupported)throw Error('履帯を支える地面が足りないよ。別の道を通ろう。');
  g.position[1]+=lift;
  // The crawler's belly uses only its raised underside. It has no tyre
  // depression test and does not need an allocated position per sample.
  const y=g.position[1];
  for(let x=-20;x<=20;x+=4)for(let z=-39;z<=39;z+=3){
   const qx=ox+ax[0]*x+ay[0]*3.5+az[0]*z,qy=y+ax[1]*x+ay[1]*3.5+az[1]*z,qz=oz+ax[2]*x+ay[2]*3.5+az[2]*z;
   if(sample(qx,qz)>qy+.05)throw Error('車の底に土が当たるよ。道をならしてね。');
  }
  return g;
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
 for(let x=-20;x<=20;x+=4)for(let z=-39;z<=39;z+=3){const q=groundPoint(g,x,4.5,z),h=sample(q[0],q[2]),base=groundPoint(g,x,0,z);if(h>q[1]+.05)throw Error('車の底に土が当たるよ。道をならしてね。');if(h<base[1]-5)throw Error('車の下に深い穴があるよ。別の道を通ろう。');}
 return g;
}
export function flatGroundWork(g){return Math.abs(g.position[1])<.1&&g.slope<1e-6;}

// The natural-terrain reader certifies an unedited footprint. The second
// measurement includes other buildings and decks in the current world.
export function quarryChassis(v,width,length,heightAt,quarryHeight){
 if(!quarryHeight||!Number.isFinite(quarryHeight(v.x,v.z)))return null;
 const c=Math.cos(v.heading),s=Math.sin(v.heading);
 const sample=(x,z)=>{
  const h=heightAt(x,z,v.groundY??0),natural=quarryHeight(x,z);
  return Number.isFinite(h)&&Math.abs(h-natural)<.05?h:NaN;
 };
 function at(side,along){return sample(v.x+c*side+s*along,v.z-s*side+c*along);}
 const points=[];
 for(const x of [-width,0,width])for(const z of [-length,-length/2,0,length/2,length]){
  const h=at(x,z);
  if(!Number.isFinite(h))return null;
  points.push({x,z,h});
 }
 // A rigid chassis is carried by the upper supporting plane. A dangling
 // front wheel does not start pitching the body while both axles behind
 // the centre of mass still have ground under them.
 function supportingSlope(axis,other,tilt,stations){
  const heights=stations.map(v=>Math.max(...points.filter(p=>p[axis]===v).map(p=>p.h-p[other]*tilt)));
  let best=Infinity,slope=0;
  function trySlope(value){
   const v=Math.max(-.9,Math.min(.9,value));
   const y=Math.max(...heights.map((h,i)=>h-stations[i]*v));
   if(y<best-1e-8||Math.abs(y-best)<=1e-8&&Math.abs(v)<Math.abs(slope)){best=y;slope=v;}
  }
  trySlope(0);
  for(let i=0;i<stations.length;i++)for(let j=i+1;j<stations.length;j++)
   trySlope((heights[j]-heights[i])/(stations[j]-stations[i]));
  return slope;
 }
 let a=0,b=0;
 for(let pass=0;pass<2;pass++){
  a=supportingSlope('x','z',b,[-width,0,width]);
  b=supportingSlope('z','x',a,[-length,-length/2,0,length/2,length]);
 }
 const scale=Math.min(1,.9/(Math.hypot(a,b)||1)),pitch=b*scale,roll=a*scale;
 const normalize=p=>{const l=Math.hypot(...p);return p.map(n=>n/l);};
 const side=normalize([1,roll,0]),up=normalize([-roll,1,-pitch]);
 const forward=[side[1]*up[2],-side[0]*up[2],side[0]*up[1]-side[1]*up[0]];
 const axes=[side,up,forward].map(([x,y,z])=>[c*x+s*z,y,-s*x+c*z]);
 let y=-Infinity;
 for(const x of [-width,0,width])for(const z of [-length,-length/2,0,length/2,length]){
  const h=sample(v.x+axes[0][0]*x+axes[2][0]*z,v.z+axes[0][2]*x+axes[2][2]*z);
  if(!Number.isFinite(h))return null;
  y=Math.max(y,h-axes[0][1]*x-axes[2][1]*z);
 }
 return {position:[v.x,y,v.z],axes,slope:Math.hypot(roll,pitch),quarryDescent:true,
  tracked:false,suspension:[0,0,0,0]};
}
