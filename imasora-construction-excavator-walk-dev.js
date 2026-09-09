import {startExcavatorView} from './imasora-construction-excavator-dev.js?v=466';
import {initialExcavatorWalk,actExcavatorWalk,stepExcavatorWalk} from './assets/imasora-construction-excavator-walk.js?v=466';
const q=new URLSearchParams(location.search),example=['dig','gallery','pit'].includes(q.get('example'))?q.get('example'):'gallery';
document.querySelectorAll('[data-example]').forEach(a=>{if(a.dataset.example===example){a.setAttribute('aria-current','page');a.classList.add('selected');}});
startExcavatorView({initial:()=>initialExcavatorWalk(example),actState:actExcavatorWalk,stepState:stepExcavatorWalk,walking:true,example});
