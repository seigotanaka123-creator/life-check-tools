import {BUCKET} from './c2-3d-physics.mjs';
import {assertTrialState,transitionTrial} from './c2-formwork-trial.mjs';
export const TOOL=Object.freeze({stationX:27.5,carry:{x:15.2,y:15,z:9.5},pourGrip:{x:6,y:17,z:15},pourAngle:70*Math.PI/180,bladeWidth:4,bladeDepth:8,bladeThickness:.3,maxPoleLength:30});
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const mix=(a,b,t)=>a+(b-a)*t;
export function localToWorld(p,actor,heading){const c=Math.cos(heading),s=Math.sin(heading);return{x:actor.x+c*p.x+s*p.z,y:actor.y+p.y,z:actor.z-s*p.x+c*p.z};}
export function worldToLocal(p,actor,heading){const x=p.x-actor.x,z=p.z-actor.z,c=Math.cos(heading),s=Math.sin(heading);return{x:c*x-s*z,y:p.y-actor.y,z:s*x+c*z};}
export function atToolStation(actor){return Number.isFinite(actor?.x)&&Number.isFinite(actor?.y)&&Number.isFinite(actor?.z)&&Math.hypot(actor.x-TOOL.stationX,actor.z)<1&&Math.abs(actor.y)<.05&&actor.grounded===true;}
export function pourPose(progress,state,actor){
 const t=clamp(progress),lift=t<.24?smooth(t/.24):t>.82?1-smooth((t-.82)/.18):1;
 const grip=Object.fromEntries(['x','y','z'].map(k=>[k,mix(TOOL.carry[k],TOOL.pourGrip[k],lift)]));
 const angle=TOOL.pourAngle*lift,q=clamp((t-.28)/.5),r=BUCKET.radius;
 // Pivot is the TOP of the handle. The low rim is the back rim of the tilted cup.
 const rimLocal={x:grip.x,y:grip.y-r*(Math.cos(angle)+Math.sin(angle)),z:grip.z+r*(Math.sin(angle)-Math.cos(angle))};
 const heading=-Math.PI/2,source=localToWorld(rimLocal,actor,heading),height=.5*(state.pouredCells+q);
 return{heading,grip,angle,q,remaining:1-q,height,source,target:{x:source.x,y:height,z:source.z},flow:t>=.28&&t<.78};
}
export function trowelPose(progress,{side,row,fromRow},actor){
 const t=clamp(progress),u=clamp((t-.15)/.7),reverse=row%2===1,heading=side===1?-Math.PI/2:Math.PI/2;
 const lift=t<.15?1-smooth(t/.15):t>.85?smooth((t-.85)/.15):0;
 const blade={x:side*mix(reverse?14:2,reverse?2:14,u),y:2+TOOL.bladeThickness/2+lift*3,z:-12+row*8};
 if(fromRow!==undefined){blade.x=side*(reverse?14:2);blade.y=5.15;blade.z=mix(-12+fromRow*8,-12+row*8,smooth(t));}
 const grip=localToWorld({x:6,y:12,z:9},actor,heading),joint={...blade,y:blade.y+.45};
 const poleLength=Math.hypot(joint.x-grip.x,joint.y-grip.y,joint.z-grip.z);
 if(poleLength>TOOL.maxPoleLength+.001)throw Error('TROWEL_OUT_OF_REACH');
 return{heading,grip,joint,blade,poleLength,contact:fromRow===undefined&&t>=.15&&t<=.85,coverage:u,side,row};
}
export function toolPlan(type,state,actor){
 assertTrialState(state);
 if(type==='LOAD_BUCKET'){
  if(!atSupplyStation(actor))throw Error('WALK_TO_SUPPLY_STATION');
  if(!['framed','pouring'].includes(state.stage)||state.bucketCells||state.pouredCells>=4||state.availableConcreteCells<1)throw Error('INVALID_LOAD_PREVIEW');
  return[{kind:'fill',duration:3000}];
 }
 if(!atToolStation(actor))throw Error('WALK_TO_TOOL_STATION');
 if(type==='PLACE_FORMWORK'){
  if(state.stage!=='unframed')throw Error('INVALID_FRAME_PREVIEW');
  const plan=[];for(const panel of FRAME_PANELS){if(panel.corner)plan.push({kind:'walk',point:panel.corner});plan.push({kind:'walk',point:panel.station},{kind:'hammer',panel:panel.id,duration:1600});}
  plan.push({kind:'walk',point:{x:27.5,z:27.5}},{kind:'walk',point:{x:27.5,z:0}});return plan;
 }
 if(type==='POUR'){if(state.bucketCells!==1||state.pouredCells>=4)throw Error('INVALID_POUR_PREVIEW');return[{kind:'pour',duration:2800}];}
 if(type==='FINISH_SURFACE'){
  if(state.stage!=='pouring'||state.pouredCells!==4||state.bucketCells)throw Error('INVALID_FINISH_PREVIEW');
  const plan=[];for(const side of [1,-1]){
   if(side===-1)for(const point of [{x:27.5,z:38},{x:-27.5,z:38},{x:-27.5,z:0}])plan.push({kind:'walk',point});
   for(let row=0;row<4;row++){if(row)plan.push({kind:'trowel-shift',side,row,fromRow:row-1,duration:350});plan.push({kind:'trowel',side,row,duration:1000});}
  }return plan;
 }return[];
}
// Preview owns no inventory. Only the completed gesture can reach commit.
export function createActionSequence({play,commit}){
 let active=false;
 return{get active(){return active;},async run(state,action,revision,onCommitting=()=>{}){
  if(active)throw Error('ACTION_ALREADY_RUNNING');
  const checked=transitionTrial(state,action,revision);active=true;
  try{if(!checked.duplicate)await play(action.type,structuredClone(state));onCommitting();return await commit(action,revision);}
  finally{active=false;}
 }};
}


