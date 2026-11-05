import{huntOpticalHidden}from'./imasora-sliding-tag-hunt-sight.mjs';
// Coarse sectors and three distance bands: no exact position, distance or route.
// Both UI and CPU receive coarse information only while their own item is active.
export function huntRadarFor(s,observer,yaw=0){
 const remaining=Math.max(0,(observer.effects?.radar??0)-s.time),hunting=observer!==s.player;
 if(!remaining||s.phase==='finished')return{active:false,remaining:0,mode:hunting?'hunt':'escape',danger:'clear',contacts:[]};
 const enemies=hunting?[s.player,...(s.gadgets??[]).filter(g=>g.kind==='clone'&&g.owner===s.player.owner&&Number.isFinite(g.until)&&g.until>s.time).map(g=>({x:g.x,z:g.z,vx:g.vx,vz:g.vz,owner:'echo:'+g.id,role:'runner'}))]:s.hunters,contacts=[];let danger='clear';
 for(const a of enemies){if(huntOpticalHidden(s,observer,a))continue;const dx=a.x-observer.x,dz=a.z-observer.z,d=Math.hypot(dx,dz);
  const closing=-((a.vx-observer.vx)*dx+(a.vz-observer.vz)*dz)/(d||1),level=d<36?'danger':d<95||closing>3&&d<130?'warning':'clear';
  if(level==='danger'||level==='warning'&&danger==='clear')danger=level;
  const sector=((Math.round((Math.atan2(dx,dz)-yaw)*4/Math.PI)%8)+8)%8,band=d<45?1:d<110?2:3;
  contacts.push({owner:a.owner,sector,band,level,role:a.role??'runner'});
 }return{active:true,remaining,mode:hunting?'hunt':'escape',danger,contacts};
}
export function huntRadar(s,yaw=0){return huntRadarFor(s,s.config.mode==='hunt'?s.hunters[0]:s.player,yaw);}
// Quantized observations deliberately contain no actual enemy position, speed,
// height, flight state or body size. Clone contacts remain plausible targets.
export function radarObservations(s,a){return huntRadarFor(s,a).contacts.map(p=>{const angle=p.sector*Math.PI/4,d=[0,24,76,148][p.band];return{owner:p.owner,x:a.x+Math.sin(angle)*d,z:a.z+Math.cos(angle)*d,y:a.y,vx:0,vz:0,radius:2.7,radar:true};});}
// North is -Z. Live UI passes the actual resolved camera yaw, including orbit
// and obstacle avoidance. Body facing remains a fallback for non-view callers.
export function huntCompass(s,viewYaw){const a=s.config.mode==='hunt'?s.hunters[0]:s.player,camera=Number.isFinite(viewYaw),angle=camera?-viewYaw:Math.PI-a.yaw,heading=((angle%(Math.PI*2))+Math.PI*2)%(Math.PI*2);return{...huntRadar(s,0),heading,facing:['北','北東','東','南東','南','南西','西','北西'][Math.round(heading/(Math.PI/4))%8],headingSource:camera?'camera':'body'};}
