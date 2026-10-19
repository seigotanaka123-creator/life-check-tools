// Catalog buildings keep one measured, level foundation. Read the actual earth
// column at every two-unit cell crossed by the footprint, not just its corners.
export function inspectBuildingGround(position,size,{heightAt,bounds}={}){
 const fail=issue=>({valid:false,y:null,issue});
 if(!Array.isArray(position)||position.length!==3||!position.every(Number.isFinite)||!Array.isArray(size)||size.length!==3||!size.every(v=>Number.isFinite(v)&&v>0)||typeof heightAt!=='function')return fail('建てる場所を選び直してね。');
 const [x,,z]=position,hx=size[0]/2,hz=size[2]/2;
 if(size[0]>600||size[2]>600||bounds&&(x-hx<bounds.minX||x+hx>bounds.maxX||z-hz<bounds.minZ||z+hz>bounds.maxZ))return fail('現場の内側へ場所を変えよう。');
 const y=heightAt(x,z);
 if(!Number.isFinite(y)||y< -32||y>48)return fail('建物を支えられる地面を選ぼう。');
 const axis=(a,b)=>{const values=[a+.0001,b-.0001];for(let p=Math.floor(a/2)*2+1;p<b;p+=2)if(p>a)values.push(p);return values;};
 let samples=1;
 for(const px of axis(x-hx,x+hx))for(const pz of axis(z-hz,z+hz)){
  const h=heightAt(px,pz);samples++;
  if(!Number.isFinite(h)||Math.abs(h-y)>.001)return fail('建物の下を平らにしよう。穴や段差が残っているよ。');
 }
 return{valid:true,y,issue:'',samples};
}

// The caller resets after a terrain rebuild. Cache only measurements, never
// grants, positions or saves. This avoids scanning a whole foundation per frame.
export function createBuildingGroundProbe(environment){
 const cache=new Map();
 return{reset(){cache.clear();},inspect(position,size){const key=JSON.stringify([position,size]);if(cache.has(key))return cache.get(key);const result=inspectBuildingGround(position,size,environment);if(cache.size>=32)cache.delete(cache.keys().next().value);cache.set(key,result);return result;}};
}

export function constructionBuildingCandidate(player,heading,size,clearance=24){
 const distance=Math.ceil((Math.hypot(size[0],size[2])/2+clearance)/8)*8;
 return[Math.round((player.x+Math.sin(heading)*distance)/8)*8,0,Math.round((player.z+Math.cos(heading)*distance)/8)*8];
}
