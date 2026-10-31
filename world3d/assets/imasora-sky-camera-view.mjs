import {mountSkyCamera} from './imasora-sky-camera-ui.mjs?v=120qj';
import {createSkyCandidateClient} from './imasora-sky-candidate-client.mjs?v=120qm';
const semantic=new URL(location.href).searchParams.get('skyAnalysis')==='semantic';
const balanced=new URL(location.href).searchParams.get('skyAnalysis')==='balanced';
const client=createSkyCandidateClient(semantic||balanced?{workerFactory:()=>new Worker(new URL(balanced?'./imasora-sky-semantic-worker.mjs?v=120qk&input=balanced':'./imasora-sky-semantic-worker.mjs?v=120qk',import.meta.url),{type:'module'})}:{});
const screen=mountSkyCamera({candidateClient:client});
if(semantic||balanced)document.querySelector('footer small').textContent=balanced?'明るさを整える比較版です。育成には反映しません。':'空の見分け方を調整中です。育成には反映しません。';
addEventListener('pagehide',event=>{if(!event.persisted)screen.dispose();});