export function assertToolReceipt(receipt){
 const finite=key=>Number.isFinite(receipt?.[key])&&receipt[key]>=0;
 if(!['maxGripError','maxLipError','maxBladeError','maxPoleLength','streamSamples','contactSamples'].every(finite)||receipt.maxGripError>1e-5)throw Error('TOOL_CONTACT_NOT_CONFIRMED');
 if(receipt.type==='POUR'){if(receipt.streamSamples<1||receipt.maxLipError>1e-5)throw Error('POUR_CONTACT_NOT_CONFIRMED');}
 else if(receipt.type==='FINISH_SURFACE'){const ids=receipt.completedBands;if(receipt.contactSamples<8||receipt.maxBladeError>1e-5||receipt.maxPoleLength>TOOL.maxPoleLength||!Array.isArray(ids)||ids.length!==8||new Set(ids).size!==8||ids.some(id=>!Number.isInteger(id)||id<0||id>7))throw Error('FINISH_CONTACT_NOT_CONFIRMED');}
 else if(receipt.type==='PLACE_FORMWORK'){
  const exact=(ids,count)=>Array.isArray(ids)&&ids.length===count&&new Set(ids).size===count&&ids.every(i=>Number.isInteger(i)&&i>=0&&i<count);
  if(!finite('maxHitError')||receipt.maxHitError>1e-5||!exact(receipt.completedPanels,8)||!exact(receipt.hammerHits,16))throw Error('FRAME_CONTACT_NOT_CONFIRMED');
 }
 else if(receipt.type==='LOAD_BUCKET'){
  if(!finite('fillSamples')||receipt.fillSamples<1||!finite('maxFillError')||receipt.maxFillError>1e-5||!finite('maxVolumeError')||receipt.maxVolumeError>1e-5)throw Error('LOAD_CONTACT_NOT_CONFIRMED');
 }
 else throw Error('UNKNOWN_TOOL_RECEIPT');
 return true;
}

