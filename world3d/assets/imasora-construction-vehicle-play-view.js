// UI pause is local to this controller. It never rewrites a saved work record.
export function createVehiclePlayGate(clearInput){
  let active=false,paused=false;
  return {
    get active(){return active;},get paused(){return paused;},
    setActive(value){active=!!value;paused=false;clearInput();},
    setPaused(value){if(!active)return;paused=!!value;clearInput();},
    allows(action){return active&&(!paused||['camera','save','leave','stop'].includes(action));},
  };
}

// All working vehicles reserve their own dock beside/below the actual canvas.
// Existing controls are moved, so their safety checks and handlers are retained.
export function createVehiclePlayView({panel,canvas,prefix,groups,quick,clearInput,refresh}){
  // Idle vehicle information belongs beside the scene, never over its touch pad.
  // Reuse one adjacent dock; move the same controls back for an active session.
  const viewport=canvas.parentElement;
  let lobby=viewport.nextElementSibling;
  if(!lobby?.classList.contains('world-vehicle-lobby')){
    lobby=document.createElement('div');lobby.className='world-vehicle-lobby';
    lobby.setAttribute('role','region');lobby.setAttribute('aria-label','工事車両の作業案内');
    viewport.after(lobby);
  }
  lobby.append(panel);
  const gate=createVehiclePlayGate(clearInput),q=s=>panel.querySelector(s),active=q('.'+prefix+'-active');
  const message=q('.'+prefix+'-message'),stats=q('.'+prefix+'-stats'),footer=q('footer');
  panel.classList.add('world-vehicle-controls');active.classList.add('gv-active');message.classList.add('gv-message');
  const load=document.createElement('output');load.className='gv-load';load.setAttribute('aria-label','車両の積載');q('header').append(load);
  const nav=document.createElement('nav');nav.className='gv-nav';nav.setAttribute('aria-label','操作の種類');
  const pages=document.createElement('div');pages.className='gv-pages';
  const quickRow=document.createElement('div');quickRow.className='gv-quick';quickRow.setAttribute('aria-label','乗降・モード・視点');
  const details=document.createElement('details');details.className='gv-details';
  const summary=document.createElement('summary');summary.textContent='操作の詳細';details.append(summary);
  const info=document.createElement('div');info.className='gv-info';details.append(info);
  const fullMessage=document.createElement('p');info.append(fullMessage,stats);
  const help=document.createElement('p');help.textContent='WASD／矢印：移動。'+(prefix==='wt'?'クレーン作業中は既存の作業キーになります。':'')+'操作欄の見出しでボタンを切り替えます。';info.append(help);
  for(const el of panel.querySelectorAll('.'+prefix+'-surface,.'+prefix+'-detail'))info.append(el);
  const choices=[];
  function choose(id){clearInput();for(const c of choices){const yes=c.id===id;c.page.hidden=!yes;c.button.setAttribute('aria-pressed',String(yes));}pages.scrollTop=0;}
  for(const group of groups){
    const page=document.createElement('section');page.className='gv-page';page.setAttribute('aria-label',group.label+'の操作');
    for(const selector of group.selectors)for(const el of panel.querySelectorAll(selector))page.append(el);
    if(group.hint){const hint=document.createElement('p');hint.className='gv-hint';hint.textContent=group.hint;page.append(hint);}
    const button=document.createElement('button');button.type='button';button.textContent=group.label;button.addEventListener('click',()=>choose(group.id));
    nav.append(button);pages.append(page);choices.push({id:group.id,page,button});
  }
  for(const name of quick)quickRow.append(q('[data-action="'+name+'"]'));
  const pause=document.createElement('button');pause.type='button';pause.className='gv-pause';pause.textContent='一時停止';quickRow.append(pause);
  quickRow.dataset.count=String(quick.length+1);
  const menuButton=document.createElement('button');menuButton.type='button';menuButton.className='gv-menu-button';menuButton.dataset.vehicleMenu='open';menuButton.textContent='メニュー';menuButton.hidden=true;menuButton.setAttribute('aria-haspopup','dialog');menuButton.setAttribute('aria-expanded','false');q('header').append(menuButton);
  const menu=document.createElement('section');menu.className='gv-menu';menu.hidden=true;menu.setAttribute('role','dialog');menu.setAttribute('aria-modal','true');menu.setAttribute('aria-labelledby',prefix+'-game-menu-title');menu.setAttribute('aria-describedby',prefix+'-game-menu-paused');
  menu.innerHTML='<div class="gv-menu-card"><header class="gv-menu-header"><div><p class="gv-menu-vehicle"></p><h2 id="'+prefix+'-game-menu-title" tabindex="-1">ゲームメニュー</h2></div><span class="gv-menu-badge">一時停止中</span></header><div class="gv-menu-body"><p class="gv-menu-intro">作業を保存したり、車両の作業を終えたりできます。</p><p class="gv-menu-hint" role="status"></p><div class="gv-menu-actions"></div><div class="gv-menu-emergency"></div></div><footer class="gv-menu-footer"><button data-vehicle-menu="close" type="button">ゲームに戻る</button><p id="'+prefix+'-game-menu-paused">画面へ戻っても一時停止のままです。「再開」で作業を続けます。</p></footer></div>';
  const menuActions=menu.querySelector('.gv-menu-actions'),menuHint=menu.querySelector('.gv-menu-hint'),closeButton=menu.querySelector('[data-vehicle-menu="close"]'),heading=menu.querySelector('h2');
  for(const el of [...footer.children])menuActions.append(el);
  menu.querySelector('.gv-menu-body').append(details);
  // An unclassified control must remain accessible rather than silently disappear.
  for(const el of active.querySelectorAll('button,select'))info.append(el.closest('label')||el);
  active.replaceChildren(nav,pages,quickRow,menu);
  const emergency=document.getElementById('emergencyEscapeButton'),emergencyParent=emergency?.parentElement,emergencyNext=emergency?.nextSibling;
  let scroll=0,lastContext=null,menuOpened=false,lastBusy=false,restoreView=null;
  function setPaused(yes){gate.setPaused(yes);if(!yes)details.open=false;refresh();}
  pause.addEventListener('click',()=>{if(!menuOpened&&!lastBusy&&!restoreView?.locked)setPaused(!gate.paused);});
  details.addEventListener('toggle',()=>{if(gate.active&&details.open)setPaused(true);});
  function syncMenu(){menu.hidden=!menuOpened;menuButton.setAttribute('aria-expanded',String(menuOpened));panel.classList.toggle('gv-menu-open',menuOpened);}
  function closeMenu({force=false,focus=true}={}){if((lastBusy||restoreView?.locked)&&!force)return false;if(!force&&restoreView?.close()===false)return false;menuOpened=false;details.open=false;syncMenu();if(focus&&gate.active)menuButton.focus({preventScroll:true});refresh();return true;}
  menuButton.addEventListener('click',()=>{if(!gate.active||lastBusy||menuOpened)return;menuOpened=true;gate.setPaused(true);details.open=false;menu.querySelector('.gv-menu-vehicle').textContent=q('header strong').textContent.replace(/\s*v\d+(?:[.-]\S*)?\s*$/i,'');syncMenu();refresh();heading.focus({preventScroll:true});menu.querySelector('.gv-menu-body').scrollTop=0;});
  closeButton.addEventListener('click',()=>closeMenu());
  // Only an explicit emergency exit resumes pending boarding long enough for
  // the existing save-and-exit handler to finish. Ordinary menu close never does.
  emergency?.addEventListener('click',event=>{if(!gate.active)return;if(lastBusy||restoreView?.locked||restoreView?.active||restoreView?.busy){event.preventDefault();event.stopImmediatePropagation();return;}menuOpened=false;details.open=false;restoreView?.close();syncMenu();setPaused(false);},true);
  function handleKeyDown(event){
    if(!menuOpened)return false;
    if(event.key==='Escape'&&!event.isComposing){event.preventDefault();if(!restoreView?.handleEscape())closeMenu();return true;}
    if(event.key==='Tab'){
      const targets=[...menu.querySelectorAll('button,input,select,textarea,summary,[tabindex]')].filter(el=>!el.disabled&&el.tabIndex>=0&&el.getClientRects().length),first=targets[0],last=targets.at(-1),focused=document.activeElement;
      if(!first){event.preventDefault();heading.focus({preventScroll:true});}
      else if(event.shiftKey&&(focused===first||!targets.includes(focused))){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&(focused===last||!targets.includes(focused))){event.preventDefault();first.focus();}
    }
    return true;
  }
  choose(groups[0].id);
  return {
    get paused(){return gate.paused;},get menuOpen(){return menuOpened;},get menu(){return menu;},handleKeyDown,
    attachRestore(view){restoreView=view;},pause(){setPaused(true);},
    allows:action=>!restoreView?.locked&&!restoreView?.active&&!restoreView?.busy&&gate.allows(action)&&(!menuOpened||['save','leave'].includes(action)),
    setActive(value){
      if(gate.active===value)return;gate.setActive(value);menuOpened=false;syncMenu();details.open=false;lastContext=null;menuButton.hidden=!value;
      (value?viewport:lobby).append(panel);
      if(value){scroll=window.scrollY;if(emergency)menu.querySelector('.gv-menu-emergency').append(emergency);}
      else if(emergency&&emergencyParent)emergencyParent.insertBefore(emergency,emergencyNext?.parentNode===emergencyParent?emergencyNext:null);
      panel.classList.toggle('world-vehicle-controls-active',value);canvas.parentElement.classList.toggle('world-vehicle-operating',value);document.body.classList.toggle('world-vehicle-playing',value);
      if(!value)window.scrollTo(0,scroll);
    },
    refresh({busy,blocked,context,loadText,menuHint:hint=''}){
      lastBusy=!!busy;menuButton.hidden=!gate.active;menuButton.disabled=busy;closeButton.disabled=busy;menuHint.textContent=hint||(busy?'作業を保存しています。終わるまでお待ちください。':blocked?'作業を停止しています。操作の詳細でお知らせを確認してください。':'');menuHint.hidden=!menuHint.textContent;
      load.hidden=!gate.active;load.textContent=loadText;message.title=message.textContent;fullMessage.textContent=message.textContent;
      if(gate.active&&context!==lastContext){lastContext=context;choose(context==='working'&&choices.some(c=>c.id==='arm')?'arm':groups[0].id);}
      pause.textContent=gate.paused?'再開':'一時停止';pause.disabled=busy||blocked||menuOpened;
      q('[data-action="camera"]').disabled=busy||blocked||menuOpened;
      pause.setAttribute('aria-pressed',String(gate.paused));panel.classList.toggle('gv-paused',gate.paused);
      for(const c of choices)c.button.disabled=busy||blocked||menuOpened;
      if(gate.paused){for(const b of panel.querySelectorAll('[data-hold],[data-action],select'))if(!gate.allows(b.dataset.action)||(menuOpened&&!['save','leave'].includes(b.dataset.action)))b.disabled=true;}
      restoreView?.update();
    },
  };
}
