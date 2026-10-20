import{isKitCargo,kitTemplate,validateKitBinding,kitPad,kitOnPad,kitHandlingGeometry}from'./imasora-construction-kit-cargo.mjs?v=120gm';
import{highProjects,highWorldPoint,highWorldGeometry,validateHighWorld}from'./imasora-construction-high-world.mjs?v=120gn';
import{highPlanScale}from'./imasora-construction-high-interior.mjs?v=120gn';
import{validateHighBuild,beginHighJob,advanceHighJob,finishHighJob,highJobPlan,highRouteSeconds}from'./imasora-construction-high-build.mjs?v=120gn';
import{TIMBER_YARDS,validateWorldTimber,worldTimberMaterialObstacles}from'./imasora-construction-world-timber.js?v=120gn';
import{timberPhysicsState,refreshTimberLedger}from'./imasora-construction-purchased-timber.js?v=120gn';
import{craneGroundContext,craneGroundObstacles}from'./imasora-construction-crane-ground.mjs?v=120gf';
import{actCrane,pickOption,collides,tip,CRANE}from'./imasora-construction-crane.js?v=120gn';
import{polygon,polygonsOverlap}from'./imasora-construction-loader-physics.js?v=120gf';
import{transportGroundHeightAt}from'./imasora-construction-transport-site.mjs?v=120gn';
import{boardLiftWorldObstacles}from'./imasora-construction-board-lift-guard.mjs?v=120gn';
const ok=(v,m)=>{if(!v)throw Error(m);},eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const origin=t=>({x:TIMBER_YARDS[t.siteIndex][0],z:TIMBER_YARDS[t.siteIndex][1]});
export function assertBuildingKitWorld(world){
 const t=world.constructionTimber,kits=t?.work.buildingKits??[],projects=highProjects(world.constructionHighBuild);
 for(const b of kits){validateKitBinding(b);const r=projects.find(p=>p.id===b.projectId)?.record;
  ok(r&&r.work.kit==='made'&&!r.work.job&&r.work.kitModelVersion===1&&r.work.craneKit?.partId===b.partId&&r.work.craneKit.version===1&&b.level===r.work.levels+1&&b.scale===highPlanScale(r.work),'建物とクレーンのキットが一致しないため、記録を保護したよ。');
  const p=t.work.parts.find(p=>p.id===b.partId);ok(p&&isKitCargo(p)&&!p.hover&&!p.carrierId,'運んでいる建築キットを残そう。');
  const height=(x,z)=>transportGroundHeightAt(world.constructionTransport,x+origin(t).x,z+origin(t).z)??0,context=craneGroundContext(t.work,height),posed={...timberPhysicsState(t.work),...(context?{groundPose:context}:{})};ok(!collides(posed,p,{external:craneGroundObstacles(posed,kitObstacles(world,world.constructionHighBuild,t),height)}),'建築キットの周りの柱や車体を残そう。');
 }
 for(const p of projects)if(p.record.work.craneKit)ok(kits.some(b=>b.projectId===p.id&&b.partId===p.record.work.craneKit.partId),'建物のキットを消さずに渡そう。');return true;
}
export function kitHandlingObstacles(collection,o){const all=[];for(const p of highProjects(collection)){const g=kitHandlingGeometry(p.record.work),a=p.record.site.turn*Math.PI/2;for(const b of g.boxes){const q=highWorldPoint(p.record.site,b);all.push({...b,x:q.x-o.x,y:q.y-b.h/2,z:q.z-o.z,angle:a});}for(const b of g.surfaces){const q=highWorldPoint(p.record.site,b);all.push({...b,x:q.x-o.x,y:q.y-2,z:q.z-o.z,h:2,angle:a});}}return all;}
export function assertKitSupportChange(world,nextHigh){const t=world.constructionTimber;if(!t?.work.parts.length)return true;const o=origin(t);for(const old of highProjects(world.constructionHighBuild)){const b=kitHandlingGeometry(old.record.work).boxes.find(b=>b.kind==='kit-repacked-material');if(!b)continue;const next=highProjects(nextHigh).find(p=>p.id===old.id),after=next&&kitHandlingGeometry(next.record.work).boxes.find(b=>b.kind==='kit-repacked-material');if(eq(b,after))continue;const q=highWorldPoint(old.record.site,b),foot=polygon({x:q.x,z:q.z,heading:old.record.site.turn*Math.PI/2},b.w,b.d);for(const p of t.work.parts)if(p.fixed&&Math.abs(p.y-q.y-b.h/2)<.05&&polygonsOverlap(foot,polygon({x:p.x+o.x,z:p.z+o.z,heading:p.angle},p.w,p.d)))throw Error('キットの上の荷物を先に降ろそう。');}return true;}
function replaceProject(collection,id,record){if(collection.version!==2)return record;return{...collection,revision:collection.revision+1,projects:collection.projects.map(p=>p.id===id?{...p,record}:p)};}
function kitObstacles(world,high,t){const o=origin(t),g=highWorldGeometry(high),record=highProjects(high)[0]?.record,raw=[...g.boxes.map(b=>({...b,x:b.x-o.x,y:b.y-b.h/2,z:b.z-o.z,angle:b.angle??g.angle})),...g.surfaces.map(b=>({...b,x:b.x-o.x,y:b.y-2.5,z:b.z-o.z,h:2.5,angle:b.angle??g.angle})),...(record?boardLiftWorldObstacles(world,record,o):[])];return worldTimberMaterialObstacles(t.work.rig,raw);}
export function kitPickupOption(world,projectId){try{
 const t=world.constructionTimber,r=highProjects(world.constructionHighBuild).find(p=>p.id===projectId)?.record,w=r?.work;
 ok(t&&w&&w.kit==='made'&&!w.job&&!w.craneKit&&w.actor.y===0,'地上で部材をつくってから、キットを吊ろう。');
 ok(!t.work.held&&!t.work.rotation&&!t.work.joining&&!t.work.rig.transition&&t.work.rig.mode==='driving'&&t.work.work&&t.work.deployment===1&&Math.abs(t.work.rig.vehicle.speed)<.01,'停車して支持脚を開き、ほかの荷物を置こう。');
 ok(!t.work.buildingKits?.length&&t.work.parts.length<8,'先に運んでいるキットを渡そう。荷物は8個までだよ。');
 const b={version:1,partId:'building-kit-preview-00000000',projectId,level:w.levels+1,scale:highPlanScale(w)},o=origin(t),q=highWorldPoint(r.site,kitPad(w,true)),p={...kitTemplate(b),x:q.x-o.x,y:q.y,z:q.z-o.z,angle:r.site.turn*Math.PI/2,vx:0,vy:0,vz:0,fixed:true,hover:null,carrierId:null};
 const height=(x,z)=>transportGroundHeightAt(world.constructionTransport,x+o.x,z+o.z)??0,context=craneGroundContext(t.work,height),candidate={...timberPhysicsState(t.work),...(context?{groundPose:context}:{}),parts:[...t.work.parts,p]};
 ok(r.site.y+w.levels*40<=tip({...candidate,boom:{...candidate.boom,reach:CRANE.maxReach,cable:4}}).y-p.h-8+.001,'この階はクレーンが届かないよ。建物のリフトで部材を上げよう。');
 ok(pickOption(candidate)?.id===p.id,'建物の作業台の真上へフックを近づけ、巻き下げよう。');
 const future={...r,work:{...w,kitModelVersion:1,craneKit:{version:1,partId:p.id}}},high=replaceProject(world.constructionHighBuild,projectId,future),ext=craneGroundObstacles(candidate,kitObstacles(world,high,t),height);
 ok(!collides(candidate,p,{external:ext}),'作業台の周りをあけてからキットを吊ろう。');
 return{ok:true,reason:'確保済みの建築キットを吊るよ。追加の木材は使わないよ。',binding:b,part:p,physics:candidate,external:ext};
 }catch(e){return{ok:false,reason:e.message};}}
