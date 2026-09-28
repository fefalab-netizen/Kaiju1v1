import {configureGame} from './campaign.mjs';
export const COST={crew:40,tank:35,turret:50,repair:30,missile:60,freeze:40};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const finitePoint=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);
export function createGame(options={}){
 const buildings=[];for(let x=-3;x<=3;x++)for(let z=-3;z<=3;z++)if(x||z)buildings.push({id:buildings.length,x:x*8,z:z*8,h:5+((x*x+z*z*3)%5)*2,hp:100,max:100});
 for(const [kind,name,x,z] of [['power','POWER',-16,8],['hospital','HOSPITAL',16,0],['evac','EVAC',0,-24]]){const b=buildings.find(b=>b.x===x&&b.z===z);Object.assign(b,{facility:kind,name});}
 const cars=[];for(let row=0;row<5;row++)for(let col=0;col<4;col++)cars.push({id:row*4+col,x:-28+col*16,z:30-row*12,y:.6,status:'parked',hand:null,vx:0,vy:0,vz:0,life:0});
 return configureGame({phase:'lobby',remaining:180,buildings,cars,units:[],effects:[],kaiju:{x:0,z:32,hp:1000,yaw:0,stamina:100,blocking:false},credits:100,cool:{smash:0,stomp:0,breath:0,missile:0,freeze:0},slow:0,input:{x:0,z:0,yaw:0},inputAge:0,nextId:1,winner:null,reason:'',bot:false,elapsed:0,hands:[null,null],punchCooldown:[0,0]},options);
}
export const ATTACK_COST={smash:8,stomp:30,breath:40};
export function facilityOnline(g,kind){return g.buildings.some(b=>b.facility===kind&&b.hp>0);}
function hurtKaiju(g,power,source){const k=g.kaiju,dx=source.x-k.x,dz=source.z-k.z,d=Math.hypot(dx,dz);const blocked=k.blocking&&k.stamina>0&&d>0&&(-Math.sin(k.yaw)*dx-Math.cos(k.yaw)*dz)/d>.35;power*=g.rules.unit;const amount=blocked?power*.25:power;k.hp=Math.max(0,k.hp-amount);effect(g,blocked?'blocked':'hurt',k.x,k.z,2,8,{sourceX:source.x,sourceZ:source.z,amount});}
export function start(g,bot=false){if(g.phase==='lobby'){g.phase='playing';if(bot){g.botRole='defender';g.humanRole='kaiju';}g.bot=g.botRole==='defender';}}
function effect(g,type,x,z,r,y=0,extra={}){g.effects.push({id:g.nextId++,type,x,z,r,y,ttl:type==='collapse'?1.5:.7,...extra});}
function hit(g,target,power){
 if(target.hp<=0)return;target.hp=Math.max(0,target.hp-power*g.rules.power);
 if(target.hp===0&&target.facility)effect(g,'facilityLost',target.x,target.z,8,target.h,{name:target.name});
 if(!target.max)effect(g,target.hp===0?'unitDestroyed':'impact',target.x,target.z,2,1);
 if(target.max){effect(g,target.hp===0?'collapse':'impact',target.x,target.z,target.hp===0?7:3,target.h*.5);}
}
function damage(g,x,z,r,power){for(const target of [...g.buildings,...g.units])if(distance(target,{x,z})<r)hit(g,target,power);}
// A swept segment against an expanded box avoids missed hits between pose/projectile samples.
export function segmentBox(a,b,center,half){
 let lo=0,hi=1;
 for(const axis of ['x','y','z']){const d=b[axis]-a[axis],min=center[axis]-half[axis],max=center[axis]+half[axis];
  if(Math.abs(d)<.00001){if(a[axis]<min||a[axis]>max)return null;continue;}
  let t1=(min-a[axis])/d,t2=(max-a[axis])/d;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi)return null;
 }return lo;
}
function worldHand(g,p){const c=Math.cos(g.kaiju.yaw),s=Math.sin(g.kaiju.yaw);return {x:g.kaiju.x+p.x*c+p.z*s,y:p.y,z:g.kaiju.z-p.x*s+p.z*c};}
function fallbackHand(g,hand){return worldHand(g,{x:hand===0?-2:2,y:8,z:-3});}
function collision(g,a,b,margin=0){
 let best=null;
 for(const target of [...g.buildings,...g.units]){if(target.hp<=0)continue;const height=target.h||(target.type==='turret'?3:1.5),width=target.max?2.5:1;
  const t=segmentBox(a,b,{x:target.x,y:height/2,z:target.z},{x:width+margin,y:height/2+margin,z:width+margin});
  if(t!==null&&(!best||t<best.t))best={target,t};
 }return best;
}
function poses(g,c){
 if(!Array.isArray(c.poses)||c.poses.length!==2)return 'Invalid hand poses';
 for(const p of c.poses)if(p!==null&&(!finitePoint(p)||Math.hypot(p.x,p.z)>9||p.y<0||p.y>18))return 'Hand outside reach';
 for(let i=0;i<2;i++){
  const p=c.poses[i],prev=g.hands[i];if(!p){g.hands[i]=null;continue;}
  const dt=prev?g.elapsed-prev.time:0;if(prev&&dt<.025)continue;
  let velocity={x:0,y:0,z:0},speed=0;
  if(prev&&dt<=.2){velocity={x:(p.x-prev.x)/dt,y:(p.y-prev.y)/dt,z:(p.z-prev.z)/dt};speed=Math.hypot(velocity.x,velocity.y,velocity.z);}
  // Ignore tracking jumps instead of converting them into damage or throw velocity.
  if(speed>70){velocity={x:0,y:0,z:0};speed=0;}
  g.hands[i]={...p,time:g.elapsed,velocity};
  if(prev&&speed>=5&&g.punchCooldown[i]===0&&!g.cars.some(car=>car.status==='held'&&car.hand===i)){
   const a=worldHand(g,prev),b=worldHand(g,p),contact=collision(g,a,b,.75);
   if(contact&&!g.kaiju.blocking&&g.kaiju.stamina>=6){g.kaiju.stamina-=6;hit(g,contact.target,clamp(18+speed*1.3,25,55));g.punchCooldown[i]=.45;effect(g,'punch',b.x,b.z,2,b.y,{hand:i});}
  }
 }checkWin(g);
}
function grab(g,c){
 if(c.hand!==0&&c.hand!==1)return 'Invalid hand';if(g.cars.some(car=>car.status==='held'&&car.hand===c.hand))return 'Hand already holding a car';
 const car=g.cars.filter(car=>car.status==='parked'&&distance(car,g.kaiju)<=10).sort((a,b)=>distance(a,g.kaiju)-distance(b,g.kaiju))[0];
 if(!car)return 'No car nearby — move within 10m of a parked car';
 car.status='held';car.hand=c.hand;car.life=0;const p=g.hands[c.hand];Object.assign(car,p&&g.elapsed-p.time<.3?worldHand(g,p):fallbackHand(g,c.hand));effect(g,'grab',car.x,car.z,2,car.y);return;
}
function release(g,c){
 if(c.hand!==0&&c.hand!==1)return 'Invalid hand';const car=g.cars.find(car=>car.status==='held'&&car.hand===c.hand);if(!car)return 'This hand is empty';
 const p=g.hands[c.hand];let v=p&&g.elapsed-p.time<.25?p.velocity:{x:0,y:0,z:0};
 const n=Math.hypot(v.x,v.y,v.z);if(n<3)v={x:0,y:4,z:-23};else{const scale=Math.min(1,28/n);v={x:v.x*scale,y:v.y*scale+3,z:v.z*scale};}
 const co=Math.cos(g.kaiju.yaw),si=Math.sin(g.kaiju.yaw);car.vx=v.x*co+v.z*si;car.vy=v.y;car.vz=-v.x*si+v.z*co;car.status='flying';car.hand=null;car.life=0;
}
export function dropHands(g){g.kaiju.blocking=false;g.hands=[null,null];for(const car of g.cars)if(car.status==='held'){car.status='flying';car.hand=null;car.vx=0;car.vy=0;car.vz=0;car.life=0;}}
export function command(g,role,c){
 if(g.phase!=='playing')return 'Match is not running';
 if(role==='kaiju'){
  if(c.type==='move'){if(![c.x,c.z,c.yaw].every(Number.isFinite))return 'Invalid movement';let n=Math.max(1,Math.hypot(c.x,c.z));g.input={x:c.x/n,z:c.z/n,yaw:c.yaw};g.inputAge=0;g.kaiju.blocking=c.block===true&&g.kaiju.stamina>5;return;}
  if(c.type==='hands')return poses(g,c);
  if(c.type==='grab')return grab(g,c);
  if(c.type==='throw')return release(g,c);
  if(c.type==='drop'){dropHands(g);return;}
  if(['smash','stomp','breath'].includes(c.type)&&!g.rules.attacks.includes(c.type))return 'This attack unlocks in a later chapter';
  if(!['smash','stomp','breath'].includes(c.type))return 'Unknown attack';if(g.cool[c.type]>0)return 'Attack cooling down';
  if(g.kaiju.blocking)return 'Lower your guard to attack';if(g.kaiju.stamina<ATTACK_COST[c.type])return 'Not enough stamina';g.kaiju.stamina-=ATTACK_COST[c.type];
  const k=g.kaiju,fx=-Math.sin(k.yaw),fz=-Math.cos(k.yaw);
  if(c.type==='smash'){damage(g,k.x+fx*5,k.z+fz*5,7,45);g.cool.smash=.65;effect(g,'smash',k.x+fx*5,k.z+fz*5,7,0,{hand:c.hand===0?0:1});}
  if(c.type==='stomp'){damage(g,k.x,k.z,12,65);g.cool.stomp=7;effect(g,'stomp',k.x,k.z,12);}
  if(c.type==='breath'){for(const b of [...g.buildings,...g.units]){const dx=b.x-k.x,dz=b.z-k.z,d=Math.hypot(dx,dz);if(d<28&&d>0&&(dx*fx+dz*fz)/d>.86)hit(g,b,75);}g.cool.breath=12;effect(g,'breath',k.x+fx*14,k.z+fz*14,12,9,{originX:k.x,originZ:k.z,yaw:k.yaw});}
 }else if(role==='defender'){
  if(c.type==='order'){
   const u=g.units.find(u=>u.id===c.id&&u.hp>0);if(!u)return 'Unit no longer available';if(u.type==='turret')return 'Turrets are stationary';
   if(c.mode==='auto'){u.order=null;return;}if(c.mode==='hold'){u.order={x:u.x,z:u.z};return;}
   if(c.mode!=='move'||![c.x,c.z].every(Number.isFinite))return 'Invalid destination';
   u.order={x:clamp(c.x,-34,34),z:clamp(c.z,-34,34)};return;
  }
  if(!Object.hasOwn(COST,c.type)||!Number.isFinite(c.x)||!Number.isFinite(c.z))return 'Invalid order';
  if(!g.rules.tools.includes(c.type))return 'This unit or ability unlocks in a later chapter';
  if(g.credits<COST[c.type])return 'Not enough credits';if((g.cool[c.type]||0)>0)return 'Ability cooling down';
  const x=clamp(c.x,-34,34),z=clamp(c.z,-34,34);
  if(c.type==='repair'){const b=g.buildings.filter(b=>b.hp>0&&b.hp<100&&distance(b,{x,z})<7).sort((a,b)=>distance(a,{x,z})-distance(b,{x,z}))[0];if(!b)return 'Tap a damaged standing building';b.hp=Math.min(100,b.hp+(facilityOnline(g,'hospital')?45:22));effect(g,'repair',b.x,b.z,5);}
  if(['tank','turret','crew'].includes(c.type)){if(g.units.length>=20)return 'Unit limit reached (20)';g.units.push({id:g.nextId++,type:c.type,x,z,hp:(c.type==='tank'?90:c.type==='crew'?65:140)*g.rules.unit,maxHp:(c.type==='tank'?90:c.type==='crew'?65:140)*g.rules.unit,fire:0,order:null});}
  if(c.type==='missile'){if(distance(g.kaiju,{x,z})<9)hurtKaiju(g,130,{x,z});g.cool.missile=10;effect(g,'missile',x,z,9);}
  if(c.type==='freeze'){if(distance(g.kaiju,{x,z})<10)g.slow=5;g.cool.freeze=14;effect(g,'freeze',x,z,10);}
  g.credits-=COST[c.type];
 }else return 'Not a player';
 checkWin(g);
}
export function checkWin(g){const destroyed=g.buildings.filter(b=>b.hp<=0).length;if(g.rules.facilitiesWin&&g.buildings.filter(b=>b.facility).every(b=>b.hp<=0)){g.winner='kaiju';g.reason='All three critical facilities destroyed';}else if(destroyed>=g.rules.target){g.winner='kaiju';g.reason=g.rules.target+' city blocks destroyed';}else if(g.kaiju.hp<=0||g.remaining<=0){g.winner='defender';g.reason=g.kaiju.hp<=0?'Kaiju defeated':'Evacuation completed';}if(g.winner)g.phase='ended';}
export function tick(g,dt){
 if(g.phase!=='playing')return;g.elapsed+=dt;g.remaining=Math.max(0,g.remaining-dt*(facilityOnline(g,'evac')?1:.5));g.credits=Math.min(200,g.credits+g.rules.income*dt);g.slow=Math.max(0,g.slow-dt);for(const key in g.cool)g.cool[key]=Math.max(0,g.cool[key]-dt);g.punchCooldown=g.punchCooldown.map(v=>Math.max(0,v-dt));
 runAI(g,dt);if(g.phase!=='playing')return;
 g.inputAge+=dt;const k=g.kaiju;if(g.inputAge>=.5)k.blocking=false;k.stamina=clamp(k.stamina+(k.blocking?-18:12)*dt,0,100);if(k.stamina===0)k.blocking=false;if(g.inputAge<.5){const speed=(g.slow>0?g.rules.speed*.4:g.rules.speed)*(k.blocking?.45:1);k.x=clamp(k.x+g.input.x*speed*dt,-36,36);k.z=clamp(k.z+g.input.z*speed*dt,-36,36);k.yaw=g.input.yaw;}
 for(const car of g.cars){
  if(car.status==='held'){const p=g.hands[car.hand];Object.assign(car,p&&g.elapsed-p.time<.3?worldHand(g,p):fallbackHand(g,car.hand));}
  if(car.status==='flying'){
   const a={x:car.x,y:car.y,z:car.z};car.vy-=12*dt;car.x+=car.vx*dt;car.y+=car.vy*dt;car.z+=car.vz*dt;car.life+=dt;
   const contact=collision(g,a,car,.7);
   if(contact||car.y<=.6||car.life>6||Math.abs(car.x)>45||Math.abs(car.z)>45){
    if(contact){car.x=a.x+(car.x-a.x)*contact.t;car.y=a.y+(car.y-a.y)*contact.t;car.z=a.z+(car.z-a.z)*contact.t;}
    damage(g,car.x,car.z,5,70);effect(g,'carImpact',car.x,car.z,5,Math.max(.6,car.y));car.status='wreck';car.y=.35;car.life=0;
   }
  }
 }
 for(const u of g.units){
  if(u.hp<=0)continue;const d=distance(u,k);
  if(u.type==='crew'){
   const damaged=g.buildings.filter(b=>b.hp>0&&b.hp<b.max).sort((a,b)=>distance(a,u)-distance(b,u));const target=u.order||damaged[0];if(target){const travel=distance(u,target);if(travel>(u.order?.2:4)){const step=Math.min(travel,3.5*dt);u.x+=(target.x-u.x)/travel*step;u.z+=(target.z-u.z)/travel*step;}}
   u.fire-=dt;const b=damaged.find(b=>distance(b,u)<6);if(b&&u.fire<=0){b.hp=Math.min(b.max,b.hp+(facilityOnline(g,'hospital')?8:4));u.fire=1;effect(g,'repair',b.x,b.z,3,1);}if(d<2)u.hp-=35*g.rules.power*dt;continue;
  }
  if(u.type==='tank'){const target=u.order||k,travel=distance(u,target);if(travel>(u.order?.2:9)){const step=Math.min(travel,3*dt);u.x+=(target.x-u.x)/travel*step;u.z+=(target.z-u.z)/travel*step;}}
  u.fire-=dt;if(d<(u.type==='tank'?18:25)&&u.fire<=0){hurtKaiju(g,u.type==='tank'?9:14,u);u.fire=u.type==='turret'&&!facilityOnline(g,'power')?2:1;effect(g,'shot',u.x,u.z,1,1,{targetX:k.x,targetZ:k.z,targetY:8});}
  if(d<2)u.hp-=35*g.rules.power*dt;
 }
 g.units=g.units.filter(u=>u.hp>0);for(const e of g.effects)e.ttl-=dt;g.effects=g.effects.filter(e=>e.ttl>0);
 
 checkWin(g);
}
export function snapshot(g){const {input,inputAge,hands,punchCooldown,ai,...s}=g;return s;}


