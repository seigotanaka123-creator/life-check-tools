import {freeWorkCells} from './free-work-parts.mjs';
// A cured 32 x 32 floor contains four reusable 16 x 16 x 2 panels.
// Storing a panel never returns it as wet concrete or erases its paint.
export const FLOOR_COLORS=Object.freeze({white:'#eee9da',red:'#c66558',yellow:'#d7b64c',green:'#64917b',blue:'#618db7',black:'#42494f'});
export const FLOOR_PARTS=Object.freeze([{x:-8,z:-8,label:'北西'},{x:8,z:-8,label:'北東'},{x:-8,z:8,label:'南西'},{x:8,z:8,label:'南東'}]);
export const floorMask=f=>f.panelMask??15;
export const partCount=mask=>FLOOR_PARTS.reduce((n,_,i)=>n+((mask>>i)&1),0);
export const floorPanels=f=>FLOOR_PARTS.flatMap((p,i)=>(floorMask(f)&(1<<i))?[{x:f.x+p.x,z:f.z+p.z,index:i,color:f.paint?.[i]??null}]:[]);
export const boxesOverlap=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2-1e-6&&Math.abs(a.z-b.z)<(a.d+b.d)/2-1e-6;
export const paintRemaining=(project,ledger)=>(ledger?.quantities?.paintSurfaceCredits??0)-(project.paintUsed??0);
export function floorPanelsProblem(project,floorIndex,position,mask){
 const floors=project.completedFloors??[];
 if(!Number.isInteger(floorIndex)||!floors[floorIndex])return '完成床を選んでください。';
 if(!Number.isSafeInteger(position?.x)||!Number.isSafeInteger(position?.z)||Math.abs(position.x)>2500||Math.abs(position.z)>1600)return '工事現場の内側を選んでください。';
 if(!Number.isInteger(mask)||mask<0||mask>15)return '床の部分を選び直してください。';
 if(!mask)return '';
 const loc=project.location??{x:600,z:1450};
 if(Math.abs(position.x-loc.x)<160&&Math.abs(position.z-loc.z)<160)return '施工中の工房・通路と重なります。少し離してください。';
 const free=project.freeBuild;if(free?.location&&Math.abs(position.x-free.location.x)<164&&Math.abs(position.z-free.location.z)<164)return '自由施工の作業区画と重なります。';
 const panels=floorPanels({...position,panelMask:mask});
 const others=[...floors.flatMap((f,i)=>i===floorIndex?[]:floorPanels(f)),...(free?.completed??[]).flatMap(w=>freeWorkCells(w))];
 if(panels.some(a=>others.some(b=>boxesOverlap({...a,w:16,d:16},{...b,w:16,d:16}))))return 'ほかの完成床と重なります。辺同士を合わせてください。';
 return '';
}
export function paintCost(floor,mask,color){
 if(!Object.hasOwn(FLOOR_COLORS,color))throw Error('INVALID_FLOOR_COLOR');
 if(!Number.isInteger(mask)||mask<1||mask>15||(mask&floorMask(floor))!==mask)throw Error('PAINT_REQUIRES_PLACED_PANELS');
 return FLOOR_PARTS.reduce((n,_,i)=>n+((mask&(1<<i))&&floor.paint?.[i]!==color?4:0),0);
}
