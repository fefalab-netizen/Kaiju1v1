import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {WebSocket} from 'ws';

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn){const deadline=Date.now()+6000;while(Date.now()<deadline){if(fn())return;await delay(25);}throw Error('Timed out waiting for network state');}
test('two-player network: cars, unit orders, role isolation, disconnect pause and reconnect', {timeout:20000},async()=>{
 const port=23000+Math.floor(Math.random()*10000);
 const child=spawn(process.execPath,[fileURLToPath(new URL('./server.mjs',import.meta.url))],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 const sockets=[];let ready=false,bootError='';
 child.stdout.on('data',d=>{if(d.toString().includes('running'))ready=true;});child.stderr.on('data',d=>bootError+=d);
 try{
  await until(()=>ready||bootError);assert.equal(bootError,'');
  const asset=await fetch('http://localhost:'+port+'/sprites.js');assert.equal(asset.status,200);assert.match(await asset.text(),/export const sprites/);
  for(const name of ['hand','monster','turret','building','facade']){const png=await fetch('http://localhost:'+port+'/assets/'+name+'.png');assert.equal(png.status,200);assert.equal(png.headers.get('content-type'),'image/png');const bytes=new Uint8Array(await png.arrayBuffer());assert.deepEqual([...bytes.slice(0,8)],[137,80,78,71,13,10,26,10]);}
  async function join(role){const ws=new WebSocket('ws://localhost:'+port);sockets.push(ws);const client={ws,state:null,errors:[],joined:false,paused:false};ws.on('message',raw=>{const m=JSON.parse(raw);if(m.state){client.state=m.state;client.paused=m.paused;}if(m.error)client.errors.push(m.error);if(m.joined)client.joined=true;});await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});client.send=c=>ws.send(JSON.stringify(c));client.send({type:'join',room:'NETWORK',role});await until(()=>client.joined||client.errors.length);return client;}
  const k=await join('kaiju'),d=await join('defender'),duplicate=await join('kaiju');assert.match(duplicate.errors[0],/occupied/);duplicate.ws.close();
  k.send({type:'start'});await until(()=>k.state?.phase==='playing');
  k.send({type:'grab',hand:1});await until(()=>d.state?.cars.some(c=>c.status==='held'));k.send({type:'throw',hand:1});await until(()=>d.state.cars.some(c=>c.status==='wreck'));assert.ok(d.state.buildings.some(b=>b.hp<100));
  d.send({type:'tank',x:-30,z:-30});await until(()=>d.state.units.length===1);const id=d.state.units[0].id;
  k.send({type:'order',id,mode:'move',x:30,z:30});await until(()=>k.errors.length>0);assert.equal(d.state.units[0].order,null);
  d.send({type:'order',id,mode:'move',x:-24,z:-30});await until(()=>d.state.units[0].order?.x===-24);await until(()=>d.state.units[0].x>-29);
  d.send({type:'order',id,mode:'hold'});await until(()=>Math.abs(d.state.units[0].x-d.state.units[0].order.x)<.2);
  d.ws.close();await until(()=>k.paused);const hp=k.state.buildings.map(b=>b.hp),time=k.state.remaining;k.send({type:'stomp'});await delay(150);assert.deepEqual(k.state.buildings.map(b=>b.hp),hp);assert.equal(k.state.remaining,time);
  const rejoined=await join('defender');await until(()=>rejoined.state?.phase==='playing'&&!rejoined.paused);assert.equal(rejoined.state.units[0].id,id);assert.ok(!rejoined.errors.length);
 }finally{for(const ws of sockets)ws.terminate();child.kill();await new Promise(resolve=>{if(child.exitCode!==null)resolve();else child.once('exit',resolve);});}
});
