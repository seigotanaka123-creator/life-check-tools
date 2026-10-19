// Reuse only a published contact revision. Unversioned callers get a fresh
// read each update/action; an actual scene edit invalidates immediately.
export function createContactReadCache(){
 let key,has=false,value;
 return{reset(){has=false;value=undefined;},read(revision,build){if(has&&Object.is(revision,key))return value;const next=build();key=revision;value=next;has=true;return value;}};
}
// Other live tools can change their geometry before the shared scene rebuilds.
// Use per-update reads while they own the site, rather than a stale scene key.
export function constructionContactCacheRevision(revision,controllers){return controllers.some(c=>c?.active)?undefined:revision;}
