// Adapt live authored timber and Mars-soil collision geometry to the
// excavation's local pedestrian solver. Carry only physical slabs and edges.
const finite=(...values)=>values.every(Number.isFinite);
const MATERIALS=new Set(['construction-timber','construction-soil','construction-concrete']);
const displayName=id=>id==='construction-timber'?'木材':id==='construction-concrete'?'コンクリート':'火星土';

export function constructionMaterialContactVolumes(origin,geometry={}){
  if(!Array.isArray(origin)||origin.length!==2||!finite(...origin))return[];
  const [originX,originZ]=origin,out=[];
  for(const surface of Array.isArray(geometry.floors)?geometry.floors:[]){
    const material=surface?.buildingId,id=String(surface?.id||'');
    if(!MATERIALS.has(material)||!id.startsWith(`${material}-`))continue;
    const {x,z,rotation=0,height}=surface,halfX=surface.localHalfX??surface.halfX,halfZ=surface.localHalfZ??surface.halfZ,underside=Number.isFinite(surface.underside)?surface.underside:0;
    if(!finite(x,z,rotation,halfX,halfZ,underside,height)||halfX<=0||halfZ<=0||height<=underside)continue;
    out.push({name:`${displayName(material)}の床:${id}`,x:x-originX,y:underside,z:z-originZ,w:halfX*2,h:height-underside,d:halfZ*2,angle:rotation,step:true});
  }
  for(const edge of Array.isArray(geometry.walls)?geometry.walls:[]){
    const material=edge?.buildingId,id=String(edge?.id||'');
    if(!MATERIALS.has(material)||edge.surfaceEdge!==true||!id.startsWith(`${material}-`))continue;
    const {x,z,rotation=0,localHalfX,localHalfZ,minY,maxY,stepAdjacent}=edge;
    if(!finite(x,z,rotation,localHalfX,localHalfZ,minY,maxY)||localHalfX<=0||localHalfZ<=0||maxY<=minY)continue;
    out.push({name:`${displayName(material)}の縁:${id}`,x:x-originX,y:minY,z:z-originZ,w:localHalfX*2,h:maxY-minY,d:localHalfZ*2,angle:rotation,step:stepAdjacent===true});
  }
  return out;
}
