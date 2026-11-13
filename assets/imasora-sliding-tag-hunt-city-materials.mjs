
import * as T from './three.module.min.js';

const surfaceColors = {
  frost: ['#dce5e8', '#839ba3', '#ffffff'],
  asphalt: ['#718b96', '#233f4c', '#c5dce0'],
  paving: ['#b4bdc1', '#697f85', '#edf3ec'],
  ice: ['#a8d7e5', '#497e95', '#f1fcff'],
};

function paintedTexture(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  return texture;
}

function randomTextureSeed(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

export function huntSurfaceTexture(kind) {
  const [base, dark, light] = surfaceColors[kind];
  const texture = paintedTexture(256, 256, (ctx, width, height) => {
    const random = randomTextureSeed(0xa713f + kind.length * 1024);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 3300; i++) {
      const x = random() * width, y = random() * height;
      const long = kind === 'ice' ? 3 + random() * 19 : 1 + random() * 3;
      ctx.fillStyle = i % 3 === 0 ? dark : light;
      ctx.globalAlpha = kind === 'ice' ? .045 + random() * .08 : .055 + random() * .18;
      ctx.fillRect(x, y, long, 1 + random() * (kind === 'frost' ? 2 : .8));
    }
    ctx.globalAlpha = 1;
    if (kind === 'paving') {
      for (let row = 0; row < 8; row++) {
        const y = row * 32;
        ctx.fillStyle = '#647b83';ctx.globalAlpha = .35;
        ctx.fillRect(0, y, width, 2);
        for (let x = row % 2 ? 32 : 0; x < width; x += 64)ctx.fillRect(x, y, 1.5, 32);
        ctx.fillStyle = '#f1fbfc';ctx.globalAlpha = .22;
        ctx.fillRect(0, y + 2, width, 1.5);
      }
    }
    ctx.globalAlpha = 1;
  });
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

// Use world coordinates for the texture grain. Adjacent paths then line up
// and the same material reads at the same scale on both a plaza and a lane.
export function setHuntTerrainUV(geometry, x, z, tileSize) {
  const positions = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
  for (let i = 0; i < positions.count; i++) {
    uv.setXY(i, (positions.getX(i) + x) / tileSize, (z - positions.getY(i)) / tileSize);
  }
}

export function huntMasonryTexture() {
  const texture=paintedTexture(256, 256, (ctx, width, height) => {
    const random = randomTextureSeed(0x154b6);
    ctx.fillStyle = '#b0b9bb';
    ctx.fillRect(0, 0, width, height);
    for (let row = 0; row < 8; row++) {
      for (let col = -1; col < 6; col++) {
        const x = col * 48 + (row % 2) * 24, y = row * 32;
        const shade = 215 + Math.floor(random() * 19);
        ctx.fillStyle = 'rgb(' + shade + ',' + shade + ',' + shade + ')';
        ctx.fillRect(x, y, 47, 31);
        ctx.fillStyle = '#f8f9f4';
        ctx.fillRect(x+1, y+1, 46, 1);
      }
    }
    for (let i = 0; i < 1900; i++) {
      ctx.fillStyle = i % 3 === 0 ? '#81929a' : '#fcffff';
      ctx.globalAlpha = .08 + random() * .15;
      ctx.fillRect(random() * width, random() * height, 1 + random() * 2, 1);
    }
    ctx.globalAlpha = 1;
  });
  texture.wrapS=texture.wrapT=T.RepeatWrapping;
  texture.anisotropy=4;
  return texture;
}

export function huntRoadMarkings(groundHeight) {
  const positions = [], indices = [], colors = [];
  const trafficPaint=new T.Color(0xd1d3c3),curbStone=new T.Color(0xaab9b9);
  function stripe(x, z, width, depth, color=trafficPaint) {
    const base = positions.length / 3;
    for (const [dx, dz] of [[-width/2,-depth/2],[-width/2,depth/2],[width/2,-depth/2],[width/2,depth/2]]) {
      positions.push(x + dx, groundHeight(x + dx, z + dz) + .088, z + dz);
      colors.push(color.r,color.g,color.b);
    }
    indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
  }
  // Main avenue and side streets. Break the center line at the junctions.
  for (let x = -308; x <= 218; x += 14) if (Math.abs(x) > 26 && x < 55) stripe(x, 0, 5, .24);
  for (let z = -218; z <= 218; z += 14) {
    if (Math.abs(z) > 31 && (z < -128 || z > -33)) stripe(0, z, .24, 5);
    if (Math.abs(z) > 24 && Math.abs(Math.abs(z) - 164) > 15) stripe(260, z, .24, 5);
  }
  for (let x = -8; x <= 8; x += 2) {
    stripe(x, -15.5, .8, 4.4);
    stripe(x, 15.5, .8, 4.4);
  }
  for (const side of [-1,1]) {
    for (let x = -310; x < 55; x += 4) if (Math.abs(x) > 16) stripe(x,side*11.6,3.95,.8,curbStone);
    for (let z = -220; z <= 220; z += 4) if (Math.abs(z) > 20 && (z < -119 || z > -36)) stripe(side*13.6,z,.8,3.95,curbStone);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new T.Mesh(geometry, new T.MeshStandardMaterial({vertexColors:true,roughness:.9,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-12}));
  mesh.name = 'hunt-painted-road-markings';
  return mesh;
}

function glassTexture(lit) {
  return paintedTexture(192, 256, (ctx, width, height) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    for (const [at, color] of lit
      ? [[0,'#b89363'],[.43,'#e8c898'],[.73,'#fff0bd'],[1,'#dbac76']]
      : [[0,'#b8dbe8'],[.25,'#739dac'],[.54,'#4b738a'],[1,'#2c485d']]) gradient.addColorStop(at, color);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = lit ? '#fff0c6' : '#d6eff3';
    ctx.globalAlpha = lit ? .25 : .36;
    ctx.fillRect(6, 0, 4, height);
    ctx.fillRect(0, 8, width, 3);
    ctx.fillStyle = lit ? '#9b693d' : '#1c374a';
    ctx.globalAlpha = .48;
    ctx.fillRect(width/2-1.5, 0, 3, height);
    ctx.fillRect(0, height - 9, width, 7);
    ctx.globalAlpha=1;
    // A recessed metal frame, an inner sill and a restrained sky reflection.
    ctx.fillStyle='#263a44';
    ctx.fillRect(0,0,5,height);ctx.fillRect(width-5,0,5,height);
    ctx.fillRect(0,0,width,5);ctx.fillRect(0,height-5,width,5);
    ctx.fillStyle=lit?'#e8d5b7':'#bed1d9';
    ctx.fillRect(5,5,width-10,2);ctx.fillRect(5,5,2,height-10);
    ctx.globalAlpha=lit?.22:.1;
    ctx.fillStyle=lit?'#4b3128':'#192f3f';
    ctx.fillRect(10,height*.7,width-20,height*.18);
    ctx.fillStyle=lit?'#faf0d3':'#e5f5ff';
    ctx.globalAlpha=lit?.15:.2;
    ctx.beginPath();ctx.moveTo(12,12);ctx.lineTo(width*.48,12);ctx.lineTo(12,height*.66);ctx.closePath();ctx.fill();
    ctx.globalAlpha=1;
  });
}

export function huntEntranceMaterial() {
  const map=paintedTexture(96,128,(ctx,width,height)=>{
    const frame=ctx.createLinearGradient(0,0,width,height);
    frame.addColorStop(0,'#ac987e');
    frame.addColorStop(.46,'#594d49');
    frame.addColorStop(1,'#272f39');
    ctx.fillStyle=frame;ctx.fillRect(0,0,width,height);
    const panes=ctx.createLinearGradient(0,6,0,96);
    panes.addColorStop(0,'#bad0d4');
    panes.addColorStop(.48,'#55717e');
    panes.addColorStop(1,'#2c424d');
    ctx.fillStyle=panes;
    ctx.fillRect(8,7,37,87);ctx.fillRect(51,7,37,87);
    ctx.fillStyle='#cfb78d';ctx.fillRect(41,68,2,15);ctx.fillRect(53,68,2,15);
    ctx.fillStyle='#b6bec0';ctx.fillRect(4,117,width-8,6);
  });
  return new T.MeshStandardMaterial({map,roughness:.45,metalness:.14});
}

export function createHuntGlass() {
  const day = glassTexture(false), warm = glassTexture(true);
  const shaded = new T.MeshStandardMaterial({color:0xc9e5ed,map:day,roughness:.18,metalness:.22});
  const lit = shaded.clone();
  lit.emissiveMap = warm;
  const dayColor=new T.Color(0xc9e5ed),nightColor=new T.Color(0xd8c7aa);
  function update(amount) {
    lit.color.copy(dayColor).lerp(nightColor,amount);
    lit.emissive.set(0xffcc8e);
    lit.emissiveIntensity = amount * .75;
  }
  return {shaded,lit,update};
}

export function createHuntSunShadows(terrain, world, buildings, trees) {
  const width = 1024, height = 768;
  let ctx;
  const texture = paintedTexture(width, height, context => { ctx = context; });
  const geometry = terrain.clone();
  geometry.deleteAttribute('color');
  const pos = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) / world.width + .5, -pos.getY(i) / world.depth + .5);
  }
  const material = new T.MeshBasicMaterial({
    map:texture, transparent:true, depthWrite:false, polygonOffset:true,
    polygonOffsetFactor:-3, polygonOffsetUnits:-8, opacity:0,
  });
  const mesh = new T.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = .069;
  mesh.name = 'hunt-city-sun-shadows';
  const casters = buildings.filter(b => b.kind !== 'arch').map(b => ({...b}));
  for (const {x,z,r,h} of trees) casters.push({x,z,w:r*1.35,d:r*1.35,h});
  let previous = '';
  function update(light) {
    material.opacity = Math.min(.76, light.power * .34 * (1 - light.night) ** 2);
    mesh.visible = material.opacity > .035 && light.elevation > 0;
    if (!mesh.visible) return;
    const yaw = Math.round(light.azimuth * 35) / 35;
    const elevation = Math.round(light.elevation * 35) / 35;
    const key = yaw + ':' + elevation;
    if (key === previous) return;
    previous = key;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(32,55,80,.42)';
    ctx.filter = 'blur(1.6px)';
    const slope = 1 / Math.max(.18, Math.tan(elevation));
    const dx = -Math.sin(yaw), dz = -Math.cos(yaw);
    for (const b of casters) {
      const halfW = b.w / 2, halfD = b.d / 2;
      const distance = Math.min(b.h * slope, 70);
      const sx = dx * distance, sz = dz * distance;
      const sideX = sx < 0 ? -1 : 1, sideZ = sz < 0 ? -1 : 1;
      const x = b.x + (sx < 0 ? -halfW : halfW);
      const z = b.z + (sz < 0 ? -halfD : halfD);
      const outline = [[x-b.w*sideX,z],[x-b.w*sideX,z-b.d*sideZ],[x,z-b.d*sideZ],[x+sx,z-b.d*sideZ+sz],[x+sx,z+sz],[x-b.w*sideX+sx,z+sz]];
      ctx.beginPath();
      for (const [i,[px,pz]] of outline.entries()) {
        const u = (px / world.width + .5) * width, v = (.5 - pz / world.depth) * height;
        if (i === 0) ctx.moveTo(u,v); else ctx.lineTo(u,v);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.filter = 'none';
    texture.needsUpdate = true;
  }
  return {mesh, update};
}

export function huntContactShadows(buildings, trees, groundHeight) {
  const positions = [], uv = [], footprints = [], indices = [];
  function footprint(x, z, width, depth, round) {
    const spread = round ? 5.7 : 5;
    const halfX = width / 2 + spread, halfZ = depth / 2 + spread;
    const nx = Math.ceil(halfX / 3), nz = Math.ceil(halfZ / 3);
    const base = positions.length / 3;
    for (let iz = 0; iz <= nz; iz++) for (let ix = 0; ix <= nx; ix++) {
      const u = ix / nx, v = iz / nz;
      const wx = x + (u * 2 - 1) * halfX, wz = z + (v * 2 - 1) * halfZ;
      positions.push(wx, groundHeight(wx, wz) + .084, wz);
      uv.push(u, v);
      footprints.push(width / 2 / halfX, depth / 2 / halfZ, round ? 1 : 0);
      if (iz < nz && ix < nx) {
        const a = base + iz * (nx + 1) + ix, b = a + nx + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  for (const b of buildings) if (b.kind !== 'arch') footprint(b.x, b.z, b.w, b.d, false);
  for (const tree of trees) footprint(tree.x, tree.z, tree.r * 1.15, tree.r * 1.15, true);
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('footprint', new T.Float32BufferAttribute(footprints, 3));
  geometry.setIndex(indices);
  const material = new T.ShaderMaterial({
    transparent:true, depthWrite:false, toneMapped:false, fog:true,
    uniforms:{...T.UniformsUtils.clone(T.UniformsLib.fog),opacity:{value:.29}},
    vertexShader:[
      'attribute vec3 footprint;',
      'varying vec2 shadeUv;',
      'varying vec3 shadeFootprint;',
      '#include <fog_pars_vertex>',
      'void main() {',
      ' shadeUv=uv; shadeFootprint=footprint;',
      ' vec4 mvPosition=modelViewMatrix*vec4(position,1.);',
      ' gl_Position=projectionMatrix*mvPosition;',
      ' #include <fog_vertex>',
      '}',
    ].join('\n'),
    fragmentShader:[
      'uniform float opacity;',
      'varying vec2 shadeUv;',
      'varying vec3 shadeFootprint;',
      '#include <fog_pars_fragment>',
      'void main() {',
      ' vec2 p=abs(shadeUv*2.-1.);',
      ' vec2 gap=max(vec2(0.),p-shadeFootprint.xy)/(1.-shadeFootprint.xy);',
      ' float distanceToEdge=mix(length(gap),length(p),shadeFootprint.z);',
      ' float falloff=1.-smoothstep(0.,1.,distanceToEdge);',
      ' gl_FragColor=vec4(.055,.12,.15,falloff*opacity*mix(1.,.73,shadeFootprint.z));',
      ' #include <fog_fragment>',
      '}',
    ].join('\n'),
  });
  const shadow = new T.Mesh(geometry, material);
  shadow.name = 'hunt-city-contact-shadows';
  return shadow;
}

