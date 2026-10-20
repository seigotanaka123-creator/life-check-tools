import {nativeSavedWorkPending} from './imasora-construction-native-door.mjs?v=120gm';
import {actorPose} from './imasora-construction-loader-physics.js?v=120gf';
import {SOIL_YARDS} from './imasora-construction-world-soil.js?v=120gn';

// This is a scene bookmark, never an alternative copy of materials or work.
// An explicit null means the player finished the session or saved another map.
export function soilStartupResume(world,{mode='live',preview=false,arrival=null}={}){
 if(mode!=='live'||preview||world?.map!=='construction'||arrival&&arrival!=='town-bridge1')return null;
 const record=world.constructionSoil;
 if(!record?.work?.loader||!Number.isSafeInteger(record.revision))return null;
 if(Object.hasOwn(world,'constructionResume')){
  const point=world.constructionResume;
  return point?.kind==='soil'&&point.revision===record.revision&&Number.isInteger(point.view)&&point.view>=0&&point.view<3
   ?{revision:point.revision,view:point.view}:null;
 }
 // Older saves have no bookmark. Only a saved rider/interrupted operation at
 // the scene's actual saved position can claim startup; an old parked loader
 // or a different vehicle's saved work must not pull the player across the map.
 if(!nativeSavedWorkPending(record))return null;
 const origin=SOIL_YARDS[record.siteIndex],p=actorPose(record.work.loader),position=world.position;
 // A tilted cabin shifts the seat slightly in X/Z. This only selects a
 // candidate; the installed scene must confirm the exact grounded actor pose.
 return origin&&Number.isFinite(position?.x)&&Number.isFinite(position?.z)&&
  Math.hypot(position.x-origin[0]-p.x,position.z-origin[1]-p.z)<3
  ?{revision:record.revision,view:0,legacyPosition:{x:position.x,z:position.z}}:null;
}

export function soilStartupPositionMatches(point,position){
 return !point?.legacyPosition||Number.isFinite(position?.x)&&Number.isFinite(position?.z)&&
  Math.hypot(point.legacyPosition.x-position.x,point.legacyPosition.z-position.z)<.1;
}
