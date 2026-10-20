import{assertRoomMotion}from'./imasora-construction-room-motion.mjs?v=120gn';
import{roomWalkPose,walkRoomPath}from'./imasora-construction-room-walk.mjs?v=120gn';
import{highSelected,highProjects,highLocalPoint}from'./imasora-construction-high-world.mjs?v=120gn';
import{upperCastingGeometry}from'./imasora-construction-high-casting.mjs?v=120gn';
import{TIMBER_YARDS}from'./imasora-construction-yard-origins.mjs?v=120gb';
export function roomWalkWorldBoxes(world,r){const t=world.constructionTimber,o=TIMBER_YARDS[t?.siteIndex],raw=(o?(t.work?.parts??[]).map(b=>({...b,x:o[0]+b.x,y:b.y+b.h/2,z:o[1]+b.z,angle:b.angle??0})):[]).concat(upperCastingGeometry(world));return raw.map(b=>({...b,...highLocalPoint(r.site,b),angle:(b.angle??0)-r.site.turn*Math.PI/2}));}
export function assertRoomWalkWorld(world,a){if(!['ROOM_WALK_BEGIN','ROOM_WALK_END','ROOM_WALK','ROOM_MOTION_BEGIN','ROOM_MOTION','ROOM_MOTION_END'].includes(a.type))return;const r=highSelected(world.constructionHighBuild);if(!r)throw Error('建物をえらぼう。');const boxes=roomWalkWorldBoxes(world,r);if(a.type==='ROOM_MOTION')assertRoomMotion(r.work,boxes);else if(a.type==='ROOM_WALK')walkRoomPath(r.work,a.path,boxes);else if(!roomWalkPose(r.work,r.work.actor,boxes))throw Error('足元と通り道をあけてから歩こう。');return{roomObstacles:boxes};}
export function assertAllRoomWalkingWorld(world){for(const{record:r}of highProjects(world.constructionHighBuild))if(r.work.roomWalkVersion&&!(r.work.roomMotion?assertRoomMotion(r.work,roomWalkWorldBoxes(world,r)):roomWalkPose(r.work,r.work.actor,roomWalkWorldBoxes(world,r))))throw Error('歩いているモンスターの場所をあけよう。');}
