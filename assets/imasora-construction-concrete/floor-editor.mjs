import {FLOOR_PARTS,FLOOR_COLORS,floorMask,partCount,paintCost,paintRemaining} from './floor-parts.mjs';

// Drafts live only in the controller. Neither choosing a cell nor previewing
// a neighbour writes to the save; the existing confirmation queue does that.
export function createFloorEditor({panel,getPlanning,getProject,getLedger,changed,ask}){
 const planner=panel.querySelector('.concrete-planner');
 const box=document.createElement('section');box.className='concrete-floor-editor';box.hidden=true;
 box.innerHTML=`<p>部分をタップして形を選べます。外した部分は色ごと保管します。</p>
 <div class="concrete-panel-grid" aria-label="置く床の部分">${FLOOR_PARTS.map((p,i)=>`<button data-panel="${i}" aria-pressed="false">${p.label}</button>`).join('')}</div>
 <p data-panel-count role="status"></p><div class="concrete-floor-actions"><button data-mask="0">全て撤去して保管</button><button data-mask="15">全て復元する</button></div>
 <details data-paint-menu><summary>床の上面を塗る</summary><fieldset><legend>塗装</legend><label>塗る部分 <select data-paint-part aria-label="塗る部分"><option value="all">配置済みの全面</option>${FLOOR_PARTS.map((p,i)=>`<option value="${i}">${p.label}</option>`).join('')}</select></label>
 <label>色 <select data-paint-color aria-label="ペンキの色">${['白','赤','黄','緑','青','黒'].map((name,i)=>`<option value="${Object.keys(FLOOR_COLORS)[i]}">${name}</option>`).join('')}</select></label>
 <p data-paint-stock></p><button data-paint>塗装を確認する</button></fieldset></details>`;
 planner.querySelector('[data-placement-status]').before(box);
 const connection=document.createElement('section');connection.className='concrete-floor-connection';connection.hidden=true;
 connection.innerHTML='<label>接続先の床 <select aria-label="接続先の床"></select></label><div class="concrete-floor-actions">'+[['west','西'],['east','東'],['north','北'],['south','南']].map(([key,name])=>`<button data-connect="${key}">${name}側へ接続</button>`).join('')+'</div>';
 planner.querySelector('[data-placement-status]').before(connection);
 const draft=()=>getPlanning(),floor=()=>getProject().completedFloors[draft()?.floorIndex];
 const paintSelection=()=>box.querySelector('[data-paint-part]').value==='all'?floorMask(floor()):1<<Number(box.querySelector('[data-paint-part]').value);
 for(const b of box.querySelectorAll('[data-panel]'))b.onclick=()=>{draft().mask^=1<<Number(b.dataset.panel);changed();};
 for(const b of box.querySelectorAll('[data-mask]'))b.onclick=()=>{draft().mask=Number(b.dataset.mask);changed();};
 for(const input of box.querySelectorAll('select'))input.onchange=changed;
 box.querySelector('[data-paint]').onclick=()=>{
  const mask=paintSelection(),color=box.querySelector('[data-paint-color]').value,cost=paintCost(floor(),mask,color);
  ask('PAINT_FLOOR_PANELS',`${draft().floorIndex+1}枚目の床の選択した上面を塗ります。ペンキを${cost}面分使います。`,{floorIndex:draft().floorIndex,mask,color});
 };
 let connectionKey='';
 for(const b of connection.querySelectorAll('[data-connect]'))b.onclick=()=>{
  const target=getProject().completedFloors[Number(connection.querySelector('select').value)];if(!target)return;
  const [dx,dz]={west:[-32,0],east:[32,0],north:[0,-32],south:[0,32]}[b.dataset.connect];
  Object.assign(draft(),{x:target.x+dx,z:target.z+dz});
  for(const axis of ['x','z'])panel.querySelector(`[data-place="${axis}"]`).value=draft()[axis];changed();
 };
 function update(ready){
  const p=draft(),isEdit=p?.mode==='edit';box.hidden=!isEdit;connection.hidden=p?.mode!=='move';
  for(const e of planner.querySelectorAll('[data-place]'))e.parentElement.hidden=isEdit;
  planner.querySelector('[data-shift]').parentElement.hidden=isEdit;
  if(isEdit){
   for(const b of box.querySelectorAll('button,select'))b.disabled=!ready;
   for(const b of box.querySelectorAll('[data-panel]'))b.setAttribute('aria-pressed',String(!!(p.mask&(1<<Number(b.dataset.panel)))));
   box.querySelector('[data-panel-count]').textContent=`配置 ${partCount(p.mask)}部分／保管 ${4-partCount(p.mask)}部分（1部分＝生コン1杯分）`;
   const stock=paintRemaining(getProject(),getLedger());let cost=0,problem='';
   try{cost=paintCost(floor(),paintSelection(),box.querySelector('[data-paint-color]').value);if(!cost)problem='選択した部分は同じ色です。';else if(cost>stock)problem='ペンキが足りません。';}catch{problem='配置されている部分を選んでください。';}
   if(p.mask!==floorMask(floor()))problem='先に床の配置を確定してください。';
   box.querySelector('[data-paint-stock]').textContent=`ペンキ残り ${stock}面分。${problem||`今回 ${cost}面分を使います。`}`;
   box.querySelector('[data-paint]').disabled=!ready||!!problem;
  }
  if(!connection.hidden){
   const peers=getProject().completedFloors.flatMap((f,i)=>i!==p.floorIndex&&floorMask(f)?[{i,f}]:[]),key=JSON.stringify(peers);
   const select=connection.querySelector('select');if(key!==connectionKey){connectionKey=key;const old=select.value;select.replaceChildren(...peers.map(({i})=>new Option(`${i+1}枚目の床`,String(i))));if(peers.some(({i})=>String(i)===old))select.value=old;}
   for(const e of connection.querySelectorAll('button,select'))e.disabled=!ready||!peers.length;
  }
 }
 return{update};
}
