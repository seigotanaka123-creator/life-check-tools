import{HUNT_CHARACTER_HEIGHT}from'./imasora-sliding-tag-hunt-world.mjs';
// Feet-based body intervals match the world solver. Rolling spheres narrow at
// their top/bottom, so jumping over an item cannot trigger a hit or spend a guard.
// Returns the horizontal contact distance, or -1 for separated body heights.
export function movingItemContactRadius(a,g){
 if(g.kind==='clone')return a.y<g.y+HUNT_CHARACTER_HEIGHT&&a.y+HUNT_CHARACTER_HEIGHT>g.y?a.radius+g.radius:-1;
 if(g.kind!=='sticky'&&g.kind!=='cushion')return -1;
 const center=g.y+g.radius,dy=Math.max(a.y-center,center-a.y-HUNT_CHARACTER_HEIGHT,0);
 if(dy>=g.radius-1e-7)return -1;
 return a.radius+(dy>0?Math.sqrt(g.radius*g.radius-dy*dy):g.radius);
}

// The interaction volume encloses the floating tool, not its overhead name.
// Its centre follows simulation time in both drawing and collection, including
// during pause/replay. Contact is physical; a hidden jump-count gate is not.
export function huntPickupHeight(p,time=0){return p.y+p.lift+Math.sin(time/.65+(p.bobPhase??0))*.15;}
export function huntSupplyContact(a,p,time=0){
 if(!p.lift)return a.grounded&&Math.abs(a.y-p.y)<1&&Math.hypot(a.x-p.x,a.z-p.z)<a.radius+1.2;
 const centre=huntPickupHeight(p,time),vertical=Math.max(a.y-centre,centre-a.y-HUNT_CHARACTER_HEIGHT,0)/1.8;
 if(vertical>=1)return false;
 const reach=a.radius+1.45*Math.sqrt(1-vertical*vertical);
 return Math.hypot(a.x-p.x,a.z-p.z)<reach;
}
