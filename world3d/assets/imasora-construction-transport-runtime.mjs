import {WorldTransportWorkSession} from './imasora-construction-transport-work-session.mjs';

// Reading a saved work record must never allocate soil, upgrade old quantities,
// resume motion, or move the host character. Those are separate player actions.
export async function openSavedTransportWork({service,snapshot,session=null}){
 const record=service.constructionTransport;
 if(!record){if(session)throw Error('現場の記録が変わりました。保存を確認してください。');return null;}
 if(record.version!==2)throw Error('この現場の作業を読み取れませんでした。記録は保持しています。');
 if(session){
  if(session.service!==service||session.busy||session.intent||!session.state)throw Error('現場の保存結果を確認してから開いてください。');
  return session;
 }
 const saved=new WorldTransportWorkSession({service,snapshot});await saved.open();return saved;
}
