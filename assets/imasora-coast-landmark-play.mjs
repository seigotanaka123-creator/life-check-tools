// Small, bounded physical toys. They never create construction resources.
export const COAST_TOYS=Object.freeze({
 lighthouse:{name:'ひかりのハンドル',x:-650,z:235,title:'光を3つの貝に合わせよう',buttons:['↶ 左へ','右へ ↷']},
 rocks:{name:'潮の水門',x:-465,z:240,title:'水を流して、浮きを黄色い輪へ',buttons:['↑ 水門を上げる','↓ 水門を下げる']},
 garden:{name:'水車の庭',x:665,z:113,title:'水車を回して、2つの花を咲かせよう',buttons:['💧 ポンプを押す','↔ 注ぎ先をかえる']}
});
export const LIGHT_ANGLES=Object.freeze([-.8,0,.8]);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const copy=v=>structuredClone(v);
export function initialCoastToys(){return{version:1,edit:0,tick:0,lighthouse:{angle:-1.25,velocity:0,power:0,lit:[false,false,false],charge:[0,0,0]},rocks:{gate:0,water:0,x:-28,vx:0,y:2,vy:0,hold:0,done:false},garden:{tank:16,wheel:0,speed:0,aim:0,beds:[0,0],done:false},history:[]};}
const body=s=>Object.fromEntries(['lighthouse','rocks','garden'].map(k=>[k,copy(s[k])]));
export function validateCoastToys(s){
 const ok=(v)=>{if(!v)throw Error('海辺の仕掛けのセーブを確認しています。');};
 const keys=(v,ks)=>v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).sort().join('|')===[...ks].sort().join('|');
 const number=(n,a,b)=>Number.isFinite(n)&&n>=a&&n<=b;
 const values=v=>{
  ok(keys(v,['lighthouse','rocks','garden']));const l=v.lighthouse,r=v.rocks,g=v.garden;
  ok(keys(l,['angle','velocity','power','lit','charge'])&&number(l.angle,-1.4,1.4)&&number(l.velocity,-3,3)&&number(l.power,0,1));
  ok(Array.isArray(l.lit)&&l.lit.length===3&&l.lit.every(x=>typeof x==='boolean')&&Array.isArray(l.charge)&&l.charge.length===3&&l.charge.every(x=>number(x,0,1)));
  ok(keys(r,['gate','water','x','vx','y','vy','hold','done'])&&number(r.gate,0,1)&&number(r.water,0,1)&&number(r.x,-32,32)&&number(r.vx,-40,40)&&number(r.y,0,18)&&number(r.vy,-60,60)&&number(r.hold,0,1)&&typeof r.done==='boolean');
  ok(keys(g,['tank','wheel','speed','aim','beds','done'])&&number(g.tank,0,16)&&number(g.wheel,0,Math.PI*2)&&number(g.speed,0,12)&&[0,1].includes(g.aim)&&Array.isArray(g.beds)&&g.beds.length===2&&g.beds.every(x=>number(x,0,4))&&typeof g.done==='boolean');
 };
 ok(keys(s,['version','edit','tick','lighthouse','rocks','garden','history'])&&s.version===1&&Number.isSafeInteger(s.edit)&&s.edit>=0&&Number.isSafeInteger(s.tick)&&s.tick>=0);
 values({lighthouse:s.lighthouse,rocks:s.rocks,garden:s.garden});ok(Array.isArray(s.history)&&s.history.length<=10);for(const v of s.history)values(v);return s;
}
export function editCoastToys(s,action,id){
 validateCoastToys(s);if(!Object.hasOwn(COAST_TOYS,id))throw Error('仕掛けに近づこう。');
 if(action==='undo'){const old=s.history.pop();if(!old)return false;Object.assign(s,old);s.edit++;return true;}
 if(!['begin','reset','aim'].includes(action))throw Error('道具を選ぼう。');
 s.history.push(body(s));if(s.history.length>10)s.history.shift();s.edit++;
 if(action==='reset')s[id]=initialCoastToys()[id];
 if(action==='aim')s.garden.aim=1-s.garden.aim;
 return true;
}
export function nearestCoastToy(c){
 if(c.map!=='coast'||c.airborne||c.workshop)return null;
 return Object.entries(COAST_TOYS).map(([id,t])=>({id,d:Math.hypot(c.x-t.x,c.z-t.z)})).filter(t=>t.d<=65).sort((a,b)=>a.d-b.d)[0]?.id??null;
}
export function coastToyInMotion(s,id){
 if(id==='lighthouse')return s.lighthouse.power>.001||Math.abs(s.lighthouse.velocity)>.001;
 if(id==='garden')return s.garden.tank<15.999||s.garden.speed>.001;
 if(id==='rocks'){const r=s.rocks;return r.gate>.01||r.water>.001||Math.abs(r.vx)>.01||Math.abs(r.vy)>.01;}
 return false;
}
// Fixed 60 Hz semi-implicit integration. No idle/background wall-time catch-up.
export function stepCoastToy(s,id,{a=false,b=false}={}){
 const dt=1/60;s.tick++;
 if(id==='lighthouse'){
  const l=s.lighthouse,drive=(b?1:0)-(a?1:0);
  l.velocity=clamp((l.velocity+drive*3.7*dt)*Math.exp(-5.5*dt),-3,3);l.angle=clamp(l.angle+l.velocity*dt,-1.4,1.4);
  if(Math.abs(l.angle)>=1.4)l.velocity=0;l.power=clamp(l.power+(drive?1.7:-.18)*dt,0,1);
  LIGHT_ANGLES.forEach((angle,i)=>{l.charge[i]=clamp(l.charge[i]+(Math.abs(l.angle-angle)<.14&&l.power>.12?1.8:-.6)*dt,0,1);if(l.charge[i]>=1)l.lit[i]=true;});
 }else if(id==='rocks'){
  const r=s.rocks;r.gate=clamp(r.gate+((a?1:0)-(b?1:0))*.9*dt,0,1);
  r.water=clamp(r.water+(r.gate*.48-r.water*.28)*dt,0,1);
  // Water height produces buoyancy; the current drags the floating body. A
  // lowered sluice damps the current, so timing matters at the receiving ring.
  const depth=r.water*10,immersed=clamp((depth-r.y+2)/4,0,1);
  r.vy=clamp((r.vy+(immersed*48-12)*dt)*Math.exp(-3*dt),-60,60);r.y=clamp(r.y+r.vy*dt,0,18);if(r.y===0)r.vy=Math.max(0,r.vy);
  // Closing a hand-operated sluice should settle the light float before the
  // far wall, rather than depending on a wall rebound to reach the ring.
  const flow=r.gate*r.water*14;r.vx=clamp((r.vx+(flow-r.vx)*immersed*3.6*dt)*Math.exp(-.6*dt),-40,40);r.x=clamp(r.x+r.vx*dt,-32,32);if(Math.abs(r.x)>=32)r.vx*=-.35;
  r.hold=clamp(r.hold+(Math.abs(r.x-20)<5&&Math.abs(r.vx)<1.2&&r.gate<.08&&r.water>.16?dt:-dt*2),0,1);if(r.hold>=1)r.done=true;
 }else if(id==='garden'){
  const g=s.garden,flow=a&&g.tank>0?2.4:0,used=Math.min(g.tank,flow*dt);g.tank-=used;
  g.speed=clamp((g.speed+used*10)*Math.exp(-1.8*dt),0,12);g.wheel=(g.wheel+g.speed*dt)%(Math.PI*2);
  g.beds[g.aim]=clamp(g.beds[g.aim]+used,0,4);if(g.beds.every(x=>x>=4))g.done=true;
  // Closed-loop demonstration garden: return channel, no inventory creation.
  if(!a)g.tank=Math.min(16,g.tank+1.5*dt);
 }
 return s;
}
