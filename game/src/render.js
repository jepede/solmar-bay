import { VIEW, COLORS, POI } from './config.js';
import { drawGround, drawBuilding, drawTree } from './scenery.js';
import { drawCar, drawPerson } from './actors.js';
import { drawHud, drawTitle, drawOverlay, drawMinimap } from './hud.js';
import { currentStage, missionTarget } from './missions.js';
import { rect, line, circle, text, diamond } from './drawing.js';
import { clamp } from './random.js';

function objectiveMarker(ctx, target, time, color = COLORS.gold, label = '') {
  const pulse = 1 + Math.sin(time * 3) * 0.08;
  ctx.save(); ctx.translate(target.x, target.y);
  ctx.fillStyle = color + '20'; ctx.beginPath(); ctx.ellipse(0, 0, 37 * pulse, 26 * pulse, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = color + 'aa'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.ellipse(0, 0, 36 * pulse, 25 * pulse, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  line(ctx, 0, -8, 0, -38, color + '99', 2);
  diamond(ctx, 0, -48 - Math.sin(time * 3) * 3, 13, '#173c3b');
  diamond(ctx, 0, -48 - Math.sin(time * 3) * 3, 9, color);
  if (label) {
    ctx.font = 'bold 10px Arial'; const width = ctx.measureText(label).width + 20;
    rect(ctx, -width / 2, -90, width, 23, '#12383bea', 3); text(ctx, label, 0, -74, 10, color, 'bold', 'center');
  }
  ctx.restore();
}
function drawWorld(ctx, world, camera, title) {
  const zoom = camera.zoom;
  const bounds = { left: camera.x - 680 / zoom, right: camera.x + 680 / zoom, top: camera.y - 440 / zoom, bottom: camera.y + 440 / zoom };
  const visible = (p, margin = 80) => p.x > bounds.left - margin && p.x < bounds.right + margin && p.y > bounds.top - margin && p.y < bounds.bottom + margin;
  ctx.save(); ctx.translate(640, 400); ctx.scale(zoom, zoom); ctx.translate(-camera.x, -camera.y);
  drawGround(ctx, world, bounds);
  for (const skid of world.skids) line(ctx, skid.x, skid.y, skid.x2, skid.y2, '#304f434a', 3);
  for (const b of world.city.buildings) if (visible(b, 220)) drawBuilding(ctx, b);
  for (const t of world.city.trees) if (visible(t)) drawTree(ctx, t, world.time, true);
  // Small contact portraits are actual people standing at the contact locations.
  for (const [name, point, shirt] of [['INEZ', POI.garage, '#e9976c'], ['SOL', POI.radio, '#eac66d']]) {
    if (!visible(point)) continue;
    drawPerson(ctx, { x: point.x - 17, y: point.y - 16, shirt, skin: '#b87c57', health: 100, phase: 0, moving: false, angle: 0.6 }, world.time);
    text(ctx, name, point.x - 18, point.y - 42, 8, '#294e45', 'bold', 'center');
  }
  for (const p of world.pedestrians) if (visible(p)) drawPerson(ctx, p, world.time);
  for (const car of [...world.cars, ...world.police]) if (visible(car) && car !== world.player.car) drawCar(ctx, car, world.time, false, world.wanted.stars > 0);
  for (const enemy of world.enemies) if (visible(enemy)) drawPerson(ctx, enemy, world.time, 'guard');
  for (const t of world.city.trees) if (visible(t)) drawTree(ctx, t, world.time);
  for (const point of [POI.hospital, POI.supply]) {
    if (visible(point)) {
      rect(ctx, point.x - 11, point.y - 11, 22, 22, '#1c5a50', 4);
      text(ctx, point === POI.hospital ? '+' : 'N', point.x, point.y + 5, 16, COLORS.teal, 'bold', 'center');
    }
  }
  for (const pickup of world.pickups) {
    circle(ctx, pickup.x, pickup.y, 13 + Math.sin(world.time * 4) * 2, '#4fbb9b44');
    diamond(ctx, pickup.x, pickup.y, 8, COLORS.teal);
    text(ctx, pickup.kind === 'cash' ? '$' : pickup.kind === 'health' ? '+' : '•', pickup.x, pickup.y + 4, 11, '#153e3b', 'bold', 'center');
  }
  for (const bullet of world.bullets) line(ctx, bullet.x, bullet.y, bullet.x - bullet.vx * 0.018, bullet.y - bullet.vy * 0.018, bullet.owner === 'player' ? '#fff5bd' : '#f8a67e', 2.5);
  for (const p of world.particles) { ctx.globalAlpha = Math.min(1, p.life * 3); circle(ctx, p.x, p.y, p.size, p.color); }
  ctx.globalAlpha = 1;
  const target = missionTarget(world);
  if (target) objectiveMarker(ctx, target, world.time, COLORS.gold, target.name.toUpperCase());
  if (world.sideJob) { const t = POI[world.sideJob.route[world.sideJob.stage]]; objectiveMarker(ctx, t, world.time, COLORS.teal, 'DISPATCH'); }
  // Keep the controlled actor readable beneath decorative, non-colliding palms.
  if (world.player.car) drawCar(ctx, world.player.car, world.time, true, world.wanted.stars > 0);
  else if (!world.player.invulnerable || Math.sin(world.time * 30) > -0.3) drawPerson(ctx, world.player, world.time, 'player');
  ctx.restore();
  // A soft coastal haze ties the geometric art together without obscuring play.
  const haze = ctx.createLinearGradient(0, 0, 1280, 800); haze.addColorStop(0, '#ffda8f0a'); haze.addColorStop(1, '#bde8ba00'); rect(ctx, 0, 0, 1280, 800, haze);
  if (!title && target) {
    const sx = (target.x - camera.x) * zoom + 640, sy = (target.y - camera.y) * zoom + 400;
    if (sx < 20 || sx > 1260 || sy < 52 || sy > 775) {
      const dx = sx - 640, dy = sy - 400;
      const factor = Math.min(570 / Math.max(1, Math.abs(dx)), 303 / Math.max(1, Math.abs(dy)));
      const px = clamp(640 + dx * factor, 384, 938), py = clamp(400 + dy * factor, 228, 590);
      circle(ctx, px, py, 18, '#163a3dd9'); diamond(ctx, px, py, 7, COLORS.gold);
    }
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  let width = 0, height = 0, pixelRatio = 1;
  function resize() {
    pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    width = window.innerWidth; height = window.innerHeight;
    canvas.width = Math.round(width * pixelRatio); canvas.height = Math.round(height * pixelRatio);
  }
  window.addEventListener('resize', resize); resize();
  function draw(world, screen = 'play', options = {}) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); rect(ctx, 0, 0, canvas.width, canvas.height, COLORS.ink);
    const scale = Math.min(width / VIEW.width, height / VIEW.height);
    ctx.setTransform(scale * pixelRatio, 0, 0, scale * pixelRatio, (width - VIEW.width * scale) * pixelRatio / 2, (height - VIEW.height * scale) * pixelRatio / 2);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 1280, 800); ctx.clip();
    const title = screen === 'title';
    const camera = title ? { x: 3890, y: 2480, zoom: 1.02 } : world.camera;
    drawWorld(ctx, world, camera, title);
    if (title) drawTitle(ctx, world, !!options.hasSave);
    else {
      drawHud(ctx, world, options);
      if (world.mapOpen) { rect(ctx, 0, 41, 1280, 759, '#0a282ce8'); drawMinimap(ctx, world, true); }
      if (screen !== 'play') drawOverlay(ctx, world, screen, options.saveText);
      if (world.player.health < 30 && screen === 'play') {
        ctx.strokeStyle = '#cd665d66'; ctx.lineWidth = 12; ctx.strokeRect(0, 43, 1280, 757);
      }
    }
    ctx.restore();
  }
  return { draw, resize };
}
