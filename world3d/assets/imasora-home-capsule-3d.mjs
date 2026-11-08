// Cosmetic geometry only. Saving, daily eligibility and ownership belong to Home.
export function buildCapsuleDecoration(THREE,Characters,buildCharacter,item){
 const root=new THREE.Group();root.name='capsule-prize-'+item.id;
 const mat=(c,options={})=>new THREE.MeshStandardMaterial({color:c,roughness:.84,...options});
 const mesh=(g,c,x=0,y=0,z=0,p=root)=>{const o=new THREE.Mesh(g,typeof c==='string'?mat(c):c);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;};
 const box=(c,w,h,d,x,y,z)=>mesh(new THREE.BoxGeometry(w,h,d),c,x,y,z),ball=(c,x,y,z,r)=>mesh(new THREE.SphereGeometry(r,16,12),c,x,y,z);
 if(item.kind==='plush'){
  const model=buildCharacter(THREE,Characters,item.monsterId);const copies=new Map();model.traverse(o=>{if(!o.material)return;const felt=m=>{if(!copies.has(m)){const n=m.clone();if(n.isMeshStandardMaterial){n.roughness=1;n.metalness=0;}copies.set(m,n);}return copies.get(m);};o.material=Array.isArray(o.material)?o.material.map(felt):felt(o.material);});root.add(model);root.userData.capsuleOriginalMaterials=[...copies.keys()];root.userData.plushModel=model;return root;
 }
 const key=item.key||item.id.replace('decor:','');
 const star=(x,y,z,r=.25,c='#ffda77')=>{const s=new THREE.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5,rad=i%2?r*.45:r;if(!i)s.moveTo(Math.sin(a)*rad,Math.cos(a)*rad);else s.lineTo(Math.sin(a)*rad,Math.cos(a)*rad);}s.closePath();return mesh(new THREE.ExtrudeGeometry(s,{depth:.08,bevelEnabled:true,bevelSegments:2,bevelSize:.02,bevelThickness:.02}),c,x,y,z);};
 if(key.includes('frame')||key.includes('poster')){
  const wall=key.includes('poster'),w=wall?1.25:.72,h=wall?.85:.60;box('#ac7950',w,h,.09,0,h/2,0);box(key.includes('night')||key.includes('star')?'#244671':key.includes('sunset')?'#eaa17e':'#9ed2df',w-.09,h-.09,.02,0,h/2,.06);
  if(key.includes('rainbow'))for(let i=0;i<5;i++){const arc=mesh(new THREE.TorusGeometry(.30-i*.035,.021,6,32,Math.PI),['#ef9c9d','#efd78a','#a9d29c','#9bd0d8','#c7b7dd'][i],0,h*.42,.09);arc.rotation.z=0;}
  else if(key.includes('night')||key.includes('star')||key.includes('moon')){ball('#fff0b4',-.16,h*.67,.08,.1);for(const[x,y]of[[.19,.23],[.24,.68],[-.27,.32]])star(x,y*h,.09,.025);}
  else{ball('#ffe7a2',.18,h*.7,.08,.08);for(const[x,y,r]of[[-.16,.34,.10],[-.04,.38,.12],[.08,.34,.09]]){const o=ball('#f7f5e7',x,y*h,.09,r);o.scale.y=.55;}}
  if(!wall){const leg=box('#8d6849',.08,.45,.08,0,.22,-.19);leg.rotation.x=-.25;}return root;
 }
 if(key==='leaf-wreath'){const ring=mesh(new THREE.TorusGeometry(.4,.05,8,32),'#778653',0,.5,0);for(let i=0;i<12;i++){const a=i*Math.PI/6,o=ball(i%2?'#97b985':'#699674',Math.cos(a)*.4,.5+Math.sin(a)*.4,.04,.11);o.scale.set(.65,1.4,.4);o.rotation.z=-a;}box('#e3ad86',.12,.2,.06,0,.12,.08);return root;}
 if(key==='star-garland'){box('#c7aa6b',1.4,.015,.02,0,.66,0);for(let i=0;i<5;i++){const x=(i-2)*.27,y=.3+Math.abs(i-2)*.07;box('#c7aa6b',.012,.66-y,.015,x,(.66+y)/2,0);star(x,y,0,.13);}return root;}
 if(key==='tiny-plant'||key==='cactus'){
  mesh(new THREE.CylinderGeometry(.23,.16,.3,20),'#d6a078',0,.15,0);mesh(new THREE.CylinderGeometry(.21,.21,.025,20),'#806947',0,.31,0);
  if(key==='cactus'){const o=ball('#8eaf78',0,.53,0,.23);o.scale.set(.9,1.2,.9);ball('#f0b2a6',.09,.77,0,.065);for(let i=0;i<10;i++){const a=i*2.4;ball('#e5dfb4',Math.cos(a)*.2,.43+i%3*.08,Math.sin(a)*.2,.015);}}
  else for(let i=0;i<7;i++){const a=i*2.4,o=ball(i%2?'#7ca977':'#9bc48c',Math.cos(a)*.15,.48+i%3*.10,Math.sin(a)*.12,.13);o.scale.set(.7,1.7,.35);o.rotation.z=Math.cos(a)*.5;}return root;
 }
 if(key.includes('lamp')){mesh(new THREE.CylinderGeometry(.26,.3,.07,24),'#b88f59',0,.035,0);mesh(new THREE.CylinderGeometry(.025,.025,.35,12),'#c9aa68',0,.22,0);const light=mat('#ffe3a0',{emissive:'#eab75d',emissiveIntensity:.4});if(key==='star-lamp')star(0,.64,0,.29,light);else for(const[x,y,r]of[[-.2,.57,.18],[0,.64,.24],[.23,.56,.17]])ball(light,x,y,0,r);return root;}
 if(key==='toy-ufo'){const o=ball('#aacacb',0,.24,0,.38);o.scale.y=.28;ball('#b5dfdc',0,.35,0,.20);for(let i=0;i<8;i++){const a=i*Math.PI/4;ball('#ffe09d',Math.cos(a)*.31,.24,Math.sin(a)*.31,.038);}for(const x of[-.2,.2])box('#7e9b9d',.05,.15,.05,x,.09,.08);return root;}
 if(key==='tiny-train'){box('#83b6a3',.8,.23,.30,0,.25,0);box('#e4b77c',.29,.29,.32,-.2,.48,0);box('#576b64',.06,.16,.07,.25,.42,0);for(const x of[-.28,.06,.28])for(const z of[-.16,.16]){const wheel=mesh(new THREE.CylinderGeometry(.095,.095,.035,16),'#626a62',x,.11,z);wheel.rotation.x=Math.PI/2;}box('#e6edc6',.17,.12,.012,-.2,.5,.17);return root;}
 if(key==='glass-globe'){mesh(new THREE.CylinderGeometry(.24,.28,.09,24),'#bb965c',0,.045,0);ball(mat('#85c5db',{roughness:.18,metalness:.12}),0,.38,0,.28);for(let i=0;i<4;i++)star((i%2-.5)*.23,.36+Math.floor(i/2)*.14,.25,.035,'#fff0b3');return root;}
 if(key==='coffee-mug'){mesh(new THREE.CylinderGeometry(.24,.19,.36,24),'#e7cfad',0,.2,0);mesh(new THREE.CylinderGeometry(.21,.21,.015,24),'#866142',0,.385,0);mesh(new THREE.TorusGeometry(.13,.035,8,20),'#e7cfad',.25,.23,0);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ball('#fff0c6',Math.cos(a)*.05,.4,Math.sin(a)*.05,.033);}return root;}
 for(let i=0;i<3;i++){const b=box(['#8fb8aa','#e7c18d','#a5b0c6'][i],.7,.11,.48,0,.07+i*.12,0);b.rotation.y=(i-1)*.12;box('#f6ebcd',.60,.075,.49,0,.07+i*.12,0);}return root;
}

