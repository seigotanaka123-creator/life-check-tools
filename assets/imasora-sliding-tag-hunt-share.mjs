import{huntResultSummary}from'./imasora-sliding-tag-hunt-results.mjs';
// Whitelist game facts. Never copy a home save, nickname, location, URL or ID
// from the current browser into a public record image.
export function huntRecordMetadata(data,{characters=[],areas=[],items={}}={}){
 const m=huntResultSummary(data);if(!m)return null;const c=data.config;
 return Object.freeze({ticket:m.ticket,title:m.title,time:m.time,label:m.label,mode:m.mode,area:areas.find(a=>a.id===c.startKey)?.name??'フィールド',tool:items[c.mode==='hunt'?c.hunterItem:c.playerItem]?.name??'道具は現地でひろう',opponents:Object.freeze((Array.isArray(c.opponents)?c.opponents:[]).slice(0,3).map(id=>characters.find(a=>a.id===id)?.name??'モンスター'))});
}
export function drawHuntRecordCard(meta,frame,{createCanvas=()=>document.createElement('canvas')}={}){
 if(!meta||!frame||!(frame.width>0&&frame.height>0))throw Error('INVALID_RECORD_IMAGE');const canvas=createCanvas();canvas.width=960;canvas.height=540;const c=canvas.getContext('2d');
 const gradient=c.createLinearGradient(0,0,960,540);gradient.addColorStop(0,'#fff4db');gradient.addColorStop(1,'#dceffa');c.fillStyle=gradient;c.fillRect(0,0,960,540);
 c.fillStyle='#315b70';c.font='bold 26px system-ui';c.fillText('イマソラーズウォーク',28,39);c.font='bold 17px system-ui';c.fillText('鬼ごっこ · 練習記録',700,38);
 c.save();c.beginPath();c.roundRect(24,62,548,444,24);c.clip();const scale=Math.max(548/frame.width,444/frame.height);c.drawImage(frame,24+(548-frame.width*scale)/2,62+(444-frame.height*scale)/2,frame.width*scale,frame.height*scale);c.restore();
 c.strokeStyle='#ffffff';c.lineWidth=4;c.beginPath();c.roundRect(24,62,548,444,24);c.stroke();c.fillStyle='#ffffffdf';c.beginPath();c.roundRect(594,62,342,444,24);c.fill();
 function text(value,x,y,size=18,color='#315b70'){c.fillStyle=color;c.font='bold '+size+'px system-ui';let s=String(value);while(c.measureText(s).width>292&&size>14){size--;c.font='bold '+size+'px system-ui';}c.fillText(s,x,y);}
 text(meta.title,616,106,28);text(meta.time,616,181,64,'#b86b7a');text('秒',858,180,22);text(meta.label,616,211,17);text((meta.mode==='hunt'?'鬼になる':'にげる')+'  /  '+meta.area,616,253,18);text(meta.tool,616,282,17);
 meta.opponents.forEach((name,i)=>{text((meta.mode==='hunt'&&i===0?'逃げ役':['追跡役','先回り役','巡回役'][i]),616,324+i*54,13,'#668793');text(name,616,347+i*54,17);});text('#イマソラーズウォーク',28,530,16);return canvas;
}
export function createHuntRecordShare({nav=globalThis.navigator,urlApi=URL,makeFile=(blob,name)=>typeof File==='function'?new File([blob],name,{type:'image/png'}):null,onChange=()=>{}}={}){
 let generation=0,current=null;const canShare=file=>{try{return!!file&&typeof nav?.share==='function'&&!!nav?.canShare?.({files:[file]});}catch{return false;}};
 const snapshot=()=>({ticket:current?.ticket??null,status:current?.status??'idle',action:current?.share?'share':'download',notice:current?.notice??''}),emit=()=>onChange(snapshot());
 function reset(){generation++;if(current?.url)try{urlApi.revokeObjectURL(current.url);}catch{}current=null;emit();}
 function prepare(ticket,createBlob){reset();if(!Number.isSafeInteger(ticket)||ticket<1)return Promise.resolve(false);const token=generation;current={ticket,status:'preparing',notice:''};emit();let work;try{work=createBlob();}catch{work=Promise.reject(Error('CAPTURE_FAILED'));}
  return Promise.resolve(work).then(blob=>{if(token!==generation)return false;if(!blob||blob.type!=='image/png'||!Number.isFinite(blob.size)||blob.size<=0||blob.size>6*1024*1024)throw Error('INVALID_PNG');const name='imasora-tag-'+ticket+'.png',file=makeFile(blob,name),url=urlApi.createObjectURL(blob);current={ticket,status:'ready',notice:'',name,file,url,share:canShare(file)};emit();return true;}).catch(()=>{if(token!==generation)return false;current={ticket,status:'failed',notice:'画像を用意できませんでした'};emit();return false;});
 }
 async function activate(download){if(current?.status!=='ready')return false;const row=current,token=generation;row.status='busy';row.notice='';emit();try{
   if(row.share){await nav.share({files:[row.file],title:'イマソラーズウォーク',text:'#イマソラーズウォーク #鬼ごっこ'});if(token===generation)row.notice='共有先へ渡しました';}
   else{download(row.url,row.name);if(token===generation)row.notice='画像の保存を開始しました';}return true;
  }catch(error){if(token===generation&&error?.name!=='AbortError'){row.share=false;row.notice='画像の保存に切り替えました';}return false;
  }finally{if(token===generation){row.status='ready';emit();}}
 }
 return{prepare,activate,reset,snapshot};
}
