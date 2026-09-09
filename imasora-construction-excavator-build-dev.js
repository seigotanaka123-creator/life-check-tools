import {startExcavatorView} from './imasora-construction-excavator-dev.js?v=467';
import {initialExcavatorBuild,actExcavatorBuild,stepExcavatorBuild,buildProgress} from './assets/imasora-construction-excavator-build.js';
const $=id=>document.getElementById(id);
export function startExcavatorBuildView({initial=initialExcavatorBuild,decorate=null,canEdit=()=>true}={}){
return startExcavatorView({initial,actState:actExcavatorBuild,stepState:stepExcavatorBuild,walking:true,setup(api){
  let pending=null,generation=0,repeat=false,wasGuide=false;
  const plan=new api.THREE.Group();api.scene.add(plan);
  for(const [y,z,h,d] of [[8,56,32,16],[4,80,40,32],[0,112,32,32]]){
    const edges=new api.THREE.EdgesGeometry(new api.THREE.BoxGeometry(48,h,d)),line=new api.THREE.LineSegments(edges,new api.THREE.LineBasicMaterial({color:0x71dccc,transparent:true,opacity:.6,depthTest:false}));line.position.set(32,y,z);line.renderOrder=3;plan.add(line);
  }
  function cancel(){generation++;pending?.worker.terminate();pending=null;repeat=false;$('repeat-guide').checked=false;}
  function request(action){
    if(pending||!canEdit())return;const snapshot=api.getState();api.clear();const worker=new Worker(new URL('./assets/imasora-construction-excavator-planner-worker.js',import.meta.url),{type:'module'}),id=++generation;
    pending={worker,id};api.setState({...snapshot,message:'接触しない経路を確認中…（停止・カメラ操作は使えます）'});
    worker.onmessage=({data})=>{worker.terminate();if(!pending||id!==generation)return;pending=null;const current=api.getState();api.setState({...current,guide:data.guide,message:data.message});wasGuide=!!data.guide;if(!data.guide){repeat=false;$('repeat-guide').checked=false;}};
    worker.onerror=()=>{cancel();api.setState({...api.getState(),guide:null,message:'経路の計算に失敗しました。手動操作は使用できます。'});};worker.postMessage({state:snapshot,action});
  }
  $('build-cycle').onclick=()=>{repeat=$('repeat-guide').checked;request('build-cycle');};
  $('stop-guide').onclick=()=>{cancel();api.act('stop-guide');};
  $('repeat-guide').onchange=()=>repeat=$('repeat-guide').checked;
  $('show-plan').onchange=()=>plan.visible=$('show-plan').checked;
  $('entry-view').onclick=api.lookToEntry;
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancel();api.setState(actExcavatorBuild(api.getState(),'stop-guide'));}});
  window.addEventListener('pagehide',cancel);
  const guide={
    suspend(){cancel();wasGuide=false;api.clear();api.setState({...api.getState(),guide:null});},
    onAction(action){if(action!=='build-cycle'){cancel();api.setState(actExcavatorBuild(api.getState(),'stop-guide'));}return false;},
    rate:()=>!pending&&api.getState().guide&&$('fast-preview').checked?8:1,
    step(s,input,dt){
      if(Object.values(input).some(Boolean)){cancel();return stepExcavatorBuild(s,input,dt);}
      if(pending)return s;
      if(s.guide?.phase==='plan-haul'){request('plan-haul');return api.getState();}
      if(!s.guide&&wasGuide){wasGuide=false;if(repeat&&!s.action&&s.loader.mode==='working'&&!s.hit){request('build-cycle');return api.getState();}}
      return stepExcavatorBuild(s,input,dt);
    },
    refresh(s){const p=buildProgress(s);$('build-progress').value=p.removed;$('progress-label').textContent=`${p.removed} / ${p.required}`;
      $('build-phase').textContent=pending?'経路確認中':({approach:'掘削面へ移動',cut:'すくい込み',haul:'受け箱へ運搬',dump:'排土・落下を確認',stow:'腕を格納',drive:'位置取りの走行','plan-haul':'排土経路の確認'})[s.guide?.phase]||(p.done?(s.load?'残った土を受け箱へ運びます':'掘削完了 → 通路を空けて降車'):'設計図の床・天井を残して掘ります');
      $('build-cycle').textContent=s.load?'積んだ土を排出':p.done?'通路を空ける':'1回すくって排土';$('build-cycle').disabled=!canEdit()||!!pending||!!s.guide||!!s.action||s.loader.mode!=='working';$('stop-guide').disabled=!pending&&!s.guide;
      $('debug').textContent+=`\n施工 ${JSON.stringify(p)} / 補助 ${s.guide?.phase||'なし'} / 計算 ${!!pending}\n車両 X ${s.loader.vehicle.x.toFixed(2)} / Z ${s.loader.vehicle.z.toFixed(2)}`;
    }
  };return decorate?decorate(api,guide):guide;
}});
}
if(!document.body.hasAttribute('data-excavation-save'))startExcavatorBuildView();
