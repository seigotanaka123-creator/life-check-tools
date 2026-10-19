// Shared read-only game overlays. They never call inventory or save APIs.
const live = new Set();
export const constructionOverlayOpen = () => live.size > 0;
export function trackConstructionOverlay(value, yes){yes?live.add(value):live.delete(value);}
export function overlayStyle(file){const href=new URL(file,import.meta.url).href;if(![...document.querySelectorAll('link[rel=stylesheet]')].some(l=>l.href===href)){const link=document.createElement('link');link.rel='stylesheet';link.href=href;document.head.append(link);}}
let guide=null,focusBack=null;
export function openConstructionGuide(id='',{returnLabel='もとの画面へ戻る'}={}){
 overlayStyle('./imasora-construction-vehicle-select.css?v=120ea');
 if(!guide){guide=document.createElement('dialog');guide.className='construction-help-view';guide.setAttribute('aria-label','動きでわかる遊び方');guide.innerHTML='<header><strong>動きでわかる遊び方</strong><button type="button" data-help-close></button></header><div data-help-content></div>';document.body.append(guide);guide.querySelector('button').onclick=closeConstructionGuide;guide.addEventListener('cancel',e=>{e.preventDefault();closeConstructionGuide();});guide.addEventListener('close',()=>{trackConstructionOverlay(guide,false);guide.querySelector('[data-help-content]').replaceChildren();if(focusBack?.isConnected&&focusBack.getClientRects().length)focusBack.focus({preventScroll:true});});addEventListener('message',e=>{if(e.origin===location.origin&&e.source===guide.querySelector('iframe')?.contentWindow&&e.data?.type==='imasora-guide-close')closeConstructionGuide();});}
 if(guide.open)return;
 focusBack=document.activeElement;document.dispatchEvent(new Event('imasora-menu-peek-start'));
 const frame=document.createElement('iframe');frame.title='動きでわかる工事の遊び方';frame.src=new URL('./imasora-construction-guide.html?lesson='+encodeURIComponent(id)+'&v=120ea',import.meta.url).href;
 guide.querySelector('[data-help-content]').replaceChildren(frame);guide.querySelector('button').textContent=returnLabel;trackConstructionOverlay(guide,true);guide.showModal();guide.querySelector('button').focus();
}
export function closeConstructionGuide(){if(guide?.open)guide.close();}
// Capture before work-controller handlers. A key held before an overlay never
// becomes a new work/drive command while a player is reading the lesson.
if(typeof window!=='undefined')for(const type of ['keydown','keyup'])window.addEventListener(type,e=>{
 if(!constructionOverlayOpen())return;
 if(e.key==='Escape'&&type==='keydown'){e.preventDefault();if(guide?.open)closeConstructionGuide();else [...live].at(-1)?.close?.();}
 if(['w','a','s','d','e','x','f','ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)&&!e.target?.closest?.('button,input,select,textarea'))e.preventDefault();
 e.stopImmediatePropagation();
},true);

