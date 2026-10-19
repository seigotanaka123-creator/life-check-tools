const scope='imasora-material-delivery-v1';
export function materialSourceUrl(moduleUrl=import.meta.url,requested=null){
 const page=new URL(moduleUrl),url=new URL('../construction-material-delivery.html',page);
 if(url.pathname.includes('/world3d/'))url.pathname=url.pathname.replace('/world3d/','/');
 if(['127.0.0.1','localhost'].includes(url.hostname)&&url.port==='8877')url.port='8765';
 if(!requested)return url;
 const source=new URL(requested,page),sameOrigin=source.origin===page.origin;
 const local=['127.0.0.1','localhost'].includes(page.hostname)&&page.protocol==='http:'&&source.protocol==='http:'&&source.hostname===page.hostname&&['8765','8766'].includes(source.port);
 if((!sameOrigin&&!local)||source.pathname!==url.pathname||source.username||source.password||source.search||source.hash)throw Error('街から工事現場へ入り直してください。建材の保存先を確認できません。');
 return source;
}
export function createMaterialSourceClient(){
 const nonce=crypto.randomUUID().replaceAll('-',''),url=materialSourceUrl(import.meta.url,new URL(window.location.href).searchParams.get('materialHome')); url.searchParams.set('nonce',nonce);
 const frame=document.createElement('iframe');frame.title='街の建材の受渡し';frame.hidden=true;frame.src=url.href;
 let next=0,ready=false,disposed=false;const jobs=new Map();
 function receive(event){const m=event.data;if(event.source!==frame.contentWindow||event.origin!==url.origin||m?.scope!==scope||m.nonce!==nonce)return;if(m.ready){ready=true;for(const j of jobs.values())send(j);return;}const j=jobs.get(m.id);if(!j)return;clearTimeout(j.timer);jobs.delete(m.id);m.error?j.reject(Error(m.error)):j.resolve(m.data);}
 function send(j){if(j.sent||!ready)return;j.sent=true;frame.contentWindow.postMessage({...j.message,scope,nonce,id:j.id},url.origin);}
 window.addEventListener('message',receive);document.body.append(frame);
 function request(message){if(disposed)return Promise.reject(Error('受取画面を開き直してください。'));return new Promise((resolve,reject)=>{const id=++next,j={id,message,resolve,reject,sent:false};j.timer=setTimeout(()=>{jobs.delete(id);reject(Error('街の建材に接続できません。街の工房を開いてから、もう一度たしかめてください。'));},10000);jobs.set(id,j);send(j);});}
 return {preview:profileId=>request({action:'preview',profileId}),take:(profileId,openingReceipts)=>request({action:'take',profileId,openingReceipts,eventId:'direct-'+crypto.randomUUID().replaceAll('-','')}),dispose(){disposed=true;window.removeEventListener('message',receive);frame.remove();for(const j of jobs.values()){clearTimeout(j.timer);j.reject(Error('受取画面を閉じました。'));}jobs.clear();}};
}
