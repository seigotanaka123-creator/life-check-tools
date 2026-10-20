import{stairConflictsBay}from'./imasora-construction-stair-placement.mjs?v=120gn';
// Original blueprints and v1 retrofits keep their geometry, costs and timings.
export const BOARD_BAY_RETROFIT_TIMBER=6720;
export const boardBayRetrofitJobs=new Set(['BAY_BRACE','BAY_OPEN','BAY_CLOSE','BAY_UNBRACE']);
export const boardBayRetrofits=(s,value=s?.boardBayRetrofit)=>!value?[]:value.version===1?[{level:0,phase:value.phase}]:value.floors??[];
export const boardBayRetrofitAt=(s,level=0)=>boardBayRetrofits(s).find(f=>f.level===level)?.phase;
export const boardBayNative=(s,level)=>level===0?s?.blueprint?.boardBay===true:level===1&&s?.blueprint?.upperBoardBay===true;
export const boardBayLevels=s=>[...new Set([...(s?.blueprint?.boardBay?[0]:[]),...(s?.blueprint?.upperBoardBay?[1]:[]),...boardBayRetrofits(s).filter(f=>f.phase==='open').map(f=>f.level)])].sort((a,b)=>a-b);
export const hasBoardBay=s=>boardBayLevels(s).length>0;
export function boardBayRetrofitEligible(s,level=0,modern=false,tall=false){return !stairConflictsBay(s)&&s?.version===5&&s.levels===s.blueprint.storeys.length&&!s.kit&&(tall?Number.isInteger(level)&&level>=0&&level<6:[0,1].includes(level))&&level<s.levels&&!boardBayNative(s,level)&&(modern||!s.blueprint.boardBay&&!(s.blueprint.walls?.[0]??[]).some(w=>w.side==='front'&&[14,15].includes(w.cell)));}
const wallDoorInBay=(s,level)=>(s.roomLayout?.items??[]).some(i=>i.kind==='wallDoor'&&i.floor===level&&i.wall.side==='front'&&[14,15].includes(i.wall.cell));
export function validateBoardBayRetrofit(s,value=s.boardBayRetrofit){
 if(value===undefined||value===null)return true;
 const old=value.version===1,entries=boardBayRetrofits(s,value),keys=Object.keys(value).sort().join('|');
 if(!(old?keys==='phase|version':[2,3].includes(value.version)&&keys==='floors|version'&&Array.isArray(value.floors)&&value.floors.length>=1&&value.floors.length<=(value.version===3?6:2)))throw Error('搬入口の記録をたしかめよう。元の建物は残したよ。');
 let previous=-1;for(const entry of entries){if(!old&&Object.keys(entry).sort().join('|')!=='level|phase'||!boardBayRetrofitEligible(s,entry.level,!old,value.version===3)||!['braced','open'].includes(entry.phase)||entry.level<=previous)throw Error('搬入口の補強をたしかめよう。元の建物はそのまま残したよ。');if(!old&&entry.phase==='open'&&wallDoorInBay(s,entry.level))throw Error('搬入口につけたとびらを先に片付けよう。');previous=entry.level;}
 return true;
}
export function boardBayRetiredPart(s,p){
 const level=Math.floor(p.y/40),phase=boardBayRetrofitAt(s,level);if(!phase)return false;
 return p.kind==='beam'&&p.w>p.d&&p.x>0||phase==='open'&&(p.kind==='column'&&p.x===32&&p.z>-64||s.boardBayRetrofit.version>=2&&p.kind==='wall'&&p.z===64&&p.x>0);
}
export const boardBayBraceParts=s=>boardBayRetrofits(s).flatMap(f=>boardBayStructure([],f.level+1));
const woodFor=(entries,tall)=>{const highest=Math.max(0,...entries.map(f=>f.level));return BOARD_BAY_RETROFIT_TIMBER*(entries.reduce((n,f)=>n+(tall?f.level+1:f.level?2:1),0)+(tall&&highest>=2?highest+1:0));};
export function boardBayRetrofitWood(s){if(s?.job?.type==='BAY_BRACE'&&!boardBayRetrofitAt(s,s.job.bayLevel??0)){const next=boardBayRetrofitAfter(s,'BAY_BRACE');return woodFor(boardBayRetrofits(null,next),next?.version===3);}return woodFor(boardBayRetrofits(s),s?.boardBayRetrofit?.version===3);}
export function boardBayRetrofitAfter(s,type,level=s.job?.bayLevel??0){
 const phase=type==='BAY_OPEN'?'open':type==='BAY_UNBRACE'?null:'braced';
 if(!Object.hasOwn(s.job??{},'bayLevel'))return phase?{version:1,phase}:null;
 const floors=boardBayRetrofits(s).filter(f=>f.level!==level).map(f=>({...f}));if(phase)floors.push({level,phase});floors.sort((a,b)=>a.level-b.level);return floors.length?{version:s.job?.bayVersion===3||s.boardBayRetrofit?.version===3?3:2,floors}:null;
}
export function boardBayRetrofitStep(a,b){
 const left=boardBayRetrofits(null,a),right=boardBayRetrofits(null,b),changes=Array.from({length:6},(_,i)=>i).map(level=>[left.find(f=>f.level===level)?.phase??'none',right.find(f=>f.level===level)?.phase??'none']).filter(([x,y])=>x!==y);
 return changes.length===1&&['none:braced','braced:open','open:braced','braced:none'].includes(changes[0].join(':'));
}
export function boardBayUndoReady(s){const old=s?.history?.at(-1);return !!old&&old.levels===s.levels&&old.kit===s.kit&&JSON.stringify(old.boardBayRetrofit??null)!==JSON.stringify(s.boardBayRetrofit??null)&&(s.actor.y===0||s.actor.y>0&&s.actor.y<=200&&s.actor.y%40===0&&s.actor.z===112&&[32,96].includes(s.actor.x));}
export function boardBayRetrofitPlan(s,type){
 const modern=Object.hasOwn(s.job??{},'bayLevel'),level=modern?s.job.bayLevel:0,phase=boardBayRetrofitAt(s,level),valid=type==='BAY_BRACE'?!phase:type==='BAY_OPEN'?phase==='braced':type==='BAY_CLOSE'?phase==='open':type==='BAY_UNBRACE'?phase==='braced':false;
 if(!boardBayRetrofitEligible(s,level,modern,s.job?.bayVersion===3)||!valid||!modern&&s.boardBayRetrofit?.version>=2||s.actor.y!==0&&!modern||s.roomWalkVersion)throw Error('改造する階をえらび、補強から順に進めよう。');
 if(modern&&['BAY_BRACE','BAY_OPEN'].includes(type)&&wallDoorInBay(s,level))throw Error('搬入口につけたとびらを先に片付けよう。');
 const x=type==='BAY_BRACE'||type==='BAY_UNBRACE'?96:32,y=level*40,end={x,y,z:level?112:104,heading:Math.atan2(32-x,-40)},route=[s.actor,{x:s.actor.x,y:0,z:248,heading:0},{x,y:0,z:248,heading:0},end],target=type==='BAY_BRACE'||type==='BAY_UNBRACE'?{x:66,y:y+37,z:64}:{x:32,y:y+18,z:66.5};
 return{route,work:type==='BAY_BRACE'?3:2,end,target,label:(modern?(level+1)+'階の':'')+{BAY_BRACE:level?'梁と受取台を補強する':'搬入口の梁を補強する',BAY_OPEN:'大きな板の搬入口をひらく',BAY_CLOSE:'搬入口の壁・柱をもどす',BAY_UNBRACE:'搬入口の補強を片付ける'}[type]};
}
export const BOARD_BAY=Object.freeze({x:32,inside:24,outside:204,width:56,depth:80,speed:40});
export function boardBayDecks(s){return boardBayLevels(s).map(level=>({kind:'bay-bed',x:32,y:level*40,z:114,w:56,d:260}));}
export function boardBaySupports(s){const top=s?.boardBayRetrofit?.version===3?Math.max(s.blueprint.upperBoardBay?1:0,...boardBayRetrofits(s).map(f=>f.level)):s?.blueprint?.upperBoardBay||boardBayRetrofitAt(s,1)?1:0;if(!top)return[];return[80,152,240].flatMap(z=>[...[0,64].map(x=>({kind:'bay-post',x,y:top*20-1,z,w:4,h:top*40-2,d:4})),...Array.from({length:top},(_,i)=>({kind:'bay-crossbeam',x:32,y:(i+1)*40-3,z,w:68,h:4,d:4}))]);}
export const BOARD_LIFT=Object.freeze({x:32,z:308,speed:30,maxHeight:200,w:56,d:80});
export const boardLiftHeight=s=>s?.boardBayRetrofit?.version===3?Math.max(0,...boardBayRetrofits(s).map(f=>f.level))*40:0;
export const boardLiftInstalled=s=>boardLiftHeight(s)>=80;
export function boardLiftStructure(s){const h=boardLiftHeight(s);return h<80?[]:[...[0,64].flatMap(x=>[352].map(z=>({kind:'lift-guide',x,y:h/2+6,z,w:4,h:h+12,d:4}))),...[352].map(z=>({kind:'lift-header',x:32,y:h+10,z,w:68,h:4,d:4}))];}
export function boardLiftBridges(s){return boardLiftInstalled(s)?boardBayLevels(s).filter(l=>l>=2).map(l=>({kind:'lift-bridge',x:32,y:l*40,z:256,w:56,d:24})):[];}
export function boardBayStructure(parts,level){
 const out=parts.filter(p=>!(p.kind==='column'&&p.x===32&&p.z>-64)&&!(p.kind==='beam'&&p.w>p.d&&p.x>0));
 for(const z of[-64,-32,0,32])out.push({kind:'beam',x:32,y:level*40-3,z,w:64,h:4,d:6});
 out.push({kind:'beam',x:32,y:level*40-4,z:64,w:64,h:6,d:8});return out;
}
