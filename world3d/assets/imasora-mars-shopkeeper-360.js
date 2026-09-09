import * as THREE from './three.module.min.js';
import { buildWhiteMichiRoadSaberRen360, disposeMatureCharacterModel } from './imasora-character-360.js';

// A reusable mesh character, not a camera-facing picture. +Z is the face direction.
export const MARS_SHOPKEEPER_ID = 'mars-material-shopkeeper-jellyfish-lavender';
export const MARS_SHOPKEEPER_DESCRIPTOR = Object.freeze({
  id: MARS_SHOPKEEPER_ID,
  name: '火星素材ショップの店主（仮称）',
  familyKey: 'mars', familyLabel: '火星の店主', bodyColorCss: '#c6a1e6',
  profileKey: 'jellyfish', formKey: 'jellyfish', decoration: 'merchant',
  decorationLabel: 'エプロン・鉱石', stageKey: 'guest'
});

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;

function surfaceGeometry(rows, columns, sample) {
  const positions = [], uv = [], indices = [];
  for (let i = 0; i <= rows; i++) {
    for (let j = 0; j <= columns; j++) {
      const p = sample(i / rows, j / columns);
      positions.push(p.x, p.y, p.z);
      uv.push(j / columns, i / rows);
    }
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < columns; j++) {
    const a = i * (columns + 1) + j, b = a + columns + 1;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function roundedTube(points, radii, material, name, parent) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => V(...p)));
  const count = 64, sides = 14;
  const frames = curve.computeFrenetFrames(count, false);
  const geometry = surfaceGeometry(count, sides, (u, v) => {
    const i = Math.round(u * count), a = v * TAU;
    const rIndex = u * (radii.length - 1), lo = Math.floor(rIndex);
    const radius = THREE.MathUtils.lerp(radii[lo], radii[Math.min(lo + 1, radii.length - 1)], rIndex - lo);
    return curve.getPointAt(u)
      .addScaledVector(frames.normals[i], Math.cos(a) * radius)
      .addScaledVector(frames.binormals[i], Math.sin(a) * radius);
  });
  // Tube winding is the reverse of the bell's meridian surface. Outward normals
  // are essential: otherwise the arm/foot shows only its far half like a ribbon.
  const tubeIndices=Array.from(geometry.index.array);
  for(let i=0;i<tubeIndices.length;i+=3) [tubeIndices[i+1],tubeIndices[i+2]]=[tubeIndices[i+2],tubeIndices[i+1]];
  const tubePositions=Array.from(geometry.attributes.position.array);
  const tubeUv=Array.from(geometry.attributes.uv.array);
  const firstCenter=tubePositions.length/3;
  tubePositions.push(...curve.getPointAt(0).toArray(),...curve.getPointAt(1).toArray());
  tubeUv.push(.5,0,.5,1);
  for(let j=0;j<sides;j++) {
    tubeIndices.push(firstCenter,j+1,j);
    const end=count*(sides+1);
    tubeIndices.push(firstCenter+1,end+j,end+j+1);
  }
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(tubePositions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(tubeUv,2));
  geometry.setIndex(tubeIndices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function ellipsoid(parent, name, material, scale, position, segments = 32) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, segments, 24), material);
  mesh.name = name;
  mesh.scale.set(...scale);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function clothPanel(parent, name, shape, material, depth) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: .65, bevelSize: .65,
    bevelSegments: 3, steps: 1, curveSegments: 20
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function makeGroundedFootIdleMotion(foot, phase, side, front) {
  const geometry = foot.geometry;
  const positions = geometry.attributes.position;
  const rest = positions.array.slice();
  const along = new Float32Array(positions.count);
  const shaft = new Float32Array(positions.count);
  const curl = new Float32Array(positions.count);
  for (let i = 0; i < positions.count; i++) {
    const u = geometry.attributes.uv.getY(i);
    const y = rest[i * 3 + 1];
    along[i] = u;
    // The attachment and the low ground-contact band stay planted. Only the
    // free shaft and raised curled tip flex; the whole NPC never slides/bobs.
    const free = THREE.MathUtils.smoothstep(u, .12, .32)
      * THREE.MathUtils.smoothstep(y, 9, 14);
    shaft[i] = Math.sin(Math.PI * u) * free;
    curl[i] = THREE.MathUtils.smoothstep(u, .55, .95) * free;
  }
  let animated = false, lastTime = NaN;
  return (time, enabled) => {
    if (!enabled && !animated) return;
    if (enabled && animated && time === lastTime) return;
    if (!enabled) positions.array.set(rest);
    else {
      const cycle = time * 1.75 + phase;
      for (let i = 0; i < positions.count; i++) {
        const u = along[i], bend = shaft[i], tip = curl[i], offset = i * 3;
        positions.setXYZ(i,
          rest[offset] + side * (1.1 * bend + 2.6 * tip) * Math.sin(cycle - u * 2),
          rest[offset + 1] + (.3 * bend + .85 * tip) * (.5 + .5 * Math.sin(cycle + u * 1.7)),
          rest[offset + 2] + front * (.7 * bend + 1.25 * tip) * Math.cos(cycle - u * 2.4),
        );
      }
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    animated = enabled;
    lastTime = time;
  };
}

export function buildMarsShopkeeper360(_id = MARS_SHOPKEEPER_ID, options = {}) {
  const model = new THREE.Group();
  model.name = MARS_SHOPKEEPER_ID;
  const sculpt = new THREE.Group();
  sculpt.name = 'shopkeeper-sculpt';
  model.add(sculpt);
  const materials = {
    body: new THREE.MeshPhysicalMaterial({ color: 0xc8a5e2, roughness: .28, metalness: .02,
      clearcoat: .85, clearcoatRoughness: .2, sheen: .6, sheenColor: 0xeee0ff,
      iridescence: .18, iridescenceIOR: 1.24, emissive: 0x633d86, emissiveIntensity: .065 }),
    bell: new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors:true, roughness: .27, metalness: .015,
      clearcoat: 1, clearcoatRoughness: .17, transmission: 0, thickness: 8,
      ior: 1.34, attenuationColor: 0xd6b2ef, attenuationDistance: 80,
      sheen: .65, sheenColor: 0xf4dfff, iridescence: .24, side: THREE.DoubleSide }),
    rim: new THREE.MeshPhysicalMaterial({ color: 0xe6ccf2, roughness: .26, clearcoat: .9 }),
    core: new THREE.MeshStandardMaterial({ color: 0xffeada, emissive: 0xffdecc, emissiveIntensity: .24, roughness: .7 }),
    eye: new THREE.MeshPhysicalMaterial({ color: 0x1c1039, roughness: .17, clearcoat: 1 }),
    glint: new THREE.MeshBasicMaterial({ color: 0xfff5ff }),
    mouth: new THREE.MeshStandardMaterial({ color: 0x5a397b, roughness: .55 }),
    spots: new THREE.MeshStandardMaterial({ color: 0x8df9ed, emissive: 0x42d9d6, emissiveIntensity: .65, roughness: .36 }),
    apron: new THREE.MeshStandardMaterial({ color: 0x392269, roughness: .91 }),
    seam: new THREE.MeshStandardMaterial({ color: 0x77629d, roughness: .98 }),
    pocket: new THREE.MeshStandardMaterial({ color: 0xe7d1b4, roughness: .94 }),
    stitch: new THREE.MeshStandardMaterial({ color: 0xbca6c9, roughness: 1 }),
    crystal: new THREE.MeshPhysicalMaterial({ color: 0xccd7f4, metalness: .16, roughness: .17,
      clearcoat: 1, transmission: .16, thickness: 3, flatShading: true })
  };

  // The bell is ONE closed sculpted surface, including the scalloped underside.
  const profile = new THREE.CatmullRomCurve3([
    V(0, 120, 0), V(14, 118.5, 0), V(28, 113.5, 0), V(40, 104, 0),
    V(48, 92, 0), V(50, 81, 0), V(45, 75, 0), V(34, 78, 0), V(18, 79, 0), V(0, 79, 0)
  ]);
  function bellPoint(t, turn) {
    const p = profile.getPoint(t), a = turn * TAU;
    const lobe = Math.cos(a * 10);
    const rimWeight = Math.exp(-Math.pow((t - .60) / .16, 2));
    const r = Math.max(0, p.x + rimWeight * lobe * 1.7);
    return V(r * Math.sin(a), p.y - rimWeight * lobe * 3.2, r * Math.cos(a) * .83);
  }
  const bell = new THREE.Mesh(surfaceGeometry(80, 120, bellPoint), materials.bell);
  const bellColors=[];
  const bellVertices=bell.geometry.attributes.position;
  for(let i=0;i<bellVertices.count;i++) {
    const x=bellVertices.getX(i),y=bellVertices.getY(i),z=bellVertices.getZ(i);
    const glow=Math.exp(-(x*x/650+Math.pow(y-96,2)/260+Math.pow(z-23,2)/950));
    const color=new THREE.Color(0xb68cd7).lerp(new THREE.Color(0xefdbef),glow*.72);
    bellColors.push(color.r,color.g,color.b);
  }
  bell.geometry.setAttribute('color',new THREE.Float32BufferAttribute(bellColors,3));
  bell.name = 'continuous-scalloped-jellyfish-bell';
  sculpt.add(bell);
  ellipsoid(sculpt, 'warm-inner-bell-core', materials.core, [23, 12, 19], [0, 93, 0]);
  const rimPoints = Array.from({length: 121}, (_, i) => bellPoint(.62, i / 120));
  const rim = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPoints, true), 160, .55, 8, true), materials.rim);
  rim.name = 'fine-scalloped-bell-lip';
  sculpt.add(rim);

  // Face attachments are sampled from this actual bell, not positioned in empty space.
  sculpt.updateMatrixWorld(true);
  const faceRay = new THREE.Raycaster();
  function faceSurface(x, y) {
    faceRay.set(V(x, y, 100), V(0, 0, -1));
    const hit = faceRay.intersectObject(bell, false)[0];
    if (!hit) throw new Error(`Shopkeeper face is outside bell at ${x},${y}`);
    return { point: hit.point, normal: hit.face.normal.clone().normalize() };
  }
  const eyes = [];
  for (const side of [-1, 1]) {
    const {point, normal} = faceSurface(side * 10.8, 87.8);
    const eye = ellipsoid(sculpt, `eye-${side < 0 ? 'left' : 'right'}`, materials.eye,
      [2.4, 3.85, 1.2], point.clone().addScaledVector(normal, .65).toArray());
    eye.quaternion.setFromUnitVectors(V(0, 0, 1), normal);
    const glint = ellipsoid(eye, 'eye-highlight', materials.glint, [.21, .14, .20], [-.20, .34, .9], 16);
    eyes.push(eye);
  }
  const smilePoints = Array.from({length: 13}, (_, i) => {
    const x = -3.7 + i * 7.4 / 12, y = 83.7 + 1.2 * Math.pow(x / 3.7, 2);
    const hit = faceSurface(x, y);
    return hit.point.addScaledVector(hit.normal, .48);
  });
  const smile = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(smilePoints), 32, .38, 8, false), materials.mouth);
  smile.name = 'gentle-curved-smile';
  sculpt.add(smile);
  // Spots follow the same shell around the crown; no billboard decals.
  const spotLayout = [[.28,.10],[.34,.12],[.39,.15],[.28,.90],[.34,.88],[.39,.85],
    [.29,.45],[.36,.48],[.31,.56],[.36,.61]];
  spotLayout.forEach(([t, a], i) => {
    const p = bellPoint(t, a);
    const du = bellPoint(t + .001, a).sub(bellPoint(t - .001, a));
    const dv = bellPoint(t, a + .001).sub(bellPoint(t, a - .001));
    const n = du.cross(dv).normalize();
    if (n.dot(V(p.x, p.y - 80, p.z)) < 0) n.negate();
    const spot = ellipsoid(sculpt, `mint-bell-freckle-${i + 1}`, materials.spots, [2.6, 1.45, .25], p.addScaledVector(n, .20).toArray(), 24);
    spot.quaternion.setFromUnitVectors(V(0, 0, 1), n);
  });

  const body = ellipsoid(sculpt, 'soft-pear-shaped-body', materials.body, [20, 25, 14.7], [0, 51, 0]);
  for (let i=0; i<12; i++) {
    const a=i/12*TAU;
    ellipsoid(sculpt, `neck-ruff-${i}`, materials.rim, [4.5,2.1,3.4], [Math.sin(a)*12,74.3,Math.cos(a)*10]);
  }

  const feet = [];
  const footIdleMotions = [];
  for (const side of [-1, 1]) for (const front of [-1, 1]) {
    const x=side*(front===1?8:16), z=front===1?4:-4;
    const points=[[side*(front===1?7:12),46,z],[x,27,z],[x+side*4,12,z+front*5],
      [x+side*10,6.2,z+front*9],[x+side*16,8,z+front*10],
      [x+side*17,13,z+front*9],[x+side*13,15,z+front*8],[x+side*11,12,z+front*8]];
    const foot = roundedTube(points,[5.8,6.3,5.5,4.4,3.1,1.7,.08], materials.body,
      `curled-foot-${side}-${front}`,sculpt);
    footIdleMotions.push(makeGroundedFootIdleMotion(foot, feet.length * 1.55, side, front));
    feet.push(foot);
  }

  const hands = [];
  for (const side of [-1,1]) {
    const arm = new THREE.Group();
    arm.name = side===-1?'greeting-arm':'mineral-holding-arm';
    arm.position.set(side*16,61,0);
    sculpt.add(arm);
    const wave = side===-1;
    ellipsoid(arm,'rounded-shoulder-attachment',materials.body,[5.9,6.1,5.9],[0,0,0]);
    roundedTube(wave?[[0,0,0],[-7,-6,2],[-15,-3,5],[-19,6,8]]:
      [[0,0,0],[8,-7,1],[15,-8,8],[15,-4,17]], [5.8,6.1,5.2,4.7], materials.body,'continuous-arm',arm);
    const palm = ellipsoid(arm,'rounded-mitten-palm',materials.body,[6.6,6.9,4.6],wave?[-20,7,8]:[15,-3,18]);
    if(wave) {
      ellipsoid(arm,'wave-finger-round-1',materials.body,[3.6,4.5,3.7],[-23.5,14,8.3]);
      ellipsoid(arm,'wave-finger-round-2',materials.body,[3.2,4,3.3],[-16.8,13,8.8]);
      ellipsoid(arm,'wave-thumb',materials.body,[3.2,3.5,3.5],[-14.9,6,10]);
    } else {
      ellipsoid(arm,'gripping-thumb',materials.body,[3.4,4.1,3.6],[10.5,-1,21]);
      ellipsoid(arm,'gripping-fingers',materials.body,[4.2,3.4,3.4],[16,-6,22]);
    }
    hands.push(arm);
  }

  const apron = new THREE.Group(); apron.name='indigo-merchant-apron'; sculpt.add(apron);
  // A thick wrapped skirt surface. Rounded lower corners are sculpted into the hem.
  const apronGeo = surfaceGeometry(26,72,(u,v)=>{
    const a=(v-.5)*3.35;
    const edge=Math.pow(Math.abs(v-.5)*2,8);
    const y=THREE.MathUtils.lerp(24+edge*4,51,u);
    const rx=23.5-u*3.2, rz=17.2-u*1.3;
    return V(Math.sin(a)*rx,y,Math.cos(a)*rz);
  });
  const cloth = new THREE.Mesh(apronGeo, materials.apron);
  cloth.material.side=THREE.DoubleSide; cloth.name='curved-apron-cloth'; apron.add(cloth);
  // Continue the existing front panel around the hips. Both side edges use
  // exactly the front panel's radii/heights, so the cloth has no open rear gap.
  // Keep the approved front panel, pocket, belt and bow in their original places.
  const rearHemFlare = v => 3.4 * Math.pow(Math.sin(Math.PI * v), .35);
  const backApronGeo = surfaceGeometry(26, 64, (u, v) => {
    const a = 3.35 / 2 + v * (TAU - 3.35);
    const edge = Math.pow(Math.abs(v - .5) * 2, 8);
    const y = THREE.MathUtils.lerp(24 + edge * 4, 51, u);
    // Leave room for the animated upper tentacles underneath the rear hem.
    const flare = rearHemFlare(v) * (1 - u) ** 2;
    return V(Math.sin(a) * (23.5 - u * 3.2 + flare), y, Math.cos(a) * (17.2 - u * 1.3 + flare * .45));
  });
  const backCloth = new THREE.Mesh(backApronGeo, materials.apron);
  backCloth.name = 'wrapped-back-apron-cloth';
  apron.add(backCloth);
  for (const top of [false,true]) {
    const points=Array.from({length:61},(_,i)=>{
      const v=i/60,a=(v-.5)*3.35,edge=Math.pow(Math.abs(v-.5)*2,8);
      return [Math.sin(a)*(top?20.3:23.5),top?51:24+edge*4,Math.cos(a)*(top?15.9:17.2)];
    });
    roundedTube(points,[.85,.85],materials.apron,top?'apron-waist-piping':'apron-hem-piping',apron);
    const backPoints = Array.from({ length: 61 }, (_, i) => {
      const v = i / 60, a = 3.35 / 2 + v * (TAU - 3.35);
      const edge = Math.pow(Math.abs(v - .5) * 2, 8);
      const flare = top ? 0 : rearHemFlare(v);
      return [Math.sin(a) * (top ? 20.3 : 23.5 + flare), top ? 51 : 24 + edge * 4, Math.cos(a) * (top ? 15.9 : 17.2 + flare * .45)];
    });
    roundedTube(backPoints, [.85, .85], materials.apron, top ? 'apron-back-waist-piping' : 'apron-back-hem-piping', apron);
  }
  // Full belt and tied bow continue on the back, where the concept has no visible view.
  const belt = new THREE.Mesh(new THREE.TorusGeometry(1,.062,10,72),materials.apron);
  belt.name='continuous-waist-belt'; belt.rotation.x=Math.PI/2; belt.scale.set(20.6,16.6,28); belt.position.y=51; apron.add(belt);
  for(const side of [-1,1]) {
    roundedTube([[0,50,-16],[side*6,53,-18],[side*10,50,-18],[side*7,47,-18],[0,50,-16]],
      [1.9,2.3,2.3,1.9],materials.apron,`back-bow-${side}`,apron);
    roundedTube([[side*2,49,-17],[side*5,42,-18],[side*7,35,-17]], [2.3,2.8,1.5],materials.apron,`ribbon-tail-${side}`,apron);
  }
  ellipsoid(apron,'bow-knot',materials.apron,[3,2.6,2.2],[0,50,-17]);
  const pocketShape=new THREE.Shape(); pocketShape.moveTo(-6.7,4.7);
  pocketShape.quadraticCurveTo(0,3.4,6.7,4.7); pocketShape.lineTo(6.3,-1.8);
  pocketShape.bezierCurveTo(5.8,-9,-5.8,-9,-6.3,-1.8); pocketShape.closePath();
  const pocket=clothPanel(apron,'cream-pouch-pocket',pocketShape,materials.pocket,1.8);
  pocket.position.set(0,39,17.1);
  for(let i=0;i<19;i++) {
    const a=Math.PI*.06+i/(18)*Math.PI*.88;
    const x=Math.cos(a)*5.4,y=38.5-Math.sin(a)*6.1;
    const stitch=ellipsoid(apron,`pocket-stitch-${i}`,materials.stitch,[.17,.38,.12],[x,y,19.68],10);
    stitch.rotation.z=-a;
  }

  const mineral = new THREE.Group(); mineral.name='held-moonstone'; hands[1].add(mineral);
  mineral.position.set(11,4,17); mineral.rotation.set(.15,0,-.35);
  const crystalGeo=new THREE.IcosahedronGeometry(1,0);
  const crystal=new THREE.Mesh(crystalGeo,materials.crystal); crystal.scale.set(5.1,8.6,4.4); mineral.add(crystal);
  const shard=new THREE.Mesh(crystalGeo.clone(),materials.crystal); shard.scale.set(2.4,5.7,2.5); shard.position.set(3,-1,1); shard.rotation.z=-.2; mineral.add(shard);

  // Fit to the actual official REN mesh, preserving the selected concept proportions.
  const ren = buildWhiteMichiRoadSaberRen360({castShadow:false});
  const renBounds = new THREE.Box3().setFromObject(ren);
  const ownBounds = new THREE.Box3().setFromObject(sculpt);
  const height=renBounds.max.y-renBounds.min.y;
  const scale=height/(ownBounds.max.y-ownBounds.min.y);
  sculpt.scale.setScalar(scale);
  sculpt.position.y=renBounds.min.y-ownBounds.min.y*scale;
  disposeMatureCharacterModel(ren);
  model.traverse(object=>{if(object.isMesh){object.castShadow=options.castShadow!==false;object.receiveShadow=true;}});
  model.userData={
    ...MARS_SHOPKEEPER_DESCRIPTOR, characterName:MARS_SHOPKEEPER_DESCRIPTOR.name,
    sourceCharacterId:MARS_SHOPKEEPER_ID, continuous3d:true, reusableCharacter360:true,
    templateCharacterId:MARS_SHOPKEEPER_ID, decorationType:'merchant', materials,
    body, bell, hands, feet, faceFeatures:eyes, sculpt,
    primaryDecoration:apron, secondaryDecoration:mineral,
    primaryDecorationLabel:'エプロン',secondaryDecorationLabel:'手持ちの鉱石',
    cameraTargetY:(renBounds.min.y+renBounds.max.y)/2,cameraDistanceScale:1,
    referenceHeight:height, footBaseline:renBounds.min.y,
    updateAnimation(time,enabled=true){
      hands[0].rotation.z=enabled?Math.sin(time*1.7)*.065:0;
      hands[1].rotation.z=enabled?Math.sin(time*1.35+.8)*.027:0;
      body.scale.y=25*(enabled?1+Math.sin(time*1.5)*.008:1);
      footIdleMotions.forEach(update => update(time, enabled));
    }
  };
  return model;
}

// Shop-local anchor: to the side of the 48-wide doorway, looking outward (+Z).
// Keeping this relative to the shop avoids confusing map/world coordinates.
export function buildMarsShopkeeperAtEntrance360(structure, groundClearance = .12) {
  const model=buildMarsShopkeeper360();
  // The world light covers the whole map; its coarse shadow texels otherwise
  // stripe this small glossy bell. Keep its ground shadow, not self-shadow acne.
  model.traverse(object=>{if(object.isMesh)object.receiveShadow=false;});
  model.scale.setScalar(.36/(Number(structure.scale)||1));
  model.updateMatrixWorld(true);
  const feetBounds=new THREE.Box3();
  model.userData.feet.forEach(foot=>feetBounds.expandByObject(foot));
  const localX=36, localZ=(structure.size[2]-10)/2+15;
  model.position.set(localX,groundClearance-feetBounds.min.y,localZ);
  model.userData.entranceAnchor=[localX,localZ];
  model.userData.idleElapsed=0;
  return model;
}
