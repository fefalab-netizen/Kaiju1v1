import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3} from 'three';
import {createHand} from './creature.js';
import {createGame,start,command} from './game.mjs';
test('3D hands mirror, curl toward palm on grab and reopen on release',()=>{
 const right=createHand(),left=createHand(true);
 const open=new Box3().setFromObject(right),mirrored=new Box3().setFromObject(left);
 assert.ok(Math.abs(open.min.x+mirrored.max.x)<1e-6);
 const openSize=open.getSize(new Vector3());assert.ok(openSize.z>.5);
 for(let i=0;i<60;i++)right.userData.animate(true,1/60);
 const closed=new Box3().setFromObject(right).getSize(new Vector3());
 assert.ok(closed.y<openSize.y*.85,'fingers fold down');
 assert.ok(closed.z>openSize.z,'fingers wrap into palm side');
 for(let i=0;i<120;i++)right.userData.animate(false,1/60);
 assert.ok(Math.abs(new Box3().setFromObject(right).getSize(new Vector3()).y-openSize.y)<.03);
});
test('breath event retains authoritative origin and facing for fire stream',()=>{
 const g=createGame();start(g);g.kaiju.yaw=1.2;command(g,'kaiju',{type:'breath'});
 const e=g.effects.find(e=>e.type==='breath');assert.equal(e.originX,g.kaiju.x);assert.equal(e.originZ,g.kaiju.z);assert.equal(e.yaw,1.2);
 command(g,'kaiju',{type:'breath'});assert.equal(g.effects.filter(e=>e.type==='breath').length,1);
});
