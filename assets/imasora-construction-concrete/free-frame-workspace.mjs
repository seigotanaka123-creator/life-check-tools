import {constructionBase} from './free-supported-build.mjs';
import {freeCell} from './free-build-state.mjs';
import {freePlacedFill} from './free-work-parts.mjs';
import {pointBoxDistance} from './free-route-clearance.mjs';

// Stand beside the work, below its top edge. Never roof over the formwork.
export const frameDeckHeight=f=>constructionBase(f)+.8;
export function frameWorkBoxes(f){
 const boxes=[];for(let i=0;i<16;i++)if(f.mask&(1<<i))boxes.push({...freeCell(i),hx:8.75,hz:8.75});
 for(const w of f.completed)for(let i=0;i<16;i++)if(freePlacedFill(w,i)){const c=freeCell(i);boxes.push({x:w.x-f.location.x+c.x,z:w.z-f.location.z+c.z,hx:8.75,hz:8.75});}
 return boxes;
}
export const frameWorkspaceBlocked=(boxes,p,radius=13)=>boxes.some(b=>pointBoxDistance(p,b)<radius-1e-7);
export function frameExterior(f){
 const open=new Set(),queue=[[-1,-1]],key=(x,z)=>x+','+z;open.add(key(-1,-1));
 for(let i=0;i<queue.length;i++){const[x,z]=queue[i];for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=z+dz,k=key(a,b);if(a<-1||a>4||b<-1||b>4||open.has(k)||a>=0&&a<4&&b>=0&&b<4&&(f.mask&(1<<(b*4+a))))continue;open.add(k);queue.push([a,b]);}}
 return p=>p.x<=-32||p.x>=32||p.z<=-32||p.z>=32||open.has(key(Math.floor((p.x+32)/16),Math.floor((p.z+32)/16)));
}
