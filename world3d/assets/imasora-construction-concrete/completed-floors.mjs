import * as T from '../three.module.min.js';
import {completedConcreteGeometry} from './projects.mjs';
import {FLOOR_COLORS,floorPanels} from './floor-parts.mjs';
export function createCompletedFloors(scene){
 const root=new T.Group();root.name='completed-concrete-works';scene.add(root);
 const unit=new T.BoxGeometry(1,1,1),concrete=new T.MeshStandardMaterial({color:'#b8beba',roughness:.85}),scaffold=new T.MeshStandardMaterial({color:'#a99169',roughness:1});let key='';
 const paints=Object.fromEntries(Object.entries(FLOOR_COLORS).map(([name,color])=>[name,new T.MeshStandardMaterial({color,roughness:.85})]));
 const preview=new T.Group();preview.name='concrete-panel-preview';scene.add(preview);
 const ghost=new T.MeshBasicMaterial({color:'#84efc0',wireframe:true});
 function showPreview(floor){
  preview.clear();for(const m of root.children)m.visible=!floor||!m.name.startsWith(`construction-concrete-${floor.floorIndex+1}-`);
  if(!floor)return;
  for(const p of floorPanels(floor)){
   const material=p.color?[concrete,concrete,paints[p.color],concrete,concrete,concrete]:concrete;
   const m=new T.Mesh(unit,material);m.scale.set(16,2,16);m.position.set(p.x,1,p.z);preview.add(m);
   const outline=new T.Mesh(unit,ghost);outline.scale.set(16.1,2.1,16.1);outline.position.copy(m.position);preview.add(outline);
  }
 }
 function sync(project){
  const next=JSON.stringify([project.completedFloors??[],project.freeBuild?.completed??[]]);if(next===key)return;key=next;root.clear();
  for(const g of completedConcreteGeometry(project)){
   const material=g.paint?[concrete,concrete,paints[g.paint],concrete,concrete,concrete]:g.id.endsWith('-floor')?concrete:scaffold;
   const m=new T.Mesh(unit,material);m.name=g.id;const bottom=g.underside??0,thickness=g.height-bottom;m.scale.set(g.size[0],thickness,g.size[1]);m.position.set(g.x,bottom+thickness/2,g.z);m.castShadow=m.receiveShadow=true;root.add(m);
  }
 }
 return{root,sync,showPreview,install(project,surface){sync(project);for(const g of completedConcreteGeometry(project))surface(g);}};
}
