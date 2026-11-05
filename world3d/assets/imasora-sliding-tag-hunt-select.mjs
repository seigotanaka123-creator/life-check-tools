import{captureHuntPointer}from'./imasora-sliding-tag-hunt-input.mjs';
import{createHuntRenderRecovery}from'./imasora-sliding-tag-hunt-render-recovery.mjs';
import{createHuntThumbnailCache,huntThumbnailKey}from'./imasora-sliding-tag-hunt-thumbnails.mjs';
import*as T from'./three.module.min.js';
import{buildMatureStarCharacter360,buildFloweringHeroCharacter360}from'./imasora-character-360.js';
// BEGIN TAG CHARACTER SELECT
export function createTagCharacterSelect({characters,onChoose}){
 const dialog=document.createElement('dialog');dialog.className='tag-select';dialog.innerHTML=`<header><div><small>イマソラリンクの仲間たち</small><h2>だれと鬼ごっこする？</h2></div><button data-close>戻る ×</button></header><div class="ts-main"><section><div class="ts-stage" role="img" aria-label="選んだモンスターの3Dモデル"><p data-preview-note hidden style="margin:auto;padding:18px;font-weight:700;text-align:center;line-height:1.6">3D表示を準備できません。<br>名前と能力で選べます。</p></div><div class="ts-rotate"><button data-left aria-label="左から見る">↶</button><span>なぞって回せるよ</span><button data-right aria-label="右から見る">↷</button></div></section><section class="ts-info" aria-live="polite"><small data-stage></small><h3></h3><b data-type></b><p data-hint></p><p class="ts-width" data-width></p><div class="ts-stats"></div><small>能力は鬼ごっこでの走りの目安（5段階）</small><button data-choose>このモンスターに決める</button></section></div><nav class="ts-filter" aria-label="成長段階"><button data-filter="all">みんな</button><button data-filter="hero">開花期</button><button data-filter="star">満開期</button></nav><input class="ts-search" type="search" placeholder="名前でさがす" aria-label="モンスターの名前"><div class="ts-grid" role="group" aria-label="モンスター一覧"></div><footer><button data-prev>◀ 前へ</button><output></output><button data-next>次へ ▶</button></footer><p class="ts-error" role="status"></p>`;document.body.append(dialog);
 const q=s=>dialog.querySelector(s),thumbnails=createHuntThumbnailCache(),pixelRatio=Math.min(devicePixelRatio,1.5);let selected=characters[0],page=0,filter='all',renderer,scene,camera,root,ro,angle=0,job=0,drag,thumbnailBuilds=0,previewRecovery;
 function previewReady(){
  if(!renderer||!scene||!camera||previewRecovery?.lost)return false;
  try{return !renderer.getContext().isContextLost();}catch{return false;}
 }
 const thumbnailStats=()=>{dialog.dataset.thumbnails=JSON.stringify({...thumbnails.stats(),builds:thumbnailBuilds});dialog.dataset.previewReady=String(previewReady());};
 const dispose=m=>{if(!m)return;const gs=new Set(),ms=new Set();m.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const v of Array.isArray(o.material)?o.material:[o.material])if(v)ms.add(v);});m.removeFromParent();gs.forEach(g=>g.dispose());ms.forEach(v=>v.dispose());};
 function build(c){const m=c.stage==='hero'?buildFloweringHeroCharacter360(c.id):buildMatureStarCharacter360(c.id);m.updateMatrixWorld(true);const b=new T.Box3().setFromObject(m),center=b.getCenter(new T.Vector3()),size=b.getSize(new T.Vector3()),scale=6/size.y;m.scale.multiplyScalar(scale);m.position.set(-center.x*scale,-b.min.y*scale,-center.z*scale);return m;}
 function paint(model=root,thumbnail=false){if(!previewReady()||!model||!dialog.open)return false;try{const r=q('.ts-stage').getBoundingClientRect(),w=thumbnail?180:Math.max(1,r.width),h=thumbnail?150:Math.max(1,r.height);renderer.setSize(w,h,false);const aspect=w/h,span=Math.max(4.7,4/aspect),viewAngle=thumbnail?0:angle;camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;camera.position.set(Math.sin(viewAngle)*15,6,Math.cos(viewAngle)*15);camera.lookAt(0,3,0);camera.updateProjectionMatrix();scene.add(model);renderer.render(scene,camera);return !renderer.getContext().isContextLost();}catch{return false;}}
 function paintSelected(){
  if(!dialog.open||!root)return;
  if(!paint()){previewUnavailable();return;}
  if(!renderer.domElement.hidden&&q('[data-preview-note]').hidden)return;
  q('[data-preview-note]').hidden=true;
  renderer.domElement.hidden=false;
  q('[data-left]').disabled=q('[data-right]').disabled=false;
  q('.ts-rotate span').textContent='なぞって回せるよ';
  q('.ts-stage').setAttribute('aria-label',selected.name+'の実際の3Dモデル');
 }
 function select(c){selected=c;angle=0;dispose(root);root=null;q('h3').textContent=c.name;q('[data-stage]').textContent=c.stage==='hero'?'開花期':'満開期';q('[data-type]').textContent=c.ability.title;q('[data-hint]').textContent=c.ability.hint;q('[data-width]').textContent='体格差は、走りの特徴に反映';q('.ts-stage').setAttribute('aria-label',c.name+'の実際の3Dモデル');q('.ts-stats').replaceChildren(...['加速','最高速','小回り','減速'].map((name,i)=>{const e=document.createElement('div');e.className='ts-stat';const label=document.createElement('span'),bar=document.createElement('meter'),value=document.createElement('b');label.textContent=name;bar.min=0;bar.max=5;bar.value=c.ability.scores[i];bar.setAttribute('aria-label',name);value.textContent=c.ability.scores[i]+'/5';e.append(label,bar,value);return e;}));for(const b of q('.ts-grid').children)b.setAttribute('aria-pressed',String(b.dataset.id===c.id));if(previewReady()){try{root=build(c);paintSelected();}catch{previewUnavailable();}}else previewUnavailable();}
 function filtered(){const word=q('input').value.trim();return characters.filter(c=>(filter==='all'||c.stage===filter)&&(!word||c.name.includes(word)));}
 async function grid(){const token=++job,list=filtered(),pages=Math.max(1,Math.ceil(list.length/12));page=Math.max(0,Math.min(page,pages-1));q('output').textContent=`${list.length}体 ／ ${page+1} / ${pages}`;q('[data-prev]').disabled=page===0;q('[data-next]').disabled=page===pages-1;q('.ts-grid').replaceChildren();const cards=list.slice(page*12,page*12+12).map(c=>{const b=document.createElement('button'),img=document.createElement('img'),label=document.createElement('span');b.dataset.id=c.id;b.setAttribute('aria-pressed',String(c.id===selected.id));img.alt='';img.hidden=true;label.textContent=c.name;b.append(img,label);b.onclick=()=>select(c);q('.ts-grid').append(b);return{c,img};});for(const {c,img}of cards){
  const key=huntThumbnailKey(c,pixelRatio),cached=thumbnails.get(key);if(cached){img.src=cached;img.hidden=false;continue;}if(!previewReady())continue;
  await new Promise(requestAnimationFrame);if(token!==job||!dialog.open)return;if(!previewReady())continue;let thumb;try{thumbnailBuilds++;thumb=build(c);if(root)scene.remove(root);if(!paint(thumb,true))continue;const image=renderer.domElement.toDataURL('image/png');if(!previewReady())continue;img.src=image;img.hidden=false;thumbnails.put(key,image);}catch{q('.ts-error').textContent='表示の準備に時間がかかっています。名前からも選べます。';}finally{dispose(thumb);if(root){scene.add(root);paintSelected();}}
 }thumbnailStats();}
 function open(id,title){if(dialog.open)return;releasePreview();q('h2').textContent=title||'だれと鬼ごっこする？';selected=characters.find(c=>c.id===id)||characters[0];q('.ts-error').textContent='';dialog.showModal();try{renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(pixelRatio);q('.ts-stage').append(renderer.domElement);scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0xb4c8de,2.5));const light=new T.DirectionalLight(0xfff3d9,2.8);light.position.set(-8,12,10);scene.add(light);camera=new T.OrthographicCamera(-5,5,5,-5,.1,100);previewRecovery=createHuntRenderRecovery({canvas:renderer.domElement,isActive:()=>false,suspend(){job++;endDrag();previewUnavailable();thumbnailStats();},restore(){q('.ts-error').textContent='';const savedAngle=angle;select(selected);angle=savedAngle;paintSelected();grid();}});const instance=renderer;ro=new ResizeObserver(()=>{if(renderer===instance)paintSelected();});ro.observe(q('.ts-stage'));}catch{releasePreview();}select(selected);grid();}
 function previewUnavailable(){if(renderer)renderer.domElement.hidden=true;q('[data-preview-note]').hidden=false;q('[data-left]').disabled=q('[data-right]').disabled=true;q('.ts-rotate span').textContent='名前と能力で選べます';q('.ts-stage').setAttribute('aria-label',selected.name+'の3D表示は利用できません。名前と能力で選べます');}
 function endDrag(){const previous=drag;drag=null;if(previous)try{const stage=q('.ts-stage');if(stage.hasPointerCapture(previous.id))stage.releasePointerCapture(previous.id);}catch{}}
 function releasePreview(){
  job++;
  const oldRenderer=renderer,oldRoot=root;
  renderer=null;root=null;scene=null;camera=null;
  previewRecovery?.dispose();previewRecovery=null;
  endDrag();
  ro?.disconnect();ro=null;
  if(oldRenderer)oldRenderer.domElement.remove();
  try{dispose(oldRoot);}catch{}
  try{oldRenderer?.dispose();}catch{}
  try{if(oldRenderer&&!oldRenderer.getContext().isContextLost())oldRenderer.forceContextLoss();}catch{}
 }
 function close(){dialog.close();releasePreview();}dialog.addEventListener('close',()=>{if(!dialog.open)releasePreview();});dialog.addEventListener('cancel',event=>{event.preventDefault();close();});q('[data-close]').onclick=close;q('[data-choose]').onclick=()=>{onChoose(selected.id);close();};q('[data-left]').onclick=()=>{angle-=Math.PI/4;paintSelected();};q('[data-right]').onclick=()=>{angle+=Math.PI/4;paintSelected();};for(const b of dialog.querySelectorAll('[data-filter]'))b.onclick=()=>{filter=b.dataset.filter;page=0;for(const x of dialog.querySelectorAll('[data-filter]'))x.setAttribute('aria-pressed',String(x===b));grid();};q('input').oninput=()=>{page=0;grid();};q('[data-prev]').onclick=()=>{page--;grid();};q('[data-next]').onclick=()=>{page++;grid();};const stage=q('.ts-stage');stage.onpointerdown=e=>{if(drag||!previewReady()||!captureHuntPointer(stage,e))return;drag={id:e.pointerId,x:e.clientX};};stage.onpointermove=e=>{if(drag?.id!==e.pointerId)return;angle+=(e.clientX-drag.x)*.012;drag.x=e.clientX;paintSelected();};for(const name of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(name,event=>{if(drag?.id===event.pointerId)drag=null;});return{open};
}

