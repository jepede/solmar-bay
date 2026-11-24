import { VIEW, COLORS, POI } from './config.js';
import { districtAt } from './city.js';
import { MISSIONS, currentStage, missionTarget } from './missions.js';
import { nearestCar } from './vehicles.js';
import { distance, clamp } from './random.js';
import { rect, line, circle, text, wrap, panel, key, diamond, star, sun, button } from './drawing.js';

export const UI = {
  start: { x: 64, y: 510, w: 382, h: 50 },
  continue: { x: 64, y: 572, w: 382, h: 50 },
  resume: { x: 438, y: 412, w: 404, h: 50 },
  save: { x: 438, y: 474, w: 404, h: 50 },
  title: { x: 438, y: 536, w: 404, h: 50 },
  recover: { x: 438, y: 482, w: 404, h: 50 }
};
export const inButton = (mouse, box) => mouse.x >= box.x && mouse.x <= box.x + box.w && mouse.y >= box.y && mouse.y <= box.y + box.h;
const money = value => '$' + Math.floor(value).toLocaleString('en-US');
const meters = d => d > 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m';

function header(ctx, world, muted) {
  rect(ctx, 0, 0, VIEW.width, 41, '#102e33f5'); line(ctx, 0, 40.5, 1280, 40.5, '#f4e4b22b');
  sun(ctx, 30, 20, 11, COLORS.gold);
  text(ctx, 'SOLMAR BAY', 51, 25, 13, COLORS.cream, 'bold');
  text(ctx, '/ HOT STREETS', 158, 25, 10, '#93b6ad', 'bold');
  text(ctx, districtAt(world.player.x, world.player.y).toUpperCase(), 640, 25, 11, COLORS.cream, 'bold', 'center');
  text(ctx, '17:42  /  27°C', 1040, 25, 11, '#c5d1b8', 'normal', 'right');
  text(ctx, 'M  AUDIO ' + (muted ? 'OFF' : 'ON') + '    ESC  PAUSE', 1252, 25, 10, '#abc5bb', 'normal', 'right');
}
function objective(ctx, world) {
  const m = world.mission, story = MISSIONS[m.index], stage = currentStage(world), target = missionTarget(world);
  panel(ctx, 24, 64, 338, 149);
  rect(ctx, 24, 77, 3, 32, COLORS.gold, 1);
  text(ctx, story ? 'STORY  ' + String(m.index + 1).padStart(2, '0') + ' / 06' : 'THE BAY IS YOURS', 43, 87, 10, COLORS.gold, 'bold');
  text(ctx, story ? story.title : 'Hot streets. Endless possibilities.', 43, 114, 21, COLORS.cream, 'bold');
  wrap(ctx, stage ? stage.objective : 'Explore Solmar Bay. Press J for courier, taxi and checkpoint jobs.', 43, 140, 296, 14, '#c8d7c9', 20);
  if (target) {
    diamond(ctx, 48, 193, 4, COLORS.gold);
    text(ctx, meters(distance(world.player, target)) + '  /  ' + target.name, 60, 197, 10, '#d8ceb0');
  } else if (stage?.type === 'escape') {
    text(ctx, world.wanted.visible ? '●  SEEN BY POLICE  ·  break line of sight' : '○  OUT OF SIGHT  ·  keep hidden', 43, 197, 10, world.wanted.visible ? COLORS.coral : COLORS.teal, 'bold');
  } else text(ctx, 'OPEN WORLD  /  J  DISPATCH JOBS', 43, 197, 10, '#9cbdb0');
  if (stage?.type === 'upload') {
    rect(ctx, 43, 178, 298, 4, '#ffffff20', 2);
    rect(ctx, 43, 178, 298 * clamp(m.progress / stage.duration, 0, 1), 4, COLORS.teal, 2);
  }
  const job = world.sideJob;
  if (job) {
    panel(ctx, 24, 224, 338, 82);
    diamond(ctx, 45, 244, 5, COLORS.teal);
    text(ctx, job.title.toUpperCase(), 59, 248, 11, COLORS.teal, 'bold');
    text(ctx, Math.ceil(job.remaining) + 's', 340, 249, 15, job.remaining < 20 ? COLORS.coral : COLORS.cream, 'bold', 'right');
    text(ctx, 'Stop ' + (job.stage + 1) + '/' + job.route.length + ' · ' + POI[job.route[job.stage]].name, 43, 273, 14);
    text(ctx, money(job.reward) + ' reward  /  J cancel', 43, 291, 10, '#9cbdb0');
  }
}
function stats(ctx, world) {
  const p = world.player;
  panel(ctx, 974, 64, 282, 144);
  text(ctx, 'MARA CRUZ', 994, 87, 10, '#a7c8b9', 'bold');
  text(ctx, money(p.cash), 1236, 94, 29, COLORS.gold, 'bold', 'right');
  text(ctx, '+', 995, 119, 18, COLORS.coral, 'bold');
  rect(ctx, 1016, 108, 181, 7, '#ffffff1d', 3);
  rect(ctx, 1016, 108, 181 * Math.max(0, p.health / 100), 7, p.health < 30 ? '#f38973' : '#80cfaa', 3);
  text(ctx, String(Math.ceil(p.health)), 1236, 116, 11, '#c6d8c8', 'bold', 'right');
  line(ctx, 994, 131, 1236, 131, '#b9d4bd2a');
  for (let i = 0; i < 5; i++) star(ctx, 1005 + i * 25, 151, 9, i < world.wanted.stars ? COLORS.gold : '#49615a');
  text(ctx, world.wanted.stars ? world.wanted.visible ? 'PURSUIT' : 'SEARCHING' : 'NO HEAT', 1236, 155, 10, world.wanted.stars ? COLORS.coral : '#9ab7a6', 'bold', 'right');
  text(ctx, p.weapon === 'pistol' ? 'PISTOL' : 'BARE HANDS', 994, 190, 11, COLORS.cream, 'bold');
  text(ctx, p.reload > 0 ? 'RELOADING…' : p.weapon === 'pistol' ? String(p.ammo).padStart(2, '0') + ' / ' + p.reserve + '   [R]' : '1 / 2  SWITCH', 1236, 190, 11, '#b7cbbc', 'normal', 'right');
}
export function drawMinimap(ctx, world, full = false) {
  const box = full ? { x: 250, y: 100, w: 780, h: 622 } : { x: 24, y: 547, w: 234, h: 229 };
  const { x, y, w, h } = box;
  panel(ctx, x, y, w, h);
  text(ctx, full ? 'SOLMAR BAY / CITY MAP' : 'LOCAL STREETS', x + 14, y + 23, full ? 16 : 10, COLORS.cream, 'bold');
  text(ctx, 'N ↑', x + w - 15, y + 23, 11, COLORS.gold, 'bold', 'right');
  const mapX = x + 9, mapY = y + 34, mapW = w - 18, mapH = h - (full ? 85 : 69);
  const scale = full ? Math.min(mapW / 4800, mapH / 4400) : 0.145;
  const center = full ? { x: 2350, y: 2160 } : world.player;
  const tx = point => mapX + mapW / 2 + (point.x - center.x) * scale;
  const ty = point => mapY + mapH / 2 + (point.y - center.y) * scale;
  ctx.save(); ctx.beginPath(); ctx.rect(mapX, mapY, mapW, mapH); ctx.clip();
  rect(ctx, mapX, mapY, mapW, mapH, '#446758');
  const wx = value => tx({ x: value }), wy = value => ty({ y: value });
  rect(ctx, wx(4180), mapY, mapW, mapH, '#b4ac79');
  rect(ctx, wx(4390), mapY, mapW, mapH, '#427f79');
  for (const b of world.city.blocks) rect(ctx, wx(b.x), wy(b.y), b.w * scale, b.h * scale, b.park ? '#6e9270' : '#768573', 1);
  for (const b of world.city.buildings) rect(ctx, wx(b.x), wy(b.y), b.w * scale, b.h * scale, '#89957b', 1);
  for (const roadX of world.city.xs) rect(ctx, wx(roadX - 54), wy(70), 108 * scale, 4130 * scale, '#c9c6a5');
  for (const roadY of world.city.ys) rect(ctx, wx(70), wy(roadY - 54), 4030 * scale, 108 * scale, '#c9c6a5');
  const target = missionTarget(world);
  if (target) {
    const node = world.city.nearestNode(world.player), end = world.city.nearestNode(target);
    ctx.strokeStyle = '#ffd16dbb'; ctx.lineWidth = full ? 2.5 : 2; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(tx(world.player), ty(world.player)); ctx.lineTo(tx(node), ty(world.player));
    ctx.lineTo(tx(node), ty(end)); ctx.lineTo(tx(end), ty(end)); ctx.lineTo(tx(target), ty(target)); ctx.stroke(); ctx.setLineDash([]);
    diamond(ctx, tx(target), ty(target), full ? 7 : 5, COLORS.gold);
  }
  for (const point of [POI.garage, POI.hospital, POI.supply]) {
    rect(ctx, tx(point) - 3, ty(point) - 3, 6, 6, '#72d6bf', 1);
    if (full) text(ctx, point.name, tx(point) + 10, ty(point) + 3, 10, COLORS.cream, 'bold');
  }
  if (world.sideJob) { const t = POI[world.sideJob.route[world.sideJob.stage]]; diamond(ctx, tx(t), ty(t), full ? 7 : 5, COLORS.teal); }
  for (const car of world.police) if (car.health > 0 && car.driver === 'police') circle(ctx, tx(car), ty(car), full ? 4 : 3, '#f88f7d');
  if (full) {
    for (const [name, px, py] of [['LOS JARDINES', 830, 1550], ['OLD SOL', 2010, 1050], ['THE FOUNDRY', 900, 3160], ['MERCADO CENTRO', 2290, 2800], ['COSTA DEL SOL', 3560, 2400], ['MIRAMAR', 3500, 800]]) text(ctx, name, wx(px), wy(py), 10, '#f7e3af', 'bold', 'center');
  }
  ctx.save(); ctx.translate(tx(world.player), ty(world.player)); ctx.rotate(world.player.angle);
  circle(ctx, 0, 0, 8, '#143c38'); ctx.fillStyle = '#fff0cd'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -5); ctx.lineTo(-3, 0); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.restore();
  if (full) {
    text(ctx, '◆ STORY    ◆ DISPATCH    ■ SERVICES    ● POLICE', x + 24, y + h - 28, 12, '#b6cfbe');
    text(ctx, 'TAB / ESC CLOSE', x + w - 20, y + h - 28, 11, COLORS.gold, 'bold', 'right');
  } else {
    text(ctx, districtAt(world.player.x, world.player.y).toUpperCase(), x + 13, y + h - 21, 11, '#f1e8ca', 'bold');
    text(ctx, 'TAB  MAP', x + w - 13, y + h - 21, 9, '#a7c5b3', 'bold', 'right');
  }
}
function vehicleStats(ctx, world) {
  const car = world.player.car;
  if (!car) {
    text(ctx, 'GOLDEN HOUR', 1253, 730, 10, '#fff0cf', 'bold', 'right');
    text(ctx, 'COSTA COUNTY, SOLMAR BAY', 1253, 750, 9, '#fff0cfa6', 'normal', 'right');
    return;
  }
  panel(ctx, 1075, 580, 181, 196);
  text(ctx, car.type === 'police' ? 'PATROL INTERCEPTOR' : car.type === 'sport' ? 'COSTA GT' : car.type === 'van' ? 'CARGO VAN' : 'SOLMAR COUPE', 1091, 606, 10, '#9dbeb1', 'bold');
  text(ctx, String(Math.round(Math.abs(car.speed) * 0.24)).padStart(3, '0'), 1090, 669, 56, COLORS.cream, 'bold');
  text(ctx, 'KM/H', 1239, 669, 10, COLORS.gold, 'bold', 'right');
  line(ctx, 1091, 688, 1239, 688, '#b9d4bd2a');
  text(ctx, car.speed < -5 ? 'R' : car.speed > 5 ? 'D' : 'N', 1091, 712, 19, COLORS.gold, 'bold');
  text(ctx, 'ENGINE', 1125, 710, 9, '#aac5b5');
  rect(ctx, 1091, 727, 148, 5, '#ffffff20', 2);
  rect(ctx, 1091, 727, 148 * Math.max(0, car.health) / 100, 5, car.health < 30 ? COLORS.coral : COLORS.teal, 2);
  text(ctx, 'SPACE  HANDBRAKE', 1091, 756, 10, '#bfd1bf');
}
function notices(ctx, world) {
  let y = world.sideJob ? 334 : 241;
  for (const notice of world.notices.slice(0, 3)) {
    ctx.globalAlpha = Math.min(1, notice.life * 2);
    panel(ctx, 24, y - 16, 338, 36, 0.9);
    text(ctx, notice.text.length > 57 ? notice.text.slice(0, 54) + '…' : notice.text, 38, y + 6, 10, notice.color, 'bold');
    ctx.globalAlpha = 1; y += 43;
  }
  const w = world.wanted;
  if (w.stars) {
    panel(ctx, 479, 63, 322, 48, 0.93);
    circle(ctx, 497, 86, 4, w.visible ? COLORS.coral : COLORS.gold);
    text(ctx, w.visible ? 'POLICE PURSUIT' : 'BREAK SIGHT · STAY HIDDEN', 514, 90, 12, w.visible ? COLORS.coral : COLORS.gold, 'bold');
    if (!w.visible) { rect(ctx, 496, 102, 288, 2, '#fff2cd22'); rect(ctx, 496, 102, 288 * clamp(w.unseen / 6, 0, 1), 2, COLORS.teal); }
  }
  if (w.bust > 0.03) {
    panel(ctx, 479, 123, 322, 50); text(ctx, 'BUSTING  ·  KEEP MOVING', 640, 143, 11, COLORS.coral, 'bold', 'center');
    rect(ctx, 496, 154, 288, 6, '#ffffff20', 3); rect(ctx, 496, 154, 288 * w.bust, 6, COLORS.coral, 3);
  }
}
export function drawHud(ctx, world, options) {
  header(ctx, world, options.muted); objective(ctx, world); stats(ctx, world);
  drawMinimap(ctx, world); vehicleStats(ctx, world); notices(ctx, world);
  if (world.dialogue) {
    panel(ctx, 284, 629, 760, 105);
    rect(ctx, 284, 644, 3, 29, COLORS.teal, 1);
    text(ctx, world.dialogue.speaker + '  /  RADIO', 303, 652, 10, COLORS.teal, 'bold');
    wrap(ctx, world.dialogue.text, 303, 677, 714, 15, COLORS.cream, 23);
  } else if (world.interaction) {
    panel(ctx, 402, 686, 554, 43);
    text(ctx, world.interaction, 679, 713, 13, COLORS.gold, 'bold', 'center');
  } else if (!world.player.car) {
    const car = nearestCar(world);
    if (car) { panel(ctx, 502, 686, 320, 43); text(ctx, 'E  ·  ' + (car.stolen ? 'Enter car' : 'Take this ride'), 662, 713, 13, COLORS.gold, 'bold', 'center'); }
  }
  panel(ctx, 284, 749, 760, 27, 0.88);
  text(ctx, world.player.car ? 'W / S  THROTTLE     A / D  STEER     E  EXIT     H  HORN     J  DISPATCH' : 'WASD  MOVE     SHIFT  SPRINT     E  CAR     F  INTERACT     CLICK  ATTACK     1 / 2  WEAPON', 664, 767, 10, '#c7d5bd', 'normal', 'center');
  if (world.completion) {
    ctx.globalAlpha = Math.min(1, world.completion.life);
    panel(ctx, 433, 237, 414, 91);
    text(ctx, 'JOB COMPLETE', 640, 261, 11, COLORS.teal, 'bold', 'center');
    text(ctx, world.completion.title, 640, 288, 23, COLORS.cream, 'bold', 'center');
    text(ctx, '+' + money(world.completion.reward), 640, 310, 16, COLORS.gold, 'bold', 'center'); ctx.globalAlpha = 1;
  }
  if (world.finale > 0) {
    panel(ctx, 389, 348, 502, 144);
    text(ctx, 'THE COAST STAYS OURS', 640, 388, 27, COLORS.gold, 'bold', 'center');
    wrap(ctx, 'Venn is exposed. Tideway is saved. Your story is complete, but Solmar Bay is still wide open.', 420, 422, 440, 15, COLORS.cream, 23);
    text(ctx, 'FREE ROAM UNLOCKED  ·  J FOR DISPATCH JOBS', 640, 472, 10, COLORS.teal, 'bold', 'center');
  }
}
export function drawTitle(ctx, world, hasSave) {
  const gradient = ctx.createLinearGradient(0, 0, 1050, 0);
  gradient.addColorStop(0, '#0e3034ff'); gradient.addColorStop(0.42, '#0e3034f7'); gradient.addColorStop(0.71, '#0e303477'); gradient.addColorStop(1, '#0e303400');
  rect(ctx, 0, 0, 1280, 800, gradient);
  sun(ctx, 81, 72, 17, COLORS.gold);
  text(ctx, 'A CITY TO GET LOST IN.', 111, 77, 12, '#d4d8b8', 'bold');
  text(ctx, 'SOLMAR', 59, 220, 91, COLORS.cream, '900');
  text(ctx, 'BAY', 57, 333, 132, COLORS.cream, '900');
  ctx.save(); ctx.translate(65, 355); ctx.rotate(-0.045);
  rect(ctx, -4, -7, 320, 52, COLORS.coral, 2);
  text(ctx, 'HOT STREETS', 12, 31, 37, '#173b3c', 'bold'); ctx.restore();
  wrap(ctx, 'Sun on your face. Trouble on your tail.', 64, 447, 430, 18, '#fff1d5', 25, 'bold');
  wrap(ctx, 'You’re Mara Cruz, a courier with a debt to settle. Keep your people close. Take back your corner of the coast.', 64, 475, 440, 14, '#b9d1bf', 21);
  button(ctx, 'HIT THE STREETS', UI.start.x, UI.start.y, UI.start.w, true, 'ENTER  →');
  button(ctx, hasSave ? 'CONTINUE YOUR STORY' : 'YOUR STORY STARTS HERE', UI.continue.x, UI.continue.y, UI.continue.w, false, hasSave ? 'C  →' : '06 MISSIONS');
  text(ctx, 'LEARN THE STREETS', 64, 662, 10, COLORS.gold, 'bold');
  key(ctx, 'WASD', 64, 693, COLORS.cream, 48); text(ctx, 'Move / drive', 124, 692, 12, '#bdcebc');
  key(ctx, 'E', 285, 693); text(ctx, 'Enter / exit car', 321, 692, 12, '#bdcebc');
  key(ctx, 'F', 64, 726); text(ctx, 'Talk / interact', 100, 725, 12, '#bdcebc');
  key(ctx, '1 / 2', 285, 726, COLORS.cream, 36); text(ctx, 'Fists / pistol', 333, 725, 12, '#bdcebc');
  text(ctx, 'MOUSE AIM + CLICK ATTACK   /   ESC PAUSE   /   TAB MAP', 64, 771, 9, '#84aaa0');
  panel(ctx, 971, 40, 270, 40, 0.85);
  sun(ctx, 991, 60, 9, COLORS.gold);
  text(ctx, 'AN ORIGINAL OPEN-WORLD STORY', 1010, 64, 9, COLORS.cream, 'bold');
  panel(ctx, 935, 652, 305, 110, 0.92);
  text(ctx, 'WELCOME TO', 956, 678, 10, COLORS.gold, 'bold');
  text(ctx, 'Costa del Sol', 956, 710, 27, COLORS.cream, 'bold');
  text(ctx, 'THE COAST IS CLEAR. FOR NOW.', 956, 737, 10, '#b4c9b7');
  text(ctx, '27°N  /  82°W', 1241, 790, 9, '#ffefca', 'normal', 'right');
}
export function drawOverlay(ctx, world, screen, saveText) {
  rect(ctx, 0, 41, 1280, 759, '#0b282ce0');
  if (screen === 'pause') {
    panel(ctx, 402, 185, 476, 457);
    text(ctx, 'TAKE A BREATHER', 640, 232, 11, COLORS.gold, 'bold', 'center');
    text(ctx, 'City on hold.', 640, 285, 43, COLORS.cream, 'bold', 'center');
    wrap(ctx, 'Your next move can wait. Save your story here; completed objectives also save automatically.', 438, 326, 401, 14, '#b7cdbd', 22);
    button(ctx, 'BACK TO THE BAY', UI.resume.x, UI.resume.y, UI.resume.w, true, 'ESC / ENTER');
    button(ctx, 'SAVE PROGRESS', UI.save.x, UI.save.y, UI.save.w, false, 'S');
    button(ctx, 'TITLE SCREEN', UI.title.x, UI.title.y, UI.title.w, false, 'T');
    text(ctx, saveText || 'LOCAL SAVE  /  THIS BROWSER', 640, 617, 10, '#9fc3af', 'bold', 'center');
  } else {
    const busted = screen === 'busted';
    text(ctx, busted ? 'BUSTED' : 'WASTED', 640, 322, 98, busted ? COLORS.gold : COLORS.coral, 'bold', 'center');
    text(ctx, busted ? 'The streets caught up with you.' : 'Even the hot streets have a cold side.', 640, 368, 19, COLORS.cream, 'normal', 'center');
    text(ctx, busted ? 'Impound & fine: $250 · Active story job restarts.' : 'Clinic bill: $150 · Active story job restarts.', 640, 408, 13, '#b5c9b5', 'normal', 'center');
    button(ctx, 'BACK ON THE STREETS', UI.recover.x, UI.recover.y, UI.recover.w, true, 'ENTER  →');
  }
}
