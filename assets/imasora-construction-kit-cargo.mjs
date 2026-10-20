// Building kits already belong to the building's reserved materials. They are
// crane cargo, never another purchase receipt or a source of warehouse timber.
const ok=(v,m)=>{if(!v)throw Error(m);};
export const isKitCargo=p=>!!p&&typeof p.id==='string'&&p.id.startsWith('building-kit-');
export function validateKitBinding(b){ok(b&&Object.keys(b).sort().join('|')==='level|partId|projectId|scale|version'&&b.version===1&&/^building-kit-[\w-]{8,96}$/.test(b.partId)&&/^building-[1-9][0-9]*$/.test(b.projectId)&&Number.isInteger(b.level)&&b.level>=1&&b.level<=6&&[1,2].includes(b.scale),'建築キットの行き先をたしかめよう。');return b;}
export function kitTemplate(b){validateKitBinding(b);return{id:b.partId,materialId:'mars-timber',name:'建物 '+b.projectId.slice(9)+'・'+b.level+'階の建築キット',w:28*b.scale,h:6,d:20*b.scale,color:0xc99a61};}
// Repack the existing four 28*scale x 3 x 10*scale components without
// shrinking a piece or overlapping their volumes to pass the lifting guides.
export function kitPieceBoxes(scale){return[1.5,4.5].flatMap(y=>[-5,5].map(z=>({x:0,y,z:z*scale,w:28*scale,h:3,d:10*scale})));}
export const ownedTimberParts=s=>s.parts.filter(p=>!isKitCargo(p));
export function kitPad(work,source=false){const scale=work.blueprint?.interiorStairs?2:1;return source?{x:-94*scale,y:10,z:85*scale,w:40*scale,d:25*scale}:{x:-91*scale,y:work.levels*40,z:56*scale,w:38*scale,d:36*scale};}
export function kitOnPad(p,site,work,origin,source=false){const pad=kitPad(work,source),a=site.turn*Math.PI/2,c=Math.round(Math.cos(a)),s=Math.round(Math.sin(a)),dx=origin.x+p.x-site.x,dz=origin.z+p.z-site.z,x=dx*c-dz*s,z=dx*s+dz*c;
 const angle=p.angle-a,swap=Math.abs(Math.sin(angle))>.5,w=swap?p.d:p.w,d=swap?p.w:p.d;
 return Math.abs(Math.sin(angle))<1e-6&&Math.abs(p.y-site.y-pad.y)<.01&&Math.abs(x-pad.x)+w/2<=pad.w/2+.001&&Math.abs(z-pad.z)+d/2<=pad.d/2+.001;
}
export function kitHandlingGeometry(w){if(w.kitModelVersion!==1)return{boxes:[],surfaces:[]};const scale=w.blueprint?.interiorStairs?2:1,height=(w.blueprint?.storeys?.length??w.blueprint?.floors??3)*40,pad=kitPad(w);
 const boxes=[-110,-72].map(x=>({kind:'kit-lift-guide',x:x*scale,y:(height+10)/2,z:72*scale,w:2*scale,h:height+14,d:2*scale}));
 if(w.kit&&!w.craneKit&&!w.job){const at=kitPad(w,w.kit==='made');boxes.push({kind:'kit-repacked-material',x:at.x,y:at.y+3,z:at.z,w:28*scale,h:6,d:20*scale});}
 return{boxes,surfaces:w.craneKit?[pad]:[]};
}
