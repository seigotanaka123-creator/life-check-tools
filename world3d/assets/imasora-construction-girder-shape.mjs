import{pipeLinksRebar}from'./imasora-construction-pipe-links.mjs?v=120pl';
import{metalFrameRebar}from'./imasora-construction-reel-metal.mjs?v=120pi';
import{pipeRebar}from'./imasora-construction-reel-pipes.mjs?v=120pl';
import{industrialRebar}from'./imasora-construction-reel-furniture.mjs?v=120pl';
// The same visible sections are used for stock, contact and bearing. Game
// balance values are deliberately bounded; these are not engineering ratings.
import{sharedParkingLayouts}from'./imasora-construction-shared-field.mjs?v=120ey';
export const GIRDER_SUPPLY=Object.freeze({x:-1550,y:0,z:-1224});
export function girderSupply(corner,room=null){if(room)return{x:(room.x0+room.x1)/2,y:0,z:room.z1+64<=1770?room.z1+64:room.z0-64};const p=sharedParkingLayouts().find(p=>p.corner===corner)?.facilities.find(p=>p.id==='material-store');return p?{x:p.x,y:0,z:p.z+116}:null;}
export const GIRDER_MATERIALS=Object.freeze({wood:{name:'大型木梁',color:0xd7aa69,overhang:32,strength:1},steel:{name:'鉄骨梁',color:0x70aebd,overhang:64,strength:2.4}});
export const girders=rooms=>rooms.flatMap(r=>(r.structure?.items??[]).filter(i=>i.kind==='girder').map(i=>({room:r,item:i})));
export function girderTarget(r,i){const a=r.structure?.items.find(p=>p.id===i.a),b=r.structure?.items.find(p=>p.id===i.b);if(!a||!b)return null;return{x:(a.x+b.x)/2,y:(r.y??0)+3+a.height,z:(a.z+b.z)/2,length:Math.hypot(a.x-b.x,a.z-b.z)+8,axis:a.x===b.x?'z':'x'};}
export const girderWood=(r,i)=>i.material==='wood'?(girderTarget(r,i)?.length??0)*192:0;
export const girderRebar=(r,i)=>i.material==='steel'?Math.ceil((girderTarget(r,i)?.length??0)/40):0;
import{walkwayRebar}from'./imasora-construction-reel-stairs.mjs?v=120pi';
export const rebarUsed=c=>metalFrameRebar(c?.reel?.rooms)+pipeLinksRebar(c?.reel?.rooms??[])+pipeRebar(c?.reel?.rooms)+industrialRebar(c?.reel?.rooms)+walkwayRebar(c?.reel?.rooms)+girders(c?.reel?.rooms??[]).reduce((n,{room:r,item:i})=>n+girderRebar(r,i),0);
export const rebarLeft=world=>(world.constructionPackTrialLedger?.quantities.auxiliaryUnits.rebar??0)-rebarUsed(world.constructionHighBuild);
export function girderProblem(r,i){const fields=i.stage==='carried'?'a|b|corner|id|kind|material|partId|stage':'a|b|corner|id|kind|material|stage';if(Object.keys(i).sort().join('|')!==fields||!girderSupply(i.corner)||!Object.hasOwn(GIRDER_MATERIALS,i.material)||!['ready','carried','installed'].includes(i.stage)||!Number.isInteger(i.a)||!Number.isInteger(i.b)||i.a===i.b||i.stage==='carried'&&!/^structural-kit-[\w-]{8,90}$/.test(i.partId))return'梁の材料と運び先をたしかめよう。';const a=r.structure?.items.find(p=>p.id===i.a),b=r.structure?.items.find(p=>p.id===i.b),p=girderTarget(r,i);return a?.kind!=='column'||b?.kind!=='column'||a.height!==b.height||a.x!==b.x&&a.z!==b.z||!p||p.length<40||p.length>240?'同じ高さで並ぶ柱を2本えらぼう。大型梁は5〜30マスをつなげるよ。':'';}
export function girderSections(material,length){return material==='steel'?[{x:0,y:1,z:0,w:length,h:2,d:12},{x:0,y:8,z:0,w:length,h:12,d:2},{x:0,y:15,z:0,w:length,h:2,d:12}]:[{x:0,y:8,z:0,w:length,h:16,d:12}];}
export function girderParts(r,i,{target=false}={}){if(i.stage==='carried'&&!target)return[];const p=girderTarget(r,i);if(!p)return[];const at=target||i.stage==='installed'?p:girderSupply(i.corner,r),axis=target||i.stage==='installed'?p.axis:'x';return girderSections(i.material,p.length).map((b,n)=>({id:r.id,detailId:i.id,key:'detail-'+i.id+'-girder-'+n,kind:'beam',girder:true,girderLength:p.length,structuralMaterial:i.material,installed:i.stage==='installed'||target,x:at.x,y:at.y+b.y,z:at.z,w:axis==='x'?b.w:b.d,h:b.h,d:axis==='x'?b.d:b.w}));}
export function girderFloorSupported(r,rooms){for(const {room,item}of girders(rooms)){if(item.stage!=='installed')continue;const p=girderTarget(room,item);if(Math.abs(p.y+16-r.y)>.001)continue;const overhang=GIRDER_MATERIALS[item.material].overhang;const within=p.axis==='x'?r.x0>=p.x-p.length/2-.001&&r.x1<=p.x+p.length/2+.001&&Math.max(Math.abs(r.z0-p.z),Math.abs(r.z1-p.z))<=6+overhang:r.z0>=p.z-p.length/2-.001&&r.z1<=p.z+p.length/2+.001&&Math.max(Math.abs(r.x0-p.x),Math.abs(r.x1-p.x))<=6+overhang;if(within)return true;}return false;}
