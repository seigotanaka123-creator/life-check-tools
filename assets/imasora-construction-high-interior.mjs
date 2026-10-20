import{stairPlacement,stairPoint,stairBox}from'./imasora-construction-stair-placement.mjs?v=120gn';
// New, spacious stairwell buildings keep old saved buildings at their original
// scale. Heights are unchanged; the flight has real treads and an open ceiling.
export const highPlanScale=s=>s?.blueprint?.interiorStairs===true?2:1;
export const highInteriorHole={x:-28,z:-4,w:56,d:104};
export function highCutOpening(rect,state){
 const a={l:rect.x-rect.w/2,r:rect.x+rect.w/2,b:rect.z-rect.d/2,t:rect.z+rect.d/2},hole=stairBox(state,highInteriorHole),h={l:hole.x-hole.w/2,r:hole.x+hole.w/2,b:hole.z-hole.d/2,t:hole.z+hole.d/2},l=Math.max(a.l,h.l),r=Math.min(a.r,h.r),b=Math.max(a.b,h.b),t=Math.min(a.t,h.t);
 if(l>=r||b>=t)return[rect];const pieces=[];const add=(x0,x1,z0,z1)=>{if(x1>x0&&z1>z0)pieces.push({...rect,x:(x0+x1)/2,z:(z0+z1)/2,w:x1-x0,d:z1-z0});};add(a.l,l,a.b,a.t);add(r,a.r,a.b,a.t);add(l,r,a.b,b);add(l,r,t,a.t);return pieces;
}
export function highInnerStairs(level,state){
 const base=(level-1)*40,out=[];for(let i=1;i<=8;i++)out.push({kind:'stair',x:-42,y:base+i*2.5-1.25,z:48-(i-.5)*10,w:24,h:2.5,d:10});
 out.push({kind:'stair',x:-28,y:base+19,z:-40,w:56,h:2,d:16});
 for(let i=1;i<=8;i++)out.push({kind:'stair',x:-14,y:base+20+i*2.5-1.25,z:-32+(i-.5)*10,w:24,h:2.5,d:10});return out.map(b=>stairBox(state,b));
}
const p=(x,y,z)=>({x,y,z,heading:0});
export function highInnerRoute(floors,state){
 const out=[p(-48,0,72),p(-48,0,56)];for(let f=0;f<floors;f++){const y=f*40;out.push(p(-42,y,56),p(-42,y,48));for(let i=1;i<=8;i++)out.push(p(-42,y+i*2.5,48-(i-.5)*10));out.push(p(-42,y+20,-32),p(-42,y+20,-40),p(-14,y+20,-40),p(-14,y+20,-32));for(let i=1;i<=8;i++)out.push(p(-14,y+20+i*2.5,-32+(i-.5)*10));out.push(p(-14,y+40,48),p(-14,y+40,56));}return out.map(p=>stairPoint(state,p));
}
export const highInsideActor=s=>highPlanScale(s)===2&&s.actor.y>0&&Math.abs(s.actor.x)<80&&Math.abs(s.actor.z)<80;

export function highStairSpine(s,from,to){const route=highInnerRoute(Math.max(from,to),s),at=f=>{if(!f)return 0;const p=stairPoint(s,{x:-14,y:f*40,z:48});return route.findIndex(q=>q.x===p.x&&q.y===p.y&&q.z===p.z);},a=at(from),b=at(to);if(a<0||b<0)throw Error('階段のつながりをたしかめよう。');return a<=b?route.slice(a,b+1):route.slice(b,a+1).reverse();}
