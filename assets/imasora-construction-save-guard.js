// BEGIN MONSTER GROWTH
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

// END MONSTER GROWTH
// BEGIN TAG ENTRY
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ImasoraSlidingTagEntry=api;})(globalThis,function(){
 'use strict';
 const KEY='imasora-sliding-tag-entry-v1',HOME_KEY='lifeQuestWalkV1',stages=['seed','sprout','young','hero','star'];
 const fail=code=>{throw Error(code);},object=v=>v&&typeof v==='object'&&!Array.isArray(v),text=v=>typeof v==='string'&&v.length>0&&v.length<=100;
 function subject(state){const m=state?.monster;if(!object(m)||!Number.isSafeInteger(m.bornAt)||m.bornAt<=0||!/^seed-(walk|sky|leaf|city|river|night|luck|white)$/.test(m.seedId))fail('COMPANION_UNAVAILABLE');return JSON.stringify([m.bornAt,m.seedId]);}
 function signature(state){subject(state);const m=state.monster;return JSON.stringify([m.bornAt,m.seedId,m.evolutionStage??0,m.xp??0,m.nature??0,m.city??0,m.sky??0,m.lifeExtensionUses??0,m.nickname??'',state.companionColors?.hand??'',state.companionColors?.foot??'']);}
 function validArt(t){const seed=JSON.parse(t.subject)[1],white=seed==='seed-white',family=white?'walk':seed?.replace('seed-',''),prefix=white?'white-':'';if(t.stage==='seed')return t.artId===seed||(white&&t.artId==='white-seed-walk');if(t.stage==='sprout')return t.artId===prefix+'sprout-seed-'+family;if(t.stage==='young')return ['walk','sky'].some(b=>t.artId===prefix+'young-seed-'+family+'-'+b);const base=t.stage==='star'?(white?'star-white-hero-':'star-hero-'):(white?'hero-white-':'hero-');return new RegExp('^'+base+'young-seed-'+family+'-(walk|sky)-(cute|cool-a|cool-b)'+(t.stage==='star'?'-(comet|crown|forest)':'')+'$').test(t.artId);}
 function validate(t){if(!object(t)||t.version!==1||t.mode!=='practice'||t.homeKey!==HOME_KEY||typeof t.homePath!=='string'||t.homePath.length>500||!/^\/(?!\/)(?:[^?#\\]*\/)?life-quest-walk\.html$/.test(t.homePath)||!text(t.id)||!text(t.subject)||typeof t.signature!=='string'||t.signature.length>1500||!text(t.name)||!text(t.artId)||!stages.includes(t.stage)||!Number.isSafeInteger(t.createdAt)||t.createdAt<=0||!['handColor','footColor'].every(k=>/^#[0-9a-f]{6}$/i.test(t[k])))fail('ENTRY_UNREADABLE');if(!validArt(t))fail('COMPANION_ART_UNAVAILABLE');return t;}
 function prepare(state,{id,now,name,artId,stage,handColor,footColor,homePath}){return validate({version:1,mode:'practice',homeKey:HOME_KEY,id,createdAt:now,subject:subject(state),signature:signature(state),name,artId,stage,handColor,footColor,homePath});}
 function open({state,session,descriptor,now,id}){const t=prepare(state,{...descriptor,now,id});session.setItem(KEY,JSON.stringify(t));return t;}
 function read({session,storage,required=false}){let raw;try{raw=session.getItem(KEY);if(!raw){if(required)return{status:'missing'};return{status:'preview'};}if(raw.length>6000)fail('ENTRY_UNREADABLE');const t=validate(JSON.parse(raw)),saved=JSON.parse(storage.getItem(t.homeKey));if(subject(saved)!==t.subject||signature(saved)!==t.signature)return{status:'changed'};return{status:'ready',companion:t};}catch{return{status:'unavailable'};}}
 return Object.freeze({KEY,prepare,open,read,subject,signature});
});

// END TAG ENTRY
// Shared inventory bundle; regenerate from imasora-home-inventory.js.
// BEGIN HOME INVENTORY
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ImasoraHomeInventory=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const valid=entry=>entry&&typeof entry==='object'&&!Array.isArray(entry)&&typeof entry.id==='string'&&entry.id.length>0;
 function read(state,copy=false){if(!state||typeof state!=='object')throw Error('INVENTORY_UNREADABLE');const items=state.inventory===undefined?[]:state.inventory,pending=state.inventoryPending===undefined?[]:state.inventoryPending;if(!Array.isArray(items)||!Array.isArray(pending)||!items.every(valid)||!pending.every(valid))throw Error('INVENTORY_UNREADABLE');return{items:copy?[...items]:items,pending:copy?[...pending]:pending};}
 function fill(stock){while(stock.items.length<40&&stock.pending.length)stock.items.push(stock.pending.shift());return stock;}
 function apply(state,stock){state.inventory=stock.items;state.inventoryPending=stock.pending;return state;}
 function receive(state,entries){if(!Array.isArray(entries)||!entries.every(valid))throw Error('INVALID_ITEM_GRANT');const stock=fill(read(state,true));for(const entry of entries){const copy={...entry};if(stock.items.length<40)stock.items.push(copy);else stock.pending.push(copy);}return apply(state,stock);}
 function take(state,id){const stock=read(state,true);let index=stock.items.findIndex(i=>i.id===id);if(index>=0)stock.items.splice(index,1);else{index=stock.pending.findIndex(i=>i.id===id);if(index<0)return false;stock.pending.splice(index,1);}apply(state,fill(stock));return true;}
 function counts(state){const stock=read(state),result=Object.create(null);for(const group of [stock.items,stock.pending])for(const entry of group)result[entry.id]=(result[entry.id]||0)+1;return result;}
 return Object.freeze({receive,take,counts,normalize:state=>apply(state,fill(read(state,true))),pendingCount:state=>read(state).pending.length});
});

// END HOME INVENTORY
(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./imasora-construction-reward-ledger.js'):root.ImasoraConstructionRewardLedger,
    typeof module==='object'&&module.exports?require('./imasora-construction-pack-ledger.js'):root.ImasoraConstructionPackLedger,
    typeof module==='object'&&module.exports?require('./imasora-construction-pack-transfer.js'):root.ImasoraConstructionPackTransfer,
    typeof module==='object'&&module.exports?require('./imasora-island-items.js'):root.ImasoraIslandItems);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ImasoraConstructionSaveGuard=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(rewards,packs,transfer,islandItems){
  'use strict';
  const fields=['constructionRewardLedger','constructionMaterialLedger'];
  const fail=code=>{const error=new Error(code);error.constructionSaveConflict=true;throw error;};
  function project(value){
    if(!value||typeof value!=='object'||Array.isArray(value))fail('INVALID_HOME_SAVE');
    const reward=rewards.normalize(value.constructionRewardLedger);if(reward.islandVoyageItems!==undefined)islandItems.normalize(reward.islandVoyageItems);
    return {constructionRewardLedger:reward,constructionMaterialLedger:packs.normalize(value.constructionMaterialLedger)};
  }
  const progressionFields=new Set(['coin','monster','inventory','inventoryPending','itemEffects','dailyItemUses','skyStock','mapTickets','slidingTag','position','walkSession','pendingSky','mapAwaitingSky','stamps','stampDayKey','mapDayKey','days','dex','cups','tournamentEntries','shopPurchases','grandEntryUsed','grandUnlockBonusGiven','pendingBattle','retiredMonsters','pendingRetirementRecord','retirementRecovery','retiredStorageLimit','retirementStorageAdViews','guildSupport','guildSupporterRewards','sideQuest','whiteSeedUnlocked']);
  const pick=(value,predicate)=>Object.fromEntries(Object.entries(value).filter(([key])=>predicate(key)));
  function choose(local,remote,base){const a=transfer.stable(local),b=transfer.stable(remote),c=transfer.stable(base);if(a===b||b===c)return local;if(a===c)return remote;fail('HOME_PROGRESS_SAVE_CONFLICT');}
  function adopt(target,snapshot){for(const key of Object.keys(target))if(!Object.hasOwn(snapshot,key))delete target[key];for(const [key,value]of Object.entries(snapshot))Object.defineProperty(target,key,{value,writable:true,enumerable:true,configurable:true});return target;}
  function createGuard({protectProgression=false}={}){
    let baseline=null,homeBaseline=null,persisted=false;
    return {
      adopt,
      remember(value,options={}){baseline=transfer.stable(project(value));if(protectProgression){homeBaseline=structuredClone(value);persisted=options.persisted!==false;}},
      prepare(local,remote){
        if(baseline===null)fail('CONSTRUCTION_SAVE_NOT_READY');
        const current=project(local),saved=project(remote===undefined?{}:remote);
        const currentKey=transfer.stable(current),savedKey=transfer.stable(saved);
        let chosen;
        if(currentKey===savedKey||savedKey===baseline)chosen=current;
        else if(currentKey===baseline)chosen=saved;
        else fail('CONSTRUCTION_SAVE_CONFLICT');
        // A blocked remote must never be replaced by a healthy local snapshot.
        if(fields.some(field=>saved[field].blocked&&!chosen[field].blocked))fail('CONSTRUCTION_REMOTE_BLOCKED');
        if(!protectProgression)return {...local,...structuredClone(chosen)};
        if(remote===undefined&&persisted)fail('HOME_SAVE_REMOVED');
        const savedHome=remote===undefined?homeBaseline:remote;
        for(const key of progressionFields)if(Object.hasOwn(homeBaseline,key)&&!Object.hasOwn(savedHome,key))fail('HOME_PROGRESS_FIELDS_MISSING');
        const core=choose(pick(local,k=>progressionFields.has(k)),pick(savedHome,k=>progressionFields.has(k)),pick(homeBaseline,k=>progressionFields.has(k)));
        const merged={...structuredClone(core),...structuredClone(chosen)};
        const keys=new Set([...Object.keys(local),...Object.keys(savedHome),...Object.keys(homeBaseline)]);
        for(const key of keys){if(fields.includes(key)||progressionFields.has(key))continue;const select=['autoResume','lastPlay'].includes(key)?pick(local,k=>k===key):choose(pick(local,k=>k===key),pick(savedHome,k=>k===key),pick(homeBaseline,k=>k===key));for(const [name,value]of Object.entries(select))Object.defineProperty(merged,name,{value:structuredClone(value),writable:true,enumerable:true,configurable:true});}
        return merged;
      }
    };
  }
  return Object.freeze({createGuard});
});
