// Optional state belongs to the existing finite timber save, never a second stock.
export function validateBoardLiftState(w){
 if(w.boardLifts===undefined){if(w.highCargoVersion!==undefined&&(w.highCargoVersion!==1||w.source?.mode!=='world'))throw Error('荷物リフトの記録をたしかめよう。');return true;}
 const s=w.boardLifts;if(w.highCargoVersion!==1||w.source?.mode!=='world'||s?.version!==1||Object.keys(s).sort().join('|')!=='sites|version'||!Array.isArray(s.sites)||!s.sites.length||s.sites.length>8)throw Error('荷物リフトの記録を保護したよ。');
 const ids=new Set(),parts=new Set();for(const r of s.sites){if(Object.keys(r).sort().join('|')!=='height|partId|projectId'||!/^building-[1-9][0-9]*$/.test(r.projectId)||ids.has(r.projectId)||!Number.isFinite(r.height)||r.height<0||r.height>200||r.partId!==null&&(typeof r.partId!=='string'||parts.has(r.partId)))throw Error('リフトの場所をたしかめよう。');ids.add(r.projectId);if(r.partId!==null){parts.add(r.partId);const p=w.parts.find(p=>p.id===r.partId);if(!p||!p.fixed||p.hover||p.carrierId||p.id===w.held||p.vx||p.vy||p.vz)throw Error('リフトにのせた床板を保護したよ。');}}
 return true;
}
export const liftState=(w,id)=>w?.boardLifts?.sites.find(s=>s.projectId===id)??{projectId:id,height:0,partId:null};
export function putLiftState(w,r){const sites=[...(w.boardLifts?.sites??[]).filter(s=>s.projectId!==r.projectId),...(r.height===0&&r.partId===null?[]:[r])].sort((a,b)=>a.projectId.localeCompare(b.projectId)),n={...w,highCargoVersion:1};if(sites.length)n.boardLifts={version:1,sites};else delete n.boardLifts;return n;}
export function releaseLiftCargo(w){if(!w.boardLifts||!w.held)return w;for(const r of w.boardLifts.sites)if(r.partId===w.held)w=putLiftState(w,{...r,partId:null});return w;}
