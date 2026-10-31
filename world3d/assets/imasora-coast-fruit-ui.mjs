import {FRUITS,fruitState,fruitLanding,fruitDropPose} from './imasora-coast-tree-fruits.mjs?v=120ne';
import {createCoastFruitView} from './imasora-coast-fruit-view.mjs?v=120ne';
export function createCoastFruitUI({host,service,context,snapshot,view,getScene,now=()=>Date.now()}){
 const button=document.createElement('button'),note=document.createElement('p');button.textContent='木をゆらす';button.hidden=true;button.className='coast-fruit-action';button.style.cssText='position:absolute;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:43;padding:14px 23px;border:2px solid #fff;border-radius:24px;background:#e2f5c7;color:#36584a;font:bold 17px system-ui;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none';
 note.setAttribute('role','status');note.hidden=true;note.style.cssText='position:absolute;left:50%;bottom:calc(86px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:43;padding:9px 15px;border:2px solid white;border-radius:20px;background:#fff7def5;color:#6b5536;font:600 15px system-ui;max-width:min(330px,70%);text-align:center;pointer-events:none';host.append(button,note);
 note.className='coast-fruit-notice';
 const render=createCoastFruitView();let seenLedger=null,latest=new Map(),active=null,pending=false,expires=0,lastPoll=0,clock=0,lastView=null,lastCycle=-1,candidate=null,disposed=false;
 const visible=c=>!disposed&&!document.hidden&&c.map==='coast'&&!c.overlay;
 // Only visible play consumes notice time. A save can finish behind a menu,
 // in another map or in a hidden tab; keep its result for the coast return.
 const say=text=>{if(disposed)return;note.textContent=text;expires=clock+5;note.hidden=!visible(context());};
 const ready=c=>c.map==='coast'&&c.grounded&&!c.riding&&!c.blocked&&service.ready&&service.mode==='live'&&!service.busy&&!service.blocked&&!service.crafting&&!document.hidden;
 function reset(){if(active)active.owner?.shake(active.tree.id,0);active=null;button.hidden=true;render.update([]);}
 async function shake(){const c=context(),v=view();if(!candidate||pending||active||!ready(c)||!v)return;const tree=candidate;if(Math.hypot(c.position.x-tree.worldX,c.position.z-tree.worldZ)>64)return;pending=true;active={tree,owner:v,age:0,waiting:true,event:null};button.hidden=true;
  try{const e=await service.saveCoastFruit({type:'shake',tree:tree.id},snapshot(),service.ledger.revision);if(disposed)return;if(active?.tree.id===tree.id){active.event=e;active.waiting=false;active.age=0;}say(e.fruit?'実が落ちてきた！':!FRUITS.ripe(service.ledger.source.fingerprint,tree.id,e.cycle)?'この木の実は、まだかたいみたい。ほかの木も探してみよう。':'まだ枝からはなれないみたい。またあとで。');}catch(e){if(disposed)return;reset();say('木の実の記録を残しています。'+e.message);}finally{pending=false;}
 }
 button.onclick=shake;
 async function pick(e){if(pending)return;pending=true;try{await service.saveCoastFruit({type:'pick',id:e.id},snapshot(),service.ledger.revision);const f=FRUITS.items.find(f=>f.id===e.fruit);say(f.name+' をひろった！ '+'ホームのもちもので使えるよ。');}catch(error){say('実はここに残してあるよ。'+error.message);}finally{pending=false;}}
 return{button,get busy(){return !!active||pending;},get available(){return !button.hidden;},prepare:scene=>scene.add(render.root),update(dt){if(disposed||document.hidden)return;const c=context(),v=view();if(visible(c))clock+=Math.max(0,Math.min(.25,dt));note.hidden=!visible(c)||clock>expires;
  if(getScene()&&render.root.parent!==getScene())getScene().add(render.root);if(c.map!=='coast'||v!==lastView){reset();lastView=v;seenLedger=null;lastCycle=-1;}
  if(c.map!=='coast'||!v)return;if(service.blocked){reset();return;}
  if(seenLedger!==service.ledger){seenLedger=service.ledger;latest=fruitState(service.ledger?.events);lastCycle=-1;}
  const cycle=FRUITS.cycleAt(now()),source=service.ledger?.source?.fingerprint;if(!active)v.fruitSeason?.(source,cycle);if(lastCycle!==cycle){lastCycle=cycle;for(const e of latest.values())if(active?.tree.id!==e.tree)v.fruitTaken(e.tree,!!e.fruit&&(e.cycle>=cycle||!e.picked));}
  if(active){if(c.overlay){button.hidden=true;return;}active.age+=Math.max(0,Math.min(.25,dt));const age=active.age;if(!active.waiting&&age>=.65&&active.event?.fruit)active.owner.fruitTaken(active.tree.id,true);active.owner.shake(active.tree.id,Math.sin(age*23)*.065*Math.max(.12,1-age/1.3));if(!active.waiting&&age>=(active.event?.fruit?2.4:1.1)){active.owner.shake(active.tree.id,0);active.owner.fruitTaken(active.tree.id,!!active.event?.fruit);active=null;}}
  const items=[];for(const tree of v.nearby(c.position,380)){const e=latest.get(tree.id);if(!e?.fruit||e.picked)continue;const p=fruitLanding(tree);if(!p)continue;let pose={...p,y:p.y+4,landed:true};if(active?.tree.id===tree.id){if(active.waiting||active.age<.65)continue;pose=fruitDropPose(tree,p,active.age);}items.push({...pose,fruit:e.fruit});if(!active&&!pending&&ready(c)&&Math.hypot(c.position.x-p.x,c.position.z-p.z)<26&&Math.abs(c.position.y-p.y)<18)void pick(e);}
  render.update(items);if(clock-lastPoll<.1)return;lastPoll=clock;candidate=null;button.hidden=true;if(!ready(c)||pending||active)return;
  for(const tree of v.nearby(c.position,64).sort((a,b)=>Math.hypot(a.worldX-c.position.x,a.worldZ-c.position.z)-Math.hypot(b.worldX-c.position.x,b.worldZ-c.position.z))){const e=latest.get(tree.id);if(e&&(e.cycle>=cycle||e.fruit&&!e.picked))continue;if(!FRUITS.bearing(source,tree.id,cycle)||Math.abs(c.position.y-tree.y)>25||!fruitLanding(tree))continue;candidate=tree;button.hidden=false;break;}
 },dispose(){if(disposed)return;disposed=true;reset();button.remove();note.remove();render.dispose();}};
}
