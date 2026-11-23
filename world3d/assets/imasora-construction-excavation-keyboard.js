// Keyboard state belongs to the current input gesture, never to a save record.
export const EXCAVATION_KEYS=Object.freeze(['KeyW','KeyA','KeyS','KeyX','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyJ','KeyB','KeyK','KeyR','KeyF','KeyG','KeyQ','KeyE','KeyZ','KeyC','KeyH']);
export const EXCAVATION_WORK_KEYS=Object.freeze(['KeyJ','KeyH']);
const TRAVEL_KEYS=['KeyW','KeyA','KeyS','KeyX','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
export function excavationTravelRequested(keys,actions=[]){
  const forward=keys.has('KeyW')||keys.has('ArrowUp')||actions.includes('forward')||actions.includes('accelerate');
  const back=keys.has('KeyS')||keys.has('KeyX')||keys.has('ArrowDown')||actions.includes('back')||actions.includes('reverse');
  return forward!==back;
}
export function excavationSlewInput(keys,actions=[]){
  // A/D belongs to the tracks while forward/reverse is requested, including
  // when a wall stops actual travel. At rest A/D rotates the cab.
  if(excavationTravelRequested(keys,actions))return 0;
  const right=keys.has('KeyD')||keys.has('ArrowRight')||actions.includes('right')||actions.includes('slew-right');
  const left=keys.has('KeyA')||keys.has('ArrowLeft')||actions.includes('left')||actions.includes('slew-left');
  return Number(right)-Number(left);
}
export function createExcavationKeyboard(){
  const keys=new Set(),down=new Set();
  return {keys,
    press(code,{mode='foot',blocked=false,repeat=false,modified=false}={}){
      if(!EXCAVATION_KEYS.includes(code))return null;
      const fresh=!down.has(code)&&!repeat;down.add(code);
      // Consume presses made while busy/paused too. Holding through completion
      // or a mode switch must never start a new job without a fresh key press.
      if(blocked||modified||!fresh||mode==='foot'&&code==='KeyX')return null;
      if(EXCAVATION_WORK_KEYS.includes(code)){
        if(!['working','driving'].includes(mode))return null;
        if(code==='KeyJ')return 'scoop';
        if(code==='KeyH')return 'dump';
      }else if(mode==='working'&&!TRAVEL_KEYS.includes(code)&&!['Space','KeyK'].includes(code)){
        return null;
      }
      keys.add(code);return 'hold';
    },
    release(code){down.delete(code);keys.delete(code);},
    clear(){keys.clear();}, // UI actions stop motion, but keep the key latch.
    reset(){keys.clear();down.clear();} // Focus loss discards the whole gesture.
  };
}
