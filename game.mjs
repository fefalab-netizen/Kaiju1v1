export const COST={tank:35,turret:50,repair:30,missile:60,freeze:40};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function createGame(){
 const buildings=[];for(let x=-3;x<=3;x++)for(let z=-3;z<=3;z++)if(x||z)buildings.push({id:buildings.length,x:x*8,z:z*8,h:5+((x*x+z*z*3)%5)*2,hp:100,max:100});
 return {phase:'lobby',remaining:180,buildings,units:[],effects:[],kaiju:{x:0,z:32,hp:1000,yaw:0},credits:100,cool:{smash:0,stomp:0,breath:0,missile:0,freeze:0},slow:0, input:{x:0,z:0,yaw:0},inputAge:0,nextId:1,winner:null,reason:'',bot:false};
}
export function start(g,bot=false){if(g.phase==='lobby'){g.phase='playing';g.bot=bot;}}
function effect(g,type,x,z,r){g.effects.push({id:g.nextId++,type,x,z,r,ttl:.7});}
function damage(g,x,z,r,power){for(const b of g.buildings)if(b.hp>0&&distance(b,{x,z})<r)b.hp=Math.max(0,b.hp-power);for(const u of g.units)if(distance(u,{x,z})<r)u.hp-=power;}
export function command(g,role,c){
 if(g.phase!=='playing')return 'Match is not running';
 if(role==='kaiju'){
  if(c.type==='move'){if(![c.x,c.z,c.yaw].every(Number.isFinite))return 'Invalid movement';let n=Math.max(1,Math.hypot(c.x,c.z));g.input={x:c.x/n,z:c.z/n,yaw:c.yaw};g.inputAge=0;return;}
  if(!['smash','stomp','breath'].includes(c.type))return 'Unknown attack';if(g.cool[c.type]>0)return 'Attack cooling down';
  const k=g.kaiju,fx=-Math.sin(k.yaw),fz=-Math.cos(k.yaw);
  if(c.type==='smash'){damage(g,k.x+fx*5,k.z+fz*5,7,45);g.cool.smash=.65;effect(g,'smash',k.x+fx*5,k.z+fz*5,7);}
  if(c.type==='stomp'){damage(g,k.x,k.z,12,65);g.cool.stomp=7;effect(g,'stomp',k.x,k.z,12);}
  if(c.type==='breath'){for(const b of [...g.buildings,...g.units]){const dx=b.x-k.x,dz=b.z-k.z,d=Math.hypot(dx,dz);if(d<28&&d>0&&(dx*fx+dz*fz)/d>.86)b.hp=Math.max(0,b.hp-75);}g.cool.breath=12;effect(g,'breath',k.x+fx*14,k.z+fz*14,12);}
 }else if(role==='defender'){
  if(!(c.type in COST)||!Number.isFinite(c.x)||!Number.isFinite(c.z))return 'Invalid order';
  if(g.credits<COST[c.type])return 'Not enough credits';if((g.cool[c.type]||0)>0)return 'Ability cooling down';
  const x=clamp(c.x,-34,34),z=clamp(c.z,-34,34);
  if(c.type==='repair'){const b=g.buildings.filter(b=>b.hp>0&&b.hp<100&&distance(b,{x,z})<7).sort((a,b)=>distance(a,{x,z})-distance(b,{x,z}))[0];if(!b)return 'Tap a damaged standing building';b.hp=Math.min(100,b.hp+45);effect(g,'repair',b.x,b.z,5);}
  if(c.type==='tank'||c.type==='turret'){if(g.units.length>=20)return 'Unit limit reached (20)';g.units.push({id:g.nextId++,type:c.type,x,z,hp:c.type==='tank'?90:140,fire:0});}
  if(c.type==='missile'){if(distance(g.kaiju,{x,z})<9)g.kaiju.hp=Math.max(0,g.kaiju.hp-130);g.cool.missile=10;effect(g,'missile',x,z,9);}
  if(c.type==='freeze'){if(distance(g.kaiju,{x,z})<10)g.slow=5;g.cool.freeze=14;effect(g,'freeze',x,z,10);}
  g.credits-=COST[c.type];
 }else return 'Not a player';
 checkWin(g);
}
export function checkWin(g){const destroyed=g.buildings.filter(b=>b.hp<=0).length;if(destroyed>=Math.ceil(g.buildings.length*.6)){g.winner='kaiju';g.reason='60% of the city destroyed';}else if(g.kaiju.hp<=0||g.remaining<=0){g.winner='defender';g.reason=g.kaiju.hp<=0?'Kaiju defeated':'City survived three minutes';}if(g.winner)g.phase='ended';}
export function tick(g,dt){
 if(g.phase!=='playing')return;g.remaining=Math.max(0,g.remaining-dt);g.credits=Math.min(200,g.credits+7*dt);g.slow=Math.max(0,g.slow-dt);for(const key in g.cool)g.cool[key]=Math.max(0,g.cool[key]-dt);
 g.inputAge+=dt;const k=g.kaiju;if(g.inputAge<.5){const speed=g.slow>0?2:5;k.x=clamp(k.x+g.input.x*speed*dt,-36,36);k.z=clamp(k.z+g.input.z*speed*dt,-36,36);k.yaw=g.input.yaw;}
 for(const u of g.units){const d=distance(u,k);if(u.type==='tank'&&d>9){u.x+=(k.x-u.x)/d*3*dt;u.z+=(k.z-u.z)/d*3*dt;}u.fire-=dt;if(d<(u.type==='tank'?18:25)&&u.fire<=0){k.hp=Math.max(0,k.hp-(u.type==='tank'?9:14));u.fire=1;effect(g,'shot',u.x,u.z,1);}if(d<2)u.hp-=35*dt;}
 g.units=g.units.filter(u=>u.hp>0);for(const e of g.effects)e.ttl-=dt;g.effects=g.effects.filter(e=>e.ttl>0);
 if(g.bot&&g.credits>=50&&g.units.length<10){const a=g.remaining*2;command(g,'defender',{type:'tank',x:Math.cos(a)*25,z:Math.sin(a)*25});}
 checkWin(g);
}
export function snapshot(g){const {input,inputAge,...s}=g;return s;}
