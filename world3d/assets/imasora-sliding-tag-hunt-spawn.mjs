import{worldHeight,worldValid,worldSight,worldRoute,worldCameraPose}from'./imasora-sliding-tag-hunt-world.mjs';
const points=[],cache=new Map(),pairs=new Map(),eyes=new Map();
for(let z=-208;z<=208;z+=32)for(let x=-288;x<=288;x+=32){const p={x,z,y:worldHeight(x,z)};if(worldValid(p,6.2))points.push(p);}
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function eye(a){const key=a.x+':'+a.z;if(!eyes.has(key))eyes.set(key,worldCameraPose({...a,y:a.y+4},{yaw:0}).position);return eyes.get(key);}
const hidden=(a,b)=>!worldSight({...a,y:a.y+3},{...b,y:b.y+3})&&!worldSight(eye(a),{...b,y:b.y+5.4})&&!worldSight(eye(b),{...a,y:a.y+5.4});
export function hiddenHuntSpawns(player,random){
 const key=player.x+':'+player.z;let candidates=cache.get(key);
 if(!candidates){candidates=points.filter(p=>gap(p,player)>=150&&gap(p,player)<=410&&hidden(p,player)&&worldRoute({...p,radius:6},player).length);cache.set(key,candidates);}
 const ranked=candidates.map(p=>({p,score:random()*90-Math.abs(gap(p,player)-225)*.2})).sort((a,b)=>b.score-a.score);
 function pair(a,b){const key=[a.x+':'+a.z,b.x+':'+b.z].sort().join('|');if(!pairs.has(key))pairs.set(key,gap(a,b)>=85&&hidden(a,b));return pairs.get(key);}
 for(let i=0;i<ranked.length;i++)for(let j=i+1;j<ranked.length;j++){const a=ranked[i].p,b=ranked[j].p;if(!pair(a,b))continue;for(let k=j+1;k<ranked.length;k++){const c=ranked[k].p;if(pair(a,c)&&pair(b,c))return[a,b,c].map(p=>({...p}));}}
 throw Error('NO_MUTUALLY_HIDDEN_STARTS');
}
