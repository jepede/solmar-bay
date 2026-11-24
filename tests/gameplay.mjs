import assert from 'node:assert/strict';
import {createWorld,stepWorld,respawn} from '../game/src/world.js';
import {scriptedInput} from '../game/src/input.js';
import {stageShot} from '../game/src/shots.js';
import {POI} from '../game/src/config.js';
import {currentStage,MISSIONS,startSideJob} from '../game/src/missions.js';
import {spawnPolice} from '../game/src/police.js';
import {saveGame,loadSave} from '../game/src/save.js';
const tick=(w, v={},count=1)=>{for(let i=0;i<count;i++)stepWorld(w,scriptedInput(v),1/60);};
for(const name of ['start','streets','chase','mission']) {
 const w=createWorld(27),screen=stageShot(name,w);

 assert(!w.terminal,name+' should remain playable');
 if(name==='chase'){assert(w.player.car);assert.equal(w.wanted.stars,3);assert(w.player.car.speed>300);}
}
const w=createWorld(27);
tick(w,{pressed:['KeyF']});assert.equal(w.mission.stage,1,'talk to Inez');
tick(w,{pressed:['KeyE']});assert(w.player.car,'steal starter car');assert.equal(w.mission.stage,2);assert(w.wanted.stars>0);
const car=w.player.car;
tick(w,{keys:['KeyW']},120);assert(Math.abs(car.speed)>100,'acceleration');
car.speed=0;tick(w,{pressed:['KeyE']});assert(!w.player.car,'exit');
tick(w,{pressed:['Digit2']});assert.equal(w.player.weapon,'pistol');
const ammo=w.player.ammo;tick(w,{fire:true,aim:true,mouseX:900,mouseY:400});assert.equal(w.player.ammo,ammo-1);
tick(w,{pressed:['KeyR']});tick(w,{},80);assert.equal(w.player.ammo,12,'reload');
const store=new Map();globalThis.localStorage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)};
assert(saveGame(w));const loaded=loadSave();assert(loaded);const continued=createWorld(loaded.seed,loaded);assert.equal(continued.player.cash,w.player.cash);assert.equal(continued.mission.stage,w.mission.stage);
console.log('PASS movement, theft, driving, exit, pistol, reload, save/continue');
const story=createWorld(91);story.player.invulnerable=10000;story.wanted.spawn=100000;
let transitions=0;
while(!story.mission.finished && transitions<100) {
 const s=currentStage(story), before=story.mission.index+':'+story.mission.stage;
 if(s.target){Object.assign(story.player,POI[s.target]); if(story.player.car)Object.assign(story.player.car,POI[s.target]);}
 if(s.type==='steal'||s.type==='drive') {
  if(!story.player.car){const c=story.cars.find(c=>c.id==='tideway-coupe');c.x=story.player.x;c.y=story.player.y;c.speed=0;tick(story,{pressed:['KeyE']});}
  tick(story);
 } else if(s.type==='talk'||s.type==='collect')tick(story,{pressed:['KeyF']});
 else if(s.type==='upload') {
  if(story.player.car){story.player.car.driver=null;story.player.car=null;}
  tick(story,{keys:['KeyF']},Math.ceil(s.duration*60)+3);
 } else if(s.type==='combat'){
  tick(story);
  // Combat is separately verified below; isolate mission success from aiming skill.
  for(const e of story.enemies)e.health=0;
  tick(story);
 } else if(s.type==='escape'){story.wanted.heat=0;story.wanted.stars=0;story.police=[];tick(story);}
 transitions++;
 const after=story.mission.index+':'+story.mission.stage;
 assert.notEqual(after,before,'mission stuck: '+before+' '+s.type);
}
assert(story.mission.finished);assert.equal(story.mission.completed,6);assert.equal(story.player.cash,350+MISSIONS.reduce((sum,m)=>sum+m.reward,0));
console.log('PASS all six mission chains, objectives and rewards ('+transitions+' stages)');
for(let i=0;i<3;i++){
 const jobs=createWorld(i);jobs.jobSerial=i;startSideJob(jobs);const reward=jobs.sideJob.reward;
 const c=jobs.cars[0];jobs.player.car=c;c.driver='player';c.speed=0;
 while(jobs.sideJob){const p=POI[jobs.sideJob.route[jobs.sideJob.stage]];Object.assign(c,p);Object.assign(jobs.player,p);tick(jobs);}
 assert.equal(jobs.player.cash,350+reward);
}
console.log('PASS courier, taxi and checkpoint dispatch rewards');
const bust=createWorld(81);bust.player.x=4020;bust.player.y=2000;bust.crime(50,'test');bust.wanted.spawn=999;
spawnPolice(bust,{x:4020,y:2022});tick(bust,{},300);assert.equal(bust.terminal,'busted');respawn(bust);assert.equal(bust.terminal,null);assert.equal(bust.player.health,100);
for(let i=0;i<10&&!bust.terminal;i++){bust.player.invulnerable=0;bust.hurt(20);}
assert.equal(bust.terminal,'wasted');respawn(bust);assert.equal(bust.player.health,100);
console.log('PASS busted, wasted and recovery');
const clear=createWorld(3);clear.player.x=2000;clear.player.y=2000;clear.crime(250,'test');clear.wanted.spawn=999;
tick(clear,{},1800);assert.equal(clear.wanted.stars,0,'lose heat when unseen');
console.log('PASS wanted decay after staying out of sight');

// Verify combat with real hits and moving projectiles.
{
const w=createWorld(27);w.player.invulnerable=999;w.mission.index=2;w.mission.stage=1;w.wanted.spawn=999;
const tick=(values={},count=1)=>{for(let i=0;i<count;i++)stepWorld(w,scriptedInput(values),1/60);};
tick();
let target=w.enemies[0];
for(let hit=0;hit<3;hit++){
 w.player.x=target.x;w.player.y=target.y+34;w.player.angle=-Math.PI/2;
 tick({keys:['Space']});tick({},27);
}assert(target.health<=0,'punches defeat guard');
w.player.weapon='pistol';
for(const enemy of w.enemies.slice(1)){
 for(let shot=0;shot<4&&enemy.health>0;shot++){
  w.player.x=enemy.x;w.player.y=enemy.y+65;w.player.cooldown=0;
  w.camera.x=w.player.x;w.camera.y=w.player.y;
  tick({aim:true,fire:true,mouseX:640,mouseY:330});
  tick({},16);
 }
 assert(enemy.health<=0,'pistol defeats guard');
}
tick();assert.equal(w.mission.stage,2,'defeated guards unlock evidence');
assert(w.pickups.length>0,'defeated guards drop useful pickups');
console.log('PASS actual melee hits, pistol projectiles, guard damage, loot and combat objective');

}
