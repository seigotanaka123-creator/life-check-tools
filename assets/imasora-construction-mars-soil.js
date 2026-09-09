// Stage 6: contact-surface jump material. No global gravity or game-save changes.
export const SOIL_BODY=Object.freeze({radius:18,height:26.6,speed:48,gravity:90,jump:44,dt:1/120,step:7,minX:-240,maxX:240,minZ:-190,maxZ:170});
export const NORMAL_HEIGHT=44*44/(2*90);
export const SOIL_MODES=Object.freeze({single:['earth-soil','earth-soil','mars-soil'],stacked:['mars-soil','mars-soil','mars-soil'],covered:['mars-soil','mars-soil','earth-soil']}); // bottom → top
export const SOIL_PADS=Object.freeze([
  {id:'earth',name:'普通の土',minX:-160,maxX:-40,minZ:-10,maxZ:110},
  {id:'mars',name:'火星土',minX:40,maxX:160,minZ:-10,maxZ:110},
  {id:'ceiling',name:'天井の下の火星土',minX:-170,maxX:-50,minZ:-150,maxZ:-60}
].map(Object.freeze));
export const SOIL_SPAWNS=Object.freeze({earth:{x:-100,y:0,z:50,heading:Math.PI},mars:{x:100,y:0,z:50,heading:Math.PI},ceiling:{x:-110,y:0,z:-95,heading:Math.PI}});
export const SOIL_SOLIDS=Object.freeze([
  {id:'ceiling',name:'頭上の天井',minX:-180,maxX:-40,minZ:-160,maxZ:-50,minY:42,maxY:48,step:false},
  ...[[-178,-158],[-42,-158],[-178,-52],[-42,-52]].map(([x,z],i)=>({id:'post'+i,name:'天井の支柱',minX:x-2,maxX:x+2,minZ:z-2,maxZ:z+2,minY:0,maxY:42,step:false})),
  {id:'balcony',name:'高い足場',minX:45,maxX:225,minZ:-85,maxZ:-40,minY:22,maxY:26,step:false},
  ...[[50,-80],[162,-80],[220,-80]].map(([x,z],i)=>({id:'leg'+i,name:'足場の脚',minX:x-3,maxX:x+3,minZ:z-3,maxZ:z+3,minY:0,maxY:22,step:false})),
  ...[0,1,2,3].map(i=>({id:'step'+i,name:'戻り階段',minX:175,maxX:225,minZ:26-i*22,maxZ:48-i*22,minY:0,maxY:6.5*(i+1),step:true})),
].map(Object.freeze));
const EPS=1e-7,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),finite=Number.isFinite;
const horizontal=(p,b,r=SOIL_BODY.radius)=>p.x+r>b.minX+EPS&&p.x-r<b.maxX-EPS&&p.z+r>b.minZ+EPS&&p.z-r<b.maxZ-EPS;
const overlap=(p,b)=>horizontal(p,b)&&p.y<b.maxY-EPS&&p.y+SOIL_BODY.height>b.minY+EPS;
const inside=(p)=>p.x>=SOIL_BODY.minX+18-EPS&&p.x<=SOIL_BODY.maxX-18+EPS&&p.z>=SOIL_BODY.minZ+18-EPS&&p.z<=SOIL_BODY.maxZ-18+EPS&&p.y>=-EPS;
export const soilBodyBlocked=p=>!inside(p)||SOIL_SOLIDS.some(b=>overlap(p,b));
export function groundSoil(s,x,z){const pad=SOIL_PADS.find(b=>x>=b.minX&&x<=b.maxX&&z>=b.minZ&&z<=b.maxZ);return{material:pad?.id==='mars'?SOIL_MODES[s.mode][2]:pad?.id==='ceiling'?'mars-soil':'earth-soil',pad:pad?.id??'ground'};}
export function supportSoil(s,p=s.player){
  // Actual centres of the two official feet, rotated with the character.
  const sin=Math.sin(p.heading),cos=Math.cos(p.heading),contacts=[];
  for(const [x,z] of[[-5.4936,.4176],[5.4936,3.7008]]){
    const fx=p.x+x*cos+z*sin,fz=p.z-x*sin+z*cos;
    const slab=SOIL_SOLIDS.find(b=>Math.abs(p.y-b.maxY)<.002&&fx>=b.minX&&fx<=b.maxX&&fz>=b.minZ&&fz<=b.maxZ);
    if(slab)contacts.push({material:'earth-soil',pad:slab.id});else if(Math.abs(p.y)<.002)contacts.push(groundSoil(s,fx,fz));
  }
  return contacts.find(c=>c.material==='mars-soil')??contacts[0]??{material:'earth-soil',pad:'edge'};
}
export function initialMarsSoil(){return{schema:1,mode:'single',player:{...SOIL_SPAWNS.earth,vy:0,grounded:true,jumpHeld:false,ceilingHit:false},time:0,phase:0,paused:false,flight:null,records:{},jumpCount:0,headContacts:0,roofVisits:0,hit:'',message:'まず普通の土でジャンプ。次に火星土へ移って、高さを比べてみましょう。'};}
function vertical(p,dy){let d=dy,hit='';if(dy<0&&p.y+dy<=0){d=-p.y;hit='地面';}for(const b of SOIL_SOLIDS){if(!horizontal(p,b))continue;if(dy>0&&p.y+26.6<=b.minY+EPS){const gap=b.minY-p.y-26.6;if(gap<=d+EPS){d=Math.max(0,gap);hit=b.name;}}if(dy<0&&p.y>=b.maxY-EPS){const gap=b.maxY-p.y;if(gap>=d-EPS){d=Math.min(0,gap);hit=b.name;}}}p.y+=d;return hit;}
const grounded=p=>{const copy={...p};return !!vertical(copy,-.001);};
function launch(s){if(!s.player.grounded||s.paused)return false;const surface=supportSoil(s),boost=surface.material==='mars-soil'?3:1;const key=surface.pad==='ceiling'?'ceiling':surface.pad==='mars'?s.mode:'normal';s.player.vy=SOIL_BODY.jump*Math.sqrt(boost);s.player.grounded=false;s.flight={from:s.player.y,peak:0,boost,key,material:surface.material,hit:false,elapsed:0};s.jumpCount++;s.message=boost===3?'火星土から踏み切りました。上昇量は通常の3倍です。':'普通の土から踏み切りました。';return true;}
export function marsSoilAction(state,action,value){const s=structuredClone(state);if(action==='jump'){launch(s);return s;}if(action==='pause'){s.paused=!s.paused;s.message=s.paused?'一時停止中です。':'再開しました。';return s;}
  if(action==='place'){if(!SOIL_SPAWNS[value])throw Error('不明な比較場所です。');s.player={...initialMarsSoil().player,...SOIL_SPAWNS[value]};s.flight=null;s.hit='';s.message=value==='ceiling'?'天井の下です。ジャンプで頭が止まることを試せます。':`${value==='earth'?'普通の土':'火星土'}の比較位置です。「ジャンプ」で試してください。`;return s;}
  if(action==='mode'){if(!Object.hasOwn(SOIL_MODES,value))throw Error('不明な土の断面です。');if(!s.player.grounded){s.message='着地してから土の断面を切り替えてください。';return s;}s.mode=value;s.message=value==='covered'?'火星土を普通の土で覆いました。表面が普通の土なので、ジャンプは通常に戻ります。':value==='stacked'?'火星土を3層にしました。厚くしても到達高は3倍のままです。':'火星土1層へ戻しました。表面で踏み切ると3倍です。';return s;}
  throw Error('不明な操作です。');
}
function horizontalMove(p,axis,delta){if(!delta)return'';const q={...p,[axis]:clamp(p[axis]+delta,SOIL_BODY['min'+axis.toUpperCase()]+18,SOIL_BODY['max'+axis.toUpperCase()]-18)},blocks=SOIL_SOLIDS.filter(b=>overlap(q,b));
  if(!blocks.length){const hit=q[axis]!==p[axis]+delta?'安全柵':'';p[axis]=q[axis];return hit;}
  if(p.grounded&&p.vy<=0&&blocks.every(b=>b.step)){const rise=Math.max(...blocks.map(b=>b.maxY-p.y)),lift={...p};if(rise>EPS&&rise<=7&&!vertical(lift,rise)&&!SOIL_SOLIDS.some(b=>overlap({...q,y:lift.y},b))){p[axis]=q[axis];p.y=lift.y;return'';}}
  return blocks[0].name;
}
export function stepMarsSoil(state,input={},dt=SOIL_BODY.dt){
  if(!finite(dt)||dt<=0||dt>.05)throw Error('更新刻みが不正です。');if(state.paused)return state;
  const s={...state,player:{...state.player},flight:state.flight?{...state.flight}:null,records:{...state.records},time:state.time+dt,hit:''},p=s.player;
  p.grounded=p.vy<=0&&grounded(p);if(input.jump&&!p.jumpHeld)launch(s);p.jumpHeld=!!input.jump;p.ceilingHit=false;
  const ix=finite(input.x)?clamp(input.x,-1,1):0,iz=finite(input.z)?clamp(input.z,-1,1):0,n=Math.max(1,Math.hypot(ix,iz)),dx=ix/n*48*dt,dz=iz/n*48*dt;
  // Spatial substeps plus swept vertical travel also cover fast diagonal edge contacts.
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz,p.vy*dt)/.25));const h=dt/count;
  for(let i=0;i<count;i++){
    for(const axis of['x','z'])s.hit=horizontalMove(p,axis,(axis==='x'?dx:dz)/count)||s.hit;
    p.grounded=p.vy<=0&&grounded(p);
    if(!p.grounded){let left=h;while(left>1e-10){const part=p.vy>0&&p.vy/90<left?p.vy/90:left;const dy=p.vy*part-45*part*part,up=dy>0,hit=vertical(p,dy);p.vy-=90*part;left-=part;if(Math.abs(p.vy)<1e-9)p.vy=0;if(hit){s.hit=hit;p.vy=0;if(up){p.ceilingHit=true;if(s.flight)s.flight.hit=true;}else p.grounded=true;}if(s.flight)s.flight.peak=Math.max(s.flight.peak,p.y-s.flight.from);if(hit&&!up)break;}}
  }
  if(ix||iz)p.heading=Math.atan2(ix,iz);
  if(p.ceilingHit&&!state.player.ceilingHit){s.headContacts++;s.message='天井に頭が当たりました。上昇を止めて、その場から落下します。';}
  if(s.flight){s.flight.elapsed+=dt;if(p.grounded){const f=s.flight;s.records[f.key]={height:f.peak,blocked:f.hit,boost:f.boost};if(supportSoil(s).pad==='balcony'){s.roofVisits++;s.message='高い足場へ着地できました！右側の階段から歩いて戻れます。';}else if(!f.hit)s.message=`着地。今回の上昇量は ${f.peak.toFixed(2)} です。`;s.flight=null;}}
  return s;
}
export function advanceMarsSoil(s,input,dt){if(!finite(dt)||dt<0||dt>.1)throw Error('更新時間が不正です。');if(s.paused||!dt)return s;s={...s,phase:s.phase+dt};while(s.phase>=1/120-1e-9){s={...s,phase:Math.max(0,s.phase-1/120)};s=stepMarsSoil(s,input);}if(s.phase<1e-9)s.phase=0;return s;}
export function validateMarsSoil(s){if(s.schema!==1||!Object.hasOwn(SOIL_MODES,s.mode)||!finite(s.time)||s.time<0||!finite(s.phase)||s.phase<0||s.phase>=1/120+1e-8)throw Error('火星土の実験状態が不正です。');if(!['x','y','z','heading','vy'].every(k=>finite(s.player[k]))||soilBodyBlocked(s.player))throw Error('身体が床・壁・天井に入りました。');if(s.flight&&(![1,3].includes(s.flight.boost)||!finite(s.flight.peak)||s.flight.peak<0))throw Error('ジャンプの記録が不正です。');return s;}
