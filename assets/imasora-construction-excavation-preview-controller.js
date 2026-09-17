// Forecasts never write to the work state. Reuse only idle workers; running
// obsolete calculations are terminated instead of queuing more simulations.
const signature=s=>[s.terrain,s.cutMask,s.spoil,s.falling,s.revision,s.serial,s.total,s.load,s.bin,s.bucketStyle,s.digMode,s.example,s.positionedRow,s.travel,
  s.arm.boom,s.arm.stick,s.arm.curl,s.arm.slew,s.loader.mode,s.loader.vehicle.x,s.loader.vehicle.z,s.loader.vehicle.heading,s.loader.vehicle.speed];
const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>v===b[i]);
export function createExcavationPreviewController({createWorker,onChange,setTimer=setTimeout,clearTimer=clearTimeout,now=()=>performance.now(),delay=50,timeout=5000}){
  let enabled=true,disposed=false,key=null,worker=null,scheduled=null,deadline=null,generation=0,request=null,busy=false,cached=null,state={status:'idle',result:null,elapsedMs:null};
  function emit(status,result=null,elapsedMs=null){if(state.status===status&&state.result===result)return;state={status,result,elapsedMs};onChange(state);}
  function cancel(releaseWorker=false){
    generation++;if(scheduled!==null)clearTimer(scheduled);if(deadline!==null)clearTimer(deadline);scheduled=deadline=null;
    if(busy||releaseWorker){worker?.terminate();worker=null;}busy=false;request=null;
  }
  function invalidate(releaseWorker=false){cancel(releaseWorker);key=null;emit('idle');}
  function release(){invalidate(true);cached=null;}
  function getWorker(){
    if(worker)return worker;
    const w=createWorker();worker=w;
    w.onerror=()=>{if(worker!==w)return;const affected=!!request;cancel(true);if(affected)emit('error');};
    w.onmessage=({data})=>{
      if(worker!==w||!busy||!request||data?.id!==request.id)return;
      if(data.error||!data.result||data.result.kind!==request.kind||!['ready','partial','unavailable'].includes(data.result.status)){w.onerror();return;}
      const elapsedMs=Math.max(0,now()-request.started);if(deadline!==null)clearTimer(deadline);deadline=null;busy=false;request=null;
      cached=data.result.status==='ready'?{key,result:data.result}:null;
      emit(data.result.status,data.result,elapsedMs);
    };
    return w;
  }
  return{
    get enabled(){return enabled;},get state(){return state;},invalidate,release,
    setEnabled(value){enabled=!!value;invalidate(!enabled);},
    update(work,available){
      if(disposed)return;
      if(!enabled||!available){if(key||worker||scheduled!==null)invalidate();return;}
      const next=signature(work);if(same(key,next))return;
      cancel();key=next;
      if(cached&&same(cached.key,key)){emit(cached.result.status,cached.result,0);return;}
      const id=generation,kind=work.load?'dump':'scoop';request={id,kind,started:now()};emit('calculating');
      try{
        // Load the worker's modules during the short input-settling delay.
        const w=getWorker();
        scheduled=setTimer(()=>{
          scheduled=null;if(disposed||id!==generation||worker!==w)return;
          try{
            busy=true;
            deadline=setTimer(()=>{if(id===generation&&worker===w)w.onerror();},timeout);
            w.postMessage({id,kind,work});
          }catch{w.onerror();}
        },delay);
      }catch{cancel(true);emit('error');}
    },
    dispose(){disposed=true;release();}
  };
}
