import * as T from './three.module.min.js';
import{outdoorTextInk}from'./imasora-construction-outdoor-paint.mjs?v=120hh';
import {signPreviewText} from './imasora-construction-sign-text.mjs?v=120hd';
// Only twelve room fixtures can exist. Reuse unchanged textures; retire changed ones.
export function createSignLabels(parent){
 const entries=new Map();let root=null,geometry=null;
 function remove(id){const e=entries.get(id);if(!e)return;e.group.removeFromParent();e.material.dispose();e.texture.dispose();entries.delete(id);}
 function label(item){
  const text=signPreviewText(item.text)||'看板',canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('看板の文字を表示できません。');
  const chars=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(text)].map(p=>p.segment):[...text];let lines=[],size=112;const maxLines=chars.length<=8?1:chars.length<=16?2:3;
  for(;size>=24;size-=2){ctx.font='700 '+size+'px "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';lines=[''];for(const char of chars){const last=lines.length-1;if(lines[last]&&ctx.measureText(lines[last]+char).width>448)lines.push(char);else lines[last]+=char;}if(lines.length<=maxLines&&lines.length*size*1.15<=208&&lines.every(line=>ctx.measureText(line).width<=448))break;}
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=4;const ink=outdoorTextInk(item.boardColor);ctx.strokeStyle=ink.outline;ctx.fillStyle=ink.ink;
  const step=size*1.15;lines.forEach((line,i)=>{const y=128+(i-(lines.length-1)/2)*step;ctx.strokeText(line,256,y,448);ctx.fillText(line,256,y,448);});
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const material=new T.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.02,depthTest:true,depthWrite:false,toneMapped:false});
  const group=new T.Group();group.name='room-sign-text-'+(item.id??'preview');group.userData.signText=text;
  geometry??=new T.PlaneGeometry(24,12);for(const side of[1,-1]){const mesh=new T.Mesh(geometry,material);mesh.position.set(0,22,side*1.07);mesh.rotation.y=side===1?0:Math.PI;group.add(mesh);}
  group.position.set(item.x,item.floor*40,item.z);group.rotation.y=item.turn*Math.PI/2;return{group,texture,material};
 }
 return{sync(items,floor=null){
  const wanted=items.filter(i=>i.kind==='sign'&&(floor===null||i.floor===floor)),keys=new Set();
  for(const item of wanted){const id=item.id??'preview',key=JSON.stringify([item.text,item.x,item.z,item.floor,item.turn,item.boardColor??null]);keys.add(id);if(entries.get(id)?.key===key)continue;remove(id);root??=new T.Group();root.name='看板の文字';if(!root.parent)parent.add(root);const e=label(item);e.key=key;root.add(e.group);entries.set(id,e);}
  for(const id of entries.keys())if(!keys.has(id))remove(id);if(!entries.size)root?.removeFromParent();
 },dispose(){for(const id of entries.keys())remove(id);geometry?.dispose();root?.removeFromParent();root=null;geometry=null;}};
}
