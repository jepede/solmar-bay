import { distance, clamp } from './random.js';
import { particles, notify, spawnLoot } from './effects.js';
import { scarePeople } from './pedestrians.js';

export function spawnGuards(world, target) {
  const positions = [{ x: target.x - 50, y: target.y - 40 }, { x: target.x - 130, y: target.y + 60 }, { x: target.x - 210, y: target.y - 35 }];
  world.enemies = positions.map((p, i) => ({ ...p, id: 'sable-' + i, angle: 0, health: 85, cooldown: 0.8 + i * 0.5, hit: 0, phase: 0, down: 0, home: { ...p } }));
}
function attack(world, input) {
  const p = world.player;
  if (p.car || p.cooldown > 0 || p.reload > 0 || !(input.mouse.down || input.held('Space'))) return;
  if (p.weapon === 'fists') {
    p.cooldown = 0.42; p.punch = 0.22; world.sounds.push('hit');
    for (const target of [...world.enemies, ...world.pedestrians]) {
      if (target.health <= 0 || distance(p, target) > 53) continue;
      const angle = Math.atan2(target.y - p.y, target.x - p.x);
      if (Math.cos(angle - p.angle) < 0.05) continue;
      target.health -= 36; target.hit = 0.18; target.panic = 7;
      world.city.move(target, Math.cos(p.angle) * 15, Math.sin(p.angle) * 15, 8);
      particles(world, target.x, target.y, '#f2c37a', 6);
      world.crime(22, 'Street assault');
      if (target.health <= 0) { target.down = 16; if (target.id.toString().startsWith('sable')) spawnLoot(world, target.x, target.y); }
      break;
    }
    scarePeople(world, p, 120);
    return;
  }
  if (p.ammo <= 0) {
    if (p.reserve > 0) p.reload = 1.15;
    else { notify(world, 'Out of ammo. Switch to fists [1] or visit Nico’s Supplies.', '#ef8266'); p.cooldown = 1; }
    return;
  }
  p.ammo--; p.cooldown = 0.25; p.punch = 0.09;
  const angle = p.angle + (world.random() - 0.5) * 0.025;
  world.bullets.push({ x: p.x + Math.cos(angle) * 24, y: p.y + Math.sin(angle) * 24, vx: Math.cos(angle) * 960, vy: Math.sin(angle) * 960, life: 0.8, owner: 'player', damage: 36 });
  particles(world, p.x + Math.cos(angle) * 26, p.y + Math.sin(angle) * 26, '#ffdd86', 5, 60);
  world.crime(26, 'Shots fired'); world.sounds.push('shot'); scarePeople(world, p, 450);
}
function updateGuards(world, dt) {
  const p = world.player;
  for (const enemy of world.enemies) {
    enemy.hit = Math.max(0, enemy.hit - dt);
    if (enemy.health <= 0) { enemy.down = Math.max(0, enemy.down - dt); continue; }
    enemy.cooldown -= dt;
    const d = distance(enemy, p);
    if (d > 620) continue;
    enemy.angle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
    enemy.phase += dt * 9;
    if (d > 190 || !world.city.lineClear(enemy, p)) {
      world.city.move(enemy, Math.cos(enemy.angle) * 65 * dt, Math.sin(enemy.angle) * 65 * dt, 10);
    }
    if (d < 430 && enemy.cooldown <= 0 && world.city.lineClear(enemy, p)) {
      const angle = enemy.angle + (world.random() - 0.5) * 0.16;
      world.bullets.push({ x: enemy.x + Math.cos(angle) * 19, y: enemy.y + Math.sin(angle) * 19, vx: Math.cos(angle) * 540, vy: Math.sin(angle) * 540, life: 0.9, owner: 'guard', damage: p.car ? 5 : 11 });
      enemy.cooldown = 1.2 + world.random() * 0.65;
    }
    if (p.car && Math.abs(p.car.speed) > 80 && d < 38) { enemy.health = 0; enemy.down = 16; spawnLoot(world, enemy.x, enemy.y); world.crime(40, 'Reckless driving'); }
  }
}
function updateBullets(world, dt) {
  for (const bullet of world.bullets) {
    bullet.life -= dt;
    const steps = Math.max(1, Math.ceil(Math.hypot(bullet.vx, bullet.vy) * dt / 8));
    for (let i = 0; i < steps && bullet.life > 0; i++) {
      bullet.x += bullet.vx * dt / steps; bullet.y += bullet.vy * dt / steps;
      if (world.city.collides(bullet.x, bullet.y, 2)) {
        bullet.life = 0; particles(world, bullet.x, bullet.y, '#f4dcb5', 3, 40); break;
      }
      if (bullet.owner !== 'player') {
        if (distance(bullet, world.player) < (world.player.car ? 24 : 12)) {
          if (world.player.car) world.player.car.health -= bullet.damage;
          else world.hurt(bullet.damage);
          bullet.life = 0;
        }
      } else {
        for (const target of [...world.enemies, ...world.pedestrians, ...world.police, ...world.cars]) {
          if (target.health <= 0 || target === world.player.car) continue;
          if (distance(bullet, target) >= (target.length ? 25 : 13)) continue;
          target.health -= bullet.damage; target.hit = 0.15; target.panic = 8;
          particles(world, bullet.x, bullet.y, target.length ? '#ffcb73' : '#de9779', 6);
          if (target.health <= 0) {
            target.down = 16;
            if (String(target.id).startsWith('sable')) spawnLoot(world, target.x, target.y);
            if (target.driver === 'police') world.crime(90, 'Police vehicle disabled');
          }
          bullet.life = 0; break;
        }
      }
    }
  }
  world.bullets = world.bullets.filter(b => b.life > 0);
}
export function updateCombat(world, input, dt) {
  attack(world, input); updateGuards(world, dt); updateBullets(world, dt);
  world.player.health = clamp(world.player.health, 0, 100);
}
