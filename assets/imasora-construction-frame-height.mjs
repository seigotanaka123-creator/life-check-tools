import {vehicleGroundFrame} from './imasora-construction-vehicle-ground-frame.mjs?v=120el';
// Heights are always fresh each update. Complete vehicle poses can survive an
// update only when the caller publishes an unchanged terrain/read-context key.
export function createFrameHeightSampler(read){
 const samples=new Map(),frames=new Map();let frameRevision;
 const heightAt=(x,z)=>{const key=x+','+z;if(samples.has(key))return samples.get(key);const h=read(x,z);if(samples.size<8192)samples.set(key,h);return h;};
 heightAt.groundFrame=(v,options={})=>{const key=[v.x,v.z,v.heading,v.steering??0,options.tracked??false,options.maxDegrees??8].join(',');if(frames.has(key))return frames.get(key);const g=vehicleGroundFrame(v,heightAt,options);if(frames.size<128)frames.set(key,g);return g;};
 return{reset(revision){samples.clear();heightAt.revision=revision;if(revision===undefined||!Object.is(revision,frameRevision))frames.clear();frameRevision=revision;},heightAt};
}
