import * as T from './three.module.min.js';
import {createHuntReplayCamera} from './imasora-sliding-tag-hunt-replay-camera.mjs';
import {huntReplayCamera} from './imasora-sliding-tag-hunt-replay.mjs';
import {huntActorConcealed} from './imasora-sliding-tag-hunt-visibility.mjs';
import {worldCameraPose,worldSight,worldValid} from './imasora-sliding-tag-hunt-world.mjs';

const W=1280,H=720,SCREEN_W=384,SCREEN_H=108;
const wideTile={x:24,y:143,w:778,h:460,max:560},topTile={x:822,y:100,w:434,h:258,max:360},bottomTile={...topTile,y:376};

const screenTiles={opponent:{x:0,y:0,w:190,h:SCREEN_H,max:190},wide:{x:194,y:0,w:190,h:SCREEN_H,max:190}};
function wideFocus(state,base,rivals){
 let weight=0,x=0,y=0,z=0;
 for(const rival of rivals){
  const dx=rival.x-base.x,dy=rival.y+3-base.y,dz=rival.z-base.z;
  const distance=Math.hypot(dx,dy,dz);
  if(distance>=40||huntActorConcealed(state,rival)||!worldSight(base,{x:rival.x,y:rival.y+3,z:rival.z},.8))continue;
  // Fade a rival into the shot before contact. Averaging avoids a cut when
  // two approaching hunters exchange which one is closest.
  const blend=Math.min(1,(40-distance)/16);
  const influence=blend*blend*(3-2*blend);
  weight+=influence;x+=dx*influence;y+=dy*influence;z+=dz*influence;
 }
 const scale=Math.min(.5/Math.max(1,weight),11/(Math.hypot(x,y,z)||1));
 return {x:x*scale,y:y*scale,z:z*scale};
}

function opponentShot(actor){
 return{target:{x:actor.x,y:actor.y+4,z:actor.z},yaw:actor.yaw+Math.PI,pitch:.28,distance:33,minDistance:17};
}
function selectScreenRival(active,rivals,hidden,current){
 let closest=null,closestDistance=40,currentDistance=Infinity;
 for(const rival of rivals){
  if(hidden.includes(rival))continue;
  const distance=Math.hypot(rival.x-active.x,rival.y+1-active.y,rival.z-active.z);
  if(rival===current)currentDistance=distance;
  if(distance>=closestDistance)continue;
  closest=rival;closestDistance=distance;
 }
 // Keep a visible rival until another is meaningfully closer.
 return currentDistance<40&&currentDistance<=closestDistance+6?current:closest;
}
export function huntBroadcastShots(s,active,visibleRivals){
 const hunting=s.config.mode==='hunt',other=hunting?s.player:s.hunters[0];

 const wide=huntReplayCamera(s,null,wideTile.w/wideTile.h,active);
 const rivals=visibleRivals??(hunting?[s.player]:s.hunters);
 return{
  hunting,
  opponent:opponentShot(other),
  wide:{...wide,yaw:wide.yaw+.72,pitch:.60,distance:72,minDistance:44,wide:true},
  wideOffset:wideFocus(s,wide.target,rivals),
 };
}

function fit(w,h,tile){
 const scale=Math.min(tile.w/w,tile.h/h),width=w*scale,height=h*scale;
 return[tile.x+(tile.w-width)/2,tile.y+(tile.h-height)/2,width,height];
}