export function kitTransferOption(world,projectId,source=false){try{
 const t=world.constructionTimber,b=t?.work.buildingKits?.find(b=>b.projectId===projectId),r=highProjects(world.constructionHighBuild).find(p=>p.id===projectId)?.record,p=t?.work.parts.find(p=>p.id===b?.partId);
 ok(b&&r&&p,'先に建築キットを吊ろう。');ok(!t.work.held&&!t.work.rotation&&!t.work.joining&&!t.work.rig.transition&&p.fixed&&!p.hover&&!p.carrierId&&Math.hypot(p.vx,p.vy,p.vz)<.01,'受取台へキットを置き、吊り索を外そう。');
 ok(kitOnPad(p,r.site,r.work,origin(t),source),source?'元の建物の作業台へキットを戻そう。':'建物の黄色いキット受取台へ置こう。');
 ok(!t.work.parts.some(q=>q.id!==p.id&&Math.abs(q.y-p.y-p.h)<.05&&Math.hypot(q.x-p.x,q.z-p.z)<Math.hypot(p.w,p.d)+Math.hypot(q.w,q.d)),'キットの上の荷物を先に降ろそう。');
 return{ok:true,reason:source?'作業台へキットを戻すよ。':'この建物にキットを渡すよ！',binding:b,part:p,record:r};
 }catch(e){return{ok:false,reason:e.message};}}
