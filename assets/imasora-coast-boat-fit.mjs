import {SEA_PARTS,coastAssembly,coastReadout,coastMountPoint,coastMountRotation,coastMountRange,canCoastMount,worldPoint,localPoint} from './imasora-coast-physics.mjs?v=120nz';

// Geometry facts, not a fabricated speed/stability score. Trial sailing still
// uses the normal buoyancy, mass, inertia, water resistance and oar solver.
export function coastBoatShape(s,id){
 const g=coastAssembly(s,id),deck=g&&s.parts.find(p=>p.type==='board'&&g.ids.has(p.id));if(!deck)return null;
 let loX=Infinity,hiX=-Infinity,loZ=Infinity,hiZ=-Infinity;
 for(const p of s.parts.filter(p=>g.ids.has(p.id))){const [w,h,d]=SEA_PARTS[p.type].size;for(const x of[-w/2,w/2])for(const y of[-h/2,h/2])for(const z of[-d/2,d/2]){const v=localPoint(deck,worldPoint(p,[x,y,z]));loX=Math.min(loX,v[0]);hiX=Math.max(hiX,v[0]);loZ=Math.min(loZ,v[2]);hiZ=Math.max(hiZ,v[2]);}}
 const r=coastReadout(s,deck.id,null,false);
 return{width:hiX-loX,length:hiZ-loZ,mass:g.mass,floats:r.floats,boards:s.parts.filter(p=>p.type==='board'&&g.ids.has(p.id)).length};
}

export function coastMountChoice(parent,type,point,turn=0){
 if(!parent||!point?.every(Number.isFinite))return null;
 const v=localPoint(parent,point);let best=null;
 for(let side=0;side<4;side++){
  const range=coastMountRange(parent,type,side,turn),offset=Math.max(-range,Math.min(range,Math.round(v[side<2?2:0]/2)*2)),p=coastMountPoint(parent,type,side,offset,turn),local=localPoint(parent,p),distance=Math.hypot(local[0]-v[0],local[2]-v[2]);
  if(!best||distance<best.distance)best={side,offset,turn,distance};
 }
 return best;
}

// Pure preview: no serial, history, tick, loan or save mutation. Commit checks
// the same current stock and contacts again; a yellow ghost is never authority.
export function coastMountPreview(s,id,type,fit,{source=null,...options}={}){
 const parent=s.parts.find(p=>p.id===id);if(!parent||!fit)return null;
 const {side,offset=0,turn=0}=fit,point=coastMountPoint(parent,type,side,offset,turn),rotation=coastMountRotation(parent,turn),valid=canCoastMount(s,id,type,side,{...options,source,offset,turn}),before=coastBoatShape(s,id);
 let after=null;
 if(valid){const part={id:source??'fit-preview',type,p:point,q:rotation,v:[0,0,0],w:[0,0,0]},future={...s,edit:s.edit+1,parts:[...s.parts.filter(p=>p.id!==source),part],links:[...s.links,{id:'fit-preview-link',kind:'weld',a:id,b:part.id}]};after=coastBoatShape(future,id);}
 return{part:type,point,rotation,valid,before,after};
}
