import {coastPierContains} from './imasora-coast-layout.mjs?v=120mx';
import {COAST_PULL_REACH} from './imasora-coast-shore-access.mjs?v=120mx';
import {islandPathSurface} from './imasora-coast-island-path.mjs?v=120li';
import {coastOarsForTurns,seaFloor,coastAssembly,coastSupport,rotate,SEA_PARTS,loadDeck,localPoint,worldPoint,COAST_HELM_MARGIN,coastCrewSeats,coastCrewAvailable,coastBodyPartContact} from './imasora-coast-physics.mjs?v=120nz';
import {coastHeight,coastWalkingHeight,COAST_WATER_Y} from './imasora-coast-layout.mjs?v=120mx';

export function coastBoatInWater(play,id){
 const p=play.parts.find(p=>p.id===id);
 if(!p||p.type!=='board'||seaFloor(p.p[0],p.p[2])>=COAST_WATER_Y-4)return false;
 // A board bridging an opening is a footbridge, not a floating helm.
 if(p.id===play.islandBoard?.id&&p.p[1]>COAST_WATER_Y+5)return false;
 if(Math.abs(p.p[0]+510)<100&&Math.abs(p.p[2]-1230)<110)for(const x of[-32,32])for(const z of[-27,27]){const q=worldPoint(p,[x,-3,z]),floor=islandPathSurface(q[0],q[2]);if(Number.isFinite(floor)&&Math.abs(q[1]-floor)<3)return false;}return true;
}
export function coastRaftAground(play,id){
 if(coastBoatInWater(play,id))return false;
 const board=play.parts.find(p=>p.id===id&&p.type==='board'),group=board&&coastAssembly(play,id);
 // A dry construction plank is still a walking surface, not a beached boat.
 return !!group&&play.parts.filter(p=>p.type==='float'&&group.ids.has(p.id)).length>=2;
}
// Include the feet's approach to the edge: the world's step probe reaches a
// low plank before the character root does. Both actual endpoints still need
// real support, so this cannot create a floor across an unbridged opening.
export function coastIslandStep(play,from,to,groundY){
 const p=play.islandBoard&&play.parts.find(p=>p.id===play.islandBoard.id);
 if(!p||rotate(p.q,[0,1,0])[1]<.98)return false;
 const height=q=>Math.max(islandPathSurface(q.x,q.z),coastSupport(play,q.x,q.z)?.y??-Infinity),shore=islandPathSurface(from.x,from.z),a=Math.abs(shore-groundY)<.6?shore:height(from),b=height(to);
 if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a-groundY)>.6||Math.abs(b-a)>6.5)return false;
 const top=worldPoint(p,[0,3,0])[1];if(Math.abs(top-groundY)>6.5)return false;
 return [from,to].some(q=>{const v=localPoint(p,[q.x,top,q.z]);return Math.abs(v[0])<=44&&Math.abs(v[2])<=39;});
}
export function coastCanHelm(play,id,actor){
 const board=play.parts.find(p=>p.id===id&&p.type==='board');if(!board||!actor)return false;
 const p=localPoint(board,[actor.x,actor.y,actor.z]),size=SEA_PARTS.board.size;
 const crew=play.crew,seat=crew?.board===id&&coastCrewSeats(play,id).find(s=>s.id===crew.seat);
 if(crew&&(!seat||seat.id!=='helm'||rotate(board.q,[0,1,0])[1]<.2||Math.hypot(...p.map((v,i)=>v-seat.point[i]))>.75))return false;
 // A selected, body-checked side seat may sit outside the free walking helm
 // margin. It still has to be on the actual deck, at that exact saved seat.
 const margin=seat?0:COAST_HELM_MARGIN;
 if(Math.abs(p[0])>size[0]/2-margin||Math.abs(p[2])>size[2]/2-margin)return false;
 return pilotSpaceClear(play,board,seat?.point??[0,3,0]);
}
// The chosen seat, rather than the centre of the raft, owns its real body
// space. Preserve the old central pilot's checks for boats without a seat.
function pilotSpaceClear(play,board,point){
 const inverse=[-board.q[0],-board.q[1],-board.q[2],board.q[3]];
 for(const part of play.parts){if(part===board)continue;const c=localPoint(board,part.p),half=SEA_PARTS[part.type].size.map(n=>n/2);c[0]-=point[0];c[2]-=point[2];if(Math.hypot(c[0],c[2])>Math.hypot(...half)+25||c[1]+Math.hypot(...half)<3.1)continue;
  const axes=[[1,0,0],[0,1,0],[0,0,1]].map(a=>rotate(inverse,rotate(part.q,a))),e=[0,1,2].map(i=>axes.reduce((n,a,j)=>n+Math.abs(a[i])*half[j],0));
  if(Math.abs(c[0])<e[0]+13&&Math.abs(c[2])<e[2]+12&&c[1]+e[1]>3.1&&c[1]-e[1]<30)return false;
 }return true;
}

