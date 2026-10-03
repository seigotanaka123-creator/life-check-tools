// Fixed game quantities; these are not real-world concrete specifications.
export const CONCRETE_RECIPE=Object.freeze({version:'earth-concrete-standard-v1',cement:150,sand:350,gravel:400,water:100});
export const MIX_DURATION_MS=5000;
export const CURE_DURATION_MS=30000;
export const MAX_BATCH_CELLS=8;
const fail=message=>{throw Error(message);};
export function ingredientAmount(cells){
 if(!Number.isSafeInteger(cells)||cells<0||cells>Math.floor(Number.MAX_SAFE_INTEGER/1000))fail('INVALID_INGREDIENT_AMOUNT');
 return Object.fromEntries(['cement','sand','gravel','water'].map(key=>[key,cells*CONCRETE_RECIPE[key]]));
}
export function createMixer(){return{recipeVersion:CONCRETE_RECIPE.version,receivedCells:0,mixedCells:0,ingredients:ingredientAmount(0),pending:null};}
export function availableMixCells(mixer){
 return Math.min(...Object.keys(ingredientAmount(0)).map(key=>Math.floor(mixer.ingredients[key]/CONCRETE_RECIPE[key])));
}
export function supplyIngredients(mixer,cells){
 const amount=ingredientAmount(cells),total=mixer.receivedCells+cells;ingredientAmount(total);
 mixer.receivedCells=total;for(const key of Object.keys(amount))mixer.ingredients[key]+=amount[key];
}
export function startMix(mixer,cells,id){
 if(mixer.pending)fail('MIX_ALREADY_RUNNING');
 if(!Number.isSafeInteger(cells)||cells<1||cells>MAX_BATCH_CELLS)fail('INVALID_MIX_BATCH');
 if(cells>availableMixCells(mixer))fail('INSUFFICIENT_MIX_INGREDIENTS');
 const amount=ingredientAmount(cells);for(const key of Object.keys(amount))mixer.ingredients[key]-=amount[key];
 mixer.pending={id,cells,elapsedMs:0};
}
export function advanceMix(mixer,id,elapsedMs){
 if(!mixer.pending||mixer.pending.id!==id)fail('MIX_ID_MISMATCH');
 if(!Number.isSafeInteger(elapsedMs)||elapsedMs<1||elapsedMs>MIX_DURATION_MS-mixer.pending.elapsedMs)fail('INVALID_MIX_ELAPSED');
 mixer.pending.elapsedMs+=elapsedMs;
 if(mixer.pending.elapsedMs<MIX_DURATION_MS)return 0;
 const cells=mixer.pending.cells;mixer.mixedCells+=cells;mixer.pending=null;return cells;
}
export function cancelMix(mixer,id){
 if(!mixer.pending||mixer.pending.id!==id)fail('MIX_ID_MISMATCH');
 const amount=ingredientAmount(mixer.pending.cells);for(const key of Object.keys(amount))mixer.ingredients[key]+=amount[key];mixer.pending=null;
}
