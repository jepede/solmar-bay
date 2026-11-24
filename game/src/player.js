import { SPAWN } from './config.js';
import { distance } from './random.js';
import { driveCar, nearestCar } from './vehicles.js';
import { notify, particles } from './effects.js';
import { scarePeople } from './pedestrians.js';

export function createPlayer() {
  return { ...SPAWN, health: 100, cash: 350, weapon: 'fists', ammo: 12, reserve: 60, car: null,
    invulnerable: 0, cooldown: 0, reload: 0, punch: 0, phase: 0, sprint: 100, moving: false, thefts: 0 };
}
export function hurtPlayer(world, amount) {
  const p = world.player;
  if (p.invulnerable > 0 || world.terminal) return;
  p.health = Math.max(0, p.health - amount); p.invulnerable = 0.55;
  world.shake = 4; world.sounds.push('hit'); particles(world, p.x, p.y, '#ef8266', 6);
  if (p.health <= 0) world.terminal = 'wasted';
}
export function enterOrExit(world) {
  const p = world.player;
  if (p.car) {
    if (Math.abs(p.car.speed) > 120) { notify(world, 'Slow down before getting out.'); return; }
    for (const side of [1, -1]) {
      const x = p.car.x + Math.cos(p.car.angle + Math.PI / 2) * side * 47;
      const y = p.car.y + Math.sin(p.car.angle + Math.PI / 2) * side * 47;
      if (!world.city.collides(x, y, 12)) {
        p.x = x; p.y = y; p.car.driver = null; p.car = null; world.sounds.push('ui'); return;
      }
    }
    notify(world, 'Pull away from the wall to get out.'); return;
  }
  const car = nearestCar(world);
  if (!car) { notify(world, 'Get closer to a car, then press E.'); return; }
  if (!car.stolen) {
    car.stolen = true; p.thefts++;
    world.crime(car.driver === 'police' ? 150 : 65, car.driver === 'police' ? 'Police vehicle stolen' : 'Vehicle theft');
    scarePeople(world, car, 150);
    notify(world, 'New ride. W / S throttle · A / D steer', '#ffd16d');
  }
  car.driver = 'player'; p.car = car; p.x = car.x; p.y = car.y; p.angle = car.angle;
  world.sounds.push('ui');
}
export function updatePlayer(world, input, dt) {
  const p = world.player, axis = input.axis();
  p.invulnerable = Math.max(0, p.invulnerable - dt);
  p.cooldown = Math.max(0, p.cooldown - dt);
  p.punch = Math.max(0, p.punch - dt);
  if (p.reload > 0) {
    p.reload -= dt;
    if (p.reload <= 0) { const count = Math.min(12 - p.ammo, p.reserve); p.ammo += count; p.reserve -= count; world.sounds.push('ui'); }
  }
  if (input.take('KeyE')) enterOrExit(world);
  if (input.take('Digit1')) p.weapon = 'fists';
  if (input.take('Digit2')) p.weapon = 'pistol';
  if (input.take('KeyQ')) p.weapon = p.weapon === 'fists' ? 'pistol' : 'fists';
  if (input.take('KeyR') && p.weapon === 'pistol' && !p.reload && p.ammo < 12 && p.reserve > 0) p.reload = 1.15;
  if (p.car) {
    driveCar(world, p.car, axis, input.held('Space'), dt);
    p.x = p.car.x; p.y = p.car.y; p.angle = p.car.angle;
    if (input.take('KeyH')) { world.sounds.push('horn'); scarePeople(world, p, 170); }
    p.sprint = Math.min(100, p.sprint + dt * 14); return;
  }
  const moving = axis.x !== 0 || axis.y !== 0;
  const sprinting = moving && (input.held('ShiftLeft') || input.held('ShiftRight')) && p.sprint > 1;
  p.sprint = Math.max(0, Math.min(100, p.sprint + dt * (sprinting ? -18 : 13)));
  const speed = sprinting ? 225 : 151;
  const length = Math.hypot(axis.x, axis.y) || 1;
  world.city.move(p, axis.x / length * speed * dt, axis.y / length * speed * dt, 11);
  p.moving = moving;
  if (moving) { p.phase += dt * (sprinting ? 16 : 10); p.angle = Math.atan2(axis.y, axis.x); }
  if (input.mouse.active) {
    const camera = world.camera, zoom = camera.zoom;
    const target = { x: camera.x + (input.mouse.x - 640) / zoom, y: camera.y + (input.mouse.y - 400) / zoom };
    if (distance(p, target) > 12) p.angle = Math.atan2(target.y - p.y, target.x - p.x);
  }
}
