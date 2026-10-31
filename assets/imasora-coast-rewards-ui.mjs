import {islandAtLanding,readHomeSailingAwards,sailingReceiptId} from './imasora-coast-rewards.mjs?v=120nd';
import {coastVisitGift,coastVisitOffer} from './imasora-coast-visit-rewards.mjs?v=120mx';
export function createCoastRewardsUI({host,service,context,snapshot,groundContact=()=>null,navigation=()=>service.ledger?.world.coastPhysics?.navigation,readHome=()=>localStorage.getItem('lifeQuestWalkV1')}){
 const note=document.createElement('p');note.className='coast-arrival-toast';note.setAttribute('role','status');note.hidden=true;host.append(note);
 let pending=false,dirty=true,supplyRetryAt=0,lastMap=null,noticeLeft=0,noticeAt=0,noticeVisible=false,last=0,disposed=false,standing=null,since=0;
 const visible=c=>!disposed&&!document.hidden&&c.map==='coast'&&!c.overlay&&!document.querySelector?.('dialog[open]');
 const say=text=>{if(disposed)return;note.textContent=text;noticeLeft=7500;noticeAt=performance.now();noticeVisible=false;note.hidden=!visible(context());};
 const changed=e=>{if(e.key==='lifeQuestWalkV1'||e.key===null)dirty=true;};window.addEventListener('storage',changed);
 async function run(kind,value,contact){pending=true;try{const first=kind==='arrival'&&!service.ledger.world.coastRewards?.islands.includes(value.id),result=kind==='arrival'?await service.saveCoastVisit({island:value.id,count:value.count,contact},snapshot(),service.ledger.revision):await service.receiveSailingAwards(value,snapshot(),service.ledger.revision);if(kind==='arrival'){const g=coastVisitGift(value.id,value.count);say('🏝️ '+value.name+(first?'へ初上陸！ 海あかりの結晶 ＋4こ · ':' · 上陸'+value.count+'回目！ ')+g.battle.name+'×'+g.tier+'・成長のタネ×'+g.tier+'（ホームのもちものへ）／木材'+g.tier+'枚・土'+g.tier*8+'ブロック・水'+g.tier*32+'Lを保管庫へ');}else say('🛶 航海パーツを受け取ったよ！ いま '+result.nauticalParts+'こ');}catch(e){if(kind==='supplies'){dirty=true;supplyRetryAt=performance.now()+3000;}say(kind==='supplies'&&!service.blocked?'航海パーツをしまう準備中。少し待つと自動で届くよ。':'賞品をセーブできなかったよ。'+e.message);}finally{pending=false;}}
 return{update(){if(disposed)return;const now=performance.now(),c=context(),readable=visible(c);if(noticeVisible&&readable)noticeLeft=Math.max(0,noticeLeft-Math.max(0,Math.min(250,now-noticeAt)));noticeAt=now;noticeVisible=readable;note.hidden=!readable||noticeLeft<=0;if(now-last<200)return;last=now;if(c.map!==lastMap){lastMap=c.map;dirty=true;standing=null;}if(!readable||c.airborne||c.riding||pending||!service.ready||service.mode!=='live'||service.busy||service.blocked){standing=null;return;}
  // A temporary restore guard may reject before a save job is queued. Keep
  // the earned receipts pending, then re-read them with a fresh live draft.
  // Protected stops still use the save service's normal reconciliation.
  if(dirty&&now>=supplyRetryAt){dirty=false;try{const known=new Set(service.ledger.events.map(e=>e.id)),awards=readHomeSailingAwards(readHome()).filter(a=>!known.has(sailingReceiptId(a)));if(awards.length){void run('supplies',awards);return;}}catch{say('航海パーツの賞品を読み取れなかったよ。街のセーブを確認してね。');}}
  // Only inspect the small live pose. Do not clone/replay a world every frame.
  let contact=null,island=islandAtLanding(c);if(!island)island=islandAtLanding(c,contact=groundContact());const offer=island&&coastVisitOffer(service.ledger.world,island.id,c.position,navigation());if(!offer){standing=null;return;}const key=island.id+':'+offer.count;if(standing!==key){standing=key;since=now;return;}if(now-since>=400)void run('arrival',{...island,count:offer.count},contact);
 },get pending(){return pending;},dispose(){disposed=true;window.removeEventListener('storage',changed);note.remove();}};
}
