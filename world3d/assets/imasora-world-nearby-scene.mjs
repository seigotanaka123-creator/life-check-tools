import * as T from './three.module.min.js';
const facilityHelp={
 'water-supply':['給水口','給水車を水色の区画へ。給水口に合わせると水を汲めます。余った水もここへ戻せます。'],
 'soil-supply':['アマネ星土の補給口','ローダーを受け口に合わせて土を積めます。広げた土も回収して、ここへ戻せます。'],
 'timber-stock':['木材の出庫・回収枠','木材作業で「床板を1枚出す」か「角材4本の束を出す」を選びます。返す木材はクレーンで枠の中央へ。'],
 'earth-storage':['土の保管庫','ダンプの荷台を箱に向けて後退し、土を下ろしましょう。預けた土は、降りて「土でつくる」で使えます。'],
};
// Keep references to actual moving models; never use initial parking coordinates.
export function nearbySceneObjects(scene,mapGroup) {
 const targets=[];
 mapGroup.traverse(o=>{if(o.userData.nearbyName){const meta=o.userData.nearbyName;targets.push({object:o,...meta,anchor:localNameAnchor(o,meta)});}});
 const yard=name=>mapGroup.getObjectByName(name);
 const water=yard('construction-world-water-yard'),soil=yard('construction-world-soil-yard'),timber=yard('construction-world-timber-yard');
 const excavation=yard('construction-transport-yard')??yard('construction-excavation-yard'),concrete=scene.getObjectByName('free-concrete-workshop');
 for(const [id,object,hx,hz,height] of [
  ['water-supply',water?.userData.sourceWater?.parent,36,27,60],
  ['soil-supply',soil?.userData.store,23,22,20],
  ['timber-stock',timber?.userData.stockPad,42,36,18],
  ['earth-storage',excavation?.userData.stockBin,32,24,10],
 ]){
  if(!object)continue;
  const [name,guide]=facilityHelp[id];
  targets.push({id:'facility:'+id,name,guide,object,hx,hz,height,kind:'facility'});
 }
 for(const [id,name,object,hx,hz] of [
  ['water','給水車',water?.userData.loader,36,50],['soil','アマネ星土ローダー',soil?.userData.loader,36,50],
  ['crane','クレーン車',timber?.userData.crane,36,50],
  ['truck','ミキサー車',concrete?.getObjectByName('concrete-truck'),34,66],['pump','ポンプ車',concrete?.getObjectByName('concrete-pump'),34,66],
 ])if(object)targets.push({id:'vehicle:'+id,name,object,hx,hz,height:55,kind:'vehicle'});
 // Legacy excavation contains a hidden old model beside the live one. Keep
 // both references and filter effective visibility on each read.
 mapGroup.traverse(object=>{const spec={'ショベルカー':['excavator','ショベルカー',38,62],'dump-truck':['dump','ダンプカー',36,68]}[object.name];if(spec)targets.push({id:'vehicle:'+spec[0],name:spec[1],object,hx:spec[2],hz:spec[3],height:55,kind:'vehicle'});});
 for(const t of targets){if(t.kind!=='vehicle')continue;const roof=t.object.userData.roof??t.object.userData.upper?.userData.roof??t.object.getObjectByName('cab');if(roof){t.anchorObject=roof;t.anchor=localNameAnchor(roof,{height:0});}}
 return targets;
}
const point=new T.Vector3(),rotation=new T.Quaternion(),scale=new T.Vector3(),forward=new T.Vector3();
// Measure fixed buildings once, including their roof, rather than use the wall
// height. Hidden mission scenes and sprites do not enlarge the bounds.
export function localNameAnchor(object,meta) {
 if(meta.kind==='vehicle')return [0,meta.height+8,0];
 object.updateWorldMatrix(true,true);const inverse=object.matrixWorld.clone().invert(),bounds=new T.Box3(),matrix=new T.Matrix4();
 object.traverse(mesh=>{if(!mesh.isMesh||!mesh.geometry)return;let o=mesh;while(o&&o!==object){if(!o.visible)return;o=o.parent;}mesh.geometry.computeBoundingBox();if(mesh.geometry.boundingBox){matrix.multiplyMatrices(inverse,mesh.matrixWorld);bounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(matrix));}});
 if(bounds.isEmpty())return [0,meta.height+8,0];
 return [(bounds.min.x+bounds.max.x)/2,bounds.max.y+5,(bounds.min.z+bounds.max.z)/2];
}
export function readNearbySceneTargets(objects,scene) {
 return objects.flatMap(t=>{
  let p=t.object;while(p&&p!==scene){if(!p.visible)return [];p=p.parent;}if(p!==scene)return [];
  t.object.updateWorldMatrix(true,false);t.object.matrixWorld.decompose(point,rotation,scale);
  forward.set(0,0,1).applyQuaternion(rotation);
  const anchorObject=t.anchorObject??t.object;anchorObject.updateWorldMatrix(true,false);
  const anchor=new T.Vector3(...(t.anchor??[0,t.height+8,0])).applyMatrix4(anchorObject.matrixWorld);
  const height=t.height*Math.abs(scale.y);
  const enterDistance=t.kind==='vehicle'?110:t.kind==='facility'?125:Math.max(80,Math.min(170,height*.95));
  return [{id:t.id,name:t.name,kind:t.kind||'building',guide:t.guide,x:point.x,y:point.y,z:point.z,heading:Math.atan2(forward.x,forward.z),hx:t.hx*Math.abs(scale.x),hz:t.hz*Math.abs(scale.z),minY:point.y,maxY:point.y+height,enterDistance,labelAnchor:anchor.toArray()}];
 });
}
