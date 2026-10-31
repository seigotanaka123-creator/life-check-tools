// Small, finite equipment catalogue. Effects are used by the force solver,
// not a success roll or a gate that bans an otherwise reachable island.
const part=(id,slot,name,cost,color,good,bad,values)=>Object.freeze({id,slot,name,cost,color,good,bad,...values});
export const RIG_SLOTS=Object.freeze([
 Object.freeze({id:'keel',name:'水中フィン',icon:'◢',help:'水の流れを受けて、進む向きや曲がり方を変える。'}),
 Object.freeze({id:'ballast',name:'重り',icon:'◆',help:'重心を下げて揺れを抑える。その分、出だしは重くなる。'}),
 Object.freeze({id:'brace',name:'補強',icon:'▤',help:'船底の水の受け方を変える。速さと波への強さを選ぼう。'})
]);
export const RIG_PARTS=Object.freeze([
 part('skeg','keel','まっすぐフィン',3,0x58b9ec,'横流れを抑え、まっすぐ進む','小回りは苦手',{mass:4,side:1.2,forward:.10,fin:11}),
 part('carve','keel','小回りフィン',3,0xf19ac0,'片側をこぐと鋭く曲がる','流れに押されやすい',{mass:3,side:.20,forward:.07,turn:1.32,fin:7}),
 part('twin','keel','ふたばフィン',4,0x7fd8bd,'横波と横流れを受け止める','直進も旋回も少し重い',{mass:7,side:1.7,forward:.25,roll:.32,turn:.88,fin:9}),
 part('foil','keel','すべるフィン',5,0xffc768,'速く進むと水の抵抗が減る','止まりにくく、低速は不得意',{mass:5,side:.45,forward:.18,glide:.28,brake:.76,fin:8}),
 part('low','ballast','低重心おもり',3,0x96a7dc,'低い重心で横揺れに強い','こぎ出しと旋回が重い',{mass:20,y:-7,roll:.14}),
 part('bow','ballast','船首おもり',3,0xf2bb73,'船首の跳ね上がりを抑える','追い波で船首が沈みやすい',{mass:14,y:-4,z:12,pitch:.15}),
 part('stern','ballast','船尾おもり',3,0x89c9e8,'船首を持ち上げやすい','向かい波で跳ねやすい',{mass:14,y:-4,z:-12,pitch:.05}),
 part('wide','ballast','左右おもり',4,0xdb9ccf,'左右の重りで急な傾きを抑える','重く、速度が乗りにくい',{mass:28,y:-5,spread:22,roll:.28}),
 part('rail','brace','すべり底',4,0xefd785,'直進時の水の抵抗を減らす','横揺れが収まりにくい',{mass:4,forward:-.25,roll:-.13}),
 part('spring','brace','しなやか底',4,0x9dd6b4,'上下の波を受け流す','平水で少し速度を失う',{mass:6,forward:.17,vertical:.30,pitch:.12}),
 part('cross','brace','よこ波ガード',4,0xd0b3e8,'横波で揺れにくい','曲がり始めがゆっくり',{mass:9,forward:.13,side:.25,roll:.45,turn:.88}),
 part('brake','brace','水かきブレーキ',3,0xffaa92,'止めたい場所で止めやすい','進む時も少し抵抗がある',{mass:5,forward:.15,brake:1.65})
]);
export const EMPTY_FITTING=Object.freeze({keel:'none',ballast:'none',brace:'none'});
export const RIG_COMBINATIONS=4*5*5*5;
export function rigPart(id){const p=RIG_PARTS.find(p=>p.id===id);if(!p)throw Error('その部品は見つからないよ。');return p;}
export function validateFitting(r){
 if(r?.version!==2)return;
 if(!Array.isArray(r.owned)||r.owned.length>12||r.owned.some((id,i)=>!RIG_PARTS.some(p=>p.id===id)||(i&&r.owned[i-1]>=id))||!r.fitting||Object.getPrototypeOf(r.fitting)!==Object.prototype||Object.keys(r.fitting).sort().join('|')!=='ballast|brace|keel')throw Error('船の部品をたしかめよう。');
 for(const slot of RIG_SLOTS){const id=r.fitting[slot.id];if(id!=='none'&&(!r.owned.includes(id)||rigPart(id).slot!==slot.id))throw Error('持っている部品を選んでね。');}
}
export function fittingKey(r){const f=r?.fitting??EMPTY_FITTING;return [r?.equipped??0,f.keel,f.ballast,f.brace].join('|');}
export function nextFitting(old,action,available){
 const r=structuredClone(old??{version:1,oars:0,equipped:0});r.version=2;r.owned??=[];r.fitting??={...EMPTY_FITTING};
 if(action?.type==='part'&&Object.keys(action).sort().join('|')==='part|type'){
  const p=rigPart(action.part);if(r.owned.includes(p.id))throw Error('もう持っている部品だよ。');if(!Number.isSafeInteger(available)||available<p.cost)throw Error('航海パーツがあと'+Math.max(0,p.cost-(available??0))+'こ必要だよ。');r.owned.push(p.id);r.owned.sort();r.fitting[p.slot]=p.id;
 }else if(action?.type==='fit'&&Object.keys(action).sort().join('|')==='ballast|brace|keel|oar|type'){
  if(!Number.isInteger(action.oar)||action.oar<0||action.oar>r.oars)throw Error('持っているオールを選んでね。');r.equipped=action.oar;r.fitting={keel:action.keel,ballast:action.ballast,brace:action.brace};
 }else throw Error('部品の操作をたしかめよう。');
 validateFitting(r);return r;
}
// Each combination works through these same mass/drag/stroke coefficients.
// No per-frame allocations/replay: at most 500 frozen profiles are retained.
const profiles=new Map();
export function rigProfile(r){
 const key=fittingKey(r);if(profiles.has(key))return profiles.get(key);
 const f=r?.fitting??EMPTY_FITTING,n=r?.equipped??0;
 if(!Number.isInteger(n)||n<0||n>3)throw Error('オールを選び直そう。');
 const oars=[{force:1,brake:1.22,turn:1.30,rate:5.8,mass:0},{force:1.34,brake:1.65,turn:.82,rate:4.6,mass:4},{force:1.58,brake:.84,turn:.72,rate:6.2,mass:3},{force:1.83,brake:1.05,turn:.45,rate:3.8,mass:10}][n];
 const v={...oars,forward:0,side:0,vertical:0,roll:0,pitch:0,glide:0,y:-3,z:0,spread:0,combos:[],key};
 for(const slot of RIG_SLOTS){const id=f[slot.id];if(id==='none')continue;const p=rigPart(id);if(p.slot!==slot.id)throw Error('部品の場所が違うよ。');v.mass+=p.mass;for(const k of['forward','side','vertical','roll','pitch','glide'])v[k]+=p[k]??0;v.brake*=p.brake??1;v.turn*=p.turn??1;if(slot.id==='ballast'){v.y=p.y;v.z=p.z??0;v.spread=p.spread??0;}}
 const bonus=(name,when,apply)=>{if(when){v.combos.push(name);apply();}};
 bonus('くるりと停泊',n===0&&f.keel==='carve',()=>{v.turn*=1.22;v.brake*=1.15;});
 bonus('波をいなす',n===1&&f.brace==='spring',()=>{v.vertical+=.25;v.pitch+=.15;});
 bonus('波すべり',n===2&&f.keel==='foil',()=>{v.glide+=.24;});
 bonus('向かい波を進む',n===3&&f.ballast==='bow',()=>{v.headwave=.32;});
 bonus('横波の支え',f.keel==='twin'&&f.ballast==='wide',()=>{v.roll+=.38;});
 bonus('ぴたりと停止',f.ballast==='low'&&f.brace==='brake',()=>{v.brake*=1.3;});
 bonus('まっすぐ巡航',f.keel==='skeg'&&f.brace==='rail',()=>{v.cruise=.22;});
 bonus('追い波ライド',f.ballast==='stern'&&f.brace==='spring',()=>{v.surf=.3;});
 v.combos=Object.freeze(v.combos);Object.freeze(v);if(profiles.size<500)profiles.set(key,v);return v;
}
// Analog steering must not change modes when one blade reaches zero effort.
// A reciprocal blend keeps turning force increasing throughout the stick's
// travel while preserving both straight thrust and full one-sided handling.
const oarEffort=v=>v===true?1:Number.isFinite(v)?Math.max(-1,Math.min(1,v)):0;
export function rigOarResponse(profile,oars){
 const left=oarEffort(oars?.left),right=oarEffort(oars?.right),peak=Math.max(Math.abs(left),Math.abs(right));
 const steering=peak?Math.min(1,Math.abs(left-right)/peak):0;
 return {left,right,paired:peak?1-steering:0,turn:1/(1+(1/profile.turn-1)*steering)};
}
export function rigWaterResponse(profile,{speed=0,headFlow=0,tailFlow=0,both=false}={}){
 const fast=Math.max(0,Math.min(1,(speed-5)/8));
 const paired=both===true?1:Number.isFinite(both)?Math.max(0,Math.min(1,both)):0;
 return {drive:1+(profile.headwave??0)*Math.min(1,Math.max(0,headFlow)/6)+paired*(profile.cruise??0)*fast,forward:Math.max(.28,1+profile.forward-profile.glide*fast-(profile.surf??0)*Math.min(1,Math.max(0,tailFlow)/6))};
}
