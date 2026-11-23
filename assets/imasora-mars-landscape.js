import * as THREE from './three.module.min.js';
import {buildMatureStarCharacter360,disposeMatureCharacterModel} from './imasora-character-360.js?v=120ob';
import {createCaveDiagramCanvas} from './imasora-coast-tide-cave-view.mjs?v=121c2';
import {RAIN_WORKS_KIT} from './imasora-construction-guide-data.mjs?v=121c7';

export const MARS_LANDSCAPE_REACH = 30000;
const RINGS = [0, 40, 90, 180, 300, 500, 800, 1200, 1800, 2600, 3800, 5200, 7000, 10000, 14500, 20000, MARS_LANDSCAPE_REACH];
const SIDE_SEGMENTS = 48;

import {celebrateGameEvent} from './imasora-construction-guide-data.mjs?v=121gy';
export function marsLandscapeHeight(x, z, outsideDistance) {
  // The flat inner edge exactly joins the unchanged playable surface.
  const t = THREE.MathUtils.smoothstep(outsideDistance, 100, 1100);
  const rolling = Math.sin(x*.0017 + Math.sin(z*.0011)*1.8) * 52
    + Math.cos(z*.0023 - x*.0008) * 38
    + Math.sin(x*.0043 + z*.0031) * 17;
  const ridge = Math.pow(.5 + .5*Math.sin(x*.00075+z*.00125), 3) * 155;
  // Far ground curves gently below the real horizon instead of ending as a
  // rectangular floating board. This affects scenery, not the playable map.
  return (70+rolling+ridge)*t - outsideDistance*outsideDistance/2400000;
}

