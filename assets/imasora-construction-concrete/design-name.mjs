const ok=(v,m)=>{if(!v)throw Error(m);};
export function designName(value){
 ok(typeof value==='string','設計に名前をつけよう。');const s=value.normalize('NFC').trim();
 ok(s.length>0&&[...s].length<=24&&!/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069\ud800-\udfff]/u.test(s),'名前は24文字まででつけよう。');return s;
}
