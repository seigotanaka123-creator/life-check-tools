import {freeFramePanels} from './free-build-state.mjs';
import {frameWorkBoxes} from './free-frame-workspace.mjs';
import {RAISED_BASE_MAX} from './free-supported-build.mjs';

// A bounded blueprint is separate from material-consuming project history.
// It never supplies stock, rewards, a vehicle pose or a character pose.
const fail=()=>{throw Error('保存した作業台の形を確認できません。元の保存を保持します。');};
const plain=o=>o&&Object.getPrototypeOf(o)===Object.prototype;
const exact=(o,keys)=>{if(!plain(o)||Object.keys(o).sort().join('|')!==keys.slice().sort().join('|'))fail();};
const num=(n,min,max)=>{if(!Number.isFinite(n)||n<min||n>max)fail();};
const list=(a,max,check,min=0)=>{if(!Array.isArray(a)||a.length<min||a.length>max)fail();a.forEach(check);};
const point=p=>{if(!plain(p)||!Object.keys(p).every(k=>['x','y','z','heading'].includes(k))||!['x','z'].every(k=>k in p))fail();num(p.x,-512,512);num(p.z,-512,512);if('y'in p)num(p.y,-.15,20);if('heading'in p)num(p.heading,-Math.PI*2,Math.PI*2);};
const stair=s=>{exact(s,['x','z','y','halfX','halfZ']);point({x:s.x,y:s.y,z:s.z});num(s.halfX,1,20);num(s.halfZ,1,20);};
const leg=p=>{exact(p,['x','z','y','base']);point({x:p.x,y:p.y,z:p.z});num(p.base,-.15,p.y-.04);};
const panel=p=>{exact(p,['id','x','z','width','depth']);if(typeof p.id!=='string'||!/^[vh]:[0-4]:[0-4]$/.test(p.id))fail();num(p.x,-40,40);num(p.z,-40,40);num(p.width,.1,16);num(p.depth,.1,16);};
const rect=p=>{exact(p,['x','z','width','depth']);num(p.x,-512,512);num(p.z,-512,512);num(p.width,1,512);num(p.depth,1,512);};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function scaffold(p,fixed=false){
 exact(p,fixed?['kind','height','thickness','pieces','stairs','legs','panels','entry','path','direction','primaryStairs']:['height','thickness','stairs','path','ground','entry','legs','panels','direction']);
 num(p.height,.1,20);num(p.thickness,.01,.6);if(![-1,1].includes(p.direction))fail();
 list(p.stairs,32,stair,1);list(p.legs,4096,leg,1);list(p.panels,40,panel,1);point(p.entry);num(p.entry.y,-.15,p.height);list(p.path,512,point,1);
 if(fixed){if(p.kind!=='fixed-frame-work')fail();list(p.pieces,2048,rect,1);list(p.primaryStairs,32,stair,1);if(p.primaryStairs.some(s=>!p.stairs.some(t=>equal(s,t))))fail();}
 else list(p.ground,2048,point,1);
 if(p.path.some(q=>!Number.isFinite(q.y)||Math.abs(q.y-p.height)>1e-7)||p.stairs.some(s=>s.y>p.height+1e-7)||p.legs.some(l=>l.y>p.height+1e-7))fail();
}
export function platformMatchesProject(record,p){
 const f=p?.freeBuild,a=record?.anchor;
 return !!(f?.location&&a&&a.profileId===p.profileId&&equal(a.location,f.location)&&a.foundation===JSON.stringify(p.foundation??null));
}
export function assertWorkPlatformRecord(record,p){
 if(record===null)return null;
 exact(record,['version','anchor','plan','choices']);if(record.version!==1)fail();
 const a=record.anchor;exact(a,['profileId','location','mask','height','baseY','foundation']);
 if(typeof a.profileId!=='string'||!/^[a-f0-9]{8}$/.test(a.profileId)||typeof a.foundation!=='string'||a.foundation.length>10000)fail();
 exact(a.location,['x','z']);num(a.location.x,-2580,2580);num(a.location.z,-1680,1680);
 if(!Number.isInteger(a.mask)||a.mask<1||a.mask>65535||![2,4,8].includes(a.height))fail();num(a.baseY,0,RAISED_BASE_MAX);
 if(!platformMatchesProject(record,p))throw Error('別の施工場所・土台の作業台は使えません。');
 const plan=record.plan;scaffold(plan,true);if(Math.abs(plan.height-(a.baseY+.8))>1e-7)fail();
 const panels=freeFramePanels(a.mask),byId=new Map(panels.map(q=>[q.id,q]));
 const panelCheck=q=>{const expected=byId.get(q.id);if(!expected||!equal(expected,q))fail();};
 plan.panels.forEach(panelCheck);if(plan.panels.length!==panels.length||new Set(plan.panels.map(q=>q.id)).size!==panels.length)fail();
 // The side deck must remain open above every concrete cell it was built for.
 const boxes=frameWorkBoxes({mask:a.mask,completed:[]});
 for(const piece of plan.pieces)for(const b of boxes)if(Math.abs(piece.x-b.x)<piece.width/2+b.hx-1e-7&&Math.abs(piece.z-b.z)<piece.depth/2+b.hz-1e-7)fail();
 list(record.choices,40,c=>{exact(c,['id','stance','target','useTool','scaffold']);if(!byId.has(c.id)||typeof c.useTool!=='boolean')fail();point(c.stance);point(c.target);num(c.target.y,-.15,20);if(c.stance.y!==plan.height)fail();scaffold(c.scaffold);c.scaffold.panels.forEach(panelCheck);if(c.scaffold.height!==plan.height||c.scaffold.stairs.some(s=>!plan.stairs.some(t=>equal(s,t))))fail();},1);
 if(record.choices.length!==panels.length||new Set(record.choices.map(c=>c.id)).size!==panels.length)fail();
 if(JSON.stringify(record).length>1000000)fail();
 return record;
}
export function createWorkPlatformRecord(reference,plan,choices,p){
 if(!plan)return null;
 const cleanPoint=q=>Object.fromEntries(['x','y','z','heading'].filter(k=>q[k]!==undefined).map(k=>[k,q[k]]));
 const cleanPlan=q=>({...q,entry:cleanPoint(q.entry),path:q.path.map(cleanPoint),...(q.ground?{ground:q.ground.map(cleanPoint)}:{})});
 // JSON breaks shared geometry references and strips Three.Vector3 prototypes.
 const record=JSON.parse(JSON.stringify({version:1,anchor:{profileId:p.profileId,location:reference.location,mask:reference.mask,height:reference.height,baseY:reference.baseY??0,foundation:JSON.stringify(p.foundation??null)},plan:cleanPlan(plan),choices:[...choices].map(([id,c])=>({id,stance:cleanPoint(c.stance),target:cleanPoint(c.target),useTool:!!c.useTool,scaffold:cleanPlan(c.scaffold)}))}));
 assertWorkPlatformRecord(record,p);return record;
}