// Eight fixed panels. A corner waypoint keeps the actor outside the future frame.
export const FRAME_PANELS=Object.freeze([
 {id:0,x:16.25,z:8,w:.5,d:16,heading:-Math.PI/2,station:{x:27.5,z:8}},
 {id:1,x:16.25,z:-8,w:.5,d:16,heading:-Math.PI/2,station:{x:27.5,z:-8}},
 {id:2,x:8,z:-16.25,w:16,d:.5,heading:0,station:{x:8,z:-27.5},corner:{x:27.5,z:-27.5}},
 {id:3,x:-8,z:-16.25,w:16,d:.5,heading:0,station:{x:-8,z:-27.5}},
 {id:4,x:-16.25,z:-8,w:.5,d:16,heading:Math.PI/2,station:{x:-27.5,z:-8},corner:{x:-27.5,z:-27.5}},
 {id:5,x:-16.25,z:8,w:.5,d:16,heading:Math.PI/2,station:{x:-27.5,z:8}},
 {id:6,x:-8,z:16.25,w:16,d:.5,heading:Math.PI,station:{x:-8,z:27.5},corner:{x:-27.5,z:27.5}},
 {id:7,x:8,z:16.25,w:16,d:.5,heading:Math.PI,station:{x:8,z:27.5}}
]);
export const SUPPLY=Object.freeze({station:{x:54,z:31},grip:{x:0,y:13.5,z:16},source:{x:54,y:10.5,z:15},bottom:10,area:256});
export function atSupplyStation(p){return Number.isFinite(p?.x)&&Number.isFinite(p?.z)&&Math.hypot(p.x-54,p.z-31)<.6&&p.grounded===true&&Math.abs(p.y)<.05;}
export function hammerPose(progress,panelId,actor){
 const panel=FRAME_PANELS[panelId];if(!panel)throw Error('INVALID_PANEL');
 const t=clamp(progress),heading=panel.heading,normal={x:-Math.sin(heading),z:-Math.cos(heading)};
 const hit={x:panel.x+normal.x*.95,y:3.2,z:panel.z+normal.z*.95};
 const contact=t>=.38&&t<=.46||t>=.68&&t<=.76;
 const pulse=t<.26?1:t<.38?1-smooth((t-.26)/.12):t<=.46?0:t<.58?smooth((t-.46)/.12):t<.68?1-smooth((t-.58)/.1):t<=.76?0:smooth((t-.76)/.16);
 const settle=smooth(t/.22),blend=t>.92?1-smooth((t-.92)/.08):settle;
 const rest=localToWorld({x:12,y:15,z:4},actor,heading),workGrip={x:hit.x-normal.x*3,y:hit.y+Math.sqrt(40)+3.5*pulse,z:hit.z-normal.z*3};
 const grip=Object.fromEntries(['x','y','z'].map(k=>[k,mix(rest[k],workGrip[k],blend)]));
 const panelY=mix(4,1,settle),brace={x:panel.x+normal.x*.28,y:panelY+.5,z:panel.z+normal.z*.28};
 return{heading,grip,brace,hit,panelY,contact,hammerAngle:Math.asin(3/7)*blend,hitId:contact?panelId*2+(t>.6?1:0):null,settled:settle===1};
}
export function fillPose(progress,state,actor){
 const t=clamp(progress),heading=Math.PI,blend=t<.22?smooth(t/.22):t>.8?1-smooth((t-.8)/.2):1;
 const grip=Object.fromEntries(['x','y','z'].map(k=>[k,mix(TOOL.carry[k],SUPPLY.grip[k],blend)]));
 // The last walk step settles exactly at the fill station: fixed nozzle, moving cup.
 const q=clamp((t-.3)/.4),cupBase=localToWorld({x:grip.x,y:grip.y-BUCKET.radius-8,z:grip.z},actor,heading);
 const target={...cupBase,y:cupBase.y+q*8},stockVolume=(state.availableConcreteCells-q)*512;
 return{heading,grip,q,flow:t>=.3&&t<.7,source:SUPPLY.source,target,stockHeight:stockVolume/SUPPLY.area,stockVolume,bucketVolume:q*512,lever:smooth((t-.22)/.08)*(1-smooth((t-.7)/.1))};
}
