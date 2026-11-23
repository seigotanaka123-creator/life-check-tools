// v476: same v475 contact geometry; invariant axes and projection ranges reused.
import {ShapeUtils,Vector2} from './three.module.min.js';
import {BUCKET_OUTLINE,BUCKET_SHELL,BUCKET_TOOTH,toothHalfWidth,bucketRotation} from './imasora-construction-excavator-bucket.js';
const sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function uniqueAxis(out,a){
 const length=Math.hypot(a[0],a[1],a[2]);if(length<1e-9)return;
 const x=a[0]/length,y=a[1]/length,z=a[2]/length;
 for(const b of out)if(Math.abs(x*b[0]+y*b[1]+z*b[2])>1-1e-14)return;
 out.push([x,y,z]);
}
function prism(profile,width,x=0,tooth=false){
 const vertices=[-1,1].flatMap(side=>profile.map(([y,z])=>[x+side*(tooth?toothHalfWidth(z):width/2),y,z])),n=profile.length;
 const faces=[Array.from({length:n},(_,i)=>i),Array.from({length:n},(_,i)=>n+i)],edges=[];
 for(let i=0;i<n;i++){const j=(i+1)%n;faces.push([i,j,n+j,n+i]);edges.push([i,j],[n+i,n+j],[i,n+i]);}
 const normals=[],directions=[];for(const f of faces)uniqueAxis(normals,cross(sub(vertices[f[1]],vertices[f[0]]),sub(vertices[f[2]],vertices[f[0]])));for(const[i,j]of edges)uniqueAxis(directions,sub(vertices[j],vertices[i]));
 return{vertices,faces,edges,normals,directions,profile,x,width,tooth};
}
const plates=(profile,w,x=0)=>ShapeUtils.triangulateShape(profile.map(([y,z])=>new Vector2(y,z)),[]).map(face=>prism(face.map(i=>profile[i]),w,x));
// The open bowl's empty cavity follows the existing inner shell profile.
// Capture geometry is NOT a solid collider and is never appended to all/body.
const capture=plates(BUCKET_SHELL.slice(6).reverse(),15.4);
const teeth=[-6,-2,2,6].map(x=>prism(BUCKET_TOOTH,2.8,x,true));
const body=[...plates(BUCKET_SHELL,18),...plates(BUCKET_OUTLINE,1.3,-8.35),...plates(BUCKET_OUTLINE,1.3,8.35),prism([[-12.75,-15],[-11.25,-15],[-11.25,-13],[-12.75,-13]],17)];
// Adjacent shell triangles share vertices. Transform each distinct vertex
// once per pose, and keep the exact prisms lazy until a contact needs them.
const contactVertices=[],contactVertexIndices=new Map();
const indexVertices=(prisms,vertices=contactVertices,indices=contactVertexIndices)=>prisms.map(prism=>prism.vertices.map(vertex=>{
 const key=vertex.join(',');
 if(!indices.has(key)){
  indices.set(key,vertices.length);
  vertices.push(vertex);
 }
 return indices.get(key);
}));
const bodyIndices=indexVertices(body),teethIndices=indexVertices(teeth);
const captureVertices=[],captureIndices=indexVertices(capture,captureVertices,new Map());
function includeVertex(min,max,vertex){
 for(let i=0;i<3;i++){min[i]=Math.min(min[i],vertex[i]);max[i]=Math.max(max[i],vertex[i]);}
}
// Mirrored side plates with the same local directions use the same
// separating axes. Their projections are still computed per prism.
const axisGroups=new Map();
for(const part of [...body,...teeth,...capture]){
 const key=JSON.stringify([part.normals,part.directions]);
 if(!axisGroups.has(key))axisGroups.set(key,axisGroups.size);
 part.axisGroup=axisGroups.get(key);
}
function rotatePrismAxes(part,rotate){
 const axes=[];
 for(const normal of part.normals)uniqueAxis(axes,rotate(normal));
 for(const direction of part.directions){
  const [x,y,z]=rotate(direction);
  uniqueAxis(axes,[0,z,-y]);uniqueAxis(axes,[-z,0,x]);uniqueAxis(axes,[y,-x,0]);
 }
 return axes;
}
// Keep the projected prism's shape stable even when its SAT data is needed.
class ProjectedPrism {
 constructor(template,points,indices,axesFor){
  this.template=template;this.axesFor=axesFor;this.points=points;this.indices=indices;
  this.projectedVertices=null;
  this.min=[Infinity,Infinity,Infinity];this.max=[-Infinity,-Infinity,-Infinity];
  for(const index of indices)includeVertex(this.min,this.max,points[index]);
  this.projectedRanges=null;
 }
 get vertices(){return this.projectedVertices??=this.indices.map(index=>this.points[index]);}
 get faces(){return this.template.faces;}
 get edges(){return this.template.edges;}
 get normals(){return this.template.normals;}
 get directions(){return this.template.directions;}
 get profile(){return this.template.profile;}
 get x(){return this.template.x;}
 get width(){return this.template.width;}
 get tooth(){return this.template.tooth;}
 get axes(){return this.axesFor(this.template);}
 get ranges(){
  return this.projectedRanges??=this.axes.map(([x,y,z])=>{
   let low=Infinity,high=-Infinity;
   for(const v of this.vertices){
    const d=v[0]*x+v[1]*y+v[2]*z;low=Math.min(low,d);high=Math.max(high,d);
   }
   return [low,high];
  });
 }
}
// Small numeric-key cache: independent of state/terrain object identity. It is
// safe for immutable snapshots AND callers which edit arm/vehicle fields.
const geometryCache=[];
export function bucketContactGeometry(s,pose){
 const a=bucketRotation(s),c=Math.cos(a),sn=Math.sin(a),h=pose.heading,ch=Math.cos(h),sh=Math.sin(h),
  {x:wx,y:wy,z:wz}=pose.wrist,axes=pose.axes;
 for(const entry of geometryCache){
  if(entry.a!==a||entry.h!==h||entry.x!==wx||entry.y!==wy||entry.z!==wz)continue;
  if(!axes&&!entry.basis||axes&&axes.length===entry.basis?.length&&
    axes.every((axis,i)=>axis.length===entry.basis[i].length&&axis.every((v,k)=>v===entry.basis[i][k])))return entry.value;
 }
 const basis=axes?.map(axis=>axis.slice());
 const [u,v,l]=basis??[];
 function rotate(p){
  const x=p[0],y=p[1]*c-p[2]*sn,z=p[1]*sn+p[2]*c;
  if(!basis)return [x*ch+z*sh,y,-x*sh+z*ch];
  return [u[0]*x+v[0]*y+l[0]*z,u[1]*x+v[1]*y+l[1]*z,u[2]*x+v[2]*y+l[2]*z];
 }
 const transform=v=>{const q=rotate(v);q[0]+=wx;q[1]+=wy;q[2]+=wz;return q;};
 let transformed,transformedCapture;
 const contactPoints=()=>transformed??=contactVertices.map(transform);
 const capturePoints=()=>transformedCapture??=captureVertices.map(transform);
 const axisProjections=[];
 const axesFor=part=>axisProjections[part.axisGroup]??=(rotatePrismAxes(part,rotate));
 const build=(prisms,indices,points=contactPoints())=>prisms.map((p,i)=>new ProjectedPrism(p,points,indices[i],axesFor));
 let toothParts,bodyParts,all,captured,bounds,cutBounds,solidProjection,catchProjection;
 // A separating plane along the tilted bucket's local Y axis can reject
 // empty space inside its world AABB before we touch the shell triangles.
 const axis=rotate([0,1,0]),absX=Math.abs(axis[0]),absY=Math.abs(axis[1]),absZ=Math.abs(axis[2]);
 function project(points,min=Infinity,max=-Infinity){
  for(const v of points){const p=v[0]*axis[0]+v[1]*axis[1]+v[2]*axis[2];min=Math.min(min,p);max=Math.max(max,p);}
  return [min,max];
 }
 function mayTouchBox(x,y,z,hx,hy,hz,includeCavity=false){
  solidProjection??=project(contactPoints());
  const [min,max]=includeCavity?(catchProjection??=project(capturePoints(),...solidProjection)):solidProjection;
  const middle=x*axis[0]+y*axis[1]+z*axis[2];
  const radius=hx*absX+hy*absY+hz*absZ+1e-8;
  return middle+radius>=min&&middle-radius<=max;
 }
 const value={
  mayTouchBox,
  get teeth(){return toothParts??=build(teeth,teethIndices);},
  get body(){return bodyParts??=build(body,bodyIndices);},
  get all(){return all??=[...this.body,...this.teeth];},
  get capture(){return captured??=build(capture,captureIndices,capturePoints());},
  get cutBounds(){
   if(!cutBounds){
    const min=this.bounds.min.slice(),max=this.bounds.max.slice();
    for(const vertex of capturePoints())includeVertex(min,max,vertex);
    cutBounds={min,max};
   }
   return cutBounds;
  },
  get bounds(){
   if(!bounds){
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(const vertex of contactPoints())includeVertex(min,max,vertex);
    bounds={min,max};
   }
   return bounds;
  }
 };
 // Own the basis and numeric pose so later callers can edit their input.
 geometryCache.unshift({a,h,x:wx,y:wy,z:wz,basis,value});if(geometryCache.length>8)geometryCache.pop();return value;
}
function prismTouchesBounds(p,lx,ly,lz,rx,ry,rz,skin){
 const low=p.min,high=p.max;
 if(low[0]>rx+skin||high[0]<lx-skin||low[1]>ry+skin||high[1]<ly-skin||low[2]>rz+skin||high[2]<lz-skin)return false;
 const cx=(lx+rx)/2,cy=(ly+ry)/2,cz=(lz+rz)/2,hx=(rx-lx)/2+skin,hy=(ry-ly)/2+skin,hz=(rz-lz)/2+skin;
 const axes=p.axes,ranges=p.ranges;
 for(let i=0;i<axes.length;i++){
  const axis=axes[i],range=ranges[i],middle=cx*axis[0]+cy*axis[1]+cz*axis[2];
  const radius=hx*Math.abs(axis[0])+hy*Math.abs(axis[1])+hz*Math.abs(axis[2]);
  if(range[0]>middle+radius||range[1]<middle-radius)return false;
 }
 return true;
}
export function prismTouchesBox(p,min,max,skin=0){
 return prismTouchesBounds(p,min[0],min[1],min[2],max[0],max[1],max[2],skin);
}
export function prismTouchesCube(p,x,y,z,half,skin=0){
 return prismTouchesBounds(p,x-half,y-half,z-half,x+half,y+half,z+half,skin);
}
// Minimum separating translation on the same SAT axes as contact detection.
// Used only to leave already-overlapping loose spoil; not to soften solid soil.
export function prismBoxPenetration(p,min,max){
 let depth=Infinity;
 for(let k=0;k<3;k++){depth=Math.min(depth,p.max[k]-min[k],max[k]-p.min[k]);if(depth<=0)return 0;}
 const center=min.map((v,k)=>(v+max[k])/2),half=min.map((v,k)=>(max[k]-v)/2);
 for(let i=0;i<p.axes.length;i++){
  const axis=p.axes[i],middle=axis.reduce((sum,v,k)=>sum+v*center[k],0),r=axis.reduce((sum,v,k)=>sum+Math.abs(v)*half[k],0),range=p.ranges[i];
  depth=Math.min(depth,range[1]-middle+r,middle+r-range[0]);if(depth<=0)return 0;
 }return depth;
}
function touchedCells(s,parts,cell=8,skin=0){
 const ids=new Set();for(const p of parts)for(let x=Math.floor((p.min[0]-skin)/cell);x<=Math.floor((p.max[0]+skin)/cell);x++)for(let y=Math.max(-4,Math.floor((p.min[1]-skin)/cell));y<=Math.min(2,Math.floor((p.max[1]+skin)/cell));y++)for(let z=Math.floor((p.min[2]-skin)/cell);z<=Math.floor((p.max[2]+skin)/cell);z++){
  const id=`${x},${y},${z}`;if(!s.terrain[id]||ids.has(id))continue;if(prismTouchesBox(p,[x*cell,y*cell,z*cell],[(x+1)*cell,(y+1)*cell,(z+1)*cell],skin))ids.add(id);
 }return ids;
}
export function toothContacts(s,pose,geometry){
 if(s.load>=6)return[];geometry??=bucketContactGeometry(s,pose);
 const contacts=[];for(const id of touchedCells(s,geometry.teeth,8,.08)){const p=s.terrain[id];if(![[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].some(d=>!s.terrain[p.map((v,i)=>v+d[i]).join(',')]))continue;contacts.push({kind:'terrain',id,position:{x:(p[0]+.5)*8,y:(p[1]+.5)*8,z:(p[2]+.5)*8}});}
 for(const p of s.spoil)if(geometry.teeth.some(t=>prismTouchesBox(t,[p.x-3.9,p.y-3.9,p.z-3.9],[p.x+3.9,p.y+3.9,p.z+3.9],.08)))contacts.push({kind:'spoil',id:p.id,position:{x:p.x,y:p.y,z:p.z}});
 return contacts.slice(0,6-s.load);
}
function nearProfile(y,z,profile,r){
 let inside=false;for(let i=0,j=profile.length-1;i<profile.length;j=i++){
  const a=profile[i],b=profile[j];if((a[1]>z)!==(b[1]>z)&&y<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  const dy=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((y-a[0])*dy+(z-a[1])*dz)/(dy*dy+dz*dz))),ey=y-a[0]-t*dy,ez=z-a[1]-t*dz;if(ey*ey+ez*ez<r*r)return true;
 }return inside;
}
const selfProfiles=[...new Map([...body,...teeth].filter(p=>Math.abs(p.x)<p.width/2+2.6).map(p=>[JSON.stringify(p.profile),p.profile])).values()].map(profile=>({profile,minY:Math.min(...profile.map(p=>p[0])),maxY:Math.max(...profile.map(p=>p[0])),minZ:Math.min(...profile.map(p=>p[1])),maxZ:Math.max(...profile.map(p=>p[1]))}));
const selfBounds={minY:Math.min(...selfProfiles.map(p=>p.minY)),maxY:Math.max(...selfProfiles.map(p=>p.maxY)),minZ:Math.min(...selfProfiles.map(p=>p.minZ)),maxZ:Math.max(...selfProfiles.map(p=>p.maxZ))};
export function bucketSelfContact(s,pose){
 const angle=bucketRotation(s),c=Math.cos(angle),sn=Math.sin(angle),w=pose.local[2];
 for(let n=0;n<2;n++){
  const a=pose.local[n],b=pose.local[n+1],dy=b.y-a.y,dz=b.z-a.z,length=Math.hypot(dy,dz),r=n===0?2.8:2.3;
  const last=length-(n===1?8:0);
  if(last<0)continue;
  // Only skip a shaft when its entire sampled portion misses the
  // expanded shell bounds. The original point checks decide contact.
  const y=a.y-w.y,z=a.z-w.z,f=last/length;
  const ly0=y*c+z*sn,lz0=-y*sn+z*c,ly1=(y+dy*f)*c+(z+dz*f)*sn,lz1=-(y+dy*f)*sn+(z+dz*f)*c;
  const edge=r+1e-8;
  if(Math.max(ly0,ly1)<selfBounds.minY-edge||Math.min(ly0,ly1)>selfBounds.maxY+edge||
     Math.max(lz0,lz1)<selfBounds.minZ-edge||Math.min(lz0,lz1)>selfBounds.maxZ+edge)continue;
  for(let d=0;d<=length;d+=.6){
   if(n===1&&length-d<8)continue;
   const y=a.y+dy*d/length-w.y,z=a.z+dz*d/length-w.z,ly=y*c+z*sn,lz=-y*sn+z*c;
   if(ly<selfBounds.minY-r||ly>selfBounds.maxY+r||lz<selfBounds.minZ-r||lz>selfBounds.maxZ+r)continue;
   if(selfProfiles.some(p=>ly>=p.minY-r&&ly<=p.maxY+r&&lz>=p.minZ-r&&lz<=p.maxZ+r&&nearProfile(ly,lz,p.profile,r)))return n===0?'バケットとブーム':'バケットとアーム';
  }
 }
 return '';
}
const overlapsBounds=(a,b)=>a.min.every((n,i)=>n<=b.max[i]&&a.max[i]>=b.min[i]);
const crawlerBounds={min:[-35,0,-43],max:[35,17,43]};
function mightReachCrawler(bounds,ground){
 const [across,up,along]=ground.axes;
 for(let i=0;i<3;i++){
  const center=ground.position[i]+8.5*up[i];
  const half=35*Math.abs(across[i])+8.5*Math.abs(up[i])+43*Math.abs(along[i])+1e-7;
  if(bounds.min[i]>center+half||bounds.max[i]<center-half)return false;
 }
 return true;
}
const walls=[[-126,0,-36,-123,10,12],[-65,0,-36,-62,10,12],[-126,0,-36,-62,10,-33],[-126,0,9,-62,10,12]].map(b=>({min:b.slice(0,3),max:b.slice(3)}));
export function bucketEnvironmentHits(s,pose,{includeTeeth=true}={}){
 const g=bucketContactGeometry(s,pose),bounds=g.bounds,hits=new Set();
 const parts=()=>includeTeeth?g.all:g.body;
 if(Object.keys(s.terrain).length){
  for(const id of touchedCells(s,parts()))hits.add('土:'+id);
 }
 // Test the same geometry in the vehicle frame against the crawler chassis.
 const ground=s.groundPose;
 const nearCrawler=ground?mightReachCrawler(bounds,ground):(includeTeeth?bounds.min[1]<17:parts().some(p=>p.min[1]<17));
 if(nearCrawler){
  const vehicle=s.loader.vehicle,localWrist=ground?ground.axes.map(a=>a.reduce((n,v,i)=>n+v*([pose.wrist.x,pose.wrist.y,pose.wrist.z][i]-ground.position[i]),0)):null;
  const dx=pose.wrist.x-vehicle.x,dz=pose.wrist.z-vehicle.z,heading=vehicle.heading;
  const wrist=localWrist?{x:localWrist[0],y:localWrist[1],z:localWrist[2]}
   :{x:dx*Math.cos(heading)-dz*Math.sin(heading),y:pose.wrist.y,z:dx*Math.sin(heading)+dz*Math.cos(heading)};
  const local=bucketContactGeometry(s,{heading:s.arm.slew,wrist});
  if(overlapsBounds(local.bounds,crawlerBounds)&&local.all.some(p=>prismTouchesBox(p,crawlerBounds.min,crawlerBounds.max)))hits.add('クローラー');
 }
 // The exact per-piece checks are needed only when their union can touch.
 const nearbyWalls=walls.filter(wall=>overlapsBounds(bounds,wall));
 if(bounds.min[1]<0||nearbyWalls.length||s.spoil.length){
  for(const p of parts()){
   if(p.min[1]<-32)hits.add('岩盤');
   if(p.vertices.some(([x,y,z])=>y<0&&(x<-32||x>96||z<48||z>176)&&!s.groundPatches?.has([Math.floor(x/32),Math.floor(z/32)].join(','))))hits.add('固定地面');
   if(nearbyWalls.some(b=>prismTouchesBox(p,b.min,b.max)))hits.add('受け箱の縁');
   for(const o of s.spoil)if(prismTouchesBox(p,[o.x-3.9,o.y-3.9,o.z-3.9],[o.x+3.9,o.y+3.9,o.z+3.9]))hits.add('排土:'+o.id);
  }
 }
 const self=bucketSelfContact(s,pose);if(self)hits.add(self);return hits;
}
