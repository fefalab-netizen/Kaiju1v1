import * as THREE from 'three';
import {VRButton} from 'three/addons/webxr/VRButton.js';
import {sprites,facade,assetsReady} from './sprites.js';
await assetsReady;
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
$('room').value=params.get('room')||'TOKYO';
let ws,role,state,selected='tank',selectedUnit=null,yaw=0,pitch=-.25,renderer,scene,camera,rig,paused=false;
let toastTimer,audioContext,noiseBuffer,sound=true,lastSound=0,lastElapsed=0,shake=0,attackAnim=0;
const keys={},objects=new Map(),unitObjects=new Map(),carObjects=new Map(),effectObjects=new Map(),seenEffects=new Set();
const grips=[],controllers=[],handVisuals=[],desktopHands=[],particles=[];
let particleGeometry,particleCloud;
const sharedBox=new THREE.BoxGeometry(1,1,1);
function toast(message){$('toast').textContent=message;$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',2600);}
function send(data){if(ws?.readyState===1)ws.send(JSON.stringify(data));}
function unlockAudio(){if(!audioContext){try{audioContext=new (window.AudioContext||window.webkitAudioContext)();noiseBuffer=audioContext.createBuffer(1,audioContext.sampleRate*.4,audioContext.sampleRate);const a=noiseBuffer.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*(1-i/a.length);}catch{sound=false;}}audioContext?.resume().catch(()=>{});}
document.addEventListener('pointerdown',unlockAudio,{once:true});
function impactSound(big){if(!sound||!audioContext||audioContext.state!=='running'||performance.now()-lastSound<90)return;lastSound=performance.now();const s=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter(),gain=audioContext.createGain();s.buffer=noiseBuffer;filter.type='lowpass';filter.frequency.value=big?260:750;gain.gain.value=big?.22:.1;s.connect(filter).connect(gain).connect(audioContext.destination);s.start();s.onended=()=>{s.disconnect();filter.disconnect();gain.disconnect();};}
$('sound').onclick=()=>{unlockAudio();sound=!sound;$('sound').textContent=sound?'Sound on':'Sound off';};
for(const b of document.querySelectorAll('[data-role]')){b.disabled=false;b.onclick=()=>join(b.dataset.role);}
function join(r){
 if(ws&&ws.readyState<2)return;role=r;ws=new WebSocket((location.protocol==='https:'?'wss':'ws')+'://'+location.host);$('connection').textContent='CONNECTING';
 ws.onopen=()=>send({type:'join',room:$('room').value.trim().toUpperCase(),role});
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.error){toast(m.error);if(!$('lobby').hidden)ws.close();return;}
  if(m.joined){$('lobby').hidden=true;$('game').hidden=false;document.body.classList.add(role);$('connection').textContent=m.room+' / '+role.toUpperCase();setup();}
  if(m.state){const reset=m.state.elapsed<lastElapsed;state=m.state;lastElapsed=state.elapsed;paused=m.paused;if(reset){seenEffects.clear();selectedUnit=null;clearTransient();}updateUI(m.players);consumeEffects();if(role==='defender')drawMap();}
 };
 ws.onclose=()=>{$('connection').textContent='DISCONNECTED — RELOAD TO REJOIN';toast('Connection lost. Reload and join the same room.');};
 ws.onerror=()=>toast('Could not connect to game server');
}
$('start').onclick=()=>send({type:'start'});
$('practice').onclick=()=>send({type:'start',practice:true});
$('reset').onclick=()=>send({type:'reset'});
function grabOrThrow(hand=1){const held=state?.cars.some(c=>c.status==='held'&&c.hand===hand);send({type:held?'throw':'grab',hand});}
function attack(type){unlockAudio();if(type==='grab'){grabOrThrow();return;}if(type==='smash')attackAnim=.3;send({type});}
function selectTool(type){selected=type;if(type!=='select')selectedUnit=null;for(const b of $('controls').children)b.classList.toggle('active',b.dataset.type===type);updateOrders();}
function setup(){
 $('controls').replaceChildren();
 const items=role==='kaiju'?[['smash','Smash · click'],['grab','Grab car · R'],['stomp','Stomp · Q'],['breath','Breath · E']]:[['select','Select / Move'],['tank','Tank · 35'],['turret','Turret · 50'],['repair','Repair · 30'],['missile','Missile · 60'],['freeze','Freeze · 40']];
 for(const [type,label]of items){const b=document.createElement('button');b.dataset.type=type;b.dataset.label=label;b.textContent=label;b.onclick=()=>role==='kaiju'?attack(type):selectTool(type);$('controls').append(b);if(type===selected)b.classList.add('active');}
 $('hint').textContent=role==='kaiju'?'WASD move · drag look · click punch · R grab/throw nearby car · Q stomp · E breath. VR: swing fists; grip to grab, release to throw; trigger smash; B/Y stomp; A/X breath.':'Choose a deployment, then tap the map. Select / Move: tap a tank, then its destination. Tanks keep firing while moving; turrets stay fixed.';
 $('command-panel').hidden=role!=='defender';$('intel').hidden=role!=='defender';
 $('hold').onclick=()=>send({type:'order',id:selectedUnit,mode:'hold'});
 $('auto').onclick=()=>send({type:'order',id:selectedUnit,mode:'auto'});
 if(role==='kaiju')setup3D();else{$('map').hidden=false;$('map').onpointerdown=mapInput;}
}
function mapPoint(e){const rect=$('map').getBoundingClientRect(),scale=Math.min(rect.width,rect.height-64)/80;return {x:(e.clientX-rect.left-rect.width/2)/scale,z:(e.clientY-rect.top-rect.height/2-32)/scale};}
function mapInput(e){
 if(!state||paused||state.phase!=='playing')return;const p=mapPoint(e);
 if(selected==='select'){
  const nearby=state.units.filter(u=>Math.hypot(u.x-p.x,u.z-p.z)<3).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
  if(nearby){selectedUnit=nearby.id;updateOrders();drawMap();return;}
  if(selectedUnit!==null){send({type:'order',id:selectedUnit,mode:'move',...p});return;}
  toast('Tap a blue tank or turret to select it');return;
 }
 send({type:selected,...p});
}
function updateOrders(){
 if(!state)return;const u=state.units.find(u=>u.id===selectedUnit);if(!u)selectedUnit=null;
 $('unit-status').textContent=u?u.type.toUpperCase()+' '+u.id+' · '+Math.ceil(u.hp)+' HP · '+(u.type==='turret'?'FIXED POSITION':u.order?(Math.hypot(u.x-u.order.x,u.z-u.order.z)<.3?'HOLDING POSITION':'MOVING TO '+Math.round(u.order.x)+', '+Math.round(u.order.z)):'AUTO PURSUIT'):'TACTICAL ORDERS · SELECT A UNIT';
 const rosterKey=state.units.map(unit=>unit.id).join(',');
 if($('roster').dataset.units!==rosterKey){$('roster').dataset.units=rosterKey;$('roster').replaceChildren();for(const unit of state.units){const button=document.createElement('button');button.textContent=unit.type.toUpperCase()+' #'+unit.id;button.dataset.unit=unit.id;button.onclick=()=>{selectTool('select');selectedUnit=unit.id;updateOrders();drawMap();};$('roster').append(button);}}
 for(const button of $('roster').children)button.classList.toggle('active',Number(button.dataset.unit)===selectedUnit);
 $('hold').disabled=$('auto').disabled=!u||u.type!=='tank'||paused||state.phase!=='playing';
}
function updateUI(players){
 const lost=state.buildings.filter(b=>b.hp<=0).length;$('health').textContent=Math.ceil(state.kaiju.hp);$('damage').textContent=Math.round(lost/state.buildings.length*100)+'%';
 const seconds=Math.ceil(state.remaining);$('time').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');$('credits').textContent=Math.floor(state.credits);
 $('status').textContent=state.phase==='ended'?state.winner.toUpperCase()+' WINS — '+state.reason:paused?'PAUSED — waiting for disconnected player':state.phase==='lobby'?'Ready to level the playing field?':(role==='kaiju'?'DESTROY THE CITY':'PROTECT THE CITY')+(state.slow>0?' · KAIJU FROZEN':'');
 $('joinInfo').textContent='Kaiju '+(players.kaiju?'●':'○')+' / Defender '+(players.defender?'●':state.bot?'AI':'○')+' · Room '+$('room').value.toUpperCase();
 $('start').hidden=state.phase!=='lobby';$('practice').hidden=state.phase!=='lobby'||role!=='kaiju';$('reset').hidden=state.phase!=='ended';
 $('intel-count').textContent=(48-lost)+'/48 BLOCKS · '+state.units.length+'/20 UNITS';
 for(const b of $('controls').children){const type=b.dataset.type,cd=state.cool[type]||0;b.textContent=b.dataset.label+(cd>0?' ('+cd.toFixed(1)+'s)':'');if(type==='grab')b.textContent=state.cars.some(c=>c.status==='held'&&c.hand===1)?'Throw car · R':'Grab car · R';b.disabled=state.phase!=='playing'||paused||cd>0;}
 if(role==='kaiju'){$('interaction').textContent=state.cars.some(c=>c.status==='held')?'CAR HELD · Swing and release grip / R to throw':state.cars.some(c=>c.status==='parked'&&Math.hypot(c.x-state.kaiju.x,c.z-state.kaiju.z)<10)?'CAR IN REACH · Hold grip / R to grab':'';}
 updateOrders();
}
function consumeEffects(){
 for(const e of state.effects){if(seenEffects.has(e.id))continue;seenEffects.add(e.id);
  if(['collapse','impact','punch','carImpact','stomp','smash','breath'].includes(e.type)){
   const big=['collapse','carImpact','stomp'].includes(e.type);impactSound(big);
   if(role==='kaiju'&&scene){spawnParticles(e,big?26:9);shake=Math.max(shake,big?.2:.07);const source=controllers[e.hand]?.userData.source;if(source)source.gamepad?.hapticActuators?.[0]?.pulse(.5,65)?.catch(()=>{});}
   if(e.type==='collapse')$('dispatch').textContent='BLOCK LOST · REROUTE DEFENSE';
   if(e.type==='carImpact')$('dispatch').textContent='VEHICLE IMPACT DETECTED';
  }
 }
 if(seenEffects.size>500){const live=new Set(state.effects.map(e=>e.id));for(const id of seenEffects)if(!live.has(id))seenEffects.delete(id);}
}
function drawMap(){
 const c=$('map'),r=c.getBoundingClientRect(),dpr=Math.min(devicePixelRatio,2);if(c.width!==Math.round(r.width*dpr)||c.height!==Math.round(r.height*dpr)){c.width=r.width*dpr;c.height=r.height*dpr;}
 const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;ctx.fillStyle='#0c1d29';ctx.fillRect(0,0,r.width,r.height);ctx.translate(r.width/2,r.height/2+32);
 const s=Math.min(r.width,r.height-64)/80;ctx.scale(s,s);
 ctx.fillStyle='#122b36';ctx.fillRect(-37,-37,74,74);ctx.strokeStyle='#325663';ctx.lineWidth=.15;
 for(let i=-36;i<=36;i+=8){ctx.fillStyle='#091b26';ctx.fillRect(i-.7,-36,1.4,72);ctx.fillRect(-36,i-.7,72,1.4);ctx.beginPath();ctx.moveTo(i,-36);ctx.lineTo(i,36);ctx.stroke();ctx.beginPath();ctx.moveTo(-36,i);ctx.lineTo(36,i);ctx.stroke();}
 ctx.font='1.4px monospace';ctx.fillStyle='#91c4c3';for(let i=0;i<7;i++){ctx.fillText(String.fromCharCode(65+i),-25+i*8,-38);ctx.fillText(String(i+1),-39,-23+i*8);}
 for(const b of state.buildings){
  if(b.hp<=0){ctx.fillStyle='#435158';ctx.fillRect(b.x-2,b.z-1.5,3,2);ctx.fillStyle='#697078';ctx.fillRect(b.x+.3,b.z+.4,1.6,1.4);}
  else{ctx.drawImage(sprites.building,b.x-3,b.z-3,6,6);if(b.hp<100){ctx.fillStyle=b.hp<50?'#fa78467a':'#e8bc5740';ctx.fillRect(b.x-2.3,b.z-2.3,4.6,4.6);}ctx.fillStyle='#122633';ctx.fillRect(b.x-2.4,b.z+2,4.8,.45);ctx.fillStyle=b.hp<50?'#ffae68':'#a3e1be';ctx.fillRect(b.x-2.4,b.z+2,b.hp*.048,.45);}
 }
 for(const car of state.cars){if(car.status==='held')continue;ctx.fillStyle=car.status==='wreck'?'#54504c':car.status==='flying'?'#ffc064':'#8b9fa9';ctx.fillRect(car.x-.45,car.z-.9,.9,1.8);}
 const chosen=state.units.find(u=>u.id===selectedUnit);
 if(chosen){ctx.strokeStyle='#73e8eb55';ctx.lineWidth=.2;ctx.beginPath();ctx.arc(chosen.x,chosen.z,chosen.type==='tank'?18:25,0,Math.PI*2);ctx.stroke();if(chosen.order){ctx.setLineDash([.8,.7]);ctx.strokeStyle='#80eee0';ctx.beginPath();ctx.moveTo(chosen.x,chosen.z);ctx.lineTo(chosen.order.x,chosen.order.z);ctx.stroke();ctx.setLineDash([]);ctx.strokeRect(chosen.order.x-1,chosen.order.z-1,2,2);}}
 for(const u of state.units){if(u.id===selectedUnit){ctx.strokeStyle='#ffe3a0';ctx.lineWidth=.3;ctx.strokeRect(u.x-2.5,u.z-2.5,5,5);}ctx.save();ctx.translate(u.x,u.z);const target=u.order||state.kaiju;ctx.rotate(Math.atan2(target.x-u.x,-(target.z-u.z)));ctx.drawImage(sprites[u.type],-2.3,-2.3,4.6,4.6);ctx.restore();}
 for(const e of state.effects){ctx.strokeStyle=e.type==='repair'?'#70ffc0':e.type==='freeze'?'#87d9ff':'#ffb261';ctx.lineWidth=.4;ctx.beginPath();ctx.arc(e.x,e.z,Math.max(.1,e.r*(1-e.ttl/(e.type==='collapse'?1.6:.9))),0,7);ctx.stroke();}
 const k=state.kaiju;ctx.save();ctx.translate(k.x,k.z);ctx.rotate(-k.yaw);ctx.fillStyle='#ff794422';ctx.beginPath();ctx.arc(0,0,4.3,0,7);ctx.fill();ctx.drawImage(sprites.monster,-4,-4,8,8);ctx.restore();
 ctx.strokeStyle='#77979b';ctx.lineWidth=.3;ctx.strokeRect(-37,-37,74,74);
}
function texture(image){const canvas=document.createElement('canvas');canvas.width=Math.min(512,image.width);canvas.height=Math.min(512,image.height);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);const t=new THREE.CanvasTexture(canvas);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.colorSpace=THREE.SRGBColorSpace;return t;}
const spriteTextures=Object.fromEntries(Object.entries(sprites).map(([name,c])=>[name,texture(c)]));
const buildingMaterials=Array.from({length:3},(_,v)=>Array.from({length:3},(_,damage)=>new THREE.MeshStandardMaterial({map:texture(facade(v,damage)),roughness:.95})));
function box(w,h,d,color){const mesh=new THREE.Mesh(sharedBox,new THREE.MeshStandardMaterial({color,roughness:.85}));mesh.scale.set(w,h,d);return mesh;}
function sprite(name,size){const mesh=new THREE.Sprite(new THREE.SpriteMaterial({map:spriteTextures[name],transparent:true,alphaTest:.1}));mesh.scale.set(size,size,1);return mesh;}
function disposeGroup(group){group.traverse(m=>{if(m.material){if(Array.isArray(m.material))m.material.forEach(x=>x.dispose());else m.material.dispose();}if(m.geometry&&m.geometry!==sharedBox)m.geometry.dispose();});}
function clearTransient(){particles.length=0;for(const collection of [unitObjects,carObjects,effectObjects]){for(const mesh of collection.values()){scene?.remove(mesh);disposeGroup(mesh);}collection.clear();}for(const mesh of objects.values()){mesh.userData.hp=100;mesh.userData.flashUntil=0;}shake=0;$('dispatch').textContent='CITY DEFENSE NETWORK · ONLINE';}
function spawnParticles(e,count){
 for(let i=0;i<count&&particles.length<240;i++){const angle=Math.random()*Math.PI*2,speed=2+Math.random()*7;particles.push({x:e.x,y:Math.max(1,e.y||1),z:e.z,vx:Math.cos(angle)*speed,vy:2+Math.random()*7,vz:Math.sin(angle)*speed,life:.5+Math.random()});}
}
function setup3D(){
 scene=new THREE.Scene();scene.background=new THREE.Color('#142332');scene.fog=new THREE.Fog('#142332',55,130);camera=new THREE.PerspectiveCamera(75,1,.1,180);rig=new THREE.Group();rig.add(camera);scene.add(rig);
 renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.xr.enabled=true;$('view').prepend(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xc5eaff,0x31352b,2));const light=new THREE.DirectionalLight(0xffd0a0,2);light.position.set(-25,60,20);scene.add(light);
 const ground=box(90,.3,90,0x263c46);ground.position.y=-.2;scene.add(ground);
 for(let i=-36;i<=36;i+=8){const a=box(1,.05,80,0x152530);a.position.set(i,.02,0);scene.add(a);const b=box(80,.05,1,0x152530);b.position.set(0,.02,i);scene.add(b);}
 for(let i=0;i<2;i++){
  const controller=renderer.xr.getController(i);controllers.push(controller);rig.add(controller);
  controller.addEventListener('connected',e=>controller.userData.source=e.data);
  controller.addEventListener('disconnected',()=>{controller.userData.source=null;send({type:'drop'});});
  controller.addEventListener('selectstart',()=>attack('smash'));
  controller.addEventListener('squeezestart',()=>send({type:'grab',hand:i}));
  controller.addEventListener('squeezeend',()=>{send({type:'throw',hand:i});});
  const grip=renderer.xr.getControllerGrip(i);grips.push(grip);rig.add(grip);
  const visual=sprite(i===0?'handLeft':'hand',2.2);handVisuals.push(visual);rig.add(visual);
  const desktop=sprite(i===0?'handLeft':'hand',.64);desktop.material.depthTest=false;desktop.renderOrder=90;desktop.position.set(i===0?-.65:.65,-.49,-1);camera.add(desktop);desktopHands.push(desktop);
 }
 const vrButton=VRButton.createButton(renderer);document.querySelector('footer').append(vrButton);Object.assign(vrButton.style,{position:'static',transform:'none',marginTop:'8px',width:'auto'});
 renderer.xr.addEventListener('sessionstart',()=>{pitch=0;camera.rotation.set(0,0,0);});
 renderer.xr.addEventListener('sessionend',()=>{pitch=-.25;send({type:'drop'});});
 const canvas=renderer.domElement;let down,dragging=false;
 canvas.onpointerdown=e=>{down={x:e.clientX,y:e.clientY};dragging=false;canvas.setPointerCapture(e.pointerId);};
 canvas.onpointermove=e=>{if(!down)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.abs(dx)+Math.abs(dy)>2)dragging=true;yaw-=dx*.005;pitch=Math.max(-1.1,Math.min(.7,pitch-dy*.005));down={x:e.clientX,y:e.clientY};};
 canvas.onpointerup=()=>{if(!dragging)attack('smash');down=null;};canvas.onpointercancel=()=>down=null;
 window.addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','KeyR','Space'].includes(e.code))e.preventDefault();keys[e.code]=true;if(!e.repeat&&e.code==='KeyQ')attack('stomp');if(!e.repeat&&e.code==='KeyE')attack('breath');if(!e.repeat&&e.code==='KeyR')grabOrThrow();});
 window.addEventListener('keyup',e=>keys[e.code]=false);window.addEventListener('blur',()=>{for(const k in keys)keys[k]=false;send({type:'move',x:0,z:0,yaw});});
 const hudCanvas=document.createElement('canvas');hudCanvas.width=1024;hudCanvas.height=320;const hudTexture=new THREE.CanvasTexture(hudCanvas);
 const hud=new THREE.Mesh(new THREE.PlaneGeometry(1.6,.5),new THREE.MeshBasicMaterial({map:hudTexture,transparent:true,depthTest:false}));hud.position.set(0,-.6,-2);hud.renderOrder=99;camera.add(hud);
 particleGeometry=new THREE.BufferGeometry();particleGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(240*3),3));particleGeometry.setDrawRange(0,0);
 particleCloud=new THREE.Points(particleGeometry,new THREE.PointsMaterial({color:0xe5b88b,size:.55,transparent:true,opacity:.8}));particleCloud.frustumCulled=false;scene.add(particleCloud);
 let last=0,sent=0,buttons={breath:false,stomp:false},hudTime=0;
 renderer.setAnimationLoop(now=>{
  const dt=Math.min(.05,(now-last)/1000||0);last=now;if(!state)return;
  const session=renderer.xr.getSession();
  let mx=(keys.KeyD?1:0)-(keys.KeyA?1:0),mz=(keys.KeyS?1:0)-(keys.KeyW?1:0),breath=false,stomp=false;
  if(session){for(const source of session.inputSources){const gp=source.gamepad;if(!gp)continue;const axes=gp.axes;if(source.handedness==='left'){mx=axes[2]??axes[0]??0;mz=axes[3]??axes[1]??0;}if(source.handedness==='right')yaw-=(axes[2]??axes[0]??0)*dt*1.5;breath ||=!!gp.buttons[4]?.pressed;stomp ||=!!gp.buttons[5]?.pressed;}if(breath&&!buttons.breath)attack('breath');if(stomp&&!buttons.stomp)attack('stomp');buttons={breath,stomp};}
  if(Math.abs(mx)<.15)mx=0;if(Math.abs(mz)<.15)mz=0;
  rig.position.set(state.kaiju.x,session?8:10,state.kaiju.z);rig.rotation.y=yaw;
  const poses=grips.map((grip,i)=>{
   const tracked=!!session&&grip.visible&&!!controllers[i].userData.source;handVisuals[i].visible=tracked;desktopHands[i].visible=!session;
   if(!tracked)return null;
   let x=grip.position.x*5,z=grip.position.z*5;const n=Math.max(1,Math.hypot(x,z)/8.8);x/=n;z/=n;const y=Math.max(.2,Math.min(17.8,8+(grip.position.y-1.3)*3));
   handVisuals[i].position.set(x,y-8,z);return {x,y,z};
  });
  if(now-sent>50&&state.phase==='playing'&&!paused){const x=mx*Math.cos(yaw)+mz*Math.sin(yaw),z=-mx*Math.sin(yaw)+mz*Math.cos(yaw);send({type:'move',x,z,yaw});if(session)send({type:'hands',poses});sent=now;}
  attackAnim=Math.max(0,attackAnim-dt);desktopHands[1].position.z=-1-Math.sin(attackAnim/.3*Math.PI)*.4;
  shake=Math.max(0,shake-dt);if(!session){camera.position.set(shake?Math.sin(now*.07)*shake*.12:0,0,0);camera.rotation.set(pitch,0,0);}
  hud.visible=!!session;
  if(session&&now-hudTime>150){hudTime=now;const ctx=hudCanvas.getContext('2d');ctx.clearRect(0,0,1024,320);ctx.fillStyle='#0b1119dd';ctx.fillRect(0,0,1024,320);ctx.fillStyle='#fff';ctx.font='bold 34px sans-serif';ctx.fillText($('status').textContent.slice(0,48),25,48);ctx.font='30px sans-serif';ctx.fillText('HP '+Math.ceil(state.kaiju.hp)+'   City '+$('damage').textContent+' / 60%   '+$('time').textContent,25,102);ctx.fillText('Smash '+state.cool.smash.toFixed(1)+'s   Stomp '+state.cool.stomp.toFixed(1)+'s   Breath '+state.cool.breath.toFixed(1)+'s',25,156);ctx.font='24px sans-serif';ctx.fillText('Swing: punch | Grip: grab/release car | A/X: breath | B/Y: stomp',25,210);ctx.fillStyle='#ffbb79';ctx.fillText($('interaction').textContent,25,266);hudTexture.needsUpdate=true;}
  renderCity(dt,now);renderUnits();renderCars(dt);renderEffects();
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){particles.splice(i,1);continue;}p.vy-=12*dt;p.x+=p.vx*dt;p.y=Math.max(.1,p.y+p.vy*dt);p.z+=p.vz*dt;}
  const positions=particleGeometry.attributes.position.array;particles.forEach((p,i)=>{positions[i*3]=p.x;positions[i*3+1]=p.y;positions[i*3+2]=p.z;});particleGeometry.attributes.position.needsUpdate=true;particleGeometry.setDrawRange(0,particles.length);
  const rect=$('view').getBoundingClientRect();if(!session&&(renderer.domElement.width!==Math.round(rect.width*renderer.getPixelRatio())||renderer.domElement.height!==Math.round(rect.height*renderer.getPixelRatio()))){renderer.setSize(rect.width,rect.height);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();}
  renderer.render(scene,camera);
 });
}
function renderCity(dt,now){
 for(const b of state.buildings){
  let group=objects.get(b.id);
  if(!group){group=new THREE.Group();const body=new THREE.Mesh(sharedBox,buildingMaterials[b.id%3][0]);body.scale.set(5,b.h,5);body.position.y=b.h/2;group.add(body);const roof=box(5.25,.3,5.25,0xabb5b0);roof.position.y=b.h;group.add(roof);const ac=box(1.5,.6,1.3,0x3e5968);ac.position.set(.7,b.h+.45,.5);group.add(ac);
   const rubble=new THREE.Group();for(let i=0;i<5;i++){const chunk=box(.8+(i%2),.5+(i%3)*.25,1.2,0x62686a);chunk.position.set(Math.sin(i*8+b.id)*2.5,.2,Math.cos(i*6+b.id)*2.5);chunk.rotation.y=i;rubble.add(chunk);}group.add(rubble);rubble.visible=false;
   group.position.set(b.x,0,b.z);group.userData={hp:b.hp,body,roof,ac,rubble,height:b.h};scene.add(group);objects.set(b.id,group);
  }
  const data=group.userData,dead=b.hp<=0,stage=b.hp<40?2:b.hp<100?1:0;data.body.material=buildingMaterials[b.id%3][stage];
  const target=dead?.2:b.h;data.height+=(target-data.height)*(1-Math.exp(-7*dt));
  data.body.scale.y=data.height;data.body.position.y=data.height/2;data.roof.position.y=data.height;data.ac.position.y=data.height+.45;data.ac.visible=!dead;data.rubble.visible=dead;
  if(data.hp>b.hp){data.flashUntil=now+180;data.hp=b.hp;}if(b.hp>data.hp)data.hp=b.hp;
  const flashing=now<(data.flashUntil||0);data.body.rotation.z=dead?Math.sin(b.id)*Math.min(.1,(b.h-data.height)*.01):0;
  data.roof.material.color.setHex(flashing?0xffd49b:dead?0x65605c:0xabb5b0);
 }
}
function renderUnits(){
 for(const u of state.units){let mesh=unitObjects.get(u.id);if(!mesh){mesh=new THREE.Group();const base=box(2,u.type==='tank'?.7:1,2,0x365872);base.position.y=.5;mesh.add(base);const art=sprite(u.type,u.type==='turret'?3:2.6);art.position.y=1.6;mesh.add(art);scene.add(mesh);unitObjects.set(u.id,mesh);}mesh.position.set(u.x,0,u.z);}
 for(const [id,mesh]of unitObjects)if(!state.units.some(u=>u.id===id)){scene.remove(mesh);disposeGroup(mesh);unitObjects.delete(id);}
}
function renderCars(dt){
 for(const car of state.cars){
  let mesh=carObjects.get(car.id);if(!mesh){mesh=new THREE.Group();const body=box(1.3,.65,2.5,[0xc46240,0xbaa24f,0x6b9bac][car.id%3]);mesh.add(body);const cab=box(1.1,.5,1.2,0x8cbdca);cab.position.set(0,.5,-.1);mesh.add(cab);for(const x of [-.66,.66])for(const z of [-.8,.8]){const wheel=box(.25,.45,.5,0x16232a);wheel.position.set(x,-.2,z);mesh.add(wheel);}scene.add(mesh);carObjects.set(car.id,mesh);}
  mesh.position.set(car.x,car.y,car.z);if(car.status==='flying')mesh.rotation.x+=dt*8;else mesh.rotation.set(0,car.id%2?Math.PI/2:0,car.status==='wreck'?.35:0);
  mesh.scale.setScalar(car.status==='wreck'?.7:1);if(car.status==='wreck')mesh.children[0].material.color.setHex(0x4e4944);
 }
}
function renderEffects(){
 for(const e of state.effects){let mesh=effectObjects.get(e.id);if(!mesh){mesh=new THREE.Mesh(new THREE.RingGeometry(.8,1,32),new THREE.MeshBasicMaterial({color:e.type==='freeze'?0x80dfff:e.type==='repair'?0x70ffc0:0xffaa65,side:THREE.DoubleSide,transparent:true}));mesh.rotation.x=-Math.PI/2;scene.add(mesh);effectObjects.set(e.id,mesh);}mesh.position.set(e.x,.2,e.z);mesh.scale.setScalar(Math.max(.1,e.r*(1-e.ttl/(e.type==='collapse'?1.6:.9))));mesh.material.opacity=Math.min(1,Math.max(0,e.ttl));}
 for(const [id,mesh]of effectObjects)if(!state.effects.some(e=>e.id===id)){scene.remove(mesh);disposeGroup(mesh);effectObjects.delete(id);}
}
window.addEventListener('resize',()=>{if(role==='defender'&&state)drawMap();});
