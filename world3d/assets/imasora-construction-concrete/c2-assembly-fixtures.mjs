import * as T from '../three.module.min.js';
import {FRAME_PANELS,SUPPLY} from './c2-tool-contact.mjs';

export function createAssemblyFixtures({unit,wood,wet,metal}){
 const root=new T.Group(),frame=new T.Group(),tank=new T.Group();root.add(frame,tank);
 const box=(parent,x,y,z,w,h,d,material)=>{const m=new T.Mesh(unit,material);m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 const boards=[],stakes=[];
 for(const p of FRAME_PANELS){boards.push(box(frame,p.x,1,p.z,p.w,2,p.d,wood));stakes.push(box(frame,p.x-Math.sin(p.heading)*.95,1.6,p.z-Math.cos(p.heading)*.95,.9,3.2,.9,wood));}
 tank.position.x=54;
 for(const x of[-7.5,7.5])for(const z of[-7.5,7.5])box(tank,x,5,z,.7,10,.7,metal);
 box(tank,0,9.8,0,16.6,.4,16.6,metal);
 const glass=new T.MeshStandardMaterial({color:'#799f98',transparent:true,opacity:.22,roughness:.5,depthWrite:false});
 for(const s of[-1,1]){box(tank,s*8.2,18,0,.4,16,16.8,glass);box(tank,0,18,s*8.2,16,16,.4,glass);}
 const material=box(tank,0,18,0,16,16,16,wet);
 box(tank,0,11,11.5,.8,.8,7,metal);box(tank,0,10.75,15,.8,.5,.8,metal);
 const lever=new T.Group();lever.position.set(4,13,14);tank.add(lever);box(lever,0,0,0,3,.5,.5,wood);box(tank,4,11.5,14,.6,3,.6,metal);
 // Eight cups in the visible working tank; extra concrete stays in storage.
 // Do not give an empty / almost empty tank an artificial minimum thickness:
 // the last bucket is checked against the actual rendered remaining volume.
 function supply(cells,opening=0){const height=Math.max(0,Math.min(8,cells))*512/SUPPLY.area;material.visible=height>0;material.scale.y=height;material.position.y=SUPPLY.bottom+height/2;lever.rotation.z=opening*-.7;}
 function sync(state){const framed=state.formworkPanelsInUse>0;frame.visible=framed;boards.forEach(b=>{b.visible=true;b.position.y=1;});stakes.forEach(s=>s.visible=true);supply(state.availableConcreteCells);}
 function previewFrame(panelId,pose,completed){frame.visible=true;boards.forEach((b,i)=>{b.visible=completed.has(i)||i===panelId;b.position.y=i===panelId?pose.panelY:1;});stakes.forEach((s,i)=>s.visible=completed.has(i)||i===panelId&&pose.settled);}
 return{root,sync,supply,previewFrame,stakeTop:id=>stakes[id].localToWorld(new T.Vector3(0,.5,0)),leverGrip:()=>lever.localToWorld(new T.Vector3(0,0,0)),fillSurface:()=>material.position.y+material.scale.y/2};
}
