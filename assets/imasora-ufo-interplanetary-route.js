import * as THREE from './three.module.min.js';

const OUTBOUND = Object.freeze({
  id: 'earth-mars-forward-scroll', origin: 'earth', destination: 'mars',
  originName: '地球', destinationName: '火星', destinationMap: 'mars',
});
const HOMEWARD = Object.freeze({
  id: 'mars-earth-forward-scroll', origin: 'mars', destination: 'earth',
  originName: '火星', destinationName: '地球', destinationMap: 'sky',
});

export function interplanetaryRoute(launchMap) {
  return launchMap === 'mars' ? HOMEWARD : OUTBOUND;
}

export function interplanetaryForward(route, currentForward, outboundForward = null) {
  const forward = (route.origin === 'mars' && outboundForward
    ? outboundForward : currentForward).clone();
  forward.y = 0;
  if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
  forward.normalize();
  return route.origin === 'mars' ? forward.negate() : forward;
}

export function planetDeparturePath(entry, forward, up, radius, route) {
  const normal = forward.clone().multiplyScalar(780).addScaledVector(up, 1040).normalize();
  const surfaceRadius = radius * (route.origin === 'mars' ? 1.018 : 1.011);
  const start = entry.clone().addScaledVector(normal, -(surfaceRadius + 34));
  // Mars is much larger than Earth in this game. A fixed Earth-size pull-away
  // would put the ship INSIDE Mars; keep the actual planet radius throughout.
  const end = route.origin === 'mars'
    ? start.clone().addScaledVector(normal, -Math.max(1300, radius * .15))
    : entry.clone().addScaledVector(forward, -780).addScaledVector(up, -1040);
  return { normal, start, end };
}

export function planetSurfaceArrival(center, forward, up, radius, clearance, drop) {
  // Follow the visible surface, including for the smaller Earth. Adding a
  // vertical offset after a radius-only approach would put the endpoint below it.
  const normal = forward.clone().negate().multiplyScalar(radius)
    .addScaledVector(up, -drop).normalize();
  return center.clone().addScaledVector(normal, radius + clearance);
}
