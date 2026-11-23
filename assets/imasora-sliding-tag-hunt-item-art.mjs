// Inventory portraits are painted at twice their display size when the held item changes.
export function paintHuntItemPortrait(canvas,id){
 const size=96;
 if(canvas.width!==size||canvas.height!==size){canvas.width=size;canvas.height=size;}
 const art=canvas.getContext('2d');
 if(!art)return;
 art.setTransform(2,0,0,2,0,0);
 art.clearRect(0,0,48,48);
 art.lineCap='round';
 art.lineJoin='round';
 const shade=(x,y,x2,y2,...colors)=>{
  const g=art.createLinearGradient(x,y,x2,y2);
  colors.forEach((c,i)=>g.addColorStop(i/(colors.length-1),c));return g;
 };
 const gloss=(x,y,r,...colors)=>{
  const g=art.createRadialGradient(x-r*.24,y-r*.37,0,x,y,r);
  colors.forEach((c,i)=>g.addColorStop(i/(colors.length-1),c));return g;
 };
 const path=(d,fill,stroke,width=1)=>{
  const shape=new Path2D(d);
  if(fill){art.fillStyle=fill;art.fill(shape);}
  if(stroke){art.strokeStyle=stroke;art.lineWidth=width;art.stroke(shape);}
 };
 const line=(d,color,width=1)=>path(d,null,color,width);
 const round=(x,y,w,h,r,fill,stroke)=>{
  const shape=new Path2D();
  shape.roundRect(x,y,w,h,r);
  art.fillStyle=fill;art.fill(shape);
  if(stroke){art.strokeStyle=stroke;art.lineWidth=1;art.stroke(shape);}
 };
 const oval=(x,y,rx,ry,fill,stroke,width=1)=>{
  const shape=new Path2D();
  shape.ellipse(x,y,rx,ry,0,0,Math.PI*2);
  if(fill){art.fillStyle=fill;art.fill(shape);}
  if(stroke){art.strokeStyle=stroke;art.lineWidth=width;art.stroke(shape);}
 };
 const bubble=(x,y,r,palette)=>{
  oval(x,y,r,r,gloss(x,y,r,...palette),'#bceafb',.8);
  line('M'+(x-r*.61)+' '+(y-r*.18)+' Q'+(x-r*.51)+' '+(y-r*.65)+' '+(x-r*.12)+' '+(y-r*.65),'#f4fbff',1.15);
  oval(x+r*.34,y+r*.42,r*.12,r*.09,'#d3bbfb');
 };
 const steel=(x,y,x2,y2)=>shade(x,y,x2,y2,'#f1fbff','#9bb9c9','#547283');
 oval(24,43,17,1.9,'#07172444');
 switch(id){
 case 'speed': {
  const gold=shade(7,14,32,34,'#ffedaa','#ffbc4f','#a75216');
  path('M23 20Q11 8 6 13Q1 21 8 28Q14 29 22 23L17 38L22 35L25 37L26 26L31 41L35 35L40 36L30 22Q41 28 44 21Q46 12 40 10Q34 9 25 19Z',gold,'#88491e',1.25);
  path('M9 15Q15 16 21 21Q14 24 10 24Q7 22 9 15M29 21Q36 13 41 13Q42 16 40 21Q36 24 29 21','#b85521');
  line('M8 14Q13 12 21 19M29 18Q36 11 40 11M19 32L22 25M30 28L34 34','#ffe397',1.15);
  round(21,17,8,10,3,shade(20,16,27,26,'#fff5bc','#f7b650','#a56020'),'#b6762a');
  break;
 }
 case 'cloak': {
  path('M17 9Q24 5 31 9C28 16 35 26 42 37Q35 42 28 39Q22 36 16 39Q9 42 5 38C11 24 19 19 17 9Z',shade(12,9,38,41,'#f1e1ff','#ac9ce8','#4c418e'),'#3a336a',1.1);
  path('M21 15C22 22 16 33 14 38Q19 34 23 36Q25 30 24 18M29 18Q29 29 36 37L30 37Q27 32 27 23','#7060bdbc');
  line('M17 11Q24 15 31 11M10 36Q16 37 20 34M34 37Q37 38 39 36','#dac8ff',1.15);
  oval(24,13,2.8,2.8,gloss(24,13,3,'#fff9df','#f8c66b','#91632f'),'#a16c38');
  break;
 }
 case 'clone': {
  const clear=['#f0fcffdb','#70d2e888','#4969b4ca'];
  bubble(12,29,7.5,clear);bubble(36,12,6,clear);bubble(24,22,13,clear);
  path('M12 31Q13 25 17 24Q20 24 23 27Q23 20 27 19Q33 19 34 27Q29 33 23 34Z','#dcfaff62');
  break;
 }
 case 'curtain': {
  const foam=['#f3f9ff','#a1d8edbb','#345a9bd8'];
  bubble(10,18,7,foam);bubble(25,16,8.5,foam);bubble(38,20,7,foam);
  bubble(12,31,6.2,foam);bubble(24,29,8.7,foam);bubble(36,32,7.4,foam);
  break;
 }
 case 'cushion': {
  oval(24,25,17,15,gloss(24,25,18,'#ffe3ad','#eda05b','#ad502d'),'#834732',1.1);
  path('M10 18C5 29 19 40 32 37C37 36 40 32 41 29C36 32 25 33 17 28C13 25 11 21 10 18Z','#fbe2b7','#a8603a');
  art.setLineDash([1.3,1.7]);line('M9 22Q16 37 37 35','#ac674b',.9);art.setLineDash([]);
  line('M14 18Q19 13 26 14','#fff0d6',1.3);
  oval(25,24,2,1.3,'#a4533266');
  break;
 }
 case 'fan': {
  path('M20 31H28L29 41H19Z',steel(19,32,29,39),'#587580');
  oval(24,41,10,2.6,shade(15,39,30,43,'#cef5ee','#6aa7a9','#2f656f'),'#335a66');
  oval(24,21,16,16,shade(9,7,38,36,'#c7fff0','#669d9f','#274e5f'),'#345d67');
  oval(24,21,13,13,'#143647','#a2ded8');
  for(let i=0;i<3;i++){
   art.save();art.translate(24,21);art.rotate(i*Math.PI*2/3);
   path('M0 -2Q-10 -8 -3 -11Q3 -12 5 -8Q5 -6 2 -1Z',shade(-8,-11,5,0,'#e4ffef','#83cbbb','#467d85'));
   art.restore();
  }
  oval(24,21,10,10,null,'#bdebe55e',.75);
  oval(24,21,3.5,3.5,steel(20,17,27,24),'#6a999d');
  line('M13 14Q17 8 24 8','#e5fff6',1.25);
  break;
 }
 case 'sheet': {
  path('M5 29L34 17L43 26L39 32L13 41L5 34Z',shade(14,21,31,39,'#b7eff9','#65b4d3','#347aa2'),'#316f97');
  path('M5 28L34 15L43 24L13 37Z',shade(10,24,43,30,'#f1fcff','#a0d8f6','#5ca1cf'),'#7db6d6');
  path('M34 15L43 24L34 26Q37 21 34 15','#e9f8ff');
  art.save();art.translate(22,27);art.scale(1,.6);art.rotate(-.27);
  for(let i=0;i<3;i++){line('M-9 0h18M-7 -2l2 2-2 2m14-4-2 2 2 2','#f8fdff',1.25);art.rotate(Math.PI/3);}
  art.restore();break;
 }
 case 'hook': {
  line('M29 8C16 3 10 6 8 14Q6 22 14 27Q22 34 15 38Q10 41 7 36','#8d5f45',5);
  line('M29 8C16 3 10 6 8 14Q6 22 14 27Q22 34 15 38Q10 41 7 36','#e9bd87',2.9);
  line('M27 10L31 23Q36 32 40 24L42 19','#33576a',6);
  line('M27 10L31 23Q36 32 40 24L42 19',steel(27,9,44,27),4);
  path('M40 17L44 16L44 23Z','#e8faff','#547c90',.8);
  round(24,7,7,11,2,shade(24,7,31,18,'#ffd5a6','#e09356','#9f5a3b'),'#a06443');
  break;
 }
 case 'scarf': {
  const cloth=shade(12,11,33,40,'#ffc8a1','#ef896e','#b74c4d');
  path('M8 15Q18 6 30 14L42 11L42 19Q37 24 28 22Q21 31 18 41L8 37Q13 28 15 22Q7 22 8 15Z',cloth,'#883b42');
  path('M8 16Q21 20 29 14L41 12Q36 20 25 20Q19 22 9 21Z','#ffb491');
  line('M12 24Q17 27 22 27M10 35L19 39M37 20L42 17','#ffd1a5',1.25);
  line('M11 37L9 41M14 38L13 43M17 39L17 44','#db856f',1.4);
  break;
 }
 case 'sunglasses': {
  const frame=shade(5,13,43,32,'#c2fff0','#60bbba','#286977');
  path('M5 18L9 11L17 10L16 13L9 16M39 18L45 13L45 16L41 22',frame,'#377683');
  path('M2 18Q10 14 20 16L25 18Q36 14 46 18L43 29Q39 35 30 32Q26 30 25 24L22 24Q21 33 13 33Q6 32 4 28Z',frame,'#245866');
  const lens=shade(10,18,14,33,'#345371','#10243c','#081929');
  path('M7 20Q12 17 19 20L17 28Q14 31 10 28ZM28 20Q37 17 42 20L40 28Q35 32 30 29Z',lens,'#336174');
  line('M9 21L15 20M11 23L16 21M31 22L38 20M33 24L39 22','#c5edf585',1.15);
  break;
 }
 case 'ink': {
  path('M10 13H38L35 37Q34 42 24 42Q14 42 13 37Z',shade(10,15,37,36,'#e4d6fd','#a995d9','#56468a'),'#3e3864',1.15);
  oval(24,14,14,6,steel(24,8,24,20),'#6c779b');oval(24,14,10.5,3.4,gloss(24,14,11,'#a572df','#764bb2','#402a65'));
  line('M13 12Q14 4 22 6Q31 7 36 12','#bfc4e0',1.4);
  oval(24,30,6.2,4.4,'#efe6ffa6');for(const x of [19.5,23.8,28])oval(x,24.6,1.65,2.2,'#efe6ffb0');
  break;
 }
 case 'balloon': {
  path('M24 32Q17 38 27 40Q32 42 27 46',null,'#9caabd',1.35);
  path('M24 29L20 34Q24 36 28 34Z',shade(21,29,27,35,'#ffcadc','#b7486c'),'#9f4262');
  oval(24,17.2,13,15,gloss(24,17,15.9,'#fff0f8','#f69bbc','#c15280'),'#b65c83',1.05);
  line('M15.5 15Q16 9 21.5 6.8','#fff8fc',1.55);
  oval(29.5,27,3,1.1,'#ffccdd81');break;
 }
 case 'radar': {
  line('M13 17L10 5','#7193a1',3);line('M13 17L10 5','#d5f4e9',1.5);
  round(8,14,32,28,5,shade(9,14,37,42,'#d5fae9','#7ac4b9','#428188'),'#315e66');
  round(11,17,26,19,3,'#142e41','#5d989a');
  oval(24,26.5,7,7,'#224f58','#83c3b6',.75);
  oval(24,26.5,3.5,3.5,null,'#5bb9ae',.8);
  path('M24 26.5V19.5Q29 19.5 30.7 24Z','#93f9c8a6');line('M24 26.5L28.6 21.8','#d8ffdf',1);
  oval(21,29.3,1.15,1.15,'#edffaf');
  oval(14,39,1.25,1.25,'#e4ffe0');line('M28 39H34','#2e6970',1.25);break;
 }
 case 'mirror': {
  path('M22 15L22 8L16 8L16 5L31 5V8H27V15Z',steel(18,4,30,15),'#4e6b7e');
  round(3,14,42,22,7,shade(3,13,42,36,'#b5d7e1','#54778e','#233d51'),'#365368');
  round(6,17,36,16,5,shade(8,15,39,34,'#e0fbfc','#99cde6','#638daf'),'#bfdde8');
  path('M8 27L20 18H26L10 31ZM21 32L38 18L40 20L26 32Z','#fff9e27a');
  line('M8 16H38','#e4f9ff',1.1);break;
 }
 }
}
