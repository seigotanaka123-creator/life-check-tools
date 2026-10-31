import {encodeDesignWord,decodeDesignWord,DESIGN_WORD_LIMIT} from './design-exchange.mjs?v=120pv';
import {sameDesign,designHeightLabel} from './design-levels.mjs?v=120hb';

export function renderDesignExchange({box,editor,can,picture,known,limit,save,close,redraw}){
 const receive=editor.kind==='receive',button=(label,run)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.minHeight='44px';b.disabled=!can();b.onclick=run;return b;},text=(parent,value)=>{const p=document.createElement('p');p.textContent=value;parent.append(p);return p;};
 const title=document.createElement('strong');title.textContent=receive?'🎁 もらった設計をひらこう！':'🎁 この設計をわたそう！';box.append(title);
 text(box,receive?(editor.preview?'この形でいいかな？ 材料をたしかめて、設計帳に残そう！':'もらったあいことばを、下にはりつけてね。絵をたしかめてから設計帳に残せるよ。'):'形・高さ・名前だけをわたすよ。現場の作品や材料は、そのまま残るよ。');
 const label=document.createElement('label');label.textContent=receive?'もらったあいことば':'この設計のあいことば';const field=document.createElement('textarea');field.rows=3;field.maxLength=DESIGN_WORD_LIMIT;field.spellcheck=false;field.autocapitalize='off';field.autocomplete='off';field.readOnly=!receive;field.disabled=!can();field.setAttribute('aria-label',label.textContent);field.style.cssText='box-sizing:border-box;width:100%;padding:12px;border:2px solid #a8cbd8;border-radius:14px;font:inherit;background:white;color:#284958;overflow-wrap:anywhere;user-select:text;-webkit-user-select:text';
 label.style.display='block';field.style.display='block';field.style.marginTop='8px';field.value=receive?(editor.code??''):encodeDesignWord(editor.design);label.append(field);box.append(label);
 const status=document.createElement('p');status.setAttribute('role','status');status.textContent=editor.error??editor.copyStatus??'';box.append(status);
 const preview=document.createElement('div');preview.style.cssText='padding:12px;margin:10px 0;border-radius:16px;background:linear-gradient(135deg,#e0f6ff,#fff4ce)';box.append(preview);
 function show(d){preview.innerHTML=picture(d.mask,d.plan);const svg=preview.querySelector('svg');if(svg)svg.style.cssText='display:block;width:132px;height:105px;max-width:100%;margin:0 auto';const name=text(preview,d.name);name.style.cssText='font-weight:bold;font-size:1.12em;text-align:center';text(preview,designHeightLabel(d)+'・'+d.plan.cells+'マス ／ 型枠 '+d.plan.boards+'枚・生コン '+d.plan.cups+'杯');text(preview,'つくる時には、自分の材料を使うよ。');}
 if(receive){
  label.hidden=!!editor.preview;label.style.display=editor.preview?'none':'block';const read=button(editor.preview?'あいことばを入れなおす':'絵をたしかめる',()=>{if(editor.preview){editor.preview=null;editor.error='';redraw();return;}try{editor.preview=decodeDesignWord(field.value);editor.code=field.value;editor.error='';}catch(e){editor.preview=null;editor.error=e.message;}redraw();});read.disabled=!can()||!field.value.trim();box.append(read);
  preview.hidden=!editor.preview;let accept=null;
  if(editor.preview){const d=editor.preview,same=known.find(s=>sameDesign(s,d)),full=!same&&known.length>=limit;show(d);if(same)text(preview,'同じ形は、もう「'+same.name+'」として残っているよ。今の名前は変わらないよ。');if(full)text(preview,'設計帳がいっぱいだよ。使わない設計をノートからはずしてから、もう一度ひらこう。');
   accept=button(same?'この形は設計帳にあるよ':'この形を設計帳に残す',async()=>{if(!can()||!editor.preview||same)return;if(await save('IMPORT_WORK_DESIGN',{code:editor.preview.code}))close();});accept.disabled=!can()||full||!!same;preview.append(accept);
  }
  field.oninput=()=>{editor.code=field.value;editor.preview=null;editor.error='';status.textContent='';preview.hidden=true;if(accept)accept.disabled=true;read.disabled=!can()||!field.value.trim();};
 }else{
  const d=decodeDesignWord(field.value);show(d);
  const copy=button('あいことばをコピー',async()=>{if(!can())return;copy.disabled=true;let copied=false;try{if(globalThis.isSecureContext&&navigator.clipboard?.writeText){await navigator.clipboard.writeText(field.value);copied=true;}}catch{}
   if(!copied){field.focus();field.select();try{copied=document.execCommand('copy');}catch{}}
   editor.copyStatus=copied?'コピーしたよ！ お友だちにあいことばをわたそう。':'あいことばを選んだよ。「コピー」でわたしてね。';status.textContent=editor.copyStatus;copy.disabled=!can();});box.append(copy,label,status);
 }
 box.append(button('設計帳にもどる',close));
}
