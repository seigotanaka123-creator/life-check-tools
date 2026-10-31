import {coastSalvagePlan} from './imasora-coast-physics.mjs?v=120nz';

export function createCoastSalvageHUD({dock,getPlay,getContext,edit,onFloat,onChoose,prepare,getNote=()=>''}){
 const row=document.createElement('section');row.className='sea-salvage';row.setAttribute('aria-label','海で見つけた資材箱');
 row.innerHTML='<strong>⚓ 海で見つけた箱</strong><p data-salvage-note role="status"></p><button type="button" data-salvage-main></button><button type="button" data-salvage-look>箱を見る</button>';
 dock.querySelector('.sea-direct-bar').before(row);const q=s=>row.querySelector(s);let disposed=false,focused=false;
 function current(){const context=getContext();return{context,plan:context.allowed?coastSalvagePlan(getPlay(),context):null};}
 function update(){if(disposed)return;const {plan}=current();row.hidden=!plan;dock.classList?.toggle('has-salvage',!!plan);if(!plan){focused=false;return;}const b=q('[data-salvage-main]');b.hidden=!plan.action;b.disabled=!plan.valid;b.textContent=plan.label;q('[data-salvage-note]').textContent=plan.message;q('[data-salvage-look]').textContent=focused?'いつもの視点':'箱を見る';}
 q('[data-salvage-main]').onclick=()=>{const {context,plan}=current();if(!plan?.valid||!plan.action)return;prepare();if(plan.action==='float'){focused=false;onFloat(plan.cargo);}else if(edit({type:plan.action,board:context.board})){focused=true;const s=getPlay();onChoose(plan.action==='salvage-find'?s.salvage.cargo:context.board??s.salvage.cargo);update();}else q('[data-salvage-note]').textContent=getNote();};
 q('[data-salvage-look]').onclick=()=>{if(!current().plan)return;prepare();focused=!focused;update();};
 return{update,cancel(){focused=false;},get focus(){const {context,plan}=current();if(!focused||!plan)return null;const ship=getPlay().parts.find(p=>p.id===context.board);return{center:ship?plan.point.map((v,i)=>(v+ship.p[i])/2-(i===1?15:0)):[plan.point[0],plan.point[1]-5,plan.point[2]],radius:125,label:'沈み箱と船'};},dispose(){disposed=true;dock.classList?.remove('has-salvage');row.remove();}};
}
