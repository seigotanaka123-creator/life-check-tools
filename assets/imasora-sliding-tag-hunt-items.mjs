// One catalogue for simulation, pickup models and the single use button.
const rows=[
 ['speed','かぜリボン','🎀','#ffcf62','player','3秒、ぐんと加速'],
 ['grip','ぴたっとソール','👟','#91deb6','player','4秒、止まる・曲がるが得意'],
 ['landing','着地ブースター','🌀','#ffa977','player','次の着地で前へ加速'],
 ['cloak','透明マント','✧','#c7b2ef','player','4秒、鬼から姿を隠す'],
 ['clone','分身シャボン','🫧','#9fdef0','player','分身が別の道へ走る'],
 ['stamp','足あとスタンプ','🐾','#eda9ca','player','別方向へ偽の足あと'],
 ['cushion','ころころクッション','🟠','#ffbd88','player','転がして進路をずらす'],
 ['curtain','泡のカーテン','🫧','#c3eafa','player','泡の向こうから姿を隠す'],
 ['fan','横風ファン','🪭','#a8ddd6','player','横風で自分も鬼も流れる'],
 ['sheet','すべりシート','❄','#b2d9f3','player','踏むとだれでも滑りやすい'],
 ['bell','みはり鈴','🔔','#ffe294','player','鬼が通ると光と音でお知らせ'],
 ['hook','カーブフック','🪝','#fac9a1','player','近くのポールを軸に曲がる'],
 ['sticky','もちもちボール','🟣','#c8a6ef','player','当たると加速・小回りが鈍る'],
 ['magnet','道具マグネット','🧲','#f7acbb','player','近くの道具をひとつ引き寄せる'],
 ['scarf','追い風スカーフ','🎀','#ffba9a','hunters','予兆のあと短く加速'],
 ['gloves','グリップグローブ','🧤','#a5d6f2','hunters','短くブレーキ・旋回を強化'],
 ['guard','ふうせんガード','🛡','#b7ebd5','hunters','物体の妨害を一度だけ弾く'],
 ['flag','合図フラッグ','⚑','#f7d58e','hunters','最後に見た場所を仲間へ伝える'],
 ['ink','足あとインク','🎨','#aaa0e5','hunters','踏むと短く足あとが残る'],
 ['balloon','ふわふわ風船','🎈','#f6adcc','hunters','紐を持って浮き、近くへ降りる']
];
export const ITEM_DEFS=Object.freeze(Object.fromEntries(rows.map(([id,name,icon,color,audience,hint])=>[id,Object.freeze({id,name,icon,color,audience,hint})])));
export const ITEM_TYPES=Object.freeze(rows.map(r=>r[0]));
export const PLAYER_ITEMS=Object.freeze(rows.filter(r=>r[4]==='player').map(r=>r[0]));
export const HUNTER_ITEMS=Object.freeze(rows.filter(r=>r[4]==='hunters').map(r=>r[0]));
// These are actual visible poles; the rope never attaches to an invisible point.
export const HOOK_POLES=Object.freeze([[20,40],[-20,40],[20,-20],[-20,-20],[260,48],[-256,0],[112,112],[-64,128]].map(([x,z])=>Object.freeze({x,z})));
export function itemIcon(id){const c=ITEM_DEFS[id]?.color||'#d7e9ef',shapes={
 speed:'<path d="M20 17L8 6v15l12-4 12 4V6zM16 20l-4 14 8-5 8 5-4-14"/>',
 scarf:'<path d="M9 8h22v11H9zM22 19v15l6-4 5 4-4-15"/>',
 grip:'<path d="M5 14h10v12l4 4H4zM24 10h10v14l3 5H23z"/>',
 gloves:'<path d="M7 11q4-4 7 0l3 7 3-1v14H7zM24 6q5-3 7 1l2 7 4-1v14H24z"/>',
 landing:'<path fill="none" d="M9 8h22M9 32h22M27 9l-14 5 14 5-14 5 14 6"/>',
 cloak:'<path d="M16 6h8l11 27-15-5-15 5z"/><circle fill="#fff7e3" cx="20" cy="8" r="3"/>',
 clone:'<circle cx="16" cy="19" r="11"/><circle cx="30" cy="11" r="6"/><circle cx="28" cy="30" r="7"/><path fill="none" stroke="#fff" d="M10 17q1-5 6-5M26 10l2-2"/>',
 curtain:'<circle cx="10" cy="17" r="8"/><circle cx="27" cy="17" r="10"/><circle cx="18" cy="29" r="7"/><path fill="none" stroke="#fff" d="M6 15l3-3M23 13l3-2"/>',
 stamp:'<path d="M8 23h24v10H8zM18 8h4v15h-4zM12 5h16v5H12z"/>',
 cushion:'<circle cx="20" cy="20" r="15"/><path fill="none" stroke="#fff7e3" d="M20 5q-12 15 0 30M20 5q12 15 0 30"/>',
 fan:'<circle cx="20" cy="17" r="12"/><path fill="#fff7e3" d="M20 17L11 9l2 11zM20 17l12-4-7 11zM20 17l-3 13-7-8z"/><path d="M17 30h6v6h-6z"/>',
 sheet:'<path d="M5 9l28-3 3 25-28 4z"/><path fill="none" stroke="#fff" d="M20 10v19M11 14l18 11M11 25l18-11"/>',
 bell:'<path d="M8 29q5-5 4-12a8 8 0 0116 0q-1 7 4 12z"/><circle cx="20" cy="33" r="3"/><circle fill="none" cx="20" cy="6" r="3"/>',
 hook:'<path fill="none" stroke-width="5" d="M22 5v17q0 12-10 9-8-3-3-10"/><path d="M6 20l9 1-5 6z"/>',
 sticky:'<circle cx="20" cy="20" r="14"/><circle fill="#fff7e3" cx="15" cy="15" r="4"/><circle fill="#efd7ff" cx="28" cy="25" r="3"/>',
 magnet:'<path d="M7 7v16a13 13 0 0026 0V7h-8v16a5 5 0 01-10 0V7z"/><path fill="#a3d9fa" d="M7 6h8v9H7z"/><path fill="#fff7e3" d="M25 6h8v9h-8z"/>',
 guard:'<path d="M20 4l14 6v12q-3 10-14 15Q9 32 6 22V10z"/><circle fill="#fff7e3" cx="20" cy="19" r="7"/>',
 flag:'<path fill="none" d="M10 4v32"/><path d="M11 5h24l-5 7 5 7H11z"/>',
 ink:'<path d="M8 12h24l-3 22H11z"/><ellipse fill="#fff7e3" cx="20" cy="12" rx="12" ry="4"/><path fill="none" d="M11 11Q20-2 29 11"/>',
 balloon:'<ellipse cx="20" cy="15" rx="11" ry="13"/><path d="M20 27l-3 4h6z"/><path fill="none" d="M20 31q-5 3 0 7"/>'
 };return '<svg class="item-icon" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><g fill="'+c+'" stroke="#527584" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+(shapes[id]||shapes.sticky)+'</g></svg>';}
