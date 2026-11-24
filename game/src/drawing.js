import { FONT, COLORS } from './config.js';

export function rect(ctx, x, y, w, h, color, radius = 0) {
  ctx.fillStyle = color; ctx.beginPath();
  if (radius && ctx.roundRect) ctx.roundRect(x, y, w, h, radius);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}
export function line(ctx, x1, y1, x2, y2, color, width = 1) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
export function circle(ctx, x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
export function text(ctx, label, x, y, size = 14, color = COLORS.cream, weight = 'normal', align = 'left') {
  ctx.fillStyle = color; ctx.font = weight + ' ' + size + 'px ' + FONT; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(label, x, y);
}
export function wrap(ctx, label, x, y, width, size = 14, color = COLORS.cream, lineHeight = 21, weight = 'normal') {
  ctx.font = weight + ' ' + size + 'px ' + FONT; ctx.fillStyle = color; ctx.textAlign = 'left';
  let row = '', currentY = y;
  for (const word of label.split(' ')) {
    if (ctx.measureText(row + word).width > width && row) { ctx.fillText(row.trim(), x, currentY); currentY += lineHeight; row = ''; }
    row += word + ' ';
  }
  if (row) ctx.fillText(row.trim(), x, currentY);
  return currentY;
}
export function panel(ctx, x, y, w, h, alpha = 0.94) {
  rect(ctx, x, y, w, h, 'rgba(13,39,44,' + alpha + ')', 8);
  ctx.strokeStyle = '#b7d3c52b'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 8); ctx.stroke();
}
export function key(ctx, label, x, y, color = '#d8e2ce', width = 24) {
  rect(ctx, x, y - 17, width, 23, '#b8d3c01a', 4);
  text(ctx, label, x + width / 2, y - 1, 11, color, 'bold', 'center');
}
export function diamond(ctx, x, y, size, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y - size); ctx.lineTo(x + size, y); ctx.lineTo(x, y + size); ctx.lineTo(x - size, y); ctx.closePath(); ctx.fill();
}
export function star(ctx, x, y, radius, color) {
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? radius * 0.45 : radius;
    if (!i) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fill();
}
export function sun(ctx, x, y, radius, color) {
  circle(ctx, x, y, radius * 0.45, color);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    line(ctx, x + Math.cos(a) * radius * 0.7, y + Math.sin(a) * radius * 0.7, x + Math.cos(a) * radius, y + Math.sin(a) * radius, color, 1.5);
  }
}
export function button(ctx, label, x, y, w, primary = false, hint = '') {
  rect(ctx, x, y, w, 50, primary ? COLORS.gold : '#f5ebd50b', 5);
  if (!primary) { ctx.strokeStyle = '#b9cdbb55'; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 49); }
  text(ctx, label, x + 19, y + 31, 16, primary ? COLORS.ink : COLORS.cream, 'bold');
  text(ctx, hint, x + w - 18, y + 30, 11, primary ? '#304744' : '#aac4bd', 'bold', 'right');
}
