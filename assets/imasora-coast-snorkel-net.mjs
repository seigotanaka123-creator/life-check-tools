// Shared by the visible hand-held net and its contact test. Coordinates are
// world coordinates; camera mode never changes the reach of the tool.
export const SNORKEL_NET=Object.freeze({duration:.85,radius:12,reach:29});
// Keep recorded centimetres and seeded catches intact. Only the large-fish
// display/body size is compressed, shared by the mesh and contact test.
export function snorkelFishSize(size){return size<=24?size:24+(size-24)*.75;}
export function snorkelNetAim(grip,heading,fish){
 const dx=fish.x-grip.x,dy=fish.y-grip.y,dz=fish.z-grip.z,d=Math.hypot(dx,dy,dz);
 const yaw=Math.atan2(Math.sin(Math.atan2(dx,dz)-heading),Math.cos(Math.atan2(dx,dz)-heading)),pitch=-Math.atan2(dy,Math.hypot(dx,dz));
 return d<=39&&Math.abs(yaw)<.5&&Math.abs(pitch)<.52?{yaw,pitch}:null;
}
export function snorkelNetPose(grip,heading,remaining=0,aim=null){
 const phase=remaining>0?Math.max(0,Math.min(1,1-remaining/SNORKEL_NET.duration)):0;
 const reach=Math.sin(phase*Math.PI),yaw=heading+(aim?.yaw??0)*reach+Math.sin(phase*Math.PI*2)*.42,pitch=.24*(1-reach)+reach*(aim?.pitch??.16)+Math.sin(phase*Math.PI*2)*.22;
 const sy=Math.sin(yaw),cy=Math.cos(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch);
 return{grip:{...grip},yaw,pitch,phase,center:{x:grip.x+sy*cp*29,y:grip.y-sp*29,z:grip.z+cy*cp*29},normal:{x:sy*sp,y:cp,z:cy*sp}};
}
export function snorkelNetContact(fish,previous,current){
 if(!previous||!current)return false;
 const a=previous.center,b=current.center,dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,span=dx*dx+dy*dy+dz*dz;
 // A teleport or a restored frame must never sweep through a remote fish.
 if(span>64*64)return false;
 const t=span?Math.max(0,Math.min(1,((fish.x-a.x)*dx+(fish.y-a.y)*dy+(fish.z-a.z)*dz)/span)):0;
 const x=fish.x-a.x-dx*t,y=fish.y-a.y-dy*t,z=fish.z-a.z-dz*t,n=current.normal;
 const depth=x*n.x+y*n.y+z*n.z,radial=Math.max(0,x*x+y*y+z*z-depth*depth),body=snorkelFishSize(fish.size)*.14;
 return Math.abs(depth)<=3.7+body&&radial<=(SNORKEL_NET.radius+body*.65)**2;
}
// World-unit limb offsets, always relative to the authored attachment point.
// A short connected arm moves the real hand; the tool never detaches from it.
export function snorkelHandMotion(index,{swimming=false,kick=0,remaining=0}={}){
 const phase=remaining>0?Math.max(0,Math.min(1,1-remaining/SNORKEL_NET.duration)):0,q=Math.sin(phase*Math.PI),sweep=Math.sin(phase*Math.PI*2);
 const right=index===1;
 let x=swimming?(right?-.8:Math.cos(kick*.5)*.8):0,y=swimming?(right?3.2:.5+Math.sin(kick*.5)*.8):0,z=swimming?(right?1:Math.sin(kick*.5)*1.4):0,rx=swimming?(right?-.15:Math.sin(kick*.5)*.5):0;
 if(right&&remaining>0){x-=q*.4;if(swimming){y+=q*1.8+sweep*.5;z+=-q*1.3+sweep*.6;}else{y+=q*1.4-sweep*.6;z+=q*2.4+sweep*.7;}rx+=q*.55-sweep*.2;}
 return{x,y,z,rx};
}
export function snorkelCatchNotice(catchInfo){
 const label=catchInfo.first?'はじめての魚！':catchInfo.record?'大きさの新記録！':'つかまえた！';
 return label+'\n'+catchInfo.name+'　'+catchInfo.size+' cm';
}
