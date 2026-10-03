// The existing cargo is the volume authority. Never shrink it to fit the old particles.
// Fixed representation of cbrt(232): engines may otherwise differ by one ULP.
export const DUMP_SOIL=Object.freeze({width:48,height:8,depth:29,capacity:48,volume:48*8*29/48,grain:6.144633651371695});
export const soilSize=p=>p.grain===4?4:DUMP_SOIL.grain;
export const soilSnap=(n,g=DUMP_SOIL.grain)=>Math.round(n/g)*g;
export const soilOnGrid=(n,g=DUMP_SOIL.grain)=>Math.abs(n/g-Math.round(n/g))<1e-8;
export const soilLevel=(y,g=DUMP_SOIL.grain)=>Math.round((y-g/2)/g);
