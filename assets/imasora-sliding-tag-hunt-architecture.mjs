// Static visual rows only. Keep the existing solid buildings and passageways;
// no new doors, supports, navigation targets or collision geometry are added.
export function huntBuildingArchitecture(b,index=0){
 const rows={frames:[],trim:[],windows:[],nightWindows:[],style:index%3};if(b.kind)return rows;
 const base=b.base??0,front=(sign,u,y,w,h,d,offset=.025)=>[b.x+u,base+y,b.z+sign*(b.d/2+offset),w,h,d,0],side=(sign,u,y,w,h,d,offset=.025)=>[b.x+sign*(b.w/2+offset),base+y,b.z+u,w,h,d,Math.PI/2];
 for(const sign of[-1,1]){
  // Three readable facades: horizontal ribbon windows, framed upper/lower
  // bays, and tall vertical bays. Existing front/back glass stays in place.
  if(rows.style===2){for(let x=-b.w/2+4;x<b.w/2-2;x+=5)rows.frames.push(front(sign,x,(b.h+3)/2,3.15,b.h-5,.05));}
  else for(let y=6;y<b.h-1;y+=4){if(rows.style===0)rows.frames.push(front(sign,0,y,b.w-3,2.5,.05));else if(y===6||y+4>=b.h-1)for(let x=-b.w/2+4;x<b.w/2-2;x+=5)rows.frames.push(front(sign,x,y,3.15,2.5,.05));}
  // Side glass has half the floor density. Add to the existing lit/unlit
  // batches instead of making a separate object for every window.
  for(let y=6;y<b.h-1;y+=8){rows.frames.push(side(sign,0,y,b.d-5,2.5,.05));for(let z=-b.d/2+5;z<b.d/2-3;z+=7){const target=(index+Math.round(z)+Math.round(y)+sign)%4===0?rows.windows:rows.nightWindows;target.push(side(sign,z,y,2.6,1.9,.1,.09));}}
  for(const edge of[-1,1]){rows.frames.push(front(sign,edge*(b.w/2-.38),(b.h+1)/2,.64,b.h-3,.08,.03));rows.frames.push(side(sign,edge*(b.d/2-.38),(b.h+1)/2,.64,b.h-3,.08,.03));}
  const spacing=rows.style===1?12:8;for(let y=4;y<b.h-1;y+=spacing){rows.trim.push(front(sign,0,y,b.w,.22,.1,.08));rows.trim.push(side(sign,0,y,b.d,.22,.1,.08));}
 }
 return rows;
}
