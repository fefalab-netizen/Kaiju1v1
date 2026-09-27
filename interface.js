const $=id=>document.getElementById(id);
const COST={tank:35,turret:50,crew:40,repair:30,missile:60,freeze:40};
const INFO={tank:'Mobile attacker · pursues the kaiju · 18m range.',turret:'Fixed defense · 25m range · needs power for full fire rate.',crew:'Repair crew · seeks damaged buildings · repairs within 6m.',repair:'Restore a damaged standing building. The hospital improves repair strength.',missile:'Strike a 9m area for heavy damage. Aim at the kaiju.',freeze:'Slow the kaiju within a 10m area.',select:'Tap a unit or its roster card, then tap a destination. Hold stops movement; Auto resumes its job.'};
const GROUP={tank:'units',turret:'units',crew:'units',repair:'abilities',missile:'abilities',freeze:'abilities',select:'orders'};
const RANGE={tank:18,turret:25,crew:6,repair:7,missile:9,freeze:10};
export function setupShell(){
 const params=new URLSearchParams(location.search);let joinedCode=null;
 const fresh=()=>Array.from(crypto.getRandomValues(new Uint8Array(6)),v=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[v%31]).join('');
 $('room').value=(params.get('room')||fresh()).toUpperCase();$('room-mode').value=params.has('room')?'join':'create';
 function mode(){const create=$('room-mode').value==='create';$('new-code').hidden=!create;$('room-help').textContent=create?'Choose your side to open the room, then invite your opponent.':'Enter the code from your opponent, then choose the free role.';}
 $('room-mode').onchange=mode;$('new-code').onclick=()=>{$('room').value=fresh();};mode();
 $('room').oninput=()=>{$('room').value=$('room').value.toUpperCase().replace(/[^A-Z0-9]/g,'');};
 $('lobby-message').textContent=params.has('room')?'Invitation received. Choose your side.':'City systems ready. Choose your side.';
 $('invite').onclick=()=>{
  const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('room',joinedCode||$('room').value);
  $('share-link').value=url.href;$('share-code').textContent=joinedCode||$('room').value;$('qr-code').replaceChildren();
  try{const qr=window.qrcode(0,'M');qr.addData(url.href);qr.make();$('qr-code').innerHTML=qr.createSvgTag({cellSize:4,margin:16,scalable:true});}catch{$('qr-code').textContent='Use the room link below.';}
  $('share-note').textContent=['localhost','127.0.0.1'].includes(location.hostname)?'For another device, open the game using your LAN address or deployed HTTPS address first.':'Scan to open this room on another device.';
  $('native-share').hidden=!navigator.share;$('share-dialog').showModal();
 };
 $('close-share').onclick=()=>$('share-dialog').close();
 $('copy-link').onclick=async()=>{try{await navigator.clipboard.writeText($('share-link').value);$('share-note').textContent='Link copied. Send it to your opponent.';}catch{$('share-link').focus();$('share-link').select();$('share-note').textContent='Select and copy the link above.';}};
 $('native-share').onclick=async()=>{try{await navigator.share({title:'Kaiju 1v1 — join my room',url:$('share-link').value});}catch{}};
 return {
  request(){const code=$('room').value.trim().toUpperCase();if(!/^[A-Z0-9]{3,12}$/.test(code)){$('lobby-message').textContent='Use a room code with 3–12 letters or numbers.';$('room').focus();return null;}return {room:code,create:$('room-mode').value==='create'};},
  joined(code){joinedCode=code;$('room').value=code;$('room-mode').value='join';const url=new URL(location.href);url.searchParams.set('room',code);history.replaceState(null,'',url);},
  message(text){$('lobby-message').textContent=text;}
 };
}

