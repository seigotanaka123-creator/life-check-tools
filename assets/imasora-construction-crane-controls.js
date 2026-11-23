import {loaderDrivingInput} from './imasora-construction-loader-physics.js?v=120ov';
import {displayTimberCargoText} from './imasora-construction-timber-cargo.mjs?v=120pv';
// Precision changes input rates only: cargo contact, sway and reach are unchanged.
export const CRANE_WORK_KEYS=Object.freeze(['KeyQ','KeyE','KeyJ','KeyH','KeyU','KeyI']);
export const CRANE_ACTION_KEYS=Object.freeze(['KeyO','KeyL','KeyN','KeyM']);
export function craneActionForKey(code,state){
  if(state?.rig?.mode!=='driving')return null;
  if(code==='KeyO')return 'mode';
  if(!state.work)return null;
  if(code==='KeyL'||code==='KeyN')return state.held?'place':'pick';
  return code==='KeyM'?'precision':null;
}
export function craneWorkInput(actions=[],keys=[],precision=false){
  const a=new Set(actions),k=new Set(keys),down=(id,code)=>a.has(id)||k.has(code),rate=precision ? .25 : 1;
  return{slew:(Number(down('slew-left','KeyQ'))-Number(down('slew-right','KeyE')))*rate,
    extend:(Number(down('extend','KeyU'))-Number(down('retract','KeyI')))*rate,
    hoist:(Number(down('raise','KeyJ'))-Number(down('lower','KeyH')))*rate,brake:true};
}
export function craneOperatorInput(actions=[],keys=[],precision=false,working=false){
  const driving=loaderDrivingInput(actions,keys);
  return working?{...craneWorkInput(actions,keys,precision),...driving}:driving;
}
export function craneDriveNotice(state){
  if(state?.rig?.mode!=='driving'||!state.work&&!state.deployment)return '';
  if(!state.work)return '支持脚を格納しています。終わったらWASDで走れます。';
  return state.held?'吊った建材を下ろし、「運転へ」で支持脚を格納しよう。WASDは走行専用です。':'「運転へ」で支持脚を格納しよう。終わったらWASDで走れます。';
}
export function cranePlacementReadout(state,preview){
  if(!preview)return'';
  const p=preview.candidate,support=preview.support.ids.map(id=>state.parts.find(p=>p.id===id)?.name).filter(Boolean).join('・')||'地面';
  return`設置予定 X ${p.x.toFixed(1)} / 高さ ${p.y.toFixed(1)} / Z ${p.z.toFixed(1)}｜支え：${displayTimberCargoText(support)}`;
}
