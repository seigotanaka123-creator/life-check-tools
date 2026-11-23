// Runtime animation clocks and informational messages do not change the saved
// scene. Keep every other field, including transfer clocks, input edges,
// inventories, held objects, body motion, terrain and unknown future fields.
export function constructionWorkAutoSaveKey(record,view){
 if(!record?.work)return JSON.stringify([record,view]);
 const {revision,phase,work,...outer}=record;
 const {revision:workRevision,time,phase:workPhase,message,loader,rig,...physical}=work;
 const withoutMessage=actor=>{if(!actor)return actor;const{message,...pose}=actor;return pose;};
 return JSON.stringify([outer,{...physical,...(loader?{loader:withoutMessage(loader)}:{}),...(rig?{rig:withoutMessage(rig)}:{})},view]);
}

export const constructionLifecycleSave=reason=>reason==='hidden'||reason==='pagehide';

export function createConstructionAutoSaveGate({now=()=>performance.now(),interval=120_000,idle=15_000}={}){
 let lastActivity=now(),lastSave=lastActivity;
 return {
  noteActivity(active){if(active)lastActivity=now();},
  ready(reason){const time=now();return constructionLifecycleSave(reason)||(time-lastSave>=interval&&time-lastActivity>=idle);},
  checked(){lastSave=now();}
 };
}

export function constructionWorkMovingForAutoSave(record){
 const work=record?.work;
 if(!work)return false;
 const rig=work.loader??work.rig,body=work.body??rig?.player;
 return !!(rig?.transition||Math.abs(rig?.vehicle?.speed??0)>.01||
  rig?.mode==='foot'&&body?.grounded===false||work.task||record.delivery||work.air?.length||
  work.joining||work.rotation||work.deployment>0&&work.deployment<1);
}
