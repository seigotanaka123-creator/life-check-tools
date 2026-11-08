import * as HomeEphemeris from './vendor/suncalc-2.1.2.mjs';

// The fictional room has a fixed Tokyo reference, without requesting location.
// Its rear window faces south: +Z is north, -X east, +X west.
export const HOME_SKY_REFERENCE=Object.freeze({latitude:35.6812,longitude:139.7671,name:'東京基準'});
export function homeJapanTime(now=Date.now()){
 const date=new Date(Number(now)+9*60*60*1000),hour=date.getUTCHours(),minute=date.getUTCMinutes(),second=date.getUTCSeconds()+date.getUTCMilliseconds()/1000;
 return{hour,minute,second,hourAngle:-(hour%12+minute/60+second/3600)*Math.PI/6,minuteAngle:-(minute+second/60)*Math.PI/30,secondAngle:-second*Math.PI/30};
}
export function homeClockSky(now=Date.now()){
 const date=new Date(Number(now)),{latitude,longitude}=HOME_SKY_REFERENCE,vector=position=>{const az=position.azimuth*Math.PI/180,alt=position.altitude*Math.PI/180;return{x:-Math.sin(az)*Math.cos(alt),y:Math.sin(alt),z:Math.cos(az)*Math.cos(alt),altitude:position.altitude,azimuth:position.azimuth};};
 const sun=vector(HomeEphemeris.getPosition(date,latitude,longitude)),moon=vector(HomeEphemeris.getMoonPosition(date,latitude,longitude)),illumination=HomeEphemeris.getMoonIllumination(date);
 const clamp=x=>Math.max(0,Math.min(1,x)),daylight=clamp((sun.altitude+6)/12),dusk=clamp(1-Math.abs(sun.altitude)/10);
 return{japan:homeJapanTime(now),sun,moon,daylight,dusk,moonFraction:illumination.fraction};
}
