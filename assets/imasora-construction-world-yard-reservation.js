export const WORLD_YARD_RESERVED_HALF_X = 350;
export const WORLD_YARD_RESERVED_HALF_Z = 280;

// Shared validation for horizontal build footprints. Invalid bounds must not
// be allowed to bypass either material-yard or excavation-void reservations.
export function hasValidWorldFootprint(position, size) {
  if (!Array.isArray(position) || position.length < 3
    || !Array.isArray(size) || size.length < 3) return false;
  return [position[0], position[2], size[0], size[2]].every(Number.isFinite)
    && size[0] > 0 && size[2] > 0;
}

// Shared horizontal work-area gate for excavation, water, soil and timber.
// Exact edge contact remains allowed; invalid bounds fail closed.
export function overlapsWorldYardBuild(yard, position, size) {
  if (!Array.isArray(yard) || yard.length < 2 || !hasValidWorldFootprint(position, size)) return true;
  const [yardX, yardZ] = yard;
  const buildX = position[0], buildZ = position[2];
  const width = size[0], depth = size[2];
  if (![yardX, yardZ].every(Number.isFinite)) return true;
  return Math.abs(buildX - yardX) < WORLD_YARD_RESERVED_HALF_X + width / 2
    && Math.abs(buildZ - yardZ) < WORLD_YARD_RESERVED_HALF_Z + depth / 2;
}
