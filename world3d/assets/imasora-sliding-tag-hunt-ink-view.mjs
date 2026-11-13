import{huntInkTrailSuppressed}from'./imasora-sliding-tag-hunt-cloak-ink.mjs';
import*as T from'./three.module.min.js';
import{INK}from'./imasora-sliding-tag-hunt-items.mjs';
import{worldHeight}from'./imasora-sliding-tag-hunt-world.mjs';

const SOLE_CLEARANCE=.13;
const SOLE_PROBE=.85;

function placeInkSole(matrix,foot){
 const {x,y,z,trampolineSupport}=foot;
 matrix.setPosition(x,y+SOLE_CLEARANCE,z);
 if(trampolineSupport)return;
 const ground=worldHeight(x,z);
 if(Math.abs(ground-y)>.42)return;
 const west=worldHeight(x-SOLE_PROBE,z),east=worldHeight(x+SOLE_PROBE,z);
 const north=worldHeight(x,z-SOLE_PROBE),south=worldHeight(x,z+SOLE_PROBE);
 // Keep a stair lip from tilting the mark off its tread.
 if(Math.abs((west+east)/2-ground)>.035||Math.abs((north+south)/2-ground)>.035)return;
 const slopeX=(east-west)/(2*SOLE_PROBE),slopeZ=(south-north)/(2*SOLE_PROBE);
 if(Math.hypot(slopeX,slopeZ)<.015)return;
 const basis=matrix.elements;
 basis[1]=basis[0]*slopeX+basis[2]*slopeZ;
 basis[9]=basis[8]*slopeX+basis[10]*slopeZ;
 matrix.setPosition(x,ground+SOLE_CLEARANCE,z);
}

export function createHuntInkView(scene){
 const sole=new T.Shape();sole.moveTo(-.3,-.55);sole.bezierCurveTo(-.5,-.1,-.36,.55,-.03,.48);sole.bezierCurveTo(.34,.42,.31,.1,.22,-.13);sole.bezierCurveTo(.12,-.4,.13,-.63,-.3,-.55);const shapes=[sole];for(const[x,y,r]of[[-.26,.68,.16],[.02,.66,.12],[.22,.59,.1],[.35,.45,.08]]){const toe=new T.Shape();toe.absarc(x,y,r,0,Math.PI*2,false);shapes.push(toe);}
 const geometry=new T.ShapeGeometry(shapes,8).rotateX(-Math.PI/2).rotateY(Math.PI),material=new T.MeshStandardMaterial({color:0xa58bd4,emissive:0x513c74,emissiveIntensity:.1,side:T.DoubleSide}),feet=new T.InstancedMesh(geometry,material,INK.maxFootprints),matrix=new T.Matrix4(),rotation=new T.Matrix4();
 feet.name='runner-ink-footprints';feet.count=0;feet.visible=false;feet.frustumCulled=false;feet.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(feet);
 const matrices=feet.instanceMatrix;
 // The first GPU allocation sends the full buffer. Drop its pending range too.
 matrices.onUpload(()=>matrices.clearUpdateRanges());
 // Cache only the five values that affect a visible sole, never round objects.
 // New replay arrays can contain identical rows; identity alone is not enough.
 const cached=new Float64Array(INK.maxFootprints*5);let previousCount=0,matrixWrites=0,uploadRequests=0;
 return{update(s){
  let n=0,firstChanged=Infinity,lastChanged=-1;
  for(const f of s.footprints){
   if(n===INK.maxFootprints)break;
   if(f.owner!=='player')continue;
   const at=n*5,side=f.id%2?-1:1,yaw=f.yaw??0;
   const soleKey=side*(f.trampolineSupport?2:1);
   if(n>=previousCount||!Object.is(cached[at],f.x)||!Object.is(cached[at+1],f.y)||!Object.is(cached[at+2],f.z)||!Object.is(cached[at+3],yaw)||cached[at+4]!==soleKey){
    matrix.makeScale(side,1,1);
    rotation.makeRotationY(yaw);
    matrix.premultiply(rotation);
    placeInkSole(matrix,f);
    feet.setMatrixAt(n,matrix);
    cached[at]=f.x;cached[at+1]=f.y;cached[at+2]=f.z;cached[at+3]=yaw;cached[at+4]=soleKey;
    matrixWrites++;
    firstChanged=Math.min(firstChanged,n);
    lastChanged=n;
   }
   n++;
  }
  previousCount=n;
  feet.count=n;
  feet.visible=n>0&&!huntInkTrailSuppressed(s);
  if(lastChanged>=0){
   let start=firstChanged*matrices.itemSize,end=(lastChanged+1)*matrices.itemSize;
   const pending=matrices.updateRanges[0];
   if(pending){
    start=Math.min(start,pending.start);
    end=Math.max(end,pending.start+pending.count);
    matrices.clearUpdateRanges();
   }
   matrices.addUpdateRange(start,end-start);
   matrices.needsUpdate=true;
   uploadRequests++;
  }
 },stats(){return{footprints:feet.count,capacity:INK.maxFootprints,footprintDrawCalls:feet.visible?1:0,poolMeshes:0,matrixWrites,uploadRequests,cacheBytes:cached.byteLength};},dispose(){scene.remove(feet);feet.dispose();geometry.dispose();material.dispose();}};
}
