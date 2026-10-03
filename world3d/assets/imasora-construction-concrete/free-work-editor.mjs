import {constructionBase} from './free-supported-build.mjs';
import {SUPPORTED_WORK_MOVE,supportedWorkSnapCandidates} from './free-supported-work-move.mjs';
import {rotateFreeWork} from './free-work-rotation.mjs';
import {FLOOR_COLORS} from './floor-parts.mjs';
import {freeFilledMask,freeWorkMask,freeWorkSummary} from './free-work-parts.mjs';
import {freeWorkMoveTargets,freeWorkSnapCandidates,freeWorkMovePlan} from './free-work-move.mjs';
export const freeWorkEditorTemplate=()=>`
 <section data-sheet-content="works">
  <label>完成作品 <select data-edit-work></select></label>
  <label>操作 <select data-work-mode><option value="parts">部分を保管・復元</option><option value="move">作品を移動・回転・辺合わせ</option></select></label>
  <section data-work-parts-section>
  <p>上が北です。マスを押して「配置」「保管」を切り替えます。空白にはコンクリートがありません。</p>
  <div class="free-grid" data-work-parts aria-label="完成作品の配置・保管"></div>
  <div class="concrete-actions"><button data-work-edit="store">全て保管する</button><button data-work-edit="restore">全て復元する</button></div>
  <p data-work-summary role="status"></p><p data-work-problem role="status"></p>
  <p>保管する部分は赤、復元する部分は緑の枠で表示します。量・厚さ・面ごとの色を保ち、元の場所へ戻せます。</p>
  <button data-work-edit="review">変更内容を確認する</button>
  </section>
  <section data-work-move-section hidden>
   <p>位置と向きを決めてから確認します。厚さ・色の模様・保管部分も一緒に動かします。</p>
   <div class="concrete-actions"><button data-work-rotate="left">左に90度回す</button><button data-work-rotate="right">右に90度回す</button></div><p data-work-angle role="status"></p>
   <label>移動幅 <select data-work-step><option value="16">1マスずつ</option><option value="1">少しずつ</option><option value="64">4マスずつ</option></select></label>
   <div class="concrete-actions">${[['north','北'],['west','西'],['east','東'],['south','南']].map(([id,label])=>`<button data-work-shift="${id}">${label}へ移動</button>`).join('')}</div>
   <button data-work-foundation>土台に位置を合わせる</button><p data-work-support></p>
   <label>辺を合わせる相手 <select data-work-target></select></label>
   <div class="concrete-actions">${[['north','北'],['west','西'],['east','東'],['south','南']].map(([id,label])=>`<button data-work-snap="${id}">${label}側に合わせる</button>`).join('')}</div>
   <p>相手の配置済み部分に辺を合わせます。高さが違う場合は段差が残ります。</p>
   <svg data-work-plan role="img" aria-label="配置の下書き・上が北" style="display:block;width:100%;height:156px;background:#183435;border-radius:12px" preserveAspectRatio="xMidYMid meet"></svg>
   <p>上が北。橙：元の場所／緑：配置先／青：ほかの床／点線：保管部分。塗った上面の模様も表示します。下書きの確認中は保存されません。</p>
   <details><summary>位置を数値で調整</summary><label>東西の位置 <input data-work-position="x" type="number" step="1" min="-2400" max="2400"></label><label>南北の位置 <input data-work-position="z" type="number" step="1" min="-1450" max="1450"></label></details>
   <p data-work-move-summary role="status"></p><p data-work-move-problem role="status"></p>
   <div class="concrete-actions"><button data-work-move-review>配置内容を確認する</button><button data-work-move-reset>下書きを元に戻す</button></div>
  </section>
 </section>`;
