import { ROAD } from './config.js';
import { angleDelta, clamp, distance, pick } from './random.js';
import { particles, notify } from './effects.js';

const PAINTS = ['#eab958', '#e77c62', '#64baba', '#f0e5c7', '#608c92', '#b7c5ab', '#a96a69', '#49687c'];
export function createVehicle(id, x, y, angle, options = {}) {
  const type = options.type || 'coupe';
  return { id, x, y, angle, speed: 0, health: 100, driver: null, color: '#e77c62', type,
    length: type === 'van' ? 65 : 57, width: type === 'van' ? 30 : 28, maxSpeed: type === 'van' ? 370 : 510,
    impact: 0, stolen: false, brake: false, steer: 0, ...options };
}
export function createTraffic(city, random) {
  const cars = [];
  for (let i = 0; i < 112; i++) {
    const node = { ix: Math.floor(random() * 8), iy: Math.floor(random() * 8) };
    node.x = city.xs[node.ix]; node.y = city.ys[node.iy];
    const next = pick(random, city.neighbors(node)), progress = random();
    const angle = Math.atan2(next.y - node.y, next.x - node.x);
    cars.push(createVehicle('traffic-' + i, node.x + (next.x - node.x) * progress - Math.sin(angle) * ROAD.lane,
      node.y + (next.y - node.y) * progress + Math.cos(angle) * ROAD.lane, angle, {
        color: pick(random, PAINTS), type: i % 7 === 0 ? 'van' : i % 9 === 0 ? 'taxi' : 'coupe',
        driver: 'traffic', node, next, cruise: 85 + random() * 60, speed: 90
      }));
  }
  // A clearly visible, parked starter car makes the first theft immediately playable.
  cars.push(createVehicle('tideway-coupe', 3994, 2554, -Math.PI / 2, { color: '#edb94d', type: 'sport' }));
  for (let i = 0; i < 14; i++) {
    cars.push(createVehicle('parked-' + i, city.xs[2 + i % 6] - 43, 945 + Math.floor(i / 6) * 1080, -Math.PI / 2, { color: pick(random, PAINTS) }));
  }
  return cars;
}

