import {parseCapturedConstructionJson,parseCapturedConstructionJsonAsync,isCapturedConstructionJson,capturedSoilJson} from './imasora-construction-json-capture.mjs';
// Transfer immutable soil as exact JSON strings. The small actor/menu state
// still uses native structured clone. No field, history, or voxel is removed.
const encoded=new WeakMap(),decoded=new Map();let retained=0;
function remember(text,value){if(decoded.has(text))return decoded.get(text);const size=text.length*2;if(size<=32*1024*1024){while(decoded.size>=2||retained+size>32*1024*1024){const key=decoded.keys().next().value;retained-=key.length*2;decoded.delete(key);}decoded.set(text,value);retained+=size;}encoded.set(value,text);return value;}
function soilText(value){if(encoded.has(value))return encoded.get(value);const spelling=capturedSoilJson(value);if(spelling!==null){remember(spelling,value);encoded.set(value,spelling);return spelling;}let zero=false;const stack=[value];while(stack.length){const v=stack.pop();if(v&&typeof v==='object'){for(const x of Object.values(v))stack.push(x);}else if(Object.is(v,-0)){zero=true;break;}}if(zero){encoded.set(value,null);return null;}const text=JSON.stringify(value);remember(text,value);encoded.set(value,text);return text;}
export function encodeSaveWire(value){
 const soils=[],paths=[],seen=new WeakMap();
 function walk(v,path){
  if(v===null||typeof v!=='object')return v;
  if(isCapturedConstructionJson(v)&&typeof v.format==='string'&&v.journal&&v.containers){const text=soilText(v);if(text!==null){let index=soils.indexOf(text);if(index<0){index=soils.length;soils.push(text);}paths.push({path,index});return null;}}
  // Uncaptured soil retains the original native-clone route and full checks.
  if(v.format&&v.journal&&v.containers)return v;
  if(seen.has(v))return seen.get(v);const proto=Object.getPrototypeOf(v);if(proto!==(Array.isArray(v)?Array.prototype:Object.prototype))return v;
  const out=Array.isArray(v)?[]:{};seen.set(v,out);for(const key of Reflect.ownKeys(v)){if(key==='length'&&Array.isArray(v))continue;const d=Object.getOwnPropertyDescriptor(v,key);if(!d||!Object.hasOwn(d,'value')||typeof key!=='string')return v;Object.defineProperty(out,key,{value:walk(d.value,[...path,key]),enumerable:d.enumerable,writable:true,configurable:true});}return out;
 }
 const root=walk(value,[]);return soils.length?{format:'imasora-soil-wire-1',root,soils,paths}:null;
}
export function decodeSaveWire(wire){
 if(!wire||wire.format!=='imasora-soil-wire-1'||!Array.isArray(wire.soils)||!Array.isArray(wire.paths))throw Error('保存の受け渡しを確認できません。');
 const values=wire.soils.map(text=>{if(typeof text!=='string'||text.length>8*1024*1024)throw Error('土の保存が大きすぎます。');return decoded.get(text)??remember(text,parseCapturedConstructionJson(text));});
 return attachSoils(wire,values);
}
function attachSoils(wire,values){
 let root=wire.root;
 for(const item of wire.paths){if(!Number.isInteger(item.index)||item.index<0||item.index>=values.length||!Array.isArray(item.path))throw Error('土の場所を確認できません。');if(!item.path.length){root=values[item.index];continue;}let parent=root;for(const key of item.path.slice(0,-1)){if(typeof key!=='string'||!Object.hasOwn(parent,key))throw Error('土の場所が一致しません。');parent=parent[key];}const key=item.path.at(-1);if(typeof key!=='string'||!parent||!Object.hasOwn(parent,key)||parent[key]!==null)throw Error('土の場所が一致しません。');Object.defineProperty(parent,key,{value:values[item.index],enumerable:true,writable:true,configurable:true});}
 return root;
}

// Background replies use the same strict wire and cache, with cooperative
// structural capture only on a cold, large soil. Failure never returns a part.
export async function decodeSaveWireAsync(wire,options){
 if(!wire||wire.format!=='imasora-soil-wire-1'||!Array.isArray(wire.soils)||!Array.isArray(wire.paths))throw Error('保存の受け渡しを確認できません。');
 const values=[];
 for(const text of wire.soils){
  if(typeof text!=='string'||text.length>8*1024*1024)throw Error('土の保存が大きすぎます。');
  const value=decoded.get(text)??remember(text,text.length>=65536?await parseCapturedConstructionJsonAsync(text,options):parseCapturedConstructionJson(text));values.push(value);
 }
 return attachSoils(wire,values);
}

// Fully validated private candidates can keep their immutable soil when the
// serialized ledger is adopted. Normalize the small fields exactly as JSON
// does, without parsing/freezing another copy of the unchanged terrain.
export function serializedSaveSnapshot(value){
 const wire=encodeSaveWire(value);
 if(!wire)return parseCapturedConstructionJson(JSON.stringify(value));
 const next=decodeSaveWire({...wire,root:JSON.parse(JSON.stringify(wire.root))});
 function freeze(v){if(v&&typeof v==='object'&&!isCapturedConstructionJson(v)){for(const child of Object.values(v))freeze(child);Object.freeze(v);}return v;}
 return freeze(next);
}
