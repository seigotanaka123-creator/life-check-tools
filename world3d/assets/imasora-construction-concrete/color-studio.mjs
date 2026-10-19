import {BRIGHT_PAINTS,paintColor,paintName,paintHSV,hsvPaint} from './paint-colors.mjs?v=120ds';
export function colorStudioTemplate(){return '<section class="paint-studio" data-color-studio><button type="button" data-color-expand aria-expanded="false"><i data-color-sample aria-hidden="true"></i><strong>好きな色をつくる</strong><span>虹からえらぼう</span></button><div class="paint-studio-body" data-color-body hidden><p>①虹の色をえらぶ → ②明るさ・こさをえらぶ</p><div class="paint-hue" data-color-hue role="slider" tabindex="0" aria-label="虹の色" aria-valuemin="0" aria-valuemax="359"><i></i></div><div class="paint-tone" data-color-tone role="group" tabindex="0" aria-label="色の明るさと濃さ。左右で濃さ、上下で明るさ"><i></i><span class="tone-white">しろく</span><span class="tone-color">こく</span><span class="tone-dark">くらく</span></div><div class="paint-color-result"><i data-color-result></i><strong>この色でぬろう！</strong><button type="button" data-color-finish>この色にする</button></div><p class="paint-studio-hint">何色でもつくれるよ。色をえらぶだけならペンキは減らないよ。</p></div><div class="paint-recent" data-color-recent aria-label="最近えらんだ色"></div></section>';}
export function installColorStudios(panel,{getColor,choose,enabled,changed}){
 let hsv=paintHSV(getColor()),lastColor=getColor(),recent=[],pointer=null;
 const studios=[...panel.querySelectorAll('[data-color-studio]')];
 function remember(){const color=getColor();if(!paintColor(color))return;recent=[color,...recent.filter(c=>c!==color)].slice(0,5);}
 function render(){
  const color=getColor();if(color!==lastColor){hsv=paintHSV(color);lastColor=color;}
  const editing=studios.some(root=>root.closest('[data-paint-tray]')&&!root.querySelector('[data-color-body]').hidden);panel.dataset.colorEditing=String(editing);
  for(const root of studios){
   root.querySelector('[data-color-sample]').style.background=paintColor(color);
   root.querySelector('[data-color-result]').style.background=paintColor(color);
   const hue=root.querySelector('[data-color-hue]'),tone=root.querySelector('[data-color-tone]');
   hue.setAttribute('aria-valuenow',String(Math.round(hsv.h)));hue.setAttribute('aria-valuetext',paintName(color));hue.querySelector('i').style.left=(hsv.h/359*100)+'%';
   tone.style.setProperty('--hue-color',hsvPaint(hsv.h,1,1));tone.querySelector('i').style.left=(hsv.s*100)+'%';tone.querySelector('i').style.top=((1-hsv.v)*100)+'%';
   for(const el of [hue,tone]){el.setAttribute('aria-disabled',String(!enabled()));el.tabIndex=enabled()?0:-1;}
   root.querySelector('[data-color-expand]').disabled=!enabled();
   const row=root.querySelector('[data-color-recent]'),key=recent.join(',');if(row.dataset.colors!==key){row.dataset.colors=key;row.replaceChildren();if(recent.length){const label=document.createElement('span');label.textContent='さっきの色';row.append(label);for(const c of recent){const b=document.createElement('button');b.type='button';b.dataset.recentColor=c;b.style.setProperty('--paint-color',paintColor(c));b.setAttribute('aria-label','さっきの色 '+paintName(c));row.append(b);}}}for(const b of row.querySelectorAll('button'))b.disabled=!enabled();
  }
 }
 function set(){const h={...hsv},color=hsvPaint(h.h,h.s,h.v);lastColor=color;choose(color);hsv=h;render();changed();}
 function sample(e,target){const r=target.getBoundingClientRect(),x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));if(target.hasAttribute('data-color-hue'))hsv.h=x*359;else{hsv.s=x;hsv.v=1-y;}set();}
 function end(cancel=false){if(!pointer)return;const p=pointer;pointer=null;if(cancel)choose(p.before);else remember();if(p.target.hasPointerCapture(p.id))p.target.releasePointerCapture(p.id);render();changed();}
 for(const root of studios){
  const expand=root.querySelector('[data-color-expand]'),body=root.querySelector('[data-color-body]');
  expand.onclick=()=>{if(!enabled())return;body.hidden=!body.hidden;expand.setAttribute('aria-expanded',String(!body.hidden));render();if(root.closest('[data-paint-tray]'))panel.querySelector('#free-mode-controls').scrollTop=0;};
  root.querySelector('[data-color-finish]').onclick=()=>{end();remember();body.hidden=true;expand.setAttribute('aria-expanded','false');render();changed();};
  root.querySelector('[data-color-recent]').onclick=e=>{const b=e.target.closest('[data-recent-color]');if(b&&enabled()){choose(b.dataset.recentColor);render();changed();}};
  for(const target of root.querySelectorAll('[data-color-hue],[data-color-tone]')){
   target.addEventListener('pointerdown',e=>{if(e.button!==0||pointer||!enabled())return;e.preventDefault();pointer={id:e.pointerId,before:getColor(),target};target.setPointerCapture(e.pointerId);sample(e,target);});
   target.addEventListener('pointermove',e=>{if(pointer?.id===e.pointerId){e.preventDefault();sample(e,target);}});
   target.addEventListener('pointerup',e=>{if(pointer?.id===e.pointerId){sample(e,target);end();}});
   for(const name of ['pointercancel','lostpointercapture'])target.addEventListener(name,e=>{if(pointer?.id===e.pointerId)end(true);});
   target.addEventListener('keydown',e=>{if(!enabled()||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();if(target.hasAttribute('data-color-hue'))hsv.h=(hsv.h+(e.key==='ArrowLeft'||e.key==='ArrowDown'?-3:3)+360)%360;else if(e.key==='ArrowLeft'||e.key==='ArrowRight')hsv.s=Math.max(0,Math.min(1,hsv.s+(e.key==='ArrowLeft'?-.04:.04)));else hsv.v=Math.max(0,Math.min(1,hsv.v+(e.key==='ArrowDown'?-.04:.04)));set();remember();});
  }
 }
 return {refresh:render,cancel:()=>end(true)};
}