export function driveCar(world, car, axis, handbrake, dt) {
  car.impact = Math.max(0, car.impact - dt);
  car.brake = axis.y > 0 || handbrake;
  const throttle = -axis.y;
  if (throttle) car.speed += throttle * (car.speed * throttle < 0 ? 680 : 270) * dt;
  else car.speed *= Math.pow(0.982, dt * 60);
  if (handbrake) car.speed *= Math.pow(0.955, dt * 60);
  car.speed = clamp(car.speed, -165, car.maxSpeed);
  const grip = clamp(Math.abs(car.speed) / 95, 0, 1);
  car.steer = axis.x * grip;
  car.angle += axis.x * grip * (handbrake ? 3.1 : 2.1) * Math.sign(car.speed || 1) * dt;
  const oldX = car.x, oldY = car.y;
  const hit = world.city.move(car, Math.cos(car.angle) * car.speed * dt, Math.sin(car.angle) * car.speed * dt, 22);
  if (hit && Math.abs(car.speed) > 80 && !car.impact) {
    car.health -= Math.abs(car.speed) * 0.075; car.speed *= -0.22; car.impact = 0.65;
    particles(world, car.x, car.y, '#ffcc75', 10); world.shake = 5; world.sounds.push('crash');
  } else if (hit) car.speed *= 0.9;
  if (Math.abs(car.speed) > 170 && (handbrake || Math.abs(axis.x) > 0)) {
    for (const side of [-1, 1]) {
      const ox = -Math.sin(car.angle) * side * 10, oy = Math.cos(car.angle) * side * 10;
      world.skids.push({ x: oldX + ox, y: oldY + oy, x2: car.x + ox, y2: car.y + oy, life: 13 });
    }
  }
}
function moveTraffic(world, car, dt) {
  const dx = car.next.x - car.node.x, dy = car.next.y - car.node.y;
  const angle = Math.atan2(dy, dx);
  const target = { x: car.next.x - Math.sin(angle) * ROAD.lane, y: car.next.y + Math.cos(angle) * ROAD.lane };
  if (distance(car, target) < 38) {
    const options = world.city.neighbors(car.next).filter(n => n.ix !== car.node.ix || n.iy !== car.node.iy);
    car.node = car.next;
    car.next = pick(world.random, options.length ? options : world.city.neighbors(car.node));
  }
  const desired = Math.atan2(target.y - car.y, target.x - car.x);
  car.angle += clamp(angleDelta(car.angle, desired), -3.6 * dt, 3.6 * dt);
  let speed = car.cruise;
  for (const other of world.cars) {
    if (other === car || distance(other, car) > 85) continue;
    const forward = Math.cos(car.angle) * (other.x - car.x) + Math.sin(car.angle) * (other.y - car.y);
    const sideways = Math.abs(-Math.sin(car.angle) * (other.x - car.x) + Math.cos(car.angle) * (other.y - car.y));
    if (forward > 0 && sideways < 27) speed = Math.min(speed, Math.max(0, forward - 45) * 1.5);
  }
  car.speed += (speed - car.speed) * Math.min(1, dt * 3);
  const hit = world.city.move(car, Math.cos(car.angle) * car.speed * dt, Math.sin(car.angle) * car.speed * dt, 20);
  if (hit) {
    // Return a confused driver to the lane, rather than letting traffic accumulate at a wall.
    const lane = world.city.roadPoint(car);
    car.x += (lane.x - car.x) * dt; car.y += (lane.y - car.y) * dt;
    if (Math.abs(car.speed) < 10) { car.node = world.city.nearestNode(car); car.next = pick(world.random, world.city.neighbors(car.node)); }
  }
}
export function updateVehicles(world, dt) {
  for (const car of world.cars) {
    car.impact = Math.max(0, car.impact - dt);
    if (car.driver === 'traffic' && car.health > 0) moveTraffic(world, car, dt);
    else if (car.driver === null && Math.abs(car.speed) > 1) {
      world.city.move(car, Math.cos(car.angle) * car.speed * dt, Math.sin(car.angle) * car.speed * dt, 22);
      car.speed *= Math.pow(0.94, dt * 60);
    }
  }
  const playerCar = world.player.car;
  if (!playerCar) {
    for (const car of world.cars) {
      if (car.driver === 'traffic' && car.health > 0 && Math.abs(car.speed) > 60 && distance(car, world.player) < 29) {
        world.hurt(15);
        world.city.move(world.player, Math.cos(car.angle) * 16, Math.sin(car.angle) * 16, 11);
      }
    }
    return;
  }
  for (const other of [...world.cars, ...world.police]) {
    if (other === playerCar || distance(other, playerCar) > 46) continue;
    const a = Math.atan2(playerCar.y - other.y, playerCar.x - other.x);
    world.city.move(playerCar, Math.cos(a) * 4, Math.sin(a) * 4, 22);
    if (playerCar.impact <= 0 && Math.abs(playerCar.speed - other.speed) > 65) {
      const impact = Math.abs(playerCar.speed - other.speed);
      playerCar.health -= impact * 0.035; other.health -= impact * 0.065;
      playerCar.speed *= 0.6; other.speed *= 0.5; playerCar.impact = 0.55;
      particles(world, playerCar.x, playerCar.y, '#ffdb9b', 9); world.sounds.push('crash'); world.shake = 4;
      if (other.driver === 'police') world.crime(22, 'Assaulting an officer');
    }
  }
  if (playerCar.health <= 0) {
    world.player.car = null; playerCar.driver = null; playerCar.speed = 0; playerCar.health = 0;
    world.player.x = playerCar.x + Math.cos(playerCar.angle + Math.PI / 2) * 42;
    world.player.y = playerCar.y + Math.sin(playerCar.angle + Math.PI / 2) * 42;
    if (world.city.collides(world.player.x, world.player.y, 11)) { world.player.x = playerCar.x; world.player.y = playerCar.y; }
    world.hurt(22); notify(world, 'Engine wrecked. Find another ride.', '#ef8266');
    particles(world, playerCar.x, playerCar.y, '#555b57', 25, 150);
  }
}
export function nearestCar(world) {
  let result = null, best = 76;
  for (const car of [...world.cars, ...world.police]) {
    const d = distance(car, world.player);
    if (car.health > 0 && d < best && Math.abs(car.speed) < 190) { result = car; best = d; }
  }
  return result;
}
