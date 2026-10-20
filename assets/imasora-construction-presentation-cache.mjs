// Cache only drawing of an unchanged, inactive model under an explicitly
// unchanged scene revision. This never owns or advances a simulation.
export function createPresentationCache({sameSource=(a,b)=>a===b}={}){
 let valid=false,lastSource,lastRevision;
 return {reset(){valid=false;},draw(source,revision,render,{live=false}={}){
  const stable=!live&&revision!==undefined;
  if(stable&&valid&&Object.is(revision,lastRevision)&&sameSource(source,lastSource))return false;
  valid=false;render();
  if(stable){valid=true;lastSource=source;lastRevision=revision;}
  return true;
 }};
}
