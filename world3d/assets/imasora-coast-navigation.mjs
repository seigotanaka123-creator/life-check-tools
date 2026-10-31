import {COAST_WORLD,coastCanWade,coastShore} from './imasora-coast-layout.mjs?v=120mx';

// A readable atlas focuses on the places people can visit, rather than the skybox.
export const COAST_ATLAS = Object.freeze({left:-900,right:900,top:-710,bottom:970,width:600,height:470});
// Include the whole navigable sea, without adding undiscovered island landmarks.
export const COAST_SEA_ATLAS=Object.freeze({left:-37000,right:37000,top:-6000,bottom:100000,width:600,height:470});
export function coastAtlasPoint(x,z,mode='shore'){
 const a=mode==='sea'?COAST_SEA_ATLAS:COAST_ATLAS;
 return {x:Math.max(14,Math.min(a.width-14,(x-a.left)/(a.right-a.left)*a.width)),
  y:Math.max(18,Math.min(a.height-18,(z-a.top)/(a.bottom-a.top)*a.height))};
}

export function coastAtlasLocation(x,z,heading=0,mode='shore'){
 const a=mode==='sea'?COAST_SEA_ATLAS:COAST_ATLAS,p=coastAtlasPoint(x,z,mode);
 const rawX=(x-a.left)/(a.right-a.left)*a.width,rawY=(z-a.top)/(a.bottom-a.top)*a.height;
 return {...p,contained:rawX>=14&&rawX<=a.width-14&&rawY>=18&&rawY<=a.height-18,
  rotation:Number.isFinite(heading)?180-heading*180/Math.PI:180};
}
export function coastAtlasMode(x,z){return coastAtlasLocation(x,z).contained?'shore':'sea';}

// Ask at the town end of the bridge and at the outer walkable map boundary.
// Declining is latched until the player walks well away: holding a direction,
// rotating the screen or a save completing cannot immediately ask again.
export function coastReturnEdge(x,z,releaseMargin=0){
 if(Math.abs(x+192)<=29+releaseMargin&&z<=-480+releaseMargin)return 'bridge';
 const m=releaseMargin+11;
 if(z<coastShore(x)+100&&coastCanWade(x,z)&&(Math.abs(x)>=900-7-m||z<=-3800+7+m))return 'edge';
 return null;
}
export function createCoastReturnGate(){
 let latched=false,initialized=false;
 return {
  update({map,x,z,blocked=false,airborne=false}){
   if(map!=='coast'){latched=false;initialized=false;return false;}
   // Resuming a save already at an edge is not arriving there again.
   if(!initialized){initialized=true;latched=!!coastReturnEdge(x,z);return false;}
   if(latched){if(!coastReturnEdge(x,z,44))latched=false;return false;}
   if(blocked||airborne||!coastReturnEdge(x,z))return false;
   latched=true;return true;
  },
  latch(){latched=true;}
 };
}
