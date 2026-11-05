// Keep the exact live heading. The canvas can reuse an identical frame.
export function createHuntRadarHud({radar,time,diagnostics,compass}){
 let updates=0,writes=0,paints=0;
 const prop=(el,key,value)=>{if(el[key]!==value){el[key]=value;writes++;}};
 const data=(el,key,value)=>{if(el.dataset[key]!==value){el.dataset[key]=value;writes++;}};
 const attribute=(el,key,value)=>{if(el.getAttribute(key)!==value){el.setAttribute(key,value);writes++;}};
 return{update(map,{visible=false,diagnose=true}={}){updates++;prop(radar,'hidden',!visible);prop(time,'hidden',!visible);
  if(visible){prop(time,'textContent','試合終了まで');data(radar,'danger',map.danger);attribute(radar,'aria-label','方位磁石：視点は'+map.facing+'向き。'+({danger:'近くに相手',warning:'相手が接近',clear:'周囲を確認'}[map.danger]));if(compass.draw(map)!==false)paints++;}
  if(diagnose)data(diagnostics,'radar',JSON.stringify(map));
 },stats:()=>({updates,domWrites:writes,paints})};
}
