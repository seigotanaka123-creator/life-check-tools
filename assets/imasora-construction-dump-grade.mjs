// Roadmap 9-2b1. Finite practice stock, never a normal-world import format.
// Wheel support and the rendered ramp share gradeHeightAt. No gravity-driven
// runaway: released controls brake to rest, including on a downhill slope.
export const GRADE_FORMAT='imasora-dump-grade-practice';
export const GRADE_STOCK=48;
export const GRADE_COURSES=Object.freeze({gentle:Object.freeze({height:34,length:240}),steep:Object.freeze({height:92,length:180})});
const courseKnown=course=>typeof course==='string'&&Object.hasOwn(GRADE_COURSES,course);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),approach=(v,t,d)=>v<t?Math.min(t,v+d):Math.max(t,v-d),rad=n=>n*Math.PI/180;
const finite=n=>typeof n==='number'&&Number.isFinite(n),require=(ok,message)=>{if(!ok)throw Error(message);};
export function gradeHeightAt(course,x,z){
 if(!courseKnown(course))return undefined;const c=GRADE_COURSES[course];if(!finite(x)||!finite(z)||Math.abs(x)>122||Math.abs(z)>242)return undefined;
 // A wide approach and plateau; the ramp has real edges, no invisible support.
 if(z> -c.length/2&&z<c.length/2&&Math.abs(x)>72)return 0;
 if(z>=c.length/2&&Math.abs(x)>72)return 0;
 const u=clamp((z+c.length/2)/c.length,0,1);return c.height*(1-Math.cos(Math.PI*u))/2;
}
const local=(v,x,z)=>({x:v.x+Math.cos(v.heading)*x+Math.sin(v.heading)*z,z:v.z-Math.sin(v.heading)*x+Math.cos(v.heading)*z});
export function gradeSupport(course,vehicle,load){
 if(!courseKnown(course)||!finite(load)||load<0||load>48||!vehicle||!['x','z','heading'].every(k=>finite(vehicle[k])))return{ok:false,reason:'車両の位置を確認できません。'};
 const v=vehicle,wheels=[];
 for(const z of[-31,18])for(const x of[-25.5,25.5]){
  const p=local(v,x,z),samples=[[-4,-6],[4,-6],[-4,6],[4,6],[0,0]].map(([dx,dz])=>{const q=local(v,x+dx,z+dz);return gradeHeightAt(course,q.x,q.z);});
  if(samples.some(h=>h===undefined))return{ok:false,reason:'道路の端です。後退して中央へ戻ってください。'};
  if(Math.max(...samples)-Math.min(...samples)>4.5)return{ok:false,reason:'車輪の下に段差があります。平らな道へ戻ってください。'};
  wheels.push({x,z,height:samples.reduce((a,b)=>a+b,0)/samples.length,world:p});
 }
 const rear=(wheels[0].height+wheels[1].height)/2,front=(wheels[2].height+wheels[3].height)/2,left=(wheels[0].height+wheels[2].height)/2,right=(wheels[1].height+wheels[3].height)/2;
 const pitch=Math.atan2(front-rear,49),roll=Math.atan2(right-left,51),y=rear+(front-rear)*31/49;
 const limits={pitch:rad(load?15:19),roll:rad(load?10:13)};
 if(Math.abs(pitch)>limits.pitch)return{ok:false,reason:load?'積荷があると、この坂は急すぎます。後退して戻ってください。':'この坂は急すぎます。後退して戻ってください。',pitch,roll};
 if(Math.abs(roll)>limits.roll)return{ok:false,reason:'車体が横へ傾きすぎます。坂に沿って走ってください。',pitch,roll};
 // Fit the axle plane to all four tyres, then check it against the road under
 // the chassis. This rejects a bridge across a crest or an unsupported edge.
 for(const z of[-39,-24,0,24,39])for(const x of[-29,0,29]){
  const p=local(v,x,z),h=gradeHeightAt(course,p.x,p.z),plane=y+Math.tan(pitch)*z+Math.tan(roll)*x;
  if(h===undefined||h>plane+3.2||plane-h>5)return{ok:false,reason:'車体の下に段差があります。道路の中央へ戻ってください。'};
 }
 return{ok:true,y,pitch,roll,wheels};
}
export function createGradeWorld(course='gentle'){
 require(courseKnown(course),'坂道の種類が違います。');
 return{format:GRADE_FORMAT,version:1,course,source:0,load:48,vehicle:{x:0,z:-180,heading:0,speed:0,steering:0,wheelTravel:0},distance:0,message:'48個の土を積んでいます。Wで坂を上り、離すと停車します。'};
}
export function gradeDepotReady(s){return Math.abs(s.vehicle.speed)<.001&&Math.abs(s.vehicle.x)<15&&Math.abs(s.vehicle.z+180)<16&&Math.abs(s.vehicle.heading)<.12;}
export function gradeStockAction(s,action){
 validateGradeWorld(s);require(gradeDepotReady(s),'積込所にまっすぐ停めてください。');require(['load','return'].includes(action),'積荷の操作が違います。');
 return{...s,source:action==='load'?0:48,load:action==='load'?48:0,message:action==='load'?'積込完了。土48個を運びます。':'土48個を積込所へ戻しました。空の荷台で走れます。'};
}
export function stepGradeWorld(s,input,dt){
 require(finite(dt)&&dt>0&&dt<=.05,'走行の時間が不正です。');
 require(['throttle','steer'].every(k=>input[k]===undefined||finite(input[k])&&Math.abs(input[k])<=1),'走行の入力が不正です。');
 const support=gradeSupport(s.course,s.vehicle,s.load);require(support.ok,'安全に支えられた場所から走行してください。');
 const v={...s.vehicle},throttle=input.throttle??0,steer=input.steer??0,load=s.load/48,boost=input.fast===true?1.5:1;
 // Front rises => positive grade. Ascending slows the heavy truck, downhill
 // has a lower speed ceiling rather than an unbounded gravity acceleration.
 const ascending=Math.max(0,Math.sin(support.pitch)*Math.sign(throttle)),descending=Math.max(0,-Math.sin(support.pitch)*Math.sign(throttle));
 const cruise=(throttle>=0?48:28)*(1-load*.3)*boost,limit=cruise*(1-ascending*(1.2+load))*(1-descending*.7);
 const target=input.brake||!throttle?0:throttle*Math.max(8,limit),rate=input.brake?150:!throttle?95:42/(1+load*.65);
 v.speed=approach(v.speed,target,rate*dt);v.steering=approach(v.steering,steer?-steer*.42:0,1.8*dt);
 const travel=v.speed*dt,count=Math.max(1,Math.ceil(Math.abs(travel)/.35));let distance=0,message=s.message,blocked=false;
 for(let i=0;i<count;i++){
  const d=travel/count,h=v.heading+Math.tan(v.steering)*d/49,q={...v,x:v.x+Math.sin((h+v.heading)/2)*d,z:v.z+Math.cos((h+v.heading)/2)*d,heading:Math.atan2(Math.sin(h),Math.cos(h))};
  const nextSupport=gradeSupport(s.course,q,s.load);
  if(!nextSupport.ok){v.speed=0;message=nextSupport.reason;blocked=true;break;}
  Object.assign(v,q);v.wheelTravel+=d;distance+=Math.abs(d);
 }
 if(!v.speed&&support.ok&&throttle===0&&s.vehicle.speed!==0)message='停車中。Wで前進、Sで後退できます。';
 else if(distance&&!blocked)message=input.brake||!throttle?'ブレーキで停車しています。':ascending>.025?'坂を上っています。重い積荷はゆっくり運びます。':descending>.025?'坂を下っています。速度を抑えて走行します。':throttle<0?'後退しています。':'前進しています。';
 return{...s,vehicle:v,distance:s.distance+distance,message};
}
export function validateGradeWorld(s){
 require(s&&Object.getPrototypeOf(s)===Object.prototype&&Object.keys(s).sort().join('|')==='course|distance|format|load|message|source|vehicle|version','坂道練習の控えではありません。');
 require(s.format===GRADE_FORMAT&&s.version===1&&courseKnown(s.course),'通常の保存や別の練習場の控えは読み込めません。');
 require(Number.isInteger(s.source)&&Number.isInteger(s.load)&&s.source>=0&&s.load>=0&&s.source+s.load===48,'土の合計が違います。');
 const v=s.vehicle;require(v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).sort().join('|')==='heading|speed|steering|wheelTravel|x|z'&&Object.values(v).every(finite),'車両の記録が違います。');
 require(Math.abs(v.heading)<=Math.PI&&Math.abs(v.speed)<=72&&Math.abs(v.steering)<=.42&&finite(s.distance)&&s.distance>=0&&s.distance<=1e8&&Math.abs(v.wheelTravel)<=s.distance+1e-6&&typeof s.message==='string'&&s.message.length<=180,'走行の記録が違います。');
 require(gradeSupport(s.course,v,s.load).ok,'車輪や車体が支えられていない控えは復元できません。');return s;
}
const sum=text=>{let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return(h>>>0).toString(16);};
export function packGradeWorld(s){validateGradeWorld(s);const state={...s,vehicle:{...s.vehicle,speed:0}},text=JSON.stringify(state);return JSON.stringify({kind:GRADE_FORMAT,state,checksum:sum(text)});}
export function unpackGradeWorld(text){
 require(typeof text==='string'&&text.length<4096,'坂道練習の控えではありません。');const p=JSON.parse(text);
 require(p&&Object.keys(p).sort().join('|')==='checksum|kind|state'&&p.kind===GRADE_FORMAT&&p.checksum===sum(JSON.stringify(p.state)),'控えが壊れているか、別の保存形式です。');
 validateGradeWorld(p.state);require(p.state.vehicle.speed===0,'停車した控えだけ復元できます。');return{...p.state,message:'控えから復元しました。停車中です。'};
}
