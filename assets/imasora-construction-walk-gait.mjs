// Animate distance actually walked, regardless of keyboard or touch-pad input.
// Holding against a wall, pausing, jumping and sitting must not walk in place.
export function createConstructionWalkGait(){
 let last=null,phase=0;
 return{update(p,walking,dt){const distance=last?Math.hypot(p.x-last.x,p.z-last.z):0;last={x:p.x,z:p.z};
  if(!walking||!dt||distance<1e-5||distance>16){phase=0;return[0,0];}
  phase+=distance*.22;return[0,1].map(i=>Math.max(0,Math.sin(phase+i*Math.PI))*1.2);
 },reset(){last=null;phase=0;}};
}
