import {createHeldDashButton} from './imasora-hold-dash.mjs?v=120od';
import {coastWorkAlignPlan} from './imasora-coast-physics.mjs?v=120nz';

// One hold, including both spring ropes and paying out the loading line, owns
// one ordinary work undo. A lost pointer or changed scene cannot restart it.
export function createCoastAlignmentSession({begin,finish}){
 let current=null,refused=false;
 function stop(){if(current)finish(current.board);current=null;refused=false;}
 return {sample(s,plan,held){
  if(!held){stop();return null;}
  if(refused)return null;
  if(!plan?.valid){stop();return null;}
  if(current&&(current.board!==plan.board||current.cargo!==plan.cargo||current.edit!==s.edit)){stop();refused=true;return null;}
  if(!current){const edit=s.edit;if(!begin({type:'work-align',id:plan.board,cargo:plan.cargo})){refused=true;return null;}current={board:plan.board,cargo:plan.cargo,edit:edit+1};}
  return {board:current.board,cargo:current.cargo};
 },stop,get active(){return !!current;}};
}
export function createCoastAlignmentControl({row,getPlay,getContext,edit,prepare,finish=()=>{}}){
 const button=document.createElement('button');button.type='button';button.className='sea-loading-align';button.hidden=true;button.setAttribute('aria-label','船の向きを合わせる（押している間）');button.textContent='⤴ 向きを合わせる · 長押し';
 const meter=document.createElement('meter');meter.className='sea-loading-aim';meter.min=0;meter.max=180;meter.hidden=true;meter.setAttribute('aria-label','船と箱の向きの合い具合');
 row.querySelector('.sea-loading-actions').before(button,meter);let disposed=false;
 const get=()=>{const s=getPlay(),context=getContext();return {s,context,plan:context.allowed?coastWorkAlignPlan(s,context.board,context):null};};
 const session=createCoastAlignmentSession({begin:a=>{prepare(true);return edit(a);},finish});
 const held=createHeldDashButton({element:button,context:()=>{const {plan}=get();return plan?plan.board+'|'+plan.cargo:'';},enabled:()=>!disposed&&!row.hidden&&!button.hidden&&!!get().plan?.valid});
 function cancel(){held.cancel();session.stop();}
 return {update(){const {plan}=get();button.hidden=meter.hidden=!plan;meter.value=plan?180-Math.abs(plan.angle)*180/Math.PI:0;held.sync();if(!plan?.valid)cancel();const text=plan?.aligned?'✓ 向きが合ったよ':held.active?'↻ 合わせているよ · 離すと止まる':'⤴ 向きを合わせる · 長押し';if(button.textContent!==text)button.textContent=text;return plan;},sample(){const {s,plan}=get();return session.sample(s,plan,held.active);},cancel,get holding(){return held.active;},dispose(){cancel();disposed=true;held.dispose();button.remove();meter.remove();}};
}