// Reopen an explicitly saved driver/passenger at that same seat. This is a
// read-only attachment check; neither a nearby walker nor a swimmer qualifies.
export function coastSavedCrew(play,actor){
 const crew=play.crew;
 if(actor?.map!=='coast'||actor.airborne||!crew||play.sailing?.phase==='capsized')return null;
 const board=play.parts.find(p=>p.id===crew.board&&p.type==='board'),seat=board&&coastCrewSeats(play,board.id).find(s=>s.id===crew.seat);
 if(!seat||![actor.x,actor.y,actor.z].every(Number.isFinite)||!coastCrewAvailable(play,board.id)||rotate(board.q,[0,1,0])[1]<.2)return null;
 const at=worldPoint(board,seat.point);
 const shifted=Math.hypot(actor.x-at[0],actor.y-at[1],actor.z-at[2])>.75;
 // Only an explicitly recorded crew member at an exact former cargo seat
 // may move inward. Nearby walkers, swimmers and airborne saves never snap.
 if(shifted){
  if(play.cargoRetired!==1)return null;
  const former=[[Math.sign(seat.point[0])*29,3,0],[seat.point[0],3,-20]];
  if(!former.some(p=>{const q=worldPoint(board,p);return Math.hypot(actor.x-q[0],actor.y-q[1],actor.z-q[2])<=.75;}))return null;
 }
 if(!pilotSpaceClear(play,board,seat.point))return null;
 const forward=rotate(board.q,[0,0,1]);return{id:board.id,seat:seat.id,point:at,yaw:Math.atan2(forward[0],forward[2]),...(shifted?{reposition:true}:{})};
}

// A seated pilot is attached to the hull, unlike someone walking on a floor.
// Reopening a rolling boat must not depend on the horizontal walking support.
// Only the saved centre of its own live helm qualifies; this never boards a
// nearby boat, moves it, or pulls a swimmer/crew member onto the deck.
export function coastSavedPilot(play,actor){
 const voyage=play.sailing;
 if(actor?.map!=='coast'||actor.airborne||play.crew||voyage?.phase!=='sailing')return null;
 const board=play.parts.find(p=>p.id===voyage.board&&p.type==='board');
 if(!board||![actor.x,actor.y,actor.z].every(Number.isFinite)||!coastBoatInWater(play,board.id))return null;
 const at=worldPoint(board,[0,3,0]);
 if(Math.hypot(actor.x-at[0],actor.y-at[1],actor.z-at[2])>.75||!coastCanHelm(play,board.id,actor))return null;
 const forward=rotate(board.q,[0,0,1]);
 return{id:board.id,point:at,yaw:Math.atan2(forward[0],forward[2])};
}

