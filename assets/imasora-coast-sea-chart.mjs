import {COAST_ISLANDS} from './imasora-coast-sea-regions.mjs?v=120mu';
import {coastAtlasPoint,COAST_SEA_ATLAS} from './imasora-coast-navigation.mjs?v=120mx';
import {COAST_HOME_PORT,COAST_ISLAND_PORTS} from './imasora-coast-island-harbors.mjs?v=120lr';
import {coastSearchAreas} from './imasora-coast-wayfinding.mjs?v=120mx';
const charted=COAST_ISLANDS.filter(i=>!i.hidden);
export const COAST_SEA_PLACES=Object.freeze([
 {id:'pier',name:'星待ちの桟橋',icon:'⚓',x:340,z:565,description:'船出と帰港の目印。橋のある岸へ戻ると、街に行けるよ。'},
 ...charted
]);
// The line ends in water outside the real landing, not in the mountain centre.
// Hidden islands remain unlisted even if a caller knows their internal ID.
export function coastSeaLanding(id){
 const place=COAST_SEA_PLACES.find(p=>p.id===id);if(!place)return null;
 const p=id==='pier'?COAST_HOME_PORT:COAST_ISLAND_PORTS.find(p=>p.id===place.port);
 return p?{x:p.x,z:p.edge+p.out*85}:null;
}
export function coastSeaChart({visited=[]}={}){
 const a=COAST_SEA_ATLAS,p=coastAtlasPoint(340,565,'sea');
 return `<rect width="600" height="470" rx="20" fill="#92d4e1"/>
 <path d="M0 42Q180 92 300 43T600 45V0H0Z" fill="#ffe8b3"/>
 <text x="140" y="28" text-anchor="middle" class="coast-map-title">いつもの浜</text>
 <path d="M${p.x} 52V${p.y}" stroke="#b78a61" stroke-width="10"/>
 <path data-coast-route fill="none" pointer-events="none"/>
 <g class="coast-map-places">${coastSearchAreas(visited).filter(i=>i.id!=='pier').map(i=>{const q=coastAtlasPoint(i.x,i.z,'sea');return `<g data-map-pin="${i.id}" transform="translate(${q.x} ${q.y})"><ellipse class="coast-search-area" rx="${i.rx/(a.right-a.left)*600}" ry="${i.rz/(a.bottom-a.top)*470}" fill="${i.known?'#fff2c9':'#e1f2e9'}" fill-opacity=".55" stroke="#5f9d9e" stroke-width="2" stroke-dasharray="5 5"/><text text-anchor="middle" dy="6">${i.icon} ${i.name}</text></g>`;}).join('')}</g>
 `;
}
