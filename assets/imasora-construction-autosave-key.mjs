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
