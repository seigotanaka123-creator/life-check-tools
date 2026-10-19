import {placedStencilPixels} from './stencil-placement.mjs?v=120dp';
import {BRIGHT_PAINTS,paintColor,paintName} from './paint-colors.mjs?v=120ds';
import {colorStudioTemplate} from './color-studio.mjs?v=120ds';
import {toolPicture} from '../imasora-pop-menu.mjs?v=120dg';
import {STENCIL_TEMPLATES} from './free-stencil.mjs';

export function paintPalette(){return '<div class="free-paint-palette" role="group" aria-label="ペンキの色">'+BRIGHT_PAINTS.map(p=>'<button type="button" data-paint-color="'+p.color+'" aria-pressed="false" style="--paint-color:'+p.color+'"><i aria-hidden="true"></i>'+p.name+'</button>').join('')+'</div>'+colorStudioTemplate();}
export function patternPicture(id,turn=0,offset={x:0,y:0}){const filled=new Set(placedStencilPixels(id,turn,offset));return `<svg viewBox="0 0 40 40" aria-hidden="true">${Array.from({length:16},(_,i)=>`<rect x="${i%4*10+1}" y="${Math.floor(i/4)*10+1}" width="9" height="9" rx="1" fill="${filled.has(i)?'var(--pattern-color)':'#fff9ec'}"/>`).join('')}</svg>`;}
export function paintDeckTemplate(){return `<section class="free-paint-tray" data-paint-tray hidden aria-label="色と模様">
 <button type="button" class="paint-target-card" data-paint-target-open><b>1</b><span><strong>ぬる場所</strong><small data-paint-target-label></small></span><em>えらぶ ›</em></button>
 <div class="paint-tray-heading"><strong>2　好きな色</strong><span data-paint-choice></span></div>${paintPalette()}
 <div class="paint-tray-heading"><strong>3　どうぬる？</strong></div><div class="paint-tool-choices" role="group" aria-label="塗る道具"><button type="button" data-paint-tool="roller" aria-pressed="true">${toolPicture('roller')}<strong>ローラー</strong><small>面をぜんぶ</small></button><button type="button" data-paint-tool="stencil" aria-pressed="false">${toolPicture('stencil')}<strong>型紙</strong><small>模様をつける</small></button><button type="button" data-paint-tool="brush" aria-pressed="false">${toolPicture('brush')}<strong>刷毛</strong><small>自分で描く</small></button></div>
 <div data-paint-pattern-options hidden><div class="paint-tray-heading"><strong>型紙の模様</strong><button type="button" data-paint-position aria-haspopup="dialog">型紙を動かす</button></div>
 <div class="paint-patterns" role="group" aria-label="型紙の模様">${STENCIL_TEMPLATES.map(t=>`<button type="button" data-paint-pattern="${t.id}" aria-pressed="false">${patternPicture(t.id)}<span>${t.label}</span></button>`).join('')}<button type="button" data-paint-turn aria-label="型紙を右に90度回す"><b aria-hidden="true">↻</b><span>回す</span></button></div>
 </div>
</section>`;}

// One source of truth also drives the detailed tool pages. Choosing a swatch
// or pattern only changes the pending tool selection, never the saved work.
export function refreshPaintDeck(panel,{visible,enabled,color,pattern,turn,offset={x:0,y:0},target,tool='roller'}){
 panel.querySelector('[data-paint-tray]').hidden=!visible;
 const tray=panel.querySelector('[data-paint-tray]');tray.style.setProperty('--pattern-color',paintColor(color));
 panel.querySelector('[data-paint-choice]').textContent=paintName(color)+'のペンキ';
 panel.querySelector('[data-paint-pattern-options]').hidden=tool!=='stencil';
 for(const b of panel.querySelectorAll('[data-paint-tool]')){b.disabled=!enabled;b.setAttribute('aria-pressed',String(b.dataset.paintTool===tool));}
 panel.querySelector('[data-paint-target-label]').textContent=target;
 const rotation=panel.querySelector('[data-paint-turn]');rotation.disabled=!enabled;rotation.title='型紙の向き：'+turn*90+'°';
 for(const b of panel.querySelectorAll('[data-paint-pattern]')){b.disabled=!enabled;b.setAttribute('aria-pressed',String(b.dataset.paintPattern===pattern));const placement=b.dataset.paintPattern===pattern?offset:{x:0,y:0},key=[turn,placement.x,placement.y].join(':');if(b.dataset.turn!==key){b.querySelector('svg').outerHTML=patternPicture(b.dataset.paintPattern,turn,placement);b.dataset.turn=key;}}
}
