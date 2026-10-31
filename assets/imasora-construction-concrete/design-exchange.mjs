import {groundLimit} from './ground-grid.mjs?v=120hb';
import {designGeometry,designLevels,levelDesign} from './design-levels.mjs?v=120hb';
import {designName} from './design-name.mjs?v=120gv';
import {designFromWork} from './design-book.mjs?v=120pv';
export const DESIGN_WORD_LIMIT=512;
const message='あいことばを読みとれなかったよ。コピーし直して、もう一度ためしてね。';
const ok=v=>{if(!v)throw Error(message);};
function payload(d){const name=designName(d.name);ok(Number.isInteger(d.mask)&&d.mask>0&&d.mask<=65535&&[2,4,8].includes(d.height));const shape=designGeometry(d);return shape.layout?{v:3,name,levels:designLevels(shape),layout:shape.layout}:shape.levels?{v:2,name,levels:shape.levels}:{v:1,name,mask:d.mask,height:d.height};}
function checksum(bytes){let n=0xffffffff;for(const b of bytes){n^=b;for(let bit=0;bit<8;bit++)n=(n>>>1)^((n&1)?0xedb88320:0);}return((n^0xffffffff)>>>0).toString(16).padStart(8,'0');}
function encodePayload(p){const bytes=new TextEncoder().encode(JSON.stringify(p)),body=btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');return'IW'+p.v+'.'+body+'.'+checksum(bytes);}
// A word contains only the visible name, shape and height. The checksum catches
// transcription errors; it is not an authority receipt and grants no material.
export function encodeDesignWord(design){return encodePayload(payload(design));}
export function decodeDesignWord(value){
 try{
  ok(typeof value==='string'&&value.length<=DESIGN_WORD_LIMIT);const word=value.replace(/[ \t\r\n]/g,''),match=/^IW([123])\.([A-Za-z0-9_-]{1,500})\.([0-9a-f]{8})$/.exec(word);ok(match);
  const bytes=Uint8Array.from(atob(match[2].replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));ok(checksum(bytes)===match[3]);const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  ok(data&&typeof data==='object'&&!Array.isArray(data)&&data.v===Number(match[1])&&Object.keys(data).sort().join('|')===(data.v===1?'height|mask|name|v':data.v===2?'levels|name|v':'layout|levels|name|v'));const shape=data.v===1?{mask:data.mask,height:data.height}:{...levelDesign(data.levels),...(data.v===3?{layout:data.layout}:{})};const p=payload({name:data.name,...shape});ok(p.name===data.name&&encodePayload(p)===word);
  const plan=designFromWork({...(shape.layout?{layout:shape.layout}:{}),fill:designLevels(shape).map((h,i)=>groundLimit(shape,i,h))});return{name:p.name,...designGeometry(shape),plan,code:word};
 }catch{throw Error(message);}
}
