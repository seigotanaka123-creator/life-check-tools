// A new warehouse output. Existing floor receipts keep their old meaning.
export const BEAM_ISSUE='issue-beams-v1';
export const BEAM_BUNDLE=Object.freeze({materialId:'mars-timber',w:28,h:12,d:80,x:0,z:16,color:0xaa80bd});
export function beamTemplate(id){return{...BEAM_BUNDLE,id,name:`火星木材・角材4本の束 ${id.split('-').at(-1)}`};}
export const isBeamBundle=p=>!!p&&typeof p.id==='string'&&p.w===28&&p.h===12&&p.d===80&&p.materialId==='mars-timber'&&p.name===beamTemplate(p.id).name;
