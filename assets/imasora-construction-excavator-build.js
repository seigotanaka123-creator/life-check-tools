// Optional construction assistance: physical poses, finite cuts and real soil transport.
import {initialExcavatorWalk,actExcavatorWalk,stepExcavatorWalk} from './imasora-construction-excavator-walk.js';
import {armPose,armIntersections,EX,BIN,cellCenter,scoopTargets,solveBucketPose,scoopPoseAt,stickExtensionLimit,bucketOpenLimit} from './imasora-construction-excavator.js';
import {isBackhoe,isContactDig} from './imasora-construction-excavator-bucket.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function tunnelPlan(){const mask={};for(let x=1;x<7;x++)for(let z=6;z<16;z++)for(let y=z<8?-1:-2;y<(z<12?3:2);y++)mask[`${x},${y},${z}`]=true;return mask;}
export function initialExcavatorBuild(){const s=initialExcavatorWalk('dig');s.cutMask=tunnelPlan();s.loader.vehicle.x=16;s.loader.vehicle.z=-37;s.loader.player.x=-42;s.loader.player.z=-45;s.arm={boom:.95,stick:-.8,curl:0,slew:0};s.positionedRow=6;s.guide=null;s.message='未掘削から作ります。乗車→作業モード→「1回すくって排土」で、次の掘削位置へ機械的に動きます。';return s;}
export function buildProgress(s){const required=Object.keys(s.cutMask).length,remaining=Object.keys(s.cutMask).filter(id=>s.terrain[id]).length;return{required,remaining,removed:required-remaining,done:remaining===0};}
export const inverseBucket=solveBucketPose;
export function dumpContained(s,arm){
  // Check the entire release arc plus each piece's existing spread, not just
  // the curled center. Otherwise soil can land outside and block later trips.
  for(let i=0;i<=32;i++){const t=(isContactDig(s)?.3:.38)+(isContactDig(s)?.7:.62)*i/32,e=t*t*(3-2*t),curl=arm.curl+(bucketOpenLimit(s)-arm.curl)*e,p=armPose({...s,arm:{...arm,curl}}).bucket;
    if(Math.abs(p.x-BIN.x)+3>=BIN.width/2-5||Math.abs(p.z-BIN.z)+1.5>=BIN.depth/2-5)return false;
  }return true;
}
export function scoopStrokeClear(s){
  const center=armPose(s).bucket,targets=scoopTargets(s),terrain={...s.terrain};let before=armIntersections(s,.3);
  for(let i=1;i<=80;i++){const t=i/80,arm=scoopPoseAt(s,center,s.arm.curl,t);if(!arm)return false;
    if(t>=.48)for(const target of targets)if(target.kind==='terrain')delete terrain[target.id];
    const hits=armIntersections({...s,terrain,arm},.3);if([...hits].some(id=>!before.has(id)))return false;before=hits;
  }return true;
}
const delta=(a,b)=>Math.max(...['boom','stick','slew'].map(k=>Math.abs(a[k]-b[k])));
export function armSegmentClear(s,a,b){
  const count=Math.max(1,Math.ceil(delta(a,b)/.003));let before=armIntersections({...s,arm:a},.3);
  for(let i=1;i<=count;i++){const t=i/count,arm={...a};for(const k of ['boom','stick','slew'])arm[k]=a[k]+(b[k]-a[k])*t;
    const hits=armIntersections({...s,arm},.3);if([...hits].some(h=>!before.has(h)))return false;before=hits;
  }return true;
}
// Bidirectional joint-space search. Both ends and every connecting segment use
// the same collision query as the hydraulic controller (never ghost the arm).
export function searchArmPath(s,end){
  const keys=['boom','stick','slew'],distance=(a,b)=>Math.hypot(...keys.map(k=>a[k]-b[k]));
  const trees=[[{arm:s.arm,parent:-1}],[{arm:end,parent:-1}]];let seed=19731;
  const random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
  const extend=(tree,target)=>{
    let nearest=0,best=Infinity;for(let i=0;i<tree.length;i++){const d=distance(tree[i].arm,target);if(d<best){best=d;nearest=i;}}
    if(best<1e-8)return nearest;const from=tree[nearest].arm,t=Math.min(1,.16/best),arm={...from};for(const k of keys)arm[k]=from[k]+(target[k]-from[k])*t;
    if(!armSegmentClear(s,from,arm))return -1;tree.push({arm,parent:nearest});return tree.length-1;
  };
  const trace=(tree,i)=>{const path=[];while(i>=0){path.push(tree[i].arm);i=tree[i].parent;}return path.reverse();};
  for(let iteration=0;iteration<1800;iteration++){
    const side=iteration%2,a=trees[side],b=trees[1-side],sample=iteration%5===0?b[0].arm:{...s.arm,boom:EX.boomMin+random()*(EX.boomMax-EX.boomMin),stick:-2.55+random()*(stickExtensionLimit(s)+2.55),slew:(random()*2-1)*EX.slewLimit};
    const ai=extend(a,sample);if(ai<0)continue;let bi=-1;
    for(let j=0;j<32;j++){bi=extend(b,a[ai].arm);if(bi<0)break;if(distance(b[bi].arm,a[ai].arm)<1e-7){
      const path=side===0?[...trace(a,ai),...trace(b,bi).reverse().slice(1)]:[...trace(b,bi),...trace(a,ai).reverse().slice(1)];
      // Remove detours only when the complete shortcut is collision-free.
      const short=[path[0]];for(let i=0;i<path.length-1;){let j=path.length-1;while(j>i+1&&!armSegmentClear(s,path[i],path[j]))j--;short.push(path[j]);i=j;}return short.slice(1);
    }}
  }return null;
}
export function posePath(s,target){
  const end=inverseBucket(s,target);if(!end)return null;
  const existing=armIntersections(s);if([...armIntersections({...s,arm:end})].some(h=>!existing.has(h)))return null;
  if(armSegmentClear(s,s.arm,end))return[end];
  return searchArmPath(s,end);
}
export function nextCut(s){
  const cells=Object.keys(s.cutMask).filter(id=>s.terrain[id]).map(id=>s.terrain[id]).sort((a,b)=>a[2]-b[2]||b[1]-a[1]||Math.abs(a[0]-4)-Math.abs(b[0]-4));
  for(const cell of cells){
    if(cell[2]>cells[0][2])break;
    const c=cellCenter(cell);
    const minY=cell[2]===6?7:cell[2]<=9?-1:-9;
    const candidates=[];
    // The inward-facing bucket approaches exposed top faces from above first.
    // Existing checkpoints keep their original path and attachment geometry.
    if(isBackhoe(s)&&!s.terrain[`${cell[0]},${cell[1]+1},${cell[2]}`])for(const y of[c.y+16,c.y+14,c.y+12])for(const z of[c.z,c.z-4,c.z-8])candidates.push({x:clamp(c.x,20,44),y,z});
    for(const x of [...new Set([clamp(c.x,14.5,49.5),clamp(c.x,20,44),clamp(c.x-8,14.5,49.5),clamp(c.x+8,14.5,49.5)])])for(const y of [...new Set([Math.max(minY,c.y),clamp(c.y,minY,9),7,3,0,-3,-6,-9,minY])])for(const offset of [12,10.5,14,8,6.5,4])candidates.push({x,y,z:c.z-offset});
    for(const p of candidates){
      const arm=inverseBucket(s,p);if(!arm)continue;const probe={...s,arm};if(armIntersections(probe,.3).size||!scoopTargets(probe).some(t=>t.id===cell.join(','))||!scoopStrokeClear(probe))continue;
      const path=posePath(s,p);if(path)return{path,cell:cell.join(','),point:p};
    }
  }
  if(!cells.length)return null;
  // Narrow openings can fall between coarse approach samples. Search the
  // exposed front surface, not arbitrary cells inside the bank.
  const row=cells[0][2],face=row*8;
  for(const y of [20,12,9,7,3,0,-3,-6,-9,18,16,14,10,8,6,5,4,2,1,-1,-2,-4,-5,-7,-8])for(let x=14.5;x<=49.5;x+=2.5)for(const z of [face-6.5,face-8,face-10,face-12]){
    const point={x,y,z},arm=inverseBucket(s,point);if(!arm)continue;const probe={...s,arm};if(armIntersections(probe,.3).size)continue;
    const targets=scoopTargets(probe),target=targets.find(t=>t.kind==='terrain'&&s.terrain[t.id][2]===row);if(!target||!scoopStrokeClear(probe))continue;
    const path=posePath(s,point);if(path)return {path,point,cell:target.id};
  }
  return null;
}
export function actExcavatorBuild(s,action){
  if(action==='plan-haul')return s.guide?.phase==='plan-haul'?actExcavatorBuild({...s,guide:null},'build-cycle'):s;
  if(action==='stop-guide'||action==='home')return action==='home'?{...actExcavatorWalk(s,action),guide:null}:{...s,guide:null,message:'施工補助を停止しました。土とアームの位置は保持します。'};
  if(action==='build-cycle'){
    if(s.loader.mode!=='working'||s.action||s.guide)return{...s,message:'停車して作業モードにしてください。動作中の予約はしません。'};
    if(isContactDig(s)&&!s.load){const n=actExcavatorWalk(s,'scoop');return n.action?{...n,guide:{phase:'contact-cut'}}:n;}
    if(s.load){const points=isBackhoe(s)?[{x:-82,y:42,z:4},{x:-82,y:42,z:-6},{x:-78,y:36,z:4},{x:-78,y:36,z:-8},{x:-86,y:36,z:4},{x:-86,y:36,z:0}]:[{x:-94,y:55,z:4}];let path=null;for(const p of points){const arm=inverseBucket(s,p);if(!arm||(isBackhoe(s)&&!dumpContained(s,arm)))continue;path=posePath(s,p);if(path)break;}return path?{...s,guide:{phase:'haul',path,index:0},message:'積載済みの土を受け箱へ運びます。'}:{...s,message:'排土経路が塞がっています。先端を上げて確認してください。'};}
    const remaining=Object.keys(s.cutMask).filter(id=>s.terrain[id]),row=Math.min(...remaining.map(id=>s.terrain[id][2])),targetZ=remaining.length?(row>=14?-13:row>=12?3:row>=8?-13:-37):-75;
    if(Math.abs(s.loader.vehicle.z-targetZ)>.3&&(!remaining.length||s.positionedRow!==row)){
      if(Math.abs(s.loader.vehicle.heading)>.001)return {...s,message:'位置取り補助は車体を入口へまっすぐ向けて使ってください。'};
      const end={...s.arm,boom:1.15,stick:-1.25,slew:0},path=armSegmentClear(s,s.arm,end)?[end]:searchArmPath(s,end);
      return path?{...s,guide:{phase:'stow',path,index:0,targetZ,row},message:remaining.length?'届く位置へ移動します。腕を上げて正面へ戻します。':'掘削完了。通路を空けるため腕を戻して後退します。'}:{...s,message:'走行姿勢への経路が塞がっています。腕を手動で上げてください。'};
    }
    const cut=nextCut(s);
    if(!cut&&remaining.length&&Math.abs(s.loader.vehicle.heading)<.001){
      // A low roof needs a flatter arm; moving closer is not always the answer.
      // Preview reachable cuts at alternative safe stopping positions first.
      const stowed={...s.arm,boom:1.15,stick:-1.25,slew:0};
      for(const z of [-37,-29,-21,-13,-9,-5,-1,3]){
        if(Math.abs(z-s.loader.vehicle.z)<.4)continue;
        const probe={...s,arm:stowed,loader:{...s.loader,vehicle:{...s.loader.vehicle,z}}};
        if(armIntersections(probe,.3).size||!nextCut(probe))continue;
        const path=armSegmentClear(s,s.arm,stowed)?[stowed]:searchArmPath(s,stowed);
        if(path)return{...s,guide:{phase:'stow',path,index:0,targetZ:z,row},message:'天井や側壁に当たらない角度にするため、少し位置を取り直します。'};
      }
    }
    if(!cut)return{...s,message:buildProgress(s).done?'掘削範囲が完成しました。土を排出して車両を下げ、降車してください。':'次の掘削位置への経路が塞がっています。手動で腕の姿勢を変えてください。'};
    return{...s,guide:{phase:'approach',...cut,index:0,row},message:'入口側から順番に、次の掘削面へバケットを運びます。'};
  }
  if(s.guide)return{...s,message:'施工補助を止めてから手動操作へ切り替えてください。'};
  return actExcavatorWalk(s,action);
}
export function stepExcavatorBuild(s,input,dt){
  if(!Number.isFinite(dt)||dt<=0||dt>.05)throw Error('更新刻みが不正です');
  if(!s.guide)return stepExcavatorWalk(s,input,dt);
  if(Object.values(input).some(Boolean))return stepExcavatorWalk({...s,guide:null},input,dt);
  let n=s,g={...s.guide};
  if(g.phase==='drive'){
    const dist=g.targetZ-s.loader.vehicle.z,speed=s.loader.vehicle.speed;
    if(Math.abs(dist)<.3&&Math.abs(speed)<.8)return {...s,positionedRow:g.row,loader:{...s.loader,mode:buildProgress(s).done?'driving':'working',vehicle:{...s.loader.vehicle,speed:0}},guide:null,message:buildProgress(s).done?'通路を空けました。「降りる」で降車し、入口から歩いて確かめてください。':'位置取りができました。次の1回を掘れます。'};
    const wanted=Math.sign(dist)*Math.min(12,Math.sqrt(2*130*Math.abs(dist)),Math.abs(dist)/dt),brake=Math.abs(speed)>Math.abs(wanted)+.2||speed*dist<0;
    n=stepExcavatorWalk(s,{throttle:wanted/(wanted>=0?100:48),brake},dt);
    if(n.loader.hit||n.hit)return {...n,guide:null,message:'移動経路で接触したため停止しました。周囲を確認してください。'};
    return {...n,guide:g};
  }
  if(s.loader.mode!=='working')return stepExcavatorWalk({...s,guide:null},input,dt);
  if(g.phase==='plan-haul')return stepExcavatorWalk(s,{},dt);
  if(g.phase==='contact-cut'){
    n=stepExcavatorWalk(s,{},dt);if(n.action)return{...n,guide:g};
    return n.load?{...n,guide:{phase:'plan-haul'},message:`${n.load}個の土を保持しました。接触しない排土経路を確認します。`}:{...n,guide:null};
  }
  if(['approach','haul','stow'].includes(g.phase)){
    const end=g.path[g.index];if(!g.segment)g.segment={from:{...s.arm},elapsed:0,duration:Math.max(.01,Math.abs(end.boom-s.arm.boom)/.5,Math.abs(end.stick-s.arm.stick)/.65,Math.abs(end.slew-s.arm.slew)/.62)};
    g.segment={...g.segment,elapsed:Math.min(g.segment.duration,g.segment.elapsed+dt)};const t=g.segment.elapsed/g.segment.duration,target={...end};for(const k of ['boom','stick','slew'])target[k]=g.segment.from[k]+(end[k]-g.segment.from[k])*t;
    const controls={coordinated:true,boom:clamp((target.boom-s.arm.boom)/(.5*dt),-1,1),stick:clamp((target.stick-s.arm.stick)/(.65*dt),-1,1),slew:clamp((s.arm.slew-target.slew)/(.62*dt),-1,1)};
    n=stepExcavatorWalk(s,controls,dt);
    if(n.hit)return{...n,guide:null,message:'施工補助の経路で接触しました。停止し、手動操作へ戻しました。'};
    if(t>=1&&delta(n.arm,end)<.001){g.index++;g.segment=null;if(g.index===g.path.length){
      if(g.phase==='stow'){n=actExcavatorWalk(n,'work');g={phase:'drive',targetZ:g.targetZ,row:g.row};}
      else {if(g.phase==='approach')n={...n,positionedRow:g.row};n=actExcavatorWalk(n,g.phase==='approach'?'scoop':'dump');if(!n.action)return{...n,guide:null};g={phase:g.phase==='approach'?'cut':'dump'};}
    }}
  }else{
    n=stepExcavatorWalk(s,{},dt);
    if(n.hit)return {...n,guide:null};
    if(!n.action){
      if(g.phase==='cut'){g={phase:'plan-haul'};n.message='土を保持したまま、排土経路を確認しています。';}
      else if(!n.falling.length)return{...n,guide:null,message:isContactDig(s)?'1回分を排土しました。次は掘りたい場所へ爪を合わせてください。':'1回分を排土しました。同じボタンで次の掘削へ進めます。'};
    }
  }return {...n,guide:g};
}
