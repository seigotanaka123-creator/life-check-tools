export const pickupAudience=mode=>mode==='hunt'?'hunters':'player';
export function pickupVisible(p,s,view,range=130){return !!p&&p.audience===pickupAudience(s.config?.mode)&&p.readyAt<=s.time&&Math.hypot(p.x-view.x,p.z-view.z)<range;}
export function pickupNameIndices(s,view,{visible=()=>true}={}){
 const candidates=s.pickups.map((p,i)=>({p,i,d:Math.hypot(p.x-view.x,p.z-view.z)})).filter(({p,d})=>pickupVisible(p,s,view)&&d<65).sort((a,b)=>a.d-b.d||a.i-b.i),names=[];
 for(const {p,i}of candidates)if(visible(p)){names.push(i);if(names.length===3)break;}
 return names;
}
