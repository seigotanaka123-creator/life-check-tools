// Reflow labels only; the town's images, slots and save coordinates never move.
function placeTownLabels(rows,width,height){
 const placed=[],pad=3,clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 for(const row of [...rows].sort((a,b)=>b.width*b.height-a.width*a.height)){
  const x=clamp(row.x,2,width-row.width-2),y=clamp(row.y,2,height-row.height-2),candidates=[{x,y,score:0}];
  const free=p=>placed.every(r=>p.x+row.width+pad<=r.x||r.x+r.width+pad<=p.x||p.y+row.height+pad<=r.y||r.y+r.height+pad<=p.y);
  if(!free(candidates[0]))for(let cy=2;cy<=height-row.height-2;cy+=4)for(let cx=2;cx<=width-row.width-2;cx+=6)candidates.push({x:cx,y:cy,score:(cx-x)**2+(cy-y)**2});
  candidates.sort((a,b)=>a.score-b.score);const picked=candidates.find(free);
  placed.push({...row,...(picked||{x,y}),fits:!!picked});
 }
 return placed;
}
var townLabelObserver;
function arrangeTownLabels(){
 const map=document.getElementById('townView');if(!map?.clientWidth)return;map.querySelector('[data-label-leaders]')?.remove();const box=map.getBoundingClientRect(),labels=[...map.querySelectorAll('.town-facility-name')];
 labels.forEach(el=>{el.style.removeProperty('left');el.style.removeProperty('top');el.style.removeProperty('transform');});
 const rows=labels.map((el,id)=>{const b=el.getBoundingClientRect();return{id,width:b.width,height:b.height,x:b.left-box.left,y:b.top-box.top,anchorX:b.left-box.left+b.width/2,anchorY:b.top-box.top+b.height/2};}).filter(r=>r.width&&r.height),layout=placeTownLabels(rows,map.clientWidth,map.clientHeight),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.dataset.labelLeaders='';svg.setAttribute('viewBox','0 0 '+map.clientWidth+' '+map.clientHeight);svg.setAttribute('aria-hidden','true');svg.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:25';
 for(const row of layout){const el=labels[row.id];el.style.left=row.x+'px';el.style.top=row.y+'px';el.style.transform='none';if(Math.hypot(row.x+row.width/2-row.anchorX,row.y+row.height/2-row.anchorY)>8){const line=document.createElementNS(svg.namespaceURI,'line');line.setAttribute('x1',row.anchorX);line.setAttribute('y1',row.anchorY);line.setAttribute('x2',row.x+row.width/2);line.setAttribute('y2',row.y+row.height/2);line.setAttribute('stroke','#fff8db');line.setAttribute('stroke-width','1.3');svg.append(line);}}
 map.append(svg);
}
function observeTownLabels(){const map=document.getElementById('townView');townLabelObserver?.disconnect();townLabelObserver=new ResizeObserver(()=>requestAnimationFrame(arrangeTownLabels));townLabelObserver.observe(map);requestAnimationFrame(arrangeTownLabels);}
