// Search only existing authored building zones. Never move an existing building.
// Keep zone centres first, then modest offsets inside the same zones.
export function findOpenConstructionBuildPosition(plots, isValid) {
  const validPlots = plots.filter(p => Array.isArray(p?.position) && p.position.length === 3 && p.position.every(Number.isFinite)
    && Array.isArray(p.size) && p.size.length >= 2 && p.size.slice(0, 2).every(n => Number.isFinite(n) && n > 0));
  const centres = validPlots.map(p => [...p.position]);
  const offsets = validPlots.flatMap(p => [-.35, .35].flatMap(x => [-.35, .35].map(z =>
    [p.position[0] + p.size[0] * x, p.position[1], p.position[2] + p.size[1] * z])));
  return [...centres, ...offsets].find(p => isValid(p)) ?? null;
}
