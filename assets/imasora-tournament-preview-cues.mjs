// Reuse the original game's wording, typewriter markup and HP markup.
export function tournamentPreviewCue({presentation:p,move,side='me',names,ids=[],hit=true,hpAfter=72}={}){
 const caster=names[side==='me'?0:1],target=names[side==='me'?1:0],scene={type:'attack',name:caster,enemyName:names[1],tier:move.tier,magicStyle:move.style,moveName:move.name,actor:side,target:side==='me'?'enemy':'me'},parts=p.magicCaptionPartsFor(p.magicSceneTextFor(scene)),captionAt=3.45,secondAt=captionAt+p.cueTypeDurationFor(parts[0]||'',1)+.12,drainAt=5.85,drainDuration=1.95,resultAt=hit?drainAt+drainDuration:7.4;
 const caption=parts.map((part,i)=>p.battleCueLine('span',part,i?secondAt:captionAt,'magic-scene-caption'+(i?' magic-scene-caption-follow':''))).join('');
 const moveLine=p.battleTurnCueLine(caster,p.turnColor?.(ids[side==='me'?0:1])||'',0)+p.battleCueLine('span',`${caster}は${p.tierLabel[move.tier]||'技'}`,1.4,'move-strength-cue')+p.battleCueLine('span',`「${move.name}」を放った！`,2.35,'move-name-cue')+caption;
 const to=hit?Math.max(0,Math.min(100,hpAfter)):100;
 const resultText=hit&&to===0?`${target}は降参した。`:`${target}は攻撃${hit?'に耐えた。':'を回避した。'}`,cameraHoldUntil=resultAt+p.cueTypeDurationFor(resultText)+.55;
 const result=p.battleCueLine('span',resultText,resultAt,'result-cue');
 return{html:`<div class="battle-cue"><div class="battle-cue-move-lines" style="--result-cue-delay:${(resultAt-.04).toFixed(2)}s">${moveLine}</div><div class="battle-cue-result-lines">${result}</div></div>`,cameraHoldUntil,drainAt,drainDuration,from:100,to,target:scene.target,delay:6.05,sounds:[0,1.4,2.35,...parts.map((_,i)=>i?secondAt:captionAt),resultAt],hp:(index)=>p.hpDrainMarkup(100,hit&&index===(side==='me'?1:0)?to:null,index===1,100,hit&&index===(side==='me'?1:0)?to:null,100)};
}