export function createMarsLandscape(config, sourceTexture) {
  const {width,depth}=config.world;
  const hw=width/2, hd=depth/2;
  const corners=[[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd]];
  const contour=[];
  for(let side=0;side<4;side++) for(let i=0;i<SIDE_SEGMENTS;i++) {
    const a=corners[side], b=corners[(side+1)%4], t=i/SIDE_SEGMENTS;
    contour.push([THREE.MathUtils.lerp(a[0],b[0],t),THREE.MathUtils.lerp(a[1],b[1],t)]);
  }
  const positions=[], uv=[], indices=[];
  for(const distance of RINGS) for(const [ix,iz] of contour) {
    const length=Math.hypot(ix,iz);
    const x=ix+ix/length*distance, z=iz+iz/length*distance;
    positions.push(x,marsLandscapeHeight(x,z,distance),z);
    // Keep exactly the same grain/crater scale and edge texels as the local
    // terrain; mirrored repetition avoids discontinuous texture seams.
    uv.push(.5+x/width,.5-z/depth);
  }
  const n=contour.length;
  for(let r=0;r<RINGS.length-1;r++) for(let i=0;i<n;i++) {
    const j=(i+1)%n, a=r*n+i,b=(r+1)*n+i,c=r*n+j,d=(r+1)*n+j;
    indices.push(a,c,b,c,d,b);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  const texture=sourceTexture?.clone() || null;
  if(texture) {
    texture.wrapS=texture.wrapT=THREE.MirroredRepeatWrapping;
    texture.needsUpdate=true;
  }
  const material=new THREE.MeshStandardMaterial({ map:texture,
    color:texture ? 0xffffff : config.palette.ground, roughness:.88,metalness:.01 });
  const terrain=new THREE.Mesh(geometry,material);
  terrain.name='mars-distant-landscape';
  terrain.receiveShadow=true;
  terrain.userData.nonCollidable=true;
  terrain.userData.sceneryOnly=true;
  terrain.userData.reach=MARS_LANDSCAPE_REACH;
  terrain.userData.innerContourCount=n;
  return terrain;
}

export function disposeMarsLandscape(terrain) {
  if(!terrain)return;
  terrain.removeFromParent(); terrain.geometry.dispose();
  terrain.material.map?.dispose(); terrain.material.dispose();
}

const sites = Object.freeze({
  entrance: {x:-534,z:-80},
  archive: {x:-534,z:-150},
  house: {x:-457,z:-311},
  tank: {x:-392,z:-321},
  cargo: {x:-266,z:202},
  delivery: {x:-457,z:-311},
  source: {x:-534,z:-150},
});
const tasks = {
  start: {site:'entrance',label:'入口の土を掘る',hint:'観測所の前に行き、埋まった資料室の入口を探そう。'},
  'outer-soil-cleared': {site:'entrance',label:'残りの土を掘る',hint:'戸口の足元に固い土が残っている。'},
  'archive-entry-open': {site:'archive',label:'観測記録を見比べる',hint:'開いた入口から資料室に入ろう。'},
  'records-compared': {site:'house',label:'両親の家を訪ねる',hint:'観測所の先にあるバルティアの両親の家へ。'},
  'parents-visited': {site:'tank',label:'貯水槽の窓を見る',hint:'家の外で、給水管の先にあるタンクの点検窓を見よう。'},
  'water-landed': {site:'cargo',label:'水の箱を一つ下ろす',hint:'UFOのそばの荷台から、水の箱を一つ下ろそう。',next:'one-crate'},
  'one-crate': {site:'cargo',label:'もう一つの水を下ろす',hint:'残り一つの水も下ろそう。',next:'crates-unloaded'},
  'crates-unloaded': {site:'delivery',label:'両親に水を届ける',hint:'水をバルティアの両親の家まで運ぼう。'},
  'water-delivered': {site:'source',label:'荷札と図を見比べる',hint:'観測所の旧資料室で、水の箱に付いていた荷札を調べよう。'},
};
const family = [
  ['母','私はこっちを焼いたの。薄いほうは、この人が生地を広げすぎたのよ。'],
  ['父','薄いほうが食べやすいんだよ。ほら、そっちから食べたじゃないか。'],
  ['', '母が水差しを傾ける。音がしない。手が止まる。'],
  ['父','冷めないうちに、もう一枚どう？'],
  ['セハルネ','バルティアは元気でした。そう伝えてほしいって。'],
  ['母','あの子に会ったら……こっちも大丈夫だって。'],
];
const waterFamily = [
  ['セハルネ','バルティアから、水を届けに来ました。'],
  ['母','……届けてくれて、ありがとう。'],
  ['父','あの子、きみに頼めたんだな。'],
  ['母','気をつけて帰ってね。'],
];

export const AMANE_REPAIR_TASKS = Object.freeze({
  landed:{site:'rock',label:'沢の岩と古い図を見比べる',hint:'観測所の西へ。山道の外にある、刻みの入った岩を探そう。',next:'surveyed'},
  surveyed:{site:'upper',label:'上流側の浅い土をどける',hint:'図の印を頼りに、岩の東で取水路の上流側を掘り出そう。',next:'upstream-dug'},
  'upstream-dug':{site:'lower',label:'下流側の浅い土をどける',hint:'残った浅い土をどけて、水路の下流側も出そう。',next:'dug'},
  dug:{site:'cargo',label:'上流の接続部を荷から出す',hint:'両端が見えた。UFOのそばの荷台へ、上流の部材を取りに戻ろう。',next:'carrying-upstream'},
  'carrying-upstream':{site:'upper',label:'上流の接続部を据える',hint:'上流の部材を沢側の目印まで運んで据えよう。',next:'upstream-fitted'},
  'upstream-fitted':{site:'cargo',label:'下流の接続部を荷から出す',hint:'上流の継ぎ目が合った。UFOのそばに残した下流の部材を取りに戻ろう。',next:'carrying-downstream'},
  'carrying-downstream':{site:'lower',label:'下流の接続部を据える',hint:'下流の部材を据え、工事現場で試したときと同じ傾きでつなごう。',next:'fitted'},
  fitted:{site:'rock',label:'取水口を開ける',hint:'二つの継ぎ目がつながった。岩のそばで沢から水を引こう。',next:'flowing'},
  flowing:{site:'filter',label:'浄水設備で水量を測る',hint:'水路を東へたどり、浄水設備まで来た水を測ろう。',next:'measured'},
  measured:{site:'reservoir',label:'集落のタンクの水位を見る',hint:'浄水された水が集落のタンクにたまる様子を見よう。',next:'reservoir-filled'},
  'reservoir-filled':{site:'houseTank',label:'両親の家のタンクを確かめる',hint:'タンクから延びる給水管をたどって、いちばん遠い両親の家へ。',next:'supply-checked'},
  'supply-checked':{site:'door',label:'両親の家に寄る',hint:'家まで水が届いた。来たときと同じ玄関から、二人に会おう。',next:'parcel-received'},
});
export const AMANE_REPAIR_SITES = Object.freeze({
  rock:{x:-690,z:-238,radius:26},upper:{x:-647.5,z:-241,radius:25},lower:{x:-614.5,z:-241,radius:25},
  cargo:{x:sites.cargo.x,z:sites.cargo.z+17,radius:33},filter:{x:-574,z:-242,radius:25},
  reservoir:{x:-526,z:-237,radius:25},houseTank:{x:-369,z:-307,radius:24},door:{x:-457,z:-308,radius:22},
});
const repairStages=[...Object.keys(AMANE_REPAIR_TASKS),'parcel-received'];
export function amaneRepairReached(stage,checkpoint){
 const step=repairStages.indexOf(checkpoint);return step>=0&&repairStages.indexOf(stage)>=step;
}
const reach=amaneRepairReached;
const REPAIR_CHANNEL=[[-689,12.48,-270],[-664,11.15,-270],[-631,9.4,-270],[-598,7.65,-270],[-579,6.64,-270]];

// Downhill gravity feeds the original filter. The lower pipe only opens after
// the common tank holds a reserve; the home tank never fills first.
export function amaneRepairWater(stage,elapsed=1){
 const p=THREE.MathUtils.clamp(elapsed,0,1);
 return {
  stream:reach(stage,'flowing')?(stage==='flowing'?p:1):0,
  common:reach(stage,'reservoir-filled')?.82:stage==='measured'?.82*p:0,
  supply:reach(stage,'supply-checked')?1:stage==='reservoir-filled'?p:0,
  house:reach(stage,'supply-checked')?.64:stage==='reservoir-filled'?.64*THREE.MathUtils.smoothstep(p,.38,1):0,
 };
}

export function createAmaneVisitSite({collider,clearSoil}) {
  const group=new THREE.Group();
  group.name='アマネ星の観測所と両親の家';
  const colors={
    stone:0xa77357,dark:0x694d47,wood:0x956243,iron:0x4d6572,trim:0xcfa97c,
    road:0xb87553,glass:0x517e86,light:0xffd695,dirt:0x92583c,deep:0x754735,paper:0xe9cfa1,
    channel:0x839ba1,water:0x46b9ca,marker:0xefbf6e,
  };
  const materials=Object.fromEntries(Object.entries(colors).map(([key,color])=>[
    key,new THREE.MeshStandardMaterial({color,roughness:.83,emissive:key==='light'?0xe6a561:0,emissiveIntensity:.45}),
  ]));
  const models=[];
  function add(geometry,ink,x,y,z){
    const mesh=new THREE.Mesh(geometry,materials[ink]);
    mesh.position.set(x,y,z);
    mesh.castShadow=ink!=='road';
    mesh.receiveShadow=true;
    group.add(mesh);
    return mesh;
  }
  function box(ink,x,y,z,w,h,d){
    return add(new THREE.BoxGeometry(w,h,d),ink,x,y,z);
  }
  function drum(ink,x,y,z,r,h){
    return add(new THREE.CylinderGeometry(r,r,h,18),ink,x,y,z);
  }
  function wall(ink,x,z,w,h,d){
    const mesh=box(ink,x,h/2,z,w,h,d);
    collider(x,z,[w,d],0,`amane-story-${x}-${z}`,0,{minY:0,maxY:h});
    return mesh;
  }
  function label(id,name,x,z,height){
    const marker=new THREE.Group();
    marker.position.set(x,0,z);
    marker.userData.nearbyName={id,name,hx:50,hz:44,height};
    group.add(marker);
  }
  function track(x,z,nextX,nextZ){
    const dx=nextX-x,dz=nextZ-z;
    for(const offset of [-12,12]){
      const strip=box('road',(x+nextX)/2+offset,.035,(z+nextZ)/2,2,.07,Math.hypot(dx,dz));
      strip.rotation.y=Math.atan2(dx,dz);
    }
  }
  track(-315,63,-395,-60);
  track(-395,-60,-534,-85);
  track(-385,-171,-410,-250);
  track(-410,-250,-445,-295);
  wall('stone',-393,-156,99,32,66);
  box('trim',-393,33,-156,105,3,72);
  box('iron',-394,36,-157,72,8,56);
  const dome=add(new THREE.SphereGeometry(26,24,14,0,Math.PI*2,0,Math.PI*.5),'iron',-393,40,-157);
  dome.scale.y=.68;
  box('glass',-393,23,-122,56,12,2.5);
  box('trim',-393,14,-121,62,1.5,2.8);
  label('amane-observatory','アマネ星の観測所',-393,-150,60);

  wall('stone',-534,-181,90,29,4);
  wall('stone',-577,-145,4,29,76);
  wall('stone',-491,-145,4,29,76);
  wall('dark',-568,-108,24,24,5);
  wall('dark',-500,-108,24,24,5);
  const threshold=box('trim',-534,.22,-109,43,.44,5);
  threshold.castShadow=false;
  box('trim',-534,34,-108,45,3.2,5.3);
  box('dark',-534,29,-171,92,3.5,26);
  box('wood',-534,7,-163,43,14,13);
  for(let i=0;i<3;i++)box('paper',-547+13*i,14.5,-162,9,.9,9);
  box('light',-553,22,-178,8,4.5,1.3);
  label('amane-archive','旧資料室',-534,-108,38);
  const compactSoil=box('deep',-534,7,-104,44,14,13);
  const looseSoil=[];
  for(let i=0;i<10;i++){
    const x=-552+(i%5)*9;
    const z=-104+Math.floor(i/5)*7;
    const rock=add(new THREE.IcosahedronGeometry(7+(i%3),1),'dirt',x,14+i%4,z);
    rock.scale.set(1,.72,1);
    rock.rotation.set(i*.17,i*.38,-i*.07);
    looseSoil.push(rock);
  }
  collider(-534,-103,[47,22],0,'amane-archive-soil',0,{minY:0,maxY:26});
  let soilOpen=false;

  wall('wood',-452,-363,111,34,4);
  wall('wood',-505,-330,4,34,70);
  wall('wood',-399,-330,4,34,70);
  wall('stone',-495,-296,24,26,4);
  wall('stone',-410,-296,24,26,4);
  box('iron',-452,35,-351,115,3,28);
  box('light',-453,24,-360,22,13,1.5);
  box('trim',-453,.14,-331,101,.28,60);
  box('wood',-453,9,-331,39,3,16);
  collider(-453,-331,[39,16],0,'amane-family-table',0,{minY:0,maxY:11});
  for(const x of [-468,-438])for(const z of [-336,-326])box('dark',x,4.2,z,2.6,8.4,2.6);
  drum('paper',-453,11,-331,6,1.5);
  const fatherCup=drum('trim',-460,12.55,-334,2.6,4.1);
  const motherCup=drum('trim',-445,12.55,-330,2.6,4.1);
  const pitcher=drum('paper',-437,14,-332,3,6);
  const pitcherRest=pitcher.position.clone(),grip=new THREE.Vector3();
  let previousFrame=null,pour=0;
  const addParent=(id,x,z,yaw)=>{
    const model=buildMatureStarCharacter360(id,{baseExpression:false,bodyEmissiveIntensity:.05});
    const bounds=new THREE.Box3().setFromObject(model);
    const scale=24/Math.max(1,bounds.max.y-bounds.min.y);
    model.scale.multiplyScalar(scale);
    model.position.set(x,-bounds.min.y*scale,z);
    model.rotation.y=yaw;
    group.add(model);
    models.push(model);
    collider(x,z,[26,24],yaw,`amane-family-${x}`,0,{minY:0,maxY:26});
    return model;
  };
  const mother=addParent('star-hero-young-seed-walk-walk-cute-forest',-427,-347,-.46);
  const father=addParent('star-hero-young-seed-walk-sky-cool-b-forest',-479,-347,.4);
  label('amane-house','バルティアの両親の家',-452,-296,46);
  wall('iron',-382,-324,16,21,18);
  box('iron',-392,19,-340,23,2.8,2.6);
  box('iron',-382,14,-338,2.9,11.3,2.8);
  box('glass',-382,11,-314.8,8.8,14,1);
  box('light',-382,4.9,-314.14,7.5,1.1,.24).material=materials.glass.clone();
  const lowWater=group.children.at(-1);
  lowWater.material.color.setHex(0x8ee9fa);
  lowWater.material.emissive.setHex(0x376c78);
  lowWater.material.emissiveIntensity=.85;

  const rock=add(new THREE.IcosahedronGeometry(17,1),'stone',-693,10,-271);
  rock.scale.set(1.23,.86,.9);rock.rotation.y=.21;
  collider(-693,-271,[42,29],0,'amane-intake-rock',0,{minY:0,maxY:24});
  for(const [i,y] of [7.8,11.1,14.4].entries()){
    const line=box('trim',-699+i*4,y,-257.9,8,.59,.75);line.rotation.z=-.16;
  }
  const streamBed=box('deep',-639,.045,-270,127,.09,35);streamBed.castShadow=false;
  function solid(ink,x,y,z,w,h,d,id){
    const mesh=box(ink,x,y,z,w,h,d);
    collider(x,z,[w,d],0,'amane-repair-'+id,0,{minY:Math.max(0,y-h/2),maxY:y+h/2});
    return mesh;
  }
  function slope(ink,a,b,width,depth,z=0,offset=0){
    const beam=box(ink,(a[0]+b[0])/2,(a[1]+b[1])/2+offset,a[2]+z,Math.hypot(b[0]-a[0],b[1]-a[1]),depth,width);
    beam.rotation.z=Math.atan2(b[1]-a[1],b[0]-a[0]);return beam;
  }
  const trough=(i)=>{
    const a=REPAIR_CHANNEL[i],b=REPAIR_CHANNEL[i+1],kit=RAIN_WORKS_KIT.parts[i-1],width=kit?.width??21;
    const pieces=[slope('channel',a,b,width,1.25,0,-.63),...[-width/2,width/2].map(z=>slope('channel',a,b,1.35,4,z,1.60))];
    if(kit)for(const x of [a[0]+1.5,b[0]-1.5])for(const z of [-9.4,9.4])pieces.push(box('marker',x,(a[1]+b[1])/2+2.6,a[2]+z,3.1,1,.8));
    pieces[0].name='amane-waterway-'+(kit?.id??i);
    return pieces;
  };
  trough(0);trough(3);
  const fitted=[trough(1),trough(2)];
  const bank=solid('dirt',-633,5.8,-289,123,11.6,15,'bank');bank.rotation.z=-.028;
  const covered=RAIN_WORKS_KIT.parts.map((part,i)=>{
    const a=REPAIR_CHANNEL[i+1],b=REPAIR_CHANNEL[i+2],x=(a[0]+b[0])/2,y=(a[1]+b[1])/2;
    const bed=box('deep',x,3,-270,part.length,6,part.width+5);
    const soil=box('dirt',x,y+.1,-270,part.length,5.4,part.width+6);
    const clods=Array.from({length:4},(_,j)=>{
      const l=add(new THREE.IcosahedronGeometry(3+j%2,1),'dirt',x-13+j*8,y+3,-265-j%2*9);
      l.scale.y=.68;return l;
    });
    collider(x,-270,[part.length,23],0,'amane-repair-bed-'+i,0,{minY:0,maxY:y+3});
    const notches=[box('marker',a[0]+.5,a[1]-.24,-281.8,4,1.2,2),box('marker',b[0]-.5,b[1]-.24,-281.8,4,1.2,2)];
    bed.receiveShadow=true;return {soil,clods,notches};
  });
  const headGate=box('iron',-686,13,-270,2.1,7,19);
  box('trim',-686,18,-270,3.2,1.5,23);
  const waterStrips=REPAIR_CHANNEL.slice(1).map((b,i)=>{
    const a=REPAIR_CHANNEL[i];return {mesh:slope('water',a,b,17,.26,0,.16),a,b};
  });
  const filter=solid('stone',-566,8,-269,25,16,30,'filter');
  box('trim',-566,16.8,-269,29,1.6,34);
  box('glass',-566,10,-253.9,13,7,.5);
  const meterNeedle=box('marker',-566,9.7,-253.5,1.2,4.2,.45);
  label('amane-purifier','浄水設備',-566,-269,26);
  const cistern=add(new THREE.CylinderGeometry(15,15,27,24),'iron',-526,13.5,-269);
  cistern.castShadow=true;collider(-526,-269,[28,28],0,'amane-common-cistern',0,{minY:0,maxY:27});
  drum('trim',-526,27.4,-269,15.5,1.8);
  box('glass',-526,14.6,-253.8,7.6,21,1);
  const commonWater=box('water',-526,4.1,-253.2,6.5,1,.55);
  label('amane-common-water','集落のタンク',-526,-269,38);
  function pipe(a,b,color,radius){
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),dir=end.clone().sub(start);
    const mesh=add(new THREE.CylinderGeometry(radius,radius,dir.length(),9),color,0,0,0);
    mesh.position.copy(start).lerp(end,.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());return mesh;
  }
  pipe([-553,11,-269],[-541,11,-269],'iron',2.25);
  const supplyPath=[[-526,4,-281],[-526,.3,-394],[-382,.3,-394],[-382,.3,-356],[-382,18,-334]];
  const supplyFlow=supplyPath.slice(1).map((b,i)=>{const a=supplyPath[i];pipe(a,b,'iron',1.15);
    // Visible moving inspection lights follow the physical pipe, not a HUD arrow.
    const pulse=add(new THREE.SphereGeometry(1.23,8,6),'water',...a);return {pulse,a,b};});

  const crates=RAIN_WORKS_KIT.parts.map((part,i)=>{
    const x=AMANE_REPAIR_SITES.cargo.x-18+i*36,z=sites.cargo.z-13;
    return [box('wood',x,4.3,z,part.length+2,8.6,part.width+1),box('paper',x,8.8,z,8,.4,9),
      ...[-11,11].map(dx=>box('iron',x+dx,8.7,z,1.8,.55,part.width+1.1))];
  });
  const parcel=new THREE.Group();group.add(parcel);
  const parcelBase=box('paper',0,0,0,9.5,3.6,7.3);parcel.add(parcelBase);
  const parcelTag=box('trim',0,1.86,.5,6,.2,4.1);parcel.add(parcelTag);
  const parcelBand=box('wood',0,0,0,1.05,3.72,7.42);parcel.add(parcelBand);
  let addressFace;
  if(typeof document!=='undefined'){
    const ink=document.createElement('canvas');ink.width=192;ink.height=96;
    const ctx=ink.getContext('2d');
    if(ctx){
      ctx.fillStyle='#f1dfb1';ctx.fillRect(0,0,192,96);ctx.fillStyle='#34271f';
      ctx.font='bold 25px sans-serif';ctx.textAlign='center';ctx.fillText('バルティアへ',96,57);
      const map=new THREE.CanvasTexture(ink);map.colorSpace=THREE.SRGBColorSpace;
      addressFace=new THREE.Mesh(new THREE.PlaneGeometry(6.8,3.4),new THREE.MeshStandardMaterial({map,roughness:1}));
      addressFace.rotation.x=-Math.PI/2;addressFace.position.set(0,2.02,.5);parcel.add(addressFace);
    }
  }
  const parcelMark=group.children.find(node=>node.userData.nearbyName?.id==='amane-house');
  label('amane-intake','山道脇の取水路',-650,-270,27);
  const guide=add(new THREE.TorusGeometry(8,.65,8,32),'marker',0,.18,0);
  guide.rotation.x=-Math.PI/2;

  const scalar=THREE.MathUtils.smoothstep;
  let currentRepair,repairTime=0;
  function updateRepair(stage,time,activity,film){
    if(stage!==currentRepair){currentRepair=stage;repairTime=time;}
    const elapsed=Math.max(0,(time-repairTime)/1000);
    const water=amaneRepairWater(stage,Math.min(1,elapsed/(stage==='measured'?3.4:stage==='reservoir-filled'?4.4:2.2)));
    headGate.position.y=13+(stage==='flowing'?water.stream:Number(reach(stage,'flowing')))*5;
    waterStrips.forEach(({mesh,a,b},i)=>{
      const amount=THREE.MathUtils.clamp(water.stream*4.8-i,0,1);
      mesh.visible=amount>.005;
      mesh.scale.x=Math.max(.001,amount);
      mesh.position.set(a[0]+(b[0]-a[0])*amount/2,a[1]+(b[1]-a[1])*amount/2+.19,a[2]);
    });
    meterNeedle.rotation.z=.62-water.stream*1.33;
    commonWater.visible=water.common>0;
    commonWater.scale.y=water.common*21;
    commonWater.position.y=4.1+water.common*21/2;
    lowWater.scale.y=1+water.house*11;
    lowWater.position.y=4.35+(.55+water.house*11*.55);
    supplyFlow.forEach(({pulse,a,b},i)=>{
      const at=(time/2200+i*.21)%1;
      pulse.visible=water.supply*4.5>=i+at;
      pulse.position.set(...a).lerp(grip.fromArray(b),at);
    });
    for(const [i,{soil,clods,notches}] of covered.entries()){
      const dug=reach(stage,i===0?'upstream-dug':'dug');
      const work=activity?.next===(i===0?'upstream-dug':'dug')?activity.progress:0;
      soil.visible=!dug;soil.scale.y=Math.max(.02,1-work);
      soil.position.y=(REPAIR_CHANNEL[i+1][1]+REPAIR_CHANNEL[i+2][1])/2+.1-work*2.1;
      clods.forEach((clod,j)=>{clod.visible=!dug&&work<(j+1)/4;});
      notches.forEach(part=>{part.visible=dug;});
      const installed=reach(stage,i===0?'upstream-fitted':'fitted');
      const setting=activity?.next===(i===0?'upstream-fitted':'fitted')?activity.progress:0;
      fitted[i].forEach(piece=>{
        piece.userData.finalY??=piece.position.y;
        piece.visible=installed||setting>.02;
        piece.position.y=piece.userData.finalY+(installed?0:(1-setting)*7);
      });
      crates[i].forEach(part=>{part.visible=!!stage&&!reach(stage,i===0?'carrying-upstream':'carrying-downstream');});
    }
    const task=AMANE_REPAIR_TASKS[stage],target=task&&AMANE_REPAIR_SITES[task.site];
    guide.visible=!!target&&!film;
    if(target){guide.position.x=target.x;guide.position.z=target.z;guide.scale.setScalar(1+Math.sin(time*.004)*.085);}
    if(parcelMark)parcelMark.visible=!film;
    const restored=reach(stage,'parcel-received');
    // Same kitchen and props as the first visit; cups travel on the table.
    const timeInRoom=film??(restored?12.5:0);
    fatherCup.position.x=-460+5*scalar(timeInRoom,4.8,6.7);
    motherCup.position.x=-445-3.8*scalar(timeInRoom,6.2,7.5);
    motherCup.position.z=-330-2.7*scalar(timeInRoom,6.2,7.5);
    parcel.visible=film!==null&&film!==undefined&&timeInRoom<12.9;
    if(parcel.visible){
      // The package is first on the table, then held in the mother's two hands.
      const lift=scalar(timeInRoom,8.45,10.35);
      const palm=mother.userData.hands?.[0];
      if(palm){palm.updateWorldMatrix(true,false);palm.getWorldPosition(grip);}
      else grip.set(-425,11,-334);
      parcel.position.set(-436,12.4,-326).lerp(grip.add(new THREE.Vector3(0,1.6,2.8)),lift);
      parcel.position.lerp(grip.set(-449,9,-313),scalar(timeInRoom,10.9,12.9));
      parcel.rotation.y=.20+lift*.32;
    }
    return elapsed;
  }
  const cargo=[0,1].map(i=>{
    const x=sites.cargo.x-10+i*12,z=sites.cargo.z-14;
    const name='amane-cargo-water-'+(i+1);
    const crate=box('glass',x,5,z,10,10,10);
    crate.name=name;
    collider(x,z,[10,10],0,name,0,{minY:0,maxY:10.5,isOpen:()=>!crate.visible});
    return [crate,box('paper',x,5.8,z+5.1,4,2.4,.2),box('iron',x,10,z,4,1,4)];
  });
  const delivered=[0,1].map(i=>{
    const x=-407,z=-325-i*12;
    const pieces=[box('glass',x,5,z,9,10,9),box('iron',x,10.4,z,4,1,4),
      box('paper',x,5.8,z+4.6,3.8,2.4,.2)];
    const crate=pieces[0];
    crate.name='amane-delivered-water-'+(i+1);
    collider(x,z,[9,9],0,crate.name,0,{minY:0,maxY:10.9,isOpen:()=>!crate.visible});
    return pieces;
  });
  return {
    group,
    farewellPose(time){
      const atDoor=1-scalar(time,2.1,3.25);
      const lookDown=scalar(time,2.65,4.25);
      mother.rotation.y=THREE.MathUtils.lerp(-.75,-.31,atDoor);
      father.rotation.y=THREE.MathUtils.lerp(.73,.29,atDoor);
      mother.rotation.x=.095*lookDown;
      father.rotation.x=.055*lookDown;
    },
    update(stage,time,line,delivery,repair,activity=null,film=null,deliveryLine=-1){
      const unopened=!stage||stage==='outer-soil-cleared';
      const loose=!stage;
      for(const rock of looseSoil)rock.visible=loose;
      compactSoil.visible=unopened;
      if(!unopened&&!soilOpen){soilOpen=true;clearSoil();}
      const beat=time*.001;
      mother.rotation.x=film!==null?.065*scalar(film,5.3,7.6):line===2?.12:Math.sin(beat*2.3)*.025;
      father.rotation.x=film!==null?.045*scalar(film,3.2,5.2):line===3?.08:Math.sin(beat*1.8)*.018;
      const dt=previousFrame===null?0:Math.min(.12,(time-previousFrame)*.001);
      previousFrame=time;
      const exchangedLook=deliveryLine>=2;
      mother.rotation.y=THREE.MathUtils.damp(mother.rotation.y,exchangedLook?-.78:-.46,5,dt);
      father.rotation.y=THREE.MathUtils.damp(father.rotation.y,exchangedLook?.71:.4,5,dt);
      pour=THREE.MathUtils.damp(pour,line===2?1:0,7,dt);
      const hand=mother.userData.hands?.[0];
      if(hand){
        hand.getWorldPosition(grip);
        grip.y=Math.max(pitcherRest.y,grip.y+1.2);
        pitcher.position.copy(pitcherRest).lerp(grip,pour);
        pitcher.rotation.z=-.68*pour;
      }
      cargo.forEach((crate,i)=>crate.forEach(part=>{part.visible=delivery==='water-landed'||(i===1&&delivery==='one-crate');}));
      const deliveredVisible=deliveryLine>=0||(!reach(repair,'reservoir-filled')&&
        ['water-delivered','source-matched','sky-returned'].includes(delivery));
      delivered.forEach(crate=>crate.forEach(part=>{part.visible=deliveredVisible;}));
      return updateRepair(repair,time,activity,film);
    },
    dispose(){
      group.removeFromParent();
      for(const model of models){model.removeFromParent();disposeMatureCharacterModel(model);}
      group.traverse(node=>node.geometry?.dispose());
      for(const material of Object.values(materials))material.dispose();
      lowWater.material.dispose();
      addressFace?.material.map?.dispose();addressFace?.material.dispose();
    },
  };
}

