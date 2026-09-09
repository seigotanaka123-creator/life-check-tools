// Precision changes input rates only: cargo contact, sway and reach are unchanged.
export function craneWorkInput(actions=[],keys=[],precision=false){
  const a=new Set(actions),k=new Set(keys),down=(id,code)=>a.has(id)||k.has(code),rate=precision ? .25 : 1;
  return{slew:(Number(down('slew-left','KeyA'))-Number(down('slew-right','KeyD')))*rate,
    extend:(Number(down('extend','KeyW'))-Number(down('retract','KeyS')))*rate,
    hoist:(Number(down('raise','ArrowUp'))-Number(down('lower','ArrowDown')))*rate,brake:true};
}
export function cranePlacementReadout(state,preview){
  if(!preview)return'';
  const p=preview.candidate,support=preview.support.ids.map(id=>state.parts.find(p=>p.id===id)?.name).filter(Boolean).join('・')||'地面';
  return`設置予定 X ${p.x.toFixed(1)} / 高さ ${p.y.toFixed(1)} / Z ${p.z.toFixed(1)}｜支え：${support}`;
}
