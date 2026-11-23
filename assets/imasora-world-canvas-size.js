// The camera and drawing buffer follow the actual 3D area, excluding any dock.
export function observeWorldCanvasSize({canvas,renderer,camera,events=window,Observer=ResizeObserver,layoutBox=()=>false}){
  let width=0,height=0,disposed=false;
  const resize=entries=>{
    if(disposed)return;
    // Boarding changes the dock and other controls in the same frame. The
    // untransformed transport canvas can use the layout already measured by
    // ResizeObserver without asking the browser to lay out the page again.
    const border=layoutBox()&&entries?.find?.(entry=>entry.target===canvas)?.borderBoxSize?.[0];
    const rect=border?{width:border.inlineSize,height:border.blockSize}:canvas.getBoundingClientRect();
    const w=Math.round(rect.width),h=Math.round(rect.height);
    if(w<1||h<1||!Number.isFinite(w)||!Number.isFinite(h)||(w===width&&h===height))return;
    width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  };
  const observer=new Observer(resize);observer.observe(canvas);
  events.addEventListener('resize',resize);resize();
  return ()=>{disposed=true;observer.disconnect();events.removeEventListener('resize',resize);};
}
