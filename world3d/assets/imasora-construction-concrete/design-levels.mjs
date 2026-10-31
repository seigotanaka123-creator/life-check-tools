import {groundLayout} from './ground-grid.mjs?v=120hb';
// Heights are design instructions. Actual concrete remains in quarter-cups.
export function levelDesign(levels){
 if(!Array.isArray(levels)||levels.length!==16||Object.keys(levels).length!==16||Array.from({length:16},(_,i)=>levels[i]).some(h=>![0,2,4,8].includes(h))||!levels.some(Boolean))throw Error('16マスの高さを、低め・段差・低い壁からえらぼう。');
 return{mask:levels.reduce((m,h,i)=>h?m|(1<<i):m,0),height:Math.max(...levels),levels:[...levels]};
}
export function designLevels(d){
 if(d?.levels){const q=levelDesign(d.levels);if(q.mask!==d.mask||q.height!==d.height)throw Error('形と高さをえらび直そう。');return q.levels;}
 if(!Number.isInteger(d?.mask)||d.mask<1||d.mask>65535||![2,4,8].includes(d.height))throw Error('形と高さをえらび直そう。');
 return Array.from({length:16},(_,i)=>d.mask&(1<<i)?d.height:0);
}
export function designGeometry(d){const levels=designLevels(d),mixed=levels.some(h=>h&&h!==d.height);return{mask:d.mask,height:d.height,...(mixed?{levels}:{} ),...(d.layout?{layout:groundLayout(d.mask,d.layout)}:{})};}
export function sameDesign(a,b){if(a.mask!==b.mask||a.height!==b.height||JSON.stringify(a.layout??null)!==JSON.stringify(b.layout??null))return false;const x=designLevels(a),y=designLevels(b);return x.every((h,i)=>h===y[i]);}
export function assignDesignLevels(f,levels){const d=levelDesign(levels);f.mask=d.mask;f.height=d.height;if(d.levels.some(h=>h&&h!==d.height))f.pourTargets=d.levels.map(h=>h*2);else delete f.pourTargets;return f;}
export const freePourLimit=(f,cell)=>f.pourTargets?.[cell]??f.height*2;
export const designHeightLabel=d=>d.levels?'高さを組み合わせた形':({2:'低めの床',4:'段差・縁どり',8:'花壇・低い壁'})[d.height];