export function transferBuildingKit(world,a){
 ok(a&&Object.keys(a).sort().join('|')==='id|projectId|type'&&['PICK','GIVE','RETURN'].includes(a.type)&&/^[\w-]{8,90}$/.test(a.id),'キットの受け渡しをえらび直そう。');assertBuildingKitWorld(world);
 const t=structuredClone(world.constructionTimber),r=highProjects(world.constructionHighBuild).find(p=>p.id===a.projectId)?.record;ok(t&&r,'建物とクレーンを用意しよう。');let w=structuredClone(r.work),kit;
 if(a.type==='PICK'){
  const q=kitPickupOption(world,a.projectId);ok(q.ok,q.reason);const b={...q.binding,partId:'building-kit-'+a.id},p={...q.part,...kitTemplate(b)};
  const candidate={...q.physics,parts:[...t.work.parts,p]},picked=actCrane(candidate,'pick',q.external);ok(picked.held===p.id,'フックをキットの真上へ近づけよう。');
  t.work.boom=picked.boom;t.work.parts=picked.parts;t.work.held=p.id;t.work.buildingKits=[b];t.work.revision++;
  w.craneKit={version:1,partId:p.id};w.kitModelVersion=1;w.revision++;kit=p;
 }else{
  const q=kitTransferOption(world,a.projectId,a.type==='RETURN');ok(q.ok,q.reason);kit=q.part;t.work.parts=t.work.parts.filter(p=>p.id!==kit.id);delete t.work.buildingKits;t.work.revision++;
  delete w.craneKit;
  if(a.type==='GIVE'){w=beginHighJob(w,'LIFT');const plan=highJobPlan(w,'LIFT');w=finishHighJob({...w,job:{...w.job,elapsed:highRouteSeconds(plan.route)+plan.work}});}else w.revision++;
 }
 t.revision++;t.work.message=a.type==='GIVE'?'キットを渡したよ！ 建物で「組み立てる」を選ぼう。':a.type==='RETURN'?'元の作業台へキットを戻したよ。':'建築キットを吊ったよ！ 黄色い受取台へ運ぼう。';refreshTimberLedger(t.work);
 const high=replaceProject(world.constructionHighBuild,a.projectId,{...r,revision:r.revision+1,work:w});
 validateHighWorld(high);validateWorldTimber(t,t.work.source.total*26880);assertBuildingKitWorld({...world,constructionHighBuild:high,constructionTimber:t});
 return{high,timber:t};
}
