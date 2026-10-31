// Inject the established physical geometry. This module never creates parts,
// currencies, loans, achievements, or an alternate save store.
export function createCoastBoatBookTools({SEA_PARTS,coastAssembly,worldPoint,localPoint,qmul,conj,coastMountPoint,coastMountRotation,coastMountRange}){
 const fail=m=>{throw Error(m);},ok=(v,m)=>{if(!v)fail(m);},keys=(o,k)=>o&&Object.getPrototypeOf(o)===Object.prototype&&Reflect.ownKeys(o).length===Object.keys(o).length&&Object.values(Object.getOwnPropertyDescriptors(o)).every(d=>Object.hasOwn(d,'value')&&d.enumerable)&&Object.keys(o).sort().join('|')===k.split('|').sort().join('|');
 const ramp=(s,p)=>s.links.some(j=>(j.id==='loading-ramp-'+p.id||j.id.startsWith('unload-ramp-'))&&j.b===p.id);
 const slot=n=>Number.isInteger(n)&&n>=0&&n<4;
 const sameQ=(a,b)=>Math.abs(a.reduce((n,v,i)=>n+v*b[i],0))>1-1e-7;
 const round=n=>Math.round(n*1e5)/1e5;
 function geometry(page){
  const parts=[];for(const [i,p]of page.parts.entries()){
   const parent=parts[p.parent];parts.push({id:'book-'+i,type:p.type,p:i?coastMountPoint(parent,p.type,p.side,p.offset,p.turn):[0,0,0],q:i?coastMountRotation(parent,p.turn):[0,0,0,1],v:[0,0,0],w:[0,0,0]});
  }return parts;
 }
 function validate(book){
  ok(keys(book,'version|pages')||keys(book,'version|pages|active'),'船の設計帳の項目が違います。');ok(book.version===1&&Array.isArray(book.pages)&&book.pages.length===4,'船の設計帳のページが違います。');
  for(const page of book.pages){if(page===null)continue;ok(keys(page,'name|parts')&&typeof page.name==='string'&&page.name.trim().length>0&&page.name.length<=24&&!/[\u0000-\u001f\u007f]/.test(page.name),'船の名前が違います。');ok(Array.isArray(page.parts)&&page.parts.length>=1&&page.parts.length<=11,'船の形の記録が違います。');const counts={board:0,float:0};
   for(const [i,p]of page.parts.entries()){ok(keys(p,i?'type|parent|side|offset|turn':'type')&&Object.hasOwn(counts,p.type)&&(i||p.type==='board'),'船の部品の記録が違います。');counts[p.type]++;ok(counts[p.type]<=SEA_PARTS[p.type].limit,'船の部品が多すぎます。');if(i){ok(Number.isInteger(p.parent)&&p.parent>=0&&p.parent<i&&Number.isInteger(p.side)&&p.side>=0&&p.side<4&&Number.isInteger(p.turn)&&p.turn>=0&&p.turn<4&&Number.isFinite(p.offset),'船のつなぎ方が違います。');const parent=page.parts[p.parent];ok(Math.abs(p.offset)<=coastMountRange(parent,p.type,p.side,p.turn)+.001,'船のつなぎ先が遠すぎます。');}}
  }
  if(Object.hasOwn(book,'active'))ok(keys(book.active,'page|boat')&&slot(book.active.page)&&book.pages[book.active.page]&&typeof book.active.boat==='string'&&/^sea-\d+$/.test(book.active.boat),'船の見本の記録が違います。');return book;
 }
 function capture(s,id,name){
  const g=coastAssembly(s,id),root=g&&s.parts.find(p=>p.type==='board'&&g.ids.has(p.id)&&!ramp(s,p));ok(root,'形をおぼえる船の板をえらぼう。');
  const members=s.parts.filter(p=>g.ids.has(p.id)&&p.type!=='cargo'&&!ramp(s,p)),found=new Map([[root.id,0]]),queue=[root],rows=[{type:'board'}];
  for(let index=0;index<queue.length;index++){
   const parent=queue[index];for(const j of s.links){if(j.kind!=='weld'||![j.a,j.b].includes(parent.id))continue;const child=members.find(p=>p.id===(j.a===parent.id?j.b:j.a));if(!child||found.has(child.id))continue;
    const delta=qmul(conj(parent.q),child.q);let mount=null;
    for(let turn=0;turn<4&&!mount;turn++){if(!sameQ(delta,[0,Math.sin(turn*Math.PI/4),0,Math.cos(turn*Math.PI/4)]))continue;const v=localPoint(parent,child.p);for(let side=0;side<4;side++){const offset=round(v[side<2?2:0]);if(Math.abs(offset)>coastMountRange(parent,child.type,side,turn)+.001)continue;const p=coastMountPoint(parent,child.type,side,offset,turn);if(Math.hypot(...p.map((v,i)=>v-child.p[i]))<.02){mount={type:child.type,parent:index,side,offset,turn};break;}}}
    ok(mount,'板と浮きだけでつながる形にしてからおぼえよう。');found.set(child.id,rows.length);rows.push(mount);queue.push(child);
   }
  }
  ok(found.size===members.length,'板と浮きだけでつながる形にしてからおぼえよう。');
  const page={name,parts:rows};validate({version:1,pages:[page,null,null,null]});return page;
 }
 function edit(s,action){
  const book=s.boatBook?structuredClone(s.boatBook):{version:1,pages:[null,null,null,null]};
  if(action.type==='book-save'){ok(slot(action.page),'おぼえるページをえらぼう。');book.pages[action.page]=capture(s,action.id,action.name??'ふね '+(action.page+1));}
  else if(action.type==='book-guide'){ok(slot(action.page)&&book.pages[action.page],'見たい船の形をえらぼう。');const g=coastAssembly(s,action.id),root=g&&s.parts.find(p=>p.type==='board'&&g.ids.has(p.id)&&!ramp(s,p));ok(root,'見本をかさねる船の板をえらぼう。');book.active={page:action.page,boat:root.id};}
  else if(action.type==='book-hide')delete book.active;
  else fail('船の設計帳をえらびなおそう。');
  validate(book);s.boatBook=book;
 }
 function progress(s,active=s.boatBook?.active){
  const page=active&&s.boatBook?.pages[active.page],root=active&&s.parts.find(p=>p.id===active.boat&&p.type==='board');if(!root||!page)return null;
  const g=coastAssembly(s,root.id),parts=geometry(page),localParts=parts.map((p,i)=>({...p,p:[...p.p],q:[...p.q],designIndex:i})),available=s.parts.filter(p=>g.ids.has(p.id)&&p.type!=='cargo'&&!ramp(s,p)),used=new Set(),matches=[];
  for(const [i,p]of parts.entries()){const point=worldPoint(root,p.p),rotation=qmul(root.q,p.q),actual=available.find(a=>!used.has(a.id)&&a.type===p.type&&(i!==0||a.id===root.id)&&Math.hypot(...a.p.map((v,k)=>v-point[k]))<1.5&&sameQ(a.q,rotation));if(actual)used.add(actual.id);matches.push(actual?.id??null);p.p=point;p.q=rotation;p.designIndex=i;}
  const missing=parts.filter((p,i)=>!matches[i]),next=page.parts.findIndex((p,i)=>!matches[i]&&matches[p.parent]);
  return{page:active.page,name:page.name,boat:root.id,parts,localParts,missing,matches,total:parts.length,matched:used.size,extras:available.length-used.size,next:next<0?null:{index:next,id:matches[page.parts[next].parent],...page.parts[next]}};
 }
 return{validate,capture,edit,geometry,progress};
}