export function createHuntBroadcastViews({renderer,scene,source,documentTarget=document}){
 let wideOffset=null,screenRival=null;
 let canvas,ctx,mode='multi',last=-Infinity,token,epoch,frame,screenCanvas,screenContext,screenEnabled=false,screenActive=false,desktopFrame=false;
 const viewport=new T.Vector4(),scissor=new T.Vector4(),opponentCamera=new T.PerspectiveCamera(56,1,.15,900),wideCamera=opponentCamera.clone();
 const projected=new T.Vector3();
 const opponentSmooth=createHuntReplayCamera(),screenOpponentSmooth=createHuntReplayCamera(),wideSmooth=createHuntReplayCamera();

 function captureCanvas(){
  if(!canvas){
   const next=documentTarget.createElement('canvas');
   next.width=W;next.height=H;
   const context=next.getContext('2d',{alpha:false});
   if(!context)throw Error('配信用の映像を準備できませんでした。');
   canvas=next;ctx=context;
  }
  return canvas;
 }
 function setScreen(enabled){
  if(enabled&&!screenCanvas){
   const next=documentTarget.createElement('canvas');
   next.width=SCREEN_W;next.height=SCREEN_H;next.className='tag-screen-broadcast';next.hidden=true;
   next.setAttribute('aria-hidden','true');
   const context=next.getContext('2d',{alpha:false});
   if(!context)throw Error('スマホ用の映像を準備できませんでした。');
   documentTarget.body.append(next);
   screenCanvas=next;screenContext=context;
  }
  screenEnabled=enabled;
  if(!enabled)showScreen(false);
  return screenEnabled;
 }
 function showScreen(playing){
  const visible=screenEnabled&&playing;
  if(visible!==screenActive){
   screenActive=visible;
   last=-Infinity;
  }
  if(!visible&&screenCanvas){screenCanvas.hidden=true;screenRival=null;}
  return visible;
 }
 function reset(){last=-Infinity;wideOffset=null;screenRival=null;opponentSmooth.reset();screenOpponentSmooth.reset();wideSmooth.reset();}
 function setLayout(next){mode=next==='single'?'single':'multi';reset();}
 function begin(now,state,active,{round,replaying,paused,desktop=true,screen=false,mainCamera}){
  desktopFrame=desktop&&!!ctx;
  if(!desktopFrame&&!screen)return null;
  if(token!==round||epoch!==replaying){token=round;epoch=replaying;reset();}
  if(now-last<1000/(desktopFrame?(mode==='multi'?15:30):10))return null;
  const dt=paused?0:Number.isFinite(last)?Math.min(.1,(now-last)/1000):0;
  last=now;
  if(desktopFrame){ctx.fillStyle='#102231';ctx.fillRect(0,0,W,H);}
  const desktopMulti=desktopFrame&&mode==='multi';
  const rivals=state.config.mode==='hunt'?[state.player]:state.hunters;
  const hiddenRivals=screen?screenHiddenRivals(state,active,rivals,mainCamera):null;
  const visibleRivals=hiddenRivals&&!desktopMulti?rivals.filter(rival=>!hiddenRivals.includes(rival)):undefined;
  frame=(desktopMulti||screen)&&!replaying?{...huntBroadcastShots(state,active,visibleRivals),dt,desktopMulti,screen}:null;
  if(frame){
   if(screen){
    const selected=selectScreenRival(active,rivals,hiddenRivals,screenRival);
    if(selected!==screenRival)screenOpponentSmooth.reset();
    screenRival=selected;
    frame.screenOpponent=selected?opponentShot(selected):null;
    frame.sharedOpponent=selected===rivals[0];
    screenContext.fillStyle='#102231';
    screenContext.fillRect(0,0,SCREEN_W,SCREEN_H);
   }
   const {wide,wideOffset:desired}=frame;
   if(!wideOffset)wideOffset=desired;
   const ease=1-Math.exp(-9*dt);
   for(const axis of ['x','y','z'])wideOffset[axis]+=(desired[axis]-wideOffset[axis])*ease;
   const base=wide.target,target={x:base.x+wideOffset.x,y:base.y+wideOffset.y,z:base.z+wideOffset.z};
   frame.wideAnchor=base;
   if(Math.hypot(wideOffset.x,wideOffset.y,wideOffset.z)>.05&&worldValid(target,.8)&&worldSight(base,target,.8)){
    const candidate=worldCameraPose(target,wide);
    if(worldSight(candidate.position,base,.3))wide.target=target;
   }
  }
  return{multi:!!frame,opponent:!!(frame&&(frame.desktopMulti||frame.screenOpponent)),...(frame?.screen?{hiddenRivals}:{})};
 }
 function screenHiddenRivals(state,active,rivals,mainCamera){
  const origin={x:active.x,y:active.y+3,z:active.z};
  return rivals.filter(rival=>{
   const point={x:rival.x,y:rival.y+3,z:rival.z};
   if(huntActorConcealed(state,rival)||!worldSight(origin,point,.8))return true;
   if(!mainCamera)return false;
   projected.set(point.x,point.y,point.z).project(mainCamera);
   return Math.abs(projected.x)>1||Math.abs(projected.y)>1||Math.abs(projected.z)>1||
    !worldSight(mainCamera.position,point);
  });
 }
 function capture(view,centerSky,screenMask=[]){
  if(!frame)return;
  const opponent=view==='opponent',desktopTile=opponent?(frame.hunting?topTile:bottomTile):wideTile;
  const screenTile=frame.screen&&(!opponent||frame.screenOpponent)?screenTiles[view]:null;
  if(!frame.desktopMulti&&!screenTile)return;
  const tile=frame.desktopMulti?desktopTile:screenTile;
  const camera=opponent?opponentCamera:wideCamera,smooth=opponent?opponentSmooth:wideSmooth;
  const ratio=renderer.getPixelRatio();
  const scale=Math.min(tile.max/tile.w,source.width/tile.w,source.height/tile.h);
  const w=Math.floor(tile.w*scale),h=Math.floor(tile.h*scale);
  if(w<2||h<2){frame=null;return;}
  camera.aspect=w/h;
  camera.updateProjectionMatrix();
  function pointCamera(shot,tracking){
   let target=shot.target,pose=tracking.update(target,{...shot,dt:frame.dt});
   if(!opponent&&target!==frame.wideAnchor&&!worldSight(pose.position,frame.wideAnchor,.3)){
    target=frame.wideAnchor;
    pose=tracking.update(target,{...shot,dt:0});
   }
   camera.position.set(pose.position.x,pose.position.y,pose.position.z);
   camera.lookAt(target.x,target.y,target.z);
   const near=pose.near??.15;
   if(camera.near!==near){camera.near=near;camera.updateProjectionMatrix();}
   centerSky(camera);
  }
  const clipped=renderer.getScissorTest();
  renderer.getViewport(viewport);
  renderer.getScissor(scissor);
  try{
   renderer.setViewport(0,0,w/ratio,h/ratio);
   renderer.setScissor(0,0,w/ratio,h/ratio);
   renderer.setScissorTest(true);
   if(frame.desktopMulti){
    pointCamera(frame[view],smooth);
    renderer.render(scene,camera);
    ctx.drawImage(source,0,source.height-h,w,h,desktopTile.x,desktopTile.y,desktopTile.w,desktopTile.h);
   }
   if(screenTile){
    const visible=screenMask.filter(node=>node.visible);
    for(const node of visible)node.visible=false;
    try{
     const separateOpponent=opponent&&(!frame.desktopMulti||!frame.sharedOpponent);
     if(separateOpponent)pointCamera(frame.screenOpponent,screenOpponentSmooth);
     else if(!frame.desktopMulti)pointCamera(frame[view],smooth);
     if(!frame.desktopMulti||separateOpponent||visible.length)renderer.render(scene,camera);
     screenContext.drawImage(source,0,source.height-h,w,h,screenTile.x,screenTile.y,screenTile.w,screenTile.h);
    }finally{
     for(const node of visible)node.visible=true;
    }
   }
  }catch{
   frame=null;
  }finally{
   renderer.setViewport(viewport);
   renderer.setScissor(scissor);
   renderer.setScissorTest(clipped);
  }
 }
 function badge(tile,label,color){
  ctx.fillStyle='#102231e8';
  ctx.fillRect(tile.x+10,tile.y+10,Math.min(tile.w-20,ctx.measureText(label).width+30),36);
  ctx.fillStyle=color;
  ctx.fillText(label,tile.x+23,tile.y+35,tile.w-42);
 }
 function finish(){
  if(screenActive){
   if(frame?.screen){
    screenContext.font='700 22px system-ui, sans-serif';
    screenContext.fillStyle='#102231e8';
    for(const tile of Object.values(screenTiles))screenContext.fillRect(tile.x,tile.y,tile.w,27);
    screenContext.fillStyle='#f5fafb';
    const other=frame.hunting?'逃走者':'鬼';
    screenContext.fillText(frame.screenOpponent?other+'の視点':other+'は視界外',7,22,176);
    screenContext.fillText('引きの視点',201,22,176);
   }
   screenCanvas.hidden=!frame?.screen;
  }
  if(!desktopFrame){frame=null;return;}
  if(!frame?.desktopMulti){
   ctx.fillStyle='#102231';
   ctx.fillRect(0,0,W,H);
   ctx.drawImage(source,...fit(source.width,source.height,{x:0,y:0,w:W,h:H}));
   frame=null;
   return;
  }
  const main=frame.hunting?bottomTile:topTile;
  ctx.fillStyle='#243f51';
  ctx.fillRect(main.x,main.y,main.w,main.h);
  ctx.drawImage(source,...fit(source.width,source.height,main));
  ctx.font='700 22px system-ui, sans-serif';
  badge(wideTile,'引きの視点','#fff0b1');
  badge(topTile,frame.hunting?'逃走者視点 · CPU':'逃走者視点 · 操作中','#a8fff0');
  badge(bottomTile,frame.hunting?'鬼視点 · 操作中':'鬼視点 · CPU','#ffc0ac');
  frame=null;
 }
 return{captureCanvas,setLayout,setScreen,showScreen,reset,begin,capture,finish};
}

