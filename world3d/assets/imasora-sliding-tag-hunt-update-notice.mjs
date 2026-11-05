const versionOK=v=>typeof v==='string'&&/^[a-z0-9_-]{1,64}$/i.test(v);
const attribute=(tag,name)=>{const m=tag.match(new RegExp('(?:^|\\s)'+name+'\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))','i'));return m?.[1]??m?.[2]??m?.[3]??null;};
export function huntPreviewVersion(html,pageUrl){
 if(typeof html!=='string'||html.length>131072)return null;
 try{const page=new URL(pageUrl),expected=new URL('./assets/imasora-sliding-tag-view.mjs',page),versions=[];
  for(const tag of html.replace(/<!--[\s\S]*?-->/g,'').match(/<script\b[^>]*>/gi)??[]){if(attribute(tag,'type')?.toLowerCase()!=='module')continue;const src=attribute(tag,'src');if(!src)continue;const u=new URL(src,page);if(u.origin!==page.origin||u.pathname!==expected.pathname)continue;const v=u.searchParams.get('v');if(!versionOK(v))return null;versions.push(v);}
  return versions.length===1?versions[0]:null;
 }catch{return null;}
}

// Check only at a preparation/pause boundary or on return to a visible menu.
// The old match is never reloaded. A normal link opens a separate new page.
export function createHuntUpdateNotice({document:doc=globalThis.document,windowTarget=doc?.defaultView,container,pageUrl,homePath,version,visible=()=>true,fetcher=globalThis.fetch,clock=Date.now,setTimer=setTimeout,clearTimer=clearTimeout,Controller=globalThis.AbortController}={}){
 const page=new URL(pageUrl),link=doc.createElement('a'),style=doc.createElement('style');
 const homeMode=page.searchParams.get('from')==='home';
 let home=new URL('../life-quest-walk.html',page);
 if(homeMode&&homePath)try{
  const candidate=new URL(homePath,page);
  if(candidate.origin===page.origin&&!candidate.username&&!candidate.password&&!candidate.pathname.startsWith('//')&&candidate.pathname.endsWith('/life-quest-walk.html')){
   candidate.search='';
   candidate.hash='';
   home=candidate;
  }
 }catch{}
 // The home entry belongs to this tab's sessionStorage. A separate tab
 // starts from home so it can create its own valid entry.
 link.className='hunt-update-link';link.textContent=homeMode?'ホームから更新版へ ↗':'更新版を開く ↗';link.title=homeMode?'新しいタブでホームを開きます。ホームの「鬼ごっこ」から始めてください。':'今の勝負を残して、新しい画面を開きます';link.target='_blank';link.rel='noopener';link.hidden=true;link.dataset.currentVersion=version??'';
 style.textContent='.hunt-update-link{display:block;padding:11px 13px;margin:0 0 14px;border:1px solid #b5efd8;border-radius:13px;background:#a5e1c9;color:#173e4e!important;font-size:14px;font-weight:800;text-decoration:none}.hunt-update-link[hidden]{display:none!important}';doc.head.append(style);container.prepend(link);
 let last=-Infinity,request=null,disposed=false,requests=0,latest=null;
 const allowed=()=>!disposed&&versionOK(version)&&!doc.hidden&&visible();
 function abort(){const r=request;if(!r)return;request=null;last=-Infinity;clearTimer(r.timer);r.controller.abort();}
 async function check(){const now=clock();if(!allowed()||request||now>=last&&now-last<30000||typeof fetcher!=='function'||typeof Controller!=='function')return false;
  let controller;try{controller=new Controller();}catch{return false;}last=now;const r={controller,timer:null};request=r;requests++;
  try{r.timer=setTimer(()=>{if(request===r)abort();},8000);const response=await fetcher(page.href,{cache:'no-store',credentials:'same-origin',signal:r.controller.signal});if(!response.ok||response.url&&new URL(response.url).origin!==page.origin)return false;const v=huntPreviewVersion(await response.text(),page.href);if(disposed||request!==r||!v)return false;
   latest=v;link.dataset.latestVersion=v;link.hidden=v===version;
   if(!link.hidden){
    const href=new URL(homeMode?home:page);
    if(!homeMode)href.searchParams.set('revision',v);
    link.href=href.href;
   }
   return !link.hidden;
  }catch{return false;}finally{clearTimer(r.timer);if(request===r)request=null;}
 }
 const onFocus=()=>{void check();},onVisibility=()=>{if(!doc.hidden)void check();},onHide=e=>{abort();if(!e.persisted)dispose();};
 windowTarget?.addEventListener('focus',onFocus);windowTarget?.addEventListener('pagehide',onHide);doc.addEventListener?.('visibilitychange',onVisibility);
 function dispose(){if(disposed)return;disposed=true;abort();link.hidden=true;windowTarget?.removeEventListener('focus',onFocus);windowTarget?.removeEventListener('pagehide',onHide);doc.removeEventListener?.('visibilitychange',onVisibility);link.remove();style.remove();}
 return{check,dispose,stats:()=>({requests,inFlight:!!request,ready:!link.hidden,version,latest,disposed})};
}
