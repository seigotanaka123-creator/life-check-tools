// No-save inspection fixtures only. Never used by a normal saved session.
import {initialCrane,tip} from './imasora-construction-crane.js';
import {cranePlayer} from './imasora-construction-crane-walk.js';
export function craneAssemblyExample(kind,{finishWithCrane=false}={}){
  if(!['bridge','house'].includes(kind))throw new Error('確認する組立例が不正です。');
  const s=initialCrane(),part=id=>s.parts.find(p=>p.id===id),set=(id,data)=>Object.assign(part(id),data,{fixed:true});
  if(kind==='bridge'){
    set('panel-1',{x:-42,z:60,y:0});set('panel-2',{x:42,z:60,y:0});set('beam-1',{x:0,z:60,y:6});
    s.rig.player=cranePlayer({x:-108,y:0,z:60,heading:Math.PI/2});
  }else{
    set('panel-2',{x:0,z:84,y:0});set('wall-1',{x:-24,z:84,y:6,angle:Math.PI/2});set('wall-2',{x:24,z:84,y:6,angle:Math.PI/2});set('panel-1',{x:0,z:84,y:42});
    s.rig.player=cranePlayer({x:0,y:0,z:40,heading:0});
  }
  s.message='保存しない歩行確認用の組立例です。移動・ジャンプで確かめられます。';
  if(finishWithCrane){
    const p=part(kind==='bridge'?'beam-1':'panel-1');p.fixed=false;p.y+=8;s.held=p.id;
    s.rig.mode='driving';s.work=true;s.deployment=1;s.boom.yaw=0;s.boom.reach=p.z+54;
    s.boom.cable=tip(s).y-(p.y+p.h+4);
    s.message='保存しない確認用です。最後の部材を「ここに設置」してから格納・降車できます。';
  }
  return s;
}
