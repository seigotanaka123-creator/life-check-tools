// Descriptor-safe, cooperative capture. This proves only plain frozen data;
// callers still perform the complete domain validation before using a save.
const captured=new WeakSet(),heights=new WeakMap();
export const isCapturedConstructionJson=value=>captured.has(value);
// Message tasks avoid the 4 ms minimum delay of a chain of setTimeout calls.
// No data validation runs in the callback; it only lets input and paint proceed.
let yieldChannel=null;const yieldWaiters=[];
function yieldCapture(){
 if(typeof document==='undefined'||typeof MessageChannel!=='function')return new Promise(r=>setTimeout(r,0));
 if(!yieldChannel){yieldChannel=new MessageChannel();yieldChannel.port1.onmessage=()=>yieldWaiters.shift()?.();}
 return new Promise(resolve=>{yieldWaiters.push(resolve);yieldChannel.port2.postMessage(0);});
}
export const captureConstructionJson=(value,options)=>capture(value,options,false);
// Consume ONLY a private worker/JSON result which no caller can mutate during
// the cooperative traversal. All structure checks still run, but no second
// scene is allocated. Never use this path for caller-owned inputs.
export const captureOwnedConstructionJson=(value,options)=>capture(value,options,true);
async function capture(value,{yieldTask=yieldCapture,sliceMs=8}={},owned){
 const seen=new WeakMap(),active=new WeakSet(),stack=[];let deadline=performance.now()+sliceMs;
 const copy=(v,depth)=>{
  if(depth>100)throw Error('保存の階層が深すぎます。');
  if(v===null||typeof v==='string'||typeof v==='boolean')return v;
  if(typeof v==='number'){if(!Number.isFinite(v))throw Error('保存の数値が不正です。');return v;}
  if(v&&typeof v==='object'&&captured.has(v)){if(depth+heights.get(v)>100)throw Error('保存の階層が深すぎます。');return v;}
  const array=Array.isArray(v);if(!v||Object.getPrototypeOf(v)!==(array?Array.prototype:Object.prototype))throw Error('保存できない型です。');
  if(active.has(v))throw Error('循環した保存です。');if(seen.has(v))return seen.get(v);
  const keys=Object.keys(v);if(Reflect.ownKeys(v).length!==keys.length+(array?1:0)||array&&(keys.length!==v.length||keys.some((k,i)=>k!==String(i))))throw Error('隠れた項目や欠けた配列は保存できません。');
  if(array&&v.length===3&&depth<100){
   const a=Object.getOwnPropertyDescriptor(v,'0'),b=Object.getOwnPropertyDescriptor(v,'1'),c=Object.getOwnPropertyDescriptor(v,'2');
   if([a,b,c].every(d=>d&&Object.hasOwn(d,'value')&&typeof d.value==='number'&&Number.isFinite(d.value))){
    const point=Object.freeze(owned?v:[a.value,b.value,c.value]);seen.set(v,point);heights.set(point,1);captured.add(point);return point;
   }
  }
  const out=owned?v:array?new Array(v.length):{};seen.set(v,out);active.add(v);stack.push({v,out,keys,index:0,depth});return out;
 };
 const result=copy(value,0);while(stack.length){
  const f=stack.at(-1);if(f.index===f.keys.length){let height=0;for(const key of f.keys){const child=f.out[key];height=Math.max(height,1+(child&&typeof child==='object'?heights.get(child):0));}Object.freeze(f.out);heights.set(f.out,height);captured.add(f.out);active.delete(f.v);stack.pop();}
  else{const key=f.keys[f.index++],d=Object.getOwnPropertyDescriptor(f.v,key);if(!d||!Object.hasOwn(d,'value'))throw Error('動的な属性は保存できません。');const child=copy(d.value,f.depth+1);if(!owned)Object.defineProperty(f.out,key,{value:child,writable:true,enumerable:true,configurable:true});}
  if(performance.now()>=deadline){await yieldTask();deadline=performance.now()+sliceMs;}
 }return result;
}

