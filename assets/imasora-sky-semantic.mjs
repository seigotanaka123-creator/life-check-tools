import {skyCandidate} from './imasora-sky-candidate.mjs?v=120qh';
export const SKY_SEGMENT_SIZE=193,SKY_SEGMENT_CLASS=3;
export function prepareSkyTensor(frame,size=SKY_SEGMENT_SIZE){
 const {width:w,height:h,data}=frame??{};if(!Number.isInteger(w)||!Number.isInteger(h)||w<16||h<16||w*h>19200||!(data instanceof Uint8ClampedArray)||data.length!==w*h*4||![129,193,257].includes(size))throw Error('FRAME_UNREADABLE');
 const scale=Math.min(size/w,size/h),width=Math.max(1,Math.round(w*scale)),height=Math.max(1,Math.round(h*scale)),x=Math.floor((size-width)/2),y=Math.floor((size-height)/2),pixels=new Int32Array(size*size*3);pixels.fill(128);
 for(let row=0;row<height;row++)for(let col=0;col<width;col++){const fx=Math.max(0,Math.min(w-1,(col+.5)*w/width-.5)),fy=Math.max(0,Math.min(h-1,(row+.5)*h/height-.5)),ix=Math.floor(fx),iy=Math.floor(fy),ax=fx-ix,ay=fy-iy,target=((row+y)*size+col+x)*3;for(let c=0;c<3;c++){const a=data[(iy*w+ix)*4+c],b=data[(iy*w+Math.min(ix+1,w-1))*4+c],d=data[(Math.min(iy+1,h-1)*w+ix)*4+c],e=data[(Math.min(iy+1,h-1)*w+Math.min(ix+1,w-1))*4+c];pixels[target+c]=Math.round((a*(1-ax)+b*ax)*(1-ay)+(d*(1-ax)+e*ax)*ay);}}
 return{pixels,rect:{x,y,width,height},size};
}
export function skyMaskFromLabels(frame,labels,prepared){
 const {size,rect}=prepared;if((!(labels instanceof Int32Array)&&!(labels instanceof Float32Array))||labels.length!==size*size||labels.some(v=>!Number.isInteger(v)||v<0||v>150))throw Error('MASK_UNREADABLE');const mask=new Uint8Array(frame.width*frame.height);
 for(let y=0;y<frame.height;y++)for(let x=0;x<frame.width;x++){const col=Math.min(size-1,rect.x+Math.floor((x+.5)*rect.width/frame.width)),row=Math.min(size-1,rect.y+Math.floor((y+.5)*rect.height/frame.height));mask[y*frame.width+x]=+(labels[row*size+col]===SKY_SEGMENT_CLASS);}return mask;
}
export function createSkySegmenter({tf,loadModel,size=SKY_SEGMENT_SIZE}){
 let loading=null,disposed=false,closing=null;async function prepare(){if(disposed)throw Error('SEGMENTER_CLOSED');if(!loading)loading=Promise.resolve().then(loadModel);return loading;}
 async function recognize(frame){if(disposed)return{verified:false,reason:'cancelled'};let packed,input,prediction,labels,mask;try{const quick=skyCandidate(frame);if(['dark','flat','glare','incomplete'].includes(quick.reason))return quick;const model=await prepare();if(disposed||frame.signal?.aborted)return{verified:false,reason:'cancelled'};packed=prepareSkyTensor(frame,size);input=tf.tensor4d(packed.pixels,[1,size,size,3],'int32');prediction=model.execute(input);if(Array.isArray(prediction)||prediction.shape?.join(',')!==`1,${size},${size}`)throw Error('MASK_UNREADABLE');labels=await prediction.data();if(disposed||frame.signal?.aborted)return{verified:false,reason:'cancelled'};mask=skyMaskFromLabels(frame,labels,packed);const result=skyCandidate(frame,{mask});return{...result,providerId:'local-deeplab-candidate',providerVersion:`ade20k-q1-${size}-v1`,skyFraction:mask.reduce((a,b)=>a+b,0)/mask.length};}finally{packed?.pixels.fill(0);labels?.fill(0);mask?.fill(0);if(Array.isArray(prediction)){for(const output of prediction)output?.dispose?.();}else prediction?.dispose?.();input?.dispose?.();}}
 return Object.freeze({prepare,recognize,dispose(){disposed=true;return closing??=(async()=>{if(loading)try{(await loading).dispose();}catch{}})();}});
}

