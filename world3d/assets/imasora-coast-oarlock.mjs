import {coastOarReach,coastAssembly,worldPoint,localPoint} from './imasora-coast-physics.mjs?v=120nz';
import {coastWave} from './imasora-coast-waves.mjs?v=120mx';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const add=(a,b,k=1)=>a.map((x,n)=>x+b[n]*k);
// A fixed, deck-local fulcrum. A short outrigger reaches past the deck edge
// for the separate helm seat; neither seat nor the monster's body is moved.
export function coastOarlockPivot(rest,origin,side){return[side*Math.max(30,side*rest[0]+12),Math.min(10,rest[1]-2.5),clamp(origin[2]+(origin[2]<-8?6:18),-23,23)].map(x=>Math.round(x*1e6)/1e6);}
function hitsSegment(a,b,r,p){const u=localPoint(p,a),v=localPoint(p,b),h=(p.type==='cargo'?[13,11,13]:[8,8,27]).map(x=>x+r);let lo=0,hi=1;for(let n=0;n<3;n++){const d=v[n]-u[n];if(Math.abs(d)<1e-9){if(Math.abs(u[n])>h[n])return false;}else{let x=(-h[n]-u[n])/d,y=(h[n]-u[n])/d;if(x>y)[x,y]=[y,x];lo=Math.max(lo,x);hi=Math.min(hi,y);if(lo>hi)return false;}}return true;}
export function coastOarlockClear(play,board,pose,rig={},brake=false){
 if(!play)return true;const {pivot,direction:u,inboard,outboard}=pose,handle=worldPoint(board,add(pivot,u,-inboard-3.2)),tip=worldPoint(board,add(pivot,u,outboard)),length=5*(rig.height??1)+.3;
 const a=worldPoint(board,add(pivot,u,outboard-length)),b=worldPoint(board,add(pivot,u,outboard+length)),radius=Math.hypot(3*(rig.width??1),.7*(brake?3:1))+.75;
 return !play.parts.some(p=>(p.type==='float'||p.type==='cargo')&&(hitsSegment(handle,tip,1.3,p)||hitsSegment(a,b,radius,p)));
}
// The palm, fulcrum and blade share ONE rigid lever. Recovery rotates this
// lever in its bearing, rather than moving the bearing or stretching the oar.
export function coastOarlockStroke({play,board,rest,origin,side,stroke,effort=0,brake=false,rig={},time=0,previous=null}){
 const archive=play?.cargoRetired!==1&&play?.parts.some(p=>p.type==='cargo'&&coastAssembly(play,board.id).ids.has(p.id));
 const pivot=coastOarlockPivot(rest,origin,side),v=pivot.map((x,n)=>x-rest[n]),inboard=Math.hypot(...v),base=v.map(x=>x/inboard),reach=play?coastOarReach(play,board.id)[side<0?0:1]+side*8:side*70;
 const outboard=Math.max(inboard*2,Math.abs(reach-pivot[0])/Math.max(.35,Math.abs(base[0]))),tip=add(pivot,base,outboard),ratio=outboard/inboard;
 if(effort&&!brake){tip[2]-=stroke.sweep*ratio;const up=board.q[3]*board.q[3]-board.q[0]*board.q[0]+board.q[1]*board.q[1]-board.q[2]*board.q[2];if(up>.25)for(let n=0;n<4;n++){const p=worldPoint(board,tip);tip[1]+=(coastWave(p[0],p[2],time).height-1+stroke.lift*1.4-p[1])/up;}}
 const delta=tip.map((x,n)=>x-pivot[n]),size=Math.hypot(...delta),minPitch=archive?Math.asin(clamp((10-Math.max(rest[1]+9,27))/inboard,-.85,-.2)):Math.asin(clamp((pivot[1]-rest[1]-3)/inboard,-.85,-.08)),maxPitch=archive?Math.asin(clamp(-3/inboard,-.5,-.02)):Math.asin(clamp((pivot[1]-Math.max(8,rest[1]-3))/inboard,-.5,-.01));
 let pitch=clamp(Math.asin(clamp(delta[1]/size,-1,1)),minPitch,maxPitch),yaw=clamp(Math.atan2(delta[2],Math.abs(delta[0])),-1.05,1.05);
 const dt=previous&&previous.board===board.id&&Math.abs(previous.inboard-inboard)<1e-6&&Math.abs(previous.outboard-outboard)<1e-6?time-previous.time:0;if(dt>0&&dt<=.1)pitch=clamp(Math.max(pitch,previous.pitch-90/outboard*dt),minPitch,maxPitch);
 const travel=archive?Infinity:3.1,limit=2*Math.asin(Math.min(1,travel/(2*inboard)));
 const at=(pitch,yaw)=>{let u=[side*Math.cos(pitch)*Math.cos(yaw),Math.sin(pitch),Math.cos(pitch)*Math.sin(yaw)];const angle=Math.acos(clamp(u.reduce((sum,x,n)=>sum+x*base[n],0),-1,1));if(angle>limit){const a=Math.sin(angle-limit)/Math.sin(angle),b=Math.sin(limit)/Math.sin(angle);u=base.map((v,n)=>v*a+u[n]*b);pitch=Math.asin(clamp(u[1],-1,1));yaw=Math.atan2(u[2],Math.abs(u[0]));}return{pivot,inboard,outboard,pitch,yaw,direction:u,grip:add(pivot,u,-inboard),tip:add(pivot,u,outboard),board:board.id,time};};
 let pose=at(pitch,yaw);if(coastOarlockClear(play,board,pose,rig,brake))return pose;
 // Raise the blade about the same fulcrum, retaining enough palm clearance
 // above the actual deck. Refine only the smallest clear recovery angle.
 let last=pitch;for(let n=1;n<=12;n++){const p=pitch+(maxPitch-pitch)*n/12,next=at(p,yaw);if(coastOarlockClear(play,board,next,rig,brake)){let lo=last,hi=p;for(let k=0;k<7;k++){const mid=(lo+hi)/2;if(coastOarlockClear(play,board,at(mid,yaw),rig,brake))hi=mid;else lo=mid;}return at(hi,yaw);}last=p;}
 // A loose float can block the normal arc. Use a bounded fore/aft sweep,
 // still around the same bearing. Never move a real float or its saved state.
 for(const direction of[1,-1])for(let n=1;n<=10;n++){const angle=clamp(yaw+direction*n*.09,-1.3,1.3),next=at(maxPitch,angle);if(coastOarlockClear(play,board,next,rig,brake))return next;}
 return null;
}
