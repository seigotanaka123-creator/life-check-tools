import*as T from'./three.module.min.js';
// Fit crosses to the same real eyes used for the glasses. Stars stay above
// the normalized character height, without changing the body/contact volume.
export function createHuntDizzyView({model,root,eyeFit,eyes=[]}){
 const original=eyes.map(e=>e.visible),crossMaterial=new T.MeshBasicMaterial({color:0x183447}),crossGeometry=new T.BoxGeometry(1,1,1),crosses=new T.InstancedMesh(crossGeometry,crossMaterial,4),matrix=new T.Matrix4(),q=new T.Quaternion(),scale=new T.Vector3(),p=new T.Vector3(),zAxis=new T.Vector3(0,0,1),yAxis=new T.Vector3(0,1,0);
 crosses.name='hunt-dizzy-cross-eyes';crosses.frustumCulled=false;crosses.visible=false;let n=0;
 for(const fit of eyeFit)for(const sign of[-1,1]){const width=Math.max(.04,fit.width*.74),height=Math.max(.04,fit.height*.78),length=Math.hypot(width,height),depth=Math.max(.015,fit.depth*.6);p.set(fit.x,fit.y,fit.eyeFront+depth);q.setFromAxisAngle(zAxis,sign*Math.atan2(height,width));scale.set(length,Math.max(.015,Math.min(width,height)*.18),depth);matrix.compose(p,q,scale);crosses.setMatrixAt(n++,matrix);}crosses.count=n;model.add(crosses);
 const shape=new T.Shape();for(let i=0;i<10;i++){const angle=Math.PI/2+i*Math.PI/5,r=i%2?.43:1;const x=Math.cos(angle)*r,y=Math.sin(angle)*r;if(!i)shape.moveTo(x,y);else shape.lineTo(x,y);}shape.closePath();const geometry=new T.ShapeGeometry(shape),material=new T.MeshBasicMaterial({color:0xffdc65,side:T.DoubleSide}),stars=new T.InstancedMesh(geometry,material,3);stars.name='hunt-dizzy-head-stars';stars.frustumCulled=false;stars.visible=false;stars.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(stars);for(const mesh of[crosses,stars]){const release=()=>{mesh.geometry.removeEventListener('dispose',release);mesh.dispose();};mesh.geometry.addEventListener('dispose',release);}let active=false,crossed=false,writes=0;
 function setCross(value){if(value===crossed)return;crossed=value;crosses.visible=value;for(let i=0;i<eyes.length;i++)eyes[i].visible=value?false:original[i];}
 function reset(){active=false;stars.visible=false;setCross(false);}
 return{stars,crosses,update({time,until=0,sunglasses=false,radius=2.7}){active=until>time;stars.visible=active;setCross(active&&!sunglasses);if(!active)return;
  const orbit=Math.max(1,Math.min(2.8,radius*.65));for(let i=0;i<3;i++){const a=time*4.4+i*Math.PI*2/3;p.set(Math.cos(a)*orbit,6.1+Math.sin(a*2)*.15,Math.sin(a)*orbit);q.setFromAxisAngle(yAxis,-a);scale.setScalar(.34);matrix.compose(p,q,scale);stars.setMatrixAt(i,matrix);writes++;}stars.instanceMatrix.needsUpdate=true;
 },reset,stats:()=>({active,stars:active?3:0,crosses:crossed?crosses.count/2:0,matrixWrites:writes})};
}
