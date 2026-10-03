import {freeCell,freePourProblem} from './free-build-state.mjs';

export const FREE_CAST_ACTIONS=new Set(['FREE_BUCKET_LOAD','FREE_POUR','FREE_FINISH']);
export const CAST_PORTS={truck:{x:0,y:24,z:-43},pump:{x:0,y:35,z:-5},inlet:{x:0,y:23,z:-39},supplyInlet:{x:0,y:24,z:-43.5}};
export function castPoint(v,p){const c=Math.cos(v.heading),s=Math.sin(v.heading);return{x:v.x+c*p.x+s*p.z,y:p.y+(v.workY??0),z:v.z-s*p.x+c*p.z};}
export function castingProblem(f,source,cell){
 if(source==='bucket'&&f.height>4&&['framed','wet'].includes(f.stage))return 'この高さはポンプ車から注ぎます。車に乗り、支持脚を出してホースをつないでください。';
 const problem=freePourProblem(f,source,cell);if(problem)return problem;
 if(source==='truck'){
  const port=castPoint(f.truck,CAST_PORTS.truck),c=freeCell(cell),dx=c.x-port.x,dz=c.z-port.z;
  if(-Math.sin(f.truck.heading)*dx-Math.cos(f.truck.heading)*dz<2)return '後部の注ぎ口を型枠に向けて停めてください。';
  if(Math.hypot(dx,dz)>72)return '後部の注ぎ口を型枠に近づけてください。';
 }
 return '';
}
export function finishBands(f){const bands=[];for(let cell=0;cell<16;cell++)if(f.fill[cell]>0)for(let row=0;row<4;row++)bands.push({cell,row});return bands;}
// Exact cross-section of an 8 x 8 x 8 open bucket (one cup = 512).
// During pouring the liquid stays horizontal and meets the low rim.
export function bucketSection(angle,level){
 const c=Math.cos(angle),s=Math.sin(angle),points=[{z:-4,y:-9},{z:4,y:-9},{z:4,y:-1},{z:-4,y:-1}],result=[];
 const height=p=>c*p.y-s*p.z;
 for(let i=0;i<4;i++){const a=points[i],b=points[(i+1)%4],ha=height(a)-level,hb=height(b)-level;if(ha<=0)result.push(a);if((ha<0&&hb>0)||(ha>0&&hb<0)){const t=ha/(ha-hb);result.push({z:a.z+(b.z-a.z)*t,y:a.y+(b.y-a.y)*t});}}
 return result;
}
export function sectionVolume(points){return Math.abs(points.reduce((s,a,i)=>{const b=points[(i+1)%points.length];return s+a.z*b.y-b.z*a.y;},0))*4;}
export function pouringBucket(volume){
 volume=Math.max(0,Math.min(512,volume));let lo=0,hi=Math.PI/2;
 for(let i=0;i<48;i++){const mid=(lo+hi)/2,level=-Math.cos(mid)-4*Math.sin(mid),v=sectionVolume(bucketSection(mid,level));if(v>volume)lo=mid;else hi=mid;}
 const angle=volume===512?0:volume===0?Math.PI/2:(lo+hi)/2,level=-Math.cos(angle)-4*Math.sin(angle);
 return{angle,points:bucketSection(angle,level)};
}
