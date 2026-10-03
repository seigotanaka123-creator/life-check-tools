import * as T from '../three.module.min.js';
import {BUCKET} from './c2-3d-physics.mjs';import {TOOL} from './c2-tool-contact.mjs';
export function createHandTools({unit,wood,metal,wet,dark}){
 const root=new T.Group(),bucketPivot=new T.Group(),hammer=new T.Group(),trowel=new T.Group();root.add(bucketPivot,hammer,trowel);
 const cup=new T.Group();cup.position.y=-BUCKET.radius;bucketPivot.add(cup);
 const shell=new T.Mesh(new T.CylinderGeometry(BUCKET.radius+.18,BUCKET.radius+.18,8,48,1,true),new T.MeshStandardMaterial({color:'#789e98',roughness:.55,side:T.DoubleSide}));shell.position.y=-4;cup.add(shell);
 const base=new T.Mesh(new T.CircleGeometry(BUCKET.radius+.18,48),metal);base.rotation.x=-Math.PI/2;base.position.y=-8;cup.add(base);
 const rim=new T.Mesh(new T.TorusGeometry(BUCKET.radius+.1,.18,8,48),metal);rim.rotation.x=Math.PI/2;cup.add(rim);
 const fill=new T.Mesh(new T.CylinderGeometry(BUCKET.radius,BUCKET.radius,1,48),wet);cup.add(fill);
 const handle=new T.Mesh(new T.TorusGeometry(BUCKET.radius,.2,8,32,Math.PI),metal);cup.add(handle);
 function box(parent,x,y,z,w,h,d,material){const m=new T.Mesh(unit,material);m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m;}
 box(hammer,0,-3,0,.6,6,.6,wood);const hammerHead=box(hammer,0,-6,0,5,2,2,dark);
 // Idle tool. The working blade and pole are positioned in world space below.
 box(trowel,0,-4,0,.55,9,.55,wood);box(trowel,0,-8.5,0,4,.3,8,metal);
 const working=new T.Group(),blade=box(working,0,0,0,4,.3,8,metal),pole=new T.Mesh(new T.CylinderGeometry(.23,.23,1,10),wood);working.add(pole);working.visible=false;
 const stream=new T.Mesh(new T.CylinderGeometry(.26,.36,1,12),wet);stream.visible=false;
 const mark=new T.Mesh(new T.RingGeometry(.4,.72,24),new T.MeshBasicMaterial({color:'#e6edc1',side:T.DoubleSide}));mark.rotation.x=-Math.PI/2;mark.visible=false;
 const line=(mesh,a,b)=>{const v=new T.Vector3(b.x-a.x,b.y-a.y,b.z-a.z);mesh.position.set((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);mesh.scale.y=v.length();mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());};
 const bands=[];for(const side of [1,-1])for(let row=0;row<4;row++){const m=box(working,side*8,2.018,-12+row*8,16,.016,8,new T.MeshStandardMaterial({color:'#a5b4af',roughness:.5}));m.visible=false;bands.push(m);}
 function select(kind){root.visible=kind!=='hands';bucketPivot.visible=kind==='bucket';hammer.visible=kind==='hammer';trowel.visible=kind==='trowel';}
 function amount(q){q=Math.max(0,Math.min(1,q));fill.visible=q>0;fill.scale.y=8*q;fill.position.y=-8+4*q;}
 function clear(){stream.visible=mark.visible=working.visible=false;bands.forEach(b=>b.visible=false);bucketPivot.rotation.x=hammer.rotation.x=0;}
 return{root,working,stream,mark,select,amount,clear,
  poseHammer(p){hammer.rotation.x=p.hammerAngle;},
  posePour(p){bucketPivot.rotation.x=-p.angle;amount(p.remaining);stream.visible=mark.visible=p.flow;if(p.flow){line(stream,p.source,p.target);mark.position.set(p.target.x,p.target.y+.035,p.target.z);}},
  poseFill(p){bucketPivot.rotation.x=0;amount(p.q);stream.visible=p.flow;mark.visible=false;if(p.flow)line(stream,p.source,p.target);},
  poseTrowel(p,completed){working.visible=true;trowel.visible=false;blade.position.set(p.blade.x,p.blade.y,p.blade.z);line(pole,p.grip,p.joint);mark.visible=p.contact;mark.position.set(p.blade.x,2.035,p.blade.z);
   bands.forEach((b,i)=>b.visible=completed.has(i));
  },
  measureWorkingGrip:()=>pole.localToWorld(new T.Vector3(0,-.5,0)),measureLip:()=>cup.localToWorld(new T.Vector3(0,0,-BUCKET.radius)),gripPoint:new T.Vector3(0,0,0),
  bucketHandleTop:new T.Vector3(0,0,0),
  hammerFace:()=>hammerHead.localToWorld(new T.Vector3(0,-.5,0)),
  fillCenter:()=>fill.localToWorld(new T.Vector3(0,.5,0)),fillVolume:()=>fill.scale.y*Math.PI*BUCKET.radius**2,
  bladeBottom:()=>blade.position.y-TOOL.bladeThickness/2
 };
}


