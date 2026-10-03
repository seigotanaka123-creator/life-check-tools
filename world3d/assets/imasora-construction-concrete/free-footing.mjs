import {constructionBase} from './free-supported-build.mjs';
import {freePlacedFill} from './free-work-parts.mjs';
import {freeCell} from './free-build-state.mjs';

// This stage supports level ground and continuous, cured surfaces. It deliberately
// does not invent a ladder, bridge, or automatic climb at a raised floor edge.
export const FOOT_LEVEL_EPS=.15;
export const FOOTING_MESSAGE='足元に穴や段差があります。平らな通路と作業場所を確保してください。';
export const needsFooting=a=>['FREE_PAINT','FREE_FINISH','FREE_BUCKET_LOAD','FREE_FRAME','FREE_FRAME_RAISED','FREE_DEMOLD','FREE_UNFRAME'].includes(a.type)||(a.type==='FREE_POUR'&&a.source==='bucket');
export function footSurface(f,x,z,heightAt=()=>0,includeCured=false){
 const ground=heightAt(f.location.x+x,f.location.z+z);
 if(!Number.isFinite(ground))return null;
 let height=ground;
 const works=includeCured&&f.stage==='cured'?[...f.completed,{...f.location,fill:f.fill,baseY:constructionBase(f)}]:f.completed;
 for(const w of works){if(Math.abs(x-(w.x-f.location.x))>32||Math.abs(z-(w.z-f.location.z))>32)continue;for(let i=0;i<16;i++)if(freePlacedFill(w,i)){const c=freeCell(i);if(Math.abs(x-(w.x-f.location.x+c.x))<=8&&Math.abs(z-(w.z-f.location.z+c.z))<=8)height=Math.max(height,constructionBase(w)+w.fill[i]/2);}}
 return height;
}
export function footingAt(f,x,z,heightAt=()=>0,includeCured=false){
 if(!Number.isFinite(x)||!Number.isFinite(z))return null;
 // Covers both shoes in every heading, not just the character's centre point.
 let low=Infinity,high=-Infinity;
 for(const dx of [-12,-6,0,6,12])for(const dz of [-12,-6,0,6,12]){const h=footSurface(f,x+dx,z+dz,heightAt,includeCured);if(h===null)return null;low=Math.min(low,h);high=Math.max(high,h);}
 if(high-low>FOOT_LEVEL_EPS)return null;
 return{height:high,spread:high-low};
}
export function footingSegment(f,from,to,heightAt=()=>0,includeCured=false){
 const n=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/2));let last=null;
 for(let i=0;i<=n;i++){const t=i/n,s=footingAt(f,from.x+(to.x-from.x)*t,from.z+(to.z-from.z)*t,heightAt,includeCured);if(!s||i===0&&Number.isFinite(from.y)&&Math.abs(s.height-from.y)>FOOT_LEVEL_EPS||last!==null&&Math.abs(s.height-last)>FOOT_LEVEL_EPS)return false;last=s.height;}
 return true;
}
export const newFootingReceipt=()=>({samples:0,maxSpread:0,maxHeightError:0});
export const newToolWalkingReceipt=()=>({samples:0,terrainSamples:0,minimumPlanted:2,maxSlope:0,maxPatchError:0,maxSoleError:0});
export function assertFootingReceipt(r){
 const keys=['maxHeightError','maxSpread','samples',...(r?.walking?['walking']:[])].sort();
 if(!r||JSON.stringify(Object.keys(r).sort())!==JSON.stringify(keys)||!Number.isSafeInteger(r.samples)||r.samples<3||!Number.isFinite(r.maxSpread)||r.maxSpread<0||r.maxSpread>FOOT_LEVEL_EPS||!Number.isFinite(r.maxHeightError)||r.maxHeightError<0||r.maxHeightError>FOOT_LEVEL_EPS+1e-5)throw Error('両足が作業面に支えられていることを確認できません。');
 if(r.walking){const w=r.walking,valid=(n,max)=>Number.isFinite(n)&&n>=0&&n<=max;
  if(JSON.stringify(Object.keys(w).sort())!==JSON.stringify(Object.keys(newToolWalkingReceipt()).sort())||!Number.isSafeInteger(w.samples)||w.samples<2||!Number.isSafeInteger(w.terrainSamples)||w.terrainSamples<w.samples*25||!Number.isInteger(w.minimumPlanted)||w.minimumPlanted<1||w.minimumPlanted>2||!valid(w.maxSlope,Math.tan(8*Math.PI/180)+1e-8)||!valid(w.maxPatchError,FOOT_LEVEL_EPS+1e-8)||!valid(w.maxSoleError,FOOT_LEVEL_EPS+1e-5))throw Error('道具を持つ歩行の地面・靴底を確認できません。');
 }
}
