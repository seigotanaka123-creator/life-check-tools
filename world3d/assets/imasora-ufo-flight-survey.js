// Local development measurements only. No storage, networking, rewards or flight controls.
const number=n=>Number.isFinite(n)?n:0;
export class UfoFlightSurvey {
  constructor({now=()=>performance.now(),limit=8}={}){this.now=now;this.limit=limit;this.records=[];this.current=null;this.mission=null;this.hiddenAt=null;}
  begin(m,equipment={}){
    if(this.current?.outcome==='flying')this.finish(this.mission,'interrupted');
    const now=this.now();this.mission=m;this.hiddenAt=null;
    this.current={id:(this.records.at(-1)?.id||0)+1,route:m.route.id,origin:m.route.originName,destination:m.route.destinationName,
      seed:m.routeSeed>>>0,targetSeconds:m.totalDurationSeconds,cruiseTargetSeconds:m.cruiseDurationSeconds,
      preview:!!m.marsAtmospherePreviewTest||m.departurePreviewSpeed!==1,energyEnabled:!!m.energySystemEnabled,
      saveExcluded:!!m.testMode,equipment:structuredClone(equipment),outcome:'flying',phase:m.phase,
      startedAt:now,endedAt:null,wallSeconds:0,cruiseSeconds:0,progress:0,initialEnergy:m.energy,remainingEnergy:m.energy,
      propulsion:0,collision:0,recovered:0,overflow:0,energyStars:0,coins:0,materials:0,
      coinTargets:m.pickups.filter(p=>p.typeId==='coin').length,materialTargets:m.pickups.filter(p=>p.typeId==='material').length,
      fireActions:0,projectiles:0,lockedProjectiles:0,hits:0,contacts:0,frames:0,maxFrameGap:0,slowFrames:0,
      hiddenSeconds:0,lastFrameAt:null};
    this.records.push(this.current);while(this.records.length>this.limit)this.records.shift();
    return this.snapshot();
  }
  active(m){return !!this.current&&this.mission===m&&this.current.outcome==='flying';}
  sample(m){
    if(!this.active(m))return;
    const r=this.current;r.phase=m.phase;r.wallSeconds=Math.max(0,(this.now()-r.startedAt)/1000);
    r.cruiseSeconds=number(m.cruiseElapsed);r.progress=Math.max(0,Math.min(1,number(m.progressDistance)/Math.max(1,number(m.routeLength))));
    r.remainingEnergy=m.energy;r.coins=number(m.coinsCollected);r.materials=number(m.materialsCollected);r.contacts=number(m.pickupCollisionCount)+number(m.hazardHits);
    // Changing equipment or disabling energy during a run makes it a comparison, not an unmodified baseline.
    if(!m.energySystemEnabled)r.energyEnabled=false;
  }
  frame(m){
    if(!this.active(m))return;const r=this.current,now=this.now();
    if(r.lastFrameAt!==null&&this.hiddenAt===null){const gap=Math.max(0,(now-r.lastFrameAt)/1000);r.maxFrameGap=Math.max(r.maxFrameGap,gap);if(gap>.25)r.slowFrames++;}
    r.lastFrameAt=now;r.frames++;this.sample(m);
  }
  energy(m,kind,before,after,requested=0){
    if(!this.active(m))return;const r=this.current;
    if(kind==='recovery'){const gain=Math.max(0,after-before);r.recovered+=gain;r.overflow+=Math.max(0,requested-gain);r.energyStars++;}
    else if(kind==='propulsion'||kind==='collision')r[kind]+=Math.max(0,before-after);
  }
  fire(m,count,locked){if(!this.active(m))return;const r=this.current;r.fireActions++;r.projectiles+=count;if(locked)r.lockedProjectiles+=count;}
  hit(m){if(this.active(m))this.current.hits++;}
  equipmentChanged(){if(this.current?.outcome==='flying')this.current.equipmentChanged=true;}
  visibility(hidden){
    if(this.current?.outcome!=='flying')return;
    if(hidden&&this.hiddenAt===null)this.hiddenAt=this.now();
    if(!hidden&&this.hiddenAt!==null){this.current.hiddenSeconds+=Math.max(0,(this.now()-this.hiddenAt)/1000);this.hiddenAt=null;this.current.lastFrameAt=null;}
  }
  finish(m,outcome){
    if(!this.active(m))return;this.sample(m);this.visibility(false);this.current.outcome=outcome;this.current.endedAt=this.now();
  }
  snapshot(){
    return this.records.map(r=>{
      const record=structuredClone(r);delete record.lastFrameAt;
      record.energyError=record.initialEnergy+record.recovered-record.propulsion-record.collision-record.remainingEnergy;
      record.fps=record.frames/Math.max(.001,record.wallSeconds-record.hiddenSeconds);
      record.normalRules=record.energyEnabled&&!record.preview&&!record.equipmentChanged;
      return record;
    });
  }
}

