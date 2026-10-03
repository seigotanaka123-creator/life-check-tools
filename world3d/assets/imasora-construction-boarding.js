// All construction vehicles use the same small, ground-level driver-door zone.
// The anchor is outside the actual driver-side step, in the vehicle/cab heading.
export function atDriverDoor(player,anchor,heading){
 if(!player||!anchor||![player.x,player.z,player.y??0,anchor.x,anchor.z,heading].every(Number.isFinite))return false;
 if(Math.abs((player.y??0)-(anchor.y??0))>.5||Math.abs(player.vy??0)>.1)return false;
 const dx=player.x-anchor.x,dz=player.z-anchor.z,c=Math.cos(heading),s=Math.sin(heading);
 return Math.abs(dx*c-dz*s)<=8&&Math.abs(dx*s+dz*c)<=10;
}
export function setBoardPrompt(button,mode,available){
 button.hidden=mode==='foot'&&!available;
 if(mode==='foot')button.textContent='運転席に乗る';
}