// A saved walker is already standing on this real deck. Preserve walking;
// proximity to a helm is not a request to sit or start steering after a load.
export function coastSavedDeck(play,actor){
 if(actor?.map!=='coast'||actor.airborne||play.crew||play.sailing?.phase==='capsized'||![actor.x,actor.y,actor.z].every(Number.isFinite))return null;
 const floor=coastSupport(play,actor.x,actor.z,actor.y);
 if(!floor||Math.abs(floor.y-actor.y)>.001||!coastCrewAvailable(play,floor.id))return null;
 const board=play.parts.find(p=>p.id===floor.id),forward=rotate(board.q,[0,0,1]),heading=actor.heading??Math.atan2(forward[0],forward[2]),footprint=actor.footprint??{offsetX:-.6,offsetZ:1.26,halfX:13,halfZ:12.05,minY:.1,maxY:26.9};
 if(play.parts.some(p=>p!==board&&coastBodyPartContact(p,footprint,actor,heading)?.intersects))return null;
 return{id:board.id,point:[actor.x,floor.y,actor.z],yaw:Math.atan2(forward[0],forward[2]),walking:true};
}
export function coastCargoFloatParent(play,id){
 const board=play.parts.find(p=>p.id===id&&p.type==='board'),g=coastAssembly(play,id);if(!board||!g)return id;
 const floats=play.parts.filter(p=>p.type==='float'&&g.ids.has(p.id)).map(p=>({id:p.id,x:localPoint(board,p.p)[0]}));
 const left=floats.filter(p=>p.x<0),right=floats.filter(p=>p.x>=0),side=left.length<=right.length?left:right;
 // Recommend the less-supported side. The player still chooses an actual
 // valid socket; no float is granted or connected automatically.
 return side.sort((a,b)=>Math.abs(b.x)-Math.abs(a.x))[0]?.id??board.id;
}

// This is a placement preview, never an automatic attachment or free part.
// Lengthen the support at opposite ends as well as across the hull. A player
// can still move/rotate the preview or use the ordinary free-building tools.
export function coastCargoFloatFit(play,id){
 const board=play.parts.find(p=>p.id===id&&p.type==='board'),parent=play.parts.find(p=>p.id===coastCargoFloatParent(play,id));
 if(!board||parent?.type!=='float')return null;
 const forward=rotate(board.q,[0,0,1]),pf=rotate(parent.q,[0,0,1]);if(forward.reduce((n,v,i)=>n+v*pf[i],0)<.999)return null;
 const at=localPoint(board,parent.p),sign=Math.sign(at[0]);if(!sign)return null;
 return{parent:parent.id,side:sign<0?0:1,offset:sign*22-at[2],turn:0};
}

// Natural sand is continuous. Raised decks/rocks still use normal step tests.
export function coastTerrainStep(from,to){
 const distance=Math.hypot(to.x-from.x,to.z-from.z);
 if(distance<1e-8)return false;
 const supported=p=>Math.abs(p.y-coastWalkingHeight(p.x,p.z))<.24||(coastPierContains(p.x,p.z)&&Math.abs(p.y)<.24);
 return supported(from)&&supported(to)&&Math.abs(to.y-from.y)<=distance*.55+.001;
}

// Stick axes are boat-relative: forward/reverse and differential oars.
// Camera motion never changes the heading or imparts a force.
export function coastSteeringOars(input={}, turns=[]){
 const buttons=coastOarsForTurns(turns);
 if(buttons.brake)return buttons;
 const axis=n=>Number.isFinite(n)?Math.max(-1,Math.min(1,n)):0;
 if(turns.some(t=>t==='left'||t==='right'))return buttons;
 const x=axis(input.x),y=turns.includes('both')?1:axis(input.y);
 const magnitude=Math.hypot(x,y);
 if(magnitude<=.12)return{left:0,right:0};
 // Ease out of the stick's quiet centre. Keep digital/full-edge commands
 // intact, while allowing the small strokes used to approach a moving shore.
 const ramp=Math.min(1,(magnitude-.12)/.12),gain=ramp*ramp*(3-2*ramp);
 const left=(y-x)*gain,right=(y+x)*gain,scale=Math.max(1,Math.abs(left),Math.abs(right));
 return{left:left/scale,right:right/scale};
}

