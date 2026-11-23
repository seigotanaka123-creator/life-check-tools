// Keep initial scene construction in its original order, with paint/input gaps.
// Ordinary in-game rebuilds remain synchronous, so collisions never use half a map.
// An explicit trip from town must win over a bookmark on a different map.
// Reopening the same destination still resumes the saved position and work.
const townDestinations={'town-bridge1':'construction','town-bridge2':'coast','town-station':'sky'};
export function hasTownStationStoryAccess(world,progress){
 return alreadyReachedRainStation(world)||(world?.coastSkyDiagramRead===true&&progress?.catcher===true&&progress.stationBriefed===true);
}
export function completedTownArrivalUrl(href,currentMap){
 const url=new URL(href),target=townDestinations[url.searchParams.get('arrival')];
 if(!target||target!==currentMap)return null;
 url.searchParams.delete('arrival');return url.href;
}
export function shouldApplyTownArrival(saved,{arrival,auto=false}={}){
 const target=townDestinations[arrival];
 if(!target)return false;
 if(saved?.map!==target)return true;
 return !auto&&saved?.autoSaveVersion!==1;
}
// Animation frames can stop entirely while a phone backgrounds or restores a
// tab. Scene preparation must not depend on receiving one to finish loading.
export function nextWorldSceneTask({frame=globalThis.requestAnimationFrame,cancel=globalThis.cancelAnimationFrame,timer=setTimeout,clear=clearTimeout}={}){
 return new Promise(resolve=>{let done=false,frameId=null,timerId=null;const finish=()=>{if(done)return;done=true;if(frameId!==null)cancel?.(frameId);if(timerId!==null)clear(timerId);resolve();};timerId=timer(finish,50);if(typeof frame==='function')frameId=frame(finish);});
}
const nextPaint=nextWorldSceneTask;
export async function buildWorldSceneSteps(steps,{yieldTask=nextPaint,sliceMs=8,now=()=>performance.now()}={}){
 let deadline=now()+sliceMs;
 for(const step of steps){if(now()>=deadline){await yieldTask();deadline=now()+sliceMs;}}
}

const prefix = 'imasora.rain.arcade.v1.';
const games = new Set(['catcher', 'triLink', 'pachicoin']);

export function rainArcadeProgress(storage) {
  const complete = game => storage.getItem(prefix + game + '.complete') === '1';
  const scene = name => storage.getItem(prefix + 'scene.' + name) === '1';
  return {
    catcher: complete('catcher'), triLink: complete('triLink'), pachicoin: complete('pachicoin'),
    stationBriefed: scene('station'), windBriefed: scene('wind'), originBriefed: scene('origin'),
    driverBriefed: scene('station-driver'),
  };
}

export function recordRainArcadeResult(storage, game) {
  if (games.has(game) && game !== 'triLink') storage.setItem(prefix + game + '.result', '1');
}

export function finishRainArcadePlay(storage, game, match = null) {
  if (!games.has(game)) return false;
  const qualified = game === 'triLink'
    ? !!match?.id && Array.isArray(match.participants) &&
      match.participants.some(player => player.role === 'current' && Number(player.goalsFor) > 0)
    : storage.getItem(prefix + game + '.result') === '1';
  if (!qualified) return false;
  storage.setItem(prefix + game + '.complete', '1');
  return true;
}

export function alreadyReachedRainStation(world) {
  return !!(world?.rainSkyV1 || world?.skyMarsObservatoryClue || world?.rainStoryV1?.length);
}

export function canStartRainWindChapter(world, progress) {
  const story = world?.rainStoryV1 ?? [];
  return story.includes('water-delivery-return') ||
    ['changed-wind', 'diagram-matched'].includes(world?.rainSkyV1) ||
    (world?.rainAmaneV1 === 'baltia-reported' && progress.triLink && progress.windBriefed);
}

export function nextRainArcadeScene(storage, world, { introduced = false } = {}) {
  const progress = rainArcadeProgress(storage);
  const seen = name => storage.getItem(prefix + 'scene.' + name) === '1';
  if (world?.rainStoryV1?.includes('water-delivery-return')) {
    if (progress.pachicoin && !seen('origin') && !world.rainStoryV1.includes('cloud-rescue-complete')) return 'origin';
    return null;
  }
  if (world?.rainAmaneV1 === 'baltia-reported') {
    if (progress.triLink && !seen('wind') && !['changed-wind', 'diagram-matched'].includes(world.rainSkyV1)) return 'wind';
    return null;
  }
  if (world?.coastSkyDiagramRead && progress.catcher && !alreadyReachedRainStation(world) && !seen('station')) return 'station';
  if (introduced && !world?.coastSkyDiagramRead && !alreadyReachedRainStation(world) && !seen('island')) return 'island';
  return null;
}

export function markRainArcadeScene(storage, scene) {
  storage.setItem(prefix + 'scene.' + scene, '1');
}

export function skyInspectionAccess(world, progress) {
  if (world?.rainStoryV1?.at(-1) !== 'water-delivery-return') return null;
  if (!progress?.originBriefed) return 'arcade';
  return progress.driverBriefed ? 'inspection' : 'driver';
}