export function createCommander(api){
 const map=$('map'),camera={zoom:1,x:0,y:0},pointers=new Map();let pending=null,category='units',gesture=false,lastDistance=0;
 for(const id of ['roster-panel','facility-cards','command-tabs','map-tools','action-info'])$(id).hidden=false;
 const projection=()=>{const r=map.getBoundingClientRect();return {scale:Math.min(r.width,Math.max(100,r.height-64))/80*camera.zoom,ox:r.width/2+camera.x,oy:r.height/2+32+camera.y};};
 const point=e=>{const r=map.getBoundingClientRect(),p=projection();return {x:(e.clientX-r.left-p.ox)/p.scale,z:(e.clientY-r.top-p.oy)/p.scale};};
 function bound(){const r=map.getBoundingClientRect();camera.x=Math.max(-r.width*camera.zoom/2,Math.min(r.width*camera.zoom/2,camera.x));camera.y=Math.max(-r.height*camera.zoom/2,Math.min(r.height*camera.zoom/2,camera.y));}
 function zoom(factor){camera.zoom=Math.max(1,Math.min(3.5,camera.zoom*factor));bound();api.draw();}
 $('zoom-in').onclick=()=>zoom(1.25);$('zoom-out').onclick=()=>zoom(.8);$('map-home').onclick=()=>{camera.zoom=1;camera.x=camera.y=0;api.draw();};
 function cancel(){pending=null;$('placement').hidden=true;api.draw();}
 function switchCategory(next){category=next;for(const b of $('command-tabs').children){b.classList.toggle('active',b.dataset.category===next);b.setAttribute('aria-pressed',String(b.dataset.category===next));}for(const b of $('controls').children)b.hidden=GROUP[b.dataset.type]!==next;}
 for(const b of $('command-tabs').children)b.onclick=()=>{switchCategory(b.dataset.category);api.select(b.dataset.category==='units'?'tank':b.dataset.category==='abilities'?'missile':'select');};
 const icons={tank:'▰',turret:'⌖',crew:'✚',repair:'✚',missile:'↗',freeze:'❄',select:'◎'};
 for(const b of $('controls').children)b.dataset.icon=icons[b.dataset.type];switchCategory(category);
 function reason(){const {state,paused}=api.get();if(!state||state.phase!=='playing')return 'Start the match before issuing orders.';if(paused)return 'Waiting for both players to reconnect.';if(!pending)return '';
  if(pending.type==='order'){const unit=state.units.find(u=>u.id===pending.id);return !unit?'Unit no longer available.':unit.type==='turret'?'Turrets hold a fixed position.':'';}
  const cost=COST[pending.type];if(state.credits<cost)return 'Need '+Math.ceil(cost-state.credits)+' more credits.';if(state.cool[pending.type]>0)return 'Ready in '+state.cool[pending.type].toFixed(1)+'s.';
  if(['tank','turret','crew'].includes(pending.type)&&state.units.length>=20)return 'Unit limit reached (20).';
  if(pending.type==='repair'&&!state.buildings.some(b=>b.hp>0&&b.hp<b.max&&Math.hypot(b.x-pending.x,b.z-pending.z)<7))return 'Choose a damaged standing building.';return '';
 }
 function pick(e){const {state,selected,selectedUnit}=api.get();if(!state)return;const p=point(e);
  if(selected==='select'){
   const radius=Math.max(3,20/projection().scale),unit=state.units.filter(u=>Math.hypot(u.x-p.x,u.z-p.z)<radius).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
   if(unit){api.selectUnit(unit.id);cancel();return;}
   if(selectedUnit===null){api.toast('Tap a unit or its roster card first.');return;}pending={type:'order',id:selectedUnit,mode:'move',x:p.x,z:p.z};
  }else pending={type:selected,x:p.x,z:p.z};
  pending.x=Math.max(-34,Math.min(34,pending.x));pending.z=Math.max(-34,Math.min(34,pending.z));update();api.draw();
 }
 map.onpointerdown=e=>{if(e.button!==0)return;map.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY});if(pointers.size>1){gesture=true;const p=[...pointers.values()];lastDistance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}else gesture=false;};
 map.onpointermove=e=>{const p=pointers.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
  if(pointers.size>1){const a=[...pointers.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(lastDistance>0)zoom(d/lastDistance);lastDistance=d;gesture=true;}
  else if(gesture||Math.hypot(p.x-p.startX,p.y-p.startY)>7){gesture=true;camera.x+=dx;camera.y+=dy;bound();api.draw();}
 };
 map.onpointerup=e=>{const tap=pointers.has(e.pointerId)&&!gesture;pointers.delete(e.pointerId);if(tap)pick(e);if(!pointers.size){gesture=false;lastDistance=0;}};
 map.onpointercancel=map.onlostpointercapture=e=>{pointers.delete(e.pointerId);if(!pointers.size){gesture=false;lastDistance=0;}};
 map.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?1.12:.89);},{passive:false});
 $('cancel-place').onclick=cancel;$('confirm-place').onclick=()=>{const error=reason();if(error){api.toast(error);return;}if(pending)api.send(pending);cancel();};
 window.addEventListener('keydown',e=>{if(e.target.closest('input,select,textarea,dialog')||e.ctrlKey||e.metaKey||e.altKey)return;const tools={Digit1:'tank',Digit2:'turret',Digit3:'crew',Digit4:'repair',Digit5:'missile',Digit6:'freeze',KeyV:'select'};if(tools[e.code]){e.preventDefault();api.select(tools[e.code]);}if(e.code==='Escape')cancel();});
 const facilities=new Map();
 function update(){const {state,selected,selectedUnit,paused}=api.get();if(!state)return;
  $('roster-empty').hidden=state.units.length>0;
  const u=state.units.find(u=>u.id===selectedUnit);$('unit-health').hidden=!u;if(u){$('unit-health').max=u.type==='tank'?90:u.type==='crew'?65:140;$('unit-health').value=u.hp;}
  for(const b of $('roster').children){const unit=state.units.find(u=>u.id===Number(b.dataset.unit));if(unit)b.textContent=unit.type.toUpperCase()+' #'+unit.id+' · '+Math.ceil(unit.hp)+' HP';}
  const cost=COST[selected]||0,shortfall=Math.max(0,Math.ceil(cost-state.credits));$('action-info').textContent=(INFO[selected]||'')+(shortfall?' Need '+shortfall+' more credits.':cost?' Cost: '+cost+' credits.':'');
  for(const b of $('controls').children){const lack=state.credits<(COST[b.dataset.type]||0);b.classList.toggle('unaffordable',lack);b.setAttribute('aria-pressed',String(b.dataset.type===selected));}
  if(pending&&(state.phase!=='playing'||paused)){pending=null;$('placement').hidden=true;}
  $('placement').hidden=!pending;if(pending){const error=reason();$('placement-label').textContent=error|| (pending.type==='order'?'MOVE UNIT':pending.type.toUpperCase()+' · '+COST[pending.type]+' CREDITS')+' → '+Math.round(pending.x)+', '+Math.round(pending.z);$('confirm-place').disabled=!!error;}
  for(const b of state.buildings.filter(b=>b.facility)){
   let card=facilities.get(b.id);if(!card){const el=document.createElement('button'),title=document.createElement('strong'),detail=document.createElement('small'),bar=document.createElement('progress');el.className='facility-card';bar.max=100;bar.setAttribute('aria-label',b.name+' health');el.append(title,detail,bar);$('facility-cards').append(el);card={el,title,detail,bar,hp:b.hp,hitUntil:0};facilities.set(b.id,card);el.onclick=()=>{const p=projection();camera.x=-b.x*p.scale;camera.y=-b.z*p.scale;bound();api.draw();};}
   if(b.hp<card.hp)card.hitUntil=performance.now()+1200;card.hp=b.hp;card.title.textContent=b.name+' · '+(b.hp>0?Math.ceil(b.hp)+'%':'LOST');card.detail.textContent=b.facility==='power'?(b.hp>0?'Turrets at full power':'Turret fire rate halved'):b.facility==='hospital'?(b.hp>0?'Repairs at full strength':'Repair strength reduced'):(b.hp>0?'Evacuation at full speed':'Evacuation at half speed');card.bar.value=b.hp;card.el.classList.toggle('lost',b.hp<=0);card.el.classList.toggle('attacked',performance.now()<card.hitUntil);
  }
 }
 return {projection,update,reset(){cancel();camera.zoom=1;camera.x=camera.y=0;},selectionChanged(type){pending=null;$('placement').hidden=true;switchCategory(GROUP[type]||'units');update();api.draw();},paint(ctx){if(!pending)return;const error=reason();ctx.save();ctx.strokeStyle=error?'#ff8268':'#a9ffe6';ctx.fillStyle=error?'#ff765b20':'#82efcc20';ctx.lineWidth=.25;ctx.setLineDash([.7,.5]);ctx.beginPath();ctx.arc(pending.x,pending.z,RANGE[pending.type]||1.5,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.setLineDash([]);ctx.strokeRect(pending.x-1,pending.z-1,2,2);if(['tank','turret','crew'].includes(pending.type)){ctx.fillStyle='#c4ffdf';ctx.font='bold 3px monospace';ctx.textAlign='center';ctx.fillText(icons[pending.type],pending.x,pending.z+1);}ctx.restore();}};
}
