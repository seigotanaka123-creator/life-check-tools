import {designGeometry,designHeightLabel} from './design-levels.mjs?v=120hb';
import {savedDesignEntries,designName,SAVED_DESIGN_LIMIT} from './saved-designs.mjs?v=120pv';
import {designFootprint} from './design-footprint.mjs?v=120hb';
import {designBookEntries} from './design-book.mjs?v=120pv';
import {renderDesignExchange} from './design-exchange-ui.mjs?v=120pv';
// The book edits instructions, never the actual works or their materials.
export function createSavedDesignBook({root,project,can,issue,picture,useSource,useSaved,save}){
 let editor=null,key=null;
 function button(text,run){const b=document.createElement('button');b.type='button';b.textContent=text;b.style.minHeight='44px';b.onclick=run;return b;}
 function heading(text){const h=document.createElement('h4');h.textContent=text;h.style.gridColumn='1 / -1';root.append(h);}
 function selectCard(plan,title,run){const b=button('',run);b.className='pop-shape-preset';b.innerHTML=picture(plan.mask,plan)+'<strong></strong><small></small>';b.querySelector('strong').textContent=title;b.querySelector('small').textContent='幅 '+designFootprint(plan).width+' × 奥行き '+designFootprint(plan).depth+' ／ '+designHeightLabel(plan)+'・'+plan.cells+'マス ／ 型枠 '+plan.boards+'枚・生コン '+plan.cups+'杯';b.disabled=!can()||!!issue(plan);b.title=issue(plan);return b;}
 function edit(data){editor=data;key=null;refresh();root.querySelector(data?.kind==='share'?'.pop-book-editor button':'input,textarea')?.focus();}
 async function submit(){if(!editor||!can())return;const e=editor,extra=e.kind==='save'?{work:e.work,name:e.name}:e.kind==='rename'?{designId:e.id,name:e.name}:{designId:e.id};if(e.kind!=='forget')try{extra.name=designName(extra.name);}catch{return;}
  if(await save({save:'SAVE_WORK_DESIGN',rename:'RENAME_WORK_DESIGN',forget:'FORGET_WORK_DESIGN'}[e.kind],extra)){editor=null;key=null;}refresh();
 }
 function refresh(){const p=project(),saved=savedDesignEntries(p),sources=designBookEntries(p.freeBuild.completed),next=JSON.stringify([saved,sources,can(),issue(),saved.map(d=>issue(d.plan)),sources.map(d=>d.plan?issue(d.plan):d.issue),editor&&[editor.kind,editor.work,editor.id]]);if(next===key)return;key=next;root.replaceChildren();
  if(editor){const box=document.createElement('section');box.className='pop-book-editor';box.style.cssText='grid-column:1 / -1;padding:12px;border:2px solid #a8cbd8;border-radius:18px;background:#fff8df';
   if(['share','receive'].includes(editor.kind)){renderDesignExchange({box,editor,can,picture,known:saved,limit:SAVED_DESIGN_LIMIT,save,close:()=>edit(null),redraw:()=>{key=null;refresh();}});root.append(box);}else{const h=document.createElement('strong');h.textContent=editor.kind==='forget'?'この設計をノートからはずす？':editor.kind==='rename'?'どんな名前にする？':'名前をつけて、形を残そう！';box.append(h);
   if(editor.kind!=='forget'){const label=document.createElement('label');label.textContent='設計の名前（24文字まで）';const input=document.createElement('input');input.type='text';input.maxLength=48;input.value=editor.name;input.setAttribute('aria-label','設計の名前');input.style.cssText='box-sizing:border-box;width:100%;padding:12px;border:2px solid #a8cbd8;border-radius:14px;font:inherit;background:white;color:#284958';input.disabled=!can();input.oninput=()=>{editor.name=input.value;try{designName(input.value);commit.disabled=!can();}catch{commit.disabled=true;}};input.onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing&&e.keyCode!==229){e.preventDefault();void submit();}};label.append(input);box.append(label);
   }else{const note=document.createElement('p');note.textContent='「'+editor.name+'」をノートからはずすよ。現場の作品・材料はそのまま残るよ。';box.append(note);}
   const commit=button(editor.kind==='forget'?'ノートからはずす':'この名前で残す',()=>void submit());commit.disabled=!can();if(editor.kind!=='forget')try{designName(editor.name);}catch{commit.disabled=true;}const close=button('やめる',()=>edit(null));close.disabled=!can();box.append(commit,close);root.append(box);}
  }
  const receive=button('🎁 設計をもらう',()=>edit({kind:'receive',code:''}));receive.style.gridColumn='1 / -1';receive.disabled=!can();if(editor?.kind!=='receive')root.append(receive);
  heading('📒 残してある設計 '+saved.length+' / '+SAVED_DESIGN_LIMIT);
  if(!saved.length){const p=document.createElement('p');p.textContent='下の作品から、好きな形をノートに残そう！ 作品を片付けても、設計は残るよ。';p.style.gridColumn='1 / -1';root.append(p);}
  for(const d of saved){const card=document.createElement('div');card.className='pop-book-card';card.append(selectCard(d.plan,d.name,()=>useSaved(d)));const names=button('✏️ 名前',()=>edit({kind:'rename',id:d.id,name:d.name})),forget=button('ノートからはずす',()=>edit({kind:'forget',id:d.id,name:d.name})),share=button('🎁 この設計をわたす',()=>edit({kind:'share',id:d.id,design:{name:d.name,...designGeometry(d)}}));names.disabled=forget.disabled=share.disabled=!can();card.append(names,forget,share);root.append(card);}
  heading('🧩 現場の作品からえらぶ');
  for(const d of sources){const card=document.createElement('div');card.className='pop-book-card';if(d.plan){card.append(selectCard(d.plan,'作品 '+(d.index+1),()=>useSource(d.index)));const keep=button('📒 名前をつけて残す',()=>edit({kind:'save',work:d.index,name:'作品 '+(d.index+1)}));keep.disabled=!can();card.append(keep);}else{const message=document.createElement('p');message.textContent='作品 '+(d.index+1)+'：'+d.issue;card.append(message);}root.append(card);}
 }
 return{refresh};
}