function paintOldIntakePlan(ctx) {
  const paper=ctx.createLinearGradient(0,0,540,250);
  paper.addColorStop(0,'#fff0c9');paper.addColorStop(1,'#d3b689');
  ctx.fillStyle=paper;ctx.fillRect(0,0,540,250);
  ctx.strokeStyle='#957b59';ctx.lineWidth=2;ctx.strokeRect(9,9,522,232);
  const point=(x,z)=>[50+(x+695)*1.38,88+(z+342)*1.25];
  const drawLine=(points,color,width,dashes=[])=>{
    ctx.setLineDash(dashes);ctx.strokeStyle=color;ctx.lineWidth=width;
    ctx.beginPath();
    points.forEach(([x,z],i)=>{const [u,v]=point(x,z);if(i===0)ctx.moveTo(u,v);else ctx.lineTo(u,v);});
    ctx.stroke();ctx.setLineDash([]);
  };
  const filter=AMANE_REPAIR_SITES.filter,reservoir=AMANE_REPAIR_SITES.reservoir,house=AMANE_REPAIR_SITES.houseTank;
  const intake=REPAIR_CHANNEL.map(([x,,z])=>[x,z]);
  drawLine([...intake,[filter.x,filter.z],[reservoir.x,reservoir.z]],'#407781',5);
  drawLine([[reservoir.x,reservoir.z],[house.x,-262],[house.x,house.z]],'#407781',3,[7,5]);
  for(const {x,z} of [AMANE_REPAIR_SITES.upper,AMANE_REPAIR_SITES.lower]){
    const [mx,my]=point(x,-270);
    const [,ey]=point(x,z);
    ctx.strokeStyle='#98532b';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(mx,my,10,0,Math.PI*2);ctx.moveTo(mx,my+10);ctx.lineTo(mx,ey-4);ctx.stroke();
  }
  ctx.fillStyle='#3f3027';ctx.font='700 27px system-ui';ctx.fillText('山道と旧取水路',24,45);
  ctx.font='650 21px system-ui';ctx.fillText('沢',30,165);ctx.fillText('集落',271,198);
  ctx.fillText('接続部',112,224);ctx.fillText('家のタンク',391,111);
}

