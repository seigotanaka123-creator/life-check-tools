import {createMonsterTravelInput} from './imasora-construction-concrete/monster-travel-input.mjs';
import {createConstructionMovePad} from './imasora-construction-concrete/move-pad.mjs';

// Main-world and UFO sticks use the same release rules as construction play.
// A Safari finger has one Touch.identifier owner, never a second pointer owner.
export function createWorldMovePad({element,enabled,context,onVector,windowTarget=globalThis.window,documentTarget=globalThis.document}) {
 const input=createMonsterTravelInput({enabled,context,onStop:()=>onVector(0,0),windowTarget,documentTarget});
 const pad=createConstructionMovePad({element,input,enabled,windowTarget,documentTarget,onChange(){const v=input.vector;onVector(v.x,v.z);}});
 return {sync(){pad.sync();},cancel(){pad.cancel();input.reset();},get held(){return input.held;},dispose(){pad.dispose();input.dispose();}};
}
