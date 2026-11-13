import * as T from './three.module.min.js';

export function huntRearMirrorActive(state){
 return state.phase==='playing'&&state.config.mode==='escape'&&(state.player.effects.mirror??0)>state.time;
}

// Draw a small, mirrored view with the same world and occlusion as the main camera.
export function createHuntRearMirror(renderer,scene,{withoutLabels=draw=>draw()}={}){
 const frame=document.createElement('div');
 frame.className='tag-rear-mirror';
 frame.hidden=true;
 frame.setAttribute('role','img');
 frame.setAttribute('aria-label','うしろ見ミラー。逃走者の後方映像');
 document.body.append(frame);

 const rearCamera=new T.PerspectiveCamera(27,3.1,.2,900);
 const viewport=new T.Vector4(),canvasSize=new T.Vector2();
 let target,overlay,lastFrame=-Infinity,bounds;
 function prepare(){
  target=new T.WebGLRenderTarget(1,1,{depthBuffer:true,stencilBuffer:false});
  overlay=new T.Scene();
  const material=new T.ShaderMaterial({
   uniforms:{image:{value:target.texture},size:{value:new T.Vector2()}},
   depthTest:false,depthWrite:false,
   vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
   fragmentShader:`
    varying vec2 vUv;
    uniform sampler2D image;
    uniform vec2 size;
    void main(){
     vec2 halfSize=size*.5;
     vec2 edge=abs((vUv-.5)*size)-halfSize+12.;
     float rim=length(max(edge,0.))+min(max(edge.x,edge.y),0.)-12.;
     if(rim>0.)discard;
     vec3 reflected=texture2D(image,vec2(1.-vUv.x,vUv.y)).rgb;
     vec3 housing=mix(vec3(.016,.036,.055),vec3(.20,.29,.35),vUv.y);
     gl_FragColor=vec4(mix(reflected,housing,smoothstep(-5.,-3.,rim)),1.);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }`
  });
  const quad=new T.Mesh(new T.PlaneGeometry(2,2),material);
  quad.frustumCulled=false;
  overlay.add(quad);
 }
 function layout(){
  const rect=frame.getBoundingClientRect();
  const {width:w,height:h}=rect;
  if(w<1||h<1)return false;
  bounds={x:rect.left,y:renderer.getSize(canvasSize).y-rect.bottom,w,h};
  // Match the displayed drawing-buffer size, within the original cost ceiling.
  const ratio=Math.min(renderer.getPixelRatio(),360/w,116/h);
  target.setSize(Math.min(360,Math.ceil(w*ratio)),Math.min(116,Math.ceil(h*ratio)));
  rearCamera.aspect=w/h;
  rearCamera.updateProjectionMatrix();
  overlay.children[0].material.uniforms.size.value.set(w,h);
  lastFrame=-Infinity;
  return true;
 }
 function hide(){
  if(!frame.hidden)frame.hidden=true;
  bounds=null;
 }
 return{
  hide,
  invalidate(){bounds=null;lastFrame=-Infinity;},
  draw(now,runner,avatar,shadow,{refresh=false,renderView=(_camera,draw)=>draw()}={}){
   if(!target)prepare();
   if(frame.hidden)frame.hidden=false;
   if(!bounds&&!layout())return;
   const {x,y,w,h}=bounds;
   const autoClear=renderer.autoClear,autoReset=renderer.info.autoReset;
   renderer.getViewport(viewport);
   try{
    if(refresh||now-lastFrame>=50){
     rearCamera.position.set(runner.x,runner.y+5.8,runner.z);
     rearCamera.lookAt(runner.x-Math.sin(runner.yaw)*40,runner.y+2.8,runner.z-Math.cos(runner.yaw)*40);
     const avatarVisible=avatar.visible,shadowVisible=shadow.visible;
     avatar.visible=shadow.visible=false;
     try{
      renderer.setRenderTarget(target);
      renderer.autoClear=true;
      withoutLabels(()=>renderView(rearCamera,()=>renderer.render(scene,rearCamera)));
      lastFrame=now;
     }finally{
      renderer.setRenderTarget(null);
      avatar.visible=avatarVisible;
      shadow.visible=shadowVisible;
     }
    }
    renderer.setViewport(x,y,w,h);
    renderer.autoClear=false;
    renderer.info.autoReset=false;
    renderer.render(overlay,rearCamera);
   }finally{
    renderer.setViewport(viewport);
    renderer.autoClear=autoClear;
    renderer.info.autoReset=autoReset;
   }
  }
 };
}
