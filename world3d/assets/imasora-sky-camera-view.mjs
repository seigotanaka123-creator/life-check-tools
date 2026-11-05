import {mountSkyCamera} from './imasora-sky-camera-ui.mjs?v=120wc';
import {createSkyCandidateClient} from './imasora-sky-candidate-client.mjs?v=120qm';
const semantic=new URL(location.href).searchParams.get('skyAnalysis')==='semantic';
const balanced=new URL(location.href).searchParams.get('skyAnalysis')==='balanced';
const client=createSkyCandidateClient(semantic||balanced?{workerFactory:()=>new Worker(new URL(balanced?'./imasora-sky-semantic-worker.mjs?v=120qk&input=balanced':'./imasora-sky-semantic-worker.mjs?v=120qk',import.meta.url),{type:'module'})}:{});
const growthMode=!semantic&&!balanced&&new URL(location.href).searchParams.get('from')==='tag-growth',entry=globalThis.ImasoraSlidingTagEntry,growth=globalThis.ImasoraTagGrowth;
const returnHome='../life-quest-walk.html?from='+(new URL(location.href).searchParams.get('return')==='monster'?'sky-camera':'sliding-tag');
let capturedSubject=null;
if(growthMode){try{capturedSubject=growth.subject(JSON.parse(localStorage.getItem(entry.HOME_KEY)));}catch{}document.querySelector('footer small').textContent='写真から空を推定します。写真を見て確かめてから、同じモンスターの育成に使います。';document.querySelector('#back').href=returnHome;}
const screen=mountSkyCamera({candidateClient:client,...growthMode&&capturedSubject?{onConfirm(candidate){if(growth.subject(JSON.parse(localStorage.getItem(entry.HOME_KEY)))!==capturedSubject)throw Error('MONSTER_CHANGED');sessionStorage.setItem(growth.SKY_INBOX,JSON.stringify({version:1,subject:capturedSubject,candidate,confirmedAt:Date.now()}));location.assign(returnHome);}}:{}});
if(semantic||balanced)document.querySelector('footer small').textContent=balanced?'明るさを整える比較版です。育成には反映しません。':'空の見分け方を調整中です。育成には反映しません。';
addEventListener('pagehide',event=>{if(!event.persisted)screen.dispose();});
