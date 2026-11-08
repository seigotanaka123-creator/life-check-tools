// One outline encloses the measured text. Only its four corners are rounded.
export function homeSpeechInk(lines,target,{padX=9,padY=6,tailLength=18}={}){
 const bands=[];
 for(const line of lines){if(!(line.width>0&&line.height>0))continue;const same=bands.find(b=>Math.abs(b.y-line.y)<1);if(same){const right=Math.max(same.x+same.width,line.x+line.width);same.x=Math.min(same.x,line.x);same.width=right-same.x;same.height=Math.max(same.height,line.height);}else bands.push({...line});}
 if(!bands.length)return{d:'',bands:[],tail:null};bands.sort((a,b)=>a.y-b.y);
 const f=n=>Number(n.toFixed(3));
 const bounds={x:Math.min(...bands.map(b=>b.x)),y:bands[0].y};
 bounds.width=Math.max(...bands.map(b=>b.x+b.width))-bounds.x;bounds.height=Math.max(...bands.map(b=>b.y+b.height))-bounds.y;
 const center={x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2},halfW=bounds.width/2+padX,halfH=bounds.height/2+padY,radius=Math.min(10,halfW,halfH);let dx=target.x-center.x,dy=target.y-center.y,length=Math.hypot(dx,dy);if(length<.001){dx=0;dy=1;length=1;}dx/=length;dy/=length;
 // Intersect the pointing ray with the final pill, including very short text.
 const distance=t=>{const x=Math.abs(dx*t)-(halfW-radius),y=Math.abs(dy*t)-(halfH-radius);return Math.hypot(Math.max(x,0),Math.max(y,0))+Math.min(Math.max(x,y),0)-radius;};let lo=0,hi=Math.hypot(halfW,halfH)*2;for(let i=0;i<30;i++){const mid=(lo+hi)/2;if(distance(mid)>0)hi=mid;else lo=mid;}
 const edge={x:center.x+dx*lo,y:center.y+dy*lo},base={x:edge.x-dx*2.5,y:edge.y-dy*2.5},tip={x:edge.x+dx*tailLength,y:edge.y+dy*tailLength},a={x:base.x-dy*4.5,y:base.y+dx*4.5},b={x:base.x+dy*4.5,y:base.y-dx*4.5};
 // Same winding as the pills: overlapping fill must join, never cut a hole.
 const tail=`M${f(a.x)},${f(a.y)}L${f(b.x)},${f(b.y)}L${f(tip.x)},${f(tip.y)}Z`;
 const l=bounds.x-padX,t=bounds.y-padY,r=bounds.x+bounds.width+padX,bottom=bounds.y+bounds.height+padY;
 const body=`M${f(l+radius)},${f(t)}H${f(r-radius)}A${f(radius)},${f(radius)} 0 0 1 ${f(r)},${f(t+radius)}V${f(bottom-radius)}A${f(radius)},${f(radius)} 0 0 1 ${f(r-radius)},${f(bottom)}H${f(l+radius)}A${f(radius)},${f(radius)} 0 0 1 ${f(l)},${f(bottom-radius)}V${f(t+radius)}A${f(radius)},${f(radius)} 0 0 1 ${f(l+radius)},${f(t)}Z`;
 return{d:body+tail,bands,bounds,tail:{base,tip,edge,target:{...target},direction:{x:dx,y:dy}}};
}

export function homeDialoguePhrases(value){
 const text=String(value??'');
 const tokens=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ja',{granularity:'word'}).segment(text)].map(row=>row.segment):Array.from(text);
 const particles=/^(?:は|が|を|に|へ|で|と|も|や|から|まで|なら|ので|けど|ながら|つつ|として|について)$/;
 const punctuation=/^[、。，．！？!?」』）】…]+$/;
 const phrases=[];let phrase='';
 for(let i=0;i<tokens.length;i++){
  const token=tokens[i],next=tokens[i+1]??'';
  if(phrase&&Array.from(phrase+token).length>12&&!particles.test(token)&&!punctuation.test(token)){phrases.push(phrase);phrase='';}
  phrase+=token;
  if((particles.test(token)||punctuation.test(token))&&!particles.test(next)&&!punctuation.test(next)){phrases.push(phrase);phrase='';}
 }
 if(phrase)phrases.push(phrase);
 return phrases;
}