export function createHomeCapsuleRooms(THREE,Characters,buildCharacter,{scene,slots,onAction,documentTarget}={}){
 const root=new THREE.Group(),home=new THREE.Group(),extra=new THREE.Group(),homeItems=new THREE.Group(),extraItems=new THREE.Group(),markers=new THREE.Group();root.name='capsule-rooms';extra.name='front-decoration-room';home.name='home-display-shelf';scene.add(root);root.add(home,extra,markers);home.add(homeItems);extra.add(extraItems);
 const materials=new Map(),mat=(c,o={})=>{const key=c+JSON.stringify(o);if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color:c,roughness:.75,...o}));return materials.get(key);};
 const mesh=(p,g,c,x,y,z)=>{const o=new THREE.Mesh(g,typeof c==='string'?mat(c):c);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;},box=(p,c,w,h,d,x,y,z)=>mesh(p,new THREE.BoxGeometry(w,h,d),c,x,y,z),cyl=(p,c,rt,rb,h,x,y,z)=>mesh(p,new THREE.CylinderGeometry(rt,rb,h,24),c,x,y,z),ball=(p,c,r,x,y,z)=>mesh(p,new THREE.SphereGeometry(r,24,18),c,x,y,z);
 const chrome=mat('#e0e5e0',{metalness:.48,roughness:.26}),black=mat('#354447',{metalness:.12,roughness:.34}),wood='#b0875e';
 box(home,wood,1.6,.10,.65,3.16,.47,2.37);for(const x of[2.48,3.84])for(const z of[2.13,2.61])box(home,'#7a6046',.075,.46,.075,x,.23,z);box(home,'#e4cfab',1.5,.08,.59,3.16,.16,2.37);
 box(extra,'#80674c',8.8,.22,9.8,0,-.17,8.1);for(let i=0;i<12;i++)box(extra,i%2?'#d5b78e':'#cfad82',.71,.04,9.6,(i-5.5)*.72,-.03,8.1);
 box(extra,'#dce8d5',8.6,3.9,.16,0,1.85,13);for(const x of[-4.25,4.25]){box(extra,'#eae8d6',.15,3.9,9.6,x,1.85,8.1);box(extra,wood,.12,.16,9.6,x,.12,8.1);}box(extra,wood,8.5,.16,.15,0,.12,12.85);box(extra,wood,8.5,.13,.18,0,3.7,12.8);
 const rug=box(extra,'#93b9a6',4,.025,4.5,0,.01,8.8);box(extra,'#e3d2ab',3.8,.01,4.3,0,.03,8.8);
 for(const x of[-3.2,3.2]){box(extra,'#8c6b48',1.25,.12,3.1,x,1.12,9.1);box(extra,'#c5a27a',1.25,.12,3.1,x,.3,9.1);for(const z of[7.65,10.55])for(const dx of[-.52,.52])box(extra,wood,.10,1.12,.10,x+dx,.55,z);for(let i=0;i<5;i++){const book=box(extra,['#86ab97','#d2ad82','#a2b7c8'][i%3],.12,.35,.45,x+(i-2)*.15,.52,9.3);book.rotation.z=(i-2)*.025;}}
 box(extra,wood,2.5,.12,1.0,0,.69,6.3);for(const x of[-1,1])for(const z of[5.98,6.62])box(extra,'#826344',.11,.64,.11,x,.32,z);
 box(extra,wood,3.4,.13,.95,0,.90,12.1);for(const x of[-1.55,1.55])for(const z of[11.8,12.4])box(extra,'#826344',.12,.86,.12,x,.44,z);
 const sign=(text,x,y,z)=>{const canvas=documentTarget?.createElement?.('canvas');if(!canvas?.getContext)return;canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');if(!ctx)return;ctx.fillStyle='#f8edcf';ctx.fillRect(0,0,512,128);ctx.fillStyle='#496c57';ctx.font='bold 42px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,64);const t=new THREE.CanvasTexture(canvas),m=new THREE.MeshBasicMaterial({map:t});m.userData.capsuleTexture=t;const p=mesh(extra,new THREE.PlaneGeometry(2.1,.52),m,x,y,z);p.rotation.y=Math.PI;};sign('小さな宝物の部屋',0,3.04,12.87);
 const machines=[];
 for(const[index,pool]of['plush','decor'].entries()){
  const g=new THREE.Group();g.name='capsule-machine-'+pool;g.userData.homeAction='decor-machine:'+pool;g.position.set(index? .83:-.83,.98,12.06);g.rotation.y=Math.PI;extra.add(g);
  cyl(g,chrome,.47,.49,.10,0,.05,0);cyl(g,black,.43,.45,.69,0,.43,0);cyl(g,chrome,.46,.46,.07,0,.79,0);cyl(g,chrome,.38,.43,.08,0,1.72,0);cyl(g,black,.31,.37,.07,0,1.78,0);
  const dome=ball(g,new THREE.MeshPhysicalMaterial({color:'#d9f3f2',transparent:true,opacity:.18,roughness:.08,metalness:.05,depthWrite:false,side:THREE.FrontSide}),.62,0,1.24,0);dome.scale.y=.85;dome.renderOrder=3;
  for(let i=0;i<13;i++){const a=i*2.399,r=i<8?.36:.19,y=.99+Math.floor(i/5)*.19,c=new THREE.Group();c.position.set(Math.cos(a)*r,y,Math.sin(a)*r);g.add(c);ball(c,mat(['#e8ac9d','#9bcbd3','#dccc88','#a8c896'][i%4]),.14,0,0,0);const cap=ball(c,mat('#f1f4e9',{transparent:true,opacity:.63,roughness:.18}),.143,0,.055,0);cap.scale.y=.63;ball(c,'#f4dfb0',.055,0,.06,.06);}
  box(g,chrome,.46,.43,.11,0,.49,.43);const dial=cyl(g,chrome,.14,.14,.09,0,.51,.53);dial.rotation.x=Math.PI/2;const crank=box(g,black,.25,.07,.07,0,.51,.6);box(g,chrome,.32,.21,.08,0,.18,.45);box(g,'#1c292a',.24,.13,.04,0,.19,.50);
  const capsule=new THREE.Group();capsule.name='dispensed-capsule';g.add(capsule);capsule.position.set(0,.17,.65);capsule.visible=false;const bottom=ball(capsule,mat(index?'#d4bd77':'#96bdaf'),.19,0,0,0),lid=ball(capsule,mat('#eaf4e5',{transparent:true,opacity:.60}),.193,0,.1,0);bottom.scale.y=.65;lid.scale.y=.65;machines.push({pool,g,crank,capsule,lid});
 }
 const light=new THREE.HemisphereLight('#fff7e5','#a69b80',2);extra.add(light);const front=new THREE.DirectionalLight('#fff9e9',3);front.position.set(-2,5,5);front.target.position.set(0,1.2,12);extra.add(front,front.target);
 extra.traverse(o=>o.layers.set(2));
 let active='home',signature='',eventId='',animation=null;const dynamic=[];
 function disposeObject(o){const gs=new Set(),ms=new Set();o.traverse(p=>{if(p.geometry)gs.add(p.geometry);for(const m of [...(p.userData.capsuleOriginalMaterials||[]),...(Array.isArray(p.material)?p.material:[p.material])])if(m)ms.add(m);});for(const g of gs)g.dispose();for(const m of ms){m.userData?.capsuleTexture?.dispose();m.dispose();}o.removeFromParent();}
 function update(data){active=data.room==='extra'?'extra':'home';extra.visible=active==='extra';home.visible=active==='home';markers.visible=!!data.edit;
  const next=JSON.stringify([active,data.decor||[],!!data.edit,data.selectedSlot,data.preview]);if(next!==signature){signature=next;for(const o of dynamic)disposeObject(o);dynamic.length=0;markers.clear();
   const rows=(data.decor||[]).filter(r=>r.slotId!==data.preview?.slotId);if(data.preview)rows.push(data.preview);
   for(const item of rows){const slot=slots.find(s=>s.id===item.slotId);if(!slot||slot.room!==active)continue;const o=buildCapsuleDecoration(THREE,Characters,buildCharacter,item),bounds=new THREE.Box3().setFromObject(o),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),scale=Math.min(slot.width/Math.max(.01,size.x),slot.height/Math.max(.01,size.y),slot.width/Math.max(.01,size.z));o.scale.setScalar(scale);const anchor=new THREE.Group();anchor.position.fromArray(slot.position);anchor.rotation.y=slot.yaw;anchor.userData.homeAction='decor-slot:'+slot.id;o.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);anchor.add(o);anchor.traverse(p=>p.layers.set(active==='extra'?2:0));(active==='home'?homeItems:extraItems).add(anchor);dynamic.push(anchor);}
   if(data.edit)for(const slot of slots.filter(s=>s.room===active)){const selected=data.selectedSlot===slot.id,m=new THREE.Mesh(new THREE.RingGeometry(slot.width*.45,slot.width*.56,32),new THREE.MeshBasicMaterial({color:selected?'#e2a53c':'#619d88',side:THREE.DoubleSide,transparent:true,opacity:.65,depthWrite:false}));m.position.fromArray(slot.position);m.position.y+=.012;if(slot.kind!=='wall')m.rotation.x=-Math.PI/2;else m.rotation.y=slot.yaw;m.layers.set(active==='extra'?2:0);m.userData.homeAction='decor-slot:'+slot.id;m.name=slot.id;markers.add(m);dynamic.push(m);}
  }
  if(data.capsuleEvent?.receipt&&data.capsuleEvent.receipt!==eventId){eventId=data.capsuleEvent.receipt;animation={pool:data.capsuleEvent.pool,start:null};}
 }
 function frameAt(time,reduced){if(!animation)return;if(animation.start===null)animation.start=time;const p=(time-animation.start)/1000,row=machines.find(m=>m.pool===animation.pool);if(!row)return;row.crank.rotation.z=p<1.2?(reduced?0:Math.min(1,p/1.2)*Math.PI*2):0;row.capsule.visible=p>=1.1;row.capsule.position.y=.17-Math.min(.7,Math.max(0,p-1.1))*.6;row.capsule.position.z=.65+Math.min(.9,Math.max(0,p-1.1))*.55;row.capsule.rotation.z=reduced?0:Math.min(1,Math.max(0,p-1.1))*Math.PI*2;row.lid.position.y=.10+Math.max(0,Math.min(.7,p-2.1))*.5;if(p>3.6){row.capsule.visible=false;animation=null;}}
 return{root,home,extra,machines,update,frameAt,dispose(){for(const o of dynamic)disposeObject(o);root.traverse(o=>o.material?.userData?.capsuleTexture?.dispose());},get active(){return active;}};
}
