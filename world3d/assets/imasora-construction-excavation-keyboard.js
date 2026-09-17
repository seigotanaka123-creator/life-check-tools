// Keyboard state belongs to the current input gesture, never to a save record.
export const EXCAVATION_KEYS=Object.freeze(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyR','KeyF','KeyT','KeyG','KeyQ','KeyE','KeyZ','KeyC']);
export function createExcavationKeyboard(){
  const keys=new Set(),down=new Set();
  return {keys,
    press(code,{mode='foot',blocked=false,repeat=false,modified=false}={}){
      if(!EXCAVATION_KEYS.includes(code))return null;
      const fresh=!down.has(code)&&!repeat;down.add(code);
      // Consume presses made while busy/paused too. Holding through completion
      // or a mode switch must never start a new job without a fresh key press.
      if(blocked||modified||!fresh)return null;
      if(mode==='working'){
        if(code==='KeyW')return 'scoop';
        if(code==='KeyS')return 'dump';
        if(code!=='KeyA'&&code!=='KeyD')return null;
      }
      keys.add(code);return 'hold';
    },
    release(code){down.delete(code);keys.delete(code);},
    clear(){keys.clear();}, // UI actions stop motion, but keep the key latch.
    reset(){keys.clear();down.clear();} // Focus loss discards the whole gesture.
  };
}
