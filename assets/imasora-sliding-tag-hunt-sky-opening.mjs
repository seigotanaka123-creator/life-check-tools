export const HUNT_SKIES=Object.freeze({
 blue:Object.freeze({name:'青空',caption:'澄んだ光が、街に広がる。',accent:'#9de6ff',shade:'#0d3558',phase:'day',top:0x3482ba,horizon:0xc6edfa,sun:0xfff4dc,ambient:1.85,power:1.85,lamps:0,night:0,azimuth:.4,elevation:.56,cloudAmount:.52,lowGlow:0}),
 cloud:Object.freeze({name:'曇り空',caption:'厚い雲が、街を包む。',accent:'#d1e1f1',shade:'#2d3b53',phase:'cloud',top:0x64778e,horizon:0xbac8d3,sun:0xc5ced7,ambient:1.65,power:.22,lamps:.12,night:0,azimuth:.4,elevation:.4,cloudAmount:1,lowGlow:0}),
 sunset:Object.freeze({name:'夕焼け',caption:'残照が、街並みを染める。',accent:'#ffcf9e',shade:'#4b263f',phase:'evening',top:0x585683,horizon:0xfa9f7a,sun:0xffc083,ambient:1.58,power:1.6,lamps:.8,night:0,azimuth:.65,elevation:.10,cloudAmount:.73,lowGlow:1}),
 morning:Object.freeze({name:'朝空',caption:'朝の光が、屋根を照らす。',accent:'#fff0b1',shade:'#244b65',phase:'morning',top:0x79b6d4,horizon:0xf8e6c7,sun:0xfff0c6,ambient:1.83,power:1.68,lamps:.2,night:0,azimuth:-.9,elevation:.18,cloudAmount:.62,lowGlow:.52})
});

export const HUNT_SKY_INTRO_SECONDS=1.55;
export function huntSkyOpening(state,{started,paused,replay=false,titleOnly=false}={}){
 const id=state.config.matchSky?.skyId;
 const remaining=titleOnly?0:2-HUNT_SKY_INTRO_SECONDS;
 return started&&!paused&&!replay&&state.phase==='countdown'&&state.countdown>remaining&&Object.hasOwn(HUNT_SKIES,id)?id:null;
}

export function huntSkyCamera(id,elapsed=0){
 const sky=HUNT_SKIES[id];
 const yaw=sky.azimuth-.28+Math.min(1,Math.max(0,elapsed)/HUNT_SKY_INTRO_SECONDS)*.19;
 const x=-6,y=27,z=-91;
 return {position:{x,y,z},target:{x:x+Math.sin(yaw)*120,y:y+5,z:z+Math.cos(yaw)*120}};
}

export function createHuntSkyTitle(doc){
 const root=doc.createElement('section');
 root.className='hunt-sky-opening';root.hidden=true;
 root.innerHTML='<div class="hunt-sky-matte"></div><div class="hunt-sky-title" aria-live="polite"><span>この試合の空</span><strong></strong><p></p></div>';
 doc.body.append(root);
 const title=root.querySelector('strong'),caption=root.querySelector('p'),label=root.querySelector('span'),matte=root.querySelector('.hunt-sky-matte');
 let previous=null;
 return {show(id,gallery=false,shot=!!id){
  const key=id?(id+':'+gallery+':'+shot):null;
  if(key===previous)return;
  previous=key;
  root.hidden=!id;
  matte.hidden=!shot;
  doc.body.classList.toggle('hunt-sky-opening-visible',!!id&&shot);
  if(!id)return;
  const sky=HUNT_SKIES[id];
  root.dataset.sky=id;
  root.style.setProperty('--opening-accent',sky.accent);
  root.style.setProperty('--opening-shade',sky.shade);
  label.textContent=gallery?'鬼ごっこの空':'この試合の空';
  title.textContent=sky.name;
  caption.textContent=sky.caption;
 }};
}

export function mountHuntSkyGallery(doc,initial,select){
 const nav=doc.createElement('nav');nav.className='hunt-sky-gallery';nav.setAttribute('aria-label','空のデザイン');
 const buttons=Object.entries(HUNT_SKIES).map(([id,sky])=>{
  const button=doc.createElement('button');button.type='button';
  button.textContent=sky.name;
  button.style.setProperty('--sky-tab',sky.accent);
  button.onclick=()=>choose(id);
  nav.append(button);
  return [id,button];
 });
 const back=doc.createElement('a');back.href=doc.location.pathname;back.textContent='鬼ごっこへ戻る';nav.append(back);doc.body.append(nav);
 function choose(id){
  for(const [key,button] of buttons)button.setAttribute('aria-pressed',String(key===id));
  select(id);
 }
 choose(initial);
}
