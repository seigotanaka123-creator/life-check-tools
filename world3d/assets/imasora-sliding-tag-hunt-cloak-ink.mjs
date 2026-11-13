import{usesContinuousJumpRest}from'./imasora-sliding-tag-hunt-jump-rest.mjs';
export const CLOAK_INK_RULES='tag-cloak-ink-v77';
// Cloak temporarily hides the whole runner trail, including existing marks.
// Keep the ink and each mark's ordinary lifetime: nothing is erased or paused.
// Sunglasses reveal the body as before, but do not restore a suppressed trail.
export function huntInkTrailSuppressed(s){return (s.rules===CLOAK_INK_RULES||usesContinuousJumpRest(s.rules))&&(s.player?.effects?.cloak??0)>s.time;}
