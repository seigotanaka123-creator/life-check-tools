import {availableMixCells} from './mixing.mjs';

const quarters=fill=>(fill??[]).reduce((sum,n)=>sum+n,0)/4;
export function deliveryConcreteSummary(project,site=project?.site){
  const free=project?.freeBuild;
  const mixers=[project?.mixer,free?.mixer].filter(Boolean);
  return{
    concrete:(site?.availableConcreteCells??0)+(free?.wet??0)/4,
    bucket:(site?.bucketCells??0)+(free?.bucket??0)/4,
    hose:(free?.hose??0)/4,
    poured:(site?.pouredCells??0)+quarters(free?.fill),
    completed:(project?.completedFloors??[]).reduce((sum,f)=>sum+f.cells,0)
      +(free?.completed??[]).reduce((sum,w)=>sum+quarters(w.fill),0),
    // receivedCells is lifetime intake: part may already be in the other mixer.
    unmixed:mixers.reduce((sum,m)=>sum+availableMixCells(m)+(m.pending?.cells??0),0)
  };
}
