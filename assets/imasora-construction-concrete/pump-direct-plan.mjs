import {groundTile,groundHeight} from './ground-grid.mjs?v=120hb';
import {constructionBase} from './free-supported-build.mjs?v=120pv';
import {freePourLimit} from './design-levels.mjs?v=120hb';
import {castingProblem} from './free-casting.mjs?v=120pv';
import {highCastings} from './high-casting-state.mjs?v=120hc';
import {upperCastingCapacity,upperShapeTiles,upperLevelCasting,upperCastingHeight} from './high-casting-shape.mjs?v=120hb';
import {highProjects,highWorldPoint} from '../imasora-construction-high-world.mjs?v=120pv';
import {upperCastingLocal} from '../imasora-construction-high-casting.mjs?v=120pv';

// A view plan only. Every mutation still goes through the normal project writer.
export function pumpTargets(project,high){
 const f=project?.freeBuild;if(!f)return[];
 const targets=[];
 if(['framed','wet'].includes(f.stage))for(let cell=0;cell<16;cell++)if(f.mask&(1<<cell)){
  const t=groundTile(cell,f);targets.push({key:'ground:'+cell,kind:'ground',cell,x:f.location.x+t.x,y:constructionBase(f)+groundHeight(f,cell)+.2,z:f.location.z+t.z,w:t.w,d:t.d,fill:f.fill[cell],capacity:freePourLimit(f,cell),label:'地上の型枠'});
 }
 for(const c of highCastings(f))if(!c.stored&&['framed','wet'].includes(c.stage)){
  const record=highProjects(high).find(p=>p.id===c.anchor.buildingId)?.record;if(!record)continue;
  const local=upperCastingLocal(high,c.anchor),capacity=upperCastingCapacity(c);
  for(const tile of upperShapeTiles(c.shape)){
   const height=upperLevelCasting(c)?tile.height:upperCastingHeight(c),p=highWorldPoint(record.site,{x:local.x+tile.x,y:c.anchor.floor*40+height*c.fill/capacity+.2,z:local.z+tile.z});
   targets.push({key:'upper:'+c.id,kind:'upper',id:c.id,x:p.x,y:p.y,z:p.z,w:c.anchor.turn%2?tile.d:tile.w,d:c.anchor.turn%2?tile.w:tile.d,fill:c.fill,capacity,label:c.anchor.floor+'階の型枠',anchor:c.anchor});
  }
 }
 return targets;
}
export const pumpTargetVisible=(t,inspection)=>!inspection||t.kind!=='upper'||t.anchor.buildingId!==inspection.buildingId||t.anchor.floor<=inspection.floor;
export function pumpTargetViews(targets){return [...new Map(targets.map(t=>[t.kind==='ground'?'ground':t.key,t])).values()];}
const action=(type,label,extra={},animate=false)=>({type,label,extra,animate,reason:''});
export function pumpDirectStep(f,target,{drive=false}={}){
 if(!f||f.aboard!=='pump')return{label:'ポンプ車に乗ろう',reason:'',type:null};
 const pending=highCastings(f).find(c=>c.pending);
 if(pending)return action('FREE_HIGH_FLOW_CANCEL','注ぐのを止める');
 if(drive){
  if(f.highPipe)return action('FREE_HIGH_DISCONNECT','上階ホースを外す');
  if(f.hose)return action('FREE_DRAIN','生コンをタンクへ戻す');
  if(f.connected)return action('FREE_CONNECT','ホースをしまう',{connected:false},true);
  if(f.pump.legs)return action('FREE_LEGS','支持脚をしまう',{deployed:false},true);
  return{label:'運転へ',type:null,reason:'',done:true};
 }
 if(!f.pump.legs)return action('FREE_LEGS','車を固定する',{deployed:true},true);
 if(!f.connected)return action('FREE_CONNECT','ミキサーをつなぐ',{connected:true},true);
 if(!target)return{label:'型枠をタップ',reason:'注ぎたい型枠をえらぼう',type:null};
 if(target.kind==='ground'&&(!Number.isInteger(target.cell)||target.cell<0||target.cell>15||!(f.mask&(1<<target.cell))))return{label:'型枠をタップ',reason:'注ぎ先をえらび直そう',type:null};
 const c=target.kind==='upper'?highCastings(f).find(c=>c.id===target.id&&!c.stored&&['framed','wet'].includes(c.stage)):null;
 if(!['ground','upper'].includes(target.kind)||target.kind==='upper'&&!c)return{label:'型枠をタップ',reason:'注ぎ先をえらび直そう',type:null};
 if((c?c.fill:f.fill[target.cell])>=(c?upperCastingCapacity(c):freePourLimit(f,target.cell)))return{label:'いっぱい！',reason:'別の型枠もタップでえらべるよ',type:null};
 if(f.highPipe&&(target.kind==='ground'||f.highPipe.castingId!==target.id))return action('FREE_HIGH_DISCONNECT','注ぎ先を切り替える');
 if(target.kind==='upper'&&!f.highPipe)return action('FREE_HIGH_CONNECT','上階へつなぐ',{castingId:target.id});
 const remainder=c&&upperLevelCasting(c)&&f.upperRemainder>0;
 if(!f.hose&&!remainder){if(f.wet<1)return{label:'生コンがないよ',reason:'ミキサー車で生コンを用意しよう',type:null};return action('FREE_PRIME','ホースに送る',{},true);}
 if(c)return action('FREE_HIGH_BEGIN','ここに注ぐ',{castingId:c.id});
 if(target.kind!=='ground'||!Number.isInteger(target.cell)||!(f.mask&(1<<target.cell)))return{label:'型枠をタップ',reason:'注ぎ先をえらび直そう',type:null};
 const reason=castingProblem(f,'pump',target.cell);
 return{...action('FREE_POUR','ここに注ぐ',{source:'pump',cell:target.cell},true),reason};
}

// No stale button can continue cleanup after a failed/cancelled normal write.
export async function stowPumpForDriving({read,ready,run}){
 for(let n=0;n<6;n++){
  if(!ready())return false;
  const step=pumpDirectStep(read(),null,{drive:true});if(step.done)return true;
  if(!step.type||!await run(step.type,step.extra,step.animate))return false;
 }
 return false;
}
