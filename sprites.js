// Local generated sprite art with small procedural fallbacks for failed downloads.
function canvas(w=64,h=64){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function sprite(draw){const c=canvas(),p=c.getContext('2d');p.imageSmoothingEnabled=false;draw(p);return c;}
const rect=(p,c,x,y,w,h)=>{p.fillStyle=c;p.fillRect(x,y,w,h);};
export const sprites={
 monster:sprite(p=>{
  rect(p,'#132b28',27,37,12,22);rect(p,'#357a59',29,38,8,18);rect(p,'#14282a',12,22,40,23);
  rect(p,'#204b3d',17,17,30,32);rect(p,'#50ad77',21,12,22,32);rect(p,'#82d995',25,9,14,20);
  for(let y=26;y<51;y+=8){rect(p,'#eeac5d',30,y,5,5);}
  rect(p,'#2c7053',8,23,12,17);rect(p,'#2c7053',44,23,12,17);
  for(const x of [8,13,47,52])rect(p,'#e6e2bc',x,20,3,8);
  rect(p,'#192527',20,15,8,6);rect(p,'#192527',36,15,8,6);
  rect(p,'#ff7c49',22,16,4,3);rect(p,'#ff7c49',38,16,4,3);
  rect(p,'#235e45',15,43,12,10);rect(p,'#235e45',37,43,12,10);
  rect(p,'#bce2b1',16,51,11,3);rect(p,'#bce2b1',37,51,11,3);
 }),
 turret:sprite(p=>{
  rect(p,'#0c1828',10,25,44,30);rect(p,'#31516d',13,28,38,24);
  rect(p,'#75acc2',15,29,34,5);rect(p,'#152b42',19,23,26,24);
  rect(p,'#63b1d9',22,21,20,20);rect(p,'#b0e2ec',23,22,17,4);
  rect(p,'#101f2c',27,5,10,29);rect(p,'#78bad1',29,5,6,29);
  rect(p,'#defbff',29,6,6,5);rect(p,'#ffa968',45,42,5,7);
  for(const x of [12,47])for(const y of [31,48])rect(p,'#b4ced4',x,y,4,4);
 }),
 tank:sprite(p=>{
  rect(p,'#0b1721',12,13,12,40);rect(p,'#0b1721',40,13,12,40);
  for(let y=15;y<52;y+=7){rect(p,'#667b86',13,y,9,3);rect(p,'#667b86',42,y,9,3);}
  rect(p,'#407a9c',23,15,18,35);rect(p,'#7dbfd5',24,16,16,5);rect(p,'#24516a',24,40,16,8);
  rect(p,'#9ad5e3',24,24,16,14);rect(p,'#24465d',29,3,7,28);rect(p,'#c3e9e6',30,3,4,25);
 }),
 hand:sprite(p=>{
  rect(p,'#152d27',15,23,39,33);rect(p,'#173e30',22,48,26,16);
  rect(p,'#42875b',17,27,35,25);rect(p,'#66ae73',21,23,27,21);
  for(const [x,y]of [[14,19],[24,13],[35,12],[46,17]]){
   rect(p,'#183d2c',x,y,11,20);rect(p,'#62a86d',x+2,y+3,7,15);
   rect(p,'#dbe6bf',x+2,y-5,7,8);rect(p,'#fff6d5',x+3,y-7,4,5);
   rect(p,'#32684b',x+2,y+12,7,3);
  }
  rect(p,'#214a35',5,36,16,14);rect(p,'#87ba78',7,37,13,8);rect(p,'#edeac3',4,34,6,6);
  for(const [x,y]of [[24,36],[35,32],[39,44],[29,48]]){rect(p,'#2b6345',x,y,6,4);rect(p,'#8ac187',x,y,4,2);}
 }),
 building:sprite(p=>{
  rect(p,'#0c1826',8,8,48,48);rect(p,'#355468',10,10,44,44);
  rect(p,'#74a1ae',10,10,44,5);rect(p,'#233f50',15,18,34,31);
  rect(p,'#527e8c',17,20,30,25);rect(p,'#8fc3c3',20,23,11,8);
  rect(p,'#152c3a',35,24,8,17);for(let y=25;y<42;y+=5)rect(p,'#73949d',36,y,6,2);
  rect(p,'#bce6d4',19,41,10,3);
 })
};
let facadeArt=null;
export const assetsReady=Promise.all(['hand','monster','turret','building','facade'].map(name=>new Promise(resolve=>{
 const img=new Image();img.onload=()=>{if(name==='facade')facadeArt=img;else sprites[name]=img;resolve();};img.onerror=()=>{console.warn('Using fallback art for '+name);resolve();};img.src='/assets/'+name+'.png';
}))).then(()=>{
 const left=canvas(512,512),p=left.getContext('2d');p.translate(512,0);p.scale(-1,1);p.drawImage(sprites.hand,0,0,512,512);sprites.handLeft=left;
});
export function facade(variant=0,damage=0){
 const c=canvas(256,512),p=c.getContext('2d');p.scale(4,4);
 const colors=['#4f747f','#4c6278','#717b83'];rect(p,colors[variant%3],0,0,64,128);
 rect(p,'#243e51',0,0,5,128);rect(p,'#8cb2b2',57,0,7,128);
 for(let y=9;y<124;y+=16){rect(p,'#324b5b',5,y+10,52,4);for(let x=10;x<55;x+=13){const lit=(x+y+variant*7)%5!==0;rect(p,'#142b3d',x,y,8,10);rect(p,lit?'#acd4bd':'#426276',x+1,y+1,6,7);rect(p,lit?'#efd39c':'#65898e',x+1,y+1,6,2);}}
 rect(p,'#c1cebe',0,0,64,4);
 if(facadeArt){p.drawImage(facadeArt,0,0,64,128);if(variant){p.fillStyle=variant===1?'#12375230':'#bbaa7730';p.fillRect(0,0,64,128);}}
 if(damage>0){p.strokeStyle='#16212b';p.lineWidth=damage===2?4:2;p.beginPath();p.moveTo(40,0);p.lineTo(29,34);p.lineTo(37,48);p.lineTo(20,70);p.lineTo(27,98);p.lineTo(15,128);p.stroke();p.beginPath();p.moveTo(30,35);p.lineTo(13,46);p.lineTo(8,65);p.stroke();}
 if(damage===2){rect(p,'#182632',34,79,17,25);rect(p,'#ff8c50',36,94,5,9);rect(p,'#e3be68',43,91,4,8);}
 return c;
}
