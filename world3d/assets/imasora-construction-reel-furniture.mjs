// These exact boxes serve drawing, timber accounting, picking and contacts.
export const FURNITURE={table:{name:'テーブル',width:40,depth:32,minWidth:24,minDepth:24},chair:{name:'いす',width:24,depth:24,minWidth:16,minDepth:16},bench:{name:'ベンチ',width:48,depth:24,minWidth:32,minDepth:16},workbench:{name:'作業台',width:48,depth:32,minWidth:32,minDepth:24},cistern:{name:'給水タンク',width:48,depth:40,minWidth:32,minDepth:32},lightTower:{name:'照明塔',width:40,depth:40,minWidth:32,minDepth:32},tank:{name:'水槽',width:32,depth:24,minWidth:24,minDepth:24}};
export const holdsWater=i=>i?.shape==='tank'||i?.shape==='cistern';
export const tankCapacity=i=>Math.floor(i.shape==='cistern'?Math.PI*(i.width-4)*(i.depth-4)*44/128:(i.width-4)*(i.depth-4)*24/32);
// Closed steel shells reserve only their manufactured metal, not their hollow volume.
export const industrialRebar=rooms=>(rooms??[]).reduce((n,r)=>n+(r.structure?.items??[]).reduce((m,i)=>m+(i.kind==='furniture'&&['cistern','lightTower'].includes(i.shape)?Math.ceil(furnitureParts(r,i).reduce((v,p)=>v+(p.materialVolume??p.w*p.h*p.d),0)/768):0),0),0);
export const reelWaterUsed=c=>(c?.version===6?c.reel?.rooms??[]:[]).reduce((n,r)=>n+(r.structure?.items??[]).reduce((m,i)=>m+(i.kind==='furniture'&&holdsWater(i)?i.waterQ*250:0),0),0);
const grid=n=>Number.isInteger(n)&&n%8===0;
export function furnitureProblem(i){const shape=Object.hasOwn(FURNITURE,i?.shape)?FURNITURE[i.shape]:null;return !shape||i.kind!=='furniture'||Object.keys(i).sort().join('|')!==(i.shape==='lightTower'?'depth|height|id|kind|lampMode|shape|turn|width|x|z':holdsWater(i)?'depth|id|kind|shape|turn|waterQ|width|x|z':'depth|id|kind|shape|turn|width|x|z')||![i.x,i.z,i.width,i.depth].every(grid)||!Number.isInteger(i.turn)||i.turn<0||i.turn>3||i.shape==='lightTower'&&(!grid(i.height)||i.height<48||i.height>128||!['auto','on','off'].includes(i.lampMode))||i.width<shape.minWidth||i.width>80||i.depth<shape.minDepth||i.depth>64||holdsWater(i)&&(!Number.isSafeInteger(i.waterQ)||i.waterQ<0||i.waterQ>tankCapacity(i))?'家具の場所や大きさをえらび直そう。':'';}
export function furnitureTurn(x,z,turn){for(let n=0;n<turn;n++)[x,z]=[-z,x];return{x,z};}
export function furniturePoint(r,i,x=0,y=0,z=0){const p=furnitureTurn(x,z,i.turn);return{x:i.x+p.x,y:(r.y??0)+3+y,z:i.z+p.z};}
export function furnitureParts(r,i){const out=[],box=(key,x,y,z,w,h,d,kind='furniture')=>{const p=furniturePoint(r,i,x,y,z);out.push({id:r.id,detailId:i.id,key:'detail-'+i.id+'-furniture-'+key,kind,...p,w:i.turn%2?d:w,h,d:i.turn%2?w:d});},w=i.width,d=i.depth,seat=['table','workbench'].includes(i.shape)?24:14,thick=['table','workbench'].includes(i.shape)?4:3;
 if(i.shape==='lightTower'){
  const h=i.height,foot=4;
  for(const x of[-1,1])for(const z of[-1,1]){box('foot'+x+z,x*(w/2-3),1,z*(d/2-3),foot,2,foot);box('post'+x+z,x*(w/2-3),(h+.5)/2,z*(d/2-3),3,h-3.5,3);}
  for(let y=16;y<h;y+=24){for(const z of[-1,1])box('cross-x'+y+z,0,y,z*(d/2-3),w-9,2,3);for(const x of[-1,1])box('cross-z'+y+x,x*(w/2-3),y,0,3,2,d-9);}
  box('top',0,h,0,w,3,d);
  // The front service ladder has actual rungs, not a non-colliding painted strip.
  for(let y=8;y<h;y+=8)box('rung'+y,0,y,d/2+.5,10.5,1.5,2);
  for(const x of[-1,1])box('ladder'+x,x*6,(h+.5)/2,d/2+.5,1.5,h-3.5,2);
  for(const x of[-1,1]){box('lamp-case'+x,x*(w/2-9),h+5,0,14,7,10);box('lamp-face'+x,x*(w/2-9),h+5,5.25,11,4,.5);Object.assign(out.at(-1),{lampFace:true,lampMode:i.lampMode});}
  for(const p of out)p.structuralMaterial='steel';return out;
 }
 if(i.shape==='cistern'){
  box('vessel',0,34,0,w,48,d);Object.assign(out.at(-1),{primitive:'cylinder',materialVolume:Math.PI*(w*d*48-(w-4)*(d-4)*44)/4});
  // Four real feet and an outlet stand on the same floor as the visible tank.
  for(const x of[-1,1])for(const z of[-1,1])box('foot'+x+z,x*w/4,5,z*d/4,4,10,4);
  box('outlet',0,13,d/2+4,4,4,8);box('valve',0,17,d/2+4,8,4,4);
  box('gauge-back',0,38,d/2+1,5,28,2);
  for(const p of out)p.structuralMaterial='steel';return out;
 }
 if(i.shape==='tank'){box('base',0,2,0,w,4,d);for(const x of[-1,1])for(const z of[-1,1])box('frame'+x+z,x*(w/2-1),19,z*(d/2-1),2,30,2);box('front',0,17,d/2-1,w-4,26,2,'glass');box('back',0,17,-d/2+1,w-4,26,2,'glass');box('left',-w/2+1,17,0,2,26,d-4,'glass');box('right',w/2-1,17,0,2,26,d-4,'glass');for(const z of[-1,1])box('rim'+z,0,32,z*(d/2-1),w-4,2,2);for(const x of[-1,1])box('edge'+x,x*(w/2-1),32,0,2,2,d-4);return out;}
 if(i.shape==='workbench'){box('shelf',0,7,0,w-10,3,d-10);box('vice',w/2-7,28,d/2-3,10,8,8);}
 box('top',0,seat-thick/2,0,w,thick,d);
 for(const x of[-1,1])for(const z of[-1,1])box('leg'+x+z,x*(w/2-3),(seat-thick)/2,z*(d/2-3),4,seat-thick,4);
 if(!['table','workbench'].includes(i.shape)){box('back-left',-w/2+3,21,-d/2+3,4,14,4);box('back-right',w/2-3,21,-d/2+3,4,14,4);box('back',0,25,-d/2+3,w-10,6,3);}
 return out;
}
export function furnitureFeet(r,i){return[-1,1].flatMap(x=>[-1,1].flatMap(z=>{const p=furniturePoint(r,i,x*(i.shape==='cistern'?i.width/4:i.width/2-(i.shape==='tank'?2:3)),0,z*(i.shape==='cistern'?i.depth/4:i.depth/2-(i.shape==='tank'?2:3)));return[-1,1].flatMap(dx=>[-1,1].map(dz=>({x:p.x+dx*1.999,z:p.z+dz*1.999})));}));}
export function furnitureCandidate(r,shape,p,previous=null){const f=FURNITURE[shape];return{id:previous?.id??0,kind:'furniture',shape,x:Math.round(p.x/8)*8,z:Math.round(p.z/8)*8,width:previous?.width??f.width,depth:previous?.depth??f.depth,turn:previous?.turn??0,...(shape==='lightTower'?{height:previous?.height??80,lampMode:previous?.lampMode??'auto'}:{}),...(holdsWater({shape})?{waterQ:previous?.waterQ??0}:{})};}
// A small picture of the actual shape, rather than another text-heavy menu.
export function furniturePicture(shape){if(shape==='lightTower')return '<svg viewBox="0 0 100 68" aria-hidden="true"><path d="M30 60V20h40v40M30 32h40M30 46h40M44 24v36m12-36v36M44 34h12m-12 8h12m-12 8h12" fill="none" stroke="#5e899f" stroke-width="3"/><path d="M24 20h52" stroke="#69dece" stroke-width="5"/><rect x="25" y="7" width="20" height="12" rx="3" fill="#ffdf93" stroke="#557a8d" stroke-width="3"/><rect x="55" y="7" width="20" height="12" rx="3" fill="#ffdf93" stroke="#557a8d" stroke-width="3"/></svg>';if(shape==='cistern')return '<svg viewBox="0 0 100 68" aria-hidden="true"><path d="M29 52v10m42-10v10" stroke="#526e7f" stroke-width="5"/><path d="M24 14v34c0 14 52 14 52 0V14" fill="#79b8c9" stroke="#406775" stroke-width="2"/><ellipse cx="50" cy="14" rx="26" ry="8" fill="#c2e6eb" stroke="#406775" stroke-width="2"/><path d="M25 27q25 13 50 0M25 43q25 13 50 0" fill="none" stroke="#75f5d6" stroke-width="3"/><path d="M52 53h12v8" fill="none" stroke="#637f91" stroke-width="4"/><circle cx="65" cy="52" r="4" fill="#edb365"/><path d="M46 28v16" stroke="#254d6c" stroke-width="5"/><path d="M46 34v10" stroke="#56dbed" stroke-width="3"/></svg>';const i={id:1,kind:'furniture',shape,x:0,z:0,turn:0,waterQ:0,width:FURNITURE[shape].width,depth:FURNITURE[shape].depth},parts=furnitureParts({id:1,y:0},i),project=(x,y,z)=>[50+(x-z)*.65,49-y*.9+(x+z)*.24],polygon=(points,color)=>'<polygon points="'+points.map(p=>project(...p).join(',')).join(' ')+'" fill="'+color+'" stroke="#957f61" stroke-width=".6"/>';
 return'<svg viewBox="0 0 100 68" aria-hidden="true">'+parts.sort((a,b)=>(a.x+a.z)-(b.x+b.z)).map(p=>{const x=p.x-p.w/2,X=p.x+p.w/2,y=p.y-p.h/2,Y=p.y+p.h/2,z=p.z-p.d/2,Z=p.z+p.d/2;return polygon([[x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z]],'#d6b98d')+polygon([[X,y,z],[X,y,Z],[X,Y,Z],[X,Y,z]],'#c6a879')+polygon([[x,Y,z],[X,Y,z],[X,Y,Z],[x,Y,Z]],p.kind==='glass'?'#a5e3e9':'#f3dfb7');}).join('')+'</svg>';
}

// Water is visible volume, not an invisible solid box or free timber.
export function furnitureWaterParts(r,i){if(!holdsWater(i)||!i.waterQ)return[];if(i.shape==='cistern'){const h=24*i.waterQ/tankCapacity(i);return[{...furniturePoint(r,i,0,26+h/2,i.depth/2+2.25),w:i.turn%2?.5:3,h,d:i.turn%2?3:.5}];}const h=i.waterQ*32/((i.width-4)*(i.depth-4));return[{...furniturePoint(r,i,0,4+h/2,0),w:i.turn%2?i.depth-4:i.width-4,h,d:i.turn%2?i.width-4:i.depth-4}];}

// Presentation sources only. Materials, collisions and savings use the real parts above.
export function towerLightSources(rooms=[]){return rooms.flatMap(r=>(r.structure?.items??[]).filter(i=>i.kind==='furniture'&&i.shape==='lightTower').map(i=>({id:'tower-'+r.id+'-'+i.id,x:i.x,y:(r.y??0)+3+i.height+5-25,z:i.z,color:'warm',mode:i.lampMode,range:Math.min(300,i.height*2+80),reach:360,intensity:60+i.height*.6,haloSize:32})));}