export function createAdaptiveSkySegmenter({tf,loadAssets,loadModel,createSegmenter=createSkySegmenter}){
 let assets=null,current=null,currentSize=0,disposed=false,closing=null;
 async function prepare(){if(disposed)throw Error('SEGMENTER_CLOSED');if(!assets){const pending=Promise.resolve().then(loadAssets);assets=pending;pending.catch(()=>{if(assets===pending)assets=null;});}return assets;}
 async function recognize(frame){if(disposed)return{verified:false,reason:'cancelled'};const quick=skyCandidate(frame);if(['dark','flat','glare','incomplete'].includes(quick.reason))return quick;const size=quick.candidate?.skyId==='cloud'?129:193,loaded=await prepare();if(disposed||frame.signal?.aborted)return{verified:false,reason:'cancelled'};if(currentSize!==size){await current?.dispose();if(disposed||frame.signal?.aborted)return{verified:false,reason:'cancelled'};current=createSegmenter({tf,size,loadModel:()=>loadModel(size,loaded)});currentSize=size;}const own=current;try{return{...await own.recognize(frame),analysisSize:size};}catch(error){await own.dispose();if(current===own){current=null;currentSize=0;}throw error;}}
 return Object.freeze({prepare,recognize,dispose(){disposed=true;return closing??=(async()=>{await current?.dispose();current=null;assets=null;})();}});
}

// Comparison-only route matching DeepLab's public toInputTensor geometry.
// The previous padded route above stays available for reproducible comparisons.
// Exposure correction affects segmentation input only; colour descriptions still
// use the original pixels, and neither route is recognition authority.
export function prepareSdkSkyPixels(frame,size=SKY_SEGMENT_SIZE){
 const {width:w,height:h,data}=frame??{};
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<16||h<16||w*h>19200||!(data instanceof Uint8ClampedArray)||data.length!==w*h*4||![129,193,257].includes(size))throw Error('FRAME_UNREADABLE');
 const histogram=new Uint32Array(256),count=w*h;
 for(let i=0;i<data.length;i+=4)histogram[Math.max(data[i],data[i+1],data[i+2])]++;
 let seen=0,high=255;
 for(let i=0;i<256;i++){seen+=histogram[i];if(seen>=count*.95){high=i;break;}}
 const gain=Math.max(.75,Math.min(1.8,224/Math.max(1,high))),pixels=new Int32Array(count*3);
 for(let i=0;i<count;i++)for(let c=0;c<3;c++)pixels[i*3+c]=Math.round(Math.min(255,data[i*4+c]*gain));
 return{pixels,gain,width:Math.max(1,Math.round(w*size/Math.max(w,h))),height:Math.max(1,Math.round(h*size/Math.max(w,h)))};
}
export function skyMaskFromImageLabels(frame,labels,{width,height}){
 const {width:w,height:h}=frame??{};if(!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w<16||h<16||w*h>19200)throw Error('FRAME_UNREADABLE');
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>257||height>257||(!(labels instanceof Int32Array)&&!(labels instanceof Float32Array))||labels.length!==width*height||labels.some(v=>!Number.isInteger(v)||v<0||v>150))throw Error('MASK_UNREADABLE');
 const mask=new Uint8Array(frame.width*frame.height);
 for(let y=0;y<frame.height;y++)for(let x=0;x<frame.width;x++)mask[y*frame.width+x]=+(labels[Math.min(height-1,Math.floor((y+.5)*height/frame.height))*width+Math.min(width-1,Math.floor((x+.5)*width/frame.width))]===SKY_SEGMENT_CLASS);
 return mask;
}
export function createSdkSkySegmenter({tf,loadModel,size=SKY_SEGMENT_SIZE}){
 let loading=null,disposed=false,closing=null;
 async function prepare(){
  if(disposed)throw Error('SEGMENTER_CLOSED');
  if(!loading){const pending=Promise.resolve().then(loadModel);loading=pending;pending.catch(()=>{if(loading===pending)loading=null;});}
  return loading;
 }
 async function recognize(frame){
  if(disposed||frame?.signal?.aborted)return{verified:false,reason:'cancelled'};
  let packed,input,prediction,labels,mask;
  try{
   const quick=skyCandidate(frame);if(['dark','flat','glare','incomplete'].includes(quick.reason))return quick;
   const model=await prepare();if(disposed||frame.signal?.aborted)return{verified:false,reason:'cancelled'};
   packed=prepareSdkSkyPixels(frame,size);
   input=tf.tidy(()=>tf.image.resizeBilinear(tf.tensor4d(packed.pixels,[1,frame.height,frame.width,3],'int32'),[packed.height,packed.width]).cast('int32'));
   prediction=model.execute(input);
   if(Array.isArray(prediction)||prediction.shape?.join(',')!==`1,${packed.height},${packed.width}`)throw Error('MASK_UNREADABLE');
   labels=await prediction.data();if(disposed||frame.signal?.aborted)return{verified:false,reason:'cancelled'};
   mask=skyMaskFromImageLabels(frame,labels,packed);
   return{...skyCandidate(frame,{mask}),providerId:'local-deeplab-candidate',providerVersion:`ade20k-sdk-balanced-${size}-v1`,skyFraction:mask.reduce((a,b)=>a+b,0)/mask.length};
  }finally{
   packed?.pixels.fill(0);labels?.fill(0);mask?.fill(0);
   if(Array.isArray(prediction)){for(const output of prediction)output?.dispose?.();}else prediction?.dispose?.();input?.dispose?.();
  }
 }
 return Object.freeze({prepare,recognize,dispose(){disposed=true;return closing??=(async()=>{if(loading)try{(await loading).dispose();}catch{}})();}});
}
