// v476: same v475 contact geometry; invariant axes and projection ranges reused.
import {ShapeUtils,Vector2} from './three.module.min.js';
import {BUCKET_OUTLINE,BUCKET_SHELL,BUCKET_TOOTH,toothHalfWidth,bucketRotation} from './imasora-construction-excavator-bucket.js';
const sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function uniqueAxis(out,a){const length=Math.hypot(...a);if(length<1e-9)return;a=a.map(v=>v/length);if(!out.some(b=>Math.abs(a[0]*b[0]+a[1]*b[1]+a[2]*b[2])>1-1e-14))out.push(a);}
function prism(profile,width,x=0,tooth=false){
 const vertices=[-1,1].flatMap(side=>profile.map(([y,z])=>[x+side*(tooth?toothHalfWidth(z):width/2),y,z])),n=profile.length;
 const faces=[Array.from({length:n},(_,i)=>i),Array.from({length:n},(_,i)=>n+i)],edges=[];
 for(let i=0;i<n;i++){const j=(i+1)%n;faces.push([i,j,n+j,n+i]);edges.push([i,j],[n+i,n+j],[i,n+i]);}
 const normals=[],directions=[];for(const f of faces)uniqueAxis(normals,cross(sub(vertices[f[1]],vertices[f[0]]),sub(vertices[f[2]],vertices[f[0]])));for(const[i,j]of edges)uniqueAxis(directions,sub(vertices[j],vertices[i]));
 return{vertices,faces,edges,normals,directions,profile,x,width,tooth};
}
const plates=(profile,w,x=0)=>ShapeUtils.triangulateShape(profile.map(([y,z])=>new Vector2(y,z)),[]).map(face=>prism(face.map(i=>profile[i]),w,x));
const teeth=[-6,-2,2,6].map(x=>prism(BUCKET_TOOTH,2.8,x,true));
const body=[...plates(BUCKET_SHELL,18),...plates(BUCKET_OUTLINE,1.3,-8.35),...plates(BUCKET_OUTLINE,1.3,8.35),prism([[-12.75,-15],[-11.25,-15],[-11.25,-13],[-12.75,-13]],17)];
// Small numeric-key cache: independent of state/terrain object identity. It is
// safe for immutable snapshots AND callers which edit arm/vehicle fields.
const geometryCache=[];
export function bucketContactGeometry(s,pose){
 const a=bucketRotation(s),c=Math.cos(a),sn=Math.sin(a),h=pose.heading,ch=Math.cos(h),sh=Math.sin(h),w=pose.wrist;
 const key=[a,h,w.x,w.y,w.z],cached=geometryCache.find(e=>key.every((v,i)=>v===e.key[i]));if(cached)return cached.value;
 const rotate=p=>{const y=p[1]*c-p[2]*sn,z=p[1]*sn+p[2]*c;return[p[0]*ch+z*sh,y,-p[0]*sh+z*ch];};
 const make=p=>{const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],vertices=p.vertices.map(v=>{const q=rotate(v);q[0]+=w.x;q[1]+=w.y;q[2]+=w.z;for(let k=0;k<3;k++){min[k]=Math.min(min[k],q[k]);max[k]=Math.max(max[k],q[k]);}return q;}),axes=[];
  for(const normal of p.normals)uniqueAxis(axes,rotate(normal));for(const direction of p.directions){const e=rotate(direction);uniqueAxis(axes,[0,e[2],-e[1]]);uniqueAxis(axes,[-e[2],0,e[0]]);uniqueAxis(axes,[e[1],-e[0],0]);}
  // A prism's vertex projections do not change between testing its nearby
  // soil cells, bin walls and spoil. Calculate them once per pose, not per box.
  const ranges=axes.map(axis=>{let low=Infinity,high=-Infinity;for(const v of vertices){const d=v[0]*axis[0]+v[1]*axis[1]+v[2]*axis[2];low=Math.min(low,d);high=Math.max(high,d);}return[low,high];});
  return{...p,vertices,axes,ranges,min,max};
 };
 const value={teeth:teeth.map(make),body:body.map(make)};value.all=[...value.body,...value.teeth];geometryCache.unshift({key,value});if(geometryCache.length>8)geometryCache.pop();return value;
}
export function prismTouchesBox(p,min,max,skin=0){
 for(let k=0;k<3;k++)if(p.min[k]>max[k]+skin||p.max[k]<min[k]-skin)return false;
 const cx=(min[0]+max[0])/2,cy=(min[1]+max[1])/2,cz=(min[2]+max[2])/2,hx=(max[0]-min[0])/2+skin,hy=(max[1]-min[1])/2+skin,hz=(max[2]-min[2])/2+skin;
 for(let i=0;i<p.axes.length;i++){const axis=p.axes[i],middle=cx*axis[0]+cy*axis[1]+cz*axis[2],r=hx*Math.abs(axis[0])+hy*Math.abs(axis[1])+hz*Math.abs(axis[2]),range=p.ranges[i];if(range[0]>middle+r||range[1]<middle-r)return false;}return true;
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
 for(let n=0;n<2;n++){const a=pose.local[n],b=pose.local[n+1],length=Math.hypot(b.y-a.y,b.z-a.z);for(let d=0;d<=length;d+=.6){if(n===1&&length-d<8)continue;const y=a.y+(b.y-a.y)*d/length-w.y,z=a.z+(b.z-a.z)*d/length-w.z,ly=y*c+z*sn,lz=-y*sn+z*c;
  const r=n===0?2.8:2.3;if(ly<selfBounds.minY-r||ly>selfBounds.maxY+r||lz<selfBounds.minZ-r||lz>selfBounds.maxZ+r)continue;
  if(selfProfiles.some(p=>ly>=p.minY-r&&ly<=p.maxY+r&&lz>=p.minZ-r&&lz<=p.maxZ+r&&nearProfile(ly,lz,p.profile,r)))return n===0?'バケットとブーム':'バケットとアーム';
 }}return '';
}
const walls=[[-126,0,-36,-123,10,12],[-65,0,-36,-62,10,12],[-126,0,-36,-62,10,-33],[-126,0,9,-62,10,12]].map(b=>({min:b.slice(0,3),max:b.slice(3)}));
export function bucketEnvironmentHits(s,pose,{includeTeeth=true}={}){
 const g=bucketContactGeometry(s,pose),parts=includeTeeth?g.all:g.body,hits=new Set([...touchedCells(s,parts)].map(id=>'土:'+id));
 // Test the same geometry in the vehicle frame against the crawler chassis.
 const vehicle=s.loader.vehicle,localPose={heading:s.arm.slew,wrist:{x:(pose.wrist.x-vehicle.x)*Math.cos(vehicle.heading)-(pose.wrist.z-vehicle.z)*Math.sin(vehicle.heading),y:pose.wrist.y,z:(pose.wrist.x-vehicle.x)*Math.sin(vehicle.heading)+(pose.wrist.z-vehicle.z)*Math.cos(vehicle.heading)}};
 if(parts.some(p=>p.min[1]<17)){const local=bucketContactGeometry(s,localPose);if(local.all.some(p=>prismTouchesBox(p,[-35,0,-43],[35,17,43])))hits.add('クローラー');}
 for(const p of parts){if(p.min[1]<-32)hits.add('岩盤');if(p.vertices.some(([x,y,z])=>y<0&&(x<-32||x>96||z<48||z>176)))hits.add('固定地面');
  if(walls.some(b=>prismTouchesBox(p,b.min,b.max)))hits.add('受け箱の縁');for(const o of s.spoil)if(prismTouchesBox(p,[o.x-3.9,o.y-3.9,o.z-3.9],[o.x+3.9,o.y+3.9,o.z+3.9]))hits.add('排土:'+o.id);
 }
 const self=bucketSelfContact(s,pose);if(self)hits.add(self);return hits;
}
