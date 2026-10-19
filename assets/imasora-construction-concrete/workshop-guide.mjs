import {availableMixCells} from './mixing.mjs';
// A task has an outcome, visible progress, and one next action. It never mutates game state.
export function workshopGuide(f,mode,{vehicle='truck',paintTool='roller',hasWork=false,designReady=false}={}){
 const result=(title,body,steps,index,action,label)=>({title,body,steps,index,action,label});
 if(mode==='build'){
  const steps=['形をえらぶ','型枠を組む','生コンを注ぐ','表面をならす','固めて完成'];
  if(f.aboard&&['design','finished','cured'].includes(f.stage))return result('降りて道具を使おう','型枠やコテは、車を降りて手で使うよ。',steps,0,'dismount','車を降りる');
  if(f.stage==='design')return designReady?result('この形でつくろう！','現場の下描きができあがりの形だよ。変えたい時は「かたち」「高さ」をえらぼう。',steps,1,'frame','型枠を組む'):result('形からつくろう','床や花壇の形と高さをえらぶと、現場に下描きが出るよ。',steps,0,'shape','形と高さをえらぶ');
  if(['framed','wet'].includes(f.stage)){
   const full=f.fill.every((v,i)=>!(f.mask&(1<<i))||v>=f.height*2);
   if(f.aboard&&!full){
    if((f.aboard==='truck'?f.wet:f.hose)<1)return result('注ぐ材料を用意しよう','「車両」で生コンを用意してから、ここへ戻ろう。',steps,2,'vehicle','材料を用意する');
    return result('車から型枠へ注ごう','注ぐ場所をえらぶと、車の注ぎ口やホースがそこへ向かうよ。',steps,2,'pour','生コンを注ぐ');
   }
   if(f.aboard)return result('車を降りて仕上げよう','生コンがいっぱいになったよ。次はコテで表面をならそう。',steps,3,'dismount','車を降りる');
   if(full)return result('表面をきれいにしよう','コテでならすと、平らな床や壁になるよ。',steps,3,'finish','コテでならす');
   if(!f.bucket&&f.wet<4)return result('注ぐ材料を用意しよう','ミキサー車で原料を練ると、生コンができるよ。',steps,2,'vehicle','材料を用意する');
   return result('型枠の中をうめよう',f.bucket?'注ぐ場所をえらんで、バケツから注ごう。':'できた生コンをバケツに汲もう。',steps,2,f.bucket?'pour':'load',f.bucket?'生コンを注ぐ':'バケツに汲む');
  }
  if(f.stage==='finished')return result('固まったら完成！','いまの形で生コンを固めよう。',steps,4,'cure','生コンを固める');
  if(f.stage==='curing')return result('固まるのを待とう','進み具合がいっぱいになると型枠を外せるよ。',steps,4,null,'固めています');
  if(f.stage==='cured')return result('最後に板を外そう','型枠の板は道具箱に戻って、また使えるよ。',steps,4,'demold','型枠を外して完成');
  return result('できた！ 次は色をぬろう','完成した作品に色や模様をつけられるよ。',steps,5,'paint','色・模様をつける');
 }
 if(mode==='vehicle'){
  const name=f.aboard??vehicle,truck=name==='truck',steps=truck?['ドアで乗る','原料を積む','ドラムで練る','現場へ届ける']:['ドアで乗る','脚で支える','ホースをつなぐ','生コンを送る'];
  if(!f.aboard)return result(truck?'ミキサー車で材料づくり':'ポンプ車で遠くへ注ぐ',truck?'生コンをつくる車。運転席よこの目印へ歩いて乗ろう。':'生コンをホースで届ける車。運転席よこの目印へ歩いて乗ろう。',steps,0,'move','車のドアへ歩く');
  if(truck){
   if(f.mixer.pending)return result('ドラムでまぜています','生コンができるまで、ドラムの動きを見てみよう。',steps,2,null,'まぜています');
   if(f.wet)return result('生コンができた！','車を降りてバケツに汲むか、車の注ぎ口から型枠へ届けよう。',steps,3,'build','注ぐ場所をえらぶ');
   const raw=availableMixCells(f.mixer)>0;
   return result('生コンをつくろう','原料を積んだらドラムでまぜよう。1杯から用意できるよ。',steps,raw?2:1,'prepare-mix','次の準備をする');
  }
  if(!f.pump.legs)return result('車をしっかり支えよう','停めたら4本の脚を出すよ。脚をしまうまで走れないよ。',steps,1,'legs','支持脚を出す');
  if(!f.connected)return result('ミキサー車とつなごう','2台を近くに停めたら、ホースをつなごう。',steps,2,'connect','ホースをつなぐ');
  return result(f.hose?'ホースに生コンが入ったよ':'生コンをホースへ送ろう',f.hose?'「つくる」で注ぐ場所をえらぼう。移動する時は残りを回収するよ。':'送液メーターで、送っている量がわかるよ。',steps,3,f.hose?'build':'prime',f.hose?'注ぐ場所をえらぶ':'ホースに送る');
 }
 if(mode==='paint'&&f.aboard)return result('車を降りてぬろう','色をえらんだら、車を降りて道具を使おう。',[],0,'dismount','車を降りる');
 if(mode==='paint')return result(hasWork?'作品を自分の色にしよう':'まず作品をつくろう',hasWork?'①ぬる面 → ②好きな色 → ③道具。選んだ道具だけが下に出るよ。':'コンクリートを固めて型枠を外すと、色や模様をつけられるよ。',['ぬる場所','いろ','道具でぬる'],hasWork?1:0,hasWork?null:'build',hasWork?'':'作品をつくる');
 return null;
}

