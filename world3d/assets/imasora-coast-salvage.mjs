import {coastHeight,COAST_WATER_Y} from './imasora-coast-layout.mjs?v=120mx';

// One finite discovery, shared by the scenery, contact field and saved bodies.
// Releasing it never awards stock or teleports a crate to the ship.
export const COAST_SALVAGE=Object.freeze({id:'shell-shoal',name:'貝がらの島の沈み箱',x:-370,z:1000});
const box=Object.freeze({id:'salvage-preview-cargo',type:'cargo',p:Object.freeze([-370,-13,1000]),q:Object.freeze([0,0,0,1]),v:Object.freeze([0,0,0]),w:Object.freeze([0,0,0])});
const float=Object.freeze({id:'salvage-preview-float',type:'float',p:Object.freeze([-391.6,-24,1000]),q:Object.freeze([0,0,0,1]),v:Object.freeze([0,0,0]),w:Object.freeze([0,0,0])});
const props=Object.freeze([box,float]),empty=Object.freeze([]);
const anchor=Object.freeze([COAST_SALVAGE.x,coastHeight(COAST_SALVAGE.x,COAST_SALVAGE.z),COAST_SALVAGE.z]);
const solids=Object.freeze([
 {x:box.p[0],z:box.p[2],halfX:13,halfZ:13,minY:box.p[1]-11,maxY:box.p[1]+11,id:'salvage-fixed-box'},
 {x:float.p[0],z:float.p[2],halfX:8,halfZ:27,minY:float.p[1]-8,maxY:float.p[1]+8,id:'salvage-fixed-float'},
 // The little anchored marker remains at the original site after collection.
 {x:-420,z:1000,halfX:7,halfZ:7,minY:COAST_WATER_Y-5,maxY:COAST_WATER_Y+24,id:'salvage-marker'}
]);
const markerSolids=Object.freeze([solids[2]]);
export const coastSalvageProps=s=>s.cargoRetired===1||s.salvage?empty:props;
export const coastSalvageSolids=s=>s.cargoRetired===1?empty:s.salvage?markerSolids:solids;