function showWaterSourceEvidence(host, view) {
  const canvas=host.ownerDocument.createElement('canvas');
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  const compared=view==='compared';
  const tagOnly=view==='tag';
  const oldPlan=view==='intake';
  const diagram=!tagOnly&&!oldPlan&&createCaveDiagramCanvas();
  if(!tagOnly&&!oldPlan&&!diagram)return;
  canvas.width=540;
  canvas.height=tagOnly?164:oldPlan?250:330;
  canvas.setAttribute('role','img');
  canvas.setAttribute('aria-label',oldPlan?'アマネ星の旧取水路の図。沢から集落を通り、家のタンクへ続く。':tagOnly?'水の荷札。地球、海沿いの集水所。'
    :compared?'照合結果。荷札の集水所と、洞窟の図の海の印が一致する。'
    :'潮の洞窟で記録した空の図。海、雲、赤い星の印がある。');
  if(oldPlan)paintOldIntakePlan(ctx);
  if(diagram)ctx.drawImage(diagram,0,0);
  if(compared){
    ctx.strokeStyle='#ffe09a';
    ctx.lineWidth=3;
    ctx.beginPath();ctx.ellipse(95,211,52,39,0,0,2*Math.PI);ctx.stroke();
    ctx.beginPath();ctx.moveTo(143,225);ctx.lineTo(205,260);ctx.lineTo(271,260);ctx.stroke();
  }
  if(tagOnly||compared){
    const x=compared?269:25;
    const y=compared?210:18;
    const width=compared?247:490;
    const height=compared?91:128;
    const paper=ctx.createLinearGradient(x,y,x+width,y+height);
    paper.addColorStop(0,'#fff2d1');paper.addColorStop(1,'#d7b37b');
    ctx.fillStyle=paper;
    ctx.beginPath();
    ctx.moveTo(x,y+height/2);
    ctx.lineTo(x+24,y);
    ctx.lineTo(x+width,y);
    ctx.lineTo(x+width,y+height);
    ctx.lineTo(x+24,y+height);
    ctx.closePath();ctx.fill();
    ctx.fillStyle='#54392b';
    ctx.beginPath();ctx.arc(x+21,y+height/2,4,0,Math.PI*2);ctx.fill();
    ctx.font=compared?'600 16px system-ui':'600 24px system-ui';
    ctx.fillText('地球',x+39,y+(compared?30:43));
    ctx.font=compared?'700 21px system-ui':'700 36px system-ui';
    ctx.fillText('海沿いの集水所',x+39,y+(compared?63:92));
  }
  host.replaceChildren(canvas);
  host.hidden=false;
}

