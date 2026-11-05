// One catalogue for simulation, pickup models and the single use button.
const rows=[
 ['speed','かぜリボン','🎀','#ffcf62','player','3秒、ぐんと加速'],
 ['cloak','透明マント','✧','#c7b2ef','player','4秒、鬼から姿を隠す'],
 ['clone','分身シャボン','🫧','#9fdef0','player','分身が別の道へ走る'],
 ['cushion','ころころクッション','🟠','#ffbd88','player','後ろに転がし、当たると2秒ピヨピヨ'],
 ['curtain','泡のカーテン','🫧','#c3eafa','player','泡の向こうから姿を隠す'],
 ['fan','吹き飛ばしファン','🪭','#a8ddd6','player','巨大扇風機を設置。前方の風で吹き飛ばす'],
 ['sheet','すべりシート','❄','#b2d9f3','player','踏むとだれでも滑りやすい'],
 ['hook','ビュンフック','🪝','#fac9a1','player','前方のポールへ紐で一気に移動する'],
 ['scarf','追い風スカーフ','🎀','#ffba9a','hunters','予兆のあと短く加速'],
 ['sunglasses','みとおしサングラス','🕶','#82d7d0','hunters','試合終了まで、透明化と泡を見通す'],
 ['ink','足あとインク','🎨','#aaa0e5','hunters','使うと逃走者に付着。試合終了まで追跡'],
 ['balloon','ふわふわ風船','🎈','#f6adcc','hunters','どこからでも逃走者へ追尾'],
 ['radar','ポケットレーダー','◉','#79dcd1','both','試合終了まで、相手のおおまかな方角が分かる'],
 ['mirror','うしろ見ミラー','▰','#a4daed','player','試合終了まで、画面上部のミラーで後方を確認']
];
export const ITEM_DEFS=Object.freeze(Object.fromEntries(rows.map(([id,name,icon,color,audience,hint])=>[id,Object.freeze({id,name,icon,color,audience,hint})])));
export const ITEM_TYPES=Object.freeze(rows.map(r=>r[0]));
export const PLAYER_ITEMS=Object.freeze(rows.filter(r=>r[4]==='player'||r[4]==='both').map(r=>r[0]));
export const HUNTER_ITEMS=Object.freeze(rows.filter(r=>r[4]==='hunters'||r[4]==='both').map(r=>r[0]));
export const SUPPLY_COUNT=PLAYER_ITEMS.length+HUNTER_ITEMS.length;
export const INK=Object.freeze({markUntilRoundEnd:true,trailSeconds:15,maxFootprints:256});
export const HUNT_FIELDS=Object.freeze({sheetRadius:16,curtainRadius:18,curtainHeight:12,fanRadius:4.5,fanHeight:9.7,fanSeconds:12,windRange:42});
// These are actual visible poles; the rope never attaches to an invisible point.
export const HOOK_POLES=Object.freeze([[20,40],[-20,40],[20,-20],[-20,-20],[260,48],[-256,0],[112,112],[-64,128]].map(([x,z])=>Object.freeze({x,z})));
export function itemIcon(id){const c=ITEM_DEFS[id]?.color||'#d7e9ef',shapes={
 speed:'<path d="M20 17L8 6v15l12-4 12 4V6zM16 20l-4 14 8-5 8 5-4-14"/>',
 mirror:'<path d="M20 8v6"/><rect x="3" y="14" width="34" height="16" rx="5"/><path d="M9 25l8-7m4 7 6-7" stroke="#f5fdff"/>',
 radar:'<circle cx="20" cy="20" r="15"/><circle fill="none" stroke="#fff" cx="20" cy="20" r="9"/><path fill="none" stroke="#fff" d="M20 20L29 9M20 6v3M6 20h3M20 31v3M31 20h3"/><circle fill="#fff7e3" cx="13" cy="24" r="2"/>',
 sunglasses:'<path d="M3 12h34v5h-3l-3 13H8L5 17H3z"/><rect x="7" y="15" width="11" height="11" rx="3" fill="#183347"/><rect x="22" y="15" width="11" height="11" rx="3" fill="#183347"/>',
 scarf:'<path d="M9 8h22v11H9zM22 19v15l6-4 5 4-4-15"/>',
 cloak:'<path d="M16 6h8l11 27-15-5-15 5z"/><circle fill="#fff7e3" cx="20" cy="8" r="3"/>',
 clone:'<circle cx="16" cy="19" r="11"/><circle cx="30" cy="11" r="6"/><circle cx="28" cy="30" r="7"/><path fill="none" stroke="#fff" d="M10 17q1-5 6-5M26 10l2-2"/>',
 curtain:'<circle cx="10" cy="17" r="8"/><circle cx="27" cy="17" r="10"/><circle cx="18" cy="29" r="7"/><path fill="none" stroke="#fff" d="M6 15l3-3M23 13l3-2"/>',
 cushion:'<circle cx="20" cy="20" r="15"/><path fill="none" stroke="#fff7e3" d="M20 5q-12 15 0 30M20 5q12 15 0 30"/>',
 fan:'<circle cx="20" cy="17" r="12"/><path fill="#fff7e3" d="M20 17L11 9l2 11zM20 17l12-4-7 11zM20 17l-3 13-7-8z"/><path d="M17 30h6v6h-6z"/>',
 sheet:'<path d="M5 9l28-3 3 25-28 4z"/><path fill="none" stroke="#fff" d="M20 10v19M11 14l18 11M11 25l18-11"/>',
 hook:'<path fill="none" stroke-width="5" d="M22 5v17q0 12-10 9-8-3-3-10"/><path d="M6 20l9 1-5 6z"/>',
 ink:'<path d="M8 12h24l-3 22H11z"/><ellipse fill="#fff7e3" cx="20" cy="12" rx="12" ry="4"/><path fill="none" d="M11 11Q20-2 29 11"/>',
 balloon:'<ellipse cx="20" cy="15" rx="11" ry="13"/><path d="M20 27l-3 4h6z"/><path fill="none" d="M20 31q-5 3 0 7"/>'
 };return '<svg class="item-icon" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><g fill="'+c+'" stroke="#527584" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+(shapes[id]||'<circle cx="20" cy="20" r="12"/>')+'</g></svg>';}

// Every new item must declare its affected side. Terrain and colliding objects
// intentionally differ from opponent-only ink; do not infer target from user.
export const ITEM_EFFECT_SCOPE=Object.freeze({speed:'self',cloak:'self',clone:'hunter-decoy',cushion:'physical-all',curtain:'sight-all',fan:'physical-all',sheet:'terrain-all',hook:'self',scarf:'self',sunglasses:'self',ink:'runner-only',balloon:'self',radar:'self',mirror:'self'});
