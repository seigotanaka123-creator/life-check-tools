import{huntOpticalHidden}from'./imasora-sliding-tag-hunt-sight.mjs';
// Rendering only: a cloak must not advertise an opponent through an opaque
// held prop. The controlled actor keeps a faint body for steering; contact,
// item effects, CPU perception, decoys and public world objects are untouched.
export function huntActorConcealed(s,actor){
 const viewer=s.config?.mode==='hunt'?s.hunters[0]:s.player;
 return huntOpticalHidden(s,viewer,actor);
}
export function applyHuntActorVisibility(s,actor,model,shadow){
 const cloaked=(actor.effects?.cloak??0)>s.time,concealed=huntActorConcealed(s,actor);
 model.root.visible=!concealed;
 const viewer=s.config?.mode==='hunt'?s.hunters[0]:s.player;model.materialState.setCloaked(cloaked&&actor.owner===viewer.owner);
 shadow.visible=!concealed&&(!cloaked||actor.owner!==viewer.owner);
}
