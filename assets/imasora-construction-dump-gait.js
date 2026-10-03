// Motion comes from distance actually travelled, including the boarding path.
export function createDumpGait(character){
 const feet=character.userData.feet.map(o=>({o,y:o.position.y,z:o.position.z}));
 const hands=character.userData.hands.map(o=>({o,z:o.position.z}));
 let phase=0;
 return (distance,{seated=false,paused=false,sampled=true}={})=>{
  // A render between fixed physics ticks is not a stop (e.g. a 144 Hz display).
  if(!sampled&&!seated&&!paused)return;
  const moving=!seated&&!paused&&Number.isFinite(distance)&&distance>1e-6;
  if(moving)phase=(phase+distance*.24)%(Math.PI*2);
  feet.forEach(({o,y,z},i)=>{const step=phase+i*Math.PI;o.position.y=y+(moving?Math.max(0,Math.sin(step))*3.6:0);o.position.z=z+(moving?Math.cos(step)*2.2:0);});
  hands.forEach(({o,z},i)=>o.position.z=z+(moving?-Math.cos(phase+i*Math.PI)*2:0));
 };
}
