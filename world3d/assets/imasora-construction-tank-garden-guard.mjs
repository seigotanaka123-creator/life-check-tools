import{tankGardenPath}from'./imasora-construction-tank-garden.mjs?v=120ps';
import{outdoorSignObstacles}from'./imasora-construction-outdoor-sign-guard.mjs?v=120pv';
import{gardenItems,gardenParts}from'./imasora-construction-garden.mjs?v=120ps';
import{lightItems,lightParts}from'./imasora-construction-lights.mjs?v=120pl';
import{outdoorSignItems,outdoorSignParts}from'./imasora-construction-outdoor-signs.mjs';
import{upperSegmentHitsBox}from'./imasora-construction-high-casting.mjs?v=120pv';
import{transportGroundHeightReader}from'./imasora-construction-transport-site.mjs?v=120pv';
const ok=(v,m)=>{if(!v)throw Error(m);};
export function assertTankGardenAction(world,a,draft){if(a.type!=='TANK_GARDEN_WATER')return null;const p=draft?.position,plan=tankGardenPath(world.constructionHighBuild,a);ok(draft.map==='construction'&&p&&[p.x,p.y,p.z].every(Number.isFinite)&&!draft.ufoBoarded&&Math.hypot(p.x-plan.tank.x,p.z-plan.tank.z)<200&&Math.abs(p.y-plan.room.y)<16,'タンクの近くへ歩いてから水をあげよう。');const c=world.constructionHighBuild,boxes=outdoorSignObstacles(world).concat(gardenItems(c).flatMap(gardenParts),lightItems(c).flatMap(lightParts),outdoorSignItems(c).flatMap(outdoorSignParts)),ground=transportGroundHeightReader(world.constructionTransport);for(let n=1;n<plan.points.length;n++){const from=plan.points[n-1],to=plan.points[n];ok(!boxes.some(b=>!(n===1&&b.id==='reel-'+a.roomId+'-detail-'+a.tankId+'-furniture-outlet')&&upperSegmentHitsBox(from,to,b,.7)),'ホースの通り道がふさがっているよ。タンクの出口を庭へ向けよう。');for(let k=0;k<=2;k++){const f=k/2,x=from.x+(to.x-from.x)*f,z=from.z+(to.z-from.z)*f,y=from.y+(to.y-from.y)*f;ok(y>(ground(x,z)??0)+.7,'ホースが地面に当たるよ。庭の近くへ置こう。');}}return plan;}
