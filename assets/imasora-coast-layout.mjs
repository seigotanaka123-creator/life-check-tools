import {coastIslandHeight,coastReefCut,coastReefBed} from './imasora-coast-sea-regions.mjs?v=120mu';
import {coastIslandGroundHeight} from './imasora-coast-island-ground.mjs?v=120mu';
// World units match the existing avatar. Old plots keep their original origin.
export const COAST_WORLD = Object.freeze({width:70000,depth:190000,layoutWidth:540,layoutDepth:360});
export const COAST_WATER_Y = -4.5;
export const COAST_WADE_DEPTH = 10;
// The town bridge crosses the same east/west waterway on this side. Its
// banks sit beyond the old six building plots and both bridge approaches.
export const COAST_TOWN_CANAL=Object.freeze({x:-192,z:-370,halfWidth:110,bedHalfWidth:70,depth:30,halfLength:6500,bridgeHalfWidth:40});
export function coastTownCanalDepth(z){const b=COAST_TOWN_CANAL,d=Math.abs(z-b.z);return d>=b.halfWidth?0:d<=b.bedHalfWidth?b.depth:b.depth*(b.halfWidth-d)/(b.halfWidth-b.bedHalfWidth);}
export const COAST_DOCK_FENDERS=Object.freeze([299.4,380.6].map(x=>Object.freeze({x,z:607,halfX:8,halfZ:8,minY:-24,maxY:7}))); 
export const COAST_PLACES = Object.freeze([
 {id:'town',name:'街へ続く橋',x:-192,z:-410,description:'橋の向こうは、いつもの街。',icon:'🏘️'},
 {id:'shore',name:'ひかりの浜',x:0,z:285,description:'海辺を歩ける砂浜。流れ着いた素材は拾って持ち帰れる。',icon:'🐚'},
 {id:'rig',name:'いかだ工房',x:420,z:240,description:'集めた木材や航海パーツで船の部品をつくろう。オール・フィン・重り・補強を組み合わせて、波に合う船に。',icon:'🛶'},
 {id:'pier',name:'星待ちの桟橋',x:340,z:565,description:'いかだの乗り場。桟橋から船に乗って出航できる。',icon:'✨'},
]);
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function coastShore(x){return 325+28*Math.cos(x/235)+16*Math.sin(x/120);}
export function coastMainlandHeight(x,z){
 const shore=coastShore(x),t=smooth(175,shore,z);
 const beach=-4.5*t;
 // Continuous wet sand and seabed; no arbitrary raised flat "water floor".
 const seabed=z>shore?-(z-shore)*.075:0;
 const dune=Math.abs(x)>330?7*Math.sin(x*.012)**2*smooth(85,-110,z)*(1-smooth(-360,-230,z)):0;
 const cut=coastTownCanalDepth(z);
 const reef=coastReefBed(x,z);return coastReefCut(Math.max(-240,beach+seabed+dune*(1-cut/COAST_TOWN_CANAL.depth)-cut),x,z)-(reef?.weight??0)*32;
}
export function coastHeight(x,z){return Math.max(coastMainlandHeight(x,z),coastIslandHeight(x,z));}
export function coastWalkingHeight(x,z){return Math.max(coastMainlandHeight(x,z),coastIslandGroundHeight(x,z));}
export function coastPierContains(x,z,margin=0){
 return (Math.abs(x-340)<=25-margin&&z>=185+margin&&z<=582-margin)
   ||(Math.abs(x-340)<=64-margin&&z>=500+margin&&z<=602-margin);
}
export function coastCanWade(x,z){
 const b=COAST_TOWN_CANAL,bridge=Math.abs(x-b.x)<=25&&Math.abs(z-b.z)<=130;
 return bridge||coastPierContains(x,z,8)||coastWalkingHeight(x,z)>=COAST_WATER_Y-COAST_WADE_DEPTH;
}
// Same local-clock boundaries as the home and town, including midnight.
export function coastTime(date=new Date()){
 const hour=date.getHours()+date.getMinutes()/60+date.getSeconds()/3600;
 const phase=hour<6||hour>=19?'night':hour<9?'morning':hour<16?'day':'evening';
 return {hour,phase,label:{morning:'朝',day:'昼',evening:'夕暮れ',night:'夜'}[phase]};
}
export const COAST_LIGHT = Object.freeze({
 morning:{top:0x6eafcf,horizon:0xfce3c3,sea:0x389fa9,deep:0x245574,sun:0xffdfaf,ambient:1.65,power:2.5,azimuth:-.9,elevation:.2,night:0},
 day:{top:0x448ac0,horizon:0xc5dbe5,sea:0x47aaac,deep:0x225b7b,sun:0xfff5db,ambient:1.45,power:2.1,azimuth:.25,elevation:.38,night:0},
 evening:{top:0x778db6,horizon:0xffce9d,sea:0x559eab,deep:0x365b80,sun:0xffb562,ambient:1.35,power:2.4,azimuth:.7,elevation:.09,night:0},
 night:{top:0x0c1d3a,horizon:0x485f80,sea:0x245276,deep:0x102d4e,sun:0xd1e9ff,ambient:1.65,power:1.05,azimuth:-.45,elevation:.48,night:1},
});
// Blend over the first 12 minutes of a new phase, avoiding an abrupt flash.
export function coastLighting(date=new Date()){
 const t=coastTime(date),start={morning:6,day:9,evening:16,night:t.hour>=19?19:0}[t.phase];
 const previous={morning:'night',day:'morning',evening:'day',night:'evening'}[t.phase];
 const blend=t.phase==='night'&&t.hour<6?1:Math.min(1,(t.hour-start)/.2);
 return {...t,from:COAST_LIGHT[previous],to:COAST_LIGHT[t.phase],blend};
}
