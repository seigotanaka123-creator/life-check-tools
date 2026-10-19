const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;

// Keep the arrow attached to the real target. Never clamp a hidden/offscreen
// target onto a menu or move its label to an unrelated part of the scene.
export function placeWorkTargetLabel({x,y,width,height,labelWidth,labelHeight,obstacles=[],modal=false}){
 if(modal||![x,y,width,height,labelWidth,labelHeight].every(Number.isFinite)||labelWidth<=0||labelHeight<=0)return null;
 const margin=10,gap=26,pad=8;
 const blocked=obstacles.map(r=>({left:r.left-pad,right:r.right+pad,top:r.top-pad,bottom:r.bottom+pad}));
 const anchor={left:x-4,right:x+4,top:y-4,bottom:y+4};
 if(x<margin||y<margin||x>width-margin||y>height-margin||blocked.some(r=>overlaps(anchor,r)))return null;
 for(const side of ['above','below']){
  const top=side==='above'?y-gap-labelHeight:y+gap,left=x-labelWidth/2;
  // Include the pointer and shadow in the occupied area.
  const bounds={left:left-pad,right:left+labelWidth+pad,top:side==='above'?top-pad:y,bottom:side==='above'?y:top+labelHeight+pad};
  if(bounds.left<margin||bounds.right>width-margin||bounds.top<margin||bounds.bottom>height-margin||blocked.some(r=>overlaps(bounds,r)))continue;
  return {left,top,side};
 }
 return null;
}
