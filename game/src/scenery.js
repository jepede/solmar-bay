// All environmental art is drawn in world coordinates. Buildings also define physical collision.
import { WORLD, ROAD, COLORS } from './config.js';
import { rect, circle, line, text } from './drawing.js';

export function drawGround(ctx, world, bounds) {
  const city = world.city;
  rect(ctx, bounds.left - 100, bounds.top - 100, bounds.right - bounds.left + 200, bounds.bottom - bounds.top + 200, '#bec39a');
  // The coast uses overlapping bands and moving foam rather than image textures.
  rect(ctx, 4135, -2000, 55, WORLD.height + 4000, '#dfceaa');
  rect(ctx, WORLD.coast, -2000, WORLD.width + 3000 - WORLD.coast, WORLD.height + 4000, '#efd39a');
  rect(ctx, 4350, -2000, WORLD.width + 3000 - 4350, WORLD.height + 4000, '#89d4bd');
  rect(ctx, 4400, -2000, WORLD.width + 3000 - 4400, WORLD.height + 4000, '#51bcae');
  rect(ctx, 4490, -2000, WORLD.width + 3000 - 4490, WORLD.height + 4000, '#369d9b');
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = i === 0 ? '#fff2ccbb' : '#d6efcf55'; ctx.lineWidth = i === 0 ? 4 : 2;
    ctx.beginPath();
    for (let y = Math.floor(bounds.top / 20) * 20 - 20; y < bounds.bottom + 20; y += 20) {
      const x = 4360 + i * 43 + Math.sin(y * 0.015 + world.time * 0.65 + i) * (8 + i * 2);
      if (y < bounds.top - 10) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  for (const b of city.blocks) {
    if (b.x > bounds.right || b.x + b.w < bounds.left || b.y > bounds.bottom || b.y + b.h < bounds.top) continue;
    rect(ctx, b.x, b.y, b.w, b.h, b.park ? '#99b484' : b.parking ? '#8d9584' : '#c9bd96', 5);
    if (b.park) {
      rect(ctx, b.x + 165, b.y, 48, b.h, '#dbcea6'); rect(ctx, b.x, b.y + 165, b.w, 48, '#dbcea6');
      circle(ctx, b.x + 190, b.y + 190, 49, '#e7d7ae'); circle(ctx, b.x + 190, b.y + 190, 33, '#7eb8ae');
      circle(ctx, b.x + 186, b.y + 186, 23, '#9ccec0'); circle(ctx, b.x + 190, b.y + 190, 8, '#f6e5bc');
    } else if (b.parking) {
      for (let x = b.x + 14; x < b.x + 360; x += 56) {
        line(ctx, x, b.y + 20, x, b.y + 105, '#e5d9b5', 2);
        line(ctx, x, b.y + 265, x, b.y + 350, '#e5d9b5', 2);
      }
      text(ctx, 'PELICAN FREIGHT', b.x + 190, b.y + 210, 20, '#d4d5b6', 'bold', 'center');
    } else {
      line(ctx, b.x + 188, b.y + 8, b.x + 188, b.y + 365, '#d6c9a4', 13);
      line(ctx, b.x + 8, b.y + 187, b.x + 365, b.y + 187, '#d6c9a4', 13);
      for (let i = 0; i < 3; i++) rect(ctx, b.x + 175, b.y + 232 + i * 30, 7, 16, '#6f9975', 2);
    }
  }
  // Lay all the sidewalks first, then all roads to keep intersections open.
  for (const x of city.xs) rect(ctx, x - 80, 80, 160, 4100, '#e1d2af');
  for (const y of city.ys) rect(ctx, 80, y - 80, 4020, 160, '#e1d2af');
  for (const x of city.xs) { rect(ctx, x - 57, 80, 114, 4100, '#adad91'); rect(ctx, x - 54, 80, 108, 4100, '#6d7d76'); }
  for (const y of city.ys) { rect(ctx, 80, y - 57, 4020, 114, '#adad91'); rect(ctx, 80, y - 54, 4020, 108, '#6d7d76'); }
  ctx.setLineDash([17, 19]);
  for (const x of city.xs) for (let i = 0; i < 7; i++) {
    line(ctx, x - 2, city.ys[i] + 82, x - 2, city.ys[i + 1] - 82, '#d9c58c', 1.5);
    line(ctx, x + 2, city.ys[i] + 82, x + 2, city.ys[i + 1] - 82, '#d9c58c', 1.5);
  }
  for (const y of city.ys) for (let i = 0; i < 7; i++) {
    line(ctx, city.xs[i] + 82, y - 2, city.xs[i + 1] - 82, y - 2, '#d9c58c', 1.5);
    line(ctx, city.xs[i] + 82, y + 2, city.xs[i + 1] - 82, y + 2, '#d9c58c', 1.5);
  }
  ctx.setLineDash([]);
  for (const x of city.xs) for (const y of city.ys) {
    if (x < bounds.left - 110 || x > bounds.right + 110 || y < bounds.top - 110 || y > bounds.bottom + 110) continue;
    for (let i = -43; i < 45; i += 12) {
      rect(ctx, x + i, y - 73, 7, 16, '#e4dfbc'); rect(ctx, x + i, y + 57, 7, 16, '#e4dfbc');
      rect(ctx, x - 73, y + i, 16, 7, '#e4dfbc'); rect(ctx, x + 57, y + i, 16, 7, '#e4dfbc');
    }
    const green = Math.sin(world.time * 0.18 + x + y) > 0;
    rect(ctx, x - 65, y - 87, 5, 19, '#52685e', 2); circle(ctx, x - 62.5, y - 83, 2, green ? '#e9a474' : '#8bd8aa');
    rect(ctx, x + 61, y + 72, 5, 19, '#52685e', 2); circle(ctx, x + 63.5, y + 76, 2, green ? '#8bd8aa' : '#e9a474');
  }
  for (const prop of city.props) {
    if (prop.x < bounds.left || prop.x > bounds.right || prop.y < bounds.top || prop.y > bounds.bottom) continue;
    if (prop.type === 'bench') {
      rect(ctx, prop.x - 4, prop.y - 11, 10, 28, '#476b61', 2);
      line(ctx, prop.x - 2, prop.y - 8, prop.x - 2, prop.y + 13, '#acb6a0', 2);
    } else if (prop.type === 'bin') { rect(ctx, prop.x - 5, prop.y - 6, 10, 12, '#527c67', 2); rect(ctx, prop.x - 6, prop.y - 7, 12, 3, '#385c50'); }
    else { line(ctx, prop.x, prop.y, prop.x + 12, prop.y + 13, '#667b6955', 4); circle(ctx, prop.x, prop.y, 4, '#657c70'); circle(ctx, prop.x - 4, prop.y - 7, 5, '#f2e0b2'); }
  }
  for (const p of city.beachProps) {
    if (p.y < bounds.top - 30 || p.y > bounds.bottom + 30 || bounds.right < 4200) continue;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
    rect(ctx, 8, -6, 12, 32, p.color, 2); rect(ctx, 10, -4, 8, 5, '#f8e9c4');
    circle(ctx, 7, 7, 18, '#8b927b44'); circle(ctx, 0, 0, 18, p.color);
    ctx.strokeStyle = '#fff2d585'; ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; line(ctx, 0, 0, Math.cos(a) * 18, Math.sin(a) * 18, '#fff2d585'); }
    circle(ctx, 0, 0, 3, '#fff1d5'); ctx.restore();
  }
  // Small pavement lettering reinforces the sense of place.
  ctx.save(); ctx.translate(4070, 2225); ctx.rotate(-Math.PI / 2);
  text(ctx, 'PASEO DEL MAR', 0, 0, 11, '#b7b996', 'bold', 'center'); ctx.restore();
}

