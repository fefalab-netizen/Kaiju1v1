export const CHAPTERS=[
 {name:'01 · First Contact',story:'A young creature reaches the outskirts. A single patrol is the city’s first line of defense.',brief:'Learn movement, punches and tank orders. Destroy 6 blocks as kaiju; defeat it or finish evacuation as commander.',hp:350,power:.35,unit:.45,income:2,credits:35,speed:2.3,time:120,target:6,attacks:['smash'],tools:['tank','repair'],think:3.2},
 {name:'02 · Growing Threat',story:'The creature grows stronger. Emergency crews mobilize as the first districts fall.',brief:'Stomp, repair crews and field repairs unlock. The kaiju needs 12 destroyed blocks.',hp:500,power:.5,unit:.6,income:3.5,credits:50,speed:3,time:140,target:12,attacks:['smash','stomp'],tools:['tank','crew','repair'],think:2.7},
 {name:'03 · Hold the Line',story:'The defense establishes fixed positions. The kaiju must break through the fortified streets.',brief:'Turrets unlock. Stronger patrols and a stronger monster face off over 20 blocks.',hp:700,power:.7,unit:.75,income:5,credits:65,speed:3.8,time:160,target:20,attacks:['smash','stomp'],tools:['tank','crew','repair','turret'],think:2.2},
 {name:'04 · Firestorm',story:'The creature awakens its fire breath. Command authorizes freezing strikes to buy evacuation time.',brief:'Fire breath and freeze unlock. The kaiju needs 24 blocks; keep defenses spread out.',hp:850,power:.85,unit:.9,income:6,credits:80,speed:4.5,time:180,target:24,attacks:['smash','stomp','breath'],tools:['tank','crew','repair','turret','freeze'],think:1.7},
 {name:'05 · City at War',story:'The creature has reached full strength. Every weapon and every district now matters.',brief:'Full Quick Match rules: destroy 29 blocks or all three facilities; defenders defeat the kaiju or complete evacuation.',hp:1000,power:1,unit:1,income:7,credits:100,speed:5,time:180,target:29,attacks:['smash','stomp','breath'],tools:['tank','crew','repair','turret','freeze','missile','robot'],think:1.2}
];
export function configureGame(g,options={}){
 const mode=['quick','solo','campaign'].includes(options.mode)?options.mode:'quick';
 const chapter=Number.isInteger(options.chapter)?Math.max(0,Math.min(CHAPTERS.length-1,options.chapter)):0;
 const humanRole=options.humanRole==='defender'?'defender':'kaiju';
 const profile=CHAPTERS[mode==='campaign'?chapter:CHAPTERS.length-1];
 g.mode=mode;g.chapter=mode==='campaign'?chapter:null;g.humanRole=mode==='quick'?null:humanRole;
 g.botRole=mode==='quick'?null:humanRole==='kaiju'?'defender':'kaiju';g.bot=g.botRole==='defender';
 g.rules={...profile,facilitiesWin:mode!=='campaign'||chapter===CHAPTERS.length-1};
 g.kaiju.hp=g.kaiju.maxHp=profile.hp;g.credits=profile.credits;g.remaining=profile.time;
 const decks=[
 ['tank','tank','repair','tank','tank','repair','tank','tank'],
 ['tank','crew','tank','repair','tank','crew','tank','repair'],
 ['tank','turret','crew','tank','repair','turret','tank','repair'],
 ['tank','freeze','turret','crew','tank','repair','turret','tank'],
 ['tank','turret','freeze','crew','missile','tank','repair','robot']
 ];
 const deck=decks[mode==='campaign'?chapter:4];
 g.hand=deck.slice(0,3);g.deck=deck.slice(3);g.drawQueue=[];g.robotUsed=false;
 g.ai={next:0,targetId:null,intent:null,resolveAt:0};return g;
}