const format=n=>(Math.abs(number(n))<.05?0:number(n)).toFixed(1);
const outcomeName={flying:'航行中',arrived:'到着',empty:'エネルギー切れ',interrupted:'途中終了'};
export function flightSurveyText(r){
  if(!r)return 'まだ航行記録はありません。上の「宇宙で実機テスト」から出発してください。';
  return [
    `${r.origin} → ${r.destination} ｜ ${outcomeName[r.outcome]||r.outcome} ｜ シード ${r.seed}`,
    `${r.normalRules?'通常ルール':'演出短縮・条件変更あり（価格実測から除外）'} ／ ${r.saveExcluded?'試験航行・本体へ獲得物を追加しません':'通常航行'}`,
    `出発から ${format(r.wallSeconds)}秒 ／ 設定 ${r.targetSeconds}秒（巡航 ${format(r.cruiseSeconds)} / ${format(r.cruiseTargetSeconds)}秒）`,
    `宇宙金貨 ${r.coins}枚 ／ 素材 ${r.materials}個 ／ 補給星 ${r.energyStars}個`,
    `配置された小型星：金貨 ${r.coinTargets}個 ／ 素材 ${r.materialTargets}個（獲得数ではありません）`,
    `エネルギー：開始 ${format(r.initialEnergy)} ＋ 実補給 ${format(r.recovered)} − 移動 ${format(r.propulsion)} − 衝突 ${format(r.collision)} ＝ 残り ${format(r.remainingEnergy)}`,
    `満タンで余った補給 ${format(r.overflow)} ／ 衝突 ${r.contacts}回 ／ 収支誤差 ${format(r.energyError)}`,
    `発射操作 ${r.fireActions}回 ／ 発射弾 ${r.projectiles}発（追尾 ${r.lockedProjectiles}発）／ 命中 ${r.hits}発`,
    `更新頻度 約${format(r.fps)}回/秒 ／ 最大更新間隔 ${format(r.maxFrameGap)}秒 ／ 0.25秒超 ${r.slowFrames}回 ／ 非表示 ${format(r.hiddenSeconds)}秒`,
    `開始装備：タンク ${number(r.equipment.energyAbsorptionTankLevel)}段階 ／ ${r.equipment.simultaneousShotEnabled?'2発同時射撃':'通常射撃'} ／ 照準 ${format(r.equipment.lockOnReticleMultiplier||1)}倍 ／ 探知 ${format(r.equipment.lockOnDetectionMultiplier||1)}倍 ／ 金貨 ${format(r.equipment.coinGainMultiplier||1)}倍${r.equipmentChanged?'（途中変更あり）':''}`,
  ].join('\n');
}

export function createUfoFlightSurveyView(host,{enabled=false,now}={}){
  if(!enabled||!host)return null;
  const survey=new UfoFlightSurvey({now});host.hidden=false;
  host.innerHTML='<summary>航行計測（開発用）</summary><p>直近8航行をこの画面だけで記録します。財布・価格・難易度は変えません。再読込で記録は消えます。</p><label>表示する航行 <select aria-label="表示する航行記録"><option value="latest">最新の航行</option></select></label><pre aria-label="航行計測結果"></pre>';
  const select=host.querySelector('select'),output=host.querySelector('pre'),summary=host.querySelector('summary');
  let lastRender=-Infinity,recordIds='';
  function refresh(m,force=false){
    if(m)survey.sample(m);const time=survey.now();if(!force&&time-lastRender<500)return;lastRender=time;
    const records=survey.snapshot(),latest=records.at(-1),ids=records.map(r=>r.id).join(',');
    if(recordIds!==ids){const selected=select.value;select.replaceChildren(new Option('最新の航行','latest'));for(const r of records)select.add(new Option(`${r.id}：${r.origin}→${r.destination}`,String(r.id)));select.value=records.some(r=>String(r.id)===selected)?selected:'latest';recordIds=ids;}
    const shown=select.value==='latest'?latest:records.find(r=>String(r.id)===select.value);
    output.textContent=flightSurveyText(shown);summary.textContent=latest?`航行計測：${outcomeName[latest.outcome]}・金貨${latest.coins}枚`:'航行計測（開発用）';
  }
  select.addEventListener('change',()=>refresh(null,true));host.addEventListener('toggle',()=>refresh(null,true));
  document.addEventListener('visibilitychange',()=>survey.visibility(document.hidden));
  refresh(null,true);
  return {begin(m,e){survey.begin(m,e);survey.visibility(document.hidden);refresh(m,true);},frame:m=>survey.frame(m),
    energy:(...a)=>survey.energy(...a),fire:(...a)=>survey.fire(...a),hit:m=>survey.hit(m),
    equipmentChanged:()=>survey.equipmentChanged(),finish(m,outcome){survey.finish(m,outcome);refresh(null,true);},refresh};
}
