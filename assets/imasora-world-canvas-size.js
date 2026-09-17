// The camera and drawing buffer follow the actual 3D area, excluding any dock.
export function observeWorldCanvasSize({canvas,renderer,camera,events=window,Observer=ResizeObserver}){
  let width=0,height=0,disposed=false;
  const resize=()=>{
    if(disposed)return;
    const rect=canvas.getBoundingClientRect(),w=Math.round(rect.width),h=Math.round(rect.height);
    if(w<1||h<1||!Number.isFinite(w)||!Number.isFinite(h)||(w===width&&h===height))return;
    width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  };
  const observer=new Observer(resize);observer.observe(canvas);
  events.addEventListener('resize',resize);resize();
  return ()=>{disposed=true;observer.disconnect();events.removeEventListener('resize',resize);};
}
