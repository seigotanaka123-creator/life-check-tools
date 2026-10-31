// Two separate low, floor-seated positions on the original raft deck.
// The markings are paint, not free timber, a new hull, or extra buoyancy.
export const COAST_CREW_SEATS=Object.freeze([
 Object.freeze({id:'helm',name:'操縦席',point:Object.freeze([-16,3,0])}),
 Object.freeze({id:'mate',name:'助手席',point:Object.freeze([16,3,0])})
]);
export function createCoastCrewTools(P){
 const {SEA_PIER_SOLIDS,coastVoyageSolids,coastHarborSolids,coastSalvageSolids,loadDeck,worldPoint,localPoint,rotate,coastAssembly,coastReadout,coastSupport,coastIsLoadingRamp,obb,overlap,obstacleBox,seaFloor,COAST_WATER_Y}=P;
 const find=(s,id)=>s.parts.find(p=>p.id===id),seat=id=>COAST_CREW_SEATS.find(p=>p.id===id),ok=(v,m)=>{if(!v)throw Error(m);};
 function seats(s,id){
  if(s.cargoRetired===1)return COAST_CREW_SEATS;
  const g=coastAssembly(s,id),b=find(s,id);let loaded=false,centered=false;
  if(g)for(const p of s.parts)if(p.type==='cargo'&&(g.ids.has(p.id)||g.ids.has(loadDeck(s,p)?.id))){loaded=true;const at=localPoint(b,p.p);if(Math.abs(at[0])<.5&&Math.abs(at[2])<2)centered=true;}
  // Keep two separate seats beside a new central crate. The old forward-load
  // layout retains its rear seats, so reopening never relocates an old pilot.
  return !loaded?COAST_CREW_SEATS:COAST_CREW_SEATS.map(p=>({...p,point:centered?[Math.sign(p.point[0])*29,3,0]:[p.point[0],3,-20]}));
 }
 function available(s,id){const b=find(s,id);return b?.type==='board'&&!coastIsLoadingRamp(s,id)&&coastReadout(s,id,null,false).floats>=2&&seaFloor(b.p[0],b.p[2])<COAST_WATER_Y-4;}
 function clear(s,board,point,{obstacles=[],canCarry=()=>true,footprint=null}={}){
  const at=worldPoint(board,point),f=rotate(board.q,[0,0,1]),heading=Math.atan2(f[0],f[2]),fp=footprint??{offsetX:-.6,offsetZ:1.26,halfX:13,halfZ:12.05,minY:.1,maxY:26.9},person={p:worldPoint(board,[point[0]+fp.offsetX,point[1]+(fp.minY+fp.maxY)/2,point[2]+fp.offsetZ]),half:[fp.halfX,(fp.maxY-fp.minY)/2,fp.halfZ],axes:[[1,0,0],[0,1,0],[0,0,1]].map(a=>rotate(board.q,a))};
  person.extent=[0,1,2].map(i=>person.half.reduce((sum,h,j)=>sum+h*Math.abs(person.axes[j][i]),0));
  if(!canCarry(...at,heading))return false;
  const support=coastSupport(s,at[0],at[2],at[1]);if(!support||!coastAssembly(s,board.id).ids.has(support.id)||Math.abs(support.y-at[1])>.4)return false;
  return !s.parts.some(p=>p!==board&&overlap(person,obb(p)))&&![...SEA_PIER_SOLIDS,...coastVoyageSolids(s),...coastHarborSolids(s),...coastSalvageSolids(s),...obstacles].some(o=>overlap(person,obstacleBox(o)));
 }
 function plan(s,id,role,{actor=null,riderId=null,...options}={}){
  const board=find(s,id),station=seats(s,id).find(p=>p.id===role),bad=message=>({valid:false,message,board:id,seat:role});
  if(!station||!actor||!available(s,id)||!coastAssembly(s,id).ids.has(riderId))return bad('船に乗ってから、座る席を選ぼう。');
  const atSeat=worldPoint(board,station.point),alreadyThere=Math.hypot(actor.x-atSeat[0],actor.y-atSeat[1],actor.z-atSeat[2])<.75;
  // Waves can tilt the deck during the walk. Finishing at a clear, supported
  // seat must not reject the walker just as they are safely about to sit.
  if(Math.hypot(board.v[0],board.v[2])>8||coastReadout(s,id,null,false).tilt>(alreadyThere?35:15))return bad('船を止めて、揺れがおさまってから座ろう。');
  const start=localPoint(board,[actor.x,actor.y,actor.z]);if(Math.abs(start[1]-3)>1.5)return bad('甲板に足をつけてから座ろう。');
  const goal=[...station.point],paths=[[start,goal],[start,[start[0],3,-20],goal],[start,[goal[0],3,start[2]],goal]];
  if(Math.abs(goal[0])>26)for(const z of[-27,27])paths.push([start,[start[0],3,z],[goal[0],3,z],goal]);
  for(const path of paths){let valid=true;for(let i=1;i<path.length&&valid;i++){const a=path[i-1],b=path[i],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[2]-a[2])/.75));for(let n=0;n<=steps;n++){const t=n/steps;if(!clear(s,board,[a[0]+(b[0]-a[0])*t,3,a[2]+(b[2]-a[2])*t],options)){valid=false;break;}}}if(valid)return {valid:true,board:id,seat:role,path:path.map(p=>[p[0],3,p[2]]),point:worldPoint(board,goal),message:station.name+'へ歩いて、座るよ。'};}
  return bad('席までの道がふさがっているよ。部品をよけて、青と黄色の席へ歩こう。');
 }
 function validate(s){if(s.crew===undefined)return;const c=s.crew;ok(c&&Object.keys(c).sort().join('|')==='board|seat'&&seat(c.seat)&&find(s,c.board)?.type==='board'&&!coastIsLoadingRamp(s,c.board),'船の座席の記録が違います。');}
 function edit(s,a,options){if(a.type==='crew-leave'){delete s.crew;return;}const p=plan(s,a.board,a.seat,options);ok(p.valid,p.message);ok(Math.hypot(options.actor.x-p.point[0],options.actor.y-p.point[1],options.actor.z-p.point[2])<1,'席のしるしまで歩いてから座ろう。');s.crew={board:a.board,seat:a.seat};}
 return{plan,validate,edit,available,clear,seats};
}
