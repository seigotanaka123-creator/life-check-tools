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
  const gate=createVehiclePlayGate(clearInput),q=s=>panel.querySelector(s),active=q('.'+prefix+'-active');
  const message=q('.'+prefix+'-message'),stats=q('.'+prefix+'-stats'),footer=q('footer');
  panel.classList.add('world-vehicle-controls');active.classList.add('gv-active');message.classList.add('gv-message');
  const load=document.createElement('output');load.className='gv-load';load.setAttribute('aria-label','車両の積載');q('header').append(load);
  const nav=document.createElement('nav');nav.className='gv-nav';nav.setAttribute('aria-label','操作の種類');
  const pages=document.createElement('div');pages.className='gv-pages';
  const quickRow=document.createElement('div');quickRow.className='gv-quick';quickRow.setAttribute('aria-label','乗降・モード・視点');
  const details=document.createElement('details');details.className='gv-details';
  const summary=document.createElement('summary');summary.textContent='詳細・保存';details.append(summary);
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
  for(const el of [...footer.children])info.append(el);
  // An unclassified control must remain accessible rather than silently disappear.
  for(const el of active.querySelectorAll('button,select'))info.append(el.closest('label')||el);
  active.replaceChildren(nav,pages,quickRow,details);
  const emergency=document.getElementById('emergencyEscapeButton'),emergencyParent=emergency?.parentElement,emergencyNext=emergency?.nextSibling;
  let scroll=0,lastContext=null;
  function setPaused(yes){gate.setPaused(yes);if(!yes)details.open=false;refresh();}
  pause.addEventListener('click',()=>setPaused(!gate.paused));
  details.addEventListener('toggle',()=>{if(gate.active&&details.open)setPaused(true);});
  emergency?.addEventListener('click',()=>{if(gate.active)setPaused(false);},true);
  choose(groups[0].id);
  return {
    get paused(){return gate.paused;},allows:action=>gate.allows(action),
    setActive(value){
      if(gate.active===value)return;gate.setActive(value);details.open=false;lastContext=null;
      if(value){scroll=window.scrollY;if(emergency)info.append(emergency);}
      else if(emergency&&emergencyParent)emergencyParent.insertBefore(emergency,emergencyNext?.parentNode===emergencyParent?emergencyNext:null);
      panel.classList.toggle('world-vehicle-controls-active',value);canvas.parentElement.classList.toggle('world-vehicle-operating',value);document.body.classList.toggle('world-vehicle-playing',value);
      if(!value)window.scrollTo(0,scroll);
    },
    refresh({busy,blocked,context,loadText}){
      load.hidden=!gate.active;load.textContent=loadText;message.title=message.textContent;fullMessage.textContent=message.textContent;
      if(gate.active&&context!==lastContext){lastContext=context;choose(context==='working'&&choices.some(c=>c.id==='arm')?'arm':groups[0].id);}
      pause.textContent=gate.paused?'再開':'一時停止';pause.disabled=busy||blocked;
      q('[data-action="camera"]').disabled=busy||blocked;
      pause.setAttribute('aria-pressed',String(gate.paused));panel.classList.toggle('gv-paused',gate.paused);
      for(const c of choices)c.button.disabled=busy||blocked;
      if(gate.paused){for(const b of panel.querySelectorAll('[data-hold],[data-action],select'))if(!gate.allows(b.dataset.action))b.disabled=true;}
    },
  };
}
