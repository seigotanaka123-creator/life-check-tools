// Four actor slots, not an ever-growing roster cache. Duplicate characters need
// independent instances so their poses and equipment cannot move each other.
export function createHuntModelCache({create,release,reset}){
 const slots=Array(4).fill(null);let created=0,reused=0,released=0;
 return{reconcile(specs){if(!Array.isArray(specs)||specs.length!==4||specs.some(s=>typeof s?.key!=='string'||!s.key))throw Error('INVALID_ACTOR_RENDER_SPECS');
  for(let i=0;i<4;i++){const spec=specs[i],old=slots[i];if(old?.key===spec.key){reused++;reset(old.model,spec);continue;}
   // Build first: if creation fails, the old slot still owns its valid model.
   const model=create(spec);created++;if(old){release(old.model);released++;}slots[i]={key:spec.key,model};reset(model,spec);
  }return slots.map(s=>s.model);},dispose(){for(let i=0;i<4;i++)if(slots[i]){release(slots[i].model);released++;slots[i]=null;}},stats:()=>({live:slots.filter(Boolean).length,created,reused,released})};
}
const disposed=new WeakSet();
export function resetHuntModel(actor,spec){actor.action.reset();actor.gait.reset();actor.inkFeet?.reset();actor.sunglasses?.reset();actor.dizzy?.reset();actor.controlled=spec.controlled;actor.root.rotation.set(0,0,0);actor.root.visible=true;if(actor.materialState)actor.materialState.reset();else for(const material of actor.materials){material.transparent=false;material.opacity=1;}}
// Only owned actor resources go here; shared field/prop resources stay alive.
export function disposeHuntModel(actor){const root=actor?.root;if(!root||disposed.has(root))return;disposed.add(root);const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){materials.add(m);if(m.map)textures.add(m.map);}});root.removeFromParent();for(const g of geometries)g.dispose();for(const t of textures)t.dispose();for(const m of materials)m.dispose();}
