// v471: opt-in, memory-only connection to the actual construction scene.
// No importing practice saves or granting soil to an inventory.
import {initialExcavatorBuild,stepExcavatorBuild,actExcavatorBuild} from './imasora-construction-excavator-build.js';
import {digPersonBlocked,digPlayer} from './imasora-construction-excavator-walk.js';
import {SITE} from './imasora-construction-loader-physics.js';
import {PLOT,excavatorActorPose} from './imasora-construction-excavator.js';
import {BACKHOE_BUCKET,CONTACT_DIG} from './imasora-construction-excavator-bucket.js';
export const EXCAVATION_YARDS=Object.freeze([[0,1180],[0,-1180],[2100,0],[-2100,0]].map(Object.freeze));
export const EXCAVATION_GATE=Object.freeze({x:-230,z:-226,width:84});
export function chooseExcavationYard(blockedAt,reserved=()=>false){
  return EXCAVATION_YARDS.findIndex(([x,z])=>!blockedAt(x,z,425)&&!reserved([x,0,z],[720,0,600]));
}
export function excavationOpening(site){const [x,z]=EXCAVATION_YARDS[site];return {minX:x+PLOT.minX,maxX:x+PLOT.maxX,minZ:z+PLOT.minZ,maxZ:z+PLOT.maxZ};}
export function excavationReserved(site,p,size){const [x,z]=EXCAVATION_YARDS[site];return Math.abs(p[0]-x)<360+size[0]/2&&Math.abs(p[2]-z)<300+size[2]/2;}
export function excavationLocal(site,p){const [x,z]=EXCAVATION_YARDS[site];return {...p,x:p.x-x,z:p.z-z};}
export function excavationEntry(site,p){const q=excavationLocal(site,p);return Math.abs(q.x-EXCAVATION_GATE.x)<32&&q.z>=-228&&q.z<=-202&&Math.abs(q.y)<.05;}
export function excavationCanLeave(s){const p=s.loader.player;return s.loader.mode==='foot'&&!s.action&&p.grounded&&Math.abs(p.y)<.05&&Math.abs(p.x-EXCAVATION_GATE.x)<32&&p.z<-210;}
export function enterExcavation(s,site,p){
  const local=excavationLocal(site,p);if(!excavationEntry(site,p)||digPersonBlocked(s,local))throw Error('入口の平らな地面から作業区画に入ってください。');
  // Re-entering preserves the parked machine, suspended mechanical action and soil.
  if(s.loader.mode!=='foot')return {...s,guide:null};
  return {...s,guide:null,loader:{...s.loader,player:digPlayer({...local,grounded:true})}};
}
export function excavationWorldPose(s,site){const [x,z]=EXCAVATION_YARDS[site],p=excavatorActorPose(s);return {...p,x:x+p.x,z:z+p.z};}
export function leaveExcavation(s,{force=false}={}){
  if(!force&&!excavationCanLeave(s))throw Error('降車して入口の平らな地面まで戻ってください。');
  // Force exit pauses the actual machine/action; it does not discard its load.
  const n={...s,guide:null,loader:{...s.loader,vehicle:{...s.loader.vehicle,speed:0}}};
  return {work:n,position:force?{x:EXCAVATION_GATE.x,y:0,z:-238,heading:Math.PI}:excavatorActorPose(s)};
}
export const initialWorldExcavation=()=>({...initialExcavatorBuild(),bucketStyle:BACKHOE_BUCKET});
// Explicit new mode: old checkpoint kinematics and guided tunnel remain readable.
export function initialContactWorldExcavation(){const s=initialWorldExcavation();return{...s,digMode:CONTACT_DIG,cutMask:Object.fromEntries(Object.keys(s.terrain).map(id=>[id,true])),arm:{...s.arm,curl:-1},message:'掘りたい場所に爪を合わせて「すくう」。バケットの開閉も手動で調整できます。土は接触した分だけ掘れます。'};}
export {stepExcavatorBuild as stepWorldExcavation,actExcavatorBuild as actWorldExcavation,SITE};
