// Walking-map building operations. Persistence belongs to the supplied callbacks.
export function createWorldMapMenu({mount=document.body,getContext,save,reset,remove=null,move=null,canMove=null,onMovePreview=()=>{},undo,onPause,onResume,buildList=null,onChange=()=>{}}){
  let opened=false,paused=false,localBusy=false,screen='home',plan=null,notice='',returnFocus=null;
  const box=document.createElement('section');box.className='world-map-menu';box.hidden=true;box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
  const id='world-map-menu-'+globalThis.crypto.randomUUID();box.setAttribute('aria-labelledby',id+'-title');box.setAttribute('aria-describedby',id+'-paused');
  box.innerHTML=`<div class="wmm-card"><header class="wmm-header"><div><p data-map-menu-name></p><h2 id="${id}-title" tabindex="-1">建物メニュー</h2></div><span class="wmm-badge">一時停止中</span></header>
    <div class="wmm-body"><section data-map-menu-screen="home"><p class="wmm-intro">このマップに建てた建物の保存・片付けができます。</p><p class="wmm-count" data-map-menu-count></p><div class="wmm-actions"><button type="button" data-map-menu="save">今の状態を保存</button><button type="button" data-map-menu="reset">このマップの建物を片付ける</button><button type="button" data-map-menu="undo">前の片付けを取り消す</button></div><p data-map-menu-undo-note></p></section>
    <section data-map-menu-screen="confirm" hidden><p class="wmm-intro" data-map-menu-confirm-intro></p><table class="wmm-comparison"><caption>片付け対象の建物の数</caption><thead><tr><th scope="col">現在</th><th scope="col">操作後</th></tr></thead><tbody><tr><td data-map-menu-before></td><td data-map-menu-after></td></tr></tbody></table><p data-map-menu-confirm-note></p></section>
    <p class="wmm-preserve">所持品やUFO、地形、ほかのマップは変わりません。</p><p class="wmm-status" data-map-menu-status role="status" aria-live="polite"></p></div>
    <footer class="wmm-footer"><div class="wmm-footer-actions"><button type="button" data-map-menu="confirm" hidden></button><button type="button" data-map-menu="cancel" hidden>取り消してメニューへ戻る</button><button type="button" data-map-menu="close">閉じる（一時停止のまま）</button></div><p id="${id}-paused">閉じた後も一時停止しています。「ゲームを再開」で続けられます。</p></footer></div>`;
  const resumeBox=document.createElement('section');resumeBox.className='world-map-menu-resume';resumeBox.hidden=true;resumeBox.setAttribute('aria-label','徒歩操作の一時停止');resumeBox.innerHTML='<span>一時停止中</span><button type="button" data-map-menu="resume">ゲームを再開</button><button type="button" data-map-menu="reopen">建物メニュー</button><p data-map-menu-resume-reason role="status"></p>';
  const removeSection=document.createElement('section');removeSection.dataset.mapMenuScreen='remove';removeSection.hidden=true;
  removeSection.innerHTML='<p>片付ける建物を一つ選んでください。次の画面で対象を確認してから確定します。</p><div class="wmm-actions" data-map-menu-removables></div><p>ほかの建物はそのまま残します。直前の片付けは、建物を変更する前なら取り消せます。</p>';
  box.querySelector('.wmm-body').prepend(removeSection);
  const removeButton=document.createElement('button');removeButton.type='button';removeButton.dataset.mapMenu='remove';removeButton.textContent='建物を選んで片付ける';box.querySelector('[data-map-menu-screen="home"] .wmm-actions').prepend(removeButton);
  const moveSection=document.createElement('section');moveSection.dataset.mapMenuScreen='move';moveSection.hidden=true;
  moveSection.innerHTML='<p>移動する工事現場の建物を選んでください。次の画面でX/Z座標を調整し、配置プレビューを確認して確定します。</p><div class="wmm-actions" data-map-menu-movables></div><p>高さ・建物の向き・素材・ほかの建物は変更しません。</p>';
  box.querySelector('.wmm-body').prepend(moveSection);
  const moveConfirm=document.createElement('section');moveConfirm.dataset.mapMenuScreen='move-confirm';moveConfirm.hidden=true;
  moveConfirm.innerHTML='<p data-map-menu-move-intro></p><div class="wmm-coordinates"><label>X 座標<input data-map-menu-move-x type="number" step="0.5" inputmode="decimal"></label><label>Z 座標<input data-map-menu-move-z type="number" step="0.5" inputmode="decimal"></label></div><svg class="wmm-move-map" data-map-menu-move-map viewBox="0 0 360 240" role="img" aria-label="工事現場の建物配置図"><rect class="wmm-move-map-ground" x="0" y="0" width="360" height="240"></rect><g data-map-menu-move-zones></g><circle class="wmm-move-map-current" data-map-menu-move-current r="5"></circle><circle class="wmm-move-map-target" data-map-menu-move-target r="6"></circle></svg><p class="wmm-move-map-legend">白い点：現在位置　色付きの点：移動先</p><p data-map-menu-move-from></p><p data-map-menu-move-validation role="status" aria-live="polite"></p><p data-map-menu-move-preview-note></p></section>';
  box.querySelector('.wmm-body').prepend(moveConfirm);
  const moveButton=document.createElement('button');moveButton.type='button';moveButton.dataset.mapMenu='move';moveButton.textContent='建物を移動する';box.querySelector('[data-map-menu-screen="home"] .wmm-actions').prepend(moveButton);
  removeButton.onclick=()=>{if(localBusy||!ready(context())||!remove)return;screen='remove';plan=null;notice='';changed();focusHeading();};
  moveButton.onclick=()=>{if(localBusy||!ready(context())||!move)return;screen='move';plan=null;notice='';changed();focusHeading();};
  if(buildList){
    const section=document.createElement('section');section.dataset.mapMenuScreen='build';section.hidden=true;
    const intro=document.createElement('p');intro.textContent='建てたい建物を選んでください。選ぶだけでは建物は増えません。ゲームを再開し、配置場所を確認してから「ここに建てる」で確定します。';
    section.append(intro,buildList);box.querySelector('.wmm-body').prepend(section);
    const choose=document.createElement('button');choose.type='button';choose.dataset.mapMenu='build';choose.textContent='建物を選ぶ';
    box.querySelector('[data-map-menu-screen="home"] .wmm-actions').prepend(choose);
    choose.onclick=()=>{if(localBusy||context().busy)return;screen='build';plan=null;notice='';changed();focusHeading();};
  }
  mount.append(box,resumeBox);
  const q=selector=>box.querySelector(selector),button=name=>q(`[data-map-menu="${name}"]`),heading=q('h2'),resumeButton=resumeBox.querySelector('[data-map-menu="resume"]'),reopenButton=resumeBox.querySelector('[data-map-menu="reopen"]'),resumeReason=resumeBox.querySelector('p');
  const number=value=>Number.isSafeInteger(value)&&value>=0;
  function context(){try{return getContext()||{};}catch{return {available:false,blocked:true,reason:'マップの状態を確認できません。メニューを閉じて、もう一度確認してください。'};}}
  function blockedReason(c){return c.reason||(c.readonly?'この画面では建物の保存・変更はできません。':c.blocked?'保存の確認が必要なため、建物の変更を停止しています。':c.available===false?'今は建物を変更できません。安全な場所で確認してください。':'');}
  function ready(c){return c.available!==false&&!c.busy&&!c.blocked&&!c.readonly&&typeof c.mapKey==='string'&&c.mapKey.length>0&&number(c.count);}
  function samePlan(c){return plan&&c.mapKey===plan.context.mapKey&&c.count===plan.context.count&&['generation','expectedRaw','buildingsRaw','resetId'].every(key=>c[key]===plan.context[key])&&(plan.kind!=='undo'||(c.canUndo===plan.context.canUndo&&c.undoCount===plan.context.undoCount));}
  function failure(error,fallback){const text=typeof error?.message==='string'?error.message:'';return /[\u3040-\u30ff\u3400-\u9fff]/.test(text)?text:fallback;}
  function update(){
    const c=context(),busy=localBusy||!!c.busy;
    if(opened&&['confirm','move-confirm'].includes(screen)&&!localBusy&&(!samePlan(c)||!ready(c))){onMovePreview(null);plan=null;screen='home';notice='マップや保存の状態が変わりました。現在の内容を確認して、操作を選び直してください。';}
    box.hidden=!opened;resumeBox.hidden=!paused||opened;q('[data-map-menu-name]').textContent=c.mapName||'現在のマップ';heading.textContent=screen==='confirm'?(plan?.kind==='undo'?(plan.context.undoKind==='move'?'移動を取り消しますか？':'片付けを取り消しますか？'):'建物を片付けますか？'):'建物メニュー';
    if(screen==='build')heading.textContent='建物を選ぶ';
    if(screen==='remove')heading.textContent='片付ける建物を選ぶ';
    if(screen==='move')heading.textContent='移動する建物を選ぶ';
    if(screen==='move-confirm')heading.textContent='移動先を確認';
    removeButton.hidden=!remove;removeButton.disabled=busy||!ready(c)||!c.removable?.length;
    moveButton.hidden=!move||!c.movable?.length;moveButton.disabled=busy||!ready(c)||!c.movable?.length;
    if(opened&&screen==='remove'){
      const list=q('[data-map-menu-removables]'),key=JSON.stringify([c.removable,busy,ready(c)]);
      if(list.dataset.version!==key){list.replaceChildren();list.dataset.version=key;
        for(const item of c.removable??[]){const b=document.createElement('button');b.type='button';b.textContent=`${item.name}（${item.location}）`;b.disabled=busy||!ready(c);b.onclick=()=>inspect('remove',item.id);list.append(b);}
        if(!c.removable?.length)list.textContent='片付けられる建物はありません。';
      }
    }
    if(opened&&screen==='move'){
      const list=q('[data-map-menu-movables]'),key=JSON.stringify([c.movable,busy,ready(c)]);
      if(list.dataset.version!==key){list.replaceChildren();list.dataset.version=key;
        for(const item of c.movable??[]){const b=document.createElement('button');b.type='button';b.textContent=`${item.name}（${item.location}）`;b.disabled=busy||!ready(c);b.onclick=()=>inspect('move',item.id);list.append(b);}
        if(!c.movable?.length)list.textContent='移動できる工事現場の建物はありません。';
      }
    }
    if(buildList){button('build').disabled=busy||!ready(c);for(const choice of buildList.querySelectorAll('button'))choice.disabled=busy||!ready(c)||choice.dataset.built==='true';}
    q('[data-map-menu-count]').textContent=number(c.count)?`片付け対象の建物：${c.count}個`:'建物の数を確認しています。';
    button('undo').textContent=c.undoKind==='move'?'前の移動を取り消す':'前の片付けを取り消す';
    q('[data-map-menu-undo-note]').textContent=c.canUndo&&number(c.undoCount)?`${c.undoKind==='move'?'前の移動':'前の片付け'}（${c.undoLabel||'このマップの対象建物'}）を取り消すと、建物${c.undoCount}個の状態へ戻せます。`:'取り消せる建物操作はありません。';
    for(const section of box.querySelectorAll('[data-map-menu-screen]'))section.hidden=section.dataset.mapMenuScreen!==screen;
    const unavailable=busy||!ready(c);button('save').disabled=unavailable;button('reset').disabled=unavailable||c.count===0;button('undo').disabled=unavailable||!c.canUndo||!number(c.undoCount);
    const moveCheck=screen==='move-confirm'?checkMovePlan(c):null;
    button('confirm').hidden=!['confirm','move-confirm'].includes(screen);button('confirm').disabled=busy||!ready(c)||!plan||(plan.kind==='move'&&!moveCheck?.valid);button('cancel').hidden=screen==='home';button('cancel').textContent=['build','remove','move'].includes(screen)?'建物メニューへ戻る':'取り消してメニューへ戻る';button('cancel').disabled=busy;button('close').disabled=busy;
    if(plan){
      const isUndo=plan.kind==='undo',single=plan.kind==='remove';
      button('confirm').textContent=plan.kind==='move'?'この位置へ移動する':isUndo?'この内容で操作を取り消す':single?'この建物だけを片付ける':'このマップの建物を片付ける';
      q('[data-map-menu-confirm-intro]').textContent=isUndo?`${plan.context.mapName||'このマップ'}の前の${plan.context.undoKind==='move'?'移動':'片付け'}（${plan.context.undoLabel||'対象建物'}）を取り消します。`:single?`${plan.target.name}（${plan.target.location}）だけを片付けます。ほかの建物は残します。`:`${plan.context.mapName||'このマップ'}の片付け対象の建物をすべて片付けます。`;
      q('.wmm-comparison caption').textContent=isUndo&&plan.context.undoKind==='move'?'操作前後の建物の数':'片付け対象の建物の数';
      q('[data-map-menu-before]').textContent=`${plan.context.count}個`;q('[data-map-menu-after]').textContent=`${isUndo?plan.context.undoCount:single?plan.context.count-1:0}個`;
      q('[data-map-menu-confirm-note]').textContent=isUndo?'下の確定ボタンを押すまで建物は変わりません。'+(plan.context.undoKind==='move'?'移動前の位置に戻します。白レンの位置は変えません。':'確定後は、このマップの安全地点へ移動します。'):'片付け前の建物は控えに残します。下の確定ボタンを押すまで建物は変わりません。次の片付けを確定すると、取り消せるのはその操作だけになります。確定後は、このマップの安全地点へ移動します。';
    }
    if(plan?.kind==='move'){
      const xInput=q('[data-map-menu-move-x]'),zInput=q('[data-map-menu-move-z]');
      if(document.activeElement!==xInput)xInput.value=String(plan.position[0]);
      if(document.activeElement!==zInput)zInput.value=String(plan.position[1]);
      q('[data-map-menu-move-intro]').textContent=`${plan.target.name}の配置先を調整しています。保存前の位置はX ${plan.target.position[0].toFixed(1)} / Z ${plan.target.position[2].toFixed(1)}です。`;
      q('[data-map-menu-move-from]').textContent=`移動先：X ${Number.isFinite(plan.position[0])?plan.position[0].toFixed(1):'—'} / Z ${Number.isFinite(plan.position[1])?plan.position[1].toFixed(1):'—'}`;
      q('[data-map-menu-move-validation]').textContent=moveCheck?.message||'X/Z座標を入力してください。';
      q('[data-map-menu-move-validation]').dataset.valid=String(!!moveCheck?.valid);
      q('[data-map-menu-move-preview-note]').textContent=moveCheck?.valid?'緑色のプレビュー位置に移動できます。':'赤色のプレビュー位置は確定できません。';
      renderMoveMap(plan,c,moveCheck);
      onMovePreview({targetId:plan.target.id,position:[plan.position[0],plan.target.position[1],plan.position[1]],valid:!!moveCheck?.valid});
    }else onMovePreview(null);
    q('[data-map-menu-status]').textContent=localBusy?'保存の結果を確認しています。終わるまでお待ちください。':c.busy?'保存中です。終わるまでお待ちください。':blockedReason(c)||notice;
    resumeButton.disabled=busy||!!c.blocked;reopenButton.disabled=localBusy;resumeReason.textContent=busy?'保存の確認が終わるまでお待ちください。':c.blocked?blockedReason(c):notice&&notice.startsWith('再開できません')?notice:'';resumeReason.hidden=!resumeReason.textContent;
  }
  function changed(){update();onChange({opened,paused,busy:localBusy||!!context().busy,screen});}
  function focusHeading(){heading.focus({preventScroll:true});q('.wmm-body').scrollTop=0;}
  function show(initialScreen='home'){if(opened||localBusy)return false;if(!paused)returnFocus=document.activeElement;onPause();paused=true;opened=true;screen=initialScreen==='build'&&buildList?'build':'home';plan=null;notice='';changed();focusHeading();return true;}
  function close(){if(localBusy||context().busy)return false;onMovePreview(null);opened=false;screen='home';plan=null;notice='';changed();resumeButton.focus({preventScroll:true});return true;}
  function checkMovePlan(c){
    if(!plan||plan.kind!=='move'||!Array.isArray(plan.position)||plan.position.length!==2||!plan.position.every(Number.isFinite))return{valid:false,message:'X/Z座標を入力してください。'};
    if(plan.position[0]===plan.target.position[0]&&plan.position[1]===plan.target.position[2])return{valid:false,message:'移動先が現在位置と同じです。X/Zを変更してください。'};
    try{const result=canMove?.(plan.target.id,[plan.position[0],plan.target.position[1],plan.position[1]],plan.context);return result===true?{valid:true,message:'この配置で移動できます。'}:result&&typeof result==='object'?result:{valid:false,message:'配置できない場所です。'};}
    catch(error){return{valid:false,message:failure(error,'配置位置を確認できません。')};}
  }
  function renderMoveMap(movePlan,c,moveCheck){
    const svg=q('[data-map-menu-move-map]'),zoneGroup=q('[data-map-menu-move-zones]'),key=JSON.stringify(c.moveZones??[]);
    if(zoneGroup.dataset.version!==key){zoneGroup.replaceChildren();zoneGroup.dataset.version=key;
      for(const zone of c.moveZones??[]){const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');rect.setAttribute('x',String(180+zone.x/540*360-zone.width/540*360/2));rect.setAttribute('y',String(120+zone.z/360*240-zone.depth/360*240/2));rect.setAttribute('width',String(zone.width/540*360));rect.setAttribute('height',String(zone.depth/360*240));rect.setAttribute('rx','4');rect.classList.add('wmm-move-map-zone');zoneGroup.append(rect);}
    }
    const point=(x,z)=>({x:180+x/540*360,y:120+z/360*240});
    const current=point(movePlan.target.position[0],movePlan.target.position[2]),target=point(movePlan.position[0],movePlan.position[1]);
    const currentDot=q('[data-map-menu-move-current]'),targetDot=q('[data-map-menu-move-target]');currentDot.setAttribute('cx',String(current.x));currentDot.setAttribute('cy',String(current.y));
    const within=Number.isFinite(target.x)&&Number.isFinite(target.y)&&target.x>=0&&target.x<=360&&target.y>=0&&target.y<=240;
    targetDot.setAttribute('cx',String(target.x));targetDot.setAttribute('cy',String(target.y));targetDot.classList.toggle('is-invalid',!moveCheck?.valid);
    if(within)targetDot.removeAttribute('display');else targetDot.setAttribute('display','none');
    svg.dataset.valid=String(!!moveCheck?.valid);
  }
  function updateMoveCoordinates(){if(!plan||plan.kind!=='move')return;const x=q('[data-map-menu-move-x]').valueAsNumber,z=q('[data-map-menu-move-z]').valueAsNumber;plan.position=[x,z];changed();}
  q('[data-map-menu-move-x]').oninput=updateMoveCoordinates;q('[data-map-menu-move-z]').oninput=updateMoveCoordinates;
  function inspect(kind,targetId=null){const c=context(),target=kind==='remove'?c.removable?.find(item=>item.id===targetId):kind==='move'?c.movable?.find(item=>item.id===targetId):null;if(localBusy||!ready(c)||(kind==='remove'&&(!remove||!target))||(kind==='move'&&(!move||!target))||(kind==='reset'&&c.count===0)||(kind==='undo'&&(!c.canUndo||!number(c.undoCount))))return;plan={kind,context:{...c},target:target?{...target}:null,...(kind==='move'?{position:[target.position[0],target.position[2]]}:{})};screen=kind==='move'?'move-confirm':'confirm';notice='内容を確認してください。まだ建物は変更していません。';changed();focusHeading();}
  function cancel(){if(localBusy||context().busy)return;onMovePreview(null);plan=null;screen='home';notice='操作を取り消しました。建物は変更していません。';changed();focusHeading();}
  async function execute(kind){
    const c=context();if(localBusy||!ready(c))return;
    if(kind!=='save'&&(!plan||plan.kind!==kind||!samePlan(c))){plan=null;screen='home';notice='内容をもう一度確認してください。建物は変更していません。';changed();focusHeading();return;}
    const expected=kind==='save'?{...c}:{...plan.context},targetId=plan?.target?.id,position=plan?.kind==='move'?[plan.position[0],plan.target.position[1],plan.position[1]]:null;localBusy=true;onMovePreview(null);changed();
    try{const result=await(kind==='save'?save(expected):kind==='reset'?reset(expected):kind==='remove'?remove(expected,targetId):kind==='move'?move(expected,targetId,position):undo(expected));if(result===false||result?.ok===false)throw Error(blockedReason(context())||'保存を確認できませんでした。現在の表示を確認してください。');plan=null;screen='home';notice=kind==='save'?'保存しました。':kind==='reset'?'このマップの建物を片付けました。':kind==='remove'?'選んだ建物を片付けました。ほかの建物は残しています。':kind==='move'?'建物を移動しました。ほかの保存データは保持しています。':'前の建物操作を取り消しました。';}
    catch(error){plan=null;screen='home';notice=failure(error,'操作を完了できませんでした。保存状態を確認してから、もう一度お試しください。');}
    finally{localBusy=false;onMovePreview(null);changed();focusHeading();}
  }
  button('save').onclick=()=>{if(!button('save').disabled)void execute('save');};button('reset').onclick=()=>inspect('reset');button('undo').onclick=()=>inspect('undo');button('confirm').onclick=()=>{if(!button('confirm').disabled&&plan)void execute(plan.kind);};button('cancel').onclick=cancel;button('close').onclick=close;
  reopenButton.onclick=show;
  resumeButton.onclick=async()=>{const c=context();if(opened||!paused||localBusy||c.busy||c.blocked)return;localBusy=true;changed();try{const result=await onResume();if(result===false)throw Error('再開できません。マップの状態を確認してください。');paused=false;notice='';}catch(error){notice='再開できません。'+failure(error,'メニューを開き直して、マップの状態を確認してください。');}finally{localBusy=false;changed();if(!paused&&returnFocus?.isConnected)returnFocus.focus?.({preventScroll:true});}};
  function handleKeyDown(event){
    if(!opened)return false;
    if(event.key==='Escape'&&!event.isComposing){event.preventDefault();close();return true;}
    if(event.key==='Tab'&&!event.altKey&&!event.ctrlKey&&!event.metaKey){const items=[...box.querySelectorAll('button,[tabindex]')].filter(element=>!element.disabled&&element.tabIndex>=0&&element.getClientRects().length),first=items[0],last=items.at(-1),current=document.activeElement;if(!first){event.preventDefault();heading.focus({preventScroll:true});}else if(event.shiftKey&&(current===first||!items.includes(current))){event.preventDefault();last.focus({preventScroll:true});}else if(!event.shiftKey&&(current===last||!items.includes(current))){event.preventDefault();first.focus({preventScroll:true});}}
    return true;
  }
  box.addEventListener('keydown',event=>{if(handleKeyDown(event))event.stopPropagation();});update();
  function recovered(){onMovePreview(null);plan=null;screen='home';notice='保存を確認し、建物の表示を更新しました。';changed();requestAnimationFrame(()=>{if(opened&&!document.querySelector('.world-save-error[open]'))focusHeading();});}
  return {show,close,update,recovered,handleKeyDown,get opened(){return opened;},get paused(){return paused;}};
}
