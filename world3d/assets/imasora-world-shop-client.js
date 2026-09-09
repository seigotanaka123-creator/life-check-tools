import {WORLD_LEDGER as L} from './imasora-world-live-ledger.js';
export function createWorldShopClient(){
  if(parent===window)throw Error('このショップは火星の店主から開いてください。');
  const token=location.hash.slice(1);if(!/^[\w-]{36}$/.test(token))throw Error('ショップ接続情報がありません。');
  const pending=new Map();let busy=false,blocked=false,state=null,raw=null,mode='live';
  addEventListener('message',event=>{const m=event.data;if(event.source!==parent||event.origin!==location.origin||m?.type!=='imasora-world-shop-response'||m.token!==token)return;const job=pending.get(m.id);if(!job)return;pending.delete(m.id);clearTimeout(job.timer);m.error?job.reject(Error(m.error)):job.resolve(m.result);});
  async function call(action,args={}){
    if(busy)throw Error('保存処理中です。');busy=true;
    try{const id=crypto.randomUUID(),result=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(Error('保存結果を確認できません。保存を読み直してください。'));},20000);pending.set(id,{resolve,reject,timer});parent.postMessage({type:'imasora-world-shop-request',token,id,action,...args},location.origin);});state=result.state;raw=result.raw;mode=result.mode;blocked=false;return state;}
    catch(e){blocked=true;throw e;}finally{busy=false;}
  }
  const session={get state(){return state;},get raw(){return raw;},get busy(){return busy;},get blocked(){return blocked;},store:{},load:()=>call('read'),prepare:(offer,quantity,orderId)=>call('prepare',{offer,quantity,orderId}),settle:(orderId,options={})=>call('settle',{orderId,cancel:options.cancel===true}),export:()=>raw,exportRaw:()=>raw};
  document.title='火星素材ショップ';document.getElementById('open-dev').textContent='保存の確認';
  document.querySelector('#development h2').textContent='保存の確認';
  document.querySelector('#development>.scope').textContent='購入と航行報酬は同じ世界の保存へ記録されます。保存の再読込は金貨を補充する操作ではありません。';
  document.querySelector('#development .dev-panel>summary').textContent='保存記録を見る';
  const fault=document.getElementById('fault');fault.value='normal';fault.hidden=true;document.querySelector('label[for=fault]').hidden=true;
  document.querySelector('#development .dev-panel>p').textContent='異常時は保存を確認してください。金貨を増やすリセットはありません。';
  document.querySelector('#bag>.scope').textContent='購入した建材は世界の保存に残ります。工事現場での持ち帰り・施工への接続は次の段階です。';
  function refresh(){const test=mode==='integration';document.querySelector('.wallet small').textContent=test?'接続確認用 宇宙金貨':'宇宙金貨';document.querySelector('.wallet').setAttribute('aria-label',test?'接続確認用の所持金':'所持金');document.querySelector('#confirm>.scope').textContent=test?'接続確認用の金貨を使います。本体の金貨は変わりません。':'所持している宇宙金貨で購入します。';document.querySelector('.shop-footer>span').textContent=test?'本体とは別の接続確認です。価格は調整中。':'価格は調整中。購入した建材は保存されます。';if(state&&!busy&&!blocked)document.getElementById('save-status').textContent='保存済み';}
  return {session,offers:L.LINK_OFFERS,quote:L.quoteLinkedOrder,refresh,bind(){},showImport(){throw Error('本体の保存準備が完了していません。');}};
}
