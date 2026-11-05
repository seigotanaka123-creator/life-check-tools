// Keep the full rotated arrow clear of viewport edges and occupied HUD regions.
export function huntThreatCuePosition(x,y,view,regions){
 const radius=19;
 const left=view.left+radius,right=view.right-radius,top=view.top+radius,bottom=view.bottom-radius;
 if(left>right||top>bottom)return null;
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const xs=[clamp(x,left,right)],ys=[clamp(y,top,bottom)];
 const blocks=regions.map(r=>({left:r.left-radius,right:r.right+radius,top:r.top-radius,bottom:r.bottom+radius}));
 for(const r of blocks){
  for(const edge of [r.left,r.right])if(edge>=left&&edge<=right)xs.push(edge);
  for(const edge of [r.top,r.bottom])if(edge>=top&&edge<=bottom)ys.push(edge);
 }
 let best=null,nearest=Infinity;
 for(const cx of xs)for(const cy of ys){
  const distance=(cx-x)**2+(cy-y)**2;
  if(distance>=nearest||blocks.some(r=>cx>r.left&&cx<r.right&&cy>r.top&&cy<r.bottom))continue;
  best={x:cx,y:cy};nearest=distance;
 }
 return best;
}