export function drawBuilding(ctx, b) {
  rect(ctx, b.x + 9, b.y + 12, b.w + 5, b.h + 5, '#3b59423a', 3);
  rect(ctx, b.x, b.y + 5, b.w, b.h + 7, '#8c8d73', 2);
  // Shop windows and sidewalk awnings are visible below the roof edge.
  for (let x = b.x + 11; x < b.x + b.w - 10; x += 26) {
    rect(ctx, x, b.y + b.h + 5, 17, 7, '#4d7370');
    rect(ctx, x, b.y + b.h - 5, 20, 10, b.awning);
    line(ctx, x + 5, b.y + b.h - 5, x + 5, b.y + b.h + 5, '#f5dfb666', 3);
  }
  rect(ctx, b.x, b.y, b.w, b.h, b.color, 3);
  ctx.strokeStyle = '#f5e6c494'; ctx.lineWidth = 4; ctx.strokeRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
  ctx.strokeStyle = '#7d8b783b'; ctx.lineWidth = 1; ctx.strokeRect(b.x + 11, b.y + 11, b.w - 22, b.h - 22);
  rect(ctx, b.x + 17, b.y + 20, 43, 30, '#7b8e8277', 2);
  rect(ctx, b.x + 14, b.y + 16, 42, 29, '#d2d4b8', 2);
  for (let i = 0; i < 5; i++) line(ctx, b.x + 20, b.y + 20 + i * 4, b.x + 49, b.y + 20 + i * 4, '#7b8e82', 1.4);
  if (b.roof > 0.45) {
    rect(ctx, b.x + b.w - 49, b.y + 25, 27, 30, '#8da79a', 2);
    circle(ctx, b.x + b.w - 36, b.y + 39, 9, '#c9d5ba');
    line(ctx, b.x + b.w - 43, b.y + 39, b.x + b.w - 29, b.y + 39, '#748c80', 2);
    line(ctx, b.x + b.w - 36, b.y + 32, b.x + b.w - 36, b.y + 46, '#748c80', 2);
  } else {
    rect(ctx, b.x + b.w - 61, b.y + 22, 39, 43, '#517b7a', 2);
    for (let i = 1; i < 4; i++) line(ctx, b.x + b.w - 61, b.y + 22 + i * 10, b.x + b.w - 22, b.y + 22 + i * 10, '#97b7a8');
    line(ctx, b.x + b.w - 42, b.y + 22, b.x + b.w - 42, b.y + 65, '#97b7a8');
  }
  if (b.detail > 0.5) {
    rect(ctx, b.x + 22, b.y + 66, b.w - 44, 17, '#fff4d44a', 2);
    for (let i = 0; i < 3; i++) { circle(ctx, b.x + 30 + i * 21, b.y + 75, 7, '#608a6d'); circle(ctx, b.x + 28 + i * 21, b.y + 73, 4, '#95ac79'); }
  }
  const labelSize = b.label.length > 13 ? 8 : 10;
  rect(ctx, b.x + 8, b.y + b.h - 36, b.w - 16, 24, '#315c5999', 2);
  text(ctx, b.label, b.x + b.w / 2, b.y + b.h - 20, labelSize, '#f8e8bd', 'bold', 'center');
}

