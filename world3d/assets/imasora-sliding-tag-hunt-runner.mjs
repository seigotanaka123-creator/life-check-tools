import{huntJumpRestRemaining}from'./imasora-sliding-tag-hunt-jump-rest.mjs';
import{BODY,worldPilot,worldTraversable,worldSight}from'./imasora-sliding-tag-hunt-world.mjs';
import{trampolineLaunchSpeed}from'./imasora-sliding-tag-hunt-trampoline.mjs';
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function observeRunnerThreats(s,observations){
 const a=s.player,m=a.brain,old=m.avoidMemory??{},memory={},gear=m.observedGlasses??{};
 // Remember a visibly worn permanent item without remembering an unseen
 // position. Radar never provides a loadout or a new flight observation.
 for(const [owner,until]of Object.entries(gear))if(until<=s.time)delete gear[owner];
 for(const [owner,p]of Object.entries(old))if(s.time-p.at<5)memory[owner]=p;
 for(const h of observations){
  if(!old[h.owner])m.next=0;
  const radar=!!h.radar,clearSightUntil=radar?(gear[h.owner]??0):(h.effects?.sunglasses??0),airborneUntil=radar?(old[h.owner]?.airborneUntil??0):(h.flight?s.time+.9:0);
  if(!radar){if(clearSightUntil>s.time)gear[h.owner]=clearSightUntil;else delete gear[h.owner];}
  memory[h.owner]={owner:h.owner,x:h.x,y:h.y,z:h.z,vx:h.vx,vz:h.vz,radius:h.radius,airborne:airborneUntil>s.time,airborneUntil,clearSightUntil,radar,at:s.time};
 }
 m.observedGlasses=gear;m.avoidMemory=memory;m.escapeThreats=Object.values(memory).sort((x,y)=>gap(a,x)-gap(a,y));m.suppressSight=!observations.length;return m.escapeThreats;
}
export function runnerControl(s,observations){const a=s.player,threats=observeRunnerThreats(s,observations),m=a.brain;if(a.grounded&&m.airHeading){m.airHeading=null;m.next=0;}m.sprintUntil=s.time+3;if(m.target&&Math.hypot(m.target.x-a.x,m.target.z-a.z)<22&&s.time>=(m.closePlanAt??0)){m.next=0;m.closePlanAt=s.time+.2;}const input=worldPilot(a,threats[0]??s.hunters[0],false,s.time,m);input.dash=true;if(a.trampolineBoost&&!m.airHeading){const speed=Math.hypot(a.vx,a.vz),n=Math.hypot(input.x,input.z)||1;m.airHeading=speed>1?{x:a.vx/speed,z:a.vz/speed}:{x:input.x/n,z:input.z/n};}if(!a.grounded&&m.airHeading)Object.assign(input,m.airHeading,{dash:true});return input;}
export function runnerJumpControl(s,input){const a=s.player,m=a.brain,threats=m.escapeThreats??[];if(huntJumpRestRemaining(s,a)>0||m.supply||m.trampolineApproach||a.trampolineBoost){m.dodgeSince=null;return input;}
 const urgent=threats.some(t=>{const dx=t.x-a.x,dz=t.z-a.z,d=Math.hypot(dx,dz),closing=-((t.vx-a.vx)*dx+(t.vz-a.vz)*dz)/(d||1);return(!t.airborne||t.y-a.y<8)&&(t.airborne&&d-a.radius-t.radius<10||closing>1&&d-a.radius-t.radius-Math.min(20,closing)*.5<14);});
 if(m.dodgeSince==null&&urgent&&a.grounded&&s.time>=(m.nextDodgeAt??0)){const speed=Math.hypot(a.vx,a.vz),n=Math.hypot(input.x,input.z)||1,dx=speed>5?a.vx/speed:input.x/n,dz=speed>5?a.vz/speed:input.z/n,aligned=speed<5||(dx*input.x+dz*input.z)/n>.65,landing={x:a.x+dx*Math.max(30,speed*1.8),z:a.z+dz*Math.max(30,speed*1.8)};if(aligned&&worldTraversable(a,landing,a.radius+.2)){m.dodgeSince=s.time;m.nextDodgeAt=s.time+3;m.dodgeDirection={x:dx,z:dz};}}
 if(m.dodgeSince!=null){const elapsed=s.time-m.dodgeSince;if(elapsed>.3&&a.grounded){m.dodgeSince=null;return input;}return{...input,...m.dodgeDirection,dash:true,jump:elapsed<.16?true:elapsed<.19?false:elapsed<.42?true:elapsed<.45?false:elapsed<.75?true:a.vy>0&&a.jumpHeld};}return input;
}
export function safeTrampolineApproach(s){
 const a=s.player,p=s.trampoline;if(!p||p.used)return false;
 const speed=Math.hypot(a.vx,a.vz),d=gap(a,p),threats=a.brain.escapeThreats??[];
 if(speed>4&&d>1){
  const flight=2*p.launch/BODY.gravity,launchSpeed=trampolineLaunchSpeed(speed),dx=(p.x-a.x)/d,dz=(p.z-a.z)/d;
  // Only observed/remembered hunters inform this decision. A clear mat can
  // still launch the runner into a hunter's reachable landing area.
  const approach=Math.max(0,d-p.radius)/speed;
  const landing={x:p.x+dx*launchSpeed*flight,z:p.z+dz*launchSpeed*flight};
  // Once the approach jump is in the air, the mat can pass behind the body;
  // do not reinterpret that reversed vector as a new takeoff direction.
  for(const t of a.grounded?threats:[]){
   const reach=(approach+flight+.2)*Math.max(BODY.dash,Math.hypot(t.vx??0,t.vz??0));
   if(Math.hypot(landing.x-t.x,landing.z-t.z)<reach+a.radius+t.radius+4)return false;
  }
  let from={x:p.x,y:p.y+1,z:p.z};
  for(let i=1;i<=12;i++){const t=flight*i/12,q={x:p.x+dx*launchSpeed*t,z:p.z+dz*launchSpeed*t,y:p.y+1+p.launch*t-BODY.gravity*t*t/2};if(!worldSight(from,q,a.radius+.2))return false;from=q;}
 }
 return threats.every(t=>{const dx=p.x-a.x,dz=p.z-a.z,length=dx*dx+dz*dz,f=Math.max(0,Math.min(1,((t.x-a.x)*dx+(t.z-a.z)*dz)/(length||1)));return Math.hypot(a.x+dx*f-t.x,a.z+dz*f-t.z)>a.radius+t.radius+4;})&&worldTraversable(a,p,a.radius+.2);
}

