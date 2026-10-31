import {signText} from './imasora-construction-sign-text.mjs?v=120hd';
export const SIGN_WORD_LIMIT=256;
const message='看板のあいことばを読みとれなかったよ。コピーし直して、もう一度ためしてね。';
const ok=v=>{if(!v)throw Error(message);};
function checksum(bytes){let n=0xffffffff;for(const b of bytes){n^=b;for(let bit=0;bit<8;bit++)n=(n>>>1)^((n&1)?0xedb88320:0);}return((n^0xffffffff)>>>0).toString(16).padStart(8,'0');}
// The word is an inscription only. It is never a material receipt or a work action.
export function encodeSignWord(text){const bytes=new TextEncoder().encode(JSON.stringify({v:1,text:signText(text)})),body=btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');return'IS1.'+body+'.'+checksum(bytes);}
export function decodeSignWord(value){
 try{
  ok(typeof value==='string'&&value.length<=SIGN_WORD_LIMIT);const code=value.replace(/[ \t\r\n]/g,''),match=/^IS1\.([A-Za-z0-9_-]{1,220})\.([0-9a-f]{8})$/.exec(code);ok(match);
  const bytes=Uint8Array.from(atob(match[1].replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));ok(checksum(bytes)===match[2]);const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  ok(data&&typeof data==='object'&&!Array.isArray(data)&&Object.keys(data).sort().join('|')==='text|v'&&data.v===1);const text=signText(data.text);ok(text===data.text&&encodeSignWord(text)===code);return{text,code};
 }catch{throw Error(message);}
}
