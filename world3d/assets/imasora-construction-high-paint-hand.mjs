import * as T from './three.module.min.js';
import {createActiveWorkClock} from './imasora-construction-concrete/active-work-clock.mjs';
import {upperPaintToolPaths} from './imasora-construction-high-paint-path.mjs?v=120gn';
import {upperPaintPatch,upperPaintPlan} from './imasora-construction-concrete/high-paint.mjs?v=120fn';
import {upperPaintWorld} from './imasora-construction-high-paint-view.mjs?v=120fn';
import {paintColor} from './imasora-construction-concrete/paint-colors.mjs';
export function createUpperPaintMotion(scene,character,record,c,a,view,{now}={}){
 character.updateMatrixWorld(true);const hand=character.userData.hands?.at(-1)?.getWorldPosition(new T.Vector3());if(!hand)throw Error('道具を持つ手をたしかめよう。');
 const plan=upperPaintPlan(c,a),paths=upperPaintToolPaths(record,c,a,hand),root=new T.Group();root.name='upper-worker-paint-tool';scene.add(root);
 const rodGeo=new T.CylinderGeometry(.25,.25,1,8),rollerGeo=a.tool==='roller'?new T.CylinderGeometry(.7,.7,2,12):new T.BoxGeometry(1.2,.35,1.1),metal=new T.MeshStandardMaterial({color:'#d6e0e4'}),paint=new T.MeshStandardMaterial({color:paintColor(a.color)??'#ece4cc'}),roller=new T.Mesh(rollerGeo,paint);root.add(roller);
 const max=Math.max(...[...paths.values()].map(p=>p.length)),rods=Array.from({length:max},()=>{const m=new T.Mesh(rodGeo,metal);root.add(m);return m;}),clock=createActiveWorkClock(now),marks=a.tiles.flatMap(cell=>a.pixels.map(pixel=>({cell,pixel}))),duration=Math.min(12,2.8+a.tiles.length*.35+a.pixels.length*.07);let elapsed=0,success=false;
 view.begin(c,plan.changes);
 return{get paintProgress(){return Math.max(0,Math.min(1,(elapsed/duration-.15)/.7));},tick(){elapsed=Math.min(duration,elapsed+clock.step(true)/1000);const t=elapsed/duration,progress=Math.max(0,Math.min(1,(t-.15)/.7)),mark=marks[Math.min(marks.length-1,Math.floor(progress*marks.length))],patch=upperPaintPatch(c,mark.cell,a.face,mark.pixel),target=upperPaintWorld(c,patch.center),path=paths.get(mark.cell).slice(0,-2),outside=upperPaintWorld(c,{x:patch.center.x+patch.normal.x*2,y:patch.center.y+patch.normal.y*2,z:patch.center.z+patch.normal.z*2});path.push({...outside,y:c.anchor.y+30},outside,target);
  root.visible=t>=.15&&t<=.85;for(let i=0;i<rods.length;i++){const m=rods[i];m.visible=root.visible&&i<path.length-1;if(!m.visible)continue;const p=path[i],q=path[i+1],d=new T.Vector3(q.x-p.x,q.y-p.y,q.z-p.z);m.position.set((p.x+q.x)/2,(p.y+q.y)/2,(p.z+q.z)/2);m.scale.y=d.length();m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());}
  roller.position.set(target.x,target.y,target.z);const n=new T.Vector3(patch.normal.x,patch.normal.y,patch.normal.z).applyAxisAngle(new T.Vector3(0,1,0),c.anchor.turn*Math.PI/2);roller.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),n);roller.rotateZ(elapsed*4);view.drawProgress(progress);return elapsed===duration;
 },commit(){success=true;view.finish(true);},dispose(){if(!success)view.finish(false);root.removeFromParent();rodGeo.dispose();rollerGeo.dispose();metal.dispose();paint.dispose();}};
}
