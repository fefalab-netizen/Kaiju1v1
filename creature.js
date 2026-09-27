import * as THREE from 'three';

// Irregular charcoal bands follow the mesh, including animated fingers and arms.
// Vertex colors keep these markings in the existing draw calls.
function stripedGeometry(geometry){
 const positions=geometry.attributes.position,colors=new Float32Array(positions.count*3);
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
  const wave=Math.sin(y*17+Math.sin(Math.atan2(z,x)*3)*.85+x*.5);
  const shade=wave>.55?.12:wave>.25?.4:1;
  colors[i*3]=shade;colors[i*3+1]=shade;colors[i*3+2]=shade;
 }
 geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));return geometry;
}

// Local hand coordinates: fingers +Y, knuckles +Z, palm -Z.
export function createHand(left=false){
 const root=new THREE.Group(),model=new THREE.Group();root.add(model);model.scale.x=left?-1:1;
 const skin=new THREE.MeshStandardMaterial({color:0x24472a,roughness:.92,vertexColors:true});
 const scales=new THREE.MeshStandardMaterial({color:0x3b6237,roughness:.85});
 const claw=new THREE.MeshStandardMaterial({color:0x85836d,roughness:.5});
 const sphere=stripedGeometry(new THREE.SphereGeometry(1,16,16)),scaleGeo=new THREE.IcosahedronGeometry(1,0);
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

// Cosmetic embodiment only: controller poses sent to the server stay untouched.
export function createBody(rig){
 const root=new THREE.Group();rig.add(root);
 const skin=new THREE.MeshStandardMaterial({color:0x24472a,roughness:.92,vertexColors:true});
 const belly=new THREE.MeshStandardMaterial({color:0x415538,roughness:1});
 const armor=new THREE.MeshStandardMaterial({color:0x101b16,roughness:.9});
 const geo=stripedGeometry(new THREE.SphereGeometry(1,16,16)),boneGeo=stripedGeometry(new THREE.CylinderGeometry(1,1,1,12,16));
 const up=new THREE.Vector3(0,1,0),delta=new THREE.Vector3(),wrist=new THREE.Vector3();
 function lump(parent,x,y,z,sx,sy,sz,mat=skin){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
 const torso=new THREE.Group();root.add(torso);
 lump(torso,0,-3.3,.9,1.7,2.3,1.05);
 for(let i=0;i<5;i++)lump(torso,0,-1.8-i*.63,-.04,1.13-i*.05,.35,.22,belly);
 for(let i=0;i<5;i++)lump(torso,0,-1.7-i*.7,1.9,.3,.45,.35,armor);
 const feet=[],arms=[];
 for(let i=0;i<2;i++){
  const side=i===0?-1:1;
  lump(root,side*.85,-5.7,.8,.7,1.45,.65);
  const foot=new THREE.Group();foot.position.set(side*.85,-7.55,.1);root.add(foot);feet.push(foot);
  lump(foot,0,0,-.3,.75,.4,1.1);for(let j=0;j<3;j++)lump(foot,(j-1)*.4,-.05,-1.2,.16,.16,.35,belly);
  const group=new THREE.Group();root.add(group);
  const shoulder=lump(group,0,0,0,.66,.7,.66),elbow=lump(group,0,0,0,.48,.48,.48);
  const upper=new THREE.Mesh(boneGeo,skin),lower=new THREE.Mesh(boneGeo,skin);group.add(upper,lower);
  arms.push({group,shoulder,elbow,upper,lower});
 }
 let phase=0,lastX=null,lastZ=null,footIndex=0,stepDistance=0,walkSpeed=0;
 function segment(mesh,a,b,radius){delta.subVectors(b,a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(radius,Math.max(.01,delta.length()),radius);mesh.quaternion.setFromUnitVectors(up,delta.normalize());}
 return {root,
  reset(){lastX=lastZ=null;phase=stepDistance=walkSpeed=0;},
  update(dt,hands,k,stomp,now,onStep){
   root.visible=true;
   const travel=lastX===null?0:Math.hypot(k.x-lastX,k.z-lastZ);lastX=k.x;lastZ=k.z;
   walkSpeed=travel>.001&&travel<2?Math.min(8,travel/.05):walkSpeed*Math.exp(-dt*8);
   phase+=walkSpeed*dt*1.7;
   if(travel<2){stepDistance+=travel;if(stepDistance>2.5){stepDistance=0;footIndex=1-footIndex;onStep();}}
   const walking=walkSpeed>.1;
   torso.scale.x=1+Math.sin(now*.0018)*.012;torso.position.y=-stomp*.16;
   feet.forEach((foot,i)=>{foot.position.y=-7.55+(walking?Math.max(0,Math.sin(phase+i*Math.PI))*.3:0)+(i===footIndex?stomp*.65:0);foot.position.z=.1+(walking?Math.cos(phase+i*Math.PI)*.3:0);});
   root.updateWorldMatrix(true,true);
   hands.forEach((hand,i)=>{
    const a=arms[i];a.group.visible=hand.visible;if(!hand.visible)return;
    // Resolve the animated wrist, including mirrored left-hand geometry.
    hand.children[0].updateWorldMatrix(true,false);wrist.set(0,-.78,0);hand.children[0].localToWorld(wrist);root.worldToLocal(wrist);
    const side=hand.children[0].scale.x<0?-1:1,shoulder=new THREE.Vector3(side*1.45,-1.6,.65);
    const bend=shoulder.clone().lerp(wrist,.48);bend.x+=side*.55;bend.y-=.65;bend.z+=.45;
    a.shoulder.position.copy(shoulder);a.elbow.position.copy(bend);segment(a.upper,shoulder,bend,.48);segment(a.lower,bend,wrist,.35);
   });
  }
 };
}