export function coastNearbyPart(play,actor,selected=null){
 const distance=p=>Math.hypot(p.p[0]-actor.x,p.p[2]-actor.z);
 const reachable=p=>distance(p)<=COAST_PULL_REACH&&Math.abs(p.p[1]-(actor.y??0))<65;
 const current=play.parts.find(p=>p.id===selected);
 if(current&&reachable(current))return current;
 return play.parts.filter(reachable).sort((a,b)=>distance(a)-distance(b))[0]??null;
}

// Describe the next real preparation step, without changing parts or loans.
// The existing placement/commit handlers still check contact and stock.
export function coastCargoStep(play,id){
 if(play.cargoRetired===1)return null;
 const group=coastAssembly(play,id);if(!group)return null;
 const board=play.parts.find(p=>p.type==='board'&&group.ids.has(p.id));
 if(!board||!coastBoatInWater(play,board.id))return null;
 const floats=play.parts.filter(p=>p.type==='float'&&group.ids.has(p.id)).length;
 const cargo=play.parts.find(p=>p.type==='cargo'&&group.ids.has(p.id)&&play.links.some(j=>j.id.startsWith('cargo-strap-')&&[j.a,j.b].includes(p.id)));
 const trip=play.voyage,active=trip&&!trip.done&&group.ids.has(trip.board);
 if(active)return{board:board.id,floats,loaded:true,action:null,label:'',text:'配達中：① → ② → ③',stage:2};
 // Cargo lessons belong to the home harbor. Exploring an island must not
 // replace the landing hint with an unrelated four-float delivery task.
 if(board.p[2]>950)return null;
 if(floats<4)return{board:board.id,floats,loaded:!!cargo,action:'float',label:'浮きを足す',text:'浮きを前後にも長くつなごう。4つになったら、箱をのせよう',stage:0};
 if(cargo)return{board:board.id,floats,loaded:true,action:'voyage',label:trip?.done?'もう一度届ける':'配達をはじめる',text:'準備できた！ 旗のコースを出そう',stage:2};
 const loose=play.parts.find(p=>p.type==='cargo'&&!play.links.some(j=>j.kind==='weld'&&[j.a,j.b].includes(p.id))&&loadDeck(play,p)?.id===board.id);
 if(loose)return{board:board.id,cargo:loose.id,floats,loaded:false,action:'secure',label:'箱をしばる',text:'箱をベルトでしばると、一緒に運べるよ',stage:1};
 const available=SEA_PARTS.cargo.limit-play.parts.filter(p=>p.type==='cargo').length;
 return{board:board.id,floats,loaded:false,action:available>0?'load':null,label:'箱をのせる',text:available>0?'中央の見本を見て、箱をのせよう':'借りた箱を使っているよ。箱を戻すと、ここにのせられるよ',stage:1};
}

