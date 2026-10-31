import * as T from './three.module.min.js';

// Subdivide an already authored grid into nine independently culled patches.
// Copy existing samples (including normals, colours and UVs), never resample
// heights or recompute edge normals. Animated water gets a wave-height margin.
export function splitCoastSurface(mesh,columns,rows,{geometries,padding=0}={}) {
 const source=mesh.geometry,patches=[],stepX=Math.ceil(columns/3),stepY=Math.ceil(rows/3);
 if(source.attributes.position.count!==(columns+1)*(rows+1)||source.index?.count!==columns*rows*6)throw Error('Coast grid dimensions do not match');
 for(let y=0;y<rows;y+=stepY)for(let x=0;x<columns;x+=stepX){
  const width=Math.min(stepX,columns-x),height=Math.min(stepY,rows-y),geometry=new T.BufferGeometry();
  for(const[name,a]of Object.entries(source.attributes)){
   const data=new a.array.constructor((width+1)*(height+1)*a.itemSize);
   for(let r=0;r<=height;r++){const begin=((y+r)*(columns+1)+x)*a.itemSize;data.set(a.array.subarray(begin,begin+(width+1)*a.itemSize),r*(width+1)*a.itemSize);}
   geometry.setAttribute(name,new T.BufferAttribute(data,a.itemSize,a.normalized));
  }
  const index=[];for(let r=0;r<height;r++)for(let c=0;c<width;c++)for(let k=0;k<6;k++){const old=source.index.getX(((y+r)*columns+x+c)*6+k),ox=old%(columns+1),oy=Math.floor(old/(columns+1));index.push((oy-y)*(width+1)+ox-x);}
  geometry.setIndex(index);geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.boundingBox.expandByScalar(padding);geometry.boundingSphere.radius+=padding;geometries?.add(geometry);
  const patch=new T.Mesh(geometry,mesh.material);patch.name=mesh.name;patch.position.copy(mesh.position);patch.quaternion.copy(mesh.quaternion);patch.scale.copy(mesh.scale);patch.receiveShadow=mesh.receiveShadow;patch.castShadow=mesh.castShadow;patch.renderOrder=mesh.renderOrder;patch.layers.mask=mesh.layers.mask;patch.updateMatrix();patch.matrixAutoUpdate=false;mesh.parent.add(patch);patches.push(patch);
 }
 mesh.removeFromParent();source.dispose();geometries?.delete(source);return patches;
}

// Only explicitly supplied, opaque scenery is baked. Named landmark groups,
// animated objects, gameplay bodies and collision records keep their identities.
// Spatial tiles preserve useful culling instead of one coast-wide draw.
export function batchCoastScenery(root, objects, {tileSize=360, exclude=new Set(), geometries}={}) {
 root.updateWorldMatrix(true,true);
 const inverse=new T.Matrix4().copy(root.matrixWorld).invert(),matrix=new T.Matrix4(),normal=new T.Matrix3(),v=new T.Vector3(),groups=new Map();
 for(const o of objects){
  if(exclude.has(o)||!o.isMesh||o.isInstancedMesh||o.children.length||!o.visible||Array.isArray(o.material)||o.material.transparent||o.material.isShaderMaterial||o.geometry.morphAttributes.position)continue;
  const geo=o.geometry;if(!geo.index||!geo.attributes.position||!geo.attributes.normal||!geo.attributes.uv||Object.keys(geo.attributes).length!==3)continue;
  matrix.multiplyMatrices(inverse,o.matrixWorld);v.setFromMatrixPosition(matrix);
  const key=[o.material.uuid,Math.floor(v.x/tileSize),Math.floor(v.z/tileSize),o.castShadow,o.receiveShadow,o.renderOrder,o.layers.mask].join(':');
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push({object:o,matrix:matrix.clone()});
 }
 const batches=[];let sourceCount=0;
 for(const rows of groups.values()){
  if(rows.length<2)continue;
  const first=rows[0].object,count=rows.reduce((n,r)=>n+r.object.geometry.attributes.position.count,0),indices=rows.reduce((n,r)=>n+r.object.geometry.index.count,0);
  const positions=new Float32Array(count*3),normals=new Float32Array(count*3),uvs=new Float32Array(count*2),index=new (count>65535?Uint32Array:Uint16Array)(indices);
  let vertex=0,entry=0;
  for(const row of rows){
   const g=row.object.geometry,{position:p,normal:n,uv}=g.attributes;normal.getNormalMatrix(row.matrix);
   for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(row.matrix).toArray(positions,(vertex+i)*3);v.fromBufferAttribute(n,i).applyMatrix3(normal).normalize().toArray(normals,(vertex+i)*3);uvs[(vertex+i)*2]=uv.getX(i);uvs[(vertex+i)*2+1]=uv.getY(i);}
   for(let i=0;i<g.index.count;i++)index[entry++]=vertex+g.index.getX(i);vertex+=p.count;
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('normal',new T.BufferAttribute(normals,3));geometry.setAttribute('uv',new T.BufferAttribute(uvs,2));geometry.setIndex(new T.BufferAttribute(index,1));geometry.computeBoundingBox();geometry.computeBoundingSphere();geometries?.add(geometry);
  const mesh=new T.Mesh(geometry,first.material);mesh.name='海岸の景色';mesh.castShadow=first.castShadow;mesh.receiveShadow=first.receiveShadow;mesh.renderOrder=first.renderOrder;mesh.layers.mask=first.layers.mask;mesh.matrixAutoUpdate=false;root.add(mesh);batches.push(mesh);
  for(const {object} of rows)object.removeFromParent();sourceCount+=rows.length;
 }
 // Dispose only geometries no longer referenced anywhere in the live scene.
 const live=new Set();root.traverse(o=>{if(o.geometry)live.add(o.geometry);});
 for(const g of [...(geometries??[])])if(!live.has(g)){g.dispose();geometries.delete(g);}
 return {sourceCount,batches};
}
