import * as THREE from './three.module.min.js';

export function constructionGroundRegions(config) {
  const w = config.world.width / 2, d = config.world.depth / 2;
  const cw = (config.world.layoutWidth ?? config.world.width) / 2;
  const cd = (config.world.layoutDepth ?? config.world.depth) / 2;
  return [
    { id: 'original', minX: -cw, maxX: cw, minZ: -cd, maxZ: cd },
    { id: 'west', minX: -w, maxX: -cw, minZ: -d, maxZ: d },
    { id: 'east', minX: cw, maxX: w, minZ: -d, maxZ: d },
    { id: 'north', minX: -cw, maxX: cw, minZ: -d, maxZ: -cd },
    { id: 'south', minX: -cw, maxX: cw, minZ: cd, maxZ: d },
  ].filter(r => r.maxX > r.minX && r.maxZ > r.minZ);
}

function soilGrain() {
  const size = 128, data = new Uint8Array(size * size * 4);
  let seed = 426;
  for (let i = 0; i < size * size; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const u=(i%size)*Math.PI*2/size,v=Math.floor(i/size)*Math.PI*2/size;
    const grain=seed>>>24;
    const coarse=128+51*Math.sin(u*3+v*7)+32*Math.cos(u*5-v*4)+27*Math.sin(u*9-v*11);
    const broad=128+57*Math.sin(u+v*2)+39*Math.cos(u*3-v)+22*Math.sin(u*3+v*2);
    data.set([grain,coarse,broad,255], i * 4);
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true; texture.needsUpdate = true;
  return texture;
}

// All soil shares a single world-space material. Actual top and side faces
// remain in their original positions as terrain is taken or filled in.
export function createConstructionEarthMaterial({color=0xffffff,vertexColors=false,naturalRock=false}={}){
  const grain=soilGrain();
  const material=new THREE.MeshStandardMaterial({color,vertexColors,roughness:1});
  material.onBeforeCompile=shader=>{
    shader.uniforms.constructionSoilSampler={value:grain};
    shader.uniforms.constructionNaturalRock={value:naturalRock?1:0};
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      varying vec3 constructionSoilPosition;
      varying vec3 constructionEarthNormal;`)
      .replace('#include <project_vertex>',`
        vec4 soilPosition=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          soilPosition=instanceMatrix*soilPosition;
        #endif
        constructionSoilPosition=(modelMatrix*soilPosition).xyz;
        constructionEarthNormal=mat3(modelMatrix)*normal;
        #include <project_vertex>`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 constructionSoilPosition;
      varying vec3 constructionEarthNormal;
      uniform sampler2D constructionSoilSampler;
      uniform float constructionNaturalRock;`)
      .replace('#include <color_fragment>',`#include <color_fragment>
        vec3 earthPoint=constructionSoilPosition;
        vec3 earthFace=constructionNaturalRock>.5?abs(normalize(constructionEarthNormal))
          :abs(normalize(cross(dFdx(earthPoint),dFdy(earthPoint))));
        vec3 projection=pow(earthFace,vec3(4.));
        projection/=max(dot(projection,vec3(1.)),.00001);
        vec3 fineGrain=texture2D(constructionSoilSampler,earthPoint.xz*.026).rgb;
        if(constructionNaturalRock>.5){
          fineGrain=fineGrain*projection.y
            +texture2D(constructionSoilSampler,earthPoint.zy*.026).rgb*projection.x
            +texture2D(constructionSoilSampler,earthPoint.xy*.026).rgb*projection.z;
        }else if(earthFace.y<=.5){
          fineGrain=texture2D(constructionSoilSampler,(earthFace.x>.5?earthPoint.zy:earthPoint.xy)*.026).rgb;
        }
        vec2 bandUV=mat2(.81,.57,-.57,.81)*earthPoint.xz*.0021;
        vec2 drift=vec2(sin(earthPoint.z*.008),sin(earthPoint.x*.006+earthPoint.z*.003))*.11;
        vec2 soilOffset=mix(vec2(.25*fineGrain.g,0.),drift,constructionNaturalRock);
        vec3 soilBands=texture2D(constructionSoilSampler,bandUV+soilOffset).rgb;
        float earthLayer=sin(earthPoint.y*.32+soilBands.g*3.3);
        float shade=.87+fineGrain.r*.18+fineGrain.g*.10+(soilBands.b-.5)*.28
          +(1.-earthFace.y)*earthLayer*.073;
        shade+=constructionNaturalRock*((fineGrain.r-.5)*.34+(soilBands.b-.5)*.27);
        diffuseColor.rgb*=shade;
        diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.84,.90,.95),soilBands.g*.34);
      `)
      .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        vec3 earthUp=normalize(mat3(viewMatrix)*vec3(0.,1.,0.));
        float raisedRiser=(1.-earthFace.y)*smoothstep(.12,3.3,earthPoint.y);
        normal=normalize(mix(normal,earthUp,raisedRiser*.78*(1.-constructionNaturalRock)));
      `);
  };
  material.customProgramCacheKey=()=> 'construction-earth-surface';
  const releaseGrain=()=>{grain.dispose();material.removeEventListener('dispose',releaseGrain);};
  material.addEventListener('dispose',releaseGrain);
  return material;
}

