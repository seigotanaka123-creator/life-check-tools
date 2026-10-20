import {vehicleGroundFrame,groundPoint} from './imasora-construction-vehicle-ground-frame.mjs?v=120el';
import {localToWorld} from './imasora-construction-loader-physics.js?v=120gf';
const unit=a=>{const n=Math.hypot(...a);return a.map(x=>x/n);};
export function craneGroundContext(s,heightAt,{deploy=s.work||s.deployment>0}={}){
 if(!s.rig.vehicle.field||typeof heightAt!=='function')return null;
 const g=vehicleGroundFrame(s.rig.vehicle,heightAt),v=s.rig.vehicle;
 if(!deploy)return{drive:g,levelY:g.position[1],feet:[]};
 if(g.position[1]<0||g.position[1]>48)throw Error('クレーンは高さ0〜48の、脚で支えられる地面へ停めよう。');
 const feet=[];
 for(const z of[-32,24])for(const side of[-1,1]){
  const p=localToWorld(v,side*55,z);let lo=Infinity,hi=-Infinity;
  for(let x=-6;x<=6;x++)for(let dz=-6;dz<=6;dz++){const q=localToWorld({x:p.x,z:p.z,heading:v.heading},x,dz),y=heightAt(q.x,q.z);if(!Number.isFinite(y))throw Error('支持脚の下に地面がないよ。停める場所を変えよう。');lo=Math.min(lo,y);hi=Math.max(hi,y);}
  if(hi-lo>2.01)throw Error('支持脚の下の段差が大きいよ。平らにしてから使おう。');
  feet.push({side,station:z,height:hi});
 }
 const levelY=Math.max(g.position[1],...feet.map(f=>f.height))+1;
 if(feet.some(f=>levelY+8-(f.height+2)>32))throw Error('支持脚が地面まで届かないよ。停める場所を変えよう。');
 return{drive:g,levelY,feet};
}
export function craneChassisFrame(s){
 const c=s.groundPose;if(!c?.drive)return null;
 const k=Math.max(0,Math.min(1,s.deployment)),v=s.rig.vehicle,cs=Math.cos(v.heading),sn=Math.sin(v.heading),flat=[[cs,0,-sn],[0,1,0],[sn,0,cs]];
 const y=unit(c.drive.axes[1].map((x,i)=>x*(1-k)+flat[1][i]*k)),x=unit([y[1]*cs,-y[0]*cs-y[2]*(-sn),-y[1]*sn]),z=unit([x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]]);
 return{...c.drive,position:[v.x,c.drive.position[1]*(1-k)+c.levelY*k,v.z],axes:[x,y,z],suspension:c.drive.suspension.map(n=>n*(1-k)),slope:c.drive.slope*(1-k)};
}
export function cranePoint(s,x,y,z){const g=craneChassisFrame(s);if(!g)return{...localToWorld(s.rig.vehicle,x,z),y};const q=groundPoint(g,x,y,z);return{x:q[0],y:q[1],z:q[2]};}
export function craneGroundHeight(external,x,z){return typeof external?.groundHeightAt==='function'?external.groundHeightAt(x,z):0;}
export function cranePartGround(p,external,{collision=false}={}){
 if(typeof external?.groundHeightAt!=='function')return 0;
 const upper=collision?craneGroundCeiling(p,external):undefined;if(Number.isFinite(upper)&&p.y>=upper-.0001)return upper;
 let y=-Infinity;const c=Math.cos(p.angle??0),sn=Math.sin(p.angle??0);
 for(let x=-p.w/2;x<=p.w/2+.001;x+=Math.min(1,p.w))for(let z=-p.d/2;z<=p.d/2+.001;z+=Math.min(1,p.d)){const h=craneGroundHeight(external,p.x+c*x+sn*z,p.z-sn*x+c*z);if(!Number.isFinite(h))return null;y=Math.max(y,h);}
 return y;
}
export function craneGroundObstacles(s,external=[],heightAt=null){
 if(typeof heightAt==='function')Object.defineProperty(external,'groundHeightAt',{value:heightAt,configurable:true});
 return external;
}


export function cranePartFlatGround(p,external){
 if(typeof external?.groundHeightAt!=='function')return true;let lo=Infinity,hi=-Infinity;const c=Math.cos(p.angle??0),sn=Math.sin(p.angle??0);
 for(let x=-p.w/2;x<=p.w/2+.001;x+=Math.min(1,p.w))for(let z=-p.d/2;z<=p.d/2+.001;z+=Math.min(1,p.d)){const h=external.groundHeightAt(p.x+c*x+sn*z,p.z-sn*x+c*z);if(!Number.isFinite(h))return false;lo=Math.min(lo,h);hi=Math.max(hi,h);}return hi-lo<=.12;
}

export function craneGroundCeiling(p,external){const read=external?.groundHeightAt?.upperBound;if(typeof read!=='function')return undefined;const c=Math.abs(Math.cos(p.angle??0)),s=Math.abs(Math.sin(p.angle??0)),x=(p.w*c+p.d*s)/2,z=(p.w*s+p.d*c)/2;return read({minX:p.x-x,maxX:p.x+x,minZ:p.z-z,maxZ:p.z+z});}
