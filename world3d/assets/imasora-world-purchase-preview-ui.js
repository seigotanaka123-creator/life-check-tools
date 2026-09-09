import {WorldPurchaseStore,WorldPurchaseSession} from './imasora-world-purchase-storage.js';
import {LINK_OFFERS,quoteLinkedOrder,readWorldSource,fingerprint} from './imasora-world-purchase-ledger.js';
// Reading is explicitly user-triggered and one-way. There is no legacy save writer.
const SOURCE_KEY='imasora-world-foundation-v3';
const $=id=>document.getElementById(id);
export function makeWalletPreview(mode){
  if(!['copy','fixture'].includes(mode)||!['127.0.0.1','localhost'].includes(location.hostname))throw Error('接続確認はローカル専用です。');
  document.title='火星素材ショップ｜建設開発8-2a（接続確認）';
  const session=new WorldPurchaseSession(new WorldPurchaseStore(mode));
  const panel=document.createElement('section');panel.className='pending';panel.id='wallet-connection-panel';
  panel.innerHTML=`<h2>本体財布との接続確認 · 8-2a</h2><p id="wallet-origin"></p><p id="wallet-source-status" role="status"></p><div class="actions"><button id="wallet-check-source">元のセーブが変わっていないか確認</button><a id="wallet-alternate" class="wallet-alternate"></a></div><p class="scope">これは複製上の検証です。本体の金貨・建築・装備には書き戻しません。候補価格：水3枚／土2枚／木材4枚。実プレイヤーの収益計測はこれからです。</p>`;
  document.querySelector('.shop-footer').before(panel);
  const style=document.createElement('style');style.textContent='.wallet-alternate{color:#f8dfaa;align-self:center;font-size:12px}.wallet-notice{color:#e4ddbb!important}#wallet-connection-panel{margin-top:12px;border-width:1px;background:#26393c}#wallet-connection-panel h2{font-size:15px}#wallet-connection-panel p{font-size:11px}#wallet-connection-panel button{font-size:11px}';document.head.append(style);
  const entry=document.createElement('dialog');entry.className='game-dialog';entry.id='wallet-import';entry.setAttribute('aria-labelledby','wallet-import-title');
  entry.innerHTML=`<h2 id="wallet-import-title">${mode==='copy'?'本体のセーブを複製して試す':'検証用データで試す'}</h2><p>${mode==='copy'?'このポートに保存された本体の金貨・建築・装備を、接続確認専用の保存へ一度だけ複製します。購入テストで使うのは複製側の金貨です。':'本体と同じセーブ形式の検証データです。金貨12枚と確認用の建築データを一度だけ用意します。本体や前のショップの金貨は使いません。'}</p><p class="scope">元の保存を消さず、上書きもせず、他ポートからの転送もしません。複製済みのデータを取り込み直して残高を増やす操作はありません。</p><p id="wallet-import-error" role="alert"></p><div class="actions"><button id="wallet-import-confirm" class="primary">${mode==='copy'?'本体セーブの複製を作る':'検証用12枚で開始'}</button><button id="wallet-import-close">あとで</button></div>`;document.body.append(entry);
  const sample={version:3,mapSchemaVersion:4,physicsRevision:12,characterId:'star-white-hero-young-seed-walk-sky-cool-b-forest',map:'mars',position:{x:-74.5,z:163.7},heading:1.7,cameraDistanceIndex:0,labels:true,
    builtByMap:{sky:[{id:'fixture-anchor',position:[-157.8,0,118.3],rotation:0,customField:'keep-sky'}],construction:[{id:'fixture-work',position:[80,0,-16],customField:'keep-work'}]},
    ufoResources:{spaceCoins:12,energyCells:3,starMaterials:2},ufoEquipment:{energyAbsorptionTankLevel:1,coinGainMultiplier:1,simultaneousShotEnabled:false,legacyUnknown:'keep-equipment'},unknownExtension:{keep:true},updatedAt:0};
  let perform,tell;
  const originText=()=>session.ledger?.source.kind==='copied-world'?'本体セーブの複製を使用中（実金貨は変わりません）':'検証用の金貨を使用中（本体とは別）';
  function refresh(){
    $('wallet-origin').textContent=session.ledger?`${originText()} · 元の金貨 ${session.ledger.source.world.ufoResources?.spaceCoins??0}枚 · 報酬記録 ${session.ledger.events.filter(e=>e.kind==='reward').length}件`:'まだ接続確認用の保存を作っていません。';
    $('wallet-check-source').disabled=mode!=='copy'||!session.ledger;
    $('wallet-demo-reward').disabled=session.busy||session.blocked||!session.ledger;
    $('wallet-demo-draft').disabled=session.busy||session.blocked||!session.ledger;
  }
  const extra=document.createElement('div');extra.innerHTML='<p class="scope">以下は複製だけで行う保存経路の試験です。実際の宇宙航行や建築を行うボタンではありません。</p><div class="actions"><button id="wallet-demo-reward">航行報酬を1枚追加して保存</button><button id="wallet-demo-draft">古い残高を含む建築保存を試す</button><button id="wallet-show-import">取り込み画面</button></div><p id="wallet-draft-result" role="status"></p>';
  $('development').append(extra);
  const alt=new URL(location.href);alt.searchParams.set('walletPreview',mode==='copy'?'fixture':'copy');$('wallet-alternate').href=alt.href;$('wallet-alternate').textContent=mode==='copy'?'本体を使わない検証画面へ':'本体セーブの複製で試す';
  // Keep the approved v450 UI. Labels must not imply the old 60-coin grant here.
  document.querySelector('.wallet small').textContent=mode==='copy'?'複製側の宇宙金貨':'検証用 宇宙金貨';
  document.querySelector('.wallet').setAttribute('aria-label',mode==='copy'?'複製側の所持金':'検証用の所持金');
  document.querySelector('.shop-footer>span').innerHTML='財布接続テスト・価格は候補値<br>本体への書き戻しはありません。';
  document.querySelector('#development>.scope').textContent='本体セーブ形式と購入の接続確認です。元データの取り込みは一度だけ。価格は調整候補です。';
  document.querySelector('#confirm>.scope').textContent='接続確認用の金貨だけを使います。本体の金貨は変わりません。価格は候補値です。';
  document.querySelector('#bag>.scope').textContent='購入品は接続確認専用の保存に残ります。本体・持ち帰り・施工へはまだ接続していません。';
  $('wallet-import-close').onclick=()=>entry.close();$('wallet-show-import').onclick=()=>{$('development').close();entry.showModal();};
  $('wallet-import-confirm').onclick=async()=>{
    if(session.busy)return;$('wallet-import-error').textContent='';$('wallet-import-confirm').disabled=true;
    await perform(async()=>{try{
      const raw=mode==='copy'?localStorage.getItem(SOURCE_KEY):JSON.stringify(sample);
      await session.importSource(raw,mode==='copy'?'copied-world':'fixture-world');entry.close();tell('接続確認用の保存を作りました。元のセーブは変更していません。');
    }catch(e){$('wallet-import-error').textContent=e.message;throw e;}finally{$('wallet-import-confirm').disabled=false;}});
  };
  $('wallet-check-source').onclick=()=>{try{const current=readWorldSource(localStorage.getItem(SOURCE_KEY)),same=fingerprint(current)===session.ledger.source.fingerprint;$('wallet-source-status').textContent=same?'元のセーブは取り込み時と同一です。金貨・建築・装備を変更していません。':'本体セーブは取り込み後に変わっています。接続確認側へ再取り込み・書き戻しはしません。';}catch(e){$('wallet-source-status').textContent=e.message;}};
  $('wallet-demo-reward').onclick=()=>perform(async()=>{await session.award('spaceCoins',1,crypto.randomUUID());$('development').close();tell('複製側に航行報酬1枚を保存しました。本体には付与していません。');});
  $('wallet-demo-draft').onclick=()=>perform(async()=>{const before=session.state.balance,draft=structuredClone(session.ledger.world);draft.ufoResources=structuredClone(session.ledger.source.world.ufoResources||{});draft.labels=!draft.labels;
    await session.saveDraft(draft);$('wallet-draft-result').textContent=`古い残高を無視して保存：${before}枚 → ${session.state.balance}枚。建築物の位置・装備は維持。表示ラベル設定のみ複製上で反転しました。`;});
  return {session,offers:LINK_OFFERS,quote:quoteLinkedOrder,refresh,
    bind(callbacks){({perform,tell}=callbacks);},
    showImport(){entry.showModal();},
  };
}
