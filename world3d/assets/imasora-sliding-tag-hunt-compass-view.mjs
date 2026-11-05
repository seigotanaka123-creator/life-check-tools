const border={danger:'#ff6464',warning:'#ffd35d',clear:'#a6e8e9'};
// North stays at the top. The central arrow itself turns clockwise with the
// resolved camera heading; world-space contacts stay on the same cardinal map.
export function createHuntCompassView(canvas,{createCanvas=()=>document.createElement('canvas')}={}){
 const c=canvas.getContext('2d'),dials=new Map();let draws=0,pointerRotation=0;
 let lastDanger=null,lastContacts=[];
 canvas.addEventListener?.('contextrestored',()=>{lastDanger=null;});
 function dial(danger){const key=Object.hasOwn(border,danger)?danger:'clear';if(dials.has(key))return dials.get(key);const image=createCanvas();image.width=image.height=96;const x=image.getContext('2d');x.fillStyle='#173a4ddd';x.beginPath();x.arc(48,48,45,0,Math.PI*2);x.fill();x.strokeStyle=border[key];x.lineWidth=3;x.stroke();x.lineWidth=1;x.strokeStyle='#c9e8ed44';for(const r of[14,25,35]){x.beginPath();x.arc(48,48,r,0,Math.PI*2);x.stroke();}x.font='bold 11px system-ui';x.textAlign='center';x.textBaseline='middle';for(const[name,px,py]of[['北',48,11],['東',85,48],['南',48,85],['西',11,48]]){x.fillStyle=name==='北'?'#ffb8a8':'#d6eef6';x.fillText(name,px,py);}dials.set(key,image);return image;}
 return{draw(map){
  const heading=Number.isFinite(map.heading)?map.heading:0;
  const danger=Object.hasOwn(border,map.danger)?map.danger:'clear';
  // Time and owner IDs are diagnostics. Only the heading and visible dots affect pixels.
  if(heading===pointerRotation&&danger===lastDanger&&map.contacts.length===lastContacts.length&&map.contacts.every((p,i)=>{
   const last=lastContacts[i];
   return p.sector===last.sector&&p.band===last.band&&p.level===last.level;
  }))return false;
  c.clearRect(0,0,96,96);
  c.drawImage(dial(danger),0,0);
  for(const p of map.contacts){const angle=p.sector*Math.PI/4,r=[0,12,23,31][p.band];c.fillStyle=p.level==='danger'?'#ff6868':p.level==='warning'?'#ffe16b':'#a5e9ed';c.beginPath();c.arc(48+Math.sin(angle)*r,48+Math.cos(angle)*r,3,0,Math.PI*2);c.fill();}
  c.save();c.translate(48,48);c.rotate(heading);c.fillStyle='#fff';c.strokeStyle='#163c50';c.lineWidth=1.5;c.beginPath();c.moveTo(0,-18);c.lineTo(8,8);c.lineTo(0,3);c.lineTo(-8,8);c.closePath();c.fill();c.stroke();c.restore();
  pointerRotation=heading;
  lastDanger=danger;
  lastContacts=map.contacts.map(({sector,band,level})=>({sector,band,level}));
  draws++;
  return true;
 },stats:()=>({cachedDials:dials.size,draws,dialRotation:0,pointerRotation,headingUp:false})};
}
