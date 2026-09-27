import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,start,command,tick,checkWin} from './game.mjs';
test('movement is normalized, bounded, and expires without input',()=>{const g=createGame();start(g);command(g,'kaiju',{type:'move',x:999,z:999,yaw:0});tick(g,.1);assert.ok(Math.hypot(g.kaiju.x,g.kaiju.z-32)<=.501);tick(g,1);const x=g.kaiju.x;tick(g,1);assert.equal(g.kaiju.x,x);});
test('attacks destroy structures and enforce cooldown',()=>{const g=createGame();start(g);g.kaiju.x=0;g.kaiju.z=29;const b=g.buildings.find(b=>b.x===0&&b.z===24);command(g,'kaiju',{type:'smash'});assert.equal(b.hp,55);command(g,'kaiju',{type:'smash'});assert.equal(b.hp,55);tick(g,.7);command(g,'kaiju',{type:'smash'});tick(g,.7);command(g,'kaiju',{type:'smash'});assert.equal(b.hp,0);});
test('defender spends credits, units attack, repair cannot resurrect',()=>{const g=createGame();start(g);command(g,'defender',{type:'turret',x:0,z:24});assert.equal(g.credits,50);tick(g,.05);assert.ok(g.kaiju.hp<1000);g.buildings[0].hp=0;const credits=g.credits;assert.ok(command(g,'defender',{type:'repair',x:g.buildings[0].x,z:g.buildings[0].z}));assert.equal(g.credits,credits);});
test('all win paths and no commands after end',()=>{for(const outcome of ['city','health','time']){const g=createGame();start(g);if(outcome==='city')g.buildings.slice(0,29).forEach(b=>b.hp=0);if(outcome==='health')g.kaiju.hp=0;if(outcome==='time')g.remaining=0;checkWin(g);assert.equal(g.winner,outcome==='city'?'kaiju':'defender');assert.equal(g.phase,'ended');assert.ok(command(g,'defender',{type:'tank',x:0,z:0}));}});
test('invalid numbers and unauthorized roles cannot change state',()=>{const g=createGame();start(g);assert.ok(command(g,'kaiju',{type:'move',x:NaN,z:0,yaw:0}));assert.ok(command(g,'spectator',{type:'tank',x:0,z:0}));assert.equal(g.units.length,0);});

test('physical punch requires speed, contact, reach, and a separate recovery period',()=>{
 const g=createGame();start(g);g.kaiju.z=29;const b=g.buildings.find(b=>b.x===0&&b.z===24);
 command(g,'kaiju',{type:'hands',poses:[{x:0,y:5,z:0},null]});tick(g,.05);
 command(g,'kaiju',{type:'hands',poses:[{x:0,y:5,z:-2},null]});assert.equal(b.hp,45);
 tick(g,.05);command(g,'kaiju',{type:'hands',poses:[{x:0,y:5,z:-3},null]});assert.equal(b.hp,45);
 tick(g,.5);command(g,'kaiju',{type:'hands',poses:[{x:0,y:5,z:-3},null]});assert.equal(b.hp,45);
 assert.ok(command(g,'kaiju',{type:'hands',poses:[{x:99,y:5,z:0},null]}));assert.equal(b.hp,45);
});
test('tracking jumps, stationary hands, and stale hand samples do not cause punches',()=>{
 const g=createGame();start(g);g.kaiju.z=29;const b=g.buildings.find(b=>b.x===0&&b.z===24);
 command(g,'kaiju',{type:'hands',poses:[{x:0,y:5,z:2},null]});tick(g,.05);
 command(g,'kaiju',{type:'hands',poses:[{x:0,y:5,z:-5},null]});assert.equal(b.hp,100);
 tick(g,.05);command(g,'kaiju',{type:'hands',poses:[{x:0,y:5,z:-5},null]});assert.equal(b.hp,100);
 tick(g,.5);command(g,'kaiju',{type:'hands',poses:[{x:0,y:5,z:-2},null]});assert.equal(b.hp,100);
});
test('car pickup, exclusive hands, bounded launch, impact damage, and no reuse',()=>{
 const g=createGame();start(g);const b=g.buildings.find(b=>b.x===0&&b.z===24);
 assert.equal(command(g,'kaiju',{type:'grab',hand:1}),undefined);const car=g.cars.find(c=>c.status==='held');
 assert.ok(car);assert.ok(command(g,'kaiju',{type:'grab',hand:1}));
 command(g,'kaiju',{type:'throw',hand:1,vx:99999,vy:99999,vz:99999});assert.ok(Math.abs(car.vz)<=28);
 for(let i=0;i<60&&car.status==='flying';i++)tick(g,.05);
 assert.equal(car.status,'wreck');assert.ok(b.hp<100);assert.ok(g.effects.some(e=>e.type==='carImpact'));
 g.cars=g.cars.filter(c=>c.id===car.id);assert.ok(command(g,'kaiju',{type:'grab',hand:1}));
});
test('tank orders move, stop, hold and resume auto pursuit without costing credits',()=>{
 const g=createGame();start(g);command(g,'defender',{type:'tank',x:-30,z:-30});const u=g.units[0],credits=g.credits;
 assert.equal(command(g,'defender',{type:'order',id:u.id,mode:'move',x:-24,z:-30}),undefined);assert.equal(g.credits,credits);
 for(let i=0;i<50;i++)tick(g,.05);assert.ok(Math.abs(u.x+24)<.25);assert.equal(u.z,-30);
 command(g,'defender',{type:'order',id:u.id,mode:'hold'});const x=u.x,z=u.z;tick(g,1);assert.equal(u.x,x);assert.equal(u.z,z);
 command(g,'defender',{type:'order',id:u.id,mode:'auto'});tick(g,.1);assert.ok(u.z>z);
 assert.ok(command(g,'defender',{type:'order',id:u.id,mode:'move',x:NaN,z:0}));
});
test('turrets stay fixed, only defender orders units, new round restores cars',()=>{
 const g=createGame();start(g);command(g,'defender',{type:'turret',x:10,z:10});const u=g.units[0];
 assert.ok(command(g,'defender',{type:'order',id:u.id,mode:'move',x:20,z:20}));
 assert.ok(command(g,'kaiju',{type:'order',id:u.id,mode:'move',x:20,z:20}));tick(g,.2);assert.equal(u.x,10);
 assert.ok(createGame().cars.every(c=>c.status==='parked'));assert.equal(createGame().cars.length,20);
});