export function createAmaneVisitActions({host,context,clearInput,record,farewell}) {
  const hint=document.createElement('p');
  hint.className='rain-story-hint';
  const action=document.createElement('button');
  action.type='button';
  action.className='sky-wind-action amane-visit-action';
  hint.hidden=action.hidden=true;
  const dialog=document.createElement('dialog');
  dialog.className='sky-wind-dialog amane-visit-dialog';
  dialog.setAttribute('aria-labelledby','amane-visit-title');
  dialog.innerHTML=`
    <h2 id="amane-visit-title"></h2>
    <p data-amane-text></p>
    <div class="amane-record-options sky-wind-marks" hidden>
      <button type="button" data-amane-record="new">今の記録</button>
      <button type="button" data-amane-record="old">昔の記録</button>
    </div>
    <div class="amane-record-visual" hidden></div>
    <div class="amane-source-evidence" hidden></div>
    <footer>
      <button type="button" data-amane-leave>戻る</button>
      <button type="button" data-amane-next>つぎへ</button>
    </footer>`;
  const title=dialog.querySelector('h2');
  const message=dialog.querySelector('[data-amane-text]');
  const choices=dialog.querySelector('.amane-record-options');
  const visual=dialog.querySelector('.amane-record-visual');
  const evidence=dialog.querySelector('.amane-source-evidence');
  const leave=dialog.querySelector('[data-amane-leave]');
  const next=dialog.querySelector('[data-amane-next]');
  const inspected=new Set();
  let scene=null,line=0,saving=false,leaving=false,errorText='';
  function target(){
    const c=context();
    if(!c.active||c.blocked||c.airborne)return null;
    const task=tasks[c.stage??'start'];
    const point=sites[task?.site];
    if(!point)return null;
    const radius=task.site==='archive'?24:task.site==='tank'?24:32;
    return Math.hypot(c.x-point.x,c.z-point.z)<radius?task:null;
  }
  async function save(stage){
    if(saving)return false;
    saving=true;
    errorText='';
    if(dialog.open)next.disabled=true;
    try{await record(stage);if(stage==='archive-entry-open')celebrateGameEvent(host,'観測所の入口が開いた！','work');return true;}
    catch{
      errorText='記録を保存できませんでした。もう一度お試しください。';
      if(dialog.open)message.textContent=errorText;
      return false;
    }finally{saving=false;next.disabled=false;}
  }
  function showFamily(){
    const pages=scene==='delivery'?waterFamily:family;
    const [speaker,text]=pages[line];
    title.textContent=speaker||'両親の家';
    message.textContent=text;
    next.textContent=line===pages.length-1?'家を出る':'つぎへ';
  }
  function show(site){
    scene=site;line=0;inspected.clear();
    choices.hidden=site!=='archive'&&site!=='source';visual.hidden=true;next.hidden=false;
    evidence.hidden=true;evidence.replaceChildren();
    choices.children[0].textContent=site==='source'?'水の荷札':'今の記録';
    choices.children[1].textContent=site==='source'?'洞窟の図':'昔の記録';
    for(const button of choices.children)button.setAttribute('aria-pressed','false');
    if(site==='source'){
      title.textContent='第11章　二枚の図';
      showWaterSourceEvidence(evidence,'intake');
      message.textContent='沢から集落へ水を引いていた図が残っている。水の荷札も、洞窟の図と見比べよう。';
      next.hidden=true;
    }else if(site==='archive'){
      title.textContent='観測所の旧資料室';
      message.textContent='並べて置かれた二つの記録を調べよう。';
      next.hidden=true;
    }else if(site==='house'||site==='delivery')showFamily();
    else{
      title.textContent='貯水槽';
      message.textContent='点検窓の底に、ほんの少しだけ水が見える。';
      next.textContent='空駅へ戻って伝えよう';
    }
    dialog.showModal();
  }
  function close(){
    if(saving)return;
    clearInput();
    scene=null;
    dialog.close();
    if(!action.hidden)action.focus({preventScroll:true});
  }
  action.addEventListener('click',async()=>{
    const task=target();
    if(!task||saving)return;
    clearInput();
    if(task.next){await save(task.next);return;}
    if(task.site!=='entrance'){show(task.site);return;}
    await save(context().stage?'archive-entry-open':'outer-soil-cleared');
  });
  for(const button of choices.children)button.addEventListener('click',()=>{
    const key=button.dataset.amaneRecord;
    inspected.add(key);
    button.setAttribute('aria-pressed','true');
    if(scene==='source'){
      showWaterSourceEvidence(evidence,key==='new'?'tag':'diagram');
      message.textContent=key==='new'
        ?'荷札には、地球の海沿いにある集水所の名前が書いてある。'
        :'洞窟の図では、観測した雲が曲がって進んだ先に同じ海岸線がある。';
      if(inspected.size===2){next.hidden=false;next.textContent='荷札と図を照合する';}
      return;
    }
    visual.hidden=false;
    visual.dataset.period=key;
    visual.textContent=key==='old'?'湿った風が続く期間は長い':'湿った風は以前より早く止まる';
    message.textContent=key==='old'
      ?'昔の帳面では、同じ向きの湿った風が長く続いていた。古い地形図には、今より細い山道と、水を引く線が描かれている。'
      :'今の帳面では、湿った風が止むと、雨の記録もほとんど途切れている。';
    if(inspected.size===2){next.hidden=false;next.textContent='二つの記録を照合する';}
  });
  next.addEventListener('click',async()=>{
    if(saving||leaving)return;
    if(scene==='archive'){
      if(inspected.size!==2)return;
      if(context().stage==='records-compared'){close();return;}
      if(await save('records-compared')){
        choices.hidden=true;visual.hidden=true;
        title.textContent='二つの記録で分かったこと';
        message.textContent='湿った風の時期が短くなっている。昔の山道の脇には、水を引く細い線があった。';
        next.textContent='両親の家へ';
      }
    }else if(scene==='house'){
      if(line<family.length-1){line++;showFamily();return;}
      if(await save('parents-visited'))close();
    }else if(scene==='delivery'){
      if(line<waterFamily.length-1){line++;showFamily();return;}
      leaving=true;
      dialog.close();
      try{
        await farewell();
        if(await save('water-delivered')){close();return;}
      }catch{
        errorText='見送りの場面を開けませんでした。もう一度お試しください。';
      }finally{leaving=false;}
      message.textContent=errorText;
      dialog.showModal();
      next.focus({preventScroll:true});
    }else if(scene==='source'){
      if(inspected.size!==2)return;
      if(context().stage==='source-matched'){close();return;}
      if(await save('source-matched')){
        choices.hidden=true;
        title.textContent='セハルネ';
        showWaterSourceEvidence(evidence,'compared');
        message.textContent='この水を集めた場所……あの雲が向かった先だ。';
        next.textContent='空駅へ戻ろう';
      }
    }else if(scene==='tank'&&await save('shortage-seen'))close();
  });
  leave.addEventListener('click',close);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  host.append(hint,action,dialog);
  return {
    get open(){return dialog.open;},
    get leaving(){return leaving;},
    get familyLine(){return scene==='house'?line:-1;},
    get deliveryLine(){return scene==='delivery'?line:-1;},
    get viewingSource(){return dialog.open&&scene==='source';},
    update(){
      const c=context();
      const task=target();
      action.hidden=dialog.open||!task;
      action.disabled=saving;
      if(task&&action.textContent!==task.label)action.textContent=task.label;
      hint.hidden=!c.active||c.blocked||dialog.open;
      if(!hint.hidden){
        const current=tasks[c.stage??'start'];
        const point=sites[current?.site];
        let text=errorText||current?.hint||(c.stage==='source-matched'
          ?'UFOで空駅へ戻ってから、街で集水所を見渡せる場所を聞こう。'
          :'UFO乗り場から空駅に戻り、バルティアに話そう。');
        if(point&&current.site!=='tank'&&!errorText){
          const dx=point.x-c.x,dz=point.z-c.z;
          const distance=Math.round(Math.hypot(dx,dz));
          if(distance>42)text+=`　${Math.abs(dx)>Math.abs(dz)?dx>0?'東':'西':dz>0?'南':'北'}へ ${distance} m`;
        }
        if(hint.textContent!==text)hint.textContent=text;
      }
    },
    cameraFrame(camera){
      if(!dialog.open)return false;
      if(scene==='house'||scene==='delivery'){
        camera.position.set(-458,38,camera.aspect<1?-207:-241);
        camera.lookAt(-453,17,-344);
      }else if(scene==='source'){
        camera.position.set(-533,27,-125);
        camera.lookAt(-534,12,-146);
      }else if(scene==='tank'){
        camera.position.set(-366,22,-276);
        camera.lookAt(-382,11,-316);
      }else{
        camera.position.set(-528,38,-113);
        camera.lookAt(-534,13,-163);
      }
      return true;
    },
  };
}

