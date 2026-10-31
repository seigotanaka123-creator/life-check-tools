const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function coastSluiceFrame(canvas,panel){
 if(!(canvas?.width>0&&canvas?.height>0)||!Number.isFinite(panel?.top))return null;
 const bottom=clamp(panel.top-(canvas.top??0)-12,1,canvas.height),desiredTop=canvas.height>canvas.width?Math.min(330,canvas.height*.4):Math.min(90,canvas.height*.25),top=Math.min(desiredTop,Math.max(0,bottom-50)),center=(top+bottom)/2;
 return{width:canvas.width,height:canvas.height,offsetY:clamp(canvas.height/2-center,0,canvas.height*.3)};
}
// Read-only coaching from the real water and float. It never closes the gate,
// moves a body or grants success; the existing fixed-step physics does that.
export function coastSluiceFeedback(r){
 const flow=clamp(r.gate*r.water,0,1),speed=Math.abs(r.vx),brakeAt=20-clamp(speed*.95+4.5,5,17);
 let phase='flow',tip='水門をあけて、浮きを流そう';
 if(r.done){phase='done';tip='輪の中でとまった！ もう一度なら「もう1回」';}
 else if(r.x>25){phase='retry';tip='通り過ぎたね。「もう1回」でまた遊べるよ';}
 else if(r.hold>0&&r.gate<.08&&speed<1.2){phase='settle';tip='いい場所！ そのまま少し待とう';}
 else if(r.gate>.02&&r.x>=brakeAt){phase='brake';tip='いま流れを弱めよう！ レバーを下へ';}
 else if(r.gate<=.02&&speed>.5){phase='coast';tip='流れを止めたよ。浮きの動きを見よう';}
 else if(r.gate>.02&&r.water<.18){phase='fill';tip='水がたまると、浮きが動くよ';}
 else if(r.gate>.02){phase='flow';tip='水の流れにのせて、黄色い輪へ';}
 return{phase,tip,flow,speed,brakeAt,flowLabel:flow<.04?'とまっている':flow<.3?'ゆっくり':flow<.65?'ふつう':'はやい'};
}
