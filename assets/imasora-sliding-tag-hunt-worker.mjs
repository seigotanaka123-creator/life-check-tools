import{verifyHunt}from'./imasora-sliding-tag-hunt.mjs';onmessage=e=>{try{postMessage({ok:true,result:verifyHunt(e.data)});}catch(error){postMessage({ok:false,error:error.message});}};
