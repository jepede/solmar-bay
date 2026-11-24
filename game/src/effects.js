import { pick } from './random.js';

export function notify(world, text, color = '#ffd16d', duration = 4) {
  world.notices.unshift({ text, color, life: duration, total: duration });
  world.notices.length = Math.min(world.notices.length, 3);
}
export function say(world, speaker, text, duration = 8) {
  world.dialogue = { speaker, text, life: duration, total: duration };
  world.announcement = speaker + ': ' + text;
}
export function particles(world, x, y, color, count = 8, force = 100) {
  for (let i = 0; i < count; i++) {
    const a = world.random() * Math.PI * 2, speed = 20 + world.random() * force;
    world.particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, color, life: 0.3 + world.random() * 0.45, size: 1 + world.random() * 3 });
  }
}
export function updateEffects(world, dt) {
  for (const p of world.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.95; p.vy *= 0.95; p.life -= dt; }
  world.particles = world.particles.filter(p => p.life > 0);
  for (const n of world.notices) n.life -= dt;
  world.notices = world.notices.filter(n => n.life > 0);
  if (world.dialogue) { world.dialogue.life -= dt; if (world.dialogue.life <= 0) world.dialogue = null; }
  for (const mark of world.skids) mark.life -= dt;
  world.skids = world.skids.filter(mark => mark.life > 0).slice(-220);
  world.shake = Math.max(0, world.shake - dt * 18);
  for (const pickup of world.pickups) {
    if (Math.hypot(pickup.x - world.player.x, pickup.y - world.player.y) < 30) {
      if (pickup.kind === 'cash') world.player.cash += pickup.amount;
      else if (pickup.kind === 'ammo') world.player.reserve += pickup.amount;
      else world.player.health = Math.min(100, world.player.health + pickup.amount);
      notify(world, pickup.kind === 'cash' ? '+$' + pickup.amount : '+' + pickup.amount + ' ' + pickup.kind, '#55dbc0', 2);
      world.sounds.push('pickup'); pickup.life = 0;
    }
    pickup.life -= dt;
  }
  world.pickups = world.pickups.filter(p => p.life > 0);
}
export function spawnLoot(world, x, y) {
  world.pickups.push({ x, y, kind: pick(world.random, ['ammo', 'cash', 'health']), amount: 30, life: 60 });
}
