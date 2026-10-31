import * as T from './three.module.min.js';
// A light-weight display transform for the adventure maps and the construction site. It preserves
// saved surface colours and runs in existing material shaders, without a pass.
export const WORLD_COLOUR_STRENGTH=Object.freeze({coast:.95,sky:.85,space:1,mars:.9,construction:.85});
const original='vec3 CustomToneMapping( vec3 color ) { return color; }';
const transform=`vec3 CustomToneMapping(vec3 color){
 float amount=clamp(toneMappingExposure,0.,1.);
 if(amount<=0.)return color;
 vec3 source=max(color,vec3(0.));float y=dot(source,vec3(.2126,.7152,.0722));
 float softY=y<=.65?y:.65+.35*(1.-exp(-(y-.65)/.35));
 vec3 mapped=source*(y>.00001?softY/y:1.);
 float chroma=max(mapped.r,max(mapped.g,mapped.b))-min(mapped.r,min(mapped.g,mapped.b));
 float vibrance=1.+.26*(1.-smoothstep(.2,.85,chroma));
 float gray=dot(mapped,vec3(.2126,.7152,.0722));
 mapped=max(vec3(0.),mix(vec3(gray),mapped,vibrance));
 mapped=max(vec3(0.),(mapped-vec3(.18))*1.06+vec3(.18));
 float peak=max(mapped.r,max(mapped.g,mapped.b));mapped/=max(1.,peak);
 return mix(source,mapped,amount);
}`;
export function installWorldColour(renderer){
 const chunk=T.ShaderChunk.tonemapping_pars_fragment;
 if(chunk.includes(original))T.ShaderChunk.tonemapping_pars_fragment=chunk.replace(original,transform);
 else if(!chunk.includes(transform))throw Error('Colour transform already customized');
 renderer.toneMapping=T.CustomToneMapping;renderer.toneMappingExposure=0;
 return map=>{renderer.toneMappingExposure=WORLD_COLOUR_STRENGTH[map]??0;};
}
