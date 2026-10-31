// Stable IDs keep island gifts and player creations attached to the same places.
export const COAST_CHART_REVISION=2, COAST_DISTANCE_SCALE=30, COAST_ISLAND_SCALE=8;
export const LEGACY_ISLANDS=Object.freeze([
 {id:'shell-island',port:'shell',name:'貝がらの島',x:-370,z:1220,rx:145,rz:125,peak:18,edge:1072,icon:'🐚',description:'白い岩壁と入り江の島。北側の砂浜から上陸できるよ。'},
 {id:'wind-island',port:'wind',name:'風見の島',x:430,z:1510,rx:160,rz:135,peak:24,edge:1352,icon:'🌿',description:'風に沿った尾根と森。砂浜から丘へ歩いてみよう。'},
 {id:'tide-island',port:'tide',name:'潮音の島',x:-520,z:2650,rx:220,rz:180,peak:28,edge:2438,icon:'🌊',description:'浜のそばでシュノーケリング。黄色い浮きの内側で、潜って魚をすくおう。'},
 {id:'star-island',port:'star',name:'星凪の島',x:520,z:3300,rx:220,rz:200,peak:32,edge:3064,icon:'🌟',description:'幾重もの峰と深い森が広がる、はるか沖の島。'}
].map(Object.freeze));
export const CHARTED_COAST_ISLANDS=Object.freeze(LEGACY_ISLANDS.map((p,index)=>{
 const x=p.x*30,z=600+(p.z-600)*30,rx=p.rx*8,rz=p.rz*8;
 const shiftX=x-p.x,shiftZ=Math.round((z-rz*.7-p.z)/2)*2;
 return Object.freeze({...p,x,z,rx,rz,peak:[400,610,500,850][index],seed:index+1,shiftX,shiftZ,landingZ:p.z+shiftZ,legacy:p});
}));
export const UNCHARTED_ISLAND=Object.freeze({id:'uncharted-island',port:'uncharted',name:'地図に無い島',x:-27500,z:42000,rx:1500,rz:1250,peak:640,seed:5,landingZ:41100,edge:40952,hidden:true,legacy:null,shiftX:0,shiftZ:0,icon:'◇',description:'波と重さで浮き石が動く、潮の洞窟の島。'});
export const COAST_ISLANDS=Object.freeze([...CHARTED_COAST_ISLANDS,UNCHARTED_ISLAND]);
export const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function legacyIslandHeight(p,x,z){const r=Math.hypot((x-p.x)/p.rx,(z-p.z)/p.rz);return r>=1.6?-Infinity:-4.5+p.peak*(1-smooth(0,.55,r))+9*(1-smooth(.55,.9,r))-Math.max(0,r-.9)*45;}
export function legacyCoastHeight(x,z){const shore=325+28*Math.cos(x/235)+16*Math.sin(x/120),beach=-4.5*smooth(175,shore,z),seabed=z>shore?-(z-shore)*.075:0,dune=Math.abs(x)>330?7*Math.sin(x*.012)**2*smooth(85,-110,z)*(1-smooth(-360,-230,z)):0;let h=beach+seabed+dune;for(const p of LEGACY_ISLANDS)h=Math.max(h,legacyIslandHeight(p,x,z));return h;}
export function legacyIslandAt(x,z){let best=null,d=Infinity;for(const i of CHARTED_COAST_ISLANDS){const p=i.legacy,r=Math.hypot((x-p.x)/(p.rx+190),(z-p.z)/(p.rz+190));if(r<1.5&&r<d){d=r;best=i;}}return best;}