// Close pursuit needs an immediate open corridor, rather than reversing into a
// hunter because a long graph route begins behind the runner. Bounded local
// steering uses only the three observed/remembered threats and normal input.
export function runnerPressureControl(s,input){const a=s.player,m=a.brain,threats=(m.escapeThreats??[]).filter(t=>!t.airborne||t.y-a.y<8);if(!a.grounded||m.supply||m.trampolineApproach||!threats.some(t=>gap(a,t)<42))return input;
 const length=Math.hypot(input.x,input.z),ahead=length>.1&&worldTraversable(a,{x:a.x+input.x/length*25,z:a.z+input.z/length*25},a.radius+.2),intoThreat=threats.some(t=>gap(a,t)<26&&((t.x-a.x)*input.x+(t.z-a.z)*input.z)/(gap(a,t)*(length||1))>.15);if(ahead&&!intoThreat)return input;if(s.time>=(m.pressureAt??0)||!m.pressureDirection){m.pressureAt=s.time+.18;const top=BODY.dash*(a.tuning?.speed??1),speed=Math.hypot(a.vx,a.vz),choices=[{x:input.x,z:input.z},...Array.from({length:8},(_,i)=>({x:Math.sin(i*Math.PI/4),z:Math.cos(i*Math.PI/4)}))];let best=null,score=-Infinity;
  for(const q of choices){const n=Math.hypot(q.x,q.z);if(n<.1)continue;const x=q.x/n,z=q.z/n,p={x:a.x+x*(top*1.15+8),z:a.z+z*(top*1.15+8)};if(!worldTraversable(a,p,a.radius+.2))continue;let margin=Infinity;for(const at of[.3,.65,1.1])for(const t of threats){const px=a.x+a.vx*at*.25+x*top*at*.75,pz=a.z+a.vz*at*.25+z*top*at*.75; margin=Math.min(margin,Math.hypot(px-t.x-(t.vx??0)*at,pz-t.z-(t.vz??0)*at)-a.radius-t.radius,Math.hypot(px-t.x,pz-t.z)-a.radius-t.radius);}
   const alignment=speed>3?(x*a.vx+z*a.vz)/speed:1,held=m.pressureDirection&&(x*m.pressureDirection.x+z*m.pressureDirection.z)>.95?2:0,value=margin*3+alignment*6+held;if(value>score){score=value;best={x,z};}}
  m.pressureDirection=best;
 }return m.pressureDirection?{...input,...m.pressureDirection,dash:true}:input;
}
