// Water-only, bounded operation differences. Never rewind a walker, a vehicle,
// warehouse receipts, another tool's terrain or the world save.
const clone=structuredClone,eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const check=(v,m='水をもどす記録が一致しません。')=>{if(!v)throw Error(m);};
const fields=['source','load','water','pools','builds'];
const object=v=>v&&Object.getPrototypeOf(v)===Object.prototype;
const waterFields=['reservoir','cells','directions','running','feeding','gate'];
export function waterEditState(w){return{source:w.source,load:w.load,water:Object.fromEntries(waterFields.map(k=>[k,clone(w.water[k])])),pools:clone(w.pools??{}),builds:Object.fromEntries((w.waterBuilds??[]).map(b=>[b.id,clone(b)]))};}
export function applyWaterEdit(w,p){return compose(w,p,true);}
function compose(w,p,copy){check(object(p)&&Object.keys(p).sort().join(',')==='builds,load,pools,source,water'&&object(p.water)&&Object.keys(p.water).sort().join(',')===[...waterFields].sort().join(',')&&object(p.pools)&&object(p.builds));const take=v=>copy?clone(v):v,n={...w,source:p.source,load:p.load,water:{...w.water,...take(p.water)}};if(w.loader.vehicle.field){n.pools=take(p.pools);n.waterBuilds=Object.values(take(p.builds));}else check(!Object.keys(p.builds).length&&!Object.keys(p.pools).length);return n;}
function diff(a,b,path=[],out=[]){
 if(eq(a,b))return out;
 if(object(a)&&object(b)){for(const key of new Set([...Object.keys(a),...Object.keys(b)])){
  check(!['__proto__','constructor','prototype'].includes(key));
  if(!(key in a)||!(key in b))out.push({path:[...path,key],before:key in a?[clone(a[key])]:[],after:key in b?[clone(b[key])]:[]});
  else diff(a[key],b[key],[...path,key],out);
 }}else out.push({path,before:[clone(a)],after:[clone(b)]});return out;
}
function apply(p,changes,backward,owned=false){const n=owned?p:clone(p),seen={children:new Map(),leaf:false};
 for(const c of changes){check(object(c)&&Object.keys(c).sort().join(',')==='after,before,path'&&Array.isArray(c.path)&&c.path.length>=1&&c.path.length<=8&&fields.includes(c.path[0]));
  check(c.path.every(k=>typeof k==='string'&&k.length<100&&!['__proto__','constructor','prototype'].includes(k)));
  let node=seen;for(const key of c.path){check(!node.leaf);if(!node.children.has(key))node.children.set(key,{children:new Map(),leaf:false});node=node.children.get(key);}check(!node.leaf&&!node.children.size);node.leaf=true;
  check([c.before,c.after].every(v=>Array.isArray(v)&&v.length<=1));let o=n;for(const k of c.path.slice(0,-1)){check(object(o[k]));o=o[k];}
  const k=c.path.at(-1),from=backward?c.after:c.before,to=backward?c.before:c.after;check(eq(k in o?[o[k]]:[],from));if(to.length)o[k]=clone(to[0]);else delete o[k];
 }return n;
}
const total=p=>p.source+p.load+p.water.reservoir+Object.values(p.water.cells).reduce((n,v)=>n+v.q,0)+Object.values(p.pools).reduce((n,v)=>n+v.q,0)+Object.values(p.builds).reduce((n,v)=>n+v.q,0);
export function beginWaterEdit(s,label){
 check(!s.undoWater?.pending,'水の作業が終わってから押そう。');
 return{...s,undoWater:{version:1,steps:s.undoWater?.steps??[],pending:{label,before:waterEditState(s.work)}}};
}
export function finishWaterEdit(s){
 const h=s.undoWater;if(!h?.pending||s.work.task||s.work.air.length||s.delivery)return s;
 const after=waterEditState(s.work),changes=diff(h.pending.before,after),steps=changes.length?[...h.steps,{label:h.pending.label,changes}].slice(-10):h.steps;
 return{...s,undoWater:{version:1,steps,pending:null}};
}
export function breakWaterEdits(s){return s.undoWater?{...s,undoWater:{version:1,steps:[],pending:null}}:s;}
export const waterEditInfo=s=>({count:s.undoWater?.steps.length??0,label:s.undoWater?.steps.at(-1)?.label??'',pending:!!s.undoWater?.pending});
export function undoWaterEdit(s,allowed=()=>true){
 const h=s.undoWater;check(h?.steps.length&&!h.pending,'もどせる水の作業はまだないよ。');
 check(!s.work.task&&!s.work.air.length&&!s.delivery&&!s.work.loader.transition&&Math.abs(s.work.loader.vehicle.speed)<.8,'水の移送を終えて停車しよう。');
 const step=h.steps.at(-1),before=waterEditState(s.work),p=apply(before,step.changes,true);check(total(before)===total(p));
 const w=applyWaterEdit(s.work,p);check(allowed(w),'水をもどす場所に車や材料があるよ。場所を空けてから押そう。');
 return{...s,revision:s.revision+1,work:{...w,revision:w.revision+1,message:step.label+'前にもどしたよ。'},undoWater:{version:1,steps:h.steps.slice(0,-1),pending:null}};
}
export function validateWaterEdits(s,validateRest){
 const h=s.undoWater;if(h===undefined)return;
 check(object(h)&&Object.keys(h).sort().join(',')==='pending,steps,version'&&h.version===1&&Array.isArray(h.steps)&&h.steps.length<=10);
 check(h.pending===null||object(h.pending));
 check(JSON.stringify(h).length<=1500000,'水の作業記録が大きすぎます。');
 if(h.pending)check(object(h.pending)&&Object.keys(h.pending).sort().join(',')==='before,label'&&typeof h.pending.label==='string'&&h.pending.label.length>0&&h.pending.label.length<48);
 let p=h.pending?clone(h.pending.before):waterEditState(s.work);check(object(p)&&Object.keys(p).sort().join(',')==='builds,load,pools,source,water');
 // Old idle water has no history; avoid scanning a large pond on every frame.
 if(h.pending||h.steps.length)validateRest(compose({...s.work,task:null,air:[]},p,false));
 for(const step of [...h.steps].reverse()){
  check(object(step)&&Object.keys(step).sort().join(',')==='changes,label'&&typeof step.label==='string'&&step.label.length>0&&step.label.length<48&&Array.isArray(step.changes)&&step.changes.length>0&&step.changes.length<=10000);
  const old=total(p);p=apply(p,step.changes,true,true);check(total(p)===old);validateRest(compose({...s.work,task:null,air:[]},p,false));
 }
}
