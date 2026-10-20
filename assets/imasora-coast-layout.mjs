// World units match the existing avatar. Old plots keep their original origin.
export const COAST_WORLD = Object.freeze({width:1800,depth:1400,layoutWidth:540,layoutDepth:360});
export const COAST_WATER_Y = -4.5;
export const COAST_PLACES = Object.freeze([
 {id:'town',name:'街へ続く橋',x:-192,z:-410,description:'橋の向こうは、いつもの街。',icon:'🏘️'},
 {id:'shore',name:'ひかりの浜',x:0,z:285,description:'波打ち際で、空と海の色を見つけよう。',icon:'🐚'},
 {id:'pier',name:'星待ちの桟橋',x:340,z:565,description:'海の上を歩いて、水平線をひとりじめ。',icon:'✨'},
 {id:'lighthouse',name:'空貝の灯台',x:-650,z:185,description:'貝がらの輪が、夜の海をそっと照らす。',icon:'🐚'},
 {id:'garden',name:'潮風の庭',x:590,z:75,description:'花と風鈴の小さな休憩所。街並みも見えるよ。',icon:'🌼'},
 {id:'rocks',name:'潮だまりの入り江',x:-465,z:280,description:'岩の間に残った、空色の小さな海。',icon:'🫧'},
]);
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function coastShore(x){return 325+28*Math.cos(x/235)+16*Math.sin(x/120);}
export function coastHeight(x,z){
 const shore=coastShore(x),t=smooth(175,shore,z);
 const beach=-4.5*t;
 // Continuous wet sand and seabed; no arbitrary raised flat "water floor".
 const seabed=z>shore?-(z-shore)*.075:0;
 const dune=Math.abs(x)>330?7*Math.sin(x*.012)**2*smooth(85,-110,z)*(1-smooth(-360,-230,z)):0;
 return beach+seabed+dune;
}
export function coastPierContains(x,z,margin=0){
 return (Math.abs(x-340)<=25-margin&&z>=185+margin&&z<=582-margin)
   ||(Math.abs(x-340)<=64-margin&&z>=540+margin&&z<=602-margin);
}
export function coastCanWade(x,z){
 return coastPierContains(x,z,8)||coastHeight(x,z)>=COAST_WATER_Y-10;
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
 evening:{top:0x7a92bd,horizon:0xffd0a2,sea:0x559eab,deep:0x365b80,sun:0xffb562,ambient:1.35,power:2.4,azimuth:.7,elevation:.09,night:0},
 night:{top:0x08162e,horizon:0x526585,sea:0x245276,deep:0x102d4e,sun:0xd1e9ff,ambient:.8,power:.75,azimuth:-.45,elevation:.48,night:1},
});
// Blend over the first 12 minutes of a new phase, avoiding an abrupt flash.
export function coastLighting(date=new Date()){
 const t=coastTime(date),start={morning:6,day:9,evening:16,night:t.hour>=19?19:0}[t.phase];
 const previous={morning:'night',day:'morning',evening:'day',night:'evening'}[t.phase];
 const blend=t.phase==='night'&&t.hour<6?1:Math.min(1,(t.hour-start)/.2);
 return {...t,from:COAST_LIGHT[previous],to:COAST_LIGHT[t.phase],blend};
}
