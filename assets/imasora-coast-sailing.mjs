// Small persistent voyage outcome; authored parts and work undo stay separate.
export function validateCoastSailing(s){
 const n=s.sailing;if(n===undefined)return;
 if(!n||Object.getPrototypeOf(n)!==Object.prototype||Object.keys(n).sort().join('|')!=='board|phase|tiltTicks|version'||n.version!==1||!['sailing','capsized'].includes(n.phase)||!s.parts.some(p=>p.id===n.board&&p.type==='board')||!Number.isSafeInteger(n.tiltTicks)||n.tiltTicks<0||n.tiltTicks>90||n.phase==='capsized'&&n.tiltTicks!==90)throw Error('航海の記録が違います。');
}
export function advanceCoastSailing(s,{board=null,up=1,afloat=false}={}){
 if(board&&afloat&&!s.sailing){s.sailing={version:1,board,phase:'sailing',tiltTicks:0};s.edit++;}
 const n=s.sailing;if(!n||n.phase==='capsized')return false;
 if(board&&afloat&&board!==n.board){n.board=board;n.tiltTicks=0;s.edit++;}
 // A quick splash or a momentary contact cannot end a voyage. This requires
 // a sustained real inversion, after support from the deck may already end.
 n.tiltTicks=afloat&&up<-.17?Math.min(90,n.tiltTicks+1):Math.max(0,n.tiltTicks-3);
 if(n.tiltTicks===90){n.phase='capsized';s.edit++;return true;}return false;
}
export function coastPushForce(part,actor){
 if(!part||!actor||![actor.x,actor.y,actor.z].every(Number.isFinite))return null;
 const dx=part.p[0]-actor.x,dz=part.p[2]-actor.z,d=Math.hypot(dx,dz);
 if(d<12||d>78||Math.abs(part.p[1]-actor.y)>38)return null;
 return {direction:[dx/d,0,dz/d],point:[part.p[0],part.p[1],part.p[2]],strength:8000};
}