// Both bots use the same validated commands and resource/cooldown rules as humans.
function runAI(g,dt){
 if(!g.botRole)return;const ai=g.ai,k=g.kaiju;
 if(g.botRole==='defender'){
  if(g.elapsed<ai.next)return;ai.next=g.elapsed+(g.mode==='campaign'?4:2.5);
  const damaged=g.buildings.filter(b=>b.hp>0&&b.hp<55).sort((a,b)=>a.hp-b.hp)[0];
  if(damaged&&g.rules.tools.includes('repair')&&g.credits>=65){command(g,'defender',{type:'repair',x:damaged.x,z:damaged.z});return;}
  if(g.units.length>=10)return;
  const choices=g.rules.tools.filter(t=>['tank','turret','crew'].includes(t)),type=choices[Math.floor(g.elapsed/4)%choices.length];
  const anchor=type==='crew'?(damaged||g.buildings.find(b=>b.facility==='hospital')):k;
  const angle=g.elapsed*.7,x=clamp(anchor.x+Math.cos(angle)*15,-32,32),z=clamp(anchor.z+Math.sin(angle)*15,-32,32);command(g,'defender',{type,x,z});return;
 }
 let target=g.buildings.find(b=>b.id===ai.targetId&&b.hp>0);
 if(!target){target=g.buildings.filter(b=>b.hp>0).sort((a,b)=>distance(a,k)-(g.rules.facilitiesWin&&a.facility?9:0)-distance(b,k)+(g.rules.facilitiesWin&&b.facility?9:0))[0];ai.targetId=target?.id;}
 if(!target)return;
 const dx=target.x-k.x,dz=target.z-k.z,d=Math.hypot(dx,dz),yaw=Math.atan2(-dx,-dz);
 command(g,'kaiju',{type:'move',x:d>5?dx/Math.max(1,d):0,z:d>5?dz/Math.max(1,d):0,yaw});k.yaw=yaw;
 if(ai.intent){if(g.elapsed>=ai.resolveAt){command(g,'kaiju',{type:ai.intent});ai.intent=null;ai.next=g.elapsed+g.rules.think;}return;}
 if(d>8||g.elapsed<ai.next)return;
 const nearby=g.units.filter(u=>distance(u,k)<11).length;
 const attack=g.rules.attacks.includes('stomp')&&nearby>1&&g.cool.stomp===0?'stomp':g.rules.attacks.includes('breath')&&g.cool.breath===0?'breath':'smash';
 if(g.cool[attack]>0||k.stamina<ATTACK_COST[attack])return;
 ai.intent=attack;ai.resolveAt=g.elapsed+.85;effect(g,'warning',target.x,target.z,attack==='stomp'?12:7,0,{attack,ttl:.85});
}
