import { rect, circle, line, text } from './drawing.js';
import { COLORS } from './config.js';

export function drawCar(ctx, car, time, playerCar = false, wanted = false) {
  const { x, y, angle, length: length = 57, width: width = 28 } = car;
  ctx.save(); ctx.translate(x + 5, y + 7); ctx.rotate(angle);
  rect(ctx, -length / 2, -width / 2, length + 2, width + 1, '#173f384a', 5); ctx.restore();
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) rect(ctx, sx * 19 - 7, sy * (width / 2) - 3, 13, 6, '#283e3b', 2);
  const paint = car.health <= 0 ? '#616d62' : car.type === 'taxi' ? '#e9bc4d' : car.color;
  rect(ctx, -length / 2, -width / 2, length, width, paint, 5);
  if (car.type === 'police') rect(ctx, -9, -width / 2, 23, width, '#31556a', 1);
  rect(ctx, -15, -width / 2 + 3, 27, width - 6, '#294e50', 4);
  rect(ctx, -10, -width / 2 + 3, 15, width - 6, car.type === 'police' ? '#e2e7d5' : paint, 2);
  line(ctx, 6, -width / 2 + 4, 9, width / 2 - 4, '#9ed0c2', 1.5);
  line(ctx, -length / 2 + 5, -width / 2 + 4, -length / 2 + 5, width / 2 - 4, '#fff1ce55', 1);
  rect(ctx, length / 2 - 3, -width / 2 + 3, 3, 6, '#fff0b7', 1);
  rect(ctx, length / 2 - 3, width / 2 - 9, 3, 6, '#fff0b7', 1);
  rect(ctx, -length / 2, -width / 2 + 3, 3, 6, car.brake ? '#ff9f77' : '#a95041', 1);
  rect(ctx, -length / 2, width / 2 - 9, 3, 6, car.brake ? '#ff9f77' : '#a95041', 1);
  rect(ctx, 1, -width / 2 - 3, 7, 3, paint, 1); rect(ctx, 1, width / 2, 7, 3, paint, 1);
  if (car.type === 'taxi') { rect(ctx, -5, -6, 10, 12, '#e9d99c', 2); text(ctx, 'T', 0, 3, 8, '#315553', 'bold', 'center'); }
  if (car.type === 'police') {
    const flash = Math.sin(time * 15 + car.x) > 0;
    rect(ctx, -3, -10, 6, 20, '#f2e6cf', 1);
    rect(ctx, -2, -9, 4, 7, flash && wanted ? '#fa7869' : '#a44e48');
    rect(ctx, -2, 2, 4, 7, !flash && wanted ? '#7ae3ff' : '#4a8baf');
    text(ctx, 'SB', -20, 3, 8, '#f4e9d0', 'bold', 'center');
    if (wanted) {
      ctx.globalAlpha = 0.15;
      circle(ctx, 0, flash ? -13 : 13, 35, flash ? '#ff655e' : '#61d6f9');
      ctx.globalAlpha = 1;
    }
  }
  if (playerCar) {
    ctx.strokeStyle = '#ffd16dbb'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.roundRect(-length / 2 - 5, -width / 2 - 5, length + 10, width + 10, 8); ctx.stroke();
    if (Math.abs(car.speed) > 250) {
      line(ctx, -length / 2 - 9, -9, -length / 2 - 34, -9, '#ffedb47a', 2);
      line(ctx, -length / 2 - 14, 9, -length / 2 - 43, 9, '#ffedb455', 2);
    }
    line(ctx, length / 2 + 7, -5, length / 2 + 14, 0, COLORS.gold, 2);
    line(ctx, length / 2 + 14, 0, length / 2 + 7, 5, COLORS.gold, 2);
  }
  if (car.health < 35) {
    circle(ctx, length / 2 - 8, -4 + Math.sin(time * 5) * 3, 12 + Math.sin(time * 3) * 3, '#4d605a88');
    circle(ctx, length / 2 - 1, -10, 9, '#717a6c66');
  }
  ctx.restore();
}

export function drawPerson(ctx, p, time, kind = 'civilian') {
  const player = kind === 'player', guard = kind === 'guard';
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle || 0);
  if (p.health <= 0) {
    rect(ctx, -12, -5, 25, 11, guard ? '#a35954' : p.shirt, 5); circle(ctx, 14, 0, 5, p.skin || '#c58e66');
    ctx.restore(); return;
  }
  circle(ctx, 3, 5, 11, '#214c404a');
  const gait = p.moving === false ? 0 : Math.sin(p.phase || time * 8) * 3.5;
  rect(ctx, -11 - gait, -6, 10, 5, '#354f4c', 2); rect(ctx, -11 + gait, 2, 10, 5, '#354f4c', 2);
  ctx.fillStyle = p.hit > 0 ? '#ffe1ad' : player ? '#3b9e94' : guard ? '#a64f50' : p.shirt;
  ctx.beginPath(); ctx.ellipse(0, 0, 7, 11, 0, 0, Math.PI * 2); ctx.fill();
  const punch = player && p.punch > 0 ? 10 : 0;
  rect(ctx, 1, -13, 6 + punch, 5, player ? '#f5e7c8' : guard ? '#803d44' : p.shirt, 2);
  rect(ctx, 1, 8, 7 + punch, 5, player ? '#f5e7c8' : guard ? '#803d44' : p.shirt, 2);
  circle(ctx, 9 + punch, -10, 3, p.skin || '#d9a27a'); circle(ctx, 10 + punch, 10, 3, p.skin || '#d9a27a');
  circle(ctx, 1, 0, 6, p.skin || '#c88b65'); circle(ctx, -2, 0, 5, '#293e3a');
  if (player) { rect(ctx, -3, -6, 3, 12, '#e9946a', 1); line(ctx, -7, -5, -14, -10, '#e9946a', 3); }
  if (guard || player && p.weapon === 'pistol') rect(ctx, 10 + punch * 0.3, 7, 13, 4, '#263d40', 1);
  ctx.restore();
  if (guard) {
    rect(ctx, p.x - 16, p.y - 23, 32, 4, '#3b4a43', 1); rect(ctx, p.x - 16, p.y - 23, 32 * Math.max(0, p.health / 85), 4, '#eb9275', 1);
  }
  if (player) {
    ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, 19, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.shadowColor = '#123a33'; ctx.shadowBlur = 4;
    text(ctx, 'MARA', p.x, p.y + 34, 9, '#fff3d6', 'bold', 'center'); ctx.shadowBlur = 0;
  }
}
