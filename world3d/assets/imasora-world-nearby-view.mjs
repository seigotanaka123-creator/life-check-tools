import * as T from './three.module.min.js';
import {createNearbyNames,nameTargetDistance} from './imasora-world-nearby-names.mjs?v=120gg';

// Camera-facing text above the real object; never a card in a fixed HUD slot.
export function projectNearbyName(target,camera,rect) {
 if(!camera?.isCamera||!(rect.width>0&&rect.height>0))return null;
 const p=new T.Vector3(...(target.labelAnchor??[target.x,target.maxY+8,target.z]));
 camera.updateWorldMatrix(true,false);p.project(camera);
 if(![p.x,p.y,p.z].every(Number.isFinite)||p.z< -1||p.z>1||Math.abs(p.x)>1||Math.abs(p.y)>1)return null;
 return {x:rect.left+(p.x+1)*rect.width/2,y:rect.top+(1-p.y)*rect.height/2};
}
export function nearbyNameFits(screen,name,rect,obstacles=[]) {
 if(!screen)return false;
 const width=Array.from(name).reduce((n,c)=>n+(c.charCodeAt(0)<128?16:23),4),height=31;
 const r={left:screen.x-width/2,right:screen.x+width/2,top:screen.y-height,bottom:screen.y};
 return r.left>=rect.left+4&&r.right<=rect.left+rect.width-4&&r.top>=rect.top+4&&r.bottom<=rect.top+rect.height-4&&!obstacles.some(b=>r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top);
}
export function createNearbyNamesView({canvas,camera,mount=document.body}={}) {
 const model=createNearbyNames(),text=document.createElement('div');
 text.className='world-nearby-name';text.role='status';text.setAttribute('aria-live','polite');text.hidden=true;
 text.style.cssText='position:fixed;z-index:135;pointer-events:none;max-width:calc(100vw - 24px);padding:0;border:0;border-radius:0;background:transparent;color:#fff;box-shadow:none;font:850 22px/1.35 system-ui;text-align:center;white-space:nowrap;transform:translate(-50%,-100%);-webkit-text-stroke:1.5px #102630;paint-order:stroke fill;text-shadow:0 2px 5px #071e28;';mount.append(text);
 const guide=document.createElement('aside'),guideName=document.createElement('strong'),guideBody=document.createElement('p');
 guide.className='world-nearby-guide';guide.hidden=true;guide.setAttribute('aria-label','近くの設備の使い方');
 guide.style.cssText='position:fixed;z-index:134;box-sizing:border-box;pointer-events:none;padding:11px 14px;background:#112a38;color:#fff8ea;border:2px solid #e6bd6f;border-radius:12px;font:500 15px/1.5 system-ui;box-shadow:0 3px 12px #0005;';
 guideName.style.cssText='display:block;font-size:17px;color:#ffe0a0;';guideBody.style.cssText='margin:3px 0 0;';guide.append(guideName,guideBody);mount.append(guide);
 // Geometry reads after the play HUD's writes used to force a complete page
 // layout on every walking frame. Bounds change with the viewport, not waves.
 let rect=null;const invalidate=()=>{rect=null;lastObstacles=-Infinity;};
 const viewport=globalThis.window;viewport?.addEventListener('resize',invalidate);viewport?.addEventListener('scroll',invalidate,true);viewport?.visualViewport?.addEventListener('resize',invalidate);viewport?.visualViewport?.addEventListener('scroll',invalidate);
 const observer=typeof ResizeObserver==='function'?new ResizeObserver(invalidate):null;observer?.observe(canvas);
 let lastMap=null,deadline=null,expiryTimer=null,obstacles=[],lastObstacles=-Infinity,measuredName=null,measuredWidth=0,measuredHeight=0,measuredCanvasWidth=null,guideKey='',guideHeight=0;
 const refreshObstacles=now=>{
  if(now-lastObstacles<150)return;
  lastObstacles=now;
  obstacles=[...document.querySelectorAll('button,dialog[open],.world-player-bar,.free-hud-top,.transport-header,.transport-trial-time,.construction-keyboard-hint,#touchPad,#ufoMovePad,.construction-move-pad')].filter(o=>o.getClientRects().length&&getComputedStyle(o).visibility!=='hidden').map(o=>o.getBoundingClientRect());
 };
 function updateGuide(t,rect){
  if(!t||rect.height<168||rect.width<220){guide.hidden=true;return;}
  const width=Math.min(320,rect.width-24),key=t.id+'|'+width;
  if(guideKey!==key){
   guideKey=key;guideName.textContent=t.name;guideBody.textContent=t.guide;
   guide.style.width=width+'px';guide.hidden=false;guideHeight=guide.offsetHeight;
  }
  const blocked=[...obstacles,{left:t.screen.x-117,right:t.screen.x+117,top:t.screen.y-36,bottom:t.screen.y+34}];
  const left=rect.left+12,right=rect.right-width-12,top=rect.top+14,bottom=rect.bottom-guideHeight-14;
  const slots=[[left,top],[right,top],[left,top+72],[right,top+72],[left,bottom],[right,bottom]];
  const slot=slots.find(([x,y])=>y+guideHeight<=rect.bottom-8&&!blocked.some(b=>x<b.right&&x+width>b.left&&y<b.bottom&&y+guideHeight>b.top));
  guide.hidden=!slot;
  if(slot){guide.dataset.target=t.id;guide.style.left=slot[0]+'px';guide.style.top=slot[1]+'px';}
 }
 return {update(context) {
  if(context.enabled===false){model.update(context);text.hidden=guide.hidden=true;return;}
  if(lastMap!==context.map){model.update({...context,enabled:false});lastMap=context.map;}
  // Do not force a layout or project roofs which cannot show a nearby name.
  // Still update all distances so walking away re-arms the same three-second name.
  const shown=new Set(model.shown),eligible=t=>!shown.has(t.id)||t.id===model.activeId&&context.now<model.activeUntil;
  const nearby=t=>eligible(t)&&nameTargetDistance(context.actor,t)<=Math.max(48,t.enterDistance??48)+48;
  const needsGuide=t=>t.guide&&nameTargetDistance(context.actor,t)<=88;
  if(!context.targets.some(t=>nearby(t)||needsGuide(t))){model.update({...context,targets:context.targets.map(t=>({...t,displayable:false}))});text.hidden=guide.hidden=true;return;}
  rect??=canvas.getBoundingClientRect();const targets=context.targets.map(t=>nearby(t)||needsGuide(t)?({...t,screen:projectNearbyName(t,camera,rect)}):({...t,displayable:false}));
  refreshObstacles(context.now);
  const facility=targets.filter(t=>t.screen&&needsGuide(t)).sort((a,b)=>nameTargetDistance(context.actor,a)-nameTargetDistance(context.actor,b))[0];
  updateGuide(facility,rect);
  if(!targets.some(t=>nearbyNameFits(t.screen,t.name,rect))){model.update({...context,targets:targets.map(t=>({...t,displayable:false}))});text.hidden=true;return;}
  const target=model.update({...context,targets:targets.map(t=>({...t,displayable:t.displayable!==false&&nearbyNameFits(t.screen,t.name,rect,obstacles)}))});
  if(!target?.screen){text.hidden=true;return;}
  if(target.until!==deadline){deadline=target.until;clearTimeout(expiryTimer);expiryTimer=setTimeout(()=>{text.hidden=true;},Math.max(0,target.until-context.now));}
  if(text.textContent!==target.name)text.textContent=target.name;
  text.dataset.target=target.id;text.style.left=target.screen.x+'px';text.style.top=target.screen.y+'px';text.hidden=false;
  if(measuredName!==target.name||measuredCanvasWidth!==rect.width){const r=text.getBoundingClientRect();measuredName=target.name;measuredWidth=r.width;measuredHeight=r.height;measuredCanvasWidth=rect.width;}
  const r={left:target.screen.x-measuredWidth/2,right:target.screen.x+measuredWidth/2,top:target.screen.y-measuredHeight,bottom:target.screen.y};
  const clipped=r.left<rect.left+4||r.right>rect.right-4||r.top<rect.top+4||r.bottom>rect.bottom-4;
  const covered=obstacles.some(b=>r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top);
  text.hidden=clipped||covered;
 },hide(){text.hidden=guide.hidden=true;},dispose(){clearTimeout(expiryTimer);observer?.disconnect();viewport?.removeEventListener('resize',invalidate);viewport?.removeEventListener('scroll',invalidate,true);viewport?.visualViewport?.removeEventListener('resize',invalidate);viewport?.visualViewport?.removeEventListener('scroll',invalidate);text.remove();guide.remove();}};
}
