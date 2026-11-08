import{huntPermanentToolUseful}from'./imasora-sliding-tag-hunt-sight.mjs';
export const pickupAudience=mode=>mode==='hunt'?'hunters':'player';
// Persistent equipment cannot be collected a second time. Keep the field and
// pickup hints consistent with the simulation without changing anyone's stock.
export function pickupUseful(p,s,view){const type=p?.type;return type!=='radar'&&type!=='mirror'&&type!=='sunglasses'&&type!=='ink'||huntPermanentToolUseful(s,view,type);}
export function pickupEquipmentKey(s,view){return(huntPermanentToolUseful(s,view,'radar')?0:1)|(huntPermanentToolUseful(s,view,'mirror')?0:2)|(huntPermanentToolUseful(s,view,'sunglasses')?0:4)|(huntPermanentToolUseful(s,view,'ink')?0:8);}
export function pickupVisible(p,s,view,range=130){return !!p&&p.audience===pickupAudience(s.config?.mode)&&p.readyAt<=s.time&&Math.hypot(p.x-view.x,p.z-view.z)<range&&pickupUseful(p,s,view);}
export function pickupNameIndices(s,view,{visible=()=>true}={}){
 const candidates=s.pickups.map((p,i)=>({p,i,d:Math.hypot(p.x-view.x,p.z-view.z)})).filter(({p,d})=>pickupVisible(p,s,view)&&d<65).sort((a,b)=>a.d-b.d||a.i-b.i),names=[];
 for(const {p,i}of candidates)if(visible(p)){names.push(i);if(names.length===3)break;}
 return names;
}
