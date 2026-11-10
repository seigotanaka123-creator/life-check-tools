// Face-only styling. Original eyes remain the first two faceFeatures for cameras, blinking and sunglasses.
export function applyMonsterExpression360(THREE,model,id,{surfaceZ}={}){
 const api=globalThis.ImasoraMonsterExpressions,row=api?.get(id),p=api?.style(row);
 const eyes=model.userData.faceFeatures?.slice(0,2);if(eyes?.length!==2)return model;
 for(const eye of eyes)eye.scale.y=eye.scale.x;
 if(!p||model.userData.baseExpression?.sourceVersion===api.version)return model;
 const sorted=[...eyes].sort((a,b)=>a.position.x-b.position.x),centerX=(sorted[0].position.x+sorted[1].position.x)/2,eyeY=(sorted[0].position.y+sorted[1].position.y)/2,gap=sorted[1].position.x-sorted[0].position.x;if(!(gap>0))return model;
 // The old front band on trail-shaped young forms crosses the new mouth and reads as a second mouth.
 // Replace it along with the old sprout mouth only when a reviewed new expression is present.
 const dark=eyes[0].material,parts=[];for(const child of [...model.children])if(child.name==='eye-highlight'||child.name==='little-mouth'||child.name==='trail-scarf'){model.remove(child);child.geometry?.dispose();if(child.material!==dark)child.material?.dispose();}
 const front=(x,y)=>Number.isFinite(surfaceZ?.(x,y))?surfaceZ(x,y):Math.max(...eyes.map(e=>e.position.z))+.2;
 // Both face lines follow the actual body mesh. Mouth radii and their 2D outlines stay unchanged.
 model.updateMatrixWorld(true);const body=model.userData.body,bodyBounds=body?new THREE.Box3().setFromObject(body).applyMatrix4(model.matrixWorld.clone().invert()):null,probe=new THREE.Raycaster(),probeDirection=new THREE.Vector3(0,0,-1).transformDirection(model.matrixWorld);
 const faceSurface=(x,y)=>{if(!bodyBounds)return front(x,y);probe.set(model.localToWorld(new THREE.Vector3(x,y,bodyBounds.max.z+gap*2)),probeDirection);const hit=probe.intersectObject(body,false)[0];return hit?model.worldToLocal(hit.point.clone()).z:front(x,y);};
 const faceInk=new THREE.MeshBasicMaterial({color:dark.color,toneMapped:false});
 const curve=(name,points,radius,material=faceInk)=>{const plan=new THREE.CatmullRomCurve3(points.map(([x,y])=>new THREE.Vector3(x,y,0))).getPoints(32),positions=plan.map(({x,y})=>new THREE.Vector3(x,y,faceSurface(x,y)+radius*1.18+.04)),mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(positions),64,radius,8,false),material);mesh.name=name;mesh.renderOrder=4;model.add(mesh);parts.push(mesh);return mesh;};
 const glintMaterial=new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false});
 const browMaterial=p.brow?faceInk:null;
 for(const[side,eye]of[[-1,sorted[0]],[1,sorted[1]]]){const base=eye.scale.clone();eye.scale.x=base.x;eye.scale.y=base.x;eye.rotation.z=side*p.tilt;
  const highlight=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),glintMaterial);highlight.name='base-expression-glint';highlight.position.set(-.22,.28,.97);highlight.scale.set(p.glint,p.glint,.12);eye.add(highlight);parts.push(highlight);
  if(p.brow){const half=base.x*.96,y=eye.position.y+eye.scale.y+gap*.12,slope=side*p.browTilt;curve(side<0?'base-expression-brow-left':'base-expression-brow-right',[[-half,y-half*slope],[0,y+gap*.05],[half,y+half*slope]].map(([x,py])=>[eye.position.x+x,py]),gap*(.008+p.brow*.00135),browMaterial);}
 }
 const cape=model.userData.decorationType==='forest',w=gap*p.mouthWidth;let y=eyeY-gap*(cape?.10:.28),mouthDepth=gap*p.smile*(cape?.65:1);
 const clasp=model.userData.capeClasp??model.userData.capeFastener?.userData?.clasp;
 if(cape&&clasp){model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(clasp).applyMatrix4(model.matrixWorld.clone().invert()),clearance=bounds.max.y+gap*(.035+.018),ceiling=eyeY-gap*.015;y=Math.min(ceiling,Math.max(y,clearance+mouthDepth));mouthDepth=Math.min(mouthDepth,Math.max(gap*.006,y-clearance));}
 if(p.kind==='curious'){const points=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI*2;points.push([centerX+Math.cos(a)*w*.55,y+Math.sin(a)*w*.68]);}curve('base-expression-mouth',points,gap*.018);}
 else{const points=[];for(let i=0;i<=8;i++){const t=i/8;points.push([centerX+(t*2-1)*w,y-4*t*(1-t)*mouthDepth]);}curve('base-expression-mouth',points,gap*.0155);}
 model.userData.baseExpression={id:row.id,kind:row.kind,label:row.label,catchphrase:row.catchphrase,strength:row.strength,sourceVersion:api.version};model.userData.expressionParts=parts;return model;
}
