// A construction origin belongs to the work, not to the parked vehicles.
// Old actions retain their old replay semantics; new actions opt in explicitly.
export function rebaseFieldPose(pose, from, to){
 if(!pose||!from||!to||![pose.x,pose.z,from.x,from.z,to.x,to.z].every(Number.isFinite))throw Error('現場の位置を確認できません。');
 return {...pose,x:pose.x+from.x-to.x,z:pose.z+from.z-to.z};
}
export function retainFieldVehicles(f,to){
 const poses=Object.fromEntries(['truck','pump'].map(name=>[name,rebaseFieldPose(f[name],f.location,to)]));
 for(const pose of Object.values(poses))if(Math.abs(to.x+pose.x)>2600||Math.abs(to.z+pose.z)>1700)throw Error('車両が工事現場の外にあります。移動せず停止します。');
 return poses;
}
export function retainsFieldPositions(project){
 const a=project?.operations?.at(-1);
 return !!project?.freeBuild?.parkingCorner||['FREE_NEXT','FREE_CHANGE_EMPTY_SITE'].includes(a?.type)&&a.retainVehicles===true;
}
