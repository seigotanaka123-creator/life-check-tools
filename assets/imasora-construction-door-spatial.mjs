// Broad phase only: candidate colliders still use the world's exact contact test.
export function doorSpatialIndex(items,margin=40,cell=96){
 const grid=new Map(),wide=[];
 for(const item of items){
  const p=item.polygon,box=p?.length?{minX:Math.min(...p.map(v=>v.x)),maxX:Math.max(...p.map(v=>v.x)),minZ:Math.min(...p.map(v=>v.z)),maxZ:Math.max(...p.map(v=>v.z))}:{minX:item.x-item.halfX,maxX:item.x+item.halfX,minZ:item.z-item.halfZ,maxZ:item.z+item.halfZ};
  if(!Object.values(box).every(Number.isFinite)){wide.push(item);continue;}
  const a=Math.floor((box.minX-margin)/cell),b=Math.floor((box.maxX+margin)/cell),c=Math.floor((box.minZ-margin)/cell),d=Math.floor((box.maxZ+margin)/cell);
  if((b-a+1)*(d-c+1)>4096){wide.push(item);continue;}
  for(let x=a;x<=b;x++)for(let z=c;z<=d;z++){const key=x+','+z,list=grid.get(key)??[];list.push(item);grid.set(key,list);}
 }
 return p=>[...(grid.get(Math.floor(p.x/cell)+','+Math.floor(p.z/cell))??[]),...wide];
}
