import * as THREE from './three.module.min.js';

export const MARS_SKY_RADIUS = 48000;
export const MARS_SURFACE_CAMERA_FAR = 60000;

// Distant sky only. It never joins the mineable stars or collision registry.
export function createMarsSky() {
  const sky = new THREE.Group();
  sky.name = 'mars-space-sky';
  sky.visible = false;
  sky.userData.nonCollidable = true;
  let seed = 4230911;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const colors = [0xeaf3ff, 0xffffff, 0xc5dcff, 0xffedcf].map(value => new THREE.Color(value));
  for (const [count, size, opacity] of [[2100, 7, .65], [350, 12, .9], [70, 18, 1]]) {
    const positions = [], rgb = [];
    for (let i = 0; i < count; i++) {
      const y = random() * 2 - 1;
      const theta = random() * Math.PI * 2;
      const horizontal = Math.sqrt(1-y*y);
      positions.push(Math.cos(theta)*horizontal*MARS_SKY_RADIUS, y*MARS_SKY_RADIUS, Math.sin(theta)*horizontal*MARS_SKY_RADIUS);
      const c = colors[Math.floor(random()*colors.length)];
      rgb.push(c.r,c.g,c.b);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(rgb,3));
    const material = new THREE.PointsMaterial({ size:size*MARS_SKY_RADIUS/4800, vertexColors:true, transparent:true,
      opacity, depthWrite:false, fog:false, toneMapped:false, sizeAttenuation:true });
    // Feather point corners without an image dependency or square dots.
    material.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>',
        'float starRadius = length(gl_PointCoord - vec2(0.5));\n' +
        'diffuseColor.a *= 1.0 - smoothstep(0.13, 0.5, starRadius);\n' +
        '#include <opaque_fragment>');
    };
    material.customProgramCacheKey = () => 'mars-sky-soft-star-v423';
    const points = new THREE.Points(geometry, material);
    points.name = `mars-sky-stars-${count}`;
    points.frustumCulled = false;
    points.renderOrder = -20;
    points.userData.nonCollidable = true;
    sky.add(points);
  }
  return sky;
}

export function updateMarsSky(sky, camera, mapKey) {
  if (!sky) return;
  const wasVisible=sky.visible;
  sky.visible = mapKey === 'mars';
  if (sky.visible) {
    sky.position.copy(camera.position);
    if(camera.far !== MARS_SURFACE_CAMERA_FAR) {
      sky.userData.previousCameraFar=camera.far;
      camera.far=MARS_SURFACE_CAMERA_FAR; camera.updateProjectionMatrix();
    }
  } else if(wasVisible && camera.far === MARS_SURFACE_CAMERA_FAR) {
    camera.far=sky.userData.previousCameraFar || 6000;
    camera.updateProjectionMatrix();
  }
}
