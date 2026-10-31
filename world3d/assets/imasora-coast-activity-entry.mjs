import * as T from './three.module.min.js';
import {coastShore,coastHeight,COAST_WORLD} from './imasora-coast-layout.mjs?v=120mx';

export const COAST_ACTIVITIES=Object.freeze([
 Object.freeze({id:'pier',title:'いかだの乗り場',short:'星待ちの桟橋',description:'桟橋から、用意されているいかだに乗って出航できる。'})
]);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// Read-only walking targets. Loan parts, physics and saves never change here.
// The beach approach stays on wadeable sand even when the real crate drifts.
export function coastActivityApproach(play,id,actor){
 if(!COAST_ACTIVITIES.some(a=>a.id===id))return null;
 const parts=play?.parts??[];
 const part=id==='shore'?parts.find(p=>p.id==='sea-1'):
  parts.find(p=>p.id===actor.rider?.id)??parts.find(p=>p.id==='sea-5')??parts.find(p=>p.type==='board');
 const x=id==='shore'?clamp(part?.p[0]??12,-COAST_WORLD.width/2+90,COAST_WORLD.width/2-90):340;
 const z=id==='shore'?Math.min(part?.p[2]??285,coastShore(x)+62):565;
 const y=id==='shore'?coastHeight(x,z):0;
 const distance=Math.hypot(actor.x-x,actor.z-z),height=Math.abs((actor.y??0)-y);
 const near=id==='pier'&&!!actor.rider||distance<=(id==='shore'?100:45)&&height<12;
 const usable=part&&Math.hypot(part.p[0]-actor.x,part.p[2]-actor.z)<=140;
 return{id,point:[x,y,z],partId:usable?part.id:null,marker:part?.p?.slice()??[x,y,z],distance,near,
  title:id==='shore'?'箱はここ！':'桟橋はここ！',
  tip:id==='shore'?'砂浜を進んで、海のオレンジ色の箱を探そう。':'桟橋の先の、黄色い乗り口へ。いかだが遠いときは「いかだを助ける」。'};
}
export function coastActivityHeading(target,actor){
 const angle=Math.atan2(target.point[0]-actor.x,target.point[2]-actor.z)-(actor.heading??0);
 return Math.atan2(Math.sin(angle),Math.cos(angle))*180/Math.PI;
}

export function createCoastActivityEntry({host,canvas,camera,context,onArrive,clearInput,icons}){
 const picker=document.createElement('dialog');picker.className='sea-toybox sea-activity-picker';picker.setAttribute('aria-label','海辺でなにしてあそぶ？');
 picker.innerHTML='<header><div><small>波・浮き・重さで、ためしてみよう！</small><h2>なにしてあそぶ？</h2></div><button type="button" data-activity-close>とじる ✕</button></header><div class="sea-activity-cards">'+COAST_ACTIVITIES.map(a=>'<button type="button" data-activity="'+a.id+'">'+(a.id==='shore'?icons.cargo:icons.board)+'<strong>'+a.title+'</strong><span>'+a.description+'</span></button>').join('')+'</div><p>えらぶと、現場に目印が出るよ。道具は何度でも組みかえられるよ！</p>';
 const nav=document.createElement('section');nav.className='sea-activity-nav';nav.hidden=true;nav.setAttribute('aria-label','遊ぶ場所への案内');
 nav.innerHTML='<div><b data-activity-arrow aria-hidden="true">↑</b><span><strong data-activity-name></strong><small data-activity-hint></small></span></div><footer><button type="button" data-activity-map aria-label="地図でたしかめる">地図でたしかめる</button><button type="button" data-activity-stop aria-label="目印を消す">✕</button></footer>';
 const marker=document.createElement('div');marker.className='sea-activity-marker';marker.hidden=true;marker.setAttribute('aria-hidden','true');marker.innerHTML='<span></span><i></i>';
 document.body.append(picker);host.append(nav,marker);
 const text=(selector,value)=>{const el=nav.querySelector(selector);if(el.textContent!==value)el.textContent=value;};
 let selected=null,disposed=false,last=-Infinity,rect=null,mapAction=()=>{},returnFocus=null;
 const position=new T.Vector3(),observer=new ResizeObserver(()=>rect=null);observer.observe(canvas);observer.observe(host);
 function cancel(){selected=null;nav.hidden=marker.hidden=true;}
 function start(id){if(disposed||context().map!=='coast'||!COAST_ACTIVITIES.some(a=>a.id===id))return false;clearInput();selected=id;last=-Infinity;if(picker.open)picker.close();return true;}
 function show(){if(disposed||context().map!=='coast')return;clearInput();returnFocus=document.activeElement;if(!picker.open)picker.showModal();}
 picker.querySelector('[data-activity-close]').onclick=()=>picker.close();
 for(const b of picker.querySelectorAll('[data-activity]'))b.onclick=()=>start(b.dataset.activity);
 picker.addEventListener('close',()=>{clearInput();if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});returnFocus=null;});
 picker.addEventListener('cancel',clearInput);nav.querySelector('[data-activity-stop]').onclick=()=>{cancel();clearInput();};
 nav.querySelector('[data-activity-map]').onclick=()=>mapAction(selected);
 function update({map='coast',overlay=false,now=performance.now()}={}){
  if(disposed)return;
  if(map!=='coast'){cancel();if(picker.open)picker.close();return;}
  if(!selected&&!picker.open)return;
  if(overlay||document.hidden){nav.hidden=marker.hidden=true;return;}
  if(now-last<100)return;last=now;
  if(document.querySelector('dialog[open]')){nav.hidden=marker.hidden=true;return;}
  const actor=context();
  if(!selected)return;
  const target=coastActivityApproach(actor.play,selected,actor);
  if(target.near&&!actor.blocked&&!actor.airborne){const id=selected;cancel();onArrive(id,target);return;}
  nav.hidden=false;text('[data-activity-name]',COAST_ACTIVITIES.find(a=>a.id===selected).title);
  text('[data-activity-hint]',target.distance<180?'もうすぐ！ 目印のほうへ':target.tip);
  nav.querySelector('[data-activity-arrow]').style.transform='rotate('+coastActivityHeading(target,actor)+'deg)';
  // One DOM marker at 10Hz, with no new mesh, shader, physics step or save.
  rect??={canvas:canvas.getBoundingClientRect(),host:host.getBoundingClientRect()};
  const cam=camera();cam.updateMatrixWorld();position.fromArray(target.id==='pier'?target.point:target.marker);position.y+=target.id==='shore'?24:18;position.project(cam);
  const x=(position.x+1)*rect.canvas.width/2+rect.canvas.left-rect.host.left,y=(1-position.y)*rect.canvas.height/2+rect.canvas.top-rect.host.top;
  marker.hidden=position.z<-1||position.z>1||x<65||x>rect.host.width-65||y<100||y>rect.host.height-140;
  if(!marker.hidden){marker.style.transform='translate('+x+'px,'+y+'px)';const label=marker.firstElementChild;if(label.textContent!==target.title)label.textContent=target.title;}
 }
 return{show,start,cancel,update,setMapAction(fn){mapAction=fn;},get open(){return picker.open;},get active(){return selected;},dispose(){if(disposed)return;disposed=true;observer.disconnect();if(picker.open)picker.close();picker.remove();nav.remove();marker.remove();}};
}
