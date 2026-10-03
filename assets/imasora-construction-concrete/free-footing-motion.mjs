import {footingAt,footSurface,FOOT_LEVEL_EPS,FOOTING_MESSAGE,newToolWalkingReceipt} from './free-footing.mjs';
import {walkingGroundAt,walkingGroundSegment,walkingGroundRotation,renderedSoles,soleClearance} from './free-walking-ground.mjs';

export function createFootingGuard({f,root,actor,feet,record,heightAt=()=>0,includeCured=false}){
 const clearance=soleClearance(root,actor,feet),rest=feet.map(e=>e.position?.clone()??e.o.position.clone());
 let previous={x:actor.position.x,y:actor.position.y,z:actor.position.z};
 function support(){const s=footingAt(f,actor.position.x,actor.position.z,heightAt,includeCured);if(!s)throw Error(FOOTING_MESSAGE);return s;}
 return{
  walk(phase=0){
   const now={x:actor.position.x,z:actor.position.z};
   if(!walkingGroundSegment(f,previous,now,heightAt,includeCured))throw Error(FOOTING_MESSAGE);
   const s=walkingGroundAt(f,now.x,now.z,heightAt,includeCured);if(!s)throw Error(FOOTING_MESSAGE);
   const heading=actor.rotation.y;actor.position.y=s.height;actor.quaternion.copy(walkingGroundRotation(s,heading));let error=0,planted=0;
   feet.forEach((e,i)=>{const lift=Math.max(0,Math.sin(phase+i*Math.PI))*2.6;e.o.position.copy(rest[i]);e.o.position.y+=lift;const down=lift<1e-9;let count=0,nearest=Infinity;
    for(const p of renderedSoles(root,actor,[e])){count++;const h=footSurface(f,p.x,p.z,heightAt,includeCured),gap=(p.y-h)*s.normal.y-clearance;
     if(!Number.isFinite(h)||!Number.isFinite(gap)||gap<-FOOT_LEVEL_EPS-1e-5)throw Error(FOOTING_MESSAGE);nearest=Math.min(nearest,gap);
    }if(!count||down&&Math.abs(nearest)>FOOT_LEVEL_EPS+1e-5)throw Error(FOOTING_MESSAGE);if(down){planted++;error=Math.max(error,Math.abs(nearest));}
   });
   if(!planted)throw Error(FOOTING_MESSAGE);const w=record.walking??=newToolWalkingReceipt();w.samples++;w.terrainSamples+=s.samples;w.minimumPlanted=Math.min(w.minimumPlanted,planted);w.maxSlope=Math.max(w.maxSlope,s.slope);w.maxPatchError=Math.max(w.maxPatchError,s.error);w.maxSoleError=Math.max(w.maxSoleError,error);previous={...now,y:s.height};
  },
  stand(){
   const s=support();if(Math.abs(actor.position.y-s.height)>FOOT_LEVEL_EPS)throw Error(FOOTING_MESSAGE);
   let error=0,low=Infinity,high=-Infinity,count=0;
   // Read rendered sole vertices. A world-axis box gives the wrong bottom on a tilted shoe.
   for(const e of feet){let nearest=Infinity;for(const p of renderedSoles(root,actor,[e])){count++;const h=footSurface(f,p.x,p.z,heightAt,includeCured);if(!Number.isFinite(h))throw Error(FOOTING_MESSAGE);nearest=Math.min(nearest,p.y-clearance-h);low=Math.min(low,h);high=Math.max(high,h);}error=Math.max(error,Math.abs(nearest));}
   if(!count||!Number.isFinite(error)||!Number.isFinite(high-low)||error>FOOT_LEVEL_EPS+1e-5||high-low>FOOT_LEVEL_EPS)throw Error(FOOTING_MESSAGE);
   record.samples++;record.maxSpread=Math.max(record.maxSpread,s.spread,high-low);record.maxHeightError=Math.max(record.maxHeightError,error);previous={x:actor.position.x,y:actor.position.y,z:actor.position.z};
  }
 };
}
