export const PROJECT_HISTORY_PAGE=1024;
export const PROJECT_HISTORY_LIMIT=32768;
export function projectOperationCount(p){return(p.operations?.length??0)+(p.archivedOperations??[]).reduce((n,page)=>n+page.length,0);}
export function lastProjectOperation(p){return p.operations?.at(-1)??p.archivedOperations?.at(-1)?.at(-1);}
export function findProjectOperation(p,id){
 const recent=p.operations.find(a=>a.operationId===id);if(recent)return recent;
 for(const page of p.archivedOperations??[]){const prior=page.find(a=>a.operationId===id);if(prior)return prior;}
}
export function archiveProjectPage(p){if(p.schemaVersion>=14&&p.operations.length>PROJECT_HISTORY_PAGE)p.archivedOperations.push(p.operations.splice(0,PROJECT_HISTORY_PAGE));}
