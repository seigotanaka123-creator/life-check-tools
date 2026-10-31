// This presenter never reads, deletes, replaces, or reconciles a saved record.
// The original save service owns retries; reopening is a separate player choice.
export function describeWorldSaveIssue(error){
 const detail=typeof error?.message==='string'?error.message:'セーブの確認を終えられませんでした。';
 const stale=/別の画面|別タブ(?:で|競合|の保存画面)|CHECKPOINT_(?:CHANGED|SUPERSEDED)/.test(detail);
 const quota=error?.name==='QuotaExceededError';
 return Object.freeze({detail,kind:stale?'newer':quota?'space':'check',
  title:stale?'新しいセーブがあるよ':quota?'セーブする場所がいっぱいみたい':'セーブをたしかめよう',
  message:stale?'別の画面で遊んだ続きが見つかったよ。新しいセーブを開いて、そこからつづけよう。':quota?'この端末の空き容量を確かめてから、もう一度ためしてね。セーブ済みの作品と材料は残しているよ。':'セーブ済みの作品と材料を守るため、いったん止めているよ。もう一度ためしてみよう。',
  reopen:stale?'新しいセーブでつづける':'セーブから開きなおす'});
}

export function createWorldSaveNoticeFlow({retry,reopen,changed=()=>{}}){
 let opened=false,working=false,running=false,confirming=false,pending=false,epoch=0,issue=null;
 const state=()=>Object.freeze({opened,working,busy:working||running,confirming,pending,issue});
 const notify=()=>changed(state());
 const show=error=>{const next=describeWorldSaveIssue(error),keepClosed=pending&&!opened&&(running||issue?.detail===next.detail);epoch++;issue=next;pending=true;opened=!keepClosed;working=false;confirming=false;notify();};
 return{
  get state(){return state();},show,
  dismiss(){if(!opened)return false;opened=false;confirming=false;notify();return true;},
  present(){if(!pending)return false;opened=true;confirming=false;notify();return true;},
  startWork(){pending=true;working=true;opened=true;confirming=false;notify();},
  endWork(){working=false;if(!running){opened=false;pending=false;issue=null;}notify();},
  askReopen(){if(!opened||working||running)return false;confirming=true;notify();return true;},
  cancelReopen(){if(working||running)return;confirming=false;notify();},
  async tryAgain(){
   if(!opened||working||running||confirming)return false;
   running=true;const current=epoch;notify();
   try{await retry();if(current!==epoch)return false;opened=false;pending=false;issue=null;return true;}
   catch(error){show(error);return false;}
   finally{running=false;notify();}
  },
  async confirmReopen(){
   if(!opened||working||running||!confirming)return false;
   running=true;notify();
   try{await reopen();return true;}
   catch(error){show(error);running=false;notify();return false;}
   // A successful reload owns this screen. Keep all controls disabled until
   // navigation completes, rather than accepting duplicate clicks or writes.
  },
 };
}