export function drawTree(ctx, t, time, shadow = false) {
  ctx.save(); ctx.translate(t.x + (shadow ? 10 : 0), t.y + (shadow ? 13 : 0));
  const size = t.size;
  if (shadow) { circle(ctx, 0, 0, size, '#355a4430'); ctx.restore(); return; }
  if (t.palm) {
    line(ctx, 3, 6, 0, 0, '#967d4f', 6);
    const sway = Math.sin(time * 0.6 + t.phase) * 0.04;
    for (let i = 0; i < 8; i++) {
      ctx.save(); ctx.rotate(i * Math.PI / 4 + t.phase + sway);
      ctx.fillStyle = i % 2 ? '#44876c' : '#33765e';
      ctx.beginPath(); ctx.moveTo(-2, 2);
      ctx.bezierCurveTo(-13, -size * 0.45, -7, -size, 0, -size * 1.22);
      ctx.bezierCurveTo(5, -size * 0.63, 12, -size * 0.36, 2, 3); ctx.fill();
      line(ctx, 0, 0, 0, -size * 0.94, '#81a473', 1); ctx.restore();
    }
    circle(ctx, 0, 0, 4, '#b8b17b');
  } else {
    circle(ctx, 0, 0, size, '#5b936c');
    circle(ctx, -size * 0.35, -size * 0.25, size * 0.7, '#7aa576');
    circle(ctx, size * 0.35, size * 0.2, size * 0.65, '#54875f');
    circle(ctx, 0, -size * 0.4, size * 0.5, '#8db37e');
  }
  ctx.restore();
}