// JSON.parse creates only private data properties, with no aliases, getters or
// hidden keys. Freeze and certify this tree directly instead of inspecting
// millions of native descriptors a second time. This is structural evidence,
// never a replacement for domain checks or checksum validation.
const parsedInfo=new WeakMap(),parsedSoils=new Map(),soilSpellings=new WeakMap();let parsedSoilBytes=0;
export const capturedJsonInfo=value=>parsedInfo.get(value)??null;
// Exact spelling for a frozen soil proven to have no negative zero. This only
// reuses the transfer encoding; domain checks and checksums still run.
export const capturedSoilJson=value=>soilSpellings.get(value)??null;
// Reuse only an exact JSON spelling that previously passed structural capture.
// Scan outside quoted strings; replacing a complete JSON object with a string
// leaves JSON.parse responsible for all surrounding grammar (including errors).
// The cache keeps its existing two-tree / 32 MiB bound. No hash grants equality.
function reuseParsedSoils(text){
 if(typeof text!=='string'||text.length<65536||!parsedSoils.size)return {text,replacements:null};
 const entries=[...parsedSoils],hits=[],used=new Set(),parents=[],tokens=/["{}\[\],:]/g;let match,previous=null;
 while((match=tokens.exec(text))){const start=match.index;
  if(match[0]==='"'){
   let end=text.indexOf('"',start+1);
   while(end>=0){let back=end-1;while(back>start&&text[back]==='\\')back--;if((end-1-back)%2===0)break;end=text.indexOf('"',end+1);}
   if(end<0)return {text,replacements:null};
   const literal=text.slice(start,end+1);
   // A valid JSON spelling of our NUL prefix must contain this escape.
   // Decode just those unusual strings to exclude even escaped collisions.
   if(literal.includes('\\u0000')){try{used.add(JSON.parse(literal));}catch{return {text,replacements:null};}}
   tokens.lastIndex=end+1;previous="string";continue;
  }
  const token=match[0];
  const valuePosition=previous===':'||previous==='['||previous===','&&parents.at(-1)==='['||previous===null&&text.slice(0,start).trim()==='';
  const found=token==='{'&&valuePosition?entries.find(([raw])=>text.startsWith(raw,start)):null;
  if(found){hits.push({start,end:start+found[0].length,value:found[1]});tokens.lastIndex=start+found[0].length;previous='value';}
  else{if(token==='{'||token==='[')parents.push(token);else if(token==='}'||token===']')parents.pop();previous=token;}
 }
 if(!hits.length)return {text,replacements:null};
 const replacements=new Map(),parts=[];let offset=0,serial=0;
 for(const hit of hits){let key;do{key='\u0000imasora-captured-soil:'+serial++;}while(used.has(key));
  replacements.set(key,hit.value);parts.push(text.slice(offset,hit.start),JSON.stringify(key));offset=hit.end;
 }
 parts.push(text.slice(offset));return {text:parts.join(''),replacements};
}
export function parseCapturedConstructionJson(text){
 const reused=reuseParsedSoils(text),value=JSON.parse(reused.text);
 function visit(v,depth){
  if(typeof v==='string'&&reused.replacements?.has(v))v=reused.replacements.get(v);
  const existing=v&&typeof v==='object'?parsedInfo.get(v):null;
  if(existing){if(depth+existing.height>100)throw Error('保存の階層が深すぎます。');return {...existing,value:v,negativeZero:false};}
  if(depth>100)throw Error('保存の階層が深すぎます。');
  if(v===null||typeof v!=='object'){if(typeof v==='number'&&!Number.isFinite(v))throw Error('保存の数値が不正です。');return {height:0,nodes:1,value:v,negativeZero:Object.is(v,-0)};}
  if(Array.isArray(v)&&v.length===3&&typeof v[0]==='number'&&typeof v[1]==='number'&&typeof v[2]==='number'){
   if(!Number.isFinite(v[0])||!Number.isFinite(v[1])||!Number.isFinite(v[2]))throw Error('保存の数値が不正です。');
   if(depth+1>100)throw Error('保存の階層が深すぎます。');Object.freeze(v);return {height:1,nodes:1,value:v,negativeZero:v.some(n=>Object.is(n,-0))};
  }
  // Equal JSON soils may reuse a previously frozen structural tree before
  // allocating metadata for every coordinate again. JSON spells -0 as 0 when
  // stringifying, so check all native numbers on a cache hit. Domain validation
  // still follows; this only avoids duplicate structural capture.
  let soilKey=null;
  if(!Array.isArray(v)&&typeof v.format==='string'&&v.journal&&v.containers){
   soilKey=JSON.stringify(v);const old=parsedSoils.get(soilKey),info=old&&parsedInfo.get(old);
   if(info){
    let minusZero=false;const stack=[v];while(stack.length){const item=stack.pop();if(item&&typeof item==='object'){for(const child of Object.values(item))stack.push(child);}else if(typeof item==='number'){if(!Number.isFinite(item))throw Error('保存の数値が不正です。');minusZero ||= Object.is(item,-0);}}
    if(!minusZero){if(depth+info.height>100)throw Error('保存の階層が深すぎます。');return {...info,value:old,negativeZero:false};}
   }
  }
  let height=0,nodes=1,negativeZero=false;const keys=Object.keys(v);
  for(const key of keys){const child=visit(v[key],depth+1);height=Math.max(height,1+child.height);nodes+=child.nodes;negativeZero ||= child.negativeZero;v[key]=child.value;}
  if(Array.isArray(v)&&v.length===3&&v.every(n=>typeof n==='number'&&Number.isFinite(n)))nodes=1;
  Object.freeze(v);if(!Array.isArray(v)||depth===0){captured.add(v);heights.set(v,height);parsedInfo.set(v,{height,nodes});}
  if(!negativeZero&&typeof v.format==='string'&&v.journal&&v.containers){
   const key=soilKey??JSON.stringify(v),size=key.length*2,old=parsedSoils.get(key);
   if(old)return {height,nodes,value:old,negativeZero};
   if(size<=32*1024*1024){while(parsedSoils.size>=2||parsedSoilBytes+size>32*1024*1024){const first=parsedSoils.keys().next().value;parsedSoilBytes-=first.length*2;parsedSoils.delete(first);}parsedSoils.set(key,v);parsedSoilBytes+=size;soilSpellings.set(v,key);}
  }
  return {height,nodes,value:v,negativeZero};
 }
 return visit(value,0).value;
}

// Native JSON grammar remains authoritative. Freeze its private result in
// short slices so a large incoming soil does not hold the game's UI thread.
export async function parseCapturedConstructionJsonAsync(text,{yieldTask=yieldCapture,sliceMs=8}={}){
 const old=typeof text==='string'?parsedSoils.get(text):null;if(old)return old;
 const root=JSON.parse(text),stack=[];let deadline=performance.now()+sliceMs,steps=0;
 function begin(value,depth){
  if(depth>100)throw Error('保存の階層が深すぎます。');
  if(value===null||typeof value!=='object'){
   if(typeof value==='number'&&!Number.isFinite(value))throw Error('保存の数値が不正です。');
   return {value,height:0,nodes:1,negativeZero:Object.is(value,-0)};
  }
  if(Array.isArray(value)&&value.length===3&&typeof value[0]==='number'&&typeof value[1]==='number'&&typeof value[2]==='number'){
   if(!Number.isFinite(value[0])||!Number.isFinite(value[1])||!Number.isFinite(value[2]))throw Error('保存の数値が不正です。');
   if(depth+1>100)throw Error('保存の階層が深すぎます。');Object.freeze(value);
   return {value,height:1,nodes:1,negativeZero:Object.is(value[0],-0)||Object.is(value[1],-0)||Object.is(value[2],-0)};
  }
  stack.push({value,depth,keys:Object.keys(value),index:0,height:0,nodes:1,negativeZero:false});return null;
 }
 const first=begin(root,0);if(first)return first.value;
 function include(frame,child){frame.height=Math.max(frame.height,1+child.height);frame.nodes+=child.nodes;frame.negativeZero ||= child.negativeZero;}
 while(stack.length){
  const frame=stack.at(-1);
  if(frame.index<frame.keys.length){const child=begin(frame.value[frame.keys[frame.index++]],frame.depth+1);if(child)include(frame,child);}
  else{
   Object.freeze(frame.value);
   if(!Array.isArray(frame.value)||frame.depth===0){captured.add(frame.value);heights.set(frame.value,frame.height);parsedInfo.set(frame.value,{height:frame.height,nodes:frame.nodes});}
   stack.pop();if(stack.length)include(stack.at(-1),frame);
  }
  if((++steps&255)===0&&performance.now()>=deadline){await yieldTask();deadline=performance.now()+sliceMs;}
 }
 return root;
}
