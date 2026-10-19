// New, spacious stairwell buildings keep old saved buildings at their original
// scale. Heights are unchanged; the flight has real treads and an open ceiling.
export const highPlanScale=s=>s?.blueprint?.interiorStairs===true?2:1;
export const highInteriorHole={x:-28,z:-4,w:56,d:104};
export function highCutOpening(rect){
 const a={l:rect.x-rect.w/2,r:rect.x+rect.w/2,b:rect.z-rect.d/2,t:rect.z+rect.d/2},h={l:-56,r:0,b:-56,t:48},l=Math.max(a.l,h.l),r=Math.min(a.r,h.r),b=Math.max(a.b,h.b),t=Math.min(a.t,h.t);
 if(l>=r||b>=t)return[rect];const pieces=[];const add=(x0,x1,z0,z1)=>{if(x1>x0&&z1>z0)pieces.push({...rect,x:(x0+x1)/2,z:(z0+z1)/2,w:x1-x0,d:z1-z0});};add(a.l,l,a.b,a.t);add(r,a.r,a.b,a.t);add(l,r,a.b,b);add(l,r,t,a.t);return pieces;
}
export function highInnerStairs(level){
 const base=(level-1)*40,out=[];for(let i=1;i<=8;i++)out.push({kind:'stair',x:-42,y:base+i*2.5-1.25,z:48-(i-.5)*10,w:24,h:2.5,d:10});
 out.push({kind:'stair',x:-28,y:base+19,z:-40,w:56,h:2,d:16});
 for(let i=1;i<=8;i++)out.push({kind:'stair',x:-14,y:base+20+i*2.5-1.25,z:-32+(i-.5)*10,w:24,h:2.5,d:10});return out;
}
const p=(x,y,z)=>({x,y,z,heading:0});
export function highInnerRoute(floors){
 const out=[p(-48,0,72),p(-48,0,56)];for(let f=0;f<floors;f++){const y=f*40;out.push(p(-42,y,56),p(-42,y,48));for(let i=1;i<=8;i++)out.push(p(-42,y+i*2.5,48-(i-.5)*10));out.push(p(-42,y+20,-32),p(-42,y+20,-40),p(-14,y+20,-40),p(-14,y+20,-32));for(let i=1;i<=8;i++)out.push(p(-14,y+20+i*2.5,-32+(i-.5)*10));out.push(p(-14,y+40,48),p(-14,y+40,56));}return out;
}
export const highInsideActor=s=>highPlanScale(s)===2&&s.actor.y>0&&Math.abs(s.actor.x)<80&&Math.abs(s.actor.z)<80;
