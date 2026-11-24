// Seeded directors stage starting conditions, then run the actual 60 Hz simulation.
// The final frame is frozen only after rendering; there is no screenshot-only artwork.
import { STEP } from './config.js';
import { scriptedInput } from './input.js';
import { stepWorld } from './world.js';
import { spawnPolice } from './police.js';
import { say } from './effects.js';

export function stageShot(name, world) {
  const idle = scriptedInput();
  if (name === 'start' || !['streets', 'chase', 'mission'].includes(name)) {
    for (let i = 0; i < 240; i++) stepWorld(world, idle, STEP, true);
    return 'title';
  }
  if (name === 'streets') {
    world.player.x = 3956; world.player.y = 2705;
    world.camera.x = world.player.x; world.camera.y = world.player.y;
    for (let i = 0; i < 165; i++) {
      stepWorld(world, scriptedInput({ keys: i < 94 ? ['KeyW'] : [] }), STEP);
    }
    say(world, 'INEZ VELA', 'Welcome back, Mara. Come by Tideway Garage. The neighborhood needs a favor.', 10);
    return 'play';
  }
  if (name === 'chase') {
    const car = world.cars.find(c => c.id === 'tideway-coupe');
    car.x = 4045; car.y = 3160; car.angle = -Math.PI / 2;
    world.player.x = car.x; world.player.y = car.y;
    world.mission.index = 4; world.mission.stage = 1;
    stepWorld(world, scriptedInput({ pressed: ['KeyE'] }), STEP);
    world.wanted.heat = 250; world.wanted.stars = 3;
    world.wanted.lastCrime = world.time; world.wanted.spawn = 30; world.police = [];
    for (let i = 0; i < 100; i++) stepWorld(world, scriptedInput({ keys: ['KeyW'] }), STEP);
    for (let i = 0; i < 4; i++) {
      const cop = spawnPolice(world, { x: car.x + (i % 2 ? 30 : -15), y: car.y + 45 + i * 55 });
      cop.speed = 420; cop.angle = -Math.PI / 2;
    }
    for (let i = 0; i < 88; i++) stepWorld(world, scriptedInput({ keys: ['KeyW'] }), STEP);
    say(world, 'INEZ VELA', 'Keep your foot down, Mara! Get me to Luz’s courtyard. We can lose them in the backstreets.', 10);
    return 'play';
  }
  world.mission.index = 2; world.mission.stage = 1;
  world.player.x = 3860; world.player.y = 3450; world.player.weapon = 'pistol';
  world.camera.x = world.player.x; world.camera.y = world.player.y;
  for (let i = 0; i < 88; i++) {
    const guard = world.enemies.find(e => e.health > 0) || { x: 3860, y: 3560 };
    const mx = 640 + (guard.x - world.camera.x) * world.camera.zoom;
    const my = 400 + (guard.y - world.camera.y) * world.camera.zoom;
    stepWorld(world, scriptedInput({ aim: true, mouseX: mx, mouseY: my, fire: i === 42 || i === 66 || i === 87 }), STEP);
  }
  say(world, 'INEZ VELA', 'Sable’s men are guarding the ledger. Use the parked cars for cover, then grab the evidence.', 10);
  return 'play';
}
