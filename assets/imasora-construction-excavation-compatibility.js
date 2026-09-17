// 9-1c2b2a: read-only geometry/quantity contract. No conversion of a loan
// checkpoint into an authoritative world save. Keep the exact yard origin:
// 1180 and 2100 are half-cell offsets on the stage 2-2 grid.
import {cellAddress,SOIL_UNIT} from './imasora-construction-state.js';
import {cellBox} from './imasora-construction-terrain.js';
import {totals,CELL} from './imasora-construction-excavator.js';
import {EXCAVATION_YARDS} from './imasora-construction-world-excavation.js';
import {CONTACT_EXCAVATION_FORMAT,packExcavation,unpackExcavation,resumeExcavation} from './imasora-construction-excavator-save.js';

export const PREVIEW_IMPORT_LIMIT=2*1024*1024;
function originFor(site){
  if(!Number.isInteger(site)||!EXCAVATION_YARDS[site])throw Error('掘削区画が確定していません。');
  const [x,z]=EXCAVATION_YARDS[site];return [x,0,z];
}
export function readContactPreview(text){
  if(typeof text!=='string'||text.length>PREVIEW_IMPORT_LIMIT||new TextEncoder().encode(text).length>PREVIEW_IMPORT_LIMIT)throw Error('作業JSONは2 MiB以下で読み込んでください。');
  let packet;try{packet=JSON.parse(text);}catch{throw Error('作業JSONを読み取れません。元の書出文字列を確認してください。');}
  if(packet?.kind!==CONTACT_EXCAVATION_FORMAT)throw Error('この入口はv3の接触掘削専用です。旧v1/v2・通常セーブは読み込めません。');
  return unpackExcavation(packet);
}
export function contactTerrainProjection(state,site){
  const packet=packExcavation(state);
  if(packet.kind!==CONTACT_EXCAVATION_FORMAT)throw Error('v3の接触掘削だけを照合できます。');
  const origin=originFor(site),chunks={};
  for(const p of Object.values(state.terrain)){
    const a=cellAddress(p);(chunks[a.chunk]??={})[a.local]='earth-soil';
  }
  const counts=totals(state);
  return {scope:'contact-excavation-preview-only',origin,cellSize:CELL,chunkSize:16,chunks,
    counts,volume:Object.fromEntries(Object.entries(counts).map(([k,v])=>[k,v*SOIL_UNIT])),
    // This is a comparison view, not a valid stage 2-2 save or an inventory grant.
    authorityImportAllowed:false};
}
export function contactWorldCellBox(position,site){
  cellAddress(position);const [x,y,z]=originFor(site),b=cellBox(position);
  return {...b,minX:b.minX+x,maxX:b.maxX+x,minY:b.minY+y,maxY:b.maxY+y,minZ:b.minZ+z,maxZ:b.maxZ+z};
}
const identity=s=>JSON.stringify(packExcavation(s));
export class ContactPreviewRestore {
  #candidate=null; #before=null;
  get hasBefore(){return this.#before!==null;}
  get ready(){return this.#candidate!==null;}
  clear(){this.#candidate=null;}
  beforeText(){if(!this.#before)throw Error('この画面内の復元前の控えはありません。');return this.#before;}
  prepare(text,current,site){
    this.clear();const next=readContactPreview(text),projection=contactTerrainProjection(next,site);
    this.#candidate={text:identity(next),baseline:identity(current),site};
    return {current:totals(current),next:projection.counts,origin:projection.origin,mode:next.loader.mode,action:next.action?.kind??next.action?.type??(next.action?'動作途中':'停止'),transition:!!next.loader.transition};
  }
  apply(current,site){
    const c=this.#candidate;
    if(!c)throw Error('先にバックアップの内容を確認してください。');
    if(c.site!==site||c.baseline!==identity(current)){this.clear();throw Error('内容確認後に作業または区画が変わりました。もう一度内容を確認してください。');}
    // Build/validate everything before replacing either current work or undo.
    const next=resumeExcavation(readContactPreview(c.text)),before=identity(current);
    contactTerrainProjection(next,site);this.#before=before;this.clear();return next;
  }
}
