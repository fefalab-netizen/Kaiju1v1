import * as THREE from 'three';

// Local hand coordinates: fingers +Y, knuckles +Z, palm -Z.
export function createHand(left=false){
 const root=new THREE.Group(),model=new THREE.Group();root.add(model);model.scale.x=left?-1:1;
 const skin=new THREE.MeshStandardMaterial({color:0x477d36,roughness:.92});
 const scales=new THREE.MeshStandardMaterial({color:0x75964b,roughness:.8});
 const claw=new THREE.MeshStandardMaterial({color:0xd8cc98,roughness:.5});
 const sphere=new THREE.SphereGeometry(1,12,8),scaleGeo=new THREE.IcosahedronGeometry(1,0);
 function lump(parent,x,y,z,sx,sy,sz,mat=skin){const m=new THREE.Mesh(sphere,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
 lump(model,0,0,0,.64,.72,.3);lump(model,0,-.64,0,.43,.42,.27);
 // Raised overlapping scales are geometry, visible from either eye and at grazing angles.
 for(let row=0;row<6;row++)for(let col=0;col<5;col++){
  const x=(col-2)*.22+(row%2)*.06,y=-.45+row*.19;
  if((x/.62)**2+(y/.74)**2>1)continue;
  const m=new THREE.Mesh(scaleGeo,scales);m.position.set(x,y,.29*Math.sqrt(Math.max(.1,1-(x/.7)**2)));m.scale.set(.13,.16,.065);model.add(m);
 }
 const joints=[];
 for(let f=0;f<5;f++){
  const thumb=f===4,base=new THREE.Group();base.position.set(thumb?-.57:(f-1.5)*.32,thumb?-.05:.5,0);base.rotation.z=thumb?.95:(1.5-f)*.08;model.add(base);
  let parent=base;const chain=[];
  for(let j=0;j<3;j++){
   const pivot=new THREE.Group();parent.add(pivot);const len=(thumb?.34:[.42,.51,.47,.35][f])*(1-j*.14),radius=(thumb?.2:.17)*(1-j*.17);
   lump(pivot,0,len/2,0,radius,len*.65,radius);lump(pivot,0,0,.04,radius*1.08,radius*.8,radius,scales);
   for(let n=0;n<2;n++){const m=new THREE.Mesh(scaleGeo,scales);m.position.set(0,len*(.25+n*.4),radius*.88);m.scale.set(radius*.9,len*.24,.045);pivot.add(m);}
   chain.push(pivot);parent=new THREE.Group();parent.position.y=len;pivot.add(parent);
   if(j===2){const nail=new THREE.Mesh(new THREE.ConeGeometry(radius*.8,.34,10),claw);nail.position.set(0,.11,-.045);nail.rotation.x=-.35;parent.add(nail);}
  }joints.push({chain,thumb,base});
 }
 let curl=0;
 root.userData.animate=(held,dt)=>{curl+=(Number(held)-curl)*(1-Math.exp(-14*dt));for(const {chain,thumb,base}of joints){chain.forEach((joint,j)=>joint.rotation.x=-(.08+curl*(thumb?.85:[1.05,1.25,.9][j])));if(thumb)base.rotation.z=.95-curl*.35;}};
 root.userData.animate(false,0);return root;
}

export function createBreath(scene){
 const max=420,particles=[],emitters=[];
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#ffffffff');g.addColorStop(.25,'#ffffffdd');g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(max*3),3));geometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(max*3),3));geometry.setDrawRange(0,0);
 const material=new THREE.PointsMaterial({map:new THREE.CanvasTexture(canvas),size:2.1,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
 const cloud=new THREE.Points(geometry,material);cloud.frustumCulled=false;scene.add(cloud);
 const glow=new THREE.PointLight(0xff8a24,0,24,2);scene.add(glow);
 return {
  emit(e){emitters.push({x:e.originX,z:e.originZ,y:9,fx:-Math.sin(e.yaw),fz:-Math.cos(e.yaw),life:.65,carry:0});},
  clear(){particles.length=emitters.length=0;geometry.setDrawRange(0,0);glow.intensity=0;},
  update(dt){
   for(let i=emitters.length-1;i>=0;i--){const e=emitters[i];e.life-=dt;e.carry+=dt*350;while(e.carry>=1&&particles.length<max){e.carry--;const spread=(Math.random()-.5)*.95,speed=24+Math.random()*8;particles.push({x:e.x+e.fx*1.2,y:e.y,z:e.z+e.fz*1.2,vx:(e.fx+e.fz*spread)*speed,vz:(e.fz-e.fx*spread)*speed,vy:-5-Math.random()*5,life:.8+Math.random()*.2,total:1});}glow.position.set(e.x+e.fx*4,7,e.z+e.fz*4);if(e.life<=0)emitters.splice(i,1);}
   for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){particles.splice(i,1);continue;}p.x+=p.vx*dt;p.z+=p.vz*dt;p.y=Math.max(.3,p.y+p.vy*dt);p.vy+=3*dt;}
   const pos=geometry.attributes.position,col=geometry.attributes.color;particles.forEach((p,i)=>{pos.setXYZ(i,p.x,p.y,p.z);col.setXYZ(i,Math.min(1,p.life*3),Math.max(0,p.life*.95-.12),Math.max(0,p.life*.45-.22));});pos.needsUpdate=col.needsUpdate=true;geometry.setDrawRange(0,particles.length);glow.intensity=emitters.length?35:Math.max(0,glow.intensity-dt*70);
  }
 };
}

