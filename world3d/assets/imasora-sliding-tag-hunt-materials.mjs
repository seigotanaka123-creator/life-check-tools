// Capture the character's own translucency before any gameplay effect. These
// materials belong to one cached actor; scenery and held props are untouched.
export function createHuntMaterialState(materials){
 const base=[...new Set(materials)].map(material=>({material,transparent:material.transparent,opacity:material.opacity}));
 let cloaked=false,writes=0,transitions=0;
 function apply(hidden){for(const row of base){const m=row.material,t=hidden?true:row.transparent,o=hidden?Math.min(row.opacity,.32):row.opacity;if(m.transparent!==t){m.transparent=t;m.needsUpdate=true;writes++;}if(m.opacity!==o){m.opacity=o;writes++;}}}
 return{setCloaked(value){value=!!value;if(value===cloaked)return false;apply(value);cloaked=value;transitions++;return true;},reset(){apply(false);cloaked=false;},stats:()=>({materials:base.length,writes,transitions,cloaked})};
}
