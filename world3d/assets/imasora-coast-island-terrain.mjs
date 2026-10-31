import * as T from './three.module.min.js';
import {islandTerrainAxes} from './imasora-coast-island-ground.mjs?v=120mu';
import {islandRelief} from './imasora-coast-sea-regions.mjs?v=120mu';

// Generate the original samples and normals in small resumable batches. The
// shoreline, colours and resolution are deliberately unchanged.
export function* buildIslandTerrain(i,segments){
 const {xs,zs}=islandTerrainAxes(i,segments);
 const count=xs.length*zs.length,p=new Float32Array(count*3),c=new Float32Array(count*3),uv=new Float32Array(count*2),norm=new Float32Array(count*3),indices=new (count>65535?Uint32Array:Uint16Array)((xs.length-1)*(zs.length-1)*6);
 const sand=new T.Color(0xe5d6b3),grassColor=new T.Color(0x668554),stoneColor=new T.Color(i.seed===1?0xc5c3b4:0x858b80),col=new T.Color();
 const min=new T.Vector3(Infinity,Infinity,Infinity),max=new T.Vector3(-Infinity,-Infinity,-Infinity),point=new T.Vector3();
 for(let n=0;n<count;n++){
  const x=Math.fround(xs[n%xs.length]),z=Math.fround(zs[Math.floor(n/xs.length)]),y=islandRelief(i,x+i.x,z+i.z),k=n*3;
  p[k]=x;p[k+1]=y;p[k+2]=z;
  const slope=Math.hypot(islandRelief(i,x+i.x+2,z+i.z)-y,islandRelief(i,x+i.x,z+i.z+2)-y)/2;
  const patch=.5+.5*Math.sin(x*.013+Math.sin(z*.009)*2)*Math.cos(z*.016),grass=T.MathUtils.smoothstep(y,8,26),stone=T.MathUtils.smoothstep(slope,.5,.95);
  col.copy(sand).lerp(grassColor,grass).lerp(stoneColor,stone).multiplyScalar(.82+patch*.17+Math.sin(y*.14+x*.003)*stone*.055);c[k]=col.r;c[k+1]=col.g;c[k+2]=col.b;uv[n*2]=x/45;uv[n*2+1]=z/45;
  point.fromArray(p,k);min.min(point);max.max(point);if(n%32===31)yield;
 }
 for(let z=0,k=0;z<zs.length-1;z++){for(let x=0;x<xs.length-1;x++){const a=z*xs.length+x,b=a+xs.length;indices[k++]=a;indices[k++]=b;indices[k++]=a+1;indices[k++]=a+1;indices[k++]=b;indices[k++]=b+1;}yield;}
 const pa=new T.Vector3(),pb=new T.Vector3(),pc=new T.Vector3(),cb=new T.Vector3(),ab=new T.Vector3();
 for(let n=0;n<indices.length;n+=3){const a=indices[n]*3,b=indices[n+1]*3,d=indices[n+2]*3;pa.fromArray(p,a);pb.fromArray(p,b);pc.fromArray(p,d);cb.subVectors(pc,pb);ab.subVectors(pa,pb);cb.cross(ab);for(const k of[a,b,d]){norm[k]+=cb.x;norm[k+1]+=cb.y;norm[k+2]+=cb.z;}if(n%768===765)yield;}
 const center=min.clone().add(max).multiplyScalar(.5);let radiusSq=0;
 for(let n=0;n<count;n++){const k=n*3;point.fromArray(norm,k).normalize().toArray(norm,k);point.fromArray(p,k);radiusSq=Math.max(radiusSq,point.distanceToSquared(center));if(n%256===255)yield;}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setAttribute('color',new T.BufferAttribute(c,3));g.setAttribute('normal',new T.BufferAttribute(norm,3));g.setIndex(new T.BufferAttribute(indices,1));g.boundingSphere=new T.Sphere(center,Math.sqrt(radiusSq));return g;
}

export function finishIslandTerrain(i,segments){const job=buildIslandTerrain(i,segments);let step;do{step=job.next();}while(!step.done);return step.value;}
