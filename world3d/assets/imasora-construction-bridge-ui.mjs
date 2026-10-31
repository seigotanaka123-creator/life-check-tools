import {CONSTRUCTION_BRIDGE,createConstructionBridgeGate} from './imasora-construction-town-bridge.mjs?v=120pr';

export function createConstructionBridgeUI({host,context,clearInput,returnTown}){
 const button=document.createElement('button');button.type='button';button.className='construction-bridge-return';button.textContent='🏘️ 橋を渡って街へ';button.hidden=true;host.append(button);
 const dialog=document.createElement('dialog');dialog.className='coast-return-dialog';dialog.setAttribute('aria-labelledby','construction-return-title');
 dialog.innerHTML='<span class="coast-return-icon" aria-hidden="true">🏘️</span><h2 id="construction-return-title">街にもどる？</h2><p>今の作業をセーブして、橋の向こうの街へ戻るよ。</p><p data-return-error role="status" hidden></p><div><button type="button" data-return-no autofocus>いいえ</button><button type="button" data-return-yes>はい</button></div>';
 document.body.append(dialog);
 const gate=createConstructionBridgeGate(),yes=dialog.querySelector('[data-return-yes]'),no=dialog.querySelector('[data-return-no]'),error=dialog.querySelector('[data-return-error]');let busy=false;
 const available=c=>c.map==='construction'&&!c.blocked&&!c.overlay&&!c.airborne;
 function ask(){const c=context();if(busy||dialog.open||!available(c))return;gate.latch();clearInput();error.hidden=true;dialog.showModal();no.focus();}
 button.onclick=ask;no.onclick=()=>{if(!busy)dialog.close();};
 dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();clearInput();});dialog.addEventListener('close',clearInput);
 yes.onclick=async()=>{if(busy)return;busy=true;clearInput();yes.disabled=no.disabled=true;yes.textContent='セーブ中…';error.hidden=true;
  try{if(await returnTown()===false)throw Error('いまは街へ戻れないみたい。少し待って、もう一度ためしてね。');dialog.close();}
  catch(e){error.textContent=e?.message||'セーブできなかったよ。現場に残って、もう一度ためしてね。';error.hidden=false;}
  finally{busy=false;yes.disabled=no.disabled=false;yes.textContent='はい';}
 };
 return {get open(){return dialog.open;},update(){const c=context();
  if(c.map!=='construction'){if(!button.hidden)button.hidden=true;gate.update(c);if(dialog.open&&!busy)dialog.close();return;}
  const blocked=!!(c.blocked||c.overlay||dialog.open||document.querySelector('dialog[open]'));
  const hidden=!available(c)||blocked||Math.abs(c.x-CONSTRUCTION_BRIDGE.x)>65||c.z<-1790||c.z>-1500;if(button.hidden!==hidden)button.hidden=hidden;
  if(gate.update({...c,blocked}))ask();
 },dispose(){button.remove();dialog.remove();}};
}
