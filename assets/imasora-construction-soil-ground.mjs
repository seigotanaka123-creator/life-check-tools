import {vehicleGroundFrame,groundPoint} from './imasora-construction-vehicle-ground-frame.mjs?v=120el';
import {bucketWorldPoint} from './imasora-construction-loader-work.js?v=120gf';

// The vehicle can stand on a supported grade. The separate soil-bed module
// owns the material profile; this module never saves a chassis pose.
export function soilWorkFrame(s,heightAt){
 if(!s.loader.vehicle.field||typeof heightAt!=='function')return null;
 const g=vehicleGroundFrame(s.loader.vehicle,heightAt);
 if(g.position[1]<-32||g.position[1]>48)throw Error('土を扱うときは、低い地面へ車を移そう。');
 return g;
}
export function soilPatchBase(p,heightAt){
 if(typeof heightAt!=='function')return 0;
 let lo=Infinity,hi=-Infinity;
 for(let x=-16;x<=16;x+=2)for(let z=-16;z<=16;z+=2){const y=heightAt(p.x+x,p.z+z);if(!Number.isFinite(y)||y< -32||y>48)return null;lo=Math.min(lo,y);hi=Math.max(hi,y);}
 return hi-lo<=.12?hi:null;
}
export function soilBucketPoint(s,ox,oz,ease,g,dy=0){
 const b={lift:ease*.45,tilt:ease*.62};
 const p=bucketWorldPoint(g?{x:0,z:0,heading:0}:s.loader.vehicle,b,ox,-4.2+dy,oz);
 if(!g)return p;const q=groundPoint(g,p.x,p.y,p.z);return{x:q[0],y:q[1],z:q[2]};
}
