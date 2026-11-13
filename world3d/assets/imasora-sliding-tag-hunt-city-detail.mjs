import * as T from './three.module.min.js';

function canvasTexture(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function randomSequence(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function huntBarkMaterial() {
  const map = canvasTexture(128, 256, (ctx, width, height) => {
    ctx.fillStyle = '#927d64';
    ctx.fillRect(0, 0, width, height);
    const random = randomSequence(5021);
    for (let i = 0; i < 280; i++) {
      const x = random() * width, y = random() * height;
      ctx.fillStyle = i % 3 ? '#534c40' : '#d2b996';
      ctx.globalAlpha = .12 + random() * .35;
      ctx.fillRect(x, y, .5 + random() * 2, 8 + random() * 72);
    }
    ctx.globalAlpha = 1;
  });
  map.wrapS = map.wrapT = T.RepeatWrapping;
  const material = new T.MeshStandardMaterial({map, roughness:.95});
  material.bumpMap = map;
  material.bumpScale = .09;
  return material;
}

function foliageTexture(opaque = false) {
  return canvasTexture(256, 256, ctx => {
    if (opaque) {
      ctx.fillStyle = '#45633d';
      ctx.fillRect(0,0,256,256);
    }
    const random = randomSequence(73183);
    for (let i = 0; i < 640; i++) {
      const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * 107;
      const x = 128 + Math.cos(angle) * radius;
      const y = 128 + Math.sin(angle) * radius * .92;
      const leafSize = 3.5 + random() * 6.5;
      ctx.fillStyle = ['#314c35','#456d43','#658447','#7c9959','#a2b579'][Math.floor(random()*5)];
      ctx.beginPath();
      ctx.ellipse(x, y, leafSize, leafSize * .43, angle - .6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(211,218,151,.18)';
      ctx.lineWidth = .7;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle - .6) * leafSize * .78, y + Math.sin(angle - .6) * leafSize * .78);
      ctx.stroke();
    }
  });
}

export function huntCanopyMaterial() {
  return new T.MeshStandardMaterial({map:foliageTexture(true),color:0xf2f0d5,roughness:.96});
}

// Cutout foliage adds fine silhouettes using one shared texture and draw call.
export function huntFoliageDetails(treeCrowns, hedgeCrowns) {
  const cards = [];
  const random = randomSequence(12095);
  for (const [x,y,z,sx,sy,sz] of treeCrowns) {
    for (const [level,radius,width] of [[-.65,.2,.7],[-.32,.62,.9],[0,.7,1],[.35,.58,.88],[.67,.18,.65]]) for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI * 2 / 6 + random() * .45 + level;
      const elevation = level + (random()-.5)*.14;
      cards.push([x + Math.cos(angle)*sx*radius, y + sy*elevation, z + Math.sin(angle)*sz*radius,
        sx*width,sy*(.7+random()*.15),Math.PI/2-angle]);
    }
  }
  for (let i = 0; i < hedgeCrowns.length; i += 2) {
    const [x,y,z,sx,sy,sz] = hedgeCrowns[i];
    for (let side = 0; side < 2; side++) {
      const angle = i*.91 + side*Math.PI;
      cards.push([x+Math.cos(angle)*sx*.57,y,z+Math.sin(angle)*sz*.57,sx*.85,sy*1.2,Math.PI/2-angle]);
    }
  }
  const map = foliageTexture();
  const material = new T.MeshStandardMaterial({
    map, color:0xf2f0d5, alphaTest:.48, side:T.DoubleSide, roughness:.96,
  });
  const mesh = new T.InstancedMesh(new T.PlaneGeometry(1,1), material, cards.length);
  const matrix = new T.Matrix4(), rotation = new T.Quaternion(), axis = new T.Vector3(0,1,0);
  cards.forEach(([x,y,z,w,h,yaw],i) => {
    rotation.setFromAxisAngle(axis,yaw);
    matrix.compose(new T.Vector3(x,y,z),rotation,new T.Vector3(w,h,1));
    mesh.setMatrixAt(i,matrix);
  });
  mesh.computeBoundingSphere();
  mesh.name = 'hunt-detailed-foliage';
  return mesh;
}

// Project fine wall joints in metres, independently of each building's size.
export function applyHuntWallDetail(material, texture) {
  material.map = texture;
  material.roughness = .86;
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', [
      '#include <common>','varying vec3 wallPosition;','varying vec3 wallNormal;',
    ].join('\n')).replace('#include <begin_vertex>', [
      '#include <begin_vertex>',
      'wallPosition=position;',
      '#ifdef USE_INSTANCING',
      'wallPosition=(instanceMatrix*vec4(position,1.)).xyz;',
      '#endif',
      'wallNormal=normal;',
    ].join('\n'));
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', [
      '#include <common>','varying vec3 wallPosition;','varying vec3 wallNormal;',
    ].join('\n')).replace('#include <map_fragment>', [
      'vec2 masonryUv=abs(wallNormal.z)>.5?wallPosition.xy:wallPosition.zy;',
      'vec4 stone=texture2D(map,masonryUv/vec2(15.,9.));',
      'float baseShade=mix(.77,1.,smoothstep(.2,3.2,wallPosition.y));',
      'diffuseColor*=vec4(stone.rgb*baseShade,stone.a);',
    ].join('\n'));
  };
  material.customProgramCacheKey = () => 'hunt-world-stone-v1';
}
