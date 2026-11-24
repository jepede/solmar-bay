import { distance, pick } from './random.js';
import { particles } from './effects.js';

const SHIRTS = ['#f0b94b', '#d57166', '#f2edcf', '#3a8585', '#597a9b', '#a5799f'];
const SKINS = ['#bd7956', '#ddaa7d', '#8d553c', '#e7bc93'];
export function createPedestrians(city, random) {
  const people = [];
  for (let i = 0; i < 320; i++) {
    const ix = i >= 240 ? 6 : Math.floor(random() * 7), iy = i >= 240 ? 2 + Math.floor(random() * 4) : Math.floor(random() * 7);
    const left = city.xs[ix] + 67, right = city.xs[ix + 1] - 67;
    const top = city.ys[iy] + 67, bottom = city.ys[iy + 1] - 67;
    const path = i >= 300 ? [{ x: 4110, y: top }, { x: 4310, y: top }, { x: 4310, y: bottom }, { x: 4110, y: bottom }] : [{ x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom }];
    const edge = i % 4, next = path[(edge + 1) % 4], progress = random();
    people.push({ id: i, x: path[edge].x + (next.x - path[edge].x) * progress,
      y: path[edge].y + (next.y - path[edge].y) * progress, angle: 0, path, corner: (edge + 1) % 4,
      speed: 26 + random() * 22, shirt: pick(random, SHIRTS), skin: pick(random, SKINS),
      phase: random() * 6, panic: 0, health: 60, down: 0, hit: 0 });
  }
  return people;
}
export function scarePeople(world, position, radius = 300) {
  for (const p of world.pedestrians) if (distance(p, position) < radius) p.panic = 6 + world.random() * 4;
}
export function updatePedestrians(world, dt) {
  const player = world.player;
  for (const p of world.pedestrians) {
    p.hit = Math.max(0, p.hit - dt);
    if (p.down > 0) {
      p.down -= dt;
      if (p.down <= 0) { const home = p.path[0]; p.x = home.x; p.y = home.y; p.health = 60; }
      continue;
    }
    let target = p.path[p.corner], speed = p.speed;
    if (p.panic > 0) {
      p.panic -= dt; speed *= 2.8;
      const angle = Math.atan2(p.y - player.y, p.x - player.x);
      target = { x: p.x + Math.cos(angle) * 70, y: p.y + Math.sin(angle) * 70 };
    } else if (distance(p, target) < 10) { p.corner = (p.corner + 1) % 4; target = p.path[p.corner]; }
    p.angle = Math.atan2(target.y - p.y, target.x - p.x);
    world.city.move(p, Math.cos(p.angle) * speed * dt, Math.sin(p.angle) * speed * dt, 8);
    p.phase += dt * (p.panic ? 15 : 7);
    if (player.car && Math.abs(player.car.speed) > 90 && distance(p, player) < 110) p.panic = Math.max(p.panic, 3);
    if (player.car && Math.abs(player.car.speed) > 85 && distance(p, player.car) < 29 && !p.hit) {
      p.health = 0; p.down = 14; p.hit = 1;
      world.crime(70, 'Hit and run'); particles(world, p.x, p.y, '#e2b594', 7);
      player.car.speed *= 0.84; world.sounds.push('hit');
    }
  }
}
