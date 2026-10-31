import {groundHeight,groundLayout,trimGroundLayout} from './ground-grid.mjs?v=120hb';
import {foundationDesignProblem} from './design-footprint.mjs?v=120hb';
import {designGeometry} from './design-levels.mjs?v=120hb';
import {freeWorkMask,freeFilledMask,freePartCount} from './free-work-parts.mjs?v=120hb';
import {freeFrameBoards} from './free-build-state.mjs?v=120pv';

export const DESIGN_HEIGHT_NAMES=Object.freeze({2:'低めの床',4:'段差・縁どり',8:'花壇・低い壁'});
// A design contains geometry instructions only. It never carries stock or paint.
export function designFromWork(work) {
 if(!work||!Array.isArray(work.fill)||work.fill.length!==16||work.fill.some(q=>!Number.isInteger(q)||q<0||q>16))throw Error('この作品の形を読み取れないよ。');
 const mask=freeWorkMask(work);
 if(!Number.isInteger(mask)||mask<0||mask>65535||mask&~freeFilledMask(work))throw Error('作品の置かれている形をたしかめてね。');
 if(!mask)throw Error('保管中の作品だよ。現場に置くと、この形を使えるよ。');
 const heights=work.fill.flatMap((q,i)=>mask&(1<<i)?[groundHeight(work,i)]:[]),height=heights[0];if(work.layout)groundLayout(work.mask??freeFilledMask(work),work.layout);
 if(heights.some(h=>!Object.hasOwn(DESIGN_HEIGHT_NAMES,h)))throw Error('この高さの作品は、今はこのノートで使えないよ。');
 const cells=freePartCount(mask);
 const levels=work.fill.map((q,i)=>mask&(1<<i)?groundHeight(work,i):0),shape=designGeometry({mask,height:Math.max(...heights),levels,...(work.layout?{layout:trimGroundLayout(work,mask)}:{})});
 return Object.freeze({...shape,...(shape.levels?{levels:Object.freeze(shape.levels)}:{}),cells,boards:freeFrameBoards(mask,shape),cups:work.fill.reduce((n,q,i)=>n+(mask&(1<<i)?q/4:0),0)});
}
export function designBookEntries(works) {
 if(!Array.isArray(works)||works.length>16)throw Error('作品のセーブをたしかめてね。');
 return works.map((work,index)=>{try{return{index,plan:designFromWork(work),issue:''};}catch(e){return{index,plan:null,issue:e.message};}});
}
export function designReuseProblem(f,foundation,plan=null,{partial=false}={}) {
 if(!['design','complete'].includes(f?.stage))return '今の型枠の作業を終えてから、次の形をえらぼう。';
 if(f.aboard)return '車を降りてから、つくる形をえらぼう。';
 if(foundation&&(!f.location||foundation.x!==f.location.x||foundation.z!==f.location.z))return '土台の場所をたしかめてね。';
 if(foundation&&plan&&partial)return foundationDesignProblem(f,foundation,plan,{occupied:false});
 if(foundation&&plan&&plan.mask!==foundation.mask)return 'この土台と同じ形の設計をえらぼう。高さは変えられるよ。';
 return '';
}
