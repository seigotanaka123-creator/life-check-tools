import {highSelected,highLocalPoint} from './imasora-construction-high-world.mjs?v=120fw';
import {TIMBER_YARDS} from './imasora-construction-yard-origins.mjs';
import {overlaps} from './imasora-construction-concrete/free-vehicle-shape.mjs';
export function assertEntranceDoorClear(world,action,draft){
 const r=highSelected(world.constructionHighBuild);if(!r)return;
 if(!(action.type==='START'&&['DOOR_INSTALL','DOOR_OPEN','DOOR_CLOSE'].includes(action.jobType))&&!(action.type==='UNDO'&&!r.work.entranceDoor&&r.work.history.at(-1)?.door))return;
 const blocked=p=>p.y+p.h/2>0&&p.y-p.h/2<36&&overlaps({x:-65,z:76,hx:33,hz:3,heading:0},{x:p.x,z:p.z,hx:p.w/2,hz:p.d/2,heading:p.angle??0});
 const t=world.constructionTimber,o=TIMBER_YARDS[t?.siteIndex];if(o&&(t.work?.parts??[]).some(p=>blocked({...p,...highLocalPoint(r.site,{x:o[0]+p.x,y:p.y+p.h/2,z:o[1]+p.z}),angle:(p.angle??0)-r.site.turn*Math.PI/2})))throw Error('とびらが動くところに木材があるよ。先に動かそう。');
 if(draft?.position){const p=highLocalPoint(r.site,{...draft.position,y:draft.groundY??0});if(blocked({x:p.x,y:p.y+13.6,z:p.z,w:27,h:27.2,d:27}))throw Error('とびらから少し離れよう。');}
}
