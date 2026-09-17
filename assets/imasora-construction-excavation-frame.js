// Discard overdue wall time rather than running an unbounded catch-up loop.
// Every simulated step still uses the same physical timestep and soil ledger.
export const EXCAVATION_STEP=1/120;
export const EXCAVATION_FRAME_STEPS=4;
export function excavationFrameBudget(remainder,dt,slow=false){
 if(!Number.isFinite(dt)||dt<=0)return {steps:0,remainder:0};
 const prior=Number.isFinite(remainder)?Math.max(0,Math.min(remainder,EXCAVATION_STEP)):0;
 const available=Math.min(EXCAVATION_FRAME_STEPS*EXCAVATION_STEP,prior+dt*(slow?.25:1));
 const steps=Math.min(EXCAVATION_FRAME_STEPS,Math.floor((available+1e-12)/EXCAVATION_STEP));
 return {steps,remainder:Math.max(0,available-steps*EXCAVATION_STEP)};
}
