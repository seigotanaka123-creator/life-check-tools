export function createWorldShopOverlay({service,onOpen,onClose,onError}){
  const dialog=document.createElement('dialog');dialog.className='world-shop-overlay';dialog.setAttribute('aria-label','火星素材ショップ');
  dialog.innerHTML='<header><strong>火星素材ショップ</strong><span>価格は調整中です</span><button type="button">お店を出る ×</button></header><iframe title="火星素材ショップの購入メニュー"></iframe><p role="status"></p>';
  const style=document.createElement('style');style.textContent='.world-shop-overlay{width:min(1120px,98vw);height:96dvh;max-height:96dvh;max-width:98vw;padding:0;border:2px solid #ccb87d;border-radius:16px;background:#172834;color:#fff;overflow:hidden}.world-shop-overlay::backdrop{background:#071018df}.world-shop-overlay[open]{display:flex;flex-direction:column}.world-shop-overlay header{display:flex;align-items:center;gap:12px;padding:8px 12px;flex:none;font:14px sans-serif}.world-shop-overlay header span{font-size:11px;flex:1;color:#c9bd9d}.world-shop-overlay button{min-height:42px;padding:6px 14px;border-radius:8px;background:#dac18c;color:#26313a;border:0}.world-shop-overlay iframe{border:0;flex:1;min-height:0;width:100%}.world-shop-overlay>p{margin:0 12px;font-size:12px}';document.head.append(style);document.body.append(dialog);
  const frame=dialog.querySelector('iframe'),close=dialog.querySelector('button'),status=dialog.querySelector('[role=status]');
  let opening=false,closing=false,token='';
  function reply(event,id,result,error){event.source.postMessage({type:'imasora-world-shop-response',token,id,result,error},location.origin);}
  addEventListener('message',async event=>{
    const m=event.data;
    if(!dialog.open||event.origin!==location.origin||event.source!==frame.contentWindow||m?.type!=='imasora-world-shop-request'||m.token!==token||typeof m.id!=='string'||m.id.length>100)return;
    try{
      if(closing)throw Error('お店を閉じています。');
      if(m.action==='read'){if(service.blocked)await service.retry();await service.flush();}
      else if(m.action==='prepare')await service.prepare(m.offer,m.quantity,m.orderId);
      else if(m.action==='settle')await service.settle(m.orderId,{cancel:m.cancel===true});
      else throw Error('この操作はショップから実行できません。');
      reply(event,m.id,{state:service.shopState,raw:service.export(),mode:service.mode},null);
    }catch(e){reply(event,m.id,null,e.message);}
  });
  async function leave(){
    if(opening||closing)return;closing=true;close.disabled=true;
    try{await service.flush();onClose(service.world);dialog.close();frame.removeAttribute('src');}
    catch(e){status.textContent=e.message;onError(e);}
    finally{closing=false;close.disabled=false;}
  }
  close.onclick=leave;dialog.addEventListener('cancel',e=>{e.preventDefault();void leave();});
  return {
    get open(){return opening||dialog.open;},
    async show(){
      if(opening||dialog.open)return;if(service.mode==='readonly')throw Error('この確認モードでは購入できません。通常画面またはショップ接続確認を使ってください。');
      opening=true;onOpen();
      try{await service.flush();token=crypto.randomUUID();status.textContent='';frame.src=`./imasora-construction-shop-dev.html?worldShop=1#${token}`;dialog.showModal();}
      catch(e){onError(e);throw e;}finally{opening=false;}
    },
  };
}

export{createWorldSaveErrorUI}from'./imasora-world-save-notice.mjs?v=120pw';
