// Canonical early-stage silhouettes: seed with a leaf; sprout; walking leaf
// and cloud-wing young branches. The stable 224-entry naming tree owns IDs.
export function buildEarlyMonsterCharacter360(THREE,Characters,id,options={}){
 const entry=Characters.MonsterNames.get(id);if(!entry||!['タネ期','新芽期','青葉期'].includes(entry.stage))throw Error('Unknown early monster: '+id);
 const palette={walk:'#ffb978',sky:'#9ed8ff',leaf:'#aee58b',city:'#c4b9ff',river:'#8eeadf',night:'#f9a7cb',luck:'#ffd66f',white:'#ffffff'};
 const seed=entry.stage==='タネ期',sprout=entry.stage==='新芽期',sky=!seed&&!sprout&&entry.id.endsWith('-sky'),white=entry.family==='white';
 const model=new THREE.Group();model.name=entry.id+'-360';
 const material=color=>new THREE.MeshStandardMaterial({color,roughness:.8,metalness:0});
 const materials={body:material(palette[entry.family]),eye:material('#17202c'),leaf:material('#67ad63'),foot:material(options.footColor||'#8b5a34'),spark:material(options.handColor||'#ffe39a'),band:material(sky?'#ecfbff':'#ffebbd')};
 const mesh=(geometry,mat,name,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geometry,mat);m.name=name;m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;model.add(m);return m;};
 const oval=(mat,name,x,y,z,sx,sy,sz)=>{const m=mesh(new THREE.SphereGeometry(1,28,20),mat,name,x,y,z);m.scale.set(sx,sy,sz);return m;};
 const extrude=(points,depth,bevel=1)=>{const shape=new THREE.Shape();shape.moveTo(...points[0]);for(const p of points.slice(1))shape.lineTo(...p);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:16,steps:1});g.translate(0,0,-depth/2);g.computeVertexNormals();return g;};
 let body;const feet=[],eyes=[];
 if(seed){
  const points=[new THREE.Vector2(0,2),new THREE.Vector2(9,4),new THREE.Vector2(15,12),new THREE.Vector2(17,25),new THREE.Vector2(14,38),new THREE.Vector2(7,47),new THREE.Vector2(0,50)];
  body=mesh(new THREE.LatheGeometry(points,36),materials.body,'seed-pod');body.rotation.z=-.1;
  const seam=new THREE.CatmullRomCurve3([new THREE.Vector3(1,10,14),new THREE.Vector3(3,23,17.1),new THREE.Vector3(1,38,12)]);
  mesh(new THREE.TubeGeometry(seam,18,.28,5,false),material(white?'#c2cbd0':'#c59868'),'seed-seam');
 }else if(sprout){body=oval(materials.body,'sprout-body',0,37,0,23,24,17);}
 else if(sky){body=oval(materials.body,'young-cloud-body',0,38,0,27,23,18);}
 else{body=mesh(extrude([[-17,14],[17,14],[24,48],[0,64],[-24,48]],28,4),materials.body,'young-trail-body');}
 if(!sky){
  const leafShape=new THREE.Shape();leafShape.moveTo(0,0);leafShape.bezierCurveTo(-14,1,-19,17,0,27);leafShape.bezierCurveTo(18,18,14,5,0,0);
  const leafGeometry=new THREE.ExtrudeGeometry(leafShape,{depth:2,bevelEnabled:true,bevelSize:.7,bevelThickness:.7,bevelSegments:2,curveSegments:16});leafGeometry.translate(0,0,-1);
  const leaf=mesh(leafGeometry,materials.leaf,'new-leaf',seed?0:-4,seed?46:sprout?61:62,0);leaf.rotation.z=seed?-.45:sprout?-.3:-.65;leaf.scale.setScalar(seed?.65:sprout?1:1.08);
  const vein=mesh(new THREE.CylinderGeometry(.4,.6,20,6),material('#bbdf96'),'leaf-vein');leaf.add(vein);vein.position.set(0,12,1.8);vein.rotation.z=-.07;
 }
 if(!seed){
  for(const side of[-1,1]){const eye=oval(materials.eye,side<0?'eye-left':'eye-right',side*9,sprout?42:43,sky?17.7:sprout?16.7:18.4,3.1,3.1,1.3);eyes.push(eye);oval(material('#ffffff'),'eye-highlight',side*9-.7,sprout?43:44,sky?19:sprout?18:19.7,.8,.9,.35);feet.push(oval(materials.foot,side<0?'foot-left':'foot-right',side*11,7,7,7.5,4.6,8.5));}
  if(sky){mesh(extrude([[-37,40],[-27,47],[-16,41],[-5,48],[7,41],[20,48],[37,40],[23,29],[10,34],[-3,28],[-17,34],[-28,29]],4,1),materials.band,'cloud-wings',0,0,-3);}
  else if(!sprout){mesh(extrude([[-18,31],[17,34],[18,39],[-19,36]],2,.5),materials.band,'trail-scarf',0,0,19);}
  else{oval(material('#578554'),'little-mouth',0,32,17.5,3,.9,.6);}
  const star=[];for(let i=0;i<8;i++){const a=i*Math.PI/4;const r=i%2?2.2:6;star.push([Math.sin(a)*r,Math.cos(a)*r]);}mesh(extrude(star,2,.3),materials.spark,'growth-spark',30,65,5);
 }
 model.userData={characterId:entry.id,characterName:entry.name,growthStage:entry.stage,familyKey:entry.family,whiteVariant:white,stageKey:seed?'seed':sprout?'sprout':'young',body,faceFeatures:eyes,hands:[],feet,materials,decorationType:null};
 if(!seed&&options.baseExpression!==false)Characters.applyMonsterBaseExpression?.(model,entry.id,{surfaceZ:(x,y)=>sprout?17*Math.sqrt(Math.max(0,1-(x/23)**2-((y-37)/24)**2)):sky?18*Math.sqrt(Math.max(0,1-(x/27)**2-((y-38)/23)**2)):18});
 return model;
}

export function buildAnyMonsterCharacter360(THREE,Characters,id,options={}){
 const entry=Characters.MonsterNames.get(id);if(!entry)throw Error('Unknown monster ID: '+id);
 let model;
 if(entry.stage==='満開期')model=Characters.buildMatureStarCharacter360(entry.id,options);
 else if(entry.stage==='開花期')model=Characters.buildFloweringHeroCharacter360(entry.id,options);
 else model=buildEarlyMonsterCharacter360(THREE,Characters,entry.id,options);
 model.userData.characterId=entry.id;model.userData.characterName=entry.name;model.userData.growthStage=entry.stage;
 return model;
}
