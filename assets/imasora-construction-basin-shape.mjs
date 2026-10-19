import {planWaterBuild} from './imasora-construction-water-build.mjs?v=120fb';
// Read-only survey of a proposed tooth cut. Every cut column must be open at
// its real surface, shallow, and enclosed below the final lowest spill rim.
export function retainingBasinCut(frame,plan,heightAt){
 if(!frame.soil.field)return false;
 const columns=new Map();
 for(const c of plan.cuts){if(c.from!=='terrain')return false;for(const [x,y,z]of c.positions){const key=x+','+z,col=columns.get(key)??{x:x*2+1,z:z*2+1,ys:[]};col.ys.push(y);columns.set(key,col);}}
 for(const c of columns.values()){c.ys.sort((a,b)=>a-b);c.y=c.ys[0]*2;const top=heightAt(c.x,c.z);if(!Number.isFinite(top)||Math.abs((c.ys.at(-1)+1)*2-top)>.11||top-c.y>8.11||c.ys.some((y,i)=>i&&y!==c.ys[i-1]+1))return false;}
 const sample=(x,z)=>columns.get(Math.floor(x/2)+','+Math.floor(z/2))?.y??heightAt(x,z),remaining=new Map(columns);
 while(remaining.size){const c=remaining.values().next().value,p=planWaterBuild({waterMode:'basin',loader:{vehicle:{...frame.machineVehicle,field:frame.soil.field}}},c,[],sample);if(!p.ok)return false;
  let covered=0;for(const cell of p.build.cells){const key=Math.floor(cell.x/2)+','+Math.floor(cell.z/2),cut=remaining.get(key);if(cut){if(p.build.top<=cut.y+.1)return false;remaining.delete(key);covered++;}}if(!covered)return false;
 }return true;
}
