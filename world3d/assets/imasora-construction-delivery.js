// Main-world receiving dock: no inventory copy, grant, or development-save import.
export const DELIVERY_SITES=Object.freeze([[-156,-112],[-210,-115],[-300,-105],[-350,-100]].map(Object.freeze));
export const DELIVERY_SIZE=Object.freeze([38,34,22]);
export function deliveryAccess(context){
  const site=DELIVERY_SITES[context?.siteIndex],p=context?.position;
  if(context?.map!=='construction'||context?.aboard!==false||!site||!p
    || ![p.x,p.y,p.z].every(Number.isFinite)||Math.abs(p.y)>.5)return false;
  // Walk to the front of the counter; no remote receipt from another map/vehicle.
  return Math.abs(p.x-site[0])<=32&&p.z-site[1]>=14&&p.z-site[1]<=48;
}
export function chooseDeliverySite(blocked){
  // Clear the full counter plus the approach, including character radius.
  return DELIVERY_SITES.findIndex(([x,z])=>!blocked(x,z+16,66));
}
