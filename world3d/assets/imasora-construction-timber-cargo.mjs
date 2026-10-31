// A new warehouse output. Existing floor receipts keep their old meaning.
export const BEAM_ISSUE='issue-beams-v1';
export const BEAM_BUNDLE=Object.freeze({materialId:'mars-timber',w:28,h:12,d:80,x:0,z:16,color:0xaa80bd});
export function beamTemplate(id){return{...BEAM_BUNDLE,id,name:`火星木材・角材4本の束 ${id.split('-').at(-1)}`};}
export const isBeamBundle=p=>!!p&&typeof p.id==='string'&&p.w===28&&p.h===12&&p.d===80&&p.materialId==='mars-timber'&&p.name===beamTemplate(p.id).name;

// The existing carriage is 56 x 84. A 28 x 80 bundle fits lengthways;
// an 80 x 56 board fits sideways. Both are one equal-volume timber receipt.
export const receivingCargo=p=>!!p&&(p.w===80&&p.d===56&&p.h===6||isBeamBundle(p));
export const receivingCargoAligned=(p,turn)=>receivingCargo(p)&&Number.isFinite(p.angle)&&Math.abs(isBeamBundle(p)?Math.sin(p.angle-turn*Math.PI/2):Math.cos(p.angle-turn*Math.PI/2))<1e-7;
export const receivingCargoName=p=>isBeamBundle(p)?'角材の束':'床板';

export const BEAM_UNPACK='unpack-beams-v1';
