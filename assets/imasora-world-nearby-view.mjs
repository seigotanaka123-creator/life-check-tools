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
 const width=Array.from(name).reduce((n,c)=>n+(c.charCodeAt(0)<128?14:20),4),height=28;
 const r={left:screen.x-width/2,right:screen.x+width/2,top:screen.y-height,bottom:screen.y};
 return r.left>=rect.left+4&&r.right<=rect.left+rect.width-4&&r.top>=rect.top+4&&r.bottom<=rect.top+rect.height-4&&!obstacles.some(b=>r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top);
}
export function createNearbyNamesView({canvas,camera,mount=document.body}={}) {
 const model=createNearbyNames(),text=document.createElement('div');
 text.className='world-nearby-name';text.role='status';text.setAttribute('aria-live','polite');text.hidden=true;
 text.style.cssText='position:fixed;z-index:50;pointer-events:none;max-width:calc(100vw - 24px);padding:0;border:0;border-radius:0;background:transparent;color:#fff;box-shadow:none;font:800 20px/1.3 system-ui;text-align:center;white-space:nowrap;transform:translate(-50%,-100%);-webkit-text-stroke:1px #294350;paint-order:stroke fill;text-shadow:0 2px 3px #183644aa;';mount.append(text);
 let lastMap=null,deadline=null,expiryTimer=null,obstacles=[],lastObstacles=-Infinity,measuredName=null,measuredWidth=0,measuredHeight=0,measuredCanvasWidth=null;
 return {update(context) {
  if(context.enabled===false){model.update(context);text.hidden=true;return;}
  if(lastMap!==context.map){model.update({...context,enabled:false});lastMap=context.map;}
  // Do not force a layout or project roofs which cannot show a nearby name.
  // Still update all distances so walking away re-arms the same three-second name.
  const shown=new Set(model.shown),eligible=t=>!shown.has(t.id)||t.id===model.activeId&&context.now<model.activeUntil;
  const nearby=t=>eligible(t)&&nameTargetDistance(context.actor,t)<=Math.max(48,t.enterDistance??48)+48;
  if(!context.targets.some(nearby)){model.update({...context,targets:context.targets.map(t=>({...t,displayable:false}))});text.hidden=true;return;}
  const rect=canvas.getBoundingClientRect(),targets=context.targets.map(t=>nearby(t)?({...t,screen:projectNearbyName(t,camera,rect)}):({...t,displayable:false}));
  if(!targets.some(t=>nearbyNameFits(t.screen,t.name,rect))){model.update({...context,targets:targets.map(t=>({...t,displayable:false}))});text.hidden=true;return;}
  if(context.now-lastObstacles>100){lastObstacles=context.now;obstacles=[...document.querySelectorAll('button,dialog[open],.world-player-bar,.free-hud-top')].filter(o=>o.getClientRects().length).map(o=>o.getBoundingClientRect());}
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
 },hide(){text.hidden=true;},dispose(){clearTimeout(expiryTimer);text.remove();}};
}
