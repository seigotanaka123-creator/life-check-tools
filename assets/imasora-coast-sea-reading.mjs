// Presentation only: read the raft as it is now. Never sample the sea, the
// tide or the next wave, and never add fields to the physical/saved boat.
const names=['safe','caution','danger'];
export function createCoastRaftDanger(){
 let boat=null,level=0,pending=null,since=0,last=-Infinity;
 const reset=()=>{boat=null;level=0;pending=null;since=0;last=-Infinity;return null;};
 return {reset,update(sample,now){
  if(!sample?.id||!Number.isFinite(sample.tilt)||!Number.isFinite(sample.load)||!Number.isFinite(now))return reset();
  if(boat!==sample.id||now<last){reset();boat=sample.id;}
  last=now;
  const {tilt,load}=sample,roll=Math.max(0,sample.rollRate||0);
  const severe=tilt>=35||load>=1||(tilt>=25&&roll>=1.2);
  const wary=tilt>=18||load>=.82||(tilt>=12&&roll>=.7);
  let next=severe?2:wary?1:0;
  // Different entry/exit thresholds prevent ordinary wave motion from
  // flickering at a boundary. Improving conditions must last 0.8 seconds.
  if(level===2&&(tilt>=28||load>=.94||(tilt>=22&&roll>=.9)))next=2;
  else if(level>=1&&(tilt>=12||load>=.76||(tilt>=8&&roll>=.5)))next=Math.max(next,1);
  if(next>=level){level=next;pending=null;}
  else if(pending!==next){pending=next;since=now;}
  else if(now-since>=800){level=next;pending=null;}
  return names[level];
 }};
}
