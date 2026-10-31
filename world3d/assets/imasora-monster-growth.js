(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ImasoraMonsterGrowth=api;})(globalThis,function(){
 'use strict';
 const fail=code=>{throw Error(code);},integer=v=>Number.isSafeInteger(v)&&v>=0;
 function canMature(monster,minimumExtensions){if(!integer(minimumExtensions)||minimumExtensions<1)fail('GROWTH_RULES_UNAVAILABLE');return Number(monster.lifeExtensionUses||0)>=minimumExtensions;}
 function skyInfluence(type,bias){if(!['nature','city','sky'].includes(type)||!['nature','city','sky'].includes(bias))fail('SKY_INFLUENCE_UNAVAILABLE');const delta={nature:0,city:0,sky:0};delta[type]+=2;delta[bias]++;return Object.freeze(delta);}
 function prepareSky(monster,type,bias){const delta=skyInfluence(type,bias),next={};for(const key of ['nature','city','sky']){const value=monster[key]??0;if(!integer(value)||!Number.isSafeInteger(value+delta[key]))fail('MONSTER_GROWTH_UNREADABLE');next[key]=value+delta[key];}return Object.freeze(next);}
 function applySky(monster,type,bias){const next=prepareSky(monster,type,bias);Object.assign(monster,next);return skyInfluence(type,bias);}
 function createRules({stages,minimumExtensions}){if(!Array.isArray(stages)||stages.length!==5||!integer(minimumExtensions)||minimumExtensions<1||!stages.every((s,i)=>s&&typeof s.stage==='string'&&s.stage&&integer(s.minXp)&&(i===0?s.minXp===0:s.minXp>stages[i-1].minXp)))fail('GROWTH_RULES_UNAVAILABLE');const rules=stages.map(s=>Object.freeze({stage:s.stage,minXp:s.minXp}));
  function snapshot(monster){const stage=monster.evolutionStage??0,xp=monster.xp;if(!integer(stage)||stage>4||!integer(xp)||!integer(monster.lifeExtensionUses??0))fail('MONSTER_GROWTH_UNREADABLE');return JSON.stringify([stage,xp,monster.lifeExtensionUses??0]);}
  function plan(monster){const before=snapshot(monster),stage=monster.evolutionStage??0;if(stage===4)return Object.freeze({status:'maximum',before});if(stage===3&&!canMature(monster,minimumExtensions))return Object.freeze({status:'needs-rest',before});return Object.freeze({status:'evolve',before,stage:stage+1,xp:Math.max(monster.xp,rules[stage+1].minXp),stageName:rules[stage+1].stage});}
  function apply(monster,prepared){const current=plan(monster);if(JSON.stringify(current)!==JSON.stringify(prepared))fail('EVOLUTION_CHANGED');if(current.status!=='evolve')return current;monster.evolutionStage=current.stage;monster.xp=current.xp;return current;}
  return Object.freeze({plan,apply,applySky,canMature:monster=>canMature(monster,minimumExtensions)});
 }
 return Object.freeze({createRules,canMature,skyInfluence,prepareSky,applySky});
});
