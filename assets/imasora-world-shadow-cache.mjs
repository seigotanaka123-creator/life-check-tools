// Reuse the actual light-space depth map while all visible casters are unchanged.
// This is presentation only: no ground, collision, simulation or save state.
export function createWorldShadowCache({renderer}={}) {
 let previous=[],length=0,index=0,changed=true,valid=false;
 const lights=[],materialKeys=['version','visible','side','shadowSide','alphaTest','opacity','transparent','wireframe','displacementScale','displacementBias'],textureKeys=['map','alphaMap','displacementMap'],cameraKeys=['left','right','top','bottom','near','far','zoom','fov','aspect'];
 const put=value=>{if(index>=length||!Object.is(previous[index],value))changed=true;previous[index++]=value;};
 const matrix=object=>{for(const n of object.matrixWorld.elements)put(n);};
 const material=value=>{put(value);if(!value)return;for(const key of materialKeys)put(value[key]);for(const key of textureKeys){put(value[key]);put(value[key]?.version);}};
 function caster(object,frustum,camera){
  if(!object.visible)return;
  if((object.isMesh||object.isLine||object.isPoints)&&object.castShadow&&object.layers.test(camera.layers)&&(object.frustumCulled===false||frustum.intersectsObject(object))){
   put(object);matrix(object);put(object.geometry);put(object.geometry?.attributes?.position);put(object.geometry?.attributes?.position?.version);put(object.geometry?.index);put(object.geometry?.index?.version);put(object.geometry?.drawRange?.start);put(object.geometry?.drawRange?.count);put(object.count);put(object.instanceMatrix);put(object.instanceMatrix?.version);put(object.customDepthMaterial);put(object.customDepthMaterial?.version);put(object.customDistanceMaterial);put(object.customDistanceMaterial?.version);
   put(object.geometry?.groups?.length);for(const group of object.geometry?.groups??[]){put(group.start);put(group.count);put(group.materialIndex);}
   if(Array.isArray(object.material)){put(object.material.length);for(const m of object.material)material(m);}else material(object.material);
   // Deformation/custom depth uniforms have no complete revision contract.
   // Refresh these rather than reuse a potentially stale silhouette.
   if(object.isSkinnedMesh||object.morphTargetInfluences?.length||object.customDepthMaterial||object.customDistanceMaterial)changed=true;
  }
  for(const child of object.children)caster(child,frustum,camera);
 }
 return {invalidate(){valid=false;},prepare(scene,camera){
  scene.updateMatrixWorld();
  if(!renderer.shadowMap.enabled){valid=false;return false;}
  index=0;changed=!valid||!!renderer.shadowMap.needsUpdate;
  put(renderer.shadowMap.type);put(camera.layers.mask);
  lights.length=0;scene.traverseVisible(object=>{if(object.isLight&&object.castShadow&&object.shadow)lights.push(object);});
  put(lights.length);
  for(const light of lights){
   const shadow=light.shadow;put(light);matrix(light);if(light.target)matrix(light.target);
   put(shadow.mapSize.x);put(shadow.mapSize.y);put(light.distance);put(light.angle);put(shadow.focus);
   // Match the renderer's own shadow-frustum test. An animated object far
   // outside the light's area must not invalidate a stationary area's map.
   shadow.updateMatrices(light);const frustum=shadow.getFrustum();
   for(const key of cameraKeys)put(shadow.camera[key]);
   // Point lights use multiple viewports; keep the normal render path there.
   if(light.isPointLight)changed=true;
   caster(scene,frustum,camera);
   if(shadow.needsUpdate)changed=true;
   shadow.autoUpdate=false;
  }
  if(index!==length)changed=true;previous.length=index;length=index;valid=true;
  renderer.shadowMap.autoUpdate=false;
  renderer.shadowMap.needsUpdate=!!renderer.shadowMap.needsUpdate||changed;
  if(changed)for(const light of lights)light.shadow.needsUpdate=true;
  return changed;
 },render(scene,camera){
  this.prepare(scene,camera);
  // prepare has just updated these same transforms. Do not immediately walk
  // the complete scene tree a second time in WebGLRenderer.render.
  const automatic=scene.matrixWorldAutoUpdate;scene.matrixWorldAutoUpdate=false;
  try{return renderer.render(scene,camera);}finally{scene.matrixWorldAutoUpdate=automatic;}
 }};
}
