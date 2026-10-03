export const CONCRETE_SITE=Object.freeze({x:600,z:1450,half:110,entryX:632,entryZ:1575});
export function concreteWorldPreview(search,hostname){
 const p=new URLSearchParams(search);
 if(!['127.0.0.1','localhost'].includes(hostname)||p.get('constructionConcretePreview')!=='1')return false;
 if([...p.keys()].includes('constructionConcreteProfile'))throw Error('施工プロフィール確認と貸出プレビューは併用できません。');
 if([...p.keys()].some(k=>k!=='constructionConcretePreview'&&/Preview|Practice|Test/.test(k)))throw Error('施工確認は他の確認・貸出モードと併用できません。');
 return true;
}
// This route intentionally exists only on the fresh localhost:8925 test
// origin. It exercises the live authority contract without opening the main
// game origin's IndexedDB or importing that origin's legacy localStorage.
export function concreteWorldProfileCheck(search,hostname,port){
 const p=new URLSearchParams(search);
 if(!['127.0.0.1','localhost'].includes(hostname)||port!=='8925'||p.get('constructionConcreteProfile')!=='1')return false;
 return ![...p.keys()].some(k=>k!=='constructionConcreteProfile'&&(/Preview|Practice|Test/.test(k)||k==='constructionConcretePreview'));
}
export function concreteSiteOverlap(position,size){
 if(!Array.isArray(position)||!Array.isArray(size)||![position[0],position[2],size[0],size[2]].every(Number.isFinite)||size[0]<=0||size[2]<=0)return true;
 return Math.abs(position[0]-CONCRETE_SITE.x)<CONCRETE_SITE.half+size[0]/2&&Math.abs(position[2]-CONCRETE_SITE.z)<CONCRETE_SITE.half+size[2]/2;
}
export function concreteEntryAllowed({map,aboard,position,groundY,jumpY}){
 return map==='construction'&&!aboard&&Number.isFinite(groundY)&&Number.isFinite(jumpY)&&Math.abs(groundY+jumpY)<.5&&Number.isFinite(position?.x)&&Number.isFinite(position?.z)&&Math.hypot(position.x-CONCRETE_SITE.entryX,position.z-CONCRETE_SITE.entryZ)<45;
}
