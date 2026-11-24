import { ROAD, WORLD, POI } from './config.js';
import { clamp, pick } from './random.js';

const ROOFS = ['#de9b7e', '#efc994', '#c1c9b1', '#b9d5cb', '#e5ae91', '#ead9ac', '#82b6b1'];
const SHOPS = ['LA PALOMA', 'MAR Y SOL', 'RECORDS', 'PANADERIA', 'BAHIA MARKET', 'CLUB BRISA', 'CASA LUZ', 'CAFE ORILLA', 'SOLMAR MOTEL', 'LAUNDRY', 'SURF SHOP', 'COSTA DINER'];

export function districtAt(x, y) {
  if (x > 4160) return 'Crescent Beach';
  if (x > 3500 && y > 3100) return 'Pelican Docks';
  if (x > 2900 && y < 1700) return 'Miramar Heights';
  if (x > 2900) return 'Costa del Sol';
  if (x < 1450 && y > 2400) return 'The Foundry';
  if (x < 1500) return 'Los Jardines';
  return y < 2000 ? 'Old Sol Quarter' : 'Mercado Centro';
}

export function createCity(random) {
  const xs = Array.from({ length: ROAD.count }, (_, i) => ROAD.firstX + i * ROAD.spacing);
  const ys = Array.from({ length: ROAD.count }, (_, i) => ROAD.firstY + i * ROAD.spacing);
  const buildings = [], blocks = [], trees = [], props = [], beachProps = [];
  const buckets = new Map();
  function addBuilding(x, y, w, h, label, color) {
    const building = { x, y, w, h, color: color || pick(random, ROOFS), label, roof: random(), detail: random(), awning: pick(random, ['#e9715b', '#368c85', '#e3b850']) };
    buildings.push(building);
    for (let bx = Math.floor(x / 270); bx <= Math.floor((x + w) / 270); bx++) {
      for (let by = Math.floor(y / 270); by <= Math.floor((y + h) / 270); by++) {
        const key = bx + ',' + by;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(building);
      }
    }
  }
  for (let ix = 0; ix < xs.length - 1; ix++) {
    for (let iy = 0; iy < ys.length - 1; iy++) {
      const x = xs[ix] + 80, y = ys[iy] + 80, w = 380, h = 380;
      const park = (ix === 1 && iy === 1) || (ix === 4 && iy === 2) || (ix === 2 && iy === 5);
      const parking = (ix === 6 && iy === 5) || (ix === 0 && iy === 5);
      blocks.push({ x, y, w, h, park, parking, ix, iy });
      if (park) {
        for (let i = 0; i < 16; i++) trees.push({ x: x + 30 + random() * 320, y: y + 30 + random() * 320, size: 17 + random() * 14, palm: i % 3 === 0, phase: random() * 6 });
      } else if (!parking) {
        const sizes = [150 + random() * 20, 148 + random() * 20];
        for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
          const specialGarage = ix === 6 && iy === 4 && a === 1 && b === 0;
          const specialRadio = ix === 4 && iy === 3 && a === 1 && b === 0;
          const label = specialGarage ? 'TIDEWAY GARAGE' : specialRadio ? 'RADIO SOL 98.6' : pick(random, SHOPS);
          addBuilding(x + a * 202 + 8, y + b * 202 + 8, sizes[a], 145 + random() * 22, label, specialGarage ? '#70aaa4' : null);
        }
      }
    }
  }
  // Street furniture is decorative, so no invisible palm-tree collision traps.
  for (const x of xs) for (let y = 90; y < 4220; y += 145) {
    if (ys.some(ry => Math.abs(y - ry) < 95)) continue;
    for (const side of [-1, 1]) {
      trees.push({ x: x + side * 73, y, size: 23 + random() * 6, palm: x > 2350 || random() > 0.45, phase: random() * 6 });
      props.push({ x: x + side * 66, y: y + 54, type: side > 0 ? 'lamp' : 'bench' });
    }
  }
  for (const y of ys) for (let x = 330; x < 4100; x += 180) {
    if (xs.some(rx => Math.abs(x - rx) < 95)) continue;
    trees.push({ x, y: y + 73, size: 24, palm: true, phase: random() * 6 });
    props.push({ x: x + 50, y: y - 68, type: 'bin' });
  }
  for (let i = 0; i < 70; i++) beachProps.push({ x: 4220 + random() * 115, y: 100 + random() * 4050, color: pick(random, ['#ed9071', '#fff2c8', '#7ac9bf', '#e9bc62']), angle: random() * 0.5 - 0.25 });

  function nearby(x, y, r = 30) {
    const found = new Set();
    for (let bx = Math.floor((x - r) / 270); bx <= Math.floor((x + r) / 270); bx++) for (let by = Math.floor((y - r) / 270); by <= Math.floor((y + r) / 270); by++) {
      for (const building of buckets.get(bx + ',' + by) || []) found.add(building);
    }
    return found;
  }
  function collides(x, y, r = 12) {
    if (x < 65 + r || y < 65 + r || x > WORLD.water - r - 8 || y > WORLD.height - 65 - r) return true;
    for (const b of nearby(x, y, r)) {
      const cx = clamp(x, b.x, b.x + b.w), cy = clamp(y, b.y, b.y + b.h);
      if ((cx - x) ** 2 + (cy - y) ** 2 < r * r) return true;
    }
    return false;
  }
  function move(body, dx, dy, radius) {
    let hit = false;
    const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 10));
    for (let i = 0; i < n; i++) {
      if (!collides(body.x + dx / n, body.y, radius)) body.x += dx / n; else hit = true;
      if (!collides(body.x, body.y + dy / n, radius)) body.y += dy / n; else hit = true;
    }
    return hit;
  }
  function lineClear(a, b) {
    const length = Math.hypot(a.x - b.x, a.y - b.y);
    for (let t = 0; t <= 1; t += 22 / Math.max(length, 22)) if (collides(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 2)) return false;
    return true;
  }
  function nearestNode(point) {
    const ix = clamp(Math.round((point.x - ROAD.firstX) / ROAD.spacing), 0, 7);
    const iy = clamp(Math.round((point.y - ROAD.firstY) / ROAD.spacing), 0, 7);
    return { x: xs[ix], y: ys[iy], ix, iy };
  }
  function neighbors(node) {
    return [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dy]) => ({ ix: node.ix + dx, iy: node.iy + dy })).filter(n => n.ix >= 0 && n.ix < 8 && n.iy >= 0 && n.iy < 8).map(n => ({ ...n, x: xs[n.ix], y: ys[n.iy] }));
  }
  function roadPoint(point) {
    const node = nearestNode(point);
    return Math.abs(point.x - node.x) < Math.abs(point.y - node.y) ? { x: node.x, y: clamp(point.y, ys[0], ys[7]) } : { x: clamp(point.x, xs[0], xs[7]), y: node.y };
  }
  return { xs, ys, buildings, blocks, trees, props, beachProps, collides, move, lineClear, nearestNode, neighbors, roadPoint, points: POI };
}
