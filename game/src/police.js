import { createVehicle } from './vehicles.js';
import { angleDelta, clamp, distance, pick } from './random.js';
import { notify, say } from './effects.js';

export function createWanted() {
  return { heat: 0, stars: 0, unseen: 0, lastCrime: -100, visible: false, bust: 0, spawn: 0, serial: 0, lastKnown: null };
}
export function addCrime(world, severity, label) {
  const w = world.wanted, before = w.stars;
  w.heat = clamp(w.heat + severity, 0, 495); w.stars = Math.ceil(w.heat / 100);
  w.lastCrime = world.time; w.unseen = 0; w.lastKnown = { x: world.player.x, y: world.player.y };
  if (world.time - (w.lastNotice ?? -10) > 2 || w.stars > before) {
    notify(world, label + ' · police alerted', '#ef8266', 3); w.lastNotice = world.time;
  }
  if (w.stars > before) world.sounds.push('wanted');
}
export function spawnPolice(world, position) {
  const p = world.player, random = world.random;
  let point = position;
  if (!point) {
    const a = random() * Math.PI * 2;
    point = world.city.roadPoint({ x: clamp(p.x + Math.cos(a) * 700, 240, 4020), y: clamp(p.y + Math.sin(a) * 700, 250, 4030) });
  }
  const car = createVehicle('police-' + world.wanted.serial++, point.x, point.y, Math.atan2(p.y - point.y, p.x - point.x), {
    type: 'police', color: '#e9eee0', driver: 'police', speed: 100, maxSpeed: 430, replan: 0, waypoint: null, shot: 1
  });
  world.police.push(car); return car;
}
function pursue(world, car, dt) {
  const p = world.player, w = world.wanted;
  const destination = w.visible || !w.lastKnown ? p : w.lastKnown;
  let target = destination;
  const direct = distance(car, destination) < 420 && world.city.lineClear(car, destination);
  if (!direct) {
    car.replan -= dt;
    if (!car.waypoint || distance(car, car.waypoint) < 50 || car.replan <= 0) {
      const start = world.city.nearestNode(car);
      const goal = world.city.nearestNode(destination);
      if (distance(car, start) > 150 && world.city.lineClear(car, start)) car.waypoint = start;
      else {
        const options = world.city.neighbors(start);
        options.sort((a, b) => (Math.abs(a.ix - goal.ix) + Math.abs(a.iy - goal.iy)) - (Math.abs(b.ix - goal.ix) + Math.abs(b.iy - goal.iy)));
        car.waypoint = options[0] || start;
      }
      car.replan = 2.2;
    }
    target = car.waypoint;
  }
  const desired = Math.atan2(target.y - car.y, target.x - car.x);
  const turn = angleDelta(car.angle, desired);
  car.angle += clamp(turn, -3.0 * dt, 3.0 * dt);
  let desiredSpeed = direct ? Math.min(415, 130 + distance(car, p) * 0.65 + w.stars * 16) : 240;
  if (Math.abs(turn) > 0.7) desiredSpeed *= 0.48;
  if (distance(car, p) < 65) desiredSpeed = p.car ? 140 : 45;
  car.speed += (desiredSpeed - car.speed) * Math.min(1, dt * 2.4);
  if (world.city.move(car, Math.cos(car.angle) * car.speed * dt, Math.sin(car.angle) * car.speed * dt, 21)) {
    car.speed *= 0.88; car.replan = 0;
    // Reverse away from an obstacle before rejoining the road.
    world.city.move(car, -Math.cos(car.angle) * 60 * dt, -Math.sin(car.angle) * 60 * dt, 21);
    car.angle += dt * 1.3;
  }
  car.shot -= dt;
  if (!p.car && w.stars >= 2 && distance(car, p) < 205 && world.city.lineClear(car, p) && car.shot <= 0) {
    const a = Math.atan2(p.y - car.y, p.x - car.x) + (world.random() - 0.5) * 0.13;
    world.bullets.push({ x: car.x, y: car.y, vx: Math.cos(a) * 590, vy: Math.sin(a) * 590, life: 0.7, owner: 'police', damage: 9 });
    car.shot = 1.3;
  }
}
export function updatePolice(world, dt) {
  const p = world.player, w = world.wanted;
  world.police = world.police.filter(car => car.health > 0 || distance(car, p) < 1000);
  if (!w.stars) {
    w.bust = Math.max(0, w.bust - dt); w.visible = false;
    for (const car of world.police) {
      if (car.driver === 'player') continue;
      car.speed *= 0.98;
    }
    world.police = world.police.filter(c => c.driver === 'player' || distance(c, p) < 900);
    return;
  }
  w.visible = world.police.some(c => c.health > 0 && c.driver === 'police' && distance(c, p) < (p.car ? 540 : 380) && world.city.lineClear(c, p));
  if (w.visible) { w.unseen = 0; w.lastKnown = { x: p.x, y: p.y }; }
  else w.unseen += dt;
  w.spawn -= dt;
  const active = world.police.filter(c => c.driver === 'police' && c.health > 0).length;
  if (active < Math.min(7, 1 + w.stars * 2) && w.spawn <= 0 && w.unseen < 9) {
    spawnPolice(world); w.spawn = 2.5;
  }
  for (const car of world.police) if (car.driver === 'police' && car.health > 0) pursue(world, car, dt);
  // Pursuit units keep physical space instead of collapsing onto one point.
  for (let i = 0; i < world.police.length; i++) for (let j = i + 1; j < world.police.length; j++) {
    const a = world.police[i], b = world.police[j], d = distance(a, b);
    if (a.driver !== 'police' || b.driver !== 'police' || d >= 54) continue;
    const angle = d > 0.1 ? Math.atan2(a.y - b.y, a.x - b.x) : i * 1.7;
    const shift = (54 - d) * 0.4;
    world.city.move(a, Math.cos(angle) * shift, Math.sin(angle) * shift, 21);
    world.city.move(b, -Math.cos(angle) * shift, -Math.sin(angle) * shift, 21);
  }
  const close = world.police.some(c => c.driver === 'police' && c.health > 0 && distance(c, p) < 64 && world.city.lineClear(c, p));
  const slow = !p.car || Math.abs(p.car.speed) < 35;
  w.bust = clamp(w.bust + dt * (close && slow ? 0.27 : -0.45), 0, 1);
  if (w.bust >= 1) { world.terminal = 'busted'; say(world, 'SOLMAR POLICE', 'End of the road, Cruz.'); }
  if (w.unseen > 6 && world.time - w.lastCrime > 8) {
    w.heat = Math.max(0, w.heat - dt * 18);
    const stars = Math.ceil(w.heat / 100);
    if (stars === 0) {
      notify(world, 'Heat lost. You’re clear.', '#55dbc0'); world.sounds.push('complete'); w.bust = 0;
      world.police = world.police.filter(c => c.driver === 'player');
    }
    w.stars = stars;
  }
}
