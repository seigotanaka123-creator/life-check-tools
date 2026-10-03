// Ephemeral geometry only: never put workY into the saved vehicle records.
const cache=new WeakMap();
export function workVehicleState(f,heightAt=null){
 if(!f?.location||!heightAt)return f;
 const heights=['truck','pump'].map(name=>{const v=f[name],h=heightAt(f.location.x+v.x,f.location.z+v.z);if(!Number.isFinite(h))throw Error('車両の下の地面を確認できません。');return h;});
 let state=cache.get(f);if(!state){state={...f};cache.set(f,state);}Object.assign(state,f);
 for(let i=0;i<2;i++){const name=['truck','pump'][i];state[name]={...f[name],workY:heights[i]};}
 return state;
}