// Reuse the actual edit handlers. This is a field toolbar, not a second editor
// or a shortcut that bypasses inventory, contact, undo or save validation.
export function createCoastDirectHUD({dock,host,onWalk,onLook,onDismiss=()=>{},onCargo=()=>{},onAnchor=()=>{},icon}){
 dock.classList.add('sea-direct-dock','sea-adventure-dock');
 let workspaceActive=false,dialogOpen=false,editingNow=false,visibleNow=false,dialogsTagged=false;
 function workspace({active=workspaceActive,dialog=dialogOpen}={}){
  workspaceActive=active;dialogOpen=dialog;
  // The full chart owns its modal layout. Treating it as a work shelf resized
  // the WebGL buffer underneath it whenever it opened or closed.
  if(active!==dialogsTagged){for(const d of document.querySelectorAll('.sea-toybox,.coast-pouch,.coast-return-dialog,.world-player-menu'))d.classList.toggle('sea-adventure-dialog',active);dialogsTagged=active;}
  const hasDialog=active&&(dialog||!!document.querySelector('.sea-adventure-dialog[open]:not(.coast-atlas)')),reserved=active&&(hasDialog||visibleNow&&(editingNow||!more.hidden));
  host.classList.toggle('sea-adventure-has-dialog',hasDialog);host.classList.toggle('sea-adventure-active',active);host.classList.toggle('sea-adventure-reserved',reserved);dock.classList.toggle('is-workbench',reserved);
 }
 const q=s=>dock.querySelector(s),make=(name,label)=>{const b=document.createElement('button');b.type='button';b.dataset[name]='';b.textContent=label;return b;};
 const bar=document.createElement('div');bar.className='sea-direct-bar';
 const primary=document.createElement('div');primary.className='sea-direct-primary';
 const more=document.createElement('div');more.className='sea-direct-more';more.hidden=true;
 const walk=make('seaDeckWalk','船の上を歩く'),expand=make('seaMore','道具棚'),look=make('seaLook','船の前を見る');
 const anchor=make('seaAnchor','⚓ いかりを下ろす');anchor.onclick=onAnchor;primary.append(anchor);
 walk.onclick=onWalk;look.onclick=onLook;expand.onclick=()=>{more.hidden=!more.hidden;expand.setAttribute('aria-expanded',String(!more.hidden));workspace();};
 expand.setAttribute('aria-expanded','false');expand.setAttribute('aria-controls','sea-direct-more');more.id='sea-direct-more';
 const icons={grab:['✋','つかんで引く'],float:[icon('float'),'浮きをつける'],board:[icon('board'),'板をつなぐ'],undo:['↶','1つ前へ'],rope:['➰','ロープ'],detach:['✂','はずす'],kit:['🧰','道具を借りる'],help:['？','あそび方']};
 for(const[name,[art,label]]of Object.entries(icons)){const b=q('[data-sea-act="'+name+'"]');b.innerHTML='<i aria-hidden="true">'+art+'</i><span>'+label+'</span>';b.setAttribute('aria-label',label);( ['grab','float','board','undo'].includes(name)?primary:more).append(b);}
 const push=make('seaPush','押す（長押し）');primary.append(push);
 primary.append(walk,expand);more.append(look);
 more.append(q('[data-sea-recover]'));
 const launch=q('[data-sea-cast-off]');launch.textContent='出発する';primary.prepend(launch);
 bar.append(primary,more);dock.append(bar);const close=make('fieldClose','海へ戻る ✕');close.className='sea-field-close';dock.prepend(close);close.onclick=()=>{more.hidden=true;editingNow=false;onDismiss();workspace();};
 const hint=document.createElement('div');hint.className='sea-direct-hint';hint.setAttribute('role','status');
 hint.innerHTML='<b aria-hidden="true">🌊</b><span></span><meter min="0" max="30" aria-label="いかだの速さ"></meter>';
 dock.prepend(hint);
 const marker=document.createElement('div');marker.className='sea-direct-marker';marker.hidden=true;marker.setAttribute('aria-hidden','true');marker.innerHTML='<span>✋</span><i></i>';host.append(marker);
 const paddle=q('.sea-helm');paddle.classList.add('sea-direct-helm');host.append(paddle);
 const paddleForward=paddle.querySelector('[data-oar="both"]');paddleForward.innerHTML='<b aria-hidden="true">⏶</b><span>こぐ</span>';
 let lastHint='',lastGrab=null,disposed=false;
 function update({crewFocused=false,crewRole=null,crewWalking=false,rider,aboard=!!rider,aground=false,walking,boarding=false,moored,anchored=false,shoreTied=false,nearShore=false,gangway=false,grab,selected,waterBoard=false,mounting,detaching,placement,bookOpen=false,guiding=false,bookHint='',rope,blocked,speed=0,note='',cargo=null}){
  if(disposed)return;
  push.hidden=aboard||!selected||!!grab;
  const editing=mounting||detaching||!!placement||bookOpen;editingNow=editing;
  dock.classList.toggle('is-direct-editing',editing);dock.classList.toggle('is-direct-riding',!!rider);dock.classList.toggle('is-deck-walking',walking);
  primary.hidden=editing;more.hidden=editing||more.hidden;
  look.textContent=crewFocused?'見回す':'船の前を見る';walk.hidden=look.hidden=!rider;anchor.hidden=!rider||editing||moored&&!anchored;anchor.disabled=blocked;anchor.textContent=anchored?(shoreTied?'ロープをほどく':'⚓ いかりを上げる'):nearShore?'岸につなぐ':'⚓ いかりを下ろす';const walkLabel=crewRole||crewWalking?'甲板に立つ':walking?'こぐ操作へ':'船の上を歩く';if(walk.textContent!==walkLabel)walk.textContent=walkLabel;
  for(const name of['grab','float','board'])q('[data-sea-act="'+name+'"]').hidden=aboard;
  const grabButton=q('[data-sea-act="grab"]');if(lastGrab!==!!grab||!grabButton.firstElementChild){lastGrab=!!grab;grabButton.innerHTML=grab?'<i aria-hidden="true">🖐</i><span>はなす</span>':'<i aria-hidden="true">✋</i><span>つかんで引く</span>';grabButton.setAttribute('aria-label',grab?'はなす':'つかんで引く');}
  const undo=q('[data-sea-act="undo"]');if(aboard){undo.disabled=true;undo.title='船を降りると、組み立てを1つ前へ戻せるよ';}else undo.title='組み立てを10回前まで戻せるよ';
  // On board, construction is optional and still directly available.
  for(const name of['float','board']){const b=q('[data-sea-act="'+name+'"]');if(b.parentElement!==more)more.prepend(b);b.hidden=false;}
  let text=editing?(mounting?'つなぐ辺をタップ → 見本をずらして決めよう':detaching?'はずすつなぎ目をタップ':'黄色い見本の場所に置く'):rider?(walking?(gangway?'渡り板を歩いて、岸と船を行き来できるよ':'船の上を歩けるよ'):anchored?(gangway?'渡り板で岸へ ·「船の上を歩く」':'停泊中 · 船の上を歩けるよ'):moored?'出発：パッドを前へ / W':'パッドで操船 · 下へ引くとバック'):grab?'✋ 引いているよ':rope?'つなぐ相手をタップ':gangway?'渡り板を歩いて、船に乗ろう':selected?.type==='board'?(waterBoard?'ジャンプで乗って、そのまま操船':'✋ つかんで引く'):selected?'✋ つかんで引く':'';
  if(crewRole==='mate'&&!editing)text='助手席：操船はお休み · 立つと甲板で作業';
  if(boarding&&!editing)text='船の中央へ歩こう';
  if(aground&&!editing)text='水が浅いよ。岸へ降りて、いかだを沖へ押そう';
  if(bookHint&&!rider&&!editing&&!grab&&!rope)text=bookHint;
  if(note)text=note;
  if(text!==lastHint){lastHint=text;hint.querySelector('span').textContent=text;}
  hint.querySelector('meter').hidden=!rider||walking;hint.querySelector('meter').value=Math.min(30,speed);
  launch.hidden=!rider||!moored||anchored||editing||walking||boarding;walk.disabled=blocked;launch.disabled=blocked;
  undo.hidden=aboard;look.hidden=!rider;hint.hidden=!note&&!grab&&!editing&&!boarding&&!aground;
  expand.setAttribute('aria-expanded',String(!more.hidden));workspace();
 }
 function show({visible,helm}){visibleNow=visible;dock.hidden=!visible;paddle.hidden=!helm;marker.hidden=true;document.body.classList.toggle('coast-direct-helm',!!helm);if(!visible){more.hidden=true;expand.setAttribute('aria-expanded','false');}workspace();}
 function mark(point,text){marker.hidden=!point;if(point){marker.style.transform='translate('+point.x+'px,'+point.y+'px)';marker.firstElementChild.textContent=text;}}
 return{paddle,push,update,show,mark,workspace,openMore(){more.hidden=false;workspace();},closeMore(){more.hidden=true;workspace();},dispose(){disposed=true;workspace({active:false,dialog:false});marker.remove();paddle.remove();document.body.classList.remove('coast-direct-helm');}};
}

