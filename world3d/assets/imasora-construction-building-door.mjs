import{stairPlacement,stairPoint,stairBox,stairEntry,stairExit,stairGround,stairDoor,stairApproach}from'./imasora-construction-stair-placement.mjs?v=120gn';
export const ENTRANCE_DOOR_TIMBER=1680;
export function validateEntranceDoor(d){if(!d||Object.keys(d).sort().join('|')!=='open|version'||d.version!==1||typeof d.open!=='boolean')throw Error('とびらの記録はそのまま残しているよ。');return d;}
export function doorJob(type){return['DOOR_INSTALL','DOOR_REMOVE','DOOR_OPEN','DOOR_CLOSE'].includes(type);}
export function entranceDoorProgress(w){if(!w.entranceDoor)return null;const from=w.entranceDoor.open?1:0,t=Math.min(1,(w.job?.elapsed??0)/.6);return w.job?.type==='DOOR_OPEN'?from+(1-from)*t:w.job?.type==='DOOR_CLOSE'?from*(1-t):from;}
// A sliding leaf sits outside the columns. Opening never sweeps through a room.
export function entranceDoorParts(w){const t=entranceDoorProgress(w);if(t===null)return[];return[{kind:'frame',x:-64,y:17,z:72,w:2,h:34,d:3},{kind:'frame',x:-32,y:17,z:72,w:2,h:34,d:3},{kind:'frame',x:-48,y:34,z:72,w:34,h:2,d:3},{kind:'track',x:-65,y:35,z:76,w:68,h:2,d:2},{kind:'leaf',x:-48-34*t,y:16,z:76,w:30,h:32,d:1}].map(b=>stairBox(w,b));}
export function doorStepAllowed(w,type){if(w.version!==5||w.levels!==w.blueprint.storeys.length||w.kit||w.job||w.actor.y!==0||Math.hypot(w.actor.x-stairDoor(w).x,w.actor.z-stairDoor(w).z)>2)return false;return type==='DOOR_INSTALL'?!w.entranceDoor:type==='DOOR_REMOVE'?!!w.entranceDoor:type==='DOOR_OPEN'?w.entranceDoor?.open===false:type==='DOOR_CLOSE'?w.entranceDoor?.open===true:false;}
export function entranceDoorWaits(w){return w.entranceDoor?.open===false;}