export function createAmaneRepairActions({host,context,clearInput,record}){
  const doc=host.ownerDocument;
  const hint=doc.createElement('p');hint.className='rain-story-hint';hint.setAttribute('role','status');hint.hidden=true;
  const button=doc.createElement('button');button.type='button';button.className='sky-wind-action';button.id='amaneRepairAction';button.hidden=true;
  const overlay=doc.createElement('section');overlay.className='amane-repair-film rain-rescue-film';overlay.hidden=true;
  overlay.setAttribute('aria-label','両親の家に水が届く');
  overlay.innerHTML='<div class="rain-rescue-matte top"></div><div class="rain-rescue-matte bottom"></div><p hidden></p>';
  const address=overlay.querySelector('p');
  const progress=doc.createElement('progress');progress.max=1;progress.value=0;progress.hidden=true;
  progress.className='amane-repair-progress';progress.setAttribute('aria-label','作業の進み具合');
  host.append(hint,button,overlay,progress);
  let work=null,saveError='',savePending=false;
  const duration={surveyed:1.6,'upstream-dug':2.1,dug:2.1,'carrying-upstream':.9,'upstream-fitted':2,
    'carrying-downstream':.9,fitted:2,flowing:1,measured:2.4,'reservoir-filled':3,'supply-checked':2.4,'parcel-received':13.1};
  const show=(node,value)=>{if(node.textContent!==value)node.textContent=value;};
  function near(){
    const c=context(),task=AMANE_REPAIR_TASKS[c.stage];
    if(!task||!c.active||c.blocked||c.airborne)return null;
    const site=AMANE_REPAIR_SITES[task.site];
    const wait=task.next==='measured'?2.2:task.next==='supply-checked'?4.4:0;
    return c.age>=wait&&Math.hypot(c.x-site.x,c.z-site.z)<=site.radius?task:null;
  }
  function close(){
    overlay.hidden=true;progress.hidden=true;delete doc.body.dataset.amaneRepairFilm;delete doc.body.dataset.amaneRepairWork;
    host.classList.remove('is-conversing');work=null;clearInput();
  }
  function openFilm(onEnd){
    hint.hidden=true;overlay.hidden=false;doc.body.dataset.amaneRepairFilm='';
    work={next:'parcel-received',site:'door',time:0,progress:0,onEnd};
  }
  async function commit(){
    if(savePending||!work)return;
    if(work.onEnd){const done=work.onEnd;close();done();return;}
    savePending=true;
    try{await record(work.next);saveError='';if(work.next==='fitted')celebrateGameEvent(host,'取水路の接続部がつながった！','work');}
    catch(error){saveError=error?.message||'作業を保存できませんでした。もう一度ためしてね。';}
    finally{savePending=false;close();}
  }
  button.onclick=()=>{
    const task=near();if(work||!task)return;
    clearInput();button.hidden=true;saveError='';
    if(task.next==='parcel-received')openFilm(null);
    else{work={next:task.next,site:task.site,time:0,progress:0};doc.body.dataset.amaneRepairWork='';host.classList.add('is-conversing');progress.hidden=false;progress.value=0;}
  };
  const eye=new THREE.Vector3(),target=new THREE.Vector3();
  return {
    get open(){return !!work;},get activity(){return work;},
    get film(){return work?.next==='parcel-received'?work.time:null;},
    replay(onEnd){if(work)return false;clearInput();openFilm(onEnd);return true;},
    update(delta){
      const c=context(),task=AMANE_REPAIR_TASKS[c.stage];
      if(work){
        if(!savePending){work.time=Math.min(duration[work.next],work.time+delta);work.progress=work.time/duration[work.next];}
        const film=work.next==='parcel-received';
        address.hidden=!film||work.time<9.4||work.time>11.7;
        if(film)show(address,'バルティアへ');else progress.value=work.progress;
        if(work.progress>=1&&!savePending)void commit();
        return;
      }
      button.hidden=!near();if(task)show(button,task.label);
      hint.hidden=!c.active||c.blocked&&!saveError;
      if(c.active)show(hint,saveError||task?.hint||'バルティアへの包みを預かった。UFOを操縦して空駅へ戻ろう。');
    },
    cameraFrame(camera){
      if(!work)return false;
      const {site,time,next,progress:p}=work,q=AMANE_REPAIR_SITES[site];
      if(next==='parcel-received'){
        if(time<3.1){eye.set(-410,19,-285).lerp(target.set(-398,18,-283),time/3.1);target.set(-382,9,-317);}
        else if(time<8.1){eye.set(-453,24,-291).lerp(target.set(-451,22,-296),(time-3.1)/5);target.set(-453,12,-332);}
        else{eye.set(-457,22,-305).lerp(target.set(-455,20,-307),(time-8.1)/5);target.set(-431,13,-329);}
      }else if(site==='door')return false;
      else{
        const z=site==='cargo'?q.z-30:site==='houseTank'?-319:q.z-27;
        eye.set(q.x+26-13*p,23+3*p,q.z+48-4*p);target.set(q.x,site==='reservoir'?13:8,z);
      }
      camera.position.copy(eye);camera.up.set(0,1,0);camera.lookAt(target);return true;
    },
  };
}
