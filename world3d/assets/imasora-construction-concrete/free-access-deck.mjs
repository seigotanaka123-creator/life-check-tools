// One geometry definition for rendered access plates and their walking support.
// Access runs are axis-aligned; diagonal shortcuts cannot supply an unseen floor.
export function accessDeckPlates(path){
 const plates=path.map(p=>({x:p.x,z:p.z,width:2*(p.halfX??13),depth:2*(p.halfZ??13)}));
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],dx=b.x-a.x,dz=b.z-a.z;
  if(Math.abs(dx)>1e-8&&Math.abs(dz)>1e-8)throw Error('踊り場の通路は東西・南北に接続してください。');
  if(Math.abs(dx)>1e-8)plates.push({x:(a.x+b.x)/2,z:a.z,width:Math.abs(dx),depth:26});
  else if(Math.abs(dz)>1e-8)plates.push({x:a.x,z:(a.z+b.z)/2,width:26,depth:Math.abs(dz)});
 }
 return plates;
}
export function accessDeckContains(plan,x,z){return accessDeckPlates(plan.path).some(p=>Math.abs(x-p.x)<=p.width/2+1e-8&&Math.abs(z-p.z)<=p.depth/2+1e-8);}
