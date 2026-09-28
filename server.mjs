import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {WebSocketServer} from 'ws';
import {createGame,start,command,tick,snapshot,dropHands} from './game.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'};
function handler(req,res){let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);}catch{res.writeHead(400).end();return;}const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)||(!pathname.startsWith('/node_modules/three/')&&!['/','/index.html','/client.js','/sprites.js','/creature.js','/interface.js','/campaign.mjs','/qr.js','/command.css','/assets/ad-poster.png','/style.css','/assets/hand.png','/assets/monster.png','/assets/turret.png','/assets/facade.png','/assets/building.png'].includes(pathname))){res.writeHead(404).end();return;}fs.readFile(file,(e,data)=>{res.writeHead(e?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(e?'Not found':data);});}
const server=process.env.TLS_KEY&&process.env.TLS_CERT?https.createServer({key:fs.readFileSync(process.env.TLS_KEY),cert:fs.readFileSync(process.env.TLS_CERT)},handler):http.createServer(handler);
const wss=new WebSocketServer({server,maxPayload:2048});const rooms=new Map();
const send=(ws,data)=>{if(ws.readyState===1)ws.send(JSON.stringify(data));};
wss.on('connection',ws=>{let room,role,last=0,count=0;ws.alive=true;ws.on('pong',()=>ws.alive=true);
 ws.on('message',raw=>{let c;try{c=JSON.parse(raw);}catch{return;}if(!c||typeof c!=='object')return;const now=Date.now();if(now-last>1000){last=now;count=0;}if(++count>60)return;
 if(c.type==='join'){if(room)return;if(!/^[A-Z0-9]{3,12}$/.test(c.room)||!['kaiju','defender'].includes(c.role)){send(ws,{error:'Use 3–12 letters or numbers for room code'});return;}if(c.create===false&&!rooms.has(c.room)){send(ws,{error:'Room not found. Ask your opponent to create it first.'});return;}if(c.create===true&&rooms.has(c.room)){send(ws,{error:'That room already exists. Choose Join or generate a new code.'});return;}if(!rooms.has(c.room)){if(rooms.size>=100){send(ws,{error:'Server full'});return;}rooms.set(c.room,{game:createGame({mode:c.mode,chapter:c.chapter,humanRole:c.role}),players:{},touched:now});}const r=rooms.get(c.room);if(r.game.botRole===c.role){send(ws,{error:'This is a solo session. The other side is controlled by AI.'});return;}if(r.players[c.role]){send(ws,{error:'That role is occupied. Choose the other role or another room.'});return;}room=r;role=c.role;room.players[role]=ws;room.touched=now;send(ws,{joined:true,role,room:c.room});return;}
 if(!room)return;
 if(c.type==='start'){
  if(room.game.phase!=='lobby')return;
  if(room.game.mode!=='quick'&&role===room.game.humanRole)start(room.game);
  else if(room.players.kaiju&&room.players.defender)start(room.game);
  else if(c.practice){room.game.humanRole=role;room.game.botRole=role==='kaiju'?'defender':'kaiju';start(room.game);}
  else send(ws,{error:'Invite your opponent, or choose Solo quick match.'});return;
 }
 if(c.type==='reset'||c.type==='next'){
  const g=room.game;if(g.phase!=='ended')return;
  if(c.type==='next'&&(g.mode!=='campaign'||g.winner!==g.humanRole||role!==g.humanRole||g.chapter>=4))return;
  room.game=createGame({mode:g.mode,chapter:g.chapter+(c.type==='next'?1:0),humanRole:g.humanRole||role});return;
 }
 if(room.game.phase==='playing'&&isPaused(room))return;
 const error=command(room.game,role,c);if(error&&c.type!=='move')send(ws,{error});
 });ws.on('close',()=>{if(room&&room.players[role]===ws){delete room.players[role];if(role==='kaiju')dropHands(room.game);room.game.input={x:0,z:0,yaw:room.game.kaiju.yaw};room.touched=Date.now();}});
});
setInterval(()=>{for(const [code,r]of rooms){const players={kaiju:!!r.players.kaiju,defender:!!r.players.defender};const paused=r.game.phase==='playing'&&isPaused(r);if(!paused)tick(r.game,.05);const data={state:snapshot(r.game),players,paused};for(const ws of Object.values(r.players))send(ws,data);if(!players.kaiju&&!players.defender&&Date.now()-r.touched>600000)rooms.delete(code);}},50);
setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},10000);
const port=Number(process.env.PORT)||3000;server.listen(port,'0.0.0.0',()=>console.log(`Kaiju City running on ${server instanceof https.Server?'https':'http'}://localhost:${port}`));


function isPaused(room){return ['kaiju','defender'].some(role=>!room.players[role]&&room.game.botRole!==role);}
