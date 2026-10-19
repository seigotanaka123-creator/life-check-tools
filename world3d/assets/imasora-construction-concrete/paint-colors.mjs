// Saved legacy names retain their original appearance. New paint stores a strict RGB hex.
export const LEGACY_PAINT_COLORS=Object.freeze({white:'#eee9da',red:'#c66558',yellow:'#d7b64c',green:'#64917b',blue:'#618db7',black:'#42494f'});
export const validPaintColor=c=>typeof c==='string'&&(Object.hasOwn(LEGACY_PAINT_COLORS,c)||/^#[0-9a-f]{6}$/.test(c));
export const paintColor=c=>Object.hasOwn(LEGACY_PAINT_COLORS,c)?LEGACY_PAINT_COLORS[c]:typeof c==='string'&&/^#[0-9a-f]{6}$/.test(c)?c:undefined;
export const BRIGHT_PAINTS=Object.freeze([{color:'#64b5ff',name:'そら'},{color:'#ff7895',name:'ピンク'},{color:'#ffd85c',name:'きいろ'},{color:'#7bdda5',name:'ミント'},{color:'#b49aff',name:'むらさき'},{color:'#ffac68',name:'オレンジ'},{color:'#ffffff',name:'しろ'},{color:'#30384b',name:'くろ'}]);
export function hsvPaint(h,s,v){if(![h,s,v].every(Number.isFinite))throw Error('INVALID_PAINT_COLOR');h=((h%360)+360)%360;s=Math.max(0,Math.min(1,s));v=Math.max(0,Math.min(1,v));const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c,r=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return '#'+r.map(n=>Math.round((n+m)*255).toString(16).padStart(2,'0')).join('');}
export function paintHSV(color){const c=paintColor(color);if(!c)throw Error('INVALID_PAINT_COLOR');const [r,g,b]=[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;const h=!d?0:max===r?60*((g-b)/d%6):max===g?60*((b-r)/d+2):60*((r-g)/d+4);return{h:(h+360)%360,s:max?d/max:0,v:max};}
export function paintName(c){return BRIGHT_PAINTS.find(x=>x.color===c)?.name??({blue:'青',white:'白',red:'赤',yellow:'黄',green:'緑',black:'黒'})[c]??'つくった色';}
// Only colors actually rendered allocate materials; a palette never creates hundreds of meshes.
export function createPaintMaterials(make){const values=Object.create(null);return new Proxy(values,{get(target,key){if(typeof key!=='string'||!paintColor(key))return target[key];return target[key]??(target[key]=make(paintColor(key)));}});}

