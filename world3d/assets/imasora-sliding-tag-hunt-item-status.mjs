import{huntSupplyContact}from'./imasora-sliding-tag-hunt-contact.mjs';
const controlled=s=>s.config?.mode==='hunt'?s.hunters[0]:s.player;
// Capture before attempting the action. A CPU can start another tool later in
// the same tick; its new state must not become the reason for our earlier failure.
export function huntItemFailureHint(s,a){
 if(s.phase!=='playing'||!a?.item)return '';
 if((a.effects?.dizzy??0)>s.time)return "ピヨピヨ中です";
 if(a.flight)return '着地してから使おう';
 if(a.pendingItem)return '道具を準備しています';
 if(a.hook)return '';
 const type=a.item;
 if(a!==s.player&&type!=='balloon'){
  if(s.time<(s.nextTeamItemAt??0))return '少し間をあけて使おう';
  if(type==='scarf'&&s.hunters.some(h=>h!==a&&(h.flight||h.pendingItem||(h.effects.speed??0)>s.time)))return '仲間の道具が作動中です\n終わってから使おう';
 }
 return type==='hook'?'前方にポールが見える所で使おう':'少し広い場所で使おう';
}
export function huntItemUseAcknowledged(s,owner){return s.events.some(e=>e.owner===owner&&['item-use','hook-released'].includes(e.type));}
// Presentation only. A blocked pickup must use the same physical contact as
// collection, never proximity to its ground projection or a hidden opponent.
export function createHuntItemStatus(){
 let current=null,lastEvent=0,blocked='',awaySince=null,nextHint=0;
 function reset(){current=null;lastEvent=0;blocked='';awaySince=null;nextHint=0;}
 return{reset,event(s,e){
  const a=controlled(s);if(!a||e.owner!==a.owner||!['pickup','item-use'].includes(e.type))return null;
  if(Number.isSafeInteger(e.id)){if(e.id<=lastEvent)return null;lastEvent=e.id;}
  blocked='';awaySince=null;
  if(e.type==='item-use'){current=null;return null;}
  current={kind:'pickup',until:s.time+.9};nextHint=Math.max(nextHint,s.time+1.2);
  return{item:e.item,duration:1.1};
 },sample(s){
  if(s.phase!=='playing')return false;
  const a=controlled(s);if(!a?.item){blocked='';awaySince=null;return false;}
  const audience=a.owner==='player'?'player':'hunters',reach=(a.radius+1.45)**2;
  let touching=null;
  for(const p of s.pickups){if(p.audience!==audience||p.readyAt>s.time)continue;const dx=p.x-a.x,dz=p.z-a.z;
   if(dx*dx+dz*dz<=reach&&huntSupplyContact(a,p,s.time)){touching=p;break;}}
  if(!touching){if(awaySince===null)awaySince=s.time;if(s.time-awaySince>=.5)blocked='';return false;}
  awaySince=null;const key=a.owner+':'+a.item+':'+touching.id;
  if(key===blocked||s.time<nextHint)return false;
  blocked=key;nextHint=s.time+5;current={kind:'full',until:s.time+1.6};return true;
 },defer(until){nextHint=Math.max(nextHint,until);},
 cue(time,active=true){return active&&current&&time<current.until?current.kind:'';}};
}
