import {collectRecoveryBundle,unpackRecoveryBundle,inspectRecoveryBundle,MAX_RECOVERY_FILE} from './assets/imasora-world-recovery-bundle.js?v=483';
import {createRecoveryReader} from './assets/imasora-world-recovery-reader.js?v=483';
const el=id=>document.getElementById(id),record=el('record'),status=el('status'),result=el('result');
let verified=null,busy=false;
el('origin').textContent=`保存元：${location.origin}`;
const labels={
  'imasora-world-authority-v1':'通常本体の正本・財布・作品・素材台帳',
  'imasora-world-shop-integration-development-v1':'ショップ接続確認用',
  'imasora-construction-development-v1':'工事2-1の貸出保存',
  'imasora-construction-terrain-development-v1':'工事2-2の貸出地形',
  'imasora-construction-excavation-development-v1':'旧ショベル専用保存（v1/v2）',
  'imasora-construction-excavation-restore-test-v1':'旧ショベル復元確認用',
  'imasora-world-foundation-v3':'移行前の本体保存',
  'imasora-ufo-workshop-materials-v1':'UFO装備素材',
};
function message(text,error=false){status.textContent=text;status.dataset.error=String(error);}
function invalidate(){verified=null;el('download').disabled=true;result.replaceChildren();result.hidden=true;}
function render(payload){
  const info=inspectRecoveryBundle(payload);result.replaceChildren();result.hidden=false;
  const add=(tag,text,parent=result)=>{const n=document.createElement(tag);n.textContent=text;parent.append(n);return n;};
  add('p',`取得元：${info.origin} ／ ${new Date(info.capturedAt).toLocaleString('ja-JP')}`);
  if(info.origin!==location.origin)add('p','別のアドレスから取得した控えです。この画面の保存とは混ぜずに確認しています。').className='warning';
  const authority=info.authority;
  add('p',authority.status==='valid'?`通常正本：保存番号 ${authority.generation} ／ 宇宙金貨 ${authority.balance} ／ 履歴 ${authority.backups}件`:
    authority.status==='absent'?'通常正本：保存記録なし（新規作成していません）':'通常正本：要確認。原文を保持しています。');
  if(info.warnings.length){const ul=add('ul','');ul.className='warning';for(const warning of info.warnings)add('li',warning,ul);}
  const table=add('table',''),head=add('tr','',add('thead','',table));add('th','保管した領域',head);add('th','保存状況',head);const body=add('tbody','',table);
  for(const d of info.databases){const row=add('tr','',body);add('td',labels[d.name],row);add('td',d.exists?`${d.records}件／${d.stores}ストア`:'未作成',row);}
  for(const d of info.local){const row=add('tr','',body);add('td',labels[d.key],row);add('td',d.exists?'原文を保持':'記録なし',row);}
  add('p','照合値と保存領域の検査済み。各保存の原文・履歴・復元前の控えを保持しています。未保存作業の再現や復元実行の検証とは別です。');
  return info;
}
async function verify(text){const payload=await unpackRecoveryBundle(text);const info=render(payload);verified=text;el('download').disabled=false;return info;}
async function run(task){
  if(busy)return;busy=true;invalidate();el('capture').disabled=true;el('inspect').disabled=true;el('file').disabled=true;record.readOnly=true;
  try{await task();}catch(e){invalidate();message(e.message||'取得・検査を完了できませんでした。',true);}
  finally{busy=false;el('capture').disabled=false;el('inspect').disabled=false;el('file').disabled=false;record.readOnly=false;}
}
el('capture').addEventListener('click',()=>run(async()=>{
  message('保存済み記録を取得し、更新がないか照合しています…');
  const reader=createRecoveryReader(),text=await collectRecoveryBundle({...reader,origin:location.origin});
  record.value=text;const info=await verify(text);
  message(info.warnings.length?'取得しました。確認が必要な記録も原文で保管しています。ダウンロードして手元に残せます。':'2回の取得結果が一致しました。ダウンロードして手元に残せます。');
}));
el('inspect').addEventListener('click',()=>run(async()=>{message('控えを検査しています…');const info=await verify(record.value);message(info.warnings.length?'照合値は一致しました。記録内に確認事項があります。':'照合値と保存領域の一覧が一致しました。保存の書き換えは行っていません。');}));
record.addEventListener('input',()=>{invalidate();message('文字列を変更しました。「内容を検査する」で確認してください。');});
el('file').addEventListener('change',()=>run(async()=>{
  const file=el('file').files?.[0];if(!file)return;
  if(file.size>MAX_RECOVERY_FILE)throw Error('64 MiBまでの控えを選んでください。');
  message('ファイルを読み込んで検査しています…');const text=await file.text();record.value=text;await verify(text);message('ファイルの照合値と保存領域を確認しました。ゲームへの復元は行っていません。');
}));
el('download').addEventListener('click',()=>{
  if(busy||!verified||record.value!==verified){invalidate();return;}
  const blob=new Blob([verified],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`imasora-saved-records-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  message('ダウンロードを要求しました。ブラウザーの保存先でファイルを確認してください。');
});
