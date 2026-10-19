// Game-facing choices keep the existing value/change contract and save guards.
// No inventory, scene or save object is read or written here.
import {STENCIL_TEMPLATES} from './imasora-construction-concrete/free-stencil.mjs?v=120e';
import {installMenuScenePeek} from './imasora-menu-scene-peek.mjs?v=120ds';
const choices=new Map(),pages=new Map(),checks=new Map();let installed=false,watch=null,scheduled=false,scenePeek=null;
const roots='dialog,[role="dialog"],[role="alertdialog"],.control-card,.concrete-controls,.world-vehicle-controls,.world-excavation-controls,.world-water-controls,.world-soil-controls,.world-timber-controls';
const allowed=e=>e.closest(roots)&&!e.closest('[data-pop-skip],[data-player-debug],[data-developer-only]');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function toolPicture(kind){
 const art={shovel:'<path d="M37 9h14v11H37z" fill="#f6b889"/><path d="M44 20v25" stroke="#b98458" stroke-width="6"/><path d="M31 43h26v8Q52 65 44 67Q36 65 31 51Z" fill="#a8cfe0"/>',bucket:'<path d="M24 29Q24 6 44 6Q64 6 64 29" fill="none"/><path d="M20 27h48L60 63H28Z" fill="#ffd675"/><ellipse cx="44" cy="27" rx="24" ry="7" fill="#fff4c1"/>',trowel:'<path d="M26 39l33-7-9 30Z" fill="#b9d8e5"/><path d="M44 43V28l15-10" fill="none"/><path d="M51 22l15-10" stroke="#edac82" stroke-width="9"/>',brush:'<path d="M36 8h16l-3 30H39Z" fill="#efb087"/><path d="M28 34h32v13H28Z" fill="#bdd9e8"/><path d="M28 47h32v14H28Z" fill="#88bff0"/>',roller:'<rect x="15" y="9" width="52" height="18" rx="7" fill="#9fcce8"/><path d="M68 17h8v21H44v10" fill="none"/><rect x="37" y="46" width="14" height="21" rx="5" fill="#f1b593"/>',stencil:'<rect x="16" y="6" width="56" height="61" rx="8" fill="#ffe49e"/><path d="M32 17h24v13h10L44 56 22 30h10Z" fill="#acd2ef"/>',book:'<path d="M44 17Q25 6 13 14v46Q29 52 44 63Q59 52 75 60V14Q59 6 44 17Z" fill="#b7daf4"/><path d="M44 17v46" fill="none"/>',rescue:'<circle cx="44" cy="37" r="27" fill="#ffbeaf"/><circle cx="44" cy="37" r="13" fill="#fff9df"/><path d="M23 20l11 9m21 17 10 9M23 55l11-9m20-17 11-9" stroke="#fff8e9" stroke-width="9"/>',box:'<rect x="12" y="24" width="64" height="38" rx="9" fill="#f9bcce"/><path d="M31 24V12h26v12M12 38h64" fill="none"/><rect x="37" y="33" width="14" height="12" rx="3" fill="#ffe5a3"/>',pad:'<path d="M27 23h34Q71 21 76 52Q76 65 62 54l-9-7H35l-9 7Q12 65 12 52Q17 21 27 23Z" fill="#b3dcdd"/><path d="M23 32v16m-8-8h16" fill="none"/><circle cx="60" cy="34" r="4" fill="#f6acbf"/><circle cx="68" cy="43" r="4" fill="#ffdb86"/>'};
 return `<svg viewBox="0 0 88 74" aria-hidden="true" fill="none" stroke="#56748a" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">${art[kind]??art.box}</svg>`;
}
export function shapePicture(mask=1632){return '<svg viewBox="0 0 88 70" aria-hidden="true">'+Array.from({length:16},(_,i)=>{const x=8+(i%4)*18,y=5+Math.floor(i/4)*14,on=!!(mask&(1<<i));return `<rect x="${x}" y="${y+4}" width="16" height="12" rx="3" fill="${on?'#dfaa50':'#cbdfe9'}"/><rect x="${x}" y="${y}" width="16" height="12" rx="3" fill="${on?'#ffe695':'#f7fcff'}" stroke="${on?'#c99539':'#bdd6df'}"/>`;}).join('')+'</svg>';}
export function heightPicture(value){const h=({auto:8,2:8,4:19,8:34})[value]??12;return `<svg viewBox="0 0 88 70" aria-hidden="true"><ellipse cx="44" cy="62" rx="36" ry="5" fill="#bfdde3"/><path d="M12 ${56-h}L44 ${43-h}L77 ${54-h}L45 ${67-h}Z" fill="#fff2b5" stroke="#bb9b69"/><path d="M12 ${56-h}L45 ${67-h}V64L12 53Z" fill="#edc779" stroke="#bb9b69"/><path d="M45 ${67-h}L77 ${54-h}V51L45 64Z" fill="#d5ae68" stroke="#bb9b69"/>${String(value)==='auto'?'<path d="M10 64Q24 53 36 61T78 58" fill="none" stroke="#78ba8e" stroke-width="4"/>':''}</svg>`;}
const colors={blue:'#69baff',white:'#fffdf4',red:'#f18596',yellow:'#ffda72',green:'#88d4aa',black:'#566a7b'};
export function choicePicture(label,value){
 if(/模様/.test(label)){const t=STENCIL_TEMPLATES.find(t=>t.id===value);if(t)return shapePicture(t.pixels.reduce((mask,i)=>mask|(1<<i),0));}
 if(label==='マス'&&/^\d+$/.test(value)&&Number(value)<16)return shapePicture(1<<Number(value));
 if(label==='向き'&&/^[0-3]$/.test(value))return `<svg viewBox="0 0 88 70" aria-hidden="true"><circle cx="44" cy="35" r="29" fill="#f8f4df" stroke="#c4dde8" stroke-width="3"/><path d="M37 57V29H25L44 10 63 29H51V57Z" fill="#85bfe5" stroke="#56748a" stroke-width="2" transform="rotate(${Number(value)*90} 44 35)"/></svg>`;
 if(/形/.test(label)&&Number.isInteger(Number(value))&&Number(value)>8)return shapePicture(Number(value));
 if(/高さ/.test(label))return heightPicture(value);
 if(colors[value])return `<span class="pop-color-drop" style="--swatch:${colors[value]}"></span>`;
 const icon=/杯|量/.test(label)?'🪣':/面/.test(label)?'🎨':/向き/.test(label)?'🧭':/模様/.test(label)?'✦':/作品|床|建物/.test(label)?'🏠':/セーブ|保存|履歴/.test(label)?'📖':/マス|部分/.test(label)?'🧩':'⭐';
 return /杯|量/.test(label)?toolPicture('bucket'):`<span class="pop-option-icon" aria-hidden="true">${icon}</span>`;
}
export function menuPicture(label){return toolPicture(/ペンキ|塗|型紙/.test(label)?'brush':/形|型枠/.test(label)?'stencil':/セーブ|保存|記録/.test(label)?'book':/助|動け/.test(label)?'rescue':/ヒント|操作|遊び方/.test(label)?'pad':'box');}
function labelFor(el){return el.getAttribute('aria-label')||[...(el.closest('label')?.childNodes??[])].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join('')||'えらぶ';}
function setText(e,t){if(e.textContent!==t)e.textContent=t;}
function setAttr(e,k,v){v=String(v);if(e.getAttribute(k)!==v)e.setAttribute(k,v);}
function enhanceSelect(select){
 if(choices.has(select)||!allowed(select))return;
 const group=document.createElement('div');group.className='pop-choices';group.setAttribute('role','group');const label=labelFor(select);group.setAttribute('aria-label',label);select.classList.add('pop-native-choice');select.after(group);
 const row={select,group,label,key:'',buttons:[]};choices.set(select,row);updateChoice(row);
}
function updateChoice(row){
 const {select,group,label}=row;if(!select.isConnected){group.remove();choices.delete(select);return;}
 const options=[...select.options],key=options.map(o=>o.value+'\t'+o.textContent).join('\n');
 if(key!==row.key){row.key=key;group.replaceChildren();row.buttons=options.map(o=>{const b=document.createElement('button');b.type='button';b.className='pop-option';b.dataset.value=o.value;b.innerHTML=choicePicture(label,o.value)+'<strong>'+esc(o.textContent)+'</strong><span class="pop-picked" aria-hidden="true">★</span>';b.onclick=e=>{e.preventDefault();e.stopPropagation();if(select.disabled||o.disabled||!o.isConnected)return;select.value=o.value;select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));refreshPopMenus();};group.append(b);return b;});group.dataset.many=String(options.length>8);}
 group.hidden=select.hidden;for(let i=0;i<row.buttons.length;i++){const b=row.buttons[i],o=options[i],disabled=select.disabled||o.disabled||!o.value; if(b.disabled!==disabled)b.disabled=disabled;setAttr(b,'aria-pressed',o.selected);}
}
function enhanceCheck(input){
 if(checks.has(input)||!allowed(input))return;input.classList.add('pop-native-choice');const b=document.createElement('button');b.type='button';b.className='pop-check-choice';b.setAttribute('aria-label',labelFor(input));input.after(b);
 const update=()=>{setText(b,input.checked?'★ えらんだよ':'ここをえらぶ');setAttr(b,'aria-pressed',input.checked);if(b.disabled!==input.disabled)b.disabled=input.disabled;};checks.set(input,{b,update});b.onclick=e=>{e.preventDefault();e.stopPropagation();if(!input.disabled){input.click();update();}};input.addEventListener('change',update);update();
}
export function renderToolInventory(element,toolkit){
 if(!element)return;const list=toolkit?.tools??[],key=JSON.stringify(list);if(element.dataset.popInventory===key)return;element.dataset.popInventory=key;element.classList.add('pop-inventory');
 element.innerHTML=list.map(t=>`<article class="pop-tool">${toolPicture(t.id)}<strong>${esc(t.name)}</strong><small>${t.owned?'持っているよ':'建材受取所でもらおう'}</small><p>${esc(t.use)}</p>${t.id==='shovel'?'<small>土あそびの現場で使おう</small>':''}</article>`).join('');
}
function closePage(details,restore=true){const p=pages.get(details);if(!p)return;if(p.dialog.open)p.dialog.close();details.open=false;setAttr(p.summary,'aria-expanded',false);if(restore&&p.summary.getClientRects().length)p.summary.focus();}
function openPage(details){const p=pages.get(details);if(!p||p.dialog.open||!p.summary.getClientRects().length||details.closest('[hidden]'))return;details.open=true;refreshPopMenus();setAttr(p.summary,'aria-expanded',true);try{p.dialog.showModal();p.back.focus();}catch{details.open=false;}}
function enhanceDetails(details){
 if(pages.has(details)||!allowed(details)||details.matches('[data-pop-skip]'))return;
 const summary=details.querySelector(':scope > summary');if(!summary)return;
 const label=summary.textContent.trim(),dialog=document.createElement('dialog');dialog.className='pop-subpage';dialog.setAttribute('aria-label',label);dialog.innerHTML='<header class="pop-page-head"><button type="button" data-pop-back>もどる</button><h2>'+esc(label)+'</h2></header><div class="pop-page-content"></div>';
 const content=dialog.querySelector('.pop-page-content');for(const node of [...details.childNodes])if(node!==summary)content.append(node);
 details.classList.add('pop-nav-card');summary.innerHTML='<span class="pop-nav-icon" aria-hidden="true">'+menuPicture(label)+'</span><strong>'+esc(label)+'</strong><span class="pop-nav-go" aria-hidden="true">あける</span>';setAttr(summary,'aria-expanded',false);summary.setAttribute('role','button');
 const back=dialog.querySelector('[data-pop-back]');pages.set(details,{summary,dialog,back});details.append(dialog);details.open=false;
 summary.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openPage(details);});
 details.addEventListener('toggle',()=>{if(details.open)openPage(details);else if(dialog.open)closePage(details,false);});
 back.onclick=()=>closePage(details);dialog.addEventListener('cancel',e=>{e.preventDefault();closePage(details);});dialog.addEventListener('close',()=>{details.open=false;setAttr(summary,'aria-expanded',false);});
 for(const type of ['keydown','keyup','pointerdown','pointerup','click'])dialog.addEventListener(type,e=>e.stopPropagation());
 // A child page is a native modal: Escape and focus trapping work on Safari too.
 scan(content);
}
function scan(root){if(root.nodeType!==1)return;for(const select of [...(root.matches('select')?[root]:[]),...root.querySelectorAll('select')])enhanceSelect(select);for(const input of [...(root.matches('input[type="checkbox"]')?[root]:[]),...root.querySelectorAll('input[type="checkbox"]')])enhanceCheck(input);for(const details of [...(root.matches('details')?[root]:[]),...root.querySelectorAll('details')])enhanceDetails(details);}
export function refreshPopMenus(){scenePeek?.sync();for(const row of choices.values())updateChoice(row);for(const [i,c]of checks){if(i.isConnected)c.update();else checks.delete(i);}for(const [d,p]of pages){p.back.disabled=false;if(!d.isConnected){if(p.dialog.open)p.dialog.close();pages.delete(d);}else if(p.dialog.open&&d.closest('[hidden]'))closePage(d,false);}}
export function installPopMenus({onPeekStart=()=>{}}={}){
 if(installed||typeof document==='undefined')return;installed=true;document.body.classList.add('imasora-pop-menus');scan(document.body);
 scenePeek=installMenuScenePeek({onStart:onPeekStart});
 watch=new MutationObserver(records=>{let relevant=false;for(const r of records){if(r.type==='childList'){for(const n of r.addedNodes)if(n.nodeType===1&&!n.matches('.pop-option,.pop-picked,.pop-nav-icon,.pop-nav-go'))scan(n);if(r.target.matches?.('select,optgroup'))relevant=true;}else if(r.target.matches?.('select,option,input[type="checkbox"]')||r.attributeName==='hidden')relevant=true;}if(relevant&&!scheduled){scheduled=true;queueMicrotask(()=>{scheduled=false;refreshPopMenus();});}});
 watch.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','hidden','selected']});
 document.addEventListener('change',()=>queueMicrotask(refreshPopMenus));
}
