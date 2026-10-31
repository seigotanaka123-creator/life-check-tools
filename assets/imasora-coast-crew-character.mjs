import * as T from './three.module.min.js';
import {coastOarlockStroke} from './imasora-coast-oarlock.mjs?v=120ob';
import {coastRigSpec} from './imasora-coast-rig.mjs?v=120mx';
import {coastAssembly,localPoint,worldPoint,rotate,qmul} from './imasora-coast-physics.mjs?v=120nz';
import {coastWave} from './imasora-coast-waves.mjs?v=120mx';
const cache=new WeakMap();
function measureCharacter(character){
 const rig=character?.userData.walkRig;if(!rig?.feet?.length)return null;let measure=cache.get(character);if(measure)return measure;
 character.rotation.set(0,0,0);character.position.set(0,0,0);character.updateMatrixWorld(true);const body=new T.Box3(),feet=new T.Box3();for(const child of character.children)if(!rig.feet.some(f=>f.part===child))body.expandByObject(child);for(const f of rig.feet)feet.expandByObject(f.part);
 // The buoy supports the torso, not the cape or wings. Decorations used to
 // enlarge it and force small monsters to reach far away with detached hands.
 const torso=character.userData.body,vertex=new T.Vector3();let torsoRadius=0;
 if(torso?.geometry?.attributes.position){const p=torso.geometry.attributes.position;for(let n=0;n<p.count;n++){vertex.fromBufferAttribute(p,n).applyMatrix4(torso.matrixWorld);torsoRadius=Math.max(torsoRadius,Math.hypot(vertex.x,vertex.z));}}
 const radius=Math.max(12,(torsoRadius+.6)/(1-3/19));
 const hands=(rig.hands??[]).map(h=>h.basePosition.clone().multiply(character.scale).toArray()),handHeight=hands.length?hands.reduce((sum,p)=>sum+p[1],0)/hands.length:body.min.y+6.2;
 let faceHeight=Infinity;for(const face of character.userData.faceFeatures??[]){face.getWorldPosition(vertex);faceHeight=Math.min(faceHeight,vertex.y);}
 measure={bodyBottom:body.min.y,footBottom:feet.min.y,scale:character.scale.y,radius,torsoRadius,hands,handHeight,faceHeight:Number.isFinite(faceHeight)?faceHeight:body.max.y,gripWidth:hands.length?Math.max(.35,Math.min(...rig.hands.map(h=>h.part.scale.x*character.scale.x))*.28):.6,handTarget:new T.Vector3()};cache.set(character,measure);return measure;
}
// A presentation pose only: never move the saved actor, boat or route. The
// official character stays upright with their face above water and holds the ring.
export function coastFloatingRescuePose(character,anchor,time){
 const measure=measureCharacter(character);if(!measure||!anchor||![anchor.x,anchor.z,time].every(Number.isFinite))return null;
 const radius=measure.radius,heading=Number.isFinite(anchor.heading)?anchor.heading:0;
 // Use the highest of nine samples across the ring so a crest cannot cover
 // the face or the hands, even in the large waves that caused the capsize.
 let water=coastWave(anchor.x,anchor.z,time).height;for(let n=0;n<8;n++){const a=n*Math.PI/4;water=Math.max(water,coastWave(anchor.x+Math.sin(a)*(radius+3),anchor.z+Math.cos(a)*(radius+3),time).height);}
 // Settle the body inside the buoy, with the original relaxed palms at its
 // handles. Do not drag a large body's hands downward to the waterline.
 const bottom=measure.bodyBottom-.14,rootY=Math.max(water+3.2-measure.handHeight,water+8-measure.faceHeight),rotation=[0,Math.sin(heading/2),0,Math.cos(heading/2)];
 const hands=measure.hands.map(p=>{const v=rotate(rotation,p);return[anchor.x+v[0],rootY+v[1],anchor.z+v[2]];});
 return{floating:true,walking:false,heading,radius,torsoRadius:measure.torsoRadius,gripWidth:measure.gripWidth,hands,point:[anchor.x,rootY+bottom,anchor.z],ring:[anchor.x,water+2,anchor.z]};
}
export function coastRowingStroke(time,rate,input,brake=false){
 const effort=input===true?1:Number.isFinite(input)?Math.max(-1,Math.min(1,input)):0;
 const phase=Number.isFinite(time)&&Number.isFinite(rate)?time*rate:0;
 return{sweep:brake?0:3.5*Math.cos(phase)*effort,lift:brake?0:1.8*Math.max(0,-Math.sin(phase))*Math.abs(effort)};
}
// The visible oars consume the actual palm centres after the official monster
// has been positioned, rather than guessing a second pair of hand locations.
export const coastRowingHands=character=>character?cache.get(character)?.grips??null:null;
// The existing official monster, with its actual feet and cape. No duplicate
// passenger is spawned in the solo game and no model is hidden in the hull.
export function positionCoastCrewCharacter(character,pose){
 if(!character||!pose)return false;const rig=character.userData.walkRig;if(!rig?.feet?.length)return false;
 const measure=measureCharacter(character);
 measure.grips=null;let bottom=measure.footBottom,rotation=pose.floating?[0,Math.sin(pose.heading/2),0,Math.cos(pose.heading/2)]:pose.board.q;
 if(!pose.walking){bottom=measure.bodyBottom;for(const f of rig.feet){f.part.position.copy(f.basePosition);f.part.position.y+=(measure.bodyBottom-measure.footBottom)/measure.scale;f.part.position.z+=4/measure.scale;f.part.rotation.copy(f.baseRotation);}rig.footBlend=0;}
 else{const forward=rotate(pose.board.q,[0,0,1]),yaw=Math.atan2(forward[0],forward[2]),a=(pose.heading??yaw)-yaw;rotation=qmul(pose.board.q,[0,Math.sin(a/2),0,Math.cos(a/2)]);}
 const row=!pose.floating&&pose.rowing&&!pose.walking&&pose.seat!=='mate'?pose.rowing:null;
 const archive=!!row?.play&&row.play.cargoRetired!==1&&row.play.parts.some(p=>p.type==='cargo'&&coastAssembly(row.play,pose.board.id).ids.has(p.id));
 if(row&&rig.hands?.length>=2)for(let n=0;n<2;n++){
  const h=rig.hands[n],side=n?1:-1;
  // Some official models rest their hands below their seated body. Keep the
  // real palms above the deck instead of sending a held shaft through it.
  const resting=h.basePosition.y*measure.scale-measure.bodyBottom+.14,raise=archive?Math.max(1.2,15-resting):Math.max(.4,10.5-resting);
  h.part.position.copy(h.basePosition);h.part.position.x+=side*(archive?1.4:.3)/measure.scale;h.part.position.y+=raise/measure.scale;h.part.position.z+=(archive?4:1.2)/measure.scale;h.part.rotation.copy(h.baseRotation);
 }
 else if(!pose.walking)for(const h of rig.hands??[]){h.part.position.copy(h.basePosition);h.part.rotation.copy(h.baseRotation);}
 const offset=rotate(rotation,[0,bottom-.14,0]);character.quaternion.fromArray(rotation);character.position.set(pose.point[0]-offset[0],pose.point[1]-offset[1],pose.point[2]-offset[2]);character.updateMatrixWorld(true);
 if(row&&rig.hands?.length>=2){measure.oarlocks??=[null,null];measure.handTarget??=new T.Vector3();const origin=localPoint(pose.board,pose.point),spec=coastRigSpec(row.rigLevel??row.rig?.equipped??0);for(let n=0;n<2;n++){const h=rig.hands[n],rest=localPoint(pose.board,h.part.getWorldPosition(measure.handTarget).toArray()),effort=(n?row.oars?.right:row.oars?.left)??0,stroke=coastRowingStroke(row.time,row.rate,effort,row.oars?.brake);const lock=coastOarlockStroke({play:row.play,board:pose.board,origin,rest,side:n?1:-1,stroke,effort,brake:!!row.oars?.brake,rig:spec,time:row.time,previous:measure.oarlocks[n]});measure.oarlocks[n]=lock;if(lock){measure.handTarget.fromArray(worldPoint(pose.board,lock.grip));h.part.position.copy(h.part.parent.worldToLocal(measure.handTarget));}}character.updateMatrixWorld(true);}
 // Floating hands keep their authored body attachments. The buoy's real
 // inner handles meet these palms instead of stretching the monster's arms.
 if(row&&rig.hands?.length>=2){measure.handPoints??=[new T.Vector3(),new T.Vector3()];measure.rowGrips??={board:null,time:0,rate:0,oars:{},origin:[],points:[[],[]]};const g=measure.rowGrips;g.board=pose.board.id;g.time=row.time;g.rate=row.rate;g.oars.left=row.oars?.left??0;g.oars.right=row.oars?.right??0;g.oars.brake=!!row.oars?.brake;g.origin=pose.point;g.oarlocks=measure.oarlocks;for(let n=0;n<2;n++)rig.hands[n].part.getWorldPosition(measure.handPoints[n]).toArray(g.points[n]);measure.grips=g;}
 return true;
}
