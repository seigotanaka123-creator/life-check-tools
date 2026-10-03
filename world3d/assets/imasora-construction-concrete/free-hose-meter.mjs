// Presentation only: volumes are committed once by the existing save service.
export const HOSE_TRANSFER_ACTIONS=new Set(['FREE_PRIME','FREE_DRAIN']);
const cups=quarters=>(quarters/4).toFixed(2).replace(/\.00$/,'');
function transfer(type,f){
 if(!HOSE_TRANSFER_ACTIONS.has(type))throw Error('ホース操作を確認してください。');
 if(!Number.isInteger(f.wet)||f.wet<0||!Number.isInteger(f.hose)||f.hose<0||f.hose>1)throw Error('生コンの量を確認してください。');
 const amount=type==='FREE_PRIME'?1:f.hose;
 if(type==='FREE_PRIME'&&(!f.connected||!f.pump.legs||f.hose||!f.wet)||!amount)throw Error('接続・支持脚・生コンを確認してください。');
 return{type,amount,before:{wet:f.wet,hose:f.hose},after:type==='FREE_PRIME'?{wet:f.wet-1,hose:1}:{wet:f.wet+amount,hose:0}};
}
export function createHoseTransferMotion(a,f,verify=()=>{}){
 const plan=transfer(a.type,f),duration=a.type==='FREE_PRIME'?1.8:1.2;verify();let elapsed=0,started=false,done=false;
 return{get progress(){return elapsed/duration;},get phase(){return a.type==='FREE_PRIME'?'ミキサー車からホースへ生コンを送っています。':'ホースの生コンをミキサー車へ戻しています。';},
  verifyFooting:verify,tick(dt){verify();if(done)return true;if(!started){started=true;return false;}if(Number.isFinite(dt)&&dt>0)elapsed=Math.min(duration,elapsed+Math.min(.05,dt));done=elapsed>=duration;return done;},
  cancel(){done=true;},settle(){},get amount(){return plan.amount;}
 };
}
export function createHoseTransferFeedback(){
 let state=null;
 const matches=(f,operationId)=>operationId===state?.id&&f.wet===state.after.wet&&f.hose===state.after.hose;
 function finish({saved,blocked,f,operationId}){if(!state)return;state.status=saved&&matches(f,operationId)?'complete':blocked||saved?'pending':'cancelled';if(state.status==='complete')state.progress=1;}
 return{
  begin(a,f){state={...transfer(a.type,f),id:a.operationId,status:'sending',progress:0};},
  advance(progress){if(state?.status==='sending'&&Number.isFinite(progress))state.progress=Math.max(state.progress,Math.min(1,Math.max(0,progress)));},
  saving(){if(state?.status==='sending'){state.progress=1;state.status='saving';}},
  finish,reconcile(f,operationId){if(state?.status==='pending')finish({saved:matches(f,operationId),blocked:false,f,operationId});},
  reset(){state=null;},
  get display(){
   if(!state)return null;const {type,amount,before,after,status,progress}=state,sending=type==='FREE_PRIME',title=(sending?{sending:'ホースへ送液中',saving:'送液量を保存中',complete:'送液完了',pending:'送液の保存を確認してください',cancelled:'送液を中止しました'}:{sending:'生コンを回収中',saving:'回収量を保存中',complete:'回収完了',pending:'回収の保存を確認してください',cancelled:'回収を中止しました'})[status];
   const estimated=status==='sending',q=estimated?{wet:before.wet+(after.wet-before.wet)*progress,hose:before.hose+(after.hose-before.hose)*progress}:status==='complete'?after:before;
   const amountText=status==='complete'?`1/4杯を${sending?'ホースへ送りました':'車へ戻しました'}`:status==='pending'?'閉じずにメニューから保存を再確認してください':status==='cancelled'?'材料の移動は保存していません':status==='saving'?'材料の移動を保存しています':`${cups(amount*progress)} / ${cups(amount)}杯`;
   return{status,title,progress,percent:Math.floor(progress*100),amountText,stockText:`車 ${cups(q.wet)}杯 ｜ ホース ${cups(q.hose)}杯${estimated?(sending?'（送液中の目安）':'（回収中の目安）'):status==='saving'||status==='pending'?'（保存済み残量）':''}`};
  }
 };
}