export function createCoastSalvageTools(P){
 const {SEA_PLAY,SEA_PARTS,ok,coastAssembly,coastReadout,length,sub,worldPoint,newPart,obb,overlap}=P;
 function plan(s,{actor=null,board=null,obstacles=[]}={}){
  if(s.cargoRetired===1)return null;
  const saved=s.salvage,cargo=saved&&s.parts.find(p=>p.id===saved.cargo),point=cargo?.p??box.p;
  if(!actor||Math.hypot(actor.x-point[0],actor.z-point[2])>150||Math.abs(actor.y-point[1])>80)return null;
  const ship=s.parts.find(p=>p.id===board&&p.type==='board'),g=ship&&coastAssembly(s,ship.id);
  const common={cargo:saved?.cargo,point:[...point],board:ship?.id,valid:false,action:null,label:'',message:''};
  if(!saved){
   const full=s.parts.length+2>SEA_PLAY.maxParts||s.links.length+2>SEA_PLAY.maxLinks||s.parts.filter(p=>p.type==='cargo').length>=SEA_PARTS.cargo.limit||s.parts.filter(p=>p.type==='float').length>=SEA_PARTS.float.limit;
   if(full)return {...common,message:'使っていない箱や浮きを道具箱へ返すと、引き揚げられるよ。'};
   const person={p:[actor.x,actor.y+20,actor.z],axes:[[1,0,0],[0,1,0],[0,0,1]],half:[9,19,9]},blocked=props.some(q=>overlap(obb(q),person)||s.parts.some(p=>overlap(obb(p),obb(q))));
   if(blocked)return {...common,message:'箱のすぐ上に船や道具があるよ。少し横へよけよう。'};
   return {...common,valid:true,action:'salvage-find',label:'沈み箱を調べる',message:'片側に浮きが残っている！ 箱を浮かせて、船で持ち帰ろう。'};
  }
  const cg=coastAssembly(s,cargo.id),moored=s.links.some(j=>j.id==='salvage-moor-'+cargo.id),floats=coastReadout(s,cargo.id,null,false).floats;
  if(g?.ids.has(cargo.id))return null;
  if(moored&&floats<2)return {...common,valid:true,action:'float',label:'箱に浮きを足す',message:'片側だけでは傾くよ。空いている側に浮きをもう1こつなごう。'};
  const tow=ship&&s.links.find(j=>j.kind==='rope'&&[j.a,j.b].includes(ship.id)&&[j.a,j.b].includes(cargo.id));
  if(moored&&!tow){
   if(!ship||cg.ids.has(ship.id))return {...common,message:'船を箱のそばへ停めよう。船と箱をロープでつなげるよ。'};
   const stopped=Math.hypot(ship.v[0],ship.v[2])<5&&s.links.some(j=>j.kind==='moor'&&g.ids.has(j.a));
   if(!stopped)return {...common,message:'船を止めて、いかりを下ろそう。それから箱をつなぐよ。'};
   if(s.links.length>=SEA_PLAY.maxLinks||length(sub(ship.p,cargo.p))>140)return {...common,message:'箱へ船を寄せて、使わないロープを片付けよう。'};
   return {...common,valid:true,action:'salvage-tow',label:'船と箱をつなぐ',message:'先に船のロープで支えよう。海底のロープはまだ残るよ。'};
  }
  if(moored&&tow)return {...common,valid:true,action:'salvage-release',label:'海底のロープをほどく',message:'船につながった！ 海底のロープを外すと、箱を運べるよ。'};
  return null; // Ordinary towing/loading controls take over, without a second panel.
 }
 function edit(n,a,options){
  const p=plan(n,{...options,board:a.board});ok(p?.valid&&p.action===a.type,p?.message??'沈み箱のそばで使おう。');
  if(a.type==='salvage-find'){
   const cargo=newPart('cargo','sea-'+n.serial++,box.p,box.q),f=newPart('float','sea-'+n.serial++,float.p,float.q);
   n.parts.push(cargo,f);n.links.push({id:'join-'+f.id,kind:'weld',a:cargo.id,b:f.id});
   n.links.push({id:'salvage-moor-'+cargo.id,kind:'moor',a:cargo.id,anchor:[...anchor],localA:[0,0,0],length:length(sub(cargo.p,anchor))+2});
   n.salvage={version:1,site:COAST_SALVAGE.id,cargo:cargo.id,float:f.id};
  }else if(a.type==='salvage-tow'){
   const b=n.parts.find(q=>q.id===a.board),c=n.parts.find(q=>q.id===n.salvage.cargo),localA=[0,4,0],localB=[0,0,0];
   n.links.push({id:'rope-'+n.serial++,kind:'rope',a:b.id,b:c.id,localA,localB,length:Math.max(10,length(sub(worldPoint(b,localA),c.p))+2)});
  }else n.links=n.links.filter(j=>j.id!=='salvage-moor-'+n.salvage.cargo);
 }
 function validate(f){if(f.salvage===undefined)return;const q=f.salvage;ok(q&&Object.getPrototypeOf(q)===Object.prototype&&Object.keys(q).sort().join('|')==='cargo|float|site|version'&&q.version===1&&q.site===COAST_SALVAGE.id&&q.cargo!==q.float&&q.cargo!=='sea-1'&&f.parts.some(p=>p.id===q.cargo&&p.type==='cargo')&&f.parts.some(p=>p.id===q.float&&p.type==='float'),'海で見つけた部品の記録が違います。');}
 function validMoor(f,j){return f.salvage&&j.id==='salvage-moor-'+f.salvage.cargo&&j.a===f.salvage.cargo&&JSON.stringify(j.anchor)===JSON.stringify(anchor)&&JSON.stringify(j.localA)==='[0,0,0]'&&Math.abs(j.length-(length(sub(box.p,anchor))+2))<1e-7;}
 return {plan,edit,validate,validMoor,edits:new Set(['salvage-find','salvage-tow','salvage-release'])};
}
