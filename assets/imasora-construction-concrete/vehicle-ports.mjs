// The stationary upper-floor outlet is real equipment, separate from the supply inlet.
// Model and live contact share these dimensions; historical drive replay keeps its old envelope.
export const UPPER_PUMP_PORT=Object.freeze({x:15,y:24,z:-47.25});
export const UPPER_PUMP_COUPLER=Object.freeze({ringRadius:1.65,tubeRadius:.45,stemRadius:1.1,stemZ:-38});
export const upperPumpContactPart=()=>{
 const p=UPPER_PUMP_PORT,c=UPPER_PUMP_COUPLER,r=c.ringRadius+c.tubeRadius,
 lo=Math.min(p.z-c.tubeRadius,c.stemZ-c.stemRadius),hi=Math.max(p.z+c.tubeRadius,c.stemZ+c.stemRadius);
 return{x:p.x,z:(lo+hi)/2,hx:r,hz:(hi-lo)/2};
};
