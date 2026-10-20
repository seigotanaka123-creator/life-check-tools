import {freeWorkMask,freeFilledMask,freePartCount} from './free-work-parts.mjs';
import {freeFrameBoards} from './free-build-state.mjs?v=120gn';

export const DESIGN_HEIGHT_NAMES=Object.freeze({2:'低めの床',4:'段差・縁どり',8:'花壇・低い壁'});
// A design contains geometry instructions only. It never carries stock or paint.
export function designFromWork(work) {
 if(!work||!Array.isArray(work.fill)||work.fill.length!==16||work.fill.some(q=>!Number.isInteger(q)||q<0||q>16))throw Error('この作品の形を読み取れないよ。');
 const mask=freeWorkMask(work);
 if(!Number.isInteger(mask)||mask<0||mask>65535||mask&~freeFilledMask(work))throw Error('作品の置かれている形をたしかめてね。');
 if(!mask)throw Error('保管中の作品だよ。現場に置くと、この形を使えるよ。');
 const heights=work.fill.filter((q,i)=>mask&(1<<i)).map(q=>q/2),height=heights[0];
 if(!Object.hasOwn(DESIGN_HEIGHT_NAMES,height)||heights.some(h=>h!==height))throw Error('高さがまちまちの作品は、今はこのノートで使えないよ。');
 const cells=freePartCount(mask);
 return Object.freeze({mask,height,cells,boards:freeFrameBoards(mask),cups:cells*height/2});
}
export function designBookEntries(works) {
 if(!Array.isArray(works)||works.length>16)throw Error('作品のセーブをたしかめてね。');
 return works.map((work,index)=>{try{return{index,plan:designFromWork(work),issue:''};}catch(e){return{index,plan:null,issue:e.message};}});
}
export function designReuseProblem(f,foundation) {
 if(!['design','complete'].includes(f?.stage))return '今の型枠の作業を終えてから、次の形をえらぼう。';
 if(f.aboard)return '車を降りてから、つくる形をえらぼう。';
 if(foundation)return '土台の上では、土台の形に合わせて高さをえらぼう。';
 return '';
}
