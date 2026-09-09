// Ordinary construction materials. A design catalog, not a grant of inventory.
// Keep earth-soil's existing identity; never alias these to Mars/UFO materials.
export const ORDINARY_MATERIAL_GROUPS=Object.freeze([
  {id:'ground',name:'土・石',symbol:'▧',color:'#a08761'},
  {id:'plant',name:'木・葉',symbol:'❋',color:'#699366'},
  {id:'liquid',name:'水',symbol:'≈',color:'#429dc1'},
  {id:'metal',name:'金属',symbol:'◇',color:'#82949d'},
  {id:'building',name:'建材',symbol:'▤',color:'#bd856c'},
].map(Object.freeze));
const rows=[
  ['soil','ground','土','通常の重力が働く土です。火星土のようにジャンプを強めません。','庭・山・土の坂道・池の岸を造れます。','ショベルカー／ローダーで掘る・敷く、ダンプで運び、ブルドーザーでならす'],
  ['timber','plant','木材','支えのない木材は落下します。水に浮くことはあっても、空中には浮きません。','家の床・梁・橋・柵を造れます。火星木材との違いは空中で自立しないことです。','クレーンで吊って接合、フォークリフトで板・梁のパレットを運ぶ'],
  ['iron','metal','鉄','重さと支持が必要な金属です。火星素材のような遠隔回転や自動浮遊はしません。','支柱・梁・手すり・重りを造れます。','クレーンで梁を接合、フォークリフトで金属部材を運ぶ'],
  ['water','liquid','水','低い方へ流れ、水平な水面を作ります。上へ送るにはポンプなど外からの力が必要です。','池・下り川・滝・貯水槽を造れます。矢印だけで上へ流れる火星水と区別します。','ローダーの密閉水バケットで汲む・注ぐ、ショベルカーで先に水路を掘る'],
  ['leaves','plant','葉っぱ','柔らかい植物素材です。梁の代わりに重い建物を支えたり、触れた物を浮かせたりしません。','生け垣・植栽・庭の装飾を作れます。','フォークリフトで植栽パレットを運び、設置する'],
  ['stone','ground','石','支えを外すと落ちる、硬く重い素材です。特殊な重力の作用はありません。','石の壁・橋脚・花壇の縁を造れます。','ダンプで運搬、クレーンで大きな石を配置'],
  ['gravel','ground','砂利','粒が積み重なり、急すぎる斜面では崩れる素材です。','砂利道・庭の敷石・水路の底を造れます。','ローダーとダンプで運び、ブルドーザーでならす'],
  ['sand','ground','砂','容器からこぼれ、山にすると斜面へ広がります。物を止める特殊な力はありません。','砂場・砂地・緩い坂を造れます。','ローダーですくい、ダンプで運び、ブルドーザーでならす'],
  ['clay','ground','粘土','形を整えられる土です。登録した形へ勝手に戻る性質はありません。','土の壁・花壇・容器の成形材料として使えます。','ローダーで運搬、成形した部品はフォークリフトで運ぶ'],
  ['copper','metal','銅','重さのある金属で、支持や接合が必要です。離れた部品へ力を送る特性はありません。','配管の部材・屋根・装飾を造れます。','クレーンで部材を接合、フォークリフトで運ぶ'],
  ['silver','metal','銀','銀色に光る金属です。色や反射は変わっても、自動で動く力はありません。','装飾板・看板の縁・記念モニュメントを造れます。','フォークリフトで小部材を運搬、大部材はクレーンで配置'],
  ['gold','metal','金','金色の重い金属です。特殊な反発や浮遊の性質はありません。','飾り・像・建物のアクセントを造れます。基本建築の必須素材にはしません。','フォークリフトで小部材を運搬、大部材はクレーンで配置'],
  ['brick','building','レンガ','重ねて接合する普通の建材です。外した部材が勝手に再結合することはありません。','家の壁・階段・花壇を造れます。','フォークリフトでパレット運搬、クレーンで壁部材を配置'],
  ['glass','building','ガラス','透明な固体で、人・車・水を遮ります。火星ガラスのように水だけを通しません。','窓・温室・水槽・透明な仕切りを造れます。','フォークリフトで保護枠ごと運び、クレーンで取り付ける'],
];
export const ORDINARY_MATERIALS=Object.freeze(rows.map(([key,group,name,property,play,vehicles],index)=>Object.freeze({
  id:`earth-${key}`,number:index+1,group,name:`普通の${name}`,property,play,vehicles,
  origin:'earth',acquisition:'walking',marsShop:false,
  source:key==='soil'?'日々の散歩などのゲーム内報酬／工事現場での掘削':'日々の散歩などのゲーム内報酬（火星ショップでは販売しません）',
  status:key==='soil'?'開発画面で掘削・運搬・設置を確認済み。散歩報酬との接続は今後です。':['timber','iron'].includes(key)?'独立した開発画面で木材部材・鉄の柱の出庫・吊上げ・設置・回収・保存を確認。散歩報酬、本体施工、浮力や材質別の重量差は今後です。':'建設素材として設計登録済み。散歩報酬・施工・物理は順次実装します。',
})));
export function findOrdinaryMaterials(query='',group='all'){
  const q=query.normalize('NFKC').toLocaleLowerCase('ja').trim();
  return ORDINARY_MATERIALS.filter(m=>(group==='all'||m.group===group)&&(!q||(/^\d+$/.test(q)?m.number===Number(q):`${m.name} ${m.property} ${m.play} ${m.vehicles} ${m.source}`.toLocaleLowerCase('ja').includes(q))));
}
