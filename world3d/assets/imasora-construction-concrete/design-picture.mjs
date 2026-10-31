import {groundTile} from './ground-grid.mjs?v=120hb';
import {shapePicture} from '../imasora-pop-menu.mjs?v=120dm';
import {designLevels} from './design-levels.mjs?v=120hb';
export function designPicture(mask,plan){
 if(plan?.layout){const colors={2:'#c7eef5',4:'#ffe4a2',8:'#e4d2fa'},levels=designLevels(plan);return '<svg viewBox="-36 -36 72 72" aria-hidden="true">'+levels.map((h,i)=>{if(!h)return '';const t=groundTile(i,plan);return '<rect x="'+(t.x-t.w/2+.3)+'" y="'+(t.z-t.d/2+.3)+'" width="'+(t.w-.6)+'" height="'+(t.d-.6)+'" rx="1" fill="'+colors[h]+'" stroke="#8caebd"/>'+'<text x="'+t.x+'" y="'+(t.z+2)+'" text-anchor="middle" font-size="5" fill="#284958">'+h+'</text>';}).join('')+'</svg>';}if(!plan?.levels)return shapePicture(mask);
 const levels=designLevels(plan),colors={2:'#c7eef5',4:'#ffe4a2',8:'#e4d2fa'};
 return '<svg viewBox="0 0 88 70" aria-hidden="true">'+levels.map((h,i)=>{const x=8+i%4*18,y=5+Math.floor(i/4)*14;return '<rect x="'+x+'" y="'+y+'" width="16" height="12" rx="3" fill="'+(colors[h]??'#f7fcff')+'" stroke="#8caebd"/>'+(h?'<text x="'+(x+8)+'" y="'+(y+9)+'" text-anchor="middle" font-size="9" font-weight="bold" fill="#284958">'+h+'</text>':'');}).join('')+'</svg>';
}
