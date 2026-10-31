
import{designName}from'./design-name.mjs';
import{upperDesignShape,upperDesignGeometry,upperShapeTiles,upperCastingBoards,upperCapacityCups,upperShapeSize}from'./high-casting-shape.mjs?v=120hb';
export const UPPER_WORD_LIMIT=512;
const message='上階のあいことばを読みとれなかったよ。コピーし直してね。',ok=v=>{if(!v)throw Error(message);};
function crc(bytes){let n=0xffffffff;for(const b of bytes){n^=b;for(let i=0;i<8;i++)n=n>>>1^((n&1)?0xedb88320:0);}return((n^0xffffffff)>>>0).toString(16).padStart(8,'0');}
function payload(d){const shape=upperDesignShape(d),name=designName(d.name);return{v:shape.version===3?2:1,name,...upperDesignGeometry(shape)};}
function encode(p){const bytes=new TextEncoder().encode(JSON.stringify(p)),body=btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');return'IU'+p.v+'.'+body+'.'+crc(bytes);}
export function encodeUpperDesignWord(d){return encode(payload(d));}
export function decodeUpperDesignWord(value){try{ok(typeof value==='string'&&value.length<=UPPER_WORD_LIMIT);const word=value.replace(/[ \t\r\n]/g,''),m=/^IU([12])\.([A-Za-z0-9_-]{1,384})\.([0-9a-f]{8})$/.exec(word);ok(m);const bytes=Uint8Array.from(atob(m[2].replaceAll('-','+').replaceAll('_','/')),s=>s.charCodeAt(0));ok(crc(bytes)===m[3]);const d=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));ok(d&&typeof d==='object'&&!Array.isArray(d)&&d.v===Number(m[1])&&Object.keys(d).sort().join('|')===(d.v===1?'levels|name|v':'depth|levels|name|v|width'));const p=payload(d);ok(p.name===d.name&&encode(p)===word);const shape=upperDesignShape(p),c={shape};return{name:p.name,...upperDesignGeometry(shape),shape,size:upperShapeSize(shape),cells:upperShapeTiles(shape).length,boards:upperCastingBoards(c),cups:upperCapacityCups(c),code:word};}catch{throw Error(message);}}
