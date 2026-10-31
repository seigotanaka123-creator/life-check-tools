export const SIGN_TEXT_LIMIT=24;
export function signText(value){
 if(typeof value!=='string')throw Error('看板に書く文字を入れよう。');
 const text=value.normalize('NFC').trim();
 if(!text||[...text].length>SIGN_TEXT_LIMIT||/[\u0000-\u001f\u007f-\u009f\u2028-\u202e\u2066-\u2069\ud800-\udfff]/u.test(text))throw Error('看板は1〜24文字で書こう。改行や見えない文字は使えないよ。');
 return text;
}
// A paint snapshot identifies the physical furniture, not a replaceable inscription.
export const SIGN_PAINT_TEXT='看板';
export function signPreviewText(value){return typeof value==='string'?[...value.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u2028-\u202e\u2066-\u2069]/gu,'').trim()].slice(0,SIGN_TEXT_LIMIT).join(''):'';}
