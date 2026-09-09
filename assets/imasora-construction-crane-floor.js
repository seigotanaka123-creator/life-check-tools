import * as THREE from './three.module.min.js';

// Rendering only. The walkable/vehicle ground remains at Y=0 in the physics.
export function createCraneFloor(){
  const root=new THREE.Group();root.name='crane-floor';
  const baseGeometry=new THREE.BoxGeometry(644,8,504);
  // The old box top and the sand plane were BOTH at Y=0. Remove the box's
  // upward-facing triangles, rather than offsetting the physical surface.
  const top=baseGeometry.groups[2],indices=Array.from(baseGeometry.index.array);
  baseGeometry.setIndex(indices.filter((_,i)=>i<top.start||i>=top.start+top.count));
  baseGeometry.clearGroups();
  const base=new THREE.Mesh(baseGeometry,new THREE.MeshStandardMaterial({color:0x87978a,roughness:.85}));
  base.name='crane-floor-sides';base.position.y=-4;base.castShadow=base.receiveShadow=true;root.add(base);

  const material=new THREE.MeshStandardMaterial({color:0xbfb08b,roughness:.85});
  // Paint the grid in the same fragment as the ground: no second depth layer,
  // no one-pixel line primitives that shimmer as the camera moves.
  material.onBeforeCompile=shader=>{
    shader.uniforms.craneGridColor={value:new THREE.Color(0xa79d7e)};
    shader.uniforms.craneGridAxisColor={value:new THREE.Color(0x8c8569)};
    shader.vertexShader='varying vec2 vCraneGroundXZ;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvCraneGroundXZ=vec2(position.x,-position.y);');
    shader.fragmentShader='varying vec2 vCraneGroundXZ;\nuniform vec3 craneGridColor;\nuniform vec3 craneGridAxisColor;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 grid=(vCraneGroundXZ-vec2(60.0,0.0))/12.0;
      vec2 footprint=max(fwidth(grid),vec2(0.00001));
      vec2 edge=abs(fract(grid+0.5)-0.5);
      vec2 lines=1.0-smoothstep(vec2(0.0),footprint,edge);
      // Fade each family separately as its cells become smaller than pixels.
      lines*=1.0-smoothstep(vec2(0.08),vec2(0.30),footprint);
      vec2 axes=1.0-smoothstep(vec2(0.0),footprint,abs(grid));
      float inside=step(abs(grid.x),20.0)*step(abs(grid.y),20.0);
      float axis=max(axes.x,axes.y)*inside;
      float ink=max(lines.x,lines.y)*inside;
      diffuseColor.rgb=mix(diffuseColor.rgb,craneGridColor,ink*0.27);
      diffuseColor.rgb=mix(diffuseColor.rgb,craneGridAxisColor,axis*0.27);
    `);
  };
  material.customProgramCacheKey=()=> 'crane-floor-grid-v435';
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(640,500),material);
  ground.name='crane-floor-surface';ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;root.add(ground);
  return root;
}
