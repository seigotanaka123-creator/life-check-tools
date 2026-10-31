import {encodeSignWord,decodeSignWord,SIGN_WORD_LIMIT} from './imasora-construction-sign-exchange.mjs?v=120he';
export function createSignExchange({host,ready,text,acceptLabel,accept,changed,closeView}){
 const box=document.createElement('section');box.className='room-sign-exchange';box.hidden=true;box.setAttribute('aria-label','看板の文字をわたす・もらう');host.append(box);
 let mode=null,preview=null,field=null,note=null,read=null,use=null,copy=null,copying=false,epoch=0;
 const el=(tag,value)=>{const e=document.createElement(tag);if(value)e.textContent=value;return e;},button=(label,fn)=>{const b=el('button',label);b.type='button';b.onclick=fn;return b;};
 function close(){++epoch;mode=null;preview=null;field=note=read=use=copy=null;copying=false;box.hidden=true;box.replaceChildren();changed();}
 function open(kind){
  if(!ready())return;let outgoing=null;if(kind==='send'){try{outgoing=decodeSignWord(encodeSignWord(text()));}catch{return;}}
  ++epoch;copying=false;mode=kind;preview=null;box.replaceChildren();box.hidden=false;
  const heading=el('div');heading.className='room-sign-exchange-heading';heading.append(el('strong',kind==='send'?'🎁 看板の文字をわたそう':'🎁 看板の文字をもらおう'),button('もどる',close));box.append(heading);
  const intro=el('p',kind==='send'?'この文字のあいことばを、お友だちにわたせるよ。':'もらったあいことばをはりつけて、文字を見てみよう。');box.append(intro);
  const label=el('label',kind==='send'?'この看板のあいことば':'もらったあいことば');field=el('textarea');field.rows=2;field.maxLength=SIGN_WORD_LIMIT;field.spellcheck=false;field.autocapitalize='off';field.autocomplete='off';field.readOnly=kind==='send';field.value=outgoing?.code??'';field.setAttribute('aria-label',label.textContent);label.append(field);box.append(label);
  const face=el('div');face.className='room-sign-lettering';face.hidden=true;note=el('p');note.setAttribute('role','status');const actions=el('div');actions.className='room-sign-exchange-actions';box.append(face,note,actions);
  const explain=el('p','わたすのは文字だけ。材料やペンキは増えないよ。看板は自分の木材でつくろう。');explain.className='room-sign-exchange-help';box.append(explain);
  read=use=copy=null;
  if(kind==='send'){
   face.textContent=outgoing.text;face.hidden=false;
   copy=button('あいことばをコピー',async()=>{
    if(!ready()||copying)return;const token=epoch,activeField=field,activeCopy=copy,activeNote=note;copying=true;activeCopy.disabled=true;let copied=false;
    try{if(globalThis.isSecureContext&&navigator.clipboard?.writeText){await navigator.clipboard.writeText(outgoing.code);copied=true;}}catch{}
    if(token!==epoch)return;
    if(!copied){activeField.focus();activeField.select();try{copied=document.execCommand('copy');}catch{}}
    activeNote.textContent=copied?'コピーしたよ！ お友だちにわたしてね。':'あいことばを選んだよ。「コピー」でわたしてね。';copying=false;refresh();
   });actions.append(copy);
  }else{
   use=button(acceptLabel(),()=>{if(!ready()||!preview)return;const value=preview.text;close();accept(value);});use.hidden=true;
   const resetPreview=()=>{preview=null;label.hidden=false;intro.hidden=false;face.hidden=true;use.hidden=true;note.textContent='';read.textContent='文字をたしかめる';};
   read=button('文字をたしかめる',()=>{if(!ready())return;if(preview){resetPreview();refresh();return;}try{preview=decodeSignWord(field.value);face.textContent=preview.text;face.hidden=false;use.hidden=false;label.hidden=true;intro.hidden=true;read.textContent='あいことばを入れなおす';note.textContent='文字をえらんだ後、現場で仕上げよう。';}catch(e){resetPreview();note.textContent=e.message;}refresh();});
   field.oninput=()=>{resetPreview();refresh();};actions.append(use,read);
  }
  const closeButton=button('現場を広く見る',()=>{close();closeView();});if(kind==='send')box.replaceChildren(heading,intro,face,actions,note,label,explain,closeButton);else box.append(closeButton);changed();refresh();
 }
 function refresh(){if(!mode)return;const can=ready();field.disabled=!can;for(const b of box.querySelectorAll('button'))b.disabled=!can;if(copy)copy.disabled=!can||copying;if(read)read.disabled=!can||!field.value.trim();if(use)use.disabled=!can||!preview;}
 return{open,close,refresh,get opened(){return mode!==null;}};
}
