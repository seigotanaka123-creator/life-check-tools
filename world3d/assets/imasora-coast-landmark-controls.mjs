import {COAST_TOYS,initialCoastToys,validateCoastToys,nearestCoastToy,coastToyInMotion,editCoastToys,stepCoastToy} from './imasora-coast-landmark-play.mjs?v=120io';
import {createHeldDashButton} from './imasora-hold-dash.mjs?v=120od';
import {createCoastLandmarkGesture} from './imasora-coast-landmark-gesture.mjs?v=120in';
import {coastSluiceFeedback,coastSluiceFrame} from './imasora-coast-sluice-feedback.mjs?v=120io';

export function createCoastLandmarkControls({host,context,view,saved,persist,service,clearInput,look,toast,interactive=true}){
 // Retired minigames are scenery only. Preserve earlier records without
 // installing input handlers, guidance panels, or a simulation loop.
 if(!interactive){const kept=saved?structuredClone(validateCoastToys(saved)):undefined;let drawn=null;return{update(){const v=view();if(v&&drawn!==v){v.update(kept??initialCoastToys());drawn=v;}},focus(){},editFocus:null,autoSaveKey:'',snapshot:()=>kept?structuredClone(kept):undefined,dispose(){}};}
 let s=saved?structuredClone(validateCoastToys(saved)):initialCoastToys(),started=!!saved,active=null,previous=false,settle=0,accumulator=0,lastUI=0,timer=null,disposed=false,gesture=null,directStarted=false;
 const keys=new Set(),held=[],hud=document.createElement('section');hud.className='coast-machine-hud';hud.hidden=true;hud.setAttribute('aria-label','海辺の仕掛けの操作');
 hud.innerHTML='<header><strong></strong><span data-toy-stars></span></header><p data-toy-tip></p><div class="coast-machine-meter"><meter min="0" max="1" value="0" aria-label="仕掛けの進み具合"></meter><span data-toy-value></span></div><div class="coast-machine-flow" data-toy-flow hidden><span>💧 水門からの流れ</span><meter min="0" max="1" value="0" aria-label="水門からの水の流れ"></meter><b></b></div><div class="coast-machine-buttons"><button type="button" data-toy-a></button><button type="button" data-toy-b></button><button type="button" data-toy-switch hidden>↔ 注ぎ先をかえる</button></div><footer><button type="button" data-toy-undo>↶ 1つ前へ</button><button type="button" data-toy-reset>↺ もう1回</button><button type="button" data-toy-look>全体を見る</button></footer>';
 const marker=document.createElement('div');marker.className='coast-machine-marker';marker.hidden=true;marker.textContent='ここで動かそう';marker.setAttribute('aria-hidden','true');host.append(hud,marker);
 const q=s=>hud.querySelector(s),set=(el,t)=>{if(el.textContent!==t)el.textContent=t;};
 const hiddenUI=c=>disposed||c.map!=='coast'||c.overlay||c.airborne||document.hidden||service.blocked||!!document.querySelector('dialog[open]');
 // Scene-only toys may continue while an older snapshot is writing. The next
 // save captures their newer edit/tick; inventory operations still lock separately.
 const blocked=c=>hiddenUI(c);
 function save(){clearTimeout(timer);timer=setTimeout(()=>{if(disposed||service.blocked)return;if(service.busy){save();return;}void persist().catch(()=>{});},450);}
 function release(){keys.clear();held.forEach(h=>h.cancel());gesture?.cancel();if(previous){previous=false;settle=12;save();}}
 function edit(action){const c=context(),id=nearestCoastToy(c);if(!id||blocked(c))return false;release();if(!editCoastToys(s,action,id))return false;active=id;started=true;settle=0;accumulator=0;save();return true;}
 q('[data-toy-switch]').onclick=()=>edit('aim');
 q('[data-toy-undo]').onclick=()=>edit('undo');q('[data-toy-reset]').onclick=()=>edit('reset');q('[data-toy-look]').onclick=()=>{const id=nearestCoastToy(context());if(id&&!blocked(context())){release();clearInput();look(id);}};
 for(const selector of['[data-toy-a]','[data-toy-b]'])held.push(createHeldDashButton({element:q(selector),context:()=>nearestCoastToy(context()),enabled:()=>!!nearestCoastToy(context())&&!blocked(context())}));
 gesture=createCoastLandmarkGesture({canvas:context().canvas,available:()=>{const c=context();return!blocked(c)&&!!nearestCoastToy(c);},snapshot:()=>s,
  pick:(x,y)=>{const c=context();return view()?.pickControl?.(c.camera,c.canvas,x,y,nearestCoastToy(c))??null;},
  onGrab(){directStarted=false;keys.clear();held.forEach(h=>h.cancel());clearInput();if(previous){previous=false;settle=12;save();}},
  onAim:aim=>{const target=aim??1-s.garden.aim;if(s.garden.aim!==target)edit('aim');},
  onRelease(){if(previous||directStarted){previous=false;settle=12;save();}directStarted=false;}
 });
 function down(e){if(e.repeat||!['KeyE','KeyQ'].includes(e.code)||/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName)||e.target?.isContentEditable)return;const c=context();if(blocked(c)||!nearestCoastToy(c))return;e.preventDefault();if(e.code==='KeyQ'&&nearestCoastToy(c)==='garden'){edit('aim');return;}keys.add(e.code);}
 function up(e){keys.delete(e.code);}
 const hidden=()=>{if(document.hidden)release();};window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',release);window.addEventListener('pagehide',release);document.addEventListener('visibilitychange',hidden);
 let focused=null,drawnView=null,drawnTick=-1,drawnEdit=-1,screenFrame=null,frameKey='';
 function update(delta,now=performance.now()){
  if(disposed)return;const c=context(),id=nearestCoastToy(c),off=blocked(c);if(off||id!==active&&previous)release();if(gesture.id&&gesture.id!==id)gesture.cancel();
  const direct=gesture.active?gesture.read(s):null;
  const a=!off&&!!id&&(direct?direct.a:held[0].active||keys.has('KeyE')),b=!off&&!!id&&id!=='garden'&&(direct?direct.b:held[1].active||keys.has('KeyQ'));
  const input=a||(b&&id!=='garden');
  // Resume physical motion from a saved nearby mechanism without synthesizing
  // a held button, a new undo operation, or elapsed time while the game was off.
  if(started&&!off&&!input&&id&&id!==active&&coastToyInMotion(s,id)){active=id;settle=12;accumulator=0;}
  if(input&&!previous){active=id;started=true;if(!gesture.active||!directStarted){editCoastToys(s,'begin',id);if(gesture.active)directStarted=true;}clearInput();if(!gesture.active&&focused!==id){focused=id;look(id);}}
  if(previous&&!input){settle=12;save();}previous=input;
  const flowing=!!active&&coastToyInMotion(s,active)&&Math.hypot(c.x-COAST_TOYS[active].x,c.z-COAST_TOYS[active].z)<200;
  if(started&&active&&!off&&(input||settle>0||flowing)){
   const old=completed();accumulator=Math.min(.1,accumulator+Math.max(0,delta));let steps=0;
   while(accumulator>=1/60&&steps++<6){stepCoastToy(s,active,{a,b});accumulator-=1/60;}if(!input)settle=Math.max(0,settle-delta);
   if(completed()>old){save();toast(active==='lighthouse'?'★ 貝の灯りがともった！':active==='rocks'?'★ 波の流れをつかまえた！':'★ 水車で花が咲いた！');}
   if(!input&&!flowing&&settle===0)save();
  }
  const v=view();if(v){v.root.visible=c.map==='coast';if(c.map==='coast'&&(v!==drawnView||s.tick!==drawnTick||s.edit!==drawnEdit)){v.update(s,now);drawnView=v;drawnTick=s.tick;drawnEdit=s.edit;}}
  if(now-lastUI<100)return;lastUI=now;
  hud.hidden=hiddenUI(c)||!id;marker.hidden=true;document.body.classList.toggle('coast-machine-active',!hud.hidden);
  if(hud.hidden){screenFrame=null;frameKey='';if(!id||c.map!=='coast')focused=null;return;}
  const cue=id==='rocks'?coastSluiceFeedback(s.rocks):null,t=COAST_TOYS[id];set(q('strong'),t.name);set(q('[data-toy-tip]'),cue?cue.tip:gesture.active?(id==='lighthouse'?'左右にスライドして光を合わせよう':'ポンプを押すと水が流れるよ。花壇をタップで注ぎ先を選べるよ'):t.title);set(q('[data-toy-a]'),t.buttons[0]);set(q('[data-toy-b]'),t.buttons[1]);
  const flow=q('[data-toy-flow]');flow.hidden=!cue;if(cue){flow.querySelector('meter').value=cue.flow;set(flow.querySelector('b'),cue.flowLabel);}
  hud.setAttribute('data-sluice-phase',cue?.phase??'');q('[data-toy-b]').classList.toggle('is-suggested',cue?.phase==='brake');
  hud.classList.toggle('is-gripping',gesture.active);
  q('[data-toy-b]').hidden=id==='garden';q('[data-toy-switch]').hidden=id!=='garden';
  q('[data-toy-a]').title='押している間（PC E）';q('[data-toy-b]').title='押している間（PC Q）';
  const l=s.lighthouse,r=s.rocks,g=s.garden;
  const progress=id==='lighthouse'?l.lit.filter(Boolean).length/3:id==='rocks'?r.done?1:r.hold:(g.beds[0]+g.beds[1])/8;
  q('meter').value=progress;set(q('[data-toy-stars]'),id==='lighthouse'?l.lit.map(x=>x?'★':'☆').join(' '):progress>=1?'★':'☆');
  set(q('[data-toy-value]'),id==='lighthouse'?'光を合わせて止める':id==='rocks'?r.done?'できた！':r.hold>0?'そのまま… '+Math.round(r.hold*100)+'％':'輪の中で、浮きをとめよう':(g.aim?'右の花':'左の花')+'へ '+Math.round(g.beds[g.aim]/4*100)+'％');
  q('[data-toy-undo]').disabled=!s.history.length;
  // Measure only on layout changes, not every animation frame. Keep the
  // mechanism above the controls without changing the chosen orbit distance.
  if(id==='rocks'&&focused==='rocks'&&c.canvas){const key=window.innerWidth+':'+window.innerHeight+':'+q('[data-toy-tip]').textContent;if(key!==frameKey){screenFrame=coastSluiceFrame(c.canvas.getBoundingClientRect(),hud.getBoundingClientRect());frameKey=key;}}else{screenFrame=null;frameKey='';}
  if((!focused||cue?.phase==='brake')&&!gesture.active&&v&&c.camera&&c.canvas){set(marker,cue?.phase==='brake'?'↓ いま、流れを弱めよう':id==='lighthouse'?'↔ つかんで回そう':id==='rocks'?'↕ つかんで上下へ':'👇 ポンプを押そう');const point=(cue?.phase==='brake'&&v.controlPoint?v.controlPoint(id):v.point(id)).project(c.camera),rect=c.canvas.getBoundingClientRect(),base=host.getBoundingClientRect(),x=rect.left-base.left+(point.x+1)*rect.width/2,y=rect.top-base.top+(1-point.y)*rect.height/2;
   if(point.z>=-1&&point.z<=1&&x>110&&x<base.width-110&&y>100&&y<hud.getBoundingClientRect().top-base.top-25){marker.hidden=false;marker.style.transform=`translate(${x}px,${y}px) translate(-50%,-100%)`;}}
 }
 function completed(){return s.lighthouse.lit.filter(Boolean).length+Number(s.rocks.done)+Number(s.garden.done);}
 return{update,focus(){focused=nearestCoastToy(context());},get editFocus(){const c=context();if(!focused||hiddenUI(c)||nearestCoastToy(c)!==focused)return null;const t=COAST_TOYS[focused];return{center:[t.x,focused==='garden'?6:22,t.z+(focused==='garden'?0:30)],radius:focused==='lighthouse'?120:85,label:t.name,screenFrame:focused==='rocks'?screenFrame:null};},get autoSaveKey(){return started?s.edit+':'+Math.floor(s.tick/240):'';},snapshot(){return started?structuredClone(s):undefined;},dispose(){disposed=true;release();gesture.dispose();clearTimeout(timer);hud.remove();marker.remove();held.forEach(h=>h.dispose());window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',release);window.removeEventListener('pagehide',release);document.removeEventListener('visibilitychange',hidden);document.body.classList.remove('coast-machine-active');}};
}