export function createFreeWorkEditor({panel,getProject,problem,moveProblem,ask,preview}){
 const q=s=>panel.querySelector(s),select=q('[data-edit-work]'),grid=q('[data-work-parts]');
 let index=0,mask=0,key='',enabled=false,position={x:0,z:0},targetKey='',planKey='',moveNote='',quarterTurns=0;
 const work=()=>getProject().freeBuild.completed[index],turnLabels=['元の向き','右回り90度','180度','左回り90度'];
 const b=id=>q('[data-work-edit="'+id+'"]');
 for(let i=0;i<16;i++){const el=document.createElement('button');el.dataset.part=i;grid.append(el);el.onclick=()=>{if(!enabled||!(freeFilledMask(work())&(1<<i)))return;mask^=1<<i;refresh(enabled,true);};}
 function reset(){index=Number(select.value)||0;mask=freeWorkMask(work());position={x:work()?.x??0,z:work()?.z??0};moveNote='';quarterTurns=0;writePosition();}
 function writePosition(){for(const axis of ['x','z'])q('[data-work-position="'+axis+'"]').value=Number.isFinite(position[axis])?position[axis]:'';}
 select.onchange=()=>{reset();refresh(enabled,true);};
 q('[data-work-mode]').onchange=()=>{reset();refresh(enabled,true);};
 for(const el of panel.querySelectorAll('[data-work-rotate]'))el.onclick=()=>{if(!enabled)return;quarterTurns=(quarterTurns+(el.dataset.workRotate==='right'?1:3))%4;moveNote='';refresh(enabled,true);};
 for(const el of panel.querySelectorAll('[data-work-position]'))el.oninput=()=>{if(!enabled)return;position[el.dataset.workPosition]=el.value===''?NaN:Number(el.value);moveNote='';refresh(enabled,true);};
 for(const el of panel.querySelectorAll('[data-work-shift]'))el.onclick=()=>{if(!enabled)return;const [dx,dz]={north:[0,-1],south:[0,1],west:[-1,0],east:[1,0]}[el.dataset.workShift],step=Number(q('[data-work-step]').value);position={x:(Number.isFinite(position.x)?position.x:work().x)+dx*step,z:(Number.isFinite(position.z)?position.z:work().z)+dz*step};moveNote='';writePosition();refresh(enabled,true);};
 for(const el of panel.querySelectorAll('[data-work-snap]'))el.onclick=()=>{if(!enabled)return;const p=getProject(),target=freeWorkMoveTargets(p,index).find(t=>t.id===q('[data-work-target]').value),next=freeWorkSnapCandidates(rotateFreeWork(work(),quarterTurns),target,el.dataset.workSnap,position).find(pos=>!moveProblem(index,pos,quarterTurns));if(next){position=next;moveNote='';writePosition();}else moveNote='この側には安全に置ける場所がありません。別の側か相手を選んでください。';refresh(enabled,true);};
 q('[data-work-foundation]').onclick=()=>{if(!enabled)return;const next=supportedWorkSnapCandidates(getProject(),index,quarterTurns,position).find(pos=>!moveProblem(index,pos,quarterTurns)||!quarterTurns&&pos.x===work().x&&pos.z===work().z);if(next){position=next;moveNote='';writePosition();}else moveNote='この向きと形を支える場所がありません。同じ高さで必要なマスを持つ土台を用意してください。';refresh(enabled,true);};
 q('[data-work-move-reset]').onclick=()=>{if(!enabled)return;reset();refresh(enabled,true);};
 q('[data-work-move-review]').onclick=()=>{if(!enabled)return;const error=moveProblem(index,position,quarterTurns);if(error){moveNote=error;refresh(enabled,true);return;}const w=work(),s=freeWorkSummary(w);ask(constructionBase(w)?SUPPORTED_WORK_MOVE:quarterTurns?'FREE_TRANSFORM_WORK':'FREE_MOVE_WORK',{work:index,...position,...(constructionBase(w)||quarterTurns?{quarterTurns}:{})},`作品 ${index+1} を東西 ${w.x}・南北 ${w.z} から東西 ${position.x}・南北 ${position.z} へ配置します。${quarterTurns?`上から見て${turnLabels[quarterTurns]}に回転。`:"向きはそのまま。"}配置 ${s.placed}マス・保管 ${s.stored}マス、合計 ${s.totalCups}杯と厚さ・色を保持します。`);};
 for(const id of ['store','restore'])b(id).onclick=()=>{if(!enabled)return;mask=id==='store'?0:freeFilledMask(work());refresh(enabled,true);};
 b('review').onclick=()=>{if(!enabled)return;const error=problem(index,mask);if(error){q('[data-work-problem]').textContent=error;return;}const s=freeWorkSummary(work(),mask);ask('FREE_SET_WORK_PARTS',{work:index,mask},`作品 ${index+1} を配置 ${s.placed}マス（${s.placedCups}杯）・保管 ${s.stored}マス（${s.storedCups}杯）にします。厚さと塗った色を保持します。`);};
 function refresh(can,visible){
  enabled=can;const works=getProject().freeBuild.completed,next=JSON.stringify(works);
  if(next!==key){key=next;select.replaceChildren(...works.map((w,i)=>new Option('作品 '+(i+1),String(i))));index=Math.min(index,Math.max(0,works.length-1));select.value=works.length?String(index):'';reset();}
  const w=work(),s=freeWorkSummary(w,mask),all=freeFilledMask(w);select.disabled=!can||!w;
  for(const el of grid.children){const i=Number(el.dataset.part),exists=!!(all&(1<<i)),placed=!!(mask&(1<<i));el.disabled=!can||!exists;el.textContent=exists?(i+1)+' '+(placed?'配置':'保管'):'—';el.setAttribute('aria-label',exists?`マス ${i+1}：${placed?'配置':'保管'}、${w.fill[i]/4}杯`:'マス '+(i+1)+'：空白');el.setAttribute('aria-pressed',String(exists&&placed));}
  const error=w?problem(index,mask):'まだ完成した作品がありません。';q('[data-work-problem]').textContent=error;
  q('[data-work-summary]').textContent=`配置 ${s.placed}マス／${s.placedCups}杯・保管 ${s.stored}マス／${s.storedCups}杯（合計 ${s.totalCups}杯）`;
  b('store').disabled=!can||!w||!mask;b('restore').disabled=!can||!w||mask===all;b('review').disabled=!can||!!error;
  const moving=q('[data-work-mode]').value==='move';q('[data-work-parts-section]').hidden=moving;q('[data-work-move-section]').hidden=!moving;q('[data-work-mode]').disabled=!can||!w;
  if(visible&&moving){
   q('[data-work-angle]').textContent=quarterTurns?`元の向きから${turnLabels[quarterTurns]}（作品の中心で回転）`:'元の向き（作品の中心で回転）';
   const p=getProject(),targets=freeWorkMoveTargets(p,index),tk=JSON.stringify(targets),targetSelect=q('[data-work-target]');if(tk!==targetKey){targetKey=tk;const old=targetSelect.value;targetSelect.replaceChildren(...targets.map(t=>new Option(t.label,t.id)));if(targets.some(t=>t.id===old))targetSelect.value=old;}
   const error=w?moveProblem(index,position,quarterTurns):'まだ完成した作品がありません。';
   for(const el of q('[data-work-move-section]').querySelectorAll('button,select,input'))el.disabled=!can||!w;
   for(const el of panel.querySelectorAll('[data-work-snap]'))el.disabled=!can||!w||!freeWorkMask(w)||!targets.length;
   q('[data-work-foundation]').hidden=!constructionBase(w);q('[data-work-foundation]').disabled=!can||!w||!p.foundation;q('[data-work-support]').textContent=constructionBase(w)?`作品の底の高さ ${constructionBase(w)}。配置部分全体を同じ高さの土台のマスへ合わせます。別の土台へ移す時は、全て保管してから土台を回収し、次の場所へ進んで同じ高さの土台を設置してください。`:'';
   targetSelect.disabled=!can||!targets.length;q('[data-work-move-review]').disabled=!can||!!error;
   q('[data-work-move-summary]').textContent=`東西 ${position.x}・南北 ${position.z}｜配置 ${s.placed}マス・保管 ${s.stored}マス／合計 ${s.totalCups}杯`;
   q('[data-work-move-problem]').textContent=moveNote||error||'配置できます。確認してから実行してください。';
   const cells=Number.isFinite(position.x)&&Number.isFinite(position.z)?freeWorkMovePlan(p,index,position,quarterTurns):[],pk=JSON.stringify([cells,!!error]);if(pk!==planKey){planKey=pk;const svg=q('[data-work-plan]');if(cells.length){const minX=Math.min(...cells.map(c=>c.x))-16,minZ=Math.min(...cells.map(c=>c.z))-16,maxX=Math.max(...cells.map(c=>c.x))+16,maxZ=Math.max(...cells.map(c=>c.z))+16;svg.setAttribute('viewBox',`${minX} ${minZ} ${maxX-minX} ${maxZ-minZ}`);}svg.innerHTML=cells.map(c=>`<rect x="${c.x-8}" y="${c.z-8}" width="16" height="16" fill="${({source:'#f9ad68',other:'#8ec2eb',stored:'none',target:error?'#fa8b83':'#95e2bb'})[c.kind]}" fill-opacity=".55" stroke="${c.kind==='stored'?'#cad8d6':'#ffffff'}" stroke-width="1" ${c.kind==='stored'?'stroke-dasharray="2 2"':''}/>${c.kind==='target'?(c.paint??[]).map((color,i)=>FLOOR_COLORS[color]?`<rect x="${c.x-8+(i%4)*4}" y="${c.z-8+Math.floor(i/4)*4}" width="4" height="4" fill="${FLOOR_COLORS[color]}"/>`:'').join(''):''}`).join('');}
   preview(w&&Number.isFinite(position.x)&&Number.isFinite(position.z)?{work:index,position:{...position},quarterTurns,invalid:!!error}:null);
  }else preview(visible&&w?{work:index,mask}:null);
 }
 return{refresh,open(){key='';refresh(true,true);}};
}
