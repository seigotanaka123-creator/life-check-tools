// The driver's feet in the cab are not the chassis support height.
export const VEHICLE_MAX_Y = 516;
export function validVehicleHeight(v) {
  return v?.groundY === undefined || Number.isFinite(v.groundY)
    && v.groundY >= -64 && v.groundY <= VEHICLE_MAX_Y;
}
export function assertVehicleHeight(v) {
  if (!validVehicleHeight(v)) throw Error('車が停まっている高さを確認できません。保存を残して止めたよ。');
}
export function chooseVehicleHeight(earth, tops, reference = 0) {
  if (!Number.isFinite(earth) || !Number.isFinite(reference)) return undefined;
  const reachable = tops.filter(y => Number.isFinite(y) && y >= earth - .15 && y <= reference + 8);
  return reachable.length ? Math.max(earth, ...reachable) : earth;
}
// Very large authored floors stay in a small separate list instead of creating
// hundreds of thousands of fine grid buckets. Ramp strips use the local grid.
export function createVehicleSurfaceIndex(surfaces, contains) {
  const grid = new Map(), wide = [], size = 16;
  for (const p of surfaces) {
    const hx = p.localHalfX ?? p.halfX, hz = p.localHalfZ ?? p.halfZ;
    if (![p.x, p.z, hx, hz, p.height].every(Number.isFinite)
      || p.physicsSource === 'ufo-opening-ramp' || p.physicsSource === 'ufo-interior-entry') continue;
    const a = p.rotation ?? 0, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
    const ex = hx * c + hz * s, ez = hx * s + hz * c;
    const x0 = Math.floor((p.x - ex) / size), x1 = Math.floor((p.x + ex) / size);
    const z0 = Math.floor((p.z - ez) / size), z1 = Math.floor((p.z + ez) / size);
    if ((x1 - x0 + 1) * (z1 - z0 + 1) > 256) { wide.push(p); continue; }
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      const key = x + ',' + z, bucket = grid.get(key) ?? [];
      bucket.push(p); grid.set(key, bucket);
    }
  }
  for (const bucket of grid.values()) bucket.push(...wide);
  const near = (x, z) => grid.get(Math.floor(x / size) + ',' + Math.floor(z / size)) ?? wide;
  const top=(p,x,z)=>p.height+(p.supportSlopeX??0)*(x-p.x)+(p.supportSlopeZ??0)*(z-p.z);
  const allowed = (p, reference, exclude) => p.buildingId !== exclude
    && (!Number.isFinite(p.supportFromAbove) || reference >= p.supportFromAbove);
  const inside = (x, z, p) => !p.polygon && (p.rotation ?? 0) === 0
    ? Math.abs(x - p.x) < (p.localHalfX ?? p.halfX) + .02
      && Math.abs(z - p.z) < (p.localHalfZ ?? p.halfZ) + .02
    : contains(x, z, p);
  return {
    heightAt(x, z, earth, reference, exclude = '') {
      if (!Number.isFinite(earth) || !Number.isFinite(reference)) return undefined;
      let y = earth;
      for (const p of near(x, z)) if (allowed(p, reference, exclude)
        && top(p,x,z) >= earth - .15 && top(p,x,z) <= reference + 8 && inside(x, z, p)) y = Math.max(y, top(p,x,z));
      return y;
    },
    heightsAt(x, z, reference, exclude = '') {
      return near(x, z).filter(p => allowed(p, reference, exclude) && inside(x, z, p)).map(p => top(p,x,z));
    },
    cells: grid.size,
  };
}