// Split rectangles, rather than hiding pixels: the ground and underside rim
// must both be absent where the excavated volume exposes a real hole.
export function subtractGroundRect(regions,hole){
  if(!hole||!['minX','maxX','minZ','maxZ'].every(k=>Number.isFinite(hole[k]))||hole.maxX<=hole.minX||hole.maxZ<=hole.minZ)throw Error('掘削開口の範囲が不正です。');
  return regions.flatMap(r=>{
    const x0=Math.max(r.minX,hole.minX),x1=Math.min(r.maxX,hole.maxX),z0=Math.max(r.minZ,hole.minZ),z1=Math.min(r.maxZ,hole.maxZ);
    if(x0>=x1||z0>=z1)return[r];
    return [
      {...r,id:r.id+'-w',maxX:x0},{...r,id:r.id+'-e',minX:x1},
      {...r,id:r.id+'-n',minX:x0,maxX:x1,maxZ:z0},{...r,id:r.id+'-s',minX:x0,maxX:x1,minZ:z1}
    ].filter(b=>b.maxX>b.minX&&b.maxZ>b.minZ);
  });
}
export function createConstructionGround(config,{holes=[],pavement=[]}={}) {
  const group = new THREE.Group(); group.name = 'construction-expanded-ground';
  const soil = createConstructionEarthMaterial({vertexColors:true});
  // Keep the mountain toe above the flat field with a small, constant bias.
  // A slope-based offset can push the field behind the rim at a grazing view.
  soil.polygonOffset = true;
  soil.polygonOffsetUnits = 2;
  const base = new THREE.Color(0xb9996e);
  // Paved ground replaces the dirt's top mesh. Layering both at the same
  // level flickers where the camera looks along a long lane.
  const regions=[...holes,...pavement].reduce(subtractGroundRect,constructionGroundRegions(config));
  for (const r of regions) {
    const width = r.maxX - r.minX, depth = r.maxZ - r.minZ;
    const geometry = new THREE.PlaneGeometry(width, depth, Math.ceil(width / 100), Math.ceil(depth / 100));
    geometry.rotateX(-Math.PI / 2);
    geometry.translate((r.maxX + r.minX) / 2, 0, (r.maxZ + r.minZ) / 2);
    const positions = geometry.attributes.position;
    // Exactly level with existing floor collision; no visual-only bumps or steps.
    for (let i = 0; i < positions.count; i++) positions.setY(i, 0);
    // The original footprint uses the same world-space soil grain and tint as
    // the four extensions. Its old illustrated map is no longer a floor skin.
    const colors = [];
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), z = positions.getZ(i);
      const variation = .95 + .07 * Math.sin(x * .006 + Math.sin(z * .007)) + .035 * Math.cos(z * .019 - x * .013);
      colors.push(base.r*variation,base.g*variation,base.b*variation);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const mesh = new THREE.Mesh(geometry, soil); mesh.name = `construction-ground-${r.id}`;
    mesh.receiveShadow = true; mesh.userData.groundRegion = r; group.add(mesh);
  }
  // Keep the underlay behind the field even where distant depth values round
  // to the same value. Its sides and the boundaries of the cuts still render.
  const rimMaterial = new THREE.MeshStandardMaterial({
    color: config.palette.edge, roughness: 1, polygonOffset: true, polygonOffsetUnits: 4,
  });
  const rimRegions=holes.reduce(subtractGroundRect,[{id:'rim',minX:-config.world.width/2-2,maxX:config.world.width/2+2,minZ:-config.world.depth/2-2,maxZ:config.world.depth/2+2}]);
  for(const r of rimRegions){const rim = new THREE.Mesh(new THREE.BoxGeometry(r.maxX-r.minX,2.2,r.maxZ-r.minZ),rimMaterial);
    rim.position.set((r.minX+r.maxX)/2,-3.1,(r.minZ+r.maxZ)/2);rim.name='construction-ground-rim';group.add(rim);}
  return group;
}

export function disposeConstructionGround(group) {
  if (!group) return;
  const geometries = new Set(), materials = new Set();
  group.traverse(mesh => { if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) materials.add(mesh.material); });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
}
