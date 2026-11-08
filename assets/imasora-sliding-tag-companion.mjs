import * as T from './three.module.min.js';
import {buildMatureStarCharacter360,buildFloweringHeroCharacter360,getMatureStarCharacter,getFloweringHeroCharacter,MATURE_CHARACTER_FAMILIES,applyMonsterBaseExpression} from './imasora-character-360.js';
// Early growth uses the existing family colors and an attached-palm silhouette.
// All sizes are presentation only; every participant retains the same body physics.
export function buildTagCompanion(entry){
 const options={handColor:entry.handColor,footColor:entry.footColor};
 if(entry.stage==='star'){if(!getMatureStarCharacter(entry.artId))throw Error('COMPANION_ART_UNAVAILABLE');return buildMatureStarCharacter360(entry.artId,options);}
 if(entry.stage==='hero'){if(!getFloweringHeroCharacter(entry.artId))throw Error('COMPANION_ART_UNAVAILABLE');return buildFloweringHeroCharacter360(entry.artId,options);}
 const seed=JSON.parse(entry.subject)[1].replace('seed-',''),family=MATURE_CHARACTER_FAMILIES.find(f=>f.key===seed);if(!family)throw Error('COMPANION_ART_UNAVAILABLE');
 const g=new T.Group(),mat=color=>new T.MeshStandardMaterial({color,roughness:.6}),bodyMat=mat(entry.stage==='seed'&&!family.whiteVariant?0xb87943:family.bodyColor);bodyMat.emissive.copy(bodyMat.color);bodyMat.emissiveIntensity=.3;bodyMat.toneMapped=false;
 const sphere=new T.SphereGeometry(1,20,14),part=(x,y,z,sx,sy,sz,material)=>{const m=new T.Mesh(sphere,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);g.add(m);return m;};
 const body=part(0,28,0,18,23,15,bodyMat),hands=[],feet=[],eyes=[];
 if(entry.stage!=='seed'){const palm=mat(options.handColor),foot=mat(options.footColor);for(const side of [-1,1]){hands.push(part(side*20,25,2,5,5,5,palm));feet.push(part(side*10,5,3,8,5,10,foot));}const eye=mat(0x202e41);for(const side of [-1,1])eyes.push(part(side*6,34,14,2.2,3,1.5,eye));}
 if(entry.stage==='seed'||entry.stage==='sprout'){const leaf=part(7,54,0,9,3,4,mat(0x7bbf74));leaf.rotation.z=.5;}
 else {const gem=part(0,51,0,6,6,6,mat(0x7edcff));gem.material.emissive.set(0x7edcff);gem.material.emissiveIntensity=.25;}
 const joins=hands.map((hand,i)=>({hand,anchor:new T.Vector3(i?15:-15,29,0),sleeve:part(0,0,0,1,1,1,hand.material)})),axis=new T.Vector3(0,1,0),delta=new T.Vector3(),update=g.updateMatrixWorld;
 g.updateMatrixWorld=function(force){for(const j of joins){delta.subVectors(j.hand.position,j.anchor);const length=delta.length();j.sleeve.position.copy(j.anchor).addScaledVector(delta,.5);j.sleeve.scale.set(3,Math.max(3,length/2+2),3);j.sleeve.quaternion.setFromUnitVectors(axis,delta.multiplyScalar(1/(length||1)));}return update.call(this,force);};
 g.userData={body,hands,feet,faceFeatures:eyes,tagCompanionId:entry.artId};
 // Use the canonical expression without changing this game's existing body or touch geometry.
 if(entry.stage!=='seed')applyMonsterBaseExpression(g,entry.artId,{surfaceZ:(x,y)=>15*Math.sqrt(Math.max(0,1-(x/18)**2-((y-28)/23)**2))});
 return g;
}
