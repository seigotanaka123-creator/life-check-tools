import * as T from './three.module.min.js';
// Camera checks run on visible solid models, never on label sprites or hidden
// assembly copies. Sprites need a screen camera and are not physical blockers.
export function entranceDoorCameraYaw(scene,turn,focus,pitch,distance,controlledActor=null){
 scene.updateMatrixWorld(true);const ignored=new Set();controlledActor?.traverse(o=>ignored.add(o));const meshes=[];scene.traverseVisible(o=>{if(o.isMesh&&!ignored.has(o))meshes.push(o);});
 for(const offset of[-.55,.55,-.8,.8,-1,1,0]){const yaw=turn*Math.PI/2+offset,end=new T.Vector3(focus.x+Math.sin(yaw)*distance*Math.cos(pitch),focus.y+Math.sin(pitch)*distance,focus.z+Math.cos(yaw)*distance*Math.cos(pitch)),start=new T.Vector3(focus.x,focus.y,focus.z),delta=end.clone().sub(start),ray=new T.Raycaster(start,delta.clone().normalize(),2,delta.length()-2);if(!ray.intersectObjects(meshes,false).length)return yaw;}
 return turn*Math.PI/2-.55;
}

